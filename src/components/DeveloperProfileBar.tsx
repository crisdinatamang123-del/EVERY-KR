import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  MessageCircle,
  Check,
  Copy,
  ExternalLink,
  Code2,
  MapPin,
  Mail,
  Sparkles,
  X,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, sanitizeFirestorePayload } from '../lib/firebase';
import {
  DEFAULT_DEVELOPER_PROFILE,
  sanitizePublicDeveloperProfile,
  type DeveloperProfileSettings
} from '../utils/developerProfileValidation';

// In-memory runtime snapshot synced from both Firestore (`site_settings/developer_profile`)
// and the Express API (`/api/site-settings/developer-profile`).
let runtimeProfileSnapshot: DeveloperProfileSettings = sanitizePublicDeveloperProfile(
  DEFAULT_DEVELOPER_PROFILE
);
let hasLoadedFromServer = false;

export function isCustomDeveloperPortrait(
  profile?: Partial<DeveloperProfileSettings> | null
): boolean {
  if (!profile) return false;
  const url = typeof profile.profileImageUrl === 'string' ? profile.profileImageUrl.trim() : '';
  const path = typeof profile.profileImagePath === 'string' ? profile.profileImagePath.trim() : '';
  const fallback =
    typeof profile.fallbackImageDataUrl === 'string' ? profile.fallbackImageDataUrl.trim() : '';
  const hasCustomUrl = Boolean(url && url !== DEFAULT_DEVELOPER_PROFILE.profileImageUrl);
  const hasCustomPath = Boolean(path && path !== DEFAULT_DEVELOPER_PROFILE.profileImagePath);
  const hasFallbackData = Boolean(fallback && fallback.startsWith('data:image/'));
  return hasCustomUrl || hasCustomPath || hasFallbackData;
}

/**
 * Selects the authoritative Developer Profile between two sources (e.g. Server vs Firestore),
 * ensuring a custom uploaded portrait or newer timestamp is NEVER overwritten by an unconfigured default.
 */
export function pickAuthoritativeDeveloperProfile(
  primary: DeveloperProfileSettings | null | undefined,
  secondary: DeveloperProfileSettings | null | undefined
): DeveloperProfileSettings {
  if (!primary && !secondary) {
    return sanitizePublicDeveloperProfile(DEFAULT_DEVELOPER_PROFILE);
  }
  if (!primary) return sanitizePublicDeveloperProfile(secondary!);
  if (!secondary) return sanitizePublicDeveloperProfile(primary);

  const pCustomImg = isCustomDeveloperPortrait(primary);
  const sCustomImg = isCustomDeveloperPortrait(secondary);

  // Protect custom image from ever being overwritten by default studio portrait
  if (pCustomImg && !sCustomImg) {
    return sanitizePublicDeveloperProfile(primary);
  }
  if (sCustomImg && !pCustomImg) {
    return sanitizePublicDeveloperProfile(secondary);
  }

  const pTime = primary.updatedAt ? Date.parse(primary.updatedAt) : 0;
  const sTime = secondary.updatedAt ? Date.parse(secondary.updatedAt) : 0;

  if (!Number.isNaN(sTime) && !Number.isNaN(pTime) && sTime > pTime) {
    return sanitizePublicDeveloperProfile({
      ...primary,
      ...secondary,
      fallbackImageDataUrl: secondary.fallbackImageDataUrl || primary.fallbackImageDataUrl
    });
  }

  return sanitizePublicDeveloperProfile({
    ...secondary,
    ...primary,
    fallbackImageDataUrl: primary.fallbackImageDataUrl || secondary.fallbackImageDataUrl
  });
}

export function updateRuntimeDeveloperProfileCache(
  nextProfile: Partial<DeveloperProfileSettings>
): DeveloperProfileSettings {
  const incoming = sanitizePublicDeveloperProfile(nextProfile);
  // Protect existing custom image in runtime cache if incoming is an unconfigured default without explicit reset
  if (
    isCustomDeveloperPortrait(runtimeProfileSnapshot) &&
    !isCustomDeveloperPortrait(incoming) &&
    !incoming.updatedAt
  ) {
    runtimeProfileSnapshot = sanitizePublicDeveloperProfile({
      ...incoming,
      profileImageUrl: runtimeProfileSnapshot.profileImageUrl,
      profileImagePath: runtimeProfileSnapshot.profileImagePath,
      fallbackImageDataUrl: runtimeProfileSnapshot.fallbackImageDataUrl,
      imageUpdatedAt: runtimeProfileSnapshot.imageUpdatedAt
    });
  } else {
    runtimeProfileSnapshot = incoming;
  }
  hasLoadedFromServer = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<DeveloperProfileSettings>('everykr-developer-profile-updated', {
        detail: runtimeProfileSnapshot
      })
    );
  }
  return runtimeProfileSnapshot;
}

export function openDeveloperProfileModal(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-developer-profile-modal'));
  }
}

/**
 * Synchronizes the validated Developer Profile document to Firestore `site_settings/developer_profile`,
 * reads back the saved document to verify persistence, and syncs the server store.
 */
export async function syncDeveloperProfileToFirestore(
  profile: DeveloperProfileSettings,
  adminInfo?: { uid?: string; name?: string }
): Promise<boolean> {
  try {
    const sanitized = sanitizePublicDeveloperProfile(profile);
    const nowIso = sanitized.updatedAt || new Date().toISOString();
    const docRef = doc(db, 'site_settings', 'developer_profile');
    const payload = sanitizeFirestorePayload({
      developerName: sanitized.name,
      name: sanitized.name,
      role: sanitized.role,
      shortBio: sanitized.shortBio,
      detailedBio: sanitized.detailedBio,
      projectTitle: sanitized.projectTitle,
      projectContribution: sanitized.projectContribution,
      biography: {
        shortBio: sanitized.shortBio,
        detailedBio: sanitized.detailedBio,
        projectTitle: sanitized.projectTitle,
        projectContribution: sanitized.projectContribution
      },
      location: sanitized.location,
      profileImagePath: sanitized.profileImagePath,
      profileImageUrl: sanitized.profileImageUrl,
      profileImageAlt: sanitized.profileImageAlt,
      fallbackImageDataUrl: sanitized.fallbackImageDataUrl || '',
      imageUpdatedAt: sanitized.imageUpdatedAt || nowIso,
      imageCrop: sanitized.imageCrop,
      facebookUrl: sanitized.facebookUrl,
      personalWebsiteUrl: sanitized.personalWebsiteUrl,
      kakaoTalkId: sanitized.kakaoTalkId,
      kakaoTalkUrl: sanitized.kakaoTalkUrl,
      linkedinUrl: sanitized.linkedinUrl,
      instagramUrl: sanitized.instagramUrl,
      githubUrl: sanitized.githubUrl,
      contactEmail: sanitized.contactEmail,
      socialLinks: sanitized.socialLinks,
      displaySettings: sanitized.displaySettings,
      version: typeof sanitized.version === 'number' ? sanitized.version : 1,
      updatedAt: nowIso,
      updatedBy: adminInfo?.uid || 'admin',
      updatedByName: adminInfo?.name || 'Administrator'
    });
    await setDoc(docRef, payload, { merge: true });

    // Read back from Firestore to verify permanent persistence
    const verifySnap = await getDoc(docRef);
    if (!verifySnap.exists()) {
      return false;
    }

    // Mirror verified Firestore profile to backend server store
    fetch('/api/site-settings/developer-profile/sync-from-firestore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: { ...sanitized, updatedAt: nowIso },
        updatedAt: nowIso,
        updatedBy: adminInfo?.uid || 'admin',
        updatedByName: adminInfo?.name || 'Administrator'
      })
    }).catch(() => {});

    return true;
  } catch (err) {
    console.warn('Firestore developer_profile sync fallback:', err);
    return false;
  }
}

/**
 * Uploads a cropped/validated developer profile photograph.
 * 1. Uploads to Firebase Storage (`developer-profile/profile-image/{adminUid}/profile.{ext}`) when available.
 * 2. Always persists to `/api/admin/site-settings/developer-profile/upload-photo` with `fallbackImageDataUrl`
 *    so both Firebase Storage and the Express server store are immediately updated and verified.
 */
export async function uploadDeveloperPortraitPhoto(params: {
  dataUrl: string;
  blob?: Blob | null;
  fileName: string;
  mimeType: string;
  authHeaders: Record<string, string>;
  adminUid?: string;
  imageCrop?: DeveloperProfileSettings['imageCrop'];
}): Promise<{
  ok: boolean;
  profileImageUrl?: string;
  profileImagePath?: string;
  fallbackImageDataUrl?: string;
  imageUpdatedAt?: string;
  profile?: DeveloperProfileSettings;
  message?: string;
}> {
  const { dataUrl, blob, fileName, mimeType, authHeaders, adminUid, imageCrop } = params;
  const ext =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
      ? 'webp'
      : 'jpg';
  const safeAdminId =
    (adminUid || 'current').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'current';
  const targetStoragePath = `developer-profile/profile-image/${safeAdminId}/profile.${ext}`;

  let storageDownloadUrl = '';
  let resolvedStoragePath = targetStoragePath;

  // 1. Try Firebase Storage upload (`developer-profile/profile-image/{adminUid}/profile.{ext}`)
  if (blob && storage) {
    try {
      const fileRef = storageRef(storage, targetStoragePath);
      const uploadTask = uploadBytes(fileRef, blob, {
        contentType: mimeType,
        customMetadata: {
          module: 'developer_profile',
          adminUid: safeAdminId,
          uploadedAt: new Date().toISOString()
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Storage upload timeout')), 6000)
      );

      const snapshot = await Promise.race([uploadTask, timeoutPromise]);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      if (downloadUrl && downloadUrl.startsWith('https://')) {
        storageDownloadUrl = downloadUrl;
        resolvedStoragePath = targetStoragePath;
      }
    } catch {
      // Fall through to verified server-side upload endpoint + embedded WebP dataUrl persistence
    }
  }

  // 2. Verified Express Server Upload Endpoint (persists file AND updates server store immediately)
  try {
    const response = await fetch('/api/admin/site-settings/developer-profile/upload-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({
        dataUrl,
        fileName,
        mimeType,
        storageDownloadUrl: storageDownloadUrl || undefined,
        storagePath: resolvedStoragePath,
        imageCrop
      })
    });
    const data = await response.json();
    if (response.ok && data?.ok && (storageDownloadUrl || data.profileImageUrl)) {
      const finalUrl = storageDownloadUrl || data.profileImageUrl;
      const finalPath = data.profileImagePath || resolvedStoragePath;
      const nowIso = data.imageUpdatedAt || new Date().toISOString();
      return {
        ok: true,
        profileImageUrl: finalUrl,
        profileImagePath: finalPath,
        fallbackImageDataUrl: data.fallbackImageDataUrl || dataUrl,
        imageUpdatedAt: nowIso,
        profile: data.profile ? sanitizePublicDeveloperProfile(data.profile) : undefined,
        message:
          data.message ||
          'Developer profile photograph uploaded, saved to Firebase, and verified.'
      };
    }
    if (storageDownloadUrl) {
      const nowIso = new Date().toISOString();
      return {
        ok: true,
        profileImageUrl: storageDownloadUrl,
        profileImagePath: resolvedStoragePath,
        fallbackImageDataUrl: dataUrl,
        imageUpdatedAt: nowIso,
        message: 'Developer profile photograph uploaded to Firebase Storage and verified.'
      };
    }
    return {
      ok: false,
      message: data?.message || 'Failed to upload developer photograph.'
    };
  } catch {
    if (storageDownloadUrl) {
      const nowIso = new Date().toISOString();
      return {
        ok: true,
        profileImageUrl: storageDownloadUrl,
        profileImagePath: resolvedStoragePath,
        fallbackImageDataUrl: dataUrl,
        imageUpdatedAt: nowIso,
        message: 'Developer profile photograph uploaded to Firebase Storage and verified.'
      };
    }
    return {
      ok: false,
      message: 'Network error while uploading developer photograph.'
    };
  }
}

/**
 * Hook that loads the public Developer Profile from both Firestore `site_settings/developer_profile`
 * and `/api/site-settings/developer-profile`, and stays synchronized in real time across browsers.
 */
export function usePublicDeveloperProfile(): {
  profile: DeveloperProfileSettings;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [profile, setProfile] = useState<DeveloperProfileSettings>(runtimeProfileSnapshot);
  const [loading, setLoading] = useState<boolean>(!hasLoadedFromServer);

  const fetchProfile = useCallback(async () => {
    let serverProfile: DeveloperProfileSettings | null = null;
    let serverIsCustom = false;
    let firestoreProfile: DeveloperProfileSettings | null = null;

    const [serverResult, firestoreResult] = await Promise.allSettled([
      fetch('/api/site-settings/developer-profile', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      }).then(async (res) => (res.ok ? res.json() : null)),
      getDoc(doc(db, 'site_settings', 'developer_profile'))
    ]);

    if (serverResult.status === 'fulfilled' && serverResult.value?.profile) {
      serverProfile = sanitizePublicDeveloperProfile({
        ...serverResult.value.profile,
        updatedAt: serverResult.value.updatedAt || serverResult.value.profile.updatedAt
      });
      serverIsCustom = Boolean(serverResult.value.isCustomConfigured);
    }

    if (firestoreResult.status === 'fulfilled' && firestoreResult.value.exists()) {
      const raw = firestoreResult.value.data();
      firestoreProfile = sanitizePublicDeveloperProfile({
        ...raw,
        ...(raw.biography || {})
      });
    }

    // Choose authoritative profile: never allow an unconfigured server default to overwrite Firestore custom data
    let chosen: DeveloperProfileSettings | null = null;
    if (firestoreProfile && (!serverProfile || !serverIsCustom)) {
      chosen = pickAuthoritativeDeveloperProfile(firestoreProfile, serverProfile);
    } else {
      chosen = pickAuthoritativeDeveloperProfile(serverProfile, firestoreProfile);
    }

    if (chosen) {
      // Also preserve any newer custom image already in runtimeProfileSnapshot
      const finalProfile = pickAuthoritativeDeveloperProfile(chosen, runtimeProfileSnapshot);
      runtimeProfileSnapshot = finalProfile;
      hasLoadedFromServer = true;
      setProfile(finalProfile);

      // If Firestore had a custom image or newer timestamp that the server lacked, sync server store
      if (
        firestoreProfile &&
        (isCustomDeveloperPortrait(firestoreProfile) || !serverIsCustom)
      ) {
        fetch('/api/site-settings/developer-profile/sync-from-firestore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: finalProfile,
            updatedAt: finalProfile.updatedAt
          })
        }).catch(() => {});
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();

    const handleProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DeveloperProfileSettings>;
      if (customEvent.detail) {
        const sanitized = sanitizePublicDeveloperProfile(customEvent.detail);
        runtimeProfileSnapshot = sanitized;
        setProfile(sanitized);
      } else {
        fetchProfile();
      }
    };

    const handleWindowFocus = () => {
      fetchProfile();
    };

    window.addEventListener('everykr-developer-profile-updated', handleProfileUpdated);
    window.addEventListener('focus', handleWindowFocus);

    // Subscribe to Firestore `site_settings/developer_profile` for live cross-browser updates
    let unsubscribeFirestore: (() => void) | undefined;
    try {
      const docRef = doc(db, 'site_settings', 'developer_profile');
      unsubscribeFirestore = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const raw = snap.data();
            const fromFirestore = sanitizePublicDeveloperProfile({
              ...raw,
              ...(raw.biography || {})
            });
            const resolved = pickAuthoritativeDeveloperProfile(
              fromFirestore,
              runtimeProfileSnapshot
            );
            runtimeProfileSnapshot = resolved;
            hasLoadedFromServer = true;
            setProfile(resolved);
          }
        },
        () => {
          // Ignore snapshot listener errors in restricted environments
        }
      );
    } catch {
      // Ignore initialization errors
    }

    return () => {
      window.removeEventListener('everykr-developer-profile-updated', handleProfileUpdated);
      window.removeEventListener('focus', handleWindowFocus);
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [fetchProfile]);

  return { profile, loading, refresh: fetchProfile };
}

// ============================================================================
// BRAND SOCIAL ICONS (CLEAN INLINE SVGs)
// ============================================================================

const FacebookBrandIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12.06C22 6.504 17.523 2 12 2S2 6.504 2 12.06c0 5.022 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.197 2.238.197v2.476h-1.26c-1.243 0-1.63.775-1.63 1.57v1.887h2.773l-.443 2.91h-2.33v7.03C18.343 21.244 22 17.082 22 12.06Z" />
  </svg>
);

const LinkedInBrandIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
  </svg>
);

const InstagramBrandIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3Z" />
  </svg>
);

const GitHubBrandIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
  </svg>
);

// ============================================================================
// PORTRAIT COMPONENT WITH FRAMING, ASPECT RATIO & RESILIENT FALLBACK
// ============================================================================

function buildVersionedPortraitSrc(profile: DeveloperProfileSettings): string {
  const rawUrl = (profile.profileImageUrl || '').trim();
  if (!rawUrl) {
    if (profile.fallbackImageDataUrl?.startsWith('data:image/')) {
      return profile.fallbackImageDataUrl;
    }
    return DEFAULT_DEVELOPER_PROFILE.profileImageUrl;
  }
  if (rawUrl.startsWith('data:image/')) {
    return rawUrl;
  }
  const versionStamp = profile.imageUpdatedAt || profile.updatedAt;
  if (
    versionStamp &&
    rawUrl !== DEFAULT_DEVELOPER_PROFILE.profileImageUrl &&
    !rawUrl.includes('token=')
  ) {
    const sep = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${sep}v=${encodeURIComponent(versionStamp)}`;
  }
  return rawUrl;
}

export const DeveloperPortraitFrame: React.FC<{
  profile: DeveloperProfileSettings;
  sizeVariant?: 'hero' | 'centered' | 'compact' | 'avatar';
  isNight?: boolean;
}> = ({ profile, sizeVariant = 'hero', isNight = true }) => {
  const [imgSrc, setImgSrc] = useState<string>(() => buildVersionedPortraitSrc(profile));
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImgSrc(buildVersionedPortraitSrc(profile));
    setImageFailed(false);
  }, [
    profile.profileImageUrl,
    profile.fallbackImageDataUrl,
    profile.imageUpdatedAt,
    profile.updatedAt
  ]);

  const crop = profile.imageCrop || DEFAULT_DEVELOPER_PROFILE.imageCrop;
  const aspectClass =
    sizeVariant === 'avatar'
      ? 'aspect-square'
      : crop.aspectRatio === '1:1'
      ? 'aspect-square'
      : crop.aspectRatio === '3:4'
      ? 'aspect-[3/4]'
      : 'aspect-[4/5]';

  const handleImageError = () => {
    // 1. If a custom URL failed (e.g. local /uploads/... after container restart), try embedded WebP fallback data URL first!
    if (
      profile.fallbackImageDataUrl &&
      profile.fallbackImageDataUrl.startsWith('data:image/') &&
      imgSrc !== profile.fallbackImageDataUrl
    ) {
      setImgSrc(profile.fallbackImageDataUrl);
      return;
    }
    // 2. Otherwise fall back to default studio portrait
    if (imgSrc !== DEFAULT_DEVELOPER_PROFILE.profileImageUrl) {
      setImgSrc(DEFAULT_DEVELOPER_PROFILE.profileImageUrl);
    } else {
      setImageFailed(true);
    }
  };

  if (sizeVariant === 'avatar') {
    return (
      <span
        className={`relative inline-flex w-5 h-5 rounded-full overflow-hidden shrink-0 border ${
          isNight ? 'border-[#D6B875]/60 bg-[#0D1E3A]' : 'border-blue-600/40 bg-slate-200'
        }`}
      >
        {!imageFailed ? (
          <img
            src={imgSrc}
            alt={profile.profileImageAlt || profile.name}
            onError={handleImageError}
            className="w-full h-full object-cover"
            style={{
              transform: `scale(${crop.zoom}) translate(${crop.offsetX * 0.4}%, ${crop.offsetY * 0.4}%)`,
              transformOrigin: 'center center'
            }}
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-[9px] font-black text-[#D6B875]">
            HJ
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      className={`relative w-full ${aspectClass} rounded-2xl overflow-hidden select-none shadow-2xl border transition-all duration-300 ${
        isNight
          ? 'bg-gradient-to-b from-[#0F2140] to-[#071124] border-white/15 shadow-black/60'
          : 'bg-gradient-to-b from-slate-100 to-slate-200 border-slate-200/90 shadow-slate-900/10'
      }`}
    >
      {!imageFailed ? (
        <img
          src={imgSrc}
          alt={profile.profileImageAlt || `${profile.name} — ${profile.role}`}
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-300 will-change-transform"
          style={{
            transform: `scale(${crop.zoom}) translate(${crop.offsetX * 0.5}%, ${crop.offsetY * 0.5}%)`,
            transformOrigin: 'center center'
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#D6B875]/15 border border-[#D6B875]/40 flex items-center justify-center text-2xl font-black text-[#D6B875] mb-3">
            {profile.name
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 3)}
          </div>
          <span className={`text-sm font-bold ${isNight ? 'text-white' : 'text-slate-900'}`}>
            {profile.name}
          </span>
        </div>
      )}

      {/* Subtle Bottom Vignette & Verified Creator Badge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#040A17]/85 via-[#040A17]/30 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#061022]/85 backdrop-blur-md border border-white/15 text-[11px] font-bold text-[#F5D996] shadow-md">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D6B875] shrink-0" />
          <span>Verified Platform Creator</span>
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// REUSABLE DEVELOPER PROFILE SHOWCASE CONTENT (MODAL, PAGE & ADMIN PREVIEW)
// ============================================================================

export const DeveloperProfileShowcaseContent: React.FC<{
  profile: DeveloperProfileSettings;
  isNight?: boolean;
  onClose?: () => void;
  isPreviewMode?: boolean;
}> = ({ profile: rawProfile, isNight = true, onClose, isPreviewMode = false }) => {
  const profile = sanitizePublicDeveloperProfile(rawProfile);
  const [copiedKakao, setCopiedKakao] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyKakao = useCallback(async () => {
    if (!profile.kakaoTalkId) return;
    try {
      await navigator.clipboard.writeText(profile.kakaoTalkId);
    } catch {
      const input = document.createElement('input');
      input.value = profile.kakaoTalkId;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedKakao(true);
    setTimeout(() => setCopiedKakao(false), 2400);
  }, [profile.kakaoTalkId]);

  const handleCopyEmail = useCallback(async () => {
    if (!profile.contactEmail) return;
    try {
      await navigator.clipboard.writeText(profile.contactEmail);
    } catch {
      // Ignore fallback error
    }
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2400);
  }, [profile.contactEmail]);

  const layoutStyle = profile.displaySettings?.layoutStyle || 'split_editorial';

  // Build list of active, validated social links (only configured links are shown)
  const hasFacebook = Boolean(
    profile.facebookUrl && profile.facebookUrl.startsWith('https://')
  );
  const hasPersonalWebsite = Boolean(
    profile.personalWebsiteUrl && profile.personalWebsiteUrl.startsWith('https://')
  );
  const hasKakaoId = Boolean(profile.kakaoTalkId && profile.kakaoTalkId.trim());
  const hasKakaoUrl = Boolean(
    profile.kakaoTalkUrl && profile.kakaoTalkUrl.startsWith('https://')
  );
  const hasLinkedin = Boolean(
    profile.linkedinUrl && profile.linkedinUrl.startsWith('https://')
  );
  const hasInstagram = Boolean(
    profile.instagramUrl && profile.instagramUrl.startsWith('https://')
  );
  const hasGithub = Boolean(
    profile.githubUrl && profile.githubUrl.startsWith('https://')
  );
  const hasEmail = Boolean(profile.contactEmail && profile.contactEmail.includes('@'));

  const hasAnySocialOrContact =
    hasFacebook ||
    hasPersonalWebsite ||
    hasKakaoId ||
    hasKakaoUrl ||
    hasLinkedin ||
    hasInstagram ||
    hasGithub ||
    hasEmail;

  const isCentered = layoutStyle === 'centered_monograph';
  const isCompact = layoutStyle === 'compact_card';

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border transition-all duration-300 ${
        isNight
          ? 'bg-[#071226] text-white border-white/15 shadow-2xl shadow-black/70'
          : 'bg-white text-[#0F1D36] border-slate-200/90 shadow-2xl shadow-slate-900/15'
      }`}
    >
      {/* Top Ambient Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#2563EB] via-[#D6B875] to-[#3B82F6]" />

      {/* Header Bar with Project Tagline & Close Button */}
      <div
        className={`px-5 sm:px-8 py-4 border-b flex items-center justify-between gap-3 ${
          isNight
            ? 'border-white/10 bg-[#091731]/70'
            : 'border-slate-200/80 bg-slate-50/90'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              isNight
                ? 'bg-[#D6B875]/15 border-[#D6B875]/40 text-[#F5D996]'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <Code2 className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] font-extrabold uppercase tracking-[0.16em] ${
                  isNight ? 'text-[#D6B875]' : 'text-[#1E40AF]'
                }`}
              >
                Developer Profile Showcase
              </span>
              {isPreviewMode && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Preview
                </span>
              )}
            </div>
            <p
              className={`text-xs truncate ${
                isNight ? 'text-[#9FB0C7]' : 'text-slate-500'
              }`}
            >
              {profile.projectTitle || 'EveryKR — Everything Korea, One Platform'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Developer Profile"
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isNight
                ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Profile Body */}
      <div className="p-5 sm:p-8">
        <div
          className={
            isCentered
              ? 'max-w-2xl mx-auto flex flex-col items-center text-center gap-6'
              : isCompact
              ? 'grid grid-cols-1 md:grid-cols-12 gap-6 items-start'
              : 'grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-9 items-start'
          }
        >
          {/* Portrait Column */}
          <div
            className={
              isCentered
                ? 'w-56 sm:w-64 mx-auto'
                : isCompact
                ? 'md:col-span-4 max-w-[260px] mx-auto md:mx-0 w-full'
                : 'lg:col-span-5 max-w-[340px] mx-auto lg:mx-0 w-full'
            }
          >
            <DeveloperPortraitFrame
              profile={profile}
              sizeVariant={isCentered ? 'centered' : isCompact ? 'compact' : 'hero'}
              isNight={isNight}
            />

            {/* Optional Location & Quick Verification Card under Portrait */}
            {profile.location && (
              <div
                className={`mt-3.5 px-3.5 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium ${
                  isNight
                    ? 'bg-[#0B1933]/90 border-white/10 text-[#C4D3E8]'
                    : 'bg-slate-50 border-slate-200/80 text-slate-700'
                }`}
              >
                <MapPin
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isNight ? 'text-[#D6B875]' : 'text-blue-600'
                  }`}
                />
                <span>{profile.location}</span>
              </div>
            )}
          </div>

          {/* Editorial Biography, Project Contribution & Social Links Column */}
          <div
            className={
              isCentered
                ? 'w-full space-y-6 text-left'
                : isCompact
                ? 'md:col-span-8 space-y-5'
                : 'lg:col-span-7 space-y-6'
            }
          >
            {/* Identity Header */}
            <div className={isCentered ? 'text-center space-y-2' : 'space-y-2'}>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${
                  isNight
                    ? 'bg-[#13284C] text-[#7CC0FF] border-[#4BA3FF]/30'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{profile.role}</span>
              </div>

              <h2
                className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight ${
                  isNight ? 'text-white' : 'text-[#0B172E]'
                }`}
              >
                {profile.name}
              </h2>

              <p
                className={`text-sm sm:text-base leading-relaxed font-medium ${
                  isNight ? 'text-[#DCE7F7]' : 'text-slate-700'
                }`}
              >
                {profile.shortBio}
              </p>
            </div>

            {/* Detailed Developer Introduction (when configured and not compact) */}
            {profile.detailedBio && !isCompact && (
              <div
                className={`p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
                  isNight
                    ? 'bg-[#0B1933]/70 border-white/10 text-[#B3C4DC]'
                    : 'bg-slate-50/90 border-slate-200/80 text-slate-600'
                }`}
              >
                {profile.detailedBio}
              </div>
            )}

            {/* Project Highlight & Contribution Box */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border relative overflow-hidden ${
                isNight
                  ? 'bg-gradient-to-br from-[#0E2144] to-[#09162E] border-[#D6B875]/35'
                  : 'bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border-blue-200/90'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isNight
                      ? 'bg-[#D6B875]/20 border-[#D6B875]/40 text-[#F5D996]'
                      : 'bg-blue-600 text-white border-blue-700'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${
                        isNight ? 'text-[#D6B875]' : 'text-blue-700'
                      }`}
                    >
                      Flagship Platform Architecture
                    </span>
                  </div>
                  <h3
                    className={`text-sm sm:text-base font-extrabold ${
                      isNight ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {profile.projectTitle || 'EveryKR — Everything Korea, One Platform'}
                  </h3>
                  <p
                    className={`text-xs sm:text-sm leading-relaxed ${
                      isNight ? 'text-[#C2D2E9]' : 'text-slate-700'
                    }`}
                  >
                    {profile.projectContribution}
                  </p>
                </div>
              </div>
            </div>

            {/* Social & Contact Links Section */}
            {hasAnySocialOrContact && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-xs font-extrabold uppercase tracking-[0.14em] ${
                      isNight ? 'text-[#9FB0C7]' : 'text-slate-500'
                    }`}
                  >
                    Connect & Official Channels
                  </h4>
                  <span
                    className={`text-[11px] ${
                      isNight ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Verified Direct Links
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. Facebook */}
                  {hasFacebook && (
                    <a
                      href={profile.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                        isNight
                          ? 'bg-[#0C1B36] hover:bg-[#1877F2]/20 border-white/10 hover:border-[#1877F2]/50 text-white'
                          : 'bg-white hover:bg-blue-50/80 border-slate-200 hover:border-blue-300 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-[#1877F2]/15 text-[#3B82F6] flex items-center justify-center shrink-0">
                          <FacebookBrandIcon className="w-4 h-4" />
                        </span>
                        <span className="truncate">
                          <span className="block font-bold">Facebook</span>
                          <span
                            className={`block text-[11px] font-normal truncate ${
                              isNight ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            Official Profile
                          </span>
                        </span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  )}

                  {/* 2. Personal Website */}
                  {hasPersonalWebsite && (
                    <a
                      href={profile.personalWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                        isNight
                          ? 'bg-[#0C1B36] hover:bg-[#D6B875]/15 border-white/10 hover:border-[#D6B875]/50 text-white'
                          : 'bg-white hover:bg-amber-50/70 border-slate-200 hover:border-amber-300 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-[#D6B875]/15 text-[#D6B875] flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4" />
                        </span>
                        <span className="truncate">
                          <span className="block font-bold">Personal Website</span>
                          <span
                            className={`block text-[11px] font-normal truncate ${
                              isNight ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            Portfolio & Works
                          </span>
                        </span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  )}

                  {/* 3. KakaoTalk (Supports KakaoTalk Profile URL and/or 1-Tap Copy KakaoTalk ID) */}
                  {(hasKakaoId || hasKakaoUrl) && (
                    <div
                      className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-xs sm:text-sm ${
                        isNight
                          ? 'bg-[#0C1B36] border-[#FEE500]/30 text-white'
                          : 'bg-amber-50/40 border-amber-300/80 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-[#FEE500] text-[#191919] flex items-center justify-center shrink-0 shadow-xs">
                          <MessageCircle className="w-4 h-4 fill-current" />
                        </span>
                        <div className="min-w-0">
                          <span className="block font-bold leading-tight">KakaoTalk</span>
                          {hasKakaoId ? (
                            <span
                              className={`block text-[11px] font-mono truncate ${
                                isNight ? 'text-[#F5D996]' : 'text-amber-900'
                              }`}
                            >
                              ID: {profile.kakaoTalkId}
                            </span>
                          ) : (
                            <span
                              className={`block text-[11px] truncate ${
                                isNight ? 'text-slate-400' : 'text-slate-500'
                              }`}
                            >
                              Open Chat Profile
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasKakaoId && (
                          <button
                            type="button"
                            onClick={handleCopyKakao}
                            title={`Copy KakaoTalk ID: ${profile.kakaoTalkId}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              copiedKakao
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : isNight
                                ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                            }`}
                          >
                            {copiedKakao ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy ID</span>
                              </>
                            )}
                          </button>
                        )}
                        {hasKakaoUrl && (
                          <a
                            href={profile.kakaoTalkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open KakaoTalk Profile"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] transition-colors"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. LinkedIn */}
                  {hasLinkedin && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                        isNight
                          ? 'bg-[#0C1B36] hover:bg-[#0A66C2]/20 border-white/10 hover:border-[#0A66C2]/50 text-white'
                          : 'bg-white hover:bg-sky-50/80 border-slate-200 hover:border-sky-300 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-[#0A66C2]/15 text-[#38BDF8] flex items-center justify-center shrink-0">
                          <LinkedInBrandIcon className="w-4 h-4" />
                        </span>
                        <span className="truncate">
                          <span className="block font-bold">LinkedIn</span>
                          <span
                            className={`block text-[11px] font-normal truncate ${
                              isNight ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            Professional Network
                          </span>
                        </span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  )}

                  {/* 5. Instagram */}
                  {hasInstagram && (
                    <a
                      href={profile.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                        isNight
                          ? 'bg-[#0C1B36] hover:bg-pink-500/15 border-white/10 hover:border-pink-500/40 text-white'
                          : 'bg-white hover:bg-pink-50/70 border-slate-200 hover:border-pink-300 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-pink-500/15 text-pink-400 flex items-center justify-center shrink-0">
                          <InstagramBrandIcon className="w-4 h-4" />
                        </span>
                        <span className="truncate">
                          <span className="block font-bold">Instagram</span>
                          <span
                            className={`block text-[11px] font-normal truncate ${
                              isNight ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            Social Updates
                          </span>
                        </span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  )}

                  {/* 6. GitHub */}
                  {hasGithub && (
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                        isNight
                          ? 'bg-[#0C1B36] hover:bg-white/10 border-white/10 hover:border-white/30 text-white'
                          : 'bg-white hover:bg-slate-100 border-slate-200 hover:border-slate-400 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isNight ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <GitHubBrandIcon className="w-4 h-4" />
                        </span>
                        <span className="truncate">
                          <span className="block font-bold">GitHub</span>
                          <span
                            className={`block text-[11px] font-normal truncate ${
                              isNight ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            Engineering & Code
                          </span>
                        </span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  )}

                  {/* 7. Direct Email */}
                  {hasEmail && (
                    <div
                      className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-xs sm:text-sm ${
                        isNight
                          ? 'bg-[#0C1B36] border-white/10 text-white'
                          : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <a
                        href={`mailto:${profile.contactEmail}`}
                        className="flex items-center gap-2.5 min-w-0 flex-1 group"
                      >
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-bold group-hover:underline">Email</span>
                          <span
                            className={`block text-[11px] truncate ${
                              isNight ? 'text-slate-300' : 'text-slate-600'
                            }`}
                          >
                            {profile.contactEmail}
                          </span>
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        title="Copy Email Address"
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer shrink-0 ${
                          copiedEmail
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : isNight
                            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {copiedEmail ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PUBLIC DEVELOPER PROFILE MODAL (OPENS WHEN VISITOR CLICKS FOOTER CREDIT)
// ============================================================================

export const DeveloperProfileShowcaseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  overrideProfile?: DeveloperProfileSettings;
  isNight?: boolean;
}> = ({ isOpen, onClose, overrideProfile, isNight = true }) => {
  const { profile: liveProfile } = usePublicDeveloperProfile();
  const profile = overrideProfile
    ? sanitizePublicDeveloperProfile(overrideProfile)
    : liveProfile;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Developer Profile — ${profile.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-[#030814]/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl my-auto transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <DeveloperProfileShowcaseContent
          profile={profile}
          isNight={isNight}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

// ============================================================================
// DEDICATED PUBLIC DEVELOPER PROFILE PAGE VIEW (/developer)
// ============================================================================

export const DeveloperProfilePageView: React.FC<{ isNight?: boolean }> = ({
  isNight = true
}) => {
  const { profile } = usePublicDeveloperProfile();

  if (!profile.displaySettings.enablePublicDeveloperProfile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-slate-400">
          The public developer profile showcase is currently disabled by site settings.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <DeveloperProfileShowcaseContent profile={profile} isNight={isNight} />
    </div>
  );
};

// ============================================================================
// PUBLIC FOOTER DEVELOPER CREDIT TRIGGER (FOR FOOTER BOTTOM BAR)
// ============================================================================

export const FooterDeveloperCreditTrigger: React.FC<{
  isNight?: boolean;
}> = ({ isNight = true }) => {
  const { profile } = usePublicDeveloperProfile();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handleGlobalOpen = () => {
      if (profile.displaySettings.enablePublicDeveloperProfile) {
        setModalOpen(true);
      }
    };
    window.addEventListener('open-developer-profile-modal', handleGlobalOpen);
    return () => window.removeEventListener('open-developer-profile-modal', handleGlobalOpen);
  }, [profile.displaySettings.enablePublicDeveloperProfile]);

  if (!profile.displaySettings.enableFooterDeveloperCredit) {
    return null;
  }

  const canOpenProfile = profile.displaySettings.enablePublicDeveloperProfile;

  return (
    <>
      {canOpenProfile ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title={`View Developer Profile — ${profile.name} (${profile.role})`}
          className={`group inline-flex items-center gap-2 px-2.5 py-1 -my-1 rounded-lg border transition-all duration-200 cursor-pointer ${
            isNight
              ? 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-[#D6B875]/60 text-[#DCE5F0] hover:text-white'
              : 'bg-white/70 hover:bg-white border-slate-200/90 hover:border-blue-400 text-[#101B32] hover:text-[#1D4ED8] shadow-2xs'
          }`}
        >
          <DeveloperPortraitFrame
            profile={profile}
            sizeVariant="avatar"
            isNight={isNight}
          />
          <span className="font-semibold tracking-tight">
            Developed by{' '}
            <span
              className={`font-extrabold underline decoration-dotted underline-offset-4 ${
                isNight
                  ? 'text-[#F5D996] decoration-[#D6B875]/60 group-hover:decoration-[#F5D996]'
                  : 'text-[#1E3A8A] decoration-blue-400 group-hover:decoration-blue-700'
              }`}
            >
              {profile.name}
            </span>
          </span>
          <Sparkles
            className={`w-3 h-3 transition-transform group-hover:scale-110 ${
              isNight ? 'text-[#D6B875]' : 'text-blue-600'
            }`}
          />
        </button>
      ) : (
        <span
          className={`font-medium ${
            isNight ? 'text-[#DCE5F0]' : 'text-[#101B32]'
          }`}
        >
          Developed by {profile.name}
        </span>
      )}

      {canOpenProfile && (
        <DeveloperProfileShowcaseModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          isNight={isNight}
        />
      )}
    </>
  );
};

// ============================================================================
// STANDALONE DEVELOPER PROFILE BAR (USED IN ADMIN LIVE PREVIEW & FOOTER STRIP)
// ============================================================================

interface DeveloperProfileBarProps {
  overrideProfile?: DeveloperProfileSettings;
  isNight?: boolean;
  className?: string;
}

export const DeveloperProfileBar: React.FC<DeveloperProfileBarProps> = ({
  overrideProfile,
  isNight = true,
  className = ''
}) => {
  const { profile: liveProfile } = usePublicDeveloperProfile();
  const profile = overrideProfile
    ? sanitizePublicDeveloperProfile(overrideProfile)
    : liveProfile;

  const [copiedKakao, setCopiedKakao] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  const handleCopyKakao = useCallback(async () => {
    if (!profile.kakaoTalkId) return;
    try {
      await navigator.clipboard.writeText(profile.kakaoTalkId);
    } catch {
      // Fallback copy
    }
    setCopiedKakao(true);
    setTimeout(() => setCopiedKakao(false), 2200);
  }, [profile.kakaoTalkId]);

  const hasValidPersonalWebsite = Boolean(
    profile.personalWebsiteUrl && profile.personalWebsiteUrl.startsWith('https://')
  );
  const hasValidFacebookUrl = Boolean(
    profile.facebookUrl && profile.facebookUrl.startsWith('https://')
  );
  const hasValidLinkedinUrl = Boolean(
    profile.linkedinUrl && profile.linkedinUrl.startsWith('https://')
  );
  const hasValidGithubUrl = Boolean(
    profile.githubUrl && profile.githubUrl.startsWith('https://')
  );

  return (
    <>
      <section
        aria-label="Developer Credit & Contact Information"
        className={`w-full rounded-2xl border transition-colors ${
          isNight
            ? 'bg-gradient-to-r from-[#09152B]/95 via-[#0B1B36]/95 to-[#09152B]/95 border-white/10 text-[#DCE5F0]'
            : 'bg-gradient-to-r from-white via-[#F8FAFF] to-white border-slate-200/90 text-[#10243A] shadow-xs'
        } ${className}`}
      >
        <div className="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
          {/* Left: Clickable Developer Identity Trigger */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowcaseOpen(true)}
              className="group inline-flex items-center gap-2.5 text-left cursor-pointer focus:outline-none"
              title={`Open ${profile.name} Developer Profile Showcase`}
            >
              <DeveloperPortraitFrame
                profile={profile}
                sizeVariant="avatar"
                isNight={isNight}
              />
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      isNight ? 'text-[#9FB0C7]' : 'text-[#52627A]'
                    }`}
                  >
                    Developed by
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-extrabold tracking-wide underline decoration-dotted underline-offset-4 ${
                      isNight
                        ? 'text-white group-hover:text-[#F5D996] decoration-[#D6B875]/60'
                        : 'text-[#0F1E36] group-hover:text-blue-700 decoration-blue-400'
                    }`}
                  >
                    {profile.name}
                  </span>
                  <span
                    className={`hidden sm:inline text-xs ${
                      isNight ? 'text-white/20' : 'text-slate-300'
                    }`}
                    aria-hidden="true"
                  >
                    •
                  </span>
                  <span
                    className={`text-[11px] sm:text-xs font-medium ${
                      isNight ? 'text-[#D6B875]' : 'text-[#1E3A8A]'
                    }`}
                  >
                    {profile.role}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Right: Configured Quick Links & View Profile Button */}
          <div className="flex flex-wrap items-center gap-2">
            {hasValidFacebookUrl && (
              <a
                href={profile.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isNight
                    ? 'bg-[#1877F2]/15 text-[#7CC0FF] border-[#1877F2]/35 hover:bg-[#1877F2]/25 hover:text-white'
                    : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] hover:bg-[#DBEAFE]'
                }`}
              >
                <FacebookBrandIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Facebook</span>
                <ExternalLink className="w-3 h-3 opacity-75 shrink-0" />
              </a>
            )}

            {profile.kakaoTalkId && (
              <div
                className={`inline-flex items-center rounded-xl border text-xs overflow-hidden ${
                  isNight
                    ? 'bg-[#FEE500]/10 border-[#FEE500]/30 text-[#F6E05E]'
                    : 'bg-[#FEFCE8] border-[#FDE047] text-[#854D0E]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold">
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>KakaoTalk:</span>
                  <span className="font-mono font-bold tracking-tight">
                    {profile.kakaoTalkId}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyKakao}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 border-l font-bold transition-colors cursor-pointer ${
                    isNight
                      ? 'border-[#FEE500]/25 bg-[#FEE500]/15 hover:bg-[#FEE500]/25 text-white'
                      : 'border-[#FDE047] bg-[#FEF08A]/60 hover:bg-[#FEF08A] text-[#713F12]'
                  }`}
                >
                  {copiedKakao ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 shrink-0" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {hasValidPersonalWebsite && (
              <a
                href={profile.personalWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isNight
                    ? 'bg-[#D6B875]/15 text-[#F3D999] border-[#D6B875]/35 hover:bg-[#D6B875]/25 hover:text-white'
                    : 'bg-slate-100 text-[#0F1E36] border-slate-300/90 hover:bg-slate-200/80'
                }`}
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>Website</span>
                <ExternalLink className="w-3 h-3 opacity-75 shrink-0" />
              </a>
            )}

            {hasValidLinkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isNight
                    ? 'bg-[#0A66C2]/15 text-[#7CC0FF] border-[#0A66C2]/35 hover:bg-[#0A66C2]/25'
                    : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                }`}
              >
                <LinkedInBrandIcon className="w-3.5 h-3.5 shrink-0" />
                <span>LinkedIn</span>
              </a>
            )}

            {hasValidGithubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isNight
                    ? 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                    : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <GitHubBrandIcon className="w-3.5 h-3.5 shrink-0" />
                <span>GitHub</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowcaseOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isNight
                  ? 'bg-[#D6B875] text-[#050B18] border-[#D6B875] hover:bg-[#E5CA8A]'
                  : 'bg-[#1E3A8A] text-white border-[#1E3A8A] hover:bg-[#1D4ED8]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>View Profile</span>
            </button>
          </div>
        </div>
      </section>

      <DeveloperProfileShowcaseModal
        isOpen={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
        overrideProfile={overrideProfile}
        isNight={isNight}
      />
    </>
  );
};
