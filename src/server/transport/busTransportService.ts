/**
 * Korean Express Bus (고속버스) & Intercity Bus (시외버스) Discovery Service
 *
 * Official Providers: Korea Ministry of Land, Infrastructure and Transport (MOLIT)
 * - TAGO ExpBusInfoService (`https://apis.data.go.kr/1613000/ExpBusInfoService`)
 * - TAGO SuberbsBusInfoService (`https://apis.data.go.kr/1613000/SuberbsBusInfoService`)
 *
 * STRICT INTEGRITY RULES:
 * - Zero fabricated schedules, fares, durations, or seat counts.
 * - Any unavailable field is explicitly returned as null so the UI renders "Information unavailable".
 * - Official external booking links route users to Kobus (Express) or Bustago / TxBus (Intercity).
 */

import {
  BusTerminalRecord,
  getKstNowParts,
  isValidIsoDateString,
  isValidTimeHHmm,
  parseTagoTimestampKst,
  timeHHmmToMinutes,
} from './transportCatalog';
import {
  callTagoOpenApi,
  getAllBusTerminals,
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

export type BusTypeFilter = 'all' | 'express' | 'intercity';
export type BusGradeCategory = 'all' | 'general' | 'excellent' | 'premium';

export interface BusSearchInput {
  originId: string;
  destinationId: string;
  travelDate: string; // YYYY-MM-DD (Asia/Seoul KST)
  preferredDepartureTime: string; // HH:mm
  passengers: number;
  busType: BusTypeFilter;
  busCategory: BusGradeCategory;
  showAllDepartures?: boolean;
}

export interface BusScheduleItem {
  id: string;
  serviceType: 'express' | 'intercity';
  serviceTypeLabel: string;
  busGradeCategory: 'general' | 'excellent' | 'premium' | 'other';
  busGradeLabelEn: string;
  busGradeRawKo: string;
  isLateNight: boolean;
  departureTerminalId: string;
  departureTerminalNameEn: string;
  departureTerminalNameKo: string;
  arrivalTerminalId: string;
  arrivalTerminalNameEn: string;
  arrivalTerminalNameKo: string;
  departureTimeKst: string; // HH:mm
  arrivalTimeKst: string | null; // null -> Information unavailable
  departureIsoKst: string;
  arrivalIsoKst: string | null;
  durationMinutes: number | null; // null if arrivalTime unavailable
  fareKrw: number | null; // Official adult fare from TAGO charge
  passengersRequested: number;
  estimatedTotalKrw: number | null;
  seatAvailability: null; // TAGO public timetable API does not provide live seat counts
  bookingLinks: {
    label: string;
    url: string;
    platform: 'kobus' | 'bustago' | 'txbus';
  }[];
}

export interface BusSearchResponse {
  ok: boolean;
  status: 'live_results' | 'no_schedules' | 'external_access_required' | 'provider_error' | 'service_disabled';
  message: string;
  dataSource: string;
  providerConfigured: boolean;
  lastUpdatedAt: string;
  timezone: 'Asia/Seoul';
  query: {
    origin: BusTerminalRecord;
    destination: BusTerminalRecord;
    travelDate: string;
    preferredDepartureTime: string;
    passengers: number;
    busType: BusTypeFilter;
    busCategory: BusGradeCategory;
    showAllDepartures: boolean;
  };
  totalSchedulesForDate: number;
  filteredCount: number;
  schedules: BusScheduleItem[];
  officialBookingLinks: {
    kobusWebUrl: string;
    bustagoWebUrl: string;
    txbusWebUrl: string;
    recommendedPlatforms: ('kobus' | 'bustago' | 'txbus')[];
  };
  notice: string;
}

const TAGO_EXPBUS_BASE = 'https://apis.data.go.kr/1613000/ExpBusInfoService';
const TAGO_INTERCITY_BASE = 'https://apis.data.go.kr/1613000/SuberbsBusInfoService';

export function validateBusSearchInput(raw: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  sanitized?: BusSearchInput;
  origin?: BusTerminalRecord;
  destination?: BusTerminalRecord;
} {
  const terminals = getAllBusTerminals();
  const originKey = String(raw.originId || raw.origin || '').trim().toLowerCase();
  const destKey = String(raw.destinationId || raw.destination || '').trim().toLowerCase();

  const findTerminal = (key: string) =>
    terminals.find(
      (t) =>
        t.id.toLowerCase() === key ||
        t.code.toLowerCase() === key ||
        t.nameEn.toLowerCase() === key ||
        t.nameKo === key
    );

  const origin = findTerminal(originKey);
  const destination = findTerminal(destKey);

  if (!origin) {
    return { valid: false, error: 'Please select a valid departure bus terminal.' };
  }
  if (!destination) {
    return { valid: false, error: 'Please select a valid destination bus terminal.' };
  }
  if (origin.id === destination.id) {
    return { valid: false, error: 'Departure and destination terminals must be different.' };
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

  const rawBusType = String(raw.busType || 'all').toLowerCase();
  const busType: BusTypeFilter =
    rawBusType === 'express' || rawBusType === 'intercity' ? rawBusType : 'all';

  const rawCategory = String(raw.busCategory || 'all').toLowerCase();
  const busCategory: BusGradeCategory =
    rawCategory === 'general' || rawCategory === 'excellent' || rawCategory === 'premium'
      ? rawCategory
      : 'all';

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
      busType,
      busCategory,
      showAllDepartures,
    },
  };
}

function classifyBusGrade(gradeRawKo: string): {
  category: 'general' | 'excellent' | 'premium' | 'other';
  labelEn: string;
  isLateNight: boolean;
} {
  const g = gradeRawKo.trim();
  const isLateNight = g.includes('심야');
  if (g.includes('프리미엄')) {
    return {
      category: 'premium',
      labelEn: isLateNight ? 'Premium Late-Night (심야프리미엄)' : 'Premium (프리미엄)',
      isLateNight,
    };
  }
  if (g.includes('우등')) {
    return {
      category: 'excellent',
      labelEn: isLateNight ? 'Excellent Late-Night (심야우등)' : 'Excellent (우등)',
      isLateNight,
    };
  }
  if (g.includes('일반') || g.includes('고속')) {
    return {
      category: 'general',
      labelEn: isLateNight ? 'General Late-Night (심야일반)' : 'General (일반)',
      isLateNight,
    };
  }
  return {
    category: 'other',
    labelEn: g || 'Standard',
    isLateNight,
  };
}

async function resolveExpressTerminalId(
  terminal: BusTerminalRecord,
  serviceKey?: string | null,
  baseUrl?: string,
  timeoutMs?: number
): Promise<string | null> {
  if (terminal.tagoExpressTerminalId) return terminal.tagoExpressTerminalId;
  if (!terminal.tagoExpressLookupName) return null;

  const cacheKey = `tago_expbus_trminl_${terminal.tagoExpressLookupName}`;
  const cached = getCachedTransportValue<string | null>(cacheKey);
  if (cached !== null) return cached;

  const expRoot = baseUrl ? `${baseUrl.replace(/\/$/, '')}/1613000/ExpBusInfoService` : TAGO_EXPBUS_BASE;
  const res = await callTagoOpenApi(
    `${expRoot}/getExpBusTrminlList`,
    {
      terminalNm: terminal.tagoExpressLookupName,
      numOfRows: 30,
      pageNo: 1,
    },
    timeoutMs || 10_000,
    serviceKey
  );
  if (!res.ok || res.items.length === 0) return null;

  const target = terminal.tagoExpressLookupName.trim();
  const match =
    res.items.find((i) => String(i.terminalNm || '').trim() === target) || res.items[0];
  const id = String(match?.terminalId || '').trim() || null;
  if (id) setCachedTransportValue(cacheKey, id, 86_400);
  return id;
}

async function resolveIntercityTerminalId(
  terminal: BusTerminalRecord,
  serviceKey?: string | null,
  baseUrl?: string,
  timeoutMs?: number
): Promise<string | null> {
  if (!terminal.tagoIntercityLookupName) return null;

  const cacheKey = `tago_suberbs_trminl_${terminal.tagoIntercityLookupName}`;
  const cached = getCachedTransportValue<string | null>(cacheKey);
  if (cached !== null) return cached;

  const subRoot = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/1613000/SuberbsBusInfoService`
    : TAGO_INTERCITY_BASE;
  const res = await callTagoOpenApi(
    `${subRoot}/getSuberbsBusTrminlList`,
    {
      terminalNm: terminal.tagoIntercityLookupName,
      numOfRows: 30,
      pageNo: 1,
    },
    timeoutMs || 10_000,
    serviceKey
  );
  if (!res.ok || res.items.length === 0) return null;

  const target = terminal.tagoIntercityLookupName.trim();
  const match =
    res.items.find((i) => String(i.terminalNm || '').trim() === target) || res.items[0];
  const id = String(match?.terminalId || '').trim() || null;
  if (id) setCachedTransportValue(cacheKey, id, 86_400);
  return id;
}

function mapCustomRestBusItems(
  items: Record<string, unknown>[],
  provider: TransportApiProviderRecord,
  origin: BusTerminalRecord,
  destination: BusTerminalRecord,
  travelDate: string,
  urls: ReturnType<typeof getTransportHubConfig>['externalBookingUrls']
): BusScheduleItem[] {
  const bc = provider.busConfig;
  const priceField = bc?.ticketPriceField || 'price';
  const operatorField = bc?.busOperatorField || 'operator';
  const bookingUrl = bc?.externalBookingUrl || provider.redirectUrl || urls.kobusWebUrl;
  const defaultServiceType: 'express' | 'intercity' =
    bc?.busMode === 'intercity' ? 'intercity' : 'express';

  return items
    .map((item, idx): BusScheduleItem | null => {
      const rawDep = String(
        item.departureTime || item.depTime || item.departure || item.depPlandTime || ''
      ).trim();
      if (!rawDep) return null;
      const depHHmm = /^\d{2}:\d{2}/.test(rawDep)
        ? rawDep.slice(0, 5)
        : parseTagoTimestampKst(rawDep)?.timeHHmm || null;
      if (!depHHmm) return null;

      const rawArr = String(
        item.arrivalTime || item.arrTime || item.arrival || item.arrPlandTime || ''
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

      const serviceType: 'express' | 'intercity' =
        String(item.serviceType || '').toLowerCase() === 'intercity'
          ? 'intercity'
          : String(item.serviceType || '').toLowerCase() === 'express'
          ? 'express'
          : defaultServiceType;

      const gradeRawKo = String(item[operatorField] ?? item.gradeNm ?? item.busGrade ?? '').trim();
      const gradeMeta = classifyBusGrade(gradeRawKo);

      const rawCharge = Number(item[priceField] ?? item.fareKrw ?? item.fare ?? item.price);
      const fareKrw = Number.isFinite(rawCharge) && rawCharge > 0 ? Math.round(rawCharge) : null;

      const itemBookingUrl =
        typeof item.bookingUrl === 'string' && item.bookingUrl.startsWith('https://')
          ? item.bookingUrl
          : bookingUrl;

      return {
        id: `custom_bus_${provider.id}_${origin.id}_${destination.id}_${depHHmm}_${idx}`,
        serviceType,
        serviceTypeLabel:
          serviceType === 'express' ? 'Express Bus (고속버스)' : 'Intercity Bus (시외버스)',
        busGradeCategory: gradeMeta.category,
        busGradeLabelEn: gradeMeta.labelEn,
        busGradeRawKo: gradeRawKo || 'Standard',
        isLateNight: gradeMeta.isLateNight,
        departureTerminalId: origin.id,
        departureTerminalNameEn: origin.nameEn,
        departureTerminalNameKo: origin.nameKo,
        arrivalTerminalId: destination.id,
        arrivalTerminalNameEn: destination.nameEn,
        arrivalTerminalNameKo: destination.nameKo,
        departureTimeKst: depHHmm,
        arrivalTimeKst: arrHHmm,
        departureIsoKst: `${travelDate}T${depHHmm}:00+09:00`,
        arrivalIsoKst: arrHHmm ? `${travelDate}T${arrHHmm}:00+09:00` : null,
        durationMinutes,
        fareKrw,
        passengersRequested: 1,
        estimatedTotalKrw: fareKrw,
        seatAvailability: null,
        bookingLinks: [
          {
            label: `Book via ${provider.name}`,
            url: itemBookingUrl,
            platform: serviceType === 'express' ? 'kobus' : 'bustago',
          },
        ],
      };
    })
    .filter((x): x is BusScheduleItem => x !== null);
}

function mapTagoBusItems(
  items: Record<string, unknown>[],
  serviceType: 'express' | 'intercity',
  origin: BusTerminalRecord,
  destination: BusTerminalRecord,
  urls: ReturnType<typeof getTransportHubConfig>['externalBookingUrls']
): BusScheduleItem[] {
  const bookingLinks =
    serviceType === 'express'
      ? [{ label: 'Book on Kobus', url: urls.kobusWebUrl, platform: 'kobus' as const }]
      : [
          { label: 'Book on Bustago', url: urls.bustagoWebUrl, platform: 'bustago' as const },
          { label: 'Book on TxBus', url: urls.txbusWebUrl, platform: 'txbus' as const },
        ];

  return items
    .map((item, idx): BusScheduleItem | null => {
      const depParsed = parseTagoTimestampKst(item.depPlandTime as string | number);
      if (!depParsed) return null;
      const arrParsed = parseTagoTimestampKst(item.arrPlandTime as string | number);

      const durationMinutes =
        arrParsed && arrParsed.epochMs > depParsed.epochMs
          ? Math.round((arrParsed.epochMs - depParsed.epochMs) / 60_000)
          : null;

      const gradeRawKo = String(item.gradeNm || '').trim();
      const gradeMeta = classifyBusGrade(gradeRawKo);

      const parsedCharge = Number(item.charge);
      const fareKrw =
        Number.isFinite(parsedCharge) && parsedCharge > 0 ? Math.round(parsedCharge) : null;

      return {
        id: `bus_${serviceType}_${origin.id}_${destination.id}_${depParsed.timeHHmm}_${idx}`,
        serviceType,
        serviceTypeLabel:
          serviceType === 'express' ? 'Express Bus (고속버스)' : 'Intercity Bus (시외버스)',
        busGradeCategory: gradeMeta.category,
        busGradeLabelEn: gradeMeta.labelEn,
        busGradeRawKo: gradeRawKo || '일반',
        isLateNight: gradeMeta.isLateNight,
        departureTerminalId: origin.id,
        departureTerminalNameEn: origin.nameEn,
        departureTerminalNameKo: String(item.depPlaceNm || origin.nameKo),
        arrivalTerminalId: destination.id,
        arrivalTerminalNameEn: destination.nameEn,
        arrivalTerminalNameKo: String(item.arrPlaceNm || destination.nameKo),
        departureTimeKst: depParsed.timeHHmm,
        arrivalTimeKst: arrParsed ? arrParsed.timeHHmm : null,
        departureIsoKst: depParsed.isoKst,
        arrivalIsoKst: arrParsed ? arrParsed.isoKst : null,
        durationMinutes,
        fareKrw,
        passengersRequested: 1,
        estimatedTotalKrw: fareKrw,
        seatAvailability: null,
        bookingLinks,
      };
    })
    .filter((x): x is BusScheduleItem => x !== null);
}

export async function searchBusSchedules(
  input: BusSearchInput,
  origin: BusTerminalRecord,
  destination: BusTerminalRecord
): Promise<BusSearchResponse> {
  const cfg = getTransportHubConfig();
  const urls = cfg.externalBookingUrls;

  const recommendedPlatforms = Array.from(
    new Set<'kobus' | 'bustago' | 'txbus'>([
      ...(input.busType !== 'intercity' &&
      origin.bookingPlatforms.includes('kobus') &&
      destination.bookingPlatforms.includes('kobus')
        ? (['kobus'] as const)
        : []),
      ...(input.busType !== 'express' &&
      (origin.busModes !== 'express' || destination.busModes !== 'express')
        ? (['bustago', 'txbus'] as const)
        : []),
    ])
  );
  if (recommendedPlatforms.length === 0) {
    recommendedPlatforms.push('kobus', 'bustago', 'txbus');
  }

  const activeBusProviders = getActiveProvidersForType('bus');
  const activeExpressProvider = activeBusProviders.find((p) => p.adapterType === 'tago_express_bus') || null;
  const activeIntercityProvider = activeBusProviders.find((p) => p.adapterType === 'tago_intercity_bus') || null;
  const topCustomBusProvider = activeBusProviders.find((p) => p.adapterType === 'custom_rest') || null;
  const primaryBusProvider = activeBusProviders[0] || null;

  const effectiveUrls = {
    ...urls,
    kobusWebUrl:
      activeExpressProvider?.busConfig?.externalBookingUrl ||
      activeExpressProvider?.redirectUrl ||
      urls.kobusWebUrl,
    bustagoWebUrl:
      activeIntercityProvider?.busConfig?.externalBookingUrl ||
      activeIntercityProvider?.redirectUrl ||
      urls.bustagoWebUrl,
  };

  const basePayload = {
    dataSource:
      activeBusProviders.length > 0
        ? activeBusProviders.map((p) => p.name).join(' + ')
        : 'Korea Public Data Portal (TAGO ExpBusInfoService & SuberbsBusInfoService)',
    lastUpdatedAt: new Date().toISOString(),
    timezone: 'Asia/Seoul' as const,
    query: {
      origin,
      destination,
      travelDate: input.travelDate,
      preferredDepartureTime: input.preferredDepartureTime,
      passengers: input.passengers,
      busType: input.busType,
      busCategory: input.busCategory,
      showAllDepartures: Boolean(input.showAllDepartures),
    },
    officialBookingLinks: {
      kobusWebUrl: effectiveUrls.kobusWebUrl,
      bustagoWebUrl: effectiveUrls.bustagoWebUrl,
      txbusWebUrl: effectiveUrls.txbusWebUrl,
      recommendedPlatforms,
    },
    notice:
      'Booking, seat selection, and payment are completed on the official external bus platform (Kobus, Bustago, or TxBus). EveryKR does not sell bus tickets.',
  };

  if (!cfg.services.bus.enabled || activeBusProviders.length === 0) {
    return {
      ok: false,
      status: 'service_disabled',
      message: !cfg.services.bus.enabled
        ? 'Bus schedule discovery is currently paused by the administrator.'
        : 'All Bus API providers are currently disabled in Admin Transport Management.',
      providerConfigured: Boolean(resolveTagoServiceKey().key),
      totalSchedulesForDate: 0,
      filteredCount: 0,
      schedules: [],
      ...basePayload,
    };
  }

  const routeSummary = `${origin.nameEn} → ${destination.nameEn} (${input.travelDate})`;

  // If highest-priority active bus provider is a custom REST provider, execute it dynamically
  if (primaryBusProvider && primaryBusProvider.adapterType === 'custom_rest' && topCustomBusProvider) {
    const customCreds = resolveProviderCredentialsServerOnly(topCustomBusProvider);
    if (topCustomBusProvider.authType !== 'none' && !customCreds.apiKey) {
      return {
        ok: true,
        status: 'external_access_required',
        message: `Active Bus provider "${topCustomBusProvider.name}" requires API credentials in Admin → Transport Management → Bus API Management.`,
        providerConfigured: false,
        totalSchedulesForDate: 0,
        filteredCount: 0,
        schedules: [],
        ...basePayload,
      };
    }

    const bc = topCustomBusProvider.busConfig;
    const cacheKey = `bus_custom_${topCustomBusProvider.id}_${origin.id}_${destination.id}_${input.travelDate}_${input.busType}`;
    let combined = getCachedTransportValue<BusScheduleItem[]>(cacheKey);
    let apiCalled = false;
    let apiSucceeded = true;
    let responseTimeMs = 0;

    if (!combined) {
      apiCalled = true;
      const customRes = await callCustomRestProvider(
        topCustomBusProvider,
        {
          [bc?.departureTerminalParam || 'origin']: origin.code,
          [bc?.destinationTerminalParam || 'destination']: destination.code,
          [bc?.travelDateParam || 'date']: input.travelDate,
          [bc?.departureTimeParam || 'time']: input.preferredDepartureTime,
        },
        routeSummary
      );
      responseTimeMs = customRes.responseTimeMs;
      apiSucceeded = customRes.ok;

      if (!customRes.ok) {
        recordTransportSearchEvent({
          mode: 'bus',
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
            `Live bus schedules from ${topCustomBusProvider.name} are temporarily unavailable.`,
          providerConfigured: true,
          totalSchedulesForDate: 0,
          filteredCount: 0,
          schedules: [],
          ...basePayload,
        };
      }

      combined = mapCustomRestBusItems(
        customRes.items,
        topCustomBusProvider,
        origin,
        destination,
        input.travelDate,
        effectiveUrls
      ).sort((a, b) => a.departureIsoKst.localeCompare(b.departureIsoKst));
      setCachedTransportValue(cacheKey, combined);
    }

    const categoryFiltered = combined.filter((item) =>
      input.busCategory === 'all' ? true : item.busGradeCategory === input.busCategory
    );
    const kstNow = getKstNowParts();
    const isTodayKst = input.travelDate === kstNow.dateStr;
    const preferredMinutes = timeHHmmToMinutes(input.preferredDepartureTime);
    const timeFiltered = categoryFiltered
      .filter((item) => {
        const depMins = timeHHmmToMinutes(item.departureTimeKst);
        if (input.showAllDepartures) return true;
        if (isTodayKst && depMins < kstNow.totalMinutes) return false;
        return depMins >= preferredMinutes;
      })
      .map((item) => ({
        ...item,
        passengersRequested: input.passengers,
        estimatedTotalKrw: item.fareKrw !== null ? item.fareKrw * input.passengers : null,
      }));

    const status: BusSearchResponse['status'] =
      timeFiltered.length > 0 ? 'live_results' : 'no_schedules';
    recordTransportSearchEvent({
      mode: 'bus',
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
          ? `Found ${timeFiltered.length} bus departures from ${origin.nameEn} to ${destination.nameEn} via ${topCustomBusProvider.name}.`
          : `No bus departures returned by ${topCustomBusProvider.name} for ${origin.nameEn} → ${destination.nameEn} on ${input.travelDate}.`,
      providerConfigured: true,
      totalSchedulesForDate: categoryFiltered.length,
      filteredCount: timeFiltered.length,
      schedules: timeFiltered,
      ...basePayload,
    };
  }

  // Standard Korea TAGO Express & Intercity Bus Execution Path
  const expressKey = activeExpressProvider
    ? resolveProviderCredentialsServerOnly(activeExpressProvider).apiKey || resolveTagoServiceKey().key
    : null;
  const intercityKey = activeIntercityProvider
    ? resolveProviderCredentialsServerOnly(activeIntercityProvider).apiKey || resolveTagoServiceKey().key
    : null;

  if (!expressKey && !intercityKey) {
    recordTransportSearchEvent({
      mode: 'bus',
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
        'Live Korean Express & Intercity Bus timetables and fares require an active Korea Public Data Portal (TAGO Bus Open API) server API key (DATA_GO_KR_SERVICE_KEY) configured in server environment variables or Admin → Transport Management → Bus API Management. EveryKR never displays simulated or fabricated bus schedules. Continue directly to Kobus, Bustago, or TxBus below.',
      providerConfigured: false,
      totalSchedulesForDate: 0,
      filteredCount: 0,
      schedules: [],
      ...basePayload,
    };
  }

  const compactDate = input.travelDate.replace(/-/g, '');
  const cacheKey = `bus_tago_${origin.id}_${destination.id}_${compactDate}_${input.busType}_${activeExpressProvider ? 'E' : '0'}_${activeIntercityProvider ? 'I' : '0'}`;
  let combined = getCachedTransportValue<BusScheduleItem[]>(cacheKey);

  let apiCalled = false;
  let apiSucceeded = false;
  let responseTimeMs = 0;
  let lastErrorMsg = '';

  if (!combined) {
    combined = [];
    const wantExpress =
      Boolean(activeExpressProvider && expressKey) &&
      (input.busType === 'all' || input.busType === 'express') &&
      origin.busModes !== 'intercity' &&
      destination.busModes !== 'intercity';
    const wantIntercity =
      Boolean(activeIntercityProvider && intercityKey) &&
      (input.busType === 'all' || input.busType === 'intercity') &&
      origin.busModes !== 'express' &&
      destination.busModes !== 'express';

    if (wantExpress && activeExpressProvider) {
      const [depExpId, arrExpId] = await Promise.all([
        resolveExpressTerminalId(origin, expressKey, activeExpressProvider.apiBaseUrl, activeExpressProvider.timeoutMs),
        resolveExpressTerminalId(destination, expressKey, activeExpressProvider.apiBaseUrl, activeExpressProvider.timeoutMs),
      ]);
      if (depExpId && arrExpId) {
        apiCalled = true;
        const expUrl = `${activeExpressProvider.apiBaseUrl.replace(/\/$/, '')}${sanitizeEndpointPath(
          activeExpressProvider.searchEndpoint || '/1613000/ExpBusInfoService/getStrtpntAlocFndExpbusInfo'
        )}`;
        const expRes = await callTagoOpenApi(
          expUrl,
          {
            [activeExpressProvider.busConfig?.departureTerminalParam || 'depTerminalId']: depExpId,
            [activeExpressProvider.busConfig?.destinationTerminalParam || 'arrTerminalId']: arrExpId,
            [activeExpressProvider.busConfig?.travelDateParam || 'depPlandTime']: compactDate,
            numOfRows: 200,
            pageNo: 1,
          },
          activeExpressProvider.timeoutMs || 10_000,
          expressKey
        );
        responseTimeMs = Math.max(responseTimeMs, expRes.responseTimeMs);
        recordProviderLiveCallMetric({
          providerId: activeExpressProvider.id,
          success: expRes.ok,
          httpStatus: expRes.ok ? 200 : null,
          responseTimeMs: expRes.responseTimeMs,
          errorMessage: expRes.ok ? null : expRes.errorMessage || 'Express bus request failed.',
          routeSummary,
        });
        if (expRes.ok) {
          apiSucceeded = true;
          combined.push(...mapTagoBusItems(expRes.items, 'express', origin, destination, effectiveUrls));
        } else if (expRes.errorMessage) {
          lastErrorMsg = expRes.errorMessage;
        }
      }
    }

    if (wantIntercity && activeIntercityProvider) {
      const [depSubId, arrSubId] = await Promise.all([
        resolveIntercityTerminalId(origin, intercityKey, activeIntercityProvider.apiBaseUrl, activeIntercityProvider.timeoutMs),
        resolveIntercityTerminalId(destination, intercityKey, activeIntercityProvider.apiBaseUrl, activeIntercityProvider.timeoutMs),
      ]);
      if (depSubId && arrSubId) {
        apiCalled = true;
        const subUrl = `${activeIntercityProvider.apiBaseUrl.replace(/\/$/, '')}${sanitizeEndpointPath(
          activeIntercityProvider.searchEndpoint || '/1613000/SuberbsBusInfoService/getStrtpntAlocFndSuberbsBusInfo'
        )}`;
        const subRes = await callTagoOpenApi(
          subUrl,
          {
            [activeIntercityProvider.busConfig?.departureTerminalParam || 'depTerminalId']: depSubId,
            [activeIntercityProvider.busConfig?.destinationTerminalParam || 'arrTerminalId']: arrSubId,
            [activeIntercityProvider.busConfig?.travelDateParam || 'depPlandTime']: compactDate,
            numOfRows: 200,
            pageNo: 1,
          },
          activeIntercityProvider.timeoutMs || 10_000,
          intercityKey
        );
        responseTimeMs = Math.max(responseTimeMs, subRes.responseTimeMs);
        recordProviderLiveCallMetric({
          providerId: activeIntercityProvider.id,
          success: subRes.ok,
          httpStatus: subRes.ok ? 200 : null,
          responseTimeMs: subRes.responseTimeMs,
          errorMessage: subRes.ok ? null : subRes.errorMessage || 'Intercity bus request failed.',
          routeSummary,
        });
        if (subRes.ok) {
          apiSucceeded = true;
          combined.push(...mapTagoBusItems(subRes.items, 'intercity', origin, destination, effectiveUrls));
        } else if (subRes.errorMessage) {
          lastErrorMsg = subRes.errorMessage;
        }
      }
    }

    combined.sort((a, b) => a.departureIsoKst.localeCompare(b.departureIsoKst));

    if (apiCalled && !apiSucceeded) {
      recordTransportSearchEvent({
        mode: 'bus',
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
          lastErrorMsg ||
          'Live bus timetable data from TAGO is temporarily unavailable. Continue directly to Kobus, Bustago, or TxBus.',
        providerConfigured: true,
        totalSchedulesForDate: 0,
        filteredCount: 0,
        schedules: [],
        ...basePayload,
      };
    }

    if (apiSucceeded) {
      setCachedTransportValue(cacheKey, combined);
    }
  } else {
    apiSucceeded = true;
  }

  // Filter by bus category (General / Excellent / Premium)
  const categoryFiltered = combined.filter((item) => {
    if (input.busCategory === 'all') return true;
    return item.busGradeCategory === input.busCategory;
  });

  // Strict Asia/Seoul KST departure time filter
  const kstNow = getKstNowParts();
  const isTodayKst = input.travelDate === kstNow.dateStr;
  const preferredMinutes = timeHHmmToMinutes(input.preferredDepartureTime);

  const timeFiltered = categoryFiltered
    .filter((item) => {
      const depMins = timeHHmmToMinutes(item.departureTimeKst);
      if (input.showAllDepartures) {
        return true;
      }
      if (isTodayKst && depMins < kstNow.totalMinutes) {
        return false;
      }
      return depMins >= preferredMinutes;
    })
    .map((item) => ({
      ...item,
      passengersRequested: input.passengers,
      estimatedTotalKrw: item.fareKrw !== null ? item.fareKrw * input.passengers : null,
    }));

  const status: BusSearchResponse['status'] =
    timeFiltered.length > 0 ? 'live_results' : 'no_schedules';

  recordTransportSearchEvent({
    mode: 'bus',
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
      ? `Found ${timeFiltered.length} official bus departures from ${origin.nameEn} to ${destination.nameEn}.`
      : categoryFiltered.length > 0
      ? `No bus departures found at or after ${input.preferredDepartureTime} KST. ${categoryFiltered.length} earlier departures exist on ${input.travelDate} — toggle "View all departures" to inspect them.`
      : `No direct TAGO bus schedules returned for ${origin.nameEn} → ${destination.nameEn} on ${input.travelDate}. Check Kobus, Bustago, or TxBus directly for terminal availability.`;

  return {
    ok: true,
    status,
    message,
    providerConfigured: true,
    totalSchedulesForDate: categoryFiltered.length,
    filteredCount: timeFiltered.length,
    schedules: timeFiltered,
    ...basePayload,
  };
}
