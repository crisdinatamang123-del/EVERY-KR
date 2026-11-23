/**
 * Shared client-side types and Asia/Seoul (KST) helpers for the
 * EveryKR Smart Transportation Information & Discovery Hub.
 */

export type TransportHubMode = 'airline' | 'ktx' | 'bus';

export interface OfficialExternalBookingUrls {
  korailWebUrl: string;
  korailTalkAndroidUrl: string;
  korailTalkIosUrl: string;
  srtWebUrl: string;
  kobusWebUrl: string;
  bustagoWebUrl: string;
  txbusWebUrl: string;
  kakaoTaxiUrl: string;
}

export interface TransportAnnouncementItem {
  id: string;
  title: string;
  message: string;
  service: 'all' | 'airline' | 'ktx' | 'bus';
  severity: 'info' | 'warning';
  enabled: boolean;
  updatedAt: string;
}

export interface FeaturedRouteItem {
  id: string;
  originId: string;
  destinationId: string;
  label: string;
  enabled: boolean;
}

export interface PublicTransportHubConfig {
  services: {
    airline: { enabled: boolean };
    ktx: { enabled: boolean };
    bus: { enabled: boolean };
  };
  externalBookingUrls: OfficialExternalBookingUrls;
  announcements: TransportAnnouncementItem[];
  featuredRoutes: {
    ktx: FeaturedRouteItem[];
    bus: FeaturedRouteItem[];
  };
  providers: {
    tagoConfigured: boolean;
    tagoConnected: boolean;
    tagoProviderName: string;
  };
  activeProviders?: {
    flight: {
      id: string;
      name: string;
      adapterType: string;
      priority: number;
      environment: 'sandbox' | 'production';
      connectionHealth: string;
      credentialsConfigured: boolean;
      redirectUrl: string;
    }[];
    ktx: {
      id: string;
      name: string;
      adapterType: string;
      priority: number;
      environment: 'sandbox' | 'production';
      connectionHealth: string;
      credentialsConfigured: boolean;
      redirectUrl: string;
    }[];
    bus: {
      id: string;
      name: string;
      adapterType: string;
      priority: number;
      environment: 'sandbox' | 'production';
      connectionHealth: string;
      credentialsConfigured: boolean;
      redirectUrl: string;
    }[];
  };
  timezone: 'Asia/Seoul';
  updatedAt: string;
}

export interface KtxStationItem {
  id: string;
  code: string;
  nameEn: string;
  nameKo: string;
  cityEn: string;
  cityKo: string;
  region: string;
  operators: ('Korail' | 'SRT')[];
  lines: string[];
  popular: boolean;
  aliases: string[];
}

export interface KtxScheduleRecord {
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
  departureTimeKst: string;
  arrivalTimeKst: string | null;
  departureIsoKst: string;
  arrivalIsoKst: string | null;
  durationMinutes: number | null;
  standardFareKrw: number | null;
  firstClassFareKrw: null;
  seatAvailability: null;
  passengersRequested: number;
  estimatedTotalStandardKrw: number | null;
  bookingLinks: {
    primaryLabel: string;
    primaryUrl: string;
    secondaryLabel?: string;
    secondaryUrl?: string;
    appLinks?: { label: string; url: string }[];
  };
}

export interface KtxSearchApiResponse {
  ok: boolean;
  status: 'live_results' | 'no_schedules' | 'external_access_required' | 'provider_error' | 'service_disabled';
  message: string;
  dataSource: string;
  providerConfigured: boolean;
  lastUpdatedAt: string;
  timezone: 'Asia/Seoul';
  query: {
    origin: KtxStationItem;
    destination: KtxStationItem;
    travelDate: string;
    preferredDepartureTime: string;
    passengers: number;
    showAllDepartures: boolean;
  };
  totalSchedulesForDate: number;
  filteredCount: number;
  schedules: KtxScheduleRecord[];
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

export interface BusTerminalItem {
  id: string;
  code: string;
  nameEn: string;
  nameKo: string;
  cityEn: string;
  cityKo: string;
  region: string;
  busModes: 'express' | 'intercity' | 'both';
  bookingPlatforms: ('kobus' | 'bustago' | 'txbus')[];
  popular: boolean;
  aliases: string[];
}

export interface BusScheduleRecord {
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
  departureTimeKst: string;
  arrivalTimeKst: string | null;
  departureIsoKst: string;
  arrivalIsoKst: string | null;
  durationMinutes: number | null;
  fareKrw: number | null;
  passengersRequested: number;
  estimatedTotalKrw: number | null;
  seatAvailability: null;
  bookingLinks: {
    label: string;
    url: string;
    platform: 'kobus' | 'bustago' | 'txbus';
  }[];
}

export interface BusSearchApiResponse {
  ok: boolean;
  status: 'live_results' | 'no_schedules' | 'external_access_required' | 'provider_error' | 'service_disabled';
  message: string;
  dataSource: string;
  providerConfigured: boolean;
  lastUpdatedAt: string;
  timezone: 'Asia/Seoul';
  query: {
    origin: BusTerminalItem;
    destination: BusTerminalItem;
    travelDate: string;
    preferredDepartureTime: string;
    passengers: number;
    busType: 'all' | 'express' | 'intercity';
    busCategory: 'all' | 'general' | 'excellent' | 'premium';
    showAllDepartures: boolean;
  };
  totalSchedulesForDate: number;
  filteredCount: number;
  schedules: BusScheduleRecord[];
  officialBookingLinks: {
    kobusWebUrl: string;
    bustagoWebUrl: string;
    txbusWebUrl: string;
    recommendedPlatforms: ('kobus' | 'bustago' | 'txbus')[];
  };
  notice: string;
}

export const QUICK_DEPARTURE_TIMES = [
  { value: '00:00', label: 'Any time' },
  { value: '06:00', label: '06:00' },
  { value: '08:00', label: '08:00' },
  { value: '10:00', label: '10:00' },
  { value: '12:00', label: '12:00' },
  { value: '15:00', label: '15:00' },
  { value: '18:00', label: '18:00' },
  { value: '21:00', label: '21:00' },
];

export function getKstTodayIso(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export function getKstDateWithOffset(daysOffset: number): string {
  const today = getKstTodayIso();
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysOffset));
  return dt.toISOString().slice(0, 10);
}

export function formatKrwFare(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return 'Information unavailable';
  }
  return `₩${amount.toLocaleString('en-US')}`;
}

export function formatMinutesDuration(minutes: number | null | undefined): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    return 'Information unavailable';
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
