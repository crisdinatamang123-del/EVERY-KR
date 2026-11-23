/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Complete Student Application Admin Management System
 * - 10 Real Firestore KPI Cards (zero fabricated data)
 * - 6 Live Data Analytics Charts (Country, University, Intake, Degree, Monthly Trends, Status Distribution)
 * - Counsellor Workspace summary strip (for `counsellor` claim)
 * - Full 12-Column Application Management Table with Search, Multi-Filters, Sort, Server-Side Cursor Pagination
 * - Individual PDF Summary, Individual Document ZIP, CSV & Excel (.xlsx) Export (audit-logged)
 * - Full-Workspace Application Details View (Sections A–G + Side-by-Side Private Document Viewer)
 * - RBAC enforced for `admin`, `counsellor`, and read-only `viewer`
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Building2,
  ChevronRight,
  Download,
  FileArchive,
  FileDown,
  FileSpreadsheet,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  fetchAdminSmartApplications,
  fetchAdminSmartApplicationsPage,
  fetchApplicationRetentionSettings,
  fetchPrivateDocumentBlob,
  fetchSmartApplicationById,
  logAdminDocumentAccess,
  saveApplicationRetentionSettings,
} from '../../services/smartApplicationService';
import { fetchStaffMembersDoc } from '../../services/firebaseService';
import { buildAndDownloadApplicationZip } from '../../utils/documentFileTools';
import { downloadApplicationSummaryPdf } from '../../utils/applicationPdfExporter';
import {
  buildApplicationDocumentMatrix,
  computeApplicationDocCompletion,
  maskPassportNumber,
} from '../../utils/applicationDocumentTaxonomy';
import { AdminApplicationCharts } from './AdminApplicationCharts';
import {
  AdminApplicationDetailView,
  type StaffAssigneeOption,
} from './AdminApplicationDetailView';
import type {
  ApplicationRetentionSettings,
  SmartApplicationAdminRole,
  SmartApplicationRecord,
  SmartApplicationStatus,
} from '../../types/smartApplication';
import {
  SMART_APPLICATION_STATUS_META,
  SMART_APPLICATION_STATUS_ORDER,
  normalizeSmartApplicationStatus,
} from '../../types/smartApplication';

interface AdminSmartApplicationsPanelProps {
  adminRole: SmartApplicationAdminRole;
  initialApplicationId?: string;
  standaloneMode?: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 25;

function escapeCsvCell(val: unknown): string {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString();
}

export const AdminSmartApplicationsPanel: React.FC<AdminSmartApplicationsPanelProps> = ({
  adminRole,
  initialApplicationId,
  standaloneMode = false,
}) => {
  const { currentUser, isAuthReady, showToast } = useApp();
  const navigate = useNavigate();

  const isAdmin = adminRole === 'admin';
  const isCounsellor = adminRole === 'counsellor';
  const canSearchPassport = adminRole === 'admin' || adminRole === 'counsellor';
  const canAccessRawDocuments = adminRole === 'admin' || adminRole === 'counsellor';

  const [applications, setApplications] = useState<SmartApplicationRecord[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffAssigneeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-side cursor pagination state
  const [pageCursor, setPageCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreServer, setHasMoreServer] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Selected application for full detail workspace
  const [selectedApp, setSelectedApp] = useState<SmartApplicationRecord | null>(null);
  const [loadingDeepLink, setLoadingDeepLink] = useState(false);

  // Analytics toggle & Retention settings toggle
  const [showCharts, setShowCharts] = useState(true);
  const [showRetentionBox, setShowRetentionBox] = useState(false);
  const [retention, setRetention] = useState<ApplicationRetentionSettings>({
    withdrawnAndRejectedRetentionDays: 180,
    updatedAt: '',
  });
  const [retentionInput, setRetentionInput] = useState('180');
  const [savingRetention, setSavingRetention] = useState(false);

  // Search, Filters & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [universityFilter, setUniversityFilter] = useState<string>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<string>('ALL');
  const [intakeFilter, setIntakeFilter] = useState<string>('ALL');
  const [degreeFilter, setDegreeFilter] = useState<string>('ALL');
  const [counsellorFilter, setCounsellorFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [onlyNew7d, setOnlyNew7d] = useState(false);
  const [onlyAcceptedGroup, setOnlyAcceptedGroup] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [clientPage, setClientPage] = useState(1);

  // Quick row export indicator
  const [rowExportingId, setRowExportingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthReady || !currentUser?.uid || !adminRole) return;
    setLoading(true);
    setError(null);
    try {
      const [allApps, pageResult, retentionCfg, staffList] = await Promise.all([
        fetchAdminSmartApplications({
          role: adminRole,
          actorUid: currentUser.uid,
        }),
        fetchAdminSmartApplicationsPage({
          role: adminRole,
          actorUid: currentUser.uid,
          sortDir: sortOrder === 'oldest' ? 'asc' : 'desc',
          pageSize: PAGE_SIZE,
        }).catch(() => null),
        fetchApplicationRetentionSettings(),
        isAdmin ? fetchStaffMembersDoc().catch(() => []) : Promise.resolve([]),
      ]);

      setApplications(allApps);
      if (pageResult) {
        setPageCursor(pageResult.lastDoc);
        setHasMoreServer(pageResult.hasMore && allApps.length >= 500);
      } else {
        setPageCursor(null);
        setHasMoreServer(false);
      }

      setRetention(retentionCfg);
      setRetentionInput(String(retentionCfg.withdrawnAndRejectedRetentionDays || 180));

      // Build staff dropdown list from Staff registry + existing assigned counsellors
      const staffMap = new Map<string, StaffAssigneeOption>();
      for (const s of staffList) {
        if (s?.id) {
          staffMap.set(s.id, {
            uid: s.id,
            name: s.fullName || s.name || s.email || s.id,
            email: s.email || '',
          });
        }
      }
      for (const a of allApps) {
        if (a.assignedTo && !staffMap.has(a.assignedTo)) {
          staffMap.set(a.assignedTo, {
            uid: a.assignedTo,
            name: a.assignedToName || a.assignedToEmail || a.assignedTo,
            email: a.assignedToEmail || '',
          });
        }
      }
      setStaffOptions(Array.from(staffMap.values()));

      // Refresh selectedApp if already open
      setSelectedApp((prev) =>
        prev ? allApps.find((item) => item.id === prev.id) || prev : null
      );
    } catch (err: any) {
      setError(err?.message || 'Could not load student applications.');
    } finally {
      setLoading(false);
    }
  }, [isAuthReady, currentUser?.uid, adminRole, isAdmin, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle deep-linked `/admin/applications/:applicationId`
  useEffect(() => {
    if (!initialApplicationId || !isAuthReady || !currentUser?.uid) return;
    const found = applications.find((a) => a.id === initialApplicationId);
    if (found) {
      setSelectedApp(found);
      return;
    }
    let cancelled = false;
    setLoadingDeepLink(true);
    fetchSmartApplicationById(initialApplicationId)
      .then((rec) => {
        if (!cancelled && rec) {
          setSelectedApp(rec);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingDeepLink(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialApplicationId, applications, isAuthReady, currentUser?.uid]);

  // Load next server cursor page when dataset exceeds initial batch
  const handleLoadMoreServer = async () => {
    if (!pageCursor || !currentUser?.uid || !adminRole) return;
    setLoadingMore(true);
    try {
      const res = await fetchAdminSmartApplicationsPage({
        role: adminRole,
        actorUid: currentUser.uid,
        sortDir: sortOrder === 'oldest' ? 'asc' : 'desc',
        pageSize: PAGE_SIZE,
        cursor: pageCursor,
      });
      setApplications((prev) => {
        const existingIds = new Set(prev.map((x) => x.id));
        const merged = [...prev];
        for (const item of res.items) {
          if (!existingIds.has(item.id)) merged.push(item);
        }
        return merged;
      });
      setPageCursor(res.lastDoc);
      setHasMoreServer(res.hasMore);
    } catch {
      showToast('Could not load additional records.');
    } finally {
      setLoadingMore(false);
    }
  };

  // 10 Real Firestore KPI Counts
  const kpis = useMemo(() => {
    const nowMs = Date.now();
    let total = 0;
    let new7d = 0;
    let draft = 0;
    let submitted = 0;
    let underReview = 0;
    let documentsMissing = 0;
    let sentToUniversities = 0;
    let accepted = 0;
    let rejected = 0;
    let withdrawn = 0;
    let duplicatePassports = 0;

    for (const app of applications) {
      total += 1;
      const st = normalizeSmartApplicationStatus(app.status);
      const createdMs = new Date(app.submittedAt || app.createdAt || '').getTime();
      if (!Number.isNaN(createdMs) && nowMs - createdMs <= SEVEN_DAYS_MS && st !== 'draft') {
        new7d += 1;
      }
      if (st === 'draft') draft += 1;
      if (st === 'submitted') submitted += 1;
      if (st === 'under_review') underReview += 1;
      if (st === 'documents_missing') documentsMissing += 1;
      if (st === 'sent_to_university' || st === 'interview') sentToUniversities += 1;
      if (st === 'admitted' || st === 'visa_processing' || st === 'completed') accepted += 1;
      if (st === 'rejected') rejected += 1;
      if (st === 'withdrawn') withdrawn += 1;
      if (app.duplicatePassportFlag) duplicatePassports += 1;
    }

    return {
      total,
      new7d,
      draft,
      submitted,
      underReview,
      documentsMissing,
      sentToUniversities,
      accepted,
      rejected,
      withdrawn,
      duplicatePassports,
    };
  }, [applications]);

  // Distinct dropdown options built strictly from real Firestore records
  const filterOptions = useMemo(() => {
    const universities = new Map<string, string>();
    const nationalities = new Set<string>();
    const intakes = new Set<string>();
    const degrees = new Set<string>();
    const counsellors = new Map<string, string>();

    for (const a of applications) {
      if (a.universityId) universities.set(a.universityId, a.universityName || a.universityId);
      if (a.personal?.nationality) nationalities.add(a.personal.nationality);
      if (a.intake) intakes.add(a.intake);
      if (a.degreeLevel) degrees.add(a.degreeLevel);
      if (a.assignedTo) {
        counsellors.set(a.assignedTo, a.assignedToName || a.assignedToEmail || a.assignedTo);
      }
    }

    return {
      universities: Array.from(universities.entries()).sort((a, b) => a[1].localeCompare(b[1])),
      nationalities: Array.from(nationalities).sort(),
      intakes: Array.from(intakes).sort(),
      degrees: Array.from(degrees).sort(),
      counsellors: Array.from(counsellors.entries()).sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [applications]);

  // Filtered & sorted rows
  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const nowMs = Date.now();
    const list = applications.filter((a) => {
      const st = normalizeSmartApplicationStatus(a.status);

      if (onlyNew7d) {
        const ts = new Date(a.submittedAt || a.createdAt || '').getTime();
        if (Number.isNaN(ts) || nowMs - ts > SEVEN_DAYS_MS || st === 'draft') return false;
      }
      if (onlyAcceptedGroup) {
        if (st !== 'admitted' && st !== 'visa_processing' && st !== 'completed') return false;
      }
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (universityFilter !== 'ALL' && a.universityId !== universityFilter) return false;
      if (
        nationalityFilter !== 'ALL' &&
        (a.personal?.nationality || '').toLowerCase() !== nationalityFilter.toLowerCase()
      ) {
        return false;
      }
      if (intakeFilter !== 'ALL' && a.intake !== intakeFilter) return false;
      if (degreeFilter !== 'ALL' && a.degreeLevel !== degreeFilter) return false;
      if (counsellorFilter === 'UNASSIGNED' && a.assignedTo) return false;
      if (
        counsellorFilter !== 'ALL' &&
        counsellorFilter !== 'UNASSIGNED' &&
        a.assignedTo !== counsellorFilter
      ) {
        return false;
      }

      const subDate = (a.submittedAt || a.createdAt || '').slice(0, 10);
      if (dateFrom && subDate && subDate < dateFrom) return false;
      if (dateTo && subDate && subDate > dateTo) return false;

      if (!q) return true;
      const fullName = `${a.personal?.givenNames || ''} ${a.personal?.surname || ''}`.toLowerCase();
      const passportCandidate = canSearchPassport
        ? (a.personal?.passportNumber || '').toLowerCase()
        : '';

      return (
        a.id.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        (a.personal?.email || '').toLowerCase().includes(q) ||
        (a.universityName || '').toLowerCase().includes(q) ||
        (a.program?.desiredMajor || '').toLowerCase().includes(q) ||
        (a.personal?.nationality || '').toLowerCase().includes(q) ||
        (passportCandidate && passportCandidate.includes(q))
      );
    });

    return list.sort((a, b) => {
      const aTime = String(a.submittedAt || a.updatedAt || a.createdAt || '');
      const bTime = String(b.submittedAt || b.updatedAt || b.createdAt || '');
      return sortOrder === 'newest' ? bTime.localeCompare(aTime) : aTime.localeCompare(bTime);
    });
  }, [
    applications,
    searchQuery,
    statusFilter,
    universityFilter,
    nationalityFilter,
    intakeFilter,
    degreeFilter,
    counsellorFilter,
    dateFrom,
    dateTo,
    onlyNew7d,
    onlyAcceptedGroup,
    sortOrder,
    canSearchPassport,
  ]);

  useEffect(() => {
    setClientPage(1);
  }, [
    searchQuery,
    statusFilter,
    universityFilter,
    nationalityFilter,
    intakeFilter,
    degreeFilter,
    counsellorFilter,
    dateFrom,
    dateTo,
    onlyNew7d,
    onlyAcceptedGroup,
    sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredApps.length / PAGE_SIZE));
  const paginatedApps = useMemo(() => {
    const start = (clientPage - 1) * PAGE_SIZE;
    return filteredApps.slice(start, start + PAGE_SIZE);
  }, [filteredApps, clientPage]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setUniversityFilter('ALL');
    setNationalityFilter('ALL');
    setIntakeFilter('ALL');
    setDegreeFilter('ALL');
    setCounsellorFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setOnlyNew7d(false);
    setOnlyAcceptedGroup(false);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
      statusFilter !== 'ALL' ||
      universityFilter !== 'ALL' ||
      nationalityFilter !== 'ALL' ||
      intakeFilter !== 'ALL' ||
      degreeFilter !== 'ALL' ||
      counsellorFilter !== 'ALL' ||
      dateFrom ||
      dateTo ||
      onlyNew7d ||
      onlyAcceptedGroup
  );

  // Build tabular export rows (masks passport for viewer role)
  const buildExportRows = () =>
    filteredApps.map((a) => {
      const docStats = computeApplicationDocCompletion(a);
      const rawPassport = a.personal?.passportNumber || '';
      return {
        Application_ID: a.id,
        Student_UID: a.userId,
        Student_Name: `${a.personal?.givenNames || ''} ${a.personal?.surname || ''}`.trim(),
        Email: a.personal?.email || '',
        Phone: `${a.personal?.phoneCountryCode || ''} ${a.personal?.phoneNumber || ''}`.trim(),
        Nationality: a.personal?.nationality || '',
        Current_Country: a.personal?.currentCountry || a.personal?.nationality || '',
        Passport_Number:
          adminRole === 'admin' ? rawPassport : maskPassportNumber(rawPassport),
        University: a.universityName,
        University_ID: a.universityId,
        Degree: a.degreeLevel,
        Program: a.program?.desiredMajor || '',
        Intake: a.intake,
        Round: a.round,
        Status: SMART_APPLICATION_STATUS_META[normalizeSmartApplicationStatus(a.status)]?.label || a.status,
        Documents_Ready: `${docStats.uploadedCount}/${docStats.totalExpected}`,
        Documents_Verified: docStats.verifiedCount,
        Assigned_Counsellor: a.assignedToName || 'Unassigned',
        Submission_Date: a.submittedAt || '',
        Created_At: a.createdAt || '',
        Updated_At: a.updatedAt || '',
        Duplicate_Passport_Alert: a.duplicatePassportFlag ? 'YES' : 'NO',
      };
    });

  const handleExportCsv = async () => {
    const rows = buildExportRows();
    if (rows.length === 0) {
      showToast('No applications to export.');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((r) => headers.map((h) => escapeCsvCell((r as any)[h])).join(',')),
    ];
    const fileName = `EVERYKR_APPLICATIONS_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 2500);

    if (currentUser?.uid && filteredApps[0]) {
      logAdminDocumentAccess({
        applicationId: filteredApps[0].id,
        docType: 'bulk_csv_export',
        fileName: `${fileName} (${rows.length} rows)`,
        storagePath: `exports/csv/${fileName}`,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole || 'viewer',
        action: 'csv_export',
      }).catch(() => {});
    }
    showToast(`Exported ${rows.length} applications as CSV.`);
  };

  const handleExportExcel = async () => {
    const rows = buildExportRows();
    if (rows.length === 0) {
      showToast('No applications to export.');
      return;
    }
    const fileName = `EVERYKR_APPLICATIONS_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');
    XLSX.writeFile(workbook, fileName);

    if (currentUser?.uid && filteredApps[0]) {
      logAdminDocumentAccess({
        applicationId: filteredApps[0].id,
        docType: 'bulk_xlsx_export',
        fileName: `${fileName} (${rows.length} rows)`,
        storagePath: `exports/xlsx/${fileName}`,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole || 'viewer',
        action: 'xlsx_export',
      }).catch(() => {});
    }
    showToast(`Exported ${rows.length} applications as Excel (.xlsx).`);
  };

  const handleRowQuickZip = async (app: SmartApplicationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.uid) return;
    if (!canAccessRawDocuments) {
      showToast('Viewers have read-only summary access and cannot download raw document bundles.');
      return;
    }
    const docs = Object.values(app.documents || {});
    if (docs.length === 0) {
      showToast('No uploaded documents for this application yet.');
      return;
    }
    setRowExportingId(app.id);
    try {
      const { zipName, downloadedCount } = await buildAndDownloadApplicationZip({
        surname: app.personal?.surname || 'APPLICANT',
        givenNames: app.personal?.givenNames || 'STUDENT',
        universityName: app.universityName,
        intake: app.intake,
        files: docs.map((d) => ({
          docType: d.docType,
          category: d.category,
          fileName: d.fileName,
          blobFetcher: () => fetchPrivateDocumentBlob(d.storagePath, app.id),
        })),
      });
      await logAdminDocumentAccess({
        applicationId: app.id,
        docType: 'zip_bundle',
        fileName: zipName,
        storagePath: `applications/${app.userId}/${app.id}/*`,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole || 'viewer',
        action: 'zip_export',
      });
      showToast(`Downloaded ${zipName} (${downloadedCount} files).`);
    } catch {
      showToast('Could not build document ZIP.');
    } finally {
      setRowExportingId(null);
    }
  };

  const handleRowQuickPdf = async (app: SmartApplicationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.uid) return;
    try {
      const { fileName } = downloadApplicationSummaryPdf({
        app,
        history: [],
        maskPassport: adminRole === 'viewer',
        docMatrix: buildApplicationDocumentMatrix(app),
      });
      await logAdminDocumentAccess({
        applicationId: app.id,
        docType: 'pdf_summary',
        fileName,
        storagePath: `applications/${app.userId}/${app.id}/summary.pdf`,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole || 'viewer',
        action: 'pdf_export',
      });
      showToast(`Exported ${fileName}`);
    } catch {
      showToast('Could not export PDF summary.');
    }
  };

  const handleSaveRetention = async () => {
    if (!isAdmin || !currentUser?.email) return;
    const days = Number(retentionInput);
    if (!Number.isFinite(days) || days < 7) {
      showToast('Retention period must be at least 7 days.');
      return;
    }
    setSavingRetention(true);
    try {
      const saved = await saveApplicationRetentionSettings(days, currentUser.email);
      setRetention(saved);
      setShowRetentionBox(false);
      showToast(`Retention policy saved (${saved.withdrawnAndRejectedRetentionDays} days).`);
    } catch {
      showToast('Could not save retention settings.');
    } finally {
      setSavingRetention(false);
    }
  };

  const handleOpenApplication = (app: SmartApplicationRecord) => {
    setSelectedApp(app);
    if (standaloneMode) {
      navigate(`/admin/applications/${app.id}`);
    }
  };

  const handleBackToList = () => {
    setSelectedApp(null);
    if (standaloneMode) {
      navigate('/admin/applications');
    }
  };

  const handleApplicationUpdated = (updated: SmartApplicationRecord) => {
    setSelectedApp(updated);
    setApplications((prev) => {
      const exists = prev.some((item) => item.id === updated.id);
      return exists ? prev.map((item) => (item.id === updated.id ? updated : item)) : [updated, ...prev];
    });
  };

  // If deep-link loading
  if (loadingDeepLink && !selectedApp) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] p-12 text-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mx-auto" />
        <p className="text-xs font-bold text-[#526685] dark:text-[#93A9CB]">
          Loading application record...
        </p>
      </div>
    );
  }

  // FULL WORKSPACE DETAIL VIEW
  if (selectedApp) {
    return (
      <AdminApplicationDetailView
        application={selectedApp}
        adminRole={adminRole}
        staffOptions={staffOptions}
        onBack={handleBackToList}
        onApplicationUpdated={handleApplicationUpdated}
        showStandaloneLink={!standaloneMode}
      />
    );
  }

  // KPI Card definitions (all 10 required metrics)
  const kpiCards: Array<{
    id: string;
    label: string;
    value: number;
    accentClass: string;
    active: boolean;
    onClick: () => void;
  }> = [
    {
      id: 'total',
      label: 'Total Applications',
      value: kpis.total,
      accentClass: 'text-[#081426] dark:text-white',
      active: !hasActiveFilters,
      onClick: () => clearAllFilters(),
    },
    {
      id: 'new',
      label: 'New (7d)',
      value: kpis.new7d,
      accentClass: 'text-[#2563EB] dark:text-[#4BA3FF]',
      active: onlyNew7d,
      onClick: () => {
        clearAllFilters();
        setOnlyNew7d(true);
      },
    },
    {
      id: 'draft',
      label: 'Draft',
      value: kpis.draft,
      accentClass: 'text-slate-600 dark:text-slate-300',
      active: statusFilter === 'draft',
      onClick: () => {
        clearAllFilters();
        setStatusFilter('draft');
      },
    },
    {
      id: 'submitted',
      label: 'Submitted',
      value: kpis.submitted,
      accentClass: 'text-blue-700 dark:text-blue-400',
      active: statusFilter === 'submitted',
      onClick: () => {
        clearAllFilters();
        setStatusFilter('submitted');
      },
    },
    {
      id: 'under_review',
      label: 'Under Review',
      value: kpis.underReview,
      accentClass: 'text-indigo-700 dark:text-indigo-400',
      active: statusFilter === 'under_review',
      onClick: () => {
        clearAllFilters();
        setStatusFilter('under_review');
      },
    },
    {
      id: 'documents_missing',
      label: 'Documents Missing',
      value: kpis.documentsMissing,
      accentClass: 'text-amber-700 dark:text-amber-400',
      active: statusFilter === 'documents_missing',
      onClick: () => {
        clearAllFilters();
        setStatusFilter('documents_missing');
      },
    },
    {
      id: 'sent_to_university',
      label: 'Sent to Universities',
      value: kpis.sentToUniversities,
      accentClass: 'text-sky-700 dark:text-sky-400',
      active: statusFilter === 'sent_to_university',
      onClick: () => {
        clearAllFilters();
        setStatusFilter('sent_to_university');
      },
    },
    {
      id: 'accepted',
      label: 'Accepted',
      value: kpis.accepted,
      accentClass: 'text-emerald-700 dark:text-emerald-400',
      active: onlyAcceptedGroup,
      onClick: () => {
        clearAllFilters();
        setOnlyAcceptedGroup(true);
      },
    },
    {
      id: 'rejected',
      label: 'Rejected',
      value: kpis.rejected,
      accentClass: 'text-rose-700 dark:text-rose-400',
      active: statusFilter === 'rejected',
      onClick: () => {
        clearAllFilters();
        setStatusFilter('rejected');
      },
    },
    {
      id: 'withdrawn',
      label: 'Withdrawn',
      value: kpis.withdrawn,
      accentClass: 'text-slate-500 dark:text-slate-400',
      active: statusFilter === 'withdrawn',
      onClick: () => {
        clearAllFilters();
        setStatusFilter('withdrawn');
      },
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Workspace Header & Controls */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1D44] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-[#061B49] dark:text-white tracking-tight">
              Student Application Management
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#0754B8]/10 text-[#0754B8] dark:text-[#60A5FA] border border-[#0754B8]/20">
              {adminRole || 'staff'}
            </span>
            {kpis.duplicatePassports > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                <ShieldAlert className="w-3 h-3" />
                {kpis.duplicatePassports} Duplicate Passport Alert
              </span>
            )}
          </div>
          <p className="text-xs text-[#4B607F] dark:text-[#93A9CB] mt-0.5">
            {isCounsellor
              ? 'Showing applications assigned to your admissions counsellor account.'
              : adminRole === 'viewer'
              ? 'Read-only admissions overview. Passport details are masked and edits are disabled.'
              : 'Centralized real-time database of every student application submitted on EVERYKR.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCharts((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
              showCharts
                ? 'bg-[#061B49] dark:bg-[#0754B8] text-white border-[#061B49] dark:border-[#0754B8]'
                : 'border-slate-200 dark:border-white/15 bg-white dark:bg-[#061536] text-[#061B49] dark:text-white hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{showCharts ? 'Hide Charts' : 'Analytics Charts'}</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white hover:bg-slate-50 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowRetentionBox((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/15 bg-[#F4F8FD] dark:bg-white/5 text-[#081426] dark:text-white hover:bg-slate-100 cursor-pointer"
              title="Data Retention Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Retention</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Data Retention Policy Drawer */}
      {isAdmin && showRetentionBox && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-[#F4F8FD] dark:bg-[#0B172B] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs space-y-0.5">
            <p className="font-extrabold text-[#081426] dark:text-white">
              Withdrawn & Rejected Application Data Retention
            </p>
            <p className="text-[#526685] dark:text-[#93A9CB]">
              Current policy: <strong>{retention.withdrawnAndRejectedRetentionDays} days</strong>
              {retention.updatedByEmail ? ` (updated by ${retention.updatedByEmail})` : ''}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min={7}
              max={3650}
              value={retentionInput}
              onChange={(e) => setRetentionInput(e.target.value)}
              className="w-24 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white tabular-nums"
            />
            <span className="text-xs text-[#526685]">days</span>
            <button
              type="button"
              disabled={savingRetention}
              onClick={handleSaveRetention}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer disabled:opacity-60"
            >
              {savingRetention ? 'Saving...' : 'Save Policy'}
            </button>
          </div>
        </div>
      )}

      {/* Counsellor Dedicated Queue Summary Strip */}
      {isCounsellor && (
        <div className="rounded-xl border border-[#2563EB]/25 bg-[#2563EB]/5 dark:bg-[#2563EB]/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#081426] dark:text-white">
            <UserCheck className="w-4 h-4 text-[#2563EB]" />
            <span>Counsellor Queue:</span>
            <span className="tabular-nums">{kpis.total} assigned</span>
            <span>·</span>
            <span className="text-indigo-700 dark:text-indigo-300 tabular-nums">
              {kpis.submitted + kpis.underReview} awaiting review
            </span>
            <span>·</span>
            <span className="text-amber-700 dark:text-amber-300 tabular-nums">
              {kpis.documentsMissing} missing documents
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                clearAllFilters();
                setStatusFilter('submitted');
              }}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white dark:bg-[#0B172B] border border-slate-200 dark:border-white/15 text-[#081426] dark:text-white cursor-pointer"
            >
              Pending Review
            </button>
            <button
              type="button"
              onClick={() => {
                clearAllFilters();
                setStatusFilter('documents_missing');
              }}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white dark:bg-[#0B172B] border border-slate-200 dark:border-white/15 text-[#081426] dark:text-white cursor-pointer"
            >
              Missing Docs
            </button>
          </div>
        </div>
      )}

      {/* 10 Real Firestore KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={card.onClick}
            className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
              card.active
                ? 'border-[#2563EB] bg-[#F4F8FD] dark:bg-[#2563EB]/15'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] hover:border-[#4BA3FF]'
            }`}
          >
            <p className="text-[11px] font-bold text-[#526685] dark:text-[#93A9CB] truncate">
              {card.label}
            </p>
            <p className={`text-2xl font-extrabold mt-1 tabular-nums ${card.accentClass}`}>
              {card.value}
            </p>
          </button>
        ))}
      </div>

      {/* 6 Real Data Charts */}
      {showCharts && !loading && (
        <AdminApplicationCharts
          applications={applications}
          onFilterByStatus={(st) => {
            clearAllFilters();
            setStatusFilter(st);
          }}
          onFilterByUniversity={(uniId) => {
            clearAllFilters();
            setUniversityFilter(uniId);
          }}
          onFilterByNationality={(nat) => {
            clearAllFilters();
            setNationalityFilter(nat);
          }}
          onFilterByIntake={(intake) => {
            clearAllFilters();
            setIntakeFilter(intake);
          }}
          onFilterByDegree={(deg) => {
            clearAllFilters();
            setDegreeFilter(deg);
          }}
        />
      )}

      {/* Search & Multi-Facet Filter Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                canSearchPassport
                  ? 'Search by student name, email, application ID, or passport number...'
                  : 'Search by student name, email, application ID, or university...'
              }
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-[#F4F8FD]/70 dark:bg-[#081426] text-[#081426] dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/15 bg-[#F4F8FD] dark:bg-white/5 text-[#081426] dark:text-white cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          <select
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
            className="px-2.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-[#F4F8FD]/70 dark:bg-[#081426] text-[#081426] dark:text-white"
          >
            <option value="ALL">All Universities</option>
            {filterOptions.universities.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={nationalityFilter}
            onChange={(e) => setNationalityFilter(e.target.value)}
            className="px-2.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-[#F4F8FD]/70 dark:bg-[#081426] text-[#081426] dark:text-white"
          >
            <option value="ALL">All Nationalities</option>
            {filterOptions.nationalities.map((nat) => (
              <option key={nat} value={nat}>
                {nat}
              </option>
            ))}
          </select>

          <select
            value={intakeFilter}
            onChange={(e) => setIntakeFilter(e.target.value)}
            className="px-2.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-[#F4F8FD]/70 dark:bg-[#081426] text-[#081426] dark:text-white"
          >
            <option value="ALL">All Intakes</option>
            {filterOptions.intakes.map((intake) => (
              <option key={intake} value={intake}>
                {intake}
              </option>
            ))}
          </select>

          <select
            value={degreeFilter}
            onChange={(e) => setDegreeFilter(e.target.value)}
            className="px-2.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-[#F4F8FD]/70 dark:bg-[#081426] text-[#081426] dark:text-white"
          >
            <option value="ALL">All Degrees</option>
            {filterOptions.degrees.map((deg) => (
              <option key={deg} value={deg}>
                {deg}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setOnlyAcceptedGroup(false);
              setOnlyNew7d(false);
              setStatusFilter(e.target.value);
            }}
            className="px-2.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-[#F4F8FD]/70 dark:bg-[#081426] text-[#081426] dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            {SMART_APPLICATION_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {SMART_APPLICATION_STATUS_META[s]?.label || s}
              </option>
            ))}
          </select>

          {!isCounsellor ? (
            <select
              value={counsellorFilter}
              onChange={(e) => setCounsellorFilter(e.target.value)}
              className="px-2.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-[#F4F8FD]/70 dark:bg-[#081426] text-[#081426] dark:text-white"
            >
              <option value="ALL">All Counsellors</option>
              <option value="UNASSIGNED">Unassigned</option>
              {filterOptions.counsellors.map(([uid, label]) => (
                <option key={uid} value={uid}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-2.5 py-2 rounded-lg text-[11px] font-semibold bg-[#F4F8FD] dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[#526685] dark:text-[#93A9CB] flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Assigned to Me</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Submission date from"
              title="From date"
              className="w-1/2 px-1.5 py-2 rounded-lg text-[11px] border border-slate-200 dark:border-white/15 bg-[#F4F8FD]/70 dark:bg-[#081426] text-[#081426] dark:text-white"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Submission date to"
              title="To date"
              className="w-1/2 px-1.5 py-2 rounded-lg text-[11px] border border-slate-200 dark:border-white/15 bg-[#F4F8FD]/70 dark:bg-[#081426] text-[#081426] dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 p-4 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg font-bold bg-rose-600 text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 12-Column Application Management Table */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-extrabold text-[#081426] dark:text-white inline-flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="tabular-nums">
              Showing {paginatedApps.length} of {filteredApps.length} matching applications
            </span>
          </span>
          <span className="text-[11px] text-[#526685] dark:text-[#93A9CB]">
            Click any row to open the full Application Review Workspace
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mx-auto" />
            <p className="text-xs font-bold text-[#526685]">Loading applications from Firestore...</p>
          </div>
        ) : paginatedApps.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-extrabold text-[#081426] dark:text-white">
              No Student Applications Found
            </p>
            <p className="text-xs text-[#526685] dark:text-[#93A9CB]">
              {hasActiveFilters
                ? 'Try clearing or widening one of your active filters.'
                : 'Applications submitted via Apply Now will appear here automatically.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F8FD] dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10 text-[11px] font-extrabold text-[#526685] dark:text-[#93A9CB] whitespace-nowrap">
                <tr>
                  <th className="px-3.5 py-3">Application ID</th>
                  <th className="px-3.5 py-3">Student Name</th>
                  <th className="px-3.5 py-3">Country</th>
                  <th className="px-3.5 py-3">University</th>
                  <th className="px-3.5 py-3">Degree</th>
                  <th className="px-3.5 py-3">Program</th>
                  <th className="px-3.5 py-3">Intake</th>
                  <th className="px-3.5 py-3">Submission Date</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3">Documents</th>
                  <th className="px-3.5 py-3">Counsellor</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {paginatedApps.map((app) => {
                  const st = normalizeSmartApplicationStatus(app.status);
                  const stMeta =
                    SMART_APPLICATION_STATUS_META[st] || SMART_APPLICATION_STATUS_META.draft;
                  const fullName =
                    `${app.personal?.givenNames || ''} ${app.personal?.surname || ''}`.trim() ||
                    'Unnamed Applicant';
                  const docStats = computeApplicationDocCompletion(app);

                  return (
                    <tr
                      key={app.id}
                      onClick={() => handleOpenApplication(app)}
                      className="hover:bg-[#F4F8FD]/70 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="px-3.5 py-3 font-mono text-[11px] font-bold text-[#081426] dark:text-slate-200 whitespace-nowrap">
                        {app.id.length > 22 ? `${app.id.slice(0, 20)}…` : app.id}
                      </td>
                      <td className="px-3.5 py-3 min-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#081426] dark:text-white truncate max-w-[160px]">
                            {fullName}
                          </span>
                          {app.duplicatePassportFlag && (
                            <span title="Duplicate passport detected across accounts">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#526685] dark:text-[#93A9CB] truncate max-w-[180px]">
                          {app.personal?.email || '—'}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-[#081426] dark:text-slate-200 whitespace-nowrap">
                        {app.personal?.nationality || '—'}
                      </td>
                      <td className="px-3.5 py-3 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          {app.universityLogoUrl ? (
                            <img
                              src={app.universityLogoUrl}
                              alt=""
                              className="w-6 h-6 rounded object-contain bg-white border border-slate-200 p-0.5 shrink-0"
                            />
                          ) : (
                            <Building2 className="w-4 h-4 text-[#2563EB] shrink-0" />
                          )}
                          <span className="font-bold text-[#081426] dark:text-white truncate max-w-[160px]">
                            {app.universityName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-[#081426] dark:text-slate-200 whitespace-nowrap">
                        {app.degreeLevel}
                      </td>
                      <td className="px-3.5 py-3 text-[#526685] dark:text-[#93A9CB] max-w-[150px] truncate">
                        {app.program?.desiredMajor || '—'}
                      </td>
                      <td className="px-3.5 py-3 text-[#081426] dark:text-slate-200 whitespace-nowrap">
                        {app.intake}
                      </td>
                      <td className="px-3.5 py-3 text-[#526685] dark:text-[#93A9CB] whitespace-nowrap tabular-nums">
                        {formatShortDate(app.submittedAt || app.createdAt)}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-bold ${stMeta.badgeClass}`}
                        >
                          {stMeta.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="w-24 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
                            <span className="text-[#081426] dark:text-white">
                              {docStats.uploadedCount}/{docStats.totalExpected}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {docStats.verifiedCount} ok
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-[#2563EB]"
                              style={{ width: `${docStats.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {app.assignedToName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] dark:text-[#4BA3FF]">
                            <UserCheck className="w-3 h-3" />
                            {app.assignedToName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td
                        className="px-3.5 py-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleRowQuickPdf(app, e)}
                            title="Export PDF Summary"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white hover:bg-slate-50 cursor-pointer"
                          >
                            <FileDown className="w-3.5 h-3.5 text-[#2563EB]" />
                          </button>
                          <button
                            type="button"
                            disabled={rowExportingId === app.id}
                            onClick={(e) => handleRowQuickZip(app, e)}
                            title="Download Documents ZIP"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                          >
                            {rowExportingId === app.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileArchive className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenApplication(app)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#081426] dark:bg-[#2563EB] text-white hover:bg-[#1E3A8A] cursor-pointer"
                          >
                            <span>Review</span>
                            <ChevronRight className="w-3 h-3" />
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

        {/* Pagination Footer */}
        {!loading && filteredApps.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[#526685] dark:text-[#93A9CB] tabular-nums">
              Page {clientPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={clientPage <= 1}
                onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={clientPage >= totalPages}
                onClick={() => setClientPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
              {hasMoreServer && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={handleLoadMoreServer}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-[#2563EB] text-white cursor-pointer disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Load More from Server</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
