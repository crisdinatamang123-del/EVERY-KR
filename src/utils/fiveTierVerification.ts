/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Standardized 5-Tier Verification System & 8-Part Completeness Helpers
 *
 * Enforces transparent provenance across the 25 Approved Priority Universities
 * and the 113 Preserved Historical Archive Universities without fabricating data.
 */

import type { University } from '../types';
import type {
  CompleteUniversityRelationalBundle,
  EightPartCompletenessChecklist,
  FiveTierVerificationStatus,
  RelationalAdmissionDeadlineRecord,
  RelationalScholarshipRow,
  RelationalTuitionFeeRow,
  RelationalUniversityContactRow,
  RelationalUniversityImageRow,
  RelationalUniversityLogoRow,
  RelationalVerificationStatus,
} from '../data/universities25/relationalTypes';

export type { FiveTierVerificationStatus, EightPartCompletenessChecklist };

export const ALL_FIVE_VERIFICATION_TIERS: readonly FiveTierVerificationStatus[] = [
  'Officially verified',
  'Available, not independently verified',
  'Estimated',
  'Not announced',
  'Outdated',
] as const;

export interface FiveTierDefinition {
  tier: FiveTierVerificationStatus;
  shortLabel: string;
  description: string;
}

export const FIVE_TIER_DEFINITIONS: readonly FiveTierDefinition[] = [
  {
    tier: 'Officially verified',
    shortLabel: 'Officially verified',
    description:
      'Confirmed directly against an official university (.ac.kr) portal, official OIA admission guideline, or verified schedule document with stored source URL and check date.',
  },
  {
    tier: 'Available, not independently verified',
    shortLabel: 'Available, not independently verified',
    description:
      'Available in preserved institutional records or recruitment sheets, or flagged for manual cross-check against the latest university notice before final submission.',
  },
  {
    tier: 'Estimated',
    shortLabel: 'Estimated',
    description:
      'Approximate date marked (Approx.) or 2026–2027 institutional reference range; exact department invoice or cohort date varies by major.',
  },
  {
    tier: 'Not announced',
    shortLabel: 'Not announced',
    description:
      'Not yet published by the university Office of International Affairs for the target intake cycle.',
  },
  {
    tier: 'Outdated',
    shortLabel: 'Outdated',
    description:
      'Prior-year (2026 or earlier) historical admission cycle retained strictly as an archive reference; do not use for 2027 applications.',
  },
] as const;

export function mapRelationalStatusToFiveTier(
  status: RelationalVerificationStatus | string | undefined,
  options?: { isApproximate?: boolean; isReferenceRange?: boolean; isHistorical?: boolean }
): FiveTierVerificationStatus {
  if (options?.isHistorical || status === 'Outdated') {
    return 'Outdated';
  }
  if (options?.isApproximate || options?.isReferenceRange || status === 'Estimated') {
    return 'Estimated';
  }
  if (!status || status === 'Not Available' || status === 'Not Announced' || status === 'Not announced') {
    return 'Not announced';
  }
  if (status === 'Officially verified' || status === 'Verified' || status === 'VERIFIED') {
    return 'Officially verified';
  }
  if (
    status === 'Available, not independently verified' ||
    status === 'Partially Verified' ||
    status === 'PARTIALLY VERIFIED' ||
    status === 'Needs Verification' ||
    status === 'PENDING VERIFICATION' ||
    status === 'NOT OFFICIALLY VERIFIED' ||
    status === 'CONFLICTING SOURCES'
  ) {
    return 'Available, not independently verified';
  }
  return 'Available, not independently verified';
}

export function getLogoFiveTierStatus(logo?: RelationalUniversityLogoRow | null): FiveTierVerificationStatus {
  if (logo?.verified && logo.localAssetPath) {
    return 'Officially verified';
  }
  return 'Available, not independently verified';
}

export function getGalleryFiveTierStatus(images?: RelationalUniversityImageRow[] | null): FiveTierVerificationStatus {
  if (images && images.some((img) => img.verified && img.localOrOfficialUrl)) {
    return 'Officially verified';
  }
  return 'Not announced';
}

export function getTuitionRowFiveTierStatus(row: RelationalTuitionFeeRow): FiveTierVerificationStatus {
  if (row.verificationStatus === 'Outdated') {
    return 'Outdated';
  }
  if (row.tuitionPerSemesterKrwMin === null && row.tuitionPerSemesterKrwMax === null) {
    return 'Not announced';
  }
  if (row.verificationStatus === 'Verified' && !row.academicYear.toLowerCase().includes('reference')) {
    return 'Officially verified';
  }
  const isReferenceRange =
    row.academicYear.toLowerCase().includes('reference') ||
    row.academicYear.toLowerCase().includes('est') ||
    row.verificationStatus === 'Needs Verification';
  if (isReferenceRange) {
    return 'Estimated';
  }
  if (row.verificationStatus === 'Verified') {
    return 'Officially verified';
  }
  return 'Available, not independently verified';
}

export function getUniversityTuitionFiveTierStatus(uni: University): FiveTierVerificationStatus {
  if (uni.tuitionVerified && uni.tuitionPerSemesterKRW) {
    return 'Officially verified';
  }
  const bundle = uni.relationalBundle;
  if (bundle && bundle.tuitionFees.length > 0) {
    const statuses = bundle.tuitionFees.map(getTuitionRowFiveTierStatus);
    if (statuses.some((s) => s === 'Officially verified')) return 'Officially verified';
    if (statuses.some((s) => s === 'Estimated')) return 'Estimated';
    return 'Not announced';
  }
  if (!uni.tuitionPerSemesterKRW) {
    return 'Not announced';
  }
  return uni.isApproved25 ? 'Estimated' : 'Available, not independently verified';
}

export function getScholarshipRowFiveTierStatus(row: RelationalScholarshipRow): FiveTierVerificationStatus {
  if (row.verificationStatus === 'Outdated') return 'Outdated';
  if (row.verificationStatus === 'Not Available') return 'Not announced';
  if (row.verificationStatus === 'Verified') return 'Officially verified';
  return 'Available, not independently verified';
}

export function getDeadlineRoundFiveTierStatus(round: RelationalAdmissionDeadlineRecord): FiveTierVerificationStatus {
  if (round.intakeYear < 2027 || round.verificationStatus === 'Outdated') {
    return 'Outdated';
  }
  if (
    round.roundActiveStatus === 'Not Announced' ||
    (round.onlineApplicationRaw === 'Not Announced' &&
      round.roundActiveStatus !== 'Closed in Sheet (Strikethrough)' &&
      round.roundActiveStatus !== 'No Recruitment (X)')
  ) {
    return 'Not announced';
  }
  if (round.flaggedForManualVerification) {
    return 'Available, not independently verified';
  }
  if (round.isApproximate) {
    return 'Estimated';
  }
  if (round.verificationStatus === 'Verified') {
    return 'Officially verified';
  }
  return 'Available, not independently verified';
}

export function getUniversityDeadlinesFiveTierStatus(
  deadlines: RelationalAdmissionDeadlineRecord[] | undefined
): FiveTierVerificationStatus {
  if (!deadlines || deadlines.length === 0) {
    return 'Not announced';
  }
  const rounds2027 = deadlines.filter((d) => d.intakeYear === 2027);
  if (rounds2027.length === 0) {
    return deadlines.some((d) => d.intakeYear < 2027) ? 'Outdated' : 'Not announced';
  }
  const announced = rounds2027.filter(
    (d) => d.roundActiveStatus !== 'Not Announced' && d.onlineApplicationRaw !== 'Not Announced'
  );
  if (announced.length === 0) {
    return 'Not announced';
  }
  if (announced.some((d) => d.flaggedForManualVerification)) {
    return 'Available, not independently verified';
  }
  if (announced.every((d) => d.isApproximate)) {
    return 'Estimated';
  }
  return 'Officially verified';
}

export function getContactFieldFiveTierStatus(
  value: string | undefined,
  contacts?: RelationalUniversityContactRow
): FiveTierVerificationStatus {
  if (!value || value === 'Not Announced' || value.trim() === '') {
    return 'Not announced';
  }
  if (value.includes('Not officially verified')) {
    return 'Available, not independently verified';
  }
  if (contacts?.verificationStatus === 'Verified') {
    return 'Officially verified';
  }
  return 'Officially verified';
}

export function getUniversityOverallFiveTierStatus(uni: University): FiveTierVerificationStatus {
  if (uni.fiveTierVerificationStatus) {
    return uni.fiveTierVerificationStatus;
  }
  if (!uni.isApproved25 && uni.recordTier !== 'approved_25') {
    return uni.verified ? 'Officially verified' : 'Available, not independently verified';
  }
  const bundle = uni.relationalBundle;
  if (!bundle) {
    return uni.verified ? 'Officially verified' : 'Available, not independently verified';
  }
  const hasLogo = Boolean(bundle.logo.verified && bundle.logo.localAssetPath);
  const hasWebsite = Boolean(bundle.university.officialWebsiteUrl);
  if (hasLogo && hasWebsite) {
    return 'Officially verified';
  }
  return 'Available, not independently verified';
}

export function evaluateEightPartChecklistFromUniversity(
  uni: University,
  bundle?: CompleteUniversityRelationalBundle
): EightPartCompletenessChecklist {
  const targetBundle = bundle || uni.relationalBundle;
  if (targetBundle?.completeness?.eightPartChecklist) {
    return targetBundle.completeness.eightPartChecklist;
  }

  const basicInfoComplete = Boolean(
    (uni.officialName || uni.name) &&
      uni.koreanName &&
      uni.officialWebsite &&
      uni.internationalOfficeUrl &&
      uni.locationAddress &&
      !uni.locationAddress.includes('Not officially verified')
  );
  const officialLogoVerified = Boolean(uni.logoVerified && uni.logoUrl);
  const campusImagesVerified = Boolean(
    uni.campusImage &&
      !uni.campusImage.includes('images.unsplash.com') &&
      !uni.campusImage.includes('university_campus_seoul_')
  );
  const programsVerified = Boolean(uni.programsVerified && uni.programs && uni.programs.length > 0);
  const requirementsVerified = Boolean(uni.admissionRequirements?.verified);
  const tuitionVerified = Boolean(uni.tuitionVerified && uni.tuitionPerSemesterKRW);
  const scholarshipsVerified = Boolean(uni.scholarshipVerified && uni.scholarships && uni.scholarships.length > 0);
  const deadlinesVerified = Boolean(uni.deadlines?.verified);
  const officialLinksVerified = Boolean(uni.officialWebsite && uni.internationalOfficeUrl);

  const passedCount = [
    basicInfoComplete,
    officialLogoVerified,
    campusImagesVerified,
    programsVerified,
    requirementsVerified,
    tuitionVerified,
    scholarshipsVerified,
    deadlinesVerified,
  ].filter(Boolean).length;

  return {
    basicInfoComplete,
    officialLogoVerified,
    campusImagesVerified,
    programsVerified,
    requirementsVerified,
    tuitionVerified,
    scholarshipsVerified,
    deadlinesVerified,
    officialLinksVerified,
    passedCount,
    totalCount: 8,
  };
}
