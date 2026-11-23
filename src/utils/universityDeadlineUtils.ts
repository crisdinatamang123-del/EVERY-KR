import type {
  AdmissionIntakeType,
  UniversityAdmissionDeadlineRecord,
  UniversityDeadlineCarouselConfig,
} from '../types';

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // Asia/Seoul UTC+09:00 (no DST)
export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_UNIVERSITY_LOGO_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_SVG_LOGO_BYTES = 1 * 1024 * 1024; // 1 MB cap for SVG files

export const ALLOWED_LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;

export type AllowedLogoMimeType = (typeof ALLOWED_LOGO_MIME_TYPES)[number];

export interface KstDeadlineCountdown {
  daysRemaining: number;
  label: string; // e.g., "D-30", "D-15", "D-5", "D-1", "Closing Today", "Closed"
  urgency: 'closing_today' | 'urgent' | 'approaching' | 'upcoming' | 'closed';
  isExpired: boolean;
  deadlineEndKstMs: number;
}

/**
 * Parses YYYY-MM-DD and returns end-of-day timestamp in Korea Standard Time (23:59:59.999+09:00).
 */
export function getDeadlineEndOfDayKstMs(applicationDeadline: string): number {
  const trimmed = String(applicationDeadline || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return 0;
  }
  const parsed = Date.parse(`${trimmed}T23:59:59.999+09:00`);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Dynamically computes the admission countdown in Korea Standard Time (Asia/Seoul, UTC+09:00):
 * - Same calendar day in KST (diffDays === 0) => "Closing Today"
 * - Future calendar days in KST (diffDays >= 1) => "D-1", "D-5", "D-15", "D-30", etc.
 * - Past end-of-day in KST (diffDays < 0) => "Closed" (isExpired: true)
 */
export function computeKstDeadlineCountdown(
  applicationDeadline: string,
  nowMs: number = Date.now()
): KstDeadlineCountdown {
  const trimmed = String(applicationDeadline || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return {
      daysRemaining: -1,
      label: 'Closed',
      urgency: 'closed',
      isExpired: true,
      deadlineEndKstMs: 0,
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const deadlineEndKstMs = getDeadlineEndOfDayKstMs(trimmed);

  if (!deadlineEndKstMs || nowMs > deadlineEndKstMs) {
    const targetDayIdx = Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
    const todayKstDayIdx = Math.floor((nowMs + KST_OFFSET_MS) / DAY_MS);
    return {
      daysRemaining: targetDayIdx - todayKstDayIdx,
      label: 'Closed',
      urgency: 'closed',
      isExpired: true,
      deadlineEndKstMs,
    };
  }

  const targetKstDayIndex = Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
  const currentKstDayIndex = Math.floor((nowMs + KST_OFFSET_MS) / DAY_MS);
  const diffDays = targetKstDayIndex - currentKstDayIndex;

  if (diffDays < 0) {
    return {
      daysRemaining: diffDays,
      label: 'Closed',
      urgency: 'closed',
      isExpired: true,
      deadlineEndKstMs,
    };
  }

  if (diffDays === 0) {
    return {
      daysRemaining: 0,
      label: 'Closing Today',
      urgency: 'closing_today',
      isExpired: false,
      deadlineEndKstMs,
    };
  }

  let urgency: KstDeadlineCountdown['urgency'] = 'upcoming';
  if (diffDays <= 5) {
    urgency = 'urgent';
  } else if (diffDays <= 15) {
    urgency = 'approaching';
  }

  return {
    daysRemaining: diffDays,
    label: `D-${diffDays}`,
    urgency,
    isExpired: false,
    deadlineEndKstMs,
  };
}

/**
 * Formats YYYY-MM-DD in Asia/Seoul timezone without browser local timezone shift.
 */
export function formatDeadlineDateKst(applicationDeadline: string): string {
  const trimmed = String(applicationDeadline || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed || '—';
  }
  const noonKst = new Date(`${trimmed}T12:00:00+09:00`);
  if (Number.isNaN(noonKst.getTime())) {
    return trimmed;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(noonKst);
}

/**
 * Returns today's YYYY-MM-DD string in Korea Standard Time (Asia/Seoul).
 */
export function getTodayDateStringKst(nowMs: number = Date.now()): string {
  const kstDate = new Date(nowMs + KST_OFFSET_MS);
  const y = kstDate.getUTCFullYear();
  const m = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kstDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function slugifyUniversityStorageSegment(value: string): string {
  return (
    String(value || 'university')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'university'
  );
}

/**
 * Resolves a stored university logo reference into a valid browser-renderable image URL.
 * Guarantees that raw Firebase Storage object paths (`university-deadlines/...`) or unsafe schemes
 * are NEVER passed directly into `<img src>`.
 */
export function resolveRenderableUniversityLogoUrl(
  logoDownloadUrl?: string | null,
  logoStoragePath?: string | null
): string {
  const rawUrl = String(logoDownloadUrl || '').trim();
  const rawPath = String(logoStoragePath || '').trim();

  if (rawUrl) {
    if (/^(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(rawUrl)) {
      return '';
    }
    if (
      rawUrl.startsWith('https://') ||
      rawUrl.startsWith('http://localhost') ||
      rawUrl.startsWith('http://127.0.0.1') ||
      rawUrl.startsWith('/')
    ) {
      return rawUrl;
    }
    if (/^data:image\/(?:png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(rawUrl)) {
      return rawUrl.replace(/\s+/g, '');
    }
    // Guard: if a raw storage path (`university-deadlines/...`) was ever passed without leading slash
    if (rawUrl.startsWith('university-deadlines/')) {
      return `/uploads/${rawUrl}`;
    }
    if (rawUrl.startsWith('official-assets/assets/')) {
      return rawUrl.slice('official-assets'.length);
    }
  }

  if (rawPath) {
    if (rawPath.startsWith('official-assets/assets/')) {
      return rawPath.slice('official-assets'.length);
    }
    if (rawPath.startsWith('university-deadlines/')) {
      return `/uploads/${rawPath}`;
    }
  }

  return '';
}

export function isBoundedImageDataUrl(value?: string | null, maxChars = 250_000): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 16 || trimmed.length > maxChars) return false;
  return /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(trimmed);
}

/**
 * Inspects binary magic bytes for PNG, JPEG, and WebP files.
 */
export function detectRasterMimeFromBytes(bytes: Uint8Array): AllowedLogoMimeType | null {
  if (bytes.length >= 8) {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return 'image/png';
    }
  }

  if (bytes.length >= 3) {
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
  }

  if (bytes.length >= 12) {
    // WebP: RIFF....WEBP
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp';
    }
  }

  return null;
}

const ALLOWED_SVG_ELEMENTS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
  'pattern',
  'symbol',
  'use',
  'text',
  'tspan',
  'title',
  'desc',
]);

const DISALLOWED_SVG_RAW_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  { regex: /<!ENTITY/i, reason: 'XML entity declarations (XXE) are prohibited in SVG logos.' },
  { regex: /<\s*script\b/i, reason: 'Executable <script> tags are prohibited in SVG logos.' },
  { regex: /<\s*foreignObject\b/i, reason: '<foreignObject> HTML embedding is prohibited in SVG logos.' },
  { regex: /<\s*(iframe|object|embed|applet|meta|link)\b/i, reason: 'Embedded frames or external objects are prohibited in SVG logos.' },
  { regex: /\bon[a-z]+\s*=/i, reason: 'Inline JavaScript event handlers (on*) are prohibited in SVG logos.' },
  { regex: /(?:javascript|vbscript)\s*:/i, reason: 'Executable script URIs are prohibited in SVG logos.' },
  { regex: /data\s*:\s*text\/html/i, reason: 'HTML data URIs are prohibited in SVG logos.' },
];

/**
 * Strictly validates and sanitizes SVG markup in the browser using DOMParser.
 * Rejects any malicious scripts, event handlers, XXE entities, or external URL references,
 * and outputs clean, safe vector markup suitable ONLY for `<img>` rendering.
 */
export function validateAndSanitizeSvgMarkupClient(rawSvg: string): {
  ok: true;
  sanitizedSvg: string;
} | {
  ok: false;
  error: string;
} {
  const trimmed = String(rawSvg || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'SVG file is empty.' };
  }

  if (trimmed.length > MAX_SVG_LOGO_BYTES) {
    return { ok: false, error: 'SVG logo must be 1 MB or smaller.' };
  }

  for (const rule of DISALLOWED_SVG_RAW_PATTERNS) {
    if (rule.regex.test(trimmed)) {
      return { ok: false, error: `Security check failed: ${rule.reason}` };
    }
  }

  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    if (!/^<svg[\s>]/i.test(trimmed) || !/<\/svg>\s*$/i.test(trimmed)) {
      return { ok: false, error: 'Invalid SVG root element.' };
    }
    return { ok: true, sanitizedSvg: trimmed };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    return { ok: false, error: 'Malformed SVG XML structure. Please upload a valid official SVG logo.' };
  }

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') {
    return { ok: false, error: 'Invalid SVG file: root element must be <svg>.' };
  }

  const inspectElement = (el: Element): string | null => {
    const tagLower = el.tagName.toLowerCase();
    if (!ALLOWED_SVG_ELEMENTS.has(tagLower)) {
      return `Security check failed: SVG element <${tagLower}> is not permitted.`;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const nameLower = attr.name.toLowerCase();
      const val = attr.value.trim();

      if (nameLower.startsWith('on')) {
        return `Security check failed: Event attribute "${attr.name}" is prohibited.`;
      }

      if (nameLower === 'href' || nameLower === 'xlink:href') {
        // Only allow internal fragment references (#id) inside SVG
        if (val && !val.startsWith('#')) {
          return 'Security check failed: External href or embedded data URI references in SVG are prohibited.';
        }
      }

      if (/(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(val)) {
        return 'Security check failed: Unsafe URI detected in SVG attribute.';
      }

      if (/url\s*\(\s*['"]?\s*(?:https?:|\/\/|data:)/i.test(val)) {
        return 'Security check failed: External CSS url() references in SVG are prohibited.';
      }
    }

    for (const child of Array.from(el.children)) {
      const childErr = inspectElement(child);
      if (childErr) return childErr;
    }
    return null;
  };

  const treeError = inspectElement(root);
  if (treeError) {
    return { ok: false, error: treeError };
  }

  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(root);
  return { ok: true, sanitizedSvg: serialized };
}

function verifyRasterImageDecodes(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      resolve({ width: 256, height: 256 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error('Image dimensions are invalid (0x0).'));
        return;
      }
      if (img.naturalWidth > 4096 || img.naturalHeight > 4096) {
        reject(new Error('Logo resolution exceeds maximum 4096x4096 px limit.'));
        return;
      }
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Browser could not decode this image file. The file may be corrupted or invalid.'));
    };
    img.src = dataUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to encode logo preview.'));
    };
    reader.onerror = () => reject(new Error('Failed to read selected logo file.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Produces a compact, high-DPI (max 320x320 px) transparency-preserving data URL (`<= 220 KB`)
 * so uploaded logos remain crisp and unbroken across stateless containers, page refreshes,
 * and Firestore synchronization without approaching Firestore's 1 MB document limit.
 */
async function generateCompactLogoFallbackDataUrl(
  originalDataUrl: string,
  mimeType: AllowedLogoMimeType
): Promise<string> {
  const cleanOriginal = String(originalDataUrl || '').replace(/\s+/g, '');
  if (mimeType === 'image/svg+xml') {
    return isBoundedImageDataUrl(cleanOriginal, 220_000) ? cleanOriginal : '';
  }

  if (cleanOriginal.length <= 140_000 && isBoundedImageDataUrl(cleanOriginal, 140_000)) {
    return cleanOriginal;
  }

  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    return isBoundedImageDataUrl(cleanOriginal, 220_000) ? cleanOriginal : '';
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 280;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const targetW = Math.max(1, Math.round((img.naturalWidth || 128) * scale));
        const targetH = Math.max(1, Math.round((img.naturalHeight || 128) * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(isBoundedImageDataUrl(cleanOriginal, 220_000) ? cleanOriginal : '');
          return;
        }
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Prefer lossless-alpha WebP first; fallback to PNG if WebP is unsupported
        let encoded = canvas.toDataURL('image/webp', 0.9);
        if (!encoded.startsWith('data:image/webp;base64,') || encoded.length > 220_000) {
          encoded = canvas.toDataURL('image/png');
        }
        if (encoded.length > 220_000) {
          // Secondary step-down to 160px if still large
          const c2 = document.createElement('canvas');
          const s2 = Math.min(1, 160 / Math.max(targetW, targetH));
          c2.width = Math.max(1, Math.round(targetW * s2));
          c2.height = Math.max(1, Math.round(targetH * s2));
          const ctx2 = c2.getContext('2d');
          if (ctx2) {
            ctx2.imageSmoothingEnabled = true;
            ctx2.imageSmoothingQuality = 'high';
            ctx2.drawImage(canvas, 0, 0, c2.width, c2.height);
            encoded = c2.toDataURL('image/webp', 0.86);
          }
        }
        resolve(isBoundedImageDataUrl(encoded, 220_000) ? encoded : '');
      } catch {
        resolve(isBoundedImageDataUrl(cleanOriginal, 220_000) ? cleanOriginal : '');
      }
    };
    img.onerror = () => {
      resolve(isBoundedImageDataUrl(cleanOriginal, 220_000) ? cleanOriginal : '');
    };
    img.src = cleanOriginal;
  });
}

export interface ValidatedLogoUploadPayload {
  sanitizedBlob: Blob;
  dataUrl: string;
  compactFallbackDataUrl: string;
  mimeType: AllowedLogoMimeType;
  extension: 'png' | 'jpg' | 'webp' | 'svg';
  cleanFileName: string;
  byteSize: number;
}

/**
 * Validates a local computer logo file selected via drag-and-drop or Browse Files:
 * - Enforces PNG, JPG, JPEG, WebP, or sanitized SVG
 * - Verifies binary magic bytes & decodes raster dimensions
 * - Sanitizes SVG XML and rejects malicious XSS / XXE payloads
 */
export async function validateAndSanitizeUniversityLogoFile(
  file: File
): Promise<ValidatedLogoUploadPayload> {
  if (!file) {
    throw new Error('Please choose a logo image file from your computer.');
  }

  if (file.size <= 0) {
    throw new Error('Selected file is empty (0 bytes).');
  }

  if (file.size > MAX_UNIVERSITY_LOGO_BYTES) {
    throw new Error('Logo file exceeds the 5 MB maximum upload size.');
  }

  const rawName = String(file.name || 'logo').trim();
  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(rawName);
  const rawExt = extMatch ? extMatch[1].toLowerCase() : '';
  const declaredMime = String(file.type || '').toLowerCase();

  const isSvgCandidate = rawExt === 'svg' || declaredMime === 'image/svg+xml';

  const safeStem =
    rawName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'official-logo';

  if (isSvgCandidate) {
    const rawText = await file.text();
    const check = validateAndSanitizeSvgMarkupClient(rawText);
    if (!check.ok) {
      throw new Error(check.error);
    }
    const sanitizedBlob = new Blob([check.sanitizedSvg], { type: 'image/svg+xml' });
    const base64Svg =
      typeof window !== 'undefined'
        ? window.btoa(unescape(encodeURIComponent(check.sanitizedSvg)))
        : '';
    const dataUrl = base64Svg
      ? `data:image/svg+xml;base64,${base64Svg}`
      : await blobToDataUrl(sanitizedBlob);

    const compactFallbackDataUrl = await generateCompactLogoFallbackDataUrl(
      dataUrl,
      'image/svg+xml'
    );

    return {
      sanitizedBlob,
      dataUrl,
      compactFallbackDataUrl,
      mimeType: 'image/svg+xml',
      extension: 'svg',
      cleanFileName: `${safeStem}.svg`,
      byteSize: sanitizedBlob.size,
    };
  }

  if (!['png', 'jpg', 'jpeg', 'webp'].includes(rawExt) && !ALLOWED_LOGO_MIME_TYPES.includes(declaredMime as any)) {
    throw new Error(
      'Unsupported file format. Please upload an official PNG, JPG, JPEG, WebP, or SVG university logo.'
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const detectedMime = detectRasterMimeFromBytes(bytes);

  if (!detectedMime) {
    throw new Error(
      'Invalid image signature: file content does not match PNG, JPG/JPEG, or WebP binary headers.'
    );
  }

  const extensionMap: Record<Exclude<AllowedLogoMimeType, 'image/svg+xml'>, 'png' | 'jpg' | 'webp'> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  const extension = extensionMap[detectedMime as Exclude<AllowedLogoMimeType, 'image/svg+xml'>];
  const sanitizedBlob = new Blob([arrayBuffer], { type: detectedMime });
  const dataUrl = await blobToDataUrl(sanitizedBlob);

  await verifyRasterImageDecodes(dataUrl);
  const compactFallbackDataUrl = await generateCompactLogoFallbackDataUrl(dataUrl, detectedMime);

  return {
    sanitizedBlob,
    dataUrl,
    compactFallbackDataUrl,
    mimeType: detectedMime,
    extension,
    cleanFileName: `${safeStem}.${extension}`,
    byteSize: sanitizedBlob.size,
  };
}

/**
 * Verified EveryKR University Admission Deadlines (March 2027 Spring Intake).
 * All 6 records correspond to verified approved EveryKR universities with official logos in
 * `/public/assets/university-logos/` and verified deadlines from `pdfAdmissionDeadlines.ts`.
 */
export const DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG: UniversityDeadlineCarouselConfig = {
  carouselEnabled: true,
  initialized: true,
  deletedIds: [],
  updatedAt: '2026-11-16T00:00:00.000Z',
  updatedByUid: 'system_seed',
  updatedByEmail: 'admin@everykr.com',
};

function buildVerifiedSeedRecord(params: {
  id: string;
  universityId: string;
  universityName: string;
  logoPath: string;
  logoFileName: string;
  logoMimeType: AllowedLogoMimeType;
  logoFileSize: number;
  admissionIntake: AdmissionIntakeType;
  applicationDeadline: string;
  displayOrder: number;
}): UniversityAdmissionDeadlineRecord {
  return {
    id: params.id,
    universityId: params.universityId,
    universityName: params.universityName,
    logoStoragePath: `official-assets${params.logoPath}`,
    logoDownloadUrl: params.logoPath,
    logoFileName: params.logoFileName,
    logoMimeType: params.logoMimeType,
    logoFileSize: params.logoFileSize,
    admissionIntake: params.admissionIntake,
    intakeLabel: 'Spring 2027 Undergraduate Intake',
    applicationDeadline: params.applicationDeadline,
    deadlineTimestampMs: getDeadlineEndOfDayKstMs(params.applicationDeadline),
    publicationStatus: 'published',
    published: true,
    displayOrder: params.displayOrder,
    createdAt: '2026-11-16T00:00:00.000Z',
    updatedAt: '2026-11-16T00:00:00.000Z',
    createdByUid: 'system_seed',
    createdByEmail: 'admin@everykr.com',
    updatedByUid: 'system_seed',
    updatedByEmail: 'admin@everykr.com',
  };
}

export const VERIFIED_SEED_UNIVERSITY_DEADLINES: UniversityAdmissionDeadlineRecord[] = [
  buildVerifiedSeedRecord({
    id: 'udl_dongshin_spring_2027',
    universityId: 'dongshin-university',
    universityName: 'Dongshin University',
    logoPath: '/assets/university-logos/dongshin-university.png',
    logoFileName: 'dongshin-university.png',
    logoMimeType: 'image/png',
    logoFileSize: 42800,
    admissionIntake: 'Spring',
    applicationDeadline: '2026-11-20',
    displayOrder: 1,
  }),
  buildVerifiedSeedRecord({
    id: 'udl_kangwon_spring_2027',
    universityId: 'kangwon-national-university',
    universityName: 'Kangwon National University',
    logoPath: '/assets/university-logos/kangwon-national-university.webp',
    logoFileName: 'kangwon-national-university.webp',
    logoMimeType: 'image/webp',
    logoFileSize: 31400,
    admissionIntake: 'Spring',
    applicationDeadline: '2026-11-20',
    displayOrder: 2,
  }),
  buildVerifiedSeedRecord({
    id: 'udl_donga_spring_2027',
    universityId: 'dong-a-university',
    universityName: 'Dong-A University',
    logoPath: '/assets/university-logos/dong-a-university.png',
    logoFileName: 'dong-a-university.png',
    logoMimeType: 'image/png',
    logoFileSize: 38900,
    admissionIntake: 'Spring',
    applicationDeadline: '2026-11-23',
    displayOrder: 3,
  }),
  buildVerifiedSeedRecord({
    id: 'udl_sungshin_spring_2027',
    universityId: 'sungshin-womens-university',
    universityName: "Sungshin Women's University",
    logoPath: '/assets/university-logos/sungshin-womens-university.jpg',
    logoFileName: 'sungshin-womens-university.jpg',
    logoMimeType: 'image/jpeg',
    logoFileSize: 45200,
    admissionIntake: 'Spring',
    applicationDeadline: '2026-12-02',
    displayOrder: 4,
  }),
  buildVerifiedSeedRecord({
    id: 'udl_gachon_spring_2027',
    universityId: 'gachon-university',
    universityName: 'Gachon University',
    logoPath: '/assets/university-logos/gachon-university.jpg',
    logoFileName: 'gachon-university.jpg',
    logoMimeType: 'image/jpeg',
    logoFileSize: 41600,
    admissionIntake: 'Spring',
    applicationDeadline: '2026-12-04',
    displayOrder: 5,
  }),
  buildVerifiedSeedRecord({
    id: 'udl_chungbuk_spring_2027',
    universityId: 'chungbuk-national-university',
    universityName: 'Chungbuk National University',
    logoPath: '/assets/university-logos/chungbuk-national-university.png',
    logoFileName: 'chungbuk-national-university.png',
    logoMimeType: 'image/png',
    logoFileSize: 47100,
    admissionIntake: 'Spring',
    applicationDeadline: '2026-12-11',
    displayOrder: 6,
  }),
];
