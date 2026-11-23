/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side Document Processing Tools:
 * - PDF page-1 rendering to PNG/JPEG data URL via pdfjs-dist (also detects password-protected PDFs)
 * - Image compression via HTMLCanvasElement
 * - Friendly document quality checks (resolution, blur variance, passport photo light background)
 * - ZIP extraction via jszip (filtering __MACOSX & .DS_Store)
 * - Admin ZIP export builder ({Surname}_{GivenNames}_{University}_{Intake}.zip)
 */

import JSZip from 'jszip';

export const MAX_APPLICATION_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export const ACCEPTED_APPLICATION_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.heif',
  '.zip',
];

export const ACCEPTED_APPLICATION_MIME_PREFIXES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
];

export interface DocumentQualityCheckResult {
  warnings: string[];
  width?: number;
  height?: number;
  isPasswordProtectedPdf?: boolean;
}

export interface ExtractedZipFile {
  id: string;
  fileName: string;
  file: File;
  mimeType: string;
  size: number;
}

let pdfjsConfigured = false;

async function getPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsConfigured) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    } catch {
      // Fallback for bundlers that resolve worker differently
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
    pdfjsConfigured = true;
  }
  return pdfjsLib;
}

export function inferMimeTypeFromFileName(fileName: string, fallbackType?: string): string {
  const normalizedFallback = String(fallbackType || '').trim().toLowerCase();
  if (normalizedFallback === 'image/jpg') return 'image/jpeg';
  if (
    normalizedFallback === 'application/x-zip-compressed' ||
    normalizedFallback === 'application/x-zip'
  ) {
    return 'application/zip';
  }
  if (normalizedFallback && normalizedFallback !== 'application/octet-stream') {
    return normalizedFallback;
  }
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  if (lower.endsWith('.zip')) return 'application/zip';
  return normalizedFallback || 'application/octet-stream';
}

export type DetectedFileSignatureKind = 'jpeg' | 'png' | 'webp' | 'heic' | 'pdf' | 'zip';

/**
 * Ensures any File selected via Android camera capture, Android Documents provider, or desktop picker
 * has a canonical Firebase Storage MIME type and a matching lowercase extension accepted by `storage.rules`.
 */
export function normalizeApplicationUploadFile(
  file: File,
  detectedKind?: DetectedFileSignatureKind
): File {
  const rawName = String(file.name || '').trim() || `document_${Date.now()}`;
  const lowerName = rawName.toLowerCase();
  let canonicalMime = inferMimeTypeFromFileName(rawName, file.type);
  let requiredExt = '';

  if (detectedKind === 'pdf' || canonicalMime === 'application/pdf') {
    canonicalMime = 'application/pdf';
    requiredExt = '.pdf';
  } else if (detectedKind === 'jpeg' || canonicalMime === 'image/jpeg') {
    canonicalMime = 'image/jpeg';
    requiredExt = lowerName.endsWith('.jpeg') ? '.jpeg' : '.jpg';
  } else if (detectedKind === 'png' || canonicalMime === 'image/png') {
    canonicalMime = 'image/png';
    requiredExt = '.png';
  } else if (detectedKind === 'heic' || canonicalMime === 'image/heic' || canonicalMime === 'image/heif') {
    const isHeif = lowerName.endsWith('.heif') || canonicalMime === 'image/heif';
    canonicalMime = isHeif ? 'image/heif' : 'image/heic';
    requiredExt = isHeif ? '.heif' : '.heic';
  } else if (detectedKind === 'zip' || canonicalMime === 'application/zip') {
    canonicalMime = 'application/zip';
    requiredExt = '.zip';
  } else if (detectedKind === 'webp' || canonicalMime === 'image/webp') {
    canonicalMime = 'image/jpeg';
    requiredExt = '.jpg';
  }

  let safeBase = rawName
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^_+|_+$/g, '');
  if (!safeBase || safeBase.length < 2) {
    safeBase = `capture_${Date.now()}`;
  }

  const hasValidAllowedExt = ACCEPTED_APPLICATION_EXTENSIONS.some((ext) =>
    safeBase.toLowerCase().endsWith(ext)
  );
  let finalName = safeBase;
  if (requiredExt && !finalName.toLowerCase().endsWith(requiredExt)) {
    const withoutKnownExt = hasValidAllowedExt
      ? finalName.replace(/\.[^.]+$/, '')
      : finalName;
    finalName = `${withoutKnownExt}${requiredExt}`;
  } else if (!hasValidAllowedExt && requiredExt) {
    finalName = `${finalName}${requiredExt}`;
  }

  if (finalName === file.name && file.type === canonicalMime) {
    return file;
  }

  return new File([file], finalName, {
    type: canonicalMime,
    lastModified: file.lastModified || Date.now(),
  });
}

export function isAcceptedApplicationFile(file: File): boolean {
  const lower = String(file.name || '').toLowerCase();
  const hasAllowedExt = ACCEPTED_APPLICATION_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const mime = inferMimeTypeFromFileName(file.name, file.type);
  const hasAllowedMime =
    ACCEPTED_APPLICATION_MIME_PREFIXES.includes(mime) || mime.startsWith('image/');
  return hasAllowedExt || hasAllowedMime;
}

export function isImageFile(file: File): boolean {
  const mime = inferMimeTypeFromFileName(file.name, file.type);
  return mime.startsWith('image/');
}

export function isPdfFile(file: File): boolean {
  const mime = inferMimeTypeFromFileName(file.name, file.type);
  return mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function isZipFile(file: File): boolean {
  const mime = inferMimeTypeFromFileName(file.name, file.type);
  return (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    file.name.toLowerCase().endsWith('.zip')
  );
}

export const MAX_AI_ANALYSIS_IMAGE_DIMENSION = 1440; // Preserves crisp ICAO 9303 MRZ (~28-34px tall) while cutting payload ~90%
export const MAX_PASSPORT_AI_IMAGE_DIMENSION = 1600; // Extra MRZ clarity for passport bio pages
export const MAX_STORAGE_IMAGE_DIMENSION = 1800;
export const MAX_PASSPORT_STORAGE_IMAGE_DIMENSION = 2048;
export const MAX_AI_BASE64_TARGET_CHARS = 1_400_000; // ~1.05 MB decoded JPEG target for fast Gemini upload

export interface PreparedDocumentResult {
  valid: boolean;
  error?: string;
  isPasswordProtectedPdf?: boolean;
  uploadFile: File;
  quality: DocumentQualityCheckResult;
  analysisPayload: {
    base64: string;
    mimeType: string;
    width?: number;
    height?: number;
    approxBytes: number;
  } | null;
  timingsMs: {
    validateMs: number;
    prepareMs: number;
    qualityMs: number;
    totalMs: number;
  };
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error('Operation cancelled by user.');
    err.name = 'AbortError';
    throw err;
  }
}

export function computeFileFingerprint(file: File, context: string = ''): string {
  return `${file.name}|${file.size}|${file.lastModified}|${file.type || ''}|${context}`;
}

/**
 * Reads only the first 16 bytes of a File to validate its binary magic header before
 * wasting CPU on Canvas decoding, PDF rendering, Storage upload, or Gemini API calls.
 */
export async function validateFileSignatureEarly(file: File): Promise<{
  valid: boolean;
  detectedKind?: 'jpeg' | 'png' | 'webp' | 'heic' | 'pdf' | 'zip';
  error?: string;
}> {
  if (!file || file.size === 0) {
    return { valid: false, error: 'This file is empty (0 bytes). Please choose a valid document.' };
  }
  if (file.size > MAX_APPLICATION_FILE_BYTES) {
    return { valid: false, error: `"${file.name}" exceeds the 20 MB maximum file size.` };
  }

  try {
    const headerBuf = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(headerBuf);
    if (bytes.length < 4) {
      return { valid: false, error: `"${file.name}" appears corrupted or incomplete.` };
    }

    // PDF: %PDF-
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { valid: true, detectedKind: 'pdf' };
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { valid: true, detectedKind: 'jpeg' };
    }
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { valid: true, detectedKind: 'png' };
    }
    // ZIP: PK\x03\x04 or PK\x05\x06
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
      return { valid: true, detectedKind: 'zip' };
    }
    // WEBP: RIFF....WEBP
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return { valid: true, detectedKind: 'webp' };
    }
    // HEIC / HEIF (ISO BMFF): ....ftyp
    if (
      bytes.length >= 8 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      return { valid: true, detectedKind: 'heic' };
    }

    if (!isAcceptedApplicationFile(file)) {
      return {
        valid: false,
        error: `"${file.name}" is not a supported format. Accepted: PDF, JPG, PNG, HEIC, or ZIP.`,
      };
    }

    return {
      valid: false,
      error: `"${file.name}" does not appear to be a valid PDF, image, or ZIP file. Please upload a genuine passport photo or PDF.`,
    };
  } catch {
    return {
      valid: false,
      error: `Could not read "${file.name}". Please check the file and try again.`,
    };
  }
}

function withAsyncTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
  signal?: AbortSignal
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      const abortErr = new Error('Operation cancelled by user.');
      abortErr.name = 'AbortError';
      reject(abortErr);
      return;
    }

    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const abortErr = new Error('Operation cancelled by user.');
      abortErr.name = 'AbortError';
      reject(abortErr);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);

    signal?.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (val) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(val);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
}

async function renderPdfPage1ToCanvas(
  file: File,
  maxDim: number = MAX_AI_ANALYSIS_IMAGE_DIMENSION,
  signal?: AbortSignal
): Promise<{
  canvas: HTMLCanvasElement | null;
  isPasswordProtected: boolean;
  error?: string;
}> {
  throwIfAborted(signal);
  try {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    throwIfAborted(signal);

    let pdf: any = null;
    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      pdf = await withAsyncTimeout(loadingTask.promise, 8000, 'PDF loading', signal);
    } catch (workerErr: any) {
      const errName = String(workerErr?.name || '');
      if (errName === 'AbortError' || errName === 'PasswordException' || /password|encrypted/i.test(String(workerErr?.message || ''))) {
        throw workerErr;
      }
      // Fallback: disable external worker if bundled worker failed/stalled in iframe
      const fallbackTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        disableWorker: true,
      } as any);
      pdf = await withAsyncTimeout(fallbackTask.promise, 10000, 'PDF fallback loading', signal);
    }

    const page = await withAsyncTimeout<any>(pdf.getPage(1), 5000, 'PDF page 1 read', signal);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderScale = Math.min(2.2, maxDim / Math.max(1, baseViewport.width, baseViewport.height));
    const scaledViewport = page.getViewport({ scale: Math.max(0.5, renderScale) });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(scaledViewport.width));
    canvas.height = Math.max(1, Math.round(scaledViewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { canvas: null, isPasswordProtected: false, error: 'Canvas context unavailable.' };
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await withAsyncTimeout(
      page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
        canvas,
      } as any).promise,
      10000,
      'PDF page render',
      signal
    );

    try {
      await pdf.destroy?.();
    } catch {
      // ignore cleanup
    }

    return { canvas, isPasswordProtected: false };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    const name = String(err?.name || '');
    const msg = String(err?.message || '');
    const isPasswordProtected =
      name === 'PasswordException' || /password|encrypted/i.test(msg);

    return {
      canvas: null,
      isPasswordProtected,
      error: isPasswordProtected
        ? 'This PDF appears to be password-protected. Please upload an unlocked copy.'
        : 'Could not render PDF page 1 for preview or auto-fill.',
    };
  }
}

/**
 * Renders page 1 of a PDF file to a JPEG data URL in the browser.
 * Detects password-protected PDFs and enforces strict timeouts so PDF rendering can never hang.
 */
export async function renderPdfPage1ToImageDataUrl(
  file: File,
  scale: number = 1.8
): Promise<{
  dataUrl: string | null;
  base64: string | null;
  mimeType: string;
  isPasswordProtected: boolean;
  error?: string;
}> {
  const maxDim = Math.round(Math.min(1800, Math.max(900, scale * 850)));
  const rendered = await renderPdfPage1ToCanvas(file, maxDim);
  if (!rendered.canvas) {
    return {
      dataUrl: null,
      base64: null,
      mimeType: 'image/jpeg',
      isPasswordProtected: rendered.isPasswordProtected,
      error: rendered.error,
    };
  }
  const dataUrl = rendered.canvas.toDataURL('image/jpeg', 0.85);
  return {
    dataUrl,
    base64: dataUrl.split(',')[1] || '',
    mimeType: 'image/jpeg',
    isPasswordProtected: false,
  };
}

/**
 * Loads an image File into an HTMLImageElement with a hard timeout and abort support.
 */
function loadImageElement(
  file: File,
  timeoutMs: number = 10_000,
  signal?: AbortSignal
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const abortErr = new Error('Operation cancelled by user.');
      abortErr.name = 'AbortError';
      reject(abortErr);
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const abortErr = new Error('Operation cancelled by user.');
      abortErr.name = 'AbortError';
      reject(abortErr);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Image decoding timed out. Please try a standard JPG or PNG photo.'));
    }, timeoutMs);

    signal?.addEventListener('abort', onAbort, { once: true });

    img.onload = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Could not decode image file. It may be corrupted or unsupported.'));
    };
    img.src = url;
  });
}

/**
 * Runs fast blur (Laplacian variance), resolution, and passport-photo background checks
 * directly on an already-decoded HTMLImageElement or HTMLCanvasElement (zero extra decode!).
 */
function analyzeDecodedSourceQuality(
  source: CanvasImageSource,
  width: number,
  height: number,
  docType: string
): DocumentQualityCheckResult {
  const warnings: string[] = [];

  if (width < 320 || height < 320) {
    warnings.push(
      `Low resolution (${width}×${height}px). Consider uploading a clearer, higher-resolution scan.`
    );
  }

  try {
    const sampleSize = 180;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(source, 0, 0, sampleSize, sampleSize);
      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

      const gray = new Float32Array(sampleSize * sampleSize);
      for (let i = 0; i < gray.length; i += 1) {
        const idx = i * 4;
        gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      }

      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let y = 1; y < sampleSize - 1; y += 1) {
        for (let x = 1; x < sampleSize - 1; x += 1) {
          const i = y * sampleSize + x;
          const lap =
            gray[i - sampleSize] +
            gray[i + sampleSize] +
            gray[i - 1] +
            gray[i + 1] -
            4 * gray[i];
          sum += lap;
          sumSq += lap * lap;
          count += 1;
        }
      }
      const mean = sum / Math.max(1, count);
      const variance = sumSq / Math.max(1, count) - mean * mean;
      if (variance < 45) {
        warnings.push(
          'This image looks slightly blurry or soft. Please verify all text and numbers are clearly legible.'
        );
      }

      if (docType === 'photo') {
        let borderLumaSum = 0;
        let borderLumaSq = 0;
        let borderCount = 0;
        const margin = 14;
        for (let y = 0; y < sampleSize; y += 1) {
          for (let x = 0; x < sampleSize; x += 1) {
            const isTopOrSides = y < margin || x < margin || x >= sampleSize - margin;
            if (isTopOrSides && y < sampleSize * 0.72) {
              const l = gray[y * sampleSize + x];
              borderLumaSum += l;
              borderLumaSq += l * l;
              borderCount += 1;
            }
          }
        }
        if (borderCount > 0) {
          const avgBorderLuma = borderLumaSum / borderCount;
          const borderVariance = borderLumaSq / borderCount - avgBorderLuma * avgBorderLuma;
          if (avgBorderLuma < 175 || borderVariance > 1800) {
            warnings.push(
              'Passport photo background does not appear plain white/light. Korean universities usually require a plain white or light background.'
            );
          }
        }
      }
    }
  } catch {
    // non-fatal quality check failure
  }

  return { warnings, width, height };
}

function encodeCanvasToMrzSafeJpegBase64(canvas: HTMLCanvasElement): string {
  let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  let base64 = dataUrl.split(',')[1] || '';
  // If still large (very dense full-page scan), step down quality once while keeping resolution crisp for MRZ
  if (base64.length > MAX_AI_BASE64_TARGET_CHARS) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    base64 = dataUrl.split(',')[1] || '';
  }
  return base64;
}

function renderSourceToCanvas(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  maxDimension: number
): HTMLCanvasElement {
  const largest = Math.max(1, srcWidth, srcHeight);
  const scale = largest > maxDimension ? maxDimension / largest : 1;
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
  }
  return canvas;
}

/**
 * Single-pass document preparation pipeline:
 * 1. Validates binary file magic signature in < 2ms (rejects unsupported/corrupted files early).
 * 2. Decodes image or renders PDF page 1 EXACTLY ONCE (eliminates 3x image decodes & 2x PDF renders).
 * 3. Runs quality/blur/resolution checks on the decoded frame.
 * 4. Produces an upload-ready file (compressed only once if oversized) AND an MRZ-preserving
 *    AI preview JPEG (max 1440px) ONLY when `includeAnalysisPayload` is true.
 */
export async function prepareDocumentForUploadAndAnalysis(
  file: File,
  docType: string,
  options: {
    includeAnalysisPayload: boolean;
    signal?: AbortSignal;
    onStage?: (stage: 'preparing' | 'checking_quality') => void;
  }
): Promise<PreparedDocumentResult> {
  const totalStart = performance.now();
  options.onStage?.('preparing');
  throwIfAborted(options.signal);

  const valStart = performance.now();
  const sigCheck = await validateFileSignatureEarly(file);
  const validateMs = Math.round(performance.now() - valStart);

  if (!sigCheck.valid) {
    return {
      valid: false,
      error: sigCheck.error || 'Unsupported or invalid file.',
      uploadFile: file,
      quality: { warnings: [] },
      analysisPayload: null,
      timingsMs: {
        validateMs,
        prepareMs: 0,
        qualityMs: 0,
        totalMs: Math.round(performance.now() - totalStart),
      },
    };
  }

  throwIfAborted(options.signal);
  const prepStart = performance.now();

  // Path A: PDF — render page 1 ONCE for both password/quality check and AI preview
  if (sigCheck.detectedKind === 'pdf' || isPdfFile(file)) {
    const normalizedPdfFile = normalizeApplicationUploadFile(file, 'pdf');
    const targetAiDim =
      docType === 'passport' ? MAX_PASSPORT_AI_IMAGE_DIMENSION : MAX_AI_ANALYSIS_IMAGE_DIMENSION;
    const rendered = await renderPdfPage1ToCanvas(
      normalizedPdfFile,
      targetAiDim,
      options.signal
    );

    if (rendered.isPasswordProtected) {
      return {
        valid: true,
        isPasswordProtectedPdf: true,
        uploadFile: normalizedPdfFile,
        quality: {
          warnings: [
            'This PDF appears to be password-protected. Admissions offices require unlocked PDFs.',
          ],
          isPasswordProtectedPdf: true,
        },
        analysisPayload: null,
        timingsMs: {
          validateMs,
          prepareMs: Math.round(performance.now() - prepStart),
          qualityMs: 0,
          totalMs: Math.round(performance.now() - totalStart),
        },
      };
    }

    if (!rendered.canvas) {
      return {
        valid: true,
        error: rendered.error,
        uploadFile: normalizedPdfFile,
        quality: { warnings: [], isPasswordProtectedPdf: false },
        analysisPayload: null,
        timingsMs: {
          validateMs,
          prepareMs: Math.round(performance.now() - prepStart),
          qualityMs: 0,
          totalMs: Math.round(performance.now() - totalStart),
        },
      };
    }

    options.onStage?.('checking_quality');
    const qStart = performance.now();
    const quality = analyzeDecodedSourceQuality(
      rendered.canvas,
      rendered.canvas.width,
      rendered.canvas.height,
      docType
    );
    quality.isPasswordProtectedPdf = false;
    const qualityMs = Math.round(performance.now() - qStart);

    let analysisPayload: PreparedDocumentResult['analysisPayload'] = null;
    if (options.includeAnalysisPayload) {
      const base64 = encodeCanvasToMrzSafeJpegBase64(rendered.canvas);
      if (base64) {
        analysisPayload = {
          base64,
          mimeType: 'image/jpeg',
          width: rendered.canvas.width,
          height: rendered.canvas.height,
          approxBytes: Math.round((base64.length * 3) / 4),
        };
      }
    }

    // Free temporary PDF canvas buffer on mobile
    rendered.canvas.width = 0;
    rendered.canvas.height = 0;

    return {
      valid: true,
      isPasswordProtectedPdf: false,
      uploadFile: normalizedPdfFile,
      quality,
      analysisPayload,
      timingsMs: {
        validateMs,
        prepareMs: Math.round(performance.now() - prepStart),
        qualityMs,
        totalMs: Math.round(performance.now() - totalStart),
      },
    };
  }

  // Path B: Browser-decodable raster images (JPG / PNG / WEBP) — decode ONCE!
  const mime = inferMimeTypeFromFileName(file.name, file.type);
  if (
    sigCheck.detectedKind === 'jpeg' ||
    sigCheck.detectedKind === 'png' ||
    sigCheck.detectedKind === 'webp' ||
    mime === 'image/jpeg' ||
    mime === 'image/png' ||
    mime === 'image/webp'
  ) {
    let img: HTMLImageElement;
    try {
      img = await loadImageElement(file, 10_000, options.signal);
    } catch (decodeErr: any) {
      if (decodeErr?.name === 'AbortError') throw decodeErr;
      return {
        valid: false,
        error:
          decodeErr?.message ||
          'Could not decode this image. Please upload a valid JPG, PNG, or PDF.',
        uploadFile: normalizeApplicationUploadFile(file, sigCheck.detectedKind),
        quality: { warnings: [] },
        analysisPayload: null,
        timingsMs: {
          validateMs,
          prepareMs: Math.round(performance.now() - prepStart),
          qualityMs: 0,
          totalMs: Math.round(performance.now() - totalStart),
        },
      };
    }

    throwIfAborted(options.signal);
    options.onStage?.('checking_quality');
    const qStart = performance.now();
    const quality = analyzeDecodedSourceQuality(
      img,
      img.naturalWidth,
      img.naturalHeight,
      docType
    );
    const qualityMs = Math.round(performance.now() - qStart);

    // 1. Storage-ready file:
    // - Preserve MRZ clarity on passports (2048px @ 0.90 JPEG quality)
    // - Always convert WebP to JPEG so storage.rules extension & MIME allowlist passes
    // - Always normalize missing mobile camera extensions & empty MIME types
    const isPassportDoc = docType === 'passport';
    const maxStorageDim = isPassportDoc
      ? MAX_PASSPORT_STORAGE_IMAGE_DIMENSION
      : MAX_STORAGE_IMAGE_DIMENSION;
    const storageJpegQuality = isPassportDoc ? 0.9 : 0.85;
    let uploadFile = normalizeApplicationUploadFile(file, sigCheck.detectedKind);
    const largest = Math.max(img.naturalWidth, img.naturalHeight);
    const isWebpSource = sigCheck.detectedKind === 'webp' || mime === 'image/webp';
    const needsStorageCompression =
      isWebpSource ||
      file.size > 1.2 * 1024 * 1024 ||
      largest > maxStorageDim;

    let reusableStorageCanvas: HTMLCanvasElement | null = null;
    if (needsStorageCompression) {
      reusableStorageCanvas = renderSourceToCanvas(
        img,
        img.naturalWidth,
        img.naturalHeight,
        maxStorageDim
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        reusableStorageCanvas!.toBlob(resolve, 'image/jpeg', storageJpegQuality)
      );
      if (blob && (isWebpSource || blob.size < file.size)) {
        const baseName = uploadFile.name.replace(/\.[^.]+$/, '') || `document_${Date.now()}`;
        uploadFile = new File([blob], `${baseName}.jpg`, {
          type: 'image/jpeg',
          lastModified: file.lastModified || Date.now(),
        });
      }
    }

    // 2. MRZ-preserving AI preview JPEG (max 1600px for passport, 1440px for other docs)
    let analysisPayload: PreparedDocumentResult['analysisPayload'] = null;
    if (options.includeAnalysisPayload) {
      const targetAiDim = isPassportDoc
        ? MAX_PASSPORT_AI_IMAGE_DIMENSION
        : MAX_AI_ANALYSIS_IMAGE_DIMENSION;
      const canReuseStorageCanvas =
        reusableStorageCanvas &&
        Math.max(reusableStorageCanvas.width, reusableStorageCanvas.height) <= targetAiDim;
      const aiCanvas = canReuseStorageCanvas
        ? reusableStorageCanvas!
        : renderSourceToCanvas(
            reusableStorageCanvas || img,
            (reusableStorageCanvas || img).width || img.naturalWidth,
            (reusableStorageCanvas || img).height || img.naturalHeight,
            targetAiDim
          );
      const base64 = encodeCanvasToMrzSafeJpegBase64(aiCanvas);
      if (base64) {
        analysisPayload = {
          base64,
          mimeType: 'image/jpeg',
          width: aiCanvas.width,
          height: aiCanvas.height,
          approxBytes: Math.round((base64.length * 3) / 4),
        };
      }
      if (!canReuseStorageCanvas) {
        aiCanvas.width = 0;
        aiCanvas.height = 0;
      }
    }

    if (reusableStorageCanvas) {
      reusableStorageCanvas.width = 0;
      reusableStorageCanvas.height = 0;
    }

    return {
      valid: true,
      uploadFile,
      quality,
      analysisPayload,
      timingsMs: {
        validateMs,
        prepareMs: Math.round(performance.now() - prepStart),
        qualityMs,
        totalMs: Math.round(performance.now() - totalStart),
      },
    };
  }

  // Path C: HEIC / HEIF (browser cannot draw on Canvas reliably; pass directly if <= 4.5 MB)
  const normalizedHeicFile = normalizeApplicationUploadFile(file, sigCheck.detectedKind || 'heic');
  let analysisPayload: PreparedDocumentResult['analysisPayload'] = null;
  if (options.includeAnalysisPayload) {
    if (normalizedHeicFile.size > 4.5 * 1024 * 1024) {
      return {
        valid: true,
        error:
          'HEIC file is larger than 4.5 MB for automatic scanning. File can still be uploaded privately — convert to JPG/PNG for auto-fill.',
        uploadFile: normalizedHeicFile,
        quality: { warnings: [] },
        analysisPayload: null,
        timingsMs: {
          validateMs,
          prepareMs: Math.round(performance.now() - prepStart),
          qualityMs: 0,
          totalMs: Math.round(performance.now() - totalStart),
        },
      };
    }

    const base64 = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        resolve(result.includes(',') ? result.split(',')[1] : result || null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(normalizedHeicFile);
    });

    if (base64) {
      analysisPayload = {
        base64,
        mimeType: normalizedHeicFile.type || 'image/heic',
        approxBytes: normalizedHeicFile.size,
      };
    }
  }

  return {
    valid: true,
    uploadFile: normalizedHeicFile,
    quality: { warnings: [] },
    analysisPayload,
    timingsMs: {
      validateMs,
      prepareMs: Math.round(performance.now() - prepStart),
      qualityMs: 0,
      totalMs: Math.round(performance.now() - totalStart),
    },
  };
}

/**
 * Compresses large JPG/PNG images client-side before uploading to Storage.
 * Returns the original file for PDFs, ZIPs, HEIC, or already-small images.
 */
export async function compressImageIfNeeded(
  file: File,
  maxDimension: number = MAX_STORAGE_IMAGE_DIMENSION,
  targetByteThreshold: number = 1.2 * 1024 * 1024
): Promise<File> {
  const mime = inferMimeTypeFromFileName(file.name, file.type);
  if (mime !== 'image/jpeg' && mime !== 'image/png') {
    return file;
  }
  if (file.size <= targetByteThreshold) {
    return file;
  }

  try {
    const img = await loadImageElement(file);
    const canvas = renderSourceToCanvas(img, img.naturalWidth, img.naturalHeight, maxDimension);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.84)
    );
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

/**
 * Converts a File (Image or PDF page 1) into a base64 image payload for server-side Gemini analysis.
 */
export async function fileToAnalysisImagePayload(file: File): Promise<{
  base64: string | null;
  mimeType: string;
  isPasswordProtectedPdf?: boolean;
  error?: string;
}> {
  const prepared = await prepareDocumentForUploadAndAnalysis(file, 'other', {
    includeAnalysisPayload: true,
  });
  return {
    base64: prepared.analysisPayload?.base64 || null,
    mimeType: prepared.analysisPayload?.mimeType || inferMimeTypeFromFileName(file.name, file.type),
    isPasswordProtectedPdf: prepared.isPasswordProtectedPdf,
    error: prepared.error,
  };
}

/**
 * Performs friendly non-blocking quality checks (backward-compatible wrapper).
 */
export async function checkDocumentQuality(
  file: File,
  docType: string
): Promise<DocumentQualityCheckResult> {
  const prepared = await prepareDocumentForUploadAndAnalysis(file, docType, {
    includeAnalysisPayload: false,
  });
  if (!prepared.valid && prepared.error) {
    return { warnings: [prepared.error] };
  }
  return prepared.quality;
}

export const MAX_ZIP_FILES = 25;
export const MAX_ZIP_TOTAL_DECOMPRESSED_BYTES = 60 * 1024 * 1024; // 60 MB total unpacked cap

/**
 * Rejects ZIP entry paths containing directory traversal (`..`), absolute roots,
 * Windows drive letters, null bytes, or OS metadata noise.
 */
export function isSafeZipEntryPath(rawPath: string): boolean {
  if (!rawPath || typeof rawPath !== 'string') return false;
  if (rawPath.includes('\0')) return false;
  const normalized = rawPath.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return false;
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..' || seg === '.') return false;
    if (seg.startsWith('._')) return false;
  }
  if (
    normalized.includes('__MACOSX/') ||
    normalized.startsWith('__MACOSX') ||
    normalized.endsWith('.DS_Store') ||
    normalized.toLowerCase().endsWith('thumbs.db')
  ) {
    return false;
  }
  return true;
}

/**
 * Unzips a ZIP archive in the browser using jszip with path-traversal protection,
 * max file count (25), total decompressed size cap (60 MB), and deduplication.
 */
export async function extractFilesFromZip(zipFile: File): Promise<ExtractedZipFile[]> {
  if (zipFile.size > MAX_APPLICATION_FILE_BYTES) {
    throw new Error('ZIP file exceeds the 20 MB limit.');
  }

  const zipBuffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);
  const results: ExtractedZipFile[] = [];
  const seenKeys = new Set<string>();
  let totalBytes = 0;

  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir) continue;
    if (results.length >= MAX_ZIP_FILES) break;

    const normalizedPath = entry.name.replace(/\\/g, '/');
    if (!isSafeZipEntryPath(normalizedPath)) continue;

    const rawBaseName = normalizedPath.split('/').pop() || '';
    const baseName = rawBaseName.replace(/[^\w.\-() ]+/g, '_').slice(0, 140);
    if (!baseName) continue;

    const lower = baseName.toLowerCase();
    const isAllowedInner = ['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.heif'].some((ext) =>
      lower.endsWith(ext)
    );
    if (!isAllowedInner) continue;

    const blob = await entry.async('blob');
    if (blob.size === 0 || blob.size > MAX_APPLICATION_FILE_BYTES) continue;

    totalBytes += blob.size;
    if (totalBytes > MAX_ZIP_TOTAL_DECOMPRESSED_BYTES) {
      throw new Error(
        'This ZIP archive expands past the 60 MB safety limit. Please upload fewer or smaller files.'
      );
    }

    // Deduplicate identical files within the archive
    const dedupKey = `${lower}:${blob.size}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    const mimeType = inferMimeTypeFromFileName(baseName, blob.type);
    const extractedFile = new File([blob], baseName, {
      type: mimeType,
      lastModified: Date.now(),
    });

    results.push({
      id: `zip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fileName: baseName,
      file: extractedFile,
      mimeType,
      size: extractedFile.size,
    });
  }

  return results;
}

/**
 * Builds and triggers a browser download of a ZIP archive containing an application's documents.
 * Filename format: {Surname}_{GivenNames}_{University}_{Intake}.zip
 * Prefers authenticated Firebase Storage `blobFetcher` so Storage Rules enforce auth on every download.
 */
export function formatApplicationExportBaseName(params: {
  givenNames: string;
  surname: string;
  universityName: string;
  intake: string;
}): string {
  const clean = (value: string, fallback: string, maxLen = 36) =>
    String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, maxLen) || fallback;

  const given = clean(params.givenNames, '', 28);
  const sur = clean(params.surname, '', 28);
  const studentPart = [given, sur].filter(Boolean).join('_') || 'APPLICANT';
  const uniCompact = clean(
    String(params.universityName || '').replace(/\bUniversity\b/i, '').trim() ||
      params.universityName,
    'UNIVERSITY',
    32
  );
  const intakePart = clean(params.intake, 'INTAKE', 24);
  return `${studentPart}_${uniCompact}_${intakePart}`;
}

export async function buildAndDownloadApplicationZip(params: {
  surname: string;
  givenNames: string;
  universityName: string;
  intake: string;
  files: Array<{
    docType: string;
    category?: string;
    fileName: string;
    blobFetcher?: () => Promise<Blob>;
    fetchUrl?: string;
  }>;
}): Promise<{ downloadedCount: number; failedFiles: string[]; zipName: string }> {
  const sanitizeSegment = (value: string, fallback: string) =>
    String(value || fallback)
      .trim()
      .replace(/[^a-zA-Z0-9-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || fallback;

  const baseName = formatApplicationExportBaseName({
    givenNames: params.givenNames,
    surname: params.surname,
    universityName: params.universityName,
    intake: params.intake,
  });
  const zipName = `${baseName}.zip`;

  const zip = new JSZip();
  let downloadedCount = 0;
  const failedFiles: string[] = [];

  for (const item of params.files) {
    try {
      let blob: Blob | null = null;
      if (item.blobFetcher) {
        blob = await item.blobFetcher();
      } else if (item.fetchUrl) {
        const response = await fetch(item.fetchUrl);
        if (response.ok) {
          blob = await response.blob();
        }
      }
      if (!blob) {
        failedFiles.push(item.fileName);
        continue;
      }
      const safeDocPrefix = sanitizeSegment(item.docType, 'document');
      const safeFileName = item.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
      const folder = item.category ? `${sanitizeSegment(item.category, 'other')}/` : '';
      zip.file(`${folder}${safeDocPrefix}_${safeFileName}`, blob);
      downloadedCount += 1;
    } catch {
      failedFiles.push(item.fileName);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const blobUrl = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

  return { downloadedCount, failedFiles, zipName };
}
