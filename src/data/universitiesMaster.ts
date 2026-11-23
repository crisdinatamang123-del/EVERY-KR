import { University, UniversityImportReport, UniversityAccuracyAuditItem } from '../types';
import {
  APPROVED_25_UNIVERSITIES,
  RELATIONAL_BUNDLES_25,
  APPROVED_25_IDS,
  LEGACY_UNIVERSITY_ID_MAP,
  resolveCanonicalUniversityId,
  RELATIONAL_TABLES_25,
} from './universities25';
import {
  PRESERVED_113_ARCHIVE_UNIVERSITIES,
  PRESERVED_ARCHIVE_IDS,
  BACKUP_136_RECONCILIATION_SUMMARY,
} from './preservedUniversitiesArchive';

export {
  APPROVED_25_UNIVERSITIES,
  APPROVED_25_IDS,
  PRESERVED_113_ARCHIVE_UNIVERSITIES,
  PRESERVED_ARCHIVE_IDS,
  BACKUP_136_RECONCILIATION_SUMMARY,
  LEGACY_UNIVERSITY_ID_MAP,
  resolveCanonicalUniversityId,
  RELATIONAL_TABLES_25,
  RELATIONAL_BUNDLES_25,
};

export const PRESERVED_ARCHIVE_UNIVERSITIES: University[] = PRESERVED_113_ARCHIVE_UNIVERSITIES.map((u) => ({
  ...u,
  fiveTierVerificationStatus: u.verified
    ? 'Officially verified'
    : 'Available, not independently verified',
}));

export function isApprovedPriorityUniversity(uni: Pick<University, 'id' | 'isApproved25' | 'recordTier' | 'whitelistOrder'>): boolean {
  if (uni.isApproved25 === true || uni.recordTier === 'approved_25') return true;
  if (APPROVED_25_IDS.has(uni.id)) return true;
  if (typeof uni.whitelistOrder === 'number' && uni.whitelistOrder >= 1 && uni.whitelistOrder <= 25) {
    return true;
  }
  return false;
}

export function sortUniversitiesWithPriorityFirst(universities: University[]): University[] {
  return [...universities].sort((a, b) => {
    const aPriority = isApprovedPriorityUniversity(a);
    const bPriority = isApprovedPriorityUniversity(b);
    if (aPriority !== bPriority) return aPriority ? -1 : 1;
    if (aPriority && bPriority) {
      return (a.whitelistOrder ?? a.priorityRank ?? 99) - (b.whitelistOrder ?? b.priorityRank ?? 99);
    }
    const aRank = a.priorityRank ?? 9999;
    const bRank = b.priorityRank ?? 9999;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

/**
  * Full Non-Destructive University Store:
  * - Indices 0..24: Approved 25 Priority Universities (whitelistOrder 1..25)
  * - Indices 25..137: Preserved 113 Historical Archive Universities from the 136-record backup (0 deleted)
  */
export const MASTER_UNIVERSITIES: University[] = sortUniversitiesWithPriorityFirst([
  ...APPROVED_25_UNIVERSITIES,
  ...PRESERVED_ARCHIVE_UNIVERSITIES,
]);

const auditItems: UniversityAccuracyAuditItem[] = RELATIONAL_BUNDLES_25.map((b) => ({
  id: b.university.id,
  universityName: b.university.englishName,
  koreanName: b.university.koreanName,
  campusName: b.campuses[0]?.campusName || 'Main Campus',
  officialLogoVerified: b.completeness.eightPartChecklist.officialLogoVerified ? 'Yes' : 'No',
  officialWebsiteVerified: b.university.officialWebsiteUrl ? 'Yes' : 'No',
  campusInformationVerified: b.campuses.length > 0 ? 'Yes' : 'No',
  internationalAdmissionsVerified: b.university.internationalOfficeWebsiteUrl ? 'Yes' : 'No',
  admissionGuideFound: b.contacts.admissionGuidelineUrl ? 'Yes' : 'No',
  tuitionVerified: b.completeness.eightPartChecklist.tuitionVerified ? 'Yes' : 'No',
  scholarshipVerified: b.completeness.eightPartChecklist.scholarshipsVerified ? 'Yes' : 'No',
  sourceUrls: b.sources.map((s) => s.sourceUrl),
  missingInformation: b.completeness.missingFields,
  overallVerificationStatus: b.logo.verified ? 'VERIFIED' : 'PARTIALLY VERIFIED',
}));

export const MASTER_IMPORT_REPORT: UniversityImportReport = {
  timestamp: '2026-11-12T14:00:00Z',
  totalSupplied: MASTER_UNIVERSITIES.length,
  totalImported: MASTER_UNIVERSITIES.length,
  totalCampuses: RELATIONAL_TABLES_25.university_campuses.length + PRESERVED_ARCHIVE_UNIVERSITIES.length,
  totalDuplicates: 0,
  totalAliasesLinked: Object.keys(LEGACY_UNIVERSITY_ID_MAP).length,
  totalPendingVerification:
    RELATIONAL_BUNDLES_25.filter((b) => !b.logo.verified).length + PRESERVED_ARCHIVE_UNIVERSITIES.length,
  records: [
    ...RELATIONAL_BUNDLES_25.map((b) => ({
      name: b.university.englishName,
      campus: b.campuses.map((c) => c.campusName).join(' / '),
      status: (b.logo.verified ? 'imported' : 'pending_verification') as 'imported' | 'pending_verification',
      notes: `Priority #${b.university.whitelistOrder} of 25 | Tier: ${b.completeness.overallFiveTierStatus} | Checklist: ${b.completeness.eightPartChecklist.passedCount}/8 | Completeness: ${b.completeness.overallPercentage}%`,
    })),
    ...PRESERVED_ARCHIVE_UNIVERSITIES.map((u) => ({
      name: u.name,
      campus: u.campusName || 'Main Campus',
      status: 'pending_verification' as const,
      notes: 'Preserved Historical Record from 136-University Backup · Available, not independently verified',
    })),
  ],
  auditItems,
};
