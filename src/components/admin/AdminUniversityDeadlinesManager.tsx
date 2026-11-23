import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Upload,
  RefreshCw,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  FolderOpen,
} from 'lucide-react';
import type {
  AdmissionIntakeType,
  UniversityAdmissionDeadlineRecord,
  UniversityDeadlineCarouselConfig,
} from '../../types';
import { MASTER_UNIVERSITIES } from '../../data/universitiesMaster';
import {
  DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG,
  computeKstDeadlineCountdown,
  formatDeadlineDateKst,
  getTodayDateStringKst,
  slugifyUniversityStorageSegment,
} from '../../utils/universityDeadlineUtils';
import {
  subscribeAdminUniversityDeadlines,
  uploadUniversityDeadlineLogoFromComputer,
  cleanupUnreferencedUniversityLogo,
  saveUniversityAdmissionDeadline,
  deleteUniversityAdmissionDeadline,
  reorderUniversityAdmissionDeadlines,
  updateUniversityDeadlineCarouselEnabled,
} from '../../services/universityDeadlinesService';
import {
  UniversityDeadlineCard,
  UniversityDeadlineCarouselTrack,
  UniversityOfficialLogo,
} from '../home/UniversityDeadlineCarousel';

type StatusFilterMode = 'all' | 'published' | 'unpublished' | 'closing_soon' | 'expired';

interface FormDraftState {
  id?: string;
  universitySelectionMode: 'existing' | 'custom';
  universityId: string;
  universityName: string;
  logoStoragePath: string;
  logoDownloadUrl: string;
  logoFallbackDataUrl?: string;
  logoFileName: string;
  logoMimeType: string;
  logoFileSize: number;
  admissionIntake: AdmissionIntakeType;
  intakeLabel: string;
  applicationDeadline: string;
  publicationStatus: 'published' | 'unpublished';
  displayOrder: number;
  createdAt?: string;
  createdByUid?: string;
  createdByEmail?: string;
}

function formatByteSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AdminUniversityDeadlinesManager: React.FC<{
  adminUid: string;
  adminName: string;
  adminEmail: string;
  onSuccessToast: (msg: string) => void;
}> = ({ adminUid, adminName, adminEmail, onSuccessToast }) => {
  const [config, setConfig] = useState<UniversityDeadlineCarouselConfig>(
    DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG
  );
  const [deadlines, setDeadlines] = useState<UniversityAdmissionDeadlineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterMode>('all');
  const [showLiveCarouselPreview, setShowLiveCarouselPreview] = useState(true);
  const [togglingCarousel, setTogglingCarousel] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<FormDraftState | null>(null);
  const [originalLogoOnOpen, setOriginalLogoOnOpen] = useState<{
    logoStoragePath: string;
    logoDownloadUrl: string;
  } | null>(null);
  const [unsavedUploadedLogo, setUnsavedUploadedLogo] = useState<{
    logoStoragePath: string;
    logoDownloadUrl: string;
  } | null>(null);
  const [uniPickerSearch, setUniPickerSearch] = useState('');

  // File Upload State (Direct Computer Upload ONLY)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadNotice, setUploadNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);

  // Delete Confirmation Modal State (No window.confirm)
  const [recordToDelete, setRecordToDelete] =
    useState<UniversityAdmissionDeadlineRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const adminActor = useMemo(
    () => ({ uid: adminUid, name: adminName, email: adminEmail }),
    [adminUid, adminName, adminEmail]
  );

  // Real-time subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAdminUniversityDeadlines(
      ({ config: nextCfg, deadlines: nextDeadlines }) => {
        setConfig(nextCfg);
        setDeadlines(nextDeadlines);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // KST live countdown clock
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredUniversityOptions = useMemo(() => {
    const q = uniPickerSearch.trim().toLowerCase();
    if (!q) return MASTER_UNIVERSITIES;
    return MASTER_UNIVERSITIES.filter((u) => {
      const display = (u.officialName || u.name).toLowerCase();
      return (
        display.includes(q) ||
        u.koreanName.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [uniPickerSearch]);

  const filteredDeadlines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deadlines.filter((rec) => {
      const countdown = computeKstDeadlineCountdown(rec.applicationDeadline, nowMs);

      if (statusFilter === 'published' && (!rec.published || rec.publicationStatus !== 'published')) {
        return false;
      }
      if (statusFilter === 'unpublished' && (rec.published && rec.publicationStatus === 'published')) {
        return false;
      }
      if (
        statusFilter === 'closing_soon' &&
        (countdown.isExpired || countdown.daysRemaining > 7)
      ) {
        return false;
      }
      if (statusFilter === 'expired' && !countdown.isExpired) {
        return false;
      }

      if (!q) return true;
      return (
        rec.universityName.toLowerCase().includes(q) ||
        rec.universityId.toLowerCase().includes(q) ||
        rec.admissionIntake.toLowerCase().includes(q) ||
        (rec.intakeLabel || '').toLowerCase().includes(q) ||
        rec.applicationDeadline.includes(q)
      );
    });
  }, [deadlines, searchQuery, statusFilter, nowMs]);

  const activePreviewDeadlines = useMemo(() => {
    return deadlines.filter((rec) => {
      if (!rec.published || rec.publicationStatus !== 'published') return false;
      const countdown = computeKstDeadlineCountdown(rec.applicationDeadline, nowMs);
      return !countdown.isExpired;
    });
  }, [deadlines, nowMs]);

  const metrics = useMemo(() => {
    let publishedActive = 0;
    let unpublishedCount = 0;
    let expiredCount = 0;
    for (const rec of deadlines) {
      const cd = computeKstDeadlineCountdown(rec.applicationDeadline, nowMs);
      if (cd.isExpired) {
        expiredCount += 1;
      }
      if (rec.published && rec.publicationStatus === 'published') {
        if (!cd.isExpired) publishedActive += 1;
      } else {
        unpublishedCount += 1;
      }
    }
    return {
      total: deadlines.length,
      publishedActive,
      unpublishedCount,
      expiredCount,
    };
  }, [deadlines, nowMs]);

  const handleToggleGlobalCarousel = async () => {
    setTogglingCarousel(true);
    try {
      const nextVal = !config.carouselEnabled;
      const updatedCfg = await updateUniversityDeadlineCarouselEnabled({
        carouselEnabled: nextVal,
        adminActor,
      });
      setConfig(updatedCfg);
      onSuccessToast(
        nextVal
          ? 'Homepage University Deadline Carousel enabled.'
          : 'Homepage University Deadline Carousel hidden on public homepage.'
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to toggle carousel visibility.');
    } finally {
      setTogglingCarousel(false);
    }
  };

  const openAddModal = () => {
    const defaultUni = MASTER_UNIVERSITIES[0];
    const hasVerifiedLocalLogo = Boolean(
      defaultUni?.logoUrl && defaultUni.logoUrl.startsWith('/assets/university-logos/')
    );
    const logoFileName = hasVerifiedLocalLogo
      ? defaultUni.logoUrl!.split('/').pop() || 'official-logo.png'
      : '';
    const ext = logoFileName.split('.').pop()?.toLowerCase() || 'png';
    const inferredMime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'webp'
        ? 'image/webp'
        : ext === 'svg'
        ? 'image/svg+xml'
        : 'image/png';

    // Default deadline: 30 days from today in KST
    const futureMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const defaultDate = getTodayDateStringKst(futureMs);

    setUniPickerSearch('');
    setOriginalLogoOnOpen(null);
    setUnsavedUploadedLogo(null);
    setUploadNotice(null);
    setFormError(null);
    setUploadProgress(0);

    setDraft({
      universitySelectionMode: 'existing',
      universityId: defaultUni?.id || '',
      universityName: defaultUni ? defaultUni.officialName || defaultUni.name : '',
      logoStoragePath: hasVerifiedLocalLogo ? `official-assets${defaultUni.logoUrl}` : '',
      logoDownloadUrl: hasVerifiedLocalLogo ? defaultUni.logoUrl! : '',
      logoFallbackDataUrl: undefined,
      logoFileName,
      logoMimeType: inferredMime,
      logoFileSize: hasVerifiedLocalLogo ? 36000 : 0,
      admissionIntake: 'Spring',
      intakeLabel: '',
      applicationDeadline: defaultDate,
      publicationStatus: 'published',
      displayOrder: deadlines.length + 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rec: UniversityAdmissionDeadlineRecord) => {
    const matchesExisting = MASTER_UNIVERSITIES.some((u) => u.id === rec.universityId);
    setUniPickerSearch('');
    setOriginalLogoOnOpen({
      logoStoragePath: rec.logoStoragePath,
      logoDownloadUrl: rec.logoDownloadUrl,
    });
    setUnsavedUploadedLogo(null);
    setUploadNotice(null);
    setFormError(null);
    setUploadProgress(0);

    setDraft({
      id: rec.id,
      universitySelectionMode: matchesExisting ? 'existing' : 'custom',
      universityId: rec.universityId,
      universityName: rec.universityName,
      logoStoragePath: rec.logoStoragePath,
      logoDownloadUrl: rec.logoDownloadUrl,
      logoFallbackDataUrl: rec.logoFallbackDataUrl,
      logoFileName: rec.logoFileName,
      logoMimeType: rec.logoMimeType,
      logoFileSize: rec.logoFileSize,
      admissionIntake: rec.admissionIntake,
      intakeLabel: rec.intakeLabel || '',
      applicationDeadline: rec.applicationDeadline,
      publicationStatus: rec.publicationStatus,
      displayOrder: rec.displayOrder,
      createdAt: rec.createdAt,
      createdByUid: rec.createdByUid,
      createdByEmail: rec.createdByEmail,
    });
    setIsModalOpen(true);
  };

  const closeModalSafely = async () => {
    if (unsavedUploadedLogo) {
      await cleanupUnreferencedUniversityLogo({
        logoStoragePath: unsavedUploadedLogo.logoStoragePath,
        logoDownloadUrl: unsavedUploadedLogo.logoDownloadUrl,
        allRecords: deadlines,
      });
    }
    setUnsavedUploadedLogo(null);
    setIsModalOpen(false);
    setDraft(null);
    setUploadNotice(null);
    setFormError(null);
  };

  const handleSelectExistingUniversity = (uniId: string) => {
    if (!draft) return;
    const found = MASTER_UNIVERSITIES.find((u) => u.id === uniId);
    if (!found) return;

    const displayName = found.officialName || found.name;
    const hasVerifiedLocalLogo = Boolean(
      found.logoUrl && found.logoUrl.startsWith('/assets/university-logos/')
    );

    // Only auto-populate verified EveryKR official logo if admin has not uploaded a custom computer file yet in this session
    const shouldPreloadOfficialLogo =
      !unsavedUploadedLogo &&
      (!draft.id || draft.logoStoragePath.startsWith('official-assets/') || !draft.logoDownloadUrl);

    if (shouldPreloadOfficialLogo && hasVerifiedLocalLogo && found.logoUrl) {
      const fName = found.logoUrl.split('/').pop() || 'official-logo.png';
      const ext = fName.split('.').pop()?.toLowerCase() || 'png';
      const mime =
        ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'webp'
          ? 'image/webp'
          : ext === 'svg'
          ? 'image/svg+xml'
          : 'image/png';
      setDraft({
        ...draft,
        universityId: found.id,
        universityName: displayName,
        logoStoragePath: `official-assets${found.logoUrl}`,
        logoDownloadUrl: found.logoUrl,
        logoFallbackDataUrl: undefined,
        logoFileName: fName,
        logoMimeType: mime,
        logoFileSize: 36000,
      });
      setUploadNotice(null);
    } else if (shouldPreloadOfficialLogo && !hasVerifiedLocalLogo) {
      setDraft({
        ...draft,
        universityId: found.id,
        universityName: displayName,
        logoStoragePath: '',
        logoDownloadUrl: '',
        logoFallbackDataUrl: undefined,
        logoFileName: '',
        logoFileSize: 0,
      });
      setUploadNotice(null);
    } else {
      setDraft({
        ...draft,
        universityId: found.id,
        universityName: displayName,
      });
    }
  };

  const processComputerLogoFile = async (file: File) => {
    if (!draft) return;
    setUploadingLogo(true);
    setUploadProgress(5);
    setUploadNotice(null);
    setFormError(null);

    const previousUnsaved = unsavedUploadedLogo;

    try {
      const uploaded = await uploadUniversityDeadlineLogoFromComputer({
        file,
        universityIdOrName: draft.universityId || draft.universityName || 'university',
        onProgress: (pct) => setUploadProgress(pct),
      });

      // If admin replaced an unsaved draft upload before saving, clean up the earlier draft file
      if (
        previousUnsaved &&
        previousUnsaved.logoStoragePath !== uploaded.logoStoragePath
      ) {
        await cleanupUnreferencedUniversityLogo({
          logoStoragePath: previousUnsaved.logoStoragePath,
          logoDownloadUrl: previousUnsaved.logoDownloadUrl,
          allRecords: deadlines,
        });
      }

      setUnsavedUploadedLogo({
        logoStoragePath: uploaded.logoStoragePath,
        logoDownloadUrl: uploaded.logoDownloadUrl,
      });

      setDraft((prev) =>
        prev
          ? {
              ...prev,
              logoStoragePath: uploaded.logoStoragePath,
              logoDownloadUrl: uploaded.logoDownloadUrl,
              logoFallbackDataUrl: uploaded.logoFallbackDataUrl,
              logoFileName: uploaded.logoFileName,
              logoMimeType: uploaded.logoMimeType,
              logoFileSize: uploaded.logoFileSize,
            }
          : prev
      );

      setUploadNotice({
        type: 'success',
        message: `Uploaded "${uploaded.logoFileName}" (${formatByteSize(uploaded.logoFileSize)}) to university-deadlines/ storage.`,
      });
    } catch (err) {
      setUploadProgress(0);
      setUploadNotice({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Logo upload failed. Please upload a valid PNG, JPG, JPEG, WebP, or SVG file.',
      });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processComputerLogoFile(file);
    }
  };

  const handleDropZoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processComputerLogoFile(file);
    }
  };

  const handleRemoveDraftLogo = async () => {
    if (!draft) return;
    if (unsavedUploadedLogo) {
      await cleanupUnreferencedUniversityLogo({
        logoStoragePath: unsavedUploadedLogo.logoStoragePath,
        logoDownloadUrl: unsavedUploadedLogo.logoDownloadUrl,
        allRecords: deadlines,
      });
      setUnsavedUploadedLogo(null);
    }
    setDraft({
      ...draft,
      logoStoragePath: '',
      logoDownloadUrl: '',
      logoFallbackDataUrl: undefined,
      logoFileName: '',
      logoFileSize: 0,
    });
    setUploadProgress(0);
    setUploadNotice({
      type: 'success',
      message: 'Logo removed. Upload an official logo file from your computer before saving.',
    });
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setFormError(null);

    const trimmedName = draft.universityName.trim();
    if (trimmedName.length < 2) {
      setFormError('Please select a university or enter a valid official university name.');
      return;
    }

    if (!draft.logoDownloadUrl || !draft.logoStoragePath) {
      setFormError(
        'Official university logo is required. Drag and drop or browse a logo file from your computer.'
      );
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.applicationDeadline)) {
      setFormError('Please choose a valid application deadline date (YYYY-MM-DD).');
      return;
    }

    const resolvedUniId =
      draft.universitySelectionMode === 'existing' && draft.universityId
        ? draft.universityId
        : slugifyUniversityStorageSegment(trimmedName);

    // Client-side duplicate check for immediate feedback
    const duplicate = deadlines.find(
      (r) =>
        r.id !== draft.id &&
        r.universityId.toLowerCase() === resolvedUniId.toLowerCase() &&
        r.admissionIntake === draft.admissionIntake &&
        r.applicationDeadline === draft.applicationDeadline
    );
    if (duplicate) {
      setFormError(
        `Duplicate record prevented: ${trimmedName} already has a ${draft.admissionIntake} deadline on ${draft.applicationDeadline}. Edit that record or choose another intake.`
      );
      return;
    }

    setSavingRecord(true);
    try {
      const saved = await saveUniversityAdmissionDeadline({
        record: {
          id: draft.id,
          universityId: resolvedUniId,
          universityName: trimmedName,
          logoStoragePath: draft.logoStoragePath,
          logoDownloadUrl: draft.logoDownloadUrl,
          ...(draft.logoFallbackDataUrl ? { logoFallbackDataUrl: draft.logoFallbackDataUrl } : {}),
          logoFileName: draft.logoFileName || 'official-logo.png',
          logoMimeType: draft.logoMimeType || 'image/png',
          logoFileSize: draft.logoFileSize || 0,
          admissionIntake: draft.admissionIntake,
          intakeLabel: draft.intakeLabel.trim() || undefined,
          applicationDeadline: draft.applicationDeadline,
          publicationStatus: draft.publicationStatus,
          published: draft.publicationStatus === 'published',
          displayOrder: draft.displayOrder,
          createdAt: draft.createdAt,
          createdByUid: draft.createdByUid,
          createdByEmail: draft.createdByEmail,
        },
        adminActor,
        previousLogoToCleanup: originalLogoOnOpen,
      });

      setDeadlines((prev) => {
        const exists = prev.some((r) => r.id === saved.id);
        const next = exists
          ? prev.map((r) => (r.id === saved.id ? saved : r))
          : [...prev, saved];
        return next.sort((a, b) => a.displayOrder - b.displayOrder);
      });

      setUnsavedUploadedLogo(null);
      setIsModalOpen(false);
      setDraft(null);
      onSuccessToast(
        draft.id
          ? `Updated "${saved.universityName}" (${saved.admissionIntake}) deadline.`
          : `Added "${saved.universityName}" (${saved.admissionIntake}) to University Admission Deadlines.`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save deadline record.');
    } finally {
      setSavingRecord(false);
    }
  };

  const handleQuickTogglePublish = async (rec: UniversityAdmissionDeadlineRecord) => {
    setBusyRowId(rec.id);
    try {
      const nextStatus = rec.publicationStatus === 'published' ? 'unpublished' : 'published';
      const saved = await saveUniversityAdmissionDeadline({
        record: {
          ...rec,
          publicationStatus: nextStatus,
          published: nextStatus === 'published',
        },
        adminActor,
      });
      setDeadlines((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      onSuccessToast(
        nextStatus === 'published'
          ? `Published "${saved.universityName}" (${saved.admissionIntake}) to homepage carousel.`
          : `Unpublished "${saved.universityName}" (${saved.admissionIntake}) from homepage carousel.`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update publication status.');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleMoveOrder = async (recId: string, direction: 'up' | 'down') => {
    const sorted = [...deadlines].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((r) => r.id === recId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const swapped = [...sorted];
    const temp = swapped[idx];
    swapped[idx] = swapped[targetIdx];
    swapped[targetIdx] = temp;

    setBusyRowId(recId);
    try {
      const reindexed = await reorderUniversityAdmissionDeadlines({
        orderedRecords: swapped,
        adminActor,
      });
      setDeadlines(reindexed);
      onSuccessToast('Updated homepage carousel display order.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to reorder deadline cards.');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setDeletingRecord(true);
    setDeleteError(null);
    try {
      await deleteUniversityAdmissionDeadline({
        record: recordToDelete,
        adminActor,
      });
      setDeadlines((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      const removedName = `${recordToDelete.universityName} (${recordToDelete.admissionIntake})`;
      setRecordToDelete(null);
      onSuccessToast(`Deleted "${removedName}" and cleaned up unreferenced storage assets.`);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete deadline record.');
    } finally {
      setDeletingRecord(false);
    }
  };

  const previewDraftRecord = useMemo<UniversityAdmissionDeadlineRecord | null>(() => {
    if (!draft) return null;
    return {
      id: draft.id || 'preview_draft',
      universityId: draft.universityId || 'university',
      universityName: draft.universityName.trim() || 'University Name',
      logoStoragePath: draft.logoStoragePath || 'preview',
      logoDownloadUrl: draft.logoDownloadUrl,
      ...(draft.logoFallbackDataUrl ? { logoFallbackDataUrl: draft.logoFallbackDataUrl } : {}),
      logoFileName: draft.logoFileName || 'logo.png',
      logoMimeType: draft.logoMimeType || 'image/png',
      logoFileSize: draft.logoFileSize || 0,
      admissionIntake: draft.admissionIntake,
      applicationDeadline: draft.applicationDeadline || getTodayDateStringKst(),
      deadlineTimestampMs: Date.now(),
      publicationStatus: draft.publicationStatus,
      published: draft.publicationStatus === 'published',
      displayOrder: draft.displayOrder || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUid: adminUid,
      createdByEmail: adminEmail,
      updatedByUid: adminUid,
      updatedByEmail: adminEmail,
    };
  }, [draft, adminUid, adminEmail]);

  return (
    <div className="space-y-6">
      {/* Top Management Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              University Admission Deadlines
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage official university logos (Firebase Storage), KST admission deadlines, multiple intakes, ordering, and real-time homepage carousel visibility.
            </p>
            {/* Unboxed summary metrics with typographic separators */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-2.5 tabular-nums">
              <span>
                <strong className="text-slate-900 dark:text-white">{metrics.total}</strong> total records
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {metrics.publishedActive}
                </strong>{' '}
                live on homepage
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-slate-900 dark:text-white">
                  {metrics.unpublishedCount}
                </strong>{' '}
                unpublished
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-amber-600 dark:text-amber-400">
                  {metrics.expiredCount}
                </strong>{' '}
                expired (auto-hidden)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Global Homepage Carousel Enable / Disable Toggle */}
            <button
              type="button"
              disabled={togglingCarousel}
              onClick={handleToggleGlobalCarousel}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                config.carouselEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              {config.carouselEnabled ? (
                <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-slate-500" />
              )}
              <span>
                Homepage Carousel: {config.carouselEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowLiveCarouselPreview((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span>{showLiveCarouselPreview ? 'Hide Live Preview' : 'Show Live Preview'}</span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add University Deadline</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filter Toolbar */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search university name, intake, or YYYY-MM-DD..."
              className="w-full h-10 pl-10 pr-8 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Interactive Status Filter Controls */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90">
            {(
              [
                { id: 'all', label: 'All Records' },
                { id: 'published', label: 'Published' },
                { id: 'unpublished', label: 'Unpublished' },
                { id: 'closing_soon', label: 'Closing ≤ 7d' },
                { id: 'expired', label: 'Closed' },
              ] as Array<{ id: StatusFilterMode; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Homepage Carousel Preview Panel (Phase 9) */}
      {showLiveCarouselPreview && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Live Homepage Carousel Preview (Asia/Seoul KST)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exact floating carousel rendered immediately below the 3D Earth globe and above Platform Ecosystem.
              </p>
            </div>
            {!config.carouselEnabled && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Carousel is currently disabled on the public homepage
              </span>
            )}
          </div>

          {activePreviewDeadlines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No published future deadlines are currently active. Publish an upcoming deadline to display the homepage carousel.
              </p>
            </div>
          ) : (
            <UniversityDeadlineCarouselTrack
              records={activePreviewDeadlines}
              nowMs={nowMs}
              interactiveLinks={false}
              isNight={true}
            />
          )}
        </div>
      )}

      {/* Structured Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : filteredDeadlines.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No university admission deadlines match the current filter.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Add a Korean university deadline with an official logo uploaded directly from your computer to publish it on the homepage carousel.
            </p>
            <div>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First University Deadline</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 w-24">Order</th>
                  <th className="py-3 px-4">University & Logo</th>
                  <th className="py-3 px-4">Intake</th>
                  <th className="py-3 px-4">Deadline (KST)</th>
                  <th className="py-3 px-4">Live Countdown</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredDeadlines.map((rec) => {
                  const cd = computeKstDeadlineCountdown(rec.applicationDeadline, nowMs);
                  const globalIdx = deadlines.findIndex((d) => d.id === rec.id);
                  const isRowBusy = busyRowId === rec.id;

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Order Controls */}
                      <td className="py-3 px-4 tabular-nums">
                        <div className="inline-flex items-center gap-1">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-6">
                            {rec.displayOrder}
                          </span>
                          <button
                            type="button"
                            disabled={isRowBusy || globalIdx <= 0}
                            onClick={() => handleMoveOrder(rec.id, 'up')}
                            aria-label={`Move ${rec.universityName} earlier`}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isRowBusy || globalIdx === -1 || globalIdx >= deadlines.length - 1}
                            onClick={() => handleMoveOrder(rec.id, 'down')}
                            aria-label={`Move ${rec.universityName} later`}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Logo + University Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[210px]">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 dark:border-slate-700 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                            <UniversityOfficialLogo
                              universityName={rec.universityName}
                              logoDownloadUrl={rec.logoDownloadUrl}
                              logoStoragePath={rec.logoStoragePath}
                              logoFallbackDataUrl={rec.logoFallbackDataUrl}
                              initialsClassName="text-[10px] font-bold text-slate-500 select-none"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {rec.universityName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {rec.logoFileName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Intake */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {rec.admissionIntake}
                        </div>
                        {rec.intakeLabel && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                            {rec.intakeLabel}
                          </div>
                        )}
                      </td>

                      {/* Deadline Date */}
                      <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatDeadlineDateKst(rec.applicationDeadline)}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {rec.applicationDeadline}
                        </div>
                      </td>

                      {/* Live KST Countdown */}
                      <td className="py-3 px-4 font-mono font-bold tabular-nums whitespace-nowrap">
                        <span
                          className={
                            cd.isExpired
                              ? 'text-rose-600 dark:text-rose-400'
                              : cd.urgency === 'closing_today'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }
                        >
                          {cd.label}
                        </span>
                      </td>

                      {/* Publication Toggle */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => handleQuickTogglePublish(rec)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            rec.published && rec.publicationStatus === 'published'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {rec.published && rec.publicationStatus === 'published' ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Unpublished</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Edit & Delete Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(rec)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setRecordToDelete(rec);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
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

      {/* ===================================================================== */}
      {/* ADD / EDIT UNIVERSITY ADMISSION DEADLINE MODAL                        */}
      {/* ===================================================================== */}
      {isModalOpen && draft && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveModal}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {draft.id ? 'Edit University Admission Deadline' : 'Add University Admission Deadline'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select an existing EveryKR university or enter a university name, upload the official logo from your computer, and set the KST deadline.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModalSafely}
                aria-label="Close modal"
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40 p-3.5 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* 1. University Selection (Reuse Existing EveryKR Universities or Custom) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  University Record
                </label>
                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, universitySelectionMode: 'existing' })
                    }
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      draft.universitySelectionMode === 'existing'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Existing EveryKR University
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, universitySelectionMode: 'custom' })
                    }
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      draft.universitySelectionMode === 'custom'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Custom University Name
                  </button>
                </div>
              </div>

              {draft.universitySelectionMode === 'existing' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={uniPickerSearch}
                      onChange={(e) => setUniPickerSearch(e.target.value)}
                      placeholder="Filter university directory..."
                      className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <select
                      value={draft.universityId}
                      onChange={(e) => handleSelectExistingUniversity(e.target.value)}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {filteredUniversityOptions.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.officialName || u.name} ({u.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Display University Name (Shown on Homepage Card)
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={draft.universityName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      universityName: e.target.value,
                      ...(draft.universitySelectionMode === 'custom'
                        ? { universityId: slugifyUniversityStorageSegment(e.target.value) }
                        : {}),
                    })
                  }
                  placeholder="e.g., Yonsei University"
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* 2. Direct Computer University Logo File Upload (ZERO URL INPUTS) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Official University Logo (Direct Computer Upload)
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  PNG, JPG, JPEG, WebP, or sanitized SVG · Max 5 MB
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(false);
                }}
                onDrop={handleDropZoneDrop}
                className={`rounded-2xl border-2 border-dashed p-5 transition-colors ${
                  isDraggingOver
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                {draft.logoDownloadUrl || draft.logoFallbackDataUrl ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        <UniversityOfficialLogo
                          universityName={draft.universityName || 'University'}
                          logoDownloadUrl={draft.logoDownloadUrl}
                          logoStoragePath={draft.logoStoragePath}
                          logoFallbackDataUrl={draft.logoFallbackDataUrl}
                          alt="Uploaded university logo preview"
                          loading="eager"
                          initialsClassName="text-xs font-extrabold text-slate-600 select-none"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {draft.logoFileName || 'official-logo'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          {draft.logoMimeType} · {formatByteSize(draft.logoFileSize)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs mt-0.5">
                          {draft.logoStoragePath}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={uploadingLogo}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${uploadingLogo ? 'animate-spin' : ''}`} />
                        <span>Replace Logo</span>
                      </button>
                      <button
                        type="button"
                        disabled={uploadingLogo}
                        onClick={handleRemoveDraftLogo}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Logo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2.5 py-2">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Drag and drop official university logo file here
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Upload directly from your computer (`university-deadlines/` Firebase Storage)
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        disabled={uploadingLogo}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>Browse Files</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Progress Bar */}
                {uploadingLogo && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                      <span>Validating & uploading logo to Firebase Storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-150"
                        style={{ width: `${Math.min(100, Math.max(5, uploadProgress))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {uploadNotice && (
                <div
                  className={`rounded-xl p-3 flex items-start gap-2 text-xs ${
                    uploadNotice.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  {uploadNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{uploadNotice.message}</span>
                </div>
              )}
            </div>

            {/* 3. Intake, Application Deadline (KST), Order & Publication Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admission Intake
                </label>
                <select
                  value={draft.admissionIntake}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      admissionIntake: e.target.value as AdmissionIntakeType,
                    })
                  }
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Spring">Spring Intake</option>
                  <option value="Fall">Fall Intake</option>
                  <option value="Other">Other Intake</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Application Deadline (KST)
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={draft.applicationDeadline}
                    onChange={(e) =>
                      setDraft({ ...draft, applicationDeadline: e.target.value })
                    }
                    className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={draft.displayOrder}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      displayOrder: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Intake Note (Admin Table Only — Optional)
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={draft.intakeLabel}
                  onChange={(e) => setDraft({ ...draft, intakeLabel: e.target.value })}
                  placeholder="e.g., Spring 2027 Round 1"
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Publication Status
                </label>
                <select
                  value={draft.publicationStatus}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      publicationStatus: e.target.value as 'published' | 'unpublished',
                    })
                  }
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="published">Published (Live on Homepage Carousel)</option>
                  <option value="unpublished">Unpublished (Hidden Draft)</option>
                </select>
              </div>
            </div>

            {/* 4. Exact Live Card Preview Inside Modal */}
            {previewDraftRecord && (
              <div className="rounded-2xl bg-[#050C1C] border border-slate-800 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-200">
                    Exact Homepage Card Live Preview
                  </span>
                  <span className="font-mono tabular-nums">
                    KST Countdown:{' '}
                    {computeKstDeadlineCountdown(previewDraftRecord.applicationDeadline, nowMs).label}
                  </span>
                </div>
                <div className="flex justify-center sm:justify-start overflow-x-auto py-1">
                  <UniversityDeadlineCard
                    record={previewDraftRecord}
                    nowMs={nowMs}
                    interactiveLink={false}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={closeModalSafely}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRecord || uploadingLogo}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
              >
                {savingRecord
                  ? 'Saving...'
                  : draft.id
                  ? 'Save Deadline Changes'
                  : 'Save & Publish Deadline'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DELETE CONFIRMATION MODAL                                             */}
      {/* ===================================================================== */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                Delete University Admission Deadline?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This will immediately remove{' '}
                <strong className="text-slate-900 dark:text-white">
                  {recordToDelete.universityName} ({recordToDelete.admissionIntake} ·{' '}
                  {recordToDelete.applicationDeadline})
                </strong>{' '}
                from the homepage carousel and clean up its uploaded logo file if no other intake record references it.
              </p>
            </div>

            {deleteError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deletingRecord}
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRecord}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
              >
                {deletingRecord ? 'Deleting...' : 'Delete Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
