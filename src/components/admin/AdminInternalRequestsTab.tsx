import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  Shield,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Globe,
  AlertCircle,
  MessageSquare,
  Check,
  X,
  Lock,
  Unlock,
  BadgeCheck
} from 'lucide-react';
import {
  InternalAccessRequestRecord,
  StaffRoleType,
  StaffPermissionKey
} from '../../types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  fetchAdminInternalAccessRequestsClient,
  submitAdminInternalRequestDecisionClient
} from '../../services/firebaseService';

export const EVERYKR_INTERNAL_DEPARTMENTS = [
  'Executive & Platform Governance',
  'University Admissions & Counseling',
  'Document Verification & Compliance',
  'SIM & Airport Arrival Operations',
  'Student Support & Contact Desk',
  'Community & Marketplace Moderation',
  'Academic Content & Korean Academy',
  'Housing & Partner Relations',
  'Flight & Travel Operations'
];

export const ASSIGNABLE_INTERNAL_ROLES: StaffRoleType[] = [
  'Employee',
  'Admission Manager',
  'Student Counselor',
  'Document Verification Staff',
  'SIM Manager',
  'Community Moderator',
  'Support Staff',
  'Content Manager',
  'Admin',
  'Super Admin'
];

const ALL_PERMISSION_LABELS: { key: StaffPermissionKey; label: string }[] = [
  { key: 'manage_students', label: 'Student Management' },
  { key: 'view_passport_numbers', label: 'View Passport Numbers' },
  { key: 'manage_applications', label: 'Application Management' },
  { key: 'verify_documents', label: 'Document Verification' },
  { key: 'manage_universities', label: 'Admissions & Universities' },
  { key: 'manage_programs', label: 'Academic Programs' },
  { key: 'manage_sim_applications', label: 'SIM Applications' },
  { key: 'manage_arrival_groups', label: 'Airport Arrival Groups' },
  { key: 'manage_community', label: 'Community Moderation' },
  { key: 'manage_staff', label: 'Employee & Role Management' },
  { key: 'manage_cms', label: 'CMS & Content' },
  { key: 'export_reports', label: 'Reports & Analytics Export' },
  { key: 'manage_settings', label: 'Platform Settings' },
  { key: 'view_audit_logs', label: 'Audit Trail Access' }
];

interface AdminInternalRequestsTabProps {
  adminUid: string;
  adminName: string;
  adminEmail: string;
  onToast: (msg: string) => void;
}

export const AdminInternalRequestsTab: React.FC<AdminInternalRequestsTabProps> = ({
  adminUid,
  adminName,
  adminEmail,
  onToast
}) => {
  const [requests, setRequests] = useState<InternalAccessRequestRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modal state for reviewing / approving / rejecting a request
  const [selectedRequest, setSelectedRequest] = useState<InternalAccessRequestRecord | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState<string>('');
  const [assignedRole, setAssignedRole] = useState<StaffRoleType>('Employee');
  const [employeeIdInput, setEmployeeIdInput] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<StaffPermissionKey[]>([]);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [infoRequestMessage, setInfoRequestMessage] = useState<string>('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAdminInternalAccessRequestsClient({
        id: adminUid,
        uid: adminUid,
        fullName: adminName,
        name: adminName,
        email: adminEmail
      });
      setRequests(list);
    } finally {
      setLoading(false);
    }
  }, [adminUid, adminName, adminEmail]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openReviewModal = (req: InternalAccessRequestRecord) => {
    setSelectedRequest(req);
    const dept = req.assignedDepartment || req.department || EVERYKR_INTERNAL_DEPARTMENTS[1];
    const role: StaffRoleType =
      req.assignedRole || req.requestedPosition || 'Employee';
    const perms =
      Array.isArray(req.permissions) && req.permissions.length > 0
        ? req.permissions
        : DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.Employee;

    setAssignedDepartment(dept);
    setAssignedRole(role);
    setEmployeeIdInput(req.employeeId || '');
    setSelectedPermissions(perms);
    setRejectionReason(req.rejectionReason || '');
    setInfoRequestMessage(req.infoRequestMessage || '');
  };

  const handleRoleChangeInModal = (nextRole: StaffRoleType) => {
    setAssignedRole(nextRole);
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[nextRole] || []);
  };

  const togglePermission = (perm: StaffPermissionKey) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleDecision = async (
    decision: 'approve' | 'reject' | 'info_requested' | 'deactivate' | 'reactivate',
    targetReq?: InternalAccessRequestRecord
  ) => {
    const req = targetReq || selectedRequest;
    if (!req) return;

    setIsSubmittingDecision(true);
    try {
      const res = await submitAdminInternalRequestDecisionClient({
        requestId: req.id,
        decision,
        assignedDepartment: assignedDepartment || req.department,
        assignedRole: assignedRole || req.requestedPosition,
        employeeId: employeeIdInput || req.employeeId,
        permissions: selectedPermissions,
        rejectionReason: rejectionReason.trim() || undefined,
        infoRequestMessage: infoRequestMessage.trim() || undefined,
        adminUser: {
          id: adminUid,
          uid: adminUid,
          fullName: adminName,
          name: adminName,
          email: adminEmail
        }
      });

      if (res.ok) {
        onToast(
          res.emailDispatched
            ? `${res.message} Official email notification sent to ${req.email}.`
            : res.message
        );
        await loadRequests();
        if (selectedRequest && selectedRequest.id === req.id && res.requestRecord) {
          setSelectedRequest(res.requestRecord);
        }
      } else {
        onToast(res.message || 'Unable to process decision.');
      }
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (statusFilter !== 'all' && r.approvalStatus !== statusFilter) return false;
      if (
        departmentFilter !== 'all' &&
        (r.assignedDepartment || r.department) !== departmentFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phoneNumber.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          (r.requestedPosition || '').toLowerCase().includes(q) ||
          (r.employeeId || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [requests, statusFilter, departmentFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.approvalStatus === 'pending').length,
      approved: requests.filter(r => r.approvalStatus === 'approved' && r.isActive).length,
      rejected: requests.filter(r => r.approvalStatus === 'rejected').length,
      infoRequested: requests.filter(r => r.approvalStatus === 'info_requested').length,
      deactivated: requests.filter(
        r => r.approvalStatus === 'deactivated' || (r.approvalStatus === 'approved' && !r.isActive)
      ).length
    };
  }, [requests]);

  const renderStatusBadge = (req: InternalAccessRequestRecord) => {
    if (req.approvalStatus === 'approved' && req.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          Approved &amp; Active
        </span>
      );
    }
    if (req.approvalStatus === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
          <Clock className="w-3 h-3" />
          Pending Approval
        </span>
      );
    }
    if (req.approvalStatus === 'info_requested') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
          <MessageSquare className="w-3 h-3" />
          Info Requested
        </span>
      );
    }
    if (req.approvalStatus === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        <Lock className="w-3 h-3" />
        Deactivated
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Strip */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#1769AA] dark:text-[#19B6A4]">
              <Shield className="w-4 h-4" />
              <span>Internal Portal Governance · internal.everykr.com</span>
            </div>
            <h2 className="text-xl font-black text-[#10243A] dark:text-white mt-1">
              Internal Employee Access Requests &amp; Role Approval Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Review employee registrations submitted via{' '}
              <code className="font-mono text-[#1769AA] dark:text-[#19B6A4]">
                internal.everykr.com/register
              </code>
              . Assign departments and roles, trigger automated approval emails via Resend, or revoke internal portal access immediately.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/internal/register"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-[#10243A] dark:text-slate-200 hover:bg-slate-200 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#19B6A4]" />
              <span>Preview Internal Registration</span>
            </a>
            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#10243A] hover:bg-[#1769AA] text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Total Applications
            </div>
            <div className="text-xl font-black font-mono text-[#10243A] dark:text-white mt-0.5">
              {counts.total}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
              Pending Approval
            </div>
            <div className="text-xl font-black font-mono text-amber-800 dark:text-amber-200 mt-0.5">
              {counts.pending}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              Approved &amp; Active
            </div>
            <div className="text-xl font-black font-mono text-emerald-800 dark:text-emerald-200 mt-0.5">
              {counts.approved}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
              Rejected
            </div>
            <div className="text-xl font-black font-mono text-rose-800 dark:text-rose-200 mt-0.5">
              {counts.rejected}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Deactivated / Info Req
            </div>
            <div className="text-xl font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5">
              {counts.deactivated + counts.infoRequested}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by applicant name, email, phone, employee ID, department, or position..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[#10243A] dark:text-white focus:border-[#1769AA] outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[#10243A] dark:text-white"
          >
            <option value="all">All Statuses ({requests.length})</option>
            <option value="pending">Pending Approval ({counts.pending})</option>
            <option value="approved">Approved ({counts.approved})</option>
            <option value="info_requested">Info Requested ({counts.infoRequested})</option>
            <option value="rejected">Rejected ({counts.rejected})</option>
            <option value="deactivated">Deactivated ({counts.deactivated})</option>
          </select>

          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[#10243A] dark:text-white"
          >
            <option value="all">All Departments</option>
            {EVERYKR_INTERNAL_DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Applicant Name &amp; ID</th>
                <th className="py-3.5 px-4">Email &amp; Contact</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Requested / Assigned Role</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4">Approval Status</th>
                <th className="py-3.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No internal employee access requests match the current filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#10243A] dark:bg-[#1769AA] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {req.fullName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-[#10243A] dark:text-white">
                            {req.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {req.employeeId || 'ID Pending'} · {req.country}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {req.email}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Tel: {req.phoneNumber} · WA: {req.whatsappNumber}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#10243A] dark:text-slate-200">
                        {req.assignedDepartment || req.department}
                      </div>
                      {req.assignedDepartment && req.assignedDepartment !== req.department && (
                        <div className="text-[10px] text-slate-400">
                          Requested: {req.department}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#1769AA]/10 text-[#1769AA] dark:bg-[#19B6A4]/15 dark:text-[#19B6A4]">
                        <Briefcase className="w-3 h-3" />
                        {req.assignedRole || req.requestedPosition}
                      </span>
                      {req.assignedRole && req.assignedRole !== req.requestedPosition && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Requested: {req.requestedPosition}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    <td className="py-3.5 px-4">
                      {renderStatusBadge(req)}
                      {req.approvedBy && req.approvalStatus === 'approved' && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          By {req.approvedBy}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openReviewModal(req)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#10243A] dark:text-white cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review / Role</span>
                        </button>

                        {req.approvalStatus === 'pending' ||
                        req.approvalStatus === 'info_requested' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openReviewModal(req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecision('reject', req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : req.approvalStatus === 'approved' && req.isActive ? (
                          <button
                            type="button"
                            onClick={() => handleDecision('deactivate', req)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openReviewModal(req)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#1769AA] hover:bg-[#10243A] text-white cursor-pointer transition-colors"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Reactivate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review, Role Assignment & Approval Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-[#10243A] text-white px-6 py-4 flex items-center justify-between border-b border-white/10">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#19B6A4]">
                  Internal Employee Access Review
                </div>
                <h3 className="text-base font-black mt-0.5">
                  {selectedRequest.fullName} ({selectedRequest.email})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
              {/* Applicant Submitted Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Full Name
                  </span>
                  <span className="font-extrabold text-[#10243A] dark:text-white">
                    {selectedRequest.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Email Address
                  </span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                    {selectedRequest.email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Phone / WhatsApp
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {selectedRequest.phoneNumber} / WA: {selectedRequest.whatsappNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Country
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {selectedRequest.country}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Requested Department
                  </span>
                  <span className="font-bold text-[#1769AA] dark:text-[#19B6A4]">
                    {selectedRequest.department}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Requested Position
                  </span>
                  <span className="font-bold text-[#10243A] dark:text-white">
                    {selectedRequest.requestedPosition}
                  </span>
                </div>
                {selectedRequest.additionalInfo && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Applicant Experience &amp; Notes
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {selectedRequest.additionalInfo}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Role & Department Assignment */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#10243A] dark:text-white flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
                  <span>Assign Official Department, Role &amp; Portal Permissions</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Assigned Department
                    </label>
                    <select
                      value={assignedDepartment}
                      onChange={e => setAssignedDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#10243A] dark:text-white font-semibold"
                    >
                      {EVERYKR_INTERNAL_DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Assigned Internal Role
                    </label>
                    <select
                      value={assignedRole}
                      onChange={e => handleRoleChangeInModal(e.target.value as StaffRoleType)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#10243A] dark:text-white font-bold"
                    >
                      {ASSIGNABLE_INTERNAL_ROLES.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Official Employee ID
                    </label>
                    <input
                      type="text"
                      value={employeeIdInput}
                      onChange={e => setEmployeeIdInput(e.target.value)}
                      placeholder="e.g. EKR-EMP-205"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#10243A] dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Module Permissions Matrix */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">
                    Authorized Internal Portal Modules ({selectedPermissions.length} selected)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_PERMISSION_LABELS.map(item => {
                      const checked = selectedPermissions.includes(item.key);
                      return (
                        <label
                          key={item.key}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            checked
                              ? 'bg-[#1769AA]/10 border-[#1769AA] text-[#10243A] dark:bg-[#19B6A4]/15 dark:border-[#19B6A4] dark:text-white font-bold'
                              : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(item.key)}
                            className="rounded text-[#1769AA]"
                          />
                          <span className="text-[11px] leading-tight">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Request Additional Info / Internal Rejection Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Request Additional Information (Visible to Applicant)
                    </label>
                    <input
                      type="text"
                      value={infoRequestMessage}
                      onChange={e => setInfoRequestMessage(e.target.value)}
                      placeholder="e.g. Please confirm your supervisor name..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#10243A] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Internal Audit Note (Never sent in rejection email)
                    </label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Internal compliance note..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#10243A] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmittingDecision}
                    onClick={() => handleDecision('approve')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Approve &amp; Send Official Email</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingDecision}
                    onClick={() => handleDecision('info_requested')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request Info</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingDecision}
                    onClick={() => handleDecision('reject')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Reject Application</span>
                  </button>

                  {selectedRequest.approvalStatus === 'approved' && selectedRequest.isActive && (
                    <button
                      type="button"
                      disabled={isSubmittingDecision}
                      onClick={() => handleDecision('deactivate')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Deactivate Access</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
