/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Enterprise RBAC Core — Authoritative Server-Side Authorization Engine
 *
 * Security Guarantees:
 * 1. Primary Permanent Super Admin (`mzhmd924@gmail.com`) is verified ONLY through
 *    cryptographically verified Firebase Auth tokens with `emailVerified === true`.
 *    Frontend email/role claims are NEVER trusted.
 * 2. Primary Super Admin cannot be accidentally demoted, suspended, or deleted.
 * 3. Only a verified `super_admin` can grant or revoke `super_admin` privileges.
 * 4. No user can promote themselves to a higher role.
 * 5. Updating custom claims via Firebase Admin SDK ALWAYS merges with existing
 *    custom claims (never replaces existing claims blindly).
 * 6. Live `staff_roles/{uid}` checks enforce immediate revocation and `roleVersion` /
 *    `permissionVersion` invalidation even before a JWT naturally expires.
 */

import crypto from 'crypto';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import {
  ALL_ENTERPRISE_ROLES,
  PRIMARY_SUPER_ADMIN_EMAIL,
  type EnterpriseAccessScope,
  type EnterpriseDepartmentId,
  type EnterprisePermission,
  type EnterpriseRole,
  type StaffRoleAssignment,
  type StaffRoleHistoryEvent,
  type VerifiedEnterpriseCaller,
} from '../types/enterprise.ts';
import { getOrInitFirebaseAdminApp } from './firebaseAdminResetService.ts';
import { verifyFirebaseIdTokenServer } from './userManagementService.ts';
import {
  FIRESTORE_COLLECTIONS,
  getNamedFirestoreDoc,
  upsertNamedFirestoreDoc,
} from './firestorePersistenceBridge.ts';

export const ENTERPRISE_ROLE_LEVEL: Record<EnterpriseRole, number> = {
  super_admin: 100,
  ceo: 90,
  manager: 80,
  admin: 70,
  counsellor: 40,
  application_officer: 40,
  finance_officer: 40,
  viewer: 10,
};

export const ENTERPRISE_ROLE_LABELS: Record<EnterpriseRole, string> = {
  super_admin: 'Super Admin',
  ceo: 'CEO',
  manager: 'Manager',
  admin: 'Admin',
  counsellor: 'Counsellor',
  application_officer: 'Application Officer',
  finance_officer: 'Finance Officer',
  viewer: 'Viewer',
};

export const ENTERPRISE_ROLE_PERMISSIONS: Record<EnterpriseRole, readonly EnterprisePermission[]> = {
  super_admin: [
    'system.configure',
    'system.security_policies',
    'roles.manage_super_admin',
    'roles.manage_all',
    'roles.manage_department_staff',
    'roles.view_directory',
    'dashboard.ceo_read',
    'dashboard.manager_read',
    'dashboard.admin_read',
    'dashboard.counselling_workspace',
    'dashboard.application_workspace',
    'dashboard.finance_workspace',
    'dashboard.viewer_read',
    'applications.read_all',
    'applications.read_department',
    'applications.read_assigned',
    'applications.assign',
    'applications.process_assigned',
    'applications.approve_status',
    'applications.request_documents',
    'applications.review_passport_assigned',
    'applications.review_passport_unrestricted',
    'applications.escalate',
    'leads.read_all',
    'leads.read_assigned',
    'leads.create',
    'leads.update_assigned',
    'tasks.read_all',
    'tasks.read_assigned',
    'tasks.create_assign',
    'tasks.create_followup',
    'tasks.update_own',
    'tasks.escalate',
    'finance.read_summary',
    'finance.read_detailed',
    'finance.create_account',
    'finance.manage_installments',
    'finance.record_payment',
    'finance.verify_payment',
    'finance.reconcile_payment',
    'finance.manage_scholarships',
    'finance.request_correction',
    'finance.approve_correction',
    'finance.view_audit_logs',
    'reports.export_executive',
    'reports.export_operations',
    'reports.export_financial',
    'audit.read_all',
    'alerts.read',
    'alerts.manage',
  ],

  // CEO: Company-wide executive READ & authorized report export.
  // Explicitly EXCLUDES: system.configure, system.security_policies, roles.manage_*,
  // direct financial mutations, and deleting audit logs.
  ceo: [
    'roles.view_directory',
    'dashboard.ceo_read',
    'dashboard.manager_read',
    'applications.read_all',
    'leads.read_all',
    'tasks.read_all',
    'finance.read_summary',
    'finance.read_detailed',
    'finance.view_audit_logs',
    'reports.export_executive',
    'reports.export_operations',
    'reports.export_financial',
    'audit.read_all',
    'alerts.read',
  ],

  // MANAGER: Operations command, application assignment, workload balancing, task creation,
  // financial summaries, escalation to CEO, management reports.
  // Explicitly EXCLUDES: roles.manage_super_admin, roles.manage_all, system.security_policies,
  // direct verified financial overrides (only controlled request_correction).
  manager: [
    'roles.view_directory',
    'dashboard.manager_read',
    'applications.read_all',
    'applications.assign',
    'applications.request_documents',
    'applications.escalate',
    'leads.read_all',
    'tasks.read_all',
    'tasks.create_assign',
    'tasks.update_own',
    'tasks.escalate',
    'finance.read_summary',
    'finance.read_detailed',
    'finance.request_correction',
    'finance.view_audit_logs',
    'reports.export_operations',
    'alerts.read',
    'alerts.manage',
  ],

  // ADMIN: Department-level administration, authorized department staff & workflows.
  // Explicitly EXCLUDES: higher-level role assignments and system security changes.
  admin: [
    'roles.manage_department_staff',
    'roles.view_directory',
    'dashboard.admin_read',
    'applications.read_department',
    'applications.assign',
    'applications.request_documents',
    'applications.approve_status',
    'leads.read_all',
    'tasks.read_all',
    'tasks.create_assign',
    'tasks.update_own',
    'reports.export_operations',
    'alerts.read',
    'alerts.manage',
  ],

  // COUNSELLOR: Strictly assigned student leads & assigned application progress only.
  // Explicitly EXCLUDES: other counsellors' students, unrestricted passport viewing,
  // payment verification, application approval status, unrestricted exports, role changes.
  counsellor: [
    'dashboard.counselling_workspace',
    'applications.read_assigned',
    'applications.request_documents',
    'leads.read_assigned',
    'leads.create',
    'leads.update_assigned',
    'tasks.read_assigned',
    'tasks.create_followup',
    'tasks.update_own',
    'alerts.read',
  ],

  // APPLICATION OFFICER: Strictly assigned applications, document & AI extraction review,
  // processing status, university submissions & decisions, escalation.
  // Explicitly EXCLUDES: financial modifications, role changes, unrelated assignments.
  application_officer: [
    'dashboard.application_workspace',
    'applications.read_assigned',
    'applications.process_assigned',
    'applications.approve_status',
    'applications.request_documents',
    'applications.review_passport_assigned',
    'applications.escalate',
    'tasks.read_assigned',
    'tasks.update_own',
    'tasks.escalate',
    'alerts.read',
  ],

  // FINANCE OFFICER: Dedicated financial workspace (payments, receipts, installments,
  // scholarships/discounts, verification, reconciliation, financial reports).
  // Explicitly EXCLUDES: application document/approval edits, staff roles, deleting verified history.
  finance_officer: [
    'dashboard.finance_workspace',
    'finance.read_summary',
    'finance.read_detailed',
    'finance.create_account',
    'finance.manage_installments',
    'finance.record_payment',
    'finance.verify_payment',
    'finance.reconcile_payment',
    'finance.manage_scholarships',
    'finance.request_correction',
    'finance.approve_correction',
    'finance.view_audit_logs',
    'reports.export_financial',
    'tasks.read_assigned',
    'tasks.update_own',
    'alerts.read',
  ],

  // VIEWER: Read-only access to explicitly assigned departments/records. Zero mutations.
  viewer: [
    'dashboard.viewer_read',
    'applications.read_department',
    'finance.read_summary',
    'alerts.read',
  ],
};

const PERMISSION_SET_BY_ROLE: Record<EnterpriseRole, ReadonlySet<EnterprisePermission>> = {
  super_admin: new Set(ENTERPRISE_ROLE_PERMISSIONS.super_admin),
  ceo: new Set(ENTERPRISE_ROLE_PERMISSIONS.ceo),
  manager: new Set(ENTERPRISE_ROLE_PERMISSIONS.manager),
  admin: new Set(ENTERPRISE_ROLE_PERMISSIONS.admin),
  counsellor: new Set(ENTERPRISE_ROLE_PERMISSIONS.counsellor),
  application_officer: new Set(ENTERPRISE_ROLE_PERMISSIONS.application_officer),
  finance_officer: new Set(ENTERPRISE_ROLE_PERMISSIONS.finance_officer),
  viewer: new Set(ENTERPRISE_ROLE_PERMISSIONS.viewer),
};

export function isValidEnterpriseRole(value: unknown): value is EnterpriseRole {
  return typeof value === 'string' && (ALL_ENTERPRISE_ROLES as readonly string[]).includes(value);
}

export function normalizeEmail(raw: unknown): string {
  return String(raw || '').trim().toLowerCase();
}

export function isPrimarySuperAdminEmail(email?: string | null): boolean {
  return normalizeEmail(email) === PRIMARY_SUPER_ADMIN_EMAIL;
}

export function getPermissionsForRole(role: EnterpriseRole): EnterprisePermission[] {
  return [...ENTERPRISE_ROLE_PERMISSIONS[role]];
}

export function hasEnterprisePermission(
  roleOrCaller: EnterpriseRole | VerifiedEnterpriseCaller | null | undefined,
  permission: EnterprisePermission
): boolean {
  if (!roleOrCaller) return false;
  const role: EnterpriseRole = typeof roleOrCaller === 'string' ? roleOrCaller : roleOrCaller.role;
  return PERMISSION_SET_BY_ROLE[role]?.has(permission) ?? false;
}

export function getDefaultDepartmentForRole(role: EnterpriseRole): EnterpriseDepartmentId {
  switch (role) {
    case 'super_admin':
    case 'ceo':
      return 'executive';
    case 'manager':
      return 'operations';
    case 'admin':
      return 'administration';
    case 'counsellor':
      return 'counselling';
    case 'application_officer':
      return 'admissions';
    case 'finance_officer':
      return 'finance';
    case 'viewer':
    default:
      return 'compliance';
  }
}

export function getDefaultAccessScopeForRole(role: EnterpriseRole): EnterpriseAccessScope {
  switch (role) {
    case 'super_admin':
    case 'ceo':
    case 'manager':
    case 'finance_officer':
      return 'global';
    case 'admin':
    case 'viewer':
      return 'department';
    case 'counsellor':
    case 'application_officer':
    default:
      return 'assigned_only';
  }
}

/**
 * Enforces organizational role-assignment hierarchy & primary Super Admin safeguards:
 * - Only a verified `super_admin` can assign or revoke `super_admin`.
 * - Primary Super Admin (`mzhmd924@gmail.com`) can NEVER be demoted, suspended, or revoked.
 * - No user can promote themselves or assign a role equal/higher than their own (except super_admin).
 * - Department `admin` can only manage department roles strictly below `admin` (`counsellor`, `application_officer`, `finance_officer`, `viewer`).
 */
export function validateRoleMutationPolicy(params: {
  actor: VerifiedEnterpriseCaller;
  targetUid: string;
  targetEmail: string;
  currentTargetRole: EnterpriseRole | null;
  nextRole: EnterpriseRole | null; // null = revoke
  nextDepartment?: EnterpriseDepartmentId;
}): { allowed: true } | { allowed: false; httpStatus: number; errorCode: string; error: string } {
  const { actor, targetUid, targetEmail, currentTargetRole, nextRole } = params;
  const targetIsPrimary = isPrimarySuperAdminEmail(targetEmail);

  // Rule 1: Primary Super Admin is permanently protected against demotion or revocation
  if (targetIsPrimary && nextRole !== 'super_admin') {
    return {
      allowed: false,
      httpStatus: 403,
      errorCode: 'primary_super_admin_protected',
      error:
        'The primary Super Admin account is permanently protected from demotion, suspension, or revocation.',
    };
  }

  // Rule 2: Only Super Admin can grant, modify, or revoke super_admin privileges
  if (nextRole === 'super_admin' || currentTargetRole === 'super_admin') {
    if (actor.role !== 'super_admin') {
      return {
        allowed: false,
        httpStatus: 403,
        errorCode: 'super_admin_only_action',
        error: 'Only a verified Super Admin can grant, modify, or revoke Super Admin privileges.',
      };
    }
    // Only the primary Super Admin can grant/revoke super_admin on OTHER accounts
    if (!actor.isPrimarySuperAdmin && targetUid !== actor.uid) {
      return {
        allowed: false,
        httpStatus: 403,
        errorCode: 'primary_super_admin_required',
        error: 'Only the primary Super Admin can grant or revoke Super Admin privileges for other accounts.',
      };
    }
  }

  // Rule 3: Prevent self-promotion or self-role modification
  if (actor.uid === targetUid && !actor.isPrimarySuperAdmin) {
    return {
      allowed: false,
      httpStatus: 403,
      errorCode: 'self_role_mutation_forbidden',
      error: 'Users cannot modify or promote their own role.',
    };
  }

  // Rule 4: Super Admin has full authority over all remaining roles
  if (actor.role === 'super_admin') {
    return { allowed: true };
  }

  // Rule 5: Department Admin can only assign roles strictly below Admin within authorized departments
  if (actor.role === 'admin' && hasEnterprisePermission(actor, 'roles.manage_department_staff')) {
    const allowedSubRoles = new Set<EnterpriseRole>([
      'counsellor',
      'application_officer',
      'finance_officer',
      'viewer',
    ]);
    if (nextRole && !allowedSubRoles.has(nextRole)) {
      return {
        allowed: false,
        httpStatus: 403,
        errorCode: 'insufficient_role_level',
        error: 'Department Admins cannot assign Admin, Manager, CEO, or Super Admin roles.',
      };
    }
    if (currentTargetRole && !allowedSubRoles.has(currentTargetRole)) {
      return {
        allowed: false,
        httpStatus: 403,
        errorCode: 'insufficient_role_level',
        error: 'Department Admins cannot modify accounts holding Admin or higher privileges.',
      };
    }
    if (
      params.nextDepartment &&
      actor.assignedDepartments.length > 0 &&
      !actor.assignedDepartments.includes(params.nextDepartment)
    ) {
      return {
        allowed: false,
        httpStatus: 403,
        errorCode: 'department_scope_violation',
        error: 'Department Admins can only manage staff within their authorized departments.',
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    httpStatus: 403,
    errorCode: 'role_management_forbidden',
    error: 'You do not have permission to assign or revoke staff roles.',
  };
}

/**
 * Merges enterprise RBAC custom claims with existing Firebase Auth custom claims WITHOUT
 * blindly overwriting unrelated claims. Maintains backward-compatibility flags (`admin`,
 * `counsellor`, `viewer`) used by existing Smart Application Firestore/Storage rules.
 */
export function buildMergedEnterpriseCustomClaims(params: {
  existingClaims: Record<string, any> | undefined | null;
  assignment: Pick<
    StaffRoleAssignment,
    | 'role'
    | 'department'
    | 'accessScope'
    | 'assignedUniversities'
    | 'roleVersion'
    | 'permissionVersion'
    | 'status'
  > | null;
}): Record<string, any> {
  const preserved: Record<string, any> = {};
  if (params.existingClaims && typeof params.existingClaims === 'object') {
    for (const [k, v] of Object.entries(params.existingClaims)) {
      preserved[k] = v;
    }
  }

  // Strip managed enterprise & legacy role flags before re-applying cleanly
  delete preserved.enterpriseRole;
  delete preserved.role;
  delete preserved.super_admin;
  delete preserved.ceo;
  delete preserved.manager;
  delete preserved.admin;
  delete preserved.counsellor;
  delete preserved.application_officer;
  delete preserved.finance_officer;
  delete preserved.viewer;
  delete preserved.department;
  delete preserved.accessScope;
  delete preserved.roleVersion;
  delete preserved.permissionVersion;

  if (!params.assignment || params.assignment.status !== 'active') {
    preserved.role = 'student';
    preserved.roleVersion = (Number(params.existingClaims?.roleVersion) || 0) + 1;
    preserved.permissionVersion = (Number(params.existingClaims?.permissionVersion) || 0) + 1;
    return preserved;
  }

  const { role, department, accessScope, roleVersion, permissionVersion } = params.assignment;
  preserved.enterpriseRole = role;
  preserved.role = role;
  preserved.department = department;
  preserved.accessScope = accessScope;
  preserved.roleVersion = roleVersion;
  preserved.permissionVersion = permissionVersion;

  // Backward-compatible boolean flags for existing Firestore/Storage rules
  if (role === 'super_admin') {
    preserved.super_admin = true;
    preserved.admin = true;
  } else if (role === 'admin') {
    preserved.admin = true;
  } else if (role === 'ceo') {
    preserved.ceo = true;
  } else if (role === 'manager') {
    preserved.manager = true;
  } else if (role === 'counsellor') {
    preserved.counsellor = true;
  } else if (role === 'application_officer') {
    preserved.application_officer = true;
  } else if (role === 'finance_officer') {
    preserved.finance_officer = true;
  } else if (role === 'viewer') {
    preserved.viewer = true;
  }

  return preserved;
}

/**
 * Applies merged custom claims to a Firebase Auth user via Firebase Admin SDK.
 * Preserves all unrelated existing claims and checks total JSON byte size (< 1000 bytes limit).
 */
export async function syncEnterpriseClaimsToFirebaseAuth(params: {
  uid: string;
  assignment: StaffRoleAssignment | null;
}): Promise<{
  synced: boolean;
  claims?: Record<string, any>;
  iamWarning?: string;
}> {
  try {
    const { app: adminApp } = getOrInitFirebaseAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const userRecord = await adminAuth.getUser(params.uid);
    const mergedClaims = buildMergedEnterpriseCustomClaims({
      existingClaims: userRecord.customClaims,
      assignment: params.assignment,
    });

    if (Buffer.byteLength(JSON.stringify(mergedClaims), 'utf8') > 950) {
      throw new Error('Merged Firebase custom claims exceed 1000-byte payload limit');
    }

    await adminAuth.setCustomUserClaims(params.uid, mergedClaims);
    return { synced: true, claims: mergedClaims };
  } catch (err: any) {
    return {
      synced: false,
      iamWarning: String(
        err?.message || 'Firebase Admin Auth setCustomUserClaims requires roles/firebaseauth.admin'
      ),
    };
  }
}

/**
 * Looks up an existing Firebase Auth account by email via Firebase Admin SDK.
 */
export async function lookupFirebaseAuthUserByEmail(email: string): Promise<{
  found: boolean;
  iamUnavailable?: boolean;
  iamMessage?: string;
  user?: {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    disabled: boolean;
    photoURL?: string;
    createdAt?: string;
    lastSignInAt?: string;
    existingClaims: Record<string, any>;
  };
}> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(cleanEmail)) {
    return { found: false };
  }
  try {
    const { app: adminApp } = getOrInitFirebaseAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const record = await adminAuth.getUserByEmail(cleanEmail);
    return {
      found: true,
      user: {
        uid: record.uid,
        email: normalizeEmail(record.email || cleanEmail),
        displayName: record.displayName || record.email?.split('@')[0] || 'Staff Member',
        emailVerified: Boolean(record.emailVerified),
        disabled: Boolean(record.disabled),
        photoURL: record.photoURL || undefined,
        createdAt: record.metadata?.creationTime,
        lastSignInAt: record.metadata?.lastSignInTime,
        existingClaims: (record.customClaims || {}) as Record<string, any>,
      },
    };
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'auth/user-not-found') {
      return { found: false };
    }
    return {
      found: false,
      iamUnavailable: true,
      iamMessage: String(err?.message || 'Firebase Admin Auth lookup unavailable'),
    };
  }
}

export interface ResolveEnterpriseCallerDeps {
  verifyIdToken?: typeof verifyFirebaseIdTokenServer;
  getStaffAssignmentByUid?: (uid: string) => Promise<StaffRoleAssignment | null>;
}

/**
 * Extracts a Firebase ID token from Express request headers.
 */
export function extractBearerFirebaseToken(headers: {
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
  const authHeader = typeof headers.authorization === 'string' ? headers.authorization.trim() : '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (bearer && !bearer.startsWith('ekrs1.')) {
    return bearer;
  }
  return null;
}

/**
 * Maps verified Firebase Auth custom claims (both Enterprise RBAC and legacy `admin`,
 * `counsellor`, `viewer` claims) into an authoritative EnterpriseRole.
 * NEVER promotes based on email address.
 */
export function resolveEnterpriseRoleFromClaims(
  claims?: Record<string, any> | null
): EnterpriseRole | null {
  if (!claims || typeof claims !== 'object') return null;

  const rawClaimRole = claims.enterpriseRole || claims.role;
  if (isValidEnterpriseRole(rawClaimRole)) {
    return rawClaimRole;
  }
  if (claims.super_admin === true) return 'super_admin';
  if (claims.admin === true) return 'admin';
  if (claims.ceo === true) return 'ceo';
  if (claims.manager === true) return 'manager';
  if (claims.application_officer === true) return 'application_officer';
  if (claims.finance_officer === true) return 'finance_officer';
  if (claims.counsellor === true) return 'counsellor';
  if (claims.viewer === true) return 'viewer';
  return null;
}

/**
 * Canonical Admin check across EVERYKR backend services.
 * Returns true ONLY for verified `super_admin` or `admin` roles/claims.
 * Preserves parity with `storage.rules` (`admin == true || role == 'admin'`) because
 * `buildMergedEnterpriseCustomClaims` keeps `admin: true` on `super_admin`.
 */
export function isCanonicalAdminRole(role?: EnterpriseRole | string | null): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function isCanonicalAdminClaims(claims?: Record<string, any> | null): boolean {
  return isCanonicalAdminRole(resolveEnterpriseRoleFromClaims(claims));
}

export type CanonicalStorageRole = 'admin' | 'counsellor' | 'viewer' | 'student';

/**
 * Maps verified Firebase custom claims (and optional active staff assignment) into
 * least-privilege Private Storage access roles:
 *  - `super_admin` / `admin`            -> `admin` (authorized access to registered application docs)
 *  - `counsellor` / `application_officer` -> `counsellor` (STRICTLY isolated to `assignedTo === caller.uid`, zero uploads)
 *  - `viewer` / `finance_officer` / `ceo` / `manager` -> `viewer` (STRICTLY ZERO raw student PII document reads/writes)
 *  - All other authenticated accounts   -> `student` (strictly own applications, uploads only in draft/documents_missing)
 */
export function resolveCanonicalStorageRole(params: {
  claims?: Record<string, any> | null;
  activeStaffRole?: EnterpriseRole | null;
}): CanonicalStorageRole {
  const effectiveRole = params.activeStaffRole ?? resolveEnterpriseRoleFromClaims(params.claims);
  if (!effectiveRole) return 'student';
  if (effectiveRole === 'super_admin' || effectiveRole === 'admin') {
    return 'admin';
  }
  if (effectiveRole === 'counsellor' || effectiveRole === 'application_officer') {
    return 'counsellor';
  }
  // Least-privilege isolation: viewer, finance_officer, ceo, manager never get blanket raw PII file downloads
  return 'viewer';
}

/**
 * Default live Firestore lookup for `staff_roles/{uid}` on EVERYKR's named database.
 */
export async function fetchStaffRoleAssignmentFromFirestore(
  uid: string
): Promise<StaffRoleAssignment | null> {
  if (!uid || typeof uid !== 'string') return null;
  const doc = await getNamedFirestoreDoc<StaffRoleAssignment>(
    FIRESTORE_COLLECTIONS.staffRoles,
    uid.trim()
  );
  if (!doc || !doc.uid || !isValidEnterpriseRole(doc.role)) {
    return null;
  }
  return doc;
}

/**
 * Authoritatively resolves the authenticated caller's Enterprise Role and permissions:
 * 1. Cryptographically verifies the Firebase ID token (never trusts frontend headers/body).
 * 2. Checks the live `staff_roles/{uid}` assignment store FIRST so revocations and
 *    role downgrades take effect IMMEDIATELY on the backend (even before JWT expiry).
 * 3. Falls back to verified Firebase custom claims when no `staff_roles/{uid}` record exists yet.
 * 4. NEVER automatically promotes any account based solely on email address.
 */
export async function resolveVerifiedEnterpriseCaller(
  rawIdToken: string | null | undefined,
  deps?: ResolveEnterpriseCallerDeps
): Promise<VerifiedEnterpriseCaller | null> {
  const cleanToken = String(rawIdToken || '').replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken || cleanToken.startsWith('ekrs1.')) {
    return null;
  }

  let verified: {
    valid: boolean;
    uid?: string;
    email?: string;
    emailVerified?: boolean;
    name?: string;
    customClaims?: Record<string, any>;
  };

  if (deps?.verifyIdToken) {
    verified = await deps.verifyIdToken(cleanToken);
  } else {
    // Primary path: Firebase Admin verifyIdToken (cryptographic signature check, needs no IAM)
    // Secondary path: Identity Toolkit accounts:lookup (existing EveryKR verifier)
    try {
      const { app: adminApp } = getOrInitFirebaseAdminApp();
      const decoded = await getAdminAuth(adminApp).verifyIdToken(cleanToken);
      verified = {
        valid: true,
        uid: decoded.uid,
        email: decoded.email ? normalizeEmail(decoded.email) : undefined,
        emailVerified: Boolean(decoded.email_verified),
        name: typeof decoded.name === 'string' ? decoded.name : undefined,
        customClaims: decoded as Record<string, any>,
      };
    } catch {
      verified = await verifyFirebaseIdTokenServer(cleanToken);
    }
  }

  if (!verified.valid || !verified.uid) {
    return null;
  }

  const email = normalizeEmail(verified.email);
  const emailVerified = Boolean(verified.emailVerified);
  const claims = verified.customClaims || {};

  // Check authoritative server-side staff_roles record (enforces instant revocation & roleVersion)
  const storedAssignment = deps?.getStaffAssignmentByUid
    ? await deps.getStaffAssignmentByUid(verified.uid)
    : await fetchStaffRoleAssignmentFromFirestore(verified.uid);

  // If an explicit staff assignment record exists in Firestore: it is authoritative!
  // Revoked or suspended records IMMEDIATELY block access even if an old JWT still has stale claims.
  if (storedAssignment) {
    if (storedAssignment.status !== 'active') {
      return null;
    }
    const claimRole = String(claims.enterpriseRole || claims.role || '');
    const claimRoleVersion = Number(claims.roleVersion || 0);
    const claimsSyncNeeded =
      claimRole !== storedAssignment.role || claimRoleVersion < storedAssignment.roleVersion;
    const isPrimary =
      isPrimarySuperAdminEmail(email || storedAssignment.email) &&
      emailVerified &&
      storedAssignment.role === 'super_admin';

    return {
      uid: verified.uid,
      email: email || storedAssignment.email,
      displayName: storedAssignment.displayName || verified.name || email.split('@')[0] || 'Staff',
      emailVerified,
      role: storedAssignment.role,
      department: storedAssignment.department,
      accessScope: storedAssignment.accessScope,
      assignedUniversities: storedAssignment.assignedUniversities || [],
      assignedDepartments:
        storedAssignment.assignedDepartments?.length > 0
          ? storedAssignment.assignedDepartments
          : [storedAssignment.department],
      roleVersion: storedAssignment.roleVersion,
      permissionVersion: storedAssignment.permissionVersion,
      isPrimarySuperAdmin: isPrimary,
      permissions: getPermissionsForRole(storedAssignment.role),
      claimsSyncNeeded,
      idToken: cleanToken,
    };
  }

  // Fallback: verified Firebase Auth custom claims ONLY (ZERO email-only auto-promotion)
  const resolvedRole = resolveEnterpriseRoleFromClaims(claims);
  if (!resolvedRole) {
    return null;
  }

  const department =
    typeof claims.department === 'string' && claims.department
      ? (claims.department as EnterpriseDepartmentId)
      : getDefaultDepartmentForRole(resolvedRole);
  const accessScope =
    typeof claims.accessScope === 'string' && claims.accessScope
      ? (claims.accessScope as EnterpriseAccessScope)
      : getDefaultAccessScopeForRole(resolvedRole);
  const isPrimary =
    isPrimarySuperAdminEmail(email) && emailVerified && resolvedRole === 'super_admin';

  return {
    uid: verified.uid,
    email,
    displayName: verified.name || email.split('@')[0] || 'Staff Member',
    emailVerified,
    role: resolvedRole,
    department,
    accessScope,
    assignedUniversities: Array.isArray(claims.assignedUniversities)
      ? claims.assignedUniversities.map(String)
      : [],
    assignedDepartments: [department],
    roleVersion: Number(claims.roleVersion || 1),
    permissionVersion: Number(claims.permissionVersion || 1),
    isPrimarySuperAdmin: isPrimary,
    permissions: getPermissionsForRole(resolvedRole),
    claimsSyncNeeded: false,
    idToken: cleanToken,
  };
}

export interface StaffRoleMutationDeps {
  lookupUserByEmail?: typeof lookupFirebaseAuthUserByEmail;
  getExistingAssignment?: (uid: string) => Promise<StaffRoleAssignment | null>;
  saveAssignment?: (assignment: StaffRoleAssignment) => Promise<void>;
  appendRoleHistory?: (entry: StaffRoleHistoryEvent) => Promise<void>;
  syncClaims?: typeof syncEnterpriseClaimsToFirebaseAuth;
}

/**
 * Server-side role assignment with full RBAC hierarchy enforcement, Primary Super Admin
 * protection, custom claims preservation, and immutable audit history logging.
 */
export async function assignEnterpriseStaffRoleServer(params: {
  actor: VerifiedEnterpriseCaller;
  targetEmail: string;
  targetRole: EnterpriseRole;
  department?: EnterpriseDepartmentId;
  accessScope?: EnterpriseAccessScope;
  assignedUniversities?: string[];
  assignedDepartments?: EnterpriseDepartmentId[];
  reason?: string;
  deps?: StaffRoleMutationDeps;
}): Promise<{
  ok: boolean;
  httpStatus: number;
  errorCode?: string;
  error?: string;
  assignment?: StaffRoleAssignment;
  claimsSynced?: boolean;
  mergedClaims?: Record<string, any>;
  iamWarning?: string;
}> {
  if (!isValidEnterpriseRole(params.targetRole)) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'invalid_role',
      error: `Invalid role "${String(params.targetRole)}".`,
    };
  }

  const lookupFn = params.deps?.lookupUserByEmail || lookupFirebaseAuthUserByEmail;
  const lookedUp = await lookupFn(params.targetEmail);
  if (lookedUp.iamUnavailable) {
    return {
      ok: false,
      httpStatus: 503,
      errorCode: 'firebase_auth_admin_unavailable',
      error:
        lookedUp.iamMessage ||
        'Firebase Auth Admin lookup requires roles/firebaseauth.admin on the runtime service account.',
    };
  }
  if (!lookedUp.found || !lookedUp.user) {
    return {
      ok: false,
      httpStatus: 404,
      errorCode: 'firebase_user_not_found',
      error: `No Firebase Auth account found for ${normalizeEmail(params.targetEmail)}.`,
    };
  }
  if (lookedUp.user.disabled) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'target_account_disabled',
      error: 'Cannot assign an active staff role to a disabled Firebase Auth account.',
    };
  }

  const getExisting = params.deps?.getExistingAssignment || fetchStaffRoleAssignmentFromFirestore;
  const existing = await getExisting(lookedUp.user.uid);
  const existingClaimRole = resolveEnterpriseRoleFromClaims(lookedUp.user.existingClaims);
  const currentTargetRole = existing?.status === 'active' ? existing.role : existingClaimRole;
  const department = params.department || getDefaultDepartmentForRole(params.targetRole);
  const accessScope = params.accessScope || getDefaultAccessScopeForRole(params.targetRole);

  const policy = validateRoleMutationPolicy({
    actor: params.actor,
    targetUid: lookedUp.user.uid,
    targetEmail: lookedUp.user.email,
    currentTargetRole,
    nextRole: params.targetRole,
    nextDepartment: department,
  });

  if (!policy.allowed) {
    return {
      ok: false,
      httpStatus: policy.httpStatus,
      errorCode: policy.errorCode,
      error: policy.error,
    };
  }

  const nowIso = new Date().toISOString();
  const previousRoleVersion =
    existing?.roleVersion ?? Number(lookedUp.user.existingClaims?.roleVersion || 0);
  const nextRoleVersion = previousRoleVersion + 1;
  const nextPermVersion =
    (existing?.permissionVersion ?? Number(lookedUp.user.existingClaims?.permissionVersion || 0)) + 1;

  const assignment: StaffRoleAssignment = {
    uid: lookedUp.user.uid,
    email: lookedUp.user.email,
    displayName: lookedUp.user.displayName,
    role: params.targetRole,
    department,
    accessScope,
    assignedUniversities: Array.isArray(params.assignedUniversities)
      ? params.assignedUniversities.map((u) => String(u).trim()).filter(Boolean)
      : existing?.assignedUniversities || [],
    assignedDepartments:
      Array.isArray(params.assignedDepartments) && params.assignedDepartments.length > 0
        ? params.assignedDepartments
        : [department],
    status: 'active',
    roleVersion: nextRoleVersion,
    permissionVersion: nextPermVersion,
    assignedByUid: params.actor.uid,
    assignedByEmail: params.actor.email,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    isPrimarySuperAdmin: isPrimarySuperAdminEmail(lookedUp.user.email) && params.targetRole === 'super_admin',
  };

  const syncFn = params.deps?.syncClaims || syncEnterpriseClaimsToFirebaseAuth;
  const syncRes = await syncFn({ uid: assignment.uid, assignment });
  if (syncRes.synced) {
    assignment.lastClaimSyncAt = nowIso;
  }

  const saveFn =
    params.deps?.saveAssignment ||
    (async (rec: StaffRoleAssignment) => {
      await upsertNamedFirestoreDoc(
        FIRESTORE_COLLECTIONS.staffRoles,
        rec.uid,
        rec as unknown as Record<string, unknown>,
        { merge: true }
      );
    });
  await saveFn(assignment);

  const historyEntry: StaffRoleHistoryEvent = {
    eventId: `rolehist_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    targetUid: assignment.uid,
    targetEmail: assignment.email,
    targetName: assignment.displayName,
    action: existing ? 'role_updated' : 'role_assigned',
    previousRole: currentTargetRole,
    newRole: assignment.role,
    previousDepartment: existing?.department ?? null,
    newDepartment: assignment.department,
    previousRoleVersion,
    newRoleVersion: nextRoleVersion,
    actorUid: params.actor.uid,
    actorEmail: params.actor.email,
    actorRole: params.actor.role,
    reason: params.reason ? String(params.reason).trim().slice(0, 500) : 'Role assigned by authorized administrator',
    timestamp: nowIso,
  };

  const appendHistory =
    params.deps?.appendRoleHistory ||
    (async (entry: StaffRoleHistoryEvent) => {
      await upsertNamedFirestoreDoc(
        FIRESTORE_COLLECTIONS.staffRoleHistory,
        entry.eventId,
        entry as unknown as Record<string, unknown>,
        { merge: false }
      );
    });
  await appendHistory(historyEntry);

  return {
    ok: true,
    httpStatus: 200,
    assignment,
    claimsSynced: syncRes.synced,
    mergedClaims: syncRes.claims,
    ...(syncRes.iamWarning ? { iamWarning: syncRes.iamWarning } : {}),
  };
}

/**
 * Server-side role revocation (preserves unrelated Firebase custom claims while clearing
 * staff privileges and protecting Primary Super Admin `mzhmd924@gmail.com`).
 */
export async function revokeEnterpriseStaffRoleServer(params: {
  actor: VerifiedEnterpriseCaller;
  targetUid: string;
  targetEmail: string;
  reason?: string;
  deps?: StaffRoleMutationDeps;
}): Promise<{
  ok: boolean;
  httpStatus: number;
  errorCode?: string;
  error?: string;
  claimsSynced?: boolean;
  mergedClaims?: Record<string, any>;
}> {
  const getExisting = params.deps?.getExistingAssignment || fetchStaffRoleAssignmentFromFirestore;
  const existing = await getExisting(params.targetUid);

  const policy = validateRoleMutationPolicy({
    actor: params.actor,
    targetUid: params.targetUid,
    targetEmail: params.targetEmail,
    currentTargetRole: existing?.role || null,
    nextRole: null,
  });

  if (!policy.allowed) {
    return {
      ok: false,
      httpStatus: policy.httpStatus,
      errorCode: policy.errorCode,
      error: policy.error,
    };
  }

  const nowIso = new Date().toISOString();
  const previousRoleVersion = existing?.roleVersion ?? 1;
  const nextRoleVersion = previousRoleVersion + 1;
  const revokedRecord: StaffRoleAssignment = {
    uid: params.targetUid,
    email: normalizeEmail(params.targetEmail),
    displayName: existing?.displayName || normalizeEmail(params.targetEmail).split('@')[0] || 'Staff',
    role: existing?.role || 'viewer',
    department: existing?.department || 'compliance',
    accessScope: existing?.accessScope || 'assigned_only',
    assignedUniversities: [],
    assignedDepartments: [],
    status: 'revoked',
    roleVersion: nextRoleVersion,
    permissionVersion: (existing?.permissionVersion ?? 1) + 1,
    assignedByUid: params.actor.uid,
    assignedByEmail: params.actor.email,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    isPrimarySuperAdmin: false,
  };

  const syncFn = params.deps?.syncClaims || syncEnterpriseClaimsToFirebaseAuth;
  const syncRes = await syncFn({ uid: params.targetUid, assignment: null });
  if (syncRes.synced) {
    revokedRecord.lastClaimSyncAt = nowIso;
  }

  const saveFn =
    params.deps?.saveAssignment ||
    (async (rec: StaffRoleAssignment) => {
      await upsertNamedFirestoreDoc(
        FIRESTORE_COLLECTIONS.staffRoles,
        rec.uid,
        rec as unknown as Record<string, unknown>,
        { merge: true }
      );
    });
  await saveFn(revokedRecord);

  const historyEntry: StaffRoleHistoryEvent = {
    eventId: `rolehist_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    targetUid: params.targetUid,
    targetEmail: normalizeEmail(params.targetEmail),
    targetName: revokedRecord.displayName,
    action: 'role_revoked',
    previousRole: existing?.role ?? null,
    newRole: null,
    previousDepartment: existing?.department ?? null,
    newDepartment: null,
    previousRoleVersion,
    newRoleVersion: nextRoleVersion,
    actorUid: params.actor.uid,
    actorEmail: params.actor.email,
    actorRole: params.actor.role,
    reason: params.reason ? String(params.reason).trim().slice(0, 500) : 'Role revoked by authorized administrator',
    timestamp: nowIso,
  };

  const appendHistory =
    params.deps?.appendRoleHistory ||
    (async (entry: StaffRoleHistoryEvent) => {
      await upsertNamedFirestoreDoc(
        FIRESTORE_COLLECTIONS.staffRoleHistory,
        entry.eventId,
        entry as unknown as Record<string, unknown>,
        { merge: false }
      );
    });
  await appendHistory(historyEntry);

  return {
    ok: true,
    httpStatus: 200,
    claimsSynced: syncRes.synced,
    mergedClaims: syncRes.claims,
  };
}

/**
 * Explicit, audited bootstrap utility for assigning `super_admin` custom claims to the
 * Primary Permanent Super Admin (`mzhmd924@gmail.com`) via Firebase Admin SDK.
 * NEVER called automatically during normal user login or request authorization.
 */
export async function bootstrapPrimarySuperAdminServer(params?: {
  dryRun?: boolean;
  deps?: StaffRoleMutationDeps;
}): Promise<{
  ok: boolean;
  dryRun: boolean;
  uid?: string;
  email: string;
  mergedClaims?: Record<string, any>;
  claimsSynced?: boolean;
  error?: string;
}> {
  const targetEmail = PRIMARY_SUPER_ADMIN_EMAIL;
  const dryRun = Boolean(params?.dryRun);
  const lookupFn = params?.deps?.lookupUserByEmail || lookupFirebaseAuthUserByEmail;
  const lookedUp = await lookupFn(targetEmail);

  if (lookedUp.iamUnavailable) {
    return {
      ok: false,
      dryRun,
      email: targetEmail,
      error: lookedUp.iamMessage || 'Firebase Auth Admin SDK unavailable.',
    };
  }
  if (!lookedUp.found || !lookedUp.user) {
    return {
      ok: false,
      dryRun,
      email: targetEmail,
      error: `Primary Super Admin Firebase account (${targetEmail}) not found.`,
    };
  }
  if (!lookedUp.user.emailVerified || lookedUp.user.disabled) {
    return {
      ok: false,
      dryRun,
      uid: lookedUp.user.uid,
      email: targetEmail,
      error: 'Primary Super Admin account must be email-verified and active in Firebase Auth.',
    };
  }

  const nowIso = new Date().toISOString();
  const previousRoleVersion = Number(lookedUp.user.existingClaims?.roleVersion || 0);
  const nextRoleVersion = Math.max(1, previousRoleVersion + 1);
  const assignment: StaffRoleAssignment = {
    uid: lookedUp.user.uid,
    email: lookedUp.user.email,
    displayName: lookedUp.user.displayName || 'Primary Super Admin',
    role: 'super_admin',
    department: 'executive',
    accessScope: 'global',
    assignedUniversities: [],
    assignedDepartments: [
      'executive',
      'operations',
      'counselling',
      'admissions',
      'finance',
      'administration',
      'compliance',
    ],
    status: 'active',
    roleVersion: nextRoleVersion,
    permissionVersion: Math.max(1, Number(lookedUp.user.existingClaims?.permissionVersion || 0) + 1),
    assignedByUid: lookedUp.user.uid,
    assignedByEmail: targetEmail,
    createdAt: nowIso,
    updatedAt: nowIso,
    isPrimarySuperAdmin: true,
  };

  const mergedClaims = buildMergedEnterpriseCustomClaims({
    existingClaims: lookedUp.user.existingClaims,
    assignment,
  });

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      uid: assignment.uid,
      email: assignment.email,
      mergedClaims,
      claimsSynced: false,
    };
  }

  const syncFn = params?.deps?.syncClaims || syncEnterpriseClaimsToFirebaseAuth;
  const syncRes = await syncFn({ uid: assignment.uid, assignment });
  if (syncRes.synced) {
    assignment.lastClaimSyncAt = nowIso;
  }

  const saveFn =
    params?.deps?.saveAssignment ||
    (async (rec: StaffRoleAssignment) => {
      await upsertNamedFirestoreDoc(
        FIRESTORE_COLLECTIONS.staffRoles,
        rec.uid,
        rec as unknown as Record<string, unknown>,
        { merge: true }
      );
    });
  await saveFn(assignment);

  const appendHistory =
    params?.deps?.appendRoleHistory ||
    (async (entry: StaffRoleHistoryEvent) => {
      await upsertNamedFirestoreDoc(
        FIRESTORE_COLLECTIONS.staffRoleHistory,
        entry.eventId,
        entry as unknown as Record<string, unknown>,
        { merge: false }
      );
    });
  await appendHistory({
    eventId: `rolehist_bootstrap_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    targetUid: assignment.uid,
    targetEmail: assignment.email,
    targetName: assignment.displayName,
    action: 'super_admin_bootstrap',
    previousRole: resolveEnterpriseRoleFromClaims(lookedUp.user.existingClaims),
    newRole: 'super_admin',
    previousDepartment: null,
    newDepartment: 'executive',
    previousRoleVersion,
    newRoleVersion: nextRoleVersion,
    actorUid: assignment.uid,
    actorEmail: targetEmail,
    actorRole: 'super_admin',
    reason: 'Explicit audited Primary Super Admin bootstrap',
    timestamp: nowIso,
  });

  return {
    ok: true,
    dryRun: false,
    uid: assignment.uid,
    email: assignment.email,
    mergedClaims: syncRes.claims || mergedClaims,
    claimsSynced: syncRes.synced,
    ...(syncRes.iamWarning ? { error: syncRes.iamWarning } : {}),
  };
}

