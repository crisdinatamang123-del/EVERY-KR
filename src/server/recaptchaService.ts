import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type RecaptchaKeyType = 'v2_checkbox' | 'enterprise';

export type RecaptchaVerificationStatus =
  | 'verified'
  | 'missing_token'
  | 'invalid_token'
  | 'expired_token'
  | 'token_reused'
  | 'hostname_mismatch'
  | 'verification_not_configured'
  | 'key_type_conflict'
  | 'verification_unavailable';

export interface RecaptchaVerificationResult {
  ok: boolean;
  httpStatus: number;
  status: RecaptchaVerificationStatus;
  message: string;
  keyType: RecaptchaKeyType;
  hostname?: string;
  challengeTs?: string;
}

export interface PublicRecaptchaConfig {
  enabled: true;
  configured: boolean;
  keyType: RecaptchaKeyType;
  siteKey: string;
  v2CheckboxEligible: boolean;
  status: 'ready' | 'missing_site_key' | 'missing_server_secret' | 'key_type_conflict';
}

interface GoogleSiteVerifyResponse {
  success?: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

interface GoogleEnterpriseAssessmentResponse {
  tokenProperties?: {
    valid?: boolean;
    invalidReason?: string;
    hostname?: string;
    action?: string;
    createTime?: string;
  };
  riskAnalysis?: {
    score?: number;
    reasons?: string[];
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

const GOOGLE_V2_SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const DEFAULT_MAX_TOKEN_AGE_SECONDS = 120; // Google reCAPTCHA v2 tokens expire after 2 minutes
const CONSUMED_TOKEN_TTL_MS = 10 * 60 * 1000; // Retain consumed token hashes for 10 minutes
const UPSTREAM_VERIFY_TIMEOUT_MS = 8000;

// Anti-replay tracking (stores ONLY SHA-256 hex digests, never raw tokens)
const consumedTokenHashes = new Map<string, number>();
const inFlightTokenHashes = new Set<string>();

// Optional injectable fetch for deterministic server-side tests (never exposed via HTTP)
let customFetchImplementation: typeof fetch | null = null;

export function setRecaptchaFetchForTesting(fn: typeof fetch | null): void {
  customFetchImplementation = fn;
}

export function clearRecaptchaReplayCacheForTesting(): void {
  consumedTokenHashes.clear();
  inFlightTokenHashes.clear();
}

function pruneExpiredConsumedTokens(nowMs: number = Date.now()): void {
  if (consumedTokenHashes.size === 0) return;
  for (const [hash, expiresAtMs] of consumedTokenHashes.entries()) {
    if (nowMs >= expiresAtMs) {
      consumedTokenHashes.delete(hash);
    }
  }
}

function hashTokenSha256(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function stripEnvQuotes(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/^["']+|["']+$/g, '').trim();
}

function readAppletConfigRecaptchaSiteKey(): string {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return '';
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
      recaptchaSiteKey?: unknown;
    };
    return stripEnvQuotes(parsed?.recaptchaSiteKey);
  } catch {
    return '';
  }
}

interface ResolvedRecaptchaServerConfig {
  keyType: RecaptchaKeyType;
  siteKey: string;
  v2SecretKey: string;
  enterpriseProjectId: string;
  enterpriseApiKey: string;
  hasKeyTypeConflict: boolean;
  conflictReason?: string;
  maxTokenAgeSeconds: number;
  allowedHostnames: Set<string>;
}

function extractHostnameSafe(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return rawUrl
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .split(':')[0]
      .trim()
      .toLowerCase();
  }
}

function buildAllowedHostnames(): Set<string> {
  const allowed = new Set<string>([
    'everykr.com',
    'www.everykr.com',
    'everykr.firebaseapp.com',
    'everykr.web.app',
    'ais-dev-jwnyy7zcqy5robv5onar3v-258747967575.asia-east1.run.app',
    'ais-pre-jwnyy7zcqy5robv5onar3v-258747967575.asia-east1.run.app',
    'ais-mob-jwnyy7zcqy5robv5onar3v-258747967575.asia-east1.run.app',
    'everykr-everything-korea-one-platform.ai.studio',
    'everykr-everything-korea-one-platform-1.ai.studio',
    'everykr-everything-korea-one-platform-926172198407.asia-east1.run.app'
  ]);

  const publicSiteHost = extractHostnameSafe(stripEnvQuotes(process.env.PUBLIC_SITE_URL));
  if (publicSiteHost) allowed.add(publicSiteHost);

  const appUrlHost = extractHostnameSafe(stripEnvQuotes(process.env.APP_URL));
  if (appUrlHost) {
    allowed.add(appUrlHost);
    // Also allow sibling ais-pre / ais-mob / ais-dev Cloud Run preview hostnames for the same applet
    if (appUrlHost.startsWith('ais-dev-')) {
      allowed.add(appUrlHost.replace(/^ais-dev-/, 'ais-pre-'));
      allowed.add(appUrlHost.replace(/^ais-dev-/, 'ais-mob-'));
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('localhost');
    allowed.add('127.0.0.1');
  }

  const extra = stripEnvQuotes(process.env.RECAPTCHA_ALLOWED_HOSTNAMES);
  if (extra) {
    for (const part of extra.split(',')) {
      const cleanHost = extractHostnameSafe(part.trim());
      if (cleanHost) allowed.add(cleanHost);
    }
  }

  return allowed;
}

function resolveRecaptchaServerConfig(): ResolvedRecaptchaServerConfig {
  const rawType = stripEnvQuotes(
    process.env.RECAPTCHA_KEY_TYPE || process.env.VITE_RECAPTCHA_KEY_TYPE || 'v2_checkbox'
  ).toLowerCase();

  const siteKey =
    stripEnvQuotes(process.env.RECAPTCHA_SITE_KEY) ||
    stripEnvQuotes(process.env.VITE_RECAPTCHA_SITE_KEY) ||
    readAppletConfigRecaptchaSiteKey();

  const v2SecretKey = stripEnvQuotes(process.env.RECAPTCHA_SECRET_KEY);
  const accidentalClientSecret = stripEnvQuotes(process.env.VITE_RECAPTCHA_SECRET_KEY);
  const enterpriseProjectId = stripEnvQuotes(process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID);
  const enterpriseApiKey = stripEnvQuotes(process.env.RECAPTCHA_ENTERPRISE_API_KEY);

  let keyType: RecaptchaKeyType = 'v2_checkbox';
  let hasKeyTypeConflict = false;
  let conflictReason: string | undefined;

  if (accidentalClientSecret) {
    // Hard safety guard: reject if someone placed a secret in a VITE_ client-exposed env var
    hasKeyTypeConflict = true;
    conflictReason =
      'Insecure configuration blocked: RECAPTCHA_SECRET_KEY must never be prefixed with VITE_.';
  } else if (rawType === 'v2_checkbox' || rawType === 'v2' || rawType === 'standard') {
    keyType = 'v2_checkbox';
    // Prevent mixing Enterprise credentials into standard v2 SiteVerify mode
    if (!v2SecretKey && (enterpriseApiKey || enterpriseProjectId)) {
      hasKeyTypeConflict = true;
      conflictReason =
        'Key type mismatch: RECAPTCHA_KEY_TYPE is set to standard v2_checkbox, but reCAPTCHA Enterprise credentials were provided instead of RECAPTCHA_SECRET_KEY.';
    }
  } else if (rawType === 'enterprise' || rawType === 'enterprise_checkbox') {
    keyType = 'enterprise';
    // Prevent mixing standard v2 secret into Enterprise CreateAssessment mode
    if (v2SecretKey && (!enterpriseApiKey || !enterpriseProjectId)) {
      hasKeyTypeConflict = true;
      conflictReason =
        'Key type mismatch: RECAPTCHA_KEY_TYPE is set to enterprise, but standard RECAPTCHA_SECRET_KEY was provided without RECAPTCHA_ENTERPRISE_PROJECT_ID and RECAPTCHA_ENTERPRISE_API_KEY.';
    }
  } else {
    hasKeyTypeConflict = true;
    conflictReason = `Unsupported RECAPTCHA_KEY_TYPE "${rawType}". Expected "v2_checkbox" or "enterprise".`;
  }

  const parsedAge = Number.parseInt(
    stripEnvQuotes(process.env.RECAPTCHA_MAX_TOKEN_AGE_SECONDS),
    10
  );
  const maxTokenAgeSeconds =
    Number.isFinite(parsedAge) && parsedAge >= 15 && parsedAge <= 300
      ? parsedAge
      : DEFAULT_MAX_TOKEN_AGE_SECONDS;

  return {
    keyType,
    siteKey,
    v2SecretKey,
    enterpriseProjectId,
    enterpriseApiKey,
    hasKeyTypeConflict,
    conflictReason,
    maxTokenAgeSeconds,
    allowedHostnames: buildAllowedHostnames()
  };
}

/**
 * Returns strictly non-sensitive public reCAPTCHA configuration for the frontend widget.
 * Never exposes secret keys, API keys, or internal credentials.
 */
export function getPublicRecaptchaConfigServer(): PublicRecaptchaConfig {
  const cfg = resolveRecaptchaServerConfig();

  if (cfg.hasKeyTypeConflict) {
    return {
      enabled: true,
      configured: false,
      keyType: cfg.keyType,
      siteKey: '',
      v2CheckboxEligible: false,
      status: 'key_type_conflict'
    };
  }

  if (!cfg.siteKey) {
    return {
      enabled: true,
      configured: false,
      keyType: cfg.keyType,
      siteKey: '',
      v2CheckboxEligible: false,
      status: 'missing_site_key'
    };
  }

  const hasServerCredentials =
    cfg.keyType === 'v2_checkbox'
      ? Boolean(cfg.v2SecretKey)
      : Boolean(cfg.enterpriseProjectId && cfg.enterpriseApiKey);

  if (!hasServerCredentials) {
    return {
      enabled: true,
      configured: false,
      keyType: cfg.keyType,
      // Still expose public siteKey ONLY if standard v2_checkbox so UI can render or diagnose cleanly,
      // while server endpoints strictly fail closed until RECAPTCHA_SECRET_KEY is configured.
      siteKey: cfg.keyType === 'v2_checkbox' ? cfg.siteKey : '',
      v2CheckboxEligible: false,
      status: 'missing_server_secret'
    };
  }

  return {
    enabled: true,
    configured: true,
    keyType: cfg.keyType,
    // Requirement 3: Standard v2 Checkbox widget receives the siteKey ONLY when keys are standard v2_checkbox
    siteKey: cfg.keyType === 'v2_checkbox' ? cfg.siteKey : '',
    v2CheckboxEligible: cfg.keyType === 'v2_checkbox',
    status: 'ready'
  };
}

function validateChallengeTimestampAge(
  isoTimestamp: string | undefined,
  maxAgeSeconds: number,
  nowMs: number
): { valid: boolean; reason?: 'missing' | 'expired' | 'future' } {
  if (!isoTimestamp || typeof isoTimestamp !== 'string') {
    return { valid: false, reason: 'missing' };
  }
  const challengeMs = Date.parse(isoTimestamp);
  if (!Number.isFinite(challengeMs)) {
    return { valid: false, reason: 'missing' };
  }
  // Reject timestamps more than 30 seconds in the future (clock skew tolerance)
  if (challengeMs - nowMs > 30_000) {
    return { valid: false, reason: 'future' };
  }
  if (nowMs - challengeMs > maxAgeSeconds * 1000) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true };
}

/**
 * Verifies a reCAPTCHA response token server-side using ONLY the Google API
 * matching the registered key type (SiteVerify for standard v2_checkbox OR
 * CreateAssessment for reCAPTCHA Enterprise — never mixed).
 *
 * Fails closed whenever configuration or upstream Google verification is unavailable.
 */
export async function verifyRecaptchaTokenServer(params: {
  token: unknown;
  remoteIp?: string;
  expectedAction?: string;
}): Promise<RecaptchaVerificationResult> {
  const cfg = resolveRecaptchaServerConfig();
  const nowMs = Date.now();
  pruneExpiredConsumedTokens(nowMs);

  // 1. Fail closed on key-type conflict or missing server configuration
  if (cfg.hasKeyTypeConflict) {
    return {
      ok: false,
      httpStatus: 503,
      status: 'key_type_conflict',
      keyType: cfg.keyType,
      message:
        'Security verification configuration conflict detected on server. Submission is temporarily blocked for your protection.'
    };
  }

  const hasRequiredServerCredentials =
    cfg.keyType === 'v2_checkbox'
      ? Boolean(cfg.siteKey && cfg.v2SecretKey)
      : Boolean(cfg.siteKey && cfg.enterpriseProjectId && cfg.enterpriseApiKey);

  if (!hasRequiredServerCredentials) {
    return {
      ok: false,
      httpStatus: 503,
      status: 'verification_not_configured',
      keyType: cfg.keyType,
      message:
        'Google reCAPTCHA security verification is not yet configured on the server. Protected form submissions are temporarily unavailable.'
    };
  }

  // 2. Validate token presence & syntactic format
  const rawToken = typeof params.token === 'string' ? params.token.trim() : '';
  if (!rawToken) {
    return {
      ok: false,
      httpStatus: 400,
      status: 'missing_token',
      keyType: cfg.keyType,
      message: 'Please complete the Google reCAPTCHA checkbox verification before submitting.'
    };
  }

  if (
    rawToken.length < 20 ||
    rawToken.length > 4096 ||
    /[\u0000-\u001F\u007F\s]/.test(rawToken)
  ) {
    return {
      ok: false,
      httpStatus: 400,
      status: 'invalid_token',
      keyType: cfg.keyType,
      message: 'Invalid reCAPTCHA verification token. Please check the reCAPTCHA box again.'
    };
  }

  // 3. Single-use token replay & concurrent race check
  const tokenHash = hashTokenSha256(rawToken);
  if (consumedTokenHashes.has(tokenHash) || inFlightTokenHashes.has(tokenHash)) {
    return {
      ok: false,
      httpStatus: 400,
      status: 'token_reused',
      keyType: cfg.keyType,
      message:
        'This reCAPTCHA verification has already been used. Please check the reCAPTCHA box again.'
    };
  }

  inFlightTokenHashes.add(tokenHash);
  const fetchFn = customFetchImplementation || globalThis.fetch;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), UPSTREAM_VERIFY_TIMEOUT_MS);

  try {
    // =========================================================================
    // PATH A: STANDARD GOOGLE reCAPTCHA v2 CHECKBOX (SiteVerify API ONLY)
    // =========================================================================
    if (cfg.keyType === 'v2_checkbox') {
      const formBody = new URLSearchParams();
      formBody.set('secret', cfg.v2SecretKey);
      formBody.set('response', rawToken);
      if (params.remoteIp && params.remoteIp !== 'unknown') {
        formBody.set('remoteip', params.remoteIp);
      }

      let response: Response;
      try {
        response = await fetchFn(GOOGLE_V2_SITEVERIFY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formBody.toString(),
          signal: controller.signal
        });
      } catch {
        return {
          ok: false,
          httpStatus: 503,
          status: 'verification_unavailable',
          keyType: 'v2_checkbox',
          message:
            'Unable to reach Google reCAPTCHA verification service. For security, submission was blocked. Please try again shortly.'
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          httpStatus: 503,
          status: 'verification_unavailable',
          keyType: 'v2_checkbox',
          message:
            'Google reCAPTCHA verification service returned an unexpected status. Please try again shortly.'
        };
      }

      const payload = (await response.json().catch(() => null)) as GoogleSiteVerifyResponse | null;
      if (!payload || typeof payload !== 'object') {
        return {
          ok: false,
          httpStatus: 503,
          status: 'verification_unavailable',
          keyType: 'v2_checkbox',
          message:
            'Invalid response from Google reCAPTCHA verification service. Please try again shortly.'
        };
      }

      const errorCodes = Array.isArray(payload['error-codes']) ? payload['error-codes'] : [];

      if (payload.success !== true) {
        if (
          errorCodes.includes('missing-input-secret') ||
          errorCodes.includes('invalid-input-secret')
        ) {
          return {
            ok: false,
            httpStatus: 503,
            status: 'verification_unavailable',
            keyType: 'v2_checkbox',
            message:
              'Server reCAPTCHA verification credentials are invalid or unavailable. Submission was blocked.'
          };
        }

        if (errorCodes.includes('timeout-or-duplicate')) {
          return {
            ok: false,
            httpStatus: 400,
            status: 'expired_token',
            keyType: 'v2_checkbox',
            message:
              'Your reCAPTCHA verification has expired or was already used. Please check the box again.'
          };
        }

        return {
          ok: false,
          httpStatus: 400,
          status: 'invalid_token',
          keyType: 'v2_checkbox',
          message: 'reCAPTCHA verification failed. Please complete the checkbox challenge again.'
        };
      }

      // Validate challenge_ts expiration window
      const tsCheck = validateChallengeTimestampAge(
        payload.challenge_ts,
        cfg.maxTokenAgeSeconds,
        Date.now()
      );
      if (!tsCheck.valid) {
        return {
          ok: false,
          httpStatus: 400,
          status: 'expired_token',
          keyType: 'v2_checkbox',
          message:
            'Your reCAPTCHA verification has expired. Please check the reCAPTCHA box again before submitting.'
        };
      }

      // Validate verified hostname against server allowlist
      const verifiedHost =
        typeof payload.hostname === 'string' ? payload.hostname.trim().toLowerCase() : '';
      if (!verifiedHost || !cfg.allowedHostnames.has(verifiedHost)) {
        return {
          ok: false,
          httpStatus: 400,
          status: 'hostname_mismatch',
          keyType: 'v2_checkbox',
          message:
            'reCAPTCHA domain verification did not match an authorized EVERYKR hostname.'
        };
      }

      // Mark token consumed to prevent replay
      consumedTokenHashes.set(tokenHash, Date.now() + CONSUMED_TOKEN_TTL_MS);
      return {
        ok: true,
        httpStatus: 200,
        status: 'verified',
        keyType: 'v2_checkbox',
        message: 'reCAPTCHA v2 verification succeeded.',
        hostname: verifiedHost,
        challengeTs: payload.challenge_ts
      };
    }

    // =========================================================================
    // PATH B: GOOGLE reCAPTCHA ENTERPRISE (CreateAssessment API ONLY — Never Mixed)
    // =========================================================================
    const assessmentUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(
      cfg.enterpriseProjectId
    )}/assessments?key=${encodeURIComponent(cfg.enterpriseApiKey)}`;

    let entRes: Response;
    try {
      entRes = await fetchFn(assessmentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: {
            token: rawToken,
            siteKey: cfg.siteKey,
            ...(params.remoteIp && params.remoteIp !== 'unknown'
              ? { userIpAddress: params.remoteIp }
              : {}),
            ...(params.expectedAction ? { expectedAction: params.expectedAction } : {})
          }
        }),
        signal: controller.signal
      });
    } catch {
      return {
        ok: false,
        httpStatus: 503,
        status: 'verification_unavailable',
        keyType: 'enterprise',
        message:
          'Unable to reach Google reCAPTCHA Enterprise assessment service. For security, submission was blocked.'
      };
    }

    if (!entRes.ok) {
      return {
        ok: false,
        httpStatus: 503,
        status: 'verification_unavailable',
        keyType: 'enterprise',
        message:
          'Google reCAPTCHA Enterprise assessment service is temporarily unavailable. Submission was blocked.'
      };
    }

    const entPayload = (await entRes
      .json()
      .catch(() => null)) as GoogleEnterpriseAssessmentResponse | null;

    if (!entPayload || !entPayload.tokenProperties) {
      return {
        ok: false,
        httpStatus: 503,
        status: 'verification_unavailable',
        keyType: 'enterprise',
        message:
          'Invalid assessment response from Google reCAPTCHA Enterprise. Submission was blocked.'
      };
    }

    const tokenProps = entPayload.tokenProperties;
    if (tokenProps.valid !== true) {
      const reason = String(tokenProps.invalidReason || '').toUpperCase();
      if (reason === 'DUPE') {
        return {
          ok: false,
          httpStatus: 400,
          status: 'token_reused',
          keyType: 'enterprise',
          message:
            'This reCAPTCHA verification has already been used. Please complete the challenge again.'
        };
      }
      if (reason === 'EXPIRED') {
        return {
          ok: false,
          httpStatus: 400,
          status: 'expired_token',
          keyType: 'enterprise',
          message: 'Your reCAPTCHA verification has expired. Please complete the challenge again.'
        };
      }
      return {
        ok: false,
        httpStatus: 400,
        status: 'invalid_token',
        keyType: 'enterprise',
        message: 'reCAPTCHA verification failed. Please complete the challenge again.'
      };
    }

    const entTsCheck = validateChallengeTimestampAge(
      tokenProps.createTime,
      cfg.maxTokenAgeSeconds,
      Date.now()
    );
    if (!entTsCheck.valid) {
      return {
        ok: false,
        httpStatus: 400,
        status: 'expired_token',
        keyType: 'enterprise',
        message: 'Your reCAPTCHA verification has expired. Please complete the challenge again.'
      };
    }

    const entHost =
      typeof tokenProps.hostname === 'string' ? tokenProps.hostname.trim().toLowerCase() : '';
    if (!entHost || !cfg.allowedHostnames.has(entHost)) {
      return {
        ok: false,
        httpStatus: 400,
        status: 'hostname_mismatch',
        keyType: 'enterprise',
        message: 'reCAPTCHA domain verification did not match an authorized EVERYKR hostname.'
      };
    }

    consumedTokenHashes.set(tokenHash, Date.now() + CONSUMED_TOKEN_TTL_MS);
    return {
      ok: true,
      httpStatus: 200,
      status: 'verified',
      keyType: 'enterprise',
      message: 'reCAPTCHA Enterprise assessment verified.',
      hostname: entHost,
      challengeTs: tokenProps.createTime
    };
  } finally {
    clearTimeout(timeoutHandle);
    inFlightTokenHashes.delete(tokenHash);
  }
}
