import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  getAdminRegistrationsOverview,
  isEmailVerifiedInOtpStore,
  removeOtpRegistrationByEmail,
  hashPasswordScrypt,
  verifyPasswordScrypt,
  getVerifiedPasswordHashForEmail,
  updateOtpPasswordHashForEmail,
  requestPasswordResetEmail,
  verifyPasswordResetToken,
  consumePasswordResetTokenAndHashPassword,
  NEUTRAL_PASSWORD_RESET_MESSAGE,
  getOtpSigningSecret
} from './otpAuthService.ts';
import { PRIMARY_SUPER_ADMIN_EMAIL } from '../types/enterprise.ts';
import {
  FIRESTORE_COLLECTIONS,
  isProductionCloudRunRuntime,
  upsertNamedFirestoreDoc
} from './firestorePersistenceBridge.ts';
import type {
  EducationRecord,
  StudentAcademicProfile,
  GeneralUserProfile,
  AgentPartnerProfile,
  PassportDetailsMetadata,
  PrivacyConsentRecord,
  RegistrationLogEntry,
  DataPrivacyRequestEntry,
  StaffRoleType,
  StaffPermissionKey,
  StaffMemberRecord,
  InternalApprovalStatus,
  InternalAccessRequestRecord,
  GlobalTrashRecordType,
  GlobalTrashItem
} from '../types/index.ts';
import {
  DEFAULT_DEVELOPER_PROFILE,
  type DeveloperProfileSettings,
  validateDeveloperProfilePayload,
  sanitizePublicDeveloperProfile
} from '../utils/developerProfileValidation.ts';
import { sendInternalEmployeeDecisionEmailServer } from './automatedEmailService.ts';

export type ManagedUserRole =
  | 'student'
  | 'general'
  | 'agent'
  | 'employer'
  | 'landlord'
  | 'university'
  | 'admin';

export type ManagedAccountStatus =
  | 'active'
  | 'unverified'
  | 'pending_approval'
  | 'rejected'
  | 'suspended';

export type ManagedAuthProvider = 'google' | 'email_otp' | 'password';

export interface EncryptedPassportVaultEntry {
  uid: string;
  ciphertextHex: string;
  ivHex: string;
  authTagHex: string;
  maskedNumber: string;
  issueDate?: string;
  expiryDate?: string;
  consentedAt: string;
  updatedAt: string;
}

export interface CentralizedUserRecord {
  id: string;
  uid: string;
  registrationId: string;
  fullName: string;
  name: string;
  email: string;
  role: ManagedUserRole;
  accountType: ManagedUserRole;
  phoneNumber?: string;
  countryCode?: string;
  countryOfResidence?: string;
  nationality: string;
  currentCity: string;
  city?: string;
  dateOfBirth?: string;
  gender?: string;
  passportDetails?: PassportDetailsMetadata;
  passportMetadata?: PassportDetailsMetadata;
  educationRecords?: EducationRecord[];
  studentAcademicProfile?: StudentAcademicProfile;
  generalUserProfile?: GeneralUserProfile;
  agentPartnerProfile?: AgentPartnerProfile;
  preferredStudyLevel?: string;
  preferredIntake?: string;
  preferredUniversity?: string;
  interestedProgram?: string;
  university?: string;
  major?: string;
  studyLevel?: string;
  degreeLevel?: string;
  preferredLanguage: 'en' | 'ko' | 'bn' | 'ne' | 'hi' | 'ur' | 'ar' | 'zh' | 'ja';
  visaType?: string;
  phone?: string;
  kakaoId?: string;
  expectedGraduation?: string;
  profileCompletionPercentage: number;
  photoURL: string;
  avatarUrl?: string;
  authProvider: ManagedAuthProvider;
  emailVerified: boolean;
  privacyConsent?: PrivacyConsentRecord;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  accountStatus: ManagedAccountStatus;
}

export interface ServerLoginLogRecord {
  id: string;
  uid: string;
  email: string;
  userName?: string;
  timestamp: string;
  provider: ManagedAuthProvider;
  success: boolean;
  status: 'success' | 'failure';
  reason: string;
}

export interface ServerAdminLogRecord {
  id: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetUid?: string;
  targetEmail?: string;
  details: string;
  timestamp: string;
}

export interface GoogleSheetsSyncConfig {
  enabled: boolean;
  webhookUrl: string;
  spreadsheetUrl?: string;
  sheetName: string;
  autoSyncOnRegistration: boolean;
  lastSyncedAt?: string;
  lastSyncStatus: 'idle' | 'synced' | 'ready_local' | 'error';
  lastSyncMessage?: string;
  syncedRowCount: number;
}

export interface PersistedDeveloperProfileConfig {
  profile: DeveloperProfileSettings;
  updatedAt: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedByEmail?: string;
  isCustomConfigured: boolean;
}

interface PersistedUserManagementStore {
  usersByUid: Record<string, CentralizedUserRecord>;
  passwordHashesByUid: Record<string, string>;
  encryptedPassportsByUid: Record<string, EncryptedPassportVaultEntry>;
  loginLogs: ServerLoginLogRecord[];
  adminLogs: ServerAdminLogRecord[];
  registrationLogs: RegistrationLogEntry[];
  dataPrivacyRequests: DataPrivacyRequestEntry[];
  googleSheetsConfig?: GoogleSheetsSyncConfig;
  developerProfileConfig?: PersistedDeveloperProfileConfig;
}

const STORE_FILE_PATH = path.resolve(process.cwd(), '.everykr-user-management.json');

function hasVerifiedAdminCustomClaim(claims?: Record<string, any> | null): boolean {
  if (!claims || typeof claims !== 'object') return false;
  return Boolean(
    claims.super_admin === true ||
      claims.admin === true ||
      claims.role === 'super_admin' ||
      claims.role === 'admin' ||
      claims.enterpriseRole === 'super_admin' ||
      claims.enterpriseRole === 'admin'
  );
}

export function generateServerRegistrationId(
  uid: string,
  role?: string,
  createdAt?: string,
  existingRegId?: string
): string {
  if (existingRegId && /^EKR-[A-Z]{3}-\d{4}-[A-Z0-9]{6}$/.test(existingRegId.trim())) {
    return existingRegId.trim();
  }
  const roleMap: Record<string, string> = {
    student: 'STU',
    general: 'GEN',
    agent: 'AGT',
    employer: 'EMP',
    landlord: 'HSG',
    university: 'UNI',
    admin: 'ADM'
  };
  const prefix = roleMap[String(role || 'student').toLowerCase()] || 'USR';
  const year = createdAt && !isNaN(new Date(createdAt).getTime())
    ? new Date(createdAt).getUTCFullYear()
    : new Date().getUTCFullYear();
  const hashHex = crypto
    .createHash('sha256')
    .update(String(uid || 'everykr'))
    .digest('hex')
    .slice(0, 6)
    .toUpperCase();
  return `EKR-${prefix}-${year}-${hashHex}`;
}

function getPassportEncryptionKey(): Buffer | null {
  const configured = (process.env.PASSPORT_ENCRYPTION_SECRET || '').trim();
  if (configured && configured.length >= 16) {
    return crypto.createHash('sha256').update(configured).digest();
  }
  const configuredOtp = (process.env.OTP_SIGNING_SECRET || '').trim();
  if (
    configuredOtp &&
    configuredOtp !== 'everykr_hmac_otp_secret_change_in_production' &&
    configuredOtp.length >= 16
  ) {
    return crypto.createHash('sha256').update(configuredOtp).digest();
  }
  // Fail safely when PASSPORT_ENCRYPTION_SECRET is missing — never use a hardcoded static key
  return null;
}

export function maskPassportNumber(rawPassport: string): string {
  const cleaned = String(rawPassport || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!cleaned) return '';
  if (cleaned.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, cleaned.length - 3))}${cleaned.slice(-3)}`;
}

export function encryptPassportString(rawPassport: string): {
  ciphertextHex: string;
  ivHex: string;
  authTagHex: string;
  maskedNumber: string;
} | null {
  const cleaned = String(rawPassport || '').trim().toUpperCase();
  const key = getPassportEncryptionKey();
  if (!key) {
    return null;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(cleaned, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertextHex: encrypted.toString('hex'),
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
    maskedNumber: maskPassportNumber(cleaned)
  };
}

export function decryptPassportEntry(entry: EncryptedPassportVaultEntry): {
  ok: boolean;
  decrypted?: string;
  error?: string;
} {
  const key = getPassportEncryptionKey();
  if (!key) {
    return {
      ok: false,
      error:
        'PASSPORT_ENCRYPTION_SECRET is not configured on the server. Existing encrypted passport records are preserved untouched until a verified migration/key is configured.'
    };
  }
  try {
    const iv = Buffer.from(entry.ivHex, 'hex');
    const authTag = Buffer.from(entry.authTagHex, 'hex');
    const encrypted = Buffer.from(entry.ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return { ok: true, decrypted: decrypted.toString('utf8') };
  } catch {
    return {
      ok: false,
      error: 'Unable to decrypt passport record with the active encryption key.'
    };
  }
}

export function computeServerProfileCompletion(record: Partial<CentralizedUserRecord>): number {
  const accountType = record.accountType || record.role || 'student';
  const checks: boolean[] = [
    Boolean(record.fullName && record.fullName.trim().length >= 2),
    Boolean(record.email && record.emailVerified !== false),
    Boolean((record.phoneNumber || record.phone) && String(record.phoneNumber || record.phone).trim().length >= 6),
    Boolean(record.countryOfResidence && record.countryOfResidence.trim()),
    Boolean(record.nationality && record.nationality.trim()),
    Boolean(record.dateOfBirth && record.dateOfBirth.trim())
  ];

  if (accountType === 'student') {
    const academic = record.studentAcademicProfile;
    const hasEduRecords = Array.isArray(record.educationRecords) && record.educationRecords.length > 0;
    checks.push(
      Boolean(
        academic?.currentEducationLevel ||
          academic?.lastCompletedEducation ||
          hasEduRecords ||
          record.studyLevel
      ),
      Boolean(
        (academic?.sscPassingYear && academic?.sscGpa) ||
          (academic?.hscPassingYear && academic?.hscGpa) ||
          hasEduRecords
      ),
      Boolean(record.preferredStudyLevel || academic?.desiredStudyLevel || record.studyLevel),
      Boolean(
        (record.preferredIntake || academic?.preferredIntake) &&
          (record.preferredUniversity || academic?.preferredUniversity || record.university)
      )
    );
  } else if (accountType === 'agent') {
    const agent = record.agentPartnerProfile;
    checks.push(
      Boolean(agent?.agencyName && agent.agencyName.trim()),
      Boolean(agent?.contactPerson && agent.contactPerson.trim()),
      Boolean(agent?.businessEmail && agent.businessEmail.trim()),
      Boolean(agent?.country && agent?.city)
    );
  } else {
    const gen = record.generalUserProfile;
    checks.push(
      Boolean(record.city || record.currentCity || gen?.currentCity),
      Boolean((gen?.interests && gen.interests.length > 0) || gen?.preferredLanguage || record.preferredLanguage)
    );
  }

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

const INITIAL_SEED_USERS: CentralizedUserRecord[] = [
  {
    id: 'uid_minjun_kim_yonsei01',
    uid: 'uid_minjun_kim_yonsei01',
    registrationId: 'EKR-STU-2026-9A4F12',
    fullName: 'Minjun Kim',
    name: 'Minjun Kim',
    email: 'minjun.kim@yonsei.ac.kr',
    role: 'student',
    accountType: 'student',
    countryCode: '+82',
    phoneNumber: '010-2394-8120',
    phone: '010-2394-8120',
    countryOfResidence: 'South Korea',
    nationality: 'South Korea',
    currentCity: 'Seoul',
    city: 'Seoul',
    dateOfBirth: '2001-05-14',
    gender: 'Male',
    university: 'Yonsei University',
    preferredUniversity: 'Yonsei University',
    interestedProgram: 'Computer Science & Artificial Intelligence',
    major: 'Computer Science & Artificial Intelligence',
    preferredStudyLevel: "Master's Degree",
    preferredIntake: 'Spring 2026 (March)',
    studyLevel: "Master's Degree",
    visaType: 'D-2-3 (Master)',
    preferredLanguage: 'en',
    studentAcademicProfile: {
      currentEducationLevel: "Master's Degree (Graduate)",
      lastCompletedEducation: "Bachelor's Degree (Undergraduate)",
      sscPassingYear: '2017',
      sscGpa: '5.00',
      hscPassingYear: '2019',
      hscGpa: '4.92',
      bachelorPassingYear: '2023',
      currentUniversity: 'Yonsei University',
      currentMajor: 'Computer Science & Artificial Intelligence',
      interestedProgram: 'Computer Science & Artificial Intelligence',
      desiredStudyLevel: "Master's Degree",
      preferredIntake: 'Spring 2026 (March)',
      preferredUniversity: 'Yonsei University',
      koreanLanguageLevel: 'TOPIK Level 4',
      englishScore: 'IELTS 7.5'
    },
    educationRecords: [
      {
        id: 'edu_seed_1',
        level: 'Secondary School / SSC / O-Level',
        institution: 'International Scholars High School',
        boardOrUniversity: 'National Board',
        passingYear: '2017',
        gpaOrGrade: '5.00 / 5.00',
        majorOrGroup: 'Science'
      },
      {
        id: 'edu_seed_2',
        level: 'High School / HSC / A-Level',
        institution: 'Metropolitan Science College',
        boardOrUniversity: 'National Board',
        passingYear: '2019',
        gpaOrGrade: '4.92 / 5.00',
        majorOrGroup: 'Science'
      }
    ],
    profileCompletionPercentage: 100,
    photoURL: '',
    authProvider: 'email_otp',
    emailVerified: true,
    privacyConsent: {
      privacyPolicyAccepted: true,
      termsAccepted: true,
      personalInfoConsent: true,
      consentedAt: '2026-10-15T09:00:00.000Z'
    },
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-11-09T14:22:10.000Z',
    lastLoginAt: '2026-11-09T14:22:10.000Z',
    accountStatus: 'active'
  },
  {
    id: 'uid_elena_rostova_snu02',
    uid: 'uid_elena_rostova_snu02',
    registrationId: 'EKR-STU-2026-7C2E88',
    fullName: 'Elena Rostova',
    name: 'Elena Rostova',
    email: 'elena.rostova@snu.ac.kr',
    role: 'student',
    accountType: 'student',
    countryCode: '+7',
    phoneNumber: '701-552-8819',
    phone: '+7-701-552-8819',
    countryOfResidence: 'South Korea',
    nationality: 'Kazakhstan',
    currentCity: 'Seoul',
    city: 'Seoul',
    dateOfBirth: '2003-08-22',
    gender: 'Female',
    university: 'Seoul National University',
    preferredUniversity: 'Seoul National University',
    interestedProgram: 'International Relations',
    major: 'International Relations',
    preferredStudyLevel: "Bachelor's Degree",
    preferredIntake: 'Fall 2026 (September)',
    studyLevel: "Bachelor's Degree",
    visaType: 'D-2-2 (Bachelor)',
    preferredLanguage: 'en',
    studentAcademicProfile: {
      currentEducationLevel: "Bachelor's Degree (Undergraduate)",
      lastCompletedEducation: 'High School / HSC / A-Level',
      sscPassingYear: '2019',
      sscGpa: '4.90',
      hscPassingYear: '2021',
      hscGpa: '5.00',
      currentUniversity: 'Seoul National University',
      currentMajor: 'International Relations',
      interestedProgram: 'International Relations',
      desiredStudyLevel: "Bachelor's Degree",
      preferredIntake: 'Fall 2026 (September)',
      preferredUniversity: 'Seoul National University',
      koreanLanguageLevel: 'TOPIK Level 5',
      englishScore: 'IELTS 8.0'
    },
    educationRecords: [
      {
        id: 'edu_seed_elena_1',
        level: 'High School / HSC / A-Level',
        institution: 'Almaty Nazarbayev Intellectual School',
        boardOrUniversity: 'Kazakhstan Ministry of Education',
        passingYear: '2021',
        gpaOrGrade: '5.00 / 5.00',
        majorOrGroup: 'Humanities & Global Studies'
      }
    ],
    profileCompletionPercentage: 100,
    photoURL: '',
    authProvider: 'google',
    emailVerified: true,
    privacyConsent: {
      privacyPolicyAccepted: true,
      termsAccepted: true,
      personalInfoConsent: true,
      consentedAt: '2026-10-18T11:30:00.000Z'
    },
    createdAt: '2026-10-18T11:30:00.000Z',
    updatedAt: '2026-11-09T18:05:44.000Z',
    lastLoginAt: '2026-11-09T18:05:44.000Z',
    accountStatus: 'active'
  },
  {
    id: 'uid_tariq_hasan_general08',
    uid: 'uid_tariq_hasan_general08',
    registrationId: 'EKR-GEN-2026-4D81B3',
    fullName: 'Tariqul Hasan',
    name: 'Tariqul Hasan',
    email: 'tariq.hasan@gmail.com',
    role: 'general',
    accountType: 'general',
    countryCode: '+880',
    phoneNumber: '1819-442210',
    phone: '+880-1819-442210',
    countryOfResidence: 'Bangladesh',
    nationality: 'Bangladesh',
    currentCity: 'Dhaka',
    city: 'Dhaka',
    dateOfBirth: '1999-11-03',
    gender: 'Male',
    preferredLanguage: 'bn',
    generalUserProfile: {
      currentCountry: 'Bangladesh',
      currentCity: 'Dhaka',
      nationality: 'Bangladesh',
      interests: ['Korean Language & TOPIK', 'Jobs & Careers in Korea', 'GKS / Korean Scholarships'],
      preferredLanguage: 'bn'
    },
    profileCompletionPercentage: 95,
    photoURL: '',
    authProvider: 'email_otp',
    emailVerified: true,
    createdAt: '2026-11-05T13:20:00.000Z',
    updatedAt: '2026-11-09T09:15:00.000Z',
    lastLoginAt: '2026-11-09T09:15:00.000Z',
    accountStatus: 'active'
  },
  {
    id: 'uid_global_bridge_agent07',
    uid: 'uid_global_bridge_agent07',
    registrationId: 'EKR-AGT-2026-5E19C4',
    fullName: 'Global Bridge Korea Admissions',
    name: 'Global Bridge Korea Admissions',
    email: 'admissions@globalbridgeedu.com',
    role: 'agent',
    accountType: 'agent',
    countryCode: '+880',
    phoneNumber: '1711-889900',
    phone: '+880-1711-889900',
    countryOfResidence: 'Bangladesh',
    nationality: 'Bangladesh',
    currentCity: 'Dhaka',
    city: 'Dhaka',
    preferredLanguage: 'en',
    agentPartnerProfile: {
      agencyName: 'Global Bridge Korea Admissions',
      contactPerson: 'Farhan Ahmed',
      country: 'Bangladesh',
      city: 'Dhaka',
      businessEmail: 'admissions@globalbridgeedu.com',
      phoneNumber: '+880-1711-889900',
      website: 'https://globalbridgeedu.com',
      yearsOfExperience: '6 years',
      approvalStatus: 'pending_approval'
    },
    profileCompletionPercentage: 90,
    photoURL: '',
    authProvider: 'email_otp',
    emailVerified: true,
    createdAt: '2026-11-08T10:15:00.000Z',
    updatedAt: '2026-11-08T10:15:00.000Z',
    lastLoginAt: '2026-11-08T10:15:00.000Z',
    accountStatus: 'pending_approval'
  },
  {
    id: 'uid_kim_minjun_employer03',
    uid: 'uid_kim_minjun_employer03',
    registrationId: 'EKR-EMP-2026-2B70A9',
    fullName: 'Kim Min-jun (K-Connect Media)',
    name: 'Kim Min-jun (K-Connect Media)',
    email: 'hr@kconnectmedia.kr',
    role: 'employer',
    accountType: 'employer',
    countryCode: '+82',
    phoneNumber: '02-555-0192',
    countryOfResidence: 'South Korea',
    nationality: 'South Korea',
    currentCity: 'Seoul',
    city: 'Seoul',
    preferredLanguage: 'ko',
    profileCompletionPercentage: 90,
    photoURL: '',
    authProvider: 'email_otp',
    emailVerified: true,
    createdAt: '2026-10-20T14:15:00.000Z',
    updatedAt: '2026-11-08T09:40:12.000Z',
    lastLoginAt: '2026-11-08T09:40:12.000Z',
    accountStatus: 'active'
  },
  {
    id: 'uid_park_jihoon_housing04',
    uid: 'uid_park_jihoon_housing04',
    registrationId: 'EKR-HSG-2026-6F33D1',
    fullName: 'Park Ji-hoon (Sinchon Housing)',
    name: 'Park Ji-hoon (Sinchon Housing)',
    email: 'sinchon.housing@naver.com',
    role: 'landlord',
    accountType: 'landlord',
    countryCode: '+82',
    phoneNumber: '010-8812-3301',
    countryOfResidence: 'South Korea',
    nationality: 'South Korea',
    currentCity: 'Seoul',
    city: 'Seoul',
    preferredLanguage: 'ko',
    profileCompletionPercentage: 90,
    photoURL: '',
    authProvider: 'email_otp',
    emailVerified: true,
    createdAt: '2026-10-22T08:45:00.000Z',
    updatedAt: '2026-11-08T16:12:00.000Z',
    lastLoginAt: '2026-11-08T16:12:00.000Z',
    accountStatus: 'active'
  },
  {
    id: 'uid_korea_uni_oia_partner05',
    uid: 'uid_korea_uni_oia_partner05',
    registrationId: 'EKR-UNI-2026-1A88E5',
    fullName: 'Korea University Global Affairs',
    name: 'Korea University Global Affairs',
    email: 'oia-admin@korea.ac.kr',
    role: 'university',
    accountType: 'university',
    countryCode: '+82',
    phoneNumber: '02-3290-1158',
    countryOfResidence: 'South Korea',
    nationality: 'South Korea',
    currentCity: 'Seoul',
    city: 'Seoul',
    university: 'Korea University',
    preferredLanguage: 'ko',
    profileCompletionPercentage: 95,
    photoURL: '',
    authProvider: 'google',
    emailVerified: true,
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-11-09T07:30:00.000Z',
    lastLoginAt: '2026-11-09T07:30:00.000Z',
    accountStatus: 'active'
  },
  {
    id: 'uid_everykr_system_admin06',
    uid: 'uid_everykr_system_admin06',
    registrationId: 'EKR-ADM-2026-000001',
    fullName: 'EVERYKR System Admin',
    name: 'EVERYKR System Admin',
    email: 'admin@everykr.com',
    role: 'admin',
    accountType: 'admin',
    countryCode: '+82',
    phoneNumber: '02-1345-0000',
    countryOfResidence: 'South Korea',
    nationality: 'Global',
    currentCity: 'Seoul',
    city: 'Seoul',
    preferredLanguage: 'en',
    profileCompletionPercentage: 100,
    photoURL: '',
    authProvider: 'google',
    emailVerified: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-11-10T07:00:00.000Z',
    lastLoginAt: '2026-11-10T07:00:00.000Z',
    accountStatus: 'active'
  }
];

const DEFAULT_GOOGLE_SHEETS_CONFIG: GoogleSheetsSyncConfig = {
  enabled: true,
  webhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
  spreadsheetUrl: process.env.GOOGLE_SHEETS_SPREADSHEET_URL || '',
  sheetName: 'EveryKR_Registrations',
  autoSyncOnRegistration: true,
  lastSyncStatus: 'ready_local',
  lastSyncMessage: 'Automatic Google Sheets synchronization active (deduplicated by Registration ID & Email).',
  syncedRowCount: INITIAL_SEED_USERS.length
};

let storeCache: PersistedUserManagementStore | null = null;
let storeMtimeMs = 0;

function loadStore(): PersistedUserManagementStore {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const stat = fs.statSync(STORE_FILE_PATH);
      if (storeCache && stat.mtimeMs === storeMtimeMs) {
        return storeCache;
      }
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedUserManagementStore>;
      if (parsed && typeof parsed.usersByUid === 'object') {
        const usersByUid = parsed.usersByUid || {};
        // Ensure seed records exist and every user has a unique registrationId
        for (const seed of INITIAL_SEED_USERS) {
          if (!usersByUid[seed.uid]) {
            usersByUid[seed.uid] = seed;
          }
        }
        for (const [k, u] of Object.entries(usersByUid)) {
          usersByUid[k] = {
            ...u,
            registrationId: generateServerRegistrationId(
              u.uid || k,
              u.accountType || u.role,
              u.createdAt,
              u.registrationId
            )
          };
        }
        storeCache = {
          usersByUid,
          passwordHashesByUid: parsed.passwordHashesByUid || {},
          encryptedPassportsByUid: parsed.encryptedPassportsByUid || {},
          loginLogs: Array.isArray(parsed.loginLogs) ? parsed.loginLogs : [],
          adminLogs: Array.isArray(parsed.adminLogs) ? parsed.adminLogs : [],
          registrationLogs: Array.isArray(parsed.registrationLogs) ? parsed.registrationLogs : [],
          dataPrivacyRequests: Array.isArray(parsed.dataPrivacyRequests)
            ? parsed.dataPrivacyRequests
            : [],
          googleSheetsConfig: {
            ...DEFAULT_GOOGLE_SHEETS_CONFIG,
            ...(parsed.googleSheetsConfig || {})
          },
          ...(parsed.developerProfileConfig && parsed.developerProfileConfig.profile
            ? {
                developerProfileConfig: {
                  profile: sanitizePublicDeveloperProfile(parsed.developerProfileConfig.profile),
                  updatedAt:
                    typeof parsed.developerProfileConfig.updatedAt === 'string'
                      ? parsed.developerProfileConfig.updatedAt
                      : new Date().toISOString(),
                  updatedByUid: parsed.developerProfileConfig.updatedByUid,
                  updatedByName: parsed.developerProfileConfig.updatedByName,
                  updatedByEmail: parsed.developerProfileConfig.updatedByEmail,
                  isCustomConfigured: Boolean(parsed.developerProfileConfig.isCustomConfigured)
                }
              }
            : {})
        };
        storeMtimeMs = stat.mtimeMs;
        return storeCache;
      }
    }
  } catch (err) {
    console.warn('Could not read user management store, initializing default store:', err);
  }

  const usersByUid: Record<string, CentralizedUserRecord> = {};
  for (const u of INITIAL_SEED_USERS) {
    usersByUid[u.uid] = {
      ...u,
      registrationId: generateServerRegistrationId(u.uid, u.accountType || u.role, u.createdAt, u.registrationId)
    };
  }

  storeCache = {
    usersByUid,
    passwordHashesByUid: {},
    encryptedPassportsByUid: {},
    loginLogs: [
      {
        id: 'llog_init_1',
        uid: 'uid_elena_rostova_snu02',
        email: 'elena.rostova@snu.ac.kr',
        userName: 'Elena Rostova',
        timestamp: '2026-11-09T18:05:44.000Z',
        provider: 'google',
        success: true,
        status: 'success',
        reason: 'Google OAuth sign-in verified'
      },
      {
        id: 'llog_init_2',
        uid: 'uid_minjun_kim_yonsei01',
        email: 'minjun.kim@yonsei.ac.kr',
        userName: 'Minjun Kim',
        timestamp: '2026-11-09T14:22:10.000Z',
        provider: 'email_otp',
        success: true,
        status: 'success',
        reason: 'Email & password sign-in verified'
      }
    ],
    adminLogs: [
      {
        id: 'alog_init_1',
        adminUid: 'uid_everykr_system_admin06',
        adminName: 'EVERYKR System Admin',
        adminEmail: 'admin@everykr.com',
        action: 'ROLE_VERIFICATION',
        targetUid: 'uid_korea_uni_oia_partner05',
        targetEmail: 'oia-admin@korea.ac.kr',
        details: 'Verified Korea University Global Affairs partner account and assigned university role.',
        timestamp: '2026-11-07T03:10:00.000Z'
      }
    ],
    registrationLogs: [
      {
        id: 'rlog_init_1',
        uid: 'uid_minjun_kim_yonsei01',
        email: 'minjun.kim@yonsei.ac.kr',
        fullName: 'Minjun Kim',
        accountType: 'student',
        role: 'student',
        countryOfResidence: 'South Korea',
        nationality: 'Global',
        authProvider: 'email_otp',
        status: 'active',
        timestamp: '2026-10-15T09:00:00.000Z'
      },
      {
        id: 'rlog_init_2',
        uid: 'uid_global_bridge_agent07',
        email: 'admissions@globalbridgeedu.com',
        fullName: 'Global Bridge Korea Admissions',
        accountType: 'agent',
        role: 'agent',
        countryOfResidence: 'Bangladesh',
        nationality: 'Bangladesh',
        authProvider: 'email_otp',
        status: 'pending_approval',
        timestamp: '2026-11-08T10:15:00.000Z'
      }
    ],
    dataPrivacyRequests: []
  };

  saveStore(storeCache);
  return storeCache;
}

function syncUserManagementStoreToFirestoreAsync(store: PersistedUserManagementStore): void {
  // Mirror latest user management records additively to EVERYKR's named Firestore DB
  for (const [uid, record] of Object.entries(store.usersByUid).slice(-40)) {
    if (!record || !uid) continue;
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.userManagementUsers,
      uid,
      record as unknown as Record<string, unknown>
    );
  }
  for (const log of store.loginLogs.slice(0, 15)) {
    if (!log?.id) continue;
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.userManagementLoginLogs,
      log.id,
      log as unknown as Record<string, unknown>
    );
  }
  for (const log of store.adminLogs.slice(0, 15)) {
    if (!log?.id) continue;
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.userManagementAdminLogs,
      log.id,
      log as unknown as Record<string, unknown>
    );
  }
  for (const log of store.registrationLogs.slice(0, 15)) {
    if (!log?.id) continue;
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.userManagementRegistrationLogs,
      log.id,
      log as unknown as Record<string, unknown>
    );
  }
  for (const req of store.dataPrivacyRequests.slice(0, 15)) {
    if (!req?.id) continue;
    void upsertNamedFirestoreDoc(
      FIRESTORE_COLLECTIONS.userManagementPrivacyRequests,
      req.id,
      req as unknown as Record<string, unknown>
    );
  }
}

function saveStore(store: PersistedUserManagementStore): void {
  storeCache = store;
  syncUserManagementStoreToFirestoreAsync(store);
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
    storeMtimeMs = fs.statSync(STORE_FILE_PATH).mtimeMs;
  } catch (err) {
    if (!isProductionCloudRunRuntime()) {
      console.warn('Could not persist user management store:', err);
    }
  }
}

export function sanitizeUserRole(
  requestedRole?: string,
  _email?: string,
  existingRole?: ManagedUserRole,
  _isTrustedCaller: boolean = false
): ManagedUserRole {
  // Security Rule: NEVER auto-promote any account to 'admin' based on email address.
  // Only preserve an explicitly persisted existing 'admin' role.
  if (existingRole === 'admin') {
    return 'admin';
  }
  // Security Rule: Never allow non-admin users to self-assign 'admin' role
  if (
    requestedRole === 'general' ||
    requestedRole === 'agent' ||
    requestedRole === 'employer' ||
    requestedRole === 'landlord' ||
    requestedRole === 'university' ||
    requestedRole === 'student'
  ) {
    return requestedRole;
  }
  if (existingRole) {
    return existingRole;
  }
  return 'student';
}

/**
 * Checks whether an email address is already registered as a verified user.
 */
export function checkDuplicateEmailServer(email: string): {
  exists: boolean;
  uid?: string;
  accountType?: ManagedUserRole;
} {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return { exists: false };

  const store = loadStore();
  for (const user of Object.values(store.usersByUid)) {
    if (user.email.toLowerCase() === normalized && user.emailVerified !== false) {
      return {
        exists: true,
        uid: user.uid,
        accountType: user.accountType || user.role
      };
    }
  }

  if (isEmailVerifiedInOtpStore(normalized)) {
    return { exists: true };
  }

  return { exists: false };
}

/**
 * Synchronizes a user's profile in the centralized database by unique Firebase Auth UID.
 * Uses server-side trusted timestamps (`createdAt`, `updatedAt`, `lastLoginAt`).
 * Encrypts passport numbers using AES-256-GCM (when PASSPORT_ENCRYPTION_SECRET is configured)
 * and stores only masked passport metadata in user records.
 */
export function syncCentralizedUserServer(params: {
  uid: string;
  fullName?: string;
  name?: string;
  email: string;
  role?: string;
  accountType?: string;
  phoneNumber?: string;
  countryCode?: string;
  countryOfResidence?: string;
  nationality?: string;
  currentCity?: string;
  city?: string;
  dateOfBirth?: string;
  gender?: string;
  passportDetails?: {
    requiredForService?: boolean;
    passportNumber?: string;
    passportNumberMasked?: string;
    passportIssueDate?: string;
    passportExpiryDate?: string;
    consentGiven?: boolean;
    consentedAt?: string;
  };
  educationRecords?: EducationRecord[];
  studentAcademicProfile?: StudentAcademicProfile;
  generalUserProfile?: GeneralUserProfile;
  agentPartnerProfile?: AgentPartnerProfile;
  preferredStudyLevel?: string;
  preferredIntake?: string;
  preferredUniversity?: string;
  interestedProgram?: string;
  registrationId?: string;
  university?: string;
  major?: string;
  studyLevel?: string;
  degreeLevel?: string;
  preferredLanguage?: 'en' | 'ko' | 'bn' | 'ne' | 'ur' | 'zh';
  visaType?: string;
  phone?: string;
  kakaoId?: string;
  expectedGraduation?: string;
  privacyConsent?: PrivacyConsentRecord;
  photoURL?: string;
  avatarUrl?: string;
  authProvider?: ManagedAuthProvider;
  emailVerified?: boolean;
  accountStatus?: ManagedAccountStatus;
  isLoginEvent?: boolean;
  isNewRegistration?: boolean;
  password?: string;
  allowCreate?: boolean;
  isTrustedCaller?: boolean;
}): { ok: boolean; user?: CentralizedUserRecord; error?: string; code?: string } {
  const rawUid = String(params.uid || '').trim();
  const normalizedEmail = String(params.email || '').trim().toLowerCase();

  if (!rawUid || !normalizedEmail) {
    return { ok: false, error: 'Both unique UID and email are required.', code: 'auth/invalid-uid' };
  }

  const store = loadStore();
  if (!store.passwordHashesByUid) {
    store.passwordHashesByUid = {};
  }
  const nowTrustedIso = new Date().toISOString();

  // Deduplicate by both UID and normalized email to prevent duplicate user records
  let existing = store.usersByUid[rawUid];
  let uid = rawUid;
  if (!existing) {
    const duplicateByEmail = Object.values(store.usersByUid).find(
      u => u.email.toLowerCase() === normalizedEmail
    );
    if (duplicateByEmail) {
      existing = duplicateByEmail;
      // If a real Firebase UID replaces a derived pending UID, migrate record cleanly without duplicating
      if (duplicateByEmail.uid !== rawUid && duplicateByEmail.uid.startsWith('uid_pending_')) {
        delete store.usersByUid[duplicateByEmail.uid];
        if (store.passwordHashesByUid[duplicateByEmail.uid]) {
          store.passwordHashesByUid[rawUid] = store.passwordHashesByUid[duplicateByEmail.uid];
          delete store.passwordHashesByUid[duplicateByEmail.uid];
        }
        uid = rawUid;
      } else {
        uid = duplicateByEmail.uid;
      }
    }
  }

  // SECURITY: Never automatically create a user if allowCreate === false
  if (!existing && params.allowCreate === false) {
    return {
      ok: false,
      error: 'No registered EveryKR account found for this user. Please complete registration first.',
      code: 'auth/user-not-found'
    };
  }

  // Persist salted scrypt password hash if provided or available from verified OTP store
  if (params.password && String(params.password).length >= 8) {
    const newHash = hashPasswordScrypt(String(params.password));
    store.passwordHashesByUid[uid] = newHash;
    store.passwordHashesByUid[normalizedEmail] = newHash;
    updateOtpPasswordHashForEmail(normalizedEmail, newHash);
  } else {
    const existingHash =
      store.passwordHashesByUid[uid] ||
      store.passwordHashesByUid[normalizedEmail] ||
      getVerifiedPasswordHashForEmail(normalizedEmail);
    if (existingHash) {
      store.passwordHashesByUid[uid] = existingHash;
      store.passwordHashesByUid[normalizedEmail] = existingHash;
    }
  }

  // If the account has been suspended by an administrator, reject sign-in
  if (existing && existing.accountStatus === 'suspended') {
    recordLoginAttemptServer({
      uid,
      email: normalizedEmail,
      userName: existing.fullName,
      provider: params.authProvider || existing.authProvider || 'email_otp',
      success: false,
      reason: 'Login blocked: account is suspended by administrator'
    });
    return {
      ok: false,
      error: 'Your EveryKR account has been suspended by an administrator. Please contact support@everykr.com.',
      code: 'auth/user-disabled'
    };
  }

  const resolvedFullName =
    (params.fullName || params.name || '').trim() ||
    existing?.fullName ||
    existing?.name ||
    normalizedEmail
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

  const resolvedPhotoUrl =
    (params.photoURL ?? params.avatarUrl ?? existing?.photoURL ?? existing?.avatarUrl ?? '').trim();

  const resolvedRole = sanitizeUserRole(
    params.accountType || params.role,
    normalizedEmail,
    existing?.role,
    Boolean(params.isTrustedCaller)
  );
  const resolvedAccountType: ManagedUserRole = sanitizeUserRole(
    params.accountType || params.role || existing?.accountType,
    normalizedEmail,
    existing?.accountType || existing?.role,
    Boolean(params.isTrustedCaller)
  );

  const resolvedProvider: ManagedAuthProvider =
    params.authProvider || existing?.authProvider || 'email_otp';

  const resolvedEmailVerified =
    typeof params.emailVerified === 'boolean'
      ? params.emailVerified
      : existing
      ? existing.emailVerified
      : true;

  // Determine accountStatus:
  // New agent accounts start in 'pending_approval' until approved by an admin.
  let resolvedStatus: ManagedAccountStatus = 'active';
  if (existing?.accountStatus === 'suspended') {
    resolvedStatus = 'suspended';
  } else if (existing?.accountStatus === 'rejected') {
    resolvedStatus = 'rejected';
  } else if (!resolvedEmailVerified) {
    resolvedStatus = 'unverified';
  } else if (resolvedAccountType === 'agent') {
    if (existing?.accountStatus === 'active' || existing?.agentPartnerProfile?.approvalStatus === 'approved') {
      resolvedStatus = 'active';
    } else {
      resolvedStatus = 'pending_approval';
    }
  } else {
    resolvedStatus = 'active';
  }

  // Handle Sensitive Passport Encryption (AES-256-GCM) if provided with explicit consent
  // Never re-encrypt or modify existing passport records unless a new raw passport is explicitly supplied
  let resolvedPassportDetails: PassportDetailsMetadata | undefined =
    existing?.passportDetails || (existing as any)?.passportMetadata;
  const incomingPassport =
    params.passportDetails || (params as any).passportRaw || (params as any).passportMetadata;
  if (incomingPassport !== undefined) {
    const wantsService =
      incomingPassport.requiredForService !== false &&
      (Boolean(incomingPassport.consentGiven) ||
        Boolean(incomingPassport.passportNumber) ||
        Boolean(incomingPassport.hasPassportSaved));
    if (!wantsService) {
      resolvedPassportDetails = {
        hasPassportSaved: false,
        requiredForService: false,
        consentGiven: false,
        hasEncryptedPassport: Boolean(store.encryptedPassportsByUid[uid])
      };
    } else if (incomingPassport.consentGiven !== false) {
      const rawPassport = (incomingPassport.passportNumber || '').trim();
      let masked =
        incomingPassport.passportNumberMasked ||
        existing?.passportDetails?.passportNumberMasked;

      if (rawPassport && !rawPassport.includes('*')) {
        masked = maskPassportNumber(rawPassport);
        const encrypted = encryptPassportString(rawPassport);
        if (encrypted) {
          store.encryptedPassportsByUid[uid] = {
            uid,
            ciphertextHex: encrypted.ciphertextHex,
            ivHex: encrypted.ivHex,
            authTagHex: encrypted.authTagHex,
            maskedNumber: encrypted.maskedNumber,
            issueDate: incomingPassport.passportIssueDate,
            expiryDate: incomingPassport.passportExpiryDate,
            consentedAt: incomingPassport.consentedAt || nowTrustedIso,
            updatedAt: nowTrustedIso
          };
        }
      }

      resolvedPassportDetails = {
        hasPassportSaved: Boolean(masked || store.encryptedPassportsByUid[uid]),
        requiredForService: true,
        passportNumberMasked: masked || store.encryptedPassportsByUid[uid]?.maskedNumber,
        passportIssueDate:
          incomingPassport.passportIssueDate ??
          existing?.passportDetails?.passportIssueDate,
        passportExpiryDate:
          incomingPassport.passportExpiryDate ??
          existing?.passportDetails?.passportExpiryDate,
        consentGiven: true,
        consentedAt:
          incomingPassport.consentedAt ||
          existing?.passportDetails?.consentedAt ||
          nowTrustedIso,
        hasEncryptedPassport: Boolean(store.encryptedPassportsByUid[uid])
      };
    }
  }

  const resolvedPhoneNumber =
    params.phoneNumber !== undefined
      ? params.phoneNumber
      : params.phone !== undefined
      ? params.phone
      : existing?.phoneNumber || existing?.phone;

  const resolvedCountryCode =
    params.countryCode !== undefined ? params.countryCode : existing?.countryCode;

  const resolvedCountryOfResidence =
    params.countryOfResidence !== undefined
      ? params.countryOfResidence
      : existing?.countryOfResidence || params.generalUserProfile?.currentCountry;

  const resolvedNationality =
    params.nationality !== undefined ? params.nationality : existing?.nationality || '';

  const resolvedCity =
    params.city !== undefined
      ? params.city
      : params.currentCity !== undefined
      ? params.currentCity
      : existing?.city || existing?.currentCity || 'Seoul';

  const resolvedAcademic: StudentAcademicProfile | undefined =
    params.studentAcademicProfile !== undefined
      ? {
          ...existing?.studentAcademicProfile,
          ...params.studentAcademicProfile
        }
      : existing?.studentAcademicProfile;

  const resolvedEducationRecords: EducationRecord[] | undefined =
    Array.isArray(params.educationRecords)
      ? params.educationRecords
      : existing?.educationRecords;

  const resolvedGeneralProfile: GeneralUserProfile | undefined =
    params.generalUserProfile !== undefined
      ? {
          ...existing?.generalUserProfile,
          ...params.generalUserProfile
        }
      : existing?.generalUserProfile;

  const resolvedAgentProfile: AgentPartnerProfile | undefined =
    params.agentPartnerProfile !== undefined
      ? {
          ...existing?.agentPartnerProfile,
          ...params.agentPartnerProfile,
          approvalStatus:
            existing?.agentPartnerProfile?.approvalStatus ||
            params.agentPartnerProfile.approvalStatus ||
            (resolvedStatus === 'active' ? 'approved' : 'pending_approval')
        }
      : existing?.agentPartnerProfile;

  const resolvedPreferredStudyLevel =
    params.preferredStudyLevel ??
    resolvedAcademic?.desiredStudyLevel ??
    params.studyLevel ??
    existing?.preferredStudyLevel ??
    existing?.studyLevel;

  const resolvedPreferredIntake =
    params.preferredIntake ??
    resolvedAcademic?.preferredIntake ??
    existing?.preferredIntake;

  const resolvedPreferredUniversity =
    params.preferredUniversity ??
    resolvedAcademic?.preferredUniversity ??
    params.university ??
    existing?.preferredUniversity ??
    existing?.university;

  const resolvedInterestedProgram =
    params.interestedProgram ??
    resolvedAcademic?.interestedProgram ??
    params.major ??
    resolvedAcademic?.currentMajor ??
    existing?.interestedProgram ??
    existing?.major ??
    resolvedPreferredStudyLevel;

  const createdAtIso = existing?.createdAt || nowTrustedIso;
  const resolvedRegistrationId = generateServerRegistrationId(
    uid,
    resolvedAccountType,
    createdAtIso,
    params.registrationId || existing?.registrationId
  );

  const draftRecord: CentralizedUserRecord = {
    id: uid,
    uid,
    registrationId: resolvedRegistrationId,
    fullName: resolvedFullName,
    name: resolvedFullName,
    email: normalizedEmail,
    role: resolvedRole,
    accountType: resolvedAccountType,
    phoneNumber: resolvedPhoneNumber,
    countryCode: resolvedCountryCode,
    countryOfResidence: resolvedCountryOfResidence,
    nationality: resolvedNationality,
    currentCity: resolvedCity,
    city: resolvedCity,
    dateOfBirth: params.dateOfBirth !== undefined ? params.dateOfBirth : existing?.dateOfBirth,
    gender: params.gender !== undefined ? params.gender : existing?.gender,
    passportDetails: resolvedPassportDetails,
    passportMetadata: resolvedPassportDetails,
    educationRecords: resolvedEducationRecords,
    studentAcademicProfile: resolvedAcademic
      ? {
          ...resolvedAcademic,
          interestedProgram: resolvedInterestedProgram || resolvedAcademic.interestedProgram
        }
      : undefined,
    generalUserProfile: resolvedGeneralProfile,
    agentPartnerProfile: resolvedAgentProfile,
    preferredStudyLevel: resolvedPreferredStudyLevel,
    preferredIntake: resolvedPreferredIntake,
    preferredUniversity: resolvedPreferredUniversity,
    interestedProgram: resolvedInterestedProgram,
    university:
      params.university !== undefined
        ? params.university
        : resolvedAcademic?.currentUniversity || resolvedPreferredUniversity || existing?.university,
    major:
      params.major !== undefined
        ? params.major
        : resolvedAcademic?.currentMajor || resolvedInterestedProgram || existing?.major,
    studyLevel: resolvedPreferredStudyLevel,
    degreeLevel:
      params.degreeLevel !== undefined
        ? params.degreeLevel
        : resolvedAcademic?.currentEducationLevel || existing?.degreeLevel,
    preferredLanguage:
      params.preferredLanguage ||
      resolvedGeneralProfile?.preferredLanguage ||
      existing?.preferredLanguage ||
      'en',
    visaType:
      params.visaType !== undefined
        ? params.visaType
        : existing?.visaType || (resolvedAccountType === 'student' ? 'D-2 Student Visa' : undefined),
    phone: resolvedPhoneNumber,
    kakaoId: params.kakaoId !== undefined ? params.kakaoId : existing?.kakaoId,
    expectedGraduation:
      params.expectedGraduation !== undefined
        ? params.expectedGraduation
        : existing?.expectedGraduation,
    profileCompletionPercentage: 0,
    photoURL: resolvedPhotoUrl,
    avatarUrl: resolvedPhotoUrl || undefined,
    authProvider: resolvedProvider,
    emailVerified: resolvedEmailVerified,
    privacyConsent: params.privacyConsent || existing?.privacyConsent,
    createdAt: createdAtIso,
    updatedAt: nowTrustedIso,
    lastLoginAt:
      params.isLoginEvent !== false ? nowTrustedIso : existing?.lastLoginAt || nowTrustedIso,
    accountStatus: resolvedStatus
  };

  draftRecord.profileCompletionPercentage = computeServerProfileCompletion(draftRecord);

  // Record a registration_logs entry if this is a brand-new user or explicit registration event
  if (!existing || params.isNewRegistration) {
    const alreadyLogged = store.registrationLogs.some(
      r => r.uid === uid || r.email.toLowerCase() === normalizedEmail
    );
    if (!alreadyLogged) {
      const regLog: RegistrationLogEntry = {
        id: `rlog_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        registrationId: resolvedRegistrationId,
        uid,
        email: normalizedEmail,
        fullName: resolvedFullName,
        accountType: resolvedAccountType,
        role: resolvedRole,
        countryOfResidence: resolvedCountryOfResidence,
        nationality: resolvedNationality,
        authProvider: resolvedProvider,
        status:
          resolvedStatus === 'pending_approval'
            ? 'pending_approval'
            : resolvedEmailVerified
            ? 'active'
            : 'unverified',
        timestamp: nowTrustedIso
      };
      store.registrationLogs = [regLog, ...store.registrationLogs].slice(0, 500);
    }
  }

  store.usersByUid[uid] = draftRecord;
  saveStore(store);

  // Automatically sync new or updated registration to Google Sheets (non-blocking)
  if (store.googleSheetsConfig?.autoSyncOnRegistration !== false) {
    syncUsersToGoogleSheetsServer([draftRecord], 'auto_registration_upsert').catch(() => {});
  }

  return { ok: true, user: draftRecord };
}

/**
 * Records a login attempt in `login_logs` with a server-trusted timestamp.
 */
export function recordLoginAttemptServer(params: {
  uid: string;
  email: string;
  userName?: string;
  provider: ManagedAuthProvider;
  success: boolean;
  reason?: string;
}): ServerLoginLogRecord {
  const store = loadStore();
  const nowTrustedIso = new Date().toISOString();
  const safeUid = String(params.uid || 'unauthenticated').trim();
  const safeEmail = String(params.email || '').trim().toLowerCase();
  const storedUser = store.usersByUid[safeUid];
  const emailFallbackName = safeEmail.includes('@')
    ? safeEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim()
    : '';
  const resolvedUserName =
    params.userName?.trim() ||
    storedUser?.fullName?.trim() ||
    storedUser?.name?.trim() ||
    emailFallbackName ||
    'EveryKR User';

  const entry: ServerLoginLogRecord = {
    id: `llog_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    uid: safeUid,
    email: safeEmail || 'unknown@everykr.com',
    userName: resolvedUserName,
    timestamp: nowTrustedIso,
    provider: params.provider || 'email_otp',
    success: Boolean(params.success),
    status: params.success ? 'success' : 'failure',
    reason:
      params.reason ||
      (params.success ? 'Authenticated successfully' : 'Authentication failed')
  };

  if (entry.success && store.usersByUid[entry.uid]) {
    store.usersByUid[entry.uid].lastLoginAt = nowTrustedIso;
  }

  store.loginLogs = [entry, ...store.loginLogs].slice(0, 500);
  saveStore(store);
  return entry;
}

/**
 * Records an administrative action in `admin_logs` / `admin_activity_logs` with a server-trusted timestamp.
 */
export function recordAdminActionServer(params: {
  adminUid: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetUid?: string;
  targetEmail?: string;
  details: string;
}): ServerAdminLogRecord {
  const store = loadStore();
  const nowTrustedIso = new Date().toISOString();
  const entry: ServerAdminLogRecord = {
    id: `alog_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    adminUid: String(params.adminUid || 'admin').trim(),
    adminName: String(params.adminName || 'EveryKR Administrator').trim(),
    adminEmail: String(params.adminEmail || 'admin@everykr.com').trim().toLowerCase(),
    action: String(params.action || 'ADMIN_UPDATE').trim(),
    targetUid: params.targetUid ? String(params.targetUid).trim() : undefined,
    targetEmail: params.targetEmail ? String(params.targetEmail).trim().toLowerCase() : undefined,
    details: String(params.details || '').trim(),
    timestamp: nowTrustedIso
  };

  store.adminLogs = [entry, ...store.adminLogs].slice(0, 500);
  saveStore(store);
  return entry;
}

/**
 * Admin-only mutation of a user's role, accountType, accountStatus, or profile fields.
 */
export function adminUpdateUserServer(params: {
  targetUid: string;
  updates: {
    role?: ManagedUserRole;
    accountType?: ManagedUserRole;
    accountStatus?: ManagedAccountStatus;
    emailVerified?: boolean;
    fullName?: string;
    phoneNumber?: string;
    countryOfResidence?: string;
    nationality?: string;
  };
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): { ok: boolean; user?: CentralizedUserRecord; adminLog?: ServerAdminLogRecord; message?: string } {
  const store = loadStore();
  const existing = store.usersByUid[params.targetUid];
  if (!existing) {
    return { ok: false, message: `User with UID ${params.targetUid} not found.` };
  }

  const changes: string[] = [];
  if (params.updates.role && params.updates.role !== existing.role) {
    changes.push(`role: ${existing.role} -> ${params.updates.role}`);
    existing.role = params.updates.role;
    existing.accountType = params.updates.accountType || params.updates.role;
  }
  if (params.updates.accountType && params.updates.accountType !== existing.accountType) {
    changes.push(`accountType: ${existing.accountType} -> ${params.updates.accountType}`);
    existing.accountType = params.updates.accountType;
  }
  if (params.updates.accountStatus && params.updates.accountStatus !== existing.accountStatus) {
    changes.push(`accountStatus: ${existing.accountStatus} -> ${params.updates.accountStatus}`);
    existing.accountStatus = params.updates.accountStatus;
  }
  if (
    typeof params.updates.emailVerified === 'boolean' &&
    params.updates.emailVerified !== existing.emailVerified
  ) {
    changes.push(`emailVerified: ${existing.emailVerified} -> ${params.updates.emailVerified}`);
    existing.emailVerified = params.updates.emailVerified;
    if (params.updates.emailVerified && existing.accountStatus === 'unverified') {
      existing.accountStatus = existing.accountType === 'agent' ? 'pending_approval' : 'active';
    }
  }
  if (params.updates.fullName && params.updates.fullName.trim() !== existing.fullName) {
    changes.push(`fullName updated to "${params.updates.fullName.trim()}"`);
    existing.fullName = params.updates.fullName.trim();
    existing.name = params.updates.fullName.trim();
  }
  if (params.updates.phoneNumber !== undefined && params.updates.phoneNumber !== existing.phoneNumber) {
    changes.push(`phoneNumber updated`);
    existing.phoneNumber = params.updates.phoneNumber.trim();
    existing.phone = params.updates.phoneNumber.trim();
  }
  if (
    params.updates.countryOfResidence !== undefined &&
    params.updates.countryOfResidence !== existing.countryOfResidence
  ) {
    changes.push(`countryOfResidence: ${params.updates.countryOfResidence}`);
    existing.countryOfResidence = params.updates.countryOfResidence.trim();
  }
  if (params.updates.nationality !== undefined && params.updates.nationality !== existing.nationality) {
    changes.push(`nationality: ${params.updates.nationality}`);
    existing.nationality = params.updates.nationality.trim();
  }

  existing.updatedAt = new Date().toISOString();
  existing.profileCompletionPercentage = computeServerProfileCompletion(existing);
  store.usersByUid[params.targetUid] = existing;
  saveStore(store);

  const actionType = params.updates.role
    ? 'USER_ROLE_CHANGE'
    : params.updates.accountStatus
    ? 'USER_STATUS_CHANGE'
    : 'USER_PROFILE_ADMIN_UPDATE';

  const adminLog = recordAdminActionServer({
    adminUid: params.adminUid,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    action: actionType,
    targetUid: existing.uid,
    targetEmail: existing.email,
    details: `Updated ${existing.fullName} (${existing.email}): ${changes.join(', ') || 'profile metadata synced'}`
  });

  return { ok: true, user: existing, adminLog };
}

/**
 * Admin-only approval or rejection of an Education Agent / Partner account.
 */
export function approveOrRejectAgentServer(params: {
  targetUid: string;
  decision: 'approve' | 'reject';
  reason?: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): { ok: boolean; user?: CentralizedUserRecord; adminLog?: ServerAdminLogRecord; message?: string } {
  const store = loadStore();
  const existing = store.usersByUid[params.targetUid];
  if (!existing) {
    return { ok: false, message: `Agent user with UID ${params.targetUid} not found.` };
  }

  const nowIso = new Date().toISOString();
  const isApproved = params.decision === 'approve';
  existing.accountStatus = isApproved ? 'active' : 'rejected';
  existing.updatedAt = nowIso;
  existing.agentPartnerProfile = {
    agencyName: existing.agentPartnerProfile?.agencyName || existing.fullName,
    contactPerson: existing.agentPartnerProfile?.contactPerson || existing.fullName,
    country: existing.agentPartnerProfile?.country || existing.countryOfResidence || '',
    city: existing.agentPartnerProfile?.city || existing.city || '',
    businessEmail: existing.agentPartnerProfile?.businessEmail || existing.email,
    phoneNumber: existing.agentPartnerProfile?.phoneNumber || existing.phoneNumber || '',
    website: existing.agentPartnerProfile?.website,
    yearsOfExperience: existing.agentPartnerProfile?.yearsOfExperience,
    approvalStatus: isApproved ? 'approved' : 'rejected',
    approvedAt: nowIso,
    approvedBy: params.adminEmail,
    rejectionReason: !isApproved ? params.reason || 'Did not meet verification criteria' : undefined
  };

  store.usersByUid[params.targetUid] = existing;
  saveStore(store);

  const adminLog = recordAdminActionServer({
    adminUid: params.adminUid,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    action: isApproved ? 'APPROVE_EDUCATION_AGENT' : 'REJECT_EDUCATION_AGENT',
    targetUid: existing.uid,
    targetEmail: existing.email,
    details: isApproved
      ? `Approved Education Agent / Partner account for ${existing.agentPartnerProfile.agencyName} (${existing.email}).`
      : `Rejected Education Agent / Partner account for ${existing.agentPartnerProfile.agencyName} (${existing.email}). Reason: ${params.reason || 'N/A'}`
  });

  return { ok: true, user: existing, adminLog };
}

/**
 * Authorized Admin-only reveal of encrypted passport number.
 * Mandatory security audit log entry is recorded in `admin_logs`.
 */
export function revealEncryptedPassportServer(params: {
  targetUid: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): {
  ok: boolean;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  issueDate?: string;
  expiryDate?: string;
  consentedAt?: string;
  message?: string;
} {
  const store = loadStore();
  const user = store.usersByUid[params.targetUid];
  const vaultEntry = store.encryptedPassportsByUid[params.targetUid];

  if (!vaultEntry) {
    return {
      ok: false,
      message: 'No encrypted passport record is stored for this user.'
    };
  }

  const decryption = decryptPassportEntry(vaultEntry);
  if (!decryption.ok || !decryption.decrypted) {
    return {
      ok: false,
      message: decryption.error || 'Unable to decrypt passport record.'
    };
  }

  recordAdminActionServer({
    adminUid: params.adminUid,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    action: 'ADMIN_REVEAL_PASSPORT',
    targetUid: params.targetUid,
    targetEmail: user?.email,
    details: `Authorized admin decrypted sensitive passport record for ${user?.fullName || params.targetUid} (${user?.email || 'unknown'})`
  });

  return {
    ok: true,
    passportNumber: decryption.decrypted,
    passportIssueDate: vaultEntry.issueDate,
    passportExpiryDate: vaultEntry.expiryDate,
    issueDate: vaultEntry.issueDate,
    expiryDate: vaultEntry.expiryDate,
    consentedAt: vaultEntry.consentedAt
  };
}

/**
 * User self-service or Admin deletion of stored sensitive passport data.
 */
export function deleteUserPassportDataServer(uid: string): { ok: boolean; user?: CentralizedUserRecord } {
  const store = loadStore();
  delete store.encryptedPassportsByUid[uid];
  const user = store.usersByUid[uid];
  if (user) {
    const emptyPassport = {
      hasPassportSaved: false,
      requiredForService: false,
      consentGiven: false,
      hasEncryptedPassport: false
    };
    user.passportDetails = emptyPassport;
    (user as any).passportMetadata = emptyPassport;
    user.updatedAt = new Date().toISOString();
    store.usersByUid[uid] = user;
  }
  saveStore(store);
  return { ok: true, user };
}

/**
 * Creates a user Personal Data Correction or Account Deletion request (`data_privacy_requests`).
 */
export function createDataPrivacyRequestServer(params: {
  uid: string;
  email: string;
  fullName: string;
  requestType: 'correction' | 'data_correction' | 'passport_deletion' | 'account_deletion';
  details: string;
}): DataPrivacyRequestEntry {
  const store = loadStore();
  const nowIso = new Date().toISOString();

  if (params.requestType === 'passport_deletion') {
    deleteUserPassportDataServer(params.uid);
  }

  const normalizedType =
    params.requestType === 'passport_deletion' || params.requestType === 'account_deletion'
      ? params.requestType
      : 'data_correction';

  const entry: DataPrivacyRequestEntry = {
    id: `dpr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    uid: params.uid,
    email: params.email.trim().toLowerCase(),
    fullName: params.fullName.trim(),
    requestType: normalizedType as any,
    details: params.details.trim(),
    status: (params.requestType === 'passport_deletion' ? 'completed' : 'pending') as any,
    requestedAt: nowIso,
    processedAt: params.requestType === 'passport_deletion' ? nowIso : undefined,
    createdAt: nowIso,
    resolvedAt: params.requestType === 'passport_deletion' ? nowIso : undefined,
    resolvedBy: params.requestType === 'passport_deletion' ? 'Automated Self-Service Purge' : undefined
  };

  store.dataPrivacyRequests = [entry, ...store.dataPrivacyRequests].slice(0, 500);
  saveStore(store);
  return entry;
}

/**
 * User self-service permanent account deletion.
 */
export function deleteOwnAccountServer(params: {
  uid: string;
  email: string;
  reason?: string;
}): { ok: boolean; message: string } {
  const store = loadStore();
  const existing = store.usersByUid[params.uid];
  const targetEmail = (params.email || existing?.email || '').trim().toLowerCase();

  delete store.usersByUid[params.uid];
  delete store.encryptedPassportsByUid[params.uid];
  if (targetEmail) {
    removeOtpRegistrationByEmail(targetEmail);
  }

  const nowIso = new Date().toISOString();
  const deletionRequest: DataPrivacyRequestEntry = {
    id: `dpr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    uid: params.uid,
    email: targetEmail,
    fullName: existing?.fullName || 'Deleted User',
    requestType: 'account_deletion',
    details: params.reason || 'User executed self-service account & personal data deletion.',
    status: 'resolved',
    requestedAt: nowIso,
    processedAt: nowIso,
    createdAt: nowIso,
    resolvedAt: nowIso,
    resolvedBy: 'User Self-Service'
  };
  store.dataPrivacyRequests = [deletionRequest, ...store.dataPrivacyRequests].slice(0, 500);

  saveStore(store);
  return {
    ok: true,
    message: 'Your EveryKR account and personal data have been permanently deleted.'
  };
}

/**
 * Admin-only deletion of a user record.
 */
export function adminDeleteUserServer(params: {
  targetUid: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): { ok: boolean; adminLog?: ServerAdminLogRecord; message?: string } {
  const store = loadStore();
  const existing = store.usersByUid[params.targetUid];
  if (!existing) {
    return { ok: false, message: `User with UID ${params.targetUid} not found.` };
  }

  delete store.usersByUid[params.targetUid];
  delete store.encryptedPassportsByUid[params.targetUid];
  if (existing.email) {
    removeOtpRegistrationByEmail(existing.email);
  }
  saveStore(store);

  const adminLog = recordAdminActionServer({
    adminUid: params.adminUid,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    action: 'DELETE_USER',
    targetUid: existing.uid,
    targetEmail: existing.email,
    details: `Deleted user account ${existing.fullName} (${existing.email}, role: ${existing.role})`
  });

  return { ok: true, adminLog };
}

/**
 * Returns the complete centralized User Management dataset for authorized admins:
 * - users (with masked passport details only — never raw encrypted/plaintext passport numbers)
 * - stats (total, verified, unverified, students, generalUsers, agents, pendingAgents, employers, housing providers, university partners)
 * - loginLogs
 * - adminLogs (`admin_activity_logs` & `admin_logs`)
 * - registrationLogs (`registration_logs`)
 * - dataPrivacyRequests (`data_privacy_requests`)
 * - otpVerifications (metadata only — zero plaintext OTPs or hashes)
 */
export function getAdminUserManagementOverview() {
  const store = loadStore();
  const otpOverview = getAdminRegistrationsOverview();

  const mergedByUid = new Map<string, CentralizedUserRecord>();
  const emailToUid = new Map<string, string>();

  for (const user of Object.values(store.usersByUid)) {
    const safeUser: CentralizedUserRecord = {
      ...user,
      accountType: user.accountType || user.role,
      profileCompletionPercentage:
        typeof user.profileCompletionPercentage === 'number'
          ? user.profileCompletionPercentage
          : computeServerProfileCompletion(user),
      passportDetails: user.passportDetails
        ? {
            requiredForService: Boolean(user.passportDetails.requiredForService),
            passportNumberMasked:
              user.passportDetails.passportNumberMasked ||
              store.encryptedPassportsByUid[user.uid]?.maskedNumber,
            passportIssueDate: user.passportDetails.passportIssueDate,
            passportExpiryDate: user.passportDetails.passportExpiryDate,
            consentGiven: Boolean(user.passportDetails.consentGiven),
            consentedAt: user.passportDetails.consentedAt,
            hasEncryptedPassport: Boolean(store.encryptedPassportsByUid[user.uid])
          }
        : undefined
    };
    mergedByUid.set(user.uid, safeUser);
    emailToUid.set(user.email.toLowerCase(), user.uid);
  }

  const allOtpRegs = [
    ...otpOverview.verifiedRegistrations,
    ...otpOverview.unverifiedRegistrations
  ];

  for (const reg of allOtpRegs) {
    const emailLower = reg.email.toLowerCase();
    const existingUid = reg.uid || emailToUid.get(emailLower) || `uid_pending_${reg.id}`;
    const existingRecord = mergedByUid.get(existingUid);

    if (existingRecord) {
      mergedByUid.set(existingUid, {
        ...existingRecord,
        emailVerified: existingRecord.emailVerified || reg.emailVerified,
        accountStatus:
          existingRecord.accountStatus === 'suspended' ||
          existingRecord.accountStatus === 'pending_approval' ||
          existingRecord.accountStatus === 'rejected'
            ? existingRecord.accountStatus
            : existingRecord.emailVerified || reg.emailVerified
            ? 'active'
            : 'unverified'
      });
    } else {
      const role = (reg.role as ManagedUserRole) || 'student';
      const synthesized: CentralizedUserRecord = {
        id: existingUid,
        uid: existingUid,
        registrationId: generateServerRegistrationId(existingUid, role, reg.createdAt),
        fullName: reg.name,
        name: reg.name,
        email: emailLower,
        role,
        accountType: role,
        photoURL: '',
        authProvider: (reg.authProvider as ManagedAuthProvider) || 'email_otp',
        emailVerified: Boolean(reg.emailVerified),
        createdAt: reg.createdAt,
        updatedAt: reg.verifiedAt || reg.createdAt,
        lastLoginAt: reg.verifiedAt || reg.createdAt,
        accountStatus: !reg.emailVerified
          ? 'unverified'
          : role === 'agent'
          ? 'pending_approval'
          : 'active',
        nationality: '',
        currentCity: 'Seoul',
        preferredLanguage: 'en',
        profileCompletionPercentage: 35,
        visaType: role === 'student' ? 'D-2 Student Visa' : undefined
      };
      mergedByUid.set(existingUid, synthesized);
      emailToUid.set(emailLower, existingUid);
    }
  }

  const users = Array.from(mergedByUid.values())
    .map(u => ({
      ...u,
      registrationId: generateServerRegistrationId(
        u.uid || u.id,
        u.accountType || u.role,
        u.createdAt,
        u.registrationId
      )
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    totalUsers: users.length,
    verifiedUsers: users.filter(u => u.emailVerified).length,
    unverifiedUsers: users.filter(u => !u.emailVerified).length,
    studentsCount: users.filter(u => (u.accountType || u.role) === 'student').length,
    generalUsersCount: users.filter(u => (u.accountType || u.role) === 'general').length,
    agentsCount: users.filter(u => (u.accountType || u.role) === 'agent').length,
    pendingAgentsCount: users.filter(
      u => (u.accountType || u.role) === 'agent' && u.accountStatus === 'pending_approval'
    ).length,
    employersCount: users.filter(u => u.role === 'employer').length,
    housingProvidersCount: users.filter(u => u.role === 'landlord').length,
    universityPartnersCount: users.filter(u => u.role === 'university').length,
    adminsCount: users.filter(u => u.role === 'admin').length,
    suspendedUsers: users.filter(u => u.accountStatus === 'suspended').length
  };

  const otpVerifications = allOtpRegs.map(r => ({
    id: r.id,
    uid: r.uid || emailToUid.get(r.email.toLowerCase()),
    email: r.email,
    fullName: r.name,
    role: r.role,
    accountType: r.role,
    status: r.emailVerified
      ? 'verified'
      : r.accountStatus === 'locked'
      ? 'locked'
      : r.accountStatus === 'expired'
      ? 'expired'
      : 'pending_otp',
    emailVerified: Boolean(r.emailVerified),
    attemptsUsed: r.attemptsUsed ?? 0,
    maxAttempts: r.maxAttempts ?? 5,
    requestedAt: r.createdAt,
    expiresAt: r.expiresAt || r.createdAt,
    verifiedAt: r.verifiedAt,
    lastDeliveryMessageId: r.lastDeliveryMessageId
  }));

  return {
    users,
    stats,
    loginLogs: store.loginLogs,
    adminLogs: store.adminLogs,
    adminActivityLogs: store.adminLogs,
    registrationLogs: store.registrationLogs,
    dataPrivacyRequests: store.dataPrivacyRequests,
    otpVerifications,
    googleSheetsConfig: store.googleSheetsConfig || DEFAULT_GOOGLE_SHEETS_CONFIG
  };
}

/**
 * Maps any user record into the 20-column spreadsheet format required for Excel (.xlsx) and Google Sheets export.
 * Strictly excludes passwords, OTPs, tokens, and raw/encrypted passport numbers.
 */
export function formatUserForSpreadsheetRow(user: Partial<CentralizedUserRecord>): Record<string, string> {
  const uid = String(user.uid || user.id || '');
  const role = String(user.accountType || user.role || 'student');
  const regId = generateServerRegistrationId(uid, role, user.createdAt, user.registrationId);
  const rawPhone = String(user.phoneNumber || user.phone || '').trim();
  const code = String(user.countryCode || '').trim();
  const formattedPhone =
    code && rawPhone && !rawPhone.startsWith(code) ? `${code} ${rawPhone}` : rawPhone;

  const createdDateStr = user.createdAt
    ? !isNaN(new Date(user.createdAt).getTime())
      ? new Date(user.createdAt).toISOString().replace('T', ' ').slice(0, 16)
      : String(user.createdAt)
    : '';

  const langMap: Record<string, string> = {
    en: 'English (en)',
    ko: 'Korean (ko)',
    bn: 'Bangla (bn)',
    ne: 'Nepali (ne)',
    ur: 'Urdu (ur)',
    zh: 'Chinese (zh)'
  };
  const prefLang = String(
    user.preferredLanguage || user.generalUserProfile?.preferredLanguage || 'en'
  );

  const academic = user.studentAcademicProfile;
  const interestedProgram =
    academic?.interestedProgram ||
    user.interestedProgram ||
    academic?.currentMajor ||
    user.major ||
    academic?.desiredStudyLevel ||
    user.preferredStudyLevel ||
    '';

  return {
    'Registration ID': regId,
    'Full Name': String(user.fullName || user.name || ''),
    'Email': String(user.email || ''),
    'Phone Number': formattedPhone,
    'Nationality': String(user.nationality || user.countryOfResidence || ''),
    'User Type': role,
    'Date of Birth': String(user.dateOfBirth || ''),
    'Gender': String(user.gender || ''),
    'HSC Passing Year': String(academic?.hscPassingYear || ''),
    'HSC GPA': String(academic?.hscGpa || ''),
    'SSC Passing Year': String(academic?.sscPassingYear || ''),
    'SSC GPA': String(academic?.sscGpa || ''),
    'Current Education': String(
      academic?.currentEducationLevel ||
        academic?.lastCompletedEducation ||
        user.degreeLevel ||
        user.studyLevel ||
        ''
    ),
    'Interested University': String(
      academic?.preferredUniversity || user.preferredUniversity || user.university || ''
    ),
    'Interested Program': String(interestedProgram),
    'Preferred Intake': String(academic?.preferredIntake || user.preferredIntake || ''),
    'Korean Language Level': String(academic?.koreanLanguageLevel || ''),
    'Registration Date': createdDateStr,
    'Account Status': String(user.accountStatus || 'active'),
    'Preferred Language': langMap[prefLang] || prefLang
  };
}

/**
 * Updates Google Sheets integration settings and optionally triggers an immediate sync.
 */
export function updateGoogleSheetsConfigServer(params: {
  webhookUrl?: string;
  spreadsheetUrl?: string;
  sheetName?: string;
  autoSyncOnRegistration?: boolean;
  enabled?: boolean;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): { ok: boolean; config: GoogleSheetsSyncConfig; adminLog: ServerAdminLogRecord } {
  const store = loadStore();
  const current = store.googleSheetsConfig || { ...DEFAULT_GOOGLE_SHEETS_CONFIG };
  const nextConfig: GoogleSheetsSyncConfig = {
    ...current,
    ...(params.webhookUrl !== undefined ? { webhookUrl: params.webhookUrl.trim() } : {}),
    ...(params.spreadsheetUrl !== undefined ? { spreadsheetUrl: params.spreadsheetUrl.trim() } : {}),
    ...(params.sheetName !== undefined && params.sheetName.trim()
      ? { sheetName: params.sheetName.trim() }
      : {}),
    ...(typeof params.autoSyncOnRegistration === 'boolean'
      ? { autoSyncOnRegistration: params.autoSyncOnRegistration }
      : {}),
    ...(typeof params.enabled === 'boolean' ? { enabled: params.enabled } : {})
  };

  store.googleSheetsConfig = nextConfig;
  saveStore(store);

  const adminLog = recordAdminActionServer({
    adminUid: params.adminUid,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    action: 'GOOGLE_SHEETS_CONFIG_UPDATE',
    details: `Updated Google Sheets integration settings (sheet: ${nextConfig.sheetName}, autoSync: ${nextConfig.autoSyncOnRegistration}, webhookConfigured: ${Boolean(nextConfig.webhookUrl)})`
  });

  return { ok: true, config: nextConfig, adminLog };
}

/**
 * Synchronizes user records with Google Sheets via configured Apps Script / Webhook endpoint.
 * Deduplicates by Registration ID and Email so duplicate rows are never created.
 */
export async function syncUsersToGoogleSheetsServer(
  usersToSync?: Partial<CentralizedUserRecord>[],
  triggerReason: string = 'manual_admin_sync',
  adminInfo?: { adminUid: string; adminName: string; adminEmail: string }
): Promise<{
  ok: boolean;
  syncedCount: number;
  status: 'synced' | 'ready_local' | 'error';
  message: string;
  config: GoogleSheetsSyncConfig;
}> {
  const store = loadStore();
  const config = store.googleSheetsConfig || { ...DEFAULT_GOOGLE_SHEETS_CONFIG };
  const overview = getAdminUserManagementOverview();
  const rawRecords = usersToSync && usersToSync.length > 0 ? usersToSync : overview.users;

  // Deduplicate by Registration ID and normalized Email before syncing
  const dedupedByEmailOrRegId = new Map<string, Record<string, string>>();
  for (const u of rawRecords) {
    const formatted = formatUserForSpreadsheetRow(u);
    const key = (formatted['Email'] || formatted['Registration ID']).toLowerCase();
    if (key) {
      dedupedByEmailOrRegId.set(key, formatted);
    }
  }
  const rows = Array.from(dedupedByEmailOrRegId.values());
  const nowIso = new Date().toISOString();

  if (config.webhookUrl && /^https?:\/\//i.test(config.webhookUrl)) {
    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_everykr_users',
          sheetName: config.sheetName || 'EveryKR_Registrations',
          deduplicateKey: 'Registration ID',
          secondaryDeduplicateKey: 'Email',
          exportedAt: nowIso,
          triggerReason,
          columns: Object.keys(rows[0] || formatUserForSpreadsheetRow({})),
          rows
        })
      });
      if (!response.ok) {
        throw new Error(`Webhook responded with HTTP ${response.status}`);
      }
      config.lastSyncedAt = nowIso;
      config.lastSyncStatus = 'synced';
      config.syncedRowCount = rows.length;
      config.lastSyncMessage = `Synced ${rows.length} deduplicated user record(s) to Google Sheet "${config.sheetName}" at ${nowIso.slice(0, 19).replace('T', ' ')} UTC.`;
    } catch (err: any) {
      config.lastSyncedAt = nowIso;
      config.lastSyncStatus = 'error';
      config.lastSyncMessage = `Google Sheets webhook error: ${err?.message || 'Connection failed'}. Records remain safely stored in Firestore & local sync queue.`;
      store.googleSheetsConfig = config;
      saveStore(store);
      return {
        ok: false,
        syncedCount: 0,
        status: 'error',
        message: config.lastSyncMessage,
        config
      };
    }
  } else {
    config.lastSyncedAt = nowIso;
    config.lastSyncStatus = 'ready_local';
    config.syncedRowCount = overview.users.length;
    config.lastSyncMessage = `Prepared & deduplicated ${overview.users.length} user record(s) for Google Sheets (${config.sheetName}). Add a Google Apps Script Webhook URL to push live to an external Google Sheet, or use Export to Excel (.xlsx).`;
  }

  store.googleSheetsConfig = config;
  saveStore(store);

  if (adminInfo) {
    recordAdminActionServer({
      adminUid: adminInfo.adminUid,
      adminName: adminInfo.adminName,
      adminEmail: adminInfo.adminEmail,
      action: 'GOOGLE_SHEETS_SYNC',
      details: `Synchronized ${rows.length} deduplicated user record(s) with Google Sheets (${config.sheetName}). Status: ${config.lastSyncStatus}.`
    });
  }

  return {
    ok: true,
    syncedCount: rows.length,
    status: config.lastSyncStatus === 'synced' ? 'synced' : 'ready_local',
    message: config.lastSyncMessage || 'Google Sheets sync completed.',
    config
  };
}

// ============================================================================
// SERVER-SIDE AUTHENTICATION, SIGNED SESSION TOKENS & ADMIN AUTHORIZATION
// ============================================================================

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSessionSigningSecret(): string {
  const configuredSession = (process.env.SESSION_SIGNING_SECRET || '').trim();
  if (configuredSession && configuredSession.length >= 16) {
    return configuredSession;
  }
  return getOtpSigningSecret();
}

export function isAuthorizedServerAdmin(
  uid?: string,
  _email?: string,
  verifiedClaims?: Record<string, any> | null
): boolean {
  // Authoritative path: verified Firebase Auth custom claims (admin / super_admin)
  if (verifiedClaims && hasVerifiedAdminCustomClaim(verifiedClaims)) {
    return true;
  }
  // If verifiedClaims were explicitly supplied and do NOT hold admin claims, fail closed
  if (verifiedClaims) {
    return false;
  }
  // Secondary path for legacy ekrs1 server sessions: requires an active explicitly-assigned
  // admin record by UID (NEVER grants admin access by email string alone)
  const store = loadStore();
  if (uid && store.usersByUid[uid]) {
    const user = store.usersByUid[uid];
    if (
      user.accountStatus === 'active' &&
      user.emailVerified !== false &&
      user.role === 'admin'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Issues an HMAC-SHA256 signed server session token (`ekrs1.<payloadBase64Url>.<sigHex>`).
 */
export function issueServerSessionToken(params: {
  uid: string;
  email: string;
  role: ManagedUserRole;
}): string {
  const now = Date.now();
  const payloadObj = {
    v: 'ekrs1',
    uid: String(params.uid).trim(),
    email: String(params.email).trim().toLowerCase(),
    role: params.role,
    iat: now,
    exp: now + SESSION_TTL_MS
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sigHex = crypto
    .createHmac('sha256', getSessionSigningSecret())
    .update(`ekrs1.${payloadB64}`)
    .digest('hex');
  return `ekrs1.${payloadB64}.${sigHex}`;
}

/**
 * Verifies an HMAC-SHA256 signed server session token and checks the live user record.
 */
export function verifyServerSessionToken(token?: string): {
  valid: boolean;
  uid?: string;
  email?: string;
  role?: ManagedUserRole;
  isAdmin: boolean;
  user?: CentralizedUserRecord;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, isAdmin: false };
  }
  const trimmed = token.replace(/^Bearer\s+/i, '').trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== 'ekrs1') {
    return { valid: false, isAdmin: false };
  }

  const [, payloadB64, providedSigHex] = parts;
  if (!payloadB64 || !providedSigHex) {
    return { valid: false, isAdmin: false };
  }

  try {
    const expectedSigHex = crypto
      .createHmac('sha256', getSessionSigningSecret())
      .update(`ekrs1.${payloadB64}`)
      .digest('hex');

    if (expectedSigHex.length !== providedSigHex.length) {
      return { valid: false, isAdmin: false };
    }
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSigHex, 'hex'),
      Buffer.from(providedSigHex, 'hex')
    );
    if (!isMatch) {
      return { valid: false, isAdmin: false };
    }

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!decoded || !decoded.uid || !decoded.email || typeof decoded.exp !== 'number') {
      return { valid: false, isAdmin: false };
    }
    if (Date.now() > decoded.exp) {
      return { valid: false, isAdmin: false };
    }

    const store = loadStore();
    const user =
      store.usersByUid[decoded.uid] ||
      Object.values(store.usersByUid).find(
        u => u.email.toLowerCase() === String(decoded.email).toLowerCase()
      );

    if (
      !user ||
      user.emailVerified === false ||
      user.accountStatus === 'unverified' ||
      user.accountStatus === 'suspended'
    ) {
      return { valid: false, isAdmin: false };
    }

    const isAdmin = isAuthorizedServerAdmin(user.uid, user.email);
    return {
      valid: true,
      uid: user.uid,
      email: user.email,
      role: isAdmin ? 'admin' : user.role,
      isAdmin,
      user
    };
  } catch {
    return { valid: false, isAdmin: false };
  }
}

interface CachedFirebaseTokenCheck {
  expiresAt: number;
  result: {
    valid: boolean;
    uid?: string;
    email?: string;
    emailVerified?: boolean;
    name?: string;
    picture?: string;
    customClaims?: Record<string, any>;
  };
}

const VERIFIED_FB_TOKEN_CACHE = new Map<string, CachedFirebaseTokenCheck>();
const VERIFIED_FB_TOKEN_TTL_MS = 60 * 1000;

/**
 * Verifies a genuine Firebase Authentication ID Token against Google Identity Toolkit (`accounts:lookup`)
 * for the canonical `"everykr"` Firebase project, with a strict 6s network timeout and 60s hashed cache.
 */
export async function verifyFirebaseIdTokenServer(idToken?: string): Promise<{
  valid: boolean;
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  customClaims?: Record<string, any>;
}> {
  if (!idToken || typeof idToken !== 'string') {
    return { valid: false };
  }
  const cleanToken = idToken.replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken || cleanToken.startsWith('ekrs1.')) {
    return { valid: false };
  }

  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
  const now = Date.now();
  const cached = VERIFIED_FB_TOKEN_CACHE.get(tokenHash);
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  const rawEnvKey = String(process.env.VITE_FIREBASE_API_KEY || '').trim();
  const strippedEnvKey = rawEnvKey.replace(/^VITE_FIREBASE_API_KEY=/i, '').replace(/^["']+|["']+$/g, '').trim();
  const firebaseApiKey =
    strippedEnvKey &&
    !strippedEnvKey.includes('AIzaSyDz2i6rdy80CgBqpbndnZQBfrBnsKIlYqo') &&
    !strippedEnvKey.includes('wecare')
      ? strippedEnvKey
      : 'AIzaSyAgJyMMBxCO6GZgSsh7a6xMolDs7JzTscQ';

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: cleanToken }),
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!response.ok) {
      return { valid: false };
    }
    const data: any = await response.json().catch(() => null);
    const fbAccount = data?.users?.[0];
    if (!fbAccount || !fbAccount.localId) {
      return { valid: false };
    }
    if (fbAccount.disabled) {
      return { valid: false };
    }

    let customClaims: Record<string, any> | undefined;
    if (typeof fbAccount.customAttributes === 'string' && fbAccount.customAttributes.trim()) {
      try {
        const parsedClaims = JSON.parse(fbAccount.customAttributes);
        if (parsedClaims && typeof parsedClaims === 'object' && !Array.isArray(parsedClaims)) {
          customClaims = parsedClaims;
        }
      } catch {
        customClaims = undefined;
      }
    }

    const verifiedResult = {
      valid: true,
      uid: String(fbAccount.localId),
      email: fbAccount.email ? String(fbAccount.email).trim().toLowerCase() : undefined,
      emailVerified: Boolean(fbAccount.emailVerified),
      name: fbAccount.displayName ? String(fbAccount.displayName) : undefined,
      picture: fbAccount.photoUrl ? String(fbAccount.photoUrl) : undefined,
      customClaims
    };

    if (VERIFIED_FB_TOKEN_CACHE.size > 500) {
      for (const [k, entry] of VERIFIED_FB_TOKEN_CACHE.entries()) {
        if (entry.expiresAt <= now) VERIFIED_FB_TOKEN_CACHE.delete(k);
      }
    }
    VERIFIED_FB_TOKEN_CACHE.set(tokenHash, {
      expiresAt: now + VERIFIED_FB_TOKEN_TTL_MS,
      result: verifiedResult,
    });

    return verifiedResult;
  } catch {
    return { valid: false };
  }
}

/**
 * Verifies the caller's identity from either a signed server session token (`ekrs1...`)
 * or a genuine Firebase ID token (`Authorization: Bearer <token>`), and checks server-side admin registry.
 */
export async function verifyCallerIdentityServer(params: {
  authHeader?: string;
  sessionToken?: string;
  firebaseIdToken?: string;
}): Promise<{
  authenticated: boolean;
  uid?: string;
  email?: string;
  name?: string;
  role?: ManagedUserRole;
  isAdmin: boolean;
  user?: CentralizedUserRecord;
  sessionToken?: string;
}> {
  const bearerToken = params.authHeader
    ? params.authHeader.replace(/^Bearer\s+/i, '').trim()
    : '';
  const candidateSessionToken =
    params.sessionToken || (bearerToken.startsWith('ekrs1.') ? bearerToken : undefined);
  const candidateFirebaseToken =
    params.firebaseIdToken ||
    (bearerToken && !bearerToken.startsWith('ekrs1.') ? bearerToken : undefined);

  // 1. Check signed server session token first
  if (candidateSessionToken) {
    const verifiedSession = verifyServerSessionToken(candidateSessionToken);
    if (verifiedSession.valid && verifiedSession.user) {
      return {
        authenticated: true,
        uid: verifiedSession.uid,
        email: verifiedSession.email,
        name: verifiedSession.user.fullName || verifiedSession.user.name,
        role: verifiedSession.role,
        isAdmin: verifiedSession.isAdmin,
        user: verifiedSession.user,
        sessionToken: candidateSessionToken
      };
    }
  }

  // 2. Check genuine Firebase ID token via Identity Toolkit
  if (candidateFirebaseToken) {
    const verifiedFb = await verifyFirebaseIdTokenServer(candidateFirebaseToken);
    if (verifiedFb.valid && verifiedFb.uid && verifiedFb.email) {
      const store = loadStore();
      let user: CentralizedUserRecord | undefined =
        store.usersByUid[verifiedFb.uid] ||
        Object.values(store.usersByUid).find(
          u => u.email.toLowerCase() === verifiedFb.email!
        );

      if (!user) {
        const synced = syncCentralizedUserServer({
          uid: verifiedFb.uid,
          email: verifiedFb.email,
          fullName: verifiedFb.name,
          photoURL: verifiedFb.picture,
          authProvider: 'google',
          emailVerified: true,
          isLoginEvent: true,
          allowCreate: true,
          isTrustedCaller: true
        });
        user = synced.user;
      }

      if (user && user.accountStatus !== 'suspended') {
        // Strictly derive Firebase-authenticated admin status from verified Firebase custom claims
        // (NEVER auto-promote from hardcoded email allowlists)
        const isAdmin = hasVerifiedAdminCustomClaim(verifiedFb.customClaims);
        const issuedToken = issueServerSessionToken({
          uid: user.uid,
          email: user.email,
          role: isAdmin ? 'admin' : user.role
        });
        return {
          authenticated: true,
          uid: user.uid,
          email: user.email,
          name: user.fullName || user.name,
          role: isAdmin ? 'admin' : user.role,
          isAdmin,
          user,
          sessionToken: issuedToken
        };
      }
    }
  }

  return { authenticated: false, isAdmin: false };
}

/**
 * Strictly authenticates a registered user by email and password against stored scrypt password hashes.
 * - Rejects empty email or password.
 * - Rejects unregistered emails.
 * - Rejects unverified or suspended accounts.
 * - Rejects incorrect passwords.
 * - NEVER creates a user during login.
 */
export function authenticateUserCredentialsServer(params: {
  email: string;
  password?: string;
}): {
  ok: boolean;
  status: number;
  code?: string;
  error?: string;
  user?: CentralizedUserRecord;
  sessionToken?: string;
  isAdmin?: boolean;
} {
  const normalizedEmail = String(params.email || '').trim().toLowerCase();
  const rawPassword = String(params.password || '');

  if (!normalizedEmail || !rawPassword.trim()) {
    recordLoginAttemptServer({
      uid: 'unauthenticated',
      email: normalizedEmail || 'empty@everykr.com',
      provider: 'password',
      success: false,
      reason: 'Login rejected: missing email or password'
    });
    return {
      ok: false,
      status: 400,
      code: 'auth/missing-credentials',
      error: 'Email address and password are required.'
    };
  }

  const store = loadStore();
  if (!store.passwordHashesByUid) {
    store.passwordHashesByUid = {};
  }

  const existingUser = Object.values(store.usersByUid).find(
    u => u.email.toLowerCase() === normalizedEmail
  );

  // Never create an account on login; reject unregistered or unverified emails immediately
  if (!existingUser || existingUser.emailVerified === false || existingUser.accountStatus === 'unverified') {
    recordLoginAttemptServer({
      uid: existingUser?.uid || 'unauthenticated',
      email: normalizedEmail,
      userName: existingUser?.fullName,
      provider: 'password',
      success: false,
      reason: 'Login rejected: unregistered or unverified email address'
    });
    return {
      ok: false,
      status: 401,
      code: 'auth/invalid-credential',
      error: 'Incorrect email or password. Please check your credentials and try again.'
    };
  }

  if (existingUser.accountStatus === 'suspended') {
    recordLoginAttemptServer({
      uid: existingUser.uid,
      email: normalizedEmail,
      userName: existingUser.fullName,
      provider: 'password',
      success: false,
      reason: 'Login blocked: account is suspended by administrator'
    });
    return {
      ok: false,
      status: 403,
      code: 'auth/user-disabled',
      error: 'Your EveryKR account has been suspended by an administrator.'
    };
  }

  let storedPasswordHash =
    store.passwordHashesByUid[existingUser.uid] ||
    store.passwordHashesByUid[normalizedEmail];
  if (!storedPasswordHash) {
    const otpPasswordHash = getVerifiedPasswordHashForEmail(normalizedEmail);
    if (otpPasswordHash) {
      storedPasswordHash = otpPasswordHash;
      store.passwordHashesByUid[existingUser.uid] = otpPasswordHash;
      store.passwordHashesByUid[normalizedEmail] = otpPasswordHash;
      saveStore(store);
    }
  } else {
    // Ensure both UID and email keys stay synchronized
    if (!store.passwordHashesByUid[existingUser.uid]) {
      store.passwordHashesByUid[existingUser.uid] = storedPasswordHash;
    }
    if (!store.passwordHashesByUid[normalizedEmail]) {
      store.passwordHashesByUid[normalizedEmail] = storedPasswordHash;
    }
  }

  if (!storedPasswordHash || !verifyPasswordScrypt(rawPassword, storedPasswordHash)) {
    recordLoginAttemptServer({
      uid: existingUser.uid,
      email: normalizedEmail,
      userName: existingUser.fullName,
      provider: 'password',
      success: false,
      reason: 'Login rejected: invalid password'
    });
    return {
      ok: false,
      status: 401,
      code: 'auth/invalid-credential',
      error: 'Incorrect email or password. Please check your credentials and try again.'
    };
  }

  const nowIso = new Date().toISOString();
  existingUser.lastLoginAt = nowIso;
  store.usersByUid[existingUser.uid] = existingUser;
  saveStore(store);

  const isAdmin = isAuthorizedServerAdmin(existingUser.uid, existingUser.email);
  const sessionToken = issueServerSessionToken({
    uid: existingUser.uid,
    email: existingUser.email,
    role: isAdmin ? 'admin' : existingUser.role
  });

  recordLoginAttemptServer({
    uid: existingUser.uid,
    email: existingUser.email,
    userName: existingUser.fullName,
    provider: 'password',
    success: true,
    reason: 'Authenticated via verified email & scrypt password hash'
  });

  return {
    ok: true,
    status: 200,
    user: {
      ...existingUser,
      role: isAdmin ? 'admin' : existingUser.role
    },
    sessionToken,
    isAdmin
  };
}

/**
 * Looks up a registered, verified user in the canonical EveryKR user store by email.
 */
export function findRegisteredUserByEmailServer(email?: string): CentralizedUserRecord | null {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;
  const store = loadStore();
  const user = Object.values(store.usersByUid).find(
    u => u.email.toLowerCase() === normalizedEmail
  );
  if (!user || user.emailVerified === false || user.accountStatus === 'unverified') {
    return null;
  }
  return user;
}

/**
 * Initiates a password reset request for an email address.
 * Always returns the neutral anti-enumeration message for valid email addresses.
 */
export async function initiatePasswordResetServer(params: {
  email: string;
  clientIp: string;
  baseUrl: string;
}): Promise<{
  ok: boolean;
  status: 'reset_requested' | 'rate_limited' | 'invalid_input' | 'delivery_failed';
  message: string;
  cooldownSeconds?: number;
}> {
  const normalizedEmail = (params.email || '').trim().toLowerCase();
  const registeredUser = findRegisteredUserByEmailServer(normalizedEmail);

  // Suspended accounts do not receive reset emails, but still return the neutral message
  const activeRegisteredUser =
    registeredUser && registeredUser.accountStatus !== 'suspended'
      ? {
          uid: registeredUser.uid,
          email: registeredUser.email,
          name: registeredUser.fullName || registeredUser.name || normalizedEmail.split('@')[0]
        }
      : null;

  return requestPasswordResetEmail({
    email: normalizedEmail,
    clientIp: params.clientIp,
    baseUrl: params.baseUrl,
    registeredUser: activeRegisteredUser
  });
}

/**
 * Verifies an opaque password reset link token before the user submits their new password.
 */
export function verifyPasswordResetLinkServer(params: {
  token: string;
}): {
  ok: boolean;
  status: 'valid' | 'invalid_token' | 'expired_token' | 'already_used';
  message: string;
  maskedEmail?: string;
} {
  return verifyPasswordResetToken({ token: params.token });
}

/**
 * Completes a password reset by consuming the single-use opaque token and updating the user's
 * salted scrypt password hash in both `.everykr-user-management.json` and `.everykr-otp-registrations.json`.
 * Preserves the user's existing `uid`, `role`, `registrationId`, and all profile data.
 */
export function completePasswordResetServer(params: {
  token: string;
  newPassword: string;
}): {
  ok: boolean;
  status:
    | 'password_updated'
    | 'invalid_token'
    | 'expired_token'
    | 'already_used'
    | 'weak_password'
    | 'user_not_found';
  message: string;
} {
  const consumed = consumePasswordResetTokenAndHashPassword({
    token: params.token,
    newPassword: params.newPassword
  });

  if (!consumed.ok || !consumed.passwordHash || !consumed.email) {
    return {
      ok: false,
      status: consumed.status,
      message: consumed.message
    };
  }

  const normalizedEmail = consumed.email.trim().toLowerCase();
  const store = loadStore();
  if (!store.passwordHashesByUid) {
    store.passwordHashesByUid = {};
  }

  const existingUser =
    (consumed.uid && store.usersByUid[consumed.uid]) ||
    Object.values(store.usersByUid).find(u => u.email.toLowerCase() === normalizedEmail);

  if (!existingUser || existingUser.accountStatus === 'suspended') {
    return {
      ok: false,
      status: 'user_not_found',
      message: 'This password reset link is invalid or the account is unavailable.'
    };
  }

  // Update the salted scrypt hash in the canonical user store under both uid and email
  // WITHOUT modifying uid, role, registrationId, or profile data.
  store.passwordHashesByUid[existingUser.uid] = consumed.passwordHash;
  store.passwordHashesByUid[normalizedEmail] = consumed.passwordHash;
  saveStore(store);

  recordLoginAttemptServer({
    uid: existingUser.uid,
    email: existingUser.email,
    userName: existingUser.fullName,
    provider: 'password',
    success: true,
    reason: 'Password reset completed via verified single-use opaque email token'
  });

  return {
    ok: true,
    status: 'password_updated',
    message: consumed.message
  };
}

export { NEUTRAL_PASSWORD_RESET_MESSAGE };

// ============================================================================
// PUBLIC DEVELOPER PROFILE & SECURE ADMIN SITE SETTINGS (PHASE 11)
// ============================================================================

/**
 * Returns ONLY the 5 approved sanitized public developer profile fields.
 * Never exposes admin UIDs, admin emails, audit logs, or internal settings.
 */
export function getPublicDeveloperProfileServer(): DeveloperProfileSettings {
  const store = loadStore();
  if (!store.developerProfileConfig || !store.developerProfileConfig.profile) {
    return { ...DEFAULT_DEVELOPER_PROFILE };
  }
  const sanitized = sanitizePublicDeveloperProfile(store.developerProfileConfig.profile);
  return {
    ...sanitized,
    ...(store.developerProfileConfig.updatedAt
      ? { updatedAt: store.developerProfileConfig.updatedAt }
      : {})
  };
}

/**
 * Returns the full Developer Profile configuration and admin audit metadata
 * strictly for server-verified administrators.
 */
export function getAdminDeveloperProfileOverviewServer(): {
  profile: DeveloperProfileSettings;
  defaults: DeveloperProfileSettings;
  metadata: {
    updatedAt: string | null;
    updatedByName: string | null;
    updatedByEmail: string | null;
    isCustomConfigured: boolean;
  };
} {
  const store = loadStore();
  const cfg = store.developerProfileConfig;
  const rawProfile = cfg?.profile
    ? sanitizePublicDeveloperProfile({
        ...cfg.profile,
        updatedAt: cfg.updatedAt || cfg.profile.updatedAt
      })
    : sanitizePublicDeveloperProfile(DEFAULT_DEVELOPER_PROFILE);
  const profile: DeveloperProfileSettings = {
    ...rawProfile,
    ...(cfg?.updatedAt ? { updatedAt: cfg.updatedAt } : {})
  };
  const { updatedAt: _u1, version: _v1, imageUpdatedAt: _i1, ...comparableProfile } = profile;
  const { updatedAt: _u2, version: _v2, imageUpdatedAt: _i2, ...comparableDefault } =
    sanitizePublicDeveloperProfile(DEFAULT_DEVELOPER_PROFILE);
  const matchesDefaults =
    JSON.stringify(comparableProfile) === JSON.stringify(comparableDefault);

  return {
    profile,
    defaults: sanitizePublicDeveloperProfile(DEFAULT_DEVELOPER_PROFILE),
    metadata: {
      updatedAt: cfg?.updatedAt || null,
      updatedByName: cfg?.updatedByName || null,
      updatedByEmail: cfg?.updatedByEmail || null,
      isCustomConfigured: Boolean(cfg && (!matchesDefaults || cfg.isCustomConfigured))
    }
  };
}

/**
 * Validates, sanitizes, and persists Developer Profile settings for a verified administrator,
 * recording an immutable admin audit log entry.
 * Protects existing custom profile photographs from accidental overwrite with the default studio portrait.
 */
export function updateDeveloperProfileServer(params: {
  input: Partial<DeveloperProfileSettings> & { explicitResetImage?: boolean };
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): {
  ok: boolean;
  errors?: Partial<Record<string, string>>;
  message: string;
  profile?: DeveloperProfileSettings;
  metadata?: {
    updatedAt: string;
    updatedByName: string;
    updatedByEmail: string;
    isCustomConfigured: boolean;
  };
  adminLog?: ServerAdminLogRecord;
} {
  const store = loadStore();
  const previousProfile = store.developerProfileConfig?.profile
    ? sanitizePublicDeveloperProfile(store.developerProfileConfig.profile)
    : sanitizePublicDeveloperProfile(DEFAULT_DEVELOPER_PROFILE);

  const hadCustomImage =
    Boolean(previousProfile.profileImageUrl) &&
    previousProfile.profileImageUrl !== DEFAULT_DEVELOPER_PROFILE.profileImageUrl;
  const incomingUrl =
    typeof params.input.profileImageUrl === 'string'
      ? params.input.profileImageUrl.trim()
      : '';
  const isIncomingDefault =
    !incomingUrl || incomingUrl === DEFAULT_DEVELOPER_PROFILE.profileImageUrl;
  const explicitResetImage = Boolean((params.input as any)?.explicitResetImage);

  // Protect existing custom image unless an explicit reset or a new custom image is provided
  const resolvedImageUrl =
    hadCustomImage && isIncomingDefault && !explicitResetImage
      ? previousProfile.profileImageUrl
      : incomingUrl || previousProfile.profileImageUrl;

  const resolvedImagePath =
    hadCustomImage && isIncomingDefault && !explicitResetImage
      ? previousProfile.profileImagePath
      : params.input.profileImagePath !== undefined && String(params.input.profileImagePath).trim()
      ? String(params.input.profileImagePath).trim()
      : previousProfile.profileImagePath;

  const resolvedFallbackDataUrl =
    explicitResetImage
      ? undefined
      : params.input.fallbackImageDataUrl &&
        String(params.input.fallbackImageDataUrl).startsWith('data:image/')
      ? params.input.fallbackImageDataUrl
      : resolvedImageUrl.startsWith('data:image/')
      ? resolvedImageUrl
      : previousProfile.fallbackImageDataUrl;

  const nowIso = new Date().toISOString();
  const nextVersion = (Number(previousProfile.version) || 0) + 1;
  const imageChanged = resolvedImageUrl !== previousProfile.profileImageUrl;
  const resolvedImageUpdatedAt =
    params.input.imageUpdatedAt ||
    (imageChanged ? nowIso : previousProfile.imageUpdatedAt || nowIso);

  const mergedInput: Partial<DeveloperProfileSettings> = {
    ...previousProfile,
    ...params.input,
    profileImageUrl: resolvedImageUrl,
    profileImagePath: resolvedImagePath,
    ...(resolvedFallbackDataUrl ? { fallbackImageDataUrl: resolvedFallbackDataUrl } : {}),
    imageUpdatedAt: resolvedImageUpdatedAt,
    updatedAt: nowIso,
    version: nextVersion
  };

  const validation = validateDeveloperProfilePayload(mergedInput);
  if (!validation.valid) {
    const firstError =
      Object.values(validation.errors).find(Boolean) ||
      'Please fix the highlighted validation errors before saving.';
    return {
      ok: false,
      errors: validation.errors,
      message: firstError
    };
  }

  const sanitized: DeveloperProfileSettings = {
    ...sanitizePublicDeveloperProfile(validation.sanitized),
    ...(resolvedFallbackDataUrl ? { fallbackImageDataUrl: resolvedFallbackDataUrl } : {}),
    imageUpdatedAt: resolvedImageUpdatedAt,
    updatedAt: nowIso,
    version: nextVersion
  };

  const { updatedAt: _u1, version: _v1, imageUpdatedAt: _i1, ...comparableSanitized } = sanitized;
  const { updatedAt: _u2, version: _v2, imageUpdatedAt: _i2, ...comparableDefault } =
    sanitizePublicDeveloperProfile(DEFAULT_DEVELOPER_PROFILE);
  const matchesDefaults =
    JSON.stringify(comparableSanitized) === JSON.stringify(comparableDefault);

  store.developerProfileConfig = {
    profile: sanitized,
    updatedAt: nowIso,
    updatedByUid: params.adminUid,
    updatedByName: params.adminName,
    updatedByEmail: params.adminEmail,
    isCustomConfigured: !matchesDefaults
  };
  saveStore(store);

  const configuredSocialCount = [
    sanitized.facebookUrl,
    sanitized.personalWebsiteUrl,
    sanitized.kakaoTalkId || sanitized.kakaoTalkUrl,
    sanitized.linkedinUrl,
    sanitized.instagramUrl,
    sanitized.githubUrl,
    sanitized.contactEmail
  ].filter(Boolean).length;

  const adminLog = recordAdminActionServer({
    adminUid: params.adminUid,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    action: 'DEVELOPER_PROFILE_UPDATE',
    details: `Updated public Developer Profile Showcase (Name: "${sanitized.name}", Role: "${sanitized.role}", ImagePath: "${sanitized.profileImagePath}", Layout: "${sanitized.displaySettings.layoutStyle}", PublicEnabled: ${sanitized.displaySettings.enablePublicDeveloperProfile}, ActiveLinks: ${configuredSocialCount}, Version: v${nextVersion}).`
  });

  return {
    ok: true,
    message: 'Developer profile settings saved and published.',
    profile: sanitized,
    metadata: {
      updatedAt: nowIso,
      updatedByName: params.adminName,
      updatedByEmail: params.adminEmail,
      isCustomConfigured: !matchesDefaults
    },
    adminLog
  };
}

/**
 * Synchronizes a verified Firestore `site_settings/developer_profile` document into the server cache
 * when Firestore has a newer `updatedAt` timestamp or custom image than the local server store.
 */
export function syncDeveloperProfileFromFirestoreServer(
  firestoreProfile: Partial<DeveloperProfileSettings>
): DeveloperProfileSettings {
  const store = loadStore();
  const currentCfg = store.developerProfileConfig;
  const currentUpdatedAt = currentCfg?.updatedAt || '';
  const incomingUpdatedAt =
    typeof firestoreProfile.updatedAt === 'string' ? firestoreProfile.updatedAt : '';

  const sanitizedIncoming = sanitizePublicDeveloperProfile(firestoreProfile);
  const incomingHasCustomImage =
    Boolean(sanitizedIncoming.profileImageUrl) &&
    sanitizedIncoming.profileImageUrl !== DEFAULT_DEVELOPER_PROFILE.profileImageUrl;
  const currentHasCustomImage =
    Boolean(currentCfg?.profile?.profileImageUrl) &&
    currentCfg?.profile?.profileImageUrl !== DEFAULT_DEVELOPER_PROFILE.profileImageUrl;

  const shouldAcceptIncoming =
    !currentCfg ||
    !currentCfg.isCustomConfigured ||
    (incomingHasCustomImage && !currentHasCustomImage) ||
    (incomingUpdatedAt && (!currentUpdatedAt || incomingUpdatedAt > currentUpdatedAt));

  if (shouldAcceptIncoming) {
    const resolvedUpdatedAt = incomingUpdatedAt || new Date().toISOString();
    const mergedProfile: DeveloperProfileSettings = {
      ...sanitizedIncoming,
      ...(firestoreProfile.fallbackImageDataUrl
        ? { fallbackImageDataUrl: firestoreProfile.fallbackImageDataUrl }
        : {}),
      updatedAt: resolvedUpdatedAt
    };
    store.developerProfileConfig = {
      profile: mergedProfile,
      updatedAt: resolvedUpdatedAt,
      updatedByUid: currentCfg?.updatedByUid || 'firestore_sync',
      updatedByName: currentCfg?.updatedByName || 'Administrator',
      updatedByEmail: currentCfg?.updatedByEmail || 'admin@everykr.com',
      isCustomConfigured: true
    };
    saveStore(store);
    return mergedProfile;
  }

  return getPublicDeveloperProfileServer();
}

/**
 * Restores the original default Developer Profile values for a verified administrator.
 */
export function resetDeveloperProfileServer(params: {
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): {
  ok: boolean;
  message: string;
  profile: DeveloperProfileSettings;
  metadata: {
    updatedAt: string;
    updatedByName: string;
    updatedByEmail: string;
    isCustomConfigured: boolean;
  };
  adminLog: ServerAdminLogRecord;
} {
  const nowIso = new Date().toISOString();
  const restored: DeveloperProfileSettings = {
    ...DEFAULT_DEVELOPER_PROFILE,
    updatedAt: nowIso,
    imageUpdatedAt: nowIso,
    version: 1
  };
  const store = loadStore();
  store.developerProfileConfig = {
    profile: restored,
    updatedAt: nowIso,
    updatedByUid: params.adminUid,
    updatedByName: params.adminName,
    updatedByEmail: params.adminEmail,
    isCustomConfigured: false
  };
  saveStore(store);

  const adminLog = recordAdminActionServer({
    adminUid: params.adminUid,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    action: 'DEVELOPER_PROFILE_RESET',
    details: 'Restored public Developer Profile settings to original EVERYKR defaults.'
  });

  return {
    ok: true,
    message: 'Original default developer profile values restored.',
    profile: restored,
    metadata: {
      updatedAt: nowIso,
      updatedByName: params.adminName,
      updatedByEmail: params.adminEmail,
      isCustomConfigured: false
    },
    adminLog
  };
}

// ============================================================================
// INTERNAL EMPLOYEE & ADMIN PORTAL + GLOBAL TRASH / RECYCLE BIN (SYSTEM B & C)
// ============================================================================

const INTERNAL_PORTAL_STORE_FILE = path.resolve(
  process.cwd(),
  '.everykr-internal-portal-store.json'
);

interface PersistedInternalPortalStore {
  internalRequestsById: Record<string, InternalAccessRequestRecord>;
  internalPasswordHashesByEmail: Record<string, string>;
  staffMembersById: Record<string, StaffMemberRecord>;
  globalTrashById: Record<string, GlobalTrashItem>;
  permanentlyDeletedEmails: string[];
}

export const INTERNAL_ROLE_DEFAULT_PERMISSIONS: Record<StaffRoleType, StaffPermissionKey[]> = {
  'Super Admin': [
    'manage_students',
    'view_passport_numbers',
    'manage_applications',
    'verify_documents',
    'manage_universities',
    'manage_programs',
    'manage_sim_applications',
    'manage_arrival_groups',
    'manage_community',
    'manage_staff',
    'manage_cms',
    'export_reports',
    'manage_settings',
    'view_audit_logs'
  ],
  Admin: [
    'manage_students',
    'view_passport_numbers',
    'manage_applications',
    'verify_documents',
    'manage_universities',
    'manage_programs',
    'manage_sim_applications',
    'manage_arrival_groups',
    'manage_community',
    'manage_cms',
    'export_reports',
    'view_audit_logs'
  ],
  Employee: [
    'manage_students',
    'manage_applications',
    'manage_sim_applications'
  ],
  'Admission Manager': [
    'manage_students',
    'manage_applications',
    'verify_documents',
    'manage_universities',
    'manage_programs',
    'export_reports'
  ],
  'Student Counselor': [
    'manage_students',
    'manage_applications',
    'manage_universities',
    'manage_programs'
  ],
  'Document Verification Staff': [
    'manage_students',
    'view_passport_numbers',
    'verify_documents',
    'manage_sim_applications'
  ],
  'SIM Manager': [
    'manage_students',
    'view_passport_numbers',
    'verify_documents',
    'manage_sim_applications',
    'manage_arrival_groups',
    'export_reports'
  ],
  'SIM Application Manager': [
    'manage_students',
    'view_passport_numbers',
    'verify_documents',
    'manage_sim_applications',
    'manage_arrival_groups',
    'export_reports'
  ],
  'Content Manager': [
    'manage_cms',
    'manage_universities',
    'manage_programs',
    'export_reports'
  ],
  'Community Moderator': [
    'manage_community',
    'manage_students',
    'view_audit_logs'
  ],
  'Support Staff': [
    'manage_students',
    'manage_sim_applications',
    'manage_cms'
  ],
  'Regular User': []
};

const SEED_INTERNAL_REQUESTS: InternalAccessRequestRecord[] = [
  {
    id: 'ireq_seed_counselor_01',
    uid: 'uid_internal_soyeon_park',
    fullName: 'Soyeon Park',
    email: 'soyeon.park@everykr.com',
    phoneNumber: '+82-10-4921-8830',
    whatsappNumber: '+82-10-4921-8830',
    country: 'South Korea',
    department: 'University Admissions & Counseling',
    requestedPosition: 'Student Counselor',
    employeeId: 'EKR-EMP-104',
    additionalInfo: '5 years experience advising D-2 and D-4 applicants at Yonsei & Korea University.',
    photoURL: '',
    role: 'employee',
    accountType: 'internal_employee',
    portalAccess: 'internal',
    approvalStatus: 'pending',
    assignedDepartment: null,
    assignedRole: null,
    permissions: [],
    isActive: false,
    approvedBy: null,
    approvedAt: null,
    createdAt: '2026-11-12T08:30:00.000Z',
    updatedAt: '2026-11-12T08:30:00.000Z'
  },
  {
    id: 'ireq_seed_sim_02',
    uid: 'uid_internal_jihoon_choi',
    fullName: 'Jihoon Choi',
    email: 'jihoon.choi@everykr.com',
    phoneNumber: '+82-10-7741-2090',
    whatsappNumber: '+82-10-7741-2090',
    country: 'South Korea',
    department: 'SIM & Airport Arrival Operations',
    requestedPosition: 'SIM Manager',
    employeeId: 'EKR-EMP-108',
    additionalInfo: 'Coordinates Incheon T1/T2 and Gimhae Airport KT/SKT SIM pickup counters.',
    photoURL: '',
    role: 'employee',
    accountType: 'internal_employee',
    portalAccess: 'internal',
    approvalStatus: 'approved',
    assignedDepartment: 'SIM & Airport Arrival Operations',
    assignedRole: 'SIM Manager',
    permissions: INTERNAL_ROLE_DEFAULT_PERMISSIONS['SIM Manager'],
    isActive: true,
    approvedBy: 'admin@everykr.com',
    approvedByName: 'EVERYKR System Admin',
    approvedAt: '2026-11-10T10:00:00.000Z',
    createdAt: '2026-11-09T09:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z'
  }
];

let internalPortalCache: PersistedInternalPortalStore | null = null;

function loadInternalPortalStore(): PersistedInternalPortalStore {
  if (internalPortalCache) return internalPortalCache;
  try {
    if (fs.existsSync(INTERNAL_PORTAL_STORE_FILE)) {
      const raw = fs.readFileSync(INTERNAL_PORTAL_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedInternalPortalStore>;
      if (parsed && typeof parsed === 'object') {
        const internalRequestsById = parsed.internalRequestsById || {};
        for (const seed of SEED_INTERNAL_REQUESTS) {
          if (!internalRequestsById[seed.id]) {
            internalRequestsById[seed.id] = seed;
          }
        }
        internalPortalCache = {
          internalRequestsById,
          internalPasswordHashesByEmail: parsed.internalPasswordHashesByEmail || {},
          staffMembersById: parsed.staffMembersById || {},
          globalTrashById: parsed.globalTrashById || {},
          permanentlyDeletedEmails: Array.isArray(parsed.permanentlyDeletedEmails)
            ? parsed.permanentlyDeletedEmails
            : []
        };
        return internalPortalCache;
      }
    }
  } catch (err) {
    console.warn('Could not read internal portal store, initializing default:', err);
  }

  const internalRequestsById: Record<string, InternalAccessRequestRecord> = {};
  for (const seed of SEED_INTERNAL_REQUESTS) {
    internalRequestsById[seed.id] = seed;
  }

  internalPortalCache = {
    internalRequestsById,
    internalPasswordHashesByEmail: {},
    staffMembersById: {},
    globalTrashById: {},
    permanentlyDeletedEmails: []
  };
  saveInternalPortalStore(internalPortalCache);
  return internalPortalCache;
}

function saveInternalPortalStore(store: PersistedInternalPortalStore): void {
  internalPortalCache = store;
  try {
    fs.writeFileSync(INTERNAL_PORTAL_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save internal portal store:', err);
  }
}

/**
 * Checks whether an email matches the protected Primary Super Admin identity (`mzhmd924@gmail.com`).
 * Used ONLY for demotion/deletion protection — NEVER grants authorization without verified claims.
 */
export function isSuperAdminEmailServer(email?: string | null): boolean {
  const normalized = String(email || '').trim().toLowerCase();
  return normalized === PRIMARY_SUPER_ADMIN_EMAIL;
}

/**
 * Registers a new Internal Employee access application on `internal.everykr.com/register`.
 * Strictly sets `approvalStatus = "pending"`, `isActive = false`, `assignedRole = null`.
 * Never grants immediate internal or admin access.
 */
export function registerInternalEmployeeServer(params: {
  fullName: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
  country: string;
  department: string;
  requestedPosition: StaffRoleType;
  employeeId?: string;
  password: string;
  additionalInfo?: string;
  photoURL?: string;
  uid?: string;
}): {
  ok: boolean;
  httpStatus: number;
  message: string;
  requestRecord?: InternalAccessRequestRecord;
  code?: string;
} {
  const fullName = String(params.fullName || '').trim();
  const normalizedEmail = String(params.email || '').trim().toLowerCase();
  const phoneNumber = String(params.phoneNumber || '').trim();
  const whatsappNumber = String(params.whatsappNumber || '').trim();
  const country = String(params.country || '').trim();
  const department = String(params.department || '').trim();
  const requestedPosition = (params.requestedPosition || 'Employee') as StaffRoleType;
  const employeeId = params.employeeId ? String(params.employeeId).trim() : '';
  const password = String(params.password || '');
  const additionalInfo = params.additionalInfo ? String(params.additionalInfo).trim() : '';
  const photoURL = params.photoURL ? String(params.photoURL).trim() : '';

  if (!fullName || fullName.length < 2) {
    return { ok: false, httpStatus: 400, message: 'Full name is required.', code: 'invalid_name' };
  }
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, httpStatus: 400, message: 'A valid work or personal email address is required.', code: 'invalid_email' };
  }
  if (!phoneNumber) {
    return { ok: false, httpStatus: 400, message: 'Phone number is required.', code: 'invalid_phone' };
  }
  if (!whatsappNumber) {
    return { ok: false, httpStatus: 400, message: 'WhatsApp number is required.', code: 'invalid_whatsapp' };
  }
  if (!country) {
    return { ok: false, httpStatus: 400, message: 'Country is required.', code: 'invalid_country' };
  }
  if (!department) {
    return { ok: false, httpStatus: 400, message: 'Department selection is required.', code: 'invalid_department' };
  }
  if (password.length < 8) {
    return { ok: false, httpStatus: 400, message: 'Password must be at least 8 characters long.', code: 'weak_password' };
  }

  if (isSuperAdminEmailServer(normalizedEmail)) {
    return {
      ok: false,
      httpStatus: 409,
      message: 'This email belongs to a Super Administrator account and already has universal access. Please sign in directly.',
      code: 'already_super_admin'
    };
  }

  const pStore = loadInternalPortalStore();
  const existingReq = Object.values(pStore.internalRequestsById).find(
    r => r.email.toLowerCase() === normalizedEmail
  );
  if (existingReq && existingReq.approvalStatus === 'approved' && existingReq.isActive) {
    return {
      ok: false,
      httpStatus: 409,
      message: 'An active internal employee account already exists for this email. Please sign in on the Internal Portal.',
      code: 'already_approved'
    };
  }

  const nowIso = new Date().toISOString();
  const id = existingReq?.id || `ireq_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const uid =
    params.uid?.trim() ||
    existingReq?.uid ||
    `uid_internal_${crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 12)}`;

  const pwHash = hashPasswordScrypt(password);
  pStore.internalPasswordHashesByEmail[normalizedEmail] = pwHash;

  const record: InternalAccessRequestRecord = {
    id,
    uid,
    fullName,
    email: normalizedEmail,
    phoneNumber,
    whatsappNumber,
    country,
    department,
    requestedPosition,
    ...(employeeId ? { employeeId } : {}),
    ...(additionalInfo ? { additionalInfo } : {}),
    ...(photoURL ? { photoURL } : {}),
    role: 'employee',
    accountType: 'internal_employee',
    portalAccess: 'internal',
    approvalStatus: 'pending',
    assignedDepartment: null,
    assignedRole: null,
    permissions: [],
    isActive: false,
    approvedBy: null,
    approvedAt: null,
    createdAt: existingReq?.createdAt || nowIso,
    updatedAt: nowIso
  };

  pStore.internalRequestsById[id] = record;
  saveInternalPortalStore(pStore);

  recordAdminActionServer({
    adminUid: uid,
    adminName: fullName,
    adminEmail: normalizedEmail,
    action: 'INTERNAL_EMPLOYEE_REGISTRATION_SUBMITTED',
    targetUid: uid,
    targetEmail: normalizedEmail,
    details: `Submitted Internal Employee access request for ${fullName} (${normalizedEmail}) — Requested Department: "${department}", Position: "${requestedPosition}". Status set to pending approval.`
  });

  return {
    ok: true,
    httpStatus: 201,
    message:
      'Your employee registration has been submitted. Your account is currently pending administrator approval. You will be able to access the EveryKR Internal Portal once an administrator approves your request.',
    requestRecord: record
  };
}

/**
 * Lists all Internal Access Requests for the Admin Panel (`Internal Access Requests` tab).
 */
export function listInternalAccessRequestsServer(): InternalAccessRequestRecord[] {
  const pStore = loadInternalPortalStore();
  return Object.values(pStore.internalRequestsById).sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  );
}

/**
 * Authenticates an employee or administrator on `internal.everykr.com` / `/internal/login`.
 * Strictly blocks:
 *  - Regular Student / Visitor accounts (`status: 'student_denied'`, HTTP 403)
 *  - Pending Employee accounts (`status: 'pending_approval'`, HTTP 403)
 *  - Rejected Employee accounts (`status: 'rejected'`, HTTP 403)
 *  - Deactivated / Revoked Employee accounts (`status: 'deactivated'`, HTTP 403)
 * Allows:
 *  - Bootstrapped Super Admin (`admin@everykr.com`, `mzhmd924@gmail.com`)
 *  - Approved & Active Internal Employees (`approvalStatus === 'approved' && isActive === true`)
 */
export function authenticateInternalPortalServer(params: {
  email: string;
  password?: string;
  uid?: string;
  verifiedByFirebaseToken?: boolean;
}): {
  ok: boolean;
  httpStatus: number;
  status:
    | 'approved'
    | 'pending_approval'
    | 'rejected'
    | 'info_requested'
    | 'deactivated'
    | 'student_denied'
    | 'invalid_credentials';
  message: string;
  employee?: InternalAccessRequestRecord;
  sessionToken?: string;
  isSuperAdmin?: boolean;
} {
  const normalizedEmail = String(params.email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      ok: false,
      httpStatus: 400,
      status: 'invalid_credentials',
      message: 'Email address is required.'
    };
  }

  const pStore = loadInternalPortalStore();
  const uStore = loadStore();

  // 1. Check if Super Admin
  if (isSuperAdminEmailServer(normalizedEmail)) {
    if (!params.verifiedByFirebaseToken && params.password !== undefined) {
      const storedAdminUser = Object.values(uStore.usersByUid).find(
        u => u.email.toLowerCase() === normalizedEmail
      );
      const storedHash =
        (storedAdminUser && uStore.passwordHashesByUid?.[storedAdminUser.uid]) ||
        uStore.passwordHashesByUid?.[normalizedEmail] ||
        pStore.internalPasswordHashesByEmail[normalizedEmail] ||
        getVerifiedPasswordHashForEmail(normalizedEmail);

      if (storedHash && !verifyPasswordScrypt(params.password, storedHash)) {
        return {
          ok: false,
          httpStatus: 401,
          status: 'invalid_credentials',
          message: 'Incorrect email or password.'
        };
      }
    }

    const adminUser =
      Object.values(uStore.usersByUid).find(u => u.email.toLowerCase() === normalizedEmail) ||
      INITIAL_SEED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);

    const uid = adminUser?.uid || params.uid || 'uid_everykr_system_admin06';
    const fullName = adminUser?.fullName || 'EVERYKR Super Admin';
    const nowIso = new Date().toISOString();

    const superAdminEmployee: InternalAccessRequestRecord = {
      id: 'ireq_super_admin',
      uid,
      fullName,
      email: normalizedEmail,
      phoneNumber: adminUser?.phoneNumber || '+82-2-1345-0000',
      whatsappNumber: adminUser?.phoneNumber || '+82-2-1345-0000',
      country: 'South Korea',
      department: 'Executive & Platform Governance',
      requestedPosition: 'Super Admin',
      employeeId: 'EKR-ADM-001',
      role: 'super_admin',
      accountType: 'internal_employee',
      portalAccess: 'internal',
      approvalStatus: 'approved',
      assignedDepartment: 'Executive & Platform Governance',
      assignedRole: 'Super Admin',
      permissions: INTERNAL_ROLE_DEFAULT_PERMISSIONS['Super Admin'],
      isActive: true,
      approvedBy: 'system',
      approvedAt: '2026-10-01T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: nowIso
    };

    const sessionToken = issueServerSessionToken({
      uid,
      email: normalizedEmail,
      role: 'admin'
    });

    return {
      ok: true,
      httpStatus: 200,
      status: 'approved',
      message: 'Authenticated as Super Administrator.',
      employee: superAdminEmployee,
      sessionToken,
      isSuperAdmin: true
    };
  }

  // 2. Look up Internal Employee Request Record
  const internalReq = Object.values(pStore.internalRequestsById).find(
    r => r.email.toLowerCase() === normalizedEmail
  );

  // If no internal employee record exists, check if it's a student/external user
  if (!internalReq) {
    const existingStudentOrUser = Object.values(uStore.usersByUid).find(
      u => u.email.toLowerCase() === normalizedEmail
    );
    if (existingStudentOrUser && existingStudentOrUser.role !== 'admin') {
      return {
        ok: false,
        httpStatus: 403,
        status: 'student_denied',
        message:
          'Access Denied: Student and external user accounts are strictly prohibited from accessing the EveryKR Internal Employee & Admin Portal (internal.everykr.com). Please use https://everykr.com for student services.'
      };
    }

    return {
      ok: false,
      httpStatus: 401,
      status: 'invalid_credentials',
      message:
        'No EveryKR Internal Employee account found for this email address. If you are a new staff member, please submit an Internal Employee Registration first.'
    };
  }

  // Verify password when logging in with email + password
  if (!params.verifiedByFirebaseToken) {
    const savedHash =
      pStore.internalPasswordHashesByEmail[normalizedEmail] ||
      uStore.passwordHashesByUid?.[internalReq.uid] ||
      uStore.passwordHashesByUid?.[normalizedEmail] ||
      getVerifiedPasswordHashForEmail(normalizedEmail);

    if (savedHash) {
      if (!params.password || !verifyPasswordScrypt(params.password, savedHash)) {
        return {
          ok: false,
          httpStatus: 401,
          status: 'invalid_credentials',
          message: 'Incorrect email or password.'
        };
      }
    }
  }

  // 3. Enforce Approval & Active Status Rules
  if (internalReq.approvalStatus === 'pending' || internalReq.approvalStatus === 'info_requested') {
    return {
      ok: false,
      httpStatus: 403,
      status: internalReq.approvalStatus === 'info_requested' ? 'info_requested' : 'pending_approval',
      message:
        internalReq.approvalStatus === 'info_requested'
          ? `Additional information has been requested by an administrator: "${
              internalReq.infoRequestMessage || 'Please contact support@everykr.com to verify your employment details.'
            }"`
          : 'Your employee registration has been submitted. Your account is currently pending administrator approval. You will be able to access the EveryKR Internal Portal once an administrator approves your request.',
      employee: internalReq
    };
  }

  if (internalReq.approvalStatus === 'rejected') {
    return {
      ok: false,
      httpStatus: 403,
      status: 'rejected',
      message:
        'Your EveryKR Internal Portal access request was not approved. If you believe this is an error, please contact your department supervisor or support@everykr.com.',
      employee: {
        ...internalReq,
        rejectionReason: undefined
      }
    };
  }

  if (internalReq.approvalStatus === 'deactivated' || !internalReq.isActive) {
    return {
      ok: false,
      httpStatus: 403,
      status: 'deactivated',
      message:
        'Your EveryKR Internal Employee account has been deactivated by an administrator. Internal portal access is revoked.',
      employee: internalReq
    };
  }

  const assignedRole: StaffRoleType =
    internalReq.assignedRole || internalReq.requestedPosition || 'Employee';
  const permissions: StaffPermissionKey[] =
    Array.isArray(internalReq.permissions) && internalReq.permissions.length > 0
      ? internalReq.permissions
      : INTERNAL_ROLE_DEFAULT_PERMISSIONS[assignedRole] || INTERNAL_ROLE_DEFAULT_PERMISSIONS.Employee;

  const updatedReq: InternalAccessRequestRecord = {
    ...internalReq,
    assignedRole,
    permissions
  };

  // Issue session token (granting admin token if assignedRole is Super Admin or Admin)
  const tokenRole: ManagedUserRole =
    assignedRole === 'Super Admin' || assignedRole === 'Admin' ? 'admin' : 'general';
  const sessionToken = issueServerSessionToken({
    uid: internalReq.uid,
    email: internalReq.email,
    role: tokenRole
  });

  recordLoginAttemptServer({
    uid: internalReq.uid,
    email: internalReq.email,
    userName: internalReq.fullName,
    provider: 'password',
    success: true,
    reason: `Internal Portal login verified (${assignedRole})`
  });

  return {
    ok: true,
    httpStatus: 200,
    status: 'approved',
    message: 'Internal Portal login successful.',
    employee: updatedReq,
    sessionToken,
    isSuperAdmin: assignedRole === 'Super Admin'
  };
}

/**
 * Verifies an active Internal Portal session from a Bearer/session token or email.
 */
export function verifyInternalPortalSessionServer(params: {
  sessionToken?: string;
  email?: string;
}): {
  ok: boolean;
  httpStatus: number;
  status: string;
  employee?: InternalAccessRequestRecord;
  isSuperAdmin?: boolean;
  message?: string;
} {
  let resolvedEmail = (params.email || '').trim().toLowerCase();
  let resolvedUid = '';

  if (params.sessionToken) {
    const verified = verifyServerSessionToken(params.sessionToken);
    if (verified.valid && verified.email) {
      resolvedEmail = verified.email.toLowerCase();
      resolvedUid = verified.uid || '';
    }
  }

  if (!resolvedEmail) {
    return {
      ok: false,
      httpStatus: 401,
      status: 'unauthenticated',
      message: 'No active internal portal session.'
    };
  }

  const authCheck = authenticateInternalPortalServer({
    email: resolvedEmail,
    uid: resolvedUid,
    verifiedByFirebaseToken: true
  });

  return {
    ok: authCheck.ok,
    httpStatus: authCheck.httpStatus,
    status: authCheck.status,
    employee: authCheck.employee,
    isSuperAdmin: authCheck.isSuperAdmin,
    message: authCheck.message
  };
}

/**
 * Admin review & decision handler for an Internal Access Request:
 * Supports: 'approve', 'reject', 'info_requested', 'deactivate', 'reactivate'.
 * Automatically dispatches the official approval or rejection email via Resend.
 */
export async function reviewInternalAccessRequestServer(params: {
  requestId: string;
  decision: 'approve' | 'reject' | 'info_requested' | 'deactivate' | 'reactivate';
  assignedDepartment?: string;
  assignedRole?: StaffRoleType;
  employeeId?: string;
  permissions?: StaffPermissionKey[];
  rejectionReason?: string;
  infoRequestMessage?: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): Promise<{
  ok: boolean;
  httpStatus: number;
  message: string;
  requestRecord?: InternalAccessRequestRecord;
  staffMember?: StaffMemberRecord;
  emailDispatched?: boolean;
  emailSubject?: string;
}> {
  const pStore = loadInternalPortalStore();
  const existing = pStore.internalRequestsById[params.requestId];
  if (!existing) {
    return {
      ok: false,
      httpStatus: 404,
      message: 'Internal employee access request not found.'
    };
  }

  // Protect Super Admin accounts from deactivation or rejection
  if (
    isSuperAdminEmailServer(existing.email) &&
    (params.decision === 'reject' || params.decision === 'deactivate')
  ) {
    return {
      ok: false,
      httpStatus: 403,
      message: 'Protected Super Administrator accounts cannot be rejected or deactivated.'
    };
  }

  const nowIso = new Date().toISOString();
  let updated: InternalAccessRequestRecord = { ...existing, updatedAt: nowIso };
  let emailDispatched = false;
  let emailSubject: string | undefined;
  let staffMember: StaffMemberRecord | undefined;

  if (params.decision === 'approve' || params.decision === 'reactivate') {
    const resolvedDept =
      (params.assignedDepartment || existing.assignedDepartment || existing.department || 'Operations').trim();
    const resolvedRole: StaffRoleType =
      params.assignedRole || existing.assignedRole || existing.requestedPosition || 'Employee';
    const resolvedPermissions: StaffPermissionKey[] =
      Array.isArray(params.permissions) && params.permissions.length > 0
        ? params.permissions
        : INTERNAL_ROLE_DEFAULT_PERMISSIONS[resolvedRole] || INTERNAL_ROLE_DEFAULT_PERMISSIONS.Employee;
    const resolvedEmployeeId =
      (params.employeeId || existing.employeeId || `EKR-EMP-${Math.floor(100 + Math.random() * 900)}`).trim();

    updated = {
      ...existing,
      approvalStatus: 'approved',
      isActive: true,
      role:
        resolvedRole === 'Super Admin'
          ? 'super_admin'
          : resolvedRole === 'Admin'
          ? 'admin'
          : 'employee',
      accountType: 'internal_employee',
      portalAccess: 'internal',
      assignedDepartment: resolvedDept,
      assignedRole: resolvedRole,
      employeeId: resolvedEmployeeId,
      permissions: resolvedPermissions,
      approvedBy: params.adminEmail,
      approvedByName: params.adminName,
      approvedAt: nowIso,
      updatedAt: nowIso
    };

    staffMember = {
      id: `staff_${existing.uid}`,
      uid: existing.uid,
      fullName: existing.fullName,
      email: existing.email,
      phoneNumber: existing.phoneNumber,
      whatsappNumber: existing.whatsappNumber,
      country: existing.country,
      department: resolvedDept,
      employeeId: resolvedEmployeeId,
      staffRole: resolvedRole,
      permissions: resolvedPermissions,
      status: 'active',
      approvalStatus: 'approved',
      portalAccess: 'internal',
      isActive: true,
      approvedBy: params.adminEmail,
      approvedAt: nowIso,
      createdAt: existing.createdAt,
      updatedAt: nowIso
    };
    pStore.staffMembersById[staffMember.id] = staffMember;

    // Send official approval email via Resend infrastructure
    try {
      const emailRes = await sendInternalEmployeeDecisionEmailServer({
        decision: 'approved',
        employeeEmail: updated.email,
        employeeName: updated.fullName,
        assignedDepartment: resolvedDept,
        assignedPosition: resolvedRole,
        employeeId: resolvedEmployeeId,
        adminEmail: params.adminEmail
      });
      emailDispatched = emailRes.delivered;
      emailSubject = 'Your EveryKR Internal Account Has Been Approved';
    } catch (err) {
      console.warn('[Internal Portal Approval Email] Warning:', err);
    }

    recordAdminActionServer({
      adminUid: params.adminUid,
      adminName: params.adminName,
      adminEmail: params.adminEmail,
      action: 'INTERNAL_EMPLOYEE_APPROVED',
      targetUid: updated.uid,
      targetEmail: updated.email,
      details: `Approved Internal Employee "${updated.fullName}" (${updated.email}) — Assigned Department: "${resolvedDept}", Assigned Role: "${resolvedRole}". Official approval email dispatched (${emailDispatched}).`
    });
  } else if (params.decision === 'reject') {
    updated = {
      ...existing,
      approvalStatus: 'rejected',
      isActive: false,
      assignedRole: null,
      rejectionReason: params.rejectionReason ? String(params.rejectionReason).trim() : 'Not approved',
      rejectedBy: params.adminEmail,
      rejectedAt: nowIso,
      updatedAt: nowIso
    };

    const existingStaffId = `staff_${existing.uid}`;
    if (pStore.staffMembersById[existingStaffId]) {
      pStore.staffMembersById[existingStaffId] = {
        ...pStore.staffMembersById[existingStaffId],
        status: 'revoked',
        isActive: false,
        approvalStatus: 'rejected',
        updatedAt: nowIso
      };
    }

    try {
      const emailRes = await sendInternalEmployeeDecisionEmailServer({
        decision: 'rejected',
        employeeEmail: updated.email,
        employeeName: updated.fullName,
        adminEmail: params.adminEmail
      });
      emailDispatched = emailRes.delivered;
      emailSubject = 'Update Regarding Your EveryKR Internal Portal Application';
    } catch (err) {
      console.warn('[Internal Portal Rejection Email] Warning:', err);
    }

    recordAdminActionServer({
      adminUid: params.adminUid,
      adminName: params.adminName,
      adminEmail: params.adminEmail,
      action: 'INTERNAL_EMPLOYEE_REJECTED',
      targetUid: updated.uid,
      targetEmail: updated.email,
      details: `Rejected Internal Employee request for "${updated.fullName}" (${updated.email}). Polite notification email dispatched.`
    });
  } else if (params.decision === 'info_requested') {
    const infoMsg =
      (params.infoRequestMessage || 'Please provide additional verification of your role and department.').trim();
    updated = {
      ...existing,
      approvalStatus: 'info_requested',
      isActive: false,
      infoRequestMessage: infoMsg,
      updatedAt: nowIso
    };

    recordAdminActionServer({
      adminUid: params.adminUid,
      adminName: params.adminName,
      adminEmail: params.adminEmail,
      action: 'INTERNAL_EMPLOYEE_INFO_REQUESTED',
      targetUid: updated.uid,
      targetEmail: updated.email,
      details: `Requested additional information from Internal Employee applicant "${updated.fullName}" (${updated.email}): "${infoMsg}".`
    });
  } else if (params.decision === 'deactivate') {
    updated = {
      ...existing,
      approvalStatus: 'deactivated',
      isActive: false,
      updatedAt: nowIso
    };

    const existingStaffId = `staff_${existing.uid}`;
    if (pStore.staffMembersById[existingStaffId]) {
      pStore.staffMembersById[existingStaffId] = {
        ...pStore.staffMembersById[existingStaffId],
        status: 'suspended',
        isActive: false,
        approvalStatus: 'deactivated',
        updatedAt: nowIso
      };
    }

    recordAdminActionServer({
      adminUid: params.adminUid,
      adminName: params.adminName,
      adminEmail: params.adminEmail,
      action: 'INTERNAL_EMPLOYEE_DEACTIVATED',
      targetUid: updated.uid,
      targetEmail: updated.email,
      details: `Deactivated Internal Employee account "${updated.fullName}" (${updated.email}) and revoked internal portal access.`
    });
  }

  pStore.internalRequestsById[params.requestId] = updated;
  saveInternalPortalStore(pStore);

  return {
    ok: true,
    httpStatus: 200,
    message:
      params.decision === 'approve' || params.decision === 'reactivate'
        ? `Approved ${updated.fullName} as ${updated.assignedRole} (${updated.assignedDepartment}).`
        : params.decision === 'reject'
        ? `Rejected internal access application for ${updated.fullName}.`
        : params.decision === 'info_requested'
        ? `Requested additional information from ${updated.fullName}.`
        : `Deactivated internal portal access for ${updated.fullName}.`,
    requestRecord: updated,
    staffMember,
    emailDispatched,
    emailSubject
  };
}

// ============================================================================
// GLOBAL TRASH / RECYCLE BIN SERVER OPERATIONS
// ============================================================================

export function listGlobalTrashServer(): {
  items: GlobalTrashItem[];
  countsByType: Record<string, number>;
  totalInTrash: number;
} {
  const pStore = loadInternalPortalStore();
  const items = Object.values(pStore.globalTrashById)
    .filter(item => (item.TrashStatus || item.trashStatus) === 'in_trash')
    .sort((a, b) =>
      String(b.DeletedAt || b.deletedAt || '').localeCompare(String(a.DeletedAt || a.deletedAt || ''))
    );

  const countsByType: Record<string, number> = {};
  for (const item of items) {
    const rt = item.RecordType || item.recordType;
    countsByType[rt] = (countsByType[rt] || 0) + 1;
  }

  return {
    items,
    countsByType,
    totalInTrash: items.length
  };
}

export function moveToGlobalTrashServer(params: {
  recordType: GlobalTrashRecordType;
  originalCollection: string;
  originalDocumentId: string;
  title: string;
  subtitle?: string;
  originalData: Record<string, any>;
  storageFiles?: string[];
  deletionReason?: string;
  deletedByUid: string;
  deletedByName: string;
  deletedByEmail: string;
}): { ok: boolean; trashItem?: GlobalTrashItem; error?: string } {
  const pStore = loadInternalPortalStore();
  const now = new Date();
  const retentionDays = params.recordType === 'sim_application' ? 90 : 30;
  const expiry = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  const trashId = `trash_${params.recordType}_${params.originalDocumentId}_${Date.now()}`;
  const nowIso = now.toISOString();
  const expiryIso = expiry.toISOString();
  const resolvedTitle = params.title || params.originalDocumentId;
  const resolvedSubtitle = params.subtitle || '';
  const resolvedReason = params.deletionReason || 'Moved to Global Trash by Administrator';
  const requiresRevalidation =
    params.recordType === 'user' ||
    params.recordType === 'employee' ||
    params.recordType === 'admin_profile';

  const trashItem: GlobalTrashItem = {
    id: trashId,
    TrashID: trashId,
    originalId: params.originalDocumentId,
    originalDocId: params.originalDocumentId,
    OriginalDocumentID: params.originalDocumentId,
    recordType: params.recordType,
    RecordType: params.recordType,
    recordName: resolvedTitle,
    recordTitle: resolvedTitle,
    Title: resolvedTitle,
    recordSubtitle: resolvedSubtitle,
    Subtitle: resolvedSubtitle,
    originalCollection: params.originalCollection,
    OriginalCollection: params.originalCollection,
    originalData: params.originalData || {},
    OriginalData: params.originalData || {},
    StorageFiles: Array.isArray(params.storageFiles) ? params.storageFiles : [],
    deletedBy: params.deletedByEmail,
    deletedByUid: params.deletedByUid,
    DeletedByUID: params.deletedByUid,
    deletedByName: params.deletedByName,
    DeletedByName: params.deletedByName,
    deletedByEmail: params.deletedByEmail,
    DeletedByEmail: params.deletedByEmail,
    deletedAt: nowIso,
    DeletedAt: nowIso,
    deletionReason: resolvedReason,
    DeletionReason: resolvedReason,
    canRestore: true,
    RestoreSupported: true,
    PermanentDeleteAllowed: true,
    RetentionDays: retentionDays,
    scheduledPermanentDeletionAt: expiryIso,
    AutoDeleteAfter: expiryIso,
    trashStatus: 'in_trash',
    TrashStatus: 'in_trash',
    requiresAdminRevalidationOnRestore: requiresRevalidation
  };

  pStore.globalTrashById[trashId] = trashItem;
  saveInternalPortalStore(pStore);

  recordAdminActionServer({
    adminUid: params.deletedByUid,
    adminName: params.deletedByName,
    adminEmail: params.deletedByEmail,
    action: 'MOVED_TO_GLOBAL_TRASH',
    targetUid: params.originalDocumentId,
    details: `Moved ${params.recordType} "${params.title}" (${params.originalDocumentId}) from ${params.originalCollection} to Global Trash.`
  });

  return { ok: true, trashItem };
}

export function restoreFromGlobalTrashServer(params: {
  trashId: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): { ok: boolean; restoredItem?: GlobalTrashItem; restoredData?: Record<string, any>; message: string } {
  const pStore = loadInternalPortalStore();
  const existing = pStore.globalTrashById[params.trashId];
  if (!existing) {
    return { ok: false, message: 'Trash record not found.' };
  }

  const nowIso = new Date().toISOString();
  const restoredData: Record<string, any> = {
    ...existing.OriginalData,
    isDeleted: false,
    restoredAt: nowIso,
    restoredBy: params.adminEmail
  };

  // Safe Restoration Rule for User / Employee / Admin Profile records:
  // Always restore with Regular User / pending role and no active admin privileges
  if (
    existing.RecordType === 'user' ||
    existing.RecordType === 'employee' ||
    existing.RecordType === 'admin_profile'
  ) {
    restoredData.role = 'student';
    restoredData.staffRole = 'Regular User';
    restoredData.assignedRole = null;
    restoredData.permissions = [];
    restoredData.isAdmin = false;
    restoredData.isSuperAdmin = false;
    restoredData.isActive = false;
    restoredData.approvalStatus = 'pending';
  }

  delete pStore.globalTrashById[params.trashId];
  saveInternalPortalStore(pStore);

  recordAdminActionServer({
    adminUid: params.adminUid,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    action: 'RESTORED_FROM_GLOBAL_TRASH',
    targetUid: existing.OriginalDocumentID,
    details: `Restored ${existing.RecordType} "${existing.Title}" (${existing.OriginalDocumentID}) from Global Trash (Safe Restoration Rule applied).`
  });

  return {
    ok: true,
    restoredItem: existing,
    restoredData,
    message: `Restored "${existing.Title}" to ${existing.OriginalCollection}.`
  };
}

export function permanentlyDeleteFromGlobalTrashServer(params: {
  trashId: string;
  confirmationText: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): { ok: boolean; deletedItem?: GlobalTrashItem; message: string } {
  const pStore = loadInternalPortalStore();
  const existing = pStore.globalTrashById[params.trashId];
  if (!existing) {
    return { ok: false, message: 'Trash record not found.' };
  }

  const isSensitive = [
    'user',
    'employee',
    'admin_profile',
    'developer_profile',
    'sim_application'
  ].includes(existing.RecordType);

  if (isSensitive && String(params.confirmationText || '').trim() !== 'PERMANENTLY DELETE') {
    return {
      ok: false,
      message: 'Please type PERMANENTLY DELETE to confirm irreversible deletion of this sensitive record.'
    };
  }

  if (existing.OriginalData?.email) {
    const emailLower = String(existing.OriginalData.email).trim().toLowerCase();
    if (!pStore.permanentlyDeletedEmails.includes(emailLower)) {
      pStore.permanentlyDeletedEmails.push(emailLower);
    }
    removeOtpRegistrationByEmail(emailLower);
  }

  delete pStore.globalTrashById[params.trashId];
  saveInternalPortalStore(pStore);

  recordAdminActionServer({
    adminUid: params.adminUid,
    adminName: params.adminName,
    adminEmail: params.adminEmail,
    action: 'PERMANENTLY_DELETED_FROM_TRASH',
    targetUid: existing.OriginalDocumentID,
    details: `Permanently purged ${existing.RecordType} "${existing.Title}" (${existing.OriginalDocumentID}) from Global Trash.`
  });

  return {
    ok: true,
    deletedItem: existing,
    message: `Permanently deleted "${existing.Title}".`
  };
}





