import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Database,
  Lock,
  Filter,
  ArrowUpDown,
  FileText,
  UserX,
  Briefcase,
  MessageSquare,
  Layers,
  Smartphone,
  Newspaper,
  Code2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlobalTrashItem, GlobalTrashRecordType } from '../../types';
import {
  fetchGlobalTrashItemsDoc,
  restoreRecordFromGlobalTrashDoc,
  permanentlyDeleteFromGlobalTrashDoc
} from '../../services/firebaseService';

const RECORD_TYPE_META: Record<
  GlobalTrashRecordType,
  { label: string; badgeClass: string; isSensitive: boolean }
> = {
  user: {
    label: 'User Account',
    badgeClass:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    isSensitive: true
  },
  employee: {
    label: 'Employee / Staff',
    badgeClass:
      'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    isSensitive: true
  },
  admin_profile: {
    label: 'Admin Profile',
    badgeClass:
      'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    isSensitive: true
  },
  community_post: {
    label: 'Community Post',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    isSensitive: false
  },
  community_comment: {
    label: 'Community Comment',
    badgeClass:
      'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    isSensitive: false
  },
  homepage_category: {
    label: 'Homepage Category',
    badgeClass:
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    isSensitive: false
  },
  cms_subcategory: {
    label: 'CMS Subcategory',
    badgeClass:
      'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
    isSensitive: false
  },
  nested_service: {
    label: 'Nested Service',
    badgeClass:
      'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    isSensitive: false
  },
  cms_content: {
    label: 'CMS Content',
    badgeClass:
      'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    isSensitive: false
  },
  news_update: {
    label: 'News & Updates',
    badgeClass:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    isSensitive: false
  },
  developer_profile: {
    label: 'Developer Profile',
    badgeClass:
      'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
    isSensitive: true
  },
  sim_application: {
    label: 'SIM Application (90d Retention)',
    badgeClass:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    isSensitive: true
  },
  university_admission_deadline: {
    label: 'University Admission Deadline',
    badgeClass:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    isSensitive: false
  }
};

export const AdminGlobalTrashTab: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const [items, setItems] = useState<GlobalTrashItem[]>([]);
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});
  const [totalInTrash, setTotalInTrash] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecordType, setSelectedRecordType] = useState<string>('all');
  const [trashStatusFilter, setTrashStatusFilter] = useState<'in_trash' | 'restored' | 'all'>('in_trash');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'purge_soonest'>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 12;

  // Modals
  const [inspectingItem, setInspectingItem] = useState<GlobalTrashItem | null>(null);
  const [restoringItem, setRestoringItem] = useState<GlobalTrashItem | null>(null);
  const [restoreNotes, setRestoreNotes] = useState<string>('');
  const [deletingItem, setDeletingItem] = useState<GlobalTrashItem | null>(null);
  const [confirmPermanentCheckbox, setConfirmPermanentCheckbox] = useState<boolean>(false);
  const [confirmSensitiveCheckbox, setConfirmSensitiveCheckbox] = useState<boolean>(false);
  const [permanentDeleteReason, setPermanentDeleteReason] = useState<string>('');
  const [actionBusy, setActionBusy] = useState<boolean>(false);

  const loadTrashItems = async () => {
    setLoading(true);
    try {
      const res = await fetchGlobalTrashItemsDoc({
        recordType: selectedRecordType !== 'all' ? selectedRecordType : undefined,
        trashStatus: trashStatusFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });
      setItems(res.items);
      setTotalInTrash(res.totalInTrash);
      setCountsByType(res.countsByType);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrashItems();
  }, [selectedRecordType, trashStatusFilter, dateFrom, dateTo]);

  const filteredAndSortedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter(item => {
      if (!q) return true;
      const hay = `${item.recordName} ${item.recordSubtitle || ''} ${item.recordType} ${item.originalCollection} ${item.originalDocId} ${item.deletedByName || ''} ${item.deletedByEmail || ''} ${item.deletionReason}`.toLowerCase();
      return hay.includes(q);
    });

    list.sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime();
      }
      if (sortOrder === 'purge_soonest') {
        return (
          new Date(a.scheduledPermanentDeletionAt).getTime() -
          new Date(b.scheduledPermanentDeletionAt).getTime()
        );
      }
      return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
    });

    return list;
  }, [items, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedItems.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedItems, currentPage]);

  const handleConfirmRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoringItem || !currentUser) return;
    setActionBusy(true);
    try {
      const result = await restoreRecordFromGlobalTrashDoc({
        trashId: restoringItem.id,
        restoreNotes: restoreNotes.trim() || 'Restored via Admin Global Trash Console',
        adminUid: currentUser.uid || currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Super Admin',
        adminEmail: currentUser.email
      });
      if (!result.ok) {
        showToast(result.message || 'Unable to restore record.');
      } else {
        showToast(result.message);
        setRestoringItem(null);
        setRestoreNotes('');
        await loadTrashItems();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmPermanentDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingItem || !currentUser) return;
    const meta = RECORD_TYPE_META[deletingItem.recordType] || { isSensitive: true };
    if (!confirmPermanentCheckbox) {
      showToast('Please confirm permanent deletion before continuing.');
      return;
    }
    if (meta.isSensitive && !confirmSensitiveCheckbox) {
      showToast('Please confirm the additional sensitive-record safeguard checkbox.');
      return;
    }

    setActionBusy(true);
    try {
      const result = await permanentlyDeleteFromGlobalTrashDoc({
        trashId: deletingItem.id,
        confirmPermanentDelete: confirmPermanentCheckbox,
        confirmSensitiveRecord: confirmSensitiveCheckbox,
        deletionReason:
          permanentDeleteReason.trim() || deletingItem.deletionReason || 'Permanent purge confirmed',
        adminUid: currentUser.uid || currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Super Admin',
        adminEmail: currentUser.email
      });
      if (!result.ok) {
        showToast(result.message || 'Unable to permanently delete record.');
      } else {
        showToast(result.message);
        setDeletingItem(null);
        setConfirmPermanentCheckbox(false);
        setConfirmSensitiveCheckbox(false);
        setPermanentDeleteReason('');
        await loadTrashItems();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const renderRecordTypeIcon = (type: GlobalTrashRecordType) => {
    switch (type) {
      case 'user':
      case 'admin_profile':
        return <UserX className="w-3.5 h-3.5" />;
      case 'employee':
        return <Briefcase className="w-3.5 h-3.5" />;
      case 'community_post':
      case 'community_comment':
        return <MessageSquare className="w-3.5 h-3.5" />;
      case 'homepage_category':
      case 'cms_subcategory':
      case 'nested_service':
        return <Layers className="w-3.5 h-3.5" />;
      case 'sim_application':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'news_update':
        return <Newspaper className="w-3.5 h-3.5" />;
      case 'developer_profile':
        return <Code2 className="w-3.5 h-3.5" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Security Policy Banner */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <Database className="w-3.5 h-3.5" />
                <span>Centralized Lifecycle &amp; Recovery Vault</span>
              </div>
              <h2 className="text-xl font-black text-[#10243A] dark:text-white mt-0.5">
                Global Trash / Recycle Bin ({totalInTrash} Active in Trash)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect, safely restore, or permanently purge soft-deleted Users, Employees, Community posts, CMS categories/services, News, and SIM Applications.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadTrashItems}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1523] hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 transition self-start md:self-center cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Global Trash</span>
          </button>
        </div>

        {/* Critical Safe Restoration & Audit Log Protection Notice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Safe Restoration Policy:</strong> Restoring an Admin or Employee profile from Global Trash <strong>never</strong> automatically restores privileged Admin permissions. Restored accounts require explicit Super Admin revalidation.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Protected Audit Logs &amp; SIM Retention:</strong> Administrative Audit Logs (`audit_logs` / `admin_logs`) are immutable and non-deletable. SIM Applications follow a 90-day compliance retention schedule.
            </div>
          </div>
        </div>

        {/* Record Type Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setSelectedRecordType('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              selectedRecordType === 'all'
                ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#050B18]'
                : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            All Eligible Types ({totalInTrash})
          </button>

          {(Object.keys(RECORD_TYPE_META) as GlobalTrashRecordType[]).map(type => {
            const count = countsByType[type] || 0;
            const active = selectedRecordType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSelectedRecordType(type);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  active
                    ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#050B18]'
                    : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {renderRecordTypeIcon(type)}
                <span>{RECORD_TYPE_META[type].label}</span>
                <span className="px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Date Range, Status & Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, document ID, collection, admin, or reason..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Trash Status Filter"
              value={trashStatusFilter}
              onChange={e => {
                setTrashStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] font-bold text-[#10243A] dark:text-white"
            >
              <option value="in_trash">Currently in Trash</option>
              <option value="restored">Restored History</option>
              <option value="all">All Trash Records</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              aria-label="Deleted From Date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
            />
          </div>

          <div className="lg:col-span-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              aria-label="Deleted To Date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
            />
          </div>

          <div className="lg:col-span-2 flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              aria-label="Sort Trash Records"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              className="w-full h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] font-bold text-[#10243A] dark:text-white"
            >
              <option value="newest">Deleted: Newest First</option>
              <option value="oldest">Deleted: Oldest First</option>
              <option value="purge_soonest">Scheduled Purge: Soonest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Global Trash Table */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {paginatedItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Trash2 className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-[#10243A] dark:text-white">
              Global Trash Is Clean for Current Filters
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Deleted Users, Employees, Community posts, Homepage CMS items, and SIM applications moved to Trash will appear here with full restoration and permanent purge controls.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Record Name &amp; Original ID</th>
                  <th className="p-4">Record Type &amp; Collection</th>
                  <th className="p-4">Deleted By &amp; Timestamp</th>
                  <th className="p-4">Deletion Reason</th>
                  <th className="p-4">Scheduled Purge &amp; Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedItems.map(item => {
                  const typeMeta = RECORD_TYPE_META[item.recordType] || {
                    label: item.recordType,
                    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                    isSensitive: false
                  };
                  const isInTrash = item.trashStatus === 'in_trash';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 align-top">
                        <div className="font-bold text-sm text-[#10243A] dark:text-white">
                          {item.recordName}
                        </div>
                        {item.recordSubtitle && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.recordSubtitle}
                          </div>
                        )}
                        <div className="font-mono text-[10px] text-slate-400 mt-1">
                          Doc ID: {item.originalDocId}
                        </div>
                      </td>

                      <td className="p-4 align-top space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${typeMeta.badgeClass}`}
                        >
                          {renderRecordTypeIcon(item.recordType)}
                          <span>{typeMeta.label}</span>
                        </span>
                        <div className="font-mono text-[10px] text-slate-500">
                          Collection: <strong>{item.originalCollection}</strong>
                        </div>
                        {item.requiresAdminRevalidationOnRestore && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Admin Perms Stripped on Restore</span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 align-top">
                        <div className="font-semibold text-[#10243A] dark:text-slate-200">
                          {item.deletedByName || item.deletedByEmail || item.deletedBy}
                        </div>
                        {item.deletedByEmail && (
                          <div className="font-mono text-[10px] text-slate-400">
                            {item.deletedByEmail}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(item.deletedAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="p-4 align-top max-w-xs">
                        <div className="text-slate-700 dark:text-slate-300 line-clamp-2">
                          {item.deletionReason}
                        </div>
                        {item.originalRole && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Original Role: <strong>{item.originalRole}</strong>
                          </div>
                        )}
                      </td>

                      <td className="p-4 align-top space-y-1">
                        {isInTrash ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold uppercase">
                            <Trash2 className="w-3 h-3" />
                            <span>In Trash</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Restored</span>
                          </span>
                        )}
                        <div className="text-[10px] text-slate-500">
                          Purge Date:{' '}
                          <strong>
                            {new Date(item.scheduledPermanentDeletionAt).toLocaleDateString()}
                          </strong>
                        </div>
                      </td>

                      <td className="p-4 align-top text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectingItem(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>

                        {isInTrash && (
                          <button
                            type="button"
                            onClick={() => {
                              setRestoringItem(item);
                              setRestoreNotes('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingItem(item);
                            setConfirmPermanentCheckbox(false);
                            setConfirmSensitiveCheckbox(false);
                            setPermanentDeleteReason(item.deletionReason || '');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Permanently</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
              {filteredAndSortedItems.length} total matching records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 font-bold"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: VIEW RECORD DETAILS */}
      {inspectingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#10243A] rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-[#10243A] dark:text-white">
                  Trash Record Snapshot — {inspectingItem.recordName}
                </h3>
                <p className="text-slate-500 font-mono mt-0.5">
                  Trash ID: {inspectingItem.id} • Original Collection: {inspectingItem.originalCollection} / {inspectingItem.originalDocId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-[#0B1523] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400">Record Type:</span>{' '}
                <strong className="text-slate-900 dark:text-white">
                  {RECORD_TYPE_META[inspectingItem.recordType]?.label || inspectingItem.recordType}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Original Status:</span>{' '}
                <strong className="text-slate-900 dark:text-white">
                  {inspectingItem.originalStatus || 'active'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Deleted By:</span>{' '}
                <strong className="text-slate-900 dark:text-white">
                  {inspectingItem.deletedByName || inspectingItem.deletedByEmail}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Deleted At:</span>{' '}
                <strong className="text-slate-900 dark:text-white">
                  {new Date(inspectingItem.deletedAt).toLocaleString()}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400">Deletion Reason:</span>{' '}
                <strong className="text-slate-900 dark:text-white">
                  {inspectingItem.deletionReason}
                </strong>
              </div>
              {inspectingItem.retentionPolicyNote && (
                <div className="sm:col-span-2 text-amber-700 dark:text-amber-300 font-semibold">
                  {inspectingItem.retentionPolicyNote}
                </div>
              )}
            </div>

            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400 mb-2">
                Preserved Record Payload (JSON)
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-64">
                {JSON.stringify(inspectingItem.originalData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SAFE RESTORATION CONFIRMATION */}
      {restoringItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <form
            onSubmit={handleConfirmRestore}
            className="bg-white dark:bg-[#10243A] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  Restore Record from Global Trash
                </h3>
                <p className="text-slate-500 mt-1">
                  Restore <strong>{restoringItem.recordName}</strong> back to{' '}
                  <code>{restoringItem.originalCollection}</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestoringItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(restoringItem.requiresAdminRevalidationOnRestore ||
              restoringItem.recordType === 'admin_profile' ||
              restoringItem.recordType === 'employee') && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Safe Restoration Security Rule Enforced</span>
                </div>
                <p>
                  Privileged Admin or Staff permissions will <strong>not</strong> be automatically restored. The profile will be restored as a non-privileged record and flagged for explicit Super Admin revalidation.
                </p>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Restoration Audit Note
              </label>
              <input
                type="text"
                value={restoreNotes}
                onChange={e => setRestoreNotes(e.target.value)}
                placeholder="Optional note recorded in immutable audit logs..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1523] text-[#10243A] dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestoringItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                {actionBusy ? 'Restoring...' : 'Confirm Safe Restore'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: PERMANENT DELETION CONFIRMATION */}
      {deletingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <form
            onSubmit={handleConfirmPermanentDelete}
            className="bg-white dark:bg-[#10243A] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-rose-600 dark:text-rose-400">
                  Permanent Deletion Confirmation
                </h3>
                <p className="text-slate-500 mt-1">
                  You are about to permanently purge <strong>{deletingItem.recordName}</strong> (
                  <code>{deletingItem.originalDocId}</code>). This action is irreversible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Permanent Purge Audit Reason *
              </label>
              <input
                type="text"
                required
                value={permanentDeleteReason}
                onChange={e => setPermanentDeleteReason(e.target.value)}
                placeholder="Enter reason for permanent deletion..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1523] text-[#10243A] dark:text-white"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmPermanentCheckbox}
                onChange={e => setConfirmPermanentCheckbox(e.target.checked)}
                className="mt-0.5 rounded text-rose-600"
              />
              <span className="font-semibold text-rose-900 dark:text-rose-200">
                I understand that permanently deleting this record removes it from Global Trash and it cannot be recovered.
              </span>
            </label>

            {RECORD_TYPE_META[deletingItem.recordType]?.isSensitive && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmSensitiveCheckbox}
                  onChange={e => setConfirmSensitiveCheckbox(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600"
                />
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  Sensitive Record Safeguard: I confirm that purging this {RECORD_TYPE_META[deletingItem.recordType].label} complies with EveryKR data retention policies (historical student applications remain linked by stable UID).
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                {actionBusy ? 'Purging...' : 'Permanently Delete'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminGlobalTrashTab;
