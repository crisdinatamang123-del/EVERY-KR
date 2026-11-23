/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR "Apply Now" Smart Application System — Canonical Types
 */

export type SmartApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'documents_missing'
  | 'sent_to_university'
  | 'interview'
  | 'admitted'
  | 'rejected'
  | 'visa_processing'
  | 'completed'
  | 'withdrawn';

export type SmartApplicationDocumentType =
  | 'passport'
  | 'photo'
  | 'transcript'
  | 'certificate'
  | 'language_certificate'
  | 'bank_statement'
  | 'study_plan'
  | 'recommendation_letter'
  | 'other'
  | string;

export type SmartApplicationAdminRole = 'admin' | 'counsellor' | 'viewer' | null;

export type SmartApplicationDocumentCategory =
  | 'personal'
  | 'academic'
  | 'language'
  | 'financial'
  | 'other';

export type SmartApplicationDocumentVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'replacement_requested';

export interface SmartApplicationPersonal {
  surname: string;
  givenNames: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string;
  nationalityCode?: string; // ISO-3 e.g. BGD, NPL, IND
  passportNumber: string;
  passportIssueDate: string; // YYYY-MM-DD
  passportExpiryDate: string; // YYYY-MM-DD
  placeOfBirth: string;
  currentCountry?: string;
  currentAddress: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
}

export interface SmartApplicationPreviousDegree {
  id: string;
  level: string;
  institutionName: string;
  country: string;
  startYear: string;
  endYear: string;
  gpa: string;
  gpaScale: string;
}

export interface SmartApplicationEducation {
  highestLevel: string;
  institutionName: string;
  country: string;
  startYear: string;
  endYear: string;
  gpa: string;
  gpaScale: string;
  previousDegrees: SmartApplicationPreviousDegree[];
  gapYearsExplanation: string;
}

export interface SmartApplicationLanguage {
  topikLevel: 'None' | 'TOPIK 1' | 'TOPIK 2' | 'TOPIK 3' | 'TOPIK 4' | 'TOPIK 5' | 'TOPIK 6';
  topikTestDate?: string;
  englishTestType: 'None' | 'IELTS' | 'TOEFL' | 'Duolingo';
  englishTestScore: string;
  englishTestDate: string;
  koreanStudyHistory: string;
}

export interface SmartApplicationProgramChoice {
  degreeLevel: string;
  round: string;
  desiredMajor: string;
  secondChoiceMajor: string;
  scholarshipInterest: boolean;
  preferredScholarshipName?: string;
}

export interface SmartApplicationFinance {
  sponsorType: 'self' | 'parent' | 'other' | '';
  sponsorName: string;
  sponsorRelation: string;
  fundingSource?: string;
  bankBalanceAmount: string;
  bankBalanceCurrency: string;
  financialDeclarationAccepted?: boolean;
}

export interface SmartApplicationDocumentVersion {
  version: number;
  fileName: string;
  storagePath: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  replacedAt: string;
  verificationStatus?: SmartApplicationDocumentVerificationStatus;
  verificationNote?: string;
}

export interface SmartApplicationDocumentItem {
  docType: SmartApplicationDocumentType;
  category?: SmartApplicationDocumentCategory;
  label?: string;
  fileName: string;
  storagePath: string;
  downloadUrl?: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  aiDetected: boolean;
  verified: boolean;
  verificationStatus?: SmartApplicationDocumentVerificationStatus;
  verificationNote?: string;
  verifiedByUid?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  version?: number;
  previousVersions?: SmartApplicationDocumentVersion[];
  qualityWarnings?: string[];
  needsCheck?: boolean;
  reusedFromApplicationId?: string;
}

export interface SmartApplicationAiPassportSnapshot {
  surname: string;
  givenNames: string;
  passportNumber: string;
  dateOfBirth: string;
  nationality: string;
  nationalityIso3: string;
  gender: string;
  expiryDate: string;
  issueDate: string;
  placeOfBirth: string;
  mrzLine1: string;
  mrzLine2: string;
  mrzHasMrz: boolean;
  mrzIsValid: boolean;
  mrzPassportCheckPassed: boolean;
  mrzDobCheckPassed: boolean;
  mrzExpiryCheckPassed: boolean;
  mrzCompositeCheckPassed: boolean;
  mrzWarnings: string[];
  trustedSource: 'mrz' | 'visual' | 'none';
  extractedAt: string;
}

export interface SmartApplicationConsent {
  dataProcessing: boolean;
  aiProcessing: boolean;
  acceptedAt: string;
  aiConsentedAt?: string;
  consentedByUid?: string;
}

export interface SmartApplicationNote {
  id: string;
  authorUid: string;
  authorName: string;
  authorEmail: string;
  text: string;
  createdAt: string;
}

export interface SmartApplicationRequestedDocument {
  docType: string;
  label: string;
  note?: string;
  deadline?: string; // YYYY-MM-DD optional deadline
  status?: 'pending' | 'uploaded' | 'verified';
  requestedAt: string;
}

export interface SmartApplicationRecord {
  id: string;
  userId: string;
  universityId: string;
  universityName: string;
  universityLogoUrl?: string;
  intake: string;
  intakeStartDate?: string;
  applicationDeadline?: string;
  degreeLevel: string;
  round: string;
  status: SmartApplicationStatus;
  personal: SmartApplicationPersonal;
  education: SmartApplicationEducation;
  language: SmartApplicationLanguage;
  program: SmartApplicationProgramChoice;
  finance: SmartApplicationFinance;
  documents: Record<string, SmartApplicationDocumentItem>;
  requiredDocTypes?: string[];
  requestedDocuments?: SmartApplicationRequestedDocument[];
  requestedDocumentsMessage?: string;
  aiFilledFields: string[];
  aiCheckWarningFields?: string[];
  verifiedFields: string[];
  aiPassportSnapshot?: SmartApplicationAiPassportSnapshot;
  consent: SmartApplicationConsent;
  passportNumberNormalized?: string;
  duplicatePassportFlag?: boolean;
  duplicatePassportApplicationIds?: string[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
  notes: SmartApplicationNote[];
}

export type SmartApplicationHistoryEventType =
  | 'created'
  | 'draft_saved'
  | 'submitted'
  | 'assigned'
  | 'documents_requested'
  | 'documents_uploaded'
  | 'document_verified'
  | 'document_rejected'
  | 'status_changed'
  | 'message_sent'
  | 'note_added'
  | 'withdrawn';

export interface SmartApplicationHistoryEvent {
  id: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: 'student' | 'admin' | 'counsellor' | 'system';
  eventType?: SmartApplicationHistoryEventType;
  when: string;
  from: SmartApplicationStatus | null;
  to: SmartApplicationStatus;
  message?: string;
  requestedDocuments?: string[];
  assignedToName?: string;
}

export interface SmartApplicationDocumentAccessLog {
  id: string;
  applicationId: string;
  docType: string;
  fileName: string;
  storagePath: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: 'preview' | 'download' | 'zip_export' | 'pdf_export' | 'csv_export' | 'xlsx_export';
  accessedAt: string;
}

export interface UserApplicationProfile {
  userId: string;
  personal: SmartApplicationPersonal;
  education: SmartApplicationEducation;
  language: SmartApplicationLanguage;
  updatedAt: string;
}

export interface ApplicationRetentionSettings {
  withdrawnAndRejectedRetentionDays: number;
  updatedAt: string;
  updatedByEmail?: string;
}

export interface ChecklistRequirementItem {
  docType: string;
  label: string;
  requirementType: 'Mandatory' | 'Conditional' | 'Optional';
  notes?: string;
  apostilleRequired?: boolean;
  translationRequired?: string;
  isGeneralFallback?: boolean;
}

export interface MrzValidationResult {
  hasMrz: boolean;
  isValid: boolean;
  passportCheckPassed: boolean;
  dobCheckPassed: boolean;
  expiryCheckPassed: boolean;
  compositeCheckPassed: boolean;
  parsed?: {
    surname: string;
    givenNames: string;
    passportNumber: string;
    nationalityIso3: string;
    dateOfBirth: string;
    sex: 'Male' | 'Female' | 'Other' | '';
    expiryDate: string;
  };
  warnings: string[];
}

export type PassportCanonicalErrorCode =
  | 'AI_EXTRACTION_FAILED'
  | 'EMPTY_AI_RESPONSE'
  | 'MALFORMED_AI_JSON'
  | 'SAFETY_BLOCKED'
  | 'MISSING_CANDIDATES'
  | 'UNREADABLE_PASSPORT'
  | 'GEMINI_TIMEOUT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'API_KEY_INVALID'
  | 'AUTH_REQUIRED'
  | 'INVALID_IMAGE'
  | 'PAYLOAD_TOO_LARGE'
  | 'MODEL_NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'EMPTY_SERVER_RESPONSE'
  | 'UNEXPECTED_HTML_RESPONSE'
  | 'MALFORMED_SERVER_JSON'
  | 'INVALID_RESPONSE_SCHEMA'
  | 'CLIENT_OFFLINE'
  | 'REQUEST_CANCELLED';

export type SmartUploadAiErrorCode =
  | 'timeout'
  | 'cancelled'
  | 'offline'
  | 'rate_limited'
  | 'auth_required'
  | 'api_permission_denied'
  | 'endpoint_or_model_not_found'
  | 'payload_too_large'
  | 'invalid_image'
  | 'internal_error'
  | 'service_unavailable'
  | 'unreadable'
  | 'safety_blocked'
  | 'empty_ai_response'
  | 'malformed_ai_json'
  | 'missing_candidates'
  | 'empty_server_response'
  | 'unexpected_html_response'
  | 'malformed_server_json'
  | 'invalid_response_schema'
  | 'unknown';

export interface PassportCanonicalData {
  surname: string;
  givenNames: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  placeOfBirth: string;
}

export interface PassportExtractionCanonicalError {
  code: PassportCanonicalErrorCode;
  message: string;
  retryable: boolean;
}

export interface PassportExtractionApiResponse {
  /** Canonical contract success flag */
  success?: boolean;
  /** Canonical extracted passport fields (present when success === true) */
  data?: PassportCanonicalData;
  /** Canonical non-fatal warnings (e.g. ICAO 9303 MRZ check-digit warnings) */
  warnings?: string[];
  /** Canonical structured error object (present when success === false) */
  error?: PassportExtractionCanonicalError;
  /** Canonical uppercase error code convenience alias for UI display */
  canonicalErrorCode?: PassportCanonicalErrorCode;
  ok: boolean;
  readable: boolean;
  message?: string;
  errorCode?: SmartUploadAiErrorCode;
  retryable?: boolean;
  requestId?: string;
  modelUsed?: string;
  httpStatus?: number;
  timingsMs?: {
    authMs?: number;
    geminiMs?: number;
    totalMs?: number;
  };
  extracted: {
    mrzLine1: string;
    mrzLine2: string;
    surname: string;
    givenNames: string;
    passportNumber: string;
    nationalityIso3: string;
    nationalityName: string;
    dateOfBirth: string;
    sex: 'Male' | 'Female' | 'Other' | '';
    expiryDate: string;
    issueDate: string;
    placeOfBirth: string;
  };
  mrzValidation: MrzValidationResult;
  trustedSource: 'mrz' | 'visual' | 'none';
  needsCheckFields: string[];
}

export interface DocumentClassificationApiResponse {
  ok: boolean;
  readable: boolean;
  errorCode?: SmartUploadAiErrorCode;
  retryable?: boolean;
  requestId?: string;
  modelUsed?: string;
  httpStatus?: number;
  docType:
    | 'passport'
    | 'photo'
    | 'transcript'
    | 'certificate'
    | 'language_certificate'
    | 'bank_statement'
    | 'study_plan'
    | 'recommendation_letter'
    | 'other';
  confidence: 'high' | 'medium' | 'low';
  summary?: string;
  extractedTranscript?: {
    institutionName?: string;
    gpa?: string;
    gpaScale?: string;
    country?: string;
  };
  extractedLanguage?: {
    testType?: 'TOPIK' | 'IELTS' | 'TOEFL' | 'Duolingo' | 'None';
    score?: string;
    testDate?: string;
  };
}

export const SMART_APPLICATION_STATUS_ORDER: SmartApplicationStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'documents_missing',
  'sent_to_university',
  'interview',
  'admitted',
  'rejected',
  'visa_processing',
  'completed',
  'withdrawn',
];

/**
 * Backward-compatible legacy status aliases mapped to canonical SmartApplicationStatus values.
 * Ensures pre-existing records or external payloads using legacy names render and transition cleanly.
 */
export const LEGACY_STATUS_ALIAS_MAP: Record<string, SmartApplicationStatus> = {
  draft: 'draft',
  submitted: 'submitted',
  under_review: 'under_review',
  documents_missing: 'documents_missing',
  sent_to_university: 'sent_to_university',
  submitted_to_university: 'sent_to_university',
  interview: 'interview',
  admitted: 'admitted',
  accepted: 'admitted',
  rejected: 'rejected',
  visa_processing: 'visa_processing',
  completed: 'completed',
  withdrawn: 'withdrawn',
};

export function normalizeSmartApplicationStatus(raw?: string | null): SmartApplicationStatus {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return LEGACY_STATUS_ALIAS_MAP[key] || 'draft';
}

export const SMART_APPLICATION_STATUS_META: Record<
  SmartApplicationStatus,
  { label: string; badgeClass: string; orderIndex: number }
> = {
  draft: {
    label: 'Draft',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    orderIndex: 0,
  },
  submitted: {
    label: 'Submitted',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    orderIndex: 1,
  },
  under_review: {
    label: 'Under Review',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    orderIndex: 2,
  },
  documents_missing: {
    label: 'Documents Missing',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700',
    orderIndex: 3,
  },
  sent_to_university: {
    label: 'Sent to University',
    badgeClass:
      'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    orderIndex: 4,
  },
  interview: {
    label: 'Interview',
    badgeClass:
      'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    orderIndex: 5,
  },
  admitted: {
    label: 'Admitted',
    badgeClass:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    orderIndex: 6,
  },
  rejected: {
    label: 'Rejected',
    badgeClass:
      'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    orderIndex: 6,
  },
  visa_processing: {
    label: 'Visa Processing',
    badgeClass:
      'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    orderIndex: 7,
  },
  completed: {
    label: 'Completed',
    badgeClass:
      'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
    orderIndex: 8,
  },
  withdrawn: {
    label: 'Withdrawn',
    badgeClass:
      'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700',
    orderIndex: 0,
  },
};

export const STUDENT_WITHDRAWABLE_STATUSES: ReadonlySet<SmartApplicationStatus> = new Set([
  'draft',
  'submitted',
  'under_review',
  'documents_missing',
]);

/**
 * Allowed status transitions for admissions staff (counsellors).
 * Admins retain override capability for operational corrections, while counsellors follow valid workflow edges.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  SmartApplicationStatus,
  readonly SmartApplicationStatus[]
> = {
  draft: ['draft', 'submitted', 'withdrawn'],
  submitted: ['under_review', 'documents_missing', 'sent_to_university', 'rejected', 'withdrawn'],
  under_review: ['documents_missing', 'sent_to_university', 'interview', 'admitted', 'rejected', 'withdrawn'],
  documents_missing: ['submitted', 'under_review', 'sent_to_university', 'rejected', 'withdrawn'],
  sent_to_university: ['documents_missing', 'interview', 'admitted', 'rejected', 'withdrawn'],
  interview: ['documents_missing', 'admitted', 'rejected', 'withdrawn'],
  admitted: ['visa_processing', 'completed', 'withdrawn'],
  rejected: ['under_review'],
  visa_processing: ['completed', 'withdrawn'],
  completed: ['completed'],
  withdrawn: ['draft'],
};

export function isAllowedStatusTransition(params: {
  from: SmartApplicationStatus;
  to: SmartApplicationStatus;
  actorRole: 'student' | 'counsellor' | 'admin' | 'viewer';
}): boolean {
  const from = normalizeSmartApplicationStatus(params.from);
  const to = normalizeSmartApplicationStatus(params.to);

  if (params.actorRole === 'viewer') return false;

  if (params.actorRole === 'student') {
    if (to === 'withdrawn') return STUDENT_WITHDRAWABLE_STATUSES.has(from);
    if (from === 'draft') return to === 'draft' || to === 'submitted';
    if (from === 'documents_missing') return to === 'documents_missing' || to === 'submitted';
    return false;
  }

  if (params.actorRole === 'admin') {
    return SMART_APPLICATION_STATUS_ORDER.includes(to);
  }

  // Counsellor follows workflow transitions (plus idempotent same-status update for re-requesting docs)
  if (from === to) return true;
  return (ALLOWED_STATUS_TRANSITIONS[from] || []).includes(to);
}

export const DEFAULT_PERSONAL_INFO: SmartApplicationPersonal = {
  surname: '',
  givenNames: '',
  gender: '',
  dateOfBirth: '',
  nationality: '',
  nationalityCode: '',
  passportNumber: '',
  passportIssueDate: '',
  passportExpiryDate: '',
  placeOfBirth: '',
  currentAddress: '',
  phoneCountryCode: '+82',
  phoneNumber: '',
  email: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactPhone: '',
};

export const DEFAULT_EDUCATION_INFO: SmartApplicationEducation = {
  highestLevel: 'High School / Secondary',
  institutionName: '',
  country: '',
  startYear: '',
  endYear: '',
  gpa: '',
  gpaScale: '4.0',
  previousDegrees: [],
  gapYearsExplanation: '',
};

export const DEFAULT_LANGUAGE_INFO: SmartApplicationLanguage = {
  topikLevel: 'None',
  topikTestDate: '',
  englishTestType: 'None',
  englishTestScore: '',
  englishTestDate: '',
  koreanStudyHistory: '',
};

export const DEFAULT_PROGRAM_CHOICE: SmartApplicationProgramChoice = {
  degreeLevel: '',
  round: '',
  desiredMajor: '',
  secondChoiceMajor: '',
  scholarshipInterest: false,
  preferredScholarshipName: '',
};

export const DEFAULT_FINANCE_INFO: SmartApplicationFinance = {
  sponsorType: 'parent',
  sponsorName: '',
  sponsorRelation: '',
  bankBalanceAmount: '',
  bankBalanceCurrency: 'USD',
};
