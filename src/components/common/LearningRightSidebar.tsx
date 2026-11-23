import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

export interface LearningSidebarItem {
  id: string;
  label: string;
  sublabel?: string;
  emoji?: string;
  icon: React.ElementType;
  active: boolean;
  completed?: boolean;
  badgeText?: string;
  onSelect: () => void;
}

export interface LearningSidebarGroup {
  id: string;
  title: string;
  emoji?: string;
  defaultOpen?: boolean;
  items: LearningSidebarItem[];
}

export interface LearningRightSidebarProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  progressPercent?: number;
  progressLabel?: string;
  progressMeta?: string;
  groups: LearningSidebarGroup[];
  footerSlot?: React.ReactNode;
  activeSectionLabel?: string;
}

export const LearningRightSidebar: React.FC<LearningRightSidebarProps> = ({
  title,
  subtitle,
  emoji,
  progressPercent,
  progressLabel,
  progressMeta,
  groups,
  footerSlot,
  activeSectionLabel,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach((g) => {
      if (g.defaultOpen === false) {
        initial[g.id] = true;
      }
    });
    return initial;
  });

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderSidebarBody = (onItemClick?: () => void) => (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="px-4 py-4 border-b border-[#0754B8]/12 dark:border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {emoji && (
                <span aria-hidden="true" className="text-base leading-none">
                  {emoji}
                </span>
              )}
              <h2 className="text-sm font-extrabold tracking-tight text-[#061B49] dark:text-white truncate">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] mt-0.5 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          {onItemClick && (
            <button
              type="button"
              onClick={onItemClick}
              aria-label="Close learning navigation"
              className="p-1.5 rounded-lg text-[#526685] dark:text-[#B8C9E5] hover:text-[#061B49] dark:hover:text-white hover:bg-[#0754B8]/8 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Real Course Progress Bar */}
        {typeof progressPercent === 'number' && (
          <div className="mt-3.5 pt-3 border-t border-[#0754B8]/10 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-[#526685] dark:text-[#B8C9E5]">
                {progressLabel || 'Course Progress'}
              </span>
              <span className="font-mono font-bold text-[#0754B8] dark:text-[#FFB800] tabular-nums">
                {progressMeta || `${progressPercent}%`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#0754B8]/12 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full ekr-gold-progress transition-all duration-300"
                style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grouped Learning Modules */}
      <nav
        aria-label={title}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5"
      >
        {groups.map((group) => {
          const isCollapsed = Boolean(collapsedGroups[group.id]);
          const hasActiveChild = group.items.some((i) => i.active);

          return (
            <div key={group.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!isCollapsed}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.12em] text-[#526685] dark:text-[#8FA8CF] hover:text-[#0754B8] dark:hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  {group.emoji && (
                    <span aria-hidden="true" className="text-xs leading-none">
                      {group.emoji}
                    </span>
                  )}
                  <span className={hasActiveChild ? 'text-[#0754B8] dark:text-[#60A5FA]' : ''}>
                    {group.title}
                  </span>
                </span>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                )}
              </button>

              {!isCollapsed && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          item.onSelect();
                          if (onItemClick) onItemClick();
                        }}
                        aria-current={item.active ? 'page' : undefined}
                        className={`w-full text-start px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer group ${
                          item.active
                            ? 'bg-gradient-to-r from-[#0754B8] to-[#0875E8] text-white shadow-md shadow-[#0754B8]/25'
                            : 'text-[#10213D] dark:text-[#DCE5F0] hover:bg-[#0754B8]/8 dark:hover:bg-white/8 hover:text-[#0754B8] dark:hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            item.active
                              ? 'bg-white/18 text-white'
                              : 'bg-[#0754B8]/8 dark:bg-white/8 text-[#0754B8] dark:text-[#60A5FA] group-hover:bg-[#0754B8]/15 dark:group-hover:bg-white/15'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate leading-tight">
                              {item.label}
                            </span>
                          </div>
                          {item.sublabel && (
                            <div
                              className={`text-[10px] truncate mt-0.5 ${
                                item.active
                                  ? 'text-white/80'
                                  : 'text-[#526685] dark:text-[#8FA8CF]'
                              }`}
                            >
                              {item.sublabel}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badgeText && (
                            <span
                              className={`text-[10px] font-mono font-bold tabular-nums ${
                                item.active
                                  ? 'text-[#FFB800]'
                                  : 'text-[#526685] dark:text-[#8FA8CF]'
                              }`}
                            >
                              {item.badgeText}
                            </span>
                          )}
                          {item.completed && (
                            <CheckCircle2
                              className={`w-3.5 h-3.5 shrink-0 ${
                                item.active
                                  ? 'text-[#FFB800]'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Optional Footer Slot */}
      {footerSlot && (
        <div className="px-4 py-3.5 border-t border-[#0754B8]/12 dark:border-white/10">
          {footerSlot}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile / Tablet Compact Navigation Trigger Bar (< lg) */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-full ekr-sidebar-surface rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-start cursor-pointer hover:border-[#0875E8]/45 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0754B8] to-[#0875E8] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Menu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                {title}
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#061B49] dark:text-white truncate">
                {activeSectionLabel || 'Browse Learning Modules'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {typeof progressPercent === 'number' && (
              <span className="text-xs font-mono font-bold text-[#0754B8] dark:text-[#FFB800] tabular-nums">
                {progressPercent}%
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5]" />
          </div>
        </button>
      </div>

      {/* Mobile / Tablet Slide-Over Right Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex justify-end bg-[#061B49]/55 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="w-[86vw] max-w-[320px] h-full ekr-glass-modal border-s border-[#0754B8]/20 dark:border-white/15 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSidebarBody(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* Desktop Sticky Right-Side Navigation Panel (lg+) */}
      <aside className="hidden lg:block w-[284px] xl:w-[304px] shrink-0">
        <div className="sticky top-[84px] max-h-[calc(100vh-104px)] ekr-sidebar-surface rounded-2xl overflow-hidden flex flex-col">
          {renderSidebarBody()}
        </div>
      </aside>
    </>
  );
};
