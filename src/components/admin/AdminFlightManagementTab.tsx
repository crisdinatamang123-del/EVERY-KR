import React, { useState, useEffect } from 'react';
import {
  Plane,
  Server,
  Globe,
  BarChart3,
  Settings,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  ShieldCheck,
  ArrowUpDown,
  Save,
  Eye,
  X,
  Activity,
  MousePointerClick,
  Search,
  TrainFront,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getVerifiedAdminRequestHeaders } from '../../services/firebaseService';
import { AdminTransportHubSection } from './AdminTransportHubSection';

interface ApiProviderStatus {
  id: 'serpapi' | 'amadeus' | 'skyscanner' | 'custom_gds';
  name: string;
  engine?: string | null;
  isPrimary?: boolean;
  category: string;
  enabled: boolean;
  priority: number;
  connected: boolean;
  verified?: boolean;
  statusState?:
    | 'connected_verified'
    | 'configured_ready'
    | 'error'
    | 'awaiting_approval'
    | 'missing_credentials'
    | 'disabled';
  credentialsConfigured: boolean;
  credentialSource?: 'server_vault' | 'env_var' | 'not_configured';
  requiredEnvKeys?: string[];
  partnerApprovalRequired: boolean;
  partnerApproved: boolean;
  environment: 'test' | 'production';
  rateLimitPerMinute: number;
  timeoutMs: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequestAt: string | null;
  lastSuccessAt?: string | null;
  lastResponseTimeMs?: number | null;
  averageResponseTimeMs?: number | null;
  lastError: string | null;
  statusMessage: string;
}

interface BookingProviderRecord {
  id: string;
  name: string;
  type: 'ota' | 'metasearch' | 'airline';
  logoUrl: string;
  officialUrl: string;
  affiliateBaseUrl: string;
  description: string;
  enabled: boolean;
  displayOrder: number;
  supportsDeepLink: boolean;
  badgeText?: string;
}

interface FlightSearchConfig {
  defaultCurrency: string;
  supportedCurrencies: string[];
  defaultAdults: number;
  defaultChildren: number;
  defaultInfants: number;
  defaultCabinClass: 'Economy' | 'Premium Economy' | 'Business' | 'First Class';
  cacheTtlSeconds: number;
  priceFreshnessThresholdSeconds: number;
  searchRateLimitPerIpPerMinute: number;
  preferredProviderId?: 'serpapi' | 'amadeus' | 'skyscanner' | 'flight_aggregator' | 'auto';
  airlineDisplaySettings?: {
    showAirlineLogos: boolean;
    showOperatingCarrierDetails: boolean;
    showBaggageInSummary: boolean;
    showPriceVerificationBadge: boolean;
    prioritizeKoreanCarriers: boolean;
  };
}

interface FlightProviderBreakdownRow {
  providerId: string;
  providerName: string;
  enabled: boolean;
  connected: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRatePercent: number;
  lastResponseTimeMs: number | null;
  averageResponseTimeMs: number | null;
  lastVerifiedAt: string | null;
}

interface FlightAnalyticsSummary {
  totalSearches: number;
  totalApiRequests: number;
  totalApiErrors: number;
  providerErrorRatePercent: number;
  totalRedirectClicks: number;
  mostSearchedRoutes: { route: string; origin: string; destination: string; count: number }[];
  popularDepartureAirports: { iata: string; city: string; count: number }[];
  popularDestinationAirports: { iata: string; city: string; count: number }[];
  searchVolumeByDate: { date: string; count: number }[];
  redirectClicksByProvider: { providerId: string; providerName: string; clicks: number }[];
  providerBreakdown?: FlightProviderBreakdownRow[];
  recentSearches: {
    id?: string;
    searchId?: string;
    timestamp: string;
    origin: string;
    destination: string;
    departureDate: string;
    tripType: string;
    cabinClass: string;
    currency: string;
    liveOffersCount?: number;
    offersReturned?: number;
  }[];
}

export const AdminFlightManagementTab: React.FC = () => {
  const { currentUser } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'api_providers' | 'booking_directory' | 'analytics' | 'configuration' | 'transport_hub'>('api_providers');
  const [loading, setLoading] = useState<boolean>(true);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State from backend
  const [apiProviders, setApiProviders] = useState<ApiProviderStatus[]>([]);
  const [bookingProviders, setBookingProviders] = useState<BookingProviderRecord[]>([]);
  const [searchConfig, setSearchConfig] = useState<FlightSearchConfig | null>(null);
  const [analytics, setAnalytics] = useState<FlightAnalyticsSummary | null>(null);

  // Credential modal for API provider (never exposes existing secrets)
  const [credentialModalProvider, setCredentialModalProvider] = useState<ApiProviderStatus | null>(null);
  const [clientIdInput, setClientIdInput] = useState<string>('');
  const [clientSecretInput, setClientSecretInput] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [partnerApprovedInput, setPartnerApprovedInput] = useState<boolean>(false);
  const [environmentInput, setEnvironmentInput] = useState<'test' | 'production'>('test');
  const [savingCredentials, setSavingCredentials] = useState<boolean>(false);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);

  // Booking Provider Editor modal
  const [editingBookingProvider, setEditingBookingProvider] = useState<BookingProviderRecord | null>(null);
  const [isNewBookingProvider, setIsNewBookingProvider] = useState<boolean>(false);

  const buildHeaders = async (withJson = false): Promise<Record<string, string>> => {
    return getVerifiedAdminRequestHeaders(currentUser, withJson);
  };

  const loadPublicProviderStatusFallback = async () => {
    try {
      const pubRes = await fetch('/api/flights/providers');
      const pubData = await pubRes.json().catch(() => null);
      if (pubRes.ok && Array.isArray(pubData?.apiProvidersStatus)) {
        const mapped: ApiProviderStatus[] = pubData.apiProvidersStatus.map((p: any, idx: number) => {
          const id = (p.providerId || 'custom_gds') as ApiProviderStatus['id'];
          const isSerp = id === 'serpapi';
          const isAmadeus = id === 'amadeus';
          const isSky = id === 'skyscanner';
          return {
            id,
            name: p.providerName || id,
            engine: isSerp ? 'google_flights' : isAmadeus ? 'flight-offers-search (v2/v1)' : isSky ? 'flights/live/search (v3)' : null,
            isPrimary: typeof p.isPrimary === 'boolean' ? p.isPrimary : isSerp,
            category: 'GDS / Flight API',
            enabled: Boolean(p.enabled),
            priority: typeof p.priority === 'number' ? p.priority : idx + 1,
            connected: p.status === 'connected',
            verified: Boolean(p.connectedAndVerified),
            statusState:
              p.status === 'connected'
                ? p.connectedAndVerified
                  ? 'connected_verified'
                  : 'configured_ready'
                : p.status === 'error'
                ? 'error'
                : p.status === 'disabled'
                ? 'disabled'
                : p.status === 'awaiting_partner_approval'
                ? 'awaiting_approval'
                : 'missing_credentials',
            credentialsConfigured: Boolean(p.credentialsConfigured || p.status === 'connected'),
            credentialSource: p.credentialsConfigured ? 'env_var' : 'not_configured',
            requiredEnvKeys: isSerp
              ? ['SERPAPI_API_KEY']
              : isAmadeus
              ? ['AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET']
              : isSky
              ? ['SKYSCANNER_API_KEY']
              : [],
            partnerApprovalRequired: isSky,
            partnerApproved: p.status !== 'awaiting_partner_approval',
            environment: p.environment === 'test' ? 'test' : 'production',
            rateLimitPerMinute: 60,
            timeoutMs: isSerp ? 12000 : 9000,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            lastRequestAt: null,
            lastError: p.status === 'error' ? p.statusMessage : null,
            statusMessage: p.statusMessage || 'Awaiting server-side API credentials.',
          };
        });
        setApiProviders((prev) => (prev.length > 0 ? prev : mapped));
      }
    } catch {
      // Ignore fallback error
    }
  };

  const fetchAdminOverview = async () => {
    setLoading(true);
    try {
      const headers = await buildHeaders(false);
      const res = await fetch('/api/admin/flights/overview', {
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setApiProviders(data.apiProviders || []);
        setBookingProviders(data.bookingProviders || []);
        setSearchConfig(data.searchConfig || null);
        setAnalytics(data.analytics || null);
      } else {
        await loadPublicProviderStatusFallback();
      }
    } catch {
      await loadPublicProviderStatusFallback();
      setStatusBanner({ type: 'error', message: 'Failed to load Flight Management overview.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminOverview();
  }, [currentUser?.id, currentUser?.email]);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setStatusBanner({ type, message });
    setTimeout(() => setStatusBanner(null), 5000);
  };

  // A. API Provider handlers
  const handleToggleApiProvider = async (provider: ApiProviderStatus) => {
    try {
      const headers = await buildHeaders(true);
      const res = await fetch(`/api/admin/flights/api-providers/${provider.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          enabled: !provider.enabled,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setApiProviders(data.apiProviders);
        showNotice('success', `Updated ${provider.name} status.`);
      } else {
        showNotice('error', data.error || 'Could not update provider.');
      }
    } catch {
      showNotice('error', 'Network error updating API provider.');
    }
  };

  const handleSetPrimaryApiProvider = async (providerId: 'serpapi' | 'amadeus' | 'skyscanner') => {
    try {
      const headers = await buildHeaders(true);
      const res = await fetch('/api/admin/flights/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...(searchConfig || {}),
          preferredProviderId: providerId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSearchConfig(data.searchConfig);
        await fetchAdminOverview();
        showNotice('success', 'Primary flight search API provider updated.');
      } else {
        showNotice('error', data.error || 'Could not update primary provider.');
      }
    } catch {
      showNotice('error', 'Network error updating primary provider.');
    }
  };

  const handleUpdateApiProviderSettings = async (
    providerId: string,
    patch: { priority?: number; rateLimitPerMinute?: number; timeoutMs?: number; environment?: 'test' | 'production' }
  ) => {
    try {
      const headers = await buildHeaders(true);
      const res = await fetch(`/api/admin/flights/api-providers/${providerId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setApiProviders(data.apiProviders);
        showNotice('success', 'API provider parameters updated.');
      }
    } catch {
      showNotice('error', 'Failed to update API provider settings.');
    }
  };

  const submitApiCredentials = async (runTestAfterSave: boolean) => {
    if (!credentialModalProvider) return;
    const targetProvider = credentialModalProvider;
    setSavingCredentials(true);
    try {
      const headers = await buildHeaders(true);
      const res = await fetch(`/api/admin/flights/api-providers/${targetProvider.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          environment: targetProvider.id === 'serpapi' ? 'production' : environmentInput,
          partnerApproved: partnerApprovedInput,
          credentials: {
            clientId: clientIdInput.trim() || undefined,
            clientSecret: clientSecretInput.trim() || undefined,
            apiKey: apiKeyInput.trim() || undefined,
            serpApiKey:
              targetProvider.id === 'serpapi'
                ? apiKeyInput.trim() || undefined
                : undefined,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setApiProviders(data.apiProviders);
        setCredentialModalProvider(null);
        setClientIdInput('');
        setClientSecretInput('');
        setApiKeyInput('');
        if (runTestAfterSave) {
          await handleTestApiProviderConnection(targetProvider);
        } else {
          showNotice(
            'success',
            `Server-side credentials updated for ${targetProvider.name}. Secret values remain strictly hidden on the server.`
          );
        }
      } else {
        showNotice('error', data.error || 'Could not save credentials.');
      }
    } catch {
      showNotice('error', 'Network error while saving server-side credentials.');
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleSaveApiCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitApiCredentials(false);
  };

  const handleClearVaultCredentials = async (provider: ApiProviderStatus) => {
    setSavingCredentials(true);
    try {
      const headers = await buildHeaders(true);
      const res = await fetch(`/api/admin/flights/api-providers/${provider.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          clearStoredCredentials: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setApiProviders(data.apiProviders);
        setCredentialModalProvider(null);
        setClientIdInput('');
        setClientSecretInput('');
        setApiKeyInput('');
        showNotice('success', `Cleared server vault override for ${provider.name}.`);
      } else {
        showNotice('error', data.error || 'Could not clear stored credentials.');
      }
    } catch {
      showNotice('error', 'Network error clearing server vault override.');
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleTestApiProviderConnection = async (provider: ApiProviderStatus) => {
    setTestingProviderId(provider.id);
    try {
      const headers = await buildHeaders(true);
      const res = await fetch(`/api/admin/flights/api-providers/${provider.id}/test`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (Array.isArray(data.apiProviders)) {
        setApiProviders(data.apiProviders);
      }
      if (res.ok && data.ok && data.connected) {
        showNotice('success', data.message || `${provider.name} connection verified.`);
      } else {
        showNotice('error', data.message || data.error || `Connection test failed for ${provider.name}.`);
      }
      fetchAdminOverview();
    } catch {
      showNotice('error', `Network error while testing ${provider.name} connection.`);
    } finally {
      setTestingProviderId(null);
    }
  };

  // B. Booking Provider Directory handlers
  const handleSaveBookingProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookingProvider) return;
    try {
      const headers = await buildHeaders(true);
      const res = await fetch('/api/admin/flights/booking-providers', {
        method: 'POST',
        headers,
        body: JSON.stringify(editingBookingProvider),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setBookingProviders(data.bookingProviders);
        setEditingBookingProvider(null);
        showNotice('success', `Saved booking provider "${editingBookingProvider.name}".`);
      } else {
        showNotice('error', data.error || 'Invalid provider URL or parameters.');
      }
    } catch {
      showNotice('error', 'Failed to save booking provider.');
    }
  };

  const handleQuickToggleBookingProvider = async (provider: BookingProviderRecord) => {
    try {
      const headers = await buildHeaders(true);
      const res = await fetch('/api/admin/flights/booking-providers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...provider,
          enabled: !provider.enabled,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setBookingProviders(data.bookingProviders);
        showNotice('success', `${provider.name} ${!provider.enabled ? 'enabled' : 'disabled'}.`);
      }
    } catch {
      showNotice('error', 'Failed to toggle booking provider.');
    }
  };

  const handleDeleteBookingProvider = async (providerId: string) => {
    try {
      const headers = await buildHeaders(false);
      const res = await fetch(`/api/admin/flights/booking-providers/${providerId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setBookingProviders(data.bookingProviders);
        showNotice('success', 'Booking provider removed.');
      }
    } catch {
      showNotice('error', 'Failed to delete booking provider.');
    }
  };

  // D. Search Configuration handler
  const handleSaveSearchConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchConfig) return;
    try {
      const headers = await buildHeaders(true);
      const res = await fetch('/api/admin/flights/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify(searchConfig),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSearchConfig(data.searchConfig);
        showNotice('success', 'Flight search engine configuration saved.');
      } else {
        showNotice('error', data.error || 'Could not update search configuration.');
      }
    } catch {
      showNotice('error', 'Failed to save search configuration.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Flight & Smart Transportation Hub Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage server-side Flight & TAGO Rail/Bus APIs, service visibility (Airline · KTX · Bus), official booking redirects, and search telemetry.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAdminOverview}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 transition self-start md:self-center cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {statusBanner && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button type="button" onClick={() => setStatusBanner(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {(
          [
            { id: 'api_providers', label: 'A. Flight API Providers', icon: Server },
            { id: 'booking_directory', label: 'B. Flight Booking Directory', icon: Globe },
            { id: 'analytics', label: 'C. Flight Search Analytics', icon: BarChart3 },
            { id: 'configuration', label: 'D. Flight Configuration', icon: Settings },
            { id: 'transport_hub', label: 'E. Smart Transport Hub (KTX · Bus)', icon: TrainFront },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION E: SMART TRANSPORTATION HUB (AIRLINE, KTX TRAIN, BUS & TAGO API) */}
      {activeSubTab === 'transport_hub' && <AdminTransportHubSection />}

      {/* SECTION A: API PROVIDER MANAGEMENT */}
      {activeSubTab === 'api_providers' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Server-Side Key Security Policy:</strong> All flight API credentials (
              <code className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900 font-mono font-bold text-blue-700 dark:text-sky-300">
                SERPAPI_API_KEY
              </code>
              ,{' '}
              <code className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900 font-mono font-bold text-slate-800 dark:text-slate-200">
                AMADEUS_CLIENT_ID
              </code>
              ,{' '}
              <code className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900 font-mono font-bold text-slate-800 dark:text-slate-200">
                AMADEUS_CLIENT_SECRET
              </code>
              ,{' '}
              <code className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900 font-mono font-bold text-slate-800 dark:text-slate-200">
                SKYSCANNER_API_KEY
              </code>
              ) are stored and executed exclusively on the backend server. Secret values are never exposed to frontend bundles, browser responses, logs, or public Firestore documents.{' '}
              <strong>SerpApi Google Flights</strong> (
              <code className="font-mono font-semibold">google_flights</code>) is configured as the Primary Provider, with Amadeus and Skyscanner adapters preserved for secondary failover and verification.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {apiProviders.map((provider) => {
              const isPrimaryProvider =
                provider.isPrimary ??
                (searchConfig?.preferredProviderId || 'serpapi') === provider.id;

              const statusState =
                provider.statusState ||
                (!provider.enabled
                  ? 'disabled'
                  : provider.lastError
                  ? 'error'
                  : provider.credentialsConfigured && provider.verified
                  ? 'connected_verified'
                  : provider.credentialsConfigured
                  ? 'configured_ready'
                  : provider.partnerApprovalRequired && !provider.partnerApproved
                  ? 'awaiting_approval'
                  : 'missing_credentials');

              const statusBadge =
                statusState === 'connected_verified'
                  ? {
                      label: 'Connected & Verified',
                      className:
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                    }
                  : statusState === 'configured_ready'
                  ? {
                      label: 'Credentials Configured',
                      className:
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                    }
                  : statusState === 'error'
                  ? {
                      label: 'Connection Error',
                      className:
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                    }
                  : statusState === 'disabled'
                  ? {
                      label: 'Disabled',
                      className:
                        'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    }
                  : statusState === 'awaiting_approval'
                  ? {
                      label: 'Awaiting Partner Approval',
                      className:
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                    }
                  : {
                      label: 'Not Configured',
                      className:
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                    };

              const credentialDisplayLabel = provider.credentialsConfigured
                ? provider.credentialSource === 'server_vault'
                  ? 'Configured (Server Vault)'
                  : provider.credentialSource === 'env_var'
                  ? 'Configured (Server Env)'
                  : 'Configured (Hidden)'
                : provider.id === 'serpapi'
                ? 'Missing SERPAPI_API_KEY'
                : provider.id === 'amadeus'
                ? 'Missing Amadeus Keys'
                : provider.id === 'skyscanner'
                ? 'Missing SKYSCANNER_API_KEY'
                : 'Missing Keys';

              const requiredKeysText =
                provider.requiredEnvKeys && provider.requiredEnvKeys.length > 0
                  ? provider.requiredEnvKeys.join(', ')
                  : provider.id === 'serpapi'
                  ? 'SERPAPI_API_KEY'
                  : provider.id === 'amadeus'
                  ? 'AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET'
                  : provider.id === 'skyscanner'
                  ? 'SKYSCANNER_API_KEY'
                  : null;

              return (
                <div
                  key={provider.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 space-y-4 shadow-2xs ${
                    isPrimaryProvider
                      ? 'border-blue-300 dark:border-blue-800'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {provider.name}
                        </h3>
                        {isPrimaryProvider && (
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white whitespace-nowrap shrink-0">
                            Primary Provider
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono">Priority #{provider.priority}</span>
                        {provider.engine && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              Engine: <code className="font-mono font-semibold text-slate-700 dark:text-slate-300">{provider.engine}</code>
                            </span>
                          </>
                        )}
                        {requiredKeysText && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              Server Key: <code className="font-mono font-semibold text-slate-700 dark:text-slate-300">{requiredKeysText}</code>
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{provider.statusMessage}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {!isPrimaryProvider &&
                        (provider.id === 'serpapi' ||
                          provider.id === 'amadeus' ||
                          provider.id === 'skyscanner') && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                provider.id === 'serpapi' ||
                                provider.id === 'amadeus' ||
                                provider.id === 'skyscanner'
                              ) {
                                handleSetPrimaryApiProvider(provider.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                            Set as Primary
                          </button>
                        )}

                      <button
                        type="button"
                        disabled={testingProviderId === provider.id}
                        onClick={() => handleTestApiProviderConnection(provider)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-sky-300 text-xs font-bold transition disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Activity
                          className={`w-3.5 h-3.5 ${
                            testingProviderId === provider.id ? 'animate-spin' : ''
                          }`}
                        />
                        {testingProviderId === provider.id ? 'Testing...' : 'Test Connection'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCredentialModalProvider(provider);
                          setEnvironmentInput(
                            provider.id === 'serpapi' ? 'production' : provider.environment
                          );
                          setPartnerApprovedInput(provider.partnerApproved);
                          setClientIdInput('');
                          setClientSecretInput('');
                          setApiKeyInput('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                        Configure Server Credentials
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleApiProvider(provider)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                          provider.enabled
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>

                  {/* Metrics & Operational Controls */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-400 font-semibold">Credentials</div>
                      <div
                        className={`font-bold mt-0.5 ${
                          provider.credentialsConfigured
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {credentialDisplayLabel}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-400 font-semibold">Environment</div>
                      <div className="font-bold uppercase text-slate-900 dark:text-white mt-0.5">
                        {provider.environment}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-400 font-semibold">API Requests</div>
                      <div className="font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                        {provider.totalRequests} ({provider.successfulRequests} OK)
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-400 font-semibold">Failed Requests</div>
                      <div className="font-bold font-mono tabular-nums text-rose-600 mt-0.5">
                        {provider.failedRequests}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-400 font-semibold">Response Time</div>
                      <div className="font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                        {typeof provider.lastResponseTimeMs === 'number'
                          ? `${provider.lastResponseTimeMs} ms (avg ${provider.averageResponseTimeMs || provider.lastResponseTimeMs} ms)`
                          : '—'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-400 font-semibold">Last Verified</div>
                      <div className="font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5 truncate">
                        {provider.lastSuccessAt || provider.lastRequestAt
                          ? new Date(
                              (provider.lastSuccessAt || provider.lastRequestAt) as string
                            ).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : 'No call yet'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <label className="text-slate-400 font-semibold block">Rate Limit / min</label>
                      <input
                        type="number"
                        min={1}
                        max={600}
                        value={provider.rateLimitPerMinute}
                        onChange={(e) =>
                          handleUpdateApiProviderSettings(provider.id, {
                            rateLimitPerMinute: Number(e.target.value),
                          })
                        }
                        className="w-20 mt-0.5 font-bold font-mono tabular-nums bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5"
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <label className="text-slate-400 font-semibold block">Priority Order</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={provider.priority}
                        onChange={(e) =>
                          handleUpdateApiProviderSettings(provider.id, {
                            priority: Number(e.target.value),
                          })
                        }
                        className="w-16 mt-0.5 font-bold font-mono tabular-nums bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5"
                      />
                    </div>
                  </div>

                  {provider.lastError && (
                    <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 rounded-lg">
                      <strong>Last API Diagnostic:</strong> {provider.lastError}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION B: BOOKING PROVIDER DIRECTORY */}
      {activeSubTab === 'booking_directory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Booking Referral & Comparison Directory ({bookingProviders.length} Providers)
              </h3>
              <p className="text-xs text-slate-500">
                Add or edit travel booking providers, update official and approved HTTPS affiliate links, adjust display order, and preview cards.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewBookingProvider(true);
                setEditingBookingProvider({
                  id: `provider_${Date.now()}`,
                  name: '',
                  type: 'ota',
                  logoUrl: 'https://www.google.com/s2/favicons?domain=trip.com&sz=128',
                  officialUrl: 'https://',
                  affiliateBaseUrl: '',
                  description: '',
                  enabled: true,
                  displayOrder: bookingProviders.length + 1,
                  supportsDeepLink: true,
                  badgeText: 'Trusted Partner',
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Booking Provider
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookingProviders.map((bp) => (
              <div
                key={bp.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={bp.logoUrl}
                      alt={bp.name}
                      className="w-11 h-11 rounded-xl object-contain bg-white p-1.5 border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white">{bp.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Order #{bp.displayOrder}
                        </span>
                      </div>
                      <a
                        href={bp.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {bp.officialUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickToggleBookingProvider(bp)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        bp.enabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {bp.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewBookingProvider(false);
                        setEditingBookingProvider({ ...bp });
                      }}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit Provider"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBookingProvider(bp.id)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Delete Provider"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">{bp.description}</p>

                {bp.affiliateBaseUrl && (
                  <div className="text-[11px] bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-sky-300 px-3 py-1.5 rounded-lg truncate">
                    <strong>Affiliate Link:</strong> {bp.affiliateBaseUrl}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION C: FLIGHT SEARCH ANALYTICS (GENUINE TELEMETRY ONLY) */}
      {activeSubTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
                <span>Total Flight Searches</span>
                <Search className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {analytics.totalSearches}
              </div>
              <div className="text-xs text-slate-500 mt-1">Genuine recorded user searches</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
                <span>Booking Redirect Clicks</span>
                <MousePointerClick className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {analytics.totalRedirectClicks}
              </div>
              <div className="text-xs text-slate-500 mt-1">Outbound provider referrals</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
                <span>Live API Request Volume</span>
                <Activity className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {analytics.totalApiRequests}
              </div>
              <div className="text-xs text-slate-500 mt-1">Total GDS/API adapter calls</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
                <span>Provider Error Rate</span>
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {analytics.providerErrorRatePercent}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {analytics.totalApiErrors} failed API requests
              </div>
            </div>
          </div>

          {/* Per-Provider API Telemetry Breakdown (SerpApi Google Flights, Amadeus, Skyscanner) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  API Provider Request & Latency Telemetry
                </h4>
                <p className="text-xs text-slate-500">
                  Real-time request monitoring, successful searches, failures, and response times across SerpApi Google Flights and secondary GDS providers.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                    <th className="py-2.5 px-3">Provider</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Total Requests</th>
                    <th className="py-2.5 px-3">Successful</th>
                    <th className="py-2.5 px-3">Failures</th>
                    <th className="py-2.5 px-3">Error Rate</th>
                    <th className="py-2.5 px-3">Last / Avg Response Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(analytics.providerBreakdown || apiProviders.map((p) => ({
                    providerId: p.id,
                    providerName: p.name,
                    enabled: p.enabled,
                    connected: p.connected,
                    totalRequests: p.totalRequests,
                    successfulRequests: p.successfulRequests,
                    failedRequests: p.failedRequests,
                    errorRatePercent:
                      p.totalRequests > 0
                        ? Math.round((p.failedRequests / p.totalRequests) * 1000) / 10
                        : 0,
                    lastResponseTimeMs: p.lastResponseTimeMs ?? null,
                    averageResponseTimeMs: p.averageResponseTimeMs ?? null,
                    lastVerifiedAt: p.lastRequestAt ?? null,
                  }))).map((row) => (
                    <tr key={row.providerId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {row.providerName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            row.connected
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : row.enabled
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {row.connected ? 'Connected' : row.enabled ? 'Awaiting Key' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">{row.totalRequests}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {row.successfulRequests}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-rose-600 font-bold">
                        {row.failedRequests}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{row.errorRatePercent}%</td>
                      <td className="py-2.5 px-3 font-mono">
                        {typeof row.lastResponseTimeMs === 'number'
                          ? `${row.lastResponseTimeMs} ms / avg ${
                              row.averageResponseTimeMs || row.lastResponseTimeMs
                            } ms`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Most Searched Routes */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Most Searched Routes
              </h4>
              {analytics.mostSearchedRoutes.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No routes searched yet.</p>
              ) : (
                <div className="space-y-2">
                  {analytics.mostSearchedRoutes.map((r) => (
                    <div
                      key={r.route}
                      className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200">{r.route}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300 font-bold">
                        {r.count} searches
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Origins & Destinations */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Popular Departure Airports
                </h4>
                {analytics.popularDepartureAirports.length === 0 ? (
                  <p className="text-xs text-slate-400">No departure airport data yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {analytics.popularDepartureAirports.slice(0, 5).map((a) => (
                      <div key={a.iata} className="flex items-center justify-between text-xs">
                        <span>
                          {a.city} (<strong>{a.iata}</strong>)
                        </span>
                        <span className="font-semibold text-slate-500">{a.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Popular Destinations
                </h4>
                {analytics.popularDestinationAirports.length === 0 ? (
                  <p className="text-xs text-slate-400">No destination airport data yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {analytics.popularDestinationAirports.slice(0, 5).map((a) => (
                      <div key={a.iata} className="flex items-center justify-between text-xs">
                        <span>
                          {a.city} (<strong>{a.iata}</strong>)
                        </span>
                        <span className="font-semibold text-slate-500">{a.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Redirect Clicks by Provider & Volume by Date */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Booking Redirect Clicks by Provider
                </h4>
                {analytics.redirectClicksByProvider.length === 0 ? (
                  <p className="text-xs text-slate-400">No outbound provider clicks recorded yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {analytics.redirectClicksByProvider.map((p) => (
                      <div key={p.providerId} className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{p.providerName}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                          {p.clicks} clicks
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Search Volume by Date
                </h4>
                {analytics.searchVolumeByDate.length === 0 ? (
                  <p className="text-xs text-slate-400">No daily search volume yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {analytics.searchVolumeByDate.slice(-5).map((d) => (
                      <div key={d.date} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{d.date}</span>
                        <span className="font-bold">{d.count} searches</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: SEARCH CONFIGURATION */}
      {activeSubTab === 'configuration' && searchConfig && (
        <form
          onSubmit={handleSaveSearchConfig}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6"
        >
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Global Flight Search & Cache Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Control default currency, passenger presets, cache TTL, price freshness threshold, and per-IP rate limits.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Default Currency
              </label>
              <select
                value={searchConfig.defaultCurrency}
                onChange={(e) =>
                  setSearchConfig({ ...searchConfig, defaultCurrency: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              >
                {searchConfig.supportedCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Default Adult Passengers
              </label>
              <input
                type="number"
                min={1}
                max={9}
                value={searchConfig.defaultAdults}
                onChange={(e) =>
                  setSearchConfig({ ...searchConfig, defaultAdults: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Default Cabin Class
              </label>
              <select
                value={searchConfig.defaultCabinClass}
                onChange={(e) =>
                  setSearchConfig({
                    ...searchConfig,
                    defaultCabinClass: e.target.value as FlightSearchConfig['defaultCabinClass'],
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              >
                <option value="Economy">Economy</option>
                <option value="Premium Economy">Premium Economy</option>
                <option value="Business">Business</option>
                <option value="First Class">First Class</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Offer Cache TTL (Seconds)
              </label>
              <input
                type="number"
                min={30}
                max={3600}
                value={searchConfig.cacheTtlSeconds}
                onChange={(e) =>
                  setSearchConfig({ ...searchConfig, cacheTtlSeconds: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Live Price Freshness Threshold (Seconds)
              </label>
              <input
                type="number"
                min={30}
                max={1800}
                value={searchConfig.priceFreshnessThresholdSeconds}
                onChange={(e) =>
                  setSearchConfig({
                    ...searchConfig,
                    priceFreshnessThresholdSeconds: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Search Rate Limit (Requests / IP / Min)
              </label>
              <input
                type="number"
                min={5}
                max={200}
                value={searchConfig.searchRateLimitPerIpPerMinute}
                onChange={(e) =>
                  setSearchConfig({
                    ...searchConfig,
                    searchRateLimitPerIpPerMinute: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Preferred Primary API Provider
              </label>
              <select
                value={searchConfig.preferredProviderId || 'serpapi'}
                onChange={(e) =>
                  setSearchConfig({
                    ...searchConfig,
                    preferredProviderId: e.target.value as NonNullable<
                      FlightSearchConfig['preferredProviderId']
                    >,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              >
                <option value="serpapi">SerpApi Google Flights Engine ("google_flights" — Primary)</option>
                <option value="amadeus">Amadeus Self-Service Flight Offers API</option>
                <option value="skyscanner">Skyscanner Commercial Partner API</option>
                <option value="flight_aggregator">Secondary Aggregator / GDS Adapter</option>
              </select>
            </div>
          </div>

          {/* Airline Display & Transparency Settings */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Airline Display & Price Transparency Settings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {(
                [
                  {
                    key: 'showAirlineLogos',
                    label: 'Show Official Airline Logos & IATA Codes',
                  },
                  {
                    key: 'showOperatingCarrierDetails',
                    label: 'Show Operating Carrier & Aircraft Details',
                  },
                  {
                    key: 'showBaggageInSummary',
                    label: 'Show Checked Baggage Allowance on Summary Cards',
                  },
                  {
                    key: 'showPriceVerificationBadge',
                    label: 'Show Explicit Price Transparency Status Badges',
                  },
                  {
                    key: 'prioritizeKoreanCarriers',
                    label: 'Highlight Korean National Carriers (KE / OZ)',
                  },
                ] as const
              ).map((setting) => {
                const currentSettings = searchConfig.airlineDisplaySettings || {
                  showAirlineLogos: true,
                  showOperatingCarrierDetails: true,
                  showBaggageInSummary: true,
                  showPriceVerificationBadge: true,
                  prioritizeKoreanCarriers: true,
                };
                return (
                  <label
                    key={setting.key}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(currentSettings[setting.key])}
                      onChange={(e) =>
                        setSearchConfig({
                          ...searchConfig,
                          airlineDisplaySettings: {
                            ...currentSettings,
                            [setting.key]: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {setting.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Search Configuration
            </button>
          </div>
        </form>
      )}

      {/* MODAL: CONFIGURE SERVER-SIDE API CREDENTIALS */}
      {credentialModalProvider && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Server Credentials — {credentialModalProvider.name}
                  </h3>
                  {(credentialModalProvider.isPrimary ??
                    (searchConfig?.preferredProviderId || 'serpapi') ===
                      credentialModalProvider.id) && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white whitespace-nowrap">
                      Primary Provider
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Current Backend Status:{' '}
                  <span
                    className={`font-semibold ${
                      credentialModalProvider.credentialsConfigured
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {credentialModalProvider.credentialsConfigured
                      ? credentialModalProvider.credentialSource === 'server_vault'
                        ? 'Configured in Server Vault (Secret Hidden)'
                        : 'Configured via Server Environment (Secret Hidden)'
                      : 'Not Configured on Server'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCredentialModalProvider(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                Write-only server storage: credentials (<code className="font-mono font-bold">SERPAPI_API_KEY</code>, <code className="font-mono font-bold">AMADEUS_CLIENT_ID</code>, <code className="font-mono font-bold">AMADEUS_CLIENT_SECRET</code>, <code className="font-mono font-bold">SKYSCANNER_API_KEY</code>) are transmitted once over HTTPS to the backend server and never returned to the browser.
              </div>
            </div>

            <form onSubmit={handleSaveApiCredentials} className="space-y-3.5">
              {credentialModalProvider.id === 'serpapi' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Search Engine & Environment
                    </label>
                    <div className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span>SerpApi Google Flights Live Engine</span>
                      <code className="font-mono text-blue-600 dark:text-sky-300">engine=google_flights</code>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase text-slate-500">
                      SERPAPI_API_KEY (Server-Side Secret)
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={
                        credentialModalProvider.credentialsConfigured
                          ? '•••••••••••••••• (Enter new SERPAPI_API_KEY to rotate)'
                          : 'Enter server-side SERPAPI_API_KEY...'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                    <p className="text-[11px] text-slate-500">
                      Powers primary live flight search, round-trip/one-way pricing, airline & stops filters, and booking links via <code className="font-mono font-bold">google_flights</code>.
                    </p>
                  </div>
                </>
              ) : credentialModalProvider.id === 'amadeus' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      API Environment
                    </label>
                    <select
                      value={environmentInput}
                      onChange={(e) => setEnvironmentInput(e.target.value as 'test' | 'production')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    >
                      <option value="test">Test / Sandbox Environment</option>
                      <option value="production">Production Environment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      AMADEUS_CLIENT_ID (API Key)
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={clientIdInput}
                      onChange={(e) => setClientIdInput(e.target.value)}
                      placeholder={
                        credentialModalProvider.credentialsConfigured
                          ? '•••••••••••••••• (Enter new Client ID to update)'
                          : 'Enter AMADEUS_CLIENT_ID...'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      AMADEUS_CLIENT_SECRET (API Secret)
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={clientSecretInput}
                      onChange={(e) => setClientSecretInput(e.target.value)}
                      placeholder={
                        credentialModalProvider.credentialsConfigured
                          ? '•••••••••••••••• (Enter new Client Secret to update)'
                          : 'Enter AMADEUS_CLIENT_SECRET...'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      API Environment
                    </label>
                    <select
                      value={environmentInput}
                      onChange={(e) => setEnvironmentInput(e.target.value as 'test' | 'production')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    >
                      <option value="test">Test / Sandbox Environment</option>
                      <option value="production">Production Environment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      {credentialModalProvider.id === 'skyscanner'
                        ? 'SKYSCANNER_API_KEY (Partner Secret)'
                        : 'Partner API Key'}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={
                        credentialModalProvider.credentialsConfigured
                          ? '•••••••••••••••• (Enter new API key to update)'
                          : 'Enter server-side API key...'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                  {credentialModalProvider.partnerApprovalRequired && (
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={partnerApprovedInput}
                        onChange={(e) => setPartnerApprovedInput(e.target.checked)}
                      />
                      <span>Confirm official Skyscanner Commercial Partner approval</span>
                    </label>
                  )}
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  {credentialModalProvider.credentialSource === 'server_vault' && (
                    <button
                      type="button"
                      disabled={savingCredentials}
                      onClick={() => handleClearVaultCredentials(credentialModalProvider)}
                      className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer"
                    >
                      Clear Vault Override
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  <button
                    type="button"
                    disabled={savingCredentials}
                    onClick={() => setCredentialModalProvider(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingCredentials}
                    onClick={() => submitApiCredentials(true)}
                    className="px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-sky-300 text-xs font-bold cursor-pointer"
                  >
                    Save & Test
                  </button>
                  <button
                    type="submit"
                    disabled={savingCredentials}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    {savingCredentials ? 'Saving...' : 'Save to Server'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BOOKING PROVIDER + LIVE CARD PREVIEW */}
      {editingBookingProvider && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isNewBookingProvider ? 'Add Booking Provider' : `Edit ${editingBookingProvider.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBookingProvider(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBookingProvider} className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBookingProvider.name}
                    onChange={(e) =>
                      setEditingBookingProvider({ ...editingBookingProvider, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Type
                    </label>
                    <select
                      value={editingBookingProvider.type}
                      onChange={(e) =>
                        setEditingBookingProvider({
                          ...editingBookingProvider,
                          type: e.target.value as BookingProviderRecord['type'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                    >
                      <option value="ota">OTA (Online Travel Agency)</option>
                      <option value="metasearch">Metasearch Engine</option>
                      <option value="airline">Official Airline</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingBookingProvider.displayOrder}
                      onChange={(e) =>
                        setEditingBookingProvider({
                          ...editingBookingProvider,
                          displayOrder: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Official Website URL (HTTPS required)
                  </label>
                  <input
                    type="url"
                    required
                    value={editingBookingProvider.officialUrl}
                    onChange={(e) =>
                      setEditingBookingProvider({
                        ...editingBookingProvider,
                        officialUrl: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Approved Affiliate Redirect URL (Optional HTTPS)
                  </label>
                  <input
                    type="url"
                    value={editingBookingProvider.affiliateBaseUrl}
                    onChange={(e) =>
                      setEditingBookingProvider({
                        ...editingBookingProvider,
                        affiliateBaseUrl: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    required
                    value={editingBookingProvider.logoUrl}
                    onChange={(e) =>
                      setEditingBookingProvider({
                        ...editingBookingProvider,
                        logoUrl: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editingBookingProvider.description}
                    onChange={(e) =>
                      setEditingBookingProvider({
                        ...editingBookingProvider,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Live Card Preview */}
              <div className="md:col-span-5 flex flex-col justify-between bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    Live Directory Card Preview
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <img
                        src={editingBookingProvider.logoUrl}
                        alt={editingBookingProvider.name || 'Preview'}
                        className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-200"
                      />
                      {editingBookingProvider.badgeText && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                          {editingBookingProvider.badgeText}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {editingBookingProvider.name || 'Provider Name'}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                      {editingBookingProvider.description || 'Provider description will appear here.'}
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                        Visit Website
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingBookingProvider(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Save Provider
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFlightManagementTab;
