/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Structured Extraction of Official Uploaded PDF:
 * /assets/aistudio/All_UNI_DEADLINE_-_Google_Sheets_0b275056.pdf
 * ("MARCH 27 INTAKE-DEADLINES - ALL UNIVERSITY & PROGRAM (KLP, EAP, BACHELOR, MASTER'S & PhD)")
 *
 * Rules strictly enforced:
 * - Never mixes 2026 intake deadlines with Spring/March 2027 intake deadlines.
 * - Preserves original PDF dates, BD Time notes, strikethrough status, and (Approx.) markers.
 * - Displays "Not Announced" wherever a field is blank in the PDF or not yet announced.
 * - Explicitly flags ambiguous/contradictory dates for manual verification without silently altering them.
 */

import { RelationalAdmissionDeadlineRecord, ProgramCategoryCode } from './relationalTypes';

const PDF_ASSET_URL = '/assets/aistudio/All_UNI_DEADLINE_-_Google_Sheets_0b275056.pdf';
const PDF_SOURCE_LABEL = 'All UNI DEADLINE - Google Sheets.pdf (March 2027 Intake)';

interface QuickRoundInput {
  id: string;
  universityId: string;
  degreeLevel: RelationalAdmissionDeadlineRecord['degreeLevel'];
  programCategory: ProgramCategoryCode;
  applicationRound: RelationalAdmissionDeadlineRecord['applicationRound'];
  roundActiveStatus: RelationalAdmissionDeadlineRecord['roundActiveStatus'];
  isApproximate?: boolean;
  flaggedForManualVerification?: boolean;
  manualVerificationNote?: string;
  fileCollectionStartDate?: string;
  fileCollectionEndDate?: string;
  fileCollectionRaw?: string;
  onlineApplicationStartDate?: string;
  onlineApplicationDeadline?: string;
  onlineApplicationRaw?: string;
  bangladeshTimeDeadline?: string;
  dhlDeadlineUniversity?: string;
  dhlDeadlineBangladeshOffice?: string;
  interviewDate?: string;
  interviewFormat?: string;
  documentScreeningDate?: string;
  admissionResultDate?: string;
  additionalDocumentDeadline?: string;
  paymentDeadline?: string;
  semesterStartingDate?: string;
  verificationStatus?: RelationalAdmissionDeadlineRecord['verificationStatus'];
}

function makeMarch2027Round(input: QuickRoundInput): RelationalAdmissionDeadlineRecord {
  const na = 'Not Announced';
  return {
    id: input.id,
    universityId: input.universityId,
    intakeYear: 2027,
    intakeSemester: 'Spring (March)',
    intakeLabel: 'March 2027 Intake (Spring 2027)',
    degreeLevel: input.degreeLevel,
    programCategory: input.programCategory,
    applicationRound: input.applicationRound,
    roundActiveStatus: input.roundActiveStatus,
    isApproximate: Boolean(input.isApproximate),
    flaggedForManualVerification: Boolean(input.flaggedForManualVerification),
    manualVerificationNote: input.manualVerificationNote,
    fileCollectionStartDate: input.fileCollectionStartDate || na,
    fileCollectionEndDate: input.fileCollectionEndDate || na,
    fileCollectionRaw: input.fileCollectionRaw || na,
    onlineApplicationStartDate: input.onlineApplicationStartDate || na,
    onlineApplicationDeadline: input.onlineApplicationDeadline || na,
    onlineApplicationRaw: input.onlineApplicationRaw || na,
    bangladeshTimeDeadline: input.bangladeshTimeDeadline || na,
    dhlDeadlineUniversity: input.dhlDeadlineUniversity || na,
    dhlDeadlineBangladeshOffice: input.dhlDeadlineBangladeshOffice || na,
    interviewDate: input.interviewDate || na,
    interviewFormat: input.interviewFormat || na,
    documentScreeningDate: input.documentScreeningDate || na,
    admissionResultDate: input.admissionResultDate || na,
    additionalDocumentDeadline: input.additionalDocumentDeadline || na,
    paymentDeadline: input.paymentDeadline || na,
    semesterStartingDate: input.semesterStartingDate || 'March 2027 (Spring Semester)',
    sourceDocument: PDF_SOURCE_LABEL,
    sourceUrl: PDF_ASSET_URL,
    verificationStatus: input.verificationStatus || 'Verified',
    lastVerifiedDate: '2026-11-12'
  };
}

export const INITIAL_ADMISSION_DEADLINES_25: RelationalAdmissionDeadlineRecord[] = [
  // =========================================================================
  // 1. KYUNGSUNG UNIVERSITY (KSU) - BUSAN (PDF Page 1)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-ksu-2027s-klp-r1',
    universityId: 'kyungsung-university',
    degreeLevel: 'KLP',
    programCategory: 'KLP',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    onlineApplicationStartDate: '17st Aug 2026',
    onlineApplicationDeadline: '18st Sept 2026',
    onlineApplicationRaw: '17st Aug ~ 18st Sept 2026(01:00PM BD TIME)',
    bangladeshTimeDeadline: '18st Sept 2026 (01:00PM BD TIME)',
    interviewDate: '28st Sept ~ 02nd Oct 2026',
    admissionResultDate: '16 Oct 2026'
  }),
  makeMarch2027Round({
    id: 'dl-ksu-2027s-bachelor-r1',
    universityId: 'kyungsung-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionEndDate: '20th Sep 2026',
    fileCollectionRaw: '20th Sep 2026',
    onlineApplicationStartDate: '11th Sep 2026',
    onlineApplicationDeadline: '21th Sep 2026',
    onlineApplicationRaw: '11th Sep ~ 21th Sep 2026 (BD Time 8:00 PM)',
    bangladeshTimeDeadline: '21th Sep 2026 (BD Time 8:00 PM)',
    interviewDate: '04th Nov - 09th Nov 2026',
    admissionResultDate: '16th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-ksu-2027s-bachelor-r2',
    universityId: 'kyungsung-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionEndDate: '11th Oct 2026',
    fileCollectionRaw: '11th Oct 2026',
    onlineApplicationStartDate: '28th Sep 2026',
    onlineApplicationDeadline: '12th Oct 2026',
    onlineApplicationRaw: '28th Sep ~ 12th Oct 2026 (BD Time 8:00 PM)',
    bangladeshTimeDeadline: '12th Oct 2026 (BD Time 8:00 PM)',
    interviewDate: '04th Nov - 09th Nov 2026',
    admissionResultDate: '16th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-ksu-2027s-masters-r1',
    universityId: 'kyungsung-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionEndDate: '20th Sep 2026',
    fileCollectionRaw: '20th Sep 2026',
    onlineApplicationStartDate: '11th Sep 2026',
    onlineApplicationDeadline: '21th Sep 2026',
    onlineApplicationRaw: '11th Sep ~ 21th Sep 2026 (BD Time 8:00 PM)',
    bangladeshTimeDeadline: '21th Sep 2026 (BD Time 8:00 PM)',
    interviewDate: '04th Nov - 09th Nov 2026',
    admissionResultDate: '16th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-ksu-2027s-masters-r2',
    universityId: 'kyungsung-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionEndDate: '11th Oct 2026',
    fileCollectionRaw: '11th Oct 2026',
    onlineApplicationStartDate: '28th Sep 2026',
    onlineApplicationDeadline: '12th Oct 2026',
    onlineApplicationRaw: '28th Sep ~ 12th Oct 2026 (BD Time 8:00 PM)',
    bangladeshTimeDeadline: '12th Oct 2026 (BD Time 8:00 PM)',
    interviewDate: '04th Nov - 09th Nov 2026',
    admissionResultDate: '16th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-ksu-2027s-phd-r1',
    universityId: 'kyungsung-university',
    degreeLevel: 'PhD',
    programCategory: 'PhD',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Partially Verified'
  }),

  // =========================================================================
  // 2. SEJONG UNIVERSITY (SJU) - SEOUL (PDF Page 3)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-sejong-2027s-bachelor-r1',
    universityId: 'sejong-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '07th Sept 2026',
    fileCollectionEndDate: '21th Sept 2026',
    fileCollectionRaw: '07th ~ 21th Sept 2026',
    onlineApplicationStartDate: '07th Sept 2026',
    onlineApplicationDeadline: '21th Sept 2026',
    onlineApplicationRaw: '07th ~ 21th Sept 2026(01:00 PM BD TIME)',
    bangladeshTimeDeadline: '21th Sept 2026 (01:00 PM BD TIME)',
    dhlDeadlineUniversity: '21th Sept 2026',
    dhlDeadlineBangladeshOffice: '16th Sept 2026',
    additionalDocumentDeadline: 'Complete Doc DHL Date (BD off): 12th Nov 2026',
    interviewDate: '15th Oct ~ 20th Oct 2026',
    admissionResultDate: '09th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-sejong-2027s-bachelor-r2',
    universityId: 'sejong-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionStartDate: '1st Oct 2026',
    fileCollectionEndDate: '13th Nov 2026',
    fileCollectionRaw: '1st Oct ~ 13th Nov 2026',
    onlineApplicationStartDate: '22nd Oct 2026',
    onlineApplicationDeadline: '13th Nov 2026',
    onlineApplicationRaw: '22nd Oct ~ 13th Nov 2026(01:00 PM BD TIME)',
    bangladeshTimeDeadline: '13th Nov 2026 (01:00 PM BD TIME)',
    dhlDeadlineUniversity: '13th Nov 2026',
    dhlDeadlineBangladeshOffice: '09th Nov 2026',
    interviewDate: '04th Dec ~ 09th Dec 2026',
    admissionResultDate: '22nd Dec 2026'
  }),
  makeMarch2027Round({
    id: 'dl-sejong-2027s-masters-r1',
    universityId: 'sejong-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '07th Sept 2026',
    fileCollectionEndDate: '21th Sept 2026',
    fileCollectionRaw: '07th ~ 21th Sept 2026',
    onlineApplicationStartDate: '07th Sept 2026',
    onlineApplicationDeadline: '21th Sept 2026',
    onlineApplicationRaw: '07th ~ 21th Sept 2026(01:00 PM BD TIME)',
    bangladeshTimeDeadline: '21th Sept 2026 (01:00 PM BD TIME)',
    dhlDeadlineUniversity: '21th Sept 2026',
    dhlDeadlineBangladeshOffice: '16th Sept 2026',
    additionalDocumentDeadline: 'Complete Doc DHL Date (BD off): 12th Nov 2026',
    interviewDate: '15th Oct ~ 20th Oct 2026',
    admissionResultDate: '09th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-sejong-2027s-masters-r2',
    universityId: 'sejong-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionStartDate: '1st Oct 2026',
    fileCollectionEndDate: '13th Nov 2026',
    fileCollectionRaw: '1st Oct ~ 13th Nov 2026',
    onlineApplicationStartDate: '22nd Oct 2026',
    onlineApplicationDeadline: '13th Nov 2026',
    onlineApplicationRaw: '22nd Oct ~ 13th Nov 2026(01:00 PM BD TIME)',
    bangladeshTimeDeadline: '13th Nov 2026 (01:00 PM BD TIME)',
    dhlDeadlineUniversity: '13th Nov 2026',
    dhlDeadlineBangladeshOffice: '09th Nov 2026',
    interviewDate: '04th Dec ~ 09th Dec 2026',
    admissionResultDate: '22nd Dec 2026'
  }),

  // =========================================================================
  // 3. SEOJEONG UNIVERSITY (SJU) - YANGJU (PDF Page 3)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-seojeong-2027s-eap-r1',
    universityId: 'seojeong-university',
    degreeLevel: 'EAP',
    programCategory: 'EAP',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '16th Aug 2026',
    fileCollectionEndDate: '31st Aug 2026',
    fileCollectionRaw: '16th Aug ~ 31st Aug 2026',
    onlineApplicationStartDate: '31st Aug 2026',
    onlineApplicationDeadline: '1st Sept 2026',
    onlineApplicationRaw: '31st Aug ~ 1st Sept 2026(03:00PM BD TIME)',
    bangladeshTimeDeadline: '1st Sept 2026 (03:00PM BD TIME)',
    dhlDeadlineUniversity: '04th Sept 2026',
    dhlDeadlineBangladeshOffice: '30th Aug 2026',
    interviewDate: '07th Sept ~ 08th Sept 2026',
    admissionResultDate: '10th Sept 2026'
  }),
  makeMarch2027Round({
    id: 'dl-seojeong-2027s-eap-r2',
    universityId: 'seojeong-university',
    degreeLevel: 'EAP',
    programCategory: 'EAP',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '01st Sept 2026',
    fileCollectionEndDate: '14th Sept 2026',
    fileCollectionRaw: '01st Sept ~ 14th Sept 2026',
    onlineApplicationStartDate: '14th Sept 2026',
    onlineApplicationDeadline: '15th Sept 2026',
    onlineApplicationRaw: '14th Sept ~ 15th Sept 2026(03:00PM BD TIME)',
    bangladeshTimeDeadline: '15th Sept 2026 (03:00PM BD TIME)',
    dhlDeadlineUniversity: '18th Sept 2026',
    dhlDeadlineBangladeshOffice: '14th Sept 2026',
    interviewDate: '21st Sept ~ 23rd Sept 2026',
    admissionResultDate: '28th Sept 2026'
  }),
  makeMarch2027Round({
    id: 'dl-seojeong-2027s-eap-r3',
    universityId: 'seojeong-university',
    degreeLevel: 'EAP',
    programCategory: 'EAP',
    applicationRound: 'Round 3',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '15th Sept 2026',
    fileCollectionEndDate: '28th Sept 2026',
    fileCollectionRaw: '15th Sept ~ 28th Sept 2026',
    onlineApplicationStartDate: '28th Sept 2026',
    onlineApplicationDeadline: '29th Sept 2026',
    onlineApplicationRaw: '28th Sept ~ 29th Sept 2026(03:00PM BD TIME)',
    bangladeshTimeDeadline: '29th Sept 2026 (03:00PM BD TIME)',
    dhlDeadlineUniversity: '2nd Oct 2026',
    dhlDeadlineBangladeshOffice: '28th Sept 2026',
    interviewDate: '06th Oct ~ 08th Oct 2026',
    admissionResultDate: '12th Oct 2026'
  }),

  // =========================================================================
  // 4. SILLA UNIVERSITY (PDF Page 5)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-silla-2027s-masters-r1',
    universityId: 'silla-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Open / Upcoming',
    onlineApplicationStartDate: '01 NOV 2026',
    onlineApplicationDeadline: '10 NOV 2026',
    onlineApplicationRaw: '01 NOV 2026 ~ 10 NOV 2026',
    dhlDeadlineUniversity: '10 NOV 2026 ~ 14 NOV 2026'
  }),

  // =========================================================================
  // 5. SONGHO UNIVERSITY (Not in PDF -> Structured Not Announced)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-songho-2027s-associate-r1',
    universityId: 'songho-university',
    degreeLevel: 'Associate',
    programCategory: 'Associate',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 6. SOOKMYUNG WOMEN'S UNIVERSITY (SMU) - SEOUL (PDF Page 1 & Page 3 top)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-sookmyung-2027s-klp-r1',
    universityId: 'sookmyung-womens-university',
    degreeLevel: 'KLP',
    programCategory: 'KLP',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Partially Verified'
  }),
  makeMarch2027Round({
    id: 'dl-sookmyung-2027s-bachelor-r1',
    universityId: 'sookmyung-womens-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    isApproximate: true,
    fileCollectionStartDate: '26th Aug 2026',
    fileCollectionEndDate: '16th Oct 2026 (Approx.)',
    fileCollectionRaw: '26th Aug ~ 16th Oct 2026 (Approx.)',
    onlineApplicationStartDate: '07th Oct 2026',
    onlineApplicationDeadline: '16th Oct 2026',
    onlineApplicationRaw: '07th Oct ~ 16th Oct 2026',
    dhlDeadlineUniversity: '30th Oct 2026 (Friday)',
    dhlDeadlineBangladeshOffice: '25th Oct 2026',
    interviewDate: '09th Nov 2026 (Friday)',
    admissionResultDate: '27th Nov 2026 (Friday)'
  }),
  makeMarch2027Round({
    id: 'dl-sookmyung-2027s-bachelor-r2',
    universityId: 'sookmyung-womens-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    isApproximate: true,
    fileCollectionStartDate: '26th Aug 2026',
    fileCollectionEndDate: '30th Sep 2026 (Approx.)',
    fileCollectionRaw: '26th Aug ~ 30th Sep 2026 (Approx.)',
    onlineApplicationStartDate: '06th Nov 2026',
    onlineApplicationDeadline: '20th Nov 2026 (Friday)',
    onlineApplicationRaw: '06th Nov ~ 20th Nov 2026 (Friday)',
    dhlDeadlineUniversity: '27th Nov 2026 (Friday)',
    dhlDeadlineBangladeshOffice: '22th Nov 2026 (Friday)',
    interviewDate: '11th Dec 2026',
    admissionResultDate: '06th Jan 2027'
  }),
  makeMarch2027Round({
    id: 'dl-sookmyung-2027s-bachelor-r3',
    universityId: 'sookmyung-womens-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 3',
    roundActiveStatus: 'Open / Upcoming',
    isApproximate: true,
    fileCollectionStartDate: '27th Aug 2026',
    fileCollectionEndDate: '27th Nov 2026 (Approx.)',
    fileCollectionRaw: '27th Aug ~ 27th Nov 2026 (Approx.)',
    onlineApplicationStartDate: '03rd Dec 2026',
    onlineApplicationDeadline: '18th Dec 2026',
    onlineApplicationRaw: '03rd Dec ~ 18th Dec 2026',
    dhlDeadlineUniversity: '18th Dec 2026 (Friday)',
    dhlDeadlineBangladeshOffice: '11th Dec 2026 (Friday)',
    interviewDate: '28th Dec 2026',
    admissionResultDate: '15th Jan 2027 (Friday)'
  }),
  makeMarch2027Round({
    id: 'dl-sookmyung-2027s-masters-r1',
    universityId: 'sookmyung-womens-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionStartDate: '23 SEPT 2026',
    fileCollectionEndDate: '12 OCT 2026',
    fileCollectionRaw: '23 SEPT 2026 ~ 12 OCT 2026',
    onlineApplicationStartDate: '07 OCT 2026',
    onlineApplicationDeadline: '15 OCT 2026',
    onlineApplicationRaw: '07 OCT 2026 ~ 15 OCT 2026',
    dhlDeadlineUniversity: '16 OCT 2026',
    dhlDeadlineBangladeshOffice: '12 OCT 2026',
    interviewDate: '07 NOV 2026',
    admissionResultDate: '08 DEC 2026'
  }),

  // =========================================================================
  // 7. SUNGSHIN WOMEN'S UNIVERSITY (SWU) - SEOUL (PDF Page 3)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-sungshin-2027s-bachelor-r1',
    universityId: 'sungshin-womens-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionStartDate: '01 SEP 2026',
    fileCollectionEndDate: '26 NOV 2026',
    fileCollectionRaw: '01 SEP 2026 ~ 26 NOV 2026',
    onlineApplicationStartDate: '14 OCT 2026',
    onlineApplicationDeadline: '02 DEC 2026',
    onlineApplicationRaw: '14 OCT 2026 ~ 02 DEC 2026',
    dhlDeadlineUniversity: '28 Nov 2026',
    dhlDeadlineBangladeshOffice: '26 Nov 2026',
    interviewDate: '(Online will be announced)',
    interviewFormat: 'Online (Schedule TBA)',
    admissionResultDate: '30th Dec 2026'
  }),
  makeMarch2027Round({
    id: 'dl-sungshin-2027s-bachelor-r2',
    universityId: 'sungshin-womens-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionStartDate: '30 Nov 2026',
    fileCollectionEndDate: '30 DEC 2026',
    fileCollectionRaw: '30 Nov 2026 ~ 30 DEC 2026',
    onlineApplicationStartDate: '4th JAN 2027',
    onlineApplicationDeadline: '11th Jan 2027',
    onlineApplicationRaw: '4th JAN 2027 ~ 11th Jan 2027',
    dhlDeadlineUniversity: '06 Jan 2027',
    dhlDeadlineBangladeshOffice: '04 Jan 2027',
    interviewDate: '(Online will be announced)',
    interviewFormat: 'Online (Schedule TBA)',
    admissionResultDate: '27th JAN 2027'
  }),

  // =========================================================================
  // 8. TONGMYONG UNIVERSITY (TU) - BUSAN (PDF Page 1)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-tongmyong-2027s-bachelor-r1',
    universityId: 'tongmyong-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    onlineApplicationStartDate: '21 SEP 2026',
    onlineApplicationDeadline: '06 OCT 2026',
    onlineApplicationRaw: '21 SEP 2026 ~ 06 OCT 2026',
    interviewDate: '07 OCT ~ 19 OCT (DS)',
    interviewFormat: 'Document Screening (DS)',
    documentScreeningDate: '07 OCT ~ 19 OCT 2026',
    admissionResultDate: '21 OCT 2026'
  }),
  makeMarch2027Round({
    id: 'dl-tongmyong-2027s-bachelor-r2',
    universityId: 'tongmyong-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionEndDate: '19th Oct 2026',
    fileCollectionRaw: '19th Oct',
    onlineApplicationStartDate: '20th Oct 2026',
    onlineApplicationDeadline: '20th Nov 2026',
    onlineApplicationRaw: '20th Oct - 20th Nov (2 PM BD Time)',
    bangladeshTimeDeadline: '20th Nov 2026 (2 PM BD Time)',
    dhlDeadlineUniversity: '20th Nov 2026',
    dhlDeadlineBangladeshOffice: '15th Nov 2026',
    interviewDate: '23 NOV 2026 ~ 10 DEC 2026',
    admissionResultDate: '14 DEC 2026'
  }),
  makeMarch2027Round({
    id: 'dl-tongmyong-2027s-masters-r1',
    universityId: 'tongmyong-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionEndDate: '20th Sep 2026',
    fileCollectionRaw: '20th Sep',
    onlineApplicationStartDate: '21th Sept 2026',
    onlineApplicationDeadline: '6th Oct 2026',
    onlineApplicationRaw: '21th Sept - 6th Oct',
    dhlDeadlineUniversity: '6th Oct 2026',
    dhlDeadlineBangladeshOffice: '1st Oct 2026',
    interviewDate: '07 OCT ~ 19 OCT (DS)',
    interviewFormat: 'Document Screening (DS)',
    documentScreeningDate: '07 OCT ~ 19 OCT 2026',
    admissionResultDate: '21 OCT 2026'
  }),
  makeMarch2027Round({
    id: 'dl-tongmyong-2027s-masters-r2',
    universityId: 'tongmyong-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionEndDate: '19th Oct 2026',
    fileCollectionRaw: '19th Oct',
    onlineApplicationStartDate: '20th Oct 2026',
    onlineApplicationDeadline: '20th Nov 2026',
    onlineApplicationRaw: '20th Oct - 20th Nov (2 PM BD Time)',
    bangladeshTimeDeadline: '20th Nov 2026 (2 PM BD Time)',
    dhlDeadlineUniversity: '20th Nov 2026',
    dhlDeadlineBangladeshOffice: '15th Nov 2026',
    interviewDate: '23 NOV 2026 ~ 10 DEC 2026',
    admissionResultDate: '14 DEC 2026'
  }),

  // =========================================================================
  // 9. WOOSONG UNIVERSITY (Not in PDF -> Structured Not Announced)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-woosong-2027s-bachelor-r1',
    universityId: 'woosong-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 10. YEWON ARTS UNIVERSITY (Not in PDF -> Structured Not Announced)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-yewon-2027s-bachelor-r1',
    universityId: 'yewon-arts-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 11. YOUNGSAN UNIVERSITY (Not in PDF -> Structured Not Announced)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-youngsan-2027s-bachelor-r1',
    universityId: 'youngsan-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 12. aSSIST UNIVERSITY - SEOUL (PDF Page 3)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-assist-2027s-masters-r1',
    universityId: 'assist-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '7 Oct 2026',
    fileCollectionEndDate: '14 Oct 2026',
    fileCollectionRaw: '7 Oct ~ 14 Oct 2026',
    onlineApplicationStartDate: '07 Oct 2026',
    onlineApplicationDeadline: '14 OCT 2026',
    onlineApplicationRaw: '07 Oct 2026 ~ 14 OCT 2026',
    dhlDeadlineUniversity: '20 Oct 2026',
    dhlDeadlineBangladeshOffice: '15 Oct 2026',
    interviewDate: '19 Oct 2026',
    admissionResultDate: 'Will be Updated'
  }),
  makeMarch2027Round({
    id: 'dl-assist-2027s-masters-r2',
    universityId: 'assist-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionStartDate: '15th Oct 2026',
    fileCollectionEndDate: '09 Nov 2026',
    fileCollectionRaw: '15th Oct ~ 09 Nov 2026',
    onlineApplicationStartDate: '15 Oct 2026',
    onlineApplicationDeadline: '11 Nov 2026',
    onlineApplicationRaw: '15 Oct 2026 ~ 11 Nov 2026',
    dhlDeadlineUniversity: '15 Nov 2026',
    dhlDeadlineBangladeshOffice: '10 Nov 2026',
    interviewDate: '16 Nov 2026',
    admissionResultDate: 'Will be Updated'
  }),

  // =========================================================================
  // 13. BUSAN INSTITUTE OF SCIENCE AND TECHNOLOGY (Not in PDF)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-bist-2027s-associate-r1',
    universityId: 'busan-institute-of-science-and-technology',
    degreeLevel: 'Associate',
    programCategory: 'Associate',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 14. CHUNGBUK NATIONAL UNIVERSITY (CBNU) - CHEONGJU (PDF Page 3)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-cbnu-2027s-masters-r1',
    universityId: 'chungbuk-national-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '12 Oct 2026',
    fileCollectionEndDate: '30 Oct 2026',
    fileCollectionRaw: '12 Oct ~ 30 Oct 2026',
    onlineApplicationStartDate: '12 Oct 2026',
    onlineApplicationDeadline: '30 OCT 2026',
    onlineApplicationRaw: '12 Oct 2026 ~ 30 OCT 2026',
    dhlDeadlineUniversity: '06 Nov 2026',
    dhlDeadlineBangladeshOffice: '29 Oct 2026',
    interviewDate: "(Only doc's screening)",
    interviewFormat: 'Document Screening Only',
    admissionResultDate: '21 Dec 2026'
  }),
  makeMarch2027Round({
    id: 'dl-cbnu-2027s-masters-r2',
    universityId: 'chungbuk-national-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionStartDate: '23 Nov 2026',
    fileCollectionEndDate: '11 Dec 2026',
    fileCollectionRaw: '23 Nov ~ 11 Dec 2026',
    onlineApplicationStartDate: '23 Nov 2026',
    onlineApplicationDeadline: '11 Dec 2026',
    onlineApplicationRaw: '23 Nov ~ 11 Dec 2026',
    dhlDeadlineUniversity: '11 Dec 2026',
    dhlDeadlineBangladeshOffice: '07 Dec 2026',
    interviewDate: "(Only doc's screening)",
    interviewFormat: 'Document Screening Only',
    admissionResultDate: '22 Jan 2027'
  }),

  // =========================================================================
  // 15. DONG-A UNIVERSITY - BUSAN (PDF Page 3)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-donga-2027s-masters-r1',
    universityId: 'dong-a-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '30th Sep 2026',
    fileCollectionEndDate: '14th Oct 2026',
    fileCollectionRaw: '30th Sep ~ 14th Oct 2026',
    onlineApplicationStartDate: '30th Sep 2026',
    onlineApplicationDeadline: '14th Oct 2026',
    onlineApplicationRaw: '30th Sep ~ 14th Oct 2026',
    dhlDeadlineUniversity: '27th Nov 2026',
    dhlDeadlineBangladeshOffice: '17th Nov 2026',
    interviewDate: '04th Nov 2026',
    admissionResultDate: '11th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-donga-2027s-masters-r2',
    universityId: 'dong-a-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionStartDate: '01th Nov 2026',
    fileCollectionEndDate: '23rd Nov 2026',
    fileCollectionRaw: '01th Nov ~ 23rd Nov 2026',
    onlineApplicationStartDate: '09th NOV 2026',
    onlineApplicationDeadline: '23rd Nov 2026',
    onlineApplicationRaw: '09th NOV ~ 23rd Nov 2026',
    dhlDeadlineUniversity: '29th Jan 2027',
    dhlDeadlineBangladeshOffice: '22th Jan 2027',
    interviewDate: '11th Jan 2027 ~ 12th Jan 2027',
    admissionResultDate: '22th Jan 2027'
  }),

  // =========================================================================
  // 16. DONG-EUI INSTITUTE OF TECHNOLOGY (Not in PDF)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-dit-2027s-associate-r1',
    universityId: 'dong-eui-institute-of-technology',
    degreeLevel: 'Associate',
    programCategory: 'Associate',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 17. DONG-EUI UNIVERSITY (Not in PDF)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-deu-2027s-bachelor-r1',
    universityId: 'dong-eui-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 18. DONGSHIN UNIVERSITY - NAJU (PDF Page 5)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-dongshin-2027s-bachelor-r1',
    universityId: 'dongshin-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionEndDate: '29th Oct 2026',
    fileCollectionRaw: '~ 29th Oct 2026',
    onlineApplicationDeadline: '30 Oct 2026',
    onlineApplicationRaw: '~ 30 Oct 2026 (02:00 PM BD TIME)',
    bangladeshTimeDeadline: '30 Oct 2026 (02:00 PM BD TIME)',
    dhlDeadlineUniversity: '30 Oct 2026',
    dhlDeadlineBangladeshOffice: '27 Oct 2026 (During Application Scan DHL Need)',
    interviewDate: '13th Nov 2026',
    admissionResultDate: '20th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-dongshin-2027s-masters-r1',
    universityId: 'dongshin-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionEndDate: '19th Nov 2026',
    fileCollectionRaw: '~ 19th Nov 2026',
    onlineApplicationStartDate: '2 Nov 2026',
    onlineApplicationDeadline: '20 Nov 2026',
    onlineApplicationRaw: '2 Nov ~ 20 Nov 2026 (02:00 PM BD TIME)',
    bangladeshTimeDeadline: '20 Nov 2026 (02:00 PM BD TIME)',
    dhlDeadlineUniversity: '20 Nov 2026',
    dhlDeadlineBangladeshOffice: '16 Nov 2026 (During Application Scan DHL Need)',
    interviewDate: '4th Dec 2026',
    admissionResultDate: '11th Dec 2026'
  }),

  // =========================================================================
  // 19. GACHON UNIVERSITY (GCU) - SEONGNAM (PDF Page 1)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-gachon-2027s-bachelor-r1',
    universityId: 'gachon-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '06th Sep 2026',
    fileCollectionEndDate: '09th Oct 2026',
    fileCollectionRaw: '06th Sep ~ 09th Oct 2026',
    onlineApplicationStartDate: '12th Oct 2026',
    onlineApplicationDeadline: '23th Oct 2026',
    onlineApplicationRaw: '12th Oct ~ 23th Oct 2026',
    dhlDeadlineUniversity: '23rd Oct 2026',
    dhlDeadlineBangladeshOffice: '18th Oct 2026',
    interviewDate: "(Only doc's screening)",
    interviewFormat: 'Document Screening Only',
    admissionResultDate: '20th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-gachon-2027s-bachelor-r2',
    universityId: 'gachon-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    fileCollectionStartDate: '6th Sep 2026',
    fileCollectionEndDate: '16th Nov 2026',
    fileCollectionRaw: '6th Sep ~ 16th Nov 2026',
    onlineApplicationStartDate: '23rd Nov 2026',
    onlineApplicationDeadline: '04th Dec 2026',
    onlineApplicationRaw: '23rd Nov ~ 04th Dec 2026',
    dhlDeadlineUniversity: '04th Dec 2026',
    dhlDeadlineBangladeshOffice: '28th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-gachon-2027s-bachelor-r3',
    universityId: 'gachon-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 3',
    roundActiveStatus: 'Open / Upcoming',
    flaggedForManualVerification: true,
    manualVerificationNote:
      'Flagged for Manual Verification: Source PDF lists Apply Period as "28th Dec ~ 04th Jan 2026" (year likely 2027) and DHL Dates as "04th Dec 2026" / "28th Nov 2026" (precedes Dec 28 start; appears copied from Round 2). Original text preserved verbatim.',
    fileCollectionStartDate: '6th Sep 2026',
    fileCollectionEndDate: '23th Dec 2026',
    fileCollectionRaw: '6th Sep ~ 23th Dec 2026',
    onlineApplicationStartDate: '28th Dec 2026',
    onlineApplicationDeadline: '04th Jan 2026',
    onlineApplicationRaw: '28th Dec ~ 04th Jan 2026',
    dhlDeadlineUniversity: '04th Dec 2026',
    dhlDeadlineBangladeshOffice: '28th Nov 2026',
    verificationStatus: 'Needs Verification'
  }),
  makeMarch2027Round({
    id: 'dl-gachon-2027s-masters-r1',
    universityId: 'gachon-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    isApproximate: true,
    fileCollectionStartDate: '15th Aug 2026',
    fileCollectionEndDate: '12th Oct 2026 (Approx.)',
    fileCollectionRaw: '15th Aug ~ 12th Oct 2026 (Approx.)',
    onlineApplicationStartDate: '07th Oct 2026',
    onlineApplicationDeadline: '14th Oct 2026',
    onlineApplicationRaw: '07th Oct ~ 14th Oct 2026',
    dhlDeadlineUniversity: '15th Oct 2026',
    dhlDeadlineBangladeshOffice: '11th Oct 2026',
    interviewDate: "(Only doc's screening)",
    interviewFormat: 'Document Screening Only',
    admissionResultDate: '11th Nov 2026'
  }),
  makeMarch2027Round({
    id: 'dl-gachon-2027s-masters-r2',
    universityId: 'gachon-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 2',
    roundActiveStatus: 'Open / Upcoming',
    isApproximate: true,
    fileCollectionStartDate: '15th Oct 2026',
    fileCollectionEndDate: '15th Nov 2026 (Approx.)',
    fileCollectionRaw: '15th Oct ~ 15th Nov 2026 (Approx.)',
    onlineApplicationStartDate: '11th Nov 2026',
    onlineApplicationDeadline: '18th Nov 2026',
    onlineApplicationRaw: '11th Nov ~ 18th Nov 2026',
    dhlDeadlineUniversity: '19th Nov 2026',
    dhlDeadlineBangladeshOffice: '15th Nov 2026',
    interviewDate: "(Only doc's screening)",
    interviewFormat: 'Document Screening Only',
    admissionResultDate: '16th Dec 2026'
  }),
  makeMarch2027Round({
    id: 'dl-gachon-2027s-masters-r3',
    universityId: 'gachon-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 3',
    roundActiveStatus: 'Open / Upcoming',
    isApproximate: true,
    flaggedForManualVerification: true,
    manualVerificationNote:
      'Flagged for Manual Verification: Source PDF lists Results as "20th Jan 2026" following a Dec 2026 application period (year likely 2027). Original text preserved verbatim.',
    fileCollectionStartDate: '15th Dec 2026',
    fileCollectionEndDate: '23th Dec 2026 (Approx.)',
    fileCollectionRaw: '15th Dec ~ 23th Dec 2026 (Approx.)',
    onlineApplicationStartDate: '16th Dec 2026',
    onlineApplicationDeadline: '23rd Dec 2026',
    onlineApplicationRaw: '16th Dec ~ 23rd Dec 2026',
    dhlDeadlineUniversity: '24th Dec 2026',
    dhlDeadlineBangladeshOffice: '20th Dec 2026',
    interviewDate: "(Only doc's screening)",
    interviewFormat: 'Document Screening Only',
    admissionResultDate: '20th Jan 2026',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 20. HANSEO UNIVERSITY (HSU) - SEOSAN (PDF Page 3)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-hanseo-2027s-eap-r1',
    universityId: 'hanseo-university',
    degreeLevel: 'EAP',
    programCategory: 'EAP',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Closed in Sheet (Strikethrough)',
    fileCollectionStartDate: '13th Aug 2026',
    fileCollectionEndDate: '22nd Aug 2026',
    fileCollectionRaw: '13th Aug ~ 22nd Aug 2026',
    onlineApplicationStartDate: '22nd Aug 2026',
    onlineApplicationDeadline: '22nd Aug 2026',
    onlineApplicationRaw: '22nd Aug 2026',
    dhlDeadlineUniversity: 'Will be anounce later',
    dhlDeadlineBangladeshOffice: 'Will be anounce later',
    interviewDate: '25th Aug 2026 (SPOT INTERVIEW)',
    interviewFormat: 'SPOT INTERVIEW',
    admissionResultDate: 'Will be anounce later'
  }),

  // =========================================================================
  // 21. HANYANG UNIVERSITY (Not in PDF -> Structured Not Announced)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-hanyang-2027s-bachelor-r1',
    universityId: 'hanyang-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 22. INJE UNIVERSITY (Not in PDF -> Structured Not Announced)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-inje-2027s-bachelor-r1',
    universityId: 'inje-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 23. JEONBUK NATIONAL UNIVERSITY (Not in PDF -> Official Admissions Notice)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-jbnu-2027s-bachelor-r1',
    universityId: 'jeonbuk-national-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  }),

  // =========================================================================
  // 24. KANGWON NATIONAL UNIVERSITY (KNU) (PDF Page 3)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-kangwon-2027s-masters-r1',
    universityId: 'kangwon-national-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Open / Upcoming',
    flaggedForManualVerification: true,
    manualVerificationNote:
      'Note: Source PDF spells university as "KANGWOON NATIONAL UNIVERSITY (KNU)" and marks Round 2 and Round 3 with "X" (No Round 2/3 Recruitment).',
    fileCollectionStartDate: '26th Oct 2026',
    fileCollectionEndDate: '10th Nov 2026',
    fileCollectionRaw: '26th Oct ~ 10th Nov 2026',
    onlineApplicationStartDate: '26th Oct 2026',
    onlineApplicationDeadline: '20th Nov 2026',
    onlineApplicationRaw: '26th Oct ~ 20th Nov 2026(01:00 PM BD TIME)',
    bangladeshTimeDeadline: '20th Nov 2026 (01:00 PM BD TIME)',
    dhlDeadlineUniversity: '19th Nov 2026',
    dhlDeadlineBangladeshOffice: '15th Nov 2026',
    interviewDate: 'Will be announced',
    admissionResultDate: 'Will be Announced'
  }),
  makeMarch2027Round({
    id: 'dl-kangwon-2027s-masters-r2',
    universityId: 'kangwon-national-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 2',
    roundActiveStatus: 'No Recruitment (X)'
  }),
  makeMarch2027Round({
    id: 'dl-kangwon-2027s-masters-r3',
    universityId: 'kangwon-national-university',
    degreeLevel: 'Masters',
    programCategory: 'Master',
    applicationRound: 'Round 3',
    roundActiveStatus: 'No Recruitment (X)'
  }),

  // =========================================================================
  // 25. KONYANG UNIVERSITY (Not in PDF -> Structured Not Announced)
  // =========================================================================
  makeMarch2027Round({
    id: 'dl-konyang-2027s-bachelor-r1',
    universityId: 'konyang-university',
    degreeLevel: 'Bachelor',
    programCategory: 'Bachelor',
    applicationRound: 'Round 1',
    roundActiveStatus: 'Not Announced',
    verificationStatus: 'Needs Verification'
  })
];
