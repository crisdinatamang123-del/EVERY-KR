import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  FolderCheck,
  KeyRound,
  Mail,
  PanelRightClose,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type {
  AdminLogEntry,
  AdminPlatformNotification,
  AuditLogEntry,
} from '../../types';
import type { TransportManagementSection } from './AdminTransportManagementTab';
import type { UserDatabaseSubTab } from './AdminUserManagementTab';
import type { AdminNavGroup, AdminNavItem, AdminTabId } from './adminNavConfig';

export interface TransportApiHealthSnapshot {
  totalProviders: number;
  activeProvidersCount: number;
  healthyProvidersCount: number;
  erroredProvidersCount: number;
  avgResponseTimeMs: number | null;
  lastCheckedAt: string | null;
  loading: boolean;
}

export interface PendingAdminTask {
  id: string;
  label: string;
  count: number;
  severity: 'attention' | 'normal';
  targetTab: AdminTabId;
  targetTransportSection?: TransportManagementSection;
  targetUserSubTab?: UserDatabaseSubTab;
}

interface AdminRightControlPanelProps {
  activeGroup: AdminNavGroup;
  activeItem: AdminNavItem;
  isOpen: boolean;
  onClose: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  adminEmail: string;
  isSuperAdmin: boolean;
  notifications: AdminPlatformNotification[];
  onMarkNotificationRead: (notifId: string) => void;
  onOpenNotification: (notif: AdminPlatformNotification) => void;
  pendingTasks: PendingAdminTask[];
  recentAdminLogs: AdminLogEntry[];
  recentAuditLogs: AuditLogEntry[];
  apiHealth: TransportApiHealthSnapshot;
  onRefreshAll: () => void;
  onNavigate: (
    tab: AdminTabId,
    options?: {
      transportSection?: TransportManagementSection;
      userSubTab?: UserDatabaseSubTab;
    }
  ) => void;
}

type RightPanelTab = 'context' | 'alerts' | 'activity';

interface QuickActionDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export const AdminRightControlPanel: React.FC<AdminRightControlPanelProps> = ({
  activeGroup,
  activeItem,
  isOpen,
  onClose,
  mobileOpen,
  onCloseMobile,
  adminEmail,
  isSuperAdmin,
  notifications,
  onMarkNotificationRead,
  onOpenNotification,
  pendingTasks,
  recentAdminLogs,
  recentAuditLogs,
  apiHealth,
  onRefreshAll,
  onNavigate,
}) => {
  const [panelTab, setPanelTab] = useState<RightPanelTab>('context');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalPendingCount = pendingTasks.reduce((sum, t) => sum + t.count, 0);

  // Build context-relevant quick actions based on the active module (never duplicating the full left menu)
  const getContextualQuickActions = (): QuickActionDef[] => {
    const go = (
      tab: AdminTabId,
      options?: {
        transportSection?: TransportManagementSection;
        userSubTab?: UserDatabaseSubTab;
      }
    ) => {
      onNavigate(tab, options);
      if (mobileOpen) onCloseMobile();
    };

    switch (activeItem.tab) {
      case 'transport_management':
      case 'flight_management':
        return [
          {
            id: 'qa_api_health',
            label: 'API Health & Logs',
            icon: Activity,
            onClick: () => go('transport_management', { transportSection: 'health_logs' }),
          },
          {
            id: 'qa_provider_settings',
            label: 'API Provider Settings',
            icon: KeyRound,
            onClick: () => go('transport_management', { transportSection: 'provider_settings' }),
          },
          {
            id: 'qa_refresh_api',
            label: 'Refresh Health Status',
            icon: RefreshCw,
            onClick: onRefreshAll,
          },
        ];

      case 'universities':
      case 'programs':
      case 'applications':
        return [
          {
            id: 'qa_uni_apps',
            label: 'Review Applications',
            icon: FileText,
            onClick: () => go('applications'),
          },
          {
            id: 'qa_docs',
            label: 'Verify Documents',
            icon: FolderCheck,
            onClick: () => go('documents'),
          },
          {
            id: 'qa_deadlines',
            label: 'Homepage Deadlines CMS',
            icon: ArrowUpRight,
            onClick: () => go('homepage_cms'),
          },
        ];

      case 'users':
        return [
          {
            id: 'qa_reg_logs',
            label: 'Registration Logs',
            icon: FileText,
            onClick: () => go('users', { userSubTab: 'registration_logs' }),
          },
          {
            id: 'qa_privacy',
            label: 'Privacy Requests',
            icon: ShieldCheck,
            onClick: () => go('users', { userSubTab: 'data_privacy_requests' }),
          },
          {
            id: 'qa_rbac',
            label: 'RBAC Roles',
            icon: Users,
            onClick: () => go('staff'),
          },
        ];

      case 'community_posts':
      case 'community_likes_comments':
      case 'community_users':
      case 'reports':
        return [
          {
            id: 'qa_reports',
            label: 'Moderation Queue',
            icon: AlertTriangle,
            onClick: () => go('reports'),
          },
          {
            id: 'qa_inbox',
            label: 'Contact Inbox',
            icon: Mail,
            onClick: () => go('contact_inbox'),
          },
          {
            id: 'qa_audit',
            label: 'Audit Trail',
            icon: Clock,
            onClick: () => go('audit_logs'),
          },
        ];

      case 'sim_applications':
      case 'arrival_groups':
      case 'sim_exports':
        return [
          {
            id: 'qa_sim_exports',
            label: 'SIM Excel & ZIP Exports',
            icon: Database,
            onClick: () => go('sim_exports'),
          },
          {
            id: 'qa_arrival',
            label: 'Arrival Groups',
            icon: Users,
            onClick: () => go('arrival_groups'),
          },
          {
            id: 'qa_docs_sim',
            label: 'Document Verification',
            icon: FolderCheck,
            onClick: () => go('documents'),
          },
        ];

      default:
        return [
          {
            id: 'qa_user_db',
            label: 'User Database & Export',
            icon: Database,
            onClick: () => go('users', { userSubTab: 'users' }),
          },
          {
            id: 'qa_api_check',
            label: 'API Health & Logs',
            icon: Server,
            onClick: () => go('transport_management', { transportSection: 'health_logs' }),
          },
          {
            id: 'qa_settings',
            label: 'System Settings',
            icon: Settings,
            onClick: () => go('site_settings'),
          },
          {
            id: 'qa_audit_default',
            label: 'Audit Trail',
            icon: Clock,
            onClick: () => go('audit_logs'),
          },
        ];
    }
  };

  const quickActions = getContextualQuickActions();

  const renderPanelContent = (isDrawer: boolean) => (
    <div className="flex flex-col h-full min-h-0">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-sky-200/60 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
            Control Panel
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {activeGroup.label}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRefreshAll}
            title="Refresh notifications, tasks & API health"
            aria-label="Refresh contextual panel data"
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0754B8] dark:text-slate-400 dark:hover:text-[#60A5FA] hover:bg-sky-100/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${apiHealth.loading ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={isDrawer ? onCloseMobile : onClose}
            title="Close control panel"
            aria-label="Close control panel"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-sky-100/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isDrawer ? (
              <X className="w-4 h-4" />
            ) : (
              <PanelRightClose className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Segmented View Switcher */}
      <div className="px-3 py-2.5 border-b border-sky-200/50 dark:border-white/8 shrink-0">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-sky-50/90 dark:bg-white/5 border border-sky-200/50 dark:border-white/8">
          <button
            type="button"
            onClick={() => setPanelTab('context')}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              panelTab === 'context'
                ? 'bg-white dark:bg-[#0E2240] text-[#0754B8] dark:text-[#60A5FA] shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Context
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('alerts')}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
              panelTab === 'alerts'
                ? 'bg-white dark:bg-[#0E2240] text-[#0754B8] dark:text-[#60A5FA] shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Alerts</span>
            {unreadCount > 0 && (
              <span className="font-mono tabular-nums text-[10px] font-bold text-rose-600 dark:text-rose-400">
                ({unreadCount})
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('activity')}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              panelTab === 'activity'
                ? 'bg-white dark:bg-[#0E2240] text-[#0754B8] dark:text-[#60A5FA] shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Activity
          </button>
        </div>
      </div>

      {/* Scrollable Contextual Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {panelTab === 'context' && (
          <>
            {/* Active Module Context */}
            <section className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#0754B8] dark:text-[#60A5FA]">
                Active Module
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {activeItem.label}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeItem.description}
              </p>
            </section>

            {/* Quick Actions */}
            <section className="pt-4 border-t border-sky-200/50 dark:border-white/10 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                <Zap className="w-3.5 h-3.5 text-[#0875E8] dark:text-[#60A5FA]" />
                <span>Quick Actions</span>
              </div>
              <div className="space-y-1.5">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-sky-50/70 dark:bg-white/5 hover:bg-[#0875E8]/10 dark:hover:bg-[#0875E8]/20 hover:text-[#0754B8] dark:hover:text-[#60A5FA] border border-sky-200/60 dark:border-white/8 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{action.label}</span>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Pending Tasks */}
            <section className="pt-4 border-t border-sky-200/50 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  Pending Tasks
                </span>
                <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {totalPendingCount} open
                </span>
              </div>

              {pendingTasks.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 py-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>All pending queues are clear.</span>
                </div>
              ) : (
                <div className="divide-y divide-sky-100 dark:divide-white/8">
                  {pendingTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        onNavigate(task.targetTab, {
                          transportSection: task.targetTransportSection,
                          userSubTab: task.targetUserSubTab,
                        });
                        if (isDrawer) onCloseMobile();
                      }}
                      className="w-full py-2 flex items-center justify-between gap-2 text-left text-xs hover:text-[#0754B8] dark:hover:text-[#60A5FA] transition-colors cursor-pointer"
                    >
                      <span className="text-slate-700 dark:text-slate-200 truncate">
                        {task.label}
                      </span>
                      <span
                        className={`font-mono tabular-nums text-[11px] font-bold shrink-0 ${
                          task.count > 0 && task.severity === 'attention'
                            ? 'text-amber-600 dark:text-amber-400'
                            : task.count > 0
                            ? 'text-[#0754B8] dark:text-[#60A5FA]'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {task.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* API Health Status */}
            <section className="pt-4 border-t border-sky-200/50 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <Server className="w-3.5 h-3.5 text-[#0875E8] dark:text-[#60A5FA]" />
                  <span>API Health Status</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('transport_management', { transportSection: 'health_logs' });
                    if (isDrawer) onCloseMobile();
                  }}
                  className="text-[11px] font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                >
                  Details
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-white/5 border border-sky-200/50 dark:border-white/8">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Active APIs</div>
                  <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {apiHealth.activeProvidersCount}/{apiHealth.totalProviders}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-white/5 border border-sky-200/50 dark:border-white/8">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Healthy</div>
                  <div className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {apiHealth.healthyProvidersCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-white/5 border border-sky-200/50 dark:border-white/8">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Errors</div>
                  <div
                    className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
                      apiHealth.erroredProvidersCount > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {apiHealth.erroredProvidersCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-white/5 border border-sky-200/50 dark:border-white/8">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Avg Latency</div>
                  <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {apiHealth.avgResponseTimeMs !== null
                      ? `${apiHealth.avgResponseTimeMs}ms`
                      : '—'}
                  </div>
                </div>
              </div>
            </section>

            {/* System & Session Status */}
            <section className="pt-4 border-t border-sky-200/50 dark:border-white/10 space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-100">System Status</div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Authority</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {isSuperAdmin ? 'RBAC Level 5 Verified' : 'Standard Admin'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Session</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200 truncate max-w-[160px]">
                    {adminEmail}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Contact Stream</span>
                  <span className="font-semibold text-[#0754B8] dark:text-[#60A5FA]">
                    Live Firestore Sync
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {panelTab === 'alerts' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Bell className="w-3.5 h-3.5 text-[#0875E8] dark:text-[#60A5FA]" />
                <span>Notifications ({unreadCount} unread)</span>
              </div>
              <button
                type="button"
                onClick={onRefreshAll}
                className="text-[11px] font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed py-2">
                No notifications yet. New student signups, university applications, document uploads, SIM orders, and contact inquiries appear here automatically.
              </p>
            ) : (
              <div className="divide-y divide-sky-100 dark:divide-white/8">
                {notifications.slice(0, 12).map((notif) => (
                  <div
                    key={notif.id}
                    className={`py-3 first:pt-0 space-y-1.5 ${
                      notif.read ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="text-[10px] font-semibold text-[#0754B8] dark:text-[#60A5FA] shrink-0">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[10px] font-mono tabular-nums text-slate-400">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenNotification(notif);
                            if (isDrawer) onCloseMobile();
                          }}
                          className="text-[11px] font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                        >
                          Open
                        </button>
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(notif.id)}
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {panelTab === 'activity' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Clock className="w-3.5 h-3.5 text-[#0875E8] dark:text-[#60A5FA]" />
                <span>Admin Activity</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onNavigate('audit_logs');
                  if (isDrawer) onCloseMobile();
                }}
                className="text-[11px] font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
              >
                Full Trail
              </button>
            </div>

            <div className="divide-y divide-sky-100 dark:divide-white/8">
              {recentAdminLogs.slice(0, 4).map((alog) => (
                <div key={alog.id} className="py-2.5 first:pt-0 space-y-0.5">
                  <div className="text-[11px] font-mono font-semibold text-[#0754B8] dark:text-[#60A5FA]">
                    {alog.action}
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                    {alog.details}
                  </p>
                  <div className="text-[10px] font-mono tabular-nums text-slate-400">
                    {alog.adminName} ·{' '}
                    {new Date(alog.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}

              {recentAuditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="py-2.5 first:pt-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {log.actionType} · {log.targetEntity}
                    </span>
                    <span className="font-mono tabular-nums text-[10px] text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                    {log.targetName}: {log.details}
                  </p>
                  <div className="text-[10px] text-slate-400">{log.adminName}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Optional Persistent Right Contextual Panel (xl+) */}
      {isOpen && (
        <aside
          aria-label="Contextual admin control panel"
          className="hidden xl:flex flex-col w-[304px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-20 bg-white/82 dark:bg-[#071224]/86 backdrop-blur-xl border-l border-sky-200/70 dark:border-white/10"
        >
          {renderPanelContent(false)}
        </aside>
      )}

      {/* Tablet & Mobile Slide-Over Right Contextual Drawer (<xl) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 xl:hidden flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Contextual admin controls"
        >
          <div
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-[320px] max-w-[88vw] h-full bg-white/96 dark:bg-[#071224]/96 backdrop-blur-2xl border-l border-sky-200/70 dark:border-white/12 shadow-2xl flex flex-col">
            {renderPanelContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
