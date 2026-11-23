/**
 * Shared validation, normalization, and sanitization utilities for the
 * EVERYKR Developer Profile Showcase & Site Settings system.
 *
 * Used identically on both client (AdminDeveloperSettingsTab, DeveloperProfileBar, Footer)
 * and server (Express /api/admin/site-settings/developer-profile & /api/site-settings/developer-profile)
 * as well as Firestore `site_settings/developer_profile`.
 */

export type DeveloperProfileLayoutStyle =
  | 'split_editorial'
  | 'centered_monograph'
  | 'compact_card';

export type DeveloperProfileAspectRatio = '4:5' | '3:4' | '1:1';

export interface DeveloperProfileImageCrop {
  zoom: number; // 1.0 to 2.5
  offsetX: number; // -50 to 50 (%)
  offsetY: number; // -50 to 50 (%)
  aspectRatio: DeveloperProfileAspectRatio;
}

export interface DeveloperProfileSocialLinks {
  facebookUrl: string;
  personalWebsiteUrl: string;
  kakaoTalkId: string;
  kakaoTalkUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
  githubUrl: string;
  contactEmail: string;
}

export interface DeveloperProfileDisplaySettings {
  enablePublicDeveloperProfile: boolean;
  enableFooterDeveloperCredit: boolean;
  layoutStyle: DeveloperProfileLayoutStyle;
}

export interface DeveloperProfileSettings {
  // Core Identity & Biography
  name: string;
  developerName: string;
  role: string;
  shortBio: string;
  detailedBio: string;
  projectTitle: string;
  projectContribution: string;
  location: string;

  // Profile Photograph & Framing
  profileImageUrl: string;
  profileImagePath: string;
  profileImageAlt: string;
  fallbackImageDataUrl?: string;
  imageUpdatedAt?: string;
  imageCrop: DeveloperProfileImageCrop;

  // Top-level Social & Contact Links (synchronized with `socialLinks`)
  facebookUrl: string;
  personalWebsiteUrl: string;
  kakaoTalkId: string;
  kakaoTalkUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
  githubUrl: string;
  contactEmail: string;

  // Structured objects for Firestore `site_settings/developer_profile`
  socialLinks: DeveloperProfileSocialLinks;
  displaySettings: DeveloperProfileDisplaySettings;

  // Persistence & Cross-Browser Synchronization Metadata
  updatedAt?: string;
  version?: number;
}

export interface DeveloperProfileValidationResult {
  valid: boolean;
  errors: Partial<Record<string, string>>;
  sanitized: DeveloperProfileSettings;
}

export const DEFAULT_DEVELOPER_IMAGE_CROP: DeveloperProfileImageCrop = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  aspectRatio: '4:5'
};

export const DEFAULT_DEVELOPER_SOCIAL_LINKS: DeveloperProfileSocialLinks = {
  facebookUrl: 'https://www.facebook.com/Zaahid.official',
  personalWebsiteUrl: '',
  kakaoTalkId: 'zahid92443',
  kakaoTalkUrl: '',
  linkedinUrl: '',
  instagramUrl: '',
  githubUrl: '',
  contactEmail: ''
};

export const DEFAULT_DEVELOPER_DISPLAY_SETTINGS: DeveloperProfileDisplaySettings = {
  enablePublicDeveloperProfile: true,
  enableFooterDeveloperCredit: true,
  layoutStyle: 'split_editorial'
};

export const DEFAULT_DEVELOPER_PROFILE: DeveloperProfileSettings = {
  name: 'HASAN MD JAHID',
  developerName: 'HASAN MD JAHID',
  role: 'Website Developer & Project Creator',
  shortBio:
    'Full-stack software architect and creator of EveryKR, building digital infrastructure for international students, researchers, and global talent across South Korea.',
  detailedBio:
    'HASAN MD JAHID conceived, designed, and engineered EveryKR from the ground up to solve the fragmented information landscape faced by international students arriving in South Korea. By combining verified university admissions data, scholarship intelligence, authentic Korean language education, housing discovery, arrival logistics, and community support into one cohesive platform, he continues to lead EveryKR’s product architecture and full-stack engineering.',
  projectTitle: 'EveryKR — Everything Korea, One Platform',
  projectContribution:
    'Lead Architect & Creator — Designed and built the full-stack EveryKR ecosystem including the 25-university admissions & scholarship directory, Learn Korean 5.0 & Hangul interactive academy, verified student housing & SIM arrival systems, Essential Hub, and multi-language student experience.',
  location: 'Busan & Seoul, South Korea',
  profileImageUrl: '/developer-hasan-md-jahid.jpg',
  profileImagePath: 'public/developer-hasan-md-jahid.jpg',
  profileImageAlt: 'HASAN MD JAHID — Website Developer & Project Creator of EveryKR',
  imageCrop: { ...DEFAULT_DEVELOPER_IMAGE_CROP },
  facebookUrl: DEFAULT_DEVELOPER_SOCIAL_LINKS.facebookUrl,
  personalWebsiteUrl: DEFAULT_DEVELOPER_SOCIAL_LINKS.personalWebsiteUrl,
  kakaoTalkId: DEFAULT_DEVELOPER_SOCIAL_LINKS.kakaoTalkId,
  kakaoTalkUrl: DEFAULT_DEVELOPER_SOCIAL_LINKS.kakaoTalkUrl,
  linkedinUrl: DEFAULT_DEVELOPER_SOCIAL_LINKS.linkedinUrl,
  instagramUrl: DEFAULT_DEVELOPER_SOCIAL_LINKS.instagramUrl,
  githubUrl: DEFAULT_DEVELOPER_SOCIAL_LINKS.githubUrl,
  contactEmail: DEFAULT_DEVELOPER_SOCIAL_LINKS.contactEmail,
  socialLinks: { ...DEFAULT_DEVELOPER_SOCIAL_LINKS },
  displaySettings: { ...DEFAULT_DEVELOPER_DISPLAY_SETTINGS }
};

const DANGEROUS_MARKUP_OR_PROTOCOL_PATTERN =
  /[<>]|javascript:|data:(?!image\/(?:jpeg|jpg|png|webp);base64,)|vbscript:|file:|blob:|on\w+\s*=/i;

const DANGEROUS_TEXT_MARKUP_PATTERN =
  /[<>]|javascript:|data:|vbscript:|file:|on\w+\s*=/i;

const KAKAOTALK_ID_PATTERN = /^[A-Za-z0-9._-]{4,24}$/;

const EMAIL_ADDRESS_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

const ALLOWED_FACEBOOK_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.com',
  'www.fb.com'
]);

const ALLOWED_LINKEDIN_HOSTS = new Set([
  'linkedin.com',
  'www.linkedin.com',
  'kr.linkedin.com',
  'mobile.linkedin.com'
]);

const ALLOWED_INSTAGRAM_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'instagr.am'
]);

const ALLOWED_GITHUB_HOSTS = new Set([
  'github.com',
  'www.github.com',
  'gist.github.com'
]);

const ALLOWED_KAKAOTALK_HOSTS = new Set([
  'open.kakao.com',
  'qr.kakao.com',
  'pf.kakao.com',
  'talk.kakao.com',
  'kakao.com',
  'www.kakao.com'
]);

function stripControlChars(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function stripSingleLineControlChars(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

/**
 * Validates and normalizes Developer Name:
 * - Required
 * - 2 to 60 characters
 * - Rejects HTML tags or script/protocol tokens
 */
export function validateDeveloperName(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  const cleaned = stripSingleLineControlChars(raw).replace(/\s+/g, ' ');
  if (!cleaned) {
    return { valid: false, value: '', error: 'Developer Name is required.' };
  }
  if (cleaned.length < 2 || cleaned.length > 60) {
    return {
      valid: false,
      value: cleaned,
      error: 'Developer Name must be between 2 and 60 characters.'
    };
  }
  if (DANGEROUS_TEXT_MARKUP_PATTERN.test(cleaned)) {
    return {
      valid: false,
      value: cleaned,
      error: 'Developer Name cannot contain HTML tags or unsafe script tokens.'
    };
  }
  return { valid: true, value: cleaned };
}

/**
 * Validates and normalizes Developer Role / Title:
 * - Required
 * - 2 to 80 characters
 * - Rejects HTML tags or script/protocol tokens
 */
export function validateDeveloperRole(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  const cleaned = stripSingleLineControlChars(raw).replace(/\s+/g, ' ');
  if (!cleaned) {
    return { valid: false, value: '', error: 'Developer Role / Title is required.' };
  }
  if (cleaned.length < 2 || cleaned.length > 80) {
    return {
      valid: false,
      value: cleaned,
      error: 'Developer Role / Title must be between 2 and 80 characters.'
    };
  }
  if (DANGEROUS_TEXT_MARKUP_PATTERN.test(cleaned)) {
    return {
      valid: false,
      value: cleaned,
      error: 'Developer Role / Title cannot contain HTML tags or unsafe script tokens.'
    };
  }
  return { valid: true, value: cleaned };
}

/**
 * Validates a bounded text field (such as Short Bio, Detailed Bio, Project Title,
 * Project Contribution, Location, or Alt Text).
 */
export function validateDeveloperTextField(
  raw: unknown,
  options: {
    label: string;
    required?: boolean;
    minLength?: number;
    maxLength: number;
    multiline?: boolean;
  }
): {
  valid: boolean;
  value: string;
  error?: string;
} {
  const cleaned = options.multiline
    ? stripControlChars(raw)
    : stripSingleLineControlChars(raw).replace(/\s+/g, ' ');

  if (!cleaned) {
    if (options.required) {
      return {
        valid: false,
        value: '',
        error: `${options.label} is required.`
      };
    }
    return { valid: true, value: '' };
  }

  if (options.minLength && cleaned.length < options.minLength) {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} must be at least ${options.minLength} characters.`
    };
  }

  if (cleaned.length > options.maxLength) {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} must be ${options.maxLength} characters or fewer.`
    };
  }

  if (DANGEROUS_TEXT_MARKUP_PATTERN.test(cleaned)) {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} cannot contain HTML tags or unsafe script tokens.`
    };
  }

  return { valid: true, value: cleaned };
}

/**
 * Generic strict HTTPS URL validator for social/external links.
 * - Optional when `allowEmpty` is true (empty string hides the link cleanly).
 * - Requires `https:` protocol and a valid domain name.
 * - Optionally restricts hostname to an approved domain set.
 */
export function validateHttpsExternalUrl(
  raw: unknown,
  options: {
    label: string;
    allowEmpty?: boolean;
    allowedHosts?: Set<string>;
    allowedHostDescription?: string;
    requiredPathSegment?: boolean;
  }
): {
  valid: boolean;
  value: string;
  error?: string;
} {
  const cleaned = stripSingleLineControlChars(raw);
  if (!cleaned) {
    if (options.allowEmpty !== false) {
      return { valid: true, value: '' };
    }
    return { valid: false, value: '', error: `${options.label} is required.` };
  }

  if (cleaned.length > 350) {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} must be 350 characters or fewer.`
    };
  }

  if (DANGEROUS_TEXT_MARKUP_PATTERN.test(cleaned)) {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} contains disallowed characters or unsafe protocol tokens.`
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} must be a complete valid URL starting with https://.`
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} must use https:// for security.`
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} cannot contain embedded credentials.`
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || !host.includes('.') || host.endsWith('.')) {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} must include a valid domain name.`
    };
  }

  if (options.allowedHosts && !options.allowedHosts.has(host)) {
    return {
      valid: false,
      value: cleaned,
      error: `${options.label} must be an official ${
        options.allowedHostDescription || 'supported'
      } domain.`
    };
  }

  if (options.requiredPathSegment) {
    const pathSegment = parsed.pathname.replace(/^\/+|\/+$/g, '').trim();
    if (!pathSegment) {
      return {
        valid: false,
        value: cleaned,
        error: `${options.label} must include a profile path.`
      };
    }
  }

  return { valid: true, value: parsed.toString() };
}

/**
 * Validates and normalizes Facebook Profile URL:
 * - Optional (empty string hides the Facebook link on the public profile)
 * - When provided, must be a valid https:// URL on an official Facebook domain
 */
export function validateFacebookUrl(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  return validateHttpsExternalUrl(raw, {
    label: 'Facebook URL',
    allowEmpty: true,
    allowedHosts: ALLOWED_FACEBOOK_HOSTS,
    allowedHostDescription: 'facebook.com or fb.com',
    requiredPathSegment: true
  });
}

/**
 * Validates and normalizes KakaoTalk ID:
 * - Optional (empty string hides the KakaoTalk ID if not configured)
 * - 4 to 24 characters when provided
 * - Letters, numbers, dots (.), underscores (_), and hyphens (-) only
 */
export function validateKakaoTalkId(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  const cleaned = stripSingleLineControlChars(raw);
  if (!cleaned) {
    return { valid: true, value: '' };
  }
  if (DANGEROUS_TEXT_MARKUP_PATTERN.test(cleaned)) {
    return {
      valid: false,
      value: cleaned,
      error: 'KakaoTalk ID contains disallowed characters.'
    };
  }
  if (!KAKAOTALK_ID_PATTERN.test(cleaned)) {
    return {
      valid: false,
      value: cleaned,
      error:
        'KakaoTalk ID must be 4–24 characters using only letters, numbers, dots (.), underscores (_), or hyphens (-).'
    };
  }
  return { valid: true, value: cleaned };
}

/**
 * Validates and normalizes optional KakaoTalk Open Profile / Channel URL:
 * - Optional (empty string uses Copy ID action instead)
 * - When provided, must be https:// on kakao.com / open.kakao.com
 */
export function validateKakaoTalkUrl(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  return validateHttpsExternalUrl(raw, {
    label: 'KakaoTalk Profile URL',
    allowEmpty: true,
    allowedHosts: ALLOWED_KAKAOTALK_HOSTS,
    allowedHostDescription: 'open.kakao.com or kakao.com',
    requiredPathSegment: true
  });
}

/**
 * Validates and normalizes Personal Website URL:
 * - Optional (empty string hides the Website button cleanly)
 * - If provided, must be a valid https:// URL
 */
export function validatePersonalWebsiteUrl(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  const res = validateHttpsExternalUrl(raw, {
    label: 'Personal Website URL',
    allowEmpty: true
  });
  if (!res.valid || !res.value) return res;
  try {
    const parsed = new URL(res.value);
    const normalized =
      parsed.pathname === '/' && !parsed.search && !parsed.hash
        ? `${parsed.protocol}//${parsed.host}`
        : parsed.toString();
    return { valid: true, value: normalized };
  } catch {
    return res;
  }
}

/**
 * Validates LinkedIn URL (optional, HTTPS only).
 */
export function validateLinkedinUrl(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  return validateHttpsExternalUrl(raw, {
    label: 'LinkedIn URL',
    allowEmpty: true,
    allowedHosts: ALLOWED_LINKEDIN_HOSTS,
    allowedHostDescription: 'linkedin.com',
    requiredPathSegment: true
  });
}

/**
 * Validates Instagram URL (optional, HTTPS only).
 */
export function validateInstagramUrl(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  return validateHttpsExternalUrl(raw, {
    label: 'Instagram URL',
    allowEmpty: true,
    allowedHosts: ALLOWED_INSTAGRAM_HOSTS,
    allowedHostDescription: 'instagram.com',
    requiredPathSegment: true
  });
}

/**
 * Validates GitHub URL (optional, HTTPS only).
 */
export function validateGithubUrl(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  return validateHttpsExternalUrl(raw, {
    label: 'GitHub URL',
    allowEmpty: true,
    allowedHosts: ALLOWED_GITHUB_HOSTS,
    allowedHostDescription: 'github.com',
    requiredPathSegment: true
  });
}

/**
 * Validates Contact Email (optional; when provided must be a valid email address).
 */
export function validateDeveloperContactEmail(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  const cleaned = stripSingleLineControlChars(raw)
    .replace(/^mailto:/i, '')
    .trim();
  if (!cleaned) {
    return { valid: true, value: '' };
  }
  if (cleaned.length > 160 || DANGEROUS_TEXT_MARKUP_PATTERN.test(cleaned)) {
    return {
      valid: false,
      value: cleaned,
      error: 'Contact Email contains invalid characters.'
    };
  }
  if (!EMAIL_ADDRESS_PATTERN.test(cleaned)) {
    return {
      valid: false,
      value: cleaned,
      error: 'Please enter a valid Contact Email address (e.g., name@domain.com).'
    };
  }
  return { valid: true, value: cleaned };
}

/**
 * Validates a profile image URL or relative public path or safe data:image/* URI.
 */
export function validateProfileImageUrl(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  const cleaned = stripSingleLineControlChars(raw);
  if (!cleaned) {
    return { valid: true, value: DEFAULT_DEVELOPER_PROFILE.profileImageUrl };
  }

  if (DANGEROUS_MARKUP_OR_PROTOCOL_PATTERN.test(cleaned)) {
    return {
      valid: false,
      value: '',
      error: 'Profile photo URL contains unsafe characters or unsupported protocol.'
    };
  }

  // Allow relative local public paths starting with `/` (e.g. `/developer-hasan-md-jahid.jpg` or `/uploads/...`)
  if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
    return { valid: true, value: cleaned };
  }

  // Allow safe base64 encoded JPG/PNG/WebP cropped portraits bounded in size
  if (/^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(cleaned)) {
    if (cleaned.length > 6_500_000) {
      return {
        valid: false,
        value: '',
        error: 'Encoded profile image exceeds maximum size (5 MB).'
      };
    }
    return { valid: true, value: cleaned };
  }

  // Otherwise require HTTPS URL (e.g. Firebase Storage download URL)
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        value: cleaned,
        error: 'External profile photo URL must use https://.'
      };
    }
    return { valid: true, value: parsed.toString() };
  } catch {
    return {
      valid: false,
      value: cleaned,
      error: 'Profile photo URL must be a valid https:// URL or relative asset path.'
    };
  }
}

export function sanitizeImageCrop(raw: unknown): DeveloperProfileImageCrop {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawZoom = Number(obj.zoom);
  const rawOffsetX = Number(obj.offsetX);
  const rawOffsetY = Number(obj.offsetY);
  const rawAspect = obj.aspectRatio;

  const zoom = Number.isFinite(rawZoom)
    ? Math.min(2.5, Math.max(1, Number(rawZoom.toFixed(2))))
    : DEFAULT_DEVELOPER_IMAGE_CROP.zoom;
  const offsetX = Number.isFinite(rawOffsetX)
    ? Math.min(50, Math.max(-50, Math.round(rawOffsetX)))
    : DEFAULT_DEVELOPER_IMAGE_CROP.offsetX;
  const offsetY = Number.isFinite(rawOffsetY)
    ? Math.min(50, Math.max(-50, Math.round(rawOffsetY)))
    : DEFAULT_DEVELOPER_IMAGE_CROP.offsetY;
  const aspectRatio: DeveloperProfileAspectRatio =
    rawAspect === '1:1' || rawAspect === '3:4' || rawAspect === '4:5'
      ? rawAspect
      : DEFAULT_DEVELOPER_IMAGE_CROP.aspectRatio;

  return { zoom, offsetX, offsetY, aspectRatio };
}

export function sanitizeDisplaySettings(raw: unknown): DeveloperProfileDisplaySettings {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const enablePublicDeveloperProfile =
    typeof obj.enablePublicDeveloperProfile === 'boolean'
      ? obj.enablePublicDeveloperProfile
      : DEFAULT_DEVELOPER_DISPLAY_SETTINGS.enablePublicDeveloperProfile;
  const enableFooterDeveloperCredit =
    typeof obj.enableFooterDeveloperCredit === 'boolean'
      ? obj.enableFooterDeveloperCredit
      : DEFAULT_DEVELOPER_DISPLAY_SETTINGS.enableFooterDeveloperCredit;
  const layoutStyle: DeveloperProfileLayoutStyle =
    obj.layoutStyle === 'centered_monograph' ||
    obj.layoutStyle === 'compact_card' ||
    obj.layoutStyle === 'split_editorial'
      ? obj.layoutStyle
      : DEFAULT_DEVELOPER_DISPLAY_SETTINGS.layoutStyle;

  return {
    enablePublicDeveloperProfile,
    enableFooterDeveloperCredit,
    layoutStyle
  };
}

/**
 * Validates a full or partial DeveloperProfileSettings payload.
 */
export function validateDeveloperProfilePayload(
  input: unknown
): DeveloperProfileValidationResult {
  const rawObj =
    input && typeof input === 'object' ? (input as Record<string, any>) : {};
  const rawSocial =
    rawObj.socialLinks && typeof rawObj.socialLinks === 'object'
      ? (rawObj.socialLinks as Record<string, any>)
      : {};

  const nameRes = validateDeveloperName(
    rawObj.name ?? rawObj.developerName ?? DEFAULT_DEVELOPER_PROFILE.name
  );
  const roleRes = validateDeveloperRole(
    rawObj.role ?? DEFAULT_DEVELOPER_PROFILE.role
  );

  const shortBioRes = validateDeveloperTextField(
    rawObj.shortBio ?? DEFAULT_DEVELOPER_PROFILE.shortBio,
    {
      label: 'Short Biography',
      required: true,
      minLength: 10,
      maxLength: 320,
      multiline: true
    }
  );

  const detailedBioRes = validateDeveloperTextField(
    rawObj.detailedBio ?? DEFAULT_DEVELOPER_PROFILE.detailedBio,
    {
      label: 'Developer Introduction / Detailed Biography',
      required: false,
      maxLength: 1200,
      multiline: true
    }
  );

  const projectTitleRes = validateDeveloperTextField(
    rawObj.projectTitle ?? DEFAULT_DEVELOPER_PROFILE.projectTitle,
    {
      label: 'Project Highlight Title',
      required: true,
      minLength: 3,
      maxLength: 120
    }
  );

  const projectContributionRes = validateDeveloperTextField(
    rawObj.projectContribution ?? DEFAULT_DEVELOPER_PROFILE.projectContribution,
    {
      label: 'Contribution to EveryKR',
      required: true,
      minLength: 10,
      maxLength: 600,
      multiline: true
    }
  );

  const locationRes = validateDeveloperTextField(
    rawObj.location !== undefined ? rawObj.location : DEFAULT_DEVELOPER_PROFILE.location,
    {
      label: 'Developer Location',
      required: false,
      maxLength: 100
    }
  );

  const profileImageUrlRes = validateProfileImageUrl(
    rawObj.profileImageUrl ?? DEFAULT_DEVELOPER_PROFILE.profileImageUrl
  );

  const profileImagePathRes = validateDeveloperTextField(
    rawObj.profileImagePath ?? DEFAULT_DEVELOPER_PROFILE.profileImagePath,
    {
      label: 'Profile Image Storage Path',
      required: false,
      maxLength: 300
    }
  );

  const profileImageAltRes = validateDeveloperTextField(
    rawObj.profileImageAlt ?? `${nameRes.value || DEFAULT_DEVELOPER_PROFILE.name} — Developer Portrait`,
    {
      label: 'Profile Image Alt Text',
      required: false,
      maxLength: 160
    }
  );

  const fbInput =
    rawObj.facebookUrl !== undefined
      ? rawObj.facebookUrl
      : rawSocial.facebookUrl !== undefined
      ? rawSocial.facebookUrl
      : DEFAULT_DEVELOPER_PROFILE.facebookUrl;

  const webInput =
    rawObj.personalWebsiteUrl !== undefined
      ? rawObj.personalWebsiteUrl
      : rawSocial.personalWebsiteUrl !== undefined
      ? rawSocial.personalWebsiteUrl
      : DEFAULT_DEVELOPER_PROFILE.personalWebsiteUrl;

  const kakaoIdInput =
    rawObj.kakaoTalkId !== undefined
      ? rawObj.kakaoTalkId
      : rawSocial.kakaoTalkId !== undefined
      ? rawSocial.kakaoTalkId
      : DEFAULT_DEVELOPER_PROFILE.kakaoTalkId;

  const kakaoUrlInput =
    rawObj.kakaoTalkUrl !== undefined
      ? rawObj.kakaoTalkUrl
      : rawSocial.kakaoTalkUrl !== undefined
      ? rawSocial.kakaoTalkUrl
      : DEFAULT_DEVELOPER_PROFILE.kakaoTalkUrl;

  const linkedinInput =
    rawObj.linkedinUrl !== undefined
      ? rawObj.linkedinUrl
      : rawSocial.linkedinUrl !== undefined
      ? rawSocial.linkedinUrl
      : DEFAULT_DEVELOPER_PROFILE.linkedinUrl;

  const instagramInput =
    rawObj.instagramUrl !== undefined
      ? rawObj.instagramUrl
      : rawSocial.instagramUrl !== undefined
      ? rawSocial.instagramUrl
      : DEFAULT_DEVELOPER_PROFILE.instagramUrl;

  const githubInput =
    rawObj.githubUrl !== undefined
      ? rawObj.githubUrl
      : rawSocial.githubUrl !== undefined
      ? rawSocial.githubUrl
      : DEFAULT_DEVELOPER_PROFILE.githubUrl;

  const emailInput =
    rawObj.contactEmail !== undefined
      ? rawObj.contactEmail
      : rawSocial.contactEmail !== undefined
      ? rawSocial.contactEmail
      : DEFAULT_DEVELOPER_PROFILE.contactEmail;

  const fbRes = validateFacebookUrl(fbInput);
  const webRes = validatePersonalWebsiteUrl(webInput);
  const kakaoIdRes = validateKakaoTalkId(kakaoIdInput);
  const kakaoUrlRes = validateKakaoTalkUrl(kakaoUrlInput);
  const linkedinRes = validateLinkedinUrl(linkedinInput);
  const instagramRes = validateInstagramUrl(instagramInput);
  const githubRes = validateGithubUrl(githubInput);
  const emailRes = validateDeveloperContactEmail(emailInput);

  const errors: Partial<Record<string, string>> = {};
  if (!nameRes.valid && nameRes.error) errors.name = nameRes.error;
  if (!roleRes.valid && roleRes.error) errors.role = roleRes.error;
  if (!shortBioRes.valid && shortBioRes.error) errors.shortBio = shortBioRes.error;
  if (!detailedBioRes.valid && detailedBioRes.error) errors.detailedBio = detailedBioRes.error;
  if (!projectTitleRes.valid && projectTitleRes.error) errors.projectTitle = projectTitleRes.error;
  if (!projectContributionRes.valid && projectContributionRes.error) {
    errors.projectContribution = projectContributionRes.error;
  }
  if (!locationRes.valid && locationRes.error) errors.location = locationRes.error;
  if (!profileImageUrlRes.valid && profileImageUrlRes.error) {
    errors.profileImageUrl = profileImageUrlRes.error;
  }
  if (!profileImageAltRes.valid && profileImageAltRes.error) {
    errors.profileImageAlt = profileImageAltRes.error;
  }
  if (!fbRes.valid && fbRes.error) errors.facebookUrl = fbRes.error;
  if (!webRes.valid && webRes.error) errors.personalWebsiteUrl = webRes.error;
  if (!kakaoIdRes.valid && kakaoIdRes.error) errors.kakaoTalkId = kakaoIdRes.error;
  if (!kakaoUrlRes.valid && kakaoUrlRes.error) errors.kakaoTalkUrl = kakaoUrlRes.error;
  if (!linkedinRes.valid && linkedinRes.error) errors.linkedinUrl = linkedinRes.error;
  if (!instagramRes.valid && instagramRes.error) errors.instagramUrl = instagramRes.error;
  if (!githubRes.valid && githubRes.error) errors.githubUrl = githubRes.error;
  if (!emailRes.valid && emailRes.error) errors.contactEmail = emailRes.error;

  const valid = Object.keys(errors).length === 0;

  const socialLinks: DeveloperProfileSocialLinks = {
    facebookUrl: fbRes.valid ? fbRes.value : '',
    personalWebsiteUrl: webRes.valid ? webRes.value : '',
    kakaoTalkId: kakaoIdRes.valid ? kakaoIdRes.value : '',
    kakaoTalkUrl: kakaoUrlRes.valid ? kakaoUrlRes.value : '',
    linkedinUrl: linkedinRes.valid ? linkedinRes.value : '',
    instagramUrl: instagramRes.valid ? instagramRes.value : '',
    githubUrl: githubRes.valid ? githubRes.value : '',
    contactEmail: emailRes.valid ? emailRes.value : ''
  };

  const imageCrop = sanitizeImageCrop(rawObj.imageCrop);
  const displaySettings = sanitizeDisplaySettings(rawObj.displaySettings);

  const resolvedName = nameRes.valid ? nameRes.value : DEFAULT_DEVELOPER_PROFILE.name;
  const fallbackImageRes =
    typeof rawObj.fallbackImageDataUrl === 'string' &&
    rawObj.fallbackImageDataUrl.startsWith('data:image/')
      ? validateProfileImageUrl(rawObj.fallbackImageDataUrl)
      : { valid: false, value: '' };

  const sanitizedUpdatedAt =
    typeof rawObj.updatedAt === 'string' && rawObj.updatedAt.trim().length <= 64
      ? stripSingleLineControlChars(rawObj.updatedAt)
      : undefined;
  const sanitizedImageUpdatedAt =
    typeof rawObj.imageUpdatedAt === 'string' && rawObj.imageUpdatedAt.trim().length <= 64
      ? stripSingleLineControlChars(rawObj.imageUpdatedAt)
      : undefined;
  const sanitizedVersion =
    typeof rawObj.version === 'number' && Number.isFinite(rawObj.version) && rawObj.version >= 1
      ? Math.floor(rawObj.version)
      : undefined;

  return {
    valid,
    errors,
    sanitized: {
      name: resolvedName,
      developerName: resolvedName,
      role: roleRes.valid ? roleRes.value : DEFAULT_DEVELOPER_PROFILE.role,
      shortBio: shortBioRes.valid ? shortBioRes.value : DEFAULT_DEVELOPER_PROFILE.shortBio,
      detailedBio: detailedBioRes.valid
        ? detailedBioRes.value
        : DEFAULT_DEVELOPER_PROFILE.detailedBio,
      projectTitle: projectTitleRes.valid
        ? projectTitleRes.value
        : DEFAULT_DEVELOPER_PROFILE.projectTitle,
      projectContribution: projectContributionRes.valid
        ? projectContributionRes.value
        : DEFAULT_DEVELOPER_PROFILE.projectContribution,
      location: locationRes.valid ? locationRes.value : DEFAULT_DEVELOPER_PROFILE.location,
      profileImageUrl:
        profileImageUrlRes.valid && profileImageUrlRes.value
          ? profileImageUrlRes.value
          : DEFAULT_DEVELOPER_PROFILE.profileImageUrl,
      profileImagePath: profileImagePathRes.valid
        ? profileImagePathRes.value
        : DEFAULT_DEVELOPER_PROFILE.profileImagePath,
      profileImageAlt:
        profileImageAltRes.valid && profileImageAltRes.value
          ? profileImageAltRes.value
          : `${resolvedName} — Website Developer & Project Creator`,
      ...(fallbackImageRes.valid && fallbackImageRes.value
        ? { fallbackImageDataUrl: fallbackImageRes.value }
        : {}),
      ...(sanitizedImageUpdatedAt ? { imageUpdatedAt: sanitizedImageUpdatedAt } : {}),
      imageCrop,
      facebookUrl: socialLinks.facebookUrl,
      personalWebsiteUrl: socialLinks.personalWebsiteUrl,
      kakaoTalkId: socialLinks.kakaoTalkId,
      kakaoTalkUrl: socialLinks.kakaoTalkUrl,
      linkedinUrl: socialLinks.linkedinUrl,
      instagramUrl: socialLinks.instagramUrl,
      githubUrl: socialLinks.githubUrl,
      contactEmail: socialLinks.contactEmail,
      socialLinks,
      displaySettings,
      ...(sanitizedUpdatedAt ? { updatedAt: sanitizedUpdatedAt } : {}),
      ...(sanitizedVersion ? { version: sanitizedVersion } : {})
    }
  };
}

/**
 * Safely coerces any stored or untrusted object into a clean public
 * DeveloperProfileSettings object, falling back field-by-field to
 * DEFAULT_DEVELOPER_PROFILE if any field is missing or corrupted.
 * Never leaks private administrative fields (like updatedByEmail or updatedByUid).
 */
export function sanitizePublicDeveloperProfile(
  raw: unknown
): DeveloperProfileSettings {
  const rawObj =
    raw && typeof raw === 'object' ? (inputAsRecord(raw)) : {};
  const rawSocial =
    rawObj.socialLinks && typeof rawObj.socialLinks === 'object'
      ? (rawObj.socialLinks as Record<string, any>)
      : {};

  const nameRes = validateDeveloperName(rawObj.name ?? rawObj.developerName);
  const roleRes = validateDeveloperRole(rawObj.role);
  const shortBioRes = validateDeveloperTextField(rawObj.shortBio, {
    label: 'Short Biography',
    required: true,
    minLength: 10,
    maxLength: 320,
    multiline: true
  });
  const detailedBioRes = validateDeveloperTextField(rawObj.detailedBio, {
    label: 'Detailed Biography',
    required: false,
    maxLength: 1200,
    multiline: true
  });
  const projectTitleRes = validateDeveloperTextField(rawObj.projectTitle, {
    label: 'Project Highlight Title',
    required: true,
    minLength: 3,
    maxLength: 120
  });
  const projectContributionRes = validateDeveloperTextField(rawObj.projectContribution, {
    label: 'Project Contribution',
    required: true,
    minLength: 10,
    maxLength: 600,
    multiline: true
  });
  const locationRes = validateDeveloperTextField(rawObj.location, {
    label: 'Location',
    required: false,
    maxLength: 100
  });
  const profileImageUrlRes = validateProfileImageUrl(rawObj.profileImageUrl);
  const fallbackImageRes =
    typeof rawObj.fallbackImageDataUrl === 'string' &&
    rawObj.fallbackImageDataUrl.startsWith('data:image/')
      ? validateProfileImageUrl(rawObj.fallbackImageDataUrl)
      : { valid: false, value: '' };
  const profileImagePathRes = validateDeveloperTextField(rawObj.profileImagePath, {
    label: 'Profile Image Path',
    required: false,
    maxLength: 300
  });
  const profileImageAltRes = validateDeveloperTextField(rawObj.profileImageAlt, {
    label: 'Profile Image Alt',
    required: false,
    maxLength: 160
  });

  const hasExplicitFacebook =
    rawObj.facebookUrl !== undefined || rawSocial.facebookUrl !== undefined;
  const hasExplicitKakaoId =
    rawObj.kakaoTalkId !== undefined || rawSocial.kakaoTalkId !== undefined;

  const fbRaw = rawObj.facebookUrl ?? rawSocial.facebookUrl;
  const webRaw = rawObj.personalWebsiteUrl ?? rawSocial.personalWebsiteUrl;
  const kakaoIdRaw = rawObj.kakaoTalkId ?? rawSocial.kakaoTalkId;
  const kakaoUrlRaw = rawObj.kakaoTalkUrl ?? rawSocial.kakaoTalkUrl;
  const linkedinRaw = rawObj.linkedinUrl ?? rawSocial.linkedinUrl;
  const instagramRaw = rawObj.instagramUrl ?? rawSocial.instagramUrl;
  const githubRaw = rawObj.githubUrl ?? rawSocial.githubUrl;
  const emailRaw = rawObj.contactEmail ?? rawSocial.contactEmail;

  const fbRes = validateFacebookUrl(fbRaw);
  const webRes = validatePersonalWebsiteUrl(webRaw);
  const kakaoIdRes = validateKakaoTalkId(kakaoIdRaw);
  const kakaoUrlRes = validateKakaoTalkUrl(kakaoUrlRaw);
  const linkedinRes = validateLinkedinUrl(linkedinRaw);
  const instagramRes = validateInstagramUrl(instagramRaw);
  const githubRes = validateGithubUrl(githubRaw);
  const emailRes = validateDeveloperContactEmail(emailRaw);

  const resolvedName = nameRes.valid ? nameRes.value : DEFAULT_DEVELOPER_PROFILE.name;

  const socialLinks: DeveloperProfileSocialLinks = {
    facebookUrl: hasExplicitFacebook
      ? fbRes.valid
        ? fbRes.value
        : ''
      : DEFAULT_DEVELOPER_PROFILE.facebookUrl,
    personalWebsiteUrl: webRes.valid ? webRes.value : '',
    kakaoTalkId: hasExplicitKakaoId
      ? kakaoIdRes.valid
        ? kakaoIdRes.value
        : ''
      : DEFAULT_DEVELOPER_PROFILE.kakaoTalkId,
    kakaoTalkUrl: kakaoUrlRes.valid ? kakaoUrlRes.value : '',
    linkedinUrl: linkedinRes.valid ? linkedinRes.value : '',
    instagramUrl: instagramRes.valid ? instagramRes.value : '',
    githubUrl: githubRes.valid ? githubRes.value : '',
    contactEmail: emailRes.valid ? emailRes.value : ''
  };

  const imageCrop = sanitizeImageCrop(rawObj.imageCrop);
  const displaySettings = sanitizeDisplaySettings(rawObj.displaySettings);

  const sanitizedUpdatedAt =
    typeof rawObj.updatedAt === 'string' && rawObj.updatedAt.trim().length <= 64
      ? stripSingleLineControlChars(rawObj.updatedAt)
      : undefined;
  const sanitizedImageUpdatedAt =
    typeof rawObj.imageUpdatedAt === 'string' && rawObj.imageUpdatedAt.trim().length <= 64
      ? stripSingleLineControlChars(rawObj.imageUpdatedAt)
      : undefined;
  const sanitizedVersion =
    typeof rawObj.version === 'number' && Number.isFinite(rawObj.version) && rawObj.version >= 1
      ? Math.floor(rawObj.version)
      : undefined;

  return {
    name: resolvedName,
    developerName: resolvedName,
    role: roleRes.valid ? roleRes.value : DEFAULT_DEVELOPER_PROFILE.role,
    shortBio: shortBioRes.valid ? shortBioRes.value : DEFAULT_DEVELOPER_PROFILE.shortBio,
    detailedBio:
      rawObj.detailedBio !== undefined && detailedBioRes.valid
        ? detailedBioRes.value
        : DEFAULT_DEVELOPER_PROFILE.detailedBio,
    projectTitle: projectTitleRes.valid
      ? projectTitleRes.value
      : DEFAULT_DEVELOPER_PROFILE.projectTitle,
    projectContribution: projectContributionRes.valid
      ? projectContributionRes.value
      : DEFAULT_DEVELOPER_PROFILE.projectContribution,
    location:
      rawObj.location !== undefined && locationRes.valid
        ? locationRes.value
        : DEFAULT_DEVELOPER_PROFILE.location,
    profileImageUrl:
      profileImageUrlRes.valid && profileImageUrlRes.value
        ? profileImageUrlRes.value
        : DEFAULT_DEVELOPER_PROFILE.profileImageUrl,
    profileImagePath:
      rawObj.profileImagePath !== undefined && profileImagePathRes.valid
        ? profileImagePathRes.value
        : DEFAULT_DEVELOPER_PROFILE.profileImagePath,
    profileImageAlt:
      profileImageAltRes.valid && profileImageAltRes.value
        ? profileImageAltRes.value
        : DEFAULT_DEVELOPER_PROFILE.profileImageAlt,
    ...(fallbackImageRes.valid && fallbackImageRes.value
      ? { fallbackImageDataUrl: fallbackImageRes.value }
      : {}),
    ...(sanitizedImageUpdatedAt ? { imageUpdatedAt: sanitizedImageUpdatedAt } : {}),
    imageCrop,
    facebookUrl: socialLinks.facebookUrl,
    personalWebsiteUrl: socialLinks.personalWebsiteUrl,
    kakaoTalkId: socialLinks.kakaoTalkId,
    kakaoTalkUrl: socialLinks.kakaoTalkUrl,
    linkedinUrl: socialLinks.linkedinUrl,
    instagramUrl: socialLinks.instagramUrl,
    githubUrl: socialLinks.githubUrl,
    contactEmail: socialLinks.contactEmail,
    socialLinks,
    displaySettings,
    ...(sanitizedUpdatedAt ? { updatedAt: sanitizedUpdatedAt } : {}),
    ...(sanitizedVersion ? { version: sanitizedVersion } : {})
  };
}

function inputAsRecord(raw: unknown): Record<string, any> {
  return raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
}
