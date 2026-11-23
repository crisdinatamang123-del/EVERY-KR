import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { EveryKrAnimatedLogo } from '../common/EveryKrAnimatedLogo';
import { OFFICIAL_EVERYKR_ICON } from '../../constants/brandAssets';
import {
  ADMIN_NAV_GROUPS,
  AdminNavCounts,
  AdminNavGroup,
  AdminNavGroupId,
  AdminNavItem,
} from './adminNavConfig';

interface AdminLeftSidebarProps {
  activeNavItemId: string;
  activeGroupId: AdminNavGroupId;
  counts: AdminNavCounts;
  isSuperAdmin: boolean;
  adminEmail: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupId: AdminNavGroupId) => void;
  onSelectItem: (item: AdminNavItem, groupId: AdminNavGroupId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AdminLeftSidebar: React.FC<AdminLeftSidebarProps> = ({
  activeNavItemId,
  activeGroupId,
  counts,
  isSuperAdmin,
  adminEmail,
  isCollapsed,
  onToggleCollapse,
  expandedGroups,
  onToggleGroup,
  onSelectItem,
  mobileOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter groups and items based on RBAC permission & live search
  const visibleGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ADMIN_NAV_GROUPS.filter((g) => !g.requiresSuperAdmin || isSuperAdmin)
      .map((group) => {
        const permittedItems = group.items.filter(
          (item) => !item.requiresSuperAdmin || isSuperAdmin
        );
        if (!q) return { ...group, items: permittedItems };
        const groupMatches = group.label.toLowerCase().includes(q);
        const matchingItems = groupMatches
          ? permittedItems
          : permittedItems.filter(
              (item) =>
                item.label.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q)
            );
        return { ...group, items: matchingItems };
      })
      .filter((group) => group.items.length > 0);
  }, [isSuperAdmin, searchQuery]);

  const getGroupBadgeCount = (group: AdminNavGroup): { alert: number; total: number } => {
    let alert = 0;
    let total = 0;
    for (const item of group.items) {
      if (item.alertCountKey) {
        alert += counts[item.alertCountKey] || 0;
      }
      if (item.countKey) {
        total += counts[item.countKey] || 0;
      }
    }
    return { alert, total };
  };

  const renderSidebarBody = (collapsed: boolean, isDrawer: boolean) => {
    const isSearching = searchQuery.trim().length > 0;

    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Top Brand & Collapse Controls */}
        <div
          className={`flex items-center justify-between gap-2 px-3 py-3.5 border-b border-sky-200/60 dark:border-white/10 shrink-0 ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand Admin Sidebar"
              aria-label="Expand Admin Sidebar"
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-sky-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <img
                src={OFFICIAL_EVERYKR_ICON}
                alt="EveryKR"
                className="w-7 h-7 object-contain"
              />
            </button>
          ) : (
            <>
              <div className="min-w-0 flex flex-col gap-0.5">
                <EveryKrAnimatedLogo
                  variant="static"
                  disableIdleAnimation={true}
                  imgClassName="h-6"
                />
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Super Admin Workspace
                </span>
              </div>

              {isDrawer ? (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Close navigation sidebar"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-sky-100/70 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                  className="p-2 rounded-lg text-slate-500 hover:text-[#0754B8] dark:text-slate-400 dark:hover:text-[#60A5FA] hover:bg-sky-100/70 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Sidebar Search Bar (expanded mode only) */}
        {!collapsed ? (
          <div className="px-3 py-2.5 border-b border-sky-200/50 dark:border-white/8 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter admin modules..."
                aria-label="Filter admin modules"
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-sky-50/70 dark:bg-white/5 border border-sky-200/70 dark:border-white/10 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0875E8]/40 focus:border-[#0875E8] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear filter"
                  className="absolute right-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-2 py-2 border-b border-sky-200/50 dark:border-white/8 flex justify-center shrink-0">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar to search modules"
              aria-label="Expand sidebar"
              className="w-10 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#0754B8] dark:text-slate-400 dark:hover:text-[#60A5FA] hover:bg-sky-100/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Navigation Groups */}
        <nav
          aria-label="Admin workspace navigation"
          className={`flex-1 overflow-y-auto py-2.5 ${
            collapsed ? 'px-2 space-y-1' : 'px-2.5 space-y-1'
          }`}
        >
          {visibleGroups.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                No admin modules match &ldquo;{searchQuery}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
              >
                Reset filter
              </button>
            </div>
          ) : (
            visibleGroups.map((group) => {
              const GroupIcon = group.icon;
              const isSingleItem = group.items.length === 1;
              const isGroupActive = group.id === activeGroupId;
              const isExpanded = isSearching || Boolean(expandedGroups[group.id]);
              const { alert: groupAlertCount } = getGroupBadgeCount(group);

              // COLLAPSED ICON RAIL MODE (Desktop)
              if (collapsed) {
                const firstItem = group.items[0];
                return (
                  <div key={group.id} className="relative group/rail">
                    <button
                      type="button"
                      title={`${group.label}${group.items.length > 1 ? ` (${group.items.length} modules)` : ''}`}
                      aria-label={group.label}
                      onClick={() => {
                        if (isSingleItem) {
                          onSelectItem(firstItem, group.id);
                        } else {
                          onToggleCollapse();
                          if (!expandedGroups[group.id]) {
                            onToggleGroup(group.id);
                          }
                        }
                      }}
                      className={`relative w-full h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                        isGroupActive
                          ? 'bg-[#0875E8]/14 text-[#0754B8] dark:bg-[#0875E8]/25 dark:text-[#60A5FA]'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-sky-100/70 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <GroupIcon className="w-[18px] h-[18px] shrink-0" />
                      {groupAlertCount > 0 && (
                        <span
                          className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold font-mono tabular-nums flex items-center justify-center"
                          aria-label={`${groupAlertCount} pending`}
                        >
                          {groupAlertCount > 9 ? '9+' : groupAlertCount}
                        </span>
                      )}
                    </button>

                    {/* Floating Tooltip in Collapsed Mode */}
                    <div
                      role="tooltip"
                      className="pointer-events-none opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 px-2.5 py-1.5 rounded-lg bg-[#0B1728] dark:bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-lg border border-white/10"
                    >
                      <span>{group.label}</span>
                      {group.items.length > 1 && (
                        <span className="ml-1.5 text-[10px] text-slate-400 font-mono tabular-nums">
                          ({group.items.length})
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // SINGLE-ITEM GROUP (Direct Navigation Row — e.g. Arrival Groups, Document Management, Audit Trail)
              if (isSingleItem) {
                const item = group.items[0];
                const ItemIcon = item.icon;
                const isActive = item.id === activeNavItemId;
                const count = item.countKey ? counts[item.countKey] : undefined;
                const alertCount = item.alertCountKey ? counts[item.alertCountKey] : 0;

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      onSelectItem(item, group.id);
                      if (isDrawer) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-[13px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                      isActive
                        ? 'bg-[#0875E8]/12 text-[#0754B8] dark:bg-[#0875E8]/24 dark:text-[#60A5FA] font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-sky-50/90 dark:hover:bg-white/6 hover:text-slate-950 dark:hover:text-white font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <ItemIcon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-[#0875E8] dark:text-[#60A5FA]'
                            : 'text-slate-400 dark:text-slate-400'
                        }`}
                      />
                      <span className="truncate">{group.label}</span>
                    </span>

                    <span className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-[11px]">
                      {alertCount > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          {alertCount}
                        </span>
                      )}
                      {typeof count === 'number' && count > 0 && (
                        <span
                          className={
                            isActive
                              ? 'text-[#0754B8] dark:text-[#93C5FD] font-semibold'
                              : 'text-slate-400 dark:text-slate-500'
                          }
                        >
                          {count}
                        </span>
                      )}
                    </span>
                  </button>
                );
              }

              // MULTI-ITEM EXPANDABLE GROUP
              return (
                <div key={group.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => onToggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-[13px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                      isGroupActive
                        ? 'text-[#0754B8] dark:text-[#60A5FA] font-semibold bg-sky-50/80 dark:bg-white/5'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-sky-50/80 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <GroupIcon
                        className={`w-4 h-4 shrink-0 ${
                          isGroupActive
                            ? 'text-[#0875E8] dark:text-[#60A5FA]'
                            : 'text-slate-400 dark:text-slate-400'
                        }`}
                      />
                      <span className="truncate">{group.label}</span>
                    </span>

                    <span className="flex items-center gap-1.5 shrink-0">
                      {!isExpanded && groupAlertCount > 0 && (
                        <span className="text-[11px] font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                          {groupAlertCount}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      )}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="pl-4 pr-1 py-0.5 space-y-0.5">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = item.id === activeNavItemId;
                        const count = item.countKey ? counts[item.countKey] : undefined;
                        const alertCount = item.alertCountKey ? counts[item.alertCountKey] : 0;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelectItem(item, group.id);
                              if (isDrawer) onCloseMobile();
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                              isActive
                                ? 'bg-[#0875E8]/12 text-[#0754B8] dark:bg-[#0875E8]/25 dark:text-[#60A5FA] font-semibold'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50/90 dark:hover:bg-white/6 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <ItemIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isActive
                                    ? 'text-[#0875E8] dark:text-[#60A5FA]'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </span>

                            <span className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-[11px]">
                              {alertCount > 0 && (
                                <span
                                  className="text-rose-600 dark:text-rose-400 font-bold"
                                  title={`${alertCount} requiring attention`}
                                >
                                  {alertCount} new
                                </span>
                              )}
                              {typeof count === 'number' && count > 0 && (
                                <span
                                  className={
                                    isActive
                                      ? 'text-[#0754B8] dark:text-[#93C5FD] font-semibold'
                                      : 'text-slate-400 dark:text-slate-500'
                                  }
                                >
                                  {count}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Bottom Admin Session Footer */}
        <div
          className={`px-3 py-3 border-t border-sky-200/60 dark:border-white/10 shrink-0 ${
            collapsed ? 'flex justify-center px-2' : ''
          }`}
        >
          {collapsed ? (
            <div
              title={`Verified Admin: ${adminEmail}`}
              className="w-9 h-9 rounded-lg bg-[#0875E8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center"
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0875E8]/12 dark:bg-[#0875E8]/22 text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {adminEmail}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {isSuperAdmin ? 'RBAC Level 5 · Super Admin' : 'Admin Session'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Collapsible Left Sidebar */}
      <aside
        aria-label="Primary admin sidebar"
        className={`hidden lg:flex flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-20 transition-[width] duration-200 ease-out bg-white/85 dark:bg-[#071224]/88 backdrop-blur-xl border-r border-sky-200/70 dark:border-white/10 ${
          isCollapsed ? 'w-[68px]' : 'w-[272px]'
        }`}
      >
        {renderSidebarBody(isCollapsed, false)}
      </aside>

      {/* Mobile & Tablet Slide-Over Left Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation menu"
        >
          <div
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-[290px] max-w-[85vw] h-full bg-white/96 dark:bg-[#071224]/96 backdrop-blur-2xl border-r border-sky-200/70 dark:border-white/12 shadow-2xl flex flex-col">
            {renderSidebarBody(false, true)}
          </aside>
        </div>
      )}
    </>
  );
};
