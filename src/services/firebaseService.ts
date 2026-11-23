import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc as rawFirestoreSetDoc,
  addDoc as rawFirestoreAddDoc,
  updateDoc as rawFirestoreUpdateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  verifyPasswordResetCode,
  User as FirebaseUser
} from 'firebase/auth';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import {
  auth,
  db,
  storage,
  googleAuthProvider,
  ensureFirebaseAuthInitialized,
  getEveryKrPasswordResetActionCodeSettings,
  handleFirestoreError,
  OperationType,
  withTimeout,
  sanitizeFirestorePayload
} from '../lib/firebase';
import { saveLastRequestedResetEmailInSession } from './passwordResetClient';
import {
  University,
  JobListing,
  AccommodationListing,
  AccommodationApprovalStatus,
  AccommodationAvailabilityStatus,
  AccommodationInquiry,
  SimApplicationRecord,
  SimApplicationStatus,
  SimApplicationAirport,
  CommunityPost,
  MarketplaceItem,
  UserProfile,
  UserRole,
  AccountType,
  AuditLogEntry,
  LoginLogEntry,
  AdminLogEntry,
  RegistrationLogEntry,
  DataPrivacyRequestEntry,
  OtpVerificationMetadataEntry,
  StudentDocumentCategory,
  StudentDocumentUploadStatus,
  StudentDocumentVerificationStatus,
  StudentDocumentRecord,
  UniversityApplicationStatus,
  UniversityApplicationStatusHistoryItem,
  UniversityApplicationRecord,
  StaffRoleType,
  StaffPermissionKey,
  StaffMemberRecord,
  InternalAccessRequestRecord,
  GlobalTrashItem,
  GlobalTrashRecordType,
  AdminManagedProgramRecord,
  AdminPlatformNotification,
  CmsAnnouncementRecord,
  StudentNotification
} from '../types';
import * as XLSX from 'xlsx';
import { calculateProfileCompletion } from '../data/countriesData';
import {
  UNIVERSITIES as INITIAL_UNIVERSITIES,
  JOBS as INITIAL_JOBS,
  ACCOMMODATIONS as INITIAL_ACCOMMODATIONS,
  COMMUNITY_POSTS as INITIAL_POSTS,
  MARKETPLACE_ITEMS as INITIAL_MARKETPLACE
} from '../data/mockData';
import {
  MASTER_UNIVERSITIES,
  sortUniversitiesWithPriorityFirst,
} from '../data/universitiesMaster';
import {
  APPROVED_25_IDS,
  RELATIONAL_TABLES_25,
  RelationalAdmissionDeadlineRecord,
  RelationalUniversityProgramRow,
  RelationalTuitionFeeRow,
  RelationalAdmissionRequirementRow,
  RelationalLanguageRequirementRow,
  RelationalApplicationDocumentRow,
  RelationalScholarshipRow,
  RelationalUniversitySourceRow,
  RelationalUniversityVerificationLogRow,
  RelationalUniversityOverrides,
  applyDeadlinesOverrideToUniversity,
  applyRelationalOverridesToUniversity,
  bundleToUniversity,
} from '../data/universities25';
import {
  evaluateUniversityPublicationGate,
  getUniversityStrictStatus
} from '../utils/universityVerification';

// ----------------------------------------------------
// Safe Firestore Write Wrappers (Never pass `undefined` to setDoc / addDoc / updateDoc)
// ----------------------------------------------------

async function setDoc(reference: any, data: any, options?: any): Promise<void> {
  const sanitized = sanitizeFirestorePayload(data);
  if (options !== undefined) {
    await rawFirestoreSetDoc(reference, sanitized, options);
  } else {
    await rawFirestoreSetDoc(reference, sanitized);
  }
}

async function addDoc(reference: any, data: any): Promise<any> {
  const sanitized = sanitizeFirestorePayload(data);
  return await rawFirestoreAddDoc(reference, sanitized);
}

async function updateDoc(reference: any, data: any): Promise<void> {
  const sanitized = sanitizeFirestorePayload(data);
  await rawFirestoreUpdateDoc(reference, sanitized);
}

// ----------------------------------------------------
// Authentication & User Profile Services (Strict Per-UID Isolation)
// ----------------------------------------------------

const SERVER_SESSION_TOKEN_KEY = 'everykr_session_token_v3';
const PENDING_AUTH_ROLE_KEY = 'everykr_pending_auth_role_v1';

// Immediately purge any legacy insecure localStorage session flags on module load
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('everykr_active_session_uid_v2');
    sessionStorage.removeItem('everykr_active_session_uid_v2');
    localStorage.removeItem('everykr_user');
    localStorage.removeItem('currentUser');
  }
} catch {
  // ignore
}

export function setPendingAuthRole(role: UserRole | null): void {
  try {
    if (role && role !== 'admin') {
      sessionStorage.setItem(PENDING_AUTH_ROLE_KEY, role);
    } else {
      sessionStorage.removeItem(PENDING_AUTH_ROLE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function consumePendingAuthRole(): UserRole | null {
  try {
    const raw = sessionStorage.getItem(PENDING_AUTH_ROLE_KEY) as UserRole | null;
    sessionStorage.removeItem(PENDING_AUTH_ROLE_KEY);
    if (
      raw &&
      ['student', 'general', 'agent', 'employer', 'landlord', 'university'].includes(raw)
    ) {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generates a unique, deterministic UID for an email address when using email/password auth
 * Ensures User A, User B, and User C always receive distinct, collision-free UIDs.
 */
export function deriveUniqueUidFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  const hex = ((hash1 >>> 0).toString(16) + (hash2 >>> 0).toString(16)).padStart(16, '0');
  const cleanPrefix = normalized.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user';
  return `uid_${cleanPrefix}_${hex}`;
}

/**
 * Generates a unique, human-readable Registration ID (e.g. EKR-STU-2026-9A4F12 or EKR-GEN-2026-4D81B3).
 */
export function generateRegistrationId(
  uid: string,
  role?: string,
  createdAt?: string,
  existingRegId?: string
): string {
  if (existingRegId && /^EKR-[A-Z]{3}-\d{4}-[A-Z0-9]{6}$/.test(existingRegId.trim())) {
    return existingRegId.trim();
  }
  const roleMap: Record<string, string> = {
    student: 'STU',
    general: 'GEN',
    agent: 'AGT',
    employer: 'EMP',
    landlord: 'HSG',
    university: 'UNI',
    admin: 'ADM'
  };
  const prefix = roleMap[String(role || 'student').toLowerCase()] || 'USR';
  const year =
    createdAt && !isNaN(new Date(createdAt).getTime())
      ? new Date(createdAt).getUTCFullYear()
      : new Date().getUTCFullYear();

  const source = String(uid || 'everykr');
  let h1 = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    h1 ^= source.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  const code = ((h1 >>> 0).toString(16).toUpperCase() + 'A9F4C2').slice(0, 6);
  return `EKR-${prefix}-${year}-${code}`;
}

export function getServerSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SERVER_SESSION_TOKEN_KEY) || localStorage.getItem(SERVER_SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setServerSessionToken(token: string | null): void {
  try {
    localStorage.removeItem('everykr_active_session_uid_v2');
    sessionStorage.removeItem('everykr_active_session_uid_v2');
    localStorage.removeItem('everykr_user');
    localStorage.removeItem('currentUser');
    if (token && token.includes('.')) {
      sessionStorage.setItem(SERVER_SESSION_TOKEN_KEY, token);
      localStorage.setItem(SERVER_SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SERVER_SESSION_TOKEN_KEY);
      localStorage.removeItem(SERVER_SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

let authSessionEpoch = 0;
let logoutInProgressFlag = false;

export function getAuthSessionEpoch(): number {
  return authSessionEpoch;
}

export function bumpAuthSessionEpoch(): number {
  authSessionEpoch += 1;
  return authSessionEpoch;
}

export function isLogoutInProgress(): boolean {
  return logoutInProgressFlag;
}

export function beginAtomicLogout(): number {
  logoutInProgressFlag = true;
  authSessionEpoch += 1;
  clearAllAuthSessionStorage();
  return authSessionEpoch;
}

export function finishAtomicLogout(): void {
  logoutInProgressFlag = false;
}

export function clearAllAuthSessionStorage(): void {
  setServerSessionToken(null);
  try {
    sessionStorage.removeItem(PENDING_AUTH_ROLE_KEY);
    sessionStorage.removeItem('everykr_pending_redirect_flow_v1');
  } catch {
    // ignore
  }
}

export async function performFirebaseSignOut(): Promise<void> {
  const prevToken = getServerSessionToken();
  beginAtomicLogout();
  try {
    if (prevToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${prevToken}`
        },
        body: JSON.stringify({ sessionToken: prevToken })
      }).catch(() => {});
    }
    await signOut(auth);
  } finally {
    clearAllAuthSessionStorage();
    finishAtomicLogout();
  }
}

/**
 * Retrieves an authenticated user's real display name in strict priority order:
 * 1. Firebase Auth `displayName` (or providerData displayName)
 * 2. Firestore `users/{uid}` profile (`fullName` or `name`)
 * 3. Verified session profile (`fullName` or `name`)
 * Strictly rejects empty strings, email addresses (`@`), and Firebase UIDs.
 */
export async function resolveAuthenticatedAccountDisplayName(
  profile?: Partial<UserProfile> | null
): Promise<string | null> {
  const fbUser = auth.currentUser;
  const uid = String(fbUser?.uid || profile?.uid || profile?.id || '').trim();
  const email = String(fbUser?.email || profile?.email || '').trim();

  const isCleanHumanName = (val?: string | null): string | null => {
    if (typeof val !== 'string') return null;
    const cleaned = val
      .replace(/<[^>]*>/g, '')
      .replace(/[\u0000-\u001F\u007F<>`"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned || cleaned.length > 80) return null;
    if (cleaned.includes('@')) return null;
    const lower = cleaned.toLowerCase();
    if (uid && lower === uid.toLowerCase()) return null;
    if (email && lower === email.toLowerCase()) return null;
    if (lower.startsWith('uid_') || lower.startsWith('guest_')) return null;
    if (lower === 'everykr user' || lower === 'unknown' || lower === 'null' || lower === 'undefined') {
      return null;
    }
    if (/^[A-Za-z0-9_-]{20,}$/.test(cleaned) && /\d/.test(cleaned)) {
      return null;
    }
    return cleaned;
  };

  // 1. Firebase Auth displayName first
  const authDisplay =
    isCleanHumanName(fbUser?.displayName) ||
    isCleanHumanName(fbUser?.providerData?.find((p) => p?.displayName)?.displayName);
  if (authDisplay) return authDisplay;

  // 2. Existing Firestore user profile (`users/{uid}`) if Firebase Auth user is signed in
  if (fbUser && uid) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'users', uid)), 2500, 'Profile name lookup timeout');
      if (snap.exists()) {
        const data = snap.data() as Partial<UserProfile>;
        const firestoreName = isCleanHumanName(data.fullName) || isCleanHumanName(data.name);
        if (firestoreName) return firestoreName;
      }
    } catch {
      // Fall back to in-memory / cached profile below
    }
  }

  // 3. Synchronized Firestore / verified profile in memory or per-UID cache
  const profileName = isCleanHumanName(profile?.fullName) || isCleanHumanName(profile?.name);
  if (profileName) return profileName;

  if (uid) {
    const cached = getCachedProfileByUid(uid);
    const cachedName = isCleanHumanName(cached?.fullName) || isCleanHumanName(cached?.name);
    if (cachedName) return cachedName;
  }

  return null;
}

export function getActiveSessionUid(): string | null {
  // Never trust a raw localStorage UID flag to grant login access
  try {
    localStorage.removeItem('everykr_active_session_uid_v2');
    sessionStorage.removeItem('everykr_active_session_uid_v2');
    localStorage.removeItem('everykr_user');
    localStorage.removeItem('currentUser');
  } catch {
    // ignore
  }
  return auth.currentUser?.uid || null;
}

export function setActiveSessionUid(_uid: string | null): void {
  try {
    localStorage.removeItem('everykr_active_session_uid_v2');
    sessionStorage.removeItem('everykr_active_session_uid_v2');
    if (!_uid) {
      setServerSessionToken(null);
    }
  } catch {
    // ignore storage errors
  }
}

export function getAdminRequestHeaders(adminUser?: Partial<UserProfile> | null): Record<string, string> {
  let token = getServerSessionToken();
  if (!token) {
    try {
      token =
        sessionStorage.getItem('everykr_internal_portal_token_v1') ||
        localStorage.getItem('everykr_internal_portal_token_v1');
    } catch {
      token = null;
    }
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}`, 'x-session-token': token } : {}),
    'x-admin-uid': String(adminUser?.id || adminUser?.uid || auth.currentUser?.uid || ''),
    'x-admin-name': String(adminUser?.fullName || adminUser?.name || auth.currentUser?.displayName || ''),
    'x-admin-email': String(adminUser?.email || auth.currentUser?.email || '')
  };
}

export async function getVerifiedAdminRequestHeaders(
  adminUser?: Partial<UserProfile> | null,
  withJson = false
): Promise<Record<string, string>> {
  const base = getAdminRequestHeaders(adminUser);
  if (!withJson) {
    delete base['Content-Type'];
  }
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        base['x-firebase-id-token'] = idToken;
        if (!base.Authorization) {
          base.Authorization = `Bearer ${idToken}`;
        }
      }
    } catch {
      // Fall back to existing session token headers if getIdToken fails
    }
  }
  return base;
}

/**
 * Verifies the current authentication session with the backend server and/or Firebase Auth ID token.
 * Never trusts local storage flags, and aborts cleanly if a logout occurred while the request was in flight.
 */
export async function verifyActiveAuthSession(fbUser?: FirebaseUser | null): Promise<{
  authenticated: boolean;
  user: UserProfile | null;
  isAdmin: boolean;
}> {
  if (logoutInProgressFlag) {
    return { authenticated: false, user: null, isAdmin: false };
  }

  const epochAtStart = authSessionEpoch;
  const sessionToken = getServerSessionToken();
  let firebaseIdToken: string | undefined;

  if (fbUser) {
    try {
      firebaseIdToken = await fbUser.getIdToken();
    } catch {
      firebaseIdToken = undefined;
    }
  }

  if (logoutInProgressFlag || epochAtStart !== authSessionEpoch) {
    return { authenticated: false, user: null, isAdmin: false };
  }

  if (!sessionToken && !firebaseIdToken) {
    clearAllAuthSessionStorage();
    return { authenticated: false, user: null, isAdmin: false };
  }

  try {
    const res = await fetch('/api/auth/verify-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
      },
      body: JSON.stringify({
        sessionToken: sessionToken || undefined,
        firebaseIdToken
      })
    });

    const data = await res.json().catch(() => null);

    // Critical race guard: if logout happened while /api/auth/verify-session was in flight, discard result
    if (logoutInProgressFlag || epochAtStart !== authSessionEpoch) {
      clearAllAuthSessionStorage();
      return { authenticated: false, user: null, isAdmin: false };
    }

    if (!res.ok || !data?.ok || !data?.user) {
      if (!fbUser) {
        clearAllAuthSessionStorage();
      }
      return { authenticated: false, user: null, isAdmin: false };
    }

    if (data.sessionToken) {
      setServerSessionToken(data.sessionToken);
    }

    const verifiedProfile: UserProfile = sanitizeFirestorePayload({
      ...data.user,
      id: data.user.uid || data.user.id,
      uid: data.user.uid || data.user.id,
      role: data.isAdmin ? 'admin' : data.user.role
    });
    saveCachedProfileByUid(verifiedProfile.id, verifiedProfile);

    return {
      authenticated: true,
      user: verifiedProfile,
      isAdmin: Boolean(data.isAdmin)
    };
  } catch {
    return { authenticated: false, user: null, isAdmin: false };
  }
}

export function getCachedProfileByUid(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`everykr_profile_${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (parsed && parsed.id === uid && parsed.email) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCachedProfileByUid(uid: string, profile: UserProfile): void {
  try {
    localStorage.setItem(`everykr_profile_${uid}`, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export async function checkIsAdminDoc(uid: string): Promise<boolean> {
  if (!uid || !auth.currentUser) return false;
  try {
    const adminSnap = await withTimeout(getDoc(doc(db, 'admins', uid)), 2500, 'Admin check timeout');
    return adminSnap.exists();
  } catch {
    return false;
  }
}

/**
 * Checks whether the currently signed-in Firebase SDK user satisfies `isAdmin()` in firestore.rules
 * using verified Firebase Auth custom claims (`super_admin` / `admin`) or the authoritative
 * `admins/{uid}` document — NEVER relying on hardcoded email allowlists.
 */
export async function isCurrentFirebaseUserAuthorizedAdmin(): Promise<boolean> {
  const fbUser = auth.currentUser;
  if (!fbUser) return false;
  try {
    const tokenResult = await fbUser.getIdTokenResult();
    const claims = tokenResult?.claims || {};
    if (
      claims.super_admin === true ||
      claims.admin === true ||
      claims.role === 'super_admin' ||
      claims.role === 'admin' ||
      claims.enterpriseRole === 'super_admin' ||
      claims.enterpriseRole === 'admin'
    ) {
      return true;
    }
  } catch {
    // Fall through to authoritative admins/{uid} check
  }
  return checkIsAdminDoc(fbUser.uid);
}

// Tracks in-flight manual authentication/registration flows so onAuthStateChanged does not race with bare profile syncs
let manualAuthSyncDepth = 0;
const pendingRegistrationByEmail = new Map<
  string,
  {
    name: string;
    role: UserRole;
    authProvider: 'email_otp' | 'google' | 'password';
    createdAt: string;
    registrationPayload?: ExtendedRegistrationPayload;
  }
>();
const recentLoginLogTimestampByUid = new Map<string, number>();

export function isManualAuthSyncInProgress(): boolean {
  return manualAuthSyncDepth > 0;
}

/**
 * Helper to resolve a safe, non-empty user name from registration form state, profile overrides,
 * cached profile, Firebase Auth user, or email address. Never returns undefined or empty string.
 */
export function resolveSafeUserName(params: {
  userName?: string | null;
  fullName?: string | null;
  name?: string | null;
  studentName?: string | null;
  uid?: string | null;
  email?: string | null;
}): string {
  const candidates = [
    params.userName,
    params.fullName,
    params.name,
    params.studentName
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const cleanEmail = (params.email || auth.currentUser?.email || '').trim().toLowerCase();
  if (cleanEmail && pendingRegistrationByEmail.has(cleanEmail)) {
    const pendingName = pendingRegistrationByEmail.get(cleanEmail)?.name?.trim();
    if (pendingName) return pendingName;
  }

  if (params.uid) {
    const cached = getCachedProfileByUid(params.uid);
    const cachedName = (cached?.fullName || cached?.name || '').trim();
    if (cachedName) return cachedName;
  }

  const fbDisplayName = (auth.currentUser?.displayName || '').trim();
  if (fbDisplayName) return fbDisplayName;

  if (cleanEmail && cleanEmail.includes('@')) {
    const derivedFromEmail = cleanEmail
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    if (derivedFromEmail) return derivedFromEmail;
  }

  return 'EveryKR User';
}

/**
 * Records a login attempt in both the backend (trusted server timestamp) and Firestore `login_logs` collection.
 * Never stores passwords, auth tokens, plaintext OTPs, or `undefined` fields.
 * Never throws or interrupts OTP verification / user registration if Firestore logging fails.
 */
export async function recordLoginLogDoc(params: {
  uid: string;
  email: string;
  userName?: string;
  fullName?: string;
  name?: string;
  studentName?: string;
  provider: 'google' | 'email_otp' | 'password';
  success: boolean;
  reason?: string;
}): Promise<LoginLogEntry> {
  const safeUid = (params.uid || auth.currentUser?.uid || 'unauthenticated').trim() || 'unauthenticated';
  const safeEmail =
    (params.email || auth.currentUser?.email || 'unknown@everykr.com').trim().toLowerCase() ||
    'unknown@everykr.com';
  const safeUserName = resolveSafeUserName({
    userName: params.userName,
    fullName: params.fullName,
    name: params.name,
    studentName: params.studentName,
    uid: safeUid,
    email: safeEmail
  });
  const safeProvider: 'google' | 'email_otp' | 'password' =
    params.provider === 'google' || params.provider === 'password' ? params.provider : 'email_otp';
  const safeSuccess = Boolean(params.success);
  const safeReason =
    (params.reason || '').trim() ||
    (safeSuccess ? 'Authenticated successfully' : 'Authentication failed');

  let trustedTimestamp = new Date().toISOString();
  let logId = `llog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Deduplicate rapid identical success login_logs within 2.5s for the same UID
  if (safeSuccess) {
    const lastTs = recentLoginLogTimestampByUid.get(safeUid) || 0;
    const nowMs = Date.now();
    if (nowMs - lastTs < 2500) {
      return {
        id: logId,
        uid: safeUid,
        email: safeEmail,
        userName: safeUserName,
        timestamp: trustedTimestamp,
        provider: safeProvider,
        success: safeSuccess,
        status: 'success',
        reason: safeReason
      };
    }
    recentLoginLogTimestampByUid.set(safeUid, nowMs);
  }

  try {
    const res = await fetch('/api/users/login-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: safeUid,
        email: safeEmail,
        userName: safeUserName,
        provider: safeProvider,
        success: safeSuccess,
        reason: safeReason
      })
    });
    const data = await res.json().catch(() => null);
    if (data?.ok && data.loginLog) {
      trustedTimestamp = String(data.loginLog.timestamp || trustedTimestamp);
      logId = String(data.loginLog.id || logId);
    }
  } catch {
    // Fallback to client ISO if offline; Firestore write below still uses serverTimestamp()
  }

  const entry: LoginLogEntry = sanitizeFirestorePayload({
    id: String(logId),
    uid: String(safeUid),
    email: String(safeEmail),
    userName: String(safeUserName || 'EveryKR User'),
    timestamp: String(trustedTimestamp),
    provider: safeProvider,
    success: Boolean(safeSuccess),
    status: safeSuccess ? 'success' : 'failure',
    reason: String(safeReason)
  });

  try {
    await withTimeout(
      setDoc(
        doc(db, 'login_logs', entry.id),
        sanitizeFirestorePayload({
          id: entry.id,
          uid: entry.uid,
          email: entry.email,
          userName: entry.userName || 'EveryKR User',
          timestamp: entry.timestamp,
          provider: entry.provider,
          success: entry.success,
          status: entry.status,
          reason: entry.reason || 'Authenticated',
          serverTimestamp: serverTimestamp()
        })
      ),
      2500
    );
  } catch (err) {
    // Non-blocking: Firestore logging errors must never interrupt OTP verification or registration
    console.warn('Non-blocking login_logs write notice:', err);
  }

  return entry;
}

export async function fetchLoginLogsDoc(): Promise<LoginLogEntry[]> {
  try {
    const q = query(collection(db, 'login_logs'), orderBy('timestamp', 'desc'));
    const snap = await withTimeout(getDocs(q), 3000);
    return snap.docs.map(d => ({ ...(d.data() as LoginLogEntry), id: d.id }));
  } catch {
    return [];
  }
}

/**
 * Records a registration event in Firestore `registration_logs`.
 */
export async function recordRegistrationLogDoc(params: {
  uid: string;
  registrationId?: string;
  email: string;
  fullName: string;
  accountType: AccountType;
  role: UserRole;
  countryOfResidence?: string;
  nationality?: string;
  authProvider: 'email_otp' | 'google' | 'password';
  status: 'active' | 'pending_approval' | 'unverified';
}): Promise<RegistrationLogEntry> {
  const nowIso = new Date().toISOString();
  const safeUid = String(params.uid || 'unauthenticated');
  const resolvedRegId = generateRegistrationId(
    safeUid,
    params.accountType || params.role,
    nowIso,
    params.registrationId
  );
  const logId = `rlog_${safeUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)}`;
  const safeName = resolveSafeUserName({
    fullName: params.fullName,
    uid: params.uid,
    email: params.email
  });
  const entry: RegistrationLogEntry = sanitizeFirestorePayload({
    id: logId,
    registrationId: resolvedRegId,
    uid: safeUid,
    email: String(params.email || '').trim().toLowerCase(),
    fullName: safeName,
    accountType: params.accountType || 'student',
    role: params.role || 'student',
    countryOfResidence: params.countryOfResidence || '',
    nationality: params.nationality || '',
    authProvider: params.authProvider || 'email_otp',
    status: params.status || 'active',
    timestamp: nowIso
  });

  try {
    await withTimeout(
      setDoc(
        doc(db, 'registration_logs', logId),
        sanitizeFirestorePayload({
          ...entry,
          serverTimestamp: serverTimestamp()
        })
      ),
      2500
    );
  } catch {
    // Non-blocking
  }

  createAdminPlatformNotificationDoc({
    type: 'new_student_registration',
    title: 'New Student Registration',
    message: `${safeName} (${entry.email}) registered from ${entry.nationality || entry.countryOfResidence || 'International'}.`,
    relatedRecordId: safeUid,
    studentId: safeUid,
    studentName: safeName
  }).catch(() => {});

  return entry;
}

export async function fetchRegistrationLogsDoc(): Promise<RegistrationLogEntry[]> {
  const merged = new Map<string, RegistrationLogEntry>();
  try {
    const res = await fetch('/api/admin/user-management', {
      headers: getAdminRequestHeaders()
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.registrationLogs)) {
        for (const item of data.registrationLogs) {
          if (item?.id) merged.set(item.id, item);
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      const q = query(collection(db, 'registration_logs'), orderBy('timestamp', 'desc'));
      const snap = await withTimeout(getDocs(q), 3000);
      snap.docs.forEach(d => {
        const entry = { ...(d.data() as RegistrationLogEntry), id: d.id };
        if (!merged.has(entry.id)) merged.set(entry.id, entry);
      });
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.timestamp || '').localeCompare(a.timestamp || '')
  );
}

/**
 * Records an administrative action in both the backend (trusted server timestamp) and Firestore `admin_logs` & `admin_activity_logs` collections.
 */
export async function recordAdminLogDoc(params: {
  adminUid: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetUid?: string;
  targetEmail?: string;
  details: string;
}): Promise<AdminLogEntry> {
  let trustedTimestamp = new Date().toISOString();
  let logId = `alog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const res = await fetch('/api/admin/logs', {
      method: 'POST',
      headers: getAdminRequestHeaders({
        id: params.adminUid,
        fullName: params.adminName,
        email: params.adminEmail
      }),
      body: JSON.stringify(params)
    });
    const data = await res.json().catch(() => null);
    if (data?.ok && data.adminLog) {
      trustedTimestamp = data.adminLog.timestamp || trustedTimestamp;
      logId = data.adminLog.id || logId;
    }
  } catch {
    // continue to Firestore write
  }

  const entry: AdminLogEntry = sanitizeFirestorePayload({
    id: logId,
    adminUid: params.adminUid,
    adminName: params.adminName || 'Administrator',
    adminEmail: params.adminEmail || 'admin@everykr.com',
    action: params.action,
    targetUid: params.targetUid || '',
    targetEmail: params.targetEmail || '',
    details: params.details || '',
    timestamp: trustedTimestamp
  });

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      await withTimeout(
        Promise.all([
          setDoc(doc(db, 'admin_logs', logId), {
            ...entry,
            adminUid: auth.currentUser?.uid || entry.adminUid,
            serverTimestamp: serverTimestamp()
          }),
          setDoc(doc(db, 'admin_activity_logs', logId), {
            ...entry,
            adminUid: auth.currentUser?.uid || entry.adminUid,
            serverTimestamp: serverTimestamp()
          })
        ]),
        2500
      );
    }
  } catch {
    // Non-blocking
  }

  return entry;
}

export async function fetchAdminLogsDoc(): Promise<AdminLogEntry[]> {
  const merged = new Map<string, AdminLogEntry>();

  try {
    const res = await fetch('/api/admin/logs', {
      headers: getAdminRequestHeaders()
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.adminLogs)) {
        for (const log of data.adminLogs) {
          if (log?.id) merged.set(log.id, log);
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      const q = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'));
      const snap = await withTimeout(getDocs(q), 3000);
      snap.docs.forEach(d => {
        const item = { ...(d.data() as AdminLogEntry), id: d.id };
        if (!merged.has(item.id)) merged.set(item.id, item);
      });
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.timestamp || '').localeCompare(a.timestamp || '')
  );
}

/**
 * Submits a user Personal Data Correction, Passport Deletion, or Account Deletion request.
 */
export async function submitDataPrivacyRequestDoc(params: {
  uid: string;
  email: string;
  fullName: string;
  requestType: 'correction' | 'data_correction' | 'passport_deletion' | 'account_deletion';
  details: string;
}): Promise<DataPrivacyRequestEntry> {
  let entry: DataPrivacyRequestEntry = {
    id: `dpr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    uid: params.uid,
    email: params.email.trim().toLowerCase(),
    fullName: resolveSafeUserName({ fullName: params.fullName, uid: params.uid, email: params.email }),
    requestType: params.requestType,
    details: params.details.trim(),
    status: params.requestType === 'passport_deletion' ? 'resolved' : 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/users/privacy-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json().catch(() => null);
    if (data?.ok && data.request) {
      entry = data.request;
    }
  } catch {
    // continue to Firestore write
  }

  if (params.requestType === 'passport_deletion') {
    const cached = getCachedProfileByUid(params.uid);
    if (cached) {
      saveCachedProfileByUid(params.uid, {
        ...cached,
        passportDetails: {
          requiredForService: false,
          consentGiven: false,
          hasEncryptedPassport: false
        }
      });
    }
    withTimeout(deleteDoc(doc(db, 'users', params.uid, 'private_sensitive', 'passport')), 2500).catch(
      () => {}
    );
  }

  try {
    await withTimeout(
      setDoc(doc(db, 'data_privacy_requests', entry.id), {
        ...entry,
        serverTimestamp: serverTimestamp()
      }),
      2500
    );
  } catch {
    // Non-blocking
  }

  return entry;
}

export async function fetchDataPrivacyRequestsDoc(): Promise<DataPrivacyRequestEntry[]> {
  try {
    const snap = await withTimeout(getDocs(collection(db, 'data_privacy_requests')), 3000);
    return snap.docs.map(d => ({ ...(d.data() as DataPrivacyRequestEntry), id: d.id }));
  } catch {
    return [];
  }
}

/**
 * Permanently deletes the current user's account and personal data (Self-Service).
 */
export async function deleteOwnUserAccountDoc(params: {
  uid: string;
  email: string;
  reason?: string;
}): Promise<boolean> {
  await fetch('/api/users/me', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  }).catch(() => {});

  try {
    localStorage.removeItem(`everykr_profile_${params.uid}`);
    localStorage.removeItem(`everykr_saved_${params.uid}`);
    localStorage.removeItem(`everykr_checklist_${params.uid}`);
    localStorage.removeItem(`everykr_apps_${params.uid}`);
    localStorage.removeItem(`everykr_reminders_${params.uid}`);
    localStorage.removeItem(`everykr_notifs_${params.uid}`);
  } catch {
    // ignore
  }

  withTimeout(
    Promise.all([
      deleteDoc(doc(db, 'users', params.uid, 'private_sensitive', 'passport')).catch(() => {}),
      deleteDoc(doc(db, 'users', params.uid)).catch(() => {})
    ]),
    2500
  ).catch(() => {});

  return true;
}

/**
 * Syncs non-sensitive OTP verification metadata to Firestore `otp_verifications` collection.
 * NEVER stores plaintext OTP codes, otpHash, or passwords.
 */
export async function syncOtpVerificationMetadataDoc(
  metadata: OtpVerificationMetadataEntry
): Promise<void> {
  const safeName = resolveSafeUserName({
    fullName: metadata.fullName,
    uid: metadata.uid,
    email: metadata.email
  });
  const safeDoc: OtpVerificationMetadataEntry = sanitizeFirestorePayload({
    id: String(metadata.id),
    uid: String(metadata.uid),
    email: String(metadata.email || '').trim().toLowerCase(),
    fullName: safeName,
    role: metadata.role || 'student',
    accountType: metadata.accountType || metadata.role || 'student',
    status: metadata.status,
    emailVerified: Boolean(metadata.emailVerified),
    attemptsUsed: Number(metadata.attemptsUsed || 0),
    maxAttempts: Number(metadata.maxAttempts || 5),
    requestedAt: metadata.requestedAt || new Date().toISOString(),
    expiresAt: metadata.expiresAt || new Date(Date.now() + 300000).toISOString(),
    ...(metadata.verifiedAt ? { verifiedAt: metadata.verifiedAt } : {}),
    ...(metadata.lastDeliveryMessageId
      ? { lastDeliveryMessageId: metadata.lastDeliveryMessageId }
      : {})
  });

  try {
    await withTimeout(
      setDoc(
        doc(db, 'otp_verifications', safeDoc.id),
        sanitizeFirestorePayload({
          ...safeDoc,
          updatedAtServer: serverTimestamp()
        }),
        { merge: true }
      ),
      2500
    );
  } catch {
    // Non-blocking: OTP metadata logging must never interrupt OTP verification
  }
}

export async function fetchOtpVerificationsDoc(): Promise<OtpVerificationMetadataEntry[]> {
  try {
    const snap = await withTimeout(getDocs(collection(db, 'otp_verifications')), 3000);
    return snap.docs.map(d => ({ ...(d.data() as OtpVerificationMetadataEntry), id: d.id }));
  } catch {
    return [];
  }
}

export interface ExtendedRegistrationPayload extends Partial<UserProfile> {
  rawPassportNumber?: string;
}

/**
 * Synchronize and normalize user profile from Firebase User to Firestore using unique Firebase Auth UID.
 * Bounded by strict timeouts so slow or offline Firestore connections NEVER freeze the login flow.
 */
export async function syncUserProfile(
  user: FirebaseUser,
  overrides?: {
    name?: string;
    role?: UserRole;
    authProvider?: 'email_otp' | 'google' | 'password';
    createdAt?: string;
    registrationPayload?: ExtendedRegistrationPayload;
    interactiveAuth?: boolean;
    authEventType?: 'interactive_login' | 'interactive_registration' | 'session_restore';
    authAttemptId?: string;
  }
): Promise<UserProfile> {
  const uid = user.uid;
  const providerProfile = user.providerData?.[0];
  const actualEmail = (user.email || providerProfile?.email || '').trim().toLowerCase();

  // Merge any in-flight registration payload if onAuthStateChanged invoked syncUserProfile without overrides
  const pendingReg = actualEmail ? pendingRegistrationByEmail.get(actualEmail) : undefined;
  const effectiveOverrides = overrides || pendingReg;
  const regPayload = effectiveOverrides?.registrationPayload;

  const isGoogleProvider =
    effectiveOverrides?.authProvider === 'google' ||
    providerProfile?.providerId === 'google.com' ||
    user.providerData?.some(p => p.providerId === 'google.com');
  const resolvedProvider: 'email_otp' | 'google' | 'password' = isGoogleProvider
    ? 'google'
    : effectiveOverrides?.authProvider || 'email_otp';

  const actualPhotoUrl = user.photoURL || providerProfile?.photoURL || '';
  const actualDisplayName = resolveSafeUserName({
    fullName: regPayload?.fullName,
    name: regPayload?.name || effectiveOverrides?.name,
    userName: user.displayName || providerProfile?.displayName,
    uid,
    email: actualEmail
  });

  const pendingRole = consumePendingAuthRole();
  const requestedRole: UserRole =
    regPayload?.accountType && regPayload.accountType !== 'admin'
      ? regPayload.accountType
      : effectiveOverrides?.role && effectiveOverrides.role !== 'admin'
      ? effectiveOverrides.role
      : pendingRole && pendingRole !== 'admin'
      ? pendingRole
      : 'student';

  const nowIso = effectiveOverrides?.createdAt || new Date().toISOString();
  const userDocRef = doc(db, 'users', uid);
  let profile: UserProfile;

  // Run Firestore user doc lookup and admin check in parallel with strict 3s timeout
  const [userSnapResult, isVerifiedAdmin] = await Promise.all([
    withTimeout(getDoc(userDocRef), 3000, 'Firestore user lookup timeout').catch(() => null),
    checkIsAdminDoc(uid)
  ]);

  const existedInFirestoreOrCache = Boolean(
    (userSnapResult && userSnapResult.exists()) || getCachedProfileByUid(uid)
  );

  if (userSnapResult && userSnapResult.exists()) {
    const existingData = userSnapResult.data() as UserProfile;
    if (existingData.accountStatus === 'suspended') {
      await recordLoginLogDoc({
        uid,
        email: actualEmail,
        userName: resolveSafeUserName({
          fullName: existingData.fullName,
          name: existingData.name,
          uid,
          email: actualEmail
        }),
        provider: resolvedProvider,
        success: false,
        reason: 'Login blocked: account is suspended'
      });
      await signOut(auth).catch(() => {});
      const suspErr: any = new Error('Your EveryKR account has been suspended by an administrator.');
      suspErr.code = 'auth/user-disabled';
      throw suspErr;
    }

    const resolvedName = resolveSafeUserName({
      fullName: regPayload?.fullName || existingData.fullName,
      name: effectiveOverrides?.name || existingData.name || actualDisplayName,
      uid,
      email: actualEmail
    });
    const resolvedPhoto = actualPhotoUrl || existingData.photoURL || existingData.avatarUrl || '';
    const finalRole: UserRole = isVerifiedAdmin
      ? 'admin'
      : effectiveOverrides?.role && effectiveOverrides.role !== 'admin'
      ? effectiveOverrides.role
      : existingData.role && existingData.role !== 'admin'
      ? existingData.role
      : requestedRole;

    profile = sanitizeFirestorePayload({
      ...existingData,
      ...(regPayload ? sanitizeFirestorePayload(regPayload) : {}),
      id: uid,
      uid,
      name: resolvedName,
      fullName: resolvedName,
      email: actualEmail || existingData.email,
      avatarUrl: resolvedPhoto,
      photoURL: resolvedPhoto,
      emailVerified: true,
      accountStatus:
        existingData.accountStatus === 'pending_approval' ||
        existingData.accountStatus === 'rejected'
          ? existingData.accountStatus
          : finalRole === 'agent' && !existingData.accountStatus
          ? 'pending_approval'
          : 'active',
      authProvider: existingData.authProvider || resolvedProvider,
      createdAt: existingData.createdAt || nowIso,
      updatedAt: nowIso,
      lastLoginAt: nowIso,
      role: finalRole,
      accountType: existingData.accountType || finalRole
    });
  } else {
    const cached = getCachedProfileByUid(uid);
    if (cached) {
      const resolvedName = resolveSafeUserName({
        fullName: regPayload?.fullName || cached.fullName,
        name: effectiveOverrides?.name || cached.name || actualDisplayName,
        uid,
        email: actualEmail
      });
      const resolvedPhoto = actualPhotoUrl || cached.photoURL || cached.avatarUrl || '';
      const finalRole: UserRole = isVerifiedAdmin
        ? 'admin'
        : effectiveOverrides?.role && effectiveOverrides.role !== 'admin'
        ? effectiveOverrides.role
        : pendingRole && pendingRole !== 'admin'
        ? pendingRole
        : cached.role;

      profile = sanitizeFirestorePayload({
        ...cached,
        ...(regPayload ? sanitizeFirestorePayload(regPayload) : {}),
        id: uid,
        uid,
        name: resolvedName,
        fullName: resolvedName,
        email: actualEmail || cached.email,
        avatarUrl: resolvedPhoto,
        photoURL: resolvedPhoto,
        emailVerified: true,
        accountStatus:
          cached.accountStatus === 'pending_approval' || cached.accountStatus === 'rejected'
            ? cached.accountStatus
            : finalRole === 'agent'
            ? 'pending_approval'
            : 'active',
        authProvider: cached.authProvider || resolvedProvider,
        createdAt: cached.createdAt || nowIso,
        updatedAt: nowIso,
        lastLoginAt: nowIso,
        role: finalRole,
        accountType: cached.accountType || finalRole
      });
    } else {
      const finalRole: UserRole = isVerifiedAdmin ? 'admin' : requestedRole;
      profile = sanitizeFirestorePayload({
        id: uid,
        uid,
        name: actualDisplayName,
        fullName: actualDisplayName,
        email: actualEmail,
        role: finalRole,
        accountType: finalRole,
        nationality: regPayload?.nationality || '',
        countryOfResidence: regPayload?.countryOfResidence || '',
        phoneNumber: regPayload?.phoneNumber || '',
        countryCode: regPayload?.countryCode || '+82',
        currentCity: regPayload?.currentCity || regPayload?.city || 'Seoul',
        city: regPayload?.city || regPayload?.currentCity || 'Seoul',
        dateOfBirth: regPayload?.dateOfBirth || '',
        gender: regPayload?.gender || '',
        ...(regPayload?.passportDetails ? { passportDetails: regPayload.passportDetails } : {}),
        educationRecords: regPayload?.educationRecords || [],
        ...(regPayload?.studentAcademicProfile
          ? { studentAcademicProfile: regPayload.studentAcademicProfile }
          : {}),
        ...(regPayload?.generalUserProfile
          ? { generalUserProfile: regPayload.generalUserProfile }
          : {}),
        ...(regPayload?.agentPartnerProfile
          ? { agentPartnerProfile: regPayload.agentPartnerProfile }
          : {}),
        preferredStudyLevel: regPayload?.preferredStudyLevel || '',
        preferredIntake: regPayload?.preferredIntake || '',
        preferredUniversity: regPayload?.preferredUniversity || '',
        university: regPayload?.university || regPayload?.preferredUniversity || '',
        studyLevel: regPayload?.studyLevel || regPayload?.preferredStudyLevel || '',
        preferredLanguage: regPayload?.preferredLanguage || 'en',
        visaType: finalRole === 'student' ? 'D-2 Student Visa' : '',
        avatarUrl: actualPhotoUrl,
        photoURL: actualPhotoUrl,
        emailVerified: true,
        accountStatus: finalRole === 'agent' ? 'pending_approval' : 'active',
        ...(regPayload?.privacyConsent ? { privacyConsent: regPayload.privacyConsent } : {}),
        authProvider: resolvedProvider,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastLoginAt: nowIso
      });
    }
  }

  delete (profile as any).rawPassportNumber;
  profile.registrationId = generateRegistrationId(
    uid,
    profile.accountType || profile.role,
    profile.createdAt || nowIso,
    profile.registrationId || regPayload?.registrationId
  );
  if (profile.studentAcademicProfile) {
    const resolvedProgram =
      profile.studentAcademicProfile.interestedProgram ||
      profile.interestedProgram ||
      profile.studentAcademicProfile.currentMajor ||
      profile.major ||
      profile.studentAcademicProfile.desiredStudyLevel ||
      profile.preferredStudyLevel ||
      '';
    profile.studentAcademicProfile.interestedProgram = resolvedProgram;
    profile.interestedProgram = resolvedProgram;
  }
  profile.profileCompletionPercentage = calculateProfileCompletion(profile).percentage;

  // Sync with server-side centralized user management store for trusted timestamps, passport encryption & suspension check
  try {
    const firebaseIdToken = await user.getIdToken().catch(() => undefined);
    const resolvedAuthEventType: 'interactive_login' | 'interactive_registration' | 'session_restore' =
      overrides?.authEventType
        ? overrides.authEventType
        : overrides?.interactiveAuth
        ? existedInFirestoreOrCache
          ? 'interactive_login'
          : 'interactive_registration'
        : 'session_restore';

    const syncRes = await fetch('/api/users/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getServerSessionToken() ? { Authorization: `Bearer ${getServerSessionToken()}` } : {})
      },
      body: JSON.stringify({
        ...profile,
        uid,
        fullName: profile.fullName || profile.name || actualDisplayName,
        name: profile.name || profile.fullName || actualDisplayName,
        email: profile.email,
        role: profile.role,
        accountType: profile.accountType || profile.role,
        photoURL: profile.photoURL || profile.avatarUrl || '',
        authProvider: profile.authProvider || resolvedProvider,
        emailVerified: true,
        passportDetails: regPayload?.passportDetails
          ? {
              ...regPayload.passportDetails,
              passportNumber: regPayload.rawPassportNumber
            }
          : profile.passportDetails,
        isLoginEvent: resolvedAuthEventType !== 'session_restore',
        authEventType: resolvedAuthEventType,
        authAttemptId: overrides?.authAttemptId,
        firebaseIdToken
      })
    });
    const syncData = await syncRes.json().catch(() => null);
    if (syncRes.status === 403 && syncData?.code === 'auth/user-disabled') {
      await signOut(auth).catch(() => {});
      clearAllAuthSessionStorage();
      const suspErr: any = new Error(syncData.error || 'Your EveryKR account has been suspended.');
      suspErr.code = 'auth/user-disabled';
      throw suspErr;
    }
    if (syncData?.ok && syncData.user) {
      if (syncData.sessionToken) {
        setServerSessionToken(syncData.sessionToken);
      }
      const safeSyncedName = resolveSafeUserName({
        fullName: syncData.user.fullName || profile.fullName,
        name: syncData.user.name || profile.name,
        uid,
        email: profile.email
      });
      profile = sanitizeFirestorePayload({
        ...profile,
        ...syncData.user,
        id: uid,
        uid,
        name: safeSyncedName,
        fullName: safeSyncedName,
        role: syncData.isAdmin ? 'admin' : syncData.user.role || profile.role,
        accountType: syncData.user.accountType || profile.accountType || profile.role,
        createdAt: syncData.user.createdAt || profile.createdAt,
        updatedAt: syncData.user.updatedAt || profile.updatedAt,
        lastLoginAt: syncData.user.lastLoginAt || profile.lastLoginAt,
        accountStatus: syncData.user.accountStatus || profile.accountStatus || 'active'
      });
    }
  } catch (err: any) {
    if (err?.code === 'auth/user-disabled') throw err;
  }

  // Save to per-UID local cache
  saveCachedProfileByUid(uid, profile);

  // Persist to Firestore `users/{uid}` (without any raw passport number or undefined values)
  setDoc(
    userDocRef,
    sanitizeFirestorePayload({
      ...profile,
      id: uid,
      uid,
      name: profile.name || profile.fullName || actualDisplayName,
      fullName: profile.fullName || profile.name || actualDisplayName,
      photoURL: profile.photoURL || profile.avatarUrl || '',
      authProvider: profile.authProvider || resolvedProvider,
      emailVerified: true,
      accountStatus: profile.accountStatus || 'active',
      createdAt: profile.createdAt || nowIso,
      lastLoginAt: profile.lastLoginAt || nowIso,
      updatedAt: new Date().toISOString(),
      lastLoginAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp()
    }),
    { merge: true }
  ).catch(err => {
    console.warn('Firestore user profile write queued in background:', err);
  });

  // Record login log in Firestore `login_logs` + server backend (non-blocking)
  recordLoginLogDoc({
    uid,
    email: profile.email,
    userName: profile.fullName || profile.name || actualDisplayName,
    fullName: profile.fullName,
    name: profile.name,
    provider: resolvedProvider,
    success: true,
    reason:
      resolvedProvider === 'google'
        ? 'Google OAuth sign-in verified'
        : 'Firebase Auth session verified'
  }).catch(() => {});

  return profile;
}

/**
 * Authenticate or Register a user by Email/Password with strict Firebase Authentication
 * and server-verified cryptographic password validation.
 *
 * SECURITY ENFORCEMENT:
 * - Rejects empty email or password immediately.
 * - Uses Firebase `signInWithEmailAndPassword(auth, email, password)`.
 * - Never falls back to accepting unverified/random credentials.
 * - Never creates a user automatically during login.
 */
export async function authenticateEmailUser(params: {
  email: string;
  password?: string;
  name?: string;
  role?: UserRole;
  isSignup?: boolean;
  verificationProofToken?: string;
  registrationPayload?: ExtendedRegistrationPayload;
  recaptchaToken?: string;
}): Promise<UserProfile> {
  const normalizedEmail = String(params.email || '').trim().toLowerCase();
  const rawPassword = String(params.password || '');

  // 0. Strict Input Validation: Reject empty email or empty password immediately
  if (!normalizedEmail || !rawPassword.trim()) {
    await recordLoginLogDoc({
      uid: 'unauthenticated',
      email: normalizedEmail || 'empty@everykr.com',
      provider: 'password',
      success: false,
      reason: 'Login rejected: empty email or password'
    }).catch(() => {});
    const emptyErr: any = new Error('Please enter both your email address and password.');
    emptyErr.code = 'auth/missing-credentials';
    throw emptyErr;
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(normalizedEmail)) {
    await recordLoginLogDoc({
      uid: 'unauthenticated',
      email: normalizedEmail,
      provider: 'password',
      success: false,
      reason: 'Login rejected: invalid email format'
    }).catch(() => {});
    const fmtErr: any = new Error('Please enter a valid email address.');
    fmtErr.code = 'auth/invalid-email';
    throw fmtErr;
  }

  const requestedAccountType =
    params.registrationPayload?.accountType || params.role || 'student';
  // Security: Never allow self-assignment of admin privileges
  const sanitizedRole: UserRole =
    requestedAccountType === 'admin' ? 'student' : requestedAccountType;
  const nowIso = new Date().toISOString();
  const derivedUid = deriveUniqueUidFromEmail(normalizedEmail);
  const regPayload = params.registrationPayload;
  const resolvedRegistrantName = resolveSafeUserName({
    fullName: regPayload?.fullName,
    name: regPayload?.name || params.name,
    uid: derivedUid,
    email: normalizedEmail
  });

  manualAuthSyncDepth++;
  if (params.isSignup) {
    pendingRegistrationByEmail.set(normalizedEmail, {
      name: resolvedRegistrantName,
      role: sanitizedRole,
      authProvider: 'email_otp',
      createdAt: nowIso,
      registrationPayload: regPayload
    });
  }

  try {
    // =========================================================================
    // BRANCH A: NEW ACCOUNT REGISTRATION (Requires Verified 6-Digit Email OTP)
    // =========================================================================
    if (params.isSignup) {
      if (!params.verificationProofToken) {
        await recordLoginLogDoc({
          uid: derivedUid,
          email: normalizedEmail,
          userName: resolvedRegistrantName,
          provider: 'email_otp',
          success: false,
          reason: 'Registration blocked: missing 6-digit OTP verification proof'
        }).catch(() => {});
        const err: any = new Error('Email OTP verification is required before completing registration.');
        err.code = 'auth/otp-verification-required';
        throw err;
      }

      if (rawPassword.length < 8) {
        const weakErr: any = new Error('Password must be at least 8 characters long.');
        weakErr.code = 'auth/weak-password';
        throw weakErr;
      }

      // 1. Complete verified OTP activation on the backend (stores salted scrypt password hash & creates user)
      const completeRes = await fetch('/api/auth/otp/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regPayload,
          email: normalizedEmail,
          uid: derivedUid,
          name: resolvedRegistrantName,
          fullName: resolvedRegistrantName,
          password: rawPassword,
          role: sanitizedRole,
          accountType: sanitizedRole,
          passportDetails: regPayload?.passportDetails
            ? {
                ...regPayload.passportDetails,
                passportNumber: regPayload.rawPassportNumber
              }
            : undefined,
          verificationProofToken: params.verificationProofToken,
          authProvider: 'email_otp'
        })
      });

      const completeData = await completeRes.json().catch(() => ({ ok: false }));
      if (!completeRes.ok || !completeData?.ok || !completeData?.user) {
        await recordLoginLogDoc({
          uid: derivedUid,
          email: normalizedEmail,
          userName: resolvedRegistrantName,
          provider: 'email_otp',
          success: false,
          reason: completeData?.message || 'Invalid or expired OTP verification proof'
        }).catch(() => {});
        const err: any = new Error(
          completeData?.message ||
            'OTP verification proof is invalid or expired. Please verify your email code again.'
        );
        err.code = completeData?.code || 'auth/invalid-otp-proof';
        throw err;
      }

      if (completeData.sessionToken) {
        setServerSessionToken(completeData.sessionToken);
      }

      // Also provision the Email/Password credential in Firebase Authentication so
      // Firebase sendPasswordResetEmail() and signInWithEmailAndPassword() work natively.
      let firebaseUid: string | null = null;
      try {
        const fbCred = await createUserWithEmailAndPassword(auth, normalizedEmail, rawPassword);
        firebaseUid = fbCred.user.uid;
        await updateProfile(fbCred.user, { displayName: resolvedRegistrantName }).catch(() => {});
      } catch (fbSignupErr: any) {
        if (fbSignupErr?.code === 'auth/email-already-in-use') {
          try {
            const existingCred = await signInWithEmailAndPassword(auth, normalizedEmail, rawPassword);
            firebaseUid = existingCred.user.uid;
          } catch {
            // Keep existing OTP-verified activation if user previously linked another provider
          }
        }
      }

      const resolvedUid = firebaseUid || completeData.user.uid || derivedUid;

      // Finalize verified profile from backend OTP activation response
      const activatedProfile: UserProfile = sanitizeFirestorePayload({
        ...completeData.user,
        id: resolvedUid,
        uid: resolvedUid,
        name: completeData.user.fullName || completeData.user.name || resolvedRegistrantName,
        fullName: completeData.user.fullName || completeData.user.name || resolvedRegistrantName,
        role: completeData.isAdmin ? 'admin' : completeData.user.role || sanitizedRole,
        accountType: completeData.user.accountType || sanitizedRole,
        emailVerified: true
      });
      delete (activatedProfile as any).rawPassportNumber;
      activatedProfile.profileCompletionPercentage =
        calculateProfileCompletion(activatedProfile).percentage;

      saveCachedProfileByUid(activatedProfile.id, activatedProfile);

      setDoc(
        doc(db, 'users', activatedProfile.id),
        sanitizeFirestorePayload({
          ...activatedProfile,
          updatedAtServer: serverTimestamp(),
          lastLoginAtServer: serverTimestamp()
        }),
        { merge: true }
      ).catch(() => {});

      recordRegistrationLogDoc({
        uid: activatedProfile.id,
        email: normalizedEmail,
        fullName: activatedProfile.fullName || activatedProfile.name,
        accountType: activatedProfile.accountType || activatedProfile.role,
        role: activatedProfile.role,
        countryOfResidence: activatedProfile.countryOfResidence || '',
        nationality: activatedProfile.nationality || '',
        authProvider: 'email_otp',
        status: activatedProfile.accountStatus === 'pending_approval' ? 'pending_approval' : 'active'
      }).catch(() => {});

      return activatedProfile;
    }

    // =========================================================================
    // BRANCH B: STRICT LOGIN
    // 1. Primary: Firebase Auth signInWithEmailAndPassword(auth, email, password)
    //    Ensures accounts whose password was reset via Firebase Password Reset
    //    immediately authenticate with their new password.
    // 2. Fallback: Legacy server-verified OTP account migration (only if not yet in Firebase Auth).
    // =========================================================================
    const authAttemptId = `login_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let firebaseSignInError: any = null;
    try {
      const fbCred = await signInWithEmailAndPassword(auth, normalizedEmail, rawPassword);
      let legacyOverrides: {
        name?: string;
        role?: UserRole;
        authProvider?: 'email_otp' | 'google' | 'password';
        authEventType?: 'interactive_login';
        authAttemptId?: string;
      } = {
        authProvider: 'password',
        authEventType: 'interactive_login',
        authAttemptId
      };

      // Preserve existing EveryKR profile attributes if previously stored under derivedUid
      if (fbCred.user.uid !== derivedUid) {
        const legacySnap = await withTimeout(
          getDoc(doc(db, 'users', derivedUid)),
          2500,
          'Legacy profile check timeout'
        ).catch(() => null);
        if (legacySnap && legacySnap.exists()) {
          const legacyData = legacySnap.data() as UserProfile;
          legacyOverrides = {
            name: legacyData.fullName || legacyData.name,
            role: legacyData.role !== 'admin' ? legacyData.role : 'student',
            authProvider: 'password',
            authEventType: 'interactive_login',
            authAttemptId
          };
        }
      }

      const firebaseVerifiedProfile = await syncUserProfile(fbCred.user, legacyOverrides);
      return firebaseVerifiedProfile;
    } catch (fbErr: any) {
      firebaseSignInError = fbErr;
      if (fbErr?.code === 'auth/user-disabled') {
        clearAllAuthSessionStorage();
        await signOut(auth).catch(() => {});
        const disabledErr: any = new Error(
          'Your EveryKR account has been disabled by an administrator.'
        );
        disabledErr.code = 'auth/user-disabled';
        throw disabledErr;
      }
      if (fbErr?.code === 'auth/too-many-requests') {
        const rateErr: any = new Error(
          'Too many failed sign-in attempts. Please wait a few minutes or reset your password.'
        );
        rateErr.code = 'auth/too-many-requests';
        throw rateErr;
      }
      // If wrong-password was explicitly returned, reject immediately without checking stale hashes
      if (fbErr?.code === 'auth/wrong-password') {
        clearAllAuthSessionStorage();
        await signOut(auth).catch(() => {});
        const wrongPwErr: any = new Error(
          'Incorrect email or password. Please check your credentials and try again.'
        );
        wrongPwErr.code = 'auth/wrong-password';
        throw wrongPwErr;
      }
    }

    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password: rawPassword,
        recaptchaToken: params.recaptchaToken,
        authAttemptId
      })
    });

    const loginData = await loginRes.json().catch(() => ({
      ok: false,
      code: 'auth/invalid-credential',
      error: 'Incorrect email or password. Please check your credentials and try again.'
    }));

    if (!loginRes.ok || !loginData?.ok || !loginData?.user || !loginData?.sessionToken) {
      clearAllAuthSessionStorage();
      await signOut(auth).catch(() => {});
      const rejectErr: any = new Error(
        loginData?.error || 'Incorrect email or password. Please check your credentials and try again.'
      );
      rejectErr.code = loginData?.code || firebaseSignInError?.code || 'auth/invalid-credential';
      throw rejectErr;
    }

    // If Email/Password is enabled in Firebase Auth, migrate this legacy account into Firebase Auth.
    // If Firebase reports auth/email-already-in-use, the user ALREADY exists in Firebase Auth with a
    // newer password (e.g. after a Firebase password reset), so reject the stale password!
    if (firebaseSignInError?.code !== 'auth/operation-not-allowed') {
      try {
        const migratedCred = await createUserWithEmailAndPassword(auth, normalizedEmail, rawPassword);
        const migratedName = loginData.user.fullName || loginData.user.name || '';
        if (migratedName) {
          await updateProfile(migratedCred.user, { displayName: migratedName }).catch(() => {});
        }
      } catch (migErr: any) {
        if (migErr?.code === 'auth/email-already-in-use') {
          clearAllAuthSessionStorage();
          await signOut(auth).catch(() => {});
          const stalePwErr: any = new Error(
            'Incorrect email or password. If you recently reset your password, please sign in with your new password.'
          );
          stalePwErr.code = 'auth/invalid-credential';
          throw stalePwErr;
        }
      }
    }

    setServerSessionToken(loginData.sessionToken);
    const verifiedProfile: UserProfile = sanitizeFirestorePayload({
      ...loginData.user,
      id: loginData.user.uid || loginData.user.id,
      uid: loginData.user.uid || loginData.user.id,
      name: loginData.user.fullName || loginData.user.name,
      fullName: loginData.user.fullName || loginData.user.name,
      role: loginData.isAdmin ? 'admin' : loginData.user.role,
      accountType: loginData.user.accountType || loginData.user.role,
      emailVerified: true
    });
    verifiedProfile.profileCompletionPercentage =
      calculateProfileCompletion(verifiedProfile).percentage;

    saveCachedProfileByUid(verifiedProfile.id, verifiedProfile);
    return verifiedProfile;
  } finally {
    manualAuthSyncDepth = Math.max(0, manualAuthSyncDepth - 1);
    pendingRegistrationByEmail.delete(normalizedEmail);
  }
}

export const PASSWORD_RESET_SUCCESS_MESSAGE =
  'If an account is registered with this email, password reset instructions have been sent. Please check your inbox and spam folder.';

let passwordResetInFlight = false;

function mapFirebasePasswordResetError(err: any): {
  code: string;
  status: string;
  message: string;
  cooldownSeconds?: number;
} {
  const rawCode = String(err?.code || '').trim();
  const rawMsg = String(err?.message || '');

  if (rawCode === 'auth/invalid-email' || rawMsg.includes('INVALID_EMAIL')) {
    return {
      code: 'auth/invalid-email',
      status: 'invalid_input',
      message: 'Please enter a valid email address.'
    };
  }

  if (rawCode === 'auth/missing-email' || rawMsg.includes('MISSING_EMAIL')) {
    return {
      code: 'auth/missing-email',
      status: 'invalid_input',
      message: 'Please enter your registered email address.'
    };
  }

  if (rawCode === 'auth/user-not-found' || rawMsg.includes('EMAIL_NOT_FOUND')) {
    return {
      code: 'auth/user-not-found',
      status: 'user_not_found',
      message: 'No registered account was found with this email address.'
    };
  }

  if (rawCode === 'auth/user-disabled' || rawMsg.includes('USER_DISABLED')) {
    return {
      code: 'auth/user-disabled',
      status: 'user_disabled',
      message: 'This account has been disabled. Please contact EveryKR support.'
    };
  }

  if (
    rawCode === 'auth/too-many-requests' ||
    rawMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER') ||
    rawMsg.includes('RESET_PASSWORD_EXCEED_LIMIT')
  ) {
    return {
      code: 'auth/too-many-requests',
      status: 'rate_limited',
      message: 'Too many password reset requests. Please wait a few minutes before trying again.',
      cooldownSeconds: 60
    };
  }

  if (
    rawCode === 'auth/operation-not-allowed' ||
    rawCode === 'auth/configuration-not-found' ||
    rawMsg.includes('PASSWORD_LOGIN_DISABLED') ||
    rawMsg.includes('OPERATION_NOT_ALLOWED')
  ) {
    return {
      code: 'auth/operation-not-allowed',
      status: 'configuration_error',
      message:
        'Password reset email delivery is currently disabled in Firebase Authentication configuration. Please enable Email/Password sign-in in Firebase Console (everykr > Authentication > Sign-in method > Email/Password).'
    };
  }

  if (
    rawCode === 'auth/unauthorized-continue-uri' ||
    rawCode === 'auth/invalid-continue-uri' ||
    rawCode === 'auth/missing-continue-uri'
  ) {
    return {
      code: rawCode,
      status: 'configuration_error',
      message:
        'The password reset redirect domain is not authorized in Firebase Authentication. Please verify Authorized Domains in Firebase Console.'
    };
  }

  if (
    rawCode === 'auth/network-request-failed' ||
    rawMsg.toLowerCase().includes('timed out') ||
    rawMsg.toLowerCase().includes('network')
  ) {
    return {
      code: 'auth/network-request-failed',
      status: 'network_error',
      message:
        'Network error while contacting Firebase Authentication. Please check your internet connection and try again.'
    };
  }

  return {
    code: rawCode || 'auth/reset-failed',
    status: 'firebase_error',
    message:
      'Unable to send password reset email right now due to a Firebase Authentication or email delivery configuration issue. Please try again.'
  };
}

/**
 * Verifies that Firebase Authentication has Email/Password & Password Reset enabled on the project.
 * Because Firebase Email Enumeration Protection silently returns HTTP 200 on `sendOobCode` even when
 * `PASSWORD_LOGIN_DISABLED` is active (dropping the reset email without sending), this read-only
 * check catches `PASSWORD_LOGIN_DISABLED` (`auth/operation-not-allowed`) before showing any fake success state.
 */
async function checkFirebasePasswordResetProviderEnabled(): Promise<{
  enabled: boolean;
  error?: { code: string; status: string; message: string };
}> {
  try {
    await ensureFirebaseAuthInitialized(1500);
    await withTimeout(
      verifyPasswordResetCode(auth, '__everykr_provider_config_probe__'),
      8000,
      'Firebase configuration check timed out'
    );
    return { enabled: true };
  } catch (probeErr: any) {
    const code = String(probeErr?.code || '');
    const msg = String(probeErr?.message || '');

    // invalid-action-code / expired-action-code confirms Email/Password & Password Reset ARE enabled!
    if (
      code === 'auth/invalid-action-code' ||
      code === 'auth/expired-action-code' ||
      msg.includes('INVALID_OOB_CODE') ||
      msg.includes('EXPIRED_OOB_CODE')
    ) {
      return { enabled: true };
    }

    if (
      code === 'auth/operation-not-allowed' ||
      code === 'auth/configuration-not-found' ||
      msg.includes('PASSWORD_LOGIN_DISABLED') ||
      msg.includes('OPERATION_NOT_ALLOWED')
    ) {
      return {
        enabled: false,
        error: mapFirebasePasswordResetError(probeErr)
      };
    }

    // For transient network errors, allow sendPasswordResetEmail to attempt directly and surface any real error
    return { enabled: true };
  }
}

/**
 * Requests a branded EveryKR HTML password reset email via the server-side Firebase Admin SDK
 * (`generatePasswordResetLink()`) + Resend pipeline.
 * - Validates email syntax before sending and blocks duplicate concurrent clicks.
 * - Preserves anti-enumeration, one-time Firebase reset action codes, and 1-hour expiration.
 * - Never exposes Firebase Admin credentials or API secrets to the browser.
 * - Never displays a success state if the server or email provider rejects the request.
 */
export async function requestPasswordResetClient(
  email: string,
  _recaptchaToken?: string
): Promise<{
  ok: boolean;
  code?: string;
  status: string;
  message: string;
  cooldownSeconds?: number;
  continueUrl?: string;
}> {
  if (passwordResetInFlight) {
    return {
      ok: false,
      code: 'auth/duplicate-request',
      status: 'duplicate_request',
      message: 'A password reset request is already in progress. Please wait.'
    };
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      ok: false,
      code: 'auth/missing-email',
      status: 'invalid_input',
      message: 'Please enter your registered email address.'
    };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (normalizedEmail.length > 254 || !emailRegex.test(normalizedEmail)) {
    return {
      ok: false,
      code: 'auth/invalid-email',
      status: 'invalid_input',
      message: 'Please enter a valid email address.'
    };
  }

  passwordResetInFlight = true;
  const actionCodeSettings = getEveryKrPasswordResetActionCodeSettings();

  try {
    // 1. Verify Firebase Email/Password & Password Reset provider is enabled on project `everykr`
    const providerCheck = await checkFirebasePasswordResetProviderEnabled();
    if (!providerCheck.enabled && providerCheck.error) {
      return {
        ok: false,
        code: providerCheck.error.code,
        status: providerCheck.error.status,
        message: providerCheck.error.message,
        continueUrl: actionCodeSettings.url
      };
    }

    // 2. Request server-generated Firebase Admin password reset action link + branded Resend HTML email
    const response = await withTimeout(
      fetch('/api/auth/firebase-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          continueUrl: actionCodeSettings.url
        })
      }),
      15000,
      'Password reset request timed out'
    );

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      code?: string;
      status?: string;
      message?: string;
      cooldownSeconds?: number;
      continueUrl?: string;
    } | null;

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        code: payload?.code || (response.status === 429 ? 'auth/too-many-requests' : 'auth/reset-failed'),
        status: payload?.status || (response.status === 429 ? 'rate_limited' : 'firebase_error'),
        message:
          payload?.message ||
          'Unable to send password reset email right now. Please try again shortly.',
        cooldownSeconds: payload?.cooldownSeconds,
        continueUrl: payload?.continueUrl || actionCodeSettings.url
      };
    }

    saveLastRequestedResetEmailInSession(normalizedEmail);

    return {
      ok: true,
      code: payload.code || 'auth/reset-email-sent',
      status: payload.status || 'reset_sent',
      message: payload.message || PASSWORD_RESET_SUCCESS_MESSAGE,
      cooldownSeconds: payload.cooldownSeconds || 60,
      continueUrl: payload.continueUrl || actionCodeSettings.url
    };
  } catch (err: any) {
    const mapped = mapFirebasePasswordResetError(err);
    return {
      ok: false,
      code: mapped.code,
      status: mapped.status,
      message: mapped.message,
      cooldownSeconds: mapped.cooldownSeconds,
      continueUrl: actionCodeSettings.url
    };
  } finally {
    passwordResetInFlight = false;
  }
}

export {
  verifyPasswordResetTokenClient,
  confirmPasswordResetClient,
  updateAuthenticatedUserPasswordClient,
  captureInitialResetLinkFromSearch,
  clearStoredPendingResetCode,
  saveLastRequestedResetEmailInSession,
  getLastRequestedResetEmailFromSession,
  isWellFormedOobCode,
  FIREBASE_RESET_VERIFY_TIMEOUT_MS,
  type PasswordResetVerifyStatus,
  type PasswordResetVerifyResult,
  type PasswordResetConfirmResult,
  type PasswordUpdateResult,
} from './passwordResetClient';

export async function fetchAllFirestoreUsers(): Promise<UserProfile[]> {
  const byId = new Map<string, UserProfile>();

  try {
    const res = await fetch('/api/admin/user-management', {
      headers: getAdminRequestHeaders()
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.users)) {
        for (const u of data.users) {
          const id = u?.uid || u?.id;
          if (id) {
            byId.set(id, {
              ...u,
              id,
              uid: id,
              fullName: u.fullName || u.name || id,
              name: u.name || u.fullName || id,
              photoURL: u.photoURL || u.avatarUrl || '',
              accountType: u.accountType || u.role || 'student'
            });
          }
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      const snap = await withTimeout(getDocs(collection(db, 'users')), 3000);
      snap.docs.forEach(d => {
        const data = d.data() as UserProfile;
        byId.set(d.id, {
          ...(byId.get(d.id) || {}),
          ...data,
          id: d.id,
          uid: data.uid || d.id,
          fullName: data.fullName || data.name,
          name: data.name || data.fullName || d.id,
          photoURL: data.photoURL || data.avatarUrl || '',
          accountType: data.accountType || data.role || 'student'
        });
      });
    }
  } catch {
    // ignore
  }

  return Array.from(byId.values());
}

const PENDING_REDIRECT_FLOW_KEY = 'everykr_pending_redirect_flow_v1';

function markPendingRedirectFlow(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(PENDING_REDIRECT_FLOW_KEY, String(Date.now()));
    }
  } catch {
    // ignore storage errors
  }
}

function hasPendingRedirectFlow(): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    if (window.sessionStorage.getItem(PENDING_REDIRECT_FLOW_KEY)) {
      return true;
    }
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith('firebase:pendingRedirect:')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function clearPendingRedirectFlow(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(PENDING_REDIRECT_FLOW_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Dual-Mode Google Sign-In:
 * Preserves selected registration role across both Popup and Redirect flows.
 * Automatically falls back to signInWithRedirect when popups are blocked or unsupported on mobile browsers.
 */
export async function signInWithGoogle(
  useRedirect: boolean = false,
  selectedRole?: UserRole
): Promise<UserProfile | null> {
  if (selectedRole) {
    setPendingAuthRole(selectedRole);
  }

  try {
    if (useRedirect) {
      markPendingRedirectFlow();
      await signInWithRedirect(auth, googleAuthProvider);
      return null; // Browser is navigating to Google OAuth
    }

    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      clearPendingRedirectFlow();
      return await syncUserProfile(credential.user, {
        role: selectedRole,
        authProvider: 'google',
        interactiveAuth: true,
        authAttemptId: `google_popup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      });
    } catch (popupErr: any) {
      const errCode = popupErr?.code || '';
      if (
        errCode === 'auth/popup-blocked' ||
        errCode === 'auth/operation-not-supported-in-this-environment'
      ) {
        console.warn('Popup blocked or unsupported on this browser, falling back to redirect flow...', errCode);
        markPendingRedirectFlow();
        await signInWithRedirect(auth, googleAuthProvider);
        return null;
      }
      throw popupErr;
    }
  } catch (error: any) {
    console.warn('Google Sign-In notice:', error?.code || error?.message);
    recordLoginLogDoc({
      uid: 'google_oauth_attempt',
      email: auth.currentUser?.email || 'google-oauth-visitor',
      provider: 'google',
      success: false,
      reason: `Google Sign-In failed: ${error?.code || error?.message || 'unknown'}`
    }).catch(() => {});
    throw error;
  }
}

let redirectResultPromise: Promise<UserProfile | null> | null = null;

export function checkRedirectResult(): Promise<UserProfile | null> {
  if (!hasPendingRedirectFlow()) {
    return Promise.resolve(null);
  }

  if (!redirectResultPromise) {
    redirectResultPromise = (async () => {
      try {
        const credential = await withTimeout(
          getRedirectResult(auth),
          6000,
          'Redirect result check timed out'
        );
        clearPendingRedirectFlow();
        if (credential && credential.user) {
          const savedRole = consumePendingAuthRole();
          return await syncUserProfile(credential.user, {
            role: savedRole || undefined,
            authProvider: 'google',
            interactiveAuth: true,
            authAttemptId: `google_redirect_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          });
        }
        return null;
      } catch {
        clearPendingRedirectFlow();
        return null;
      } finally {
        redirectResultPromise = null;
      }
    })();
  }
  return redirectResultPromise;
}

/**
 * Updates only the user's own permitted profile fields without creating duplicates.
 * Strictly strips `role`, `uid`, `id`, `emailVerified`, `accountStatus`, `createdAt`, and any sensitive fields
 * so users can NEVER elevate themselves to admin or spoof verification status.
 */
export async function updateUserProfileDoc(
  uid: string,
  data: Partial<UserProfile> & { rawPassportNumber?: string }
): Promise<UserProfile | null> {
  const {
    role: _strippedRole,
    id: _strippedId,
    uid: _strippedUid,
    emailVerified: _strippedVerified,
    accountStatus: _strippedStatus,
    createdAt: _strippedCreated,
    authProvider: _strippedProvider,
    rawPassportNumber,
    ...permittedFields
  } = data;

  const normalizedUpdates: Partial<UserProfile> = {
    ...permittedFields,
    updatedAt: new Date().toISOString()
  };
  if (permittedFields.name) {
    normalizedUpdates.fullName = permittedFields.name;
  } else if (permittedFields.fullName) {
    normalizedUpdates.name = permittedFields.fullName;
  }
  if (permittedFields.avatarUrl !== undefined) {
    normalizedUpdates.photoURL = permittedFields.avatarUrl;
  } else if (permittedFields.photoURL !== undefined) {
    normalizedUpdates.avatarUrl = permittedFields.photoURL;
  }
  if (permittedFields.phoneNumber && !permittedFields.phone) {
    normalizedUpdates.phone = permittedFields.phoneNumber;
  } else if (permittedFields.phone && !permittedFields.phoneNumber) {
    normalizedUpdates.phoneNumber = permittedFields.phone;
  }
  if (permittedFields.city && !permittedFields.currentCity) {
    normalizedUpdates.currentCity = permittedFields.city;
  } else if (permittedFields.currentCity && !permittedFields.city) {
    normalizedUpdates.city = permittedFields.currentCity;
  }

  let updatedProfile: UserProfile | null = null;
  const existing = getCachedProfileByUid(uid);
  if (existing) {
    const merged: UserProfile = {
      ...existing,
      ...normalizedUpdates,
      id: uid,
      uid
    };
    merged.profileCompletionPercentage = calculateProfileCompletion(merged).percentage;
    normalizedUpdates.profileCompletionPercentage = merged.profileCompletionPercentage;
    saveCachedProfileByUid(uid, merged);
    updatedProfile = merged;

    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getServerSessionToken() ? { Authorization: `Bearer ${getServerSessionToken()}` } : {})
        },
        body: JSON.stringify({
          ...merged,
          uid,
          fullName: merged.fullName || merged.name,
          name: merged.name,
          email: merged.email,
          role: merged.role,
          accountType: merged.accountType || merged.role,
          photoURL: merged.photoURL || merged.avatarUrl || '',
          authProvider: merged.authProvider,
          emailVerified: merged.emailVerified,
          passportDetails: merged.passportDetails
            ? {
                ...merged.passportDetails,
                passportNumber: rawPassportNumber
              }
            : undefined,
          isLoginEvent: false,
          allowCreate: false
        })
      });
      const syncData = await res.json().catch(() => null);
      if (syncData?.ok && syncData.user) {
        const syncedProfile: UserProfile = {
          ...merged,
          ...syncData.user,
          id: uid,
          uid
        };
        updatedProfile = syncedProfile;
        saveCachedProfileByUid(uid, syncedProfile);
      }
    } catch {
      // continue to Firestore write
    }
  }

  if (auth.currentUser && (auth.currentUser.uid === uid || (await isCurrentFirebaseUserAuthorizedAdmin()))) {
    try {
      const userDocRef = doc(db, 'users', uid);
      await withTimeout(
        setDoc(
          userDocRef,
          {
            ...(updatedProfile || normalizedUpdates),
            id: uid,
            uid,
            updatedAt: new Date().toISOString(),
            updatedAtServer: serverTimestamp()
          },
          { merge: true }
        ),
        3000
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  }

  return updatedProfile;
}

/**
 * Admin-only helper to update a user's role, accountStatus, emailVerified, or permitted profile fields.
 */
export async function adminUpdateUserDoc(params: {
  targetUid: string;
  targetEmail: string;
  targetName: string;
  updates: {
    role?: UserRole;
    accountType?: AccountType;
    accountStatus?: 'active' | 'unverified' | 'pending_approval' | 'rejected' | 'suspended';
    emailVerified?: boolean;
    fullName?: string;
    phoneNumber?: string;
    countryOfResidence?: string;
    nationality?: string;
    adminInternalNotes?: string;
  };
  adminUser: UserProfile;
}): Promise<void> {
  await fetch(`/api/admin/users/${encodeURIComponent(params.targetUid)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminRequestHeaders(params.adminUser)
    },
    body: JSON.stringify(params.updates)
  }).catch(() => {});

  const cached = getCachedProfileByUid(params.targetUid);
  if (cached) {
    saveCachedProfileByUid(params.targetUid, {
      ...cached,
      ...params.updates,
      name: params.updates.fullName || cached.name
    });
  }

  try {
    await withTimeout(
      setDoc(
        doc(db, 'users', params.targetUid),
        {
          ...params.updates,
          id: params.targetUid,
          uid: params.targetUid,
          updatedAt: new Date().toISOString(),
          updatedAtServer: serverTimestamp()
        },
        { merge: true }
      ),
      3000
    );
  } catch (err) {
    console.warn('Firestore admin user update notice:', err);
  }

  const changeSummary = Object.entries(params.updates)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  await recordAdminLogDoc({
    adminUid: params.adminUser.id,
    adminName: params.adminUser.fullName || params.adminUser.name,
    adminEmail: params.adminUser.email,
    action: params.updates.role ? 'ROLE_CHANGE' : 'ACCOUNT_STATUS_CHANGE',
    targetUid: params.targetUid,
    targetEmail: params.targetEmail,
    details: `Admin updated ${params.targetName} (${params.targetEmail}): ${changeSummary}`
  });
}

/**
 * Admin-only helper to Approve or Reject an Education Agent / Partner account.
 */
export async function adminApproveOrRejectAgentDoc(params: {
  targetUid: string;
  targetEmail: string;
  targetName: string;
  decision: 'approve' | 'reject' | 'approved' | 'rejected';
  reason?: string;
  adminUser: UserProfile;
}): Promise<UserProfile | null> {
  const isApproved = params.decision === 'approve' || params.decision === 'approved';
  let updatedUser: UserProfile | null = null;
  try {
    const res = await fetch(
      `/api/admin/users/${encodeURIComponent(params.targetUid)}/agent-approval`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminRequestHeaders(params.adminUser)
        },
        body: JSON.stringify({
          decision: isApproved ? 'approve' : 'reject',
          reason: params.reason
        })
      }
    );
    const data = await res.json().catch(() => null);
    if (data?.ok && data.user) {
      updatedUser = data.user;
    }
  } catch {
    // continue to Firestore write
  }

  const nextStatus = isApproved ? 'active' : 'rejected';
  const nowIso = new Date().toISOString();

  const cached = getCachedProfileByUid(params.targetUid);
  if (cached) {
    saveCachedProfileByUid(params.targetUid, {
      ...cached,
      accountStatus: nextStatus,
      agentPartnerProfile: cached.agentPartnerProfile
        ? {
            ...cached.agentPartnerProfile,
            approvalStatus: isApproved ? 'approved' : 'rejected',
            approvedAt: nowIso,
            approvedBy: params.adminUser.email,
            rejectionReason: params.reason
          }
        : undefined
    });
  }

  try {
    await withTimeout(
      setDoc(
        doc(db, 'users', params.targetUid),
        {
          accountStatus: nextStatus,
          ...(updatedUser?.agentPartnerProfile
            ? { agentPartnerProfile: updatedUser.agentPartnerProfile }
            : {}),
          updatedAt: nowIso,
          updatedAtServer: serverTimestamp()
        },
        { merge: true }
      ),
      3000
    );
  } catch {
    // ignore
  }

  await recordAdminLogDoc({
    adminUid: params.adminUser.id,
    adminName: params.adminUser.fullName || params.adminUser.name,
    adminEmail: params.adminUser.email,
    action: isApproved ? 'APPROVE_EDUCATION_AGENT' : 'REJECT_EDUCATION_AGENT',
    targetUid: params.targetUid,
    targetEmail: params.targetEmail,
    details: `${
      isApproved ? 'Approved' : 'Rejected'
    } Education Agent / Partner account for ${params.targetName} (${params.targetEmail})`
  });

  return updatedUser;
}

/**
 * Authorized Admin-only reveal of encrypted passport number (mandatory security audit log).
 */
export async function adminRevealEncryptedPassportDoc(params: {
  targetUid: string;
  adminUser: UserProfile;
}): Promise<{
  ok: boolean;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  issueDate?: string;
  expiryDate?: string;
  consentedAt?: string;
  message?: string;
}> {
  try {
    const res = await fetch(
      `/api/admin/users/${encodeURIComponent(params.targetUid)}/passport`,
      {
        headers: {
          ...getAdminRequestHeaders(params.adminUser)
        }
      }
    );
    return await res.json();
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || 'Unable to decrypt passport record.'
    };
  }
}

export async function adminDeleteUserDoc(params: {
  targetUid: string;
  targetEmail: string;
  targetName: string;
  adminUser: UserProfile;
}): Promise<void> {
  await fetch(`/api/admin/users/${encodeURIComponent(params.targetUid)}`, {
    method: 'DELETE',
    headers: {
      ...getAdminRequestHeaders(params.adminUser)
    }
  }).catch(() => {});

  try {
    localStorage.removeItem(`everykr_profile_${params.targetUid}`);
  } catch {
    // ignore
  }

  try {
    await withTimeout(deleteDoc(doc(db, 'users', params.targetUid)), 3000);
  } catch (err) {
    console.warn('Firestore admin user delete notice:', err);
  }

  await recordAdminLogDoc({
    adminUid: params.adminUser.id,
    adminName: params.adminUser.fullName || params.adminUser.name,
    adminEmail: params.adminUser.email,
    action: 'DELETE_USER',
    targetUid: params.targetUid,
    targetEmail: params.targetEmail,
    details: `Admin removed user record for ${params.targetName} (${params.targetEmail})`
  });
}

// ----------------------------------------------------
// Universities Service
// ----------------------------------------------------

export async function fetchUniversities(): Promise<University[]> {
  try {
    const [uniSnapRes, dlSnapRes] = await Promise.allSettled([
      getDocs(collection(db, 'universities')),
      getDocs(collection(db, 'admission_deadlines'))
    ]);

    const mergedById = new Map<string, University>(
      MASTER_UNIVERSITIES.map(u => [u.id, u])
    );

    const isSafeNonPlaceholderCampusPhoto = (val: unknown): val is string =>
      typeof val === 'string' &&
      val.trim().length > 0 &&
      !val.includes('university_campus_seoul_') &&
      !val.includes('hero_korea_students') &&
      !val.includes('images.unsplash.com') &&
      !val.includes('picsum.photos') &&
      !val.includes('placeholder');

    if (uniSnapRes.status === 'fulfilled' && !uniSnapRes.value.empty) {
      for (const d of uniSnapRes.value.docs) {
        const cloudData = d.data() as Record<string, any>;
        const isApproved25 = APPROVED_25_IDS.has(d.id);
        const baseMaster = mergedById.get(d.id);

        if (baseMaster && isApproved25) {
          if (cloudData?.schemaVersion === 'v25_relational') {
            const nextBundle = cloudData.relationalBundle || baseMaster.relationalBundle;
            const rebuilt = nextBundle ? bundleToUniversity(nextBundle) : baseMaster;
            mergedById.set(d.id, {
              ...rebuilt,
              ...cloudData,
              id: d.id,
              isApproved25: true,
              recordTier: 'approved_25',
              priorityRank: rebuilt.whitelistOrder ?? baseMaster.priorityRank,
              campusImage: isSafeNonPlaceholderCampusPhoto(cloudData.campusImage)
                ? cloudData.campusImage
                : rebuilt.campusImage,
              relationalBundle: nextBundle,
            });
          }
        } else if (baseMaster) {
          // Non-destructively merge updates onto preserved archive records without promoting unverified stock photos
          mergedById.set(d.id, {
            ...baseMaster,
            ...cloudData,
            id: d.id,
            isApproved25: Boolean(cloudData.isApproved25 === true),
            recordTier: cloudData.isApproved25 === true ? 'approved_25' : 'preserved_archive',
            priorityRank: baseMaster.priorityRank ?? 2000,
            campusImage: isSafeNonPlaceholderCampusPhoto(cloudData.campusImage)
              ? cloudData.campusImage
              : baseMaster.campusImage,
          });
        } else {
          // Preserve any additional Firestore university records without deleting or hiding them
          mergedById.set(d.id, {
            ...(cloudData as University),
            id: d.id,
            isApproved25: Boolean(cloudData.isApproved25 === true),
            recordTier: cloudData.isApproved25 === true ? 'approved_25' : 'preserved_archive',
            priorityRank: typeof cloudData.priorityRank === 'number' ? cloudData.priorityRank : 2500,
            campusImage: isSafeNonPlaceholderCampusPhoto(cloudData.campusImage)
              ? cloudData.campusImage
              : '',
          });
        }
      }
    }

    // Merge independent relational admission_deadlines overrides from Firestore
    if (dlSnapRes.status === 'fulfilled' && !dlSnapRes.value.empty) {
      const cloudDeadlinesByUni = new Map<string, Map<string, RelationalAdmissionDeadlineRecord | null>>();
      for (const dlDoc of dlSnapRes.value.docs) {
        const raw = dlDoc.data() as Record<string, any>;
        const uniId = raw.universityId as string;
        if (!uniId || !mergedById.has(uniId)) continue;
        if (!cloudDeadlinesByUni.has(uniId)) {
          cloudDeadlinesByUni.set(uniId, new Map());
        }
        if (raw._deleted === true) {
          cloudDeadlinesByUni.get(uniId)!.set(dlDoc.id, null);
        } else {
          cloudDeadlinesByUni.get(uniId)!.set(dlDoc.id, {
            ...(raw as RelationalAdmissionDeadlineRecord),
            id: dlDoc.id,
          });
        }
      }

      for (const [uniId, overridesMap] of cloudDeadlinesByUni.entries()) {
        const currentUni = mergedById.get(uniId);
        if (!currentUni?.relationalBundle) continue;
        const baseList = currentUni.relationalBundle.admissionDeadlines;
        const nextMap = new Map<string, RelationalAdmissionDeadlineRecord>(
          baseList.map(item => [item.id, item])
        );
        for (const [dlId, recordOrNull] of overridesMap.entries()) {
          if (recordOrNull === null) {
            nextMap.delete(dlId);
          } else {
            nextMap.set(dlId, recordOrNull);
          }
        }
        mergedById.set(
          uniId,
          applyDeadlinesOverrideToUniversity(currentUni, Array.from(nextMap.values()))
        );
      }
    }

    return sortUniversitiesWithPriorityFirst(Array.from(mergedById.values()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'universities');
    return MASTER_UNIVERSITIES;
  }
}

export async function saveUniversityDoc(university: University): Promise<void> {
  try {
    const gate = evaluateUniversityPublicationGate(university);
    const strictStatus = getUniversityStrictStatus(university);
    const uniRef = doc(db, 'universities', university.id);
    await setDoc(uniRef, {
      ...university,
      schemaVersion: 'v25_relational',
      adminWhitelisted25Override: !APPROVED_25_IDS.has(university.id) ? true : false,
      verified: Boolean(university.logoVerified),
      verificationStatus: university.logoVerified ? 'Verified' : 'Pending Verification',
      strictVerificationStatus: strictStatus,
      publicationGate: gate,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `universities/${university.id}`);
    throw error;
  }
}

export async function saveAdmissionDeadlineDoc(
  round: RelationalAdmissionDeadlineRecord
): Promise<void> {
  try {
    const dlRef = doc(db, 'admission_deadlines', round.id);
    await setDoc(dlRef, {
      ...round,
      _deleted: false,
      lastVerifiedDate: new Date().toISOString().split('T')[0],
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `admission_deadlines/${round.id}`);
    throw error;
  }
}

export async function deleteAdmissionDeadlineDoc(
  deadlineId: string,
  universityId: string
): Promise<void> {
  try {
    const dlRef = doc(db, 'admission_deadlines', deadlineId);
    await setDoc(dlRef, {
      id: deadlineId,
      universityId,
      _deleted: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `admission_deadlines/${deadlineId}`);
    throw error;
  }
}

export type RelationalUniversityChildCollection =
  | 'university_programs'
  | 'tuition_fees'
  | 'admission_requirements'
  | 'language_requirements'
  | 'application_documents'
  | 'scholarships'
  | 'university_sources';

export async function saveRelationalUniversityChildDoc(
  collectionName: RelationalUniversityChildCollection,
  row: { id: string; universityId: string; [key: string]: any }
): Promise<void> {
  try {
    const childRef = doc(db, collectionName, row.id);
    await setDoc(
      childRef,
      {
        ...row,
        _deleted: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${row.id}`);
    throw error;
  }
}

export async function deleteRelationalUniversityChildDoc(
  collectionName: RelationalUniversityChildCollection,
  docId: string,
  universityId: string
): Promise<void> {
  try {
    const childRef = doc(db, collectionName, docId);
    await setDoc(
      childRef,
      {
        id: docId,
        universityId,
        _deleted: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
    throw error;
  }
}

export async function createUniversityVerificationLogDoc(
  entry: RelationalUniversityVerificationLogRow
): Promise<void> {
  try {
    const logRef = doc(db, 'university_verification_logs', entry.id);
    await setDoc(logRef, entry, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `university_verification_logs/${entry.id}`);
    throw error;
  }
}

export async function syncAll15RelationalTablesToFirestore(): Promise<{
  tablesSynced: number;
  recordsSynced: number;
}> {
  const entries = Object.entries(RELATIONAL_TABLES_25) as Array<[string, Array<Record<string, any>>]>;
  let recordsSynced = 0;
  for (const [collectionName, rows] of entries) {
    for (const row of rows) {
      const docId = String(row.id);
      const payload =
        collectionName === 'universities'
          ? { ...row, schemaVersion: 'v25_relational' }
          : row;
      try {
        await setDoc(doc(db, collectionName, docId), payload, { merge: true });
        recordsSynced++;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
        throw error;
      }
    }
  }
  return { tablesSynced: entries.length, recordsSynced };
}

/**
 * Non-Destructive Preservation Guard:
 * Bulk deletion of non-25 Firestore university records is strictly disabled per Project Protection Policy.
 * Performs a read-only count without deleting or modifying any Firestore document.
 */
export async function purgeUnapprovedFirestoreUniversities(): Promise<{
  scanned: number;
  deletedCount: number;
  deletedIds: string[];
}> {
  try {
    const snap = await getDocs(collection(db, 'universities'));
    return {
      scanned: snap.size,
      deletedCount: 0,
      deletedIds: [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'universities');
    return {
      scanned: 0,
      deletedCount: 0,
      deletedIds: [],
    };
  }
}

export async function batchUpsertUniversitiesDoc(universities: University[]): Promise<number> {
  try {
    let saved = 0;
    for (const u of universities) {
      await setDoc(doc(db, 'universities', u.id), {
        ...u,
        schemaVersion: 'v25_relational',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      saved++;
    }
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'universities');
    throw error;
  }
}

export async function deleteUniversityDoc(uniId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'universities', uniId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `universities/${uniId}`);
    throw error;
  }
}

// ----------------------------------------------------
// Jobs Service
// ----------------------------------------------------

export async function fetchJobs(): Promise<JobListing[]> {
  try {
    const snap = await getDocs(collection(db, 'jobs'));
    if (snap.empty) {
      return INITIAL_JOBS;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobListing));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'jobs');
    return INITIAL_JOBS;
  }
}

export async function createJobDoc(jobData: Omit<JobListing, 'id' | 'postedDate' | 'verified'>, employerUid: string): Promise<JobListing> {
  try {
    const newJob: JobListing = {
      ...jobData,
      id: `job-${Date.now()}`,
      postedDate: new Date().toISOString().split('T')[0],
      verified: true
    };
    await setDoc(doc(db, 'jobs', newJob.id), {
      ...newJob,
      employerId: employerUid,
      createdAt: serverTimestamp()
    });
    return newJob;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'jobs');
    throw error;
  }
}

// ----------------------------------------------------
// Job Applications Service
// ----------------------------------------------------

export interface SubmittedApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  visaStatus: string;
  notes?: string;
  status: 'Submitted' | 'Under Review' | 'Interview Scheduled' | 'Accepted' | 'Rejected';
  appliedDate: string;
}

export async function submitApplicationDoc(appData: Omit<SubmittedApplication, 'id' | 'appliedDate' | 'status'>): Promise<SubmittedApplication> {
  try {
    const newApp: SubmittedApplication = {
      ...appData,
      id: `app-${Date.now()}`,
      status: 'Submitted',
      appliedDate: 'Just now'
    };

    if (auth.currentUser && auth.currentUser.uid === appData.applicantId) {
      await setDoc(doc(db, 'job_applications', newApp.id), {
        ...newApp,
        createdAt: serverTimestamp()
      });
    }

    return newApp;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'job_applications');
    throw error;
  }
}

export async function fetchUserApplications(userId: string): Promise<SubmittedApplication[]> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    return [];
  }
  try {
    const q = query(collection(db, 'job_applications'), where('applicantId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SubmittedApplication);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'job_applications');
    return [];
  }
}

// ----------------------------------------------------
// Accommodations Service (Strict Admin Approval & Public Visibility Gate)
// ----------------------------------------------------

const LOCAL_ACCOMMODATIONS_CACHE_KEY = 'everykr_accommodations_store_v2';

export function normalizeAccommodationRecord(
  raw: Partial<AccommodationListing> & Record<string, any>,
  fallbackId?: string
): AccommodationListing {
  const id = String(raw.propertyId || raw.id || fallbackId || `acc-${Date.now()}`).trim();
  const rent = Math.max(0, Number(raw.monthlyRent ?? raw.monthlyRentKRW ?? 0) || 0);
  const deposit = Math.max(0, Number(raw.securityDeposit ?? raw.depositKRW ?? 0) || 0);
  const maint = Math.max(0, Number(raw.maintenanceFeeKRW ?? 0) || 0);
  const accType = (raw.accommodationType || raw.roomType || 'One-room') as AccommodationListing['roomType'];
  const facilities = Array.isArray(raw.facilities) && raw.facilities.length > 0
    ? raw.facilities.map((x: unknown) => String(x).trim()).filter(Boolean)
    : Array.isArray(raw.amenities)
    ? raw.amenities.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];
  const photos = Array.isArray(raw.photos)
    ? raw.photos.map((p: unknown) => String(p).trim()).filter(Boolean)
    : [];
  const city = String(raw.city || 'Seoul').trim();
  const address = String(raw.address || raw.district || city).trim();
  const district = String(raw.district || raw.address || city).trim();

  const rawStatus = String(raw.approvalStatus || '').trim();
  const approvalStatus: AccommodationApprovalStatus =
    rawStatus === 'Pending' ||
    rawStatus === 'Approved' ||
    rawStatus === 'Rejected' ||
    rawStatus === 'Unavailable' ||
    rawStatus === 'Archived'
      ? rawStatus
      : raw.verified === true
      ? 'Approved'
      : 'Pending';

  const availability: AccommodationAvailabilityStatus =
    approvalStatus === 'Unavailable' || approvalStatus === 'Archived' || approvalStatus === 'Rejected'
      ? 'Unavailable'
      : raw.availability === 'Unavailable'
      ? 'Unavailable'
      : 'Available';

  const nowIso = new Date().toISOString();

  return {
    id,
    propertyId: id,
    title: String(raw.title || 'Accommodation Listing').trim(),
    description: String(raw.description || '').trim(),
    photos,
    monthlyRent: rent,
    monthlyRentKRW: rent,
    securityDeposit: deposit,
    depositKRW: deposit,
    maintenanceFeeKRW: maint,
    city,
    district,
    address,
    latitude:
      typeof raw.latitude === 'number' && !Number.isNaN(raw.latitude)
        ? raw.latitude
        : null,
    longitude:
      typeof raw.longitude === 'number' && !Number.isNaN(raw.longitude)
        ? raw.longitude
        : null,
    accommodationType: accType,
    roomType: accType,
    facilities,
    amenities: facilities,
    roomDetails: String(raw.roomDetails || '').trim(),
    availability,
    approvalStatus,
    createdBy: String(raw.createdBy || raw.landlordId || 'system-admin').trim(),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : nowIso,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso,
    approvedBy: raw.approvedBy ? String(raw.approvedBy) : null,
    approvedAt: raw.approvedAt ? String(raw.approvedAt) : null,
    rejectionReason: raw.rejectionReason ? String(raw.rejectionReason) : null,
    furnished: Boolean(raw.furnished ?? true),
    availableDate: String(raw.availableDate || 'Immediate').trim(),
    nearUniversities: Array.isArray(raw.nearUniversities)
      ? raw.nearUniversities.map((u: unknown) => String(u).trim()).filter(Boolean)
      : [],
    landlordType:
      raw.landlordType === 'Certified Agent' || raw.landlordType === 'University Dorm'
        ? raw.landlordType
        : 'Direct Owner',
    landlordPhone: String(raw.landlordPhone || '').trim(),
    contactEmail: raw.contactEmail ? String(raw.contactEmail).trim() : '',
    verified: approvalStatus === 'Approved' && availability === 'Available'
  };
}

function readLocalAccommodationsMap(): Map<string, AccommodationListing> {
  const map = new Map<string, AccommodationListing>();
  for (const seed of INITIAL_ACCOMMODATIONS) {
    const norm = normalizeAccommodationRecord(seed, seed.id);
    map.set(norm.id, norm);
  }
  try {
    const raw = localStorage.getItem(LOCAL_ACCOMMODATIONS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && (item.id || item.propertyId)) {
            const norm = normalizeAccommodationRecord(item);
            map.set(norm.id, norm);
          }
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return map;
}

function writeLocalAccommodationsMap(map: Map<string, AccommodationListing>): void {
  try {
    localStorage.setItem(
      LOCAL_ACCOMMODATIONS_CACHE_KEY,
      JSON.stringify(Array.from(map.values()))
    );
  } catch {
    // ignore storage errors
  }
}

/**
 * Compress image File to a lightweight Data URL fallback if Firebase Storage bucket rules restrict direct upload
 */
function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        try {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch {
          resolve(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an accommodation photograph to Firebase Storage (`accommodations/{propertyId}/{filename}`),
 * with automatic fallback to compressed Data URL so uploads always succeed.
 */
export async function uploadAccommodationPhoto(
  file: File,
  propertyId: string = 'draft'
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectPath = `accommodations/${propertyId}/${Date.now()}_${safeName}`;
  try {
    const fileRef = storageRef(storage, objectPath);
    const uploadResult = await withTimeout(
      uploadBytes(fileRef, file),
      6000,
      'Firebase Storage upload timeout'
    );
    const downloadUrl = await withTimeout(
      getDownloadURL(uploadResult.ref),
      4000,
      'Firebase Storage URL timeout'
    );
    return downloadUrl;
  } catch {
    return fileToCompressedDataUrl(file);
  }
}

/**
 * Public accommodation fetch: returns ONLY Approved and Available listings.
 * Never returns Pending, Rejected, Unavailable, or Archived listings.
 */
export async function fetchAccommodations(): Promise<AccommodationListing[]> {
  const merged = readLocalAccommodationsMap();

  // 1. Fetch from backend public endpoint
  try {
    const res = await fetch('/api/accommodations');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.accommodations)) {
        for (const item of data.accommodations) {
          const norm = normalizeAccommodationRecord(item);
          merged.set(norm.id, norm);
        }
      }
    }
  } catch {
    // ignore network error
  }

  // 2. Fetch Approved + Available from Firestore
  try {
    const approvedQuery = query(
      collection(db, 'accommodations'),
      where('approvalStatus', '==', 'Approved'),
      where('availability', '==', 'Available')
    );
    const snap = await getDocs(approvedQuery);
    for (const d of snap.docs) {
      const norm = normalizeAccommodationRecord({ id: d.id, ...d.data() }, d.id);
      merged.set(norm.id, norm);
    }
  } catch {
    // Fallback if composite index or query isn't ready
  }

  writeLocalAccommodationsMap(merged);

  return Array.from(merged.values()).filter(
    item => item.approvalStatus === 'Approved' && item.availability === 'Available'
  );
}

/**
 * Admin accommodation fetch: returns ALL listings across Pending, Approved, Rejected, Unavailable, and Archived.
 */
export async function fetchAdminAllAccommodations(): Promise<AccommodationListing[]> {
  const merged = readLocalAccommodationsMap();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/admin/accommodations', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.accommodations)) {
        for (const item of data.accommodations) {
          const norm = normalizeAccommodationRecord(item);
          merged.set(norm.id, norm);
        }
      }
    }
  } catch {
    // ignore
  }

  try {
    const snap = await getDocs(collection(db, 'accommodations'));
    for (const d of snap.docs) {
      const norm = normalizeAccommodationRecord({ id: d.id, ...d.data() }, d.id);
      merged.set(norm.id, norm);
    }
  } catch {
    // ignore if non-admin or offline
  }

  writeLocalAccommodationsMap(merged);

  return Array.from(merged.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
  );
}

/**
 * Create a new accommodation listing.
 * Newly created listings ALWAYS default to `approvalStatus: 'Pending'` and `verified: false`.
 */
export async function createAccommodationDoc(
  accData: Omit<AccommodationListing, 'id' | 'verified'>,
  creatorUid: string
): Promise<AccommodationListing> {
  const id = accData.propertyId || `acc-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newAcc = normalizeAccommodationRecord(
    {
      ...accData,
      id,
      propertyId: id,
      approvalStatus: 'Pending',
      availability: accData.availability === 'Unavailable' ? 'Unavailable' : 'Available',
      createdBy: creatorUid,
      createdAt: nowIso,
      updatedAt: nowIso,
      approvedBy: null,
      approvedAt: null,
      verified: false
    },
    id
  );

  // Save to local cache immediately
  const map = readLocalAccommodationsMap();
  map.set(newAcc.id, newAcc);
  writeLocalAccommodationsMap(map);

  // Sync to backend API
  try {
    const headers = await getAdminRequestHeaders();
    await fetch('/api/accommodations', {
      method: 'POST',
      headers,
      body: JSON.stringify(newAcc)
    });
  } catch {
    // non-blocking
  }

  // Sync to Firestore `accommodations/{id}`
  try {
    await setDoc(doc(db, 'accommodations', newAcc.id), {
      ...newAcc,
      landlordId: creatorUid,
      approvalStatus: 'Pending'
    });
  } catch (error) {
    console.warn('Firestore accommodation create sync note:', error);
  }

  return newAcc;
}

/**
 * Update an existing accommodation listing.
 * If `requireReapproval` is true, resets `approvalStatus` to `'Pending'`.
 */
export async function updateAccommodationDoc(
  propertyId: string,
  updates: Partial<AccommodationListing>,
  requireReapproval: boolean = false
): Promise<AccommodationListing> {
  const map = readLocalAccommodationsMap();
  const existing = map.get(propertyId);
  const nowIso = new Date().toISOString();

  const nextStatus: AccommodationApprovalStatus = requireReapproval
    ? 'Pending'
    : updates.approvalStatus || existing?.approvalStatus || 'Pending';

  const mergedRecord = normalizeAccommodationRecord(
    {
      ...(existing || {}),
      ...updates,
      id: propertyId,
      propertyId,
      approvalStatus: nextStatus,
      updatedAt: nowIso,
      verified:
        nextStatus === 'Approved' &&
        (updates.availability || existing?.availability || 'Available') === 'Available'
    },
    propertyId
  );

  map.set(propertyId, mergedRecord);
  writeLocalAccommodationsMap(map);

  try {
    const headers = await getAdminRequestHeaders();
    await fetch(`/api/admin/accommodations/${encodeURIComponent(propertyId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...mergedRecord,
        requireReapproval
      })
    });
  } catch {
    // non-blocking
  }

  try {
    await setDoc(
      doc(db, 'accommodations', propertyId),
      {
        ...mergedRecord,
        updatedAt: nowIso
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore accommodation update sync note:', err);
  }

  return mergedRecord;
}

/**
 * Admin action to set accommodation status:
 * 'Pending' | 'Approved' | 'Rejected' | 'Unavailable' | 'Archived'
 */
export async function adminSetAccommodationStatusDoc(params: {
  propertyId: string;
  approvalStatus: AccommodationApprovalStatus;
  availability?: AccommodationAvailabilityStatus;
  adminEmail?: string;
  rejectionReason?: string;
  listingSnapshot?: AccommodationListing;
}): Promise<AccommodationListing> {
  const {
    propertyId,
    approvalStatus,
    availability,
    adminEmail,
    rejectionReason,
    listingSnapshot
  } = params;

  const map = readLocalAccommodationsMap();
  const existing = map.get(propertyId) || listingSnapshot;
  const nowIso = new Date().toISOString();

  const resolvedAvailability: AccommodationAvailabilityStatus =
    approvalStatus === 'Unavailable' ||
    approvalStatus === 'Archived' ||
    approvalStatus === 'Rejected'
      ? 'Unavailable'
      : availability === 'Unavailable'
      ? 'Unavailable'
      : 'Available';

  const updated = normalizeAccommodationRecord(
    {
      ...(existing || {}),
      id: propertyId,
      propertyId,
      approvalStatus,
      availability: resolvedAvailability,
      approvedBy: approvalStatus === 'Approved' ? adminEmail || 'admin@everykr.com' : existing?.approvedBy || null,
      approvedAt: approvalStatus === 'Approved' ? nowIso : existing?.approvedAt || null,
      rejectionReason: approvalStatus === 'Rejected' ? rejectionReason || '' : null,
      updatedAt: nowIso,
      verified: approvalStatus === 'Approved' && resolvedAvailability === 'Available'
    },
    propertyId
  );

  map.set(propertyId, updated);
  writeLocalAccommodationsMap(map);

  try {
    const headers = await getAdminRequestHeaders();
    await fetch(`/api/admin/accommodations/${encodeURIComponent(propertyId)}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        approvalStatus,
        availability: resolvedAvailability,
        rejectionReason,
        listingSnapshot: updated
      })
    });
  } catch {
    // non-blocking
  }

  try {
    await setDoc(
      doc(db, 'accommodations', propertyId),
      {
        ...updated,
        updatedAt: nowIso
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore accommodation status sync note:', err);
  }

  return updated;
}

export async function deleteAccommodationDoc(propertyId: string): Promise<void> {
  const map = readLocalAccommodationsMap();
  map.delete(propertyId);
  writeLocalAccommodationsMap(map);

  try {
    const headers = await getAdminRequestHeaders();
    await fetch(`/api/admin/accommodations/${encodeURIComponent(propertyId)}`, {
      method: 'DELETE',
      headers
    });
  } catch {
    // non-blocking
  }

  try {
    await deleteDoc(doc(db, 'accommodations', propertyId));
  } catch (err) {
    console.warn('Firestore accommodation delete note:', err);
  }
}

export async function submitAccommodationInquiryDoc(
  inquiry: Omit<AccommodationInquiry, 'id' | 'createdAt' | 'status'>
): Promise<AccommodationInquiry> {
  const newInquiry: AccommodationInquiry = {
    ...inquiry,
    id: `inq-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'New'
  };

  try {
    if (auth.currentUser) {
      await setDoc(doc(db, 'accommodation_inquiries', newInquiry.id), newInquiry);
    }
  } catch (err) {
    console.warn('Accommodation inquiry saved locally:', err);
  }

  return newInquiry;
}

// ----------------------------------------------------
// Community Discussions & Replies Service
// ----------------------------------------------------

export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
  try {
    const snap = await getDocs(collection(db, 'community_posts'));
    if (snap.empty) {
      return INITIAL_POSTS;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityPost));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'community_posts');
    return INITIAL_POSTS;
  }
}

export async function createCommunityPostDoc(
  postData: Omit<CommunityPost, 'id' | 'timestamp' | 'repliesCount' | 'likesCount' | 'bookmarked'>,
  authorUid: string
): Promise<CommunityPost> {
  try {
    const newPost: CommunityPost = {
      ...postData,
      id: `post-${Date.now()}`,
      timestamp: 'Just now',
      repliesCount: 0,
      likesCount: 1,
      bookmarked: false,
      replies: []
    };
    await setDoc(doc(db, 'community_posts', newPost.id), {
      ...newPost,
      authorId: authorUid,
      createdAt: serverTimestamp()
    });
    return newPost;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'community_posts');
    throw error;
  }
}

export async function likeCommunityPostDoc(postId: string, currentLikes: number): Promise<void> {
  try {
    const postRef = doc(db, 'community_posts', postId);
    await updateDoc(postRef, {
      likesCount: currentLikes + 1
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `community_posts/${postId}`);
  }
}

export async function addCommentToPostDoc(
  postId: string,
  content: string,
  authorName: string,
  authorUid: string
): Promise<void> {
  try {
    const commentsColRef = collection(db, 'community_posts', postId, 'comments');
    await addDoc(commentsColRef, {
      content,
      authorName,
      authorId: authorUid,
      timestamp: 'Just now',
      isVerifiedStudent: true,
      createdAt: serverTimestamp()
    });

    // Increment repliesCount on post
    const postRef = doc(db, 'community_posts', postId);
    await updateDoc(postRef, {
      repliesCount: increment(1)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `community_posts/${postId}/comments`);
  }
}

export async function deleteCommunityPostDoc(postId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'community_posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `community_posts/${postId}`);
  }
}

// ----------------------------------------------------
// Marketplace Service
// ----------------------------------------------------

export async function fetchMarketplaceItems(): Promise<MarketplaceItem[]> {
  try {
    const snap = await getDocs(collection(db, 'marketplace_listings'));
    if (snap.empty) {
      return INITIAL_MARKETPLACE;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'marketplace_listings');
    return INITIAL_MARKETPLACE;
  }
}

export async function createMarketplaceItemDoc(
  itemData: Omit<MarketplaceItem, 'id' | 'postedDate' | 'status'>,
  sellerUid: string
): Promise<MarketplaceItem> {
  try {
    const newItem: MarketplaceItem = {
      ...itemData,
      id: `mkt-${Date.now()}`,
      postedDate: 'Today',
      status: 'Available'
    };
    await setDoc(doc(db, 'marketplace_listings', newItem.id), {
      ...newItem,
      sellerId: sellerUid,
      createdAt: serverTimestamp()
    });
    return newItem;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'marketplace_listings');
    throw error;
  }
}

// ----------------------------------------------------
// Reports & Moderation Service
// ----------------------------------------------------

export async function submitSafetyReportDoc(
  targetType: 'job' | 'housing' | 'post' | 'listing' | 'user',
  targetId: string,
  reason: string,
  reporterUid: string
): Promise<void> {
  try {
    const reportId = `rep-${Date.now()}`;
    await setDoc(doc(db, 'reports', reportId), {
      id: reportId,
      reporterId: reporterUid,
      targetType,
      targetId,
      reason,
      status: 'Pending',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'reports');
  }
}

// ----------------------------------------------------
// User Saved Items (Scoped to /users/{uid}/saved_items)
// ----------------------------------------------------

export interface SavedItemDoc {
  id: string;
  itemType: 'university' | 'job' | 'accommodation';
  itemId: string;
  savedAt: string;
}

export async function fetchUserSavedItemsDoc(userId: string): Promise<SavedItemDoc[]> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    return [];
  }
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'saved_items'));
    return snap.docs.map(d => d.data() as SavedItemDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/saved_items`);
    return [];
  }
}

export async function toggleUserSavedItemDoc(
  userId: string,
  itemType: 'university' | 'job' | 'accommodation',
  itemId: string
): Promise<boolean> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    return true;
  }
  const docId = `${itemType}_${itemId}`;
  const docRef = doc(db, 'users', userId, 'saved_items', docId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await deleteDoc(docRef);
      return false; // Removed
    } else {
      await setDoc(docRef, {
        id: docId,
        itemType,
        itemId,
        savedAt: new Date().toISOString()
      });
      return true; // Added
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/saved_items/${docId}`);
    return false;
  }
}

// ----------------------------------------------------
// User Deadline Reminders (Scoped to /users/{uid}/reminders)
// ----------------------------------------------------

export interface UserReminderDoc {
  id: string;
  title: string;
  dueDate: string;
  category: 'ARC & Immigration' | 'Tuition' | 'Health Insurance' | 'Exam / TOPIK' | 'Personal';
  completed: boolean;
  notes?: string;
}

const DEFAULT_INITIAL_REMINDERS: UserReminderDoc[] = [
  {
    id: 'rem-1',
    title: 'HiKorea ARC Appointment (Within 90 Days of Arrival)',
    dueDate: '2026-11-20',
    category: 'ARC & Immigration',
    completed: false,
    notes: 'Prepare Tuberculosis certificate, passport, dorm contract, and ₩30,000 application fee.'
  },
  {
    id: 'rem-2',
    title: 'NHIS National Health Insurance Monthly Automatic Payment',
    dueDate: '2026-11-25',
    category: 'Health Insurance',
    completed: false,
    notes: 'Debited on the 25th of every month. Keep registered Korean bank account funded.'
  },
  {
    id: 'rem-3',
    title: 'Spring 2027 Semester Tuition Payment Window',
    dueDate: '2027-01-15',
    category: 'Tuition',
    completed: false,
    notes: 'Check virtual account on university student portal for scholarship deductions.'
  }
];

export async function fetchUserRemindersDoc(userId: string): Promise<UserReminderDoc[]> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    return DEFAULT_INITIAL_REMINDERS;
  }
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'reminders'));
    if (snap.empty) {
      return DEFAULT_INITIAL_REMINDERS;
    }
    return snap.docs.map(d => d.data() as UserReminderDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/reminders`);
    return DEFAULT_INITIAL_REMINDERS;
  }
}

export async function addUserReminderDoc(
  userId: string,
  reminder: Omit<UserReminderDoc, 'id' | 'completed'>
): Promise<UserReminderDoc> {
  const id = `rem-${Date.now()}`;
  const newReminder: UserReminderDoc = {
    ...reminder,
    id,
    completed: false
  };
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    return newReminder;
  }
  try {
    await setDoc(doc(db, 'users', userId, 'reminders', id), newReminder);
    return newReminder;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}/reminders`);
    return newReminder;
  }
}

export async function toggleUserReminderDoc(
  userId: string,
  reminderId: string,
  newStatus: boolean
): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    return;
  }
  try {
    await updateDoc(doc(db, 'users', userId, 'reminders', reminderId), {
      completed: newStatus
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/reminders/${reminderId}`);
  }
}

export async function deleteUserReminderDoc(userId: string, reminderId: string): Promise<void> {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'users', userId, 'reminders', reminderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/reminders/${reminderId}`);
  }
}

// ----------------------------------------------------
// User Scoped Community Posts & Marketplace Items
// ----------------------------------------------------

export async function fetchUserPostsDoc(userId: string): Promise<CommunityPost[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'community_posts'), where('authorId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityPost));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'community_posts');
    return [];
  }
}

export async function fetchUserMarketplaceDoc(userId: string): Promise<MarketplaceItem[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'marketplace_listings'), where('sellerId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'marketplace_listings');
    return [];
  }
}

export async function updateMarketplaceItemStatusDoc(
  itemId: string,
  status: 'Available' | 'Reserved' | 'Sold'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'marketplace_listings', itemId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `marketplace_listings/${itemId}`);
  }
}

export async function deleteMarketplaceItemDoc(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'marketplace_listings', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `marketplace_listings/${itemId}`);
  }
}

// ----------------------------------------------------
// Administrative Audit Logs Service
// ----------------------------------------------------

export async function createAuditLogDoc(logData: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> {
  const id = `log-${Date.now()}`;
  const newLog: AuditLogEntry = {
    ...logData,
    id
  };

  try {
    const res = await fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: getAdminRequestHeaders({
        fullName: logData.adminName,
        email: logData.adminEmail
      }),
      body: JSON.stringify(newLog)
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.auditLog?.id) {
        Object.assign(newLog, data.auditLog);
      }
    }
  } catch {
    // continue to Firestore write if Firebase admin session is active
  }

  if (await isCurrentFirebaseUserAuthorizedAdmin()) {
    try {
      await setDoc(doc(db, 'audit_logs', newLog.id), {
        ...sanitizeFirestorePayload(newLog),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'audit_logs');
    }
  }

  return newLog;
}

export async function fetchAuditLogsDoc(): Promise<AuditLogEntry[]> {
  const merged = new Map<string, AuditLogEntry>();

  try {
    const sessionToken = getServerSessionToken();
    if (sessionToken || auth.currentUser) {
      const res = await fetch('/api/admin/audit-logs', {
        headers: getAdminRequestHeaders()
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.auditLogs)) {
          for (const item of data.auditLogs) {
            if (item?.id) merged.set(item.id, item as AuditLogEntry);
          }
        }
      }
    }
  } catch {
    // continue to Firestore read if Firebase admin session is active
  }

  if (await isCurrentFirebaseUserAuthorizedAdmin()) {
    try {
      const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const item = { id: d.id, ...(d.data() as Omit<AuditLogEntry, 'id'>) } as AuditLogEntry;
        if (!merged.has(item.id)) {
          merged.set(item.id, item);
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.timestamp || '').localeCompare(a.timestamp || '')
  );
}

// ----------------------------------------------------
// EveryKR Newsletter Subscribers & Campaigns (Firestore Sync)
// ----------------------------------------------------

export interface FirestoreNewsletterSubscriber {
  id: string;
  email: string;
  status: 'pending_verification' | 'active' | 'unsubscribed' | 'bounced' | 'suppressed';
  verified: boolean;
  consentGiven: boolean;
  consentTimestamp: string;
  subscribedAt: string;
  verifiedAt?: string;
  unsubscribedAt?: string;
  unsubscribeReason?: string;
  source: string;
  topics: string[];
  deliveryCount?: number;
  lastEmailSentAt?: string;
  lastDeliveryStatus?: 'delivered' | 'smtp_relay_accepted' | 'queued_local' | 'failed';
  lastDeliveryProvider?: string;
  lastDeliveryError?: string;
  lastMessageId?: string;
  lastPreviewUrl?: string;
}

export interface FirestoreNewsletterCampaign {
  id: string;
  subject: string;
  preheader: string;
  templateId: string;
  heading: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'partial_failure';
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  createdBy: string;
  targetTopic: string;
  stats: {
    totalTargeted: number;
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
    suppressedSkipped: number;
  };
}

/**
 * Persist or update a subscriber record in the EveryKR Firestore `newsletter_subscribers` collection
 */
export async function syncSubscriberToFirestore(subscriber: FirestoreNewsletterSubscriber): Promise<void> {
  try {
    const subRef = doc(db, 'newsletter_subscribers', subscriber.id);
    await setDoc(
      subRef,
      {
        ...subscriber,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    // Non-blocking if visitor is unauthenticated and rules require server/admin sync
    console.warn('Firestore newsletter_subscribers sync note:', err);
  }
}

/**
 * Fetch all subscribers from Firestore `newsletter_subscribers` for Admin Dashboard merge
 */
export async function fetchFirestoreSubscribers(): Promise<FirestoreNewsletterSubscriber[]> {
  try {
    const snap = await getDocs(collection(db, 'newsletter_subscribers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreNewsletterSubscriber));
  } catch (err) {
    console.warn('Could not read Firestore newsletter_subscribers:', err);
    return [];
  }
}

/**
 * Persist a newsletter campaign record in the EveryKR Firestore `newsletter_campaigns` collection
 */
export async function syncCampaignToFirestore(campaign: FirestoreNewsletterCampaign): Promise<void> {
  try {
    const campRef = doc(db, 'newsletter_campaigns', campaign.id);
    await setDoc(
      campRef,
      {
        ...campaign,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore newsletter_campaigns sync note:', err);
  }
}

/**
 * Fetch newsletter campaigns from Firestore `newsletter_campaigns`
 */
export async function fetchFirestoreCampaigns(): Promise<FirestoreNewsletterCampaign[]> {
  try {
    const snap = await getDocs(collection(db, 'newsletter_campaigns'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreNewsletterCampaign));
  } catch (err) {
    console.warn('Could not read Firestore newsletter_campaigns:', err);
    return [];
  }
}

// ----------------------------------------------------
// EveryKR SIM Registration & Free SIM Application System
// ----------------------------------------------------

export const SIM_APPLICATION_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const SIM_APPLICATION_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];
export const SIM_APPLICATION_ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
export const SIM_APPLICATION_CONSENT_VERSION = 'v1.0-2026-11';

export const SIM_APPLICATION_CONSENT_TEXT = `I consent to EveryKR collecting and securely processing my personal information, passport copy, flight ticket, and arrival details for the purpose of free SIM card registration and arrival coordination in South Korea.

I understand that an authorized EveryKR team member may contact me through WhatsApp regarding my SIM application and arrival arrangements.

I understand that my submitted documents will be accessible only to authorized personnel for this specific purpose and handled according to EveryKR's Privacy Policy.

I agree to the collection and processing of my personal information for the purposes stated above.`;

export function validateSimDocumentFile(file: File | null | undefined, label: string): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: `Please upload your ${label}.` };
  }

  const lowerName = (file.name || '').toLowerCase();
  const hasAllowedExtension = SIM_APPLICATION_ALLOWED_EXTENSIONS.some(ext =>
    lowerName.endsWith(ext)
  );
  const hasAllowedMime =
    SIM_APPLICATION_ALLOWED_MIME_TYPES.includes((file.type || '').toLowerCase()) ||
    hasAllowedExtension;

  if (!hasAllowedExtension || !hasAllowedMime) {
    return {
      valid: false,
      error: `${label} must be a PDF, JPG, JPEG, or PNG file.`
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: `${label} appears to be empty. Please select a valid document.`
    };
  }

  if (file.size > SIM_APPLICATION_MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `${label} exceeds the 10 MB limit (${sizeMb} MB). Please upload a file up to 10 MB.`
    };
  }

  return { valid: true };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function uploadSimApplicationDocument(params: {
  file: File;
  userId: string;
  applicationId: string;
  docType: 'passport' | 'flight_ticket';
}): Promise<{
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const { file, userId, applicationId, docType } = params;
  const label = docType === 'passport' ? 'Passport copy' : 'Air ticket';
  const check = validateSimDocumentFile(file, label);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `sim_applications/${userId}/${applicationId}/${docType}_${Date.now()}_${safeFileName}`;
  const resolvedMime =
    file.type ||
    (safeFileName.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : safeFileName.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg');

  try {
    const refObj = storageRef(storage, storagePath);
    const snapshot = await withTimeout(
      uploadBytes(refObj, file, {
        contentType: resolvedMime,
        customMetadata: {
          userId,
          applicationId,
          documentType: docType,
          uploadedAt: new Date().toISOString()
        }
      }),
      12000,
      'uploadSimApplicationDocument'
    );
    const downloadUrl = await withTimeout(
      getDownloadURL(snapshot.ref),
      8000,
      'getDownloadURL'
    );
    return {
      downloadUrl,
      storagePath,
      fileName: file.name,
      mimeType: resolvedMime,
      sizeBytes: file.size
    };
  } catch {
    // If the Firebase Storage bucket restricts direct browser upload in the preview container,
    // encode the verified file payload so it is securely persisted in the authenticated record
    const dataUrl = await readFileAsDataUrl(file);
    return {
      downloadUrl: dataUrl,
      storagePath,
      fileName: file.name,
      mimeType: resolvedMime,
      sizeBytes: file.size
    };
  }
}

export function generateUniqueSimApplicationId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SIM-${year}-${rand}`;
}

export async function submitSimApplicationDoc(params: {
  applicationId?: string;
  userId: string;
  userEmail?: string;
  fullName: string;
  universityName: string;
  whatsappNumber: string;
  whatsappCountryCode?: string;
  whatsappLocalNumber?: string;
  arrivalDate: string;
  arrivalTime: string;
  flightNumber: string;
  arrivalAirport: SimApplicationAirport | string;
  passportDocumentURL: string;
  passportFileName?: string;
  passportMimeType?: string;
  passportFileSize?: number;
  passportStoragePath?: string;
  flightTicketDocumentURL: string;
  flightTicketFileName?: string;
  flightTicketMimeType?: string;
  flightTicketFileSize?: number;
  flightTicketStoragePath?: string;
  consentAccepted: boolean;
  consentVersion?: string;
  consentTimestamp?: string;
}): Promise<SimApplicationRecord> {
  if (!params.consentAccepted) {
    throw new Error('Mandatory privacy consent must be accepted before submitting your SIM application.');
  }

  const nowIso = new Date().toISOString();
  const applicationId = (params.applicationId || generateUniqueSimApplicationId()).trim();

  // First submit to server backend for server-side validation, duplicate check, and secure persistence
  let serverRecord: SimApplicationRecord | null = null;
  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/sim-applications', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...params,
        applicationId,
        consentAccepted: true,
        consentVersion: params.consentVersion || SIM_APPLICATION_CONSENT_VERSION,
        consentText: SIM_APPLICATION_CONSENT_TEXT,
        consentTimestamp: params.consentTimestamp || nowIso,
        submissionTimestamp: nowIso
      })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok && res.status === 409) {
      throw new Error(
        data?.error ||
          'A duplicate SIM application for this flight and arrival date was already submitted recently.'
      );
    }
    if (!res.ok && res.status === 400) {
      throw new Error(data?.error || 'Please check all required fields and try again.');
    }
    if (res.ok && data?.ok && data?.application) {
      serverRecord = data.application as SimApplicationRecord;
    }
  } catch (err: any) {
    if (
      err?.message &&
      (err.message.includes('duplicate') ||
        err.message.includes('Please check') ||
        err.message.includes('Mandatory') ||
        err.message.includes('exceeds'))
    ) {
      throw err;
    }
  }

  const finalRecord: SimApplicationRecord = serverRecord || {
    id: applicationId,
    applicationId,
    userId: params.userId,
    userEmail: params.userEmail || auth.currentUser?.email || '',
    fullName: params.fullName.trim(),
    universityName: params.universityName.trim(),
    whatsappNumber: params.whatsappNumber.trim(),
    whatsappCountryCode: params.whatsappCountryCode || '',
    whatsappLocalNumber: params.whatsappLocalNumber || '',
    arrivalDate: params.arrivalDate.trim(),
    arrivalTime: params.arrivalTime.trim(),
    flightNumber: params.flightNumber.trim().toUpperCase(),
    arrivalAirport: params.arrivalAirport,
    passportDocumentURL: params.passportDocumentURL,
    passportFileName: params.passportFileName || 'passport',
    passportMimeType: params.passportMimeType || 'application/pdf',
    passportFileSize: params.passportFileSize || 0,
    passportStoragePath: params.passportStoragePath || '',
    flightTicketDocumentURL: params.flightTicketDocumentURL,
    flightTicketFileName: params.flightTicketFileName || 'flight_ticket',
    flightTicketMimeType: params.flightTicketMimeType || 'application/pdf',
    flightTicketFileSize: params.flightTicketFileSize || 0,
    flightTicketStoragePath: params.flightTicketStoragePath || '',
    consentAccepted: true,
    consentVersion: params.consentVersion || SIM_APPLICATION_CONSENT_VERSION,
    consentText: SIM_APPLICATION_CONSENT_TEXT,
    consentTimestamp: params.consentTimestamp || nowIso,
    submissionTimestamp: nowIso,
    applicationStatus: 'Pending',
    updatedAt: nowIso
  };

  // Write to Firestore `sim_applications/{applicationId}`
  // Note: If a document URL is an inline Data URL larger than 700KB, store a compact reference in Firestore while full payload remains on the server
  const firestorePayload: Record<string, any> = {
    ...finalRecord,
    passportDocumentURL:
      finalRecord.passportDocumentURL.length > 450_000
        ? `server-protected://${finalRecord.applicationId}/passport`
        : finalRecord.passportDocumentURL,
    flightTicketDocumentURL:
      finalRecord.flightTicketDocumentURL.length > 450_000
        ? `server-protected://${finalRecord.applicationId}/flight_ticket`
        : finalRecord.flightTicketDocumentURL
  };

  try {
    await setDoc(doc(db, 'sim_applications', finalRecord.applicationId), firestorePayload);
  } catch (err) {
    console.warn('Firestore sim_applications sync note:', err);
  }

  return finalRecord;
}

export async function fetchUserSimApplications(userId: string): Promise<SimApplicationRecord[]> {
  if (!userId) return [];
  const merged = new Map<string, SimApplicationRecord>();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch(`/api/sim-applications/mine?userId=${encodeURIComponent(userId)}`, {
      headers
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.applications)) {
        for (const item of data.applications) {
          if (item?.applicationId) {
            merged.set(item.applicationId, item);
          }
        }
      }
    }
  } catch {
    // fallback to Firestore query
  }

  try {
    if (auth.currentUser && auth.currentUser.uid === userId) {
      const q = query(collection(db, 'sim_applications'), where('userId', '==', userId));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const data = d.data() as SimApplicationRecord;
        const appId = data.applicationId || d.id;
        const existing = merged.get(appId);
        if (!existing) {
          merged.set(appId, { ...data, id: appId, applicationId: appId });
        }
      });
    }
  } catch {
    // ignore permission errors if server session is active
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.submissionTimestamp || '').localeCompare(a.submissionTimestamp || '')
  );
}

export async function fetchAdminSimApplications(): Promise<SimApplicationRecord[]> {
  const merged = new Map<string, SimApplicationRecord>();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/admin/sim-applications', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.applications)) {
        for (const item of data.applications) {
          if (item?.applicationId) {
            merged.set(item.applicationId, item);
          }
        }
      }
    }
  } catch {
    // continue to Firestore merge
  }

  try {
    if (auth.currentUser) {
      const snap = await getDocs(collection(db, 'sim_applications'));
      snap.docs.forEach(d => {
        const data = d.data() as SimApplicationRecord;
        const appId = data.applicationId || d.id;
        const existing = merged.get(appId);
        if (!existing) {
          merged.set(appId, { ...data, id: appId, applicationId: appId });
        } else {
          // Prefer server copy if Firestore copy had a server-protected:// placeholder URL
          merged.set(appId, {
            ...data,
            ...existing,
            applicationStatus: existing.applicationStatus || data.applicationStatus,
            passportDocumentURL:
              existing.passportDocumentURL &&
              !existing.passportDocumentURL.startsWith('server-protected://')
                ? existing.passportDocumentURL
                : data.passportDocumentURL,
            flightTicketDocumentURL:
              existing.flightTicketDocumentURL &&
              !existing.flightTicketDocumentURL.startsWith('server-protected://')
                ? existing.flightTicketDocumentURL
                : data.flightTicketDocumentURL
          });
        }
      });
    }
  } catch {
    // ignore if non-Firebase admin session
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.submissionTimestamp || '').localeCompare(a.submissionTimestamp || '')
  );
}

export { db };

export const isFirebaseConfigured: boolean = Boolean(db);

export async function getCurrentIdToken(): Promise<string | null> {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
  } catch {
    // fallback to session token
  }
  return getServerSessionToken();
}

export async function appendAuditLogToFirestore(entry: {
  id?: string;
  timestamp?: string;
  adminId?: string;
  actionType: AuditLogEntry['actionType'];
  targetEntity: AuditLogEntry['targetEntity'];
  targetId: string;
  targetName: string;
  details: string;
  adminName?: string;
  adminEmail?: string;
}): Promise<void> {
  await createAuditLogDoc({
    timestamp: entry.timestamp || new Date().toISOString(),
    adminName: entry.adminName || auth.currentUser?.displayName || 'Administrator',
    adminEmail: entry.adminEmail || auth.currentUser?.email || 'admin@everykr.com',
    actionType: entry.actionType,
    targetEntity: entry.targetEntity,
    targetId: entry.targetId,
    targetName: entry.targetName,
    details: entry.details
  });
}

export const fetchAllSimApplicationsForAdmin = fetchAdminSimApplications;

export async function resolveProtectedSimDocumentUrlForAdmin(
  rawUrl?: string,
  storagePath?: string,
  _docType?: string
): Promise<string> {
  const clean = String(rawUrl || '').trim();
  if (!clean) return '';
  if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('blob:')) {
    return clean;
  }
  if (storagePath && storage) {
    try {
      return await getDownloadURL(storageRef(storage, storagePath));
    } catch {
      // fallback
    }
  }
  return clean;
}

export async function updateSimApplicationStatusDoc(
  applicationId: string,
  applicationStatus: SimApplicationStatus,
  _adminEmail?: string,
  adminNotes?: string
): Promise<SimApplicationRecord> {
  return adminUpdateSimApplicationStatusDoc({
    applicationId,
    applicationStatus,
    adminNotes
  });
}

export async function adminUpdateSimApplicationStatusDoc(params: {
  applicationId: string;
  applicationStatus: SimApplicationStatus;
  adminNotes?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  applicationSnapshot?: SimApplicationRecord;
}): Promise<SimApplicationRecord> {
  const {
    applicationId,
    applicationStatus,
    adminNotes,
    assignedStaffId,
    assignedStaffName,
    applicationSnapshot
  } = params;
  const nowIso = new Date().toISOString();
  let updatedRecord: SimApplicationRecord | null = null;

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch(
      `/api/admin/sim-applications/${encodeURIComponent(applicationId)}/status`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          applicationStatus,
          adminNotes,
          assignedStaffId,
          assignedStaffName,
          applicationSnapshot
        })
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.application) {
        updatedRecord = data.application as SimApplicationRecord;
      }
    }
  } catch {
    // fallback to direct Firestore update
  }

  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, 'sim_applications', applicationId), {
        applicationStatus,
        adminNotes: adminNotes ?? applicationSnapshot?.adminNotes ?? '',
        assignedStaffId: assignedStaffId ?? applicationSnapshot?.assignedStaffId ?? '',
        assignedStaffName: assignedStaffName ?? applicationSnapshot?.assignedStaffName ?? '',
        reviewedBy: auth.currentUser.email || auth.currentUser.uid,
        reviewedAt: nowIso,
        updatedAt: nowIso
      });
    } catch {
      // ignore if doc only exists on server store
    }
  }

  return (
    updatedRecord || {
      ...(applicationSnapshot as SimApplicationRecord),
      id: applicationId,
      applicationId,
      applicationStatus,
      adminNotes: adminNotes ?? applicationSnapshot?.adminNotes ?? '',
      assignedStaffId: assignedStaffId ?? applicationSnapshot?.assignedStaffId ?? '',
      assignedStaffName: assignedStaffName ?? applicationSnapshot?.assignedStaffName ?? '',
      reviewedAt: nowIso,
      updatedAt: nowIso
    }
  );
}

// ============================================================================
// STUDENT PORTAL & ADMIN MANAGEMENT SYSTEM SERVICES (PARTS 1–9)
// ============================================================================

export function maskPassportNumberSafe(raw?: string): string {
  const clean = String(raw || '').trim();
  if (!clean) return '';
  if (clean.includes('*')) return clean;
  if (clean.length <= 4) return `****${clean}`;
  return `${clean.slice(0, 2)}${'*'.repeat(Math.max(3, clean.length - 4))}${clean.slice(-2)}`;
}

/**
 * Sends a notification to a specific student's portal (`users/{userId}/notifications` + server store + local cache).
 */
export async function pushStudentPortalNotificationDoc(
  userId: string,
  notif: Omit<StudentNotification, 'id' | 'timestamp' | 'read'> & { id?: string }
): Promise<StudentNotification> {
  const nowIso = new Date().toISOString();
  const fullNotif: StudentNotification = {
    id: notif.id || `snotif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: notif.title,
    message: notif.message,
    type: notif.type || 'info',
    timestamp: nowIso,
    read: false,
    actionTab: notif.actionTab
  };

  try {
    const headers = await getAdminRequestHeaders();
    await fetch('/api/student-portal/notifications', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, notification: fullNotif })
    });
  } catch {
    // non-blocking
  }

  try {
    await withTimeout(
      setDoc(
        doc(db, 'users', userId, 'notifications', fullNotif.id),
        sanitizeFirestorePayload(fullNotif)
      ),
      2500
    );
  } catch {
    // non-blocking
  }

  try {
    const raw = localStorage.getItem(`everykr_notifs_${userId}`);
    const existing: StudentNotification[] = raw ? JSON.parse(raw) : [];
    const updated = [fullNotif, ...existing.filter(n => n.id !== fullNotif.id)].slice(0, 50);
    localStorage.setItem(`everykr_notifs_${userId}`, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }

  return fullNotif;
}

export async function fetchStudentPortalNotificationsDoc(
  userId: string
): Promise<StudentNotification[]> {
  if (!userId) return [];
  const merged = new Map<string, StudentNotification>();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch(
      `/api/student-portal/notifications?userId=${encodeURIComponent(userId)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.notifications)) {
        for (const n of data.notifications) {
          if (n?.id) merged.set(n.id, n);
        }
      }
    }
  } catch {
    // fallback
  }

  try {
    if (auth.currentUser && auth.currentUser.uid === userId) {
      const snap = await withTimeout(
        getDocs(collection(db, 'users', userId, 'notifications')),
        2500
      );
      snap.docs.forEach(d => {
        const data = d.data() as StudentNotification;
        if (!merged.has(d.id)) {
          merged.set(d.id, { ...data, id: d.id });
        }
      });
    }
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem(`everykr_notifs_${userId}`);
    if (raw) {
      const localList: StudentNotification[] = JSON.parse(raw);
      if (Array.isArray(localList)) {
        for (const n of localList) {
          if (n?.id && !merged.has(n.id)) merged.set(n.id, n);
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.timestamp || '').localeCompare(a.timestamp || '')
  );
}

/**
 * Creates a platform-wide Admin Notification (`admin_notifications`).
 */
export async function createAdminPlatformNotificationDoc(params: {
  type: AdminPlatformNotification['type'];
  title: string;
  message: string;
  relatedRecordId?: string;
  studentId?: string;
  studentName?: string;
}): Promise<AdminPlatformNotification> {
  const nowIso = new Date().toISOString();
  const id = `anotif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: AdminPlatformNotification = {
    id,
    type: params.type,
    title: params.title,
    message: params.message,
    relatedRecordId: params.relatedRecordId || '',
    studentId: params.studentId || '',
    studentName: params.studentName || '',
    createdAt: nowIso,
    read: false
  };

  try {
    const headers = await getAdminRequestHeaders();
    await fetch('/api/admin/notifications', {
      method: 'POST',
      headers,
      body: JSON.stringify(record)
    });
  } catch {
    // non-blocking
  }

  try {
    if (auth.currentUser) {
      await withTimeout(
        setDoc(doc(db, 'admin_notifications', id), sanitizeFirestorePayload(record)),
        2500
      );
    }
  } catch {
    // non-blocking
  }

  return record;
}

export async function fetchAdminPlatformNotificationsDoc(): Promise<AdminPlatformNotification[]> {
  const merged = new Map<string, AdminPlatformNotification>();
  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/admin/notifications', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.notifications)) {
        for (const item of data.notifications) {
          if (item?.id) merged.set(item.id, item);
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      const snap = await withTimeout(getDocs(collection(db, 'admin_notifications')), 3000);
      snap.docs.forEach(d => {
        const data = d.data() as AdminPlatformNotification;
        if (!merged.has(d.id)) {
          merged.set(d.id, { ...data, id: d.id });
        }
      });
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

export async function markAdminNotificationReadDoc(notificationId: string): Promise<void> {
  try {
    const headers = await getAdminRequestHeaders();
    await fetch(`/api/admin/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH',
      headers
    });
  } catch {
    // ignore
  }
  try {
    if (auth.currentUser) {
      await updateDoc(doc(db, 'admin_notifications', notificationId), { read: true });
    }
  } catch {
    // ignore
  }
}

/**
 * Updates a student's complete profile (Personal, Passport, Academic, Language) in Firestore + Server Store + Local Cache.
 */
export async function saveStudentPortalProfileDoc(params: {
  userId: string;
  currentProfile: UserProfile;
  updates: Partial<UserProfile>;
  rawPassportNumber?: string;
}): Promise<UserProfile> {
  const { userId, currentProfile, updates, rawPassportNumber } = params;
  const nowIso = new Date().toISOString();

  const cleanRawPassport = String(rawPassportNumber || '').trim();
  const maskedPassport = cleanRawPassport
    ? maskPassportNumberSafe(cleanRawPassport)
    : updates.passportDetails?.passportNumberMasked ||
      currentProfile.passportDetails?.passportNumberMasked ||
      '';

  const mergedPassportDetails = {
    ...(currentProfile.passportDetails || { requiredForService: true, consentGiven: true }),
    ...(updates.passportDetails || {}),
    ...(maskedPassport
      ? {
          passportNumberMasked: maskedPassport,
          hasEncryptedPassport: true,
          consentGiven: true,
          requiredForService: true
        }
      : {})
  };

  const mergedProfile: UserProfile = sanitizeFirestorePayload({
    ...currentProfile,
    ...updates,
    id: userId,
    uid: userId,
    name: updates.fullName || updates.name || currentProfile.fullName || currentProfile.name,
    fullName: updates.fullName || updates.name || currentProfile.fullName || currentProfile.name,
    passportDetails: mergedPassportDetails,
    updatedAt: nowIso
  });

  mergedProfile.profileCompletionPercentage = calculateProfileCompletion(mergedProfile).percentage;

  // Save to local cache immediately
  saveCachedProfileByUid(userId, mergedProfile);

  // Sync to backend user store (encrypts raw passport if provided)
  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/users/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...mergedProfile,
        uid: userId,
        passportDetails: {
          ...mergedPassportDetails,
          ...(cleanRawPassport ? { passportNumber: cleanRawPassport } : {})
        }
      })
    });
    const data = await res.json().catch(() => null);
    if (data?.ok && data.user) {
      mergedProfile.passportDetails = {
        ...mergedPassportDetails,
        ...(data.user.passportDetails || {})
      };
      saveCachedProfileByUid(userId, mergedProfile);
    }
  } catch {
    // continue to Firestore sync
  }

  // Persist to Firestore `users/{userId}`
  try {
    if (auth.currentUser) {
      await withTimeout(
        setDoc(
          doc(db, 'users', userId),
          sanitizeFirestorePayload({
            ...mergedProfile,
            updatedAtServer: serverTimestamp()
          }),
          { merge: true }
        ),
        3000
      );

      if (cleanRawPassport) {
        await withTimeout(
          setDoc(
            doc(db, 'users', userId, 'private_sensitive', 'passport'),
            sanitizeFirestorePayload({
              uid: userId,
              passportNumberMasked: maskedPassport,
              issuingCountry:
                mergedPassportDetails.issuingCountry || mergedProfile.nationality || '',
              issueDate: mergedPassportDetails.issueDate || '',
              expiryDate: mergedPassportDetails.expiryDate || '',
              updatedAt: nowIso
            }),
            { merge: true }
          ),
          2500
        );
      }
    }
  } catch {
    // non-blocking if using server OTP session
  }

  return mergedProfile;
}

// ============================================================================
// SECTION 2 & PART 5.4: STUDENT DOCUMENT UPLOAD & VERIFICATION SYSTEM
// ============================================================================

export async function uploadStudentPortalDocument(params: {
  file: File;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentCountry?: string;
  category: StudentDocumentCategory;
  documentTitle?: string;
  replaceDocumentId?: string;
}): Promise<StudentDocumentRecord> {
  const {
    file,
    userId,
    studentName,
    studentEmail,
    studentCountry = '',
    category,
    documentTitle,
    replaceDocumentId
  } = params;

  const check = validateSimDocumentFile(file, category);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const nowIso = new Date().toISOString();
  const documentId =
    replaceDocumentId || `sdoc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `student_documents/${userId}/${documentId}/${Date.now()}_${safeFileName}`;
  const resolvedMime =
    file.type ||
    (safeFileName.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : safeFileName.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg');

  let downloadUrl = '';
  try {
    const refObj = storageRef(storage, storagePath);
    const snapshot = await withTimeout(
      uploadBytes(refObj, file, {
        contentType: resolvedMime,
        customMetadata: {
          userId,
          documentId,
          category,
          uploadedAt: nowIso
        }
      }),
      12000,
      'uploadStudentPortalDocument'
    );
    downloadUrl = await withTimeout(getDownloadURL(snapshot.ref), 8000, 'getDownloadURL');
  } catch {
    downloadUrl = await readFileAsDataUrl(file);
  }

  const record: StudentDocumentRecord = {
    id: documentId,
    documentId,
    userId,
    studentName: studentName || 'Student',
    studentEmail: studentEmail || '',
    studentCountry,
    category,
    documentTitle: (documentTitle || category).trim(),
    fileName: file.name,
    fileUrl: downloadUrl,
    storagePath,
    mimeType: resolvedMime,
    fileSize: file.size,
    uploadStatus: 'Uploaded',
    verificationStatus: 'Pending Verification',
    verificationNotes: '',
    uploadedAt: nowIso,
    updatedAt: nowIso
  };

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/student-portal/documents', {
      method: 'POST',
      headers,
      body: JSON.stringify(record)
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.document) {
        Object.assign(record, data.document);
      }
    }
  } catch {
    // continue to Firestore write
  }

  // Write to Firestore `student_documents/{documentId}` (compact URL if Data URL > 450KB)
  const firestorePayload = sanitizeFirestorePayload({
    ...record,
    fileUrl:
      record.fileUrl.length > 450_000
        ? `server-protected://student_documents/${record.documentId}`
        : record.fileUrl
  });

  try {
    if (auth.currentUser) {
      await withTimeout(setDoc(doc(db, 'student_documents', documentId), firestorePayload), 3000);
    }
  } catch {
    // non-blocking
  }

  // Cache in localStorage for instant resilience
  try {
    const key = `everykr_student_docs_${userId}`;
    const raw = localStorage.getItem(key);
    const list: StudentDocumentRecord[] = raw ? JSON.parse(raw) : [];
    const next = [record, ...list.filter(d => d.documentId !== documentId && d.id !== documentId)];
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }

  // Notify Admin Portal of new document upload
  createAdminPlatformNotificationDoc({
    type: 'new_document_upload',
    title: 'New Student Document Uploaded',
    message: `${studentName || studentEmail} uploaded ${category} (${file.name}).`,
    relatedRecordId: documentId,
    studentId: userId,
    studentName: studentName || studentEmail
  }).catch(() => {});

  return record;
}

export async function fetchStudentDocuments(userId: string): Promise<StudentDocumentRecord[]> {
  if (!userId) return [];
  const merged = new Map<string, StudentDocumentRecord>();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch(
      `/api/student-portal/documents?userId=${encodeURIComponent(userId)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.documents)) {
        for (const docItem of data.documents) {
          const id = docItem?.documentId || docItem?.id;
          if (id) merged.set(id, { ...docItem, id, documentId: id });
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (auth.currentUser && auth.currentUser.uid === userId) {
      const q = query(collection(db, 'student_documents'), where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q), 3000);
      snap.docs.forEach(d => {
        const data = d.data() as StudentDocumentRecord;
        const id = data.documentId || d.id;
        const existing = merged.get(id);
        if (!existing) {
          merged.set(id, { ...data, id, documentId: id });
        } else {
          merged.set(id, {
            ...data,
            ...existing,
            verificationStatus: data.verificationStatus || existing.verificationStatus,
            verificationNotes: data.verificationNotes ?? existing.verificationNotes,
            fileUrl:
              existing.fileUrl && !existing.fileUrl.startsWith('server-protected://')
                ? existing.fileUrl
                : data.fileUrl
          });
        }
      });
    }
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem(`everykr_student_docs_${userId}`);
    if (raw) {
      const list: StudentDocumentRecord[] = JSON.parse(raw);
      for (const item of list) {
        const id = item?.documentId || item?.id;
        if (id && !merged.has(id)) {
          merged.set(id, item);
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.uploadedAt || '').localeCompare(a.uploadedAt || '')
  );
}

export async function deleteStudentDocumentDoc(
  documentId: string,
  userId: string
): Promise<boolean> {
  try {
    const headers = await getAdminRequestHeaders();
    await fetch(
      `/api/student-portal/documents/${encodeURIComponent(documentId)}?userId=${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers
      }
    );
  } catch {
    // continue
  }

  try {
    if (auth.currentUser) {
      await deleteDoc(doc(db, 'student_documents', documentId));
    }
  } catch {
    // ignore
  }

  try {
    const key = `everykr_student_docs_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: StudentDocumentRecord[] = JSON.parse(raw);
      localStorage.setItem(
        key,
        JSON.stringify(list.filter(d => d.documentId !== documentId && d.id !== documentId))
      );
    }
  } catch {
    // ignore
  }

  return true;
}

export async function fetchAdminStudentDocuments(): Promise<StudentDocumentRecord[]> {
  const merged = new Map<string, StudentDocumentRecord>();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/admin/student-documents', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.documents)) {
        for (const item of data.documents) {
          const id = item?.documentId || item?.id;
          if (id) merged.set(id, { ...item, id, documentId: id });
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      const snap = await withTimeout(getDocs(collection(db, 'student_documents')), 3500);
      snap.docs.forEach(d => {
        const data = d.data() as StudentDocumentRecord;
        const id = data.documentId || d.id;
        const existing = merged.get(id);
        if (!existing) {
          merged.set(id, { ...data, id, documentId: id });
        } else {
          merged.set(id, {
            ...data,
            ...existing,
            fileUrl:
              existing.fileUrl && !existing.fileUrl.startsWith('server-protected://')
                ? existing.fileUrl
                : data.fileUrl
          });
        }
      });
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.uploadedAt || '').localeCompare(a.uploadedAt || '')
  );
}

export async function adminVerifyStudentDocumentDoc(params: {
  documentId: string;
  verificationStatus: StudentDocumentVerificationStatus;
  verificationNotes?: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
  documentSnapshot?: StudentDocumentRecord;
}): Promise<StudentDocumentRecord> {
  const {
    documentId,
    verificationStatus,
    verificationNotes = '',
    adminUid,
    adminName,
    adminEmail,
    documentSnapshot
  } = params;
  const nowIso = new Date().toISOString();
  const uploadStatus: StudentDocumentUploadStatus =
    verificationStatus === 'Replacement Requested' ? 'Replacement Requested' : 'Uploaded';

  let updated: StudentDocumentRecord | null = null;

  try {
    const headers = await getAdminRequestHeaders({
      id: adminUid,
      fullName: adminName,
      email: adminEmail
    });
    const res = await fetch(
      `/api/admin/student-documents/${encodeURIComponent(documentId)}/verify`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          verificationStatus,
          uploadStatus,
          verificationNotes,
          documentSnapshot
        })
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.document) {
        updated = data.document as StudentDocumentRecord;
      }
    }
  } catch {
    // fallback
  }

  const finalDoc: StudentDocumentRecord = updated || {
    ...(documentSnapshot as StudentDocumentRecord),
    id: documentId,
    documentId,
    uploadStatus,
    verificationStatus,
    verificationNotes,
    verifiedBy: adminEmail || adminName,
    verifiedAt: nowIso,
    updatedAt: nowIso
  };

  try {
    if (auth.currentUser) {
      await updateDoc(doc(db, 'student_documents', documentId), {
        uploadStatus,
        verificationStatus,
        verificationNotes,
        verifiedBy: adminEmail || adminName,
        verifiedAt: nowIso,
        updatedAt: nowIso
      });
    }
  } catch {
    // ignore
  }

  // Record audit log
  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: `DOCUMENT_${verificationStatus.toUpperCase().replace(/\s+/g, '_')}`,
    targetUid: finalDoc.userId,
    targetEmail: finalDoc.studentEmail,
    details: `Document "${finalDoc.category}" (${finalDoc.fileName}) marked as "${verificationStatus}". Notes: ${verificationNotes || 'None'}`
  }).catch(() => {});

  // Notify student
  if (finalDoc.userId) {
    const isReplacement =
      verificationStatus === 'Replacement Requested' || verificationStatus === 'Rejected';
    pushStudentPortalNotificationDoc(finalDoc.userId, {
      title: isReplacement
        ? `Document Action Required: ${finalDoc.category}`
        : `Document Verified: ${finalDoc.category}`,
      message: isReplacement
        ? `Your uploaded ${finalDoc.category} was marked "${verificationStatus}". ${
            verificationNotes ? `Note: ${verificationNotes}` : 'Please upload a replacement copy in My Documents.'
          }`
        : `Your ${finalDoc.category} (${finalDoc.fileName}) has been verified by EveryKR Admissions.`,
      type:
        verificationStatus === 'Verified'
          ? 'success'
          : verificationStatus === 'Rejected'
          ? 'error'
          : 'warning',
      actionTab: 'documents'
    }).catch(() => {});
  }

  return finalDoc;
}

// ============================================================================
// SECTION 3 & PART 5.3: UNIVERSITY APPLICATION WORKFLOW
// ============================================================================

export function generateUniversityApplicationId(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `APP-${year}-${rand}`;
}

export async function submitUniversityApplicationDoc(
  params: Omit<
    UniversityApplicationRecord,
    'id' | 'applicationId' | 'createdAt' | 'updatedAt' | 'statusHistory'
  > & {
    applicationId?: string;
    statusHistory?: UniversityApplicationStatusHistoryItem[];
  }
): Promise<UniversityApplicationRecord> {
  const nowIso = new Date().toISOString();
  const applicationId = (params.applicationId || generateUniversityApplicationId()).trim();
  const initialStatus: UniversityApplicationStatus = params.status || 'Submitted';

  const initialHistory: UniversityApplicationStatusHistoryItem[] =
    params.statusHistory && params.statusHistory.length > 0
      ? params.statusHistory
      : [
          {
            status: initialStatus,
            changedBy: params.studentEmail || params.studentName || params.userId,
            changedByName: params.studentName || 'Student',
            timestamp: nowIso,
            note:
              initialStatus === 'Draft'
                ? 'Application saved as draft by student.'
                : 'Application submitted by student.'
          }
        ];

  const record: UniversityApplicationRecord = sanitizeFirestorePayload({
    ...params,
    id: applicationId,
    applicationId,
    status: initialStatus,
    submissionDate: initialStatus === 'Submitted' ? params.submissionDate || nowIso : params.submissionDate || nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
    statusHistory: initialHistory
  });

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/student-portal/applications', {
      method: 'POST',
      headers,
      body: JSON.stringify(record)
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.application) {
        Object.assign(record, data.application);
      }
    }
  } catch {
    // continue to Firestore write
  }

  try {
    if (auth.currentUser) {
      await withTimeout(
        setDoc(doc(db, 'university_applications', applicationId), sanitizeFirestorePayload(record)),
        3000
      );
    }
  } catch {
    // non-blocking
  }

  try {
    const key = `everykr_uni_apps_${params.userId}`;
    const raw = localStorage.getItem(key);
    const list: UniversityApplicationRecord[] = raw ? JSON.parse(raw) : [];
    const next = [record, ...list.filter(a => a.applicationId !== applicationId && a.id !== applicationId)];
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }

  if (initialStatus === 'Submitted') {
    pushStudentPortalNotificationDoc(params.userId, {
      title: 'Application Submitted Successfully',
      message: `Your application (${applicationId}) to ${params.universityName} (${params.programName} - ${params.intake}) has been submitted.`,
      type: 'success',
      actionTab: 'applications'
    }).catch(() => {});

    createAdminPlatformNotificationDoc({
      type: 'new_university_application',
      title: 'New University Application Submitted',
      message: `${params.studentName} applied to ${params.universityName} (${params.programName}, ${params.intake}).`,
      relatedRecordId: applicationId,
      studentId: params.userId,
      studentName: params.studentName
    }).catch(() => {});
  }

  return record;
}

export async function updateStudentUniversityApplicationDoc(params: {
  applicationId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  updates: Partial<UniversityApplicationRecord>;
  note?: string;
}): Promise<UniversityApplicationRecord | null> {
  const { applicationId, userId, studentName, studentEmail, updates, note } = params;
  const nowIso = new Date().toISOString();

  // Security guard: Students can only set status to Draft, Submitted, or Withdrawn
  if (
    updates.status &&
    !['Draft', 'Submitted', 'Withdrawn'].includes(updates.status)
  ) {
    throw new Error('Unauthorized status transition.');
  }

  let existingList = await fetchStudentUniversityApplications(userId);
  const existing = existingList.find(
    a => a.applicationId === applicationId || a.id === applicationId
  );
  if (!existing) return null;

  const nextStatus = updates.status || existing.status;
  const historyEntry: UniversityApplicationStatusHistoryItem = {
    status: nextStatus,
    changedBy: studentEmail || userId,
    changedByName: studentName || existing.studentName,
    timestamp: nowIso,
    note:
      note ||
      (nextStatus === 'Withdrawn'
        ? 'Application withdrawn by student.'
        : nextStatus === 'Submitted' && existing.status === 'Draft'
        ? 'Draft application submitted by student.'
        : 'Application updated by student.')
  };

  const updatedRecord: UniversityApplicationRecord = sanitizeFirestorePayload({
    ...existing,
    ...updates,
    id: applicationId,
    applicationId,
    userId,
    status: nextStatus,
    updatedAt: nowIso,
    statusHistory: [...(existing.statusHistory || []), historyEntry]
  });

  try {
    const headers = await getAdminRequestHeaders();
    await fetch(`/api/student-portal/applications/${encodeURIComponent(applicationId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updatedRecord)
    });
  } catch {
    // continue
  }

  try {
    if (auth.currentUser) {
      await withTimeout(
        setDoc(
          doc(db, 'university_applications', applicationId),
          sanitizeFirestorePayload(updatedRecord),
          { merge: true }
        ),
        3000
      );
    }
  } catch {
    // ignore
  }

  try {
    const key = `everykr_uni_apps_${userId}`;
    const raw = localStorage.getItem(key);
    const list: UniversityApplicationRecord[] = raw ? JSON.parse(raw) : [];
    const next = [
      updatedRecord,
      ...list.filter(a => a.applicationId !== applicationId && a.id !== applicationId)
    ];
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }

  return updatedRecord;
}

export async function fetchStudentUniversityApplications(
  userId: string
): Promise<UniversityApplicationRecord[]> {
  if (!userId) return [];
  const merged = new Map<string, UniversityApplicationRecord>();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch(
      `/api/student-portal/applications?userId=${encodeURIComponent(userId)}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.applications)) {
        for (const appItem of data.applications) {
          const id = appItem?.applicationId || appItem?.id;
          if (id) merged.set(id, { ...appItem, id, applicationId: id });
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (auth.currentUser && auth.currentUser.uid === userId) {
      const q = query(collection(db, 'university_applications'), where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q), 3000);
      snap.docs.forEach(d => {
        const data = d.data() as UniversityApplicationRecord;
        const id = data.applicationId || d.id;
        const existing = merged.get(id);
        if (!existing) {
          merged.set(id, { ...data, id, applicationId: id });
        } else {
          // Prefer whichever has a newer updatedAt timestamp
          const existingTime = existing.updatedAt || '';
          const firestoreTime = data.updatedAt || '';
          if (firestoreTime > existingTime) {
            merged.set(id, { ...existing, ...data, id, applicationId: id });
          }
        }
      });
    }
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem(`everykr_uni_apps_${userId}`);
    if (raw) {
      const list: UniversityApplicationRecord[] = JSON.parse(raw);
      for (const item of list) {
        const id = item?.applicationId || item?.id;
        if (id && !merged.has(id)) {
          merged.set(id, item);
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.submissionDate || b.createdAt || '').localeCompare(a.submissionDate || a.createdAt || '')
  );
}

export async function fetchAdminUniversityApplications(): Promise<UniversityApplicationRecord[]> {
  const merged = new Map<string, UniversityApplicationRecord>();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/admin/university-applications', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.applications)) {
        for (const item of data.applications) {
          const id = item?.applicationId || item?.id;
          if (id) merged.set(id, { ...item, id, applicationId: id });
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      const snap = await withTimeout(getDocs(collection(db, 'university_applications')), 3500);
      snap.docs.forEach(d => {
        const data = d.data() as UniversityApplicationRecord;
        const id = data.applicationId || d.id;
        if (!merged.has(id)) {
          merged.set(id, { ...data, id, applicationId: id });
        }
      });
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.submissionDate || b.createdAt || '').localeCompare(a.submissionDate || a.createdAt || '')
  );
}

export async function adminUpdateUniversityApplicationDoc(params: {
  applicationId: string;
  status: UniversityApplicationStatus;
  adminNotes?: string;
  requestedDocumentsNote?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
  applicationSnapshot?: UniversityApplicationRecord;
}): Promise<UniversityApplicationRecord> {
  const {
    applicationId,
    status,
    adminNotes,
    requestedDocumentsNote,
    assignedStaffId,
    assignedStaffName,
    adminUid,
    adminName,
    adminEmail,
    applicationSnapshot
  } = params;

  const nowIso = new Date().toISOString();
  const historyItem: UniversityApplicationStatusHistoryItem = {
    status,
    changedBy: adminEmail || adminUid,
    changedByName: adminName || 'Administrator',
    timestamp: nowIso,
    note:
      status === 'Documents Required' && requestedDocumentsNote
        ? `Documents Requested: ${requestedDocumentsNote}`
        : adminNotes
        ? adminNotes
        : `Status updated to ${status}`
  };

  let updated: UniversityApplicationRecord | null = null;

  try {
    const headers = await getAdminRequestHeaders({
      id: adminUid,
      fullName: adminName,
      email: adminEmail
    });
    const res = await fetch(
      `/api/admin/university-applications/${encodeURIComponent(applicationId)}/status`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status,
          adminNotes,
          requestedDocumentsNote,
          assignedStaffId,
          assignedStaffName,
          historyItem,
          applicationSnapshot
        })
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.application) {
        updated = data.application as UniversityApplicationRecord;
      }
    }
  } catch {
    // fallback
  }

  const prevHistory = applicationSnapshot?.statusHistory || [];
  const finalApp: UniversityApplicationRecord = updated || {
    ...(applicationSnapshot as UniversityApplicationRecord),
    id: applicationId,
    applicationId,
    status,
    adminNotes: adminNotes ?? applicationSnapshot?.adminNotes ?? '',
    requestedDocumentsNote:
      requestedDocumentsNote ?? applicationSnapshot?.requestedDocumentsNote ?? '',
    assignedStaffId: assignedStaffId ?? applicationSnapshot?.assignedStaffId ?? '',
    assignedStaffName: assignedStaffName ?? applicationSnapshot?.assignedStaffName ?? '',
    updatedAt: nowIso,
    statusHistory: [...prevHistory, historyItem]
  };

  try {
    if (auth.currentUser) {
      await updateDoc(
        doc(db, 'university_applications', applicationId),
        sanitizeFirestorePayload({
          status,
          adminNotes: finalApp.adminNotes || '',
          requestedDocumentsNote: finalApp.requestedDocumentsNote || '',
          assignedStaffId: finalApp.assignedStaffId || '',
          assignedStaffName: finalApp.assignedStaffName || '',
          updatedAt: nowIso,
          statusHistory: finalApp.statusHistory
        })
      );
    }
  } catch {
    // ignore
  }

  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: `APPLICATION_STATUS_${status.toUpperCase().replace(/\s+/g, '_')}`,
    targetUid: finalApp.userId,
    targetEmail: finalApp.studentEmail,
    details: `Updated application ${applicationId} (${finalApp.studentName} -> ${finalApp.universityName}, ${finalApp.programName}) to "${status}". ${
      assignedStaffName ? `Assigned to: ${assignedStaffName}.` : ''
    }`
  }).catch(() => {});

  // Notify student of status update
  if (finalApp.userId) {
    let notifTitle = `Application Status Updated: ${status}`;
    let notifMessage = `Your application (${applicationId}) for ${finalApp.universityName} (${finalApp.programName}) is now "${status}".`;
    let notifType: StudentNotification['type'] = 'info';

    if (status === 'Documents Required') {
      notifTitle = `Additional Documents Requested (${finalApp.universityName})`;
      notifMessage = requestedDocumentsNote
        ? `Admissions requested additional documents for ${finalApp.universityName}: ${requestedDocumentsNote}`
        : `Please upload the requested supporting documents for your ${finalApp.universityName} application.`;
      notifType = 'warning';
    } else if (status === 'Accepted') {
      notifTitle = `Congratulations! Application Accepted (${finalApp.universityName})`;
      notifMessage = `Your application (${applicationId}) to ${finalApp.universityName} (${finalApp.programName}) has been ACCEPTED!`;
      notifType = 'success';
    } else if (status === 'Rejected') {
      notifTitle = `Application Decision Update (${finalApp.universityName})`;
      notifMessage = `Your application (${applicationId}) to ${finalApp.universityName} has been updated to Rejected.${
        adminNotes ? ` Note: ${adminNotes}` : ''
      }`;
      notifType = 'error';
    }

    pushStudentPortalNotificationDoc(finalApp.userId, {
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      actionTab: 'applications'
    }).catch(() => {});
  }

  return finalApp;
}

// ============================================================================
// PART 5.6: ADMIN PROGRAM MANAGEMENT
// ============================================================================

export async function fetchAdminManagedProgramsDoc(): Promise<AdminManagedProgramRecord[]> {
  const merged = new Map<string, AdminManagedProgramRecord>();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/admin/programs', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.programs)) {
        for (const p of data.programs) {
          if (p?.id) merged.set(p.id, p);
        }
      }
    }
  } catch {
    // continue
  }

  try {
    const snap = await withTimeout(getDocs(collection(db, 'university_programs')), 3000);
    snap.docs.forEach(d => {
      const data = d.data() as any;
      if (data.programName && data.universityId) {
        const mapped: AdminManagedProgramRecord = {
          id: d.id,
          universityId: data.universityId,
          universityName: data.universityName || data.universityId,
          programName: data.programName,
          degreeLevel: data.degreeLevel || 'Bachelor',
          department: data.department || data.collegeOrFaculty || 'General Studies',
          languageOfInstruction: data.mediumOfInstruction || data.languageOfInstruction || 'English',
          tuitionPerSemesterKRW: Number(data.tuitionPerSemesterKRW || 3800000),
          applicationFeeKRW: Number(data.applicationFeeKRW || 100000),
          admissionRequirements: data.admissionRequirements || data.notes || 'Official Academic Transcripts & Passport Copy',
          languageRequirements: data.languageRequirements || 'TOPIK Level 3+ or IELTS 5.5+',
          availableIntakes: Array.isArray(data.availableIntakes)
            ? data.availableIntakes
            : [data.intakeSemester || 'Spring (March)', 'Fall (September)'],
          applicationDeadline: data.applicationDeadline || '2026-11-30',
          published: data.published !== false,
          updatedAt: data.updatedAt || new Date().toISOString()
        };
        if (!merged.has(d.id)) merged.set(d.id, mapped);
      }
    });
  } catch {
    // ignore
  }

  return Array.from(merged.values());
}

export async function saveAdminManagedProgramDoc(params: {
  program: AdminManagedProgramRecord;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): Promise<AdminManagedProgramRecord> {
  const { program, adminUid, adminName, adminEmail } = params;
  const nowIso = new Date().toISOString();
  const id = program.id || `prog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const saved: AdminManagedProgramRecord = {
    ...program,
    id,
    updatedAt: nowIso
  };

  try {
    const headers = await getAdminRequestHeaders({
      id: adminUid,
      fullName: adminName,
      email: adminEmail
    });
    await fetch('/api/admin/programs', {
      method: 'POST',
      headers,
      body: JSON.stringify(saved)
    });
  } catch {
    // continue
  }

  try {
    if (auth.currentUser) {
      await setDoc(
        doc(db, 'university_programs', id),
        sanitizeFirestorePayload({
          ...saved,
          mediumOfInstruction: saved.languageOfInstruction,
          collegeOrFaculty: saved.department,
          intakeSemester: saved.availableIntakes.join(', '),
          notes: saved.admissionRequirements
        }),
        { merge: true }
      );
    }
  } catch {
    // ignore
  }

  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: 'PROGRAM_SAVED',
    details: `Saved program "${saved.programName}" (${saved.degreeLevel}) linked to ${saved.universityName}.`
  }).catch(() => {});

  return saved;
}

export async function deleteAdminManagedProgramDoc(params: {
  programId: string;
  programName: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): Promise<boolean> {
  const { programId, programName, adminUid, adminName, adminEmail } = params;
  try {
    const headers = await getAdminRequestHeaders({
      id: adminUid,
      fullName: adminName,
      email: adminEmail
    });
    await fetch(`/api/admin/programs/${encodeURIComponent(programId)}`, {
      method: 'DELETE',
      headers
    });
  } catch {
    // continue
  }

  try {
    if (auth.currentUser) {
      await deleteDoc(doc(db, 'university_programs', programId));
    }
  } catch {
    // ignore
  }

  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: 'PROGRAM_DELETED',
    details: `Deleted program "${programName}" (${programId}).`
  }).catch(() => {});

  return true;
}

// ============================================================================
// PART 5.8: USER & STAFF RBAC MANAGEMENT
// ============================================================================

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRoleType, StaffPermissionKey[]> = {
  'Super Admin': [
    'manage_students',
    'view_passport_numbers',
    'manage_applications',
    'verify_documents',
    'manage_universities',
    'manage_programs',
    'manage_sim_applications',
    'manage_arrival_groups',
    'manage_community',
    'manage_staff',
    'manage_cms',
    'export_reports',
    'manage_settings',
    'view_audit_logs'
  ],
  Admin: [
    'manage_students',
    'view_passport_numbers',
    'manage_applications',
    'verify_documents',
    'manage_universities',
    'manage_programs',
    'manage_sim_applications',
    'manage_arrival_groups',
    'manage_community',
    'manage_cms',
    'export_reports',
    'view_audit_logs'
  ],
  Employee: [
    'manage_students',
    'manage_applications',
    'manage_sim_applications'
  ],
  'Content Manager': [
    'manage_cms',
    'manage_universities',
    'manage_programs',
    'export_reports'
  ],
  'SIM Manager': [
    'manage_students',
    'view_passport_numbers',
    'verify_documents',
    'manage_sim_applications',
    'manage_arrival_groups',
    'export_reports'
  ],
  'SIM Application Manager': [
    'manage_students',
    'view_passport_numbers',
    'verify_documents',
    'manage_sim_applications',
    'manage_arrival_groups',
    'export_reports'
  ],
  'Admission Manager': [
    'manage_students',
    'manage_applications',
    'verify_documents',
    'manage_universities',
    'manage_programs',
    'export_reports'
  ],
  'Student Counselor': [
    'manage_students',
    'manage_applications',
    'manage_universities',
    'manage_programs'
  ],
  'Document Verification Staff': [
    'manage_students',
    'view_passport_numbers',
    'verify_documents',
    'manage_sim_applications'
  ],
  'Community Moderator': [
    'manage_community',
    'manage_students',
    'view_audit_logs'
  ],
  'Support Staff': ['manage_students', 'manage_sim_applications', 'manage_cms'],
  'Regular User': []
};

export async function fetchStaffMembersDoc(): Promise<StaffMemberRecord[]> {
  const merged = new Map<string, StaffMemberRecord>();

  try {
    const headers = await getAdminRequestHeaders();
    const res = await fetch('/api/admin/staff', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.staff)) {
        for (const s of data.staff) {
          if (s?.id) merged.set(s.id, s);
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      const snap = await withTimeout(getDocs(collection(db, 'staff_members')), 3000);
      snap.docs.forEach(d => {
        const data = d.data() as StaffMemberRecord;
        if (!merged.has(d.id)) {
          merged.set(d.id, { ...data, id: d.id });
        }
      });
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values());
}

export async function saveStaffMemberDoc(params: {
  staff: StaffMemberRecord;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): Promise<StaffMemberRecord> {
  const { staff, adminUid, adminName, adminEmail } = params;
  const nowIso = new Date().toISOString();
  const id = staff.id || `staff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const saved: StaffMemberRecord = {
    ...staff,
    id,
    uid: staff.uid || id,
    email: staff.email.trim().toLowerCase(),
    updatedAt: nowIso,
    createdAt: staff.createdAt || nowIso
  };

  try {
    const headers = await getAdminRequestHeaders({
      id: adminUid,
      fullName: adminName,
      email: adminEmail
    });
    await fetch('/api/admin/staff', {
      method: 'POST',
      headers,
      body: JSON.stringify(saved)
    });
  } catch {
    // continue
  }

  try {
    if (auth.currentUser) {
      await setDoc(doc(db, 'staff_members', id), sanitizeFirestorePayload(saved), { merge: true });
    }
  } catch {
    // ignore
  }

  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: 'STAFF_PERMISSION_UPDATE',
    targetUid: saved.uid,
    targetEmail: saved.email,
    details: `Saved staff member "${saved.fullName}" (${saved.email}) with role "${saved.staffRole}" and status "${saved.status}".`
  }).catch(() => {});

  return saved;
}

export async function deleteStaffMemberDoc(params: {
  staffId: string;
  staffEmail: string;
  staffRecord?: StaffMemberRecord;
  deletionReason?: string;
  permanent?: boolean;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): Promise<boolean> {
  const { staffId, staffEmail, adminUid, adminName, adminEmail } = params;
  try {
    const headers = await getAdminRequestHeaders({
      id: adminUid,
      fullName: adminName,
      email: adminEmail
    });
    await fetch(`/api/admin/staff/${encodeURIComponent(staffId)}`, {
      method: 'DELETE',
      headers
    });
  } catch {
    // continue
  }

  try {
    if (auth.currentUser) {
      await deleteDoc(doc(db, 'staff_members', staffId));
    }
  } catch {
    // ignore
  }

  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: 'STAFF_REMOVED',
    targetEmail: staffEmail,
    details: `Removed staff account ${staffEmail} (${staffId}).`
  }).catch(() => {});

  return true;
}

// ============================================================================
// PART 5.9: CMS ANNOUNCEMENTS & CONTENT MANAGEMENT
// ============================================================================

export async function fetchCmsAnnouncementsDoc(): Promise<CmsAnnouncementRecord[]> {
  const merged = new Map<string, CmsAnnouncementRecord>();
  try {
    const res = await fetch('/api/cms/announcements');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.announcements)) {
        for (const a of data.announcements) {
          if (a?.id) merged.set(a.id, a);
        }
      }
    }
  } catch {
    // continue
  }

  try {
    const snap = await withTimeout(getDocs(collection(db, 'cms_announcements')), 2500);
    snap.docs.forEach(d => {
      const data = d.data() as CmsAnnouncementRecord;
      if (!merged.has(d.id)) merged.set(d.id, { ...data, id: d.id });
    });
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );
}

export async function saveCmsAnnouncementDoc(params: {
  announcement: CmsAnnouncementRecord;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): Promise<CmsAnnouncementRecord> {
  const { announcement, adminUid, adminName, adminEmail } = params;
  const nowIso = new Date().toISOString();
  const id = announcement.id || `ann_${Date.now()}`;
  const saved: CmsAnnouncementRecord = {
    ...announcement,
    id,
    createdBy: announcement.createdBy || adminEmail || adminName,
    createdAt: announcement.createdAt || nowIso,
    updatedAt: nowIso
  };

  try {
    const headers = await getAdminRequestHeaders({
      id: adminUid,
      fullName: adminName,
      email: adminEmail
    });
    await fetch('/api/cms/announcements', {
      method: 'POST',
      headers,
      body: JSON.stringify(saved)
    });
  } catch {
    // continue
  }

  try {
    if (auth.currentUser) {
      await setDoc(doc(db, 'cms_announcements', id), sanitizeFirestorePayload(saved), {
        merge: true
      });
    }
  } catch {
    // ignore
  }

  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: 'CMS_CONTENT_UPDATE',
    details: `Updated CMS item "${saved.title}" (${saved.category}) - Status: ${saved.status}.`
  }).catch(() => {});

  return saved;
}

export async function deleteCmsAnnouncementDoc(params: {
  id: string;
  title: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): Promise<boolean> {
  const { id, title, adminUid, adminName, adminEmail } = params;
  try {
    const headers = await getAdminRequestHeaders({
      id: adminUid,
      fullName: adminName,
      email: adminEmail
    });
    await fetch(`/api/cms/announcements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });
  } catch {
    // continue
  }

  try {
    if (auth.currentUser) {
      await deleteDoc(doc(db, 'cms_announcements', id));
    }
  } catch {
    // ignore
  }

  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: 'CMS_CONTENT_DELETE',
    details: `Deleted CMS announcement "${title}" (${id}).`
  }).catch(() => {});

  return true;
}

// ============================================================================
// PART 5.10 & 5.12: AUDITED CSV & EXCEL (.XLSX) EXPORT ENGINE
// ============================================================================

export function exportRecordsToCsvOrExcel(params: {
  filename: string;
  sheetName: string;
  rows: Record<string, any>[];
  format: 'csv' | 'xlsx';
  adminUid: string;
  adminName: string;
  adminEmail: string;
  exportCategory: string;
}): void {
  const {
    filename,
    sheetName,
    rows,
    format,
    adminUid,
    adminName,
    adminEmail,
    exportCategory
  } = params;

  const safeRows = rows.length > 0 ? rows : [{ Notice: 'No records matched current filter criteria' }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const cleanBaseName = filename.replace(/\.(csv|xlsx)$/i, '');
  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanBaseName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    XLSX.writeFile(workbook, `${cleanBaseName}.xlsx`);
  }

  // Record mandatory Audit Log for data export
  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: 'DATA_EXPORT',
    details: `Exported ${rows.length} records from "${exportCategory}" as ${format.toUpperCase()} (${cleanBaseName}.${format}).`
  }).catch(() => {});
}

// ============================================================================
// PART 5.13: GLOBAL TRASH / RECYCLE BIN CLIENT HELPERS
// ============================================================================

export async function fetchGlobalTrashItemsDoc(paramsOrAdmin?: {
  id?: string;
  uid?: string;
  fullName?: string;
  name?: string;
  email?: string;
  recordType?: string;
  trashStatus?: 'in_trash' | 'restored' | 'all';
  dateFrom?: string;
  dateTo?: string;
} | null): Promise<{
  items: GlobalTrashItem[];
  countsByType: Record<string, number>;
  totalInTrash: number;
}> {
  const merged = new Map<string, GlobalTrashItem>();

  try {
    const headers = await getAdminRequestHeaders(paramsOrAdmin as any);
    const res = await fetch('/api/admin/trash', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        for (const item of data.items) {
          const itemId = item?.TrashID || item?.id;
          const status = item?.TrashStatus || item?.trashStatus || 'in_trash';
          if (itemId && status === 'in_trash') {
            merged.set(itemId, item);
          }
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      const snap = await withTimeout(getDocs(collection(db, 'global_trash')), 2500);
      snap.docs.forEach(d => {
        const data = d.data() as GlobalTrashItem;
        const status = data?.TrashStatus || data?.trashStatus || 'in_trash';
        if (status === 'in_trash' && !merged.has(d.id)) {
          merged.set(d.id, { ...data, TrashID: d.id, id: d.id });
        }
      });
    }
  } catch {
    // ignore
  }

  let items = Array.from(merged.values()).sort((a, b) =>
    String(b.DeletedAt || b.deletedAt || '').localeCompare(String(a.DeletedAt || a.deletedAt || ''))
  );
  const countsByType: Record<string, number> = {};
  for (const item of items) {
    const rt = item.RecordType || item.recordType;
    countsByType[rt] = (countsByType[rt] || 0) + 1;
  }
  const totalInTrash = items.length;

  if (paramsOrAdmin?.recordType && paramsOrAdmin.recordType !== 'all') {
    items = items.filter(i => (i.RecordType || i.recordType) === paramsOrAdmin.recordType);
  }
  if (paramsOrAdmin?.dateFrom) {
    const fromTime = new Date(paramsOrAdmin.dateFrom).getTime();
    if (!Number.isNaN(fromTime)) {
      items = items.filter(i => new Date(i.DeletedAt || i.deletedAt).getTime() >= fromTime);
    }
  }
  if (paramsOrAdmin?.dateTo) {
    const toTime = new Date(paramsOrAdmin.dateTo).getTime() + 86400000;
    if (!Number.isNaN(toTime)) {
      items = items.filter(i => new Date(i.DeletedAt || i.deletedAt).getTime() <= toTime);
    }
  }

  return {
    items,
    countsByType,
    totalInTrash
  };
}

export async function moveRecordToGlobalTrashDoc(params: {
  recordType: GlobalTrashRecordType;
  originalCollection: string;
  originalDocumentId: string;
  title: string;
  subtitle?: string;
  originalData: Record<string, any>;
  storageFiles?: string[];
  deletionReason?: string;
  adminUser?: {
    id?: string;
    uid?: string;
    fullName?: string;
    name?: string;
    email?: string;
  } | null;
}): Promise<{ ok: boolean; trashItem?: GlobalTrashItem; error?: string }> {
  try {
    const headers = await getAdminRequestHeaders(params.adminUser as any);
    const res = await fetch('/api/admin/trash/move', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (data?.ok && data.trashItem) {
      try {
        if (auth.currentUser) {
          await setDoc(doc(db, 'global_trash', data.trashItem.TrashID || data.trashItem.id), data.trashItem, {
            merge: true
          });
        }
      } catch {
        // ignore
      }
      return { ok: true, trashItem: data.trashItem };
    }
    return { ok: false, error: data?.error || 'Could not move record to Global Trash.' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error moving record to Global Trash.' };
  }
}

export async function restoreRecordFromGlobalTrashDoc(params: {
  trashId: string;
  restoreNotes?: string;
  adminUid?: string;
  adminName?: string;
  adminEmail?: string;
  adminUser?: {
    id?: string;
    uid?: string;
    fullName?: string;
    name?: string;
    email?: string;
  } | null;
}): Promise<{ ok: boolean; message: string; restoredItem?: GlobalTrashItem }> {
  try {
    const headers = await getAdminRequestHeaders(
      (params.adminUser || {
        uid: params.adminUid,
        fullName: params.adminName,
        email: params.adminEmail
      }) as any
    );
    const res = await fetch('/api/admin/trash/restore', {
      method: 'POST',
      headers,
      body: JSON.stringify({ trashId: params.trashId, restoreNotes: params.restoreNotes })
    });
    const data = await res.json();
    if (data?.ok) {
      try {
        if (auth.currentUser) {
          await deleteDoc(doc(db, 'global_trash', params.trashId));
        }
      } catch {
        // ignore
      }
      return {
        ok: true,
        message: data.message || 'Record restored from Global Trash.',
        restoredItem: data.restoredItem
      };
    }
    return { ok: false, message: data?.message || 'Failed to restore record.' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to restore record.' };
  }
}

export async function permanentlyDeleteFromGlobalTrashDoc(params: {
  trashId: string;
  confirmationText?: string;
  confirmPermanentDelete?: boolean;
  confirmSensitiveRecord?: boolean;
  deletionReason?: string;
  adminUid?: string;
  adminName?: string;
  adminEmail?: string;
  adminUser?: {
    id?: string;
    uid?: string;
    fullName?: string;
    name?: string;
    email?: string;
  } | null;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const headers = await getAdminRequestHeaders(
      (params.adminUser || {
        uid: params.adminUid,
        fullName: params.adminName,
        email: params.adminEmail
      }) as any
    );
    const resolvedConfirmation =
      params.confirmationText ||
      (params.confirmPermanentDelete ? 'PERMANENTLY DELETE' : '');
    const res = await fetch(`/api/admin/trash/${encodeURIComponent(params.trashId)}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({
        confirmationText: resolvedConfirmation,
        deletionReason: params.deletionReason
      })
    });
    const data = await res.json();
    if (data?.ok) {
      try {
        if (auth.currentUser) {
          await deleteDoc(doc(db, 'global_trash', params.trashId));
        }
      } catch {
        // ignore
      }
      return { ok: true, message: data.message || 'Record permanently deleted.' };
    }
    return { ok: false, message: data?.message || 'Permanent deletion failed.' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Permanent deletion failed.' };
  }
}

// ============================================================================
// PART 5.14: INTERNAL EMPLOYEE & ADMIN PORTAL CLIENT HELPERS
// ============================================================================

const INTERNAL_SESSION_TOKEN_KEY = 'everykr_internal_portal_token_v1';
const INTERNAL_SESSION_EMPLOYEE_KEY = 'everykr_internal_portal_employee_v1';

export function getInternalPortalSessionToken(): string | null {
  try {
    return (
      sessionStorage.getItem(INTERNAL_SESSION_TOKEN_KEY) ||
      localStorage.getItem(INTERNAL_SESSION_TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

export function setInternalPortalSession(
  token: string | null,
  employee?: InternalAccessRequestRecord | null
): void {
  try {
    if (token) {
      sessionStorage.setItem(INTERNAL_SESSION_TOKEN_KEY, token);
      localStorage.setItem(INTERNAL_SESSION_TOKEN_KEY, token);
      setServerSessionToken(token);
    } else {
      sessionStorage.removeItem(INTERNAL_SESSION_TOKEN_KEY);
      localStorage.removeItem(INTERNAL_SESSION_TOKEN_KEY);
    }
    if (employee) {
      sessionStorage.setItem(INTERNAL_SESSION_EMPLOYEE_KEY, JSON.stringify(employee));
      localStorage.setItem(INTERNAL_SESSION_EMPLOYEE_KEY, JSON.stringify(employee));
    } else if (!token) {
      sessionStorage.removeItem(INTERNAL_SESSION_EMPLOYEE_KEY);
      localStorage.removeItem(INTERNAL_SESSION_EMPLOYEE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getCachedInternalPortalEmployee(): InternalAccessRequestRecord | null {
  try {
    const raw =
      sessionStorage.getItem(INTERNAL_SESSION_EMPLOYEE_KEY) ||
      localStorage.getItem(INTERNAL_SESSION_EMPLOYEE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InternalAccessRequestRecord;
  } catch {
    return null;
  }
}

export async function registerInternalEmployeeClient(payload: {
  fullName: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
  country: string;
  department: string;
  requestedPosition: StaffRoleType;
  employeeId?: string;
  password: string;
  additionalInfo?: string;
  photoURL?: string;
}): Promise<{
  ok: boolean;
  message: string;
  requestRecord?: InternalAccessRequestRecord;
  code?: string;
}> {
  let firebaseUid: string | undefined;
  try {
    ensureFirebaseAuthInitialized();
    const cred = await createUserWithEmailAndPassword(
      auth,
      payload.email.trim().toLowerCase(),
      payload.password
    );
    if (cred.user) {
      firebaseUid = cred.user.uid;
      await updateProfile(cred.user, {
        displayName: payload.fullName.trim()
      }).catch(() => {});
      // Sign out immediately because newly registered employees are PENDING APPROVAL
      await signOut(auth).catch(() => {});
    }
  } catch {
    // Continue with server-backed internal registration even if Firebase Auth email exists
  }

  const res = await fetch('/api/internal/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      uid: firebaseUid
    })
  });
  const data = await res.json();

  if (data?.ok && data.requestRecord) {
    try {
      await setDoc(
        doc(db, 'internal_access_requests', data.requestRecord.id),
        data.requestRecord,
        { merge: true }
      );
    } catch {
      // ignore Firestore client permission warning for unauthenticated pending employee
    }
  }

  return {
    ok: Boolean(data?.ok),
    message:
      data?.message ||
      (res.ok
        ? 'Your employee registration has been submitted and is pending administrator approval.'
        : 'Registration failed.'),
    requestRecord: data?.requestRecord,
    code: data?.code
  };
}

export async function loginInternalPortalClient(params: {
  email: string;
  password?: string;
  firebaseIdToken?: string;
}): Promise<{
  ok: boolean;
  httpStatus: number;
  status:
    | 'approved'
    | 'pending_approval'
    | 'rejected'
    | 'info_requested'
    | 'deactivated'
    | 'student_denied'
    | 'invalid_credentials';
  message: string;
  employee?: InternalAccessRequestRecord;
  sessionToken?: string;
  isSuperAdmin?: boolean;
}> {
  const res = await fetch('/api/internal/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));

  if (data?.ok && data.sessionToken && data.employee) {
    setInternalPortalSession(data.sessionToken, data.employee);
  } else {
    setInternalPortalSession(null, null);
  }

  return {
    ok: Boolean(data?.ok),
    httpStatus: res.status,
    status: data?.status || 'invalid_credentials',
    message: data?.message || 'Unable to sign in to the EveryKR Internal Portal.',
    employee: data?.employee,
    sessionToken: data?.sessionToken,
    isSuperAdmin: Boolean(data?.isSuperAdmin)
  };
}

export async function fetchInternalPortalSessionClient(): Promise<{
  ok: boolean;
  status: string;
  employee?: InternalAccessRequestRecord;
  isSuperAdmin?: boolean;
  message?: string;
}> {
  const token = getInternalPortalSessionToken() || getServerSessionToken();
  const cachedEmp = getCachedInternalPortalEmployee();
  if (!token && !cachedEmp?.email) {
    return { ok: false, status: 'unauthenticated' };
  }

  try {
    const res = await fetch(
      `/api/internal/auth/session${
        cachedEmp?.email ? `?email=${encodeURIComponent(cachedEmp.email)}` : ''
      }`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}`, 'x-internal-session-token': token } : {}),
          ...(cachedEmp?.email ? { 'x-user-email': cachedEmp.email } : {})
        }
      }
    );
    const data = await res.json();
    if (data?.ok && data.employee) {
      setInternalPortalSession(token, data.employee);
      return {
        ok: true,
        status: data.status || 'approved',
        employee: data.employee,
        isSuperAdmin: Boolean(data.isSuperAdmin),
        message: data.message
      };
    }
    setInternalPortalSession(null, null);
    return {
      ok: false,
      status: data?.status || 'unauthenticated',
      employee: data?.employee,
      message: data?.message
    };
  } catch {
    return { ok: false, status: 'network_error' };
  }
}

export async function logoutInternalPortalClient(): Promise<void> {
  const token = getInternalPortalSessionToken();
  setInternalPortalSession(null, null);
  try {
    await fetch('/api/internal/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ sessionToken: token })
    });
  } catch {
    // ignore
  }
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
}

export async function fetchAdminInternalAccessRequestsClient(adminUser?: {
  id?: string;
  uid?: string;
  fullName?: string;
  name?: string;
  email?: string;
} | null): Promise<InternalAccessRequestRecord[]> {
  const merged = new Map<string, InternalAccessRequestRecord>();
  try {
    const headers = await getAdminRequestHeaders(adminUser as any);
    const res = await fetch('/api/admin/internal-requests', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.requests)) {
        for (const r of data.requests) {
          if (r?.id) merged.set(r.id, r);
        }
      }
    }
  } catch {
    // continue
  }

  try {
    if (await isCurrentFirebaseUserAuthorizedAdmin()) {
      const snap = await withTimeout(getDocs(collection(db, 'internal_access_requests')), 2500);
      snap.docs.forEach(d => {
        const data = d.data() as InternalAccessRequestRecord;
        if (data?.email && !merged.has(d.id)) {
          merged.set(d.id, { ...data, id: d.id });
        }
      });
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  );
}

export async function submitAdminInternalRequestDecisionClient(params: {
  requestId: string;
  decision: 'approve' | 'reject' | 'info_requested' | 'deactivate' | 'reactivate';
  assignedDepartment?: string;
  assignedRole?: StaffRoleType;
  employeeId?: string;
  permissions?: StaffPermissionKey[];
  rejectionReason?: string;
  infoRequestMessage?: string;
  adminUser?: {
    id?: string;
    uid?: string;
    fullName?: string;
    name?: string;
    email?: string;
  } | null;
}): Promise<{
  ok: boolean;
  message: string;
  requestRecord?: InternalAccessRequestRecord;
  emailDispatched?: boolean;
  emailSubject?: string;
}> {
  try {
    const headers = await getAdminRequestHeaders(params.adminUser as any);
    const res = await fetch(
      `/api/admin/internal-requests/${encodeURIComponent(params.requestId)}/decision`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          decision: params.decision,
          assignedDepartment: params.assignedDepartment,
          assignedRole: params.assignedRole,
          employeeId: params.employeeId,
          permissions: params.permissions,
          rejectionReason: params.rejectionReason,
          infoRequestMessage: params.infoRequestMessage
        })
      }
    );
    const data = await res.json();
    if (data?.ok && data.requestRecord) {
      try {
        if (auth.currentUser) {
          await setDoc(
            doc(db, 'internal_access_requests', data.requestRecord.id),
            data.requestRecord,
            { merge: true }
          );
          if (data.staffMember) {
            await setDoc(doc(db, 'staff_members', data.staffMember.id), data.staffMember, {
              merge: true
            });
          }
        }
      } catch {
        // ignore
      }
    }
    return {
      ok: Boolean(data?.ok),
      message: data?.message || (res.ok ? 'Decision saved.' : 'Action failed.'),
      requestRecord: data?.requestRecord,
      emailDispatched: Boolean(data?.emailDispatched),
      emailSubject: data?.emailSubject
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || 'Network error while updating employee request.'
    };
  }
}





