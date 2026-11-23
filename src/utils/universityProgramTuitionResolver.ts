import type { LanguageCode } from '../types';
import type {
  CompleteUniversityRelationalBundle,
  ProgramCategoryCode,
  RelationalAdmissionDeadlineRecord,
  RelationalScholarshipRow,
  RelationalTuitionFeeRow,
  RelationalUniversityProgramRow,
  ScholarshipCategoryGroup,
} from '../data/universities25/relationalTypes';
import {
  getTuitionRowFiveTierStatus,
  mapRelationalStatusToFiveTier,
  type FiveTierVerificationStatus,
} from './fiveTierVerification';

export type EducationLevelGroupKey =
  | 'KLP'
  | 'Associate'
  | 'Bachelor'
  | 'Master'
  | 'PhD';

export const EDUCATION_LEVEL_GROUPS: readonly {
  key: EducationLevelGroupKey;
  label: string;
  shortLabel: string;
  order: number;
}[] = [
  { key: 'KLP', label: 'Korean Language Program', shortLabel: 'Korean Language (KLP)', order: 1 },
  { key: 'Associate', label: 'Associate Degree', shortLabel: 'Associate', order: 2 },
  { key: 'Bachelor', label: "Bachelor's Degree", shortLabel: "Bachelor's", order: 3 },
  { key: 'Master', label: "Master's Degree", shortLabel: "Master's", order: 4 },
  { key: 'PhD', label: 'Doctoral Degree (PhD)', shortLabel: 'Doctoral (PhD)', order: 5 },
] as const;

export function mapProgramToEducationLevelGroup(
  program: RelationalUniversityProgramRow
): EducationLevelGroupKey {
  switch (program.categoryCode) {
    case 'KLP':
      return 'KLP';
    case 'Associate':
      return 'Associate';
    case 'Bachelor':
    case 'EAP':
    case 'Exchange':
    case 'Special':
      return 'Bachelor';
    case 'Master':
    case 'Graduate':
      return 'Master';
    case 'PhD':
      return 'PhD';
    default:
      return 'Bachelor';
  }
}

export interface ResolvedProgramTuition {
  matchedRow: RelationalTuitionFeeRow | null;
  matchPrecision: 'exact_program' | 'degree_and_faculty_track' | 'unverified';
  semesterDisplay: string;
  annualDisplay: string;
  totalProgramDisplay: string;
  applicationFeeDisplay: string;
  additionalFeesDisplay: string;
  academicYearLabel: string;
  scholarshipEligibilityDisplay: string;
  intakeDisplay: string;
  numericSemesterMin: number | null;
  numericSemesterMax: number | null;
  fiveTierStatus: FiveTierVerificationStatus;
  sourceUrl: string;
  lastVerifiedDate: string;
}

function formatKrwRange(min: number | null | undefined, max: number | null | undefined): string | null {
  const validMin = typeof min === 'number' && Number.isFinite(min) ? min : null;
  const validMax = typeof max === 'number' && Number.isFinite(max) ? max : null;
  if (validMin === null && validMax === null) return null;
  if (validMin !== null && validMax !== null) {
    if (validMin === validMax) return `₩${validMin.toLocaleString()}`;
    return `₩${validMin.toLocaleString()} – ₩${validMax.toLocaleString()}`;
  }
  const single = (validMin ?? validMax) as number;
  return `₩${single.toLocaleString()}`;
}

function parseProgramYears(duration: string, group: EducationLevelGroupKey): number | null {
  if (!duration || duration.toLowerCase().includes('not yet verified')) return null;
  const rangeMatch = duration.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*year/i);
  if (rangeMatch) {
    return Number(rangeMatch[1]) || null;
  }
  const singleYear = duration.match(/(\d+(?:\.\d+)?)\s*year/i);
  if (singleYear) {
    return Number(singleYear[1]) || null;
  }
  if (group === 'Bachelor') return 4;
  if (group === 'Associate') return 2;
  if (group === 'Master') return 2;
  if (group === 'PhD') return 3;
  return null;
}

function isTuitionRowCompatibleWithProgram(
  row: RelationalTuitionFeeRow,
  program: RelationalUniversityProgramRow
): boolean {
  if (row.programId && row.programId === program.id) return true;
  if (row.programId && row.programId !== program.id) return false;

  const cat = program.categoryCode;
  const rowType = row.degreeOrProgramType;

  // Strictly prevent university-wide degree fees from bleeding onto KLP or mismatched levels
  if (cat === 'KLP') {
    return rowType === 'KLP';
  }
  if (cat === 'Associate') {
    return rowType === 'Associate';
  }
  if (cat === 'Bachelor' || cat === 'EAP') {
    return rowType === 'Bachelor' || rowType === 'EAP';
  }
  if (cat === 'Master') {
    return rowType === 'Master' || rowType === 'Graduate';
  }
  if (cat === 'PhD') {
    return rowType === 'PhD' || rowType === 'Graduate';
  }
  if (cat === 'Graduate') {
    return rowType === 'Graduate' || rowType === 'Master' || rowType === 'PhD';
  }
  return rowType === cat;
}

function scoreFacultyTrackMatch(
  row: RelationalTuitionFeeRow,
  program: RelationalUniversityProgramRow
): number {
  if (row.programId && row.programId === program.id) return 1000;
  let score = 10;
  if (row.degreeOrProgramType === program.categoryCode) score += 25;

  const progText = `${program.programNameEn} ${program.collegeOrFaculty}`.toLowerCase();
  const trackText = row.departmentTrackLabel.toLowerCase();

  const keywordPairs = [
    ['engineering', 'engineering'],
    ['software', 'software'],
    ['computer', 'computer'],
    ['it', 'software'],
    ['science', 'science'],
    ['business', 'business'],
    ['commerce', 'business'],
    ['economics', 'humanities'],
    ['humanities', 'humanities'],
    ['liberal', 'liberal'],
    ['hospitality', 'hospitality'],
    ['tourism', 'hospitality'],
    ['art', 'art'],
    ['design', 'art'],
    ['media', 'art'],
    ['film', 'art'],
    ['music', 'art'],
    ['pharmacy', 'pharmacy'],
    ['medicine', 'medicine'],
    ['nursing', 'nursing'],
    ['language', 'language'],
    ['english', 'english'],
  ];

  for (const [pKey, tKey] of keywordPairs) {
    if (progText.includes(pKey) && trackText.includes(tKey)) {
      score += 15;
    }
  }
  return score;
}

/**
 * Resolves the specific tuition fee, intake, and scholarship eligibility for an individual program.
 * Never invents missing fees; returns "Not yet verified" whenever no matching track exists.
 */
export function resolveProgramTuitionAndDetails(
  program: RelationalUniversityProgramRow,
  bundle: CompleteUniversityRelationalBundle
): ResolvedProgramTuition {
  const candidates = bundle.tuitionFees.filter((row) =>
    isTuitionRowCompatibleWithProgram(row, program)
  );

  const bestRow =
    candidates.length > 0
      ? [...candidates].sort(
          (a, b) => scoreFacultyTrackMatch(b, program) - scoreFacultyTrackMatch(a, program)
        )[0]
      : null;

  const levelGroup = mapProgramToEducationLevelGroup(program);

  // Resolve Admission Intake
  let intakeDisplay = program.admissionIntake || '';
  if (!intakeDisplay) {
    const matchingDeadlines = bundle.admissionDeadlines.filter(
      (d) =>
        d.intakeYear >= 2027 &&
        (d.programCategory === program.categoryCode ||
          (levelGroup === 'Master' && d.degreeLevel === 'Masters') ||
          (levelGroup === 'Bachelor' && (d.degreeLevel === 'Bachelor' || d.degreeLevel === 'EAP')))
    );
    const activeRounds = matchingDeadlines.filter(
      (d) => d.roundActiveStatus === 'Open / Upcoming'
    );
    if (program.categoryCode === 'KLP') {
      intakeDisplay = 'Spring · Summer · Fall · Winter (4 Terms/Year)';
    } else if (activeRounds.length > 0) {
      const uniqueSemesters = Array.from(new Set(activeRounds.map((r) => r.intakeSemester)));
      intakeDisplay = uniqueSemesters.join(' & ');
    } else if (matchingDeadlines.some((d) => d.roundActiveStatus === 'No Recruitment (X)')) {
      intakeDisplay = 'No March 2027 Recruitment (Check Fall Notice)';
    } else if (bundle.university.whitelistOrder > 0) {
      intakeDisplay = 'March (Spring) & September (Fall) — Check Current OIA Guide';
    } else {
      intakeDisplay = 'Not yet verified';
    }
  }

  // Resolve Scholarship Eligibility
  let scholarshipEligibilityDisplay = program.scholarshipEligibility || '';
  if (!scholarshipEligibilityDisplay) {
    if (program.categoryCode === 'KLP') {
      const klpSch = bundle.scholarships.find((s) =>
        /language|klp|all/i.test(s.targetDegreeLevel)
      );
      scholarshipEligibilityDisplay = klpSch
        ? `Eligible: ${klpSch.scholarshipName}`
        : 'Not yet verified (Check Korean Language Institute notice)';
    } else {
      const matchingSch = bundle.scholarships.filter((s) => {
        const tgt = s.targetDegreeLevel.toLowerCase();
        if (levelGroup === 'Bachelor') return tgt.includes('undergraduate') || tgt.includes('bachelor') || tgt.includes('all');
        if (levelGroup === 'Associate') return tgt.includes('associate') || tgt.includes('undergraduate');
        if (levelGroup === 'Master' || levelGroup === 'PhD')
          return tgt.includes('graduate') || tgt.includes('master') || tgt.includes('phd') || tgt.includes('doctoral');
        return false;
      });
      scholarshipEligibilityDisplay =
        matchingSch.length > 0
          ? matchingSch.map((s) => s.scholarshipName).join(' · ')
          : 'Not yet verified';
    }
  }

  if (!bestRow) {
    const appFeeFallback =
      typeof program.applicationFeeKrw === 'number'
        ? `₩${program.applicationFeeKrw.toLocaleString()}`
        : 'Not yet verified';
    return {
      matchedRow: null,
      matchPrecision: 'unverified',
      semesterDisplay: 'Not yet verified',
      annualDisplay: 'Not yet verified',
      totalProgramDisplay: 'Not yet verified',
      applicationFeeDisplay: appFeeFallback,
      additionalFeesDisplay: program.additionalFeesSummary || 'Not yet verified',
      academicYearLabel: 'Not yet verified',
      scholarshipEligibilityDisplay,
      intakeDisplay,
      numericSemesterMin: null,
      numericSemesterMax: null,
      fiveTierStatus: mapRelationalStatusToFiveTier(program.verificationStatus),
      sourceUrl: program.sourceUrl || bundle.university.internationalOfficeWebsiteUrl || bundle.university.officialWebsiteUrl,
      lastVerifiedDate: program.lastVerifiedDate || bundle.university.lastVerifiedDate || 'Not yet verified',
    };
  }

  const semStr = formatKrwRange(bestRow.tuitionPerSemesterKrwMin, bestRow.tuitionPerSemesterKrwMax);
  const annStr = formatKrwRange(
    bestRow.estimatedAnnualTuitionKrwMin,
    bestRow.estimatedAnnualTuitionKrwMax
  );

  // Total program tuition: explicit override first, otherwise computed from verified annual tuition * duration years
  let totalStr = formatKrwRange(
    bestRow.totalProgramTuitionKrwMin,
    bestRow.totalProgramTuitionKrwMax
  );
  if (!totalStr && bestRow.estimatedAnnualTuitionKrwMin !== null) {
    const years = parseProgramYears(program.duration, levelGroup);
    if (years !== null && years > 0) {
      const totMin = Math.round(bestRow.estimatedAnnualTuitionKrwMin * years);
      const totMax = Math.round(
        (bestRow.estimatedAnnualTuitionKrwMax ?? bestRow.estimatedAnnualTuitionKrwMin) * years
      );
      totalStr = `${formatKrwRange(totMin, totMax)} (${years}-yr ${
        bestRow.verificationStatus === 'Verified' ? 'schedule' : 'est. range'
      })`;
    }
  }

  const appFeeNumber =
    typeof program.applicationFeeKrw === 'number'
      ? program.applicationFeeKrw
      : typeof bestRow.applicationFeeKrw === 'number'
      ? bestRow.applicationFeeKrw
      : null;

  const entrancePart =
    typeof bestRow.entranceAdmissionFeeKrw === 'number'
      ? `Entrance fee: ₩${bestRow.entranceAdmissionFeeKrw.toLocaleString()}`
      : null;
  const dormPart =
    bestRow.dormitoryFeeKrwRange && !bestRow.dormitoryFeeKrwRange.toLowerCase().includes('not yet verified')
      ? `Dormitory: ${bestRow.dormitoryFeeKrwRange}`
      : null;
  const insPart =
    bestRow.insuranceFeeKrwAnnual && !bestRow.insuranceFeeKrwAnnual.toLowerCase().includes('not yet verified')
      ? `Insurance: ${bestRow.insuranceFeeKrwAnnual}`
      : null;

  const combinedAdditional =
    program.additionalFeesSummary ||
    [entrancePart, dormPart, insPart].filter(Boolean).join(' · ') ||
    'Not yet verified';

  return {
    matchedRow: bestRow,
    matchPrecision: bestRow.programId === program.id ? 'exact_program' : 'degree_and_faculty_track',
    semesterDisplay: semStr ? `${semStr} / ${program.categoryCode === 'KLP' ? 'term' : 'semester'}` : 'Not yet verified',
    annualDisplay: annStr ? `${annStr} / year` : 'Not yet verified',
    totalProgramDisplay: totalStr || 'Not yet verified',
    applicationFeeDisplay: appFeeNumber !== null ? `₩${appFeeNumber.toLocaleString()}` : 'Not yet verified',
    additionalFeesDisplay: combinedAdditional,
    academicYearLabel: bestRow.academicYear || 'Not yet verified',
    scholarshipEligibilityDisplay,
    intakeDisplay,
    numericSemesterMin: bestRow.tuitionPerSemesterKrwMin,
    numericSemesterMax: bestRow.tuitionPerSemesterKrwMax ?? bestRow.tuitionPerSemesterKrwMin,
    fiveTierStatus: getTuitionRowFiveTierStatus(bestRow),
    sourceUrl: bestRow.sourceUrl || program.sourceUrl || bundle.university.officialWebsiteUrl,
    lastVerifiedDate:
      bestRow.lastVerifiedDate ||
      program.lastVerifiedDate ||
      bundle.university.lastVerifiedDate ||
      'Not yet verified',
  };
}

export type ComputedDeadlineStatus =
  | 'Upcoming'
  | 'Open'
  | 'Closing Soon'
  | 'Closed'
  | 'Not Announced';

function parseKoreanScheduleDate(raw: string): Date | null {
  if (!raw || raw === 'Not Announced' || raw === 'Not Mentioned') return null;
  // Matches YYYY.MM.DD or YYYY-MM-DD or YYYY/MM/DD
  const isoLike = raw.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (isoLike) {
    const y = Number(isoLike[1]);
    const m = Number(isoLike[2]) - 1;
    const d = Number(isoLike[3]);
    const dt = new Date(y, m, d, 23, 59, 59);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

/**
 * Computes clear student-facing status for every admission deadline record:
 * Upcoming | Open | Closing Soon | Closed | Not Announced
 */
export function computeDeadlineDisplayStatus(
  record: RelationalAdmissionDeadlineRecord,
  now: Date = new Date()
): ComputedDeadlineStatus {
  if (record.intakeYear < 2027) return 'Closed';
  if (
    record.roundActiveStatus === 'Closed in Sheet (Strikethrough)' ||
    record.roundActiveStatus === 'No Recruitment (X)'
  ) {
    return 'Closed';
  }
  if (
    record.roundActiveStatus === 'Not Announced' ||
    !record.onlineApplicationRaw ||
    record.onlineApplicationRaw === 'Not Announced'
  ) {
    return 'Not Announced';
  }

  // Try parsing start and end dates from onlineApplicationStartDate / onlineApplicationDeadline / onlineApplicationRaw
  const allMatches = Array.from(
    record.onlineApplicationRaw.matchAll(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/g)
  );
  const startDt =
    parseKoreanScheduleDate(record.onlineApplicationStartDate) ||
    (allMatches[0]
      ? new Date(Number(allMatches[0][1]), Number(allMatches[0][2]) - 1, Number(allMatches[0][3]), 0, 0, 0)
      : null);
  const endDt =
    parseKoreanScheduleDate(record.onlineApplicationDeadline) ||
    (allMatches.length >= 2
      ? new Date(
          Number(allMatches[allMatches.length - 1][1]),
          Number(allMatches[allMatches.length - 1][2]) - 1,
          Number(allMatches[allMatches.length - 1][3]),
          23,
          59,
          59
        )
      : startDt);

  if (endDt && now.getTime() > endDt.getTime()) {
    return 'Closed';
  }
  if (startDt && now.getTime() < startDt.getTime()) {
    return 'Upcoming';
  }
  if (endDt) {
    const daysRemaining = (endDt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysRemaining >= 0 && daysRemaining <= 14) {
      return 'Closing Soon';
    }
    if (daysRemaining > 14 && !startDt) {
      return 'Upcoming';
    }
    return 'Open';
  }

  return 'Upcoming';
}

export const ALL_SCHOLARSHIP_CATEGORY_GROUPS: readonly ScholarshipCategoryGroup[] = [
  'Admission Scholarships',
  'Academic Performance Scholarships',
  'TOPIK Scholarships',
  'International Student Scholarships',
  'Government Scholarships (GKS)',
  'Other University Scholarships',
] as const;

export function classifyScholarshipRecord(row: RelationalScholarshipRow): {
  category: ScholarshipCategoryGroup;
  fundingSource: 'University-Funded' | 'Government-Funded (GKS)';
  fullOrPartialLabel: string;
} {
  const isGks =
    row.fundingSource === 'Government-Funded (GKS)' ||
    row.scholarshipType === 'GKS (Global Korea Scholarship)' ||
    /\bgks\b|global korea scholarship/i.test(row.scholarshipName);

  const fundingSource: 'University-Funded' | 'Government-Funded (GKS)' = isGks
    ? 'Government-Funded (GKS)'
    : 'University-Funded';

  let category: ScholarshipCategoryGroup =
    row.scholarshipCategory || 'International Student Scholarships';

  if (!row.scholarshipCategory) {
    if (isGks) {
      category = 'Government Scholarships (GKS)';
    } else if (
      row.scholarshipType === 'TOPIK-Based Scholarship' ||
      /\btopik\b/i.test(row.scholarshipName)
    ) {
      category = 'TOPIK Scholarships';
    } else if (row.scholarshipType === 'Continuing GPA Scholarship') {
      category = 'Academic Performance Scholarships';
    } else if (row.scholarshipType === 'Admission Scholarship') {
      category = 'Admission Scholarships';
    } else if (row.scholarshipType === 'English Score Scholarship') {
      category = 'International Student Scholarships';
    } else if (row.scholarshipType === 'Department / Research Scholarship') {
      category = 'Other University Scholarships';
    }
  }

  let fullOrPartialLabel = row.fullOrPartial || '';
  if (!fullOrPartialLabel) {
    const cov = row.benefitCoverage.toLowerCase();
    if (cov.includes('full tuition') && !cov.includes('partial')) {
      fullOrPartialLabel = 'Full Scholarship';
    } else if (cov.includes('partial') && (cov.includes('100%') || cov.includes('full'))) {
      fullOrPartialLabel = 'Tiered (Partial to Full)';
    } else if (cov.includes('%') || cov.includes('partial') || cov.includes('reduction') || cov.includes('waiver')) {
      fullOrPartialLabel = 'Partial / Tiered Scholarship';
    } else {
      fullOrPartialLabel = 'Not yet verified';
    }
  }

  return { category, fundingSource, fullOrPartialLabel };
}

export interface UniversityDetailUiCopy {
  tabs: {
    overview: string;
    programs_tuition: string;
    deadlines: string;
    requirements_docs: string;
    scholarships: string;
  };
  backToDirectory: string;
  officialWebsite: string;
  oiaAdmissions: string;
  googleMaps: string;
  compare: string;
  comparing: string;
  save: string;
  saved: string;
  notYetVerified: string;
}

export const UNIVERSITY_DETAIL_UI_COPY: Record<LanguageCode, UniversityDetailUiCopy> = {
  en: {
    tabs: {
      overview: 'Overview',
      programs_tuition: 'Programs & Tuition Fees',
      deadlines: 'Admission Deadlines',
      requirements_docs: 'Requirements & Documents',
      scholarships: 'Scholarships',
    },
    backToDirectory: 'Back to University Directory',
    officialWebsite: 'Official Website',
    oiaAdmissions: 'OIA Admissions',
    googleMaps: 'Google Maps',
    compare: 'Compare',
    comparing: 'Comparing',
    save: 'Save',
    saved: 'Saved',
    notYetVerified: 'Not yet verified',
  },
  ko: {
    tabs: {
      overview: '대학 개요',
      programs_tuition: '전공 및 등록금',
      deadlines: '모집 일정 및 마감일',
      requirements_docs: '지원 자격 및 제출서류',
      scholarships: '장학금 안내',
    },
    backToDirectory: '대학 목록으로 돌아가기',
    officialWebsite: '공식 홈페이지',
    oiaAdmissions: '국제처 입학안내',
    googleMaps: '구글 지도',
    compare: '비교하기',
    comparing: '비교 중',
    save: '저장',
    saved: '저장됨',
    notYetVerified: '미확인 (공식 확인 필요)',
  },
  bn: {
    tabs: {
      overview: 'ওভারভিউ',
      programs_tuition: 'প্রোগ্রাম ও টিউশন ফি',
      deadlines: 'ভর্তির শেষ তারিখ',
      requirements_docs: 'যোগ্যতা ও প্রয়োজনীয় কাগজপত্র',
      scholarships: 'স্কলারশিপ',
    },
    backToDirectory: 'বিশ্ববিদ্যালয় তালিকায় ফিরে যান',
    officialWebsite: 'অফিশিয়াল ওয়েবসাইট',
    oiaAdmissions: 'আন্তর্জাতিক ভর্তি পোর্টাল',
    googleMaps: 'গুগল ম্যাপস',
    compare: 'তুলনা করুন',
    comparing: 'তুলনায় যুক্ত',
    save: 'সংরক্ষণ করুন',
    saved: 'সংরক্ষিত',
    notYetVerified: 'এখনো যাচাই করা হয়নি',
  },
  ne: {
    tabs: {
      overview: 'विश्वविद्यालय विवरण',
      programs_tuition: 'कार्यक्रम र शिक्षण शुल्क',
      deadlines: 'भर्ना म्याद',
      requirements_docs: 'योग्यता र कागजातहरू',
      scholarships: 'छात्रवृत्ति',
    },
    backToDirectory: 'विश्वविद्यालय सूचीमा फर्कनुहोस्',
    officialWebsite: 'आधिकारिक वेबसाइट',
    oiaAdmissions: 'अन्तर्राष्ट्रिय भर्ना पोर्टल',
    googleMaps: 'गुगल म्याप्स',
    compare: 'तुलना गर्नुहोस्',
    comparing: 'तुलनामा थपियो',
    save: 'सेभ गर्नुहोस्',
    saved: 'सेभ गरियो',
    notYetVerified: 'अझै प्रमाणित भएको छैन',
  },
  ur: {
    tabs: {
      overview: 'جامعہ کا جائزہ',
      programs_tuition: 'پروگرامز اور ٹیوشن فیس',
      deadlines: 'داخلے کی آخری تاریخیں',
      requirements_docs: 'اہلیت اور مطلوبہ دستاویزات',
      scholarships: 'اسکالرشپس',
    },
    backToDirectory: 'یونیورسٹی ڈائریکٹری پر واپس جائیں',
    officialWebsite: 'آفیشل ویب سائٹ',
    oiaAdmissions: 'انٹرنیشنل ایڈمیشن پورٹل',
    googleMaps: 'گوگل میپس',
    compare: 'موازنہ کریں',
    comparing: 'موازنے میں شامل',
    save: 'محفوظ کریں',
    saved: 'محفوظ شدہ',
    notYetVerified: 'ابھی تک تصدیق شدہ نہیں',
  },
  hi: {
    tabs: {
      overview: 'विश्वविद्यालय विवरण',
      programs_tuition: 'प्रोग्राम और ट्यूशन फीस',
      deadlines: 'प्रवेश अंतिम तिथियां',
      requirements_docs: 'पात्रता और आवश्यक दस्तावेज़',
      scholarships: 'छात्रवृत्ति',
    },
    backToDirectory: 'विश्वविद्यालय निर्देशिका पर वापस जाएं',
    officialWebsite: 'आधिकारिक वेबसाइट',
    oiaAdmissions: 'अंतर्राष्ट्रीय प्रवेश पोर्टल',
    googleMaps: 'गूगल मैप्स',
    compare: 'तुलना करें',
    comparing: 'तुलना में शामिल',
    save: 'सेव करें',
    saved: 'सेव किया गया',
    notYetVerified: 'अभी सत्यापित नहीं',
  },
  zh: {
    tabs: {
      overview: '大学概览',
      programs_tuition: '专业与学费',
      deadlines: '申请截止日期',
      requirements_docs: '申请条件与材料',
      scholarships: '奖学金',
    },
    backToDirectory: '返回大学目录',
    officialWebsite: '官方网站',
    oiaAdmissions: '国际处招生网',
    googleMaps: '谷歌地图',
    compare: '对比',
    comparing: '对比中',
    save: '收藏',
    saved: '已收藏',
    notYetVerified: '暂未核验',
  },
  ar: {
    tabs: {
      overview: 'نظرة عامة',
      programs_tuition: 'التخصصات والرسوم الدراسية',
      deadlines: 'مواعيد التقديم',
      requirements_docs: 'الشروط والمستندات المطلوبة',
      scholarships: 'المنح الدراسية',
    },
    backToDirectory: 'العودة إلى دليل الجامعات',
    officialWebsite: 'الموقع الرسمي',
    oiaAdmissions: 'بوابة القبول الدولي',
    googleMaps: 'خرائط جوجل',
    compare: 'مقارنة',
    comparing: 'قيد المقارنة',
    save: 'حفظ',
    saved: 'تم الحفظ',
    notYetVerified: 'قيد التحقق الرسمي',
  },
  ja: {
    tabs: {
      overview: '大学概要',
      programs_tuition: '専攻・学費案内',
      deadlines: '出願日程・締切',
      requirements_docs: '出願資格・提出書類',
      scholarships: '奨学金制度',
    },
    backToDirectory: '大学一覧に戻る',
    officialWebsite: '公式ウェブサイト',
    oiaAdmissions: '国際処・入学案内',
    googleMaps: 'Googleマップ',
    compare: '比較する',
    comparing: '比較に追加済み',
    save: '保存',
    saved: '保存済み',
    notYetVerified: '公式確認中',
  },
};
