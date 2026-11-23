/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR "Apply Now" Smart Application System — Firestore & Storage Client Service
 *
 * Collections & Paths:
 * - Firestore: applications/{applicationId}
 * - Firestore: applications/{applicationId}/history/{eventId}
 * - Firestore: applications/{applicationId}/documentAccessLog/{logId}
 * - Firestore: users/{uid}/applicationProfile/default
 * - Firestore: site_settings/application_retention
 * - Storage:   applications/{uid}/{applicationId}/{docType}/{fileName}
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import {
  ref,
  getBlob,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  auth,
  db,
  storage,
  ensureFirebaseAuthInitialized,
  sanitizeFirestorePayload,
  OperationType,
  handleFirestoreError,
  withTimeout,
} from '../lib/firebase';
import {
  getServerSessionToken,
  pushStudentPortalNotificationDoc,
  createAdminPlatformNotificationDoc,
} from './firebaseService';
import { normalizePassportNumber } from '../utils/mrzValidator';
import { classifyDocumentCategory } from '../utils/applicationDocumentTaxonomyCore';
import type {
  SmartApplicationRecord,
  SmartApplicationStatus,
  SmartApplicationDocumentItem,
  SmartApplicationDocumentVerificationStatus,
  SmartApplicationDocumentVersion,
  SmartApplicationHistoryEvent,
  SmartApplicationHistoryEventType,
  SmartApplicationDocumentAccessLog,
  SmartApplicationNote,
  SmartApplicationRequestedDocument,
  SmartApplicationAdminRole,
  UserApplicationProfile,
  ApplicationRetentionSettings,
  PassportCanonicalData,
  PassportCanonicalErrorCode,
  PassportExtractionApiResponse,
  DocumentClassificationApiResponse,
  ChecklistRequirementItem,
  SmartUploadAiErrorCode,
} from '../types/smartApplication';
import {
  DEFAULT_PERSONAL_INFO,
  DEFAULT_EDUCATION_INFO,
  DEFAULT_LANGUAGE_INFO,
  DEFAULT_PROGRAM_CHOICE,
  DEFAULT_FINANCE_INFO,
  SMART_APPLICATION_STATUS_META,
  normalizeSmartApplicationStatus,
  isAllowedStatusTransition,
} from '../types/smartApplication';
import type { RelationalApplicationDocumentRow } from '../data/universities25/relationalTypes';

import {
  firebaseConfig,
} from '../lib/firebase';
import {
  MAX_APPLICATION_FILE_BYTES,
  normalizeApplicationUploadFile,
  validateFileSignatureEarly,
} from '../utils/documentFileTools';

const APPLICATIONS_COLLECTION = 'applications';
const RETENTION_DOC_PATH = 'application_retention';

export type SmartApplicationErrorCode =
  | 'firebase-auth-missing'
  | 'firestore-permission-denied'
  | 'invalid-transition'
  | 'storage-error'
  | 'metadata-sync-failed'
  | 'unknown';

export type StorageUploadErrorCategory =
  | 'storage/unauthorized'
  | 'storage/unauthenticated'
  | 'storage/retry-limit-exceeded'
  | 'storage/canceled'
  | 'storage/quota-exceeded'
  | 'storage/unknown'
  | 'network-failure'
  | 'metadata-sync-failed'
  | 'validation-error';

export class SmartApplicationServiceError extends Error {
  public readonly code: SmartApplicationErrorCode;
  public readonly storageErrorCode?: StorageUploadErrorCategory;
  public readonly recoveryAction?: string;
  public readonly retryable: boolean;
  public readonly uploadedItem?: SmartApplicationDocumentItem;

  constructor(
    code: SmartApplicationErrorCode,
    message: string,
    options?: {
      storageErrorCode?: StorageUploadErrorCategory;
      recoveryAction?: string;
      retryable?: boolean;
      uploadedItem?: SmartApplicationDocumentItem;
    }
  ) {
    super(message);
    this.name = 'SmartApplicationServiceError';
    this.code = code;
    this.storageErrorCode = options?.storageErrorCode;
    this.recoveryAction = options?.recoveryAction;
    this.retryable = options?.retryable ?? true;
    this.uploadedItem = options?.uploadedItem;
  }
}

/**
 * Waits for Firebase Auth persistence initialization and returns the authoritative
 * `auth.currentUser.uid`. Throws `SmartApplicationServiceError('firebase-auth-missing')`
 * when the browser has no active Firebase Auth session (preventing unauthenticated
 * Firestore reads that would fail with `permission-denied`).
 */
export async function requireActiveFirebaseUid(expectedUid?: string): Promise<string> {
  await ensureFirebaseAuthInitialized();
  const activeUid = auth.currentUser?.uid || '';
  if (!activeUid) {
    throw new SmartApplicationServiceError(
      'firebase-auth-missing',
      'Your sign-in session needs to be refreshed before accessing your private application data. Please sign in again.'
    );
  }
  if (expectedUid && expectedUid !== activeUid) {
    // Always trust the cryptographically authenticated Firebase Auth UID over stale client cache
    return activeUid;
  }
  return activeUid;
}

function wrapFirestoreFailure(err: unknown): never {
  if (err instanceof SmartApplicationServiceError) {
    throw err;
  }
  const msg = err instanceof Error ? err.message : String(err || '');
  const code = String((err as any)?.code || '').toLowerCase();
  if (code.includes('permission-denied') || msg.toLowerCase().includes('missing or insufficient permissions')) {
    throw new SmartApplicationServiceError(
      'firestore-permission-denied',
      'We could not access your application records due to Firestore security permissions. Please refresh or sign in again, or ensure the latest Firestore rules are deployed.'
    );
  }
  throw err;
}

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Builds a deterministic Firestore document ID (`^[a-zA-Z0-9_-]{1,128}$`) for an active
 * application keyed by `(userId, universityId, intake, degreeLevel)` so concurrent tabs
 * or double-clicks atomically converge on the same draft via a Firestore transaction.
 */
export function buildDeterministicApplicationId(params: {
  userId: string;
  universityId: string;
  intake: string;
  degreeLevel: string;
}): string {
  const clean = (v: string, maxLen: number) =>
    String(v || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, maxLen) || 'x';

  const canonicalKey = [
    String(params.userId || '').trim(),
    String(params.universityId || '').trim().toLowerCase(),
    String(params.intake || '').trim().toLowerCase(),
    String(params.degreeLevel || '').trim().toLowerCase(),
  ].join('|');

  const uidPart = clean(params.userId, 24);
  const uniPart = clean(params.universityId, 24);
  const hash1 = fnv1aHex(canonicalKey);
  const hash2 = fnv1aHex(`ekr:${canonicalKey}:v1`);
  return `app_${uidPart}_${uniPart}_${hash1}${hash2}`.slice(0, 120);
}

function hydrateRecord(id: string, raw: Record<string, any>): SmartApplicationRecord {
  return {
    ...(raw as SmartApplicationRecord),
    id,
    status: normalizeSmartApplicationStatus(raw?.status),
  };
}

/**
 * Resolves the caller's application admin role by combining Firebase Auth custom claims
 * (`admin`, `counsellor`, `viewer`) with existing verified EVERYKR admin checks.
 */
export async function resolveSmartApplicationAdminRole(params: {
  userRole?: string | null;
  isServerVerifiedAdmin?: boolean;
}): Promise<SmartApplicationAdminRole> {
  await ensureFirebaseAuthInitialized();

  if (params.userRole === 'admin' && params.isServerVerifiedAdmin) {
    return 'admin';
  }

  try {
    const fbUser = auth.currentUser;
    if (fbUser) {
      const tokenResult = await fbUser.getIdTokenResult();
      const claims = tokenResult?.claims || {};
      if (claims.admin === true || claims.role === 'admin') return 'admin';
      if (claims.counsellor === true || claims.role === 'counsellor') return 'counsellor';
      if (claims.viewer === true || claims.role === 'viewer') return 'viewer';
    }
  } catch {
    // non-fatal
  }

  if (params.isServerVerifiedAdmin) return 'admin';
  return null;
}

/**
 * Builds authenticated headers for server-side Smart Application API routes.
 */
async function buildAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const fbUser = auth.currentUser;
    if (fbUser) {
      const idToken = await fbUser.getIdToken();
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
        headers['x-firebase-id-token'] = idToken;
      }
    }
  } catch {
    // ignore
  }
  const sessionToken = getServerSessionToken();
  if (sessionToken) {
    headers['x-everykr-session'] = sessionToken;
    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
  }
  return headers;
}

/**
 * Maps a university's RelationalApplicationDocumentRow list for the chosen degree level into
 * standardized checklist items, or falls back to the General Requirements checklist.
 */
export function buildChecklistForDegree(
  universityDocs: RelationalApplicationDocumentRow[] | undefined,
  degreeLevel: string
): { items: ChecklistRequirementItem[]; isGeneralFallback: boolean } {
  const normalizedDegree = String(degreeLevel || '').toLowerCase();
  const isGraduate =
    normalizedDegree.includes('master') ||
    normalizedDegree.includes('phd') ||
    normalizedDegree.includes('graduate');
  const isKlp =
    normalizedDegree.includes('klp') || normalizedDegree.includes('language');
  const isAssociate = normalizedDegree.includes('associate');

  const matchesLevel = (applicableLevel: string) => {
    const lvl = String(applicableLevel || 'All').toLowerCase();
    if (lvl === 'all') return true;
    if (isGraduate && lvl === 'graduate') return true;
    if (isKlp && lvl === 'klp') return true;
    if (isAssociate && lvl === 'associate') return true;
    if (!isGraduate && !isKlp && !isAssociate && lvl === 'undergraduate') return true;
    return false;
  };

  const mapDocNameToType = (name: string, index: number): string => {
    const n = name.toLowerCase();
    if (n.includes('passport') && (n.includes('photo') || n.includes('picture') || n.includes('id photo'))) {
      return 'photo';
    }
    if (n.includes('passport')) return 'passport';
    if (n.includes('photo') || n.includes('portrait')) return 'photo';
    if (n.includes('transcript') || n.includes('grade') || n.includes('mark')) return 'transcript';
    if (n.includes('diploma') || n.includes('graduation') || n.includes('degree certificate')) {
      return 'certificate';
    }
    if (n.includes('topik') || n.includes('ielts') || n.includes('toefl') || n.includes('language')) {
      return 'language_certificate';
    }
    if (n.includes('bank') || n.includes('financial') || n.includes('balance') || n.includes('sponsor')) {
      return 'bank_statement';
    }
    if (n.includes('study plan') || n.includes('personal statement') || n.includes('statement of purpose')) {
      return 'study_plan';
    }
    if (n.includes('recommend')) return 'recommendation_letter';
    const slug = n.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36);
    return slug || `university_doc_${index + 1}`;
  };

  const filtered = (universityDocs || []).filter((d) => matchesLevel(d.applicableLevel));
  if (filtered.length > 0) {
    const usedKeys = new Set<string>();
    const items: ChecklistRequirementItem[] = filtered.map((d, idx) => {
      let key = mapDocNameToType(d.documentName, idx);
      if (usedKeys.has(key)) {
        key = `${key}_${idx + 1}`;
      }
      usedKeys.add(key);
      return {
        docType: key,
        label: d.documentName,
        requirementType: d.requirementType || 'Mandatory',
        notes: d.programSpecificNote || d.notes || '',
        apostilleRequired: Boolean(d.apostilleOrConsularRequired),
        translationRequired: d.translationRequired || '',
        isGeneralFallback: false,
      };
    });

    // Ensure passport is always included so Passport Smart Upload has a target card
    if (!items.some((i) => i.docType === 'passport')) {
      items.unshift({
        docType: 'passport',
        label: 'Passport Bio Page',
        requirementType: 'Mandatory',
        notes: 'Valid international passport information page.',
        isGeneralFallback: false,
      });
    }

    return { items, isGeneralFallback: false };
  }

  // Default fallback list labelled "General requirements"
  const general: ChecklistRequirementItem[] = [
    {
      docType: 'passport',
      label: 'Passport',
      requirementType: 'Mandatory',
      notes: 'Clear color scan of the passport bio page (MRZ visible).',
      isGeneralFallback: true,
    },
    {
      docType: 'photo',
      label: 'Passport-size photo',
      requirementType: 'Mandatory',
      notes: 'Recent ID photo with a plain white or light background (3.5×4.5cm).',
      isGeneralFallback: true,
    },
    {
      docType: 'transcript',
      label: 'Academic transcripts',
      requirementType: 'Mandatory',
      notes: 'Official transcripts from your highest completed academic level.',
      isGeneralFallback: true,
    },
    {
      docType: 'certificate',
      label: 'Degree / graduation certificate',
      requirementType: 'Mandatory',
      notes: 'Diploma, graduation certificate, or expected graduation letter.',
      isGeneralFallback: true,
    },
    {
      docType: 'language_certificate',
      label: 'Language certificate (if any)',
      requirementType: 'Conditional',
      notes: 'TOPIK, IELTS, TOEFL, or Duolingo score report if applicable.',
      isGeneralFallback: true,
    },
    {
      docType: 'bank_statement',
      label: 'Bank statement / financial proof',
      requirementType: 'Mandatory',
      notes: 'Recent bank balance certificate showing required tuition/living funds.',
      isGeneralFallback: true,
    },
    {
      docType: 'study_plan',
      label: 'Study plan / personal statement',
      requirementType: 'Mandatory',
      notes: 'Your motivation for studying in Korea and academic/career goals.',
      isGeneralFallback: true,
    },
  ];

  if (isGraduate) {
    general.push({
      docType: 'recommendation_letter',
      label: 'Recommendation letter (Master’s / PhD)',
      requirementType: 'Mandatory',
      notes: 'Academic or professional recommendation letter signed by referee.',
      isGeneralFallback: true,
    });
  }

  return { items: general, isGeneralFallback: true };
}

/**
 * Loads the student's reusable application profile (personal, education, language)
 * from `users/{uid}/applicationProfile/default`.
 */
export async function fetchUserApplicationProfile(
  uid: string
): Promise<UserApplicationProfile | null> {
  try {
    const activeUid = await requireActiveFirebaseUid(uid);
    const snap = await withTimeout(
      getDoc(doc(db, 'users', activeUid, 'applicationProfile', 'default')),
      12000
    );
    if (!snap.exists()) return null;
    return snap.data() as UserApplicationProfile;
  } catch (err) {
    if (err instanceof SmartApplicationServiceError && err.code === 'firebase-auth-missing') {
      throw err;
    }
    console.warn('[SmartApplication] Could not fetch applicationProfile:', err);
    return null;
  }
}

/**
 * Persists reusable personal, education, and language sections to `users/{uid}/applicationProfile/default`.
 */
export async function saveUserApplicationProfile(
  uid: string,
  data: Pick<UserApplicationProfile, 'personal' | 'education' | 'language'>
): Promise<void> {
  try {
    const activeUid = await requireActiveFirebaseUid(uid);
    const payload = sanitizeFirestorePayload({
      userId: activeUid,
      personal: data.personal,
      education: data.education,
      language: data.language,
      updatedAt: new Date().toISOString(),
    });
    await withTimeout(
      setDoc(doc(db, 'users', activeUid, 'applicationProfile', 'default'), payload, { merge: true }),
      12000
    );
  } catch (err) {
    // Non-blocking profile sync — never disrupt main draft save
    console.warn('[SmartApplication] Profile sync warning:', err instanceof Error ? err.message : 'sync skipped');
  }
}

/**
 * Fetches all Smart Applications belonging to the authenticated student.
 */
export async function fetchStudentSmartApplications(
  uid: string
): Promise<SmartApplicationRecord[]> {
  try {
    const activeUid = await requireActiveFirebaseUid(uid);
    const q = query(
      collection(db, APPLICATIONS_COLLECTION),
      where('userId', '==', activeUid)
    );
    const snap = await withTimeout(getDocs(q), 12000);
    const list = snap.docs.map((d) => hydrateRecord(d.id, d.data()));
    return list.sort((a, b) =>
      String(b.updatedAt || b.createdAt || '').localeCompare(
        String(a.updatedAt || a.createdAt || '')
      )
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, APPLICATIONS_COLLECTION);
    wrapFirestoreFailure(err);
  }
}

/**
 * Finds an existing non-withdrawn application for the exact combination of
 * userId + universityId + intake + degreeLevel (or latest draft for universityId if intake/degree not yet chosen).
 */
export async function findExistingUserApplication(params: {
  userId: string;
  universityId: string;
  intake?: string;
  degreeLevel?: string;
}): Promise<{
  exactMatch: SmartApplicationRecord | null;
  latestDraftForUniversity: SmartApplicationRecord | null;
  reusableDocuments: Record<string, SmartApplicationDocumentItem>;
}> {
  const userApps = await fetchStudentSmartApplications(params.userId);

  let exactMatch: SmartApplicationRecord | null = null;
  let latestDraftForUniversity: SmartApplicationRecord | null = null;
  const reusableDocuments: Record<string, SmartApplicationDocumentItem> = {};

  for (const app of userApps) {
    // Collect most recently uploaded documents across all applications for optional reuse
    if (app.documents && typeof app.documents === 'object') {
      for (const [docKey, item] of Object.entries(app.documents)) {
        if (item?.storagePath && !reusableDocuments[docKey]) {
          reusableDocuments[docKey] = {
            ...item,
            reusedFromApplicationId: app.id,
          };
        }
      }
    }

    if (app.universityId !== params.universityId) continue;
    if (app.status === 'withdrawn') continue;

    if (
      params.intake &&
      params.degreeLevel &&
      app.intake === params.intake &&
      app.degreeLevel === params.degreeLevel
    ) {
      if (!exactMatch) exactMatch = app;
    }

    if (app.status === 'draft' && !latestDraftForUniversity) {
      latestDraftForUniversity = app;
    }
  }

  return { exactMatch, latestDraftForUniversity, reusableDocuments };
}

/**
 * Fetches a single Smart Application by ID.
 */
export async function fetchSmartApplicationById(
  applicationId: string
): Promise<SmartApplicationRecord | null> {
  try {
    await requireActiveFirebaseUid();
    const snap = await withTimeout(getDoc(doc(db, APPLICATIONS_COLLECTION, applicationId)), 12000);
    if (!snap.exists()) return null;
    return hydrateRecord(snap.id, snap.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${APPLICATIONS_COLLECTION}/${applicationId}`);
    wrapFirestoreFailure(err);
  }
}

/**
 * Creates a brand-new Smart Application draft in Firestore, enforcing atomic duplicate prevention
 * for active applications sharing `(userId, universityId, intake, degreeLevel)` via deterministic
 * document IDs and a Firestore transaction (while preserving compatibility with older random-ID drafts).
 */
export async function createSmartApplicationDraft(params: {
  userId: string;
  userEmail: string;
  universityId: string;
  universityName: string;
  universityLogoUrl?: string;
  intake: string;
  intakeStartDate?: string;
  applicationDeadline?: string;
  degreeLevel: string;
  round: string;
  prefillProfile?: UserApplicationProfile | null;
}): Promise<SmartApplicationRecord> {
  const activeUid = await requireActiveFirebaseUid(params.userId);

  // 1. Backward-compatible check for any existing active application (including legacy auto-ID docs)
  const { exactMatch } = await findExistingUserApplication({
    userId: activeUid,
    universityId: params.universityId,
    intake: params.intake,
    degreeLevel: params.degreeLevel,
  });
  if (exactMatch) {
    return exactMatch;
  }

  const now = new Date().toISOString();
  const deterministicId = buildDeterministicApplicationId({
    userId: activeUid,
    universityId: params.universityId,
    intake: params.intake,
    degreeLevel: params.degreeLevel,
  });

  const personal = {
    ...DEFAULT_PERSONAL_INFO,
    ...(params.prefillProfile?.personal || {}),
    email: params.prefillProfile?.personal?.email || params.userEmail || '',
  };

  const buildNewRecord = (docId: string): SmartApplicationRecord => ({
    id: docId,
    userId: activeUid,
    universityId: params.universityId,
    universityName: params.universityName,
    universityLogoUrl: params.universityLogoUrl || '',
    intake: params.intake,
    intakeStartDate: params.intakeStartDate || '',
    applicationDeadline: params.applicationDeadline || '',
    degreeLevel: params.degreeLevel,
    round: params.round,
    status: 'draft',
    personal,
    education: {
      ...DEFAULT_EDUCATION_INFO,
      ...(params.prefillProfile?.education || {}),
    },
    language: {
      ...DEFAULT_LANGUAGE_INFO,
      ...(params.prefillProfile?.language || {}),
    },
    program: {
      ...DEFAULT_PROGRAM_CHOICE,
      degreeLevel: params.degreeLevel,
      round: params.round,
    },
    finance: { ...DEFAULT_FINANCE_INFO },
    documents: {},
    requiredDocTypes: [],
    requestedDocuments: [],
    requestedDocumentsMessage: '',
    aiFilledFields: [],
    aiCheckWarningFields: [],
    verifiedFields: [],
    consent: {
      dataProcessing: false,
      aiProcessing: false,
      acceptedAt: '',
    },
    passportNumberNormalized: normalizePassportNumber(personal.passportNumber),
    duplicatePassportFlag: false,
    duplicatePassportApplicationIds: [],
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    assignedTo: null,
    assignedToName: null,
    assignedToEmail: null,
    notes: [],
  });

  const primaryRef = doc(db, APPLICATIONS_COLLECTION, deterministicId);

  let createdFreshId: string | null = null;
  try {
    const result = await withTimeout(
      runTransaction(db, async (tx) => {
        const snap = await tx.get(primaryRef);
        if (snap.exists()) {
          const existing = hydrateRecord(snap.id, snap.data());
          if (existing.status !== 'withdrawn') {
            return existing;
          }
          // Previous application for this combo was withdrawn — create a distinct fresh record
          const reappliedId = `${deterministicId}_${Date.now().toString(36)}`.slice(0, 120);
          const reappliedRef = doc(db, APPLICATIONS_COLLECTION, reappliedId);
          const freshRecord = buildNewRecord(reappliedId);
          tx.set(reappliedRef, sanitizeFirestorePayload(freshRecord));
          createdFreshId = reappliedId;
          return freshRecord;
        }
        const newRecord = buildNewRecord(deterministicId);
        tx.set(primaryRef, sanitizeFirestorePayload(newRecord));
        createdFreshId = deterministicId;
        return newRecord;
      }),
      12000
    );

    if (createdFreshId) {
      addApplicationHistoryEvent(createdFreshId, {
        actorUid: activeUid,
        actorName:
          `${personal.givenNames || ''} ${personal.surname || ''}`.trim() ||
          params.userEmail ||
          'Student',
        actorEmail: params.userEmail || personal.email || '',
        actorRole: 'student',
        eventType: 'created',
        when: now,
        from: null,
        to: 'draft',
        message: `Application draft created for ${params.universityName} (${params.intake}, ${params.degreeLevel}).`,
      }).catch(() => {});
    }

    return result;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${APPLICATIONS_COLLECTION}/${deterministicId}`);
    wrapFirestoreFailure(err);
  }
}

/**
 * Auto-saves an application draft (or `documents_missing` document uploads) using a targeted
 * `updateDoc` containing ONLY student-editable fields permitted by `firestore.rules` (never
 * overwriting admin notes, assignment, or immutable identity fields).
 */
export async function saveSmartApplicationDraft(
  app: SmartApplicationRecord
): Promise<SmartApplicationRecord> {
  const activeUid = await requireActiveFirebaseUid(app.userId);
  const now = new Date().toISOString();
  const normalizedStatus = normalizeSmartApplicationStatus(app.status);
  const normalizedPassport = normalizePassportNumber(app.personal.passportNumber);

  const updated: SmartApplicationRecord = {
    ...app,
    status: normalizedStatus,
    passportNumberNormalized: normalizedPassport,
    updatedAt: now,
  };

  // Send strictly the allowed field subset for the current status
  const patchPayload: Record<string, any> =
    normalizedStatus === 'documents_missing'
      ? {
          documents: updated.documents,
          requiredDocTypes: updated.requiredDocTypes || [],
          requestedDocuments: updated.requestedDocuments || [],
          requestedDocumentsMessage: updated.requestedDocumentsMessage || '',
          updatedAt: now,
        }
      : {
          intake: updated.intake,
          intakeStartDate: updated.intakeStartDate || '',
          applicationDeadline: updated.applicationDeadline || '',
          degreeLevel: updated.degreeLevel,
          round: updated.round,
          personal: updated.personal,
          education: updated.education,
          language: updated.language,
          program: updated.program,
          finance: updated.finance,
          documents: updated.documents,
          requiredDocTypes: updated.requiredDocTypes || [],
          requestedDocuments: updated.requestedDocuments || [],
          requestedDocumentsMessage: updated.requestedDocumentsMessage || '',
          aiFilledFields: updated.aiFilledFields || [],
          aiCheckWarningFields: updated.aiCheckWarningFields || [],
          verifiedFields: updated.verifiedFields || [],
          ...(updated.aiPassportSnapshot ? { aiPassportSnapshot: updated.aiPassportSnapshot } : {}),
          consent: updated.consent,
          passportNumberNormalized: normalizedPassport,
          updatedAt: now,
        };

  try {
    await withTimeout(
      updateDoc(doc(db, APPLICATIONS_COLLECTION, app.id), sanitizeFirestorePayload(patchPayload)),
      12000
    );

    if (normalizedStatus === 'draft') {
      // Sync reusable profile fields in background
      saveUserApplicationProfile(activeUid, {
        personal: updated.personal,
        education: updated.education,
        language: updated.language,
      }).catch(() => {});
    }

    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${APPLICATIONS_COLLECTION}/${app.id}`);
    wrapFirestoreFailure(err);
  }
}

/**
 * Appends a status change event to `applications/{applicationId}/history/{eventId}`.
 */
export async function addApplicationHistoryEvent(
  applicationId: string,
  event: Omit<SmartApplicationHistoryEvent, 'id'>
): Promise<SmartApplicationHistoryEvent> {
  const colRef = collection(db, APPLICATIONS_COLLECTION, applicationId, 'history');
  try {
    const added = await withTimeout(addDoc(colRef, sanitizeFirestorePayload(event)), 12000);
    return { ...event, id: added.id };
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.CREATE,
      `${APPLICATIONS_COLLECTION}/${applicationId}/history`
    );
    throw err;
  }
}

/**
 * Fetches timeline history events for an application.
 */
export async function fetchApplicationHistory(
  applicationId: string
): Promise<SmartApplicationHistoryEvent[]> {
  try {
    const q = query(
      collection(db, APPLICATIONS_COLLECTION, applicationId, 'history'),
      orderBy('when', 'asc')
    );
    const snap = await withTimeout(getDocs(q), 12000);
    return snap.docs.map((d) => ({
      ...(d.data() as SmartApplicationHistoryEvent),
      id: d.id,
    }));
  } catch (err) {
    console.warn('[SmartApplication] History fetch error:', err);
    return [];
  }
}

const ALLOWED_STORAGE_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
]);

const ALLOWED_STORAGE_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.heif',
  '.zip',
];

const COMPLETED_STORAGE_CACHE_SESSION_KEY = 'everykr_completed_storage_uploads_v1';

// In-flight deduplication map: prevents duplicate concurrent uploads when a student double-taps
const inFlightUploads = new Map<string, Promise<SmartApplicationDocumentItem>>();

// Completed Storage upload recovery cache: prevents re-uploading binary to Storage if only Firestore metadata save or AI analysis failed
const completedStorageUploads = new Map<string, SmartApplicationDocumentItem>();

function loadCompletedStorageCacheFromSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(COMPLETED_STORAGE_CACHE_SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, SmartApplicationDocumentItem>;
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v.storagePath === 'string') {
          completedStorageUploads.set(k, v);
        }
      }
    }
  } catch {
    // ignore sessionStorage errors
  }
}

function saveCompletedStorageCacheToSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const serializable: Record<string, SmartApplicationDocumentItem> = {};
    for (const [k, v] of completedStorageUploads.entries()) {
      serializable[k] = v;
    }
    window.sessionStorage.setItem(
      COMPLETED_STORAGE_CACHE_SESSION_KEY,
      JSON.stringify(serializable)
    );
  } catch {
    // ignore sessionStorage quota errors
  }
}

loadCompletedStorageCacheFromSession();

export function buildStorageUploadCacheKey(params: {
  userId: string;
  applicationId: string;
  docType: string;
  file: Pick<File, 'name' | 'size' | 'lastModified'>;
}): string {
  return `${params.userId}|${params.applicationId}|${params.docType}|${params.file.name}|${params.file.size}|${params.file.lastModified || 0}`;
}

export function getCachedCompletedStorageUpload(cacheKey: string): SmartApplicationDocumentItem | undefined {
  return completedStorageUploads.get(cacheKey);
}

export function clearUploadCachesForTesting(): void {
  inFlightUploads.clear();
  completedStorageUploads.clear();
}

/**
 * Verifies Firebase Storage configuration, authenticated UID ownership, application ID format,
 * MIME type, and Storage path rules (`applications/{uid}/{applicationId}/{docType}/{fileName}`)
 * before initiating a resumable upload.
 */
export function verifySmartApplicationStorageTarget(params: {
  activeUid: string;
  requestedUserId: string;
  applicationId: string;
  docType: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}): {
  valid: boolean;
  storagePath: string;
  error?: SmartApplicationServiceError;
} {
  if (!firebaseConfig.projectId || firebaseConfig.projectId !== 'everykr') {
    return {
      valid: false,
      storagePath: '',
      error: new SmartApplicationServiceError(
        'storage-error',
        'Firebase project configuration mismatch (storage/unknown). Expected project "everykr".',
        {
          storageErrorCode: 'storage/unknown',
          recoveryAction: 'Verify firebase-applet-config.json points to project "everykr".',
          retryable: false,
        }
      ),
    };
  }

  if (!firebaseConfig.storageBucket || !firebaseConfig.storageBucket.includes('everykr')) {
    return {
      valid: false,
      storagePath: '',
      error: new SmartApplicationServiceError(
        'storage-error',
        'Firebase Storage bucket is not configured for project "everykr" (storage/unknown).',
        {
          storageErrorCode: 'storage/unknown',
          recoveryAction: 'Verify storageBucket is set to "everykr.firebasestorage.app".',
          retryable: false,
        }
      ),
    };
  }

  if (!params.activeUid) {
    return {
      valid: false,
      storagePath: '',
      error: new SmartApplicationServiceError(
        'firebase-auth-missing',
        'You must be signed in to upload application documents (storage/unauthenticated).',
        {
          storageErrorCode: 'storage/unauthenticated',
          recoveryAction: 'Please sign in again and retry your upload.',
          retryable: false,
        }
      ),
    };
  }

  // Enforce strict per-student path isolation: a student can NEVER upload to another student's UID folder
  if (params.requestedUserId && params.requestedUserId !== params.activeUid) {
    return {
      valid: false,
      storagePath: '',
      error: new SmartApplicationServiceError(
        'storage-error',
        'Access denied (storage/unauthorized): Cannot upload documents to another student’s Storage folder.',
        {
          storageErrorCode: 'storage/unauthorized',
          recoveryAction: 'Ensure you are signed in with the account that owns this application.',
          retryable: false,
        }
      ),
    };
  }

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(params.applicationId)) {
    return {
      valid: false,
      storagePath: '',
      error: new SmartApplicationServiceError(
        'storage-error',
        'Invalid application ID format for document upload (validation-error).',
        {
          storageErrorCode: 'validation-error',
          recoveryAction: 'Select an intake in Step 0 to initialize a valid application draft first.',
          retryable: false,
        }
      ),
    };
  }

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(params.docType)) {
    return {
      valid: false,
      storagePath: '',
      error: new SmartApplicationServiceError(
        'storage-error',
        'Invalid document category identifier (validation-error).',
        {
          storageErrorCode: 'validation-error',
          recoveryAction: 'Choose a valid document requirement from the checklist.',
          retryable: false,
        }
      ),
    };
  }

  if (params.fileSize <= 0 || params.fileSize > MAX_APPLICATION_FILE_BYTES) {
    return {
      valid: false,
      storagePath: '',
      error: new SmartApplicationServiceError(
        'storage-error',
        params.fileSize <= 0
          ? 'Selected file is empty (0 bytes).'
          : 'File exceeds the 20 MB maximum size allowed by Storage security rules.',
        {
          storageErrorCode: 'validation-error',
          recoveryAction: 'Choose a valid PDF, JPG, PNG, HEIC, or ZIP file under 20 MB.',
          retryable: false,
        }
      ),
    };
  }

  const lowerFileName = params.fileName.toLowerCase();
  const hasAllowedExtension = ALLOWED_STORAGE_EXTENSIONS.some((ext) =>
    lowerFileName.endsWith(ext)
  );
  if (
    params.fileName.length < 3 ||
    params.fileName.length > 180 ||
    params.fileName.includes('..') ||
    !hasAllowedExtension
  ) {
    return {
      valid: false,
      storagePath: '',
      error: new SmartApplicationServiceError(
        'storage-error',
        `File name "${params.fileName}" does not match allowed extensions (.pdf, .jpg, .jpeg, .png, .heic, .heif, .zip).`,
        {
          storageErrorCode: 'validation-error',
          recoveryAction: 'Rename or convert the file to PDF, JPG, PNG, HEIC, or ZIP.',
          retryable: false,
        }
      ),
    };
  }

  if (!ALLOWED_STORAGE_CONTENT_TYPES.has(params.contentType)) {
    return {
      valid: false,
      storagePath: '',
      error: new SmartApplicationServiceError(
        'storage-error',
        `Unsupported MIME type "${params.contentType}" (validation-error).`,
        {
          storageErrorCode: 'validation-error',
          recoveryAction: 'Upload a PDF, JPG, PNG, HEIC, or ZIP document.',
          retryable: false,
        }
      ),
    };
  }

  const storagePath = `applications/${params.activeUid}/${params.applicationId}/${params.docType}/${params.fileName}`;
  return { valid: true, storagePath };
}

/**
 * Probes the Firebase Storage REST endpoint without custom headers (bypassing CORS preflight OPTIONS)
 * when an upload fails at 0 bytes with `storage/retry-limit-exceeded` or `storage/unknown`,
 * to determine whether the bucket itself returned HTTP 404 (Not Found / uninitialized) or 403.
 */
async function probeStorageBucketStatus(): Promise<{
  reachable: boolean;
  httpStatus?: number;
  bucketNotFound?: boolean;
}> {
  if (typeof fetch === 'undefined') {
    return { reachable: true };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const bucket = firebaseConfig.storageBucket || 'everykr.firebasestorage.app';
    const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?maxResults=1`;
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    if (res.status === 404) {
      return { reachable: true, httpStatus: 404, bucketNotFound: true };
    }
    return { reachable: true, httpStatus: res.status, bucketNotFound: false };
  } catch {
    return { reachable: false };
  } finally {
    clearTimeout(timer);
  }
}

export async function classifyFirebaseStorageUploadError(
  rawErr: unknown,
  bytesTransferred: number
): Promise<SmartApplicationServiceError> {
  if (rawErr instanceof SmartApplicationServiceError) {
    return rawErr;
  }

  const errName = String((rawErr as any)?.name || '');
  const rawCode = String((rawErr as any)?.code || '').toLowerCase();
  const rawMsg = rawErr instanceof Error ? rawErr.message : String(rawErr || '');

  if (errName === 'AbortError' || rawCode === 'storage/canceled') {
    return new SmartApplicationServiceError(
      'storage-error',
      'Document upload was cancelled (storage/canceled).',
      {
        storageErrorCode: 'storage/canceled',
        recoveryAction: 'Click Choose File or Retry whenever you are ready to upload again.',
        retryable: true,
      }
    );
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new SmartApplicationServiceError(
      'storage-error',
      'Your device is offline (network-failure). Upload could not reach Firebase Storage.',
      {
        storageErrorCode: 'network-failure',
        recoveryAction: 'Reconnect to Wi-Fi or mobile data and click Retry.',
        retryable: true,
      }
    );
  }

  if (rawCode === 'storage/unauthenticated' || /\b401\b|unauthenticated/i.test(rawMsg)) {
    return new SmartApplicationServiceError(
      'firebase-auth-missing',
      'Authentication required for document upload (storage/unauthenticated). Your session may have expired.',
      {
        storageErrorCode: 'storage/unauthenticated',
        recoveryAction: 'Please sign in again to refresh your session and click Retry.',
        retryable: false,
      }
    );
  }

  if (rawCode === 'storage/unauthorized' || /\b403\b|unauthorized|permission/i.test(rawMsg)) {
    return new SmartApplicationServiceError(
      'storage-error',
      'Storage permission denied (storage/unauthorized). The upload was blocked by Firebase Storage security rules.',
      {
        storageErrorCode: 'storage/unauthorized',
        recoveryAction:
          'Verify you are signed in with the application owner account and that the latest storage.rules are deployed to Firebase project "everykr".',
        retryable: false,
      }
    );
  }

  if (rawCode === 'storage/quota-exceeded' || /\b402\b|quota/i.test(rawMsg)) {
    return new SmartApplicationServiceError(
      'storage-error',
      'Firebase Storage quota has been exceeded (storage/quota-exceeded).',
      {
        storageErrorCode: 'storage/quota-exceeded',
        recoveryAction: 'Check Firebase Storage billing/quota in project "everykr" or try again later.',
        retryable: false,
      }
    );
  }

  if (!rawCode && /network|fetch|offline|connection/i.test(rawMsg)) {
    return new SmartApplicationServiceError(
      'storage-error',
      'Network interruption occurred during document upload (network-failure).',
      {
        storageErrorCode: 'network-failure',
        recoveryAction: 'Check your connection and click Retry to resume uploading.',
        retryable: true,
      }
    );
  }

  if (
    rawCode === 'storage/retry-limit-exceeded' ||
    rawCode === 'storage/unknown' ||
    bytesTransferred === 0
  ) {
    const probe = await probeStorageBucketStatus();
    if (!probe.reachable) {
      return new SmartApplicationServiceError(
        'storage-error',
        'Network connection to Firebase Storage failed (network-failure).',
        {
          storageErrorCode: 'network-failure',
          recoveryAction: 'Check your mobile data or Wi-Fi connection and click Retry.',
          retryable: true,
        }
      );
    }
    if (probe.bucketNotFound) {
      return new SmartApplicationServiceError(
        'storage-error',
        `Firebase Storage upload failed (storage/retry-limit-exceeded): Bucket "${firebaseConfig.storageBucket}" returned HTTP 404 (Not Found) on the resumable upload endpoint.`,
        {
          storageErrorCode: 'storage/retry-limit-exceeded',
          recoveryAction:
            'In Firebase Console for project "everykr", open Storage → click "Get Started" to provision the default bucket (everykr.firebasestorage.app) and deploy storage.rules, then click Retry.',
          retryable: false,
        }
      );
    }
    if (rawCode === 'storage/retry-limit-exceeded') {
      return new SmartApplicationServiceError(
        'storage-error',
        'Firebase Storage upload timed out after multiple retry attempts (storage/retry-limit-exceeded).',
        {
          storageErrorCode: 'storage/retry-limit-exceeded',
          recoveryAction:
            'Check your internet connection or verify Firebase Storage rules/CORS on bucket "everykr.firebasestorage.app" and click Retry.',
          retryable: true,
        }
      );
    }
  }

  if (/network|fetch|offline|connection/i.test(rawMsg)) {
    return new SmartApplicationServiceError(
      'storage-error',
      'Network interruption occurred during document upload (network-failure).',
      {
        storageErrorCode: 'network-failure',
        recoveryAction: 'Check your connection and click Retry to resume uploading.',
        retryable: true,
      }
    );
  }

  return new SmartApplicationServiceError(
    'storage-error',
    rawMsg || 'Document upload failed due to an unexpected Storage error (storage/unknown).',
    {
      storageErrorCode: 'storage/unknown',
      recoveryAction: 'Click Retry or try uploading a standard PDF, JPG, or PNG file.',
      retryable: true,
    }
  );
}

/**
 * Synchronizes an uploaded document's metadata (`storagePath`, `fileName`, `size`, `mimeType`,
 * `uploadedAt`, version history, and readiness fields) directly to `applications/{applicationId}` in Firestore.
 */
export async function persistSmartApplicationDocumentMetadata(params: {
  userId: string;
  applicationId: string;
  docType: string;
  item: SmartApplicationDocumentItem;
  requiredDocTypes?: string[];
  customFirestoreWriter?: (applicationId: string, payload: Record<string, any>) => Promise<void>;
}): Promise<SmartApplicationDocumentItem> {
  const activeUid = params.customFirestoreWriter
    ? params.userId
    : await requireActiveFirebaseUid(params.userId);
  if (params.userId && params.userId !== activeUid) {
    throw new SmartApplicationServiceError(
      'storage-error',
      'Cannot save document metadata for another student’s application (storage/unauthorized).',
      {
        storageErrorCode: 'storage/unauthorized',
        recoveryAction: 'Sign in with the account that owns this application.',
        retryable: false,
      }
    );
  }

  const now = new Date().toISOString();
  const safeDocType = params.docType;

  try {
    if (params.customFirestoreWriter) {
      await params.customFirestoreWriter(params.applicationId, {
        [`documents.${safeDocType}`]: params.item,
        updatedAt: now,
      });
      return params.item;
    }

    const appRef = doc(db, APPLICATIONS_COLLECTION, params.applicationId);
    const existingSnap = await withTimeout(
      getDoc(appRef),
      8000,
      'getApplicationForDocumentMetadataSync'
    );
    const existingData = existingSnap.exists()
      ? (existingSnap.data() as SmartApplicationRecord)
      : undefined;
    const existingDoc = existingData?.documents?.[safeDocType];
    const mergedItem = mergeDocumentWithVersionHistory(existingDoc, params.item);
    const nextDocuments = {
      ...(existingData?.documents || {}),
      [safeDocType]: mergedItem,
    };

    const patch: Record<string, any> = {
      documents: nextDocuments,
      updatedAt: now,
    };
    if (params.requiredDocTypes && params.requiredDocTypes.length > 0) {
      patch.requiredDocTypes = params.requiredDocTypes;
    }

    if (existingSnap.exists()) {
      await withTimeout(
        updateDoc(appRef, sanitizeFirestorePayload(patch)),
        10_000,
        'persistSmartApplicationDocumentMetadata'
      );
    } else {
      await withTimeout(
        setDoc(
          appRef,
          sanitizeFirestorePayload({
            id: params.applicationId,
            userId: activeUid,
            status: 'draft',
            createdAt: now,
            ...patch,
          }),
          { merge: true }
        ),
        10_000,
        'persistSmartApplicationDocumentMetadataCreate'
      );
    }
    return mergedItem;
  } catch (firestoreErr: any) {
    throw new SmartApplicationServiceError(
      'metadata-sync-failed',
      'File uploaded to secure Storage, but saving document metadata to your application record failed (metadata-sync-failed).',
      {
        storageErrorCode: 'metadata-sync-failed',
        recoveryAction:
          'Click Retry to finish saving the document record without re-uploading your file.',
        retryable: true,
        uploadedItem: params.item,
      }
    );
  }
}

export interface SmartUploadTransportAdapter {
  authenticatedUid?: string;
  uploadAttempt: (params: {
    storagePath: string;
    file: File;
    contentType: string;
    customMetadata: Record<string, string>;
    signal?: AbortSignal;
    onProgress?: (progress: { bytesTransferred: number; totalBytes: number; percent: number }) => void;
  }) => Promise<{ fullPath: string; bytesTransferred: number }>;
  persistMetadata?: (
    applicationId: string,
    payload: Record<string, any>
  ) => Promise<void>;
}

/**
 * Uploads a document to Firebase Storage at `applications/{uid}/{applicationId}/{docType}/{fileName}`
 * (private path — access governed by storage.rules) using `uploadBytesResumable` for real byte-level
 * progress, user cancellation (`AbortSignal`), visibility-aware activity watchdog, controlled backoff
 * retry, duplicate upload deduplication, and Storage-to-Firestore metadata recovery.
 */
export async function uploadSmartApplicationDocument(params: {
  userId: string;
  applicationId: string;
  docType: string;
  file: File;
  label?: string;
  aiDetected?: boolean;
  verified?: boolean;
  qualityWarnings?: string[];
  requiredDocTypes?: string[];
  syncFirestoreMetadata?: boolean;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  signal?: AbortSignal;
  onProgress?: (progress: {
    bytesTransferred: number;
    totalBytes: number;
    percent: number;
    stage?: 'validating' | 'uploading' | 'verifying' | 'saving_metadata';
    attempt?: number;
  }) => void;
  stallTimeoutMs?: number;
  totalTimeoutMs?: number;
  customTransport?: SmartUploadTransportAdapter;
}): Promise<SmartApplicationDocumentItem> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new SmartApplicationServiceError(
      'storage-error',
      'You appear to be offline (network-failure). Please check your internet connection and retry.',
      {
        storageErrorCode: 'network-failure',
        recoveryAction: 'Reconnect to Wi-Fi or mobile data and click Retry.',
        retryable: true,
      }
    );
  }
  if (params.signal?.aborted) {
    throw new SmartApplicationServiceError(
      'storage-error',
      'Document upload was cancelled (storage/canceled).',
      {
        storageErrorCode: 'storage/canceled',
        recoveryAction: 'Click Choose File or Retry whenever you are ready to upload again.',
        retryable: true,
      }
    );
  }

  const activeUid = params.customTransport
    ? params.customTransport.authenticatedUid ?? params.userId
    : await requireActiveFirebaseUid(params.userId);

  // Validate binary file magic header & normalize mobile camera/picker filename and MIME type
  params.onProgress?.({
    bytesTransferred: 0,
    totalBytes: params.file.size || 1,
    percent: 0,
    stage: 'validating',
  });

  const sigCheck = await validateFileSignatureEarly(params.file);
  if (!sigCheck.valid) {
    throw new SmartApplicationServiceError(
      'storage-error',
      sigCheck.error || 'Unsupported or invalid document file (validation-error).',
      {
        storageErrorCode: 'validation-error',
        recoveryAction: 'Please select a valid PDF, JPG, PNG, HEIC, or ZIP document under 20 MB.',
        retryable: false,
      }
    );
  }

  const normalizedFile = normalizeApplicationUploadFile(params.file, sigCheck.detectedKind);
  const safeDocType = String(params.docType || 'other')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 64);

  const cacheKey = buildStorageUploadCacheKey({
    userId: activeUid,
    applicationId: params.applicationId,
    docType: safeDocType,
    file: normalizedFile,
  });

  // 1. Recovery Cache Hit: If Storage upload already succeeded for this exact file and only
  //    Firestore metadata persistence (or subsequent AI scan) failed, skip re-uploading binary!
  const cachedStorageItem = completedStorageUploads.get(cacheKey);
  if (cachedStorageItem && cachedStorageItem.storagePath) {
    params.onProgress?.({
      bytesTransferred: normalizedFile.size,
      totalBytes: normalizedFile.size,
      percent: 100,
      stage: 'saving_metadata',
    });
    if (params.syncFirestoreMetadata !== false) {
      return await persistSmartApplicationDocumentMetadata({
        userId: activeUid,
        applicationId: params.applicationId,
        docType: safeDocType,
        item: cachedStorageItem,
        requiredDocTypes: params.requiredDocTypes,
        customFirestoreWriter: params.customTransport?.persistMetadata,
      });
    }
    return cachedStorageItem;
  }

  // 2. Duplicate Upload Prevention: If an identical upload is already in flight, share the promise
  const existingInFlight = inFlightUploads.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const uploadTaskPromise = (async (): Promise<SmartApplicationDocumentItem> => {
    const safeName = normalizedFile.name
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/\.{2,}/g, '.')
      .slice(0, 120);
    const uniqueFileName = `${Date.now()}_${safeName}`;
    const canonicalContentType = normalizedFile.type || 'image/jpeg';

    const targetCheck = verifySmartApplicationStorageTarget({
      activeUid,
      requestedUserId: params.userId,
      applicationId: params.applicationId,
      docType: safeDocType,
      fileName: uniqueFileName,
      fileSize: normalizedFile.size,
      contentType: canonicalContentType,
    });

    if (!targetCheck.valid || !targetCheck.storagePath) {
      throw (
        targetCheck.error ||
        new SmartApplicationServiceError('storage-error', 'Invalid Storage upload target.')
      );
    }

    const storagePath = targetCheck.storagePath;
    const customMetadata = {
      userId: activeUid,
      applicationId: params.applicationId,
      docType: safeDocType,
    };

    const maxRetries = Math.max(0, params.maxRetries ?? 2);
    const retryBaseDelayMs = Math.max(100, params.retryBaseDelayMs ?? 700);
    // Activity watchdog while tab is visible (45s) & total upload cap (120s for up to 20MB on mobile)
    // Note: storage.maxUploadRetryTime is 12s, so Firebase SDK errors surface in ~12s instead of being masked by a 15s stall killer.
    const stallTimeoutMs = params.stallTimeoutMs ?? 45_000;
    const totalTimeoutMs = params.totalTimeoutMs ?? 120_000;

    let lastError: SmartApplicationServiceError | null = null;
    let verifiedFullPath = '';

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (params.signal?.aborted) {
        throw await classifyFirebaseStorageUploadError(
          Object.assign(new Error('Upload cancelled by user.'), { name: 'AbortError' }),
          0
        );
      }

      if (attempt > 0) {
        const backoffMs = retryBaseDelayMs * Math.pow(2, attempt - 1);
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, backoffMs);
          const onAbortWait = () => {
            clearTimeout(timer);
            const abortErr = new Error('Upload cancelled by user.');
            abortErr.name = 'AbortError';
            reject(abortErr);
          };
          params.signal?.addEventListener('abort', onAbortWait, { once: true });
        });
      }

      let highestBytesTransferred = 0;
      try {
        params.onProgress?.({
          bytesTransferred: 0,
          totalBytes: normalizedFile.size,
          percent: 0,
          stage: 'uploading',
          attempt: attempt + 1,
        });

        if (params.customTransport) {
          const result = await params.customTransport.uploadAttempt({
            storagePath,
            file: normalizedFile,
            contentType: canonicalContentType,
            customMetadata,
            signal: params.signal,
            onProgress: (p) => {
              highestBytesTransferred = Math.max(highestBytesTransferred, p.bytesTransferred);
              params.onProgress?.({
                ...p,
                stage: 'uploading',
                attempt: attempt + 1,
              });
            },
          });
          verifiedFullPath = result.fullPath;
        } else {
          // Authoritative backend-mediated upload authorization:
          // Verifies Firebase ID token, application ownership, and `draft`/`documents_missing`
          // status directly against the named Firestore database before issuing a short-lived,
          // single-use upload ticket (+ V4 signed URL when signing credentials are available).
          const authHeaders = await buildAuthHeaders();
          const authRes = await fetch('/api/smart-applications/documents/authorize-upload', {
            method: 'POST',
            headers: authHeaders,
            signal: params.signal,
            body: JSON.stringify({
              applicationId: params.applicationId,
              docType: safeDocType,
              fileName: normalizedFile.name,
              fileSize: normalizedFile.size,
              mimeType: canonicalContentType,
            }),
          });

          const authData = await authRes.json().catch(() => ({} as Record<string, any>));
          if (!authRes.ok || !authData?.ok || !authData?.storagePath || !authData?.uploadToken) {
            if (authRes.status === 401) {
              throw new SmartApplicationServiceError(
                'firebase-auth-missing',
                authData?.error || 'Authentication required for document upload (storage/unauthenticated).',
                {
                  storageErrorCode: 'storage/unauthenticated',
                  recoveryAction: 'Please sign in again and retry your upload.',
                  retryable: false,
                }
              );
            }
            if (authRes.status === 403) {
              throw new SmartApplicationServiceError(
                'storage-error',
                authData?.error ||
                  'Document upload denied (storage/unauthorized). Uploads are only permitted while your application is in draft or documents_missing status.',
                {
                  storageErrorCode: 'storage/unauthorized',
                  recoveryAction:
                    authData?.errorCode === 'application_status_locked'
                      ? 'Your application is already submitted or under review. Wait for an admissions officer to request missing documents before uploading replacements.'
                      : 'Ensure you are signed in with the student account that owns this application.',
                  retryable: false,
                }
              );
            }
            if (authRes.status === 400 || authRes.status === 413) {
              throw new SmartApplicationServiceError(
                'storage-error',
                authData?.error || 'Document failed server upload validation (validation-error).',
                {
                  storageErrorCode: 'validation-error',
                  recoveryAction: 'Select a valid PDF, JPG, PNG, HEIC, or ZIP file under 20 MB.',
                  retryable: false,
                }
              );
            }
            throw new Error(authData?.error || `Upload authorization failed (HTTP ${authRes.status}).`);
          }

          const authorizedStoragePath = String(authData.storagePath);
          const uploadViaXhr = (targetUrl: string, headersMap: Record<string, string>) =>
            new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              let settled = false;
              let lastBytes = -1;
              let stallTimer: ReturnType<typeof setTimeout> | null = null;
              let totalTimer: ReturnType<typeof setTimeout> | null = null;

              const cleanup = () => {
                if (stallTimer) {
                  clearTimeout(stallTimer);
                  stallTimer = null;
                }
                if (totalTimer) {
                  clearTimeout(totalTimer);
                  totalTimer = null;
                }
                params.signal?.removeEventListener('abort', onAbort);
                if (typeof document !== 'undefined') {
                  document.removeEventListener('visibilitychange', onVisibilityChange);
                }
              };

              const failWith = (err: unknown) => {
                if (settled) return;
                settled = true;
                cleanup();
                try {
                  xhr.abort();
                } catch {
                  // ignore
                }
                reject(err);
              };

              const resetStallTimer = () => {
                if (stallTimer) clearTimeout(stallTimer);
                if (typeof document !== 'undefined' && document.hidden) return;
                stallTimer = setTimeout(() => {
                  const timeoutErr = new Error('Upload connection became unresponsive before completing.');
                  (timeoutErr as any).code = 'storage/retry-limit-exceeded';
                  failWith(timeoutErr);
                }, stallTimeoutMs);
              };

              const onVisibilityChange = () => {
                if (settled) return;
                if (typeof document !== 'undefined' && document.hidden) {
                  if (stallTimer) {
                    clearTimeout(stallTimer);
                    stallTimer = null;
                  }
                } else {
                  resetStallTimer();
                }
              };

              const onAbort = () => {
                const abortErr = new Error('Upload cancelled by user.');
                abortErr.name = 'AbortError';
                failWith(abortErr);
              };

              params.signal?.addEventListener('abort', onAbort, { once: true });
              if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', onVisibilityChange);
              }
              resetStallTimer();
              totalTimer = setTimeout(() => {
                const totalErr = new Error(
                  `Upload exceeded maximum time limit (${Math.round(totalTimeoutMs / 1000)}s).`
                );
                (totalErr as any).code = 'storage/retry-limit-exceeded';
                failWith(totalErr);
              }, totalTimeoutMs);

              xhr.open('PUT', targetUrl, true);
              for (const [k, v] of Object.entries(headersMap)) {
                xhr.setRequestHeader(k, v);
              }

              xhr.upload.onprogress = (evt) => {
                if (settled) return;
                const totalBytes = evt.lengthComputable && evt.total > 0 ? evt.total : normalizedFile.size || 1;
                const bytesTransferred = evt.loaded || 0;
                highestBytesTransferred = Math.max(highestBytesTransferred, bytesTransferred);
                if (bytesTransferred > lastBytes) {
                  lastBytes = bytesTransferred;
                  resetStallTimer();
                }
                const percent = Math.min(100, Math.round((bytesTransferred / totalBytes) * 100));
                params.onProgress?.({
                  bytesTransferred,
                  totalBytes,
                  percent,
                  stage: 'uploading',
                  attempt: attempt + 1,
                });
              };

              xhr.onerror = () => {
                const netErr = new Error('Network interruption occurred during document upload.');
                failWith(netErr);
              };

              xhr.onload = () => {
                if (settled) return;
                settled = true;
                cleanup();
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve();
                  return;
                }
                let serverMsg = `Upload failed with HTTP ${xhr.status}.`;
                let serverErrorCode = '';
                let serverRecoveryAction = '';
                try {
                  const parsed = JSON.parse(xhr.responseText || '{}');
                  if (parsed?.error) serverMsg = String(parsed.error);
                  if (parsed?.errorCode) serverErrorCode = String(parsed.errorCode);
                  if (parsed?.recoveryAction) serverRecoveryAction = String(parsed.recoveryAction);
                } catch {
                  // ignore non-JSON body
                }
                if (serverErrorCode === 'storage_iam_permission_required') {
                  reject(
                    new SmartApplicationServiceError('storage-error', serverMsg, {
                      storageErrorCode: 'storage/unauthorized',
                      recoveryAction:
                        serverRecoveryAction ||
                        'Grant the Storage Object User (roles/storage.objectUser) IAM role on bucket "everykr.firebasestorage.app" to the server runtime service account, then click Retry.',
                      retryable: false,
                    })
                  );
                  return;
                }
                if (xhr.status === 400 || xhr.status === 413) {
                  reject(
                    new SmartApplicationServiceError('storage-error', serverMsg, {
                      storageErrorCode: 'validation-error',
                      recoveryAction:
                        serverRecoveryAction ||
                        'Select a valid PDF, JPG, PNG, HEIC, or ZIP document under 20 MB.',
                      retryable: false,
                    })
                  );
                  return;
                }
                const err = new Error(serverMsg);
                if (xhr.status === 401) (err as any).code = 'storage/unauthenticated';
                else if (xhr.status === 403 || xhr.status === 409) {
                  (err as any).code = 'storage/unauthorized';
                }
                reject(err);
              };

              xhr.send(normalizedFile);
            });

          const proxyHeaders: Record<string, string> = {
            'Content-Type': canonicalContentType,
            'x-upload-token': String(authData.uploadToken),
          };
          if (authHeaders.Authorization) proxyHeaders.Authorization = authHeaders.Authorization;
          if (authHeaders['x-firebase-id-token']) {
            proxyHeaders['x-firebase-id-token'] = authHeaders['x-firebase-id-token'];
          }

          if (authData.mode === 'signed_url' && typeof authData.signedUploadUrl === 'string') {
            try {
              await uploadViaXhr(
                authData.signedUploadUrl,
                (authData.signedHeaders as Record<string, string>) || {
                  'Content-Type': canonicalContentType,
                }
              );
            } catch (signedErr: any) {
              // If direct signed-URL PUT failed before transferring bytes (e.g. bucket CORS not yet applied),
              // transparently complete via the same-origin single-use server upload proxy.
              if (
                signedErr?.name === 'AbortError' ||
                highestBytesTransferred > 0 ||
                (signedErr as any)?.code === 'storage/unauthorized'
              ) {
                throw signedErr;
              }
              await uploadViaXhr(
                String(authData.uploadEndpoint || '/api/smart-applications/documents/upload'),
                proxyHeaders
              );
            }
          } else {
            await uploadViaXhr(
              String(authData.uploadEndpoint || '/api/smart-applications/documents/upload'),
              proxyHeaders
            );
          }

          verifiedFullPath = authorizedStoragePath;
        }

        // Upload succeeded — break out of retry loop
        lastError = null;
        break;
      } catch (attemptErr: unknown) {
        const classified = await classifyFirebaseStorageUploadError(
          attemptErr,
          highestBytesTransferred
        );
        lastError = classified;

        const isNonRetryable =
          !classified.retryable ||
          classified.storageErrorCode === 'storage/unauthorized' ||
          classified.storageErrorCode === 'storage/unauthenticated' ||
          classified.storageErrorCode === 'storage/canceled' ||
          classified.storageErrorCode === 'storage/quota-exceeded' ||
          classified.storageErrorCode === 'validation-error';

        if (isNonRetryable || attempt >= maxRetries) {
          throw classified;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    params.onProgress?.({
      bytesTransferred: normalizedFile.size,
      totalBytes: normalizedFile.size,
      percent: 100,
      stage: 'verifying',
    });

    const expectedPathPrefix = `applications/${activeUid}/${params.applicationId}/${safeDocType}/`;
    if (
      !verifiedFullPath ||
      (params.customTransport
        ? verifiedFullPath !== storagePath
        : !verifiedFullPath.startsWith(expectedPathPrefix))
    ) {
      throw new SmartApplicationServiceError(
        'storage-error',
        'Storage upload completion could not be verified (storage/unknown).',
        {
          storageErrorCode: 'storage/unknown',
          recoveryAction: 'Please click Retry to re-verify your document upload.',
          retryable: true,
        }
      );
    }

    const resolvedLabel = params.label || safeDocType;
    const uploadedItem: SmartApplicationDocumentItem = {
      docType: safeDocType,
      label: resolvedLabel,
      category: classifyDocumentCategory(safeDocType, resolvedLabel),
      fileName: normalizedFile.name,
      storagePath: verifiedFullPath,
      size: normalizedFile.size,
      mimeType: canonicalContentType,
      uploadedAt: new Date().toISOString(),
      aiDetected: Boolean(params.aiDetected),
      verified: Boolean(params.verified),
      verificationStatus: params.verified ? 'verified' : 'pending',
      version: 1,
      previousVersions: [],
      qualityWarnings: params.qualityWarnings || [],
      needsCheck: Boolean(params.qualityWarnings && params.qualityWarnings.length > 0),
    };

    // Cache completed Storage item BEFORE Firestore sync so any Firestore failure can recover without re-uploading
    completedStorageUploads.set(cacheKey, uploadedItem);
    saveCompletedStorageCacheToSession();

    if (params.syncFirestoreMetadata !== false) {
      params.onProgress?.({
        bytesTransferred: normalizedFile.size,
        totalBytes: normalizedFile.size,
        percent: 100,
        stage: 'saving_metadata',
      });
      return await persistSmartApplicationDocumentMetadata({
        userId: activeUid,
        applicationId: params.applicationId,
        docType: safeDocType,
        item: uploadedItem,
        requiredDocTypes: params.requiredDocTypes,
        customFirestoreWriter: params.customTransport?.persistMetadata,
      });
    }

    return uploadedItem;
  })();

  inFlightUploads.set(cacheKey, uploadTaskPromise);
  try {
    return await uploadTaskPromise;
  } finally {
    inFlightUploads.delete(cacheKey);
  }
}

/**
 * Merges a newly uploaded document with any prior version for the same `docType`,
 * preserving previous document versions in `previousVersions` (never silently deleting
 * or losing historical uploads).
 */
export function mergeDocumentWithVersionHistory(
  existingDoc: SmartApplicationDocumentItem | undefined,
  nextDoc: SmartApplicationDocumentItem
): SmartApplicationDocumentItem {
  const category = nextDoc.category || classifyDocumentCategory(nextDoc.docType, nextDoc.label);
  if (!existingDoc || !existingDoc.storagePath) {
    return {
      ...nextDoc,
      category,
      version: Math.max(1, Number(nextDoc.version || 1)),
      verificationStatus: nextDoc.verificationStatus || (nextDoc.verified ? 'verified' : 'pending'),
      previousVersions: nextDoc.previousVersions || [],
    };
  }

  // If re-saving the exact same storagePath, keep existing version metadata intact
  if (existingDoc.storagePath === nextDoc.storagePath) {
    return {
      ...existingDoc,
      ...nextDoc,
      category,
      version: Math.max(1, Number(existingDoc.version || 1)),
      previousVersions: existingDoc.previousVersions || [],
    };
  }

  const prevVersionNumber = Math.max(1, Number(existingDoc.version || 1));
  const archivedEntry: SmartApplicationDocumentVersion = {
    version: prevVersionNumber,
    fileName: existingDoc.fileName,
    storagePath: existingDoc.storagePath,
    size: existingDoc.size,
    mimeType: existingDoc.mimeType,
    uploadedAt: existingDoc.uploadedAt,
    replacedAt: nextDoc.uploadedAt || new Date().toISOString(),
    verificationStatus:
      existingDoc.verificationStatus || (existingDoc.verified ? 'verified' : 'pending'),
    verificationNote: existingDoc.verificationNote || '',
  };

  const priorHistory = Array.isArray(existingDoc.previousVersions)
    ? existingDoc.previousVersions
    : [];

  return {
    ...nextDoc,
    category,
    version: prevVersionNumber + 1,
    verified: false,
    verificationStatus: 'pending',
    verificationNote: '',
    verifiedByUid: undefined,
    verifiedByName: undefined,
    verifiedAt: undefined,
    previousVersions: [archivedEntry, ...priorHistory].slice(0, 10),
  };
}

/**
 * Deletes a file from Firebase Storage (only if it belongs to this application, not reused from another).
 */
export async function deleteSmartApplicationStorageFile(
  item: SmartApplicationDocumentItem,
  currentApplicationId: string
): Promise<void> {
  if (!item?.storagePath) return;
  if (
    item.reusedFromApplicationId &&
    item.reusedFromApplicationId !== currentApplicationId
  ) {
    return;
  }
  try {
    await requireActiveFirebaseUid();
    await deleteObject(ref(storage, item.storagePath));
  } catch (err) {
    console.warn('[SmartApplication] Storage delete warning:', err instanceof Error ? err.message : 'delete skipped');
  }
}

function parseApplicationIdFromStoragePath(storagePath: string): string | null {
  const parts = String(storagePath || '').split('/');
  if (parts.length >= 5 && parts[0] === 'applications' && /^[a-zA-Z0-9_-]{1,128}$/.test(parts[2])) {
    return parts[2];
  }
  return null;
}

/**
 * Requests backend-mediated read authorization (`/api/smart-applications/documents/authorize-read`)
 * for private Smart Application documents. Required for Assigned Counsellors (since storage.rules
 * intentionally withholds global counsellor Storage reads to enforce `assignedTo` isolation) and
 * also enforces least-privilege Viewer denial.
 */
async function fetchAuthorizedBackendDocumentBlob(
  storagePath: string,
  applicationId?: string
): Promise<Blob> {
  const resolvedAppId = applicationId || parseApplicationIdFromStoragePath(storagePath);
  if (!resolvedAppId) {
    throw new SmartApplicationServiceError(
      'storage-error',
      'Could not determine application ID for private document access.',
      { storageErrorCode: 'storage/unauthorized', retryable: false }
    );
  }

  const headers = await buildAuthHeaders();
  const authRes = await fetch('/api/smart-applications/documents/authorize-read', {
    method: 'POST',
    headers,
    body: JSON.stringify({ applicationId: resolvedAppId, storagePath }),
  });

  const authData = await authRes.json().catch(() => ({} as Record<string, any>));
  if (!authRes.ok || !authData?.ok) {
    throw new SmartApplicationServiceError(
      'storage-error',
      authData?.error || 'You are not authorized to access this private document.',
      {
        storageErrorCode: authRes.status === 401 ? 'storage/unauthenticated' : 'storage/unauthorized',
        retryable: false,
      }
    );
  }

  if (authData.mode === 'signed_url' && typeof authData.signedReadUrl === 'string') {
    try {
      const signedRes = await fetch(authData.signedReadUrl, { cache: 'no-store' });
      if (signedRes.ok) {
        return await signedRes.blob();
      }
    } catch {
      // Fall back to authenticated single-use stream endpoint if bucket CORS blocks browser fetch
    }
  }

  if (typeof authData.streamUrl === 'string') {
    const streamHeaders: Record<string, string> = {};
    if (headers.Authorization) streamHeaders.Authorization = headers.Authorization;
    if (headers['x-firebase-id-token']) {
      streamHeaders['x-firebase-id-token'] = headers['x-firebase-id-token'];
    }
    const streamRes = await fetch(authData.streamUrl, {
      method: 'GET',
      headers: streamHeaders,
      cache: 'no-store',
    });
    if (!streamRes.ok) {
      const errBody = await streamRes.json().catch(() => ({} as Record<string, any>));
      throw new SmartApplicationServiceError(
        'storage-error',
        errBody?.error || 'Authorized document stream failed.',
        {
          storageErrorCode: 'storage/unauthorized',
          recoveryAction: errBody?.recoveryAction,
          retryable: false,
        }
      );
    }
    return await streamRes.blob();
  }

  throw new SmartApplicationServiceError(
    'storage-error',
    'Authorized document retrieval channel was unavailable.',
    { storageErrorCode: 'storage/unknown', retryable: true }
  );
}

/**
 * Fetches a private document directly as an authenticated Blob via Firebase Storage SDK
 * (`getBlob`) for owners/admins, falling back to authoritative backend read authorization
 * (`/api/smart-applications/documents/authorize-read`) for assigned counsellors.
 */
export async function fetchPrivateDocumentBlob(
  storagePath: string,
  applicationId?: string
): Promise<Blob> {
  await requireActiveFirebaseUid();
  try {
    return await getBlob(ref(storage, storagePath));
  } catch {
    return await fetchAuthorizedBackendDocumentBlob(storagePath, applicationId);
  }
}

/**
 * Loads a private document into an ephemeral browser `blob:` object URL (caller MUST revoke via
 * `URL.revokeObjectURL` when closing preview/unmounting). Uses direct `getBlob` for owners/admins
 * and authoritative backend read authorization for assigned counsellors.
 */
export async function fetchPrivateDocumentBlobUrl(
  storagePath?: string,
  legacyFallbackUrl?: string,
  applicationId?: string
): Promise<{ url: string; isObjectUrl: boolean }> {
  await requireActiveFirebaseUid();
  if (storagePath) {
    try {
      const blob = await getBlob(ref(storage, storagePath));
      return { url: URL.createObjectURL(blob), isObjectUrl: true };
    } catch {
      try {
        const blob = await fetchAuthorizedBackendDocumentBlob(storagePath, applicationId);
        return { url: URL.createObjectURL(blob), isObjectUrl: true };
      } catch {
        const signedUrl = await getDownloadURL(ref(storage, storagePath));
        return { url: signedUrl, isObjectUrl: false };
      }
    }
  }
  if (legacyFallbackUrl) {
    return { url: legacyFallbackUrl, isObjectUrl: false };
  }
  throw new SmartApplicationServiceError('storage-error', 'Document storage path is missing.');
}

/**
 * Backwards-compatible alias kept for any legacy caller; prefers `fetchPrivateDocumentBlobUrl`.
 */
export async function getFreshDocumentDownloadUrl(storagePath: string): Promise<string> {
  const { url } = await fetchPrivateDocumentBlobUrl(storagePath);
  return url;
}

/**
 * Submits (or resubmits after `documents_missing`) an application using targeted `updateDoc`,
 * writes an immutable history event, and triggers student notification email via server endpoint.
 */
export async function submitSmartApplication(params: {
  app: SmartApplicationRecord;
  actorName: string;
  actorEmail: string;
  isResubmission?: boolean;
}): Promise<SmartApplicationRecord> {
  const activeUid = await requireActiveFirebaseUid(params.app.userId);
  const now = new Date().toISOString();
  const prevStatus = normalizeSmartApplicationStatus(params.app.status);
  const nextStatus: SmartApplicationStatus = 'submitted';

  if (!isAllowedStatusTransition({ from: prevStatus, to: nextStatus, actorRole: 'student' })) {
    throw new SmartApplicationServiceError(
      'invalid-transition',
      `Application cannot be submitted from status "${prevStatus}".`
    );
  }

  const normalizedPassport = normalizePassportNumber(params.app.personal.passportNumber);
  const isResubmitFromMissing = Boolean(params.isResubmission || prevStatus === 'documents_missing');

  const submittedApp: SmartApplicationRecord = {
    ...params.app,
    status: nextStatus,
    passportNumberNormalized: normalizedPassport,
    consent: {
      ...params.app.consent,
      dataProcessing: true,
      aiProcessing: Boolean(params.app.consent?.aiProcessing),
      acceptedAt: params.app.consent?.acceptedAt || now,
      consentedByUid: activeUid,
    },
    submittedAt: params.app.submittedAt || now,
    updatedAt: now,
    requestedDocuments: isResubmitFromMissing ? [] : params.app.requestedDocuments || [],
    requestedDocumentsMessage: isResubmitFromMissing ? '' : params.app.requestedDocumentsMessage || '',
  };

  const patchPayload: Record<string, any> = isResubmitFromMissing
    ? {
        documents: submittedApp.documents,
        requiredDocTypes: submittedApp.requiredDocTypes || [],
        requestedDocuments: [],
        requestedDocumentsMessage: '',
        status: nextStatus,
        updatedAt: now,
      }
    : {
        intake: submittedApp.intake,
        intakeStartDate: submittedApp.intakeStartDate || '',
        applicationDeadline: submittedApp.applicationDeadline || '',
        degreeLevel: submittedApp.degreeLevel,
        round: submittedApp.round,
        personal: submittedApp.personal,
        education: submittedApp.education,
        language: submittedApp.language,
        program: submittedApp.program,
        finance: submittedApp.finance,
        documents: submittedApp.documents,
        requiredDocTypes: submittedApp.requiredDocTypes || [],
        requestedDocuments: submittedApp.requestedDocuments || [],
        requestedDocumentsMessage: submittedApp.requestedDocumentsMessage || '',
        aiFilledFields: submittedApp.aiFilledFields || [],
        aiCheckWarningFields: submittedApp.aiCheckWarningFields || [],
        verifiedFields: submittedApp.verifiedFields || [],
        ...(submittedApp.aiPassportSnapshot
          ? { aiPassportSnapshot: submittedApp.aiPassportSnapshot }
          : {}),
        consent: submittedApp.consent,
        passportNumberNormalized: normalizedPassport,
        status: nextStatus,
        submittedAt: submittedApp.submittedAt,
        updatedAt: now,
      };

  try {
    await withTimeout(
      updateDoc(doc(db, APPLICATIONS_COLLECTION, submittedApp.id), sanitizeFirestorePayload(patchPayload)),
      12000
    );

    await addApplicationHistoryEvent(submittedApp.id, {
      actorUid: activeUid,
      actorName: params.actorName,
      actorEmail: params.actorEmail,
      actorRole: 'student',
      eventType: isResubmitFromMissing ? 'documents_uploaded' : 'submitted',
      when: now,
      from: prevStatus,
      to: nextStatus,
      message: isResubmitFromMissing
        ? 'Student uploaded requested documents and resubmitted application.'
        : 'Student submitted application for review.',
    });

    await saveUserApplicationProfile(activeUid, {
      personal: submittedApp.personal,
      education: submittedApp.education,
      language: submittedApp.language,
    });

    const studentFullName =
      `${submittedApp.personal?.givenNames || ''} ${submittedApp.personal?.surname || ''}`.trim() ||
      params.actorName ||
      'Student';

    // Notify admin portal & assigned counsellor (non-blocking)
    createAdminPlatformNotificationDoc({
      type: 'new_university_application',
      title: isResubmitFromMissing
        ? `Documents Resubmitted — ${submittedApp.universityName}`
        : `New Application Submitted — ${submittedApp.universityName}`,
      message: `${studentFullName} (${submittedApp.degreeLevel}, ${submittedApp.intake}) ${
        isResubmitFromMissing
          ? 'uploaded requested documents and resubmitted'
          : 'submitted a new application'
      } [${submittedApp.id}].`,
      relatedRecordId: submittedApp.id,
      studentId: activeUid,
      studentName: studentFullName,
    }).catch(() => {});

    if (submittedApp.assignedTo) {
      pushStudentPortalNotificationDoc(submittedApp.assignedTo, {
        title: `Assigned Application Updated — ${submittedApp.universityName}`,
        message: `${studentFullName} submitted updated documents for application ${submittedApp.id}.`,
        type: 'info',
        actionTab: 'applications',
      }).catch(() => {});
    }

    // Student portal confirmation notification (non-blocking)
    pushStudentPortalNotificationDoc(activeUid, {
      title: isResubmitFromMissing
        ? `Documents Received — ${submittedApp.universityName}`
        : `Application Submitted — ${submittedApp.universityName}`,
      message: isResubmitFromMissing
        ? `Your replacement documents for ${submittedApp.universityName} (${submittedApp.intake}) have been received for review.`
        : `Your ${submittedApp.degreeLevel} application for ${submittedApp.universityName} (${submittedApp.intake}) has been submitted.`,
      type: 'success',
      actionTab: 'applications',
    }).catch(() => {});

    // Fire-and-forget confirmation email
    triggerStatusNotificationEmail({
      application: submittedApp,
      fromStatus: prevStatus,
      toStatus: nextStatus,
      eventType: isResubmitFromMissing ? 'replacement_uploaded' : 'status_change',
      message: isResubmitFromMissing
        ? 'We received your updated documents and moved your application back into the review queue.'
        : 'Thank you for applying via EVERYKR. Our admissions team will review your application and documents shortly.',
    }).catch(() => {});

    return submittedApp;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${APPLICATIONS_COLLECTION}/${submittedApp.id}`);
    wrapFirestoreFailure(err);
  }
}

/**
 * Student replacement document upload (used during `documents_missing` or checklist replacement).
 * Preserves full previous document version history, updates requested-document status, logs an
 * immutable history entry, and notifies the assigned counsellor & admin portal.
 */
export async function studentUploadReplacementDocument(params: {
  app: SmartApplicationRecord;
  docType: string;
  label: string;
  file: File;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  signal?: AbortSignal;
  onProgress?: (progress: { bytesTransferred: number; totalBytes: number; percent: number }) => void;
}): Promise<SmartApplicationRecord> {
  const activeUid = await requireActiveFirebaseUid(params.actorUid || params.app.userId);
  const uploaded = await uploadSmartApplicationDocument({
    userId: activeUid,
    applicationId: params.app.id,
    docType: params.docType,
    label: params.label,
    file: params.file,
    signal: params.signal,
    onProgress: params.onProgress,
  });

  const existingDoc = params.app.documents?.[params.docType];
  const mergedDoc = mergeDocumentWithVersionHistory(existingDoc, uploaded);

  const nextRequested = (params.app.requestedDocuments || []).map((req) =>
    req.docType === params.docType ? { ...req, status: 'uploaded' as const } : req
  );

  const nextAppDraft: SmartApplicationRecord = {
    ...params.app,
    documents: {
      ...(params.app.documents || {}),
      [params.docType]: mergedDoc,
    },
    requestedDocuments: nextRequested,
  };

  const saved = await saveSmartApplicationDraft(nextAppDraft);
  const now = new Date().toISOString();

  // Log immutable history event for replacement upload (non-blocking)
  addApplicationHistoryEvent(saved.id, {
    actorUid: activeUid,
    actorName: params.actorName,
    actorEmail: params.actorEmail,
    actorRole: 'student',
    eventType: 'documents_uploaded',
    when: now,
    from: normalizeSmartApplicationStatus(saved.status),
    to: normalizeSmartApplicationStatus(saved.status),
    message: `Student uploaded ${mergedDoc.version && mergedDoc.version > 1 ? `v${mergedDoc.version} replacement` : 'new file'} for "${params.label}" (${params.file.name}).`,
    requestedDocuments: [params.label],
  }).catch(() => {});

  const studentFullName =
    `${saved.personal?.givenNames || ''} ${saved.personal?.surname || ''}`.trim() ||
    params.actorName ||
    'Student';

  createAdminPlatformNotificationDoc({
    type: 'new_document_upload',
    title: `Replacement Document Uploaded — ${saved.universityName}`,
    message: `${studentFullName} uploaded "${params.label}" (v${mergedDoc.version || 1}) for application ${saved.id}.`,
    relatedRecordId: saved.id,
    studentId: activeUid,
    studentName: studentFullName,
  }).catch(() => {});

  if (saved.assignedTo) {
    pushStudentPortalNotificationDoc(saved.assignedTo, {
      title: `Student Uploaded Requested Document`,
      message: `${studentFullName} uploaded "${params.label}" for ${saved.universityName} (${saved.id}).`,
      type: 'info',
      actionTab: 'applications',
    }).catch(() => {});
  }

  return saved;
}

/**
 * Allows a student to withdraw their own pre-decision application (`draft`, `submitted`,
 * `under_review`, or `documents_missing`), writes an immutable history entry, and sends a confirmation email.
 */
export async function withdrawSmartApplication(params: {
  app: SmartApplicationRecord;
  actorName: string;
  actorEmail: string;
  reason?: string;
}): Promise<SmartApplicationRecord> {
  const activeUid = await requireActiveFirebaseUid(params.app.userId);
  const prevStatus = normalizeSmartApplicationStatus(params.app.status);

  if (!isAllowedStatusTransition({ from: prevStatus, to: 'withdrawn', actorRole: 'student' })) {
    throw new SmartApplicationServiceError(
      'invalid-transition',
      'This application can no longer be withdrawn because a university decision or later stage has already been reached.'
    );
  }

  const now = new Date().toISOString();
  const reasonText =
    params.reason?.trim() || 'Student withdrew this application from My Applications.';

  try {
    await withTimeout(
      updateDoc(doc(db, APPLICATIONS_COLLECTION, params.app.id), {
        status: 'withdrawn',
        updatedAt: now,
      }),
      12000
    );

    await addApplicationHistoryEvent(params.app.id, {
      actorUid: activeUid,
      actorName: params.actorName,
      actorEmail: params.actorEmail,
      actorRole: 'student',
      when: now,
      from: prevStatus,
      to: 'withdrawn',
      message: reasonText.slice(0, 500),
    });

    const withdrawnRecord: SmartApplicationRecord = {
      ...params.app,
      status: 'withdrawn',
      updatedAt: now,
    };

    triggerStatusNotificationEmail({
      application: withdrawnRecord,
      fromStatus: prevStatus,
      toStatus: 'withdrawn',
      message: 'Your application has been withdrawn at your request. You may start a new application at any time.',
    }).catch(() => {});

    return withdrawnRecord;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${APPLICATIONS_COLLECTION}/${params.app.id}`);
    wrapFirestoreFailure(err);
  }
}

/**
 * Triggers the server-side email notification endpoint on application status change,
 * counsellor assignment, document acceptance, or direct staff message.
 */
export async function triggerStatusNotificationEmail(params: {
  application: SmartApplicationRecord;
  fromStatus: SmartApplicationStatus | null;
  toStatus: SmartApplicationStatus;
  eventType?:
    | 'status_change'
    | 'assigned'
    | 'documents_accepted'
    | 'direct_message'
    | 'replacement_uploaded';
  message?: string;
  requestedDocuments?: string[];
  requestedDeadline?: string;
}): Promise<{ ok: boolean; delivered?: boolean; provider?: string }> {
  try {
    const headers = await buildAuthHeaders();
    const studentName = `${params.application.personal.givenNames || ''} ${
      params.application.personal.surname || ''
    }`.trim();

    const response = await fetch('/api/smart-applications/notify-status', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        studentName: studentName || 'Applicant',
        studentEmail: params.application.personal.email,
        universityName: params.application.universityName,
        intake: params.application.intake,
        degreeLevel: params.application.degreeLevel,
        applicationId: params.application.id,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        eventType: params.eventType || 'status_change',
        message: params.message,
        requestedDocuments: params.requestedDocuments,
        requestedDeadline: params.requestedDeadline,
      }),
    });
    return await response.json().catch(() => ({ ok: false }));
  } catch {
    return { ok: false };
  }
}

export function mapSmartAiCodeToCanonicalErrorCode(
  code?: SmartUploadAiErrorCode
): PassportCanonicalErrorCode {
  switch (code) {
    case 'timeout':
      return 'GEMINI_TIMEOUT';
    case 'cancelled':
      return 'REQUEST_CANCELLED';
    case 'offline':
      return 'CLIENT_OFFLINE';
    case 'rate_limited':
      return 'RATE_LIMITED';
    case 'auth_required':
      return 'AUTH_REQUIRED';
    case 'api_permission_denied':
      return 'API_KEY_INVALID';
    case 'endpoint_or_model_not_found':
      return 'MODEL_NOT_FOUND';
    case 'payload_too_large':
      return 'PAYLOAD_TOO_LARGE';
    case 'invalid_image':
      return 'INVALID_IMAGE';
    case 'internal_error':
      return 'INTERNAL_ERROR';
    case 'service_unavailable':
      return 'SERVICE_UNAVAILABLE';
    case 'safety_blocked':
      return 'SAFETY_BLOCKED';
    case 'empty_ai_response':
      return 'EMPTY_AI_RESPONSE';
    case 'malformed_ai_json':
      return 'MALFORMED_AI_JSON';
    case 'missing_candidates':
      return 'MISSING_CANDIDATES';
    case 'unreadable':
      return 'UNREADABLE_PASSPORT';
    case 'empty_server_response':
      return 'EMPTY_SERVER_RESPONSE';
    case 'unexpected_html_response':
      return 'UNEXPECTED_HTML_RESPONSE';
    case 'malformed_server_json':
      return 'MALFORMED_SERVER_JSON';
    case 'invalid_response_schema':
      return 'INVALID_RESPONSE_SCHEMA';
    default:
      return 'AI_EXTRACTION_FAILED';
  }
}

export function mapCanonicalErrorCodeToSmartAiCode(
  canonical?: string | null
): SmartUploadAiErrorCode | undefined {
  switch (String(canonical || '').trim().toUpperCase()) {
    case 'GEMINI_TIMEOUT':
      return 'timeout';
    case 'REQUEST_CANCELLED':
      return 'cancelled';
    case 'CLIENT_OFFLINE':
      return 'offline';
    case 'RATE_LIMITED':
      return 'rate_limited';
    case 'AUTH_REQUIRED':
      return 'auth_required';
    case 'API_KEY_INVALID':
      return 'api_permission_denied';
    case 'MODEL_NOT_FOUND':
      return 'endpoint_or_model_not_found';
    case 'PAYLOAD_TOO_LARGE':
      return 'payload_too_large';
    case 'INVALID_IMAGE':
      return 'invalid_image';
    case 'INTERNAL_ERROR':
      return 'internal_error';
    case 'SERVICE_UNAVAILABLE':
      return 'service_unavailable';
    case 'SAFETY_BLOCKED':
      return 'safety_blocked';
    case 'EMPTY_AI_RESPONSE':
      return 'empty_ai_response';
    case 'MALFORMED_AI_JSON':
      return 'malformed_ai_json';
    case 'MISSING_CANDIDATES':
      return 'missing_candidates';
    case 'UNREADABLE_PASSPORT':
      return 'unreadable';
    case 'EMPTY_SERVER_RESPONSE':
      return 'empty_server_response';
    case 'UNEXPECTED_HTML_RESPONSE':
      return 'unexpected_html_response';
    case 'MALFORMED_SERVER_JSON':
      return 'malformed_server_json';
    case 'INVALID_RESPONSE_SCHEMA':
      return 'invalid_response_schema';
    case 'AI_EXTRACTION_FAILED':
      return 'internal_error';
    default:
      return undefined;
  }
}

function buildEmptyPassportResponse(
  errorCode: PassportExtractionApiResponse['errorCode'],
  message: string,
  retryable: boolean,
  meta?: {
    requestId?: string;
    httpStatus?: number;
    canonicalErrorCode?: PassportCanonicalErrorCode;
    modelUsed?: string;
  }
): PassportExtractionApiResponse {
  const canonicalCode =
    meta?.canonicalErrorCode || mapSmartAiCodeToCanonicalErrorCode(errorCode);
  return {
    success: false,
    error: {
      code: canonicalCode,
      message,
      retryable,
    },
    canonicalErrorCode: canonicalCode,
    ok: false,
    readable: false,
    errorCode,
    retryable,
    requestId: meta?.requestId,
    httpStatus: meta?.httpStatus,
    modelUsed: meta?.modelUsed,
    message,
    extracted: {
      mrzLine1: '',
      mrzLine2: '',
      surname: '',
      givenNames: '',
      passportNumber: '',
      nationalityIso3: '',
      nationalityName: '',
      dateOfBirth: '',
      sex: '',
      expiryDate: '',
      issueDate: '',
      placeOfBirth: '',
    },
    mrzValidation: {
      hasMrz: false,
      isValid: false,
      passportCheckPassed: false,
      dobCheckPassed: false,
      expiryCheckPassed: false,
      compositeCheckPassed: false,
      warnings: [],
    },
    trustedSource: 'none',
    needsCheckFields: [],
  };
}

export function classifyHttpStatusToSmartAiError(
  status: number,
  context: 'passport' | 'classify'
): {
  errorCode: NonNullable<PassportExtractionApiResponse['errorCode']>;
  canonicalCode: PassportCanonicalErrorCode;
  message: string;
  retryable: boolean;
} {
  const label = context === 'passport' ? 'Passport analysis' : 'Document classification';
  switch (status) {
    case 400:
      return {
        errorCode: 'invalid_image',
        canonicalCode: 'INVALID_IMAGE',
        message: `${label} rejected the uploaded image format. Please upload a clear JPG, PNG, or PDF file, or enter details manually.`,
        retryable: false,
      };
    case 401:
      return {
        errorCode: 'auth_required',
        canonicalCode: 'AUTH_REQUIRED',
        message: `Your sign-in session expired before ${label.toLowerCase()} could run. Please sign in again and click Retry.`,
        retryable: false,
      };
    case 403:
      return {
        errorCode: 'api_permission_denied',
        canonicalCode: 'API_KEY_INVALID',
        message: `${label} was denied by the AI service (HTTP 403). Your file is saved — please enter your details manually or check server API key permissions.`,
        retryable: false,
      };
    case 404:
      return {
        errorCode: 'endpoint_or_model_not_found',
        canonicalCode: 'MODEL_NOT_FOUND',
        message: `The ${label.toLowerCase()} endpoint or AI model was not found (HTTP 404). Your file is saved — please enter your details manually.`,
        retryable: false,
      };
    case 413:
      return {
        errorCode: 'payload_too_large',
        canonicalCode: 'PAYLOAD_TOO_LARGE',
        message: `The uploaded file preview is too large for ${label.toLowerCase()} (HTTP 413). Upload a smaller image or enter details manually.`,
        retryable: false,
      };
    case 422:
      return {
        errorCode: 'unreadable',
        canonicalCode: 'UNREADABLE_PASSPORT',
        message: `${label} could not read details from this image (HTTP 422). Your file is saved — click Retry AI Scan or enter details manually.`,
        retryable: true,
      };
    case 429:
      return {
        errorCode: 'rate_limited',
        canonicalCode: 'RATE_LIMITED',
        message: `Too many scan requests right now (HTTP 429). Please wait a few seconds and click Retry AI Scan, or enter details manually.`,
        retryable: true,
      };
    case 500:
      return {
        errorCode: 'internal_error',
        canonicalCode: 'INTERNAL_ERROR',
        message: `An internal error occurred during ${label.toLowerCase()} (HTTP 500). Your file is saved — click Retry AI Scan or enter details manually.`,
        retryable: true,
      };
    case 504:
      return {
        errorCode: 'timeout',
        canonicalCode: 'GEMINI_TIMEOUT',
        message: `${label} timed out on the server (HTTP 504). Your file is saved — click Retry AI Scan or enter details manually.`,
        retryable: true,
      };
    case 502:
    case 503:
      return {
        errorCode: 'service_unavailable',
        canonicalCode: 'SERVICE_UNAVAILABLE',
        message: `The AI document service is temporarily unavailable (HTTP ${status}). Your file is saved — click Retry AI Scan in a few seconds or enter details manually.`,
        retryable: true,
      };
    default:
      return {
        errorCode: 'unknown',
        canonicalCode: 'AI_EXTRACTION_FAILED',
        message: `${label} failed with an unexpected server response (HTTP ${status || 'unknown'}). Your file is saved — click Retry AI Scan or enter details manually.`,
        retryable: status >= 500 || status === 0 || status === 200,
      };
  }
}

function normalizeGenderValue(raw: unknown): 'Male' | 'Female' | 'Other' | '' {
  const v = String(raw || '').trim().toUpperCase();
  if (v === 'M' || v === 'MALE') return 'Male';
  if (v === 'F' || v === 'FEMALE') return 'Female';
  if (v === 'X' || v === 'OTHER') return 'Other';
  return '';
}

function looksLikeHtmlDocument(rawText: string): boolean {
  const trimmed = rawText.trimStart().toLowerCase();
  return (
    trimmed.startsWith('<!doctype html') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<head') ||
    trimmed.startsWith('<body') ||
    trimmed.startsWith('<?xml')
  );
}

/**
 * Strictly validates an HTTP Response from POST /api/smart-applications/ai/extract-passport:
 * 1. Reads raw text safely and rejects empty bodies (even on HTTP 200!)
 * 2. Verifies `Content-Type: application/json` and detects HTML SPA/proxy fallbacks explicitly
 * 3. Safely parses JSON and catches truncated/malformed JSON explicitly
 * 4. Validates the canonical `{ success: true, data, warnings, requestId }` vs `{ success: false, error, requestId }` contract
 * 5. Never treats an empty or schema-invalid HTTP 200 response as success
 */
export async function parsePassportExtractionHttpResponse(
  response: Pick<Response, 'status' | 'headers' | 'text'>
): Promise<PassportExtractionApiResponse> {
  const httpStatus = Number(response.status || 0);
  const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
  const headerRequestId = response.headers?.get?.('x-request-id') || undefined;

  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    rawText = '';
  }

  // 1. Empty response body (including empty HTTP 200)
  if (!rawText || !rawText.trim()) {
    return buildEmptyPassportResponse(
      'empty_server_response',
      `Passport analysis received an empty response from the server (HTTP ${httpStatus || 'unknown'}). Your file is already saved — click Retry AI Scan or enter details manually.`,
      true,
      {
        requestId: headerRequestId,
        httpStatus,
        canonicalErrorCode: 'EMPTY_SERVER_RESPONSE',
      }
    );
  }

  // 2. Non-JSON / HTML fallback detection (e.g., proxy or SPA index.html returned with HTTP 200)
  const hasJsonContentType =
    contentType.includes('application/json') || contentType.includes('+json');
  if (looksLikeHtmlDocument(rawText) || (contentType && !hasJsonContentType)) {
    return buildEmptyPassportResponse(
      'unexpected_html_response',
      looksLikeHtmlDocument(rawText) || contentType.includes('text/html')
        ? `Passport analysis received an HTML page instead of a JSON API response (HTTP ${httpStatus || 'unknown'}). Your file is already saved — click Retry AI Scan or enter details manually.`
        : `Passport analysis received an unexpected response format (${contentType || 'non-JSON'}, HTTP ${httpStatus || 'unknown'}). Your file is already saved — click Retry AI Scan or enter details manually.`,
      true,
      {
        requestId: headerRequestId,
        httpStatus,
        canonicalErrorCode: 'UNEXPECTED_HTML_RESPONSE',
      }
    );
  }

  // 3. Safe JSON parsing
  let parsed: any = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return buildEmptyPassportResponse(
      'malformed_server_json',
      `Passport analysis received malformed JSON from the server (HTTP ${httpStatus || 'unknown'}). Your file is already saved — click Retry AI Scan or enter details manually.`,
      true,
      {
        requestId: headerRequestId,
        httpStatus,
        canonicalErrorCode: 'MALFORMED_SERVER_JSON',
      }
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return buildEmptyPassportResponse(
      'invalid_response_schema',
      `Passport analysis received an invalid JSON payload structure (HTTP ${httpStatus || 'unknown'}). Your file is already saved — click Retry AI Scan or enter details manually.`,
      true,
      {
        requestId: headerRequestId,
        httpStatus,
        canonicalErrorCode: 'INVALID_RESPONSE_SCHEMA',
      }
    );
  }

  const requestId =
    typeof parsed.requestId === 'string' && parsed.requestId.trim()
      ? parsed.requestId.trim()
      : headerRequestId;
  const modelUsed = typeof parsed.modelUsed === 'string' ? parsed.modelUsed : undefined;

  // 4. Canonical or HTTP-level failure response
  if (parsed.success === false || parsed.ok === false || httpStatus < 200 || httpStatus >= 300) {
    const fallback = classifyHttpStatusToSmartAiError(httpStatus, 'passport');
    const rawErrorObj =
      parsed.error && typeof parsed.error === 'object' ? parsed.error : null;
    const rawCanonical =
      (typeof rawErrorObj?.code === 'string' && rawErrorObj.code.trim()) ||
      (typeof parsed.canonicalErrorCode === 'string' && parsed.canonicalErrorCode.trim()) ||
      '';
    const mappedFromCanonical = mapCanonicalErrorCodeToSmartAiCode(rawCanonical);
    const resolvedErrorCode: SmartUploadAiErrorCode =
      (typeof parsed.errorCode === 'string' && parsed.errorCode.trim()
        ? (parsed.errorCode.trim() as SmartUploadAiErrorCode)
        : undefined) ||
      mappedFromCanonical ||
      fallback.errorCode;
    const resolvedCanonicalCode: PassportCanonicalErrorCode =
      (rawCanonical as PassportCanonicalErrorCode) ||
      mapSmartAiCodeToCanonicalErrorCode(resolvedErrorCode);
    const resolvedMessage =
      (typeof rawErrorObj?.message === 'string' && rawErrorObj.message.trim()) ||
      (typeof parsed.message === 'string' && parsed.message.trim()) ||
      (typeof parsed.error === 'string' && parsed.error.trim()) ||
      fallback.message;
    const resolvedRetryable =
      typeof rawErrorObj?.retryable === 'boolean'
        ? rawErrorObj.retryable
        : typeof parsed.retryable === 'boolean'
        ? parsed.retryable
        : fallback.retryable;

    return buildEmptyPassportResponse(resolvedErrorCode, resolvedMessage, resolvedRetryable, {
      requestId,
      httpStatus,
      canonicalErrorCode: resolvedCanonicalCode,
      modelUsed,
    });
  }

  // 5. Canonical or legacy success payload validation (strictly requires HTTP 200 + non-empty passport data)
  const hasCanonicalData =
    parsed.success === true && parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data);
  const hasLegacyExtracted =
    parsed.ok === true &&
    parsed.readable === true &&
    parsed.extracted &&
    typeof parsed.extracted === 'object' &&
    !Array.isArray(parsed.extracted);

  if (!hasCanonicalData && !hasLegacyExtracted) {
    return buildEmptyPassportResponse(
      'invalid_response_schema',
      `Passport analysis returned HTTP ${httpStatus} without valid passport extraction data. Your file is already saved — click Retry AI Scan or enter details manually.`,
      true,
      {
        requestId,
        httpStatus,
        canonicalErrorCode: 'INVALID_RESPONSE_SCHEMA',
        modelUsed,
      }
    );
  }

  const rawData: Partial<PassportCanonicalData> = hasCanonicalData ? parsed.data : {};
  const rawEx = parsed.extracted && typeof parsed.extracted === 'object' ? parsed.extracted : {};

  const surname = String(rawData.surname ?? rawEx.surname ?? '').trim();
  const givenNames = String(rawData.givenNames ?? rawEx.givenNames ?? '').trim();
  const gender = normalizeGenderValue(rawData.gender ?? rawEx.sex);
  const dateOfBirth = String(rawData.dateOfBirth ?? rawEx.dateOfBirth ?? '').trim();
  const nationality = String(
    rawData.nationality ?? rawEx.nationalityName ?? rawEx.nationalityIso3 ?? ''
  ).trim();
  const nationalityIso3 = String(rawEx.nationalityIso3 ?? '').trim().toUpperCase();
  const passportNumber = String(rawData.passportNumber ?? rawEx.passportNumber ?? '').trim();
  const passportIssueDate = String(rawData.passportIssueDate ?? rawEx.issueDate ?? '').trim();
  const passportExpiryDate = String(rawData.passportExpiryDate ?? rawEx.expiryDate ?? '').trim();
  const placeOfBirth = String(rawData.placeOfBirth ?? rawEx.placeOfBirth ?? '').trim();

  const hasUsableValue = Boolean(
    surname || givenNames || passportNumber || dateOfBirth || passportExpiryDate
  );
  if (!hasUsableValue) {
    return buildEmptyPassportResponse(
      'invalid_response_schema',
      'Passport analysis returned an empty extraction payload. Your file is already saved — click Retry AI Scan or enter details manually.',
      true,
      {
        requestId,
        httpStatus,
        canonicalErrorCode: 'INVALID_RESPONSE_SCHEMA',
        modelUsed,
      }
    );
  }

  const warnings: string[] = Array.isArray(parsed.warnings)
    ? parsed.warnings.map((w: unknown) => String(w))
    : Array.isArray(parsed.mrzValidation?.warnings)
    ? parsed.mrzValidation.warnings.map((w: unknown) => String(w))
    : [];

  const canonicalData: PassportCanonicalData = {
    surname,
    givenNames,
    gender,
    dateOfBirth,
    nationality,
    passportNumber,
    passportIssueDate,
    passportExpiryDate,
    placeOfBirth,
  };

  return {
    success: true,
    data: canonicalData,
    warnings,
    requestId,
    ok: true,
    readable: true,
    modelUsed,
    httpStatus,
    timingsMs: parsed.timingsMs,
    message:
      typeof parsed.message === 'string' && parsed.message.trim()
        ? parsed.message
        : 'Passport details extracted. Please verify each highlighted field before continuing.',
    extracted: {
      mrzLine1: String(rawEx.mrzLine1 ?? ''),
      mrzLine2: String(rawEx.mrzLine2 ?? ''),
      surname,
      givenNames,
      passportNumber,
      nationalityIso3,
      nationalityName: nationality,
      dateOfBirth,
      sex: gender,
      expiryDate: passportExpiryDate,
      issueDate: passportIssueDate,
      placeOfBirth,
    },
    mrzValidation: parsed.mrzValidation || {
      hasMrz: false,
      isValid: false,
      passportCheckPassed: false,
      dobCheckPassed: false,
      expiryCheckPassed: false,
      compositeCheckPassed: false,
      warnings,
    },
    trustedSource:
      parsed.trustedSource === 'mrz' || parsed.trustedSource === 'visual'
        ? parsed.trustedSource
        : 'visual',
    needsCheckFields: Array.isArray(parsed.needsCheckFields) ? parsed.needsCheckFields : [],
  };
}

// In-flight deduplication map to prevent duplicate simultaneous AI extraction requests for the same passport image
const inFlightPassportExtractions = new Map<string, Promise<PassportExtractionApiResponse>>();

/**
 * Calls server-side Gemini passport extraction endpoint (never exposes API keys),
 * with explicit AbortSignal cancellation, offline detection, strict Content-Type/JSON/schema validation,
 * concurrent request deduplication, and a 45s client timeout aligned with the backend multi-model retry budget.
 */
export async function extractPassportViaServerAi(
  imageBase64: string,
  mimeType: string,
  applicationId?: string,
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
    fetchFn?: typeof fetch;
    skipAuthHeaders?: boolean;
  }
): Promise<PassportExtractionApiResponse> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return buildEmptyPassportResponse(
      'offline',
      'You are currently offline. Reconnect to the internet and click Retry AI Scan, or enter your passport details manually.',
      true,
      { canonicalErrorCode: 'CLIENT_OFFLINE' }
    );
  }
  if (options?.signal?.aborted) {
    return buildEmptyPassportResponse('cancelled', 'Passport analysis was cancelled.', true, {
      canonicalErrorCode: 'REQUEST_CANCELLED',
    });
  }

  const dedupKey = `${applicationId || 'none'}:${mimeType}:${imageBase64.length}:${imageBase64.slice(0, 48)}:${imageBase64.slice(-48)}`;
  if (!options?.fetchFn) {
    const existing = inFlightPassportExtractions.get(dedupKey);
    if (existing) {
      return existing;
    }
  }

  const runRequest = async (): Promise<PassportExtractionApiResponse> => {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const controller = new AbortController();
    let timedOut = false;

    const onOuterAbort = () => controller.abort();
    options?.signal?.addEventListener('abort', onOuterAbort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const headers: Record<string, string> = options?.skipAuthHeaders
        ? { 'Content-Type': 'application/json', Accept: 'application/json' }
        : { ...(await buildAuthHeaders()), Accept: 'application/json' };
      const fetchImpl = options?.fetchFn || fetch;
      const response = await fetchImpl('/api/smart-applications/ai/extract-passport', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageBase64, mimeType, applicationId }),
        signal: controller.signal,
      });

      return await parsePassportExtractionHttpResponse(response);
    } catch (err: any) {
      if (options?.signal?.aborted) {
        return buildEmptyPassportResponse('cancelled', 'Passport analysis was cancelled.', true, {
          canonicalErrorCode: 'REQUEST_CANCELLED',
        });
      }
      if (timedOut || err?.name === 'AbortError') {
        return buildEmptyPassportResponse(
          'timeout',
          'Passport analysis took longer than 45 seconds and was stopped so you are never stuck. Your file is saved — click Retry AI Scan or enter your details manually.',
          true,
          { httpStatus: 504, canonicalErrorCode: 'GEMINI_TIMEOUT' }
        );
      }
      return buildEmptyPassportResponse(
        'offline',
        'Network connection interrupted while analyzing your passport. Your file is saved — check your connection and click Retry AI Scan.',
        true,
        { canonicalErrorCode: 'CLIENT_OFFLINE' }
      );
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener('abort', onOuterAbort);
    }
  };

  if (options?.fetchFn) {
    return runRequest();
  }

  const promise = runRequest().finally(() => {
    inFlightPassportExtractions.delete(dedupKey);
  });
  inFlightPassportExtractions.set(dedupKey, promise);
  return promise;
}

/**
 * Calls server-side Gemini document classification & transcript/language extraction endpoint
 * with cancellation, offline detection, Content-Type/JSON validation, and a 45s client timeout.
 */
export async function classifyDocumentViaServerAi(
  imageBase64: string,
  mimeType: string,
  fileName: string,
  applicationId?: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<DocumentClassificationApiResponse> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      readable: false,
      errorCode: 'offline',
      retryable: true,
      docType: 'other',
      confidence: 'low',
      summary: 'Offline — reconnect to classify automatically, or assign manually below.',
    };
  }
  if (options?.signal?.aborted) {
    return {
      ok: false,
      readable: false,
      errorCode: 'cancelled',
      retryable: true,
      docType: 'other',
      confidence: 'low',
      summary: 'Cancelled.',
    };
  }

  const timeoutMs = options?.timeoutMs ?? 45_000;
  const controller = new AbortController();
  let timedOut = false;

  const onOuterAbort = () => controller.abort();
  options?.signal?.addEventListener('abort', onOuterAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const headers = { ...(await buildAuthHeaders()), Accept: 'application/json' };
    const response = await fetch('/api/smart-applications/ai/classify-and-extract', {
      method: 'POST',
      headers,
      body: JSON.stringify({ imageBase64, mimeType, fileName, applicationId }),
      signal: controller.signal,
    });
    const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
    const rawText = await response.text().catch(() => '');
    const isJsonContent =
      contentType.includes('application/json') || contentType.includes('+json');

    if (!rawText.trim() || looksLikeHtmlDocument(rawText) || (contentType && !isJsonContent)) {
      const mapped = classifyHttpStatusToSmartAiError(response.status, 'classify');
      return {
        ok: false,
        readable: false,
        errorCode: !rawText.trim()
          ? 'empty_server_response'
          : looksLikeHtmlDocument(rawText) || !isJsonContent
          ? 'unexpected_html_response'
          : mapped.errorCode,
        retryable: true,
        httpStatus: response.status,
        docType: 'other',
        confidence: 'low',
        summary: mapped.message,
      };
    }

    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      const mapped = classifyHttpStatusToSmartAiError(response.status, 'classify');
      return {
        ok: false,
        readable: false,
        errorCode: 'malformed_server_json',
        retryable: true,
        httpStatus: response.status,
        docType: 'other',
        confidence: 'low',
        summary: mapped.message,
      };
    }
    return {
      ...(data as DocumentClassificationApiResponse),
      httpStatus: response.status,
    };
  } catch {
    return {
      ok: false,
      readable: false,
      errorCode: options?.signal?.aborted ? 'cancelled' : timedOut ? 'timeout' : 'offline',
      retryable: true,
      docType: 'other',
      confidence: 'low',
      summary: timedOut
        ? 'Classification timed out — assign manually below.'
        : 'Network interrupted — assign manually below.',
    };
  } finally {
    clearTimeout(timer);
    options?.signal?.removeEventListener('abort', onOuterAbort);
  }
}

/* ============================================================================
 * ADMIN / COUNSELLOR / VIEWER OPERATIONS
 * ========================================================================== */

function attachDuplicatePassportFlags(list: SmartApplicationRecord[]): SmartApplicationRecord[] {
  const passportAccountsMap = new Map<string, Set<string>>();
  const passportAppIdsMap = new Map<string, string[]>();

  for (const app of list) {
    const pNorm = normalizePassportNumber(
      app.passportNumberNormalized || app.personal?.passportNumber || ''
    );
    if (pNorm.length >= 5) {
      if (!passportAccountsMap.has(pNorm)) passportAccountsMap.set(pNorm, new Set());
      passportAccountsMap.get(pNorm)!.add(app.userId);
      if (!passportAppIdsMap.has(pNorm)) passportAppIdsMap.set(pNorm, []);
      passportAppIdsMap.get(pNorm)!.push(app.id);
    }
  }

  for (const app of list) {
    const pNorm = normalizePassportNumber(
      app.passportNumberNormalized || app.personal?.passportNumber || ''
    );
    const distinctUsers = pNorm ? passportAccountsMap.get(pNorm) : undefined;
    if (distinctUsers && distinctUsers.size > 1) {
      app.duplicatePassportFlag = true;
      app.duplicatePassportApplicationIds = (passportAppIdsMap.get(pNorm) || []).filter(
        (id) => id !== app.id
      );
    } else {
      app.duplicatePassportFlag = false;
      app.duplicatePassportApplicationIds = [];
    }
  }

  return list;
}

/**
 * Fetches Smart Applications for the admin portal:
 * - `admin` and `viewer`: all applications (also flags duplicate passport numbers across distinct userIds)
 * - `counsellor`: only applications assigned to their UID
 */
export async function fetchAdminSmartApplications(params: {
  role: SmartApplicationAdminRole;
  actorUid?: string;
  maxLimit?: number;
}): Promise<SmartApplicationRecord[]> {
  try {
    const activeUid = await requireActiveFirebaseUid(params.actorUid);
    if (!params.role) {
      return [];
    }
    const maxDocs = Math.max(10, Math.min(1000, params.maxLimit || 500));
    let q;
    if (params.role === 'counsellor') {
      q = query(
        collection(db, APPLICATIONS_COLLECTION),
        where('assignedTo', '==', activeUid),
        limit(maxDocs)
      );
    } else {
      q = query(collection(db, APPLICATIONS_COLLECTION), limit(maxDocs));
    }

    const snap = await withTimeout(getDocs(q), 12000);
    const list: SmartApplicationRecord[] = snap.docs.map((d) => hydrateRecord(d.id, d.data()));
    attachDuplicatePassportFlags(list);

    return list.sort((a, b) =>
      String(b.updatedAt || b.createdAt || '').localeCompare(
        String(a.updatedAt || a.createdAt || '')
      )
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, APPLICATIONS_COLLECTION);
    wrapFirestoreFailure(err);
  }
}

export interface AdminSmartApplicationsPageResult {
  items: SmartApplicationRecord[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  usedServerIndex: boolean;
}

/**
 * Server-side Firestore filtered & cursor-paginated query for large application lists.
 * Uses `where` + `orderBy('updatedAt', sortDir)` + `startAfter(cursor)` + `limit(pageSize + 1)`,
 * with graceful fallback if a composite index has not yet been deployed in Firestore.
 */
export async function fetchAdminSmartApplicationsPage(params: {
  role: SmartApplicationAdminRole;
  actorUid?: string;
  status?: string;
  universityId?: string;
  assignedTo?: string;
  sortDir?: 'desc' | 'asc';
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}): Promise<AdminSmartApplicationsPageResult> {
  const activeUid = await requireActiveFirebaseUid(params.actorUid);
  if (!params.role) {
    return { items: [], lastDoc: null, hasMore: false, usedServerIndex: true };
  }

  const pageSize = Math.max(5, Math.min(100, params.pageSize || 25));
  const sortDir = params.sortDir === 'asc' ? 'asc' : 'desc';

  const constraints: QueryConstraint[] = [];
  if (params.role === 'counsellor') {
    constraints.push(where('assignedTo', '==', activeUid));
  } else if (params.assignedTo && params.assignedTo !== 'ALL' && params.assignedTo !== 'UNASSIGNED') {
    constraints.push(where('assignedTo', '==', params.assignedTo));
  }

  if (params.status && params.status !== 'ALL') {
    constraints.push(where('status', '==', params.status));
  }
  if (params.universityId && params.universityId !== 'ALL') {
    constraints.push(where('universityId', '==', params.universityId));
  }

  constraints.push(orderBy('updatedAt', sortDir));
  if (params.cursor) {
    constraints.push(startAfter(params.cursor));
  }
  constraints.push(limit(pageSize + 1));

  try {
    const q = query(collection(db, APPLICATIONS_COLLECTION), ...constraints);
    const snap = await withTimeout(getDocs(q), 12000);
    const hasMore = snap.docs.length > pageSize;
    const pageDocs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
    const items = pageDocs.map((d) => hydrateRecord(d.id, d.data()));
    attachDuplicatePassportFlags(items);
    return {
      items,
      lastDoc: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
      hasMore,
      usedServerIndex: true,
    };
  } catch (err: any) {
    const code = String(err?.code || '').toLowerCase();
    const msg = String(err?.message || '').toLowerCase();
    if (code.includes('failed-precondition') || msg.includes('index')) {
      // Composite index not yet created in Firestore — fall back cleanly without breaking the admin UI
      const all = await fetchAdminSmartApplications({
        role: params.role,
        actorUid: activeUid,
      });
      const filtered = all.filter((app) => {
        if (params.status && params.status !== 'ALL' && app.status !== params.status) return false;
        if (params.universityId && params.universityId !== 'ALL' && app.universityId !== params.universityId) return false;
        if (params.assignedTo === 'UNASSIGNED' && app.assignedTo) return false;
        if (
          params.assignedTo &&
          params.assignedTo !== 'ALL' &&
          params.assignedTo !== 'UNASSIGNED' &&
          app.assignedTo !== params.assignedTo
        ) {
          return false;
        }
        return true;
      });
      if (sortDir === 'asc') {
        filtered.reverse();
      }
      return {
        items: filtered.slice(0, pageSize),
        lastDoc: null,
        hasMore: false,
        usedServerIndex: false,
      };
    }
    handleFirestoreError(err, OperationType.LIST, APPLICATIONS_COLLECTION);
    wrapFirestoreFailure(err);
  }
}

/**
 * Admin / Counsellor status change with transition validation, immutable history log,
 * in-app student notification, and student email notification.
 */
export async function adminUpdateSmartApplicationStatus(params: {
  application: SmartApplicationRecord;
  nextStatus: SmartApplicationStatus;
  message?: string;
  requestedDocuments?: SmartApplicationRequestedDocument[];
  requestedDeadline?: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: 'admin' | 'counsellor';
}): Promise<SmartApplicationRecord> {
  const activeUid = await requireActiveFirebaseUid(params.actorUid);
  const now = new Date().toISOString();
  const prevStatus = normalizeSmartApplicationStatus(params.application.status);
  const nextStatus = normalizeSmartApplicationStatus(params.nextStatus);

  if (
    !isAllowedStatusTransition({
      from: prevStatus,
      to: nextStatus,
      actorRole: params.actorRole,
    })
  ) {
    throw new SmartApplicationServiceError(
      'invalid-transition',
      `Role "${params.actorRole}" cannot transition an application directly from "${prevStatus}" to "${nextStatus}".`
    );
  }

  const updates: Partial<SmartApplicationRecord> = {
    status: nextStatus,
    updatedAt: now,
  };

  if (nextStatus === 'documents_missing') {
    updates.requestedDocuments = (params.requestedDocuments || []).map((d) => ({
      ...d,
      deadline: d.deadline || params.requestedDeadline || '',
      status: 'pending' as const,
    }));
    updates.requestedDocumentsMessage = params.message || '';
  }

  const eventType: SmartApplicationHistoryEventType =
    nextStatus === 'documents_missing' ? 'documents_requested' : 'status_changed';

  try {
    await withTimeout(
      updateDoc(
        doc(db, APPLICATIONS_COLLECTION, params.application.id),
        sanitizeFirestorePayload(updates)
      ),
      12000
    );

    await addApplicationHistoryEvent(params.application.id, {
      actorUid: activeUid,
      actorName: params.actorName,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      eventType,
      when: now,
      from: prevStatus,
      to: nextStatus,
      message: params.message || '',
      requestedDocuments: (params.requestedDocuments || []).map((d) => d.label),
    });

    const updatedRecord: SmartApplicationRecord = {
      ...params.application,
      ...updates,
    };

    const statusLabel = SMART_APPLICATION_STATUS_META[nextStatus]?.label || nextStatus;
    const notifType =
      nextStatus === 'admitted' || nextStatus === 'completed'
        ? 'success'
        : nextStatus === 'documents_missing' || nextStatus === 'rejected'
        ? 'warning'
        : 'info';

    const docSummary =
      nextStatus === 'documents_missing' && params.requestedDocuments?.length
        ? ` Requested: ${params.requestedDocuments.map((d) => d.label).join(', ')}.${
            params.requestedDeadline ? ` Deadline: ${params.requestedDeadline}.` : ''
          }`
        : '';

    pushStudentPortalNotificationDoc(params.application.userId, {
      title: `${statusLabel} — ${params.application.universityName}`,
      message:
        `${params.message ? `${params.message} ` : ''}${docSummary}`.trim() ||
        `Your application status for ${params.application.universityName} (${params.application.intake}) was updated to ${statusLabel}.`,
      type: notifType,
      actionTab: 'applications',
    }).catch(() => {});

    // Send student status notification email
    triggerStatusNotificationEmail({
      application: updatedRecord,
      fromStatus: prevStatus,
      toStatus: nextStatus,
      eventType: 'status_change',
      message: params.message,
      requestedDocuments: (params.requestedDocuments || []).map((d) => d.label),
      requestedDeadline: params.requestedDeadline,
    }).catch(() => {});

    return updatedRecord;
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `${APPLICATIONS_COLLECTION}/${params.application.id}`
    );
    wrapFirestoreFailure(err);
  }
}

/**
 * Admin / Assigned Counsellor per-document verification (Verified / Rejected / Request Replacement).
 * Preserves version history, logs immutable history event, and notifies the student.
 */
export async function adminReviewApplicationDocument(params: {
  application: SmartApplicationRecord;
  docType: string;
  verificationStatus: SmartApplicationDocumentVerificationStatus;
  note?: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: 'admin' | 'counsellor';
}): Promise<SmartApplicationRecord> {
  const activeUid = await requireActiveFirebaseUid(params.actorUid);
  const existing = params.application.documents?.[params.docType];
  if (!existing) {
    throw new SmartApplicationServiceError(
      'unknown',
      `Document "${params.docType}" has not been uploaded for this application.`
    );
  }

  const now = new Date().toISOString();
  const updatedDoc: SmartApplicationDocumentItem = {
    ...existing,
    verified: params.verificationStatus === 'verified',
    verificationStatus: params.verificationStatus,
    verificationNote: (params.note || '').trim().slice(0, 500),
    verifiedByUid: activeUid,
    verifiedByName: params.actorName,
    verifiedAt: now,
  };

  const nextDocuments: Record<string, SmartApplicationDocumentItem> = {
    ...(params.application.documents || {}),
    [params.docType]: updatedDoc,
  };

  const statusNormalized = normalizeSmartApplicationStatus(params.application.status);
  const eventType: SmartApplicationHistoryEventType =
    params.verificationStatus === 'verified' ? 'document_verified' : 'document_rejected';

  try {
    await withTimeout(
      updateDoc(
        doc(db, APPLICATIONS_COLLECTION, params.application.id),
        sanitizeFirestorePayload({
          documents: nextDocuments,
          updatedAt: now,
        })
      ),
      12000
    );

    const statusWord =
      params.verificationStatus === 'verified'
        ? 'verified'
        : params.verificationStatus === 'replacement_requested'
        ? 'flagged for replacement'
        : 'rejected';

    await addApplicationHistoryEvent(params.application.id, {
      actorUid: activeUid,
      actorName: params.actorName,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      eventType,
      when: now,
      from: statusNormalized,
      to: statusNormalized,
      message: `Document "${existing.label || params.docType}" marked as ${statusWord}.${
        params.note?.trim() ? ` Note: ${params.note.trim()}` : ''
      }`,
      requestedDocuments: [existing.label || params.docType],
    });

    const updatedRecord: SmartApplicationRecord = {
      ...params.application,
      documents: nextDocuments,
      updatedAt: now,
    };

    const uploadedItems = Object.values(nextDocuments);
    const allUploadedVerified =
      uploadedItems.length > 0 &&
      uploadedItems.every((d) => (d.verificationStatus || (d.verified ? 'verified' : 'pending')) === 'verified');

    if (params.verificationStatus === 'verified') {
      pushStudentPortalNotificationDoc(params.application.userId, {
        title: `Document Verified — ${params.application.universityName}`,
        message: `"${existing.label || params.docType}" has been verified by our admissions team.${
          allUploadedVerified ? ' All currently uploaded documents are verified.' : ''
        }`,
        type: 'success',
        actionTab: 'applications',
      }).catch(() => {});

      if (allUploadedVerified) {
        triggerStatusNotificationEmail({
          application: updatedRecord,
          fromStatus: statusNormalized,
          toStatus: statusNormalized,
          eventType: 'documents_accepted',
          message: `All submitted documents for your ${params.application.universityName} application have been reviewed and accepted by our admissions team.`,
        }).catch(() => {});
      }
    } else if (
      params.verificationStatus === 'rejected' ||
      params.verificationStatus === 'replacement_requested'
    ) {
      pushStudentPortalNotificationDoc(params.application.userId, {
        title: `Document Needs Attention — ${params.application.universityName}`,
        message: `"${existing.label || params.docType}" was ${statusWord}.${
          params.note?.trim() ? ` Reason: ${params.note.trim()}` : ''
        }`,
        type: 'warning',
        actionTab: 'applications',
      }).catch(() => {});
    }

    return updatedRecord;
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `${APPLICATIONS_COLLECTION}/${params.application.id}`
    );
    wrapFirestoreFailure(err);
  }
}

/**
 * Assigns an application to a counsellor/staff member, logs an immutable assignment
 * history event, and notifies the counsellor & student.
 */
export async function adminAssignSmartApplication(params: {
  applicationId: string;
  application?: SmartApplicationRecord;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  actorUid?: string;
  actorName?: string;
  actorEmail?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  try {
    await withTimeout(
      updateDoc(
        doc(db, APPLICATIONS_COLLECTION, params.applicationId),
        sanitizeFirestorePayload({
          assignedTo: params.assignedTo,
          assignedToName: params.assignedToName,
          assignedToEmail: params.assignedToEmail,
          updatedAt: now,
        })
      ),
      12000
    );

    if (params.actorUid && params.application) {
      const currentStatus = normalizeSmartApplicationStatus(params.application.status);
      addApplicationHistoryEvent(params.applicationId, {
        actorUid: params.actorUid,
        actorName: params.actorName || 'Admin',
        actorEmail: params.actorEmail || '',
        actorRole: 'admin',
        eventType: 'assigned',
        assignedToName: params.assignedToName || 'Unassigned',
        when: now,
        from: currentStatus,
        to: currentStatus,
        message: params.assignedTo
          ? `Assigned application to counsellor ${params.assignedToName || params.assignedToEmail || params.assignedTo}.`
          : 'Unassigned counsellor from application.',
      }).catch(() => {});

      if (params.assignedTo) {
        const studentName = `${params.application.personal?.givenNames || ''} ${
          params.application.personal?.surname || ''
        }`.trim();
        pushStudentPortalNotificationDoc(params.assignedTo, {
          title: `New Application Assigned — ${params.application.universityName}`,
          message: `You have been assigned to review ${studentName || 'a student'}'s ${params.application.degreeLevel} application (${params.applicationId}).`,
          type: 'info',
          actionTab: 'applications',
        }).catch(() => {});

        pushStudentPortalNotificationDoc(params.application.userId, {
          title: `Admissions Counsellor Assigned — ${params.application.universityName}`,
          message: `${params.assignedToName || 'An EVERYKR counsellor'} has been assigned to guide your ${params.application.universityName} application.`,
          type: 'info',
          actionTab: 'applications',
        }).catch(() => {});

        triggerStatusNotificationEmail({
          application: {
            ...params.application,
            assignedTo: params.assignedTo,
            assignedToName: params.assignedToName,
            assignedToEmail: params.assignedToEmail,
          },
          fromStatus: currentStatus,
          toStatus: currentStatus,
          eventType: 'assigned',
          message: `Your admissions counsellor ${params.assignedToName || 'team member'} has been assigned to review your ${params.application.universityName} application.`,
        }).catch(() => {});
      }
    }
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `${APPLICATIONS_COLLECTION}/${params.applicationId}`
    );
    throw err;
  }
}

/**
 * Sends a direct admissions message to the student (in-app notification + optional email)
 * and records an immutable `message_sent` entry in the application timeline.
 */
export async function adminSendStudentMessage(params: {
  application: SmartApplicationRecord;
  message: string;
  sendEmail?: boolean;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: 'admin' | 'counsellor';
}): Promise<{ historyEvent: SmartApplicationHistoryEvent; emailResult?: { ok: boolean; delivered?: boolean; provider?: string } }> {
  const activeUid = await requireActiveFirebaseUid(params.actorUid);
  const cleanMessage = params.message.trim().slice(0, 1800);
  if (!cleanMessage) {
    throw new SmartApplicationServiceError('unknown', 'Please enter a message before sending.');
  }

  const now = new Date().toISOString();
  const currentStatus = normalizeSmartApplicationStatus(params.application.status);

  const historyEvent = await addApplicationHistoryEvent(params.application.id, {
    actorUid: activeUid,
    actorName: params.actorName,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    eventType: 'message_sent',
    when: now,
    from: currentStatus,
    to: currentStatus,
    message: cleanMessage,
  });

  pushStudentPortalNotificationDoc(params.application.userId, {
    title: `Message from Admissions — ${params.application.universityName}`,
    message: cleanMessage,
    type: 'info',
    actionTab: 'applications',
  }).catch(() => {});

  let emailResult: { ok: boolean; delivered?: boolean; provider?: string } | undefined;
  if (params.sendEmail !== false) {
    emailResult = await triggerStatusNotificationEmail({
      application: params.application,
      fromStatus: currentStatus,
      toStatus: currentStatus,
      eventType: 'direct_message',
      message: cleanMessage,
    });
  }

  return { historyEvent, emailResult };
}

/**
 * Appends an internal note (hidden from the student UI) to the application and
 * records a concise non-blocking audit timeline note entry.
 */
export async function adminAddInternalNote(params: {
  application: SmartApplicationRecord;
  text: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole?: 'admin' | 'counsellor';
}): Promise<SmartApplicationNote[]> {
  const now = new Date().toISOString();
  const newNote: SmartApplicationNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    authorUid: params.actorUid,
    authorName: params.actorName,
    authorEmail: params.actorEmail,
    text: params.text.trim(),
    createdAt: now,
  };
  const nextNotes = [newNote, ...(params.application.notes || [])];

  try {
    await withTimeout(
      updateDoc(
        doc(db, APPLICATIONS_COLLECTION, params.application.id),
        sanitizeFirestorePayload({
          notes: nextNotes,
          updatedAt: now,
        })
      ),
      12000
    );

    const currentStatus = normalizeSmartApplicationStatus(params.application.status);
    addApplicationHistoryEvent(params.application.id, {
      actorUid: params.actorUid,
      actorName: params.actorName,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole || 'admin',
      eventType: 'note_added',
      when: now,
      from: currentStatus,
      to: currentStatus,
      message: `Internal staff note added by ${params.actorName}.`,
    }).catch(() => {});

    return nextNotes;
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `${APPLICATIONS_COLLECTION}/${params.application.id}`
    );
    throw err;
  }
}

/**
 * Logs every admin/counsellor/viewer document preview, download, or ZIP export
 * to `applications/{applicationId}/documentAccessLog/{logId}`.
 */
export async function logAdminDocumentAccess(
  entry: Omit<SmartApplicationDocumentAccessLog, 'id' | 'accessedAt'>
): Promise<void> {
  const colRef = collection(
    db,
    APPLICATIONS_COLLECTION,
    entry.applicationId,
    'documentAccessLog'
  );
  try {
    await withTimeout(
      addDoc(
        colRef,
        sanitizeFirestorePayload({
          ...entry,
          accessedAt: new Date().toISOString(),
        })
      ),
      12000
    );
  } catch (err) {
    console.warn('[SmartApplication] Document access log warning:', err);
  }
}

/**
 * Fetches recent document access logs for an application (admin audit visibility).
 */
export async function fetchDocumentAccessLogs(
  applicationId: string
): Promise<SmartApplicationDocumentAccessLog[]> {
  try {
    const q = query(
      collection(db, APPLICATIONS_COLLECTION, applicationId, 'documentAccessLog'),
      orderBy('accessedAt', 'desc'),
      limit(50)
    );
    const snap = await withTimeout(getDocs(q), 12000);
    return snap.docs.map((d) => ({
      ...(d.data() as SmartApplicationDocumentAccessLog),
      id: d.id,
    }));
  } catch {
    return [];
  }
}

/**
 * Loads the configured data-retention setting for withdrawn/rejected application files.
 */
export async function fetchApplicationRetentionSettings(): Promise<ApplicationRetentionSettings> {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'site_settings', RETENTION_DOC_PATH)), 12000);
    if (snap.exists()) {
      const data = snap.data() as Partial<ApplicationRetentionSettings>;
      return {
        withdrawnAndRejectedRetentionDays:
          typeof data.withdrawnAndRejectedRetentionDays === 'number' &&
          data.withdrawnAndRejectedRetentionDays >= 7
            ? data.withdrawnAndRejectedRetentionDays
            : 180,
        updatedAt: data.updatedAt || '',
        updatedByEmail: data.updatedByEmail,
      };
    }
  } catch {
    // fallback default
  }
  return {
    withdrawnAndRejectedRetentionDays: 180,
    updatedAt: '',
  };
}

/**
 * Saves the data-retention setting (days) for withdrawn/rejected application files.
 */
export async function saveApplicationRetentionSettings(
  days: number,
  updatedByEmail: string
): Promise<ApplicationRetentionSettings> {
  const clamped = Math.max(7, Math.min(3650, Math.round(days)));
  const payload: ApplicationRetentionSettings = {
    withdrawnAndRejectedRetentionDays: clamped,
    updatedAt: new Date().toISOString(),
    updatedByEmail,
  };
  try {
    await withTimeout(
      setDoc(doc(db, 'site_settings', RETENTION_DOC_PATH), sanitizeFirestorePayload(payload), {
        merge: true,
      }),
      12000
    );
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `site_settings/${RETENTION_DOC_PATH}`);
    throw err;
  }
}
