import { University } from '../types';
import {
  RELATIONAL_BUNDLE_BY_ID,
  RelationalAdmissionDeadlineRecord,
  buildArchiveUniversityRelationalBundle,
} from '../data/universities25';
import { getUniversitySlug } from './seoRoutes';

export type DeadlineTimingBucket = 'Open' | 'Upcoming' | 'Closed' | 'Not Announced';

export type DeadlineDegreeTab =
  | 'Bachelor'
  | 'Master'
  | 'PhD'
  | 'KLP';

export const DEADLINE_DEGREE_TABS: { id: DeadlineDegreeTab; label: string }[] = [
  { id: 'Bachelor', label: "Bachelor's" },
  { id: 'Master', label: "Master's" },
  { id: 'PhD', label: 'PhD' },
  { id: 'KLP', label: 'Korean Language Program' },
];

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/**
 * Returns current date in Korea Standard Time (Asia/Seoul) as YYYY-MM-DD.
 */
export function getTodayKstDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Parses human-readable Korean admission date strings (e.g. "20th Nov 2026 (Friday)", "02 DEC 2026", "2026-11-20")
 * into a canonical YYYY-MM-DD string. Returns null if unparseable or "Not Announced".
 */
export function parseVerifiedAdmissionDate(
  raw: string | undefined | null,
  contextStartYear?: number,
  contextStartMonth?: number
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'not announced' ||
    trimmed.toLowerCase().includes('will be') ||
    trimmed.toLowerCase().includes('not available')
  ) {
    return null;
  }

  // ISO format YYYY-MM-DD or YYYY.MM.DD
  const isoMatch = trimmed.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Clean parentheticals and ordinal suffixes ("20th Nov 2026 (Friday)" -> "20 Nov 2026")
  const cleaned = trimmed
    .replace(/\([^)]*\)/g, ' ')
    .replace(/~/g, ' ')
    .replace(/(\d+)\s*(?:st|nd|rd|th)\b/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  // Match "DD Month YYYY"
  const dmyMatch = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const monthName = dmyMatch[2].toLowerCase();
    let year = Number(dmyMatch[3]);
    const month = MONTH_MAP[monthName];
    if (month && day >= 1 && day <= 31) {
      // Handle source PDF typo where a Dec 2026 start date has a Jan 2026 deadline (actually Jan 2027)
      if (contextStartYear === 2026 && contextStartMonth === 12 && month === 1 && year === 2026) {
        year = 2027;
      }
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

export function mapRoundToDegreeTab(
  round: RelationalAdmissionDeadlineRecord
): DeadlineDegreeTab | null {
  const deg = (round.degreeLevel || '').toLowerCase();
  const cat = (round.programCategory || '').toLowerCase();

  if (deg === 'bachelor' || cat === 'bachelor' || deg === 'eap' || cat === 'eap') {
    return 'Bachelor';
  }
  if (deg === 'masters' || deg === 'master' || cat === 'master' || cat === 'graduate') {
    return 'Master';
  }
  if (deg === 'phd' || cat === 'phd') {
    return 'PhD';
  }
  if (deg === 'klp' || cat === 'klp') {
    return 'KLP';
  }
  return null;
}

export function formatRoundLabel(roundName: string): string {
  if (roundName === 'Round 1') return '1st Round';
  if (roundName === 'Round 2') return '2nd Round';
  if (roundName === 'Round 3') return '3rd Round';
  return roundName || 'General Round';
}

export function formatDegreeTabLabel(tab: DeadlineDegreeTab): string {
  if (tab === 'Bachelor') return "Bachelor's";
  if (tab === 'Master') return "Master's";
  if (tab === 'PhD') return 'PhD';
  return 'Korean Language Program';
}

/**
 * Classifies a deadline record into 'Open', 'Upcoming', 'Closed', or 'Not Announced'
 * strictly using verified dates and Korea Standard Time (KST).
 * Never assumes an application is Open without verified dates.
 */
export function classifyAdmissionDeadlineRound(
  round: RelationalAdmissionDeadlineRecord,
  todayKst: string = getTodayKstDateString()
): DeadlineTimingBucket {
  if (
    round.roundActiveStatus === 'Closed in Sheet (Strikethrough)' ||
    round.roundActiveStatus === 'No Recruitment (X)' ||
    round.intakeYear < 2027
  ) {
    return 'Closed';
  }

  if (round.roundActiveStatus === 'Not Announced') {
    return 'Not Announced';
  }

  const startIso = parseVerifiedAdmissionDate(
    round.onlineApplicationStartDate !== 'Not Announced'
      ? round.onlineApplicationStartDate
      : round.fileCollectionStartDate
  );

  const startYear = startIso ? Number(startIso.slice(0, 4)) : undefined;
  const startMonth = startIso ? Number(startIso.slice(5, 7)) : undefined;

  const endIso = parseVerifiedAdmissionDate(
    round.onlineApplicationDeadline !== 'Not Announced'
      ? round.onlineApplicationDeadline
      : round.dhlDeadlineUniversity !== 'Not Announced'
      ? round.dhlDeadlineUniversity
      : round.fileCollectionEndDate,
    startYear,
    startMonth
  );

  // Never show an application as Open or Upcoming without a verified deadline date
  if (!endIso) {
    return 'Not Announced';
  }

  // If deadline has passed in KST, it is Closed (Expired)
  if (endIso < todayKst) {
    return 'Closed';
  }

  // If start date is verified and is in the future in KST, it is Upcoming
  if (startIso && startIso > todayKst) {
    return 'Upcoming';
  }

  // Otherwise, start date <= todayKst <= endIso -> Currently Running (Open)
  return 'Open';
}

export interface EnrichedUniversityDeadlineItem {
  id: string;
  universityId: string;
  universitySlug: string;
  universityName: string;
  universityLogoUrl?: string;
  degreeTab: DeadlineDegreeTab;
  degreeDisplay: string;
  roundDisplay: string;
  intakeDisplay: string;
  applicationStartDate: string;
  applicationDeadline: string;
  status: DeadlineTimingBucket;
  lastVerifiedAt: string;
  sourceUrl: string;
  rawRound: RelationalAdmissionDeadlineRecord;
}

/**
 * Collects all verified admission deadline records across all universities in the database.
 */
export function getAllEnrichedUniversityDeadlines(
  universitiesList: University[]
): EnrichedUniversityDeadlineItem[] {
  const todayKst = getTodayKstDateString();
  const results: EnrichedUniversityDeadlineItem[] = [];

  for (const uni of universitiesList) {
    const bundle =
      uni.relationalBundle ||
      RELATIONAL_BUNDLE_BY_ID[uni.id] ||
      buildArchiveUniversityRelationalBundle(uni);
    const rounds = bundle?.admissionDeadlines || [];
    const slug = getUniversitySlug(uni);
    const hasLogo = Boolean(
      (bundle?.logo?.verified && bundle.logo.localAssetPath) || (uni.logoVerified && uni.logoUrl)
    );
    const logoUrl = hasLogo ? bundle?.logo?.localAssetPath || uni.logoUrl : undefined;

    for (const r of rounds) {
      const degreeTab = mapRoundToDegreeTab(r);
      if (!degreeTab) continue;

      const status = classifyAdmissionDeadlineRound(r, todayKst);
      const startDate =
        r.onlineApplicationStartDate && r.onlineApplicationStartDate !== 'Not Announced'
          ? r.onlineApplicationStartDate
          : r.fileCollectionStartDate && r.fileCollectionStartDate !== 'Not Announced'
          ? r.fileCollectionStartDate
          : 'Information not available';

      const deadlineDate =
        r.onlineApplicationDeadline && r.onlineApplicationDeadline !== 'Not Announced'
          ? r.onlineApplicationDeadline
          : r.dhlDeadlineUniversity && r.dhlDeadlineUniversity !== 'Not Announced'
          ? r.dhlDeadlineUniversity
          : r.fileCollectionEndDate && r.fileCollectionEndDate !== 'Not Announced'
          ? r.fileCollectionEndDate
          : 'Information not available';

      results.push({
        id: r.id,
        universityId: uni.id,
        universitySlug: slug,
        universityName: uni.officialName || uni.name,
        universityLogoUrl: logoUrl,
        degreeTab,
        degreeDisplay: formatDegreeTabLabel(degreeTab),
        roundDisplay: formatRoundLabel(r.applicationRound),
        intakeDisplay: r.intakeLabel || `${r.intakeSemester} ${r.intakeYear}`,
        applicationStartDate: startDate,
        applicationDeadline: deadlineDate,
        status,
        lastVerifiedAt: r.lastVerifiedDate || uni.lastVerifiedAt || '2026-11-12',
        sourceUrl: r.sourceUrl || uni.internationalOfficeUrl || uni.officialWebsite || '',
        rawRound: r,
      });
    }
  }

  return results;
}
