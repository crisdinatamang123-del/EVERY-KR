import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  StaffMemberRecord,
  StaffPermissionKey,
  StaffRoleType,
  UniversityApplicationRecord
} from '../../types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  fetchStaffMembersDoc,
  saveStaffMemberDoc,
  deleteStaffMemberDoc,
  fetchAdminUniversityApplications
} from '../../services/firebaseService';
import {
  Shield,
  UserPlus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  X,
  Lock,
  Briefcase,
  Activity,
  Users,
  AlertTriangle,
  History,
  Ban
} from 'lucide-react';

const STAFF_ROLES: StaffRoleType[] = [
  'Super Admin',
  'Admin',
  'Employee',
  'Admission Manager',
  'Student Counselor',
  'Document Verification Staff',
  'SIM Manager',
  'SIM Application Manager',
  'Content Manager',
  'Community Moderator',
  'Support Staff',
  'Regular User'
];

const ALL_PERMISSIONS: { key: StaffPermissionKey; label: string; description: string }[] = [
  {
    key: 'manage_students',
    label: 'Manage Students',
    description: 'View student profiles, add internal notes, and manage student accounts.'
  },
  {
    key: 'view_passport_numbers',
    label: 'View Passport Numbers (Restricted)',
    description: 'Authorized audited access to decrypt/reveal sensitive passport numbers.'
  },
  {
    key: 'manage_applications',
    label: 'Manage University Applications',
    description: 'Review applications, update admission status, and request documents.'
  },
  {
    key: 'verify_documents',
    label: 'Verify Student Documents',
    description: 'Preview uploaded PDFs/images and mark Verified, Rejected, or Replacement.'
  },
  {
    key: 'manage_universities',
    label: 'Manage Universities',
    description: 'Add, edit, publish, unpublish, or archive Korean university records.'
  },
  {
    key: 'manage_programs',
    label: 'Manage Programs',
    description: 'Manage degree & language programs, KRW tuition, and intakes.'
  },
  {
    key: 'manage_sim_applications',
    label: 'Manage SIM Applications',
    description: 'Coordinate student airport arrivals, WhatsApp outreach, and SIM status.'
  },
  {
    key: 'manage_arrival_groups',
    label: 'Manage SIM Arrival Groups & ZIP Exports',
    description: 'Create airport/date student arrival groups and export student-wise ZIP & Excel manifests.'
  },
  {
    key: 'manage_community',
    label: 'Moderate Community Posts, Likes & Comments',
    description: 'Pin/feature discussions, inspect genuine Likes, remove spam, and restrict abusive accounts.'
  },
  {
    key: 'manage_staff',
    label: 'Manage Staff & RBAC',
    description: 'Create staff accounts, assign roles, and update permission matrices.'
  },
  {
    key: 'manage_cms',
    label: 'Manage Homepage & Nested Services CMS',
    description: 'Control all 6 homepage categories, nested services, announcements, and 9-language translations.'
  },
  {
    key: 'export_reports',
    label: 'Export CSV, Excel & ZIP Reports',
    description: 'Download audited CSV, .xlsx, and student document ZIP archives.'
  },
  {
    key: 'manage_settings',
    label: 'System Settings',
    description: 'Modify global website, language, notification, and platform settings.'
  },
  {
    key: 'view_audit_logs',
    label: 'View Audit Logs',
    description: 'Inspect immutable administrative security and verification logs.'
  }
];

function getRoleBadgeStyle(role: StaffRoleType): string {
  switch (role) {
    case 'Super Admin':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
    case 'Admin':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    case 'Employee':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800';
    case 'Content Manager':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
    case 'SIM Manager':
    case 'SIM Application Manager':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'Admission Manager':
    case 'Student Counselor':
      return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
    case 'Document Verification Staff':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    case 'Community Moderator':
      return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
    case 'Support Staff':
    case 'Regular User':
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
  }
}

export const AdminStaffManagementTab: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const [staffList, setStaffList] = useState<StaffMemberRecord[]>([]);
  const [applications, setApplications] = useState<UniversityApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [editingStaff, setEditingStaff] = useState<StaffMemberRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingHistoryStaff, setViewingHistoryStaff] = useState<StaffMemberRecord | null>(null);
  const [staffToTrash, setStaffToTrash] = useState<StaffMemberRecord | null>(null);
  const [trashReason, setTrashReason] = useState<string>('Employee access ended / moved to Global Trash');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedStaff, fetchedApps] = await Promise.all([
        fetchStaffMembersDoc(),
        fetchAdminUniversityApplications()
      ]);
      setStaffList(fetchedStaff);
      setApplications(fetchedApps);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live assigned application counts per staff member
  const assignedCountByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of applications) {
      if (app.assignedStaffId) {
        map.set(app.assignedStaffId, (map.get(app.assignedStaffId) || 0) + 1);
      } else if (app.assignedStaffName) {
        const key = app.assignedStaffName.toLowerCase();
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return map;
  }, [applications]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffList.filter(member => {
      if (roleFilter !== 'ALL' && member.staffRole !== roleFilter) return false;
      const normStatus = String(member.status || 'active').toLowerCase();
      if (statusFilter !== 'ALL' && normStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        (member.fullName || member.name || '').toLowerCase().includes(q) ||
        (member.email || '').toLowerCase().includes(q) ||
        (member.department || '').toLowerCase().includes(q) ||
        (member.staffRole || '').toLowerCase().includes(q)
      );
    });
  }, [staffList, searchQuery, roleFilter, statusFilter]);

  const openCreateModal = () => {
    const nowIso = new Date().toISOString();
    setEditingStaff({
      id: '',
      uid: '',
      fullName: '',
      email: '',
      staffRole: 'Admission Manager',
      permissions: [...DEFAULT_ROLE_PERMISSIONS['Admission Manager']],
      status: 'active',
      department: 'Admissions & International Relations',
      assignedApplicationsCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastActiveAt: nowIso
    });
    setIsModalOpen(true);
  };

  const openEditModal = (member: StaffMemberRecord) => {
    setEditingStaff({
      ...member,
      permissions:
        member.permissions && member.permissions.length > 0
          ? [...member.permissions]
          : [...(DEFAULT_ROLE_PERMISSIONS[member.staffRole] || [])]
    });
    setIsModalOpen(true);
  };

  const handleRolePresetChange = (nextRole: StaffRoleType) => {
    if (!editingStaff) return;
    setEditingStaff({
      ...editingStaff,
      staffRole: nextRole,
      permissions: [...(DEFAULT_ROLE_PERMISSIONS[nextRole] || [])]
    });
  };

  const togglePermission = (perm: StaffPermissionKey) => {
    if (!editingStaff) return;
    const exists = editingStaff.permissions.includes(perm);
    const nextPermissions = exists
      ? editingStaff.permissions.filter(p => p !== perm)
      : [...editingStaff.permissions, perm];
    setEditingStaff({
      ...editingStaff,
      permissions: nextPermissions
    });
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !currentUser) return;
    if (!editingStaff.fullName.trim() || !editingStaff.email.trim()) {
      showToast('Please enter both staff member full name and email address.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveStaffMemberDoc({
        staff: editingStaff,
        adminUid: currentUser.uid || currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Super Admin',
        adminEmail: currentUser.email
      });
      setStaffList(prev => {
        const exists = prev.some(s => s.id === saved.id);
        return exists ? prev.map(s => (s.id === saved.id ? saved : s)) : [saved, ...prev];
      });
      showToast(`Saved staff account for ${saved.fullName} (${saved.staffRole})`);
      setIsModalOpen(false);
      setEditingStaff(null);
    } catch (err: any) {
      showToast(err?.message || 'Unable to save staff member.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActiveStatus = async (member: StaffMemberRecord) => {
    if (!currentUser) return;
    try {
      const isCurrentlyActive = String(member.status || 'active').toLowerCase() === 'active';
      const nextStatus = isCurrentlyActive ? 'inactive' : 'active';
      const saved = await saveStaffMemberDoc({
        staff: {
          ...member,
          status: nextStatus
        },
        adminUid: currentUser.uid || currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Super Admin',
        adminEmail: currentUser.email
      });
      setStaffList(prev => prev.map(s => (s.id === saved.id ? saved : s)));
      showToast(
        nextStatus === 'active'
          ? `Activated staff account for ${member.fullName}`
          : `Deactivated staff account for ${member.fullName}`
      );
    } catch (err: any) {
      showToast(err?.message || 'Unable to change staff status.');
    }
  };

  const handleRevokeStaffAccess = async (member: StaffMemberRecord) => {
    if (!currentUser) return;
    try {
      const saved = await saveStaffMemberDoc({
        staff: {
          ...member,
          staffRole: 'Regular User',
          permissions: [],
          status: 'revoked'
        },
        adminUid: currentUser.uid || currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Super Admin',
        adminEmail: currentUser.email
      });
      setStaffList(prev => prev.map(s => (s.id === saved.id ? saved : s)));
      showToast(`Revoked all administrative privileges for ${member.fullName}`);
    } catch (err: any) {
      showToast(err?.message || 'Unable to revoke staff access.');
    }
  };

  const handleConfirmMoveToTrash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !staffToTrash) return;
    try {
      await deleteStaffMemberDoc({
        staffId: staffToTrash.id,
        staffEmail: staffToTrash.email,
        staffRecord: staffToTrash,
        deletionReason: trashReason.trim() || 'Moved to Global Trash by Administrator',
        permanent: false,
        adminUid: currentUser.uid || currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Super Admin',
        adminEmail: currentUser.email
      });
      setStaffList(prev => prev.filter(s => s.id !== staffToTrash.id));
      showToast(`Moved "${staffToTrash.fullName}" to Global Trash & revoked active permissions.`);
      setStaffToTrash(null);
    } catch (err: any) {
      showToast(err?.message || 'Unable to move staff account to Global Trash.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Role Summary Cards */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1769AA] dark:text-[#19B6A4]">
              <Shield className="w-4 h-4" />
              <span>Role-Based Access Control (RBAC)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#10243A] dark:text-white mt-1">
              User &amp; Staff Management ({staffList.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create and manage administrative staff accounts, assign roles, control restricted permissions (such as passport decryption), and monitor assigned applications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#10243A] hover:bg-[#1769AA] text-white dark:bg-[#19B6A4] dark:text-[#050B18] transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff Account</span>
            </button>
          </div>
        </div>

        {/* Role Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => setRoleFilter('ALL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              roleFilter === 'ALL'
                ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#050B18]'
                : 'bg-slate-50 dark:bg-[#0B1523] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-80">All Staff</div>
            <div className="text-lg font-black font-mono mt-0.5">{staffList.length}</div>
          </button>

          {STAFF_ROLES.map(role => {
            const count = staffList.filter(s => s.staffRole === role).length;
            const active = roleFilter === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#050B18]'
                    : 'bg-slate-50 dark:bg-[#0B1523] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="text-[11px] font-semibold opacity-80 truncate" title={role}>
                  {role}
                </div>
                <div className="text-lg font-black font-mono mt-0.5">{count}</div>
              </button>
            );
          })}
        </div>

        {/* Search & Status Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, email, role, or department..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-xs text-[#10243A] dark:text-white focus:outline-none focus:border-[#1769AA]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by Staff Status"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-xs text-[#10243A] dark:text-white focus:outline-none focus:border-[#1769AA]"
          >
            <option value="ALL">All Statuses (Active &amp; Inactive)</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive / Deactivated</option>
          </select>
        </div>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {filteredStaff.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-[#10243A] dark:text-white">
              No Staff Accounts Match Current Filters
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add a staff member or clear search filters to manage EveryKR team roles.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Staff Member &amp; Department</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Granted Permissions</th>
                  <th className="p-4">Workload &amp; Activity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStaff.map(member => {
                  const isActive = String(member.status || 'active').toLowerCase() === 'active';
                  const liveAssigned =
                    assignedCountByStaff.get(member.id) ||
                    assignedCountByStaff.get((member.fullName || '').toLowerCase()) ||
                    member.assignedApplicationsCount ||
                    0;
                  const hasPassportPerm = member.permissions?.includes('view_passport_numbers');

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 align-top">
                        <div className="font-bold text-sm text-[#10243A] dark:text-white">
                          {member.fullName || member.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {member.email}
                        </div>
                        {member.department && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                            <Briefcase className="w-3 h-3 text-[#1769AA] dark:text-[#19B6A4]" />
                            <span>{member.department}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 align-top space-y-1">
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${getRoleBadgeStyle(
                            member.staffRole
                          )}`}
                        >
                          {member.staffRole}
                        </span>
                        {member.requiresAdminRevalidation && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Restored — Revalidation Required</span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 align-top">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(member.permissions || []).slice(0, 4).map(perm => (
                            <span
                              key={perm}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]"
                            >
                              {perm}
                            </span>
                          ))}
                          {(member.permissions || []).length > 4 && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1769AA] dark:text-blue-300 font-bold text-[10px]">
                              +{(member.permissions || []).length - 4} more
                            </span>
                          )}
                          {(member.permissions || []).length === 0 && (
                            <span className="text-[10px] text-slate-400 italic">
                              No elevated permissions
                            </span>
                          )}
                        </div>
                        {hasPassportPerm && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-1.5">
                            <Lock className="w-3 h-3" />
                            <span>Passport Vault Clearance</span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 align-top space-y-1">
                        <div className="font-semibold text-[#10243A] dark:text-slate-200">
                          Assigned Cases: <strong className="font-mono">{liveAssigned}</strong>
                        </div>
                        <div className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <Activity className="w-3 h-3" />
                          <span>
                            Updated:{' '}
                            {member.updatedAt
                              ? new Date(member.updatedAt).toLocaleDateString()
                              : 'Active'}
                            {member.version ? ` • v${member.version}` : ''}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : String(member.status).toLowerCase() === 'revoked' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                            <Ban className="w-3 h-3" />
                            <span>Revoked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            <XCircle className="w-3 h-3" />
                            <span>{member.status || 'Inactive'}</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4 align-top text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#1769AA] dark:text-[#19B6A4] hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Role &amp; Perms</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingHistoryStaff(member)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="View Employee Role & Activity History"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>History</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActiveStatus(member)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                            isActive
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        {member.staffRole !== 'Super Admin' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeStaffAccess(member)}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50/70 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                            title="Revoke all administrative permissions immediately"
                          >
                            Revoke
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setStaffToTrash(member);
                            setTrashReason('Employee access ended / moved to Global Trash');
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Move employee record to Global Trash"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Move to Global Trash Confirmation Modal */}
      {staffToTrash && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <form
            onSubmit={handleConfirmMoveToTrash}
            className="bg-white dark:bg-[#10243A] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-rose-600 dark:text-rose-400">
                  Move Employee to Global Trash
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Moving <strong>{staffToTrash.fullName}</strong> ({staffToTrash.email}) to Global Trash will immediately revoke all active administrative sessions and permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffToTrash(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Deletion / Revocation Reason *
              </label>
              <input
                type="text"
                required
                value={trashReason}
                onChange={e => setTrashReason(e.target.value)}
                placeholder="e.g., Contract completed, role reassigned..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1523] text-[#10243A] dark:text-white"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
              <strong>Safe Restoration Notice:</strong> If this employee is later restored from Global Trash, privileged Admin permissions will remain stripped until explicitly revalidated by a Super Admin.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffToTrash(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Move to Global Trash
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee Role & Activity History Modal */}
      {viewingHistoryStaff && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#10243A] rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-[#10243A] dark:text-white">
                  Employee History — {viewingHistoryStaff.fullName}
                </h3>
                <p className="text-slate-500">
                  {viewingHistoryStaff.email} • Current Role: {viewingHistoryStaff.staffRole}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingHistoryStaff(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold uppercase tracking-wider text-slate-400">
                Role Assignment History
              </h4>
              {Array.isArray(viewingHistoryStaff.roleHistory) &&
              viewingHistoryStaff.roleHistory.length > 0 ? (
                <div className="space-y-2">
                  {viewingHistoryStaff.roleHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between font-bold text-[#10243A] dark:text-white">
                        <span>
                          {item.previousRole} → {item.newRole}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(item.changedAt || item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-1">
                        Changed by: <strong>{item.changedBy || item.changedByName || item.changedByEmail}</strong>
                        {item.reason ? ` — ${item.reason}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">
                  Initial role ({viewingHistoryStaff.staffRole}) assigned at account creation.
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold uppercase tracking-wider text-slate-400">
                Administrative Activity Log
              </h4>
              {Array.isArray(viewingHistoryStaff.activityHistory) &&
              viewingHistoryStaff.activityHistory.length > 0 ? (
                <div className="space-y-2">
                  {viewingHistoryStaff.activityHistory.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{act.action}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-1">
                        {act.details} (by {act.actorName})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No recent profile modifications recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Staff & Permissions Modal */}
      {isModalOpen && editingStaff && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
        >
          <form
            onSubmit={handleSaveStaff}
            className="bg-white dark:bg-[#10243A] rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#10243A] dark:text-white">
                  {editingStaff.id ? 'Edit Staff Account & Permissions' : 'Create New Staff Account'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign an official role and customize granular administrative permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingStaff(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.fullName}
                    onChange={e =>
                      setEditingStaff({ ...editingStaff, fullName: e.target.value })
                    }
                    placeholder="e.g., Ji-hyun Park"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Staff Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editingStaff.email}
                    onChange={e =>
                      setEditingStaff({ ...editingStaff, email: e.target.value })
                    }
                    placeholder="admissions@everykr.com"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Staff Role *
                  </label>
                  <select
                    value={editingStaff.staffRole}
                    onChange={e => handleRolePresetChange(e.target.value as StaffRoleType)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] font-bold text-[#10243A] dark:text-white"
                  >
                    {STAFF_ROLES.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Department / Team
                  </label>
                  <input
                    type="text"
                    value={editingStaff.department || ''}
                    onChange={e =>
                      setEditingStaff({ ...editingStaff, department: e.target.value })
                    }
                    placeholder="Admissions / Document Verification"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1523] text-[#10243A] dark:text-white"
                  />
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-white">
                    Granular Permissions Matrix ({editingStaff.permissions.length} enabled)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRolePresetChange(editingStaff.staffRole)}
                    className="text-[11px] font-semibold text-[#1769AA] dark:text-[#19B6A4] hover:underline cursor-pointer"
                  >
                    Reset to {editingStaff.staffRole} Defaults
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ALL_PERMISSIONS.map(perm => {
                    const checked = editingStaff.permissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-[#1769AA] dark:border-[#19B6A4]'
                            : 'bg-slate-50 dark:bg-[#0B1523] border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm.key)}
                          className="mt-0.5 rounded border-slate-300 text-[#1769AA]"
                        />
                        <div>
                          <div className="font-bold text-[#10243A] dark:text-white">
                            {perm.label}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1523] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingStaff(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#10243A] hover:bg-[#1769AA] text-white dark:bg-[#19B6A4] dark:text-[#050B18] cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Staff Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
