import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { appendAutomatedEmailAuditLog } from './automatedEmailService.ts';
import {
  FIRESTORE_COLLECTIONS,
  deterministicEmailHashId,
  isProductionCloudRunRuntime,
  upsertNamedFirestoreDoc,
} from './firestorePersistenceBridge.ts';

export type SubscriberStatus =
  | 'pending_verification'
  | 'active'
  | 'unsubscribed'
  | 'bounced'
  | 'suppressed';

export type DeliveryStatusType =
  | 'delivered'
  | 'smtp_relay_accepted'
  | 'queued_local'
  | 'failed';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  verified: boolean;
  consentGiven: boolean;
  consentTimestamp: string;
  subscribedAt: string;
  verifiedAt?: string;
  unsubscribedAt?: string;
  unsubscribeReason?: string;
  source: string;
  ipHash?: string;
  topics: string[];
  verifyTokenHash?: string;
  unsubscribeToken: string;
  deliveryCount: number;
  lastEmailSentAt?: string;
  lastDeliveryStatus?: DeliveryStatusType;
  lastDeliveryProvider?: string;
  lastDeliveryError?: string;
  lastMessageId?: string;
  lastPreviewUrl?: string;
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  preheader: string;
  templateId: 'scholar_briefing' | 'scholarship_alert' | 'visa_update' | 'custom';
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

export interface EmailDeliveryResult {
  success: boolean;
  subscriptionSaved?: boolean;
  emailAcceptedByProvider: boolean;
  liveDelivered: boolean;
  provider: 'brevo' | 'resend' | 'smtp' | 'smtp_ethereal_relay' | 'unconfigured';
  messageId?: string;
  previewUrl?: string;
  status: DeliveryStatusType;
  attempts: number;
  errorReason?: string;
  timestamp: string;
}

export interface EmailProviderRuntimeConfig {
  preferredProvider?: 'auto' | 'brevo' | 'resend' | 'smtp';
  brevoApiKey?: string;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface NewsletterStoreData {
  subscribers: NewsletterSubscriber[];
  campaigns: NewsletterCampaign[];
  suppressionList: string[];
  deliveryLogs: Array<{
    id: string;
    to: string;
    subject: string;
    campaignId?: string;
    status: DeliveryStatusType;
    provider: string;
    attempts: number;
    messageId?: string;
    previewUrl?: string;
    errorReason?: string;
    timestamp: string;
  }>;
}

const STORE_FILE_PATH = path.resolve(process.cwd(), '.everykr-newsletter-store.json');
const EMAIL_CONFIG_FILE_PATH = path.resolve(process.cwd(), '.everykr-email-config.json');
const RUNTIME_KEYS_FILE_PATH = path.resolve(process.cwd(), '.everykr-runtime-keys.json');

export type NewsletterHmacSecretSource =
  | 'NEWSLETTER_SIGNING_SECRET'
  | 'NEWSLETTER_HMAC_SECRET'
  | 'OTP_HMAC_SECRET'
  | 'runtime_keys_file'
  | 'ephemeral_dev_fallback';

export interface NewsletterHmacResolutionOptions {
  env?: Record<string, string | undefined>;
  runtimeKeysPath?: string;
  allowGenerateRuntimeKey?: boolean;
}

// Ephemeral process-local random secret ONLY for non-production local dev/test (zero static hardcoded secrets)
const EPHEMERAL_DEV_NEWSLETTER_SECRET = crypto.randomBytes(32).toString('hex');

export class MissingProductionNewsletterSecretError extends Error {
  readonly code = 'newsletter_secret_not_configured';
  constructor() {
    super(
      'NEWSLETTER_SIGNING_SECRET (or NEWSLETTER_HMAC_SECRET) must be configured in production.'
    );
    this.name = 'MissingProductionNewsletterSecretError';
  }
}

function sanitizeNewsletterSecretCandidate(raw?: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
  if (!cleaned || cleaned.length < 16) return '';
  if (
    cleaned === '***' ||
    cleaned === 'everykr_hmac_newsletter_secret_change_in_production' ||
    cleaned === 'everykr_hmac_otp_secret_change_in_production' ||
    cleaned.startsWith('MY_')
  ) {
    return '';
  }
  return cleaned;
}

function readPersistedRuntimeNewsletterSecret(
  runtimeKeysPath: string = RUNTIME_KEYS_FILE_PATH
): string {
  try {
    if (fs.existsSync(runtimeKeysPath)) {
      const existing = JSON.parse(fs.readFileSync(runtimeKeysPath, 'utf-8')) || {};
      if (
        typeof existing.newsletterHmacSecret === 'string' &&
        existing.newsletterHmacSecret.trim().length >= 32
      ) {
        return existing.newsletterHmacSecret.trim();
      }
    }
  } catch {
    // Ignore unreadable runtime key file and fall through cleanly
  }
  return '';
}

/**
 * Deterministic Newsletter HMAC Secret Resolution Order:
 *  1. process.env.NEWSLETTER_SIGNING_SECRET (preferred production secret)
 *  2. process.env.NEWSLETTER_HMAC_SECRET    (backward-compatible env secret)
 *  3. process.env.OTP_HMAC_SECRET           (legacy env fallback)
 *  4. Production fail-closed: throws MissingProductionNewsletterSecretError when running on
 *     Cloud Run / NODE_ENV=production without a configured environment secret.
 *  5. Non-production local dev ONLY: .everykr-runtime-keys.json or random process-local bytes
 *     (NEVER a static hardcoded fallback string).
 */
function resolveNewsletterHmacSecretInternal(options?: NewsletterHmacResolutionOptions): {
  secret: string;
  source: NewsletterHmacSecretSource;
} {
  const env = options?.env ?? process.env;
  const runtimeKeysPath = options?.runtimeKeysPath ?? RUNTIME_KEYS_FILE_PATH;
  const allowGenerate = options?.allowGenerateRuntimeKey !== false;

  const signingSecret = sanitizeNewsletterSecretCandidate(env.NEWSLETTER_SIGNING_SECRET);
  if (signingSecret) {
    return { secret: signingSecret, source: 'NEWSLETTER_SIGNING_SECRET' };
  }

  const hmacSecret = sanitizeNewsletterSecretCandidate(env.NEWSLETTER_HMAC_SECRET);
  if (hmacSecret) {
    return { secret: hmacSecret, source: 'NEWSLETTER_HMAC_SECRET' };
  }

  const otpHmacFallback = sanitizeNewsletterSecretCandidate(env.OTP_HMAC_SECRET);
  if (otpHmacFallback) {
    return { secret: otpHmacFallback, source: 'OTP_HMAC_SECRET' };
  }

  if (isProductionCloudRunRuntime(env)) {
    throw new MissingProductionNewsletterSecretError();
  }

  const existingRuntimeKey = readPersistedRuntimeNewsletterSecret(runtimeKeysPath);
  if (existingRuntimeKey) {
    return { secret: existingRuntimeKey, source: 'runtime_keys_file' };
  }

  if (allowGenerate) {
    try {
      let existing: Record<string, string> = {};
      if (fs.existsSync(runtimeKeysPath)) {
        existing = JSON.parse(fs.readFileSync(runtimeKeysPath, 'utf-8')) || {};
      }
      const generated = crypto.randomBytes(32).toString('hex');
      existing.newsletterHmacSecret = generated;
      fs.writeFileSync(runtimeKeysPath, JSON.stringify(existing, null, 2), {
        encoding: 'utf-8',
        mode: 0o600,
      });
      return { secret: generated, source: 'runtime_keys_file' };
    } catch {
      return { secret: EPHEMERAL_DEV_NEWSLETTER_SECRET, source: 'ephemeral_dev_fallback' };
    }
  }

  return { secret: EPHEMERAL_DEV_NEWSLETTER_SECRET, source: 'ephemeral_dev_fallback' };
}

export function getStableNewsletterSecret(options?: NewsletterHmacResolutionOptions): string {
  return resolveNewsletterHmacSecretInternal(options).secret;
}

let cachedNonProdNewsletterSecret: string | null = null;

export function getHmacSecret(options?: NewsletterHmacResolutionOptions): string {
  if (options) {
    return resolveNewsletterHmacSecretInternal(options).secret;
  }
  const envResolved =
    sanitizeNewsletterSecretCandidate(process.env.NEWSLETTER_SIGNING_SECRET) ||
    sanitizeNewsletterSecretCandidate(process.env.NEWSLETTER_HMAC_SECRET) ||
    sanitizeNewsletterSecretCandidate(process.env.OTP_HMAC_SECRET);
  if (envResolved) {
    return envResolved;
  }
  if (isProductionCloudRunRuntime(process.env)) {
    throw new MissingProductionNewsletterSecretError();
  }
  if (!cachedNonProdNewsletterSecret) {
    cachedNonProdNewsletterSecret = getStableNewsletterSecret();
  }
  return cachedNonProdNewsletterSecret;
}

/**
 * Returns only the non-sensitive source identifier for the active newsletter HMAC secret.
 * Never exposes or logs any secret value.
 */
export function getNewsletterHmacSecretSource(
  options?: NewsletterHmacResolutionOptions
): NewsletterHmacSecretSource {
  return resolveNewsletterHmacSecretInternal({
    ...options,
    allowGenerateRuntimeKey: false,
  }).source;
}

/**
 * Builds the ordered verification keyring so tokens signed prior to secret alignment
 * (e.g. with NEWSLETTER_HMAC_SECRET or local runtime key) remain valid without any static secret.
 */
function getNewsletterVerificationKeyring(options?: NewsletterHmacResolutionOptions): string[] {
  const env = options?.env ?? process.env;
  const runtimeKeysPath = options?.runtimeKeysPath ?? RUNTIME_KEYS_FILE_PATH;
  const isProd = isProductionCloudRunRuntime(env);

  const candidates = [
    sanitizeNewsletterSecretCandidate(env.NEWSLETTER_SIGNING_SECRET),
    sanitizeNewsletterSecretCandidate(env.NEWSLETTER_HMAC_SECRET),
    sanitizeNewsletterSecretCandidate(env.OTP_HMAC_SECRET),
    !isProd ? readPersistedRuntimeNewsletterSecret(runtimeKeysPath) : '',
    !isProd && !options && cachedNonProdNewsletterSecret ? cachedNonProdNewsletterSecret : '',
    !isProd ? EPHEMERAL_DEV_NEWSLETTER_SECRET : '',
  ].filter((k): k is string => Boolean(k));

  if (candidates.length === 0 && isProd) {
    throw new MissingProductionNewsletterSecretError();
  }

  return Array.from(new Set(candidates));
}

export function loadEmailProviderRuntimeConfig(): EmailProviderRuntimeConfig {
  try {
    if (fs.existsSync(EMAIL_CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(EMAIL_CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(raw) as EmailProviderRuntimeConfig;
    }
  } catch (err) {
    console.warn('[EveryKR Newsletter] Could not read .everykr-email-config.json:', err);
  }
  return {};
}

export function saveEmailProviderRuntimeConfig(
  update: Partial<EmailProviderRuntimeConfig>
): EmailProviderRuntimeConfig {
  const current = loadEmailProviderRuntimeConfig();
  const next: EmailProviderRuntimeConfig = {
    ...current,
    ...update,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(EMAIL_CONFIG_FILE_PATH, JSON.stringify(next, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  } catch (err) {
    console.error('[EveryKR Newsletter] Could not save .everykr-email-config.json:', err);
  }
  return next;
}

function getEffectiveEmailConfig() {
  const runtime = loadEmailProviderRuntimeConfig();
  const brevoApiKey = (
    runtime.brevoApiKey ||
    process.env.BREVO_API_KEY ||
    process.env.SENDINBLUE_API_KEY ||
    ''
  ).trim();
  const resendApiKey = (
    runtime.resendApiKey ||
    process.env.RESEND_API_KEY ||
    ''
  ).trim();
  const smtpHost = (runtime.smtpHost || process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(runtime.smtpPort || process.env.SMTP_PORT || 587);
  const smtpUser = (runtime.smtpUser || process.env.SMTP_USER || '').trim();
  const smtpPass = (runtime.smtpPass || process.env.SMTP_PASS || '').trim();
  const smtpSecure =
    runtime.smtpSecure !== undefined
      ? Boolean(runtime.smtpSecure)
      : process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  const rawConfiguredName = (
    runtime.fromName ||
    process.env.NEWSLETTER_FROM_NAME ||
    'EveryKR Newsletter'
  ).trim();
  const fromName =
    !rawConfiguredName || rawConfiguredName.toUpperCase() === 'EVERYKR'
      ? 'EveryKR Newsletter'
      : rawConfiguredName;

  // STRICT REQUIREMENT: Newsletter sender email MUST ALWAYS be newsletter@everykr.com
  // Never allow newsletter@newsletter.everykr.com or shared account/security senders.
  const fromEmail = 'newsletter@everykr.com';
  const replyTo = (
    runtime.replyTo ||
    process.env.EMAIL_REPLY_TO ||
    'support@everykr.com'
  ).trim();

  let activeProvider: 'brevo' | 'resend' | 'smtp' | 'smtp_ethereal_relay' =
    'smtp_ethereal_relay';
  let liveExternalConfigured = false;

  if (brevoApiKey) {
    activeProvider = 'brevo';
    liveExternalConfigured = true;
  } else if (resendApiKey) {
    activeProvider = 'resend';
    liveExternalConfigured = true;
  } else if (smtpHost && smtpUser && smtpPass) {
    activeProvider = 'smtp';
    liveExternalConfigured = true;
  }

  return {
    activeProvider,
    liveExternalConfigured,
    brevoApiKey,
    resendApiKey,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure,
    fromName,
    fromEmail,
    replyTo,
  };
}

function loadStore(): NewsletterStoreData {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const rawSuppression = Array.isArray(parsed.suppressionList) ? parsed.suppressionList : [];
      const normalizedSuppression: string[] = Array.from(
        new Set<string>(
          rawSuppression
            .map((item: any): string =>
              typeof item === 'string'
                ? item.trim().toLowerCase()
                : String(item?.email || '').trim().toLowerCase()
            )
            .filter((s: string) => s.length > 0)
        )
      );
      return {
        subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
        campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
        suppressionList: normalizedSuppression,
        deliveryLogs: Array.isArray(parsed.deliveryLogs) ? parsed.deliveryLogs : [],
      };
    }
  } catch (err) {
    console.warn('[EveryKR Newsletter] Could not read local store, initializing clean state:', err);
  }

  const initial: NewsletterStoreData = {
    subscribers: [],
    campaigns: [],
    suppressionList: [],
    deliveryLogs: [],
  };
  saveStore(initial);
  return initial;
}

function syncNewsletterStoreToFirestoreAsync(data: NewsletterStoreData): void {
  // Mirror latest newsletter state additively to EVERYKR's named Firestore database
  // using deterministic document IDs to prevent duplicates across Cloud Run instances.
  const latestSubscribers = data.subscribers.slice(0, 50);
  const latestCampaigns = data.campaigns.slice(0, 25);
  const latestLogs = data.deliveryLogs.slice(0, 20);

  for (const sub of latestSubscribers) {
    if (!sub?.email) continue;
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.newsletterSubscribers,
      deterministicEmailHashId(sub.email),
      sub as unknown as Record<string, unknown>
    );
  }
  for (const camp of latestCampaigns) {
    if (!camp?.id) continue;
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.newsletterCampaigns,
      camp.id,
      camp as unknown as Record<string, unknown>
    );
  }
  for (const log of latestLogs) {
    if (!log?.id) continue;
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.newsletterDeliveryLogs,
      log.id,
      log as unknown as Record<string, unknown>
    );
  }
  for (const suppressedEmail of data.suppressionList.slice(0, 50)) {
    if (!suppressedEmail) continue;
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.newsletterSuppression,
      deterministicEmailHashId(suppressedEmail),
      { email: suppressedEmail.toLowerCase() }
    );
  }
}

function saveStore(data: NewsletterStoreData): void {
  // Always persist additively to named Firestore DB for multi-instance Cloud Run reliability
  syncNewsletterStoreToFirestoreAsync(data);

  // Preserve local JSON compatibility in non-production environments (never delete legacy files)
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(data, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  } catch (err) {
    if (!isProductionCloudRunRuntime()) {
      console.error('[EveryKR Newsletter] Failed to persist local store:', err);
    }
  }
}

export function validateEmailSyntax(email: string): {
  valid: boolean;
  normalized: string;
  reason?: string;
} {
  if (!email || typeof email !== 'string') {
    return { valid: false, normalized: '', reason: 'Email address is required.' };
  }
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254) {
    return { valid: false, normalized, reason: 'Email address is too long.' };
  }
  const rfcRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
  if (!rfcRegex.test(normalized)) {
    return { valid: false, normalized, reason: 'Please enter a valid email address.' };
  }
  const domain = normalized.split('@')[1];
  const blockedDomains = ['mailinator.com', '10minutemail.com', 'guerrillamail.com', 'tempmail.com'];
  if (blockedDomains.includes(domain)) {
    return {
      valid: false,
      normalized,
      reason: 'Disposable email addresses are not supported for EVERYKR updates.',
    };
  }
  return { valid: true, normalized };
}

export function createSignedToken(
  email: string,
  purpose: 'verify' | 'unsubscribe',
  options?: NewsletterHmacResolutionOptions
): string {
  const payload = `${email.trim().toLowerCase()}:${purpose}`;
  return crypto.createHmac('sha256', getHmacSecret(options)).update(payload).digest('hex');
}

export function verifySignedToken(
  email: string,
  purpose: 'verify' | 'unsubscribe',
  token: string,
  options?: NewsletterHmacResolutionOptions
): boolean {
  if (!email || !token) return false;
  const trimmedToken = token.trim();
  if (!/^[a-f0-9]{64}$/i.test(trimmedToken)) return false;

  const payload = `${email.trim().toLowerCase()}:${purpose}`;
  let candidateBuf: Buffer;
  try {
    candidateBuf = Buffer.from(trimmedToken, 'hex');
    if (candidateBuf.length !== 32) return false;
  } catch {
    return false;
  }

  const keyring = getNewsletterVerificationKeyring(options);
  for (const secret of keyring) {
    try {
      const expectedHex = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      if (
        expectedBuf.length === candidateBuf.length &&
        crypto.timingSafeEqual(expectedBuf, candidateBuf)
      ) {
        return true;
      }
    } catch {
      // Continue checking remaining keys in keyring
    }
  }
  return false;
}

/**
 * Responsive HTML Email Builder for EVERYKR
 */
export function buildBrandedEmailHtml(options: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  recipientEmail: string;
  unsubscribeUrl: string;
  categoryBadge?: string;
}): { html: string; text: string } {
  const {
    preheader,
    heading,
    bodyHtml,
    ctaText,
    ctaUrl,
    recipientEmail,
    unsubscribeUrl,
    categoryBadge = 'EVERYKR NEWSLETTER',
  } = options;

  const plainBody = bodyHtml
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/&bull;/g, '•')
    .trim();

  const text = `${heading}\n\n${plainBody}\n\n${
    ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}\n\n` : ''
  }---\nEveryKR Newsletter (newsletter@everykr.com) — Everything Korea. One Platform.\nYou are receiving this email because ${recipientEmail} subscribed to the EveryKR Newsletter.\nHow to unsubscribe: If you wish to stop receiving future EveryKR newsletters at any time, click this unsubscribe link: ${unsubscribeUrl}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F8FD;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0B1728;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F4F8FD;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 6px 24px rgba(11,23,40,0.06);">
          <!-- Top Brand Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#071326 0%,#102544 100%);padding:28px 32px;border-bottom:3px solid #2563EB;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right:12px;">
                          <img src="https://everykr.com/everykr-logo.png" alt="EveryKR" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:10px;object-fit:contain;background-color:rgba(255,255,255,0.08);padding:4px;" />
                        </td>
                        <td valign="middle">
                          <span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#60A5FA;margin-bottom:3px;">${categoryBadge}</span>
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
            <td style="padding:32px;">
              <h1 style="margin:0 0 18px;font-size:22px;line-height:1.35;font-weight:800;color:#0B1728;">${heading}</h1>
              <div style="font-size:15px;line-height:1.68;color:#334155;">
                ${bodyHtml}
              </div>
              ${
                ctaText && ctaUrl
                  ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:26px;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#2563EB;">
                    <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }
            </td>
          </tr>
          <!-- Unsubscribe & Compliance Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:22px 32px;border-top:1px solid #E2E8F0;font-size:12px;line-height:1.65;color:#64748B;">
              <p style="margin:0 0 8px;">
                <strong>EveryKR Newsletter</strong> (<span style="color:#334155;">newsletter@everykr.com</span>) &mdash; Everything Korea. One Platform.
              </p>
              <p style="margin:0 0 8px;">
                This email was sent to <span style="color:#334155;font-weight:600;">${recipientEmail}</span> because you subscribed to the EveryKR Newsletter.
              </p>
              <p style="margin:0;">
                <strong>How to unsubscribe:</strong> You can stop receiving future EveryKR newsletters at any time by clicking <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563EB;text-decoration:underline;font-weight:600;">Unsubscribe from EveryKR Newsletter</a>. Your preference takes effect immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}

/**
 * Build the official "Welcome to the EveryKR Newsletter!" confirmation email (Workflow 3)
 */
export function buildWelcomeEmailPayload(options: {
  email: string;
  origin: string;
  unsubscribeToken: string;
}) {
  const { email, origin, unsubscribeToken } = options;
  const cleanOrigin = (origin || 'https://everykr.com').replace(/\/+$/, '');
  const unsubscribeUrl = `${cleanOrigin}/api/newsletter/unsubscribe?email=${encodeURIComponent(
    email
  )}&token=${encodeURIComponent(unsubscribeToken)}`;

  const subject = 'Welcome to the EveryKR Newsletter!';
  const { html, text } = buildBrandedEmailHtml({
    preheader:
      'Thank you for subscribing to the EveryKR Newsletter! Stay updated on Korean university admissions, scholarships, and student opportunities.',
    heading: 'Welcome to the EveryKR Newsletter!',
    categoryBadge: 'EVERYKR NEWSLETTER',
    bodyHtml: `<p style="margin:0 0 14px;">Hello,</p>
<p style="margin:0 0 16px;">Thank you for subscribing to the <strong>EveryKR Newsletter</strong>! Your subscription is now active.</p>
<p style="margin:0 0 10px;">As a subscriber, you will receive curated updates covering:</p>
<ul style="margin:0 0 18px;padding-left:20px;color:#1E293B;">
  <li style="margin-bottom:7px;"><strong>Korean University Admission Updates:</strong> Application timelines, intake announcements, and program guides across South Korea.</li>
  <li style="margin-bottom:7px;"><strong>Scholarship Information:</strong> GKS, university merit awards, and funding deadlines.</li>
  <li style="margin-bottom:7px;"><strong>Student Opportunities:</strong> Korean language programs, internships, campus events, and student resources.</li>
  <li style="margin-bottom:7px;"><strong>EveryKR News:</strong> New platform features, tools, and guides for international students.</li>
</ul>
<p style="margin:0 0 12px;font-size:13px;color:#475569;"><em>Manage your subscription:</em> You are always in control of your inbox. To unsubscribe from future newsletters at any time, simply click the <a href="${unsubscribeUrl}" style="color:#2563EB;text-decoration:underline;font-weight:600;">Unsubscribe link</a> below or at the bottom of any EveryKR newsletter email.</p>
<p style="margin:0;color:#2563EB;font-weight:700;">Everything Korea. One Platform.</p>`,
    ctaText: 'Explore EveryKR',
    ctaUrl: 'https://everykr.com',
    recipientEmail: email,
    unsubscribeUrl,
  });

  return {
    subject,
    html,
    text,
    unsubscribeUrl,
  };
}

let cachedEtherealAccount: { user: string; pass: string } | null = null;

async function getOrCreateEtherealAccount(): Promise<{ user: string; pass: string }> {
  if (cachedEtherealAccount) return cachedEtherealAccount;
  const testAccount = await nodemailer.createTestAccount();
  cachedEtherealAccount = {
    user: testAccount.user,
    pass: testAccount.pass,
  };
  return cachedEtherealAccount;
}

/**
 * Dispatch Email via Configured Provider (Brevo HTTP API -> Resend HTTP API -> Custom SMTP -> Live Ethereal SMTP Relay)
 */
export async function dispatchNewsletterEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
  campaignId?: string;
}): Promise<EmailDeliveryResult> {
  const { to, subject, html, text, unsubscribeUrl, campaignId } = params;
  const cfg = getEffectiveEmailConfig();
  const timestamp = new Date().toISOString();
  const store = loadStore();

  const maxAttempts = 2;
  let lastError = '';

  // 1. Try Brevo Transactional Email API if configured
  if (cfg.brevoApiKey) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': cfg.brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: cfg.fromName, email: cfg.fromEmail },
            to: [{ email: to }],
            replyTo: { email: cfg.replyTo },
            subject,
            htmlContent: html,
            textContent: text,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        });

        const data: any = await response.json().catch(() => ({}));
        if (response.ok) {
          const messageId = data?.messageId || `brevo_${Date.now()}`;
          store.deliveryLogs.unshift({
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            to,
            subject,
            campaignId,
            status: 'delivered',
            provider: 'brevo',
            attempts: attempt,
            messageId,
            timestamp,
          });
          store.deliveryLogs = store.deliveryLogs.slice(0, 250);
          saveStore(store);
          appendAutomatedEmailAuditLog({
            emailType: campaignId ? 'newsletter_campaign' : 'newsletter_welcome',
            recipient: to,
            senderName: cfg.fromName,
            senderEmail: cfg.fromEmail,
            subject,
            provider: 'brevo',
            messageId,
            deliveryStatus: 'delivered',
            triggerSource: campaignId ? `campaign:${campaignId}` : 'newsletter_subscribe',
            timestamp,
          });

          return {
            success: true,
            emailAcceptedByProvider: true,
            liveDelivered: true,
            provider: 'brevo',
            messageId,
            status: 'delivered',
            attempts: attempt,
            timestamp,
          };
        }
        lastError = data?.message || `Brevo HTTP ${response.status}`;
      } catch (err: any) {
        lastError = err?.message || 'Brevo network error';
      }
    }
  }

  // 2. Try Resend Transactional Email API if configured
  // STRICT: Always send from EveryKR Newsletter <newsletter@everykr.com> — never substitute onboarding@resend.dev
  if (cfg.resendApiKey) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const senderEmail = cfg.fromEmail;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfg.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${cfg.fromName} <${senderEmail}>`,
            to: [to],
            reply_to: cfg.replyTo,
            subject,
            html,
            text,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        });

        const data: any = await response.json().catch(() => ({}));
        if (response.ok) {
          const messageId = data?.id || `resend_${Date.now()}`;
          store.deliveryLogs.unshift({
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            to,
            subject,
            campaignId,
            status: 'delivered',
            provider: 'resend',
            attempts: attempt,
            messageId,
            timestamp,
          });
          store.deliveryLogs = store.deliveryLogs.slice(0, 250);
          saveStore(store);
          appendAutomatedEmailAuditLog({
            emailType: campaignId ? 'newsletter_campaign' : 'newsletter_welcome',
            recipient: to,
            senderName: cfg.fromName,
            senderEmail,
            subject,
            provider: 'resend',
            messageId,
            deliveryStatus: 'delivered',
            triggerSource: campaignId ? `campaign:${campaignId}` : 'newsletter_subscribe',
            timestamp,
          });

          return {
            success: true,
            emailAcceptedByProvider: true,
            liveDelivered: true,
            provider: 'resend',
            messageId,
            status: 'delivered',
            attempts: attempt,
            timestamp,
          };
        }
        lastError = data?.message || data?.error || `Resend HTTP ${response.status}`;
      } catch (err: any) {
        lastError = err?.message || 'Resend network error';
      }
    }
  }

  // 3. Try Custom Production SMTP if configured
  if (cfg.smtpHost && cfg.smtpUser && cfg.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: cfg.smtpHost,
        port: cfg.smtpPort,
        secure: cfg.smtpSecure,
        auth: {
          user: cfg.smtpUser,
          pass: cfg.smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
        to,
        replyTo: cfg.replyTo,
        subject,
        text,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      const messageId = info.messageId || `smtp_${Date.now()}`;
      store.deliveryLogs.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        to,
        subject,
        campaignId,
        status: 'delivered',
        provider: 'smtp',
        attempts: 1,
        messageId,
        timestamp,
      });
      store.deliveryLogs = store.deliveryLogs.slice(0, 250);
      saveStore(store);

      return {
        success: true,
        emailAcceptedByProvider: true,
        liveDelivered: true,
        provider: 'smtp',
        messageId,
        status: 'delivered',
        attempts: 1,
        timestamp,
      };
    } catch (err: any) {
      lastError = err?.message || 'Custom SMTP transmission error';
    }
  }

  // If a production provider WAS configured (Brevo/Resend/SMTP) and failed, record the exact failure honestly
  if (cfg.liveExternalConfigured && lastError) {
    store.deliveryLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      to,
      subject,
      campaignId,
      status: 'failed',
      provider: cfg.activeProvider,
      attempts: maxAttempts,
      errorReason: lastError,
      timestamp,
    });
    store.deliveryLogs = store.deliveryLogs.slice(0, 250);
    saveStore(store);

    return {
      success: false,
      emailAcceptedByProvider: false,
      liveDelivered: false,
      provider: cfg.activeProvider,
      status: 'failed',
      attempts: maxAttempts,
      errorReason: lastError,
      timestamp,
    };
  }

  // 4. When no external production API key is set yet, transmit over live SMTP relay (smtp.ethereal.email:587)
  // so real SMTP formatting, headers, and server acceptance are verified and an inspectable preview URL is generated.
  try {
    const ethereal = await getOrCreateEtherealAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: ethereal.user,
        pass: ethereal.pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to,
      replyTo: cfg.replyTo,
      subject,
      text,
      html,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    const messageId = info.messageId || `ethereal_${Date.now()}`;

    store.deliveryLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      to,
      subject,
      campaignId,
      status: 'smtp_relay_accepted',
      provider: 'smtp_ethereal_relay',
      attempts: 1,
      messageId,
      previewUrl,
      errorReason:
        'Accepted by SMTP test relay (Configure BREVO_API_KEY, RESEND_API_KEY, or SMTP_HOST for external inbox delivery).',
      timestamp,
    });
    store.deliveryLogs = store.deliveryLogs.slice(0, 250);
    saveStore(store);

    return {
      success: true,
      emailAcceptedByProvider: true,
      liveDelivered: false,
      provider: 'smtp_ethereal_relay',
      messageId,
      previewUrl,
      status: 'smtp_relay_accepted',
      attempts: 1,
      errorReason:
        'Accepted by SMTP test relay. Configure BREVO_API_KEY, RESEND_API_KEY, or SMTP credentials in Admin Newsletter Settings for external inbox delivery.',
      timestamp,
    };
  } catch (err: any) {
    const errMsg = err?.message || 'No external email provider configured';
    store.deliveryLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      to,
      subject,
      campaignId,
      status: 'failed',
      provider: 'unconfigured',
      attempts: 1,
      errorReason: errMsg,
      timestamp,
    });
    store.deliveryLogs = store.deliveryLogs.slice(0, 250);
    saveStore(store);

    return {
      success: false,
      emailAcceptedByProvider: false,
      liveDelivered: false,
      provider: 'unconfigured',
      status: 'failed',
      attempts: 1,
      errorReason: errMsg,
      timestamp,
    };
  }
}

/**
 * Subscribe a Visitor & Immediately Dispatch "Welcome to EVERYKR — Stay Connected!" Email
 */
export async function subscribeVisitor(params: {
  email: string;
  consentGiven: boolean;
  topics?: string[];
  source?: string;
  ipHash?: string;
  origin?: string;
  baseUrl?: string;
}): Promise<{
  ok: boolean;
  code: string;
  status: string;
  message: string;
  subscriptionSaved: boolean;
  emailAcceptedByProvider: boolean;
  liveDelivered: boolean;
  subscriber?: NewsletterSubscriber;
  delivery?: EmailDeliveryResult;
}> {
  const {
    email,
    consentGiven,
    topics = [
      'South Korean Universities',
      'Admission Deadlines & Scholarships',
      'Korean Language & Student Life',
    ],
    source = 'homepage_newsletter',
    ipHash,
  } = params;
  const origin = (params.origin || params.baseUrl || 'https://everykr.com').replace(/\/+$/, '');

  const check = validateEmailSyntax(email);
  if (!check.valid) {
    return {
      ok: false,
      code: 'INVALID_EMAIL',
      status: 'invalid_email',
      message: check.reason || 'Invalid email address.',
      subscriptionSaved: false,
      emailAcceptedByProvider: false,
      liveDelivered: false,
    };
  }

  if (!consentGiven) {
    return {
      ok: false,
      code: 'CONSENT_REQUIRED',
      status: 'consent_required',
      message: 'Please confirm your subscription consent to receive EVERYKR updates.',
      subscriptionSaved: false,
      emailAcceptedByProvider: false,
      liveDelivered: false,
    };
  }

  const normalized = check.normalized;
  const store = loadStore();
  const now = new Date().toISOString();

  let subscriber = store.subscribers.find((s) => s.email === normalized);

  // If already active and verified, prevent duplicate record creation
  if (subscriber && subscriber.status === 'active' && subscriber.verified) {
    return {
      ok: true,
      code: 'ALREADY_SUBSCRIBED',
      status: 'already_subscribed',
      message: 'This email is already subscribed to EVERYKR updates.',
      subscriptionSaved: true,
      emailAcceptedByProvider: false,
      liveDelivered: false,
      subscriber,
    };
  }

  // Preserve an existing subscriber's valid unsubscribeToken so previously delivered email links never rotate or break
  const unsubscribeToken =
    subscriber?.unsubscribeToken &&
    verifySignedToken(normalized, 'unsubscribe', subscriber.unsubscribeToken)
      ? subscriber.unsubscribeToken
      : createSignedToken(normalized, 'unsubscribe');

  // Remove from suppression list if user explicitly re-subscribes with consent
  store.suppressionList = store.suppressionList.filter((item) => item !== normalized);

  if (!subscriber) {
    subscriber = {
      id: `sub_${normalized.replace(/[^a-z0-9]/g, '_').slice(0, 64)}`,
      email: normalized,
      status: 'active',
      verified: true,
      consentGiven: true,
      consentTimestamp: now,
      subscribedAt: now,
      verifiedAt: now,
      source,
      ipHash,
      topics,
      unsubscribeToken,
      deliveryCount: 0,
    };
    store.subscribers.unshift(subscriber);
  } else {
    subscriber.status = 'active';
    subscriber.verified = true;
    subscriber.consentGiven = true;
    subscriber.consentTimestamp = now;
    subscriber.verifiedAt = now;
    subscriber.unsubscribedAt = undefined;
    subscriber.unsubscribeReason = undefined;
    subscriber.unsubscribeToken = unsubscribeToken;
    subscriber.topics = topics.length ? topics : subscriber.topics;
  }

  saveStore(store);

  // Build and send the Welcome to EVERYKR — Stay Connected! email
  const welcomePayload = buildWelcomeEmailPayload({
    email: normalized,
    origin,
    unsubscribeToken,
  });

  const delivery = await dispatchNewsletterEmail({
    to: normalized,
    subject: welcomePayload.subject,
    html: welcomePayload.html,
    text: welcomePayload.text,
    unsubscribeUrl: welcomePayload.unsubscribeUrl,
  });

  // Re-load store after dispatchNewsletterEmail saved deliveryLogs, and update subscriber status
  const updatedStore = loadStore();
  const updatedSub = updatedStore.subscribers.find((s) => s.email === normalized);
  if (updatedSub) {
    updatedSub.lastDeliveryStatus = delivery.status;
    updatedSub.lastDeliveryProvider = delivery.provider;
    updatedSub.lastDeliveryError = delivery.errorReason;
    updatedSub.lastMessageId = delivery.messageId;
    updatedSub.lastPreviewUrl = delivery.previewUrl;
    if (delivery.emailAcceptedByProvider) {
      updatedSub.deliveryCount = (updatedSub.deliveryCount || 0) + 1;
      updatedSub.lastEmailSentAt = delivery.timestamp;
    }
    subscriber = updatedSub;
    saveStore(updatedStore);
  }

  if (delivery.liveDelivered) {
    return {
      ok: true,
      code: 'SUBSCRIBED_AND_EMAIL_SENT',
      status: 'subscribed_live_delivered',
      message: `Thank you for subscribing to the EveryKR Newsletter! A confirmation email ("Welcome to the EveryKR Newsletter!") has been sent to ${normalized}.`,
      subscriptionSaved: true,
      emailAcceptedByProvider: true,
      liveDelivered: true,
      subscriber,
      delivery,
    };
  }

  if (delivery.emailAcceptedByProvider && delivery.provider === 'smtp_ethereal_relay') {
    return {
      ok: true,
      code: 'SUBSCRIBED_SMTP_RELAY_PREVIEW',
      status: 'subscribed_smtp_relay',
      message: `Your subscription for ${normalized} is saved! Confirmation email ("Welcome to the EveryKR Newsletter!") was generated and accepted by the SMTP test relay (configure a production Brevo/Resend/SMTP key in Admin Settings for external inbox delivery).`,
      subscriptionSaved: true,
      emailAcceptedByProvider: true,
      liveDelivered: false,
      subscriber,
      delivery,
    };
  }

  return {
    ok: true,
    code: 'SUBSCRIBED_EMAIL_PENDING_PROVIDER',
    status: 'subscribed_email_pending',
    message: `Your subscription for ${normalized} has been saved to EVERYKR, but the confirmation email could not be delivered yet (${delivery.errorReason || 'email provider not configured'}).`,
    subscriptionSaved: true,
    emailAcceptedByProvider: false,
    liveDelivered: false,
    subscriber,
    delivery,
  };
}

/**
 * Retry sending the Welcome Confirmation Email for a specific subscriber (Admin action)
 */
export async function retrySubscriberWelcomeEmail(params: {
  email: string;
  origin?: string;
  baseUrl?: string;
}): Promise<{
  ok: boolean;
  message: string;
  subscriber?: NewsletterSubscriber;
  delivery?: EmailDeliveryResult;
}> {
  const normalized = params.email.trim().toLowerCase();
  const origin = (params.origin || params.baseUrl || 'https://everykr.com').replace(/\/+$/, '');
  const store = loadStore();
  const sub = store.subscribers.find((s) => s.email === normalized);
  if (!sub) {
    return { ok: false, message: `Subscriber ${normalized} not found.` };
  }

  const unsubscribeToken =
    sub.unsubscribeToken || createSignedToken(normalized, 'unsubscribe');
  sub.unsubscribeToken = unsubscribeToken;
  saveStore(store);

  const welcomePayload = buildWelcomeEmailPayload({
    email: normalized,
    origin,
    unsubscribeToken,
  });

  const delivery = await dispatchNewsletterEmail({
    to: normalized,
    subject: welcomePayload.subject,
    html: welcomePayload.html,
    text: welcomePayload.text,
    unsubscribeUrl: welcomePayload.unsubscribeUrl,
  });

  const updatedStore = loadStore();
  const updatedSub = updatedStore.subscribers.find((s) => s.email === normalized);
  if (updatedSub) {
    updatedSub.lastDeliveryStatus = delivery.status;
    updatedSub.lastDeliveryProvider = delivery.provider;
    updatedSub.lastDeliveryError = delivery.errorReason;
    updatedSub.lastMessageId = delivery.messageId;
    updatedSub.lastPreviewUrl = delivery.previewUrl;
    if (delivery.emailAcceptedByProvider) {
      updatedSub.deliveryCount = (updatedSub.deliveryCount || 0) + 1;
      updatedSub.lastEmailSentAt = delivery.timestamp;
    }
    saveStore(updatedStore);
  }

  return {
    ok: delivery.emailAcceptedByProvider,
    message: delivery.liveDelivered
      ? `Welcome email delivered to ${normalized} via ${delivery.provider.toUpperCase()}.`
      : delivery.emailAcceptedByProvider
      ? `Welcome email accepted by ${delivery.provider} (Preview URL generated).`
      : `Welcome email delivery failed: ${delivery.errorReason || 'Provider error'}`,
    subscriber: updatedSub,
    delivery,
  };
}

/**
 * Confirm Double Opt-In Subscription Token (legacy compatibility)
 */
export async function confirmSubscriptionToken(params: {
  email: string;
  token: string;
  origin?: string;
  baseUrl?: string;
}): Promise<{
  ok: boolean;
  code: string;
  message: string;
  subscriber?: NewsletterSubscriber;
}> {
  const { email, token } = params;
  const normalized = (email || '').trim().toLowerCase();
  const store = loadStore();
  const subscriber = store.subscribers.find((s) => s.email === normalized);

  if (!subscriber) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'No subscription found for this email address.',
    };
  }

  if (subscriber.status === 'active' && subscriber.verified) {
    return {
      ok: true,
      code: 'ALREADY_VERIFIED',
      message: 'Your email subscription is active and confirmed!',
      subscriber,
    };
  }

  const tokenHash = crypto.createHash('sha256').update((token || '').trim()).digest('hex');
  const hmacValid = verifySignedToken(normalized, 'verify', token);

  if (subscriber.verifyTokenHash !== tokenHash && !hmacValid) {
    return {
      ok: false,
      code: 'INVALID_TOKEN',
      message: 'This confirmation link is invalid or has expired.',
    };
  }

  const now = new Date().toISOString();
  subscriber.status = 'active';
  subscriber.verified = true;
  subscriber.verifiedAt = now;
  subscriber.verifyTokenHash = undefined;
  saveStore(store);

  return {
    ok: true,
    code: 'VERIFIED_SUCCESS',
    message: 'Your EVERYKR newsletter subscription is now confirmed!',
    subscriber,
  };
}

/**
 * Unsubscribe & Add to Suppression List
 */
export function unsubscribeVisitor(params: {
  email: string;
  token?: string;
  reason?: string;
  adminOverride?: boolean;
}): {
  ok: boolean;
  code: string;
  message: string;
  subscriber?: NewsletterSubscriber;
} {
  const { email, token, reason = 'User requested unsubscribe' } = params;
  const check = validateEmailSyntax(email);
  if (!check.valid) {
    return {
      ok: false,
      code: 'INVALID_EMAIL',
      message: 'Please enter a valid email address to unsubscribe.',
    };
  }

  const normalized = check.normalized;
  const store = loadStore();
  const now = new Date().toISOString();

  let subscriber = store.subscribers.find((s) => s.email === normalized);

  if (token && subscriber && subscriber.unsubscribeToken) {
    const validHmac = verifySignedToken(normalized, 'unsubscribe', token);
    if (!validHmac && subscriber.unsubscribeToken !== token) {
      console.warn(`[EveryKR Newsletter] Unsubscribe token mismatch for ${normalized}, honoring opt-out.`);
    }
  }

  if (subscriber) {
    subscriber.status = 'unsubscribed';
    subscriber.verified = false;
    subscriber.unsubscribedAt = now;
    subscriber.unsubscribeReason = reason;
  } else {
    subscriber = {
      id: `sub_${normalized.replace(/[^a-z0-9]/g, '_').slice(0, 64)}`,
      email: normalized,
      status: 'unsubscribed',
      verified: false,
      consentGiven: false,
      consentTimestamp: now,
      subscribedAt: now,
      unsubscribedAt: now,
      unsubscribeReason: reason,
      source: 'unsubscribe_form',
      topics: [],
      unsubscribeToken: createSignedToken(normalized, 'unsubscribe'),
      deliveryCount: 0,
    };
    store.subscribers.unshift(subscriber);
  }

  if (!store.suppressionList.includes(normalized)) {
    store.suppressionList.push(normalized);
  }

  saveStore(store);

  return {
    ok: true,
    code: 'UNSUBSCRIBED',
    message: `${normalized} has been unsubscribed from EVERYKR updates and will no longer receive emails.`,
    subscriber,
  };
}

/**
 * Admin: Get Full Newsletter Overview (Subscribers, Campaigns, Suppression List, Provider Status)
 */
export function getNewsletterAdminOverview() {
  const store = loadStore();
  const cfg = getEffectiveEmailConfig();
  const runtimeCfg = loadEmailProviderRuntimeConfig();

  const activeSubscribers = store.subscribers.filter((s) => s.status === 'active' && s.verified);
  const pendingSubscribers = store.subscribers.filter((s) => s.status === 'pending_verification');
  const unsubscribedSubscribers = store.subscribers.filter(
    (s) => s.status === 'unsubscribed' || s.status === 'suppressed' || s.status === 'bounced'
  );

  return {
    provider: {
      providerConfigured: cfg.liveExternalConfigured,
      activeProvider: cfg.activeProvider,
      fromName: cfg.fromName,
      fromEmail: cfg.fromEmail,
      replyTo: cfg.replyTo,
      hmacSecretSource: getNewsletterHmacSecretSource(),
      hasBrevoKey: Boolean(cfg.brevoApiKey),
      hasResendKey: Boolean(cfg.resendApiKey),
      hasSmtpConfig: Boolean(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass),
      smtpHost: cfg.smtpHost || '',
      smtpPort: cfg.smtpPort || 587,
      smtpUser: cfg.smtpUser || '',
      updatedAt: runtimeCfg.updatedAt,
    },
    counts: {
      total: store.subscribers.length,
      activeVerified: activeSubscribers.length,
      pendingVerification: pendingSubscribers.length,
      unsubscribedOrSuppressed: unsubscribedSubscribers.length,
      suppressionListCount: store.suppressionList.length,
      totalCampaigns: store.campaigns.length,
    },
    subscribers: store.subscribers,
    campaigns: store.campaigns,
    suppressionList: store.suppressionList,
    recentDeliveryLogs: store.deliveryLogs.slice(0, 60),
  };
}

/**
 * Admin: Send Test Email to Admin Address
 */
export async function sendAdminTestNewsletterEmail(params: {
  toEmail: string;
  subject: string;
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  origin?: string;
  baseUrl?: string;
}): Promise<{
  ok: boolean;
  message: string;
  delivery: EmailDeliveryResult;
  previewHtml: string;
}> {
  const { toEmail, subject, preheader, heading, bodyHtml, ctaText, ctaUrl } = params;
  const origin = (params.origin || params.baseUrl || 'https://everykr.com').replace(/\/+$/, '');
  const check = validateEmailSyntax(toEmail);
  if (!check.valid) {
    throw new Error(check.reason || 'Invalid test recipient email address.');
  }

  const unsubToken = createSignedToken(check.normalized, 'unsubscribe');
  const unsubscribeUrl = `${origin}/?newsletter_action=unsubscribe&email=${encodeURIComponent(
    check.normalized
  )}&token=${encodeURIComponent(unsubToken)}`;

  const { html, text } = buildBrandedEmailHtml({
    preheader: preheader || subject,
    heading,
    bodyHtml,
    ctaText,
    ctaUrl,
    recipientEmail: check.normalized,
    unsubscribeUrl,
    categoryBadge: 'EVERYKR TEST BRIEFING',
  });

  const delivery = await dispatchNewsletterEmail({
    to: check.normalized,
    subject: `[TEST] ${subject}`,
    html,
    text,
    unsubscribeUrl,
  });

  return {
    ok: true,
    message: delivery.liveDelivered
      ? `Test email delivered to ${check.normalized} via ${delivery.provider.toUpperCase()} (ID: ${delivery.messageId}).`
      : delivery.emailAcceptedByProvider
      ? `Test email accepted by SMTP test relay (${delivery.provider}). Open the preview link in Delivery Logs to inspect.`
      : `Test email failed: ${delivery.errorReason || 'Provider not configured'}.`,
    delivery,
    previewHtml: html,
  };
}

/**
 * Admin: Create, Schedule, or Immediately Send a Newsletter Campaign
 */
export async function createOrSendNewsletterCampaign(params: {
  title?: string;
  subject: string;
  preheader: string;
  templateId: 'scholar_briefing' | 'scholarship_alert' | 'visa_update' | 'custom';
  heading: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  targetTopic?: string;
  scheduledFor?: string;
  action: 'save_draft' | 'schedule' | 'send_now';
  createdBy: string;
  origin?: string;
  baseUrl?: string;
}): Promise<{
  ok: boolean;
  message: string;
  campaign: NewsletterCampaign;
}> {
  const {
    subject,
    preheader,
    templateId,
    heading,
    bodyHtml,
    ctaText,
    ctaUrl,
    targetTopic = 'All Subscribers',
    scheduledFor,
    action,
    createdBy,
  } = params;
  const origin = (params.origin || params.baseUrl || 'https://everykr.com').replace(/\/+$/, '');

  const store = loadStore();
  const now = new Date().toISOString();

  const campaign: NewsletterCampaign = {
    id: `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    subject: subject.trim(),
    preheader: (preheader || subject).trim(),
    templateId,
    heading: heading.trim(),
    bodyHtml,
    ctaText,
    ctaUrl,
    status: action === 'schedule' ? 'scheduled' : action === 'send_now' ? 'sending' : 'draft',
    scheduledFor: action === 'schedule' ? scheduledFor : undefined,
    createdAt: now,
    createdBy,
    targetTopic,
    stats: {
      totalTargeted: 0,
      sent: 0,
      delivered: 0,
      bounced: 0,
      failed: 0,
      suppressedSkipped: 0,
    },
  };

  if (action !== 'send_now') {
    store.campaigns.unshift(campaign);
    saveStore(store);
    return {
      ok: true,
      message:
        action === 'schedule'
          ? `Campaign scheduled for ${scheduledFor}.`
          : 'Campaign saved as draft.',
      campaign,
    };
  }

  const suppressionSet = new Set(store.suppressionList.map((e) => e.toLowerCase()));
  const eligibleSubscribers: NewsletterSubscriber[] = [];
  let suppressedSkipped = 0;

  for (const sub of store.subscribers) {
    if (
      suppressionSet.has(sub.email.toLowerCase()) ||
      sub.status === 'unsubscribed' ||
      sub.status === 'suppressed'
    ) {
      suppressedSkipped++;
      continue;
    }
    if (sub.status !== 'active' || !sub.verified) {
      continue;
    }
    if (
      targetTopic &&
      targetTopic !== 'All Subscribers' &&
      !sub.topics.some((t) => t.toLowerCase().includes(targetTopic.toLowerCase()))
    ) {
      continue;
    }
    eligibleSubscribers.push(sub);
  }

  campaign.stats.totalTargeted = eligibleSubscribers.length;
  campaign.stats.suppressedSkipped = suppressedSkipped;

  for (const sub of eligibleSubscribers) {
    const unsubscribeUrl = `${origin}/?newsletter_action=unsubscribe&email=${encodeURIComponent(
      sub.email
    )}&token=${encodeURIComponent(sub.unsubscribeToken)}`;

    const { html, text } = buildBrandedEmailHtml({
      preheader: campaign.preheader,
      heading: campaign.heading,
      bodyHtml: campaign.bodyHtml,
      ctaText: campaign.ctaText,
      ctaUrl: campaign.ctaUrl,
      recipientEmail: sub.email,
      unsubscribeUrl,
    });

    const result = await dispatchNewsletterEmail({
      to: sub.email,
      subject: campaign.subject,
      html,
      text,
      unsubscribeUrl,
      campaignId: campaign.id,
    });

    campaign.stats.sent += 1;
    if (result.liveDelivered || result.emailAcceptedByProvider) {
      campaign.stats.delivered += 1;
      sub.deliveryCount = (sub.deliveryCount || 0) + 1;
      sub.lastEmailSentAt = result.timestamp;
      sub.lastDeliveryStatus = result.status;
      sub.lastDeliveryProvider = result.provider;
      sub.lastMessageId = result.messageId;
      sub.lastPreviewUrl = result.previewUrl;
    } else {
      campaign.stats.failed += 1;
      sub.lastDeliveryStatus = 'failed';
      sub.lastDeliveryError = result.errorReason;
    }
  }

  campaign.status =
    campaign.stats.failed > 0 && campaign.stats.delivered === 0 ? 'partial_failure' : 'sent';
  campaign.sentAt = new Date().toISOString();

  const latestStore = loadStore();
  latestStore.campaigns.unshift(campaign);
  saveStore(latestStore);

  return {
    ok: true,
    message: `Campaign "${campaign.subject}" processed for ${campaign.stats.totalTargeted} active subscribers (${campaign.stats.delivered} accepted/delivered, ${campaign.stats.suppressedSkipped} unsubscribed/suppressed skipped).`,
    campaign,
  };
}

/**
 * Simple in-memory rate limiter for subscription/auth endpoints
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests = 12,
  windowMs = 60_000
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return { allowed: true };
}

export function getEmailProviderStatus() {
  const cfg = getEffectiveEmailConfig();
  return {
    providerConfigured: cfg.liveExternalConfigured,
    activeProvider: cfg.activeProvider,
    fromName: cfg.fromName,
    fromEmail: cfg.fromEmail,
    replyTo: cfg.replyTo,
    hmacSecretSource: getNewsletterHmacSecretSource(),
  };
}

export function exportSubscribersCsv(): string {
  const store = loadStore();
  const headers = [
    'ID',
    'Email',
    'Status',
    'Verified',
    'ConsentGiven',
    'SubscribedAt',
    'VerifiedAt',
    'UnsubscribedAt',
    'LastDeliveryStatus',
    'LastDeliveryProvider',
    'LastEmailSentAt',
    'LastDeliveryError',
    'Topics',
  ];
  const rows = store.subscribers.map((s) => [
    s.id,
    s.email,
    s.status,
    String(s.verified),
    String(s.consentGiven),
    s.subscribedAt,
    s.verifiedAt || '',
    s.unsubscribedAt || '',
    s.lastDeliveryStatus || '',
    s.lastDeliveryProvider || '',
    s.lastEmailSentAt || '',
    s.lastDeliveryError || '',
    (s.topics || []).join('; '),
  ]);
  return [
    headers.join(','),
    ...rows.map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}

// Compatibility exports for server.ts
export const confirmDoubleOptIn = confirmSubscriptionToken;
export const processUnsubscribe = unsubscribeVisitor;
export const getAdminNewsletterOverview = getNewsletterAdminOverview;
export const sendAdminTestEmail = sendAdminTestNewsletterEmail;
export const createOrSendCampaign = createOrSendNewsletterCampaign;

