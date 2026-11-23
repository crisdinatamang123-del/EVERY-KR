import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  clearRecaptchaReplayCacheForTesting,
  getPublicRecaptchaConfigServer,
  setRecaptchaFetchForTesting,
  verifyRecaptchaTokenServer
} from '../src/server/recaptchaService.ts';

interface CheckResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

const WORKSPACE_ROOT = process.cwd();
const TEST_SECRET_SENTINEL = '6LeTestSecretKey_ServerOnly_NEVER_LEAK_99182';
const TEST_SITE_KEY = '6LeTestSiteKey_PublicOnly_Phase12';

function sha256FileIfExists(absPath: string): string {
  if (!fs.existsSync(absPath)) return 'ABSENT';
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function collectFilesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function makeFreshToken(label: string): string {
  return `03AFcWeA_${label}_${crypto.randomBytes(16).toString('hex')}`;
}

async function run(): Promise<void> {
  const results: CheckResult[] = [];
  const capturedHttpBodies: string[] = [];

  const record = (id: string, name: string, passed: boolean, detail: string) => {
    results.push({ id, name, passed, detail });
    const badge = passed ? 'PASS' : 'FAIL';
    console.log(`[${badge}] ${id} — ${name}: ${detail}`);
  };

  // Snapshot protected files BEFORE any tests run
  const protectedPaths = [
    'firestore.rules',
    'firebase-applet-config.json',
    'backups/everykr_universities_full_backup_2026-11-12.json',
    '.everykr-user-management.json',
    '.everykr-newsletter-store.json',
    '.everykr-otp-registrations.json',
    '.everykr-runtime-keys.json'
  ];
  const beforeHashes = new Map<string, string>();
  for (const rel of protectedPaths) {
    beforeHashes.set(rel, sha256FileIfExists(path.resolve(WORKSPACE_ROOT, rel)));
  }

  // Save original env vars so we restore cleanly
  const savedEnv: Record<string, string | undefined> = {
    NODE_ENV: process.env.NODE_ENV,
    RECAPTCHA_KEY_TYPE: process.env.RECAPTCHA_KEY_TYPE,
    VITE_RECAPTCHA_KEY_TYPE: process.env.VITE_RECAPTCHA_KEY_TYPE,
    RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
    VITE_RECAPTCHA_SITE_KEY: process.env.VITE_RECAPTCHA_SITE_KEY,
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
    VITE_RECAPTCHA_SECRET_KEY: process.env.VITE_RECAPTCHA_SECRET_KEY,
    RECAPTCHA_ENTERPRISE_PROJECT_ID: process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID,
    RECAPTCHA_ENTERPRISE_API_KEY: process.env.RECAPTCHA_ENTERPRISE_API_KEY,
    RECAPTCHA_ALLOWED_HOSTNAMES: process.env.RECAPTCHA_ALLOWED_HOSTNAMES
  };

  const resetRecaptchaEnv = () => {
    delete process.env.RECAPTCHA_KEY_TYPE;
    delete process.env.VITE_RECAPTCHA_KEY_TYPE;
    delete process.env.RECAPTCHA_SITE_KEY;
    delete process.env.VITE_RECAPTCHA_SITE_KEY;
    delete process.env.RECAPTCHA_SECRET_KEY;
    delete process.env.VITE_RECAPTCHA_SECRET_KEY;
    delete process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID;
    delete process.env.RECAPTCHA_ENTERPRISE_API_KEY;
    delete process.env.RECAPTCHA_ALLOWED_HOSTNAMES;
    process.env.NODE_ENV = 'development';
    clearRecaptchaReplayCacheForTesting();
    setRecaptchaFetchForTesting(null);
  };

  try {
    // =========================================================================
    // PART 1: SERVER-SIDE RECAPTCHA SERVICE UNIT TESTS
    // =========================================================================

    // T1. Unconfigured server fails closed (503)
    resetRecaptchaEnv();
    {
      const pubCfg = getPublicRecaptchaConfigServer();
      const verifyUnconf = await verifyRecaptchaTokenServer({
        token: makeFreshToken('unconf'),
        remoteIp: '127.0.0.1',
        expectedAction: 'login'
      });
      assert.equal(pubCfg.configured, false);
      assert.equal(pubCfg.v2CheckboxEligible, false);
      assert.equal(verifyUnconf.ok, false);
      assert.equal(verifyUnconf.httpStatus, 503);
      assert.equal(verifyUnconf.status, 'verification_not_configured');
      record(
        'T01',
        'Fail-closed when server reCAPTCHA is unconfigured',
        true,
        `status=${verifyUnconf.status}, httpStatus=${verifyUnconf.httpStatus}`
      );
    }

    // Configure standard reCAPTCHA v2 Checkbox for unit tests T02–T08
    resetRecaptchaEnv();
    process.env.RECAPTCHA_KEY_TYPE = 'v2_checkbox';
    process.env.RECAPTCHA_SITE_KEY = TEST_SITE_KEY;
    process.env.RECAPTCHA_SECRET_KEY = TEST_SECRET_SENTINEL;
    process.env.RECAPTCHA_ALLOWED_HOSTNAMES = 'everykr.com,www.everykr.com,localhost';

    const calledUrls: string[] = [];

    // T2. Valid standard v2 token succeeds via SiteVerify ONLY + single-use replay rejection
    {
      setRecaptchaFetchForTesting((async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calledUrls.push(url);
        const params = new URLSearchParams(String(init?.body || ''));
        assert.equal(params.get('secret'), TEST_SECRET_SENTINEL);
        return new Response(
          JSON.stringify({
            success: true,
            challenge_ts: new Date().toISOString(),
            hostname: 'everykr.com'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch);

      const validToken = makeFreshToken('valid_v2');
      const first = await verifyRecaptchaTokenServer({
        token: validToken,
        remoteIp: '203.0.113.10',
        expectedAction: 'login'
      });
      assert.equal(first.ok, true);
      assert.equal(first.httpStatus, 200);
      assert.equal(first.status, 'verified');
      assert.equal(first.hostname, 'everykr.com');
      assert.equal(
        calledUrls.every((u) => u === 'https://www.google.com/recaptcha/api/siteverify'),
        true
      );
      record(
        'T02',
        'Valid standard v2 Checkbox token verified via Google SiteVerify API',
        true,
        `status=${first.status}, hostname=${first.hostname}, endpoint=${calledUrls[0]}`
      );

      // T3. Reused token blocked immediately (anti-replay)
      const replay = await verifyRecaptchaTokenServer({
        token: validToken,
        remoteIp: '203.0.113.10',
        expectedAction: 'login'
      });
      assert.equal(replay.ok, false);
      assert.equal(replay.httpStatus, 400);
      assert.equal(replay.status, 'token_reused');
      record(
        'T03',
        'Reused single-use reCAPTCHA token rejected',
        true,
        `status=${replay.status}, httpStatus=${replay.httpStatus}`
      );
    }

    // T4. Missing token & syntactically invalid token rejected (400)
    {
      const missing = await verifyRecaptchaTokenServer({
        token: '   ',
        remoteIp: '127.0.0.1'
      });
      assert.equal(missing.ok, false);
      assert.equal(missing.httpStatus, 400);
      assert.equal(missing.status, 'missing_token');

      const shortInvalid = await verifyRecaptchaTokenServer({
        token: 'bad_short',
        remoteIp: '127.0.0.1'
      });
      assert.equal(shortInvalid.ok, false);
      assert.equal(shortInvalid.httpStatus, 400);
      assert.equal(shortInvalid.status, 'invalid_token');

      setRecaptchaFetchForTesting((async () =>
        new Response(
          JSON.stringify({
            success: false,
            'error-codes': ['invalid-input-response']
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )) as typeof fetch);

      const upstreamInvalid = await verifyRecaptchaTokenServer({
        token: makeFreshToken('upstream_invalid'),
        remoteIp: '127.0.0.1'
      });
      assert.equal(upstreamInvalid.ok, false);
      assert.equal(upstreamInvalid.httpStatus, 400);
      assert.equal(upstreamInvalid.status, 'invalid_token');

      record(
        'T04',
        'Missing and invalid tokens rejected with HTTP 400',
        true,
        `missing=${missing.status}, short=${shortInvalid.status}, upstream=${upstreamInvalid.status}`
      );
    }

    // T5. Expired token rejected (both stale challenge_ts > 120s and timeout-or-duplicate)
    {
      const staleIso = new Date(Date.now() - 185_000).toISOString();
      setRecaptchaFetchForTesting((async () =>
        new Response(
          JSON.stringify({
            success: true,
            challenge_ts: staleIso,
            hostname: 'everykr.com'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )) as typeof fetch);

      const staleRes = await verifyRecaptchaTokenServer({
        token: makeFreshToken('stale_ts'),
        remoteIp: '127.0.0.1'
      });
      assert.equal(staleRes.ok, false);
      assert.equal(staleRes.httpStatus, 400);
      assert.equal(staleRes.status, 'expired_token');

      setRecaptchaFetchForTesting((async () =>
        new Response(
          JSON.stringify({
            success: false,
            'error-codes': ['timeout-or-duplicate']
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )) as typeof fetch);

      const timeoutCodeRes = await verifyRecaptchaTokenServer({
        token: makeFreshToken('timeout_code'),
        remoteIp: '127.0.0.1'
      });
      assert.equal(timeoutCodeRes.ok, false);
      assert.equal(timeoutCodeRes.httpStatus, 400);
      assert.equal(timeoutCodeRes.status, 'expired_token');

      record(
        'T05',
        'Expired tokens rejected via challenge_ts age check and timeout-or-duplicate',
        true,
        `staleAge=${staleRes.status}, timeoutCode=${timeoutCodeRes.status}`
      );
    }

    // T6. Hostname mismatch rejected (400)
    {
      setRecaptchaFetchForTesting((async () =>
        new Response(
          JSON.stringify({
            success: true,
            challenge_ts: new Date().toISOString(),
            hostname: 'evil-spoof.example.net'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )) as typeof fetch);

      const badHost = await verifyRecaptchaTokenServer({
        token: makeFreshToken('bad_host'),
        remoteIp: '127.0.0.1'
      });
      assert.equal(badHost.ok, false);
      assert.equal(badHost.httpStatus, 400);
      assert.equal(badHost.status, 'hostname_mismatch');
      record(
        'T06',
        'Unauthorized hostname rejected by server allowlist',
        true,
        `status=${badHost.status}, httpStatus=${badHost.httpStatus}`
      );
    }

    // T7. Upstream Google SiteVerify outage fails closed (503)
    {
      setRecaptchaFetchForTesting((async () => {
        throw new Error('Simulated network outage to www.google.com');
      }) as typeof fetch);

      const netDown = await verifyRecaptchaTokenServer({
        token: makeFreshToken('net_down'),
        remoteIp: '127.0.0.1'
      });
      assert.equal(netDown.ok, false);
      assert.equal(netDown.httpStatus, 503);
      assert.equal(netDown.status, 'verification_unavailable');
      record(
        'T07',
        'Upstream Google verification outage fails closed (HTTP 503)',
        true,
        `status=${netDown.status}, httpStatus=${netDown.httpStatus}`
      );
    }

    // T8. CreateAssessment migration notice compliance: strict separation of v2 SiteVerify vs Enterprise CreateAssessment
    {
      // 8a. Mixing v2_checkbox with Enterprise credentials fails closed
      resetRecaptchaEnv();
      process.env.RECAPTCHA_KEY_TYPE = 'v2_checkbox';
      process.env.RECAPTCHA_SITE_KEY = TEST_SITE_KEY;
      process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID = 'everykr';
      process.env.RECAPTCHA_ENTERPRISE_API_KEY = 'ent_dummy_key';

      const mixedV2 = await verifyRecaptchaTokenServer({
        token: makeFreshToken('mixed_v2')
      });
      assert.equal(mixedV2.ok, false);
      assert.equal(mixedV2.httpStatus, 503);
      assert.equal(mixedV2.status, 'key_type_conflict');

      // 8b. Accidental client VITE_RECAPTCHA_SECRET_KEY fails closed
      resetRecaptchaEnv();
      process.env.RECAPTCHA_KEY_TYPE = 'v2_checkbox';
      process.env.RECAPTCHA_SITE_KEY = TEST_SITE_KEY;
      process.env.RECAPTCHA_SECRET_KEY = TEST_SECRET_SENTINEL;
      process.env.VITE_RECAPTCHA_SECRET_KEY = TEST_SECRET_SENTINEL;
      const leakedEnv = await verifyRecaptchaTokenServer({
        token: makeFreshToken('leaked_vite')
      });
      assert.equal(leakedEnv.ok, false);
      assert.equal(leakedEnv.status, 'key_type_conflict');

      // 8c. Enterprise mode uses CreateAssessment ONLY and disables standard v2 Checkbox widget
      resetRecaptchaEnv();
      process.env.RECAPTCHA_KEY_TYPE = 'enterprise';
      process.env.RECAPTCHA_SITE_KEY = '6LeEnterpriseKey_Test';
      process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID = 'everykr';
      process.env.RECAPTCHA_ENTERPRISE_API_KEY = 'AIzaEnterpriseServerOnlyTestKey';

      const entPubCfg = getPublicRecaptchaConfigServer();
      assert.equal(entPubCfg.keyType, 'enterprise');
      assert.equal(entPubCfg.v2CheckboxEligible, false);
      assert.equal(entPubCfg.siteKey, '');

      const entUrls: string[] = [];
      setRecaptchaFetchForTesting((async (input: RequestInfo | URL) => {
        entUrls.push(String(input));
        return new Response(
          JSON.stringify({
            tokenProperties: {
              valid: true,
              hostname: 'everykr.com',
              action: 'login',
              createTime: new Date().toISOString()
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch);

      const entVerify = await verifyRecaptchaTokenServer({
        token: makeFreshToken('ent_valid'),
        expectedAction: 'login'
      });
      assert.equal(entVerify.ok, true);
      assert.equal(entVerify.keyType, 'enterprise');
      assert.equal(
        entUrls.length === 1 &&
          entUrls[0].startsWith(
            'https://recaptchaenterprise.googleapis.com/v1/projects/everykr/assessments'
          ),
        true
      );

      record(
        'T08',
        'Strict SiteVerify vs Enterprise CreateAssessment separation & VITE_ secret block',
        true,
        `mixed=${mixedV2.status}, viteSecretBlock=${leakedEnv.status}, enterpriseEndpoint=assessments, v2CheckboxEligible=${entPubCfg.v2CheckboxEligible}`
      );
    }

    // =========================================================================
    // PART 2: SANDBOXED FULL-STACK HTTP INTEGRATION & REGRESSION SUITE
    // =========================================================================
    resetRecaptchaEnv();
    const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'everykr-p12-sandbox-'));
    const sandboxPort = 4390 + Math.floor(Math.random() * 400);
    const otpCaptureFile = path.join(sandboxDir, 'captured-emails.jsonl');

    // Copy read-only firebase-applet-config.json into sandbox CWD
    fs.copyFileSync(
      path.resolve(WORKSPACE_ROOT, 'firebase-applet-config.json'),
      path.join(sandboxDir, 'firebase-applet-config.json')
    );

    // Create preload mock script for outbound Google SiteVerify + Resend API in sandbox child process
    const preloadPath = path.join(sandboxDir, 'preloadMockFetch.mjs');
    const serverEntryUrl = `file://${path.resolve(WORKSPACE_ROOT, 'server.ts')}`;
    fs.writeFileSync(
      preloadPath,
      `
import fs from 'node:fs';
const origFetch = globalThis.fetch;
const captureFile = ${JSON.stringify(otpCaptureFile)};

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url === 'https://www.google.com/recaptcha/api/siteverify') {
    const bodyParams = new URLSearchParams(String(init?.body || ''));
    const token = bodyParams.get('response') || '';
    if (token.startsWith('03AFcWeA_VALID_')) {
      return new Response(JSON.stringify({
        success: true,
        challenge_ts: new Date().toISOString(),
        hostname: 'localhost'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (token.startsWith('03AFcWeA_EXPIRED_')) {
      return new Response(JSON.stringify({
        success: true,
        challenge_ts: new Date(Date.now() - 240000).toISOString(),
        hostname: 'localhost'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (token.startsWith('03AFcWeA_BADHOST_')) {
      return new Response(JSON.stringify({
        success: true,
        challenge_ts: new Date().toISOString(),
        hostname: 'phishing-domain.invalid'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      success: false,
      'error-codes': ['invalid-input-response']
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (url === 'https://api.resend.com/emails') {
    const rawBody = String(init?.body || '{}');
    fs.appendFileSync(captureFile, rawBody + '\\n', 'utf8');
    return new Response(JSON.stringify({ id: 're_sandbox_' + Date.now() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return origFetch(input, init);
};

await import(${JSON.stringify(serverEntryUrl)});
`,
      'utf8'
    );

    const tsxBin = path.resolve(WORKSPACE_ROOT, 'node_modules/.bin/tsx');
    const serverChild = spawn(tsxBin, [preloadPath], {
      cwd: sandboxDir,
      env: {
        ...process.env,
        PORT: String(sandboxPort),
        NODE_ENV: 'development',
        RECAPTCHA_KEY_TYPE: 'v2_checkbox',
        RECAPTCHA_SITE_KEY: TEST_SITE_KEY,
        VITE_RECAPTCHA_SITE_KEY: TEST_SITE_KEY,
        RECAPTCHA_SECRET_KEY: TEST_SECRET_SENTINEL,
        RECAPTCHA_ALLOWED_HOSTNAMES: 'everykr.com,www.everykr.com,localhost',
        RESEND_API_KEY: 're_sandbox_server_only_key'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    try {
      const baseUrl = `http://127.0.0.1:${sandboxPort}`;

      // Wait for sandbox server to accept connections
      let ready = false;
      for (let i = 0; i < 40; i++) {
        try {
          const r = await fetch(`${baseUrl}/api/security/recaptcha-config`);
          if (r.ok) {
            ready = true;
            break;
          }
        } catch {
          // retry
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      assert.equal(ready, true, 'Sandbox Express server failed to start in time');

      const postJson = async (route: string, body: Record<string, unknown>) => {
        const res = await fetch(`${baseUrl}${route}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const text = await res.text();
        capturedHttpBodies.push(text);
        return { status: res.status, json: JSON.parse(text) };
      };

      // T9. Public config endpoint exposes ONLY public Site Key and zero secret material
      {
        const res = await fetch(`${baseUrl}/api/security/recaptcha-config`);
        const raw = await res.text();
        capturedHttpBodies.push(raw);
        const cfg = JSON.parse(raw);
        assert.equal(res.status, 200);
        assert.equal(cfg.configured, true);
        assert.equal(cfg.keyType, 'v2_checkbox');
        assert.equal(cfg.v2CheckboxEligible, true);
        assert.equal(cfg.siteKey, TEST_SITE_KEY);
        assert.equal(raw.includes(TEST_SECRET_SENTINEL), false);
        record(
          'T09',
          'GET /api/security/recaptcha-config returns public Site Key without secrets',
          true,
          `configured=${cfg.configured}, keyType=${cfg.keyType}, siteKey=${cfg.siteKey}`
        );
      }

      // T10. Registration OTP + Account Activation + Login + Token Replay Regression
      {
        const testUserEmail = `scholar.${Date.now()}@yonsei.ac.kr`;
        const testUserPassword = 'SafePassword#2026';

        // Missing token on OTP request -> 400
        const noTokOtp = await postJson('/api/auth/otp/request', {
          name: 'Minjun Rahman',
          email: testUserEmail,
          password: testUserPassword,
          role: 'student',
          accountType: 'student',
          isResend: false
        });
        assert.equal(noTokOtp.status, 400);
        assert.equal(noTokOtp.json.status, 'missing_token');

        // Valid token on OTP request -> 200 + 6-digit OTP generated
        const otpRecaptchaTok = makeFreshToken('VALID_OTP_REQ');
        const okOtp = await postJson('/api/auth/otp/request', {
          name: 'Minjun Rahman',
          email: testUserEmail,
          password: testUserPassword,
          role: 'student',
          accountType: 'student',
          isResend: false,
          recaptchaToken: otpRecaptchaTok
        });
        assert.equal(okOtp.status, 200);
        assert.equal(okOtp.json.ok, true);

        // Extract 6-digit OTP from sandbox Resend plaintext payload
        const emailLines = fs.readFileSync(otpCaptureFile, 'utf8').trim().split('\n');
        const lastEmail = JSON.parse(emailLines[emailLines.length - 1]);
        const otpMatch = String(lastEmail.text || '').match(/verification code is:\s*(\d{6})/i);
        assert.ok(otpMatch, 'Expected 6-digit OTP in sandbox email payload');
        const sixDigitOtp = otpMatch[1];

        // Verify OTP -> proof token
        const verifyOtpRes = await postJson('/api/auth/otp/verify', {
          email: testUserEmail,
          otp: sixDigitOtp
        });
        assert.equal(verifyOtpRes.status, 200);
        assert.equal(verifyOtpRes.json.ok, true);
        assert.ok(verifyOtpRes.json.verificationProofToken);

        // Complete account creation
        const completeRes = await postJson('/api/auth/otp/complete', {
          uid: `usr_${Date.now()}`,
          email: testUserEmail,
          name: 'Minjun Rahman',
          fullName: 'Minjun Rahman',
          password: testUserPassword,
          role: 'student',
          accountType: 'student',
          verificationProofToken: verifyOtpRes.json.verificationProofToken
        });
        assert.equal(completeRes.status, 200);
        assert.equal(completeRes.json.ok, true);

        // Replay of OTP recaptchaToken on Login -> 400 token_reused
        const replayLogin = await postJson('/api/auth/login', {
          email: testUserEmail,
          password: testUserPassword,
          recaptchaToken: otpRecaptchaTok
        });
        assert.equal(replayLogin.status, 400);
        assert.equal(replayLogin.json.status, 'token_reused');

        // Fresh valid recaptchaToken on Login -> 200 + verified session
        const validLogin = await postJson('/api/auth/login', {
          email: testUserEmail,
          password: testUserPassword,
          recaptchaToken: makeFreshToken('VALID_LOGIN')
        });
        assert.equal(validLogin.status, 200);
        assert.equal(validLogin.json.ok, true);
        assert.ok(validLogin.json.sessionToken);

        // Forgot Password / Reset: expired token rejected (400), fresh valid token succeeds (200)
        const expReset = await postJson('/api/auth/password-reset/request', {
          email: testUserEmail,
          recaptchaToken: makeFreshToken('EXPIRED_RESET')
        });
        assert.equal(expReset.status, 400);
        assert.equal(expReset.json.status, 'expired_token');

        const okReset = await postJson('/api/auth/password-reset/request', {
          email: testUserEmail,
          recaptchaToken: makeFreshToken('VALID_RESET')
        });
        assert.equal(okReset.status, 200);
        assert.equal(okReset.json.ok, true);

        record(
          'T10',
          'Registration OTP, Account Activation, Login, Replay Block & Password Reset regression',
          true,
          `otp=200, verify=200, complete=200, replayLogin=400(${replayLogin.json.status}), login=200, resetExpired=400, resetValid=200`
        );
      }

      // T11. Newsletter Subscription + Honeypot Preservation + Double Opt-In Verification
      {
        const subEmail = `newsletter.${Date.now()}@snu.ac.kr`;

        // Honeypot filled -> blocked before reCAPTCHA
        const hpRes = await postJson('/api/newsletter/subscribe', {
          email: subEmail,
          consentGiven: true,
          honeypot: 'http://spam-bot.invalid',
          recaptchaToken: makeFreshToken('VALID_UNUSED_HP')
        });
        assert.equal(hpRes.status, 400);
        assert.equal(hpRes.json.status, 'spam_blocked');

        // Missing reCAPTCHA token -> 400
        const missingTokSub = await postJson('/api/newsletter/subscribe', {
          email: subEmail,
          consentGiven: true,
          honeypot: ''
        });
        assert.equal(missingTokSub.status, 400);
        assert.equal(missingTokSub.json.status, 'missing_token');

        // Valid reCAPTCHA token -> 200 pending_verification + Double Opt-In confirm -> 200 verified
        const validSub = await postJson('/api/newsletter/subscribe', {
          email: subEmail,
          consentGiven: true,
          honeypot: '',
          recaptchaToken: makeFreshToken('VALID_NEWSLETTER')
        });
        assert.equal(validSub.status, 200);
        assert.equal(validSub.json.ok, true);

        if (validSub.json.verificationToken) {
          const confirmSub = await postJson('/api/newsletter/verify', {
            email: subEmail,
            token: validSub.json.verificationToken
          });
          assert.equal(confirmSub.status, 200);
          assert.equal(confirmSub.json.ok, true);
        }

        record(
          'T11',
          'Newsletter subscription honeypot, reCAPTCHA enforcement, and Double Opt-In regression',
          true,
          `honeypot=400(spam_blocked), missingRecaptcha=400, validSubscribe=200(${validSub.json.status})`
        );
      }

      // T12. Contact, Community Post & Marketplace (Listing + Seller Inquiry) Protected Endpoints
      {
        // Contact: missing token -> 400; valid token -> 200
        const badContact = await postJson('/api/contact/submit', {
          name: 'Ayesha Khan',
          email: 'ayesha@kaist.ac.kr',
          category: 'General Inquiry',
          subject: 'D-2 Visa Document Check',
          message: 'Hello EVERYKR team, I have a question regarding university scholarship deadlines.'
        });
        assert.equal(badContact.status, 400);
        assert.equal(badContact.json.status, 'missing_token');

        const okContact = await postJson('/api/contact/submit', {
          name: 'Ayesha Khan',
          email: 'ayesha@kaist.ac.kr',
          category: 'General Inquiry',
          subject: 'D-2 Visa Document Check',
          message: 'Hello EVERYKR team, I have a question regarding university scholarship deadlines.',
          honeypot: '',
          recaptchaToken: makeFreshToken('VALID_CONTACT')
        });
        assert.equal(okContact.status, 200);
        assert.equal(okContact.json.ok, true);
        assert.ok(String(okContact.json.ticketId || '').startsWith('EKR-SUP-'));

        // Community Post: bad hostname -> 400; valid token -> 200
        const badCommunity = await postJson('/api/community/posts/verify-submission', {
          title: 'Tips for ARC Appointment in Seoul',
          category: 'Visa & Immigration',
          city: 'Seoul',
          content: 'Book your HiKorea reservation at least 3 weeks before semester start!',
          recaptchaToken: makeFreshToken('BADHOST_COMM')
        });
        assert.equal(badCommunity.status, 400);
        assert.equal(badCommunity.json.status, 'hostname_mismatch');

        const okCommunity = await postJson('/api/community/posts/verify-submission', {
          title: 'Tips for ARC Appointment in Seoul',
          category: 'Visa & Immigration',
          city: 'Seoul',
          content: 'Book your HiKorea reservation at least 3 weeks before semester start!',
          honeypot: '',
          recaptchaToken: makeFreshToken('VALID_COMM')
        });
        assert.equal(okCommunity.status, 200);
        assert.equal(okCommunity.json.status, 'verified');

        // Marketplace Listing & Inquiry: missing/invalid -> 400; valid -> 200
        const badMktListing = await postJson('/api/marketplace/verify-submission', {
          submissionType: 'listing',
          title: 'TOPIK II Preparation Books',
          priceKRW: 25000,
          location: 'Sinchon Station Exit 2',
          sellerContact: '010-1234-5678',
          recaptchaToken: makeFreshToken('INVALID_MKT')
        });
        assert.equal(badMktListing.status, 400);
        assert.equal(badMktListing.json.status, 'invalid_token');

        const okMktListing = await postJson('/api/marketplace/verify-submission', {
          submissionType: 'listing',
          title: 'TOPIK II Preparation Books',
          priceKRW: 25000,
          location: 'Sinchon Station Exit 2',
          sellerContact: '010-1234-5678',
          honeypot: '',
          recaptchaToken: makeFreshToken('VALID_MKT_LIST')
        });
        assert.equal(okMktListing.status, 200);
        assert.equal(okMktListing.json.submissionType, 'listing');

        const okMktInquiry = await postJson('/api/marketplace/verify-submission', {
          submissionType: 'inquiry',
          itemId: 'mkt-101',
          message: 'Hi! Is this TOPIK book set still available near Sinchon?',
          honeypot: '',
          recaptchaToken: makeFreshToken('VALID_MKT_INQ')
        });
        assert.equal(okMktInquiry.status, 200);
        assert.equal(okMktInquiry.json.submissionType, 'inquiry');

        record(
          'T12',
          'Contact, Community Post, Marketplace Listing & Seller Inquiry verification gates',
          true,
          `contact=200(${okContact.json.ticketId}), community=200, mktListing=200, mktInquiry=200`
        );
      }
    } finally {
      serverChild.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 250));
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    }

    // =========================================================================
    // PART 3: LIVE PREVIEW FAIL-CLOSED CHECK, BUNDLE SECRET SCAN & DATA INTEGRITY
    // =========================================================================

    // T13. Live preview server (port 3000) fail-closed verification when secrets are not yet set
    {
      const cfgRes = await fetch('http://127.0.0.1:3000/api/security/recaptcha-config');
      const cfgRaw = await cfgRes.text();
      capturedHttpBodies.push(cfgRaw);
      assert.equal(cfgRes.status, 200);

      const contactProbe = await fetch('http://127.0.0.1:3000/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Probe User',
          email: 'probe@everykr.com',
          message: 'Checking live server fail-closed behavior without mutating any data.'
        })
      });
      const probeRaw = await contactProbe.text();
      capturedHttpBodies.push(probeRaw);
      const probeJson = JSON.parse(probeRaw);
      assert.equal(probeJson.ok, false);
      assert.equal(
        contactProbe.status === 503 || contactProbe.status === 400,
        true,
        `Expected 503 or 400 fail-closed status, received ${contactProbe.status}`
      );
      record(
        'T13',
        'Live port 3000 server enforces fail-closed protection on protected routes',
        true,
        `httpStatus=${contactProbe.status}, status=${probeJson.status}`
      );
    }

    // T14. Production dist/ bundle & API response secret-leak scan
    {
      const distDir = path.resolve(WORKSPACE_ROOT, 'dist');
      const distFiles = collectFilesRecursively(distDir);
      assert.ok(distFiles.length > 0, 'Expected compiled production files in dist/');

      const forbiddenPatterns = [
        TEST_SECRET_SENTINEL,
        'RECAPTCHA_SECRET_KEY',
        'RECAPTCHA_ENTERPRISE_API_KEY',
        'VITE_RECAPTCHA_SECRET_KEY',
        ...(process.env.RECAPTCHA_SECRET_KEY ? [process.env.RECAPTCHA_SECRET_KEY] : []),
        ...(process.env.RESEND_API_KEY ? [process.env.RESEND_API_KEY] : [])
      ].filter((s) => s && s.length >= 6);

      for (const file of distFiles) {
        if (!/\.(js|mjs|cjs|html|css|json)$/i.test(file)) continue;
        const content = fs.readFileSync(file, 'utf8');
        for (const secretPattern of forbiddenPatterns) {
          assert.equal(
            content.includes(secretPattern),
            false,
            `Forbidden secret identifier "${secretPattern}" found in client bundle: ${file}`
          );
        }
      }

      for (const body of capturedHttpBodies) {
        assert.equal(
          body.includes(TEST_SECRET_SENTINEL),
          false,
          'Secret sentinel leaked in an HTTP API response body!'
        );
      }

      record(
        'T14',
        'Zero secret keys or server-only env names in compiled browser bundles or API responses',
        true,
        `scannedDistFiles=${distFiles.length}, scannedApiResponses=${capturedHttpBodies.length}`
      );
    }

    // T15. Protected workspace files & live user/newsletter/OTP/university stores unchanged
    {
      const mismatches: string[] = [];
      for (const rel of protectedPaths) {
        const after = sha256FileIfExists(path.resolve(WORKSPACE_ROOT, rel));
        const before = beforeHashes.get(rel);
        if (after !== before) {
          mismatches.push(`${rel}: before=${before} after=${after}`);
        }
      }
      assert.equal(
        mismatches.length,
        0,
        `Workspace data mutation detected: ${mismatches.join('; ')}`
      );
      record(
        'T15',
        '100% preservation of firestore.rules, firebase-applet-config.json, university backup & live stores',
        true,
        `verifiedFiles=${protectedPaths.length}, mutations=0`
      );
    }
  } finally {
    // Restore original process.env
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
    setRecaptchaFetchForTesting(null);
    clearRecaptchaReplayCacheForTesting();
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n=== PHASE 12 VERIFICATION SUMMARY: ${passedCount}/${results.length} PASSED ===`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('PHASE 12 VERIFICATION FAILED:', err);
  process.exit(1);
});
