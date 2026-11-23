/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EveryKR 15-Table Relational University Database Schema
 * Supports strict source provenance, real-data completeness scoring,
 * multi-round admission schedules (preserving 2026 vs 2027 separation),
 * and full backward compatibility with EveryKR frontend & Firestore.
 */

export type RelationalVerificationStatus =
  | 'Verified'
  | 'Partially Verified'
  | 'Needs Verification'
  | 'Not Available'
  | 'Outdated';

export type FiveTierVerificationStatus =
  | 'Officially verified'
  | 'Available, not independently verified'
  | 'Estimated'
  | 'Not announced'
  | 'Outdated';

export type VerificationStatusLabel = RelationalVerificationStatus;

export type ProgramCategoryCode =
  | 'KLP' // Korean Language Program
  | 'EAP' // English Academic Program / English Track
  | 'Associate'
  | 'Bachelor'
  | 'Master'
  | 'PhD'
  | 'Graduate'
  | 'Exchange'
  | 'Special';

/** 1. universities */
export interface RelationalUniversityRow {
  id: string;
  slug: string;
  whitelistOrder: number; // 1..25
  englishName: string;
  koreanName: string;
  shortName: string;
  institutionCategory: 'National' | 'Private';
  institutionSubtypeLabel: string;
  foundedYear: number;
  foundedYearVerified: boolean;
  officialWebsiteUrl: string;
  internationalOfficeWebsiteUrl: string;
  primaryCity: string;
  primaryProvince: string;
  regionFilterGroup: string;
  postalCode: string;
  mainAddressEn: string;
  mainAddressKo: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string;
  overviewDescription: string;
  academicStrengths: string[];
  internationalStudentOverview: string;
  legacySlugsAndAliases: string[];
  verificationStatus: RelationalVerificationStatus;
  lastVerifiedDate: string;
  completenessPercentage: number;
  updatedAt: string;
}

/** 2. university_campuses */
export interface RelationalUniversityCampusRow {
  id: string;
  universityId: string;
  campusName: string;
  campusNameKo: string;
  isMainCampus: boolean;
  city: string;
  province: string;
  postalCode: string;
  addressEn: string;
  addressKo: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string;
  nearestSubwayOrStation: string;
  nearestBusOrTransitInfo: string;
  collegesAndFaculties: string[];
  dormitoriesSummary: string;
  librarySummary: string;
  sportsFacilitiesSummary: string;
  cafeteriasSummary: string;
  studentSupportFacilitiesSummary: string;
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
}

/** 3. university_logos */
export interface RelationalUniversityLogoRow {
  id: string;
  universityId: string;
  localAssetPath: string; // Empty string if Missing Verified Logo
  officialSourceUrl: string;
  sourcePageUrl: string;
  format: 'svg' | 'png' | 'jpg' | 'gif' | 'webp' | 'missing';
  verified: boolean;
  missingLogoStatus: boolean;
  verificationStatus: RelationalVerificationStatus;
  retrievedAt: string;
  notes: string;
}

/** 4. university_images */
export interface RelationalUniversityImageRow {
  id: string;
  universityId: string;
  category: 'campus' | 'main_building' | 'library' | 'dormitory' | 'student_center' | 'classroom_lab' | 'banner';
  caption: string;
  localOrOfficialUrl: string;
  sourceUrl: string;
  sourcePageUrl: string;
  attribution: string;
  verified: boolean;
  verificationStatus: RelationalVerificationStatus;
  retrievedAt: string;
}

/** 5. university_programs */
export interface RelationalUniversityProgramRow {
  id: string;
  universityId: string;
  categoryCode: ProgramCategoryCode;
  categoryLabel: string;
  programNameEn: string;
  programNameKo?: string;
  collegeOrFaculty: string;
  degreeLevel: string;
  languageOfInstruction: 'Korean' | 'English' | 'Korean & English' | 'Not Announced';
  campusName: string;
  duration: string;
  internationalAdmissionAvailable: 'Yes' | 'No' | 'Needs Verification';
  admissionIntake?: string;
  applicationFeeKrw?: number | 'Not Announced';
  additionalFeesSummary?: string;
  scholarshipEligibility?: string;
  lastVerifiedDate?: string;
  notes?: string;
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
}

/** 6. admission_requirements */
export interface RelationalAdmissionRequirementRow {
  id: string;
  universityId: string;
  degreeLevel: 'Korean Language Program' | 'Associate' | 'Undergraduate' | 'Master' | 'PhD';
  nationalityEligibility: string;
  academicQualification: string;
  minimumGpaOrAcademicStanding: string;
  studyGapPolicy: string;
  interviewRequired: string;
  portfolioOrAuditionRequired: string;
  researchProposalOrAdvisorRequired: string;
  financialProofRequirement: string;
  additionalDepartmentRequirements?: string;
  lastVerifiedDate?: string;
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
}

/** 7. language_requirements */
export interface RelationalLanguageRequirementRow {
  id: string;
  universityId: string;
  degreeLevel: 'Korean Language Program' | 'Associate' | 'Undergraduate' | 'Master' | 'PhD';
  koreanTrackTopik: string;
  englishTrackScore: string;
  universityLanguageTestAccepted: string;
  conditionalAdmissionAvailable: string;
  koreanLanguageInstituteReplacement: string;
  lastVerifiedDate?: string;
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
}

/** 8. tuition_fees */
export interface RelationalTuitionFeeRow {
  id: string;
  universityId: string;
  programId?: string;
  degreeOrProgramType: ProgramCategoryCode | 'General';
  departmentTrackLabel: string;
  applicationFeeKrw: number | 'Not Announced';
  entranceAdmissionFeeKrw: number | 'Not Announced';
  tuitionPerSemesterKrwMin: number | null;
  tuitionPerSemesterKrwMax: number | null;
  estimatedAnnualTuitionKrwMin: number | null;
  estimatedAnnualTuitionKrwMax: number | null;
  totalProgramTuitionKrwMin?: number | null;
  totalProgramTuitionKrwMax?: number | null;
  dormitoryFeeKrwRange: string;
  insuranceFeeKrwAnnual: string;
  estimatedLivingCostMonthlyKrw: string;
  academicYear: string;
  currency: 'KRW';
  notes: string;
  lastVerifiedDate?: string;
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
}

/** 9. scholarships */
export type ScholarshipCategoryGroup =
  | 'Admission Scholarships'
  | 'Academic Performance Scholarships'
  | 'TOPIK Scholarships'
  | 'International Student Scholarships'
  | 'Government Scholarships (GKS)'
  | 'Other University Scholarships';

export interface RelationalScholarshipRow {
  id: string;
  universityId: string;
  scholarshipType:
    | 'Admission Scholarship'
    | 'TOPIK-Based Scholarship'
    | 'English Score Scholarship'
    | 'Continuing GPA Scholarship'
    | 'GKS (Global Korea Scholarship)'
    | 'Department / Research Scholarship';
  scholarshipCategory?: ScholarshipCategoryGroup;
  fundingSource?: 'University-Funded' | 'Government-Funded (GKS)';
  fullOrPartial?: 'Full Scholarship' | 'Partial Scholarship' | 'Tiered (Partial to Full)' | 'Not yet verified';
  scholarshipName: string;
  targetDegreeLevel: string;
  benefitCoverage: string;
  tuitionReductionSummary?: string;
  eligibilityCriteria: string;
  academicRequirement?: string;
  languageRequirement?: string;
  duration?: string;
  gpaMaintenanceRequirement: string;
  continuationConditions: string;
  applicationProcedure?: string;
  relevantIntake?: string;
  lastVerifiedDate?: string;
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
}

/** 10. admission_deadlines */
export interface RelationalAdmissionDeadlineRecord {
  id: string;
  universityId: string;
  intakeYear: 2026 | 2027;
  intakeSemester: 'Spring (March)' | 'Fall (September)' | 'Summer / Winter (Language)';
  intakeLabel: string;
  degreeLevel: 'KLP' | 'EAP' | 'Associate' | 'Bachelor' | 'Masters' | 'PhD';
  programCategory: ProgramCategoryCode;
  applicationRound: 'Round 1' | 'Round 2' | 'Round 3' | 'General Recruitment';
  roundActiveStatus: 'Open / Upcoming' | 'Closed in Sheet (Strikethrough)' | 'No Recruitment (X)' | 'Not Announced';
  isApproximate: boolean;
  flaggedForManualVerification: boolean;
  manualVerificationNote?: string;
  fileCollectionStartDate: string;
  fileCollectionEndDate: string;
  fileCollectionRaw: string;
  onlineApplicationStartDate: string;
  onlineApplicationDeadline: string;
  onlineApplicationRaw: string;
  bangladeshTimeDeadline: string;
  dhlDeadlineUniversity: string;
  dhlDeadlineBangladeshOffice: string;
  interviewDate: string;
  interviewFormat: string;
  documentScreeningDate: string;
  admissionResultDate: string;
  additionalDocumentDeadline: string;
  paymentDeadline: string;
  semesterStartingDate: string;
  visaCoaTimeline?: string;
  sourceDocument: string;
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
  lastVerifiedDate: string;
}

/** 11. application_documents */
export interface RelationalApplicationDocumentRow {
  id: string;
  universityId: string;
  applicableLevel: 'All' | 'Associate' | 'Undergraduate' | 'Graduate' | 'KLP';
  documentName: string;
  requirementType: 'Mandatory' | 'Conditional' | 'Optional';
  apostilleOrConsularRequired: boolean;
  translationRequired: string;
  programSpecificNote?: string;
  notes: string;
  lastVerifiedDate?: string;
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
}

/** 12. international_student_services */
export interface RelationalInternationalStudentServiceRow {
  id: string;
  universityId: string;
  d2VisaAvailable: string;
  d4VisaAvailable: string;
  certificateOfAdmissionProcess: string;
  visaProcessDistinctionNote: string;
  arrivalAirportSupport: string;
  orientationProgram: string;
  buddyMentoringProgram: string;
  counselingAndMedicalSupport: string;
  careerAndPartTimeWorkGuidance: string;
  koreanLanguageSupport: string;
  dormitoryPriorityForFreshmen: string;
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
}

/** 13. university_contacts */
export interface RelationalUniversityContactRow {
  id: string;
  universityId: string;
  switchboardPhone: string;
  internationalOfficeName: string;
  internationalOfficePhone: string;
  internationalOfficeEmail: string;
  officeHoursKst: string;
  postalAddressEn: string;
  postalAddressKo: string;
  postalCode: string;
  onlineApplicationPortalUrl: string;
  admissionGuidelineUrl: string;
  kakaoOrSocialLinks: string[];
  sourceUrl: string;
  verificationStatus: RelationalVerificationStatus;
}

/** 14. university_sources */
export interface RelationalUniversitySourceRow {
  id: string;
  universityId: string;
  sourceTitle: string;
  sourceType:
    | 'Official University Website'
    | 'Official International Office / OIA'
    | 'Official Admission Guideline'
    | 'Uploaded Admission Schedule PDF'
    | 'Korean Government / Study in Korea'
    | 'Institutional Reference';
  sourceUrl: string;
  checkedDate: string;
  academicYearCycle: string;
  verifiedFieldsSummary: string;
}

/** 15. university_verification_logs */
export interface RelationalUniversityVerificationLogRow {
  id: string;
  universityId: string;
  actionType: string;
  verifiedBy: string;
  timestamp: string;
  statusAfter: RelationalVerificationStatus;
  summary: string;
}

export interface EightPartCompletenessChecklist {
  basicInfoComplete: boolean;
  officialLogoVerified: boolean;
  campusImagesVerified: boolean;
  programsVerified: boolean;
  requirementsVerified: boolean;
  tuitionVerified: boolean;
  scholarshipsVerified: boolean;
  deadlinesVerified: boolean;
  officialLinksVerified: boolean;
  passedCount: number;
  totalCount: 8;
}

/** Real-time 8-Dimension Data Completeness Breakdown */
export interface UniversityCompletenessBreakdown {
  universityId: string;
  basicInformation: number;
  officialBranding: number;
  campusInformation: number;
  programs: number;
  requirements: number;
  tuition: number;
  scholarships: number;
  deadlines: number;
  overallPercentage: number;
  overallFiveTierStatus: FiveTierVerificationStatus;
  eightPartChecklist: EightPartCompletenessChecklist;
  missingFields: string[];
}

export interface CompleteUniversityRelationalBundle {
  university: RelationalUniversityRow;
  campuses: RelationalUniversityCampusRow[];
  logo: RelationalUniversityLogoRow;
  images: RelationalUniversityImageRow[];
  programs: RelationalUniversityProgramRow[];
  admissionRequirements: RelationalAdmissionRequirementRow[];
  languageRequirements: RelationalLanguageRequirementRow[];
  tuitionFees: RelationalTuitionFeeRow[];
  scholarships: RelationalScholarshipRow[];
  admissionDeadlines: RelationalAdmissionDeadlineRecord[];
  historicalAdmissionCycles?: import('../../types').HistoricalAdmissionCycleRecord[];
  applicationDocuments: RelationalApplicationDocumentRow[];
  internationalStudentServices: RelationalInternationalStudentServiceRow;
  contacts: RelationalUniversityContactRow;
  sources: RelationalUniversitySourceRow[];
  verificationLogs: RelationalUniversityVerificationLogRow[];
  completeness: UniversityCompletenessBreakdown;
}
