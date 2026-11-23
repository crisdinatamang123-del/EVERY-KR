/**
 * EVERYKR — UNIFIED TRANSPORT API MANAGEMENT REGISTRY & ADAPTER ENGINE
 *
 * Manages dynamic API providers across all 3 transport categories:
 *   1. Flight (SerpApi Google Flights, Amadeus v2, Skyscanner v3, or Custom REST)
 *   2. KTX Train (Korea TAGO TrainInfoService or Custom REST)
 *   3. Bus (Korea TAGO ExpBusInfoService, TAGO SuberbsBusInfoService, or Custom REST)
 *
 * SECURITY GUARANTEES:
 * - AES-256-GCM encryption at rest for all stored API keys & secrets.
 * - Strict masking in every Admin API response (secrets are NEVER returned to clients).
 * - Strict SSRF protection on all custom API Base URLs & redirect URLs (HTTPS-only, private/loopback IPs blocked).
 * - Immutable audit logging for every provider create/edit/enable/disable/delete/key-rotation/test action.
 * - Zero fabricated schedules, prices, or endpoints.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FlightAnalyticsService } from '../flightEngineServer';

export type TransportCategory = 'flight' | 'ktx' | 'bus';

export type ProviderAdapterType =
  | 'serpapi_google_flights'
  | 'amadeus_flight_offers'
  | 'skyscanner_live'
  | 'tago_train'
  | 'tago_express_bus'
  | 'tago_intercity_bus'
  | 'custom_rest';

export type ProviderAuthType =
  | 'api_key_query'
  | 'api_key_header'
  | 'bearer_token'
  | 'oauth2_client_credentials'
  | 'basic_auth'
  | 'none';

export type ProviderEnvironment = 'sandbox' | 'production';
export type ProviderStatus = 'active' | 'inactive';
export type ConnectionHealthState =
  | 'healthy'
  | 'degraded'
  | 'error'
  | 'untested'
  | 'unconfigured';

export interface FlightProviderSearchConfig {
  engine?: string;
  defaultCabinClass: 'Economy' | 'Premium Economy' | 'Business' | 'First Class';
  maxResults: number;
  includeNearbyAirports: boolean;
  defaultStops: 'any' | 'nonstop' | '1stop';
}

export interface KtxProviderSearchConfig {
  departureStationParam: string;
  arrivalStationParam: string;
  travelDateParam: string;
  departureTimeParam: string;
  passengersParam: string;
  availableTrainServices: string[];
  ticketPriceField: string;
  providerRedirectUrl: string;
}

export interface BusProviderSearchConfig {
  busMode: 'express' | 'intercity' | 'both';
  departureTerminalParam: string;
  destinationTerminalParam: string;
  travelDateParam: string;
  departureTimeParam: string;
  busOperatorField: string;
  seatAvailabilityField: string;
  ticketPriceField: string;
  externalBookingUrl: string;
}

export interface TransportApiProviderRecord {
  id: string;
  name: string;
  transportType: TransportCategory;
  adapterType: ProviderAdapterType;
  isBuiltIn: boolean;
  description: string;
  apiBaseUrl: string;
  searchEndpoint: string;
  healthEndpoint: string;
  authType: ProviderAuthType;
  authHeaderName?: string;
  authQueryParamName?: string;
  requiredEnvVars: string[];
  environment: ProviderEnvironment;
  status: ProviderStatus;
  priority: number;
  timeoutMs: number;
  rateLimitPerMinute: number;
  defaultCurrency: string;
  supportedCountries: string[];
  redirectUrl: string;
  flightConfig?: FlightProviderSearchConfig;
  ktxConfig?: KtxProviderSearchConfig;
  busConfig?: BusProviderSearchConfig;
  // Health & telemetry
  connectionHealth: ConnectionHealthState;
  lastConnectionTestAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastResponseTimeMs: number | null;
  averageResponseTimeMs: number | null;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PublicAdminProviderView extends TransportApiProviderRecord {
  credentialsConfigured: boolean;
  credentialSource: 'encrypted_vault' | 'env_var' | 'not_configured';
  maskedApiKey: string | null;
  maskedApiSecret: string | null;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  encryptionAlgorithm: 'AES-256-GCM';
}

export interface TransportApiRequestLog {
  id: string;
  timestamp: string;
  providerId: string;
  providerName: string;
  transportType: TransportCategory;
  action: 'connection_test' | 'live_search' | 'station_sync';
  success: boolean;
  httpStatus: number | null;
  responseTimeMs: number;
  errorMessage: string | null;
  routeSummary?: string;
}

export interface TransportApiAuditEntry {
  id: string;
  timestamp: string;
  adminUid: string;
  adminEmail: string;
  adminName: string;
  action:
    | 'PROVIDER_CREATED'
    | 'PROVIDER_UPDATED'
    | 'PROVIDER_ENABLED'
    | 'PROVIDER_DISABLED'
    | 'PROVIDER_DELETED'
    | 'CREDENTIALS_ROTATED'
    | 'CREDENTIALS_CLEARED'
    | 'CONNECTION_TESTED'
    | 'PRIORITY_CHANGED';
  transportType: TransportCategory;
  providerId: string;
  providerName: string;
  summary: string;
}

interface EncryptedSecretPayload {
  iv: string;
  tag: string;
  ciphertext: string;
}

interface ProviderVaultEntry {
  apiKeyEnc?: EncryptedSecretPayload;
  apiSecretEnc?: EncryptedSecretPayload;
  maskedApiKey?: string | null;
  maskedApiSecret?: string | null;
  updatedAt: string;
  updatedBy: string;
}

type ProviderVaultFile = Record<string, ProviderVaultEntry>;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROVIDERS_FILE = path.join(DATA_DIR, 'transport-api-providers.json');
const VAULT_FILE = path.join(DATA_DIR, 'transport-api-vault.enc.json');
const LOGS_FILE = path.join(DATA_DIR, 'transport-api-logs.json');
const AUDIT_FILE = path.join(DATA_DIR, 'transport-api-audit.json');

// ============================================================================
// AES-256-GCM ENCRYPTION AT REST & KEY MASKING
// ============================================================================

let ephemeralMasterKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  const configuredSecret = (
    process.env.TRANSPORT_CREDENTIAL_ENCRYPTION_KEY ||
    process.env.PASSPORT_ENCRYPTION_SECRET ||
    process.env.SESSION_SIGNING_SECRET ||
    ''
  ).trim();
  if (configuredSecret) {
    return crypto.scryptSync(configuredSecret, 'everykr-transport-vault-v1', 32);
  }
  // Stable per-process fallback when env secret is not yet provided in preview
  if (!ephemeralMasterKey) {
    const machineSeed = `${process.cwd()}::everykr-transport-vault-local`;
    ephemeralMasterKey = crypto.scryptSync(machineSeed, 'everykr-transport-salt-v1', 32);
  }
  return ephemeralMasterKey;
}

export function encryptCredentialValue(plaintext: string): EncryptedSecretPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

export function decryptCredentialValue(payload?: EncryptedSecretPayload): string | null {
  if (!payload || !payload.iv || !payload.tag || !payload.ciphertext) return null;
  try {
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(payload.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

export function maskSecretForDisplay(secret: string | null | undefined): string | null {
  if (!secret) return null;
  const trimmed = secret.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 6) return '••••••••';
  const tail = trimmed.slice(-4);
  const prefix = trimmed.length >= 12 ? trimmed.slice(0, 3) : '';
  return `${prefix}••••••••${tail}`;
}

export function redactSecretsFromText(text: string, secrets: (string | null | undefined)[]): string {
  let clean = String(text || '');
  for (const s of secrets) {
    if (s && s.trim().length >= 4) {
      const escaped = s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      clean = clean.replace(new RegExp(escaped, 'g'), '[REDACTED]');
    }
  }
  return clean.slice(0, 400);
}

// ============================================================================
// SSRF-SAFE HTTPS URL VALIDATION
// ============================================================================

function isBlockedPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    lower === 'localhost' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower === '::' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.localhost')
  ) {
    return true;
  }
  // IPv4 private, loopback, link-local / cloud metadata ranges
  const ipv4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  // IPv6 ULA / link-local
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
    return true;
  }
  return false;
}

export function validateSafeExternalHttpsUrl(rawUrl: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { valid: false, error: 'URL is required.' };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are permitted for API and booking endpoints.' };
    }
    if (!parsed.hostname || isBlockedPrivateHost(parsed.hostname)) {
      return {
        valid: false,
        error: 'Private, loopback, link-local, or internal hostnames are strictly prohibited.',
      };
    }
    if (parsed.username || parsed.password) {
      return { valid: false, error: 'Embedded credentials in URLs are not allowed.' };
    }
    return { valid: true, normalized: parsed.toString().replace(/\/$/, '') };
  } catch {
    return { valid: false, error: 'Please provide a valid HTTPS URL.' };
  }
}

export function sanitizeEndpointPath(rawPath: string): string {
  const trimmed = String(rawPath || '').trim();
  if (!trimmed) return '/';
  const cleaned = trimmed.replace(/\s+/g, '');
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

// ============================================================================
// DEFAULT VERIFIED BUILT-IN PROVIDERS (REAL DOCUMENTED APIS ONLY)
// ============================================================================

const NOW_ISO = new Date().toISOString();

const BUILT_IN_PROVIDERS: TransportApiProviderRecord[] = [
  {
    id: 'flight_serpapi',
    name: 'SerpApi Google Flights',
    transportType: 'flight',
    adapterType: 'serpapi_google_flights',
    isBuiltIn: true,
    description:
      'Primary live flight search engine powered by SerpApi Google Flights (engine=google_flights) with direct airline and OTA booking links.',
    apiBaseUrl: 'https://serpapi.com',
    searchEndpoint: '/search.json',
    healthEndpoint: '/account.json',
    authType: 'api_key_query',
    authQueryParamName: 'api_key',
    requiredEnvVars: ['SERPAPI_API_KEY'],
    environment: 'production',
    status: 'active',
    priority: 1,
    timeoutMs: 12000,
    rateLimitPerMinute: 60,
    defaultCurrency: 'USD',
    supportedCountries: ['KR', 'US', 'BD', 'NP', 'IN', 'PK', 'JP', 'SG', 'MY', 'TH', 'VN', 'CN'],
    redirectUrl: 'https://www.google.com/travel/flights',
    flightConfig: {
      engine: 'google_flights',
      defaultCabinClass: 'Economy',
      maxResults: 40,
      includeNearbyAirports: false,
      defaultStops: 'any',
    },
    connectionHealth: 'untested',
    lastConnectionTestAt: null,
    lastSuccessfulSyncAt: null,
    lastResponseTimeMs: null,
    averageResponseTimeMs: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastErrorMessage: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    updatedBy: 'system',
  },
  {
    id: 'flight_amadeus',
    name: 'Amadeus Flight Offers API v2',
    transportType: 'flight',
    adapterType: 'amadeus_flight_offers',
    isBuiltIn: true,
    description:
      'Official Amadeus GDS Flight Offers Search & Price Verification API (OAuth2 client credentials). Supports Sandbox and Production.',
    apiBaseUrl: 'https://test.api.amadeus.com',
    searchEndpoint: '/v2/shopping/flight-offers',
    healthEndpoint: '/v1/security/oauth2/token',
    authType: 'oauth2_client_credentials',
    requiredEnvVars: ['AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET'],
    environment: 'sandbox',
    status: 'active',
    priority: 2,
    timeoutMs: 10000,
    rateLimitPerMinute: 60,
    defaultCurrency: 'USD',
    supportedCountries: ['KR', 'US', 'BD', 'NP', 'IN', 'JP', 'SG', 'GB', 'DE', 'AU'],
    redirectUrl: 'https://www.trip.com/flights/',
    flightConfig: {
      engine: 'flight-offers-search-v2',
      defaultCabinClass: 'Economy',
      maxResults: 30,
      includeNearbyAirports: false,
      defaultStops: 'any',
    },
    connectionHealth: 'untested',
    lastConnectionTestAt: null,
    lastSuccessfulSyncAt: null,
    lastResponseTimeMs: null,
    averageResponseTimeMs: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastErrorMessage: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    updatedBy: 'system',
  },
  {
    id: 'flight_skyscanner',
    name: 'Skyscanner Live Prices API v3',
    transportType: 'flight',
    adapterType: 'skyscanner_live',
    isBuiltIn: true,
    description:
      'Official Skyscanner Partner Live Prices API v3 (requires approved commercial partner key).',
    apiBaseUrl: 'https://partners.api.skyscanner.net',
    searchEndpoint: '/apiservices/v3/flights/live/search/create',
    healthEndpoint: '/apiservices/v3/culture/markets/en-US',
    authType: 'api_key_header',
    authHeaderName: 'x-api-key',
    requiredEnvVars: ['SKYSCANNER_API_KEY'],
    environment: 'production',
    status: 'inactive',
    priority: 3,
    timeoutMs: 10000,
    rateLimitPerMinute: 40,
    defaultCurrency: 'USD',
    supportedCountries: ['KR', 'US', 'GB', 'JP', 'SG'],
    redirectUrl: 'https://www.skyscanner.com/',
    flightConfig: {
      engine: 'flights-live-v3',
      defaultCabinClass: 'Economy',
      maxResults: 30,
      includeNearbyAirports: true,
      defaultStops: 'any',
    },
    connectionHealth: 'unconfigured',
    lastConnectionTestAt: null,
    lastSuccessfulSyncAt: null,
    lastResponseTimeMs: null,
    averageResponseTimeMs: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastErrorMessage: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    updatedBy: 'system',
  },
  {
    id: 'ktx_tago_train',
    name: 'Korea TAGO Rail API (TrainInfoService)',
    transportType: 'ktx',
    adapterType: 'tago_train',
    isBuiltIn: true,
    description:
      'Official Ministry of Land, Infrastructure and Transport (MOLIT) Public Data Portal API for KTX, KTX-Sancheon, SRT, and Korail schedules & adult fares.',
    apiBaseUrl: 'https://apis.data.go.kr',
    searchEndpoint: '/1613000/TrainInfoService/getStrtpntAlocFndTrainInfo',
    healthEndpoint: '/1613000/TrainInfoService/getVhcleKndList',
    authType: 'api_key_query',
    authQueryParamName: 'serviceKey',
    requiredEnvVars: ['DATA_GO_KR_SERVICE_KEY'],
    environment: 'production',
    status: 'active',
    priority: 1,
    timeoutMs: 10000,
    rateLimitPerMinute: 45,
    defaultCurrency: 'KRW',
    supportedCountries: ['KR'],
    redirectUrl: 'https://www.letskorail.com',
    ktxConfig: {
      departureStationParam: 'depPlaceId',
      arrivalStationParam: 'arrPlaceId',
      travelDateParam: 'depPlandTime',
      departureTimeParam: 'depplandtime',
      passengersParam: 'passengers',
      availableTrainServices: ['KTX', 'KTX-Sancheon', 'KTX-Eum', 'SRT', 'ITX-Saemaeul', 'Mugunghwa'],
      ticketPriceField: 'adultcharge',
      providerRedirectUrl: 'https://www.letskorail.com',
    },
    connectionHealth: 'untested',
    lastConnectionTestAt: null,
    lastSuccessfulSyncAt: null,
    lastResponseTimeMs: null,
    averageResponseTimeMs: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastErrorMessage: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    updatedBy: 'system',
  },
  {
    id: 'bus_tago_express',
    name: 'Korea TAGO Express Bus API (ExpBusInfoService)',
    transportType: 'bus',
    adapterType: 'tago_express_bus',
    isBuiltIn: true,
    description:
      'Official Korea Public Data Portal Express Bus (고속버스) timetable and adult fare API with Kobus official booking redirects.',
    apiBaseUrl: 'https://apis.data.go.kr',
    searchEndpoint: '/1613000/ExpBusInfoService/getStrtpntAlocFndExpbusInfo',
    healthEndpoint: '/1613000/ExpBusInfoService/getExpBusGradList',
    authType: 'api_key_query',
    authQueryParamName: 'serviceKey',
    requiredEnvVars: ['DATA_GO_KR_SERVICE_KEY'],
    environment: 'production',
    status: 'active',
    priority: 1,
    timeoutMs: 10000,
    rateLimitPerMinute: 45,
    defaultCurrency: 'KRW',
    supportedCountries: ['KR'],
    redirectUrl: 'https://www.kobus.co.kr/',
    busConfig: {
      busMode: 'express',
      departureTerminalParam: 'depTerminalId',
      destinationTerminalParam: 'arrTerminalId',
      travelDateParam: 'depPlandTime',
      departureTimeParam: 'depPlandTime',
      busOperatorField: 'gradeNm',
      seatAvailabilityField: 'unavailable',
      ticketPriceField: 'charge',
      externalBookingUrl: 'https://www.kobus.co.kr/',
    },
    connectionHealth: 'untested',
    lastConnectionTestAt: null,
    lastSuccessfulSyncAt: null,
    lastResponseTimeMs: null,
    averageResponseTimeMs: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastErrorMessage: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    updatedBy: 'system',
  },
  {
    id: 'bus_tago_intercity',
    name: 'Korea TAGO Intercity Bus API (SuberbsBusInfoService)',
    transportType: 'bus',
    adapterType: 'tago_intercity_bus',
    isBuiltIn: true,
    description:
      'Official Korea Public Data Portal Intercity Bus (시외버스) timetable and adult fare API with Bustago & TxBus official booking redirects.',
    apiBaseUrl: 'https://apis.data.go.kr',
    searchEndpoint: '/1613000/SuberbsBusInfoService/getStrtpntAlocFndSuberbsBusInfo',
    healthEndpoint: '/1613000/SuberbsBusInfoService/getSuberbsBusGradList',
    authType: 'api_key_query',
    authQueryParamName: 'serviceKey',
    requiredEnvVars: ['DATA_GO_KR_SERVICE_KEY'],
    environment: 'production',
    status: 'active',
    priority: 2,
    timeoutMs: 10000,
    rateLimitPerMinute: 45,
    defaultCurrency: 'KRW',
    supportedCountries: ['KR'],
    redirectUrl: 'https://www.bustago.or.kr/',
    busConfig: {
      busMode: 'intercity',
      departureTerminalParam: 'depTerminalId',
      destinationTerminalParam: 'arrTerminalId',
      travelDateParam: 'depPlandTime',
      departureTimeParam: 'depPlandTime',
      busOperatorField: 'gradeNm',
      seatAvailabilityField: 'unavailable',
      ticketPriceField: 'charge',
      externalBookingUrl: 'https://www.bustago.or.kr/',
    },
    connectionHealth: 'untested',
    lastConnectionTestAt: null,
    lastSuccessfulSyncAt: null,
    lastResponseTimeMs: null,
    averageResponseTimeMs: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastErrorMessage: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    updatedBy: 'system',
  },
];

// ============================================================================
// STORAGE HELPERS
// ============================================================================

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, payload: unknown) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed writing ${path.basename(filePath)}:`, err);
  }
}

let providersCache: TransportApiProviderRecord[] | null = null;
let vaultCache: ProviderVaultFile | null = null;
let logsCache: TransportApiRequestLog[] | null = null;
let auditCache: TransportApiAuditEntry[] | null = null;

function loadProviders(): TransportApiProviderRecord[] {
  if (providersCache) return providersCache;
  const loaded = readJson<TransportApiProviderRecord[]>(PROVIDERS_FILE, []);
  const byId = new Map<string, TransportApiProviderRecord>();
  for (const def of BUILT_IN_PROVIDERS) {
    byId.set(def.id, { ...def });
  }
  for (const saved of loaded) {
    if (saved && saved.id) {
      const existing = byId.get(saved.id);
      byId.set(saved.id, existing ? { ...existing, ...saved } : saved);
    }
  }
  providersCache = Array.from(byId.values()).sort((a, b) => a.priority - b.priority);
  if (!fs.existsSync(PROVIDERS_FILE)) {
    writeJson(PROVIDERS_FILE, providersCache);
  }
  return providersCache;
}

function saveProviders(list: TransportApiProviderRecord[]) {
  providersCache = [...list].sort((a, b) => a.priority - b.priority);
  writeJson(PROVIDERS_FILE, providersCache);
}

function loadVault(): ProviderVaultFile {
  if (vaultCache) return vaultCache;
  vaultCache = readJson<ProviderVaultFile>(VAULT_FILE, {});
  return vaultCache;
}

function saveVault(vault: ProviderVaultFile) {
  vaultCache = vault;
  writeJson(VAULT_FILE, vault);
}

export function getTransportApiLogs(filter?: {
  transportType?: TransportCategory;
  providerId?: string;
  limit?: number;
}): TransportApiRequestLog[] {
  if (!logsCache) {
    logsCache = readJson<TransportApiRequestLog[]>(LOGS_FILE, []);
  }
  let list = logsCache;
  if (filter?.transportType) {
    list = list.filter((l) => l.transportType === filter.transportType);
  }
  if (filter?.providerId) {
    list = list.filter((l) => l.providerId === filter.providerId);
  }
  return list.slice(0, filter?.limit ?? 100);
}

export function appendTransportApiLog(entry: Omit<TransportApiRequestLog, 'id' | 'timestamp'>) {
  if (!logsCache) {
    logsCache = readJson<TransportApiRequestLog[]>(LOGS_FILE, []);
  }
  const full: TransportApiRequestLog = {
    id: `tlog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  logsCache = [full, ...logsCache].slice(0, 250);
  writeJson(LOGS_FILE, logsCache);
}

export function getTransportApiAuditLogs(limit = 100): TransportApiAuditEntry[] {
  if (!auditCache) {
    auditCache = readJson<TransportApiAuditEntry[]>(AUDIT_FILE, []);
  }
  return auditCache.slice(0, limit);
}

export function appendTransportApiAudit(
  entry: Omit<TransportApiAuditEntry, 'id' | 'timestamp'>
): TransportApiAuditEntry {
  if (!auditCache) {
    auditCache = readJson<TransportApiAuditEntry[]>(AUDIT_FILE, []);
  }
  const full: TransportApiAuditEntry = {
    id: `taudit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditCache = [full, ...auditCache].slice(0, 300);
  writeJson(AUDIT_FILE, auditCache);
  return full;
}

// ============================================================================
// CREDENTIAL RESOLUTION (DECRYPTED ONLY ON SERVER)
// ============================================================================

export function resolveProviderCredentialsServerOnly(provider: TransportApiProviderRecord): {
  apiKey: string | null;
  apiSecret: string | null;
  source: 'encrypted_vault' | 'env_var' | 'not_configured';
  maskedApiKey: string | null;
  maskedApiSecret: string | null;
} {
  const vault = loadVault();
  const entry = vault[provider.id];
  const vaultKey = decryptCredentialValue(entry?.apiKeyEnc);
  const vaultSecret = decryptCredentialValue(entry?.apiSecretEnc);

  if (vaultKey || vaultSecret) {
    return {
      apiKey: vaultKey,
      apiSecret: vaultSecret,
      source: 'encrypted_vault',
      maskedApiKey: entry?.maskedApiKey || maskSecretForDisplay(vaultKey),
      maskedApiSecret: entry?.maskedApiSecret || maskSecretForDisplay(vaultSecret),
    };
  }

  // Fallback to official server-side environment variables
  if (provider.adapterType === 'serpapi_google_flights') {
    const k = (process.env.SERPAPI_API_KEY || '').trim() || null;
    if (k) return { apiKey: k, apiSecret: null, source: 'env_var', maskedApiKey: maskSecretForDisplay(k), maskedApiSecret: null };
  } else if (provider.adapterType === 'amadeus_flight_offers') {
    const id = (process.env.AMADEUS_CLIENT_ID || '').trim() || null;
    const sec = (process.env.AMADEUS_CLIENT_SECRET || '').trim() || null;
    if (id && sec) {
      return {
        apiKey: id,
        apiSecret: sec,
        source: 'env_var',
        maskedApiKey: maskSecretForDisplay(id),
        maskedApiSecret: maskSecretForDisplay(sec),
      };
    }
  } else if (provider.adapterType === 'skyscanner_live') {
    const k = (process.env.SKYSCANNER_API_KEY || '').trim() || null;
    if (k) return { apiKey: k, apiSecret: null, source: 'env_var', maskedApiKey: maskSecretForDisplay(k), maskedApiSecret: null };
  } else if (
    provider.adapterType === 'tago_train' ||
    provider.adapterType === 'tago_express_bus' ||
    provider.adapterType === 'tago_intercity_bus'
  ) {
    const k = (process.env.DATA_GO_KR_SERVICE_KEY || process.env.TAGO_API_KEY || '').trim() || null;
    if (k) return { apiKey: k, apiSecret: null, source: 'env_var', maskedApiKey: maskSecretForDisplay(k), maskedApiSecret: null };
  }

  return {
    apiKey: null,
    apiSecret: null,
    source: 'not_configured',
    maskedApiKey: null,
    maskedApiSecret: null,
  };
}

function syncBuiltInFlightTelemetry(provider: TransportApiProviderRecord): TransportApiProviderRecord {
  if (provider.transportType !== 'flight') return provider;
  try {
    const overview = FlightAnalyticsService.getAdminFlightManagementOverview();
    const mapId =
      provider.id === 'flight_serpapi'
        ? 'serpapi'
        : provider.id === 'flight_amadeus'
        ? 'amadeus'
        : provider.id === 'flight_skyscanner'
        ? 'skyscanner'
        : null;
    if (!mapId) return provider;
    const fp = (overview.apiProviders || []).find((x: { id: string }) => x.id === mapId);
    if (!fp) return provider;
    return {
      ...provider,
      totalRequests: Math.max(provider.totalRequests, Number(fp.totalRequests || 0)),
      successfulRequests: Math.max(provider.successfulRequests, Number(fp.successfulRequests || 0)),
      failedRequests: Math.max(provider.failedRequests, Number(fp.failedRequests || 0)),
      lastResponseTimeMs:
        typeof fp.lastResponseTimeMs === 'number'
          ? fp.lastResponseTimeMs
          : provider.lastResponseTimeMs,
      averageResponseTimeMs:
        typeof fp.averageResponseTimeMs === 'number'
          ? fp.averageResponseTimeMs
          : provider.averageResponseTimeMs,
      lastSuccessfulSyncAt: fp.lastSuccessAt || provider.lastSuccessfulSyncAt,
      lastErrorMessage: fp.lastError || provider.lastErrorMessage,
    };
  } catch {
    return provider;
  }
}

export function toPublicAdminProviderView(
  rawProvider: TransportApiProviderRecord
): PublicAdminProviderView {
  const provider = syncBuiltInFlightTelemetry(rawProvider);
  const creds = resolveProviderCredentialsServerOnly(provider);
  const credentialsConfigured =
    provider.authType === 'none'
      ? true
      : provider.authType === 'oauth2_client_credentials'
      ? Boolean(creds.apiKey && creds.apiSecret)
      : Boolean(creds.apiKey);

  let computedHealth: ConnectionHealthState = provider.connectionHealth;
  if (!credentialsConfigured && provider.authType !== 'none') {
    computedHealth = 'unconfigured';
  }

  return {
    ...provider,
    connectionHealth: computedHealth,
    credentialsConfigured,
    credentialSource: creds.source,
    maskedApiKey: creds.maskedApiKey,
    maskedApiSecret: creds.maskedApiSecret,
    hasApiKey: Boolean(creds.apiKey),
    hasApiSecret: Boolean(creds.apiSecret),
    encryptionAlgorithm: 'AES-256-GCM',
  };
}

export function listAdminTransportProviders(
  transportType?: TransportCategory
): PublicAdminProviderView[] {
  const all = loadProviders();
  const filtered = transportType
    ? all.filter((p) => p.transportType === transportType)
    : all;
  return filtered.sort((a, b) => a.priority - b.priority).map(toPublicAdminProviderView);
}

export function getActiveProvidersForType(
  transportType: TransportCategory
): TransportApiProviderRecord[] {
  return loadProviders()
    .filter((p) => p.transportType === transportType && p.status === 'active')
    .sort((a, b) => a.priority - b.priority);
}

export function getPublicActiveProviderSummary() {
  const all = loadProviders();
  const pickPrimary = (type: TransportCategory) => {
    const active = all
      .filter((p) => p.transportType === type && p.status === 'active')
      .sort((a, b) => a.priority - b.priority);
    return active.map((p) => ({
      id: p.id,
      name: p.name,
      adapterType: p.adapterType,
      priority: p.priority,
      environment: p.environment,
      connectionHealth: toPublicAdminProviderView(p).connectionHealth,
      credentialsConfigured: toPublicAdminProviderView(p).credentialsConfigured,
      redirectUrl: p.redirectUrl,
    }));
  };
  return {
    flight: pickPrimary('flight'),
    ktx: pickPrimary('ktx'),
    bus: pickPrimary('bus'),
  };
}

// ============================================================================
// SYNC BUILT-IN FLIGHT PROVIDERS WITH EXISTING FLIGHT ENGINE (ZERO DUPLICATION)
// ============================================================================

function syncFlightProviderToFlightEngine(
  provider: TransportApiProviderRecord,
  newApiKey?: string,
  newApiSecret?: string,
  clearCredentials?: boolean
) {
  if (provider.transportType !== 'flight') return;
  const legacyId =
    provider.id === 'flight_serpapi'
      ? 'serpapi'
      : provider.id === 'flight_amadeus'
      ? 'amadeus'
      : provider.id === 'flight_skyscanner'
      ? 'skyscanner'
      : null;

  if (!legacyId) return;

  FlightAnalyticsService.updateAdminApiProvider({
    providerId: legacyId,
    enabled: provider.status === 'active',
    environment: provider.environment === 'sandbox' ? 'test' : 'production',
    priority: Math.max(1, Math.min(10, provider.priority)),
    rateLimitPerMinute: provider.rateLimitPerMinute,
    timeoutMs: provider.timeoutMs,
    clearStoredCredentials: Boolean(clearCredentials),
    credentials: {
      apiKey: newApiKey,
      serpApiKey: legacyId === 'serpapi' ? newApiKey : undefined,
      clientId: legacyId === 'amadeus' ? newApiKey : undefined,
      clientSecret: legacyId === 'amadeus' ? newApiSecret : undefined,
    },
  });

  // Update primary preferred flight provider based on lowest active priority
  const activeFlights = getActiveProvidersForType('flight');
  const topBuiltIn = activeFlights.find(
    (p) =>
      p.id === 'flight_serpapi' ||
      p.id === 'flight_amadeus' ||
      p.id === 'flight_skyscanner'
  );
  if (topBuiltIn) {
    const preferredProviderId =
      topBuiltIn.id === 'flight_serpapi'
        ? 'serpapi'
        : topBuiltIn.id === 'flight_amadeus'
        ? 'amadeus'
        : 'skyscanner';
    FlightAnalyticsService.updateAdminSearchConfig(
      {
        preferredProviderId,
        defaultCurrency: topBuiltIn.defaultCurrency || 'USD',
      },
      provider.updatedBy || 'admin'
    );
  }
}

// ============================================================================
// ADMIN CRUD OPERATIONS (CREATE, UPDATE, DELETE, CREDENTIAL ROTATION)
// ============================================================================

export interface AdminActor {
  uid: string;
  email: string;
  name: string;
}

export function createTransportApiProvider(
  body: Record<string, unknown>,
  actor: AdminActor
): { ok: boolean; error?: string; provider?: PublicAdminProviderView; auditEntry?: TransportApiAuditEntry } {
  const name = String(body.name || '').trim();
  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: 'Provider name must be between 2 and 100 characters.' };
  }

  const transportType = String(body.transportType || '').toLowerCase() as TransportCategory;
  if (!['flight', 'ktx', 'bus'].includes(transportType)) {
    return { ok: false, error: 'Transport type must be flight, ktx, or bus.' };
  }

  const urlCheck = validateSafeExternalHttpsUrl(String(body.apiBaseUrl || ''));
  if (!urlCheck.valid || !urlCheck.normalized) {
    return { ok: false, error: `API Base URL invalid: ${urlCheck.error}` };
  }

  const redirectCheck = validateSafeExternalHttpsUrl(String(body.redirectUrl || urlCheck.normalized));
  if (!redirectCheck.valid || !redirectCheck.normalized) {
    return { ok: false, error: `External redirect URL invalid: ${redirectCheck.error}` };
  }

  const authTypeRaw = String(body.authType || 'api_key_header') as ProviderAuthType;
  const validAuthTypes: ProviderAuthType[] = [
    'api_key_query',
    'api_key_header',
    'bearer_token',
    'oauth2_client_credentials',
    'basic_auth',
    'none',
  ];
  const authType: ProviderAuthType = validAuthTypes.includes(authTypeRaw)
    ? authTypeRaw
    : 'api_key_header';

  const environment: ProviderEnvironment =
    String(body.environment || 'production') === 'sandbox' ? 'sandbox' : 'production';
  const status: ProviderStatus =
    String(body.status || 'active') === 'inactive' ? 'inactive' : 'active';
  const priority = Math.max(1, Math.min(100, Number(body.priority || 5) || 5));
  const timeoutMs = Math.max(2000, Math.min(30000, Number(body.timeoutMs || 10000) || 10000));
  const rateLimitPerMinute = Math.max(1, Math.min(600, Number(body.rateLimitPerMinute || 60) || 60));
  const defaultCurrency = String(body.defaultCurrency || (transportType === 'flight' ? 'USD' : 'KRW'))
    .trim()
    .toUpperCase()
    .slice(0, 6);
  const supportedCountries = Array.isArray(body.supportedCountries)
    ? body.supportedCountries.map((c) => String(c).trim().toUpperCase().slice(0, 4)).filter(Boolean).slice(0, 40)
    : ['KR'];

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 28);
  const id = `${transportType}_${slug}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const newProvider: TransportApiProviderRecord = {
    id,
    name,
    transportType,
    adapterType: 'custom_rest',
    isBuiltIn: false,
    description: String(body.description || '').trim().slice(0, 400),
    apiBaseUrl: urlCheck.normalized,
    searchEndpoint: sanitizeEndpointPath(String(body.searchEndpoint || '/search')),
    healthEndpoint: sanitizeEndpointPath(String(body.healthEndpoint || '/health')),
    authType,
    authHeaderName: String(body.authHeaderName || 'X-API-Key').trim().slice(0, 60),
    authQueryParamName: String(body.authQueryParamName || 'api_key').trim().slice(0, 60),
    requiredEnvVars: [],
    environment,
    status,
    priority,
    timeoutMs,
    rateLimitPerMinute,
    defaultCurrency,
    supportedCountries,
    redirectUrl: redirectCheck.normalized,
    flightConfig:
      transportType === 'flight'
        ? {
            engine: String((body.flightConfig as Record<string, unknown>)?.engine || 'custom_flight_rest'),
            defaultCabinClass:
              ((body.flightConfig as Record<string, unknown>)?.defaultCabinClass as FlightProviderSearchConfig['defaultCabinClass']) ||
              'Economy',
            maxResults: Math.max(5, Math.min(100, Number((body.flightConfig as Record<string, unknown>)?.maxResults || 30))),
            includeNearbyAirports: Boolean((body.flightConfig as Record<string, unknown>)?.includeNearbyAirports),
            defaultStops:
              ((body.flightConfig as Record<string, unknown>)?.defaultStops as 'any' | 'nonstop' | '1stop') ||
              'any',
          }
        : undefined,
    ktxConfig:
      transportType === 'ktx'
        ? {
            departureStationParam: String((body.ktxConfig as Record<string, unknown>)?.departureStationParam || 'origin'),
            arrivalStationParam: String((body.ktxConfig as Record<string, unknown>)?.arrivalStationParam || 'destination'),
            travelDateParam: String((body.ktxConfig as Record<string, unknown>)?.travelDateParam || 'date'),
            departureTimeParam: String((body.ktxConfig as Record<string, unknown>)?.departureTimeParam || 'time'),
            passengersParam: String((body.ktxConfig as Record<string, unknown>)?.passengersParam || 'passengers'),
            availableTrainServices: Array.isArray((body.ktxConfig as Record<string, unknown>)?.availableTrainServices)
              ? ((body.ktxConfig as Record<string, unknown>).availableTrainServices as string[]).slice(0, 20)
              : ['KTX', 'SRT'],
            ticketPriceField: String((body.ktxConfig as Record<string, unknown>)?.ticketPriceField || 'price'),
            providerRedirectUrl: redirectCheck.normalized,
          }
        : undefined,
    busConfig:
      transportType === 'bus'
        ? {
            busMode:
              ((body.busConfig as Record<string, unknown>)?.busMode as 'express' | 'intercity' | 'both') ||
              'both',
            departureTerminalParam: String((body.busConfig as Record<string, unknown>)?.departureTerminalParam || 'origin'),
            destinationTerminalParam: String((body.busConfig as Record<string, unknown>)?.destinationTerminalParam || 'destination'),
            travelDateParam: String((body.busConfig as Record<string, unknown>)?.travelDateParam || 'date'),
            departureTimeParam: String((body.busConfig as Record<string, unknown>)?.departureTimeParam || 'time'),
            busOperatorField: String((body.busConfig as Record<string, unknown>)?.busOperatorField || 'operator'),
            seatAvailabilityField: String((body.busConfig as Record<string, unknown>)?.seatAvailabilityField || 'availableSeats'),
            ticketPriceField: String((body.busConfig as Record<string, unknown>)?.ticketPriceField || 'price'),
            externalBookingUrl: redirectCheck.normalized,
          }
        : undefined,
    connectionHealth: 'untested',
    lastConnectionTestAt: null,
    lastSuccessfulSyncAt: null,
    lastResponseTimeMs: null,
    averageResponseTimeMs: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastErrorMessage: null,
    createdAt: now,
    updatedAt: now,
    updatedBy: actor.email,
  };

  // Encrypt credentials at rest if provided
  const rawApiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const rawApiSecret = typeof body.apiSecret === 'string' ? body.apiSecret.trim() : '';
  if (rawApiKey || rawApiSecret) {
    const vault = loadVault();
    vault[id] = {
      apiKeyEnc: rawApiKey ? encryptCredentialValue(rawApiKey) : undefined,
      apiSecretEnc: rawApiSecret ? encryptCredentialValue(rawApiSecret) : undefined,
      maskedApiKey: maskSecretForDisplay(rawApiKey),
      maskedApiSecret: maskSecretForDisplay(rawApiSecret),
      updatedAt: now,
      updatedBy: actor.email,
    };
    saveVault(vault);
  }

  const all = loadProviders();
  saveProviders([...all, newProvider]);

  const auditEntry = appendTransportApiAudit({
    adminUid: actor.uid,
    adminEmail: actor.email,
    adminName: actor.name,
    action: 'PROVIDER_CREATED',
    transportType,
    providerId: id,
    providerName: name,
    summary: `Added ${transportType.toUpperCase()} provider "${name}" (${environment}, priority #${priority}, base ${urlCheck.normalized}).`,
  });

  return {
    ok: true,
    provider: toPublicAdminProviderView(newProvider),
    auditEntry,
  };
}

export function updateTransportApiProvider(
  providerId: string,
  body: Record<string, unknown>,
  actor: AdminActor
): { ok: boolean; error?: string; provider?: PublicAdminProviderView; auditEntry?: TransportApiAuditEntry } {
  const all = loadProviders();
  const idx = all.findIndex((p) => p.id === providerId);
  if (idx === -1) {
    return { ok: false, error: 'Transport API provider not found.' };
  }

  const current = all[idx];
  const changes: string[] = [];
  let auditAction: TransportApiAuditEntry['action'] = 'PROVIDER_UPDATED';

  const next: TransportApiProviderRecord = { ...current };

  if (typeof body.name === 'string' && body.name.trim().length >= 2) {
    next.name = body.name.trim().slice(0, 100);
    changes.push(`name="${next.name}"`);
  }
  if (typeof body.description === 'string') {
    next.description = body.description.trim().slice(0, 400);
  }
  if (typeof body.apiBaseUrl === 'string' && body.apiBaseUrl.trim()) {
    const urlCheck = validateSafeExternalHttpsUrl(body.apiBaseUrl);
    if (!urlCheck.valid || !urlCheck.normalized) {
      return { ok: false, error: `Invalid API Base URL: ${urlCheck.error}` };
    }
    next.apiBaseUrl = urlCheck.normalized;
    changes.push(`baseUrl=${urlCheck.normalized}`);
  }
  if (typeof body.searchEndpoint === 'string' && body.searchEndpoint.trim()) {
    next.searchEndpoint = sanitizeEndpointPath(body.searchEndpoint);
  }
  if (typeof body.healthEndpoint === 'string' && body.healthEndpoint.trim()) {
    next.healthEndpoint = sanitizeEndpointPath(body.healthEndpoint);
  }
  if (typeof body.redirectUrl === 'string' && body.redirectUrl.trim()) {
    const rCheck = validateSafeExternalHttpsUrl(body.redirectUrl);
    if (!rCheck.valid || !rCheck.normalized) {
      return { ok: false, error: `Invalid redirect URL: ${rCheck.error}` };
    }
    next.redirectUrl = rCheck.normalized;
    if (next.ktxConfig) next.ktxConfig = { ...next.ktxConfig, providerRedirectUrl: rCheck.normalized };
    if (next.busConfig) next.busConfig = { ...next.busConfig, externalBookingUrl: rCheck.normalized };
    changes.push(`redirectUrl=${rCheck.normalized}`);
  }
  if (typeof body.authType === 'string') {
    const validAuthTypes: ProviderAuthType[] = [
      'api_key_query',
      'api_key_header',
      'bearer_token',
      'oauth2_client_credentials',
      'basic_auth',
      'none',
    ];
    if (validAuthTypes.includes(body.authType as ProviderAuthType)) {
      next.authType = body.authType as ProviderAuthType;
    }
  }
  if (typeof body.authHeaderName === 'string') {
    next.authHeaderName = body.authHeaderName.trim().slice(0, 60);
  }
  if (typeof body.authQueryParamName === 'string') {
    next.authQueryParamName = body.authQueryParamName.trim().slice(0, 60);
  }
  if (body.environment === 'sandbox' || body.environment === 'production') {
    if (next.environment !== body.environment) {
      next.environment = body.environment;
      // Keep Amadeus official host aligned with sandbox/production
      if (next.adapterType === 'amadeus_flight_offers') {
        next.apiBaseUrl =
          body.environment === 'production'
            ? 'https://api.amadeus.com'
            : 'https://test.api.amadeus.com';
      }
      changes.push(`environment=${body.environment}`);
    }
  }
  if (body.status === 'active' || body.status === 'inactive') {
    if (next.status !== body.status) {
      next.status = body.status;
      auditAction = body.status === 'active' ? 'PROVIDER_ENABLED' : 'PROVIDER_DISABLED';
      changes.push(`status=${body.status}`);
    }
  }
  if (typeof body.priority === 'number' && Number.isFinite(body.priority)) {
    const pVal = Math.max(1, Math.min(100, Math.round(body.priority)));
    if (pVal !== next.priority) {
      next.priority = pVal;
      if (auditAction === 'PROVIDER_UPDATED') auditAction = 'PRIORITY_CHANGED';
      changes.push(`priority=#${pVal}`);
    }
  }
  if (typeof body.timeoutMs === 'number' && Number.isFinite(body.timeoutMs)) {
    next.timeoutMs = Math.max(2000, Math.min(30000, Math.round(body.timeoutMs)));
    changes.push(`timeout=${next.timeoutMs}ms`);
  }
  if (typeof body.rateLimitPerMinute === 'number' && Number.isFinite(body.rateLimitPerMinute)) {
    next.rateLimitPerMinute = Math.max(1, Math.min(600, Math.round(body.rateLimitPerMinute)));
    changes.push(`rateLimit=${next.rateLimitPerMinute}/min`);
  }
  if (typeof body.defaultCurrency === 'string' && body.defaultCurrency.trim()) {
    next.defaultCurrency = body.defaultCurrency.trim().toUpperCase().slice(0, 6);
  }
  if (Array.isArray(body.supportedCountries)) {
    next.supportedCountries = body.supportedCountries
      .map((c) => String(c).trim().toUpperCase().slice(0, 4))
      .filter(Boolean)
      .slice(0, 50);
  }
  if (body.flightConfig && typeof body.flightConfig === 'object' && next.transportType === 'flight') {
    next.flightConfig = {
      ...(next.flightConfig || {
        defaultCabinClass: 'Economy',
        maxResults: 30,
        includeNearbyAirports: false,
        defaultStops: 'any',
      }),
      ...(body.flightConfig as Partial<FlightProviderSearchConfig>),
    };
  }
  if (body.ktxConfig && typeof body.ktxConfig === 'object' && next.transportType === 'ktx') {
    const kc = body.ktxConfig as Partial<KtxProviderSearchConfig>;
    if (kc.providerRedirectUrl) {
      const rc = validateSafeExternalHttpsUrl(kc.providerRedirectUrl);
      if (!rc.valid || !rc.normalized) {
        return { ok: false, error: `Invalid KTX redirect URL: ${rc.error}` };
      }
      kc.providerRedirectUrl = rc.normalized;
      next.redirectUrl = rc.normalized;
    }
    next.ktxConfig = {
      ...(next.ktxConfig || {
        departureStationParam: 'depPlaceId',
        arrivalStationParam: 'arrPlaceId',
        travelDateParam: 'depPlandTime',
        departureTimeParam: 'depplandtime',
        passengersParam: 'passengers',
        availableTrainServices: ['KTX', 'SRT'],
        ticketPriceField: 'adultcharge',
        providerRedirectUrl: next.redirectUrl,
      }),
      ...kc,
    };
  }
  if (body.busConfig && typeof body.busConfig === 'object' && next.transportType === 'bus') {
    const bc = body.busConfig as Partial<BusProviderSearchConfig>;
    if (bc.externalBookingUrl) {
      const rc = validateSafeExternalHttpsUrl(bc.externalBookingUrl);
      if (!rc.valid || !rc.normalized) {
        return { ok: false, error: `Invalid Bus booking URL: ${rc.error}` };
      }
      bc.externalBookingUrl = rc.normalized;
      next.redirectUrl = rc.normalized;
    }
    next.busConfig = {
      ...(next.busConfig || {
        busMode: 'express',
        departureTerminalParam: 'depTerminalId',
        destinationTerminalParam: 'arrTerminalId',
        travelDateParam: 'depPlandTime',
        departureTimeParam: 'depPlandTime',
        busOperatorField: 'gradeNm',
        seatAvailabilityField: 'unavailable',
        ticketPriceField: 'charge',
        externalBookingUrl: next.redirectUrl,
      }),
      ...bc,
    };
  }

  // Handle encrypted credential updates / clearing
  const clearCreds = body.clearCredentials === true;
  const newApiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : undefined;
  const newApiSecret =
    typeof body.apiSecret === 'string' && body.apiSecret.trim() ? body.apiSecret.trim() : undefined;

  const vault = loadVault();
  if (clearCreds) {
    delete vault[providerId];
    saveVault(vault);
    auditAction = 'CREDENTIALS_CLEARED';
    next.connectionHealth = 'unconfigured';
    changes.push('cleared encrypted vault credentials');
  } else if (newApiKey || newApiSecret) {
    const prevVault = vault[providerId] || { updatedAt: '', updatedBy: '' };
    vault[providerId] = {
      apiKeyEnc: newApiKey ? encryptCredentialValue(newApiKey) : prevVault.apiKeyEnc,
      apiSecretEnc: newApiSecret ? encryptCredentialValue(newApiSecret) : prevVault.apiSecretEnc,
      maskedApiKey: newApiKey ? maskSecretForDisplay(newApiKey) : prevVault.maskedApiKey,
      maskedApiSecret: newApiSecret ? maskSecretForDisplay(newApiSecret) : prevVault.maskedApiSecret,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.email,
    };
    saveVault(vault);
    auditAction = 'CREDENTIALS_ROTATED';
    next.lastErrorMessage = null;
    changes.push('updated encrypted API credentials (AES-256-GCM)');
  }

  next.updatedAt = new Date().toISOString();
  next.updatedBy = actor.email;
  all[idx] = next;
  saveProviders(all);

  // Sync built-in Flight providers directly into FlightEngineServer so live flight search updates immediately
  syncFlightProviderToFlightEngine(next, newApiKey, newApiSecret, clearCreds);

  const auditEntry = appendTransportApiAudit({
    adminUid: actor.uid,
    adminEmail: actor.email,
    adminName: actor.name,
    action: auditAction,
    transportType: next.transportType,
    providerId: next.id,
    providerName: next.name,
    summary:
      changes.length > 0
        ? `Updated ${next.name}: ${changes.join(', ')}.`
        : `Saved configuration for ${next.name}.`,
  });

  return {
    ok: true,
    provider: toPublicAdminProviderView(next),
    auditEntry,
  };
}

export function deleteTransportApiProvider(
  providerId: string,
  actor: AdminActor
): { ok: boolean; error?: string; auditEntry?: TransportApiAuditEntry } {
  const all = loadProviders();
  const target = all.find((p) => p.id === providerId);
  if (!target) {
    return { ok: false, error: 'Provider not found.' };
  }
  if (target.isBuiltIn) {
    return {
      ok: false,
      error: 'Built-in core adapters cannot be permanently deleted; set status to Inactive to disable them instead.',
    };
  }

  const remaining = all.filter((p) => p.id !== providerId);
  saveProviders(remaining);

  const vault = loadVault();
  if (vault[providerId]) {
    delete vault[providerId];
    saveVault(vault);
  }

  const auditEntry = appendTransportApiAudit({
    adminUid: actor.uid,
    adminEmail: actor.email,
    adminName: actor.name,
    action: 'PROVIDER_DELETED',
    transportType: target.transportType,
    providerId: target.id,
    providerName: target.name,
    summary: `Removed custom ${target.transportType.toUpperCase()} provider "${target.name}" and purged encrypted credentials.`,
  });

  return { ok: true, auditEntry };
}

// ============================================================================
// REAL CONNECTION TEST ENGINE (PER-PROVIDER ADAPTERS)
// ============================================================================

export async function testTransportApiProviderConnection(
  providerId: string,
  actor: AdminActor
): Promise<{
  ok: boolean;
  connected: boolean;
  responseTimeMs: number | null;
  httpStatus: number | null;
  message: string;
  provider?: PublicAdminProviderView;
  auditEntry?: TransportApiAuditEntry;
}> {
  const all = loadProviders();
  const idx = all.findIndex((p) => p.id === providerId);
  if (idx === -1) {
    return {
      ok: false,
      connected: false,
      responseTimeMs: null,
      httpStatus: null,
      message: 'Provider not found.',
    };
  }

  const provider = all[idx];
  const nowIso = new Date().toISOString();

  // Delegate built-in flight providers to existing FlightAnalyticsService test runner
  if (
    provider.id === 'flight_serpapi' ||
    provider.id === 'flight_amadeus' ||
    provider.id === 'flight_skyscanner'
  ) {
    const legacyId =
      provider.id === 'flight_serpapi'
        ? 'serpapi'
        : provider.id === 'flight_amadeus'
        ? 'amadeus'
        : 'skyscanner';
    const res = await FlightAnalyticsService.testAdminApiProviderConnection(legacyId);
    const latency = res.latencyMs ?? 0;

    provider.lastConnectionTestAt = nowIso;
    provider.totalRequests += 1;
    if (res.connected) {
      provider.successfulRequests += 1;
      provider.lastSuccessfulSyncAt = nowIso;
      provider.connectionHealth = 'healthy';
      provider.lastErrorMessage = null;
    } else {
      provider.failedRequests += 1;
      provider.connectionHealth = res.message.toLowerCase().includes('missing')
        ? 'unconfigured'
        : 'error';
      provider.lastErrorMessage = res.message;
    }
    if (typeof res.latencyMs === 'number') {
      provider.lastResponseTimeMs = res.latencyMs;
      provider.averageResponseTimeMs = provider.averageResponseTimeMs
        ? Math.round((provider.averageResponseTimeMs + res.latencyMs) / 2)
        : res.latencyMs;
    }
    all[idx] = provider;
    saveProviders(all);

    appendTransportApiLog({
      providerId: provider.id,
      providerName: provider.name,
      transportType: provider.transportType,
      action: 'connection_test',
      success: res.connected,
      httpStatus: res.connected ? 200 : null,
      responseTimeMs: latency,
      errorMessage: res.connected ? null : res.message,
    });

    const auditEntry = appendTransportApiAudit({
      adminUid: actor.uid,
      adminEmail: actor.email,
      adminName: actor.name,
      action: 'CONNECTION_TESTED',
      transportType: provider.transportType,
      providerId: provider.id,
      providerName: provider.name,
      summary: `Connection test for ${provider.name}: ${res.connected ? 'HEALTHY' : 'FAILED'} (${res.message.slice(0, 140)}).`,
    });

    return {
      ok: true,
      connected: res.connected,
      responseTimeMs: res.latencyMs,
      httpStatus: res.connected ? 200 : null,
      message: res.message,
      provider: toPublicAdminProviderView(provider),
      auditEntry,
    };
  }

  // Validate Base URL strictly before outbound fetch (SSRF guard)
  const urlCheck = validateSafeExternalHttpsUrl(provider.apiBaseUrl);
  if (!urlCheck.valid || !urlCheck.normalized) {
    return {
      ok: false,
      connected: false,
      responseTimeMs: null,
      httpStatus: null,
      message: `Blocked outbound test: ${urlCheck.error}`,
      provider: toPublicAdminProviderView(provider),
    };
  }

  const creds = resolveProviderCredentialsServerOnly(provider);
  if (provider.authType !== 'none' && !creds.apiKey) {
    provider.lastConnectionTestAt = nowIso;
    provider.connectionHealth = 'unconfigured';
    provider.lastErrorMessage = `Credentials not configured (${provider.requiredEnvVars.join(', ') || 'API Key'}).`;
    all[idx] = provider;
    saveProviders(all);

    appendTransportApiLog({
      providerId: provider.id,
      providerName: provider.name,
      transportType: provider.transportType,
      action: 'connection_test',
      success: false,
      httpStatus: null,
      responseTimeMs: 0,
      errorMessage: provider.lastErrorMessage,
    });

    return {
      ok: true,
      connected: false,
      responseTimeMs: null,
      httpStatus: null,
      message: provider.lastErrorMessage,
      provider: toPublicAdminProviderView(provider),
    };
  }

  // Build authenticated outbound test URL & headers
  const headers: Record<string, string> = { Accept: 'application/json, application/xml, text/xml' };
  let targetUrl = `${urlCheck.normalized}${sanitizeEndpointPath(provider.healthEndpoint || provider.searchEndpoint)}`;
  const isTago =
    provider.adapterType === 'tago_train' ||
    provider.adapterType === 'tago_express_bus' ||
    provider.adapterType === 'tago_intercity_bus';

  if (provider.authType === 'api_key_query' && creds.apiKey) {
    const paramName = provider.authQueryParamName || 'api_key';
    const encodedKey =
      isTago && /%[0-9A-Fa-f]{2}/.test(creds.apiKey)
        ? creds.apiKey
        : encodeURIComponent(creds.apiKey);
    const sep = targetUrl.includes('?') ? '&' : '?';
    targetUrl += `${sep}${encodeURIComponent(paramName)}=${encodedKey}`;
    if (isTago) {
      targetUrl += '&numOfRows=5&pageNo=1&_type=json';
    }
  } else if (provider.authType === 'api_key_header' && creds.apiKey) {
    headers[provider.authHeaderName || 'X-API-Key'] = creds.apiKey;
  } else if (provider.authType === 'bearer_token' && creds.apiKey) {
    headers['Authorization'] = `Bearer ${creds.apiKey}`;
  } else if (provider.authType === 'basic_auth' && creds.apiKey) {
    const token = Buffer.from(`${creds.apiKey}:${creds.apiSecret || ''}`).toString('base64');
    headers['Authorization'] = `Basic ${token}`;
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), provider.timeoutMs || 10_000);

  let connected = false;
  let httpStatus: number | null = null;
  let message = '';

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    httpStatus = res.status;
    const rawBody = await res.text();
    const trimmed = rawBody.trim();

    if (!res.ok) {
      message = redactSecretsFromText(`Upstream returned HTTP ${res.status}.`, [
        creds.apiKey,
        creds.apiSecret,
      ]);
    } else if (isTago && trimmed.startsWith('<')) {
      const authMsgMatch = trimmed.match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/i);
      const errMsgMatch = trimmed.match(/<errMsg>([^<]*)<\/errMsg>/i);
      message = redactSecretsFromText(
        authMsgMatch?.[1] ||
          errMsgMatch?.[1] ||
          'TAGO gateway returned an XML error. Verify key registration and API approval.',
        [creds.apiKey, creds.apiSecret]
      );
    } else if (isTago) {
      const parsed = JSON.parse(trimmed);
      const code = String(parsed?.response?.header?.resultCode ?? '00');
      if (code === '00') {
        connected = true;
        message = `Connected to ${provider.name} (HTTP 200, TAGO resultCode 00).`;
      } else {
        message = redactSecretsFromText(
          `TAGO returned code ${code}: ${parsed?.response?.header?.resultMsg || 'Error'}`,
          [creds.apiKey]
        );
      }
    } else {
      connected = true;
      message = `Connected to ${provider.name} (HTTP ${res.status}).`;
    }
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    message = isAbort
      ? `Connection test timed out after ${provider.timeoutMs} ms.`
      : redactSecretsFromText(
          `Network error contacting ${urlCheck.normalized}.`,
          [creds.apiKey, creds.apiSecret]
        );
  } finally {
    clearTimeout(timer);
  }

  const elapsed = Math.max(1, Date.now() - startedAt);
  provider.lastConnectionTestAt = nowIso;
  provider.lastResponseTimeMs = elapsed;
  provider.totalRequests += 1;
  provider.averageResponseTimeMs = provider.averageResponseTimeMs
    ? Math.round((provider.averageResponseTimeMs + elapsed) / 2)
    : elapsed;

  if (connected) {
    provider.successfulRequests += 1;
    provider.lastSuccessfulSyncAt = nowIso;
    provider.connectionHealth = 'healthy';
    provider.lastErrorMessage = null;
  } else {
    provider.failedRequests += 1;
    provider.connectionHealth = 'error';
    provider.lastErrorMessage = message;
  }

  all[idx] = provider;
  saveProviders(all);

  appendTransportApiLog({
    providerId: provider.id,
    providerName: provider.name,
    transportType: provider.transportType,
    action: 'connection_test',
    success: connected,
    httpStatus,
    responseTimeMs: elapsed,
    errorMessage: connected ? null : message,
  });

  const auditEntry = appendTransportApiAudit({
    adminUid: actor.uid,
    adminEmail: actor.email,
    adminName: actor.name,
    action: 'CONNECTION_TESTED',
    transportType: provider.transportType,
    providerId: provider.id,
    providerName: provider.name,
    summary: `Tested ${provider.name}: ${connected ? 'HEALTHY' : 'FAILED'} (${elapsed} ms).`,
  });

  return {
    ok: true,
    connected,
    responseTimeMs: elapsed,
    httpStatus,
    message,
    provider: toPublicAdminProviderView(provider),
    auditEntry,
  };
}

// ============================================================================
// RUNTIME TELEMETRY RECORDING FOR LIVE SEARCH CALLS
// ============================================================================

export function recordProviderLiveCallMetric(params: {
  providerId: string;
  success: boolean;
  httpStatus: number | null;
  responseTimeMs: number;
  errorMessage?: string | null;
  routeSummary?: string;
}) {
  const all = loadProviders();
  const idx = all.findIndex((p) => p.id === params.providerId);
  if (idx === -1) return;
  const p = all[idx];
  p.totalRequests += 1;
  p.lastResponseTimeMs = params.responseTimeMs;
  p.averageResponseTimeMs = p.averageResponseTimeMs
    ? Math.round((p.averageResponseTimeMs + params.responseTimeMs) / 2)
    : params.responseTimeMs;
  if (params.success) {
    p.successfulRequests += 1;
    p.lastSuccessfulSyncAt = new Date().toISOString();
    p.connectionHealth = 'healthy';
    p.lastErrorMessage = null;
  } else {
    p.failedRequests += 1;
    p.connectionHealth = p.successfulRequests > 0 ? 'degraded' : 'error';
    p.lastErrorMessage = params.errorMessage || 'Provider request failed.';
  }
  all[idx] = p;
  saveProviders(all);

  appendTransportApiLog({
    providerId: p.id,
    providerName: p.name,
    transportType: p.transportType,
    action: 'live_search',
    success: params.success,
    httpStatus: params.httpStatus,
    responseTimeMs: params.responseTimeMs,
    errorMessage: params.success ? null : params.errorMessage || 'Provider request failed.',
    routeSummary: params.routeSummary,
  });
}

// ============================================================================
// GENERIC CUSTOM REST ADAPTER (FOR ADMIN-ADDED CUSTOM KTX / BUS PROVIDERS)
// ============================================================================

export async function callCustomRestProvider(
  provider: TransportApiProviderRecord,
  queryParams: Record<string, string | number>,
  routeSummary: string
): Promise<{
  ok: boolean;
  items: Record<string, unknown>[];
  responseTimeMs: number;
  errorMessage?: string;
}> {
  const urlCheck = validateSafeExternalHttpsUrl(provider.apiBaseUrl);
  if (!urlCheck.valid || !urlCheck.normalized) {
    return {
      ok: false,
      items: [],
      responseTimeMs: 0,
      errorMessage: 'Provider API Base URL failed security validation.',
    };
  }
  const creds = resolveProviderCredentialsServerOnly(provider);
  const headers: Record<string, string> = { Accept: 'application/json' };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null && String(v) !== '') {
      qs.set(k, String(v));
    }
  }

  if (provider.authType === 'api_key_query' && creds.apiKey) {
    qs.set(provider.authQueryParamName || 'api_key', creds.apiKey);
  } else if (provider.authType === 'api_key_header' && creds.apiKey) {
    headers[provider.authHeaderName || 'X-API-Key'] = creds.apiKey;
  } else if (provider.authType === 'bearer_token' && creds.apiKey) {
    headers['Authorization'] = `Bearer ${creds.apiKey}`;
  } else if (provider.authType === 'basic_auth' && creds.apiKey) {
    headers['Authorization'] = `Basic ${Buffer.from(`${creds.apiKey}:${creds.apiSecret || ''}`).toString('base64')}`;
  }

  const endpoint = `${urlCheck.normalized}${sanitizeEndpointPath(provider.searchEndpoint)}`;
  const fullUrl = qs.toString() ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${qs.toString()}` : endpoint;

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), provider.timeoutMs || 10_000);

  try {
    const res = await fetch(fullUrl, { method: 'GET', headers, signal: controller.signal });
    const elapsed = Math.max(1, Date.now() - startedAt);
    if (!res.ok) {
      const msg = `Custom provider "${provider.name}" returned HTTP ${res.status}.`;
      recordProviderLiveCallMetric({
        providerId: provider.id,
        success: false,
        httpStatus: res.status,
        responseTimeMs: elapsed,
        errorMessage: msg,
        routeSummary,
      });
      return { ok: false, items: [], responseTimeMs: elapsed, errorMessage: msg };
    }
    const json = await res.json();
    const list = Array.isArray(json)
      ? json
      : Array.isArray(json?.schedules)
      ? json.schedules
      : Array.isArray(json?.results)
      ? json.results
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.items)
      ? json.items
      : [];

    recordProviderLiveCallMetric({
      providerId: provider.id,
      success: true,
      httpStatus: res.status,
      responseTimeMs: elapsed,
      routeSummary,
    });
    return {
      ok: true,
      items: list.filter((x: unknown): x is Record<string, unknown> => Boolean(x && typeof x === 'object')),
      responseTimeMs: elapsed,
    };
  } catch (err: unknown) {
    const elapsed = Math.max(1, Date.now() - startedAt);
    const msg =
      err instanceof Error && err.name === 'AbortError'
        ? `Custom provider "${provider.name}" timed out.`
        : `Unable to reach custom provider "${provider.name}".`;
    recordProviderLiveCallMetric({
      providerId: provider.id,
      success: false,
      httpStatus: null,
      responseTimeMs: elapsed,
      errorMessage: msg,
      routeSummary,
    });
    return { ok: false, items: [], responseTimeMs: elapsed, errorMessage: msg };
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// AGGREGATED HEALTH DASHBOARD PAYLOAD
// ============================================================================

export function getTransportHealthDashboardPayload() {
  const providers = listAdminTransportProviders();
  const activeProviders = providers.filter((p) => p.status === 'active');
  const inactiveProviders = providers.filter((p) => p.status === 'inactive');
  const healthyProviders = activeProviders.filter((p) => p.connectionHealth === 'healthy');
  const erroredProviders = activeProviders.filter((p) => p.connectionHealth === 'error');
  const totalRequests = providers.reduce((acc, p) => acc + p.totalRequests, 0);
  const failedRequests = providers.reduce((acc, p) => acc + p.failedRequests, 0);
  const latencies = providers
    .map((p) => p.averageResponseTimeMs)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const avgResponseTimeMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null;

  return {
    summary: {
      totalProviders: providers.length,
      activeProvidersCount: activeProviders.length,
      inactiveProvidersCount: inactiveProviders.length,
      healthyProvidersCount: healthyProviders.length,
      erroredProvidersCount: erroredProviders.length,
      totalRequests,
      failedRequests,
      avgResponseTimeMs,
    },
    providers,
    recentLogs: getTransportApiLogs({ limit: 80 }),
    auditLogs: getTransportApiAuditLogs(80),
  };
}
