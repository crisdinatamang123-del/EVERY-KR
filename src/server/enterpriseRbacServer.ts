/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Enterprise RBAC Express Router
 *
 * All authorization checks are strictly server-side using cryptographically verified
 * Firebase Auth ID tokens, verified custom claims, and live `staff_roles/{uid}` lookups
 * on EVERYKR's named Firestore database (`ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f`).
 * NEVER trusts frontend role/email claims and NEVER auto-promotes accounts by email alone.
 */

import crypto from 'crypto';
import express from 'express';
import {
  ALL_ENTERPRISE_ROLES,
  PRIMARY_SUPER_ADMIN_EMAIL,
  type EnterpriseAccessScope,
  type EnterpriseDepartmentId,
  type EnterpriseRole,
  type StaffRoleAssignment,
  type StaffRoleHistoryEvent,
} from '../types/enterprise.ts';
import {
  assignEnterpriseStaffRoleServer,
  bootstrapPrimarySuperAdminServer,
  extractBearerFirebaseToken,
  hasEnterprisePermission,
  isCanonicalAdminRole,
  isValidEnterpriseRole,
  lookupFirebaseAuthUserByEmail,
  resolveVerifiedEnterpriseCaller,
  revokeEnterpriseStaffRoleServer,
} from './enterpriseRbacCore.ts';
import {
  FIRESTORE_COLLECTIONS,
  listNamedFirestoreDocs,
} from './firestorePersistenceBridge.ts';

function constantTimeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createEnterpriseRbacRouter(): express.Router {
  const router = express.Router();

  /**
   * GET /api/enterprise/rbac/me
   * Returns the caller's verified Enterprise RBAC role & permissions.
   * Returns 401 if unauthenticated, 403 if authenticated without an assigned staff role.
   */
  router.get('/me', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerFirebaseToken(req.headers);
    if (!token) {
      return res.status(401).json({
        ok: false,
        errorCode: 'unauthenticated',
        error: 'Valid Firebase ID token is required.',
      });
    }
    const caller = await resolveVerifiedEnterpriseCaller(token);
    if (!caller) {
      return res.status(403).json({
        ok: false,
        errorCode: 'no_staff_role_assigned',
        error: 'No active EVERYKR staff role is assigned to this account.',
      });
    }
    return res.status(200).json({
      ok: true,
      caller: {
        uid: caller.uid,
        email: caller.email,
        displayName: caller.displayName,
        emailVerified: caller.emailVerified,
        role: caller.role,
        department: caller.department,
        accessScope: caller.accessScope,
        assignedUniversities: caller.assignedUniversities,
        assignedDepartments: caller.assignedDepartments,
        roleVersion: caller.roleVersion,
        permissionVersion: caller.permissionVersion,
        isPrimarySuperAdmin: caller.isPrimarySuperAdmin,
        permissions: caller.permissions,
        claimsSyncNeeded: caller.claimsSyncNeeded,
      },
      supportedRoles: ALL_ENTERPRISE_ROLES,
      primarySuperAdminProtected: true,
    });
  });

  /**
   * GET /api/enterprise/rbac/staff
   * Lists staff role assignments from EVERYKR's named Firestore database.
   */
  router.get('/staff', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerFirebaseToken(req.headers);
    if (!token) {
      return res.status(401).json({ ok: false, errorCode: 'unauthenticated', error: 'Authentication required.' });
    }
    const caller = await resolveVerifiedEnterpriseCaller(token);
    if (!caller || (!hasEnterprisePermission(caller, 'roles.view_directory') && !isCanonicalAdminRole(caller.role))) {
      return res.status(403).json({ ok: false, errorCode: 'forbidden', error: 'Insufficient permissions to view staff directory.' });
    }
    const staff =
      (await listNamedFirestoreDocs<StaffRoleAssignment>(FIRESTORE_COLLECTIONS.staffRoles, {
        orderByField: 'updatedAt',
        direction: 'desc',
        limitCount: 250,
      })) || [];
    return res.status(200).json({ ok: true, staff });
  });

  /**
   * GET /api/enterprise/rbac/history
   * Returns immutable staff role change audit history.
   */
  router.get('/history', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerFirebaseToken(req.headers);
    if (!token) {
      return res.status(401).json({ ok: false, errorCode: 'unauthenticated', error: 'Authentication required.' });
    }
    const caller = await resolveVerifiedEnterpriseCaller(token);
    if (
      !caller ||
      (!hasEnterprisePermission(caller, 'audit.read_all') &&
        !hasEnterprisePermission(caller, 'roles.manage_all'))
    ) {
      return res.status(403).json({ ok: false, errorCode: 'forbidden', error: 'Insufficient permissions to view role audit history.' });
    }
    const history =
      (await listNamedFirestoreDocs<StaffRoleHistoryEvent>(FIRESTORE_COLLECTIONS.staffRoleHistory, {
        orderByField: 'timestamp',
        direction: 'desc',
        limitCount: 200,
      })) || [];
    return res.status(200).json({ ok: true, history });
  });

  /**
   * POST /api/enterprise/rbac/lookup
   * Looks up a registered Firebase Auth user by email via Firebase Admin SDK.
   */
  router.post('/lookup', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerFirebaseToken(req.headers);
    if (!token) {
      return res.status(401).json({ ok: false, errorCode: 'unauthenticated', error: 'Authentication required.' });
    }
    const caller = await resolveVerifiedEnterpriseCaller(token);
    if (
      !caller ||
      (!hasEnterprisePermission(caller, 'roles.manage_all') &&
        !hasEnterprisePermission(caller, 'roles.manage_department_staff'))
    ) {
      return res.status(403).json({ ok: false, errorCode: 'forbidden', error: 'Role management permission required.' });
    }
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ ok: false, errorCode: 'invalid_email', error: 'Email is required.' });
    }
    const result = await lookupFirebaseAuthUserByEmail(email);
    if (result.iamUnavailable) {
      return res.status(503).json({
        ok: false,
        errorCode: 'firebase_auth_admin_unavailable',
        error: result.iamMessage || 'Firebase Auth Admin lookup requires roles/firebaseauth.admin.',
      });
    }
    if (!result.found || !result.user) {
      return res.status(404).json({ ok: false, errorCode: 'user_not_found', error: 'No Firebase Auth account found for that email.' });
    }
    return res.status(200).json({ ok: true, user: result.user });
  });

  /**
   * POST /api/enterprise/rbac/assign
   * Assigns or updates a staff role, merges Firebase Auth custom claims while preserving
   * all unrelated claims, and records an immutable audit history entry.
   */
  router.post('/assign', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerFirebaseToken(req.headers);
    if (!token) {
      return res.status(401).json({ ok: false, errorCode: 'unauthenticated', error: 'Authentication required.' });
    }
    const caller = await resolveVerifiedEnterpriseCaller(token);
    if (
      !caller ||
      (!hasEnterprisePermission(caller, 'roles.manage_all') &&
        !hasEnterprisePermission(caller, 'roles.manage_department_staff'))
    ) {
      return res.status(403).json({ ok: false, errorCode: 'forbidden', error: 'Role assignment permission required.' });
    }

    const targetEmail = String(req.body?.email || '').trim().toLowerCase();
    const targetRole = req.body?.role;
    if (!targetEmail || !isValidEnterpriseRole(targetRole)) {
      return res.status(400).json({
        ok: false,
        errorCode: 'invalid_payload',
        error: `Valid email and role (${ALL_ENTERPRISE_ROLES.join(', ')}) are required.`,
      });
    }

    const result = await assignEnterpriseStaffRoleServer({
      actor: caller,
      targetEmail,
      targetRole: targetRole as EnterpriseRole,
      department: req.body?.department as EnterpriseDepartmentId | undefined,
      accessScope: req.body?.accessScope as EnterpriseAccessScope | undefined,
      assignedUniversities: Array.isArray(req.body?.assignedUniversities)
        ? req.body.assignedUniversities
        : undefined,
      assignedDepartments: Array.isArray(req.body?.assignedDepartments)
        ? req.body.assignedDepartments
        : undefined,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined,
    });

    return res.status(result.httpStatus).json(result);
  });

  /**
   * POST /api/enterprise/rbac/revoke
   * Revokes a staff role, preserving unrelated custom claims and protecting Primary Super Admin.
   */
  router.post('/revoke', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerFirebaseToken(req.headers);
    if (!token) {
      return res.status(401).json({ ok: false, errorCode: 'unauthenticated', error: 'Authentication required.' });
    }
    const caller = await resolveVerifiedEnterpriseCaller(token);
    if (
      !caller ||
      (!hasEnterprisePermission(caller, 'roles.manage_all') &&
        !hasEnterprisePermission(caller, 'roles.manage_department_staff'))
    ) {
      return res.status(403).json({ ok: false, errorCode: 'forbidden', error: 'Role revocation permission required.' });
    }

    const targetUid = String(req.body?.uid || '').trim();
    const targetEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!targetUid || !targetEmail) {
      return res.status(400).json({ ok: false, errorCode: 'invalid_payload', error: 'Target uid and email are required.' });
    }

    const result = await revokeEnterpriseStaffRoleServer({
      actor: caller,
      targetUid,
      targetEmail,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined,
    });

    return res.status(result.httpStatus).json(result);
  });

  /**
   * POST /api/enterprise/rbac/bootstrap-super-admin
   * Explicit, audited bootstrap route for syncing `super_admin` custom claims onto
   * Primary Super Admin (`mzhmd924@gmail.com`). Requires either an existing verified
   * `super_admin` caller OR a valid server-configured `EVERYKR_BOOTSTRAP_SECRET` header.
   */
  router.post('/bootstrap-super-admin', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractBearerFirebaseToken(req.headers);
    const caller = token ? await resolveVerifiedEnterpriseCaller(token) : null;
    const isVerifiedSuperAdmin = caller?.role === 'super_admin';

    const configuredBootstrapSecret = String(process.env.EVERYKR_BOOTSTRAP_SECRET || '').trim();
    const providedBootstrapSecret =
      typeof req.headers['x-everykr-bootstrap-token'] === 'string'
        ? req.headers['x-everykr-bootstrap-token'].trim()
        : '';
    const hasValidBootstrapSecret =
      configuredBootstrapSecret.length >= 24 &&
      providedBootstrapSecret.length >= 24 &&
      constantTimeStringEqual(configuredBootstrapSecret, providedBootstrapSecret);

    if (!isVerifiedSuperAdmin && !hasValidBootstrapSecret) {
      return res.status(403).json({
        ok: false,
        errorCode: 'bootstrap_forbidden',
        error: `Explicit Super Admin authorization or configured bootstrap token is required to sync ${PRIMARY_SUPER_ADMIN_EMAIL}.`,
      });
    }

    const dryRun = req.body?.dryRun === true;
    const result = await bootstrapPrimarySuperAdminServer({ dryRun });
    return res.status(result.ok ? 200 : 503).json(result);
  });

  return router;
}
