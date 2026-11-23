import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { deleteApp } from 'firebase-admin/app';
import {
  buildCustomEveryKrPasswordResetUrl,
  buildFirebasePasswordResetEmailTemplate,
  CANONICAL_LOGIN_CONTINUE_URL,
  clearFirebasePasswordResetRateLimitsForTesting,
  CUSTOM_WEBSITE_RESET_PASSWORD_URL,
  extractOobCodeFromFirebaseActionLink,
  getOrInitFirebaseAdminApp,
  handleFirebasePasswordResetRequestServer,
  isFirebaseAdminIamOrCredentialError,
  NEUTRAL_FIREBASE_RESET_SUCCESS_MESSAGE,
  PASSWORD_RESET_EMAIL_SUBJECT,
  registerResetOobCodeEmailMappingServer,
  resolveCustomWebsiteResetLinkFromFirebaseLink,
  resolveRegisteredEmailForResetOobCodeServer,
  sanitizePasswordResetContinueUrl,
} from '../src/server/firebaseAdminResetService.ts';
import { removeTestAutomatedEmailRecords } from '../src/server/automatedEmailService.ts';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import {
  auth,
  buildCanonicalEveryKrUrl,
  ensureFirebaseAuthInitialized,
  firebaseConfig,
  isNonCanonicalProductionHostname,
  OFFICIAL_EVERYKR_LOGIN_URL,
  OFFICIAL_EVERYKR_ORIGIN,
  OFFICIAL_EVERYKR_REGISTER_URL,
  OFFICIAL_EVERYKR_SETTINGS_URL,
  OFFICIAL_PASSWORD_RESET_ACTION_URL,
  resolveEveryKrLoginContinueUrl,
} from '../src/lib/firebase.ts';
import {
  captureInitialResetLinkFromSearch,
  clearConsumedResetCodesForTesting,
  confirmPasswordResetClient,
  isWellFormedOobCode,
  MinimalSessionStorage,
  verifyPasswordResetTokenClient,
} from '../src/services/passwordResetClient.ts';

const SAMPLE_OOB_CODE =
  '4_SampleOneTimeResetCode_9876543210abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const SAMPLE_FIREBASE_HOSTED_ACTION_URL = `https://everykr.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=${SAMPLE_OOB_CODE}&apiKey=AIzaSyAgJyMMBxCO6GZgSsh7a6xMolDs7JzTscQ&continueUrl=https%3A%2F%2Feverykr.com%2Flogin&lang=en`;

const EXPECTED_CUSTOM_WEBSITE_RESET_URL = `https://everykr.com/reset-password?oobCode=${SAMPLE_OOB_CODE}`;

const SAMPLE_SPECIAL_CHAR_OOB_CODE = '4_CodeWith+Plus/Slash=Equals-9876543210abcdef';

function extractVisibleTextFromEmailHtml(html: string): string {
  return html
    .replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<\/?(strong|b|em|i|span)[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&copy;/gi, '©')
    .replace(/&rsquo;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&bull;/gi, '•')
    .replace(/&nbsp;|&#847;|&zwnj;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

async function runTests(): Promise<void> {
  let passed = 0;
  const pass = (label: string) => {
    passed += 1;
    console.log(`PASS [${passed}]: ${label}`);
  };

  // 1. Firebase Admin SDK initialization across ADC, JSON service account, base64 JSON, and env fields
  {
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    const ephemeralSaObj = {
      type: 'service_account',
      project_id: 'everykr',
      client_email: 'ephemeral-audit-test@everykr.iam.gserviceaccount.com',
      private_key: privateKey,
    };

    const adcInit = getOrInitFirebaseAdminApp({});
    assert.equal(adcInit.credentialSource, 'application_default_credentials');
    assert.equal(adcInit.app.options.projectId, 'everykr');
    await deleteApp(adcInit.app);

    const jsonInit = getOrInitFirebaseAdminApp({
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(ephemeralSaObj),
    });
    assert.equal(jsonInit.credentialSource, 'service_account_json');
    assert.equal(jsonInit.app.options.projectId, 'everykr');
    await deleteApp(jsonInit.app);

    const b64Init = getOrInitFirebaseAdminApp({
      FIREBASE_SERVICE_ACCOUNT_JSON: Buffer.from(JSON.stringify(ephemeralSaObj), 'utf-8').toString(
        'base64'
      ),
    });
    assert.equal(b64Init.credentialSource, 'service_account_json');
    await deleteApp(b64Init.app);

    const fieldsInit = getOrInitFirebaseAdminApp({
      FIREBASE_CLIENT_EMAIL: ephemeralSaObj.client_email,
      FIREBASE_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'),
    });
    assert.equal(fieldsInit.credentialSource, 'service_account_env_fields');
    assert.equal(fieldsInit.app.options.projectId, 'everykr');
    await deleteApp(fieldsInit.app);

    assert.equal(
      isFirebaseAdminIamOrCredentialError({
        code: 'auth/internal-error',
        message:
          '//console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=258747967575 then retry.',
      }),
      true
    );
    assert.equal(
      isFirebaseAdminIamOrCredentialError({
        code: 'auth/insufficient-permission',
        message: 'Caller does not have required permission to use project everykr.',
      }),
      true
    );

    pass(
      'Firebase Admin SDK initializes deterministically across ADC, raw/base64 JSON service account, and env fields for project everykr'
    );
  }

  // 2. Secure oobCode extraction & custom https://everykr.com/reset-password?oobCode=... link construction
  {
    assert.equal(CUSTOM_WEBSITE_RESET_PASSWORD_URL, 'https://everykr.com/reset-password');

    const extracted = extractOobCodeFromFirebaseActionLink(SAMPLE_FIREBASE_HOSTED_ACTION_URL);
    assert.equal(extracted, SAMPLE_OOB_CODE);

    const builtCustomUrl = buildCustomEveryKrPasswordResetUrl(extracted);
    assert.equal(builtCustomUrl, EXPECTED_CUSTOM_WEBSITE_RESET_URL);
    assert.equal(builtCustomUrl.includes('everykr.firebaseapp.com'), false);
    assert.equal(builtCustomUrl.includes('/__/auth/action'), false);

    // Special characters in oobCode survive round-trip URL encoding/decoding intact
    const firebaseSpecialUrl = `https://everykr.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(
      SAMPLE_SPECIAL_CHAR_OOB_CODE
    )}&apiKey=testKey`;
    const resolvedSpecial = resolveCustomWebsiteResetLinkFromFirebaseLink(firebaseSpecialUrl);
    const parsedSpecial = new URL(resolvedSpecial);
    assert.equal(parsedSpecial.origin, 'https://everykr.com');
    assert.equal(parsedSpecial.pathname, '/reset-password');
    assert.equal(parsedSpecial.searchParams.get('oobCode'), SAMPLE_SPECIAL_CHAR_OOB_CODE);
    assert.equal(parsedSpecial.searchParams.get('apiKey'), null, 'Must not leak apiKey in email link');

    // Already-rewritten custom URL is idempotent
    assert.equal(
      resolveCustomWebsiteResetLinkFromFirebaseLink(EXPECTED_CUSTOM_WEBSITE_RESET_URL),
      EXPECTED_CUSTOM_WEBSITE_RESET_URL
    );

    // Reject missing oobCode, wrong mode, HTTP non-local, and malformed URLs without leaking tokens in error text
    assert.throws(
      () => extractOobCodeFromFirebaseActionLink('https://everykr.firebaseapp.com/__/auth/action?mode=resetPassword'),
      (err: any) => err?.code === 'auth/missing-oob-code'
    );
    assert.throws(
      () =>
        extractOobCodeFromFirebaseActionLink(
          `https://everykr.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=${SAMPLE_OOB_CODE}`
        ),
      (err: any) =>
        err?.code === 'auth/invalid-reset-mode' && !String(err?.message).includes(SAMPLE_OOB_CODE)
    );
    assert.throws(
      () =>
        extractOobCodeFromFirebaseActionLink(
          `http://everykr.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=${SAMPLE_OOB_CODE}`
        ),
      (err: any) =>
        err?.code === 'auth/invalid-reset-link' && !String(err?.message).includes(SAMPLE_OOB_CODE)
    );

    pass(
      'extractOobCodeFromFirebaseActionLink & buildCustomEveryKrPasswordResetUrl produce https://everykr.com/reset-password?oobCode=... and never expose oobCode in errors'
    );
  }

  // 3. Branded HTML email structure: custom https://everykr.com/reset-password?oobCode=... button href, intact design, ZERO Firebase hosted form URLs, ZERO visible raw URLs
  {
    // Pass raw Firebase-hosted link into template builder -> must automatically rewrite href to https://everykr.com/reset-password?oobCode=...
    const tpl = buildFirebasePasswordResetEmailTemplate({
      resetActionLink: SAMPLE_FIREBASE_HOSTED_ACTION_URL,
      displayName: 'Minjun Rahman',
    });

    assert.equal(tpl.subject, PASSWORD_RESET_EMAIL_SUBJECT);
    assert.ok(
      tpl.html.includes('https://everykr.com/everykr-logo.png'),
      'Expected official EveryKR logo in HTML header'
    );
    assert.ok(tpl.html.includes('Every<span style="color:#60A5FA;">KR</span>'));

    const visibleText = extractVisibleTextFromEmailHtml(tpl.html);
    assert.ok(visibleText.includes('Reset Your Password'), 'Expected heading "Reset Your Password"');
    assert.ok(visibleText.includes('Hello Minjun,'), 'Expected personalized first-name greeting');
    assert.ok(visibleText.includes('Reset Password'), 'Expected CTA label "Reset Password"');
    assert.ok(visibleText.includes('expires in 1 hour'), 'Expected 1-hour expiration notice');
    assert.ok(visibleText.includes('Security Notice:'), 'Expected security notice');
    assert.ok(visibleText.includes('© 2026 EveryKR'), 'Expected "© 2026 EveryKR" footer');

    // CRITICAL: Button href in BOTH standard HTML <a> and Outlook VML <v:roundrect> must be https://everykr.com/reset-password?oobCode=...
    assert.ok(
      tpl.html.includes(`href="${EXPECTED_CUSTOM_WEBSITE_RESET_URL}"`),
      'Expected exact https://everykr.com/reset-password?oobCode=... in button href'
    );
    assert.ok(
      /<a\s+[^>]*href="https:\/\/everykr\.com\/reset-password\?oobCode=[^"]+"[^>]*>\s*Reset Password\s*<\/a>/i.test(
        tpl.html
      ),
      'Expected anchor CTA button labeled "Reset Password" pointing to https://everykr.com/reset-password?oobCode=...'
    );
    assert.ok(
      /<v:roundrect\s+[^>]*href="https:\/\/everykr\.com\/reset-password\?oobCode=[^"]+"/i.test(
        tpl.html
      ),
      'Expected Outlook VML button pointing to https://everykr.com/reset-password?oobCode=...'
    );

    // CRITICAL: Must NEVER contain everykr.firebaseapp.com or /__/auth/action anywhere in HTML or text!
    assert.equal(
      tpl.html.includes('everykr.firebaseapp.com'),
      false,
      'Email HTML must NEVER point to everykr.firebaseapp.com'
    );
    assert.equal(
      tpl.html.includes('/__/auth/action'),
      false,
      'Email HTML must NEVER point to /__/auth/action'
    );

    // STRICT CHECK: Zero visible raw URLs in rendered HTML text or plain-text fallback
    assert.equal(visibleText.includes('oobCode'), false, 'oobCode must NEVER appear in visible HTML text');
    assert.equal(visibleText.includes('reset-password'), false, 'URL path must NEVER appear in visible HTML text');
    assert.equal(visibleText.includes('https://'), false, 'Raw https:// URL must NEVER appear in visible HTML text');
    assert.equal(tpl.text.includes('oobCode'), false, 'oobCode must NEVER appear in plain-text fallback');
    assert.equal(tpl.text.includes('everykr.firebaseapp.com'), false);

    // Cross-client compatibility checks (Gmail, Outlook Desktop VML, Apple Mail)
    assert.ok(tpl.html.includes('xmlns:v="urn:schemas-microsoft-com:vml"'), 'Outlook VML namespace');
    assert.ok(tpl.html.includes('<v:roundrect'), 'Outlook VML rounded button');
    assert.ok(tpl.html.includes('bgcolor="#0B1930"'), 'Outlook solid header background fallback');
    assert.ok(tpl.html.includes('bgcolor="#2563EB"'), 'Blue button background color');
    assert.ok(tpl.html.includes('x-apple-disable-message-reformatting'), 'Apple Mail scaling guard');
    assert.ok(tpl.html.includes('@media only screen and (max-width: 620px)'), 'Mobile media queries');

    pass(
      'Branded EveryKR HTML email links "Reset Password" CTA directly to https://everykr.com/reset-password?oobCode=... with ZERO firebaseapp.com links and ZERO visible raw URLs'
    );
  }

  // 4. Greeting sanitization & Continue URL open-redirect allowlist
  {
    const tplWithEmailAsName = buildFirebasePasswordResetEmailTemplate({
      resetActionLink: SAMPLE_FIREBASE_HOSTED_ACTION_URL,
      displayName: 'student@everykr.com',
    });
    const visibleEmailTest = extractVisibleTextFromEmailHtml(tplWithEmailAsName.html);
    assert.ok(visibleEmailTest.includes('Hello,'));
    assert.equal(visibleEmailTest.includes('student@everykr.com'), false);

    const tplWithUidAsName = buildFirebasePasswordResetEmailTemplate({
      resetActionLink: SAMPLE_FIREBASE_HOSTED_ACTION_URL,
      displayName: 'uid_9918273645',
    });
    const visibleUidTest = extractVisibleTextFromEmailHtml(tplWithUidAsName.html);
    assert.ok(visibleUidTest.includes('Hello,'));
    assert.equal(visibleUidTest.includes('uid_9918273645'), false);

    assert.equal(
      sanitizePasswordResetContinueUrl('https://evil-phishing.example.org/login'),
      CANONICAL_LOGIN_CONTINUE_URL
    );
    assert.equal(
      sanitizePasswordResetContinueUrl('javascript:alert(1)'),
      CANONICAL_LOGIN_CONTINUE_URL
    );
    assert.equal(
      sanitizePasswordResetContinueUrl('https://everykr.com/dashboard?foo=bar'),
      'https://everykr.com/login'
    );
    assert.equal(
      sanitizePasswordResetContinueUrl('http://localhost:3000/reset-password'),
      'https://everykr.com/login'
    );
    assert.equal(
      sanitizePasswordResetContinueUrl(
        'https://everykr-everything-korea-one-platform-926172198407.asia-east1.run.app/login'
      ),
      'https://everykr.com/login'
    );
    assert.equal(
      sanitizePasswordResetContinueUrl('https://everykr.firebaseapp.com/login'),
      'https://everykr.com/login'
    );

    pass(
      'Greeting sanitizer and continueUrl sanitizer strictly enforce https://everykr.com/login and reject Cloud Run / Firebase domains'
    );
  }

  // 5. Input validation & honeypot checks
  {
    clearFirebasePasswordResetRateLimitsForTesting();

    const hp = await handleFirebasePasswordResetRequestServer({
      email: 'student@yonsei.ac.kr',
      clientIp: '198.51.100.10',
      honeypot: 'bot-filled',
      testOverrides: { skipLatencyFloor: true },
    });
    assert.equal(hp.httpStatus, 400);
    assert.equal(hp.body.code, 'auth/spam-blocked');

    const empty = await handleFirebasePasswordResetRequestServer({
      email: '   ',
      clientIp: '198.51.100.10',
      testOverrides: { skipLatencyFloor: true },
    });
    assert.equal(empty.httpStatus, 400);
    assert.equal(empty.body.code, 'auth/missing-email');

    const bad = await handleFirebasePasswordResetRequestServer({
      email: 'not-an-email',
      clientIp: '198.51.100.10',
      testOverrides: { skipLatencyFloor: true },
    });
    assert.equal(bad.httpStatus, 400);
    assert.equal(bad.body.code, 'auth/invalid-email');

    pass('Honeypot, missing email, and malformed email requests are cleanly rejected with HTTP 400');
  }

  // 6. End-to-End Server Pipeline: Registered vs. Unregistered vs. Disabled (Custom Website Link Rewriting + Resend Sender/ReplyTo + Anti-Enumeration)
  {
    clearFirebasePasswordResetRateLimitsForTesting();
    const capturedDispatches: Array<
      Parameters<
        typeof import('../src/server/automatedEmailService.ts').dispatchTransactionalEmailServer
      >[0]
    > = [];

    const mockResolver = async ({ email, continueUrl }: { email: string; continueUrl: string }) => {
      assert.equal(continueUrl, 'https://everykr.com/login');
      if (email === 'registered.student@snu.ac.kr') {
        return {
          status: 'generated' as const,
          // Simulate raw link returned by adminAuth.generatePasswordResetLink()
          resetActionLink: SAMPLE_FIREBASE_HOSTED_ACTION_URL,
          displayName: 'Jisoo Kim',
        };
      }
      if (email === 'disabled.student@snu.ac.kr') {
        return { status: 'disabled' as const };
      }
      return { status: 'not_found' as const };
    };

    const mockDispatcher = async (payload: any) => {
      capturedDispatches.push(payload);
      return {
        delivered: true,
        provider: 'resend' as const,
        messageId: 're_test_pwreset_001',
        status: 'delivered' as const,
        timestamp: new Date().toISOString(),
      };
    };

    const regRes = await handleFirebasePasswordResetRequestServer({
      email: 'registered.student@snu.ac.kr',
      clientIp: '198.51.100.21',
      continueUrl: 'https://phishing.invalid/steal',
      testOverrides: {
        resolveAccountAndGenerateLink: mockResolver,
        dispatchEmail: mockDispatcher,
        skipLatencyFloor: true,
      },
    });
    assert.equal(regRes.httpStatus, 200);
    assert.equal(regRes.body.ok, true);
    assert.equal(regRes.body.message, NEUTRAL_FIREBASE_RESET_SUCCESS_MESSAGE);
    assert.equal(JSON.stringify(regRes.body).includes('oobCode'), false);
    assert.equal(capturedDispatches.length, 1);
    assert.equal(capturedDispatches[0].senderEmail, 'security@everykr.com');
    assert.equal(capturedDispatches[0].senderName, 'EveryKR Account Security');
    assert.equal(capturedDispatches[0].replyTo, 'support@everykr.com');
    assert.equal(capturedDispatches[0].subject, 'Reset Your EveryKR Password');
    assert.equal(capturedDispatches[0].to, 'registered.student@snu.ac.kr');
    assert.ok(
      capturedDispatches[0].html.includes(`href="${EXPECTED_CUSTOM_WEBSITE_RESET_URL}"`),
      'Dispatched Resend HTML email must contain custom https://everykr.com/reset-password?oobCode=... link'
    );
    assert.equal(
      capturedDispatches[0].html.includes('everykr.firebaseapp.com'),
      false,
      'Dispatched Resend HTML email must NEVER contain everykr.firebaseapp.com'
    );

    const unregRes = await handleFirebasePasswordResetRequestServer({
      email: 'unknown.visitor@snu.ac.kr',
      clientIp: '198.51.100.22',
      testOverrides: {
        resolveAccountAndGenerateLink: mockResolver,
        dispatchEmail: mockDispatcher,
        skipLatencyFloor: true,
      },
    });
    assert.equal(unregRes.httpStatus, 200);
    assert.equal(unregRes.body.ok, true);
    assert.equal(unregRes.body.code, regRes.body.code);
    assert.equal(unregRes.body.message, regRes.body.message);
    assert.equal(unregRes.body.cooldownSeconds, regRes.body.cooldownSeconds);
    assert.equal(capturedDispatches.length, 1, 'Unregistered account must NOT trigger email send');

    const disRes = await handleFirebasePasswordResetRequestServer({
      email: 'disabled.student@snu.ac.kr',
      clientIp: '198.51.100.23',
      testOverrides: {
        resolveAccountAndGenerateLink: mockResolver,
        dispatchEmail: mockDispatcher,
        skipLatencyFloor: true,
      },
    });
    assert.equal(disRes.httpStatus, 200);
    assert.equal(disRes.body.message, regRes.body.message);
    assert.equal(capturedDispatches.length, 1, 'Disabled account must NOT trigger email send');

    const repeatReg = await handleFirebasePasswordResetRequestServer({
      email: 'registered.student@snu.ac.kr',
      clientIp: '198.51.100.21',
      testOverrides: {
        resolveAccountAndGenerateLink: mockResolver,
        dispatchEmail: mockDispatcher,
        skipLatencyFloor: true,
      },
    });
    const repeatUnreg = await handleFirebasePasswordResetRequestServer({
      email: 'unknown.visitor@snu.ac.kr',
      clientIp: '198.51.100.22',
      testOverrides: {
        resolveAccountAndGenerateLink: mockResolver,
        dispatchEmail: mockDispatcher,
        skipLatencyFloor: true,
      },
    });
    assert.equal(repeatReg.httpStatus, 429);
    assert.equal(repeatUnreg.httpStatus, 429);
    assert.equal(repeatReg.body.code, repeatUnreg.body.code);

    pass(
      'Server pipeline rewrites Firebase link to https://everykr.com/reset-password?oobCode=..., preserves security@everykr.com + replyTo support@everykr.com, and enforces anti-enumeration'
    );
  }

  // 7. Provider failure & Admin IAM failure honesty + cooldown release
  {
    clearFirebasePasswordResetRateLimitsForTesting();
    const failRes = await handleFirebasePasswordResetRequestServer({
      email: 'retry.student@kaist.ac.kr',
      clientIp: '198.51.100.30',
      testOverrides: {
        resolveAccountAndGenerateLink: async () => ({
          status: 'generated' as const,
          resetActionLink: SAMPLE_FIREBASE_HOSTED_ACTION_URL,
          displayName: 'Hana Lee',
        }),
        dispatchEmail: async () => ({
          delivered: false,
          provider: 'resend' as const,
          status: 'failed' as const,
          errorReason: 'Simulated upstream error',
          timestamp: new Date().toISOString(),
        }),
        skipLatencyFloor: true,
      },
    });
    assert.equal(failRes.httpStatus, 502);
    assert.equal(failRes.body.ok, false);

    const retryRes = await handleFirebasePasswordResetRequestServer({
      email: 'retry.student@kaist.ac.kr',
      clientIp: '198.51.100.30',
      testOverrides: {
        resolveAccountAndGenerateLink: async () => ({
          status: 'generated' as const,
          resetActionLink: SAMPLE_FIREBASE_HOSTED_ACTION_URL,
          displayName: 'Hana Lee',
        }),
        dispatchEmail: async () => ({
          delivered: true,
          provider: 'resend' as const,
          messageId: 're_recovered_002',
          status: 'delivered' as const,
          timestamp: new Date().toISOString(),
        }),
        skipLatencyFloor: true,
      },
    });
    assert.equal(retryRes.httpStatus, 200);
    assert.equal(retryRes.body.ok, true);

    const iamFailRes = await handleFirebasePasswordResetRequestServer({
      email: 'iamcheck.student@kaist.ac.kr',
      clientIp: '198.51.100.31',
      testOverrides: {
        resolveAccountAndGenerateLink: async () => {
          const e: any = new Error(
            '//console.developers.google.com/iam-admin/iam?project=everykr PERMISSION_DENIED'
          );
          e.code = 'auth/insufficient-permission';
          throw e;
        },
        skipLatencyFloor: true,
      },
    });
    assert.equal(iamFailRes.httpStatus, 503);
    assert.equal(iamFailRes.body.ok, false);
    assert.equal(iamFailRes.body.code, 'auth/admin-configuration-required');

    removeTestAutomatedEmailRecords(['iamcheck.student@kaist.ac.kr']);

    pass(
      'Delivery & IAM failures return honest 502/503 errors (never fake success), release cooldown for retry, and never leak credentials'
    );
  }

  // 8. Custom /reset-password Frontend Page, 9-Language Localization, Validation, & Live Firebase Auth SDK Verification
  {
    const fbServiceSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/services/firebaseService.ts'),
      'utf-8'
    );
    const pwResetClientSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/services/passwordResetClient.ts'),
      'utf-8'
    );
    const resetViewSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ResetPasswordView.tsx'),
      'utf-8'
    );
    const appSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

    // Confirm Firebase Auth SDK methods remain authoritative (no Firestore password writes)
    assert.ok(
      pwResetClientSrc.includes('verifyPasswordResetCode(auth, code)'),
      'Frontend must verify oobCode via Firebase Auth verifyPasswordResetCode()'
    );
    assert.ok(
      pwResetClientSrc.includes('confirmPasswordReset(auth, code, pw)'),
      'Frontend must update password via Firebase Auth confirmPasswordReset()'
    );
    assert.ok(
      fbServiceSrc.includes('signInWithEmailAndPassword(auth, normalizedEmail, rawPassword)'),
      'Login with new password via Firebase Auth signInWithEmailAndPassword() must remain intact'
    );
    assert.equal(
      resetViewSrc.includes('setDoc(') || resetViewSrc.includes('updateDoc('),
      false,
      'ResetPasswordView must NEVER write passwords to Firestore'
    );
    assert.equal(
      /import\s+\{[^}]*\buseSearchParams\b/.test(resetViewSrc) ||
        /=\s*useSearchParams\s*\(/.test(resetViewSrc),
      false,
      'ResetPasswordView must NOT import or call useSearchParams() (prevents stale query re-injection loop after history.replaceState)'
    );

    // Confirm all required UI elements & security controls on /reset-password
    assert.ok(resetViewSrc.includes('OFFICIAL_EVERYKR_LOGO'), 'Must display EveryKR logo');
    assert.ok(resetViewSrc.includes('id="everykr-reset-new-password"'), 'Must render New Password input');
    assert.ok(resetViewSrc.includes('id="everykr-reset-confirm-password"'), 'Must render Confirm Password input');
    assert.ok(resetViewSrc.includes('id="everykr-retry-reset-verification"'), 'Must render Retry Verification button');
    assert.ok(
      resetViewSrc.includes('showNewPassword') && resetViewSrc.includes('showConfirmPassword'),
      'Must provide independent show/hide password controls on both password fields'
    );
    assert.ok(
      resetViewSrc.includes("resetPasswordButton: 'Reset Password'"),
      'Must render clear "Reset Password" CTA button'
    );
    assert.ok(
      resetViewSrc.includes("window.history.replaceState(window.history.state, document.title, '/reset-password')"),
      'Must scrub oobCode from URL bar only after initial capture'
    );
    assert.ok(
      resetViewSrc.includes("navigate('/login')"),
      'Must provide button to return to /login after reset without forced auto-login'
    );

    // Confirm all 9 EveryKR languages + RTL support
    for (const lang of ['en', 'ko', 'bn', 'ne', 'hi', 'ur', 'ar', 'zh', 'ja']) {
      assert.ok(
        new RegExp(`\\b${lang}:\\s*\\{`).test(resetViewSrc),
        `ResetPasswordView must include complete localization dictionary for '${lang}'`
      );
    }
    assert.ok(
      resetViewSrc.includes("language === 'ar' || language === 'ur'"),
      'ResetPasswordView must support RTL layout for Arabic and Urdu'
    );

    // Confirm App.tsx routes /reset-password, /__/auth/action, and ?mode=resetPassword&oobCode=* cleanly
    assert.ok(appSrc.includes('path="/reset-password"'));
    assert.ok(appSrc.includes('path="/__/auth/action"'));
    assert.ok(appSrc.includes("navigate(`/reset-password?oobCode=${encodeURIComponent(oobCode)}`"));

    // Confirm passwordResetClient.ts client guards (missing code, <8 chars, duplicate submit lock)
    assert.ok(
      pwResetClientSrc.includes("code: 'auth/missing-action-code'") &&
        pwResetClientSrc.includes('if (rawNewPassword.length < 8)') &&
        pwResetClientSrc.includes('confirmPasswordResetInFlight'),
      'passwordResetClient.ts must enforce missing-code, >=8 char length, and duplicate submission guards'
    );

    // LIVE Firebase Auth SDK checks against production project `everykr`:
    assert.equal(auth.app.options.projectId, 'everykr');
    assert.equal(firebaseConfig.projectId, 'everykr');
    assert.equal(firebaseConfig.authDomain, 'everykr.firebaseapp.com');

    let verifyRejectedCode = '';
    try {
      await verifyPasswordResetCode(auth, 'invalid_or_already_used_probe_code_everykr_test_99999');
      assert.fail('Expected verifyPasswordResetCode to reject invalid/already-used oobCode');
    } catch (err: any) {
      verifyRejectedCode = String(err?.code || '');
    }
    assert.equal(verifyRejectedCode, 'auth/invalid-action-code');

    let confirmRejectedCode = '';
    try {
      await confirmPasswordReset(
        auth,
        'invalid_or_already_used_probe_code_everykr_test_99999',
        'ValidNewPassword2026!'
      );
      assert.fail('Expected confirmPasswordReset to reject invalid/already-used oobCode');
    } catch (err: any) {
      confirmRejectedCode = String(err?.code || '');
    }
    assert.equal(confirmRejectedCode, 'auth/invalid-action-code');
    assert.equal(auth.currentUser, null, 'Password reset client must NEVER mutate auth.currentUser');

    pass(
      'Custom /reset-password UI, loop-free URL capture, 9-language + RTL localization, and live Firebase Auth SDK (everykr) verified'
    );
  }

  // 9. Live local HTTP server verification: /reset-password?oobCode=..., security headers, & preservation of all 4 email workflows
  {
    let serverReachable = false;
    try {
      const healthRes = await fetch('http://127.0.0.1:3000/api/newsletter/status');
      serverReachable = healthRes.ok;
    } catch {
      serverReachable = false;
    }

    if (serverReachable) {
      // Verify custom website reset URL serves EveryKR SPA (HTTP 200) with strict no-referrer + no-store headers
      const customResetPageRes = await fetch(
        `http://127.0.0.1:3000/reset-password?oobCode=${SAMPLE_OOB_CODE}`,
        { headers: { Accept: 'text/html' } }
      );
      assert.equal(customResetPageRes.status, 200);
      assert.equal(customResetPageRes.headers.get('referrer-policy'), 'no-referrer');
      assert.ok((customResetPageRes.headers.get('cache-control') || '').includes('no-store'));
      const spaHtml = await customResetPageRes.text();
      assert.ok(spaHtml.includes('<div id="root"></div>'), 'Expected EveryKR React SPA HTML shell');
      assert.equal(
        spaHtml.includes('firebaseapp.com/__/auth/action'),
        false,
        'Custom /reset-password page must NOT serve Firebase default hosted form'
      );

      // Verify POST /api/auth/firebase-password-reset security headers
      const apiRes = await fetch('http://127.0.0.1:3000/api/auth/firebase-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email-syntax' }),
      });
      assert.equal(apiRes.status, 400);
      assert.equal(apiRes.headers.get('referrer-policy'), 'no-referrer');
      assert.ok((apiRes.headers.get('cache-control') || '').includes('no-store'));

      // Verify Newsletter & all 4 Automated Email Workflows remain intact
      const nlRes = await fetch('http://127.0.0.1:3000/api/newsletter/status');
      assert.equal(nlRes.status, 200);
      const nlJson = (await nlRes.json()) as any;
      assert.equal(nlJson.ok, true);
      assert.equal(nlJson.activeProvider, 'resend');
      assert.equal(nlJson.fromEmail, 'newsletter@everykr.com');
      assert.equal(nlJson.replyTo, 'support@everykr.com');

      const sysRes = await fetch('http://127.0.0.1:3000/api/emails/system-status');
      assert.equal(sysRes.status, 200);
      const sysJson = (await sysRes.json()) as any;
      assert.equal(sysJson.ok, true);
      assert.equal(sysJson.activeProvider, 'resend');
      assert.equal(sysJson.workflows?.loginWelcomeBack?.senderEmail, 'account@everykr.com');
      assert.equal(sysJson.workflows?.registrationCongratulations?.senderEmail, 'account@everykr.com');
      assert.equal(sysJson.workflows?.newsletter?.senderEmail, 'newsletter@everykr.com');
      assert.equal(sysJson.workflows?.passwordReset?.senderEmail, 'security@everykr.com');
      assert.equal(sysJson.workflows?.passwordReset?.subject, 'Reset Your EveryKR Password');
      assert.ok(
        String(sysJson.workflows?.passwordReset?.mechanism || '').includes(
          'https://everykr.com/reset-password?oobCode='
        )
      );

      pass(
        'Live HTTP server serves custom /reset-password?oobCode=... with no-referrer/no-store headers and preserves all 4 Resend email workflows (account@, security@, newsletter@)'
      );
    }
  }

  // 10. Client bundle security scan (if dist/ exists)
  {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      const files = collectFiles(distDir).filter((f) => /\.(js|mjs|html|css)$/i.test(f));
      const forbiddenClientStrings = [
        'firebase-admin',
        'FIREBASE_SERVICE_ACCOUNT_JSON',
        'FIREBASE_PRIVATE_KEY',
        'BEGIN PRIVATE KEY',
        'everykr-password-reset-admin',
        'NEWSLETTER_SIGNING_SECRET',
        'NEWSLETTER_HMAC_SECRET',
        ...(process.env.RESEND_API_KEY ? [process.env.RESEND_API_KEY] : []),
        ...(process.env.NEWSLETTER_SIGNING_SECRET ? [process.env.NEWSLETTER_SIGNING_SECRET] : []),
        ...(process.env.FIREBASE_SERVICE_ACCOUNT_JSON
          ? [process.env.FIREBASE_SERVICE_ACCOUNT_JSON]
          : []),
      ].filter((s) => s && s.length >= 8);

      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        for (const forbidden of forbiddenClientStrings) {
          assert.equal(
            content.includes(forbidden),
            false,
            `Server-only identifier/secret leaked in client bundle: ${f}`
          );
        }
      }
      pass(
        `Scanned ${files.length} compiled dist/ assets — zero Firebase Admin SDK, private keys, or secret values in browser bundle`
      );
    }
  }

  // 11. Scenario 1: Valid newly generated reset link (Standard + Firebase Email Enumeration Protection redacted-email HTTP 200)
  {
    clearConsumedResetCodesForTesting();

    // 11A. Standard verifyPasswordResetCode returning user email
    const validStandard = await verifyPasswordResetTokenClient({
      oobCode: '4_ValidNewlyGeneratedCode_Standard_1234567890',
      testOverrides: {
        verifyCodeFn: async () => 'minjun@snu.ac.kr',
      },
    });
    assert.equal(validStandard.ok, true);
    assert.equal(validStandard.status, 'valid');
    assert.equal(validStandard.email, 'minjun@snu.ac.kr');
    assert.equal(validStandard.maskedEmail, 'm***n@snu.ac.kr');
    assert.equal(validStandard.retryable, false);

    // 11B. Firebase Email Enumeration Protection enabled on project `everykr`:
    // `@firebase/auth` `verifyPasswordResetCode` throws `auth/internal-error` when Identity Toolkit
    // `POST /v1/accounts:resetPassword` returns HTTP 200 `{ requestType: "PASSWORD_RESET" }` without `email`.
    // Server SHA-256 oobCode mapping resolves the exact registered EveryKR email for Chrome Password Manager!
    const redactedOobCode = '4_ValidNewlyGeneratedCode_RedactedEmail_1234567890';
    registerResetOobCodeEmailMappingServer(redactedOobCode, 'mzhmd924@gmail.com');
    assert.equal(
      resolveRegisteredEmailForResetOobCodeServer(redactedOobCode),
      'mzhmd924@gmail.com'
    );

    let fallbackCalled = false;
    const validRedacted = await verifyPasswordResetTokenClient({
      oobCode: redactedOobCode,
      testOverrides: {
        verifyCodeFn: async () => {
          const e: any = new Error('Firebase: Error (auth/internal-error).');
          e.code = 'auth/internal-error';
          throw e;
        },
        fetchFn: (async (url: any, init?: RequestInit) => {
          const urlStr = String(url);
          if (urlStr.includes('/api/auth/firebase-password-reset/resolve-email')) {
            const parsedBody = JSON.parse(String(init?.body || '{}'));
            const email = resolveRegisteredEmailForResetOobCodeServer(parsedBody.oobCode);
            return new Response(JSON.stringify({ ok: Boolean(email), email }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          fallbackCalled = true;
          assert.equal(init?.referrerPolicy, 'no-referrer');
          return new Response(JSON.stringify({ requestType: 'PASSWORD_RESET' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as typeof fetch,
      },
    });
    assert.equal(fallbackCalled, true, 'Expected Identity Toolkit verification fallback on auth/internal-error');
    assert.equal(validRedacted.ok, true);
    assert.equal(validRedacted.status, 'valid');
    assert.equal(
      validRedacted.email,
      'mzhmd924@gmail.com',
      'Must resolve full unmasked registered EveryKR email for Chrome Password Manager autocomplete="username"'
    );
    assert.equal(validRedacted.maskedEmail, 'm***4@gmail.com');
    assert.equal(validRedacted.mode, 'firebase_oob');

    pass(
      'Scenario 1 verified: Valid newly generated reset links resolve to status="valid" with full unmasked registered email under both standard and Email Enumeration Protection modes'
    );
  }

  // 12. Scenario 2 & Scenario 3: Expired reset link + Invalid / missing / malformed reset link
  {
    clearConsumedResetCodesForTesting();

    // Scenario 2: Expired reset link
    const expiredRes = await verifyPasswordResetTokenClient({
      oobCode: '4_ExpiredResetCode_1234567890abcdef',
      testOverrides: {
        verifyCodeFn: async () => {
          const e: any = new Error('Firebase: Error (auth/expired-action-code).');
          e.code = 'auth/expired-action-code';
          throw e;
        },
      },
    });
    assert.equal(expiredRes.ok, false);
    assert.equal(expiredRes.status, 'expired_token');
    assert.equal(expiredRes.code, 'auth/expired-action-code');
    assert.equal(expiredRes.retryable, false);

    // Scenario 3A: Live Firebase `everykr` invalid reset link via real `verifyPasswordResetTokenClient`
    const liveInvalidRes = await verifyPasswordResetTokenClient({
      oobCode: '4_InvalidTamperedResetCode_LiveEveryKr_9876543210',
    });
    assert.equal(liveInvalidRes.ok, false);
    assert.equal(liveInvalidRes.status, 'invalid_token');
    assert.equal(liveInvalidRes.code, 'auth/invalid-action-code');
    assert.equal(liveInvalidRes.retryable, false);

    // Scenario 3B: Missing or malformed codes handled upfront without hanging
    const missingRes = await verifyPasswordResetTokenClient({ oobCode: '   ' });
    assert.equal(missingRes.ok, false);
    assert.equal(missingRes.status, 'missing_token');
    assert.equal(missingRes.code, 'auth/missing-action-code');

    const malformedRes = await verifyPasswordResetTokenClient({ oobCode: 'short' });
    assert.equal(malformedRes.ok, false);
    assert.equal(malformedRes.status, 'invalid_token');
    assert.equal(malformedRes.code, 'auth/invalid-action-code');
    assert.equal(isWellFormedOobCode('short'), false);
    assert.equal(isWellFormedOobCode('4_Code with spaces 1234567890'), false);

    pass(
      'Scenario 2 & Scenario 3 verified: Expired, live-invalid, missing, and malformed reset links stop immediately with distinct statuses'
    );
  }

  // 13. Scenario 4: Already-used reset link detection after confirmPasswordResetClient
  {
    clearConsumedResetCodesForTesting();
    const oneTimeCode = '4_OneTimeResetCode_ConsumedOnce_1234567890abcdef';

    const confirmRes = await confirmPasswordResetClient({
      oobCode: oneTimeCode,
      newPassword: 'StrongNewPassword2026!',
      testOverrides: {
        confirmResetFn: async () => undefined,
      },
    });
    assert.equal(confirmRes.ok, true);
    assert.equal(confirmRes.status, 'password_updated');
    assert.equal(auth.currentUser, null, 'Must never auto-login user after confirmPasswordReset');

    // Re-verifying the exact same reset link must report `already_used` immediately
    const reVerifyRes = await verifyPasswordResetTokenClient({
      oobCode: oneTimeCode,
    });
    assert.equal(reVerifyRes.ok, false);
    assert.equal(reVerifyRes.status, 'already_used');
    assert.equal(reVerifyRes.code, 'auth/already-used-action-code');
    assert.equal(reVerifyRes.retryable, false);

    // Attempting to confirm a second time with the consumed code must also report `already_used`
    const reConfirmRes = await confirmPasswordResetClient({
      oobCode: oneTimeCode,
      newPassword: 'AnotherPassword2026!',
    });
    assert.equal(reConfirmRes.ok, false);
    assert.equal(reConfirmRes.status, 'already_used');

    clearConsumedResetCodesForTesting();
    pass(
      'Scenario 4 verified: Already-used reset links are deterministically identified as status="already_used" without storing raw oobCode'
    );
  }

  // 14. Scenario 5: Slow / timed-out or failed network request preserves oobCode (never marked invalid) and Retry succeeds
  {
    clearConsumedResetCodesForTesting();
    const flakyNetworkCode = '4_SlowOrFlakyNetworkResetCode_1234567890abcdef';

    // 14A. Slow request exceeding timeout -> stops spinner with status="timeout", retryable=true (NOT invalid_token!)
    const timedOutRes = await verifyPasswordResetTokenClient({
      oobCode: flakyNetworkCode,
      testOverrides: {
        timeoutMs: 80,
        verifyCodeFn: () => new Promise<string>(() => {}), // Never resolves (simulates hung network)
      },
    });
    assert.equal(timedOutRes.ok, false);
    assert.equal(timedOutRes.status, 'timeout');
    assert.equal(timedOutRes.code, 'auth/verification-timeout');
    assert.equal(timedOutRes.retryable, true);
    assert.notEqual(timedOutRes.status, 'invalid_token', 'Timeout must NEVER mark reset code as invalid');

    // 14B. Network disconnect -> status="network_error", retryable=true (NOT invalid_token!)
    const netFailRes = await verifyPasswordResetTokenClient({
      oobCode: flakyNetworkCode,
      testOverrides: {
        verifyCodeFn: async () => {
          const e: any = new Error('Firebase: Error (auth/network-request-failed).');
          e.code = 'auth/network-request-failed';
          throw e;
        },
      },
    });
    assert.equal(netFailRes.ok, false);
    assert.equal(netFailRes.status, 'network_error');
    assert.equal(netFailRes.retryable, true);

    // 14C. Clicking Retry Verification with the preserved oobCode succeeds cleanly when network recovers
    const recoveredRes = await verifyPasswordResetTokenClient({
      oobCode: flakyNetworkCode,
      testOverrides: {
        verifyCodeFn: async (code) => {
          assert.equal(code, flakyNetworkCode);
          return 'jisoo@korea.ac.kr';
        },
      },
    });
    assert.equal(recoveredRes.ok, true);
    assert.equal(recoveredRes.status, 'valid');
    assert.equal(recoveredRes.maskedEmail, 'j***o@korea.ac.kr');

    pass(
      'Scenario 5 verified: Timeout and network errors stop cleanly with retryable=true, never invalidate oobCode, and succeed on Retry'
    );
  }

  // 15. Scenario 6: Page reload while verification is happening (after URL scrubbing) + StrictMode deduplication + stalled IndexedDB guard
  {
    const memMap = new Map<string, string>();
    const mockSessionStorage: MinimalSessionStorage = {
      getItem: (k) => memMap.get(k) ?? null,
      setItem: (k, v) => {
        memMap.set(k, v);
      },
      removeItem: (k) => {
        memMap.delete(k);
      },
    };

    const reloadTestCode = '4_ReloadDuringVerificationCode_1234567890abcdef';

    // Step 1: Initial page load at `/reset-password?oobCode=...` captures code BEFORE URL scrubbing
    const initialLoad = captureInitialResetLinkFromSearch(`?oobCode=${encodeURIComponent(reloadTestCode)}`, {
      storage: mockSessionStorage,
      nowMs: 1_000_000,
    });
    assert.equal(initialLoad.kind, 'captured_code');
    assert.equal(initialLoad.oobCode, reloadTestCode);
    assert.equal(initialLoad.shouldScrubUrl, true);

    // Step 2: URL bar is scrubbed to `/reset-password` (`window.location.search === ""`), and user reloads page while verifying!
    const afterReload = captureInitialResetLinkFromSearch('', {
      isInternalPushWithoutSearch: false,
      storage: mockSessionStorage,
      nowMs: 1_005_000, // 5 seconds later
    });
    assert.equal(afterReload.kind, 'restored_from_session');
    assert.equal(afterReload.oobCode, reloadTestCode);

    // Step 3: Malformed / missing URL query codes are caught synchronously before verification
    const missingParam = captureInitialResetLinkFromSearch('?oobCode=', {
      storage: mockSessionStorage,
    });
    assert.equal(missingParam.kind, 'missing_code');
    assert.equal(missingParam.oobCode, '');

    const wrongModeParam = captureInitialResetLinkFromSearch(
      `?mode=verifyEmail&oobCode=${encodeURIComponent(reloadTestCode)}`,
      { storage: mockSessionStorage }
    );
    assert.equal(wrongModeParam.kind, 'malformed_code');

    // Step 4: Internal in-app click on "Forgot Password?" (`PUSH` without query string) clears session and opens request_mode
    captureInitialResetLinkFromSearch(`?oobCode=${encodeURIComponent(reloadTestCode)}`, {
      storage: mockSessionStorage,
      nowMs: 2_000_000,
    });
    const internalPush = captureInitialResetLinkFromSearch('', {
      isInternalPushWithoutSearch: true,
      storage: mockSessionStorage,
      nowMs: 2_001_000,
    });
    assert.equal(internalPush.kind, 'no_code');
    assert.equal(internalPush.oobCode, '');

    // Step 5: Concurrent verification calls (React StrictMode double-invoke) share the exact same in-flight promise and fire only 1 verification request
    let verifySpyCount = 0;
    const sp1 = verifyPasswordResetTokenClient({
      oobCode: '4_StrictModeDedupSpy_EveryKr_1234567890',
      testOverrides: {
        enableInFlightDedupe: true,
        verifyCodeFn: async () => {
          verifySpyCount += 1;
          await new Promise((r) => setTimeout(r, 25));
          return 'student@yonsei.ac.kr';
        },
      },
    });
    const sp2 = verifyPasswordResetTokenClient({
      oobCode: '4_StrictModeDedupSpy_EveryKr_1234567890',
      testOverrides: {
        enableInFlightDedupe: true,
        verifyCodeFn: async () => {
          verifySpyCount += 1;
          return 'student@yonsei.ac.kr';
        },
      },
    });
    assert.equal(sp1, sp2, 'Concurrent StrictMode calls must share one in-flight promise');
    const [sr1, sr2] = await Promise.all([sp1, sp2]);
    assert.equal(verifySpyCount, 1, 'StrictMode concurrent mount must execute verifyPasswordResetCode only ONCE');
    assert.equal(sr1.status, 'valid');
    assert.equal(sr2.status, 'valid');

    const p1 = verifyPasswordResetTokenClient({
      oobCode: '4_StrictModeDedupProbe_EveryKr_1234567890',
    });
    const p2 = verifyPasswordResetTokenClient({
      oobCode: '4_StrictModeDedupProbe_EveryKr_1234567890',
    });
    assert.equal(p1, p2, 'Concurrent live calls for the same oobCode must share one in-flight promise');
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1.status, 'invalid_token');
    assert.equal(r2.status, 'invalid_token');

    // Step 6: Guard against stalled IndexedDB in `@firebase/app` HeartbeatServiceImpl
    const hbProvider = (auth as any)?.heartbeatServiceProvider;
    const hbService =
      hbProvider && typeof hbProvider.getImmediate === 'function'
        ? hbProvider.getImmediate({ optional: true })
        : null;
    if (hbService) {
      const prevCache = hbService._heartbeatsCache;
      const prevPromise = hbService._heartbeatsCachePromise;
      hbService._heartbeatsCache = null;
      hbService._heartbeatsCachePromise = new Promise(() => {}); // Simulate permanently blocked IndexedDB open()
      const t0 = Date.now();
      await ensureFirebaseAuthInitialized(1200);
      const elapsed = Date.now() - t0;
      assert.ok(elapsed < 1500, `Expected ensureFirebaseAuthInitialized to unblock stalled IndexedDB (<1500ms, got ${elapsed}ms)`);
      assert.deepEqual(hbService._heartbeatsCache, { heartbeats: [] });
      hbService._heartbeatsCache = prevCache;
      hbService._heartbeatsCachePromise = prevPromise;
    }

    pass(
      'Scenario 6 verified: Page reload after URL scrubbing restores oobCode, StrictMode deduplicates concurrent calls, and stalled IndexedDB never hangs Auth'
    );
  }

  // 16. Chrome Password Manager Website Name (everykr.com), Registered Email Username, & HTML Autocomplete Audit
  {
    assert.equal(OFFICIAL_EVERYKR_ORIGIN, 'https://everykr.com');
    assert.equal(OFFICIAL_EVERYKR_LOGIN_URL, 'https://everykr.com/login');
    assert.equal(OFFICIAL_EVERYKR_REGISTER_URL, 'https://everykr.com/register');
    assert.equal(OFFICIAL_PASSWORD_RESET_ACTION_URL, 'https://everykr.com/reset-password');
    assert.equal(OFFICIAL_EVERYKR_SETTINGS_URL, 'https://everykr.com/settings');
    assert.equal(resolveEveryKrLoginContinueUrl(), 'https://everykr.com/login');
    assert.equal(buildCanonicalEveryKrUrl('/reset-password'), 'https://everykr.com/reset-password');

    // Non-canonical production host detection (`*.run.app`, `everykr.firebaseapp.com`, `everykr.web.app`, `www.everykr.com`)
    assert.equal(isNonCanonicalProductionHostname('everykr.com'), false);
    assert.equal(isNonCanonicalProductionHostname('localhost'), false);
    assert.equal(isNonCanonicalProductionHostname('127.0.0.1'), false);
    assert.equal(isNonCanonicalProductionHostname('www.everykr.com'), true);
    assert.equal(isNonCanonicalProductionHostname('everykr.firebaseapp.com'), true);
    assert.equal(isNonCanonicalProductionHostname('everykr.web.app'), true);
    assert.equal(
      isNonCanonicalProductionHostname(
        'everykr-everything-korea-one-platform-926172198407.asia-east1.run.app'
      ),
      true
    );

    const authModalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/AuthModal.tsx'),
      'utf-8'
    );
    const regWizardSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/RegistrationWizard.tsx'),
      'utf-8'
    );
    const resetViewSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ResetPasswordView.tsx'),
      'utf-8'
    );
    const settingsViewSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/SettingsView.tsx'),
      'utf-8'
    );
    const seoManagerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/routing/RouteSeoManager.tsx'),
      'utf-8'
    );
    const indexHtmlSrc = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');

    // Canonical metadata & SEO checks
    assert.ok(indexHtmlSrc.includes('<link rel="canonical" href="https://everykr.com/" />'));
    assert.ok(
      seoManagerSrc.includes("const CANONICAL_EVERYKR_ORIGIN = 'https://everykr.com';"),
      'RouteSeoManager.tsx must use https://everykr.com as CANONICAL_EVERYKR_ORIGIN'
    );
    assert.equal(indexHtmlSrc.includes('.run.app'), false);
    assert.equal(seoManagerSrc.includes('.run.app'), false);

    // Login form attributes (AuthModal.tsx)
    assert.ok(authModalSrc.includes('id="everykr-login-form"'));
    assert.ok(authModalSrc.includes('action={OFFICIAL_EVERYKR_LOGIN_URL}'));
    assert.ok(
      authModalSrc.includes('id="everykr-login-email"') &&
        authModalSrc.includes('autoComplete="username"')
    );
    assert.ok(
      authModalSrc.includes('id="everykr-login-password"') &&
        authModalSrc.includes('autoComplete="current-password"')
    );

    // Registration form attributes (RegistrationWizard.tsx)
    assert.ok(regWizardSrc.includes('id="everykr-register-step2-form"'));
    assert.ok(regWizardSrc.includes('action="https://everykr.com/register"'));
    assert.ok(
      regWizardSrc.includes('id="everykr-register-email"') &&
        regWizardSrc.includes('autoComplete="username"')
    );
    assert.ok(
      regWizardSrc.includes('id="everykr-register-password"') &&
        regWizardSrc.includes('autoComplete="new-password"')
    );
    assert.ok(
      regWizardSrc.includes('id="everykr-register-confirm-password"') &&
        regWizardSrc.includes('autoComplete="new-password"')
    );

    // Password Reset form attributes (ResetPasswordView.tsx)
    assert.ok(resetViewSrc.includes('id="everykr-reset-password-form"'));
    assert.ok(resetViewSrc.includes('action={OFFICIAL_PASSWORD_RESET_ACTION_URL}'));
    assert.ok(
      resetViewSrc.includes('id="everykr-reset-account-username"') &&
        resetViewSrc.includes('name="username"') &&
        resetViewSrc.includes('type="email"') &&
        resetViewSrc.includes('autoComplete="username"') &&
        resetViewSrc.includes('value={accountEmail}'),
      'ResetPasswordView must bind autocomplete="username" to full unmasked accountEmail (never maskedAccountEmail)'
    );
    assert.equal(
      resetViewSrc.includes('value={maskedAccountEmail}'),
      false,
      'ResetPasswordView must NEVER pass masked email (m***4@gmail.com) as the input value for Chrome Password Manager'
    );
    assert.ok(
      resetViewSrc.includes('id="everykr-reset-new-password"') &&
        resetViewSrc.includes('autoComplete="new-password"')
    );
    assert.ok(
      resetViewSrc.includes('id="everykr-reset-confirm-password"') &&
        resetViewSrc.includes('autoComplete="new-password"')
    );
    assert.ok(
      resetViewSrc.includes('id="everykr-post-reset-login-link"') &&
        resetViewSrc.includes('href={OFFICIAL_EVERYKR_LOGIN_URL}'),
      'After successful password reset, must provide a clear route to https://everykr.com/login'
    );

    // Password Update form attributes on /settings (SettingsView.tsx)
    assert.ok(settingsViewSrc.includes('id="everykr-password-update-form"'));
    assert.ok(settingsViewSrc.includes('action={OFFICIAL_EVERYKR_SETTINGS_URL}'));
    assert.ok(
      settingsViewSrc.includes('id="everykr-update-password-username"') &&
        settingsViewSrc.includes('autoComplete="username"') &&
        settingsViewSrc.includes('value={registeredEmail}')
    );
    assert.ok(
      settingsViewSrc.includes('id="everykr-update-current-password"') &&
        settingsViewSrc.includes('autoComplete="current-password"')
    );
    assert.ok(
      settingsViewSrc.includes('id="everykr-update-new-password"') &&
        settingsViewSrc.includes('autoComplete="new-password"')
    );
    assert.ok(
      settingsViewSrc.includes('id="everykr-update-confirm-password"') &&
        settingsViewSrc.includes('autoComplete="new-password"')
    );

    pass(
      'Chrome Password Manager audit verified: official origin https://everykr.com, full registered email username, and autocomplete="username" / "current-password" / "new-password" across all auth forms'
    );
  }

  clearFirebasePasswordResetRateLimitsForTesting();
  console.log(`\nALL ${passed} FIREBASE PASSWORD RESET VERIFICATION TESTS PASSED.`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('PASSWORD RESET VERIFICATION FAILED:', err);
  process.exit(1);
});
