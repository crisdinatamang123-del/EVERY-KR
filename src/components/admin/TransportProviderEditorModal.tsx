import React, { useState } from 'react';
import {
  AlertCircle,
  Bus,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  Plane,
  Save,
  ShieldCheck,
  Sliders,
  TrainFront,
  Trash2,
  X,
} from 'lucide-react';

export type TransportCategory = 'flight' | 'ktx' | 'bus';
export type ProviderAuthType =
  | 'api_key_query'
  | 'api_key_header'
  | 'bearer_token'
  | 'oauth2_client_credentials'
  | 'basic_auth'
  | 'none';

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

export interface AdminTransportProviderView {
  id: string;
  name: string;
  transportType: TransportCategory;
  adapterType: string;
  isBuiltIn: boolean;
  description: string;
  apiBaseUrl: string;
  searchEndpoint: string;
  healthEndpoint: string;
  authType: ProviderAuthType;
  authHeaderName?: string;
  authQueryParamName?: string;
  requiredEnvVars: string[];
  environment: 'sandbox' | 'production';
  status: 'active' | 'inactive';
  priority: number;
  timeoutMs: number;
  rateLimitPerMinute: number;
  defaultCurrency: string;
  supportedCountries: string[];
  redirectUrl: string;
  flightConfig?: FlightProviderSearchConfig;
  ktxConfig?: KtxProviderSearchConfig;
  busConfig?: BusProviderSearchConfig;
  connectionHealth: 'healthy' | 'degraded' | 'error' | 'untested' | 'unconfigured';
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
  credentialsConfigured: boolean;
  credentialSource: 'encrypted_vault' | 'env_var' | 'not_configured';
  maskedApiKey: string | null;
  maskedApiSecret: string | null;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  encryptionAlgorithm: 'AES-256-GCM';
}

interface TransportProviderEditorModalProps {
  mode: 'create' | 'edit';
  defaultType: TransportCategory;
  provider: AdminTransportProviderView | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, existingId?: string) => Promise<void>;
}

export const TransportProviderEditorModal: React.FC<TransportProviderEditorModalProps> = ({
  mode,
  defaultType,
  provider,
  saving,
  error,
  onClose,
  onSave,
}) => {
  const [transportType, setTransportType] = useState<TransportCategory>(
    provider?.transportType || defaultType
  );
  const [name, setName] = useState(provider?.name || '');
  const [description, setDescription] = useState(provider?.description || '');
  const [apiBaseUrl, setApiBaseUrl] = useState(provider?.apiBaseUrl || 'https://');
  const [searchEndpoint, setSearchEndpoint] = useState(provider?.searchEndpoint || '/v1/search');
  const [healthEndpoint, setHealthEndpoint] = useState(provider?.healthEndpoint || '/health');
  const [authType, setAuthType] = useState<ProviderAuthType>(
    provider?.authType || 'api_key_header'
  );
  const [authHeaderName, setAuthHeaderName] = useState(provider?.authHeaderName || 'X-API-Key');
  const [authQueryParamName, setAuthQueryParamName] = useState(
    provider?.authQueryParamName || 'api_key'
  );
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>(
    provider?.environment || 'production'
  );
  const [status, setStatus] = useState<'active' | 'inactive'>(provider?.status || 'active');
  const [priority, setPriority] = useState(provider?.priority ?? 3);
  const [timeoutMs, setTimeoutMs] = useState(provider?.timeoutMs ?? 10000);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(provider?.rateLimitPerMinute ?? 60);
  const [defaultCurrency, setDefaultCurrency] = useState(
    provider?.defaultCurrency || (defaultType === 'flight' ? 'USD' : 'KRW')
  );
  const [supportedCountriesText, setSupportedCountriesText] = useState(
    (provider?.supportedCountries || ['KR']).join(', ')
  );
  const [redirectUrl, setRedirectUrl] = useState(
    provider?.redirectUrl ||
      (defaultType === 'ktx'
        ? 'https://www.letskorail.com'
        : defaultType === 'bus'
        ? 'https://www.kobus.co.kr'
        : 'https://www.google.com/travel/flights')
  );

  // Encrypted credentials inputs (blank by default when editing; never pre-filled with secrets)
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiSecretInput, setApiSecretInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [clearStoredCreds, setClearStoredCreds] = useState(false);

  // Category-specific parameters
  const [flightEngine, setFlightEngine] = useState(
    provider?.flightConfig?.engine || 'google_flights'
  );
  const [flightCabin, setFlightCabin] = useState<
    'Economy' | 'Premium Economy' | 'Business' | 'First Class'
  >(provider?.flightConfig?.defaultCabinClass || 'Economy');
  const [flightMaxResults, setFlightMaxResults] = useState(
    provider?.flightConfig?.maxResults ?? 30
  );
  const [flightStops, setFlightStops] = useState<'any' | 'nonstop' | '1stop'>(
    provider?.flightConfig?.defaultStops || 'any'
  );
  const [flightNearby, setFlightNearby] = useState(
    provider?.flightConfig?.includeNearbyAirports ?? false
  );

  // KTX config
  const [ktxDepParam, setKtxDepParam] = useState(
    provider?.ktxConfig?.departureStationParam || 'depPlaceId'
  );
  const [ktxArrParam, setKtxArrParam] = useState(
    provider?.ktxConfig?.arrivalStationParam || 'arrPlaceId'
  );
  const [ktxDateParam, setKtxDateParam] = useState(
    provider?.ktxConfig?.travelDateParam || 'depPlandTime'
  );
  const [ktxTimeParam, setKtxTimeParam] = useState(
    provider?.ktxConfig?.departureTimeParam || 'depplandtime'
  );
  const [ktxPaxParam, setKtxPaxParam] = useState(
    provider?.ktxConfig?.passengersParam || 'passengers'
  );
  const [ktxTrainsText, setKtxTrainsText] = useState(
    (provider?.ktxConfig?.availableTrainServices || ['KTX', 'KTX-Sancheon', 'SRT']).join(', ')
  );
  const [ktxPriceField, setKtxPriceField] = useState(
    provider?.ktxConfig?.ticketPriceField || 'adultcharge'
  );

  // Bus config
  const [busMode, setBusMode] = useState<'express' | 'intercity' | 'both'>(
    provider?.busConfig?.busMode || 'express'
  );
  const [busDepParam, setBusDepParam] = useState(
    provider?.busConfig?.departureTerminalParam || 'depTerminalId'
  );
  const [busArrParam, setBusArrParam] = useState(
    provider?.busConfig?.destinationTerminalParam || 'arrTerminalId'
  );
  const [busDateParam, setBusDateParam] = useState(
    provider?.busConfig?.travelDateParam || 'depPlandTime'
  );
  const [busTimeParam, setBusTimeParam] = useState(
    provider?.busConfig?.departureTimeParam || 'depPlandTime'
  );
  const [busOperatorField, setBusOperatorField] = useState(
    provider?.busConfig?.busOperatorField || 'gradeNm'
  );
  const [busSeatField, setBusSeatField] = useState(
    provider?.busConfig?.seatAvailabilityField || 'unavailable'
  );
  const [busPriceField, setBusPriceField] = useState(
    provider?.busConfig?.ticketPriceField || 'charge'
  );

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (name.trim().length < 2) {
      setLocalError('Provider name must be at least 2 characters.');
      return;
    }
    if (!apiBaseUrl.trim().startsWith('https://')) {
      setLocalError('API Base URL must start with https:// (plain HTTP and internal hosts are blocked).');
      return;
    }
    if (!redirectUrl.trim().startsWith('https://')) {
      setLocalError('External booking redirect URL must start with https://.');
      return;
    }

    const supportedCountries = supportedCountriesText
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      transportType,
      description: description.trim(),
      apiBaseUrl: apiBaseUrl.trim(),
      searchEndpoint: searchEndpoint.trim(),
      healthEndpoint: healthEndpoint.trim(),
      authType,
      authHeaderName: authHeaderName.trim(),
      authQueryParamName: authQueryParamName.trim(),
      environment,
      status,
      priority: Number(priority) || 5,
      timeoutMs: Number(timeoutMs) || 10000,
      rateLimitPerMinute: Number(rateLimitPerMinute) || 60,
      defaultCurrency: defaultCurrency.trim().toUpperCase(),
      supportedCountries,
      redirectUrl: redirectUrl.trim(),
      clearCredentials: clearStoredCreds,
    };

    if (!clearStoredCreds) {
      if (apiKeyInput.trim()) payload.apiKey = apiKeyInput.trim();
      if (apiSecretInput.trim()) payload.apiSecret = apiSecretInput.trim();
    }

    if (transportType === 'flight') {
      payload.flightConfig = {
        engine: flightEngine.trim(),
        defaultCabinClass: flightCabin,
        maxResults: Number(flightMaxResults) || 30,
        includeNearbyAirports: flightNearby,
        defaultStops: flightStops,
      };
    } else if (transportType === 'ktx') {
      payload.ktxConfig = {
        departureStationParam: ktxDepParam.trim() || 'depPlaceId',
        arrivalStationParam: ktxArrParam.trim() || 'arrPlaceId',
        travelDateParam: ktxDateParam.trim() || 'depPlandTime',
        departureTimeParam: ktxTimeParam.trim() || 'depplandtime',
        passengersParam: ktxPaxParam.trim() || 'passengers',
        availableTrainServices: ktxTrainsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        ticketPriceField: ktxPriceField.trim() || 'adultcharge',
        providerRedirectUrl: redirectUrl.trim(),
      };
    } else if (transportType === 'bus') {
      payload.busConfig = {
        busMode,
        departureTerminalParam: busDepParam.trim() || 'depTerminalId',
        destinationTerminalParam: busArrParam.trim() || 'arrTerminalId',
        travelDateParam: busDateParam.trim() || 'depPlandTime',
        departureTimeParam: busTimeParam.trim() || 'depPlandTime',
        busOperatorField: busOperatorField.trim() || 'gradeNm',
        seatAvailabilityField: busSeatField.trim() || 'unavailable',
        ticketPriceField: busPriceField.trim() || 'charge',
        externalBookingUrl: redirectUrl.trim(),
      };
    }

    await onSave(payload, provider?.id);
  };

  const needsSecret =
    authType === 'oauth2_client_credentials' || authType === 'basic_auth';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#10243A] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#061B49] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0754B8] flex items-center justify-center">
              {transportType === 'flight' ? (
                <Plane className="w-5 h-5" />
              ) : transportType === 'ktx' ? (
                <TrainFront className="w-5 h-5" />
              ) : (
                <Bus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold">
                {mode === 'create'
                  ? `Add New ${transportType.toUpperCase()} API Provider`
                  : `Configure ${provider?.name}`}
              </h3>
              <p className="text-xs text-sky-200">
                Server-side AES-256-GCM encrypted credential vault • Dynamic runtime switching
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {(localError || error) && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Section 1: Provider Identity & Routing */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              1. Provider Identity &amp; Endpoints
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Provider Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., SerpApi Google Flights or Korea TAGO Rail"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transport Category *
                </label>
                <select
                  value={transportType}
                  disabled={mode === 'edit'}
                  onChange={(e) => setTransportType(e.target.value as TransportCategory)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
                >
                  <option value="flight">Flight / Airline</option>
                  <option value="ktx">KTX / High-Speed Train</option>
                  <option value="bus">Express / Intercity Bus</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Official data source summary and coverage notes"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  API Base URL (HTTPS Only) *
                </label>
                <input
                  type="url"
                  required
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="https://api.provider.com"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Search Endpoint Path
                </label>
                <input
                  type="text"
                  value={searchEndpoint}
                  onChange={(e) => setSearchEndpoint(e.target.value)}
                  placeholder="/search.json"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Health Check Path
                </label>
                <input
                  type="text"
                  value={healthEndpoint}
                  onChange={(e) => setHealthEndpoint(e.target.value)}
                  placeholder="/health"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as 'sandbox' | 'production')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="production">Production</option>
                  <option value="sandbox">Sandbox</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority (1 = Primary)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Currency
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())}
                  placeholder="USD / KRW"
                  className="w-full px-3 py-2 text-sm uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Request Timeout (ms)
                </label>
                <input
                  type="number"
                  min={2000}
                  max={30000}
                  step={500}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rate Limit (req/min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={rateLimitPerMinute}
                  onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supported Countries (ISO)
                </label>
                <input
                  type="text"
                  value={supportedCountriesText}
                  onChange={(e) => setSupportedCountriesText(e.target.value)}
                  placeholder="KR, US, JP, BD, NP"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official External Booking Redirect URL (HTTPS) *
              </label>
              <input
                type="url"
                required
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://www.letskorail.com"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                EveryKR does not sell tickets. Users comparing options will be redirected to this official external booking URL.
              </p>
            </div>
          </div>

          {/* Section 2: Authentication & Encrypted Credentials */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#061B49] dark:text-sky-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                2. Authentication &amp; Encrypted Server Vault (AES-256-GCM)
              </h4>
              {provider?.credentialsConfigured && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Stored ({provider.credentialSource === 'env_var' ? 'Server Env' : 'Encrypted Vault'}:{' '}
                  <code className="font-mono">{provider.maskedApiKey || '••••••••'}</code>)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Authentication Method
                </label>
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value as ProviderAuthType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="api_key_query">API Key (Query Parameter)</option>
                  <option value="api_key_header">API Key (HTTP Header)</option>
                  <option value="bearer_token">Bearer Token (Authorization Header)</option>
                  <option value="oauth2_client_credentials">OAuth2 Client Credentials</option>
                  <option value="basic_auth">HTTP Basic Auth</option>
                  <option value="none">No Authentication (Public Endpoint)</option>
                </select>
              </div>

              {authType === 'api_key_header' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Header Name
                  </label>
                  <input
                    type="text"
                    value={authHeaderName}
                    onChange={(e) => setAuthHeaderName(e.target.value)}
                    placeholder="x-api-key"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {authType === 'api_key_query' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Query Parameter Name
                  </label>
                  <input
                    type="text"
                    value={authQueryParamName}
                    onChange={(e) => setAuthQueryParamName(e.target.value)}
                    placeholder="api_key or serviceKey"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {authType !== 'none' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {authType === 'oauth2_client_credentials'
                        ? 'Client ID (Leave blank to keep current)'
                        : 'API Key / Service Key (Leave blank to keep current)'}
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKeyInput}
                        disabled={clearStoredCreds}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        autoComplete="new-password"
                        placeholder={
                          provider?.maskedApiKey
                            ? `Current: ${provider.maskedApiKey}`
                            : 'Enter server-side API key...'
                        }
                        className="w-full pl-3 pr-10 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label="Toggle visibility"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {needsSecret && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Client Secret / Password
                      </label>
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiSecretInput}
                        disabled={clearStoredCreds}
                        onChange={(e) => setApiSecretInput(e.target.value)}
                        autoComplete="new-password"
                        placeholder={
                          provider?.maskedApiSecret
                            ? `Current: ${provider.maskedApiSecret}`
                            : 'Enter server-side secret...'
                        }
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>

                {provider?.credentialSource === 'encrypted_vault' && (
                  <label className="inline-flex items-center gap-2 text-xs text-red-700 dark:text-red-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearStoredCreds}
                      onChange={(e) => setClearStoredCreds(e.target.checked)}
                      className="rounded border-red-300"
                    />
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear stored encrypted vault credentials for this provider</span>
                  </label>
                )}

                <div className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Credentials are encrypted server-side with AES-256-GCM before storage and are never exposed in frontend code, public APIs, logs, or Firestore documents.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Category-Specific Parameters */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              3. {transportType.toUpperCase()} Search Parameters &amp; Field Mapping
            </h4>

            {transportType === 'flight' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Engine Identifier
                  </label>
                  <input
                    type="text"
                    value={flightEngine}
                    onChange={(e) => setFlightEngine(e.target.value)}
                    placeholder="google_flights"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Cabin Class
                  </label>
                  <select
                    value={flightCabin}
                    onChange={(e) =>
                      setFlightCabin(
                        e.target.value as 'Economy' | 'Premium Economy' | 'Business' | 'First Class'
                      )
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="Economy">Economy</option>
                    <option value="Premium Economy">Premium Economy</option>
                    <option value="Business">Business</option>
                    <option value="First Class">First Class</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Results per Search
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={flightMaxResults}
                    onChange={(e) => setFlightMaxResults(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Stops Filter
                  </label>
                  <select
                    value={flightStops}
                    onChange={(e) => setFlightStops(e.target.value as 'any' | 'nonstop' | '1stop')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="any">Any stops</option>
                    <option value="nonstop">Non-stop only</option>
                    <option value="1stop">Up to 1 stop</option>
                  </select>
                </div>
                <label className="md:col-span-2 inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flightNearby}
                    onChange={(e) => setFlightNearby(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Include nearby metropolitan airports in default flight searches</span>
                </label>
              </div>
            )}

            {transportType === 'ktx' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Departure Station Param
                  </label>
                  <input
                    type="text"
                    value={ktxDepParam}
                    onChange={(e) => setKtxDepParam(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Arrival Station Param
                  </label>
                  <input
                    type="text"
                    value={ktxArrParam}
                    onChange={(e) => setKtxArrParam(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Travel Date Param
                  </label>
                  <input
                    type="text"
                    value={ktxDateParam}
                    onChange={(e) => setKtxDateParam(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Departure Time Field/Param
                  </label>
                  <input
                    type="text"
                    value={ktxTimeParam}
                    onChange={(e) => setKtxTimeParam(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Passenger Count Param
                  </label>
                  <input
                    type="text"
                    value={ktxPaxParam}
                    onChange={(e) => setKtxPaxParam(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ticket Price Field
                  </label>
                  <input
                    type="text"
                    value={ktxPriceField}
                    onChange={(e) => setKtxPriceField(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Available Train Services (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={ktxTrainsText}
                    onChange={(e) => setKtxTrainsText(e.target.value)}
                    placeholder="KTX, KTX-Sancheon, KTX-Eum, SRT, ITX-Saemaeul"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {transportType === 'bus' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bus Network Mode
                  </label>
                  <select
                    value={busMode}
                    onChange={(e) =>
                      setBusMode(e.target.value as 'express' | 'intercity' | 'both')
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="express">Express Bus (고속버스)</option>
                    <option value="intercity">Intercity Bus (시외버스)</option>
                    <option value="both">Both Express &amp; Intercity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Departure Terminal Param
                  </label>
                  <input
                    type="text"
                    value={busDepParam}
                    onChange={(e) => setBusDepParam(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destination Terminal Param
                  </label>
                  <input
                    type="text"
                    value={busArrParam}
                    onChange={(e) => setBusArrParam(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Travel Date Param
                  </label>
                  <input
                    type="text"
                    value={busDateParam}
                    onChange={(e) => setBusDateParam(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Departure Time Field/Param
                  </label>
                  <input
                    type="text"
                    value={busTimeParam}
                    onChange={(e) => setBusTimeParam(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bus Operator / Grade Field
                  </label>
                  <input
                    type="text"
                    value={busOperatorField}
                    onChange={(e) => setBusOperatorField(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Seat Availability Field
                  </label>
                  <input
                    type="text"
                    value={busSeatField}
                    onChange={(e) => setBusSeatField(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ticket Price Field
                  </label>
                  <input
                    type="text"
                    value={busPriceField}
                    onChange={(e) => setBusPriceField(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>All changes are written to the immutable Admin Audit Log</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[#0754B8] hover:bg-[#064599] text-white disabled:opacity-60 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : mode === 'create' ? 'Add Provider' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
