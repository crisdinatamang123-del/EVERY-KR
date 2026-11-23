import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Archive,
  RotateCcw,
  UserCheck,
  User,
  MessageSquare,
  StickyNote,
  RefreshCw,
  ChevronRight,
  X,
  Inbox,
  Sparkles,
  Globe,
  Building2,
  ShieldAlert,
  Loader2,
  Check,
  Eye,
  MailOpen,
  UserPlus,
} from 'lucide-react';
import type {
  ContactSubmissionRecord,
  ContactSubmissionStatus,
  StaffMemberRecord,
} from '../../types';
import {
  addContactSubmissionInternalNote,
  assignContactSubmissionStaff,
  computeContactInboxAnalytics,
  markContactSubmissionOpenedByAdmin,
  sendAdminContactReply,
  toggleArchiveContactSubmission,
  updateContactSubmissionStatus,
} from '../../services/contactSubmissionService';

interface AdminContactInboxTabProps {
  submissions: ContactSubmissionRecord[];
  onSubmissionsChange: React.Dispatch<React.SetStateAction<ContactSubmissionRecord[]>>;
  onRefreshSubmissions: () => Promise<void>;
  staffMembers: StaffMemberRecord[];
  adminActor: {
    uid: string;
    name: string;
    email: string;
  };
  adminHeaders?: Record<string, string>;
  showToast: (msg: string) => void;
  initialSelectedSubmissionId?: string | null;
  onClearInitialSelected?: () => void;
}

const STATUS_OPTIONS: ContactSubmissionStatus[] = [
  'New',
  'Read',
  'In Progress',
  'Resolved',
  'Closed',
];

const DEFAULT_CATEGORIES = [
  'General Inquiry',
  'Partnership & Universities',
  'Employer Verification',
  'Report an Issue',
];

function getStatusBadgeClasses(status: ContactSubmissionStatus): string {
  switch (status) {
    case 'New':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30';
    case 'Read':
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    case 'In Progress':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    case 'Resolved':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'Closed':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
    default:
      return 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30';
  }
}

export const AdminContactInboxTab: React.FC<AdminContactInboxTabProps> = ({
  submissions,
  onSubmissionsChange,
  onRefreshSubmissions,
  staffMembers,
  adminActor,
  adminHeaders,
  showToast,
  initialSelectedSubmissionId,
  onClearInitialSelected,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detail & Reply composer states
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replyNextStatus, setReplyNextStatus] =
    useState<ContactSubmissionStatus>('In Progress');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [lastReplyBanner, setLastReplyBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // Internal note state
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Staff assignment state
  const [customStaffName, setCustomStaffName] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const analytics = useMemo(
    () => computeContactInboxAnalytics(submissions),
    [submissions]
  );

  const availableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const s of submissions) {
      if (s.category) set.add(s.category);
    }
    return Array.from(set);
  }, [submissions]);

  const selectedSubmission = useMemo(
    () => submissions.find((s) => s.submissionId === selectedId) || null,
    [submissions, selectedId]
  );

  const upsertSubmissionInState = (updated: ContactSubmissionRecord) => {
    onSubmissionsChange((prev) => {
      const exists = prev.some((item) => item.submissionId === updated.submissionId);
      if (!exists) return [updated, ...prev];
      return prev.map((item) =>
        item.submissionId === updated.submissionId ? updated : item
      );
    });
  };

  const handleOpenSubmission = async (submission: ContactSubmissionRecord) => {
    setSelectedId(submission.submissionId);
    setReplySubject(
      `Re: ${submission.subject || 'Your EveryKR Inquiry'} [${submission.ticketId}]`
    );
    setReplyMessage('');
    setReplyNextStatus(
      submission.status === 'Resolved' ? 'Resolved' : 'In Progress'
    );
    setLastReplyBanner(null);

    if (submission.unread || submission.status === 'New') {
      try {
        const marked = await markContactSubmissionOpenedByAdmin(
          submission,
          adminActor
        );
        upsertSubmissionInState(marked);
      } catch {
        // non-blocking
      }
    }
  };

  useEffect(() => {
    if (initialSelectedSubmissionId) {
      const target = submissions.find(
        (s) =>
          s.submissionId === initialSelectedSubmissionId ||
          s.id === initialSelectedSubmissionId
      );
      if (target) {
        if (target.archived) setViewMode('archived');
        void handleOpenSubmission(target);
        onClearInitialSelected?.();
      }
    }
  }, [initialSelectedSubmissionId, submissions]);

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = submissions.filter((item) => {
      if (viewMode === 'active' && item.archived) return false;
      if (viewMode === 'archived' && !item.archived) return false;

      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      if (q) {
        const hay = [
          item.fullName,
          item.email,
          item.subject,
          item.category,
          item.ticketId,
          item.message,
          item.assignedStaffName || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const timeA = new Date(a.submittedAt).getTime();
      const timeB = new Date(b.submittedAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [submissions, viewMode, categoryFilter, statusFilter, searchQuery, sortOrder]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshSubmissions();
      showToast('Contact Inquiry Inbox synchronized with Firestore.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChangeStatus = async (
    submission: ContactSubmissionRecord,
    nextStatus: ContactSubmissionStatus
  ) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await updateContactSubmissionStatus(
        submission,
        nextStatus,
        adminActor
      );
      upsertSubmissionInState(updated);
      showToast(`Inquiry ${submission.ticketId} marked as ${nextStatus}.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update inquiry status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignStaff = async (
    submission: ContactSubmissionRecord,
    staffValue: string
  ) => {
    try {
      if (!staffValue) {
        const updated = await assignContactSubmissionStaff(
          submission,
          { id: null, name: null, email: null },
          adminActor
        );
        upsertSubmissionInState(updated);
        showToast(`Cleared staff assignment for ${submission.ticketId}.`);
        return;
      }

      if (staffValue === '__SELF__') {
        const updated = await assignContactSubmissionStaff(
          submission,
          {
            id: adminActor.uid,
            name: adminActor.name,
            email: adminActor.email,
          },
          adminActor
        );
        upsertSubmissionInState(updated);
        showToast(`Assigned ${submission.ticketId} to ${adminActor.name}.`);
        return;
      }

      const matchedStaff = staffMembers.find(
        (m) => m.id === staffValue || m.uid === staffValue
      );
      if (matchedStaff) {
        const updated = await assignContactSubmissionStaff(
          submission,
          {
            id: matchedStaff.id,
            name: matchedStaff.fullName || matchedStaff.name || matchedStaff.email,
            email: matchedStaff.email,
          },
          adminActor
        );
        upsertSubmissionInState(updated);
        showToast(
          `Assigned ${submission.ticketId} to ${
            matchedStaff.fullName || matchedStaff.email
          }.`
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign staff member.');
    }
  };

  const handleAssignCustomStaff = async () => {
    if (!selectedSubmission || !customStaffName.trim()) return;
    try {
      const updated = await assignContactSubmissionStaff(
        selectedSubmission,
        {
          id: `staff_${Date.now()}`,
          name: customStaffName.trim(),
          email: null,
        },
        adminActor
      );
      upsertSubmissionInState(updated);
      setCustomStaffName('');
      showToast(`Assigned ${selectedSubmission.ticketId} to ${updated.assignedStaffName}.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign staff.');
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission || !internalNoteInput.trim()) return;
    setIsSavingNote(true);
    try {
      const updated = await addContactSubmissionInternalNote(
        selectedSubmission,
        internalNoteInput.trim(),
        adminActor
      );
      upsertSubmissionInState(updated);
      setInternalNoteInput('');
      showToast('Internal admin note added.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save internal note.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleToggleArchive = async (
    submission: ContactSubmissionRecord,
    archive: boolean
  ) => {
    try {
      const updated = await toggleArchiveContactSubmission(
        submission,
        archive,
        adminActor
      );
      upsertSubmissionInState(updated);
      showToast(
        archive
          ? `Inquiry ${submission.ticketId} archived safely.`
          : `Inquiry ${submission.ticketId} reopened to active inbox.`
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to update archive status.');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    if (!replyMessage.trim() || replyMessage.trim().length < 2) {
      showToast('Please enter a reply message before sending.');
      return;
    }

    setIsSendingReply(true);
    setLastReplyBanner(null);

    try {
      const result = await sendAdminContactReply({
        submission: selectedSubmission,
        replySubject:
          replySubject.trim() ||
          `Re: ${selectedSubmission.subject} [${selectedSubmission.ticketId}]`,
        replyMessage: replyMessage.trim(),
        nextStatus: replyNextStatus,
        adminActor,
        adminHeaders,
      });

      upsertSubmissionInState(result.updatedSubmission);
      setReplyMessage('');

      if (result.deliveryStatus === 'sent' || result.deliveryStatus === 'accepted') {
        setLastReplyBanner({
          type: 'success',
          text: `Email delivered to ${selectedSubmission.email} (Reply-To: support@everykr.com) and saved to thread history.`,
        });
        showToast(`Support reply sent to ${selectedSubmission.email}.`);
      } else {
        setLastReplyBanner({
          type: 'warning',
          text: `Reply saved in inquiry thread, but external email delivery reported: ${
            result.errorReason || 'Email provider unconfigured or rejected.'
          }`,
        });
        showToast(
          `Reply logged in thread; email delivery failed (${
            result.errorReason || 'check email provider config'
          }).`
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to dispatch support reply.';
      setLastReplyBanner({
        type: 'error',
        text: msg,
      });
      showToast(msg);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sync Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#0B1528] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Inbox className="w-4 h-4" />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Contact Management &amp; Inquiry Inbox
            </h2>
            {analytics.unreadInquiries > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-rose-500 text-white">
                {analytics.unreadInquiries} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time Firestore inquiry management connected to <span className="font-mono font-semibold">/contact</span>. Manage guest and student inquiries, assign staff, add internal notes, and send official email replies from <span className="font-mono font-semibold">support@everykr.com</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Inbox
          </button>
        </div>
      </div>

      {/* Genuine Firestore Analytics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-[#0B1528] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Inquiries
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {analytics.totalInquiries}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {analytics.activeInquiries} active &bull; {analytics.archivedInquiries} archived
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1528] p-4 rounded-xl border border-blue-500/30 dark:border-blue-500/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            New Inquiries
          </div>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {analytics.newInquiries}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Awaiting first review
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1528] p-4 rounded-xl border border-rose-500/30 dark:border-rose-500/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Unread
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {analytics.unreadInquiries}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Unopened in inbox
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1528] p-4 rounded-xl border border-amber-500/30 dark:border-amber-500/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            In Progress
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {analytics.inProgressInquiries}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Active support threads
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1528] p-4 rounded-xl border border-emerald-500/30 dark:border-emerald-500/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Resolved
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {analytics.resolvedInquiries}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {analytics.closedInquiries} closed
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1528] p-4 rounded-xl border border-indigo-500/30 dark:border-indigo-500/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Today&apos;s Inquiries
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {analytics.todaysInquiries}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Received today
          </div>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      <div className="bg-white dark:bg-[#0B1528] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-blue-500" />
          Category Breakdown:
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
            }`}
          >
            All ({analytics.totalInquiries})
          </button>
          {availableCategories.map((cat) => {
            const count = analytics.categoryBreakdown[cat] || 0;
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(active ? 'ALL' : cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {cat}: <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search, Filter, Sort & Active/Archive Toolbar */}
      <div className="bg-white dark:bg-[#0B1528] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by visitor name, email address, subject, or ticket ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <select
            aria-label="Filter by Inquiry Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter by Inquiry Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Sort Order */}
          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </button>

          {/* Active vs Archived Toggle */}
          <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Active ({analytics.activeInquiries})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'archived'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Archived ({analytics.archivedInquiries})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Split: Searchable Inquiry Table + Detail & Reply Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Table Column */}
        <div
          className={`${
            selectedSubmission ? 'xl:col-span-7' : 'xl:col-span-12'
          } bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm`}
        >
          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                No Contact Inquiries Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {viewMode === 'archived'
                  ? 'There are no archived contact inquiries matching your filters.'
                  : 'Whenever a visitor or student submits the Contact Us form at /contact, their message will appear here in real time.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">Student / Visitor Name</th>
                    <th className="py-3.5 px-4">Email Address</th>
                    <th className="py-3.5 px-4">Inquiry Category</th>
                    <th className="py-3.5 px-4">Subject &amp; Message Preview</th>
                    <th className="py-3.5 px-4">Submission Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Assigned Staff</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs">
                  {filteredSubmissions.map((item) => {
                    const isSelected =
                      selectedSubmission?.submissionId === item.submissionId;
                    const isUnread = item.unread || item.status === 'New';
                    return (
                      <tr
                        key={item.submissionId}
                        onClick={() => void handleOpenSubmission(item)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/30'
                            : isUnread
                            ? 'bg-blue-50/30 dark:bg-blue-950/10 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                        }`}
                      >
                        {/* Student/Visitor Name */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2">
                            {isUnread && (
                              <span
                                title="Unread Inquiry"
                                className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0"
                              />
                            )}
                            <div>
                              <div
                                className={`text-slate-900 dark:text-white ${
                                  isUnread ? 'font-extrabold' : 'font-semibold'
                                }`}
                              >
                                {item.fullName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                  {item.ticketId}
                                </span>
                                {item.isAuthenticatedUser ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <UserCheck className="w-2.5 h-2.5" />
                                    Member
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    Guest
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email Address */}
                        <td className="py-3.5 px-4 align-top font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {item.email}
                        </td>

                        {/* Inquiry Category */}
                        <td className="py-3.5 px-4 align-top">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.category}
                          </span>
                        </td>

                        {/* Subject & Message Preview */}
                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <div
                            className={`text-slate-900 dark:text-white truncate ${
                              isUnread ? 'font-bold' : 'font-medium'
                            }`}
                          >
                            {item.subject}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {item.message}
                          </div>
                          {item.replies?.length > 0 && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
                              {item.replies.length}{' '}
                              {item.replies.length === 1 ? 'reply' : 'replies'} sent
                            </div>
                          )}
                        </td>

                        {/* Submission Date */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400">
                          <div>{new Date(item.submittedAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(item.submittedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadgeClasses(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Assigned Staff */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap text-[11px]">
                          {item.assignedStaffName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold">
                              <UserCheck className="w-3 h-3" />
                              {item.assignedStaffName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 align-top text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleOpenSubmission(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Open
                            </button>
                            <button
                              type="button"
                              title={
                                item.archived
                                  ? 'Reopen to Active Inbox'
                                  : 'Archive Inquiry'
                              }
                              onClick={() =>
                                void handleToggleArchive(item, !item.archived)
                              }
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              {item.archived ? (
                                <RotateCcw className="w-3.5 h-3.5" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Message Details, Management & Direct Email Reply Drawer/Panel */}
        {selectedSubmission && (
          <div className="xl:col-span-5 bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
            {/* Detail Header */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400">
                    {selectedSubmission.ticketId}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getStatusBadgeClasses(
                      selectedSubmission.status
                    )}`}
                  >
                    {selectedSubmission.status}
                  </span>
                  {selectedSubmission.archived && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-400">
                      Archived
                    </span>
                  )}
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2">
                  {selectedSubmission.subject}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Category: <strong className="text-slate-700 dark:text-slate-200">{selectedSubmission.category}</strong> &bull; Submitted{' '}
                  {new Date(selectedSubmission.submittedAt).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Close Details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Visitor & Authenticated User Metadata */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">From:</span>{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {selectedSubmission.fullName}
                    </strong>{' '}
                    &lt;
                    <a
                      href={`mailto:${selectedSubmission.email}`}
                      className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {selectedSubmission.email}
                    </a>
                    &gt;
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Language: <strong className="uppercase">{selectedSubmission.userLanguage || 'en'}</strong>
                  </span>
                </div>

                {selectedSubmission.isAuthenticatedUser ? (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="w-3.5 h-3.5" />
                      Authenticated EveryKR Account
                    </span>
                    {selectedSubmission.userId && (
                      <span>
                        UID: <code className="font-mono">{selectedSubmission.userId}</code>
                      </span>
                    )}
                    {selectedSubmission.userRole && (
                      <span>Role: {selectedSubmission.userRole}</span>
                    )}
                    {selectedSubmission.userUniversity && (
                      <span>University: {selectedSubmission.userUniversity}</span>
                    )}
                    {selectedSubmission.userNationality && (
                      <span>Country: {selectedSubmission.userNationality}</span>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    Submitted as a Guest Visitor (not signed in during submission).
                  </div>
                )}
              </div>

              {/* Complete Visitor Message */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Complete Inquiry Message
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                  {selectedSubmission.message}
                </div>
              </div>

              {/* Inquiry Status & Staff Assignment Controls */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Update Inquiry Status
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((st) => {
                      const active = selectedSubmission.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() =>
                            void handleChangeStatus(selectedSubmission, st)
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleArchive(
                          selectedSubmission,
                          !selectedSubmission.archived
                        )
                      }
                      className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      {selectedSubmission.archived ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reopen Inquiry
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Assign Staff Member */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Assigned Staff Member
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      aria-label="Assign Inquiry to Staff Member"
                      value={selectedSubmission.assignedStaffId || ''}
                      onChange={(e) =>
                        void handleAssignStaff(selectedSubmission, e.target.value)
                      }
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- Unassigned --</option>
                      <option value="__SELF__">
                        Assign to Me ({adminActor.name})
                      </option>
                      {staffMembers.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.fullName || staff.name || staff.email} ({staff.staffRole})
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={customStaffName}
                        onChange={(e) => setCustomStaffName(e.target.value)}
                        placeholder="Or enter staff name..."
                        className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => void handleAssignCustomStaff()}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 cursor-pointer"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Email Reply Composer */}
              <form
                onSubmit={handleSendReply}
                className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                    <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Reply Directly to Visitor ({selectedSubmission.email})
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Reply-To: support@everykr.com
                  </span>
                </div>

                {lastReplyBanner && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                      lastReplyBanner.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : lastReplyBanner.type === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                        : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{lastReplyBanner.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Message to {selectedSubmission.fullName}
                  </label>
                  <textarea
                    rows={4}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder={`Write your official EveryKR Support response to ${selectedSubmission.fullName}...`}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Status after reply:
                    </span>
                    <select
                      aria-label="Status after sending reply"
                      value={replyNextStatus}
                      onChange={(e) =>
                        setReplyNextStatus(
                          e.target.value as ContactSubmissionStatus
                        )
                      }
                      className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingReply || !replyMessage.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {isSendingReply ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sending Email...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send Official Reply
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Previous Communication / Reply Thread History */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                  Communication History ({selectedSubmission.replies?.length || 0})
                </div>

                {!selectedSubmission.replies ||
                selectedSubmission.replies.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    No replies have been sent for this inquiry yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedSubmission.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {reply.senderName}{' '}
                            <span className="font-mono font-normal text-[11px] text-slate-500">
                              &lt;{reply.senderEmail}&gt;
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                reply.deliveryStatus === 'sent' ||
                                reply.deliveryStatus === 'accepted'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {reply.deliveryStatus === 'sent' ||
                              reply.deliveryStatus === 'accepted'
                                ? `Delivered${
                                    reply.provider
                                      ? ` (${reply.provider})`
                                      : ''
                                  }`
                                : 'Delivery Failed'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(reply.sentAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Subject: {reply.subject}
                        </div>
                        <div className="text-slate-700 dark:text-slate-200 whitespace-pre-line pt-1">
                          {reply.message}
                        </div>
                        {reply.errorReason && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 pt-1">
                            Delivery diagnostic: {reply.errorReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Internal Admin Notes */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                  Internal Admin Notes ({selectedSubmission.internalNotes?.length || 0})
                </div>

                <form onSubmit={handleAddInternalNote} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={internalNoteInput}
                    onChange={(e) => setInternalNoteInput(e.target.value)}
                    placeholder="Add a private internal note for staff..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={isSavingNote || !internalNoteInput.trim()}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    Add Note
                  </button>
                </form>

                {selectedSubmission.internalNotes?.length > 0 && (
                  <div className="space-y-2">
                    {selectedSubmission.internalNotes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-semibold mb-1">
                          <span>{n.authorName}</span>
                          <span>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-800 dark:text-slate-200 whitespace-pre-line">
                          {n.note}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
