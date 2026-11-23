import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  Edit3,
  Plus,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Globe,
  FolderTree,
  GraduationCap,
  BookOpen,
  Building,
  Plane,
  Smartphone,
  Compass,
  Save,
  X,
  ExternalLink,
  Archive,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AdminUniversityDeadlinesManager } from './AdminUniversityDeadlinesManager';
import {
  fetchHomepageCmsConfig,
  subscribeToHomepageCmsConfig,
  saveHomepageCategoryDoc,
  reorderHomepageCategoriesDoc,
  saveHomepageNestedServiceDoc,
  resolveCategoryCopyForLanguage,
} from '../../services/masterAdminCmsAndSimService';
import type {
  HomepageCmsCategoryRecord,
  HomepageCmsNestedServiceRecord,
  LanguageCode,
} from '../../types';

const SUPPORTED_LANGUAGES: Array<{ code: LanguageCode; label: string }> = [
  { code: 'en', label: 'English (EN)' },
  { code: 'bn', label: 'বাংলা (BN)' },
  { code: 'ko', label: '한국어 (KO)' },
  { code: 'ne', label: 'नेपाली (NE)' },
  { code: 'ur', label: 'اردو (UR)' },
  { code: 'hi', label: 'हिन्दी (HI)' },
  { code: 'ar', label: 'العربية (AR)' },
  { code: 'zh', label: '中文 (ZH)' },
  { code: 'ja', label: '日本語 (JA)' },
];

const ICON_OPTIONS = [
  'GraduationCap',
  'BookOpen',
  'Building',
  'Plane',
  'Smartphone',
  'Compass',
];

export const AdminHomepageCmsTab: React.FC<{
  adminUid: string;
  adminName: string;
  adminEmail: string;
  onSuccessToast: (msg: string) => void;
}> = ({ adminUid, adminName, adminEmail, onSuccessToast }) => {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<HomepageCmsCategoryRecord[]>([]);
  const [nestedServices, setNestedServices] = useState<HomepageCmsNestedServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<
    'university_deadlines' | 'tree' | 'main_categories' | 'nested_services' | 'preview'
  >(() =>
    searchParams.get('cmsTab') === 'deadlines' ? 'university_deadlines' : 'university_deadlines'
  );
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    () => new Set(['university', 'learn_korean', 'accommodation', 'tickets_transport', 'sim', 'others'])
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [previewLang, setPreviewLang] = useState<LanguageCode>('en');

  // Category Edit Modal State
  const [editingCategory, setEditingCategory] = useState<HomepageCmsCategoryRecord | null>(null);
  const [editCatLang, setEditCatLang] = useState<LanguageCode>('en');
  const [savingCat, setSavingCat] = useState(false);

  // Nested Service Edit / Create Modal State
  const [editingService, setEditingService] = useState<HomepageCmsNestedServiceRecord | null>(null);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [savingService, setSavingService] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await fetchHomepageCmsConfig();
      setCategories(data.categories);
      setNestedServices(data.nestedServices);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    const unsubscribe = subscribeToHomepageCmsConfig(({ categories: nextCats, nestedServices: nextSrvs }) => {
      setCategories(nextCats);
      setNestedServices(nextSrvs);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const toggleExpandCategory = (catId: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const temp = sorted[index];
    sorted[index] = sorted[targetIdx];
    sorted[targetIdx] = temp;
    const updated = await reorderHomepageCategoriesDoc(sorted, {
      uid: adminUid,
      name: adminName,
      email: adminEmail,
    });
    setCategories(updated);
    onSuccessToast('Homepage category display order updated.');
  };

  const handleQuickToggleCategory = async (
    cat: HomepageCmsCategoryRecord,
    field: 'visible' | 'published' | 'featured'
  ) => {
    const nextVal = !cat[field];
    const updated = await saveHomepageCategoryDoc(
      {
        ...cat,
        [field]: nextVal,
        status: field === 'published' ? (nextVal ? 'published' : 'draft') : cat.status,
      },
      { uid: adminUid, name: adminName, email: adminEmail }
    );
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    onSuccessToast(`Updated "${cat.title}" (${field}: ${nextVal ? 'Enabled' : 'Disabled'}).`);
  };

  const handleSaveCategoryModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSavingCat(true);
    try {
      const updated = await saveHomepageCategoryDoc(editingCategory, {
        uid: adminUid,
        name: adminName,
        email: adminEmail,
      });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCategory(null);
      onSuccessToast(`Saved homepage category "${updated.title}".`);
    } finally {
      setSavingCat(false);
    }
  };

  const openAddNestedService = (parentCategoryId = 'others', subcategoryName = 'Student Services') => {
    const maxOrder = nestedServices
      .filter((s) => s.parentCategoryId === parentCategoryId)
      .reduce((m, s) => Math.max(m, s.displayOrder || 0), 0);

    setIsCreatingService(true);
    setEditingService({
      id: `srv_${parentCategoryId}_${Date.now()}`,
      parentCategoryId,
      subcategoryName,
      serviceTitle: '',
      shortDescription: '',
      detailedContent: '',
      routeOrExternalUrl: '/services',
      iconName: 'Compass',
      badgeText: '',
      displayOrder: maxOrder + 1,
      visible: true,
      published: true,
      featured: false,
      status: 'published',
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveServiceModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setSavingService(true);
    try {
      const saved = await saveHomepageNestedServiceDoc(editingService, {
        uid: adminUid,
        name: adminName,
        email: adminEmail,
      });
      setNestedServices((prev) => {
        const exists = prev.some((s) => s.id === saved.id);
        const next = exists ? prev.map((s) => (s.id === saved.id ? saved : s)) : [...prev, saved];
        return next.sort((a, b) => a.displayOrder - b.displayOrder);
      });
      setEditingService(null);
      setIsCreatingService(false);
      onSuccessToast(
        isCreatingService
          ? `Added nested service "${saved.serviceTitle}".`
          : `Updated nested service "${saved.serviceTitle}".`
      );
    } finally {
      setSavingService(false);
    }
  };

  const handleQuickToggleService = async (
    srv: HomepageCmsNestedServiceRecord,
    field: 'visible' | 'published' | 'featured' | 'archive'
  ) => {
    let nextSrv: HomepageCmsNestedServiceRecord;
    if (field === 'archive') {
      const isArchived = srv.status === 'archived';
      nextSrv = {
        ...srv,
        status: isArchived ? 'published' : 'archived',
        visible: isArchived ? true : false,
        published: isArchived ? true : false,
      };
    } else {
      const nextVal = !srv[field];
      nextSrv = {
        ...srv,
        [field]: nextVal,
        status: field === 'published' ? (nextVal ? 'published' : 'draft') : srv.status,
      };
    }
    const saved = await saveHomepageNestedServiceDoc(nextSrv, {
      uid: adminUid,
      name: adminName,
      email: adminEmail,
    });
    setNestedServices((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    onSuccessToast(`Updated "${saved.serviceTitle}".`);
  };

  const filteredNestedServices = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return nestedServices;
    return nestedServices.filter((s) => s.parentCategoryId === selectedCategoryFilter);
  }, [nestedServices, selectedCategoryFilter]);

  const renderCategoryIcon = (iconName: string) => {
    const map: Record<string, React.ComponentType<{ className?: string }>> = {
      GraduationCap,
      BookOpen,
      Building,
      Plane,
      Smartphone,
      Compass,
    };
    const Icon = map[iconName] || Compass;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <FolderTree className="w-4 h-4" />
            <span>PART 1 — COMPLETE HOMEPAGE & NESTED SERVICES CMS</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Homepage 6-Category Architecture & Nested Service Hierarchy
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage Homepage → Category → Subcategory → Service → Content with multilingual translations, ordering, visibility, and live preview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('university_deadlines')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>University Admission Deadlines</span>
          </button>
          <button
            type="button"
            onClick={() => openAddNestedService('others', 'Student Services')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Nested Service</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('preview')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Live Public Preview</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'university_deadlines', label: 'University Admission Deadlines' },
          { id: 'tree', label: '1. Hierarchical CMS Tree (Homepage → Category → Service)' },
          { id: 'main_categories', label: `2. Main 6 Homepage Categories (${categories.length})` },
          { id: 'nested_services', label: `3. Nested Services Manager (${nestedServices.length})` },
          { id: 'preview', label: '4. Live Homepage Preview (9 Languages)' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveSubTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === t.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* UNIVERSITY ADMISSION DEADLINES MANAGEMENT (HOMEPAGE CAROUSEL CMS)   */}
      {/* =================================================================== */}
      {activeSubTab === 'university_deadlines' && (
        <AdminUniversityDeadlinesManager
          adminUid={adminUid}
          adminName={adminName}
          adminEmail={adminEmail}
          onSuccessToast={onSuccessToast}
        />
      )}

      {loading && activeSubTab !== 'university_deadlines' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
          Loading Homepage CMS hierarchy...
        </div>
      ) : null}

      {/* =================================================================== */}
      {/* TAB 1: HIERARCHICAL CMS TREE                                        */}
      {/* =================================================================== */}
      {!loading && activeSubTab === 'tree' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Homepage → Category → Subcategory → Service → Content Tree
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Expand or collapse any of the 6 homepage categories to inspect, reorder, hide, publish, or edit nested services.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setExpandedCategoryIds(new Set(categories.map((c) => c.id)))
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => setExpandedCategoryIds(new Set())}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {categories
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((cat, idx) => {
                const isExpanded = expandedCategoryIds.has(cat.id);
                const catServices = nestedServices
                  .filter((s) => s.parentCategoryId === cat.id)
                  .sort((a, b) => a.displayOrder - b.displayOrder);

                // Group by subcategoryName
                const subcatMap = new Map<string, HomepageCmsNestedServiceRecord[]>();
                for (const srv of catServices) {
                  const sub = srv.subcategoryName || 'General Services';
                  const list = subcatMap.get(sub) || [];
                  list.push(srv);
                  subcatMap.set(sub, list);
                }

                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    {/* Main Category Row */}
                    <div className="bg-slate-50 dark:bg-slate-800/70 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleExpandCategory(cat.id)}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          )}
                        </button>

                        <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          {renderCategoryIcon(cat.iconName)}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-400">
                              #{cat.displayOrder}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {cat.title}
                            </span>
                            <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                              {cat.route}
                            </span>
                            {cat.published && cat.visible ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                Published
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Hidden / Draft
                              </span>
                            )}
                            {cat.featured && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                Featured: {cat.badgeText || 'Highlighted'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {cat.shortDescription}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveCategory(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                          title="Move Category Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCategory(idx, 'down')}
                          disabled={idx === categories.length - 1}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                          title="Move Category Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory({ ...cat });
                            setEditCatLang('en');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Category</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAddNestedService(cat.id, `${cat.title} Services`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Service</span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Subcategories & Nested Services */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
                        {Array.from(subcatMap.entries()).map(([subcatName, servicesList]) => (
                          <div key={subcatName} className="ps-4 border-s-2 border-blue-500/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Subcategory: {subcatName} ({servicesList.length})
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {servicesList.map((srv) => (
                                <div
                                  key={srv.id}
                                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                                    srv.status === 'archived' || !srv.visible
                                      ? 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 opacity-70'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                          {srv.serviceTitle}
                                        </span>
                                        {srv.badgeText && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                            {srv.badgeText}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        Order #{srv.displayOrder}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      {srv.shortDescription}
                                    </p>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 truncate">
                                      {srv.routeOrExternalUrl}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickToggleService(srv, 'visible')}
                                        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                                      >
                                        {srv.visible ? 'Hide' : 'Show'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIsCreatingService(false);
                                          setEditingService({ ...srv });
                                        }}
                                        className="px-2 py-1 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MAIN 6 HOMEPAGE CATEGORIES                                   */}
      {/* =================================================================== */}
      {!loading && activeSubTab === 'main_categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((cat, idx) => (
              <div
                key={cat.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        {renderCategoryIcon(cat.iconName)}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase text-slate-400">
                          Card #{cat.displayOrder} • {cat.id}
                        </span>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {cat.title}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {cat.shortDescription}
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">
                      Route: {cat.route}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                      CTA: {cat.ctaLabel}
                    </span>
                    {cat.badgeText && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold">
                        Badge: {cat.badgeText}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickToggleCategory(cat, 'visible')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        cat.visible
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {cat.visible ? 'Visible' : 'Hidden'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickToggleCategory(cat, 'published')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        cat.published
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                      }`}
                    >
                      {cat.published ? 'Published' : 'Unpublished'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickToggleCategory(cat, 'featured')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        cat.featured
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {cat.featured ? 'Featured' : 'Standard'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory({ ...cat });
                      setEditCatLang('en');
                    }}
                    className="w-full py-2 rounded-xl text-xs font-extrabold bg-slate-900 dark:bg-blue-600 text-white hover:opacity-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Content & 9-Language Translations</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: NESTED SERVICES MANAGER                                      */}
      {/* =================================================================== */}
      {!loading && activeSubTab === 'nested_services' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                All Categories ({nestedServices.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    selectedCategoryFilter === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                openAddNestedService(
                  selectedCategoryFilter === 'ALL' ? 'others' : selectedCategoryFilter,
                  'General Services'
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service to Category</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-3">Order</th>
                  <th className="py-3 px-3">Parent Category</th>
                  <th className="py-3 px-3">Subcategory</th>
                  <th className="py-3 px-3">Service Title & Description</th>
                  <th className="py-3 px-3">Route / URL</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNestedServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-bold">#{srv.displayOrder}</td>
                    <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">
                      {srv.parentCategoryId}
                    </td>
                    <td className="py-3 px-3 font-semibold">{srv.subcategoryName}</td>
                    <td className="py-3 px-3 max-w-md">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {srv.serviceTitle}
                      </div>
                      <div className="text-slate-500 line-clamp-1">{srv.shortDescription}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">{srv.routeOrExternalUrl}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          srv.status === 'archived'
                            ? 'bg-rose-100 text-rose-800'
                            : srv.published && srv.visible
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {srv.status === 'archived'
                          ? 'Archived'
                          : srv.published && srv.visible
                          ? 'Published'
                          : 'Hidden'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingService(false);
                            setEditingService({ ...srv });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickToggleService(srv, 'archive')}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                          title={srv.status === 'archived' ? 'Restore Service' : 'Archive Service'}
                        >
                          {srv.status === 'archived' ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: LIVE HOMEPAGE PREVIEW BEFORE PUBLISHING                      */}
      {/* =================================================================== */}
      {!loading && activeSubTab === 'preview' && (
        <div className="bg-[#050B18] text-white rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#4BA3FF]">
                LIVE PUBLIC HOMEPAGE PREVIEW
              </span>
              <h3 className="text-lg font-extrabold mt-0.5">
                6-Category Public Ecosystem Grid ({previewLang.toUpperCase()})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#4BA3FF]" />
              <select
                value={previewLang}
                onChange={(e) => setPreviewLang(e.target.value as LanguageCode)}
                className="h-9 px-3 rounded-xl bg-[#0A162B] border border-white/15 text-xs font-bold text-white"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    Preview in {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories
              .filter((c) => c.visible && c.published && c.status !== 'archived')
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((cat) => {
                const resolved = resolveCategoryCopyForLanguage(cat, previewLang);
                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl p-5 bg-[#0A162B] border border-white/10 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-[#102544] text-[#4BA3FF] flex items-center justify-center">
                          {renderCategoryIcon(cat.iconName)}
                        </div>
                        {cat.featured && resolved.badgeText && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-[#102544] text-[#4BA3FF] border border-[#4BA3FF]/30">
                            {resolved.badgeText}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-white">{resolved.title}</h4>
                        <p className="text-xs text-[#9FB0C7] mt-1 leading-relaxed">
                          {resolved.description}
                        </p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-[#4BA3FF]">
                      <span>{resolved.ctaLabel}</span>
                      <span>→</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT MAIN HOMEPAGE CATEGORY + 9-LANGUAGE TRANSLATIONS        */}
      {/* =================================================================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCategoryModal}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Edit Homepage Category: {editingCategory.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Changes immediately sync to the public homepage ecosystem cards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Default Title (EN)</label>
                <input
                  type="text"
                  required
                  value={editingCategory.title}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      title: e.target.value,
                      translations: {
                        ...editingCategory.translations,
                        en: {
                          ...(editingCategory.translations?.en || {
                            shortDescription: editingCategory.shortDescription,
                          }),
                          title: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Icon</label>
                <select
                  value={editingCategory.iconName}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, iconName: e.target.value })
                  }
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {ICON_OPTIONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Display Order</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={editingCategory.displayOrder}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      displayOrder: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Short Description (EN)</label>
              <textarea
                rows={2}
                required
                value={editingCategory.shortDescription}
                onChange={(e) =>
                  setEditingCategory({
                    ...editingCategory,
                    shortDescription: e.target.value,
                    translations: {
                      ...editingCategory.translations,
                      en: {
                        ...(editingCategory.translations?.en || { title: editingCategory.title }),
                        shortDescription: e.target.value,
                      },
                    },
                  })
                }
                className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Target Route</label>
                <input
                  type="text"
                  required
                  value={editingCategory.route}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, route: e.target.value })
                  }
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Highlight Badge Text</label>
                <input
                  type="text"
                  value={editingCategory.badgeText || ''}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, badgeText: e.target.value })
                  }
                  placeholder="e.g., Free Arrival SIM"
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Button CTA Label</label>
                <input
                  type="text"
                  value={editingCategory.ctaLabel}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, ctaLabel: e.target.value })
                  }
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Multilingual Translations Editor */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Multilingual Translation Editor</span>
                </span>
                <select
                  value={editCatLang}
                  onChange={(e) => setEditCatLang(e.target.value as LanguageCode)}
                  className="h-8 px-2.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Translated Title ({editCatLang.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={editingCategory.translations?.[editCatLang]?.title || ''}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        translations: {
                          ...editingCategory.translations,
                          [editCatLang]: {
                            title: e.target.value,
                            shortDescription:
                              editingCategory.translations?.[editCatLang]?.shortDescription ||
                              editingCategory.shortDescription,
                            ctaLabel:
                              editingCategory.translations?.[editCatLang]?.ctaLabel ||
                              editingCategory.ctaLabel,
                          },
                        },
                      })
                    }
                    className="w-full h-9 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Translated Description ({editCatLang.toUpperCase()})
                  </label>
                  <textarea
                    rows={2}
                    value={editingCategory.translations?.[editCatLang]?.shortDescription || ''}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        translations: {
                          ...editingCategory.translations,
                          [editCatLang]: {
                            title:
                              editingCategory.translations?.[editCatLang]?.title ||
                              editingCategory.title,
                            shortDescription: e.target.value,
                            ctaLabel:
                              editingCategory.translations?.[editCatLang]?.ctaLabel ||
                              editingCategory.ctaLabel,
                          },
                        },
                      })
                    }
                    className="w-full p-2.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4 text-xs font-bold">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCategory.visible}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, visible: e.target.checked })
                    }
                  />
                  <span>Visible on Homepage</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCategory.published}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        published: e.target.checked,
                        status: e.target.checked ? 'published' : 'draft',
                      })
                    }
                  />
                  <span>Published</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCategory.featured}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, featured: e.target.checked })
                    }
                  />
                  <span>Featured Badge</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCat}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingCat ? 'Saving...' : 'Save & Publish Category'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE / EDIT NESTED SERVICE                                 */}
      {/* =================================================================== */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveServiceModal}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isCreatingService ? 'Add Nested Service' : 'Edit Nested Service'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Parent Homepage Category</label>
                <select
                  value={editingService.parentCategoryId}
                  onChange={(e) =>
                    setEditingService({ ...editingService, parentCategoryId: e.target.value })
                  }
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Subcategory Group Name</label>
                <input
                  type="text"
                  required
                  value={editingService.subcategoryName}
                  onChange={(e) =>
                    setEditingService({ ...editingService, subcategoryName: e.target.value })
                  }
                  placeholder="e.g., Essential Hub — Module 01"
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Service Title</label>
              <input
                type="text"
                required
                value={editingService.serviceTitle}
                onChange={(e) =>
                  setEditingService({ ...editingService, serviceTitle: e.target.value })
                }
                placeholder="e.g., Emergency Numbers (112, 119, 1345)"
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Short Description</label>
              <textarea
                rows={2}
                required
                value={editingService.shortDescription}
                onChange={(e) =>
                  setEditingService({ ...editingService, shortDescription: e.target.value })
                }
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Detailed Service Content</label>
              <textarea
                rows={3}
                value={editingService.detailedContent}
                onChange={(e) =>
                  setEditingService({ ...editingService, detailedContent: e.target.value })
                }
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Route or External URL</label>
                <input
                  type="text"
                  required
                  value={editingService.routeOrExternalUrl}
                  onChange={(e) =>
                    setEditingService({ ...editingService, routeOrExternalUrl: e.target.value })
                  }
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Badge Text</label>
                <input
                  type="text"
                  value={editingService.badgeText || ''}
                  onChange={(e) =>
                    setEditingService({ ...editingService, badgeText: e.target.value })
                  }
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Display Order</label>
                <input
                  type="number"
                  min={1}
                  value={editingService.displayOrder}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      displayOrder: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4 text-xs font-bold">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingService.visible}
                    onChange={(e) =>
                      setEditingService({ ...editingService, visible: e.target.checked })
                    }
                  />
                  <span>Visible</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingService.published}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        published: e.target.checked,
                        status: e.target.checked ? 'published' : 'draft',
                      })
                    }
                  />
                  <span>Published</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white cursor-pointer disabled:opacity-50"
                >
                  {savingService ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
