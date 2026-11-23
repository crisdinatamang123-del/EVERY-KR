import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Code2,
  ShieldCheck,
  Save,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Globe,
  MessageCircle,
  UserCheck,
  Sparkles,
  RefreshCw,
  Eye,
  Clock,
  Lock,
  Trash2,
  Camera,
  Upload,
  Sliders,
  MapPin,
  Mail,
  FileText,
  Layout,
  ToggleLeft,
  ToggleRight,
  Maximize2
} from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  DEFAULT_DEVELOPER_PROFILE,
  DEFAULT_DEVELOPER_IMAGE_CROP,
  validateDeveloperName,
  validateDeveloperRole,
  validateDeveloperTextField,
  validateFacebookUrl,
  validateKakaoTalkId,
  validateKakaoTalkUrl,
  validatePersonalWebsiteUrl,
  validateLinkedinUrl,
  validateInstagramUrl,
  validateGithubUrl,
  validateDeveloperContactEmail,
  validateProfileImageUrl,
  validateDeveloperProfilePayload,
  sanitizePublicDeveloperProfile,
  type DeveloperProfileSettings,
  type DeveloperProfileLayoutStyle,
  type DeveloperProfileAspectRatio
} from '../../utils/developerProfileValidation';
import {
  DeveloperProfileBar,
  DeveloperProfileShowcaseContent,
  DeveloperProfileShowcaseModal,
  DeveloperPortraitFrame,
  isCustomDeveloperPortrait,
  pickAuthoritativeDeveloperProfile,
  updateRuntimeDeveloperProfileCache,
  syncDeveloperProfileToFirestore,
  uploadDeveloperPortraitPhoto
} from '../DeveloperProfileBar';

interface DeveloperProfileMetadata {
  updatedAt: string | null;
  updatedByName: string | null;
  updatedByEmail: string | null;
  isCustomConfigured: boolean;
}

interface AdminDeveloperSettingsTabProps {
  onAuditRecorded?: (action: string, target: string, details: string) => void;
  onRecordAudit?: (
    actionType: 'EDIT' | 'PUBLISH',
    targetId: string,
    targetName: string,
    details: string
  ) => void | Promise<void>;
}

const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]);
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Generates a high-resolution cropped portrait image (Data URL + Blob + compact WebP fallback Data URL)
 * using an offscreen HTML5 Canvas according to the selected aspect ratio, zoom, and X/Y offsets.
 */
async function renderCroppedPortraitCanvas(params: {
  imageSrc: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  aspectRatio: DeveloperProfileAspectRatio;
  outputMimeType?: string;
}): Promise<{ dataUrl: string; fallbackDataUrl: string; blob: Blob | null; mimeType: string }> {
  const {
    imageSrc,
    zoom,
    offsetX,
    offsetY,
    aspectRatio,
    outputMimeType = 'image/webp'
  } = params;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetWidth = 880;
      const targetHeight =
        aspectRatio === '1:1'
          ? 880
          : aspectRatio === '3:4'
          ? 1174
          : 1100; // 4:5 default

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.fillStyle = '#071226';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Compute cover dimensions
      const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      const canvasAspect = targetWidth / targetHeight;

      let drawWidth = targetWidth;
      let drawHeight = targetHeight;
      if (imgAspect > canvasAspect) {
        drawHeight = targetHeight;
        drawWidth = targetHeight * imgAspect;
      } else {
        drawWidth = targetWidth;
        drawHeight = targetWidth / imgAspect;
      }

      const scaledWidth = drawWidth * zoom;
      const scaledHeight = drawHeight * zoom;

      const centerX = targetWidth / 2 + (offsetX / 100) * (targetWidth * 0.5);
      const centerY = targetHeight / 2 + (offsetY / 100) * (targetHeight * 0.5);

      const drawX = centerX - scaledWidth / 2;
      const drawY = centerY - scaledHeight / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

      // Prefer WebP for optimal compression + Firestore/Storage persistence
      const preferredMime = ACCEPTED_IMAGE_MIME_TYPES.has(outputMimeType)
        ? outputMimeType
        : 'image/webp';
      let dataUrl = canvas.toDataURL('image/webp', 0.86);
      let resolvedMime = 'image/webp';
      if (!dataUrl.startsWith('data:image/webp')) {
        resolvedMime = preferredMime === 'image/png' ? 'image/png' : 'image/jpeg';
        dataUrl = canvas.toDataURL(resolvedMime, 0.88);
      }

      // Generate a compact fallback data URL (560px wide) guaranteed to fit comfortably inside Firestore
      const fallbackWidth = 560;
      const fallbackHeight = Math.round((targetHeight / targetWidth) * fallbackWidth);
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = fallbackWidth;
      fallbackCanvas.height = fallbackHeight;
      const fbCtx = fallbackCanvas.getContext('2d');
      let fallbackDataUrl = dataUrl;
      if (fbCtx) {
        fbCtx.imageSmoothingEnabled = true;
        fbCtx.imageSmoothingQuality = 'high';
        fbCtx.drawImage(canvas, 0, 0, fallbackWidth, fallbackHeight);
        const compactWebp = fallbackCanvas.toDataURL('image/webp', 0.8);
        fallbackDataUrl = compactWebp.startsWith('data:image/')
          ? compactWebp
          : fallbackCanvas.toDataURL('image/jpeg', 0.8);
      }

      canvas.toBlob(
        (blob) => {
          resolve({ dataUrl, fallbackDataUrl, blob, mimeType: resolvedMime });
        },
        resolvedMime,
        0.86
      );
    };
    img.onerror = () => reject(new Error('Failed to load selected image for cropping.'));
    img.src = imageSrc;
  });
}

export const AdminDeveloperSettingsTab: React.FC<AdminDeveloperSettingsTabProps> = ({
  onAuditRecorded,
  onRecordAudit
}) => {
  const { userProfile: user, firebaseUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadRequestIdRef = useRef<number>(0);

  const [savedProfile, setSavedProfile] = useState<DeveloperProfileSettings>(
    sanitizePublicDeveloperProfile(DEFAULT_DEVELOPER_PROFILE)
  );
  const [formState, setFormState] = useState<DeveloperProfileSettings>(
    sanitizePublicDeveloperProfile(DEFAULT_DEVELOPER_PROFILE)
  );
  const [metadata, setMetadata] = useState<DeveloperProfileMetadata>({
    updatedAt: null,
    updatedByName: null,
    updatedByEmail: null,
    isCustomConfigured: false
  });
  const [remoteConflictProfile, setRemoteConflictProfile] =
    useState<DeveloperProfileSettings | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

  // Pending local image selection (previewed before uploading/saving)
  const [pendingLocalImageSrc, setPendingLocalImageSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('developer-portrait.webp');
  const [pendingMimeType, setPendingMimeType] = useState<string>('image/webp');
  const [photoUploadStatus, setPhotoUploadStatus] = useState<{
    type: 'info' | 'success' | 'error';
    message: string;
  } | null>(null);

  const [bannerStatus, setBannerStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [serverErrors, setServerErrors] = useState<Partial<Record<string, string>>>({});

  const getAdminAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    try {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Fallback to session headers
    }
    if (user?.id) headers['x-admin-uid'] = user.id;
    if (user?.email) headers['x-admin-email'] = user.email;
    if (user?.name) headers['x-admin-name'] = user.name;
    return headers;
  }, [firebaseUser, user]);

  const fetchDeveloperSettings = useCallback(async () => {
    setLoading(true);
    setBannerStatus(null);
    try {
      const headers = await getAdminAuthHeaders();
      const [serverResult, firestoreResult] = await Promise.allSettled([
        fetch('/api/admin/site-settings/developer-profile', {
          method: 'GET',
          headers,
          cache: 'no-store'
        }).then(async (res) => (res.ok ? res.json() : null)),
        getDoc(doc(db, 'site_settings', 'developer_profile'))
      ]);

      let serverProfile: DeveloperProfileSettings | null = null;
      let serverMeta: DeveloperProfileMetadata | null = null;
      if (serverResult.status === 'fulfilled' && serverResult.value?.profile) {
        serverProfile = sanitizePublicDeveloperProfile({
          ...serverResult.value.profile,
          updatedAt:
            serverResult.value.metadata?.updatedAt || serverResult.value.profile.updatedAt
        });
        if (serverResult.value.metadata) {
          serverMeta = {
            updatedAt: serverResult.value.metadata.updatedAt || null,
            updatedByName: serverResult.value.metadata.updatedByName || null,
            updatedByEmail: serverResult.value.metadata.updatedByEmail || null,
            isCustomConfigured: Boolean(serverResult.value.metadata.isCustomConfigured)
          };
        }
      }

      let firestoreProfile: DeveloperProfileSettings | null = null;
      let firestoreRaw: Record<string, unknown> | null = null;
      if (firestoreResult.status === 'fulfilled' && firestoreResult.value.exists()) {
        firestoreRaw = firestoreResult.value.data() as Record<string, unknown>;
        firestoreProfile = sanitizePublicDeveloperProfile({
          ...firestoreRaw,
          ...((firestoreRaw.biography as Record<string, unknown>) || {})
        });
      }

      // Resolve authoritative profile (protecting custom images in Firestore from unconfigured server defaults)
      let authoritative: DeveloperProfileSettings | null = null;
      if (firestoreProfile && (!serverProfile || !serverMeta?.isCustomConfigured)) {
        authoritative = pickAuthoritativeDeveloperProfile(firestoreProfile, serverProfile);
      } else {
        authoritative = pickAuthoritativeDeveloperProfile(serverProfile, firestoreProfile);
      }

      if (authoritative) {
        setSavedProfile(authoritative);
        setFormState(authoritative);
        setRemoteConflictProfile(null);
        updateRuntimeDeveloperProfileCache(authoritative);

        const resolvedUpdatedAt =
          authoritative.updatedAt ||
          serverMeta?.updatedAt ||
          (typeof firestoreRaw?.updatedAt === 'string' ? firestoreRaw.updatedAt : null);
        const resolvedByName =
          serverMeta?.updatedByName ||
          (typeof firestoreRaw?.updatedByName === 'string' ? firestoreRaw.updatedByName : null);

        setMetadata({
          updatedAt: resolvedUpdatedAt,
          updatedByName: resolvedByName,
          updatedByEmail: serverMeta?.updatedByEmail || null,
          isCustomConfigured:
            Boolean(serverMeta?.isCustomConfigured) ||
            isCustomDeveloperPortrait(authoritative)
        });

        // If Firestore had a custom portrait or newer update that the server store lacked, sync server
        if (
          firestoreProfile &&
          (isCustomDeveloperPortrait(firestoreProfile) || !serverMeta?.isCustomConfigured)
        ) {
          fetch('/api/site-settings/developer-profile/sync-from-firestore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profile: authoritative,
              updatedAt: resolvedUpdatedAt
            })
          }).catch(() => {});
        }
      }
    } catch {
      setBannerStatus({
        type: 'error',
        message:
          'Unable to fetch latest server settings. Showing current verified configuration.'
      });
    } finally {
      setLoading(false);
    }
  }, [getAdminAuthHeaders]);

  useEffect(() => {
    fetchDeveloperSettings();
  }, [fetchDeveloperSettings]);

  // Real-time field-level validation
  const fieldValidations = useMemo(() => {
    return {
      name: validateDeveloperName(formState.name),
      role: validateDeveloperRole(formState.role),
      shortBio: validateDeveloperTextField(formState.shortBio, {
        label: 'Short Biography',
        required: true,
        minLength: 10,
        maxLength: 320,
        multiline: true
      }),
      detailedBio: validateDeveloperTextField(formState.detailedBio, {
        label: 'Developer Introduction',
        required: false,
        maxLength: 1200,
        multiline: true
      }),
      projectTitle: validateDeveloperTextField(formState.projectTitle, {
        label: 'Project Highlight Title',
        required: true,
        minLength: 3,
        maxLength: 120
      }),
      projectContribution: validateDeveloperTextField(formState.projectContribution, {
        label: 'Contribution to EveryKR',
        required: true,
        minLength: 10,
        maxLength: 600,
        multiline: true
      }),
      location: validateDeveloperTextField(formState.location, {
        label: 'Developer Location',
        required: false,
        maxLength: 100
      }),
      profileImageUrl: validateProfileImageUrl(formState.profileImageUrl),
      profileImageAlt: validateDeveloperTextField(formState.profileImageAlt, {
        label: 'Profile Image Alt Text',
        required: false,
        maxLength: 160
      }),
      facebookUrl: validateFacebookUrl(formState.facebookUrl),
      personalWebsiteUrl: validatePersonalWebsiteUrl(formState.personalWebsiteUrl),
      kakaoTalkId: validateKakaoTalkId(formState.kakaoTalkId),
      kakaoTalkUrl: validateKakaoTalkUrl(formState.kakaoTalkUrl),
      linkedinUrl: validateLinkedinUrl(formState.linkedinUrl),
      instagramUrl: validateInstagramUrl(formState.instagramUrl),
      githubUrl: validateGithubUrl(formState.githubUrl),
      contactEmail: validateDeveloperContactEmail(formState.contactEmail)
    };
  }, [formState]);

  const hasValidationErrors = useMemo(() => {
    return Object.values(fieldValidations).some((v) => !v.valid);
  }, [fieldValidations]);

  const hasUnsavedChanges = useMemo(() => {
    return (
      Boolean(pendingLocalImageSrc) ||
      JSON.stringify(formState) !== JSON.stringify(savedProfile)
    );
  }, [formState, savedProfile, pendingLocalImageSrc]);

  // Real-time Firestore listener on `site_settings/developer_profile` for multi-browser / multi-admin synchronization
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const docRef = doc(db, 'site_settings', 'developer_profile');
      unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (!snap.exists()) return;
          const raw = snap.data() as Record<string, unknown>;
          const remoteProfile = sanitizePublicDeveloperProfile({
            ...raw,
            ...((raw.biography as Record<string, unknown>) || {})
          });

          setSavedProfile((currentSaved) => {
            const resolved = pickAuthoritativeDeveloperProfile(remoteProfile, currentSaved);
            const remoteTime = remoteProfile.updatedAt ? Date.parse(remoteProfile.updatedAt) : 0;
            const currentTime = currentSaved.updatedAt ? Date.parse(currentSaved.updatedAt) : 0;
            const isNewerRemote =
              (!Number.isNaN(remoteTime) && !Number.isNaN(currentTime) && remoteTime > currentTime) ||
              (isCustomDeveloperPortrait(remoteProfile) && !isCustomDeveloperPortrait(currentSaved));

            if (isNewerRemote) {
              updateRuntimeDeveloperProfileCache(resolved);
              setMetadata((prevMeta) => ({
                ...prevMeta,
                updatedAt:
                  remoteProfile.updatedAt ||
                  (typeof raw.updatedAt === 'string' ? raw.updatedAt : prevMeta.updatedAt),
                updatedByName:
                  typeof raw.updatedByName === 'string'
                    ? raw.updatedByName
                    : prevMeta.updatedByName,
                isCustomConfigured: true
              }));

              setFormState((currentForm) => {
                const isDirty =
                  Boolean(pendingLocalImageSrc) ||
                  JSON.stringify(currentForm) !== JSON.stringify(currentSaved);
                if (isDirty) {
                  setRemoteConflictProfile(resolved);
                  return currentForm;
                }
                setRemoteConflictProfile(null);
                return resolved;
              });
              return resolved;
            }
            return currentSaved;
          });
        },
        () => {}
      );
    } catch {
      // Ignore listener initialization error
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [pendingLocalImageSrc]);

  const updateTextField = (
    field: keyof DeveloperProfileSettings,
    value: string
  ) => {
    setServerErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormState((prev) => {
      const next: DeveloperProfileSettings = {
        ...prev,
        [field]: value
      };
      if (field === 'name') {
        next.developerName = value;
      }
      if (
        field === 'facebookUrl' ||
        field === 'personalWebsiteUrl' ||
        field === 'kakaoTalkId' ||
        field === 'kakaoTalkUrl' ||
        field === 'linkedinUrl' ||
        field === 'instagramUrl' ||
        field === 'githubUrl' ||
        field === 'contactEmail'
      ) {
        next.socialLinks = {
          ...prev.socialLinks,
          [field]: value
        };
      }
      return next;
    });
  };

  const updateCropSetting = (
    patch: Partial<DeveloperProfileSettings['imageCrop']>
  ) => {
    setFormState((prev) => ({
      ...prev,
      imageCrop: {
        ...prev.imageCrop,
        ...patch
      }
    }));
  };

  const updateDisplaySetting = (
    patch: Partial<DeveloperProfileSettings['displaySettings']>
  ) => {
    setFormState((prev) => ({
      ...prev,
      displaySettings: {
        ...prev.displaySettings,
        ...patch
      }
    }));
  };

  // Handle selecting a new profile image file (JPG, JPEG, PNG, WebP)
  const handleSelectPhotoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mime = (file.type || '').toLowerCase();
    const extAllowed = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!ACCEPTED_IMAGE_MIME_TYPES.has(mime) && !extAllowed) {
      setPhotoUploadStatus({
        type: 'error',
        message: 'Unsupported file type. Please choose a JPG, JPEG, PNG, or WebP photograph.'
      });
      event.target.value = '';
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setPhotoUploadStatus({
        type: 'error',
        message: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5.00 MB limit.`
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingLocalImageSrc(reader.result);
        setPendingFileName(file.name || 'developer-portrait.webp');
        setPendingMimeType('image/webp');
        setPhotoUploadStatus({
          type: 'info',
          message:
            'New photograph loaded in preview! Adjust crop & position below, then click "Upload & Apply Cropped Portrait" to permanently save to Firebase.'
        });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Upload and IMMEDIATELY persist the cropped portrait image to Firebase Storage, Firestore (`site_settings/developer_profile`), and Server Store
  const handleUploadAndApplyPhoto = async (): Promise<{
    ok: boolean;
    profileImageUrl?: string;
    profileImagePath?: string;
    fallbackImageDataUrl?: string;
    imageUpdatedAt?: string;
  }> => {
    const sourceImage =
      pendingLocalImageSrc ||
      formState.fallbackImageDataUrl ||
      formState.profileImageUrl;
    if (!sourceImage) {
      return { ok: false };
    }

    const requestId = ++uploadRequestIdRef.current;
    setUploadingPhoto(true);
    setPhotoUploadStatus({
      type: 'info',
      message:
        'Processing crop, uploading to Firebase Storage, and saving to Firestore...'
    });

    try {
      const { dataUrl, fallbackDataUrl, blob, mimeType } =
        await renderCroppedPortraitCanvas({
          imageSrc: sourceImage,
          zoom: formState.imageCrop.zoom,
          offsetX: formState.imageCrop.offsetX,
          offsetY: formState.imageCrop.offsetY,
          aspectRatio: formState.imageCrop.aspectRatio,
          outputMimeType: pendingMimeType
        });

      // Ignore if a newer upload request superseded this one
      if (requestId !== uploadRequestIdRef.current) {
        return { ok: false };
      }

      // Once cropped & uploaded, reset zoom/offsets to 1/0/0 since crop is baked cleanly into the uploaded asset
      const nextCrop = {
        ...DEFAULT_DEVELOPER_IMAGE_CROP,
        aspectRatio: formState.imageCrop.aspectRatio
      };

      const authHeaders = await getAdminAuthHeaders();
      const uploadRes = await uploadDeveloperPortraitPhoto({
        dataUrl,
        blob,
        fileName: pendingFileName,
        mimeType,
        authHeaders,
        adminUid: user?.id || firebaseUser?.uid || 'current',
        imageCrop: nextCrop
      });

      if (requestId !== uploadRequestIdRef.current) {
        return { ok: false };
      }

      if (!uploadRes.ok || !uploadRes.profileImageUrl) {
        setPhotoUploadStatus({
          type: 'error',
          message:
            uploadRes.message ||
            'Failed to upload developer portrait. Previous profile image has been preserved.'
        });
        return { ok: false };
      }

      const nowIso = uploadRes.imageUpdatedAt || new Date().toISOString();
      const nextVersion = (savedProfile.version || 1) + 1;
      const resolvedFallbackDataUrl = uploadRes.fallbackImageDataUrl || fallbackDataUrl;

      // Build the complete updated profile with the new verified image URL, path, and embedded WebP fallback
      const updatedProfileSnapshot: DeveloperProfileSettings = sanitizePublicDeveloperProfile({
        ...savedProfile,
        ...formState,
        profileImageUrl: uploadRes.profileImageUrl,
        profileImagePath:
          uploadRes.profileImagePath ||
          `developer-profile/profile-image/${user?.id || 'current'}/profile.webp`,
        fallbackImageDataUrl: resolvedFallbackDataUrl,
        imageUpdatedAt: nowIso,
        updatedAt: nowIso,
        version: nextVersion,
        imageCrop: nextCrop
      });

      // Persist immediately to Express Server Store (`PUT /api/admin/site-settings/developer-profile`)
      try {
        await fetch('/api/admin/site-settings/developer-profile', {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(updatedProfileSnapshot)
        });
      } catch {
        // Upload endpoint already updated server store; continue to Firestore verification
      }

      // Persist immediately to Firestore `site_settings/developer_profile` and verify read-back
      const firestoreVerified = await syncDeveloperProfileToFirestore(
        updatedProfileSnapshot,
        {
          uid: user?.id || firebaseUser?.uid,
          name: user?.name || firebaseUser?.displayName || 'Administrator'
        }
      );

      if (requestId !== uploadRequestIdRef.current) {
        return { ok: false };
      }

      // Commit verified profile to savedProfile, formState, and global runtime cache
      setSavedProfile(updatedProfileSnapshot);
      setFormState(updatedProfileSnapshot);
      setPendingLocalImageSrc(null);
      setRemoteConflictProfile(null);
      updateRuntimeDeveloperProfileCache(updatedProfileSnapshot);

      setMetadata((prev) => ({
        ...prev,
        updatedAt: nowIso,
        updatedByName: user?.name || prev.updatedByName || 'Administrator',
        updatedByEmail: user?.email || prev.updatedByEmail || null,
        isCustomConfigured: true
      }));

      setPhotoUploadStatus({
        type: 'success',
        message: firestoreVerified
          ? 'Developer profile photograph uploaded, saved to Firebase, and verified.'
          : 'Developer profile photograph uploaded and saved to server store.'
      });

      return {
        ok: true,
        profileImageUrl: uploadRes.profileImageUrl,
        profileImagePath: updatedProfileSnapshot.profileImagePath,
        fallbackImageDataUrl: resolvedFallbackDataUrl,
        imageUpdatedAt: nowIso
      };
    } catch (err) {
      if (requestId === uploadRequestIdRef.current) {
        setPhotoUploadStatus({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Could not process image crop. Previous profile image has been preserved.'
        });
      }
      return { ok: false };
    } finally {
      if (requestId === uploadRequestIdRef.current) {
        setUploadingPhoto(false);
      }
    }
  };

  // Live preview profile object (includes pending local image if selected)
  const livePreviewProfile: DeveloperProfileSettings = useMemo(() => {
    const candidate: DeveloperProfileSettings = {
      ...formState,
      name: fieldValidations.name.valid ? fieldValidations.name.value : savedProfile.name,
      developerName: fieldValidations.name.valid
        ? fieldValidations.name.value
        : savedProfile.name,
      role: fieldValidations.role.valid ? fieldValidations.role.value : savedProfile.role,
      shortBio: fieldValidations.shortBio.valid
        ? fieldValidations.shortBio.value
        : savedProfile.shortBio,
      detailedBio: fieldValidations.detailedBio.valid
        ? fieldValidations.detailedBio.value
        : savedProfile.detailedBio,
      projectTitle: fieldValidations.projectTitle.valid
        ? fieldValidations.projectTitle.value
        : savedProfile.projectTitle,
      projectContribution: fieldValidations.projectContribution.valid
        ? fieldValidations.projectContribution.value
        : savedProfile.projectContribution,
      location: fieldValidations.location.valid
        ? fieldValidations.location.value
        : savedProfile.location,
      profileImageUrl:
        pendingLocalImageSrc ||
        (fieldValidations.profileImageUrl.valid
          ? fieldValidations.profileImageUrl.value
          : savedProfile.profileImageUrl),
      fallbackImageDataUrl: pendingLocalImageSrc
        ? pendingLocalImageSrc
        : formState.fallbackImageDataUrl || savedProfile.fallbackImageDataUrl,
      imageUpdatedAt: formState.imageUpdatedAt || savedProfile.imageUpdatedAt,
      facebookUrl: fieldValidations.facebookUrl.valid
        ? fieldValidations.facebookUrl.value
        : savedProfile.facebookUrl,
      personalWebsiteUrl: fieldValidations.personalWebsiteUrl.valid
        ? fieldValidations.personalWebsiteUrl.value
        : '',
      kakaoTalkId: fieldValidations.kakaoTalkId.valid
        ? fieldValidations.kakaoTalkId.value
        : savedProfile.kakaoTalkId,
      kakaoTalkUrl: fieldValidations.kakaoTalkUrl.valid
        ? fieldValidations.kakaoTalkUrl.value
        : '',
      linkedinUrl: fieldValidations.linkedinUrl.valid
        ? fieldValidations.linkedinUrl.value
        : '',
      instagramUrl: fieldValidations.instagramUrl.valid
        ? fieldValidations.instagramUrl.value
        : '',
      githubUrl: fieldValidations.githubUrl.valid
        ? fieldValidations.githubUrl.value
        : '',
      contactEmail: fieldValidations.contactEmail.valid
        ? fieldValidations.contactEmail.value
        : ''
    };
    return sanitizePublicDeveloperProfile(candidate);
  }, [formState, fieldValidations, savedProfile, pendingLocalImageSrc]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerStatus(null);
    setServerErrors({});

    let finalProfileToValidate: DeveloperProfileSettings = {
      ...formState,
      fallbackImageDataUrl:
        formState.fallbackImageDataUrl || savedProfile.fallbackImageDataUrl,
      imageUpdatedAt: formState.imageUpdatedAt || savedProfile.imageUpdatedAt,
      version: (savedProfile.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };

    // If the admin selected a new local photo that hasn't been uploaded yet, upload it first!
    if (pendingLocalImageSrc) {
      const uploadRes = await handleUploadAndApplyPhoto();
      if (!uploadRes.ok || !uploadRes.profileImageUrl) {
        setBannerStatus({
          type: 'error',
          message:
            'Profile photograph upload did not complete. Previous profile image has been preserved.'
        });
        return;
      }
      finalProfileToValidate = {
        ...finalProfileToValidate,
        profileImageUrl: uploadRes.profileImageUrl,
        profileImagePath:
          uploadRes.profileImagePath || finalProfileToValidate.profileImagePath,
        fallbackImageDataUrl:
          uploadRes.fallbackImageDataUrl || finalProfileToValidate.fallbackImageDataUrl,
        imageUpdatedAt:
          uploadRes.imageUpdatedAt || finalProfileToValidate.imageUpdatedAt,
        imageCrop: {
          ...DEFAULT_DEVELOPER_IMAGE_CROP,
          aspectRatio: finalProfileToValidate.imageCrop.aspectRatio
        }
      };
    }

    const clientCheck = validateDeveloperProfilePayload(finalProfileToValidate);
    if (!clientCheck.valid) {
      setServerErrors(clientCheck.errors);
      setBannerStatus({
        type: 'error',
        message: 'Please resolve the highlighted validation errors before saving.'
      });
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const payloadToSave: DeveloperProfileSettings = {
        ...clientCheck.sanitized,
        fallbackImageDataUrl:
          finalProfileToValidate.fallbackImageDataUrl ||
          clientCheck.sanitized.fallbackImageDataUrl,
        imageUpdatedAt:
          finalProfileToValidate.imageUpdatedAt ||
          clientCheck.sanitized.imageUpdatedAt ||
          nowIso,
        version: finalProfileToValidate.version || (savedProfile.version || 1) + 1,
        updatedAt: nowIso
      };

      const headers = await getAdminAuthHeaders();
      const response = await fetch('/api/admin/site-settings/developer-profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payloadToSave)
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        if (data?.errors) {
          setServerErrors(data.errors);
        }
        setBannerStatus({
          type: 'error',
          message: data?.message || 'Failed to save Developer Profile settings.'
        });
        return;
      }

      const updated = sanitizePublicDeveloperProfile({
        ...(data.profile || payloadToSave),
        fallbackImageDataUrl:
          payloadToSave.fallbackImageDataUrl || data.profile?.fallbackImageDataUrl,
        imageUpdatedAt:
          payloadToSave.imageUpdatedAt || data.profile?.imageUpdatedAt || nowIso,
        version: payloadToSave.version,
        updatedAt: data.metadata?.updatedAt || nowIso
      });

      // Synchronize and verify in Firestore `site_settings/developer_profile`
      await syncDeveloperProfileToFirestore(updated, {
        uid: user?.id || firebaseUser?.uid,
        name: user?.name || firebaseUser?.displayName || 'Administrator'
      });

      setSavedProfile(updated);
      setFormState(updated);
      setRemoteConflictProfile(null);
      updateRuntimeDeveloperProfileCache(updated);

      if (data.metadata) {
        setMetadata({
          updatedAt: data.metadata.updatedAt || nowIso,
          updatedByName: data.metadata.updatedByName || user?.name || 'Admin',
          updatedByEmail: data.metadata.updatedByEmail || user?.email || null,
          isCustomConfigured: Boolean(data.metadata.isCustomConfigured)
        });
      }

      setBannerStatus({
        type: 'success',
        message:
          data.message ||
          'Developer Profile Showcase & Site Settings saved to Firebase and published across all connected browsers.'
      });

      if (onAuditRecorded) {
        onAuditRecorded(
          'DEVELOPER_PROFILE_UPDATE',
          'site_settings/developer_profile',
          `Updated public Developer Profile (Name: "${updated.name}", Role: "${updated.role}", Layout: "${updated.displaySettings.layoutStyle}")`
        );
      }
      if (onRecordAudit) {
        await onRecordAudit(
          'PUBLISH',
          'site_settings/developer_profile',
          updated.name,
          `Updated public Developer Profile (Name: "${updated.name}", Role: "${updated.role}", Layout: "${updated.displaySettings.layoutStyle}")`
        );
      }
    } catch {
      setBannerStatus({
        type: 'error',
        message: 'Network error while saving Developer Profile settings. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmResetDefaults = async () => {
    setResetting(true);
    setBannerStatus(null);
    setServerErrors({});
    try {
      const headers = await getAdminAuthHeaders();
      const response = await fetch('/api/admin/site-settings/developer-profile/reset', {
        method: 'POST',
        headers
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        setBannerStatus({
          type: 'error',
          message: data?.message || 'Failed to restore default Developer Profile settings.'
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const restored = sanitizePublicDeveloperProfile({
        ...(data.profile || DEFAULT_DEVELOPER_PROFILE),
        fallbackImageDataUrl: '',
        imageUpdatedAt: nowIso,
        updatedAt: nowIso,
        version: (savedProfile.version || 1) + 1
      });
      setSavedProfile(restored);
      setFormState(restored);
      setPendingLocalImageSrc(null);
      setPhotoUploadStatus(null);
      setRemoteConflictProfile(null);
      updateRuntimeDeveloperProfileCache(restored);

      await syncDeveloperProfileToFirestore(restored, {
        uid: user?.id || firebaseUser?.uid,
        name: user?.name || firebaseUser?.displayName || 'Administrator'
      });

      if (data.metadata) {
        setMetadata({
          updatedAt: data.metadata.updatedAt || nowIso,
          updatedByName: data.metadata.updatedByName || user?.name || 'Admin',
          updatedByEmail: data.metadata.updatedByEmail || user?.email || null,
          isCustomConfigured: false
        });
      }

      setConfirmResetOpen(false);
      setBannerStatus({
        type: 'info',
        message: 'Original default Developer Profile settings have been restored.'
      });

      if (onAuditRecorded) {
        onAuditRecorded(
          'DEVELOPER_PROFILE_RESET',
          'site_settings/developer_profile',
          'Restored public Developer Profile settings to original EVERYKR defaults.'
        );
      }
      if (onRecordAudit) {
        await onRecordAudit(
          'EDIT',
          'site_settings/developer_profile',
          restored.name,
          'Restored public Developer Profile settings to original EVERYKR defaults.'
        );
      }
    } catch {
      setBannerStatus({
        type: 'error',
        message: 'Network error while restoring default settings.'
      });
    } finally {
      setResetting(false);
    }
  };

  const handleDiscardUnsaved = () => {
    setFormState(savedProfile);
    setPendingLocalImageSrc(null);
    setPhotoUploadStatus(null);
    setServerErrors({});
    setRemoteConflictProfile(null);
    setBannerStatus({
      type: 'info',
      message: 'Unsaved edits discarded. Reverted to currently published profile.'
    });
  };

  const activeSocialCount = [
    livePreviewProfile.facebookUrl,
    livePreviewProfile.personalWebsiteUrl,
    livePreviewProfile.kakaoTalkId || livePreviewProfile.kakaoTalkUrl,
    livePreviewProfile.linkedinUrl,
    livePreviewProfile.instagramUrl,
    livePreviewProfile.githubUrl,
    livePreviewProfile.contactEmail
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Security Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>SUPER ADMIN / DEVELOPER PROFILE SHOWCASE &amp; SITE SETTINGS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Code2 className="w-6 h-6 text-[#D6B875]" />
              <span>Developer Profile Showcase &amp; Profile Management</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Manage the public <strong className="text-slate-200">&ldquo;Developed by HASAN MD JAHID&rdquo;</strong>{' '}
              footer credit, interactive Developer Profile Showcase modal, studio portrait photograph,
              biography, project contribution, and verified social &amp; contact channels stored in{' '}
              <code className="text-amber-300 font-mono">site_settings/developer_profile</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#D6B875]/15 hover:bg-[#D6B875]/25 text-[#F5D996] border border-[#D6B875]/40 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Preview Public Modal</span>
            </button>

            <button
              type="button"
              onClick={fetchDeveloperSettings}
              disabled={loading || saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              disabled={loading || saving || resetting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Defaults</span>
            </button>
          </div>
        </div>

        {/* Audit Metadata Strip */}
        <div className="mt-5 pt-4 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Firestore Document:</span>
              <strong className="text-slate-200 font-mono">
                site_settings/developer_profile
              </strong>
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D6B875]" />
              <span>Active Social Channels:</span>
              <strong className="text-white">{activeSocialCount} of 7 configured</strong>
            </span>

            {metadata.updatedAt && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last Published:</span>
                <strong className="text-slate-200">
                  {new Date(metadata.updatedAt).toLocaleString()}
                </strong>
                {metadata.updatedByName && (
                  <span>by {metadata.updatedByName}</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold border ${
                formState.displaySettings.enablePublicDeveloperProfile
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Public Profile:{' '}
              {formState.displaySettings.enablePublicDeveloperProfile
                ? 'Enabled'
                : 'Disabled'}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold border ${
                formState.displaySettings.enableFooterDeveloperCredit
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Footer Credit:{' '}
              {formState.displaySettings.enableFooterDeveloperCredit
                ? 'Visible'
                : 'Hidden'}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Admin Concurrent Edit Warning Banner */}
      {remoteConflictProfile && (
        <div
          role="alert"
          className="rounded-2xl p-4 border bg-amber-950/70 border-amber-500/50 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              Another administrator session just published a newer version of the Developer Profile. Load the latest version to avoid overwriting their changes.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSavedProfile(remoteConflictProfile);
                setFormState(remoteConflictProfile);
                setPendingLocalImageSrc(null);
                setRemoteConflictProfile(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 text-xs font-bold cursor-pointer"
            >
              Load Latest Version
            </button>
            <button
              type="button"
              onClick={() => setRemoteConflictProfile(null)}
              className="text-xs opacity-75 hover:opacity-100 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Status Notification Banner */}
      {bannerStatus && (
        <div
          role="status"
          className={`rounded-2xl p-4 border flex items-start justify-between gap-3 ${
            bannerStatus.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : bannerStatus.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              : 'bg-sky-950/60 border-sky-500/40 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {bannerStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{bannerStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerStatus(null)}
            className="text-xs opacity-75 hover:opacity-100 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLUMNS: PERSONAL INFO, BIOGRAPHY & SOCIAL LINKS */}
          <div className="xl:col-span-7 space-y-6">
            {/* 1. PERSONAL INFORMATION & BIOGRAPHY */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#D6B875]" />
                    <span>1. Personal Information &amp; Project Contribution</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Displayed in the public footer credit and when visitors open the Developer Profile Showcase.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Developer Name */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="dev-profile-name"
                      className="text-xs font-bold text-slate-200 uppercase tracking-wider"
                    >
                      Developer Name <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {formState.name.trim().length}/60
                    </span>
                  </div>
                  <input
                    id="dev-profile-name"
                    type="text"
                    value={formState.name}
                    onChange={(e) => updateTextField('name', e.target.value)}
                    placeholder="HASAN MD JAHID"
                    maxLength={60}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-sm text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      !fieldValidations.name.valid || serverErrors.name
                        ? 'border-rose-500/70 focus:border-rose-400'
                        : 'border-slate-800 focus:border-[#D6B875]'
                    }`}
                  />
                  {(!fieldValidations.name.valid || serverErrors.name) && (
                    <p className="text-xs text-rose-400 font-medium">
                      {serverErrors.name || fieldValidations.name.error}
                    </p>
                  )}
                </div>

                {/* Role / Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="dev-profile-role"
                      className="text-xs font-bold text-slate-200 uppercase tracking-wider"
                    >
                      Role / Title <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {formState.role.trim().length}/80
                    </span>
                  </div>
                  <input
                    id="dev-profile-role"
                    type="text"
                    value={formState.role}
                    onChange={(e) => updateTextField('role', e.target.value)}
                    placeholder="Website Developer & Project Creator"
                    maxLength={80}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-sm text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      !fieldValidations.role.valid || serverErrors.role
                        ? 'border-rose-500/70 focus:border-rose-400'
                        : 'border-slate-800 focus:border-[#D6B875]'
                    }`}
                  />
                  {(!fieldValidations.role.valid || serverErrors.role) && (
                    <p className="text-xs text-rose-400 font-medium">
                      {serverErrors.role || fieldValidations.role.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Developer Location (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="dev-profile-location"
                    className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#D6B875]" />
                    <span>Developer Location (Optional)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {formState.location.trim().length}/100
                  </span>
                </div>
                <input
                  id="dev-profile-location"
                  type="text"
                  value={formState.location}
                  onChange={(e) => updateTextField('location', e.target.value)}
                  placeholder="e.g., Busan & Seoul, South Korea"
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#D6B875] text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Short Biography */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="dev-profile-short-bio"
                    className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Short Professional Biography <span className="text-rose-400">*</span></span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {formState.shortBio.trim().length}/320
                  </span>
                </div>
                <textarea
                  id="dev-profile-short-bio"
                  rows={2}
                  value={formState.shortBio}
                  onChange={(e) => updateTextField('shortBio', e.target.value)}
                  placeholder="Concise headline summary of the developer's background and mission..."
                  maxLength={320}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-sm text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    !fieldValidations.shortBio.valid || serverErrors.shortBio
                      ? 'border-rose-500/70 focus:border-rose-400'
                      : 'border-slate-800 focus:border-[#D6B875]'
                  }`}
                />
                {(!fieldValidations.shortBio.valid || serverErrors.shortBio) && (
                  <p className="text-xs text-rose-400 font-medium">
                    {serverErrors.shortBio || fieldValidations.shortBio.error}
                  </p>
                )}
              </div>

              {/* Detailed Biography / Developer Introduction */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="dev-profile-detailed-bio"
                    className="text-xs font-bold text-slate-200 uppercase tracking-wider"
                  >
                    Detailed Biography / Developer Introduction
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {formState.detailedBio.trim().length}/1200
                  </span>
                </div>
                <textarea
                  id="dev-profile-detailed-bio"
                  rows={4}
                  value={formState.detailedBio}
                  onChange={(e) => updateTextField('detailedBio', e.target.value)}
                  placeholder="Detailed story and engineering vision behind EveryKR..."
                  maxLength={1200}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-sm text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    !fieldValidations.detailedBio.valid || serverErrors.detailedBio
                      ? 'border-rose-500/70 focus:border-rose-400'
                      : 'border-slate-800 focus:border-[#D6B875]'
                  }`}
                />
              </div>

              {/* Project Highlight Title & Contribution */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="dev-profile-project-title"
                      className="text-xs font-bold text-[#D6B875] uppercase tracking-wider"
                    >
                      Project Highlight Title <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {formState.projectTitle.trim().length}/120
                    </span>
                  </div>
                  <input
                    id="dev-profile-project-title"
                    type="text"
                    value={formState.projectTitle}
                    onChange={(e) => updateTextField('projectTitle', e.target.value)}
                    placeholder="EveryKR — Everything Korea, One Platform"
                    maxLength={120}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-[#D6B875] text-sm text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="dev-profile-project-contribution"
                      className="text-xs font-bold text-[#D6B875] uppercase tracking-wider"
                    >
                      Developer&apos;s Contribution to EveryKR <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {formState.projectContribution.trim().length}/600
                    </span>
                  </div>
                  <textarea
                    id="dev-profile-project-contribution"
                    rows={3}
                    value={formState.projectContribution}
                    onChange={(e) => updateTextField('projectContribution', e.target.value)}
                    placeholder="Short description of the developer's contribution to EveryKR..."
                    maxLength={600}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-[#D6B875] text-sm text-white focus:outline-none"
                  />
                  {(!fieldValidations.projectContribution.valid ||
                    serverErrors.projectContribution) && (
                    <p className="text-xs text-rose-400 font-medium">
                      {serverErrors.projectContribution ||
                        fieldValidations.projectContribution.error}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. SOCIAL & CONTACT LINKS (ALL 7 CONFIGURABLE CHANNELS) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>2. Social &amp; Contact Links (HTTPS Enforced)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Only configured links are displayed publicly. Leave any field empty to hide that channel cleanly.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Facebook URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      1. Facebook URL
                    </label>
                    {formState.facebookUrl.trim() ? (
                      <button
                        type="button"
                        onClick={() => updateTextField('facebookUrl', '')}
                        className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                      >
                        Clear &amp; Hide
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Hidden</span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formState.facebookUrl}
                    onChange={(e) => updateTextField('facebookUrl', e.target.value)}
                    placeholder="https://www.facebook.com/Zaahid.official"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none ${
                      !fieldValidations.facebookUrl.valid
                        ? 'border-rose-500/70'
                        : 'border-slate-800 focus:border-blue-500'
                    }`}
                  />
                  {!fieldValidations.facebookUrl.valid && (
                    <p className="text-[11px] text-rose-400">
                      {fieldValidations.facebookUrl.error}
                    </p>
                  )}
                </div>

                {/* 2. Personal Website URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      2. Personal Website URL
                    </label>
                    {formState.personalWebsiteUrl.trim() ? (
                      <button
                        type="button"
                        onClick={() => updateTextField('personalWebsiteUrl', '')}
                        className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                      >
                        Clear &amp; Hide
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Hidden</span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formState.personalWebsiteUrl}
                    onChange={(e) => updateTextField('personalWebsiteUrl', e.target.value)}
                    placeholder="https://your-portfolio.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none ${
                      !fieldValidations.personalWebsiteUrl.valid
                        ? 'border-rose-500/70'
                        : 'border-slate-800 focus:border-[#D6B875]'
                    }`}
                  />
                  {!fieldValidations.personalWebsiteUrl.valid && (
                    <p className="text-[11px] text-rose-400">
                      {fieldValidations.personalWebsiteUrl.error}
                    </p>
                  )}
                </div>

                {/* 3a. KakaoTalk ID */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>3a. KakaoTalk ID</span>
                    </label>
                    {formState.kakaoTalkId.trim() ? (
                      <button
                        type="button"
                        onClick={() => updateTextField('kakaoTalkId', '')}
                        className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                      >
                        Clear &amp; Hide
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Hidden</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formState.kakaoTalkId}
                    onChange={(e) => updateTextField('kakaoTalkId', e.target.value)}
                    placeholder="zahid92443"
                    maxLength={24}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none ${
                      !fieldValidations.kakaoTalkId.valid
                        ? 'border-rose-500/70'
                        : 'border-slate-800 focus:border-amber-400'
                    }`}
                  />
                  {!fieldValidations.kakaoTalkId.valid && (
                    <p className="text-[11px] text-rose-400">
                      {fieldValidations.kakaoTalkId.error}
                    </p>
                  )}
                </div>

                {/* 3b. KakaoTalk Profile URL (Optional) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      3b. KakaoTalk Profile URL (Optional)
                    </label>
                    {formState.kakaoTalkUrl.trim() ? (
                      <button
                        type="button"
                        onClick={() => updateTextField('kakaoTalkUrl', '')}
                        className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                      >
                        Clear
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Uses Copy ID</span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formState.kakaoTalkUrl}
                    onChange={(e) => updateTextField('kakaoTalkUrl', e.target.value)}
                    placeholder="https://open.kakao.com/o/..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none ${
                      !fieldValidations.kakaoTalkUrl.valid
                        ? 'border-rose-500/70'
                        : 'border-slate-800 focus:border-amber-400'
                    }`}
                  />
                  {!fieldValidations.kakaoTalkUrl.valid && (
                    <p className="text-[11px] text-rose-400">
                      {fieldValidations.kakaoTalkUrl.error}
                    </p>
                  )}
                </div>

                {/* 4. LinkedIn URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      4. LinkedIn URL
                    </label>
                    {formState.linkedinUrl.trim() ? (
                      <button
                        type="button"
                        onClick={() => updateTextField('linkedinUrl', '')}
                        className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                      >
                        Clear &amp; Hide
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Hidden</span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formState.linkedinUrl}
                    onChange={(e) => updateTextField('linkedinUrl', e.target.value)}
                    placeholder="https://www.linkedin.com/in/..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none ${
                      !fieldValidations.linkedinUrl.valid
                        ? 'border-rose-500/70'
                        : 'border-slate-800 focus:border-sky-400'
                    }`}
                  />
                  {!fieldValidations.linkedinUrl.valid && (
                    <p className="text-[11px] text-rose-400">
                      {fieldValidations.linkedinUrl.error}
                    </p>
                  )}
                </div>

                {/* 5. Instagram URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      5. Instagram URL
                    </label>
                    {formState.instagramUrl.trim() ? (
                      <button
                        type="button"
                        onClick={() => updateTextField('instagramUrl', '')}
                        className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                      >
                        Clear &amp; Hide
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Hidden</span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formState.instagramUrl}
                    onChange={(e) => updateTextField('instagramUrl', e.target.value)}
                    placeholder="https://www.instagram.com/..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none ${
                      !fieldValidations.instagramUrl.valid
                        ? 'border-rose-500/70'
                        : 'border-slate-800 focus:border-pink-400'
                    }`}
                  />
                  {!fieldValidations.instagramUrl.valid && (
                    <p className="text-[11px] text-rose-400">
                      {fieldValidations.instagramUrl.error}
                    </p>
                  )}
                </div>

                {/* 6. GitHub URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      6. GitHub URL
                    </label>
                    {formState.githubUrl.trim() ? (
                      <button
                        type="button"
                        onClick={() => updateTextField('githubUrl', '')}
                        className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                      >
                        Clear &amp; Hide
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Hidden</span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formState.githubUrl}
                    onChange={(e) => updateTextField('githubUrl', e.target.value)}
                    placeholder="https://github.com/..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none ${
                      !fieldValidations.githubUrl.valid
                        ? 'border-rose-500/70'
                        : 'border-slate-800 focus:border-slate-400'
                    }`}
                  />
                  {!fieldValidations.githubUrl.valid && (
                    <p className="text-[11px] text-rose-400">
                      {fieldValidations.githubUrl.error}
                    </p>
                  )}
                </div>

                {/* 7. Contact Email */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      <span>7. Contact Email</span>
                    </label>
                    {formState.contactEmail.trim() ? (
                      <button
                        type="button"
                        onClick={() => updateTextField('contactEmail', '')}
                        className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                      >
                        Clear &amp; Hide
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Hidden</span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={formState.contactEmail}
                    onChange={(e) => updateTextField('contactEmail', e.target.value)}
                    placeholder="developer@everykr.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none ${
                      !fieldValidations.contactEmail.valid
                        ? 'border-rose-500/70'
                        : 'border-slate-800 focus:border-emerald-400'
                    }`}
                  />
                  {!fieldValidations.contactEmail.valid && (
                    <p className="text-[11px] text-rose-400">
                      {fieldValidations.contactEmail.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: PROFILE IMAGE STUDIO + DISPLAY SETTINGS */}
          <div className="xl:col-span-5 space-y-6">
            {/* 3. PROFILE IMAGE UPLOAD, CROP & REPOSITION STUDIO */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#D6B875]" />
                    <span>3. Profile Image Management</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload JPG, JPEG, PNG, or WebP (max 5 MB). Crop, reposition, and preview before saving.
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleSelectPhotoFile}
                className="hidden"
              />

              {/* Live Portrait Framing Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-6 max-w-[220px] mx-auto w-full">
                  <DeveloperPortraitFrame
                    profile={livePreviewProfile}
                    sizeVariant="hero"
                    isNight={true}
                  />
                </div>

                <div className="sm:col-span-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto || saving}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#D6B875] hover:bg-[#E5CA8A] text-[#050B18] shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload New Photograph</span>
                  </button>

                  {(pendingLocalImageSrc ||
                    formState.imageCrop.zoom !== 1 ||
                    formState.imageCrop.offsetX !== 0 ||
                    formState.imageCrop.offsetY !== 0) && (
                    <button
                      type="button"
                      onClick={handleUploadAndApplyPhoto}
                      disabled={uploadingPhoto || saving}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {uploadingPhoto
                          ? 'Uploading Cropped Photo...'
                          : 'Upload & Apply Cropped Portrait'}
                      </span>
                    </button>
                  )}

                  {formState.profileImageUrl !==
                    DEFAULT_DEVELOPER_PROFILE.profileImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingLocalImageSrc(null);
                        setFormState((prev) => ({
                          ...prev,
                          profileImageUrl: DEFAULT_DEVELOPER_PROFILE.profileImageUrl,
                          profileImagePath: DEFAULT_DEVELOPER_PROFILE.profileImagePath,
                          imageCrop: { ...DEFAULT_DEVELOPER_IMAGE_CROP }
                        }));
                        setPhotoUploadStatus({
                          type: 'info',
                          message:
                            'Reverted to default studio portrait in preview. Save changes to publish.'
                        });
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Use Default Studio Portrait</span>
                    </button>
                  )}

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <div className="font-semibold text-slate-300">
                      Storage Safety Guarantee
                    </div>
                    <p>
                      Previous profile images are never deleted before the new photograph is uploaded and saved.
                    </p>
                  </div>
                </div>
              </div>

              {photoUploadStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium ${
                    photoUploadStatus.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                      : photoUploadStatus.type === 'error'
                      ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                      : 'bg-sky-950/50 border-sky-500/40 text-sky-200'
                  }`}
                >
                  {photoUploadStatus.message}
                </div>
              )}

              {/* Crop & Reposition Controls */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#D6B875]" />
                    <span>Crop, Aspect Ratio &amp; Reposition</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCropSetting({ ...DEFAULT_DEVELOPER_IMAGE_CROP })}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Reset Framing
                  </button>
                </div>

                {/* Aspect Ratio Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: '4:5', label: '4:5 Editorial' },
                      { id: '3:4', label: '3:4 Studio' },
                      { id: '1:1', label: '1:1 Square' }
                    ] as const
                  ).map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => updateCropSetting({ aspectRatio: ratio.id })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        formState.imageCrop.aspectRatio === ratio.id
                          ? 'bg-[#D6B875]/20 border-[#D6B875] text-[#F5D996]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>

                {/* Zoom Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Zoom Scale</span>
                    <span className="font-mono text-slate-200">
                      {formState.imageCrop.zoom.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={2.2}
                    step={0.02}
                    value={formState.imageCrop.zoom}
                    onChange={(e) =>
                      updateCropSetting({ zoom: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full accent-[#D6B875] cursor-pointer"
                  />
                </div>

                {/* Horizontal & Vertical Offset Sliders */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Horizontal (X)</span>
                      <span className="font-mono text-slate-200">
                        {formState.imageCrop.offsetX}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      step={1}
                      value={formState.imageCrop.offsetX}
                      onChange={(e) =>
                        updateCropSetting({ offsetX: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full accent-[#D6B875] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Vertical (Y)</span>
                      <span className="font-mono text-slate-200">
                        {formState.imageCrop.offsetY}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      step={1}
                      value={formState.imageCrop.offsetY}
                      onChange={(e) =>
                        updateCropSetting({ offsetY: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full accent-[#D6B875] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. DISPLAY SETTINGS & LAYOUT SELECTION */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layout className="w-4 h-4 text-emerald-400" />
                    <span>4. Display Settings &amp; Layout</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Control visibility and choose the public Developer Profile Showcase presentation layout.
                  </p>
                </div>
              </div>

              {/* Visibility Toggles */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    updateDisplaySetting({
                      enableFooterDeveloperCredit:
                        !formState.displaySettings.enableFooterDeveloperCredit
                    })
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white">
                      Show Footer Developer Credit
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Displays &ldquo;Developed by {formState.name || 'HASAN MD JAHID'}&rdquo; at the bottom of public pages.
                    </div>
                  </div>
                  {formState.displaySettings.enableFooterDeveloperCredit ? (
                    <ToggleRight className="w-7 h-7 text-emerald-400 shrink-0" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateDisplaySetting({
                      enablePublicDeveloperProfile:
                        !formState.displaySettings.enablePublicDeveloperProfile
                    })
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white">
                      Enable Interactive Public Developer Profile
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Clicking the footer developer credit opens the full Developer Profile Showcase modal.
                    </div>
                  </div>
                  {formState.displaySettings.enablePublicDeveloperProfile ? (
                    <ToggleRight className="w-7 h-7 text-emerald-400 shrink-0" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600 shrink-0" />
                  )}
                </button>
              </div>

              {/* Layout Style Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Profile Showcase Layout Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        id: 'split_editorial',
                        title: 'Split Editorial',
                        desc: 'Studio portrait left + full story right'
                      },
                      {
                        id: 'centered_monograph',
                        title: 'Centered Monograph',
                        desc: 'Centered portrait & executive bio'
                      },
                      {
                        id: 'compact_card',
                        title: 'Compact Card',
                        desc: 'Streamlined overview & direct links'
                      }
                    ] as {
                      id: DeveloperProfileLayoutStyle;
                      title: string;
                      desc: string;
                    }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateDisplaySetting({ layoutStyle: opt.id })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        formState.displaySettings.layoutStyle === opt.id
                          ? 'bg-[#D6B875]/15 border-[#D6B875] text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.title}</div>
                      <div className="text-[10px] opacity-80 mt-0.5 leading-snug">
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky / Bottom Action Bar */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>You have unsaved changes ready to publish.</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>All changes are synchronized with the public website.</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleDiscardUnsaved}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              >
                Discard Unsaved Edits
              </button>
            )}

            <button
              type="submit"
              disabled={saving || uploadingPhoto || hasValidationErrors}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-[#D6B875] hover:bg-[#E5CA8A] text-[#050B18] shadow-lg shadow-[#D6B875]/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving ? 'Saving & Publishing...' : 'Save & Publish Developer Profile'}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* LIVE PUBLIC PREVIEW SECTION (BOTH FOOTER BAR & FULL SHOWCASE) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#D6B875]" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Live Public Profile Showcase Preview (Before &amp; After Publishing)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTheme('dark')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  previewTheme === 'dark'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dark Theme
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme('light')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  previewTheme === 'light'
                    ? 'bg-white text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Light Theme
              </button>
            </div>
          </div>
        </div>

        {/* 1. Footer Developer Credit Strip Preview */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            A. Public Footer Developer Credit Bar
          </div>
          <div
            className={`p-4 rounded-2xl border transition-colors ${
              previewTheme === 'dark'
                ? 'bg-[#071126] border-white/10'
                : 'bg-[#F1F5FB] border-slate-200'
            }`}
          >
            <DeveloperProfileBar
              overrideProfile={livePreviewProfile}
              isNight={previewTheme === 'dark'}
            />
          </div>
        </div>

        {/* 2. Full Developer Profile Showcase Modal Content Preview */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            B. Full Developer Profile Showcase (Opened When Visitor Clicks &ldquo;Developed by{' '}
            {livePreviewProfile.name}&rdquo;)
          </div>
          <DeveloperProfileShowcaseContent
            profile={livePreviewProfile}
            isNight={previewTheme === 'dark'}
            isPreviewMode={true}
          />
        </div>
      </div>

      {/* Interactive Modal Preview */}
      <DeveloperProfileShowcaseModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        overrideProfile={livePreviewProfile}
        isNight={previewTheme === 'dark'}
      />

      {/* Restore Defaults Confirmation Modal */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Restore Original Developer Profile Defaults?
                </h4>
                <p className="text-xs text-slate-400">
                  This will reset the public Developer Profile Showcase to EVERYKR&apos;s default configuration.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs space-y-1.5 text-slate-300">
              <div>
                <span className="text-slate-500">Name:</span>{' '}
                <strong>{DEFAULT_DEVELOPER_PROFILE.name}</strong>
              </div>
              <div>
                <span className="text-slate-500">Role:</span>{' '}
                <strong>{DEFAULT_DEVELOPER_PROFILE.role}</strong>
              </div>
              <div>
                <span className="text-slate-500">Facebook:</span>{' '}
                <span className="font-mono text-[11px]">
                  {DEFAULT_DEVELOPER_PROFILE.facebookUrl}
                </span>
              </div>
              <div>
                <span className="text-slate-500">KakaoTalk ID:</span>{' '}
                <strong className="font-mono">
                  {DEFAULT_DEVELOPER_PROFILE.kakaoTalkId}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                disabled={resetting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDefaults}
                disabled={resetting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-50"
              >
                {resetting ? 'Restoring...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
