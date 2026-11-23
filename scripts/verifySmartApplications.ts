/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Automated Verification Suite for EVERYKR Smart University Application System.
 * Runs deterministic unit tests (ICAO 9303 MRZ, status normalization & RBAC transitions,
 * ZIP traversal guards, deterministic ID format) and static security invariant checks
 * against Firestore Rules, Storage Rules, Server Routes, and Client Services.
 *
 * Run with: npx tsx scripts/verifySmartApplications.ts
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';

// Allow Node/tsx CLI verification to load modules that transitively import Vite static image assets
registerHooks({
  load(url, context, nextLoad) {
    if (/\.(jpg|jpeg|png|webp|svg|gif)(\?.*)?$/i.test(url)) {
      return {
        format: 'module',
        shortCircuit: true,
        source: `export default ${JSON.stringify(url)};`,
      };
    }
    return nextLoad(url, context);
  },
});

import {
  computeIcaoCheckDigit,
  iso3ToCountryName,
  normalizePassportNumber,
  validateTd3Mrz,
} from '../src/utils/mrzValidator';
import {
  isAllowedStatusTransition,
  normalizeSmartApplicationStatus,
  SMART_APPLICATION_STATUS_META,
  STUDENT_WITHDRAWABLE_STATUSES,
} from '../src/types/smartApplication';
import JSZip from 'jszip';
import {
  isSafeZipEntryPath,
  MAX_ZIP_FILES,
  MAX_ZIP_TOTAL_DECOMPRESSED_BYTES,
  formatApplicationExportBaseName,
  validateFileSignatureEarly,
  normalizeApplicationUploadFile,
  extractFilesFromZip,
} from '../src/utils/documentFileTools';
import {
  classifyDocumentCategory,
  buildApplicationDocumentMatrixFromChecklist,
  maskPassportNumber,
} from '../src/utils/applicationDocumentTaxonomyCore';
import { buildApplicationSummaryPdf } from '../src/utils/applicationPdfExporter';
import type {
  ChecklistRequirementItem,
  SmartApplicationDocumentItem,
  SmartApplicationRecord,
} from '../src/types/smartApplication';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function runTest(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: message });
    console.error(`  [FAIL] ${name}: ${message}`);
  }
}

async function runAsyncTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: message });
    console.error(`  [FAIL] ${name}: ${message}`);
  }
}

function readProjectFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
}

console.log('\n=== 1. ICAO 9303 TD3 MRZ Validation Tests ===');

runTest('Validates official ICAO 9303 TD3 specimen MRZ with all 4 check digits passing', () => {
  const line1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
  const line2 = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';
  const res = validateTd3Mrz(line1, line2);
  assert.equal(res.hasMrz, true);
  assert.equal(res.isValid, true);
  assert.equal(res.passportCheckPassed, true);
  assert.equal(res.dobCheckPassed, true);
  assert.equal(res.expiryCheckPassed, true);
  assert.equal(res.compositeCheckPassed, true);
  assert.equal(res.warnings.length, 0);
  assert.equal(res.parsed?.surname, 'ERIKSSON');
  assert.equal(res.parsed?.givenNames, 'ANNA MARIA');
  assert.equal(res.parsed?.passportNumber, 'L898902C3');
  assert.equal(res.parsed?.dateOfBirth, '1974-08-12');
  assert.equal(res.parsed?.sex, 'Female');
  assert.equal(res.parsed?.expiryDate, '2012-04-15');
});

runTest('Validates synthetic Bangladesh TD3 MRZ and resolves ISO-3 country code', () => {
  const passport = 'A01234567';
  const pCheck = computeIcaoCheckDigit(passport);
  const dob = '020515';
  const dobCheck = computeIcaoCheckDigit(dob);
  const expiry = '310514';
  const expCheck = computeIcaoCheckDigit(expiry);
  const optional = '<<<<<<<<<<<<<<0';
  const compositeInput = `${passport}${pCheck}${dob}${dobCheck}${expiry}${expCheck}${optional}`;
  const compositeCheck = computeIcaoCheckDigit(compositeInput);

  const line1 = 'P<BGDRAHMAN<<MD<TARIQUL<<<<<<<<<<<<<<<<<<<<<';
  const line2 = `${passport}${pCheck}BGD${dob}${dobCheck}M${expiry}${expCheck}${optional}${compositeCheck}`;
  assert.equal(line2.length, 44);

  const res = validateTd3Mrz(line1, line2);
  assert.equal(res.isValid, true);
  assert.equal(res.parsed?.surname, 'RAHMAN');
  assert.equal(res.parsed?.givenNames, 'MD TARIQUL');
  assert.equal(res.parsed?.dateOfBirth, '2002-05-15');
  assert.equal(res.parsed?.expiryDate, '2031-05-14');
  assert.equal(iso3ToCountryName(res.parsed?.nationalityIso3 || ''), 'Bangladesh');
  assert.equal(normalizePassportNumber(' a0123-4567 '), 'A01234567');
});

runTest('Rejects tampered passport number in MRZ', () => {
  const line1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
  // Changed L898902C3 -> L898902C4 without updating check digit
  const tamperedLine2 = 'L898902C46UTO7408122F1204159ZE184226B<<<<<10';
  const res = validateTd3Mrz(line1, tamperedLine2);
  assert.equal(res.hasMrz, true);
  assert.equal(res.passportCheckPassed, false);
  assert.equal(res.compositeCheckPassed, false);
  assert.equal(res.isValid, false);
  assert.ok(res.warnings.length >= 2);
});

runTest('Rejects tampered DOB check digit in MRZ', () => {
  const line1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
  const tamperedLine2 = 'L898902C36UTO7408129F1204159ZE184226B<<<<<10';
  const res = validateTd3Mrz(line1, tamperedLine2);
  assert.equal(res.dobCheckPassed, false);
  assert.equal(res.isValid, false);
});

runTest('Handles missing/incomplete MRZ gracefully without throwing', () => {
  const res = validateTd3Mrz('SHORT', '');
  assert.equal(res.hasMrz, false);
  assert.equal(res.isValid, false);
  assert.ok(res.warnings.length > 0);
});

console.log('\n=== 2. Canonical Status Normalization & Role Transition Matrix Tests ===');

runTest('Normalizes legacy status aliases to canonical enum values', () => {
  assert.equal(normalizeSmartApplicationStatus('submitted_to_university'), 'sent_to_university');
  assert.equal(normalizeSmartApplicationStatus('accepted'), 'admitted');
  assert.equal(normalizeSmartApplicationStatus('under_review'), 'under_review');
  assert.equal(normalizeSmartApplicationStatus('withdrawn'), 'withdrawn');
  assert.equal(normalizeSmartApplicationStatus('nonexistent_status'), 'draft');
  assert.equal(normalizeSmartApplicationStatus(undefined), 'draft');
  assert.ok(SMART_APPLICATION_STATUS_META.sent_to_university);
  assert.ok(SMART_APPLICATION_STATUS_META.admitted);
  assert.ok(STUDENT_WITHDRAWABLE_STATUSES.has('submitted'));
  assert.ok(!STUDENT_WITHDRAWABLE_STATUSES.has('admitted'));
});

runTest('Enforces strict student status transitions and blocks privilege escalation', () => {
  // Allowed student transitions
  assert.equal(isAllowedStatusTransition({ from: 'draft', to: 'submitted', actorRole: 'student' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'draft', to: 'withdrawn', actorRole: 'student' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'documents_missing', to: 'submitted', actorRole: 'student' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'documents_missing', to: 'withdrawn', actorRole: 'student' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'submitted', to: 'withdrawn', actorRole: 'student' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'under_review', to: 'withdrawn', actorRole: 'student' }), true);

  // Forbidden student transitions
  assert.equal(isAllowedStatusTransition({ from: 'draft', to: 'admitted', actorRole: 'student' }), false);
  assert.equal(isAllowedStatusTransition({ from: 'submitted', to: 'admitted', actorRole: 'student' }), false);
  assert.equal(isAllowedStatusTransition({ from: 'submitted', to: 'sent_to_university', actorRole: 'student' }), false);
  assert.equal(isAllowedStatusTransition({ from: 'sent_to_university', to: 'withdrawn', actorRole: 'student' }), false);
  assert.equal(isAllowedStatusTransition({ from: 'admitted', to: 'withdrawn', actorRole: 'student' }), false);
  assert.equal(isAllowedStatusTransition({ from: 'rejected', to: 'draft', actorRole: 'student' }), false);
});

runTest('Enforces counsellor, admin, and viewer transition matrix', () => {
  // Counsellor
  assert.equal(isAllowedStatusTransition({ from: 'submitted', to: 'under_review', actorRole: 'counsellor' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'under_review', to: 'documents_missing', actorRole: 'counsellor' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'under_review', to: 'sent_to_university', actorRole: 'counsellor' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'sent_to_university', to: 'admitted', actorRole: 'counsellor' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'draft', to: 'admitted', actorRole: 'counsellor' }), false);
  assert.equal(isAllowedStatusTransition({ from: 'completed', to: 'draft', actorRole: 'counsellor' }), false);

  // Admin
  assert.equal(isAllowedStatusTransition({ from: 'admitted', to: 'visa_processing', actorRole: 'admin' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'visa_processing', to: 'completed', actorRole: 'admin' }), true);
  assert.equal(isAllowedStatusTransition({ from: 'rejected', to: 'under_review', actorRole: 'admin' }), true);

  // Viewer cannot mutate any status
  assert.equal(isAllowedStatusTransition({ from: 'submitted', to: 'under_review', actorRole: 'viewer' }), false);
  assert.equal(isAllowedStatusTransition({ from: 'under_review', to: 'admitted', actorRole: 'viewer' }), false);
});

console.log('\n=== 3. ZIP Path Traversal & Decompression Guard Tests ===');

runTest('Blocks directory traversal, absolute paths, drive letters, null bytes, and macOS junk', () => {
  assert.equal(isSafeZipEntryPath('../evil.pdf'), false);
  assert.equal(isSafeZipEntryPath('folder/../../etc/passwd'), false);
  assert.equal(isSafeZipEntryPath('/etc/passwd'), false);
  assert.equal(isSafeZipEntryPath('C:\\Windows\\win.ini'), false);
  assert.equal(isSafeZipEntryPath('docs\\..\\secret.pdf'), false);
  assert.equal(isSafeZipEntryPath('passport.pdf\0.png'), false);
  assert.equal(isSafeZipEntryPath('__MACOSX/._passport.pdf'), false);
  assert.equal(isSafeZipEntryPath('.DS_Store'), false);
  assert.equal(isSafeZipEntryPath('subdir/._hidden.jpg'), false);
  assert.equal(isSafeZipEntryPath(''), false);

  // Safe paths pass
  assert.equal(isSafeZipEntryPath('passport.pdf'), true);
  assert.equal(isSafeZipEntryPath('documents/highschool_transcript.jpg'), true);
  assert.equal(isSafeZipEntryPath('ielts-2026.png'), true);

  // Caps are sensible
  assert.equal(MAX_ZIP_FILES, 25);
  assert.equal(MAX_ZIP_TOTAL_DECOMPRESSED_BYTES, 60 * 1024 * 1024);
});

console.log('\n=== 4. Static Security Invariant Audit (Rules, Backend, Client) ===');

runTest('firestore.rules enforces strict Action-Based update keys, immutable logs, and site_settings protection', () => {
  const rules = readProjectFile('firestore.rules');

  // site_settings list restricted and application_retention protected
  assert.match(rules, /match \/site_settings\/\{settingId\}/);
  assert.match(rules, /settingId != 'application_retention'/);
  assert.match(rules, /allow list: if isAdmin\(\) \|\| isSmartAppAdmin\(\);/);

  // Validation blueprints present
  assert.match(rules, /function isValidSmartApplication\(data\)/);
  assert.match(rules, /function isValidSmartApplicationHistoryEvent\(data\)/);
  assert.match(rules, /function isValidDocumentAccessLog\(data\)/);

  // Action-based affectedKeys().hasOnly checks for counsellor + student update paths
  const hasOnlyMatches = rules.match(/affectedKeys\(\)\.hasOnly\(/g) || [];
  assert.ok(
    hasOnlyMatches.length >= 4,
    `Expected >= 4 affectedKeys().hasOnly clauses in firestore.rules, found ${hasOnlyMatches.length}`
  );

  // Legacy-safe submittedAt comparison
  assert.match(rules, /existing\(\)\.get\('submittedAt', null\)/);

  // History actorRole bound to caller role
  assert.match(rules, /incoming\(\)\.actorRole == 'student'/);
  assert.match(rules, /incoming\(\)\.actorRole == 'counsellor'/);

  // Counsellor documentAccessLog scoped to assignedTo
  assert.match(rules, /get\(\/databases\/\$\(database\)\/documents\/applications\/\$\(applicationId\)\)\.data\.assignedTo == request\.auth\.uid/);
});

runTest('storage.rules enforces claims-only RBAC, strict isolation, owner-only profile photos, and blocks direct student/counsellor/viewer bypasses', () => {
  const srules = readProjectFile('storage.rules');
  const frules = readProjectFile('firestore.rules');

  assert.match(srules, /function isValidSmartApplicationDocument\(userId, applicationId, docType, fileName\)/);
  assert.match(srules, /fileName\.lower\(\)\.matches\('\.\*\\\\\.\(pdf\|jpg\|jpeg\|png\|heic\|heif\|zip\)\$'\)/);
  assert.match(srules, /request\.resource\.metadata\.userId == userId/);
  assert.match(srules, /request\.resource\.metadata\.applicationId == applicationId/);
  assert.match(srules, /request\.resource\.metadata\.docType == docType/);

  // ISSUE 5: Zero hardcoded admin email fallbacks in storage.rules or firestore.rules
  assert.doesNotMatch(srules, /admin@everykr\.com|mzhmd924@gmail\.com/);
  assert.doesNotMatch(frules, /admin@everykr\.com|mzhmd924@gmail\.com/);

  // ISSUE 3: No client-spoofable applicationStatus metadata check in storage.rules
  assert.doesNotMatch(srules, /request\.resource\.metadata\.applicationStatus/);

  // Zero public access anywhere in storage.rules
  assert.doesNotMatch(srules, /allow (read|get|list|write|create|update|delete): if true;/);
  // Zero unrestricted wildcard permissions (only default-deny match /{allPaths=**})
  const allPathsMatches = srules.match(/\{allPaths=\*\*\}/g) || [];
  assert.equal(allPathsMatches.length, 1, 'Only the final default-deny block may use {allPaths=**}');

  // ISSUE 1, 2, 3: Smart Applications block strictly isolates get to owner/admin and writes to admin only
  const smartAppStart = srules.indexOf('match /applications/{userId}/{applicationId}/{docType}/{fileName}');
  const simStart = srules.indexOf('match /sim_applications/{userId}/{applicationId}/{fileName}');
  assert.ok(smartAppStart > 0 && simStart > smartAppStart);
  const smartAppBlock = srules.slice(smartAppStart, simStart);
  assert.match(smartAppBlock, /allow get: if isOwner\(userId\) \|\| isAdmin\(\);/);
  assert.match(smartAppBlock, /allow create: if isAdmin\(\) &&/);
  assert.match(smartAppBlock, /allow update: if isAdmin\(\) &&/);
  assert.match(smartAppBlock, /allow delete: if isAdmin\(\);/);
  assert.doesNotMatch(smartAppBlock, /isCounsellor\(\)|isViewer\(\)/);

  // ISSUE 4: Profile photos restrict get to owner or admin (unrelated students denied)
  const profileStart = srules.indexOf('match /profile_photos/{userId}/{fileName}');
  const uniDeadlinesStart = srules.indexOf('match /university-deadlines/{universitySlug}/{fileName}');
  assert.ok(profileStart > 0 && uniDeadlinesStart > profileStart);
  const profileBlock = srules.slice(profileStart, uniDeadlinesStart);
  assert.match(profileBlock, /allow get: if isOwner\(userId\) \|\| isAdmin\(\);/);
  assert.doesNotMatch(profileBlock, /allow get: if isSignedIn\(\);/);

  // ISSUE 6: Existing paths preserved
  assert.match(srules, /match \/sim_applications\/\{userId\}\/\{applicationId\}\/\{fileName\}/);
  assert.match(srules, /match \/student_documents\/\{userId\}\/\{documentId\}\/\{fileName\}/);
  assert.match(srules, /match \/university-deadlines\/\{universitySlug\}\/\{fileName\}/);
});

runTest('smartApplicationServer.ts has zero unsigned JWT payload decoding and enforces magic bytes & idempotency', () => {
  const srv = readProjectFile('src/server/smartApplicationServer.ts');
  assert.doesNotMatch(srv, /Buffer\.from\(parts\[1\],\s*'base64url'\)/);
  assert.doesNotMatch(srv, /extractRoleFromIdToken/);
  assert.match(srv, /verifyFirebaseIdTokenServer/);
  assert.match(srv, /hasValidImageMagicBytes/);
  assert.match(srv, /checkAndRecordNotifyIdempotency/);
  assert.match(srv, /normalizeSmartApplicationStatus/);
});

runTest('smartApplicationService.ts uses private getBlob, transactions, active Firebase UID check, and targeted updateDoc', () => {
  const svc = readProjectFile('src/services/smartApplicationService.ts');
  assert.match(svc, /export async function requireActiveFirebaseUid/);
  assert.match(svc, /await ensureFirebaseAuthInitialized\(\)/);
  assert.match(svc, /export function buildDeterministicApplicationId/);
  assert.match(svc, /runTransaction\(/);
  assert.match(svc, /export async function fetchPrivateDocumentBlob/);
  assert.match(svc, /export async function fetchPrivateDocumentBlobUrl/);
  assert.match(svc, /getBlob\(ref\(storage,\s*storagePath\)\)/);
  assert.match(svc, /export async function withdrawSmartApplication/);

  // Verify uploadSmartApplicationDocument no longer calls getDownloadURL (ignoring comments)
  const uploadStart = svc.indexOf('export async function uploadSmartApplicationDocument');
  const uploadEnd = svc.indexOf('export async function fetchPrivateDocumentBlob', uploadStart);
  assert.ok(uploadStart > 0 && uploadEnd > uploadStart);
  const uploadCodeOnly = svc
    .slice(uploadStart, uploadEnd)
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(uploadCodeOnly, /getDownloadURL\(/);
});

runTest('AdminApplicationsRoutePage does not default role to admin (fixes admin flash)', () => {
  const adminPage = readProjectFile('src/components/admin/AdminApplicationsRoutePage.tsx');
  assert.doesNotMatch(adminPage, /useState<SmartApplicationAdminRole>\('admin'\)/);
  assert.match(adminPage, /useState<SmartApplicationAdminRole>\(null\)/);
  assert.match(adminPage, /isAuthReady/);
});

runTest('ApplicationWizardPage enforces isAuthReady, blob URL cleanup, and explicit AI consent gate', () => {
  const wizard = readProjectFile('src/components/applications/ApplicationWizardPage.tsx');
  assert.match(wizard, /isAuthReady/);
  assert.match(wizard, /URL\.revokeObjectURL/);
  assert.match(wizard, /beforeunload/);
  assert.match(wizard, /aiConsentGranted=/);
  assert.match(wizard, /fetchPrivateDocumentBlobUrl/);
  assert.match(wizard, /mergeDocumentWithVersionHistory/);
  assert.match(wizard, /aiPassportSnapshot/);
});

console.log('\n=== 5. Admin Student Application Management System Invariants ===');

runTest('Document taxonomy classifies all 5 categories accurately and builds dynamic university document matrix', () => {
  assert.equal(classifyDocumentCategory('passport', 'Passport Bio Page'), 'personal');
  assert.equal(classifyDocumentCategory('photo', 'ID Photo'), 'personal');
  assert.equal(classifyDocumentCategory('transcript', 'High School Transcript'), 'academic');
  assert.equal(classifyDocumentCategory('language_certificate', 'TOPIK Level 4'), 'language');
  assert.equal(classifyDocumentCategory('bank_statement', 'Bank Balance Certificate'), 'financial');
  assert.equal(classifyDocumentCategory('study_plan', 'Personal Statement'), 'other');

  const sampleApp: SmartApplicationRecord = {
    id: 'app_test_kyungsung_001',
    userId: 'uid_student_1',
    universityId: 'kyungsung-university',
    universityName: 'Kyungsung University',
    intake: 'Fall 2027',
    degreeLevel: 'Bachelor',
    round: 'Round 1',
    status: 'submitted',
    personal: {
      surname: 'HASAN',
      givenNames: 'JAHID',
      gender: 'Male',
      dateOfBirth: '2003-05-14',
      nationality: 'Bangladesh',
      currentCountry: 'Bangladesh',
      passportNumber: 'A12345678',
      passportIssueDate: '2020-05-14',
      passportExpiryDate: '2030-05-14',
      placeOfBirth: 'Dhaka',
      email: 'jahid@example.com',
      phoneCountryCode: '+880',
      phoneNumber: '1712345678',
      currentAddress: 'Dhaka, Bangladesh',
      emergencyContactName: 'Parent Hasan',
      emergencyContactRelation: 'Father',
      emergencyContactPhone: '+8801700000000',
    },
    education: {
      highestLevel: 'High School',
      institutionName: 'Dhaka College',
      country: 'Bangladesh',
      startYear: '2020',
      endYear: '2022',
      gpa: '4.8',
      gpaScale: '5.0',
      previousDegrees: [],
      gapYearsExplanation: '',
    },
    language: {
      topikLevel: 'TOPIK 3',
      englishTestType: 'IELTS',
      englishTestScore: '6.5',
      englishTestDate: '2025-11-10',
      koreanStudyHistory: '1 year',
    },
    program: {
      degreeLevel: 'Bachelor',
      desiredMajor: 'Computer Science',
      secondChoiceMajor: 'Software Engineering',
      scholarshipInterest: true,
      round: 'Round 1',
    },
    finance: {
      sponsorType: 'parent',
      sponsorName: 'Parent Hasan',
      sponsorRelation: 'Father',
      bankBalanceAmount: '22000',
      bankBalanceCurrency: 'USD',
      financialDeclarationAccepted: true,
    },
    documents: {
      passport: {
        docType: 'passport',
        label: 'Passport Bio Page',
        category: 'personal',
        fileName: 'passport.jpg',
        storagePath: 'applications/uid_student_1/app_test_kyungsung_001/passport/1_passport.jpg',
        size: 120000,
        mimeType: 'image/jpeg',
        uploadedAt: '2026-09-01T10:00:00Z',
        aiDetected: true,
        verified: true,
        verificationStatus: 'verified',
        version: 2,
        previousVersions: [
          {
            version: 1,
            fileName: 'passport_old.jpg',
            storagePath: 'applications/uid_student_1/app_test_kyungsung_001/passport/0_passport_old.jpg',
            size: 110000,
            mimeType: 'image/jpeg',
            uploadedAt: '2026-08-30T10:00:00Z',
            replacedAt: '2026-09-01T10:00:00Z',
            verificationStatus: 'rejected',
            verificationNote: 'Blurry MRZ',
          },
        ],
      },
    },
    consent: { dataProcessing: true, aiProcessing: true, acceptedAt: '2026-09-01T10:05:00Z' },
    aiFilledFields: [],
    verifiedFields: [],
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-01T10:05:00Z',
    submittedAt: '2026-09-01T10:05:00Z',
    notes: [],
  };

  const sampleChecklist: ChecklistRequirementItem[] = [
    { docType: 'passport', label: 'Passport Bio Page', requirementType: 'Mandatory' },
    { docType: 'photo', label: 'Passport Photo', requirementType: 'Mandatory' },
    { docType: 'transcript', label: 'Academic Transcripts', requirementType: 'Mandatory' },
    { docType: 'language_certificate', label: 'IELTS / TOPIK Certificate', requirementType: 'Mandatory' },
    { docType: 'bank_statement', label: 'Bank Statement', requirementType: 'Mandatory' },
  ];

  const matrix = buildApplicationDocumentMatrixFromChecklist(sampleApp, sampleChecklist, true);
  assert.ok(matrix.slots.length >= 5, 'Dynamic matrix should generate university checklist slots');
  assert.ok(matrix.byCategory.personal.some((e) => e.docType === 'passport' && e.uploadedItem?.version === 2));
  assert.equal(matrix.totalUploadedCount, 1);
  assert.equal(matrix.verifiedCount, 1);
  assert.equal(matrix.requiredCount, 5);
  assert.equal(matrix.completionPercent, 20);

  // ZIP / PDF export naming format matches JAHID_HASAN_KYUNGSUNG_FALL_2027
  const baseName = formatApplicationExportBaseName({
    givenNames: sampleApp.personal.givenNames,
    surname: sampleApp.personal.surname,
    universityName: sampleApp.universityName,
    intake: sampleApp.intake,
  });
  assert.equal(baseName, 'JAHID_HASAN_KYUNGSUNG_FALL_2027');

  // Passport masking hides middle characters
  assert.equal(maskPassportNumber('A12345678'), 'A1*****78');

  // Pure binary PDF summary generator outputs valid PDF-1.4 with %%EOF and honors passport masking
  const pdfMasked = buildApplicationSummaryPdf({
    app: sampleApp,
    history: [],
    maskPassport: true,
    docMatrix: matrix,
  });
  const pdfTextMasked = Buffer.from(pdfMasked.bytes).toString('latin1');
  assert.ok(pdfTextMasked.startsWith('%PDF-1.4\n'), 'PDF must start with %PDF-1.4 header');
  assert.ok(pdfTextMasked.includes('%%EOF'), 'PDF must end with %%EOF trailer');
  assert.ok(pdfTextMasked.includes('A1*****78'), 'Masked PDF must contain masked passport');
  assert.ok(!pdfTextMasked.includes('A12345678'), 'Masked PDF must NEVER contain plaintext passport');
  assert.equal(pdfMasked.fileName, 'JAHID_HASAN_KYUNGSUNG_FALL_2027_SUMMARY.pdf');

  const pdfAdmin = buildApplicationSummaryPdf({
    app: sampleApp,
    history: [],
    maskPassport: false,
    docMatrix: matrix,
  });
  const pdfTextAdmin = Buffer.from(pdfAdmin.bytes).toString('latin1');
  assert.ok(pdfTextAdmin.includes('A12345678'), 'Admin PDF must contain full passport when authorized');
});

runTest('RBAC, audit logs, version preservation, and AdminView integration are wired end-to-end', () => {
  const rules = readProjectFile('firestore.rules');
  assert.match(rules, /'aiPassportSnapshot'/);
  assert.match(rules, /'pdf_export', 'csv_export', 'xlsx_export'/);
  assert.match(rules, /allow create: if isOwner\(userId\) \|\| isSmartAppAdmin\(\) \|\| isSmartAppCounsellor\(\);/);

  const srv = readProjectFile('src/server/smartApplicationServer.ts');
  assert.match(srv, /isViewer/);
  assert.match(srv, /!isStudentSelfAction \|\| caller\.isViewer/);

  const svc = readProjectFile('src/services/smartApplicationService.ts');
  assert.match(svc, /export function mergeDocumentWithVersionHistory/);
  assert.match(svc, /export async function fetchAdminSmartApplicationsPage/);
  assert.match(svc, /export async function adminReviewApplicationDocument/);
  assert.match(svc, /export async function adminSendStudentMessage/);
  assert.match(svc, /export async function studentUploadReplacementDocument/);

  const adminView = readProjectFile('src/components/AdminView.tsx');
  assert.match(adminView, /fetchAdminSmartApplications/);
  assert.match(adminView, /smartApplications\.length \+ portalApplications\.length/);
});

function createSyntheticFile(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes as unknown as BlobPart], name, { type, lastModified: 1732345678000 });
}

async function runUploadScenarioTests() {
  console.log('\n=== 6. 12-Scenario Document Upload & Recovery Pipeline Tests ===');

  const {
    uploadSmartApplicationDocument,
    verifySmartApplicationStorageTarget,
    classifyFirebaseStorageUploadError,
    clearUploadCachesForTesting,
    SmartApplicationServiceError,
  } = await import('../src/services/smartApplicationService');

  const TEST_UID = 'uid_student_test_99';
  const TEST_APP_ID = 'app_uid_student_test_99_kyungsung_fall2027_01';

  // Scenario 1: Passport JPG upload
  await runAsyncTest('Scenario 1: Passport JPG upload validates magic bytes, path, and syncs Firestore metadata', async () => {
    clearUploadCachesForTesting();
    const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const rawFile = createSyntheticFile(jpgBytes, 'passport_scan.jpg', 'image/jpeg');
    const sig = await validateFileSignatureEarly(rawFile);
    assert.equal(sig.valid, true);
    assert.equal(sig.detectedKind, 'jpeg');

    const normalized = normalizeApplicationUploadFile(rawFile, sig.detectedKind);
    let persistedPayload: Record<string, any> | null = null;
    const progressEvents: number[] = [];

    const item = await uploadSmartApplicationDocument({
      userId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'passport',
      label: 'Passport Bio Page',
      file: normalized,
      aiDetected: true,
      verified: false,
      syncFirestoreMetadata: true,
      onProgress: (p) => progressEvents.push(p.percent),
      customTransport: {
        authenticatedUid: TEST_UID,
        uploadAttempt: async ({ storagePath, contentType, customMetadata, file, onProgress }) => {
          assert.match(storagePath, /^applications\/uid_student_test_99\/app_uid_student_test_99_kyungsung_fall2027_01\/passport\/\d+_passport_scan\.jpg$/);
          assert.equal(contentType, 'image/jpeg');
          assert.equal(customMetadata.userId, TEST_UID);
          assert.equal(customMetadata.applicationId, TEST_APP_ID);
          assert.equal(customMetadata.docType, 'passport');
          onProgress?.({ percent: 50, bytesTransferred: Math.floor(file.size / 2), totalBytes: file.size });
          onProgress?.({ percent: 100, bytesTransferred: file.size, totalBytes: file.size });
          return { fullPath: storagePath, bytesTransferred: file.size };
        },
        persistMetadata: async (_applicationId, payload) => {
          persistedPayload = payload;
        },
      },
    });

    assert.equal(item.docType, 'passport');
    assert.equal(item.mimeType, 'image/jpeg');
    assert.equal(item.size, jpgBytes.byteLength);
    assert.ok(progressEvents.includes(50) && progressEvents.includes(100));
    assert.ok(persistedPayload !== null, 'Firestore metadata must be persisted immediately after upload');
  });

  // Scenario 2: Passport PNG upload
  await runAsyncTest('Scenario 2: Passport PNG upload validates magic bytes, MIME image/png, and metadata sync', async () => {
    clearUploadCachesForTesting();
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const rawFile = createSyntheticFile(pngBytes, 'passport_bio.png', 'image/png');
    const sig = await validateFileSignatureEarly(rawFile);
    assert.equal(sig.valid, true);
    assert.equal(sig.detectedKind, 'png');

    const normalized = normalizeApplicationUploadFile(rawFile, sig.detectedKind);
    const item = await uploadSmartApplicationDocument({
      userId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'passport',
      label: 'Passport Bio Page',
      file: normalized,
      syncFirestoreMetadata: true,
      customTransport: {
        authenticatedUid: TEST_UID,
        uploadAttempt: async ({ contentType, storagePath, file }) => {
          assert.equal(contentType, 'image/png');
          assert.ok(storagePath.endsWith('_passport_bio.png'));
          return { fullPath: storagePath, bytesTransferred: file.size };
        },
        persistMetadata: async () => {},
      },
    });
    assert.equal(item.mimeType, 'image/png');
    assert.equal(item.fileName, 'passport_bio.png');
  });

  // Scenario 3: Passport PDF upload
  await runAsyncTest('Scenario 3: Passport PDF upload validates %PDF header, MIME application/pdf, and metadata sync', async () => {
    clearUploadCachesForTesting();
    const pdfBytes = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
    const rawFile = createSyntheticFile(pdfBytes, 'passport_document.pdf', 'application/pdf');
    const sig = await validateFileSignatureEarly(rawFile);
    assert.equal(sig.valid, true);
    assert.equal(sig.detectedKind, 'pdf');

    const normalized = normalizeApplicationUploadFile(rawFile, sig.detectedKind);
    const item = await uploadSmartApplicationDocument({
      userId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'passport',
      label: 'Passport Bio Page',
      file: normalized,
      syncFirestoreMetadata: true,
      customTransport: {
        authenticatedUid: TEST_UID,
        uploadAttempt: async ({ contentType, storagePath, file }) => {
          assert.equal(contentType, 'application/pdf');
          assert.ok(storagePath.endsWith('_passport_document.pdf'));
          return { fullPath: storagePath, bytesTransferred: file.size };
        },
        persistMetadata: async () => {},
      },
    });
    assert.equal(item.mimeType, 'application/pdf');
  });

  // Scenario 4: ZIP upload
  await runAsyncTest('Scenario 4: ZIP upload extracts valid documents, filters __MACOSX junk, and uploads extracted items', async () => {
    clearUploadCachesForTesting();
    const zip = new JSZip();
    const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const pdfBytes = new TextEncoder().encode('%PDF-1.4\n%%EOF');
    zip.file('passport_scan.jpg', jpgBytes);
    zip.file('academic/high_school_transcript.pdf', pdfBytes);
    zip.file('__MACOSX/._passport_scan.jpg', new Uint8Array([0x00, 0x01]));

    const zipUint8 = await zip.generateAsync({ type: 'uint8array' });
    const zipFile = createSyntheticFile(zipUint8, 'student_documents.zip', 'application/zip');
    const sig = await validateFileSignatureEarly(zipFile);
    assert.equal(sig.valid, true);
    assert.equal(sig.detectedKind, 'zip');

    const extracted = await extractFilesFromZip(zipFile);
    assert.equal(extracted.length, 2, 'Should extract 2 valid documents and ignore __MACOSX junk');
    assert.ok(extracted.some((e) => e.file.name === 'passport_scan.jpg' && e.mimeType === 'image/jpeg'));
    assert.ok(extracted.some((e) => e.file.name === 'high_school_transcript.pdf' && e.mimeType === 'application/pdf'));

    const transcriptEntry = extracted.find((e) => e.file.name === 'high_school_transcript.pdf')!;
    const uploadedTranscript = await uploadSmartApplicationDocument({
      userId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'transcript',
      label: 'Academic Transcript',
      file: transcriptEntry.file,
      syncFirestoreMetadata: true,
      customTransport: {
        authenticatedUid: TEST_UID,
        uploadAttempt: async ({ storagePath, file: f }) => ({
          fullPath: storagePath,
          bytesTransferred: f.size,
        }),
        persistMetadata: async () => {},
      },
    });
    assert.equal(uploadedTranscript.fileName, 'high_school_transcript.pdf');
    assert.equal(uploadedTranscript.mimeType, 'application/pdf');
  });

  // Scenario 5: Android camera capture (empty MIME type & missing file extension)
  await runAsyncTest('Scenario 5: Android camera capture with empty file.type and extensionless filename is normalized to .jpg + image/jpeg', async () => {
    clearUploadCachesForTesting();
    const cameraJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x18, 0x45, 0x78, 0x69, 0x66]);
    // Android DocumentsProvider / Camera often supplies name="1000048291" and type=""
    const rawCameraFile = createSyntheticFile(cameraJpegBytes, '1000048291', '');
    const sig = await validateFileSignatureEarly(rawCameraFile);
    assert.equal(sig.valid, true);
    assert.equal(sig.detectedKind, 'jpeg');

    const normalized = normalizeApplicationUploadFile(rawCameraFile, sig.detectedKind);
    assert.equal(normalized.type, 'image/jpeg');
    assert.equal(normalized.name, '1000048291.jpg');

    const item = await uploadSmartApplicationDocument({
      userId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'passport',
      label: 'Passport Bio Page',
      file: normalized,
      syncFirestoreMetadata: true,
      customTransport: {
        authenticatedUid: TEST_UID,
        uploadAttempt: async ({ storagePath, contentType, file }) => {
          assert.equal(contentType, 'image/jpeg');
          assert.match(storagePath, /_1000048291\.jpg$/);
          return { fullPath: storagePath, bytesTransferred: file.size };
        },
        persistMetadata: async () => {},
      },
    });
    assert.equal(item.mimeType, 'image/jpeg');
    assert.equal(item.fileName, '1000048291.jpg');
  });

  // Scenario 6: Large file upload (near-limit 19.5 MB accepted, >20 MB rejected early)
  await runAsyncTest('Scenario 6: Large file upload accepts 19.5 MB PDF and rejects 20.5 MB file with validation-error', async () => {
    clearUploadCachesForTesting();
    const nearLimitSize = Math.floor(19.5 * 1024 * 1024);

    const verified = verifySmartApplicationStorageTarget({
      activeUid: TEST_UID,
      requestedUserId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'portfolio',
      fileName: '1732345678_large_portfolio.pdf',
      fileSize: nearLimitSize,
      contentType: 'application/pdf',
    });
    assert.equal(verified.valid, true);
    assert.match(verified.storagePath, /^applications\/uid_student_test_99\/app_uid_student_test_99_kyungsung_fall2027_01\/portfolio\//);

    const overLimitSize = Math.floor(20.5 * 1024 * 1024);
    const overLimitBytes = new Uint8Array(overLimitSize);
    overLimitBytes.set([0x25, 0x50, 0x44, 0x46], 0);
    const overLimitFile = createSyntheticFile(overLimitBytes, 'oversized.pdf', 'application/pdf');

    const sigCheck = await validateFileSignatureEarly(overLimitFile);
    assert.equal(sigCheck.valid, false);
    assert.match(sigCheck.error || '', /20 MB/i);

    const overLimitCheck = verifySmartApplicationStorageTarget({
      activeUid: TEST_UID,
      requestedUserId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'portfolio',
      fileName: '1732345678_oversized.pdf',
      fileSize: overLimitSize,
      contentType: 'application/pdf',
    });
    assert.equal(overLimitCheck.valid, false);
    assert.ok(overLimitCheck.error instanceof SmartApplicationServiceError);
    assert.equal(overLimitCheck.error?.storageErrorCode, 'validation-error');
  });

  // Scenario 7: Upload with AI consent enabled
  await runAsyncTest('Scenario 7: Upload with AI consent enabled marks aiDetected=true and verificationStatus=pending for student review', async () => {
    clearUploadCachesForTesting();
    const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const file = createSyntheticFile(jpgBytes, 'ai_consented_passport.jpg', 'image/jpeg');

    const item = await uploadSmartApplicationDocument({
      userId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'passport',
      label: 'Passport Bio Page',
      file,
      aiDetected: true,
      verified: false,
      syncFirestoreMetadata: true,
      customTransport: {
        authenticatedUid: TEST_UID,
        uploadAttempt: async ({ storagePath, file: f }) => ({
          fullPath: storagePath,
          bytesTransferred: f.size,
        }),
        persistMetadata: async () => {},
      },
    });

    assert.equal(item.aiDetected, true);
    assert.equal(item.verified, false);
    assert.equal(item.verificationStatus, 'pending');
  });

  // Scenario 8: Upload with AI consent disabled
  await runAsyncTest('Scenario 8: Upload with AI consent disabled performs private Storage upload with aiDetected=false and zero AI extraction', async () => {
    clearUploadCachesForTesting();
    const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const file = createSyntheticFile(jpgBytes, 'private_only_passport.jpg', 'image/jpeg');

    const item = await uploadSmartApplicationDocument({
      userId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'passport',
      label: 'Passport Bio Page',
      file,
      aiDetected: false,
      verified: true,
      syncFirestoreMetadata: true,
      customTransport: {
        authenticatedUid: TEST_UID,
        uploadAttempt: async ({ storagePath, file: f }) => ({
          fullPath: storagePath,
          bytesTransferred: f.size,
        }),
        persistMetadata: async () => {},
      },
    });

    assert.equal(item.aiDetected, false);
    assert.equal(item.verified, true);
    assert.equal(item.verificationStatus, 'verified');
  });

  // Scenario 9: Student attempting another student's Storage path
  await runAsyncTest('Scenario 9: Student attempting to upload to another student UID path is blocked with storage/unauthorized', async () => {
    clearUploadCachesForTesting();
    const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const file = createSyntheticFile(jpgBytes, 'cross_student.jpg', 'image/jpeg');

    await assert.rejects(
      async () => {
        await uploadSmartApplicationDocument({
          userId: 'victim_student_uid_002',
          applicationId: TEST_APP_ID,
          docType: 'passport',
          label: 'Passport Bio Page',
          file,
          customTransport: {
            authenticatedUid: 'attacker_student_uid_001',
            uploadAttempt: async () => {
              throw new Error('uploadAttempt must never be called on UID mismatch');
            },
          },
        });
      },
      (err: unknown) =>
        err instanceof SmartApplicationServiceError &&
        err.storageErrorCode === 'storage/unauthorized'
    );
  });

  // Scenario 10: Network interruption and retry
  await runAsyncTest('Scenario 10: Transient network interruption automatically retries with controlled backoff and succeeds', async () => {
    clearUploadCachesForTesting();
    const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x99]);
    const file = createSyntheticFile(jpgBytes, 'retry_passport.jpg', 'image/jpeg');

    let attempts = 0;
    const item = await uploadSmartApplicationDocument({
      userId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'passport',
      label: 'Passport Bio Page',
      file,
      maxRetries: 2,
      retryBaseDelayMs: 100,
      syncFirestoreMetadata: true,
      customTransport: {
        authenticatedUid: TEST_UID,
        uploadAttempt: async ({ storagePath, file: f }) => {
          attempts += 1;
          if (attempts === 1) {
            throw new Error('Network connection lost during upload.');
          }
          return { fullPath: storagePath, bytesTransferred: f.size };
        },
        persistMetadata: async () => {},
      },
    });

    assert.equal(attempts, 2, 'Should succeed on second attempt after transient network interruption');
    assert.equal(item.fileName, 'retry_passport.jpg');

    // Also verify classifyFirebaseStorageUploadError detects bucket 404 or retry-limit-exceeded
    const bucketClassified = await classifyFirebaseStorageUploadError(
      {
        code: 'storage/retry-limit-exceeded',
        message: 'Firebase Storage: Max retry time for operation exceeded.',
      },
      0
    );
    assert.equal(bucketClassified.storageErrorCode, 'storage/retry-limit-exceeded');
  });

  // Scenario 11: Storage success but Firestore metadata failure
  await runAsyncTest('Scenario 11: When Storage succeeds but Firestore metadata fails, clicking Retry skips Storage re-upload and completes Firestore sync', async () => {
    clearUploadCachesForTesting();
    const pdfBytes = new TextEncoder().encode('%PDF-1.4\n%Scenario11\n%%EOF');
    const file = createSyntheticFile(pdfBytes, 'transcript_recovery.pdf', 'application/pdf');

    let storageUploadCallCount = 0;
    let firestorePersistCallCount = 0;

    // First call: Storage succeeds, Firestore metadata write fails
    await assert.rejects(
      async () => {
        await uploadSmartApplicationDocument({
          userId: TEST_UID,
          applicationId: TEST_APP_ID,
          docType: 'transcript',
          label: 'Academic Transcript',
          file,
          syncFirestoreMetadata: true,
          customTransport: {
            authenticatedUid: TEST_UID,
            uploadAttempt: async ({ storagePath, file: f }) => {
              storageUploadCallCount += 1;
              return { fullPath: storagePath, bytesTransferred: f.size };
            },
            persistMetadata: async () => {
              firestorePersistCallCount += 1;
              throw new Error('Simulated Firestore network timeout while saving document metadata');
            },
          },
        });
      },
      (err: unknown) =>
        err instanceof SmartApplicationServiceError &&
        err.storageErrorCode === 'metadata-sync-failed' &&
        Boolean(err.uploadedItem?.storagePath)
    );

    assert.equal(storageUploadCallCount, 1);
    assert.equal(firestorePersistCallCount, 1);

    // Second call (user clicks Retry): Must NOT re-upload binary to Storage, only retry Firestore metadata save
    const recoveredItem = await uploadSmartApplicationDocument({
      userId: TEST_UID,
      applicationId: TEST_APP_ID,
      docType: 'transcript',
      label: 'Academic Transcript',
      file,
      syncFirestoreMetadata: true,
      customTransport: {
        authenticatedUid: TEST_UID,
        uploadAttempt: async ({ storagePath, file: f }) => {
          storageUploadCallCount += 1;
          return { fullPath: storagePath, bytesTransferred: f.size };
        },
        persistMetadata: async () => {
          firestorePersistCallCount += 1;
        },
      },
    });

    assert.equal(storageUploadCallCount, 1, 'Retry after metadata failure MUST reuse verified Storage object without re-uploading');
    assert.equal(firestorePersistCallCount, 2, 'Retry must re-run Firestore metadata persistence');
    assert.equal(recoveredItem.fileName, 'transcript_recovery.pdf');
  });

  // Scenario 12: Duplicate upload prevention
  await runAsyncTest('Scenario 12: Concurrent identical uploads share a single in-flight Storage task (duplicate upload prevention)', async () => {
    clearUploadCachesForTesting();
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x42]);
    const file = createSyntheticFile(pngBytes, 'concurrent_id_photo.png', 'image/png');

    let underlyingUploadCount = 0;

    const customTransport = {
      authenticatedUid: TEST_UID,
      uploadAttempt: async ({ storagePath, file: f }: { storagePath: string; file: File }) => {
        underlyingUploadCount += 1;
        await new Promise((r) => setTimeout(r, 40));
        return { fullPath: storagePath, bytesTransferred: f.size };
      },
      persistMetadata: async () => {},
    };

    const [res1, res2] = await Promise.all([
      uploadSmartApplicationDocument({
        userId: TEST_UID,
        applicationId: TEST_APP_ID,
        docType: 'photo',
        label: 'Passport Photo',
        file,
        syncFirestoreMetadata: true,
        customTransport,
      }),
      uploadSmartApplicationDocument({
        userId: TEST_UID,
        applicationId: TEST_APP_ID,
        docType: 'photo',
        label: 'Passport Photo',
        file,
        syncFirestoreMetadata: true,
        customTransport,
      }),
    ]);

    assert.equal(underlyingUploadCount, 1, 'Concurrent duplicate upload requests must execute only 1 Storage upload');
    assert.equal(res1.storagePath, res2.storagePath);
  });
}

async function runCriticalStorageSecurityTests() {
  console.log('\n=== 7. Critical Storage Security Review — 10 Required Security Tests ===');

  const {
    authorizeSmartApplicationUpload,
    consumeAndVerifyUploadTicket,
    authorizeSmartApplicationDocumentRead,
    consumeAndVerifyReadTicket,
    clearStorageAuthTicketsForTesting,
    isStorageIamPermissionError,
    STUDENT_UPLOAD_LOCKED_STATUSES,
  } = await import('../src/server/smartApplicationStorageAuth');

  type FakeTokenIdentity = {
    valid: boolean;
    uid?: string;
    email?: string;
    emailVerified?: boolean;
    customClaims?: Record<string, any>;
  };

  const TOKENS: Record<string, FakeTokenIdentity> = {
    'tok-student-a': {
      valid: true,
      uid: 'uid_student_a',
      email: 'student.a@example.com',
      emailVerified: true,
      customClaims: {},
    },
    'tok-student-b': {
      valid: true,
      uid: 'uid_student_b',
      email: 'student.b@example.com',
      emailVerified: true,
      customClaims: {},
    },
    'tok-counsellor-assigned': {
      valid: true,
      uid: 'uid_counsellor_1',
      email: 'counsellor1@everykr.com',
      emailVerified: true,
      customClaims: { counsellor: true, role: 'counsellor' },
    },
    'tok-counsellor-unassigned': {
      valid: true,
      uid: 'uid_counsellor_2',
      email: 'counsellor2@everykr.com',
      emailVerified: true,
      customClaims: { counsellor: true, role: 'counsellor' },
    },
    'tok-viewer': {
      valid: true,
      uid: 'uid_viewer_1',
      email: 'viewer@everykr.com',
      emailVerified: true,
      customClaims: { viewer: true, role: 'viewer' },
    },
    'tok-admin-claim': {
      valid: true,
      uid: 'uid_admin_verified',
      email: 'ops@everykr.com',
      emailVerified: true,
      customClaims: { admin: true, role: 'admin' },
    },
    // Regression test for ISSUE 5: legacy email WITHOUT verified admin custom claim MUST NOT get admin privileges
    'tok-legacy-email-no-claim': {
      valid: true,
      uid: 'uid_no_admin_claim',
      email: 'mzhmd924@gmail.com',
      emailVerified: true,
      customClaims: {},
    },
  };

  const verifyFakeToken = async (idToken?: string) => {
    if (!idToken || !TOKENS[idToken]) return { valid: false };
    return TOKENS[idToken];
  };

  const APP_B_DRAFT_ID = 'app_student_b_draft_01';
  const APP_B_MISSING_ID = 'app_student_b_missing_02';
  const APP_B_SUBMITTED_ID = 'app_student_b_submitted_03';
  const DOC_B_CURRENT_PATH = `applications/uid_student_b/${APP_B_SUBMITTED_ID}/passport/1732000000_passport_v2.jpg`;
  const DOC_B_PREV_PATH = `applications/uid_student_b/${APP_B_SUBMITTED_ID}/passport/1731000000_passport_v1.jpg`;

  const makeMockDb = (statusOverride?: string): Record<string, {
    id: string;
    userId: string;
    status: string;
    assignedTo: string;
    documents: Record<string, { storagePath: string; previousVersions: Array<{ storagePath: string }> }>;
  }> => ({
    [APP_B_DRAFT_ID]: {
      id: APP_B_DRAFT_ID,
      userId: 'uid_student_b',
      status: statusOverride || 'draft',
      assignedTo: 'uid_counsellor_1',
      documents: {
        passport: {
          storagePath: `applications/uid_student_b/${APP_B_DRAFT_ID}/passport/1732000000_passport.jpg`,
          previousVersions: [],
        },
      },
    },
    [APP_B_MISSING_ID]: {
      id: APP_B_MISSING_ID,
      userId: 'uid_student_b',
      status: 'documents_missing',
      assignedTo: 'uid_counsellor_1',
      documents: {
        bank_statement: {
          storagePath: `applications/uid_student_b/${APP_B_MISSING_ID}/bank_statement/1732000000_bank_v1.pdf`,
          previousVersions: [],
        },
      },
    },
    [APP_B_SUBMITTED_ID]: {
      id: APP_B_SUBMITTED_ID,
      userId: 'uid_student_b',
      status: statusOverride || 'submitted',
      assignedTo: 'uid_counsellor_1',
      documents: {
        passport: {
          storagePath: DOC_B_CURRENT_PATH,
          previousVersions: [{ storagePath: DOC_B_PREV_PATH }],
        },
      },
    },
  });

  const makeDeps = (statusOverride?: string) => {
    const dbMap = makeMockDb(statusOverride);
    return {
      verifyIdToken: verifyFakeToken,
      fetchApplication: async ({ applicationId }: { applicationId: string }) => {
        const record = dbMap[applicationId];
        if (!record) return { status: 'not_found' as const };
        return { status: 'ok' as const, app: record };
      },
      createSignedUploadUrl: async ({ storagePath }: { storagePath: string }) =>
        `https://storage.googleapis.com/everykr.firebasestorage.app/${storagePath}?X-Goog-Signature=mock_v4_upload`,
      createSignedReadUrl: async ({ storagePath }: { storagePath: string }) =>
        `https://storage.googleapis.com/everykr.firebasestorage.app/${storagePath}?X-Goog-Signature=mock_v4_read`,
    };
  };

  // Security Test 1: Student A accessing Student B's documents — DENIED
  await runAsyncTest('Security Test 1: Student A accessing Student B documents (read & upload) is DENIED', async () => {
    clearStorageAuthTicketsForTesting();
    const readRes = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-student-a',
      applicationId: APP_B_SUBMITTED_ID,
      storagePath: DOC_B_CURRENT_PATH,
      deps: makeDeps(),
    });
    assert.equal(readRes.ok, false);
    assert.equal(readRes.httpStatus, 403);
    assert.equal(readRes.errorCode, 'ownership_denied');

    const uploadRes = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-a',
      applicationId: APP_B_DRAFT_ID,
      docType: 'passport',
      fileName: 'forged.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      deps: makeDeps(),
    });
    assert.equal(uploadRes.ok, false);
    assert.equal(uploadRes.httpStatus, 403);
    assert.equal(uploadRes.errorCode, 'ownership_denied');
  });

  // Security Test 2: Unassigned counsellor accessing an application — DENIED
  await runAsyncTest('Security Test 2: Unassigned counsellor accessing an application document is DENIED', async () => {
    clearStorageAuthTicketsForTesting();
    const res = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-counsellor-unassigned',
      applicationId: APP_B_SUBMITTED_ID,
      storagePath: DOC_B_CURRENT_PATH,
      deps: makeDeps(),
    });
    assert.equal(res.ok, false);
    assert.equal(res.httpStatus, 403);
    assert.equal(res.errorCode, 'counsellor_not_assigned');
  });

  // Security Test 3: Assigned counsellor accessing authorized application — ALLOWED (and single-use ticket blocks replay)
  await runAsyncTest('Security Test 3: Assigned counsellor accessing authorized application is ALLOWED', async () => {
    clearStorageAuthTicketsForTesting();
    const res = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-counsellor-assigned',
      applicationId: APP_B_SUBMITTED_ID,
      storagePath: DOC_B_CURRENT_PATH,
      deps: makeDeps(),
    });
    assert.equal(res.ok, true);
    assert.equal(res.httpStatus, 200);
    assert.ok(res.signedReadUrl && res.readToken);

    // First consumption succeeds; second replay attempt fails with 409
    const firstConsume = consumeAndVerifyReadTicket({
      readToken: res.readToken!,
      callerUid: 'uid_counsellor_1',
    });
    assert.equal(firstConsume.ok, true);
    const replayConsume = consumeAndVerifyReadTicket({
      readToken: res.readToken!,
      callerUid: 'uid_counsellor_1',
    });
    assert.equal(replayConsume.ok, false);
    if (!replayConsume.ok) assert.equal(replayConsume.httpStatus, 409);

    // Assigned counsellor still DENIED from uploading student documents
    const counsellorUpload = await authorizeSmartApplicationUpload({
      idToken: 'tok-counsellor-assigned',
      applicationId: APP_B_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      deps: makeDeps(),
    });
    assert.equal(counsellorUpload.ok, false);
    assert.equal(counsellorUpload.httpStatus, 403);
  });

  // Security Test 4: Viewer attempting upload (and raw PII read) — DENIED
  await runAsyncTest('Security Test 4: Viewer attempting upload or raw PII document read is DENIED', async () => {
    clearStorageAuthTicketsForTesting();
    const uploadRes = await authorizeSmartApplicationUpload({
      idToken: 'tok-viewer',
      applicationId: APP_B_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      deps: makeDeps(),
    });
    assert.equal(uploadRes.ok, false);
    assert.equal(uploadRes.httpStatus, 403);
    assert.equal(uploadRes.errorCode, 'viewer_upload_denied');

    const readRes = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-viewer',
      applicationId: APP_B_SUBMITTED_ID,
      storagePath: DOC_B_CURRENT_PATH,
      deps: makeDeps(),
    });
    assert.equal(readRes.ok, false);
    assert.equal(readRes.httpStatus, 403);
    assert.equal(readRes.errorCode, 'viewer_document_access_denied');

    // Verify firestore.rules also blocks viewer from logging raw file preview/download/zip_export
    const frules = readProjectFile('firestore.rules');
    assert.match(
      frules,
      /isSmartAppViewer\(\) &&\s*incoming\(\)\.actorRole == 'viewer' &&\s*incoming\(\)\.action in \['pdf_export', 'csv_export', 'xlsx_export'\]/
    );
  });

  // Security Test 5: Student uploading after submission — DENIED (every locked status tested)
  await runAsyncTest('Security Test 5: Student uploading after submission (submitted, under_review, accepted/admitted, rejected, withdrawn, etc.) is DENIED', async () => {
    clearStorageAuthTicketsForTesting();
    const lockedStatuses = [
      'submitted',
      'under_review',
      'sent_to_university',
      'interview',
      'admitted',
      'accepted',
      'rejected',
      'visa_processing',
      'completed',
      'withdrawn',
    ];
    for (const status of lockedStatuses) {
      assert.ok(STUDENT_UPLOAD_LOCKED_STATUSES.has(status));
      const res = await authorizeSmartApplicationUpload({
        idToken: 'tok-student-b',
        applicationId: APP_B_SUBMITTED_ID,
        docType: 'passport',
        fileName: 'new_passport.jpg',
        fileSize: 2048,
        mimeType: 'image/jpeg',
        deps: makeDeps(status),
      });
      assert.equal(res.ok, false, `Status "${status}" MUST reject student upload`);
      assert.equal(res.httpStatus, 403, `Status "${status}" must return HTTP 403`);
      assert.equal(res.errorCode, 'application_status_locked');
    }
  });

  // Security Test 6: Student uploading while draft — ALLOWED (and single-use ticket blocks reuse + magic bytes checked)
  await runAsyncTest('Security Test 6: Student uploading while draft is ALLOWED with single-use ticket & magic-byte validation', async () => {
    clearStorageAuthTicketsForTesting();
    const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const res = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-b',
      applicationId: APP_B_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport_bio.jpg',
      fileSize: jpegBuf.length,
      mimeType: 'image/jpeg',
      deps: makeDeps('draft'),
    });
    assert.equal(res.ok, true);
    assert.equal(res.httpStatus, 200);
    assert.ok(res.uploadToken && res.storagePath);
    assert.equal(res.signedHeaders?.['x-goog-if-generation-match'], '0');
    assert.match(res.storagePath!, /^applications\/uid_student_b\/app_student_b_draft_01\/passport\/\d+_[a-f0-9]+_passport_bio\.jpg$/);

    // Valid consumption succeeds once
    const firstUse = consumeAndVerifyUploadTicket({
      uploadToken: res.uploadToken!,
      callerUid: 'uid_student_b',
      buffer: jpegBuf,
      contentType: 'image/jpeg',
    });
    assert.equal(firstUse.ok, true);

    // Reusing the exact same uploadToken is DENIED (409)
    const replayUse = consumeAndVerifyUploadTicket({
      uploadToken: res.uploadToken!,
      callerUid: 'uid_student_b',
      buffer: jpegBuf,
      contentType: 'image/jpeg',
    });
    assert.equal(replayUse.ok, false);
    if (!replayUse.ok) {
      assert.equal(replayUse.httpStatus, 409);
      assert.equal(replayUse.errorCode, 'upload_token_already_used');
    }
  });

  // Security Test 7: Student uploading while documents_missing — ALLOWED (preserves version history via unique path)
  await runAsyncTest('Security Test 7: Student uploading while documents_missing is ALLOWED with unique version-preserving path', async () => {
    clearStorageAuthTicketsForTesting();
    const pdfBuf = Buffer.from('%PDF-1.4\n%replacement\n%%EOF', 'ascii');
    const res1 = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-b',
      applicationId: APP_B_MISSING_ID,
      docType: 'bank_statement',
      fileName: 'bank_balance_updated.pdf',
      fileSize: pdfBuf.length,
      mimeType: 'application/pdf',
      deps: makeDeps(),
    });
    const res2 = await authorizeSmartApplicationUpload({
      idToken: 'tok-student-b',
      applicationId: APP_B_MISSING_ID,
      docType: 'bank_statement',
      fileName: 'bank_balance_updated.pdf',
      fileSize: pdfBuf.length,
      mimeType: 'application/pdf',
      deps: makeDeps(),
    });
    assert.equal(res1.ok, true);
    assert.equal(res1.httpStatus, 200);
    assert.equal(res2.ok, true);
    assert.notEqual(
      res1.storagePath,
      res2.storagePath,
      'Each replacement upload must get a unique Storage object path to preserve previousVersions'
    );
  });

  // Security Test 8: Unauthorized user requesting signed upload URL — DENIED (also verifies hardcoded admin email fallback is removed)
  await runAsyncTest('Security Test 8: Unauthorized / unauthenticated / claimless-email user requesting signed upload URL is DENIED', async () => {
    clearStorageAuthTicketsForTesting();
    const noTokenRes = await authorizeSmartApplicationUpload({
      idToken: null,
      applicationId: APP_B_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      deps: makeDeps(),
    });
    assert.equal(noTokenRes.ok, false);
    assert.equal(noTokenRes.httpStatus, 401);

    const forgedTokenRes = await authorizeSmartApplicationUpload({
      idToken: 'forged.jwt.payload',
      applicationId: APP_B_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      deps: makeDeps(),
    });
    assert.equal(forgedTokenRes.ok, false);
    assert.equal(forgedTokenRes.httpStatus, 401);

    // Legacy hardcoded admin email WITHOUT verified admin custom claim must be DENIED cross-student access
    const noClaimAdminRes = await authorizeSmartApplicationUpload({
      idToken: 'tok-legacy-email-no-claim',
      applicationId: APP_B_DRAFT_ID,
      docType: 'passport',
      fileName: 'passport.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      deps: makeDeps(),
    });
    assert.equal(noClaimAdminRes.ok, false);
    assert.equal(noClaimAdminRes.httpStatus, 403);
    assert.equal(noClaimAdminRes.errorCode, 'ownership_denied');
  });

  // Security Test 9: Admin accessing authorized application documents — ALLOWED (current + previousVersions)
  await runAsyncTest('Security Test 9: Admin with verified custom claim accessing authorized application documents is ALLOWED', async () => {
    clearStorageAuthTicketsForTesting();
    const currentDocRes = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-admin-claim',
      applicationId: APP_B_SUBMITTED_ID,
      storagePath: DOC_B_CURRENT_PATH,
      deps: makeDeps(),
    });
    assert.equal(currentDocRes.ok, true);
    assert.equal(currentDocRes.httpStatus, 200);
    assert.ok(currentDocRes.signedReadUrl);

    const previousVersionRes = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-admin-claim',
      applicationId: APP_B_SUBMITTED_ID,
      storagePath: DOC_B_PREV_PATH,
      deps: makeDeps(),
    });
    assert.equal(previousVersionRes.ok, true);
    assert.equal(previousVersionRes.httpStatus, 200);

    // Even an Admin cannot request an unreferenced path outside the application
    const unreferencedRes = await authorizeSmartApplicationDocumentRead({
      idToken: 'tok-admin-claim',
      applicationId: APP_B_SUBMITTED_ID,
      storagePath: `applications/uid_student_b/${APP_B_SUBMITTED_ID}/passport/not_registered.jpg`,
      deps: makeDeps(),
    });
    assert.equal(unreferencedRes.ok, false);
    assert.equal(unreferencedRes.httpStatus, 403);
    assert.equal(unreferencedRes.errorCode, 'document_not_in_application');
  });

  // Security Test 10: Profile photo access by unrelated student — DENIED
  await runAsyncTest('Security Test 10: Profile photo access by unrelated student is DENIED in storage.rules', async () => {
    const srules = readProjectFile('storage.rules');
    const profileIdx = srules.indexOf('match /profile_photos/{userId}/{fileName}');
    const nextIdx = srules.indexOf('match /university-deadlines/{universitySlug}/{fileName}');
    assert.ok(profileIdx > 0 && nextIdx > profileIdx);
    const block = srules.slice(profileIdx, nextIdx);

    assert.match(block, /allow get: if isOwner\(userId\) \|\| isAdmin\(\);/);
    assert.match(block, /allow list: if isAdmin\(\);/);
    assert.match(block, /allow create, update: if \(isOwner\(userId\) \|\| isAdmin\(\)\) &&\s*isValidProfilePhoto\(userId, fileName\);/);
    assert.match(block, /allow delete: if isOwner\(userId\) \|\| isAdmin\(\);/);
    assert.doesNotMatch(block, /allow get: if isSignedIn\(\);/);
    assert.doesNotMatch(block, /allow read: if true;/);
  });

  // Security Test 11: Storage IAM 403 error classification & clean non-weakening recovery
  await runAsyncTest('Security Test 11: GCS Admin Storage IAM 403 is cleanly classified without weakening rules or leaking metadata', async () => {
    assert.equal(isStorageIamPermissionError({ code: 403 }), true);
    assert.equal(isStorageIamPermissionError({ code: '403' }), true);
    assert.equal(isStorageIamPermissionError({ response: { statusCode: 403 } }), true);
    assert.equal(
      isStorageIamPermissionError({
        message: 'service-account does not have storage.objects.create access to the Google Cloud Storage object.',
      }),
      true
    );
    assert.equal(isStorageIamPermissionError({ code: 412 }), false);
    assert.equal(isStorageIamPermissionError({ code: 404 }), false);
    assert.equal(isStorageIamPermissionError(new Error('ECONNRESET')), false);

    const serverSrc = readProjectFile('src/server/smartApplicationServer.ts');
    assert.match(serverSrc, /errorCode:\s*'storage_iam_permission_required'/);
    assert.doesNotMatch(serverSrc, /metadata\.google\.internal/);

    const clientSrc = readProjectFile('src/services/smartApplicationService.ts');
    assert.match(clientSrc, /serverErrorCode === 'storage_iam_permission_required'/);
  });

  // Security Test 12: Permanent Gemini extraction error handling (401/403/404/413/429/500/503/timeout) & JSON unwrapping
  await runAsyncTest('Security Test 12: Distinct Gemini upstream & frontend HTTP error codes never collapse into service_unavailable', async () => {
    const {
      classifyGeminiUpstreamError,
      extractJsonTextFromGeminiResponse,
      formatSmartAiStructuredLog,
      PRIMARY_SMART_APP_MODEL,
      FALLBACK_SMART_APP_MODEL,
    } = await import('../src/server/smartApplicationServer');
    const { classifyHttpStatusToSmartAiError } = await import('../src/services/smartApplicationService');

    const err401 = classifyGeminiUpstreamError({ status: 401, message: 'UNAUTHENTICATED' }, false, false, PRIMARY_SMART_APP_MODEL);
    assert.equal(err401.errorCode, 'auth_required');
    assert.equal(err401.statusCode, 401);
    assert.equal(err401.retryable, false);

    const err403 = classifyGeminiUpstreamError({ status: 403, message: 'PERMISSION_DENIED' }, false, false, PRIMARY_SMART_APP_MODEL);
    assert.equal(err403.errorCode, 'api_permission_denied');
    assert.equal(err403.statusCode, 403);
    assert.equal(err403.retryable, false);

    const err404 = classifyGeminiUpstreamError({ status: 404, message: 'NOT_FOUND' }, false, false, PRIMARY_SMART_APP_MODEL);
    assert.equal(err404.errorCode, 'endpoint_or_model_not_found');
    assert.equal(err404.statusCode, 404);
    assert.equal(err404.retryable, false);

    const err413 = classifyGeminiUpstreamError({ status: 413, message: 'PAYLOAD_TOO_LARGE' }, false, false, PRIMARY_SMART_APP_MODEL);
    assert.equal(err413.errorCode, 'payload_too_large');
    assert.equal(err413.statusCode, 413);
    assert.equal(err413.retryable, false);

    const err429 = classifyGeminiUpstreamError({ status: 429, message: 'RESOURCE_EXHAUSTED' }, false, false, PRIMARY_SMART_APP_MODEL);
    assert.equal(err429.errorCode, 'rate_limited');
    assert.equal(err429.statusCode, 429);
    assert.equal(err429.retryable, true);

    const err500 = classifyGeminiUpstreamError({ status: 500, message: 'INTERNAL' }, false, false, PRIMARY_SMART_APP_MODEL);
    assert.equal(err500.errorCode, 'internal_error');
    assert.equal(err500.statusCode, 500);
    assert.equal(err500.retryable, true);

    const err503 = classifyGeminiUpstreamError({ status: 503, message: '503 UNAVAILABLE: high demand' }, false, false, PRIMARY_SMART_APP_MODEL);
    assert.equal(err503.errorCode, 'service_unavailable');
    assert.equal(err503.statusCode, 503);
    assert.equal(err503.retryable, true);

    const errTimeout = classifyGeminiUpstreamError(null, false, true, PRIMARY_SMART_APP_MODEL);
    assert.equal(errTimeout.errorCode, 'timeout');
    assert.equal(errTimeout.statusCode, 504);
    assert.equal(errTimeout.retryable, true);

    // Frontend HTTP status classifier preserves distinct error codes on non-JSON / error responses
    assert.equal(classifyHttpStatusToSmartAiError(401, 'passport').errorCode, 'auth_required');
    assert.equal(classifyHttpStatusToSmartAiError(403, 'passport').errorCode, 'api_permission_denied');
    assert.equal(classifyHttpStatusToSmartAiError(404, 'passport').errorCode, 'endpoint_or_model_not_found');
    assert.equal(classifyHttpStatusToSmartAiError(413, 'passport').errorCode, 'payload_too_large');
    assert.equal(classifyHttpStatusToSmartAiError(429, 'passport').errorCode, 'rate_limited');
    assert.equal(classifyHttpStatusToSmartAiError(500, 'passport').errorCode, 'internal_error');
    assert.equal(classifyHttpStatusToSmartAiError(503, 'passport').errorCode, 'service_unavailable');
    assert.equal(classifyHttpStatusToSmartAiError(504, 'passport').errorCode, 'timeout');

    // Structured log formatter emits safe JSON with zero PII or secrets
    const logJson = formatSmartAiStructuredLog({
      event: 'smart_ai_request',
      requestId: 'ai_test123456',
      route: 'extract-passport',
      modelId: PRIMARY_SMART_APP_MODEL,
      durationMs: 7420,
      httpStatus: 200,
      failureStage: 'none',
      errorCode: null,
    });
    const parsedLog = JSON.parse(logJson);
    assert.equal(parsedLog.requestId, 'ai_test123456');
    assert.equal(parsedLog.modelId, PRIMARY_SMART_APP_MODEL);
    assert.equal(parsedLog.durationMs, 7420);
    assert.equal(parsedLog.httpStatus, 200);
    assert.equal(parsedLog.outcome, 'ok');
    assert.equal('errorCode' in parsedLog, false);
    assert.equal('errorCategory' in parsedLog, false);
    assert.equal('failureStage' in parsedLog, false);

    assert.equal(
      extractJsonTextFromGeminiResponse('```json\n{"isPassport":true}\n```'),
      '{"isPassport":true}'
    );
    assert.equal(extractJsonTextFromGeminiResponse('  {"ok":true}  '), '{"ok":true}');

    assert.equal(PRIMARY_SMART_APP_MODEL, 'gemini-4-hydrogen');
    assert.equal(FALLBACK_SMART_APP_MODEL, 'gemini-3.1-flash-lite');

    const serverSrc = readProjectFile('src/server/smartApplicationServer.ts');
    assert.doesNotMatch(serverSrc, /gemini-1\.5|gemini-2\.0|gemini-2\.5/);
    assert.doesNotMatch(serverSrc, /_verify-gemini/, 'Temporary debug probe route must be removed');

    const rootServerSrc = readProjectFile('server.ts');
    assert.match(rootServerSrc, /app\.all\('\/api\/\*'/);
    assert.match(rootServerSrc, /app\.use\('\/api',\s*\(err:\s*any,/);
    assert.match(rootServerSrc, /entity\.too\.large/);
  });
}

async function main() {
  await runUploadScenarioTests();
  await runCriticalStorageSecurityTests();

  console.log('\n=== Summary ===');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

void main();

