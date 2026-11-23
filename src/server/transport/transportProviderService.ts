/**
 * Server-side Transport Hub Configuration, TAGO Open API (data.go.kr) Client,
 * Caching, Rate Limiting, Health Check, and Search Analytics.
 *
 * SECURITY:
 * - DATA_GO_KR_SERVICE_KEY / TAGO_API_KEY is strictly server-side (process.env or local server vault).
 * - Never returned in API responses, error messages, logs, or public Firestore documents.
 */

import fs from 'fs';
import path from 'path';
import {
  BusTerminalRecord,
  DEFAULT_OFFICIAL_BOOKING_URLS,
  KtxStationRecord,
  OfficialExternalBookingUrls,
  VERIFIED_BUS_TERMINALS,
  VERIFIED_KTX_STATIONS,
} from './transportCatalog';
import { getPublicActiveProviderSummary } from './transportApiRegistry';

export interface TransportAnnouncement {
  id: string;
  title: string;
  message: string;
  service: 'all' | 'airline' | 'ktx' | 'bus';
  severity: 'info' | 'warning';
  enabled: boolean;
  updatedAt: string;
}

export interface FeaturedTransportRoute {
  id: string;
  originId: string;
  destinationId: string;
  label: string;
  enabled: boolean;
}

export interface TransportHubConfig {
  services: {
    airline: { enabled: boolean };
    ktx: { enabled: boolean };
    bus: { enabled: boolean };
  };
  externalBookingUrls: OfficialExternalBookingUrls;
  announcements: TransportAnnouncement[];
  featuredRoutes: {
    ktx: FeaturedTransportRoute[];
    bus: FeaturedTransportRoute[];
  };
  customStations: KtxStationRecord[];
  customTerminals: BusTerminalRecord[];
  cacheTtlSeconds: number;
  rateLimitPerIpPerMinute: number;
  updatedAt: string;
  updatedBy: string;
}

export interface TransportModeAnalytics {
  totalSearches: number;
  totalApiRequests: number;
  successfulApiRequests: number;
  failedApiRequests: number;
  lastResponseTimeMs: number | null;
  averageResponseTimeMs: number | null;
  routeCounts: Record<string, number>;
  recentSearches: {
    id: string;
    timestamp: string;
    mode: 'ktx' | 'bus';
    originName: string;
    destinationName: string;
    travelDate: string;
    preferredDepartureTime: string;
    passengers: number;
    resultsCount: number;
    status: string;
  }[];
}

interface TransportAnalyticsStore {
  ktx: TransportModeAnalytics;
  bus: TransportModeAnalytics;
  lastTagoHealthCheck: {
    checkedAt: string | null;
    connected: boolean;
    statusCode: string;
    responseTimeMs: number | null;
    message: string;
  };
}

interface TransportSecretsVault {
  dataGoKrServiceKey?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'transport-hub-config.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'transport-hub-analytics.json');
const SECRETS_FILE = path.join(DATA_DIR, 'transport-hub-secrets.json');

const DEFAULT_CONFIG: TransportHubConfig = {
  services: {
    airline: { enabled: true },
    ktx: { enabled: true },
    bus: { enabled: true },
  },
  externalBookingUrls: { ...DEFAULT_OFFICIAL_BOOKING_URLS },
  announcements: [
    {
      id: 'transport_external_booking_notice',
      title: 'Official External Booking Notice',
      message:
        'EveryKR compares official schedules and fare information across Airlines, KTX/SRT, and Express/Intercity Buses. Ticket purchase, seat selection, and payment are always completed on the official operator website or app.',
      service: 'all',
      severity: 'info',
      enabled: true,
      updatedAt: new Date().toISOString(),
    },
  ],
  featuredRoutes: {
    ktx: [
      { id: 'ktx_sel_bsn', originId: 'seoul', destinationId: 'busan', label: 'Seoul → Busan', enabled: true },
      { id: 'ktx_sel_ddg', originId: 'seoul', destinationId: 'dongdaegu', label: 'Seoul → Daegu (Dongdaegu)', enabled: true },
      { id: 'ktx_sel_djn', originId: 'seoul', destinationId: 'daejeon', label: 'Seoul → Daejeon', enabled: true },
      { id: 'ktx_ysn_gwj', originId: 'yongsan', destinationId: 'gwangju_songjeong', label: 'Yongsan → Gwangju-Songjeong', enabled: true },
      { id: 'ktx_sel_gng', originId: 'seoul', destinationId: 'gangneung', label: 'Seoul → Gangneung', enabled: true },
      { id: 'ktx_ssr_bsn', originId: 'suseo', destinationId: 'busan', label: 'Suseo (SRT) → Busan', enabled: true },
    ],
    bus: [
      { id: 'bus_sgb_bsn', originId: 'seoul_gyeongbu', destinationId: 'busan_central', label: 'Seoul Express → Busan Central', enabled: true },
      { id: 'bus_ccs_gwj', originId: 'central_city_seoul', destinationId: 'gwangju_usquare', label: 'Central City → Gwangju', enabled: true },
      { id: 'bus_sgb_djn', originId: 'seoul_gyeongbu', destinationId: 'daejeon_complex', label: 'Seoul Express → Daejeon', enabled: true },
      { id: 'bus_sgb_dgu', originId: 'seoul_gyeongbu', destinationId: 'daegu_dongdaegu', label: 'Seoul Express → Dongdaegu', enabled: true },
      { id: 'bus_ccs_jnj', originId: 'central_city_seoul', destinationId: 'jeonju_terminal', label: 'Central City → Jeonju', enabled: true },
      { id: 'bus_dsl_gng', originId: 'dong_seoul', destinationId: 'gangneung_terminal', label: 'Dong Seoul → Gangneung', enabled: true },
    ],
  },
  customStations: [],
  customTerminals: [],
  cacheTtlSeconds: 300,
  rateLimitPerIpPerMinute: 35,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

function createEmptyModeAnalytics(): TransportModeAnalytics {
  return {
    totalSearches: 0,
    totalApiRequests: 0,
    successfulApiRequests: 0,
    failedApiRequests: 0,
    lastResponseTimeMs: null,
    averageResponseTimeMs: null,
    routeCounts: {},
    recentSearches: [],
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Transport storage write failed for ${path.basename(filePath)}:`, err);
  }
}

function sanitizeHttpsUrl(candidate: unknown, fallback: string): string {
  if (typeof candidate !== 'string') return fallback;
  const trimmed = candidate.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

// In-memory state + caches
let cachedConfig: TransportHubConfig | null = null;
let cachedAnalytics: TransportAnalyticsStore | null = null;
const responseCache = new Map<string, { expiresAt: number; value: unknown }>();
const ipRateLimitMap = new Map<string, { windowStart: number; count: number }>();

export function getTransportHubConfig(): TransportHubConfig {
  if (cachedConfig) return cachedConfig;
  const loaded = readJsonFile<Partial<TransportHubConfig>>(CONFIG_FILE, {});
  cachedConfig = {
    ...DEFAULT_CONFIG,
    ...loaded,
    services: {
      airline: { enabled: loaded.services?.airline?.enabled ?? true },
      ktx: { enabled: loaded.services?.ktx?.enabled ?? true },
      bus: { enabled: loaded.services?.bus?.enabled ?? true },
    },
    externalBookingUrls: {
      ...DEFAULT_OFFICIAL_BOOKING_URLS,
      ...(loaded.externalBookingUrls || {}),
    },
    announcements: Array.isArray(loaded.announcements)
      ? loaded.announcements
      : DEFAULT_CONFIG.announcements,
    featuredRoutes: {
      ktx: Array.isArray(loaded.featuredRoutes?.ktx)
        ? loaded.featuredRoutes!.ktx
        : DEFAULT_CONFIG.featuredRoutes.ktx,
      bus: Array.isArray(loaded.featuredRoutes?.bus)
        ? loaded.featuredRoutes!.bus
        : DEFAULT_CONFIG.featuredRoutes.bus,
    },
    customStations: Array.isArray(loaded.customStations) ? loaded.customStations : [],
    customTerminals: Array.isArray(loaded.customTerminals) ? loaded.customTerminals : [],
    cacheTtlSeconds:
      typeof loaded.cacheTtlSeconds === 'number' && loaded.cacheTtlSeconds >= 30
        ? Math.min(3600, loaded.cacheTtlSeconds)
        : 300,
    rateLimitPerIpPerMinute:
      typeof loaded.rateLimitPerIpPerMinute === 'number' && loaded.rateLimitPerIpPerMinute >= 5
        ? Math.min(300, loaded.rateLimitPerIpPerMinute)
        : 35,
  };
  return cachedConfig;
}

export function updateTransportHubConfig(
  patch: Partial<TransportHubConfig>,
  updatedBy: string
): TransportHubConfig {
  const current = getTransportHubConfig();
  const nextUrls: OfficialExternalBookingUrls = {
    korailWebUrl: sanitizeHttpsUrl(
      patch.externalBookingUrls?.korailWebUrl,
      current.externalBookingUrls.korailWebUrl
    ),
    korailTalkAndroidUrl: sanitizeHttpsUrl(
      patch.externalBookingUrls?.korailTalkAndroidUrl,
      current.externalBookingUrls.korailTalkAndroidUrl
    ),
    korailTalkIosUrl: sanitizeHttpsUrl(
      patch.externalBookingUrls?.korailTalkIosUrl,
      current.externalBookingUrls.korailTalkIosUrl
    ),
    srtWebUrl: sanitizeHttpsUrl(
      patch.externalBookingUrls?.srtWebUrl,
      current.externalBookingUrls.srtWebUrl
    ),
    kobusWebUrl: sanitizeHttpsUrl(
      patch.externalBookingUrls?.kobusWebUrl,
      current.externalBookingUrls.kobusWebUrl
    ),
    bustagoWebUrl: sanitizeHttpsUrl(
      patch.externalBookingUrls?.bustagoWebUrl,
      current.externalBookingUrls.bustagoWebUrl
    ),
    txbusWebUrl: sanitizeHttpsUrl(
      patch.externalBookingUrls?.txbusWebUrl,
      current.externalBookingUrls.txbusWebUrl
    ),
    kakaoTaxiUrl: sanitizeHttpsUrl(
      patch.externalBookingUrls?.kakaoTaxiUrl,
      current.externalBookingUrls.kakaoTaxiUrl
    ),
  };

  const nextConfig: TransportHubConfig = {
    ...current,
    services: {
      airline: {
        enabled:
          typeof patch.services?.airline?.enabled === 'boolean'
            ? patch.services.airline.enabled
            : current.services.airline.enabled,
      },
      ktx: {
        enabled:
          typeof patch.services?.ktx?.enabled === 'boolean'
            ? patch.services.ktx.enabled
            : current.services.ktx.enabled,
      },
      bus: {
        enabled:
          typeof patch.services?.bus?.enabled === 'boolean'
            ? patch.services.bus.enabled
            : current.services.bus.enabled,
      },
    },
    externalBookingUrls: nextUrls,
    announcements: Array.isArray(patch.announcements)
      ? patch.announcements.slice(0, 20).map((a, idx) => ({
          id: String(a.id || `ann_${Date.now()}_${idx}`).slice(0, 80),
          title: String(a.title || '').trim().slice(0, 120),
          message: String(a.message || '').trim().slice(0, 500),
          service:
            a.service === 'airline' || a.service === 'ktx' || a.service === 'bus'
              ? a.service
              : 'all',
          severity: a.severity === 'warning' ? 'warning' : 'info',
          enabled: Boolean(a.enabled),
          updatedAt: new Date().toISOString(),
        }))
      : current.announcements,
    featuredRoutes: {
      ktx: Array.isArray(patch.featuredRoutes?.ktx)
        ? patch.featuredRoutes!.ktx.slice(0, 20)
        : current.featuredRoutes.ktx,
      bus: Array.isArray(patch.featuredRoutes?.bus)
        ? patch.featuredRoutes!.bus.slice(0, 20)
        : current.featuredRoutes.bus,
    },
    customStations: Array.isArray(patch.customStations)
      ? patch.customStations.slice(0, 60)
      : current.customStations,
    customTerminals: Array.isArray(patch.customTerminals)
      ? patch.customTerminals.slice(0, 60)
      : current.customTerminals,
    cacheTtlSeconds:
      typeof patch.cacheTtlSeconds === 'number'
        ? Math.max(30, Math.min(3600, Math.round(patch.cacheTtlSeconds)))
        : current.cacheTtlSeconds,
    rateLimitPerIpPerMinute:
      typeof patch.rateLimitPerIpPerMinute === 'number'
        ? Math.max(5, Math.min(300, Math.round(patch.rateLimitPerIpPerMinute)))
        : current.rateLimitPerIpPerMinute,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  cachedConfig = nextConfig;
  writeJsonFile(CONFIG_FILE, nextConfig);
  return nextConfig;
}

export function getAllKtxStations(): KtxStationRecord[] {
  const cfg = getTransportHubConfig();
  const seen = new Set(VERIFIED_KTX_STATIONS.map((s) => s.id));
  const extra = (cfg.customStations || []).filter((s) => s && s.id && !seen.has(s.id));
  return [...VERIFIED_KTX_STATIONS, ...extra];
}

export function getAllBusTerminals(): BusTerminalRecord[] {
  const cfg = getTransportHubConfig();
  const seen = new Set(VERIFIED_BUS_TERMINALS.map((t) => t.id));
  const extra = (cfg.customTerminals || []).filter((t) => t && t.id && !seen.has(t.id));
  return [...VERIFIED_BUS_TERMINALS, ...extra];
}

// ============================================================================
// SERVER-SIDE TAGO OPEN API CREDENTIAL HANDLING (STRICTLY SERVER-ONLY)
// ============================================================================

export function resolveTagoServiceKey(): {
  key: string | null;
  source: 'env_var' | 'server_vault' | 'not_configured';
} {
  const envKey = (process.env.DATA_GO_KR_SERVICE_KEY || process.env.TAGO_API_KEY || '').trim();
  if (envKey) {
    return { key: envKey, source: 'env_var' };
  }
  const vault = readJsonFile<TransportSecretsVault>(SECRETS_FILE, {});
  const vaultKey = (vault.dataGoKrServiceKey || '').trim();
  if (vaultKey) {
    return { key: vaultKey, source: 'server_vault' };
  }
  return { key: null, source: 'not_configured' };
}

export function saveTagoServiceKeyToServerVault(
  apiKey: string | null,
  updatedBy: string
): { configured: boolean; source: 'env_var' | 'server_vault' | 'not_configured' } {
  if (apiKey === null) {
    writeJsonFile(SECRETS_FILE, {
      dataGoKrServiceKey: '',
      updatedAt: new Date().toISOString(),
      updatedBy,
    });
  } else {
    writeJsonFile(SECRETS_FILE, {
      dataGoKrServiceKey: apiKey.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy,
    });
  }
  responseCache.clear();
  const resolved = resolveTagoServiceKey();
  return { configured: Boolean(resolved.key), source: resolved.source };
}

export function getTagoProviderPublicStatus() {
  const resolved = resolveTagoServiceKey();
  const analytics = getTransportAnalytics();
  return {
    providerId: 'tago_data_go_kr',
    providerName: 'Korea Public Data Portal (TAGO Open API)',
    requiredEnvKey: 'DATA_GO_KR_SERVICE_KEY',
    configured: Boolean(resolved.key),
    credentialSource: resolved.source,
    connected: Boolean(resolved.key) && analytics.lastTagoHealthCheck.connected,
    lastHealthCheck: analytics.lastTagoHealthCheck,
    servicesCovered: [
      'TrainInfoService (KTX / KTX-Sancheon / SRT)',
      'ExpBusInfoService (Express Bus / 고속버스)',
      'SuberbsBusInfoService (Intercity Bus / 시외버스)',
    ],
  };
}

// ============================================================================
// CACHE & RATE LIMITING
// ============================================================================

export function getCachedTransportValue<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedTransportValue(key: string, value: unknown, ttlSeconds?: number) {
  const cfg = getTransportHubConfig();
  const ttl = (ttlSeconds ?? cfg.cacheTtlSeconds) * 1000;
  responseCache.set(key, {
    expiresAt: Date.now() + ttl,
    value,
  });
  // Bound cache size cleanly
  if (responseCache.size > 400) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
}

export function checkTransportRateLimit(clientIp: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const cfg = getTransportHubConfig();
  const limit = cfg.rateLimitPerIpPerMinute;
  const now = Date.now();
  const windowMs = 60_000;
  const existing = ipRateLimitMap.get(clientIp);
  if (!existing || now - existing.windowStart > windowMs) {
    ipRateLimitMap.set(clientIp, { windowStart: now, count: 1 });
    return { allowed: true };
  }
  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.windowStart + windowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  existing.count += 1;
  return { allowed: true };
}

// ============================================================================
// TAGO HTTP CLIENT (SAFE KEY ENCODING, TIMEOUT, JSON/XML ERROR HANDLING)
// ============================================================================

export interface TagoFetchResult {
  ok: boolean;
  items: Record<string, unknown>[];
  totalCount: number;
  responseTimeMs: number;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Formats data.go.kr serviceKey cleanly without double-encoding keys that are already URL-encoded.
 */
function buildTagoUrl(baseUrl: string, params: Record<string, string | number>, serviceKey: string): string {
  const encodedServiceKey = /%[0-9A-Fa-f]{2}/.test(serviceKey)
    ? serviceKey
    : encodeURIComponent(serviceKey);

  const searchParts: string[] = [`serviceKey=${encodedServiceKey}`];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== '') {
      searchParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  searchParts.push('_type=json');
  return `${baseUrl}?${searchParts.join('&')}`;
}

function extractXmlTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

export async function callTagoOpenApi(
  endpointUrl: string,
  params: Record<string, string | number>,
  timeoutMs = 10_000,
  overrideServiceKey?: string | null
): Promise<TagoFetchResult> {
  const key = (overrideServiceKey || '').trim() || resolveTagoServiceKey().key;
  if (!key) {
    return {
      ok: false,
      items: [],
      totalCount: 0,
      responseTimeMs: 0,
      errorCode: 'EXTERNAL_ACCESS_REQUIRED',
      errorMessage: 'DATA_GO_KR_SERVICE_KEY is not configured on the server.',
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fullUrl = buildTagoUrl(endpointUrl, params, key);
    const res = await fetch(fullUrl, {
      method: 'GET',
      headers: { Accept: 'application/json, application/xml, text/xml' },
      signal: controller.signal,
    });
    const elapsed = Date.now() - startedAt;
    const rawText = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        items: [],
        totalCount: 0,
        responseTimeMs: elapsed,
        errorCode: `HTTP_${res.status}`,
        errorMessage: `TAGO Open API returned HTTP ${res.status}.`,
      };
    }

    const trimmed = rawText.trim();
    if (trimmed.startsWith('<')) {
      // data.go.kr often returns XML for gateway/key errors even when _type=json is requested
      const returnAuthMsg = extractXmlTag(trimmed, 'returnAuthMsg');
      const errMsg = extractXmlTag(trimmed, 'errMsg');
      const reasonCode = extractXmlTag(trimmed, 'returnReasonCode') || 'XML_GATEWAY_ERROR';
      return {
        ok: false,
        items: [],
        totalCount: 0,
        responseTimeMs: elapsed,
        errorCode: reasonCode,
        errorMessage:
          returnAuthMsg ||
          errMsg ||
          'TAGO Open API returned an XML gateway response. Verify DATA_GO_KR_SERVICE_KEY approval.',
      };
    }

    const parsed = JSON.parse(trimmed);
    const header = parsed?.response?.header;
    const resultCode = String(header?.resultCode ?? '00');
    if (resultCode !== '00') {
      return {
        ok: false,
        items: [],
        totalCount: 0,
        responseTimeMs: elapsed,
        errorCode: resultCode,
        errorMessage: String(header?.resultMsg || 'TAGO Open API returned an error.'),
      };
    }

    const body = parsed?.response?.body || {};
    const totalCount = Number(body.totalCount || 0);
    const rawItems = body?.items?.item;
    const items: Record<string, unknown>[] = Array.isArray(rawItems)
      ? rawItems
      : rawItems && typeof rawItems === 'object'
      ? [rawItems]
      : [];

    return {
      ok: true,
      items,
      totalCount: Number.isFinite(totalCount) ? totalCount : items.length,
      responseTimeMs: elapsed,
    };
  } catch (err: unknown) {
    const elapsed = Date.now() - startedAt;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      items: [],
      totalCount: 0,
      responseTimeMs: elapsed,
      errorCode: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
      errorMessage: isAbort
        ? 'TAGO Open API request timed out.'
        : 'Unable to reach Korea Public Data Portal (apis.data.go.kr).',
    };
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// ANALYTICS & HEALTH TEST
// ============================================================================

export function getTransportAnalytics(): TransportAnalyticsStore {
  if (cachedAnalytics) return cachedAnalytics;
  const loaded = readJsonFile<Partial<TransportAnalyticsStore>>(ANALYTICS_FILE, {});
  cachedAnalytics = {
    ktx: { ...createEmptyModeAnalytics(), ...(loaded.ktx || {}) },
    bus: { ...createEmptyModeAnalytics(), ...(loaded.bus || {}) },
    lastTagoHealthCheck: loaded.lastTagoHealthCheck || {
      checkedAt: null,
      connected: false,
      statusCode: 'NOT_TESTED',
      responseTimeMs: null,
      message: 'Connectivity test has not been executed yet.',
    },
  };
  return cachedAnalytics;
}

export function recordTransportSearchEvent(event: {
  mode: 'ktx' | 'bus';
  originName: string;
  destinationName: string;
  travelDate: string;
  preferredDepartureTime: string;
  passengers: number;
  resultsCount: number;
  status: string;
  apiCalled: boolean;
  apiSucceeded: boolean;
  responseTimeMs?: number;
}) {
  const store = getTransportAnalytics();
  const bucket = store[event.mode];
  bucket.totalSearches += 1;
  if (event.apiCalled) {
    bucket.totalApiRequests += 1;
    if (event.apiSucceeded) {
      bucket.successfulApiRequests += 1;
    } else {
      bucket.failedApiRequests += 1;
    }
    if (typeof event.responseTimeMs === 'number' && event.responseTimeMs >= 0) {
      bucket.lastResponseTimeMs = event.responseTimeMs;
      const prevAvg = bucket.averageResponseTimeMs ?? event.responseTimeMs;
      bucket.averageResponseTimeMs = Math.round(
        (prevAvg * Math.max(0, bucket.totalApiRequests - 1) + event.responseTimeMs) /
          bucket.totalApiRequests
      );
    }
  }

  const routeKey = `${event.originName} → ${event.destinationName}`;
  bucket.routeCounts[routeKey] = (bucket.routeCounts[routeKey] || 0) + 1;
  bucket.recentSearches = [
    {
      id: `${event.mode}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      mode: event.mode,
      originName: event.originName,
      destinationName: event.destinationName,
      travelDate: event.travelDate,
      preferredDepartureTime: event.preferredDepartureTime,
      passengers: event.passengers,
      resultsCount: event.resultsCount,
      status: event.status,
    },
    ...bucket.recentSearches,
  ].slice(0, 40);

  writeJsonFile(ANALYTICS_FILE, store);
}

export async function testTagoProviderConnection() {
  const store = getTransportAnalytics();
  const resolved = resolveTagoServiceKey();
  if (!resolved.key) {
    const result = {
      checkedAt: new Date().toISOString(),
      connected: false,
      statusCode: 'MISSING_KEY',
      responseTimeMs: null,
      message:
        'DATA_GO_KR_SERVICE_KEY is not configured. Configure your Korea Public Data Portal (data.go.kr) TAGO service key in server environment variables or server vault.',
    };
    store.lastTagoHealthCheck = result;
    writeJsonFile(ANALYTICS_FILE, store);
    return result;
  }

  const probe = await callTagoOpenApi(
    'https://apis.data.go.kr/1613000/TrainInfoService/getVhcleKndList',
    { numOfRows: 10, pageNo: 1 },
    9000
  );

  const result = probe.ok
    ? {
        checkedAt: new Date().toISOString(),
        connected: true,
        statusCode: 'CONNECTED',
        responseTimeMs: probe.responseTimeMs,
        message: `Connected to TAGO Open API (apis.data.go.kr). Retrieved ${probe.items.length} official train vehicle classes in ${probe.responseTimeMs} ms.`,
      }
    : {
        checkedAt: new Date().toISOString(),
        connected: false,
        statusCode: probe.errorCode || 'ERROR',
        responseTimeMs: probe.responseTimeMs,
        message: probe.errorMessage || 'Failed to connect to TAGO Open API.',
      };

  store.lastTagoHealthCheck = result;
  writeJsonFile(ANALYTICS_FILE, store);
  return result;
}

export function getPublicTransportHubPayload() {
  const cfg = getTransportHubConfig();
  const tagoStatus = getTagoProviderPublicStatus();
  const activeProviders = getPublicActiveProviderSummary();
  return {
    services: cfg.services,
    externalBookingUrls: cfg.externalBookingUrls,
    announcements: cfg.announcements.filter((a) => a.enabled),
    featuredRoutes: {
      ktx: cfg.featuredRoutes.ktx.filter((r) => r.enabled),
      bus: cfg.featuredRoutes.bus.filter((r) => r.enabled),
    },
    providers: {
      tagoConfigured:
        tagoStatus.configured ||
        activeProviders.ktx.some((p) => p.credentialsConfigured) ||
        activeProviders.bus.some((p) => p.credentialsConfigured),
      tagoConnected:
        tagoStatus.connected ||
        activeProviders.ktx.some((p) => p.connectionHealth === 'healthy') ||
        activeProviders.bus.some((p) => p.connectionHealth === 'healthy'),
      tagoProviderName:
        activeProviders.ktx[0]?.name || tagoStatus.providerName,
    },
    activeProviders,
    timezone: 'Asia/Seoul',
    updatedAt: cfg.updatedAt,
  };
}
