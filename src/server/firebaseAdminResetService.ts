import crypto from 'crypto';
import fs from 'fs';
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App as AdminApp,
  type Credential as AdminCredential,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth as getAdminAuth, type ActionCodeSettings as AdminActionCodeSettings } from 'firebase-admin/auth';
import {
  appendAutomatedEmailAuditLog,
  dispatchTransactionalEmailServer,
  extractFirstName,
  getWorkflowSenderIdentity,
  OFFICIAL_EVERYKR_LOGO_URL,
  OFFICIAL_EVERYKR_URL,
} from './automatedEmailService.ts';

const FIREBASE_ADMIN_APP_NAME = 'everykr-password-reset-admin';
const FIREBASE_ADMIN_ADC_QUOTA_APP_NAME = 'everykr-password-reset-admin-quota';
const CANONICAL_FIREBASE_PROJECT_ID = 'everykr';
export const CANONICAL_LOGIN_CONTINUE_URL = 'https://everykr.com/login';
export const CUSTOM_WEBSITE_RESET_PASSWORD_URL = 'https://everykr.com/reset-password';
export const PASSWORD_RESET_EMAIL_SUBJECT = 'Reset Your EveryKR Password';
export const NEUTRAL_FIREBASE_RESET_SUCCESS_MESSAGE =
  'If an account is registered with this email, password reset instructions have been sent. Please check your inbox and spam folder.';

const EMAIL_COOLDOWN_MS = 60 * 1000; // 60-second per-email cooldown (applied identically to registered & unregistered emails)
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window
const MAX_REQUESTS_PER_EMAIL_WINDOW = 4;
const MAX_REQUESTS_PER_IP_WINDOW = 8;
const ANTI_ENUMERATION_MIN_MS = 380;

export type FirebaseAdminCredentialSource =
  | 'service_account_json'
  | 'service_account_env_fields'
  | 'google_application_credentials'
  | 'application_default_credentials';

interface RateWindowEntry {
  count: number;
  resetAtMs: number;
}

const emailCooldownUntilMap = new Map<string, number>();
const rateWindowMap = new Map<string, RateWindowEntry>();
const inFlightResetEmails = new Set<string>();

let cachedAdminApp: AdminApp | null = null;
let cachedQuotaAdcAdminApp: AdminApp | null = null;
let preferQuotaBoundAdcApp = false;
let cachedCredentialSource: FirebaseAdminCredentialSource | null = null;

function normalizeEmail(raw: unknown): string {
  return String(raw || '').trim().toLowerCase();
}

function isValidEmailSyntax(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(email);
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const resetCodeHashToEmailMap = new Map<
  string,
  { email: string; expiresAtMs: number }
>();
const RESET_CODE_EMAIL_TTL_MS = 60 * 60 * 1000; // 1-hour Firebase action code lifetime

function hashResetOobCode(oobCode: string): string {
  return crypto
    .createHash('sha256')
    .update(`everykr_reset_email_ctx_v1:${String(oobCode || '').trim()}`)
    .digest('hex');
}

/**
 * Associates a newly generated one-time `oobCode` (stored only as a SHA-256 digest)
 * with the verified registered EveryKR email address for 1 hour so `/reset-password`
 * can populate `<input name="username" autocomplete="username" value={registeredEmail} />`
 * for Google Chrome Password Manager even when Firebase Email Enumeration Protection
 * redacts `email` from client-side `accounts:resetPassword` responses.
 */
export function registerResetOobCodeEmailMappingServer(
  oobCode: string,
  email: string
): void {
  const cleanCode = String(oobCode || '').trim();
  const cleanEmail = normalizeEmail(email);
  if (!cleanCode || !isValidEmailSyntax(cleanEmail)) return;

  const now = Date.now();
  if (resetCodeHashToEmailMap.size > 500) {
    for (const [k, entry] of resetCodeHashToEmailMap.entries()) {
      if (entry.expiresAtMs <= now) {
        resetCodeHashToEmailMap.delete(k);
      }
    }
  }

  resetCodeHashToEmailMap.set(hashResetOobCode(cleanCode), {
    email: cleanEmail,
    expiresAtMs: now + RESET_CODE_EMAIL_TTL_MS,
  });
}

/**
 * Resolves the registered EveryKR email address associated with a valid one-time `oobCode`
 * (looked up via SHA-256 digest; never logs or stores raw `oobCode`).
 */
export function resolveRegisteredEmailForResetOobCodeServer(
  oobCode: unknown
): string | null {
  const cleanCode = String(oobCode || '').trim();
  if (
    !cleanCode ||
    cleanCode.length < 10 ||
    cleanCode.length > 1024 ||
    /[\s<>"'`\\]/.test(cleanCode)
  ) {
    return null;
  }
  const key = hashResetOobCode(cleanCode);
  const entry = resetCodeHashToEmailMap.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAtMs) {
    resetCodeHashToEmailMap.delete(key);
    return null;
  }
  return entry.email;
}

/**
 * Strictly validates and normalizes the password reset continueUrl to EveryKR's
 * official production login URL (`https://everykr.com/login`).
 * Never allows temporary Cloud Run (`*.run.app`), Firebase (`everykr.firebaseapp.com`),
 * or untrusted external domains.
 */
export function sanitizePasswordResetContinueUrl(_rawContinueUrl?: unknown): string {
  return CANONICAL_LOGIN_CONTINUE_URL;
}

/**
 * Securely extracts the one-time `oobCode` from a Firebase-generated password reset action link
 * without logging or exposing the code in error messages.
 */
export function extractOobCodeFromFirebaseActionLink(rawFirebaseActionLink: string): string {
  const trimmed = String(rawFirebaseActionLink || '').trim();
  if (!trimmed) {
    const err: any = new Error('Missing Firebase password reset action link.');
    err.code = 'auth/invalid-reset-link';
    throw err;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    const err: any = new Error('Malformed Firebase password reset action URL.');
    err.code = 'auth/invalid-reset-link';
    throw err;
  }

  const isHttps = parsed.protocol === 'https:';
  const isLocalHttp =
    parsed.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
  if (!isHttps && !isLocalHttp) {
    const err: any = new Error('Firebase password reset action URL must use HTTPS.');
    err.code = 'auth/invalid-reset-link';
    throw err;
  }

  const mode = parsed.searchParams.get('mode');
  if (mode !== null && mode !== 'resetPassword') {
    const err: any = new Error('Unexpected Firebase email action mode.');
    err.code = 'auth/invalid-reset-mode';
    throw err;
  }

  const oobCode = (parsed.searchParams.get('oobCode') || '').trim();
  if (!oobCode || oobCode.length < 10 || oobCode.length > 1024 || /[\s<>"'`\\]/.test(oobCode)) {
    const err: any = new Error('Firebase password reset link did not contain a valid oobCode.');
    err.code = 'auth/missing-oob-code';
    throw err;
  }

  return oobCode;
}

/**
 * Constructs the canonical custom EveryKR website password reset URL:
 * `https://everykr.com/reset-password?oobCode=...`
 * Never points users to the default `everykr.firebaseapp.com/__/auth/action` page.
 */
export function buildCustomEveryKrPasswordResetUrl(oobCode: string): string {
  const cleanOobCode = String(oobCode || '').trim();
  if (
    !cleanOobCode ||
    cleanOobCode.length < 10 ||
    cleanOobCode.length > 1024 ||
    /[\s<>"'`\\]/.test(cleanOobCode)
  ) {
    const err: any = new Error('Invalid Firebase password reset action code.');
    err.code = 'auth/invalid-action-code';
    throw err;
  }

  const customUrl = new URL(CUSTOM_WEBSITE_RESET_PASSWORD_URL);
  customUrl.searchParams.set('oobCode', cleanOobCode);
  return customUrl.toString();
}

/**
 * Converts a legitimate server-generated Firebase password reset link into EveryKR's
 * custom website reset URL (`https://everykr.com/reset-password?oobCode=...`).
 */
export function resolveCustomWebsiteResetLinkFromFirebaseLink(rawLink: string): string {
  const oobCode = extractOobCodeFromFirebaseActionLink(rawLink);
  return buildCustomEveryKrPasswordResetUrl(oobCode);
}

function parseServiceAccountJsonCandidate(raw?: string): ServiceAccount | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed || trimmed.startsWith('MY_')) return null;

  const tryParse = (candidate: string): ServiceAccount | null => {
    try {
      const obj = JSON.parse(candidate);
      if (
        obj &&
        typeof obj === 'object' &&
        typeof obj.client_email === 'string' &&
        typeof obj.private_key === 'string' &&
        obj.private_key.includes('BEGIN PRIVATE KEY')
      ) {
        return {
          projectId: String(obj.project_id || CANONICAL_FIREBASE_PROJECT_ID),
          clientEmail: obj.client_email.trim(),
          privateKey: obj.private_key.replace(/\\n/g, '\n'),
        };
      }
    } catch {
      // ignore invalid JSON
    }
    return null;
  };

  if (trimmed.startsWith('{')) {
    return tryParse(trimmed);
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8').trim();
    if (decoded.startsWith('{')) {
      return tryParse(decoded);
    }
  } catch {
    // ignore invalid base64
  }

  return null;
}

/**
 * Resolves the server-only Firebase Admin App for project `everykr` without ever exposing credentials.
 * Credential resolution order:
 *  1. FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_ADMIN_CREDENTIALS (JSON or base64 JSON)
 *  2. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (or FIREBASE_ADMIN_* equivalents)
 *  3. GOOGLE_APPLICATION_CREDENTIALS file path (if readable service account JSON)
 *  4. Google Cloud Application Default Credentials (`applicationDefault()`) for `everykr`
 */
export function getOrInitFirebaseAdminApp(env: NodeJS.ProcessEnv = process.env): {
  app: AdminApp;
  credentialSource: FirebaseAdminCredentialSource;
} {
  if (cachedAdminApp && cachedCredentialSource && env === process.env) {
    return { app: cachedAdminApp, credentialSource: cachedCredentialSource };
  }

  const existing = getApps().find((a) => a.name === FIREBASE_ADMIN_APP_NAME);
  if (existing && cachedCredentialSource && env === process.env) {
    cachedAdminApp = existing;
    return { app: existing, credentialSource: cachedCredentialSource };
  }

  // 1. JSON or base64 JSON service account env var
  const jsonAccount =
    parseServiceAccountJsonCandidate(env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
    parseServiceAccountJsonCandidate(env.FIREBASE_ADMIN_CREDENTIALS);

  if (jsonAccount) {
    const appName = env === process.env ? FIREBASE_ADMIN_APP_NAME : `${FIREBASE_ADMIN_APP_NAME}-${Date.now()}`;
    const adminApp =
      getApps().find((a) => a.name === appName) ||
      initializeApp(
        {
          credential: cert(jsonAccount),
          projectId: jsonAccount.projectId || CANONICAL_FIREBASE_PROJECT_ID,
        },
        appName
      );
    if (env === process.env) {
      cachedAdminApp = adminApp;
      cachedCredentialSource = 'service_account_json';
    }
    return { app: adminApp, credentialSource: 'service_account_json' };
  }

  // 2. Individual client_email + private_key env vars
  const clientEmail = String(
    env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_ADMIN_CLIENT_EMAIL || ''
  ).trim();
  const rawPrivateKey = String(
    env.FIREBASE_PRIVATE_KEY || env.FIREBASE_ADMIN_PRIVATE_KEY || ''
  ).trim();
  if (clientEmail && rawPrivateKey.includes('PRIVATE KEY')) {
    const normalizedKey = rawPrivateKey
      .replace(/^["']+|["']+$/g, '')
      .replace(/\\n/g, '\n');
    const projectId = String(env.FIREBASE_PROJECT_ID || CANONICAL_FIREBASE_PROJECT_ID).trim();
    const appName = env === process.env ? FIREBASE_ADMIN_APP_NAME : `${FIREBASE_ADMIN_APP_NAME}-${Date.now()}`;
    const adminApp =
      getApps().find((a) => a.name === appName) ||
      initializeApp(
        {
          credential: cert({
            projectId,
            clientEmail,
            privateKey: normalizedKey,
          }),
          projectId,
        },
        appName
      );
    if (env === process.env) {
      cachedAdminApp = adminApp;
      cachedCredentialSource = 'service_account_env_fields';
    }
    return { app: adminApp, credentialSource: 'service_account_env_fields' };
  }

  // 3. GOOGLE_APPLICATION_CREDENTIALS file path
  const gacPath = String(env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (gacPath && fs.existsSync(gacPath)) {
    try {
      const fileContent = fs.readFileSync(gacPath, 'utf-8');
      const fileAccount = parseServiceAccountJsonCandidate(fileContent);
      if (fileAccount) {
        const appName =
          env === process.env ? FIREBASE_ADMIN_APP_NAME : `${FIREBASE_ADMIN_APP_NAME}-${Date.now()}`;
        const adminApp =
          getApps().find((a) => a.name === appName) ||
          initializeApp(
            {
              credential: cert(fileAccount),
              projectId: fileAccount.projectId || CANONICAL_FIREBASE_PROJECT_ID,
            },
            appName
          );
        if (env === process.env) {
          cachedAdminApp = adminApp;
          cachedCredentialSource = 'google_application_credentials';
        }
        return { app: adminApp, credentialSource: 'google_application_credentials' };
      }
    } catch {
      // fall through to ADC
    }
  }

  // 4. Google Cloud Run / GCE Application Default Credentials
  if (preferQuotaBoundAdcApp && env === process.env) {
    return {
      app: getOrInitQuotaBoundAdcAdminApp(),
      credentialSource: 'application_default_credentials',
    };
  }

  const appName =
    env === process.env
      ? FIREBASE_ADMIN_APP_NAME
      : `${FIREBASE_ADMIN_APP_NAME}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const adminApp =
    getApps().find((a) => a.name === appName) ||
    initializeApp(
      {
        credential: applicationDefault(),
        projectId: CANONICAL_FIREBASE_PROJECT_ID,
      },
      appName
    );
  if (env === process.env) {
    cachedAdminApp = adminApp;
    cachedCredentialSource = 'application_default_credentials';
  }
  return { app: adminApp, credentialSource: 'application_default_credentials' };
}

/**
 * Initializes a secondary ADC Firebase Admin App that explicitly binds `x-goog-user-project: everykr`
 * (`getQuotaProjectId: () => 'everykr'`). This ensures Application Default Credentials succeed both:
 *  - when Cloud Run runs INSIDE project `everykr` (primary ADC app without header), AND
 *  - when Cloud Run runs in an external GCP host project whose runtime service account has been granted
 *    `roles/firebaseauth.admin` + `roles/serviceusage.serviceUsageConsumer` on project `everykr`.
 */
function getOrInitQuotaBoundAdcAdminApp(): AdminApp {
  if (cachedQuotaAdcAdminApp) {
    return cachedQuotaAdcAdminApp;
  }
  const existing = getApps().find((a) => a.name === FIREBASE_ADMIN_ADC_QUOTA_APP_NAME);
  if (existing) {
    cachedQuotaAdcAdminApp = existing;
    return existing;
  }
  const baseAdc = applicationDefault();
  const quotaBoundCredential: AdminCredential & { getQuotaProjectId: () => string } = {
    getAccessToken: () => baseAdc.getAccessToken(),
    getQuotaProjectId: () => CANONICAL_FIREBASE_PROJECT_ID,
  };
  cachedQuotaAdcAdminApp = initializeApp(
    {
      credential: quotaBoundCredential,
      projectId: CANONICAL_FIREBASE_PROJECT_ID,
    },
    FIREBASE_ADMIN_ADC_QUOTA_APP_NAME
  );
  return cachedQuotaAdcAdminApp;
}

function isHostProjectQuotaFallbackCandidate(err: any): boolean {
  const msg = String(err?.message || '');
  return (
    msg.includes('identitytoolkit.googleapis.com/overview') ||
    msg.includes('SERVICE_DISABLED') ||
    msg.includes('accessNotConfigured')
  );
}

export function isFirebaseAdminIamOrCredentialError(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return (
    code === 'auth/insufficient-permission' ||
    code.includes('credential') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('SERVICE_DISABLED') ||
    msg.includes('accessNotConfigured') ||
    msg.includes('Caller does not have required permission') ||
    msg.includes('Identity Toolkit API has not been used') ||
    msg.includes('identitytoolkit.googleapis.com') ||
    msg.includes('iam-admin/iam') ||
    msg.includes('serviceusage.services.use') ||
    msg.includes('Could not load the default credentials')
  );
}

/**
 * Non-destructive health probe for `/api/emails/system-status`.
 * Checks whether Firebase Admin SDK can query Identity Toolkit on project `everykr`
 * without modifying any user or exposing any credentials.
 */
export async function checkFirebaseAdminResetReadiness(): Promise<{
  ready: boolean;
  credentialSource: FirebaseAdminCredentialSource;
  statusDetail: string;
}> {
  const { app, credentialSource } = getOrInitFirebaseAdminApp();

  const probeApp = async (targetApp: AdminApp) => {
    const adminAuth = getAdminAuth(targetApp);
    await adminAuth.getUser('__everykr_nonexistent_health_probe_uid__');
  };

  try {
    await probeApp(app);
    return {
      ready: true,
      credentialSource,
      statusDetail: 'verified',
    };
  } catch (firstErr: any) {
    let finalErr = firstErr;
    const firstCode = String(firstErr?.code || '');
    const firstMsg = String(firstErr?.message || '');

    if (firstCode === 'auth/user-not-found' || firstMsg.includes('USER_NOT_FOUND')) {
      return {
        ready: true,
        credentialSource,
        statusDetail: 'verified_identity_toolkit_access',
      };
    }

    // If running on cross-project Cloud Run ADC where host project lacks Identity Toolkit enabled,
    // automatically retry with `x-goog-user-project: everykr`.
    if (
      credentialSource === 'application_default_credentials' &&
      !preferQuotaBoundAdcApp &&
      isHostProjectQuotaFallbackCandidate(firstErr)
    ) {
      try {
        const quotaApp = getOrInitQuotaBoundAdcAdminApp();
        await probeApp(quotaApp);
        preferQuotaBoundAdcApp = true;
        return {
          ready: true,
          credentialSource,
          statusDetail: 'verified_cross_project_adc_quota_bound',
        };
      } catch (quotaErr: any) {
        const quotaCode = String(quotaErr?.code || '');
        const quotaMsg = String(quotaErr?.message || '');
        if (quotaCode === 'auth/user-not-found' || quotaMsg.includes('USER_NOT_FOUND')) {
          preferQuotaBoundAdcApp = true;
          return {
            ready: true,
            credentialSource,
            statusDetail: 'verified_cross_project_adc_quota_bound',
          };
        }
        finalErr = quotaErr;
      }
    }

    if (isFirebaseAdminIamOrCredentialError(finalErr)) {
      return {
        ready: false,
        credentialSource,
        statusDetail:
          'Firebase Admin requires Cloud Run IAM roles (roles/firebaseauth.admin + roles/serviceusage.serviceUsageConsumer) on project everykr, or FIREBASE_SERVICE_ACCOUNT_JSON secret.',
      };
    }

    return {
      ready: false,
      credentialSource,
      statusDetail: String(finalErr?.code || 'admin_auth_probe_error'),
    };
  }
}

/**
 * Builds the premium EveryKR-branded Password Reset HTML & plain-text email.
 *
 * Strict guarantees:
 * - Prominent blue "Reset Password" CTA button (`#2563EB`) linking directly to `https://everykr.com/reset-password?oobCode=...`
 * - Never sends users to the Firebase-hosted `everykr.firebaseapp.com/__/auth/action` form
 * - Zero visible raw reset URLs anywhere in HTML or plain-text parts
 * - Official EveryKR logo & branding, "Reset Your Password" heading, friendly explanation,
 *   1-hour expiration & security notice, and "© 2026 EveryKR" footer
 * - Responsive & compatible with Gmail (Web/Mobile), Microsoft Outlook (Desktop MSO VML + Web), and Apple Mail
 */
export function buildFirebasePasswordResetEmailTemplate(params: {
  resetActionLink: string;
  displayName?: string | null;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const canonicalCustomWebsiteLink = resolveCustomWebsiteResetLinkFromFirebaseLink(
    params.resetActionLink
  );

  const safeResetLink = escapeHtml(canonicalCustomWebsiteLink);
  const rawName = String(params.displayName || '').trim();
  const hasRealDisplayName =
    Boolean(rawName) &&
    !rawName.includes('@') &&
    !/^(uid_|guest_)/i.test(rawName) &&
    !/^(everykr user|unknown|null|undefined)$/i.test(rawName) &&
    !(/^[A-Za-z0-9_-]{20,}$/.test(rawName) && /\d/.test(rawName));
  const friendlyFirstName = hasRealDisplayName ? extractFirstName(rawName) : '';
  const greetingHtml = friendlyFirstName
    ? `Hello <strong style="color:#0B1728;">${escapeHtml(friendlyFirstName)}</strong>,`
    : 'Hello,';
  const greetingText = friendlyFirstName ? `Hello ${friendlyFirstName},` : 'Hello,';

  const preheader =
    'Reset your EveryKR account password securely. This one-time reset button expires in 1 hour.';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <meta name="referrer" content="no-referrer" />
  <title>Reset Your Password — EveryKR</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F4F8FD; }
    @media only screen and (max-width: 620px) {
      .ekr-outer-pad { padding: 20px 12px !important; }
      .ekr-card { border-radius: 14px !important; }
      .ekr-header-pad { padding: 22px 20px !important; }
      .ekr-body-pad { padding: 28px 20px 24px 20px !important; }
      .ekr-footer-pad { padding: 18px 20px !important; }
      .ekr-h1 { font-size: 22px !important; line-height: 1.3 !important; }
      .ekr-btn-wrap { width: 100% !important; }
      .ekr-btn-link { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 15px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F8FD;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0B1728;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F4F8FD;">
    ${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F4F8FD" style="background-color:#F4F8FD;">
    <tr>
      <td align="center" class="ekr-outer-pad" style="padding:36px 16px;">
        <!--[if mso]>
        <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td>
        <![endif]-->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="ekr-card" bgcolor="#FFFFFF" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 8px 28px rgba(11,23,40,0.06);">
          <!-- Official EveryKR Branded Header -->
          <tr>
            <td bgcolor="#0B1930" class="ekr-header-pad" style="background-color:#0B1930;background:linear-gradient(135deg,#071326 0%,#102544 100%);padding:26px 34px;border-bottom:3px solid #2563EB;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right:12px;">
                          <img src="${OFFICIAL_EVERYKR_LOGO_URL}" alt="EveryKR" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:10px;object-fit:contain;background-color:#152C4E;padding:4px;" />
                        </td>
                        <td valign="middle">
                          <span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#60A5FA;margin-bottom:2px;">ACCOUNT SECURITY</span>
                          <div style="font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.02em;line-height:1.15;">
                            Every<span style="color:#60A5FA;">KR</span>
                          </div>
                          <div style="font-size:12px;color:#9FB0C7;margin-top:2px;">Everything Korea. One Platform.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="ekr-body-pad" style="padding:36px 34px 32px 34px;">
              <h1 class="ekr-h1" style="margin:0 0 16px 0;font-size:24px;line-height:1.3;font-weight:800;color:#0B1728;letter-spacing:-0.02em;">
                Reset Your Password
              </h1>

              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#334155;">
                ${greetingHtml}
              </p>

              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.68;color:#334155;">
                We received a request to reset the password for your <strong>EveryKR</strong> account. Click the button below to securely choose a new password and regain access to your account.
              </p>

              <!-- Single Prominent Blue CTA Button (Outlook VML + Standard HTML) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 30px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="ekr-btn-wrap">
                      <tr>
                        <td align="center" bgcolor="#2563EB" style="border-radius:10px;background-color:#2563EB;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeResetLink}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" stroke="f" fillcolor="#2563EB">
                            <w:anchorlock/>
                            <center style="color:#FFFFFF;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">
                              Reset Password
                            </center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${safeResetLink}" target="_blank" rel="noopener noreferrer" class="ekr-btn-link" style="display:inline-block;padding:15px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;line-height:1.2;color:#FFFFFF;background-color:#2563EB;text-decoration:none;border-radius:10px;border:1px solid #2563EB;">
                            Reset Password
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security & Expiration Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FAFC" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #2563EB;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#1E293B;">
                      <strong style="color:#0B1728;">Expiration Notice:</strong> For your security, this one-time password reset link expires in <strong>1 hour</strong> and becomes invalid as soon as you set a new password or request another link.
                    </p>
                    <p style="margin:0;font-size:13px;line-height:1.55;color:#475569;">
                      <strong style="color:#0B1728;">Security Notice:</strong> If you didn&rsquo;t request a password reset, you can safely ignore this email &mdash; your password will remain unchanged. Never share or forward this email to anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#F8FAFC" class="ekr-footer-pad" style="background-color:#F8FAFC;padding:20px 34px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#334155;">
                &copy; 2026 EveryKR
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;">
                Everything Korea. One Platform. &bull; Need assistance? Contact <a href="mailto:support@everykr.com" style="color:#2563EB;text-decoration:none;font-weight:600;">support@everykr.com</a>
              </p>
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
                </tr>
  </table>
</body>
</html>`;

  // Plain-text fallback intentionally omits any raw long action URL so the raw link is never displayed as visible text
  const text = [
    'EveryKR — Reset Your Password',
    '',
    greetingText,
    '',
    'We received a request to reset the password for your EveryKR account.',
    'Please open this email in Gmail, Outlook, or Apple Mail and select the "Reset Password" button to securely choose a new password.',
    '',
    'Expiration Notice: For your security, this one-time password reset link expires in 1 hour and can only be used once.',
    'Security Notice: If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.',
    '',
    `© 2026 EveryKR • Support: support@everykr.com • ${OFFICIAL_EVERYKR_URL.replace(/^https?:\/\//, '')}`,
  ].join('\n');

  return {
    subject: PASSWORD_RESET_EMAIL_SUBJECT,
    html,
    text,
  };
}

function checkSlidingWindowLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const existing = rateWindowMap.get(key);
  if (!existing || now >= existing.resetAtMs) {
    rateWindowMap.set(key, { count: 1, resetAtMs: now + windowMs });
    return { allowed: true };
  }
  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000)),
    };
  }
  existing.count += 1;
  return { allowed: true };
}

async function padAntiEnumerationFloor(startedAtMs: number): Promise<void> {
  const elapsed = Date.now() - startedAtMs;
  if (elapsed < ANTI_ENUMERATION_MIN_MS) {
    await new Promise((resolve) => setTimeout(resolve, ANTI_ENUMERATION_MIN_MS - elapsed));
  }
}

export interface FirebasePasswordResetTestOverrides {
  resolveAccountAndGenerateLink?: (params: {
    email: string;
    continueUrl: string;
  }) => Promise<
    | { status: 'not_found' }
    | { status: 'disabled' }
    | { status: 'generated'; resetActionLink: string; displayName?: string | null }
  >;
  dispatchEmail?: typeof dispatchTransactionalEmailServer;
  skipLatencyFloor?: boolean;
}

export function clearFirebasePasswordResetRateLimitsForTesting(): void {
  emailCooldownUntilMap.clear();
  rateWindowMap.clear();
  inFlightResetEmails.clear();
}

async function executeAdminResetResolutionWithApp(
  targetApp: AdminApp,
  params: { email: string; continueUrl: string }
): Promise<
  | { status: 'not_found' }
  | { status: 'disabled' }
  | { status: 'generated'; resetActionLink: string; displayName?: string | null }
> {
  const adminAuth = getAdminAuth(targetApp);

  let displayName: string | null | undefined;
  try {
    const userRecord = await adminAuth.getUserByEmail(params.email);
    if (userRecord.disabled) {
      return { status: 'disabled' };
    }
    displayName = userRecord.displayName;
  } catch (lookupErr: any) {
    const lookupCode = String(lookupErr?.code || '');
    const lookupMsg = String(lookupErr?.message || '');
    if (lookupCode === 'auth/user-not-found' || lookupMsg.includes('USER_NOT_FOUND')) {
      return { status: 'not_found' };
    }
    throw lookupErr;
  }

  const actionCodeSettings: AdminActionCodeSettings = {
    url: params.continueUrl,
    handleCodeInApp: false,
  };

  try {
    const firebaseGeneratedLink = await adminAuth.generatePasswordResetLink(
      params.email,
      actionCodeSettings
    );
    const customWebsiteResetLink =
      resolveCustomWebsiteResetLinkFromFirebaseLink(firebaseGeneratedLink);
    return { status: 'generated', resetActionLink: customWebsiteResetLink, displayName };
  } catch (genErr: any) {
    const genCode = String(genErr?.code || '');
    const genMsg = String(genErr?.message || '');
    if (genCode === 'auth/user-not-found' || genMsg.includes('USER_NOT_FOUND')) {
      return { status: 'not_found' };
    }
    if (
      genCode === 'auth/unauthorized-continue-uri' ||
      genCode === 'auth/invalid-continue-uri' ||
      genCode === 'auth/missing-continue-uri' ||
      genMsg.includes('UNAUTHORIZED_DOMAIN')
    ) {
      const firebaseGeneratedLink = await adminAuth.generatePasswordResetLink(params.email);
      const customWebsiteResetLink =
        resolveCustomWebsiteResetLinkFromFirebaseLink(firebaseGeneratedLink);
      return { status: 'generated', resetActionLink: customWebsiteResetLink, displayName };
    }
    throw genErr;
  }
}

async function defaultResolveAccountAndGenerateLink(params: {
  email: string;
  continueUrl: string;
}): Promise<
  | { status: 'not_found' }
  | { status: 'disabled' }
  | { status: 'generated'; resetActionLink: string; displayName?: string | null }
> {
  const { app, credentialSource } = getOrInitFirebaseAdminApp();
  try {
    return await executeAdminResetResolutionWithApp(app, params);
  } catch (firstErr: any) {
    if (
      credentialSource === 'application_default_credentials' &&
      !preferQuotaBoundAdcApp &&
      isHostProjectQuotaFallbackCandidate(firstErr)
    ) {
      const quotaApp = getOrInitQuotaBoundAdcAdminApp();
      const res = await executeAdminResetResolutionWithApp(quotaApp, params);
      preferQuotaBoundAdcApp = true;
      return res;
    }
    throw firstErr;
  }
}

/**
 * Handles EveryKR's custom Firebase Admin + Resend Password Reset workflow.
 * - Validates input & enforces anti-enumeration (identical response & cooldown for registered/unregistered/disabled accounts)
 * - Generates genuine one-time Firebase password reset action link on the server
 * - Sends premium EveryKR HTML email with a single "Reset Password" CTA button via Resend
 * - Never exposes Firebase Admin credentials, API keys, or reset links in HTTP responses or logs
 */
export async function handleFirebasePasswordResetRequestServer(params: {
  email: string;
  clientIp: string;
  continueUrl?: unknown;
  honeypot?: unknown;
  testOverrides?: FirebasePasswordResetTestOverrides;
}): Promise<{
  httpStatus: number;
  body: {
    ok: boolean;
    code: string;
    status: string;
    message: string;
    cooldownSeconds?: number;
    continueUrl?: string;
  };
}> {
  const startedAtMs = Date.now();
  const honeypot = String(params.honeypot || '').trim();
  if (honeypot.length > 0) {
    return {
      httpStatus: 400,
      body: {
        ok: false,
        code: 'auth/spam-blocked',
        status: 'spam_blocked',
        message: 'Automated submission blocked.',
      },
    };
  }

  const normalizedEmail = normalizeEmail(params.email);
  if (!normalizedEmail) {
    return {
      httpStatus: 400,
      body: {
        ok: false,
        code: 'auth/missing-email',
        status: 'invalid_input',
        message: 'Please enter your registered email address.',
      },
    };
  }

  if (!isValidEmailSyntax(normalizedEmail)) {
    return {
      httpStatus: 400,
      body: {
        ok: false,
        code: 'auth/invalid-email',
        status: 'invalid_input',
        message: 'Please enter a valid email address.',
      },
    };
  }

  if (inFlightResetEmails.has(normalizedEmail)) {
    return {
      httpStatus: 429,
      body: {
        ok: false,
        code: 'auth/duplicate-request',
        status: 'duplicate_request',
        message: 'A password reset request is already in progress. Please wait a moment.',
        cooldownSeconds: 10,
      },
    };
  }

  const now = Date.now();
  const cooldownUntil = emailCooldownUntilMap.get(normalizedEmail) || 0;
  if (now < cooldownUntil) {
    const waitSeconds = Math.max(1, Math.ceil((cooldownUntil - now) / 1000));
    return {
      httpStatus: 429,
      body: {
        ok: false,
        code: 'auth/too-many-requests',
        status: 'rate_limited',
        message: `Please wait ${waitSeconds} seconds before requesting another password reset email.`,
        cooldownSeconds: waitSeconds,
      },
    };
  }

  const clientIp = String(params.clientIp || 'unknown').trim() || 'unknown';
  const ipRate = checkSlidingWindowLimit(
    `fb_pwreset_ip:${clientIp}`,
    MAX_REQUESTS_PER_IP_WINDOW,
    RATE_WINDOW_MS
  );
  const emailRate = checkSlidingWindowLimit(
    `fb_pwreset_email:${normalizedEmail}`,
    MAX_REQUESTS_PER_EMAIL_WINDOW,
    RATE_WINDOW_MS
  );

  if (!ipRate.allowed || !emailRate.allowed) {
    const retryAfter = Math.max(ipRate.retryAfterSeconds || 60, emailRate.retryAfterSeconds || 60);
    return {
      httpStatus: 429,
      body: {
        ok: false,
        code: 'auth/too-many-requests',
        status: 'rate_limited',
        message: 'Too many password reset requests. Please wait a few minutes before trying again.',
        cooldownSeconds: Math.min(retryAfter, 120),
      },
    };
  }

  const safeContinueUrl = sanitizePasswordResetContinueUrl(params.continueUrl);
  inFlightResetEmails.add(normalizedEmail);
  // Set identical cooldown upfront for all valid requests to prevent cooldown-based account enumeration
  emailCooldownUntilMap.set(normalizedEmail, now + EMAIL_COOLDOWN_MS);

  try {
    const resolver =
      params.testOverrides?.resolveAccountAndGenerateLink || defaultResolveAccountAndGenerateLink;
    const dispatcher = params.testOverrides?.dispatchEmail || dispatchTransactionalEmailServer;

    const resolution = await resolver({
      email: normalizedEmail,
      continueUrl: safeContinueUrl,
    });

    // Anti-enumeration: non-existent and disabled accounts receive the exact same HTTP 200 response & timing floor
    if (resolution.status === 'not_found' || resolution.status === 'disabled') {
      if (!params.testOverrides?.skipLatencyFloor) {
        await padAntiEnumerationFloor(startedAtMs);
      }
      return {
        httpStatus: 200,
        body: {
          ok: true,
          code: 'auth/reset-email-sent',
          status: 'reset_sent',
          message: NEUTRAL_FIREBASE_RESET_SUCCESS_MESSAGE,
          cooldownSeconds: 60,
          continueUrl: safeContinueUrl,
        },
      };
    }

    const extractedOobCode = extractOobCodeFromFirebaseActionLink(
      resolution.resetActionLink
    );
    registerResetOobCodeEmailMappingServer(extractedOobCode, normalizedEmail);

    const customWebsiteResetLink =
      buildCustomEveryKrPasswordResetUrl(extractedOobCode);
    const sender = getWorkflowSenderIdentity('security');
    const template = buildFirebasePasswordResetEmailTemplate({
      resetActionLink: customWebsiteResetLink,
      displayName: resolution.displayName,
    });

    const delivery = await dispatcher({
      emailType: 'password_reset',
      to: normalizedEmail,
      senderName: sender.senderName,
      senderEmail: sender.senderEmail,
      replyTo: sender.replyTo,
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: {
        'X-Entity-Ref-ID': `everykr-pwreset-${crypto.randomBytes(6).toString('hex')}`,
      },
      triggerSource: 'forgot_password_firebase_admin_resend',
    });

    if (!delivery.delivered) {
      // Release per-email cooldown on server/provider failure so the user can retry once resolved
      emailCooldownUntilMap.delete(normalizedEmail);
      const httpStatus = delivery.status === 'unconfigured' ? 503 : 502;
      return {
        httpStatus,
        body: {
          ok: false,
          code: 'auth/email-delivery-failed',
          status: 'delivery_failed',
          message:
            'Unable to send the password reset email right now due to an email delivery issue. Please try again shortly.',
          continueUrl: safeContinueUrl,
        },
      };
    }

    if (!params.testOverrides?.skipLatencyFloor) {
      await padAntiEnumerationFloor(startedAtMs);
    }

    return {
      httpStatus: 200,
      body: {
        ok: true,
        code: 'auth/reset-email-sent',
        status: 'reset_sent',
        message: NEUTRAL_FIREBASE_RESET_SUCCESS_MESSAGE,
        cooldownSeconds: 60,
        continueUrl: safeContinueUrl,
      },
    };
  } catch (err: any) {
    // Release per-email cooldown if Admin SDK / network threw an infrastructure error
    emailCooldownUntilMap.delete(normalizedEmail);

    const errCode = String(err?.code || '');
    const errMsg = String(err?.message || '');

    if (
      errCode === 'auth/too-many-requests' ||
      errMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER') ||
      errMsg.includes('RESET_PASSWORD_EXCEED_LIMIT')
    ) {
      return {
        httpStatus: 429,
        body: {
          ok: false,
          code: 'auth/too-many-requests',
          status: 'rate_limited',
          message: 'Too many password reset requests. Please wait a few minutes before trying again.',
          cooldownSeconds: 60,
        },
      };
    }

    const isAdminCredentialIssue = isFirebaseAdminIamOrCredentialError(err);

    appendAutomatedEmailAuditLog({
      emailType: 'password_reset',
      recipient: normalizedEmail,
      senderName: 'EveryKR Account Security',
      senderEmail: 'security@everykr.com',
      subject: PASSWORD_RESET_EMAIL_SUBJECT,
      provider: 'firebase_admin_resend',
      deliveryStatus: 'failed',
      errorReason: isAdminCredentialIssue
        ? 'firebase_admin_iam_or_credentials_not_configured'
        : `firebase_admin_error:${errCode || 'unknown'}`,
      triggerSource: 'forgot_password_firebase_admin_resend',
    });

    console.error(
      '[EveryKR Password Reset] Firebase Admin reset link generation failed:',
      isAdminCredentialIssue
        ? 'Firebase Admin IAM/credentials not configured for project everykr'
        : errCode || 'unknown_error'
    );

    return {
      httpStatus: 503,
      body: {
        ok: false,
        code: isAdminCredentialIssue ? 'auth/admin-configuration-required' : 'auth/reset-failed',
        status: 'configuration_error',
        message:
          'Password reset email service is temporarily unavailable due to a server authentication configuration issue. Please try again shortly or contact support@everykr.com.',
        continueUrl: safeContinueUrl,
      },
    };
  } finally {
    inFlightResetEmails.delete(normalizedEmail);
  }
}
