import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  db,
  auth,
  storage,
  ensureFirebaseAuthInitialized,
  sanitizeFirestorePayload,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  isFirebaseConfigured,
  getVerifiedAdminRequestHeaders,
  appendAuditLogToFirestore,
} from './firebaseService';
import type {
  UniversityAdmissionDeadlineRecord,
  UniversityDeadlineCarouselConfig,
} from '../types';
import {
  DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG,
  VERIFIED_SEED_UNIVERSITY_DEADLINES,
  getDeadlineEndOfDayKstMs,
  isBoundedImageDataUrl,
  resolveRenderableUniversityLogoUrl,
  slugifyUniversityStorageSegment,
  validateAndSanitizeUniversityLogoFile,
} from '../utils/universityDeadlineUtils';

export const UNIVERSITY_DEADLINES_COLLECTION = 'university_admission_deadlines';
export const UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH = 'university_deadline_carousel';
const LOCAL_DEADLINES_CACHE_KEY = 'everykr_university_admission_deadlines_v1';
const LOCAL_DEADLINES_CONFIG_KEY = 'everykr_university_deadline_carousel_cfg_v1';

function readLocalCache<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocalCache<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function emitDeadlinesUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('everykr-university-deadlines-updated'));
  }
}

async function buildAuthorizedHeaders(includeJson = true): Promise<Record<string, string>> {
  return getVerifiedAdminRequestHeaders(undefined, includeJson);
}

export function normalizeDeadlineRecord(
  raw: Partial<UniversityAdmissionDeadlineRecord> & { id: string }
): UniversityAdmissionDeadlineRecord {
  const nowIso = new Date().toISOString();
  const publicationStatus =
    raw.publicationStatus === 'unpublished' || raw.published === false
      ? 'unpublished'
      : 'published';
  const published = publicationStatus === 'published';
  const applicationDeadline = String(raw.applicationDeadline || '2026-12-04').slice(0, 10);
  const deadlineTimestampMs =
    typeof raw.deadlineTimestampMs === 'number' && raw.deadlineTimestampMs > 0
      ? raw.deadlineTimestampMs
      : getDeadlineEndOfDayKstMs(applicationDeadline) || Date.now() + 86_400_000;

  const intake =
    raw.admissionIntake === 'Spring' || raw.admissionIntake === 'Fall' || raw.admissionIntake === 'Other'
      ? raw.admissionIntake
      : 'Spring';

  const mime =
    raw.logoMimeType &&
    ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(raw.logoMimeType)
      ? raw.logoMimeType
      : 'image/png';

  const resolvedLogoUrl = resolveRenderableUniversityLogoUrl(
    raw.logoDownloadUrl,
    raw.logoStoragePath
  ).slice(0, 2048);

  const record: UniversityAdmissionDeadlineRecord = {
    id: String(raw.id).trim().slice(0, 128),
    universityId: String(raw.universityId || slugifyUniversityStorageSegment(raw.universityName || raw.id)).slice(0, 128),
    universityName: String(raw.universityName || 'University').trim().slice(0, 160),
    logoStoragePath: String(raw.logoStoragePath || 'official-assets/logo.png').trim().slice(0, 500),
    logoDownloadUrl: resolvedLogoUrl,
    ...(isBoundedImageDataUrl(raw.logoFallbackDataUrl, 250_000)
      ? { logoFallbackDataUrl: raw.logoFallbackDataUrl!.trim() }
      : {}),
    logoFileName: String(raw.logoFileName || 'logo.png').trim().slice(0, 200),
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
    displayOrder: Math.min(Math.max(0, Number(raw.displayOrder) || 1), 10000),
    createdAt: String(raw.createdAt || nowIso).slice(0, 64),
    updatedAt: String(raw.updatedAt || nowIso).slice(0, 64),
    createdByUid: String(raw.createdByUid || 'admin').slice(0, 128),
    createdByEmail: String(raw.createdByEmail || 'admin@everykr.com').slice(0, 254),
    updatedByUid: String(raw.updatedByUid || raw.createdByUid || 'admin').slice(0, 128),
    updatedByEmail: String(raw.updatedByEmail || raw.createdByEmail || 'admin@everykr.com').slice(0, 254),
  };

  return record;
}

export function sortDeadlineRecords(
  records: UniversityAdmissionDeadlineRecord[]
): UniversityAdmissionDeadlineRecord[] {
  return [...records].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    if (a.deadlineTimestampMs !== b.deadlineTimestampMs) {
      return a.deadlineTimestampMs - b.deadlineTimestampMs;
    }
    return a.universityName.localeCompare(b.universityName);
  });
}

function isFirestorePermissionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('permission-denied')
  );
}

function reportFirestoreErrorSafely(
  err: unknown,
  op: OperationType,
  path: string
): void {
  if (isFirestorePermissionError(err)) {
    try {
      handleFirestoreError(err, op, path);
    } catch {
      // Structured FirestoreErrorInfo was logged to console.error by handleFirestoreError;
      // catch here when falling back to verified backend API so UI remains resilient.
    }
  }
}

/**
 * Fetches public published deadlines + carouselEnabled setting for the Homepage Carousel.
 */
export async function fetchPublicUniversityDeadlines(): Promise<{
  config: UniversityDeadlineCarouselConfig;
  deadlines: UniversityAdmissionDeadlineRecord[];
}> {
  let serverConfig: UniversityDeadlineCarouselConfig | null = null;
  let serverDeadlines: UniversityAdmissionDeadlineRecord[] | null = null;

  try {
    const res = await fetch('/api/cms/university-deadlines?scope=public', {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.config) {
        serverConfig = data.config as UniversityDeadlineCarouselConfig;
      }
      if (Array.isArray(data?.deadlines)) {
        serverDeadlines = data.deadlines.map((d: any) => normalizeDeadlineRecord(d));
      }
    }
  } catch {
    // fall through to Firestore / local cache
  }

  let firestoreConfig: UniversityDeadlineCarouselConfig | null = null;
  let firestoreDeadlines: UniversityAdmissionDeadlineRecord[] | null = null;

  if (isFirebaseConfigured && db) {
    try {
      const [cfgSnap, listSnap] = await Promise.all([
        getDoc(doc(db, 'site_settings', UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH)),
        getDocs(
          query(
            collection(db, UNIVERSITY_DEADLINES_COLLECTION),
            where('published', '==', true),
            where('publicationStatus', '==', 'published')
          )
        ),
      ]);

      if (cfgSnap.exists()) {
        firestoreConfig = cfgSnap.data() as UniversityDeadlineCarouselConfig;
      }

      if (!listSnap.empty) {
        const items: UniversityAdmissionDeadlineRecord[] = [];
        listSnap.forEach((d) => {
          const data = d.data() as UniversityAdmissionDeadlineRecord;
          items.push(normalizeDeadlineRecord({ ...data, id: data.id || d.id }));
        });
        firestoreDeadlines = items;
      } else if (firestoreConfig?.initialized) {
        firestoreDeadlines = [];
      }
    } catch (err) {
      reportFirestoreErrorSafely(err, OperationType.LIST, UNIVERSITY_DEADLINES_COLLECTION);
    }
  }

  // Merge freshest configuration
  let finalConfig = DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG;
  if (serverConfig && firestoreConfig) {
    const sTime = Date.parse(serverConfig.updatedAt || '') || 0;
    const fTime = Date.parse(firestoreConfig.updatedAt || '') || 0;
    finalConfig = fTime > sTime ? firestoreConfig : serverConfig;
  } else if (serverConfig) {
    finalConfig = serverConfig;
  } else if (firestoreConfig) {
    finalConfig = firestoreConfig;
  } else {
    finalConfig = readLocalCache(
      LOCAL_DEADLINES_CONFIG_KEY,
      DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG
    );
  }

  const deletedSet = new Set<string>(finalConfig.deletedIds || []);

  // Merge deadlines from Server + Firestore, keeping newest updatedAt per ID and honoring deletedIds
  const merged = new Map<string, UniversityAdmissionDeadlineRecord>();
  if (serverDeadlines) {
    for (const item of serverDeadlines) {
      if (!deletedSet.has(item.id) && item.published && item.publicationStatus === 'published') {
        merged.set(item.id, item);
      }
    }
  }
  if (firestoreDeadlines) {
    for (const item of firestoreDeadlines) {
      if (deletedSet.has(item.id)) continue;
      if (!item.published || item.publicationStatus !== 'published') continue;
      const existing = merged.get(item.id);
      if (!existing) {
        merged.set(item.id, item);
      } else {
        const eTime = Date.parse(existing.updatedAt || '') || 0;
        const iTime = Date.parse(item.updatedAt || '') || 0;
        if (iTime >= eTime) {
          merged.set(item.id, item);
        }
      }
    }
  }

  if (!serverDeadlines && !firestoreDeadlines) {
    const fallback = readLocalCache<UniversityAdmissionDeadlineRecord[]>(
      LOCAL_DEADLINES_CACHE_KEY,
      VERIFIED_SEED_UNIVERSITY_DEADLINES
    );
    for (const item of fallback) {
      if (!deletedSet.has(item.id) && item.published && item.publicationStatus === 'published') {
        merged.set(item.id, normalizeDeadlineRecord(item));
      }
    }
  }

  const deadlines = sortDeadlineRecords(Array.from(merged.values()));
  return { config: finalConfig, deadlines };
}

/**
 * Fetches full admin deadline list (both published and unpublished) + carousel configuration.
 */
export async function fetchAdminUniversityDeadlines(): Promise<{
  config: UniversityDeadlineCarouselConfig;
  deadlines: UniversityAdmissionDeadlineRecord[];
}> {
  let serverConfig: UniversityDeadlineCarouselConfig | null = null;
  let serverDeadlines: UniversityAdmissionDeadlineRecord[] | null = null;

  try {
    const headers = await buildAuthorizedHeaders(false);
    const res = await fetch('/api/cms/university-deadlines?scope=admin', {
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.config) {
        serverConfig = data.config as UniversityDeadlineCarouselConfig;
      }
      if (Array.isArray(data?.deadlines)) {
        serverDeadlines = data.deadlines.map((d: any) => normalizeDeadlineRecord(d));
      }
    }
  } catch {
    // fall through
  }

  let firestoreConfig: UniversityDeadlineCarouselConfig | null = null;
  let firestoreDeadlines: UniversityAdmissionDeadlineRecord[] | null = null;

  if (isFirebaseConfigured) {
    await ensureFirebaseAuthInitialized(1500).catch(() => undefined);
  }

  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      const [cfgSnap, allSnap] = await Promise.all([
        getDoc(doc(db, 'site_settings', UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH)),
        getDocs(collection(db, UNIVERSITY_DEADLINES_COLLECTION)),
      ]);

      if (cfgSnap.exists()) {
        firestoreConfig = cfgSnap.data() as UniversityDeadlineCarouselConfig;
      }

      if (!allSnap.empty) {
        const list: UniversityAdmissionDeadlineRecord[] = [];
        allSnap.forEach((d) => {
          const data = d.data() as UniversityAdmissionDeadlineRecord;
          list.push(normalizeDeadlineRecord({ ...data, id: data.id || d.id }));
        });
        firestoreDeadlines = list;
      } else if (serverDeadlines && serverDeadlines.length > 0) {
        // Seed initial verified deadlines into Firestore once if admin is authenticated and Firestore is empty
        try {
          const batch = writeBatch(db);
          for (const rec of serverDeadlines) {
            batch.set(
              doc(db, UNIVERSITY_DEADLINES_COLLECTION, rec.id),
              sanitizeFirestorePayload(rec)
            );
          }
          batch.set(
            doc(db, 'site_settings', UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH),
            sanitizeFirestorePayload(serverConfig || DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG)
          );
          await batch.commit();
        } catch {
          // non-fatal if current session uses server cookie without Firebase Auth custom token
        }
      }
    } catch (err) {
      reportFirestoreErrorSafely(err, OperationType.LIST, UNIVERSITY_DEADLINES_COLLECTION);
    }
  }

  let finalConfig = DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG;
  if (serverConfig && firestoreConfig) {
    const sTime = Date.parse(serverConfig.updatedAt || '') || 0;
    const fTime = Date.parse(firestoreConfig.updatedAt || '') || 0;
    finalConfig = fTime > sTime ? firestoreConfig : serverConfig;
  } else if (serverConfig) {
    finalConfig = serverConfig;
  } else if (firestoreConfig) {
    finalConfig = firestoreConfig;
  }

  const deletedSet = new Set<string>(finalConfig.deletedIds || []);
  const merged = new Map<string, UniversityAdmissionDeadlineRecord>();

  if (serverDeadlines) {
    for (const item of serverDeadlines) {
      if (!deletedSet.has(item.id)) {
        merged.set(item.id, item);
      }
    }
  }

  if (firestoreDeadlines) {
    for (const item of firestoreDeadlines) {
      if (deletedSet.has(item.id)) continue;
      const existing = merged.get(item.id);
      if (!existing) {
        merged.set(item.id, item);
      } else {
        const eTime = Date.parse(existing.updatedAt || '') || 0;
        const iTime = Date.parse(item.updatedAt || '') || 0;
        if (iTime >= eTime) {
          merged.set(item.id, item);
        }
      }
    }
  }

  if (!serverDeadlines && !firestoreDeadlines) {
    const cached = readLocalCache<UniversityAdmissionDeadlineRecord[]>(
      LOCAL_DEADLINES_CACHE_KEY,
      VERIFIED_SEED_UNIVERSITY_DEADLINES
    );
    for (const item of cached) {
      if (!deletedSet.has(item.id)) {
        merged.set(item.id, normalizeDeadlineRecord(item));
      }
    }
  }

  const deadlines = sortDeadlineRecords(Array.from(merged.values()));
  writeLocalCache(LOCAL_DEADLINES_CACHE_KEY, deadlines);
  writeLocalCache(LOCAL_DEADLINES_CONFIG_KEY, finalConfig);

  // Sync Firestore -> Server if Firestore had fresher updates
  if (firestoreDeadlines && firestoreDeadlines.length > 0) {
    buildAuthorizedHeaders(true)
      .then((headers) =>
        fetch('/api/cms/university-deadlines/sync-from-firestore', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ config: finalConfig, deadlines }),
        })
      )
      .catch(() => {});
  }

  return { config: finalConfig, deadlines };
}

/**
 * Real-time public subscription for the Homepage University Admission Deadline Carousel.
 * Subscribes via Firestore `onSnapshot` (strictly querying published records to satisfy
 * zero-trust security rules) + custom event + window focus refresh.
 */
export function subscribePublicUniversityDeadlines(
  onUpdate: (payload: {
    config: UniversityDeadlineCarouselConfig;
    deadlines: UniversityAdmissionDeadlineRecord[];
  }) => void
): () => void {
  let active = true;
  let unsubList: (() => void) | undefined;
  let unsubSettings: (() => void) | undefined;

  const refresh = async () => {
    const latest = await fetchPublicUniversityDeadlines();
    if (active) {
      onUpdate(latest);
    }
  };

  refresh();

  if (isFirebaseConfigured && db) {
    try {
      const publicQuery = query(
        collection(db, UNIVERSITY_DEADLINES_COLLECTION),
        where('published', '==', true),
        where('publicationStatus', '==', 'published')
      );

      unsubList = onSnapshot(
        publicQuery,
        () => {
          if (active) {
            refresh();
          }
        },
        (err) => {
          reportFirestoreErrorSafely(err, OperationType.LIST, UNIVERSITY_DEADLINES_COLLECTION);
        }
      );

      unsubSettings = onSnapshot(
        doc(db, 'site_settings', UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH),
        () => {
          if (active) {
            refresh();
          }
        },
        (err) => {
          reportFirestoreErrorSafely(
            err,
            OperationType.GET,
            `site_settings/${UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH}`
          );
        }
      );
    } catch {
      // fallback handled by refresh()
    }
  }

  const handleCustomEvent = () => {
    refresh();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('everykr-university-deadlines-updated', handleCustomEvent);
    window.addEventListener('focus', handleCustomEvent);
  }

  return () => {
    active = false;
    if (unsubList) unsubList();
    if (unsubSettings) unsubSettings();
    if (typeof window !== 'undefined') {
      window.removeEventListener('everykr-university-deadlines-updated', handleCustomEvent);
      window.removeEventListener('focus', handleCustomEvent);
    }
  };
}

/**
 * Real-time admin subscription for Homepage CMS -> University Admission Deadlines.
 */
export function subscribeAdminUniversityDeadlines(
  onUpdate: (payload: {
    config: UniversityDeadlineCarouselConfig;
    deadlines: UniversityAdmissionDeadlineRecord[];
  }) => void
): () => void {
  let active = true;
  let unsubAll: (() => void) | undefined;
  let unsubSettings: (() => void) | undefined;

  const refresh = async () => {
    const latest = await fetchAdminUniversityDeadlines();
    if (active) {
      onUpdate(latest);
    }
  };

  refresh();

  if (isFirebaseConfigured && db) {
    ensureFirebaseAuthInitialized(1500)
      .then(() => {
        if (!active || !auth?.currentUser) return;
        try {
          unsubAll = onSnapshot(
            collection(db, UNIVERSITY_DEADLINES_COLLECTION),
            () => {
              if (active) refresh();
            },
            (err) => {
              reportFirestoreErrorSafely(err, OperationType.LIST, UNIVERSITY_DEADLINES_COLLECTION);
            }
          );

          unsubSettings = onSnapshot(
            doc(db, 'site_settings', UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH),
            () => {
              if (active) refresh();
            },
            (err) => {
              reportFirestoreErrorSafely(
                err,
                OperationType.GET,
                `site_settings/${UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH}`
              );
            }
          );
        } catch {
          // fallback handled by refresh()
        }
      })
      .catch(() => {});
  }

  const handleCustomEvent = () => {
    refresh();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('everykr-university-deadlines-updated', handleCustomEvent);
  }

  return () => {
    active = false;
    if (unsubAll) unsubAll();
    if (unsubSettings) unsubSettings();
    if (typeof window !== 'undefined') {
      window.removeEventListener('everykr-university-deadlines-updated', handleCustomEvent);
    }
  };
}

function verifyBrowserImageUrlLoads(url: string, timeoutMs = 4500): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  if (typeof Image === 'undefined') return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      finish(true);
    };
    img.onerror = () => {
      finish(false);
    };
    img.src = url;
  });
}

export interface UploadedUniversityLogoResult {
  logoStoragePath: string;
  logoDownloadUrl: string;
  logoFallbackDataUrl?: string;
  logoFileName: string;
  logoMimeType: string;
  logoFileSize: number;
  previewDataUrl: string;
}

/**
 * Uploads an official university logo directly from the administrator's computer:
 * 1. Validates file format (PNG, JPG, JPEG, WebP, or strictly sanitized SVG) and binary headers.
 * 2. Uploads to Firebase Storage folder `university-deadlines/{universitySlug}/{timestamp}_{fileName}`
 *    with real-time progress updates (0% - 100%) and verifies browser image reachability.
 * 3. Persists & mirrors via verified admin backend endpoint `/api/admin/university-deadlines/upload-logo`
 *    so server-side validation, SVG sanitization, static + API serving, and cross-instance resilience are guaranteed.
 */
export async function uploadUniversityDeadlineLogoFromComputer(params: {
  file: File;
  universityIdOrName: string;
  onProgress?: (percent: number) => void;
}): Promise<UploadedUniversityLogoResult> {
  const { file, universityIdOrName, onProgress } = params;
  onProgress?.(5);

  // Step 1: Client-side validation, SVG DOM sanitization & compact fallback generation
  const validated = await validateAndSanitizeUniversityLogoFile(file);
  onProgress?.(18);

  const uniSlug = slugifyUniversityStorageSegment(universityIdOrName || 'university');
  const storagePath = `university-deadlines/${uniSlug}/${Date.now()}_${validated.cleanFileName}`;

  let firebaseDownloadUrl = '';

  if (isFirebaseConfigured) {
    await ensureFirebaseAuthInitialized(1500).catch(() => undefined);
  }

  // Step 2: Upload to Firebase Storage (`university-deadlines/...`) when Firebase Auth admin session is active
  if (isFirebaseConfigured && storage && auth?.currentUser) {
    try {
      const candidateStorageUrl = await new Promise<string>((resolve, reject) => {
        const fileRef = storageRef(storage, storagePath);
        const task = uploadBytesResumable(fileRef, validated.sanitizedBlob, {
          contentType: validated.mimeType,
          cacheControl: 'public,max-age=31536000',
        });

        const safetyTimer = setTimeout(() => {
          task.cancel();
          reject(new Error('Storage upload timed out; switching to verified server storage mirror.'));
        }, 12000);

        task.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const ratio = snapshot.bytesTransferred / snapshot.totalBytes;
              onProgress?.(Math.round(18 + ratio * 60));
            }
          },
          (err) => {
            clearTimeout(safetyTimer);
            reject(err);
          },
          async () => {
            clearTimeout(safetyTimer);
            try {
              const url = await getDownloadURL(task.snapshot.ref);
              resolve(url);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });

      // Verify the Firebase Storage download URL actually decodes in browser (guards against Storage rules 403)
      const decodesCleanly = await verifyBrowserImageUrlLoads(candidateStorageUrl, 3500);
      if (decodesCleanly) {
        firebaseDownloadUrl = candidateStorageUrl;
      }
    } catch {
      // Fallback to verified admin server upload endpoint below
      onProgress?.(65);
    }
  } else {
    onProgress?.(55);
  }

  // Step 3: Verified server-side validation, SVG sanitization, and durable asset write
  const headers = await buildAuthorizedHeaders(true);
  const res = await fetch('/api/admin/university-deadlines/upload-logo', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      dataUrl: validated.dataUrl,
      compactFallbackDataUrl: validated.compactFallbackDataUrl,
      fileName: validated.cleanFileName,
      universityId: uniSlug,
      storagePath,
      ...(firebaseDownloadUrl ? { storageDownloadUrl: firebaseDownloadUrl } : {}),
    }),
  });

  onProgress?.(92);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(
      data?.error || data?.message || 'Failed to upload university logo. Please verify administrator permissions.'
    );
  }

  const finalStoragePath = String(data.logoStoragePath || storagePath);
  const finalDownloadUrl = resolveRenderableUniversityLogoUrl(
    String(data.logoDownloadUrl || firebaseDownloadUrl),
    finalStoragePath
  );
  const finalFallbackDataUrl = isBoundedImageDataUrl(data.logoFallbackDataUrl, 250_000)
    ? String(data.logoFallbackDataUrl).trim()
    : isBoundedImageDataUrl(validated.compactFallbackDataUrl, 250_000)
    ? validated.compactFallbackDataUrl
    : undefined;

  // Verify primary download URL renders cleanly in browser before finalizing upload
  const primaryLoads = await verifyBrowserImageUrlLoads(finalDownloadUrl, 4500);
  if (!primaryLoads && !finalFallbackDataUrl) {
    throw new Error(
      'Uploaded university logo could not be verified for browser rendering. Please try uploading a PNG, JPG, WebP, or SVG logo again.'
    );
  }

  onProgress?.(100);

  return {
    logoStoragePath: finalStoragePath,
    logoDownloadUrl: finalDownloadUrl,
    ...(finalFallbackDataUrl ? { logoFallbackDataUrl: finalFallbackDataUrl } : {}),
    logoFileName: String(data.logoFileName || validated.cleanFileName),
    logoMimeType: String(data.logoMimeType || validated.mimeType),
    logoFileSize: Number(data.logoFileSize || validated.byteSize),
    previewDataUrl: validated.dataUrl,
  };
}

/**
 * Safely deletes an unreferenced logo from Firebase Storage & server uploads
 * ONLY if zero active/draft deadline records reference it and it is NOT a built-in asset.
 */
export async function cleanupUnreferencedUniversityLogo(params: {
  logoStoragePath?: string;
  logoDownloadUrl?: string;
  allRecords?: UniversityAdmissionDeadlineRecord[];
}): Promise<void> {
  const pathVal = String(params.logoStoragePath || '').trim();
  const urlVal = String(params.logoDownloadUrl || '').trim();

  if (!pathVal && !urlVal) return;
  if (pathVal.startsWith('official-assets/') || urlVal.startsWith('/assets/university-logos/')) {
    return;
  }

  const records = params.allRecords || [];
  const stillReferenced = records.some(
    (r) =>
      (pathVal && r.logoStoragePath === pathVal) ||
      (urlVal && r.logoDownloadUrl === urlVal)
  );
  if (stillReferenced) return;

  if (isFirebaseConfigured) {
    await ensureFirebaseAuthInitialized(1500).catch(() => undefined);
  }

  if (isFirebaseConfigured && storage && auth?.currentUser && pathVal.startsWith('university-deadlines/')) {
    try {
      await deleteObject(storageRef(storage, pathVal));
    } catch {
      // ignore if object was stored only via server upload mirror or already deleted
    }
  }

  try {
    const headers = await buildAuthorizedHeaders(true);
    await fetch('/api/admin/university-deadlines/cleanup-logo', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        logoStoragePath: pathVal,
        logoDownloadUrl: urlVal,
      }),
    });
  } catch {
    // non-fatal cleanup error
  }
}

/**
 * Creates or updates a University Admission Deadline record in both Backend API and Firestore.
 */
export async function saveUniversityAdmissionDeadline(params: {
  record: Partial<UniversityAdmissionDeadlineRecord> & {
    universityId: string;
    universityName: string;
    logoStoragePath: string;
    logoDownloadUrl: string;
    logoFileName: string;
    logoMimeType: string;
    logoFileSize: number;
    admissionIntake: UniversityAdmissionDeadlineRecord['admissionIntake'];
    applicationDeadline: string;
  };
  adminActor: { uid: string; name: string; email: string };
  previousLogoToCleanup?: { logoStoragePath: string; logoDownloadUrl: string } | null;
}): Promise<UniversityAdmissionDeadlineRecord> {
  const { record, adminActor, previousLogoToCleanup } = params;
  const nowIso = new Date().toISOString();
  const isCreate = !record.id;
  const generatedId =
    record.id ||
    `udl_${slugifyUniversityStorageSegment(record.universityId || record.universityName)}_${record.admissionIntake.toLowerCase()}_${Date.now()}`;

  const normalized = normalizeDeadlineRecord({
    ...record,
    id: generatedId,
    deadlineTimestampMs: getDeadlineEndOfDayKstMs(record.applicationDeadline),
    createdAt: record.createdAt || nowIso,
    updatedAt: nowIso,
    createdByUid: record.createdByUid || adminActor.uid || 'admin',
    createdByEmail: record.createdByEmail || adminActor.email || 'admin@everykr.com',
    updatedByUid: adminActor.uid || 'admin',
    updatedByEmail: adminActor.email || 'admin@everykr.com',
  });

  // 1. Save via verified Admin Server API (enforces duplicate guard, schema validation, and disk persistence)
  const headers = await buildAuthorizedHeaders(true);
  const res = await fetch('/api/admin/university-deadlines', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ deadline: normalized }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Failed to save university admission deadline.');
  }

  const savedRecord = normalizeDeadlineRecord(data.deadline || normalized);

  // 2. Write to Firestore (`university_admission_deadlines/{id}`)
  if (isFirebaseConfigured) {
    await ensureFirebaseAuthInitialized(1500).catch(() => undefined);
  }
  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      await setDoc(
        doc(db, UNIVERSITY_DEADLINES_COLLECTION, savedRecord.id),
        sanitizeFirestorePayload(savedRecord)
      );
    } catch (err) {
      reportFirestoreErrorSafely(
        err,
        isCreate ? OperationType.CREATE : OperationType.UPDATE,
        `${UNIVERSITY_DEADLINES_COLLECTION}/${savedRecord.id}`
      );
    }
  }

  // 3. Clean up replaced logo if unreferenced
  if (
    previousLogoToCleanup &&
    (previousLogoToCleanup.logoStoragePath !== savedRecord.logoStoragePath ||
      previousLogoToCleanup.logoDownloadUrl !== savedRecord.logoDownloadUrl)
  ) {
    const allAfter = Array.isArray(data?.allDeadlines)
      ? data.allDeadlines.map((d: any) => normalizeDeadlineRecord(d))
      : [];
    await cleanupUnreferencedUniversityLogo({
      logoStoragePath: previousLogoToCleanup.logoStoragePath,
      logoDownloadUrl: previousLogoToCleanup.logoDownloadUrl,
      allRecords: allAfter,
    });
  }

  // 4. Audit Log
  appendAuditLogToFirestore({
    id: `audit_udl_${Date.now()}`,
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: isCreate ? 'CREATE' : savedRecord.published ? 'PUBLISH' : 'UNPUBLISH',
    targetEntity: 'UniversityAdmissionDeadline',
    targetId: savedRecord.id,
    targetName: `${savedRecord.universityName} (${savedRecord.admissionIntake})`,
    details: `Deadline: ${savedRecord.applicationDeadline} KST | Status: ${savedRecord.publicationStatus}`,
  }).catch(() => {});

  emitDeadlinesUpdated();
  return savedRecord;
}

/**
 * Deletes a University Admission Deadline record and safely cleans up its logo if unreferenced.
 */
export async function deleteUniversityAdmissionDeadline(params: {
  record: UniversityAdmissionDeadlineRecord;
  adminActor: { uid: string; name: string; email: string };
}): Promise<void> {
  const { record, adminActor } = params;
  const nowIso = new Date().toISOString();

  const headers = await buildAuthorizedHeaders(false);
  const res = await fetch(`/api/admin/university-deadlines/${encodeURIComponent(record.id)}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Failed to delete university admission deadline.');
  }

  if (isFirebaseConfigured) {
    await ensureFirebaseAuthInitialized(1500).catch(() => undefined);
  }

  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, UNIVERSITY_DEADLINES_COLLECTION, record.id));
      if (data?.config) {
        await setDoc(
          doc(db, 'site_settings', UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH),
          sanitizeFirestorePayload(data.config)
        );
      }
    } catch (err) {
      reportFirestoreErrorSafely(
        err,
        OperationType.DELETE,
        `${UNIVERSITY_DEADLINES_COLLECTION}/${record.id}`
      );
    }
  }

  // Delete from client Firebase Storage if server confirmed 0 remaining references
  if (
    data?.logoSafeToDeleteFromStorage &&
    isFirebaseConfigured &&
    storage &&
    auth?.currentUser &&
    record.logoStoragePath.startsWith('university-deadlines/')
  ) {
    try {
      await deleteObject(storageRef(storage, record.logoStoragePath));
    } catch {
      // ignore if already absent
    }
  }

  appendAuditLogToFirestore({
    id: `audit_udl_del_${Date.now()}`,
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'DELETE',
    targetEntity: 'UniversityAdmissionDeadline',
    targetId: record.id,
    targetName: `${record.universityName} (${record.admissionIntake})`,
    details: `Removed deadline (${record.applicationDeadline} KST)`,
  }).catch(() => {});

  emitDeadlinesUpdated();
}

/**
 * Reorders University Admission Deadline records and syncs displayOrder in real time.
 */
export async function reorderUniversityAdmissionDeadlines(params: {
  orderedRecords: UniversityAdmissionDeadlineRecord[];
  adminActor: { uid: string; name: string; email: string };
}): Promise<UniversityAdmissionDeadlineRecord[]> {
  const { orderedRecords, adminActor } = params;
  const nowIso = new Date().toISOString();

  const reindexed = orderedRecords.map((rec, idx) =>
    normalizeDeadlineRecord({
      ...rec,
      displayOrder: idx + 1,
      updatedAt: nowIso,
      updatedByUid: adminActor.uid || 'admin',
      updatedByEmail: adminActor.email || 'admin@everykr.com',
    })
  );

  const headers = await buildAuthorizedHeaders(true);
  const res = await fetch('/api/admin/university-deadlines/reorder', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ deadlines: reindexed }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Failed to reorder university deadlines.');
  }

  if (isFirebaseConfigured) {
    await ensureFirebaseAuthInitialized(1500).catch(() => undefined);
  }

  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      const batch = writeBatch(db);
      for (const rec of reindexed) {
        batch.set(
          doc(db, UNIVERSITY_DEADLINES_COLLECTION, rec.id),
          sanitizeFirestorePayload(rec)
        );
      }
      await batch.commit();
    } catch (err) {
      reportFirestoreErrorSafely(err, OperationType.WRITE, UNIVERSITY_DEADLINES_COLLECTION);
    }
  }

  emitDeadlinesUpdated();
  return reindexed;
}

/**
 * Enables or disables the Homepage University Admission Deadline Carousel globally.
 */
export async function updateUniversityDeadlineCarouselEnabled(params: {
  carouselEnabled: boolean;
  adminActor: { uid: string; name: string; email: string };
}): Promise<UniversityDeadlineCarouselConfig> {
  const { carouselEnabled, adminActor } = params;

  const headers = await buildAuthorizedHeaders(true);
  const res = await fetch('/api/admin/university-deadlines/settings', {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify({ carouselEnabled }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Failed to update homepage carousel visibility.');
  }

  const nextConfig: UniversityDeadlineCarouselConfig = data.config;

  if (isFirebaseConfigured) {
    await ensureFirebaseAuthInitialized(1500).catch(() => undefined);
  }

  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      await setDoc(
        doc(db, 'site_settings', UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH),
        sanitizeFirestorePayload(nextConfig)
      );
    } catch (err) {
      reportFirestoreErrorSafely(
        err,
        OperationType.WRITE,
        `site_settings/${UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH}`
      );
    }
  }

  appendAuditLogToFirestore({
    id: `audit_udl_cfg_${Date.now()}`,
    timestamp: new Date().toISOString(),
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: carouselEnabled ? 'PUBLISH' : 'UNPUBLISH',
    targetEntity: 'SystemSettings',
    targetId: UNIVERSITY_DEADLINE_SETTINGS_DOC_PATH,
    targetName: 'University Admission Deadline Carousel',
    details: `carouselEnabled = ${carouselEnabled}`,
  }).catch(() => {});

  emitDeadlinesUpdated();
  return nextConfig;
}
