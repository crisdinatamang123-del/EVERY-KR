/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Production Readiness Remediation — Comprehensive Automated Test Suite (Priority 8)
 *
 * Covers all 11 required verification areas:
 *  1. Cloud Run & Firebase Configuration + Composite Firestore Indexes
 *  2. Storage Authorization (student ownership, locked status enforcement, path registration)
 *  3. Admin Claim Parity (`admin` & `super_admin` claims vs claimless email denial)
 *  4. Counsellor Isolation (`assignedTo` isolation + upload denial)
 *  5. Viewer & Least-Privilege Staff Restrictions (zero raw student PII document access)
 *  6. Ticket Replay Prevention (single-use upload & read tickets)
 *  7. Multi-Instance Cloud Run Ticket Validation & Production Fail-Closed Signing Secrets
 *  8. Firestore Migration Safety (idempotency, duplicate prevention, legacy file preservation)
 *  9. Email & Secret Security Hardening (endpoint auth, no static secret, no email-only bypass)
 * 10. Enterprise RBAC Role Assignment & Hierarchy (8 roles, Primary Super Admin protection, live revocation)
 * 11. Custom Claims Preservation (unrelated claims + legacy flags preserved across assign/update/revoke/bootstrap)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  authorizeSmartApplicationUpload,
  authorizeSmartApplicationDocumentRead,
  consumeAndVerifyUploadTicketAsync,
  consumeAndVerifyReadTicketAsync,
  createInMemorySharedTicketStore,
  clearStorageAuthTicketsForTesting,
  resolveVerifiedStorageCaller,
  type AuthoritativeApplicationSnapshot,
  type SmartAppDocumentAuthDeps,
} from '../src/server/smartApplicationStorageAuth.ts';
import {
  ALL_ENTERPRISE_ROLES,
  PRIMARY_SUPER_ADMIN_EMAIL,
  type StaffRoleAssignment,
  type StaffRoleHistoryEvent,
} from '../src/types/enterprise.ts';
import {
  assignEnterpriseStaffRoleServer,
  bootstrapPrimarySuperAdminServer,
  buildMergedEnterpriseCustomClaims,
  isCanonicalAdminClaims,
  resolveCanonicalStorageRole,
  resolveVerifiedEnterpriseCaller,
  revokeEnterpriseStaffRoleServer,
  type StaffRoleMutationDeps,
} from '../src/server/enterpriseRbacCore.ts';
import {
  FIRESTORE_COLLECTIONS,
  NAMED_FIRESTORE_DATABASE_ID,
  createInMemoryMigrationAdapter,
  migrateLegacyJsonStoresToFirestore,
} from '../src/server/firestorePersistenceBridge.ts';
import {
  MissingProductionNewsletterSecretError,
  getHmacSecret,
  getNewsletterHmacSecretSource,
} from '../src/server/newsletterService.ts';
import {
  isAuthorizedServerAdmin,
  sanitizeUserRole,
} from '../src/server/userManagementService.ts';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err?.message || String(err) });
    console.error(`  [FAIL] ${name}\n         ${err?.stack || err}`);
  }
}

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8');
}

const VALID_JPEG_BUFFER = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
  Buffer.alloc(502, 0x42),
]);

const APP_DRAFT_ID = 'app_prod_draft_01';
const APP_MISSING_ID = 'app_prod_missing_02';
const APP_SUBMITTED_ID = 'app_prod_submitted_03';
const DOC_CURRENT_PATH = `applications/uid_stu_1/${APP_SUBMITTED_ID}/passport/1700_cur_passport.jpg`;
const DOC_PREV_PATH = `applications/uid_stu_1/${APP_SUBMITTED_ID}/passport/1600_prev_passport.jpg`;

const MOCK_APPS: Record<string, AuthoritativeApplicationSnapshot> = {
  [APP_DRAFT_ID]: {
    id: APP_DRAFT_ID,
    userId: 'uid_stu_1',
    status: 'draft',
    assignedTo: 'uid_counsellor_1',
    documents: {},
  },
  [APP_MISSING_ID]: {
    id: APP_MISSING_ID,
    userId: 'uid_stu_1',
    status: 'documents_missing',
    assignedTo: 'uid_counsellor_1',
    documents: {},
  },
  [APP_SUBMITTED_ID]: {
    id: APP_SUBMITTED_ID,
    userId: 'uid_stu_1',
    status: 'submitted',
    assignedTo: 'uid_counsellor_1',
    documents: {
      passport: {
        storagePath: DOC_CURRENT_PATH,
        previousVersions: [{ storagePath: DOC_PREV_PATH }],
      },
    },
  },
};

const MOCK_TOKENS: Record<
  string,
  { uid: string; email: string; emailVerified: boolean; customClaims: Record<string, any> }
> = {
  'tok-student-1': {
    uid: 'uid_stu_1',
    email: 'student1@example.com',
    emailVerified: true,
    customClaims: {},
  },
  'tok-student-2': {
    uid: 'uid_stu_2',
    email: 'student2@example.com',
    emailVerified: true,
    customClaims: {},
  },
  'tok-admin': {
    uid: 'uid_admin_1',
    email: 'ops-admin@everykr.com',
    emailVerified: true,
    customClaims: { admin: true, role: 'admin' },
  },
  'tok-super-admin': {
    uid: 'uid_super_admin_primary',
    email: PRIMARY_SUPER_ADMIN_EMAIL,
    emailVerified: true,
    customClaims: { super_admin: true, admin: true, role: 'super_admin', enterpriseRole: 'super_admin' },
  },
  'tok-claimless-primary-email': {
    uid: 'uid_claimless_primary',
    email: PRIMARY_SUPER_ADMIN_EMAIL,
    emailVerified: true,
    customClaims: {},
  },
  'tok-claimless-legacy-admin': {
    uid: 'uid_claimless_legacy',
    email: 'admin@everykr.com',
    emailVerified: true,
    customClaims: {},
  },
  'tok-counsellor-assigned': {
    uid: 'uid_counsellor_1',
    email: 'counsellor1@everykr.com',
    emailVerified: true,
    customClaims: { counsellor: true, role: 'counsellor' },
  },
  'tok-app-officer-assigned': {
    uid: 'uid_counsellor_1',
    email: 'officer1@everykr.com',
    emailVerified: true,
    customClaims: { application_officer: true, role: 'application_officer' },
  },
  'tok-counsellor-unassigned': {
    uid: 'uid_counsellor_2',
    email: 'counsellor2@everykr.com',
    emailVerified: true,
    customClaims: { counsellor: true, role: 'counsellor' },
  },
  'tok-viewer': {
    uid: 'uid_viewer_1',
    email: 'viewer1@everykr.com',
    emailVerified: true,
    customClaims: { viewer: true, role: 'viewer' },
  },
  'tok-finance-officer': {
    uid: 'uid_finance_1',
    email: 'finance1@everykr.com',
    emailVerified: true,
    customClaims: { finance_officer: true, role: 'finance_officer' },
  },
};

const mockVerifyIdToken: NonNullable<SmartAppDocumentAuthDeps['verifyIdToken']> = async (token) => {
  const rec = token ? MOCK_TOKENS[token] : undefined;
  if (!rec) return { valid: false };
  return {
    valid: true,
    uid: rec.uid,
    email: rec.email,
    emailVerified: rec.emailVerified,
    customClaims: rec.customClaims,
  };
};

function buildStorageDeps(
  overrides?: Partial<SmartAppDocumentAuthDeps>
): SmartAppDocumentAuthDeps {
  return {
    verifyIdToken: mockVerifyIdToken,
    fetchApplication: async ({ applicationId }) => {
      const app = MOCK_APPS[applicationId];
      return app ? { status: 'ok', app } : { status: 'not_found' };
    },
    createSignedUploadUrl: async () => null,
    createSignedReadUrl: async () => null,
    ...overrides,
  };
}

async function main() {
  console.log('\n=== 1. Cloud Run, Firebase Config & Composite Indexes ===');

  await runTest('firebase.json points /api/** to everykr-everything-korea-one-platform-2 and configures named Firestore DB + indexes', () => {
    const cfg = JSON.parse(readRepoFile('firebase.json'));
    assert.equal(cfg.firestore.database, NAMED_FIRESTORE_DATABASE_ID);
    assert.equal(cfg.firestore.rules, 'firestore.rules');
    assert.equal(cfg.firestore.indexes, 'firestore.indexes.json');
    assert.equal(cfg.storage.rules, 'storage.rules');
    const apiRewrite = cfg.hosting.rewrites.find((r: any) => r.source === '/api/**');
    assert.ok(apiRewrite, 'Missing /api/** rewrite');
    assert.equal(apiRewrite.run.serviceId, 'everykr-everything-korea-one-platform-2');
    assert.equal(apiRewrite.run.region, 'asia-east1');
    const spaFallback = cfg.hosting.rewrites.find((r: any) => r.source === '**');
    assert.equal(spaFallback?.destination, '/index.html');
  });

  await runTest('.firebaserc targets Firebase project "everykr"', () => {
    const rc = JSON.parse(readRepoFile('.firebaserc'));
    assert.equal(rc.projects.default, 'everykr');
  });

  await runTest('firestore.indexes.json contains all required composite indexes and ticket TTL field override', () => {
    const idxCfg = JSON.parse(readRepoFile('firestore.indexes.json'));
    assert.ok(Array.isArray(idxCfg.indexes) && idxCfg.indexes.length >= 20);
    const hasIndex = (group: string, fields: string[]) =>
      idxCfg.indexes.some(
        (idx: any) =>
          idx.collectionGroup === group &&
          idx.fields.map((f: any) => `${f.fieldPath}:${f.order}`).join(',') === fields.join(',')
      );

    assert.ok(hasIndex('applications', ['userId:ASCENDING', 'updatedAt:DESCENDING']));
    assert.ok(hasIndex('applications', ['assignedTo:ASCENDING', 'updatedAt:DESCENDING']));
    assert.ok(hasIndex('applications', ['status:ASCENDING', 'updatedAt:DESCENDING']));
    assert.ok(hasIndex('applications', ['universityId:ASCENDING', 'updatedAt:DESCENDING']));
    assert.ok(
      hasIndex('applications', [
        'assignedTo:ASCENDING',
        'status:ASCENDING',
        'universityId:ASCENDING',
        'updatedAt:DESCENDING',
      ])
    );
    assert.ok(hasIndex('staff_roles', ['status:ASCENDING', 'role:ASCENDING', 'updatedAt:DESCENDING']));
    assert.ok(hasIndex('staff_role_history', ['targetUid:ASCENDING', 'timestamp:DESCENDING']));
    assert.ok(hasIndex('automated_email_audit_logs', ['emailType:ASCENDING', 'timestamp:DESCENDING']));
    assert.ok(hasIndex('newsletter_subscribers', ['status:ASCENDING', 'subscribedAt:DESCENDING']));

    const ttlOverride = idxCfg.fieldOverrides.find(
      (f: any) => f.collectionGroup === 'smart_app_auth_tickets' && f.fieldPath === 'expiresAt'
    );
    assert.equal(ttlOverride?.ttl, true);
  });

  console.log('\n=== 2. Storage Auth, Admin Claim Parity, Counsellor & Viewer Isolation ===');

  await runTest('Storage authorization allows own draft/documents_missing uploads and blocks locked statuses & cross-student access', async () => {
    const sharedStore = createInMemorySharedTicketStore();
    const env = { SMART_APP_UPLOAD_SECRET: 'prod_shared_secret_32bytes_everykr_2026' };

    const draftOk = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-1',
      applicationId: APP_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: VALID_JPEG_BUFFER.length,
      mimeType: 'image/jpeg',
      deps: buildStorageDeps({ ticketStore: sharedStore, env }),
    });
    assert.equal(draftOk.ok, true);
    assert.equal(draftOk.httpStatus, 200);

    const missingOk = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-1',
      applicationId: APP_MISSING_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: VALID_JPEG_BUFFER.length,
      mimeType: 'image/jpeg',
      deps: buildStorageDeps({ ticketStore: sharedStore, env }),
    });
    assert.equal(missingOk.ok, true);

    const lockedDenied = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-1',
      applicationId: APP_SUBMITTED_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: VALID_JPEG_BUFFER.length,
      mimeType: 'image/jpeg',
      deps: buildStorageDeps({ ticketStore: sharedStore, env }),
    });
    assert.equal(lockedDenied.ok, false);
    assert.equal(lockedDenied.httpStatus, 403);
    assert.equal(lockedDenied.errorCode, 'application_status_locked');

    const crossStudentDenied = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-2',
      applicationId: APP_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: VALID_JPEG_BUFFER.length,
      mimeType: 'image/jpeg',
      deps: buildStorageDeps({ ticketStore: sharedStore, env }),
    });
    assert.equal(crossStudentDenied.ok, false);
    assert.equal(crossStudentDenied.httpStatus, 403);
    assert.equal(crossStudentDenied.errorCode, 'ownership_denied');
  });

  await runTest('Admin claim parity: verified admin & super_admin allowed; claimless emails strictly DENIED', async () => {
    const sharedStore = createInMemorySharedTicketStore();
    const env = { SMART_APP_UPLOAD_SECRET: 'prod_shared_secret_32bytes_everykr_2026' };

    for (const token of ['tok-admin', 'tok-super-admin']) {
      const res = await authorizeSmartApplicationDocumentRead({
        idToken: token,
        applicationId: APP_SUBMITTED_ID,
        storagePath: DOC_CURRENT_PATH,
        deps: buildStorageDeps({ ticketStore: sharedStore, env }),
      });
      assert.equal(res.ok, true, `${token} should be authorized`);
      assert.equal(res.httpStatus, 200);
    }

    // Claimless legacy admin email and claimless primary Super Admin email MUST NOT bypass claims
    for (const token of ['tok-claimless-legacy-admin', 'tok-claimless-primary-email']) {
      const caller = await resolveVerifiedStorageCaller(token, { verifyIdToken: mockVerifyIdToken });
      assert.ok(caller);
      assert.equal(caller.isAdmin, false, `${token} must NOT be granted admin without custom claims`);
      assert.equal(caller.role, 'student');

      const readRes = await authorizeSmartApplicationDocumentRead({
        idToken: token,
        applicationId: APP_SUBMITTED_ID,
        storagePath: DOC_CURRENT_PATH,
        deps: buildStorageDeps({ ticketStore: sharedStore, env }),
      });
      assert.equal(readRes.ok, false);
      assert.equal(readRes.httpStatus, 403);
      assert.equal(readRes.errorCode, 'ownership_denied');
    }

    // Canonical admin claims check + server admin check with verified non-admin claims fails closed
    assert.equal(isCanonicalAdminClaims({ super_admin: true }), true);
    assert.equal(isCanonicalAdminClaims({ admin: true }), true);
    assert.equal(isCanonicalAdminClaims({ counsellor: true }), false);
    assert.equal(isCanonicalAdminClaims({}), false);
    assert.equal(isAuthorizedServerAdmin('uid_any', 'admin@everykr.com', {}), false);
    assert.equal(isAuthorizedServerAdmin('uid_any', PRIMARY_SUPER_ADMIN_EMAIL, {}), false);
    assert.equal(isAuthorizedServerAdmin('uid_any', 'other@everykr.com', { super_admin: true }), true);
    assert.equal(sanitizeUserRole('admin', PRIMARY_SUPER_ADMIN_EMAIL, undefined, true), 'student');
    assert.equal(sanitizeUserRole('admin', 'admin@everykr.com', undefined, true), 'student');
  });

  await runTest('Counsellor & Application Officer isolation: assigned allowed read only, unassigned & uploads DENIED', async () => {
    const sharedStore = createInMemorySharedTicketStore();
    const env = { SMART_APP_UPLOAD_SECRET: 'prod_shared_secret_32bytes_everykr_2026' };

    for (const assignedTok of ['tok-counsellor-assigned', 'tok-app-officer-assigned']) {
      const assignedRead = await authorizeSmartApplicationDocumentRead({
        idToken: assignedTok,
        applicationId: APP_SUBMITTED_ID,
        storagePath: DOC_PREV_PATH,
        deps: buildStorageDeps({ ticketStore: sharedStore, env }),
      });
      assert.equal(assignedRead.ok, true, `${assignedTok} should read assigned application doc`);

      const uploadDenied = await authorizeSmartApplicationUpload({
        idToken: assignedTok,
        applicationId: APP_DRAFT_ID,
        docType: 'passport',
        fileName: 'passport.jpg',
        fileSize: VALID_JPEG_BUFFER.length,
        mimeType: 'image/jpeg',
        deps: buildStorageDeps({ ticketStore: sharedStore, env }),
      });
      assert.equal(uploadDenied.ok, false);
      assert.equal(uploadDenied.httpStatus, 403);
      assert.equal(uploadDenied.errorCode, 'counsellor_upload_denied');
    }

    const unassignedRead = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-counsellor-unassigned',
      applicationId: APP_SUBMITTED_ID,
      storagePath: DOC_CURRENT_PATH,
      deps: buildStorageDeps({ ticketStore: sharedStore, env }),
    });
    assert.equal(unassignedRead.ok, false);
    assert.equal(unassignedRead.httpStatus, 403);
    assert.equal(unassignedRead.errorCode, 'counsellor_not_assigned');
  });

  await runTest('Viewer & Finance Officer least-privilege restrictions: ZERO raw student document read or write access', async () => {
    const sharedStore = createInMemorySharedTicketStore();
    const env = { SMART_APP_UPLOAD_SECRET: 'prod_shared_secret_32bytes_everykr_2026' };

    for (const restrictedTok of ['tok-viewer', 'tok-finance-officer']) {
      const readDenied = await authorizeSmartApplicationDocumentRead({
        idToken: restrictedTok,
        applicationId: APP_SUBMITTED_ID,
        storagePath: DOC_CURRENT_PATH,
        deps: buildStorageDeps({ ticketStore: sharedStore, env }),
      });
      assert.equal(readDenied.ok, false);
      assert.equal(readDenied.httpStatus, 403);
      assert.equal(readDenied.errorCode, 'viewer_document_access_denied');

      const uploadDenied = await authorizeSmartApplicationUpload({
        idToken: restrictedTok,
        applicationId: APP_DRAFT_ID,
        docType: 'passport',
        fileName: 'passport.jpg',
        fileSize: VALID_JPEG_BUFFER.length,
        mimeType: 'image/jpeg',
        deps: buildStorageDeps({ ticketStore: sharedStore, env }),
      });
      assert.equal(uploadDenied.ok, false);
      assert.equal(uploadDenied.httpStatus, 403);
      assert.equal(uploadDenied.errorCode, 'viewer_upload_denied');
    }

    assert.equal(resolveCanonicalStorageRole({ claims: { role: 'ceo' } }), 'viewer');
    assert.equal(resolveCanonicalStorageRole({ claims: { role: 'manager' } }), 'viewer');
  });

  console.log('\n=== 3. Multi-Instance Cloud Run Tickets, Replay Prevention & Production Fail-Closed Secrets ===');

  await runTest('Multi-instance Cloud Run: Instance A issues upload/read tickets -> Instance B consumes -> replay rejected (409)', async () => {
    const sharedFirestoreMockStore = createInMemorySharedTicketStore();
    const prodEnv = {
      K_SERVICE: 'everykr-everything-korea-one-platform-2',
      NODE_ENV: 'production',
      SMART_APP_UPLOAD_SECRET: 'shared_multi_instance_secret_key_2026_everykr',
    };

    // Instance A issues upload ticket
    const uploadAuth = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-1',
      applicationId: APP_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: VALID_JPEG_BUFFER.length,
      mimeType: 'image/jpeg',
      deps: buildStorageDeps({ ticketStore: sharedFirestoreMockStore, env: prodEnv }),
    });
    assert.equal(uploadAuth.ok, true);
    assert.ok(uploadAuth.uploadToken);

    // Simulate routing to a DIFFERENT Cloud Run instance (Instance B has empty local memory)
    clearStorageAuthTicketsForTesting();

    const instanceBConsume = await consumeAndVerifyUploadTicketAsync({
      uploadToken: uploadAuth.uploadToken!,
      callerUid: 'uid_stu_1',
      buffer: VALID_JPEG_BUFFER,
      contentType: 'image/jpeg',
      ticketStore: sharedFirestoreMockStore,
      env: prodEnv,
    });
    assert.equal(instanceBConsume.ok, true, 'Instance B must verify and consume Instance A upload ticket');

    // Replay on Instance A or Instance B MUST fail with HTTP 409
    const replayUpload = await consumeAndVerifyUploadTicketAsync({
      uploadToken: uploadAuth.uploadToken!,
      callerUid: 'uid_stu_1',
      buffer: VALID_JPEG_BUFFER,
      contentType: 'image/jpeg',
      ticketStore: sharedFirestoreMockStore,
      env: prodEnv,
    });
    assert.equal(replayUpload.ok, false);
    if (!replayUpload.ok) {
      assert.equal(replayUpload.httpStatus, 409);
      assert.equal(replayUpload.errorCode, 'upload_token_already_used');
    }

    // Instance A issues read ticket -> Instance B consumes -> replay rejected (409)
    const readAuth = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-counsellor-assigned',
      applicationId: APP_SUBMITTED_ID,
      storagePath: DOC_CURRENT_PATH,
      deps: buildStorageDeps({ ticketStore: sharedFirestoreMockStore, env: prodEnv }),
    });
    assert.equal(readAuth.ok, true);
    assert.ok(readAuth.readToken);

    clearStorageAuthTicketsForTesting();
    const instanceBRead = await consumeAndVerifyReadTicketAsync({
      readToken: readAuth.readToken!,
      callerUid: 'uid_counsellor_1',
      ticketStore: sharedFirestoreMockStore,
      env: prodEnv,
    });
    assert.equal(instanceBRead.ok, true, 'Instance B must verify and consume Instance A read ticket');

    const replayRead = await consumeAndVerifyReadTicketAsync({
      readToken: readAuth.readToken!,
      callerUid: 'uid_counsellor_1',
      ticketStore: sharedFirestoreMockStore,
      env: prodEnv,
    });
    assert.equal(replayRead.ok, false);
    if (!replayRead.ok) {
      assert.equal(replayRead.httpStatus, 409);
      assert.equal(replayRead.errorCode, 'read_token_already_used');
    }
  });

  await runTest('Production fail-closed: missing signing secrets return 503 instead of ephemeral per-instance keys', async () => {
    const sharedStore = createInMemorySharedTicketStore();
    const missingSecretProdEnv = {
      K_SERVICE: 'everykr-everything-korea-one-platform-2',
      NODE_ENV: 'production',
    };

    const uploadFail = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-1',
      applicationId: APP_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: VALID_JPEG_BUFFER.length,
      mimeType: 'image/jpeg',
      deps: buildStorageDeps({ ticketStore: sharedStore, env: missingSecretProdEnv }),
    });
    assert.equal(uploadFail.ok, false);
    assert.equal(uploadFail.httpStatus, 503);
    assert.equal(uploadFail.errorCode, 'signing_secret_not_configured');

    const readFail = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-admin',
      applicationId: APP_SUBMITTED_ID,
      storagePath: DOC_CURRENT_PATH,
      deps: buildStorageDeps({ ticketStore: sharedStore, env: missingSecretProdEnv }),
    });
    assert.equal(readFail.ok, false);
    assert.equal(readFail.httpStatus, 503);
    assert.equal(readFail.errorCode, 'signing_secret_not_configured');
  });

  console.log('\n=== 4. Firestore Migration Safety (Priority 4) ===');

  await runTest('Idempotent legacy JSON -> Firestore migration preserves records, prevents duplicates, and never deletes legacy files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'everykr-mig-test-'));
    try {
      const userJson = {
        usersByUid: {
          uid_u1: { uid: 'uid_u1', email: 'u1@example.com', role: 'student' },
          uid_u2: { uid: 'uid_u2', email: 'u2@example.com', role: 'agent' },
        },
        loginLogs: [{ id: 'llog_1', uid: 'uid_u1', timestamp: '2026-11-01T00:00:00Z' }],
        adminLogs: [{ id: 'alog_1', action: 'TEST', timestamp: '2026-11-01T00:00:00Z' }],
        registrationLogs: [{ id: 'rlog_1', uid: 'uid_u1', timestamp: '2026-11-01T00:00:00Z' }],
        dataPrivacyRequests: [{ id: 'dpr_1', uid: 'uid_u1', status: 'pending' }],
      };
      const emailJson = {
        deliveryLogs: [
          { id: 'emlog_1', emailType: 'login_welcome_back', recipient: 'u1@example.com', deliveryStatus: 'delivered' },
        ],
        registrationSentByEmail: {
          'u1@example.com': { uid: 'uid_u1', email: 'u1@example.com', sentAtMs: 1700000000000 },
        },
        registrationSentByUid: {
          uid_u1: { uid: 'uid_u1', email: 'u1@example.com', sentAtMs: 1700000000000 },
        },
        recentLoginByEmail: {},
      };
      const newsletterJson = {
        subscribers: [
          { id: 'sub_1', email: 'Subscriber@Example.com', status: 'active' },
        ],
        campaigns: [{ id: 'camp_1', subject: 'Fall 2027 Scholarships', status: 'sent' }],
        suppressionList: ['bounced@example.com'],
        deliveryLogs: [{ id: 'nlog_1', to: 'subscriber@example.com', status: 'delivered' }],
      };

      fs.writeFileSync(path.join(tmpDir, '.everykr-user-management.json'), JSON.stringify(userJson));
      fs.writeFileSync(path.join(tmpDir, '.everykr-automated-emails.json'), JSON.stringify(emailJson));
      fs.writeFileSync(path.join(tmpDir, '.everykr-newsletter-store.json'), JSON.stringify(newsletterJson));

      const adapter = createInMemoryMigrationAdapter();

      // Step 1: Dry-run writes zero documents
      const dryReport = await migrateLegacyJsonStoresToFirestore({
        baseDir: tmpDir,
        dryRun: true,
        adapter,
      });
      assert.equal(dryReport.ok, true);
      assert.equal(dryReport.dryRun, true);
      assert.equal(dryReport.databaseId, NAMED_FIRESTORE_DATABASE_ID);
      assert.equal(adapter.collections.size, 0, 'Dry-run must not write any documents');

      // Step 2: Apply writes all 13 records cleanly
      const firstRun = await migrateLegacyJsonStoresToFirestore({
        baseDir: tmpDir,
        dryRun: false,
        adapter,
      });
      assert.equal(firstRun.ok, true);
      assert.equal(firstRun.totalMigrated, 13);
      assert.equal(firstRun.totalSkippedDuplicates, 0);
      assert.equal(firstRun.totalErrors, 0);
      assert.equal(firstRun.legacyFilesPreservedIntact, true);
      assert.equal(adapter.collections.get(FIRESTORE_COLLECTIONS.userManagementUsers)?.size, 2);
      assert.equal(adapter.collections.get(FIRESTORE_COLLECTIONS.automatedEmailAuditLogs)?.size, 1);
      assert.equal(adapter.collections.get(FIRESTORE_COLLECTIONS.newsletterSubscribers)?.size, 1);

      // Step 3: Re-run is 100% idempotent — zero duplicates created
      const secondRun = await migrateLegacyJsonStoresToFirestore({
        baseDir: tmpDir,
        dryRun: false,
        adapter,
      });
      assert.equal(secondRun.ok, true);
      assert.equal(secondRun.totalMigrated, 0);
      assert.equal(secondRun.totalSkippedDuplicates, 13);
      assert.equal(secondRun.legacyFilesPreservedIntact, true);

      // Verify legacy files are untouched on disk
      assert.ok(fs.existsSync(path.join(tmpDir, '.everykr-user-management.json')));
      assert.ok(fs.existsSync(path.join(tmpDir, '.everykr-automated-emails.json')));
      assert.ok(fs.existsSync(path.join(tmpDir, '.everykr-newsletter-store.json')));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  console.log('\n=== 5. Email Audit Endpoint Auth & Secret Hardening (Priority 5) ===');

  await runTest('Newsletter secret removes STATIC_FALLBACK_NEWSLETTER_SECRET and fails closed in production', () => {
    const src = readRepoFile('src/server/newsletterService.ts');
    assert.doesNotMatch(src, /STATIC_FALLBACK_NEWSLETTER_SECRET/);
    assert.doesNotMatch(src, /everykr-fallback-hmac-secret-key/);

    assert.throws(
      () =>
        getHmacSecret({
          env: { K_SERVICE: 'everykr-everything-korea-one-platform-2', NODE_ENV: 'production' },
          allowGenerateRuntimeKey: false,
        }),
      MissingProductionNewsletterSecretError
    );

    const configuredSource = getNewsletterHmacSecretSource({
      env: {
        K_SERVICE: 'everykr-everything-korea-one-platform-2',
        NODE_ENV: 'production',
        NEWSLETTER_SIGNING_SECRET: 'valid_prod_newsletter_secret_key_2026',
      },
    });
    assert.equal(configuredSource, 'NEWSLETTER_SIGNING_SECRET');
  });

  await runTest('/api/emails/system-status is gated behind verified Admin auth and email-only admin bypasses are removed', () => {
    const serverSrc = readRepoFile('server.ts');
    const routeIdx = serverSrc.indexOf("app.get('/api/emails/system-status'");
    assert.ok(routeIdx > 0, 'Expected /api/emails/system-status route');
    const routeBlock = serverSrc.slice(routeIdx, routeIdx + 420);
    assert.match(routeBlock, /requireVerifiedAdmin\(req,\s*res\)/);
    assert.match(routeBlock, /Cache-Control',\s*'no-store,\s*private'/);

    const fbSvcSrc = readRepoFile('src/services/firebaseService.ts');
    assert.doesNotMatch(fbSvcSrc, /VERIFIED_ADMIN_EMAILS/);

    const userMgmtSrc = readRepoFile('src/server/userManagementService.ts');
    assert.doesNotMatch(userMgmtSrc, /BOOTSTRAPPED_ADMIN_EMAILS/);

    const headerSrc = readRepoFile('src/components/GlobalHeader.tsx');
    assert.doesNotMatch(headerSrc, /\['admin@everykr\.com',\s*'mzhmd924@gmail\.com'\]/);
  });

  console.log('\n=== 6. Enterprise RBAC Role Assignment, Primary Super Admin & Custom Claims Preservation (Priority 6) ===');

  await runTest('Email-only account is NOT auto-promoted; revoked staff_roles immediately blocks stale JWT claims', async () => {
    // Even mzhmd924@gmail.com without custom claims or active staff_roles record is NOT auto-promoted
    const claimlessPrimary = await resolveVerifiedEnterpriseCaller('tok-claimless-primary-email', {
      verifyIdToken: mockVerifyIdToken,
      getStaffAssignmentByUid: async () => null,
    });
    assert.equal(claimlessPrimary, null, 'Must NEVER auto-promote based on email alone');

    // Verified super_admin custom claims resolve cleanly
    const verifiedSuperAdmin = await resolveVerifiedEnterpriseCaller('tok-super-admin', {
      verifyIdToken: mockVerifyIdToken,
      getStaffAssignmentByUid: async () => null,
    });
    assert.ok(verifiedSuperAdmin);
    assert.equal(verifiedSuperAdmin.role, 'super_admin');
    assert.equal(verifiedSuperAdmin.isPrimarySuperAdmin, true);

    // Revoked staff_roles/{uid} immediately denies an admin whose old JWT still has admin: true
    const revokedAdmin = await resolveVerifiedEnterpriseCaller('tok-admin', {
      verifyIdToken: mockVerifyIdToken,
      getStaffAssignmentByUid: async (uid) => ({
        uid,
        email: 'ops-admin@everykr.com',
        displayName: 'Former Admin',
        role: 'admin',
        department: 'administration',
        accessScope: 'global',
        assignedUniversities: [],
        assignedDepartments: ['administration'],
        status: 'revoked',
        roleVersion: 2,
        permissionVersion: 2,
        assignedByUid: 'uid_super_admin_primary',
        assignedByEmail: PRIMARY_SUPER_ADMIN_EMAIL,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      }),
    });
    assert.equal(revokedAdmin, null, 'Revoked staff_roles record must immediately block stale JWT');
  });

  await runTest('Role assignment enforces 8-role hierarchy, protects Primary Super Admin, and preserves unrelated custom claims', async () => {
    assert.equal(ALL_ENTERPRISE_ROLES.length, 8);

    const assignments = new Map<string, StaffRoleAssignment>();
    const history: StaffRoleHistoryEvent[] = [];
    const authUsers: Record<
      string,
      {
        uid: string;
        email: string;
        displayName: string;
        emailVerified: boolean;
        disabled: boolean;
        existingClaims: Record<string, any>;
      }
    > = {
      [PRIMARY_SUPER_ADMIN_EMAIL]: {
        uid: 'uid_super_admin_primary',
        email: PRIMARY_SUPER_ADMIN_EMAIL,
        displayName: 'Primary Super Admin',
        emailVerified: true,
        disabled: false,
        existingClaims: { orgPartnerId: 'everykr_hq', betaFlag: true },
      },
      'staff.counsellor@everykr.com': {
        uid: 'uid_staff_c1',
        email: 'staff.counsellor@everykr.com',
        displayName: 'Seoul Counsellor',
        emailVerified: true,
        disabled: false,
        existingClaims: { orgPartnerId: 'seoul_branch', customLocale: 'ko', viewer: true },
      },
    };

    const makeMutationDeps = (): StaffRoleMutationDeps => ({
      lookupUserByEmail: async (email) => {
        const u = authUsers[email.toLowerCase()];
        return u ? { found: true, user: u } : { found: false };
      },
      getExistingAssignment: async (uid) => assignments.get(uid) || null,
      saveAssignment: async (rec) => {
        assignments.set(rec.uid, rec);
      },
      appendRoleHistory: async (entry) => {
        history.push(entry);
      },
      syncClaims: async ({ uid, assignment }) => {
        const u = Object.values(authUsers).find((x) => x.uid === uid);
        const merged = buildMergedEnterpriseCustomClaims({
          existingClaims: u?.existingClaims,
          assignment,
        });
        if (u) u.existingClaims = merged;
        return { synced: true, claims: merged };
      },
    });

    // 1. Explicit audited bootstrap of Primary Super Admin preserves unrelated claims + sets admin:true parity
    const bootDry = await bootstrapPrimarySuperAdminServer({
      dryRun: true,
      deps: makeMutationDeps(),
    });
    assert.equal(bootDry.ok, true);
    assert.equal(bootDry.dryRun, true);
    assert.equal(bootDry.mergedClaims?.super_admin, true);
    assert.equal(bootDry.mergedClaims?.admin, true);
    assert.equal(bootDry.mergedClaims?.orgPartnerId, 'everykr_hq');
    assert.equal(bootDry.mergedClaims?.betaFlag, true);

    const bootApply = await bootstrapPrimarySuperAdminServer({
      dryRun: false,
      deps: makeMutationDeps(),
    });
    assert.equal(bootApply.ok, true);
    assert.equal(bootApply.claimsSynced, true);

    const superAdminActor = (await resolveVerifiedEnterpriseCaller('tok-super-admin', {
      verifyIdToken: mockVerifyIdToken,
      getStaffAssignmentByUid: async (uid) => assignments.get(uid) || null,
    }))!;
    const adminActor = (await resolveVerifiedEnterpriseCaller('tok-admin', {
      verifyIdToken: mockVerifyIdToken,
      getStaffAssignmentByUid: async () => null,
    }))!;

    // 2. Super Admin assigns counsellor -> preserves unrelated custom claims & clears stale viewer boolean
    const assignRes = await assignEnterpriseStaffRoleServer({
      actor: superAdminActor,
      targetEmail: 'staff.counsellor@everykr.com',
      targetRole: 'counsellor',
      reason: 'Onboarding admissions counsellor',
      deps: makeMutationDeps(),
    });
    assert.equal(assignRes.ok, true);
    assert.equal(assignRes.mergedClaims?.counsellor, true);
    assert.equal(assignRes.mergedClaims?.role, 'counsellor');
    assert.equal(assignRes.mergedClaims?.viewer, undefined, 'Stale viewer flag must be cleared on upgrade');
    assert.equal(assignRes.mergedClaims?.orgPartnerId, 'seoul_branch', 'Unrelated claim must be preserved');
    assert.equal(assignRes.mergedClaims?.customLocale, 'ko', 'Unrelated claim must be preserved');

    // 3. Regular Admin CANNOT assign super_admin or ceo
    const escalateDenied = await assignEnterpriseStaffRoleServer({
      actor: adminActor,
      targetEmail: 'staff.counsellor@everykr.com',
      targetRole: 'super_admin',
      deps: makeMutationDeps(),
    });
    assert.equal(escalateDenied.ok, false);
    assert.equal(escalateDenied.httpStatus, 403);

    // 4. Primary Super Admin CANNOT be demoted or revoked
    const demotePrimaryDenied = await assignEnterpriseStaffRoleServer({
      actor: superAdminActor,
      targetEmail: PRIMARY_SUPER_ADMIN_EMAIL,
      targetRole: 'admin',
      deps: makeMutationDeps(),
    });
    assert.equal(demotePrimaryDenied.ok, false);
    assert.equal(demotePrimaryDenied.httpStatus, 403);

    const revokePrimaryDenied = await revokeEnterpriseStaffRoleServer({
      actor: superAdminActor,
      targetUid: 'uid_super_admin_primary',
      targetEmail: PRIMARY_SUPER_ADMIN_EMAIL,
      deps: makeMutationDeps(),
    });
    assert.equal(revokePrimaryDenied.ok, false);
    assert.equal(revokePrimaryDenied.httpStatus, 403);

    // 5. Revoking counsellor clears staff flags while STILL preserving unrelated custom claims
    const revokeRes = await revokeEnterpriseStaffRoleServer({
      actor: superAdminActor,
      targetUid: 'uid_staff_c1',
      targetEmail: 'staff.counsellor@everykr.com',
      reason: 'Offboarded',
      deps: makeMutationDeps(),
    });
    assert.equal(revokeRes.ok, true);
    assert.equal(revokeRes.mergedClaims?.counsellor, undefined);
    assert.equal(revokeRes.mergedClaims?.role, 'student');
    assert.equal(revokeRes.mergedClaims?.orgPartnerId, 'seoul_branch');
    assert.equal(revokeRes.mergedClaims?.customLocale, 'ko');
    assert.ok(history.length >= 3, 'Immutable role history entries must be recorded');
  });

  console.log('\n=== Summary ===');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

void main();
