/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Upload & Auto-Fill Dropzone
 * Supports:
 * - Single Passport PDF/Image upload → single-pass quality/compression/preview → private Firebase Storage upload + Firestore metadata sync → optional server-side Gemini extraction + ICAO 9303 MRZ check
 * - ZIP bundle upload → unzips in browser (filtering __MACOSX & .DS_Store) → classifies each file via Gemini (when AI consent is enabled) or queues for manual assignment (when AI consent is disabled).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Camera,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  GripVertical,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  ChecklistRequirementItem,
  PassportExtractionApiResponse,
  SmartApplicationDocumentItem,
} from '../../types/smartApplication';
import {
  MAX_APPLICATION_FILE_BYTES,
  isAcceptedApplicationFile,
  isZipFile,
  prepareDocumentForUploadAndAnalysis,
  extractFilesFromZip,
  normalizeApplicationUploadFile,
} from '../../utils/documentFileTools';
import {
  extractPassportViaServerAi,
  classifyDocumentViaServerAi,
  uploadSmartApplicationDocument,
  SmartApplicationServiceError,
  type StorageUploadErrorCategory,
} from '../../services/smartApplicationService';

export interface UnassignedUploadedFile {
  id: string;
  file: File;
  fileName: string;
  size: number;
  mimeType: string;
  aiSummary?: string;
  qualityWarnings?: string[];
}

export interface SmartUploadTranscriptAutoFill {
  institutionName?: string;
  gpa?: string;
  gpaScale?: string;
  country?: string;
}

export interface SmartUploadLanguageAutoFill {
  testType?: 'TOPIK' | 'IELTS' | 'TOEFL' | 'Duolingo' | 'None';
  score?: string;
  testDate?: string;
}

interface SmartUploadDropzoneProps {
  mode: 'passport_primary' | 'documents_primary';
  userId: string;
  applicationId: string;
  checklistItems: ChecklistRequirementItem[];
  disabled?: boolean;
  aiConsentGranted: boolean;
  onAiConsentChange: (granted: boolean) => void;
  unassignedFiles: UnassignedUploadedFile[];
  onUnassignedFilesChange: (next: UnassignedUploadedFile[]) => void;
  onDocumentUploaded: (docType: string, item: SmartApplicationDocumentItem) => void;
  onPassportExtracted: (result: PassportExtractionApiResponse) => void;
  onTranscriptExtracted?: (data: SmartUploadTranscriptAutoFill) => void;
  onLanguageExtracted?: (data: SmartUploadLanguageAutoFill) => void;
  onAssignUnassignedFile?: (unassignedId: string, targetDocType: string) => Promise<void>;
}

interface StatusBannerState {
  tone: 'success' | 'warning' | 'error';
  message: string;
  errorCode?: StorageUploadErrorCategory | string;
  requestId?: string;
  recoveryAction?: string;
  canRetry?: boolean;
  retryLabel?: string;
}

interface UploadProgressState {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
  stageLabel: string;
  attempt?: number;
}

function formatBytesShort(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const SmartUploadDropzone: React.FC<SmartUploadDropzoneProps> = ({
  mode,
  userId,
  applicationId,
  checklistItems,
  disabled = false,
  aiConsentGranted,
  onAiConsentChange,
  unassignedFiles,
  onUnassignedFilesChange,
  onDocumentUploaded,
  onPassportExtracted,
  onTranscriptExtracted,
  onLanguageExtracted,
  onAssignUnassignedFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRetryActionRef = useRef<((signal: AbortSignal) => Promise<void>) | null>(null);
  const extractionInFlightRef = useRef<boolean>(false);

  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [statusBanner, setStatusBanner] = useState<StatusBannerState | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({});
  const [manualDirectTarget, setManualDirectTarget] = useState<string>(
    checklistItems[0]?.docType || 'passport'
  );

  useEffect(() => {
    if (checklistItems.length > 0 && !checklistItems.some((c) => c.docType === manualDirectTarget)) {
      setManualDirectTarget(checklistItems[0].docType);
    }
  }, [checklistItems, manualDirectTarget]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const resolveChecklistSlot = (aiDocType: string): ChecklistRequirementItem | undefined => {
    const direct = checklistItems.find((c) => c.docType === aiDocType);
    if (direct) return direct;
    return checklistItems.find((c) => c.docType.startsWith(aiDocType));
  };

  const buildErrorBannerFromException = (
    err: unknown,
    fallbackMsg: string,
    retryFn?: (signal: AbortSignal) => Promise<void>
  ): StatusBannerState => {
    if (retryFn) {
      lastRetryActionRef.current = retryFn;
    }
    if (err instanceof SmartApplicationServiceError) {
      return {
        tone: err.storageErrorCode === 'storage/canceled' ? 'warning' : 'error',
        message: err.message || fallbackMsg,
        errorCode: err.storageErrorCode || err.code,
        recoveryAction: err.recoveryAction,
        canRetry: Boolean(retryFn && err.retryable !== false),
      };
    }
    const errName = String((err as any)?.name || '');
    const errCode = String((err as any)?.code || '');
    const errMsg = err instanceof Error ? err.message : String(err || '');
    if (errName === 'AbortError' || errCode === 'storage/canceled') {
      return {
        tone: 'warning',
        message: 'Document upload was cancelled (storage/canceled).',
        errorCode: 'storage/canceled',
        recoveryAction: 'Click Retry or Choose File whenever you are ready to upload again.',
        canRetry: Boolean(retryFn),
      };
    }
    return {
      tone: 'error',
      message: errMsg || fallbackMsg,
      errorCode: errCode || 'storage/unknown',
      recoveryAction: 'Check your connection and click Retry.',
      canRetry: Boolean(retryFn),
    };
  };

  const handleCancelActiveOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetryLastOperation = async () => {
    const retryFn = lastRetryActionRef.current;
    if (!retryFn || processing || disabled || extractionInFlightRef.current) return;
    setStatusBanner(null);
    setProcessing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      await retryFn(controller.signal);
    } catch (err: unknown) {
      setStatusBanner(
        buildErrorBannerFromException(
          err,
          'Retry could not complete. Please check your connection and try again.',
          retryFn
        )
      );
    } finally {
      setProcessing(false);
      setProgressText('');
      setUploadProgress(null);
    }
  };

  const processPassportFile = async (rawFile: File, signal: AbortSignal) => {
    const retryThisPassport = async (nextSignal: AbortSignal) => {
      await processPassportFile(rawFile, nextSignal);
    };

    setProgressText(`Preparing passport "${rawFile.name}"…`);
    setUploadProgress({
      percent: 5,
      bytesTransferred: 0,
      totalBytes: rawFile.size || 1,
      stageLabel: 'Validating & optimizing passport image…',
    });

    const prepared = await prepareDocumentForUploadAndAnalysis(rawFile, 'passport', {
      includeAnalysisPayload: aiConsentGranted,
      signal,
      onStage: (stage) => {
        if (stage === 'checking_quality') {
          setProgressText(`Checking resolution & MRZ clarity for "${rawFile.name}"…`);
          setUploadProgress({
            percent: 12,
            bytesTransferred: 0,
            totalBytes: rawFile.size || 1,
            stageLabel: 'Checking image clarity…',
          });
        }
      },
    });

    if (!prepared.valid) {
      setStatusBanner({
        tone: 'error',
        message: prepared.error || 'Unsupported or corrupted passport file.',
        errorCode: 'validation-error',
        recoveryAction: 'Please choose a clear PDF, JPG, PNG, or HEIC file under 20 MB.',
        canRetry: false,
      });
      return;
    }

    const uploadReadyFile = prepared.uploadFile;
    const quality = prepared.quality;

    // 1. Always upload passport file to private Storage & persist metadata to Firestore
    let uploadedItem: SmartApplicationDocumentItem | null = null;
    try {
      uploadedItem = await uploadSmartApplicationDocument({
        userId,
        applicationId,
        docType: 'passport',
        file: uploadReadyFile,
        label: 'Passport',
        aiDetected: aiConsentGranted,
        verified: !aiConsentGranted,
        qualityWarnings: quality.warnings,
        requiredDocTypes: checklistItems.map((c) => c.docType),
        syncFirestoreMetadata: true,
        signal,
        onProgress: (p) => {
          const stageLabel =
            p.stage === 'saving_metadata'
              ? 'Syncing passport metadata to your application record…'
              : p.stage === 'verifying'
              ? 'Verifying Firebase Storage object…'
              : `Uploading passport to secure storage… ${p.percent}%`;
          setProgressText(stageLabel);
          setUploadProgress({
            percent: p.percent,
            bytesTransferred: p.bytesTransferred,
            totalBytes: p.totalBytes,
            stageLabel,
            attempt: p.attempt,
          });
        },
      });
      onDocumentUploaded('passport', uploadedItem);
    } catch (uploadErr: unknown) {
      if (uploadErr instanceof SmartApplicationServiceError && uploadErr.uploadedItem) {
        onDocumentUploaded('passport', uploadErr.uploadedItem);
      }
      setStatusBanner(
        buildErrorBannerFromException(
          uploadErr,
          'Could not upload passport file to secure storage.',
          retryThisPassport
        )
      );
      return;
    }

    // Passport file is now safely persisted in private Storage — clear any Storage re-upload retry action
    lastRetryActionRef.current = null;

    if (!aiConsentGranted) {
      setStatusBanner({
        tone: 'success',
        message:
          'Passport uploaded securely to private storage and saved to your application without AI scanning. Enter your details manually below, or enable AI Auto-Fill above.',
      });
      return;
    }

    if (quality.isPasswordProtectedPdf || prepared.isPasswordProtectedPdf) {
      setStatusBanner({
        tone: 'warning',
        message:
          'Passport uploaded to private storage, but this PDF is password-protected so auto-fill could not read it. Upload an unlocked copy or enter your passport details manually.',
      });
      return;
    }

    if (!prepared.analysisPayload?.base64) {
      setStatusBanner({
        tone: 'warning',
        message:
          prepared.error ||
          'Passport file uploaded securely, but we could not render a preview for automatic scanning. Please fill in your details manually.',
      });
      return;
    }

    const analysisPayload = prepared.analysisPayload;
    const runAiExtraction = async (activeSignal: AbortSignal) => {
      if (extractionInFlightRef.current) return;
      extractionInFlightRef.current = true;

      try {
        setProgressText('Scanning passport MRZ & extracting fields with AI…');
        setUploadProgress({
          percent: 100,
          bytesTransferred: uploadReadyFile.size,
          totalBytes: uploadReadyFile.size,
          stageLabel: 'Verifying ICAO 9303 MRZ check digits…',
        });

        const extraction = await extractPassportViaServerAi(
          analysisPayload.base64,
          analysisPayload.mimeType,
          applicationId,
          { signal: activeSignal }
        );

        const isSuccessfulExtraction =
          extraction.ok === true &&
          extraction.readable === true &&
          extraction.success !== false;

        if (!isSuccessfulExtraction) {
          const displayCode =
            extraction.canonicalErrorCode ||
            extraction.error?.code ||
            extraction.errorCode ||
            'AI_EXTRACTION_FAILED';
          const canRetryAiOnly = Boolean(extraction.retryable);

          // Retry ALWAYS re-runs ONLY AI extraction — NEVER re-uploads to Firebase Storage
          lastRetryActionRef.current = canRetryAiOnly
            ? async (retrySignal: AbortSignal) => {
                await runAiExtraction(retrySignal);
              }
            : null;

          setStatusBanner({
            tone: 'warning',
            message:
              extraction.error?.message ||
              extraction.message ||
              'Passport uploaded securely, but fields could not be read automatically. Your file is saved — please enter your details manually below.',
            errorCode: displayCode,
            requestId: extraction.requestId,
            recoveryAction: canRetryAiOnly
              ? 'Your passport file is already saved in private storage. Click "Retry AI Scan (File Already Saved)" to re-scan without re-uploading, or enter your passport details manually below.'
              : 'Your passport file is already saved in private storage. You can complete the personal details fields manually below right away.',
            canRetry: canRetryAiOnly,
            retryLabel: 'Retry AI Scan (File Already Saved)',
          });
          return;
        }

        // Extraction succeeded with validated schema & usable passport data
        lastRetryActionRef.current = null;
        onPassportExtracted(extraction);

        if (extraction.mrzValidation?.isValid) {
          setStatusBanner({
            tone: 'success',
            message:
              'Passport uploaded & MRZ check digits verified (ICAO 9303). Please verify each gold-highlighted field below.',
          });
        } else {
          setStatusBanner({
            tone: 'warning',
            message:
              extraction.message ||
              'Passport uploaded & fields filled, but MRZ check digits could not be fully verified. Please double-check each marked field.',
          });
        }
      } finally {
        extractionInFlightRef.current = false;
      }
    };

    await runAiExtraction(signal);
  };

  const processZipBundle = async (zipFile: File, signal: AbortSignal) => {
    const retryZip = async (nextSignal: AbortSignal) => {
      await processZipBundle(zipFile, nextSignal);
    };

    setProgressText(`Extracting "${zipFile.name}" in your browser…`);
    setUploadProgress({
      percent: 10,
      bytesTransferred: 0,
      totalBytes: zipFile.size || 1,
      stageLabel: `Unpacking "${zipFile.name}"…`,
    });

    const extracted = await extractFilesFromZip(zipFile);
    if (extracted.length === 0) {
      setStatusBanner({
        tone: 'warning',
        message:
          'No supported documents (PDF, JPG, PNG, HEIC) were found inside this ZIP file. System folders (__MACOSX, .DS_Store) are automatically ignored.',
      });
      return;
    }

    if (!aiConsentGranted) {
      const manualQueued: UnassignedUploadedFile[] = [
        ...unassignedFiles,
        ...extracted.map((entry) => ({
          id: entry.id,
          file: normalizeApplicationUploadFile(entry.file),
          fileName: entry.fileName,
          size: entry.size,
          mimeType: entry.mimeType,
          aiSummary: 'AI auto-sorting is off — assign this file to a checklist card below.',
        })),
      ];
      onUnassignedFilesChange(manualQueued);
      setStatusBanner({
        tone: 'success',
        message: `Unpacked ${extracted.length} file${
          extracted.length === 1 ? '' : 's'
        } from ZIP without AI scanning. Select each file’s checklist category and click Assign below to upload privately.`,
      });
      return;
    }

    let matchedCount = 0;
    let passportFound = false;
    let lastUploadError: unknown = null;
    const newUnassigned: UnassignedUploadedFile[] = [...unassignedFiles];

    for (let i = 0; i < extracted.length; i += 1) {
      if (signal.aborted) {
        const abortErr = new Error('Upload cancelled by user.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      const entry = extracted[i];
      setProgressText(
        `Analyzing file ${i + 1} of ${extracted.length}: ${entry.fileName}…`
      );
      setUploadProgress({
        percent: Math.round(((i + 0.25) / extracted.length) * 100),
        bytesTransferred: entry.size,
        totalBytes: entry.size,
        stageLabel: `Analyzing file ${i + 1} of ${extracted.length}: ${entry.fileName}`,
      });

      const prepared = await prepareDocumentForUploadAndAnalysis(entry.file, 'other', {
        includeAnalysisPayload: true,
        signal,
      });

      if (!prepared.valid || !prepared.analysisPayload?.base64) {
        newUnassigned.push({
          id: entry.id,
          file: prepared.uploadFile,
          fileName: prepared.uploadFile.name,
          size: prepared.uploadFile.size,
          mimeType: prepared.uploadFile.type || entry.mimeType,
          aiSummary: prepared.isPasswordProtectedPdf
            ? 'Password-protected PDF (could not classify automatically)'
            : 'Could not preview automatically — assign manually below',
          qualityWarnings: prepared.isPasswordProtectedPdf
            ? ['Password-protected PDF']
            : prepared.quality.warnings,
        });
        continue;
      }

      const classification = await classifyDocumentViaServerAi(
        prepared.analysisPayload.base64,
        prepared.analysisPayload.mimeType,
        entry.fileName,
        applicationId,
        { signal }
      );

      if (classification.docType === 'passport') {
        passportFound = true;
        matchedCount += 1;
        await processPassportFile(entry.file, signal);
        continue;
      }

      const targetSlot =
        classification.docType !== 'other'
          ? resolveChecklistSlot(classification.docType)
          : undefined;

      if (targetSlot) {
        try {
          const uploaded = await uploadSmartApplicationDocument({
            userId,
            applicationId,
            docType: targetSlot.docType,
            file: prepared.uploadFile,
            label: targetSlot.label,
            aiDetected: true,
            verified: false,
            qualityWarnings: prepared.quality.warnings,
            requiredDocTypes: checklistItems.map((c) => c.docType),
            syncFirestoreMetadata: true,
            signal,
            onProgress: (p) => {
              setUploadProgress({
                percent: p.percent,
                bytesTransferred: p.bytesTransferred,
                totalBytes: p.totalBytes,
                stageLabel: `Uploading ${targetSlot.label} (${i + 1}/${extracted.length})… ${p.percent}%`,
                attempt: p.attempt,
              });
            },
          });
          onDocumentUploaded(targetSlot.docType, uploaded);
          matchedCount += 1;

          if (
            classification.extractedTranscript &&
            (classification.extractedTranscript.institutionName ||
              classification.extractedTranscript.gpa)
          ) {
            onTranscriptExtracted?.(classification.extractedTranscript);
          }
          if (
            classification.extractedLanguage &&
            classification.extractedLanguage.testType &&
            classification.extractedLanguage.testType !== 'None' &&
            classification.extractedLanguage.score
          ) {
            onLanguageExtracted?.(classification.extractedLanguage);
          }
        } catch (uploadErr: unknown) {
          lastUploadError = uploadErr;
          newUnassigned.push({
            id: entry.id,
            file: prepared.uploadFile,
            fileName: prepared.uploadFile.name,
            size: prepared.uploadFile.size,
            mimeType: prepared.uploadFile.type || entry.mimeType,
            aiSummary:
              uploadErr instanceof Error
                ? `Upload failed (${uploadErr.message}) — retry by assigning below`
                : classification.summary || 'Upload failed — retry by assigning below',
            qualityWarnings: prepared.quality.warnings,
          });
        }
      } else {
        newUnassigned.push({
          id: entry.id,
          file: prepared.uploadFile,
          fileName: prepared.uploadFile.name,
          size: prepared.uploadFile.size,
          mimeType: prepared.uploadFile.type || entry.mimeType,
          aiSummary:
            classification.summary || 'Unmatched document — drag or assign to a checklist card.',
          qualityWarnings: prepared.quality.warnings,
        });
      }
    }

    onUnassignedFilesChange(newUnassigned);
    if (matchedCount === 0 && lastUploadError) {
      setStatusBanner(
        buildErrorBannerFromException(
          lastUploadError,
          'ZIP files were unpacked, but uploading to Firebase Storage failed.',
          retryZip
        )
      );
      return;
    }

    setStatusBanner({
      tone: matchedCount > 0 ? 'success' : 'warning',
      message: `Processed ${extracted.length} file${extracted.length === 1 ? '' : 's'} from ZIP: ${matchedCount} uploaded & matched to checklist${
        passportFound ? ' (including passport auto-fill)' : ''
      }${
        newUnassigned.length > unassignedFiles.length
          ? `, ${newUnassigned.length - unassignedFiles.length} awaiting manual assignment below.`
          : '.'
      }`,
    });
  };

  const processSingleDocumentSmart = async (rawFile: File, signal: AbortSignal) => {
    const retrySingle = async (nextSignal: AbortSignal) => {
      await processSingleDocumentSmart(rawFile, nextSignal);
    };

    if (mode === 'passport_primary') {
      await processPassportFile(rawFile, signal);
      return;
    }

    // In documents_primary mode with AI consent OFF: upload directly to the selected checklist slot
    if (!aiConsentGranted) {
      const targetSlot =
        checklistItems.find((c) => c.docType === manualDirectTarget) || checklistItems[0];

      if (!targetSlot) {
        const normalized = normalizeApplicationUploadFile(rawFile);
        onUnassignedFilesChange([
          ...unassignedFiles,
          {
            id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            file: normalized,
            fileName: normalized.name,
            size: normalized.size,
            mimeType: normalized.type || 'application/octet-stream',
            aiSummary: 'AI auto-sorting is off — choose which checklist item this belongs to below.',
          },
        ]);
        setStatusBanner({
          tone: 'success',
          message: `"${normalized.name}" is ready for manual assignment below (not sent to AI).`,
        });
        return;
      }

      setProgressText(`Preparing "${rawFile.name}" for ${targetSlot.label}…`);
      const prepared = await prepareDocumentForUploadAndAnalysis(rawFile, targetSlot.docType, {
        includeAnalysisPayload: false,
        signal,
      });

      if (!prepared.valid) {
        setStatusBanner({
          tone: 'error',
          message: prepared.error || 'Unsupported or invalid document file.',
          errorCode: 'validation-error',
          recoveryAction: 'Choose a valid PDF, JPG, PNG, HEIC, or ZIP file under 20 MB.',
          canRetry: false,
        });
        return;
      }

      try {
        const uploaded = await uploadSmartApplicationDocument({
          userId,
          applicationId,
          docType: targetSlot.docType,
          file: prepared.uploadFile,
          label: targetSlot.label,
          aiDetected: false,
          verified: true,
          qualityWarnings: prepared.quality.warnings,
          requiredDocTypes: checklistItems.map((c) => c.docType),
          syncFirestoreMetadata: true,
          signal,
          onProgress: (p) => {
            const stageLabel =
              p.stage === 'saving_metadata'
                ? `Saving ${targetSlot.label} metadata…`
                : `Uploading ${targetSlot.label} to private storage… ${p.percent}%`;
            setProgressText(stageLabel);
            setUploadProgress({
              percent: p.percent,
              bytesTransferred: p.bytesTransferred,
              totalBytes: p.totalBytes,
              stageLabel,
              attempt: p.attempt,
            });
          },
        });
        onDocumentUploaded(targetSlot.docType, uploaded);
        setStatusBanner({
          tone: 'success',
          message: `"${prepared.uploadFile.name}" uploaded privately to "${targetSlot.label}" without AI scanning.`,
        });
      } catch (uploadErr: unknown) {
        if (uploadErr instanceof SmartApplicationServiceError && uploadErr.uploadedItem) {
          onDocumentUploaded(targetSlot.docType, uploadErr.uploadedItem);
        }
        setStatusBanner(
          buildErrorBannerFromException(
            uploadErr,
            `Could not upload "${rawFile.name}" to secure storage.`,
            retrySingle
          )
        );
      }
      return;
    }

    // In documents_primary mode with AI consent ON: single-pass prepare → classify → upload
    setProgressText(`Preparing & analyzing "${rawFile.name}"…`);
    setUploadProgress({
      percent: 10,
      bytesTransferred: 0,
      totalBytes: rawFile.size || 1,
      stageLabel: `Preparing "${rawFile.name}"…`,
    });

    const prepared = await prepareDocumentForUploadAndAnalysis(rawFile, 'other', {
      includeAnalysisPayload: true,
      signal,
    });

    if (!prepared.valid) {
      setStatusBanner({
        tone: 'error',
        message: prepared.error || 'Unsupported or invalid file.',
        errorCode: 'validation-error',
        recoveryAction: 'Please upload a valid PDF, JPG, PNG, HEIC, or ZIP file under 20 MB.',
        canRetry: false,
      });
      return;
    }

    if (!prepared.analysisPayload?.base64) {
      onUnassignedFilesChange([
        ...unassignedFiles,
        {
          id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          file: prepared.uploadFile,
          fileName: prepared.uploadFile.name,
          size: prepared.uploadFile.size,
          mimeType: prepared.uploadFile.type || 'application/octet-stream',
          aiSummary: prepared.error || 'Could not read file automatically — assign below.',
          qualityWarnings: prepared.quality.warnings,
        },
      ]);
      setStatusBanner({
        tone: 'warning',
        message:
          'We could not classify this file automatically. Select which checklist requirement it belongs to below and click Assign.',
      });
      return;
    }

    setUploadProgress({
      percent: 25,
      bytesTransferred: 0,
      totalBytes: prepared.uploadFile.size || 1,
      stageLabel: `Classifying "${prepared.uploadFile.name}" with AI…`,
    });

    const classification = await classifyDocumentViaServerAi(
      prepared.analysisPayload.base64,
      prepared.analysisPayload.mimeType,
      prepared.uploadFile.name,
      applicationId,
      { signal }
    );

    if (classification.docType === 'passport') {
      await processPassportFile(rawFile, signal);
      return;
    }

    const targetSlot =
      classification.docType !== 'other'
        ? resolveChecklistSlot(classification.docType)
        : undefined;

    if (targetSlot) {
      try {
        const uploaded = await uploadSmartApplicationDocument({
          userId,
          applicationId,
          docType: targetSlot.docType,
          file: prepared.uploadFile,
          label: targetSlot.label,
          aiDetected: true,
          verified: false,
          qualityWarnings: prepared.quality.warnings,
          requiredDocTypes: checklistItems.map((c) => c.docType),
          syncFirestoreMetadata: true,
          signal,
          onProgress: (p) => {
            const stageLabel =
              p.stage === 'saving_metadata'
                ? `Saving ${targetSlot.label} record…`
                : `Uploading ${targetSlot.label} to secure storage… ${p.percent}%`;
            setProgressText(stageLabel);
            setUploadProgress({
              percent: p.percent,
              bytesTransferred: p.bytesTransferred,
              totalBytes: p.totalBytes,
              stageLabel,
              attempt: p.attempt,
            });
          },
        });
        onDocumentUploaded(targetSlot.docType, uploaded);

        if (
          classification.extractedTranscript &&
          (classification.extractedTranscript.institutionName ||
            classification.extractedTranscript.gpa)
        ) {
          onTranscriptExtracted?.(classification.extractedTranscript);
        }
        if (
          classification.extractedLanguage &&
          classification.extractedLanguage.testType &&
          classification.extractedLanguage.testType !== 'None' &&
          classification.extractedLanguage.score
        ) {
          onLanguageExtracted?.(classification.extractedLanguage);
        }

        setStatusBanner({
          tone: 'success',
          message: `Detected "${targetSlot.label}" and uploaded "${prepared.uploadFile.name}". Any extracted academic/language details are highlighted for verification.`,
        });
      } catch (uploadErr: unknown) {
        if (uploadErr instanceof SmartApplicationServiceError && uploadErr.uploadedItem) {
          onDocumentUploaded(targetSlot.docType, uploadErr.uploadedItem);
        }
        setStatusBanner(
          buildErrorBannerFromException(
            uploadErr,
            `Detected "${targetSlot.label}", but uploading to Firebase Storage failed.`,
            retrySingle
          )
        );
      }
    } else {
      onUnassignedFilesChange([
        ...unassignedFiles,
        {
          id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          file: prepared.uploadFile,
          fileName: prepared.uploadFile.name,
          size: prepared.uploadFile.size,
          mimeType: prepared.uploadFile.type || 'application/octet-stream',
          aiSummary: classification.summary || 'Unassigned file — choose a requirement below.',
          qualityWarnings: prepared.quality.warnings,
        },
      ]);
      setStatusBanner({
        tone: 'warning',
        message: `"${prepared.uploadFile.name}" was added to Unassigned Files. Choose its document requirement below and click Assign.`,
      });
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled || processing) return;
    const files = Array.from(fileList);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';

    const runBatch = async (batchSignal: AbortSignal) => {
      for (const file of files) {
        if (!isAcceptedApplicationFile(file)) {
          setStatusBanner({
            tone: 'error',
            message: `"${file.name || 'Selected file'}" is not a supported format. Accepted: PDF, JPG, PNG, HEIC, or ZIP.`,
            errorCode: 'validation-error',
            recoveryAction: 'Choose a valid PDF, JPG, PNG, HEIC, or ZIP file.',
            canRetry: false,
          });
          continue;
        }
        if (file.size > MAX_APPLICATION_FILE_BYTES) {
          setStatusBanner({
            tone: 'error',
            message: `"${file.name}" (${formatBytesShort(file.size)}) exceeds the 20 MB maximum file size.`,
            errorCode: 'validation-error',
            recoveryAction: 'Compress or split the file so it is under 20 MB.',
            canRetry: false,
          });
          continue;
        }

        if (isZipFile(file)) {
          await processZipBundle(file, batchSignal);
        } else {
          await processSingleDocumentSmart(file, batchSignal);
        }
      }
    };

    lastRetryActionRef.current = runBatch;
    setStatusBanner(null);
    setProcessing(true);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      await runBatch(controller.signal);
    } catch (err: unknown) {
      setStatusBanner(
        buildErrorBannerFromException(
          err,
          'Something went wrong while processing your upload. Please click Retry.',
          runBatch
        )
      );
    } finally {
      setProcessing(false);
      setProgressText('');
      setUploadProgress(null);
    }
  };

  const handleManualAssign = async (item: UnassignedUploadedFile) => {
    const targetDocType = selectedTargets[item.id] || checklistItems[0]?.docType;
    if (!targetDocType || !onAssignUnassignedFile) return;
    setAssigningId(item.id);
    try {
      await onAssignUnassignedFile(item.id, targetDocType);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="space-y-3 min-w-0">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-2xl border-2 border-dashed p-4 sm:p-6 transition-all min-w-0 ${
          isDragging
            ? 'border-[#0754B8] bg-[#0754B8]/10'
            : 'border-[#0754B8]/30 bg-gradient-to-br from-[#F5F8FD] via-white to-[#EEF4FC] dark:from-[#0B1D44] dark:via-[#0B1D44] dark:to-[#0E2452]'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className="space-y-4 min-w-0">
          {/* 1. Header Row: Icon + Full-Width Title & Description */}
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#061B49] dark:bg-[#0754B8] text-[#FFB800] dark:text-white flex items-center justify-center shrink-0 shadow-sm">
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-[#061B49] dark:text-white leading-snug">
                  {mode === 'passport_primary'
                    ? 'Smart Upload — Scan Passport or Document ZIP to Auto-Fill'
                    : 'Smart Upload — Drop Passport, Documents, or a Full ZIP Folder'}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#FFB800]/18 text-[#8A6100] dark:text-[#FCD34D] border border-[#FFB800]/40 shrink-0">
                  ICAO 9303 MRZ Verified
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#4B607F] dark:text-[#B8C9E5] leading-relaxed">
                {mode === 'passport_primary'
                  ? 'Upload your passport bio page (PDF, JPG, PNG, HEIC) or a ZIP of all your documents. We extract fields automatically and highlight them for your review — nothing is ever submitted without your approval.'
                  : 'Drop a single ZIP file containing your admissions documents or individual files. AI classifies transcripts, passport, photo, language & bank certificates into the checklist automatically.'}
              </p>

              <p className="text-[11px] font-medium text-[#64748B] dark:text-[#93A9CB]">
                Accepted: PDF, JPG, PNG, HEIC, ZIP · Max 20 MB per file · Strictly private storage
              </p>
            </div>
          </div>

          {/* 2. Full-Width AI Consent Card (Never squeezed into a narrow column on mobile) */}
          <label className="w-full flex items-start gap-3 rounded-xl bg-white dark:bg-[#061536]/80 border border-slate-200 dark:border-white/15 px-3.5 py-3 text-xs sm:text-sm text-[#061B49] dark:text-slate-200 cursor-pointer transition-colors hover:border-[#0754B8]/40">
            <input
              type="checkbox"
              checked={aiConsentGranted}
              disabled={disabled || processing}
              onChange={(e) => onAiConsentChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#0754B8] shrink-0 cursor-pointer"
            />
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-[#061B49] dark:text-white">
                  Enable AI Auto-Fill &amp; Smart Sorting
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#0754B8] dark:text-[#60A5FA]">
                  <ShieldCheck className="w-3 h-3" /> Optional
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#475569] dark:text-[#B8C9E5] leading-relaxed">
                I consent to sending a preview image of uploaded documents to EVERYKR’s AI service to
                extract fields and sort checklist files. Leave unchecked to upload privately directly
                to your secure application folder without AI.
              </p>
            </div>
          </label>

          {/* Direct checklist slot selector when AI consent is off in documents_primary mode */}
          {mode === 'documents_primary' && !aiConsentGranted && checklistItems.length > 0 && (
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 px-3.5 py-2.5">
              <span className="text-xs font-bold text-[#081426] dark:text-slate-200">
                Private Upload Target Category:
              </span>
              <select
                value={manualDirectTarget}
                disabled={disabled || processing}
                onChange={(e) => setManualDirectTarget(e.target.value)}
                className="w-full sm:w-auto text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081426] text-[#081426] dark:text-white px-3 py-2"
              >
                {checklistItems.map((c) => (
                  <option key={c.docType} value={c.docType}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Mobile-First Action Buttons: Full-width stacked on mobile, balanced row on tablet/desktop */}
          <div className="w-full grid grid-cols-1 sm:flex sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-0.5">
            <button
              type="button"
              disabled={disabled || processing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {mode === 'documents_primary' ? (
                <FileArchive className="w-4 h-4 shrink-0" />
              ) : (
                <Upload className="w-4 h-4 shrink-0" />
              )}
              <span>
                {processing
                  ? aiConsentGranted
                    ? 'Uploading & Scanning…'
                    : 'Uploading…'
                  : 'Choose File / ZIP'}
              </span>
            </button>

            <button
              type="button"
              disabled={disabled || processing}
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 text-[#081426] dark:text-white hover:bg-slate-50 dark:hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Camera className="w-4 h-4 text-[#2563EB] dark:text-[#4BA3FF] shrink-0" />
              <span>Take Photo</span>
            </button>
          </div>
        </div>

        {/* 4. Real-Time Upload Progress Bar & Cancel Control */}
        {processing && (progressText || uploadProgress) && (
          <div className="mt-4 rounded-xl bg-white/95 dark:bg-[#081426]/90 border border-[#2563EB]/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB] shrink-0" />
                <span className="text-xs font-bold text-[#081426] dark:text-white truncate">
                  {uploadProgress?.stageLabel || progressText}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelActiveOperation}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 dark:border-rose-800 shrink-0 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            </div>

            {uploadProgress && (
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] transition-all duration-150"
                    style={{ width: `${Math.max(4, Math.min(100, uploadProgress.percent))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#526685] dark:text-[#93A9CB]">
                  <span>
                    {formatBytesShort(uploadProgress.bytesTransferred)} /{' '}
                    {formatBytesShort(uploadProgress.totalBytes)}
                    {uploadProgress.attempt && uploadProgress.attempt > 1
                      ? ` · Retry attempt ${uploadProgress.attempt}`
                      : ''}
                  </span>
                  <span className="font-bold text-[#2563EB] dark:text-[#4BA3FF]">
                    {uploadProgress.percent}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple={mode === 'documents_primary'}
          accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.zip,application/pdf,image/*,application/zip"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/*"
          capture="environment"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* 5. Categorized Status / Error Banner with Recovery Guidance & Retry Button */}
      {statusBanner && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3.5 text-xs sm:text-sm border space-y-2.5 min-w-0 ${
            statusBanner.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : statusBanner.tone === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {statusBanner.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              )}
              <div className="space-y-1 min-w-0 flex-1">
                {statusBanner.errorCode && statusBanner.tone !== 'success' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide bg-black/10 dark:bg-white/10">
                      {statusBanner.errorCode}
                    </span>
                    {statusBanner.requestId && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono opacity-75 bg-black/5 dark:bg-white/5">
                        Ref: {statusBanner.requestId}
                      </span>
                    )}
                  </div>
                )}
                <p className="font-semibold break-words leading-relaxed">{statusBanner.message}</p>
                {statusBanner.recoveryAction && (
                  <p className="text-[11px] sm:text-xs opacity-90 break-words leading-relaxed">
                    <strong>Next step:</strong> {statusBanner.recoveryAction}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="p-1 opacity-70 hover:opacity-100 cursor-pointer shrink-0"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {statusBanner.canRetry && lastRetryActionRef.current && !processing && (
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={handleRetryLastOperation}
                className="w-full sm:w-auto min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#081426] hover:bg-[#13284c] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {statusBanner.retryLabel
                    ? statusBanner.retryLabel
                    : statusBanner.errorCode === 'metadata-sync-failed'
                    ? 'Retry Saving Document Record'
                    : 'Retry Upload'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. Other / Unassigned files from ZIP or Smart Upload */}
      {unassignedFiles.length > 0 && (
        <div className="rounded-2xl border border-[#D6B875]/60 bg-amber-50/70 dark:bg-amber-950/25 p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#081426] dark:text-white">
                Other / Unassigned Files ({unassignedFiles.length})
              </h4>
              <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5]">
                Drag a file onto a checklist card below, or pick its document category and click Assign.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {unassignedFiles.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/everykr-unassigned-id', item.id);
                }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-white dark:bg-[#0B172B] border border-slate-200 dark:border-white/10 p-3 cursor-grab active:cursor-grabbing min-w-0"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <GripVertical className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#081426] dark:text-white truncate">
                      {item.fileName}
                    </p>
                    <p className="text-[11px] text-[#526685] dark:text-[#93A9CB] break-words">
                      {formatBytesShort(item.size)}
                      {item.aiSummary ? ` · ${item.aiSummary}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full sm:w-auto">
                  <select
                    value={selectedTargets[item.id] || checklistItems[0]?.docType || 'other'}
                    onChange={(e) =>
                      setSelectedTargets((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="flex-1 sm:flex-initial min-w-0 text-xs rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081426] text-[#081426] dark:text-white px-2.5 py-2"
                  >
                    {checklistItems.map((c) => (
                      <option key={c.docType} value={c.docType}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={assigningId === item.id}
                    onClick={() => handleManualAssign(item)}
                    className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer disabled:opacity-50"
                  >
                    {assigningId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Assign</span>
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUnassignedFilesChange(unassignedFiles.filter((u) => u.id !== item.id))
                    }
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    aria-label="Remove unassigned file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
