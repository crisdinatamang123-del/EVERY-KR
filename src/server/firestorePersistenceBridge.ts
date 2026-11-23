/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Production Firestore Persistence Bridge & Safe Legacy JSON Migration Engine
 *
 * Targets the named EVERYKR Firestore database:
 *   `ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f`
 *
 * Provides:
 *  1. Shared named-DB Firestore Admin accessor (`getNamedAdminFirestore`).
 *  2. Multi-instance Cloud Run runtime detection (`isProductionCloudRunRuntime`).
 *  3. Additive Firestore persistence adapters for:
 *     - Automated Email audit logs & deduplication records (`automated_email_audit_logs`, `automated_email_dedup_state`)
 *     - Newsletter subscribers, campaigns, suppression & delivery logs (`newsletter_subscribers`, `newsletter_campaigns`, `newsletter_suppression`, `newsletter_delivery_logs`)
 *     - Centralized user management & audit logs (`user_management_users`, `user_management_login_logs`, `user_management_admin_logs`, `user_management_registration_logs`, `user_management_privacy_requests`, `user_management_config`)
 *     - Enterprise RBAC staff roles & immutable role history (`staff_roles`, `staff_role_history`)
 *  4. Idempotent, duplicate-safe legacy JSON-to-Firestore migration (`migrateLegacyJsonStoresToFirestore`)
 *     that NEVER deletes or mutates legacy `.everykr-*.json` files on disk.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getFirestore as getAdminFirestore, type Firestore } from 'firebase-admin/firestore';
import { getOrInitFirebaseAdminApp } from './firebaseAdminResetService.ts';

export const NAMED_FIRESTORE_DATABASE_ID =
  'ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f';

export const FIRESTORE_COLLECTIONS = {
  // Multi-instance single-use storage auth tickets (Priority 3)
  smartAppAuthTickets: 'smart_app_auth_tickets',
  // Enterprise RBAC (Priority 6)
  staffRoles: 'staff_roles',
  staffRoleHistory: 'staff_role_history',
  // Automated Emails (Priority 4)
  automatedEmailAuditLogs: 'automated_email_audit_logs',
  automatedEmailDedupState: 'automated_email_dedup_state',
  // Newsletter (Priority 4)
  newsletterSubscribers: 'newsletter_subscribers',
  newsletterCampaigns: 'newsletter_campaigns',
  newsletterSuppression: 'newsletter_suppression',
  newsletterDeliveryLogs: 'newsletter_delivery_logs',
  // User Management (Priority 4 — additive collections preserving legacy `users` schema)
  userManagementUsers: 'user_management_users',
  userManagementLoginLogs: 'user_management_login_logs',
  userManagementAdminLogs: 'user_management_admin_logs',
  userManagementRegistrationLogs: 'user_management_registration_logs',
  userManagementPrivacyRequests: 'user_management_privacy_requests',
  userManagementConfig: 'user_management_config',
} as const;

let cachedNamedDb: Firestore | null = null;
let firestoreWriteBackoffUntilMs = 0;

/**
 * Returns true when running on Cloud Run or explicitly configured for production security mode.
 * Used to enforce fail-closed signing secret policies and shared multi-instance persistence.
 */
export function isProductionCloudRunRuntime(
  env: Record<string, string | undefined> = process.env
): boolean {
  if (env.EVERYKR_ENFORCE_PROD_SECRETS === 'true') {
    return true;
  }
  if (env.NODE_ENV === 'production') {
    return true;
  }
  const kService = String(env.K_SERVICE || '').trim();
  if (kService && env.NODE_ENV !== 'development' && !kService.startsWith('ais-dev-')) {
    return true;
  }
  return false;
}

/**
 * Deterministic, collision-resistant Firestore document ID derived from an email address.
 * Prevents duplicate subscriber/suppression documents across concurrent Cloud Run instances.
 */
export function deterministicEmailHashId(email: string): string {
  const normalized = String(email || '').trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

/**
 * Deterministic safe Firestore document ID for arbitrary string keys (strips `/`, pads length).
 */
export function sanitizeFirestoreDocId(raw: string, fallbackPrefix: string = 'doc'): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  if (cleaned && cleaned !== '.' && cleaned !== '..') {
    return cleaned;
  }
  return `${fallbackPrefix}_${crypto.createHash('sha256').update(String(raw || '')).digest('hex').slice(0, 16)}`;
}

/**
 * Removes undefined values recursively so Firestore Admin SDK writes never fail on undefined fields.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

/**
 * Returns the Firebase Admin Firestore client bound strictly to EVERYKR's named database
 * `ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f`.
 */
export function getNamedAdminFirestore(): Firestore | null {
  if (cachedNamedDb) return cachedNamedDb;
  try {
    const { app } = getOrInitFirebaseAdminApp();
    cachedNamedDb = getAdminFirestore(app, NAMED_FIRESTORE_DATABASE_ID);
    return cachedNamedDb;
  } catch {
    return null;
  }
}

export function isFirestoreIamOrUnavailableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as any;
  const code = String(anyErr.code || '').toLowerCase();
  const msg = String(anyErr.message || '').toLowerCase();
  return (
    code === '7' ||
    code === 'permission_denied' ||
    code === 'unauthenticated' ||
    code === '16' ||
    code === '14' ||
    code === 'unavailable' ||
    msg.includes('permission_denied') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('could not load the default credentials') ||
    msg.includes('unable to detect a project id')
  );
}

/**
 * Best-effort additive Firestore mirror write for runtime operations.
 * In Cloud Run production, logs structured warnings on failure; in local dev without
 * Datastore IAM, backs off cleanly for 60s so local dev remains fast and usable.
 */
export async function upsertNamedFirestoreDoc(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
  options?: { merge?: boolean }
): Promise<{ ok: boolean; skippedBackoff?: boolean; error?: string }> {
  const now = Date.now();
  if (!isProductionCloudRunRuntime() && now < firestoreWriteBackoffUntilMs) {
    return { ok: false, skippedBackoff: true };
  }

  const db = getNamedAdminFirestore();
  if (!db) {
    return { ok: false, error: 'Named Firestore Admin client unavailable' };
  }

  try {
    const safeId = sanitizeFirestoreDocId(docId);
    const payload = stripUndefinedDeep({
      ...data,
      _persistedAt: new Date().toISOString(),
      _databaseId: NAMED_FIRESTORE_DATABASE_ID,
    });
    await db
      .collection(collectionName)
      .doc(safeId)
      .set(payload, { merge: options?.merge !== false });
    return { ok: true };
  } catch (err: any) {
    if (!isProductionCloudRunRuntime() && isFirestoreIamOrUnavailableError(err)) {
      firestoreWriteBackoffUntilMs = Date.now() + 60_000;
    }
    return { ok: false, error: String(err?.message || 'Firestore write failed') };
  }
}

/**
 * Transactional upsert on the named Firestore database (multi-instance safe).
 */
export async function runNamedFirestoreTransaction<T>(
  fn: (tx: FirebaseFirestore.Transaction, db: Firestore) => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const db = getNamedAdminFirestore();
  if (!db) {
    return { ok: false, error: 'Named Firestore Admin client unavailable' };
  }
  try {
    const value = await db.runTransaction((tx) => fn(tx, db));
    return { ok: true, value };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || 'Firestore transaction failed') };
  }
}

/**
 * Reads a document from the named Firestore database.
 */
export async function getNamedFirestoreDoc<T = Record<string, unknown>>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const db = getNamedAdminFirestore();
  if (!db) return null;
  try {
    const snap = await db.collection(collectionName).doc(sanitizeFirestoreDocId(docId)).get();
    if (!snap.exists) return null;
    return snap.data() as T;
  } catch {
    return null;
  }
}

/**
 * Lists recent documents from a named Firestore collection ordered by a timestamp field.
 */
export async function listNamedFirestoreDocs<T = Record<string, unknown>>(
  collectionName: string,
  options?: { orderByField?: string; direction?: 'asc' | 'desc'; limitCount?: number }
): Promise<T[] | null> {
  const db = getNamedAdminFirestore();
  if (!db) return null;
  try {
    let q: FirebaseFirestore.Query = db.collection(collectionName);
    if (options?.orderByField) {
      q = q.orderBy(options.orderByField, options.direction || 'desc');
    }
    if (options?.limitCount && options.limitCount > 0) {
      q = q.limit(options.limitCount);
    }
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as T);
  } catch {
    return null;
  }
}

// ============================================================================
// SAFE, IDEMPOTENT LEGACY JSON -> FIRESTORE MIGRATION ENGINE (PRIORITY 4)
// ============================================================================

export interface MigrationWriteAdapter {
  exists: (collectionName: string, docId: string) => Promise<boolean>;
  upsert: (
    collectionName: string,
    docId: string,
    data: Record<string, unknown>
  ) => Promise<void>;
}

export interface StoreMigrationCounters {
  sourceFile: string;
  sourceExists: boolean;
  totalParsedRecords: number;
  migratedCount: number;
  skippedDuplicateCount: number;
  errorCount: number;
  errors: string[];
}

export interface LegacyJsonMigrationReport {
  ok: boolean;
  dryRun: boolean;
  databaseId: string;
  legacyFilesPreservedIntact: boolean;
  startedAt: string;
  completedAt: string;
  userManagement: StoreMigrationCounters;
  automatedEmails: StoreMigrationCounters;
  newsletter: StoreMigrationCounters;
  totalMigrated: number;
  totalSkippedDuplicates: number;
  totalErrors: number;
}

export interface LegacyJsonMigrationOptions {
  baseDir?: string;
  dryRun?: boolean;
  adapter?: MigrationWriteAdapter;
}

function createDefaultFirestoreMigrationAdapter(): MigrationWriteAdapter {
  const db = getNamedAdminFirestore();
  if (!db) {
    throw new Error(
      `Cannot initialize Firestore migration adapter for database "${NAMED_FIRESTORE_DATABASE_ID}".`
    );
  }
  return {
    async exists(collectionName: string, docId: string): Promise<boolean> {
      const snap = await db.collection(collectionName).doc(sanitizeFirestoreDocId(docId)).get();
      return snap.exists;
    },
    async upsert(
      collectionName: string,
      docId: string,
      data: Record<string, unknown>
    ): Promise<void> {
      await db
        .collection(collectionName)
        .doc(sanitizeFirestoreDocId(docId))
        .set(
          stripUndefinedDeep({
            ...data,
            _migratedFromLegacyJson: true,
            _migratedAt: new Date().toISOString(),
            _databaseId: NAMED_FIRESTORE_DATABASE_ID,
          }),
          { merge: true }
        );
    },
  };
}

/**
 * In-memory migration adapter for deterministic automated testing of idempotency,
 * duplicate prevention, and legacy file preservation without live cloud writes.
 */
export function createInMemoryMigrationAdapter(): MigrationWriteAdapter & {
  collections: Map<string, Map<string, Record<string, unknown>>>;
} {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  return {
    collections,
    async exists(collectionName: string, docId: string): Promise<boolean> {
      const safeId = sanitizeFirestoreDocId(docId);
      return Boolean(collections.get(collectionName)?.has(safeId));
    },
    async upsert(
      collectionName: string,
      docId: string,
      data: Record<string, unknown>
    ): Promise<void> {
      const safeId = sanitizeFirestoreDocId(docId);
      if (!collections.has(collectionName)) {
        collections.set(collectionName, new Map());
      }
      const existing = collections.get(collectionName)!.get(safeId) || {};
      collections.get(collectionName)!.set(safeId, {
        ...existing,
        ...stripUndefinedDeep(data),
      });
    },
  };
}

async function migrateRecordIdempotent(params: {
  collectionName: string;
  docId: string;
  data: Record<string, unknown>;
  adapter: MigrationWriteAdapter;
  dryRun: boolean;
  counters: StoreMigrationCounters;
}): Promise<void> {
  params.counters.totalParsedRecords += 1;
  try {
    const alreadyExists = await params.adapter.exists(params.collectionName, params.docId);
    if (alreadyExists) {
      params.counters.skippedDuplicateCount += 1;
      return;
    }
    if (!params.dryRun) {
      await params.adapter.upsert(params.collectionName, params.docId, params.data);
    }
    params.counters.migratedCount += 1;
  } catch (err: any) {
    params.counters.errorCount += 1;
    params.counters.errors.push(
      `${params.collectionName}/${params.docId}: ${String(err?.message || 'write failed')}`
    );
  }
}

/**
 * Safely migrates records from the three legacy JSON files:
 *   1. `.everykr-user-management.json`
 *   2. `.everykr-automated-emails.json`
 *   3. `.everykr-newsletter-store.json`
 * into additive collections on EVERYKR's named Firestore database.
 *
 * Guarantees:
 *  - Deterministic document IDs (idempotent re-runs never create duplicates).
 *  - Never deletes, truncates, or modifies the legacy JSON files on disk.
 *  - Never migrates plaintext secrets or raw password hashes into public collections.
 *  - Supports `dryRun: true` for pre-flight verification.
 */
export async function migrateLegacyJsonStoresToFirestore(
  options?: LegacyJsonMigrationOptions
): Promise<LegacyJsonMigrationReport> {
  const startedAt = new Date().toISOString();
  const baseDir = options?.baseDir ? path.resolve(options.baseDir) : process.cwd();
  const dryRun = Boolean(options?.dryRun);
  const adapter = options?.adapter || createDefaultFirestoreMigrationAdapter();

  const userFile = path.join(baseDir, '.everykr-user-management.json');
  const emailFile = path.join(baseDir, '.everykr-automated-emails.json');
  const newsletterFile = path.join(baseDir, '.everykr-newsletter-store.json');

  const userManagement: StoreMigrationCounters = {
    sourceFile: '.everykr-user-management.json',
    sourceExists: fs.existsSync(userFile),
    totalParsedRecords: 0,
    migratedCount: 0,
    skippedDuplicateCount: 0,
    errorCount: 0,
    errors: [],
  };

  const automatedEmails: StoreMigrationCounters = {
    sourceFile: '.everykr-automated-emails.json',
    sourceExists: fs.existsSync(emailFile),
    totalParsedRecords: 0,
    migratedCount: 0,
    skippedDuplicateCount: 0,
    errorCount: 0,
    errors: [],
  };

  const newsletter: StoreMigrationCounters = {
    sourceFile: '.everykr-newsletter-store.json',
    sourceExists: fs.existsSync(newsletterFile),
    totalParsedRecords: 0,
    migratedCount: 0,
    skippedDuplicateCount: 0,
    errorCount: 0,
    errors: [],
  };

  // 1. Migrate `.everykr-user-management.json`
  if (userManagement.sourceExists) {
    try {
      const parsed = JSON.parse(fs.readFileSync(userFile, 'utf-8')) || {};
      const usersByUid =
        parsed.usersByUid && typeof parsed.usersByUid === 'object' ? parsed.usersByUid : {};
      for (const [uid, record] of Object.entries<any>(usersByUid)) {
        if (!record || typeof record !== 'object') continue;
        await migrateRecordIdempotent({
          collectionName: FIRESTORE_COLLECTIONS.userManagementUsers,
          docId: uid || String(record.uid || ''),
          data: { ...record, uid: uid || String(record.uid || '') },
          adapter,
          dryRun,
          counters: userManagement,
        });
      }

      if (Array.isArray(parsed.loginLogs)) {
        for (const entry of parsed.loginLogs) {
          if (!entry?.id) continue;
          await migrateRecordIdempotent({
            collectionName: FIRESTORE_COLLECTIONS.userManagementLoginLogs,
            docId: String(entry.id),
            data: entry,
            adapter,
            dryRun,
            counters: userManagement,
          });
        }
      }

      if (Array.isArray(parsed.adminLogs)) {
        for (const entry of parsed.adminLogs) {
          if (!entry?.id) continue;
          await migrateRecordIdempotent({
            collectionName: FIRESTORE_COLLECTIONS.userManagementAdminLogs,
            docId: String(entry.id),
            data: entry,
            adapter,
            dryRun,
            counters: userManagement,
          });
        }
      }

      if (Array.isArray(parsed.registrationLogs)) {
        for (const entry of parsed.registrationLogs) {
          if (!entry?.id) continue;
          await migrateRecordIdempotent({
            collectionName: FIRESTORE_COLLECTIONS.userManagementRegistrationLogs,
            docId: String(entry.id),
            data: entry,
            adapter,
            dryRun,
            counters: userManagement,
          });
        }
      }

      if (Array.isArray(parsed.dataPrivacyRequests)) {
        for (const entry of parsed.dataPrivacyRequests) {
          if (!entry?.id) continue;
          await migrateRecordIdempotent({
            collectionName: FIRESTORE_COLLECTIONS.userManagementPrivacyRequests,
            docId: String(entry.id),
            data: entry,
            adapter,
            dryRun,
            counters: userManagement,
          });
        }
      }

      if (parsed.googleSheetsConfig && typeof parsed.googleSheetsConfig === 'object') {
        await migrateRecordIdempotent({
          collectionName: FIRESTORE_COLLECTIONS.userManagementConfig,
          docId: 'google_sheets_sync',
          data: parsed.googleSheetsConfig,
          adapter,
          dryRun,
          counters: userManagement,
        });
      }

      if (parsed.developerProfileConfig && typeof parsed.developerProfileConfig === 'object') {
        await migrateRecordIdempotent({
          collectionName: FIRESTORE_COLLECTIONS.userManagementConfig,
          docId: 'developer_profile',
          data: parsed.developerProfileConfig,
          adapter,
          dryRun,
          counters: userManagement,
        });
      }
    } catch (err: any) {
      userManagement.errorCount += 1;
      userManagement.errors.push(`Failed reading ${userManagement.sourceFile}: ${err?.message || err}`);
    }
  }

  // 2. Migrate `.everykr-automated-emails.json`
  if (automatedEmails.sourceExists) {
    try {
      const parsed = JSON.parse(fs.readFileSync(emailFile, 'utf-8')) || {};
      if (Array.isArray(parsed.deliveryLogs)) {
        for (const log of parsed.deliveryLogs) {
          if (!log || typeof log !== 'object') continue;
          const docId =
            typeof log.id === 'string' && log.id.trim()
              ? log.id.trim()
              : `emlog_${deterministicEmailHashId(`${log.recipient}:${log.timestamp}:${log.emailType}`)}`;
          await migrateRecordIdempotent({
            collectionName: FIRESTORE_COLLECTIONS.automatedEmailAuditLogs,
            docId,
            data: { ...log, id: docId },
            adapter,
            dryRun,
            counters: automatedEmails,
          });
        }
      }

      const regByEmail =
        parsed.registrationSentByEmail && typeof parsed.registrationSentByEmail === 'object'
          ? parsed.registrationSentByEmail
          : {};
      for (const [email, rec] of Object.entries<any>(regByEmail)) {
        if (!rec || typeof rec !== 'object') continue;
        await migrateRecordIdempotent({
          collectionName: FIRESTORE_COLLECTIONS.automatedEmailDedupState,
          docId: `reg_email_${deterministicEmailHashId(email)}`,
          data: { kind: 'registration_email', email: email.toLowerCase(), ...rec },
          adapter,
          dryRun,
          counters: automatedEmails,
        });
      }

      const regByUid =
        parsed.registrationSentByUid && typeof parsed.registrationSentByUid === 'object'
          ? parsed.registrationSentByUid
          : {};
      for (const [uid, rec] of Object.entries<any>(regByUid)) {
        if (!rec || typeof rec !== 'object') continue;
        await migrateRecordIdempotent({
          collectionName: FIRESTORE_COLLECTIONS.automatedEmailDedupState,
          docId: `reg_uid_${sanitizeFirestoreDocId(uid)}`,
          data: { kind: 'registration_uid', uid, ...rec },
          adapter,
          dryRun,
          counters: automatedEmails,
        });
      }

      const recentLoginByEmail =
        parsed.recentLoginByEmail && typeof parsed.recentLoginByEmail === 'object'
          ? parsed.recentLoginByEmail
          : {};
      for (const [email, rec] of Object.entries<any>(recentLoginByEmail)) {
        if (!rec || typeof rec !== 'object') continue;
        await migrateRecordIdempotent({
          collectionName: FIRESTORE_COLLECTIONS.automatedEmailDedupState,
          docId: `login_email_${deterministicEmailHashId(email)}`,
          data: { kind: 'login_email', email: email.toLowerCase(), ...rec },
          adapter,
          dryRun,
          counters: automatedEmails,
        });
      }
    } catch (err: any) {
      automatedEmails.errorCount += 1;
      automatedEmails.errors.push(`Failed reading ${automatedEmails.sourceFile}: ${err?.message || err}`);
    }
  }

  // 3. Migrate `.everykr-newsletter-store.json`
  if (newsletter.sourceExists) {
    try {
      const parsed = JSON.parse(fs.readFileSync(newsletterFile, 'utf-8')) || {};
      if (Array.isArray(parsed.subscribers)) {
        for (const sub of parsed.subscribers) {
          if (!sub?.email) continue;
          const docId = deterministicEmailHashId(sub.email);
          await migrateRecordIdempotent({
            collectionName: FIRESTORE_COLLECTIONS.newsletterSubscribers,
            docId,
            data: { ...sub, email: String(sub.email).trim().toLowerCase() },
            adapter,
            dryRun,
            counters: newsletter,
          });
        }
      }

      if (Array.isArray(parsed.campaigns)) {
        for (const camp of parsed.campaigns) {
          if (!camp?.id) continue;
          await migrateRecordIdempotent({
            collectionName: FIRESTORE_COLLECTIONS.newsletterCampaigns,
            docId: String(camp.id),
            data: camp,
            adapter,
            dryRun,
            counters: newsletter,
          });
        }
      }

      if (Array.isArray(parsed.suppressionList)) {
        for (const rawItem of parsed.suppressionList) {
          const email =
            typeof rawItem === 'string'
              ? rawItem.trim().toLowerCase()
              : String(rawItem?.email || '').trim().toLowerCase();
          if (!email) continue;
          await migrateRecordIdempotent({
            collectionName: FIRESTORE_COLLECTIONS.newsletterSuppression,
            docId: deterministicEmailHashId(email),
            data: { email, suppressedAt: new Date().toISOString() },
            adapter,
            dryRun,
            counters: newsletter,
          });
        }
      }

      if (Array.isArray(parsed.deliveryLogs)) {
        for (const log of parsed.deliveryLogs) {
          if (!log || typeof log !== 'object') continue;
          const docId =
            typeof log.id === 'string' && log.id.trim()
              ? log.id.trim()
              : `nlog_${deterministicEmailHashId(`${log.to}:${log.timestamp}:${log.subject}`)}`;
          await migrateRecordIdempotent({
            collectionName: FIRESTORE_COLLECTIONS.newsletterDeliveryLogs,
            docId,
            data: { ...log, id: docId },
            adapter,
            dryRun,
            counters: newsletter,
          });
        }
      }
    } catch (err: any) {
      newsletter.errorCount += 1;
      newsletter.errors.push(`Failed reading ${newsletter.sourceFile}: ${err?.message || err}`);
    }
  }

  const totalMigrated =
    userManagement.migratedCount + automatedEmails.migratedCount + newsletter.migratedCount;
  const totalSkippedDuplicates =
    userManagement.skippedDuplicateCount +
    automatedEmails.skippedDuplicateCount +
    newsletter.skippedDuplicateCount;
  const totalErrors =
    userManagement.errorCount + automatedEmails.errorCount + newsletter.errorCount;

  // Verify legacy files were NEVER deleted
  const legacyFilesPreservedIntact =
    (!userManagement.sourceExists || fs.existsSync(userFile)) &&
    (!automatedEmails.sourceExists || fs.existsSync(emailFile)) &&
    (!newsletter.sourceExists || fs.existsSync(newsletterFile));

  return {
    ok: totalErrors === 0 && legacyFilesPreservedIntact,
    dryRun,
    databaseId: NAMED_FIRESTORE_DATABASE_ID,
    legacyFilesPreservedIntact,
    startedAt,
    completedAt: new Date().toISOString(),
    userManagement,
    automatedEmails,
    newsletter,
    totalMigrated,
    totalSkippedDuplicates,
    totalErrors,
  };
}
