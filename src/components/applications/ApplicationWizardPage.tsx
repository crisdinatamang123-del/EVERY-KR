/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR "Apply Now" Smart Application Wizard (`/apply/:universityId`)
 * - Step 0: Choose Intake (driven by the same `bundle.admissionDeadlines` + `classifyAdmissionDeadlineRound` as the Deadlines tab)
 * - Steps 1–7: Personal, Education, Language, Program Choice, Finance, Documents, Review & Submit
 * - Debounced Firestore auto-save (~1s) with "Saved" / "Saving…" indicator
 * - Gold "AI filled — please verify" chips with "Looks correct" confirmation + Review blocker
 * - Private Firebase Storage uploads with camera capture, preview, replace, delete, and reuse prompt
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  Languages,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Camera,
  Eye,
  AlertTriangle,
  Wallet,
  User,
  FolderOpen,
  ClipboardCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  RELATIONAL_BUNDLE_BY_ID,
  resolveCanonicalUniversityId,
  buildArchiveUniversityRelationalBundle,
} from '../../data/universities25';
import { getUniversitySlug } from '../../utils/seoRoutes';
import {
  classifyAdmissionDeadlineRound,
  formatRoundLabel,
  getTodayKstDateString,
  parseVerifiedAdmissionDate,
} from '../../utils/universityDeadlineClassifier';
import {
  buildChecklistForDegree,
  createSmartApplicationDraft,
  deleteSmartApplicationStorageFile,
  fetchPrivateDocumentBlobUrl,
  fetchSmartApplicationById,
  fetchUserApplicationProfile,
  findExistingUserApplication,
  mergeDocumentWithVersionHistory,
  saveSmartApplicationDraft,
  SmartApplicationServiceError,
  submitSmartApplication,
  uploadSmartApplicationDocument,
} from '../../services/smartApplicationService';
import {
  MAX_APPLICATION_FILE_BYTES,
  isAcceptedApplicationFile,
  prepareDocumentForUploadAndAnalysis,
} from '../../utils/documentFileTools';
import {
  SmartUploadDropzone,
  type UnassignedUploadedFile,
  type SmartUploadLanguageAutoFill,
  type SmartUploadTranscriptAutoFill,
} from './SmartUploadDropzone';
import type {
  ChecklistRequirementItem,
  PassportExtractionApiResponse,
  SmartApplicationDocumentItem,
  SmartApplicationRecord,
} from '../../types/smartApplication';

const WIZARD_STEPS = [
  { id: 0, key: 'intake', label: 'Intake', icon: Calendar },
  { id: 1, key: 'personal', label: 'Personal', icon: User },
  { id: 2, key: 'education', label: 'Education', icon: GraduationCap },
  { id: 3, key: 'language', label: 'Language', icon: Languages },
  { id: 4, key: 'program', label: 'Program', icon: Building2 },
  { id: 5, key: 'finance', label: 'Finance', icon: Wallet },
  { id: 6, key: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 7, key: 'review', label: 'Review & Submit', icon: ClipboardCheck },
] as const;

const FIELD_FRIENDLY_LABELS: Record<string, { label: string; step: number }> = {
  'personal.surname': { label: 'Surname (as on passport)', step: 1 },
  'personal.givenNames': { label: 'Given Names (as on passport)', step: 1 },
  'personal.gender': { label: 'Gender', step: 1 },
  'personal.dateOfBirth': { label: 'Date of Birth', step: 1 },
  'personal.nationality': { label: 'Nationality', step: 1 },
  'personal.passportNumber': { label: 'Passport Number', step: 1 },
  'personal.passportIssueDate': { label: 'Passport Issue Date', step: 1 },
  'personal.passportExpiryDate': { label: 'Passport Expiry Date', step: 1 },
  'personal.placeOfBirth': { label: 'Place of Birth', step: 1 },
  'education.institutionName': { label: 'Institution Name', step: 2 },
  'education.country': { label: 'Education Country', step: 2 },
  'education.gpa': { label: 'GPA / CGPA', step: 2 },
  'education.gpaScale': { label: 'GPA Scale', step: 2 },
  'language.topikLevel': { label: 'TOPIK Level', step: 3 },
  'language.englishTestType': { label: 'English Test Type', step: 3 },
  'language.englishTestScore': { label: 'English Test Score', step: 3 },
  'language.englishTestDate': { label: 'English Test Date', step: 3 },
};

const PHONE_COUNTRY_CODES = [
  '+82', '+880', '+977', '+91', '+92', '+84', '+62', '+63', '+66', '+60',
  '+998', '+7', '+976', '+86', '+81', '+1', '+44', '+61', '+90', '+20', '+234',
];

interface IntakeCardOption {
  id: string;
  intakeLabel: string;
  degreeLevel: string;
  degreeLabel: string;
  round: string;
  roundLabel: string;
  deadlineDate: string;
  semesterStartDate: string;
  isClosed: boolean;
  isNotAnnounced: boolean;
  daysLeft: number | null;
  statusLabel: string;
  isFallback?: boolean;
}

function displayDegreeLabel(raw: string): string {
  const norm = (raw || '').trim().toLowerCase();
  if (norm === 'bachelor' || norm === 'undergraduate') return 'Undergraduate (Bachelor)';
  if (norm === 'master' || norm === 'masters' || norm === 'graduate') return 'Graduate (Master’s)';
  if (norm === 'phd' || norm === 'doctoral') return 'Doctoral (PhD)';
  if (norm === 'klp') return 'Korean Language Program (KLP)';
  if (norm === 'associate') return 'Associate Degree';
  if (norm === 'eap') return 'English Academic Program (EAP)';
  return raw || 'Program';
}

function daysBetweenIso(fromIso: string, toIso: string): number | null {
  const from = parseVerifiedAdmissionDate(fromIso);
  const to = parseVerifiedAdmissionDate(toIso);
  if (!from || !to) return null;
  const f = new Date(`${from}T00:00:00Z`).getTime();
  const t = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(f) || Number.isNaN(t)) return null;
  return Math.ceil((t - f) / (1000 * 60 * 60 * 24));
}

function isPassportValidSixMonthsAfter(expiryIso: string, intakeStartIso?: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryIso)) return true;
  const expiry = new Date(`${expiryIso}T00:00:00Z`).getTime();
  if (Number.isNaN(expiry)) return true;
  const baseDate =
    intakeStartIso && /^\d{4}-\d{2}-\d{2}$/.test(intakeStartIso)
      ? new Date(`${intakeStartIso}T00:00:00Z`)
      : new Date();
  const sixMonthsLater = new Date(baseDate.getTime());
  sixMonthsLater.setUTCMonth(sixMonthsLater.getUTCMonth() + 6);
  return expiry >= sixMonthsLater.getTime();
}

export const ApplicationWizardPage: React.FC = () => {
  const { universityId = '' } = useParams<{ universityId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { universitiesList, currentUser, isAuthReady, showToast } = useApp();

  const paramIntake = searchParams.get('intake') || '';
  const paramDegree = searchParams.get('degree') || '';
  const paramRound = searchParams.get('round') || '';
  const paramAppId = searchParams.get('appId') || '';

  const uni = useMemo(() => {
    const decoded = decodeURIComponent(universityId).trim();
    const canonical = resolveCanonicalUniversityId(decoded);
    const slugQuery = (canonical || decoded).toLowerCase();
    return (
      universitiesList.find(
        (u) =>
          u.id.toLowerCase() === slugQuery ||
          getUniversitySlug(u).toLowerCase() === slugQuery ||
          u.name.toLowerCase() === slugQuery ||
          (u.officialName || '').toLowerCase() === slugQuery ||
          (u.aliases || []).some((a) => a.toLowerCase() === slugQuery)
      ) || null
    );
  }, [universitiesList, universityId]);

  const bundle = useMemo(() => {
    if (!uni) {
      const canonical = resolveCanonicalUniversityId(universityId);
      return canonical ? RELATIONAL_BUNDLE_BY_ID[canonical] || null : null;
    }
    if (uni.relationalBundle) return uni.relationalBundle;
    const canonical = resolveCanonicalUniversityId(uni.id) || uni.id;
    return RELATIONAL_BUNDLE_BY_ID[canonical] || buildArchiveUniversityRelationalBundle(uni);
  }, [uni, universityId]);

  const universityName =
    uni?.officialName || uni?.name || bundle?.university.englishName || 'University';
  const universitySlug = (uni ? getUniversitySlug(uni) : '') || bundle?.university.slug || universityId;
  const universityLogoUrl =
    uni?.logo ||
    (bundle?.logo?.verified && !bundle.logo.missingLogoStatus
      ? bundle.logo.localAssetPath || bundle.logo.officialSourceUrl
      : '');
  const officialPortalUrl =
    bundle?.contacts?.onlineApplicationPortalUrl ||
    uni?.officialWebsite ||
    bundle?.university.officialWebsiteUrl ||
    '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<number>(0);
  const [app, setApp] = useState<SmartApplicationRecord | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reusable data & documents state
  const [reusableDocs, setReusableDocs] = useState<Record<string, SmartApplicationDocumentItem>>({});
  const [reuseBannerDismissed, setReuseBannerDismissed] = useState(false);
  const [unassignedFiles, setUnassignedFiles] = useState<UnassignedUploadedFile[]>([]);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [dragOverDocType, setDragOverDocType] = useState<string | null>(null);
  const [loadErrorCode, setLoadErrorCode] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    label: string;
    fileName: string;
    mimeType: string;
    url: string;
    isObjectUrl?: boolean;
  } | null>(null);

  const autosaveTimerRef = useRef<number | null>(null);
  const latestAppRef = useRef<SmartApplicationRecord | null>(null);
  const isDirtyRef = useRef(false);
  const inFlightSaveRef = useRef(false);
  const pendingSaveAfterFlightRef = useRef(false);
  const previewObjectUrlRef = useRef<string | null>(null);

  // Build Step 0 Intake cards from the exact same data powering the Deadlines tab
  const intakeOptions: IntakeCardOption[] = useMemo(() => {
    const todayIso = getTodayKstDateString();
    const deadlines = bundle?.admissionDeadlines || [];
    const options: IntakeCardOption[] = deadlines.map((record) => {
      const classified = classifyAdmissionDeadlineRound(record, todayIso);
      const rawStatusText = `${record.roundActiveStatus || ''} ${record.onlineApplicationDeadline || ''}`.toLowerCase();
      const isNotAnnounced =
        record.roundActiveStatus === 'Not Announced' ||
        rawStatusText.includes('not announced') ||
        rawStatusText.includes('information not available');

      const deadlineIso =
        parseVerifiedAdmissionDate(record.onlineApplicationDeadline) ||
        parseVerifiedAdmissionDate(record.fileCollectionEndDate) ||
        '';
      const daysLeft = deadlineIso ? daysBetweenIso(todayIso, deadlineIso) : null;
      const isPastDeadline = daysLeft !== null && daysLeft < 0;
      const isClosed =
        !isNotAnnounced &&
        (classified === 'Closed' ||
          record.roundActiveStatus === 'Closed in Sheet (Strikethrough)' ||
          record.roundActiveStatus === 'No Recruitment (X)' ||
          isPastDeadline);

      let statusLabel = 'Open';
      if (isClosed) {
        statusLabel = 'Closed';
      } else if (isNotAnnounced) {
        statusLabel = 'Dates not confirmed yet';
      } else if (daysLeft !== null && daysLeft === 0) {
        statusLabel = 'Closes today';
      } else if (daysLeft !== null && daysLeft > 0) {
        statusLabel = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
      } else if (classified === 'Upcoming') {
        statusLabel = 'Upcoming';
      }

      return {
        id: record.id,
        intakeLabel: record.intakeLabel || `${record.intakeYear} ${record.intakeSemester}`,
        degreeLevel: record.degreeLevel,
        degreeLabel: displayDegreeLabel(record.degreeLevel),
        round: record.applicationRound,
        roundLabel: formatRoundLabel(record.applicationRound),
        deadlineDate:
          record.onlineApplicationDeadline &&
          record.onlineApplicationDeadline !== 'Not Announced' &&
          record.onlineApplicationDeadline !== 'Information not available'
            ? record.onlineApplicationDeadline
            : '',
        semesterStartDate:
          record.semesterStartingDate &&
          /^\d{4}-\d{2}-\d{2}$/.test(record.semesterStartingDate)
            ? record.semesterStartingDate
            : '',
        isClosed,
        isNotAnnounced,
        daysLeft,
        statusLabel,
      };
    });

    if (options.length === 0) {
      const nextYear = new Date().getFullYear() + 1;
      return [
        {
          id: 'fallback-bachelor',
          intakeLabel: `${nextYear} Spring / Fall Intake`,
          degreeLevel: 'Bachelor',
          degreeLabel: 'Undergraduate (Bachelor)',
          round: 'General Recruitment',
          roundLabel: 'General Recruitment',
          deadlineDate: '',
          semesterStartDate: '',
          isClosed: false,
          isNotAnnounced: true,
          daysLeft: null,
          statusLabel: 'Dates not confirmed yet',
          isFallback: true,
        },
        {
          id: 'fallback-masters',
          intakeLabel: `${nextYear} Spring / Fall Intake`,
          degreeLevel: 'Masters',
          degreeLabel: 'Graduate (Master’s / PhD)',
          round: 'General Recruitment',
          roundLabel: 'General Recruitment',
          deadlineDate: '',
          semesterStartDate: '',
          isClosed: false,
          isNotAnnounced: true,
          daysLeft: null,
          statusLabel: 'Dates not confirmed yet',
          isFallback: true,
        },
        {
          id: 'fallback-klp',
          intakeLabel: `${nextYear} Korean Language Program`,
          degreeLevel: 'KLP',
          degreeLabel: 'Korean Language Program (KLP)',
          round: 'General Recruitment',
          roundLabel: 'General Recruitment',
          deadlineDate: '',
          semesterStartDate: '',
          isClosed: false,
          isNotAnnounced: true,
          daysLeft: null,
          statusLabel: 'Dates not confirmed yet',
          isFallback: true,
        },
      ];
    }

    return options;
  }, [bundle]);

  const checklistInfo = useMemo(() => {
    const degree = app?.degreeLevel || paramDegree || 'Bachelor';
    return buildChecklistForDegree(bundle?.applicationDocuments, degree);
  }, [bundle, app?.degreeLevel, paramDegree]);

  // Major options from university's existing Major & Departments data
  const majorOptions = useMemo(() => {
    const programs = bundle?.programs || [];
    const seen = new Set<string>();
    const list: Array<{ name: string; faculty: string; language: string }> = [];
    for (const p of programs) {
      const name = p.programNameEn?.trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      list.push({
        name,
        faculty: p.collegeOrFaculty || '',
        language: p.languageOfInstruction || '',
      });
    }
    return list;
  }, [bundle]);

  const isReadOnly = Boolean(
    app && app.status !== 'draft' && app.status !== 'documents_missing'
  );

  // Initial load: wait for Firebase Auth readiness, then resume existing application or prepare Step 0
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!isAuthReady || !currentUser?.uid) return;
      setLoading(true);
      setLoadError(null);
      setLoadErrorCode(null);
      try {
        // 1. If explicit ?appId=... is passed, load it directly
        if (paramAppId) {
          const existing = await fetchSmartApplicationById(paramAppId);
          if (!cancelled && existing) {
            setApp(existing);
            latestAppRef.current = existing;
            setStep(existing.status === 'documents_missing' ? 6 : 1);
            const lookup = await findExistingUserApplication({
              userId: existing.userId,
              universityId: existing.universityId,
            });
            if (!cancelled) setReusableDocs(lookup.reusableDocuments);
            setLoading(false);
            return;
          }
        }

        const canonicalUniId = uni?.id || bundle?.university.id || universityId;
        const [lookup, profile] = await Promise.all([
          findExistingUserApplication({
            userId: currentUser.uid,
            universityId: canonicalUniId,
            intake: paramIntake || undefined,
            degreeLevel: paramDegree || undefined,
          }),
          fetchUserApplicationProfile(currentUser.uid),
        ]);

        if (cancelled) return;
        setReusableDocs(lookup.reusableDocuments);

        // Resume exact match if intake+degree were provided in URL
        if (lookup.exactMatch) {
          setApp(lookup.exactMatch);
          latestAppRef.current = lookup.exactMatch;
          setStep(lookup.exactMatch.status === 'documents_missing' ? 6 : 1);
          setLoading(false);
          return;
        }

        // If URL pre-selected an open intake/degree, create or resume draft immediately
        if (paramIntake && paramDegree) {
          const matchedOption = intakeOptions.find(
            (o) =>
              o.intakeLabel.toLowerCase() === paramIntake.toLowerCase() &&
              o.degreeLevel.toLowerCase() === paramDegree.toLowerCase() &&
              (!paramRound || o.round.toLowerCase() === paramRound.toLowerCase()) &&
              !o.isClosed
          );
          if (matchedOption) {
            const created = await createSmartApplicationDraft({
              userId: currentUser.uid,
              userEmail: currentUser.email,
              universityId: canonicalUniId,
              universityName,
              universityLogoUrl,
              intake: matchedOption.intakeLabel,
              intakeStartDate: matchedOption.semesterStartDate,
              applicationDeadline: matchedOption.deadlineDate,
              degreeLevel: matchedOption.degreeLevel,
              round: matchedOption.round,
              prefillProfile: profile,
            });
            if (!cancelled) {
              setApp(created);
              latestAppRef.current = created;
              setStep(1);
              setLoading(false);
            }
            return;
          }
        }

        // Resume existing draft for this university if user already started one
        if (lookup.latestDraftForUniversity) {
          setApp(lookup.latestDraftForUniversity);
          latestAppRef.current = lookup.latestDraftForUniversity;
          setStep(0);
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          if (err instanceof SmartApplicationServiceError) {
            setLoadErrorCode(err.code);
            if (err.code === 'firebase-auth-missing') {
              const redirectTarget = encodeURIComponent(
                `${location.pathname}${location.search || ''}`
              );
              showToast('Please sign in again to refresh your secure application session.');
              navigate(`/login?redirect=${redirectTarget}`, { replace: true });
              return;
            }
          }
          setLoadError(err?.message || 'Could not load application details.');
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, currentUser?.uid, universityId, paramAppId]);

  // Serialized debounced auto-save (~1s) — prevents concurrent out-of-order writes
  const flushAutosave = async () => {
    const toSave = latestAppRef.current;
    if (!toSave || (toSave.status !== 'draft' && toSave.status !== 'documents_missing')) {
      return;
    }
    if (inFlightSaveRef.current) {
      pendingSaveAfterFlightRef.current = true;
      return;
    }
    inFlightSaveRef.current = true;
    setSaveState('saving');
    try {
      await saveSmartApplicationDraft(toSave);
      isDirtyRef.current = false;
      setSaveState('saved');
    } catch (err: any) {
      setSaveState('error');
      if (err instanceof SmartApplicationServiceError && err.code === 'firebase-auth-missing') {
        showToast('Your session expired. Please sign in again to continue saving.');
      }
    } finally {
      inFlightSaveRef.current = false;
      if (pendingSaveAfterFlightRef.current) {
        pendingSaveAfterFlightRef.current = false;
        flushAutosave();
      }
    }
  };

  const scheduleAutosave = (nextApp: SmartApplicationRecord) => {
    latestAppRef.current = nextApp;
    isDirtyRef.current = true;
    if (nextApp.status !== 'draft' && nextApp.status !== 'documents_missing') {
      return;
    }
    setSaveState('saving');
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      flushAutosave();
    }, 1000);
  };

  // Warn user before leaving page with unsaved changes & clean up object URLs on unmount
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current || inFlightSaveRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      if (isDirtyRef.current && latestAppRef.current) {
        saveSmartApplicationDraft(latestAppRef.current).catch(() => {});
      }
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  const updateApp = (updater: (prev: SmartApplicationRecord) => SmartApplicationRecord) => {
    setApp((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      scheduleAutosave(next);
      return next;
    });
  };

  const markFieldVerified = (fieldKey: string) => {
    updateApp((prev) => {
      const verified = new Set(prev.verifiedFields || []);
      verified.add(fieldKey);
      return {
        ...prev,
        verifiedFields: Array.from(verified),
      };
    });
  };

  const isFieldAiUnverified = (fieldKey: string): boolean => {
    if (!app) return false;
    return (
      (app.aiFilledFields || []).includes(fieldKey) &&
      !(app.verifiedFields || []).includes(fieldKey)
    );
  };

  const isFieldNeedsCheck = (fieldKey: string): boolean => {
    return Boolean(app?.aiCheckWarningFields?.includes(fieldKey));
  };

  const unverifiedAiFields = useMemo(() => {
    if (!app) return [];
    const verifiedSet = new Set(app.verifiedFields || []);
    return (app.aiFilledFields || []).filter((f) => !verifiedSet.has(f));
  }, [app]);

  const handleSelectIntake = async (option: IntakeCardOption) => {
    if (option.isClosed || !currentUser?.uid) return;
    setSaveState('saving');
    try {
      const canonicalUniId = uni?.id || bundle?.university.id || universityId;
      const profile = await fetchUserApplicationProfile(currentUser.uid);

      // If user already has a draft for this university & exact intake+degree, resume it;
      // if they had a draft for a different intake/degree, create or switch cleanly without duplicating
      if (
        app &&
        app.status === 'draft' &&
        app.intake === option.intakeLabel &&
        app.degreeLevel === option.degreeLevel
      ) {
        const updated: SmartApplicationRecord = {
          ...app,
          round: option.round,
          intakeStartDate: option.semesterStartDate,
          applicationDeadline: option.deadlineDate,
          program: {
            ...app.program,
            degreeLevel: option.degreeLevel,
            round: option.round,
          },
        };
        setApp(updated);
        await saveSmartApplicationDraft(updated);
        setSaveState('saved');
        setStep(1);
        return;
      }

      const draft = await createSmartApplicationDraft({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        universityId: canonicalUniId,
        universityName,
        universityLogoUrl,
        intake: option.intakeLabel,
        intakeStartDate: option.semesterStartDate,
        applicationDeadline: option.deadlineDate,
        degreeLevel: option.degreeLevel,
        round: option.round,
        prefillProfile: profile,
      });

      setApp(draft);
      latestAppRef.current = draft;
      setSaveState('saved');
      setStep(1);
    } catch (err: any) {
      setSaveState('error');
      showToast(err?.message || 'Could not start application draft.');
    }
  };

  // Update personal field & mark verified if user edited it
  const setPersonalField = (
    field: keyof SmartApplicationRecord['personal'],
    value: string
  ) => {
    const key = `personal.${field}`;
    updateApp((prev) => {
      const nextVerified = new Set(prev.verifiedFields || []);
      if ((prev.aiFilledFields || []).includes(key)) {
        nextVerified.add(key);
      }
      return {
        ...prev,
        personal: { ...prev.personal, [field]: value },
        verifiedFields: Array.from(nextVerified),
      };
    });
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const setEducationField = (
    field: keyof SmartApplicationRecord['education'],
    value: any
  ) => {
    const key = `education.${String(field)}`;
    updateApp((prev) => {
      const nextVerified = new Set(prev.verifiedFields || []);
      if ((prev.aiFilledFields || []).includes(key)) {
        nextVerified.add(key);
      }
      return {
        ...prev,
        education: { ...prev.education, [field]: value },
        verifiedFields: Array.from(nextVerified),
      };
    });
  };

  const setLanguageField = (
    field: keyof SmartApplicationRecord['language'],
    value: string
  ) => {
    const key = `language.${field}`;
    updateApp((prev) => {
      const nextVerified = new Set(prev.verifiedFields || []);
      if ((prev.aiFilledFields || []).includes(key)) {
        nextVerified.add(key);
      }
      return {
        ...prev,
        language: { ...prev.language, [field]: value },
        verifiedFields: Array.from(nextVerified),
      };
    });
  };

  // Handle Passport AI auto-fill results
  const handlePassportExtracted = (result: PassportExtractionApiResponse) => {
    if (!result.ok || !result.readable || result.success === false) return;
    const ex = result.extracted;
    const canonical = result.data;

    updateApp((prev) => {
      const aiFields = new Set(prev.aiFilledFields || []);
      const verified = new Set(prev.verifiedFields || []);
      const checkWarn = new Set(prev.aiCheckWarningFields || []);
      const nextPersonal = { ...prev.personal };

      const applyField = (
        prop: keyof SmartApplicationRecord['personal'],
        val?: string
      ) => {
        if (!val) return;
        (nextPersonal as any)[prop] = val;
        const fieldKey = `personal.${prop}`;
        aiFields.add(fieldKey);
        verified.delete(fieldKey); // Requires explicit user verification
      };

      applyField('surname', canonical?.surname || ex.surname);
      applyField('givenNames', canonical?.givenNames || ex.givenNames);
      applyField('gender', canonical?.gender || ex.sex);
      applyField('dateOfBirth', canonical?.dateOfBirth || ex.dateOfBirth);
      applyField('nationality', canonical?.nationality || ex.nationalityName || ex.nationalityIso3);
      if (ex.nationalityIso3) nextPersonal.nationalityCode = ex.nationalityIso3;
      applyField('passportNumber', canonical?.passportNumber || ex.passportNumber);
      applyField('passportExpiryDate', canonical?.passportExpiryDate || ex.expiryDate);
      applyField('passportIssueDate', canonical?.passportIssueDate || ex.issueDate);
      applyField('placeOfBirth', canonical?.placeOfBirth || ex.placeOfBirth);

      for (const f of result.needsCheckFields || []) {
        checkWarn.add(f);
      }

      const aiPassportSnapshot = {
        extractedAt: new Date().toISOString(),
        trustedSource: result.trustedSource,
        surname: ex.surname || '',
        givenNames: ex.givenNames || '',
        passportNumber: ex.passportNumber || '',
        nationality: ex.nationalityName || ex.nationalityIso3 || '',
        nationalityIso3: ex.nationalityIso3 || '',
        dateOfBirth: ex.dateOfBirth || '',
        gender: ex.sex || '',
        expiryDate: ex.expiryDate || '',
        issueDate: ex.issueDate || '',
        placeOfBirth: ex.placeOfBirth || '',
        mrzLine1: ex.mrzLine1 || '',
        mrzLine2: ex.mrzLine2 || '',
        mrzHasMrz: Boolean(result.mrzValidation?.hasMrz),
        mrzIsValid: Boolean(result.mrzValidation?.isValid),
        mrzPassportCheckPassed: Boolean(result.mrzValidation?.passportCheckPassed),
        mrzDobCheckPassed: Boolean(result.mrzValidation?.dobCheckPassed),
        mrzExpiryCheckPassed: Boolean(result.mrzValidation?.expiryCheckPassed),
        mrzCompositeCheckPassed: Boolean(result.mrzValidation?.compositeCheckPassed),
        mrzWarnings: Array.isArray(result.mrzValidation?.warnings)
          ? result.mrzValidation.warnings.slice(0, 10)
          : [],
      };

      return {
        ...prev,
        personal: nextPersonal,
        aiFilledFields: Array.from(aiFields),
        verifiedFields: Array.from(verified),
        aiCheckWarningFields: Array.from(checkWarn),
        aiPassportSnapshot,
      };
    });
  };

  const handleTranscriptExtracted = (data: SmartUploadTranscriptAutoFill) => {
    updateApp((prev) => {
      const aiFields = new Set(prev.aiFilledFields || []);
      const verified = new Set(prev.verifiedFields || []);
      const nextEdu = { ...prev.education };

      if (data.institutionName && !nextEdu.institutionName) {
        nextEdu.institutionName = data.institutionName;
        aiFields.add('education.institutionName');
        verified.delete('education.institutionName');
      }
      if (data.gpa && !nextEdu.gpa) {
        nextEdu.gpa = data.gpa;
        aiFields.add('education.gpa');
        verified.delete('education.gpa');
      }
      if (data.gpaScale) {
        nextEdu.gpaScale = data.gpaScale;
        aiFields.add('education.gpaScale');
        verified.delete('education.gpaScale');
      }
      if (data.country && !nextEdu.country) {
        nextEdu.country = data.country;
        aiFields.add('education.country');
        verified.delete('education.country');
      }

      return {
        ...prev,
        education: nextEdu,
        aiFilledFields: Array.from(aiFields),
        verifiedFields: Array.from(verified),
      };
    });
  };

  const handleLanguageExtracted = (data: SmartUploadLanguageAutoFill) => {
    updateApp((prev) => {
      const aiFields = new Set(prev.aiFilledFields || []);
      const verified = new Set(prev.verifiedFields || []);
      const nextLang = { ...prev.language };

      if (data.testType === 'TOPIK' && data.score) {
        const levelNum = data.score.match(/[1-6]/)?.[0];
        if (levelNum) {
          nextLang.topikLevel = `TOPIK ${levelNum}` as any;
          aiFields.add('language.topikLevel');
          verified.delete('language.topikLevel');
        }
      } else if (
        data.testType === 'IELTS' ||
        data.testType === 'TOEFL' ||
        data.testType === 'Duolingo'
      ) {
        nextLang.englishTestType = data.testType;
        aiFields.add('language.englishTestType');
        verified.delete('language.englishTestType');
        if (data.score) {
          nextLang.englishTestScore = data.score;
          aiFields.add('language.englishTestScore');
          verified.delete('language.englishTestScore');
        }
        if (data.testDate) {
          nextLang.englishTestDate = data.testDate;
          aiFields.add('language.englishTestDate');
          verified.delete('language.englishTestDate');
        }
      }

      return {
        ...prev,
        language: nextLang,
        aiFilledFields: Array.from(aiFields),
        verifiedFields: Array.from(verified),
      };
    });
  };

  // Upload a single file directly to a checklist requirement card
  const handleChecklistUpload = async (
    requirement: ChecklistRequirementItem,
    file: File
  ): Promise<boolean> => {
    if (!app || !currentUser?.uid || isReadOnly) return false;
    if (!isAcceptedApplicationFile(file)) {
      showToast('Unsupported file type. Use PDF, JPG, PNG, HEIC, or ZIP.');
      return false;
    }
    if (file.size > MAX_APPLICATION_FILE_BYTES) {
      showToast('File is larger than 20 MB. Please upload a smaller file.');
      return false;
    }

    setUploadingDocType(requirement.docType);
    try {
      const prepared = await prepareDocumentForUploadAndAnalysis(file, requirement.docType, {
        includeAnalysisPayload: false,
      });
      if (!prepared.valid) {
        showToast(prepared.error || 'Unsupported or invalid document file.');
        return false;
      }

      const uploaded = await uploadSmartApplicationDocument({
        userId: currentUser.uid,
        applicationId: app.id,
        docType: requirement.docType,
        file: prepared.uploadFile,
        label: requirement.label,
        aiDetected: false,
        verified: true,
        qualityWarnings: prepared.quality.warnings,
        requiredDocTypes: checklistInfo.items.map((c) => c.docType),
        syncFirestoreMetadata: true,
      });

      updateApp((prev) => ({
        ...prev,
        documents: {
          ...(prev.documents || {}),
          [requirement.docType]: mergeDocumentWithVersionHistory(
            prev.documents?.[requirement.docType],
            uploaded
          ),
        },
        requiredDocTypes: checklistInfo.items.map((c) => c.docType),
      }));

      if (prepared.quality.warnings.length > 0) {
        showToast(`Uploaded with notice: ${prepared.quality.warnings[0]}`);
      } else {
        showToast(`${requirement.label} uploaded.`);
      }
      return true;
    } catch (err: any) {
      if (err instanceof SmartApplicationServiceError && err.uploadedItem) {
        updateApp((prev) => ({
          ...prev,
          documents: {
            ...(prev.documents || {}),
            [requirement.docType]: mergeDocumentWithVersionHistory(
              prev.documents?.[requirement.docType],
              err.uploadedItem!
            ),
          },
          requiredDocTypes: checklistInfo.items.map((c) => c.docType),
        }));
      }
      const codePrefix =
        err instanceof SmartApplicationServiceError && err.storageErrorCode
          ? `[${err.storageErrorCode}] `
          : '';
      showToast(`${codePrefix}${err?.message || 'Upload failed. Please try again.'}`);
      return false;
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleAssignUnassignedFile = async (unassignedId: string, targetDocType: string) => {
    const found = unassignedFiles.find((u) => u.id === unassignedId);
    const req = checklistInfo.items.find((c) => c.docType === targetDocType);
    if (!found || !req) return;
    const succeeded = await handleChecklistUpload(req, found.file);
    if (succeeded) {
      setUnassignedFiles((prev) => prev.filter((u) => u.id !== unassignedId));
    }
  };

  const handleDeleteDocument = async (docType: string) => {
    if (!app || isReadOnly) return;
    const existing = app.documents?.[docType];
    if (!existing) return;
    await deleteSmartApplicationStorageFile(existing, app.id);
    updateApp((prev) => {
      const nextDocs = { ...(prev.documents || {}) };
      delete nextDocs[docType];
      return { ...prev, documents: nextDocs };
    });
    showToast('Document removed.');
  };

  const closePreviewModal = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewDoc(null);
  };

  const handleOpenPreview = async (item: SmartApplicationDocumentItem, label: string) => {
    try {
      const { url, isObjectUrl } = await fetchPrivateDocumentBlobUrl(
        item.storagePath,
        item.downloadUrl
      );
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      if (isObjectUrl) {
        previewObjectUrlRef.current = url;
      }
      setPreviewDoc({
        label,
        fileName: item.fileName,
        mimeType: item.mimeType,
        url,
        isObjectUrl,
      });
    } catch {
      showToast('Could not load private document preview.');
    }
  };

  // Available reusable docs not yet attached to current application
  const availableReusableDocs = useMemo(() => {
    if (!app || reuseBannerDismissed) return [];
    return checklistInfo.items
      .filter((c) => !app.documents?.[c.docType] && reusableDocs[c.docType])
      .map((c) => ({ requirement: c, doc: reusableDocs[c.docType] }));
  }, [app, checklistInfo.items, reusableDocs, reuseBannerDismissed]);

  const handleReusePreviousDocuments = () => {
    if (!app || availableReusableDocs.length === 0) return;
    updateApp((prev) => {
      const nextDocs = { ...(prev.documents || {}) };
      for (const { requirement, doc } of availableReusableDocs) {
        nextDocs[requirement.docType] = {
          ...doc,
          docType: requirement.docType,
          label: requirement.label,
        };
      }
      return { ...prev, documents: nextDocs };
    });
    setReuseBannerDismissed(true);
    showToast(
      `Reused ${availableReusableDocs.length} document${
        availableReusableDocs.length === 1 ? '' : 's'
      } from your previous application.`
    );
  };

  // Per-step inline validation
  const validateStep = (targetStep: number): boolean => {
    if (!app) return false;
    const errors: Record<string, string> = {};

    if (targetStep === 1) {
      const p = app.personal;
      if (!p.surname.trim()) errors['personal.surname'] = 'Surname is required.';
      if (!p.givenNames.trim()) errors['personal.givenNames'] = 'Given names are required.';
      if (!p.gender) errors['personal.gender'] = 'Please select gender.';
      if (!p.dateOfBirth) errors['personal.dateOfBirth'] = 'Date of birth is required.';
      if (!p.nationality.trim()) errors['personal.nationality'] = 'Nationality is required.';
      if (!p.passportNumber.trim()) errors['personal.passportNumber'] = 'Passport number is required.';
      if (!p.passportExpiryDate) errors['personal.passportExpiryDate'] = 'Passport expiry date is required.';
      if (p.passportIssueDate && p.passportExpiryDate && p.passportIssueDate >= p.passportExpiryDate) {
        errors['personal.passportExpiryDate'] = 'Expiry date must be after issue date.';
      }
      if (!p.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) {
        errors['personal.email'] = 'Please enter a valid email address.';
      }
      if (!p.phoneNumber.trim() || p.phoneNumber.replace(/\D/g, '').length < 6) {
        errors['personal.phoneNumber'] = 'Please enter a valid phone number.';
      }
      if (!p.currentAddress.trim()) errors['personal.currentAddress'] = 'Current address is required.';
      if (!p.emergencyContactName.trim()) {
        errors['personal.emergencyContactName'] = 'Emergency contact name is required.';
      }
      if (!p.emergencyContactPhone.trim()) {
        errors['personal.emergencyContactPhone'] = 'Emergency contact phone is required.';
      }
    }

    if (targetStep === 2) {
      const e = app.education;
      if (!e.highestLevel.trim()) errors['education.highestLevel'] = 'Highest level is required.';
      if (!e.institutionName.trim()) errors['education.institutionName'] = 'Institution name is required.';
      if (!e.country.trim()) errors['education.country'] = 'Country is required.';
      if (!e.startYear.trim()) errors['education.startYear'] = 'Start year is required.';
      if (!e.endYear.trim()) errors['education.endYear'] = 'End / expected year is required.';
      if (
        e.startYear &&
        e.endYear &&
        Number(e.endYear) < Number(e.startYear)
      ) {
        errors['education.endYear'] = 'End year must be on or after start year.';
      }
    }

    if (targetStep === 4) {
      if (!app.program.desiredMajor.trim()) {
        errors['program.desiredMajor'] = 'Please choose or enter your desired major/department.';
      }
    }

    if (targetStep === 5) {
      if (!app.finance.sponsorType) {
        errors['finance.sponsorType'] = 'Please select a financial sponsor.';
      }
      if (app.finance.sponsorType !== 'self' && !app.finance.sponsorName.trim()) {
        errors['finance.sponsorName'] = 'Sponsor name is required.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (step > 0 && step < 7 && !validateStep(step)) {
      showToast('Please fix the highlighted fields before continuing.');
      return;
    }
    setStep((s) => Math.min(7, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitFinal = async () => {
    if (!app || !currentUser || isReadOnly) return;

    // Validate all required steps
    for (const s of [1, 2, 4, 5]) {
      if (!validateStep(s)) {
        setStep(s);
        showToast('Please complete all required fields before submitting.');
        return;
      }
    }

    if (unverifiedAiFields.length > 0) {
      showToast('Please verify all AI-filled fields before submitting.');
      return;
    }

    const requiresAiConsent = (app.aiFilledFields || []).length > 0;
    if (!app.consent?.dataProcessing || (requiresAiConsent && !app.consent?.aiProcessing)) {
      showToast(
        requiresAiConsent
          ? 'Please accept both privacy and AI verification consent checkboxes.'
          : 'Please accept the required privacy and submission consent checkbox.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const submitted = await submitSmartApplication({
        app: {
          ...app,
          requiredDocTypes: checklistInfo.items.map((c) => c.docType),
        },
        actorName:
          `${app.personal.givenNames} ${app.personal.surname}`.trim() || currentUser.name,
        actorEmail: currentUser.email,
        isResubmission: app.status === 'documents_missing',
      });
      setApp(submitted);
      latestAppRef.current = submitted;
      isDirtyRef.current = false;
      showToast('Application submitted successfully!');
      navigate('/my-applications');
    } catch (err: any) {
      showToast(err?.message || 'Could not submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Document readiness count
  const docProgress = useMemo(() => {
    const total = checklistInfo.items.length;
    const ready = checklistInfo.items.filter((c) => Boolean(app?.documents?.[c.docType])).length;
    return { ready, total };
  }, [checklistInfo.items, app?.documents]);

  // Passport 6-month validity warning (non-blocking)
  const passportValidityWarning = useMemo(() => {
    if (!app?.personal.passportExpiryDate) return false;
    return !isPassportValidSixMonthsAfter(
      app.personal.passportExpiryDate,
      app.intakeStartDate
    );
  }, [app?.personal.passportExpiryDate, app?.intakeStartDate]);

  // Helper to render Gold AI Verification chip on any field
  const renderAiChip = (fieldKey: string) => {
    if (!isFieldAiUnverified(fieldKey)) return null;
    const needsCheck = isFieldNeedsCheck(fieldKey);
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
            needsCheck
              ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
              : 'bg-[#D6B875]/25 text-[#7A5B14] border-[#D6B875]/60 dark:bg-[#D6B875]/20 dark:text-[#F3DC9F]'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>{needsCheck ? 'AI filled — please check MRZ' : 'AI filled — please verify'}</span>
        </span>
        <button
          type="button"
          onClick={() => markFieldVerified(fieldKey)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer"
        >
          <Check className="w-3 h-3" />
          <span>Looks correct</span>
        </button>
      </div>
    );
  };

  // Loading Skeleton
  if (loading) {
    return (
      <section className="min-h-screen bg-[#F4F8FD] dark:bg-[#081426] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="h-24 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10" />
          <div className="h-14 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10" />
          <div className="h-96 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10" />
        </div>
      </section>
    );
  }

  // Error state
  if (loadError) {
    const redirectTarget = encodeURIComponent(`${location.pathname}${location.search || ''}`);
    return (
      <section className="min-h-screen bg-[#F4F8FD] dark:bg-[#081426] py-12 px-4">
        <div className="max-w-xl mx-auto ekr-glass-panel rounded-2xl p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-extrabold text-[#081426] dark:text-white">
            Unable to Load Application
          </h2>
          <p className="text-sm text-[#526685] dark:text-[#B8C9E5]">{loadError}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {(loadErrorCode === 'firebase-auth-missing' ||
              loadErrorCode === 'firestore-permission-denied') && (
              <button
                type="button"
                onClick={() => navigate(`/login?redirect=${redirectTarget}`)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#081426] dark:bg-[#D6B875] text-white dark:text-[#081426] cursor-pointer"
              >
                Sign In Again
              </button>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] text-white cursor-pointer"
            >
              Try Again
            </button>
            <Link
              to={`/universities/${universitySlug}`}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 text-[#081426] dark:text-white"
            >
              Back to University
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const inputBase =
    'w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B] px-3.5 py-2.5 text-sm text-[#081426] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] disabled:opacity-60';

  return (
    <section className="min-h-screen bg-[#F5F8FD] dark:bg-[#061536] pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top University & Auto-Save Header */}
        <div className="ekr-glass-panel rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-[#061B49] via-[#0B2C6F] to-[#0754B8] px-5 py-4 sm:px-6 sm:py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow">
                {universityLogoUrl ? (
                  <img
                    src={universityLogoUrl}
                    alt={universityName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-[#061B49]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#93C5FD] uppercase tracking-wider">
                  <span>EVERYKR Smart Application</span>
                  {app?.intake && (
                    <>
                      <span>•</span>
                      <span className="truncate">{app.intake}</span>
                    </>
                  )}
                </div>
                <h1 className="text-base sm:text-xl font-extrabold truncate tracking-tight">
                  {universityName}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Auto-save indicator */}
              {app && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 border border-white/15">
                  {saveState === 'saving' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#93C5FD]" />
                      <span>Saving…</span>
                    </>
                  ) : saveState === 'error' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                      <span>Save failed</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Saved</span>
                    </>
                  )}
                </span>
              )}

              {officialPortalUrl && (
                <a
                  href={officialPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                >
                  <span>Official Admissions Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <Link
                to="/my-applications"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#061B49] hover:bg-[#FFB800] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>My Applications</span>
              </Link>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="px-4 py-3 sm:px-6 bg-white dark:bg-[#0B1D44] border-t border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {WIZARD_STEPS.map((s) => {
                const Icon = s.icon;
                const isActive = step === s.id;
                const isCompleted = step > s.id && Boolean(app);
                const canJump = s.id === 0 || Boolean(app);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!canJump}
                    onClick={() => canJump && setStep(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-[#0754B8] text-white shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100'
                        : 'text-[#4B607F] dark:text-[#93A9CB] hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {s.id}. {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Read-only notice if already submitted */}
        {isReadOnly && app && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-blue-900 dark:text-blue-200">
              <ShieldCheck className="w-5 h-5 shrink-0 text-[#2563EB]" />
              <span>
                This application is currently <strong>{app.status.replace(/_/g, ' ')}</strong> and
                locked from editing while under admissions review.
              </span>
            </div>
            <Link
              to="/my-applications"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2563EB] text-white shrink-0"
            >
              Track Status
            </Link>
          </div>
        )}

        {/* Documents Missing banner */}
        {app?.status === 'documents_missing' && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Additional Documents Requested by Admissions</span>
            </div>
            {app.requestedDocumentsMessage && (
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                {app.requestedDocumentsMessage}
              </p>
            )}
            {app.requestedDocuments && app.requestedDocuments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {app.requestedDocuments.map((rd) => (
                  <span
                    key={rd.docType}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-[#081426] text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                  >
                    {rd.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* MAIN STEP CONTAINER                                              */}
        {/* ================================================================ */}
        <div className="ekr-glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-8 shadow-sm">
          {/* STEP 0: CHOOSE INTAKE */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#081426] dark:text-white">
                  Step 0 — Choose Your Admission Intake & Degree
                </h2>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                  Intakes are loaded directly from {universityName}’s verified Deadlines schedule.
                  Closed rounds are disabled; unannounced cycles can still be started as a draft.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {intakeOptions.map((opt) => {
                  const isCurrent =
                    app?.intake === opt.intakeLabel &&
                    app?.degreeLevel === opt.degreeLevel &&
                    app?.round === opt.round;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={opt.isClosed}
                      onClick={() => handleSelectIntake(opt)}
                      className={`text-left rounded-2xl p-5 border transition-all flex flex-col justify-between gap-3 ${
                        opt.isClosed
                          ? 'bg-slate-100/70 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 opacity-60 cursor-not-allowed'
                          : isCurrent
                          ? 'bg-blue-50/70 dark:bg-[#2563EB]/15 border-[#2563EB] ring-2 ring-[#2563EB]/25 cursor-pointer'
                          : 'bg-white dark:bg-[#0B172B] border-slate-200 dark:border-white/15 hover:border-[#2563EB] hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#4BA3FF]">
                            {opt.degreeLabel}
                          </span>
                          <h3 className="text-base font-extrabold text-[#081426] dark:text-white">
                            {opt.intakeLabel}
                          </h3>
                          <p className="text-xs font-semibold text-[#526685] dark:text-[#93A9CB]">
                            {opt.roundLabel}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 ${
                            opt.isClosed
                              ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : opt.isNotAnnounced
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {opt.statusLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/10 text-xs text-[#526685] dark:text-[#B8C9E5]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#4BA3FF]" />
                          {opt.deadlineDate
                            ? `Deadline: ${opt.deadlineDate}`
                            : 'Dates not confirmed yet'}
                        </span>
                        {!opt.isClosed && (
                          <span className="inline-flex items-center gap-1 font-bold text-[#2563EB] dark:text-[#4BA3FF]">
                            {isCurrent ? 'Continue Draft' : 'Select'}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 1: PERSONAL INFORMATION */}
          {step === 1 && app && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#081426] dark:text-white">
                  Step 1 — Personal Information
                </h2>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                  Enter your details exactly as printed on your passport. Or scan your passport below
                  to auto-fill and verify.
                </p>
              </div>

              {!isReadOnly && currentUser?.uid && (
                <SmartUploadDropzone
                  mode="passport_primary"
                  userId={currentUser.uid}
                  applicationId={app.id}
                  checklistItems={checklistInfo.items}
                  disabled={isReadOnly}
                  aiConsentGranted={Boolean(app.consent?.aiProcessing)}
                  onAiConsentChange={(granted) =>
                    updateApp((prev) => ({
                      ...prev,
                      consent: {
                        ...prev.consent,
                        aiProcessing: granted,
                        aiConsentedAt: granted ? new Date().toISOString() : '',
                        consentedByUid: granted ? currentUser.uid : prev.consent?.consentedByUid,
                      },
                    }))
                  }
                  unassignedFiles={unassignedFiles}
                  onUnassignedFilesChange={setUnassignedFiles}
                  onDocumentUploaded={(docType, item) =>
                    updateApp((prev) => ({
                      ...prev,
                      documents: {
                        ...(prev.documents || {}),
                        [docType]: mergeDocumentWithVersionHistory(prev.documents?.[docType], item),
                      },
                    }))
                  }
                  onPassportExtracted={handlePassportExtracted}
                  onTranscriptExtracted={handleTranscriptExtracted}
                  onLanguageExtracted={handleLanguageExtracted}
                  onAssignUnassignedFile={handleAssignUnassignedFile}
                />
              )}

              {passportValidityWarning && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Passport validity notice:</strong> Your passport expires less than 6
                    months after the expected intake start date. Korean visa applications normally
                    require at least 6 months remaining validity. You can still proceed, but plan to
                    renew your passport soon.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Surname (exact passport match) *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.personal.surname}
                    onChange={(e) => setPersonalField('surname', e.target.value)}
                    placeholder="e.g. RAHMAN"
                    className={inputBase}
                  />
                  {renderAiChip('personal.surname')}
                  {validationErrors['personal.surname'] && (
                    <p className="mt-1 text-xs text-rose-600">{validationErrors['personal.surname']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Given Names (exact passport match) *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.personal.givenNames}
                    onChange={(e) => setPersonalField('givenNames', e.target.value)}
                    placeholder="e.g. MD TANVIR"
                    className={inputBase}
                  />
                  {renderAiChip('personal.givenNames')}
                  {validationErrors['personal.givenNames'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['personal.givenNames']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Gender *
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={app.personal.gender}
                    onChange={(e) => setPersonalField('gender', e.target.value)}
                    className={inputBase}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {renderAiChip('personal.gender')}
                  {validationErrors['personal.gender'] && (
                    <p className="mt-1 text-xs text-rose-600">{validationErrors['personal.gender']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={app.personal.dateOfBirth}
                    onChange={(e) => setPersonalField('dateOfBirth', e.target.value)}
                    className={inputBase}
                  />
                  {renderAiChip('personal.dateOfBirth')}
                  {validationErrors['personal.dateOfBirth'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['personal.dateOfBirth']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Nationality *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.personal.nationality}
                    onChange={(e) => setPersonalField('nationality', e.target.value)}
                    placeholder="e.g. Bangladesh"
                    className={inputBase}
                  />
                  {renderAiChip('personal.nationality')}
                  {validationErrors['personal.nationality'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['personal.nationality']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Passport Number *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.personal.passportNumber}
                    onChange={(e) => setPersonalField('passportNumber', e.target.value.toUpperCase())}
                    placeholder="e.g. A12345678"
                    className={inputBase}
                  />
                  {renderAiChip('personal.passportNumber')}
                  {validationErrors['personal.passportNumber'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['personal.passportNumber']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Passport Issue Date
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={app.personal.passportIssueDate}
                    onChange={(e) => setPersonalField('passportIssueDate', e.target.value)}
                    className={inputBase}
                  />
                  {renderAiChip('personal.passportIssueDate')}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Passport Expiry Date *
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={app.personal.passportExpiryDate}
                    onChange={(e) => setPersonalField('passportExpiryDate', e.target.value)}
                    className={inputBase}
                  />
                  {renderAiChip('personal.passportExpiryDate')}
                  {validationErrors['personal.passportExpiryDate'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['personal.passportExpiryDate']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Place of Birth
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.personal.placeOfBirth}
                    onChange={(e) => setPersonalField('placeOfBirth', e.target.value)}
                    placeholder="City / Country"
                    className={inputBase}
                  />
                  {renderAiChip('personal.placeOfBirth')}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    disabled={isReadOnly}
                    value={app.personal.email}
                    onChange={(e) => setPersonalField('email', e.target.value)}
                    className={inputBase}
                  />
                  {validationErrors['personal.email'] && (
                    <p className="mt-1 text-xs text-rose-600">{validationErrors['personal.email']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Phone Number (with country code) *
                  </label>
                  <div className="flex gap-2">
                    <select
                      disabled={isReadOnly}
                      value={app.personal.phoneCountryCode}
                      onChange={(e) => setPersonalField('phoneCountryCode', e.target.value)}
                      className="w-24 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B] px-2.5 py-2.5 text-sm text-[#081426] dark:text-white"
                    >
                      {PHONE_COUNTRY_CODES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      disabled={isReadOnly}
                      value={app.personal.phoneNumber}
                      onChange={(e) => setPersonalField('phoneNumber', e.target.value)}
                      placeholder="10-1234-5678"
                      className={inputBase}
                    />
                  </div>
                  {validationErrors['personal.phoneNumber'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['personal.phoneNumber']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Current Country of Residence
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.personal.currentCountry || ''}
                    onChange={(e) => setPersonalField('currentCountry', e.target.value)}
                    placeholder={app.personal.nationality || 'e.g. Bangladesh, Nepal, South Korea'}
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Current Residential Address *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.personal.currentAddress}
                    onChange={(e) => setPersonalField('currentAddress', e.target.value)}
                    placeholder="Street, City, Postal Code, Country"
                    className={inputBase}
                  />
                  {validationErrors['personal.currentAddress'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['personal.currentAddress']}
                    </p>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-3">
                <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={app.personal.emergencyContactName}
                      onChange={(e) => setPersonalField('emergencyContactName', e.target.value)}
                      placeholder="Full name"
                      className={inputBase}
                    />
                    {validationErrors['personal.emergencyContactName'] && (
                      <p className="mt-1 text-xs text-rose-600">
                        {validationErrors['personal.emergencyContactName']}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      Relationship
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={app.personal.emergencyContactRelation}
                      onChange={(e) => setPersonalField('emergencyContactRelation', e.target.value)}
                      placeholder="e.g. Father / Mother / Sibling"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      disabled={isReadOnly}
                      value={app.personal.emergencyContactPhone}
                      onChange={(e) => setPersonalField('emergencyContactPhone', e.target.value)}
                      placeholder="+880 ..."
                      className={inputBase}
                    />
                    {validationErrors['personal.emergencyContactPhone'] && (
                      <p className="mt-1 text-xs text-rose-600">
                        {validationErrors['personal.emergencyContactPhone']}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EDUCATION */}
          {step === 2 && app && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#081426] dark:text-white">
                  Step 2 — Education Background
                </h2>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                  Enter your highest completed academic qualification and any previous degrees.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Highest Completed Level *
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={app.education.highestLevel}
                    onChange={(e) => setEducationField('highestLevel', e.target.value)}
                    className={inputBase}
                  >
                    <option value="High School / Secondary">High School / Secondary</option>
                    <option value="Associate / Diploma">Associate / Diploma</option>
                    <option value="Bachelor's Degree">Bachelor’s Degree</option>
                    <option value="Master's Degree">Master’s Degree</option>
                    <option value="PhD / Doctorate">PhD / Doctorate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Institution Name *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.education.institutionName}
                    onChange={(e) => setEducationField('institutionName', e.target.value)}
                    placeholder="School / College / University name"
                    className={inputBase}
                  />
                  {renderAiChip('education.institutionName')}
                  {validationErrors['education.institutionName'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['education.institutionName']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Country of Institution *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.education.country}
                    onChange={(e) => setEducationField('country', e.target.value)}
                    placeholder="e.g. Bangladesh"
                    className={inputBase}
                  />
                  {renderAiChip('education.country')}
                  {validationErrors['education.country'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['education.country']}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      Start Year *
                    </label>
                    <input
                      type="number"
                      min={1980}
                      max={2035}
                      disabled={isReadOnly}
                      value={app.education.startYear}
                      onChange={(e) => setEducationField('startYear', e.target.value)}
                      placeholder="2020"
                      className={inputBase}
                    />
                    {validationErrors['education.startYear'] && (
                      <p className="mt-1 text-xs text-rose-600">
                        {validationErrors['education.startYear']}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      End / Graduation Year *
                    </label>
                    <input
                      type="number"
                      min={1980}
                      max={2035}
                      disabled={isReadOnly}
                      value={app.education.endYear}
                      onChange={(e) => setEducationField('endYear', e.target.value)}
                      placeholder="2024"
                      className={inputBase}
                    />
                    {validationErrors['education.endYear'] && (
                      <p className="mt-1 text-xs text-rose-600">
                        {validationErrors['education.endYear']}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      GPA / CGPA
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={app.education.gpa}
                      onChange={(e) => setEducationField('gpa', e.target.value)}
                      placeholder="e.g. 3.65"
                      className={inputBase}
                    />
                    {renderAiChip('education.gpa')}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      Scale
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={app.education.gpaScale}
                      onChange={(e) => setEducationField('gpaScale', e.target.value)}
                      placeholder="e.g. 4.0 / 5.0 / 100"
                      className={inputBase}
                    />
                    {renderAiChip('education.gpaScale')}
                  </div>
                </div>
              </div>

              {/* Previous Degrees (Repeatable) */}
              <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                    Previous Degrees / Schools (Optional)
                  </h3>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setEducationField('previousDegrees', [
                          ...(app.education.previousDegrees || []),
                          {
                            id: `deg_${Date.now()}`,
                            level: 'High School',
                            institutionName: '',
                            country: '',
                            startYear: '',
                            endYear: '',
                            gpa: '',
                            gpaScale: '4.0',
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#2563EB]/10 text-[#2563EB] dark:text-[#4BA3FF] hover:bg-[#2563EB]/20 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Previous Degree</span>
                    </button>
                  )}
                </div>

                {(app.education.previousDegrees || []).map((deg, idx) => (
                  <div
                    key={deg.id}
                    className="rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-white/[0.03] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#526685] dark:text-[#B8C9E5]">
                        Previous Education #{idx + 1}
                      </span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            setEducationField(
                              'previousDegrees',
                              app.education.previousDegrees.filter((d) => d.id !== deg.id)
                            )
                          }
                          className="text-xs font-semibold text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={deg.level}
                        onChange={(e) => {
                          const next = [...app.education.previousDegrees];
                          next[idx] = { ...deg, level: e.target.value };
                          setEducationField('previousDegrees', next);
                        }}
                        placeholder="Degree Level"
                        className={inputBase}
                      />
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={deg.institutionName}
                        onChange={(e) => {
                          const next = [...app.education.previousDegrees];
                          next[idx] = { ...deg, institutionName: e.target.value };
                          setEducationField('previousDegrees', next);
                        }}
                        placeholder="Institution Name"
                        className={inputBase}
                      />
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={deg.country}
                        onChange={(e) => {
                          const next = [...app.education.previousDegrees];
                          next[idx] = { ...deg, country: e.target.value };
                          setEducationField('previousDegrees', next);
                        }}
                        placeholder="Country"
                        className={inputBase}
                      />
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={deg.startYear}
                        onChange={(e) => {
                          const next = [...app.education.previousDegrees];
                          next[idx] = { ...deg, startYear: e.target.value };
                          setEducationField('previousDegrees', next);
                        }}
                        placeholder="Start Year"
                        className={inputBase}
                      />
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={deg.endYear}
                        onChange={(e) => {
                          const next = [...app.education.previousDegrees];
                          next[idx] = { ...deg, endYear: e.target.value };
                          setEducationField('previousDegrees', next);
                        }}
                        placeholder="End Year"
                        className={inputBase}
                      />
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={deg.gpa}
                        onChange={(e) => {
                          const next = [...app.education.previousDegrees];
                          next[idx] = { ...deg, gpa: e.target.value };
                          setEducationField('previousDegrees', next);
                        }}
                        placeholder="GPA / Scale"
                        className={inputBase}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                  Study Gap Explanation (Optional)
                </label>
                <textarea
                  rows={3}
                  disabled={isReadOnly}
                  value={app.education.gapYearsExplanation}
                  onChange={(e) => setEducationField('gapYearsExplanation', e.target.value)}
                  placeholder="If you have a gap of more than 1 year since your last graduation, briefly explain your work or language study."
                  className={inputBase}
                />
              </div>
            </div>
          )}

          {/* STEP 3: LANGUAGE */}
          {step === 3 && app && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#081426] dark:text-white">
                  Step 3 — Language Proficiency
                </h2>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                  Share your Korean (TOPIK) and English test scores if you have them.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    TOPIK Level
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={app.language.topikLevel}
                    onChange={(e) => setLanguageField('topikLevel', e.target.value)}
                    className={inputBase}
                  >
                    <option value="None">None</option>
                    <option value="TOPIK 1">TOPIK Level 1</option>
                    <option value="TOPIK 2">TOPIK Level 2</option>
                    <option value="TOPIK 3">TOPIK Level 3</option>
                    <option value="TOPIK 4">TOPIK Level 4</option>
                    <option value="TOPIK 5">TOPIK Level 5</option>
                    <option value="TOPIK 6">TOPIK Level 6</option>
                  </select>
                  {renderAiChip('language.topikLevel')}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    TOPIK Test Date (Optional)
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly || app.language.topikLevel === 'None'}
                    value={app.language.topikTestDate || ''}
                    onChange={(e) => setLanguageField('topikTestDate', e.target.value)}
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    English Proficiency Test (Optional)
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={app.language.englishTestType}
                    onChange={(e) => setLanguageField('englishTestType', e.target.value)}
                    className={inputBase}
                  >
                    <option value="None">None</option>
                    <option value="IELTS">IELTS</option>
                    <option value="TOEFL">TOEFL iBT</option>
                    <option value="Duolingo">Duolingo English Test</option>
                  </select>
                  {renderAiChip('language.englishTestType')}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      Score
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly || app.language.englishTestType === 'None'}
                      value={app.language.englishTestScore}
                      onChange={(e) => setLanguageField('englishTestScore', e.target.value)}
                      placeholder="e.g. 6.5 / 90"
                      className={inputBase}
                    />
                    {renderAiChip('language.englishTestScore')}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      Test Date
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly || app.language.englishTestType === 'None'}
                      value={app.language.englishTestDate}
                      onChange={(e) => setLanguageField('englishTestDate', e.target.value)}
                      className={inputBase}
                    />
                    {renderAiChip('language.englishTestDate')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                  Korean Language Study History (Optional)
                </label>
                <textarea
                  rows={3}
                  disabled={isReadOnly}
                  value={app.language.koreanStudyHistory}
                  onChange={(e) => setLanguageField('koreanStudyHistory', e.target.value)}
                  placeholder="Mention any Korean language institutes (e.g. King Sejong Institute, university KLP) or self-study duration."
                  className={inputBase}
                />
              </div>
            </div>
          )}

          {/* STEP 4: PROGRAM CHOICE */}
          {step === 4 && app && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#081426] dark:text-white">
                  Step 4 — Program & Major Choice
                </h2>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                  Select your preferred department from {universityName}’s official catalog.
                </p>
              </div>

              <div className="rounded-xl bg-[#F4F8FD] dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-4 flex flex-wrap gap-6 text-xs">
                <div>
                  <span className="text-[#526685] dark:text-[#93A9CB]">Selected Intake</span>
                  <p className="font-extrabold text-[#081426] dark:text-white mt-0.5">
                    {app.intake}
                  </p>
                </div>
                <div>
                  <span className="text-[#526685] dark:text-[#93A9CB]">Degree Level</span>
                  <p className="font-extrabold text-[#081426] dark:text-white mt-0.5">
                    {displayDegreeLabel(app.degreeLevel)}
                  </p>
                </div>
                <div>
                  <span className="text-[#526685] dark:text-[#93A9CB]">Application Round</span>
                  <p className="font-extrabold text-[#081426] dark:text-white mt-0.5">
                    {formatRoundLabel(app.round)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Desired Major / Department *
                  </label>
                  {majorOptions.length > 0 ? (
                    <select
                      disabled={isReadOnly}
                      value={app.program.desiredMajor}
                      onChange={(e) =>
                        updateApp((prev) => ({
                          ...prev,
                          program: { ...prev.program, desiredMajor: e.target.value },
                        }))
                      }
                      className={inputBase}
                    >
                      <option value="">Select a major / department</option>
                      {majorOptions.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} {m.language ? `(${m.language})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={app.program.desiredMajor}
                      onChange={(e) =>
                        updateApp((prev) => ({
                          ...prev,
                          program: { ...prev.program, desiredMajor: e.target.value },
                        }))
                      }
                      placeholder="e.g. Computer Science & Engineering"
                      className={inputBase}
                    />
                  )}
                  {validationErrors['program.desiredMajor'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['program.desiredMajor']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Second Choice Major (Optional)
                  </label>
                  {majorOptions.length > 0 ? (
                    <select
                      disabled={isReadOnly}
                      value={app.program.secondChoiceMajor}
                      onChange={(e) =>
                        updateApp((prev) => ({
                          ...prev,
                          program: { ...prev.program, secondChoiceMajor: e.target.value },
                        }))
                      }
                      className={inputBase}
                    >
                      <option value="">None</option>
                      {majorOptions.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={app.program.secondChoiceMajor}
                      onChange={(e) =>
                        updateApp((prev) => ({
                          ...prev,
                          program: { ...prev.program, secondChoiceMajor: e.target.value },
                        }))
                      }
                      placeholder="Optional second major"
                      className={inputBase}
                    />
                  )}
                </div>
              </div>

              {/* Scholarship Interest linked to university Scholarships tab */}
              <div className="rounded-2xl border border-[#D6B875]/50 bg-[#D6B875]/10 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={app.program.scholarshipInterest}
                      onChange={(e) =>
                        updateApp((prev) => ({
                          ...prev,
                          program: { ...prev.program, scholarshipInterest: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded text-[#2563EB]"
                    />
                    <span className="text-sm font-bold text-[#081426] dark:text-white">
                      I am interested in applying for scholarships at {universityName}
                    </span>
                  </label>
                  <Link
                    to={`/universities/${universitySlug}?tab=scholarships`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] dark:text-[#4BA3FF] hover:underline"
                  >
                    <span>View Scholarships Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {app.program.scholarshipInterest && (bundle?.scholarships?.length || 0) > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                      Target Scholarship (Optional)
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={app.program.preferredScholarshipName || ''}
                      onChange={(e) =>
                        updateApp((prev) => ({
                          ...prev,
                          program: { ...prev.program, preferredScholarshipName: e.target.value },
                        }))
                      }
                      className={inputBase}
                    >
                      <option value="">Consider me for all eligible scholarships</option>
                      {(bundle?.scholarships || []).map((sc) => (
                        <option key={sc.id} value={sc.scholarshipName}>
                          {sc.scholarshipName} — {sc.benefitCoverage}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: FINANCE */}
          {step === 5 && app && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#081426] dark:text-white">
                  Step 5 — Financial Sponsor
                </h2>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                  Information for visa & tuition affordability review (bank balance is informational).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['self', 'parent', 'other'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() =>
                      updateApp((prev) => ({
                        ...prev,
                        finance: {
                          ...prev.finance,
                          sponsorType: type,
                          sponsorRelation:
                            type === 'self'
                              ? 'Self'
                              : type === 'parent'
                              ? prev.finance.sponsorRelation || 'Parent'
                              : prev.finance.sponsorRelation,
                        },
                      }))
                    }
                    className={`rounded-xl border px-4 py-3.5 text-sm font-bold capitalize transition-all cursor-pointer ${
                      app.finance.sponsorType === type
                        ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] dark:text-[#4BA3FF]'
                        : 'border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B] text-[#081426] dark:text-white'
                    }`}
                  >
                    {type === 'self' ? 'Self-Funded' : type === 'parent' ? 'Parent / Guardian' : 'Other Sponsor'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Sponsor Full Name {app.finance.sponsorType !== 'self' ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.finance.sponsorName}
                    onChange={(e) =>
                      updateApp((prev) => ({
                        ...prev,
                        finance: { ...prev.finance, sponsorName: e.target.value },
                      }))
                    }
                    placeholder="Full name as on bank statement"
                    className={inputBase}
                  />
                  {validationErrors['finance.sponsorName'] && (
                    <p className="mt-1 text-xs text-rose-600">
                      {validationErrors['finance.sponsorName']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Relationship to Applicant
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.finance.sponsorRelation}
                    onChange={(e) =>
                      updateApp((prev) => ({
                        ...prev,
                        finance: { ...prev.finance, sponsorRelation: e.target.value },
                      }))
                    }
                    placeholder="e.g. Father, Mother, Self, Organization"
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Available Bank Balance (Optional, Informational)
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={app.finance.bankBalanceAmount}
                    onChange={(e) =>
                      updateApp((prev) => ({
                        ...prev,
                        finance: { ...prev.finance, bankBalanceAmount: e.target.value },
                      }))
                    }
                    placeholder="e.g. 20,000"
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#081426] dark:text-slate-200 mb-1.5">
                    Currency
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={app.finance.bankBalanceCurrency}
                    onChange={(e) =>
                      updateApp((prev) => ({
                        ...prev,
                        finance: { ...prev.finance, bankBalanceCurrency: e.target.value },
                      }))
                    }
                    className={inputBase}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="KRW">KRW (₩)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="BDT">BDT (৳)</option>
                    <option value="NPR">NPR (₨)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: DOCUMENTS CHECKLIST + SMART UPLOAD */}
          {step === 6 && app && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#081426] dark:text-white">
                      Step 6 — Required Documents
                    </h2>
                    {checklistInfo.isGeneralFallback && (
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-[#526685] dark:text-[#B8C9E5]">
                        General requirements
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                    Upload files individually or drop a ZIP archive below to sort and attach them
                    automatically.
                  </p>
                </div>

                {/* Overall progress indicator */}
                <div className="rounded-xl bg-[#F4F8FD] dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 px-4 py-2.5 shrink-0">
                  <p className="text-xs font-extrabold text-[#081426] dark:text-white">
                    {docProgress.ready} of {docProgress.total} documents ready
                  </p>
                  <div className="w-40 h-2 rounded-full bg-slate-200 dark:bg-white/10 mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] transition-all"
                      style={{
                        width: `${Math.round(
                          (docProgress.ready / Math.max(1, docProgress.total)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Prompt user before reusing documents from earlier applications */}
              {!isReadOnly && availableReusableDocs.length > 0 && (
                <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#081426] dark:text-white">
                      Reuse {availableReusableDocs.length} previously uploaded document
                      {availableReusableDocs.length === 1 ? '' : 's'}?
                    </p>
                    <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                      We found matching files from your earlier EVERYKR application (
                      {availableReusableDocs.map((d) => d.requirement.label).join(', ')}).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setReuseBannerDismissed(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#526685] hover:bg-white/70 dark:text-[#B8C9E5] cursor-pointer"
                    >
                      No, upload new
                    </button>
                    <button
                      type="button"
                      onClick={handleReusePreviousDocuments}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
                    >
                      Reuse Documents
                    </button>
                  </div>
                </div>
              )}

              {!isReadOnly && currentUser?.uid && (
                <SmartUploadDropzone
                  mode="documents_primary"
                  userId={currentUser.uid}
                  applicationId={app.id}
                  checklistItems={checklistInfo.items}
                  disabled={isReadOnly}
                  aiConsentGranted={Boolean(app.consent?.aiProcessing)}
                  onAiConsentChange={(granted) =>
                    updateApp((prev) => ({
                      ...prev,
                      consent: {
                        ...prev.consent,
                        aiProcessing: granted,
                        aiConsentedAt: granted ? new Date().toISOString() : '',
                        consentedByUid: granted ? currentUser.uid : prev.consent?.consentedByUid,
                      },
                    }))
                  }
                  unassignedFiles={unassignedFiles}
                  onUnassignedFilesChange={setUnassignedFiles}
                  onDocumentUploaded={(docType, item) =>
                    updateApp((prev) => ({
                      ...prev,
                      documents: {
                        ...(prev.documents || {}),
                        [docType]: mergeDocumentWithVersionHistory(prev.documents?.[docType], item),
                      },
                      requiredDocTypes: checklistInfo.items.map((c) => c.docType),
                    }))
                  }
                  onPassportExtracted={handlePassportExtracted}
                  onTranscriptExtracted={handleTranscriptExtracted}
                  onLanguageExtracted={handleLanguageExtracted}
                  onAssignUnassignedFile={handleAssignUnassignedFile}
                />
              )}

              {/* Checklist Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {checklistInfo.items.map((req) => {
                  const uploaded = app.documents?.[req.docType];
                  const isRequestedMissing = app.requestedDocuments?.some(
                    (r) => r.docType === req.docType
                  );
                  const isUploadingThis = uploadingDocType === req.docType;
                  const statusBadge = !uploaded
                    ? { label: 'Missing', cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300' }
                    : uploaded.needsCheck || (uploaded.qualityWarnings?.length || 0) > 0
                    ? { label: 'Needs check', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200' }
                    : { label: 'Uploaded', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' };

                  return (
                    <div
                      key={req.docType}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverDocType(req.docType);
                      }}
                      onDragLeave={() => setDragOverDocType(null)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragOverDocType(null);
                        const unassignedId = e.dataTransfer.getData('text/everykr-unassigned-id');
                        if (unassignedId) {
                          await handleAssignUnassignedFile(unassignedId, req.docType);
                          return;
                        }
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          await handleChecklistUpload(req, file);
                        }
                      }}
                      className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                        dragOverDocType === req.docType
                          ? 'border-[#2563EB] bg-[#2563EB]/10'
                          : isRequestedMissing
                          ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                          : 'border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                              {req.label}
                            </h3>
                            <span className="text-[11px] font-semibold text-[#526685] dark:text-[#93A9CB]">
                              {req.requirementType}
                              {req.apostilleRequired ? ' · Apostille / Consular' : ''}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${statusBadge.cls}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>

                        {req.notes && (
                          <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                            {req.notes}
                          </p>
                        )}

                        {uploaded && (
                          <div className="rounded-xl bg-[#F4F8FD] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
                                <span className="text-xs font-bold text-[#081426] dark:text-white truncate">
                                  {uploaded.fileName}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#526685] shrink-0">
                                {(uploaded.size / 1024).toFixed(0)} KB
                              </span>
                            </div>

                            {uploaded.aiDetected && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8A671A] dark:text-[#F0D79A]">
                                <Sparkles className="w-3 h-3" /> Auto-matched by Smart Upload
                              </span>
                            )}

                            {uploaded.qualityWarnings && uploaded.qualityWarnings.length > 0 && (
                              <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{uploaded.qualityWarnings.join(' ')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                        {!isReadOnly && (
                          <>
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer">
                              {isUploadingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              <span>{uploaded ? 'Replace' : 'Upload'}</span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleChecklistUpload(req, f);
                                  e.target.value = '';
                                }}
                              />
                            </label>

                            <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/15 text-[#081426] dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer">
                              <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                              <span>Camera</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleChecklistUpload(req, f);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </>
                        )}

                        {uploaded && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(uploaded, req.label)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/15 text-[#081426] dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>

                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(req.docType)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 7: REVIEW & SUBMIT */}
          {step === 7 && app && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#081426] dark:text-white">
                  Step 7 — Review & Submit Application
                </h2>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                  Review all information carefully. Applications are never submitted automatically.
                </p>
              </div>

              {/* Unverified AI-filled fields blocker */}
              {unverifiedAiFields.length > 0 && (
                <div className="rounded-2xl border-2 border-[#D6B875] bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-5 h-5 text-[#9A7116] dark:text-[#F0D79A] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                        Verify {unverifiedAiFields.length} AI-Filled Field
                        {unverifiedAiFields.length === 1 ? '' : 's'} Before Submitting
                      </h3>
                      <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                        Confirm each field below looks correct or jump to edit it. Submit stays
                        disabled until every AI-filled field is verified.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {unverifiedAiFields.map((fieldKey) => {
                      const meta = FIELD_FRIENDLY_LABELS[fieldKey] || {
                        label: fieldKey,
                        step: 1,
                      };
                      const [section, prop] = fieldKey.split('.');
                      const val = (app as any)?.[section]?.[prop] || '—';
                      return (
                        <div
                          key={fieldKey}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-[#0B172B] border border-[#D6B875]/60 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[#526685] dark:text-[#93A9CB]">
                              {meta.label}
                            </p>
                            <p className="text-xs font-extrabold text-[#081426] dark:text-white truncate">
                              {String(val)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => markFieldVerified(fieldKey)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            >
                              Looks correct
                            </button>
                            <button
                              type="button"
                              onClick={() => setStep(meta.step)}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#2563EB] hover:bg-blue-50 dark:hover:bg-white/10 cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Read-only Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2563EB]">
                      1. Personal Information
                    </h3>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <dl className="text-xs space-y-1 text-[#081426] dark:text-slate-200">
                    <div>
                      <span className="text-[#526685]">Name: </span>
                      <strong>
                        {app.personal.surname} {app.personal.givenNames}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#526685]">Passport: </span>
                      <strong>{app.personal.passportNumber || '—'}</strong> (Exp:{' '}
                      {app.personal.passportExpiryDate || '—'})
                    </div>
                    <div>
                      <span className="text-[#526685]">DOB / Nationality: </span>
                      {app.personal.dateOfBirth || '—'} · {app.personal.nationality || '—'}
                    </div>
                    <div>
                      <span className="text-[#526685]">Contact: </span>
                      {app.personal.email} · {app.personal.phoneCountryCode}{' '}
                      {app.personal.phoneNumber}
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2563EB]">
                      2. Education & 3. Language
                    </h3>
                    {!isReadOnly && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                        >
                          Edit Edu
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                        >
                          Edit Lang
                        </button>
                      </div>
                    )}
                  </div>
                  <dl className="text-xs space-y-1 text-[#081426] dark:text-slate-200">
                    <div>
                      <span className="text-[#526685]">Highest Level: </span>
                      <strong>{app.education.highestLevel}</strong>
                    </div>
                    <div>
                      <span className="text-[#526685]">Institution: </span>
                      {app.education.institutionName || '—'} ({app.education.country || '—'})
                    </div>
                    <div>
                      <span className="text-[#526685]">GPA: </span>
                      {app.education.gpa ? `${app.education.gpa} / ${app.education.gpaScale}` : '—'}
                    </div>
                    <div>
                      <span className="text-[#526685]">Language: </span>
                      TOPIK: {app.language.topikLevel} · English: {app.language.englishTestType}{' '}
                      {app.language.englishTestScore}
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2563EB]">
                      4. Program & 5. Finance
                    </h3>
                    {!isReadOnly && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStep(4)}
                          className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                        >
                          Edit Program
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(5)}
                          className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                        >
                          Edit Finance
                        </button>
                      </div>
                    )}
                  </div>
                  <dl className="text-xs space-y-1 text-[#081426] dark:text-slate-200">
                    <div>
                      <span className="text-[#526685]">Intake / Degree: </span>
                      <strong>
                        {app.intake} · {displayDegreeLabel(app.degreeLevel)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#526685]">Desired Major: </span>
                      <strong>{app.program.desiredMajor || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[#526685]">Scholarship Interest: </span>
                      {app.program.scholarshipInterest ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <span className="text-[#526685]">Sponsor: </span>
                      {app.finance.sponsorType} ({app.finance.sponsorName || 'Self'})
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2563EB]">
                      6. Documents ({docProgress.ready}/{docProgress.total})
                    </h3>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => setStep(6)}
                        className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {checklistInfo.items.map((req) => {
                      const has = Boolean(app.documents?.[req.docType]);
                      return (
                        <div
                          key={req.docType}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-[#081426] dark:text-slate-200 truncate">
                            {req.label}
                          </span>
                          <span
                            className={`font-bold ${
                              has ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {has ? 'Ready' : 'Missing'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Two Required Consent Checkboxes */}
              {!isReadOnly && (
                <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-[#F4F8FD] dark:bg-white/[0.04] p-5 space-y-3.5">
                  <h3 className="text-sm font-extrabold text-[#081426] dark:text-white">
                    Privacy & Submission Consent (Required)
                  </h3>

                  <label className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-[#081426] dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(app.consent?.dataProcessing)}
                      onChange={(e) =>
                        updateApp((prev) => ({
                          ...prev,
                          consent: {
                            ...prev.consent,
                            dataProcessing: e.target.checked,
                            acceptedAt: e.target.checked ? new Date().toISOString() : '',
                          },
                        }))
                      }
                      className="w-4 h-4 mt-0.5 rounded text-[#2563EB]"
                    />
                    <span>
                      I confirm that all information and documents I provided are accurate, and I
                      consent to EVERYKR securely storing and sharing my application with{' '}
                      <strong>{universityName}</strong> and authorized admissions counsellors in
                      accordance with the{' '}
                      <Link
                        to="/privacy"
                        target="_blank"
                        className="text-[#2563EB] dark:text-[#4BA3FF] font-bold underline"
                      >
                        EVERYKR Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-[#081426] dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(app.consent?.aiProcessing)}
                      onChange={(e) =>
                        updateApp((prev) => ({
                          ...prev,
                          consent: {
                            ...prev.consent,
                            aiProcessing: e.target.checked,
                            acceptedAt: e.target.checked ? new Date().toISOString() : '',
                          },
                        }))
                      }
                      className="w-4 h-4 mt-0.5 rounded text-[#2563EB]"
                    />
                    <span>
                      I consent to AI-assisted reading and classification of uploaded documents to
                      help prepare my application, and I have personally reviewed and verified all
                      auto-filled fields.
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Bottom Wizard Navigation */}
          {step > 0 && app && (
            <div className="mt-8 pt-5 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep((s) => Math.max(0, s - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B] text-[#081426] dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {step < 7 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer"
                >
                  <span>Save & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                !isReadOnly && (
                  <button
                    type="button"
                    disabled={
                      submitting ||
                      unverifiedAiFields.length > 0 ||
                      !app.consent?.dataProcessing ||
                      ((app.aiFilledFields || []).length > 0 && !app.consent?.aiProcessing)
                    }
                    onClick={handleSubmitFinal}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold bg-[#081426] dark:bg-[#2563EB] hover:bg-[#2563EB] text-white shadow-md transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#D6B875]" />
                        <span>
                          {app.status === 'documents_missing'
                            ? 'Resubmit Application'
                            : 'Submit Application'}
                        </span>
                      </>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-[#081426]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ekr-glass-modal rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden bg-white dark:bg-[#0B172B]">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-[#081426] dark:text-white truncate">
                  {previewDoc.label}
                </h3>
                <p className="text-xs text-[#526685] truncate">{previewDoc.fileName}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download={previewDoc.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2563EB] text-white"
                >
                  Open / Download
                </a>
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-[#081426] flex items-center justify-center min-h-[360px]">
              {previewDoc.mimeType === 'application/pdf' ||
              previewDoc.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.fileName}
                  className="w-full h-[65vh] rounded-xl bg-white"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.fileName}
                  className="max-w-full max-h-[65vh] rounded-xl object-contain shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
