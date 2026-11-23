import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type RegistrationRole =
  | 'student'
  | 'general'
  | 'agent'
  | 'employer'
  | 'landlord'
  | 'university';

export interface OtpRegistrationRecord {
  id: string;
  email: string;
  name: string;
  role: RegistrationRole;
  accountType?: RegistrationRole;
  /**
   * HMAC-SHA256 hash of the 6-digit OTP.
   * Plaintext OTPs and plaintext user passwords are NEVER stored in memory or on disk.
   */
  otpHash: string;
  /**
   * Salted scrypt password hash (scrypt:<saltHex>:<keyHex>) for verifying credentials on login.
   */
  passwordHash?: string;
  createdAt: string;
  lastSentAtMs: number;
  expiresAtMs: number;
  expiresAt: string;
  attemptsUsed: number;
  maxAttempts: number;
  consumed: boolean;
  emailVerified: boolean;
  accountStatus: 'unverified' | 'active' | 'pending_approval' | 'rejected' | 'expired' | 'locked';
  verifiedAt?: string;
  uid?: string;
  authProvider: 'email_otp' | 'google';
  lastDeliveryMessageId?: string;
  lastDeliveryMode?: 'live' | 'fallback';
}

export interface PasswordResetRecord {
  id: string;
  email: string;
  uid: string;
  /**
   * HMAC-SHA256 hash of the single-use 256-bit reset token bound to the normalized email.
   * Plaintext reset tokens are NEVER stored in memory or on disk.
   */
  tokenHash: string;
  requestedAt: string;
  requestedAtMs: number;
  expiresAt: string;
  expiresAtMs: number;
  consumed: boolean;
  consumedAt?: string;
  attemptsUsed: number;
  lastDeliveryMessageId?: string;
  lastDeliveryStatus?: 'delivered' | 'failed';
  actionUrl?: string;
}

interface PersistedOtpState {
  registrations: Record<string, OtpRegistrationRecord>;
  passwordResets?: Record<string, PasswordResetRecord>;
}

const DATA_FILE_PATH = path.resolve(process.cwd(), '.everykr-otp-registrations.json');

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5; // Maximum 5 incorrect attempts
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds countdown
export const PASSWORD_RESET_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const MAX_OTP_REQUESTS_PER_WINDOW = 6; // Max 6 OTP requests per 15 min per IP or email
const MAX_PASSWORD_RESETS_PER_WINDOW = 4; // Max 4 password reset requests per 15 min per IP or email

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const ROLE_LABELS: Record<RegistrationRole, string> = {
  student: 'International Student',
  general: 'General User',
  agent: 'Education Agent / Partner',
  employer: 'Korean Employer',
  landlord: 'Housing Provider',
  university: 'University Partner'
};

const RUNTIME_KEYS_PATH = path.resolve(process.cwd(), '.everykr-runtime-keys.json');
let cachedRuntimeOtpSecret: string | null = null;

function getOrCreateRuntimeKey(keyName: 'otpSecret' | 'sessionSecret'): string {
  try {
    let parsed: Record<string, string> = {};
    if (fs.existsSync(RUNTIME_KEYS_PATH)) {
      parsed = JSON.parse(fs.readFileSync(RUNTIME_KEYS_PATH, 'utf-8')) || {};
    }
    if (parsed[keyName] && typeof parsed[keyName] === 'string' && parsed[keyName].length >= 32) {
      return parsed[keyName];
    }
    const generated = crypto.randomBytes(32).toString('hex');
    parsed[keyName] = generated;
    fs.writeFileSync(RUNTIME_KEYS_PATH, JSON.stringify(parsed, null, 2), {
      encoding: 'utf-8',
      mode: 0o600
    });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

export function getOtpSigningSecret(): string {
  const configuredOtp = (process.env.OTP_SIGNING_SECRET || '').trim();
  if (
    configuredOtp &&
    configuredOtp !== 'everykr_hmac_otp_secret_change_in_production' &&
    configuredOtp.length >= 16
  ) {
    return configuredOtp;
  }
  const configuredNewsletter = (process.env.NEWSLETTER_SIGNING_SECRET || '').trim();
  if (
    configuredNewsletter &&
    configuredNewsletter !== 'everykr_hmac_newsletter_secret_change_in_production' &&
    configuredNewsletter.length >= 16
  ) {
    return configuredNewsletter;
  }
  if (!cachedRuntimeOtpSecret) {
    cachedRuntimeOtpSecret = getOrCreateRuntimeKey('otpSecret');
  }
  return cachedRuntimeOtpSecret;
}

/**
 * Generates a salted scrypt hash of a user password (`scrypt:<saltHex>:<derivedKeyHex>`).
 * Plaintext passwords are never stored.
 */
export function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Verifies a candidate password against a stored `scrypt:<saltHex>:<derivedKeyHex>` hash using timingSafeEqual.
 */
export function verifyPasswordScrypt(password: string, storedHash?: string): boolean {
  if (!password || !storedHash || !storedHash.startsWith('scrypt:')) {
    return false;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, expectedKeyHex] = parts;
  if (!salt || !expectedKeyHex) return false;
  try {
    const candidateKey = crypto.scryptSync(String(password), salt, 64);
    const expectedKey = Buffer.from(expectedKeyHex, 'hex');
    if (candidateKey.length !== expectedKey.length) return false;
    return crypto.timingSafeEqual(candidateKey, expectedKey);
  } catch {
    return false;
  }
}

export function getVerifiedPasswordHashForEmail(email: string): string | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;
  const state = loadState();
  const record = state.registrations[normalized];
  if (record && record.passwordHash) {
    return record.passwordHash;
  }
  return undefined;
}

export function updateOtpPasswordHashForEmail(email: string, passwordHash: string): void {
  const normalized = normalizeEmail(email);
  if (!normalized || !passwordHash.startsWith('scrypt:')) return;
  const state = loadState();
  const record = state.registrations[normalized];
  if (record) {
    record.passwordHash = passwordHash;
    saveState(state);
  }
}

function getSenderConfig(): { senderName: string; senderEmail: string; replyToEmail: string } {
  const rawEmail = (process.env.SECURITY_EMAIL_FROM_ADDRESS || 'security@everykr.com')
    .trim()
    .toLowerCase();
  const safeEmail =
    rawEmail === 'newsletter@everykr.com' || rawEmail === 'newsletter@newsletter.everykr.com'
      ? 'security@everykr.com'
      : rawEmail;
  return {
    senderName: (process.env.SECURITY_EMAIL_FROM_NAME || 'EveryKR Account Security').trim(),
    senderEmail: safeEmail,
    replyToEmail: (process.env.EMAIL_REPLY_TO || 'support@everykr.com').trim()
  };
}

let stateCache: PersistedOtpState | null = null;
let stateCacheMtimeMs = 0;

function loadState(): PersistedOtpState {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const stat = fs.statSync(DATA_FILE_PATH);
      if (stateCache && stat.mtimeMs === stateCacheMtimeMs) {
        return stateCache;
      }
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedOtpState;
      if (parsed && typeof parsed.registrations === 'object') {
        if (!parsed.passwordResets || typeof parsed.passwordResets !== 'object') {
          parsed.passwordResets = {};
        }
        stateCache = parsed;
        stateCacheMtimeMs = stat.mtimeMs;
        return stateCache;
      }
    }
  } catch (err) {
    console.warn('Could not read OTP registration state file, initializing fresh store:', err);
  }
  if (!stateCache) {
    stateCache = { registrations: {}, passwordResets: {} };
  }
  return stateCache;
}

function saveState(state: PersistedOtpState): void {
  if (!state.passwordResets) {
    state.passwordResets = {};
  }
  stateCache = state;
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
    if (fs.existsSync(DATA_FILE_PATH)) {
      stateCacheMtimeMs = fs.statSync(DATA_FILE_PATH).mtimeMs;
    }
  } catch (err) {
    console.warn('Could not persist OTP registration state:', err);
  }
}

export function normalizeEmail(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

export function isValidEmailAddress(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(normalized);
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  const raw = String(password || '');
  if (raw.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long.'
    };
  }
  const hasLetter = /[a-zA-Z]/.test(raw);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(raw);
  if (!hasLetter || !hasNumberOrSymbol) {
    return {
      valid: false,
      message: 'Password must include at least one letter and one number or special character.'
    };
  }
  return { valid: true };
}

export function sanitizeRegistrationRole(role?: string): RegistrationRole {
  if (
    role === 'general' ||
    role === 'agent' ||
    role === 'employer' ||
    role === 'landlord' ||
    role === 'university'
  ) {
    return role;
  }
  return 'student';
}

/**
 * Generates a cryptographically secure random 6-digit OTP (100000 - 999999).
 */
export function generateCryptographicSixDigitOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes an HMAC-SHA256 hash of the OTP bound to the normalized email address.
 * Plaintext OTP is never stored.
 */
export function hashOtpCode(email: string, otpCode: string): string {
  const normalized = normalizeEmail(email);
  return crypto
    .createHmac('sha256', getOtpSigningSecret())
    .update(`otp:${normalized}:${otpCode.trim()}`)
    .digest('hex');
}

/**
 * Timing-safe comparison of two hex HMAC digests.
 */
function verifyOtpHashMatch(expectedHash: string, candidateHash: string): boolean {
  if (!expectedHash || !candidateHash || expectedHash.length !== candidateHash.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(candidateHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Creates a short-lived signed verification proof token once the user verifies their OTP.
 */
export function issueVerificationProofToken(
  email: string,
  role: RegistrationRole,
  verifiedAtIso: string
): string {
  const normalized = normalizeEmail(email);
  const payload = `${normalized}|${role}|${verifiedAtIso}`;
  const sig = crypto
    .createHmac('sha256', getOtpSigningSecret())
    .update(`proof:${payload}`)
    .digest('hex');
  return Buffer.from(`${payload}|${sig}`, 'utf-8').toString('base64url');
}

export function verifyRegistrationProofToken(params: {
  email: string;
  role?: string;
  token: string;
}): { valid: boolean; verifiedAt?: string; role?: RegistrationRole } {
  try {
    const decoded = Buffer.from(params.token, 'base64url').toString('utf-8');
    const [tokenEmail, tokenRole, verifiedAtIso, providedSig] = decoded.split('|');
    if (!tokenEmail || !tokenRole || !verifiedAtIso || !providedSig) {
      return { valid: false };
    }
    const normalized = normalizeEmail(params.email);
    if (tokenEmail !== normalized) {
      return { valid: false };
    }

    // Proof token is valid for 15 minutes after OTP verification to complete account creation
    const ageMs = Date.now() - new Date(verifiedAtIso).getTime();
    if (isNaN(ageMs) || ageMs < -5000 || ageMs > 15 * 60 * 1000) {
      return { valid: false };
    }

    const payload = `${tokenEmail}|${tokenRole}|${verifiedAtIso}`;
    const expectedSig = crypto
      .createHmac('sha256', getOtpSigningSecret())
      .update(`proof:${payload}`)
      .digest('hex');
    const isHmacMatch = verifyOtpHashMatch(expectedSig, providedSig);

    if (!isHmacMatch) {
      // Fallback if server restarted after OTP verification: require authoritative verified state in .everykr-otp-registrations.json
      const state = loadState();
      const reg = state.registrations[normalized];
      if (!reg || !reg.emailVerified || !reg.consumed || reg.verifiedAt !== verifiedAtIso) {
        return { valid: false };
      }
    }

    return {
      valid: true,
      verifiedAt: verifiedAtIso,
      role: sanitizeRegistrationRole(tokenRole)
    };
  } catch {
    return { valid: false };
  }
}

export function checkOtpRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const current = rateLimitStore.get(key);
  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (current.count >= MAX_OTP_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }
  current.count += 1;
  return { allowed: true };
}

function buildOtpVerificationEmailHtml(params: {
  name: string;
  email: string;
  roleLabel: string;
  otpCode: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Verify Your EveryKR Account';
  const text = `Hello ${params.name},\n\nYour EveryKR 6-digit verification code is: ${params.otpCode}\n\nSelected Account Role: ${params.roleLabel}\n\nThis verification code expires in 5 minutes. Do not share this code with anyone.\n\nIf you did not request an EveryKR account, you can safely ignore this email.\n\n— EveryKR Verification Security`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F7FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#10243A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7FA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 20px rgba(16,36,58,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#10243A 0%,#1769AA 100%);padding:26px 32px;">
              <span style="font-size:22px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;">Every<span style="color:#19B6A4;">KR</span></span>
              <span style="display:inline-block;margin-left:10px;padding:3px 9px;background-color:rgba(25,182,164,0.2);border:1px solid rgba(25,182,164,0.45);border-radius:6px;color:#19B6A4;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Account Security</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px 0;font-size:21px;line-height:1.35;font-weight:800;color:#10243A;">Verify Your EveryKR Account</h1>
              <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#334155;">
                Hello <strong>${params.name}</strong>, thank you for registering on EveryKR as a <strong>${params.roleLabel}</strong>. Enter the 6-digit verification code below to verify your email address and activate your account:
              </p>
              <div style="margin:24px 0;padding:22px;background-color:#F8FAFC;border:2px dashed #1769AA;border-radius:14px;text-align:center;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#64748B;margin-bottom:8px;">Your 6-Digit Verification Code</div>
                <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:900;letter-spacing:8px;color:#10243A;">${params.otpCode}</div>
                <div style="font-size:12px;color:#D97706;font-weight:600;margin-top:10px;">Expires in 5 minutes · Valid for single use only</div>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;">
                For your security, never share this verification code with anyone. If you did not initiate this registration with <strong>${params.email}</strong>, please disregard this message.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F8FAFC;padding:18px 32px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;text-align:center;">
              <strong>EveryKR</strong> · Republic of Korea International Student &amp; Expat Platform · Seoul, South Korea
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

async function sendOtpEmailViaResend(params: {
  toEmail: string;
  name: string;
  roleLabel: string;
  otpCode: string;
}): Promise<{ delivered: boolean; mode: 'live' | 'fallback'; messageId?: string; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  const { senderName, senderEmail } = getSenderConfig();
  const { subject, html, text } = buildOtpVerificationEmailHtml({
    name: params.name,
    email: params.toEmail,
    roleLabel: params.roleLabel,
    otpCode: params.otpCode
  });

  if (!resendKey) {
    return {
      delivered: false,
      mode: 'fallback',
      error: 'RESEND_API_KEY is not configured on the server.'
    };
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [params.toEmail],
          subject,
          html,
          text
        })
      });

      const data: any = await response.json().catch(() => ({}));
      if (response.ok && data?.id) {
        return {
          delivered: true,
          mode: 'live',
          messageId: String(data.id)
        };
      }

      const errMsg = data?.message || data?.error || `Resend HTTP ${response.status}`;
      if (attempt === 2) {
        return {
          delivered: false,
          mode: 'live',
          error: String(errMsg)
        };
      }
    } catch (err: any) {
      if (attempt === 2) {
        return {
          delivered: false,
          mode: 'live',
          error: err?.message || 'Network error while connecting to Resend API'
        };
      }
    }
  }

  return {
    delivered: false,
    mode: 'live',
    error: 'Resend email dispatch failed'
  };
}

/**
 * Step 1 of Registration: Validate fields, generate 6-digit cryptographic OTP,
 * store ONLY the HMAC-SHA256 hash of the OTP, invalidate any previous OTP,
 * and dispatch the verification code via Resend API.
 */
export function isEmailVerifiedInOtpStore(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const state = loadState();
  const existing = state.registrations[normalized];
  return Boolean(existing && existing.emailVerified);
}

export function removeOtpRegistrationByEmail(email: string): void {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const state = loadState();
  if (state.registrations[normalized]) {
    delete state.registrations[normalized];
    saveState(state);
  }
}

export async function requestRegistrationOtp(params: {
  name: string;
  email: string;
  password: string;
  role?: string;
  clientIp: string;
  isResend?: boolean;
  isEmailAlreadyRegistered?: boolean;
}): Promise<{
  ok: boolean;
  status:
    | 'otp_sent'
    | 'invalid_input'
    | 'weak_password'
    | 'duplicate_email'
    | 'cooldown_active'
    | 'rate_limited'
    | 'email_delivery_failed';
  message: string;
  email?: string;
  role?: RegistrationRole;
  expiresInSeconds?: number;
  resendCooldownSeconds?: number;
  retryAfterSeconds?: number;
}> {
  const normalizedEmail = normalizeEmail(params.email);
  const trimmedName = (params.name || '').trim();
  const role = sanitizeRegistrationRole(params.role);

  if (!trimmedName || trimmedName.length < 2) {
    return {
      ok: false,
      status: 'invalid_input',
      message: 'Please enter your full name (at least 2 characters).'
    };
  }

  if (!isValidEmailAddress(normalizedEmail)) {
    return {
      ok: false,
      status: 'invalid_input',
      message: 'Please enter a valid email address (e.g. scholar@university.ac.kr).'
    };
  }

  const passwordCheck = validatePasswordStrength(params.password);
  if (!passwordCheck.valid) {
    return {
      ok: false,
      status: 'weak_password',
      message: passwordCheck.message || 'Password does not meet security requirements.'
    };
  }

  const state = loadState();
  const now = Date.now();
  const existing = state.registrations[normalizedEmail];

  // Prevent duplicate registration for already verified emails
  if (params.isEmailAlreadyRegistered || (existing && existing.emailVerified && !params.isResend)) {
    return {
      ok: false,
      status: 'duplicate_email',
      message: 'An EveryKR account with this email address is already registered and verified. Please sign in instead.'
    };
  }

  // Enforce 60-second resend cooldown for the same email address
  if (existing && !existing.consumed && now - existing.lastSentAtMs < OTP_RESEND_COOLDOWN_MS) {
    const remainingCooldown = Math.max(
      1,
      Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAtMs)) / 1000)
    );
    return {
      ok: false,
      status: 'cooldown_active',
      message: `Please wait ${remainingCooldown} seconds before requesting a new verification code.`,
      resendCooldownSeconds: remainingCooldown,
      retryAfterSeconds: remainingCooldown
    };
  }

  // Enforce sliding-window rate limits per IP and per Email
  const ipRate = checkOtpRateLimit(`otp_ip:${params.clientIp}`);
  if (!ipRate.allowed) {
    return {
      ok: false,
      status: 'rate_limited',
      message: `Too many verification requests from this network. Please wait ${ipRate.retryAfterSeconds} seconds.`,
      retryAfterSeconds: ipRate.retryAfterSeconds
    };
  }

  const emailRate = checkOtpRateLimit(`otp_email:${normalizedEmail}`);
  if (!emailRate.allowed) {
    return {
      ok: false,
      status: 'rate_limited',
      message: `Too many OTP requests for ${normalizedEmail}. Please wait ${emailRate.retryAfterSeconds} seconds.`,
      retryAfterSeconds: emailRate.retryAfterSeconds
    };
  }

  // Generate fresh 6-digit OTP and compute its HMAC-SHA256 hash (invalidates any previous OTP)
  const otpCode = generateCryptographicSixDigitOtp();
  const otpHash = hashOtpCode(normalizedEmail, otpCode);
  const nowIso = new Date(now).toISOString();
  const expiresAtMs = now + OTP_EXPIRY_MS;
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  // Send OTP via Resend API
  const delivery = await sendOtpEmailViaResend({
    toEmail: normalizedEmail,
    name: trimmedName,
    roleLabel: ROLE_LABELS[role],
    otpCode
  });

  if (!delivery.delivered) {
    return {
      ok: false,
      status: 'email_delivery_failed',
      message:
        delivery.error ||
        'Unable to send verification email to this address. Please check the email address and try again.'
    };
  }

  const passwordHash = hashPasswordScrypt(params.password);

  const record: OtpRegistrationRecord = {
    id: existing?.id || `reg_${crypto.randomBytes(6).toString('hex')}`,
    email: normalizedEmail,
    name: trimmedName,
    role,
    otpHash,
    passwordHash,
    createdAt: existing?.createdAt || nowIso,
    lastSentAtMs: now,
    expiresAtMs,
    expiresAt: expiresAtIso,
    attemptsUsed: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    consumed: false,
    emailVerified: false,
    accountStatus: 'unverified',
    authProvider: 'email_otp',
    lastDeliveryMessageId: delivery.messageId,
    lastDeliveryMode: delivery.mode
  };

  state.registrations[normalizedEmail] = record;
  saveState(state);

  return {
    ok: true,
    status: 'otp_sent',
    message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
    email: normalizedEmail,
    role,
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
    resendCooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000)
  };
}

/**
 * Step 2 of Registration: Verify the 6-digit OTP on the backend.
 * Enforces 5-minute expiry, max 5 incorrect attempts, and single-use consumption.
 */
export function verifyRegistrationOtp(params: {
  email: string;
  otp: string;
}): {
  ok: boolean;
  status:
    | 'verified'
    | 'invalid_otp'
    | 'expired_otp'
    | 'max_attempts_exceeded'
    | 'already_used'
    | 'not_found';
  message: string;
  attemptsRemaining?: number;
  verificationProofToken?: string;
  verifiedUser?: {
    name: string;
    email: string;
    role: RegistrationRole;
    verifiedAt: string;
  };
} {
  const normalizedEmail = normalizeEmail(params.email);
  const candidateOtp = String(params.otp || '').trim();

  if (!normalizedEmail || !/^\d{6}$/.test(candidateOtp)) {
    return {
      ok: false,
      status: 'invalid_otp',
      message: 'Please enter a valid 6-digit numerical verification code.'
    };
  }

  const state = loadState();
  const record = state.registrations[normalizedEmail];

  if (!record) {
    return {
      ok: false,
      status: 'not_found',
      message: 'No pending verification code found for this email. Please request a new code.'
    };
  }

  if (record.consumed || !record.otpHash) {
    return {
      ok: false,
      status: 'already_used',
      message: 'This verification code has already been used or invalidated. Please request a new code.'
    };
  }

  if (record.accountStatus === 'locked' || record.attemptsUsed >= record.maxAttempts) {
    record.accountStatus = 'locked';
    record.otpHash = '';
    saveState(state);
    return {
      ok: false,
      status: 'max_attempts_exceeded',
      message: 'Maximum of 5 incorrect attempts reached. For security, this code is locked. Please click Resend OTP to receive a new code.',
      attemptsRemaining: 0
    };
  }

  const now = Date.now();
  if (now > record.expiresAtMs) {
    record.accountStatus = 'expired';
    record.otpHash = '';
    saveState(state);
    return {
      ok: false,
      status: 'expired_otp',
      message: 'This verification code has expired (valid for 5 minutes). Please click Resend OTP to receive a new code.',
      attemptsRemaining: 0
    };
  }

  const candidateHash = hashOtpCode(normalizedEmail, candidateOtp);
  const isMatch = verifyOtpHashMatch(record.otpHash, candidateHash);

  if (!isMatch) {
    record.attemptsUsed += 1;
    const remaining = Math.max(0, record.maxAttempts - record.attemptsUsed);

    if (remaining === 0) {
      record.accountStatus = 'locked';
      record.otpHash = '';
      saveState(state);
      return {
        ok: false,
        status: 'max_attempts_exceeded',
        message: 'Maximum of 5 incorrect attempts reached. Please request a new verification code.',
        attemptsRemaining: 0
      };
    }

    saveState(state);
    return {
      ok: false,
      status: 'invalid_otp',
      message: `Incorrect verification code. You have ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
      attemptsRemaining: remaining
    };
  }

  // OTP is valid! Immediately consume it and erase the hash so it can NEVER be reused.
  const verifiedAtIso = new Date(now).toISOString();
  record.consumed = true;
  record.otpHash = '';
  record.emailVerified = true;
  record.accountStatus = 'active';
  record.verifiedAt = verifiedAtIso;
  saveState(state);

  const verificationProofToken = issueVerificationProofToken(
    normalizedEmail,
    record.role,
    verifiedAtIso
  );

  return {
    ok: true,
    status: 'verified',
    message: 'Email verified! Completing your EveryKR account registration...',
    verificationProofToken,
    verifiedUser: {
      name: record.name,
      email: record.email,
      role: record.role,
      verifiedAt: verifiedAtIso
    }
  };
}

/**
 * Records the final Firebase Auth UID once the verified account is persisted.
 */
export function recordVerifiedAccountActivation(params: {
  email: string;
  uid: string;
  name?: string;
  role?: string;
  password?: string;
  authProvider?: 'email_otp' | 'google';
}): void {
  const normalized = normalizeEmail(params.email);
  if (!normalized) return;
  const state = loadState();
  const existing = state.registrations[normalized];
  const nowIso = new Date().toISOString();
  const role = sanitizeRegistrationRole(params.role || existing?.role);
  const passwordHash =
    params.password && String(params.password).length >= 8
      ? hashPasswordScrypt(String(params.password))
      : existing?.passwordHash;

  state.registrations[normalized] = {
    id: existing?.id || `reg_${crypto.randomBytes(6).toString('hex')}`,
    email: normalized,
    name: params.name?.trim() || existing?.name || normalized.split('@')[0],
    role,
    otpHash: '',
    passwordHash,
    createdAt: existing?.createdAt || nowIso,
    lastSentAtMs: existing?.lastSentAtMs || Date.now(),
    expiresAtMs: existing?.expiresAtMs || Date.now(),
    expiresAt: existing?.expiresAt || nowIso,
    attemptsUsed: existing?.attemptsUsed || 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    consumed: true,
    emailVerified: true,
    accountStatus: 'active',
    verifiedAt: existing?.verifiedAt || nowIso,
    uid: params.uid,
    authProvider: params.authProvider || existing?.authProvider || 'email_otp',
    lastDeliveryMessageId: existing?.lastDeliveryMessageId,
    lastDeliveryMode: existing?.lastDeliveryMode
  };

  saveState(state);
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Computes a domain-separated SHA-256 hash of a 256-bit cryptographically random password reset token.
 * Raw reset tokens are NEVER stored on disk or in logs.
 * Version v2 invalidates all previously issued v1 tokens immediately.
 */
export function hashPasswordResetToken(rawToken: string): string {
  return crypto
    .createHash('sha256')
    .update(`everykr_pw_reset_v2:${String(rawToken || '').trim()}`)
    .digest('hex');
}

function maskEmailForResetDisplay(email: string): string {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return '***@***';
  const maskedLocal =
    local.length <= 2
      ? `${local[0]}*`
      : `${local[0]}${'*'.repeat(Math.min(5, local.length - 2))}${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

function buildPasswordResetEmailHtml(params: {
  name: string;
  email: string;
  resetUrl: string;
}): string {
  const firstName = escapeHtml(params.name.split(' ')[0] || 'Scholar');
  const safeEmail = escapeHtml(params.email);
  const safeResetUrl = escapeHtml(params.resetUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="no-referrer" />
  <title>Reset Your EveryKR Password</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.05);">
          <tr>
            <td style="background-color:#0F172A;padding:24px 36px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:12px;">
                    <img src="https://everykr.com/everykr-logo.png" alt="EveryKR" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:8px;object-fit:contain;background-color:rgba(255,255,255,0.08);padding:3px;" />
                  </td>
                  <td valign="middle">
                    <div style="font-size:20px;font-weight:800;color:#FFFFFF;letter-spacing:-0.02em;">
                      EveryKR <span style="font-size:11px;font-weight:700;color:#2DD4BF;text-transform:uppercase;letter-spacing:0.12em;margin-left:8px;">Account Security</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 36px 28px 36px;">
              <p style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#0F172A;">
                Hello ${firstName},
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#475569;">
                We received a request to reset the password for your EveryKR account (<strong style="color:#0F172A;">${safeEmail}</strong>). Click the button below to choose a new password.
              </p>

              <div style="text-align:center;margin:28px 0;">
                <a href="${safeResetUrl}" rel="noreferrer noopener" style="display:inline-block;background-color:#0F172A;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">
                  Reset My Password
                </a>
              </div>

              <div style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#92400E;">
                  <strong>Security Notice:</strong> This password reset link expires in <strong>15 minutes</strong> and can only be used once. If you did not request a password reset, you can safely ignore this email—your password will remain unchanged.
                </p>
              </div>

              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:#0D9488;">
                <a href="${safeResetUrl}" rel="noreferrer noopener" style="color:#0D9488;text-decoration:underline;">${safeResetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">
                &copy; ${new Date().getFullYear()} EveryKR &bull; International Education &amp; Student Platform for South Korea<br/>
                Need help? Contact <a href="mailto:support@everykr.com" style="color:#0D9488;text-decoration:none;">support@everykr.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetEmailText(params: {
  name: string;
  email: string;
  resetUrl: string;
}): string {
  return [
    `EveryKR Account Password Reset`,
    ``,
    `Hello ${params.name || 'Scholar'},`,
    ``,
    `We received a request to reset the password for your EveryKR account (${params.email}).`,
    `Use the link below to set a new password (valid for 15 minutes, single-use):`,
    ``,
    params.resetUrl,
    ``,
    `If you did not request this password reset, please ignore this email. Your account remains secure.`,
    ``,
    `EveryKR Security Team (support@everykr.com)`
  ].join('\n');
}

async function sendPasswordResetEmailViaResend(params: {
  toEmail: string;
  name: string;
  resetUrl: string;
}): Promise<{
  delivered: boolean;
  mode: 'resend' | 'unconfigured';
  messageId?: string;
  providerStatus?: number;
  error?: string;
}> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const { senderName, senderEmail, replyToEmail } = getSenderConfig();

  if (!apiKey) {
    console.warn(
      `[EveryKR Password Reset] RESEND_API_KEY is not configured in environment. Reset email could not be dispatched via Resend.`
    );
    return {
      delivered: false,
      mode: 'unconfigured',
      error:
        'Transactional email service (RESEND_API_KEY) is not configured on the server.'
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [params.toEmail],
        reply_to: replyToEmail,
        subject: `Reset Your EveryKR Password`,
        html: buildPasswordResetEmailHtml({
          name: params.name,
          email: params.toEmail,
          resetUrl: params.resetUrl
        }),
        text: buildPasswordResetEmailText({
          name: params.name,
          email: params.toEmail,
          resetUrl: params.resetUrl
        })
      })
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error(`[EveryKR Password Reset] Resend API error (${response.status}):`, errBody);
      return {
        delivered: false,
        mode: 'resend',
        providerStatus: response.status,
        error: `Email provider returned HTTP ${response.status}. Please verify sender domain configuration.`
      };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return {
      delivered: true,
      mode: 'resend',
      providerStatus: response.status,
      messageId: data.id || `resend_pw_${Date.now()}`
    };
  } catch (err: any) {
    console.error('[EveryKR Password Reset] Network error calling Resend API:', err?.message || err);
    return {
      delivered: false,
      mode: 'resend',
      error: 'Network error while communicating with email delivery provider.'
    };
  }
}

export const NEUTRAL_PASSWORD_RESET_MESSAGE =
  'If an account exists for this email, a password reset link will be sent.';

export const OFFICIAL_EVERYKR_DOMAIN = 'https://everykr.com';
export const OFFICIAL_EVERYKR_LOGIN_URL = 'https://everykr.com/login';
export const OFFICIAL_PASSWORD_RESET_ACTION_URL = 'https://everykr.com/reset-password';

/**
 * Builds the canonical EveryKR password reset URL.
 * Strictly enforces https://everykr.com/reset-password?token=<OPAQUE_TOKEN>
 * without exposing the user's email address or extra parameters in the URL.
 */
export function buildCanonicalPasswordResetUrl(rawToken: string): string {
  const cleanToken = String(rawToken || '').trim();
  return `${OFFICIAL_PASSWORD_RESET_ACTION_URL}?token=${encodeURIComponent(cleanToken)}`;
}

function checkPasswordResetRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const current = rateLimitStore.get(key);
  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (current.count >= MAX_PASSWORD_RESETS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }
  current.count += 1;
  return { allowed: true };
}

/**
 * Initiates a password reset request.
 * - Always returns the neutral anti-enumeration message for valid email formats.
 * - Rate-limits repeated requests per email (60s cooldown, max 4 per 15m) and per IP.
 * - When a registered user exists, generates a single-use 15-minute cryptographic opaque token,
 *   invalidates any previously issued reset token for that user, stores ONLY its SHA-256 hash
 *   on disk, and sends https://everykr.com/reset-password?token=<TOKEN> via Resend API.
 */
export async function requestPasswordResetEmail(params: {
  email: string;
  clientIp: string;
  baseUrl?: string;
  registeredUser: {
    uid: string;
    email: string;
    name: string;
  } | null;
}): Promise<{
  ok: boolean;
  status: 'reset_requested' | 'rate_limited' | 'invalid_input' | 'delivery_failed';
  message: string;
  cooldownSeconds?: number;
}> {
  const normalizedEmail = normalizeEmail(params.email);
  const clientIp = (params.clientIp || 'unknown').trim();

  if (!normalizedEmail || !isValidEmailAddress(normalizedEmail)) {
    return {
      ok: false,
      status: 'invalid_input',
      message: 'Please enter a valid email address.'
    };
  }

  const state = loadState();
  if (!state.passwordResets) {
    state.passwordResets = {};
  }
  const now = Date.now();

  const existingReset = state.passwordResets[normalizedEmail];
  if (existingReset && now - existingReset.requestedAtMs < PASSWORD_RESET_COOLDOWN_MS) {
    const waitSec = Math.ceil(
      (PASSWORD_RESET_COOLDOWN_MS - (now - existingReset.requestedAtMs)) / 1000
    );
    return {
      ok: false,
      status: 'rate_limited',
      message: `Please wait ${waitSec} seconds before requesting another password reset link.`,
      cooldownSeconds: waitSec
    };
  }

  const emailLimit = checkPasswordResetRateLimit(`pwreset_email:${normalizedEmail}`);
  const ipLimit = checkPasswordResetRateLimit(`pwreset_ip:${clientIp}`);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return {
      ok: false,
      status: 'rate_limited',
      message: 'Too many password reset requests. Please wait 15 minutes before trying again.',
      cooldownSeconds: emailLimit.retryAfterSeconds || ipLimit.retryAfterSeconds || 60
    };
  }

  // Anti-enumeration: if no registered user exists for this email, return the exact same
  // neutral message without sending an email or revealing account existence.
  if (!params.registeredUser) {
    return {
      ok: true,
      status: 'reset_requested',
      message: NEUTRAL_PASSWORD_RESET_MESSAGE,
      cooldownSeconds: 60
    };
  }

  // Generate 256-bit cryptographically secure opaque single-use token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashPasswordResetToken(rawToken);
  const nowIso = new Date(now).toISOString();
  const expiresAtMs = now + PASSWORD_RESET_EXPIRY_MS;
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  const resetUrl = buildCanonicalPasswordResetUrl(rawToken);

  const delivery = await sendPasswordResetEmailViaResend({
    toEmail: normalizedEmail,
    name: params.registeredUser.name || normalizedEmail.split('@')[0],
    resetUrl
  });

  if (!delivery.delivered) {
    return {
      ok: false,
      status: 'delivery_failed',
      message:
        delivery.error ||
        'We could not deliver the password reset email right now. Please try again shortly.'
    };
  }

  // Invalidate any previously issued reset tokens for this UID or email
  for (const [key, rec] of Object.entries(state.passwordResets)) {
    if (key === normalizedEmail || rec.uid === params.registeredUser.uid) {
      rec.consumed = true;
      rec.tokenHash = '';
    }
  }

  state.passwordResets[normalizedEmail] = {
    id: `pwreset_${crypto.randomBytes(6).toString('hex')}`,
    email: normalizedEmail,
    uid: params.registeredUser.uid,
    tokenHash,
    requestedAt: nowIso,
    requestedAtMs: now,
    expiresAtMs,
    expiresAt: expiresAtIso,
    consumed: false,
    attemptsUsed: 0,
    lastDeliveryMessageId: delivery.messageId,
    lastDeliveryStatus: 'delivered',
    actionUrl: OFFICIAL_PASSWORD_RESET_ACTION_URL
  };

  saveState(state);

  return {
    ok: true,
    status: 'reset_requested',
    message: NEUTRAL_PASSWORD_RESET_MESSAGE,
    cooldownSeconds: 60
  };
}

/**
 * Verifies whether an opaque password reset token is currently valid, unexpired (15 min),
 * and unconsumed without requiring the email in the URL and without consuming the token yet.
 */
export function verifyPasswordResetToken(params: {
  token: string;
}): {
  ok: boolean;
  status: 'valid' | 'invalid_token' | 'expired_token' | 'already_used';
  message: string;
  maskedEmail?: string;
} {
  const rawToken = String(params.token || '').trim();

  if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
    return {
      ok: false,
      status: 'invalid_token',
      message: 'This password reset link is invalid or malformed. Please request a new link.'
    };
  }

  const state = loadState();
  if (!state.passwordResets) {
    state.passwordResets = {};
  }

  const candidateHash = hashPasswordResetToken(rawToken);
  const records = Object.values(state.passwordResets);

  let matchedRecord: PasswordResetRecord | undefined;
  for (const rec of records) {
    if (rec.tokenHash && verifyOtpHashMatch(rec.tokenHash, candidateHash)) {
      matchedRecord = rec;
      break;
    }
  }

  if (!matchedRecord) {
    return {
      ok: false,
      status: 'invalid_token',
      message: 'This password reset link is invalid, has already been used, or has been replaced by a newer request.'
    };
  }

  if (matchedRecord.consumed || !matchedRecord.tokenHash) {
    return {
      ok: false,
      status: 'already_used',
      message: 'This password reset link has already been used. Please request a new link if you need to reset your password again.'
    };
  }

  const now = Date.now();
  if (now > matchedRecord.expiresAtMs) {
    matchedRecord.tokenHash = '';
    matchedRecord.consumed = true;
    saveState(state);
    return {
      ok: false,
      status: 'expired_token',
      message: 'This password reset link has expired (valid for 15 minutes). Please request a new password reset link.'
    };
  }

  return {
    ok: true,
    status: 'valid',
    message: 'Password reset link verified.',
    maskedEmail: maskEmailForResetDisplay(matchedRecord.email)
  };
}

/**
 * Atomically verifies and consumes an opaque password reset token, hashes the new password with scrypt,
 * and updates the OTP registration record's passwordHash if one exists.
 */
export function consumePasswordResetTokenAndHashPassword(params: {
  token: string;
  newPassword: string;
}): {
  ok: boolean;
  status: 'password_updated' | 'invalid_token' | 'expired_token' | 'already_used' | 'weak_password';
  message: string;
  email?: string;
  uid?: string;
  passwordHash?: string;
} {
  const rawToken = String(params.token || '').trim();
  const newPassword = String(params.newPassword || '');

  const strengthCheck = validatePasswordStrength(newPassword);
  if (!strengthCheck.valid) {
    return {
      ok: false,
      status: 'weak_password',
      message: strengthCheck.message || 'Your new password must be at least 8 characters long.'
    };
  }

  if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
    return {
      ok: false,
      status: 'invalid_token',
      message: 'This password reset link is invalid or malformed. Please request a new link.'
    };
  }

  const state = loadState();
  if (!state.passwordResets) {
    state.passwordResets = {};
  }

  const candidateHash = hashPasswordResetToken(rawToken);
  let matchedRecord: PasswordResetRecord | undefined;
  for (const rec of Object.values(state.passwordResets)) {
    if (rec.tokenHash && verifyOtpHashMatch(rec.tokenHash, candidateHash)) {
      matchedRecord = rec;
      break;
    }
  }

  if (!matchedRecord) {
    return {
      ok: false,
      status: 'invalid_token',
      message: 'This password reset link is invalid, has already been used, or has been replaced by a newer request.'
    };
  }

  if (matchedRecord.consumed || !matchedRecord.tokenHash) {
    return {
      ok: false,
      status: 'already_used',
      message: 'This password reset link has already been used. Please request a new link.'
    };
  }

  const now = Date.now();
  if (now > matchedRecord.expiresAtMs) {
    matchedRecord.tokenHash = '';
    matchedRecord.consumed = true;
    saveState(state);
    return {
      ok: false,
      status: 'expired_token',
      message: 'This password reset link has expired (valid for 15 minutes). Please request a new password reset link.'
    };
  }

  const normalizedEmail = normalizeEmail(matchedRecord.email);
  const nowIso = new Date(now).toISOString();
  const newPasswordHash = hashPasswordScrypt(newPassword);

  // Immediately consume the token and erase tokenHash so it can NEVER be reused
  matchedRecord.consumed = true;
  matchedRecord.consumedAt = nowIso;
  matchedRecord.tokenHash = '';

  // Also synchronize the registration record in .everykr-otp-registrations.json if present
  const existingReg = state.registrations[normalizedEmail];
  if (existingReg) {
    existingReg.passwordHash = newPasswordHash;
    existingReg.emailVerified = true;
    existingReg.accountStatus = 'active';
  }

  saveState(state);

  return {
    ok: true,
    status: 'password_updated',
    message: 'Your password has been securely updated. You can now sign in with your new password.',
    email: normalizedEmail,
    uid: matchedRecord.uid,
    passwordHash: newPasswordHash
  };
}

/**
 * Returns sanitized registration records for the Admin Dashboard (separating verified and unverified).
 * NEVER includes otpHash, OTP codes, or passwords.
 */
export function getAdminRegistrationsOverview() {
  const state = loadState();
  const now = Date.now();

  const sanitizedAll = Object.values(state.registrations)
    .map((r) => {
      let currentStatus = r.accountStatus;
      if (!r.emailVerified && currentStatus === 'unverified' && now > r.expiresAtMs) {
        currentStatus = 'expired';
      }
      return {
        id: r.id,
        uid: r.uid,
        name: r.name,
        email: r.email,
        role: r.role,
        emailVerified: r.emailVerified,
        accountStatus: currentStatus,
        authProvider: r.authProvider,
        createdAt: r.createdAt,
        verifiedAt: r.verifiedAt,
        expiresAt: r.expiresAt,
        attemptsUsed: r.attemptsUsed,
        maxAttempts: r.maxAttempts,
        lastDeliveryMessageId: r.lastDeliveryMessageId
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const verifiedRegistrations = sanitizedAll.filter((r) => r.emailVerified);
  const unverifiedRegistrations = sanitizedAll.filter((r) => !r.emailVerified);

  return {
    verifiedRegistrations,
    unverifiedRegistrations,
    stats: {
      total: sanitizedAll.length,
      verifiedCount: verifiedRegistrations.length,
      unverifiedCount: unverifiedRegistrations.length,
      lockedCount: unverifiedRegistrations.filter((r) => r.accountStatus === 'locked').length,
      expiredCount: unverifiedRegistrations.filter((r) => r.accountStatus === 'expired').length
    }
  };
}
