/**
 * KTX & SRT High-Speed Rail Schedule & Fare Discovery Service
 *
 * Official Provider: Korea Ministry of Land, Infrastructure and Transport (MOLIT)
 * TAGO TrainInfoService (`https://apis.data.go.kr/1613000/TrainInfoService`)
 *
 * STRICT INTEGRITY RULES:
 * - Zero fabricated train schedules, fares, durations, or seat availability.
 * - Any unavailable field (such as First Class fare or real-time seat inventory,
 *   which TAGO public timetable endpoints do not expose) is explicitly returned as null
 *   so the UI labels it "Information unavailable".
 * - All booking links redirect to official Korail (letskorail.com), KorailTalk, or SRT (etk.srail.kr).
 */

import {
  getKstNowParts,
  isValidIsoDateString,
  isValidTimeHHmm,
  KtxStationRecord,
  parseTagoTimestampKst,
  timeHHmmToMinutes,
} from './transportCatalog';
import {
  callTagoOpenApi,
  getAllKtxStations,
  getCachedTransportValue,
  getTransportHubConfig,
  recordTransportSearchEvent,
  resolveTagoServiceKey,
  setCachedTransportValue,
} from './transportProviderService';
import {
  callCustomRestProvider,
  getActiveProvidersForType,
  recordProviderLiveCallMetric,
  resolveProviderCredentialsServerOnly,
  sanitizeEndpointPath,
  TransportApiProviderRecord,
} from './transportApiRegistry';

export interface KtxSearchInput {
  originId: string;
  destinationId: string;
  travelDate: string; // YYYY-MM-DD (Asia/Seoul KST)
  preferredDepartureTime: string; // HH:mm or '00:00'
  passengers: number;
  trainClassFilter?: 'all' | 'ktx' | 'srt' | 'conventional';
  showAllDepartures?: boolean;
}

export interface KtxScheduleItem {
  id: string;
  operator: 'Korail' | 'SRT';
  trainName: string;
  trainNumber: string;
  isHighSpeed: boolean;
  departureStationId: string;
  departureStationNameEn: string;
  departureStationNameKo: string;
  arrivalStationId: string;
  arrivalStationNameEn: string;
  arrivalStationNameKo: string;
  departureTimeKst: string; // HH:mm
  arrivalTimeKst: string | null; // HH:mm or null -> Information unavailable
  departureIsoKst: string;
  arrivalIsoKst: string | null;
  durationMinutes: number | null; // Strictly derived from real timestamps
  standardFareKrw: number | null; // Adult standard fare from TAGO adultcharge
  firstClassFareKrw: null; // TAGO public API does not supply First Class fares
  seatAvailability: null; // TAGO public API does not supply live seat counts
  passengersRequested: number;
  estimatedTotalStandardKrw: number | null; // standardFareKrw * passengersRequested (when official fare exists)
  bookingLinks: {
    primaryLabel: string;
    primaryUrl: string;
    secondaryLabel?: string;
    secondaryUrl?: string;
    appLinks?: { label: string; url: string }[];
  };
}

export interface KtxSearchResponse {
  ok: boolean;
  status: 'live_results' | 'no_schedules' | 'external_access_required' | 'provider_error' | 'service_disabled';
  message: string;
  dataSource: string;
  providerConfigured: boolean;
  lastUpdatedAt: string;
  timezone: 'Asia/Seoul';
  query: {
    origin: KtxStationRecord;
    destination: KtxStationRecord;
    travelDate: string;
    preferredDepartureTime: string;
    passengers: number;
    showAllDepartures: boolean;
  };
  totalSchedulesForDate: number;
  filteredCount: number;
  schedules: KtxScheduleItem[];
  officialBookingLinks: {
    korailWebUrl: string;
    korailTalkAndroidUrl: string;
    korailTalkIosUrl: string;
    srtWebUrl: string;
    supportsSrtOnRoute: boolean;
    supportsKorailOnRoute: boolean;
  };
  notice: string;
}

const TAGO_TRAIN_BASE = 'https://apis.data.go.kr/1613000/TrainInfoService';

export function validateKtxSearchInput(raw: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  sanitized?: KtxSearchInput;
  origin?: KtxStationRecord;
  destination?: KtxStationRecord;
} {
  const stations = getAllKtxStations();
  const originKey = String(raw.originId || raw.origin || '').trim().toLowerCase();
  const destKey = String(raw.destinationId || raw.destination || '').trim().toLowerCase();

  const findStation = (key: string) =>
    stations.find(
      (s) =>
        s.id.toLowerCase() === key ||
        s.code.toLowerCase() === key ||
        s.nameEn.toLowerCase() === key ||
        s.nameKo === key
    );

  const origin = findStation(originKey);
  const destination = findStation(destKey);

  if (!origin) {
    return { valid: false, error: 'Please select a valid departure KTX/SRT station.' };
  }
  if (!destination) {
    return { valid: false, error: 'Please select a valid destination KTX/SRT station.' };
  }
  if (origin.id === destination.id) {
    return { valid: false, error: 'Departure and destination stations must be different.' };
  }

  const kstNow = getKstNowParts();
  const travelDate = String(raw.travelDate || kstNow.dateStr).trim();
  if (!isValidIsoDateString(travelDate)) {
    return { valid: false, error: 'Please provide a valid travel date (YYYY-MM-DD).' };
  }
  if (travelDate < kstNow.dateStr) {
    return {
      valid: false,
      error: `Past dates cannot be searched. Today in Korea (KST) is ${kstNow.dateStr}.`,
    };
  }

  const rawTime = String(raw.preferredDepartureTime || '00:00').trim();
  const preferredDepartureTime = rawTime === '' || rawTime === 'any' ? '00:00' : rawTime;
  if (!isValidTimeHHmm(preferredDepartureTime)) {
    return { valid: false, error: 'Preferred departure time must use HH:mm format (e.g., 09:00).' };
  }

  const passengers = Math.max(1, Math.min(9, parseInt(String(raw.passengers || '1'), 10) || 1));
  const rawFilter = String(raw.trainClassFilter || 'all').toLowerCase();
  const trainClassFilter =
    rawFilter === 'ktx' || rawFilter === 'srt' || rawFilter === 'conventional' ? rawFilter : 'all';
  const showAllDepartures =
    raw.showAllDepartures === true || String(raw.showAllDepartures).toLowerCase() === 'true';

  return {
    valid: true,
    origin,
    destination,
    sanitized: {
      originId: origin.id,
      destinationId: destination.id,
      travelDate,
      preferredDepartureTime,
      passengers,
      trainClassFilter,
      showAllDepartures,
    },
  };
}

/**
 * Dynamically resolves official TAGO station nodeId using getCtyAcctoTrainSttnList
 * when not hardcoded, caching for 24 hours.
 */
async function resolveTagoStationNodeId(
  station: KtxStationRecord,
  serviceKey?: string | null,
  baseUrl?: string,
  timeoutMs?: number
): Promise<string | null> {
  if (station.tagoNodeId) return station.tagoNodeId;

  const cacheKey = `tago_train_sttn_city_${station.tagoCityCode}`;
  let cityStations = getCachedTransportValue<{ nodeid: string; nodename: string }[]>(cacheKey);

  if (!cityStations) {
    const trainRoot = baseUrl ? `${baseUrl.replace(/\/$/, '')}/1613000/TrainInfoService` : TAGO_TRAIN_BASE;
    const res = await callTagoOpenApi(
      `${trainRoot}/getCtyAcctoTrainSttnList`,
      {
        cityCode: station.tagoCityCode,
        numOfRows: 200,
        pageNo: 1,
      },
      timeoutMs || 10_000,
      serviceKey
    );
    if (!res.ok) return null;
    cityStations = res.items
      .map((item) => ({
        nodeid: String(item.nodeid || '').trim(),
        nodename: String(item.nodename || '').trim(),
      }))
      .filter((x) => x.nodeid && x.nodename);
    setCachedTransportValue(cacheKey, cityStations, 86_400);
  }

  const target = station.tagoLookupName.replace(/역$/, '').trim();
  const exact = cityStations.find((s) => s.nodename === target || s.nodename === station.tagoLookupName);
  if (exact) return exact.nodeid;
  const fuzzy = cityStations.find(
    (s) => s.nodename.includes(target) || target.includes(s.nodename)
  );
  return fuzzy?.nodeid || null;
}

function mapCustomRestKtxItems(
  items: Record<string, unknown>[],
  provider: TransportApiProviderRecord,
  origin: KtxStationRecord,
  destination: KtxStationRecord,
  travelDate: string,
  urls: ReturnType<typeof getTransportHubConfig>['externalBookingUrls']
): KtxScheduleItem[] {
  const priceField = provider.ktxConfig?.ticketPriceField || 'price';
  const redirectUrl = provider.ktxConfig?.providerRedirectUrl || provider.redirectUrl || urls.korailWebUrl;

  return items
    .map((item, idx): KtxScheduleItem | null => {
      const rawDep = String(
        item.departureTime || item.depTime || item.departure || item.depplandtime || ''
      ).trim();
      if (!rawDep) return null;
      const depHHmm = /^\d{2}:\d{2}/.test(rawDep)
        ? rawDep.slice(0, 5)
        : parseTagoTimestampKst(rawDep)?.timeHHmm || null;
      if (!depHHmm) return null;

      const rawArr = String(
        item.arrivalTime || item.arrTime || item.arrival || item.arrplandtime || ''
      ).trim();
      const arrHHmm = rawArr
        ? /^\d{2}:\d{2}/.test(rawArr)
          ? rawArr.slice(0, 5)
          : parseTagoTimestampKst(rawArr)?.timeHHmm || null
        : null;

      const depMins = timeHHmmToMinutes(depHHmm);
      const arrMins = arrHHmm ? timeHHmmToMinutes(arrHHmm) : null;
      const durationMinutes =
        typeof item.durationMinutes === 'number' && item.durationMinutes > 0
          ? Math.round(item.durationMinutes)
          : arrMins !== null && arrMins > depMins
          ? arrMins - depMins
          : null;

      const trainName = String(item.trainName || item.serviceName || item.traingradename || 'KTX').trim();
      const trainNo = String(item.trainNumber || item.trainNo || item.trainno || '—').trim();
      const isSrt = trainName.toUpperCase().includes('SRT');
      const operator: 'Korail' | 'SRT' = isSrt ? 'SRT' : 'Korail';
      const isHighSpeed = isSrt || trainName.toUpperCase().includes('KTX');

      const rawPrice = Number(item[priceField] ?? item.standardFareKrw ?? item.fare ?? item.price);
      const standardFareKrw = Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : null;

      const itemRedirect =
        typeof item.bookingUrl === 'string' && item.bookingUrl.startsWith('https://')
          ? item.bookingUrl
          : redirectUrl;

      return {
        id: `custom_rail_${provider.id}_${trainNo}_${depHHmm}_${idx}`,
        operator,
        trainName,
        trainNumber: trainNo,
        isHighSpeed,
        departureStationId: origin.id,
        departureStationNameEn: origin.nameEn,
        departureStationNameKo: origin.nameKo,
        arrivalStationId: destination.id,
        arrivalStationNameEn: destination.nameEn,
        arrivalStationNameKo: destination.nameKo,
        departureTimeKst: depHHmm,
        arrivalTimeKst: arrHHmm,
        departureIsoKst: `${travelDate}T${depHHmm}:00+09:00`,
        arrivalIsoKst: arrHHmm ? `${travelDate}T${arrHHmm}:00+09:00` : null,
        durationMinutes,
        standardFareKrw,
        firstClassFareKrw: null,
        seatAvailability: null,
        passengersRequested: 1,
        estimatedTotalStandardKrw: standardFareKrw,
        bookingLinks: {
          primaryLabel: isSrt ? 'Continue to SRT' : `Continue to ${provider.name}`,
          primaryUrl: itemRedirect,
          secondaryLabel: 'Official Korail',
          secondaryUrl: urls.korailWebUrl,
        },
      };
    })
    .filter((x): x is KtxScheduleItem => x !== null)
    .sort((a, b) => a.departureIsoKst.localeCompare(b.departureIsoKst));
}

function buildBookingLinksForOperator(
  operator: 'Korail' | 'SRT',
  urls: ReturnType<typeof getTransportHubConfig>['externalBookingUrls']
) {
  if (operator === 'SRT') {
    return {
      primaryLabel: 'Continue to SRT',
      primaryUrl: urls.srtWebUrl,
    };
  }
  return {
    primaryLabel: 'Continue to Korail',
    primaryUrl: urls.korailWebUrl,
    secondaryLabel: 'Open KorailTalk',
    secondaryUrl: urls.korailTalkAndroidUrl,
    appLinks: [
      { label: 'KorailTalk (Android)', url: urls.korailTalkAndroidUrl },
      { label: 'KorailTalk (iOS)', url: urls.korailTalkIosUrl },
    ],
  };
}

export async function searchKtxSchedules(
  input: KtxSearchInput,
  origin: KtxStationRecord,
  destination: KtxStationRecord
): Promise<KtxSearchResponse> {
  const cfg = getTransportHubConfig();
  const urls = cfg.externalBookingUrls;
  const supportsSrtOnRoute =
    origin.operators.includes('SRT') && destination.operators.includes('SRT');
  const supportsKorailOnRoute =
    origin.operators.includes('Korail') && destination.operators.includes('Korail');

  const activeKtxProviders = getActiveProvidersForType('ktx');
  const primaryProvider = activeKtxProviders[0] || null;
  const effectiveKorailUrl =
    (primaryProvider?.ktxConfig?.providerRedirectUrl || primaryProvider?.redirectUrl || urls.korailWebUrl);

  const basePayload = {
    dataSource: primaryProvider
      ? primaryProvider.name
      : 'Korea Public Data Portal (TAGO TrainInfoService)',
    lastUpdatedAt: new Date().toISOString(),
    timezone: 'Asia/Seoul' as const,
    query: {
      origin,
      destination,
      travelDate: input.travelDate,
      preferredDepartureTime: input.preferredDepartureTime,
      passengers: input.passengers,
      showAllDepartures: Boolean(input.showAllDepartures),
    },
    officialBookingLinks: {
      korailWebUrl: effectiveKorailUrl,
      korailTalkAndroidUrl: urls.korailTalkAndroidUrl,
      korailTalkIosUrl: urls.korailTalkIosUrl,
      srtWebUrl: urls.srtWebUrl,
      supportsSrtOnRoute,
      supportsKorailOnRoute,
    },
    notice:
      'Booking, seat selection, and payment are completed on the official external rail platform (Korail / SRT). EveryKR does not sell tickets.',
  };

  if (!cfg.services.ktx.enabled || !primaryProvider) {
    return {
      ok: false,
      status: 'service_disabled',
      message: !cfg.services.ktx.enabled
        ? 'KTX Train discovery is currently paused by the administrator.'
        : 'All KTX Train API providers are currently disabled in Admin Transport Management.',
      providerConfigured: Boolean(resolveTagoServiceKey().key),
      totalSchedulesForDate: 0,
      filteredCount: 0,
      schedules: [],
      ...basePayload,
    };
  }

  const routeSummary = `${origin.nameEn} → ${destination.nameEn} (${input.travelDate})`;

  // Custom REST KTX Provider Execution Path (dynamically added via Admin Transport Management)
  if (primaryProvider.adapterType === 'custom_rest') {
    const customCreds = resolveProviderCredentialsServerOnly(primaryProvider);
    if (primaryProvider.authType !== 'none' && !customCreds.apiKey) {
      return {
        ok: true,
        status: 'external_access_required',
        message: `Active KTX provider "${primaryProvider.name}" requires API credentials in Admin → Transport Management → KTX API Management. Continue directly to Korail or SRT below.`,
        providerConfigured: false,
        totalSchedulesForDate: 0,
        filteredCount: 0,
        schedules: [],
        ...basePayload,
      };
    }

    const kc = primaryProvider.ktxConfig;
    const cacheKey = `ktx_custom_${primaryProvider.id}_${origin.id}_${destination.id}_${input.travelDate}`;
    let rawSchedules = getCachedTransportValue<KtxScheduleItem[]>(cacheKey);
    let apiCalled = false;
    let apiSucceeded = true;
    let responseTimeMs = 0;

    if (!rawSchedules) {
      apiCalled = true;
      const queryParams: Record<string, string | number> = {
        [kc?.departureStationParam || 'origin']: origin.code,
        [kc?.arrivalStationParam || 'destination']: destination.code,
        [kc?.travelDateParam || 'date']: input.travelDate,
        [kc?.departureTimeParam || 'time']: input.preferredDepartureTime,
        [kc?.passengersParam || 'passengers']: input.passengers,
      };
      const customRes = await callCustomRestProvider(primaryProvider, queryParams, routeSummary);
      responseTimeMs = customRes.responseTimeMs;
      apiSucceeded = customRes.ok;

      if (!customRes.ok) {
        recordTransportSearchEvent({
          mode: 'ktx',
          originName: origin.nameEn,
          destinationName: destination.nameEn,
          travelDate: input.travelDate,
          preferredDepartureTime: input.preferredDepartureTime,
          passengers: input.passengers,
          resultsCount: 0,
          status: 'provider_error',
          apiCalled: true,
          apiSucceeded: false,
          responseTimeMs,
        });
        return {
          ok: true,
          status: 'provider_error',
          message:
            customRes.errorMessage ||
            `Live timetable data from ${primaryProvider.name} is temporarily unavailable. Continue to Korail or SRT directly.`,
          providerConfigured: true,
          totalSchedulesForDate: 0,
          filteredCount: 0,
          schedules: [],
          ...basePayload,
        };
      }

      rawSchedules = mapCustomRestKtxItems(
        customRes.items,
        primaryProvider,
        origin,
        destination,
        input.travelDate,
        urls
      );
      setCachedTransportValue(cacheKey, rawSchedules);
    }

    const classFiltered = rawSchedules.filter((s) => {
      if (input.trainClassFilter === 'ktx') return s.operator === 'Korail' && s.isHighSpeed;
      if (input.trainClassFilter === 'srt') return s.operator === 'SRT';
      if (input.trainClassFilter === 'conventional') return !s.isHighSpeed;
      return true;
    });
    const kstNow = getKstNowParts();
    const isTodayKst = input.travelDate === kstNow.dateStr;
    const preferredMinutes = timeHHmmToMinutes(input.preferredDepartureTime);
    const timeFiltered = classFiltered
      .filter((s) => {
        const depMins = timeHHmmToMinutes(s.departureTimeKst);
        if (input.showAllDepartures) return true;
        if (isTodayKst && depMins < kstNow.totalMinutes) return false;
        return depMins >= preferredMinutes;
      })
      .map((s) => ({
        ...s,
        passengersRequested: input.passengers,
        estimatedTotalStandardKrw:
          s.standardFareKrw !== null ? s.standardFareKrw * input.passengers : null,
      }));

    const status: KtxSearchResponse['status'] =
      timeFiltered.length > 0 ? 'live_results' : 'no_schedules';
    recordTransportSearchEvent({
      mode: 'ktx',
      originName: origin.nameEn,
      destinationName: destination.nameEn,
      travelDate: input.travelDate,
      preferredDepartureTime: input.preferredDepartureTime,
      passengers: input.passengers,
      resultsCount: timeFiltered.length,
      status,
      apiCalled,
      apiSucceeded,
      responseTimeMs,
    });

    return {
      ok: true,
      status,
      message:
        timeFiltered.length > 0
          ? `Found ${timeFiltered.length} train departures from ${origin.nameEn} to ${destination.nameEn} via ${primaryProvider.name}.`
          : `No train departures returned by ${primaryProvider.name} for ${origin.nameEn} → ${destination.nameEn} on ${input.travelDate}.`,
      providerConfigured: true,
      totalSchedulesForDate: classFiltered.length,
      filteredCount: timeFiltered.length,
      schedules: timeFiltered,
      ...basePayload,
    };
  }

  // Standard Korea TAGO TrainInfoService Execution Path
  const providerCreds = resolveProviderCredentialsServerOnly(primaryProvider);
  const effectiveServiceKey = providerCreds.apiKey || resolveTagoServiceKey().key;

  if (!effectiveServiceKey) {
    recordTransportSearchEvent({
      mode: 'ktx',
      originName: origin.nameEn,
      destinationName: destination.nameEn,
      travelDate: input.travelDate,
      preferredDepartureTime: input.preferredDepartureTime,
      passengers: input.passengers,
      resultsCount: 0,
      status: 'external_access_required',
      apiCalled: false,
      apiSucceeded: false,
    });

    return {
      ok: true,
      status: 'external_access_required',
      message:
        'Live Korean rail timetables and fares require an active Korea Public Data Portal (TAGO TrainInfoService) server API key (DATA_GO_KR_SERVICE_KEY) configured in server environment variables or Admin → Transport Management → KTX API Management. EveryKR never displays simulated or fabricated train schedules. Continue directly to the official Korail or SRT website below.',
      providerConfigured: false,
      totalSchedulesForDate: 0,
      filteredCount: 0,
      schedules: [],
      ...basePayload,
    };
  }

  // Resolve official TAGO station IDs
  const [depNodeId, arrNodeId] = await Promise.all([
    resolveTagoStationNodeId(origin, effectiveServiceKey, primaryProvider.apiBaseUrl, primaryProvider.timeoutMs),
    resolveTagoStationNodeId(destination, effectiveServiceKey, primaryProvider.apiBaseUrl, primaryProvider.timeoutMs),
  ]);

  if (!depNodeId || !arrNodeId) {
    recordTransportSearchEvent({
      mode: 'ktx',
      originName: origin.nameEn,
      destinationName: destination.nameEn,
      travelDate: input.travelDate,
      preferredDepartureTime: input.preferredDepartureTime,
      passengers: input.passengers,
      resultsCount: 0,
      status: 'provider_error',
      apiCalled: true,
      apiSucceeded: false,
    });
    return {
      ok: true,
      status: 'provider_error',
      message:
        'Could not resolve official TAGO station codes for this station pair. Please check schedules directly on Korail or SRT.',
      providerConfigured: true,
      totalSchedulesForDate: 0,
      filteredCount: 0,
      schedules: [],
      ...basePayload,
    };
  }

  const compactDate = input.travelDate.replace(/-/g, '');
  const cacheKey = `ktx_tago_${primaryProvider.id}_${depNodeId}_${arrNodeId}_${compactDate}`;

  let rawSchedules = getCachedTransportValue<KtxScheduleItem[]>(cacheKey);
  let apiCalled = false;
  let apiSucceeded = true;
  let responseTimeMs = 0;

  if (!rawSchedules) {
    apiCalled = true;
    const tagoEndpointUrl = `${primaryProvider.apiBaseUrl.replace(/\/$/, '')}${sanitizeEndpointPath(
      primaryProvider.searchEndpoint || '/1613000/TrainInfoService/getStrtpntAlocFndTrainInfo'
    )}`;
    const tagoRes = await callTagoOpenApi(
      tagoEndpointUrl,
      {
        [primaryProvider.ktxConfig?.departureStationParam || 'depPlaceId']: depNodeId,
        [primaryProvider.ktxConfig?.arrivalStationParam || 'arrPlaceId']: arrNodeId,
        [primaryProvider.ktxConfig?.travelDateParam || 'depPlandTime']: compactDate,
        numOfRows: 200,
        pageNo: 1,
      },
      primaryProvider.timeoutMs || 10_000,
      effectiveServiceKey
    );
    responseTimeMs = tagoRes.responseTimeMs;
    apiSucceeded = tagoRes.ok;

    recordProviderLiveCallMetric({
      providerId: primaryProvider.id,
      success: tagoRes.ok,
      httpStatus: tagoRes.ok ? 200 : null,
      responseTimeMs,
      errorMessage: tagoRes.ok ? null : tagoRes.errorMessage || 'TAGO request failed.',
      routeSummary,
    });

    if (!tagoRes.ok) {
      recordTransportSearchEvent({
        mode: 'ktx',
        originName: origin.nameEn,
        destinationName: destination.nameEn,
        travelDate: input.travelDate,
        preferredDepartureTime: input.preferredDepartureTime,
        passengers: input.passengers,
        resultsCount: 0,
        status: 'provider_error',
        apiCalled: true,
        apiSucceeded: false,
        responseTimeMs,
      });

      return {
        ok: true,
        status: 'provider_error',
        message:
          tagoRes.errorMessage ||
          'Live timetable data from TAGO TrainInfoService is temporarily unavailable. Continue to Korail or SRT directly.',
        providerConfigured: true,
        totalSchedulesForDate: 0,
        filteredCount: 0,
        schedules: [],
        ...basePayload,
      };
    }

    const effectiveUrls = {
      ...urls,
      korailWebUrl: effectiveKorailUrl,
    };

    rawSchedules = tagoRes.items
      .map((item, idx): KtxScheduleItem | null => {
        const depParsed = parseTagoTimestampKst(item.depplandtime as string | number);
        if (!depParsed) return null;
        const arrParsed = parseTagoTimestampKst(item.arrplandtime as string | number);

        const gradeRaw = String(item.traingradename || '').trim();
        const trainNo = String(item.trainno || '').trim();
        const upperGrade = gradeRaw.toUpperCase();
        const isSrt = upperGrade.includes('SRT');
        const operator: 'Korail' | 'SRT' = isSrt ? 'SRT' : 'Korail';
        const isHighSpeed = isSrt || upperGrade.includes('KTX');

        const durationMinutes =
          arrParsed && arrParsed.epochMs > depParsed.epochMs
            ? Math.round((arrParsed.epochMs - depParsed.epochMs) / 60_000)
            : null;

        const priceKey = primaryProvider.ktxConfig?.ticketPriceField || 'adultcharge';
        const parsedCharge = Number(item[priceKey] ?? item.adultcharge);
        const standardFareKrw =
          Number.isFinite(parsedCharge) && parsedCharge > 0 ? Math.round(parsedCharge) : null;

        return {
          id: `rail_${depNodeId}_${arrNodeId}_${trainNo || idx}_${depParsed.timeHHmm}`,
          operator,
          trainName: gradeRaw || 'Train',
          trainNumber: trainNo || '—',
          isHighSpeed,
          departureStationId: origin.id,
          departureStationNameEn: origin.nameEn,
          departureStationNameKo: String(item.depplacename || origin.nameKo),
          arrivalStationId: destination.id,
          arrivalStationNameEn: destination.nameEn,
          arrivalStationNameKo: String(item.arrplacename || destination.nameKo),
          departureTimeKst: depParsed.timeHHmm,
          arrivalTimeKst: arrParsed ? arrParsed.timeHHmm : null,
          departureIsoKst: depParsed.isoKst,
          arrivalIsoKst: arrParsed ? arrParsed.isoKst : null,
          durationMinutes,
          standardFareKrw,
          firstClassFareKrw: null,
          seatAvailability: null,
          passengersRequested: 1,
          estimatedTotalStandardKrw: standardFareKrw,
          bookingLinks: buildBookingLinksForOperator(operator, effectiveUrls),
        };
      })
      .filter((x): x is KtxScheduleItem => x !== null)
      .sort((a, b) => a.departureIsoKst.localeCompare(b.departureIsoKst));

    setCachedTransportValue(cacheKey, rawSchedules);
  }

  // Filter by train class preference
  const classFiltered = rawSchedules.filter((s) => {
    if (input.trainClassFilter === 'ktx') return s.operator === 'Korail' && s.isHighSpeed;
    if (input.trainClassFilter === 'srt') return s.operator === 'SRT';
    if (input.trainClassFilter === 'conventional') return !s.isHighSpeed;
    return true;
  });

  // Strict Asia/Seoul KST departure time filtering
  const kstNow = getKstNowParts();
  const isTodayKst = input.travelDate === kstNow.dateStr;
  const preferredMinutes = timeHHmmToMinutes(input.preferredDepartureTime);

  const timeFiltered = classFiltered
    .filter((s) => {
      const depMins = timeHHmmToMinutes(s.departureTimeKst);
      if (input.showAllDepartures) {
        return true;
      }
      if (isTodayKst && depMins < kstNow.totalMinutes) {
        return false;
      }
      return depMins >= preferredMinutes;
    })
    .map((s) => ({
      ...s,
      passengersRequested: input.passengers,
      estimatedTotalStandardKrw:
        s.standardFareKrw !== null ? s.standardFareKrw * input.passengers : null,
    }));

  const status: KtxSearchResponse['status'] =
    timeFiltered.length > 0 ? 'live_results' : 'no_schedules';

  recordTransportSearchEvent({
    mode: 'ktx',
    originName: origin.nameEn,
    destinationName: destination.nameEn,
    travelDate: input.travelDate,
    preferredDepartureTime: input.preferredDepartureTime,
    passengers: input.passengers,
    resultsCount: timeFiltered.length,
    status,
    apiCalled,
    apiSucceeded,
    responseTimeMs,
  });

  const message =
    timeFiltered.length > 0
      ? `Found ${timeFiltered.length} official train departures from ${origin.nameEn} to ${destination.nameEn}.`
      : classFiltered.length > 0
      ? `No departures found at or after ${input.preferredDepartureTime} KST. ${classFiltered.length} earlier departures exist on ${input.travelDate} — toggle "View all departures" to inspect them.`
      : `No direct TAGO train schedules returned for ${origin.nameEn} → ${destination.nameEn} on ${input.travelDate}. Check official Korail or SRT portals for transfer options or alternate dates.`;

  return {
    ok: true,
    status,
    message,
    providerConfigured: true,
    totalSchedulesForDate: classFiltered.length,
    filteredCount: timeFiltered.length,
    schedules: timeFiltered,
    ...basePayload,
  };
}
