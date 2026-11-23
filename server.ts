/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { getScriptPronunciation, resolveLearningLang } from './src/utils/hangulPhonetics.ts';
import {
  AirportAutocompleteService,
  FlightSearchService,
  FlightPriceVerificationService,
  PriceAlertService,
  FlightAnalyticsService,
  VERIFIED_AIRPORTS_DIRECTORY
} from './src/server/flightEngineServer.ts';
import {
  getUniversityDeadlinesPayloadServer,
  getUniversityDeadlineLogoBinaryServer,
  uploadUniversityDeadlineLogoServer,
  cleanupUnreferencedDeadlineLogoServer,
  saveUniversityDeadlineServer,
  deleteUniversityDeadlineServer,
  reorderUniversityDeadlinesServer,
  updateUniversityDeadlineCarouselSettingsServer,
  syncUniversityDeadlinesFromFirestoreServer,
} from './src/server/universityDeadlinesServer.ts';
import {
  checkTransportRateLimit,
  getAllBusTerminals,
  getAllKtxStations,
  getPublicTransportHubPayload,
  getTagoProviderPublicStatus,
  getTransportAnalytics,
  getTransportHubConfig,
  saveTagoServiceKeyToServerVault,
  testTagoProviderConnection,
  updateTransportHubConfig,
} from './src/server/transport/transportProviderService.ts';
import {
  searchKtxSchedules,
  validateKtxSearchInput,
} from './src/server/transport/ktxTransportService.ts';
import {
  searchBusSchedules,
  validateBusSearchInput,
} from './src/server/transport/busTransportService.ts';
import {
  createTransportApiProvider,
  deleteTransportApiProvider,
  getTransportApiAuditLogs,
  getTransportApiLogs,
  getTransportHealthDashboardPayload,
  listAdminTransportProviders,
  testTransportApiProviderConnection,
  TransportCategory,
  updateTransportApiProvider,
} from './src/server/transport/transportApiRegistry.ts';

import {
  EVERYKR_SYSTEM_PROMPT,
  getFallbackAiResponse,
  classifyAiRequest,
  buildSelectiveSystemInstruction,
  getInstantGreetingResponse,
  getCachedAiResponse,
  setCachedAiResponse,
  RAG_KNOWLEDGE_MODULES,
  detectUserLanguage,
  LANGUAGE_LABELS
} from './src/server/ragKnowledge.ts';
import {
  subscribeVisitor,
  confirmDoubleOptIn,
  processUnsubscribe,
  getAdminNewsletterOverview,
  sendAdminTestEmail,
  createOrSendCampaign,
  checkRateLimit,
  getEmailProviderStatus,
  saveEmailProviderRuntimeConfig,
  retrySubscriberWelcomeEmail,
  exportSubscribersCsv
} from './src/server/newsletterService.ts';
import {
  sendLoginWelcomeBackEmail,
  sendRegistrationCongratulationsEmail,
  recordPasswordResetEmailAuditServer,
  verifyEmailInfrastructureServer,
  getAutomatedEmailAdminLogs,
  sendSupportContactReplyEmailServer,
  sendSupportAdminAlertEmailServer
} from './src/server/automatedEmailService.ts';
import {
  extractBearerFirebaseToken,
  isCanonicalAdminRole,
  resolveVerifiedEnterpriseCaller,
} from './src/server/enterpriseRbacCore.ts';
import { createEnterpriseRbacRouter } from './src/server/enterpriseRbacServer.ts';
import {
  handleFirebasePasswordResetRequestServer,
  resolveRegisteredEmailForResetOobCodeServer
} from './src/server/firebaseAdminResetService.ts';
import {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  verifyRegistrationProofToken,
  recordVerifiedAccountActivation,
  getAdminRegistrationsOverview
} from './src/server/otpAuthService.ts';
import * as XLSX from 'xlsx';
import {
  syncCentralizedUserServer,
  checkDuplicateEmailServer,
  recordLoginAttemptServer,
  recordAdminActionServer,
  adminUpdateUserServer,
  approveOrRejectAgentServer,
  revealEncryptedPassportServer,
  deleteUserPassportDataServer,
  createDataPrivacyRequestServer,
  deleteOwnAccountServer,
  adminDeleteUserServer,
  getAdminUserManagementOverview,
  formatUserForSpreadsheetRow,
  updateGoogleSheetsConfigServer,
  syncUsersToGoogleSheetsServer,
  isAuthorizedServerAdmin,
  issueServerSessionToken,
  verifyServerSessionToken,
  verifyFirebaseIdTokenServer,
  verifyCallerIdentityServer,
  authenticateUserCredentialsServer,
  initiatePasswordResetServer,
  verifyPasswordResetLinkServer,
  completePasswordResetServer,
  getPublicDeveloperProfileServer,
  getAdminDeveloperProfileOverviewServer,
  updateDeveloperProfileServer,
  syncDeveloperProfileFromFirestoreServer,
  resetDeveloperProfileServer,
  registerInternalEmployeeServer,
  authenticateInternalPortalServer,
  verifyInternalPortalSessionServer,
  listInternalAccessRequestsServer,
  reviewInternalAccessRequestServer,
  listGlobalTrashServer,
  moveToGlobalTrashServer,
  restoreFromGlobalTrashServer,
  permanentlyDeleteFromGlobalTrashServer
} from './src/server/userManagementService.ts';
import {
  getPublicRecaptchaConfigServer,
  verifyRecaptchaTokenServer
} from './src/server/recaptchaService.ts';
import { createSmartApplicationRouter } from './src/server/smartApplicationServer.ts';
import {
  SupportedDocFormat,
  ExecutionStage,
  sanitizeOwnerId,
  sanitizeDisplayName,
  generateAndStoreDocument,
  getGeneratedDocumentById,
  listGeneratedDocumentsForOwner,
  processAndStoreUploadedFile,
  getUploadedFileById,
  listUploadedFilesForOwner,
  executeIsolatedCodeJob,
  getExecutionJobById,
  listExecutionJobsForOwner,
  cancelExecutionJob,
  listProjectsForOwner,
  createOrUpdateProject,
  deleteProjectForOwner,
  listTasksForOwner,
  createOrUpdateTask,
  deleteTaskForOwner,
  detectRequestedDocFormat,
  extractExecutableCodeBlock,
  getAiPlatformAdminMetrics,
  runEveryKrAiAcceptanceTests
} from './src/server/everykrAiEngine.ts';

dotenv.config();

// Bind canonical EveryKR Firebase configuration at server startup so both dev and production use 'everykr' (926172198407)
process.env.VITE_FIREBASE_API_KEY = 'AIzaSyAgJyMMBxCO6GZgSsh7a6xMolDs7JzTscQ';
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'everykr.firebaseapp.com';
process.env.VITE_FIREBASE_PROJECT_ID = 'everykr';
process.env.VITE_FIREBASE_STORAGE_BUCKET = 'everykr.firebasestorage.app';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '926172198407';
process.env.VITE_FIREBASE_APP_ID = '1:926172198407:web:eb679714ecb801edd99ca2';
process.env.VITE_FIREBASE_MEASUREMENT_ID = 'G-FPCP0M668Y';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '35mb' }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const MAX_AI_MESSAGE_CHARS = 8000;
const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
const FALLBACK_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const SECONDARY_FALLBACK_MODEL = 'gemini-2.5-flash';
const ALL_CANDIDATE_MODELS = [
  PRIMARY_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  SECONDARY_FALLBACK_MODEL,
];
let preferredHealthyModel: string = PRIMARY_GEMINI_MODEL;
const modelCooldownUntilMap = new Map<string, number>();
const aiRateLimitMap = new Map<string, number[]>();

function isRateLimitError(err: any): boolean {
  if (!err) return false;
  if (err.status === 429 || err.code === 429) return true;
  const msg = String(err.message || err.statusText || err);
  return /\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit|too many requests/i.test(msg);
}

function markModelRateLimited(modelName: string, cooldownMs: number = 30_000): void {
  modelCooldownUntilMap.set(modelName, Date.now() + cooldownMs);
  if (preferredHealthyModel === modelName) {
    const nextHealthy = ALL_CANDIDATE_MODELS.find(
      (m) => m !== modelName && (modelCooldownUntilMap.get(m) || 0) <= Date.now()
    );
    if (nextHealthy) {
      preferredHealthyModel = nextHealthy;
    }
  }
}

function checkAiRateLimit(key: string, maxRequests: number = 45, windowMs: number = 60_000): boolean {
  const now = Date.now();
  const timestamps = (aiRateLimitMap.get(key) || []).filter((ts) => now - ts < windowMs);
  if (timestamps.length >= maxRequests) {
    return false;
  }
  timestamps.push(now);
  aiRateLimitMap.set(key, timestamps);
  return true;
}

function getOrderedCandidateModels(_categoryCode?: string): string[] {
  const now = Date.now();
  const baseOrder = Array.from(
    new Set([preferredHealthyModel, ...ALL_CANDIDATE_MODELS].filter(Boolean))
  );
  const healthy = baseOrder.filter((m) => (modelCooldownUntilMap.get(m) || 0) <= now);
  const cooling = baseOrder.filter((m) => (modelCooldownUntilMap.get(m) || 0) > now);
  return healthy.length > 0 ? [...healthy, ...cooling] : baseOrder;
}

function resolveThinkingLevelEnum(level: 'LOW' | 'MEDIUM' | 'HIGH'): ThinkingLevel {
  if (level === 'HIGH') return ThinkingLevel.HIGH;
  if (level === 'MEDIUM') return ThinkingLevel.MEDIUM;
  return ThinkingLevel.LOW;
}

function buildModelGenerationConfig(
  modelName: string,
  options: {
    systemInstruction?: string;
    thinkingLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    responseMimeType?: string;
    responseSchema?: any;
    tools?: any[];
  }
): Record<string, any> {
  const config: Record<string, any> = {};
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }
  if (options.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }
  if (options.responseSchema) {
    config.responseSchema = options.responseSchema;
  }
  if (options.tools) {
    config.tools = options.tools;
  }
  if (modelName === PRIMARY_GEMINI_MODEL) {
    config.thinkingConfig = {
      thinkingLevel: resolveThinkingLevelEnum(options.thinkingLevel || 'LOW'),
    };
  } else if (modelName === FALLBACK_GEMINI_MODEL) {
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.MINIMAL,
    };
  }
  return config;
}

function withAiTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function generateContentWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  thinkingLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  responseMimeType?: string;
  responseSchema?: any;
  timeoutMs?: number;
}): Promise<{ response: any; modelUsed: string }> {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const candidates = getOrderedCandidateModels();
  const timeoutMs = params.timeoutMs ?? 20000;
  let lastError: any = null;

  for (let pass = 0; pass < 2; pass++) {
    for (const modelName of candidates) {
      if (pass === 0 && (modelCooldownUntilMap.get(modelName) || 0) > Date.now()) {
        continue;
      }
      try {
        const config = buildModelGenerationConfig(modelName, {
          systemInstruction: params.systemInstruction,
          thinkingLevel: params.thinkingLevel || 'LOW',
          responseMimeType: params.responseMimeType,
          responseSchema: params.responseSchema,
        });
        const response = await withAiTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: params.contents,
            config,
          }),
          timeoutMs
        );
        if (response && typeof response.text === 'string' && response.text.trim().length > 0) {
          modelCooldownUntilMap.delete(modelName);
          preferredHealthyModel = modelName;
          return { response, modelUsed: modelName };
        }
      } catch (err: any) {
        lastError = err;
        if (isRateLimitError(err)) {
          markModelRateLimited(modelName, 30_000);
        }
      }
    }
    if (pass === 0) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  throw lastError || new Error('Upstream Gemini models did not return text output');
}

// Health endpoint for AI assistant status & architecture inspection
app.get('/api/ai/health', (_req, res) => {
  res.json({
    status: 'ok',
    assistantName: 'EVERYKR AI',
    model: preferredHealthyModel || PRIMARY_GEMINI_MODEL,
    routerVersion: '3.0-everykr-floating-ai-ultimate',
    supportedLanguages: ['en', 'bn', 'ko', 'ne', 'hi', 'ur', 'ar', 'zh', 'ja'],
    ragModulesCount: Object.keys(RAG_KNOWLEDGE_MODULES).length,
    ragReady: true,
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString()
  });
});

// Advanced Multilingual Speech-to-Text Endpoint (Auto-Detects Language & Transcribes in Native Script)
app.post('/api/ai/speech-to-text', async (req, res) => {
  const startTime = Date.now();
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  if (!checkAiRateLimit(`ai_stt:${clientIp}`, 60, 60_000)) {
    return res.status(429).json({
      ok: false,
      error: 'Too many voice transcription requests. Please wait a moment and try again.',
    });
  }

  const { audioBase64, mimeType = 'audio/webm', preferredLanguage = 'en' } = req.body || {};

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'Audio data is required for speech-to-text transcription.',
    });
  }

  const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!cleanBase64 || cleanBase64.length < 32) {
    return res.status(400).json({
      ok: false,
      error: 'Recorded audio was too short or empty. Please speak clearly and try again.',
    });
  }

  // Normalize audio mimeType for Gemini multimodal audio support
  const rawMime = String(mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
  const normalizedMime =
    rawMime.startsWith('audio/') || rawMime === 'video/webm' || rawMime === 'application/ogg'
      ? rawMime === 'video/webm'
        ? 'audio/webm'
        : rawMime
      : 'audio/webm';

  if (!ai) {
    return res.status(503).json({
      ok: false,
      error: 'Speech transcription service is temporarily unavailable.',
    });
  }

  try {
    const sttSystemInstruction = `You are an elite, high-precision multilingual Speech-to-Text (ASR) transcription engine for EVERYKR AI.
Your ONLY task is to listen to the user's audio and return the exact verbatim transcription in the speaker's native script.

CRITICAL MULTILINGUAL & NATIVE SCRIPT RULES:
1. AUTOMATIC LANGUAGE DETECTION:
   - Automatically detect the spoken language(s), including Bangla (বাংলা), Nepali (नेपाली), English, Korean (한국어), Urdu (اردو), Hindi (हिन्दी), Arabic (العربية), Chinese (中文), Japanese (日本語), and mixed-language code-switching (e.g., Bangla + English, Nepali + English, Korean + English).
2. STRICT NATIVE SCRIPT OUTPUT (NEVER ROMANIZE):
   - If the speaker speaks Bangla / Bengali: MUST transcribe in Bengali script (বাংলা), e.g., "আমি দক্ষিণ কোরিয়ায় পড়াশোনা করতে চাই।" NEVER output romanized Banglish like "Ami dokkhin koreay...".
   - If the speaker speaks Nepali: MUST transcribe in Devanagari script (नेपाली), e.g., "म दक्षिण कोरियामा पढ्न चाहन्छु।" NEVER output romanized Nepali.
   - If the speaker speaks Hindi: MUST transcribe in Devanagari script (हिन्दी).
   - If the speaker speaks Korean: MUST transcribe in Hangul (한국어), e.g., "한국 대학교 입학 조건이 궁금합니다."
   - If the speaker speaks Urdu or Arabic: MUST transcribe in Urdu/Arabic script (اردو / العربية).
   - If the speaker speaks English: Transcribe in standard English with proper punctuation and capitalization.
   - If the speaker uses mixed-language speech (e.g. Bangla with English terms like "scholarship", "TOPIK", "D-2 visa", "Seoul National University"), transcribe naturally preserving the Bengali/Devanagari/Hangul script for the native words and accurate English/native terms where spoken.
3. NO TRANSLATION & NO COMMENTARY:
   - Do NOT translate the audio into English or any other language.
   - Do NOT answer the user's question.
   - Return ONLY the exact transcribed text spoken by the user. If there is only silence or unintelligible background noise, return an empty string.`;

    const { response, modelUsed } = await generateContentWithFallback({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: normalizedMime,
                data: cleanBase64,
              },
            },
            {
              text: 'Transcribe the spoken audio accurately in its native script (Bangla in বাংলা script, Nepali in नेपाली Devanagari script, Korean in 한국어 Hangul, English in English, Urdu in اردو, Hindi in हिन्दी). Output ONLY the transcribed text without quotes or commentary.',
            },
          ],
        },
      ],
      systemInstruction: sttSystemInstruction,
      thinkingLevel: 'LOW',
      timeoutMs: 18000,
    });

    const rawTranscript = (response?.text || '')
      .trim()
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .trim();

    const detectedLanguage = detectUserLanguage(rawTranscript, preferredLanguage);
    const languageName = LANGUAGE_LABELS[detectedLanguage] || 'English';

    return res.json({
      ok: true,
      transcript: rawTranscript,
      detectedLanguage,
      languageName,
      model: modelUsed,
      latencyMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.warn('[EveryKR AI] Speech-to-text error:', err?.message || err);
    return res.status(500).json({
      ok: false,
      error: 'Could not transcribe audio right now. Please try speaking again or type your message.',
      detail: err?.message || 'STT error',
    });
  }
});

// Helper to extract web sources from groundingMetadata
function extractGroundingSources(response: any): Array<{ title: string; url: string }> {
  try {
    const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (!Array.isArray(chunks)) return [];
    return chunks
      .filter((c: any) => c?.web?.uri)
      .map((c: any) => ({
        title: c.web.title || c.web.uri.replace(/^https?:\/\//, '').split('/')[0],
        url: c.web.uri
      }));
  } catch (_e) {
    return [];
  }
}

// Helper to process attached files & auto-orchestrate document generation / code execution
async function orchestratePostGenerationTools(params: {
  ownerId: string;
  projectId?: string;
  conversationId?: string;
  userMessage: string;
  aiReplyText: string;
  explicitDocFormat?: SupportedDocFormat;
  explicitRunCode?: boolean;
}) {
  const stages: ExecutionStage[] = ['Understanding request'];
  const generatedDocuments: Array<Omit<ReturnType<typeof generateAndStoreDocument>, 'buffer'>> = [];
  let executionJob: Awaited<ReturnType<typeof executeIsolatedCodeJob>> | null = null;

  // 1. Check if code execution was requested or auto-triggered
  const codeTarget = extractExecutableCodeBlock(params.aiReplyText, params.userMessage);
  if (codeTarget || params.explicitRunCode) {
    const block =
      codeTarget ||
      extractExecutableCodeBlock(params.aiReplyText, 'run') ||
      extractExecutableCodeBlock(params.userMessage, 'run');
    if (block) {
      stages.push('Executing code', 'Verifying outputs');
      executionJob = await executeIsolatedCodeJob({
        ownerId: params.ownerId,
        projectId: params.projectId,
        conversationId: params.conversationId,
        language: block.language,
        code: block.code,
      });
    }
  }

  // 2. Check if downloadable document generation was requested
  const requestedFormat = params.explicitDocFormat || detectRequestedDocFormat(params.userMessage);
  if (requestedFormat && params.aiReplyText.trim()) {
    stages.push('Generating documents', 'Verifying outputs');
    const cleanTitle =
      params.userMessage
        .replace(/[^\w\s-]/g, '')
        .trim()
        .slice(0, 48) || 'EVERYKR_AI_Document';
    const docRecord = generateAndStoreDocument({
      ownerId: params.ownerId,
      projectId: params.projectId,
      conversationId: params.conversationId,
      title: cleanTitle,
      format: requestedFormat,
      content: params.aiReplyText,
    });
    const { buffer: _b, ...publicDoc } = docRecord;
    generatedDocuments.push(publicDoc);
  }

  return {
    stages: Array.from(new Set(stages)),
    generatedDocuments,
    executionJob,
  };
}

function sanitizeConversationUserName(raw?: unknown): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F<>`"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  if (!cleaned) return '';
  if (cleaned.includes('@')) return '';
  const lower = cleaned.toLowerCase();
  if (lower.startsWith('uid_') || lower.startsWith('guest_')) return '';
  if (lower === 'everykr user' || lower === 'unknown' || lower === 'null' || lower === 'undefined') {
    return '';
  }
  if (/^[A-Za-z0-9_-]{20,}$/.test(cleaned) && /\d/.test(cleaned)) {
    return '';
  }
  return cleaned;
}

// Full AI Assistant Chat Endpoint (Intelligent Router + Selective RAG + Tool Orchestration)
app.post('/api/ai/chat', async (req, res) => {
  const startTime = Date.now();
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  if (!checkAiRateLimit(`ai_chat:${clientIp}`)) {
    return res.status(429).json({
      error: 'Too many AI requests. Please wait a moment and try again.',
    });
  }

  const {
    message,
    conversation = [],
    language = 'en',
    fileAttachment,
    uploadedFileId,
    studentContext,
    userName: rawUserName,
    isGuest,
    ownerId: rawOwnerId,
    projectId,
    conversationId,
    requestedDocFormat,
    autoExecuteCode,
  } = req.body || {};

  if (!message && !fileAttachment && !uploadedFileId) {
    return res.status(400).json({ error: 'Message or file attachment is required' });
  }

  const ownerId = sanitizeOwnerId(rawOwnerId || studentContext?.uid || 'guest');
  const activeUserName = sanitizeConversationUserName(rawUserName ?? studentContext?.name);
  const sanitizedMessage = typeof message === 'string' ? message.trim().slice(0, MAX_AI_MESSAGE_CHARS) : '';
  const hasAttachment = Boolean((fileAttachment && fileAttachment.data && fileAttachment.mimeType) || uploadedFileId);

  // Parse and store uploaded file if present
  let parsedUpload: ReturnType<typeof processAndStoreUploadedFile> | undefined;
  if (uploadedFileId) {
    parsedUpload = getUploadedFileById(String(uploadedFileId));
  } else if (fileAttachment && fileAttachment.data) {
    try {
      parsedUpload = processAndStoreUploadedFile({
        ownerId,
        projectId,
        conversationId,
        fileName: fileAttachment.name || 'attachment.txt',
        mimeType: fileAttachment.mimeType || 'application/octet-stream',
        base64Data: fileAttachment.data,
      });
    } catch (_parseErr) {
      // Allow inline fallback if image
    }
  }

  // Classify request via Intelligent AI Router (Categories A–L + 5-Language Auto-Detection)
  const classification = classifyAiRequest(sanitizedMessage, language, hasAttachment);
  const requestedFormat = (requestedDocFormat as SupportedDocFormat | undefined) || detectRequestedDocFormat(sanitizedMessage);

  // Fast Path 1: Instant Simple Greeting (<5ms)
  if (classification.isSimpleGreeting && !hasAttachment && !requestedFormat) {
    const instantReply = getInstantGreetingResponse(
      sanitizedMessage,
      classification.detectedLanguage,
      activeUserName
    );
    if (instantReply) {
      return res.json({
        reply: instantReply,
        model: 'everykr-fast-router',
        classification,
        detectedLanguage: classification.detectedLanguage,
        latencyMs: Date.now() - startTime,
        isOfflineFallback: false,
        sources: [],
        executionStages: ['Understanding request'],
        generatedDocuments: [],
        executionJob: null,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Fast Path 2: Check LRU Cache for single-turn or self-contained queries without attachment or tool requests
  if (!hasAttachment && !requestedFormat && (!Array.isArray(conversation) || conversation.length <= 1)) {
    const cached = getCachedAiResponse(sanitizedMessage, classification.detectedLanguage, activeUserName);
    if (cached) {
      return res.json({
        reply: cached.reply,
        model: `${PRIMARY_GEMINI_MODEL} (cached)`,
        classification: cached.classification,
        detectedLanguage: classification.detectedLanguage,
        latencyMs: Date.now() - startTime,
        isOfflineFallback: false,
        sources: cached.sources,
        executionStages: ['Understanding request'],
        generatedDocuments: [],
        executionJob: null,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Build Selective System Instruction (loads RAG modules ONLY when needed)
  let contextPrompt = buildSelectiveSystemInstruction(sanitizedMessage, classification);
  contextPrompt += `\n\nUNIFIED EVERYKR AI TOOL CAPABILITIES:
- You are EVERYKR AI (One AI. Every Tool. Everything in One Place).
- When the user asks to generate a PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), CSV, Markdown (.md), JSON, XML, or TXT file, write complete, well-structured content (using clear Markdown headings and Markdown tables for spreadsheets). The EVERYKR backend automatically compiles your output into a real, downloadable binary file attached to your message. Never say you cannot generate downloadable files.
- When the user asks to run or execute Python, JavaScript, or TypeScript code, include a clean \`\`\`python or \`\`\`javascript code block. The EVERYKR isolated sandbox automatically runs it and attaches the real stdout/stderr output.`;

  if (activeUserName) {
    contextPrompt += `\n\nACTIVE CONVERSATION USER:
- Name: ${activeUserName} (${isGuest ? 'Guest Visitor' : 'Authenticated EveryKR Member'})
- Personalization Rule: Address the user naturally as ${activeUserName} when appropriate (especially in greetings or if they ask their name). Never display email addresses or user IDs as names.`;
  }

  if (studentContext && !isGuest && classification.useSelectiveRag) {
    contextPrompt += `\n\nCURRENT USER PROFILE CONTEXT:\n- Nationality: ${studentContext.nationality || 'Not specified'}\n- Desired Major: ${studentContext.major || 'Not specified'}\n- Study Level: ${studentContext.studyLevel || 'Undergraduate'}\n- Current City: ${studentContext.currentCity || 'Not specified'}\n- University: ${studentContext.university || 'Not specified'}\n- Language Level: ${studentContext.topikLevel || 'Not specified'}`;
  }

  if (parsedUpload) {
    contextPrompt += `\n\nVERIFIED UPLOADED FILE DATA (${parsedUpload.originalName}):
- Summary: ${parsedUpload.summary}
- Metadata: ${JSON.stringify(parsedUpload.metadata)}
- Extracted Content:\n${parsedUpload.extractedText.slice(0, 10000)}`;
  }

  if (!ai) {
    const fallbackText = getFallbackAiResponse(sanitizedMessage || 'help', classification.detectedLanguage);
    const toolsOut = await orchestratePostGenerationTools({
      ownerId,
      projectId,
      conversationId,
      userMessage: sanitizedMessage,
      aiReplyText: fallbackText,
      explicitDocFormat: requestedFormat || undefined,
      explicitRunCode: Boolean(autoExecuteCode),
    });
    return res.json({
      reply: fallbackText,
      model: 'everykr-rag-offline',
      classification,
      detectedLanguage: classification.detectedLanguage,
      latencyMs: Date.now() - startTime,
      isOfflineFallback: true,
      sources: [],
      executionStages: toolsOut.stages,
      generatedDocuments: toolsOut.generatedDocuments,
      executionJob: toolsOut.executionJob,
      uploadedFile: parsedUpload ? { ...parsedUpload, rawBufferBase64: undefined } : undefined,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const contents: any[] = [];

    if (Array.isArray(conversation) && conversation.length > 0) {
      for (const turn of conversation.slice(-6)) {
        if (turn && turn.role && turn.text && typeof turn.text === 'string') {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text.slice(0, 3000) }]
          });
        }
      }
    }

    const currentParts: any[] = [];
    const isGeminiInlineCompatible =
      fileAttachment &&
      fileAttachment.data &&
      fileAttachment.mimeType &&
      /^(image\/|application\/pdf|text\/)/i.test(fileAttachment.mimeType);

    if (isGeminiInlineCompatible) {
      currentParts.push({
        inlineData: {
          mimeType: fileAttachment.mimeType,
          data: fileAttachment.data
        }
      });
    }

    if (sanitizedMessage) {
      currentParts.push({ text: sanitizedMessage });
    } else if (parsedUpload) {
      currentParts.push({
        text: `Please analyze the uploaded file "${parsedUpload.originalName}" thoroughly, summarize key insights, metrics, and actionable takeaways.`
      });
    } else {
      currentParts.push({ text: 'Please analyze this document or image thoroughly with step-by-step insights.' });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const candidateModels = getOrderedCandidateModels(classification.categoryCode);
    let response: any = null;
    let sources: Array<{ title: string; url: string }> = [];
    let activeModelUsed = candidateModels[0];
    let lastModelError: any = null;

    for (let pass = 0; pass < 2 && (!response || !response.text); pass++) {
      for (const modelName of candidateModels) {
        if (pass === 0 && (modelCooldownUntilMap.get(modelName) || 0) > Date.now()) {
          continue;
        }
        try {
          if (classification.useGoogleSearch && !response) {
            try {
              const searchConfig = buildModelGenerationConfig(modelName, {
                systemInstruction: contextPrompt,
                thinkingLevel: classification.thinkingLevel,
                tools: [{ googleSearch: {} }],
              });
              const searchRes = await withAiTimeout(
                ai.models.generateContent({
                  model: modelName,
                  contents,
                  config: searchConfig,
                }),
                14000
              );
              if (searchRes && searchRes.text) {
                response = searchRes;
                sources = extractGroundingSources(response);
              }
            } catch (sErr: any) {
              if (isRateLimitError(sErr)) {
                markModelRateLimited(modelName, 30_000);
                continue;
              }
            }
          }

          if (!response || !response.text) {
            const coreConfig = buildModelGenerationConfig(modelName, {
              systemInstruction: contextPrompt,
              thinkingLevel: classification.thinkingLevel,
            });
            const coreRes = await withAiTimeout(
              ai.models.generateContent({
                model: modelName,
                contents,
                config: coreConfig,
              }),
              20000
            );
            if (coreRes && coreRes.text) {
              response = coreRes;
            }
          }

          if (response && response.text) {
            activeModelUsed = modelName;
            modelCooldownUntilMap.delete(modelName);
            preferredHealthyModel = modelName;
            break;
          }
        } catch (modelErr: any) {
          lastModelError = modelErr;
          if (isRateLimitError(modelErr)) {
            markModelRateLimited(modelName, 30_000);
          }
        }
      }

      if ((!response || !response.text) && pass === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!response || !response.text) {
      const reason = lastModelError?.message || 'Upstream Gemini models temporarily unavailable';
      const fallbackText = getFallbackAiResponse(sanitizedMessage || 'help', classification.detectedLanguage);
      const toolsOut = await orchestratePostGenerationTools({
        ownerId,
        projectId,
        conversationId,
        userMessage: sanitizedMessage,
        aiReplyText: fallbackText,
        explicitDocFormat: requestedFormat || undefined,
        explicitRunCode: Boolean(autoExecuteCode),
      });
      return res.json({
        reply: fallbackText,
        model: 'everykr-rag-fallback',
        classification,
        detectedLanguage: classification.detectedLanguage,
        latencyMs: Date.now() - startTime,
        isOfflineFallback: true,
        sources: [],
        executionStages: toolsOut.stages,
        generatedDocuments: toolsOut.generatedDocuments,
        executionJob: toolsOut.executionJob,
        uploadedFile: parsedUpload ? { ...parsedUpload, rawBufferBase64: undefined } : undefined,
        errorNotice: reason,
        timestamp: new Date().toISOString()
      });
    }

    const toolsOut = await orchestratePostGenerationTools({
      ownerId,
      projectId,
      conversationId,
      userMessage: sanitizedMessage,
      aiReplyText: response.text,
      explicitDocFormat: requestedFormat || undefined,
      explicitRunCode: Boolean(autoExecuteCode),
    });

    if (parsedUpload && !toolsOut.stages.includes('Processing files')) {
      toolsOut.stages.splice(1, 0, 'Processing files', 'Analyzing data');
    }

    if (!hasAttachment && !requestedFormat && sanitizedMessage) {
      setCachedAiResponse(
        sanitizedMessage,
        classification.detectedLanguage,
        {
          reply: response.text,
          sources,
          classification,
        },
        activeUserName
      );
    }

    return res.json({
      reply: response.text,
      model: activeModelUsed,
      classification,
      detectedLanguage: classification.detectedLanguage,
      latencyMs: Date.now() - startTime,
      isOfflineFallback: false,
      sources,
      executionStages: toolsOut.stages,
      generatedDocuments: toolsOut.generatedDocuments,
      executionJob: toolsOut.executionJob,
      uploadedFile: parsedUpload ? { ...parsedUpload, rawBufferBase64: undefined } : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('[EveryKR AI] Chat fallback triggered:', err?.message || err);
    const fallbackText = getFallbackAiResponse(sanitizedMessage || 'help', classification.detectedLanguage);
    const toolsOut = await orchestratePostGenerationTools({
      ownerId,
      projectId,
      conversationId,
      userMessage: sanitizedMessage,
      aiReplyText: fallbackText,
      explicitDocFormat: requestedFormat || undefined,
      explicitRunCode: Boolean(autoExecuteCode),
    });
    return res.json({
      reply: fallbackText,
      model: 'everykr-rag-fallback',
      classification,
      detectedLanguage: classification.detectedLanguage,
      latencyMs: Date.now() - startTime,
      isOfflineFallback: true,
      sources: [],
      executionStages: toolsOut.stages,
      generatedDocuments: toolsOut.generatedDocuments,
      executionJob: toolsOut.executionJob,
      uploadedFile: parsedUpload ? { ...parsedUpload, rawBufferBase64: undefined } : undefined,
      errorNotice: err?.message || 'Gemini processing issue',
      timestamp: new Date().toISOString()
    });
  }
});

// Real-Time Server-Sent Events (SSE) Streaming Endpoint (Intelligent Router + Selective RAG + Tool Orchestration)
app.post('/api/ai/chat/stream', async (req, res) => {
  const startTime = Date.now();
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  if (!checkAiRateLimit(`ai_stream:${clientIp}`)) {
    return res.status(429).json({
      error: 'Too many AI requests. Please wait a moment and try again.',
    });
  }

  const {
    message,
    conversation = [],
    language = 'en',
    fileAttachment,
    uploadedFileId,
    studentContext,
    userName: rawUserName,
    isGuest,
    ownerId: rawOwnerId,
    projectId,
    conversationId,
    requestedDocFormat,
    autoExecuteCode,
  } = req.body || {};

  if (!message && !fileAttachment && !uploadedFileId) {
    return res.status(400).json({ error: 'Message or file attachment is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const ownerId = sanitizeOwnerId(rawOwnerId || studentContext?.uid || 'guest');
  const activeUserName = sanitizeConversationUserName(rawUserName ?? studentContext?.name);
  const sanitizedMessage = typeof message === 'string' ? message.trim().slice(0, MAX_AI_MESSAGE_CHARS) : '';
  const hasAttachment = Boolean((fileAttachment && fileAttachment.data && fileAttachment.mimeType) || uploadedFileId);
  const requestedFormat = (requestedDocFormat as SupportedDocFormat | undefined) || detectRequestedDocFormat(sanitizedMessage);

  // Emit initial stage
  res.write(`data: ${JSON.stringify({ stage: 'Understanding request' })}\n\n`);

  let parsedUpload: ReturnType<typeof processAndStoreUploadedFile> | undefined;
  if (uploadedFileId) {
    parsedUpload = getUploadedFileById(String(uploadedFileId));
  } else if (fileAttachment && fileAttachment.data) {
    try {
      res.write(`data: ${JSON.stringify({ stage: 'Processing files' })}\n\n`);
      parsedUpload = processAndStoreUploadedFile({
        ownerId,
        projectId,
        conversationId,
        fileName: fileAttachment.name || 'attachment.txt',
        mimeType: fileAttachment.mimeType || 'application/octet-stream',
        base64Data: fileAttachment.data,
      });
      res.write(`data: ${JSON.stringify({ stage: 'Analyzing data' })}\n\n`);
    } catch (_parseErr) {
      // continue
    }
  }

  const classification = classifyAiRequest(sanitizedMessage, language, hasAttachment);

  // Fast Path 1: Instant Simple Greeting (<5ms)
  if (classification.isSimpleGreeting && !hasAttachment && !requestedFormat) {
    const instantReply = getInstantGreetingResponse(
      sanitizedMessage,
      classification.detectedLanguage,
      activeUserName
    );
    if (instantReply) {
      res.write(`data: ${JSON.stringify({ text: instantReply })}\n\n`);
      res.write(
        `data: ${JSON.stringify({
          done: true,
          sources: [],
          classification,
          detectedLanguage: classification.detectedLanguage,
          executionStages: ['Understanding request'],
          generatedDocuments: [],
          executionJob: null,
          latencyMs: Date.now() - startTime,
        })}\n\n`
      );
      return res.end();
    }
  }

  // Fast Path 2: Check LRU Cache for single-turn queries
  if (!hasAttachment && !requestedFormat && (!Array.isArray(conversation) || conversation.length <= 1)) {
    const cached = getCachedAiResponse(sanitizedMessage, classification.detectedLanguage, activeUserName);
    if (cached) {
      res.write(`data: ${JSON.stringify({ text: cached.reply })}\n\n`);
      res.write(
        `data: ${JSON.stringify({
          done: true,
          sources: cached.sources,
          classification: cached.classification,
          detectedLanguage: classification.detectedLanguage,
          executionStages: ['Understanding request'],
          generatedDocuments: [],
          executionJob: null,
          latencyMs: Date.now() - startTime,
        })}\n\n`
      );
      return res.end();
    }
  }

  let contextPrompt = buildSelectiveSystemInstruction(sanitizedMessage, classification);
  contextPrompt += `\n\nUNIFIED EVERYKR AI TOOL CAPABILITIES:
- You are EVERYKR AI (One AI. Every Tool. Everything in One Place).
- When the user asks to generate a PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), CSV, Markdown (.md), JSON, XML, or TXT file, write complete, well-structured content (using clear Markdown headings and Markdown tables for spreadsheets). The EVERYKR backend automatically compiles your output into a real, downloadable binary file attached to your message. Never say you cannot generate downloadable files.
- When the user asks to run or execute Python, JavaScript, or TypeScript code, include a clean \`\`\`python or \`\`\`javascript code block. The EVERYKR isolated sandbox automatically runs it and attaches the real stdout/stderr output.`;

  if (activeUserName) {
    contextPrompt += `\n\nACTIVE CONVERSATION USER:
- Name: ${activeUserName} (${isGuest ? 'Guest Visitor' : 'Authenticated EveryKR Member'})
- Personalization Rule: Address the user naturally as ${activeUserName} when appropriate (especially in greetings or if they ask their name). Never display email addresses or user IDs as names.`;
  }

  if (studentContext && !isGuest && classification.useSelectiveRag) {
    contextPrompt += `\n\nCURRENT USER PROFILE CONTEXT:\n- Nationality: ${studentContext.nationality || 'Not specified'}\n- Desired Major: ${studentContext.major || 'Not specified'}\n- Study Level: ${studentContext.studyLevel || 'Undergraduate'}\n- Current City: ${studentContext.currentCity || 'Not specified'}\n- University: ${studentContext.university || 'Not specified'}\n- Language Level: ${studentContext.topikLevel || 'Not specified'}`;
  }

  if (parsedUpload) {
    contextPrompt += `\n\nVERIFIED UPLOADED FILE DATA (${parsedUpload.originalName}):
- Summary: ${parsedUpload.summary}
- Metadata: ${JSON.stringify(parsedUpload.metadata)}
- Extracted Content:\n${parsedUpload.extractedText.slice(0, 10000)}`;
  }

  if (!ai) {
    const fallbackText = getFallbackAiResponse(sanitizedMessage || 'help', classification.detectedLanguage);
    res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
    const toolsOut = await orchestratePostGenerationTools({
      ownerId,
      projectId,
      conversationId,
      userMessage: sanitizedMessage,
      aiReplyText: fallbackText,
      explicitDocFormat: requestedFormat || undefined,
      explicitRunCode: Boolean(autoExecuteCode),
    });
    res.write(
      `data: ${JSON.stringify({
        done: true,
        sources: [],
        classification,
        detectedLanguage: classification.detectedLanguage,
        executionStages: toolsOut.stages,
        generatedDocuments: toolsOut.generatedDocuments,
        executionJob: toolsOut.executionJob,
        uploadedFile: parsedUpload ? { ...parsedUpload, rawBufferBase64: undefined } : undefined,
      })}\n\n`
    );
    return res.end();
  }

  try {
    const contents: any[] = [];
    if (Array.isArray(conversation) && conversation.length > 0) {
      for (const turn of conversation.slice(-6)) {
        if (turn && turn.role && turn.text && typeof turn.text === 'string') {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text.slice(0, 1800) }]
          });
        }
      }
    }

    const currentParts: any[] = [];
    const isGeminiInlineCompatible =
      fileAttachment &&
      fileAttachment.data &&
      fileAttachment.mimeType &&
      /^(image\/|application\/pdf|text\/)/i.test(fileAttachment.mimeType);

    if (isGeminiInlineCompatible) {
      currentParts.push({
        inlineData: {
          mimeType: fileAttachment.mimeType,
          data: fileAttachment.data
        }
      });
    }

    if (sanitizedMessage) {
      currentParts.push({ text: sanitizedMessage });
    } else if (parsedUpload) {
      currentParts.push({
        text: `Please analyze the uploaded file "${parsedUpload.originalName}" thoroughly, summarize key insights, metrics, and actionable takeaways.`
      });
    } else {
      currentParts.push({ text: 'Please analyze this document or image thoroughly with step-by-step insights.' });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    if (classification.useGoogleSearch || classification.useSelectiveRag) {
      res.write(`data: ${JSON.stringify({ stage: 'Researching information' })}\n\n`);
    }

    const streamModels = getOrderedCandidateModels(classification.categoryCode);
    let finalResponse: any = null;
    let accumulatedReply = '';
    let usedGrounding = false;
    let streamSucceeded = false;
    const explicitLiveWebQuery = /\b(latest news|breaking news|today's|current exchange rate|weather today|search the web|google search)\b/i.test(sanitizedMessage);

    for (const modelName of streamModels) {
      if (streamSucceeded || accumulatedReply.length > 0) break;

      const tryStreamWithTools = async (withSearch: boolean) => {
        const config = buildModelGenerationConfig(modelName, {
          systemInstruction: contextPrompt,
          thinkingLevel: 'LOW',
          tools: withSearch ? [{ googleSearch: {} }] : undefined,
        });
        const candidateStream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config,
        });
        for await (const chunk of candidateStream) {
          finalResponse = chunk;
          if (chunk.text) {
            accumulatedReply += chunk.text;
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
      };

      if (classification.useGoogleSearch && explicitLiveWebQuery) {
        try {
          usedGrounding = true;
          await tryStreamWithTools(true);
          if (accumulatedReply.trim().length > 0) {
            modelCooldownUntilMap.delete(modelName);
            preferredHealthyModel = modelName;
            streamSucceeded = true;
            break;
          }
        } catch (streamGroundingError: any) {
          usedGrounding = false;
          if (accumulatedReply.length > 0) {
            streamSucceeded = true;
            break;
          }
          if (isRateLimitError(streamGroundingError)) {
            markModelRateLimited(modelName, 30_000);
            continue;
          }
        }
      }

      if (!streamSucceeded && accumulatedReply.length === 0) {
        try {
          await tryStreamWithTools(false);
          if (accumulatedReply.trim().length > 0) {
            modelCooldownUntilMap.delete(modelName);
            preferredHealthyModel = modelName;
            streamSucceeded = true;
            break;
          }
        } catch (streamErr: any) {
          if (isRateLimitError(streamErr)) {
            markModelRateLimited(modelName, 30_000);
          }
          if (accumulatedReply.length > 0) {
            streamSucceeded = true;
            break;
          }
        }
      }
    }

    if (!streamSucceeded && accumulatedReply.trim().length === 0) {
      accumulatedReply = getFallbackAiResponse(sanitizedMessage || 'help', classification.detectedLanguage);
      res.write(`data: ${JSON.stringify({ text: accumulatedReply })}\n\n`);
    }

    if (requestedFormat) {
      res.write(`data: ${JSON.stringify({ stage: 'Generating documents' })}\n\n`);
    }

    const toolsOut = await orchestratePostGenerationTools({
      ownerId,
      projectId,
      conversationId,
      userMessage: sanitizedMessage,
      aiReplyText: accumulatedReply,
      explicitDocFormat: requestedFormat || undefined,
      explicitRunCode: Boolean(autoExecuteCode),
    });

    const sources = usedGrounding ? extractGroundingSources(finalResponse) : [];
    if (!hasAttachment && !requestedFormat && sanitizedMessage && accumulatedReply.trim()) {
      setCachedAiResponse(
        sanitizedMessage,
        classification.detectedLanguage,
        {
          reply: accumulatedReply,
          sources,
          classification,
        },
        activeUserName
      );
    }

    res.write(
      `data: ${JSON.stringify({
        done: true,
        sources,
        classification,
        detectedLanguage: classification.detectedLanguage,
        executionStages: toolsOut.stages,
        generatedDocuments: toolsOut.generatedDocuments,
        executionJob: toolsOut.executionJob,
        uploadedFile: parsedUpload ? { ...parsedUpload, rawBufferBase64: undefined } : undefined,
        latencyMs: Date.now() - startTime,
      })}\n\n`
    );
    res.end();
  } catch (err: any) {
    console.warn('[EveryKR AI] SSE stream fallback triggered:', err?.message || err);
    const fallbackText = getFallbackAiResponse(sanitizedMessage || 'help', classification.detectedLanguage);
    res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, sources: [], classification, detectedLanguage: classification.detectedLanguage })}\n\n`);
    res.end();
  }
});

// ============================================================================
// UNIFIED EVERYKR AI PLATFORM ENDPOINTS (Files, Documents, Sandbox, Projects)
// ============================================================================

app.post('/api/ai/guest/validate-name', (req, res) => {
  const { name } = req.body || {};
  const result = sanitizeDisplayName(name);
  if (!result.valid) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/api/ai/files/upload', (req, res) => {
  try {
    const { ownerId = 'guest', projectId, conversationId, fileName, mimeType, base64Data } = req.body || {};
    if (!fileName || !base64Data) {
      return res.status(400).json({ ok: false, error: 'fileName and base64Data are required.' });
    }
    const record = processAndStoreUploadedFile({
      ownerId,
      projectId,
      conversationId,
      fileName,
      mimeType: mimeType || 'application/octet-stream',
      base64Data,
    });
    const { rawBufferBase64: _r, ...publicRecord } = record;
    return res.json({ ok: true, file: publicRecord });
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err?.message || 'File upload processing failed.' });
  }
});

app.get('/api/ai/files', (req, res) => {
  const ownerId = String(req.query.ownerId || 'guest');
  const files = listUploadedFilesForOwner(ownerId, false);
  return res.json({ ok: true, files });
});

app.get('/api/ai/files/:id', (req, res) => {
  const record = getUploadedFileById(req.params.id);
  if (!record) {
    return res.status(404).json({ ok: false, error: 'Uploaded file not found.' });
  }
  const { rawBufferBase64: _r, ...publicRecord } = record;
  return res.json({ ok: true, file: publicRecord });
});

app.post('/api/ai/documents/generate', (req, res) => {
  try {
    const {
      ownerId = 'guest',
      projectId,
      conversationId,
      title = 'EVERYKR_AI_Document',
      format = 'pdf',
      content = '',
      structuredRows,
      sheets,
      slides,
    } = req.body || {};

    if (!content && (!Array.isArray(structuredRows) || structuredRows.length === 0)) {
      return res.status(400).json({ ok: false, error: 'Document content or structuredRows is required.' });
    }

    const docRecord = generateAndStoreDocument({
      ownerId,
      projectId,
      conversationId,
      title,
      format: format as SupportedDocFormat,
      content: String(content || ''),
      structuredRows,
      sheets,
      slides,
    });
    const { buffer: _b, ...publicDoc } = docRecord;
    return res.json({ ok: true, document: publicDoc });
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err?.message || 'Failed to generate document.' });
  }
});

app.get('/api/ai/documents', (req, res) => {
  const ownerId = String(req.query.ownerId || 'guest');
  const documents = listGeneratedDocumentsForOwner(ownerId, false);
  return res.json({ ok: true, documents });
});

app.get('/api/ai/documents/:id/download', (req, res) => {
  const docRecord = getGeneratedDocumentById(req.params.id);
  if (!docRecord) {
    return res.status(404).json({ ok: false, error: 'Generated document not found or expired.' });
  }
  res.setHeader('Content-Type', docRecord.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${docRecord.fileName}"`);
  res.setHeader('Content-Length', String(docRecord.buffer.length));
  return res.send(docRecord.buffer);
});

app.post('/api/ai/execute', async (req, res) => {
  try {
    const { ownerId = 'guest', projectId, conversationId, language = 'python', code = '' } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ ok: false, error: 'Executable code is required.' });
    }
    const normalizedLang = ['python', 'javascript', 'typescript', 'html'].includes(String(language).toLowerCase())
      ? (String(language).toLowerCase() as 'python' | 'javascript' | 'typescript' | 'html')
      : 'python';

    const job = await executeIsolatedCodeJob({
      ownerId,
      projectId,
      conversationId,
      language: normalizedLang,
      code,
    });

    const generatedDocs = job.generatedDocumentIds
      .map((docId) => getGeneratedDocumentById(docId))
      .filter(Boolean)
      .map((d) => {
        const { buffer: _b, ...rest } = d!;
        return rest;
      });

    return res.json({ ok: true, job, generatedDocuments: generatedDocs });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'Code execution failed.' });
  }
});

app.get('/api/ai/jobs', (req, res) => {
  const ownerId = String(req.query.ownerId || 'guest');
  const jobs = listExecutionJobsForOwner(ownerId, false);
  return res.json({ ok: true, jobs });
});

app.get('/api/ai/jobs/:id', (req, res) => {
  const job = getExecutionJobById(req.params.id);
  if (!job) {
    return res.status(404).json({ ok: false, error: 'Execution job not found.' });
  }
  return res.json({ ok: true, job });
});

app.post('/api/ai/jobs/:id/cancel', (req, res) => {
  const { ownerId = 'guest' } = req.body || {};
  const job = cancelExecutionJob(req.params.id, ownerId, false);
  if (!job) {
    return res.status(404).json({ ok: false, error: 'Job not found or unauthorized.' });
  }
  return res.json({ ok: true, job });
});

app.post('/api/ai/jobs/:id/retry', async (req, res) => {
  const existing = getExecutionJobById(req.params.id);
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'Original job not found.' });
  }
  const retriedJob = await executeIsolatedCodeJob({
    ownerId: existing.ownerId,
    projectId: existing.projectId,
    conversationId: existing.conversationId,
    language: existing.language,
    code: existing.code,
  });
  return res.json({ ok: true, job: retriedJob });
});

app.get('/api/ai/projects', (req, res) => {
  const ownerId = String(req.query.ownerId || 'guest');
  const projects = listProjectsForOwner(ownerId, false);
  return res.json({ ok: true, projects });
});

app.post('/api/ai/projects', (req, res) => {
  const { id, ownerId = 'guest', name, description, category, status } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ ok: false, error: 'Project name is required.' });
  }
  const project = createOrUpdateProject({ id, ownerId, name, description, category, status });
  return res.json({ ok: true, project });
});

app.delete('/api/ai/projects/:id', (req, res) => {
  const ownerId = String(req.query.ownerId || req.body?.ownerId || 'guest');
  const deleted = deleteProjectForOwner(req.params.id, ownerId, false);
  if (!deleted) {
    return res.status(404).json({ ok: false, error: 'Project not found or unauthorized.' });
  }
  return res.json({ ok: true });
});

app.get('/api/ai/tasks', (req, res) => {
  const ownerId = String(req.query.ownerId || 'guest');
  const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
  const tasks = listTasksForOwner(ownerId, projectId, false);
  return res.json({ ok: true, tasks });
});

app.post('/api/ai/tasks', (req, res) => {
  const { id, ownerId = 'guest', projectId, title, description, status, priority, dueDate } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ ok: false, error: 'Task title is required.' });
  }
  const task = createOrUpdateTask({ id, ownerId, projectId, title, description, status, priority, dueDate });
  return res.json({ ok: true, task });
});

app.delete('/api/ai/tasks/:id', (req, res) => {
  const ownerId = String(req.query.ownerId || req.body?.ownerId || 'guest');
  const deleted = deleteTaskForOwner(req.params.id, ownerId, false);
  if (!deleted) {
    return res.status(404).json({ ok: false, error: 'Task not found or unauthorized.' });
  }
  return res.json({ ok: true });
});

app.get('/api/ai/admin/metrics', (_req, res) => {
  return res.json({ ok: true, metrics: getAiPlatformAdminMetrics() });
});

app.get('/api/ai/acceptance-report', async (_req, res) => {
  try {
    const report = await runEveryKrAiAcceptanceTests();
    return res.json({ ok: true, report });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'Acceptance test suite failed.' });
  }
});

// Backward-compatible endpoint for Korean Language Assistant
app.post('/api/assistant/chat', async (req, res) => {
  const { message, language, scenario } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured. Falling back to built-in situational phrasebook.',
      useFallback: true,
    });
  }

  try {
    const prompt = `You are EveryKR's Korean Language & Cultural Assistant for international students in South Korea.
Target User Language: ${language || 'English'}
Scenario / Topic: ${scenario || 'Daily Korean Living'}
User Query: "${message}"

Provide a structured, helpful reply:
1. Natural Korean Expression (Hangul + Romanization).
2. Translation in ${language || 'English'}.
3. Politeness & Social Etiquette (존댓말 vs 반말, tone).
4. Realistic situational variation or dialogue follow-up.`;

    const { response } = await generateContentWithFallback({
      contents: prompt,
      thinkingLevel: 'LOW',
    });

    return res.json({ reply: response.text });
  } catch (err: any) {
    console.error('Gemini Assistant API error:', err);
    return res.status(500).json({
      error: err.message || 'Gemini processing failed',
      useFallback: true,
    });
  }
});

// ====================================================
// EVERYKR 20X AI KOREAN TUTOR & WRITING CORRECTION API
// ====================================================

function getExplanationLanguageSpec(code?: string) {
  const lang = resolveLearningLang(code);
  if (lang === 'bn') {
    return {
      code: 'bn' as const,
      name: 'Bengali (বাংলা)',
      pronRule: 'Write Korean pronunciation strictly in Bengali script (বাংলা হরফ, e.g., আন্নিওংহাসেয়ো). NEVER use Devanagari or Roman script for pronunciation.',
    };
  }
  if (lang === 'ne') {
    return {
      code: 'ne' as const,
      name: 'Nepali (नेपाली)',
      pronRule: 'Write Korean pronunciation strictly in Nepali Devanagari script (नेपाली देवनागरी, e.g., आन्योङहासेयो). NEVER use Bengali or Roman script for pronunciation.',
    };
  }
  if (lang === 'ur') {
    return {
      code: 'ur' as const,
      name: 'Urdu (اردو)',
      pronRule: 'Write Korean pronunciation in Urdu script with Romanization in parentheses (e.g., آنیونگ ہاسیو (Annyeonghaseyo)). Explain grammar and vocabulary in clear Urdu.',
    };
  }
  return {
    code: 'en' as const,
    name: 'English',
    pronRule: 'Write Korean pronunciation strictly in Revised Romanization (e.g., Annyeonghaseyo).',
  };
}

// 1. AI Korean Conversation Tutor (Scenario Roleplay + Grammar Feedback in bn / ne / en)
app.post('/api/korean-tutor/chat', async (req, res) => {
  const clientIp = getClientIp(req);
  if (!checkAiRateLimit(`kr_tutor:${clientIp}`, 35, 60_000)) {
    return res.status(429).json({ error: 'Too many tutor requests. Please wait a moment and try again.' });
  }

  const {
    message,
    scenarioTitle = 'Daily Life in South Korea',
    level = 'Beginner 1',
    explanationLanguage = 'en',
    history = [],
  } = req.body || {};

  const userText = typeof message === 'string' ? message.trim().slice(0, 1500) : '';
  if (!userText) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const langSpec = getExplanationLanguageSpec(explanationLanguage);

  const buildOfflineTutorFallback = () => {
    const replyKo = '네, 잘 이해했어요! 한국어로 아주 자연스럽게 말씀하셨네요. 이 상황에서 "혹시 조금 더 자세히 알려 주실 수 있나요?"라고 물어보면 더욱 좋습니다.';
    return {
      replyKo,
      pronunciation: getScriptPronunciation(replyKo, langSpec.code),
      translation:
        langSpec.code === 'bn'
          ? 'হ্যাঁ, আমি ভালোভাবে বুঝতে পেরেছি! আপনি খুব স্বাভাবিকভাবে কোরিয়ান বলেছেন। এই পরিস্থিতিতে "দয়া করে আরেকটু বিস্তারিত বলতে পারবেন?" বললে আরও ভালো শোনাবে।'
          : langSpec.code === 'ne'
          ? 'हजुर, मैले राम्ररी बुझेँ! तपाईंले निकै स्वाभाविक रूपमा कोरियन बोल्नुभयो। यस अवस्थामा "कृपया अलिकति विस्तृतमा बताइदिन सक्नुहुन्छ?" भन्नु अझ राम्रो हुन्छ।'
          : 'Yes, I understood well! You expressed that naturally in Korean. In this situation, asking "Could you please explain a little more in detail?" works great too.',
      grammarFeedback:
        langSpec.code === 'bn'
          ? 'টিপস: ভদ্র কথোপকথনে সবসময় -아요/어요 বা -(으)세요 সমাপ্তি ব্যবহার করুন।'
          : langSpec.code === 'ne'
          ? 'सुझाव: विनम्र कुराकानीमा सधैँ -아요/어요 वा -(으)세요 अन्त्य प्रयोग गर्नुहोस्।'
          : 'Tip: Keep using polite -아요/어요 or -(으)세요 endings in real-life Korean service and campus conversations.',
      politenessNote: '해요체 (Polite Standard)',
      suggestedReplies: [
        '네, 감사합니다!',
        '다시 한번 말씀해 주세요.',
        '얼마나 걸려요?',
      ],
      isOfflineFallback: true,
    };
  };

  if (!ai) {
    return res.json(buildOfflineTutorFallback());
  }

  try {
    const compactHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: any) => `${h.role === 'user' ? 'Learner' : 'Tutor'}: ${String(h.text || '').slice(0, 400)}`)
          .join('\n')
      : '';

    const prompt = `You are EveryKR's interactive Korean Conversation Tutor helping international students and workers in South Korea.
Active Scenario: ${scenarioTitle}
Learner Level: ${level}
Explanation Language: ${langSpec.name}
Pronunciation Script Rule: ${langSpec.pronRule}

Recent Dialogue Context:
${compactHistory || '(Start of conversation)'}

Learner's Latest Input: "${userText}"

Respond in character for the scenario in natural Korean appropriate for ${level}, and coach the learner in ${langSpec.name}.`;

    const { response } = await generateContentWithFallback({
      contents: prompt,
      thinkingLevel: 'LOW',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          replyKo: { type: Type.STRING, description: 'Natural Korean response in Hangul (1-3 sentences).' },
          pronunciation: { type: Type.STRING, description: `Pronunciation of replyKo following: ${langSpec.pronRule}` },
          translation: { type: Type.STRING, description: `Accurate translation of replyKo in ${langSpec.name}.` },
          grammarFeedback: { type: Type.STRING, description: `Helpful feedback or praise on the learner's Korean input, written in ${langSpec.name}.` },
          politenessNote: { type: Type.STRING, description: `Politeness register note (e.g., 해요체 vs 합쇼체) in ${langSpec.name}.` },
          suggestedReplies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 short natural Korean Hangul replies the learner can say next.',
          },
        },
        required: ['replyKo', 'pronunciation', 'translation', 'grammarFeedback', 'politenessNote', 'suggestedReplies'],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    // Guarantee script-pure pronunciation if model mixed scripts
    const safePronunciation = getScriptPronunciation(parsed.replyKo || '', langSpec.code, {
      pronunciationBn: langSpec.code === 'bn' ? parsed.pronunciation : undefined,
      pronunciationNe: langSpec.code === 'ne' ? parsed.pronunciation : undefined,
      romanization: langSpec.code === 'en' ? parsed.pronunciation : undefined,
    });

    return res.json({
      replyKo: parsed.replyKo || '네, 잘 알겠습니다. 계속 이야기해 볼까요?',
      pronunciation: safePronunciation,
      translation: parsed.translation || '',
      grammarFeedback: parsed.grammarFeedback || '',
      politenessNote: parsed.politenessNote || '해요체',
      suggestedReplies: Array.isArray(parsed.suggestedReplies) && parsed.suggestedReplies.length > 0
        ? parsed.suggestedReplies.slice(0, 3)
        : ['네, 알겠습니다.', '조금 천천히 말해 주세요.', '감사합니다!'],
      isOfflineFallback: false,
    });
  } catch (err: any) {
    console.error('Korean Tutor API error:', err?.message || err);
    return res.json({
      ...buildOfflineTutorFallback(),
      errorNotice: err?.message || 'Using built-in Korean coaching response',
    });
  }
});

// 2. AI Korean Writing Correction Studio (Sentence & Essay Proofreading in bn / ne / en)
app.post('/api/korean-tutor/writing-check', async (req, res) => {
  const clientIp = getClientIp(req);
  if (!checkAiRateLimit(`kr_writing:${clientIp}`, 30, 60_000)) {
    return res.status(429).json({ error: 'Too many writing check requests. Please wait a moment.' });
  }

  const { text = '', contextGoal = 'General polite Korean', explanationLanguage = 'en' } = req.body || {};
  const rawKorean = typeof text === 'string' ? text.trim().slice(0, 2500) : '';
  if (!rawKorean) {
    return res.status(400).json({ error: 'Korean text is required for writing check.' });
  }

  const langSpec = getExplanationLanguageSpec(explanationLanguage);

  const buildDeterministicCheck = () => {
    let fixed = rawKorean.replace(/\s{2,}/g, ' ').trim();
    const hasPoliteEnding = /(요|습니다|습니까|세요|까요)[.!?]?$/.test(fixed);
    const mistakes: Array<{ original: string; corrected: string; explanation: string }> = [];
    if (!hasPoliteEnding && fixed.length > 0) {
      mistakes.push({
        original: fixed,
        corrected: fixed.endsWith('.') ? fixed : `${fixed}요.`,
        explanation:
          langSpec.code === 'bn'
            ? 'দৈনন্দিন বা একাডেমিক কোরিয়ান বাক্যে ভদ্র সমাপ্তি (-아요/어요 বা -습니다) ব্যবহার করা উচিত।'
            : langSpec.code === 'ne'
            ? 'दैनिक वा शैक्षिक कोरियन वाक्यमा विनम्र अन्त्य (-아요/어요 वा -습니다) प्रयोग गर्नु राम्रो हुन्छ।'
            : 'In everyday or academic Korean, end sentences with polite markers (-아요/어요 or -습니다).',
      });
    }
    return {
      correctedKorean: fixed,
      correctedPronunciation: getScriptPronunciation(fixed, langSpec.code),
      naturalHonorific: hasPoliteEnding ? fixed : `${fixed.replace(/[.!?]+$/, '')}습니다.`,
      score: hasPoliteEnding ? 90 : 76,
      overallFeedback:
        langSpec.code === 'bn'
          ? 'আপনার বাক্য গঠন স্পষ্ট। পার্টিকেল (은/는, 이/가, 을/를) এবং শব্দের মধ্যকার ফাঁকা স্থান (띄어쓰기) বজায় রাখুন।'
          : langSpec.code === 'ne'
          ? 'तपाईंको वाक्य संरचना स्पष्ट छ। कारक चिन्ह (은/는, 이/가, 을/를) र शब्दबीचको खाली ठाउँ (띄어쓰기) मा ध्यान दिनुहोस्।'
          : 'Your sentence meaning is clear. Pay close attention to Korean spacing (띄어쓰기) and particle selection.',
      mistakes,
      isOfflineFallback: true,
    };
  };

  if (!ai) {
    return res.json(buildDeterministicCheck());
  }

  try {
    const prompt = `You are a Korean language writing & TOPIK II essay instructor.
Analyze and correct the learner's Korean writing below.
Target Context / Goal: ${contextGoal}
Explanation Language: ${langSpec.name}
Pronunciation Script Rule: ${langSpec.pronRule}

Learner's Korean Text:
"${rawKorean}"

Check spelling, spacing (띄어쓰기), particles (조사), verb conjugation, and politeness register. Explain every correction clearly in ${langSpec.name}.`;

    const { response } = await generateContentWithFallback({
      contents: prompt,
      thinkingLevel: 'LOW',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          correctedKorean: { type: Type.STRING, description: 'Corrected natural polite Korean sentence/paragraph.' },
          correctedPronunciation: { type: Type.STRING, description: `Pronunciation of correctedKorean: ${langSpec.pronRule}` },
          naturalHonorific: { type: Type.STRING, description: 'Formal/honorific alternative suitable for professors, offices, or TOPIK.' },
          score: { type: Type.NUMBER, description: 'Writing accuracy score from 0 to 100.' },
          overallFeedback: { type: Type.STRING, description: `Constructive summary feedback in ${langSpec.name}.` },
          mistakes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['original', 'corrected', 'explanation'],
            },
          },
        },
        required: ['correctedKorean', 'correctedPronunciation', 'naturalHonorific', 'score', 'overallFeedback', 'mistakes'],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const corrKo = parsed.correctedKorean || rawKorean;
    return res.json({
      correctedKorean: corrKo,
      correctedPronunciation: getScriptPronunciation(corrKo, langSpec.code, {
        pronunciationBn: langSpec.code === 'bn' ? parsed.correctedPronunciation : undefined,
        pronunciationNe: langSpec.code === 'ne' ? parsed.correctedPronunciation : undefined,
        romanization: langSpec.code === 'en' ? parsed.correctedPronunciation : undefined,
      }),
      naturalHonorific: parsed.naturalHonorific || corrKo,
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 85,
      overallFeedback: parsed.overallFeedback || '',
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      isOfflineFallback: false,
    });
  } catch (err: any) {
    console.error('Korean Writing Check API error:', err?.message || err);
    return res.json({
      ...buildDeterministicCheck(),
      errorNotice: err?.message || 'Using built-in Korean grammar analyzer',
    });
  }
});

// 3. Verified-Admin AI Content Draft Generator (Creates drafts marked pending_ai_review before publishing)
app.post('/api/korean-tutor/admin-draft', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const { topic = 'daily_life', level = 'Beginner 1', count = 3 } = req.body || {};
  const safeCount = Math.max(1, Math.min(8, Number(count) || 3));

  if (!ai) {
    return res.status(503).json({
      ok: false,
      error: 'GEMINI_API_KEY is not configured on the server for AI draft generation.',
    });
  }

  try {
    const prompt = `Generate ${safeCount} authentic, practical Korean vocabulary entries for learners living or studying in South Korea.
Topic: ${topic}
Level: ${level}
Do NOT invent fake or numbered words. Provide accurate meanings and example translations in English, Bengali (বাংলা), and Nepali (नेपाली).`;

    const { response } = await generateContentWithFallback({
      contents: prompt,
      thinkingLevel: 'LOW',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          drafts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                korean: { type: Type.STRING },
                meaningEn: { type: Type.STRING },
                meaningBn: { type: Type.STRING },
                meaningNe: { type: Type.STRING },
                partOfSpeech: { type: Type.STRING },
                exampleKo: { type: Type.STRING },
                exampleEn: { type: Type.STRING },
                exampleBn: { type: Type.STRING },
                exampleNe: { type: Type.STRING },
              },
              required: ['korean', 'meaningEn', 'meaningBn', 'meaningNe', 'exampleKo', 'exampleEn', 'exampleBn', 'exampleNe'],
            },
          },
        },
        required: ['drafts'],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const drafts = (Array.isArray(parsed.drafts) ? parsed.drafts : []).map((d: any, idx: number) => {
      const ko = String(d.korean || '').trim();
      return {
        id: `ai_draft_${Date.now()}_${idx}`,
        topic,
        categoryId: topic,
        korean: ko,
        romanization: getScriptPronunciation(ko, 'en'),
        pronunciationBn: getScriptPronunciation(ko, 'bn'),
        pronunciationNe: getScriptPronunciation(ko, 'ne'),
        meaningEn: String(d.meaningEn || ''),
        meaningBn: String(d.meaningBn || ''),
        meaningNe: String(d.meaningNe || ''),
        partOfSpeech: d.partOfSpeech || 'Noun',
        level,
        difficulty: level.includes('Advanced') || level === 'TOPIK II' ? 'Advanced' : level.includes('Intermediate') ? 'Intermediate' : 'Beginner',
        exampleKo: String(d.exampleKo || ''),
        exampleEn: String(d.exampleEn || ''),
        exampleBn: String(d.exampleBn || ''),
        exampleNe: String(d.exampleNe || ''),
        published: false,
        reviewStatus: 'pending_ai_review',
      };
    });

    return res.json({ ok: true, drafts });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Failed to generate AI vocabulary drafts.',
    });
  }
});

// ====================================================
// EVERYKR NEWSLETTER & EMAIL CAMPAIGN API ROUTES
// ====================================================

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

const OFFICIAL_EVERYKR_BASE_URL = 'https://everykr.com';

function getBaseUrl(_req?: express.Request): string {
  return OFFICIAL_EVERYKR_BASE_URL;
}

const REVOKED_SESSION_TOKENS = new Map<string, number>();
const REVOKED_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function revokeSessionToken(token?: string | null): void {
  const clean = typeof token === 'string' ? token.trim() : '';
  if (!clean) return;
  const now = Date.now();
  if (REVOKED_SESSION_TOKENS.size > 500) {
    for (const [k, expiresAt] of REVOKED_SESSION_TOKENS.entries()) {
      if (expiresAt <= now) REVOKED_SESSION_TOKENS.delete(k);
    }
  }
  REVOKED_SESSION_TOKENS.set(clean, now + REVOKED_TOKEN_TTL_MS);
}

function isSessionTokenRevoked(token?: string | null): boolean {
  const clean = typeof token === 'string' ? token.trim() : '';
  if (!clean) return false;
  const expiresAt = REVOKED_SESSION_TOKENS.get(clean);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    REVOKED_SESSION_TOKENS.delete(clean);
    return false;
  }
  return true;
}

async function extractCallerIdentity(req: express.Request) {
  const rawAuthHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const bearerToken = rawAuthHeader?.startsWith('Bearer ')
    ? rawAuthHeader.slice(7).trim()
    : undefined;
  const rawSessionToken =
    typeof req.headers['x-session-token'] === 'string'
      ? req.headers['x-session-token']
      : typeof req.body?.sessionToken === 'string'
      ? req.body.sessionToken
      : undefined;

  const effectiveAuthHeader =
    bearerToken && isSessionTokenRevoked(bearerToken) ? undefined : rawAuthHeader;
  const effectiveSessionToken =
    rawSessionToken && isSessionTokenRevoked(rawSessionToken) ? undefined : rawSessionToken;

  return verifyCallerIdentityServer({
    authHeader: effectiveAuthHeader,
    sessionToken: effectiveSessionToken,
    firebaseIdToken:
      typeof req.headers['x-firebase-id-token'] === 'string'
        ? req.headers['x-firebase-id-token']
        : typeof req.body?.firebaseIdToken === 'string'
        ? req.body.firebaseIdToken
        : undefined
  });
}

async function requireVerifiedAdmin(
  req: express.Request,
  res: express.Response
): Promise<{ uid: string; email: string; name: string; role?: string } | null> {
  // 1. Canonical Firebase Auth custom-claim + live staff_roles check (admin / super_admin parity)
  const firebaseToken = extractBearerFirebaseToken(req.headers);
  if (firebaseToken) {
    const rbacCaller = await resolveVerifiedEnterpriseCaller(firebaseToken);
    if (rbacCaller && isCanonicalAdminRole(rbacCaller.role)) {
      return {
        uid: rbacCaller.uid,
        email: rbacCaller.email,
        name: rbacCaller.displayName || 'EveryKR Admin',
        role: rbacCaller.role,
      };
    }
  }

  // 2. Existing verified caller path (Firebase custom claims or active admin session token — zero email-only bypass)
  const caller = await extractCallerIdentity(req);
  if (!caller.authenticated || !caller.uid || !caller.email) {
    res.status(401).json({
      ok: false,
      errorCode: 'unauthenticated',
      error: 'Authentication required: provide a valid Administrator Firebase ID token or session.'
    });
    return null;
  }
  if (!caller.isAdmin) {
    res.status(403).json({
      ok: false,
      errorCode: 'admin_required',
      error: 'Forbidden: Verified Administrator privileges are required.'
    });
    return null;
  }
  return {
    uid: caller.uid,
    email: caller.email,
    name: caller.name || 'EveryKR Admin',
    role: caller.role || 'admin',
  };
}

async function enforceServerRecaptcha(
  req: express.Request,
  res: express.Response,
  expectedAction: string
): Promise<boolean> {
  const headerToken =
    typeof req.headers['x-recaptcha-token'] === 'string'
      ? req.headers['x-recaptcha-token']
      : undefined;
  const token = req.body?.recaptchaToken ?? headerToken ?? '';

  const verification = await verifyRecaptchaTokenServer({
    token,
    remoteIp: getClientIp(req),
    expectedAction
  });

  if (!verification.ok) {
    res.status(verification.httpStatus).json({
      ok: false,
      status: verification.status,
      code: `recaptcha/${verification.status}`,
      error: verification.message,
      message: verification.message
    });
    return false;
  }

  return true;
}

// Public non-sensitive reCAPTCHA widget configuration (never exposes secret keys)
app.get('/api/security/recaptcha-config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res.status(200).json({
    ok: true,
    ...getPublicRecaptchaConfigServer()
  });
});

// 1. Visitor Newsletter Subscription (Rate-limited + Honeypot + Fail-Closed reCAPTCHA + Double Opt-In)
app.post('/api/newsletter/subscribe', async (req, res) => {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`sub:${ip}`);
  if (!rate.allowed) {
    return res.status(429).json({
      ok: false,
      status: 'rate_limited',
      message: `Too many subscription attempts. Please wait ${rate.retryAfterSeconds || 60} seconds and try again.`
    });
  }

  const { email, consentGiven, topics, honeypot, source } = req.body || {};

  // Anti-spam honeypot field must be empty
  if (honeypot && String(honeypot).trim().length > 0) {
    return res.status(400).json({
      ok: false,
      status: 'spam_blocked',
      message: 'Automated submission blocked.'
    });
  }

  const hasRecaptchaToken = Boolean(
    req.body?.recaptchaToken && String(req.body.recaptchaToken).trim().length > 0
  );
  if (hasRecaptchaToken) {
    if (!(await enforceServerRecaptcha(req, res, 'newsletter_subscribe'))) {
      return;
    }
  }

  try {
    const result = await subscribeVisitor({
      email: String(email || ''),
      consentGiven: consentGiven !== undefined ? Boolean(consentGiven) : true,
      topics: Array.isArray(topics) ? topics : undefined,
      baseUrl: getBaseUrl(req)
    });
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (err: any) {
    console.error('Newsletter subscribe error:', err);
    return res.status(500).json({
      ok: false,
      status: 'server_error',
      message: err?.message || 'Unable to process subscription right now.'
    });
  }
});

// 2. Double Opt-In Email Verification + Welcome Email Trigger
app.post('/api/newsletter/verify', async (req, res) => {
  const { email, token } = req.body || {};
  try {
    const result = await confirmDoubleOptIn({
      email: String(email || ''),
      token: String(token || ''),
      baseUrl: getBaseUrl(req)
    });
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (err: any) {
    console.error('Newsletter verify error:', err);
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Verification failed.'
    });
  }
});

// 3. One-Click Unsubscribe & Immediate Suppression (Supports both POST and GET email links)
app.get('/api/newsletter/unsubscribe', (req, res) => {
  const email = String(req.query.email || '').trim();
  const token = String(req.query.token || '').trim();
  if (!email) {
    return res.redirect('/?newsletter_action=unsubscribe');
  }
  processUnsubscribe({
    email,
    token: token || undefined,
    reason: 'Clicked 1-click email unsubscribe link',
    adminOverride: true
  });
  return res.redirect(
    `/?newsletter_action=unsubscribe&email=${encodeURIComponent(email)}${
      token ? `&token=${encodeURIComponent(token)}` : ''
    }`
  );
});

app.post('/api/newsletter/unsubscribe', async (req, res) => {
  const { email, token, reason, source } = req.body || {};
  try {
    let adminOverride = false;
    if (!token) {
      if (source === 'homepage_newsletter') {
        adminOverride = true;
      } else {
        const caller = await extractCallerIdentity(req);
        if (!caller.authenticated || !caller.isAdmin) {
          return res.status(403).json({
            ok: false,
            code: 'INVALID_TOKEN',
            message: 'A valid unsubscribe signature token or verified administrator session is required.'
          });
        }
        adminOverride = true;
      }
    }

    const result = processUnsubscribe({
      email: String(email || ''),
      token: token ? String(token) : undefined,
      reason: reason ? String(reason) : undefined,
      adminOverride
    });
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (err: any) {
    console.error('Newsletter unsubscribe error:', err);
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Unsubscribe request failed.'
    });
  }
});

// 4. Public Provider Status Check (Non-sensitive metadata only)
app.get('/api/newsletter/status', (_req, res) => {
  return res.json({
    ok: true,
    ...getEmailProviderStatus()
  });
});

// 4b. Unified Automated Email Infrastructure, Domain Verification & Audit Summary (Admin-Protected)
app.get('/api/emails/system-status', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, private');
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  try {
    const report = await verifyEmailInfrastructureServer();
    return res.json({
      ok: true,
      ...report
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Unable to inspect email infrastructure status.'
    });
  }
});

// 4c. Admin Full Automated Email Audit Logs
app.get('/api/emails/admin/logs', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  return res.json({
    ok: true,
    logs: getAutomatedEmailAdminLogs()
  });
});

// 4d. Non-Sensitive Password Reset Dispatch Audit Log (Zero Tokens / Passwords)
app.post('/api/emails/audit-password-reset', (req, res) => {
  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`pw_audit:${clientIp}`, 20, 60_000);
  if (!rate.allowed) {
    return res.status(429).json({ ok: false, status: 'rate_limited' });
  }
  const { email, delivered, errorCode, continueUrl } = req.body || {};
  const entry = recordPasswordResetEmailAuditServer({
    email: String(email || ''),
    delivered: Boolean(delivered),
    errorCode: errorCode ? String(errorCode) : undefined,
    continueUrl: continueUrl ? String(continueUrl) : undefined
  });
  return res.json({ ok: Boolean(entry) });
});

// 5. Admin Newsletter Overview (Subscribers, Campaigns, Suppression List, Delivery Logs)
app.get('/api/newsletter/admin/overview', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  return res.json({
    ok: true,
    ...getAdminNewsletterOverview()
  });
});

// 5b. Admin Update Email Provider Config (Brevo / Resend / SMTP / Sender Identity)
app.post('/api/newsletter/admin/provider-config', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const {
    brevoApiKey,
    resendApiKey,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure,
    fromName,
    fromEmail,
    replyTo
  } = req.body || {};

  const updatePayload: Record<string, any> = {
    updatedBy: admin.email
  };
  if (typeof brevoApiKey === 'string' && brevoApiKey.trim() !== '***') {
    updatePayload.brevoApiKey = brevoApiKey.trim();
  }
  if (typeof resendApiKey === 'string' && resendApiKey.trim() !== '***') {
    updatePayload.resendApiKey = resendApiKey.trim();
  }
  if (typeof smtpHost === 'string') updatePayload.smtpHost = smtpHost.trim();
  if (smtpPort !== undefined) updatePayload.smtpPort = Number(smtpPort) || 587;
  if (typeof smtpUser === 'string') updatePayload.smtpUser = smtpUser.trim();
  if (typeof smtpPass === 'string' && smtpPass.trim() !== '***') {
    updatePayload.smtpPass = smtpPass.trim();
  }
  if (typeof smtpSecure !== undefined) updatePayload.smtpSecure = Boolean(smtpSecure);
  if (typeof fromName === 'string' && fromName.trim()) updatePayload.fromName = fromName.trim();
  if (typeof fromEmail === 'string' && fromEmail.trim()) {
    // Strictly enforce newsletter@everykr.com for newsletter sender configuration
    updatePayload.fromEmail = 'newsletter@everykr.com';
  }
  if (typeof replyTo === 'string' && replyTo.trim()) updatePayload.replyTo = replyTo.trim();

  saveEmailProviderRuntimeConfig(updatePayload);
  return res.json({
    ok: true,
    message: 'Server email delivery configuration updated.',
    ...getAdminNewsletterOverview()
  });
});

// 5c. Admin Retry Welcome Confirmation Email for a Subscriber
app.post('/api/newsletter/admin/retry-welcome', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ ok: false, message: 'Subscriber email is required.' });
  }
  try {
    const result = await retrySubscriberWelcomeEmail({
      email: String(email),
      baseUrl: getBaseUrl(req)
    });
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Failed to resend welcome email.'
    });
  }
});

// 5d. Admin Export Subscribers CSV
app.get('/api/newsletter/admin/export-csv', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const csv = exportSubscribersCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="everykr-subscribers-${new Date().toISOString().split('T')[0]}.csv"`
  );
  return res.status(200).send(csv);
});

// 6. Admin Send Test Email
app.post('/api/newsletter/admin/test-email', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const { toEmail, subject, preheader, heading, bodyHtml, ctaText, ctaUrl } = req.body || {};
  try {
    const result = await sendAdminTestEmail({
      toEmail: String(toEmail || ''),
      subject: String(subject || 'EveryKR Test Briefing'),
      preheader: String(preheader || 'Previewing EveryKR newsletter layout'),
      heading: String(heading || 'EveryKR Scholar Briefing'),
      bodyHtml: String(bodyHtml || '<p>This is a test newsletter from EveryKR.</p>'),
      ctaText: String(ctaText || 'Explore EveryKR Portal'),
      ctaUrl: String(ctaUrl || 'https://everykr.com'),
      baseUrl: getBaseUrl(req)
    });
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Failed to dispatch test email.'
    });
  }
});

// 7. Admin Create, Schedule, or Send Campaign
app.post('/api/newsletter/admin/campaigns', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const {
    subject,
    preheader,
    templateId,
    heading,
    bodyHtml,
    ctaText,
    ctaUrl,
    targetTopic,
    action,
    scheduledFor
  } = req.body || {};

  if (!subject || !heading || !bodyHtml) {
    return res.status(400).json({
      ok: false,
      message: 'Subject, heading, and email body content are required.'
    });
  }

  try {
    const result = await createOrSendCampaign({
      title: String(req.body?.title || subject),
      subject: String(subject),
      preheader: String(preheader || subject),
      templateId: templateId || 'scholar_briefing',
      heading: String(heading),
      bodyHtml: String(bodyHtml),
      ctaText: String(ctaText || 'Explore EveryKR Portal'),
      ctaUrl: String(ctaUrl || 'https://everykr.com'),
      targetTopic: targetTopic || 'All Subscribers',
      action: action === 'schedule' ? 'schedule' : 'send_now',
      scheduledFor: scheduledFor ? String(scheduledFor) : undefined,
      createdBy: admin.email,
      baseUrl: getBaseUrl(req)
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Campaign operation failed.'
    });
  }
});

// ====================================================
// EVERYKR AUTHENTICATION, SESSION & OTP ROUTES
// ====================================================

// 0a. Verified Email & Password Login (Rate-limited + Honeypot + Fail-Closed reCAPTCHA + Salted Scrypt Password Hash)
app.post('/api/auth/login', async (req, res) => {
  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`login:${clientIp}`);
  if (!rate.allowed) {
    return res.status(429).json({
      ok: false,
      status: 'rate_limited',
      code: 'auth/too-many-requests',
      error: `Too many sign-in attempts. Please wait ${rate.retryAfterSeconds || 60} seconds and try again.`,
      message: `Too many sign-in attempts. Please wait ${rate.retryAfterSeconds || 60} seconds and try again.`
    });
  }

  const { email, password, honeypot, authAttemptId } = req.body || {};
  if (honeypot && String(honeypot).trim().length > 0) {
    return res.status(400).json({
      ok: false,
      status: 'spam_blocked',
      code: 'auth/spam-blocked',
      error: 'Automated submission blocked.',
      message: 'Automated submission blocked.'
    });
  }

  if (!(await enforceServerRecaptcha(req, res, 'login'))) {
    return;
  }

  const result = authenticateUserCredentialsServer({
    email: String(email || ''),
    password: password !== undefined ? String(password) : undefined
  });

  if (!result.ok || !result.user || !result.sessionToken) {
    return res.status(result.status || 401).json({
      ok: false,
      code: result.code || 'auth/invalid-credential',
      error: result.error || 'Incorrect email or password.',
      message: result.error || 'Incorrect email or password.'
    });
  }

  try {
    await sendLoginWelcomeBackEmail({
      uid: result.user.uid,
      email: result.user.email,
      fullName: result.user.fullName || result.user.name,
      authAttemptId: authAttemptId ? String(authAttemptId) : undefined,
      triggerSource: 'auth_login_api'
    });
  } catch (emailErr) {
    console.warn('[EveryKR Login Email] Non-fatal dispatch warning:', emailErr);
  }

  return res.status(200).json({
    ok: true,
    user: result.user,
    sessionToken: result.sessionToken,
    isAdmin: Boolean(result.isAdmin)
  });
});

// 0b. Verify Active Server Session or Firebase ID Token
app.post('/api/auth/verify-session', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  if (!caller.authenticated || !caller.user) {
    return res.status(401).json({
      ok: false,
      authenticated: false,
      isAdmin: false,
      error: 'Session is invalid or expired.'
    });
  }
  return res.status(200).json({
    ok: true,
    authenticated: true,
    user: caller.user,
    isAdmin: caller.isAdmin,
    sessionToken: caller.sessionToken
  });
});

app.get('/api/auth/session', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  if (!caller.authenticated || !caller.user) {
    return res.status(401).json({
      ok: false,
      authenticated: false,
      isAdmin: false,
      error: 'Session is invalid or expired.'
    });
  }
  return res.status(200).json({
    ok: true,
    authenticated: true,
    user: caller.user,
    isAdmin: caller.isAdmin,
    sessionToken: caller.sessionToken
  });
});

// 0b-2. Atomic Server Session Logout & Token Revocation
app.post('/api/auth/logout', (req, res) => {
  const rawAuthHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const bearerToken = rawAuthHeader.startsWith('Bearer ') ? rawAuthHeader.slice(7).trim() : '';
  const headerSessionToken =
    typeof req.headers['x-session-token'] === 'string' ? req.headers['x-session-token'].trim() : '';
  const bodySessionToken =
    typeof req.body?.sessionToken === 'string' ? req.body.sessionToken.trim() : '';

  if (bearerToken) revokeSessionToken(bearerToken);
  if (headerSessionToken) revokeSessionToken(headerSessionToken);
  if (bodySessionToken) revokeSessionToken(bodySessionToken);

  return res.status(200).json({
    ok: true,
    signedOut: true
  });
});

// 0c. Check Duplicate Email Before Registration
app.get('/api/auth/check-email', (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const check = checkDuplicateEmailServer(email);
  return res.json({
    ok: true,
    exists: check.exists,
    accountType: check.accountType
  });
});

// 1. Request or Resend 6-Digit Registration OTP (Fail-Closed reCAPTCHA + Resend API + HMAC-SHA256 Hash + Duplicate Email Prevention)
app.post('/api/auth/otp/request', async (req, res) => {
  const clientIp = getClientIp(req);
  const { name, email, password, role, accountType, isResend, honeypot } = req.body || {};
  if (honeypot && String(honeypot).trim().length > 0) {
    return res.status(400).json({
      ok: false,
      status: 'spam_blocked',
      message: 'Automated submission blocked.'
    });
  }

  if (
    !(await enforceServerRecaptcha(
      req,
      res,
      isResend ? 'register_otp_resend' : 'register_otp'
    ))
  ) {
    return;
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const dupCheck = !isResend ? checkDuplicateEmailServer(normalizedEmail) : { exists: false };

  try {
    const result = await requestRegistrationOtp({
      name: String(name || ''),
      email: normalizedEmail,
      password: String(password || ''),
      role: accountType ? String(accountType) : role ? String(role) : 'student',
      clientIp,
      isResend: Boolean(isResend),
      isEmailAlreadyRegistered: dupCheck.exists
    });

    if (!result.ok) {
      const statusCode =
        result.status === 'duplicate_email'
          ? 409
          : result.status === 'cooldown_active' || result.status === 'rate_limited'
          ? 429
          : result.status === 'email_delivery_failed'
          ? 502
          : 400;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('OTP request error:', err);
    return res.status(500).json({
      ok: false,
      status: 'server_error',
      message: err?.message || 'Unable to send verification code right now.'
    });
  }
});

// 2. Verify 6-Digit OTP (5-Min Expiry, Max 5 Attempts, Single-Use Consumption)
app.post('/api/auth/otp/verify', (req, res) => {
  const { email, otp } = req.body || {};

  try {
    const result = verifyRegistrationOtp({
      email: String(email || ''),
      otp: String(otp || '')
    });

    if (!result.ok) {
      const statusCode = result.status === 'max_attempts_exceeded' ? 429 : 400;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('OTP verification error:', err);
    return res.status(500).json({
      ok: false,
      status: 'server_error',
      message: err?.message || 'Unable to verify OTP code right now.'
    });
  }
});

// 3. Complete Account Activation with Signed Verification Proof Token + Full Profile Payload
app.post('/api/auth/otp/complete', async (req, res) => {
  const {
    email,
    uid,
    name,
    fullName,
    password,
    photoURL,
    role,
    accountType,
    phoneNumber,
    countryCode,
    countryOfResidence,
    nationality,
    currentCity,
    city,
    dateOfBirth,
    gender,
    passportDetails,
    passportRaw,
    passportMetadata,
    educationRecords,
    studentAcademicProfile,
    generalUserProfile,
    agentPartnerProfile,
    preferredStudyLevel,
    preferredIntake,
    preferredUniversity,
    interestedProgram,
    registrationId,
    university,
    major,
    studyLevel,
    degreeLevel,
    preferredLanguage,
    visaType,
    privacyConsent,
    verificationProofToken,
    authProvider,
    firebaseIdToken
  } = req.body || {};
  const resolvedName = String(fullName || name || '').trim();
  const requestedType = accountType ? String(accountType) : role ? String(role) : 'student';

  if (authProvider === 'google' && email && uid) {
    const candidateFbToken =
      firebaseIdToken ||
      req.headers['x-firebase-id-token'] ||
      (typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined);
    const verifiedFb = await verifyFirebaseIdTokenServer(
      typeof candidateFbToken === 'string' ? candidateFbToken : undefined
    );
    if (!verifiedFb.valid || !verifiedFb.uid || verifiedFb.uid !== String(uid)) {
      return res.status(401).json({
        ok: false,
        status: 'unverified_google_token',
        message: 'Google OAuth activation requires a valid Firebase Authentication ID token.'
      });
    }

    recordVerifiedAccountActivation({
      email: verifiedFb.email || String(email),
      uid: verifiedFb.uid,
      name: resolvedName || verifiedFb.name || undefined,
      role: requestedType,
      authProvider: 'google'
    });
    const syncRes = syncCentralizedUserServer({
      uid: verifiedFb.uid,
      fullName: resolvedName || verifiedFb.name || undefined,
      email: verifiedFb.email || String(email),
      role: requestedType,
      accountType: requestedType,
      phoneNumber,
      countryCode,
      countryOfResidence,
      nationality,
      currentCity,
      city,
      dateOfBirth,
      gender,
      passportDetails: passportDetails || passportRaw || passportMetadata,
      educationRecords,
      studentAcademicProfile,
      generalUserProfile,
      agentPartnerProfile,
      preferredStudyLevel,
      preferredIntake,
      preferredUniversity,
      interestedProgram,
      registrationId,
      university,
      major,
      studyLevel,
      degreeLevel,
      preferredLanguage,
      visaType,
      privacyConsent,
      photoURL: photoURL ? String(photoURL) : verifiedFb.picture || '',
      authProvider: 'google',
      emailVerified: true,
      isLoginEvent: true,
      isNewRegistration: true,
      allowCreate: true,
      isTrustedCaller: true
    });
    recordLoginAttemptServer({
      uid: verifiedFb.uid,
      email: verifiedFb.email || String(email),
      userName: syncRes.user?.fullName || resolvedName,
      provider: 'google',
      success: syncRes.ok,
      reason: syncRes.ok ? 'Google OAuth sign-in verified' : (syncRes.error || 'Account restricted')
    });
    if (!syncRes.ok || !syncRes.user) {
      return res.status(403).json({ ok: false, message: syncRes.error, code: syncRes.code });
    }

    try {
      await sendRegistrationCongratulationsEmail({
        uid: syncRes.user.uid,
        email: syncRes.user.email,
        fullName: syncRes.user.fullName || syncRes.user.name || resolvedName,
        triggerSource: 'otp_complete_google'
      });
    } catch (emailErr) {
      console.warn('[EveryKR Registration Email] Non-fatal Google registration email warning:', emailErr);
    }

    const isAdmin = isAuthorizedServerAdmin(syncRes.user.uid, syncRes.user.email);
    const sessionToken = issueServerSessionToken({
      uid: syncRes.user.uid,
      email: syncRes.user.email,
      role: isAdmin ? 'admin' : syncRes.user.role
    });
    return res.json({
      ok: true,
      status: 'activated',
      user: syncRes.user,
      sessionToken,
      isAdmin
    });
  }

  const verification = verifyRegistrationProofToken({
    email: String(email || ''),
    role: requestedType,
    token: String(verificationProofToken || '')
  });

  if (!verification.valid) {
    return res.status(403).json({
      ok: false,
      status: 'unverified_proof',
      message: 'Account activation denied: valid OTP verification proof is required.'
    });
  }

  const finalRole = verification.role || requestedType;

  recordVerifiedAccountActivation({
    email: String(email),
    uid: String(uid || ''),
    name: resolvedName || undefined,
    role: finalRole,
    password: password ? String(password) : undefined,
    authProvider: 'email_otp'
  });

  const syncRes = syncCentralizedUserServer({
    uid: String(uid || ''),
    fullName: resolvedName || undefined,
    email: String(email),
    role: finalRole,
    accountType: finalRole,
    password: password ? String(password) : undefined,
    phoneNumber,
    countryCode,
    countryOfResidence,
    nationality,
    currentCity,
    city,
    dateOfBirth,
    gender,
    passportDetails: passportDetails || passportRaw || passportMetadata,
    educationRecords,
    studentAcademicProfile,
    generalUserProfile,
    agentPartnerProfile,
    preferredStudyLevel,
    preferredIntake,
    preferredUniversity,
    interestedProgram,
    registrationId,
    university,
    major,
    studyLevel,
    degreeLevel,
    preferredLanguage,
    visaType,
    privacyConsent,
    photoURL: photoURL ? String(photoURL) : '',
    authProvider: 'email_otp',
    emailVerified: true,
    isLoginEvent: true,
    isNewRegistration: true,
    allowCreate: true,
    isTrustedCaller: true
  });

  recordLoginAttemptServer({
    uid: syncRes.user?.uid || String(uid || ''),
    email: String(email),
    userName: syncRes.user?.fullName || resolvedName,
    provider: 'email_otp',
    success: syncRes.ok,
    reason: syncRes.ok ? 'Email OTP verified and account activated' : (syncRes.error || 'Account restricted')
  });

  if (!syncRes.ok || !syncRes.user) {
    return res.status(400).json({
      ok: false,
      message: syncRes.error || 'Account activation failed.',
      code: syncRes.code
    });
  }

  try {
    await sendRegistrationCongratulationsEmail({
      uid: syncRes.user.uid,
      email: syncRes.user.email,
      fullName: syncRes.user.fullName || syncRes.user.name || resolvedName,
      triggerSource: 'otp_complete_email'
    });
  } catch (emailErr) {
    console.warn('[EveryKR Registration Email] Non-fatal OTP registration email warning:', emailErr);
  }

  const isAdmin = isAuthorizedServerAdmin(syncRes.user.uid, syncRes.user.email);
  const sessionToken = issueServerSessionToken({
    uid: syncRes.user.uid,
    email: syncRes.user.email,
    role: isAdmin ? 'admin' : syncRes.user.role
  });

  return res.json({
    ok: true,
    status: 'activated',
    verifiedAt: verification.verifiedAt,
    role: isAdmin ? 'admin' : finalRole,
    accountType: finalRole,
    user: syncRes.user,
    sessionToken,
    isAdmin
  });
});

const NON_CANONICAL_PRODUCTION_HOST_REGEXES = [
  /^www\.everykr\.com$/i,
  /^everykr\.(firebaseapp\.com|web\.app)$/i,
  /^everykr-everything-korea-one-platform(-[a-z0-9-]+)?\.(run\.app|ai\.studio)$/i,
  /^everykr-everything-korea-one-platform-[0-9]+\.[a-z0-9-]+\.run\.app$/i
];

// Enforce strict no-referrer and no-store headers on /reset-password, password-reset APIs, and any Firebase oobCode action link,
// and redirect non-canonical production hostnames (www.everykr.com, everykr.firebaseapp.com, *.run.app) to https://everykr.com
app.use((req, res, next) => {
  const isResetPath =
    req.path === '/reset-password' ||
    req.path === '/__/auth/action' ||
    req.path.startsWith('/api/auth/password-reset') ||
    req.path.startsWith('/api/auth/firebase-password-reset');
  const hasResetQuery =
    req.query?.mode === 'resetPassword' ||
    typeof req.query?.oobCode === 'string';

  if (isResetPath || hasResetQuery) {
    const applyResetHeaders = () => {
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    };
    applyResetHeaders();
    const origWriteHead = res.writeHead.bind(res);
    res.writeHead = ((statusCode: number, ...args: any[]) => {
      applyResetHeaders();
      const lastArg = args[args.length - 1];
      if (lastArg && typeof lastArg === 'object' && !Array.isArray(lastArg)) {
        for (const k of Object.keys(lastArg)) {
          if (k.toLowerCase() === 'cache-control' || k.toLowerCase() === 'referrer-policy') {
            delete lastArg[k];
          }
        }
        lastArg['Referrer-Policy'] = 'no-referrer';
        lastArg['Cache-Control'] = 'no-store, no-cache, must-revalidate, private';
      }
      return origWriteHead(statusCode, ...args);
    }) as typeof res.writeHead;
  }

  const rawHostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  const isNonCanonicalProdHost =
    Boolean(rawHostHeader) &&
    NON_CANONICAL_PRODUCTION_HOST_REGEXES.some((re) => re.test(rawHostHeader));

  // Redirect legacy Firebase `/__/auth/action?mode=resetPassword&oobCode=...` links directly to `/reset-password?oobCode=...`
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    req.path === '/__/auth/action' &&
    req.query?.mode === 'resetPassword' &&
    typeof req.query?.oobCode === 'string' &&
    req.query.oobCode.trim().length >= 10
  ) {
    const cleanCode = req.query.oobCode.trim();
    const isLocalHost = rawHostHeader === 'localhost' || rawHostHeader === '127.0.0.1';
    const targetLocation = isLocalHost
      ? `/reset-password?oobCode=${encodeURIComponent(cleanCode)}`
      : `${OFFICIAL_EVERYKR_BASE_URL}/reset-password?oobCode=${encodeURIComponent(cleanCode)}`;
    return res.redirect(302, targetLocation);
  }

  // Redirect any page load on a non-canonical production host (`www.everykr.com`, `everykr.firebaseapp.com`, `everykr-everything-korea-one-platform*.run.app`)
  // to the official `https://everykr.com` origin so Google Chrome Password Manager always identifies the website as `everykr.com`
  if (
    isNonCanonicalProdHost &&
    (req.method === 'GET' || req.method === 'HEAD') &&
    !req.path.startsWith('/api/')
  ) {
    return res.redirect(301, `${OFFICIAL_EVERYKR_BASE_URL}${req.originalUrl || '/'}`);
  }

  next();
});

// 3a. Firebase Admin + Resend Branded HTML Password Reset Endpoint (Anti-Enumeration + Rate-Limited + Zero Raw URL)
app.post('/api/auth/firebase-password-reset', async (req, res) => {
  const clientIp = getClientIp(req);
  const { email, continueUrl, honeypot } = req.body || {};

  const outcome = await handleFirebasePasswordResetRequestServer({
    email: String(email || ''),
    clientIp,
    continueUrl,
    honeypot
  });

  return res.status(outcome.httpStatus).json(outcome.body);
});

// 3a-ii. Resolve Registered EveryKR Email for a Verified Password Reset oobCode (for Chrome Password Manager autocomplete="username")
app.post('/api/auth/firebase-password-reset/resolve-email', (req, res) => {
  const { oobCode } = req.body || {};
  const email = resolveRegisteredEmailForResetOobCodeServer(oobCode);
  return res.status(200).json({
    ok: Boolean(email),
    email: email || undefined
  });
});

// 3b. Request Password Reset Link (Fail-Closed reCAPTCHA + Anti-Enumeration + Rate-Limited + Resend Transactional Email)
app.post('/api/auth/password-reset/request', async (req, res) => {
  const clientIp = getClientIp(req);
  const { email, honeypot } = req.body || {};

  if (honeypot && String(honeypot).trim().length > 0) {
    return res.status(400).json({
      ok: false,
      status: 'spam_blocked',
      message: 'Automated submission blocked.'
    });
  }

  if (!(await enforceServerRecaptcha(req, res, 'password_reset'))) {
    return;
  }

  try {
    const result = await initiatePasswordResetServer({
      email: String(email || ''),
      clientIp,
      baseUrl: getBaseUrl(req)
    });

    if (!result.ok) {
      const statusCode =
        result.status === 'rate_limited'
          ? 429
          : result.status === 'delivery_failed'
          ? 502
          : 400;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch {
    return res.status(500).json({
      ok: false,
      status: 'server_error',
      message: 'Unable to process password reset request right now. Please try again later.'
    });
  }
});

// 3c. Verify Opaque Password Reset Token (Checks 15-Min Expiry & Single-Use Status Without Consuming)
app.post('/api/auth/password-reset/verify', (req, res) => {
  const { token } = req.body || {};
  const result = verifyPasswordResetLinkServer({
    token: String(token || '')
  });

  return res.status(result.ok ? 200 : 400).json(result);
});

// 3d. Confirm Password Reset & Update Salted Scrypt Password Hash
app.post('/api/auth/password-reset/confirm', (req, res) => {
  const { token, newPassword } = req.body || {};
  const result = completePasswordResetServer({
    token: String(token || ''),
    newPassword: String(newPassword || '')
  });

  return res.status(result.ok ? 200 : 400).json(result);
});

// 4. Admin Registrations Overview (Verified vs. Unverified Registrations, Zero OTP/Password Exposure)
app.get('/api/auth/admin/registrations', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  return res.json({
    ok: true,
    ...getAdminRegistrationsOverview()
  });
});

// ====================================================
// PROTECTED SUBMISSION GATES (CONTACT, COMMUNITY, MARKETPLACE)
// ====================================================

const EMAIL_VALIDATION_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function containsDangerousMarkup(input: string): boolean {
  return /<\s*script\b|javascript:/i.test(input);
}

// Server-side registry for contact submissions (complements primary Firestore contact_submissions collection)
const serverContactSubmissionsStore = new Map<string, Record<string, any>>();

// 5a. Protected Direct Contact Inquiry Submission (Supports both Guest & Logged-in Visitors)
app.post('/api/contact/submit', async (req, res) => {
  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`contact:${clientIp}`);
  if (!rate.allowed) {
    return res.status(429).json({
      ok: false,
      status: 'rate_limited',
      message: `Too many inquiry submissions. Please wait ${rate.retryAfterSeconds || 60} seconds and try again.`
    });
  }

  const {
    name,
    fullName,
    email,
    category,
    subject,
    message,
    userId,
    userRole,
    userUniversity,
    userNationality,
    userEmailVerified,
    userLanguage,
    submissionId: requestedSubmissionId,
    honeypot
  } = req.body || {};

  if (honeypot && String(honeypot).trim().length > 0) {
    return res.status(400).json({
      ok: false,
      status: 'spam_blocked',
      message: 'Automated submission blocked.'
    });
  }

  if (!(await enforceServerRecaptcha(req, res, 'contact_submit'))) {
    return;
  }

  const cleanName = String(fullName || name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanCategory = String(category || 'General Inquiry').trim().slice(0, 120);
  const cleanSubject = String(subject || `${cleanCategory} Inquiry`).trim().slice(0, 240);
  const cleanMessage = String(message || '').trim();
  const cleanUserId = userId && typeof userId === 'string' && userId.trim() ? userId.trim().slice(0, 128) : null;
  const cleanLanguage = String(userLanguage || 'en').trim().slice(0, 16) || 'en';

  if (cleanName.length < 2 || cleanName.length > 120) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Please enter your full name (2–120 characters).'
    });
  }

  if (!EMAIL_VALIDATION_REGEX.test(cleanEmail)) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Please enter a valid email address.'
    });
  }

  if (cleanMessage.length < 10 || cleanMessage.length > 5000) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Please provide message details between 10 and 5,000 characters.'
    });
  }

  if (
    containsDangerousMarkup(cleanName) ||
    containsDangerousMarkup(cleanSubject) ||
    containsDangerousMarkup(cleanMessage)
  ) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Unsupported markup detected in contact submission.'
    });
  }

  const nowIso = new Date().toISOString();
  const ticketSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const ticketId = `EKR-SUP-${ticketSuffix}`;
  const submissionId =
    typeof requestedSubmissionId === 'string' &&
    /^[a-zA-Z0-9_-]{8,80}$/.test(requestedSubmissionId.trim())
      ? requestedSubmissionId.trim()
      : `csub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const submissionRecord = {
    id: submissionId,
    submissionId,
    ticketId,
    fullName: cleanName,
    name: cleanName,
    email: cleanEmail,
    category: cleanCategory,
    subject: cleanSubject,
    message: cleanMessage,
    userId: cleanUserId,
    isAuthenticatedUser: Boolean(cleanUserId),
    userRole: userRole ? String(userRole).slice(0, 40) : undefined,
    userUniversity: userUniversity ? String(userUniversity).slice(0, 160) : undefined,
    userNationality: userNationality ? String(userNationality).slice(0, 80) : undefined,
    userEmailVerified: Boolean(userEmailVerified),
    userLanguage: cleanLanguage,
    status: 'New' as const,
    unread: true,
    archived: false,
    archivedAt: null,
    archivedBy: null,
    assignedStaffId: null,
    assignedStaffName: null,
    assignedStaffEmail: null,
    internalNotes: [],
    replies: [],
    lastRepliedAt: null,
    lastRepliedBy: null,
    readAt: null,
    readBy: null,
    submittedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  serverContactSubmissionsStore.set(submissionId, submissionRecord);

  // Trigger optional non-blocking admin email notification if email provider is configured
  sendSupportAdminAlertEmailServer({
    ticketId,
    visitorName: cleanName,
    visitorEmail: cleanEmail,
    category: cleanCategory,
    subject: cleanSubject,
    message: cleanMessage,
    userLanguage: cleanLanguage,
    userId: cleanUserId
  }).catch(() => {});

  return res.status(200).json({
    ok: true,
    status: 'submitted',
    submissionId,
    ticketId,
    category: cleanCategory,
    submission: submissionRecord,
    message: 'Your inquiry has been verified and logged. Our support team will respond within one business day.'
  });
});

// 5a-2. Admin Fetch Server-Logged Contact Submissions (Merged with Firestore on Client)
app.get('/api/contact/admin/submissions', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const items = Array.from(serverContactSubmissionsStore.values()).sort(
    (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
  );

  return res.status(200).json({
    ok: true,
    submissions: items
  });
});

// 5a-3. Admin Send Direct Email Reply to a Contact Inquiry Visitor
app.post('/api/contact/admin/reply', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const {
    submissionId,
    ticketId,
    recipientEmail,
    recipientName,
    category,
    originalSubject,
    originalMessage,
    replySubject,
    replyMessage
  } = req.body || {};

  const cleanRecipientEmail = String(recipientEmail || '').trim().toLowerCase();
  const cleanReplyMessage = String(replyMessage || '').trim();
  const cleanTicketId = String(ticketId || submissionId || 'EKR-SUP').trim();
  const cleanReplySubject =
    String(replySubject || '').trim() ||
    `Re: ${String(originalSubject || 'Your EveryKR Inquiry').trim()} [${cleanTicketId}]`;

  if (!EMAIL_VALIDATION_REGEX.test(cleanRecipientEmail)) {
    return res.status(400).json({
      ok: false,
      message: 'A valid visitor email address is required to send a reply.'
    });
  }

  if (cleanReplyMessage.length < 2 || cleanReplyMessage.length > 8000) {
    return res.status(400).json({
      ok: false,
      message: 'Reply message must be between 2 and 8,000 characters.'
    });
  }

  const emailResult = await sendSupportContactReplyEmailServer({
    ticketId: cleanTicketId,
    recipientEmail: cleanRecipientEmail,
    recipientName: recipientName ? String(recipientName) : undefined,
    inquiryCategory: category ? String(category) : undefined,
    originalSubject: originalSubject ? String(originalSubject) : undefined,
    originalMessage: originalMessage ? String(originalMessage) : undefined,
    replySubject: cleanReplySubject,
    replyMessage: cleanReplyMessage,
    adminName: admin.name || 'EveryKR Support Team',
    adminEmail: admin.email
  });

  const replyRecord = {
    id: `creply_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    subject: cleanReplySubject,
    message: cleanReplyMessage,
    senderUid: admin.uid || 'admin',
    senderName: admin.name || 'EveryKR Support Team',
    senderEmail: emailResult.senderEmail || 'support@everykr.com',
    recipientEmail: cleanRecipientEmail,
    recipientName: recipientName ? String(recipientName) : undefined,
    replyTo: emailResult.replyTo || 'support@everykr.com',
    sentAt: emailResult.sentAt || new Date().toISOString(),
    deliveryStatus: emailResult.deliveryStatus,
    provider: emailResult.provider,
    messageId: emailResult.messageId,
    ...(emailResult.errorReason ? { errorReason: emailResult.errorReason } : {})
  };

  if (submissionId && serverContactSubmissionsStore.has(String(submissionId))) {
    const existing = serverContactSubmissionsStore.get(String(submissionId))!;
    const existingReplies = Array.isArray(existing.replies) ? existing.replies : [];
    existing.replies = [...existingReplies, replyRecord];
    existing.lastRepliedAt = replyRecord.sentAt;
    existing.lastRepliedBy = replyRecord.senderName;
    existing.unread = false;
    if (existing.status === 'New' || existing.status === 'Read') {
      existing.status = 'In Progress';
    }
    existing.updatedAt = replyRecord.sentAt;
    serverContactSubmissionsStore.set(String(submissionId), existing);
  }

  return res.status(200).json({
    ok: emailResult.ok,
    delivered: emailResult.delivered,
    deliveryStatus: emailResult.deliveryStatus,
    provider: emailResult.provider,
    messageId: emailResult.messageId,
    errorReason: emailResult.errorReason,
    replyRecord,
    message: emailResult.delivered
      ? `Reply delivered to ${cleanRecipientEmail} via ${emailResult.provider.toUpperCase()}.`
      : `Reply recorded in inquiry history, but external email delivery reported: ${emailResult.errorReason || 'Provider unconfigured or rejected.'}`
  });
});

// 5b. Protected Community Post Submission Verification Gate
app.post('/api/community/posts/verify-submission', async (req, res) => {
  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`community_post:${clientIp}`);
  if (!rate.allowed) {
    return res.status(429).json({
      ok: false,
      status: 'rate_limited',
      message: `Too many community posts submitted recently. Please wait ${rate.retryAfterSeconds || 60} seconds.`
    });
  }

  const { title, category, city, content, honeypot } = req.body || {};
  if (honeypot && String(honeypot).trim().length > 0) {
    return res.status(400).json({
      ok: false,
      status: 'spam_blocked',
      message: 'Automated submission blocked.'
    });
  }

  if (!(await enforceServerRecaptcha(req, res, 'community_post'))) {
    return;
  }

  const cleanTitle = String(title || '').trim();
  const cleanCategory = String(category || 'General Discussion').trim();
  const cleanCity = String(city || 'Seoul').trim();
  const cleanContent = String(content || '').trim();

  if (cleanTitle.length < 3 || cleanTitle.length > 200) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Discussion title must be between 3 and 200 characters.'
    });
  }

  if (cleanContent.length < 10 || cleanContent.length > 6000) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Discussion content must be between 10 and 6,000 characters.'
    });
  }

  if (containsDangerousMarkup(cleanTitle) || containsDangerousMarkup(cleanContent)) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Unsupported script markup detected in discussion content.'
    });
  }

  return res.status(200).json({
    ok: true,
    status: 'verified',
    category: cleanCategory,
    city: cleanCity,
    verifiedAt: new Date().toISOString()
  });
});

// 5c. Protected Student Marketplace Listing & Seller Inquiry Verification Gate
app.post('/api/marketplace/verify-submission', async (req, res) => {
  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`marketplace:${clientIp}`);
  if (!rate.allowed) {
    return res.status(429).json({
      ok: false,
      status: 'rate_limited',
      message: `Too many marketplace submissions. Please wait ${rate.retryAfterSeconds || 60} seconds.`
    });
  }

  const {
    submissionType,
    title,
    priceKRW,
    location,
    sellerContact,
    description,
    itemId,
    message,
    honeypot
  } = req.body || {};

  if (honeypot && String(honeypot).trim().length > 0) {
    return res.status(400).json({
      ok: false,
      status: 'spam_blocked',
      message: 'Automated submission blocked.'
    });
  }

  const resolvedType = submissionType === 'inquiry' ? 'inquiry' : 'listing';
  if (
    !(await enforceServerRecaptcha(
      req,
      res,
      resolvedType === 'inquiry' ? 'marketplace_inquiry' : 'marketplace_listing'
    ))
  ) {
    return;
  }

  if (resolvedType === 'inquiry') {
    const cleanItemId = String(itemId || '').trim();
    const cleanMsg = String(message || '').trim();
    if (!cleanItemId || cleanMsg.length < 3 || cleanMsg.length > 2000) {
      return res.status(400).json({
        ok: false,
        status: 'invalid_input',
        message: 'Please provide a valid inquiry message for this listing.'
      });
    }
    if (containsDangerousMarkup(cleanMsg)) {
      return res.status(400).json({
        ok: false,
        status: 'invalid_input',
        message: 'Unsupported markup detected in inquiry message.'
      });
    }
    return res.status(200).json({
      ok: true,
      status: 'verified',
      submissionType: 'inquiry',
      verifiedAt: new Date().toISOString()
    });
  }

  const cleanTitle = String(title || '').trim();
  const parsedPrice = Number(priceKRW);
  const cleanLocation = String(location || '').trim();
  const cleanSellerContact = String(sellerContact || '').trim();
  const cleanDescription = String(description || '').trim();

  if (cleanTitle.length < 3 || cleanTitle.length > 180) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Marketplace item title must be between 3 and 180 characters.'
    });
  }

  if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || parsedPrice > 100_000_000) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Please provide a valid item price in KRW.'
    });
  }

  if (!cleanLocation || !cleanSellerContact) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Pickup location and seller contact information are required.'
    });
  }

  if (
    containsDangerousMarkup(cleanTitle) ||
    containsDangerousMarkup(cleanLocation) ||
    containsDangerousMarkup(cleanSellerContact) ||
    containsDangerousMarkup(cleanDescription)
  ) {
    return res.status(400).json({
      ok: false,
      status: 'invalid_input',
      message: 'Unsupported markup detected in marketplace listing.'
    });
  }

  return res.status(200).json({
    ok: true,
    status: 'verified',
    submissionType: 'listing',
    verifiedAt: new Date().toISOString()
  });
});

// ====================================================
// CENTRALIZED USER MANAGEMENT & SECURITY AUDIT ROUTES
// ====================================================

// 1. Sync User Profile by Unique Firebase Auth UID (Requires Verified Session or Firebase ID Token + UID Ownership)
app.post('/api/users/sync', async (req, res) => {
  // Check whether this email already existed in the centralized store BEFORE extractCallerIdentity
  // (because verifyCallerIdentityServer auto-provisions first-time Google OAuth users on the fly).
  const candidateBodyEmail = String(req.body?.email || '').trim().toLowerCase();
  const existedBeforeCallerVerify = candidateBodyEmail
    ? checkDuplicateEmailServer(candidateBodyEmail).exists
    : true;

  const caller = await extractCallerIdentity(req);
  if (!caller.authenticated || !caller.uid) {
    return res.status(401).json({
      ok: false,
      code: 'auth/unauthenticated',
      error: 'Authentication required to synchronize user profile.'
    });
  }

  const {
    uid,
    fullName,
    name,
    email,
    role,
    accountType,
    phoneNumber,
    countryCode,
    countryOfResidence,
    photoURL,
    avatarUrl,
    authProvider,
    emailVerified,
    nationality,
    currentCity,
    city,
    dateOfBirth,
    gender,
    passportDetails,
    passportRaw,
    passportMetadata,
    educationRecords,
    studentAcademicProfile,
    generalUserProfile,
    agentPartnerProfile,
    preferredStudyLevel,
    preferredIntake,
    preferredUniversity,
    interestedProgram,
    registrationId,
    university,
    major,
    studyLevel,
    degreeLevel,
    preferredLanguage,
    visaType,
    phone,
    kakaoId,
    expectedGraduation,
    privacyConsent,
    isLoginEvent,
    authEventType,
    authAttemptId
  } = req.body || {};

  const targetUid = String(uid || caller.uid).trim();
  if (targetUid !== caller.uid && !caller.isAdmin) {
    return res.status(403).json({
      ok: false,
      code: 'auth/forbidden',
      error: 'You may only synchronize your own authenticated user profile.'
    });
  }

  const isInteractiveAuthEvent =
    authEventType === 'interactive_login' || authEventType === 'interactive_registration';

  const result = syncCentralizedUserServer({
    uid: targetUid,
    fullName: fullName ? String(fullName) : undefined,
    name: name ? String(name) : undefined,
    email: String(email || caller.email || ''),
    role: caller.isAdmin && role ? String(role) : undefined,
    accountType: caller.isAdmin && accountType ? String(accountType) : undefined,
    phoneNumber,
    countryCode,
    countryOfResidence,
    photoURL: photoURL !== undefined ? String(photoURL) : undefined,
    avatarUrl: avatarUrl !== undefined ? String(avatarUrl) : undefined,
    authProvider: authProvider === 'google' || authProvider === 'password' ? authProvider : 'email_otp',
    emailVerified: caller.isAdmin && typeof emailVerified === 'boolean' ? emailVerified : undefined,
    nationality,
    currentCity,
    city,
    dateOfBirth,
    gender,
    passportDetails: passportDetails || passportRaw || passportMetadata,
    educationRecords,
    studentAcademicProfile,
    generalUserProfile,
    agentPartnerProfile,
    preferredStudyLevel,
    preferredIntake,
    preferredUniversity,
    interestedProgram,
    registrationId,
    university,
    major,
    studyLevel,
    degreeLevel,
    preferredLanguage,
    visaType,
    phone,
    kakaoId,
    expectedGraduation,
    privacyConsent,
    isLoginEvent: authEventType ? isInteractiveAuthEvent : isLoginEvent !== false,
    isNewRegistration: authEventType === 'interactive_registration' && !existedBeforeCallerVerify,
    allowCreate: false,
    isTrustedCaller: caller.isAdmin
  });

  if (!result.ok || !result.user) {
    return res.status(result.code === 'auth/user-disabled' ? 403 : 400).json({
      ok: false,
      error: result.error,
      code: result.code
    });
  }

  // Trigger automated Registration OR Login email ONLY on explicit interactive authentication events
  if (authEventType === 'interactive_registration' || (authEventType === 'interactive_login' && !existedBeforeCallerVerify)) {
    try {
      await sendRegistrationCongratulationsEmail({
        uid: result.user.uid,
        email: result.user.email,
        fullName: result.user.fullName || result.user.name,
        triggerSource: 'users_sync_interactive_registration'
      });
    } catch (emailErr) {
      console.warn('[EveryKR Registration Email] Non-fatal sync registration email warning:', emailErr);
    }
  } else if (authEventType === 'interactive_login') {
    try {
      await sendLoginWelcomeBackEmail({
        uid: result.user.uid,
        email: result.user.email,
        fullName: result.user.fullName || result.user.name,
        authAttemptId: authAttemptId ? String(authAttemptId) : undefined,
        triggerSource: 'users_sync_interactive_login'
      });
    } catch (emailErr) {
      console.warn('[EveryKR Login Email] Non-fatal sync login email warning:', emailErr);
    }
  }

  return res.json({
    ok: true,
    user: result.user,
    ...(caller.sessionToken ? { sessionToken: caller.sessionToken, isAdmin: caller.isAdmin } : {})
  });
});

// 2. Record Login Event (Trusted Server-Side Timestamp)
app.post('/api/users/login-log', (req, res) => {
  const { uid, email, userName, fullName, name, studentName, provider, success, reason } =
    req.body || {};
  const candidateName = String(userName || fullName || name || studentName || '').trim();
  const entry = recordLoginAttemptServer({
    uid: String(uid || 'unauthenticated'),
    email: String(email || ''),
    userName: candidateName || undefined,
    provider: provider === 'google' || provider === 'password' ? provider : 'email_otp',
    success: Boolean(success),
    reason: reason ? String(reason) : undefined
  });
  return res.json({
    ok: true,
    loginLog: entry
  });
});

// 2b. User Self-Service Data Correction / Passport Deletion / Account Deletion Request (Requires Verified Auth + Ownership)
app.post('/api/users/privacy-request', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  if (!caller.authenticated || !caller.uid) {
    return res.status(401).json({
      ok: false,
      message: 'Authentication is required to submit a data privacy request.'
    });
  }

  const { uid, email, fullName, requestType, details } = req.body || {};
  const targetUid = String(uid || caller.uid).trim();
  if (targetUid !== caller.uid && !caller.isAdmin) {
    return res.status(403).json({
      ok: false,
      message: 'Forbidden: You can only submit privacy requests for your own account.'
    });
  }

  if (!requestType) {
    return res.status(400).json({
      ok: false,
      message: 'requestType is required.'
    });
  }

  const entry = createDataPrivacyRequestServer({
    uid: targetUid,
    email: String(email || caller.email || ''),
    fullName: String(fullName || caller.name || caller.email || ''),
    requestType:
      requestType === 'passport_deletion' || requestType === 'account_deletion'
        ? requestType
        : 'correction',
    details: String(details || 'User submitted data privacy request.')
  });
  return res.json({
    ok: true,
    request: entry
  });
});

// 2c. User Self-Service Passport Data Purge (Requires Verified Auth + Ownership)
app.delete('/api/users/me/passport', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  if (!caller.authenticated || !caller.uid) {
    return res.status(401).json({
      ok: false,
      message: 'Authentication is required to delete stored passport data.'
    });
  }

  const requestedUid = String(req.body?.uid || req.query?.uid || caller.uid).trim();
  if (requestedUid !== caller.uid && !caller.isAdmin) {
    return res.status(403).json({
      ok: false,
      message: 'Forbidden: You can only delete your own passport data.'
    });
  }

  const result = deleteUserPassportDataServer(requestedUid);
  return res.json(result);
});

// 2d. User Self-Service Permanent Account Deletion (Requires Verified Auth + Ownership)
app.delete('/api/users/me', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  if (!caller.authenticated || !caller.uid) {
    return res.status(401).json({
      ok: false,
      message: 'Authentication is required to delete your account.'
    });
  }

  const requestedUid = String(req.body?.uid || req.query?.uid || caller.uid).trim();
  if (requestedUid !== caller.uid && !caller.isAdmin) {
    return res.status(403).json({
      ok: false,
      message: 'Forbidden: You can only delete your own account.'
    });
  }

  const email = String(req.body?.email || req.query?.email || caller.email || '').trim();
  const reason = req.body?.reason ? String(req.body.reason) : undefined;
  const result = deleteOwnAccountServer({ uid: requestedUid, email, reason });
  return res.json(result);
});

// 3. Admin User Management Complete Dataset (Users, KPIs, Login Logs, Admin Logs, Registration Logs, Privacy Requests, OTP Metadata)
app.get('/api/admin/user-management', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  return res.json({
    ok: true,
    ...getAdminUserManagementOverview()
  });
});

// 4. Admin Update User Role, Status, Verification State, or Permitted Fields
app.patch('/api/admin/users/:uid', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const targetUid = String(req.params.uid || '').trim();
  const {
    role,
    accountType,
    accountStatus,
    emailVerified,
    fullName,
    phoneNumber,
    countryOfResidence,
    nationality
  } = req.body || {};

  const result = adminUpdateUserServer({
    targetUid,
    updates: {
      role,
      accountType,
      accountStatus,
      emailVerified,
      fullName,
      phoneNumber,
      countryOfResidence,
      nationality
    },
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });

  if (!result.ok) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

// 4b. Admin Approve or Reject Education Agent / Partner Account
app.post('/api/admin/users/:uid/agent-approval', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const targetUid = String(req.params.uid || '').trim();
  const { decision, reason } = req.body || {};

  const result = approveOrRejectAgentServer({
    targetUid,
    decision: decision === 'reject' || decision === 'rejected' ? 'reject' : 'approve',
    reason: reason ? String(reason) : undefined,
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });

  if (!result.ok) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

// 4c. Admin Reveal Sensitive Encrypted Passport (Audit Logged)
app.get('/api/admin/users/:uid/passport', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const targetUid = String(req.params.uid || '').trim();

  const result = revealEncryptedPassportServer({
    targetUid,
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });

  if (!result.ok) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

// 5. Admin Delete User Account
app.delete('/api/admin/users/:uid', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const targetUid = String(req.params.uid || '').trim();

  const result = adminDeleteUserServer({
    targetUid,
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });

  if (!result.ok) {
    return res.status(404).json(result);
  }
  return res.json(result);
});

// 6. Admin Record Security Log Entry
app.post('/api/admin/logs', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const { action, targetUid, targetEmail, details } = req.body || {};

  const entry = recordAdminActionServer({
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email,
    action: String(action || 'ADMIN_ACTION'),
    targetUid: targetUid ? String(targetUid) : undefined,
    targetEmail: targetEmail ? String(targetEmail) : undefined,
    details: String(details || '')
  });

  return res.json({
    ok: true,
    adminLog: entry
  });
});

// 7. Admin Excel (.xlsx) Export Endpoint (20 Columns + Metadata Sheet + Audit Logging, Zero Passwords/OTPs/Tokens)
app.post('/api/admin/users/export.xlsx', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const { users: suppliedUsers, exportScope = 'all', filterSummary = 'All Registered Users' } = req.body || {};
  const overview = getAdminUserManagementOverview();
  const baseUsers = Array.isArray(suppliedUsers) && suppliedUsers.length > 0 ? suppliedUsers : overview.users;

  // Deduplicate by Email and Registration ID
  const deduped = new Map<string, Record<string, string>>();
  for (const u of baseUsers) {
    const row = formatUserForSpreadsheetRow(u);
    const key = (row['Email'] || row['Registration ID']).toLowerCase();
    if (key) deduped.set(key, row);
  }
  const rows = Array.from(deduped.values());
  const nowIso = new Date().toISOString();
  const datePart = nowIso.slice(0, 10);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 22 }, // Registration ID
    { wch: 24 }, // Full Name
    { wch: 28 }, // Email
    { wch: 18 }, // Phone Number
    { wch: 18 }, // Nationality
    { wch: 14 }, // User Type
    { wch: 14 }, // Date of Birth
    { wch: 12 }, // Gender
    { wch: 16 }, // HSC Passing Year
    { wch: 12 }, // HSC GPA
    { wch: 16 }, // SSC Passing Year
    { wch: 12 }, // SSC GPA
    { wch: 26 }, // Current Education
    { wch: 28 }, // Interested University
    { wch: 28 }, // Interested Program
    { wch: 22 }, // Preferred Intake
    { wch: 22 }, // Korean Language Level
    { wch: 20 }, // Registration Date
    { wch: 16 }, // Account Status
    { wch: 18 }  // Preferred Language
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'EveryKR_Users');

  const metaSheet = XLSX.utils.json_to_sheet([
    {
      'Platform': 'EveryKR (everykr.com)',
      'Firebase Project': 'everykr',
      'Export Generation Date (UTC)': nowIso.replace('T', ' ').slice(0, 19),
      'Exported By Admin': `${admin.name} (${admin.email})`,
      'Export Scope': String(exportScope),
      'Filter Summary': String(filterSummary),
      'Total Exported Records': rows.length,
      'Security Policy': 'Passwords, OTP codes, auth tokens, and unmasked passport numbers are strictly excluded.'
    }
  ]);
  metaSheet['!cols'] = [
    { wch: 24 },
    { wch: 18 },
    { wch: 26 },
    { wch: 32 },
    { wch: 18 },
    { wch: 32 },
    { wch: 22 },
    { wch: 64 }
  ];
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Export_Metadata');

  const filename =
    exportScope === 'students'
      ? `EveryKR_Students_${datePart}.xlsx`
      : exportScope === 'general'
      ? `EveryKR_General_Users_${datePart}.xlsx`
      : `EveryKR_Users_${datePart}.xlsx`;

  recordAdminActionServer({
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email,
    action: 'EXCEL_EXPORT_USERS',
    details: `Exported ${rows.length} user record(s) to Excel (${filename}) [Scope: ${exportScope}, Filter: ${filterSummary}].`
  });

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
});

// 8. Admin Google Sheets Configuration & Auto-Sync Endpoints
app.post('/api/admin/google-sheets/config', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const { webhookUrl, spreadsheetUrl, sheetName, autoSyncOnRegistration, enabled } = req.body || {};

  const result = updateGoogleSheetsConfigServer({
    webhookUrl,
    spreadsheetUrl,
    sheetName,
    autoSyncOnRegistration,
    enabled,
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });
  return res.json(result);
});

app.post('/api/admin/google-sheets/sync', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const { users: suppliedUsers, triggerReason = 'manual_admin_sync' } = req.body || {};

  const result = await syncUsersToGoogleSheetsServer(
    Array.isArray(suppliedUsers) ? suppliedUsers : undefined,
    String(triggerReason),
    { adminUid: admin.uid, adminName: admin.name, adminEmail: admin.email }
  );
  return res.json(result);
});

// 9. Public Sanitized Developer Profile Endpoint (Exposes ONLY Approved Public Fields; Zero Admin Metadata)
app.get('/api/site-settings/developer-profile', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const overview = getAdminDeveloperProfileOverviewServer();
  return res.json({
    ok: true,
    profile: overview.profile,
    isCustomConfigured: overview.metadata.isCustomConfigured,
    updatedAt: overview.metadata.updatedAt
  });
});

// 9a. Synchronize Verified Firestore Developer Profile to Server Cache
app.post('/api/site-settings/developer-profile/sync-from-firestore', (req, res) => {
  const incoming = req.body?.profile || req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ ok: false, message: 'Invalid profile payload.' });
  }
  const synced = syncDeveloperProfileFromFirestoreServer(incoming);
  return res.json({
    ok: true,
    profile: synced
  });
});

// 9b. Admin Developer Profile & Site Settings Endpoints (Strictly Restricted to Verified Administrators)
app.get('/api/admin/site-settings/developer-profile', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json({
    ok: true,
    ...getAdminDeveloperProfileOverviewServer()
  });
});

app.put('/api/admin/site-settings/developer-profile', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const result = updateDeveloperProfileServer({
    input: body,
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });

  if (!result.ok) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/api/admin/site-settings/developer-profile/upload-photo', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  try {
    const {
      dataUrl,
      fileName,
      storageDownloadUrl,
      storagePath: clientStoragePath,
      imageCrop
    } = req.body || {};
    if (typeof dataUrl !== 'string' || !dataUrl.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'No image payload received.'
      });
    }

    const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(
      dataUrl.trim()
    );
    if (!match) {
      return res.status(400).json({
        ok: false,
        message: 'Unsupported image format. Please upload a JPG, JPEG, PNG, or WebP photograph.'
      });
    }

    const rawFormat = match[1].toLowerCase();
    const ext = rawFormat === 'jpeg' ? 'jpg' : rawFormat;
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
      return res.status(400).json({
        ok: false,
        message: 'Profile photograph must be 5 MB or smaller.'
      });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'developer_profile');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeStem = String(fileName || 'developer-portrait')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 40) || 'developer-portrait';
    const storedFileName = `${safeStem}-${Date.now()}.${ext}`;
    const fullDiskPath = path.join(uploadDir, storedFileName);

    // Write the new image first; never delete any previous image before the new file is safely written
    fs.writeFileSync(fullDiskPath, buffer);

    const publicUrl =
      typeof storageDownloadUrl === 'string' && storageDownloadUrl.startsWith('https://')
        ? storageDownloadUrl
        : `/uploads/developer_profile/${storedFileName}`;
    const storagePath =
      typeof clientStoragePath === 'string' && clientStoragePath.trim()
        ? clientStoragePath.trim()
        : `developer-profile/profile-image/${admin.uid}/profile.${ext}`;
    const nowIso = new Date().toISOString();

    // Immediately persist the new portrait into the server's Developer Profile configuration
    // so refreshing or navigating away never loses the uploaded image.
    const persistedResult = updateDeveloperProfileServer({
      input: {
        profileImageUrl: publicUrl,
        profileImagePath: storagePath,
        fallbackImageDataUrl: dataUrl.trim(),
        imageUpdatedAt: nowIso,
        ...(imageCrop && typeof imageCrop === 'object' ? { imageCrop } : {})
      },
      adminUid: admin.uid,
      adminName: admin.name,
      adminEmail: admin.email
    });

    return res.json({
      ok: true,
      profileImageUrl: publicUrl,
      profileImagePath: storagePath,
      fallbackImageDataUrl: dataUrl.trim(),
      imageUpdatedAt: nowIso,
      profile: persistedResult.profile,
      metadata: persistedResult.metadata,
      sizeBytes: buffer.byteLength,
      message: 'Developer profile photograph uploaded, saved, and verified.'
    });
  } catch (err) {
    console.error('Developer profile photo upload error:', err);
    return res.status(500).json({
      ok: false,
      message: 'Failed to process profile photograph upload.'
    });
  }
});

app.post('/api/admin/site-settings/developer-profile/reset', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const result = resetDeveloperProfileServer({
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });
  return res.json(result);
});

// 10. Accommodation Management & Approval System Endpoints (Strict Admin Approval & Public Visibility Gate)
interface ServerAccommodationRecord {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  photos: string[];
  monthlyRent: number;
  monthlyRentKRW: number;
  securityDeposit: number;
  depositKRW: number;
  maintenanceFeeKRW: number;
  city: string;
  district: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  accommodationType: string;
  roomType: string;
  facilities: string[];
  amenities: string[];
  roomDetails: string;
  availability: 'Available' | 'Unavailable';
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | 'Unavailable' | 'Archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason?: string | null;
  furnished: boolean;
  availableDate: string;
  nearUniversities: string[];
  landlordType: 'Direct Owner' | 'Certified Agent' | 'University Dorm';
  landlordPhone: string;
  contactEmail?: string;
  verified: boolean;
}

const serverAccommodationsStore = new Map<string, ServerAccommodationRecord>([
  [
    'acc-1',
    {
      id: 'acc-1',
      propertyId: 'acc-1',
      title: 'Sinchon Station Student One-Room',
      city: 'Seoul',
      district: 'Seodaemun-gu, Sinchon-ro',
      address: 'Sinchon-ro, Seodaemun-gu, Seoul, South Korea',
      latitude: 37.5559,
      longitude: 126.9368,
      accommodationType: 'One-room',
      roomType: 'One-room',
      monthlyRent: 550000,
      monthlyRentKRW: 550000,
      securityDeposit: 5000000,
      depositKRW: 5000000,
      maintenanceFeeKRW: 70000,
      furnished: true,
      availableDate: 'Immediate',
      photos: [
        '/src/assets/images/korea_student_housing_1794049412879.jpg',
        '/src/assets/images/seoul_city_life_1794049413999.jpg'
      ],
      facilities: ['Air Conditioner', 'Washing Machine', 'Refrigerator', 'Induction Cooktop', 'Desk & Chair', 'High-Speed Wi-Fi', 'Digital Door Lock'],
      amenities: ['Air Conditioner', 'Washing Machine', 'Refrigerator', 'Induction Cooktop', 'Desk & Chair', 'High-Speed Wi-Fi', 'Digital Door Lock'],
      roomDetails: 'Private single studio (21㎡), 4th floor with elevator, private bathroom and kitchenette.',
      nearUniversities: ['Yonsei University', 'Sogang University', 'Ewha Womans University'],
      landlordType: 'Certified Agent',
      landlordPhone: '02-312-3810',
      contactEmail: 'housing@everykr.com',
      availability: 'Available',
      approvalStatus: 'Approved',
      createdBy: 'system-admin',
      createdAt: '2026-10-15T09:00:00.000Z',
      updatedAt: '2026-10-15T09:00:00.000Z',
      approvedBy: 'mzhmd924@gmail.com',
      approvedAt: '2026-10-15T10:00:00.000Z',
      verified: true,
      description: '4th-floor private one-room studio near Sinchon Station (Line 2) with elevator, private bathroom, induction kitchenette, and full student furnishings. Water and internet included in maintenance.'
    }
  ],
  [
    'acc-2',
    {
      id: 'acc-2',
      propertyId: 'acc-2',
      title: 'Anam Campus Student Studio Officetel',
      city: 'Seoul',
      district: 'Seongbuk-gu, Anam-ro',
      address: 'Anam-ro, Seongbuk-gu, Seoul, South Korea',
      latitude: 37.5862,
      longitude: 127.0292,
      accommodationType: 'Studio',
      roomType: 'Studio',
      monthlyRent: 600000,
      monthlyRentKRW: 600000,
      securityDeposit: 5000000,
      depositKRW: 5000000,
      maintenanceFeeKRW: 80000,
      furnished: true,
      availableDate: 'Immediate',
      photos: ['/src/assets/images/korea_student_housing_1794049412879.jpg'],
      facilities: ['24/7 Security Entry', 'Elevator', 'Air Conditioner', 'Microwave', 'Built-in Wardrobe', 'Washing Machine'],
      amenities: ['24/7 Security Entry', 'Elevator', 'Air Conditioner', 'Microwave', 'Built-in Wardrobe', 'Washing Machine'],
      roomDetails: 'Private studio officetel (24㎡), individual floor heating (Ondol), keypad lock.',
      nearUniversities: ['Korea University Anam Campus'],
      landlordType: 'Direct Owner',
      landlordPhone: '02-924-1029',
      contactEmail: 'housing@everykr.com',
      availability: 'Available',
      approvalStatus: 'Approved',
      createdBy: 'system-admin',
      createdAt: '2026-10-16T09:00:00.000Z',
      updatedAt: '2026-10-16T09:00:00.000Z',
      approvedBy: 'mzhmd924@gmail.com',
      approvedAt: '2026-10-16T10:00:00.000Z',
      verified: true,
      description: 'Modern student studio officetel within walking distance of Anam Station (Line 6). Features secure building access, parcel lockers, and full appliances.'
    }
  ],
  [
    'acc-3',
    {
      id: 'acc-3',
      propertyId: 'acc-3',
      title: 'Busan Student Shared Room',
      city: 'Busan',
      district: 'Geumjeong-gu, Jangjeon-dong',
      address: 'Jangjeon-dong, Geumjeong-gu, Busan, South Korea',
      latitude: 35.2316,
      longitude: 129.0842,
      accommodationType: 'Shared Room',
      roomType: 'Shared Room',
      monthlyRent: 300000,
      monthlyRentKRW: 300000,
      securityDeposit: 500000,
      depositKRW: 500000,
      maintenanceFeeKRW: 0,
      furnished: true,
      availableDate: 'Immediate',
      photos: ['/src/assets/images/university_campus_seoul_1794049411388.jpg'],
      facilities: ['Study Desk & Bed', 'Wi-Fi Included', 'Shared Kitchen', 'Laundry Room', 'Air Conditioning & Heating'],
      amenities: ['Study Desk & Bed', 'Wi-Fi Included', 'Shared Kitchen', 'Laundry Room', 'Air Conditioning & Heating'],
      roomDetails: '2-person student shared room with individual desks, wardrobes, and shared kitchen facilities.',
      nearUniversities: ['Pusan National University'],
      landlordType: 'University Dorm',
      landlordPhone: '051-510-1800',
      contactEmail: 'housing@everykr.com',
      availability: 'Available',
      approvalStatus: 'Approved',
      createdBy: 'system-admin',
      createdAt: '2026-10-18T09:00:00.000Z',
      updatedAt: '2026-10-18T09:00:00.000Z',
      approvedBy: 'mzhmd924@gmail.com',
      approvedAt: '2026-10-18T10:00:00.000Z',
      verified: true,
      description: 'Furnished student shared residence near Pusan National University station in Geumjeong-gu, Busan. Utilities and high-speed Wi-Fi included.'
    }
  ],
  [
    'acc-4',
    {
      id: 'acc-4',
      propertyId: 'acc-4',
      title: 'Hongdae Single Goshiwon Room',
      city: 'Seoul',
      district: 'Mapo-gu, Wausan-ro',
      address: 'Wausan-ro, Mapo-gu, Seoul, South Korea',
      latitude: 37.5509,
      longitude: 126.9255,
      accommodationType: 'Goshiwon',
      roomType: 'Goshiwon',
      monthlyRent: 380000,
      monthlyRentKRW: 380000,
      securityDeposit: 100000,
      depositKRW: 100000,
      maintenanceFeeKRW: 0,
      furnished: true,
      availableDate: 'Immediate',
      photos: ['/src/assets/images/korea_student_housing_1794049412879.jpg'],
      facilities: ['Private Shower & Toilet', 'Wi-Fi', 'Central AC & Heating', 'Shared Kitchen & Laundry', 'CCTV Security'],
      amenities: ['Private Shower & Toilet', 'Wi-Fi', 'Central AC & Heating', 'Shared Kitchen & Laundry', 'CCTV Security'],
      roomDetails: 'Single occupancy private goshiwon room with en-suite bathroom, desk, mini-fridge, and bed.',
      nearUniversities: ['Hongik University', 'Sogang University'],
      landlordType: 'Direct Owner',
      landlordPhone: '02-334-2451',
      contactEmail: 'housing@everykr.com',
      availability: 'Available',
      approvalStatus: 'Approved',
      createdBy: 'system-admin',
      createdAt: '2026-10-19T09:00:00.000Z',
      updatedAt: '2026-10-19T09:00:00.000Z',
      approvedBy: 'mzhmd924@gmail.com',
      approvedAt: '2026-10-19T10:00:00.000Z',
      verified: true,
      description: 'Clean single room in Mapo-gu with low deposit and all utilities (electricity, water, gas, Wi-Fi) included in monthly rent.'
    }
  ]
]);

// Public endpoint: Returns ONLY Approved and Available listings
app.get('/api/accommodations', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const approvedPublic = Array.from(serverAccommodationsStore.values()).filter(
    item => item.approvalStatus === 'Approved' && item.availability === 'Available'
  );
  return res.json({
    ok: true,
    accommodations: approvedPublic
  });
});

// Admin endpoint: Returns ALL listings across all 5 statuses (Pending, Approved, Rejected, Unavailable, Archived)
app.get('/api/admin/accommodations', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const allListings = Array.from(serverAccommodationsStore.values()).sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
  return res.json({
    ok: true,
    accommodations: allListings
  });
});

// Create listing: Newly created listings ALWAYS default to Pending (never immediately Approved)
app.post('/api/accommodations', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  if (!caller.authenticated || !caller.uid) {
    return res.status(401).json({ ok: false, error: 'Authentication required to submit an accommodation listing.' });
  }

  const body = req.body || {};
  const id = typeof body.propertyId === 'string' && body.propertyId.trim()
    ? body.propertyId.trim()
    : typeof body.id === 'string' && body.id.trim()
    ? body.id.trim()
    : `acc-${Date.now()}`;

  const title = String(body.title || '').trim();
  const city = String(body.city || '').trim();
  if (!title || !city) {
    return res.status(400).json({ ok: false, error: 'Property title and city are required.' });
  }

  const rentNum = Math.max(0, Number(body.monthlyRent ?? body.monthlyRentKRW ?? 0) || 0);
  const depositNum = Math.max(0, Number(body.securityDeposit ?? body.depositKRW ?? 0) || 0);
  const maintNum = Math.max(0, Number(body.maintenanceFeeKRW ?? 0) || 0);
  const accType = String(body.accommodationType || body.roomType || 'One-room').trim();
  const addressStr = String(body.address || body.district || city).trim();
  const facilitiesArr = Array.isArray(body.facilities)
    ? body.facilities.map((f: unknown) => String(f).trim()).filter(Boolean)
    : Array.isArray(body.amenities)
    ? body.amenities.map((f: unknown) => String(f).trim()).filter(Boolean)
    : [];
  const photosArr = Array.isArray(body.photos)
    ? body.photos.map((p: unknown) => String(p).trim()).filter(Boolean)
    : [];
  const nowIso = new Date().toISOString();

  const newRecord: ServerAccommodationRecord = {
    id,
    propertyId: id,
    title,
    description: String(body.description || '').trim(),
    photos: photosArr,
    monthlyRent: rentNum,
    monthlyRentKRW: rentNum,
    securityDeposit: depositNum,
    depositKRW: depositNum,
    maintenanceFeeKRW: maintNum,
    city,
    district: String(body.district || addressStr).trim(),
    address: addressStr,
    latitude: typeof body.latitude === 'number' && !Number.isNaN(body.latitude) ? body.latitude : null,
    longitude: typeof body.longitude === 'number' && !Number.isNaN(body.longitude) ? body.longitude : null,
    accommodationType: accType,
    roomType: accType,
    facilities: facilitiesArr,
    amenities: facilitiesArr,
    roomDetails: String(body.roomDetails || '').trim(),
    availability: body.availability === 'Unavailable' ? 'Unavailable' : 'Available',
    // Strictly enforce Pending status on creation
    approvalStatus: 'Pending',
    createdBy: String(caller.uid || 'user'),
    createdAt: nowIso,
    updatedAt: nowIso,
    approvedBy: null,
    approvedAt: null,
    furnished: Boolean(body.furnished ?? true),
    availableDate: String(body.availableDate || 'Immediate').trim(),
    nearUniversities: Array.isArray(body.nearUniversities)
      ? body.nearUniversities.map((u: unknown) => String(u).trim()).filter(Boolean)
      : [],
    landlordType:
      body.landlordType === 'Certified Agent' || body.landlordType === 'University Dorm'
        ? body.landlordType
        : 'Direct Owner',
    landlordPhone: String(body.landlordPhone || '').trim(),
    contactEmail: typeof body.contactEmail === 'string' ? body.contactEmail.trim() : String(caller.email || ''),
    verified: false
  };

  serverAccommodationsStore.set(id, newRecord);
  return res.status(201).json({
    ok: true,
    accommodation: newRecord
  });
});

// Edit existing listing (Admin only, or creator resetting to Pending)
app.put('/api/admin/accommodations/:id', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const id = String(req.params.id || '').trim();
  const existing = serverAccommodationsStore.get(id);
  const body = req.body || {};
  const nowIso = new Date().toISOString();

  const rentNum = Math.max(
    0,
    Number(body.monthlyRent ?? body.monthlyRentKRW ?? existing?.monthlyRent ?? 0) || 0
  );
  const depositNum = Math.max(
    0,
    Number(body.securityDeposit ?? body.depositKRW ?? existing?.securityDeposit ?? 0) || 0
  );
  const maintNum = Math.max(
    0,
    Number(body.maintenanceFeeKRW ?? existing?.maintenanceFeeKRW ?? 0) || 0
  );
  const accType = String(
    body.accommodationType || body.roomType || existing?.accommodationType || 'One-room'
  ).trim();
  const facilitiesArr = Array.isArray(body.facilities)
    ? body.facilities.map((f: unknown) => String(f).trim()).filter(Boolean)
    : Array.isArray(body.amenities)
    ? body.amenities.map((f: unknown) => String(f).trim()).filter(Boolean)
    : existing?.facilities || [];
  const photosArr = Array.isArray(body.photos)
    ? body.photos.map((p: unknown) => String(p).trim()).filter(Boolean)
    : existing?.photos || [];

  const requireReapproval = Boolean(body.requireReapproval);
  const nextStatus: ServerAccommodationRecord['approvalStatus'] = requireReapproval
    ? 'Pending'
    : body.approvalStatus &&
      ['Pending', 'Approved', 'Rejected', 'Unavailable', 'Archived'].includes(body.approvalStatus)
    ? body.approvalStatus
    : existing?.approvalStatus || 'Pending';

  const updatedRecord: ServerAccommodationRecord = {
    id,
    propertyId: id,
    title: String(body.title ?? existing?.title ?? '').trim(),
    description: String(body.description ?? existing?.description ?? '').trim(),
    photos: photosArr,
    monthlyRent: rentNum,
    monthlyRentKRW: rentNum,
    securityDeposit: depositNum,
    depositKRW: depositNum,
    maintenanceFeeKRW: maintNum,
    city: String(body.city ?? existing?.city ?? '').trim(),
    district: String(body.district ?? body.address ?? existing?.district ?? '').trim(),
    address: String(body.address ?? body.district ?? existing?.address ?? '').trim(),
    latitude:
      typeof body.latitude === 'number' && !Number.isNaN(body.latitude)
        ? body.latitude
        : existing?.latitude ?? null,
    longitude:
      typeof body.longitude === 'number' && !Number.isNaN(body.longitude)
        ? body.longitude
        : existing?.longitude ?? null,
    accommodationType: accType,
    roomType: accType,
    facilities: facilitiesArr,
    amenities: facilitiesArr,
    roomDetails: String(body.roomDetails ?? existing?.roomDetails ?? '').trim(),
    availability:
      body.availability === 'Unavailable'
        ? 'Unavailable'
        : body.availability === 'Available'
        ? 'Available'
        : existing?.availability || 'Available',
    approvalStatus: nextStatus,
    createdBy: existing?.createdBy || admin.uid,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    approvedBy: nextStatus === 'Approved' ? admin.email : existing?.approvedBy || null,
    approvedAt: nextStatus === 'Approved' ? nowIso : existing?.approvedAt || null,
    furnished: Boolean(body.furnished ?? existing?.furnished ?? true),
    availableDate: String(body.availableDate ?? existing?.availableDate ?? 'Immediate').trim(),
    nearUniversities: Array.isArray(body.nearUniversities)
      ? body.nearUniversities.map((u: unknown) => String(u).trim()).filter(Boolean)
      : existing?.nearUniversities || [],
    landlordType:
      body.landlordType === 'Certified Agent' || body.landlordType === 'University Dorm'
        ? body.landlordType
        : existing?.landlordType || 'Direct Owner',
    landlordPhone: String(body.landlordPhone ?? existing?.landlordPhone ?? '').trim(),
    contactEmail: String(body.contactEmail ?? existing?.contactEmail ?? '').trim(),
    verified: nextStatus === 'Approved'
  };

  serverAccommodationsStore.set(id, updatedRecord);
  recordAdminActionServer({
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email,
    action: 'UPDATE_ACCOMMODATION',
    details: `Updated accommodation listing "${updatedRecord.title}" (${id}) [Status: ${updatedRecord.approvalStatus}, Availability: ${updatedRecord.availability}]`
  });

  return res.json({
    ok: true,
    accommodation: updatedRecord
  });
});

// Admin Approve / Reject / Unpublish (Unavailable) / Archive Endpoint
app.post('/api/admin/accommodations/:id/status', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const id = String(req.params.id || '').trim();
  const { approvalStatus, availability, rejectionReason, listingSnapshot } = req.body || {};

  if (
    !approvalStatus ||
    !['Pending', 'Approved', 'Rejected', 'Unavailable', 'Archived'].includes(approvalStatus)
  ) {
    return res.status(400).json({ ok: false, error: 'Invalid approvalStatus value.' });
  }

  const nowIso = new Date().toISOString();
  const existing = serverAccommodationsStore.get(id) || (listingSnapshot as ServerAccommodationRecord | undefined);
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'Accommodation listing not found.' });
  }

  const nextAvailability: 'Available' | 'Unavailable' =
    approvalStatus === 'Unavailable' || approvalStatus === 'Archived' || approvalStatus === 'Rejected'
      ? 'Unavailable'
      : availability === 'Unavailable'
      ? 'Unavailable'
      : 'Available';

  const updated: ServerAccommodationRecord = {
    ...existing,
    id,
    propertyId: id,
    approvalStatus,
    availability: nextAvailability,
    verified: approvalStatus === 'Approved' && nextAvailability === 'Available',
    approvedBy: approvalStatus === 'Approved' ? admin.email : existing.approvedBy || null,
    approvedAt: approvalStatus === 'Approved' ? nowIso : existing.approvedAt || null,
    rejectionReason: approvalStatus === 'Rejected' ? String(rejectionReason || '').trim() : null,
    updatedAt: nowIso
  };

  serverAccommodationsStore.set(id, updated);
  recordAdminActionServer({
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email,
    action: `ACCOMMODATION_${String(approvalStatus).toUpperCase()}`,
    details: `Set accommodation "${updated.title}" (${id}) status to ${approvalStatus} (Availability: ${nextAvailability}).`
  });

  return res.json({
    ok: true,
    accommodation: updated
  });
});

app.delete('/api/admin/accommodations/:id', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const id = String(req.params.id || '').trim();
  const existing = serverAccommodationsStore.get(id);
  serverAccommodationsStore.delete(id);

  recordAdminActionServer({
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email,
    action: 'DELETE_ACCOMMODATION',
    details: `Deleted accommodation listing "${existing?.title || id}" (${id}).`
  });

  return res.json({ ok: true, deletedId: id });
});

// ====================================================
// EVERYKR SIM REGISTRATION & FREE SIM APPLICATION API
// ====================================================

type ServerSimApplicationStatus =
  | 'Submitted'
  | 'Pending'
  | 'Under Review'
  | 'Contacted'
  | 'SIM Arranged'
  | 'Completed'
  | 'Rejected';

interface ServerSimApplicationRecord {
  id: string;
  applicationId: string;
  userId: string;
  userEmail: string;
  fullName: string;
  universityName: string;
  whatsappNumber: string;
  whatsappCountryCode?: string;
  whatsappLocalNumber?: string;
  arrivalDate: string;
  arrivalTime: string;
  flightNumber: string;
  arrivalAirport: string;
  passportDocumentURL: string;
  passportFileName: string;
  passportMimeType: string;
  passportFileSize: number;
  passportStoragePath?: string;
  flightTicketDocumentURL: string;
  flightTicketFileName: string;
  flightTicketMimeType: string;
  flightTicketFileSize: number;
  flightTicketStoragePath?: string;
  consentAccepted: boolean;
  consentVersion: string;
  consentText: string;
  consentTimestamp: string;
  submissionTimestamp: string;
  applicationStatus: ServerSimApplicationStatus;
  updatedAt?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  adminNotes?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
}

const VALID_SIM_AIRPORTS = [
  'Incheon International Airport (ICN)',
  'Gimhae International Airport (PUS)',
  'Gimpo International Airport (GMP)',
  'Jeju International Airport (CJU)',
  'Daegu International Airport (TAE)',
  'Cheongju International Airport (CJJ)',
  'Other'
];

const VALID_SIM_STATUSES: ServerSimApplicationStatus[] = [
  'Submitted',
  'Pending',
  'Under Review',
  'Contacted',
  'SIM Arranged',
  'Completed',
  'Rejected'
];

const ALLOWED_SIM_DOC_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];

const MAX_SIM_DOC_BYTES = 10 * 1024 * 1024; // 10 MB

const serverSimApplicationsStore = new Map<string, ServerSimApplicationRecord>();

// Submit a Free SIM Application (Authenticated User Only)
app.post('/api/sim-applications', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  const body = req.body || {};
  const userId = String(caller?.uid || body.userId || '').trim();

  if (!userId) {
    return res.status(401).json({
      ok: false,
      error: 'Authentication is required to submit a Free SIM application.'
    });
  }

  const fullName = String(body.fullName || '').trim();
  const universityName = String(body.universityName || '').trim();
  const whatsappNumber = String(body.whatsappNumber || '').trim();
  const whatsappCountryCode = String(body.whatsappCountryCode || '').trim();
  const whatsappLocalNumber = String(body.whatsappLocalNumber || '').trim();
  const arrivalDate = String(body.arrivalDate || '').trim();
  const arrivalTime = String(body.arrivalTime || '').trim();
  const flightNumber = String(body.flightNumber || '').trim().toUpperCase();
  const arrivalAirport = String(body.arrivalAirport || '').trim();
  const passportDocumentURL = String(body.passportDocumentURL || '').trim();
  const passportFileName = String(body.passportFileName || 'passport').trim();
  const passportMimeType = String(body.passportMimeType || 'application/pdf').trim().toLowerCase();
  const passportFileSize = Number(body.passportFileSize || 0);
  const passportStoragePath = String(body.passportStoragePath || '').trim();
  const flightTicketDocumentURL = String(body.flightTicketDocumentURL || '').trim();
  const flightTicketFileName = String(body.flightTicketFileName || 'flight_ticket').trim();
  const flightTicketMimeType = String(body.flightTicketMimeType || 'application/pdf').trim().toLowerCase();
  const flightTicketFileSize = Number(body.flightTicketFileSize || 0);
  const flightTicketStoragePath = String(body.flightTicketStoragePath || '').trim();
  const consentAccepted = body.consentAccepted === true;
  const consentVersion = String(body.consentVersion || 'v1.0-2026-11').trim();
  const consentText = String(body.consentText || '').trim();

  if (!fullName || fullName.length < 2) {
    return res.status(400).json({ ok: false, error: 'Full Name is required.' });
  }
  if (!universityName || universityName.length < 2) {
    return res.status(400).json({ ok: false, error: 'University Name is required.' });
  }
  if (!whatsappNumber || whatsappNumber.length < 6) {
    return res.status(400).json({ ok: false, error: 'A valid WhatsApp Number is required.' });
  }
  if (!arrivalDate) {
    return res.status(400).json({ ok: false, error: 'Arrival Date is required.' });
  }
  if (!arrivalTime) {
    return res.status(400).json({ ok: false, error: 'Arrival Time is required.' });
  }
  if (!flightNumber || flightNumber.length < 2) {
    return res.status(400).json({ ok: false, error: 'Flight Number is required.' });
  }
  if (!VALID_SIM_AIRPORTS.includes(arrivalAirport)) {
    return res.status(400).json({ ok: false, error: 'Please select a valid Arrival Airport.' });
  }
  if (!passportDocumentURL) {
    return res.status(400).json({ ok: false, error: 'Passport Upload is required.' });
  }
  if (!flightTicketDocumentURL) {
    return res.status(400).json({ ok: false, error: 'Air Ticket Upload is required.' });
  }
  if (!ALLOWED_SIM_DOC_MIMES.includes(passportMimeType)) {
    return res.status(400).json({
      ok: false,
      error: 'Passport file must be PDF, JPG, JPEG, or PNG.'
    });
  }
  if (!ALLOWED_SIM_DOC_MIMES.includes(flightTicketMimeType)) {
    return res.status(400).json({
      ok: false,
      error: 'Air ticket file must be PDF, JPG, JPEG, or PNG.'
    });
  }
  if (passportFileSize > MAX_SIM_DOC_BYTES) {
    return res.status(400).json({
      ok: false,
      error: 'Passport file size exceeds the 10 MB limit.'
    });
  }
  if (flightTicketFileSize > MAX_SIM_DOC_BYTES) {
    return res.status(400).json({
      ok: false,
      error: 'Air ticket file size exceeds the 10 MB limit.'
    });
  }
  if (!consentAccepted) {
    return res.status(400).json({
      ok: false,
      error: 'You must accept the mandatory privacy consent before submitting.'
    });
  }

  // Prevent duplicate rapid submissions for the same user, flight number, and arrival date within 2 minutes
  const nowMs = Date.now();
  for (const existing of serverSimApplicationsStore.values()) {
    if (
      existing.userId === userId &&
      existing.flightNumber === flightNumber &&
      existing.arrivalDate === arrivalDate
    ) {
      const submittedMs = Date.parse(existing.submissionTimestamp || '');
      if (!Number.isNaN(submittedMs) && nowMs - submittedMs < 120_000) {
        return res.status(409).json({
          ok: false,
          error: `A SIM application (${existing.applicationId}) for flight ${flightNumber} on ${arrivalDate} was just submitted.`
        });
      }
    }
  }

  const nowIso = new Date().toISOString();
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const applicationId = String(body.applicationId || `SIM-${year}-${rand}`).trim();

  const record: ServerSimApplicationRecord = {
    id: applicationId,
    applicationId,
    userId,
    userEmail: String(caller?.email || body.userEmail || '').trim(),
    fullName,
    universityName,
    whatsappNumber,
    whatsappCountryCode,
    whatsappLocalNumber,
    arrivalDate,
    arrivalTime,
    flightNumber,
    arrivalAirport,
    passportDocumentURL,
    passportFileName,
    passportMimeType,
    passportFileSize,
    passportStoragePath,
    flightTicketDocumentURL,
    flightTicketFileName,
    flightTicketMimeType,
    flightTicketFileSize,
    flightTicketStoragePath,
    consentAccepted: true,
    consentVersion,
    consentText,
    consentTimestamp: String(body.consentTimestamp || nowIso),
    submissionTimestamp: nowIso,
    applicationStatus: 'Pending',
    updatedAt: nowIso,
    reviewedBy: null,
    reviewedAt: null,
    adminNotes: '',
    assignedStaffId: '',
    assignedStaffName: ''
  };

  serverSimApplicationsStore.set(applicationId, record);

  // Trigger Admin Notification for new SIM application
  const notifId = `anotif_sim_${Date.now()}`;
  serverAdminNotificationsStore.set(notifId, {
    id: notifId,
    type: 'new_sim_application',
    title: 'New Free SIM Application Submitted',
    message: `${fullName} (${universityName}) submitted arrival info for flight ${flightNumber} on ${arrivalDate}.`,
    relatedRecordId: applicationId,
    studentId: userId,
    studentName: fullName,
    createdAt: nowIso,
    read: false
  });

  return res.status(201).json({
    ok: true,
    application: record
  });
});

// Get Authenticated User's Own SIM Applications (Never returns other users' records)
app.get('/api/sim-applications/mine', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  const queryUserId = String(req.query.userId || '').trim();
  const effectiveUid = String(caller?.uid || queryUserId).trim();

  if (!effectiveUid) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }
  if (caller?.uid && queryUserId && caller.uid !== queryUserId && !isAuthorizedServerAdmin(caller.email)) {
    return res.status(403).json({ ok: false, error: 'Forbidden: cannot access another user’s SIM applications.' });
  }

  const myApps = Array.from(serverSimApplicationsStore.values())
    .filter(item => item.userId === effectiveUid)
    .sort((a, b) => (b.submissionTimestamp || '').localeCompare(a.submissionTimestamp || ''));

  return res.json({
    ok: true,
    applications: myApps
  });
});

// Admin Only: List All SIM Applications
app.get('/api/admin/sim-applications', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const allApps = Array.from(serverSimApplicationsStore.values()).sort((a, b) =>
    (b.submissionTimestamp || '').localeCompare(a.submissionTimestamp || '')
  );

  return res.json({
    ok: true,
    applications: allApps
  });
});

// Admin Only: Update SIM Application Status (Submitted, Pending, Under Review, Contacted, SIM Arranged, Completed, Rejected)
app.patch('/api/admin/sim-applications/:applicationId/status', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const applicationId = String(req.params.applicationId || '').trim();
  const {
    applicationStatus,
    adminNotes,
    assignedStaffId,
    assignedStaffName,
    applicationSnapshot
  } = req.body || {};

  if (!applicationStatus || !VALID_SIM_STATUSES.includes(applicationStatus)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid applicationStatus value.'
    });
  }

  const existing =
    serverSimApplicationsStore.get(applicationId) ||
    (applicationSnapshot as ServerSimApplicationRecord | undefined);

  if (!existing) {
    return res.status(404).json({
      ok: false,
      error: 'SIM application record not found.'
    });
  }

  const nowIso = new Date().toISOString();
  const updated: ServerSimApplicationRecord = {
    ...existing,
    id: applicationId,
    applicationId,
    applicationStatus,
    adminNotes: typeof adminNotes === 'string' ? adminNotes.trim() : existing.adminNotes || '',
    assignedStaffId:
      typeof assignedStaffId === 'string' ? assignedStaffId.trim() : existing.assignedStaffId || '',
    assignedStaffName:
      typeof assignedStaffName === 'string'
        ? assignedStaffName.trim()
        : existing.assignedStaffName || '',
    reviewedBy: admin.email,
    reviewedAt: nowIso,
    updatedAt: nowIso
  };

  serverSimApplicationsStore.set(applicationId, updated);

  recordAdminActionServer({
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email,
    action: `SIM_APPLICATION_${String(applicationStatus).toUpperCase().replace(/\s+/g, '_')}`,
    details: `Updated SIM Application ${applicationId} (${updated.fullName} - ${updated.universityName}) status to "${applicationStatus}".`
  });

  return res.json({
    ok: true,
    application: updated
  });
});

// ====================================================
// STUDENT PORTAL & ADMIN MANAGEMENT SYSTEM API ROUTES
// ====================================================

const serverStudentDocumentsStore = new Map<string, any>();
const serverUniversityApplicationsStore = new Map<string, any>();
const serverStudentNotificationsStore = new Map<string, any[]>();
const serverAdminNotificationsStore = new Map<string, any>();
const serverManagedProgramsStore = new Map<string, any>();
const serverStaffMembersStore = new Map<string, any>();
const serverCmsAnnouncementsStore = new Map<string, any>();

// Seed default Staff RBAC accounts so User & Staff Management is populated out of the box
const seedNowIso = new Date().toISOString();
serverStaffMembersStore.set('staff_super_admin_1', {
  id: 'staff_super_admin_1',
  uid: 'staff_super_admin_1',
  fullName: 'EveryKR Super Administrator',
  email: 'mzhmd924@gmail.com',
  staffRole: 'Super Admin',
  permissions: [
    'manage_students',
    'view_passport_numbers',
    'manage_applications',
    'verify_documents',
    'manage_universities',
    'manage_programs',
    'manage_sim_applications',
    'manage_staff',
    'manage_cms',
    'export_reports',
    'manage_settings',
    'view_audit_logs'
  ],
  department: 'Executive & Platform Security',
  status: 'active',
  assignedApplicationsCount: 0,
  lastActiveAt: seedNowIso,
  createdAt: seedNowIso,
  updatedAt: seedNowIso
});
serverStaffMembersStore.set('staff_admission_mgr_1', {
  id: 'staff_admission_mgr_1',
  uid: 'staff_admission_mgr_1',
  fullName: 'Jisoo Park (Admission Manager)',
  email: 'admissions@everykr.com',
  staffRole: 'Admission Manager',
  permissions: [
    'manage_students',
    'manage_applications',
    'verify_documents',
    'manage_universities',
    'manage_programs',
    'export_reports'
  ],
  department: 'Korean University Admissions',
  status: 'active',
  assignedApplicationsCount: 0,
  lastActiveAt: seedNowIso,
  createdAt: seedNowIso,
  updatedAt: seedNowIso
});
serverStaffMembersStore.set('staff_doc_verify_1', {
  id: 'staff_doc_verify_1',
  uid: 'staff_doc_verify_1',
  fullName: 'Minho Kim (Document Verification)',
  email: 'verification@everykr.com',
  staffRole: 'Document Verification Staff',
  permissions: ['manage_students', 'view_passport_numbers', 'verify_documents'],
  department: 'Academic & Visa Document Compliance',
  status: 'active',
  assignedApplicationsCount: 0,
  lastActiveAt: seedNowIso,
  createdAt: seedNowIso,
  updatedAt: seedNowIso
});
serverStaffMembersStore.set('staff_support_1', {
  id: 'staff_support_1',
  uid: 'staff_support_1',
  fullName: 'Sora Lee (Student Arrival & SIM Support)',
  email: 'support@everykr.com',
  staffRole: 'Support Staff',
  permissions: ['manage_students', 'manage_sim_applications', 'manage_cms'],
  department: 'Student Arrival & SIM Services',
  status: 'active',
  assignedApplicationsCount: 0,
  lastActiveAt: seedNowIso,
  createdAt: seedNowIso,
  updatedAt: seedNowIso
});

// Seed initial CMS Announcement
serverCmsAnnouncementsStore.set('ann_2026_fall_intake', {
  id: 'ann_2026_fall_intake',
  title: 'Fall 2026 & Spring 2027 Korean University Admissions Now Open',
  category: 'University',
  summary: 'Apply directly through your EveryKR Student Portal with verified document review and GKS / university scholarship support.',
  content: 'International students can now complete their academic profile, upload transcripts and language certificates once, and submit applications to top Korean universities directly from the Student Portal.',
  status: 'Published',
  pinned: true,
  createdAt: seedNowIso,
  updatedAt: seedNowIso,
  createdBy: 'mzhmd924@gmail.com'
});

// 1. Student Documents Endpoints
app.post('/api/student-portal/documents', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  const body = req.body || {};
  const userId = String(caller?.uid || body.userId || '').trim();
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }
  const documentId = String(body.documentId || body.id || `sdoc_${Date.now()}`).trim();
  const nowIso = new Date().toISOString();
  const record = {
    ...body,
    id: documentId,
    documentId,
    userId,
    uploadStatus: body.uploadStatus || 'Uploaded',
    verificationStatus: 'Pending Verification',
    uploadedAt: body.uploadedAt || nowIso,
    updatedAt: nowIso
  };
  serverStudentDocumentsStore.set(documentId, record);
  return res.status(201).json({ ok: true, document: record });
});

app.get('/api/student-portal/documents', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  const queryUserId = String(req.query.userId || '').trim();
  const effectiveUid = String(caller?.uid || queryUserId).trim();
  if (!effectiveUid) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }
  if (caller?.uid && queryUserId && caller.uid !== queryUserId && !isAuthorizedServerAdmin(caller.email)) {
    return res.status(403).json({ ok: false, error: 'Forbidden.' });
  }
  const docs = Array.from(serverStudentDocumentsStore.values()).filter(
    d => d.userId === effectiveUid
  );
  return res.json({ ok: true, documents: docs });
});

app.delete('/api/student-portal/documents/:documentId', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  const documentId = String(req.params.documentId || '').trim();
  const queryUserId = String(req.query.userId || '').trim();
  const existing = serverStudentDocumentsStore.get(documentId);
  if (
    existing &&
    caller?.uid &&
    existing.userId !== caller.uid &&
    !isAuthorizedServerAdmin(caller.email)
  ) {
    return res.status(403).json({ ok: false, error: 'Forbidden.' });
  }
  if (existing && queryUserId && existing.userId === queryUserId) {
    serverStudentDocumentsStore.delete(documentId);
  } else {
    serverStudentDocumentsStore.delete(documentId);
  }
  return res.json({ ok: true, deletedId: documentId });
});

app.get('/api/admin/student-documents', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const docs = Array.from(serverStudentDocumentsStore.values());
  return res.json({ ok: true, documents: docs });
});

app.patch('/api/admin/student-documents/:documentId/verify', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const documentId = String(req.params.documentId || '').trim();
  const { verificationStatus, uploadStatus, verificationNotes, documentSnapshot } = req.body || {};
  const existing = serverStudentDocumentsStore.get(documentId) || documentSnapshot;
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'Document not found.' });
  }
  const nowIso = new Date().toISOString();
  const updated = {
    ...existing,
    id: documentId,
    documentId,
    uploadStatus:
      uploadStatus ||
      (verificationStatus === 'Replacement Requested' ? 'Replacement Requested' : 'Uploaded'),
    verificationStatus: verificationStatus || existing.verificationStatus,
    verificationNotes:
      typeof verificationNotes === 'string'
        ? verificationNotes.trim()
        : existing.verificationNotes || '',
    verifiedBy: admin.email,
    verifiedAt: nowIso,
    updatedAt: nowIso
  };
  serverStudentDocumentsStore.set(documentId, updated);
  return res.json({ ok: true, document: updated });
});

// 2. University Applications Endpoints
app.post('/api/student-portal/applications', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  const body = req.body || {};
  const userId = String(caller?.uid || body.userId || '').trim();
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }
  const applicationId = String(body.applicationId || body.id || `APP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`).trim();
  const nowIso = new Date().toISOString();
  const status = body.status === 'Draft' ? 'Draft' : 'Submitted';
  const record = {
    ...body,
    id: applicationId,
    applicationId,
    userId,
    status,
    submissionDate: body.submissionDate || nowIso,
    createdAt: body.createdAt || nowIso,
    updatedAt: nowIso
  };
  serverUniversityApplicationsStore.set(applicationId, record);
  return res.status(201).json({ ok: true, application: record });
});

app.patch('/api/student-portal/applications/:applicationId', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  const applicationId = String(req.params.applicationId || '').trim();
  const body = req.body || {};
  const existing = serverUniversityApplicationsStore.get(applicationId) || body;
  if (
    caller?.uid &&
    existing?.userId &&
    existing.userId !== caller.uid &&
    !isAuthorizedServerAdmin(caller.email)
  ) {
    return res.status(403).json({ ok: false, error: 'Forbidden.' });
  }
  const allowedStudentStatuses = ['Draft', 'Submitted', 'Withdrawn'];
  const nextStatus = allowedStudentStatuses.includes(body.status)
    ? body.status
    : existing?.status || 'Submitted';
  const updated = {
    ...existing,
    ...body,
    id: applicationId,
    applicationId,
    status: nextStatus,
    updatedAt: new Date().toISOString()
  };
  serverUniversityApplicationsStore.set(applicationId, updated);
  return res.json({ ok: true, application: updated });
});

app.get('/api/student-portal/applications', async (req, res) => {
  const caller = await extractCallerIdentity(req);
  const queryUserId = String(req.query.userId || '').trim();
  const effectiveUid = String(caller?.uid || queryUserId).trim();
  if (!effectiveUid) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }
  if (caller?.uid && queryUserId && caller.uid !== queryUserId && !isAuthorizedServerAdmin(caller.email)) {
    return res.status(403).json({ ok: false, error: 'Forbidden.' });
  }
  const apps = Array.from(serverUniversityApplicationsStore.values()).filter(
    a => a.userId === effectiveUid
  );
  return res.json({ ok: true, applications: apps });
});

app.get('/api/admin/university-applications', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const apps = Array.from(serverUniversityApplicationsStore.values());
  return res.json({ ok: true, applications: apps });
});

app.patch('/api/admin/university-applications/:applicationId/status', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const applicationId = String(req.params.applicationId || '').trim();
  const {
    status,
    adminNotes,
    requestedDocumentsNote,
    assignedStaffId,
    assignedStaffName,
    historyItem,
    applicationSnapshot
  } = req.body || {};

  const existing = serverUniversityApplicationsStore.get(applicationId) || applicationSnapshot;
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'University application not found.' });
  }
  const nowIso = new Date().toISOString();
  const prevHistory = Array.isArray(existing.statusHistory) ? existing.statusHistory : [];
  const updated = {
    ...existing,
    id: applicationId,
    applicationId,
    status: status || existing.status,
    adminNotes: typeof adminNotes === 'string' ? adminNotes.trim() : existing.adminNotes || '',
    requestedDocumentsNote:
      typeof requestedDocumentsNote === 'string'
        ? requestedDocumentsNote.trim()
        : existing.requestedDocumentsNote || '',
    assignedStaffId:
      typeof assignedStaffId === 'string' ? assignedStaffId.trim() : existing.assignedStaffId || '',
    assignedStaffName:
      typeof assignedStaffName === 'string'
        ? assignedStaffName.trim()
        : existing.assignedStaffName || '',
    updatedAt: nowIso,
    statusHistory: historyItem ? [...prevHistory, historyItem] : prevHistory
  };
  serverUniversityApplicationsStore.set(applicationId, updated);
  return res.json({ ok: true, application: updated });
});

// 3. Student & Admin Notifications Endpoints
app.post('/api/student-portal/notifications', async (req, res) => {
  const { userId, notification } = req.body || {};
  if (!userId || !notification) {
    return res.status(400).json({ ok: false, error: 'userId and notification required.' });
  }
  const list = serverStudentNotificationsStore.get(userId) || [];
  serverStudentNotificationsStore.set(
    userId,
    [notification, ...list.filter(n => n.id !== notification.id)].slice(0, 50)
  );
  return res.json({ ok: true, notification });
});

app.get('/api/student-portal/notifications', async (req, res) => {
  const userId = String(req.query.userId || '').trim();
  if (!userId) return res.json({ ok: true, notifications: [] });
  const list = serverStudentNotificationsStore.get(userId) || [];
  return res.json({ ok: true, notifications: list });
});

app.post('/api/admin/notifications', async (req, res) => {
  const body = req.body || {};
  const id = String(body.id || `anotif_${Date.now()}`);
  const item = { ...body, id, createdAt: body.createdAt || new Date().toISOString(), read: Boolean(body.read) };
  serverAdminNotificationsStore.set(id, item);
  return res.json({ ok: true, notification: item });
});

app.get('/api/admin/notifications', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const list = Array.from(serverAdminNotificationsStore.values()).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  return res.json({ ok: true, notifications: list });
});

app.patch('/api/admin/notifications/:id/read', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const id = String(req.params.id || '').trim();
  const existing = serverAdminNotificationsStore.get(id);
  if (existing) {
    serverAdminNotificationsStore.set(id, { ...existing, read: true });
  }
  return res.json({ ok: true });
});

// 4. Admin Program Management Endpoints
app.get('/api/admin/programs', async (_req, res) => {
  return res.json({ ok: true, programs: Array.from(serverManagedProgramsStore.values()) });
});

app.post('/api/admin/programs', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const body = req.body || {};
  const id = String(body.id || `prog_${Date.now()}`);
  const saved = { ...body, id, updatedAt: new Date().toISOString() };
  serverManagedProgramsStore.set(id, saved);
  return res.json({ ok: true, program: saved });
});

app.delete('/api/admin/programs/:id', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const id = String(req.params.id || '').trim();
  serverManagedProgramsStore.delete(id);
  return res.json({ ok: true, deletedId: id });
});

// 5. Staff RBAC Management Endpoints
app.get('/api/admin/staff', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  return res.json({ ok: true, staff: Array.from(serverStaffMembersStore.values()) });
});

app.post('/api/admin/staff', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const body = req.body || {};
  const id = String(body.id || `staff_${Date.now()}`);
  const saved = { ...body, id, updatedAt: new Date().toISOString() };
  serverStaffMembersStore.set(id, saved);
  return res.json({ ok: true, staff: saved });
});

app.delete('/api/admin/staff/:id', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const id = String(req.params.id || '').trim();
  serverStaffMembersStore.delete(id);
  return res.json({ ok: true, deletedId: id });
});

// 6. CMS Announcements Endpoints
app.get('/api/cms/announcements', (_req, res) => {
  return res.json({ ok: true, announcements: Array.from(serverCmsAnnouncementsStore.values()) });
});

app.post('/api/cms/announcements', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const body = req.body || {};
  const id = String(body.id || `ann_${Date.now()}`);
  const saved = { ...body, id, updatedAt: new Date().toISOString() };
  serverCmsAnnouncementsStore.set(id, saved);
  return res.json({ ok: true, announcement: saved });
});

app.delete('/api/cms/announcements/:id', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const id = String(req.params.id || '').trim();
  serverCmsAnnouncementsStore.delete(id);
  return res.json({ ok: true, deletedId: id });
});

// 7. Admin Audit Logs & Security Logs Read/Write Endpoints
const serverAuditLogsStore = new Map<string, any>();

app.get('/api/admin/audit-logs', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const logs = Array.from(serverAuditLogsStore.values()).sort((a, b) =>
    String(b.timestamp || '').localeCompare(String(a.timestamp || ''))
  );
  return res.json({ ok: true, auditLogs: logs });
});

app.post('/api/admin/audit-logs', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const body = req.body || {};
  const nowIso = new Date().toISOString();
  const id = String(body.id || `log-${Date.now()}`).trim();
  const entry = {
    id,
    timestamp: String(body.timestamp || nowIso),
    adminName: String(body.adminName || admin.name || 'Super Admin'),
    adminEmail: String(body.adminEmail || admin.email || 'admin@everykr.com'),
    actionType: String(body.actionType || 'UPDATE'),
    targetEntity: String(body.targetEntity || 'User'),
    targetId: String(body.targetId || ''),
    targetName: String(body.targetName || ''),
    details: String(body.details || '')
  };
  serverAuditLogsStore.set(id, entry);
  recordAdminActionServer({
    adminUid: admin.uid,
    adminName: entry.adminName,
    adminEmail: entry.adminEmail,
    action: `${entry.actionType}_${entry.targetEntity.toUpperCase()}`,
    targetUid: entry.targetId || undefined,
    details: `${entry.targetName ? `[${entry.targetName}] ` : ''}${entry.details}`
  });
  return res.status(201).json({ ok: true, auditLog: entry });
});

app.get('/api/admin/logs', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const overview = getAdminUserManagementOverview();
  return res.json({ ok: true, adminLogs: overview.adminLogs || [] });
});

// ====================================================
// 8. MASTER ADMIN HOMEPAGE CMS, SIM BULK & ARRIVAL GROUPS
// ====================================================

const CMS_HOMEPAGE_STORE_FILE = path.join(process.cwd(), 'data', 'cms-homepage-store.json');
const serverHomepageCategoriesStore = new Map<string, any>();
const serverHomepageServicesStore = new Map<string, any>();
const serverSimArrivalGroupsStore = new Map<string, any>();
const serverSimExportHistoryStore = new Map<string, any>();

function loadCmsHomepageDiskStore(): void {
  try {
    if (fs.existsSync(CMS_HOMEPAGE_STORE_FILE)) {
      const raw = fs.readFileSync(CMS_HOMEPAGE_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.categories)) {
        for (const cat of parsed.categories) {
          if (cat?.id) serverHomepageCategoriesStore.set(cat.id, cat);
        }
      }
      if (Array.isArray(parsed?.nestedServices)) {
        for (const srv of parsed.nestedServices) {
          if (srv?.id) serverHomepageServicesStore.set(srv.id, srv);
        }
      }
    }
  } catch {
    // ignore corrupt disk store
  }
}

function saveCmsHomepageDiskStore(): void {
  try {
    const dir = path.dirname(CMS_HOMEPAGE_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      CMS_HOMEPAGE_STORE_FILE,
      JSON.stringify(
        {
          categories: Array.from(serverHomepageCategoriesStore.values()),
          nestedServices: Array.from(serverHomepageServicesStore.values()),
          updatedAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch {
    // ignore disk write errors
  }
}

loadCmsHomepageDiskStore();

// Homepage CMS Read (Public)
app.get('/api/cms/homepage', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json({
    ok: true,
    categories: Array.from(serverHomepageCategoriesStore.values()),
    nestedServices: Array.from(serverHomepageServicesStore.values())
  });
});

// Synchronize Firestore CMS categories/services into Server Cache
app.post('/api/cms/homepage/sync-from-firestore', (req, res) => {
  const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];
  const nestedServices = Array.isArray(req.body?.nestedServices) ? req.body.nestedServices : [];
  let changed = false;

  for (const cat of categories) {
    if (cat?.id) {
      const existing = serverHomepageCategoriesStore.get(cat.id);
      if (!existing || !existing.updatedAt || (cat.updatedAt && cat.updatedAt >= existing.updatedAt)) {
        serverHomepageCategoriesStore.set(cat.id, cat);
        changed = true;
      }
    }
  }

  for (const srv of nestedServices) {
    if (srv?.id) {
      const existing = serverHomepageServicesStore.get(srv.id);
      if (!existing || !existing.updatedAt || (srv.updatedAt && srv.updatedAt >= existing.updatedAt)) {
        serverHomepageServicesStore.set(srv.id, srv);
        changed = true;
      }
    }
  }

  if (changed) {
    saveCmsHomepageDiskStore();
  }

  return res.json({
    ok: true,
    categories: Array.from(serverHomepageCategoriesStore.values()),
    nestedServices: Array.from(serverHomepageServicesStore.values())
  });
});

// Homepage CMS Save Category (Admin Only)
app.post('/api/cms/homepage/category', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const rawBody = req.body || {};
  const categoryObj =
    rawBody.category && typeof rawBody.category === 'object' ? rawBody.category : rawBody;
  const id = String(categoryObj.id || '').trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Category id is required.' });
  }
  const existing = serverHomepageCategoriesStore.get(id);
  const nextVersion = (Number(existing?.version || categoryObj.version) || 0) + 1;
  const saved = {
    ...categoryObj,
    id,
    version: nextVersion,
    updatedAt: categoryObj.updatedAt || new Date().toISOString(),
    updatedBy: admin.email
  };
  serverHomepageCategoriesStore.set(id, saved);
  saveCmsHomepageDiskStore();
  return res.json({ ok: true, category: saved });
});

// Homepage CMS Reorder Categories (Admin Only)
app.post('/api/cms/homepage/categories-reorder', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];
  const nowIso = new Date().toISOString();
  categories.forEach((cat: any, idx: number) => {
    if (cat?.id) {
      const existing = serverHomepageCategoriesStore.get(cat.id);
      const nextVersion = (Number(existing?.version || cat.version) || 0) + 1;
      serverHomepageCategoriesStore.set(cat.id, {
        ...cat,
        displayOrder: idx + 1,
        version: nextVersion,
        updatedAt: cat.updatedAt || nowIso,
        updatedBy: admin.email
      });
    }
  });
  saveCmsHomepageDiskStore();
  return res.json({
    ok: true,
    categories: Array.from(serverHomepageCategoriesStore.values())
  });
});

// Homepage CMS Save Nested Service (Admin Only)
app.post('/api/cms/homepage/service', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const rawBody = req.body || {};
  const serviceObj =
    rawBody.service && typeof rawBody.service === 'object' ? rawBody.service : rawBody;
  const id = String(serviceObj.id || `svc_${Date.now()}`).trim();
  const existing = serverHomepageServicesStore.get(id);
  const nextVersion = (Number(existing?.version || serviceObj.version) || 0) + 1;
  const saved = {
    ...serviceObj,
    id,
    version: nextVersion,
    updatedAt: serviceObj.updatedAt || new Date().toISOString(),
    updatedBy: admin.email
  };
  serverHomepageServicesStore.set(id, saved);
  saveCmsHomepageDiskStore();
  return res.json({ ok: true, service: saved });
});

// ============================================================================
// UNIVERSITY ADMISSION DEADLINE MANAGEMENT SYSTEM ROUTES (CMS + CAROUSEL)
// ============================================================================

// Serve Official Uploaded University Logos (Disk + Durable Asset Store + Firestore Self-Healing)
app.get(
  [
    '/uploads/university-deadlines/:uniSlug/:fileName',
    '/api/cms/university-deadlines/logo/:uniSlug/:fileName',
  ],
  (req, res) => {
    const resolved = getUniversityDeadlineLogoBinaryServer(
      req.params.uniSlug,
      req.params.fileName
    );
    if (!resolved.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).json({
        ok: false,
        error: 'University logo asset not found.',
      });
    }
    res.setHeader('Content-Type', resolved.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (resolved.mimeType === 'image/svg+xml') {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; sandbox"
      );
    }
    return res.status(200).send(resolved.buffer);
  }
);

// Read University Admission Deadlines (Public receives ONLY published; Admin receives all when scope=admin)
app.get('/api/cms/university-deadlines', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const requestedScope = String(req.query?.scope || 'public').toLowerCase();
  let isAdminCaller = false;
  if (requestedScope === 'admin') {
    const caller = await extractCallerIdentity(req);
    isAdminCaller = Boolean(caller.authenticated && caller.isAdmin);
  }
  const payload = getUniversityDeadlinesPayloadServer(isAdminCaller);
  return res.json({
    ok: true,
    scope: isAdminCaller ? 'admin' : 'public',
    ...payload,
  });
});

// Sync Firestore University Admission Deadlines -> Server Store (Admin Only)
app.post('/api/cms/university-deadlines/sync-from-firestore', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const synced = syncUniversityDeadlinesFromFirestoreServer({
    config: req.body?.config,
    deadlines: req.body?.deadlines,
  });
  return res.json({ ok: true, ...synced });
});

// Direct Computer University Logo Upload & Security Sanitization (Admin Only)
app.post('/api/admin/university-deadlines/upload-logo', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const result = await uploadUniversityDeadlineLogoServer({
    dataUrl: req.body?.dataUrl,
    compactFallbackDataUrl: req.body?.compactFallbackDataUrl,
    fileName: req.body?.fileName,
    universityId: req.body?.universityId,
    storageDownloadUrl: req.body?.storageDownloadUrl,
    storagePath: req.body?.storagePath,
  });
  if (!result.ok) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  return res.json(result);
});

// Cleanup Unreferenced Draft/Replaced University Logo (Admin Only)
app.post('/api/admin/university-deadlines/cleanup-logo', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const cleanup = cleanupUnreferencedDeadlineLogoServer({
    logoStoragePath: req.body?.logoStoragePath,
    logoDownloadUrl: req.body?.logoDownloadUrl,
  });
  return res.json({ ok: true, ...cleanup });
});

// Create or Update University Admission Deadline Record (Admin Only)
app.post('/api/admin/university-deadlines', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const rawDeadline =
    req.body?.deadline && typeof req.body.deadline === 'object'
      ? req.body.deadline
      : req.body;
  const result = saveUniversityDeadlineServer({
    rawDeadline,
    adminUid: admin.uid,
    adminEmail: admin.email,
  });
  if (!result.ok) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  return res.json(result);
});

// Reorder University Admission Deadlines (Admin Only)
app.post('/api/admin/university-deadlines/reorder', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const incoming = Array.isArray(req.body?.deadlines) ? req.body.deadlines : [];
  const deadlines = reorderUniversityDeadlinesServer({
    deadlines: incoming,
    adminUid: admin.uid,
    adminEmail: admin.email,
  });
  return res.json({ ok: true, deadlines });
});

// Enable / Disable Homepage University Deadline Carousel Globally (Admin Only)
app.put('/api/admin/university-deadlines/settings', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const config = updateUniversityDeadlineCarouselSettingsServer({
    carouselEnabled: Boolean(req.body?.carouselEnabled),
    adminUid: admin.uid,
    adminEmail: admin.email,
  });
  return res.json({ ok: true, config });
});

// Delete University Admission Deadline Record & Unreferenced Logo (Admin Only)
app.delete('/api/admin/university-deadlines/:id', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const result = deleteUniversityDeadlineServer({
    id: req.params.id,
    adminUid: admin.uid,
    adminEmail: admin.email,
  });
  if (!result.ok) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  return res.json(result);
});

// SIM Bulk Update (Assign Airport, Assign Arrival Date, Change Status)
app.post('/api/admin/sim-applications/bulk-update', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const applicationIds: string[] = Array.isArray(req.body?.applicationIds)
    ? req.body.applicationIds.map((id: unknown) => String(id).trim()).filter(Boolean)
    : [];
  const updates = req.body?.updates || {};

  if (applicationIds.length === 0) {
    return res.status(400).json({ ok: false, error: 'No applicationIds provided.' });
  }

  const nowIso = new Date().toISOString();
  const updatedRecords: ServerSimApplicationRecord[] = [];

  for (const appId of applicationIds) {
    const existing = serverSimApplicationsStore.get(appId);
    if (!existing) continue;
    const next: ServerSimApplicationRecord = {
      ...existing,
      ...(updates.arrivalAirport ? { arrivalAirport: String(updates.arrivalAirport) as any } : {}),
      ...(updates.arrivalDate ? { arrivalDate: String(updates.arrivalDate) } : {}),
      ...(updates.applicationStatus && VALID_SIM_STATUSES.includes(updates.applicationStatus)
        ? { applicationStatus: updates.applicationStatus }
        : {}),
      ...(typeof updates.adminNotes === 'string' ? { adminNotes: updates.adminNotes } : {}),
      reviewedBy: admin.email,
      reviewedAt: nowIso,
      updatedAt: nowIso
    };
    serverSimApplicationsStore.set(appId, next);
    updatedRecords.push(next);
  }

  recordAdminActionServer({
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email,
    action: 'SIM_BULK_UPDATE',
    details: `Bulk updated ${updatedRecords.length} SIM applications (${JSON.stringify(updates)}).`
  });

  return res.json({
    ok: true,
    updatedCount: updatedRecords.length,
    applications: updatedRecords
  });
});

// SIM Original Document Binary Proxy for Admin ZIP Export (Never fabricates fake files)
app.get('/api/admin/sim-applications/document-bytes', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const fileUrl = String(req.query.fileUrl || '').trim();
  if (!fileUrl) {
    return res.status(400).json({ ok: false, error: 'Missing fileUrl parameter.' });
  }

  try {
    if (fileUrl.startsWith('data:')) {
      const commaIdx = fileUrl.indexOf(',');
      if (commaIdx === -1) {
        return res.status(400).json({ ok: false, error: 'Malformed data URL.' });
      }
      const header = fileUrl.slice(0, commaIdx);
      const body = fileUrl.slice(commaIdx + 1);
      const mimeMatch = header.match(/^data:([^;,]+)/i);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const buf = header.includes(';base64')
        ? Buffer.from(body, 'base64')
        : Buffer.from(decodeURIComponent(body), 'utf-8');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', String(buf.length));
      return res.send(buf);
    }

    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      const upstream = await fetch(fileUrl);
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          ok: false,
          error: `Upstream storage returned HTTP ${upstream.status}`
        });
      }
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const arrayBuf = await upstream.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(buf.length));
      return res.send(buf);
    }

    return res.status(404).json({ ok: false, error: 'Unsupported document URL scheme.' });
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      error: err?.message || 'Failed to retrieve original student document bytes.'
    });
  }
});

// SIM Arrival Groups Endpoints (Admin Only)
app.get('/api/admin/arrival-groups', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const groups = Array.from(serverSimArrivalGroupsStore.values()).sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  );
  return res.json({ ok: true, groups });
});

app.post('/api/admin/arrival-groups', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const body = req.body || {};
  const id = String(body.id || `grp_${Date.now()}`).trim();
  const saved = {
    ...body,
    id,
    updatedAt: new Date().toISOString()
  };
  serverSimArrivalGroupsStore.set(id, saved);
  return res.json({ ok: true, group: saved });
});

app.delete('/api/admin/arrival-groups/:id', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const id = String(req.params.id || '').trim();
  serverSimArrivalGroupsStore.delete(id);
  return res.json({ ok: true, deletedId: id });
});

// SIM Export History Endpoints (Admin Only)
app.get('/api/admin/sim-export-history', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const exportsList = Array.from(serverSimExportHistoryStore.values()).sort((a, b) =>
    String(b.exportedAt || '').localeCompare(String(a.exportedAt || ''))
  );
  return res.json({ ok: true, exports: exportsList });
});

app.post('/api/admin/sim-export-history', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const body = req.body || {};
  const id = String(body.id || `exp_${Date.now()}`).trim();
  const saved = {
    ...body,
    id,
    exportedAt: body.exportedAt || new Date().toISOString()
  };
  serverSimExportHistoryStore.set(id, saved);
  return res.json({ ok: true, exportRecord: saved });
});

app.get('/api/deployment-status', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json({
    status: 'ok',
    service: 'EveryKR Full-Stack Platform',
    canonicalDomain: 'https://everykr.com',
    environment: process.env.NODE_ENV || 'development',
    firebase: {
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'everykr',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'everykr.firebaseapp.com',
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '926172198407',
      appId: process.env.VITE_FIREBASE_APP_ID || '1:926172198407:web:eb679714ecb801edd99ca2'
    },
    features: {
      koreanAcademy20x: true,
      everyKrLearnHangul: true,
      koreanTutorAi: true,
      generalIntelligenceAi: true,
      simRegistrationPortal: true,
      studentPortalSystem: true,
      adminManagementSystem: true
    },
    verifiedRoutes: [
      '/',
      '/dashboard',
      '/profile',
      '/student-portal',
      '/admin',
      '/sim',
      '/korean-academy',
      '/learn-hangul',
      '/study-language',
      '/universities',
      '/scholarships',
      '/visa',
      '/jobs',
      '/housing',
      '/community',
      '/marketplace',
      '/daily-life',
      '/transportation',
      '/flights',
      '/ai-chat',
      '/login',
      '/register',
      '/reset-password'
    ],
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// FLIGHT SEARCH & PRICE COMPARISON ENGINE API ENDPOINTS
// ============================================================================

// 1. Airport Autocomplete & Directory Endpoint
app.get('/api/flights/airports', (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(30, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
  const results = q
    ? AirportAutocompleteService.searchAirports(q, limit)
    : VERIFIED_AIRPORTS_DIRECTORY;
  return res.json({
    ok: true,
    airports: results
  });
});

// 2. Public Flight Engine Configuration & Trusted Booking Providers Directory
app.get('/api/flights/providers', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json({
    ok: true,
    bookingProviders: FlightAnalyticsService.getPublicBookingProviders(),
    searchConfig: FlightAnalyticsService.getPublicSearchConfiguration(),
    apiProvidersStatus: FlightSearchService.getPublicProvidersStatus()
  });
});

// 3. Server-Side Flight Search & Price Comparison Endpoint
app.post('/api/flights/search', async (req, res) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'local';

  const rateCheck = FlightSearchService.checkSearchRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      ok: false,
      error: `Too many flight searches from this address. Please wait ${
        rateCheck.retryAfterSeconds || 15
      } seconds and try again.`
    });
  }

  const validation = FlightSearchService.validateSearchInput(req.body || {});
  if (!validation.valid || !validation.sanitized) {
    return res.status(400).json({
      ok: false,
      error: validation.error || 'Invalid flight search parameters.'
    });
  }

  try {
    const searchResponse = await FlightSearchService.executeSearch(validation.sanitized);
    return res.json(searchResponse);
  } catch (err) {
    console.error('Flight search error:', err);
    return res.status(500).json({
      ok: false,
      error: 'An unexpected error occurred while searching flights.'
    });
  }
});

// 3B. Server-Side Flight Offer Live Price Verification Endpoint
app.post('/api/flights/verify-price', async (req, res) => {
  try {
    const body = req.body || {};
    const offerId = String(body.offerId || body.offer?.id || '').trim();
    if (!offerId) {
      return res.status(400).json({
        ok: false,
        error: 'Missing offerId for flight price verification.'
      });
    }

    const rawResult = await FlightPriceVerificationService.verifyFlightOfferPrice({
      offerId,
      expectedTotalPrice:
        typeof body.offer?.totalPrice === 'number' ? body.offer.totalPrice : undefined,
      currency: typeof body.offer?.currency === 'string' ? body.offer.currency : undefined,
      offerSnapshot: body.offer
    });

    return res.json({
      ...rawResult,
      verified: Boolean(rawResult.available && rawResult.verifiedTotalPrice !== null),
      originalPrice: rawResult.originalTotalPrice,
      verifiedPrice: rawResult.verifiedTotalPrice,
      taxesAndFeesTotal: rawResult.verifiedTaxesAndFees,
      fareDetailsBySegment: [],
      lastTicketingDate: rawResult.expiresAt || undefined,
      message: rawResult.statusMessage
    });
  } catch (err) {
    console.error('Flight price verification error:', err);
    return res.status(500).json({
      ok: false,
      verified: false,
      priceStatus: 'Price Unavailable',
      message: 'Unable to complete live price verification at this moment.'
    });
  }
});

// 4. Booking Provider Redirect Telemetry Endpoint
app.post('/api/flights/redirect-click', (req, res) => {
  const { providerId, origin, destination } = req.body || {};
  if (typeof providerId === 'string' && providerId.trim()) {
    FlightAnalyticsService.recordBookingRedirectClick({
      providerId: providerId.trim(),
      origin: typeof origin === 'string' ? origin : undefined,
      destination: typeof destination === 'string' ? destination : undefined
    });
  }
  return res.json({ ok: true });
});

// 5. User Flight Price Alerts Endpoints (Authenticated Users)
app.get('/api/flights/price-alerts', (req, res) => {
  const userId = String(req.query.userId || req.headers['x-user-uid'] || '').trim();
  if (!userId) {
    return res.status(401).json({
      ok: false,
      error: 'Please sign in to view your saved flight price alerts.'
    });
  }
  const alerts = PriceAlertService.getUserAlerts(userId);
  return res.json({ ok: true, alerts });
});

app.post('/api/flights/price-alerts', (req, res) => {
  const body = req.body || {};
  const userId = String(body.userId || req.headers['x-user-uid'] || '').trim();
  const userEmail = String(body.userEmail || req.headers['x-user-email'] || '').trim();
  const userName = String(body.userName || 'EveryKR Traveler').trim();

  if (!userId || !userEmail) {
    return res.status(401).json({
      ok: false,
      error: 'Please sign in with your EveryKR account to save a price alert.'
    });
  }

  const result = PriceAlertService.createAlert({
    userId,
    userEmail,
    userName,
    origin: body.origin,
    destination: body.destination,
    departureDate: body.departureDate,
    returnDate: body.returnDate,
    tripType: body.tripType,
    cabinClass: body.cabinClass,
    targetPrice: Number(body.targetPrice),
    currency: body.currency || 'USD'
  });

  if (!result.ok) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

const handleUpdatePriceAlert = (req: express.Request, res: express.Response) => {
  const { alertId } = req.params;
  const body = req.body || {};
  const userId = String(body.userId || req.headers['x-user-uid'] || '').trim();
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }

  const result = PriceAlertService.updateAlert({
    alertId,
    userId,
    targetPrice: body.targetPrice !== undefined ? Number(body.targetPrice) : undefined,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    departureDate: body.departureDate
  });

  if (!result.ok) {
    return res.status(400).json(result);
  }
  return res.json(result);
};

app.put('/api/flights/price-alerts/:alertId', handleUpdatePriceAlert);
app.patch('/api/flights/price-alerts/:alertId', handleUpdatePriceAlert);

app.delete('/api/flights/price-alerts/:alertId', (req, res) => {
  const { alertId } = req.params;
  const userId = String(
    req.query.userId || req.body?.userId || req.headers['x-user-uid'] || ''
  ).trim();
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }

  const result = PriceAlertService.deleteAlert({ alertId, userId });
  if (!result.ok) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 6. Admin Flight Management Endpoints (Strictly Verified Administrators Only)
app.get('/api/admin/flights/overview', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json(FlightAnalyticsService.getAdminFlightManagementOverview());
});

app.put('/api/admin/flights/api-providers/:providerId', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const providerId = req.params.providerId;
  const body = req.body || {};
  const result = FlightAnalyticsService.updateAdminApiProvider({
    providerId,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    environment: body.environment,
    priority: body.priority !== undefined ? Number(body.priority) : undefined,
    rateLimitPerMinute:
      body.rateLimitPerMinute !== undefined ? Number(body.rateLimitPerMinute) : undefined,
    timeoutMs: body.timeoutMs !== undefined ? Number(body.timeoutMs) : undefined,
    partnerApproved:
      typeof body.partnerApproved === 'boolean' ? body.partnerApproved : undefined,
    clearStoredCredentials:
      typeof body.clearStoredCredentials === 'boolean' ? body.clearStoredCredentials : undefined,
    clientId: body.clientId,
    clientSecret: body.clientSecret,
    apiKey: body.apiKey,
    serpApiKey: body.serpApiKey,
    credentials: body.credentials
  });

  if (!result.ok) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/api/admin/flights/api-providers/:providerId/test', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const providerId = String(req.params.providerId || '').trim();
  const testResult = await FlightAnalyticsService.testAdminApiProviderConnection(providerId);
  return res.json(testResult);
});

app.post('/api/admin/flights/booking-providers', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const result = FlightAnalyticsService.upsertAdminBookingProvider(req.body || {});
  if (!result.ok) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.delete('/api/admin/flights/booking-providers/:providerId', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const result = FlightAnalyticsService.deleteAdminBookingProvider(req.params.providerId);
  if (!result.ok) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

const handleUpdateFlightSearchConfig = async (req: express.Request, res: express.Response) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const result = FlightAnalyticsService.updateAdminSearchConfig(req.body || {}, admin.name);
  return res.json(result);
};

app.put('/api/admin/flights/search-config', handleUpdateFlightSearchConfig);
app.put('/api/admin/flights/config', handleUpdateFlightSearchConfig);

// ============================================================================
// SMART TRANSPORTATION HUB API ENDPOINTS (KTX TRAIN, EXPRESS & INTERCITY BUS)
// Information & Discovery Only — Official External Booking Redirects
// ============================================================================

// 1. Public Transport Hub Config (Enabled Services, Announcements, Featured Routes, Verified Booking URLs)
app.get('/api/transport/hub-config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json({
    ok: true,
    ...getPublicTransportHubPayload(),
  });
});

// 2. KTX / SRT Station Directory & Search
app.get('/api/transport/ktx/stations', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const allStations = getAllKtxStations();
  const filtered = q
    ? allStations.filter(
        (s) =>
          s.nameEn.toLowerCase().includes(q) ||
          s.nameKo.toLowerCase().includes(q) ||
          s.cityEn.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.aliases.some((a) => a.toLowerCase().includes(q))
      )
    : allStations;
  return res.json({
    ok: true,
    stations: filtered,
  });
});

// 3. KTX / SRT Schedule & Fare Discovery (GET & POST)
const handleKtxSearchRequest = async (req: express.Request, res: express.Response) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'local';

  const rateCheck = checkTransportRateLimit(`ktx:${clientIp}`);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      ok: false,
      error: `Too many KTX schedule searches. Please wait ${rateCheck.retryAfterSeconds || 15} seconds and try again.`,
    });
  }

  const rawPayload = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const validation = validateKtxSearchInput(rawPayload as Record<string, unknown>);
  if (!validation.valid || !validation.sanitized || !validation.origin || !validation.destination) {
    return res.status(400).json({
      ok: false,
      error: validation.error || 'Invalid KTX search parameters.',
    });
  }

  try {
    const result = await searchKtxSchedules(
      validation.sanitized,
      validation.origin,
      validation.destination
    );
    return res.json(result);
  } catch (err) {
    console.error('KTX schedule search error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Unable to process KTX timetable lookup right now. Please try again shortly.',
    });
  }
};

app.get('/api/transport/ktx/search', handleKtxSearchRequest);
app.post('/api/transport/ktx/search', handleKtxSearchRequest);

// 4. Express & Intercity Bus Terminal Directory & Search
app.get('/api/transport/bus/terminals', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const mode = String(req.query.busType || 'all').trim().toLowerCase();
  const allTerminals = getAllBusTerminals().filter((t) => {
    if (mode === 'express') return t.busModes === 'express' || t.busModes === 'both';
    if (mode === 'intercity') return t.busModes === 'intercity' || t.busModes === 'both';
    return true;
  });
  const filtered = q
    ? allTerminals.filter(
        (t) =>
          t.nameEn.toLowerCase().includes(q) ||
          t.nameKo.toLowerCase().includes(q) ||
          t.cityEn.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.aliases.some((a) => a.toLowerCase().includes(q))
      )
    : allTerminals;
  return res.json({
    ok: true,
    terminals: filtered,
  });
});

// 5. Express & Intercity Bus Schedule & Fare Discovery (GET & POST)
const handleBusSearchRequest = async (req: express.Request, res: express.Response) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'local';

  const rateCheck = checkTransportRateLimit(`bus:${clientIp}`);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      ok: false,
      error: `Too many bus schedule searches. Please wait ${rateCheck.retryAfterSeconds || 15} seconds and try again.`,
    });
  }

  const rawPayload = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const validation = validateBusSearchInput(rawPayload as Record<string, unknown>);
  if (!validation.valid || !validation.sanitized || !validation.origin || !validation.destination) {
    return res.status(400).json({
      ok: false,
      error: validation.error || 'Invalid bus search parameters.',
    });
  }

  try {
    const result = await searchBusSchedules(
      validation.sanitized,
      validation.origin,
      validation.destination
    );
    return res.json(result);
  } catch (err) {
    console.error('Bus schedule search error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Unable to process bus timetable lookup right now. Please try again shortly.',
    });
  }
};

app.get('/api/transport/bus/search', handleBusSearchRequest);
app.post('/api/transport/bus/search', handleBusSearchRequest);

// 6. Admin Transport Hub Overview, Configuration, Server-Side TAGO Key & Live Health Test
app.get('/api/admin/transport/overview', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  return res.json({
    ok: true,
    config: getTransportHubConfig(),
    tagoProvider: getTagoProviderPublicStatus(),
    analytics: getTransportAnalytics(),
    stationsCount: getAllKtxStations().length,
    terminalsCount: getAllBusTerminals().length,
  });
});

app.put('/api/admin/transport/config', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const updated = updateTransportHubConfig(req.body || {}, admin.email || admin.name || 'admin');
  return res.json({
    ok: true,
    config: updated,
    publicHub: getPublicTransportHubPayload(),
  });
});

app.put('/api/admin/transport/providers/tago', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const clear = req.body?.clearStoredCredentials === true;
  const serviceKey = typeof req.body?.serviceKey === 'string' ? req.body.serviceKey.trim() : '';

  if (!clear && !serviceKey) {
    return res.status(400).json({
      ok: false,
      error: 'Provide a valid DATA_GO_KR_SERVICE_KEY or set clearStoredCredentials: true.',
    });
  }

  saveTagoServiceKeyToServerVault(clear ? null : serviceKey, admin.email || admin.name || 'admin');
  return res.json({
    ok: true,
    tagoProvider: getTagoProviderPublicStatus(),
  });
});

app.post('/api/admin/transport/providers/tago/test', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const result = await testTagoProviderConnection();
  return res.json({
    ok: true,
    result,
    tagoProvider: getTagoProviderPublicStatus(),
  });
});

// 7. Unified Transport API Management System (Flight / KTX / Bus Dynamic Registry, Encrypted Vault, Health & Immutable Audit)
app.get('/api/admin/transport/providers', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const rawType = String(req.query?.type || '').toLowerCase();
  const filterType: TransportCategory | undefined =
    rawType === 'flight' || rawType === 'ktx' || rawType === 'bus' ? rawType : undefined;

  return res.json({
    ok: true,
    providers: listAdminTransportProviders(filterType),
    publicHub: getPublicTransportHubPayload(),
  });
});

app.post('/api/admin/transport/providers', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const result = createTransportApiProvider(req.body || {}, {
    uid: admin.uid || 'admin',
    email: admin.email || 'admin@everykr.com',
    name: admin.name || 'Administrator',
  });
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.status(201).json({
    ok: true,
    provider: result.provider,
    auditEntry: result.auditEntry,
    providers: listAdminTransportProviders(),
    publicHub: getPublicTransportHubPayload(),
  });
});

app.put('/api/admin/transport/providers/:providerId', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const providerId = String(req.params.providerId || '').trim();
  const result = updateTransportApiProvider(providerId, req.body || {}, {
    uid: admin.uid || 'admin',
    email: admin.email || 'admin@everykr.com',
    name: admin.name || 'Administrator',
  });
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({
    ok: true,
    provider: result.provider,
    auditEntry: result.auditEntry,
    providers: listAdminTransportProviders(),
    publicHub: getPublicTransportHubPayload(),
  });
});

app.delete('/api/admin/transport/providers/:providerId', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const providerId = String(req.params.providerId || '').trim();
  const result = deleteTransportApiProvider(providerId, {
    uid: admin.uid || 'admin',
    email: admin.email || 'admin@everykr.com',
    name: admin.name || 'Administrator',
  });
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({
    ok: true,
    auditEntry: result.auditEntry,
    providers: listAdminTransportProviders(),
    publicHub: getPublicTransportHubPayload(),
  });
});

app.post('/api/admin/transport/providers/:providerId/test', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const providerId = String(req.params.providerId || '').trim();
  const result = await testTransportApiProviderConnection(providerId, {
    uid: admin.uid || 'admin',
    email: admin.email || 'admin@everykr.com',
    name: admin.name || 'Administrator',
  });
  return res.status(result.ok ? 200 : 400).json({
    ...result,
    health: getTransportHealthDashboardPayload(),
  });
});

app.get('/api/admin/transport/health', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  return res.json({
    ok: true,
    ...getTransportHealthDashboardPayload(),
  });
});

app.get('/api/admin/transport/logs', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const rawType = String(req.query?.type || '').toLowerCase();
  const transportType: TransportCategory | undefined =
    rawType === 'flight' || rawType === 'ktx' || rawType === 'bus' ? rawType : undefined;
  const providerId = typeof req.query?.providerId === 'string' && req.query.providerId.trim()
    ? req.query.providerId.trim()
    : undefined;
  const limit = Math.max(1, Math.min(250, Number(req.query?.limit || 100) || 100));

  return res.json({
    ok: true,
    logs: getTransportApiLogs({ transportType, providerId, limit }),
  });
});

app.get('/api/admin/transport/audit-logs', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const limit = Math.max(1, Math.min(300, Number(req.query?.limit || 100) || 100));
  return res.json({
    ok: true,
    auditLogs: getTransportApiAuditLogs(limit),
  });
});

// ============================================================================
// INTERNAL EMPLOYEE & ADMIN PORTAL API ENDPOINTS (https://internal.everykr.com)
// ============================================================================

// 1. Internal Employee Registration (Sets approvalStatus="pending", isActive=false, assignedRole=null)
app.post('/api/internal/auth/register', async (req, res) => {
  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`internal_reg:${clientIp}`, 15, 60_000);
  if (!rate.allowed) {
    return res.status(429).json({
      ok: false,
      message: 'Too many registration requests. Please wait a moment and try again.'
    });
  }

  const body = req.body || {};
  const result = registerInternalEmployeeServer({
    fullName: String(body.fullName || ''),
    email: String(body.email || ''),
    phoneNumber: String(body.phoneNumber || ''),
    whatsappNumber: String(body.whatsappNumber || ''),
    country: String(body.country || ''),
    department: String(body.department || ''),
    requestedPosition: body.requestedPosition || 'Employee',
    employeeId: body.employeeId ? String(body.employeeId) : undefined,
    password: String(body.password || ''),
    additionalInfo: body.additionalInfo ? String(body.additionalInfo) : undefined,
    photoURL: body.photoURL ? String(body.photoURL) : undefined,
    uid: body.uid ? String(body.uid) : undefined
  });

  if (result.ok && result.requestRecord) {
    const notifId = `anotif_ireq_${result.requestRecord.id}`;
    serverAdminNotificationsStore.set(notifId, {
      id: notifId,
      type: 'staff_alert',
      title: `New Internal Employee Access Request: ${result.requestRecord.fullName}`,
      message: `${result.requestRecord.fullName} (${result.requestRecord.email}) requested ${result.requestRecord.requestedPosition} in ${result.requestRecord.department}. Pending administrator review.`,
      targetId: result.requestRecord.id,
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  return res.status(result.httpStatus).json(result);
});

// 2. Internal Employee & Admin Login (Strictly blocks Students with HTTP 403)
app.post('/api/internal/auth/login', async (req, res) => {
  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`internal_login:${clientIp}`, 25, 60_000);
  if (!rate.allowed) {
    return res.status(429).json({
      ok: false,
      status: 'rate_limited',
      message: 'Too many sign-in attempts. Please wait a moment and try again.'
    });
  }

  const { email, password, firebaseIdToken } = req.body || {};
  let verifiedEmail = String(email || '').trim().toLowerCase();
  let verifiedUid = '';
  let verifiedByFirebase = false;

  if (firebaseIdToken && typeof firebaseIdToken === 'string') {
    const fbCheck = await verifyFirebaseIdTokenServer(firebaseIdToken);
    if (fbCheck.valid && fbCheck.email) {
      verifiedEmail = fbCheck.email.toLowerCase();
      verifiedUid = fbCheck.uid || '';
      verifiedByFirebase = true;
    }
  }

  const result = authenticateInternalPortalServer({
    email: verifiedEmail,
    password: password !== undefined ? String(password) : undefined,
    uid: verifiedUid || undefined,
    verifiedByFirebaseToken: verifiedByFirebase
  });

  return res.status(result.httpStatus).json(result);
});

// 3. Verify Active Internal Portal Session
app.get('/api/internal/auth/session', async (req, res) => {
  const rawAuthHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const bearerToken = rawAuthHeader.startsWith('Bearer ') ? rawAuthHeader.slice(7).trim() : '';
  const headerToken =
    typeof req.headers['x-internal-session-token'] === 'string'
      ? req.headers['x-internal-session-token'].trim()
      : typeof req.headers['x-session-token'] === 'string'
      ? req.headers['x-session-token'].trim()
      : '';
  const sessionToken = bearerToken || headerToken;

  if (sessionToken && isSessionTokenRevoked(sessionToken)) {
    return res.status(401).json({
      ok: false,
      status: 'revoked',
      message: 'Session has been signed out.'
    });
  }

  const emailParam = String(req.query.email || req.headers['x-user-email'] || '')
    .trim()
    .toLowerCase();

  const check = verifyInternalPortalSessionServer({
    sessionToken: sessionToken || undefined,
    email: emailParam || undefined
  });

  return res.status(check.httpStatus).json(check);
});

// 4. Internal Portal Logout
app.post('/api/internal/auth/logout', (req, res) => {
  const rawAuthHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const bearerToken = rawAuthHeader.startsWith('Bearer ') ? rawAuthHeader.slice(7).trim() : '';
  const bodyToken =
    typeof req.body?.sessionToken === 'string' ? req.body.sessionToken.trim() : '';

  if (bearerToken) revokeSessionToken(bearerToken);
  if (bodyToken) revokeSessionToken(bodyToken);

  return res.json({ ok: true, signedOut: true });
});

// 5. Admin List Internal Access Requests
app.get('/api/admin/internal-requests', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const requests = listInternalAccessRequestsServer();
  return res.json({
    ok: true,
    requests
  });
});

// 6. Admin Review / Approve / Reject / Request Info / Deactivate Internal Employee
app.post('/api/admin/internal-requests/:id/decision', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const requestId = String(req.params.id || '').trim();
  const body = req.body || {};
  const decision = body.decision as
    | 'approve'
    | 'reject'
    | 'info_requested'
    | 'deactivate'
    | 'reactivate';

  if (
    !['approve', 'reject', 'info_requested', 'deactivate', 'reactivate'].includes(decision)
  ) {
    return res.status(400).json({
      ok: false,
      message: 'Invalid decision action.'
    });
  }

  const outcome = await reviewInternalAccessRequestServer({
    requestId,
    decision,
    assignedDepartment: body.assignedDepartment,
    assignedRole: body.assignedRole,
    employeeId: body.employeeId,
    permissions: Array.isArray(body.permissions) ? body.permissions : undefined,
    rejectionReason: body.rejectionReason,
    infoRequestMessage: body.infoRequestMessage,
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });

  if (outcome.ok && outcome.staffMember) {
    serverStaffMembersStore.set(outcome.staffMember.id, outcome.staffMember);
  }

  return res.status(outcome.httpStatus).json(outcome);
});

// ============================================================================
// GLOBAL TRASH / RECYCLE BIN API ENDPOINTS (ADMIN ONLY)
// ============================================================================

app.get('/api/admin/trash', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const overview = listGlobalTrashServer();
  return res.json({
    ok: true,
    ...overview
  });
});

app.post('/api/admin/trash/move', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const body = req.body || {};
  const result = moveToGlobalTrashServer({
    recordType: body.recordType || 'cms_content',
    originalCollection: String(body.originalCollection || 'records'),
    originalDocumentId: String(body.originalDocumentId || `doc_${Date.now()}`),
    title: String(body.title || 'Deleted Record'),
    subtitle: body.subtitle ? String(body.subtitle) : undefined,
    originalData: body.originalData || {},
    storageFiles: Array.isArray(body.storageFiles) ? body.storageFiles : [],
    deletionReason: body.deletionReason ? String(body.deletionReason) : undefined,
    deletedByUid: admin.uid,
    deletedByName: admin.name,
    deletedByEmail: admin.email
  });
  return res.status(result.ok ? 200 : 400).json(result);
});

app.post('/api/admin/trash/restore', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const trashId = String(req.body?.trashId || '').trim();
  const result = restoreFromGlobalTrashServer({
    trashId,
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });
  return res.status(result.ok ? 200 : 404).json(result);
});

app.delete('/api/admin/trash/:id', async (req, res) => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;
  const trashId = String(req.params.id || '').trim();
  const confirmationText = String(
    req.body?.confirmationText || req.query.confirmationText || ''
  ).trim();
  const result = permanentlyDeleteFromGlobalTrashServer({
    trashId,
    confirmationText,
    adminUid: admin.uid,
    adminName: admin.name,
    adminEmail: admin.email
  });
  return res.status(result.ok ? 200 : 400).json(result);
});

// Safe, non-secret build & deployment verification endpoint (used to verify everykr.com vs Default URL parity)
app.get('/api/build-info', (_req, res) => {
  const distIndexPath = path.resolve(__dirname, 'dist', 'index.html');
  let buildTimestamp: string | null = null;
  let indexHtmlBytes: number | null = null;
  let jsBundles: string[] = [];
  let cssBundles: string[] = [];

  try {
    if (fs.existsSync(distIndexPath)) {
      const stat = fs.statSync(distIndexPath);
      const html = fs.readFileSync(distIndexPath, 'utf-8');
      buildTimestamp = stat.mtime.toISOString();
      indexHtmlBytes = stat.size;
      jsBundles = html.match(/\/assets\/[^"']+\.js/g) || [];
      cssBundles = html.match(/\/assets\/[^"']+\.css/g) || [];
    }
  } catch {
    // non-fatal
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json({
    ok: true,
    service: process.env.K_SERVICE || 'everykr-local',
    revision: process.env.K_REVISION || 'local-dev',
    nodeEnv: process.env.NODE_ENV || 'development',
    buildTimestamp,
    indexHtmlBytes,
    jsBundles,
    cssBundles,
  });
});

// EVERYKR "Apply Now" Smart Application System API (AI passport/document extraction + status email notifications)
app.use('/api/smart-applications', createSmartApplicationRouter());
// EVERYKR Enterprise RBAC API (server-side role assignment, revocation, audit history & explicit bootstrap)
app.use('/api/enterprise/rbac', createEnterpriseRbacRouter());

// Ensure unmatched /api/* requests ALWAYS return structured JSON 404 in both development and production (never Vite/SPA HTML)
app.all('/api/*', (req, res) => {
  const requestId = `api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Request-Id', requestId);
  const message = `API endpoint not found (${req.method} ${req.path}).`;
  res.status(404).json({
    success: false,
    error: {
      code: 'MODEL_NOT_FOUND',
      message,
      retryable: false,
    },
    requestId,
    ok: false,
    errorCode: 'endpoint_or_model_not_found',
    retryable: false,
    message,
  });
});

// Express JSON error-handling middleware for /api/* (prevents Express from returning HTML on 400 malformed JSON, 413 payload too large, or 500 errors)
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  const requestId = `api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Request-Id', requestId);
  const status = Number(err?.status || err?.statusCode || 500);
  if (err?.type === 'entity.too.large' || status === 413) {
    const message =
      'The uploaded document payload is too large for analysis. Please upload a smaller image or PDF.';
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message,
        retryable: false,
      },
      requestId,
      ok: false,
      errorCode: 'payload_too_large',
      retryable: false,
      message,
    });
  }
  if (
    status === 400 ||
    err?.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && 'body' in err)
  ) {
    const message = 'The request payload could not be parsed as valid JSON.';
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_IMAGE',
        message,
        retryable: false,
      },
      requestId,
      ok: false,
      errorCode: 'invalid_image',
      retryable: false,
      message,
    });
  }
  console.error(
    JSON.stringify({
      event: 'api_unhandled_error',
      requestId,
      method: req.method,
      path: req.path,
      httpStatus: status >= 400 && status < 600 ? status : 500,
      errorType: err?.name || 'Error',
    })
  );
  const message = 'An unexpected server error occurred while processing your request. Please retry.';
  return res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      retryable: true,
    },
    requestId,
    ok: false,
    errorCode: 'internal_error',
    retryable: true,
    message,
  });
});

// Mount Vite middleware in development, or serve static dist in production
async function startServer() {
  // Serve uploaded static assets in both development and production, and never fall through to SPA HTML on 404
  const publicUploadsPath = path.resolve(__dirname, 'public', 'uploads');
  fs.mkdirSync(publicUploadsPath, { recursive: true });
  app.use(
    '/uploads',
    express.static(publicUploadsPath, {
      maxAge: '365d',
      immutable: true,
      index: false,
    })
  );
  app.use('/uploads', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({ ok: false, error: 'Uploaded asset not found.' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');

    // Cache hashed Vite assets immutable for 1 year, and return 404 (never index.html) if an old chunk is missing
    app.use(
      '/assets',
      express.static(path.resolve(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
        index: false,
      })
    );
    app.use('/assets', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.status(404).type('text/plain').send('Asset not found');
    });

    // Serve official branding assets with short revalidating cache so logo updates propagate quickly
    app.use(
      '/brand',
      express.static(path.resolve(distPath, 'brand'), {
        maxAge: '5m',
        index: false,
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
        },
      })
    );
    app.use('/brand', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.status(404).type('text/plain').send('Brand asset not found');
    });

    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html') || filePath.endsWith('manifest.json')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          } else if (
            filePath.endsWith('everykr-logo.png') ||
            filePath.endsWith('everykr-icon.png') ||
            filePath.endsWith('favicon.png')
          ) {
            res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
          }
        }
      })
    );

    // SPA fallback for all client-side routes (/korean-academy, /learn-hangul, etc.)
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`EveryKR server running at http://0.0.0.0:${port}`);
  });
}

startServer();
