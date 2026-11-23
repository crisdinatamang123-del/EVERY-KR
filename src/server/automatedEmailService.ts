import crypto from 'crypto';
import dns from 'dns/promises';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { loadEmailProviderRuntimeConfig } from './newsletterService.ts';
import {
  FIRESTORE_COLLECTIONS,
  deterministicEmailHashId,
  isProductionCloudRunRuntime,
  sanitizeFirestoreDocId,
  upsertNamedFirestoreDoc,
} from './firestorePersistenceBridge.ts';

export type AutomatedEmailWorkflowType =
  | 'login_welcome_back'
  | 'registration_congratulations'
  | 'newsletter_welcome'
  | 'newsletter_campaign'
  | 'password_reset'
  | 'account_otp'
  | 'contact_support_reply'
  | 'contact_admin_alert'
  | 'internal_employee_approval'
  | 'internal_employee_rejection'
  | 'application_status_update';

export type AutomatedEmailDeliveryStatus =
  | 'delivered'
  | 'accepted_firebase_auth'
  | 'smtp_relay_accepted'
  | 'skipped_duplicate'
  | 'skipped_post_registration'
  | 'failed'
  | 'unconfigured';

export interface AutomatedEmailLogEntry {
  id: string;
  emailType: AutomatedEmailWorkflowType;
  recipient: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  provider: string;
  messageId?: string;
  deliveryStatus: AutomatedEmailDeliveryStatus;
  errorReason?: string;
  triggerSource?: string;
  timestamp: string;
}

interface RegistrationSentRecord {
  uid: string;
  email: string;
  fullName: string;
  sentAt: string;
  sentAtMs: number;
  messageId?: string;
  provider: string;
  status: AutomatedEmailDeliveryStatus;
}

interface LoginDispatchRecord {
  email: string;
  uid: string;
  lastSentAt: string;
  lastSentAtMs: number;
  lastAuthAttemptId?: string;
  lastMessageId?: string;
}

interface PersistedAutomatedEmailState {
  registrationSentByEmail: Record<string, RegistrationSentRecord>;
  registrationSentByUid: Record<string, RegistrationSentRecord>;
  recentLoginByEmail: Record<string, LoginDispatchRecord>;
  processedAuthAttemptIds: Record<string, number>;
  deliveryLogs: AutomatedEmailLogEntry[];
}

const AUTOMATED_EMAIL_STORE_PATH = path.resolve(
  process.cwd(),
  '.everykr-automated-emails.json'
);

export const OFFICIAL_EVERYKR_URL = 'https://everykr.com';
export const OFFICIAL_EVERYKR_LOGO_URL = 'https://everykr.com/everykr-logo.png';

// Rapid duplicate auth-event guard window (prevents duplicate emails from repeated auth state callbacks)
const LOGIN_RAPID_DEDUP_WINDOW_MS = 30 * 1000; // 30 seconds
// Post-registration suppression window so newly registered users receive ONLY Congratulations and never Welcome Back simultaneously
const POST_REGISTRATION_LOGIN_SUPPRESS_MS = 120 * 1000; // 2 minutes
const AUTH_ATTEMPT_ID_TTL_MS = 60 * 60 * 1000; // 1 hour

const inFlightRegistrations = new Set<string>();
const inFlightLogins = new Set<string>();

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  const clean = normalizeEmail(email);
  if (!clean || clean.length > 254) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(clean);
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
 * Extracts a clean, natural first name for greeting an existing user on login.
 */
export function extractFirstName(fullName?: string, fallbackEmail?: string): string {
  const cleaned = String(fullName || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned && !cleaned.includes('@')) {
    const honorificRegex = /^(mr\.?|mrs\.?|ms\.?|dr\.?|prof\.?)\s+/i;
    const withoutTitle = cleaned.replace(honorificRegex, '').trim();
    const firstToken = withoutTitle.split(' ')[0]?.trim();
    if (firstToken && firstToken.length >= 1) {
      return firstToken;
    }
  }

  const emailPrefix = normalizeEmail(fallbackEmail || '').split('@')[0] || '';
  const friendlyPrefix = emailPrefix.replace(/[._0-9-]+/g, ' ').trim().split(' ')[0];
  if (friendlyPrefix && friendlyPrefix.length >= 2) {
    return friendlyPrefix.charAt(0).toUpperCase() + friendlyPrefix.slice(1);
  }
  return 'Scholar';
}

/**
 * Resolves the full registered display name for registration congratulations emails.
 */
export function resolveRegisteredDisplayName(fullName?: string, fallbackEmail?: string): string {
  const cleaned = String(fullName || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned && !cleaned.includes('@')) {
    return cleaned;
  }
  return extractFirstName(fullName, fallbackEmail);
}

function loadAutomatedEmailStore(): PersistedAutomatedEmailState {
  try {
    if (fs.existsSync(AUTOMATED_EMAIL_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(AUTOMATED_EMAIL_STORE_PATH, 'utf-8'));
      return {
        registrationSentByEmail:
          parsed?.registrationSentByEmail && typeof parsed.registrationSentByEmail === 'object'
            ? parsed.registrationSentByEmail
            : {},
        registrationSentByUid:
          parsed?.registrationSentByUid && typeof parsed.registrationSentByUid === 'object'
            ? parsed.registrationSentByUid
            : {},
        recentLoginByEmail:
          parsed?.recentLoginByEmail && typeof parsed.recentLoginByEmail === 'object'
            ? parsed.recentLoginByEmail
            : {},
        processedAuthAttemptIds:
          parsed?.processedAuthAttemptIds && typeof parsed.processedAuthAttemptIds === 'object'
            ? parsed.processedAuthAttemptIds
            : {},
        deliveryLogs: Array.isArray(parsed?.deliveryLogs) ? parsed.deliveryLogs : [],
      };
    }
  } catch (err) {
    console.warn('[EveryKR Automated Email] Failed to read state store, initializing clean store:', err);
  }

  return {
    registrationSentByEmail: {},
    registrationSentByUid: {},
    recentLoginByEmail: {},
    processedAuthAttemptIds: {},
    deliveryLogs: [],
  };
}

function saveAutomatedEmailStore(state: PersistedAutomatedEmailState): void {
  // Prune expired authAttemptIds and cap logs to 400 entries
  const cutoff = Date.now() - AUTH_ATTEMPT_ID_TTL_MS;
  for (const [attemptId, ts] of Object.entries(state.processedAuthAttemptIds)) {
    if (typeof ts !== 'number' || ts < cutoff) {
      delete state.processedAuthAttemptIds[attemptId];
    }
  }
  state.deliveryLogs = state.deliveryLogs.slice(0, 400);

  // Mirror recent deduplication records additively to named Firestore DB for multi-instance Cloud Run safety
  for (const [email, rec] of Object.entries(state.registrationSentByEmail).slice(-20)) {
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.automatedEmailDedupState,
      `reg_email_${deterministicEmailHashId(email)}`,
      { kind: 'registration_email', ...rec }
    );
  }
  for (const [uid, rec] of Object.entries(state.registrationSentByUid).slice(-20)) {
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.automatedEmailDedupState,
      `reg_uid_${sanitizeFirestoreDocId(uid)}`,
      { kind: 'registration_uid', ...rec }
    );
  }
  for (const [email, rec] of Object.entries(state.recentLoginByEmail).slice(-20)) {
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.automatedEmailDedupState,
      `login_email_${deterministicEmailHashId(email)}`,
      { kind: 'login_email', ...rec }
    );
  }

  try {
    fs.writeFileSync(AUTOMATED_EMAIL_STORE_PATH, JSON.stringify(state, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  } catch (err) {
    if (!isProductionCloudRunRuntime()) {
      console.error('[EveryKR Automated Email] Failed to persist state store:', err);
    }
  }
}

export function appendAutomatedEmailAuditLog(
  entry: Omit<AutomatedEmailLogEntry, 'id' | 'timestamp'> & { timestamp?: string }
): AutomatedEmailLogEntry {
  const state = loadAutomatedEmailStore();
  const fullEntry: AutomatedEmailLogEntry = {
    id: `emlog_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    emailType: entry.emailType,
    recipient: normalizeEmail(entry.recipient),
    senderName: entry.senderName,
    senderEmail: entry.senderEmail,
    subject: entry.subject,
    provider: entry.provider,
    messageId: entry.messageId,
    deliveryStatus: entry.deliveryStatus,
    errorReason: entry.errorReason,
    triggerSource: entry.triggerSource,
    timestamp: entry.timestamp || new Date().toISOString(),
  };
  state.deliveryLogs.unshift(fullEntry);
  void upsertNamedFirestoreDoc(
    FIRESTORE_COLLECTIONS.automatedEmailAuditLogs,
    fullEntry.id,
    fullEntry as unknown as Record<string, unknown>
  );
  saveAutomatedEmailStore(state);
  return fullEntry;
}

/**
 * Resolves strictly separated sender identities for each EveryKR email system:
 * 1. Account Emails (Login & Registration): EveryKR Account Team <account@everykr.com>
 * 2. Newsletter Emails: EveryKR Newsletter <newsletter@everykr.com> (NEVER newsletter@newsletter.everykr.com)
 * 3. Security / OTP / Password Reset Emails: EveryKR Account Security <security@everykr.com>
 */
export function getWorkflowSenderIdentity(
  workflow: 'account' | 'newsletter' | 'security'
): {
  senderName: string;
  senderEmail: string;
  replyTo: string;
} {
  const replyTo = (process.env.EMAIL_REPLY_TO || 'support@everykr.com').trim();

  if (workflow === 'newsletter') {
    const rawNewsletterEmail = (
      process.env.NEWSLETTER_FROM_EMAIL || 'newsletter@everykr.com'
    )
      .trim()
      .toLowerCase();
    // Strictly forbid newsletter@newsletter.everykr.com or non-newsletter addresses
    const sanitizedNewsletterEmail =
      rawNewsletterEmail === 'newsletter@newsletter.everykr.com' ||
      !rawNewsletterEmail.endsWith('@everykr.com')
        ? 'newsletter@everykr.com'
        : 'newsletter@everykr.com';

    const rawNewsletterName = (
      process.env.NEWSLETTER_FROM_NAME || 'EveryKR Newsletter'
    ).trim();
    const sanitizedNewsletterName =
      !rawNewsletterName || rawNewsletterName.toUpperCase() === 'EVERYKR'
        ? 'EveryKR Newsletter'
        : rawNewsletterName;

    return {
      senderName: sanitizedNewsletterName,
      senderEmail: sanitizedNewsletterEmail,
      replyTo,
    };
  }

  if (workflow === 'security') {
    const rawSecurityEmail = (
      process.env.SECURITY_EMAIL_FROM_ADDRESS || 'security@everykr.com'
    )
      .trim()
      .toLowerCase();
    const sanitizedSecurityEmail =
      rawSecurityEmail === 'newsletter@everykr.com' ||
      rawSecurityEmail === 'newsletter@newsletter.everykr.com'
        ? 'security@everykr.com'
        : rawSecurityEmail;

    return {
      senderName: (
        process.env.SECURITY_EMAIL_FROM_NAME || 'EveryKR Account Security'
      ).trim(),
      senderEmail: sanitizedSecurityEmail,
      replyTo,
    };
  }

  // Account workflow (Login Welcome Back & Registration Congratulations)
  const rawAccountEmail = (
    process.env.ACCOUNT_EMAIL_FROM_ADDRESS || 'account@everykr.com'
  )
    .trim()
    .toLowerCase();
  const sanitizedAccountEmail =
    rawAccountEmail === 'newsletter@everykr.com' ||
    rawAccountEmail === 'newsletter@newsletter.everykr.com'
      ? 'account@everykr.com'
      : rawAccountEmail;

  return {
    senderName: (process.env.ACCOUNT_EMAIL_FROM_NAME || 'EveryKR Account Team').trim(),
    senderEmail: sanitizedAccountEmail,
    replyTo,
  };
}

function getProviderCredentials() {
  const runtime = loadEmailProviderRuntimeConfig();
  const brevoApiKey = (
    runtime.brevoApiKey ||
    process.env.BREVO_API_KEY ||
    process.env.SENDINBLUE_API_KEY ||
    ''
  ).trim();
  const resendApiKey = (runtime.resendApiKey || process.env.RESEND_API_KEY || '').trim();
  const smtpHost = (runtime.smtpHost || process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(runtime.smtpPort || process.env.SMTP_PORT || 587);
  const smtpUser = (runtime.smtpUser || process.env.SMTP_USER || '').trim();
  const smtpPass = (runtime.smtpPass || process.env.SMTP_PASS || '').trim();
  const smtpSecure =
    runtime.smtpSecure !== undefined
      ? Boolean(runtime.smtpSecure)
      : process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  let activeProvider: 'brevo' | 'resend' | 'smtp' | 'unconfigured' = 'unconfigured';
  if (brevoApiKey) {
    activeProvider = 'brevo';
  } else if (resendApiKey) {
    activeProvider = 'resend';
  } else if (smtpHost && smtpUser && smtpPass) {
    activeProvider = 'smtp';
  }

  return {
    activeProvider,
    brevoApiKey,
    resendApiKey,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure,
  };
}

/**
 * Shared server-side transactional email dispatcher using the existing configured provider
 * (Brevo -> Resend -> Custom SMTP). Never modifies or substitutes the requested sender address.
 */
export async function dispatchTransactionalEmailServer(params: {
  emailType: AutomatedEmailWorkflowType;
  to: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  triggerSource?: string;
}): Promise<{
  delivered: boolean;
  provider: 'brevo' | 'resend' | 'smtp' | 'unconfigured';
  messageId?: string;
  status: AutomatedEmailDeliveryStatus;
  errorReason?: string;
  timestamp: string;
}> {
  const creds = getProviderCredentials();
  const timestamp = new Date().toISOString();
  const recipient = normalizeEmail(params.to);
  const replyTo = params.replyTo || 'support@everykr.com';

  let lastError = '';

  // 1. Brevo HTTP API
  if (creds.brevoApiKey) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': creds.brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: params.senderName, email: params.senderEmail },
            to: [{ email: recipient }],
            replyTo: { email: replyTo },
            subject: params.subject,
            htmlContent: params.html,
            textContent: params.text,
            ...(params.headers ? { headers: params.headers } : {}),
          }),
        });
        const data: any = await res.json().catch(() => ({}));
        if (res.ok) {
          const messageId = String(data?.messageId || `brevo_${Date.now()}`);
          appendAutomatedEmailAuditLog({
            emailType: params.emailType,
            recipient,
            senderName: params.senderName,
            senderEmail: params.senderEmail,
            subject: params.subject,
            provider: 'brevo',
            messageId,
            deliveryStatus: 'delivered',
            triggerSource: params.triggerSource,
            timestamp,
          });
          return {
            delivered: true,
            provider: 'brevo',
            messageId,
            status: 'delivered',
            timestamp,
          };
        }
        lastError = data?.message || `Brevo HTTP ${res.status}`;
      } catch (err: any) {
        lastError = err?.message || 'Brevo network error';
      }
    }
  }

  // 2. Resend HTTP API (Strictly uses exact senderEmail — never falls back to onboarding@resend.dev)
  if (creds.resendApiKey) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${creds.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${params.senderName} <${params.senderEmail}>`,
            to: [recipient],
            reply_to: replyTo,
            subject: params.subject,
            html: params.html,
            text: params.text,
            ...(params.headers ? { headers: params.headers } : {}),
          }),
        });
        const data: any = await res.json().catch(() => ({}));
        if (res.ok && data?.id) {
          const messageId = String(data.id);
          appendAutomatedEmailAuditLog({
            emailType: params.emailType,
            recipient,
            senderName: params.senderName,
            senderEmail: params.senderEmail,
            subject: params.subject,
            provider: 'resend',
            messageId,
            deliveryStatus: 'delivered',
            triggerSource: params.triggerSource,
            timestamp,
          });
          return {
            delivered: true,
            provider: 'resend',
            messageId,
            status: 'delivered',
            timestamp,
          };
        }
        lastError = data?.message || data?.error || `Resend HTTP ${res.status}`;
      } catch (err: any) {
        lastError = err?.message || 'Resend network error';
      }
    }
  }

  // 3. Custom Production SMTP
  if (creds.smtpHost && creds.smtpUser && creds.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: creds.smtpHost,
        port: creds.smtpPort,
        secure: creds.smtpSecure,
        auth: {
          user: creds.smtpUser,
          pass: creds.smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${params.senderName}" <${params.senderEmail}>`,
        to: recipient,
        replyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
        headers: params.headers,
      });

      const messageId = String(info.messageId || `smtp_${Date.now()}`);
      appendAutomatedEmailAuditLog({
        emailType: params.emailType,
        recipient,
        senderName: params.senderName,
        senderEmail: params.senderEmail,
        subject: params.subject,
        provider: 'smtp',
        messageId,
        deliveryStatus: 'delivered',
        triggerSource: params.triggerSource,
        timestamp,
      });
      return {
        delivered: true,
        provider: 'smtp',
        messageId,
        status: 'delivered',
        timestamp,
      };
    } catch (err: any) {
      lastError = err?.message || 'SMTP transmission error';
    }
  }

  const finalStatus: AutomatedEmailDeliveryStatus =
    creds.activeProvider === 'unconfigured' ? 'unconfigured' : 'failed';
  const finalReason =
    lastError ||
    'No external email provider (RESEND_API_KEY, BREVO_API_KEY, or SMTP_HOST) is configured on the server.';

  appendAutomatedEmailAuditLog({
    emailType: params.emailType,
    recipient,
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    subject: params.subject,
    provider: creds.activeProvider,
    deliveryStatus: finalStatus,
    errorReason: finalReason,
    triggerSource: params.triggerSource,
    timestamp,
  });

  return {
    delivered: false,
    provider: creds.activeProvider,
    status: finalStatus,
    errorReason: finalReason,
    timestamp,
  };
}

/**
 * Shared Responsive HTML Email Shell for EveryKR Automated Account Emails
 */
function renderEveryKrAccountEmailLayout(options: {
  preheader: string;
  badgeText: string;
  heading: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
  footerNoteHtml: string;
  recipientEmail: string;
}): string {
  const safePreheader = escapeHtml(options.preheader);
  const safeBadge = escapeHtml(options.badgeText);
  const safeHeading = escapeHtml(options.heading);
  const safeCtaText = escapeHtml(options.ctaText);
  const safeCtaUrl = escapeHtml(options.ctaUrl);
  const safeRecipient = escapeHtml(options.recipientEmail);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeHeading}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F8FD;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0B1728;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${safePreheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F4F8FD;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 6px 24px rgba(11,23,40,0.06);">
          <!-- Official EveryKR Branded Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#071326 0%,#102544 100%);padding:28px 32px;border-bottom:3px solid #2563EB;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right:12px;">
                          <img src="${OFFICIAL_EVERYKR_LOGO_URL}" alt="EveryKR" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:10px;object-fit:contain;background-color:rgba(255,255,255,0.08);padding:4px;" />
                        </td>
                        <td valign="middle">
                          <span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#60A5FA;margin-bottom:3px;">${safeBadge}</span>
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
          <!-- Main Message Body -->
          <tr>
            <td style="padding:34px 32px 30px 32px;">
              <h1 style="margin:0 0 18px 0;font-size:22px;line-height:1.35;font-weight:800;color:#0B1728;">${safeHeading}</h1>
              <div style="font-size:15px;line-height:1.7;color:#334155;">
                ${options.bodyHtml}
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;margin-bottom:8px;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#2563EB;">
                    <a href="${safeCtaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">
                      ${safeCtaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:22px 32px;border-top:1px solid #E2E8F0;font-size:12px;line-height:1.65;color:#64748B;">
              ${options.footerNoteHtml}
              <p style="margin:10px 0 4px 0;">
                <strong>EveryKR Account Team</strong> &bull; International Education &amp; Student Platform for South Korea
              </p>
              <p style="margin:0;">
                Sent to <span style="color:#334155;font-weight:600;">${safeRecipient}</span> &bull; Visit <a href="${OFFICIAL_EVERYKR_URL}" style="color:#2563EB;text-decoration:underline;">everykr.com</a> &bull; Support: <a href="mailto:support@everykr.com" style="color:#2563EB;text-decoration:none;">support@everykr.com</a>
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

/**
 * WORKFLOW 1: LOGIN EMAIL — WELCOME BACK
 * - Subject: Welcome Back to EveryKR!
 * - Sender: EveryKR Account Team <account@everykr.com>
 * - Greets user by registered first name, confirms login, includes "Explore EveryKR" -> https://everykr.com
 * - Deduplicated against repeated auth state callbacks and suppressed immediately after initial registration.
 */
export function buildLoginWelcomeBackEmailTemplate(params: {
  firstName: string;
  email: string;
  loginTimeIso?: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Welcome Back to EveryKR!';
  const safeFirstName = escapeHtml(params.firstName);
  const formattedUtc = new Date(params.loginTimeIso || Date.now()).toUTCString();

  const bodyHtml = `<p style="margin:0 0 14px 0;">Hello <strong>${safeFirstName}</strong>,</p>
<p style="margin:0 0 16px 0;">Welcome back! This email confirms that you have successfully logged in to your <strong>EveryKR</strong> account.</p>
<div style="margin:18px 0;padding:14px 18px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;font-size:13px;color:#475569;">
  <strong style="color:#0B1728;">Sign-In Confirmed:</strong> ${escapeHtml(formattedUtc)}
</div>
<p style="margin:0;">Continue exploring South Korean universities, scholarship programs, Korean language learning, student housing, and campus life resources right from your portal.</p>`;

  const footerNoteHtml = `<p style="margin:0;color:#475569;">
  <strong>Security Tip:</strong> You are receiving this automated account notification because a sign-in was completed on your EveryKR account. If this wasn't you, please reset your password immediately at <a href="${OFFICIAL_EVERYKR_URL}/reset-password" style="color:#2563EB;text-decoration:underline;">everykr.com/reset-password</a>.
</p>`;

  const html = renderEveryKrAccountEmailLayout({
    preheader: `Welcome back, ${params.firstName}! Your sign-in to EveryKR is confirmed.`,
    badgeText: 'EVERYKR ACCOUNT TEAM',
    heading: 'Welcome Back to EveryKR!',
    bodyHtml,
    ctaText: 'Explore EveryKR',
    ctaUrl: OFFICIAL_EVERYKR_URL,
    footerNoteHtml,
    recipientEmail: params.email,
  });

  const text = [
    `Welcome Back to EveryKR!`,
    ``,
    `Hello ${params.firstName},`,
    ``,
    `Welcome back! This email confirms that you have successfully logged in to your EveryKR account (${params.email}).`,
    `Sign-In Time: ${formattedUtc}`,
    ``,
    `Continue exploring South Korean universities, scholarships, Korean language learning, accommodation, transport, and student services:`,
    `Explore EveryKR: ${OFFICIAL_EVERYKR_URL}`,
    ``,
    `Security Tip: If you did not sign in to your EveryKR account, please reset your password immediately at ${OFFICIAL_EVERYKR_URL}/reset-password or contact support@everykr.com.`,
    ``,
    `— EveryKR Account Team`,
  ].join('\n');

  return { subject, html, text };
}

export async function sendLoginWelcomeBackEmail(params: {
  uid: string;
  email: string;
  fullName?: string;
  authAttemptId?: string;
  triggerSource?: string;
}): Promise<{
  sent: boolean;
  skippedReason?: string;
  provider?: string;
  messageId?: string;
  status: AutomatedEmailDeliveryStatus;
}> {
  const email = normalizeEmail(params.email);
  const uid = String(params.uid || '').trim();
  const attemptId = params.authAttemptId ? String(params.authAttemptId).trim() : '';

  if (!isValidEmail(email) || !uid) {
    return { sent: false, skippedReason: 'invalid_recipient', status: 'failed' };
  }

  if (inFlightLogins.has(email)) {
    return {
      sent: false,
      skippedReason: 'concurrent_login_dispatch_in_progress',
      status: 'skipped_duplicate',
    };
  }

  inFlightLogins.add(email);
  try {
    const state = loadAutomatedEmailStore();
    const now = Date.now();
    const sender = getWorkflowSenderIdentity('account');

    // 1. Suppress "Welcome Back" if this account was JUST created within the last 2 minutes
    const regByEmail = state.registrationSentByEmail[email];
    const regByUid = state.registrationSentByUid[uid];
    const recentRegMs = Math.max(regByEmail?.sentAtMs || 0, regByUid?.sentAtMs || 0);
    if (recentRegMs > 0 && now - recentRegMs < POST_REGISTRATION_LOGIN_SUPPRESS_MS) {
      return {
        sent: false,
        skippedReason: 'suppressed_immediately_after_registration',
        status: 'skipped_post_registration',
      };
    }

    // 2. Deduplicate identical authAttemptId (e.g. client + server fallback carrying the same login click ID)
    if (attemptId && state.processedAuthAttemptIds[attemptId]) {
      return {
        sent: false,
        skippedReason: 'duplicate_auth_attempt_id',
        status: 'skipped_duplicate',
      };
    }

    // 3. Deduplicate rapid repeated auth state callbacks within 30 seconds for the same user
    const prevLogin = state.recentLoginByEmail[email];
    if (prevLogin && now - prevLogin.lastSentAtMs < LOGIN_RAPID_DEDUP_WINDOW_MS) {
      return {
        sent: false,
        skippedReason: 'duplicate_login_within_cooldown_window',
        status: 'skipped_duplicate',
      };
    }

    // Record attempt lock before network call to prevent race conditions
    if (attemptId) {
      state.processedAuthAttemptIds[attemptId] = now;
    }
    state.recentLoginByEmail[email] = {
      email,
      uid,
      lastSentAt: new Date(now).toISOString(),
      lastSentAtMs: now,
      lastAuthAttemptId: attemptId || undefined,
    };
    saveAutomatedEmailStore(state);

    const firstName = extractFirstName(params.fullName, email);
    const { subject, html, text } = buildLoginWelcomeBackEmailTemplate({
      firstName,
      email,
      loginTimeIso: new Date(now).toISOString(),
    });

    const result = await dispatchTransactionalEmailServer({
      emailType: 'login_welcome_back',
      to: email,
      senderName: sender.senderName,
      senderEmail: sender.senderEmail,
      replyTo: sender.replyTo,
      subject,
      html,
      text,
      triggerSource: params.triggerSource || 'interactive_login',
    });

    if (result.messageId) {
      const updated = loadAutomatedEmailStore();
      if (updated.recentLoginByEmail[email]) {
        updated.recentLoginByEmail[email].lastMessageId = result.messageId;
        saveAutomatedEmailStore(updated);
      }
    }

    return {
      sent: result.delivered,
      provider: result.provider,
      messageId: result.messageId,
      status: result.status,
      skippedReason: result.delivered ? undefined : result.errorReason,
    };
  } finally {
    inFlightLogins.delete(email);
  }
}

/**
 * WORKFLOW 2: REGISTRATION EMAIL — CONGRATULATIONS
 * - Subject: Congratulations! Welcome to EveryKR!
 * - Sender: EveryKR Account Team <account@everykr.com>
 * - Personalizes with registered name, introduces EveryKR platform services, includes "Explore EveryKR" -> https://everykr.com
 * - Strictly sent ONLY ONCE per newly created account (tracked permanently by both UID and email).
 */
export function buildRegistrationCongratulationsEmailTemplate(params: {
  registeredName: string;
  email: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Congratulations! Welcome to EveryKR!';
  const safeName = escapeHtml(params.registeredName);

  const bodyHtml = `<p style="margin:0 0 14px 0;">Dear <strong>${safeName}</strong>,</p>
<p style="margin:0 0 16px 0;"><strong>Congratulations on joining EveryKR!</strong> Your account has been successfully created, and we are thrilled to welcome you to our global community.</p>
<p style="margin:0 0 14px 0;"><strong>EveryKR</strong> is your dedicated all-in-one platform built for international students in South Korea — helping you confidently navigate every step of your journey:</p>
<ul style="margin:0 0 18px 0;padding-left:20px;color:#1E293B;">
  <li style="margin-bottom:7px;"><strong>Universities &amp; Admissions:</strong> Explore top South Korean universities, degree programs, tuition, and admission timelines.</li>
  <li style="margin-bottom:7px;"><strong>Scholarships:</strong> Discover GKS, university merit scholarships, and financial aid opportunities.</li>
  <li style="margin-bottom:7px;"><strong>Korean Language Learning:</strong> Master Hangul, TOPIK preparation, and practical everyday Korean.</li>
  <li style="margin-bottom:7px;"><strong>Accommodation &amp; Transport:</strong> Find student-friendly housing, dormitories, goshiwons, KTX, and subway guides.</li>
  <li style="margin-bottom:7px;"><strong>Student Services:</strong> Access visa guidance, arrival checklists, healthcare, part-time jobs, and community support.</li>
</ul>
<p style="margin:0;color:#0B1728;font-weight:600;">Your personalized Student Portal is ready whenever you are. Click below to start exploring!</p>`;

  const footerNoteHtml = `<p style="margin:0;color:#475569;">
  You are receiving this one-time welcome email because you registered a new account on <strong>EveryKR</strong>.
</p>`;

  const html = renderEveryKrAccountEmailLayout({
    preheader: `Congratulations, ${params.registeredName}! Welcome to EveryKR — Everything Korea. One Platform.`,
    badgeText: 'WELCOME TO EVERYKR',
    heading: 'Congratulations! Welcome to EveryKR!',
    bodyHtml,
    ctaText: 'Explore EveryKR',
    ctaUrl: OFFICIAL_EVERYKR_URL,
    footerNoteHtml,
    recipientEmail: params.email,
  });

  const text = [
    `Congratulations! Welcome to EveryKR!`,
    ``,
    `Dear ${params.registeredName},`,
    ``,
    `Congratulations on joining EveryKR! Your account (${params.email}) has been successfully created.`,
    ``,
    `EveryKR is an all-in-one platform for international students exploring South Korea, including:`,
    `• Universities & Admissions: South Korean universities, degree programs, and admission requirements`,
    `• Scholarships: GKS and university scholarship opportunities`,
    `• Korean Language Learning: Structured Hangul, grammar, and TOPIK resources`,
    `• Accommodation & Transport: Student housing, dormitories, subway, and KTX guides`,
    `• Student Services: Visa guidance, arrival support, healthcare, jobs, and community`,
    ``,
    `Explore EveryKR: ${OFFICIAL_EVERYKR_URL}`,
    ``,
    `— EveryKR Account Team`,
  ].join('\n');

  return { subject, html, text };
}

export async function sendRegistrationCongratulationsEmail(params: {
  uid: string;
  email: string;
  fullName?: string;
  triggerSource?: string;
}): Promise<{
  sent: boolean;
  alreadySent: boolean;
  provider?: string;
  messageId?: string;
  status: AutomatedEmailDeliveryStatus;
  errorReason?: string;
}> {
  const email = normalizeEmail(params.email);
  const uid = String(params.uid || '').trim();

  if (!isValidEmail(email) || !uid) {
    return {
      sent: false,
      alreadySent: false,
      status: 'failed',
      errorReason: 'Invalid email or uid for registration email.',
    };
  }

  const lockKey = `${uid}:${email}`;
  if (inFlightRegistrations.has(lockKey) || inFlightRegistrations.has(email)) {
    return {
      sent: false,
      alreadySent: true,
      status: 'skipped_duplicate',
    };
  }

  inFlightRegistrations.add(lockKey);
  inFlightRegistrations.add(email);
  try {
    const state = loadAutomatedEmailStore();
    if (state.registrationSentByEmail[email] || state.registrationSentByUid[uid]) {
      return {
        sent: false,
        alreadySent: true,
        status: 'skipped_duplicate',
      };
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const registeredName = resolveRegisteredDisplayName(params.fullName, email);
    const sender = getWorkflowSenderIdentity('account');

    // Permanently mark account BEFORE dispatch so concurrent hooks can never double-send
    const initialRecord: RegistrationSentRecord = {
      uid,
      email,
      fullName: registeredName,
      sentAt: nowIso,
      sentAtMs: now,
      provider: 'pending',
      status: 'delivered',
    };
    state.registrationSentByEmail[email] = initialRecord;
    state.registrationSentByUid[uid] = initialRecord;
    saveAutomatedEmailStore(state);

    const { subject, html, text } = buildRegistrationCongratulationsEmailTemplate({
      registeredName,
      email,
    });

    const result = await dispatchTransactionalEmailServer({
      emailType: 'registration_congratulations',
      to: email,
      senderName: sender.senderName,
      senderEmail: sender.senderEmail,
      replyTo: sender.replyTo,
      subject,
      html,
      text,
      triggerSource: params.triggerSource || 'account_registration',
    });

    const updated = loadAutomatedEmailStore();
    const finalRecord: RegistrationSentRecord = {
      uid,
      email,
      fullName: registeredName,
      sentAt: result.timestamp,
      sentAtMs: now,
      messageId: result.messageId,
      provider: result.provider,
      status: result.status,
    };
    updated.registrationSentByEmail[email] = finalRecord;
    updated.registrationSentByUid[uid] = finalRecord;
    saveAutomatedEmailStore(updated);

    return {
      sent: result.delivered,
      alreadySent: false,
      provider: result.provider,
      messageId: result.messageId,
      status: result.status,
      errorReason: result.errorReason,
    };
  } finally {
    inFlightRegistrations.delete(lockKey);
    inFlightRegistrations.delete(email);
  }
}

/**
 * WORKFLOW 4 AUDIT LOGGER: FORGOT PASSWORD — FIREBASE AUTHENTICATION PASSWORD RESET
 * Records non-sensitive audit telemetry when Firebase Auth `sendPasswordResetEmail()` executes.
 * Never logs or accepts reset tokens, oobCodes, or passwords.
 */
export function recordPasswordResetEmailAuditServer(params: {
  email: string;
  delivered: boolean;
  errorCode?: string;
  continueUrl?: string;
}): AutomatedEmailLogEntry | null {
  const email = normalizeEmail(params.email);
  if (!isValidEmail(email)) return null;

  return appendAutomatedEmailAuditLog({
    emailType: 'password_reset',
    recipient: email,
    senderName: 'EveryKR Account Security',
    senderEmail: 'security@everykr.com',
    subject: 'Reset Your EveryKR Password',
    provider: 'firebase_admin_resend',
    deliveryStatus: params.delivered ? 'accepted_firebase_auth' : 'failed',
    errorReason: params.delivered
      ? undefined
      : `Firebase Auth rejected reset: ${String(params.errorCode || 'unknown_error').slice(0, 120)}`,
    triggerSource: 'forgot_password_firebase_auth',
  });
}

/**
 * Live DNS & Email Provider Domain Verification Inspector for `everykr.com`.
 * Checks SPF, DKIM, and DMARC DNS records AND queries Resend / Brevo API for confirmed verification status.
 */
export async function verifyEmailInfrastructureServer(): Promise<{
  domain: string;
  activeProvider: string;
  providerConfigured: boolean;
  providerConfirmedDomainVerified: boolean;
  providerDomainStatus: string;
  providerVerificationDetails: Record<string, any>;
  dnsRecords: {
    dmarcPresent: boolean;
    dmarcRecord: string | null;
    resendDkimPresent: boolean;
    resendSpfReturnPathPresent: boolean;
    resendSpfRecord: string | null;
    rootSpfPresent: boolean;
    rootSpfRecord: string | null;
  };
  workflows: {
    loginWelcomeBack: {
      senderName: string;
      senderEmail: string;
      subject: string;
      verified: boolean;
    };
    registrationCongratulations: {
      senderName: string;
      senderEmail: string;
      subject: string;
      verified: boolean;
    };
    newsletter: {
      senderName: string;
      senderEmail: string;
      subject: string;
      verified: boolean;
    };
    passwordReset: {
      mechanism: string;
      senderName: string;
      senderEmail: string;
      subject: string;
      verified: boolean;
      adminSdkReady: boolean;
      adminCredentialSource: string;
      adminStatusDetail: string;
      note: string;
    };
  };
  recentAuditSummary: {
    totalLogged: number;
    byType: Record<string, number>;
    recentEntries: Array<Omit<AutomatedEmailLogEntry, 'recipient'> & { maskedRecipient: string }>;
  };
}> {
  const domain = 'everykr.com';
  const creds = getProviderCredentials();
  const accountSender = getWorkflowSenderIdentity('account');
  const newsletterSender = getWorkflowSenderIdentity('newsletter');
  const securitySender = getWorkflowSenderIdentity('security');

  const safeResolveTxt = async (host: string): Promise<string[]> => {
    try {
      const records = await dns.resolveTxt(host);
      return records.map((chunks) => chunks.join(''));
    } catch {
      return [];
    }
  };

  const [dmarcTxts, resendDkimTxts, sendSubdomainTxts, rootTxts] = await Promise.all([
    safeResolveTxt(`_dmarc.${domain}`),
    safeResolveTxt(`resend._domainkey.${domain}`),
    safeResolveTxt(`send.${domain}`),
    safeResolveTxt(domain),
  ]);

  const dmarcRecord = dmarcTxts.find((r) => r.toLowerCase().startsWith('v=dmarc1')) || null;
  const resendDkimPresent = resendDkimTxts.some((r) => r.includes('p='));
  const resendSpfRecord =
    sendSubdomainTxts.find((r) => r.toLowerCase().startsWith('v=spf1')) || null;
  const rootSpfRecord = rootTxts.find((r) => r.toLowerCase().startsWith('v=spf1')) || null;

  let providerConfirmedDomainVerified = false;
  let providerDomainStatus = 'unverified_or_unchecked';
  let providerVerificationDetails: Record<string, any> = {};

  if (creds.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${creds.resendApiKey}`,
        },
      });
      const data: any = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.data)) {
        const matched = data.data.find(
          (d: any) => String(d?.name || '').toLowerCase() === domain
        );
        if (matched) {
          providerDomainStatus = String(matched.status || 'unknown');
          providerConfirmedDomainVerified = matched.status === 'verified';
          providerVerificationDetails = {
            domainId: matched.id,
            name: matched.name,
            status: matched.status,
            region: matched.region,
            capabilities: matched.capabilities,
          };
        } else {
          providerDomainStatus = 'domain_not_registered_in_resend';
          providerVerificationDetails = {
            registeredDomains: data.data.map((d: any) => ({
              name: d?.name,
              status: d?.status,
            })),
          };
        }
      } else {
        providerDomainStatus = `resend_api_http_${res.status}`;
        providerVerificationDetails = {
          note:
            data?.message ||
            'API key may be a Sending-only key without domain-read permission; verify via live send test.',
        };
      }
    } catch (err: any) {
      providerDomainStatus = 'provider_check_network_error';
      providerVerificationDetails = { error: err?.message || 'Network error' };
    }
  } else if (creds.brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/senders', {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'api-key': creds.brevoApiKey,
        },
      });
      const data: any = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.senders)) {
        const activeSenders = data.senders
          .filter((s: any) => s?.active)
          .map((s: any) => String(s.email).toLowerCase());
        providerConfirmedDomainVerified = activeSenders.includes(
          newsletterSender.senderEmail.toLowerCase()
        );
        providerDomainStatus = providerConfirmedDomainVerified ? 'verified' : 'sender_not_verified';
        providerVerificationDetails = { activeSenders };
      }
    } catch (err: any) {
      providerDomainStatus = 'provider_check_network_error';
      providerVerificationDetails = { error: err?.message || 'Network error' };
    }
  }

  const state = loadAutomatedEmailStore();
  // Also check if a live @everykr.com send has already succeeded in our logs (for sending-only Resend API keys)
  const hasVerifiedLiveSend = state.deliveryLogs.some(
    (l) =>
      l.provider === creds.activeProvider &&
      l.deliveryStatus === 'delivered' &&
      l.senderEmail.toLowerCase().endsWith(`@${domain}`)
  );
  const effectiveSenderVerified =
    providerConfirmedDomainVerified ||
    (hasVerifiedLiveSend && resendDkimPresent && Boolean(resendSpfRecord));

  const byType: Record<string, number> = {};
  for (const log of state.deliveryLogs) {
    byType[log.emailType] = (byType[log.emailType] || 0) + 1;
  }

  const maskRecipient = (email: string) => {
    const [local, dom] = String(email || '').split('@');
    if (!local || !dom) return '***';
    return `${local.slice(0, 2)}***@${dom}`;
  };

  return {
    domain,
    activeProvider: creds.activeProvider,
    providerConfigured: creds.activeProvider !== 'unconfigured',
    providerConfirmedDomainVerified: effectiveSenderVerified,
    providerDomainStatus:
      !providerConfirmedDomainVerified && effectiveSenderVerified
        ? `${providerDomainStatus} (confirmed_via_live_send_and_dns)`
        : providerDomainStatus,
    providerVerificationDetails,
    dnsRecords: {
      dmarcPresent: Boolean(dmarcRecord),
      dmarcRecord,
      resendDkimPresent,
      resendSpfReturnPathPresent: Boolean(resendSpfRecord),
      resendSpfRecord,
      rootSpfPresent: Boolean(rootSpfRecord),
      rootSpfRecord,
    },
    workflows: {
      loginWelcomeBack: {
        senderName: accountSender.senderName,
        senderEmail: accountSender.senderEmail,
        subject: 'Welcome Back to EveryKR!',
        verified: effectiveSenderVerified,
      },
      registrationCongratulations: {
        senderName: accountSender.senderName,
        senderEmail: accountSender.senderEmail,
        subject: 'Congratulations! Welcome to EveryKR!',
        verified: effectiveSenderVerified,
      },
      newsletter: {
        senderName: newsletterSender.senderName,
        senderEmail: newsletterSender.senderEmail,
        subject: 'Welcome to the EveryKR Newsletter!',
        verified: effectiveSenderVerified && newsletterSender.senderEmail === 'newsletter@everykr.com',
      },
      passwordReset: await (async () => {
        const { checkFirebaseAdminResetReadiness } = await import(
          './firebaseAdminResetService.ts'
        );
        const adminReadiness = await checkFirebaseAdminResetReadiness();
        return {
          mechanism:
            'Firebase Admin SDK generatePasswordResetLink() -> https://everykr.com/reset-password?oobCode=... + Resend Branded HTML Button',
          senderName: securitySender.senderName,
          senderEmail: securitySender.senderEmail,
          subject: 'Reset Your EveryKR Password',
          verified: effectiveSenderVerified && adminReadiness.ready,
          adminSdkReady: adminReadiness.ready,
          adminCredentialSource: adminReadiness.credentialSource,
          adminStatusDetail: adminReadiness.statusDetail,
          note: 'Generates legitimate Firebase password reset action links server-side, extracts oobCode into https://everykr.com/reset-password?oobCode=..., and delivers a responsive EveryKR HTML email with a single "Reset Password" button.',
        };
      })(),
    },
    recentAuditSummary: {
      totalLogged: state.deliveryLogs.length,
      byType,
      recentEntries: state.deliveryLogs.slice(0, 20).map(({ recipient, ...rest }) => ({
        ...rest,
        maskedRecipient: maskRecipient(recipient),
      })),
    },
  };
}

export function getAutomatedEmailAdminLogs(): AutomatedEmailLogEntry[] {
  return loadAutomatedEmailStore().deliveryLogs;
}

/**
 * Helper for test cleanup only: removes test-only email tracking records by exact test email address
 * without touching any real user or subscriber records.
 */
export function removeTestAutomatedEmailRecords(testEmails: string[]): void {
  const normalizedSet = new Set(testEmails.map((e) => normalizeEmail(e)).filter(Boolean));
  if (normalizedSet.size === 0) return;

  const state = loadAutomatedEmailStore();
  for (const email of normalizedSet) {
    const reg = state.registrationSentByEmail[email];
    if (reg?.uid) {
      delete state.registrationSentByUid[reg.uid];
    }
    delete state.registrationSentByEmail[email];
    delete state.recentLoginByEmail[email];
  }
  state.deliveryLogs = state.deliveryLogs.filter((l) => !normalizedSet.has(l.recipient));
  saveAutomatedEmailStore(state);
}

/**
 * WORKFLOW 5: ADMIN SUPPORT INQUIRY REPLY EMAIL
 * Sends an official EveryKR Support Team reply directly to the visitor's submitted email address
 * with Reply-To: support@everykr.com and full audit logging.
 */
export async function sendSupportContactReplyEmailServer(params: {
  ticketId: string;
  recipientEmail: string;
  recipientName?: string;
  inquiryCategory?: string;
  originalSubject?: string;
  originalMessage?: string;
  replySubject: string;
  replyMessage: string;
  adminName?: string;
  adminEmail?: string;
}): Promise<{
  ok: boolean;
  delivered: boolean;
  deliveryStatus: 'sent' | 'accepted' | 'failed';
  provider: string;
  messageId?: string;
  errorReason?: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  sentAt: string;
}> {
  const recipient = normalizeEmail(params.recipientEmail);
  const replyTo = 'support@everykr.com';
  const rawSupportEmail = (
    process.env.SUPPORT_EMAIL_FROM_ADDRESS ||
    process.env.ACCOUNT_EMAIL_FROM_ADDRESS ||
    'support@everykr.com'
  )
    .trim()
    .toLowerCase();
  const senderEmail =
    rawSupportEmail.endsWith('@everykr.com') &&
    rawSupportEmail !== 'newsletter@everykr.com' &&
    rawSupportEmail !== 'newsletter@newsletter.everykr.com'
      ? rawSupportEmail
      : 'support@everykr.com';
  const senderName = (
    process.env.SUPPORT_EMAIL_FROM_NAME || 'EveryKR Support Team'
  ).trim();

  if (!isValidEmail(recipient)) {
    return {
      ok: false,
      delivered: false,
      deliveryStatus: 'failed',
      provider: 'validation',
      errorReason: 'Invalid recipient email address.',
      senderName,
      senderEmail,
      replyTo,
      sentAt: new Date().toISOString(),
    };
  }

  const cleanVisitorName = resolveRegisteredDisplayName(params.recipientName, recipient);
  const safeVisitorName = escapeHtml(cleanVisitorName);
  const safeTicketId = escapeHtml(params.ticketId || 'EKR-SUP');
  const safeCategory = escapeHtml(params.inquiryCategory || 'Support Inquiry');
  const safeSubject =
    String(params.replySubject || '').trim() ||
    `Re: ${params.originalSubject || 'Your EveryKR Inquiry'} [${params.ticketId || 'EveryKR Support'}]`;
  const safeReplyHtml = escapeHtml(params.replyMessage)
    .replace(/\r\n/g, '\n')
    .split('\n\n')
    .map(
      (para) =>
        `<p style="margin:0 0 14px 0;white-space:pre-line;">${para.trim()}</p>`
    )
    .join('');

  const safeOriginalSnippet = params.originalMessage
    ? `<div style="margin-top:24px;padding:16px 18px;background-color:#F8FAFC;border-left:4px solid #CBD5E1;border-radius:8px;font-size:13px;color:#475569;">
        <div style="font-weight:700;color:#1E293B;margin-bottom:6px;">Your Original Inquiry (${safeTicketId} &bull; ${safeCategory}):</div>
        <div style="white-space:pre-line;">${escapeHtml(String(params.originalMessage).slice(0, 1200))}</div>
      </div>`
    : '';

  const bodyHtml = `<p style="margin:0 0 14px 0;">Hello <strong>${safeVisitorName}</strong>,</p>
<div style="padding:18px 20px;background-color:#F0F7FF;border:1px solid #BFDBFE;border-radius:12px;color:#0F172A;margin-bottom:18px;">
  ${safeReplyHtml}
  <p style="margin:12px 0 0 0;font-size:13px;color:#334155;font-weight:600;">
    &mdash; ${escapeHtml(params.adminName || 'EveryKR Support Desk')} (EveryKR Support Team)
  </p>
</div>
<p style="margin:0;font-size:13px;color:#475569;">
  Need further assistance? Simply reply directly to this email (<a href="mailto:support@everykr.com" style="color:#2563EB;text-decoration:underline;">support@everykr.com</a>) and include your reference ID <strong>${safeTicketId}</strong>.
</p>
${safeOriginalSnippet}`;

  const footerNoteHtml = `<p style="margin:0;color:#475569;">
  <strong>Reference Ticket:</strong> ${safeTicketId} &bull; Category: ${safeCategory} &bull; Official Support Reply-To: <a href="mailto:support@everykr.com" style="color:#2563EB;text-decoration:underline;">support@everykr.com</a>
</p>`;

  const html = renderEveryKrAccountEmailLayout({
    preheader: `Official response from EveryKR Support regarding your inquiry (${params.ticketId}).`,
    badgeText: `EVERYKR SUPPORT DESK • ${params.ticketId || 'INQUIRY REPLY'}`,
    heading: safeSubject,
    bodyHtml,
    ctaText: 'Visit EveryKR Help Center',
    ctaUrl: `${OFFICIAL_EVERYKR_URL}/contact`,
    footerNoteHtml,
    recipientEmail: recipient,
  });

  const text = [
    safeSubject,
    `Ticket Reference: ${params.ticketId || 'EveryKR Support'} (${params.inquiryCategory || 'Support Inquiry'})`,
    ``,
    `Hello ${cleanVisitorName},`,
    ``,
    String(params.replyMessage || '').trim(),
    ``,
    `— ${params.adminName || 'EveryKR Support Desk'} (EveryKR Support Team)`,
    `Reply-To: support@everykr.com`,
    ``,
    ...(params.originalMessage
      ? [
          `--- Your Original Inquiry ---`,
          String(params.originalMessage).trim().slice(0, 1200),
          ``,
        ]
      : []),
    `Visit EveryKR: ${OFFICIAL_EVERYKR_URL}/contact`,
  ].join('\n');

  const dispatchResult = await dispatchTransactionalEmailServer({
    emailType: 'contact_support_reply',
    to: recipient,
    senderName,
    senderEmail,
    replyTo,
    subject: safeSubject,
    html,
    text,
    triggerSource: `admin_contact_reply:${params.adminEmail || 'admin'}`,
  });

  return {
    ok: dispatchResult.delivered,
    delivered: dispatchResult.delivered,
    deliveryStatus: dispatchResult.delivered ? 'sent' : 'failed',
    provider: dispatchResult.provider,
    messageId: dispatchResult.messageId,
    errorReason: dispatchResult.errorReason,
    senderName,
    senderEmail,
    replyTo,
    sentAt: dispatchResult.timestamp,
  };
}

/**
 * Optional non-blocking Admin Alert Email when a new Contact Us inquiry is submitted.
 */
export async function sendSupportAdminAlertEmailServer(params: {
  ticketId: string;
  visitorName: string;
  visitorEmail: string;
  category: string;
  subject: string;
  message: string;
  userLanguage?: string;
  userId?: string | null;
}): Promise<void> {
  const adminTargetEmail = (
    process.env.SUPPORT_ADMIN_ALERT_EMAIL ||
    process.env.EMAIL_REPLY_TO ||
    'support@everykr.com'
  )
    .trim()
    .toLowerCase();

  if (!isValidEmail(adminTargetEmail)) return;
  const creds = getProviderCredentials();
  if (creds.activeProvider === 'unconfigured') return;

  const sender = getWorkflowSenderIdentity('account');
  const alertSubject = `[EveryKR Contact Inbox] New Inquiry (${params.ticketId}): ${params.subject}`;
  const html = renderEveryKrAccountEmailLayout({
    preheader: `New ${params.category} inquiry from ${params.visitorName} (${params.visitorEmail})`,
    badgeText: `NEW CONTACT INQUIRY • ${params.ticketId}`,
    heading: `New Inquiry: ${params.subject}`,
    bodyHtml: `<p style="margin:0 0 12px 0;">A new inquiry was submitted on the EveryKR Contact Us page:</p>
<div style="padding:16px 18px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;font-size:13px;color:#1E293B;margin-bottom:16px;">
  <div><strong>Ticket ID:</strong> ${escapeHtml(params.ticketId)}</div>
  <div><strong>Visitor Name:</strong> ${escapeHtml(params.visitorName)}</div>
  <div><strong>Email:</strong> ${escapeHtml(params.visitorEmail)}</div>
  <div><strong>Category:</strong> ${escapeHtml(params.category)}</div>
  <div><strong>Account Status:</strong> ${params.userId ? `Authenticated User (${escapeHtml(params.userId)})` : 'Guest Visitor'}</div>
  <div><strong>Language:</strong> ${escapeHtml(params.userLanguage || 'en')}</div>
</div>
<div style="padding:16px 18px;background-color:#FFFFFF;border:1px solid #CBD5E1;border-radius:12px;font-size:14px;color:#0F172A;white-space:pre-line;">${escapeHtml(params.message)}</div>`,
    ctaText: 'Open Admin Contact Inbox',
    ctaUrl: `${OFFICIAL_EVERYKR_URL}/admin`,
    footerNoteHtml: `<p style="margin:0;">Reply directly from the EveryKR Admin Contact Inbox or by replying to <a href="mailto:${escapeHtml(params.visitorEmail)}" style="color:#2563EB;">${escapeHtml(params.visitorEmail)}</a>.</p>`,
    recipientEmail: adminTargetEmail,
  });

  const text = [
    alertSubject,
    `Ticket ID: ${params.ticketId}`,
    `From: ${params.visitorName} <${params.visitorEmail}>`,
    `Category: ${params.category}`,
    `Account: ${params.userId ? `User (${params.userId})` : 'Guest'}`,
    ``,
    params.message,
    ``,
    `Manage in Admin Portal: ${OFFICIAL_EVERYKR_URL}/admin`,
  ].join('\n');

  await dispatchTransactionalEmailServer({
    emailType: 'contact_admin_alert',
    to: adminTargetEmail,
    senderName: sender.senderName,
    senderEmail: sender.senderEmail,
    replyTo: normalizeEmail(params.visitorEmail) || 'support@everykr.com',
    subject: alertSubject,
    html,
    text,
    triggerSource: 'contact_form_submission',
  }).catch(() => {});
}

/**
 * Sends an official EveryKR Internal Portal decision email (Approval / Rejection / Additional Info Request)
 * via the existing Resend / verified email infrastructure.
 * - Never sends passwords through email.
 * - Never exposes internal administrative notes when rejecting an applicant.
 */
export async function sendInternalEmployeeDecisionEmailServer(params: {
  employeeName: string;
  employeeEmail: string;
  decision: 'approved' | 'rejected' | 'info_requested';
  assignedDepartment?: string;
  assignedPosition?: string;
  employeeId?: string;
  infoRequestMessage?: string;
  adminEmail?: string;
}): Promise<{
  ok: boolean;
  delivered: boolean;
  provider: string;
  messageId?: string;
  errorReason?: string;
  sentAt: string;
}> {
  const recipient = normalizeEmail(params.employeeEmail);
  const nowIso = new Date().toISOString();
  if (!isValidEmail(recipient)) {
    return {
      ok: false,
      delivered: false,
      provider: 'unconfigured',
      errorReason: 'Invalid recipient email address.',
      sentAt: nowIso
    };
  }

  const sender = getWorkflowSenderIdentity('account');
  const safeName = escapeHtml(params.employeeName || 'Applicant');
  const safeDept = escapeHtml(params.assignedDepartment || 'EveryKR Operations');
  const safePosition = escapeHtml(params.assignedPosition || 'Internal Team Member');
  const safeEmployeeId = params.employeeId ? escapeHtml(params.employeeId) : '';
  const internalPortalUrl = 'https://internal.everykr.com';

  if (params.decision === 'approved') {
    const subject = 'Your EveryKR Internal Account Has Been Approved';
    const bodyHtml = `<p style="margin:0 0 14px 0;">Hello <strong>${safeName}</strong>,</p>
<p style="margin:0 0 16px 0;">Your EveryKR Internal Employee &amp; Administrative Portal registration has been officially reviewed and <strong>approved</strong> by the EveryKR Administrative Governance Team.</p>
<div style="padding:18px 20px;background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;color:#0F172A;margin-bottom:18px;font-size:14px;">
  <div style="margin-bottom:6px;"><strong>Approval Status:</strong> Approved &amp; Active</div>
  <div style="margin-bottom:6px;"><strong>Assigned Department:</strong> ${safeDept}</div>
  <div style="margin-bottom:6px;"><strong>Assigned Position / Role:</strong> ${safePosition}</div>
  ${safeEmployeeId ? `<div style="margin-bottom:6px;"><strong>Employee ID:</strong> ${safeEmployeeId}</div>` : ''}
  <div><strong>Internal Portal URL:</strong> <a href="${internalPortalUrl}" style="color:#15803D;font-weight:700;text-decoration:underline;">${internalPortalUrl}</a></div>
</div>
<p style="margin:0 0 12px 0;font-weight:700;color:#0F172A;">Login Instructions:</p>
<ol style="margin:0 0 16px 0;padding-left:20px;color:#334155;font-size:14px;line-height:1.6;">
  <li>Visit the official EveryKR Internal Portal at <a href="${internalPortalUrl}" style="color:#2563EB;text-decoration:underline;">${internalPortalUrl}</a>.</li>
  <li>Sign in using your registered email address (<strong>${escapeHtml(recipient)}</strong>) and the password you created during registration.</li>
  <li>Your workspace dashboard will automatically display the internal modules authorized for your assigned role.</li>
</ol>
<p style="margin:0;font-size:13px;color:#475569;">
  For security reasons, EveryKR never transmits passwords via email. If you need assistance signing in or resetting your password, please contact EveryKR Internal Support at <a href="mailto:support@everykr.com" style="color:#2563EB;text-decoration:underline;">support@everykr.com</a>.
</p>`;

    const html = renderEveryKrAccountEmailLayout({
      preheader: `Your EveryKR Internal Portal account has been approved (${params.assignedPosition || 'Internal Team'}).`,
      badgeText: 'EVERYKR INTERNAL PORTAL • ACCOUNT APPROVED',
      heading: subject,
      bodyHtml,
      ctaText: 'Sign In to Internal Portal',
      ctaUrl: internalPortalUrl,
      footerNoteHtml: `<p style="margin:0;color:#475569;">Official Internal Portal: <a href="${internalPortalUrl}" style="color:#2563EB;">${internalPortalUrl}</a> &bull; Support: <a href="mailto:support@everykr.com" style="color:#2563EB;">support@everykr.com</a></p>`,
      recipientEmail: recipient
    });

    const text = [
      subject,
      ``,
      `Hello ${params.employeeName || 'Applicant'},`,
      ``,
      `Your EveryKR Internal Employee & Administrative Portal account has been approved.`,
      ``,
      `Approval Confirmation: Approved & Active`,
      `Assigned Department: ${params.assignedDepartment || 'EveryKR Operations'}`,
      `Assigned Position: ${params.assignedPosition || 'Internal Team Member'}`,
      ...(params.employeeId ? [`Employee ID: ${params.employeeId}`] : []),
      `Internal Portal Login Link: ${internalPortalUrl}`,
      ``,
      `Login Instructions:`,
      `1. Visit ${internalPortalUrl}`,
      `2. Sign in with your registered email (${recipient}) and password.`,
      `3. Access your authorized internal modules on the dashboard.`,
      ``,
      `Support Contact: support@everykr.com`
    ].join('\n');

    const dispatchResult = await dispatchTransactionalEmailServer({
      emailType: 'internal_employee_approval',
      to: recipient,
      senderName: sender.senderName,
      senderEmail: sender.senderEmail,
      replyTo: 'support@everykr.com',
      subject,
      html,
      text,
      triggerSource: `internal_approval:${params.adminEmail || 'admin'}`
    });

    return {
      ok: dispatchResult.delivered,
      delivered: dispatchResult.delivered,
      provider: dispatchResult.provider,
      messageId: dispatchResult.messageId,
      errorReason: dispatchResult.errorReason,
      sentAt: dispatchResult.timestamp
    };
  }

  if (params.decision === 'info_requested') {
    const subject = 'Additional Information Requested — EveryKR Internal Portal Application';
    const safeRequestMsg = escapeHtml(
      params.infoRequestMessage ||
        'Please provide additional verification details regarding your department and requested role.'
    );
    const bodyHtml = `<p style="margin:0 0 14px 0;">Hello <strong>${safeName}</strong>,</p>
<p style="margin:0 0 14px 0;">Our administrative team has reviewed your EveryKR Internal Portal registration and requires additional information before completing the verification process:</p>
<div style="padding:16px 18px;background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;color:#92400E;margin-bottom:16px;font-size:14px;white-space:pre-line;">${safeRequestMsg}</div>
<p style="margin:0;font-size:13px;color:#475569;">Please reply to <a href="mailto:support@everykr.com" style="color:#2563EB;text-decoration:underline;">support@everykr.com</a> with the requested details or sign in at <a href="${internalPortalUrl}" style="color:#2563EB;text-decoration:underline;">${internalPortalUrl}</a> to check your application status.</p>`;

    const html = renderEveryKrAccountEmailLayout({
      preheader: 'Additional verification details requested for your EveryKR Internal Portal registration.',
      badgeText: 'EVERYKR INTERNAL PORTAL • VERIFICATION UPDATE',
      heading: subject,
      bodyHtml,
      ctaText: 'View Application Status',
      ctaUrl: internalPortalUrl,
      footerNoteHtml: `<p style="margin:0;color:#475569;">Support Contact: <a href="mailto:support@everykr.com" style="color:#2563EB;">support@everykr.com</a></p>`,
      recipientEmail: recipient
    });

    const text = [
      subject,
      ``,
      `Hello ${params.employeeName || 'Applicant'},`,
      ``,
      `Our administrative team requires additional information regarding your EveryKR Internal Portal registration:`,
      ``,
      params.infoRequestMessage || 'Please contact support@everykr.com with additional verification details.',
      ``,
      `Internal Portal: ${internalPortalUrl}`,
      `Support Contact: support@everykr.com`
    ].join('\n');

    const dispatchResult = await dispatchTransactionalEmailServer({
      emailType: 'internal_employee_rejection',
      to: recipient,
      senderName: sender.senderName,
      senderEmail: sender.senderEmail,
      replyTo: 'support@everykr.com',
      subject,
      html,
      text,
      triggerSource: `internal_info_request:${params.adminEmail || 'admin'}`
    });

    return {
      ok: dispatchResult.delivered,
      delivered: dispatchResult.delivered,
      provider: dispatchResult.provider,
      messageId: dispatchResult.messageId,
      errorReason: dispatchResult.errorReason,
      sentAt: dispatchResult.timestamp
    };
  }

  // Rejected — polite professional notification without exposing internal administrative notes
  const subject = 'Update Regarding Your EveryKR Internal Portal Application';
  const bodyHtml = `<p style="margin:0 0 14px 0;">Hello <strong>${safeName}</strong>,</p>
<p style="margin:0 0 14px 0;">Thank you for submitting an internal registration request for the EveryKR Internal Employee &amp; Administrative Portal.</p>
<p style="margin:0 0 16px 0;">After careful review by our administrative governance team, we are unable to approve internal portal access for this account at this time.</p>
<p style="margin:0;font-size:13px;color:#475569;">If you believe this decision was made in error or if you were instructed by your department lead to register, please contact EveryKR Support at <a href="mailto:support@everykr.com" style="color:#2563EB;text-decoration:underline;">support@everykr.com</a>.</p>`;

  const html = renderEveryKrAccountEmailLayout({
    preheader: 'Status update regarding your EveryKR Internal Portal registration request.',
    badgeText: 'EVERYKR INTERNAL PORTAL • APPLICATION STATUS',
    heading: subject,
    bodyHtml,
    ctaText: 'Contact EveryKR Support',
    ctaUrl: 'mailto:support@everykr.com',
    footerNoteHtml: `<p style="margin:0;color:#475569;">EveryKR Internal Governance &bull; Support: <a href="mailto:support@everykr.com" style="color:#2563EB;">support@everykr.com</a></p>`,
    recipientEmail: recipient
  });

  const text = [
    subject,
    ``,
    `Hello ${params.employeeName || 'Applicant'},`,
    ``,
    `Thank you for submitting an internal registration request for the EveryKR Internal Portal.`,
    `After review by our administrative governance team, we are unable to approve internal portal access for this account at this time.`,
    ``,
    `If you have questions, please contact EveryKR Support at support@everykr.com.`
  ].join('\n');

  const dispatchResult = await dispatchTransactionalEmailServer({
    emailType: 'internal_employee_rejection',
    to: recipient,
    senderName: sender.senderName,
    senderEmail: sender.senderEmail,
    replyTo: 'support@everykr.com',
    subject,
    html,
    text,
    triggerSource: `internal_rejection:${params.adminEmail || 'admin'}`
  });

  return {
    ok: dispatchResult.delivered,
    delivered: dispatchResult.delivered,
    provider: dispatchResult.provider,
    messageId: dispatchResult.messageId,
    errorReason: dispatchResult.errorReason,
    sentAt: dispatchResult.timestamp
  };
}

/**
 * Sends a student notification email whenever an EVERYKR Smart Application status changes
 * (submitted, under_review, documents_missing, sent_to_university, interview, admitted, rejected, visa_processing, completed).
 * Uses the existing Resend / SMTP dispatcher configured in newsletterService.ts.
 * TODO (Deployment Config): Ensure RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS env vars are configured in production.
 */
export async function sendApplicationStatusChangeEmailServer(params: {
  studentName: string;
  studentEmail: string;
  universityName: string;
  intake: string;
  degreeLevel: string;
  applicationId: string;
  fromStatus?: string | null;
  toStatus: string;
  eventType?:
    | 'status_change'
    | 'assigned'
    | 'documents_accepted'
    | 'direct_message'
    | 'replacement_uploaded';
  message?: string;
  requestedDocuments?: string[];
  requestedDeadline?: string;
  actorEmail?: string;
}): Promise<{
  ok: boolean;
  delivered: boolean;
  provider: string;
  messageId?: string;
  errorReason?: string;
  sentAt: string;
}> {
  const recipient = normalizeEmail(params.studentEmail);
  const nowIso = new Date().toISOString();
  if (!isValidEmail(recipient)) {
    return {
      ok: false,
      delivered: false,
      provider: 'unconfigured',
      errorReason: 'Invalid student recipient email address.',
      sentAt: nowIso,
    };
  }

  const statusLabels: Record<string, string> = {
    draft: 'Draft Saved',
    submitted: 'Application Submitted',
    under_review: 'Under Review',
    documents_missing: 'Documents Requested',
    sent_to_university: 'Sent to University',
    interview: 'Interview Scheduled / Stage',
    admitted: 'Admitted — Congratulations!',
    rejected: 'Admission Decision Update',
    visa_processing: 'Visa Processing',
    completed: 'Enrollment Completed',
    withdrawn: 'Application Withdrawn',
  };

  const humanStatus = statusLabels[params.toStatus] || params.toStatus;
  const headingTitle =
    params.eventType === 'assigned'
      ? 'Admissions Counsellor Assigned'
      : params.eventType === 'documents_accepted'
      ? 'Documents Accepted'
      : params.eventType === 'direct_message'
      ? 'Message from Admissions Team'
      : params.eventType === 'replacement_uploaded'
      ? 'Updated Documents Received'
      : humanStatus;

  const sender = getWorkflowSenderIdentity('account');
  const safeName = escapeHtml(params.studentName || 'Applicant');
  const safeUni = escapeHtml(params.universityName || 'University');
  const safeIntake = escapeHtml(params.intake || '');
  const safeDegree = escapeHtml(params.degreeLevel || '');
  const safeStatus = escapeHtml(humanStatus);
  const safeMsg = params.message ? escapeHtml(params.message) : '';
  const safeDeadline = params.requestedDeadline ? escapeHtml(params.requestedDeadline) : '';
  const myAppsUrl = `${OFFICIAL_EVERYKR_URL}/my-applications`;

  const reqDocsHtml =
    Array.isArray(params.requestedDocuments) && params.requestedDocuments.length > 0
      ? `<div style="padding:14px 16px;background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;color:#92400E;margin:14px 0;font-size:14px;">
          <div style="font-weight:700;margin-bottom:6px;">Requested Documents:</div>
          <ul style="margin:0;padding-left:18px;">
            ${params.requestedDocuments.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}
          </ul>
          ${safeDeadline ? `<div style="margin-top:8px;font-weight:700;">Submission Deadline: ${safeDeadline}</div>` : ''}
        </div>`
      : '';

  const subject = `[EVERYKR] ${headingTitle} — ${params.universityName}`;
  const bodyHtml = `<p style="margin:0 0 14px 0;">Hello <strong>${safeName}</strong>,</p>
<p style="margin:0 0 16px 0;">There is an update regarding your university application on EVERYKR:</p>
<div style="padding:16px 18px;background-color:#F4F8FD;border:1px solid #BFDBFE;border-radius:12px;color:#081426;margin-bottom:16px;font-size:14px;">
  <div style="margin-bottom:6px;"><strong>University:</strong> ${safeUni}</div>
  ${safeIntake ? `<div style="margin-bottom:6px;"><strong>Intake:</strong> ${safeIntake}</div>` : ''}
  ${safeDegree ? `<div style="margin-bottom:6px;"><strong>Degree Level:</strong> ${safeDegree}</div>` : ''}
  <div><strong>Current Status:</strong> <span style="color:#2563EB;font-weight:700;">${safeStatus}</span></div>
</div>
${reqDocsHtml}
${
  safeMsg
    ? `<div style="padding:14px 16px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;color:#1E293B;margin-bottom:16px;font-size:14px;white-space:pre-line;"><strong>Note from Admissions Team:</strong><br/>${safeMsg}</div>`
    : ''
}
<p style="margin:0;font-size:13px;color:#475569;">Sign in to your EVERYKR account to track your timeline or upload any requested documents.</p>`;

  const html = renderEveryKrAccountEmailLayout({
    preheader: `${params.universityName} — ${headingTitle}.`,
    badgeText: 'EVERYKR ADMISSIONS • APPLICATION UPDATE',
    heading: `${escapeHtml(headingTitle)}`,
    bodyHtml,
    ctaText: 'View My Applications',
    ctaUrl: myAppsUrl,
    footerNoteHtml: `<p style="margin:0;color:#475569;">Application ID: ${escapeHtml(params.applicationId)} &bull; Support: <a href="mailto:support@everykr.com" style="color:#2563EB;">support@everykr.com</a></p>`,
    recipientEmail: recipient,
  });

  const text = [
    subject,
    '',
    `Hello ${params.studentName || 'Applicant'},`,
    '',
    `Your application for ${params.universityName} (${params.intake} ${params.degreeLevel}) — ${headingTitle} (Status: ${humanStatus}).`,
    ...(params.requestedDocuments && params.requestedDocuments.length > 0
      ? ['', `Requested documents: ${params.requestedDocuments.join(', ')}`]
      : []),
    ...(params.requestedDeadline ? [`Deadline: ${params.requestedDeadline}`] : []),
    ...(params.message ? ['', `Message from admissions team:`, params.message] : []),
    '',
    `Track your application: ${myAppsUrl}`,
  ].join('\n');

  const dispatchResult = await dispatchTransactionalEmailServer({
    emailType: 'application_status_update',
    to: recipient,
    senderName: sender.senderName,
    senderEmail: sender.senderEmail,
    replyTo: 'support@everykr.com',
    subject,
    html,
    text,
    triggerSource: `smart_application_status:${params.toStatus}:${params.actorEmail || 'system'}`,
  });

  return {
    ok: dispatchResult.delivered,
    delivered: dispatchResult.delivered,
    provider: dispatchResult.provider,
    messageId: dispatchResult.messageId,
    errorReason: dispatchResult.errorReason,
    sentAt: dispatchResult.timestamp,
  };
}



