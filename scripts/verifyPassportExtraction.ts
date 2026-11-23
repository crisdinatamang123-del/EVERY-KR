/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Automated Regression Test Suite for EVERYKR Smart Application Passport AI Extraction.
 * Covers all 14 mandatory end-to-end, backend Gemini, HTTP contract, MRZ, retry, and manual-entry scenarios
 * plus structured non-PII server logging verification.
 *
 * Run with: npx tsx scripts/verifyPassportExtraction.ts
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';

// Allow Node/tsx CLI verification to load modules that transitively import Vite static image assets
registerHooks({
  load(url, context, nextLoad) {
    if (/\.(jpg|jpeg|png|webp|svg|gif)(\?.*)?$/i.test(url)) {
      return {
        format: 'module',
        shortCircuit: true,
        source: `export default ${JSON.stringify(url)};`,
      };
    }
    return nextLoad(url, context);
  },
});

import { computeIcaoCheckDigit } from '../src/utils/mrzValidator';
import type { PassportExtractionApiResponse } from '../src/types/smartApplication';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function runAsyncTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: message });
    console.error(`  [FAIL] ${name}: ${message}`);
  }
}

// Valid minimal JPEG base64 (>100 chars)
const VALID_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

function buildValidBgdMrz() {
  const passport = 'A01234567';
  const pCheck = computeIcaoCheckDigit(passport);
  const dob = '010815';
  const dobCheck = computeIcaoCheckDigit(dob);
  const expiry = '310814';
  const expCheck = computeIcaoCheckDigit(expiry);
  const optional = '<<<<<<<<<<<<<<0';
  const compositeInput = `${passport}${pCheck}${dob}${dobCheck}${expiry}${expCheck}${optional}`;
  const compositeCheck = computeIcaoCheckDigit(compositeInput);
  return {
    line1: 'P<BGDHASAN<<JAHID<<<<<<<<<<<<<<<<<<<<<<<<<<<',
    line2: `${passport}${pCheck}BGD${dob}${dobCheck}M${expiry}${expCheck}${optional}${compositeCheck}`,
  };
}

function makeMockHttpResponse(params: {
  status: number;
  body: string;
  contentType?: string;
  requestId?: string;
}) {
  const headers = new Headers();
  if (params.contentType !== undefined) {
    headers.set('content-type', params.contentType);
  }
  if (params.requestId) {
    headers.set('x-request-id', params.requestId);
  }
  return {
    status: params.status,
    headers,
    text: async () => params.body,
  };
}

async function main() {
  const {
    PRIMARY_SMART_APP_MODEL,
    FALLBACK_SMART_APP_MODEL,
    SmartAiRouteError,
    clearModelCooldownsForTesting,
    formatSmartAiStructuredLog,
    inspectGeminiGenerateContentResponse,
    parseAndRecoverJsonObject,
    runPassportExtractionPipeline,
  } = await import('../src/server/smartApplicationServer');
  const {
    extractPassportViaServerAi,
    parsePassportExtractionHttpResponse,
    uploadSmartApplicationDocument,
    clearUploadCachesForTesting,
  } = await import('../src/services/smartApplicationService');

  console.log('\n=== Passport AI Extraction Regression Suite (15 Scenarios) ===');

  // Scenario 1: Successful Gemini extraction (including markdown/prose JSON recovery)
  await runAsyncTest('1. Successful Gemini extraction returns canonical HTTP 200 contract & recovers fenced JSON', async () => {
    clearModelCooldownsForTesting();
    const mrz = buildValidBgdMrz();
    const rawJsonObj = {
      isPassport: true,
      mrzLine1: mrz.line1,
      mrzLine2: mrz.line2,
      surname: 'HASAN',
      givenNames: 'JAHID',
      passportNumber: 'A01234567',
      nationalityIso3: 'BGD',
      dateOfBirth: '2001-08-15',
      sex: 'M',
      expiryDate: '2031-08-14',
      issueDate: '2021-08-15',
      placeOfBirth: 'DHAKA',
    };

    const result = await runPassportExtractionPipeline({
      imageBase64: VALID_JPEG_BASE64,
      mimeType: 'image/jpeg',
      requestId: 'ai_test_success_01',
      authMs: 5,
      routeStart: Date.now(),
      retryBaseDelayMs: 0,
      generateContentFn: async () => ({
        text: `Here is the extracted JSON:\n\`\`\`json\n${JSON.stringify(rawJsonObj)}\n\`\`\``,
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(rawJsonObj) }] } }],
      }),
    });

    assert.equal(result.httpStatus, 200);
    assert.equal(result.parseResult, 'recovered');
    assert.equal(result.body.success, true);
    assert.equal(result.body.requestId, 'ai_test_success_01');
    assert.deepEqual(result.body.warnings, []);
    assert.equal(result.body.data.surname, 'HASAN');
    assert.equal(result.body.data.givenNames, 'JAHID');
    assert.equal(result.body.data.gender, 'Male');
    assert.equal(result.body.data.dateOfBirth, '2001-08-15');
    assert.equal(result.body.data.nationality, 'Bangladesh');
    assert.equal(result.body.data.passportNumber, 'A01234567');
    assert.equal(result.body.data.passportIssueDate, '2021-08-15');
    assert.equal(result.body.data.passportExpiryDate, '2031-08-14');
    assert.equal(result.body.data.placeOfBirth, 'DHAKA');

    // Frontend parser validates the exact HTTP 200 canonical JSON payload
    const clientParsed = await parsePassportExtractionHttpResponse(
      makeMockHttpResponse({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(result.body),
        requestId: 'ai_test_success_01',
      })
    );
    assert.equal(clientParsed.success, true);
    assert.equal(clientParsed.ok, true);
    assert.equal(clientParsed.readable, true);
    assert.equal(clientParsed.data?.passportNumber, 'A01234567');
    assert.equal(clientParsed.mrzValidation.isValid, true);
  });

  // Scenario 2: Empty HTTP 200 response
  await runAsyncTest('2. Empty HTTP 200 response is NEVER treated as success and returns retryable EMPTY_SERVER_RESPONSE', async () => {
    const parsed = await parsePassportExtractionHttpResponse(
      makeMockHttpResponse({
        status: 200,
        contentType: 'application/json',
        body: '   ',
        requestId: 'ai_empty_200',
      })
    );
    assert.equal(parsed.success, false);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.readable, false);
    assert.equal(parsed.canonicalErrorCode, 'EMPTY_SERVER_RESPONSE');
    assert.equal(parsed.error?.code, 'EMPTY_SERVER_RESPONSE');
    assert.equal(parsed.errorCode, 'empty_server_response');
    assert.notEqual(parsed.errorCode, 'unknown');
    assert.equal(parsed.retryable, true);
    assert.equal(parsed.httpStatus, 200);
    assert.equal(parsed.requestId, 'ai_empty_200');
  });

  // Scenario 3: HTML returned instead of JSON (HTTP 200 SPA fallback / proxy error page)
  await runAsyncTest('3. HTML returned instead of JSON (HTTP 200 text/html) returns UNEXPECTED_HTML_RESPONSE with retryable=true', async () => {
    const parsed = await parsePassportExtractionHttpResponse(
      makeMockHttpResponse({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<!DOCTYPE html><html><head><title>EVERYKR</title></head><body><div id="root"></div></body></html>',
      })
    );
    assert.equal(parsed.success, false);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.readable, false);
    assert.equal(parsed.canonicalErrorCode, 'UNEXPECTED_HTML_RESPONSE');
    assert.equal(parsed.error?.code, 'UNEXPECTED_HTML_RESPONSE');
    assert.equal(parsed.errorCode, 'unexpected_html_response');
    assert.equal(parsed.retryable, true);

    // Even if Content-Type was mistakenly set to application/json but body is HTML
    const htmlWithJsonHeader = await parsePassportExtractionHttpResponse(
      makeMockHttpResponse({
        status: 200,
        contentType: 'application/json',
        body: '<html><body>502 Bad Gateway</body></html>',
      })
    );
    assert.equal(htmlWithJsonHeader.canonicalErrorCode, 'UNEXPECTED_HTML_RESPONSE');
    assert.equal(htmlWithJsonHeader.retryable, true);
  });

  // Scenario 4: Malformed JSON (backend Gemini + frontend HTTP parser)
  await runAsyncTest('4. Malformed JSON from Gemini returns HTTP 502 MALFORMED_AI_JSON, and malformed HTTP JSON returns MALFORMED_SERVER_JSON', async () => {
    clearModelCooldownsForTesting();
    let calls = 0;
    await assert.rejects(
      async () => {
        await runPassportExtractionPipeline({
          imageBase64: VALID_JPEG_BASE64,
          mimeType: 'image/jpeg',
          requestId: 'ai_malformed_04',
          authMs: 3,
          routeStart: Date.now(),
          retryBaseDelayMs: 0,
          generateContentFn: async () => {
            calls += 1;
            return {
              text: '{"isPassport": true, "surname": "TRUNCATED_WITHOUT_CLOSING',
              candidates: [{ finishReason: 'MAX_TOKENS' }],
            };
          },
        });
      },
      (err: unknown) =>
        err instanceof SmartAiRouteError &&
        err.statusCode === 502 &&
        err.canonicalCode === 'MALFORMED_AI_JSON' &&
        err.errorCode === 'malformed_ai_json' &&
        err.retryable === true
    );
    assert.ok(calls >= 2, 'Backend should attempt fallback model when primary returns malformed JSON');

    // Also verify parseAndRecoverJsonObject explicitly marks malformed text
    const recovery = parseAndRecoverJsonObject('not json at all {{{');
    assert.equal(recovery.parsed, null);
    assert.equal(recovery.parseResult, 'malformed');

    // Frontend HTTP parser receiving broken JSON over HTTP 200
    const clientParsed = await parsePassportExtractionHttpResponse(
      makeMockHttpResponse({
        status: 200,
        contentType: 'application/json',
        body: '{"success": true, "data": ',
      })
    );
    assert.equal(clientParsed.success, false);
    assert.equal(clientParsed.canonicalErrorCode, 'MALFORMED_SERVER_JSON');
    assert.equal(clientParsed.retryable, true);

    // Frontend HTTP parser receiving HTTP 200 with empty `{}` object
    const emptySchema = await parsePassportExtractionHttpResponse(
      makeMockHttpResponse({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      })
    );
    assert.equal(emptySchema.success, false);
    assert.equal(emptySchema.canonicalErrorCode, 'INVALID_RESPONSE_SCHEMA');
    assert.equal(emptySchema.retryable, true);
  });

  // Scenario 5: Gemini 503 (fallback recovery + exhausted 503)
  await runAsyncTest('5. Gemini 503 retries on fallback model and returns HTTP 503 SERVICE_UNAVAILABLE when exhausted', async () => {
    clearModelCooldownsForTesting();
    const modelsTried: string[] = [];
    const mrz = buildValidBgdMrz();

    // Case A: Primary returns 503, fallback succeeds
    const recovered = await runPassportExtractionPipeline({
      imageBase64: VALID_JPEG_BASE64,
      mimeType: 'image/jpeg',
      requestId: 'ai_503_recover',
      authMs: 2,
      routeStart: Date.now(),
      retryBaseDelayMs: 0,
      generateContentFn: async ({ model }) => {
        modelsTried.push(model);
        if (model === PRIMARY_SMART_APP_MODEL) {
          const e: any = new Error('503 UNAVAILABLE: This model is currently experiencing high demand.');
          e.status = 503;
          throw e;
        }
        return {
          text: JSON.stringify({
            isPassport: true,
            mrzLine1: mrz.line1,
            mrzLine2: mrz.line2,
            surname: 'HASAN',
            givenNames: 'JAHID',
            passportNumber: 'A01234567',
            nationalityIso3: 'BGD',
            dateOfBirth: '2001-08-15',
            sex: 'M',
            expiryDate: '2031-08-14',
            issueDate: '',
            placeOfBirth: '',
          }),
          candidates: [{ finishReason: 'STOP' }],
        };
      },
    });
    assert.equal(recovered.httpStatus, 200);
    assert.equal(recovered.modelUsed, FALLBACK_SMART_APP_MODEL);
    assert.equal(recovered.retryCount, 1);
    assert.deepEqual(modelsTried, [PRIMARY_SMART_APP_MODEL, FALLBACK_SMART_APP_MODEL]);

    // Case B: All models return 503 -> capped retries then HTTP 503 SERVICE_UNAVAILABLE
    clearModelCooldownsForTesting();
    let totalAttempts = 0;
    await assert.rejects(
      async () => {
        await runPassportExtractionPipeline({
          imageBase64: VALID_JPEG_BASE64,
          mimeType: 'image/jpeg',
          requestId: 'ai_503_exhausted',
          authMs: 2,
          routeStart: Date.now(),
          retryBaseDelayMs: 5,
          generateContentFn: async () => {
            totalAttempts += 1;
            const e: any = new Error('503 UNAVAILABLE');
            e.status = 503;
            throw e;
          },
        });
      },
      (err: unknown) =>
        err instanceof SmartAiRouteError &&
        err.statusCode === 503 &&
        err.canonicalCode === 'SERVICE_UNAVAILABLE' &&
        err.retryable === true
    );
    assert.equal(totalAttempts, 4, 'Should cap retries at 2 passes x 2 verified models = 4 attempts');
  });

  // Scenario 6: Gemini 429
  await runAsyncTest('6. Gemini 429 rate limit returns HTTP 429 RATE_LIMITED with retryable=true', async () => {
    clearModelCooldownsForTesting();
    await assert.rejects(
      async () => {
        await runPassportExtractionPipeline({
          imageBase64: VALID_JPEG_BASE64,
          mimeType: 'image/jpeg',
          requestId: 'ai_429_test',
          authMs: 2,
          routeStart: Date.now(),
          retryBaseDelayMs: 5,
          generateContentFn: async () => {
            const e: any = new Error('429 RESOURCE_EXHAUSTED: Quota exceeded');
            e.status = 429;
            throw e;
          },
        });
      },
      (err: unknown) =>
        err instanceof SmartAiRouteError &&
        err.statusCode === 429 &&
        err.canonicalCode === 'RATE_LIMITED' &&
        err.errorCode === 'rate_limited' &&
        err.retryable === true
    );
  });

  // Scenario 7: Invalid API key
  await runAsyncTest('7. Invalid Gemini API key fails fast (1 attempt, zero retry loop) with HTTP 403 API_KEY_INVALID & retryable=false', async () => {
    clearModelCooldownsForTesting();
    let attempts = 0;
    await assert.rejects(
      async () => {
        await runPassportExtractionPipeline({
          imageBase64: VALID_JPEG_BASE64,
          mimeType: 'image/jpeg',
          requestId: 'ai_bad_key',
          authMs: 2,
          routeStart: Date.now(),
          retryBaseDelayMs: 5,
          generateContentFn: async () => {
            attempts += 1;
            const e: any = new Error('API_KEY_INVALID: API key not valid. Please pass a valid API key.');
            e.status = 400; // Even if upstream wraps API_KEY_INVALID inside 400 or 403
            throw e;
          },
        });
      },
      (err: unknown) =>
        err instanceof SmartAiRouteError &&
        err.statusCode === 403 &&
        err.canonicalCode === 'API_KEY_INVALID' &&
        err.errorCode === 'api_permission_denied' &&
        err.retryable === false
    );
    assert.equal(attempts, 1, 'Invalid API key must fail fast without retrying');
  });

  // Scenario 8: Safety-blocked response
  await runAsyncTest('8. Safety-blocked Gemini response returns HTTP 422 SAFETY_BLOCKED (NEVER HTTP 200) and fails fast', async () => {
    clearModelCooldownsForTesting();
    let attempts = 0;
    await assert.rejects(
      async () => {
        await runPassportExtractionPipeline({
          imageBase64: VALID_JPEG_BASE64,
          mimeType: 'image/jpeg',
          requestId: 'ai_safety_08',
          authMs: 2,
          routeStart: Date.now(),
          retryBaseDelayMs: 0,
          generateContentFn: async () => {
            attempts += 1;
            return {
              text: '',
              candidates: [{ finishReason: 'SAFETY' }],
            };
          },
        });
      },
      (err: unknown) =>
        err instanceof SmartAiRouteError &&
        err.statusCode === 422 &&
        err.canonicalCode === 'SAFETY_BLOCKED' &&
        err.errorCode === 'safety_blocked' &&
        err.retryable === false &&
        err.finishReason === 'SAFETY'
    );
    assert.equal(attempts, 1, 'Safety block must not waste retries');

    // Prompt-level blockReason detection
    const promptBlocked = inspectGeminiGenerateContentResponse({
      promptFeedback: { blockReason: 'PROHIBITED_CONTENT' },
      candidates: [],
    });
    assert.equal(promptBlocked.status, 'safety_blocked');
    assert.equal(promptBlocked.finishReason, 'PROMPT_PROHIBITED_CONTENT');
  });

  // Scenario 9: Request timeout (backend + frontend)
  await runAsyncTest('9. Request timeout returns HTTP 504 GEMINI_TIMEOUT with retryable=true on both backend and frontend', async () => {
    clearModelCooldownsForTesting();
    await assert.rejects(
      async () => {
        await runPassportExtractionPipeline({
          imageBase64: VALID_JPEG_BASE64,
          mimeType: 'image/jpeg',
          requestId: 'ai_timeout_09',
          authMs: 2,
          routeStart: Date.now(),
          perAttemptTimeoutMs: 40,
          totalBudgetMs: 120,
          retryBaseDelayMs: 0,
          generateContentFn: async ({ config }) =>
            new Promise((_resolve, reject) => {
              config.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')));
            }),
        });
      },
      (err: unknown) =>
        err instanceof SmartAiRouteError &&
        err.statusCode === 504 &&
        err.canonicalCode === 'GEMINI_TIMEOUT' &&
        err.errorCode === 'timeout' &&
        err.retryable === true
    );

    // Frontend timeout verification
    const clientTimeout = await extractPassportViaServerAi(
      VALID_JPEG_BASE64,
      'image/jpeg',
      'app_timeout_test',
      {
        timeoutMs: 35,
        skipAuthHeaders: true,
        fetchFn: ((_url: any, init: any) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const abortErr: any = new Error('The operation was aborted.');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          })) as typeof fetch,
      }
    );
    assert.equal(clientTimeout.success, false);
    assert.equal(clientTimeout.canonicalErrorCode, 'GEMINI_TIMEOUT');
    assert.equal(clientTimeout.errorCode, 'timeout');
    assert.equal(clientTimeout.httpStatus, 504);
    assert.equal(clientTimeout.retryable, true);
  });

  // Scenario 10: Missing Gemini candidates
  await runAsyncTest('10. Missing/empty Gemini candidates returns HTTP 502 MISSING_CANDIDATES with retryable=true', async () => {
    clearModelCooldownsForTesting();
    await assert.rejects(
      async () => {
        await runPassportExtractionPipeline({
          imageBase64: VALID_JPEG_BASE64,
          mimeType: 'image/jpeg',
          requestId: 'ai_no_candidates_10',
          authMs: 2,
          routeStart: Date.now(),
          retryBaseDelayMs: 0,
          generateContentFn: async () => ({
            candidates: [],
          }),
        });
      },
      (err: unknown) =>
        err instanceof SmartAiRouteError &&
        err.statusCode === 502 &&
        err.canonicalCode === 'MISSING_CANDIDATES' &&
        err.errorCode === 'missing_candidates' &&
        err.retryable === true
    );

    // Also verify parts fallback when response.text getter is undefined but candidate parts exist
    const partsExtraction = inspectGeminiGenerateContentResponse({
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [
              { thought: true, text: 'internal reasoning to ignore' },
              { text: '{"isPassport":true,"surname":"KIM"}' },
            ],
          },
        },
      ],
    });
    assert.equal(partsExtraction.status, 'ok');
    assert.equal(partsExtraction.text, '{"isPassport":true,"surname":"KIM"}');
  });

  // Scenario 11: Valid passport MRZ (MRZ overrides visual OCR typo)
  await runAsyncTest('11. Valid ICAO 9303 TD3 MRZ takes authoritative precedence over visual OCR typos with zero warnings', async () => {
    clearModelCooldownsForTesting();
    const mrz = buildValidBgdMrz();
    const res = await runPassportExtractionPipeline({
      imageBase64: VALID_JPEG_BASE64,
      mimeType: 'image/jpeg',
      requestId: 'ai_valid_mrz_11',
      authMs: 2,
      routeStart: Date.now(),
      retryBaseDelayMs: 0,
      generateContentFn: async () => ({
        text: JSON.stringify({
          isPassport: true,
          mrzLine1: mrz.line1,
          mrzLine2: mrz.line2,
          // Intentional visual OCR typo — verified MRZ MUST override these
          surname: 'HASANN',
          givenNames: 'JAHIDD',
          passportNumber: 'A01234568',
          nationalityIso3: 'IND',
          dateOfBirth: '2001-08-19',
          sex: 'F',
          expiryDate: '2031-08-19',
          issueDate: '2021-08-15',
          placeOfBirth: 'Dhaka',
        }),
        candidates: [{ finishReason: 'STOP' }],
      }),
    });

    assert.equal(res.httpStatus, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.trustedSource, 'mrz');
    assert.equal(res.body.mrzValidation.isValid, true);
    assert.deepEqual(res.body.warnings, []);
    assert.deepEqual(res.body.needsCheckFields, []);
    // Verified MRZ values won over visual typos
    assert.equal(res.body.data.surname, 'HASAN');
    assert.equal(res.body.data.givenNames, 'JAHID');
    assert.equal(res.body.data.passportNumber, 'A01234567');
    assert.equal(res.body.data.nationality, 'Bangladesh');
    assert.equal(res.body.data.dateOfBirth, '2001-08-15');
    assert.equal(res.body.data.gender, 'Male');
    assert.equal(res.body.data.passportExpiryDate, '2031-08-14');
  });

  // Scenario 12: Invalid MRZ check digits
  await runAsyncTest('12. Invalid ICAO 9303 MRZ check digits emit warnings and populate needsCheckFields for manual confirmation', async () => {
    clearModelCooldownsForTesting();
    const mrz = buildValidBgdMrz();
    // Corrupt passport number digit in line2 without changing check digit
    const tamperedLine2 = 'A01234569' + mrz.line2.slice(9);

    const res = await runPassportExtractionPipeline({
      imageBase64: VALID_JPEG_BASE64,
      mimeType: 'image/jpeg',
      requestId: 'ai_invalid_mrz_12',
      authMs: 2,
      routeStart: Date.now(),
      retryBaseDelayMs: 0,
      generateContentFn: async () => ({
        text: JSON.stringify({
          isPassport: true,
          mrzLine1: mrz.line1,
          mrzLine2: tamperedLine2,
          surname: 'HASAN',
          givenNames: 'JAHID',
          passportNumber: 'A01234569',
          nationalityIso3: 'BGD',
          dateOfBirth: '2001-08-15',
          sex: 'M',
          expiryDate: '2031-08-14',
          issueDate: '2021-08-15',
          placeOfBirth: 'Dhaka',
        }),
        candidates: [{ finishReason: 'STOP' }],
      }),
    });

    assert.equal(res.httpStatus, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.trustedSource, 'visual');
    assert.equal(res.body.mrzValidation.hasMrz, true);
    assert.equal(res.body.mrzValidation.isValid, false);
    assert.equal(res.body.mrzValidation.passportCheckPassed, false);
    assert.equal(res.body.mrzValidation.compositeCheckPassed, false);
    assert.ok(res.body.warnings.length >= 2, 'Must surface MRZ check-digit warnings');
    assert.ok(
      res.body.needsCheckFields.includes('personal.passportNumber'),
      'Passport number must be flagged for manual check'
    );
  });

  // Scenario 13: Retry without duplicate Storage upload
  await runAsyncTest('13. Retry AI scan after failure re-runs ONLY AI extraction with ZERO duplicate Storage uploads', async () => {
    clearUploadCachesForTesting();
    let storageUploadCount = 0;
    let aiExtractionCount = 0;

    const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const file = new File([jpgBytes], 'passport_retry_test.jpg', { type: 'image/jpeg' });

    // Step 1: Upload passport once to private Storage
    const savedDoc = await uploadSmartApplicationDocument({
      userId: 'uid_student_retry',
      applicationId: 'app_retry_test_01',
      docType: 'passport',
      label: 'Passport',
      file,
      aiDetected: true,
      verified: false,
      syncFirestoreMetadata: true,
      customTransport: {
        authenticatedUid: 'uid_student_retry',
        uploadAttempt: async ({ storagePath, file: f }) => {
          storageUploadCount += 1;
          return { fullPath: storagePath, bytesTransferred: f.size };
        },
        persistMetadata: async () => {},
      },
    });
    assert.equal(storageUploadCount, 1);
    assert.ok(savedDoc.storagePath.includes('/passport/'));

    // Step 2: First AI extraction fails with empty HTTP 200
    const mockFetch: typeof fetch = (async () => {
      aiExtractionCount += 1;
      if (aiExtractionCount === 1) {
        return makeMockHttpResponse({
          status: 200,
          contentType: 'application/json',
          body: '',
          requestId: 'ai_retry_fail_1',
        }) as unknown as Response;
      }
      return makeMockHttpResponse({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            surname: 'KIM',
            givenNames: 'MINJUN',
            gender: 'Male',
            dateOfBirth: '2002-03-11',
            nationality: 'South Korea',
            passportNumber: 'M12345678',
            passportIssueDate: '2022-03-11',
            passportExpiryDate: '2032-03-10',
            placeOfBirth: 'Seoul',
          },
          warnings: [],
          requestId: 'ai_retry_ok_2',
        }),
      }) as unknown as Response;
    }) as typeof fetch;

    const firstAttempt = await extractPassportViaServerAi(
      VALID_JPEG_BASE64,
      'image/jpeg',
      'app_retry_test_01',
      { fetchFn: mockFetch, skipAuthHeaders: true }
    );
    assert.equal(firstAttempt.success, false);
    assert.equal(firstAttempt.canonicalErrorCode, 'EMPTY_SERVER_RESPONSE');
    assert.equal(firstAttempt.retryable, true);

    // Step 3: Retry AI extraction ONLY (do NOT call uploadSmartApplicationDocument again)
    const secondAttempt = await extractPassportViaServerAi(
      VALID_JPEG_BASE64,
      'image/jpeg',
      'app_retry_test_01',
      { fetchFn: mockFetch, skipAuthHeaders: true }
    );
    assert.equal(secondAttempt.success, true);
    assert.equal(secondAttempt.data?.surname, 'KIM');
    assert.equal(storageUploadCount, 1, 'Storage upload count MUST remain 1 after AI retry');
    assert.equal(aiExtractionCount, 2, 'AI extraction should have run twice');

    // Static verification that SmartUploadDropzone enforces AI-only retry & in-flight deduplication
    const dropzoneSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/applications/SmartUploadDropzone.tsx'),
      'utf8'
    );
    assert.match(dropzoneSrc, /extractionInFlightRef/);
    assert.match(dropzoneSrc, /lastRetryActionRef\.current = null;\s*\n\s*if \(!aiConsentGranted\)/);
    assert.match(dropzoneSrc, /await runAiExtraction\(retrySignal\);/);
  });

  // Scenario 14: Manual entry after AI failure
  await runAsyncTest('14. Manual entry after AI failure preserves uploaded file and never overwrites user-entered fields', async () => {
    // Simulate a failed canonical AI response (e.g., SAFETY_BLOCKED 422)
    const failedResponse: PassportExtractionApiResponse = await parsePassportExtractionHttpResponse(
      makeMockHttpResponse({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SAFETY_BLOCKED',
            message: 'Image blocked by safety filter. Enter details manually.',
            retryable: false,
          },
          requestId: 'ai_manual_14',
        }),
      })
    );
    assert.equal(failedResponse.success, false);
    assert.equal(failedResponse.ok, false);
    assert.equal(failedResponse.readable, false);
    assert.equal(failedResponse.canonicalErrorCode, 'SAFETY_BLOCKED');
    assert.equal(failedResponse.retryable, false);

    // Verify ApplicationWizardPage handlePassportExtracted guards against failed results
    // so existing or manually entered personal fields are never cleared/corrupted
    const wizardSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/applications/ApplicationWizardPage.tsx'),
      'utf8'
    );
    assert.match(
      wizardSrc,
      /if \(!result\.ok \|\| !result\.readable \|\| result\.success === false\) return;/
    );

    // Verify SmartUploadDropzone does not call onPassportExtracted when extraction failed
    const dropzoneSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/applications/SmartUploadDropzone.tsx'),
      'utf8'
    );
    const guardIdx = dropzoneSrc.indexOf('if (!isSuccessfulExtraction)');
    const callbackIdx = dropzoneSrc.indexOf('onPassportExtracted(extraction);');
    assert.ok(guardIdx > 0 && callbackIdx > guardIdx, 'onPassportExtracted must only execute after success guard');
  });

  // Scenario 15: Structured non-PII server operational logs
  await runAsyncTest('15. Structured server logs contain all required telemetry fields with ZERO PII or secrets', async () => {
    const line = formatSmartAiStructuredLog({
      event: 'smart_ai_request',
      requestId: 'ai_log_test_15',
      route: 'extract-passport',
      modelId: PRIMARY_SMART_APP_MODEL,
      durationMs: 1480,
      httpStatus: 502,
      upstreamStatus: 502,
      finishReason: 'MAX_TOKENS',
      parseResult: 'malformed',
      failureStage: 'json_parse',
      errorCode: 'malformed_ai_json',
      errorCategory: 'MALFORMED_AI_JSON',
      retryCount: 2,
    });
    const parsed = JSON.parse(line);
    assert.equal(parsed.requestId, 'ai_log_test_15');
    assert.equal(parsed.endpoint, '/api/smart-applications/ai/extract-passport');
    assert.equal(parsed.durationMs, 1480);
    assert.equal(parsed.modelId, PRIMARY_SMART_APP_MODEL);
    assert.equal(parsed.upstreamStatus, 502);
    assert.equal(parsed.finishReason, 'MAX_TOKENS');
    assert.equal(parsed.parseResult, 'malformed');
    assert.equal(parsed.errorCategory, 'MALFORMED_AI_JSON');
    assert.equal(parsed.retryCount, 2);

    // Ensure no PII keys exist in log schema
    for (const forbiddenKey of [
      'passportNumber',
      'mrzLine1',
      'mrzLine2',
      'surname',
      'givenNames',
      'dateOfBirth',
      'imageBase64',
      'apiKey',
    ]) {
      assert.equal(forbiddenKey in parsed, false, `Log must NEVER contain "${forbiddenKey}"`);
    }

    // Ensure HTTP 200 success logs omit error/failure fields (preventing false-positive error detection)
    const okLine = formatSmartAiStructuredLog({
      event: 'smart_ai_request',
      requestId: 'ai_log_test_15_ok',
      route: 'extract-passport',
      modelId: PRIMARY_SMART_APP_MODEL,
      durationMs: 920,
      httpStatus: 200,
      finishReason: 'STOP',
      parseResult: 'ok',
      failureStage: 'none',
      errorCode: null,
      errorCategory: null,
      retryCount: 0,
    });
    const okParsed = JSON.parse(okLine);
    assert.equal(okParsed.httpStatus, 200);
    assert.equal(okParsed.outcome, 'ok');
    assert.equal('errorCode' in okParsed, false, 'HTTP 200 log must omit errorCode');
    assert.equal('errorCategory' in okParsed, false, 'HTTP 200 log must omit errorCategory');
    assert.equal('failureStage' in okParsed, false, 'HTTP 200 log must omit failureStage');
    assert.equal(/error|fail/i.test(okLine), false, 'HTTP 200 log must not contain false-positive error keywords');
  });

  console.log('\n=== Passport Extraction Test Summary ===');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

void main();
