/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Admin Student Application Details Workspace
 * Renders Sections A–G + Review & Approval Workflow + Side-by-Side Secure Private Document Viewer.
 * Usable inline inside AdminSmartApplicationsPanel AND standalone at `/admin/applications/:applicationId`.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileArchive,
  FileCheck2,
  FileDown,
  FileText,
  GraduationCap,
  History,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Wallet,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  adminAddInternalNote,
  adminAssignSmartApplication,
  adminReviewApplicationDocument,
  adminSendStudentMessage,
  adminUpdateSmartApplicationStatus,
  fetchApplicationHistory,
  fetchDocumentAccessLogs,
  fetchPrivateDocumentBlob,
  fetchPrivateDocumentBlobUrl,
  logAdminDocumentAccess,
} from '../../services/smartApplicationService';
import { buildAndDownloadApplicationZip } from '../../utils/documentFileTools';
import { downloadApplicationSummaryPdf } from '../../utils/applicationPdfExporter';
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  buildApplicationDocumentMatrix,
  buildRequestableDocumentCatalog,
  computeApplicationDocCompletion,
  maskPassportNumber,
  resolveDocumentVerificationStatus,
} from '../../utils/applicationDocumentTaxonomy';
import type {
  SmartApplicationAdminRole,
  SmartApplicationDocumentAccessLog,
  SmartApplicationDocumentCategory,
  SmartApplicationDocumentItem,
  SmartApplicationDocumentVerificationStatus,
  SmartApplicationHistoryEvent,
  SmartApplicationRecord,
  SmartApplicationRequestedDocument,
  SmartApplicationStatus,
} from '../../types/smartApplication';
import {
  SMART_APPLICATION_STATUS_META,
  SMART_APPLICATION_STATUS_ORDER,
  isAllowedStatusTransition,
  normalizeSmartApplicationStatus,
} from '../../types/smartApplication';

export interface StaffAssigneeOption {
  uid: string;
  name: string;
  email: string;
}

interface AdminApplicationDetailViewProps {
  application: SmartApplicationRecord;
  adminRole: SmartApplicationAdminRole;
  staffOptions?: StaffAssigneeOption[];
  onBack?: () => void;
  onApplicationUpdated: (updated: SmartApplicationRecord) => void;
  showStandaloneLink?: boolean;
}

type DetailSectionTab =
  | 'profile'
  | 'university'
  | 'documents'
  | 'ai_passport'
  | 'education'
  | 'finance'
  | 'history';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function verificationBadgeClass(status: SmartApplicationDocumentVerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800';
    case 'replacement_requested':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/15';
  }
}

function verificationLabel(status: SmartApplicationDocumentVerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'rejected':
      return 'Rejected';
    case 'replacement_requested':
      return 'Replacement Requested';
    default:
      return 'Pending Review';
  }
}

export const AdminApplicationDetailView: React.FC<AdminApplicationDetailViewProps> = ({
  application,
  adminRole,
  staffOptions = [],
  onBack,
  onApplicationUpdated,
  showStandaloneLink = false,
}) => {
  const { currentUser, showToast } = useApp();

  const canMutate = adminRole === 'admin' || adminRole === 'counsellor';
  const canAssign = adminRole === 'admin';
  const canRevealPassport = adminRole === 'admin' || adminRole === 'counsellor';
  const canAccessRawDocuments = adminRole === 'admin' || adminRole === 'counsellor';
  const canViewAuditLogs = adminRole === 'admin';

  const [activeTab, setActiveTab] = useState<DetailSectionTab>('profile');
  const [revealPassport, setRevealPassport] = useState(false);

  // Timeline & Access Audit
  const [historyEvents, setHistoryEvents] = useState<SmartApplicationHistoryEvent[]>([]);
  const [accessLogs, setAccessLogs] = useState<SmartApplicationDocumentAccessLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Document viewer (side-by-side)
  const [viewerDoc, setViewerDoc] = useState<{
    docType: string;
    label: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    storagePath: string;
    url: string;
    isObjectUrl: boolean;
    versionLabel?: string;
  } | null>(null);
  const [loadingViewerKey, setLoadingViewerKey] = useState<string | null>(null);
  const viewerObjectUrlRef = useRef<string | null>(null);

  // Document verification states
  const [expandedVersionDoc, setExpandedVersionDoc] = useState<string | null>(null);
  const [docReviewNotes, setDocReviewNotes] = useState<Record<string, string>>({});
  const [reviewingDocKey, setReviewingDocKey] = useState<string | null>(null);
  const [activeDocCategory, setActiveDocCategory] = useState<
    SmartApplicationDocumentCategory | 'all'
  >('all');

  // Workflow states
  const [nextStatus, setNextStatus] = useState<SmartApplicationStatus>(
    normalizeSmartApplicationStatus(application.status)
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Missing document request modal/panel
  const [showMissingDocsBox, setShowMissingDocsBox] = useState(false);
  const [missingDocsSelected, setMissingDocsSelected] = useState<Record<string, boolean>>({});
  const [missingDocsMessage, setMissingDocsMessage] = useState('');
  const [missingDocsDeadline, setMissingDocsDeadline] = useState('');

  // Assign counsellor
  const [assignUid, setAssignUid] = useState(application.assignedTo || '');
  const [assignName, setAssignName] = useState(application.assignedToName || '');
  const [assignEmail, setAssignEmail] = useState(application.assignedToEmail || '');
  const [assigning, setAssigning] = useState(false);

  // Direct message to student
  const [directMessage, setDirectMessage] = useState('');
  const [sendMessageEmail, setSendMessageEmail] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Internal staff note
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Export states
  const [exportingZip, setExportingZip] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Sync local inputs when switching application
  useEffect(() => {
    setNextStatus(normalizeSmartApplicationStatus(application.status));
    setStatusMessage('');
    setShowMissingDocsBox(false);
    setMissingDocsSelected({});
    setMissingDocsMessage('');
    setMissingDocsDeadline('');
    setAssignUid(application.assignedTo || '');
    setAssignName(application.assignedToName || '');
    setAssignEmail(application.assignedToEmail || '');
    setRevealPassport(false);

    if (viewerObjectUrlRef.current) {
      URL.revokeObjectURL(viewerObjectUrlRef.current);
      viewerObjectUrlRef.current = null;
    }
    setViewerDoc(null);

    let cancelled = false;
    setLoadingLogs(true);
    Promise.all([
      fetchApplicationHistory(application.id),
      canViewAuditLogs ? fetchDocumentAccessLogs(application.id) : Promise.resolve([]),
    ])
      .then(([hist, logs]) => {
        if (!cancelled) {
          setHistoryEvents(hist);
          setAccessLogs(logs);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLogs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [application.id, canViewAuditLogs]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (viewerObjectUrlRef.current) {
        URL.revokeObjectURL(viewerObjectUrlRef.current);
        viewerObjectUrlRef.current = null;
      }
    };
  }, []);

  const normalizedStatus = normalizeSmartApplicationStatus(application.status);
  const statusMeta =
    SMART_APPLICATION_STATUS_META[normalizedStatus] || SMART_APPLICATION_STATUS_META.draft;

  const studentFullName =
    `${application.personal?.givenNames || ''} ${application.personal?.surname || ''}`.trim() ||
    'Unnamed Applicant';

  const documentMatrix = useMemo(
    () => buildApplicationDocumentMatrix(application),
    [application]
  );

  const requestableCatalog = useMemo(
    () => buildRequestableDocumentCatalog(application),
    [application]
  );

  const docCompletion = useMemo(
    () => computeApplicationDocCompletion(application),
    [application]
  );

  const allowedNextStatuses = useMemo(() => {
    if (!canMutate) return [normalizedStatus];
    return SMART_APPLICATION_STATUS_ORDER.filter(
      (s) =>
        s === normalizedStatus ||
        isAllowedStatusTransition({
          from: normalizedStatus,
          to: s,
          actorRole: adminRole === 'counsellor' ? 'counsellor' : 'admin',
        })
    );
  }, [canMutate, normalizedStatus, adminRole]);

  const refreshTimelineAndAudit = async () => {
    const [hist, logs] = await Promise.all([
      fetchApplicationHistory(application.id),
      canViewAuditLogs ? fetchDocumentAccessLogs(application.id) : Promise.resolve([]),
    ]);
    setHistoryEvents(hist);
    setAccessLogs(logs);
  };

  // Secure Document Preview (private Firebase Storage getBlob + audit log)
  const handlePreviewFile = async (params: {
    docType: string;
    label: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    storagePath: string;
    legacyUrl?: string;
    versionLabel?: string;
  }) => {
    if (!currentUser?.uid) return;
    if (!canAccessRawDocuments) {
      showToast('Viewers have read-only summary access and cannot open raw student documents.');
      return;
    }
    const key = `${params.docType}:${params.storagePath}`;
    setLoadingViewerKey(key);
    try {
      const { url, isObjectUrl } = await fetchPrivateDocumentBlobUrl(
        params.storagePath,
        params.legacyUrl,
        application.id
      );
      if (viewerObjectUrlRef.current) {
        URL.revokeObjectURL(viewerObjectUrlRef.current);
        viewerObjectUrlRef.current = null;
      }
      if (isObjectUrl) {
        viewerObjectUrlRef.current = url;
      }
      setViewerDoc({
        docType: params.docType,
        label: params.label,
        fileName: params.fileName,
        mimeType: params.mimeType,
        size: params.size,
        uploadedAt: params.uploadedAt,
        storagePath: params.storagePath,
        url,
        isObjectUrl,
        versionLabel: params.versionLabel,
      });

      await logAdminDocumentAccess({
        applicationId: application.id,
        docType: params.docType,
        fileName: params.fileName,
        storagePath: params.storagePath,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole || 'viewer',
        action: 'preview',
      });
      if (canViewAuditLogs) {
        fetchDocumentAccessLogs(application.id).then(setAccessLogs).catch(() => {});
      }
    } catch {
      showToast('Could not load private document preview.');
    } finally {
      setLoadingViewerKey(null);
    }
  };

  // Authorized Document Download (private Blob + audit log)
  const handleDownloadSingleFile = async (params: {
    docType: string;
    fileName: string;
    storagePath: string;
  }) => {
    if (!currentUser?.uid) return;
    if (!canAccessRawDocuments) {
      showToast('Viewers have read-only summary access and cannot download raw student documents.');
      return;
    }
    try {
      const blob = await fetchPrivateDocumentBlob(params.storagePath, application.id);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = params.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);

      await logAdminDocumentAccess({
        applicationId: application.id,
        docType: params.docType,
        fileName: params.fileName,
        storagePath: params.storagePath,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole || 'viewer',
        action: 'download',
      });
      if (canViewAuditLogs) {
        fetchDocumentAccessLogs(application.id).then(setAccessLogs).catch(() => {});
      }
      showToast(`Downloaded ${params.fileName}`);
    } catch {
      showToast('Authorized download failed. Check Storage permissions.');
    }
  };

  // Verify / Reject / Flag Replacement for a single document
  const handleReviewDocument = async (
    docType: string,
    verificationStatus: SmartApplicationDocumentVerificationStatus
  ) => {
    if (!canMutate || !currentUser?.uid) return;
    setReviewingDocKey(`${docType}:${verificationStatus}`);
    try {
      const updated = await adminReviewApplicationDocument({
        application,
        docType,
        verificationStatus,
        note: docReviewNotes[docType] || '',
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole === 'counsellor' ? 'counsellor' : 'admin',
      });
      onApplicationUpdated(updated);
      await refreshTimelineAndAudit();
      showToast(`Document marked as ${verificationLabel(verificationStatus)}.`);
    } catch (err: any) {
      showToast(err?.message || 'Could not update document verification status.');
    } finally {
      setReviewingDocKey(null);
    }
  };

  // Update application status
  const handleUpdateStatus = async () => {
    if (!canMutate || !currentUser?.uid) return;
    if (nextStatus === 'documents_missing') {
      setShowMissingDocsBox(true);
      return;
    }
    setUpdatingStatus(true);
    try {
      const updated = await adminUpdateSmartApplicationStatus({
        application,
        nextStatus,
        message: statusMessage.trim(),
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole === 'counsellor' ? 'counsellor' : 'admin',
      });
      onApplicationUpdated(updated);
      setStatusMessage('');
      await refreshTimelineAndAudit();
      showToast(
        `Status updated to ${SMART_APPLICATION_STATUS_META[nextStatus]?.label || nextStatus}.`
      );
    } catch (err: any) {
      showToast(err?.message || 'Could not update application status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Submit missing documents request
  const handleSubmitMissingDocumentsRequest = async () => {
    if (!canMutate || !currentUser?.uid) return;
    const now = new Date().toISOString();
    const selected: SmartApplicationRequestedDocument[] = requestableCatalog
      .filter((item) => missingDocsSelected[item.docType])
      .map((item) => ({
        docType: item.docType,
        label: item.label,
        requestedAt: now,
        deadline: missingDocsDeadline || '',
        status: 'pending',
      }));

    if (selected.length === 0) {
      showToast('Select at least one missing or replacement document.');
      return;
    }

    setUpdatingStatus(true);
    try {
      const updated = await adminUpdateSmartApplicationStatus({
        application,
        nextStatus: 'documents_missing',
        message:
          missingDocsMessage.trim() ||
          `Please upload the requested document(s): ${selected.map((s) => s.label).join(', ')}.`,
        requestedDocuments: selected,
        requestedDeadline: missingDocsDeadline || undefined,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole === 'counsellor' ? 'counsellor' : 'admin',
      });
      onApplicationUpdated(updated);
      setNextStatus('documents_missing');
      setShowMissingDocsBox(false);
      setMissingDocsSelected({});
      setMissingDocsMessage('');
      setMissingDocsDeadline('');
      await refreshTimelineAndAudit();
      showToast('Missing document request sent to student.');
    } catch (err: any) {
      showToast(err?.message || 'Could not send document request.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Assign counsellor
  const handleAssignCounsellor = async () => {
    if (!canAssign || !currentUser?.uid) return;
    setAssigning(true);
    try {
      const cleanUid = assignUid.trim() || null;
      const cleanName = cleanUid ? assignName.trim() || assignEmail.trim() || cleanUid : null;
      const cleanEmail = cleanUid ? assignEmail.trim() || null : null;

      await adminAssignSmartApplication({
        applicationId: application.id,
        application,
        assignedTo: cleanUid,
        assignedToName: cleanName,
        assignedToEmail: cleanEmail,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
      });

      const updated: SmartApplicationRecord = {
        ...application,
        assignedTo: cleanUid,
        assignedToName: cleanName,
        assignedToEmail: cleanEmail,
        updatedAt: new Date().toISOString(),
      };
      onApplicationUpdated(updated);
      await refreshTimelineAndAudit();
      showToast(cleanUid ? `Assigned to ${cleanName}.` : 'Counsellor unassigned.');
    } catch (err: any) {
      showToast(err?.message || 'Could not update counsellor assignment.');
    } finally {
      setAssigning(false);
    }
  };

  // Direct message to student
  const handleSendDirectMessage = async () => {
    if (!canMutate || !currentUser?.uid || !directMessage.trim()) return;
    setSendingMessage(true);
    try {
      await adminSendStudentMessage({
        application,
        message: directMessage,
        sendEmail: sendMessageEmail,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole === 'counsellor' ? 'counsellor' : 'admin',
      });
      setDirectMessage('');
      await refreshTimelineAndAudit();
      showToast('Message delivered to student.');
    } catch (err: any) {
      showToast(err?.message || 'Could not send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Internal staff note
  const handleAddNote = async () => {
    if (!canMutate || !currentUser?.uid || !noteInput.trim()) return;
    setSavingNote(true);
    try {
      const nextNotes = await adminAddInternalNote({
        application,
        text: noteInput,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole === 'counsellor' ? 'counsellor' : 'admin',
      });
      onApplicationUpdated({
        ...application,
        notes: nextNotes,
        updatedAt: new Date().toISOString(),
      });
      setNoteInput('');
      await refreshTimelineAndAudit();
      showToast('Internal staff note saved.');
    } catch (err: any) {
      showToast(err?.message || 'Could not save internal note.');
    } finally {
      setSavingNote(false);
    }
  };

  // Export individual PDF summary
  const handleExportPdf = async () => {
    if (!currentUser?.uid) return;
    setExportingPdf(true);
    try {
      const { fileName } = downloadApplicationSummaryPdf({
        app: application,
        history: historyEvents,
        maskPassport: !canRevealPassport,
        docMatrix: documentMatrix,
      });
      await logAdminDocumentAccess({
        applicationId: application.id,
        docType: 'pdf_summary',
        fileName,
        storagePath: `applications/${application.userId}/${application.id}/summary.pdf`,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole || 'viewer',
        action: 'pdf_export',
      });
      if (canViewAuditLogs) {
        fetchDocumentAccessLogs(application.id).then(setAccessLogs).catch(() => {});
      }
      showToast(`Exported ${fileName}`);
    } catch {
      showToast('Could not generate PDF summary.');
    } finally {
      setExportingPdf(false);
    }
  };

  // Export individual document ZIP
  const handleDownloadZip = async () => {
    if (!currentUser?.uid) return;
    if (!canAccessRawDocuments) {
      showToast('Viewers cannot export raw student documents. Use PDF Summary instead.');
      return;
    }
    const docs = Object.values(application.documents || {});
    if (docs.length === 0) {
      showToast('No uploaded documents available to package.');
      return;
    }
    setExportingZip(true);
    try {
      const { zipName, downloadedCount } = await buildAndDownloadApplicationZip({
        surname: application.personal?.surname || 'APPLICANT',
        givenNames: application.personal?.givenNames || 'STUDENT',
        universityName: application.universityName,
        intake: application.intake,
        files: docs.map((d) => ({
          docType: d.docType,
          category: d.category,
          fileName: d.fileName,
          blobFetcher: () => fetchPrivateDocumentBlob(d.storagePath, application.id),
        })),
      });
      await logAdminDocumentAccess({
        applicationId: application.id,
        docType: 'zip_bundle',
        fileName: zipName,
        storagePath: `applications/${application.userId}/${application.id}/*`,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: adminRole || 'viewer',
        action: 'zip_export',
      });
      if (canViewAuditLogs) {
        fetchDocumentAccessLogs(application.id).then(setAccessLogs).catch(() => {});
      }
      showToast(`Downloaded ${zipName} (${downloadedCount} files).`);
    } catch {
      showToast('Could not generate ZIP bundle.');
    } finally {
      setExportingZip(false);
    }
  };

  const tabs: Array<{ id: DetailSectionTab; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'profile', label: 'A. Student Profile', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'university', label: 'B. University App', icon: <Building2 className="w-3.5 h-3.5" /> },
    {
      id: 'documents',
      label: 'C. Documents',
      icon: <FileCheck2 className="w-3.5 h-3.5" />,
      badge: `${docCompletion.uploadedCount}/${docCompletion.totalExpected}`,
    },
    { id: 'ai_passport', label: 'D. AI Passport', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'education', label: 'E. Education', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { id: 'finance', label: 'F. Finance', icon: <Wallet className="w-3.5 h-3.5" /> },
    {
      id: 'history',
      label: 'G. History & Audit',
      icon: <History className="w-3.5 h-3.5" />,
      badge: String(historyEvents.length),
    },
  ];

  // AI Passport Comparison Rows (Section D)
  const aiSnapshot = application.aiPassportSnapshot;
  const aiComparisonRows = useMemo(() => {
    const p = application.personal;
    const raw = aiSnapshot;
    const rows = [
      { key: 'personal.surname', label: 'Surname', ai: raw?.surname || '', student: p?.surname || '' },
      { key: 'personal.givenNames', label: 'Given Names', ai: raw?.givenNames || '', student: p?.givenNames || '' },
      {
        key: 'personal.passportNumber',
        label: 'Passport Number',
        ai: raw?.passportNumber
          ? revealPassport && canRevealPassport
            ? raw.passportNumber
            : maskPassportNumber(raw.passportNumber)
          : '',
        student: p?.passportNumber
          ? revealPassport && canRevealPassport
            ? p.passportNumber
            : maskPassportNumber(p.passportNumber)
          : '',
        rawMismatch:
          Boolean(raw?.passportNumber) &&
          raw!.passportNumber.toUpperCase() !== (p?.passportNumber || '').toUpperCase(),
      },
      {
        key: 'personal.nationality',
        label: 'Nationality',
        ai: raw?.nationality || raw?.nationalityIso3 || '',
        student: p?.nationality || '',
      },
      { key: 'personal.dateOfBirth', label: 'Date of Birth', ai: raw?.dateOfBirth || '', student: p?.dateOfBirth || '' },
      { key: 'personal.gender', label: 'Gender / Sex', ai: raw?.gender || '', student: p?.gender || '' },
      {
        key: 'personal.passportIssueDate',
        label: 'Passport Issue Date',
        ai: raw?.issueDate || '',
        student: p?.passportIssueDate || '',
      },
      {
        key: 'personal.passportExpiryDate',
        label: 'Passport Expiry Date',
        ai: raw?.expiryDate || '',
        student: p?.passportExpiryDate || '',
      },
      {
        key: 'personal.placeOfBirth',
        label: 'Place of Birth',
        ai: raw?.placeOfBirth || '',
        student: p?.placeOfBirth || '',
      },
    ];
    return rows.map((r) => {
      const wasAiFilled = (application.aiFilledFields || []).includes(r.key);
      const isVerifiedByStudent = (application.verifiedFields || []).includes(r.key);
      const needsCheck = (application.aiCheckWarningFields || []).includes(r.key);
      const editedByStudent =
        typeof (r as any).rawMismatch === 'boolean'
          ? (r as any).rawMismatch
          : Boolean(r.ai && r.student && r.ai.trim().toUpperCase() !== r.student.trim().toUpperCase());
      return { ...r, wasAiFilled, isVerifiedByStudent, needsCheck, editedByStudent };
    });
  }, [aiSnapshot, application, revealPassport, canRevealPassport]);

  return (
    <div className="space-y-4">
      {/* Top Action & Breadcrumb Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg border border-slate-200 dark:border-white/15 bg-[#F4F8FD] dark:bg-white/5 text-[#081426] dark:text-white hover:bg-slate-100 cursor-pointer shrink-0"
              title="Back to Applications List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
            {application.universityLogoUrl ? (
              <img
                src={application.universityLogoUrl}
                alt={application.universityName}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 className="w-5 h-5 text-[#081426]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#081426] dark:text-white truncate">
                {studentFullName}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
              {application.duplicatePassportFlag && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-200">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Duplicate Passport Alert
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#526685] dark:text-[#93A9CB] mt-0.5">
              <span className="font-semibold text-[#081426] dark:text-slate-200">
                {application.universityName}
              </span>
              <span>·</span>
              <span>{application.degreeLevel}</span>
              <span>·</span>
              <span>{application.intake}</span>
              <span>·</span>
              <span className="font-mono text-[11px]">{application.id}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {showStandaloneLink && (
            <Link
              to={`/admin/applications/${application.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/15 bg-[#F4F8FD] dark:bg-white/5 text-[#081426] dark:text-white hover:bg-slate-100"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Page</span>
            </Link>
          )}
          <button
            type="button"
            disabled={exportingPdf}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white hover:bg-slate-50 cursor-pointer disabled:opacity-60"
          >
            {exportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-[#2563EB]" />
            )}
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            disabled={exportingZip}
            onClick={handleDownloadZip}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer disabled:opacity-60"
          >
            {exportingZip ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileArchive className="w-3.5 h-3.5" />
            )}
            <span>Download Docs ZIP</span>
          </button>
        </div>
      </div>

      {/* Viewer Read-Only Banner */}
      {!canMutate && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-[#F4F8FD] dark:bg-white/5 px-4 py-2.5 flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5]">
          <Shield className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>
            <strong>Read-Only Viewer Mode:</strong> Passport numbers are masked and status/document
            review actions are restricted. All document previews and exports are audit-logged.
          </span>
        </div>
      )}

      {/* Main Two-Column Workspace: Left Details & Workflow (7 cols) + Right Secure Document Viewer (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN */}
        <div className="xl:col-span-7 space-y-4">
          {/* Section Navigation Tabs */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] p-1.5 flex items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#081426] dark:bg-[#2563EB] text-white'
                      : 'text-[#526685] dark:text-[#93A9CB] hover:bg-[#F4F8FD] dark:hover:bg-white/5 hover:text-[#081426] dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] tabular-nums ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-white/10 text-[#081426] dark:text-slate-200'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* SECTION CONTENT PANEL */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] p-5">
            {/* SECTION A — STUDENT PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                  <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                    Section A — Student Profile
                  </h3>
                  {canRevealPassport && application.personal?.passportNumber && (
                    <button
                      type="button"
                      onClick={() => setRevealPassport((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-white/15 bg-[#F4F8FD] dark:bg-white/5 text-[#081426] dark:text-white cursor-pointer"
                    >
                      {revealPassport ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{revealPassport ? 'Mask Passport' : 'Reveal Passport'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <InfoCell label="Full Name" value={studentFullName} />
                  <InfoCell label="Student UID" value={application.userId} mono />
                  <InfoCell label="Email Address" value={application.personal?.email} />
                  <InfoCell
                    label="Phone Number"
                    value={
                      `${application.personal?.phoneCountryCode || ''} ${
                        application.personal?.phoneNumber || ''
                      }`.trim() || '—'
                    }
                  />
                  <InfoCell label="Nationality" value={application.personal?.nationality} />
                  <InfoCell
                    label="Passport Number (Restricted)"
                    value={
                      application.personal?.passportNumber
                        ? revealPassport && canRevealPassport
                          ? application.personal.passportNumber
                          : maskPassportNumber(application.personal.passportNumber)
                        : '—'
                    }
                    mono
                  />
                  <InfoCell label="Date of Birth" value={application.personal?.dateOfBirth} />
                  <InfoCell label="Gender" value={application.personal?.gender} />
                  <InfoCell label="Passport Issue Date" value={application.personal?.passportIssueDate} />
                  <InfoCell label="Passport Expiry Date" value={application.personal?.passportExpiryDate} />
                  <InfoCell label="Place of Birth" value={application.personal?.placeOfBirth} />
                  <InfoCell
                    label="Current Country"
                    value={application.personal?.currentCountry || application.personal?.nationality}
                  />
                  <div className="sm:col-span-2">
                    <InfoCell label="Current Address" value={application.personal?.currentAddress} />
                  </div>
                  <InfoCell
                    label="Emergency Contact"
                    value={
                      application.personal?.emergencyContactName
                        ? `${application.personal.emergencyContactName} (${
                            application.personal.emergencyContactRelation || 'Contact'
                          })`
                        : '—'
                    }
                  />
                  <InfoCell
                    label="Emergency Phone"
                    value={application.personal?.emergencyContactPhone}
                  />
                </div>
              </div>
            )}

            {/* SECTION B — UNIVERSITY APPLICATION */}
            {activeTab === 'university' && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-100 dark:border-white/10">
                  <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                    Section B — University Application
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <InfoCell label="Application ID" value={application.id} mono />
                  <InfoCell label="Application Status" value={statusMeta.label} />
                  <InfoCell label="University Name" value={application.universityName} />
                  <InfoCell label="University ID" value={application.universityId} mono />
                  <InfoCell label="Degree Level" value={application.degreeLevel} />
                  <InfoCell label="Selected Program / Major" value={application.program?.desiredMajor} />
                  <InfoCell label="Second Choice Major" value={application.program?.secondChoiceMajor} />
                  <InfoCell
                    label="Scholarship Interest"
                    value={
                      application.program?.scholarshipInterest
                        ? application.program.preferredScholarshipName || 'Yes'
                        : 'No'
                    }
                  />
                  <InfoCell label="Intake" value={application.intake} />
                  <InfoCell label="Admission Round" value={application.round} />
                  <InfoCell label="Application Deadline" value={application.applicationDeadline} />
                  <InfoCell label="Intake Start Date" value={application.intakeStartDate} />
                  <InfoCell label="Submission Date" value={formatDateTime(application.submittedAt)} />
                  <InfoCell label="Last Updated" value={formatDateTime(application.updatedAt)} />
                  <InfoCell
                    label="Assigned Counsellor"
                    value={
                      application.assignedToName
                        ? `${application.assignedToName}${
                            application.assignedToEmail ? ` (${application.assignedToEmail})` : ''
                          }`
                        : 'Unassigned'
                    }
                  />
                  <InfoCell
                    label="Consent Recorded"
                    value={
                      application.consent?.dataProcessing
                        ? `Accepted (${formatDateTime(application.consent.acceptedAt)})`
                        : 'Not yet accepted'
                    }
                  />
                </div>
              </div>
            )}

            {/* SECTION C — UPLOADED DOCUMENTS (5 CATEGORIES + VERSION HISTORY) */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                      Section C — Uploaded Documents
                    </h3>
                    <p className="text-[11px] text-[#526685] dark:text-[#93A9CB]">
                      {docCompletion.uploadedCount} uploaded · {docCompletion.verifiedCount} verified
                      {docCompletion.rejectedCount > 0 ? ` · ${docCompletion.rejectedCount} needs fix` : ''}
                      {documentMatrix.isUniversitySpecificChecklist
                        ? ` · Synced from ${application.universityName} requirements`
                        : ' · General university checklist'}
                    </p>
                  </div>
                  {canMutate && (
                    <button
                      type="button"
                      onClick={() => setShowMissingDocsBox((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800 cursor-pointer shrink-0"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Request Missing Docs</span>
                    </button>
                  )}
                </div>

                {/* 5-Category Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveDocCategory('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      activeDocCategory === 'all'
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-[#F4F8FD] dark:bg-white/5 text-[#526685] dark:text-[#93A9CB] border-slate-200 dark:border-white/10'
                    }`}
                  >
                    All ({documentMatrix.slots.length})
                  </button>
                  {DOCUMENT_CATEGORIES.map((cat) => {
                    const group = documentMatrix.byCategory[cat.id];
                    const uploadedInCat = group.filter((e) => Boolean(e.uploadedItem)).length;
                    const active = activeDocCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveDocCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          active
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-[#F4F8FD] dark:bg-white/5 text-[#526685] dark:text-[#93A9CB] border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {CATEGORY_LABELS[cat.id]} ({uploadedInCat}/{group.length})
                      </button>
                    );
                  })}
                </div>

                {/* Categorized Document List */}
                <div className="space-y-4">
                  {DOCUMENT_CATEGORIES.filter(
                    (cat) => activeDocCategory === 'all' || activeDocCategory === cat.id
                  ).map((cat) => {
                    const rows = documentMatrix.byCategory[cat.id];
                    if (rows.length === 0) return null;
                    return (
                      <div key={cat.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#526685] dark:text-[#93A9CB]">
                            {CATEGORY_LABELS[cat.id]}
                          </h4>
                          <span className="text-[11px] font-semibold text-[#526685] tabular-nums">
                            {rows.filter((r) => Boolean(r.uploadedItem)).length} / {rows.length} uploaded
                          </span>
                        </div>

                        <div className="space-y-2">
                          {rows.map((row) => {
                            const doc = row.uploadedItem;
                            const vStatus = doc
                              ? resolveDocumentVerificationStatus(doc)
                              : null;
                            const prevVersions = doc?.previousVersions || [];
                            const isVersionsOpen = expandedVersionDoc === row.docType;

                            return (
                              <div
                                key={row.docType}
                                className={`rounded-xl border p-3.5 space-y-2.5 ${
                                  doc
                                    ? 'border-slate-200 dark:border-white/10 bg-[#F4F8FD]/50 dark:bg-white/[0.03]'
                                    : 'border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-transparent'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-xs font-extrabold text-[#081426] dark:text-white">
                                        {row.label}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-[#526685] dark:text-slate-300">
                                        {row.requirementType}
                                      </span>
                                      {row.isRequested && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                                          Requested{row.requestDeadline ? ` · Due ${row.requestDeadline}` : ''}
                                        </span>
                                      )}
                                      {doc && vStatus && (
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${verificationBadgeClass(
                                            vStatus
                                          )}`}
                                        >
                                          {verificationLabel(vStatus)}
                                        </span>
                                      )}
                                      {doc && (doc.version || 1) > 1 && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2563EB]/10 text-[#2563EB] dark:text-[#4BA3FF]">
                                          v{doc.version}
                                        </span>
                                      )}
                                    </div>

                                    {doc ? (
                                      <p className="text-[11px] text-[#526685] dark:text-[#93A9CB] truncate">
                                        {doc.fileName} · {formatBytes(doc.size)} · Uploaded{' '}
                                        {formatDateTime(doc.uploadedAt)}
                                      </p>
                                    ) : (
                                      <p className="text-[11px] text-slate-400">
                                        Not uploaded yet
                                        {row.notes ? ` — ${row.notes}` : ''}
                                      </p>
                                    )}

                                    {doc?.verificationNote && (
                                      <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                        Review note ({doc.verifiedByName || 'Staff'}): {doc.verificationNote}
                                      </p>
                                    )}
                                  </div>

                                  {doc && (
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        disabled={loadingViewerKey === `${row.docType}:${doc.storagePath}`}
                                        onClick={() =>
                                          handlePreviewFile({
                                            docType: row.docType,
                                            label: row.label,
                                            fileName: doc.fileName,
                                            mimeType: doc.mimeType,
                                            size: doc.size,
                                            uploadedAt: doc.uploadedAt,
                                            storagePath: doc.storagePath,
                                            legacyUrl: doc.downloadUrl,
                                            versionLabel: `v${doc.version || 1}`,
                                          })
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer disabled:opacity-60"
                                      >
                                        {loadingViewerKey === `${row.docType}:${doc.storagePath}` ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Eye className="w-3 h-3" />
                                        )}
                                        <span>Preview</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDownloadSingleFile({
                                            docType: row.docType,
                                            fileName: doc.fileName,
                                            storagePath: doc.storagePath,
                                          })
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white hover:bg-slate-50 cursor-pointer"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Download</span>
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Admin / Counsellor Verification Controls */}
                                {doc && canMutate && (
                                  <div className="pt-2 border-t border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center gap-2">
                                    <input
                                      type="text"
                                      value={docReviewNotes[row.docType] ?? doc.verificationNote ?? ''}
                                      onChange={(e) =>
                                        setDocReviewNotes((prev) => ({
                                          ...prev,
                                          [row.docType]: e.target.value,
                                        }))
                                      }
                                      placeholder="Optional verification / rejection note..."
                                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white"
                                    />
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        disabled={Boolean(reviewingDocKey)}
                                        onClick={() => handleReviewDocument(row.docType, 'verified')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-60"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Verify</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={Boolean(reviewingDocKey)}
                                        onClick={() => handleReviewDocument(row.docType, 'rejected')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-60"
                                      >
                                        <XCircle className="w-3 h-3" />
                                        <span>Reject</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMissingDocsSelected((prev) => ({
                                            ...prev,
                                            [row.docType]: true,
                                          }));
                                          setShowMissingDocsBox(true);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                                      >
                                        Request Replacement
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Preserved Previous Versions */}
                                {prevVersions.length > 0 && (
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedVersionDoc(isVersionsOpen ? null : row.docType)
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] dark:text-[#4BA3FF] hover:underline cursor-pointer"
                                    >
                                      <History className="w-3 h-3" />
                                      <span>
                                        {prevVersions.length} previous version
                                        {prevVersions.length === 1 ? '' : 's'} preserved
                                      </span>
                                      {isVersionsOpen ? (
                                        <ChevronUp className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </button>
                                    {isVersionsOpen && (
                                      <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-slate-200 dark:border-white/15">
                                        {prevVersions.map((ver, idx) => (
                                          <div
                                            key={`${ver.storagePath}_${idx}`}
                                            className="flex items-center justify-between gap-2 text-[11px] py-1"
                                          >
                                            <div className="min-w-0">
                                              <span className="font-bold text-[#081426] dark:text-white">
                                                v{ver.version}
                                              </span>{' '}
                                              <span className="text-[#526685] dark:text-[#93A9CB] truncate">
                                                {ver.fileName} ({formatBytes(ver.size)}) · Uploaded{' '}
                                                {formatDateTime(ver.uploadedAt)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handlePreviewFile({
                                                    docType: row.docType,
                                                    label: `${row.label} (v${ver.version})`,
                                                    fileName: ver.fileName,
                                                    mimeType: ver.mimeType,
                                                    size: ver.size,
                                                    uploadedAt: ver.uploadedAt,
                                                    storagePath: ver.storagePath,
                                                    versionLabel: `v${ver.version} (archived)`,
                                                  })
                                                }
                                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-semibold text-[#081426] dark:text-white cursor-pointer"
                                              >
                                                View
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDownloadSingleFile({
                                                    docType: row.docType,
                                                    fileName: ver.fileName,
                                                    storagePath: ver.storagePath,
                                                  })
                                                }
                                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-semibold text-[#081426] dark:text-white cursor-pointer"
                                              >
                                                Save
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION D — AI PASSPORT EXTRACTION */}
            {activeTab === 'ai_passport' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                      Section D — AI Passport Extraction & Verification
                    </h3>
                    <p className="text-[11px] text-[#526685] dark:text-[#93A9CB]">
                      Clearly distinguishes raw AI-extracted passport fields from student-confirmed values.
                    </p>
                  </div>
                  {canRevealPassport && (
                    <button
                      type="button"
                      onClick={() => setRevealPassport((v) => !v)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-white/15 bg-[#F4F8FD] dark:bg-white/5 text-[#081426] dark:text-white cursor-pointer"
                    >
                      {revealPassport ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{revealPassport ? 'Mask Passport' : 'Reveal Passport'}</span>
                    </button>
                  )}
                </div>

                {/* Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-[#F4F8FD] dark:bg-white/5 p-2.5">
                    <p className="text-[10px] font-bold uppercase text-[#526685] dark:text-[#93A9CB]">
                      MRZ Validation
                    </p>
                    <p className="text-xs font-extrabold mt-0.5 text-[#081426] dark:text-white">
                      {aiSnapshot
                        ? aiSnapshot.mrzIsValid
                          ? 'Passed (ICAO 9303)'
                          : aiSnapshot.mrzHasMrz
                          ? 'Partial / Check Needed'
                          : 'No MRZ Detected'
                        : 'No AI Scan Snapshot'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-[#F4F8FD] dark:bg-white/5 p-2.5">
                    <p className="text-[10px] font-bold uppercase text-[#526685] dark:text-[#93A9CB]">
                      Trusted Source
                    </p>
                    <p className="text-xs font-extrabold mt-0.5 text-[#081426] dark:text-white uppercase">
                      {aiSnapshot?.trustedSource || 'Manual'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-[#F4F8FD] dark:bg-white/5 p-2.5">
                    <p className="text-[10px] font-bold uppercase text-[#526685] dark:text-[#93A9CB]">
                      Student Verified
                    </p>
                    <p className="text-xs font-extrabold mt-0.5 text-[#081426] dark:text-white tabular-nums">
                      {(application.verifiedFields || []).length} /{' '}
                      {(application.aiFilledFields || []).length} AI fields
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-[#F4F8FD] dark:bg-white/5 p-2.5">
                    <p className="text-[10px] font-bold uppercase text-[#526685] dark:text-[#93A9CB]">
                      Check Warnings
                    </p>
                    <p className="text-xs font-extrabold mt-0.5 text-[#081426] dark:text-white tabular-nums">
                      {(application.aiCheckWarningFields || []).length} flagged
                    </p>
                  </div>
                </div>

                {/* ICAO Check Digit Breakdown */}
                {aiSnapshot && (
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-[#F4F8FD]/60 dark:bg-white/[0.02] space-y-2">
                    <p className="text-[11px] font-extrabold text-[#081426] dark:text-white">
                      ICAO 9303 Check-Digit Verification (Scanned {formatDateTime(aiSnapshot.extractedAt)})
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {[
                        { label: 'Passport # Check', ok: aiSnapshot.mrzPassportCheckPassed },
                        { label: 'DOB Check', ok: aiSnapshot.mrzDobCheckPassed },
                        { label: 'Expiry Check', ok: aiSnapshot.mrzExpiryCheckPassed },
                        { label: 'Composite Check', ok: aiSnapshot.mrzCompositeCheckPassed },
                      ].map((chk) => (
                        <span
                          key={chk.label}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold ${
                            chk.ok
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                          }`}
                        >
                          {chk.ok ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {chk.label}
                        </span>
                      ))}
                    </div>
                    {aiSnapshot.mrzWarnings && aiSnapshot.mrzWarnings.length > 0 && (
                      <ul className="list-disc pl-4 text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                        {aiSnapshot.mrzWarnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Side-by-side AI Extracted vs Student Confirmed Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F4F8FD] dark:bg-white/5 text-[11px] font-extrabold text-[#526685] dark:text-[#93A9CB]">
                      <tr>
                        <th className="px-3 py-2.5">Field</th>
                        <th className="px-3 py-2.5">AI-Extracted Value</th>
                        <th className="px-3 py-2.5">Student-Confirmed Value</th>
                        <th className="px-3 py-2.5">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {aiComparisonRows.map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 font-bold text-[#081426] dark:text-white whitespace-nowrap">
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-[#526685] dark:text-[#93A9CB] font-mono text-[11px]">
                            {row.ai || (row.wasAiFilled ? '(AI filled)' : '—')}
                          </td>
                          <td className="px-3 py-2 font-semibold text-[#081426] dark:text-slate-100">
                            {row.student || '—'}
                            {row.editedByStudent && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                                Student Edited
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.wasAiFilled ? (
                              row.isVerifiedByStudent ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Confirmed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {row.needsCheck ? 'Check Warning' : 'Unconfirmed'}
                                </span>
                              )
                            ) : (
                              <span className="text-[11px] text-slate-400">Manual Entry</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION E — EDUCATION & LANGUAGE */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-100 dark:border-white/10">
                  <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                    Section E — Education & Language Qualifications
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <InfoCell label="Highest Education Level" value={application.education?.highestLevel} />
                  <InfoCell label="Institution Name" value={application.education?.institutionName} />
                  <InfoCell label="Country" value={application.education?.country} />
                  <InfoCell
                    label="Previous Degrees"
                    value={
                      (application.education?.previousDegrees || []).length > 0
                        ? application.education.previousDegrees
                            .map((d) => `${d.level} — ${d.institutionName} (${d.startYear}-${d.endYear})`)
                            .join('; ')
                        : '—'
                    }
                  />
                  <InfoCell
                    label="GPA / Grade"
                    value={
                      application.education?.gpa
                        ? `${application.education.gpa} / ${application.education.gpaScale || '4.0'}`
                        : '—'
                    }
                  />
                  <InfoCell
                    label="Study Period"
                    value={
                      application.education?.startYear || application.education?.endYear
                        ? `${application.education.startYear || '?'} – ${
                            application.education.endYear || '?'
                          }`
                        : '—'
                    }
                  />
                  <InfoCell
                    label="Gap Years Explanation"
                    value={application.education?.gapYearsExplanation}
                  />
                  <InfoCell label="TOPIK Level" value={application.language?.topikLevel} />
                  <InfoCell label="TOPIK Test Date" value={application.language?.topikTestDate} />
                  <InfoCell
                    label="English Proficiency"
                    value={
                      application.language?.englishTestType &&
                      application.language.englishTestType !== 'None'
                        ? `${application.language.englishTestType}: ${
                            application.language.englishTestScore || '—'
                          }`
                        : 'None'
                    }
                  />
                  <InfoCell label="English Test Date" value={application.language?.englishTestDate} />
                  <InfoCell
                    label="Korean Study History"
                    value={application.language?.koreanStudyHistory}
                  />
                </div>
              </div>
            )}

            {/* SECTION F — FINANCE */}
            {activeTab === 'finance' && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-100 dark:border-white/10">
                  <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                    Section F — Financial Sponsorship & Proof
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <InfoCell
                    label="Sponsor Type"
                    value={application.finance?.sponsorType?.toUpperCase()}
                  />
                  <InfoCell label="Sponsor Full Name" value={application.finance?.sponsorName} />
                  <InfoCell
                    label="Sponsor Relationship"
                    value={application.finance?.sponsorRelation}
                  />
                  <InfoCell
                    label="Bank Balance / Financial Proof"
                    value={
                      application.finance?.bankBalanceAmount
                        ? `${application.finance.bankBalanceAmount} ${
                            application.finance.bankBalanceCurrency || 'USD'
                          }`
                        : '—'
                    }
                  />
                  <InfoCell
                    label="Funding Source"
                    value={application.finance?.fundingSource || application.finance?.sponsorType}
                  />
                  <InfoCell
                    label="Scholarship Interest"
                    value={
                      application.program?.scholarshipInterest
                        ? `Yes${
                            application.program.preferredScholarshipName
                              ? ` (${application.program.preferredScholarshipName})`
                              : ''
                          }`
                        : 'No'
                    }
                  />
                  <InfoCell
                    label="Financial Declaration"
                    value={
                      application.finance?.financialDeclarationAccepted ? 'Accepted' : 'Not recorded'
                    }
                  />
                </div>
              </div>
            )}

            {/* SECTION G — APPLICATION HISTORY & AUDIT TRAIL */}
            {activeTab === 'history' && (
              <div className="space-y-5">
                <div>
                  <div className="pb-2 border-b border-slate-100 dark:border-white/10 mb-3">
                    <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                      Section G — Application History Timeline
                    </h3>
                    <p className="text-[11px] text-[#526685] dark:text-[#93A9CB]">
                      Append-only chronological record of submissions, status updates, assignments,
                      document reviews, and messages.
                    </p>
                  </div>

                  {loadingLogs ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#526685]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading history...</span>
                    </div>
                  ) : historyEvents.length === 0 ? (
                    <p className="text-xs text-[#526685] dark:text-[#93A9CB]">
                      Created on {formatDateTime(application.createdAt)}. No additional history
                      events yet.
                    </p>
                  ) : (
                    <ol className="relative border-l-2 border-slate-200 dark:border-white/15 ml-2.5 space-y-3">
                      {historyEvents.map((ev) => (
                        <li key={ev.id} className="ml-4 relative">
                          <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#2563EB] border-2 border-white dark:border-[#0B172B]" />
                          <div className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-[#F4F8FD]/50 dark:bg-white/[0.02] p-3 text-xs space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-extrabold text-[#081426] dark:text-white">
                                  {ev.eventType
                                    ? ev.eventType.replace(/_/g, ' ').toUpperCase()
                                    : SMART_APPLICATION_STATUS_META[
                                        normalizeSmartApplicationStatus(ev.to)
                                      ]?.label || ev.to}
                                </span>
                                {ev.from && ev.from !== ev.to && (
                                  <span className="text-[11px] text-[#526685] dark:text-[#93A9CB]">
                                    ({ev.from} → {ev.to})
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-[#526685] dark:text-slate-300 uppercase">
                                  {ev.actorRole}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#526685] tabular-nums">
                                {formatDateTime(ev.when)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#526685] dark:text-[#93A9CB]">
                              By <strong>{ev.actorName || ev.actorEmail || ev.actorUid}</strong>
                            </p>
                            {ev.message && (
                              <p className="text-xs text-[#081426] dark:text-slate-200 whitespace-pre-line">
                                {ev.message}
                              </p>
                            )}
                            {ev.requestedDocuments && ev.requestedDocuments.length > 0 && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                                Documents: {ev.requestedDocuments.join(', ')}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Admin-only Document Access Audit Log */}
                {canViewAuditLogs && (
                  <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#526685] dark:text-[#93A9CB] mb-2.5">
                      Document Access & Export Audit Log (Admin Only)
                    </h4>
                    {accessLogs.length === 0 ? (
                      <p className="text-xs text-[#526685]">No staff document accesses recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {accessLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F4F8FD] dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-[11px]"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-[#081426] dark:text-white uppercase mr-1.5">
                                {log.action}
                              </span>
                              <span className="text-[#526685] dark:text-[#93A9CB]">
                                {log.fileName} by <strong>{log.actorName || log.actorEmail}</strong> (
                                {log.actorRole})
                              </span>
                            </div>
                            <span className="text-[#526685] tabular-nums shrink-0">
                              {formatDateTime(log.accessedAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* REVIEW & APPROVAL WORKFLOW PANEL */}
          {canMutate && (
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] p-5 space-y-5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                  Review & Approval Workflow
                </h3>
                <span className="text-[11px] font-semibold text-[#526685] dark:text-[#93A9CB]">
                  Actions update Firestore, append history & notify student
                </span>
              </div>

              {/* 1. Status Transition */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#526685] dark:text-[#93A9CB] mb-1">
                    Next Application Stage
                  </label>
                  <select
                    value={nextStatus}
                    onChange={(e) => {
                      const val = e.target.value as SmartApplicationStatus;
                      setNextStatus(val);
                      if (val === 'documents_missing') setShowMissingDocsBox(true);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white"
                  >
                    {allowedNextStatuses.map((s) => (
                      <option key={s} value={s}>
                        {SMART_APPLICATION_STATUS_META[s]?.label || s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-[#526685] dark:text-[#93A9CB] mb-1">
                    Student Status Message (Optional — included in notification & email)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="e.g. Application forwarded to university admissions committee."
                      className="flex-1 px-3 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={updatingStatus || nextStatus === normalizedStatus}
                      onClick={handleUpdateStatus}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Update Status</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Request Missing / Replacement Documents Panel */}
              {showMissingDocsBox && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                      Request Missing / Replacement Documents (Sets status to Documents Missing)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowMissingDocsBox(false)}
                      className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-1">
                    {requestableCatalog.map((item) => (
                      <label
                        key={item.docType}
                        className="flex items-center gap-2 text-xs text-[#081426] dark:text-slate-100 bg-white dark:bg-[#0B172B] border border-amber-200/80 dark:border-amber-800/60 rounded-lg px-2.5 py-1.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(missingDocsSelected[item.docType])}
                          onChange={(e) =>
                            setMissingDocsSelected((prev) => ({
                              ...prev,
                              [item.docType]: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300 text-[#2563EB]"
                        />
                        <span className="truncate font-semibold">{item.label}</span>
                        <span className="ml-auto text-[10px] text-[#526685]">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                        Instructions for Student
                      </label>
                      <input
                        type="text"
                        value={missingDocsMessage}
                        onChange={(e) => setMissingDocsMessage(e.target.value)}
                        placeholder="e.g. Please upload a clearer bank statement issued within 30 days."
                        className="w-full px-3 py-2 rounded-lg text-xs border border-amber-200 dark:border-amber-800 bg-white dark:bg-[#081426] text-[#081426] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                        Submission Deadline (Optional)
                      </label>
                      <input
                        type="date"
                        value={missingDocsDeadline}
                        onChange={(e) => setMissingDocsDeadline(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs border border-amber-200 dark:border-amber-800 bg-white dark:bg-[#081426] text-[#081426] dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={handleSubmitMissingDocumentsRequest}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer disabled:opacity-60"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send Document Request</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Counsellor Assignment (Admin Only) */}
              {canAssign && (
                <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-[#081426] dark:text-white inline-flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Assign Counsellor</span>
                    </label>
                    {staffOptions.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          const found = staffOptions.find((s) => s.uid === e.target.value);
                          if (found) {
                            setAssignUid(found.uid);
                            setAssignName(found.name);
                            setAssignEmail(found.email);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-white/15 bg-[#F4F8FD] dark:bg-white/5 text-[#081426] dark:text-white"
                      >
                        <option value="">Quick-pick staff...</option>
                        {staffOptions.map((s) => (
                          <option key={s.uid} value={s.uid}>
                            {s.name} ({s.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={assignUid}
                      onChange={(e) => setAssignUid(e.target.value)}
                      placeholder="Counsellor Firebase UID"
                      className="px-2.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white"
                    />
                    <input
                      type="text"
                      value={assignName}
                      onChange={(e) => setAssignName(e.target.value)}
                      placeholder="Counsellor Name"
                      className="px-2.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="email"
                        value={assignEmail}
                        onChange={(e) => setAssignEmail(e.target.value)}
                        placeholder="Counsellor Email"
                        className="flex-1 min-w-0 px-2.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={assigning}
                        onClick={handleAssignCounsellor}
                        className="px-3 py-2 rounded-lg text-xs font-bold bg-[#081426] dark:bg-[#2563EB] text-white hover:bg-[#1E3A8A] cursor-pointer disabled:opacity-60 shrink-0"
                      >
                        {assigning ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Direct Message to Student + Internal Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-white/10">
                {/* Message Student */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-[#081426] dark:text-white inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Send Message to Student</span>
                  </label>
                  <textarea
                    rows={3}
                    value={directMessage}
                    onChange={(e) => setDirectMessage(e.target.value)}
                    placeholder="Write an admissions update or interview instruction for the student..."
                    className="w-full px-3 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white resize-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-[#526685] dark:text-[#93A9CB] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendMessageEmail}
                        onChange={(e) => setSendMessageEmail(e.target.checked)}
                        className="rounded border-slate-300 text-[#2563EB]"
                      />
                      <span>Also send email notification</span>
                    </label>
                    <button
                      type="button"
                      disabled={sendingMessage || !directMessage.trim()}
                      onClick={handleSendDirectMessage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer disabled:opacity-50"
                    >
                      {sendingMessage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send</span>
                    </button>
                  </div>
                </div>

                {/* Internal Staff Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-[#081426] dark:text-white inline-flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#D6B875]" />
                    <span>Internal Staff Notes (Hidden from Student)</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Add an internal admissions note..."
                      className="flex-1 px-3 py-2 rounded-lg text-xs border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={savingNote || !noteInput.trim()}
                      onClick={handleAddNote}
                      className="px-3 py-2 rounded-lg text-xs font-bold bg-[#081426] dark:bg-white/15 text-white hover:bg-[#1E3A8A] cursor-pointer disabled:opacity-50"
                    >
                      {savingNote ? '...' : 'Add'}
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {(application.notes || []).length === 0 ? (
                      <p className="text-[11px] text-[#526685]">No internal notes yet.</p>
                    ) : (
                      (application.notes || []).map((n) => (
                        <div
                          key={n.id}
                          className="rounded-lg bg-[#F4F8FD] dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-2 text-[11px]"
                        >
                          <div className="flex items-center justify-between text-[#526685] mb-0.5">
                            <span className="font-bold text-[#081426] dark:text-slate-200">
                              {n.authorName}
                            </span>
                            <span className="tabular-nums">{formatDateTime(n.createdAt)}</span>
                          </div>
                          <p className="text-[#081426] dark:text-slate-200">{n.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — PERSISTENT SECURE SIDE-BY-SIDE DOCUMENT VIEWER */}
        <div className="xl:col-span-5 xl:sticky xl:top-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 bg-[#F4F8FD]/70 dark:bg-white/[0.03]">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
                <h3 className="text-xs font-extrabold text-[#081426] dark:text-white truncate">
                  Secure Document Viewer
                </h3>
              </div>
              <p className="text-[11px] text-[#526685] dark:text-[#93A9CB] truncate">
                {viewerDoc
                  ? `${viewerDoc.label}${viewerDoc.versionLabel ? ` (${viewerDoc.versionLabel})` : ''} · ${viewerDoc.fileName}`
                  : 'Select any document to inspect securely via private storage'}
              </p>
            </div>
            {viewerDoc && (
              <button
                type="button"
                onClick={() =>
                  handleDownloadSingleFile({
                    docType: viewerDoc.docType,
                    fileName: viewerDoc.fileName,
                    storagePath: viewerDoc.storagePath,
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer shrink-0"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </button>
            )}
          </div>

          {/* Quick Uploaded File Strip */}
          {Object.keys(application.documents || {}).length > 0 && (
            <div className="px-3 py-2 border-b border-slate-100 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto bg-white dark:bg-[#081426]/40">
              {Object.entries(application.documents || {}).map(([docType, item]) => {
                const isSelected = viewerDoc?.storagePath === item.storagePath;
                return (
                  <button
                    key={docType}
                    type="button"
                    onClick={() =>
                      handlePreviewFile({
                        docType,
                        label: item.label || docType,
                        fileName: item.fileName,
                        mimeType: item.mimeType,
                        size: item.size,
                        uploadedAt: item.uploadedAt,
                        storagePath: item.storagePath,
                        legacyUrl: item.downloadUrl,
                        versionLabel: `v${item.version || 1}`,
                      })
                    }
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#081426] dark:bg-[#2563EB] text-white border-[#081426] dark:border-[#2563EB]'
                        : 'bg-[#F4F8FD] dark:bg-white/5 text-[#526685] dark:text-[#93A9CB] border-slate-200 dark:border-white/10 hover:text-[#081426] dark:hover:text-white'
                    }`}
                  >
                    {item.label || docType}
                  </button>
                );
              })}
            </div>
          )}

          {/* Viewer Canvas */}
          <div className="min-h-[420px] max-h-[680px] bg-slate-100/70 dark:bg-[#060E1B] flex items-center justify-center p-3 overflow-auto">
            {loadingViewerKey ? (
              <div className="flex flex-col items-center gap-2 text-xs text-[#526685] dark:text-[#93A9CB]">
                <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
                <span>Loading encrypted private blob...</span>
              </div>
            ) : !viewerDoc ? (
              <div className="text-center max-w-xs space-y-2 py-12">
                <FileText className="w-9 h-9 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-[#081426] dark:text-white">
                  Private Storage Preview Ready
                </p>
                <p className="text-[11px] text-[#526685] dark:text-[#93A9CB]">
                  Click <strong>Preview</strong> on any uploaded file in Section C or from the quick
                  strip above. Every view and download is authorized via Firebase Storage rules and
                  recorded in the audit log.
                </p>
              </div>
            ) : viewerDoc.mimeType.includes('pdf') ||
              viewerDoc.fileName.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={viewerDoc.url}
                title={viewerDoc.fileName}
                className="w-full h-[560px] rounded-lg bg-white border border-slate-200 dark:border-white/10"
              />
            ) : (
              <img
                src={viewerDoc.url}
                alt={viewerDoc.fileName}
                className="max-w-full max-h-[560px] object-contain rounded-lg shadow-sm"
              />
            )}
          </div>

          {viewerDoc && (
            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/10 bg-[#F4F8FD]/70 dark:bg-white/[0.03] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#526685] dark:text-[#93A9CB]">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Uploaded {formatDateTime(viewerDoc.uploadedAt)}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="w-3 h-3" />
                {formatBytes(viewerDoc.size)} · Private Blob (no public URL)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoCell: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({
  label,
  value,
  mono = false,
}) => (
  <div className="rounded-lg bg-[#F4F8FD]/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 px-3 py-2">
    <p className="text-[10px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#93A9CB]">
      {label}
    </p>
    <p
      className={`text-xs font-bold text-[#081426] dark:text-white mt-0.5 break-words ${
        mono ? 'font-mono text-[11px]' : ''
      }`}
    >
      {value && String(value).trim() ? value : '—'}
    </p>
  </div>
);
