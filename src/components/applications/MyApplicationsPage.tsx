/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Student "My Applications" Page (`/my-applications`)
 * - Lists every application with university logo, intake, degree, status badge, document progress, deadline countdown
 * - Expandable vertical status timeline loaded from `applications/{id}/history`
 * - Inline missing-document upload & resubmission workflow when `status === 'documents_missing'`
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Upload,
  AlertTriangle,
  ArrowRight,
  Loader2,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  fetchStudentSmartApplications,
  fetchApplicationHistory,
  studentUploadReplacementDocument,
  submitSmartApplication,
  withdrawSmartApplication,
  SmartApplicationServiceError,
} from '../../services/smartApplicationService';
import {
  MAX_APPLICATION_FILE_BYTES,
  checkDocumentQuality,
  compressImageIfNeeded,
  isAcceptedApplicationFile,
} from '../../utils/documentFileTools';
import {
  getTodayKstDateString,
  parseVerifiedAdmissionDate,
} from '../../utils/universityDeadlineClassifier';
import type {
  SmartApplicationHistoryEvent,
  SmartApplicationRecord,
  SmartApplicationStatus,
} from '../../types/smartApplication';
import {
  SMART_APPLICATION_STATUS_META,
  STUDENT_WITHDRAWABLE_STATUSES,
  normalizeSmartApplicationStatus,
} from '../../types/smartApplication';

const STANDARD_TIMELINE_STAGES: Array<{ key: SmartApplicationStatus; label: string }> = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'documents_missing', label: 'Documents Check' },
  { key: 'sent_to_university', label: 'Sent to University' },
  { key: 'admitted', label: 'Decision (Admitted / Rejected)' },
  { key: 'visa_processing', label: 'Visa Processing' },
];

function displayDegreeLabel(raw: string): string {
  const v = String(raw || '').toLowerCase();
  if (v === 'klp') return 'Korean Language Program';
  if (v === 'eap') return 'English Academic Program';
  if (v === 'associate') return 'Associate';
  if (v === 'bachelor' || v === 'undergraduate') return "Bachelor's";
  if (v === 'master' || v === 'masters' || v === 'graduate') return "Master's";
  if (v === 'phd') return 'PhD';
  return raw || 'Degree';
}

function computeDeadlineCountdown(deadlineStr?: string): string | null {
  if (!deadlineStr) return null;
  const todayIso = parseVerifiedAdmissionDate(getTodayKstDateString());
  const targetIso = parseVerifiedAdmissionDate(deadlineStr);
  if (!todayIso || !targetIso) return null;
  const todayMs = new Date(`${todayIso}T00:00:00Z`).getTime();
  const targetMs = new Date(`${targetIso}T00:00:00Z`).getTime();
  if (Number.isNaN(todayMs) || Number.isNaN(targetMs)) return null;
  const diff = Math.ceil((targetMs - todayMs) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Deadline passed';
  if (diff === 0) return 'Closes today';
  return `${diff} day${diff === 1 ? '' : 's'} left`;
}

export const MyApplicationsPage: React.FC = () => {
  const { currentUser, isAuthReady, showToast } = useApp();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<SmartApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authSessionMissing, setAuthSessionMissing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [histories, setHistories] = useState<Record<string, SmartApplicationHistoryEvent[]>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const loadApplications = async () => {
    if (!isAuthReady || !currentUser?.uid) return;
    setLoading(true);
    setError(null);
    setAuthSessionMissing(false);
    try {
      const list = await fetchStudentSmartApplications(currentUser.uid);
      setApplications(list);
      if (list.length > 0 && !expandedId) {
        setExpandedId(list[0].id);
      }
    } catch (err: any) {
      if (err instanceof SmartApplicationServiceError && err.code === 'firebase-auth-missing') {
        setAuthSessionMissing(true);
      }
      setError(err?.message || 'Could not load your applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady) return;
    loadApplications();
  }, [isAuthReady, currentUser?.uid]);

  useEffect(() => {
    if (!expandedId || histories[expandedId]) return;
    fetchApplicationHistory(expandedId)
      .then((events) =>
        setHistories((prev) => ({
          ...prev,
          [expandedId]: events,
        }))
      )
      .catch(() => {});
  }, [expandedId]);

  const handleQuickMissingDocUpload = async (
    app: SmartApplicationRecord,
    docType: string,
    label: string,
    file: File
  ) => {
    if (!currentUser?.uid) return;
    if (!isAcceptedApplicationFile(file) || file.size > MAX_APPLICATION_FILE_BYTES) {
      showToast('Upload a PDF, JPG, PNG, or HEIC file under 20 MB.');
      return;
    }

    const key = `${app.id}:${docType}`;
    setUploadingKey(key);
    try {
      await checkDocumentQuality(file, docType);
      const ready = await compressImageIfNeeded(file);
      const updated = await studentUploadReplacementDocument({
        app,
        docType,
        label,
        file: ready,
        actorUid: currentUser.uid,
        actorName:
          `${app.personal?.givenNames || ''} ${app.personal?.surname || ''}`.trim() ||
          currentUser.name ||
          'Student',
        actorEmail: currentUser.email || app.personal?.email || '',
      });
      setApplications((prev) => prev.map((a) => (a.id === app.id ? updated : a)));
      const refreshedHistory = await fetchApplicationHistory(app.id);
      setHistories((prev) => ({ ...prev, [app.id]: refreshedHistory }));
      showToast(`${label} uploaded (previous version preserved).`);
    } catch (err: any) {
      showToast(err?.message || 'Could not upload document.');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleResubmitMissingDocs = async (app: SmartApplicationRecord) => {
    if (!currentUser) return;
    setResubmittingId(app.id);
    try {
      const updated = await submitSmartApplication({
        app,
        actorName:
          `${app.personal.givenNames} ${app.personal.surname}`.trim() || currentUser.name,
        actorEmail: currentUser.email,
        isResubmission: true,
      });
      setApplications((prev) => prev.map((a) => (a.id === app.id ? updated : a)));
      const refreshedHistory = await fetchApplicationHistory(app.id);
      setHistories((prev) => ({ ...prev, [app.id]: refreshedHistory }));
      showToast('Updated documents submitted for review!');
    } catch (err: any) {
      showToast(err?.message || 'Could not resubmit application.');
    } finally {
      setResubmittingId(null);
    }
  };

  const handleWithdrawApplication = async (app: SmartApplicationRecord) => {
    if (!currentUser) return;
    setWithdrawingId(app.id);
    try {
      const updated = await withdrawSmartApplication({
        app,
        actorName:
          `${app.personal.givenNames} ${app.personal.surname}`.trim() || currentUser.name,
        actorEmail: currentUser.email,
      });
      setApplications((prev) => prev.map((a) => (a.id === app.id ? updated : a)));
      setConfirmWithdrawId(null);
      const refreshedHistory = await fetchApplicationHistory(app.id);
      setHistories((prev) => ({ ...prev, [app.id]: refreshedHistory }));
      showToast('Application withdrawn.');
    } catch (err: any) {
      showToast(err?.message || 'Could not withdraw application.');
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <section className="min-h-screen bg-[#F5F8FD] dark:bg-[#061536] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
              Student Admissions Tracker
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#061B49] dark:text-white mt-0.5 tracking-tight">
              My Applications
            </h1>
            <p className="text-xs sm:text-sm text-[#4B607F] dark:text-[#B8C9E5] mt-1">
              Resume saved drafts, track review stages, and upload any requested documents.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadApplications}
              className="ekr-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              to="/universities"
              className="ekr-glass-btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Browse Universities</span>
            </Link>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="ekr-glass-panel rounded-2xl p-8 text-center space-y-3 border border-rose-200 dark:border-rose-900">
            <AlertTriangle className="w-9 h-9 text-rose-500 mx-auto" />
            <h2 className="text-base font-extrabold text-[#081426] dark:text-white">
              Could Not Load Applications
            </h2>
            <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5]">{error}</p>
            <div className="flex items-center justify-center gap-2.5 pt-1">
              {authSessionMissing && (
                <button
                  type="button"
                  onClick={() => navigate('/login?redirect=%2Fmy-applications')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#081426] dark:bg-[#D6B875] text-white dark:text-[#081426] cursor-pointer"
                >
                  Sign In Again
                </button>
              )}
              <button
                type="button"
                onClick={loadApplications}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] text-white cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && applications.length === 0 && (
          <div className="ekr-glass-panel rounded-2xl p-10 text-center space-y-4 border border-slate-200/80 dark:border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-[#0754B8]/10 text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-[#061B49] dark:text-white">
                No Applications Yet
              </h2>
              <p className="text-xs sm:text-sm text-[#4B607F] dark:text-[#B8C9E5] max-w-md mx-auto">
                Explore verified Korean universities and click <strong>Apply Now</strong> to start a
                guided smart application with passport auto-fill and document tracking.
              </p>
            </div>
            <Link
              to="/universities"
              className="ekr-glass-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold"
            >
              <span>Explore Universities</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Application Cards */}
        {!loading && !error && applications.length > 0 && (
          <div className="space-y-5">
            {applications.map((app) => {
              const normalizedStatus = normalizeSmartApplicationStatus(app.status);
              const meta =
                SMART_APPLICATION_STATUS_META[normalizedStatus] ||
                SMART_APPLICATION_STATUS_META.draft;
              const isExpanded = expandedId === app.id;
              const canWithdraw = STUDENT_WITHDRAWABLE_STATUSES.has(normalizedStatus);
              const uploadedCount = Object.keys(app.documents || {}).length;
              const totalReqCount = Math.max(
                uploadedCount,
                app.requiredDocTypes?.length || 7
              );
              const countdown = computeDeadlineCountdown(app.applicationDeadline);
              const timelineEvents = histories[app.id] || [];

              return (
                <div
                  key={app.id}
                  className="ekr-glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm bg-white/90 dark:bg-[#0B172B]/90"
                >
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
                          {app.universityLogoUrl ? (
                            <img
                              src={app.universityLogoUrl}
                              alt={app.universityName}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 text-[#081426]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base sm:text-lg font-extrabold text-[#081426] dark:text-white truncate">
                              {app.universityName}
                            </h2>
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#526685] dark:text-[#93A9CB] mt-1">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                              {app.intake}
                            </span>
                            <span>·</span>
                            <span>{displayDegreeLabel(app.degreeLevel)}</span>
                            {app.program?.desiredMajor && (
                              <>
                                <span>·</span>
                                <span className="font-semibold text-[#081426] dark:text-slate-200">
                                  {app.program.desiredMajor}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {countdown && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F4F8FD] dark:bg-white/10 text-[#081426] dark:text-white border border-slate-200 dark:border-white/10">
                            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                            {countdown}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/apply/${app.universityId}?appId=${app.id}`)
                          }
                          className="ekr-glass-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          <span>
                            {normalizedStatus === 'draft'
                              ? 'Resume Draft'
                              : normalizedStatus === 'documents_missing'
                              ? 'Open & Fix'
                              : 'View Application'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        {canWithdraw && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmWithdrawId(confirmWithdrawId === app.id ? null : app.id)
                            }
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <span>Withdraw</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : app.id)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-white/15 text-[#526685] hover:text-[#081426] dark:hover:text-white cursor-pointer"
                          aria-label="Toggle timeline"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Inline Withdraw Confirmation */}
                    {confirmWithdrawId === app.id && canWithdraw && (
                      <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/35 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-rose-900 dark:text-rose-200">
                          <strong>Withdraw this application?</strong> Your status will change to{' '}
                          <strong>Withdrawn</strong> and admissions review will stop. You can start
                          a new application later if needed.
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmWithdrawId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B172B] text-[#081426] dark:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={withdrawingId === app.id}
                            onClick={() => handleWithdrawApplication(app)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-60"
                          >
                            {withdrawingId === app.id && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                            <span>Confirm Withdraw</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Document progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[#0754B8] dark:bg-[#0875E8] transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((uploadedCount / Math.max(1, totalReqCount)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#4B607F] dark:text-[#B8C9E5] shrink-0 tabular-nums">
                        {uploadedCount} of {totalReqCount} documents ready
                      </span>
                    </div>

                    {/* Direct Missing Documents Upload Panel */}
                    {app.status === 'documents_missing' && (
                      <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/35 p-4 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                              Action Required — Upload Requested Documents
                            </h3>
                            {app.requestedDocumentsMessage && (
                              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                                {app.requestedDocumentsMessage}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(app.requestedDocuments && app.requestedDocuments.length > 0
                            ? app.requestedDocuments
                            : [{ docType: 'other', label: 'Requested Additional Document', requestedAt: '' }]
                          ).map((req) => {
                            const key = `${app.id}:${req.docType}`;
                            const uploaded = app.documents?.[req.docType];
                            return (
                              <div
                                key={req.docType}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white dark:bg-[#0B172B] border border-amber-200 dark:border-amber-800 px-3.5 py-2.5"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs font-bold text-[#081426] dark:text-white">
                                      {req.label}
                                    </p>
                                    {req.deadline && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                        Due: {req.deadline}
                                      </span>
                                    )}
                                    {req.status === 'uploaded' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        Replacement Ready
                                      </span>
                                    )}
                                  </div>
                                  {req.note && (
                                    <p className="text-[11px] text-[#526685] dark:text-[#93A9CB] mt-0.5">
                                      {req.note}
                                    </p>
                                  )}
                                  {uploaded && (
                                    <p className="text-[11px] text-emerald-600 font-semibold truncate mt-0.5">
                                      Uploaded (v{uploaded.version || 1}): {uploaded.fileName}
                                    </p>
                                  )}
                                </div>
                                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer shrink-0">
                                  {uploadingKey === key ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Upload className="w-3.5 h-3.5" />
                                  )}
                                  <span>{uploaded ? 'Replace File' : 'Upload File'}</span>
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        handleQuickMissingDocUpload(app, req.docType, req.label, f);
                                      }
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={resubmittingId === app.id}
                            onClick={() => handleResubmitMissingDocs(app)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-[#081426] dark:bg-[#2563EB] text-white hover:bg-[#2563EB] cursor-pointer disabled:opacity-60"
                          >
                            {resubmittingId === app.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#D6B875]" />
                            )}
                            <span>Resubmit Updated Documents</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Vertical Status Timeline */}
                  {isExpanded && (
                    <div className="px-5 py-4 sm:px-6 border-t border-slate-200/70 dark:border-white/10 bg-[#F4F8FD]/70 dark:bg-[#081426]/60 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#526685] dark:text-[#93A9CB] mb-3">
                          Application Progress Timeline
                        </h3>
                        <ol className="relative border-l-2 border-slate-200 dark:border-white/15 ml-2.5 space-y-3.5">
                          {STANDARD_TIMELINE_STAGES.map((stage) => {
                            const stageOrder = SMART_APPLICATION_STATUS_META[stage.key].orderIndex;
                            const isReached =
                              meta.orderIndex >= stageOrder && normalizedStatus !== 'withdrawn';
                            const isCurrent =
                              normalizedStatus === stage.key ||
                              (stage.key === 'admitted' &&
                                (normalizedStatus === 'admitted' ||
                                  normalizedStatus === 'rejected'));
                            return (
                              <li key={stage.key} className="ml-4 relative">
                                <span
                                  className={`absolute -left-[25px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                    isCurrent
                                      ? 'bg-[#2563EB] border-[#2563EB] ring-4 ring-[#2563EB]/20'
                                      : isReached
                                      ? 'bg-emerald-500 border-emerald-500'
                                      : 'bg-white dark:bg-[#0B172B] border-slate-300 dark:border-white/25'
                                  }`}
                                />
                                <p
                                  className={`text-xs font-bold ${
                                    isCurrent
                                      ? 'text-[#2563EB] dark:text-[#4BA3FF]'
                                      : isReached
                                      ? 'text-[#081426] dark:text-white'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {stage.key === 'admitted' && normalizedStatus === 'rejected'
                                    ? 'Rejected'
                                    : stage.label}
                                </p>
                              </li>
                            );
                          })}
                        </ol>
                      </div>

                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#526685] dark:text-[#93A9CB] mb-3">
                          Activity Updates
                        </h3>
                        {timelineEvents.length === 0 ? (
                          <p className="text-xs text-[#526685] dark:text-[#93A9CB]">
                            Draft created on {new Date(app.createdAt).toLocaleDateString()}. Updates
                            appear here once submitted.
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {timelineEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className="rounded-xl bg-white dark:bg-[#0B172B] border border-slate-200/80 dark:border-white/10 p-3 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-extrabold text-[#081426] dark:text-white">
                                    {SMART_APPLICATION_STATUS_META[
                                      normalizeSmartApplicationStatus(ev.to)
                                    ]?.label || ev.to}
                                  </span>
                                  <span className="text-[11px] text-[#526685]">
                                    {new Date(ev.when).toLocaleString()}
                                  </span>
                                </div>
                                {ev.message && (
                                  <p className="text-[#475569] dark:text-[#B8C9E5]">{ev.message}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
