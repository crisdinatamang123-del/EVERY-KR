import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  isFirebaseConfigured,
  appendAuditLogToFirestore,
  createAdminPlatformNotificationDoc,
  getCurrentIdToken,
} from './firebaseService';
import type {
  ContactInboxAnalytics,
  ContactInquiryCategory,
  ContactInternalNote,
  ContactReplyRecord,
  ContactSubmissionRecord,
  ContactSubmissionStatus,
} from '../types';

const CONTACT_SUBMISSIONS_COLLECTION = 'contact_submissions';
const LOCAL_CONTACT_SUBMISSIONS_KEY = 'everykr_contact_submissions_v1';
const SEEN_ADMIN_CONTACT_NOTIFS_KEY = 'everykr_seen_contact_notif_ids_v1';

function stripUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

export function normalizeContactSubmissionRecord(
  raw: Record<string, any>,
  fallbackId?: string
): ContactSubmissionRecord {
  const nowIso = new Date().toISOString();
  const id = String(raw.id || raw.submissionId || fallbackId || `csub_${Date.now()}`);
  const statusRaw = String(raw.status || 'New');
  const validStatuses: ContactSubmissionStatus[] = [
    'New',
    'Read',
    'In Progress',
    'Resolved',
    'Closed',
  ];
  const status: ContactSubmissionStatus = validStatuses.includes(
    statusRaw as ContactSubmissionStatus
  )
    ? (statusRaw as ContactSubmissionStatus)
    : 'New';

  const submittedAt = String(raw.submittedAt || raw.createdAt || nowIso);
  const fullName = String(raw.fullName || raw.name || 'Visitor').trim();
  const userId =
    typeof raw.userId === 'string' && raw.userId.trim().length > 0
      ? raw.userId.trim()
      : null;

  return {
    id,
    submissionId: String(raw.submissionId || id),
    ticketId: String(raw.ticketId || `EKR-SUP-${id.slice(-6).toUpperCase()}`),
    fullName,
    name: fullName,
    email: String(raw.email || '').trim().toLowerCase(),
    category: String(raw.category || 'General Inquiry').trim(),
    subject: String(raw.subject || 'General Inquiry').trim(),
    message: String(raw.message || '').trim(),
    userId,
    isAuthenticatedUser: Boolean(raw.isAuthenticatedUser ?? userId),
    userRole: raw.userRole ? String(raw.userRole) : undefined,
    userUniversity: raw.userUniversity ? String(raw.userUniversity) : undefined,
    userNationality: raw.userNationality ? String(raw.userNationality) : undefined,
    userEmailVerified: Boolean(raw.userEmailVerified),
    userLanguage: String(raw.userLanguage || 'en'),
    status,
    unread: raw.unread !== undefined ? Boolean(raw.unread) : status === 'New',
    archived: Boolean(raw.archived),
    archivedAt: raw.archivedAt ? String(raw.archivedAt) : null,
    archivedBy: raw.archivedBy ? String(raw.archivedBy) : null,
    assignedStaffId: raw.assignedStaffId ? String(raw.assignedStaffId) : null,
    assignedStaffName: raw.assignedStaffName ? String(raw.assignedStaffName) : null,
    assignedStaffEmail: raw.assignedStaffEmail ? String(raw.assignedStaffEmail) : null,
    internalNotes: Array.isArray(raw.internalNotes)
      ? raw.internalNotes.map((n: any, idx: number) => ({
          id: String(n?.id || `note_${idx}`),
          note: String(n?.note || ''),
          authorUid: String(n?.authorUid || 'admin'),
          authorName: String(n?.authorName || 'Administrator'),
          authorEmail: String(n?.authorEmail || ''),
          createdAt: String(n?.createdAt || submittedAt),
        }))
      : [],
    replies: Array.isArray(raw.replies)
      ? raw.replies.map((r: any, idx: number) => ({
          id: String(r?.id || `reply_${idx}`),
          subject: String(r?.subject || ''),
          message: String(r?.message || ''),
          senderUid: String(r?.senderUid || 'admin'),
          senderName: String(r?.senderName || 'EveryKR Support Team'),
          senderEmail: String(r?.senderEmail || 'support@everykr.com'),
          recipientEmail: String(r?.recipientEmail || raw.email || ''),
          recipientName: r?.recipientName ? String(r.recipientName) : fullName,
          replyTo: String(r?.replyTo || 'support@everykr.com'),
          sentAt: String(r?.sentAt || submittedAt),
          deliveryStatus:
            r?.deliveryStatus === 'sent' ||
            r?.deliveryStatus === 'accepted' ||
            r?.deliveryStatus === 'failed'
              ? r.deliveryStatus
              : 'sent',
          provider: r?.provider ? String(r.provider) : undefined,
          messageId: r?.messageId ? String(r.messageId) : undefined,
          errorReason: r?.errorReason ? String(r.errorReason) : undefined,
        }))
      : [],
    lastRepliedAt: raw.lastRepliedAt ? String(raw.lastRepliedAt) : null,
    lastRepliedBy: raw.lastRepliedBy ? String(raw.lastRepliedBy) : null,
    readAt: raw.readAt ? String(raw.readAt) : null,
    readBy: raw.readBy ? String(raw.readBy) : null,
    submittedAt,
    createdAt: String(raw.createdAt || submittedAt),
    updatedAt: String(raw.updatedAt || submittedAt),
  };
}

function readLocalContactSubmissions(): ContactSubmissionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_CONTACT_SUBMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeContactSubmissionRecord(item));
  } catch {
    return [];
  }
}

function writeLocalContactSubmissions(records: ContactSubmissionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LOCAL_CONTACT_SUBMISSIONS_KEY,
      JSON.stringify(records.slice(0, 500))
    );
  } catch {
    // ignore storage quota errors
  }
}

function upsertLocalContactSubmission(record: ContactSubmissionRecord): void {
  const existing = readLocalContactSubmissions();
  const map = new Map<string, ContactSubmissionRecord>();
  for (const item of existing) {
    map.set(item.submissionId, item);
  }
  map.set(record.submissionId, record);
  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  writeLocalContactSubmissions(merged);
}

export function hasSeenContactInquiryNotification(submissionId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(SEEN_ADMIN_CONTACT_NOTIFS_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return Array.isArray(list) && list.includes(submissionId);
  } catch {
    return false;
  }
}

export function markContactInquiryNotificationSeen(submissionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(SEEN_ADMIN_CONTACT_NOTIFS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const safeList = Array.isArray(list) ? list : [];
    if (!safeList.includes(submissionId)) {
      safeList.unshift(submissionId);
      window.localStorage.setItem(
        SEEN_ADMIN_CONTACT_NOTIFS_KEY,
        JSON.stringify(safeList.slice(0, 400))
      );
    }
  } catch {
    // ignore
  }
}

/**
 * Submits a visitor or signed-in student Contact Us inquiry:
 * 1. Validates & verifies via `/api/contact/submit` (reCAPTCHA + rate-limit + optional admin alert email).
 * 2. Saves the full record to Firestore `contact_submissions/{submissionId}` (supports both guest & logged-in users).
 * 3. Triggers an Admin Portal notification record if permitted.
 */
export async function submitContactInquiryToFirestore(params: {
  fullName: string;
  email: string;
  category: ContactInquiryCategory;
  subject: string;
  message: string;
  honeypot?: string;
  recaptchaToken: string | null;
  userLanguage: string;
  currentUser?: {
    uid?: string;
    name?: string;
    email?: string;
    role?: string;
    university?: string;
    nationality?: string;
    emailVerified?: boolean;
  } | null;
}): Promise<{
  ok: boolean;
  submission: ContactSubmissionRecord;
  ticketId: string;
  message: string;
}> {
  const cleanName = String(params.fullName || '').trim();
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  const cleanCategory = String(params.category || 'General Inquiry').trim();
  const cleanSubject =
    String(params.subject || '').trim() || `${cleanCategory} Inquiry`;
  const cleanMessage = String(params.message || '').trim();
  const cleanLanguage = String(params.userLanguage || 'en').trim() || 'en';
  const resolvedUid =
    params.currentUser?.uid || auth.currentUser?.uid || null;

  const submissionId = `csub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Verify submission through server gate (/api/contact/submit)
  const response = await fetch('/api/contact/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId,
      name: cleanName,
      fullName: cleanName,
      email: cleanEmail,
      category: cleanCategory,
      subject: cleanSubject,
      message: cleanMessage,
      userId: resolvedUid,
      userRole: params.currentUser?.role,
      userUniversity: params.currentUser?.university,
      userNationality: params.currentUser?.nationality,
      userEmailVerified: Boolean(
        params.currentUser?.emailVerified ?? auth.currentUser?.emailVerified
      ),
      userLanguage: cleanLanguage,
      honeypot: params.honeypot || '',
      recaptchaToken: params.recaptchaToken,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.message ||
        'Unable to submit your inquiry right now. Please check your details and try again.'
    );
  }

  const nowIso = new Date().toISOString();
  const ticketId = String(
    data.ticketId || `EKR-SUP-${Date.now().toString(36).toUpperCase()}`
  );

  const record: ContactSubmissionRecord = normalizeContactSubmissionRecord({
    ...(data.submission || {}),
    id: submissionId,
    submissionId,
    ticketId,
    fullName: cleanName,
    name: cleanName,
    email: cleanEmail,
    category: cleanCategory,
    subject: cleanSubject,
    message: cleanMessage,
    userId: resolvedUid,
    isAuthenticatedUser: Boolean(resolvedUid),
    userRole: params.currentUser?.role || (resolvedUid ? 'student' : 'guest'),
    userUniversity: params.currentUser?.university || '',
    userNationality: params.currentUser?.nationality || '',
    userEmailVerified: Boolean(
      params.currentUser?.emailVerified ?? auth.currentUser?.emailVerified
    ),
    userLanguage: cleanLanguage,
    status: 'New',
    unread: true,
    archived: false,
    archivedAt: null,
    archivedBy: null,
    assignedStaffId: null,
    assignedStaffName: null,
    assignedStaffEmail: null,
    internalNotes: [],
    replies: [],
    lastRepliedAt: null,
    lastRepliedBy: null,
    readAt: null,
    readBy: null,
    submittedAt: data.submission?.submittedAt || nowIso,
    createdAt: data.submission?.createdAt || nowIso,
    updatedAt: nowIso,
  });

  // 2. Persist to Firestore `contact_submissions/{submissionId}`
  if (isFirebaseConfigured) {
    const path = `${CONTACT_SUBMISSIONS_COLLECTION}/${submissionId}`;
    try {
      await setDoc(
        doc(db, CONTACT_SUBMISSIONS_COLLECTION, submissionId),
        stripUndefinedFields(record)
      );
    } catch (err) {
      // Log structured error diagnostic via handleFirestoreError while preserving server submission
      try {
        handleFirestoreError(err, OperationType.CREATE, path);
      } catch (diagErr) {
        console.warn(
          '[EveryKR Contact] Firestore write diagnostic (server copy preserved):',
          diagErr
        );
      }
    }
  }

  upsertLocalContactSubmission(record);

  // 3. Create Admin Notification if authenticated user is present
  if (auth.currentUser) {
    createAdminPlatformNotificationDoc({
      type: 'new_contact_inquiry',
      title: `New Contact Inquiry (${ticketId})`,
      message: `${cleanName} (${cleanEmail}) submitted a "${cleanCategory}" inquiry: ${cleanSubject}`,
      relatedRecordId: submissionId,
      studentId: resolvedUid || 'guest',
      studentName: cleanName,
    }).catch(() => {});
  }

  return {
    ok: true,
    submission: record,
    ticketId,
    message:
      data.message ||
      'Your inquiry has been submitted and connected to the EveryKR Support Desk.',
  };
}

/**
 * Fetches all Contact Submissions from Firestore and merges any server-cached or local submissions.
 */
export async function fetchContactSubmissions(
  adminHeaders?: Record<string, string>
): Promise<ContactSubmissionRecord[]> {
  const merged = new Map<string, ContactSubmissionRecord>();

  // 1. Seed with local storage cache
  for (const item of readLocalContactSubmissions()) {
    merged.set(item.submissionId, item);
  }

  // 2. Fetch server-side cached submissions (if admin headers are available)
  try {
    const token = await getCurrentIdToken();
    const headers: Record<string, string> = {
      ...(adminHeaders || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch('/api/contact/admin/submissions', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.submissions)) {
        for (const raw of data.submissions) {
          const normalized = normalizeContactSubmissionRecord(raw);
          merged.set(normalized.submissionId, normalized);
        }
      }
    }
  } catch {
    // non-fatal
  }

  // 3. Fetch authoritative Firestore `contact_submissions` collection
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, CONTACT_SUBMISSIONS_COLLECTION));
      const firestoreIds = new Set<string>();
      snap.docs.forEach((docSnap) => {
        const normalized = normalizeContactSubmissionRecord(
          docSnap.data(),
          docSnap.id
        );
        firestoreIds.add(normalized.submissionId);
        merged.set(normalized.submissionId, normalized);
      });

      // Sync any server-only submissions into Firestore when an admin loads the inbox
      if (auth.currentUser) {
        for (const [subId, record] of merged.entries()) {
          if (!firestoreIds.has(subId)) {
            setDoc(
              doc(db, CONTACT_SUBMISSIONS_COLLECTION, subId),
              stripUndefinedFields(record)
            ).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('[EveryKR Contact Inbox] Firestore fetch warning:', err);
    }
  }

  const sorted = Array.from(merged.values()).sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  writeLocalContactSubmissions(sorted);
  return sorted;
}

/**
 * Real-time listener for `contact_submissions` in Firestore.
 * Automatically notifies the Admin Portal when a new inquiry arrives and updates unread badges.
 */
export function subscribeToContactSubmissions(callbacks: {
  onUpdate: (submissions: ContactSubmissionRecord[]) => void;
  onNewSubmission?: (submission: ContactSubmissionRecord) => void;
  onError?: (err: unknown) => void;
}): Unsubscribe {
  if (!isFirebaseConfigured) {
    const local = readLocalContactSubmissions();
    callbacks.onUpdate(local);
    return () => {};
  }

  let initialSnapshotHandled = false;
  const colRef = collection(db, CONTACT_SUBMISSIONS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const records: ContactSubmissionRecord[] = [];
      snapshot.docs.forEach((docSnap) => {
        records.push(
          normalizeContactSubmissionRecord(docSnap.data(), docSnap.id)
        );
      });

      // Merge any local/server items not yet in snapshot
      const byId = new Map<string, ContactSubmissionRecord>();
      for (const localItem of readLocalContactSubmissions()) {
        byId.set(localItem.submissionId, localItem);
      }
      for (const fsItem of records) {
        byId.set(fsItem.submissionId, fsItem);
      }

      const sorted = Array.from(byId.values()).sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      writeLocalContactSubmissions(sorted);
      callbacks.onUpdate(sorted);

      if (initialSnapshotHandled && callbacks.onNewSubmission) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const addedRecord = normalizeContactSubmissionRecord(
              change.doc.data(),
              change.doc.id
            );
            if (!hasSeenContactInquiryNotification(addedRecord.submissionId)) {
              markContactInquiryNotificationSeen(addedRecord.submissionId);
              callbacks.onNewSubmission?.(addedRecord);
            }
          }
        });
      } else {
        // Mark existing records as seen on initial load to avoid duplicate startup popups
        records.forEach((r) => markContactInquiryNotificationSeen(r.submissionId));
        initialSnapshotHandled = true;
      }
    },
    (error) => {
      console.warn('[EveryKR Contact Inbox] Real-time listener warning:', error);
      callbacks.onError?.(error);
    }
  );
}

/**
 * Automatically marks a 'New' or unread submission as 'Read' when opened by an administrator.
 */
export async function markContactSubmissionOpenedByAdmin(
  submission: ContactSubmissionRecord,
  adminActor: { uid: string; name: string; email: string }
): Promise<ContactSubmissionRecord> {
  if (!submission.unread && submission.status !== 'New') {
    return submission;
  }

  const nowIso = new Date().toISOString();
  const nextStatus: ContactSubmissionStatus =
    submission.status === 'New' ? 'Read' : submission.status;

  const updated: ContactSubmissionRecord = {
    ...submission,
    status: nextStatus,
    unread: false,
    readAt: submission.readAt || nowIso,
    readBy: submission.readBy || adminActor.name || adminActor.email,
    updatedAt: nowIso,
  };

  if (isFirebaseConfigured) {
    const path = `${CONTACT_SUBMISSIONS_COLLECTION}/${submission.submissionId}`;
    try {
      await updateDoc(
        doc(db, CONTACT_SUBMISSIONS_COLLECTION, submission.submissionId),
        {
          status: nextStatus,
          unread: false,
          readAt: updated.readAt,
          readBy: updated.readBy,
          updatedAt: nowIso,
        }
      );
    } catch (err) {
      try {
        await setDoc(
          doc(db, CONTACT_SUBMISSIONS_COLLECTION, submission.submissionId),
          stripUndefinedFields(updated),
          { merge: true }
        );
      } catch (innerErr) {
        try {
          handleFirestoreError(innerErr, OperationType.UPDATE, path);
        } catch {
          // non-fatal
        }
      }
    }
  }

  upsertLocalContactSubmission(updated);
  return updated;
}

/**
 * Updates the status of a Contact Inquiry ('New' | 'Read' | 'In Progress' | 'Resolved' | 'Closed').
 */
export async function updateContactSubmissionStatus(
  submission: ContactSubmissionRecord,
  newStatus: ContactSubmissionStatus,
  adminActor: { uid: string; name: string; email: string }
): Promise<ContactSubmissionRecord> {
  const nowIso = new Date().toISOString();
  const unread = newStatus === 'New';
  const updated: ContactSubmissionRecord = {
    ...submission,
    status: newStatus,
    unread,
    readAt: unread ? null : submission.readAt || nowIso,
    readBy: unread ? null : submission.readBy || adminActor.name || adminActor.email,
    updatedAt: nowIso,
  };

  if (isFirebaseConfigured) {
    const path = `${CONTACT_SUBMISSIONS_COLLECTION}/${submission.submissionId}`;
    try {
      await setDoc(
        doc(db, CONTACT_SUBMISSIONS_COLLECTION, submission.submissionId),
        stripUndefinedFields(updated),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  upsertLocalContactSubmission(updated);

  appendAuditLogToFirestore({
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'EDIT',
    targetEntity: 'Inquiry',
    targetId: submission.submissionId,
    targetName: `${submission.fullName} (${submission.ticketId})`,
    details: `Status changed from "${submission.status}" to "${newStatus}" for inquiry "${submission.subject}".`,
  }).catch(() => {});

  return updated;
}

/**
 * Assigns a Contact Inquiry to a staff member.
 */
export async function assignContactSubmissionStaff(
  submission: ContactSubmissionRecord,
  staff: { id: string | null; name: string | null; email?: string | null },
  adminActor: { uid: string; name: string; email: string }
): Promise<ContactSubmissionRecord> {
  const nowIso = new Date().toISOString();
  const updated: ContactSubmissionRecord = {
    ...submission,
    assignedStaffId: staff.id || null,
    assignedStaffName: staff.name || null,
    assignedStaffEmail: staff.email || null,
    updatedAt: nowIso,
  };

  if (isFirebaseConfigured) {
    const path = `${CONTACT_SUBMISSIONS_COLLECTION}/${submission.submissionId}`;
    try {
      await setDoc(
        doc(db, CONTACT_SUBMISSIONS_COLLECTION, submission.submissionId),
        stripUndefinedFields(updated),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  upsertLocalContactSubmission(updated);

  appendAuditLogToFirestore({
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'EDIT',
    targetEntity: 'Inquiry',
    targetId: submission.submissionId,
    targetName: `${submission.fullName} (${submission.ticketId})`,
    details: staff.name
      ? `Inquiry ${submission.ticketId} assigned to ${staff.name} (${staff.email || 'staff'}).`
      : `Staff assignment cleared for inquiry ${submission.ticketId}.`,
  }).catch(() => {});

  return updated;
}

/**
 * Adds an internal administrator note to a Contact Inquiry.
 */
export async function addContactSubmissionInternalNote(
  submission: ContactSubmissionRecord,
  noteText: string,
  adminActor: { uid: string; name: string; email: string }
): Promise<ContactSubmissionRecord> {
  const cleanNote = String(noteText || '').trim();
  if (!cleanNote) {
    throw new Error('Internal note cannot be empty.');
  }

  const nowIso = new Date().toISOString();
  const newNote: ContactInternalNote = {
    id: `cnote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    note: cleanNote,
    authorUid: adminActor.uid || 'admin',
    authorName: adminActor.name || 'Administrator',
    authorEmail: adminActor.email || 'admin@everykr.com',
    createdAt: nowIso,
  };

  const updated: ContactSubmissionRecord = {
    ...submission,
    internalNotes: [...(submission.internalNotes || []), newNote],
    updatedAt: nowIso,
  };

  if (isFirebaseConfigured) {
    const path = `${CONTACT_SUBMISSIONS_COLLECTION}/${submission.submissionId}`;
    try {
      await setDoc(
        doc(db, CONTACT_SUBMISSIONS_COLLECTION, submission.submissionId),
        stripUndefinedFields(updated),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  upsertLocalContactSubmission(updated);

  appendAuditLogToFirestore({
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'EDIT',
    targetEntity: 'Inquiry',
    targetId: submission.submissionId,
    targetName: `${submission.fullName} (${submission.ticketId})`,
    details: `Internal note added by ${adminActor.name}: "${cleanNote.slice(0, 120)}"`,
  }).catch(() => {});

  return updated;
}

/**
 * Archives or reopens a Contact Inquiry without ever deleting the record.
 */
export async function toggleArchiveContactSubmission(
  submission: ContactSubmissionRecord,
  archive: boolean,
  adminActor: { uid: string; name: string; email: string }
): Promise<ContactSubmissionRecord> {
  const nowIso = new Date().toISOString();
  const nextStatus: ContactSubmissionStatus =
    !archive && submission.status === 'Closed' ? 'In Progress' : submission.status;

  const updated: ContactSubmissionRecord = {
    ...submission,
    archived: archive,
    archivedAt: archive ? nowIso : null,
    archivedBy: archive ? adminActor.name || adminActor.email : null,
    status: nextStatus,
    unread: false,
    updatedAt: nowIso,
  };

  if (isFirebaseConfigured) {
    const path = `${CONTACT_SUBMISSIONS_COLLECTION}/${submission.submissionId}`;
    try {
      await setDoc(
        doc(db, CONTACT_SUBMISSIONS_COLLECTION, submission.submissionId),
        stripUndefinedFields(updated),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  upsertLocalContactSubmission(updated);

  appendAuditLogToFirestore({
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'EDIT',
    targetEntity: 'Inquiry',
    targetId: submission.submissionId,
    targetName: `${submission.fullName} (${submission.ticketId})`,
    details: archive
      ? `Inquiry ${submission.ticketId} moved to archive by ${adminActor.name}.`
      : `Inquiry ${submission.ticketId} restored to active inbox by ${adminActor.name}.`,
  }).catch(() => {});

  return updated;
}

/**
 * Sends a direct email reply to the visitor's submitted email address via `/api/contact/admin/reply`
 * and stores the outgoing reply in the inquiry's Firestore communication history (`replies`).
 */
export async function sendAdminContactReply(params: {
  submission: ContactSubmissionRecord;
  replySubject: string;
  replyMessage: string;
  nextStatus?: ContactSubmissionStatus;
  adminActor: { uid: string; name: string; email: string };
  adminHeaders?: Record<string, string>;
}): Promise<{
  ok: boolean;
  delivered: boolean;
  deliveryStatus: 'sent' | 'accepted' | 'failed';
  provider?: string;
  errorReason?: string;
  message: string;
  updatedSubmission: ContactSubmissionRecord;
  replyRecord: ContactReplyRecord;
}> {
  const { submission, replySubject, replyMessage, nextStatus, adminActor } = params;
  const cleanMessage = String(replyMessage || '').trim();
  if (cleanMessage.length < 2) {
    throw new Error('Please write a reply message before sending.');
  }

  const token = await getCurrentIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(params.adminHeaders || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch('/api/contact/admin/reply', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      submissionId: submission.submissionId,
      ticketId: submission.ticketId,
      recipientEmail: submission.email,
      recipientName: submission.fullName,
      category: submission.category,
      originalSubject: submission.subject,
      originalMessage: submission.message,
      replySubject:
        String(replySubject || '').trim() ||
        `Re: ${submission.subject} [${submission.ticketId}]`,
      replyMessage: cleanMessage,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    throw new Error(data?.message || 'Admin authorization required to send support replies.');
  }
  if (response.status === 400) {
    throw new Error(data?.message || 'Invalid reply parameters.');
  }

  const nowIso = new Date().toISOString();
  const replyRecord: ContactReplyRecord = data?.replyRecord
    ? {
        id: String(data.replyRecord.id || `creply_${Date.now()}`),
        subject: String(
          data.replyRecord.subject ||
            replySubject ||
            `Re: ${submission.subject} [${submission.ticketId}]`
        ),
        message: cleanMessage,
        senderUid: adminActor.uid || 'admin',
        senderName: adminActor.name || 'EveryKR Support Team',
        senderEmail: String(data.replyRecord.senderEmail || 'support@everykr.com'),
        recipientEmail: submission.email,
        recipientName: submission.fullName,
        replyTo: String(data.replyRecord.replyTo || 'support@everykr.com'),
        sentAt: String(data.replyRecord.sentAt || nowIso),
        deliveryStatus:
          data.deliveryStatus === 'sent' ||
          data.deliveryStatus === 'accepted' ||
          data.deliveryStatus === 'failed'
            ? data.deliveryStatus
            : data.delivered
            ? 'sent'
            : 'failed',
        provider: data.provider ? String(data.provider) : undefined,
        messageId: data.messageId ? String(data.messageId) : undefined,
        errorReason: data.errorReason ? String(data.errorReason) : undefined,
      }
    : {
        id: `creply_${Date.now()}`,
        subject:
          String(replySubject || '').trim() ||
          `Re: ${submission.subject} [${submission.ticketId}]`,
        message: cleanMessage,
        senderUid: adminActor.uid || 'admin',
        senderName: adminActor.name || 'EveryKR Support Team',
        senderEmail: 'support@everykr.com',
        recipientEmail: submission.email,
        recipientName: submission.fullName,
        replyTo: 'support@everykr.com',
        sentAt: nowIso,
        deliveryStatus: 'failed',
        errorReason: data?.message || 'Unable to reach email dispatch service.',
      };

  const resolvedNextStatus: ContactSubmissionStatus =
    nextStatus ||
    (submission.status === 'New' || submission.status === 'Read'
      ? 'In Progress'
      : submission.status);

  const updatedSubmission: ContactSubmissionRecord = {
    ...submission,
    status: resolvedNextStatus,
    unread: false,
    readAt: submission.readAt || nowIso,
    readBy: submission.readBy || adminActor.name || adminActor.email,
    replies: [...(submission.replies || []), replyRecord],
    lastRepliedAt: replyRecord.sentAt,
    lastRepliedBy: replyRecord.senderName,
    updatedAt: nowIso,
  };

  if (isFirebaseConfigured) {
    const path = `${CONTACT_SUBMISSIONS_COLLECTION}/${submission.submissionId}`;
    try {
      await setDoc(
        doc(db, CONTACT_SUBMISSIONS_COLLECTION, submission.submissionId),
        stripUndefinedFields(updatedSubmission),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  upsertLocalContactSubmission(updatedSubmission);

  appendAuditLogToFirestore({
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'EDIT',
    targetEntity: 'Inquiry',
    targetId: submission.submissionId,
    targetName: `${submission.fullName} <${submission.email}>`,
    details: `Reply subject: "${replyRecord.subject}" | Delivery: ${replyRecord.deliveryStatus.toUpperCase()}${
      replyRecord.errorReason ? ` (${replyRecord.errorReason})` : ''
    }`,
  }).catch(() => {});

  return {
    ok: Boolean(data?.ok),
    delivered: Boolean(data?.delivered),
    deliveryStatus: replyRecord.deliveryStatus,
    provider: replyRecord.provider,
    errorReason: replyRecord.errorReason,
    message:
      data?.message ||
      (replyRecord.deliveryStatus === 'sent'
        ? `Reply delivered to ${submission.email}.`
        : `Reply saved to inquiry thread, but email delivery failed: ${
            replyRecord.errorReason || 'Provider error'
          }`),
    updatedSubmission,
    replyRecord,
  };
}

/**
 * Computes genuine Contact Inbox analytics from actual Firestore/submission records.
 */
export function computeContactInboxAnalytics(
  submissions: ContactSubmissionRecord[]
): ContactInboxAnalytics {
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  let activeInquiries = 0;
  let archivedInquiries = 0;
  let newInquiries = 0;
  let unreadInquiries = 0;
  let readInquiries = 0;
  let inProgressInquiries = 0;
  let resolvedInquiries = 0;
  let closedInquiries = 0;
  let todaysInquiries = 0;
  const categoryBreakdown: Record<string, number> = {};

  for (const item of submissions) {
    if (item.archived) {
      archivedInquiries += 1;
    } else {
      activeInquiries += 1;
    }

    if (item.status === 'New') newInquiries += 1;
    if (item.unread || item.status === 'New') unreadInquiries += 1;
    if (item.status === 'Read') readInquiries += 1;
    if (item.status === 'In Progress') inProgressInquiries += 1;
    if (item.status === 'Resolved') resolvedInquiries += 1;
    if (item.status === 'Closed') closedInquiries += 1;

    const cat = String(item.category || 'General Inquiry').trim();
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

    const subDate = new Date(item.submittedAt);
    if (
      !Number.isNaN(subDate.getTime()) &&
      subDate.getFullYear() === todayYear &&
      subDate.getMonth() === todayMonth &&
      subDate.getDate() === todayDate
    ) {
      todaysInquiries += 1;
    }
  }

  return {
    totalInquiries: submissions.length,
    activeInquiries,
    archivedInquiries,
    newInquiries,
    unreadInquiries,
    readInquiries,
    inProgressInquiries,
    resolvedInquiries,
    closedInquiries,
    todaysInquiries,
    categoryBreakdown,
  };
}
