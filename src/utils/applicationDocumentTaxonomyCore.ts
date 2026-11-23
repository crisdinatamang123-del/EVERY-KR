/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure isomorphic (browser + Node) core helpers for EVERYKR Student Application
 * 5-Category Document Taxonomy, Matrix Builder, and Passport Masking.
 * Intentionally free of Vite static asset imports and Firebase SDK imports so
 * deterministic unit tests and PDF export run cleanly in any runtime.
 */

import type {
  ChecklistRequirementItem,
  SmartApplicationDocumentCategory,
  SmartApplicationDocumentItem,
  SmartApplicationDocumentVerificationStatus,
  SmartApplicationRecord,
} from '../types/smartApplication';

export interface DocumentCategoryMeta {
  id: SmartApplicationDocumentCategory;
  label: string;
  description: string;
}

export const DOCUMENT_CATEGORIES: DocumentCategoryMeta[] = [
  {
    id: 'personal',
    label: 'Personal Documents',
    description: 'Passport bio page, passport photograph, national ID, visa or residence documents',
  },
  {
    id: 'academic',
    label: 'Academic Documents',
    description: 'SSC, HSC, Bachelor’s, Master’s certificates, transcripts, and academic records',
  },
  {
    id: 'language',
    label: 'Language Documents',
    description: 'IELTS, TOEFL, TOPIK, Duolingo, or other official language proficiency certificates',
  },
  {
    id: 'financial',
    label: 'Financial Documents',
    description: 'Bank statement, bank solvency certificate, sponsor documents, and financial guarantees',
  },
  {
    id: 'other',
    label: 'Other Documents',
    description: 'Study plan, personal statement, recommendation letters, CV, and university-specific forms',
  },
];

export const CATEGORY_LABELS: Record<SmartApplicationDocumentCategory, string> = {
  personal: 'Personal Documents',
  academic: 'Academic Documents',
  language: 'Language Documents',
  financial: 'Financial Documents',
  other: 'Other Documents',
};

/**
 * Classifies any document type/label into one of the 5 canonical EVERYKR admissions categories.
 */
export function classifyDocumentCategory(
  docType: string,
  label?: string
): SmartApplicationDocumentCategory {
  const combined = `${docType || ''} ${label || ''}`.toLowerCase();

  if (
    combined.includes('passport') ||
    combined.includes('photo') ||
    combined.includes('portrait') ||
    combined.includes('national_id') ||
    combined.includes('national id') ||
    combined.includes('nid') ||
    combined.includes('citizenship') ||
    combined.includes('family relation') ||
    combined.includes('birth certificate') ||
    combined.includes('arc') ||
    combined.includes('visa') ||
    combined.includes('residence')
  ) {
    return 'personal';
  }

  if (
    combined.includes('ielts') ||
    combined.includes('toefl') ||
    combined.includes('topik') ||
    combined.includes('duolingo') ||
    combined.includes('language') ||
    combined.includes('proficiency') ||
    combined.includes('english') ||
    combined.includes('korean_test')
  ) {
    return 'language';
  }

  if (
    combined.includes('bank') ||
    combined.includes('solvency') ||
    combined.includes('sponsor') ||
    combined.includes('financ') ||
    combined.includes('balance') ||
    combined.includes('affidavit') ||
    combined.includes('income') ||
    combined.includes('tax')
  ) {
    return 'financial';
  }

  if (
    combined.includes('transcript') ||
    combined.includes('certificate') ||
    combined.includes('diploma') ||
    combined.includes('graduation') ||
    combined.includes('degree') ||
    combined.includes('ssc') ||
    combined.includes('hsc') ||
    combined.includes('bachelor') ||
    combined.includes('master') ||
    combined.includes('phd') ||
    combined.includes('high school') ||
    combined.includes('academic') ||
    combined.includes('grade') ||
    combined.includes('marksheet') ||
    combined.includes('enrollment')
  ) {
    return 'academic';
  }

  return 'other';
}

export function resolveDocumentVerificationStatus(
  item?: SmartApplicationDocumentItem | null
): SmartApplicationDocumentVerificationStatus {
  if (!item) return 'pending';
  if (item.verificationStatus) return item.verificationStatus;
  if (item.verified) return 'verified';
  return 'pending';
}

export interface CategorizedDocumentSlot {
  docType: string;
  label: string;
  category: SmartApplicationDocumentCategory;
  requirementType: 'Mandatory' | 'Conditional' | 'Optional' | 'Uploaded';
  notes?: string;
  apostilleRequired?: boolean;
  translationRequired?: string;
  uploadedItem: SmartApplicationDocumentItem | null;
  verificationStatus: SmartApplicationDocumentVerificationStatus | 'missing';
  isRequested: boolean;
  requestDeadline?: string;
  requestNote?: string;
}

export interface ApplicationDocumentMatrixResult {
  slots: CategorizedDocumentSlot[];
  byCategory: Record<SmartApplicationDocumentCategory, CategorizedDocumentSlot[]>;
  requiredCount: number;
  uploadedRequiredCount: number;
  totalUploadedCount: number;
  verifiedCount: number;
  rejectedCount: number;
  completionPercent: number;
  isUniversitySpecificChecklist: boolean;
}

export function buildApplicationDocumentMatrixFromChecklist(
  app: SmartApplicationRecord,
  checklistItems: ChecklistRequirementItem[],
  isUniversitySpecificChecklist: boolean
): ApplicationDocumentMatrixResult {
  const docsMap = app.documents || {};
  const requestedMap = new Map(
    (app.requestedDocuments || []).map((r) => [r.docType, r])
  );
  const seenKeys = new Set<string>();
  const slots: CategorizedDocumentSlot[] = [];

  for (const req of checklistItems) {
    seenKeys.add(req.docType);
    const uploadedItem = docsMap[req.docType] || null;
    const reqEntry = requestedMap.get(req.docType);
    const category =
      uploadedItem?.category || classifyDocumentCategory(req.docType, req.label);
    const verificationStatus: SmartApplicationDocumentVerificationStatus | 'missing' =
      uploadedItem
        ? reqEntry && reqEntry.status === 'pending'
          ? 'replacement_requested'
          : resolveDocumentVerificationStatus(uploadedItem)
        : 'missing';

    slots.push({
      docType: req.docType,
      label: req.label,
      category,
      requirementType: req.requirementType,
      notes: req.notes,
      apostilleRequired: req.apostilleRequired,
      translationRequired: req.translationRequired,
      uploadedItem,
      verificationStatus,
      isRequested: Boolean(reqEntry),
      requestDeadline: reqEntry?.deadline,
      requestNote: reqEntry?.note,
    });
  }

  for (const [docType, item] of Object.entries(docsMap)) {
    if (seenKeys.has(docType)) continue;
    seenKeys.add(docType);
    const reqEntry = requestedMap.get(docType);
    const category = item.category || classifyDocumentCategory(docType, item.label);
    slots.push({
      docType,
      label: item.label || docType.replace(/_/g, ' '),
      category,
      requirementType: 'Uploaded',
      uploadedItem: item,
      verificationStatus:
        reqEntry && reqEntry.status === 'pending'
          ? 'replacement_requested'
          : resolveDocumentVerificationStatus(item),
      isRequested: Boolean(reqEntry),
      requestDeadline: reqEntry?.deadline,
      requestNote: reqEntry?.note,
    });
  }

  for (const req of app.requestedDocuments || []) {
    if (seenKeys.has(req.docType)) continue;
    seenKeys.add(req.docType);
    const category = classifyDocumentCategory(req.docType, req.label);
    slots.push({
      docType: req.docType,
      label: req.label,
      category,
      requirementType: 'Mandatory',
      uploadedItem: null,
      verificationStatus: 'missing',
      isRequested: true,
      requestDeadline: req.deadline,
      requestNote: req.note,
    });
  }

  const byCategory: Record<SmartApplicationDocumentCategory, CategorizedDocumentSlot[]> = {
    personal: [],
    academic: [],
    language: [],
    financial: [],
    other: [],
  };

  for (const slot of slots) {
    byCategory[slot.category].push(slot);
  }

  const mandatorySlots = slots.filter((s) => s.requirementType === 'Mandatory');
  const requiredBasis = mandatorySlots.length > 0 ? mandatorySlots : slots;
  const requiredCount = requiredBasis.length;
  const uploadedRequiredCount = requiredBasis.filter((s) => Boolean(s.uploadedItem)).length;
  const totalUploadedCount = Object.keys(docsMap).length;
  const verifiedCount = Object.values(docsMap).filter(
    (d) => resolveDocumentVerificationStatus(d) === 'verified'
  ).length;
  const rejectedCount = Object.values(docsMap).filter(
    (d) => resolveDocumentVerificationStatus(d) === 'rejected'
  ).length;
  const completionPercent =
    requiredCount > 0 ? Math.min(100, Math.round((uploadedRequiredCount / requiredCount) * 100)) : 0;

  return {
    slots,
    byCategory,
    requiredCount,
    uploadedRequiredCount,
    totalUploadedCount,
    verifiedCount,
    rejectedCount,
    completionPercent,
    isUniversitySpecificChecklist,
  };
}

/**
 * Masks passport numbers for viewers or default privacy display (`A0*****67`).
 */
export function maskPassportNumber(raw?: string | null): string {
  const clean = String(raw || '').trim();
  if (!clean) return '—';
  if (clean.length <= 4) return '****';
  return `${clean.slice(0, 2)}${'*'.repeat(Math.max(3, clean.length - 4))}${clean.slice(-2)}`;
}
