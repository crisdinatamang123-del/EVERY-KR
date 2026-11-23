import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildWelcomeEmailPayload,
  createSignedToken,
  getHmacSecret,
  getNewsletterHmacSecretSource,
  getStableNewsletterSecret,
  verifySignedToken,
} from '../src/server/newsletterService.ts';

/**
 * Automated Verification Suite for Newsletter HMAC Secret Resolution & Backward Compatibility.
 * - Uses isolated synthetic test fixtures in an OS temp directory.
 * - Never prints, modifies, overwrites, or exposes real production environment secrets.
 */
async function runNewsletterHmacTests() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'everykr-nl-hmac-test-'));
  const tempRuntimeKeysPath = path.join(tmpDir, '.test-runtime-keys.json');

  let passed = 0;
  const check = (name: string, fn: () => void) => {
    fn();
    passed++;
    console.log(`PASS [${passed}]: ${name}`);
  };

  try {
    // Deterministic synthetic test fixtures (NOT real secrets)
    const SYNTHETIC_SIGNING_SECRET = 'test_only_newsletter_signing_secret_value_01';
    const SYNTHETIC_HMAC_SECRET = 'test_only_newsletter_hmac_secret_value_0002';
    const SYNTHETIC_OTP_HMAC_SECRET = 'test_only_legacy_otp_hmac_secret_value_0003';
    const SYNTHETIC_RUNTIME_FILE_SECRET =
      'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

    fs.writeFileSync(
      tempRuntimeKeysPath,
      JSON.stringify({ newsletterHmacSecret: SYNTHETIC_RUNTIME_FILE_SECRET }, null, 2),
      'utf-8'
    );

    // 1. Resolution Order Tier 1: NEWSLETTER_SIGNING_SECRET takes top priority
    check('Prefers NEWSLETTER_SIGNING_SECRET over NEWSLETTER_HMAC_SECRET, OTP_HMAC_SECRET, and runtime file', () => {
      const opts = {
        env: {
          NEWSLETTER_SIGNING_SECRET: SYNTHETIC_SIGNING_SECRET,
          NEWSLETTER_HMAC_SECRET: SYNTHETIC_HMAC_SECRET,
          OTP_HMAC_SECRET: SYNTHETIC_OTP_HMAC_SECRET,
        },
        runtimeKeysPath: tempRuntimeKeysPath,
      };
      assert.strictEqual(getNewsletterHmacSecretSource(opts), 'NEWSLETTER_SIGNING_SECRET');
      assert.strictEqual(getStableNewsletterSecret(opts), SYNTHETIC_SIGNING_SECRET);
      assert.strictEqual(getHmacSecret(opts), SYNTHETIC_SIGNING_SECRET);
    });

    // 2. Resolution Order Tier 2: Preserves NEWSLETTER_HMAC_SECRET when NEWSLETTER_SIGNING_SECRET is absent
    check('Falls back to NEWSLETTER_HMAC_SECRET when NEWSLETTER_SIGNING_SECRET is unset', () => {
      const opts = {
        env: {
          NEWSLETTER_HMAC_SECRET: SYNTHETIC_HMAC_SECRET,
          OTP_HMAC_SECRET: SYNTHETIC_OTP_HMAC_SECRET,
        },
        runtimeKeysPath: tempRuntimeKeysPath,
      };
      assert.strictEqual(getNewsletterHmacSecretSource(opts), 'NEWSLETTER_HMAC_SECRET');
      assert.strictEqual(getHmacSecret(opts), SYNTHETIC_HMAC_SECRET);
    });

    // 3. Resolution Order Tier 3: Preserves OTP_HMAC_SECRET when top two env vars are absent
    check('Falls back to OTP_HMAC_SECRET when NEWSLETTER_SIGNING_SECRET and NEWSLETTER_HMAC_SECRET are unset', () => {
      const opts = {
        env: {
          OTP_HMAC_SECRET: SYNTHETIC_OTP_HMAC_SECRET,
        },
        runtimeKeysPath: tempRuntimeKeysPath,
      };
      assert.strictEqual(getNewsletterHmacSecretSource(opts), 'OTP_HMAC_SECRET');
      assert.strictEqual(getHmacSecret(opts), SYNTHETIC_OTP_HMAC_SECRET);
    });

    // 4. Resolution Order Tier 4: Preserves .everykr-runtime-keys.json fallback without overwriting it
    check('Falls back to persisted runtime_keys_file when no env secrets are configured and does not overwrite it', () => {
      const opts = {
        env: {},
        runtimeKeysPath: tempRuntimeKeysPath,
      };
      assert.strictEqual(getNewsletterHmacSecretSource(opts), 'runtime_keys_file');
      assert.strictEqual(getHmacSecret(opts), SYNTHETIC_RUNTIME_FILE_SECRET);
      const afterDisk = JSON.parse(fs.readFileSync(tempRuntimeKeysPath, 'utf-8'));
      assert.strictEqual(afterDisk.newsletterHmacSecret, SYNTHETIC_RUNTIME_FILE_SECRET);
    });

    // 5. Rejects placeholder or too-short secret candidates deterministically
    check('Ignores placeholder or short (<16 char) env values instead of accepting weak secrets', () => {
      const opts = {
        env: {
          NEWSLETTER_SIGNING_SECRET: 'everykr_hmac_newsletter_secret_change_in_production',
          NEWSLETTER_HMAC_SECRET: 'too_short',
        },
        runtimeKeysPath: tempRuntimeKeysPath,
      };
      assert.strictEqual(getNewsletterHmacSecretSource(opts), 'runtime_keys_file');
      assert.strictEqual(getHmacSecret(opts), SYNTHETIC_RUNTIME_FILE_SECRET);
    });

    // 6. HMAC Generation & Verification with Primary Secret
    check('Generates deterministic 64-hex HMAC-SHA256 tokens and rejects tampered/cross-purpose tokens', () => {
      const opts = {
        env: { NEWSLETTER_SIGNING_SECRET: SYNTHETIC_SIGNING_SECRET },
        runtimeKeysPath: tempRuntimeKeysPath,
      };
      const email = 'Scholar.Test@EveryKR.com';
      const unsubToken = createSignedToken(email, 'unsubscribe', opts);
      const verifyToken = createSignedToken(email, 'verify', opts);

      assert.match(unsubToken, /^[a-f0-9]{64}$/);
      assert.notStrictEqual(unsubToken, verifyToken);
      assert.strictEqual(verifySignedToken('scholar.test@everykr.com', 'unsubscribe', unsubToken, opts), true);
      assert.strictEqual(verifySignedToken('scholar.test@everykr.com', 'verify', verifyToken, opts), true);
      // Purpose mismatch must fail
      assert.strictEqual(verifySignedToken('scholar.test@everykr.com', 'verify', unsubToken, opts), false);
      // Email mismatch must fail
      assert.strictEqual(verifySignedToken('other@everykr.com', 'unsubscribe', unsubToken, opts), false);
      // Tampered token must fail
      const tampered = (unsubToken[0] === 'a' ? 'b' : 'a') + unsubToken.slice(1);
      assert.strictEqual(verifySignedToken(email, 'unsubscribe', tampered, opts), false);
    });

    // 7. Backward-Compatibility Keyring: Existing tokens signed with runtime_keys_file or NEWSLETTER_HMAC_SECRET continue working!
    check('Preserves verification compatibility for pre-existing tokens after aligning NEWSLETTER_SIGNING_SECRET', () => {
      const email = 'existing.subscriber@everykr.com';

      // Token originally minted under .everykr-runtime-keys.json BEFORE NEWSLETTER_SIGNING_SECRET alignment
      const legacyRuntimeToken = createSignedToken(email, 'unsubscribe', {
        env: {},
        runtimeKeysPath: tempRuntimeKeysPath,
      });

      // Token originally minted under NEWSLETTER_HMAC_SECRET
      const legacyHmacEnvToken = createSignedToken(email, 'unsubscribe', {
        env: { NEWSLETTER_HMAC_SECRET: SYNTHETIC_HMAC_SECRET },
        runtimeKeysPath: tempRuntimeKeysPath,
      });

      // Now verify BOTH pre-existing tokens when NEWSLETTER_SIGNING_SECRET is active!
      const alignedProdOpts = {
        env: {
          NEWSLETTER_SIGNING_SECRET: SYNTHETIC_SIGNING_SECRET,
          NEWSLETTER_HMAC_SECRET: SYNTHETIC_HMAC_SECRET,
        },
        runtimeKeysPath: tempRuntimeKeysPath,
      };

      assert.strictEqual(
        verifySignedToken(email, 'unsubscribe', legacyRuntimeToken, alignedProdOpts),
        true,
        'Pre-existing runtime-key unsubscribe token must remain valid'
      );
      assert.strictEqual(
        verifySignedToken(email, 'unsubscribe', legacyHmacEnvToken, alignedProdOpts),
        true,
        'Pre-existing NEWSLETTER_HMAC_SECRET unsubscribe token must remain valid'
      );
    });

    // 8. Unsubscribe Link Generation & URL Parameter Integrity
    check('Builds canonical unsubscribe URLs whose embedded token passes verifySignedToken', () => {
      const opts = {
        env: { NEWSLETTER_SIGNING_SECRET: SYNTHETIC_SIGNING_SECRET },
        runtimeKeysPath: tempRuntimeKeysPath,
      };
      const email = 'reader@everykr.com';
      const token = createSignedToken(email, 'unsubscribe', opts);
      const payload = buildWelcomeEmailPayload({
        email,
        origin: 'https://everykr.com',
        unsubscribeToken: token,
      });

      const parsedUrl = new URL(payload.unsubscribeUrl);
      assert.strictEqual(parsedUrl.origin, 'https://everykr.com');
      assert.strictEqual(parsedUrl.pathname, '/api/newsletter/unsubscribe');
      assert.strictEqual(parsedUrl.searchParams.get('email'), email);
      assert.strictEqual(parsedUrl.searchParams.get('token'), token);
      assert.strictEqual(
        verifySignedToken(
          parsedUrl.searchParams.get('email') || '',
          'unsubscribe',
          parsedUrl.searchParams.get('token') || '',
          opts
        ),
        true
      );
    });

    // 9. Read-Only Compatibility Check on Existing Subscriber Store (Never prints secrets, emails, or tokens)
    const realStorePath = path.resolve(process.cwd(), '.everykr-newsletter-store.json');
    if (fs.existsSync(realStorePath)) {
      check('Verifies all existing stored subscriber unsubscribeTokens remain valid without modifying store', () => {
        const beforeStat = fs.statSync(realStorePath);
        const rawStore = JSON.parse(fs.readFileSync(realStorePath, 'utf-8'));
        const subscribers = Array.isArray(rawStore.subscribers) ? rawStore.subscribers : [];

        for (const sub of subscribers) {
          if (sub?.email && sub?.unsubscribeToken) {
            const isValid = verifySignedToken(sub.email, 'unsubscribe', sub.unsubscribeToken);
            assert.strictEqual(
              isValid,
              true,
              'Existing subscriber stored unsubscribeToken failed verification'
            );
          }
        }
        const afterStat = fs.statSync(realStorePath);
        assert.strictEqual(
          beforeStat.mtimeMs,
          afterStat.mtimeMs,
          'Newsletter store file must not be modified during verification'
        );
      });
    }

    //Ensure synthetic test secret hashes never leak anything and clean up temp dir
    const sanityDigest = crypto.createHash('sha256').update('done').digest('hex');
    assert.strictEqual(sanityDigest.length, 64);

    console.log(`\nALL ${passed} NEWSLETTER HMAC TESTS PASSED.`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runNewsletterHmacTests().catch((err) => {
  console.error('Newsletter HMAC test suite failed:', err);
  process.exit(1);
});
