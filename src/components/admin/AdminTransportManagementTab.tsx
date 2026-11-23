import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bus,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileClock,
  Globe,
  KeyRound,
  Lock,
  Plane,
  Play,
  Plus,
  Power,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Terminal,
  TrainFront,
  Trash2,
  XCircle,
} from 'lucide-react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getVerifiedAdminRequestHeaders } from '../../services/firebaseService';
import { AdminFlightManagementTab } from './AdminFlightManagementTab';
import { AdminTransportHubSection } from './AdminTransportHubSection';
import {
  AdminTransportProviderView,
  TransportCategory,
  TransportProviderEditorModal,
} from './TransportProviderEditorModal';

export type TransportManagementSection =
  | 'flight_api'
  | 'ktx_api'
  | 'bus_api'
  | 'provider_settings'
  | 'health_logs';

interface TransportApiLogEntry {
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

interface TransportApiAuditEntry {
  id: string;
  timestamp: string;
  adminUid: string;
  adminEmail: string;
  adminName: string;
  action: string;
  transportType: TransportCategory;
  providerId: string;
  providerName: string;
  summary: string;
}

interface TransportHealthSummary {
  totalProviders: number;
  activeProvidersCount: number;
  inactiveProvidersCount: number;
  healthyProvidersCount: number;
  erroredProvidersCount: number;
  totalRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number | null;
}

interface AdminTransportManagementTabProps {
  initialSection?: TransportManagementSection;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function getHealthBadge(health: AdminTransportProviderView['connectionHealth']) {
  switch (health) {
    case 'healthy':
      return {
        label: 'Connected',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      };
    case 'degraded':
      return {
        label: 'Degraded',
        cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
      };
    case 'error':
      return {
        label: 'Error',
        cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
        dot: 'bg-red-500',
      };
    case 'unconfigured':
      return {
        label: 'Key Required',
        cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        dot: 'bg-slate-400',
      };
    default:
      return {
        label: 'Untested',
        cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
        dot: 'bg-sky-500',
      };
  }
}

const AUTH_TYPE_LABELS: Record<string, string> = {
  api_key_query: 'API Key (Query)',
  api_key_header: 'API Key (Header)',
  bearer_token: 'Bearer Token',
  oauth2_client_credentials: 'OAuth2 Client',
  basic_auth: 'Basic Auth',
  none: 'Public / None',
};

export const AdminTransportManagementTab: React.FC<AdminTransportManagementTabProps> = ({
  initialSection = 'flight_api',
}) => {
  const [section, setSection] = useState<TransportManagementSection>(initialSection);
  const [providers, setProviders] = useState<AdminTransportProviderView[]>([]);
  const [summary, setSummary] = useState<TransportHealthSummary | null>(null);
  const [logs, setLogs] = useState<TransportApiLogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<TransportApiAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorDefaultType, setEditorDefaultType] = useState<TransportCategory>('flight');
  const [editingProvider, setEditingProvider] = useState<AdminTransportProviderView | null>(null);
  const [savingModal, setSavingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Inline delete confirmation state (never use window.confirm/alert)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Sub-views
  const [showLegacyFlightConsole, setShowLegacyFlightConsole] = useState(false);
  const [settingsCategoryFilter, setSettingsCategoryFilter] = useState<'all' | TransportCategory>('all');
  const [logFilterType, setLogFilterType] = useState<'all' | TransportCategory>('all');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'success' | 'error'>('all');

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const mirrorProviderMetadataToFirestore = useCallback(
    async (p: AdminTransportProviderView, audit?: TransportApiAuditEntry) => {
      try {
        // Strictly non-secret metadata only — never write raw keys or ciphertexts to Firestore
        await setDoc(
          doc(db, 'transport_api_providers', p.id),
          {
            id: p.id,
            name: p.name,
            transportType: p.transportType,
            adapterType: p.adapterType,
            apiBaseUrl: p.apiBaseUrl,
            searchEndpoint: p.searchEndpoint,
            authType: p.authType,
            environment: p.environment,
            status: p.status,
            priority: p.priority,
            timeoutMs: p.timeoutMs,
            rateLimitPerMinute: p.rateLimitPerMinute,
            defaultCurrency: p.defaultCurrency,
            redirectUrl: p.redirectUrl,
            connectionHealth: p.connectionHealth,
            maskedApiKey: p.maskedApiKey || '',
            updatedAt: p.updatedAt,
            updatedBy: p.updatedBy,
          },
          { merge: true }
        );
        if (audit) {
          await setDoc(doc(db, 'transport_api_audit_logs', audit.id), {
            id: audit.id,
            timestamp: audit.timestamp,
            adminUid: audit.adminUid,
            adminEmail: audit.adminEmail,
            adminName: audit.adminName,
            action: audit.action,
            transportType: audit.transportType,
            providerId: audit.providerId,
            providerName: audit.providerName,
            summary: audit.summary,
          });
        }
      } catch {
        // Server vault remains authoritative even if Firestore rules/network delay occurs
      }
    },
    []
  );

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = await getVerifiedAdminRequestHeaders();
      const res = await fetch('/api/admin/transport/health', { headers });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load Transport API Management data.');
      }
      setProviders(data.providers || []);
      setSummary(data.summary || null);
      setLogs(data.recentLogs || []);
      setAuditLogs(data.auditLogs || []);
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to load Transport API registry.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  const openCreateModal = (type: TransportCategory) => {
    setEditorMode('create');
    setEditorDefaultType(type);
    setEditingProvider(null);
    setModalError(null);
    setEditorOpen(true);
  };

  const openEditModal = (p: AdminTransportProviderView) => {
    setEditorMode('edit');
    setEditorDefaultType(p.transportType);
    setEditingProvider(p);
    setModalError(null);
    setEditorOpen(true);
  };

  const handleSaveProvider = async (payload: Record<string, unknown>, existingId?: string) => {
    setSavingModal(true);
    setModalError(null);
    try {
      const headers = await getVerifiedAdminRequestHeaders();
      const isEdit = Boolean(existingId);
      const url = isEdit
        ? `/api/admin/transport/providers/${encodeURIComponent(existingId!)}`
        : '/api/admin/transport/providers';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setModalError(data.error || 'Failed to save provider configuration.');
        return;
      }
      if (data.provider) {
        await mirrorProviderMetadataToFirestore(data.provider, data.auditEntry);
      }
      setEditorOpen(false);
      setNotice({
        type: 'success',
        message: isEdit
          ? `Updated "${data.provider?.name}" and synchronized live public transport search.`
          : `Added "${data.provider?.name}" to the Transport API Registry.`,
      });
      await fetchDashboard(true);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Network error saving provider.');
    } finally {
      setSavingModal(false);
    }
  };

  const handleToggleStatus = async (p: AdminTransportProviderView) => {
    setTogglingId(p.id);
    setNotice(null);
    try {
      const nextStatus = p.status === 'active' ? 'inactive' : 'active';
      const headers = await getVerifiedAdminRequestHeaders();
      const res = await fetch(`/api/admin/transport/providers/${encodeURIComponent(p.id)}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to toggle provider status.');
      }
      if (data.provider) {
        await mirrorProviderMetadataToFirestore(data.provider, data.auditEntry);
      }
      setNotice({
        type: 'success',
        message: `${p.name} is now ${nextStatus.toUpperCase()} for public ${p.transportType.toUpperCase()} search.`,
      });
      await fetchDashboard(true);
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to update status.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteProvider = async (p: AdminTransportProviderView) => {
    setNotice(null);
    try {
      const headers = await getVerifiedAdminRequestHeaders();
      const res = await fetch(`/api/admin/transport/providers/${encodeURIComponent(p.id)}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to remove provider.');
      }
      try {
        await deleteDoc(doc(db, 'transport_api_providers', p.id));
        if (data.auditEntry) {
          await setDoc(doc(db, 'transport_api_audit_logs', data.auditEntry.id), data.auditEntry);
        }
      } catch {
        // Ignore Firestore sync warning
      }
      setPendingDeleteId(null);
      setNotice({
        type: 'success',
        message: `Removed custom provider "${p.name}" and purged its encrypted credentials.`,
      });
      await fetchDashboard(true);
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to delete provider.',
      });
    }
  };

  const handleTestConnection = async (p: AdminTransportProviderView) => {
    setTestingId(p.id);
    setNotice(null);
    try {
      const headers = await getVerifiedAdminRequestHeaders();
      const res = await fetch(`/api/admin/transport/providers/${encodeURIComponent(p.id)}/test`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.provider) {
        await mirrorProviderMetadataToFirestore(data.provider, data.auditEntry);
      }
      if (data.health) {
        setProviders(data.health.providers || []);
        setSummary(data.health.summary || null);
        setLogs(data.health.recentLogs || []);
        setAuditLogs(data.health.auditLogs || []);
      } else {
        await fetchDashboard(true);
      }
      setNotice({
        type: data.connected ? 'success' : 'error',
        message: `${p.name}: ${data.message}${
          typeof data.responseTimeMs === 'number' ? ` (${data.responseTimeMs} ms)` : ''
        }`,
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Connection test failed.',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleTestAllActive = async () => {
    const activeList = providers.filter((p) => p.status === 'active');
    if (activeList.length === 0) return;
    setTestingAll(true);
    setNotice(null);
    let passed = 0;
    try {
      const headers = await getVerifiedAdminRequestHeaders();
      for (const p of activeList) {
        const res = await fetch(`/api/admin/transport/providers/${encodeURIComponent(p.id)}/test`, {
          method: 'POST',
          headers,
        });
        const data = await res.json();
        if (data.connected) passed += 1;
      }
      await fetchDashboard(true);
      setNotice({
        type: passed === activeList.length ? 'success' : 'error',
        message: `Completed live health check for ${activeList.length} active providers: ${passed} connected, ${
          activeList.length - passed
        } require attention.`,
      });
    } finally {
      setTestingAll(false);
    }
  };

  const flightProviders = useMemo(
    () => providers.filter((p) => p.transportType === 'flight'),
    [providers]
  );
  const ktxProviders = useMemo(
    () => providers.filter((p) => p.transportType === 'ktx'),
    [providers]
  );
  const busProviders = useMemo(
    () => providers.filter((p) => p.transportType === 'bus'),
    [providers]
  );

  const filteredSettingsProviders = useMemo(() => {
    if (settingsCategoryFilter === 'all') return providers;
    return providers.filter((p) => p.transportType === settingsCategoryFilter);
  }, [providers, settingsCategoryFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (logFilterType !== 'all' && l.transportType !== logFilterType) return false;
      if (logStatusFilter === 'success' && !l.success) return false;
      if (logStatusFilter === 'error' && l.success) return false;
      return true;
    });
  }, [logs, logFilterType, logStatusFilter]);

  // Reusable category provider management view (Flight / KTX / Bus)
  const renderCategoryManager = (
    category: TransportCategory,
    title: string,
    subtitle: string,
    list: AdminTransportProviderView[]
  ) => {
    const catLogs = logs.filter((l) => l.transportType === category).slice(0, 12);
    const activeCount = list.filter((p) => p.status === 'active').length;

    return (
      <div className="space-y-6">
        {/* Category Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#10243A] p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-sky-50 dark:bg-sky-950/60 text-[#0754B8] dark:text-sky-300 border border-sky-200 dark:border-sky-800 tabular-nums">
                {activeCount} Active / {list.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {category === 'flight' && (
              <button
                type="button"
                onClick={() => setShowLegacyFlightConsole((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>
                  {showLegacyFlightConsole
                    ? 'Hide Booking Directory & Flight Analytics'
                    : 'Booking Directory & Flight Analytics'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openCreateModal(category)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0754B8] hover:bg-[#064599] text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add {category.toUpperCase()} API Provider</span>
            </button>
          </div>
        </div>

        {/* Provider Cards */}
        <div className="space-y-4">
          {list.map((p) => {
            const health = getHealthBadge(p.connectionHealth);
            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-[#10243A] rounded-xl border transition-colors overflow-hidden ${
                  p.status === 'active'
                    ? 'border-slate-200 dark:border-slate-700'
                    : 'border-slate-200/70 dark:border-slate-800 opacity-85'
                }`}
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-[#061B49] text-white tabular-nums">
                        Priority #{p.priority}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded border uppercase ${
                          p.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {p.status}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded border uppercase ${
                          p.environment === 'production'
                            ? 'bg-blue-50 text-[#0754B8] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {p.environment}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded border ${health.cls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
                        {health.label}
                      </span>
                    </div>

                    {p.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">{p.description}</p>
                    )}

                    {/* Endpoint & Security Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          API Base URL &amp; Endpoint
                        </div>
                        <div className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate mt-0.5" title={`${p.apiBaseUrl}${p.searchEndpoint}`}>
                          {p.apiBaseUrl}
                          <span className="text-[#0754B8] dark:text-sky-400">{p.searchEndpoint}</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Auth &amp; Masked Key ({p.encryptionAlgorithm})
                        </div>
                        <div className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                          <span className="font-medium">{AUTH_TYPE_LABELS[p.authType] || p.authType}</span>
                          <span className="text-slate-400">•</span>
                          <code className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                            {p.maskedApiKey || (p.authType === 'none' ? 'Not required' : 'Not set')}
                          </code>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Limits, Currency &amp; Countries
                        </div>
                        <div className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 tabular-nums">
                          {p.timeoutMs} ms • {p.rateLimitPerMinute}/min • {p.defaultCurrency} ({p.supportedCountries.slice(0, 4).join(', ')})
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          External Booking Redirect
                        </div>
                        <a
                          href={p.redirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-[#0754B8] dark:text-sky-400 hover:underline inline-flex items-center gap-1 mt-0.5 max-w-full truncate"
                        >
                          <span className="truncate">{p.redirectUrl.replace(/^https:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>

                    {/* Category-specific config summary */}
                    {category === 'flight' && p.flightConfig && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                        <span>
                          <strong>Engine:</strong> <code className="font-mono">{p.flightConfig.engine || 'default'}</code>
                        </span>
                        <span>
                          <strong>Default Cabin:</strong> {p.flightConfig.defaultCabinClass}
                        </span>
                        <span>
                          <strong>Stops:</strong> {p.flightConfig.defaultStops}
                        </span>
                        <span>
                          <strong>Max Results:</strong> {p.flightConfig.maxResults}
                        </span>
                      </div>
                    )}

                    {category === 'ktx' && p.ktxConfig && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                        <span>
                          <strong>Station Params:</strong>{' '}
                          <code className="font-mono">
                            {p.ktxConfig.departureStationParam} → {p.ktxConfig.arrivalStationParam}
                          </code>
                        </span>
                        <span>
                          <strong>Date/Time:</strong>{' '}
                          <code className="font-mono">{p.ktxConfig.travelDateParam}</code>
                        </span>
                        <span>
                          <strong>Price Field:</strong>{' '}
                          <code className="font-mono">{p.ktxConfig.ticketPriceField}</code>
                        </span>
                        <span>
                          <strong>Trains:</strong> {p.ktxConfig.availableTrainServices.join(', ')}
                        </span>
                      </div>
                    )}

                    {category === 'bus' && p.busConfig && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                        <span>
                          <strong>Mode:</strong> <span className="uppercase">{p.busConfig.busMode}</span>
                        </span>
                        <span>
                          <strong>Terminal Params:</strong>{' '}
                          <code className="font-mono">
                            {p.busConfig.departureTerminalParam} → {p.busConfig.destinationTerminalParam}
                          </code>
                        </span>
                        <span>
                          <strong>Operator/Price:</strong>{' '}
                          <code className="font-mono">
                            {p.busConfig.busOperatorField} / {p.busConfig.ticketPriceField}
                          </code>
                        </span>
                        <span>
                          <strong>Seats Field:</strong>{' '}
                          <code className="font-mono">{p.busConfig.seatAvailabilityField}</code>
                        </span>
                      </div>
                    )}

                    {p.lastErrorMessage && (
                      <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{p.lastErrorMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Row Actions */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={testingId === p.id}
                        onClick={() => handleTestConnection(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#061B49] hover:bg-[#0B2A6B] text-white disabled:opacity-60 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>{testingId === p.id ? 'Testing...' : 'Test Connection'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit &amp; Keys</span>
                      </button>

                      <button
                        type="button"
                        disabled={togglingId === p.id}
                        onClick={() => handleToggleStatus(p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer disabled:opacity-60 ${
                          p.status === 'active'
                            ? 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-950/40'
                            : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/40'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{p.status === 'active' ? 'Disable' : 'Enable'}</span>
                      </button>

                      {!p.isBuiltIn && (
                        pendingDeleteId === p.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteProvider(p)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                            >
                              Confirm Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 cursor-pointer"
                            title="Remove custom provider"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 tabular-nums lg:text-right">
                      <div>
                        Last test: <strong>{formatDateTime(p.lastConnectionTestAt)}</strong>
                      </div>
                      <div>
                        Latency:{' '}
                        <strong>
                          {p.lastResponseTimeMs !== null ? `${p.lastResponseTimeMs} ms` : '—'}
                        </strong>{' '}
                        • Requests: <strong>{p.totalRequests}</strong> ({p.failedRequests} failed)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Category-scoped Recent API Response & Error Logs */}
        <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#0754B8]" />
              Recent {category.toUpperCase()} API Response &amp; Error Logs ({catLogs.length})
            </h4>
            <button
              type="button"
              onClick={() => setSection('health_logs')}
              className="text-xs font-semibold text-[#0754B8] dark:text-sky-400 hover:underline cursor-pointer"
            >
              Open Full Health &amp; Logs →
            </button>
          </div>
          {catLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No {category.toUpperCase()} API requests logged yet. Click &ldquo;Test Connection&rdquo; on any provider above to verify connectivity.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Provider</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Latency</th>
                    <th className="px-4 py-2.5">Detail / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {catLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(l.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {l.providerName}
                      </td>
                      <td className="px-4 py-2.5 uppercase text-[11px] text-slate-600 dark:text-slate-400">
                        {l.action.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {l.success ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            OK {l.httpStatus ? `(${l.httpStatus})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            Failed {l.httpStatus ? `(${l.httpStatus})` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {l.responseTimeMs} ms
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 max-w-md truncate">
                        {l.errorMessage || l.routeSummary || 'Completed successfully'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Preserved Flight Booking Directory & Flight Analytics when toggled inside Flight API Management */}
        {category === 'flight' && showLegacyFlightConsole && (
          <div className="pt-2">
            <AdminFlightManagementTab />
          </div>
        )}
      </div>
    );
  };

  const navItems: {
    id: TransportManagementSection;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: 'flight_api',
      label: 'Flight API Management',
      icon: <Plane className="w-4 h-4" />,
      count: flightProviders.length,
    },
    {
      id: 'ktx_api',
      label: 'KTX API Management',
      icon: <TrainFront className="w-4 h-4" />,
      count: ktxProviders.length,
    },
    {
      id: 'bus_api',
      label: 'Bus API Management',
      icon: <Bus className="w-4 h-4" />,
      count: busProviders.length,
    },
    {
      id: 'provider_settings',
      label: 'API Provider Settings',
      icon: <Settings2 className="w-4 h-4" />,
    },
    {
      id: 'health_logs',
      label: 'API Health & Logs',
      icon: <Activity className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: EveryKR Transport Management Control Center */}
      <div className="bg-[#061B49] text-white rounded-xl p-6 border border-[#0D2D6E] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
              <Server className="w-3.5 h-3.5" />
              <span>EveryKR Transport Management • Dynamic API Control Plane</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Transport API Management System (Flight • KTX • Bus)
            </h2>
            <p className="text-xs text-sky-100/85 max-w-3xl">
              Configure, switch, encrypt, and monitor live transport data providers in real time without redeploying the frontend. EveryKR displays official schedules and prices for comparison only and redirects travelers to official external booking portals.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => fetchDashboard(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
            <button
              type="button"
              onClick={() => openCreateModal(section === 'ktx_api' ? 'ktx' : section === 'bus_api' ? 'bus' : 'flight')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0754B8] hover:bg-[#0964DB] text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add API Provider</span>
            </button>
          </div>
        </div>

        {/* 5-Section Transport Management Sub-Navigation */}
        <div className="mt-5 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white text-[#061B49] shadow-xs'
                    : 'text-sky-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.count === 'number' && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded tabular-nums ${
                      active ? 'bg-[#0754B8] text-white' : 'bg-white/15 text-sky-100'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Feedback Notice */}
      {notice && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-sm text-slate-500">
          Loading Transport API Management Registry...
        </div>
      ) : (
        <>
          {/* SECTION 1: FLIGHT API MANAGEMENT */}
          {section === 'flight_api' &&
            renderCategoryManager(
              'flight',
              'Flight API Management',
              'Manage live airline search providers (SerpApi Google Flights, Amadeus v2, Skyscanner v3, or custom REST APIs). Priority #1 active provider is automatically used for public Airline searches.',
              flightProviders
            )}

          {/* SECTION 2: KTX API MANAGEMENT */}
          {section === 'ktx_api' &&
            renderCategoryManager(
              'ktx',
              'KTX Train API Management',
              'Manage official Korean rail schedule providers (Korea TAGO TrainInfoService or custom REST rail APIs) with station/date/passenger mappings and Korail / SRT external redirects.',
              ktxProviders
            )}

          {/* SECTION 3: BUS API MANAGEMENT */}
          {section === 'bus_api' &&
            renderCategoryManager(
              'bus',
              'Bus API Management',
              'Manage Korean Express Bus (고속버스) and Intercity Bus (시외버스) timetable providers with terminal/operator/seat/fare mappings and Kobus / Bustago / TxBus external booking URLs.',
              busProviders
            )}

          {/* SECTION 4: API PROVIDER SETTINGS */}
          {section === 'provider_settings' && (
            <div className="space-y-6">
              {/* Server-Side Encryption Security Policy Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="font-bold">
                    Server-Side Credential Encryption &amp; Zero-Exposure Policy
                  </div>
                  <p>
                    All API keys (<code className="font-mono">SERPAPI_API_KEY</code>,{' '}
                    <code className="font-mono">AMADEUS_CLIENT_ID/SECRET</code>,{' '}
                    <code className="font-mono">SKYSCANNER_API_KEY</code>,{' '}
                    <code className="font-mono">DATA_GO_KR_SERVICE_KEY</code>, and custom provider secrets) are encrypted at rest with <strong>AES-256-GCM</strong> on the server, masked in this console, strictly restricted to verified Administrators, and never exposed to public endpoints, browser bundles, or Firestore documents.
                  </p>
                </div>
              </div>

              {/* Unified Dynamic Provider Matrix Table */}
              <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Unified Dynamic Provider Registry ({filteredSettingsProviders.length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Toggle active providers, adjust execution priority, or switch Sandbox/Production across Flight, KTX, and Bus without redeploying.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['all', 'flight', 'ktx', 'bus'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSettingsCategoryFilter(cat)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg uppercase cursor-pointer ${
                          settingsCategoryFilter === cat
                            ? 'bg-[#061B49] text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Provider Name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">API Base URL</th>
                        <th className="px-4 py-3">Auth / Masked Key</th>
                        <th className="px-4 py-3">Env</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Last Test / Health</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSettingsProviders.map((p) => {
                        const health = getHealthBadge(p.connectionHealth);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                            <td className="px-4 py-3 font-bold tabular-nums text-[#061B49] dark:text-sky-300">
                              #{p.priority}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {p.name}
                            </td>
                            <td className="px-4 py-3 uppercase font-semibold text-slate-600 dark:text-slate-300">
                              {p.transportType}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                              {p.apiBaseUrl}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-slate-700 dark:text-slate-300">
                                {AUTH_TYPE_LABELS[p.authType] || p.authType}
                              </div>
                              <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>{p.maskedApiKey || 'Not configured'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 uppercase text-[11px] font-semibold">
                              <span
                                className={
                                  p.environment === 'production'
                                    ? 'text-[#0754B8] dark:text-sky-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }
                              >
                                {p.environment}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                disabled={togglingId === p.id}
                                onClick={() => handleToggleStatus(p)}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase border cursor-pointer ${
                                  p.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}
                              >
                                {p.status}
                              </button>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded border ${health.cls}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
                                {health.label}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {formatDateTime(p.lastConnectionTestAt)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={testingId === p.id}
                                  onClick={() => handleTestConnection(p)}
                                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#061B49] text-white hover:bg-[#0B2A6B] cursor-pointer disabled:opacity-60"
                                >
                                  {testingId === p.id ? '...' : 'Test'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(p)}
                                  className="px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Global Transport Hub Controls (Service Visibility, External Booking URLs, Announcements) */}
              <div className="pt-2">
                <AdminTransportHubSection />
              </div>
            </div>
          )}

          {/* SECTION 5: API HEALTH & LOGS */}
          {section === 'health_logs' && (
            <div className="space-y-6">
              {/* KPI Health Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Active Providers
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                    {summary?.activeProvidersCount ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    of {summary?.totalProviders ?? providers.length} registered
                  </div>
                </div>

                <div className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Inactive Providers
                  </div>
                  <div className="text-2xl font-bold text-slate-700 dark:text-slate-300 tabular-nums mt-1">
                    {summary?.inactiveProvidersCount ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Paused from public search</div>
                </div>

                <div className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Healthy Connections
                  </div>
                  <div className="text-2xl font-bold text-[#0754B8] dark:text-sky-400 tabular-nums mt-1">
                    {summary?.healthyProvidersCount ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {summary?.erroredProvidersCount ?? 0} reporting errors
                  </div>
                </div>

                <div className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Avg Response Time
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                    {summary?.avgResponseTimeMs !== null && summary?.avgResponseTimeMs !== undefined
                      ? `${summary.avgResponseTimeMs} ms`
                      : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Across live &amp; probe calls</div>
                </div>

                <div className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Failed Requests
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-1">
                    {summary?.failedRequests ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    of {summary?.totalRequests ?? 0} total requests
                  </div>
                </div>
              </div>

              {/* Provider Live Health Matrix */}
              <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#0754B8]" />
                      Provider Connection Health &amp; Synchronization Monitor
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Run manual connection probes or inspect latency, last successful synchronization, and error messages per provider.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={testingAll}
                    onClick={handleTestAllActive}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0754B8] hover:bg-[#064599] text-white disabled:opacity-60 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{testingAll ? 'Testing Active Providers...' : 'Test All Active Providers'}</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Provider</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Connection Health</th>
                        <th className="px-4 py-3">Last Successful Sync</th>
                        <th className="px-4 py-3">Last Connection Test</th>
                        <th className="px-4 py-3">Response Time</th>
                        <th className="px-4 py-3">Failed / Total</th>
                        <th className="px-4 py-3">Last Error Message</th>
                        <th className="px-4 py-3 text-right">Manual Probe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {providers.map((p) => {
                        const health = getHealthBadge(p.connectionHealth);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {p.name}
                              </div>
                              <div className="text-[10px] uppercase text-slate-500">
                                {p.transportType} • {p.environment}
                              </div>
                            </td>
                            <td className="px-4 py-3 uppercase font-semibold">
                              <span
                                className={
                                  p.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                                }
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded border ${health.cls}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
                                {health.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 tabular-nums">
                              {formatDateTime(p.lastSuccessfulSyncAt)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 tabular-nums">
                              {formatDateTime(p.lastConnectionTestAt)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                              {p.lastResponseTimeMs !== null ? `${p.lastResponseTimeMs} ms` : '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                              <span className={p.failedRequests > 0 ? 'text-red-600 font-semibold' : ''}>
                                {p.failedRequests}
                              </span>{' '}
                              / {p.totalRequests}
                            </td>
                            <td className="px-4 py-3 max-w-xs truncate text-red-600 dark:text-red-400">
                              {p.lastErrorMessage || (
                                <span className="text-slate-400">No active errors</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                disabled={testingId === p.id}
                                onClick={() => handleTestConnection(p)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-[#061B49] hover:bg-[#0B2A6B] text-white disabled:opacity-60 cursor-pointer"
                              >
                                <Play className="w-3 h-3" />
                                <span>{testingId === p.id ? 'Testing...' : 'Test Connection'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Filterable API Request & Error Logs */}
              <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#0754B8]" />
                    API Request &amp; Error Logs ({filteredLogs.length})
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={logFilterType}
                      onChange={(e) => setLogFilterType(e.target.value as 'all' | TransportCategory)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="all">All Categories</option>
                      <option value="flight">Flight</option>
                      <option value="ktx">KTX</option>
                      <option value="bus">Bus</option>
                    </select>
                    <select
                      value={logStatusFilter}
                      onChange={(e) =>
                        setLogStatusFilter(e.target.value as 'all' | 'success' | 'error')
                      }
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="all">All Statuses</option>
                      <option value="success">Successful Only</option>
                      <option value="error">Errors Only</option>
                    </select>
                  </div>
                </div>
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No matching API request logs recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Timestamp</th>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5">Provider</th>
                          <th className="px-4 py-2.5">Event</th>
                          <th className="px-4 py-2.5">Outcome</th>
                          <th className="px-4 py-2.5">Latency</th>
                          <th className="px-4 py-2.5">Route / Error Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredLogs.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {formatDateTime(l.timestamp)}
                            </td>
                            <td className="px-4 py-2.5 uppercase font-semibold text-slate-600 dark:text-slate-300">
                              {l.transportType}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {l.providerName}
                            </td>
                            <td className="px-4 py-2.5 uppercase text-[11px] text-slate-500">
                              {l.action.replace('_', ' ')}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {l.success ? (
                                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                  SUCCESS {l.httpStatus ? `(${l.httpStatus})` : ''}
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400 font-semibold">
                                  ERROR {l.httpStatus ? `(${l.httpStatus})` : ''}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums whitespace-nowrap">
                              {l.responseTimeMs} ms
                            </td>
                            <td className="px-4 py-2.5 max-w-md truncate text-slate-600 dark:text-slate-300">
                              {l.errorMessage || l.routeSummary || 'OK'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Immutable Configuration Audit Log */}
              <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileClock className="w-4 h-4 text-[#0754B8]" />
                      Immutable API Configuration Audit Log ({auditLogs.length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Every provider addition, edit, status change, priority change, key rotation, and connection test is permanently logged.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Secrets Redacted</span>
                  </span>
                </div>
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No configuration changes recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Timestamp</th>
                          <th className="px-4 py-2.5">Admin</th>
                          <th className="px-4 py-2.5">Action</th>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5">Provider</th>
                          <th className="px-4 py-2.5">Summary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {auditLogs.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              <Clock className="w-3 h-3 inline mr-1 opacity-60" />
                              {formatDateTime(a.timestamp)}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {a.adminName}
                              </div>
                              <div className="text-[10px] text-slate-500">{a.adminEmail}</div>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {a.action}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 uppercase font-semibold text-slate-600 dark:text-slate-300">
                              {a.transportType}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {a.providerName}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                              {a.summary}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit / Encrypted Credentials Modal */}
      {editorOpen && (
        <TransportProviderEditorModal
          mode={editorMode}
          defaultType={editorDefaultType}
          provider={editingProvider}
          saving={savingModal}
          error={modalError}
          onClose={() => setEditorOpen(false)}
          onSave={handleSaveProvider}
        />
      )}
    </div>
  );
};
