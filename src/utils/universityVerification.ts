import {
  University,
  UniversityPublicationGate,
  UniversityAccuracyAuditItem,
  StrictVerificationStatus,
  UNVERIFIED_UNIVERSITY_MESSAGE
} from '../types';

export { UNVERIFIED_UNIVERSITY_MESSAGE };

export function hasGenuineKoreanHangul(text?: string): boolean {
  if (!text) return false;
  if (text.includes('(한국)')) return false;
  return /[가-힣]/.test(text);
}

export function isSyntheticLegacyUrl(url?: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (
    lower.includes('-university.ac.kr') ||
    lower.includes('university.ac.kr') ||
    lower.includes('campus.ac.kr') ||
    lower.includes('-college.ac.kr')
  ) {
    return true;
  }
  return false;
}

export function evaluateUniversityPublicationGate(uni: University): UniversityPublicationGate {
  const officialEnglishName = Boolean(
    (uni.officialName || uni.name) &&
      !uni.name.includes('New Korean University') &&
      uni.name !== UNVERIFIED_UNIVERSITY_MESSAGE
  );

  const officialKoreanName = Boolean(
    uni.koreanName &&
      uni.koreanNameVerified !== false &&
      hasGenuineKoreanHangul(uni.koreanName)
  );

  const officialLogo = Boolean(
    uni.logoVerified === true &&
      uni.logoUrl &&
      uni.logoUrl.trim().length > 0 &&
      uni.logoSourceUrl &&
      uni.logoSourceUrl.trim().length > 0 &&
      uni.logoRetrievedAt &&
      uni.logoRetrievedAt.trim().length > 0
  );

  const universityIdentity = Boolean(
    uni.type &&
      ['National', 'Public', 'Private', 'Institute of Science & Technology'].includes(uni.type) &&
      uni.typeVerified !== false
  );

  const verifiedCampusAndAddress = Boolean(
    uni.campusVerified === true &&
      uni.locationAddress &&
      uni.locationAddress !== 'Republic of Korea' &&
      !uni.locationAddress.includes(UNVERIFIED_UNIVERSITY_MESSAGE) &&
      !uni.locationAddress.includes(', Republic of Korea')
  );

  const officialWebsite = Boolean(
    uni.officialWebsiteVerified === true &&
      uni.officialWebsite &&
      !isSyntheticLegacyUrl(uni.officialWebsite)
  );

  const internationalAdmissionsSource = Boolean(
    uni.internationalAdmissionsVerified === true &&
      uni.internationalOfficeUrl &&
      !isSyntheticLegacyUrl(uni.internationalOfficeUrl)
  );

  const admissionCategories = Boolean(
    uni.internationalAdmissionCategories &&
      Object.values(uni.internationalAdmissionCategories).some(
        cat => cat.verificationStatus === 'VERIFIED' && cat.available === 'Yes'
      )
  );

  const currentAdmissionCycle = Boolean(
    uni.deadlines?.verified === true &&
      uni.deadlines?.springSemester &&
      !uni.deadlines.springSemester.includes(UNVERIFIED_UNIVERSITY_MESSAGE) &&
      uni.deadlines.springSemester !== 'Late October (Previous Year)'
  );

  const tuitionSource = Boolean(
    uni.tuitionVerified === true &&
      uni.tuitionPerSemesterKRW &&
      uni.tuitionPerSemesterKRW.max > 0 &&
      uni.tuitionSourceUrl &&
      !isSyntheticLegacyUrl(uni.tuitionSourceUrl)
  );

  const scholarshipSource = Boolean(
    uni.scholarshipVerified === true &&
      Array.isArray(uni.scholarships) &&
      uni.scholarships.length > 0 &&
      !uni.scholarships[0].includes(UNVERIFIED_UNIVERSITY_MESSAGE) &&
      uni.scholarshipSourceUrl &&
      !isSyntheticLegacyUrl(uni.scholarshipSourceUrl)
  );

  const sourceUrlsStored = Boolean(
    uni.fieldProvenance &&
      Object.keys(uni.fieldProvenance).length >= 6 &&
      Array.isArray(uni.sourceUrls) &&
      uni.sourceUrls.length > 0
  );

  const adminApproved = Boolean(uni.adminApprovedVerified === true);

  const missingItems: string[] = [];
  if (!officialEnglishName) missingItems.push('Official English name');
  if (!officialKoreanName) missingItems.push('Official Korean name (Hangul)');
  if (!officialLogo) missingItems.push('Official university logo from university-controlled source');
  if (!universityIdentity) missingItems.push('University category / identity confirmation');
  if (!verifiedCampusAndAddress) missingItems.push('Verified campus street address (Korean & English)');
  if (!officialWebsite) missingItems.push('Official university website');
  if (!internationalAdmissionsSource) missingItems.push('Official international admissions portal');
  if (!admissionCategories) missingItems.push('International admission programme categories');
  if (!currentAdmissionCycle) missingItems.push('Current official international admission cycle & deadlines');
  if (!tuitionSource) missingItems.push('Official tuition schedule source');
  if (!scholarshipSource) missingItems.push('Official international scholarship policy source');
  if (!sourceUrlsStored) missingItems.push('Field-level provenance & source URLs');
  if (!adminApproved) missingItems.push('Authorized administrator verification approval');

  const allTwelveConfirmed =
    officialEnglishName &&
    officialKoreanName &&
    officialLogo &&
    universityIdentity &&
    verifiedCampusAndAddress &&
    officialWebsite &&
    internationalAdmissionsSource &&
    admissionCategories &&
    currentAdmissionCycle &&
    tuitionSource &&
    scholarshipSource &&
    sourceUrlsStored;

  const allPassed = allTwelveConfirmed && adminApproved;

  return {
    officialEnglishName,
    officialKoreanName,
    officialLogo,
    universityIdentity,
    verifiedCampusAndAddress,
    officialWebsite,
    internationalAdmissionsSource,
    admissionCategories,
    currentAdmissionCycle,
    tuitionSource,
    scholarshipSource,
    sourceUrlsStored,
    adminApproved,
    allPassed,
    missingItems
  };
}

export function isStrictlyVerifiedUniversity(uni: University): boolean {
  const gate = evaluateUniversityPublicationGate(uni);
  return gate.allPassed;
}

export function getUniversityStrictStatus(uni: University): StrictVerificationStatus {
  const gate = evaluateUniversityPublicationGate(uni);
  if (gate.allPassed) {
    return 'VERIFIED';
  }
  const passedCount = [
    gate.officialEnglishName,
    gate.officialKoreanName,
    gate.officialLogo,
    gate.universityIdentity,
    gate.verifiedCampusAndAddress,
    gate.officialWebsite,
    gate.internationalAdmissionsSource,
    gate.admissionCategories,
    gate.currentAdmissionCycle,
    gate.tuitionSource,
    gate.scholarshipSource,
    gate.sourceUrlsStored
  ].filter(Boolean).length;

  if (passedCount >= 5) {
    return 'PENDING VERIFICATION';
  }
  return 'NOT OFFICIALLY VERIFIED';
}

export function generateUniversityAccuracyAuditReport(
  universities: University[]
): UniversityAccuracyAuditItem[] {
  return universities.map(uni => {
    const gate = evaluateUniversityPublicationGate(uni);
    const status = getUniversityStrictStatus(uni);
    const urls = Array.from(
      new Set(
        [
          ...(uni.sourceUrls || []),
          uni.officialWebsiteVerified ? uni.officialWebsite : undefined,
          uni.internationalAdmissionsVerified ? uni.internationalOfficeUrl : undefined,
          uni.logoVerified ? uni.logoSourceUrl : undefined,
          uni.tuitionVerified ? uni.tuitionSourceUrl : undefined,
          uni.scholarshipVerified ? uni.scholarshipSourceUrl : undefined
        ].filter((u): u is string => Boolean(u && !isSyntheticLegacyUrl(u)))
      )
    );

    return {
      id: uni.id,
      universityName: uni.name,
      koreanName: hasGenuineKoreanHangul(uni.koreanName)
        ? uni.koreanName
        : UNVERIFIED_UNIVERSITY_MESSAGE,
      campusName: uni.campusName || 'Main Campus',
      officialLogoVerified: gate.officialLogo ? 'Yes' : 'No',
      officialWebsiteVerified: gate.officialWebsite ? 'Yes' : 'No',
      campusInformationVerified: gate.verifiedCampusAndAddress ? 'Yes' : 'No',
      internationalAdmissionsVerified: gate.internationalAdmissionsSource ? 'Yes' : 'No',
      admissionGuideFound: uni.admissionGuideFound ? 'Yes' : 'No',
      tuitionVerified: gate.tuitionSource ? 'Yes' : 'No',
      scholarshipVerified: gate.scholarshipSource ? 'Yes' : 'No',
      sourceUrls: urls,
      missingInformation: gate.missingItems,
      overallVerificationStatus: status
    };
  });
}

export function sanitizeLegacyUniversityRecord(
  record: University,
  masterById: Map<string, University>
): University {
  const master = masterById.get(record.id);
  const hasLegacyFabrication =
    record.koreanName?.includes('(한국)') ||
    record.contactPhone === '+82-2-1345' ||
    isSyntheticLegacyUrl(record.officialWebsite) ||
    !record.fieldProvenance;

  if (master && hasLegacyFabrication) {
    return {
      ...master,
      id: record.id
    };
  }

  const gate = evaluateUniversityPublicationGate(record);
  const strictStatus = getUniversityStrictStatus(record);
  return {
    ...record,
    verified: gate.allPassed,
    verificationStatus: gate.allPassed ? 'Verified' : 'Pending Verification',
    strictVerificationStatus: strictStatus,
    publicationGate: gate
  };
}
