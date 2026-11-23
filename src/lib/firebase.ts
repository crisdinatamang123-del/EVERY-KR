import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  Auth,
  ActionCodeSettings,
  GoogleAuthProvider,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Canonical Production Firebase Web App Configuration for EveryKR ("everykr", Project Number: 926172198407)
export const OFFICIAL_EVERYKR_ORIGIN = 'https://everykr.com';
export const OFFICIAL_INTERNAL_EVERYKR_ORIGIN = 'https://internal.everykr.com';
export const OFFICIAL_EVERYKR_LOGIN_URL = 'https://everykr.com/login';
export const OFFICIAL_EVERYKR_REGISTER_URL = 'https://everykr.com/register';
export const OFFICIAL_EVERYKR_SETTINGS_URL = 'https://everykr.com/settings';
export const OFFICIAL_PASSWORD_RESET_ACTION_URL = 'https://everykr.com/reset-password';
export const OFFICIAL_INTERNAL_LOGIN_URL = 'https://internal.everykr.com/login';
export const OFFICIAL_INTERNAL_REGISTER_URL = 'https://internal.everykr.com/register';

const NON_CANONICAL_PRODUCTION_HOST_PATTERNS = [
  /^www\.everykr\.com$/i,
  /^everykr\.(firebaseapp\.com|web\.app)$/i,
  /^everykr-everything-korea-one-platform(-[a-z0-9-]+)?\.(run\.app|ai\.studio)$/i,
  /^everykr-everything-korea-one-platform-[0-9]+\.[a-z0-9-]+\.run\.app$/i,
];

/**
 * Checks if the current hostname is the official Internal Employee & Admin Portal domain (`internal.everykr.com`).
 */
export function isInternalPortalHostname(rawHostname?: unknown): boolean {
  const host = String(
    rawHostname !== undefined
      ? rawHostname
      : typeof window !== 'undefined'
      ? window.location.hostname
      : ''
  )
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  return host === 'internal.everykr.com' || host.startsWith('internal.everykr.');
}

/**
 * Determines whether the current request/route is operating inside the Internal Employee & Admin Portal
 * (`https://internal.everykr.com` or `/internal/*` or `?portal=internal`).
 */
export function isInternalPortalContext(
  pathname?: string,
  search?: string,
  hostname?: string
): boolean {
  if (isInternalPortalHostname(hostname)) {
    return true;
  }
  const cleanPath = String(
    pathname !== undefined
      ? pathname
      : typeof window !== 'undefined'
      ? window.location.pathname
      : ''
  ).trim();
  if (cleanPath === '/internal' || cleanPath.startsWith('/internal/')) {
    return true;
  }
  const cleanSearch = String(
    search !== undefined
      ? search
      : typeof window !== 'undefined'
      ? window.location.search
      : ''
  );
  if (cleanSearch) {
    try {
      const params = new URLSearchParams(cleanSearch);
      if (params.get('portal') === 'internal') return true;
    } catch {
      // ignore
    }
  }
  return false;
}

/**
 * Identifies whether a browser or request hostname is a non-canonical production alias
 * (such as `www.everykr.com`, `everykr.firebaseapp.com`, `everykr.web.app`, or the
 * production Cloud Run service URL) that must redirect to `https://everykr.com` so
 * Google Chrome Password Manager always associates credentials with `everykr.com`.
 * Note: `internal.everykr.com` is an official canonical domain and is NEVER redirected.
 */
export function isNonCanonicalProductionHostname(rawHostname: unknown): boolean {
  const host = String(rawHostname || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  if (
    !host ||
    host === 'everykr.com' ||
    host === 'internal.everykr.com' ||
    host.startsWith('internal.everykr.') ||
    host === 'localhost' ||
    host === '127.0.0.1'
  ) {
    return false;
  }
  return NON_CANONICAL_PRODUCTION_HOST_PATTERNS.some((re) => re.test(host));
}

/**
 * Builds an absolute URL on the official `https://everykr.com` origin.
 */
export function buildCanonicalEveryKrUrl(pathnameAndSearch = '/'): string {
  const raw = String(pathnameAndSearch || '/').trim();
  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  return `${OFFICIAL_EVERYKR_ORIGIN}${normalizedPath}`;
}

/**
 * Resolves the safe continue URL for Firebase Password Reset emails.
 * Always returns the canonical production login URL (`https://everykr.com/login`)
 * and never uses temporary Cloud Run or Firebase domains.
 */
export function resolveEveryKrLoginContinueUrl(): string {
  return OFFICIAL_EVERYKR_LOGIN_URL;
}

/**
 * Builds Firebase ActionCodeSettings for sendPasswordResetEmail().
 * Uses Firebase's secure email action handler (handleCodeInApp: false)
 * and redirects back to the official https://everykr.com/login page.
 */
export function getEveryKrPasswordResetActionCodeSettings(): ActionCodeSettings {
  return {
    url: OFFICIAL_EVERYKR_LOGIN_URL,
    handleCodeInApp: false
  };
}

export const everyKrActionCodeSettings: ActionCodeSettings = {
  url: OFFICIAL_EVERYKR_LOGIN_URL,
  handleCodeInApp: false
};


/**
 * Sanitizes any environment variable value by:
 * 1. Stripping accidental "KEY_NAME=" prefixes (e.g. "VITE_FIREBASE_API_KEY=AIza...")
 * 2. Rejecting any legacy project values so the canonical "everykr" (926172198407)
 *    configuration from firebase-applet-config.json is always used.
 */
function sanitizeEveryKrEnvValue(rawVal: unknown, fallback: string): string {
  if (typeof rawVal !== 'string') return fallback;
  let cleaned = rawVal.trim();
  if (!cleaned) return fallback;

  // Strip accidental "VITE_FIREBASE_*=" key prefixes in secret values
  const eqIdx = cleaned.indexOf('=');
  if (eqIdx > 0 && /^VITE_FIREBASE_[A-Z0-9_]+$/i.test(cleaned.slice(0, eqIdx).trim())) {
    cleaned = cleaned.slice(eqIdx + 1).trim();
  }
  // Remove surrounding quotes if present
  cleaned = cleaned.replace(/^["']+|["']+$/g, '').trim();

  // Reject any legacy non-everykr project values or mismatched API keys
  if (
    !cleaned ||
    cleaned.includes('wecare') ||
    cleaned.includes('296330197038') ||
    (fallback.startsWith('AIza') && cleaned !== fallback)
  ) {
    return fallback;
  }

  return cleaned;
}

const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

export const firebaseConfig = {
  apiKey: sanitizeEveryKrEnvValue(
    viteEnv.VITE_FIREBASE_API_KEY,
    firebaseAppletConfig.apiKey || 'AIzaSyAgJyMMBxCO6GZgSsh7a6xMolDs7JzTscQ'
  ),
  authDomain: sanitizeEveryKrEnvValue(
    viteEnv.VITE_FIREBASE_AUTH_DOMAIN,
    firebaseAppletConfig.authDomain || 'everykr.firebaseapp.com'
  ),
  projectId: sanitizeEveryKrEnvValue(
    viteEnv.VITE_FIREBASE_PROJECT_ID,
    firebaseAppletConfig.projectId || 'everykr'
  ),
  storageBucket: sanitizeEveryKrEnvValue(
    viteEnv.VITE_FIREBASE_STORAGE_BUCKET,
    firebaseAppletConfig.storageBucket || 'everykr.firebasestorage.app'
  ),
  messagingSenderId: sanitizeEveryKrEnvValue(
    viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppletConfig.messagingSenderId || '926172198407'
  ),
  appId: sanitizeEveryKrEnvValue(
    viteEnv.VITE_FIREBASE_APP_ID,
    firebaseAppletConfig.appId || '1:926172198407:web:eb679714ecb801edd99ca2'
  ),
  measurementId: sanitizeEveryKrEnvValue(
    viteEnv.VITE_FIREBASE_MEASUREMENT_ID,
    firebaseAppletConfig.measurementId || 'G-FPCP0M668Y'
  ),
  firestoreDatabaseId:
    firebaseAppletConfig.firestoreDatabaseId ||
    'ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f'
};

// Initialize Firebase App only once (Singleton pattern)
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Standard Firebase Service Instances (singleton Auth with synchronous localStorage persistence first so cold boot never stalls on IndexedDB)
export const auth: Auth = (() => {
  if (typeof window === 'undefined') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: [
        browserLocalPersistence,
        indexedDBLocalPersistence,
        browserSessionPersistence
      ],
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch {
    return getAuth(app);
  }
})();
export const db: Firestore = (() => {
  try {
    return initializeFirestore(
      app,
      { ignoreUndefinedProperties: true },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
})();
export const storage: FirebaseStorage = (() => {
  const bucketUrl = firebaseConfig.storageBucket
    ? `gs://${firebaseConfig.storageBucket.replace(/^gs:\/\//, '')}`
    : undefined;
  const instance = getStorage(app, bucketUrl);
  // Prevent @firebase/storage's default 600,000ms (10-minute) silent retry loop from hiding
  // bucket/rules/CORS errors behind a generic client stall timeout.
  instance.maxUploadRetryTime = 12_000;
  instance.maxOperationRetryTime = 10_000;
  return instance;
})();

/**
 * Checks whether an object is a special Firestore sentinel or native instance (e.g., serverTimestamp(), increment(), Date, Timestamp)
 * that should be passed directly to the Firestore SDK without object-key cloning.
 */
function isFirestoreSentinel(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;
  if (val instanceof Date) return true;
  const anyVal = val as Record<string, any>;
  if (typeof anyVal._methodName === 'string') return true;
  const ctorName = val.constructor?.name || '';
  if (
    ctorName.includes('FieldValue') ||
    ctorName.includes('Timestamp') ||
    ctorName.includes('GeoPoint') ||
    ctorName.includes('DocumentReference') ||
    ctorName.includes('Bytes')
  ) {
    return true;
  }
  return false;
}

/**
 * Reusable deep sanitizer for Firestore payloads.
 * Removes `undefined` values from objects and arrays while preserving valid falsy values
 * such as `0`, `false`, `""`, empty arrays `[]`, `null`, `Date` instances, and Firestore `FieldValue` sentinels.
 */
export function sanitizeFirestorePayload<T>(value: T): T {
  if (value === undefined) {
    return undefined as unknown as T;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (isFirestoreSentinel(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestorePayload(item)) as unknown as T;
  }

  const sanitizedObj: Record<string, any> = {};
  for (const [key, val] of Object.entries(value as Record<string, any>)) {
    if (val === undefined) {
      continue;
    }
    const cleanedVal = sanitizeFirestorePayload(val);
    if (cleanedVal !== undefined) {
      sanitizedObj[key] = cleanedVal;
    }
  }
  return sanitizedObj as T;
}

// Google Authentication Provider Configuration
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('profile');
googleAuthProvider.addScope('email');
googleAuthProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Ensures Firebase Auth initialization is complete before running sensitive operations
 * such as `verifyPasswordResetCode()` or `confirmPasswordReset()`, while preventing
 * blocked IndexedDB (e.g. in mobile email WebViews or private browsing) from hanging
 * `@firebase/app` heartbeat headers or Auth state readiness indefinitely.
 */
export async function ensureFirebaseAuthInitialized(timeoutMs = 2500): Promise<Auth> {
  // 1. Guard @firebase/app HeartbeatServiceImpl against stalled IndexedDB open() in restricted WebViews
  try {
    const hbProvider = (auth as any)?.heartbeatServiceProvider;
    const hbService =
      hbProvider && typeof hbProvider.getImmediate === 'function'
        ? hbProvider.getImmediate({ optional: true })
        : null;
    if (hbService && hbService._heartbeatsCache == null && hbService._heartbeatsCachePromise) {
      await Promise.race([
        Promise.resolve(hbService._heartbeatsCachePromise).catch(() => null),
        new Promise<void>((resolve) => setTimeout(resolve, 800))
      ]);
      if (hbService._heartbeatsCache == null) {
        hbService._heartbeatsCache = { heartbeats: [] };
        hbService._heartbeatsCachePromise = Promise.resolve({ heartbeats: [] });
      }
    }
  } catch {
    // Non-fatal guard; proceed with standard Auth instance
  }

  // 2. Wait for authStateReady() bounded by timeoutMs so Auth config & persistence are ready
  if (typeof (auth as any).authStateReady === 'function') {
    await Promise.race([
      (auth as any).authStateReady().catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  }

  return auth;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Operation Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Connection verification helper
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await withTimeout(getDocFromServer(doc(db, '_connection_test', 'status')), 3000);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline, using cached/resilient local state.');
      return false;
    }
    return true;
  }
}

/**
 * Wraps any async Firebase/Firestore operation with a strict timeout so the UI never hangs indefinitely.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage = 'Operation timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Detects Android mobile browsers or embedded in-app WebViews where OAuth popups may be restricted.
 */
export function isAndroidOrMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

// Validate Firestore connection on initial boot
testFirestoreConnection().catch(() => {});

export default app;
