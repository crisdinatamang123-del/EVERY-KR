/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Centralized Student Application Document Taxonomy & Dynamic University Checklist Engine.
 * Organizes all student documents and university-specific requirements into the 5 canonical categories:
 * - Personal Documents
 * - Academic Documents
 * - Language Documents
 * - Financial Documents
 * - Other Documents
 */

import {
  RELATIONAL_BUNDLE_BY_ID,
  resolveCanonicalUniversityId,
} from '../data/universities25';
import { buildChecklistForDegree } from '../services/smartApplicationService';
import type {
  ChecklistRequirementItem,
  SmartApplicationDocumentCategory,
  SmartApplicationRecord,
} from '../types/smartApplication';
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  buildApplicationDocumentMatrixFromChecklist,
  classifyDocumentCategory,
  maskPassportNumber,
  resolveDocumentVerificationStatus,
  type ApplicationDocumentMatrixResult,
  type CategorizedDocumentSlot,
  type DocumentCategoryMeta,
} from './applicationDocumentTaxonomyCore';

export {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  buildApplicationDocumentMatrixFromChecklist,
  classifyDocumentCategory,
  maskPassportNumber,
  resolveDocumentVerificationStatus,
};
export type {
  ApplicationDocumentMatrixResult,
  CategorizedDocumentSlot,
  ChecklistRequirementItem,
  DocumentCategoryMeta,
};

/**
 * Dynamically builds the complete document checklist for an application based on the selected
 * university's actual `applicationDocuments` configuration (for its degree level), merged with
 * every document the student actually uploaded and any staff-requested documents.
 */
export function buildApplicationDocumentMatrix(
  app: SmartApplicationRecord
): ApplicationDocumentMatrixResult {
  const canonicalId = resolveCanonicalUniversityId(app.universityId) || app.universityId;
  const bundle = RELATIONAL_BUNDLE_BY_ID[canonicalId];
  const { items: checklistItems, isGeneralFallback } = buildChecklistForDegree(
    bundle?.applicationDocuments,
    app.degreeLevel || 'Bachelor'
  );

  return buildApplicationDocumentMatrixFromChecklist(
    app,
    checklistItems,
    !isGeneralFallback
  );
}

/**
 * Dynamic requestable document options for an application: combines the university's real
 * `applicationDocuments` requirements with the complete 5-category EVERYKR catalog so staff
 * can request any missing or replacement document cleanly.
 */
export function buildRequestableDocumentCatalog(
  app: SmartApplicationRecord
): Array<{ docType: string; label: string; category: SmartApplicationDocumentCategory }> {
  const { slots } = buildApplicationDocumentMatrix(app);
  const byKey = new Map<
    string,
    { docType: string; label: string; category: SmartApplicationDocumentCategory }
  >();

  for (const s of slots) {
    byKey.set(s.docType, { docType: s.docType, label: s.label, category: s.category });
  }

  const standardCatalog: Array<{
    docType: string;
    label: string;
    category: SmartApplicationDocumentCategory;
  }> = [
    { docType: 'passport', label: 'Passport Bio Page', category: 'personal' },
    { docType: 'photo', label: 'Passport Photograph (Plain Background)', category: 'personal' },
    { docType: 'national_id', label: 'National ID Card', category: 'personal' },
    { docType: 'visa_residence', label: 'Visa / Residence Document', category: 'personal' },
    { docType: 'ssc_certificate', label: 'SSC Certificate', category: 'academic' },
    { docType: 'ssc_transcript', label: 'SSC Transcript', category: 'academic' },
    { docType: 'hsc_certificate', label: 'HSC Certificate', category: 'academic' },
    { docType: 'hsc_transcript', label: 'HSC Transcript', category: 'academic' },
    { docType: 'bachelor_certificate', label: "Bachelor's Certificate", category: 'academic' },
    { docType: 'bachelor_transcript', label: "Bachelor's Transcript", category: 'academic' },
    { docType: 'master_certificate', label: "Master's Certificate", category: 'academic' },
    { docType: 'transcript', label: 'Official Academic Transcripts', category: 'academic' },
    { docType: 'certificate', label: 'Degree / Graduation Certificate', category: 'academic' },
    { docType: 'language_certificate', label: 'Language Certificate (IELTS / TOEFL / TOPIK)', category: 'language' },
    { docType: 'bank_statement', label: 'Bank Statement', category: 'financial' },
    { docType: 'bank_solvency', label: 'Bank Solvency Certificate', category: 'financial' },
    { docType: 'sponsor_documents', label: 'Sponsor & Financial Guarantee Documents', category: 'financial' },
    { docType: 'study_plan', label: 'Study Plan / Personal Statement', category: 'other' },
    { docType: 'recommendation_letter', label: 'Recommendation Letter', category: 'other' },
    { docType: 'cv_resume', label: 'CV / Resume', category: 'other' },
    { docType: 'other', label: 'Additional University-Required Document', category: 'other' },
  ];

  for (const item of standardCatalog) {
    if (!byKey.has(item.docType)) {
      byKey.set(item.docType, item);
    }
  }

  return Array.from(byKey.values());
}

/**
 * Computes document completion metrics for table & header summary display.
 */
export function computeApplicationDocCompletion(app: SmartApplicationRecord): {
  uploaded: number;
  required: number;
  percent: number;
  uploadedCount: number;
  totalExpected: number;
  verifiedCount: number;
  rejectedCount: number;
} {
  const matrix = buildApplicationDocumentMatrix(app);
  return {
    uploaded: matrix.uploadedRequiredCount,
    required: matrix.requiredCount,
    percent: matrix.completionPercent,
    uploadedCount: matrix.totalUploadedCount,
    totalExpected: matrix.requiredCount,
    verifiedCount: matrix.verifiedCount,
    rejectedCount: matrix.rejectedCount,
  };
}
