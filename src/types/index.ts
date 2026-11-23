export type LanguageCode = 'en' | 'bn' | 'ko' | 'ne' | 'ur' | 'hi' | 'ar' | 'zh' | 'ja';

export type UserRole =
  | 'student'
  | 'general'
  | 'agent'
  | 'employer'
  | 'landlord'
  | 'university'
  | 'admin';

export type AccountType =
  | 'student'
  | 'general'
  | 'agent'
  | 'employer'
  | 'landlord'
  | 'university'
  | 'admin';

export interface EducationRecord {
  id: string;
  level: string;
  institution: string;
  boardOrUniversity?: string;
  passingYear: string;
  gpaOrGrade: string;
  majorOrGroup?: string;
}

export interface StudentAcademicProfile {
  currentEducationLevel?: string;
  lastCompletedEducation?: string;
  sscPassingYear?: string;
  sscGpa?: string;
  hscPassingYear?: string;
  hscGpa?: string;
  diplomaPassingYear?: string;
  bachelorPassingYear?: string;
  graduationYear?: string | number;
  institutionName?: string;
  previousQualification?: string;
  cgpaOrPercentage?: string;
  currentUniversity?: string;
  currentMajor?: string;
  interestedProgram?: string;
  desiredStudyLevel?: string;
  preferredIntake?: string;
  targetIntakeSemester?: string;
  preferredUniversity?: string;
  preferredUniversities?: string[];
  koreanLanguageLevel?: string;
  koreanProficiency?: string;
  englishProficiency?: string;
  englishScore?: string;
  studyGap?: string;
}

export interface GeneralUserProfile {
  currentCountry?: string;
  currentCity?: string;
  nationality?: string;
  interests?: string[];
  preferredLanguage?: LanguageCode;
}

export interface AgentPartnerProfile {
  agencyName: string;
  contactPerson: string;
  country: string;
  city: string;
  businessEmail: string;
  phoneNumber: string;
  website?: string;
  yearsOfExperience?: string;
  approvalStatus?: 'pending' | 'pending_approval' | 'approved' | 'rejected';
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface PassportDetailsMetadata {
  hasPassportSaved?: boolean;
  requiredForService: boolean;
  passportNumberMasked?: string;
  issuingCountry?: string;
  issueDate?: string;
  expiryDate?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  consentGiven: boolean;
  consentedAt?: string;
  hasEncryptedPassport?: boolean;
}

export interface PrivacyConsentRecord {
  privacyPolicyAccepted: boolean;
  termsAccepted: boolean;
  personalInfoConsent: boolean;
  passportInfoConsent?: boolean;
  consentedAt: string;
}

export interface RegistrationLogEntry {
  id: string;
  registrationId?: string;
  uid: string;
  email: string;
  fullName: string;
  accountType: AccountType;
  role: UserRole;
  countryOfResidence?: string;
  nationality?: string;
  authProvider: 'email_otp' | 'google' | 'password';
  status: 'active' | 'pending_approval' | 'unverified';
  timestamp: string;
}

export interface DataPrivacyRequestEntry {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  requestType: 'correction' | 'data_correction' | 'passport_deletion' | 'account_deletion';
  details: string;
  status: 'pending' | 'resolved' | 'completed';
  requestedAt?: string;
  processedAt?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface UserProfile {
  id: string;
  uid?: string;
  registrationId?: string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  accountType?: AccountType;
  phoneNumber?: string;
  countryCode?: string;
  countryOfResidence?: string;
  currentCountry?: string;
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
  preferredLanguage: LanguageCode;
  avatarUrl?: string;
  photoURL?: string;
  visaType?: string;
  phone?: string;
  kakaoId?: string;
  expectedGraduation?: string;
  profileCompletionPercentage?: number;
  emailVerified?: boolean;
  accountStatus?: 'active' | 'unverified' | 'pending_approval' | 'rejected' | 'suspended';
  privacyConsent?: PrivacyConsentRecord;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  authProvider?: 'email_otp' | 'google' | 'password';
  // Extended Student Portal & Admin Management fields
  whatsappNumber?: string;
  currentAddress?: string;
  passportCountry?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportNumberMasked?: string;
  passportDocumentUrl?: string;
  passportDocumentName?: string;
  highestEducationLevel?: string;
  hscPassingYear?: string;
  previousInstitutionName?: string;
  previousQualification?: string;
  academicGpa?: string;
  gpa?: string;
  intendedStudyLevel?: string;
  preferredMajor?: string;
  englishProficiency?: string;
  englishTestScore?: string;
  ieltsOrToeflScore?: string;
  koreanLanguageLevel?: string;
  topikLevel?: string;
  adminInternalNotes?: string;
  staffRole?: StaffRoleType;
  assignedRole?: StaffRoleType;
  requestedRole?: StaffRoleType | string;
  department?: string;
  employeeId?: string;
  approvalStatus?: InternalApprovalStatus;
  isActive?: boolean;
  permissions?: StaffPermissionKey[];
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  restoredFromTrashAt?: string;
  requiresAdminRevalidation?: boolean;
  version?: number;
}

export interface LoginLogEntry {
  id: string;
  uid: string;
  email: string;
  userName?: string;
  timestamp: string;
  provider: 'google' | 'email_otp' | 'password';
  success: boolean;
  status: 'success' | 'failure';
  reason?: string;
}

export interface AdminLogEntry {
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

export interface OtpVerificationMetadataEntry {
  id: string;
  uid?: string;
  email: string;
  fullName: string;
  role: UserRole;
  accountType?: AccountType;
  status: 'pending_otp' | 'verified' | 'expired' | 'locked';
  emailVerified: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  requestedAt: string;
  expiresAt: string;
  verifiedAt?: string;
  lastDeliveryMessageId?: string;
}

export interface UserManagementStats {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  studentsCount: number;
  generalUsersCount?: number;
  agentsCount?: number;
  pendingAgentsCount?: number;
  employersCount: number;
  housingProvidersCount: number;
  universityPartnersCount: number;
  adminsCount: number;
  suspendedUsers: number;
}

export interface AdminRegistrationSummary {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  accountType?: AccountType;
  emailVerified: boolean;
  accountStatus: 'active' | 'unverified' | 'pending_approval' | 'rejected' | 'expired' | 'locked';
  authProvider: 'email_otp' | 'google' | 'password';
  createdAt: string;
  verifiedAt?: string;
  expiresAt?: string;
  attemptsUsed?: number;
  maxAttempts?: number;
  lastDeliveryMessageId?: string;
}

export interface UserReminder {
  id: string;
  title: string;
  dueDate: string;
  category: 'ARC & Immigration' | 'Tuition' | 'Health Insurance' | 'Exam / TOPIK' | 'Personal';
  completed: boolean;
  notes?: string;
}

export interface ProgramDetail {
  id?: string;
  degreeLevel?: string;
  nameEn?: string;
  nameKr?: string;
  tuitionPerSemesterKrw?: number;
  languageOfInstruction?: string;
  minTopikLevel?: number;
  minIeltsScore?: number;
  [key: string]: any;
}

export const UNVERIFIED_UNIVERSITY_MESSAGE = 'Not officially verified — Awaiting confirmation.';

export type StrictVerificationStatus =
  | 'VERIFIED'
  | 'PENDING VERIFICATION'
  | 'NEEDS UPDATE'
  | 'NOT OFFICIALLY VERIFIED'
  | 'CONFLICTING SOURCES'
  | 'PARTIALLY VERIFIED';

export type UniversitySourceAuthorityTier =
  | 'Tier 1: Official University Website'
  | 'Tier 1: Official International Admissions Portal'
  | 'Tier 1: Official Admission Guide'
  | 'Tier 2: Korean Ministry of Education'
  | 'Tier 2: Study in Korea (NIIED)'
  | 'Tier 2: Higher Education in Korea / AcademyInfo'
  | 'Unverified';

export interface UniversityFieldProvenance {
  fieldKey: string;
  fieldLabel: string;
  value: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceType: UniversitySourceAuthorityTier;
  academicYearOrIntake: string;
  retrievalDate: string;
  verificationDate?: string;
  verifiedByAdminEmail?: string;
  verificationStatus: StrictVerificationStatus;
}

export interface UniversityLogoVerification {
  verified: boolean;
  logoUrl: string;
  officialSourceUrl: string;
  sourcePageUrl: string;
  retrievalDate: string;
  verificationDate?: string;
  verificationStatus: StrictVerificationStatus;
  notes?: string;
}

export interface UniversityCampusRecord {
  campusName: string;
  isMainCampus: boolean;
  city: string;
  province: string;
  koreanAddress: string;
  englishAddress: string;
  addressVerified: boolean;
  sourceUrl?: string;
}

export type InternationalAdmissionCategoryKey =
  | 'undergraduateFreshman'
  | 'undergraduateTransfer'
  | 'masters'
  | 'doctoral'
  | 'integratedMastersDoctoral'
  | 'koreanLanguageProgram'
  | 'exchangeProgram';

export interface InternationalAdmissionCategoryDetail {
  categoryKey: InternationalAdmissionCategoryKey;
  categoryLabel: string;
  available: 'Yes' | 'No' | typeof UNVERIFIED_UNIVERSITY_MESSAGE;
  verificationStatus: StrictVerificationStatus;
  intakeCycle: string;
  applicationPeriod: string;
  documentSubmissionPeriod: string;
  interviewSchedule: string;
  resultAnnouncementDate: string;
  registrationTuitionPaymentPeriod: string;
  eligibilityRequirements: string;
  languageRequirements: string;
  applicationFee: string;
  sourceUrl: string;
  sourceTitle?: string;
  retrievalDate: string;
}

export interface HistoricalAdmissionCycleRecord {
  cycleName: string;
  academicYear: number;
  recordedAt: string;
  springPeriod?: string;
  fallPeriod?: string;
  sourceUrl?: string;
  notes?: string;
}

export interface UniversityPublicationGate {
  officialEnglishName: boolean;
  officialKoreanName: boolean;
  officialLogo: boolean;
  universityIdentity: boolean;
  verifiedCampusAndAddress: boolean;
  officialWebsite: boolean;
  internationalAdmissionsSource: boolean;
  admissionCategories: boolean;
  currentAdmissionCycle: boolean;
  tuitionSource: boolean;
  scholarshipSource: boolean;
  sourceUrlsStored: boolean;
  adminApproved: boolean;
  allPassed: boolean;
  missingItems: string[];
}

export interface UniversityAccuracyAuditItem {
  id: string;
  universityName: string;
  koreanName: string;
  campusName: string;
  officialLogoVerified: 'Yes' | 'No';
  officialWebsiteVerified: 'Yes' | 'No';
  campusInformationVerified: 'Yes' | 'No';
  internationalAdmissionsVerified: 'Yes' | 'No';
  admissionGuideFound: 'Yes' | 'No';
  tuitionVerified: 'Yes' | 'No';
  scholarshipVerified: 'Yes' | 'No';
  sourceUrls: string[];
  missingInformation: string[];
  overallVerificationStatus: StrictVerificationStatus;
}

export interface University {
  id: string;
  name: string;
  officialName?: string;
  campusName?: string;
  isMainCampus?: boolean;
  koreanName: string;
  koreanNameVerified?: boolean;
  city: string;
  province?: string;
  region?: string; // 'Seoul' | 'Busan' | 'Incheon' | 'Daegu' | 'Daejeon' | 'Gwangju' | 'Ulsan' | 'Gyeonggi-do' | 'Gangwon-do' | 'Chungcheong-do' | 'Jeolla-do' | 'Gyeongsang-do' | 'Jeju'
  type: 'National' | 'Private' | 'Public' | string;
  typeVerified?: boolean;
  establishmentYear?: number | null;
  establishmentYearVerified?: boolean;
  campusImage: string;
  logoUrl?: string;
  logoVerified?: boolean;
  logoSourceUrl?: string;
  logoRetrievedAt?: string;
  logoVerification?: UniversityLogoVerification;
  rankingKR?: number | null;
  rankingVerified?: boolean;
  programs: string[];
  programsVerified?: boolean;
  degrees: ('Bachelor' | 'Master' | 'PhD' | 'Language Program')[];
  degreesVerified?: boolean;
  tuitionPerSemesterKRW?: {
    min: number;
    max: number;
  };
  tuitionVerified?: boolean;
  tuitionSourceUrl?: string;
  tuitionNotes?: string;
  scholarships?: string[];
  scholarshipVerified?: boolean;
  scholarshipSourceUrl?: string;
  englishTaughtAvailable: boolean;
  englishTaughtVerified?: boolean;
  internationalOfficeUrl: string;
  internationalAdmissionsVerified?: boolean;
  admissionGuideFound?: boolean;
  admissionGuideUrl?: string;
  officialWebsite?: string;
  officialWebsiteVerified?: boolean;
  contactEmail: string;
  contactPhone?: string;
  contactVerified?: boolean;
  locationAddress: string;
  koreanAddress?: string;
  englishAddress?: string;
  campusVerified?: boolean;
  mainCampusRecord?: UniversityCampusRecord;
  additionalCampuses?: UniversityCampusRecord[];
  deadlines?: {
    springSemester?: string;
    fallSemester?: string;
    intakeCycleLabel?: string;
    documentSubmissionPeriod?: string;
    interviewEvaluationSchedule?: string;
    resultAnnouncementDate?: string;
    registrationTuitionPaymentPeriod?: string;
    verified?: boolean;
    [key: string]: any;
  };
  admissionRequirements?: {
    topikLevel?: string;
    englishTest?: string;
    minimumGpa?: string;
    apostilleRequired?: boolean;
    bankBalanceUsd?: number;
    applicationFeeKrw?: number | string;
    requiredDocuments?: string[];
    verified?: boolean;
    [key: string]: any;
  };
  internationalAdmissionCategories?: Record<InternationalAdmissionCategoryKey, InternationalAdmissionCategoryDetail>;
  historicalAdmissionCycles?: HistoricalAdmissionCycleRecord[];
  fieldProvenance?: Record<string, UniversityFieldProvenance>;
  publicationGate?: UniversityPublicationGate;
  adminApprovedVerified?: boolean;
  duplicateOfId?: string;
  studentSupport?: string[];
  studentSupportVerified?: boolean;
  verified: boolean;
  verificationStatus?:
    | 'Verified'
    | 'Pending Verification'
    | 'Needs Review'
    | StrictVerificationStatus;
  strictVerificationStatus?: StrictVerificationStatus;
  description: string;
  aliases?: string[];
  nameEn?: string;
  nameKr?: string;
  dormitoryFeePerSemesterKrw?: number;
  bankBalanceRequiredUsd?: number;
  applicationFeeKrw?: number;
  maxScholarshipPercent?: number;
  gksScholarshipEligible?: boolean;
  scholarshipDetails?: string;
  undergradDeadline?: string;
  gradDeadline?: string;
  popularMajors?: string[];
  intlOfficeEmail?: string;
  intlOfficePhone?: string;
  applyNowUrl?: string;
  leadership?: {
    presidentName?: string;
    presidentTitle?: string;
    internationalOfficeDesignation?: string;
    internationalDirectorName?: string;
    internationalDirectorTitle?: string;
    verified?: boolean;
    sourceUrl?: string;
  };
  sourceUrl?: string;
  sourceUrls?: string[];
  lastUpdated?: string;
  whitelistOrder?: number;
  isApproved25?: boolean;
  recordTier?: 'approved_25' | 'preserved_archive';
  priorityRank?: number;
  completenessPercentage?: number;
  fiveTierVerificationStatus?: import('../data/universities25/relationalTypes').FiveTierVerificationStatus;
  eightPartChecklist?: import('../data/universities25/relationalTypes').EightPartCompletenessChecklist;
  programCategoriesOffered?: string[];
  relationalBundle?: import('../data/universities25/relationalTypes').CompleteUniversityRelationalBundle;
  [key: string]: any;
  createdAt?: string;
  updatedAt?: string;
  lastVerifiedAt?: string;
}

export interface UniversityImportReport {
  timestamp: string;
  totalSupplied: number;
  totalImported: number;
  totalCampuses: number;
  totalDuplicates: number;
  totalAliasesLinked: number;
  totalPendingVerification: number;
  records: Array<{
    name: string;
    campus?: string;
    status: 'imported' | 'aliased' | 'updated' | 'pending_verification';
    notes?: string;
  }>;
  auditItems?: UniversityAccuracyAuditItem[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  city: string;
  salaryKRW: string; // e.g. "₩10,300 / hr" or "₩2,800,000 / month"
  jobType: 'Part-time' | 'Full-time' | 'Internship' | 'Campus Assistant';
  category: 'Restaurant & Cafe' | 'Office & Admin' | 'Translation' | 'Education & Tutoring' | 'IT & Tech' | 'Factory & Logistics';
  hoursPerWeek: number;
  languageRequirements: string;
  visaRequirements: string;
  deadline: string;
  postedDate: string;
  verified: boolean;
  isDemo?: boolean;
  verificationNote?: string;
  description: string;
  responsibilities: string[];
  employerEmail: string;
}

export type AccommodationApprovalStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Unavailable'
  | 'Archived';

export type AccommodationAvailabilityStatus = 'Available' | 'Unavailable';

export type AccommodationTypeOption =
  | 'Dormitory'
  | 'One-room'
  | 'Studio'
  | 'Shared Room'
  | 'Goshiwon'
  | 'Short-term';

export interface AccommodationListing {
  id: string;
  propertyId?: string;
  title: string;
  description: string;
  photos: string[];
  monthlyRent?: number;
  monthlyRentKRW: number;
  securityDeposit?: number;
  depositKRW: number;
  maintenanceFeeKRW: number;
  city: string;
  district: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  accommodationType?: AccommodationTypeOption | string;
  roomType: AccommodationTypeOption;
  facilities?: string[];
  amenities: string[];
  roomDetails?: string;
  availability?: AccommodationAvailabilityStatus;
  approvalStatus?: AccommodationApprovalStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  furnished: boolean;
  availableDate: string;
  nearUniversities: string[];
  landlordType: 'Direct Owner' | 'Certified Agent' | 'University Dorm';
  landlordPhone: string;
  contactEmail?: string;
  verified: boolean;
  isDemo?: boolean;
  verificationNote?: string;
}

export interface AccommodationInquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  moveInDate?: string;
  message: string;
  createdAt: string;
  status: 'New' | 'Read' | 'Replied';
}

export interface VisaCategory {
  code: string; // 'D-2', 'D-4', 'D-10', 'E-7', 'F-2-7', 'F-5'
  title: string;
  targetAudience: string;
  stayDuration: string;
  workPermissionSummary: string;
  officialFeeKRW: number;
  documents: {
    id: string;
    name: string;
    description: string;
    requiredFor: 'All Applicants' | 'Specific Nationalities' | 'Extension Only';
    officialFormUrl?: string;
  }[];
  arcSteps: string[];
  officialSourceUrl: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  authorName: string;
  authorRole: string;
  authorNationality: string;
  category: 'General Discussion' | 'University Life' | 'Visa & Immigration' | 'Jobs & Careers' | 'Accommodation' | 'Korean Language' | 'Buy & Sell' | 'Daily Life';
  city: string;
  timestamp: string;
  content: string;
  repliesCount: number;
  likesCount: number;
  bookmarked: boolean;
  replies?: {
    id: string;
    authorName: string;
    timestamp: string;
    content: string;
    isVerifiedStudent?: boolean;
  }[];
}

export interface MarketplaceItem {
  id: string;
  title: string;
  category: 'Laptops & Electronics' | 'Mobile Phones' | 'Furniture' | 'Books & Study Materials' | 'Clothing' | 'Household Items' | 'Bicycles' | 'Other Items';
  priceKRW: number;
  condition: 'Brand New' | 'Like New' | 'Good Condition' | 'Fair Condition';
  location: string;
  city: string;
  sellerName: string;
  sellerContact: string;
  postedDate: string;
  status: 'Available' | 'Reserved' | 'Sold';
  images: string[];
  isDemo?: boolean;
  verified?: boolean;
  verificationNote?: string;
  description: string;
}

export interface GuideArticle {
  id: string;
  title: string;
  category: 'Banking' | 'Mobile & SIM' | 'Healthcare' | 'Transportation' | 'Shopping' | 'Government';
  readTimeMinutes: number;
  summary: string;
  keySteps: string[];
  officialWarning?: string;
  lastUpdated: string;
  officialSource: string;
  sourceUrl: string;
}

export interface CityGuide {
  id: string;
  name: string;
  koreanName: string;
  description: string;
  topUniversities: string[];
  studentHubs: string[];
  transportTips: string;
  halalSpots: string[];
  image: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId?: string;
  adminName: string;
  adminEmail: string;
  actionType:
    | 'CREATE'
    | 'EDIT'
    | 'APPROVE'
    | 'REJECT'
    | 'PUBLISH'
    | 'UNPUBLISH'
    | 'DELETE'
    | 'ROLE_CHANGE'
    | 'LOGIN'
    | 'EXPORT'
    | 'SUSPEND'
    | 'VERIFY_DOCUMENT';
  targetEntity:
    | 'User'
    | 'University'
    | 'Program'
    | 'Scholarship'
    | 'Job'
    | 'Employer'
    | 'Accommodation'
    | 'SimApplication'
    | 'SimArrivalGroup'
    | 'UniversityApplication'
    | 'StudentDocument'
    | 'StaffMember'
    | 'Article'
    | 'VisaGuide'
    | 'CommunityPost'
    | 'CommunityLike'
    | 'CommunityComment'
    | 'CommunityUserRestriction'
    | 'HomepageCmsCategory'
    | 'HomepageCmsService'
    | 'MarketplaceListing'
    | 'Report'
    | 'Inquiry'
    | 'ContactSubmission'
    | 'SystemSettings'
    | 'ExportReport'
    | 'UniversityAdmissionDeadline';
  targetId: string;
  targetName: string;
  details: string;
}

export interface ScholarshipItem {
  id: string;
  name: string;
  sponsor: string;
  targetAudience: string;
  coverageAmount: string;
  eligibilityCriteria: string[];
  deadline: string;
  published: boolean;
}

export interface EmployerAccount {
  id: string;
  companyName: string;
  businessRegistrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  activeJobsCount: number;
  verified: boolean;
  status: 'Active' | 'Pending' | 'Suspended';
}

export interface SupportInquiry {
  id: string;
  name: string;
  email: string;
  category: 'Admission' | 'Visa & Immigration' | 'Housing Scam' | 'Emergency Assistance' | 'General';
  subject: string;
  message: string;
  status: 'Pending' | 'Under Investigation' | 'Resolved' | 'Closed';
  createdAt: string;
  resolutionNotes?: string;
}

export interface ModerationReport {
  id: string;
  reporterName: string;
  reporterEmail: string;
  targetType: 'job' | 'housing' | 'post' | 'listing' | 'user';
  targetId: string;
  targetTitle: string;
  reason: string;
  status: 'Pending' | 'Under Investigation' | 'Resolved' | 'Dismissed';
  createdAt: string;
  resolutionNotes?: string;
}

export interface HangulLetter {
  char: string;
  nameKr: string;
  nameEn: string;
  bengaliSound: string;
  bengaliName: string;
  type: string;
  sampleWord?: string;
  sampleWordMeaning?: string;
  sampleWordBengali?: string;
  pronunciationTip?: string;
  [key: string]: any;
}

export interface BdKoreanWord {
  id: string;
  hangul: string;
  bengali: string;
  bengaliMeaning?: string;
  bengaliPronunciation?: string;
  pronunciation?: string;
  english: string;
  englishMeaning?: string;
  partOfSpeech?: string;
  pos?: string;
  category: string;
  topikLevel?: 'TOPIK I' | 'TOPIK II' | 'All' | string;
  level?: string;
  exampleSentence?: {
    hangul: string;
    bengali: string;
    english: string;
  };
  [key: string]: any;
}

export interface VisaGuide {
  id: string;
  title: string;
  category?: string;
  description?: string;
  steps?: Array<{ title: string; desc?: string; [key: string]: any }>;
  requiredDocuments?: string[];
  importantNotices?: string[];
  [key: string]: any;
}

export interface AdmissionDeadline {
  id: string;
  universityId: string;
  universityName?: string;
  semester?: string;
  year?: number;
  degreeLevel?: string;
  applicantType?: string;
  openDate?: string;
  closeDate?: string;
  onlineDeadline?: string;
  documentSubmissionDeadline?: string;
  courierDeadline?: string;
  interviewDate?: string;
  resultAnnouncementDate?: string;
  tuitionPaymentDeadline?: string;
  coaIssuanceDate?: string;
  semesterStartDate?: string;
  status?: string;
  sourceUrl?: string;
  sourceName?: string;
  lastUpdated?: string;
  verificationStatus?: string;
  [key: string]: any;
}

export type SimApplicationStatus =
  | 'Pending'
  | 'Submitted'
  | 'Under Review'
  | 'Contacted'
  | 'SIM Arranged'
  | 'Completed'
  | 'Rejected';

export type SimApplicationAirport =
  | 'Incheon International Airport (ICN)'
  | 'Gimhae International Airport (PUS)'
  | 'Gimpo International Airport (GMP)'
  | 'Jeju International Airport (CJU)'
  | 'Daegu International Airport (TAE)'
  | 'Cheongju International Airport (CJJ)'
  | 'Other';

export interface SimApplicationRecord {
  id: string;
  applicationId: string;
  userId: string;
  userEmail?: string;
  fullName: string;
  universityName: string;
  country?: string;
  nationality?: string;
  whatsappNumber: string;
  whatsappCountryCode?: string;
  whatsappLocalNumber?: string;
  arrivalDate: string;
  arrivalTime: string;
  flightNumber: string;
  arrivalAirport: SimApplicationAirport | string;
  passportDocumentURL: string;
  passportFileName?: string;
  passportMimeType?: string;
  passportFileSize?: number;
  passportStoragePath?: string;
  flightTicketDocumentURL: string;
  flightTicketFileName?: string;
  flightTicketMimeType?: string;
  flightTicketFileSize?: number;
  flightTicketStoragePath?: string;
  consentAccepted: boolean;
  consentVersion: string;
  consentText?: string;
  consentTimestamp: string;
  submissionTimestamp: string;
  applicationStatus: SimApplicationStatus;
  updatedAt?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  adminNotes?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  arrivalGroupId?: string;
  arrivalGroupName?: string;
}

// =========================================================
// STUDENT PORTAL & ADMIN MANAGEMENT SYSTEM TYPES
// =========================================================

export type StudentDocumentCategory =
  | 'Passport'
  | 'Academic Certificates'
  | 'Academic Transcripts'
  | 'English Proficiency Certificate'
  | 'TOPIK Certificate'
  | 'Other Supporting Documents';

export type StudentDocumentUploadStatus =
  | 'Uploaded'
  | 'Missing'
  | 'Replacement Requested';

export type StudentDocumentVerificationStatus =
  | 'Pending Verification'
  | 'Verified'
  | 'Rejected'
  | 'Replacement Requested';

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionTab?: 'profile' | 'documents' | 'applications' | 'settings';
}

export interface StudentDocumentRecord {
  id: string;
  documentId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentCountry?: string;
  category: StudentDocumentCategory;
  documentTitle?: string;
  fileName: string;
  fileUrl: string;
  downloadUrl?: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadStatus: StudentDocumentUploadStatus;
  verificationStatus: StudentDocumentVerificationStatus;
  verificationNotes?: string;
  uploadedAt: string;
  updatedAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verifiedByName?: string | null;
}

export type UniversityApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Documents Required'
  | 'Processing'
  | 'Accepted'
  | 'Rejected'
  | 'Completed'
  | 'Withdrawn';

export interface UniversityApplicationStatusHistoryItem {
  status: UniversityApplicationStatus;
  changedBy: string;
  changedByName: string;
  changedByUid?: string;
  changedByEmail?: string;
  timestamp: string;
  note?: string;
}

export interface UniversityApplicationRecord {
  id: string;
  applicationId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  whatsappNumber?: string;
  nationality: string;
  currentCountry?: string;
  dateOfBirth?: string;
  gender?: string;
  passportNumberMasked?: string;
  passportCountry?: string;
  passportExpiryDate?: string;
  highestEducationLevel?: string;
  hscPassingYear?: string;
  previousInstitutionName?: string;
  previousQualification?: string;
  academicGpa?: string;
  englishProficiency?: string;
  ieltsOrToeflScore?: string;
  koreanLanguageLevel?: string;
  topikLevel?: string;
  // University & Program Selection
  universityId: string;
  universityName: string;
  universityKoreanName?: string;
  universityCity?: string;
  degreeLevel: string;
  programName: string;
  intake: string;
  intendedIntake?: string;
  tuitionPerSemesterKRW?: string;
  applicationDeadline?: string;
  statementOfPurpose?: string;
  attachedDocumentIds?: string[];
  linkedDocumentIds?: string[];
  profileSnapshot?: Record<string, any>;
  // Status & Admin Controls
  status: UniversityApplicationStatus;
  adminNotes?: string;
  requestedDocumentsNote?: string;
  documentRequestMessage?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedStaffEmail?: string;
  statusHistory: UniversityApplicationStatusHistoryItem[];
  submissionDate: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export type StaffRoleType =
  | 'Super Admin'
  | 'Admin'
  | 'Employee'
  | 'Admission Manager'
  | 'Student Counselor'
  | 'Document Verification Staff'
  | 'SIM Manager'
  | 'SIM Application Manager'
  | 'Content Manager'
  | 'Community Moderator'
  | 'Support Staff'
  | 'Regular User';

export type StaffPermissionKey =
  | 'manage_students'
  | 'view_passport_numbers'
  | 'manage_applications'
  | 'verify_documents'
  | 'manage_universities'
  | 'manage_programs'
  | 'manage_sim_applications'
  | 'manage_arrival_groups'
  | 'bulk_export_sim_zip'
  | 'manage_homepage_cms'
  | 'manage_community'
  | 'moderate_community'
  | 'manage_staff'
  | 'manage_cms'
  | 'export_reports'
  | 'manage_settings'
  | 'view_audit_logs'
  | 'manage_contact_inbox';

export type InternalApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info_requested'
  | 'deactivated';

export interface StaffRoleHistoryEntry {
  previousRole: string;
  newRole: string;
  changedByUid: string;
  changedByName: string;
  changedByEmail: string;
  changedBy?: string;
  timestamp: string;
  changedAt?: string;
  reason?: string;
}

export interface StaffActivityLogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  actorEmail?: string;
  actorName?: string;
}

export interface StaffMemberRecord {
  id: string;
  uid: string;
  fullName: string;
  name?: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  country?: string;
  employeeId?: string;
  profilePhotoUrl?: string;
  photoURL?: string;
  additionalInfo?: string;
  requestedRole?: StaffRoleType | string;
  requestedPosition?: StaffRoleType;
  staffRole: StaffRoleType;
  assignedRole?: StaffRoleType;
  permissions: StaffPermissionKey[];
  approvalStatus?: InternalApprovalStatus;
  portalAccess?: 'student' | 'internal';
  isActive?: boolean;
  status: 'active' | 'inactive' | 'Active' | 'Inactive' | 'suspended' | 'revoked' | 'deleted' | 'pending';
  department?: string;
  assignedApplicationsCount?: number;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  infoRequestMessage?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  restoredFromTrashAt?: string;
  requiresAdminRevalidation?: boolean;
  roleHistory?: StaffRoleHistoryEntry[];
  activityHistory?: StaffActivityLogEntry[];
  version?: number;
}

export interface InternalAccessRequestRecord {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  phoneNumber: string;
  whatsappNumber: string;
  country: string;
  department: string;
  requestedRole?: StaffRoleType | string;
  requestedPosition: StaffRoleType;
  assignedDepartment: string | null;
  assignedRole: StaffRoleType | null;
  employeeId?: string;
  additionalInfo?: string;
  profilePhotoUrl?: string;
  photoURL?: string;
  role?: 'student' | 'employee' | 'admin' | 'super_admin' | string;
  accountType?: 'student' | 'internal_employee' | string;
  portalAccess?: 'student' | 'internal';
  approvalStatus: InternalApprovalStatus;
  isActive: boolean;
  permissions: StaffPermissionKey[];
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
  infoRequestMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export type GlobalTrashRecordType =
  | 'user'
  | 'employee'
  | 'admin_profile'
  | 'community_post'
  | 'community_comment'
  | 'homepage_category'
  | 'cms_subcategory'
  | 'nested_service'
  | 'cms_content'
  | 'news_update'
  | 'developer_profile'
  | 'sim_application'
  | 'university_admission_deadline';

export interface GlobalTrashItem {
  id: string;
  TrashID: string;
  originalId?: string;
  originalDocId: string;
  OriginalDocumentID: string;
  recordType: GlobalTrashRecordType;
  RecordType: GlobalTrashRecordType;
  recordName: string;
  recordTitle?: string;
  Title: string;
  recordSubtitle?: string;
  Subtitle?: string;
  originalCollection: string;
  OriginalCollection: string;
  originalData: Record<string, any>;
  OriginalData: Record<string, any>;
  previousState?: Record<string, any>;
  StorageFiles?: string[];
  deletedBy?: string;
  deletedByUid: string;
  DeletedByUID: string;
  deletedByName: string;
  DeletedByName: string;
  deletedByEmail: string;
  DeletedByEmail: string;
  deletedAt: string;
  DeletedAt: string;
  deletionReason: string;
  DeletionReason: string;
  originalRole?: string;
  originalStatus?: string;
  retentionPolicyNote?: string;
  canRestore?: boolean;
  RestoreSupported: boolean;
  PermanentDeleteAllowed: boolean;
  RetentionDays: number;
  scheduledPermanentDeletionAt: string;
  AutoDeleteAfter: string;
  trashStatus: 'in_trash' | 'restored';
  TrashStatus: 'in_trash' | 'restored';
  isSensitiveRecord?: boolean;
  requiresAdminRevalidationOnRestore?: boolean;
  strippedPrivilegesOnRestore?: boolean;
}

export interface AdminManagedProgramRecord {
  id: string;
  programId?: string;
  universityId: string;
  universityName: string;
  programName: string;
  programNameEn?: string;
  programNameKo?: string;
  department: string;
  collegeOrFaculty?: string;
  degreeLevel: 'Bachelor' | 'Master' | 'PhD' | 'Language Program' | 'Associate' | string;
  tuitionPerSemesterKRW: number;
  applicationFeeKRW?: number;
  languageOfInstruction: 'English' | 'Korean' | 'English & Korean' | string;
  admissionRequirements: string;
  languageRequirements: string;
  availableIntakes: string[];
  applicationDeadline?: string;
  published: boolean;
  createdAt?: string;
  updatedAt: string;
}

export interface AdminPlatformNotification {
  id: string;
  type:
    | 'new_student_registration'
    | 'new_university_application'
    | 'new_document_upload'
    | 'new_sim_application'
    | 'pending_application_review'
    | 'new_contact_inquiry'
    | 'new_internal_access_request';
  title: string;
  message: string;
  relatedRecordId?: string;
  studentId?: string;
  studentName?: string;
  createdAt: string;
  read: boolean;
}

export interface CmsAnnouncementRecord {
  id: string;
  title: string;
  category:
    | 'Homepage'
    | 'University'
    | 'News & Updates'
    | 'Events'
    | 'Korean Learning'
    | 'Accommodation'
    | 'Jobs'
    | 'Student Services'
    | 'Newsletter'
    | 'Announcement';
  summary: string;
  content: string;
  ctaLabel?: string;
  ctaLink?: string;
  status: 'Published' | 'Draft' | 'Archived';
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// =========================================================
// MASTER ADMIN UPGRADE: HOMEPAGE CMS, SIM GROUPS & COMMUNITY
// =========================================================

export type HomepageMainCategoryId =
  | 'university'
  | 'learn_korean'
  | 'accommodation'
  | 'tickets_transport'
  | 'sim'
  | 'others';

export interface HomepageCategoryTranslationItem {
  title: string;
  shortDescription: string;
  ctaLabel?: string;
  badgeText?: string;
}

export interface HomepageCmsCategoryRecord {
  id: HomepageMainCategoryId | string;
  slug: string;
  route: string;
  title: string;
  shortDescription: string;
  iconName: 'GraduationCap' | 'BookOpen' | 'Building' | 'Plane' | 'Smartphone' | 'Compass' | string;
  visualAssetUrl?: string;
  badgeText?: string;
  ctaLabel: string;
  displayOrder: number;
  visible: boolean;
  published: boolean;
  featured: boolean;
  status: 'published' | 'draft' | 'archived';
  translations: Partial<Record<LanguageCode, HomepageCategoryTranslationItem>>;
  updatedAt: string;
  updatedBy?: string;
}

export interface HomepageCmsNestedServiceRecord {
  id: string;
  parentCategoryId: HomepageMainCategoryId | string;
  subcategoryName: string;
  serviceTitle: string;
  shortDescription: string;
  detailedContent: string;
  routeOrExternalUrl: string;
  iconName: string;
  badgeText?: string;
  displayOrder: number;
  visible: boolean;
  published: boolean;
  featured: boolean;
  status: 'published' | 'draft' | 'archived';
  translations?: Partial<
    Record<
      LanguageCode,
      {
        subcategoryName?: string;
        serviceTitle: string;
        shortDescription: string;
        detailedContent?: string;
      }
    >
  >;
  updatedAt: string;
  updatedBy?: string;
}

export interface SimArrivalGroupSnapshotStudent {
  applicationId: string;
  userId: string;
  fullName: string;
  universityName: string;
  country: string;
  whatsappNumber: string;
  arrivalDate: string;
  arrivalTime: string;
  arrivalAirport: string;
  airportCode: string;
  flightNumber: string;
  passportStatus: 'Uploaded' | 'Missing';
  airticketStatus: 'Uploaded' | 'Missing';
  applicationStatus: SimApplicationStatus;
  submissionTimestamp: string;
}

export interface SimArrivalGroupRecord {
  id: string;
  groupName: string;
  airport: string;
  airportCode: 'ICN' | 'PUS' | 'GMP' | 'CJU' | 'TAE' | 'CJJ' | 'OTHER';
  arrivalDate: string;
  studentApplicationIds: string[];
  studentSnapshots: SimArrivalGroupSnapshotStudent[];
  notes?: string;
  status: 'Active' | 'Exported' | 'Completed' | 'Archived';
  lastExportedAt?: string;
  snapshotUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
}

export interface SimExportHistoryRecord {
  id: string;
  exportType: 'EXCEL' | 'SINGLE_STUDENT_ZIP' | 'BULK_STUDENTS_ZIP' | 'ARRIVAL_GROUP_PACKAGE';
  fileName: string;
  airportCode: string;
  arrivalDate: string;
  arrivalGroupId?: string;
  arrivalGroupName?: string;
  totalStudents: number;
  completeSubmissionsCount: number;
  missingDocumentsCount: number;
  failedDownloadsCount: number;
  exportedByUid: string;
  exportedByName: string;
  exportedByEmail: string;
  exportedAt: string;
}

export interface CommunityLikeRecord {
  id: string; // matches userId
  postId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
}

export interface CommunityCommentRecord {
  id: string;
  postId: string;
  parentCommentId?: string | null; // null/undefined for top-level comment, commentId for reply
  authorUid: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorRole?: string;
  verifiedStudent?: boolean;
  content: string;
  likesCount: number;
  likedByUids: string[];
  status: 'published' | 'hidden' | 'deleted' | 'flagged';
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityUserRestrictionRecord {
  userId: string;
  userName: string;
  userEmail: string;
  canPost: boolean;
  canComment: boolean;
  canLike: boolean;
  restrictionStatus: 'active' | 'posting_restricted' | 'commenting_restricted' | 'community_suspended';
  reason: string;
  restrictedUntil?: string | null;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

export interface CommunityModerationReportRecord {
  id: string;
  targetType: 'post' | 'comment' | 'reply' | 'user';
  targetId: string;
  postId?: string;
  targetTitleOrSnippet: string;
  targetAuthorUid?: string;
  targetAuthorName?: string;
  reporterUid: string;
  reporterName: string;
  reporterEmail?: string;
  reasonCategory: 'Spam' | 'Scam or Fraud' | 'Harassment' | 'Misinformation' | 'Inappropriate Content' | 'Other';
  details: string;
  status: 'Pending' | 'Reviewed' | 'Action Taken' | 'Dismissed';
  moderationAction?: string;
  moderationNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// =========================================================
// CONTACT FORM & ADMIN INQUIRY INBOX TYPES
// =========================================================

export type ContactSubmissionStatus =
  | 'New'
  | 'Read'
  | 'In Progress'
  | 'Resolved'
  | 'Closed';

export type ContactInquiryCategory =
  | 'General Inquiry'
  | 'Partnership & Universities'
  | 'Employer Verification'
  | 'Report an Issue'
  | 'Admissions & Scholarships'
  | 'Visa & Immigration'
  | 'Accommodation & Housing'
  | string;

export interface ContactInternalNote {
  id: string;
  note: string;
  authorUid: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
}

export interface ContactReplyRecord {
  id: string;
  subject: string;
  message: string;
  senderUid: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string;
  replyTo: string;
  sentAt: string;
  deliveryStatus: 'sent' | 'accepted' | 'failed';
  provider?: string;
  messageId?: string;
  errorReason?: string;
}

export interface ContactSubmissionRecord {
  id: string;
  submissionId: string;
  ticketId: string;
  fullName: string;
  name: string;
  email: string;
  category: ContactInquiryCategory;
  subject: string;
  message: string;
  userId: string | null;
  isAuthenticatedUser: boolean;
  userRole?: string;
  userUniversity?: string;
  userNationality?: string;
  userEmailVerified?: boolean;
  userLanguage: string;
  status: ContactSubmissionStatus;
  unread: boolean;
  archived: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  assignedStaffEmail?: string | null;
  internalNotes: ContactInternalNote[];
  replies: ContactReplyRecord[];
  lastRepliedAt?: string | null;
  lastRepliedBy?: string | null;
  readAt?: string | null;
  readBy?: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInboxAnalytics {
  totalInquiries: number;
  activeInquiries: number;
  archivedInquiries: number;
  newInquiries: number;
  unreadInquiries: number;
  readInquiries: number;
  inProgressInquiries: number;
  resolvedInquiries: number;
  closedInquiries: number;
  todaysInquiries: number;
  categoryBreakdown: Record<string, number>;
}

// =========================================================
// UNIVERSITY ADMISSION DEADLINE MANAGEMENT SYSTEM TYPES
// =========================================================

export type AdmissionIntakeType = 'Spring' | 'Fall' | 'Other';

export type DeadlinePublicationStatus = 'published' | 'unpublished';

export interface UniversityAdmissionDeadlineRecord {
  id: string;
  universityId: string;
  universityName: string;
  logoStoragePath: string;
  logoDownloadUrl: string;
  logoFallbackDataUrl?: string;
  logoFileName: string;
  logoMimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml' | string;
  logoFileSize: number;
  admissionIntake: AdmissionIntakeType;
  intakeLabel?: string;
  applicationDeadline: string; // YYYY-MM-DD (interpreted in Korea Standard Time, Asia/Seoul)
  deadlineTimestampMs: number; // End-of-day KST timestamp in ms
  publicationStatus: DeadlinePublicationStatus;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdByUid: string;
  createdByEmail: string;
  updatedByUid: string;
  updatedByEmail: string;
}

export interface UniversityDeadlineCarouselConfig {
  carouselEnabled: boolean;
  initialized: boolean;
  deletedIds?: string[];
  updatedAt: string;
  updatedByUid?: string;
  updatedByEmail?: string;
}
