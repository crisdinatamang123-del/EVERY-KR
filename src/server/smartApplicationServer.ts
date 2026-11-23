/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR "Apply Now" Smart Application System — Server-Side Express Router
 * - Authenticated Gemini document extraction & classification (NEVER exposes API keys to client)
 * - ICAO 9303 MRZ check-digit verification in code
 * - Status-change student email notifications via automatedEmailService
 */

import crypto from 'crypto';
import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  verifyCallerIdentityServer,
  verifyFirebaseIdTokenServer,
} from './userManagementService.ts';
import { sendApplicationStatusChangeEmailServer } from './automatedEmailService.ts';
import { validateTd3Mrz, iso3ToCountryName } from '../utils/mrzValidator.ts';
import {
  normalizeSmartApplicationStatus,
  SMART_APPLICATION_STATUS_ORDER,
} from '../types/smartApplication.ts';
import type {
  PassportCanonicalData,
  PassportCanonicalErrorCode,
  PassportExtractionApiResponse,
  DocumentClassificationApiResponse,
  SmartUploadAiErrorCode,
} from '../types/smartApplication.ts';
import {
  authorizeSmartApplicationUpload,
  authorizeSmartApplicationDocumentRead,
  consumeAndVerifyUploadTicketAsync,
  consumeAndVerifyReadTicketAsync,
  extractFirebaseIdTokenFromHeaders,
  isStorageIamPermissionError,
  resolveVerifiedStorageCaller,
  uploadVerifiedBufferToPrivateStorage,
  downloadPrivateStorageObject,
} from './smartApplicationStorageAuth.ts';
import {
  isCanonicalAdminClaims,
  resolveCanonicalStorageRole,
} from './enterpriseRbacCore.ts';

// Empirically verified against live Gemini API with ICAO 9303 MRZ extraction:
// Primary: gemini-4-hydrogen pinned to ThinkingLevel.LOW for fast, high-accuracy multimodal structured JSON
export const PRIMARY_SMART_APP_MODEL = 'gemini-4-hydrogen';
// Fallback: gemini-3.1-flash-lite pinned to ThinkingLevel.MINIMAL
export const FALLBACK_SMART_APP_MODEL = 'gemini-3.1-flash-lite';

const GEMINI_PER_ATTEMPT_TIMEOUT_MS = 18_000;
const GEMINI_TOTAL_BUDGET_MS = 40_000;
const GEMINI_RETRY_BACKOFF_MS = 850;
const MAX_AI_IMAGE_BASE64_CHARS = 6_000_000; // ~4.5 MB decoded image cap for AI preview

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

// Simple in-memory per-user rate limiter (max 30 AI calls per 5 minutes)
const rateLimitBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX_CALLS = 30;

function checkAiRateLimit(key: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitBuckets.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX_CALLS) {
    rateLimitBuckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateLimitBuckets.set(key, timestamps);
  return true;
}

let cachedGeminiClient: GoogleGenAI | null = null;
let cachedGeminiApiKey = '';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) return null;
  if (cachedGeminiClient && cachedGeminiApiKey === apiKey) {
    return cachedGeminiClient;
  }
  cachedGeminiApiKey = apiKey;
  cachedGeminiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return cachedGeminiClient;
}

export type SmartAiFailureStage =
  | 'none'
  | 'auth'
  | 'rate_limit'
  | 'validation'
  | 'config'
  | 'gemini_request'
  | 'json_parse'
  | 'safety_block'
  | 'missing_candidates'
  | 'empty_response'
  | 'unreadable';

export type SmartAiParseResult =
  | 'ok'
  | 'recovered'
  | 'empty'
  | 'malformed'
  | 'blocked'
  | 'missing_candidates'
  | 'skipped';

export interface SmartAiStructuredLog {
  event: 'smart_ai_request';
  requestId: string;
  route: 'extract-passport' | 'classify-and-extract';
  endpoint?: string;
  modelId: string | null;
  durationMs: number;
  httpStatus: number;
  failureStage: SmartAiFailureStage;
  errorCode: SmartUploadAiErrorCode | null;
  errorCategory?: PassportCanonicalErrorCode | null;
  upstreamStatus?: number;
  finishReason?: string | null;
  parseResult?: SmartAiParseResult;
  retryCount?: number;
}

export function mapSmartAiErrorCodeToCanonical(
  code?: SmartUploadAiErrorCode | null
): PassportCanonicalErrorCode {
  switch (code) {
    case 'timeout':
      return 'GEMINI_TIMEOUT';
    case 'cancelled':
      return 'REQUEST_CANCELLED';
    case 'offline':
      return 'CLIENT_OFFLINE';
    case 'rate_limited':
      return 'RATE_LIMITED';
    case 'auth_required':
      return 'AUTH_REQUIRED';
    case 'api_permission_denied':
      return 'API_KEY_INVALID';
    case 'endpoint_or_model_not_found':
      return 'MODEL_NOT_FOUND';
    case 'payload_too_large':
      return 'PAYLOAD_TOO_LARGE';
    case 'invalid_image':
      return 'INVALID_IMAGE';
    case 'internal_error':
      return 'INTERNAL_ERROR';
    case 'service_unavailable':
      return 'SERVICE_UNAVAILABLE';
    case 'safety_blocked':
      return 'SAFETY_BLOCKED';
    case 'empty_ai_response':
      return 'EMPTY_AI_RESPONSE';
    case 'malformed_ai_json':
      return 'MALFORMED_AI_JSON';
    case 'missing_candidates':
      return 'MISSING_CANDIDATES';
    case 'unreadable':
      return 'UNREADABLE_PASSPORT';
    case 'empty_server_response':
      return 'EMPTY_SERVER_RESPONSE';
    case 'unexpected_html_response':
      return 'UNEXPECTED_HTML_RESPONSE';
    case 'malformed_server_json':
      return 'MALFORMED_SERVER_JSON';
    case 'invalid_response_schema':
      return 'INVALID_RESPONSE_SCHEMA';
    default:
      return 'AI_EXTRACTION_FAILED';
  }
}

/**
 * Structured server-side operational logging for Smart Application AI endpoints.
 * Strictly emits ONLY non-sensitive metadata (requestId, endpoint, route, modelId, durationMs,
 * httpStatus, upstreamStatus, finishReason, parseResult, errorCategory, retryCount, failureStage, errorCode).
 * NEVER logs PII, passport numbers, MRZ, base64 images, names, dates of birth, or API keys.
 */
export function formatSmartAiStructuredLog(entry: SmartAiStructuredLog): string {
  const endpoint = entry.endpoint || `/api/smart-applications/ai/${entry.route}`;
  const errorCategory =
    entry.errorCategory !== undefined
      ? entry.errorCategory
      : entry.errorCode
      ? mapSmartAiErrorCodeToCanonical(entry.errorCode)
      : null;
  const hasFailure =
    entry.httpStatus >= 400 ||
    entry.failureStage !== 'none' ||
    Boolean(entry.errorCode) ||
    Boolean(errorCategory);

  return JSON.stringify({
    event: entry.event,
    requestId: entry.requestId,
    endpoint,
    route: entry.route,
    modelId: entry.modelId,
    durationMs: entry.durationMs,
    httpStatus: entry.httpStatus,
    ...(hasFailure
      ? {
          failureStage: entry.failureStage,
          errorCode: entry.errorCode,
          errorCategory,
        }
      : {
          outcome: 'ok',
        }),
    ...(entry.upstreamStatus ? { upstreamStatus: entry.upstreamStatus } : {}),
    ...(entry.finishReason ? { finishReason: entry.finishReason } : {}),
    ...(entry.parseResult ? { parseResult: entry.parseResult } : {}),
    ...(typeof entry.retryCount === 'number' ? { retryCount: entry.retryCount } : {}),
  });
}

function logSmartAiEvent(entry: SmartAiStructuredLog, level: 'info' | 'warn' | 'error' = 'info'): void {
  const line = formatSmartAiStructuredLog(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export class SmartAiRouteError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: SmartUploadAiErrorCode;
  public readonly canonicalCode: PassportCanonicalErrorCode;
  public readonly retryable: boolean;
  public readonly upstreamStatus?: number;
  public readonly modelId?: string;
  public readonly failureStage: SmartAiFailureStage;
  public readonly finishReason?: string;
  public readonly parseResult?: SmartAiParseResult;
  public readonly retryCount?: number;

  constructor(
    statusCode: number,
    errorCode: SmartUploadAiErrorCode,
    message: string,
    retryable: boolean,
    upstreamStatus?: number,
    meta?: {
      modelId?: string;
      failureStage?: SmartAiFailureStage;
      canonicalCode?: PassportCanonicalErrorCode;
      finishReason?: string;
      parseResult?: SmartAiParseResult;
      retryCount?: number;
    }
  ) {
    super(message);
    this.name = 'SmartAiRouteError';
    // Never emit HTTP 200 for an error state
    this.statusCode = statusCode >= 400 ? statusCode : 500;
    this.errorCode = errorCode;
    this.canonicalCode = meta?.canonicalCode || mapSmartAiErrorCodeToCanonical(errorCode);
    this.retryable = retryable;
    this.upstreamStatus = upstreamStatus;
    this.modelId = meta?.modelId;
    this.failureStage = meta?.failureStage || 'gemini_request';
    this.finishReason = meta?.finishReason;
    this.parseResult = meta?.parseResult;
    this.retryCount = meta?.retryCount;
  }
}

export function buildCanonicalPassportErrorPayload(params: {
  errorCode: SmartUploadAiErrorCode;
  canonicalCode?: PassportCanonicalErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
  modelUsed?: string;
}) {
  const canonicalCode = params.canonicalCode || mapSmartAiErrorCodeToCanonical(params.errorCode);
  return {
    success: false as const,
    error: {
      code: canonicalCode,
      message: params.message,
      retryable: params.retryable,
    },
    requestId: params.requestId,
    // Backward-compatible fields for existing callers
    ok: false as const,
    readable: false as const,
    errorCode: params.errorCode,
    canonicalErrorCode: canonicalCode,
    retryable: params.retryable,
    message: params.message,
    ...(params.modelUsed ? { modelUsed: params.modelUsed } : {}),
  };
}

/**
 * Extracts raw JSON string from a Gemini text output, unwrapping markdown code fences
 * and recovering balanced top-level JSON objects even when wrapped in leading/trailing prose.
 */
export function extractJsonTextFromGeminiResponse(rawText: string | undefined | null): string {
  const trimmed = String(rawText || '')
    .replace(/^\uFEFF/, '')
    .trim();
  if (!trimmed) return '';

  // 1. Exact fenced block (```json ... ``` or ``` ... ```)
  const exactFence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (exactFence && exactFence[1]) {
    return exactFence[1].trim();
  }

  // 2. Fenced block embedded inside surrounding prose
  const embeddedFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (embeddedFence && embeddedFence[1]) {
    return embeddedFence[1].trim();
  }

  // 3. Direct JSON object check
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  // 4. Scan for balanced top-level JSON object { ... } respecting string literals
  const startIdx = trimmed.indexOf('{');
  if (startIdx >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = startIdx; i < trimmed.length; i += 1) {
      const ch = trimmed[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return trimmed.slice(startIdx, i + 1).trim();
        }
      }
    }
  }

  return trimmed;
}

export function parseAndRecoverJsonObject(rawText: string | undefined | null): {
  parsed: Record<string, unknown> | null;
  parseResult: SmartAiParseResult;
} {
  const raw = String(rawText || '')
    .replace(/^\uFEFF/, '')
    .trim();
  if (!raw) {
    return { parsed: null, parseResult: 'empty' };
  }

  // Fast path: direct strict JSON parse
  try {
    const direct = JSON.parse(raw);
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return { parsed: direct as Record<string, unknown>, parseResult: 'ok' };
    }
  } catch {
    // Fall through to recovery
  }

  // Recovery path: unwrap markdown fences or surrounding prose
  const extracted = extractJsonTextFromGeminiResponse(raw);
  if (extracted && extracted !== raw) {
    try {
      const recovered = JSON.parse(extracted);
      if (recovered && typeof recovered === 'object' && !Array.isArray(recovered)) {
        return { parsed: recovered as Record<string, unknown>, parseResult: 'recovered' };
      }
    } catch {
      // Unrecoverable malformed JSON
    }
  }

  return { parsed: null, parseResult: 'malformed' };
}

const SAFETY_BLOCK_REASONS = new Set([
  'SAFETY',
  'RECITATION',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'IMAGE_SAFETY',
  'SPII',
  'OTHER_SAFETY',
]);

export interface GeminiResponseInspection {
  status: 'ok' | 'safety_blocked' | 'missing_candidates' | 'empty';
  text: string;
  finishReason: string;
}

/**
 * Safely inspects a `@google/genai` GenerateContentResponse object across SDK versions:
 * - Detects prompt-level safety blocks (`promptFeedback.blockReason`)
 * - Detects missing/empty `candidates` arrays explicitly
 * - Detects candidate safety/policy finish reasons
 * - Extracts text safely via `response.text` with fallback to non-thought `candidates[0].content.parts`
 */
export function inspectGeminiGenerateContentResponse(response: any): GeminiResponseInspection {
  if (!response || typeof response !== 'object') {
    return { status: 'missing_candidates', text: '', finishReason: 'NO_RESPONSE' };
  }

  const promptBlockReason = String(response?.promptFeedback?.blockReason || '').toUpperCase();
  if (promptBlockReason && promptBlockReason !== 'BLOCK_REASON_UNSPECIFIED') {
    return {
      status: 'safety_blocked',
      text: '',
      finishReason: `PROMPT_${promptBlockReason}`,
    };
  }

  const candidates = Array.isArray(response?.candidates) ? response.candidates : null;
  if (candidates !== null && candidates.length === 0) {
    return { status: 'missing_candidates', text: '', finishReason: 'NO_CANDIDATES' };
  }

  const primaryCandidate = candidates && candidates.length > 0 ? candidates[0] : null;
  const finishReason = String(primaryCandidate?.finishReason || '').toUpperCase();

  if (finishReason && SAFETY_BLOCK_REASONS.has(finishReason)) {
    return { status: 'safety_blocked', text: '', finishReason };
  }

  // Safely read response.text getter (some SDK versions throw if candidate has no text part)
  let rawText = '';
  try {
    if (typeof response.text === 'string') {
      rawText = response.text;
    }
  } catch {
    rawText = '';
  }

  // Fallback: inspect primaryCandidate.content.parts directly (excluding thought parts)
  if (!rawText.trim() && Array.isArray(primaryCandidate?.content?.parts)) {
    const joined = primaryCandidate.content.parts
      .filter((p: any) => p && typeof p.text === 'string' && !p.thought)
      .map((p: any) => p.text)
      .join('\n');
    if (joined.trim()) {
      rawText = joined;
    }
  }

  // If candidates was missing entirely (undefined) AND text is empty -> missing_candidates
  if (!candidates && !rawText.trim()) {
    return { status: 'missing_candidates', text: '', finishReason: 'NO_CANDIDATES' };
  }

  if (!rawText.trim()) {
    return {
      status: 'empty',
      text: '',
      finishReason: finishReason || 'EMPTY_TEXT',
    };
  }

  return {
    status: 'ok',
    text: rawText,
    finishReason: finishReason || 'STOP',
  };
}

export function classifyGeminiUpstreamError(
  err: unknown,
  abortedByClient: boolean,
  timedOut: boolean,
  modelId?: string
): SmartAiRouteError {
  if (abortedByClient) {
    return new SmartAiRouteError(
      499,
      'cancelled',
      'Passport analysis was cancelled.',
      true,
      undefined,
      { modelId, failureStage: 'gemini_request', canonicalCode: 'REQUEST_CANCELLED' }
    );
  }
  if (timedOut) {
    return new SmartAiRouteError(
      504,
      'timeout',
      'Passport analysis timed out before the AI service responded. Your file is saved — click Retry AI Scan or enter details manually.',
      true,
      504,
      { modelId, failureStage: 'gemini_request', canonicalCode: 'GEMINI_TIMEOUT' }
    );
  }

  const anyErr = err as any;
  const numericStatus =
    Number(anyErr?.status || anyErr?.code || anyErr?.error?.code || 0) || undefined;
  const msg = err instanceof Error ? err.message : String(err || '');

  if (
    numericStatus === 403 ||
    /\b403\b|API_KEY_INVALID|API key not valid|PERMISSION_DENIED|invalid api key/i.test(msg)
  ) {
    return new SmartAiRouteError(
      403,
      'api_permission_denied',
      'AI document auto-fill was denied due to invalid or unauthorized Gemini API credentials (HTTP 403). Your file is saved — please enter your details manually.',
      false,
      numericStatus || 403,
      { modelId, failureStage: 'gemini_request', canonicalCode: 'API_KEY_INVALID' }
    );
  }
  if (numericStatus === 401 || /\b401\b|UNAUTHENTICATED/i.test(msg)) {
    return new SmartAiRouteError(
      401,
      'auth_required',
      'AI document auto-fill authentication failed (HTTP 401). Please sign in again or verify server Gemini credentials.',
      false,
      401,
      { modelId, failureStage: 'gemini_request', canonicalCode: 'AUTH_REQUIRED' }
    );
  }
  if (numericStatus === 404 || /\b404\b|NOT_FOUND|no longer available/i.test(msg)) {
    return new SmartAiRouteError(
      404,
      'endpoint_or_model_not_found',
      'The configured Gemini AI model was not found (HTTP 404). Your file is saved — please enter your details manually.',
      false,
      404,
      { modelId, failureStage: 'gemini_request', canonicalCode: 'MODEL_NOT_FOUND' }
    );
  }
  if (numericStatus === 413 || /\b413\b|PAYLOAD_TOO_LARGE|entity\.too\.large|request payload size exceeds/i.test(msg)) {
    return new SmartAiRouteError(
      413,
      'payload_too_large',
      'The passport preview image exceeded the AI payload size limit (HTTP 413). Please upload a smaller image or enter details manually.',
      false,
      413,
      { modelId, failureStage: 'validation', canonicalCode: 'PAYLOAD_TOO_LARGE' }
    );
  }
  if (numericStatus === 429 || /\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg)) {
    return new SmartAiRouteError(
      429,
      'rate_limited',
      'AI extraction is temporarily busy due to rate limits (HTTP 429). Please wait a few seconds and click Retry AI Scan, or fill in your details manually.',
      true,
      429,
      { modelId, failureStage: 'gemini_request', canonicalCode: 'RATE_LIMITED' }
    );
  }
  if (numericStatus === 500 || (/\b500\b|\bINTERNAL\b/.test(msg) && !/\b503\b|UNAVAILABLE|high demand/i.test(msg))) {
    return new SmartAiRouteError(
      500,
      'internal_error',
      'The Gemini AI service reported an internal error (HTTP 500). Your file is already saved — click Retry AI Scan or fill in your details manually.',
      true,
      500,
      { modelId, failureStage: 'gemini_request', canonicalCode: 'INTERNAL_ERROR' }
    );
  }
  if (
    numericStatus === 503 ||
    numericStatus === 502 ||
    numericStatus === 504 ||
    /\b(503|502|504)\b|UNAVAILABLE|OVERLOADED|ECONNRESET|ETIMEDOUT|fetch failed|high demand/i.test(msg)
  ) {
    return new SmartAiRouteError(
      503,
      'service_unavailable',
      'The Gemini AI document service is temporarily experiencing high demand (HTTP 503). Your file is already saved — click Retry AI Scan in a few seconds or fill in your details manually.',
      true,
      numericStatus || 503,
      { modelId, failureStage: 'gemini_request', canonicalCode: 'SERVICE_UNAVAILABLE' }
    );
  }
  return new SmartAiRouteError(
    500,
    'unknown',
    'We could not analyze this document automatically right now. Your file is saved — click Retry AI Scan or enter your details manually.',
    true,
    numericStatus,
    { modelId, failureStage: 'gemini_request', canonicalCode: 'AI_EXTRACTION_FAILED' }
  );
}

const modelCooldownUntil = new Map<string, number>();

export function clearModelCooldownsForTesting(): void {
  modelCooldownUntil.clear();
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('ABORTED'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('ABORTED'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export type GeminiGenerateContentInvoker = (params: {
  model: string;
  contents: any;
  config: Record<string, any>;
}) => Promise<any>;

export interface GenerateStructuredFallbackResult {
  text: string;
  parsedObject?: Record<string, unknown>;
  parseResult: SmartAiParseResult;
  modelUsed: string;
  finishReason: string;
  retryCount: number;
}

export async function generateStructuredWithFallback(
  ai: GoogleGenAI | null,
  contents: any,
  responseSchema: any,
  outerSignal?: AbortSignal,
  diag?: {
    requestId: string;
    route: 'extract-passport' | 'classify-and-extract';
    generateContentFn?: GeminiGenerateContentInvoker;
    perAttemptTimeoutMs?: number;
    totalBudgetMs?: number;
    retryBaseDelayMs?: number;
    requireValidJsonObject?: boolean;
  }
): Promise<GenerateStructuredFallbackResult> {
  const invokeGenerateContent: GeminiGenerateContentInvoker | null =
    diag?.generateContentFn ||
    (ai ? (params) => ai.models.generateContent(params as any) : null);

  if (!invokeGenerateContent) {
    throw new SmartAiRouteError(
      503,
      'service_unavailable',
      'AI auto-fill is not configured on this server (missing GEMINI_API_KEY). Your passport file is saved — please enter your details manually.',
      false,
      undefined,
      { failureStage: 'config', canonicalCode: 'SERVICE_UNAVAILABLE', parseResult: 'skipped' }
    );
  }

  const perAttemptCapMs = diag?.perAttemptTimeoutMs ?? GEMINI_PER_ATTEMPT_TIMEOUT_MS;
  const totalBudgetCapMs = diag?.totalBudgetMs ?? GEMINI_TOTAL_BUDGET_MS;
  const retryBaseMs = diag?.retryBaseDelayMs ?? GEMINI_RETRY_BACKOFF_MS;

  const baseModels: Array<{ name: string; thinkingLevel: ThinkingLevel }> = [
    { name: PRIMARY_SMART_APP_MODEL, thinkingLevel: ThinkingLevel.LOW },
    { name: FALLBACK_SMART_APP_MODEL, thinkingLevel: ThinkingLevel.MINIMAL },
  ];

  // Prefer models that are not currently in transient cooldown
  const now = Date.now();
  const orderedModels = [
    ...baseModels.filter((m) => (modelCooldownUntil.get(m.name) || 0) <= now),
    ...baseModels.filter((m) => (modelCooldownUntil.get(m.name) || 0) > now),
  ];

  const startedAt = Date.now();
  let lastError: SmartAiRouteError | null = null;
  let attemptCount = 0;
  const maxPasses = 2;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    if (pass > 0) {
      const remainingBeforeBackoff = totalBudgetCapMs - (Date.now() - startedAt);
      const minBudgetNeeded = Math.min(5000, Math.max(50, perAttemptCapMs));
      if (remainingBeforeBackoff < minBudgetNeeded) {
        break;
      }
      const backoffBase = retryBaseMs * Math.pow(2, pass - 1);
      const jitterMs = retryBaseMs > 0 ? Math.floor(Math.random() * Math.min(250, retryBaseMs)) : 0;
      try {
        if (backoffBase + jitterMs > 0) {
          await sleepWithAbort(backoffBase + jitterMs, outerSignal);
        }
      } catch {
        throw classifyGeminiUpstreamError(null, true, false);
      }
    }

    for (let i = 0; i < orderedModels.length; i += 1) {
      const { name: model, thinkingLevel } = orderedModels[i];
      if (outerSignal?.aborted) {
        throw classifyGeminiUpstreamError(null, true, false, model);
      }

      const remainingBudgetMs = totalBudgetCapMs - (Date.now() - startedAt);
      const minAttemptBudget = Math.min(4000, Math.max(30, perAttemptCapMs));
      if (remainingBudgetMs < minAttemptBudget) {
        throw lastError || classifyGeminiUpstreamError(null, false, true, model);
      }

      attemptCount += 1;
      const attemptStart = Date.now();
      const attemptTimeoutMs = Math.min(perAttemptCapMs, remainingBudgetMs);
      const attemptController = new AbortController();
      let timedOut = false;

      const onOuterAbort = () => attemptController.abort();
      outerSignal?.addEventListener('abort', onOuterAbort, { once: true });

      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            timedOut = true;
            attemptController.abort();
            reject(new Error('GEMINI_REQUEST_TIMEOUT'));
          }, attemptTimeoutMs);
        });

        const config: Record<string, any> = {
          responseMimeType: 'application/json',
          responseSchema,
          abortSignal: attemptController.signal,
          thinkingConfig: { thinkingLevel },
        };

        const response = await Promise.race([
          invokeGenerateContent({
            model,
            contents,
            config,
          }),
          timeoutPromise,
        ]);

        const inspection = inspectGeminiGenerateContentResponse(response);

        if (inspection.status === 'safety_blocked') {
          const blockedErr = new SmartAiRouteError(
            422,
            'safety_blocked',
            'This passport image was blocked by the AI safety filter and could not be scanned automatically. Your file is saved — please enter your details manually.',
            false,
            undefined,
            {
              modelId: model,
              failureStage: 'safety_block',
              canonicalCode: 'SAFETY_BLOCKED',
              finishReason: inspection.finishReason,
              parseResult: 'blocked',
              retryCount: Math.max(0, attemptCount - 1),
            }
          );
          if (diag) {
            logSmartAiEvent(
              {
                event: 'smart_ai_request',
                requestId: diag.requestId,
                route: diag.route,
                modelId: model,
                durationMs: Date.now() - attemptStart,
                httpStatus: blockedErr.statusCode,
                failureStage: blockedErr.failureStage,
                errorCode: blockedErr.errorCode,
                errorCategory: blockedErr.canonicalCode,
                finishReason: inspection.finishReason,
                parseResult: 'blocked',
                retryCount: Math.max(0, attemptCount - 1),
              },
              'warn'
            );
          }
          // Safety blocks are deterministic for the image — fail fast without HTTP 200 or retry loop
          throw blockedErr;
        }

        if (inspection.status === 'missing_candidates') {
          lastError = new SmartAiRouteError(
            502,
            'missing_candidates',
            'The AI service returned no candidate output for this document. Your file is saved — click Retry AI Scan or enter details manually.',
            true,
            502,
            {
              modelId: model,
              failureStage: 'missing_candidates',
              canonicalCode: 'MISSING_CANDIDATES',
              finishReason: inspection.finishReason,
              parseResult: 'missing_candidates',
              retryCount: Math.max(0, attemptCount - 1),
            }
          );
          if (diag) {
            logSmartAiEvent(
              {
                event: 'smart_ai_request',
                requestId: diag.requestId,
                route: diag.route,
                modelId: model,
                durationMs: Date.now() - attemptStart,
                httpStatus: 502,
                failureStage: 'missing_candidates',
                errorCode: 'missing_candidates',
                errorCategory: 'MISSING_CANDIDATES',
                finishReason: inspection.finishReason,
                parseResult: 'missing_candidates',
                retryCount: Math.max(0, attemptCount - 1),
              },
              'warn'
            );
          }
          continue;
        }

        if (inspection.status === 'empty') {
          lastError = new SmartAiRouteError(
            502,
            'empty_ai_response',
            'The AI service returned an empty response. Your file is saved — click Retry AI Scan or enter details manually.',
            true,
            502,
            {
              modelId: model,
              failureStage: 'empty_response',
              canonicalCode: 'EMPTY_AI_RESPONSE',
              finishReason: inspection.finishReason,
              parseResult: 'empty',
              retryCount: Math.max(0, attemptCount - 1),
            }
          );
          if (diag) {
            logSmartAiEvent(
              {
                event: 'smart_ai_request',
                requestId: diag.requestId,
                route: diag.route,
                modelId: model,
                durationMs: Date.now() - attemptStart,
                httpStatus: 502,
                failureStage: 'empty_response',
                errorCode: 'empty_ai_response',
                errorCategory: 'EMPTY_AI_RESPONSE',
                finishReason: inspection.finishReason,
                parseResult: 'empty',
                retryCount: Math.max(0, attemptCount - 1),
              },
              'warn'
            );
          }
          continue;
        }

        const { parsed, parseResult } = parseAndRecoverJsonObject(inspection.text);
        if (diag?.requireValidJsonObject !== false && !parsed) {
          lastError = new SmartAiRouteError(
            502,
            'malformed_ai_json',
            'The AI service returned an unreadable structured response. Your file is saved — click Retry AI Scan or enter details manually.',
            true,
            502,
            {
              modelId: model,
              failureStage: 'json_parse',
              canonicalCode: 'MALFORMED_AI_JSON',
              finishReason: inspection.finishReason,
              parseResult: 'malformed',
              retryCount: Math.max(0, attemptCount - 1),
            }
          );
          if (diag) {
            logSmartAiEvent(
              {
                event: 'smart_ai_request',
                requestId: diag.requestId,
                route: diag.route,
                modelId: model,
                durationMs: Date.now() - attemptStart,
                httpStatus: 502,
                failureStage: 'json_parse',
                errorCode: 'malformed_ai_json',
                errorCategory: 'MALFORMED_AI_JSON',
                finishReason: inspection.finishReason,
                parseResult: 'malformed',
                retryCount: Math.max(0, attemptCount - 1),
              },
              'warn'
            );
          }
          continue;
        }

        modelCooldownUntil.delete(model);
        return {
          text: extractJsonTextFromGeminiResponse(inspection.text),
          parsedObject: parsed || undefined,
          parseResult,
          modelUsed: model,
          finishReason: inspection.finishReason,
          retryCount: Math.max(0, attemptCount - 1),
        };
      } catch (err: any) {
        if (err instanceof SmartAiRouteError) {
          throw err;
        }
        const classified = classifyGeminiUpstreamError(
          err,
          Boolean(outerSignal?.aborted),
          timedOut || String(err?.message || '').includes('GEMINI_REQUEST_TIMEOUT'),
          model
        );
        const enriched = new SmartAiRouteError(
          classified.statusCode,
          classified.errorCode,
          classified.message,
          classified.retryable,
          classified.upstreamStatus,
          {
            modelId: model,
            failureStage: classified.failureStage,
            canonicalCode: classified.canonicalCode,
            retryCount: Math.max(0, attemptCount - 1),
            parseResult: 'skipped',
          }
        );
        lastError = enriched;

        if (diag) {
          logSmartAiEvent(
            {
              event: 'smart_ai_request',
              requestId: diag.requestId,
              route: diag.route,
              modelId: model,
              durationMs: Date.now() - attemptStart,
              httpStatus: enriched.statusCode,
              failureStage: enriched.failureStage,
              errorCode: enriched.errorCode,
              errorCategory: enriched.canonicalCode,
              upstreamStatus: enriched.upstreamStatus,
              parseResult: 'skipped',
              retryCount: Math.max(0, attemptCount - 1),
            },
            enriched.errorCode === 'api_permission_denied' || enriched.errorCode === 'auth_required'
              ? 'error'
              : 'warn'
          );
        }

        if (
          enriched.errorCode === 'cancelled' ||
          enriched.errorCode === 'auth_required' ||
          enriched.errorCode === 'api_permission_denied' ||
          enriched.errorCode === 'payload_too_large'
        ) {
          throw enriched;
        }

        if (
          enriched.errorCode === 'rate_limited' ||
          enriched.errorCode === 'service_unavailable' ||
          enriched.errorCode === 'timeout'
        ) {
          modelCooldownUntil.set(model, Date.now() + 25_000);
        } else if (enriched.errorCode === 'endpoint_or_model_not_found') {
          modelCooldownUntil.set(model, Date.now() + 10 * 60_000);
        }

        const isRetryableOnFallback =
          enriched.errorCode === 'rate_limited' ||
          enriched.errorCode === 'service_unavailable' ||
          enriched.errorCode === 'timeout' ||
          enriched.errorCode === 'internal_error' ||
          enriched.errorCode === 'endpoint_or_model_not_found';

        if (!isRetryableOnFallback) {
          throw enriched;
        }
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        outerSignal?.removeEventListener('abort', onOuterAbort);
      }
    }
  }

  throw (
    lastError ||
    new SmartAiRouteError(
      503,
      'service_unavailable',
      'AI service did not return a response. Your file is saved — please click Retry AI Scan.',
      true,
      503,
      {
        modelId: PRIMARY_SMART_APP_MODEL,
        failureStage: 'gemini_request',
        canonicalCode: 'SERVICE_UNAVAILABLE',
        retryCount: Math.max(0, attemptCount - 1),
        parseResult: 'skipped',
      }
    )
  );
}

// Short-TTL idempotency cache for status-change emails (prevents duplicate emails on retry/double-click)
const notifyDedupCache = new Map<string, number>();
const NOTIFY_DEDUP_WINDOW_MS = 30 * 1000;

function checkAndRecordNotifyIdempotency(key: string): boolean {
  const now = Date.now();
  // Prune stale keys opportunistically
  if (notifyDedupCache.size > 500) {
    for (const [k, ts] of notifyDedupCache.entries()) {
      if (now - ts > NOTIFY_DEDUP_WINDOW_MS) notifyDedupCache.delete(k);
    }
  }
  const prev = notifyDedupCache.get(key);
  if (prev && now - prev < NOTIFY_DEDUP_WINDOW_MS) {
    return false; // Duplicate within dedup window
  }
  notifyDedupCache.set(key, now);
  return true;
}

/**
 * Validates that a base64-encoded image buffer begins with genuine image magic bytes
 * (JPEG, PNG, WEBP, or ISO-BMFF/HEIF/HEIC) rather than HTML/SVG/executable payloads.
 */
function hasValidImageMagicBytes(base64: string): boolean {
  try {
    const head = Buffer.from(base64.slice(0, 64), 'base64');
    if (head.length < 12) return false;
    // JPEG: FF D8 FF
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      head[0] === 0x89 &&
      head[1] === 0x50 &&
      head[2] === 0x4e &&
      head[3] === 0x47
    ) {
      return true;
    }
    // WEBP: RIFF....WEBP
    if (
      head.subarray(0, 4).toString('ascii') === 'RIFF' &&
      head.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return true;
    }
    // HEIC / HEIF (ISO BMFF): ....ftyp
    if (head.subarray(4, 8).toString('ascii') === 'ftyp') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function authenticateRequest(
  req: express.Request,
  options: { requireRoleClaims?: boolean } = {}
): Promise<{
  authenticated: boolean;
  uid?: string;
  email?: string;
  isAdmin: boolean;
  isCounsellor: boolean;
  isViewer: boolean;
  verifiedClaims?: Record<string, any>;
}> {
  const authHeader = req.headers.authorization;
  const sessionToken =
    typeof req.headers['x-everykr-session'] === 'string'
      ? req.headers['x-everykr-session']
      : undefined;
  const firebaseIdToken =
    typeof req.headers['x-firebase-id-token'] === 'string'
      ? req.headers['x-firebase-id-token']
      : undefined;

  const caller = await verifyCallerIdentityServer({
    authHeader,
    sessionToken,
    firebaseIdToken,
  });

  if (!caller.authenticated || !caller.uid) {
    return {
      authenticated: false,
      isAdmin: false,
      isCounsellor: false,
      isViewer: false,
    };
  }

  let verifiedClaims: Record<string, any> | undefined;
  if (options.requireRoleClaims) {
    // Extract Firebase custom claims ONLY via cryptographically verified Identity Toolkit lookup
    // (NEVER trust base64-decoded JWT payloads from unverified request headers)
    const bearerToken = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const candidateFbToken =
      firebaseIdToken || (bearerToken && !bearerToken.startsWith('ekrs1.') ? bearerToken : undefined);

    if (candidateFbToken) {
      const fbCheck = await verifyFirebaseIdTokenServer(candidateFbToken);
      if (fbCheck.valid && fbCheck.uid && fbCheck.uid === caller.uid) {
        verifiedClaims = fbCheck.customClaims;
      }
    }
  }

  const claimAdmin = isCanonicalAdminClaims(verifiedClaims);
  const storageRole = resolveCanonicalStorageRole({ claims: verifiedClaims });
  const claimCounsellor = storageRole === 'counsellor';
  const claimViewer = storageRole === 'viewer';

  return {
    authenticated: true,
    uid: caller.uid,
    email: caller.email,
    isAdmin: Boolean(claimAdmin || (!options.requireRoleClaims && caller.isAdmin)),
    isCounsellor: claimCounsellor,
    isViewer: claimViewer,
    verifiedClaims,
  };
}

function sanitizeExtractedString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  // Strip control characters and collapse excessive whitespace
  return val
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function sanitizeMrzLine(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9<]/g, '')
    .slice(0, 60);
}

function validateParsedPassportJson(raw: unknown): {
  valid: boolean;
  isPassport: boolean;
  mrzLine1: string;
  mrzLine2: string;
  surname: string;
  givenNames: string;
  passportNumber: string;
  nationalityIso3: string;
  dateOfBirth: string;
  sex: string;
  expiryDate: string;
  issueDate: string;
  placeOfBirth: string;
} | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  return {
    valid: true,
    isPassport: Boolean(obj.isPassport),
    mrzLine1: sanitizeMrzLine(obj.mrzLine1),
    mrzLine2: sanitizeMrzLine(obj.mrzLine2),
    surname: sanitizeExtractedString(obj.surname, 80),
    givenNames: sanitizeExtractedString(obj.givenNames, 100),
    passportNumber: sanitizeExtractedString(obj.passportNumber, 32),
    nationalityIso3: sanitizeExtractedString(obj.nationalityIso3, 12),
    dateOfBirth: sanitizeExtractedString(obj.dateOfBirth, 20),
    sex: sanitizeExtractedString(obj.sex, 12),
    expiryDate: sanitizeExtractedString(obj.expiryDate, 20),
    issueDate: sanitizeExtractedString(obj.issueDate, 20),
    placeOfBirth: sanitizeExtractedString(obj.placeOfBirth, 120),
  };
}

function normalizeSex(raw?: string): 'Male' | 'Female' | 'Other' | '' {
  const v = String(raw || '').trim().toUpperCase();
  if (v === 'M' || v === 'MALE') return 'Male';
  if (v === 'F' || v === 'FEMALE') return 'Female';
  if (v === 'X' || v === 'OTHER') return 'Other';
  return '';
}

function normalizeIsoDate(raw?: string): string {
  const v = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const [y, m, d] = v.split('-').map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return '';
  return v;
}

const PASSPORT_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isPassport: {
      type: Type.BOOLEAN,
      description: 'True if this image shows a passport bio/identity page.',
    },
    mrzLine1: {
      type: Type.STRING,
      description:
        'Exact first MRZ line (44 characters, uppercase A-Z, 0-9, and <) from bottom of passport. Empty string if unreadable.',
    },
    mrzLine2: {
      type: Type.STRING,
      description:
        'Exact second MRZ line (44 characters, uppercase A-Z, 0-9, and <) from bottom of passport. Empty string if unreadable.',
    },
    surname: {
      type: Type.STRING,
      description: 'Surname / family name as printed in passport.',
    },
    givenNames: {
      type: Type.STRING,
      description: 'Given names as printed in passport.',
    },
    passportNumber: {
      type: Type.STRING,
      description: 'Passport number (alphanumeric, no spaces).',
    },
    nationalityIso3: {
      type: Type.STRING,
      description: '3-letter ISO 3166-1 alpha-3 nationality code (e.g. BGD, NPL, IND, KOR, VNM).',
    },
    dateOfBirth: {
      type: Type.STRING,
      description: 'Date of birth in YYYY-MM-DD format. Empty string if not clearly visible.',
    },
    sex: {
      type: Type.STRING,
      description: 'M, F, or X. Empty string if unreadable.',
    },
    expiryDate: {
      type: Type.STRING,
      description: 'Passport date of expiry in YYYY-MM-DD format. Empty string if unreadable.',
    },
    issueDate: {
      type: Type.STRING,
      description: 'Passport date of issue in YYYY-MM-DD format. Empty string if unreadable.',
    },
    placeOfBirth: {
      type: Type.STRING,
      description: 'Place of birth as printed in passport. Empty string if not present.',
    },
  },
  required: [
    'isPassport',
    'mrzLine1',
    'mrzLine2',
    'surname',
    'givenNames',
    'passportNumber',
    'nationalityIso3',
    'dateOfBirth',
    'sex',
    'expiryDate',
    'issueDate',
    'placeOfBirth',
  ],
};

const PASSPORT_EXTRACTION_PROMPT = [
  'You are a high-precision passport OCR engine for university admissions.',
  'Read the passport biographical page image and return STRICT JSON matching the schema.',
  'Copy the two bottom MRZ (Machine Readable Zone) lines character-for-character without inventing characters.',
  'Convert dates strictly to YYYY-MM-DD format. Never guess or fabricate unreadable fields — return an empty string instead.',
].join(' ');

export interface PassportExtractionPipelineResult {
  httpStatus: number;
  body: Record<string, any>;
  modelUsed: string | null;
  finishReason: string | null;
  parseResult: SmartAiParseResult;
  retryCount: number;
  failureStage: SmartAiFailureStage;
  errorCode: SmartUploadAiErrorCode | null;
}

/**
 * Core deterministic passport extraction pipeline shared by the Express route and automated regression tests.
 * Guarantees canonical success (HTTP 200) vs canonical failure (non-200) responses and ICAO 9303 MRZ validation.
 */
export async function runPassportExtractionPipeline(params: {
  imageBase64: string;
  mimeType: string;
  requestId: string;
  authMs: number;
  routeStart: number;
  signal?: AbortSignal;
  aiClient?: GoogleGenAI | null;
  generateContentFn?: GeminiGenerateContentInvoker;
  perAttemptTimeoutMs?: number;
  totalBudgetMs?: number;
  retryBaseDelayMs?: number;
}): Promise<PassportExtractionPipelineResult> {
  const {
    imageBase64,
    mimeType,
    requestId,
    authMs,
    routeStart,
    signal,
    aiClient,
    generateContentFn,
    perAttemptTimeoutMs,
    totalBudgetMs,
    retryBaseDelayMs,
  } = params;

  const cleanMime = String(mimeType || 'image/jpeg').toLowerCase();
  const geminiStart = Date.now();
  const geminiResult = await generateStructuredWithFallback(
    aiClient === undefined ? getGeminiClient() : aiClient,
    {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: cleanMime === 'image/jpg' ? 'image/jpeg' : cleanMime,
          },
        },
        { text: PASSPORT_EXTRACTION_PROMPT },
      ],
    },
    PASSPORT_EXTRACTION_SCHEMA,
    signal,
    {
      requestId,
      route: 'extract-passport',
      generateContentFn,
      perAttemptTimeoutMs,
      totalBudgetMs,
      retryBaseDelayMs,
      requireValidJsonObject: true,
    }
  );
  const geminiMs = Date.now() - geminiStart;

  const parsed = validateParsedPassportJson(
    geminiResult.parsedObject ?? parseAndRecoverJsonObject(geminiResult.text).parsed
  );
  if (!parsed) {
    const errMsg =
      'The AI service returned an unreadable structured response. Your file is saved — click Retry AI Scan or enter your details manually.';
    return {
      httpStatus: 502,
      body: buildCanonicalPassportErrorPayload({
        errorCode: 'malformed_ai_json',
        canonicalCode: 'MALFORMED_AI_JSON',
        message: errMsg,
        retryable: true,
        requestId,
        modelUsed: geminiResult.modelUsed,
      }),
      modelUsed: geminiResult.modelUsed,
      finishReason: geminiResult.finishReason,
      parseResult: 'malformed',
      retryCount: geminiResult.retryCount,
      failureStage: 'json_parse',
      errorCode: 'malformed_ai_json',
    };
  }

  const mrzValidation = validateTd3Mrz(parsed.mrzLine1, parsed.mrzLine2);
  const needsCheckFields: string[] = [];

  // If ICAO 9303 MRZ check digits pass, trust MRZ over visual zone.
  // If individual check digits pass, still trust verified MRZ fields and flag failed ones.
  const mrz = mrzValidation.parsed;
  const useMrzPrimary = Boolean(mrzValidation.hasMrz && mrzValidation.isValid && mrz);

  const surname = (
    useMrzPrimary && mrz?.surname ? mrz.surname : String(parsed?.surname || mrz?.surname || '')
  )
    .trim()
    .toUpperCase();
  const givenNames = (
    useMrzPrimary && mrz?.givenNames
      ? mrz.givenNames
      : String(parsed?.givenNames || mrz?.givenNames || '')
  )
    .trim()
    .toUpperCase();

  const passportNumber = (
    mrzValidation.passportCheckPassed && mrz?.passportNumber
      ? mrz.passportNumber
      : String(parsed?.passportNumber || mrz?.passportNumber || '')
  )
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();

  const nationalityIso3 = (
    useMrzPrimary && mrz?.nationalityIso3
      ? mrz.nationalityIso3
      : String(parsed?.nationalityIso3 || mrz?.nationalityIso3 || '')
  )
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 3);

  const dateOfBirth =
    mrzValidation.dobCheckPassed && mrz?.dateOfBirth
      ? mrz.dateOfBirth
      : normalizeIsoDate(parsed?.dateOfBirth) || mrz?.dateOfBirth || '';

  const expiryDate =
    mrzValidation.expiryCheckPassed && mrz?.expiryDate
      ? mrz.expiryDate
      : normalizeIsoDate(parsed?.expiryDate) || mrz?.expiryDate || '';

  const sex =
    useMrzPrimary && mrz?.sex
      ? mrz.sex
      : normalizeSex(parsed?.sex) || mrz?.sex || '';

  const issueDate = normalizeIsoDate(parsed?.issueDate);
  const placeOfBirth = String(parsed?.placeOfBirth || '').trim();
  const nationalityName = iso3ToCountryName(nationalityIso3);

  if (!mrzValidation.isValid) {
    if (passportNumber && !mrzValidation.passportCheckPassed) {
      needsCheckFields.push('personal.passportNumber');
    }
    if (dateOfBirth && !mrzValidation.dobCheckPassed) {
      needsCheckFields.push('personal.dateOfBirth');
    }
    if (expiryDate && !mrzValidation.expiryCheckPassed) {
      needsCheckFields.push('personal.passportExpiryDate');
    }
    if (!mrzValidation.hasMrz || !mrzValidation.compositeCheckPassed) {
      if (surname) needsCheckFields.push('personal.surname');
      if (givenNames) needsCheckFields.push('personal.givenNames');
    }
  }

  const hasAnyUsefulData = Boolean(
    surname || givenNames || passportNumber || dateOfBirth || expiryDate
  );

  if (!hasAnyUsefulData) {
    const unreadableMessage =
      'We could not read passport details from this file. Your file is still attached — click Retry AI Scan with a clearer photo or fill in your personal information manually.';
    return {
      httpStatus: 422,
      body: buildCanonicalPassportErrorPayload({
        errorCode: 'unreadable',
        canonicalCode: 'UNREADABLE_PASSPORT',
        message: unreadableMessage,
        retryable: true,
        requestId,
        modelUsed: geminiResult.modelUsed,
      }),
      modelUsed: geminiResult.modelUsed,
      finishReason: geminiResult.finishReason,
      parseResult: geminiResult.parseResult,
      retryCount: geminiResult.retryCount,
      failureStage: 'unreadable',
      errorCode: 'unreadable',
    };
  }

  const canonicalData: PassportCanonicalData = {
    surname,
    givenNames,
    gender: sex,
    dateOfBirth,
    nationality: nationalityName || nationalityIso3,
    passportNumber,
    passportIssueDate: issueDate,
    passportExpiryDate: expiryDate,
    placeOfBirth,
  };

  const warnings: string[] = Array.isArray(mrzValidation.warnings)
    ? [...mrzValidation.warnings]
    : [];

  const responsePayload: PassportExtractionApiResponse = {
    success: true,
    data: canonicalData,
    warnings,
    requestId,
    ok: true,
    readable: true,
    modelUsed: geminiResult.modelUsed,
    timingsMs: { authMs, geminiMs, totalMs: Date.now() - routeStart },
    message: mrzValidation.isValid
      ? 'Passport MRZ verified with ICAO 9303 check digits. Please review and confirm each highlighted field.'
      : 'Passport fields were extracted, but MRZ check digits could not be fully verified. Please check each highlighted field carefully.',
    extracted: {
      mrzLine1: parsed.mrzLine1,
      mrzLine2: parsed.mrzLine2,
      surname,
      givenNames,
      passportNumber,
      nationalityIso3,
      nationalityName,
      dateOfBirth,
      sex,
      expiryDate,
      issueDate,
      placeOfBirth,
    },
    mrzValidation,
    trustedSource: useMrzPrimary ? 'mrz' : 'visual',
    needsCheckFields: Array.from(new Set(needsCheckFields)),
  };

  return {
    httpStatus: 200,
    body: responsePayload,
    modelUsed: geminiResult.modelUsed,
    finishReason: geminiResult.finishReason,
    parseResult: geminiResult.parseResult,
    retryCount: geminiResult.retryCount,
    failureStage: 'none',
    errorCode: null,
  };
}

export function createSmartApplicationRouter(): express.Router {
  const router = express.Router();

  /**
   * POST /api/smart-applications/ai/extract-passport
   * Accepts a base64 image of a passport bio page (PDFs are rendered to image page 1 client-side),
   * extracts MRZ lines + visual fields via Gemini strict JSON schema, then validates MRZ in code
   * using ICAO 9303 check digits.
   *
   * Canonical Contract:
   * - HTTP 200 ONLY when extraction succeeded with usable passport data:
   *   { success: true, data: { ... }, warnings: [], requestId: "...", ... }
   * - Proper 4xx/5xx HTTP status on ALL failures (NEVER HTTP 200 on failure):
   *   { success: false, error: { code, message, retryable }, requestId: "...", ... }
   */
  router.post('/ai/extract-passport', async (req, res) => {
    const routeStart = Date.now();
    const requestId = `ai_${crypto.randomBytes(6).toString('hex')}`;
    const requestAbort = new AbortController();
    const onResponseClose = () => {
      if (!res.writableEnded) {
        requestAbort.abort();
      }
    };
    res.on('close', onResponseClose);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      const authStart = Date.now();
      const caller = await authenticateRequest(req, { requireRoleClaims: false });
      const authMs = Date.now() - authStart;

      if (!caller.authenticated || !caller.uid) {
        logSmartAiEvent(
          {
            event: 'smart_ai_request',
            requestId,
            route: 'extract-passport',
            modelId: null,
            durationMs: Date.now() - routeStart,
            httpStatus: 401,
            failureStage: 'auth',
            errorCode: 'auth_required',
            errorCategory: 'AUTH_REQUIRED',
            parseResult: 'skipped',
            retryCount: 0,
          },
          'warn'
        );
        return res.status(401).json(
          buildCanonicalPassportErrorPayload({
            errorCode: 'auth_required',
            canonicalCode: 'AUTH_REQUIRED',
            message: 'Please sign in to use passport auto-fill.',
            retryable: false,
            requestId,
          })
        );
      }

      if (!checkAiRateLimit(caller.uid)) {
        logSmartAiEvent(
          {
            event: 'smart_ai_request',
            requestId,
            route: 'extract-passport',
            modelId: null,
            durationMs: Date.now() - routeStart,
            httpStatus: 429,
            failureStage: 'rate_limit',
            errorCode: 'rate_limited',
            errorCategory: 'RATE_LIMITED',
            parseResult: 'skipped',
            retryCount: 0,
          },
          'warn'
        );
        return res.status(429).json(
          buildCanonicalPassportErrorPayload({
            errorCode: 'rate_limited',
            canonicalCode: 'RATE_LIMITED',
            message: 'Too many document scan requests. Please wait a moment and try again.',
            retryable: true,
            requestId,
          })
        );
      }

      const { imageBase64, mimeType, applicationId } = req.body || {};
      if (applicationId !== undefined && !/^[a-zA-Z0-9_-]{1,128}$/.test(String(applicationId))) {
        return res.status(400).json(
          buildCanonicalPassportErrorPayload({
            errorCode: 'invalid_image',
            canonicalCode: 'INVALID_IMAGE',
            message: 'Invalid application identifier.',
            retryable: false,
            requestId,
          })
        );
      }
      if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
        return res.status(400).json(
          buildCanonicalPassportErrorPayload({
            errorCode: 'invalid_image',
            canonicalCode: 'INVALID_IMAGE',
            message: 'A valid passport image is required.',
            retryable: false,
            requestId,
          })
        );
      }
      if (imageBase64.length > MAX_AI_IMAGE_BASE64_CHARS) {
        logSmartAiEvent(
          {
            event: 'smart_ai_request',
            requestId,
            route: 'extract-passport',
            modelId: null,
            durationMs: Date.now() - routeStart,
            httpStatus: 413,
            failureStage: 'validation',
            errorCode: 'payload_too_large',
            errorCategory: 'PAYLOAD_TOO_LARGE',
            parseResult: 'skipped',
            retryCount: 0,
          },
          'warn'
        );
        return res.status(413).json(
          buildCanonicalPassportErrorPayload({
            errorCode: 'payload_too_large',
            canonicalCode: 'PAYLOAD_TOO_LARGE',
            message: 'Passport preview image is too large for analysis (HTTP 413). Please upload a smaller image.',
            retryable: false,
            requestId,
          })
        );
      }

      const cleanMime = String(mimeType || 'image/jpeg').toLowerCase();
      if (!ALLOWED_IMAGE_MIMES.has(cleanMime) || !hasValidImageMagicBytes(imageBase64)) {
        return res.status(400).json(
          buildCanonicalPassportErrorPayload({
            errorCode: 'invalid_image',
            canonicalCode: 'INVALID_IMAGE',
            message: 'Unsupported or corrupted image file for passport extraction.',
            retryable: false,
            requestId,
          })
        );
      }

      const ai = getGeminiClient();
      if (!ai) {
        logSmartAiEvent(
          {
            event: 'smart_ai_request',
            requestId,
            route: 'extract-passport',
            modelId: null,
            durationMs: Date.now() - routeStart,
            httpStatus: 503,
            failureStage: 'config',
            errorCode: 'service_unavailable',
            errorCategory: 'SERVICE_UNAVAILABLE',
            parseResult: 'skipped',
            retryCount: 0,
          },
          'error'
        );
        return res.status(503).json(
          buildCanonicalPassportErrorPayload({
            errorCode: 'service_unavailable',
            canonicalCode: 'SERVICE_UNAVAILABLE',
            message:
              'AI auto-fill is not configured on this server (missing GEMINI_API_KEY). Your passport file is saved — please enter your details manually.',
            retryable: false,
            requestId,
          })
        );
      }

      const pipelineResult = await runPassportExtractionPipeline({
        imageBase64,
        mimeType: cleanMime,
        requestId,
        authMs,
        routeStart,
        signal: requestAbort.signal,
        aiClient: ai,
      });

      if (res.writableEnded || res.destroyed) {
        return;
      }

      logSmartAiEvent(
        {
          event: 'smart_ai_request',
          requestId,
          route: 'extract-passport',
          modelId: pipelineResult.modelUsed,
          durationMs: Date.now() - routeStart,
          httpStatus: pipelineResult.httpStatus,
          failureStage: pipelineResult.failureStage,
          errorCode: pipelineResult.errorCode,
          errorCategory: pipelineResult.errorCode
            ? mapSmartAiErrorCodeToCanonical(pipelineResult.errorCode)
            : null,
          finishReason: pipelineResult.finishReason,
          parseResult: pipelineResult.parseResult,
          retryCount: pipelineResult.retryCount,
        },
        pipelineResult.httpStatus >= 500 ? 'error' : pipelineResult.httpStatus >= 400 ? 'warn' : 'info'
      );

      return res.status(pipelineResult.httpStatus).json(pipelineResult.body);
    } catch (err: any) {
      if (res.writableEnded || res.destroyed) {
        return;
      }
      const routeErr =
        err instanceof SmartAiRouteError
          ? err
          : classifyGeminiUpstreamError(err, Boolean(requestAbort.signal.aborted), false);
      const isExpectedTransient =
        routeErr.errorCode === 'service_unavailable' ||
        routeErr.errorCode === 'rate_limited' ||
        routeErr.errorCode === 'timeout' ||
        routeErr.errorCode === 'unreadable' ||
        routeErr.errorCode === 'safety_blocked' ||
        routeErr.errorCode === 'empty_ai_response' ||
        routeErr.errorCode === 'malformed_ai_json' ||
        routeErr.errorCode === 'missing_candidates' ||
        routeErr.errorCode === 'cancelled';
      // Strictly zero PII — emit structured diagnostic metadata only
      logSmartAiEvent(
        {
          event: 'smart_ai_request',
          requestId,
          route: 'extract-passport',
          modelId: routeErr.modelId || null,
          durationMs: Date.now() - routeStart,
          httpStatus: routeErr.statusCode,
          failureStage: routeErr.failureStage,
          errorCode: routeErr.errorCode,
          errorCategory: routeErr.canonicalCode,
          upstreamStatus: routeErr.upstreamStatus,
          finishReason: routeErr.finishReason || null,
          parseResult: routeErr.parseResult || 'skipped',
          retryCount: routeErr.retryCount ?? 0,
        },
        isExpectedTransient ? 'warn' : 'error'
      );
      return res.status(routeErr.statusCode).json(
        buildCanonicalPassportErrorPayload({
          errorCode: routeErr.errorCode,
          canonicalCode: routeErr.canonicalCode,
          message: routeErr.message,
          retryable: routeErr.retryable,
          requestId,
          modelUsed: routeErr.modelId,
        })
      );
    } finally {
      res.off('close', onResponseClose);
    }
  });

  /**
   * POST /api/smart-applications/ai/classify-and-extract
   * Classifies an uploaded document (from ZIP or single drop) into checklist docType,
   * and extracts key metadata from transcripts (institution, GPA) and language certificates (test type, score).
   */
  router.post('/ai/classify-and-extract', async (req, res) => {
    const routeStart = Date.now();
    const requestId = `ai_${crypto.randomBytes(6).toString('hex')}`;
    const requestAbort = new AbortController();
    const onResponseClose = () => {
      if (!res.writableEnded) {
        requestAbort.abort();
      }
    };
    res.on('close', onResponseClose);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Request-Id', requestId);

    try {
      const caller = await authenticateRequest(req, { requireRoleClaims: false });
      if (!caller.authenticated || !caller.uid) {
        return res.status(401).json({
          ok: false,
          readable: false,
          requestId,
          errorCode: 'auth_required',
          retryable: false,
          docType: 'other',
          confidence: 'low',
        });
      }

      if (!checkAiRateLimit(caller.uid)) {
        return res.status(429).json({
          ok: false,
          readable: false,
          requestId,
          errorCode: 'rate_limited',
          retryable: true,
          docType: 'other',
          confidence: 'low',
          summary: 'Rate limit reached. Please classify remaining files manually.',
        });
      }

      const { imageBase64, mimeType, fileName, applicationId } = req.body || {};
      if (applicationId !== undefined && !/^[a-zA-Z0-9_-]{1,128}$/.test(String(applicationId))) {
        return res.status(400).json({
          ok: false,
          readable: false,
          requestId,
          errorCode: 'invalid_image',
          retryable: false,
          docType: 'other',
          confidence: 'low',
        });
      }
      if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
        return res.status(400).json({
          ok: false,
          readable: false,
          requestId,
          errorCode: 'invalid_image',
          retryable: false,
          docType: 'other',
          confidence: 'low',
        });
      }
      if (imageBase64.length > MAX_AI_IMAGE_BASE64_CHARS) {
        return res.status(413).json({
          ok: false,
          readable: false,
          requestId,
          errorCode: 'payload_too_large',
          retryable: false,
          docType: 'other',
          confidence: 'low',
          summary: 'File preview exceeded the AI payload size limit (HTTP 413). Assign manually below.',
        });
      }

      const cleanMime = String(mimeType || 'image/jpeg').toLowerCase();
      if (!ALLOWED_IMAGE_MIMES.has(cleanMime) || !hasValidImageMagicBytes(imageBase64)) {
        return res.status(400).json({
          ok: false,
          readable: false,
          requestId,
          errorCode: 'invalid_image',
          retryable: false,
          docType: 'other',
          confidence: 'low',
        });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          ok: false,
          readable: false,
          requestId,
          errorCode: 'service_unavailable',
          retryable: false,
          docType: 'other',
          confidence: 'low',
          summary: 'AI classification is not configured on this server (missing GEMINI_API_KEY).',
        });
      }

      const classifySchema = {
        type: Type.OBJECT,
        properties: {
          docType: {
            type: Type.STRING,
            enum: [
              'passport',
              'photo',
              'transcript',
              'certificate',
              'language_certificate',
              'bank_statement',
              'study_plan',
              'recommendation_letter',
              'other',
            ],
            description: 'Most appropriate admissions checklist category for this document.',
          },
          confidence: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
          },
          summary: {
            type: Type.STRING,
            description: 'Short 1-sentence description of what the document appears to be.',
          },
          institutionName: {
            type: Type.STRING,
            description: 'If transcript or certificate, school/university name. Otherwise empty string.',
          },
          gpa: {
            type: Type.STRING,
            description: 'If transcript, numeric GPA/CGPA value (e.g. 3.65). Otherwise empty string.',
          },
          gpaScale: {
            type: Type.STRING,
            description: 'If transcript, GPA scale (e.g. 4.0, 4.5, 5.0, 100). Otherwise empty string.',
          },
          country: {
            type: Type.STRING,
            description: 'If transcript, country of the institution. Otherwise empty string.',
          },
          languageTestType: {
            type: Type.STRING,
            enum: ['None', 'TOPIK', 'IELTS', 'TOEFL', 'Duolingo'],
            description: 'If language_certificate, test type. Otherwise None.',
          },
          languageScore: {
            type: Type.STRING,
            description: 'If language_certificate, overall score or TOPIK level (e.g. 6.5, 95, TOPIK 4). Otherwise empty string.',
          },
          languageTestDate: {
            type: Type.STRING,
            description: 'If language_certificate, test date in YYYY-MM-DD if visible. Otherwise empty string.',
          },
        },
        required: [
          'docType',
          'confidence',
          'summary',
          'institutionName',
          'gpa',
          'gpaScale',
          'country',
          'languageTestType',
          'languageScore',
          'languageTestDate',
        ],
      };

      const safeFileNameHint = String(fileName || '').slice(0, 120);
      const prompt = [
        'Classify this international university admission document into one of the allowed categories:',
        'passport, photo (passport-size ID portrait photo), transcript (academic grade sheet / marksheet),',
        'certificate (diploma / graduation certificate), language_certificate (TOPIK, IELTS, TOEFL, Duolingo),',
        'bank_statement (bank balance / financial certificate), study_plan (statement of purpose / personal statement),',
        'recommendation_letter, or other.',
        'If it is a transcript, extract institutionName, gpa, gpaScale, and country.',
        'If it is a language_certificate, extract languageTestType, languageScore, and languageTestDate (YYYY-MM-DD).',
        'Do not guess unreadable values — leave empty strings when uncertain.',
        safeFileNameHint ? `Original filename hint: "${safeFileNameHint}".` : '',
      ]
        .filter(Boolean)
        .join(' ');

      const {
        text: rawJson,
        parsedObject,
        parseResult,
        modelUsed,
        finishReason,
        retryCount,
      } = await generateStructuredWithFallback(
        ai,
        {
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: cleanMime === 'image/jpg' ? 'image/jpeg' : cleanMime,
              },
            },
            { text: prompt },
          ],
        },
        classifySchema,
        requestAbort.signal,
        { requestId, route: 'classify-and-extract', requireValidJsonObject: true }
      );

      const parsed: any = parsedObject ?? parseAndRecoverJsonObject(rawJson).parsed;

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        logSmartAiEvent(
          {
            event: 'smart_ai_request',
            requestId,
            route: 'classify-and-extract',
            modelId: modelUsed,
            durationMs: Date.now() - routeStart,
            httpStatus: 502,
            failureStage: 'json_parse',
            errorCode: 'malformed_ai_json',
            errorCategory: 'MALFORMED_AI_JSON',
            finishReason,
            parseResult: 'malformed',
            retryCount,
          },
          'warn'
        );
        return res.status(502).json({
          success: false,
          error: {
            code: 'MALFORMED_AI_JSON',
            message: 'The AI service returned an unreadable classification response. Assign manually or click Retry.',
            retryable: true,
          },
          ok: false,
          readable: false,
          requestId,
          modelUsed,
          errorCode: 'malformed_ai_json',
          retryable: true,
          docType: 'other',
          confidence: 'low',
        } satisfies DocumentClassificationApiResponse & { success: false; error: any });
      }

      const validTypes = new Set([
        'passport',
        'photo',
        'transcript',
        'certificate',
        'language_certificate',
        'bank_statement',
        'study_plan',
        'recommendation_letter',
        'other',
      ]);
      const validLanguageTypes = new Set(['None', 'TOPIK', 'IELTS', 'TOEFL', 'Duolingo']);
      const docType = validTypes.has(parsed.docType) ? parsed.docType : 'other';
      const languageTestType = validLanguageTypes.has(parsed.languageTestType)
        ? parsed.languageTestType
        : 'None';

      const payload: DocumentClassificationApiResponse = {
        ok: true,
        readable: true,
        requestId,
        modelUsed,
        docType,
        confidence:
          parsed.confidence === 'high' || parsed.confidence === 'medium'
            ? parsed.confidence
            : 'low',
        summary: sanitizeExtractedString(parsed.summary, 280),
        ...(docType === 'transcript' || docType === 'certificate'
          ? {
              extractedTranscript: {
                institutionName: sanitizeExtractedString(parsed.institutionName, 160),
                gpa: sanitizeExtractedString(parsed.gpa, 24),
                gpaScale: sanitizeExtractedString(parsed.gpaScale, 24),
                country: sanitizeExtractedString(parsed.country, 80),
              },
            }
          : {}),
        ...(docType === 'language_certificate'
          ? {
              extractedLanguage: {
                testType: languageTestType,
                score: sanitizeExtractedString(parsed.languageScore, 40),
                testDate: normalizeIsoDate(sanitizeExtractedString(parsed.languageTestDate, 20)),
              },
            }
          : {}),
      };

      logSmartAiEvent(
        {
          event: 'smart_ai_request',
          requestId,
          route: 'classify-and-extract',
          modelId: modelUsed,
          durationMs: Date.now() - routeStart,
          httpStatus: 200,
          failureStage: 'none',
          errorCode: null,
          errorCategory: null,
          finishReason,
          parseResult,
          retryCount,
        },
        'info'
      );

      return res.json(payload);
    } catch (err: any) {
      if (res.writableEnded || res.destroyed) {
        return;
      }
      const routeErr =
        err instanceof SmartAiRouteError
          ? err
          : classifyGeminiUpstreamError(err, Boolean(requestAbort.signal.aborted), false);
      const isExpectedTransient =
        routeErr.errorCode === 'service_unavailable' ||
        routeErr.errorCode === 'rate_limited' ||
        routeErr.errorCode === 'timeout' ||
        routeErr.errorCode === 'unreadable' ||
        routeErr.errorCode === 'safety_blocked' ||
        routeErr.errorCode === 'empty_ai_response' ||
        routeErr.errorCode === 'malformed_ai_json' ||
        routeErr.errorCode === 'missing_candidates';
      logSmartAiEvent(
        {
          event: 'smart_ai_request',
          requestId,
          route: 'classify-and-extract',
          modelId: routeErr.modelId || null,
          durationMs: Date.now() - routeStart,
          httpStatus: routeErr.statusCode,
          failureStage: routeErr.failureStage,
          errorCode: routeErr.errorCode,
          errorCategory: routeErr.canonicalCode,
          upstreamStatus: routeErr.upstreamStatus,
          finishReason: routeErr.finishReason || null,
          parseResult: routeErr.parseResult || 'skipped',
          retryCount: routeErr.retryCount ?? 0,
        },
        isExpectedTransient ? 'warn' : 'error'
      );
      return res.status(routeErr.statusCode).json({
        success: false,
        error: {
          code: routeErr.canonicalCode,
          message: routeErr.message,
          retryable: routeErr.retryable,
        },
        ok: false,
        readable: false,
        requestId,
        errorCode: routeErr.errorCode,
        retryable: routeErr.retryable,
        docType: 'other',
        confidence: 'low',
        summary: routeErr.message,
      });
    } finally {
      res.off('close', onResponseClose);
    }
  });

  /**
   * POST /api/smart-applications/notify-status
   * Sends a student status-change email via the existing automatedEmailService infrastructure.
   * Requires authenticated caller (either admin/counsellor or the student emailing themselves on submission).
   */
  router.post('/notify-status', async (req, res) => {
    try {
      const caller = await authenticateRequest(req, { requireRoleClaims: true });
      if (!caller.authenticated || !caller.uid) {
        return res.status(401).json({ ok: false, error: 'Authentication required.' });
      }

      const {
        studentName,
        studentEmail,
        universityName,
        intake,
        degreeLevel,
        applicationId,
        fromStatus,
        toStatus,
        eventType,
        message,
        requestedDocuments,
        requestedDeadline,
      } = req.body || {};

      const normalizedTarget = String(studentEmail || '').trim().toLowerCase();
      const callerEmail = String(caller.email || '').trim().toLowerCase();

      if (!normalizedTarget || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(normalizedTarget)) {
        return res.status(400).json({
          ok: false,
          error: 'A valid recipient email address is required.',
        });
      }

      const normalizedToStatus = normalizeSmartApplicationStatus(String(toStatus || ''));
      if (!SMART_APPLICATION_STATUS_ORDER.includes(normalizedToStatus)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid application status.',
        });
      }

      const allowedEventTypes = new Set([
        'status_change',
        'assigned',
        'documents_accepted',
        'direct_message',
        'replacement_uploaded',
      ]);
      const safeEventType = allowedEventTypes.has(String(eventType || 'status_change'))
        ? (String(eventType || 'status_change') as
            | 'status_change'
            | 'assigned'
            | 'documents_accepted'
            | 'direct_message'
            | 'replacement_uploaded')
        : 'status_change';

      const normalizedFromStatus = fromStatus
        ? normalizeSmartApplicationStatus(String(fromStatus))
        : null;

      // Strict authorization:
      // - Verified Admins and Verified Counsellors (via Identity Toolkit customAttributes) may notify students
      // - Viewers are strictly read-only and may NEVER send notification emails to students
      // - Students may ONLY notify themselves on self-initiated actions (`submitted`, `withdrawn`, or `replacement_uploaded`)
      const isSelfNotification = Boolean(callerEmail && normalizedTarget === callerEmail);
      const isStudentSelfAction =
        isSelfNotification &&
        (normalizedToStatus === 'submitted' ||
          normalizedToStatus === 'withdrawn' ||
          safeEventType === 'replacement_uploaded');

      if (!caller.isAdmin && !caller.isCounsellor && (!isStudentSelfAction || caller.isViewer)) {
        return res.status(403).json({
          ok: false,
          error: 'Not authorized to send application status emails to this recipient.',
        });
      }

      const safeMessage = message ? String(message).trim().slice(0, 2000) : undefined;
      const safeDeadline = requestedDeadline
        ? String(requestedDeadline).trim().slice(0, 40)
        : undefined;
      const safeRequestedDocs = Array.isArray(requestedDocuments)
        ? requestedDocuments.map((x) => String(x).trim().slice(0, 140)).filter(Boolean).slice(0, 20)
        : undefined;

      // Idempotency / duplicate-email guard for retries or double-clicks
      const msgHash = crypto
        .createHash('sha256')
        .update(
          `${safeEventType}|${safeMessage || ''}|${safeDeadline || ''}|${(safeRequestedDocs || []).join(',')}`
        )
        .digest('hex')
        .slice(0, 16);
      const dedupKey = `${String(applicationId || '')}:${safeEventType}:${normalizedToStatus}:${normalizedTarget}:${msgHash}`;
      if (!checkAndRecordNotifyIdempotency(dedupKey)) {
        return res.json({
          ok: true,
          delivered: false,
          provider: 'deduplicated',
          skippedDuplicate: true,
        });
      }

      const result = await sendApplicationStatusChangeEmailServer({
        studentName: String(studentName || 'Applicant').slice(0, 160),
        studentEmail: normalizedTarget,
        universityName: String(universityName || 'University').slice(0, 200),
        intake: String(intake || '').slice(0, 120),
        degreeLevel: String(degreeLevel || '').slice(0, 80),
        applicationId: String(applicationId || '').slice(0, 128),
        fromStatus: normalizedFromStatus,
        toStatus: normalizedToStatus,
        eventType: safeEventType,
        message: safeMessage,
        requestedDocuments: safeRequestedDocs,
        requestedDeadline: safeDeadline,
        actorEmail: caller.email,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('[SmartApplication] Status email dispatch failed');
      return res.status(500).json({
        ok: false,
        delivered: false,
        provider: 'error',
        errorReason: 'Email dispatch failed.',
      });
    }
  });

  /**
   * POST /api/smart-applications/documents/authorize-upload
   * Authoritatively verifies the Firebase ID token, application ownership, and application
   * status (`draft` or `documents_missing` ONLY) against the named Firestore database
   * (`ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f`), then issues a
   * short-lived (120s), single-use upload ticket (+ V4 signed URL with ifGenerationMatch=0
   * when signing credentials are available).
   */
  router.post('/documents/authorize-upload', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const idToken = extractFirebaseIdTokenFromHeaders(req.headers);
      const { applicationId, docType, fileName, fileSize, mimeType } = req.body || {};

      const result = await authorizeSmartApplicationUpload({
        idToken,
        applicationId,
        docType,
        fileName,
        fileSize,
        mimeType,
      });

      return res.status(result.httpStatus).json(result);
    } catch {
      console.error('[SmartApplication] Document upload authorization failed');
      return res.status(500).json({
        ok: false,
        errorCode: 'authorization_error',
        error: 'Could not authorize document upload. Please retry.',
      });
    }
  });

  /**
   * PUT /api/smart-applications/documents/upload
   * Single-use server-mediated upload handler. Re-verifies the caller's Firebase ID token,
   * atomically consumes the single-use HMAC upload ticket, validates exact byte size and
   * binary magic bytes, and writes immutably (`ifGenerationMatch: 0`) to private Storage.
   */
  router.put(
    '/documents/upload',
    express.raw({ type: '*/*', limit: '21mb' }),
    async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      try {
        const idToken = extractFirebaseIdTokenFromHeaders(req.headers);
        const caller = await resolveVerifiedStorageCaller(idToken);
        if (!caller) {
          return res.status(401).json({
            ok: false,
            errorCode: 'unauthenticated',
            error: 'Valid Firebase authentication is required to upload documents.',
          });
        }

        const uploadToken =
          typeof req.headers['x-upload-token'] === 'string'
            ? req.headers['x-upload-token'].trim()
            : '';
        if (!uploadToken) {
          return res.status(400).json({
            ok: false,
            errorCode: 'missing_upload_token',
            error: 'Missing single-use upload authorization token.',
          });
        }

        const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        const incomingMime =
          typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : '';

        const verification = await consumeAndVerifyUploadTicketAsync({
          uploadToken,
          callerUid: caller.uid,
          buffer: bodyBuffer,
          contentType: incomingMime,
        });

        if (!verification.ok) {
          return res.status(verification.httpStatus).json({
            ok: false,
            errorCode: verification.errorCode,
            error: verification.error,
          });
        }

        const { payload } = verification;
        const stored = await uploadVerifiedBufferToPrivateStorage({
          storagePath: payload.storagePath,
          buffer: bodyBuffer,
          contentType: payload.contentType,
          ownerUid: payload.ownerUid,
          applicationId: payload.applicationId,
          docType: payload.docType,
          callerIdToken: caller.idToken,
        });

        return res.status(200).json({
          ok: true,
          storagePath: stored.fullPath,
          fileName: payload.fileName,
          size: stored.size,
          mimeType: payload.contentType,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        const errCode = String(err?.code || '');
        if (errCode === '412' || err?.code === 412) {
          return res.status(409).json({
            ok: false,
            errorCode: 'object_already_exists',
            error: 'This upload path has already been written and cannot be reused.',
          });
        }
        if (isStorageIamPermissionError(err)) {
          console.warn(
            '[SmartApplication] Private Storage upload blocked (403): runtime service account needs roles/storage.objectUser on everykr.firebasestorage.app.'
          );
          return res.status(503).json({
            ok: false,
            errorCode: 'storage_iam_permission_required',
            error:
              'Private Storage upload is blocked (403) because this server runtime service account does not yet have the Storage Object User (roles/storage.objectUser) IAM role on bucket everykr.firebasestorage.app.',
            recoveryAction:
              'Grant the Storage Object User (roles/storage.objectUser) IAM role to the runtime service account on Firebase project "everykr" (or bucket "everykr.firebasestorage.app"), then click Retry.',
          });
        }
        console.error(`[SmartApplication] Private document upload error (${errCode || 'storage'})`);
        return res.status(502).json({
          ok: false,
          errorCode: 'storage_write_failed',
          error: 'Could not persist document to private Firebase Storage. Please retry shortly.',
        });
      }
    }
  );

  /**
   * POST /api/smart-applications/documents/authorize-read
   * Authorizes private document reads against the named Firestore database:
   * - Admin (verified custom claim): allowed for registered application documents
   * - Counsellor (verified custom claim): allowed ONLY when `assignedTo === caller.uid`
   * - Student: allowed ONLY when `app.userId === caller.uid`
   * - Viewer: strictly DENIED (403) — least-privilege policy (zero raw PII file access)
   */
  router.post('/documents/authorize-read', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const idToken = extractFirebaseIdTokenFromHeaders(req.headers);
      const { applicationId, storagePath } = req.body || {};

      const result = await authorizeSmartApplicationDocumentRead({
        idToken,
        applicationId,
        storagePath,
      });

      return res.status(result.httpStatus).json(result);
    } catch {
      console.error('[SmartApplication] Document read authorization failed');
      return res.status(500).json({
        ok: false,
        errorCode: 'authorization_error',
        error: 'Could not authorize document access. Please retry.',
      });
    }
  });

  /**
   * GET /api/smart-applications/documents/stream
   * Streams an authorized private Storage object using a single-use 60s read token bound to
   * the caller's verified Firebase ID token (cannot be shared or replayed).
   */
  router.get('/documents/stream', async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const idToken = extractFirebaseIdTokenFromHeaders(req.headers);
      const caller = await resolveVerifiedStorageCaller(idToken);
      if (!caller) {
        return res.status(401).json({
          ok: false,
          errorCode: 'unauthenticated',
          error: 'Valid Firebase authentication is required.',
        });
      }
      if (caller.isViewer) {
        return res.status(403).json({
          ok: false,
          errorCode: 'viewer_document_access_denied',
          error: 'Viewers are not permitted to access raw student documents.',
        });
      }

      const readToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
      const verifiedTicket = await consumeAndVerifyReadTicketAsync({
        readToken,
        callerUid: caller.uid,
      });
      if (!verifiedTicket.ok) {
        return res.status(verifiedTicket.httpStatus).json({
          ok: false,
          errorCode: verifiedTicket.errorCode,
          error: verifiedTicket.error,
        });
      }

      const { buffer, contentType } = await downloadPrivateStorageObject(
        verifiedTicket.payload.storagePath,
        caller.idToken
      );
      const safeFileName = verifiedTicket.payload.storagePath.split('/').pop() || 'document';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${safeFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`
      );
      return res.status(200).send(buffer);
    } catch (err: any) {
      if (isStorageIamPermissionError(err)) {
        console.warn(
          '[SmartApplication] Private Storage stream blocked (403): runtime service account needs roles/storage.objectUser on everykr.firebasestorage.app.'
        );
        return res.status(503).json({
          ok: false,
          errorCode: 'storage_iam_permission_required',
          error:
            'Private document streaming requires the Storage Object User (roles/storage.objectUser) IAM role on bucket everykr.firebasestorage.app.',
          recoveryAction:
            'Grant roles/storage.objectUser to the runtime service account on Firebase project "everykr" (or bucket "everykr.firebasestorage.app"), then retry.',
        });
      }
      console.error('[SmartApplication] Private document stream failed');
      return res.status(502).json({
        ok: false,
        errorCode: 'storage_read_failed',
        error: 'Could not retrieve private document from Storage.',
      });
    }
  });

  return router;
}
