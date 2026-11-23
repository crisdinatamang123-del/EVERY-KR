import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  UserCheck,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  UniversityApplicationRecord,
  UniversityApplicationStatus,
  StudentDocumentRecord,
  StaffMemberRecord
} from '../../types';
import {
  fetchAdminUniversityApplications,
  adminUpdateUniversityApplicationDoc,
  fetchAdminStudentDocuments,
  fetchStaffMembersDoc,
  exportRecordsToCsvOrExcel
} from '../../services/firebaseService';
import { AdminSmartApplicationsPanel } from './AdminSmartApplicationsPanel';

const ALL_STATUSES: UniversityApplicationStatus[] = [
  'Draft',
  'Submitted',
  'Under Review',
  'Documents Required',
  'Processing',
  'Accepted',
  'Rejected',
  'Completed',
  'Withdrawn'
];

function getStatusBadgeClass(status: UniversityApplicationStatus): string {
  switch (status) {
    case 'Accepted':
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
    case 'Documents Required':
      return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    case 'Under Review':
    case 'Processing':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
    case 'Submitted':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

export const AdminApplicationsTab: React.FC = () => {
  const { currentUser, isServerVerifiedAdmin } = useApp();
  const [applicationsMode, setApplicationsMode] = useState<'smart' | 'legacy'>('smart');
  const [resolvedRole, setResolvedRole] = useState<'admin' | 'counsellor' | 'viewer'>('admin');

  useEffect(() => {
    let active = true;
    import('../../services/smartApplicationService')
      .then((mod) =>
        mod.resolveSmartApplicationAdminRole({
          userRole: currentUser?.role,
          isServerVerifiedAdmin,
        })
      )
      .then((r) => {
        if (active && r) setResolvedRole(r);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentUser?.uid, currentUser?.role, isServerVerifiedAdmin]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setApplicationsMode('smart')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            applicationsMode === 'smart'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-slate-100 dark:bg-white/5 text-[#526685] dark:text-[#B8C9E5] hover:bg-slate-200/70'
          }`}
        >
          Smart Applications (Apply Now)
        </button>
        <button
          type="button"
          onClick={() => setApplicationsMode('legacy')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            applicationsMode === 'legacy'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'bg-slate-100 dark:bg-white/5 text-[#526685] dark:text-[#B8C9E5] hover:bg-slate-200/70'
          }`}
        >
          Legacy University Applications
        </button>
      </div>
      {applicationsMode === 'smart' ? (
        <AdminSmartApplicationsPanel adminRole={resolvedRole} />
      ) : (
        <LegacyAdminApplicationsTab />
      )}
    </div>
  );
};

const LegacyAdminApplicationsTab: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const [applications, setApplications] = useState<UniversityApplicationRecord[]>([]);
  const [allDocuments, setAllDocuments] = useState<StudentDocumentRecord[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & 5 Required Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('ALL');
  const [filterProgram, setFilterProgram] = useState('ALL');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [filterIntake, setFilterIntake] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Detail & Review Drawer State
  const [selectedApp, setSelectedApp] = useState<UniversityApplicationRecord | null>(null);
  const [editStatus, setEditStatus] = useState<UniversityApplicationStatus>('Under Review');
  const [editAssignedStaffId, setEditAssignedStaffId] = useState('');
  const [editInternalNotes, setEditInternalNotes] = useState('');
  const [editDocRequestNote, setEditDocRequestNote] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [appsData, docsData, staffData] = await Promise.all([
        fetchAdminUniversityApplications(),
        fetchAdminStudentDocuments(),
        fetchStaffMembersDoc()
      ]);
      setApplications(appsData);
      setAllDocuments(docsData);
      setStaffMembers(staffData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const uniqueUniversities = useMemo(
    () => Array.from(new Set(applications.map(a => a.universityName).filter(Boolean))).sort(),
    [applications]
  );
  const uniquePrograms = useMemo(
    () => Array.from(new Set(applications.map(a => a.programName).filter(Boolean))).sort(),
    [applications]
  );
  const uniqueCountries = useMemo(
    () => Array.from(new Set(applications.map(a => a.nationality).filter(Boolean))).sort(),
    [applications]
  );
  const uniqueIntakes = useMemo(
    () =>
      Array.from(
        new Set(applications.map(a => a.intake || a.intendedIntake || '').filter(Boolean))
      ).sort(),
    [applications]
  );

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications.filter(a => {
      if (filterUniversity !== 'ALL' && a.universityName !== filterUniversity) return false;
      if (filterProgram !== 'ALL' && a.programName !== filterProgram) return false;
      if (filterCountry !== 'ALL' && a.nationality !== filterCountry) return false;
      const appIntake = a.intake || a.intendedIntake || '';
      if (filterIntake !== 'ALL' && appIntake !== filterIntake) return false;
      if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;

      if (!q) return true;
      return (
        (a.applicationId || '').toLowerCase().includes(q) ||
        (a.studentName || '').toLowerCase().includes(q) ||
        (a.studentEmail || '').toLowerCase().includes(q) ||
        (a.universityName || '').toLowerCase().includes(q) ||
        (a.programName || '').toLowerCase().includes(q) ||
        (a.nationality || '').toLowerCase().includes(q)
      );
    });
  }, [
    applications,
    searchQuery,
    filterUniversity,
    filterProgram,
    filterCountry,
    filterIntake,
    filterStatus
  ]);

  const openApplicationReview = (app: UniversityApplicationRecord) => {
    setSelectedApp(app);
    setEditStatus(app.status);
    setEditAssignedStaffId(app.assignedStaffId || '');
    setEditInternalNotes(app.adminNotes || '');
    setEditDocRequestNote(app.requestedDocumentsNote || '');
  };

  const handleSaveApplicationReview = async () => {
    if (!selectedApp || !currentUser) return;
    setSavingUpdate(true);
    try {
      const assignedStaff = staffMembers.find(s => s.id === editAssignedStaffId);
      const updated = await adminUpdateUniversityApplicationDoc({
        applicationId: selectedApp.applicationId,
        status: editStatus,
        adminNotes: editInternalNotes,
        requestedDocumentsNote: editDocRequestNote,
        assignedStaffId: editAssignedStaffId,
        assignedStaffName: assignedStaff?.fullName || assignedStaff?.name || '',
        adminUid: currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Admin',
        adminEmail: currentUser.email,
        applicationSnapshot: selectedApp
      });

      setApplications(prev =>
        prev.map(a => (a.applicationId === updated.applicationId ? updated : a))
      );
      setSelectedApp(updated);
      showToast(`Application ${updated.applicationId} updated to "${updated.status}"`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update application.');
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (!currentUser) return;
    const rows = filteredApplications.map(a => ({
      Application_ID: a.applicationId,
      Student_Name: a.studentName,
      Student_Email: a.studentEmail,
      Phone_WhatsApp: a.studentPhone || a.whatsappNumber || '',
      Nationality: a.nationality,
      University: a.universityName,
      Program: a.programName,
      Degree_Level: a.degreeLevel,
      Intake: a.intake || a.intendedIntake || '',
      Status: a.status,
      Assigned_Staff: a.assignedStaffName || 'Unassigned',
      Submitted_At: a.submissionDate || a.createdAt,
      Updated_At: a.updatedAt,
      Internal_Admin_Notes: a.adminNotes || ''
    }));

    exportRecordsToCsvOrExcel({
      filename: `EveryKR_University_Applications_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Applications',
      rows,
      format,
      adminUid: currentUser.id,
      adminName: currentUser.fullName || currentUser.name || 'Admin',
      adminEmail: currentUser.email,
      exportCategory: 'University Applications'
    });
    showToast(`Exported ${rows.length} applications as ${format.toUpperCase()}`);
  };

  const applicantDocuments = useMemo(() => {
    if (!selectedApp) return [];
    return allDocuments.filter(d => d.userId === selectedApp.userId);
  }, [allDocuments, selectedApp]);

  return (
    <div className="space-y-6">
      {/* Top Toolbar & Export Controls */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[#10243A] dark:text-white">
              University Application Management ({filteredApplications.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review student applications, inspect verified documents, assign admission officers, request additional documents, and manage admission decisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* Search + 5 Required Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ID, student, email, university..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={filterUniversity}
            onChange={e => setFilterUniversity(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">All Universities</option>
            {uniqueUniversities.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <select
            value={filterProgram}
            onChange={e => setFilterProgram(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">All Programs</option>
            {uniquePrograms.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">All Countries</option>
            {uniqueCountries.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              value={filterIntake}
              onChange={e => setFilterIntake(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">All Intakes</option>
              {uniqueIntakes.map(i => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              {ALL_STATUSES.map(st => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
            No university applications match the selected filters yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                <tr>
                  <th className="p-4">App ID</th>
                  <th className="p-4">Applicant</th>
                  <th className="p-4">Country</th>
                  <th className="p-4">University &amp; Program</th>
                  <th className="p-4">Intake</th>
                  <th className="p-4">Assigned Staff</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredApplications.map(app => (
                  <tr
                    key={app.applicationId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                      {app.applicationId}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {app.studentName}
                      </div>
                      <div className="text-[11px] text-slate-500">{app.studentEmail}</div>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{app.nationality}</td>
                    <td className="p-4">
                      <div className="font-bold text-[#10243A] dark:text-white">
                        {app.universityName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {app.programName} ({app.degreeLevel})
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">
                      {app.intake || app.intendedIntake}
                    </td>
                    <td className="p-4">
                      {app.assignedStaffName ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                          <UserCheck className="w-3.5 h-3.5" />
                          {app.assignedStaffName}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${getStatusBadgeClass(
                          app.status
                        )}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => openApplicationReview(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10243A] hover:bg-[#1769AA] text-white text-xs font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review &amp; Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual Application Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-600">
                    {selectedApp.applicationId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadgeClass(
                      selectedApp.status
                    )}`}
                  >
                    {selectedApp.status}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {selectedApp.studentName} → {selectedApp.universityName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto">
              {/* Left Column: Applicant Profile, Academic Details & Uploaded Documents */}
              <div className="lg:col-span-7 space-y-5">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                  <h4 className="font-bold uppercase tracking-wider text-slate-500">
                    Applicant Academic &amp; Personal Snapshot
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block">Email / WhatsApp</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedApp.studentEmail} •{' '}
                        {selectedApp.studentPhone || selectedApp.whatsappNumber || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Nationality / Passport</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedApp.nationality} ({selectedApp.passportNumberMasked || 'Masked'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Program &amp; Intake</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedApp.programName} ({selectedApp.degreeLevel}) •{' '}
                        {selectedApp.intake || selectedApp.intendedIntake}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Academic Background</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedApp.highestEducationLevel ||
                          selectedApp.profileSnapshot?.highestEducationLevel ||
                          'N/A'}{' '}
                        • GPA:{' '}
                        {selectedApp.academicGpa ||
                          selectedApp.profileSnapshot?.gpaResult ||
                          'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linked Student Documents */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Student Uploaded Documents ({applicantDocuments.length})
                  </h4>
                  {applicantDocuments.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
                      No uploaded documents found for this student yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {applicantDocuments.map(docItem => (
                        <div
                          key={docItem.documentId}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {docItem.category}
                            </span>
                            <span className="text-slate-500 ml-2 font-mono">
                              ({docItem.fileName})
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Verification: {docItem.verificationStatus}
                            </div>
                          </div>
                          <a
                            href={docItem.fileUrl || docItem.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                          >
                            Open File
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status History Timeline */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status Audit History ({(selectedApp.statusHistory || []).length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(selectedApp.statusHistory || []).map((h, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {h.status}
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          By: {h.changedByName} ({h.changedBy})
                        </div>
                        {h.note && (
                          <div className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                            {h.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Admin Decision, Staff Assignment & Notes */}
              <div className="lg:col-span-5 space-y-4 bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Admin Decision &amp; Assignment Controls
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Application Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as UniversityApplicationStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {ALL_STATUSES.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('Accepted')}
                    className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('Documents Required')}
                    className="py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Req. Docs
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('Rejected')}
                    className="py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Admission Staff Member
                  </label>
                  <select
                    value={editAssignedStaffId}
                    onChange={e => setEditAssignedStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {staffMembers.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.fullName || st.name} ({st.staffRole})
                      </option>
                    ))}
                  </select>
                </div>

                {editStatus === 'Documents Required' && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      Message to Student (Documents Requested)
                    </label>
                    <textarea
                      rows={2}
                      value={editDocRequestNote}
                      onChange={e => setEditDocRequestNote(e.target.value)}
                      placeholder="Specify which missing or clearer documents the student must upload..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Admin Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editInternalNotes}
                    onChange={e => setEditInternalNotes(e.target.value)}
                    placeholder="Internal review notes, eligibility remarks, scholarship recommendation..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={savingUpdate}
                  onClick={handleSaveApplicationReview}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold transition"
                >
                  {savingUpdate ? 'Saving Decision...' : 'Save Application Decision & Notify Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
