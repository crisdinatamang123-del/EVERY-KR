import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FolderArchive,
  Calendar,
  Plane,
  Building2,
  Phone,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileText,
  Users,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  BarChart3,
  History,
  Globe,
  Sparkles,
} from 'lucide-react';
import { SimApplicationRecord, SimApplicationStatus, SimArrivalGroupRecord, SimExportHistoryRecord } from '../../types';
import {
  fetchAllSimApplicationsForAdmin,
  updateSimApplicationStatusDoc,
  resolveProtectedSimDocumentUrlForAdmin,
} from '../../services/firebaseService';
import {
  bulkUpdateSimApplicationsDoc,
  fetchSimArrivalGroupsDoc,
  saveSimArrivalGroupDoc,
  refreshSimArrivalGroupSnapshotDoc,
  deleteSimArrivalGroupDoc,
  fetchSimExportHistoryDoc,
  recordSimExportHistoryDoc,
} from '../../services/masterAdminCmsAndSimService';
import {
  extractAirportIataCode,
  formatReadableArrivalDate,
  buildExportBatchFilePrefix,
  generateSimApplicationsExcelBytes,
  generateSingleStudentDocumentZip,
  generateBulkStudentsDocumentZip,
  triggerBrowserBinaryDownload,
  hasValidPassportDocument,
  hasValidAirticketDocument,
} from '../../utils/simZipAndExcelEngine';

interface AdminSimApplicationsTabProps {
  adminEmail: string;
  adminUid?: string;
  adminName?: string;
  initialSubView?: 'applications' | 'arrival_groups' | 'exports' | 'analytics';
  onToast: (msg: string) => void;
}

const STATUS_OPTIONS: SimApplicationStatus[] = [
  'Pending',
  'Submitted',
  'Under Review',
  'Contacted',
  'SIM Arranged',
  'Completed',
  'Rejected',
];

const AIRPORT_PRESET_OPTIONS = [
  'Incheon International Airport (ICN)',
  'Gimhae International Airport (PUS)',
  'Gimpo International Airport (GMP)',
  'Jeju International Airport (CJU)',
  'Daegu International Airport (TAE)',
  'Cheongju International Airport (CJJ)',
];

const STATUS_BADGE_STYLES: Record<SimApplicationStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  Submitted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  'Under Review': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
  Contacted: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
  'SIM Arranged': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
};

function toWhatsAppCleanLink(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : '#';
}

export const AdminSimApplicationsTab: React.FC<AdminSimApplicationsTabProps> = ({
  adminEmail,
  adminUid = 'admin',
  adminName = 'Administrator',
  initialSubView = 'applications',
  onToast,
}) => {
  const [applications, setApplications] = useState<SimApplicationRecord[]>([]);
  const [arrivalGroups, setArrivalGroups] = useState<SimArrivalGroupRecord[]>([]);
  const [exportHistory, setExportHistory] = useState<SimExportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubView, setActiveSubView] = useState<'applications' | 'arrival_groups' | 'exports' | 'analytics'>(
    initialSubView
  );

  useEffect(() => {
    setActiveSubView(initialSubView);
  }, [initialSubView]);

  // Search, Filters, Sorting & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [airportFilter, setAirportFilter] = useState<string>('ALL');
  const [universityFilter, setUniversityFilter] = useState<string>('ALL');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [arrivalDateFilter, setArrivalDateFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'submission_desc' | 'arrival_asc' | 'arrival_desc' | 'name_asc'>('arrival_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Cross-Pagination Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk Action Modals & Progress
  const [bulkBusyMessage, setBulkBusyMessage] = useState<string | null>(null);
  const [zipExportReport, setZipExportReport] = useState<{
    fileName: string;
    totalStudents: number;
    completeStudentsCount: number;
    missingDocumentsCount: number;
    failedDownloadsCount: number;
    warnings: string[];
  } | null>(null);

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [groupTitleInput, setGroupTitleInput] = useState('');
  const [groupAirportInput, setGroupAirportInput] = useState(AIRPORT_PRESET_OPTIONS[0]);
  const [groupDateInput, setGroupDateInput] = useState('');
  const [groupNotesInput, setGroupNotesInput] = useState('');

  const [bulkAssignAirportValue, setBulkAssignAirportValue] = useState('');
  const [bulkAssignDateValue, setBulkAssignDateValue] = useState('');
  const [bulkAssignStatusValue, setBulkAssignStatusValue] = useState<SimApplicationStatus | ''>('');

  // Individual Application Detail & Document Preview Modal
  const [selectedApp, setSelectedApp] = useState<SimApplicationRecord | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [resolvedPassportUrl, setResolvedPassportUrl] = useState<string>('');
  const [resolvedTicketUrl, setResolvedTicketUrl] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Selected Arrival Group Inspector
  const [inspectingGroup, setInspectingGroup] = useState<SimArrivalGroupRecord | null>(null);

  const adminActor = useMemo(
    () => ({
      uid: adminUid || 'admin',
      name: adminName || adminEmail || 'Administrator',
      email: adminEmail || 'admin@everykr.com',
    }),
    [adminUid, adminName, adminEmail]
  );

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [appsList, groupsList, historyList] = await Promise.all([
        fetchAllSimApplicationsForAdmin(),
        fetchSimArrivalGroupsDoc(),
        fetchSimExportHistoryDoc(),
      ]);
      setApplications(appsList);
      setArrivalGroups(groupsList);
      setExportHistory(historyList);
    } catch {
      onToast('Could not load SIM applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedApp) {
      setResolvedPassportUrl('');
      setResolvedTicketUrl('');
      return;
    }

    const loadProtectedDocs = async () => {
      setLoadingDocs(true);
      const appId = selectedApp.applicationId || selectedApp.id;
      const [passUrl, tickUrl] = await Promise.all([
        resolveProtectedSimDocumentUrlForAdmin(selectedApp.passportDocumentURL, appId, 'passport'),
        resolveProtectedSimDocumentUrlForAdmin(selectedApp.flightTicketDocumentURL, appId, 'flight_ticket'),
      ]);
      if (!cancelled) {
        setResolvedPassportUrl(passUrl);
        setResolvedTicketUrl(tickUrl);
        setLoadingDocs(false);
      }
    };

    loadProtectedDocs();
    return () => {
      cancelled = true;
    };
  }, [selectedApp]);

  const uniqueAirports = useMemo(() => {
    const s = new Set<string>(AIRPORT_PRESET_OPTIONS);
    applications.forEach((a) => {
      if (a.arrivalAirport) s.add(a.arrivalAirport);
    });
    return Array.from(s);
  }, [applications]);

  const uniqueUniversities = useMemo(() => {
    const s = new Set<string>();
    applications.forEach((a) => {
      if (a.universityName) s.add(a.universityName);
    });
    return Array.from(s).sort();
  }, [applications]);

  const uniqueCountries = useMemo(() => {
    const s = new Set<string>();
    applications.forEach((a) => {
      const c = a.country || a.nationality;
      if (c) s.add(c);
    });
    return Array.from(s).sort();
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = applications.filter((app) => {
      if (statusFilter !== 'ALL' && app.applicationStatus !== statusFilter) return false;
      if (airportFilter !== 'ALL') {
        if (
          airportFilter.length === 3 &&
          extractAirportIataCode(app.arrivalAirport) !== airportFilter
        ) {
          return false;
        } else if (airportFilter.length > 3 && app.arrivalAirport !== airportFilter) {
          return false;
        }
      }
      if (universityFilter !== 'ALL' && app.universityName !== universityFilter) return false;
      if (countryFilter !== 'ALL' && (app.country || app.nationality || '') !== countryFilter) return false;
      if (arrivalDateFilter && app.arrivalDate !== arrivalDateFilter) return false;

      if (!q) return true;
      return (
        (app.fullName || '').toLowerCase().includes(q) ||
        (app.universityName || '').toLowerCase().includes(q) ||
        (app.whatsappNumber || '').toLowerCase().includes(q) ||
        (app.flightNumber || '').toLowerCase().includes(q) ||
        (app.applicationId || '').toLowerCase().includes(q) ||
        (app.userEmail || '').toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortBy === 'arrival_asc') {
        return (a.arrivalDate || '9999').localeCompare(b.arrivalDate || '9999');
      }
      if (sortBy === 'arrival_desc') {
        return (b.arrivalDate || '').localeCompare(a.arrivalDate || '');
      }
      if (sortBy === 'name_asc') {
        return (a.fullName || '').localeCompare(b.fullName || '');
      }
      return (b.submissionTimestamp || '').localeCompare(a.submissionTimestamp || '');
    });

    return list;
  }, [
    applications,
    searchQuery,
    statusFilter,
    airportFilter,
    universityFilter,
    countryFilter,
    arrivalDateFilter,
    sortBy,
  ]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, airportFilter, universityFilter, countryFilter, arrivalDateFilter]);

  const selectedApplicationsList = useMemo(() => {
    return applications.filter((a) => selectedIds.has(a.applicationId || a.id));
  }, [applications, selectedIds]);

  // Selection Handlers
  const toggleSelectOne = (appId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const isCurrentPageAllSelected =
    paginatedApplications.length > 0 &&
    paginatedApplications.every((a) => selectedIds.has(a.applicationId || a.id));

  const toggleSelectCurrentPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isCurrentPageAllSelected) {
        paginatedApplications.forEach((a) => next.delete(a.applicationId || a.id));
      } else {
        paginatedApplications.forEach((a) => next.add(a.applicationId || a.id));
      }
      return next;
    });
  };

  const selectAllFilteredAcrossPages = () => {
    setSelectedIds(new Set(filteredApplications.map((a) => a.applicationId || a.id)));
    onToast(`Selected all ${filteredApplications.length} filtered students across all pages.`);
  };

  const selectAllApplications = () => {
    setSelectedIds(new Set(applications.map((a) => a.applicationId || a.id)));
    onToast(`Selected all ${applications.length} SIM applications.`);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // =========================================================================
  // PART 2.9: REAL SIM DASHBOARD ANALYTICS
  // =========================================================================
  const simAnalytics = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    let upcomingCount = 0;
    let completeDocsCount = 0;
    let missingPassportCount = 0;
    let missingAirticketCount = 0;
    let pendingCount = 0;
    let completedCount = 0;

    const byAirportCode: Record<string, number> = {
      ICN: 0,
      PUS: 0,
      GMP: 0,
      CJU: 0,
      OTHER: 0,
    };
    const byDateMap = new Map<string, number>();

    for (const app of applications) {
      if (app.arrivalDate && app.arrivalDate >= todayIso) {
        upcomingCount++;
      }
      const hasPass = hasValidPassportDocument(app);
      const hasTick = hasValidAirticketDocument(app);
      if (hasPass && hasTick) completeDocsCount++;
      if (!hasPass) missingPassportCount++;
      if (!hasTick) missingAirticketCount++;

      if (
        app.applicationStatus === 'Pending' ||
        app.applicationStatus === 'Submitted' ||
        app.applicationStatus === 'Under Review'
      ) {
        pendingCount++;
      }
      if (app.applicationStatus === 'Completed' || app.applicationStatus === 'SIM Arranged') {
        completedCount++;
      }

      const code = extractAirportIataCode(app.arrivalAirport);
      byAirportCode[code] = (byAirportCode[code] || 0) + 1;

      if (app.arrivalDate) {
        byDateMap.set(app.arrivalDate, (byDateMap.get(app.arrivalDate) || 0) + 1);
      }
    }

    const topDates = Array.from(byDateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 12);

    return {
      total: applications.length,
      upcomingCount,
      completeDocsCount,
      missingPassportCount,
      missingAirticketCount,
      pendingCount,
      completedCount,
      byAirportCode,
      topDates,
      totalGroups: arrivalGroups.length,
    };
  }, [applications, arrivalGroups]);

  // =========================================================================
  // PART 2.3, 2.4, 2.5: EXCEL & STUDENT-WISE ZIP EXPORT HANDLERS
  // =========================================================================

  const handleExportExcel = async (
    targetStudents: SimApplicationRecord[],
    options?: { customAirport?: string; customDate?: string; groupId?: string; groupName?: string }
  ) => {
    if (!targetStudents.length) {
      onToast('Please select at least one student to export Excel.');
      return;
    }

    const inferredAirport =
      options?.customAirport ||
      (airportFilter !== 'ALL' ? airportFilter : targetStudents[0]?.arrivalAirport || 'ICN');
    const inferredDate =
      options?.customDate || arrivalDateFilter || targetStudents[0]?.arrivalDate || '';

    const prefix = buildExportBatchFilePrefix({
      airport: inferredAirport,
      arrivalDate: inferredDate,
      customGroupTitle: options?.groupName,
    });
    const fileName = `${prefix}.xlsx`;

    const bytes = generateSimApplicationsExcelBytes({
      students: targetStudents,
      exportTitle: options?.groupName || prefix.replace(/_/g, ' '),
      selectedAirportLabel: inferredAirport,
      selectedArrivalDateLabel: inferredDate ? formatReadableArrivalDate(inferredDate) : 'All Selected Dates',
    });

    triggerBrowserBinaryDownload(
      bytes,
      fileName,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    const completeCount = targetStudents.filter(
      (s) => hasValidPassportDocument(s) && hasValidAirticketDocument(s)
    ).length;

    const historyRecord = await recordSimExportHistoryDoc(
      {
        exportType: 'EXCEL',
        fileName,
        airportCode: extractAirportIataCode(inferredAirport),
        arrivalDate: inferredDate || 'Multiple',
        arrivalGroupId: options?.groupId,
        arrivalGroupName: options?.groupName,
        totalStudents: targetStudents.length,
        completeSubmissionsCount: completeCount,
        missingDocumentsCount: targetStudents.length - completeCount,
        failedDownloadsCount: 0,
        exportedByUid: adminActor.uid,
        exportedByName: adminActor.name,
        exportedByEmail: adminActor.email,
      },
      adminActor
    );
    setExportHistory((prev) => [historyRecord, ...prev]);
    onToast(`Downloaded Excel: ${fileName} (${targetStudents.length} students).`);
  };

  const handleDownloadSingleStudentZip = async (student: SimApplicationRecord) => {
    setBulkBusyMessage(`Packaging original Passport & Airticket ZIP for ${student.fullName}...`);
    try {
      const result = await generateSingleStudentDocumentZip(student);
      triggerBrowserBinaryDownload(result.zipBytes, result.fileName, 'application/zip');

      const historyRecord = await recordSimExportHistoryDoc(
        {
          exportType: 'SINGLE_STUDENT_ZIP',
          fileName: result.fileName,
          airportCode: extractAirportIataCode(student.arrivalAirport),
          arrivalDate: student.arrivalDate || 'Unspecified',
          totalStudents: 1,
          completeSubmissionsCount: result.passportIncluded && result.airticketIncluded ? 1 : 0,
          missingDocumentsCount: !result.passportIncluded || !result.airticketIncluded ? 1 : 0,
          failedDownloadsCount: result.warnings.length,
          exportedByUid: adminActor.uid,
          exportedByName: adminActor.name,
          exportedByEmail: adminActor.email,
        },
        adminActor
      );
      setExportHistory((prev) => [historyRecord, ...prev]);

      if (result.warnings.length > 0) {
        onToast(`Downloaded ${result.fileName} (${result.warnings.join(' | ')})`);
      } else {
        onToast(`Downloaded ${result.fileName}`);
      }
    } catch (err: any) {
      onToast(err?.message || 'Could not generate student ZIP.');
    } finally {
      setBulkBusyMessage(null);
    }
  };

  const handleDownloadBulkStudentsZip = async (
    targetStudents: SimApplicationRecord[],
    options?: { customAirport?: string; customDate?: string; groupId?: string; groupName?: string }
  ) => {
    if (!targetStudents.length) {
      onToast('Please select at least one student to download ZIP.');
      return;
    }

    const inferredAirport =
      options?.customAirport ||
      (airportFilter !== 'ALL' ? airportFilter : targetStudents[0]?.arrivalAirport || 'ICN');
    const inferredDate =
      options?.customDate || arrivalDateFilter || targetStudents[0]?.arrivalDate || '';

    try {
      setBulkBusyMessage(`Preparing student-wise folders & fetching original binary files (0/${targetStudents.length})...`);
      const result = await generateBulkStudentsDocumentZip({
        students: targetStudents,
        airport: inferredAirport,
        arrivalDate: inferredDate,
        customGroupTitle: options?.groupName,
        onProgress: (current, total, studentName) => {
          setBulkBusyMessage(`Packaging student ${current}/${total}: ${studentName}...`);
        },
      });

      triggerBrowserBinaryDownload(result.zipBytes, result.fileName, 'application/zip');

      const historyRecord = await recordSimExportHistoryDoc(
        {
          exportType: options?.groupId ? 'ARRIVAL_GROUP_PACKAGE' : 'BULK_STUDENTS_ZIP',
          fileName: result.fileName,
          airportCode: extractAirportIataCode(inferredAirport),
          arrivalDate: inferredDate || 'Multiple',
          arrivalGroupId: options?.groupId,
          arrivalGroupName: options?.groupName,
          totalStudents: result.totalStudents,
          completeSubmissionsCount: result.completeStudentsCount,
          missingDocumentsCount: result.missingDocumentsCount,
          failedDownloadsCount: result.failedDownloadsCount,
          exportedByUid: adminActor.uid,
          exportedByName: adminActor.name,
          exportedByEmail: adminActor.email,
        },
        adminActor
      );
      setExportHistory((prev) => [historyRecord, ...prev]);

      setZipExportReport({
        fileName: result.fileName,
        totalStudents: result.totalStudents,
        completeStudentsCount: result.completeStudentsCount,
        missingDocumentsCount: result.missingDocumentsCount,
        failedDownloadsCount: result.failedDownloadsCount,
        warnings: result.warnings,
      });

      onToast(`Generated ${result.fileName} with ${result.totalStudents} student folders.`);
    } catch (err: any) {
      onToast(err?.message || 'Bulk ZIP generation failed.');
    } finally {
      setBulkBusyMessage(null);
    }
  };

  // =========================================================================
  // PART 2.2 & 2.8: BULK UPDATES & ARRIVAL GROUP MANAGEMENT
  // =========================================================================

  const handleBulkAssignField = async (field: 'airport' | 'date' | 'status') => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    const updates: Record<string, any> = {};
    if (field === 'airport' && bulkAssignAirportValue) {
      updates.arrivalAirport = bulkAssignAirportValue;
    } else if (field === 'date' && bulkAssignDateValue) {
      updates.arrivalDate = bulkAssignDateValue;
    } else if (field === 'status' && bulkAssignStatusValue) {
      updates.applicationStatus = bulkAssignStatusValue;
    } else {
      onToast('Please choose a value first.');
      return;
    }

    setBulkBusyMessage(`Updating ${ids.length} selected SIM applications...`);
    try {
      await bulkUpdateSimApplicationsDoc({
        applicationIds: ids,
        updates,
        adminActor,
      });
      setApplications((prev) =>
        prev.map((a) => {
          const key = a.applicationId || a.id;
          if (!selectedIds.has(key)) return a;
          return { ...a, ...updates };
        })
      );
      onToast(`Updated ${ids.length} SIM applications.`);
      setBulkAssignAirportValue('');
      setBulkAssignDateValue('');
      setBulkAssignStatusValue('');
    } finally {
      setBulkBusyMessage(null);
    }
  };

  const openCreateArrivalGroupModal = () => {
    if (!selectedApplicationsList.length) {
      onToast('Select one or more students in the table first to create an Arrival Group.');
      return;
    }
    const firstAirport =
      airportFilter !== 'ALL'
        ? airportFilter
        : selectedApplicationsList[0]?.arrivalAirport || AIRPORT_PRESET_OPTIONS[0];
    const firstDate =
      arrivalDateFilter || selectedApplicationsList[0]?.arrivalDate || new Date().toISOString().slice(0, 10);
    const code = extractAirportIataCode(firstAirport);
    const readableDate = formatReadableArrivalDate(firstDate);

    setGroupAirportInput(firstAirport);
    setGroupDateInput(firstDate);
    setGroupTitleInput(`${code} Airport — ${readableDate} Arrival Students`);
    setGroupNotesInput('');
    setIsCreateGroupModalOpen(true);
  };

  const handleCreateArrivalGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicationsList.length) return;
    setBulkBusyMessage('Saving Arrival Group & linking students...');
    try {
      const created = await saveSimArrivalGroupDoc({
        groupName: groupTitleInput,
        airport: groupAirportInput,
        arrivalDate: groupDateInput,
        students: selectedApplicationsList,
        notes: groupNotesInput,
        adminActor,
      });
      setArrivalGroups((prev) => [created, ...prev.filter((g) => g.id !== created.id)]);
      setIsCreateGroupModalOpen(false);
      setActiveSubView('arrival_groups');
      setInspectingGroup(created);
      onToast(`Created Arrival Group "${created.groupName}" (${created.studentApplicationIds.length} students).`);
    } finally {
      setBulkBusyMessage(null);
    }
  };

  const handleRefreshGroupSnapshot = async (group: SimArrivalGroupRecord) => {
    setBulkBusyMessage(`Refreshing live student records for "${group.groupName}"...`);
    try {
      const refreshed = await refreshSimArrivalGroupSnapshotDoc({
        group,
        latestApplications: applications,
        adminActor,
      });
      setArrivalGroups((prev) => prev.map((g) => (g.id === refreshed.id ? refreshed : g)));
      if (inspectingGroup?.id === refreshed.id) {
        setInspectingGroup(refreshed);
      }
      onToast(`Snapshot refreshed for "${refreshed.groupName}".`);
    } finally {
      setBulkBusyMessage(null);
    }
  };

  const handleRemoveStudentFromGroup = async (group: SimArrivalGroupRecord, appIdToRemove: string) => {
    const remainingIds = group.studentApplicationIds.filter((id) => id !== appIdToRemove);
    const remainingApps = applications.filter((a) => remainingIds.includes(a.applicationId || a.id));
    const updated = await saveSimArrivalGroupDoc({
      groupId: group.id,
      groupName: group.groupName,
      airport: group.airport,
      arrivalDate: group.arrivalDate,
      students: remainingApps,
      notes: group.notes,
      status: group.status,
      adminActor,
    });
    setArrivalGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setInspectingGroup(updated);
    onToast('Removed student from arrival group.');
  };

  const handleStatusUpdateSingle = async (app: SimApplicationRecord, newStatus: SimApplicationStatus) => {
    setSavingStatus(true);
    try {
      const ok = await updateSimApplicationStatusDoc(
        app.applicationId || app.id,
        newStatus,
        adminEmail,
        notesInput
      );
      if (ok) {
        setApplications((prev) =>
          prev.map((item) =>
            (item.applicationId || item.id) === (app.applicationId || app.id)
              ? {
                  ...item,
                  applicationStatus: newStatus,
                  adminNotes: notesInput,
                  reviewedBy: adminEmail,
                  reviewedAt: new Date().toISOString(),
                }
              : item
          )
        );
        if (selectedApp && (selectedApp.applicationId || selectedApp.id) === (app.applicationId || app.id)) {
          setSelectedApp({
            ...selectedApp,
            applicationStatus: newStatus,
            adminNotes: notesInput,
            reviewedBy: adminEmail,
            reviewedAt: new Date().toISOString(),
          });
        }
        onToast(`SIM application status updated to "${newStatus}".`);
      }
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-View Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Smartphone className="w-4 h-4" />
            <span>PART 2 — SIM APPLICATION MANAGEMENT, ARRIVAL GROUPS & BULK ZIP/EXCEL</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Korea Arrival SIM Coordination & Student Document Packaging Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select students across pages, group by Airport (ICN, PUS, GMP, CJU) & Arrival Date, and export structured Excel sheets or student-wise Passport & Airticket ZIP archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadAllData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleExportExcel(
                selectedApplicationsList.length > 0 ? selectedApplicationsList : filteredApplications
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>
              Export Excel ({selectedApplicationsList.length > 0 ? selectedApplicationsList.length : filteredApplications.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleDownloadBulkStudentsZip(
                selectedApplicationsList.length > 0 ? selectedApplicationsList : filteredApplications
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>
              Download Student-wise ZIP ({selectedApplicationsList.length > 0 ? selectedApplicationsList.length : filteredApplications.length})
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          {
            id: 'applications',
            label: `SIM Applications Table (${applications.length})`,
            icon: Smartphone,
          },
          {
            id: 'arrival_groups',
            label: `Arrival Groups (${arrivalGroups.length})`,
            icon: Users,
          },
          {
            id: 'exports',
            label: `SIM Excel & ZIP Exports (${exportHistory.length})`,
            icon: FolderArchive,
          },
          {
            id: 'analytics',
            label: 'SIM Arrival Analytics',
            icon: BarChart3,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubView(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Busy Progress Banner */}
      {bulkBusyMessage && (
        <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold text-blue-800 dark:text-blue-200">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{bulkBusyMessage}</span>
        </div>
      )}

      {/* ZIP Export Summary Report Banner */}
      {zipExportReport && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>ZIP Package Generated: {zipExportReport.fileName}</span>
            </div>
            <p className="text-emerald-700 dark:text-emerald-300">
              Total Students: <strong>{zipExportReport.totalStudents}</strong> • Complete (Passport + Airticket):{' '}
              <strong>{zipExportReport.completeStudentsCount}</strong> • Missing Documents:{' '}
              <strong>{zipExportReport.missingDocumentsCount}</strong> • Failed Fetches:{' '}
              <strong>{zipExportReport.failedDownloadsCount}</strong> (Recorded in EXPORT_MANIFEST.xlsx)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setZipExportReport(null)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border border-emerald-200 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 1: SIM APPLICATIONS TABLE & BULK TOOLBAR                       */}
      {/* =================================================================== */}
      {activeSubView === 'applications' && (
        <div className="space-y-4">
          {/* Quick Analytics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Total Applications</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {simAnalytics.total}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-blue-500 uppercase">Upcoming Arrivals</div>
              <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                {simAnalytics.upcomingCount}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-emerald-600 uppercase">Complete Docs</div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {simAnalytics.completeDocsCount}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-rose-500 uppercase">Missing Docs</div>
              <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                {simAnalytics.missingPassportCount + simAnalytics.missingAirticketCount}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-amber-500 uppercase">Pending Review</div>
              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {simAnalytics.pendingCount}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-purple-500 uppercase">Arrival Groups</div>
              <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                {simAnalytics.totalGroups}
              </div>
            </div>
          </div>

          {/* Search, Filters & Airport Quick Pills */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 me-1">
                  Quick Airport Filter:
                </span>
                {['ALL', 'ICN', 'PUS', 'GMP', 'CJU'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setAirportFilter(code)}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                      airportFilter === code
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {code === 'ALL' ? 'All Airports' : `${code} Airport`}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllFilteredAcrossPages}
                  className="px-2.5 py-1 rounded-lg font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 cursor-pointer"
                >
                  Select All Filtered ({filteredApplications.length})
                </button>
                <button
                  type="button"
                  onClick={selectAllApplications}
                  className="px-2.5 py-1 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Select All ({applications.length})
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-2.5 py-1 rounded-lg font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 cursor-pointer"
                  >
                    Clear Selection ({selectedIds.size})
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student name, WhatsApp, university, flight..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs"
                />
              </div>

              <input
                type="date"
                value={arrivalDateFilter}
                onChange={(e) => setArrivalDateFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs"
                title="Filter by Arrival Date"
              />

              <select
                value={universityFilter}
                onChange={(e) => setUniversityFilter(e.target.value)}
                className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs"
              >
                <option value="ALL">All Universities</option>
                {uniqueUniversities.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs"
              >
                <option value="ALL">All Statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold"
              >
                <option value="arrival_asc">Sort: Arrival Date ↑</option>
                <option value="arrival_desc">Sort: Arrival Date ↓</option>
                <option value="name_asc">Sort: Student Name A–Z</option>
                <option value="submission_desc">Sort: Newest Submitted</option>
              </select>
            </div>
          </div>

          {/* =============================================================== */}
          {/* PART 2.2: BULK ACTION TOOLBAR (WHEN STUDENTS ARE SELECTED)      */}
          {/* =============================================================== */}
          {selectedIds.size > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-blue-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-extrabold">
                    {selectedIds.size} Selected
                  </span>
                  <span className="text-xs text-slate-300">
                    Bulk Actions across selected students (persists across pagination)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportExcel(selectedApplicationsList)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadBulkStudentsZip(selectedApplicationsList)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Download Selected Documents as ZIP (.zip)</span>
                  </button>

                  <button
                    type="button"
                    onClick={openCreateArrivalGroupModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Create Arrival Group</span>
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {/* Bulk Field Assignment Row */}
              <div className="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="flex items-center gap-1.5">
                  <select
                    value={bulkAssignAirportValue}
                    onChange={(e) => setBulkAssignAirportValue(e.target.value)}
                    className="flex-1 h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="">Assign Airport...</option>
                    {AIRPORT_PRESET_OPTIONS.map((ap) => (
                      <option key={ap} value={ap}>
                        {ap}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleBulkAssignField('airport')}
                    className="px-3 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={bulkAssignDateValue}
                    onChange={(e) => setBulkAssignDateValue(e.target.value)}
                    className="flex-1 h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleBulkAssignField('date')}
                    className="px-3 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Assign Date
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={bulkAssignStatusValue}
                    onChange={(e) => setBulkAssignStatusValue(e.target.value as any)}
                    className="flex-1 h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="">Change Application Status...</option>
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleBulkAssignField('status')}
                    className="px-3 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* PART 2.1: SIM APPLICATION TABLE                                 */}
          {/* =============================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-3 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectCurrentPage}
                        className="text-slate-500 hover:text-blue-600 cursor-pointer flex items-center"
                        title="Select / Deselect Current Page"
                      >
                        {isCurrentPageAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">Student Name & Country</th>
                    <th className="py-3.5 px-3">University</th>
                    <th className="py-3.5 px-3">WhatsApp</th>
                    <th className="py-3.5 px-3">Arrival Date & Time</th>
                    <th className="py-3.5 px-3">Airport & Flight</th>
                    <th className="py-3.5 px-3">Passport / Airticket</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-right">Actions & Student ZIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedApplications.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500">
                        No SIM applications match your current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedApplications.map((app) => {
                      const appId = app.applicationId || app.id;
                      const isSelected = selectedIds.has(appId);
                      const hasPass = hasValidPassportDocument(app);
                      const hasTick = hasValidAirticketDocument(app);
                      const iata = extractAirportIataCode(app.arrivalAirport);

                      return (
                        <tr
                          key={appId}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-blue-50/60 dark:bg-blue-950/30'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3.5 px-3">
                            <button
                              type="button"
                              onClick={() => toggleSelectOne(appId)}
                              className="cursor-pointer flex items-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {app.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span>{app.country || app.nationality || 'International'}</span>
                              {app.arrivalGroupName && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-semibold">
                                  Group: {app.arrivalGroupName}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
                            {app.universityName}
                          </td>

                          <td className="py-3.5 px-3">
                            <a
                              href={toWhatsAppCleanLink(app.whatsappNumber)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{app.whatsappNumber}</span>
                            </a>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {app.arrivalDate}
                            </div>
                            <div className="text-[11px] text-slate-500">{app.arrivalTime}</div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[10px]">
                                {iata}
                              </span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {app.flightNumber}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                              {app.arrivalAirport}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                                  hasPass
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                              >
                                Passport: {hasPass ? 'Uploaded' : 'Missing'}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                                  hasTick
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                              >
                                Airticket: {hasTick ? 'Uploaded' : 'Missing'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                STATUS_BADGE_STYLES[app.applicationStatus] || STATUS_BADGE_STYLES.Pending
                              }`}
                            >
                              {app.applicationStatus}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadSingleStudentZip(app)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                                title={`Download "${app.fullName} — Passport & Airticket.zip"`}
                              >
                                <FolderArchive className="w-3.5 h-3.5" />
                                <span>ZIP</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setNotesInput(app.adminNotes || '');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  Showing {(currentPage - 1) * pageSize + (paginatedApplications.length ? 1 : 0)}–
                  {(currentPage - 1) * pageSize + paginatedApplications.length} of{' '}
                  {filteredApplications.length} filtered applications
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer font-bold"
                >
                  Prev
                </button>
                <span className="px-2 font-bold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: ARRIVAL GROUPS MANAGEMENT (`sim_arrival_groups`)            */}
      {/* =================================================================== */}
      {activeSubView === 'arrival_groups' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Korea Airport & Date Arrival Groups ({arrivalGroups.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved Arrival Groups preserve historical snapshots and allow one-click Excel (.xlsx) and Student-wise Document ZIP (.zip) downloads.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSubView('applications');
                onToast('Select students in the table and click "Create Arrival Group".');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Select Students to Create New Group</span>
            </button>
          </div>

          {arrivalGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">
                No Arrival Groups Created Yet
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Filter students by Airport (e.g., ICN) and Arrival Date in the SIM Applications table, select them, and click "Create Arrival Group".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {arrivalGroups.map((grp) => {
                const matchedLiveStudents = applications.filter((a) =>
                  grp.studentApplicationIds.includes(a.applicationId || a.id)
                );

                return (
                  <div
                    key={grp.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            {grp.airportCode} • {grp.arrivalDate}
                          </span>
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                            {grp.groupName}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteSimArrivalGroupDoc(grp.id, grp.groupName, adminActor);
                            setArrivalGroups((prev) => prev.filter((g) => g.id !== grp.id));
                            if (inspectingGroup?.id === grp.id) setInspectingGroup(null);
                            onToast(`Deleted group "${grp.groupName}".`);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Arrival Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                        <span>
                          Students: <strong>{grp.studentSnapshots.length}</strong>
                        </span>
                        <span>
                          Snapshot Updated:{' '}
                          <strong>{new Date(grp.snapshotUpdatedAt).toLocaleDateString()}</strong>
                        </span>
                      </div>
                      {grp.notes && <p className="text-xs text-slate-500 italic">"{grp.notes}"</p>}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleExportExcel(
                            matchedLiveStudents.length > 0 ? matchedLiveStudents : applications,
                            {
                              customAirport: grp.airport,
                              customDate: grp.arrivalDate,
                              groupId: grp.id,
                              groupName: grp.groupName,
                            }
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Group Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadBulkStudentsZip(
                            matchedLiveStudents.length > 0 ? matchedLiveStudents : [],
                            {
                              customAirport: grp.airport,
                              customDate: grp.arrivalDate,
                              groupId: grp.id,
                              groupName: grp.groupName,
                            }
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                        <span>Group ZIP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRefreshGroupSnapshot(grp)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                        title="Explicitly refresh snapshot from latest student records"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh Snapshot</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectingGroup(grp)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open Group ({grp.studentSnapshots.length})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Open Arrival Group Snapshot Inspector */}
          {inspectingGroup && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/40 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase text-blue-600">
                    ARRIVAL GROUP SNAPSHOT INSPECTOR
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {inspectingGroup.groupName} ({inspectingGroup.studentSnapshots.length} Students)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingGroup(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">University</th>
                      <th className="py-2 px-3">WhatsApp</th>
                      <th className="py-2 px-3">Arrival</th>
                      <th className="py-2 px-3">Passport / Airticket</th>
                      <th className="py-2 px-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {inspectingGroup.studentSnapshots.map((snap, idx) => (
                      <tr key={snap.applicationId}>
                        <td className="py-2.5 px-3 font-mono font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {snap.fullName}
                        </td>
                        <td className="py-2.5 px-3">{snap.universityName}</td>
                        <td className="py-2.5 px-3 font-mono">{snap.whatsappNumber}</td>
                        <td className="py-2.5 px-3">
                          {snap.airportCode} • {snap.arrivalDate} {snap.arrivalTime}
                        </td>
                        <td className="py-2.5 px-3">
                          Passport: {snap.passportStatus} / Ticket: {snap.airticketStatus}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveStudentFromGroup(inspectingGroup, snap.applicationId)
                            }
                            className="text-rose-600 hover:underline font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: SIM EXCEL & ZIP EXPORT HISTORY (`sim_export_history`)       */}
      {/* =================================================================== */}
      {activeSubView === 'exports' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                SIM Excel & Student-wise ZIP Export History ({exportHistory.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of all Excel (.xlsx) and Student-wise Document ZIP (.zip) packages downloaded by administrators.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-3">Export Timestamp</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Package File Name</th>
                  <th className="py-3 px-3">Airport & Date</th>
                  <th className="py-3 px-3">Students (Complete / Missing)</th>
                  <th className="py-3 px-3">Exported By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {exportHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No exports recorded yet. Select students in the SIM Applications table to export Excel or ZIP.
                    </td>
                  </tr>
                ) : (
                  exportHistory.map((h) => (
                    <tr key={h.id}>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {new Date(h.exportedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {h.exportType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {h.fileName}
                      </td>
                      <td className="py-3 px-3">
                        {h.airportCode} • {h.arrivalDate}
                      </td>
                      <td className="py-3 px-3">
                        Total: <strong>{h.totalStudents}</strong> (Complete:{' '}
                        <span className="text-emerald-600 font-bold">
                          {h.completeSubmissionsCount}
                        </span>{' '}
                        / Missing:{' '}
                        <span className="text-rose-600 font-bold">{h.missingDocumentsCount}</span>)
                      </td>
                      <td className="py-3 px-3 text-slate-500">{h.exportedByEmail}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 4: PART 2.9 SIM DASHBOARD ANALYTICS                            */}
      {/* =================================================================== */}
      {activeSubView === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Airport-wise Student Arrival Breakdown
            </h3>
            <div className="space-y-2.5">
              {[
                { code: 'ICN', label: 'Incheon International Airport (ICN)' },
                { code: 'PUS', label: 'Gimhae International Airport — Busan (PUS)' },
                { code: 'GMP', label: 'Gimpo International Airport — Seoul (GMP)' },
                { code: 'CJU', label: 'Jeju International Airport (CJU)' },
                { code: 'OTHER', label: 'Other Regional Airports' },
              ].map((ap) => {
                const count = simAnalytics.byAirportCode[ap.code] || 0;
                const pct =
                  simAnalytics.total > 0 ? Math.round((count / simAnalytics.total) * 100) : 0;
                return (
                  <div key={ap.code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {ap.label}
                      </span>
                      <span className="font-extrabold text-blue-600">
                        {count} students ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Date-wise Arrival Schedule & Document Completeness
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-emerald-700 dark:text-emerald-300 font-bold">
                  Complete Submissions
                </div>
                <div className="text-lg font-extrabold text-emerald-800 dark:text-emerald-200 mt-0.5">
                  {simAnalytics.completeDocsCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <div className="text-rose-700 dark:text-rose-300 font-bold">
                  Missing Passport / Ticket
                </div>
                <div className="text-lg font-extrabold text-rose-800 dark:text-rose-200 mt-0.5">
                  {simAnalytics.missingPassportCount} / {simAnalytics.missingAirticketCount}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="text-xs font-bold text-slate-500 uppercase">
                Arrival Dates with Registered Students
              </div>
              {simAnalytics.topDates.length === 0 ? (
                <p className="text-xs text-slate-400">No arrival dates recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {simAnalytics.topDates.map(([dateStr, cnt]) => (
                    <div key={dateStr} className="py-2 flex items-center justify-between">
                      <span className="font-mono font-bold">{dateStr}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setArrivalDateFilter(dateStr);
                          setActiveSubView('applications');
                        }}
                        className="text-blue-600 font-extrabold hover:underline cursor-pointer"
                      >
                        {cnt} students → Filter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE ARRIVAL GROUP                                         */}
      {/* =================================================================== */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateArrivalGroupSubmit}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Create Arrival Group ({selectedApplicationsList.length} Selected Students)
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Arrival Group Title</label>
              <input
                type="text"
                required
                value={groupTitleInput}
                onChange={(e) => setGroupTitleInput(e.target.value)}
                placeholder="e.g., ICN Airport — 10 November 2027 Arrival Students"
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Arrival Airport</label>
                <select
                  value={groupAirportInput}
                  onChange={(e) => setGroupAirportInput(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {uniqueAirports.map((ap) => (
                    <option key={ap} value={ap}>
                      {ap}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Arrival Date</label>
                <input
                  type="date"
                  required
                  value={groupDateInput}
                  onChange={(e) => setGroupDateInput(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Coordination Notes</label>
              <textarea
                rows={2}
                value={groupNotesInput}
                onChange={(e) => setGroupNotesInput(e.target.value)}
                placeholder="Terminal pickup point, SIM coordinator name, or WhatsApp broadcast notes..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-purple-600 text-white cursor-pointer"
              >
                Save Arrival Group
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: INDIVIDUAL STUDENT APPLICATION & DOCUMENT INSPECTOR          */}
      {/* =================================================================== */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Student SIM Application: {selectedApp.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedApp.universityName} • {selectedApp.arrivalAirport} ({selectedApp.arrivalDate})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="text-xs">
                <div className="font-extrabold text-blue-900 dark:text-blue-200">
                  Individual Student Document ZIP Package
                </div>
                <div className="text-blue-700 dark:text-blue-300">
                  Generates: <strong>{selectedApp.fullName} — Passport & Airticket.zip</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadSingleStudentZip(selectedApp)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer"
              >
                <FolderArchive className="w-4 h-4" />
                <span>Download Student ZIP</span>
              </button>
            </div>

            {/* Document Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  1. Passport Document ({selectedApp.passportFileName || 'Passport'})
                </div>
                {loadingDocs ? (
                  <span className="text-slate-400">Resolving document URL...</span>
                ) : resolvedPassportUrl ? (
                  <a
                    href={resolvedPassportUrl}
                    download={selectedApp.passportFileName || `${selectedApp.fullName}_Passport`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Open / Download Original Passport</span>
                  </a>
                ) : (
                  <span className="text-rose-500 font-semibold">Passport document missing</span>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  2. Flight Ticket ({selectedApp.flightTicketFileName || 'Airticket'})
                </div>
                {loadingDocs ? (
                  <span className="text-slate-400">Resolving document URL...</span>
                ) : resolvedTicketUrl ? (
                  <a
                    href={resolvedTicketUrl}
                    download={selectedApp.flightTicketFileName || `${selectedApp.fullName}_Airticket`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Open / Download Original Airticket</span>
                  </a>
                ) : (
                  <span className="text-rose-500 font-semibold">Airticket document missing</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Admin Coordination Notes</label>
              <textarea
                rows={2}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={savingStatus}
                  onClick={() => handleStatusUpdateSingle(selectedApp, st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    selectedApp.applicationStatus === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
