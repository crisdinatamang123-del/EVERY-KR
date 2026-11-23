/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Smart University Application System — Authoritative Backend Storage Authorization
 *
 * Why this module exists:
 * EVERYKR's primary Firestore database is a named database:
 *   `ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f`
 * Firebase Storage Security Rules cross-service `firestore.get()` ONLY supports `(default)`.
 *
 * This module enforces authoritative, server-verified isolation against the real named
 * Firestore database for both document uploads and private document reads:
 *   1. Authenticates callers strictly via verified Firebase ID tokens + verified custom claims
 *      (ZERO unsigned JWT decoding, ZERO hardcoded admin email fallbacks).
 *   2. Verifies application ownership, counsellor `assignedTo`, and authoritative application
 *      status (`draft` or `documents_missing` ONLY for student uploads) against the named
 *      Firestore database.
 *   3. Enforces least-privilege Viewer isolation (ZERO raw document read/write access).
 *   4. Issues short-lived, single-use, cryptographically bound upload/read tickets (and V4
 *      GCS signed URLs with `x-goog-if-generation-match: 0` when signing credentials are present),
 *      preventing replay/reuse and preserving full document version history.
 */

import crypto from 'crypto';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { getOrInitFirebaseAdminApp } from './firebaseAdminResetService.ts';
import { verifyFirebaseIdTokenServer } from './userManagementService.ts';
import { resolveCanonicalStorageRole } from './enterpriseRbacCore.ts';
import {
  FIRESTORE_COLLECTIONS,
  getNamedAdminFirestore,
  isFirestoreIamOrUnavailableError,
  isProductionCloudRunRuntime,
} from './firestorePersistenceBridge.ts';

export const SMART_APP_FIREBASE_PROJECT_ID = 'everykr';
export const SMART_APP_FIRESTORE_DATABASE_ID =
  'ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f';
export const SMART_APP_STORAGE_BUCKET = 'everykr.firebasestorage.app';

export const MAX_SMART_APP_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20 MB
export const UPLOAD_TICKET_TTL_MS = 2 * 60 * 1000; // 120 seconds
export const READ_TICKET_TTL_MS = 60 * 1000; // 60 seconds

// Authoritative statuses permitting student document uploads (explicit allowlist)
export const STUDENT_UPLOAD_ALLOWED_STATUSES = new Set(['draft', 'documents_missing']);

// Explicitly locked statuses (including legacy alias `accepted` -> `admitted`)
export const STUDENT_UPLOAD_LOCKED_STATUSES = new Set([
  'submitted',
  'under_review',
  'sent_to_university',
  'submitted_to_university',
  'interview',
  'admitted',
  'accepted',
  'rejected',
  'visa_processing',
  'completed',
  'withdrawn',
]);

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
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

const ALLOWED_EXTENSIONS_BY_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/jpg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic', '.heif'],
  'image/heif': ['.heic', '.heif'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  'application/x-zip': ['.zip'],
};

const CORE_PERMITTED_DOC_TYPES = new Set([
  'passport',
  'photo',
  'transcript',
  'certificate',
  'language_certificate',
  'bank_statement',
  'study_plan',
  'recommendation_letter',
  'portfolio',
  'visa',
  'family_relation',
  'sponsor_id',
  'employment_certificate',
  'other',
]);

export type VerifiedStorageRole = 'admin' | 'counsellor' | 'viewer' | 'student';

export interface VerifiedStorageCaller {
  uid: string;
  email?: string;
  emailVerified: boolean;
  isAdmin: boolean;
  isCounsellor: boolean;
  isViewer: boolean;
  role: VerifiedStorageRole;
  idToken: string;
}

export interface AuthoritativeDocumentEntry {
  storagePath?: string;
  previousVersions?: Array<{ storagePath?: string }>;
}

export interface AuthoritativeApplicationSnapshot {
  id: string;
  userId: string;
  status: string;
  assignedTo?: string | null;
  documents?: Record<string, AuthoritativeDocumentEntry>;
}

export type AuthoritativeApplicationLookupResult =
  | { status: 'ok'; app: AuthoritativeApplicationSnapshot }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'unavailable'; detail: string };

export interface UploadAuthorizationTicketPayload {
  kind: 'upload';
  jti: string;
  uid: string;
  ownerUid: string;
  applicationId: string;
  docType: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  expectedSize: number;
  expiresAtMs: number;
}

export interface ReadAuthorizationTicketPayload {
  kind: 'read';
  jti: string;
  uid: string;
  role: VerifiedStorageRole;
  applicationId: string;
  storagePath: string;
  expiresAtMs: number;
}

export interface TrackedTicketRecord {
  kind: 'upload' | 'read';
  uid: string;
  storagePath: string;
  expiresAtMs: number;
  consumed: boolean;
}

export type SharedTicketConsumeResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'not_found' | 'already_used' | 'expired' | 'uid_mismatch' | 'store_unavailable';
    };

/**
 * Shared single-use ticket store abstraction enabling stateless multi-instance Cloud Run
 * deployments (Instance A issues ticket -> Instance B atomically verifies and consumes it).
 */
export interface SharedSingleUseTicketStore {
  readonly backend: 'firestore' | 'memory';
  registerTicket(record: TrackedTicketRecord & { jti: string }): Promise<{ ok: boolean; error?: string }>;
  consumeTicket(params: {
    jti: string;
    kind: 'upload' | 'read';
    uid: string;
    nowMs: number;
  }): Promise<SharedTicketConsumeResult>;
}

export interface SmartAppDocumentAuthDeps {
  verifyIdToken?: typeof verifyFirebaseIdTokenServer;
  fetchApplication?: (params: {
    applicationId: string;
    caller: VerifiedStorageCaller;
  }) => Promise<AuthoritativeApplicationLookupResult>;
  createSignedUploadUrl?: (params: {
    storagePath: string;
    contentType: string;
    expectedSize: number;
    expiresAtMs: number;
    customMetadata: Record<string, string>;
  }) => Promise<string | null>;
  createSignedReadUrl?: (params: {
    storagePath: string;
    expiresAtMs: number;
  }) => Promise<string | null>;
  ticketStore?: SharedSingleUseTicketStore;
  env?: Record<string, string | undefined>;
  nowMs?: () => number;
}

export class MissingProductionSigningSecretError extends Error {
  readonly code = 'signing_secret_not_configured';
  constructor() {
    super(
      'SMART_APP_UPLOAD_SECRET (or SESSION_SIGNING_SECRET) must be configured in production for multi-instance Cloud Run ticket verification.'
    );
    this.name = 'MissingProductionSigningSecretError';
  }
}

// Runtime ephemeral fallback key ONLY for non-production local dev/test (never used in Cloud Run production)
const EPHEMERAL_RUNTIME_TICKET_SECRET = crypto.randomBytes(32).toString('hex');

function sanitizeTicketSecret(raw?: string): string {
  const cleaned = String(raw || '').trim();
  if (cleaned.length < 16) return '';
  if (cleaned === '***' || cleaned.startsWith('MY_')) return '';
  return cleaned;
}

/**
 * Resolves the HMAC-SHA256 signing key for single-use storage tickets.
 * Production fail-closed policy: on Cloud Run / NODE_ENV=production, refuses to sign or
 * verify with an ephemeral per-instance key (which would break multi-instance scaling).
 */
export function resolveTicketSigningKey(
  env: Record<string, string | undefined> = process.env
): Buffer {
  const configured =
    sanitizeTicketSecret(env.SMART_APP_UPLOAD_SECRET) ||
    sanitizeTicketSecret(env.SESSION_SIGNING_SECRET);
  if (configured) {
    return crypto.createHash('sha256').update(`everykr_storage_ticket_v1:${configured}`).digest();
  }
  if (isProductionCloudRunRuntime(env)) {
    throw new MissingProductionSigningSecretError();
  }
  return crypto
    .createHash('sha256')
    .update(`everykr_storage_ticket_v1:${EPHEMERAL_RUNTIME_TICKET_SECRET}`)
    .digest();
}

// Local in-memory registry (used for sync legacy tests and non-production local dev fallback ONLY)
const singleUseTicketRegistry = new Map<string, TrackedTicketRecord>();

function pruneExpiredTickets(nowMs: number): void {
  if (singleUseTicketRegistry.size < 250) return;
  for (const [jti, rec] of singleUseTicketRegistry.entries()) {
    if (rec.expiresAtMs <= nowMs) {
      singleUseTicketRegistry.delete(jti);
    }
  }
}

export function clearStorageAuthTicketsForTesting(): void {
  singleUseTicketRegistry.clear();
}

/**
 * Creates an in-memory SharedSingleUseTicketStore (for deterministic multi-instance unit tests
 * or local dev fallback when Datastore IAM is not present).
 */
export function createInMemorySharedTicketStore(): SharedSingleUseTicketStore {
  const map = new Map<string, TrackedTicketRecord>();
  return {
    backend: 'memory',
    async registerTicket(record) {
      map.set(record.jti, {
        kind: record.kind,
        uid: record.uid,
        storagePath: record.storagePath,
        expiresAtMs: record.expiresAtMs,
        consumed: false,
      });
      return { ok: true };
    },
    async consumeTicket({ jti, kind, uid, nowMs }) {
      const rec = map.get(jti);
      if (!rec || rec.kind !== kind) {
        return { ok: false, reason: 'not_found' };
      }
      if (rec.expiresAtMs <= nowMs) {
        map.delete(jti);
        return { ok: false, reason: 'expired' };
      }
      if (rec.uid !== uid) {
        return { ok: false, reason: 'uid_mismatch' };
      }
      if (rec.consumed) {
        return { ok: false, reason: 'already_used' };
      }
      rec.consumed = true;
      return { ok: true };
    },
  };
}

/**
 * Creates the production Firestore Transaction-backed SharedSingleUseTicketStore targeting
 * EVERYKR's named Firestore database (`ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f`).
 * Guarantees atomic single-use consumption and replay prevention across multiple Cloud Run instances.
 */
export function createFirestoreSingleUseTicketStore(
  env: Record<string, string | undefined> = process.env
): SharedSingleUseTicketStore {
  return {
    backend: 'firestore',
    async registerTicket(record) {
      const db = getNamedAdminFirestore();
      if (!db) {
        if (isProductionCloudRunRuntime(env)) {
          return { ok: false, error: 'Named Firestore database client unavailable in production' };
        }
        return { ok: false, error: 'firestore_unavailable_local' };
      }
      try {
        await db
          .collection(FIRESTORE_COLLECTIONS.smartAppAuthTickets)
          .doc(record.jti)
          .set({
            jti: record.jti,
            kind: record.kind,
            uid: record.uid,
            storagePath: record.storagePath,
            expiresAtMs: record.expiresAtMs,
            expiresAt: new Date(record.expiresAtMs),
            consumed: false,
            createdAt: new Date().toISOString(),
          });
        return { ok: true };
      } catch (err: any) {
        if (!isProductionCloudRunRuntime(env) && isFirestoreIamOrUnavailableError(err)) {
          return { ok: false, error: 'firestore_unavailable_local' };
        }
        return { ok: false, error: String(err?.message || 'Ticket registration failed') };
      }
    },
    async consumeTicket({ jti, kind, uid, nowMs }) {
      const db = getNamedAdminFirestore();
      if (!db) {
        return { ok: false, reason: 'store_unavailable' };
      }
      try {
        const ref = db.collection(FIRESTORE_COLLECTIONS.smartAppAuthTickets).doc(jti);
        return await db.runTransaction<SharedTicketConsumeResult>(async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists) {
            return { ok: false, reason: 'not_found' };
          }
          const data = snap.data() as Partial<TrackedTicketRecord> | undefined;
          if (!data || data.kind !== kind) {
            return { ok: false, reason: 'not_found' };
          }
          if (typeof data.expiresAtMs === 'number' && data.expiresAtMs <= nowMs) {
            return { ok: false, reason: 'expired' };
          }
          if (data.uid !== uid) {
            return { ok: false, reason: 'uid_mismatch' };
          }
          if (data.consumed === true) {
            return { ok: false, reason: 'already_used' };
          }
          tx.update(ref, {
            consumed: true,
            consumedAt: new Date(nowMs).toISOString(),
          });
          return { ok: true };
        });
      } catch {
        return { ok: false, reason: 'store_unavailable' };
      }
    },
  };
}

function signTicketPayload<T extends { jti: string; expiresAtMs: number }>(
  payload: T,
  env: Record<string, string | undefined> = process.env
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const mac = crypto
    .createHmac('sha256', resolveTicketSigningKey(env))
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${mac}`;
}

function verifyTicketSignature<T>(
  token: string,
  env: Record<string, string | undefined> = process.env
): T | null {
  if (!token || typeof token !== 'string' || token.length > 4096) {
    return null;
  }
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx !== token.lastIndexOf('.')) {
    return null;
  }
  const encodedPayload = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);
  if (!encodedPayload || !providedSig) return null;

  let signingKey: Buffer;
  try {
    signingKey = resolveTicketSigningKey(env);
  } catch {
    return null;
  }

  const expectedSig = crypto
    .createHmac('sha256', signingKey)
    .update(encodedPayload)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (providedBuf.length !== expectedBuf.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Extracts a Firebase ID token from request headers (`x-firebase-id-token` or `Authorization: Bearer ...`).
 */
export function extractFirebaseIdTokenFromHeaders(headers: {
  authorization?: string;
  'x-firebase-id-token'?: string | string[];
}): string | null {
  const explicit =
    typeof headers['x-firebase-id-token'] === 'string'
      ? headers['x-firebase-id-token'].trim()
      : '';
  if (explicit && !explicit.startsWith('ekrs1.')) {
    return explicit;
  }
  const auth = typeof headers.authorization === 'string' ? headers.authorization.trim() : '';
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  if (bearer && !bearer.startsWith('ekrs1.')) {
    return bearer;
  }
  return null;
}

/**
 * Verifies the Firebase ID token and resolves the caller's role STRICTLY from verified
 * Firebase Auth custom claims (`admin`, `counsellor`, `viewer`, `role`).
 * Never uses hardcoded admin email fallbacks or unsigned JWT payloads.
 */
export async function resolveVerifiedStorageCaller(
  rawIdToken: string | null | undefined,
  deps?: Pick<SmartAppDocumentAuthDeps, 'verifyIdToken'>
): Promise<VerifiedStorageCaller | null> {
  const cleanToken = String(rawIdToken || '').replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken || cleanToken.startsWith('ekrs1.')) {
    return null;
  }

  const verifyFn = deps?.verifyIdToken || verifyFirebaseIdTokenServer;
  const verified = await verifyFn(cleanToken);
  if (!verified.valid || !verified.uid) {
    return null;
  }

  const claims = verified.customClaims || {};
  const role: VerifiedStorageRole = resolveCanonicalStorageRole({ claims });
  const isAdmin = role === 'admin';
  const isCounsellor = role === 'counsellor';
  const isViewer = role === 'viewer';

  return {
    uid: verified.uid,
    email: verified.email,
    emailVerified: Boolean(verified.emailVerified),
    isAdmin,
    isCounsellor,
    isViewer,
    role,
    idToken: cleanToken,
  };
}

function decodeFirestoreRestValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('nullValue' in val) return null;
  if ('stringValue' in val) return String(val.stringValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const items = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return items.map(decodeFirestoreRestValue);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreRestValue(v);
    }
    return out;
  }
  return undefined;
}

function normalizeSnapshotFromRaw(
  applicationId: string,
  raw: Record<string, any>
): AuthoritativeApplicationSnapshot {
  const rawDocs = raw.documents && typeof raw.documents === 'object' ? raw.documents : {};
  const documents: Record<string, AuthoritativeDocumentEntry> = {};
  for (const [key, entry] of Object.entries(rawDocs)) {
    if (!entry || typeof entry !== 'object') continue;
    const prevRaw = Array.isArray((entry as any).previousVersions)
      ? (entry as any).previousVersions
      : [];
    documents[key] = {
      storagePath:
        typeof (entry as any).storagePath === 'string' ? (entry as any).storagePath : undefined,
      previousVersions: prevRaw
        .filter((p: any) => p && typeof p.storagePath === 'string')
        .map((p: any) => ({ storagePath: String(p.storagePath) })),
    };
  }

  return {
    id: String(raw.id || applicationId),
    userId: String(raw.userId || ''),
    status: String(raw.status || ''),
    assignedTo:
      typeof raw.assignedTo === 'string' && raw.assignedTo.trim() ? raw.assignedTo.trim() : null,
    documents,
  };
}

/**
 * Authoritatively fetches `applications/{applicationId}` from EVERYKR's primary named
 * Firestore database (`ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f`).
 *
 * Uses the official Firestore REST API authenticated with the caller's verified Firebase
 * ID token (enforcing `firestore.rules` at Google's edge as a first layer of defense),
 * with Firebase Admin Firestore on the same named database as a fallback when service
 * account credentials are configured.
 */
export async function fetchAuthoritativeApplicationDoc(params: {
  applicationId: string;
  caller: VerifiedStorageCaller;
}): Promise<AuthoritativeApplicationLookupResult> {
  const safeId = encodeURIComponent(params.applicationId);
  const restUrl = `https://firestore.googleapis.com/v1/projects/${SMART_APP_FIREBASE_PROJECT_ID}/databases/${SMART_APP_FIRESTORE_DATABASE_ID}/documents/applications/${safeId}`;

  try {
    const response = await fetch(restUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${params.caller.idToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 200) {
      const json: any = await response.json().catch(() => null);
      if (json && json.fields && typeof json.fields === 'object') {
        const decoded: Record<string, any> = {};
        for (const [k, v] of Object.entries(json.fields)) {
          decoded[k] = decodeFirestoreRestValue(v);
        }
        return {
          status: 'ok',
          app: normalizeSnapshotFromRaw(params.applicationId, decoded),
        };
      }
      return { status: 'not_found' };
    }

    if (response.status === 404) {
      return { status: 'not_found' };
    }

    if (response.status === 403) {
      return { status: 'forbidden' };
    }
  } catch {
    // Fall through to Admin SDK lookup if configured
  }

  // Fallback: Firebase Admin Firestore targeting the exact named database
  try {
    const { app: adminApp } = getOrInitFirebaseAdminApp();
    const adminDb = getAdminFirestore(adminApp, SMART_APP_FIRESTORE_DATABASE_ID);
    const snap = await adminDb.collection('applications').doc(params.applicationId).get();
    if (!snap.exists) {
      return { status: 'not_found' };
    }
    const data = snap.data() || {};
    return {
      status: 'ok',
      app: normalizeSnapshotFromRaw(params.applicationId, data),
    };
  } catch (err: any) {
    return {
      status: 'unavailable',
      detail: String(err?.code || 'firestore_lookup_unavailable'),
    };
  }
}

export function isValidDocTypeIdentifier(docType: string): boolean {
  if (!docType || typeof docType !== 'string') return false;
  if (CORE_PERMITTED_DOC_TYPES.has(docType)) return true;
  // Support dynamic university-specific checklist slugs produced by buildChecklistForDegree
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(docType);
}

export function sanitizeUploadFileName(rawName: string): string {
  const base = String(rawName || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop() || '';
  return base
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .slice(0, 110);
}

/**
 * Validates actual uploaded file magic bytes against the authorized MIME type
 * so spoofed HTML/SVG/executable payloads cannot be uploaded under PDF/image/ZIP extensions.
 */
export function validateUploadedDocumentMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  const normalized = String(mimeType || '').toLowerCase();

  if (normalized === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (normalized === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (normalized === 'image/heic' || normalized === 'image/heif') {
    return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  if (
    normalized === 'application/zip' ||
    normalized === 'application/x-zip-compressed' ||
    normalized === 'application/x-zip'
  ) {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
        (buffer[2] === 0x05 && buffer[3] === 0x06) ||
        (buffer[2] === 0x07 && buffer[3] === 0x08))
    );
  }
  return false;
}

async function defaultCreateSignedUploadUrl(params: {
  storagePath: string;
  contentType: string;
  expectedSize: number;
  expiresAtMs: number;
  customMetadata: Record<string, string>;
}): Promise<string | null> {
  try {
    const { app: adminApp } = getOrInitFirebaseAdminApp();
    const bucket = getAdminStorage(adminApp).bucket(SMART_APP_STORAGE_BUCKET);
    const file = bucket.file(params.storagePath);
    // `x-goog-if-generation-match: 0` enforces single-use creation at the GCS layer:
    // any second PUT to this path fails with HTTP 412 Precondition Failed.
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: params.expiresAtMs,
      contentType: params.contentType,
      extensionHeaders: {
        'x-goog-if-generation-match': '0',
        'x-goog-content-length-range': `${params.expectedSize},${params.expectedSize}`,
        'x-goog-meta-userid': params.customMetadata.userId,
        'x-goog-meta-applicationid': params.customMetadata.applicationId,
        'x-goog-meta-doctype': params.customMetadata.docType,
      },
    });
    return signedUrl || null;
  } catch {
    // Expected in environments without local private key / iam.serviceAccounts.signBlob;
    // client automatically uses the single-use server-mediated upload endpoint.
    return null;
  }
}

async function defaultCreateSignedReadUrl(params: {
  storagePath: string;
  expiresAtMs: number;
}): Promise<string | null> {
  try {
    const { app: adminApp } = getOrInitFirebaseAdminApp();
    const bucket = getAdminStorage(adminApp).bucket(SMART_APP_STORAGE_BUCKET);
    const file = bucket.file(params.storagePath);
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: params.expiresAtMs,
    });
    return signedUrl || null;
  } catch {
    return null;
  }
}

export interface AuthorizeUploadResult {
  httpStatus: number;
  ok: boolean;
  errorCode?: string;
  error?: string;
  mode?: 'signed_url' | 'server_proxy';
  uploadToken?: string;
  uploadEndpoint?: string;
  signedUploadUrl?: string;
  signedHeaders?: Record<string, string>;
  storagePath?: string;
  fileName?: string;
  contentType?: string;
  expectedSize?: number;
  expiresAt?: string;
  applicationStatus?: string;
}

/**
 * Authorizes a Smart Application document upload against EVERYKR's primary named
 * Firestore database.
 *
 * Enforces:
 * - Verified Firebase ID token (401 on missing/invalid)
 * - Role checks: Viewers & Counsellors denied (403)
 * - Application ownership (`app.userId === caller.uid`, or verified Admin)
 * - Authoritative application status strictly `draft` or `documents_missing` for students
 *   (rejects `submitted`, `under_review`, `sent_to_university`, `interview`, `admitted`,
 *   `accepted`, `rejected`, `visa_processing`, `completed`, `withdrawn`)
 * - Permitted docType, 1 byte .. 20 MB size cap, MIME + extension consistency
 * - Unique timestamped storage path preserving all `previousVersions`
 * - Short-lived (120s), single-use HMAC upload ticket (+ V4 signed URL when available)
 */
export async function authorizeSmartApplicationUpload(params: {
  idToken: string | null | undefined;
  applicationId: unknown;
  docType: unknown;
  fileName: unknown;
  fileSize: unknown;
  mimeType: unknown;
  deps?: SmartAppDocumentAuthDeps;
}): Promise<AuthorizeUploadResult> {
  const caller = await resolveVerifiedStorageCaller(params.idToken, params.deps);
  if (!caller) {
    return {
      httpStatus: 401,
      ok: false,
      errorCode: 'unauthenticated',
      error: 'Valid Firebase authentication is required to request document upload authorization.',
    };
  }

  // ISSUE 1 & ISSUE 2: Viewers and Counsellors have ZERO document upload permissions
  if (caller.isViewer) {
    return {
      httpStatus: 403,
      ok: false,
      errorCode: 'viewer_upload_denied',
      error: 'Viewers have read-only summary access and are not permitted to upload documents.',
    };
  }
  if (caller.isCounsellor) {
    return {
      httpStatus: 403,
      ok: false,
      errorCode: 'counsellor_upload_denied',
      error: 'Counsellors are not permitted to upload or overwrite student application documents.',
    };
  }

  const applicationId = String(params.applicationId || '').trim();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(applicationId)) {
    return {
      httpStatus: 400,
      ok: false,
      errorCode: 'invalid_application_id',
      error: 'Invalid application identifier.',
    };
  }

  const docType = String(params.docType || '').trim().toLowerCase();
  if (!isValidDocTypeIdentifier(docType)) {
    return {
      httpStatus: 400,
      ok: false,
      errorCode: 'invalid_doc_type',
      error: 'Unsupported document category.',
    };
  }

  const fileSize = Number(params.fileSize);
  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_SMART_APP_DOCUMENT_BYTES) {
    return {
      httpStatus: 400,
      ok: false,
      errorCode: 'invalid_file_size',
      error: 'File size must be between 1 byte and 20 MB.',
    };
  }

  const rawMime = String(params.mimeType || '').trim().toLowerCase();
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(rawMime)) {
    return {
      httpStatus: 400,
      ok: false,
      errorCode: 'invalid_mime_type',
      error: 'Unsupported file MIME type. Allowed: PDF, JPG, JPEG, PNG, HEIC, HEIF, ZIP.',
    };
  }
  const canonicalMime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;

  const safeBaseName = sanitizeUploadFileName(String(params.fileName || ''));
  const lowerName = safeBaseName.toLowerCase();
  const allowedExts = ALLOWED_EXTENSIONS_BY_MIME[rawMime] || [];
  if (
    safeBaseName.length < 3 ||
    safeBaseName.length > 120 ||
    safeBaseName.includes('..') ||
    !allowedExts.some((ext) => lowerName.endsWith(ext))
  ) {
    return {
      httpStatus: 400,
      ok: false,
      errorCode: 'invalid_file_name',
      error: 'File name extension is invalid or does not match the declared file type.',
    };
  }

  // Authoritatively fetch application from named Firestore database
  const fetchAppFn = params.deps?.fetchApplication || fetchAuthoritativeApplicationDoc;
  const lookup = await fetchAppFn({ applicationId, caller });

  if (lookup.status === 'forbidden') {
    return {
      httpStatus: 403,
      ok: false,
      errorCode: 'application_access_denied',
      error: 'You are not authorized to upload documents to this application.',
    };
  }
  if (lookup.status === 'not_found') {
    return {
      httpStatus: 404,
      ok: false,
      errorCode: 'application_not_found',
      error: 'Application record was not found. Please initialize your application draft first.',
    };
  }
  if (lookup.status === 'unavailable') {
    return {
      httpStatus: 503,
      ok: false,
      errorCode: 'firestore_unavailable',
      error: 'Could not verify application status against Firestore. Please retry shortly.',
    };
  }

  const app = lookup.app;

  // Ownership check: students may upload ONLY to their own applications
  if (!caller.isAdmin && (!app.userId || app.userId !== caller.uid)) {
    return {
      httpStatus: 403,
      ok: false,
      errorCode: 'ownership_denied',
      error: 'Access denied: you can only upload documents to your own application.',
    };
  }

  // ISSUE 3: Authoritative status check against named Firestore DB
  // Students may upload ONLY when status is strictly `draft` or `documents_missing`.
  const normalizedRawStatus = String(app.status || '').trim().toLowerCase();
  if (
    !caller.isAdmin &&
    (!STUDENT_UPLOAD_ALLOWED_STATUSES.has(normalizedRawStatus) ||
      STUDENT_UPLOAD_LOCKED_STATUSES.has(normalizedRawStatus))
  ) {
    return {
      httpStatus: 403,
      ok: false,
      errorCode: 'application_status_locked',
      error: `Document uploads are locked because this application is currently in "${normalizedRawStatus || 'unknown'}" status. Uploads are only permitted while "draft" or "documents_missing".`,
      applicationStatus: normalizedRawStatus || 'unknown',
    };
  }

  // Build unique immutable versioned storagePath so prior document versions are NEVER overwritten
  const nowMs = params.deps?.nowMs ? params.deps.nowMs() : Date.now();
  const nonce = crypto.randomBytes(6).toString('hex');
  const uniqueFileName = `${nowMs}_${nonce}_${safeBaseName}`;
  const ownerUid = app.userId;
  const storagePath = `applications/${ownerUid}/${applicationId}/${docType}/${uniqueFileName}`;
  const expiresAtMs = nowMs + UPLOAD_TICKET_TTL_MS;
  const jti = crypto.randomBytes(16).toString('hex');

  const ticketPayload: UploadAuthorizationTicketPayload = {
    kind: 'upload',
    jti,
    uid: caller.uid,
    ownerUid,
    applicationId,
    docType,
    storagePath,
    fileName: safeBaseName,
    contentType: canonicalMime,
    expectedSize: fileSize,
    expiresAtMs,
  };

  const env = params.deps?.env ?? process.env;
  let uploadToken: string;
  try {
    uploadToken = signTicketPayload(ticketPayload, env);
  } catch (err) {
    if (err instanceof MissingProductionSigningSecretError) {
      return {
        httpStatus: 503,
        ok: false,
        errorCode: 'signing_secret_not_configured',
        error: 'Upload ticket signing secret is not configured in the production environment.',
      };
    }
    throw err;
  }

  const ticketStore = params.deps?.ticketStore || createFirestoreSingleUseTicketStore(env);
  const regResult = await ticketStore.registerTicket({
    jti,
    kind: 'upload',
    uid: caller.uid,
    storagePath,
    expiresAtMs,
    consumed: false,
  });

  if (!regResult.ok && isProductionCloudRunRuntime(env) && !params.deps?.ticketStore) {
    return {
      httpStatus: 503,
      ok: false,
      errorCode: 'ticket_store_unavailable',
      error:
        'Shared multi-instance ticket store is unavailable. Verify roles/datastore.user on the Cloud Run service account.',
    };
  }

  // Mirror locally ONLY for non-production local dev fallback & backward-compatible sync unit tests
  if (!isProductionCloudRunRuntime(env)) {
    pruneExpiredTickets(nowMs);
    singleUseTicketRegistry.set(jti, {
      kind: 'upload',
      uid: caller.uid,
      storagePath,
      expiresAtMs,
      consumed: false,
    });
  }

  const customMetadata = {
    userId: ownerUid,
    applicationId,
    docType,
  };

  const signUploadFn = params.deps?.createSignedUploadUrl || defaultCreateSignedUploadUrl;
  const signedUploadUrl = await signUploadFn({
    storagePath,
    contentType: canonicalMime,
    expectedSize: fileSize,
    expiresAtMs,
    customMetadata,
  });

  if (signedUploadUrl) {
    return {
      httpStatus: 200,
      ok: true,
      mode: 'signed_url',
      uploadToken,
      uploadEndpoint: '/api/smart-applications/documents/upload',
      signedUploadUrl,
      signedHeaders: {
        'Content-Type': canonicalMime,
        'x-goog-if-generation-match': '0',
        'x-goog-content-length-range': `${fileSize},${fileSize}`,
        'x-goog-meta-userid': ownerUid,
        'x-goog-meta-applicationid': applicationId,
        'x-goog-meta-doctype': docType,
      },
      storagePath,
      fileName: safeBaseName,
      contentType: canonicalMime,
      expectedSize: fileSize,
      expiresAt: new Date(expiresAtMs).toISOString(),
      applicationStatus: normalizedRawStatus,
    };
  }

  return {
    httpStatus: 200,
    ok: true,
    mode: 'server_proxy',
    uploadToken,
    uploadEndpoint: '/api/smart-applications/documents/upload',
    storagePath,
    fileName: safeBaseName,
    contentType: canonicalMime,
    expectedSize: fileSize,
    expiresAt: new Date(expiresAtMs).toISOString(),
    applicationStatus: normalizedRawStatus,
  };
}

/**
 * Atomically verifies and consumes a single-use upload ticket, checking HMAC integrity,
 * expiration, caller UID binding, exact byte size, MIME match, and binary magic bytes.
 */
export function consumeAndVerifyUploadTicket(params: {
  uploadToken: string;
  callerUid: string;
  buffer: Buffer;
  contentType: string;
  nowMs?: number;
}):
  | { ok: true; payload: UploadAuthorizationTicketPayload }
  | { ok: false; httpStatus: number; errorCode: string; error: string } {
  const nowMs = params.nowMs ?? Date.now();
  const payload = verifyTicketSignature<UploadAuthorizationTicketPayload>(params.uploadToken);
  if (!payload || payload.kind !== 'upload' || !payload.jti) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'invalid_upload_token',
      error: 'Invalid or tampered upload authorization token.',
    };
  }

  if (payload.expiresAtMs <= nowMs) {
    singleUseTicketRegistry.delete(payload.jti);
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'upload_token_expired',
      error: 'Upload authorization token has expired. Please retry the upload.',
    };
  }

  if (payload.uid !== params.callerUid) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'upload_token_uid_mismatch',
      error: 'Upload authorization token does not belong to the authenticated user.',
    };
  }

  const tracked = singleUseTicketRegistry.get(payload.jti);
  if (!tracked || tracked.kind !== 'upload' || tracked.consumed) {
    return {
      ok: false,
      httpStatus: 409,
      errorCode: 'upload_token_already_used',
      error: 'This upload authorization token has already been used or revoked.',
    };
  }

  // Atomically consume BEFORE performing size/storage operations to prevent concurrent replay
  tracked.consumed = true;

  if (!Buffer.isBuffer(params.buffer) || params.buffer.length <= 0) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'empty_upload_body',
      error: 'Uploaded document body is empty.',
    };
  }

  if (params.buffer.length > MAX_SMART_APP_DOCUMENT_BYTES) {
    return {
      ok: false,
      httpStatus: 413,
      errorCode: 'file_too_large',
      error: 'Uploaded file exceeds the 20 MB maximum limit.',
    };
  }

  if (params.buffer.length !== payload.expectedSize) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'file_size_mismatch',
      error: 'Uploaded file size does not match the authorized upload size.',
    };
  }

  const normalizedIncomingMime = String(params.contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const canonicalIncomingMime =
    normalizedIncomingMime === 'image/jpg' ? 'image/jpeg' : normalizedIncomingMime;
  if (canonicalIncomingMime && canonicalIncomingMime !== payload.contentType) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'mime_type_mismatch',
      error: 'Uploaded content type does not match the authorized MIME type.',
    };
  }

  if (!validateUploadedDocumentMagicBytes(params.buffer, payload.contentType)) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'invalid_file_signature',
      error: 'Uploaded file binary signature does not match its declared document type.',
    };
  }

  return { ok: true, payload };
}

/**
 * Multi-instance Cloud Run safe upload ticket verification and atomic single-use consumption.
 * Uses the shared Firestore transaction store (`smart_app_auth_tickets/{jti}`) on EVERYKR's
 * named Firestore database (or an injected SharedSingleUseTicketStore for tests).
 */
export async function consumeAndVerifyUploadTicketAsync(params: {
  uploadToken: string;
  callerUid: string;
  buffer: Buffer;
  contentType: string;
  nowMs?: number;
  ticketStore?: SharedSingleUseTicketStore;
  env?: Record<string, string | undefined>;
}): Promise<
  | { ok: true; payload: UploadAuthorizationTicketPayload }
  | { ok: false; httpStatus: number; errorCode: string; error: string }
> {
  const env = params.env ?? process.env;
  const nowMs = params.nowMs ?? Date.now();
  try {
    resolveTicketSigningKey(env);
  } catch (err) {
    if (err instanceof MissingProductionSigningSecretError) {
      return {
        ok: false,
        httpStatus: 503,
        errorCode: 'signing_secret_not_configured',
        error: 'Upload ticket signing secret is not configured in the production environment.',
      };
    }
    throw err;
  }

  const payload = verifyTicketSignature<UploadAuthorizationTicketPayload>(params.uploadToken, env);
  if (!payload || payload.kind !== 'upload' || !payload.jti) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'invalid_upload_token',
      error: 'Invalid or tampered upload authorization token.',
    };
  }

  if (payload.expiresAtMs <= nowMs) {
    singleUseTicketRegistry.delete(payload.jti);
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'upload_token_expired',
      error: 'Upload authorization token has expired. Please retry the upload.',
    };
  }

  if (payload.uid !== params.callerUid) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'upload_token_uid_mismatch',
      error: 'Upload authorization token does not belong to the authenticated user.',
    };
  }

  const ticketStore = params.ticketStore || createFirestoreSingleUseTicketStore(env);
  const consumeRes = await ticketStore.consumeTicket({
    jti: payload.jti,
    kind: 'upload',
    uid: params.callerUid,
    nowMs,
  });

  if (!consumeRes.ok) {
    // Non-production local dev fallback ONLY when Firestore Datastore IAM is unavailable locally
    if (
      consumeRes.reason === 'store_unavailable' &&
      !isProductionCloudRunRuntime(env) &&
      !params.ticketStore
    ) {
      const tracked = singleUseTicketRegistry.get(payload.jti);
      if (!tracked || tracked.kind !== 'upload' || tracked.consumed) {
        return {
          ok: false,
          httpStatus: 409,
          errorCode: 'upload_token_already_used',
          error: 'This upload authorization token has already been used or revoked.',
        };
      }
      tracked.consumed = true;
    } else if (consumeRes.reason === 'store_unavailable') {
      return {
        ok: false,
        httpStatus: 503,
        errorCode: 'ticket_store_unavailable',
        error: 'Shared ticket store unavailable. Please retry shortly.',
      };
    } else if (consumeRes.reason === 'expired') {
      return {
        ok: false,
        httpStatus: 403,
        errorCode: 'upload_token_expired',
        error: 'Upload authorization token has expired. Please retry the upload.',
      };
    } else if (consumeRes.reason === 'uid_mismatch') {
      return {
        ok: false,
        httpStatus: 403,
        errorCode: 'upload_token_uid_mismatch',
        error: 'Upload authorization token does not belong to the authenticated user.',
      };
    } else {
      return {
        ok: false,
        httpStatus: 409,
        errorCode: 'upload_token_already_used',
        error: 'This upload authorization token has already been used or revoked.',
      };
    }
  } else {
    // Also mark local mirror consumed if present
    const local = singleUseTicketRegistry.get(payload.jti);
    if (local) local.consumed = true;
  }

  if (!Buffer.isBuffer(params.buffer) || params.buffer.length <= 0) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'empty_upload_body',
      error: 'Uploaded document body is empty.',
    };
  }
  if (params.buffer.length > MAX_SMART_APP_DOCUMENT_BYTES) {
    return {
      ok: false,
      httpStatus: 413,
      errorCode: 'file_too_large',
      error: 'Uploaded file exceeds the 20 MB maximum limit.',
    };
  }
  if (params.buffer.length !== payload.expectedSize) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'file_size_mismatch',
      error: 'Uploaded file size does not match the authorized upload size.',
    };
  }

  const normalizedIncomingMime = String(params.contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const canonicalIncomingMime =
    normalizedIncomingMime === 'image/jpg' ? 'image/jpeg' : normalizedIncomingMime;
  if (canonicalIncomingMime && canonicalIncomingMime !== payload.contentType) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'mime_type_mismatch',
      error: 'Uploaded content type does not match the authorized MIME type.',
    };
  }
  if (!validateUploadedDocumentMagicBytes(params.buffer, payload.contentType)) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'invalid_file_signature',
      error: 'Uploaded file binary signature does not match its declared document type.',
    };
  }

  return { ok: true, payload };
}

/**
 * Checks whether a requested `storagePath` belongs strictly to the target application
 * (matches `applications/{ownerUid}/{applicationId}/...` AND is listed in `app.documents`
 * either as the current version or in `previousVersions`).
 */
export function isStoragePathRegisteredOnApplication(
  app: AuthoritativeApplicationSnapshot,
  storagePath: string
): boolean {
  if (!storagePath || storagePath.includes('..')) return false;
  const expectedPrefix = `applications/${app.userId}/${app.id}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    return false;
  }

  const docs = app.documents || {};
  for (const entry of Object.values(docs)) {
    if (!entry) continue;
    if (entry.storagePath === storagePath) {
      return true;
    }
    if (
      Array.isArray(entry.previousVersions) &&
      entry.previousVersions.some((v) => v?.storagePath === storagePath)
    ) {
      return true;
    }
  }
  return false;
}

export interface AuthorizeDocumentReadResult {
  httpStatus: number;
  ok: boolean;
  errorCode?: string;
  error?: string;
  mode?: 'signed_url' | 'server_stream';
  signedReadUrl?: string;
  streamUrl?: string;
  readToken?: string;
  storagePath?: string;
  expiresAt?: string;
}

/**
 * Authorizes private document read access for Students, Assigned Counsellors, and Admins
 * against EVERYKR's primary named Firestore database.
 *
 * Enforces:
 * - Verified Firebase ID token + verified custom claims ONLY
 * - ISSUE 1 (Counsellor isolation): Counsellors allowed ONLY if `app.assignedTo === caller.uid`
 * - ISSUE 2 (Viewer isolation): Viewers strictly DENIED (403) for all raw student documents
 * - Student isolation: Students allowed ONLY if `app.userId === caller.uid`
 * - Admin: Verified custom claim Admin allowed for authorized application documents
 * - Path integrity: `storagePath` must belong to the application and exist in `app.documents`
 */
export async function authorizeSmartApplicationDocumentRead(params: {
  idToken: string | null | undefined;
  applicationId: unknown;
  storagePath: unknown;
  deps?: SmartAppDocumentAuthDeps;
}): Promise<AuthorizeDocumentReadResult> {
  const caller = await resolveVerifiedStorageCaller(params.idToken, params.deps);
  if (!caller) {
    return {
      httpStatus: 401,
      ok: false,
      errorCode: 'unauthenticated',
      error: 'Valid Firebase authentication is required to access application documents.',
    };
  }

  // ISSUE 2: Least-privilege Viewer isolation — ZERO access to raw student PII documents
  if (caller.isViewer) {
    return {
      httpStatus: 403,
      ok: false,
      errorCode: 'viewer_document_access_denied',
      error:
        'Access denied: Viewers are restricted to masked application summaries and cannot access raw student documents.',
    };
  }

  const applicationId = String(params.applicationId || '').trim();
  const storagePath = String(params.storagePath || '').trim();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(applicationId)) {
    return {
      httpStatus: 400,
      ok: false,
      errorCode: 'invalid_application_id',
      error: 'Invalid application identifier.',
    };
  }
  if (
    !storagePath ||
    storagePath.length > 500 ||
    storagePath.includes('..') ||
    !storagePath.startsWith('applications/')
  ) {
    return {
      httpStatus: 400,
      ok: false,
      errorCode: 'invalid_storage_path',
      error: 'Invalid document storage path.',
    };
  }

  const fetchAppFn = params.deps?.fetchApplication || fetchAuthoritativeApplicationDoc;
  const lookup = await fetchAppFn({ applicationId, caller });

  if (lookup.status === 'forbidden') {
    return {
      httpStatus: 403,
      ok: false,
      errorCode: 'application_access_denied',
      error: 'You are not authorized to access documents for this application.',
    };
  }
  if (lookup.status === 'not_found') {
    return {
      httpStatus: 404,
      ok: false,
      errorCode: 'application_not_found',
      error: 'Application record not found.',
    };
  }
  if (lookup.status === 'unavailable') {
    return {
      httpStatus: 503,
      ok: false,
      errorCode: 'firestore_unavailable',
      error: 'Could not verify document authorization against Firestore. Please retry shortly.',
    };
  }

  const app = lookup.app;

  // Strict RBAC verification
  if (caller.isAdmin) {
    // Verified Admin claim: permitted for registered documents on this application
  } else if (caller.isCounsellor) {
    // ISSUE 1: Counsellors may access ONLY applications explicitly assigned to their UID
    if (!app.assignedTo || app.assignedTo !== caller.uid) {
      return {
        httpStatus: 403,
        ok: false,
        errorCode: 'counsellor_not_assigned',
        error:
          'Access denied: counsellors can only access documents for applications assigned to their UID.',
      };
    }
  } else {
    // Student: may access ONLY their own application documents
    if (!app.userId || app.userId !== caller.uid) {
      return {
        httpStatus: 403,
        ok: false,
        errorCode: 'ownership_denied',
        error: 'Access denied: you can only access your own application documents.',
      };
    }
  }

  // Ensure the requested object actually belongs to this application record (prevents path confusion)
  if (!isStoragePathRegisteredOnApplication(app, storagePath)) {
    return {
      httpStatus: 403,
      ok: false,
      errorCode: 'document_not_in_application',
      error: 'Requested document path does not belong to this application.',
    };
  }

  const nowMs = params.deps?.nowMs ? params.deps.nowMs() : Date.now();
  const expiresAtMs = nowMs + READ_TICKET_TTL_MS;
  const jti = crypto.randomBytes(16).toString('hex');

  const readPayload: ReadAuthorizationTicketPayload = {
    kind: 'read',
    jti,
    uid: caller.uid,
    role: caller.role,
    applicationId,
    storagePath,
    expiresAtMs,
  };

  const env = params.deps?.env ?? process.env;
  let readToken: string;
  try {
    readToken = signTicketPayload(readPayload, env);
  } catch (err) {
    if (err instanceof MissingProductionSigningSecretError) {
      return {
        httpStatus: 503,
        ok: false,
        errorCode: 'signing_secret_not_configured',
        error: 'Document read ticket signing secret is not configured in the production environment.',
      };
    }
    throw err;
  }

  const ticketStore = params.deps?.ticketStore || createFirestoreSingleUseTicketStore(env);
  const regResult = await ticketStore.registerTicket({
    jti,
    kind: 'read',
    uid: caller.uid,
    storagePath,
    expiresAtMs,
    consumed: false,
  });

  if (!regResult.ok && isProductionCloudRunRuntime(env) && !params.deps?.ticketStore) {
    return {
      httpStatus: 503,
      ok: false,
      errorCode: 'ticket_store_unavailable',
      error:
        'Shared multi-instance ticket store is unavailable. Verify roles/datastore.user on the Cloud Run service account.',
    };
  }

  if (!isProductionCloudRunRuntime(env)) {
    pruneExpiredTickets(nowMs);
    singleUseTicketRegistry.set(jti, {
      kind: 'read',
      uid: caller.uid,
      storagePath,
      expiresAtMs,
      consumed: false,
    });
  }

  const signReadFn = params.deps?.createSignedReadUrl || defaultCreateSignedReadUrl;
  const signedReadUrl = await signReadFn({ storagePath, expiresAtMs });

  return {
    httpStatus: 200,
    ok: true,
    mode: signedReadUrl ? 'signed_url' : 'server_stream',
    ...(signedReadUrl ? { signedReadUrl } : {}),
    streamUrl: `/api/smart-applications/documents/stream?token=${encodeURIComponent(readToken)}`,
    readToken,
    storagePath,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

/**
 * Atomically verifies and consumes a single-use read stream ticket bound to the authenticated caller.
 */
export function consumeAndVerifyReadTicket(params: {
  readToken: string;
  callerUid: string;
  nowMs?: number;
}):
  | { ok: true; payload: ReadAuthorizationTicketPayload }
  | { ok: false; httpStatus: number; errorCode: string; error: string } {
  const nowMs = params.nowMs ?? Date.now();
  const payload = verifyTicketSignature<ReadAuthorizationTicketPayload>(params.readToken);
  if (!payload || payload.kind !== 'read' || !payload.jti) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'invalid_read_token',
      error: 'Invalid or tampered document read token.',
    };
  }
  if (payload.expiresAtMs <= nowMs) {
    singleUseTicketRegistry.delete(payload.jti);
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'read_token_expired',
      error: 'Document read authorization has expired.',
    };
  }
  if (payload.uid !== params.callerUid) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'read_token_uid_mismatch',
      error: 'Document read token does not belong to the authenticated user.',
    };
  }
  const tracked = singleUseTicketRegistry.get(payload.jti);
  if (!tracked || tracked.kind !== 'read' || tracked.consumed) {
    return {
      ok: false,
      httpStatus: 409,
      errorCode: 'read_token_already_used',
      error: 'Document read token has already been used.',
    };
  }
  tracked.consumed = true;
  return { ok: true, payload };
}

/**
 * Multi-instance Cloud Run safe read stream ticket verification and atomic single-use consumption.
 */
export async function consumeAndVerifyReadTicketAsync(params: {
  readToken: string;
  callerUid: string;
  nowMs?: number;
  ticketStore?: SharedSingleUseTicketStore;
  env?: Record<string, string | undefined>;
}): Promise<
  | { ok: true; payload: ReadAuthorizationTicketPayload }
  | { ok: false; httpStatus: number; errorCode: string; error: string }
> {
  const env = params.env ?? process.env;
  const nowMs = params.nowMs ?? Date.now();
  try {
    resolveTicketSigningKey(env);
  } catch (err) {
    if (err instanceof MissingProductionSigningSecretError) {
      return {
        ok: false,
        httpStatus: 503,
        errorCode: 'signing_secret_not_configured',
        error: 'Document read ticket signing secret is not configured in the production environment.',
      };
    }
    throw err;
  }

  const payload = verifyTicketSignature<ReadAuthorizationTicketPayload>(params.readToken, env);
  if (!payload || payload.kind !== 'read' || !payload.jti) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'invalid_read_token',
      error: 'Invalid or tampered document read token.',
    };
  }
  if (payload.expiresAtMs <= nowMs) {
    singleUseTicketRegistry.delete(payload.jti);
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'read_token_expired',
      error: 'Document read authorization has expired.',
    };
  }
  if (payload.uid !== params.callerUid) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'read_token_uid_mismatch',
      error: 'Document read token does not belong to the authenticated user.',
    };
  }

  const ticketStore = params.ticketStore || createFirestoreSingleUseTicketStore(env);
  const consumeRes = await ticketStore.consumeTicket({
    jti: payload.jti,
    kind: 'read',
    uid: params.callerUid,
    nowMs,
  });

  if (!consumeRes.ok) {
    if (
      consumeRes.reason === 'store_unavailable' &&
      !isProductionCloudRunRuntime(env) &&
      !params.ticketStore
    ) {
      const tracked = singleUseTicketRegistry.get(payload.jti);
      if (!tracked || tracked.kind !== 'read' || tracked.consumed) {
        return {
          ok: false,
          httpStatus: 409,
          errorCode: 'read_token_already_used',
          error: 'Document read token has already been used.',
        };
      }
      tracked.consumed = true;
    } else if (consumeRes.reason === 'store_unavailable') {
      return {
        ok: false,
        httpStatus: 503,
        errorCode: 'ticket_store_unavailable',
        error: 'Shared ticket store unavailable. Please retry shortly.',
      };
    } else if (consumeRes.reason === 'expired') {
      return {
        ok: false,
        httpStatus: 403,
        errorCode: 'read_token_expired',
        error: 'Document read authorization has expired.',
      };
    } else if (consumeRes.reason === 'uid_mismatch') {
      return {
        ok: false,
        httpStatus: 403,
        errorCode: 'read_token_uid_mismatch',
        error: 'Document read token does not belong to the authenticated user.',
      };
    } else {
      return {
        ok: false,
        httpStatus: 409,
        errorCode: 'read_token_already_used',
        error: 'Document read token has already been used.',
      };
    }
  } else {
    const local = singleUseTicketRegistry.get(payload.jti);
    if (local) local.consumed = true;
  }

  return { ok: true, payload };
}

/**
 * Detects Google Cloud Storage / Firebase Admin Storage IAM permission errors (HTTP 403 /
 * PERMISSION_DENIED) where the runtime service account lacks `storage.objects.create` or
 * `storage.objects.get` on `gs://everykr.firebasestorage.app`.
 */
export function isStorageIamPermissionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as any;
  const numericCode = Number(anyErr.code);
  const strCode = String(anyErr.code || '').toLowerCase();
  const msg = String(anyErr.message || '').toLowerCase();
  const responseStatus = Number(anyErr?.response?.statusCode || anyErr?.response?.status || 0);

  if (numericCode === 403 || strCode === '403' || responseStatus === 403) {
    return true;
  }
  if (
    strCode === 'permission_denied' ||
    strCode === '7' ||
    strCode === 'storage/unauthorized' ||
    msg.includes('storage.objects.create') ||
    msg.includes('storage.objects.get') ||
    msg.includes('does not have storage.objects.') ||
    msg.includes('caller does not have permission') ||
    msg.includes('permission_denied')
  ) {
    return true;
  }
  return false;
}

/**
 * Attempts an authenticated upload through the official Firebase Storage REST API using the
 * caller's verified Firebase ID token. Firebase evaluates the live deployed `storage.rules`
 * against the caller's token (so security rules are never bypassed or weakened).
 */
async function tryUploadViaFirebaseStorageRest(params: {
  storagePath: string;
  buffer: Buffer;
  contentType: string;
  ownerUid: string;
  applicationId: string;
  docType: string;
  callerIdToken: string;
}): Promise<{ fullPath: string; size: number } | null> {
  if (!params.callerIdToken) return null;

  const boundary = `everykr_${crypto.randomBytes(12).toString('hex')}`;
  const metadataJson = JSON.stringify({
    name: params.storagePath,
    contentType: params.contentType,
    cacheControl: 'private, no-store, max-age=0',
    metadata: {
      userId: params.ownerUid,
      applicationId: params.applicationId,
      docType: params.docType,
    },
  });

  const headPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataJson}\r\n` +
      `--${boundary}\r\nContent-Type: ${params.contentType}\r\n\r\n`,
    'utf8'
  );
  const tailPart = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  const multipartBody = Buffer.concat([headPart, params.buffer, tailPart]);

  const url =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(SMART_APP_STORAGE_BUCKET)}/o` +
    `?uploadType=multipart&name=${encodeURIComponent(params.storagePath)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Firebase ${params.callerIdToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
      signal: AbortSignal.timeout(30_000),
    });

    if (res.ok) {
      return {
        fullPath: params.storagePath,
        size: params.buffer.length,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Attempts an authenticated download through the official Firebase Storage REST API using
 * the caller's verified Firebase ID token (subject to live deployed `storage.rules`).
 */
async function tryDownloadViaFirebaseStorageRest(
  storagePath: string,
  callerIdToken: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!callerIdToken) return null;

  const url =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(SMART_APP_STORAGE_BUCKET)}/o/` +
    `${encodeURIComponent(storagePath)}?alt=media`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Firebase ${callerIdToken}`,
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuf),
      contentType: res.headers.get('content-type') || 'application/octet-stream',
    };
  } catch {
    return null;
  }
}

async function getFirebaseAdminOAuthAccessToken(): Promise<string | null> {
  try {
    const { app: adminApp } = getOrInitFirebaseAdminApp();
    const tokenObj = await adminApp.options.credential?.getAccessToken();
    const token = tokenObj?.access_token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

function createGcsHttpError(status: number, bodyText: string): Error & { code: number } {
  const snippet = bodyText.slice(0, 300).trim();
  const err = new Error(snippet || `Cloud Storage HTTP ${status}`) as Error & { code: number };
  err.code = status;
  return err;
}

/**
 * Direct GCS JSON API multipart upload using Firebase Admin OAuth2 credentials and native
 * Node fetch. Enforces `ifGenerationMatch=0` (strictly immutable create-only) without
 * invoking `@google-cloud/storage`'s `teeny-request` / `node-fetch` `PassThrough` stream
 * pipeline (which can exceed Node's default 10 `'error'` listeners per `PassThrough`).
 */
async function uploadViaGcsJsonApiWithAdminToken(params: {
  storagePath: string;
  buffer: Buffer;
  contentType: string;
  ownerUid: string;
  applicationId: string;
  docType: string;
}): Promise<{ handled: true; result: { fullPath: string; size: number } } | { handled: false }> {
  const accessToken = await getFirebaseAdminOAuthAccessToken();
  if (!accessToken) {
    return { handled: false };
  }

  const boundary = `everykr_gcs_${crypto.randomBytes(12).toString('hex')}`;
  const metadataJson = JSON.stringify({
    name: params.storagePath,
    contentType: params.contentType,
    cacheControl: 'private, no-store, max-age=0',
    metadata: {
      userId: params.ownerUid,
      applicationId: params.applicationId,
      docType: params.docType,
    },
  });

  const headPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataJson}\r\n` +
      `--${boundary}\r\nContent-Type: ${params.contentType}\r\n\r\n`,
    'utf8'
  );
  const tailPart = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  const multipartBody = Buffer.concat([headPart, params.buffer, tailPart]);

  const url =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(SMART_APP_STORAGE_BUCKET)}/o` +
    `?uploadType=multipart&ifGenerationMatch=0`;

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
      signal: AbortSignal.timeout(30_000),
    });

    if (res.ok) {
      return {
        handled: true,
        result: {
          fullPath: params.storagePath,
          size: params.buffer.length,
        },
      };
    }

    const errText = await res.text().catch(() => '');
    const isTransient = res.status === 429 || res.status >= 500;
    if (isTransient && attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 250 + Math.floor(Math.random() * 200)));
      continue;
    }

    throw createGcsHttpError(res.status, errText);
  }

  return { handled: false };
}

/**
 * Direct GCS JSON API media download using Firebase Admin OAuth2 credentials and native
 * Node fetch. Avoids `@google-cloud/storage`'s `retry-request` / `teeny-request` / `node-fetch`
 * nested `PassThrough` stream pipelines and returns both `buffer` and `contentType` in one RTT.
 */
async function downloadViaGcsJsonApiWithAdminToken(
  storagePath: string
): Promise<{ handled: true; result: { buffer: Buffer; contentType: string } } | { handled: false }> {
  const accessToken = await getFirebaseAdminOAuthAccessToken();
  if (!accessToken) {
    return { handled: false };
  }

  const url =
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(SMART_APP_STORAGE_BUCKET)}/o/` +
    `${encodeURIComponent(storagePath)}?alt=media`;

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(25_000),
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      return {
        handled: true,
        result: {
          buffer: Buffer.from(arrayBuf),
          contentType: res.headers.get('content-type') || 'application/octet-stream',
        },
      };
    }

    const errText = await res.text().catch(() => '');
    const isTransient = res.status === 429 || res.status >= 500;
    if (isTransient && attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 250 + Math.floor(Math.random() * 200)));
      continue;
    }

    throw createGcsHttpError(res.status, errText);
  }

  return { handled: false };
}

/**
 * Writes a verified document buffer to `gs://everykr.firebasestorage.app/{storagePath}`
 * using Firebase Admin OAuth2 credentials with `ifGenerationMatch=0` (strictly immutable create-only).
 * If Admin Storage fails with an IAM 403 on an environment where the runtime service account
 * has not yet been granted `roles/storage.objectUser`, attempts an authenticated Firebase
 * Storage REST upload using the caller's verified ID token (still strictly enforced by live
 * `storage.rules`).
 */
export async function uploadVerifiedBufferToPrivateStorage(params: {
  storagePath: string;
  buffer: Buffer;
  contentType: string;
  ownerUid: string;
  applicationId: string;
  docType: string;
  callerIdToken?: string;
}): Promise<{ fullPath: string; size: number }> {
  try {
    const directUpload = await uploadViaGcsJsonApiWithAdminToken(params);
    if (directUpload.handled) {
      return directUpload.result;
    }

    const { app: adminApp } = getOrInitFirebaseAdminApp();
    const bucket = getAdminStorage(adminApp).bucket(SMART_APP_STORAGE_BUCKET);
    const file = bucket.file(params.storagePath);

    await file.save(params.buffer, {
      resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: {
        contentType: params.contentType,
        cacheControl: 'private, no-store, max-age=0',
        metadata: {
          userId: params.ownerUid,
          applicationId: params.applicationId,
          docType: params.docType,
        },
      },
    });

    return {
      fullPath: params.storagePath,
      size: params.buffer.length,
    };
  } catch (adminErr: unknown) {
    if (isStorageIamPermissionError(adminErr) && params.callerIdToken) {
      const restResult = await tryUploadViaFirebaseStorageRest({
        storagePath: params.storagePath,
        buffer: params.buffer,
        contentType: params.contentType,
        ownerUid: params.ownerUid,
        applicationId: params.applicationId,
        docType: params.docType,
        callerIdToken: params.callerIdToken,
      });
      if (restResult) {
        return restResult;
      }
    }
    throw adminErr;
  }
}

/**
 * Downloads a verified private document buffer from `gs://everykr.firebasestorage.app/{storagePath}`
 * via Firebase Admin OAuth2 credentials for server-authorized streaming to assigned counsellors/admins/owners.
 */
export async function downloadPrivateStorageObject(
  storagePath: string,
  callerIdToken?: string
): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  try {
    const directDownload = await downloadViaGcsJsonApiWithAdminToken(storagePath);
    if (directDownload.handled) {
      return directDownload.result;
    }

    const { app: adminApp } = getOrInitFirebaseAdminApp();
    const bucket = getAdminStorage(adminApp).bucket(SMART_APP_STORAGE_BUCKET);
    const file = bucket.file(storagePath);
    const [[metadata], [buffer]] = await Promise.all([file.getMetadata(), file.download()]);
    return {
      buffer,
      contentType: String(metadata?.contentType || 'application/octet-stream'),
    };
  } catch (adminErr: unknown) {
    if (isStorageIamPermissionError(adminErr) && callerIdToken) {
      const restResult = await tryDownloadViaFirebaseStorageRest(storagePath, callerIdToken);
      if (restResult) {
        return restResult;
      }
    }
    throw adminErr;
  }
}
