import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CmsAnnouncementRecord } from '../../types';
import {
  fetchCmsAnnouncementsDoc,
  saveCmsAnnouncementDoc,
  deleteCmsAnnouncementDoc
} from '../../services/firebaseService';
import {
  Megaphone,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  Pin,
  ExternalLink,
  X,
  Globe,
  GraduationCap,
  Home,
  Briefcase,
  Mail,
  BookOpen,
  Calendar
} from 'lucide-react';

const CMS_CATEGORIES: CmsAnnouncementRecord['category'][] = [
  'Announcement',
  'Homepage',
  'University',
  'News & Updates',
  'Events',
  'Korean Learning',
  'Accommodation',
  'Jobs',
  'Student Services',
  'Newsletter'
];

interface AdminCmsAnnouncementsTabProps {
  onNavigateTab?: (tabId: string) => void;
}

export const AdminCmsAnnouncementsTab: React.FC<AdminCmsAnnouncementsTabProps> = ({
  onNavigateTab
}) => {
  const { currentUser, showToast } = useApp();

  const [items, setItems] = useState<CmsAnnouncementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [editingItem, setEditingItem] = useState<CmsAnnouncementRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const list = await fetchCmsAnnouncementsDoc();
      setItems(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  const openCreateModal = (presetCategory: CmsAnnouncementRecord['category'] = 'Announcement') => {
    const nowIso = new Date().toISOString();
    setEditingItem({
      id: '',
      title: '',
      category: presetCategory,
      summary: '',
      content: '',
      ctaLabel: 'Learn More',
      ctaLink: '/universities',
      status: 'Published',
      pinned: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: currentUser?.email || 'admin@everykr.com'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !currentUser) return;
    if (!editingItem.title.trim() || !editingItem.summary.trim()) {
      showToast('Please provide a title and summary for the content item.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveCmsAnnouncementDoc({
        announcement: editingItem,
        adminUid: currentUser.uid || currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Super Admin',
        adminEmail: currentUser.email
      });
      setItems(prev => {
        const exists = prev.some(i => i.id === saved.id);
        return exists ? prev.map(i => (i.id === saved.id ? saved : i)) : [saved, ...prev];
      });
      showToast(`Saved "${saved.title}" (${saved.status})`);
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      showToast(err?.message || 'Unable to save CMS content.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (
    item: CmsAnnouncementRecord,
    nextStatus: CmsAnnouncementRecord['status']
  ) => {
    if (!currentUser) return;
    const saved = await saveCmsAnnouncementDoc({
      announcement: { ...item, status: nextStatus },
      adminUid: currentUser.uid || currentUser.id,
      adminName: currentUser.fullName || currentUser.name || 'Super Admin',
      adminEmail: currentUser.email
    });
    setItems(prev => prev.map(i => (i.id === saved.id ? saved : i)));
    showToast(`Updated "${item.title}" to ${nextStatus}`);
  };

  const handleDelete = async (item: CmsAnnouncementRecord) => {
    if (!currentUser) return;
    await deleteCmsAnnouncementDoc({
      id: item.id,
      title: item.title,
      adminUid: currentUser.uid || currentUser.id,
      adminName: currentUser.fullName || currentUser.name || 'Super Admin',
      adminEmail: currentUser.email
    });
    setItems(prev => prev.filter(i => i.id !== item.id));
    showToast(`Deleted "${item.title}"`);
  };

  return (
    <div className="space-y-6">
      {/* CMS Header & Specialized Module Shortcuts */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1769AA] dark:text-[#19B6A4]">
              <Megaphone className="w-4 h-4" />
              <span>Content Management System (CMS)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#10243A] dark:text-white mt-1">
              Website Announcements &amp; Content Hub ({items.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Publish and manage Homepage banners, News &amp; Updates, Events, Korean Learning notices, Accommodation guides, Jobs notices, Student Services, and Newsletter updates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadContent}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => openCreateModal('Announcement')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#10243A] hover:bg-[#1769AA] text-white dark:bg-[#19B6A4] dark:text-[#050B18] cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Content / Announcement</span>
            </button>
          </div>
        </div>

        {/* Dedicated Module Quick-Links */}
        {onNavigateTab && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onNavigateTab('universities')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1523] hover:border-[#1769AA] text-left transition-colors cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
              <div className="text-xs font-bold text-[#10243A] dark:text-white mt-1.5">
                Universities CMS
              </div>
              <div className="text-[10px] text-slate-500">Directory &amp; Tuition</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('korean_academy')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1523] hover:border-[#1769AA] text-left transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
              <div className="text-xs font-bold text-[#10243A] dark:text-white mt-1.5">
                Korean Learning
              </div>
              <div className="text-[10px] text-slate-500">Hangul &amp; TOPIK Lessons</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('accommodation')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1523] hover:border-[#1769AA] text-left transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
              <div className="text-xs font-bold text-[#10243A] dark:text-white mt-1.5">
                Accommodation
              </div>
              <div className="text-[10px] text-slate-500">Goshiwon &amp; One-Rooms</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('jobs')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1523] hover:border-[#1769AA] text-left transition-colors cursor-pointer"
            >
              <Briefcase className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
              <div className="text-xs font-bold text-[#10243A] dark:text-white mt-1.5">
                Jobs &amp; Careers
              </div>
              <div className="text-[10px] text-slate-500">Part-Time &amp; Internships</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('articles')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1523] hover:border-[#1769AA] text-left transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
              <div className="text-xs font-bold text-[#10243A] dark:text-white mt-1.5">
                Student Services
              </div>
              <div className="text-[10px] text-slate-500">Guides &amp; Visa Rules</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('newsletter')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1523] hover:border-[#1769AA] text-left transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
              <div className="text-xs font-bold text-[#10243A] dark:text-white mt-1.5">
                Newsletter CMS
              </div>
              <div className="text-[10px] text-slate-500">Email Campaigns</div>
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search announcements, news, events, or homepage content..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-xs text-[#10243A] dark:text-white focus:outline-none focus:border-[#1769AA]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            aria-label="Filter by CMS Section"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-xs text-[#10243A] dark:text-white"
          >
            <option value="ALL">All Website Sections</option>
            {CMS_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by Publish Status"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-xs text-[#10243A] dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* CMS Items List */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Megaphone className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-[#10243A] dark:text-white">
              No CMS Content Items Found
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click &ldquo;New Content / Announcement&rdquo; to publish an announcement, event, or news item.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#1769AA] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold uppercase">
                      {item.category}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        item.status === 'Published'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : item.status === 'Draft'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.status}
                    </span>

                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                        <Pin className="w-3 h-3" />
                        <span>Pinned</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#10243A] dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
                    </span>
                    {item.ctaLink && (
                      <span className="inline-flex items-center gap-1 font-mono text-[#1769AA] dark:text-[#19B6A4]">
                        <ExternalLink className="w-3 h-3" />
                        <span>
                          {item.ctaLabel || 'Link'}: {item.ctaLink}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {item.status !== 'Published' ? (
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(item, 'Published')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Publish
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(item, 'Archived')}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Archive
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem({ ...item });
                      setIsModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#1769AA] dark:text-[#19B6A4] hover:bg-blue-50 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
        >
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-[#10243A] rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#10243A] dark:text-white">
                  {editingItem.id ? 'Edit CMS Content' : 'Create Website Announcement / Content'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage announcements and section updates across EveryKR.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Website Section / Category *
                  </label>
                  <select
                    value={editingItem.category}
                    onChange={e =>
                      setEditingItem({
                        ...editingItem,
                        category: e.target.value as CmsAnnouncementRecord['category']
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] font-bold text-[#10243A] dark:text-white"
                  >
                    {CMS_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Publish Status *
                  </label>
                  <select
                    value={editingItem.status}
                    onChange={e =>
                      setEditingItem({
                        ...editingItem,
                        status: e.target.value as CmsAnnouncementRecord['status']
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] font-bold text-[#10243A] dark:text-white"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="e.g., Spring 2027 Korean University Admissions Now Open"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Short Summary *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.summary}
                  onChange={e => setEditingItem({ ...editingItem, summary: e.target.value })}
                  placeholder="Brief 1-2 sentence summary shown on cards and banners..."
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Full Content / Details
                </label>
                <textarea
                  rows={4}
                  value={editingItem.content}
                  onChange={e => setEditingItem({ ...editingItem, content: e.target.value })}
                  placeholder="Detailed announcement body, eligibility notes, or event instructions..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Action Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.ctaLabel || ''}
                    onChange={e => setEditingItem({ ...editingItem, ctaLabel: e.target.value })}
                    placeholder="Explore Universities"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Action Link Path (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingItem.ctaLink || ''}
                    onChange={e => setEditingItem({ ...editingItem, ctaLink: e.target.value })}
                    placeholder="/universities"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white font-mono"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={Boolean(editingItem.pinned)}
                  onChange={e => setEditingItem({ ...editingItem, pinned: e.target.checked })}
                  className="rounded border-slate-300 text-[#1769AA]"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Pin this announcement to top of section
                </span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1523] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#10243A] hover:bg-[#1769AA] text-white dark:bg-[#19B6A4] dark:text-[#050B18] cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Content'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
