/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure TypeScript, zero-dependency PDF 1.4 summary exporter for EVERYKR Student Applications.
 * Produces a clean, multi-page, text-searchable binary `.pdf` summary document for authorized
 * admissions staff without relying on `window.open` or external CDN scripts.
 */

import type {
  SmartApplicationHistoryEvent,
  SmartApplicationRecord,
} from '../types/smartApplication';
import { SMART_APPLICATION_STATUS_META } from '../types/smartApplication';
import {
  CATEGORY_LABELS,
  buildApplicationDocumentMatrixFromChecklist,
  maskPassportNumber,
  type ApplicationDocumentMatrixResult,
} from './applicationDocumentTaxonomyCore';
import { formatApplicationExportBaseName } from './documentFileTools';

function pdfEscape(input: string): string {
  // Normalize non-ASCII characters safely for standard Helvetica Type1 WinAnsi encoding
  const ascii = String(input || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapText(text: string, maxChars: number): string[] {
  const clean = String(text || '').trim();
  if (!clean) return ['—'];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxChars) {
      current += ` ${w}`;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface PdfLine {
  text: string;
  size: number;
  bold?: boolean;
  gapAfter?: number;
  indent?: number;
  rule?: boolean;
}

/**
 * Generates a valid multi-page binary PDF buffer from structured line instructions.
 */
function buildPdfBytes(lines: PdfLine[], title: string): Uint8Array {
  const PAGE_WIDTH = 595; // A4 width in pt
  const PAGE_HEIGHT = 842; // A4 height in pt
  const MARGIN_X = 46;
  const TOP_Y = 790;
  const BOTTOM_Y = 54;

  const pages: string[][] = [];
  let currentOps: string[] = [];
  let y = TOP_Y;

  const pushPage = () => {
    if (currentOps.length > 0) {
      pages.push(currentOps);
      currentOps = [];
    }
    y = TOP_Y;
  };

  for (const item of lines) {
    const lineHeight = item.size + 5;
    if (y - lineHeight < BOTTOM_Y) {
      pushPage();
    }
    if (item.rule) {
      currentOps.push(
        `0.82 0.86 0.92 RG 0.6 w ${MARGIN_X} ${y.toFixed(1)} m ${(PAGE_WIDTH - MARGIN_X).toFixed(
          1
        )} ${y.toFixed(1)} l S 0 0 0 RG`
      );
      y -= item.gapAfter ?? 10;
      continue;
    }

    const fontKey = item.bold ? '/F2' : '/F1';
    const x = MARGIN_X + (item.indent || 0);
    currentOps.push(
      `BT ${fontKey} ${item.size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfEscape(
        item.text
      )}) Tj ET`
    );
    y -= lineHeight + (item.gapAfter ?? 0);
  }
  if (currentOps.length > 0) {
    pages.push(currentOps);
  }
  if (pages.length === 0) {
    pages.push(['BT /F1 11 Tf 46 790 Td (Empty application summary) Tj ET']);
  }

  // Add subtle footer with page number to each page
  pages.forEach((ops, idx) => {
    ops.push(
      `BT /F1 8 Tf 46 28 Td (${pdfEscape(
        `EVERYKR Confidential Admissions Summary  |  Page ${idx + 1} of ${pages.length}`
      )}) Tj ET`
    );
  });

  // PDF Objects:
  // 1: Catalog
  // 2: Pages
  // 3: Font F1 (Helvetica)
  // 4: Font F2 (Helvetica-Bold)
  // 5..: Pairs of [PageObj, ContentStreamObj]
  const objects: string[] = [];
  const pageObjNumbers: number[] = [];

  // Placeholder slots for 1..4
  objects.push('');
  objects.push('');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  for (const ops of pages) {
    const stream = ops.join('\n');
    const pageNum = objects.length + 1;
    const contentNum = objects.length + 2;
    pageObjNumbers.push(pageNum);

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  objects[0] = `<< /Type /Catalog /Pages 2 0 R /Info << /Title (${pdfEscape(title)}) >> >>`;
  objects[1] = `<< /Type /Pages /Kids [${pageObjNumbers
    .map((n) => `${n} 0 R`)
    .join(' ')}] /Count ${pageObjNumbers.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((body, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

export function buildApplicationSummaryPdf(params: {
  app: SmartApplicationRecord;
  history: SmartApplicationHistoryEvent[];
  maskPassport?: boolean;
  docMatrix?: ApplicationDocumentMatrixResult;
}): { bytes: Uint8Array; fileName: string } {
  const { app, history, maskPassport = false } = params;
  const fullName =
    `${app.personal?.givenNames || ''} ${app.personal?.surname || ''}`.trim() || 'Applicant';
  const statusLabel = SMART_APPLICATION_STATUS_META[app.status]?.label || app.status;
  const docMatrix =
    params.docMatrix || buildApplicationDocumentMatrixFromChecklist(app, [], false);
  const passportDisplay = maskPassport
    ? maskPassportNumber(app.personal?.passportNumber)
    : app.personal?.passportNumber || '—';

  const lines: PdfLine[] = [];
  const addSection = (heading: string) => {
    lines.push({ text: '', size: 4, gapAfter: 2, rule: true });
    lines.push({ text: heading, size: 12, bold: true, gapAfter: 4 });
  };
  const addKv = (label: string, value?: string | number | boolean | null) => {
    const valStr =
      value === undefined || value === null || String(value).trim() === ''
        ? '—'
        : String(value);
    const wrapped = wrapText(`${label}: ${valStr}`, 84);
    wrapped.forEach((line, idx) => {
      lines.push({ text: line, size: 9.5, indent: idx === 0 ? 0 : 12, gapAfter: 1 });
    });
  };

  lines.push({ text: 'EVERYKR — STUDENT UNIVERSITY APPLICATION SUMMARY', size: 15, bold: true, gapAfter: 2 });
  lines.push({
    text: `Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC  |  Status: ${statusLabel}`,
    size: 9,
    gapAfter: 6,
  });

  addSection('SECTION A — STUDENT PROFILE');
  addKv('Application ID', app.id);
  addKv('Student UID', app.userId);
  addKv('Full Name', fullName);
  addKv('Email', app.personal?.email);
  addKv('Phone', `${app.personal?.phoneCountryCode || ''} ${app.personal?.phoneNumber || ''}`.trim());
  addKv('Nationality', `${app.personal?.nationality || '—'}${app.personal?.nationalityCode ? ` (${app.personal.nationalityCode})` : ''}`);
  addKv('Passport Number', passportDisplay);
  addKv('Passport Issue / Expiry', `${app.personal?.passportIssueDate || '—'} / ${app.personal?.passportExpiryDate || '—'}`);
  addKv('Date of Birth / Gender', `${app.personal?.dateOfBirth || '—'} / ${app.personal?.gender || '—'}`);
  addKv('Current Country', app.personal?.currentCountry || app.personal?.nationality);
  addKv('Current Address', app.personal?.currentAddress);
  addKv(
    'Emergency Contact',
    `${app.personal?.emergencyContactName || '—'} (${app.personal?.emergencyContactRelation || '—'}) ${app.personal?.emergencyContactPhone || ''}`.trim()
  );

  addSection('SECTION B — UNIVERSITY APPLICATION');
  addKv('University', `${app.universityName} (${app.universityId})`);
  addKv('Degree Level', app.degreeLevel);
  addKv('Selected Program (1st Choice)', app.program?.desiredMajor);
  addKv('Second Choice Major', app.program?.secondChoiceMajor);
  addKv('Intake / Round', `${app.intake} / ${app.round || 'Standard'}`);
  addKv('Application Deadline', app.applicationDeadline || 'Not Announced');
  addKv('Scholarship Interest', app.program?.scholarshipInterest ? `Yes (${app.program?.preferredScholarshipName || 'University Merit'})` : 'No');
  addKv('Assigned Counsellor', app.assignedToName || app.assignedToEmail || 'Unassigned');
  addKv('Submitted At', app.submittedAt || 'Draft (Not yet submitted)');

  addSection('SECTION C — UPLOADED DOCUMENTS');
  addKv(
    'Document Completion',
    `${docMatrix.uploadedRequiredCount}/${docMatrix.requiredCount} required (${docMatrix.completionPercent}%), ${docMatrix.totalUploadedCount} total uploaded, ${docMatrix.verifiedCount} verified`
  );
  for (const slot of docMatrix.slots) {
    if (!slot.uploadedItem && slot.requirementType !== 'Mandatory') continue;
    const statusText = slot.uploadedItem
      ? `${slot.verificationStatus.toUpperCase()} - ${slot.uploadedItem.fileName} (${Math.round(
          (slot.uploadedItem.size || 0) / 1024
        )} KB, v${slot.uploadedItem.version || 1})`
      : 'MISSING (Required)';
    addKv(`[${CATEGORY_LABELS[slot.category]}] ${slot.label}`, statusText);
  }

  addSection('SECTION D — AI PASSPORT EXTRACTION & VERIFICATION');
  if (app.aiPassportSnapshot) {
    const snap = app.aiPassportSnapshot;
    addKv('AI Extraction Source', snap.trustedSource.toUpperCase());
    addKv('MRZ Validation', snap.mrzIsValid ? 'PASSED (ICAO 9303 Verified)' : snap.mrzHasMrz ? 'CHECK REQUIRED' : 'No MRZ Detected');
    addKv('AI Surname vs Student Confirmed', `${snap.surname || '—'}  =>  ${app.personal?.surname || '—'}`);
    addKv('AI Given Names vs Student Confirmed', `${snap.givenNames || '—'}  =>  ${app.personal?.givenNames || '—'}`);
    addKv(
      'AI Passport No. vs Student Confirmed',
      `${maskPassport ? maskPassportNumber(snap.passportNumber) : snap.passportNumber || '—'}  =>  ${passportDisplay}`
    );
    addKv('AI DOB vs Student Confirmed', `${snap.dateOfBirth || '—'}  =>  ${app.personal?.dateOfBirth || '—'}`);
    addKv('AI Expiry vs Student Confirmed', `${snap.expiryDate || '—'}  =>  ${app.personal?.passportExpiryDate || '—'}`);
  } else {
    addKv(
      'AI-Filled Fields Count',
      `${(app.aiFilledFields || []).length} AI-filled, ${(app.verifiedFields || []).length} verified by student`
    );
  }

  addSection('SECTION E — EDUCATION & LANGUAGE');
  addKv('Highest Level', app.education?.highestLevel);
  addKv('Institution', `${app.education?.institutionName || '—'} (${app.education?.country || '—'})`);
  addKv('Attendance Years', `${app.education?.startYear || '—'} - ${app.education?.endYear || '—'}`);
  addKv('GPA / Scale', `${app.education?.gpa || '—'} / ${app.education?.gpaScale || '—'}`);
  if ((app.education?.previousDegrees || []).length > 0) {
    for (const deg of app.education.previousDegrees) {
      addKv(
        `Previous Degree (${deg.level})`,
        `${deg.institutionName} (${deg.country}), ${deg.startYear}-${deg.endYear}, GPA ${deg.gpa}/${deg.gpaScale}`
      );
    }
  }
  addKv('TOPIK Level', `${app.language?.topikLevel || 'None'}${app.language?.topikTestDate ? ` (${app.language.topikTestDate})` : ''}`);
  addKv(
    'English Proficiency',
    app.language?.englishTestType && app.language.englishTestType !== 'None'
      ? `${app.language.englishTestType} ${app.language.englishTestScore || ''} (${app.language.englishTestDate || '—'})`
      : 'None'
  );

  addSection('SECTION F — FINANCE');
  addKv('Sponsor Type', app.finance?.sponsorType || '—');
  addKv('Sponsor Name / Relation', `${app.finance?.sponsorName || '—'} (${app.finance?.sponsorRelation || '—'})`);
  addKv('Funding Source', app.finance?.fundingSource || app.finance?.sponsorType || '—');
  addKv('Bank Balance', `${app.finance?.bankBalanceAmount || '—'} ${app.finance?.bankBalanceCurrency || ''}`.trim());
  addKv('Data Processing Consent', app.consent?.dataProcessing ? `Accepted (${app.consent.acceptedAt || 'recorded'})` : 'Pending');

  addSection('SECTION G — APPLICATION HISTORY');
  if (history.length === 0) {
    addKv('Timeline', `Created at ${app.createdAt}`);
  } else {
    for (const ev of history) {
      const transition = ev.from ? `${ev.from} -> ${ev.to}` : ev.to;
      addKv(
        `${ev.when.slice(0, 19).replace('T', ' ')} [${ev.actorRole}]`,
        `${transition} by ${ev.actorName || ev.actorEmail}${ev.message ? ` — ${ev.message}` : ''}`
      );
    }
  }

  const baseName = formatApplicationExportBaseName({
    givenNames: app.personal?.givenNames || 'STUDENT',
    surname: app.personal?.surname || 'APPLICANT',
    universityName: app.universityName,
    intake: app.intake,
  });
  const fileName = `${baseName}_SUMMARY.pdf`;
  const bytes = buildPdfBytes(lines, `EVERYKR Application Summary - ${fullName}`);
  return { bytes, fileName };
}

export function downloadApplicationSummaryPdf(params: {
  app: SmartApplicationRecord;
  history: SmartApplicationHistoryEvent[];
  maskPassport?: boolean;
  docMatrix?: ApplicationDocumentMatrixResult;
}): { fileName: string } {
  const { bytes, fileName } = buildApplicationSummaryPdf(params);
  const blob = new Blob([bytes.slice().buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { fileName };
}
