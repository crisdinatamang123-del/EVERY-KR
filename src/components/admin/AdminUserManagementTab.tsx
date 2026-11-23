import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Home,
  Building2,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  Eye,
  Lock,
  Unlock,
  KeyRound,
  Activity,
  Shield,
  X,
  Download,
  Globe,
  FileText,
  BookOpen,
  FileSpreadsheet,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Link2,
  Calendar
} from 'lucide-react';
import {
  UserProfile,
  UserRole,
  LoginLogEntry,
  AdminLogEntry,
  OtpVerificationMetadataEntry,
  RegistrationLogEntry,
  DataPrivacyRequestEntry,
  UserManagementStats,
  StudentDocumentRecord,
  UniversityApplicationRecord
} from '../../types';
import {
  fetchAllFirestoreUsers,
  fetchLoginLogsDoc,
  fetchAdminLogsDoc,
  fetchOtpVerificationsDoc,
  fetchRegistrationLogsDoc,
  fetchDataPrivacyRequestsDoc,
  fetchAdminStudentDocuments,
  fetchAdminUniversityApplications,
  adminUpdateUserDoc,
  adminDeleteUserDoc,
  adminApproveOrRejectAgentDoc,
  adminRevealEncryptedPassportDoc,
  recordAdminLogDoc,
  generateRegistrationId,
  getAdminRequestHeaders
} from '../../services/firebaseService';

export type UserDatabaseSubTab =
  | 'users'
  | 'registration_logs'
  | 'login_logs'
  | 'admin_logs'
  | 'otp_verifications'
  | 'data_privacy_requests';

interface AdminUserManagementTabProps {
  currentUser: UserProfile;
  showToast: (msg: string) => void;
  onUserUpdated?: (uid: string, updates: Partial<UserProfile>) => void;
  initialSubTab?: UserDatabaseSubTab;
}

type CollectionSubTab = UserDatabaseSubTab;

interface GoogleSheetsSyncConfigState {
  enabled: boolean;
  webhookUrl: string;
  spreadsheetUrl?: string;
  sheetName: string;
  autoSyncOnRegistration: boolean;
  lastSyncedAt?: string;
  lastSyncStatus: 'idle' | 'synced' | 'ready_local' | 'error';
  lastSyncMessage?: string;
  syncedRowCount: number;
}

export const AdminUserManagementTab: React.FC<AdminUserManagementTabProps> = ({
  currentUser,
  showToast,
  onUserUpdated,
  initialSubTab = 'users'
}) => {
  const [subTab, setSubTab] = useState<CollectionSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Collections state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLogEntry[]>([]);
  const [otpVerifications, setOtpVerifications] = useState<OtpVerificationMetadataEntry[]>([]);
  const [registrationLogs, setRegistrationLogs] = useState<RegistrationLogEntry[]>([]);
  const [dataPrivacyRequests, setDataPrivacyRequests] = useState<DataPrivacyRequestEntry[]>([]);

  // Google Sheets integration state
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsSyncConfigState>({
    enabled: true,
    webhookUrl: '',
    spreadsheetUrl: '',
    sheetName: 'EveryKR_Registrations',
    autoSyncOnRegistration: true,
    lastSyncStatus: 'ready_local',
    lastSyncMessage: 'Automatic Google Sheets synchronization active (deduplicated by Registration ID & Email).',
    syncedRowCount: 0
  });
  const [showSheetsPanel, setShowSheetsPanel] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  // Search, Filter, Sort & Pagination state for `users`
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [nationalityFilter, setNationalityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'last_7_days' | 'last_30_days' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'pending_approval' | 'rejected' | 'unverified' | 'suspended'
  >('all');
  const [providerFilter, setProviderFilter] = useState<'all' | 'google' | 'email_otp'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'recent_login'>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Filter state for `login_logs`
  const [loginStatusFilter, setLoginStatusFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [loginSearch, setLoginSearch] = useState('');

  // Selected user inspection drawer + audited passport reveal + student portal records
  const [inspectedUser, setInspectedUser] = useState<UserProfile | null>(null);
  const [studentDocs, setStudentDocs] = useState<StudentDocumentRecord[]>([]);
  const [studentApps, setStudentApps] = useState<UniversityApplicationRecord[]>([]);
  const [internalNoteDraft, setInternalNoteDraft] = useState<string>('');
  const [isSavingInternalNote, setIsSavingInternalNote] = useState<boolean>(false);
  const [revealedPassport, setRevealedPassport] = useState<{
    uid: string;
    passportNumber: string;
    passportIssueDate?: string;
    passportExpiryDate?: string;
  } | null>(null);
  const [isRevealingPassport, setIsRevealingPassport] = useState(false);

  useEffect(() => {
    if (!inspectedUser) return;
    setInternalNoteDraft(inspectedUser.adminInternalNotes || '');
    const targetUid = inspectedUser.uid || inspectedUser.id;
    Promise.all([fetchAdminStudentDocuments(), fetchAdminUniversityApplications()])
      .then(([allDocs, allApps]) => {
        setStudentDocs(allDocs.filter(d => d.userId === targetUid));
        setStudentApps(allApps.filter(a => a.userId === targetUid));
      })
      .catch(() => {});
  }, [inspectedUser?.id]);

  const normalizeUserRecord = (u: Partial<UserProfile>, existing?: UserProfile): UserProfile => {
    const uid = String(u.uid || u.id || existing?.uid || existing?.id || '').trim();
    const role = (u.role || existing?.role || u.accountType || existing?.accountType || 'student') as UserRole;
    const acctType = (u.accountType || existing?.accountType || role) as UserRole;
    const createdAt = u.createdAt || existing?.createdAt || new Date().toISOString();
    const regId = generateRegistrationId(
      uid,
      acctType,
      createdAt,
      u.registrationId || existing?.registrationId
    );
    const mergedAcademic =
      u.studentAcademicProfile || existing?.studentAcademicProfile
        ? {
            ...existing?.studentAcademicProfile,
            ...u.studentAcademicProfile
          }
        : undefined;
    const resolvedProgram =
      mergedAcademic?.interestedProgram ||
      u.interestedProgram ||
      mergedAcademic?.currentMajor ||
      u.major ||
      existing?.interestedProgram ||
      existing?.major ||
      mergedAcademic?.desiredStudyLevel ||
      u.preferredStudyLevel ||
      '';

    return {
      ...existing,
      ...u,
      id: uid,
      uid,
      registrationId: regId,
      fullName: u.fullName || u.name || existing?.fullName || existing?.name || 'EveryKR Member',
      name: u.name || u.fullName || existing?.name || existing?.fullName || 'EveryKR Member',
      email: String(u.email || existing?.email || '').trim().toLowerCase(),
      role,
      accountType: acctType,
      photoURL: u.photoURL || u.avatarUrl || existing?.photoURL || '',
      phone: u.phoneNumber || u.phone || existing?.phoneNumber || existing?.phone || '',
      phoneNumber: u.phoneNumber || u.phone || existing?.phoneNumber || existing?.phone || '',
      nationality: u.nationality || existing?.nationality || u.countryOfResidence || existing?.countryOfResidence || '',
      countryOfResidence: u.countryOfResidence || existing?.countryOfResidence || u.nationality || '',
      currentCity: u.currentCity || u.city || existing?.currentCity || 'Seoul',
      interestedProgram: resolvedProgram,
      major: u.major || mergedAcademic?.currentMajor || resolvedProgram || existing?.major || '',
      studentAcademicProfile: mergedAcademic
        ? {
            ...mergedAcademic,
            interestedProgram: resolvedProgram || mergedAcademic.interestedProgram
          }
        : undefined,
      emailVerified:
        typeof u.emailVerified === 'boolean'
          ? u.emailVerified
          : existing?.emailVerified ?? true,
      accountStatus: u.accountStatus || existing?.accountStatus || 'active',
      authProvider: u.authProvider || existing?.authProvider || 'email_otp',
      preferredLanguage: u.preferredLanguage || existing?.preferredLanguage || 'en',
      createdAt,
      lastLoginAt: u.lastLoginAt || existing?.lastLoginAt || createdAt
    };
  };

  const loadCentralizedDatabase = async () => {
    if (currentUser?.role !== 'admin') return;
    setIsLoading(true);

    try {
      const [
        serverRes,
        fsUsers,
        fsLoginLogs,
        fsAdminLogs,
        fsOtpMeta,
        fsRegLogs,
        fsPrivacyReqs
      ] = await Promise.all([
        fetch('/api/admin/user-management', {
          headers: {
            ...getAdminRequestHeaders(currentUser)
          }
        })
          .then(r => r.json())
          .catch(() => null),
        fetchAllFirestoreUsers(),
        fetchLoginLogsDoc(),
        fetchAdminLogsDoc(),
        fetchOtpVerificationsDoc(),
        fetchRegistrationLogsDoc(),
        fetchDataPrivacyRequestsDoc()
      ]);

      if (serverRes?.ok && serverRes.googleSheetsConfig) {
        setSheetsConfig(serverRes.googleSheetsConfig);
      }

      // 1. Merge & Deduplicate `users` by both UID and normalized Email (prevents duplicate records)
      const usersByUid = new Map<string, UserProfile>();
      const emailToUid = new Map<string, string>();

      const upsertMergedUser = (incoming: Partial<UserProfile>) => {
        const rawUid = String(incoming.uid || incoming.id || '').trim();
        const emailLower = String(incoming.email || '').trim().toLowerCase();
        if (!rawUid && !emailLower) return;

        const canonicalUid =
          (emailLower && emailToUid.get(emailLower)) || rawUid || `uid_${emailLower}`;
        const existing = usersByUid.get(canonicalUid) || (rawUid ? usersByUid.get(rawUid) : undefined);

        // If a real Firebase UID replaces a temporary pending UID for the same email, migrate key
        const finalUid =
          existing && existing.uid?.startsWith('uid_pending_') && !rawUid.startsWith('uid_pending_')
            ? rawUid
            : canonicalUid;

        if (existing && finalUid !== canonicalUid) {
          usersByUid.delete(canonicalUid);
        }

        const merged = normalizeUserRecord({ ...incoming, uid: finalUid, id: finalUid }, existing);
        usersByUid.set(finalUid, merged);
        if (emailLower) {
          emailToUid.set(emailLower, finalUid);
        }
      };

      if (serverRes?.ok && Array.isArray(serverRes.users)) {
        for (const u of serverRes.users) {
          upsertMergedUser(u);
        }
      }
      for (const fu of fsUsers) {
        upsertMergedUser(fu);
      }

      setUsers(Array.from(usersByUid.values()));

      // 2. Merge `login_logs` by ID
      const loginLogsById = new Map<string, LoginLogEntry>();
      if (serverRes?.ok && Array.isArray(serverRes.loginLogs)) {
        for (const l of serverRes.loginLogs) {
          loginLogsById.set(l.id, l);
        }
      }
      for (const fl of fsLoginLogs) {
        loginLogsById.set(fl.id, fl);
      }
      setLoginLogs(
        Array.from(loginLogsById.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );

      // 3. Merge `admin_logs` / `admin_activity_logs` by ID
      const adminLogsById = new Map<string, AdminLogEntry>();
      if (serverRes?.ok && Array.isArray(serverRes.adminLogs)) {
        for (const a of serverRes.adminLogs) {
          adminLogsById.set(a.id, a);
        }
      }
      for (const fa of fsAdminLogs) {
        adminLogsById.set(fa.id, fa);
      }
      setAdminLogs(
        Array.from(adminLogsById.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );

      // 4. Merge `otp_verifications` metadata by email
      const otpByEmail = new Map<string, OtpVerificationMetadataEntry>();
      if (serverRes?.ok && Array.isArray(serverRes.otpVerifications)) {
        for (const o of serverRes.otpVerifications) {
          otpByEmail.set(o.email.toLowerCase(), o);
        }
      }
      for (const fo of fsOtpMeta) {
        if (fo.email) {
          otpByEmail.set(fo.email.toLowerCase(), fo);
        }
      }
      setOtpVerifications(
        Array.from(otpByEmail.values()).sort(
          (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        )
      );

      // 5. Merge `registration_logs`
      const regById = new Map<string, RegistrationLogEntry>();
      if (serverRes?.ok && Array.isArray(serverRes.registrationLogs)) {
        for (const rl of serverRes.registrationLogs) {
          regById.set(rl.id, rl);
        }
      }
      for (const frl of fsRegLogs) {
        regById.set(frl.id, frl);
      }
      setRegistrationLogs(
        Array.from(regById.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );

      // 6. Merge `data_privacy_requests`
      const privById = new Map<string, DataPrivacyRequestEntry>();
      if (serverRes?.ok && Array.isArray(serverRes.dataPrivacyRequests)) {
        for (const pr of serverRes.dataPrivacyRequests) {
          privById.set(pr.id, pr);
        }
      }
      for (const fpr of fsPrivacyReqs) {
        privById.set(fpr.id, fpr);
      }
      setDataPrivacyRequests(
        Array.from(privById.values()).sort(
          (a, b) =>
            new Date(b.requestedAt || b.createdAt || 0).getTime() -
            new Date(a.requestedAt || a.createdAt || 0).getTime()
        )
      );
    } catch (err) {
      console.warn('Error loading centralized user management database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCentralizedDatabase();
  }, [currentUser?.id]);

  // Reset pagination to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    roleFilter,
    nationalityFilter,
    dateFilter,
    customDateFrom,
    customDateTo,
    verificationFilter,
    statusFilter,
    providerFilter,
    sortOrder,
    pageSize
  ]);

  // Distinct nationalities across registered users for Nationality Filter
  const availableNationalities = useMemo(() => {
    const set = new Set<string>();
    for (const u of users) {
      const n = (u.nationality || u.countryOfResidence || u.currentCountry || '').trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort();
  }, [users]);

  // Compute live KPI metrics across all registered users
  const stats: UserManagementStats = useMemo(() => {
    return {
      totalUsers: users.length,
      verifiedUsers: users.filter(u => u.emailVerified !== false).length,
      unverifiedUsers: users.filter(u => u.emailVerified === false).length,
      studentsCount: users.filter(u => (u.accountType || u.role) === 'student').length,
      generalUsersCount: users.filter(u => (u.accountType || u.role) === 'general').length,
      agentsCount: users.filter(u => (u.accountType || u.role) === 'agent').length,
      pendingAgentsCount: users.filter(
        u =>
          (u.accountType || u.role) === 'agent' &&
          (u.accountStatus === 'pending_approval' || u.agentPartnerProfile?.approvalStatus === 'pending')
      ).length,
      employersCount: users.filter(u => u.role === 'employer').length,
      housingProvidersCount: users.filter(u => u.role === 'landlord').length,
      universityPartnersCount: users.filter(u => u.role === 'university').length,
      adminsCount: users.filter(u => u.role === 'admin').length,
      suspendedUsers: users.filter(u => u.accountStatus === 'suspended').length
    };
  }, [users]);

  // Filtered and Sorted `users` list
  const filteredUsers = useMemo(() => {
    const now = Date.now();
    const filtered = users.filter(u => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const regId = (
          u.registrationId ||
          generateRegistrationId(u.uid || u.id, u.accountType || u.role, u.createdAt)
        ).toLowerCase();
        const matchesName = (u.fullName || u.name || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesPhone = `${u.countryCode || ''} ${u.phoneNumber || u.phone || ''}`
          .toLowerCase()
          .includes(q);
        const matchesRegId = regId.includes(q);
        const matchesUid = (u.uid || u.id || '').toLowerCase().includes(q);
        const matchesNationality = (u.nationality || u.countryOfResidence || '')
          .toLowerCase()
          .includes(q);
        const matchesUni = (
          u.university ||
          u.preferredUniversity ||
          u.studentAcademicProfile?.preferredUniversity ||
          ''
        )
          .toLowerCase()
          .includes(q);
        const matchesProgram = (
          u.interestedProgram ||
          u.major ||
          u.studentAcademicProfile?.interestedProgram ||
          u.studentAcademicProfile?.currentMajor ||
          ''
        )
          .toLowerCase()
          .includes(q);
        const matchesPassport = (
          u.passportNumberMasked ||
          u.passportDetails?.passportNumberMasked ||
          u.passportMetadata?.passportNumberMasked ||
          ''
        )
          .toLowerCase()
          .includes(q);
        if (
          !matchesName &&
          !matchesEmail &&
          !matchesPhone &&
          !matchesRegId &&
          !matchesUid &&
          !matchesNationality &&
          !matchesUni &&
          !matchesProgram &&
          !matchesPassport
        ) {
          return false;
        }
      }

      if (roleFilter !== 'all' && (u.accountType || u.role) !== roleFilter && u.role !== roleFilter) {
        return false;
      }

      if (nationalityFilter !== 'all') {
        const userNat = (u.nationality || '').trim();
        const userCountry = (u.countryOfResidence || u.currentCountry || '').trim();
        if (userNat !== nationalityFilter && userCountry !== nationalityFilter) {
          return false;
        }
      }

      if (dateFilter !== 'all' && u.createdAt) {
        const createdMs = new Date(u.createdAt).getTime();
        if (!isNaN(createdMs)) {
          const ageMs = now - createdMs;
          if (dateFilter === 'today' && ageMs > 24 * 60 * 60 * 1000) return false;
          if (dateFilter === 'last_7_days' && ageMs > 7 * 24 * 60 * 60 * 1000) return false;
          if (dateFilter === 'last_30_days' && ageMs > 30 * 24 * 60 * 60 * 1000) return false;
          if (dateFilter === 'custom') {
            if (customDateFrom) {
              const fromMs = new Date(`${customDateFrom}T00:00:00`).getTime();
              if (!isNaN(fromMs) && createdMs < fromMs) return false;
            }
            if (customDateTo) {
              const toMs = new Date(`${customDateTo}T23:59:59.999`).getTime();
              if (!isNaN(toMs) && createdMs > toMs) return false;
            }
          }
        }
      }

      if (verificationFilter === 'verified' && u.emailVerified === false) return false;
      if (verificationFilter === 'unverified' && u.emailVerified !== false) return false;
      if (statusFilter !== 'all' && (u.accountStatus || 'active') !== statusFilter) return false;
      if (providerFilter === 'google' && u.authProvider !== 'google') return false;
      if (providerFilter === 'email_otp' && u.authProvider === 'google') return false;

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortOrder === 'recent_login') {
        return (
          new Date(b.lastLoginAt || b.createdAt || 0).getTime() -
          new Date(a.lastLoginAt || a.createdAt || 0).getTime()
        );
      }
      // Default: 'newest' registrations first
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [
    users,
    searchQuery,
    roleFilter,
    nationalityFilter,
    dateFilter,
    customDateFrom,
    customDateTo,
    verificationFilter,
    statusFilter,
    providerFilter,
    sortOrder
  ]);

  // Paginated slice of `filteredUsers`
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safeCurrentPage, pageSize]);

  // Filtered `login_logs` list
  const filteredLoginLogs = useMemo(() => {
    return loginLogs.filter(log => {
      if (loginStatusFilter !== 'all' && log.status !== loginStatusFilter) return false;
      const q = loginSearch.trim().toLowerCase();
      if (q) {
        const matchesEmail = (log.email || '').toLowerCase().includes(q);
        const matchesUid = (log.uid || '').toLowerCase().includes(q);
        const matchesReason = (log.reason || '').toLowerCase().includes(q);
        if (!matchesEmail && !matchesUid && !matchesReason) return false;
      }
      return true;
    });
  }, [loginLogs, loginStatusFilter, loginSearch]);

  /**
   * Formats a UserProfile into the exact 20 columns required for EveryKR Excel (.xlsx) export.
   * Strictly excludes passwords, OTP codes, authentication tokens, and unmasked passport numbers.
   */
  const buildUserExcelRow = (u: UserProfile): Record<string, string> => {
    const uid = u.uid || u.id;
    const acctType = u.accountType || u.role || 'student';
    const regId =
      u.registrationId || generateRegistrationId(uid, acctType, u.createdAt);
    const rawPhone = String(u.phoneNumber || u.phone || '').trim();
    const code = String(u.countryCode || '').trim();
    const formattedPhone =
      code && rawPhone && !rawPhone.startsWith(code) ? `${code} ${rawPhone}` : rawPhone;

    const regDateFormatted = u.createdAt
      ? !isNaN(new Date(u.createdAt).getTime())
        ? new Date(u.createdAt).toISOString().replace('T', ' ').slice(0, 16)
        : u.createdAt
      : '';

    const langLabels: Record<string, string> = {
      en: 'English (en)',
      ko: 'Korean (ko)',
      bn: 'Bangla (bn)',
      ne: 'Nepali (ne)',
      ur: 'Urdu (ur)',
      zh: 'Chinese (zh)'
    };
    const prefLangCode = u.preferredLanguage || u.generalUserProfile?.preferredLanguage || 'en';
    const academic = u.studentAcademicProfile;
    const interestedProgram =
      academic?.interestedProgram ||
      u.interestedProgram ||
      academic?.currentMajor ||
      u.major ||
      academic?.desiredStudyLevel ||
      u.preferredStudyLevel ||
      '';

    return {
      'Registration ID': regId,
      'Full Name': u.fullName || u.name || '',
      'Email': u.email || '',
      'Phone Number': formattedPhone,
      'Nationality': u.nationality || u.countryOfResidence || '',
      'User Type': acctType,
      'Date of Birth': u.dateOfBirth || '',
      'Gender': u.gender || '',
      'HSC Passing Year': academic?.hscPassingYear || '',
      'HSC GPA': academic?.hscGpa || '',
      'SSC Passing Year': academic?.sscPassingYear || '',
      'SSC GPA': academic?.sscGpa || '',
      'Current Education':
        academic?.currentEducationLevel ||
        academic?.lastCompletedEducation ||
        u.degreeLevel ||
        u.studyLevel ||
        '',
      'Interested University':
        academic?.preferredUniversity || u.preferredUniversity || u.university || '',
      'Interested Program': interestedProgram,
      'Preferred Intake': academic?.preferredIntake || u.preferredIntake || '',
      'Korean Language Level': academic?.koreanLanguageLevel || '',
      'Registration Date': regDateFormatted,
      'Account Status': u.accountStatus || 'active',
      'Preferred Language': langLabels[prefLangCode] || prefLangCode
    };
  };

  /**
   * Generates a real, properly formatted .xlsx workbook with all 20 required columns,
   * formatted column widths, an Export_Metadata sheet with generation timestamp,
   * and logs the export action in Firestore & backend `admin_logs`.
   */
  const handleExportToExcel = async (
    scope: 'filtered' | 'all' | 'students' | 'general',
    singleUser?: UserProfile
  ) => {
    let targetList: UserProfile[] = [];
    let scopeLabel = 'Filtered Users';

    if (singleUser) {
      targetList = [singleUser];
      scopeLabel = `Single User Profile (${singleUser.email})`;
    } else if (scope === 'all') {
      targetList = users;
      scopeLabel = 'All Registered Users';
    } else if (scope === 'students') {
      targetList = users.filter(u => (u.accountType || u.role) === 'student');
      scopeLabel = 'Students Only';
    } else if (scope === 'general') {
      targetList = users.filter(u => (u.accountType || u.role) === 'general');
      scopeLabel = 'General Users Only';
    } else {
      targetList = filteredUsers;
      scopeLabel = 'Filtered Users';
    }

    if (targetList.length === 0) {
      showToast('No matching user records found for the selected Excel export scope.');
      return;
    }

    // Deduplicate by Email and Registration ID before exporting
    const dedupedRowsMap = new Map<string, Record<string, string>>();
    for (const u of targetList) {
      const row = buildUserExcelRow(u);
      const key = (row['Email'] || row['Registration ID']).toLowerCase();
      if (key) {
        dedupedRowsMap.set(key, row);
      }
    }
    const rows = Array.from(dedupedRowsMap.values());
    const nowIso = new Date().toISOString();
    const dateStr = nowIso.slice(0, 10);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Format column widths so all 20 columns are clean and legible in Excel / Google Sheets
    ws['!cols'] = [
      { wch: 22 }, // 1. Registration ID
      { wch: 24 }, // 2. Full Name
      { wch: 28 }, // 3. Email
      { wch: 18 }, // 4. Phone Number
      { wch: 18 }, // 5. Nationality
      { wch: 14 }, // 6. User Type
      { wch: 14 }, // 7. Date of Birth
      { wch: 12 }, // 8. Gender
      { wch: 16 }, // 9. HSC Passing Year
      { wch: 12 }, // 10. HSC GPA
      { wch: 16 }, // 11. SSC Passing Year
      { wch: 12 }, // 12. SSC GPA
      { wch: 28 }, // 13. Current Education
      { wch: 28 }, // 14. Interested University
      { wch: 28 }, // 15. Interested Program
      { wch: 22 }, // 16. Preferred Intake
      { wch: 22 }, // 17. Korean Language Level
      { wch: 20 }, // 18. Registration Date
      { wch: 16 }, // 19. Account Status
      { wch: 18 }  // 20. Preferred Language
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'EveryKR_Users');

    // Add Export_Metadata sheet with generation timestamp & security audit attestation
    const metaRows = [
      {
        'Report Title': 'EveryKR Centralized User Database Export',
        'Firebase Project': 'everykr',
        'Export Generation Date': nowIso.replace('T', ' ').slice(0, 19) + ' UTC',
        'Exported By Admin': `${currentUser.fullName || currentUser.name} (${currentUser.email})`,
        'Export Scope': scopeLabel,
        'Total Exported Users': rows.length,
        'Students Included': targetList.filter(u => (u.accountType || u.role) === 'student').length,
        'General Users Included': targetList.filter(u => (u.accountType || u.role) === 'general').length,
        'Security Attestation':
          'Zero passwords, OTP codes, authentication tokens, or raw passport numbers included.'
      }
    ];
    const metaWs = XLSX.utils.json_to_sheet(metaRows);
    metaWs['!cols'] = [
      { wch: 36 },
      { wch: 16 },
      { wch: 26 },
      { wch: 34 },
      { wch: 24 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
      { wch: 68 }
    ];
    XLSX.utils.book_append_sheet(wb, metaWs, 'Export_Metadata');

    const filename = singleUser
      ? `EveryKR_User_${(singleUser.registrationId || singleUser.id).replace(/[^a-zA-Z0-9_-]/g, '')}_${dateStr}.xlsx`
      : scope === 'students'
      ? `EveryKR_Students_${dateStr}.xlsx`
      : scope === 'general'
      ? `EveryKR_General_Users_${dateStr}.xlsx`
      : `EveryKR_Users_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);

    showToast(`Downloaded ${filename} (${rows.length} user record${rows.length === 1 ? '' : 's'})`);

    // Record mandatory Admin Export Audit Log in Firestore (`admin_logs` & `admin_activity_logs`) + Server
    await recordAdminLogDoc({
      adminUid: currentUser.uid || currentUser.id,
      adminName: currentUser.fullName || currentUser.name,
      adminEmail: currentUser.email,
      action: 'EXCEL_EXPORT_USERS',
      details: `Exported ${rows.length} user record(s) to Excel file "${filename}" [Scope: ${scopeLabel}, Generated: ${nowIso.slice(0, 19)} UTC]`
    }).catch(() => {});

    loadCentralizedDatabase();
  };

  // Export non-sensitive user data to CSV (with the same 20 columns)
  const handleExportUsersCsv = () => {
    if (filteredUsers.length === 0) {
      showToast('No user records to export.');
      return;
    }

    const rows = filteredUsers.map(u => buildUserExcelRow(u));
    const headers = Object.keys(rows[0]);

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCsv).join(','),
        ...rows.map(r => headers.map(h => escapeCsv(r[h])).join(','))
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `EveryKR_Users_${new Date().toISOString().slice(0, 10)}.csv`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    recordAdminLogDoc({
      adminUid: currentUser.uid || currentUser.id,
      adminName: currentUser.fullName || currentUser.name,
      adminEmail: currentUser.email,
      action: 'CSV_EXPORT_USERS',
      details: `Exported ${rows.length} user record(s) to CSV file "${filename}".`
    }).catch(() => {});

    showToast(`Exported ${rows.length} user records to ${filename}`);
  };

  // Save Google Sheets Configuration & Trigger Live Sync
  const handleSaveAndSyncGoogleSheets = async (syncNow: boolean = true) => {
    setIsSyncingSheets(true);
    try {
      await fetch('/api/admin/google-sheets/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminRequestHeaders(currentUser)
        },
        body: JSON.stringify({
          webhookUrl: sheetsConfig.webhookUrl,
          spreadsheetUrl: sheetsConfig.spreadsheetUrl,
          sheetName: sheetsConfig.sheetName,
          autoSyncOnRegistration: sheetsConfig.autoSyncOnRegistration,
          enabled: sheetsConfig.enabled
        })
      });

      if (syncNow) {
        const syncRes = await fetch('/api/admin/google-sheets/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminRequestHeaders(currentUser)
          },
          body: JSON.stringify({
            users,
            triggerReason: 'manual_admin_dashboard_sync'
          })
        });
        const syncData = await syncRes.json().catch(() => null);
        if (syncData?.config) {
          setSheetsConfig(syncData.config);
        }
        showToast(
          syncData?.message ||
            `Synchronized ${users.length} deduplicated user records with Google Sheets.`
        );
      } else {
        showToast('Saved Google Sheets automatic synchronization settings.');
      }
      loadCentralizedDatabase();
    } catch {
      showToast('Could not complete Google Sheets synchronization request.');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleRoleChange = async (user: UserProfile, newRole: UserRole) => {
    const uid = user.uid || user.id;
    setUsers(prev =>
      prev.map(u => ((u.uid || u.id) === uid ? { ...u, role: newRole, accountType: newRole } : u))
    );
    onUserUpdated?.(uid, { role: newRole, accountType: newRole });
    await adminUpdateUserDoc({
      targetUid: uid,
      targetEmail: user.email,
      targetName: user.fullName || user.name,
      updates: { role: newRole, accountType: newRole },
      adminUser: currentUser
    });
    showToast(`Updated ${user.fullName || user.name}'s account type to ${newRole.toUpperCase()}`);
    loadCentralizedDatabase();
  };

  const handleAgentApproval = async (user: UserProfile, decision: 'approved' | 'rejected') => {
    const uid = user.uid || user.id;
    const nextStatus = decision === 'approved' ? 'active' : 'rejected';
    setUsers(prev =>
      prev.map(u =>
        (u.uid || u.id) === uid
          ? {
              ...u,
              accountStatus: nextStatus,
              agentPartnerProfile: u.agentPartnerProfile
                ? { ...u.agentPartnerProfile, approvalStatus: decision }
                : undefined
            }
          : u
      )
    );
    await adminApproveOrRejectAgentDoc({
      targetUid: uid,
      targetEmail: user.email,
      targetName: user.fullName || user.name,
      decision,
      adminUser: currentUser
    });
    showToast(
      decision === 'approved'
        ? `Approved Education Agent / Partner account for ${user.fullName || user.name}`
        : `Rejected Education Agent / Partner account for ${user.fullName || user.name}`
    );
    loadCentralizedDatabase();
  };

  const handleRevealPassport = async (user: UserProfile) => {
    const uid = user.uid || user.id;
    setIsRevealingPassport(true);
    try {
      const res = await adminRevealEncryptedPassportDoc({
        targetUid: uid,
        adminUser: currentUser
      });
      if (res?.ok && res.passportNumber) {
        setRevealedPassport({
          uid,
          passportNumber: res.passportNumber,
          passportIssueDate: res.passportIssueDate,
          passportExpiryDate: res.passportExpiryDate
        });
        showToast('Sensitive passport decrypted and recorded in admin_activity_logs');
        loadCentralizedDatabase();
      } else {
        showToast(res?.message || 'No encrypted passport stored in vault for this user');
      }
    } finally {
      setIsRevealingPassport(false);
    }
  };

  const handleStatusToggle = async (user: UserProfile) => {
    const uid = user.uid || user.id;
    const nextStatus: 'active' | 'suspended' =
      user.accountStatus === 'suspended' ? 'active' : 'suspended';
    setUsers(prev =>
      prev.map(u => ((u.uid || u.id) === uid ? { ...u, accountStatus: nextStatus } : u))
    );
    onUserUpdated?.(uid, { accountStatus: nextStatus });
    await adminUpdateUserDoc({
      targetUid: uid,
      targetEmail: user.email,
      targetName: user.fullName || user.name,
      updates: { accountStatus: nextStatus },
      adminUser: currentUser
    });
    showToast(
      nextStatus === 'suspended'
        ? `Suspended account for ${user.fullName || user.name}`
        : `Reactivated account for ${user.fullName || user.name}`
    );
    loadCentralizedDatabase();
  };

  const handleManualVerifyUser = async (user: UserProfile) => {
    const uid = user.uid || user.id;
    setUsers(prev =>
      prev.map(u =>
        (u.uid || u.id) === uid ? { ...u, emailVerified: true, accountStatus: 'active' } : u
      )
    );
    await adminUpdateUserDoc({
      targetUid: uid,
      targetEmail: user.email,
      targetName: user.fullName || user.name,
      updates: { emailVerified: true, accountStatus: 'active' },
      adminUser: currentUser
    });
    showToast(`Verified account for ${user.fullName || user.name}`);
    loadCentralizedDatabase();
  };

  const handleDeleteUserRecord = async (user: UserProfile) => {
    const uid = user.uid || user.id;
    setUsers(prev => prev.filter(u => (u.uid || u.id) !== uid));
    await adminDeleteUserDoc({
      targetUid: uid,
      targetEmail: user.email,
      targetName: user.fullName || user.name,
      adminUser: currentUser
    });
    if (inspectedUser && (inspectedUser.uid || inspectedUser.id) === uid) {
      setInspectedUser(null);
    }
    showToast(`Removed user record for ${user.fullName || user.name}`);
    loadCentralizedDatabase();
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setNationalityFilter('all');
    setDateFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setVerificationFilter('all');
    setStatusFilter('all');
    setProviderFilter('all');
    setSortOrder('newest');
    setCurrentPage(1);
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* CENTRALIZED USER DATABASE KPI SUMMARY CARDS               */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div
          onClick={() => {
            setSubTab('users');
            resetAllFilters();
          }}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs cursor-pointer hover:border-[#1769AA] transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-[#10243A]" />
          </div>
          <div className="text-2xl font-black text-[#10243A]">{stats.totalUsers}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Deduplicated Records</div>
        </div>

        <div
          onClick={() => {
            setSubTab('users');
            setRoleFilter('student');
          }}
          className="bg-white rounded-xl p-4 border border-blue-200 shadow-2xs cursor-pointer hover:border-[#1769AA] transition-colors"
        >
          <div className="flex items-center justify-between text-[#1769AA] mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Students</span>
            <GraduationCap className="w-4 h-4 text-[#1769AA]" />
          </div>
          <div className="text-2xl font-black text-[#10243A]">{stats.studentsCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Academic Profiles</div>
        </div>

        <div
          onClick={() => {
            setSubTab('users');
            setRoleFilter('general');
          }}
          className="bg-white rounded-xl p-4 border border-teal-200 shadow-2xs cursor-pointer hover:border-[#19B6A4] transition-colors"
        >
          <div className="flex items-center justify-between text-teal-700 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">General Users</span>
            <Globe className="w-4 h-4 text-[#19B6A4]" />
          </div>
          <div className="text-2xl font-black text-[#10243A]">{stats.generalUsersCount || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Korea Explorers</div>
        </div>

        <div
          onClick={() => {
            setSubTab('users');
            setVerificationFilter('verified');
          }}
          className="bg-white rounded-xl p-4 border border-emerald-200 shadow-2xs cursor-pointer hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{stats.verifiedUsers}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Email / OAuth Verified</div>
        </div>

        <div
          onClick={() => {
            setSubTab('users');
            setRoleFilter('agent');
          }}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs cursor-pointer hover:border-[#1769AA] transition-colors"
        >
          <div className="flex items-center justify-between text-[#1769AA] mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Edu Agents</span>
            <Building2 className="w-4 h-4 text-[#1769AA]" />
          </div>
          <div className="text-2xl font-black text-[#10243A]">{stats.agentsCount || 0}</div>
          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
            {stats.pendingAgentsCount || 0} pending review
          </div>
        </div>

        <div
          onClick={() => {
            setSubTab('users');
            setRoleFilter('employer');
          }}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs cursor-pointer hover:border-[#1769AA] transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Employers</span>
            <Briefcase className="w-4 h-4 text-[#19B6A4]" />
          </div>
          <div className="text-2xl font-black text-[#10243A]">{stats.employersCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Korean Employers</div>
        </div>

        <div
          onClick={() => {
            setSubTab('users');
            setRoleFilter('landlord');
          }}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs cursor-pointer hover:border-[#1769AA] transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Housing</span>
            <Home className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-[#10243A]">{stats.housingProvidersCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Housing Providers</div>
        </div>

        <div
          onClick={() => {
            setSubTab('users');
            setRoleFilter('university');
          }}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs cursor-pointer hover:border-[#1769AA] transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Universities</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-[#10243A]">{stats.universityPartnersCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">University Partners</div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EXCEL (.XLSX) EXPORT & GOOGLE SHEETS AUTO-SYNC HUB        */}
      {/* ========================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black text-[#10243A]">
                Automatic User Database Export (.xlsx) &amp; Google Sheets Sync
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                20 Standardized Columns · Audit Logged
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Download formatted Excel (<code className="font-mono text-[#1769AA]">.xlsx</code>) workbooks with Registration ID, SSC/HSC GPA, Target Korean University/Program, Intake, and Language Level. Passwords, OTPs, and tokens are never exported.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportToExcel('filtered')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer transition-colors"
              title="Export currently filtered user records to .xlsx"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export to Excel (.xlsx) ({filteredUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportToExcel('all')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#10243A] hover:bg-[#1769AA] text-white cursor-pointer transition-colors"
              title="Export all registered users to EveryKR_Users_YYYY-MM-DD.xlsx"
            >
              <Download className="w-3.5 h-3.5 text-[#19B6A4]" />
              <span>All Users ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportToExcel('students')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-[#1769AA] border border-blue-200 cursor-pointer transition-colors"
              title="Export only student accounts to EveryKR_Students_YYYY-MM-DD.xlsx"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Students Only ({stats.studentsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportToExcel('general')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer transition-colors"
              title="Export only general user accounts to EveryKR_General_Users_YYYY-MM-DD.xlsx"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>General Users ({stats.generalUsersCount || 0})</span>
            </button>

            <button
              type="button"
              onClick={handleExportUsersCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 cursor-pointer transition-colors"
              title="Export filtered users to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSheetsPanel(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                showSheetsPanel
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Sheets Auto-Sync</span>
            </button>
          </div>
        </div>

        {/* Expandable Google Sheets Integration & Live Upsert Panel */}
        {showSheetsPanel && (
          <div className="pt-4 border-t border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-[#10243A] flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Google Sheets Live Synchronization (Upsert by Registration ID &amp; Email)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automatically pushes every new student and general user registration to your connected Google Sheet without creating duplicate rows.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    sheetsConfig.lastSyncStatus === 'synced'
                      ? 'bg-emerald-100 text-emerald-800'
                      : sheetsConfig.lastSyncStatus === 'error'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-[#1769AA]'
                  }`}
                >
                  {sheetsConfig.lastSyncStatus === 'synced'
                    ? 'Connected & Synced'
                    : sheetsConfig.lastSyncStatus === 'error'
                    ? 'Webhook Error'
                    : 'Auto-Queue Ready'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Google Apps Script Web App / Webhook URL (Optional for External Sheet Push)
                </label>
                <input
                  type="url"
                  value={sheetsConfig.webhookUrl}
                  onChange={e =>
                    setSheetsConfig(prev => ({ ...prev, webhookUrl: e.target.value }))
                  }
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Sheet Tab Name
                </label>
                <input
                  type="text"
                  value={sheetsConfig.sheetName}
                  onChange={e =>
                    setSheetsConfig(prev => ({ ...prev, sheetName: e.target.value }))
                  }
                  placeholder="EveryKR_Registrations"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sheetsConfig.autoSyncOnRegistration}
                  onChange={e =>
                    setSheetsConfig(prev => ({
                      ...prev,
                      autoSyncOnRegistration: e.target.checked
                    }))
                  }
                  className="rounded border-slate-300 text-[#1769AA]"
                />
                <span>
                  Automatically sync every new registration &amp; profile update (prevent duplicate rows)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSyncingSheets}
                  onClick={() => handleSaveAndSyncGoogleSheets(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  disabled={isSyncingSheets}
                  onClick={() => handleSaveAndSyncGoogleSheets(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingSheets ? 'Syncing...' : `Sync All ${users.length} Users to Google Sheets`}
                  </span>
                </button>
              </div>
            </div>

            {sheetsConfig.lastSyncMessage && (
              <div className="text-[11px] text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between">
                <span>{sheetsConfig.lastSyncMessage}</span>
                {sheetsConfig.lastSyncedAt && (
                  <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                    Last Sync: {formatTimestamp(sheetsConfig.lastSyncedAt)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* CENTRALIZED FIRESTORE COLLECTIONS NAVIGATION BAR          */}
      {/* ========================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/60">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-[#10243A]">
                EveryKR Centralized User &amp; Registration Management Database
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#10243A] text-[#19B6A4] font-mono text-[10px] font-bold">
                Firebase Project: everykr
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>AES-256-GCM Encrypted Passports · Zero Plaintext OTPs</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage Firestore <code className="font-mono text-[#1769AA]">users</code>,{' '}
              <code className="font-mono text-[#1769AA]">registration_logs</code>,{' '}
              <code className="font-mono text-[#1769AA]">login_logs</code>,{' '}
              <code className="font-mono text-[#1769AA]">admin_activity_logs</code>,{' '}
              <code className="font-mono text-[#1769AA]">otp_verifications</code>, and{' '}
              <code className="font-mono text-[#1769AA]">data_privacy_requests</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('users')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'users'
                  ? 'bg-[#10243A] text-white border-[#10243A]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#19B6A4]" />
              <span>users ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('registration_logs')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'registration_logs'
                  ? 'bg-[#10243A] text-white border-[#10243A]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>registration_logs ({registrationLogs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('login_logs')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'login_logs'
                  ? 'bg-[#10243A] text-white border-[#10243A]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>login_logs ({loginLogs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('admin_logs')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'admin_logs'
                  ? 'bg-[#10243A] text-white border-[#10243A]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>admin_activity_logs ({adminLogs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('otp_verifications')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'otp_verifications'
                  ? 'bg-[#10243A] text-white border-[#10243A]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>otp_verifications ({otpVerifications.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('data_privacy_requests')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'data_privacy_requests'
                  ? 'bg-[#10243A] text-white border-[#10243A]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>privacy_requests ({dataPrivacyRequests.length})</span>
            </button>

            <button
              type="button"
              onClick={loadCentralizedDatabase}
              disabled={isLoading}
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Refresh Firestore & Server Collections"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SUB-TAB 1: `users` COLLECTION                             */}
        {/* ========================================================= */}
        {subTab === 'users' && (
          <div>
            {/* Search, Multi-Filter & Sort Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-3">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by Full Name, Email, Phone Number, or Registration ID (e.g. EKR-STU-2026-...)..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#1769AA]" />
                    <span className="text-[11px] font-bold text-slate-600">Sort:</span>
                    <select
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value as any)}
                      aria-label="Sort registrations"
                      className="text-xs font-bold text-[#10243A] bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="newest">Newest Registrations First</option>
                      <option value="oldest">Oldest Registrations First</option>
                      <option value="recent_login">Recent Login Activity</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-[#10243A] bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mr-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#1769AA]" />
                  <span>Filters:</span>
                </div>

                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value as any)}
                  aria-label="Filter users by user type"
                  className="px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
                >
                  <option value="all">All User Types ({users.length})</option>
                  <option value="student">Students ({stats.studentsCount})</option>
                  <option value="general">General Users ({stats.generalUsersCount || 0})</option>
                  <option value="agent">Education Agents ({stats.agentsCount || 0})</option>
                  <option value="employer">Employers ({stats.employersCount})</option>
                  <option value="landlord">Housing Providers ({stats.housingProvidersCount})</option>
                  <option value="university">University Partners ({stats.universityPartnersCount})</option>
                  <option value="admin">Admins ({stats.adminsCount})</option>
                </select>

                <select
                  value={nationalityFilter}
                  onChange={e => setNationalityFilter(e.target.value)}
                  aria-label="Filter users by nationality"
                  className="px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
                >
                  <option value="all">All Nationalities ({availableNationalities.length})</option>
                  {availableNationalities.map(nat => (
                    <option key={nat} value={nat}>
                      {nat}
                    </option>
                  ))}
                </select>

                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value as any)}
                  aria-label="Filter users by registration date"
                  className="px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
                >
                  <option value="all">All Registration Dates</option>
                  <option value="today">Registered Today</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>

                {dateFilter === 'custom' && (
                  <div className="flex flex-wrap items-center gap-1.5 bg-blue-50/60 px-2.5 py-1 rounded-lg border border-blue-200">
                    <Calendar className="w-3.5 h-3.5 text-[#1769AA]" />
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={e => setCustomDateFrom(e.target.value)}
                      aria-label="Registration date from"
                      className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-700"
                    />
                    <span className="text-[11px] text-slate-500">to</span>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={e => setCustomDateTo(e.target.value)}
                      aria-label="Registration date to"
                      className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-700"
                    />
                  </div>
                )}

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  aria-label="Filter users by account status"
                  className="px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
                >
                  <option value="all">All Account Status</option>
                  <option value="active">Active</option>
                  <option value="pending_approval">Pending Agent Approval ({stats.pendingAgentsCount || 0})</option>
                  <option value="rejected">Rejected</option>
                  <option value="unverified">Unverified</option>
                  <option value="suspended">Suspended ({stats.suspendedUsers})</option>
                </select>

                <select
                  value={providerFilter}
                  onChange={e => setProviderFilter(e.target.value as any)}
                  aria-label="Filter users by authentication provider"
                  className="px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
                >
                  <option value="all">All Auth Providers</option>
                  <option value="google">Google OAuth</option>
                  <option value="email_otp">Email / Password + OTP</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Registration ID &amp; User Profile</th>
                    <th className="p-4">Nationality &amp; Academic / Target University</th>
                    <th className="p-4">SSC / HSC &amp; Language</th>
                    <th className="p-4">Registration Date &amp; Status</th>
                    <th className="p-4">User Type</th>
                    <th className="p-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No registered user records match the current search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map(u => {
                      const uid = u.uid || u.id;
                      const displayName = u.fullName || u.name;
                      const photo = u.photoURL || u.avatarUrl;
                      const status = u.accountStatus || (u.emailVerified === false ? 'unverified' : 'active');
                      const acctType = u.accountType || u.role || 'student';
                      const regId =
                        u.registrationId ||
                        generateRegistrationId(uid, acctType, u.createdAt);
                      const academic = u.studentAcademicProfile;
                      const targetUni =
                        academic?.preferredUniversity || u.preferredUniversity || u.university || '';
                      const targetProgram =
                        academic?.interestedProgram ||
                        u.interestedProgram ||
                        academic?.currentMajor ||
                        u.major ||
                        academic?.desiredStudyLevel ||
                        u.preferredStudyLevel ||
                        '';

                      return (
                        <tr key={uid} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#10243A] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                {photo ? (
                                  <img src={photo} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                  displayName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#1769AA] font-mono text-[10px] font-bold">
                                    {regId}
                                  </span>
                                </div>
                                <div className="font-bold text-[#10243A] mt-0.5">{displayName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                                {(u.phoneNumber || u.phone) && (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {u.countryCode && !String(u.phoneNumber || u.phone).startsWith(u.countryCode)
                                      ? `${u.countryCode} `
                                      : ''}
                                    {u.phoneNumber || u.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold text-slate-800">
                              {u.nationality || u.countryOfResidence || 'International'}
                              {u.currentCity ? ` · ${u.currentCity}` : ''}
                            </div>
                            {acctType === 'student' ? (
                              <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                                <div>
                                  <span className="font-semibold text-[#1769AA]">
                                    {targetUni || 'Korean University'}
                                  </span>
                                  {targetProgram ? ` · ${targetProgram}` : ''}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Intake: {academic?.preferredIntake || u.preferredIntake || '—'} · Edu:{' '}
                                  {academic?.currentEducationLevel || u.studyLevel || '—'}
                                </div>
                              </div>
                            ) : acctType === 'agent' ? (
                              <div className="text-[11px] text-[#1769AA] font-semibold mt-0.5">
                                Agency: {u.agentPartnerProfile?.agencyName || displayName}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Lang: {(u.preferredLanguage || 'en').toUpperCase()}
                                {u.dateOfBirth ? ` · DOB: ${u.dateOfBirth}` : ''}
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            {acctType === 'student' ? (
                              <div className="space-y-0.5 font-mono text-[11px]">
                                <div className="text-slate-700">
                                  HSC: <strong>{academic?.hscGpa || '—'}</strong>{' '}
                                  <span className="text-slate-400">({academic?.hscPassingYear || '—'})</span>
                                </div>
                                <div className="text-slate-700">
                                  SSC: <strong>{academic?.sscGpa || '—'}</strong>{' '}
                                  <span className="text-slate-400">({academic?.sscPassingYear || '—'})</span>
                                </div>
                                <div className="text-[10px] text-[#1769AA] font-sans font-semibold">
                                  Korean: {academic?.koreanLanguageLevel || 'Beginner'}
                                </div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500">
                                <div>Type: <strong className="uppercase">{acctType}</strong></div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Pref Lang: {(u.preferredLanguage || 'en').toUpperCase()}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : status === 'pending_approval'
                                    ? 'bg-amber-100 text-amber-800'
                                    : status === 'suspended' || status === 'rejected'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {status}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {formatTimestamp(u.createdAt)}
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            <select
                              value={u.role}
                              onChange={e => handleRoleChange(u, e.target.value as UserRole)}
                              aria-label={`Change role for ${displayName}`}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 cursor-pointer"
                            >
                              <option value="student">student</option>
                              <option value="general">general</option>
                              <option value="agent">agent</option>
                              <option value="employer">employer</option>
                              <option value="landlord">landlord</option>
                              <option value="university">university</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>

                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            {acctType === 'agent' && status === 'pending_approval' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAgentApproval(u, 'approved')}
                                  className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                                  title="Approve Education Agent / Partner"
                                >
                                  Approve Agent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAgentApproval(u, 'rejected')}
                                  className="px-2 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                                  title="Reject Education Agent / Partner"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setInspectedUser(u);
                                setRevealedPassport(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-[#1769AA] hover:text-white hover:bg-[#1769AA] rounded-lg border border-blue-200 bg-blue-50/60 cursor-pointer transition-colors"
                              title="View complete user profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Profile</span>
                            </button>

                            {u.emailVerified === false && (
                              <button
                                type="button"
                                onClick={() => handleManualVerifyUser(u)}
                                className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                                title="Approve & mark emailVerified: true"
                              >
                                Verify
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStatusToggle(u)}
                              className={`p-1.5 rounded-lg border cursor-pointer ${
                                status === 'suspended'
                                  ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                  : 'text-amber-600 border-amber-200 hover:bg-amber-50'
                              }`}
                              title={status === 'suspended' ? 'Reactivate user' : 'Suspend user'}
                            >
                              {status === 'suspended' ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Ban className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUserRecord(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:bg-rose-50 cursor-pointer"
                              title="Delete user record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer Bar for Large Databases */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-slate-600">
                <span>
                  Showing{' '}
                  <strong className="text-[#10243A]">
                    {filteredUsers.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  –{' '}
                  <strong className="text-[#10243A]">
                    {Math.min(safeCurrentPage * pageSize, filteredUsers.length)}
                  </strong>{' '}
                  of <strong className="text-[#10243A]">{filteredUsers.length}</strong> matching users
                  {filteredUsers.length !== users.length && ` (filtered from ${users.length} total)`}
                </span>

                <div className="inline-flex items-center gap-1.5">
                  <span className="text-slate-500">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    aria-label="Rows per page"
                    className="px-2 py-1 rounded border border-slate-300 bg-white font-bold text-[#10243A] cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .slice(Math.max(0, safeCurrentPage - 3), Math.min(totalPages, safeCurrentPage + 2))
                  .map(pageNum => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${
                        pageNum === safeCurrentPage
                          ? 'bg-[#10243A] text-white border-[#10243A]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 2: `registration_logs` COLLECTION                 */}
        {/* ========================================================= */}
        {subTab === 'registration_logs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Registration ID &amp; Applicant</th>
                  <th className="p-4">Account Type</th>
                  <th className="p-4">Country &amp; Nationality</th>
                  <th className="p-4">Auth Provider &amp; OTP Status</th>
                  <th className="p-4">Registration Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No registration logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  registrationLogs.map(rlog => (
                    <tr key={rlog.id} className="hover:bg-slate-50/60">
                      <td className="p-4">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#1769AA] font-mono text-[10px] font-bold">
                          {rlog.registrationId ||
                            generateRegistrationId(rlog.uid, rlog.accountType, rlog.timestamp)}
                        </span>
                        <div className="font-bold text-[#10243A] mt-1">{rlog.fullName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{rlog.email}</div>
                        <div className="text-[10px] font-mono text-slate-400">uid: {rlog.uid}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1769AA] font-mono text-[10px] font-bold uppercase">
                          {rlog.accountType}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700">
                        {rlog.countryOfResidence} · {rlog.nationality}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold uppercase">
                          {rlog.authProvider} (Verified)
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {formatTimestamp(rlog.timestamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 3: `login_logs` COLLECTION                        */}
        {/* ========================================================= */}
        {subTab === 'login_logs' && (
          <div>
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginSearch}
                  onChange={e => setLoginSearch(e.target.value)}
                  placeholder="Filter login_logs by UID, email, or reason..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div className="flex items-center gap-2">
                {(['all', 'success', 'failure'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setLoginStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border uppercase cursor-pointer ${
                      loginStatusFilter === st
                        ? 'bg-[#10243A] text-white border-[#10243A]'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">UID &amp; Account</th>
                    <th className="p-4">Trusted Login Timestamp</th>
                    <th className="p-4">Provider</th>
                    <th className="p-4">Success / Failure</th>
                    <th className="p-4">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLoginLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No login activity logs match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLoginLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/60">
                        <td className="p-4">
                          <div className="font-mono font-bold text-[#10243A]">{log.uid}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{log.email}</div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-700">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1769AA] font-mono text-[10px] font-bold uppercase">
                            {log.provider}
                          </span>
                        </td>
                        <td className="p-4">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>SUCCESS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold uppercase">
                              <XCircle className="w-3 h-3" />
                              <span>FAILURE</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600">{log.reason || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 4: `admin_activity_logs` COLLECTION               */}
        {/* ========================================================= */}
        {subTab === 'admin_logs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Admin UID &amp; Identity</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target UID / Account</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Trusted Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No administrative actions logged yet.
                    </td>
                  </tr>
                ) : (
                  adminLogs.map(alog => (
                    <tr key={alog.id} className="hover:bg-slate-50/60">
                      <td className="p-4">
                        <div className="font-mono font-bold text-[#10243A]">{alog.adminUid}</div>
                        <div className="text-[11px] text-slate-500">
                          {alog.adminName} ({alog.adminEmail})
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-[10px] font-bold uppercase">
                          {alog.action}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-600">
                        <div>{alog.targetUid || '—'}</div>
                        {alog.targetEmail && <div className="text-slate-400">{alog.targetEmail}</div>}
                      </td>
                      <td className="p-4 text-slate-700">{alog.details}</td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {formatTimestamp(alog.timestamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 5: `otp_verifications` METADATA COLLECTION        */}
        {/* ========================================================= */}
        {subTab === 'otp_verifications' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-amber-50/60 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Applicant &amp; Email</th>
                  <th className="p-4">Selected Role</th>
                  <th className="p-4">Verification Metadata Status</th>
                  <th className="p-4">Attempts Used</th>
                  <th className="p-4">Requested / Verified / Expires At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {otpVerifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No OTP verification metadata records found.
                    </td>
                  </tr>
                ) : (
                  otpVerifications.map(otp => (
                    <tr key={otp.id} className="hover:bg-slate-50/60">
                      <td className="p-4">
                        <div className="font-bold text-[#10243A]">{otp.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{otp.email}</div>
                        {otp.uid && (
                          <div className="text-[10px] text-slate-400 font-mono">uid: {otp.uid}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1769AA] font-bold uppercase text-[10px]">
                          {otp.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            otp.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : otp.status === 'locked'
                              ? 'bg-rose-100 text-rose-800'
                              : otp.status === 'expired'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {otp.status}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Plaintext OTP never stored
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-700">
                        {otp.attemptsUsed} / {otp.maxAttempts}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        <div>Requested: {formatTimestamp(otp.requestedAt)}</div>
                        {otp.verifiedAt ? (
                          <div className="text-emerald-600 font-semibold">
                            Verified: {formatTimestamp(otp.verifiedAt)}
                          </div>
                        ) : (
                          <div className="text-slate-400">
                            Expires: {formatTimestamp(otp.expiresAt)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 6: `data_privacy_requests` COLLECTION             */}
        {/* ========================================================= */}
        {subTab === 'data_privacy_requests' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-rose-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">User &amp; UID</th>
                  <th className="p-4">Request Type</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Requested / Processed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataPrivacyRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No data privacy or deletion requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  dataPrivacyRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/60">
                      <td className="p-4">
                        <div className="font-bold text-[#10243A]">{req.fullName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{req.email}</div>
                        <div className="text-[10px] font-mono text-slate-400">uid: {req.uid}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px] font-bold uppercase">
                          {req.requestType}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700">{req.details}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold uppercase">
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        <div>Requested: {formatTimestamp(req.requestedAt)}</div>
                        {req.processedAt && (
                          <div className="text-emerald-600">Processed: {formatTimestamp(req.processedAt)}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* INSPECT COMPLETE USER, ACADEMIC & PASSPORT PROFILE MODAL  */}
      {/* ========================================================= */}
      {inspectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-fade-in my-6">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex flex-wrap items-center gap-2.5">
                <Lock className="w-4 h-4 text-[#1769AA]" />
                <h3 className="text-sm font-black text-[#10243A]">
                  Complete User Profile —{' '}
                  <span className="font-mono text-[#1769AA]">
                    {inspectedUser.registrationId ||
                      generateRegistrationId(
                        inspectedUser.uid || inspectedUser.id,
                        inspectedUser.accountType || inspectedUser.role,
                        inspectedUser.createdAt
                      )}
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportToExcel('filtered', inspectedUser)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Profile (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInspectedUser(null);
                    setRevealedPassport(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Standardized 20-Field Registration Summary Grid */}
              {(() => {
                const row = buildUserExcelRow(inspectedUser);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px]">
                    {Object.entries(row).map(([label, val]) => (
                      <div key={label} className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                          {label}
                        </span>
                        <span className="font-bold text-[#10243A] break-words mt-0.5 block">
                          {val || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Student Academic Transcripts & Multiple Education Records */}
              {inspectedUser.educationRecords && inspectedUser.educationRecords.length > 0 && (
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
                  <div className="font-bold text-[#10243A] flex items-center gap-1.5 text-xs">
                    <BookOpen className="w-4 h-4 text-[#1769AA]" />
                    <span>
                      Submitted Education Qualifications ({inspectedUser.educationRecords.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {inspectedUser.educationRecords.map((rec, idx) => (
                      <div
                        key={rec.id || idx}
                        className="p-2.5 rounded-lg bg-white border border-blue-100 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                      >
                        <div>
                          <strong>{rec.level}</strong> — {rec.institution}
                          {rec.boardOrUniversity ? ` (${rec.boardOrUniversity})` : ''}
                        </div>
                        <div className="font-mono text-slate-600">
                          Year: <strong>{rec.passingYear}</strong> · GPA: <strong>{rec.gpaOrGrade}</strong>
                          {rec.majorOrGroup ? ` · ${rec.majorOrGroup}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Agent / Partner Profile */}
              {inspectedUser.agentPartnerProfile && (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#10243A] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-700" />
                      <span>Education Agent / Partner Organization</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-amber-300">
                      Status: {inspectedUser.agentPartnerProfile.approvalStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Agency Name:</span>
                      <strong>{inspectedUser.agentPartnerProfile.agencyName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Contact Person:</span>
                      <strong>{inspectedUser.agentPartnerProfile.contactPerson}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Business Email:</span>
                      <strong>{inspectedUser.agentPartnerProfile.businessEmail}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Experience / Website:</span>
                      <strong>
                        {inspectedUser.agentPartnerProfile.yearsOfExperience || '—'} ·{' '}
                        {inspectedUser.agentPartnerProfile.website || '—'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Encrypted Passport Vault Section (Masked by Default + Audited Admin Reveal) */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#19B6A4]" />
                    <span className="font-bold text-xs">
                      AES-256-GCM Encrypted Passport Vault (Never Exported to Excel)
                    </span>
                  </div>
                  {inspectedUser.passportMetadata?.hasPassportSaved && (
                    <button
                      type="button"
                      disabled={isRevealingPassport}
                      onClick={() => handleRevealPassport(inspectedUser)}
                      className="px-3 py-1 rounded-lg bg-[#19B6A4] text-[#10243A] font-bold text-[11px] hover:bg-[#19B6A4]/90 cursor-pointer"
                    >
                      {isRevealingPassport
                        ? 'Decrypting...'
                        : revealedPassport
                        ? 'Re-Verify Vault'
                        : 'Reveal Sensitive Passport (Audit Logged)'}
                    </button>
                  )}
                </div>

                {inspectedUser.passportMetadata?.hasPassportSaved ? (
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                    <div>
                      <span className="text-slate-400 block">Passport Number:</span>
                      <strong className="text-[#19B6A4]">
                        {revealedPassport &&
                        revealedPassport.uid === (inspectedUser.uid || inspectedUser.id)
                          ? revealedPassport.passportNumber
                          : inspectedUser.passportMetadata.passportNumberMasked || '******'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Issue Date:</span>
                      <span>
                        {revealedPassport?.passportIssueDate ||
                          inspectedUser.passportMetadata.passportIssueDate ||
                          '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Expiry Date:</span>
                      <span>
                        {revealedPassport?.passportExpiryDate ||
                          inspectedUser.passportMetadata.passportExpiryDate ||
                          '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    This user chose not to submit optional passport details during registration.
                  </p>
                )}
              </div>

              {/* Uploaded Student Portal Documents & University Application History */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-[#10243A] flex items-center justify-between">
                    <span>Uploaded Documents ({studentDocs.length})</span>
                  </div>
                  {studentDocs.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      No documents uploaded in Student Portal yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {studentDocs.map(docItem => (
                        <div
                          key={docItem.documentId}
                          className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="truncate">
                            <div className="font-bold text-[#10243A] truncate">{docItem.category}</div>
                            <div className="text-[10px] text-slate-500 truncate">{docItem.fileName}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1769AA] font-bold text-[10px] shrink-0">
                            {docItem.verificationStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-[#10243A] flex items-center justify-between">
                    <span>Application History ({studentApps.length})</span>
                  </div>
                  {studentApps.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      No university applications submitted yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {studentApps.map(appItem => (
                        <div
                          key={appItem.applicationId}
                          className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="truncate">
                            <div className="font-bold text-[#10243A] truncate">
                              {appItem.universityName}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {appItem.programName} · {appItem.intake}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] shrink-0">
                            {appItem.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Internal Admin Notes (Admin Only) */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                <div className="font-bold text-[#10243A] text-xs">
                  Internal Administrator Notes (Never visible to student)
                </div>
                <textarea
                  rows={2}
                  value={internalNoteDraft}
                  onChange={e => setInternalNoteDraft(e.target.value)}
                  placeholder="Add confidential admission counseling or document verification notes for this student..."
                  className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isSavingInternalNote}
                    onClick={async () => {
                      const uid = inspectedUser.uid || inspectedUser.id;
                      setIsSavingInternalNote(true);
                      try {
                        await adminUpdateUserDoc({
                          targetUid: uid,
                          targetEmail: inspectedUser.email,
                          targetName: inspectedUser.fullName || inspectedUser.name,
                          updates: { adminInternalNotes: internalNoteDraft },
                          adminUser: currentUser
                        });
                        setUsers(prev =>
                          prev.map(u =>
                            (u.uid || u.id) === uid
                              ? { ...u, adminInternalNotes: internalNoteDraft }
                              : u
                          )
                        );
                        setInspectedUser(prev =>
                          prev ? { ...prev, adminInternalNotes: internalNoteDraft } : null
                        );
                        showToast('Saved internal administrator notes for student.');
                      } finally {
                        setIsSavingInternalNote(false);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#10243A] hover:bg-[#1769AA] text-white font-bold text-xs cursor-pointer"
                  >
                    {isSavingInternalNote ? 'Saving...' : 'Save Internal Notes'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInspectedUser(null);
                    setRevealedPassport(null);
                  }}
                  className="px-4 py-2 bg-[#10243A] text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Close Profile Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
