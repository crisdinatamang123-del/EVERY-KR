import * as XLSX from 'xlsx';
import { SimApplicationRecord } from '../types';

export interface SimDocumentFetchResult {
  included: boolean;
  fileName: string;
  bytes?: Uint8Array;
  mimeType?: string;
  errorNote?: string;
}

export interface StudentZipManifestRow {
  serialNumber: number;
  studentName: string;
  applicationId: string;
  universityName: string;
  country: string;
  whatsappNumber: string;
  airportName: string;
  airportCode: string;
  arrivalDate: string;
  arrivalTime: string;
  flightNumber: string;
  folderName: string;
  passportIncluded: 'Yes' | 'No';
  passportFileName: string;
  airticketIncluded: 'Yes' | 'No';
  airticketFileName: string;
  exportResult: 'Complete (Both Documents)' | 'Partial (Missing Document)' | 'Failed / No Documents';
  errorOrMissingNote: string;
}

export interface BulkZipExportProgress {
  phase: 'preparing' | 'fetching_documents' | 'building_manifest' | 'packaging_zip' | 'completed' | 'failed';
  processedStudents: number;
  totalStudents: number;
  currentStudentName?: string;
  percentage: number;
}

export interface BulkZipExportOutcome {
  ok: boolean;
  fileName: string;
  zipFileName: string;
  zipBytes: Uint8Array;
  totalStudents: number;
  completeCount: number;
  completeStudentsCount: number;
  partialCount: number;
  missingDocumentsCount: number;
  failedCount: number;
  failedDownloadsCount: number;
  warnings: string[];
  manifestRows: StudentZipManifestRow[];
}

// ============================================================================
// AIRPORT CODE & COUNTRY HELPERS
// ============================================================================

export function extractAirportCode(
  airportStr: string
): 'ICN' | 'PUS' | 'GMP' | 'CJU' | 'TAE' | 'CJJ' | 'OTHER' {
  const raw = String(airportStr || '').trim();
  const match = raw.match(/\(([A-Z]{3})\)/);
  if (match) {
    const code = match[1];
    if (
      code === 'ICN' ||
      code === 'PUS' ||
      code === 'GMP' ||
      code === 'CJU' ||
      code === 'TAE' ||
      code === 'CJJ'
    ) {
      return code;
    }
  }
  if (raw.toUpperCase().includes('INCHEON') || raw.toUpperCase() === 'ICN') return 'ICN';
  if (raw.toUpperCase().includes('GIMHAE') || raw.toUpperCase().includes('BUSAN') || raw.toUpperCase() === 'PUS') return 'PUS';
  if (raw.toUpperCase().includes('GIMPO') || raw.toUpperCase() === 'GMP') return 'GMP';
  if (raw.toUpperCase().includes('JEJU') || raw.toUpperCase() === 'CJU') return 'CJU';
  if (raw.toUpperCase().includes('DAEGU') || raw.toUpperCase() === 'TAE') return 'TAE';
  if (raw.toUpperCase().includes('CHEONGJU') || raw.toUpperCase() === 'CJJ') return 'CJJ';
  return 'OTHER';
}

export const extractAirportIataCode = extractAirportCode;

export function deriveStudentCountryFromSimRecord(app: SimApplicationRecord): string {
  const anyApp = app as any;
  if (anyApp.country && String(anyApp.country).trim()) {
    return String(anyApp.country).trim();
  }
  if (anyApp.nationality && String(anyApp.nationality).trim()) {
    return String(anyApp.nationality).trim();
  }
  const phone = String(app.whatsappNumber || app.whatsappCountryCode || '').trim();
  if (phone.startsWith('+880')) return 'Bangladesh';
  if (phone.startsWith('+977')) return 'Nepal';
  if (phone.startsWith('+92')) return 'Pakistan';
  if (phone.startsWith('+91')) return 'India';
  if (phone.startsWith('+94')) return 'Sri Lanka';
  if (phone.startsWith('+84')) return 'Vietnam';
  if (phone.startsWith('+62')) return 'Indonesia';
  if (phone.startsWith('+60')) return 'Malaysia';
  if (phone.startsWith('+63')) return 'Philippines';
  if (phone.startsWith('+86')) return 'China';
  if (phone.startsWith('+998')) return 'Uzbekistan';
  if (phone.startsWith('+7')) return 'Kazakhstan';
  if (phone.startsWith('+976')) return 'Mongolia';
  if (phone.startsWith('+82')) return 'South Korea';
  if (phone.startsWith('+1')) return 'USA / Canada';
  if (phone.startsWith('+44')) return 'United Kingdom';
  return 'International';
}

export function getDocumentPresenceStatus(
  url?: string,
  fileName?: string
): 'Uploaded' | 'Missing' {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return 'Missing';
  if (cleanUrl === 'missing' || cleanUrl === 'none' || cleanUrl === '#') return 'Missing';
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('blob:') || cleanUrl.startsWith('server-protected://')) {
    return 'Uploaded';
  }
  return fileName ? 'Uploaded' : 'Missing';
}

export function hasValidPassportDocument(app: SimApplicationRecord): boolean {
  return getDocumentPresenceStatus(app.passportDocumentURL, app.passportFileName) === 'Uploaded';
}

export function hasValidAirticketDocument(app: SimApplicationRecord): boolean {
  return getDocumentPresenceStatus(app.flightTicketDocumentURL, app.flightTicketFileName) === 'Uploaded';
}

/**
 * Formats an arrival date like '2027-11-10' into '10_Nov_2027' for filenames.
 */
export function formatArrivalDateForFilename(dateStr?: string): string {
  if (!dateStr || dateStr === 'ALL') return '';
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return String(dateStr).replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  const [, year, month, day] = match;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
  return `${day}_${monthNames[monthIdx]}_${year}`;
}

export function formatReadableArrivalDate(dateStr?: string): string {
  if (!dateStr || dateStr === 'ALL') return 'All Dates';
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(dateStr);
  const [, year, month, day] = match;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  const monthIdx = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
  return `${parseInt(day, 10)} ${monthNames[monthIdx]} ${year}`;
}

/**
 * Builds canonical Excel or ZIP base filename following:
 * e.g. ICN_Airport_10_Nov_2027_Arrival_Students
 */
export function buildSimExportBaseName(params: {
  airportFilter?: string;
  arrivalDateFilter?: string;
  customGroupName?: string;
}): string {
  if (params.customGroupName?.trim()) {
    return sanitizeUnicodeSafeFilename(params.customGroupName.trim()).replace(/\s+/g, '_');
  }
  const airportPart =
    params.airportFilter && params.airportFilter !== 'ALL'
      ? `${extractAirportCode(params.airportFilter)}_Airport`
      : 'All_Airports';
  const datePart =
    params.arrivalDateFilter && params.arrivalDateFilter !== 'ALL'
      ? `${formatArrivalDateForFilename(params.arrivalDateFilter)}_Arrival`
      : `${new Date().toISOString().slice(0, 10)}_Arrival`;
  return `${airportPart}_${datePart}_Students`;
}

export function buildExportBatchFilePrefix(params: {
  airport?: string;
  arrivalDate?: string;
  customGroupTitle?: string;
}): string {
  return buildSimExportBaseName({
    airportFilter: params.airport,
    arrivalDateFilter: params.arrivalDate,
    customGroupName: params.customGroupTitle
  });
}

/**
 * Preserves Unicode letters/marks (Bangla, Korean, English, numbers) while stripping unsafe OS path characters.
 */
export function sanitizeUnicodeSafeFilename(raw: string, fallback = 'Student'): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 80) || fallback;
}

function resolveFileExtension(url?: string, fileName?: string, mimeType?: string): string {
  const lowerName = String(fileName || '').toLowerCase();
  if (lowerName.endsWith('.pdf')) return '.pdf';
  if (lowerName.endsWith('.png')) return '.png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return '.jpg';
  if (lowerName.endsWith('.webp')) return '.webp';

  const lowerMime = String(mimeType || '').toLowerCase();
  if (lowerMime.includes('pdf')) return '.pdf';
  if (lowerMime.includes('png')) return '.png';
  if (lowerMime.includes('webp')) return '.webp';
  if (lowerMime.includes('jpeg') || lowerMime.includes('jpg')) return '.jpg';

  const cleanUrl = String(url || '');
  if (cleanUrl.startsWith('data:application/pdf')) return '.pdf';
  if (cleanUrl.startsWith('data:image/png')) return '.png';
  if (cleanUrl.startsWith('data:image/webp')) return '.webp';
  if (cleanUrl.startsWith('data:image/jpeg') || cleanUrl.startsWith('data:image/jpg')) return '.jpg';
  if (cleanUrl.toLowerCase().includes('.pdf')) return '.pdf';
  if (cleanUrl.toLowerCase().includes('.png')) return '.png';
  return '.pdf';
}

// ============================================================================
// DOCUMENT BINARY RETRIEVAL (DataURL / Firebase Storage / Server Endpoint)
// ============================================================================

function decodeDataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } | null {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const header = dataUrl.slice(0, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/^data:([^;]+)/i);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  try {
    if (header.includes(';base64')) {
      const binaryString = atob(body.replace(/\s/g, ''));
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return { bytes, mimeType };
    } else {
      const decoded = decodeURIComponent(body);
      return { bytes: new TextEncoder().encode(decoded), mimeType };
    }
  } catch {
    return null;
  }
}

export async function retrieveOriginalStudentDocumentBytes(params: {
  url?: string;
  fileName?: string;
  mimeType?: string;
  studentSafeName: string;
  docLabel: 'Passport' | 'Airticket';
  authHeaders?: Record<string, string>;
}): Promise<SimDocumentFetchResult> {
  const { url, fileName, mimeType, studentSafeName, docLabel, authHeaders } = params;
  const ext = resolveFileExtension(url, fileName, mimeType);
  const targetFileName = `${studentSafeName}_${docLabel}${ext}`;

  const cleanUrl = String(url || '').trim();
  if (!cleanUrl || cleanUrl === '#' || cleanUrl === 'missing') {
    return {
      included: false,
      fileName: '',
      errorNote: `${docLabel} document not uploaded`
    };
  }

  // 1. Direct Data URL (base64 or URL-encoded)
  if (cleanUrl.startsWith('data:')) {
    const decoded = decodeDataUrlToBytes(cleanUrl);
    if (!decoded || decoded.bytes.byteLength === 0) {
      return {
        included: false,
        fileName: '',
        errorNote: `${docLabel} Data URL is corrupted or empty`
      };
    }
    return {
      included: true,
      fileName: targetFileName,
      bytes: decoded.bytes,
      mimeType: decoded.mimeType
    };
  }

  // 2. Server-protected reference -> request from authorized admin endpoint
  if (cleanUrl.startsWith('server-protected://')) {
    try {
      const res = await fetch(
        `/api/admin/sim-applications/document-bytes?ref=${encodeURIComponent(cleanUrl)}`,
        {
          headers: authHeaders || {}
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.dataUrl && String(data.dataUrl).startsWith('data:')) {
          const decoded = decodeDataUrlToBytes(String(data.dataUrl));
          if (decoded && decoded.bytes.byteLength > 0) {
            return {
              included: true,
              fileName: targetFileName,
              bytes: decoded.bytes,
              mimeType: decoded.mimeType
            };
          }
        }
      }
      return {
        included: false,
        fileName: '',
        errorNote: `${docLabel} protected storage file could not be retrieved`
      };
    } catch {
      return {
        included: false,
        fileName: '',
        errorNote: `${docLabel} server storage fetch failed`
      };
    }
  }

  // 3. HTTP / HTTPS (Firebase Storage URL) or Blob URL
  try {
    const response = await fetch(cleanUrl);
    if (!response.ok) {
      return {
        included: false,
        fileName: '',
        errorNote: `${docLabel} download returned HTTP ${response.status}`
      };
    }
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.byteLength === 0) {
      return {
        included: false,
        fileName: '',
        errorNote: `${docLabel} file is 0 bytes`
      };
    }
    return {
      included: true,
      fileName: targetFileName,
      bytes,
      mimeType: response.headers.get('content-type') || mimeType || 'application/octet-stream'
    };
  } catch (err: any) {
    return {
      included: false,
      fileName: '',
      errorNote: `${docLabel} retrieval failed (${err?.message || 'network error'})`
    };
  }
}

// ============================================================================
// PURE TYPESCRIPT ZIP ARCHIVE BUILDER (PKZIP 2.0 + UTF-8 Flag 0x0800)
// Supports Bangla, Korean, English & Binary Files without External Dependencies
// ============================================================================

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntryInput {
  path: string; // e.g., "ICN_Airport_10_Nov_2027_Arrival_Students/001_Hasan_Md_Jahid/Hasan_Passport.pdf"
  data: Uint8Array;
}

export function buildStandardZipArchive(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const localFileHeaders: Uint8Array[] = [];
  const centralDirectoryHeaders: Uint8Array[] = [];
  let currentOffset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const dataBytes = entry.data;
    const fileCrc = crc32(dataBytes);
    const size = dataBytes.byteLength;

    // Local File Header (30 bytes + filename + file data)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true); // Version needed to extract (2.0)
    localView.setUint16(6, 0x0800, true); // General purpose bit flag: Bit 11 = UTF-8 filename
    localView.setUint16(8, 0, true); // Compression method: 0 (STORE - preserves exact binary)
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, fileCrc, true);
    localView.setUint32(18, size, true); // Compressed size
    localView.setUint32(22, size, true); // Uncompressed size
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    localFileHeaders.push(localHeader);
    localFileHeaders.push(dataBytes);

    // Central Directory File Header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true); // Central directory signature
    centralView.setUint16(4, 20, true); // Version made by
    centralView.setUint16(6, 20, true); // Version needed
    centralView.setUint16(8, 0x0800, true); // UTF-8 bit flag
    centralView.setUint16(10, 0, true); // STORE method
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, fileCrc, true);
    centralView.setUint32(20, size, true);
    centralView.setUint32(24, size, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true); // Extra field length
    centralView.setUint16(32, 0, true); // Comment length
    centralView.setUint16(34, 0, true); // Disk number
    centralView.setUint16(36, 0, true); // Internal file attributes
    centralView.setUint32(38, 0, true); // External file attributes
    centralView.setUint32(42, currentOffset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralDirectoryHeaders.push(centralHeader);
    currentOffset += localHeader.byteLength + dataBytes.byteLength;
  }

  let centralDirectorySize = 0;
  for (const cd of centralDirectoryHeaders) {
    centralDirectorySize += cd.byteLength;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk where central directory starts
  eocdView.setUint16(8, entries.length, true); // Total entries on this disk
  eocdView.setUint16(10, entries.length, true); // Total entries in central directory
  eocdView.setUint32(12, centralDirectorySize, true); // Size of central directory
  eocdView.setUint32(16, currentOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  const totalSize = currentOffset + centralDirectorySize + eocd.byteLength;
  const output = new Uint8Array(totalSize);
  let ptr = 0;
  for (const chunk of localFileHeaders) {
    output.set(chunk, ptr);
    ptr += chunk.byteLength;
  }
  for (const cd of centralDirectoryHeaders) {
    output.set(cd, ptr);
    ptr += cd.byteLength;
  }
  output.set(eocd, ptr);
  return output;
}

export function triggerBrowserDownload(
  bytesOrResult: Uint8Array | { bytes: Uint8Array },
  fileName: string,
  mimeType: string
): void {
  const bytes = bytesOrResult instanceof Uint8Array ? bytesOrResult : bytesOrResult.bytes;
  const safeBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([safeBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const triggerBrowserBinaryDownload = triggerBrowserDownload;

// ============================================================================
// PART 2.3: PROFESSIONAL SIM EXCEL (.XLSX) GENERATOR WITH SUMMARY SHEET
// ============================================================================

export function generateSimApplicationsExcelBytes(params: {
  applications?: SimApplicationRecord[];
  students?: SimApplicationRecord[];
  airportFilter?: string;
  selectedAirportLabel?: string;
  arrivalDateFilter?: string;
  selectedArrivalDateLabel?: string;
  exportTitle?: string;
  exportedBy?: string;
}): Uint8Array & { bytes: Uint8Array; fileName: string; completeCount: number; missingCount: number } {
  const applications = params.applications || params.students || [];
  const airportFilter = params.airportFilter || params.selectedAirportLabel || 'ALL';
  const arrivalDateFilter = params.arrivalDateFilter || params.selectedArrivalDateLabel || 'ALL';
  const exportedBy = params.exportedBy || 'EveryKR Admin';

  const exportDateIso = new Date().toISOString();
  let completeCount = 0;
  let missingCount = 0;

  const studentRows = applications.map((app, idx) => {
    const passportStatus = getDocumentPresenceStatus(app.passportDocumentURL, app.passportFileName);
    const airticketStatus = getDocumentPresenceStatus(
      app.flightTicketDocumentURL,
      app.flightTicketFileName
    );
    if (passportStatus === 'Uploaded' && airticketStatus === 'Uploaded') {
      completeCount++;
    } else {
      missingCount++;
    }

    return {
      'Serial Number': idx + 1,
      'Application ID': app.applicationId,
      'Student Name': app.fullName,
      University: app.universityName,
      Country: deriveStudentCountryFromSimRecord(app),
      'WhatsApp Number': app.whatsappNumber,
      'Arrival Date': app.arrivalDate,
      'Arrival Time': app.arrivalTime,
      'Airport Name': app.arrivalAirport,
      'Airport Code': extractAirportCode(app.arrivalAirport),
      'Flight Number': app.flightNumber,
      'Passport Document Status': passportStatus,
      'Airticket Document Status': airticketStatus,
      'Application Status': app.applicationStatus,
      'Submission Date': app.submissionTimestamp ? app.submissionTimestamp.slice(0, 10) : ''
    };
  });

  const summaryRows = [
    { Metric: 'Export Title', Value: 'EveryKR SIM Applications & Student Arrival Roster' },
    { Metric: 'Total Selected Students', Value: applications.length },
    {
      Metric: 'Airport Filter',
      Value: airportFilter === 'ALL' ? 'All Airports (ICN, PUS, GMP, CJU)' : airportFilter
    },
    {
      Metric: 'Arrival Date Filter',
      Value: arrivalDateFilter && arrivalDateFilter !== 'ALL' ? arrivalDateFilter : 'All Dates'
    },
    { Metric: 'Export Date (UTC)', Value: exportDateIso },
    { Metric: 'Exported By', Value: exportedBy },
    { Metric: 'Complete Document Submissions (Passport + Airticket)', Value: completeCount },
    { Metric: 'Missing Documents Count', Value: missingCount }
  ];

  const wb = XLSX.utils.book_new();

  const wsStudents = XLSX.utils.json_to_sheet(
    studentRows.length > 0
      ? studentRows
      : [
          {
            'Serial Number': 1,
            'Application ID': 'NONE',
            'Student Name': 'No records selected',
            University: '',
            Country: '',
            'WhatsApp Number': '',
            'Arrival Date': '',
            'Arrival Time': '',
            'Airport Name': '',
            'Airport Code': '',
            'Flight Number': '',
            'Passport Document Status': '',
            'Airticket Document Status': '',
            'Application Status': '',
            'Submission Date': ''
          }
        ]
  );

  // Set readable column widths
  wsStudents['!cols'] = [
    { wch: 14 }, // Serial Number
    { wch: 18 }, // Application ID
    { wch: 26 }, // Student Name
    { wch: 30 }, // University
    { wch: 16 }, // Country
    { wch: 20 }, // WhatsApp Number
    { wch: 15 }, // Arrival Date
    { wch: 13 }, // Arrival Time
    { wch: 34 }, // Airport Name
    { wch: 14 }, // Airport Code
    { wch: 15 }, // Flight Number
    { wch: 24 }, // Passport Document Status
    { wch: 24 }, // Airticket Document Status
    { wch: 18 }, // Application Status
    { wch: 16 } // Submission Date
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 48 }, { wch: 42 }];

  XLSX.utils.book_append_sheet(wb, wsStudents, 'Arrival_Students');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Export_Summary');

  const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const baseName = buildSimExportBaseName({ airportFilter, arrivalDateFilter });
  const rawBytes = new Uint8Array(arrayBuffer);
  return Object.assign(rawBytes, {
    bytes: rawBytes,
    fileName: `${baseName}.xlsx`,
    completeCount,
    missingCount
  });
}

// ============================================================================
// PART 2.4: INDIVIDUAL STUDENT DOCUMENT ZIP
// Example: "Hasan Md Jahid — Passport & Airticket.zip"
// ============================================================================

export async function generateSingleStudentDocumentZip(
  app: SimApplicationRecord,
  authHeaders?: Record<string, string>
): Promise<{
  ok: boolean;
  fileName: string;
  zipFileName: string;
  zipBytes: Uint8Array;
  passportIncluded: boolean;
  airticketIncluded: boolean;
  notes: string[];
  warnings: string[];
}> {
  const safeStudentName = sanitizeUnicodeSafeFilename(app.fullName, 'Student');
  const [passportRes, ticketRes] = await Promise.all([
    retrieveOriginalStudentDocumentBytes({
      url: app.passportDocumentURL,
      fileName: app.passportFileName,
      mimeType: app.passportMimeType,
      studentSafeName: safeStudentName,
      docLabel: 'Passport',
      authHeaders
    }),
    retrieveOriginalStudentDocumentBytes({
      url: app.flightTicketDocumentURL,
      fileName: app.flightTicketFileName,
      mimeType: app.flightTicketMimeType,
      studentSafeName: safeStudentName,
      docLabel: 'Airticket',
      authHeaders
    })
  ]);

  const entries: ZipEntryInput[] = [];
  const notes: string[] = [];

  if (passportRes.included && passportRes.bytes) {
    entries.push({
      path: `${safeStudentName}/${passportRes.fileName}`,
      data: passportRes.bytes
    });
  } else if (passportRes.errorNote) {
    notes.push(passportRes.errorNote);
  }

  if (ticketRes.included && ticketRes.bytes) {
    entries.push({
      path: `${safeStudentName}/${ticketRes.fileName}`,
      data: ticketRes.bytes
    });
  } else if (ticketRes.errorNote) {
    notes.push(ticketRes.errorNote);
  }

  const manifestCsv = [
    'Student Name,Application ID,Airport,Arrival Date,Arrival Time,Passport Included,Airticket Included,Notes',
    `"${app.fullName.replace(/"/g, '""')}","${app.applicationId}","${app.arrivalAirport}","${app.arrivalDate}","${app.arrivalTime}","${passportRes.included ? 'Yes' : 'No'}","${ticketRes.included ? 'Yes' : 'No'}","${notes.join('; ').replace(/"/g, '""')}"`
  ].join('\n');

  entries.push({
    path: `${safeStudentName}/EXPORT_MANIFEST.csv`,
    data: new TextEncoder().encode(manifestCsv)
  });

  const zipBytes = buildStandardZipArchive(entries);
  const cleanDisplayTitle = String(app.fullName || 'Student').replace(/[<>:"/\\|?*]/g, '').trim();

  const zipFileName = `${cleanDisplayTitle} — Passport & Airticket.zip`;
  return {
    ok: passportRes.included || ticketRes.included,
    fileName: zipFileName,
    zipFileName,
    zipBytes,
    passportIncluded: passportRes.included,
    airticketIncluded: ticketRes.included,
    notes,
    warnings: notes
  };
}

// ============================================================================
// PART 2.5, 2.6, 2.7: BULK STUDENT ZIP GENERATOR WITH SEPARATE STUDENT FOLDERS
// + EMBEDDED EXPORT_MANIFEST.xlsx AND EXPORT_MANIFEST.csv
// ============================================================================

export async function generateBulkStudentsDocumentZip(params: {
  applications?: SimApplicationRecord[];
  students?: SimApplicationRecord[];
  airportFilter?: string;
  airport?: string;
  arrivalDateFilter?: string;
  arrivalDate?: string;
  customGroupName?: string;
  customGroupTitle?: string;
  authHeaders?: Record<string, string>;
  onProgress?:
    | ((progress: BulkZipExportProgress) => void)
    | ((current: number, total: number, studentName: string) => void);
}): Promise<BulkZipExportOutcome> {
  const applications = params.applications || params.students || [];
  const airportFilter = params.airportFilter || params.airport || 'ALL';
  const arrivalDateFilter = params.arrivalDateFilter || params.arrivalDate || 'ALL';
  const customGroupName = params.customGroupName || params.customGroupTitle;
  const authHeaders = params.authHeaders;
  const rawProgress = params.onProgress;

  const notifyProgress = (progress: BulkZipExportProgress) => {
    if (!rawProgress) return;
    if (rawProgress.length >= 2) {
      (rawProgress as (current: number, total: number, studentName: string) => void)(
        progress.processedStudents,
        progress.totalStudents,
        progress.currentStudentName || ''
      );
    } else {
      (rawProgress as (progress: BulkZipExportProgress) => void)(progress);
    }
  };

  const rootFolderName = buildSimExportBaseName({
    airportFilter,
    arrivalDateFilter,
    customGroupName
  });

  const totalStudents = applications.length;
  const entries: ZipEntryInput[] = [];
  const manifestRows: StudentZipManifestRow[] = [];
  const usedFolderNames = new Set<string>();
  const warnings: string[] = [];

  let completeCount = 0;
  let partialCount = 0;
  let failedCount = 0;

  notifyProgress({
    phase: 'preparing',
    processedStudents: 0,
    totalStudents,
    percentage: 5
  });

  for (let i = 0; i < totalStudents; i++) {
    const app = applications[i];
    const serialNumber = i + 1;
    const serialPrefix = String(serialNumber).padStart(3, '0');
    const safeName = sanitizeUnicodeSafeFilename(app.fullName, `Student_${serialPrefix}`);

    // Prevent duplicate folder names even if two students have the exact same name
    let studentFolder = `${serialPrefix}_${safeName}`;
    if (usedFolderNames.has(studentFolder)) {
      studentFolder = `${serialPrefix}_${safeName}_${app.applicationId}`;
    }
    usedFolderNames.add(studentFolder);

    notifyProgress({
      phase: 'fetching_documents',
      processedStudents: i + 1,
      totalStudents,
      currentStudentName: app.fullName,
      percentage: Math.min(85, Math.round(10 + ((i + 1) / Math.max(1, totalStudents)) * 75))
    });

    const [passportRes, ticketRes] = await Promise.all([
      retrieveOriginalStudentDocumentBytes({
        url: app.passportDocumentURL,
        fileName: app.passportFileName,
        mimeType: app.passportMimeType,
        studentSafeName: safeName,
        docLabel: 'Passport',
        authHeaders
      }),
      retrieveOriginalStudentDocumentBytes({
        url: app.flightTicketDocumentURL,
        fileName: app.flightTicketFileName,
        mimeType: app.flightTicketMimeType,
        studentSafeName: safeName,
        docLabel: 'Airticket',
        authHeaders
      })
    ]);

    if (passportRes.included && passportRes.bytes) {
      entries.push({
        path: `${rootFolderName}/${studentFolder}/${passportRes.fileName}`,
        data: passportRes.bytes
      });
    }

    if (ticketRes.included && ticketRes.bytes) {
      entries.push({
        path: `${rootFolderName}/${studentFolder}/${ticketRes.fileName}`,
        data: ticketRes.bytes
      });
    }

    const rowNotes: string[] = [];
    if (!passportRes.included && passportRes.errorNote) rowNotes.push(passportRes.errorNote);
    if (!ticketRes.included && ticketRes.errorNote) rowNotes.push(ticketRes.errorNote);

    let exportResult: StudentZipManifestRow['exportResult'];
    if (passportRes.included && ticketRes.included) {
      exportResult = 'Complete (Both Documents)';
      completeCount++;
    } else if (passportRes.included || ticketRes.included) {
      exportResult = 'Partial (Missing Document)';
      partialCount++;
    } else {
      exportResult = 'Failed / No Documents';
      failedCount++;
    }

    if (rowNotes.length > 0) {
      warnings.push(`${app.fullName}: ${rowNotes.join(', ')}`);
    }

    manifestRows.push({
      serialNumber,
      studentName: app.fullName,
      applicationId: app.applicationId,
      universityName: app.universityName,
      country: deriveStudentCountryFromSimRecord(app),
      whatsappNumber: app.whatsappNumber,
      airportName: app.arrivalAirport,
      airportCode: extractAirportCode(app.arrivalAirport),
      arrivalDate: app.arrivalDate,
      arrivalTime: app.arrivalTime,
      flightNumber: app.flightNumber,
      folderName: studentFolder,
      passportIncluded: passportRes.included ? 'Yes' : 'No',
      passportFileName: passportRes.fileName || 'MISSING',
      airticketIncluded: ticketRes.included ? 'Yes' : 'No',
      airticketFileName: ticketRes.fileName || 'MISSING',
      exportResult,
      errorOrMissingNote: rowNotes.length > 0 ? rowNotes.join(' | ') : 'All documents verified & included'
    });
  }

  notifyProgress({
    phase: 'building_manifest',
    processedStudents: totalStudents,
    totalStudents,
    percentage: 90
  });

  // Build EXPORT_MANIFEST.xlsx and EXPORT_MANIFEST.csv inside the ZIP root
  const manifestSheetRows = manifestRows.map((r) => ({
    'Serial No': r.serialNumber,
    'Student Folder': r.folderName,
    'Student Name': r.studentName,
    'Application ID': r.applicationId,
    University: r.universityName,
    Country: r.country,
    'WhatsApp Number': r.whatsappNumber,
    Airport: r.airportName,
    'Airport Code': r.airportCode,
    'Arrival Date': r.arrivalDate,
    'Arrival Time': r.arrivalTime,
    'Flight Number': r.flightNumber,
    'Passport Included': r.passportIncluded,
    'Passport File': r.passportFileName,
    'Airticket Included': r.airticketIncluded,
    'Airticket File': r.airticketFileName,
    'Export Result': r.exportResult,
    'Error or Missing Document Note': r.errorOrMissingNote
  }));

  const manifestWb = XLSX.utils.book_new();
  const manifestWs = XLSX.utils.json_to_sheet(manifestSheetRows);
  manifestWs['!cols'] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 24 },
    { wch: 18 },
    { wch: 28 },
    { wch: 15 },
    { wch: 18 },
    { wch: 32 },
    { wch: 13 },
    { wch: 14 },
    { wch: 13 },
    { wch: 14 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 28 },
    { wch: 26 },
    { wch: 38 }
  ];
  XLSX.utils.book_append_sheet(manifestWb, manifestWs, 'EXPORT_MANIFEST');

  const manifestXlsxBuffer = XLSX.write(manifestWb, {
    type: 'array',
    bookType: 'xlsx'
  }) as ArrayBuffer;
  const manifestCsvString = XLSX.utils.sheet_to_csv(manifestWs);

  entries.push({
    path: `${rootFolderName}/EXPORT_MANIFEST.xlsx`,
    data: new Uint8Array(manifestXlsxBuffer)
  });
  entries.push({
    path: `${rootFolderName}/EXPORT_MANIFEST.csv`,
    data: new TextEncoder().encode('\uFEFF' + manifestCsvString)
  });

  notifyProgress({
    phase: 'packaging_zip',
    processedStudents: totalStudents,
    totalStudents,
    percentage: 96
  });

  const zipBytes = buildStandardZipArchive(entries);

  notifyProgress({
    phase: 'completed',
    processedStudents: totalStudents,
    totalStudents,
    percentage: 100
  });

  const zipFileName = `${rootFolderName}.zip`;
  return {
    ok: totalStudents > 0 && (completeCount > 0 || partialCount > 0),
    fileName: zipFileName,
    zipFileName,
    zipBytes,
    totalStudents,
    completeCount,
    completeStudentsCount: completeCount,
    partialCount,
    missingDocumentsCount: partialCount + failedCount,
    failedCount,
    failedDownloadsCount: failedCount,
    warnings,
    manifestRows
  };
}
