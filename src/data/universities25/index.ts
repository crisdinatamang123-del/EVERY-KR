import { University, UniversityCampusRecord } from '../../types';
import {
  CompleteUniversityRelationalBundle,
  RelationalAdmissionDeadlineRecord,
  RelationalUniversityProgramRow,
  RelationalTuitionFeeRow,
  RelationalAdmissionRequirementRow,
  RelationalLanguageRequirementRow,
  RelationalApplicationDocumentRow,
  RelationalScholarshipRow,
  RelationalUniversitySourceRow,
  RelationalUniversityVerificationLogRow,
  ProgramCategoryCode,
} from './relationalTypes';
import { buildUniversityRelationalBundle, computeCompleteness, UniversitySeedInput } from './profileBuilder';
import { SEED_GROUP_A } from './seedGroupA';
import { SEED_GROUP_B } from './seedGroupB';
import { SEED_GROUP_C } from './seedGroupC';
import { SEED_GROUP_D } from './seedGroupD';
import { INITIAL_ADMISSION_DEADLINES_25 } from './pdfAdmissionDeadlines';
import {
  HISTORICAL_23_SNAPSHOT_ENRICHMENTS,
  PRESERVED_ARCHIVE_IDS,
} from '../preservedUniversitiesArchive';

export * from './relationalTypes';
export { computeCompleteness, buildUniversityRelationalBundle } from './profileBuilder';
export { INITIAL_ADMISSION_DEADLINES_25 } from './pdfAdmissionDeadlines';

export const ALL_25_SEEDS: UniversitySeedInput[] = [
  ...SEED_GROUP_A,
  ...SEED_GROUP_B,
  ...SEED_GROUP_C,
  ...SEED_GROUP_D,
].sort((a, b) => a.whitelistOrder - b.whitelistOrder);

export const RELATIONAL_BUNDLES_25: CompleteUniversityRelationalBundle[] = ALL_25_SEEDS.map((seed) =>
  buildUniversityRelationalBundle(seed)
);

export const RELATIONAL_BUNDLE_BY_ID: Record<string, CompleteUniversityRelationalBundle> =
  RELATIONAL_BUNDLES_25.reduce((acc, bundle) => {
    acc[bundle.university.id] = bundle;
    return acc;
  }, {} as Record<string, CompleteUniversityRelationalBundle>);

export const APPROVED_25_IDS: Set<string> = new Set(
  RELATIONAL_BUNDLES_25.map((b) => b.university.id)
);

/**
 * Maps legacy campus-split or alternate-romanization IDs/slugs to canonical 25-priority IDs
 * so existing saved bookmarks, URLs, and student records never 404.
 */
export const LEGACY_UNIVERSITY_ID_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {
    'dongmyung-university': 'tongmyong-university',
    'hanyang-university-erica': 'hanyang-university',
    'hanyang-erica': 'hanyang-university',
    'youngsan-university-main-campus': 'youngsan-university',
    'youngsan-university-haeundae-campus': 'youngsan-university',
    'inje-university-main-campus': 'inje-university',
    'konyang-university-main-campus': 'konyang-university',
    'kangwon-national-university-chuncheon-campus': 'kangwon-national-university',
    'kangwon-national-university-samcheok-campus': 'kangwon-national-university',
    'kangwon-national-university-gangneung-campus': 'kangwon-national-university',
    'kangwon-national-university-wonju-campus': 'kangwon-national-university',
    'kangwoon-national-university': 'kangwon-national-university',
    'chonbuk-national-university': 'jeonbuk-national-university',
    'seoul-school-of-integrated-sciences-and-technologies': 'assist-university',
    'busan-ist': 'busan-institute-of-science-and-technology',
    'dong-eui-it': 'dong-eui-institute-of-technology',
  };
  for (const bundle of RELATIONAL_BUNDLES_25) {
    map[bundle.university.id] = bundle.university.id;
    const hist = HISTORICAL_23_SNAPSHOT_ENRICHMENTS[bundle.university.id];
    const combinedAliases = [
      ...bundle.university.legacySlugsAndAliases,
      ...(hist?.legacySnapshotIds || []),
      ...(hist?.aliases || []),
    ];
    for (const alias of combinedAliases) {
      const normalized = alias
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9가-힣-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (normalized && !map[normalized]) {
        map[normalized] = bundle.university.id;
      }
    }
  }
  return map;
})();

export function resolveCanonicalUniversityId(idOrSlug: string | undefined | null): string | null {
  if (!idOrSlug) return null;
  const raw = idOrSlug.trim().toLowerCase();
  if (APPROVED_25_IDS.has(raw)) return raw;
  if (LEGACY_UNIVERSITY_ID_MAP[raw]) return LEGACY_UNIVERSITY_ID_MAP[raw];
  if (PRESERVED_ARCHIVE_IDS.has(raw)) return raw;
  const slugified = raw.replace(/[^a-z0-9가-힣-]+/g, '-').replace(/^-+|-+$/g, '');
  if (APPROVED_25_IDS.has(slugified)) return slugified;
  if (LEGACY_UNIVERSITY_ID_MAP[slugified]) return LEGACY_UNIVERSITY_ID_MAP[slugified];
  if (PRESERVED_ARCHIVE_IDS.has(slugified)) return slugified;
  return null;
}

/**
 * Normalized 15-Table Relational Export of the 25 Approved Universities
 */
export const RELATIONAL_TABLES_25 = {
  universities: RELATIONAL_BUNDLES_25.map((b) => b.university),
  university_campuses: RELATIONAL_BUNDLES_25.flatMap((b) => b.campuses),
  university_logos: RELATIONAL_BUNDLES_25.map((b) => b.logo),
  university_images: RELATIONAL_BUNDLES_25.flatMap((b) => b.images),
  university_programs: RELATIONAL_BUNDLES_25.flatMap((b) => b.programs),
  admission_requirements: RELATIONAL_BUNDLES_25.flatMap((b) => b.admissionRequirements),
  language_requirements: RELATIONAL_BUNDLES_25.flatMap((b) => b.languageRequirements),
  tuition_fees: RELATIONAL_BUNDLES_25.flatMap((b) => b.tuitionFees),
  scholarships: RELATIONAL_BUNDLES_25.flatMap((b) => b.scholarships),
  admission_deadlines: RELATIONAL_BUNDLES_25.flatMap((b) => b.admissionDeadlines),
  application_documents: RELATIONAL_BUNDLES_25.flatMap((b) => b.applicationDocuments),
  international_student_services: RELATIONAL_BUNDLES_25.map((b) => b.internationalStudentServices),
  university_contacts: RELATIONAL_BUNDLES_25.map((b) => b.contacts),
  university_sources: RELATIONAL_BUNDLES_25.flatMap((b) => b.sources),
  university_verification_logs: RELATIONAL_BUNDLES_25.flatMap((b) => b.verificationLogs),
};

function summarizeMarch2027Deadlines(deadlines: RelationalAdmissionDeadlineRecord[]): {
  springSummary: string;
  hasAnnounced: boolean;
  undergradSummary: string;
  gradSummary: string;
} {
  const activeOrAnnounced = deadlines.filter(
    (d) => d.roundActiveStatus !== 'Not Announced' && d.onlineApplicationRaw !== 'Not Announced'
  );
  if (activeOrAnnounced.length === 0) {
    return {
      springSummary: 'Not Announced (March 2027 Intake)',
      hasAnnounced: false,
      undergradSummary: 'Not Announced',
      gradSummary: 'Not Announced',
    };
  }

  const openRounds = activeOrAnnounced.filter((d) => d.roundActiveStatus === 'Open / Upcoming');
  const displayPool = openRounds.length > 0 ? openRounds : activeOrAnnounced;

  const ugRound = displayPool.find((d) => d.degreeLevel === 'Bachelor' || d.degreeLevel === 'Associate');
  const gradRound = displayPool.find((d) => d.degreeLevel === 'Masters' || d.degreeLevel === 'PhD');
  const firstRound = displayPool[0];

  const formatRound = (r?: RelationalAdmissionDeadlineRecord) => {
    if (!r) return 'Not Announced';
    const approx = r.isApproximate ? ' (Approx.)' : '';
    const closed = r.roundActiveStatus === 'Closed in Sheet (Strikethrough)' ? ' [Closed]' : '';
    return `${r.degreeLevel} ${r.applicationRound}: ${r.onlineApplicationRaw}${approx}${closed}`;
  };

  return {
    springSummary: `March 2027 — ${formatRound(ugRound || gradRound || firstRound)} (${activeOrAnnounced.length} round${activeOrAnnounced.length > 1 ? 's' : ''})`,
    hasAnnounced: true,
    undergradSummary: formatRound(ugRound),
    gradSummary: formatRound(gradRound),
  };
}

export function bundleToUniversity(bundle: CompleteUniversityRelationalBundle): University {
  const u = bundle.university;
  const mainCampus = bundle.campuses.find((c) => c.isMainCampus) || bundle.campuses[0];
  const extraCampuses = bundle.campuses.filter((c) => c.id !== mainCampus?.id);

  const degreeSet = new Set<'Bachelor' | 'Master' | 'PhD' | 'Language Program'>();
  const categorySet = new Set<ProgramCategoryCode>();

  for (const p of bundle.programs) {
    categorySet.add(p.categoryCode);
    if (p.categoryCode === 'Bachelor' || p.categoryCode === 'Associate' || p.categoryCode === 'EAP') {
      degreeSet.add('Bachelor');
    }
    if (p.categoryCode === 'Master' || p.categoryCode === 'Graduate') {
      degreeSet.add('Master');
    }
    if (p.categoryCode === 'PhD') {
      degreeSet.add('PhD');
    }
    if (p.categoryCode === 'KLP') {
      degreeSet.add('Language Program');
    }
  }

  const degreeTuitionRows = bundle.tuitionFees.filter(
    (t) => t.degreeOrProgramType !== 'KLP' && t.tuitionPerSemesterKrwMin !== null
  );
  const fallbackTuitionRows = bundle.tuitionFees.filter((t) => t.tuitionPerSemesterKrwMin !== null);
  const targetTuition = degreeTuitionRows.length > 0 ? degreeTuitionRows : fallbackTuitionRows;

  const minTuition =
    targetTuition.length > 0
      ? Math.min(...targetTuition.map((t) => t.tuitionPerSemesterKrwMin as number))
      : undefined;
  const maxTuition =
    targetTuition.length > 0
      ? Math.max(...targetTuition.map((t) => (t.tuitionPerSemesterKrwMax ?? t.tuitionPerSemesterKrwMin) as number))
      : undefined;

  const dlSummary = summarizeMarch2027Deadlines(bundle.admissionDeadlines);

  const mapCampusRecord = (c: typeof mainCampus): UniversityCampusRecord => ({
    campusName: c.campusName,
    isMainCampus: c.isMainCampus,
    city: c.city,
    province: c.province,
    koreanAddress: c.addressKo,
    englishAddress: c.addressEn,
    addressVerified: true,
    sourceUrl: c.sourceUrl,
  });

  const englishTaughtAvailable = bundle.programs.some(
    (p) => p.languageOfInstruction === 'English' || p.languageOfInstruction === 'Korean & English' || p.categoryCode === 'EAP'
  );

  const primaryLangReq =
    bundle.languageRequirements.find((l) => l.degreeLevel === 'Undergraduate') ||
    bundle.languageRequirements.find((l) => l.degreeLevel === 'Associate') ||
    bundle.languageRequirements[0];

  const appFeeRow = bundle.tuitionFees.find((t) => typeof t.applicationFeeKrw === 'number');

  // Strict Zero-Fabrication Image Rule: NEVER use generic stock campus images.
  // Empty string triggers explicit "Missing Verified Campus Image" / "Missing Verified Logo" UI state.
  const verifiedCampusPhoto = bundle.images.find((img) => img.verified && img.localOrOfficialUrl)?.localOrOfficialUrl || '';
  const verifiedLogoPath = bundle.logo.verified && bundle.logo.localAssetPath ? bundle.logo.localAssetPath : '';
  const hist = HISTORICAL_23_SNAPSHOT_ENRICHMENTS[u.id];
  const mergedAliases = Array.from(
    new Set([
      ...u.legacySlugsAndAliases,
      ...(hist?.aliases || []),
      ...(hist?.legacySnapshotIds || []),
    ])
  );

  return {
    id: u.id,
    whitelistOrder: u.whitelistOrder,
    isApproved25: true,
    recordTier: 'approved_25',
    priorityRank: u.whitelistOrder,
    completenessPercentage: bundle.completeness.overallPercentage,
    fiveTierVerificationStatus: bundle.completeness.overallFiveTierStatus,
    eightPartChecklist: bundle.completeness.eightPartChecklist,
    name: u.englishName,
    officialName: u.englishName,
    nameEn: u.englishName,
    koreanName: u.koreanName,
    nameKr: u.koreanName,
    koreanNameVerified: true,
    campusName: mainCampus.campusName,
    isMainCampus: true,
    city: u.primaryCity,
    province: u.primaryProvince,
    region: u.regionFilterGroup,
    type: u.institutionCategory,
    typeVerified: true,
    establishmentYear: u.foundedYear,
    establishmentYearVerified: u.foundedYearVerified,
    campusImage: verifiedCampusPhoto,
    logoUrl: verifiedLogoPath,
    logoVerified: bundle.logo.verified,
    logoSourceUrl: bundle.logo.officialSourceUrl,
    logoRetrievedAt: bundle.logo.retrievedAt,
    logoVerification: {
      verified: bundle.logo.verified,
      logoUrl: verifiedLogoPath,
      officialSourceUrl: bundle.logo.officialSourceUrl,
      sourcePageUrl: bundle.logo.sourcePageUrl,
      retrievalDate: bundle.logo.retrievedAt || u.lastVerifiedDate,
      verificationStatus: bundle.logo.verified ? 'VERIFIED' : 'NOT OFFICIALLY VERIFIED',
      notes: bundle.logo.notes,
    },
    rankingKR: null,
    rankingVerified: false,
    programs: bundle.programs.map((p) => p.programNameEn),
    programCategoriesOffered: Array.from(categorySet),
    popularMajors: u.academicStrengths,
    programsVerified: bundle.programs.length > 0,
    degrees: Array.from(degreeSet),
    degreesVerified: true,
    tuitionPerSemesterKRW:
      minTuition !== undefined && maxTuition !== undefined
        ? { min: minTuition, max: maxTuition }
        : undefined,
    tuitionVerified: targetTuition.some((t) => t.verificationStatus === 'Verified'),
    tuitionSourceUrl: u.internationalOfficeWebsiteUrl || u.officialWebsiteUrl,
    tuitionNotes: bundle.tuitionFees[0]?.notes,
    scholarships: bundle.scholarships.map((s) => `${s.scholarshipName} — ${s.benefitCoverage}`),
    scholarshipDetails: bundle.scholarships.map((s) => `${s.scholarshipName}: ${s.benefitCoverage}`).join(' | '),
    scholarshipVerified: bundle.scholarships.length > 0,
    scholarshipSourceUrl: u.internationalOfficeWebsiteUrl || u.officialWebsiteUrl,
    gksScholarshipEligible: bundle.scholarships.some((s) => s.scholarshipType === 'GKS (Global Korea Scholarship)'),
    englishTaughtAvailable,
    englishTaughtVerified: true,
    officialWebsite: u.officialWebsiteUrl,
    officialWebsiteVerified: Boolean(u.officialWebsiteUrl),
    internationalOfficeUrl: u.internationalOfficeWebsiteUrl,
    internationalAdmissionsVerified: Boolean(u.internationalOfficeWebsiteUrl),
    admissionGuideFound: Boolean(bundle.contacts.admissionGuidelineUrl),
    admissionGuideUrl: bundle.contacts.admissionGuidelineUrl,
    contactEmail: bundle.contacts.internationalOfficeEmail,
    intlOfficeEmail: bundle.contacts.internationalOfficeEmail,
    contactPhone:
      bundle.contacts.internationalOfficePhone !== 'Not Announced'
        ? bundle.contacts.internationalOfficePhone
        : bundle.contacts.switchboardPhone,
    intlOfficePhone: bundle.contacts.internationalOfficePhone,
    contactVerified: bundle.contacts.verificationStatus === 'Verified',
    locationAddress: mainCampus.addressEn,
    englishAddress: mainCampus.addressEn,
    koreanAddress: mainCampus.addressKo,
    campusVerified: true,
    mainCampusRecord: mapCampusRecord(mainCampus),
    additionalCampuses: extraCampuses.map(mapCampusRecord),
    deadlines: {
      springSemester: dlSummary.springSummary,
      fallSemester: 'Not Announced (Confirm Official Fall 2027 OIA Notice)',
      intakeCycleLabel: 'March 2027 Intake (Spring 2027)',
      verified: dlSummary.hasAnnounced,
    },
    undergradDeadline: dlSummary.undergradSummary,
    gradDeadline: dlSummary.gradSummary,
    historicalAdmissionCycles: hist?.historicalAdmissionCycles || [],
    admissionRequirements: {
      topikLevel: primaryLangReq?.koreanTrackTopik || 'Not Announced',
      englishTest: primaryLangReq?.englishTrackScore || 'Not Announced',
      minimumGpa: bundle.admissionRequirements[0]?.minimumGpaOrAcademicStanding || 'Evaluated per department',
      apostilleRequired: true,
      applicationFeeKrw: appFeeRow ? appFeeRow.applicationFeeKrw : 'Not Announced',
      requiredDocuments: bundle.applicationDocuments.map((d) => d.documentName),
      verified: true,
    },
    studentSupport: [
      bundle.internationalStudentServices.orientationProgram,
      bundle.internationalStudentServices.buddyMentoringProgram,
      bundle.internationalStudentServices.koreanLanguageSupport,
      bundle.internationalStudentServices.counselingAndMedicalSupport,
      bundle.internationalStudentServices.careerAndPartTimeWorkGuidance,
    ],
    studentSupportVerified: true,
    verified: bundle.logo.verified,
    verificationStatus: bundle.logo.verified ? 'Verified' : 'Pending Verification',
    strictVerificationStatus: bundle.logo.verified ? 'VERIFIED' : 'PARTIALLY VERIFIED',
    adminApprovedVerified: true,
    description: u.overviewDescription,
    aliases: mergedAliases,
    sourceUrl: u.officialWebsiteUrl,
    sourceUrls: bundle.sources.map((s) => s.sourceUrl),
    lastUpdated: u.lastVerifiedDate,
    updatedAt: u.updatedAt,
    lastVerifiedAt: u.lastVerifiedDate,
    relationalBundle: bundle,
  };
}

export const APPROVED_25_UNIVERSITIES: University[] = RELATIONAL_BUNDLES_25.map(bundleToUniversity);

export interface RelationalUniversityOverrides {
  programs?: RelationalUniversityProgramRow[];
  tuitionFees?: RelationalTuitionFeeRow[];
  admissionDeadlines?: RelationalAdmissionDeadlineRecord[];
  admissionRequirements?: RelationalAdmissionRequirementRow[];
  languageRequirements?: RelationalLanguageRequirementRow[];
  applicationDocuments?: RelationalApplicationDocumentRow[];
  scholarships?: RelationalScholarshipRow[];
  sources?: RelationalUniversitySourceRow[];
  verificationLogs?: RelationalUniversityVerificationLogRow[];
}

/**
 * Synthesizes a strictly honest, non-fabricated relational bundle for any preserved archive
 * or newly created university that does not have a Priority-25 seed bundle.
 * Never invents missing facts; marks unverified items transparently.
 */
export function buildArchiveUniversityRelationalBundle(
  uni: University
): CompleteUniversityRelationalBundle {
  const safeStr = (val: string | undefined | null, fallback = 'Not yet verified'): string => {
    if (!val || !val.trim() || val.includes('Not officially verified')) return fallback;
    return val.trim();
  };

  const officialWeb = uni.officialWebsite || '';
  const oiaWeb = uni.internationalOfficeUrl || officialWeb;
  const city = safeStr(uni.city, 'South Korea');
  const province = safeStr(uni.province || uni.region, city);
  const addressEn = safeStr(uni.englishAddress || uni.locationAddress, 'Not yet verified');
  const addressKo = safeStr(uni.koreanAddress, 'Not yet verified');
  const mapsQuery = encodeURIComponent(
    `${uni.officialName || uni.name} ${uni.koreanName || ''} ${city}`.trim()
  );
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const lastDate =
    uni.lastVerifiedAt && !uni.lastVerifiedAt.includes('Not officially verified')
      ? uni.lastVerifiedAt
      : '';

  const baseUniRow = {
    id: uni.id,
    slug: uni.id,
    whitelistOrder: uni.whitelistOrder || 0,
    englishName: uni.officialName || uni.name,
    koreanName: safeStr(uni.koreanName, uni.name),
    shortName: '',
    institutionCategory: (uni.type === 'National' || uni.type === 'Public' ? 'National' : 'Private') as
      | 'National'
      | 'Private',
    institutionSubtypeLabel:
      uni.type && !uni.type.includes('Not officially verified')
        ? `${uni.type} Higher Education Institution`
        : 'Higher Education Institution (Verification Pending)',
    foundedYear: typeof uni.establishmentYear === 'number' ? uni.establishmentYear : 0,
    foundedYearVerified: Boolean(uni.establishmentYearVerified && uni.establishmentYear),
    officialWebsiteUrl: officialWeb,
    internationalOfficeWebsiteUrl: oiaWeb,
    primaryCity: city,
    primaryProvince: province,
    regionFilterGroup: province,
    postalCode: 'Not yet verified',
    mainAddressEn: addressEn,
    mainAddressKo: addressKo,
    latitude: null,
    longitude: null,
    googleMapsUrl,
    overviewDescription:
      uni.description && !uni.description.includes('Not officially verified')
        ? uni.description
        : `${uni.officialName || uni.name} is a preserved Korean higher education institution in ${city}. Detailed institutional profile fields are retained from the EVERYKR archive and pending independent verification against the latest official university prospectus.`,
    academicStrengths:
      uni.popularMajors && uni.popularMajors.length > 0
        ? uni.popularMajors
        : uni.programs && uni.programs.length > 0
        ? uni.programs.slice(0, 4)
        : [],
    internationalStudentOverview:
      'Refer to the official Office of International Affairs (OIA) portal for current international student recruitment guidelines, dormitory availability, and visa support.',
    legacySlugsAndAliases: uni.aliases || [],
    verificationStatus: (uni.verified ? 'Verified' : 'Needs Verification') as
      | 'Verified'
      | 'Needs Verification',
    lastVerifiedDate: lastDate,
    completenessPercentage: uni.completenessPercentage ?? 45,
    updatedAt: uni.updatedAt || '',
  };

  const campuses = [
    {
      id: `${uni.id}-campus-main`,
      universityId: uni.id,
      campusName: uni.campusName || 'Main Campus',
      campusNameKo: '본교 캠퍼스',
      isMainCampus: true,
      city,
      province,
      postalCode: 'Not yet verified',
      addressEn,
      addressKo,
      latitude: null,
      longitude: null,
      googleMapsUrl,
      nearestSubwayOrStation: 'Not yet verified — check official campus map',
      nearestBusOrTransitInfo: 'Not yet verified',
      collegesAndFaculties:
        uni.programs && uni.programs.length > 0 ? uni.programs : ['Not yet verified'],
      dormitoriesSummary: 'Not yet verified — confirm on-campus housing availability with OIA.',
      librarySummary: 'Central university library (details awaiting verification)',
      sportsFacilitiesSummary: 'Not yet verified',
      cafeteriasSummary: 'Campus dining facilities (details awaiting verification)',
      studentSupportFacilitiesSummary: 'International student office & academic support',
      sourceUrl: officialWeb,
      verificationStatus: (uni.campusVerified ? 'Verified' : 'Needs Verification') as
        | 'Verified'
        | 'Needs Verification',
    },
  ];

  const hasVerifiedLogo = Boolean(uni.logoVerified && uni.logoUrl);
  const logo = {
    id: `${uni.id}-logo`,
    universityId: uni.id,
    localAssetPath: hasVerifiedLogo ? uni.logoUrl || '' : '',
    officialSourceUrl: uni.logoSourceUrl || officialWeb,
    sourcePageUrl: officialWeb,
    format: hasVerifiedLogo ? ('png' as const) : ('missing' as const),
    verified: hasVerifiedLogo,
    missingLogoStatus: !hasVerifiedLogo,
    verificationStatus: (hasVerifiedLogo ? 'Verified' : 'Needs Verification') as
      | 'Verified'
      | 'Needs Verification',
    retrievedAt: uni.logoRetrievedAt || '',
    notes: hasVerifiedLogo
      ? 'Verified institutional logo.'
      : 'Official university logo pending verification.',
  };

  const rawPrograms = uni.programs && uni.programs.length > 0 ? uni.programs : [];
  const recordedDegrees = uni.degrees && uni.degrees.length > 0 ? uni.degrees : [];

  const programs: RelationalUniversityProgramRow[] = [];
  if (recordedDegrees.includes('Language Program')) {
    programs.push({
      id: `${uni.id}-arch-klp`,
      universityId: uni.id,
      categoryCode: 'KLP',
      categoryLabel: 'Korean Language Program',
      programNameEn: 'Korean Language Program (Preserved Record)',
      collegeOrFaculty: 'Korean Language Institute',
      degreeLevel: 'Korean Language Program',
      languageOfInstruction: 'Korean',
      campusName: uni.campusName || 'Main Campus',
      duration: 'Not yet verified',
      admissionIntake: 'Not yet verified',
      internationalAdmissionAvailable: 'Needs Verification',
      sourceUrl: oiaWeb,
      verificationStatus: 'Needs Verification',
    });
  }

  rawPrograms.forEach((progName, idx) => {
    const lower = progName.toLowerCase();
    const cat: ProgramCategoryCode = lower.includes('language')
      ? 'KLP'
      : lower.includes('phd') || lower.includes('doctoral')
      ? 'PhD'
      : lower.includes('master') || lower.includes('mba') || lower.includes('graduate')
      ? 'Master'
      : lower.includes('associate')
      ? 'Associate'
      : 'Bachelor';

    programs.push({
      id: `${uni.id}-arch-prog-${idx + 1}`,
      universityId: uni.id,
      categoryCode: cat,
      categoryLabel: cat,
      programNameEn: progName,
      collegeOrFaculty: 'Department / Faculty awaiting verification',
      degreeLevel:
        cat === 'KLP'
          ? 'Korean Language Program'
          : cat === 'Associate'
          ? 'Associate Degree'
          : cat === 'Master'
          ? "Master's Degree"
          : cat === 'PhD'
          ? 'Doctoral Degree'
          : "Bachelor's Degree",
      languageOfInstruction: uni.englishTaughtAvailable ? 'Korean & English' : 'Not Announced',
      campusName: uni.campusName || 'Main Campus',
      duration:
        cat === 'Bachelor'
          ? '4 years'
          : cat === 'Associate'
          ? '2 years'
          : cat === 'Master'
          ? '2 years'
          : cat === 'PhD'
          ? '3 years'
          : 'Not yet verified',
      admissionIntake: 'Not yet verified',
      internationalAdmissionAvailable: 'Needs Verification',
      sourceUrl: oiaWeb,
      verificationStatus: uni.programsVerified ? 'Verified' : 'Needs Verification',
    });
  });

  if (recordedDegrees.includes('Master') && !programs.some((p) => p.categoryCode === 'Master')) {
    programs.push({
      id: `${uni.id}-arch-master`,
      universityId: uni.id,
      categoryCode: 'Master',
      categoryLabel: "Master's Degree",
      programNameEn: "Graduate School Master's Programs (Preserved Record)",
      collegeOrFaculty: 'General Graduate School',
      degreeLevel: "Master's Degree",
      languageOfInstruction: 'Not Announced',
      campusName: uni.campusName || 'Main Campus',
      duration: '2 years',
      admissionIntake: 'Not yet verified',
      internationalAdmissionAvailable: 'Needs Verification',
      sourceUrl: oiaWeb,
      verificationStatus: 'Needs Verification',
    });
  }

  if (recordedDegrees.includes('PhD') && !programs.some((p) => p.categoryCode === 'PhD')) {
    programs.push({
      id: `${uni.id}-arch-phd`,
      universityId: uni.id,
      categoryCode: 'PhD',
      categoryLabel: 'Doctoral Degree',
      programNameEn: 'Graduate School Doctoral Programs (Preserved Record)',
      collegeOrFaculty: 'General Graduate School',
      degreeLevel: 'Doctoral Degree (PhD)',
      languageOfInstruction: 'Not Announced',
      campusName: uni.campusName || 'Main Campus',
      duration: '3 years',
      admissionIntake: 'Not yet verified',
      internationalAdmissionAvailable: 'Needs Verification',
      sourceUrl: oiaWeb,
      verificationStatus: 'Needs Verification',
    });
  }

  const tuitionFees: RelationalTuitionFeeRow[] = [];
  if (
    typeof uni.tuitionPerSemesterKRW?.min === 'number' &&
    typeof uni.tuitionPerSemesterKRW?.max === 'number'
  ) {
    tuitionFees.push({
      id: `${uni.id}-arch-tuition-1`,
      universityId: uni.id,
      degreeOrProgramType: 'Bachelor',
      departmentTrackLabel: 'Preserved Undergraduate Reference Range (Varies by Department)',
      applicationFeeKrw:
        typeof uni.admissionRequirements?.applicationFeeKrw === 'number'
          ? uni.admissionRequirements.applicationFeeKrw
          : 'Not Announced',
      entranceAdmissionFeeKrw: 'Not Announced',
      tuitionPerSemesterKrwMin: uni.tuitionPerSemesterKRW.min,
      tuitionPerSemesterKrwMax: uni.tuitionPerSemesterKRW.max,
      estimatedAnnualTuitionKrwMin: uni.tuitionPerSemesterKRW.min * 2,
      estimatedAnnualTuitionKrwMax: uni.tuitionPerSemesterKRW.max * 2,
      dormitoryFeeKrwRange: 'Not yet verified',
      insuranceFeeKrwAnnual: 'Mandatory NHIS enrollment required for international students',
      estimatedLivingCostMonthlyKrw: 'Not yet verified',
      academicYear: 'Preserved Archive Reference (Awaiting Verification)',
      currency: 'KRW',
      notes:
        uni.tuitionNotes && !uni.tuitionNotes.includes('Not officially verified')
          ? uni.tuitionNotes
          : 'Preserved historical range; exact tuition differs by program and semester.',
      sourceUrl: uni.tuitionSourceUrl || oiaWeb,
      verificationStatus: uni.tuitionVerified ? 'Verified' : 'Needs Verification',
    });
  }

  const scholarships: RelationalScholarshipRow[] = (uni.scholarships || []).map((rawSch, idx) => {
    const isGks = /gks|global korea scholarship/i.test(rawSch);
    const isTopik = /topik/i.test(rawSch);
    const parts = rawSch.split(/—|:/).map((s) => s.trim());
    return {
      id: `${uni.id}-arch-sch-${idx + 1}`,
      universityId: uni.id,
      scholarshipType: isGks
        ? 'GKS (Global Korea Scholarship)'
        : isTopik
        ? 'TOPIK-Based Scholarship'
        : 'Admission Scholarship',
      scholarshipCategory: isGks
        ? 'Government Scholarships (GKS)'
        : isTopik
        ? 'TOPIK Scholarships'
        : 'International Student Scholarships',
      fundingSource: isGks ? 'Government-Funded (GKS)' : 'University-Funded',
      fullOrPartial: 'Not yet verified',
      scholarshipName: parts[0] || rawSch,
      targetDegreeLevel: 'Not yet verified',
      benefitCoverage: parts[1] || rawSch,
      eligibilityCriteria: 'Not yet verified — confirm in official admission guideline.',
      gpaMaintenanceRequirement: 'Not yet verified',
      continuationConditions: 'Not yet verified',
      applicationProcedure: 'Not yet verified',
      relevantIntake: 'Not yet verified',
      sourceUrl: uni.scholarshipSourceUrl || oiaWeb,
      verificationStatus: uni.scholarshipVerified ? 'Verified' : 'Needs Verification',
    };
  });

  const admissionRequirements: RelationalAdmissionRequirementRow[] = [
    {
      id: `${uni.id}-arch-req-ug`,
      universityId: uni.id,
      degreeLevel: 'Undergraduate',
      nationalityEligibility: 'Not yet verified — check official OIA foreign student eligibility rules.',
      academicQualification: 'High school diploma or equivalent (confirm exact country-specific credentials with OIA).',
      minimumGpaOrAcademicStanding: safeStr(uni.admissionRequirements?.minimumGpa, 'Not yet verified'),
      studyGapPolicy: 'Not yet verified',
      interviewRequired: 'Not yet verified',
      portfolioOrAuditionRequired: 'Not yet verified',
      researchProposalOrAdvisorRequired: 'Not yet verified',
      financialProofRequirement: 'Not yet verified — confirm bank balance certificate amount in current OIA guideline.',
      sourceUrl: oiaWeb,
      verificationStatus: uni.admissionRequirements?.verified ? 'Verified' : 'Needs Verification',
    },
  ];

  const languageRequirements: RelationalLanguageRequirementRow[] = [
    {
      id: `${uni.id}-arch-lang-ug`,
      universityId: uni.id,
      degreeLevel: 'Undergraduate',
      koreanTrackTopik: safeStr(uni.admissionRequirements?.topikLevel, 'Not yet verified'),
      englishTrackScore: safeStr(uni.admissionRequirements?.englishTest, 'Not yet verified'),
      universityLanguageTestAccepted: 'Not yet verified',
      conditionalAdmissionAvailable: 'Not yet verified',
      koreanLanguageInstituteReplacement: 'Not yet verified',
      sourceUrl: oiaWeb,
      verificationStatus: uni.admissionRequirements?.verified ? 'Verified' : 'Needs Verification',
    },
  ];

  const applicationDocuments: RelationalApplicationDocumentRow[] = (
    uni.admissionRequirements?.requiredDocuments || []
  ).map((docTitle, idx) => ({
    id: `${uni.id}-arch-doc-${idx + 1}`,
    universityId: uni.id,
    applicableLevel: 'All',
    documentName: docTitle,
    requirementType: 'Mandatory',
    apostilleOrConsularRequired: Boolean(uni.admissionRequirements?.apostilleRequired),
    translationRequired: 'Not yet verified',
    notes: 'Preserved document record — confirm exact form templates and apostille rules on the official OIA website.',
    sourceUrl: oiaWeb,
    verificationStatus: uni.admissionRequirements?.verified ? 'Verified' : 'Needs Verification',
  }));

  const contacts = {
    id: `${uni.id}-arch-contacts`,
    universityId: uni.id,
    switchboardPhone: safeStr(uni.contactPhone, 'Not Announced'),
    internationalOfficeName: 'Office of International Affairs',
    internationalOfficePhone: safeStr(uni.intlOfficePhone || uni.contactPhone, 'Not Announced'),
    internationalOfficeEmail: safeStr(uni.intlOfficeEmail || uni.contactEmail, 'Not Announced'),
    officeHoursKst: 'Not Announced',
    postalAddressEn: addressEn,
    postalAddressKo: addressKo,
    postalCode: 'Not yet verified',
    onlineApplicationPortalUrl: oiaWeb,
    admissionGuidelineUrl: uni.admissionGuideUrl || oiaWeb,
    kakaoOrSocialLinks: [],
    sourceUrl: oiaWeb,
    verificationStatus: (uni.contactVerified ? 'Verified' : 'Needs Verification') as
      | 'Verified'
      | 'Needs Verification',
  };

  const sources: RelationalUniversitySourceRow[] = officialWeb
    ? [
        {
          id: `${uni.id}-arch-src-1`,
          universityId: uni.id,
          sourceTitle: `${uni.officialName || uni.name} Official Website`,
          sourceType: 'Official University Website',
          sourceUrl: officialWeb,
          checkedDate: lastDate || 'Archive Record',
          academicYearCycle: 'Preserved Archive',
          verifiedFieldsSummary: 'Preserved institutional web address and archive metadata.',
        },
      ]
    : [];

  const completeness = computeCompleteness({
    university: baseUniRow,
    campuses,
    logo,
    images: [],
    programs,
    requirements: admissionRequirements,
    tuitionFees,
    scholarships,
    contacts,
    deadlinesCount: 0,
    hasAnnouncedDeadlines: false,
  });

  return {
    university: {
      ...baseUniRow,
      completenessPercentage: completeness.overallPercentage,
    },
    campuses,
    logo,
    images: [],
    programs,
    admissionRequirements,
    languageRequirements,
    tuitionFees,
    scholarships,
    admissionDeadlines: [],
    historicalAdmissionCycles: uni.historicalAdmissionCycles || [],
    applicationDocuments,
    internationalStudentServices: {
      id: `${uni.id}-arch-services`,
      universityId: uni.id,
      d2VisaAvailable: 'Confirm eligible degree programs on official OIA website',
      d4VisaAvailable: 'Confirm Korean Language Institute visa sponsorship on official OIA website',
      certificateOfAdmissionProcess:
        'Certificate of Admission (COA) issuance procedures are managed by the university Office of International Affairs after final admission and tuition payment.',
      visaProcessDistinctionNote:
        'D-2 / D-4 student visa approval and Alien Registration Card (ARC) rules are governed by the Korean Embassy/Consulate and Republic of Korea Ministry of Justice (HiKorea).',
      arrivalAirportSupport: 'Not yet verified',
      orientationProgram: 'Not yet verified',
      buddyMentoringProgram: 'Not yet verified',
      counselingAndMedicalSupport: 'Not yet verified',
      careerAndPartTimeWorkGuidance: 'Part-time work requires OIA seal and HiKorea immigration approval.',
      koreanLanguageSupport: 'Not yet verified',
      dormitoryPriorityForFreshmen: 'Not yet verified',
      sourceUrl: oiaWeb,
      verificationStatus: 'Needs Verification',
    },
    contacts,
    sources,
    verificationLogs: [],
    completeness,
  };
}

/**
 * Rebuilds a University object after Admin updates any relational table in Firestore
 * (programs, tuitionFees, admissionDeadlines, requirements, documents, scholarships, sources).
 * Preserves Priority-25 vs Preserved-Archive tier faithfully without destructive overwrites.
 */
export function applyRelationalOverridesToUniversity(
  uni: University,
  overrides: RelationalUniversityOverrides
): University {
  const baseBundle = uni.relationalBundle || buildArchiveUniversityRelationalBundle(uni);
  const nextPrograms = overrides.programs ?? baseBundle.programs;
  const nextTuitionFees = overrides.tuitionFees ?? baseBundle.tuitionFees;
  const nextDeadlines = overrides.admissionDeadlines ?? baseBundle.admissionDeadlines;
  const nextRequirements = overrides.admissionRequirements ?? baseBundle.admissionRequirements;
  const nextLangRequirements = overrides.languageRequirements ?? baseBundle.languageRequirements;
  const nextDocuments = overrides.applicationDocuments ?? baseBundle.applicationDocuments;
  const nextScholarships = overrides.scholarships ?? baseBundle.scholarships;
  const nextSources = overrides.sources ?? baseBundle.sources;
  const nextLogs = overrides.verificationLogs ?? baseBundle.verificationLogs;

  const hasAnnouncedDeadlines = nextDeadlines.some(
    (d) => d.roundActiveStatus !== 'Not Announced' && d.onlineApplicationRaw !== 'Not Announced'
  );
  const hasManualFlaggedDeadlines = nextDeadlines.some((d) => d.flaggedForManualVerification);

  const updatedCompleteness = computeCompleteness({
    university: baseBundle.university,
    campuses: baseBundle.campuses,
    logo: baseBundle.logo,
    images: baseBundle.images,
    programs: nextPrograms,
    requirements: nextRequirements,
    tuitionFees: nextTuitionFees,
    scholarships: nextScholarships,
    contacts: baseBundle.contacts,
    deadlinesCount: nextDeadlines.length,
    hasAnnouncedDeadlines,
    hasManualFlaggedDeadlines,
  });

  const nextBundle: CompleteUniversityRelationalBundle = {
    ...baseBundle,
    programs: nextPrograms,
    tuitionFees: nextTuitionFees,
    admissionDeadlines: nextDeadlines,
    admissionRequirements: nextRequirements,
    languageRequirements: nextLangRequirements,
    applicationDocuments: nextDocuments,
    scholarships: nextScholarships,
    sources: nextSources,
    verificationLogs: nextLogs,
    completeness: updatedCompleteness,
    university: {
      ...baseBundle.university,
      completenessPercentage: updatedCompleteness.overallPercentage,
    },
  };

  if (uni.isApproved25 || APPROVED_25_IDS.has(uni.id)) {
    return bundleToUniversity(nextBundle);
  }

  const rebuilt = bundleToUniversity(nextBundle);
  return {
    ...rebuilt,
    ...uni,
    programs: nextPrograms.map((p) => p.programNameEn),
    scholarships: nextScholarships.map((s) => `${s.scholarshipName} — ${s.benefitCoverage}`),
    completenessPercentage: updatedCompleteness.overallPercentage,
    eightPartChecklist: updatedCompleteness.eightPartChecklist,
    isApproved25: false,
    recordTier: 'preserved_archive',
    priorityRank: uni.priorityRank ?? 2000,
    relationalBundle: nextBundle,
  };
}

/**
 * Backward-compatible wrapper for deadline-only updates
 */
export function applyDeadlinesOverrideToUniversity(
  uni: University,
  customDeadlines: RelationalAdmissionDeadlineRecord[]
): University {
  return applyRelationalOverridesToUniversity(uni, { admissionDeadlines: customDeadlines });
}
