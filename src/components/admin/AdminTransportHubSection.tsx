import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bus,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Megaphone,
  Plane,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  TrainFront,
  Trash2,
  X,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import { getVerifiedAdminRequestHeaders } from '../../services/firebaseService';
import type {
  FeaturedRouteItem,
  OfficialExternalBookingUrls,
  TransportAnnouncementItem,
} from '../transport/transportTypes';

interface AdminTransportHubConfig {
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
  cacheTtlSeconds: number;
  rateLimitPerIpPerMinute: number;
  updatedAt: string;
  updatedBy: string;
}

interface TagoProviderStatus {
  providerId: string;
  providerName: string;
  requiredEnvKey: string;
  configured: boolean;
  credentialSource: 'env_var' | 'server_vault' | 'not_configured';
  connected: boolean;
  lastHealthCheck: {
    checkedAt: string | null;
    connected: boolean;
    statusCode: string;
    responseTimeMs: number | null;
    message: string;
  };
  servicesCovered: string[];
}

interface ModeAnalytics {
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

export const AdminTransportHubSection: React.FC = () => {
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTago, setTestingTago] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [config, setConfig] = useState<AdminTransportHubConfig | null>(null);
  const [tagoProvider, setTagoProvider] = useState<TagoProviderStatus | null>(null);
  const [analytics, setAnalytics] = useState<{ ktx: ModeAnalytics; bus: ModeAnalytics } | null>(null);
  const [stationsCount, setStationsCount] = useState(0);
  const [terminalsCount, setTerminalsCount] = useState(0);

  // Server-side TAGO key modal input (never populated with existing secret)
  const [tagoKeyInput, setTagoKeyInput] = useState('');
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMessage, setNewAnnMessage] = useState('');
  const [newAnnService, setNewAnnService] = useState<'all' | 'airline' | 'ktx' | 'bus'>('all');

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  };

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const headers = await getVerifiedAdminRequestHeaders(currentUser, false);
      const res = await fetch('/api/admin/transport/overview', { headers });
      const data = await res.json();
      if (res.ok && data.ok) {
        setConfig(data.config);
        setTagoProvider(data.tagoProvider);
        setAnalytics(data.analytics);
        setStationsCount(data.stationsCount || 0);
        setTerminalsCount(data.terminalsCount || 0);
      } else {
        showNotice('error', data.error || 'Could not load Transport Hub admin overview.');
      }
    } catch {
      showNotice('error', 'Network error loading Transport Hub administration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [currentUser?.id, currentUser?.email]);

  const handleSaveConfig = async (nextConfig: AdminTransportHubConfig) => {
    setSaving(true);
    try {
      const headers = await getVerifiedAdminRequestHeaders(currentUser, true);
      const res = await fetch('/api/admin/transport/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify(nextConfig),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setConfig(data.config);
        // Sync strictly non-secret public hub config to Firestore site_settings
        try {
          await setDoc(
            doc(db, 'site_settings', 'transport_hub_config'),
            {
              services: data.config.services,
              externalBookingUrls: data.config.externalBookingUrls,
              announcements: data.config.announcements,
              featuredRoutes: data.config.featuredRoutes,
              updatedAt: data.config.updatedAt,
              updatedBy: data.config.updatedBy,
            },
            { merge: true }
          );
        } catch {
          // Server config remains authoritative
        }
        showNotice('success', 'Smart Transportation Hub settings saved.');
      } else {
        showNotice('error', data.error || 'Could not save Transport Hub settings.');
      }
    } catch {
      showNotice('error', 'Network error saving Transport Hub settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTagoKey = async (clear = false) => {
    if (!clear && !tagoKeyInput.trim()) {
      showNotice('error', 'Please enter a valid DATA_GO_KR_SERVICE_KEY.');
      return;
    }
    setSavingKey(true);
    try {
      const headers = await getVerifiedAdminRequestHeaders(currentUser, true);
      const res = await fetch('/api/admin/transport/providers/tago', {
        method: 'PUT',
        headers,
        body: JSON.stringify(clear ? { clearStoredCredentials: true } : { serviceKey: tagoKeyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTagoProvider(data.tagoProvider);
        setTagoKeyInput('');
        showNotice(
          'success',
          clear
            ? 'Cleared server vault TAGO key override.'
            : 'Saved DATA_GO_KR_SERVICE_KEY strictly on the backend server.'
        );
      } else {
        showNotice('error', data.error || 'Failed to update TAGO service key.');
      }
    } catch {
      showNotice('error', 'Network error saving TAGO key.');
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestTago = async () => {
    setTestingTago(true);
    try {
      const headers = await getVerifiedAdminRequestHeaders(currentUser, true);
      const res = await fetch('/api/admin/transport/providers/tago/test', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.tagoProvider) {
        setTagoProvider(data.tagoProvider);
      }
      if (res.ok && data.result?.connected) {
        showNotice('success', data.result.message);
      } else {
        showNotice('error', data.result?.message || data.error || 'TAGO connection test failed.');
      }
    } catch {
      showNotice('error', 'Network error testing TAGO Open API connectivity.');
    } finally {
      setTestingTago(false);
    }
  };

  const handleAddAnnouncement = () => {
    if (!config || !newAnnTitle.trim() || !newAnnMessage.trim()) return;
    const next: AdminTransportHubConfig = {
      ...config,
      announcements: [
        {
          id: `ann_${Date.now()}`,
          title: newAnnTitle.trim(),
          message: newAnnMessage.trim(),
          service: newAnnService,
          severity: 'info',
          enabled: true,
          updatedAt: new Date().toISOString(),
        },
        ...config.announcements,
      ],
    };
    setNewAnnTitle('');
    setNewAnnMessage('');
    handleSaveConfig(next);
  };

  if (loading && !config) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
        Loading Smart Transportation Hub configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Service Visibility Switches */}
      {config && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Smart Transportation Hub Services
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enable or disable Airline, KTX Train, and Bus discovery tabs independently. Directory: {stationsCount} KTX stations · {terminalsCount} bus terminals.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchOverview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                {
                  key: 'airline' as const,
                  title: 'Airline (Flights)',
                  desc: 'SerpApi Google Flights + Amadeus/Skyscanner comparison engine',
                  icon: Plane,
                },
                {
                  key: 'ktx' as const,
                  title: 'KTX Train (Korail / SRT)',
                  desc: 'TAGO TrainInfoService schedules & official rail redirects',
                  icon: TrainFront,
                },
                {
                  key: 'bus' as const,
                  title: 'Bus (Express & Intercity)',
                  desc: 'TAGO ExpBus & SuberbsBus schedules & Kobus/Bustago/TxBus',
                  icon: Bus,
                },
              ]
            ).map((svc) => {
              const Icon = svc.icon;
              const enabled = config.services[svc.key].enabled;
              return (
                <div
                  key={svc.key}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0754B8]/10 text-[#0754B8] dark:bg-sky-500/15 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{svc.title}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{svc.desc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      handleSaveConfig({
                        ...config,
                        services: {
                          ...config.services,
                          [svc.key]: { enabled: !enabled },
                        },
                      })
                    }
                    className={`w-full py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      enabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {enabled ? 'Enabled on Hub' : 'Disabled'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. TAGO Open API (data.go.kr) Server-Side Credentials & Health */}
      {tagoProvider && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {tagoProvider.providerName}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                    tagoProvider.connected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : tagoProvider.configured
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {tagoProvider.connected
                    ? 'Connected & Verified'
                    : tagoProvider.configured
                    ? 'Key Configured'
                    : 'Not Configured'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server env key: <code className="font-mono font-bold text-slate-700 dark:text-slate-200">DATA_GO_KR_SERVICE_KEY</code> · Source: <strong>{tagoProvider.credentialSource}</strong> · Strictly server-side (never exposed to browser or Firestore).
              </p>
            </div>

            <button
              type="button"
              disabled={testingTago}
              onClick={handleTestTago}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer self-start"
            >
              <Activity className={`w-3.5 h-3.5 ${testingTago ? 'animate-spin' : ''}`} />
              {testingTago ? 'Testing TAGO API...' : 'Test Connection'}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0754B8] dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong>Last Health Check ({tagoProvider.lastHealthCheck.statusCode}):</strong>{' '}
              {tagoProvider.lastHealthCheck.message}
              {tagoProvider.lastHealthCheck.checkedAt && (
                <span className="ml-2 text-slate-400">
                  ({new Date(tagoProvider.lastHealthCheck.checkedAt).toLocaleString()})
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={tagoKeyInput}
                onChange={(e) => setTagoKeyInput(e.target.value)}
                placeholder="Enter DATA_GO_KR_SERVICE_KEY (stored strictly in server vault)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
            </div>
            <button
              type="button"
              disabled={savingKey}
              onClick={() => handleSaveTagoKey(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              Save Server Key
            </button>
            {tagoProvider.credentialSource === 'server_vault' && (
              <button
                type="button"
                disabled={savingKey}
                onClick={() => handleSaveTagoKey(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer"
              >
                Clear Vault Key
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Official External Booking URLs */}
      {config && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Official External Booking URLs (HTTPS Only)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage official Korail, SRT, Kobus, Bustago, TxBus, and Kakao T (Taxi Only) redirect destinations.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveConfig(config)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white text-xs font-bold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save URLs
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {(
              [
                ['korailWebUrl', 'Korail Official Website'],
                ['srtWebUrl', 'SRT Official Website'],
                ['kobusWebUrl', 'Kobus (Express Bus)'],
                ['bustagoWebUrl', 'Bustago (Intercity Bus)'],
                ['txbusWebUrl', 'TxBus (T-money Intercity)'],
                ['kakaoTaxiUrl', 'Kakao T (Taxi Only Shortcut)'],
                ['korailTalkAndroidUrl', 'KorailTalk (Google Play)'],
                ['korailTalkIosUrl', 'KorailTalk (App Store)'],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>{label}</span>
                  <a
                    href={config.externalBookingUrls[field]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0754B8] dark:text-sky-400 inline-flex items-center gap-0.5 hover:underline"
                  >
                    Verify <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="url"
                  value={config.externalBookingUrls[field]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      externalBookingUrls: {
                        ...config.externalBookingUrls,
                        [field]: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Transport Hub Announcements */}
      {config && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#0754B8] dark:text-sky-400" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Transport Announcements & Notices
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <input
              type="text"
              value={newAnnTitle}
              onChange={(e) => setNewAnnTitle(e.target.value)}
              placeholder="Announcement title"
              className="md:col-span-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
            <input
              type="text"
              value={newAnnMessage}
              onChange={(e) => setNewAnnMessage(e.target.value)}
              placeholder="Announcement message (e.g., Holiday KTX booking window notice)"
              className="md:col-span-5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
            <select
              value={newAnnService}
              onChange={(e) =>
                setNewAnnService(e.target.value as 'all' | 'airline' | 'ktx' | 'bus')
              }
              className="md:col-span-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="all">All Modes</option>
              <option value="airline">Airline Only</option>
              <option value="ktx">KTX Only</option>
              <option value="bus">Bus Only</option>
            </select>
            <button
              type="button"
              onClick={handleAddAnnouncement}
              className="md:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-[#0754B8] hover:bg-[#0875E8] text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Notice
            </button>
          </div>

          <div className="space-y-2">
            {config.announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{ann.title}</span>
                    <span className="uppercase text-[10px] font-mono text-slate-500">
                      [{ann.service}]
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{ann.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveConfig({
                        ...config,
                        announcements: config.announcements.map((item) =>
                          item.id === ann.id ? { ...item, enabled: !item.enabled } : item
                        ),
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      ann.enabled
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {ann.enabled ? 'Visible' : 'Hidden'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveConfig({
                        ...config,
                        announcements: config.announcements.filter((item) => item.id !== ann.id),
                      })
                    }
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    aria-label="Delete announcement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. KTX & Bus Search Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              { title: 'KTX Train Search Telemetry', data: analytics.ktx, icon: TrainFront },
              { title: 'Express & Intercity Bus Telemetry', data: analytics.bus, icon: Bus },
            ] as const
          ).map(({ title, data, icon: Icon }) => (
            <div
              key={title}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#0754B8] dark:text-sky-400" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h4>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-slate-500">Searches</div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {data.totalSearches}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-slate-500">API OK / Err</div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {data.successfulApiRequests}/{data.failedApiRequests}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="text-slate-500">Avg Latency</div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {data.averageResponseTimeMs !== null ? `${data.averageResponseTimeMs} ms` : '—'}
                  </div>
                </div>
              </div>
              {data.recentSearches.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Recent Searches</div>
                  {data.recentSearches.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.originName} → {item.destinationName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0 tabular-nums">
                        {item.travelDate} · {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
