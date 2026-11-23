import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AdmissionIntakeType,
  UniversityAdmissionDeadlineRecord,
  UniversityDeadlineCarouselConfig,
} from '../types';
import {
  DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG,
  VERIFIED_SEED_UNIVERSITY_DEADLINES,
  detectRasterMimeFromBytes,
  getDeadlineEndOfDayKstMs,
  isBoundedImageDataUrl,
  resolveRenderableUniversityLogoUrl,
  slugifyUniversityStorageSegment,
} from '../utils/universityDeadlineUtils.ts';

const STORE_FILE = path.join(process.cwd(), 'data', 'university-deadlines-cms.json');
const LOGO_ASSETS_STORE_FILE = path.join(process.cwd(), 'data', 'university-deadline-logos.json');
const PUBLIC_UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'university-deadlines');
const CANONICAL_STORAGE_BUCKET = 'everykr.firebasestorage.app';

interface PersistedLogoAsset {
  storageSubpath: string; // e.g. "yonsei-university/176329_official-logo.png"
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
  base64Data: string;
  fileName: string;
  byteSize: number;
  updatedAt: string;
}

let carouselConfigStore: UniversityDeadlineCarouselConfig = {
  ...DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG,
};
const deadlinesMapStore = new Map<string, UniversityAdmissionDeadlineRecord>();
const logoAssetsMapStore = new Map<string, PersistedLogoAsset>();

function sanitizeSubpathSegment(seg: string): string {
  return String(seg || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '')
    .replace(/^\.+|\.+$/g, '');
}

function parseDataUrlServer(
  dataUrl?: string | null
): { mimeType: PersistedLogoAsset['mimeType']; buffer: Buffer; base64Data: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const trimmed = dataUrl.trim();
  const match = /^data:(image\/(?:png|jpeg|jpg|webp|svg\+xml));base64,([A-Za-z0-9+/=\s]+)$/i.exec(
    trimmed
  );
  if (!match) return null;
  const rawMime = match[1].toLowerCase();
  const mimeType: PersistedLogoAsset['mimeType'] =
    rawMime === 'image/jpg' ? 'image/jpeg' : (rawMime as PersistedLogoAsset['mimeType']);
  const cleanBase64 = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) return null;
  return { mimeType, buffer, base64Data: cleanBase64 };
}

function writeLogoBufferToUploadsDisk(storageSubpath: string, buffer: Buffer): boolean {
  try {
    const parts = storageSubpath.split('/').filter(Boolean);
    if (parts.length !== 2) return false;
    const uniSlug = sanitizeSubpathSegment(parts[0]);
    const fileName = sanitizeSubpathSegment(parts[1]);
    if (!uniSlug || !fileName) return false;

    const targetDir = path.resolve(PUBLIC_UPLOADS_ROOT, uniSlug);
    const fullFilePath = path.resolve(targetDir, fileName);
    const rootWithSep = path.resolve(PUBLIC_UPLOADS_ROOT) + path.sep;
    if (!fullFilePath.startsWith(rootWithSep)) return false;

    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(fullFilePath, buffer);
    return true;
  } catch {
    return false;
  }
}

function extractUploadSubpathFromRecord(
  logoStoragePath?: string,
  logoDownloadUrl?: string
): string {
  const urlVal = String(logoDownloadUrl || '').trim();
  const pathVal = String(logoStoragePath || '').trim();

  if (urlVal.startsWith('/uploads/university-deadlines/')) {
    return urlVal.slice('/uploads/university-deadlines/'.length);
  }
  if (urlVal.startsWith('/api/cms/university-deadlines/logo/')) {
    return urlVal.slice('/api/cms/university-deadlines/logo/'.length);
  }
  if (pathVal.startsWith('university-deadlines/')) {
    return pathVal.slice('university-deadlines/'.length);
  }
  return '';
}

function persistLogoAssetsToDisk(): void {
  try {
    const dir = path.dirname(LOGO_ASSETS_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const entries: Record<string, PersistedLogoAsset> = {};
    for (const [key, val] of logoAssetsMapStore.entries()) {
      entries[key] = val;
    }
    fs.writeFileSync(LOGO_ASSETS_STORE_FILE, JSON.stringify({ assets: entries }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[UniversityDeadlinesServer] Logo assets disk write warning:', err);
  }
}

function loadLogoAssetsFromDisk(): void {
  try {
    if (fs.existsSync(LOGO_ASSETS_STORE_FILE)) {
      const raw = fs.readFileSync(LOGO_ASSETS_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed?.assets && typeof parsed.assets === 'object') {
        logoAssetsMapStore.clear();
        for (const [k, asset] of Object.entries(parsed.assets as Record<string, PersistedLogoAsset>)) {
          if (asset && typeof asset.base64Data === 'string' && asset.mimeType) {
            logoAssetsMapStore.set(k, asset);
            // Rehydrate public/uploads/university-deadlines on server boot
            const buf = Buffer.from(asset.base64Data, 'base64');
            if (buf.byteLength > 0) {
              writeLogoBufferToUploadsDisk(k, buf);
            }
          }
        }
      }
    }
  } catch {
    // ignore corrupt logo cache; records can rehydrate from logoFallbackDataUrl
  }
}

function rehydrateRecordLogoToDiskAndStore(rec: UniversityAdmissionDeadlineRecord): void {
  const subpath = extractUploadSubpathFromRecord(rec.logoStoragePath, rec.logoDownloadUrl);
  if (!subpath) return;
  const parts = subpath.split('/').filter(Boolean);
  if (parts.length !== 2) return;
  const normalizedKey = `${sanitizeSubpathSegment(parts[0])}/${sanitizeSubpathSegment(parts[1])}`;
  if (!normalizedKey || normalizedKey === '/') return;

  const targetDiskPath = path.resolve(PUBLIC_UPLOADS_ROOT, normalizedKey);
  if (fs.existsSync(targetDiskPath) && logoAssetsMapStore.has(normalizedKey)) {
    return;
  }

  if (logoAssetsMapStore.has(normalizedKey)) {
    const existingAsset = logoAssetsMapStore.get(normalizedKey)!;
    writeLogoBufferToUploadsDisk(normalizedKey, Buffer.from(existingAsset.base64Data, 'base64'));
    return;
  }

  if (rec.logoFallbackDataUrl) {
    const decoded = parseDataUrlServer(rec.logoFallbackDataUrl);
    if (decoded) {
      writeLogoBufferToUploadsDisk(normalizedKey, decoded.buffer);
      logoAssetsMapStore.set(normalizedKey, {
        storageSubpath: normalizedKey,
        mimeType: decoded.mimeType,
        base64Data: decoded.base64Data,
        fileName: rec.logoFileName || parts[1],
        byteSize: decoded.buffer.byteLength,
        updatedAt: rec.updatedAt || new Date().toISOString(),
      });
    }
  }
}

function persistStoreToDisk(): void {
  try {
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      STORE_FILE,
      JSON.stringify(
        {
          config: carouselConfigStore,
          deadlines: getSortedDeadlinesList(),
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (err) {
    console.error('[UniversityDeadlinesServer] Disk write warning:', err);
  }
}

function loadStoreFromDisk(): void {
  loadLogoAssetsFromDisk();

  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed?.config && typeof parsed.config === 'object') {
        carouselConfigStore = {
          ...DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG,
          ...parsed.config,
          initialized: true,
          deletedIds: Array.isArray(parsed.config.deletedIds) ? parsed.config.deletedIds : [],
        };
      }
      if (Array.isArray(parsed?.deadlines)) {
        deadlinesMapStore.clear();
        const deletedSet = new Set<string>(carouselConfigStore.deletedIds || []);
        for (const item of parsed.deadlines) {
          if (item?.id && !deletedSet.has(item.id)) {
            const record = item as UniversityAdmissionDeadlineRecord;
            record.logoDownloadUrl = resolveRenderableUniversityLogoUrl(
              record.logoDownloadUrl,
              record.logoStoragePath
            );
            deadlinesMapStore.set(record.id, record);
            rehydrateRecordLogoToDiskAndStore(record);
          }
        }
        return;
      }
    }
  } catch {
    // initialize fresh store below
  }

  // First-time seed with verified EveryKR university deadline records
  carouselConfigStore = {
    ...DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG,
    initialized: true,
    deletedIds: [],
  };
  deadlinesMapStore.clear();
  for (const seed of VERIFIED_SEED_UNIVERSITY_DEADLINES) {
    deadlinesMapStore.set(seed.id, { ...seed });
  }
  persistStoreToDisk();
}

loadStoreFromDisk();

export function getSortedDeadlinesList(): UniversityAdmissionDeadlineRecord[] {
  return Array.from(deadlinesMapStore.values()).sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    if (a.deadlineTimestampMs !== b.deadlineTimestampMs) {
      return a.deadlineTimestampMs - b.deadlineTimestampMs;
    }
    return a.universityName.localeCompare(b.universityName);
  });
}

export function getUniversityDeadlinesPayloadServer(isAdminCaller: boolean): {
  config: UniversityDeadlineCarouselConfig;
  deadlines: UniversityAdmissionDeadlineRecord[];
} {
  const all = getSortedDeadlinesList().map((rec) => ({
    ...rec,
    logoDownloadUrl: resolveRenderableUniversityLogoUrl(rec.logoDownloadUrl, rec.logoStoragePath),
  }));
  if (isAdminCaller) {
    return {
      config: carouselConfigStore,
      deadlines: all,
    };
  }
  // Public callers strictly receive ONLY published records
  const publishedOnly = all.filter(
    (d) => d.published === true && d.publicationStatus === 'published'
  );
  return {
    config: {
      carouselEnabled: carouselConfigStore.carouselEnabled,
      initialized: carouselConfigStore.initialized,
      updatedAt: carouselConfigStore.updatedAt,
    },
    deadlines: publishedOnly,
  };
}

/**
 * Resolves a stored university deadline logo binary from disk or durable server asset store
 * so `/uploads/university-deadlines/:uniSlug/:fileName` and `/api/cms/university-deadlines/logo/:uniSlug/:fileName`
 * ALWAYS return valid image bytes with proper MIME headers in both dev and production builds.
 */
export function getUniversityDeadlineLogoBinaryServer(
  rawUniSlug: string,
  rawFileName: string
): {
  ok: true;
  buffer: Buffer;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
} | {
  ok: false;
} {
  const uniSlug = sanitizeSubpathSegment(rawUniSlug);
  const fileName = sanitizeSubpathSegment(rawFileName);
  if (!uniSlug || !fileName) {
    return { ok: false };
  }

  const key = `${uniSlug}/${fileName}`;
  const ext = path.extname(fileName).toLowerCase();
  const inferredMime: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml' =
    ext === '.svg'
      ? 'image/svg+xml'
      : ext === '.webp'
      ? 'image/webp'
      : ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : 'image/png';

  // 1. Check public/uploads/university-deadlines/{uniSlug}/{fileName} on disk
  const fullDiskPath = path.resolve(PUBLIC_UPLOADS_ROOT, uniSlug, fileName);
  const rootWithSep = path.resolve(PUBLIC_UPLOADS_ROOT) + path.sep;
  if (fullDiskPath.startsWith(rootWithSep) && fs.existsSync(fullDiskPath)) {
    try {
      const diskBuf = fs.readFileSync(fullDiskPath);
      if (diskBuf.byteLength > 0) {
        const storedMeta = logoAssetsMapStore.get(key);
        return {
          ok: true,
          buffer: diskBuf,
          mimeType: storedMeta?.mimeType || inferredMime,
        };
      }
    } catch {
      // fall through to durable memory/JSON asset store
    }
  }

  // 2. Check durable logoAssetsMapStore
  const asset = logoAssetsMapStore.get(key);
  if (asset && asset.base64Data) {
    const buf = Buffer.from(asset.base64Data, 'base64');
    if (buf.byteLength > 0) {
      writeLogoBufferToUploadsDisk(key, buf);
      return {
        ok: true,
        buffer: buf,
        mimeType: asset.mimeType,
      };
    }
  }

  // 3. Check active deadline records' logoFallbackDataUrl (self-heals after cross-container Firestore sync)
  for (const rec of deadlinesMapStore.values()) {
    const recSubpath = extractUploadSubpathFromRecord(rec.logoStoragePath, rec.logoDownloadUrl);
    if (recSubpath === key && rec.logoFallbackDataUrl) {
      const decoded = parseDataUrlServer(rec.logoFallbackDataUrl);
      if (decoded) {
        writeLogoBufferToUploadsDisk(key, decoded.buffer);
        logoAssetsMapStore.set(key, {
          storageSubpath: key,
          mimeType: decoded.mimeType,
          base64Data: decoded.base64Data,
          fileName: rec.logoFileName || fileName,
          byteSize: decoded.buffer.byteLength,
          updatedAt: rec.updatedAt || new Date().toISOString(),
        });
        persistLogoAssetsToDisk();
        return {
          ok: true,
          buffer: decoded.buffer,
          mimeType: decoded.mimeType,
        };
      }
    }
  }

  return { ok: false };
}

function validateSvgMarkupServer(
  rawSvg: string
): { ok: true; sanitizedSvg: string } | { ok: false; error: string } {
  const trimmed = String(rawSvg || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'SVG file is empty.' };
  }
  if (Buffer.byteLength(trimmed, 'utf-8') > 1024 * 1024) {
    return { ok: false, error: 'SVG file exceeds 1 MB limit.' };
  }

  const forbiddenPatterns: Array<{ re: RegExp; msg: string }> = [
    { re: /<!ENTITY/i, msg: 'XML entity declarations (XXE) are prohibited in SVG logos.' },
    { re: /<\s*script\b/i, msg: 'Executable <script> tags are prohibited in SVG logos.' },
    { re: /<\s*foreignObject\b/i, msg: '<foreignObject> tags are prohibited in SVG logos.' },
    {
      re: /<\s*(iframe|object|embed|applet|meta|link)\b/i,
      msg: 'Embedded frames or external links are prohibited in SVG logos.',
    },
    { re: /\bon[a-z]+\s*=/i, msg: 'JavaScript event attributes (on*) are prohibited in SVG logos.' },
    { re: /(?:javascript|vbscript)\s*:/i, msg: 'Executable script URIs are prohibited in SVG logos.' },
    { re: /data\s*:\s*text\/html/i, msg: 'HTML data URIs are prohibited in SVG logos.' },
    { re: /(?:xlink:)?href\s*=\s*['"]\s*(?!#)/i, msg: 'External href references are prohibited in SVG logos.' },
    {
      re: /url\s*\(\s*['"]?\s*(?:https?:|\/\/|data:)/i,
      msg: 'External CSS url() references are prohibited in SVG logos.',
    },
  ];

  for (const check of forbiddenPatterns) {
    if (check.re.test(trimmed)) {
      return { ok: false, error: `Security check failed: ${check.msg}` };
    }
  }

  // Strip XML declaration/comments before checking <svg> root
  const withoutXmlDecl = trimmed
    .replace(/^\uFEFF/, '')
    .replace(/^<\?xml[^>]*\?>\s*/i, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  if (!/^<svg[\s>]/i.test(withoutXmlDecl) || !/<\/svg>\s*$/i.test(withoutXmlDecl)) {
    return { ok: false, error: 'Invalid SVG XML structure: root element must be <svg>...</svg>.' };
  }

  return { ok: true, sanitizedSvg: withoutXmlDecl };
}

/**
 * Verifies that a remote Firebase Storage download URL actually responds with HTTP 200 and an image Content-Type
 * so an inaccessible/403 bucket URL is never persisted as the primary logoDownloadUrl.
 */
async function verifyRemoteStorageImageUrl(candidateUrl?: string): Promise<string> {
  const url = String(candidateUrl || '').trim();
  if (!url.startsWith('https://firebasestorage.googleapis.com/')) {
    return '';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Range: 'bytes=0-63' },
    });
    if ((res.status === 200 || res.status === 206) && res.ok) {
      const ct = String(res.headers.get('content-type') || '').toLowerCase();
      if (ct.startsWith('image/')) {
        return url;
      }
    }
  } catch {
    // unreachable or timed out
  } finally {
    clearTimeout(timer);
  }
  return '';
}

/**
 * Attempts a server-side upload to `everykr.firebasestorage.app` under `university-deadlines/...`
 * if Firebase Admin credentials with Storage write access are configured in the server environment,
 * and verifies public read reachability before returning the Firebase Storage download URL.
 */
async function tryUploadToFirebaseStorageAdmin(params: {
  storagePath: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const hasExplicitServiceAccount = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.FIREBASE_PRIVATE_KEY ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
  if (!hasExplicitServiceAccount) {
    return '';
  }

  try {
    const { getApps } = await import('firebase-admin/app');
    const { getStorage } = await import('firebase-admin/storage');
    const existingApp = getApps()[0];
    if (!existingApp) return '';

    const downloadToken = crypto.randomUUID();
    const bucket = getStorage(existingApp).bucket(CANONICAL_STORAGE_BUCKET);
    const fileObj = bucket.file(params.storagePath);

    await Promise.race([
      fileObj.save(params.buffer, {
        resumable: false,
        metadata: {
          contentType: params.mimeType,
          cacheControl: 'public,max-age=31536000',
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Admin storage upload timeout')), 4000)
      ),
    ]);

    const candidateUrl = `https://firebasestorage.googleapis.com/v0/b/${CANONICAL_STORAGE_BUCKET}/o/${encodeURIComponent(
      params.storagePath
    )}?alt=media&token=${downloadToken}`;
    return await verifyRemoteStorageImageUrl(candidateUrl);
  } catch {
    return '';
  }
}

export async function uploadUniversityDeadlineLogoServer(params: {
  dataUrl: string;
  compactFallbackDataUrl?: string;
  fileName?: string;
  universityId?: string;
  storageDownloadUrl?: string;
  storagePath?: string;
}): Promise<
  | {
      ok: true;
      logoStoragePath: string;
      logoDownloadUrl: string;
      logoFallbackDataUrl: string;
      logoFileName: string;
      logoMimeType: string;
      logoFileSize: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    }
> {
  const rawDataUrl = String(params.dataUrl || '').trim();
  if (!rawDataUrl) {
    return { ok: false, status: 400, error: 'No logo file payload provided.' };
  }

  const uniSlug = slugifyUniversityStorageSegment(params.universityId || 'university');
  const safeStem =
    String(params.fileName || 'official-logo')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'official-logo';

  const svgMatch = /^data:image\/svg\+xml;base64,([A-Za-z0-9+/=\s]+)$/i.exec(rawDataUrl);
  if (svgMatch) {
    const svgBuffer = Buffer.from(svgMatch[1].replace(/\s+/g, ''), 'base64');
    if (svgBuffer.byteLength === 0 || svgBuffer.byteLength > 1024 * 1024) {
      return { ok: false, status: 400, error: 'SVG logo must be between 1 byte and 1 MB.' };
    }
    const check = validateSvgMarkupServer(svgBuffer.toString('utf-8'));
    if (!check.ok) {
      return { ok: false, status: 400, error: check.error };
    }

    const cleanSvgBuffer = Buffer.from(check.sanitizedSvg, 'utf-8');
    const cleanSvgBase64 = cleanSvgBuffer.toString('base64');
    const storedFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeStem}.svg`;
    const storageSubpath = `${uniSlug}/${storedFileName}`;

    writeLogoBufferToUploadsDisk(storageSubpath, cleanSvgBuffer);
    logoAssetsMapStore.set(storageSubpath, {
      storageSubpath,
      mimeType: 'image/svg+xml',
      base64Data: cleanSvgBase64,
      fileName: `${safeStem}.svg`,
      byteSize: cleanSvgBuffer.byteLength,
      updatedAt: new Date().toISOString(),
    });
    persistLogoAssetsToDisk();

    const canonicalStoragePath = `university-deadlines/${storageSubpath}`;
    const verifiedClientStorageUrl = await verifyRemoteStorageImageUrl(params.storageDownloadUrl);
    const verifiedAdminStorageUrl = verifiedClientStorageUrl
      ? ''
      : await tryUploadToFirebaseStorageAdmin({
          storagePath: canonicalStoragePath,
          buffer: cleanSvgBuffer,
          mimeType: 'image/svg+xml',
        });

    const finalStoragePath =
      verifiedClientStorageUrl &&
      typeof params.storagePath === 'string' &&
      params.storagePath.startsWith('university-deadlines/')
        ? params.storagePath.trim()
        : canonicalStoragePath;

    const publicUrl =
      verifiedClientStorageUrl ||
      verifiedAdminStorageUrl ||
      `/uploads/university-deadlines/${storageSubpath}`;

    const sanitizedDataUrl = `data:image/svg+xml;base64,${cleanSvgBase64}`;
    const fallbackDataUrl = isBoundedImageDataUrl(sanitizedDataUrl, 240_000)
      ? sanitizedDataUrl
      : '';

    return {
      ok: true,
      logoStoragePath: finalStoragePath,
      logoDownloadUrl: publicUrl,
      logoFallbackDataUrl: fallbackDataUrl,
      logoFileName: `${safeStem}.svg`,
      logoMimeType: 'image/svg+xml',
      logoFileSize: cleanSvgBuffer.byteLength,
    };
  }

  const rasterMatch = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(
    rawDataUrl
  );
  if (!rasterMatch) {
    return {
      ok: false,
      status: 400,
      error:
        'Unsupported file format. Only official PNG, JPG, JPEG, WebP, or sanitized SVG logos are allowed.',
    };
  }

  const cleanBase64 = rasterMatch[2].replace(/\s+/g, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  const MAX_BYTES = 5 * 1024 * 1024;
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
    return { ok: false, status: 400, error: 'Logo file must be 5 MB or smaller.' };
  }

  const detectedMime = detectRasterMimeFromBytes(new Uint8Array(buffer));
  if (!detectedMime || detectedMime === 'image/svg+xml') {
    return {
      ok: false,
      status: 400,
      error:
        'Invalid binary image signature: file content does not match PNG, JPG/JPEG, or WebP headers.',
    };
  }

  const extMap: Record<'image/png' | 'image/jpeg' | 'image/webp', string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  const ext = extMap[detectedMime];
  const storedFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeStem}.${ext}`;
  const storageSubpath = `${uniSlug}/${storedFileName}`;

  writeLogoBufferToUploadsDisk(storageSubpath, buffer);
  logoAssetsMapStore.set(storageSubpath, {
    storageSubpath,
    mimeType: detectedMime,
    base64Data: cleanBase64,
    fileName: `${safeStem}.${ext}`,
    byteSize: buffer.byteLength,
    updatedAt: new Date().toISOString(),
  });
  persistLogoAssetsToDisk();

  const canonicalStoragePath = `university-deadlines/${storageSubpath}`;
  const verifiedClientStorageUrl = await verifyRemoteStorageImageUrl(params.storageDownloadUrl);
  const verifiedAdminStorageUrl = verifiedClientStorageUrl
    ? ''
    : await tryUploadToFirebaseStorageAdmin({
        storagePath: canonicalStoragePath,
        buffer: buffer,
        mimeType: detectedMime,
      });

  const finalStoragePath =
    verifiedClientStorageUrl &&
    typeof params.storagePath === 'string' &&
    params.storagePath.startsWith('university-deadlines/')
      ? params.storagePath.trim()
      : canonicalStoragePath;

  const publicUrl =
    verifiedClientStorageUrl ||
    verifiedAdminStorageUrl ||
    `/uploads/university-deadlines/${storageSubpath}`;

  const directDataUrl = `data:${detectedMime};base64,${cleanBase64}`;
  let fallbackDataUrl = '';
  if (isBoundedImageDataUrl(params.compactFallbackDataUrl, 240_000)) {
    fallbackDataUrl = params.compactFallbackDataUrl!.trim();
  } else if (isBoundedImageDataUrl(directDataUrl, 240_000)) {
    fallbackDataUrl = directDataUrl;
  }

  return {
    ok: true,
    logoStoragePath: finalStoragePath,
    logoDownloadUrl: publicUrl,
    logoFallbackDataUrl: fallbackDataUrl,
    logoFileName: `${safeStem}.${ext}`,
    logoMimeType: detectedMime,
    logoFileSize: buffer.byteLength,
  };
}

/**
 * Safely removes an uploaded logo file ONLY if 0 deadline records reference it
 * and it is NOT a built-in official EveryKR static logo.
 */
export function cleanupUnreferencedDeadlineLogoServer(params: {
  logoStoragePath?: string;
  logoDownloadUrl?: string;
  excludeRecordId?: string;
}): { cleanedUp: boolean; remainingReferences: number } {
  const pathVal = String(params.logoStoragePath || '').trim();
  const urlVal = String(params.logoDownloadUrl || '').trim();

  if (!pathVal && !urlVal) {
    return { cleanedUp: false, remainingReferences: 0 };
  }

  if (pathVal.startsWith('official-assets/') || urlVal.startsWith('/assets/university-logos/')) {
    return { cleanedUp: false, remainingReferences: 1 };
  }

  let refCount = 0;
  for (const rec of deadlinesMapStore.values()) {
    if (params.excludeRecordId && rec.id === params.excludeRecordId) continue;
    if (
      (pathVal && rec.logoStoragePath === pathVal) ||
      (urlVal && rec.logoDownloadUrl === urlVal)
    ) {
      refCount += 1;
    }
  }

  if (refCount > 0) {
    return { cleanedUp: false, remainingReferences: refCount };
  }

  const relativeUploadSubpath = extractUploadSubpathFromRecord(pathVal, urlVal);
  let deletedFromDisk = false;

  if (relativeUploadSubpath) {
    const parts = relativeUploadSubpath.split('/').filter(Boolean);
    if (parts.length === 2) {
      const normalizedKey = `${sanitizeSubpathSegment(parts[0])}/${sanitizeSubpathSegment(parts[1])}`;
      if (logoAssetsMapStore.has(normalizedKey)) {
        logoAssetsMapStore.delete(normalizedKey);
        persistLogoAssetsToDisk();
        deletedFromDisk = true;
      }

      const resolvedPath = path.resolve(PUBLIC_UPLOADS_ROOT, normalizedKey);
      const normalizedRoot = path.resolve(PUBLIC_UPLOADS_ROOT) + path.sep;
      if (resolvedPath.startsWith(normalizedRoot) && fs.existsSync(resolvedPath)) {
        try {
          fs.unlinkSync(resolvedPath);
          deletedFromDisk = true;
        } catch {
          // ignore unlink errors
        }
      }
    }
  }

  return { cleanedUp: deletedFromDisk, remainingReferences: 0 };
}

export function saveUniversityDeadlineServer(params: {
  rawDeadline: Partial<UniversityAdmissionDeadlineRecord>;
  adminUid: string;
  adminEmail: string;
}):
  | {
      ok: true;
      deadline: UniversityAdmissionDeadlineRecord;
      allDeadlines: UniversityAdmissionDeadlineRecord[];
    }
  | {
      ok: false;
      status: number;
      error: string;
    } {
  const raw = params.rawDeadline || {};
  const universityName = String(raw.universityName || '').trim();
  if (universityName.length < 2 || universityName.length > 160) {
    return {
      ok: false,
      status: 400,
      error: 'University name must be between 2 and 160 characters.',
    };
  }

  const universityId = slugifyUniversityStorageSegment(raw.universityId || universityName);
  const applicationDeadline = String(raw.applicationDeadline || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(applicationDeadline)) {
    return {
      ok: false,
      status: 400,
      error: 'Application deadline must be a valid YYYY-MM-DD date.',
    };
  }

  const deadlineTimestampMs = getDeadlineEndOfDayKstMs(applicationDeadline);
  if (!deadlineTimestampMs) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid application deadline calendar date.',
    };
  }

  const intake: AdmissionIntakeType =
    raw.admissionIntake === 'Spring' ||
    raw.admissionIntake === 'Fall' ||
    raw.admissionIntake === 'Other'
      ? raw.admissionIntake
      : 'Spring';

  const logoStoragePath = String(raw.logoStoragePath || '').trim();
  const resolvedDownloadUrl = resolveRenderableUniversityLogoUrl(
    raw.logoDownloadUrl,
    logoStoragePath
  );
  if (!resolvedDownloadUrl || !logoStoragePath) {
    return {
      ok: false,
      status: 400,
      error: 'Official university logo upload is required before saving.',
    };
  }

  const id =
    String(raw.id || '').trim() ||
    `udl_${universityId}_${intake.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Duplicate check: prevent duplicate (universityId + admissionIntake + applicationDeadline)
  for (const existingRec of deadlinesMapStore.values()) {
    if (existingRec.id === id) continue;
    if (
      existingRec.universityId.toLowerCase() === universityId.toLowerCase() &&
      existingRec.admissionIntake === intake &&
      existingRec.applicationDeadline === applicationDeadline
    ) {
      return {
        ok: false,
        status: 409,
        error: `A ${intake} intake deadline on ${applicationDeadline} already exists for ${universityName}. Edit the existing entry or select another intake.`,
      };
    }
  }

  const existing = deadlinesMapStore.get(id);
  const nowIso = new Date().toISOString();
  const publicationStatus =
    raw.publicationStatus === 'unpublished' || raw.published === false
      ? 'unpublished'
      : 'published';
  const published = publicationStatus === 'published';

  const nextOrder =
    typeof raw.displayOrder === 'number' && raw.displayOrder > 0
      ? Math.min(Math.round(raw.displayOrder), 10000)
      : existing?.displayOrder || deadlinesMapStore.size + 1;

  const mime =
    raw.logoMimeType &&
    ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(raw.logoMimeType)
      ? raw.logoMimeType
      : 'image/png';

  const fallbackCandidate = isBoundedImageDataUrl(raw.logoFallbackDataUrl, 250_000)
    ? raw.logoFallbackDataUrl!.trim()
    : existing &&
      existing.logoStoragePath === logoStoragePath &&
      isBoundedImageDataUrl(existing.logoFallbackDataUrl, 250_000)
    ? existing.logoFallbackDataUrl
    : undefined;

  const saved: UniversityAdmissionDeadlineRecord = {
    id,
    universityId,
    universityName,
    logoStoragePath: logoStoragePath.slice(0, 500),
    logoDownloadUrl: resolvedDownloadUrl.slice(0, 2048),
    ...(fallbackCandidate ? { logoFallbackDataUrl: fallbackCandidate } : {}),
    logoFileName: String(raw.logoFileName || 'official-logo.png').trim().slice(0, 200),
    logoMimeType: mime,
    logoFileSize: Math.min(Math.max(0, Number(raw.logoFileSize) || 0), 5_242_880),
    admissionIntake: intake,
    ...(typeof raw.intakeLabel === 'string' && raw.intakeLabel.trim()
      ? { intakeLabel: raw.intakeLabel.trim().slice(0, 80) }
      : {}),
    applicationDeadline,
    deadlineTimestampMs,
    publicationStatus,
    published,
    displayOrder: nextOrder,
    createdAt: existing?.createdAt || String(raw.createdAt || nowIso),
    updatedAt: nowIso,
    createdByUid: existing?.createdByUid || params.adminUid,
    createdByEmail: existing?.createdByEmail || params.adminEmail,
    updatedByUid: params.adminUid,
    updatedByEmail: params.adminEmail,
  };

  const previousLogo =
    existing &&
    (existing.logoStoragePath !== saved.logoStoragePath ||
      existing.logoDownloadUrl !== saved.logoDownloadUrl)
      ? {
          logoStoragePath: existing.logoStoragePath,
          logoDownloadUrl: existing.logoDownloadUrl,
        }
      : null;

  deadlinesMapStore.set(id, saved);
  rehydrateRecordLogoToDiskAndStore(saved);

  // Remove from deletedIds if re-created with same ID
  if (carouselConfigStore.deletedIds?.includes(id)) {
    carouselConfigStore = {
      ...carouselConfigStore,
      deletedIds: carouselConfigStore.deletedIds.filter((d) => d !== id),
      updatedAt: nowIso,
    };
  }

  if (previousLogo) {
    cleanupUnreferencedDeadlineLogoServer({
      logoStoragePath: previousLogo.logoStoragePath,
      logoDownloadUrl: previousLogo.logoDownloadUrl,
    });
  }

  persistStoreToDisk();
  persistLogoAssetsToDisk();
  return {
    ok: true,
    deadline: saved,
    allDeadlines: getSortedDeadlinesList(),
  };
}

export function deleteUniversityDeadlineServer(params: {
  id: string;
  adminUid: string;
  adminEmail: string;
}):
  | {
      ok: true;
      deletedId: string;
      logoSafeToDeleteFromStorage: boolean;
      config: UniversityDeadlineCarouselConfig;
    }
  | {
      ok: false;
      status: number;
      error: string;
    } {
  const id = String(params.id || '').trim();
  const existing = deadlinesMapStore.get(id);
  if (!existing) {
    return { ok: false, status: 404, error: 'Deadline record not found.' };
  }

  deadlinesMapStore.delete(id);

  const cleanup = cleanupUnreferencedDeadlineLogoServer({
    logoStoragePath: existing.logoStoragePath,
    logoDownloadUrl: existing.logoDownloadUrl,
  });

  const nowIso = new Date().toISOString();
  const deletedSet = new Set<string>(carouselConfigStore.deletedIds || []);
  deletedSet.add(id);

  carouselConfigStore = {
    ...carouselConfigStore,
    initialized: true,
    deletedIds: Array.from(deletedSet),
    updatedAt: nowIso,
    updatedByUid: params.adminUid,
    updatedByEmail: params.adminEmail,
  };

  persistStoreToDisk();

  return {
    ok: true,
    deletedId: id,
    logoSafeToDeleteFromStorage:
      cleanup.remainingReferences === 0 &&
      existing.logoStoragePath.startsWith('university-deadlines/'),
    config: carouselConfigStore,
  };
}

export function reorderUniversityDeadlinesServer(params: {
  deadlines: Array<{ id: string }>;
  adminUid: string;
  adminEmail: string;
}): UniversityAdmissionDeadlineRecord[] {
  const nowIso = new Date().toISOString();
  params.deadlines.forEach((item, index) => {
    if (!item?.id) return;
    const existing = deadlinesMapStore.get(item.id);
    if (existing) {
      deadlinesMapStore.set(item.id, {
        ...existing,
        displayOrder: index + 1,
        updatedAt: nowIso,
        updatedByUid: params.adminUid,
        updatedByEmail: params.adminEmail,
      });
    }
  });
  persistStoreToDisk();
  return getSortedDeadlinesList();
}

export function updateUniversityDeadlineCarouselSettingsServer(params: {
  carouselEnabled: boolean;
  adminUid: string;
  adminEmail: string;
}): UniversityDeadlineCarouselConfig {
  const nowIso = new Date().toISOString();
  carouselConfigStore = {
    ...carouselConfigStore,
    carouselEnabled: Boolean(params.carouselEnabled),
    initialized: true,
    updatedAt: nowIso,
    updatedByUid: params.adminUid,
    updatedByEmail: params.adminEmail,
  };
  persistStoreToDisk();
  return carouselConfigStore;
}

export function syncUniversityDeadlinesFromFirestoreServer(params: {
  config?: Partial<UniversityDeadlineCarouselConfig>;
  deadlines?: UniversityAdmissionDeadlineRecord[];
}): {
  config: UniversityDeadlineCarouselConfig;
  deadlines: UniversityAdmissionDeadlineRecord[];
} {
  let changed = false;

  if (params.config && typeof params.config === 'object') {
    const incomingTime = Date.parse(params.config.updatedAt || '') || 0;
    const currentTime = Date.parse(carouselConfigStore.updatedAt || '') || 0;
    if (incomingTime > currentTime) {
      carouselConfigStore = {
        ...carouselConfigStore,
        ...params.config,
        initialized: true,
        deletedIds: Array.from(
          new Set([
            ...(carouselConfigStore.deletedIds || []),
            ...(Array.isArray(params.config.deletedIds) ? params.config.deletedIds : []),
          ])
        ),
      };
      changed = true;
    }
  }

  const deletedSet = new Set<string>(carouselConfigStore.deletedIds || []);
  for (const delId of deletedSet) {
    if (deadlinesMapStore.has(delId)) {
      deadlinesMapStore.delete(delId);
      changed = true;
    }
  }

  if (Array.isArray(params.deadlines)) {
    for (const item of params.deadlines) {
      if (!item?.id || deletedSet.has(item.id)) continue;
      const existing = deadlinesMapStore.get(item.id);
      const eTime = existing ? Date.parse(existing.updatedAt || '') || 0 : 0;
      const iTime = Date.parse(item.updatedAt || '') || 0;
      if (!existing || iTime > eTime) {
        const sanitizedItem: UniversityAdmissionDeadlineRecord = {
          ...item,
          logoDownloadUrl: resolveRenderableUniversityLogoUrl(
            item.logoDownloadUrl,
            item.logoStoragePath
          ),
        };
        deadlinesMapStore.set(item.id, sanitizedItem);
        rehydrateRecordLogoToDiskAndStore(sanitizedItem);
        changed = true;
      } else if (existing) {
        rehydrateRecordLogoToDiskAndStore(existing);
      }
    }
  }

  if (changed) {
    persistStoreToDisk();
    persistLogoAssetsToDisk();
  }

  return {
    config: carouselConfigStore,
    deadlines: getSortedDeadlinesList(),
  };
}
