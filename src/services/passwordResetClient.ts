import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  auth,
  firebaseConfig,
  ensureFirebaseAuthInitialized,
  OFFICIAL_EVERYKR_LOGIN_URL,
  OFFICIAL_EVERYKR_SETTINGS_URL,
  resolveEveryKrLoginContinueUrl,
  withTimeout,
} from '../lib/firebase';

export const FIREBASE_RESET_VERIFY_TIMEOUT_MS = 15000;
export const FIREBASE_RESET_CONFIRM_TIMEOUT_MS = 15000;

export const SESSION_PENDING_RESET_STORAGE_KEY = 'everykr_pending_reset_oob_v2';
const LEGACY_PENDING_RESET_STORAGE_KEY = 'everykr_pending_reset_oob';
const SESSION_CONSUMED_RESET_HASHES_KEY = 'everykr_consumed_reset_hashes_v1';
export const SESSION_LAST_RESET_EMAIL_KEY = 'everykr_last_reset_email_v1';
export const SESSION_RESET_MAX_AGE_MS = 15 * 60 * 1000; // 15-minute reload preservation window
const SESSION_RESET_EMAIL_MAX_AGE_MS = 60 * 60 * 1000; // 1-hour Firebase reset code lifetime

export type PasswordResetVerifyStatus =
  | 'valid'
  | 'expired_token'
  | 'already_used'
  | 'invalid_token'
  | 'missing_token'
  | 'timeout'
  | 'network_error'
  | 'user_disabled'
  | 'configuration_error';

export interface PasswordResetVerifyResult {
  ok: boolean;
  code?: string;
  status: PasswordResetVerifyStatus;
  message: string;
  email?: string;
  maskedEmail?: string;
  mode?: 'firebase_oob';
  retryable?: boolean;
}

export interface PasswordResetConfirmResult {
  ok: boolean;
  code?: string;
  status: string;
  message: string;
  continueUrl?: string;
  retryable?: boolean;
}

export interface PasswordResetTestOverrides {
  verifyCodeFn?: (oobCode: string) => Promise<string>;
  confirmResetFn?: (oobCode: string, newPassword: string) => Promise<void>;
  fetchFn?: typeof fetch;
  ensureAuthReadyFn?: () => Promise<unknown>;
  timeoutMs?: number;
  enableInFlightDedupe?: boolean;
}

export interface CapturedResetLinkResult {
  kind: 'captured_code' | 'restored_from_session' | 'malformed_code' | 'missing_code' | 'no_code';
  oobCode: string;
  shouldScrubUrl: boolean;
  errorCode?: string;
}

export interface MinimalSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// In-memory fallback set of non-reversible oobCode fingerprints consumed in this runtime
const consumedOobFingerprintsMemory = new Set<string>();

// Deduplicates concurrent/StrictMode verification calls per oobCode without caching failures across retries
const inFlightVerifyByOobCode = new Map<string, Promise<PasswordResetVerifyResult>>();

export function maskEmailAddressForDisplay(rawEmail: string): string {
  const clean = String(rawEmail || '').trim().toLowerCase();
  const atIdx = clean.indexOf('@');
  if (atIdx <= 0) return '';
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Validates that an extracted oobCode is structurally plausible before contacting Firebase.
 * Rejects empty strings, truncated fragments, whitespace, and HTML/quote injection characters.
 */
export function isWellFormedOobCode(rawCode: string): boolean {
  const trimmed = String(rawCode || '').trim();
  if (trimmed.length < 10 || trimmed.length > 1024) {
    return false;
  }
  if (/[\s<>"'`\\]/.test(trimmed)) {
    return false;
  }
  return true;
}

/**
 * Computes a deterministic, non-reversible fingerprint of an oobCode so consumed one-time codes
 * can be recognized as "already used" if re-opened in the same session without storing the raw code.
 */
function computeOobCodeFingerprint(oobCode: string): string {
  const input = `everykr_reset_v1:${oobCode}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `fp_${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function getSafeSessionStorage(overrideStorage?: MinimalSessionStorage | null): MinimalSessionStorage | null {
  if (overrideStorage) return overrideStorage;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Restricted WebView or private mode storage guard
  }
  return null;
}

export function markResetCodeConsumedInSession(
  oobCode: string,
  storageOverride?: MinimalSessionStorage | null
): void {
  const clean = String(oobCode || '').trim();
  if (!clean) return;
  const fp = computeOobCodeFingerprint(clean);
  consumedOobFingerprintsMemory.add(fp);

  const store = getSafeSessionStorage(storageOverride);
  if (!store) return;
  try {
    const existingRaw = store.getItem(SESSION_CONSUMED_RESET_HASHES_KEY);
    const parsed: string[] = existingRaw ? JSON.parse(existingRaw) : [];
    const list = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    if (!list.includes(fp)) {
      list.push(fp);
    }
    store.setItem(SESSION_CONSUMED_RESET_HASHES_KEY, JSON.stringify(list.slice(-25)));
  } catch {
    // Ignore storage write errors
  }
}

export function wasResetCodeConsumedInSession(
  oobCode: string,
  storageOverride?: MinimalSessionStorage | null
): boolean {
  const clean = String(oobCode || '').trim();
  if (!clean) return false;
  const fp = computeOobCodeFingerprint(clean);
  if (consumedOobFingerprintsMemory.has(fp)) {
    return true;
  }

  const store = getSafeSessionStorage(storageOverride);
  if (!store) return false;
  try {
    const existingRaw = store.getItem(SESSION_CONSUMED_RESET_HASHES_KEY);
    if (!existingRaw) return false;
    const parsed = JSON.parse(existingRaw);
    return Array.isArray(parsed) && parsed.includes(fp);
  } catch {
    return false;
  }
}

export function clearConsumedResetCodesForTesting(): void {
  consumedOobFingerprintsMemory.clear();
}

export function clearStoredPendingResetCode(storageOverride?: MinimalSessionStorage | null): void {
  const store = getSafeSessionStorage(storageOverride);
  if (!store) return;
  try {
    store.removeItem(SESSION_PENDING_RESET_STORAGE_KEY);
    store.removeItem(LEGACY_PENDING_RESET_STORAGE_KEY);
  } catch {
    // Ignore storage privacy restrictions
  }
}

export function saveLastRequestedResetEmailInSession(
  email: string,
  storageOverride?: MinimalSessionStorage | null
): void {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) return;
  const store = getSafeSessionStorage(storageOverride);
  if (!store) return;
  try {
    store.setItem(
      SESSION_LAST_RESET_EMAIL_KEY,
      JSON.stringify({ email: cleanEmail, savedAt: Date.now() })
    );
  } catch {
    // Ignore storage restrictions
  }
}

export function getLastRequestedResetEmailFromSession(
  storageOverride?: MinimalSessionStorage | null
): string | null {
  const store = getSafeSessionStorage(storageOverride);
  if (!store) return null;
  try {
    const raw = store.getItem(SESSION_LAST_RESET_EMAIL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; savedAt?: number };
    const cleanEmail = String(parsed?.email || '').trim().toLowerCase();
    if (
      cleanEmail &&
      cleanEmail.includes('@') &&
      typeof parsed?.savedAt === 'number' &&
      Date.now() - parsed.savedAt < SESSION_RESET_EMAIL_MAX_AGE_MS
    ) {
      return cleanEmail;
    }
    store.removeItem(SESSION_LAST_RESET_EMAIL_KEY);
  } catch {
    // Ignore storage read errors
  }
  return null;
}

async function resolveRegisteredEmailFromServerOobCode(
  cleanOobCode: string,
  fetchImpl: typeof fetch
): Promise<string | null> {
  if (typeof window === 'undefined' && fetchImpl === fetch) {
    return null;
  }
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 2500) : null;
  try {
    const res = await fetchImpl('/api/auth/firebase-password-reset/resolve-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ oobCode: cleanOobCode }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!res.ok) return null;
    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      email?: string;
    } | null;
    const resolved = String(payload?.email || '').trim().toLowerCase();
    return resolved && resolved.includes('@') ? resolved : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Reads and preserves the original `oobCode` from `window.location.search` BEFORE any URL scrubbing.
 * - Explicitly detects missing (`?oobCode=`) or malformed codes (`?oobCode=short` or wrong `mode`).
 * - Persists valid codes to `sessionStorage` (15-min TTL) so reloading during verification or before
 *   submitting never loses the code after `history.replaceState` removes `?oobCode=...` from the URL bar.
 * - Clears stale stored codes when navigating internally (`PUSH` without query params, e.g. "Forgot Password?").
 */
export function captureInitialResetLinkFromSearch(
  rawSearch: string,
  options?: {
    isInternalPushWithoutSearch?: boolean;
    storage?: MinimalSessionStorage | null;
    nowMs?: number;
  }
): CapturedResetLinkResult {
  const store = getSafeSessionStorage(options?.storage);
  const now = options?.nowMs ?? Date.now();
  const normalizedSearch = String(rawSearch || '').trim();

  if (normalizedSearch && normalizedSearch !== '?') {
    const queryString = normalizedSearch.startsWith('?')
      ? normalizedSearch.slice(1)
      : normalizedSearch;
    const params = new URLSearchParams(queryString);
    const hasOobParam = params.has('oobCode') || params.has('token');
    const rawMode = (params.get('mode') || '').trim();

    if (rawMode && rawMode !== 'resetPassword') {
      clearStoredPendingResetCode(store);
      return {
        kind: 'malformed_code',
        oobCode: '',
        shouldScrubUrl: true,
        errorCode: 'auth/invalid-action-code',
      };
    }

    if (hasOobParam) {
      const rawCode = (params.get('oobCode') ?? params.get('token') ?? '').trim();
      if (!rawCode) {
        clearStoredPendingResetCode(store);
        return {
          kind: 'missing_code',
          oobCode: '',
          shouldScrubUrl: true,
          errorCode: 'auth/missing-action-code',
        };
      }

      if (!isWellFormedOobCode(rawCode)) {
        clearStoredPendingResetCode(store);
        return {
          kind: 'malformed_code',
          oobCode: '',
          shouldScrubUrl: true,
          errorCode: 'auth/invalid-action-code',
        };
      }

      if (store) {
        try {
          store.setItem(
            SESSION_PENDING_RESET_STORAGE_KEY,
            JSON.stringify({ oobCode: rawCode, savedAt: now })
          );
          store.removeItem(LEGACY_PENDING_RESET_STORAGE_KEY);
        } catch {
          // Ignore sessionStorage restrictions; in-memory state still preserves rawCode
        }
      }

      return {
        kind: 'captured_code',
        oobCode: rawCode,
        shouldScrubUrl: true,
      };
    }
  }

  // No oobCode in URL query string:
  // If the user navigated here via an in-app link (e.g. clicking "Forgot Password?"), open request mode cleanly.
  if (options?.isInternalPushWithoutSearch) {
    clearStoredPendingResetCode(store);
    return {
      kind: 'no_code',
      oobCode: '',
      shouldScrubUrl: false,
    };
  }

  // Otherwise (e.g. page reload while verification was in flight after URL bar was scrubbed),
  // restore the pending oobCode from sessionStorage if within the 15-minute window.
  if (store) {
    try {
      const rawStored = store.getItem(SESSION_PENDING_RESET_STORAGE_KEY);
      if (rawStored) {
        const parsed = JSON.parse(rawStored) as { oobCode?: string; savedAt?: number };
        const storedCode = String(parsed?.oobCode || '').trim();
        if (
          isWellFormedOobCode(storedCode) &&
          typeof parsed?.savedAt === 'number' &&
          now - parsed.savedAt < SESSION_RESET_MAX_AGE_MS
        ) {
          return {
            kind: 'restored_from_session',
            oobCode: storedCode,
            shouldScrubUrl: false,
          };
        }
        store.removeItem(SESSION_PENDING_RESET_STORAGE_KEY);
      }
    } catch {
      // Ignore storage read errors
    }
  }

  return {
    kind: 'no_code',
    oobCode: '',
    shouldScrubUrl: false,
  };
}

/**
 * Fallback verification against Firebase Identity Toolkit `accounts:resetPassword` (`{ oobCode }`)
 * ONLY when `@firebase/auth` `verifyPasswordResetCode()` throws `auth/internal-error`.
 *
 * Why this is needed:
 * When Firebase Email Enumeration Protection is enabled on project `everykr`, Google Identity Toolkit's
 * `POST /v1/accounts:resetPassword` (`{ oobCode }`) returns HTTP 200 `{ "requestType": "PASSWORD_RESET" }`
 * with `email` omitted for privacy. `@firebase/auth`'s `checkActionCode()` runs
 * `_assert(response.email, auth, "internal-error")`, throwing `auth/internal-error` on a valid reset code!
 * Inspecting the authoritative Identity Toolkit response directly preserves full Firebase action-code
 * verification without exposing secrets or falsely rejecting valid reset links.
 */
async function verifyViaIdentityToolkitOnRedactedEmail(
  cleanOobCode: string,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<PasswordResetVerifyResult> {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${encodeURIComponent(
    firebaseConfig.apiKey
  )}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), Math.min(timeoutMs, 10000)) : null;

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ oobCode: cleanOobCode }),
      ...(controller ? { signal: controller.signal } : {}),
    });

    const data = (await response.json().catch(() => null)) as {
      email?: string;
      requestType?: string;
      error?: { message?: string };
    } | null;

    if (response.ok && data && (data.requestType === 'PASSWORD_RESET' || typeof data.email === 'string')) {
      if (data.requestType && data.requestType !== 'PASSWORD_RESET') {
        return {
          ok: false,
          code: 'auth/invalid-action-code',
          status: 'invalid_token',
          message: 'This link is not a valid EveryKR password reset link.',
          retryable: false,
        };
      }
      let resolvedEmail =
        typeof data.email === 'string' && data.email.trim().includes('@')
          ? data.email.trim().toLowerCase()
          : '';
      if (!resolvedEmail) {
        const serverEmail = await resolveRegisteredEmailFromServerOobCode(cleanOobCode, fetchImpl);
        resolvedEmail = serverEmail || getLastRequestedResetEmailFromSession() || '';
      }
      if (resolvedEmail) {
        saveLastRequestedResetEmailInSession(resolvedEmail);
      }

      return {
        ok: true,
        status: 'valid',
        message: 'Password reset link verified.',
        email: resolvedEmail || undefined,
        maskedEmail: resolvedEmail ? maskEmailAddressForDisplay(resolvedEmail) : undefined,
        mode: 'firebase_oob',
        retryable: false,
      };
    }

    const apiErrMsg = String(data?.error?.message || '').toUpperCase();
    if (apiErrMsg.includes('EXPIRED_OOB_CODE')) {
      return {
        ok: false,
        code: 'auth/expired-action-code',
        status: 'expired_token',
        message: 'This password reset link has expired. Please request a new password reset email.',
        retryable: false,
      };
    }
    if (apiErrMsg.includes('USER_DISABLED')) {
      return {
        ok: false,
        code: 'auth/user-disabled',
        status: 'user_disabled',
        message: 'This account has been disabled. Please contact EveryKR support.',
        retryable: false,
      };
    }
    if (apiErrMsg.includes('PASSWORD_LOGIN_DISABLED') || apiErrMsg.includes('OPERATION_NOT_ALLOWED')) {
      return {
        ok: false,
        code: 'auth/operation-not-allowed',
        status: 'configuration_error',
        message:
          'Email/Password authentication is currently disabled in Firebase Console (everykr > Authentication > Sign-in method).',
        retryable: false,
      };
    }
    if (apiErrMsg.includes('INVALID_OOB_CODE')) {
      if (wasResetCodeConsumedInSession(cleanOobCode)) {
        return {
          ok: false,
          code: 'auth/already-used-action-code',
          status: 'already_used',
          message:
            'This password reset link has already been used. Each reset link works only once — please request a new password reset email.',
          retryable: false,
        };
      }
      return {
        ok: false,
        code: 'auth/invalid-action-code',
        status: 'invalid_token',
        message: 'This password reset link is invalid. Please request a new password reset email.',
        retryable: false,
      };
    }

    if (response.status >= 500 || response.status === 429) {
      return {
        ok: false,
        code: 'auth/network-request-failed',
        status: 'network_error',
        message:
          'Temporary service issue while verifying your password reset link. Please retry verification in a moment.',
        retryable: true,
      };
    }

    return {
      ok: false,
      code: 'auth/invalid-action-code',
      status: 'invalid_token',
      message: 'This password reset link is invalid. Please request a new password reset email.',
      retryable: false,
    };
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort');
    return {
      ok: false,
      code: isAbort ? 'auth/verification-timeout' : 'auth/network-request-failed',
      status: isAbort ? 'timeout' : 'network_error',
      message: isAbort
        ? 'Verification timed out while contacting Firebase Authentication. Your reset link is still intact — please click Retry Verification.'
        : 'Network error while verifying password reset link. Please check your internet connection and retry.',
      retryable: true,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Verifies a Firebase password reset `oobCode` safely with:
 * - Upfront missing/malformed parameter validation
 * - Session consumed-code detection (`already_used`)
 * - Bounded Auth initialization (`ensureFirebaseAuthInitialized`)
 * - Strict 15-second timeout (`retryable: true`, never marking the code invalid on timeout/network failure)
 * - Automatic compatibility with Firebase Email Enumeration Protection (`auth/internal-error` when email is omitted)
 * - In-flight deduplication per `oobCode` (prevents duplicate calls under React StrictMode or re-renders)
 */
export function verifyPasswordResetTokenClient(params: {
  token?: string;
  oobCode?: string;
  testOverrides?: PasswordResetTestOverrides;
}): Promise<PasswordResetVerifyResult> {
  const cleanOobCode = String(params.oobCode || params.token || '').trim();

  if (!cleanOobCode) {
    return Promise.resolve({
      ok: false,
      code: 'auth/missing-action-code',
      status: 'missing_token',
      message: 'Missing password reset code. Please open the link from your password reset email.',
      retryable: false,
    });
  }

  if (!isWellFormedOobCode(cleanOobCode)) {
    return Promise.resolve({
      ok: false,
      code: 'auth/invalid-action-code',
      status: 'invalid_token',
      message: 'This password reset link is malformed or incomplete. Please open the button directly from your reset email.',
      retryable: false,
    });
  }

  if (wasResetCodeConsumedInSession(cleanOobCode)) {
    return Promise.resolve({
      ok: false,
      code: 'auth/already-used-action-code',
      status: 'already_used',
      message:
        'This password reset link has already been used. Each reset link works only once — please request a new password reset email.',
      retryable: false,
    });
  }

  // Deduplicate identical in-flight verification requests (e.g. React StrictMode double mount)
  const useDedupe = !params.testOverrides || Boolean(params.testOverrides.enableInFlightDedupe);
  const existingInFlight = useDedupe ? inFlightVerifyByOobCode.get(cleanOobCode) : undefined;
  if (existingInFlight) {
    return existingInFlight;
  }

  const runVerification = async (): Promise<PasswordResetVerifyResult> => {
    const timeoutMs = params.testOverrides?.timeoutMs ?? FIREBASE_RESET_VERIFY_TIMEOUT_MS;
    const ensureReady =
      params.testOverrides?.ensureAuthReadyFn ?? (() => ensureFirebaseAuthInitialized(2500));
    const verifyFn =
      params.testOverrides?.verifyCodeFn ?? ((code: string) => verifyPasswordResetCode(auth, code));
    const fetchImpl = params.testOverrides?.fetchFn ?? fetch;

    try {
      await ensureReady();

      const verifiedEmail = await withTimeout(
        verifyFn(cleanOobCode),
        timeoutMs,
        'FIREBASE_RESET_VERIFY_TIMEOUT'
      );

      let normalizedVerifiedEmail = String(verifiedEmail || '').trim().toLowerCase();
      if (!normalizedVerifiedEmail || !normalizedVerifiedEmail.includes('@')) {
        const serverEmail = await resolveRegisteredEmailFromServerOobCode(cleanOobCode, fetchImpl);
        normalizedVerifiedEmail = serverEmail || getLastRequestedResetEmailFromSession() || '';
      } else {
        saveLastRequestedResetEmailInSession(normalizedVerifiedEmail);
      }

      return {
        ok: true,
        status: 'valid',
        message: 'Password reset link verified.',
        email: normalizedVerifiedEmail || undefined,
        maskedEmail: normalizedVerifiedEmail
          ? maskEmailAddressForDisplay(normalizedVerifiedEmail)
          : undefined,
        mode: 'firebase_oob',
        retryable: false,
      };
    } catch (err: any) {
      const code = String(err?.code || '').trim();
      const rawMsg = String(err?.message || '');

      // Handle Firebase Email Enumeration Protection (`accounts:resetPassword` returning HTTP 200 without `email`)
      if (code === 'auth/internal-error' && !rawMsg.includes('FIREBASE_RESET_VERIFY_TIMEOUT')) {
        const fallbackResult = await verifyViaIdentityToolkitOnRedactedEmail(
          cleanOobCode,
          fetchImpl,
          timeoutMs
        );
        if (!fallbackResult.ok) {
          console.warn(
            '[EveryKR Password Reset] Verification rejected with code:',
            fallbackResult.code || fallbackResult.status
          );
        }
        return fallbackResult;
      }

      if (
        rawMsg.includes('FIREBASE_RESET_VERIFY_TIMEOUT') ||
        rawMsg.toLowerCase().includes('timed out') ||
        code === 'auth/verification-timeout'
      ) {
        console.warn('[EveryKR Password Reset] Verification timed out; link preserved for retry.');
        return {
          ok: false,
          code: 'auth/verification-timeout',
          status: 'timeout',
          message:
            'Verification timed out while contacting Firebase Authentication. Your reset link is still valid — please click Retry Verification.',
          retryable: true,
        };
      }

      if (
        code === 'auth/network-request-failed' ||
        rawMsg.toLowerCase().includes('failed to fetch') ||
        rawMsg.toLowerCase().includes('networkerror')
      ) {
        console.warn('[EveryKR Password Reset] Network failure during verification; link preserved for retry.');
        return {
          ok: false,
          code: 'auth/network-request-failed',
          status: 'network_error',
          message:
            'Network error while verifying password reset link. Please check your connection and retry.',
          retryable: true,
        };
      }

      if (code === 'auth/expired-action-code' || rawMsg.includes('EXPIRED_OOB_CODE')) {
        return {
          ok: false,
          code: 'auth/expired-action-code',
          status: 'expired_token',
          message: 'This password reset link has expired. Please request a new password reset email.',
          retryable: false,
        };
      }

      if (code === 'auth/user-disabled' || rawMsg.includes('USER_DISABLED')) {
        return {
          ok: false,
          code: 'auth/user-disabled',
          status: 'user_disabled',
          message: 'This account has been disabled. Please contact EveryKR support.',
          retryable: false,
        };
      }

      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/invalid-api-key' ||
        code === 'auth/app-not-authorized' ||
        rawMsg.includes('PASSWORD_LOGIN_DISABLED') ||
        rawMsg.includes('OPERATION_NOT_ALLOWED')
      ) {
        console.warn('[EveryKR Password Reset] Firebase configuration error code:', code || 'unknown');
        return {
          ok: false,
          code: code || 'auth/operation-not-allowed',
          status: 'configuration_error',
          message:
            'Authentication service configuration issue detected. Please try again shortly or contact support@everykr.com.',
          retryable: false,
        };
      }

      if (wasResetCodeConsumedInSession(cleanOobCode)) {
        return {
          ok: false,
          code: 'auth/already-used-action-code',
          status: 'already_used',
          message:
            'This password reset link has already been used. Each reset link works only once — please request a new password reset email.',
          retryable: false,
        };
      }

      console.warn(
        '[EveryKR Password Reset] Verification failed with code:',
        code || 'auth/invalid-action-code'
      );
      return {
        ok: false,
        code: code || 'auth/invalid-action-code',
        status: 'invalid_token',
        message: 'This password reset link is invalid. Please request a new password reset email.',
        retryable: false,
      };
    }
  };

  if (!useDedupe) {
    return runVerification();
  }

  const promise = runVerification().finally(() => {
    inFlightVerifyByOobCode.delete(cleanOobCode);
  });
  inFlightVerifyByOobCode.set(cleanOobCode, promise);
  return promise;
}

let confirmPasswordResetInFlight = false;

export async function confirmPasswordResetClient(params: {
  token?: string;
  oobCode?: string;
  newPassword: string;
  testOverrides?: PasswordResetTestOverrides;
}): Promise<PasswordResetConfirmResult> {
  if (confirmPasswordResetInFlight) {
    return {
      ok: false,
      code: 'auth/duplicate-request',
      status: 'duplicate_request',
      message: 'Your password reset is already being processed. Please wait a moment.',
      retryable: false,
    };
  }

  const cleanOobCode = String(params.oobCode || params.token || '').trim();
  const rawNewPassword = String(params.newPassword || '');
  const continueUrl = resolveEveryKrLoginContinueUrl();

  if (!cleanOobCode || !isWellFormedOobCode(cleanOobCode)) {
    return {
      ok: false,
      code: 'auth/invalid-action-code',
      status: 'invalid_token',
      message: 'Missing or invalid password reset action code. Please open the link from your password reset email.',
      retryable: false,
    };
  }

  if (wasResetCodeConsumedInSession(cleanOobCode)) {
    return {
      ok: false,
      code: 'auth/already-used-action-code',
      status: 'already_used',
      message:
        'This password reset link has already been used. Please sign in with your updated password or request a new reset email.',
      retryable: false,
    };
  }

  if (rawNewPassword.length < 8) {
    return {
      ok: false,
      code: 'auth/weak-password',
      status: 'weak_password',
      message: 'Your new password must be at least 8 characters long.',
      retryable: false,
    };
  }

  const timeoutMs = params.testOverrides?.timeoutMs ?? FIREBASE_RESET_CONFIRM_TIMEOUT_MS;
  const ensureReady =
    params.testOverrides?.ensureAuthReadyFn ?? (() => ensureFirebaseAuthInitialized(2500));
  const confirmFn =
    params.testOverrides?.confirmResetFn ??
    ((code: string, pw: string) => confirmPasswordReset(auth, code, pw));

  confirmPasswordResetInFlight = true;
  try {
    await ensureReady();

    await withTimeout(
      confirmFn(cleanOobCode, rawNewPassword),
      timeoutMs,
      'FIREBASE_RESET_CONFIRM_TIMEOUT'
    );

    // Record non-reversible fingerprint so any subsequent reload/re-click shows "already used"
    markResetCodeConsumedInSession(cleanOobCode);
    clearStoredPendingResetCode();

    return {
      ok: true,
      code: 'auth/password-updated',
      status: 'password_updated',
      message:
        'Your password has been reset successfully. You can now sign in to EveryKR using your new password.',
      continueUrl,
      retryable: false,
    };
  } catch (err: any) {
    const code = String(err?.code || '').trim();
    const rawMsg = String(err?.message || '');

    if (code === 'auth/weak-password' || rawMsg.includes('WEAK_PASSWORD')) {
      return {
        ok: false,
        code: 'auth/weak-password',
        status: 'weak_password',
        message: 'Please choose a stronger password (at least 8 characters).',
        retryable: false,
      };
    }

    if (code === 'auth/expired-action-code' || rawMsg.includes('EXPIRED_OOB_CODE')) {
      return {
        ok: false,
        code: 'auth/expired-action-code',
        status: 'expired_token',
        message: 'This password reset link has expired. Please request a new password reset email.',
        retryable: false,
      };
    }

    if (code === 'auth/user-disabled' || rawMsg.includes('USER_DISABLED')) {
      return {
        ok: false,
        code: 'auth/user-disabled',
        status: 'user_disabled',
        message: 'This account has been disabled. Please contact EveryKR support.',
        retryable: false,
      };
    }

    if (
      rawMsg.includes('FIREBASE_RESET_CONFIRM_TIMEOUT') ||
      rawMsg.toLowerCase().includes('timed out') ||
      code === 'auth/network-request-failed' ||
      rawMsg.toLowerCase().includes('failed to fetch')
    ) {
      console.warn('[EveryKR Password Reset] Network/timeout error during confirmPasswordReset; retryable.');
      return {
        ok: false,
        code: 'auth/network-request-failed',
        status: 'network_error',
        message: 'Network error while updating password. Please check your connection and try again.',
        retryable: true,
      };
    }

    if (wasResetCodeConsumedInSession(cleanOobCode)) {
      return {
        ok: false,
        code: 'auth/already-used-action-code',
        status: 'already_used',
        message:
          'This password reset link has already been used. Each reset link works only once — please request a new password reset email.',
        retryable: false,
      };
    }

    console.warn(
      '[EveryKR Password Reset] confirmPasswordReset failed with code:',
      code || 'auth/invalid-action-code'
    );
    return {
      ok: false,
      code: code || 'auth/invalid-action-code',
      status: 'invalid_token',
      message:
        'This password reset link is invalid or has already been used. Please request a new password reset email.',
      retryable: false,
    };
  } finally {
    confirmPasswordResetInFlight = false;
  }
}

export interface PasswordUpdateResult {
  ok: boolean;
  code?: string;
  status: string;
  message: string;
  originUrl: string;
}

/**
 * Updates the signed-in EveryKR user's password on `https://everykr.com/settings`
 * using the registered EveryKR email (`autocomplete="username"`), `current-password`,
 * and `new-password` so Google Chrome Password Manager associates the updated credential
 * with `everykr.com`.
 */
export async function updateAuthenticatedUserPasswordClient(params: {
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<PasswordUpdateResult> {
  const normalizedEmail = String(params.email || '').trim().toLowerCase();
  const rawCurrentPassword = String(params.currentPassword || '');
  const rawNewPassword = String(params.newPassword || '');

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      ok: false,
      code: 'auth/invalid-email',
      status: 'invalid_input',
      message: 'A valid registered EveryKR email address is required.',
      originUrl: OFFICIAL_EVERYKR_SETTINGS_URL,
    };
  }

  if (!rawCurrentPassword) {
    return {
      ok: false,
      code: 'auth/missing-current-password',
      status: 'invalid_input',
      message: 'Please enter your current password.',
      originUrl: OFFICIAL_EVERYKR_SETTINGS_URL,
    };
  }

  if (rawNewPassword.length < 8) {
    return {
      ok: false,
      code: 'auth/weak-password',
      status: 'weak_password',
      message: 'Your new password must be at least 8 characters long.',
      originUrl: OFFICIAL_EVERYKR_SETTINGS_URL,
    };
  }

  try {
    await ensureFirebaseAuthInitialized(2500);
    let activeFbUser = auth.currentUser;

    if (
      activeFbUser &&
      String(activeFbUser.email || '').trim().toLowerCase() === normalizedEmail
    ) {
      const cred = EmailAuthProvider.credential(normalizedEmail, rawCurrentPassword);
      await withTimeout(
        reauthenticateWithCredential(activeFbUser, cred),
        12000,
        'FIREBASE_REAUTH_TIMEOUT'
      );
    } else {
      const signInRes = await withTimeout(
        signInWithEmailAndPassword(auth, normalizedEmail, rawCurrentPassword),
        12000,
        'FIREBASE_SIGNIN_TIMEOUT'
      );
      activeFbUser = signInRes.user;
    }

    await withTimeout(
      updatePassword(activeFbUser, rawNewPassword),
      12000,
      'FIREBASE_UPDATE_PASSWORD_TIMEOUT'
    );

    return {
      ok: true,
      code: 'auth/password-updated',
      status: 'password_updated',
      message: 'Your EveryKR password has been updated.',
      originUrl: OFFICIAL_EVERYKR_LOGIN_URL,
    };
  } catch (err: any) {
    const code = String(err?.code || '').trim();
    if (
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials'
    ) {
      return {
        ok: false,
        code: 'auth/wrong-password',
        status: 'wrong_password',
        message: 'Your current password is incorrect. Please check and try again.',
        originUrl: OFFICIAL_EVERYKR_SETTINGS_URL,
      };
    }
    if (code === 'auth/weak-password') {
      return {
        ok: false,
        code: 'auth/weak-password',
        status: 'weak_password',
        message: 'Please choose a stronger password (at least 8 characters).',
        originUrl: OFFICIAL_EVERYKR_SETTINGS_URL,
      };
    }
    if (code === 'auth/too-many-requests') {
      return {
        ok: false,
        code: 'auth/too-many-requests',
        status: 'rate_limited',
        message: 'Too many attempts. Please wait a few minutes before trying again.',
        originUrl: OFFICIAL_EVERYKR_SETTINGS_URL,
      };
    }
    return {
      ok: false,
      code: code || 'auth/password-update-failed',
      status: 'update_failed',
      message:
        'Unable to update your password right now. If you signed in with Google or OTP, you can also set a password via the Reset Password page.',
      originUrl: OFFICIAL_EVERYKR_SETTINGS_URL,
    };
  }
}

