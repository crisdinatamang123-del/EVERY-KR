import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  StudentDocumentRecord,
  StudentDocumentVerificationStatus,
  StudentDocumentCategory
} from '../../types';
import {
  fetchAdminStudentDocuments,
  adminVerifyStudentDocumentDoc
} from '../../services/firebaseService';

const DOC_CATEGORIES: StudentDocumentCategory[] = [
  'Passport',
  'Academic Certificates',
  'Academic Transcripts',
  'English Proficiency Certificate',
  'TOPIK Certificate',
  'Other Supporting Documents'
];

export const AdminDocumentsTab: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const [documents, setDocuments] = useState<StudentDocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [reviewModalDoc, setReviewModalDoc] = useState<StudentDocumentRecord | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const list = await fetchAdminStudentDocuments();
      setDocuments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter(d => {
      if (filterCategory !== 'ALL' && d.category !== filterCategory) return false;
      if (filterStatus !== 'ALL' && d.verificationStatus !== filterStatus) return false;
      if (!q) return true;
      return (
        (d.studentName || '').toLowerCase().includes(q) ||
        (d.studentEmail || '').toLowerCase().includes(q) ||
        (d.fileName || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      );
    });
  }, [documents, searchQuery, filterCategory, filterStatus]);

  const handleVerifyDecision = async (
    docItem: StudentDocumentRecord,
    status: StudentDocumentVerificationStatus,
    notesOverride?: string
  ) => {
    if (!currentUser) return;
    setSavingId(docItem.documentId);
    try {
      const updated = await adminVerifyStudentDocumentDoc({
        documentId: docItem.documentId,
        verificationStatus: status,
        verificationNotes: notesOverride ?? verificationNotes,
        adminUid: currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Admin',
        adminEmail: currentUser.email,
        documentSnapshot: docItem
      });

      setDocuments(prev =>
        prev.map(d => (d.documentId === updated.documentId ? updated : d))
      );
      if (reviewModalDoc?.documentId === updated.documentId) {
        setReviewModalDoc(updated);
      }
      showToast(`Document "${docItem.category}" marked as "${status}"`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update document verification.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[#10243A] dark:text-white">
              Student Document Verification Center ({filteredDocuments.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Preview PDF, JPG, and PNG student documents, download authorized copies, verify authenticity, or request replacement files with notes.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDocuments}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search student name, email, file name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">All Document Categories</option>
            {DOC_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Verified">Verified</option>
            <option value="Replacement Requested">Replacement Requested</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
            No student documents match the current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Category &amp; File</th>
                  <th className="p-4">Uploaded At</th>
                  <th className="p-4">Verified At</th>
                  <th className="p-4">Verification Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocuments.map(docItem => (
                  <tr
                    key={docItem.documentId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {docItem.studentName}
                      </div>
                      <div className="text-[11px] text-slate-500">{docItem.studentEmail}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#10243A] dark:text-white">
                        {docItem.category}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {docItem.fileName}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 tabular-nums">
                      {new Date(docItem.uploadedAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 tabular-nums">
                      {docItem.verifiedAt
                        ? new Date(docItem.verifiedAt).toLocaleString()
                        : 'Pending'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${
                          docItem.verificationStatus === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : docItem.verificationStatus === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            : docItem.verificationStatus === 'Replacement Requested'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {docItem.verificationStatus === 'Verified' && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {docItem.verificationStatus === 'Pending Verification' && (
                          <Clock className="w-3 h-3" />
                        )}
                        {(docItem.verificationStatus === 'Rejected' ||
                          docItem.verificationStatus === 'Replacement Requested') && (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {docItem.verificationStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewModalDoc(docItem);
                            setVerificationNotes(docItem.verificationNotes || '');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#10243A] hover:bg-[#1769AA] text-white text-xs font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview &amp; Verify
                        </button>
                        <a
                          href={docItem.fileUrl || docItem.downloadUrl}
                          download={docItem.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Download document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Preview & Verification Modal */}
      {reviewModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden shadow-2xl my-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {reviewModalDoc.category} — {reviewModalDoc.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  File: {reviewModalDoc.fileName} • Uploaded:{' '}
                  {new Date(reviewModalDoc.uploadedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setReviewModalDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-8 bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center min-h-[380px] max-h-[65vh] overflow-auto">
                {reviewModalDoc.mimeType.includes('pdf') ? (
                  <iframe
                    src={reviewModalDoc.fileUrl || reviewModalDoc.downloadUrl}
                    title={reviewModalDoc.fileName}
                    className="w-full h-[55vh] rounded-lg border-0"
                  />
                ) : (
                  <img
                    src={reviewModalDoc.fileUrl || reviewModalDoc.downloadUrl}
                    alt={reviewModalDoc.fileName}
                    className="max-h-[55vh] w-auto object-contain rounded-lg"
                  />
                )}
              </div>

              <div className="lg:col-span-4 p-5 space-y-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800">
                <div className="text-xs space-y-1">
                  <span className="text-slate-400 block">Current Status</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {reviewModalDoc.verificationStatus}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Verification Notes (Visible to Student)
                  </label>
                  <textarea
                    rows={4}
                    value={verificationNotes}
                    onChange={e => setVerificationNotes(e.target.value)}
                    placeholder="Add verification confirmation or explain why a clearer replacement document is needed..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={savingId === reviewModalDoc.documentId}
                    onClick={() => handleVerifyDecision(reviewModalDoc, 'Verified')}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Verify Document
                  </button>

                  <button
                    type="button"
                    disabled={savingId === reviewModalDoc.documentId}
                    onClick={() =>
                      handleVerifyDecision(reviewModalDoc, 'Replacement Requested')
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Request Replacement
                  </button>

                  <button
                    type="button"
                    disabled={savingId === reviewModalDoc.documentId}
                    onClick={() => handleVerifyDecision(reviewModalDoc, 'Rejected')}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Document
                  </button>

                  <a
                    href={reviewModalDoc.fileUrl || reviewModalDoc.downloadUrl}
                    download={reviewModalDoc.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Authorized Copy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
