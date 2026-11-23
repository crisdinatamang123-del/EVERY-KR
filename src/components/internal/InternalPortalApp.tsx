import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  Phone,
  Globe,
  Building2,
  Briefcase,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  LogOut,
  ArrowRight,
  KeyRound,
  FileText,
  Users,
  GraduationCap,
  FolderCheck,
  Smartphone,
  MessageSquare,
  BarChart3,
  Bell,
  Settings,
  Trash2,
  UserCheck,
  Upload,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  InternalAccessRequestRecord,
  StaffRoleType,
  StaffPermissionKey,
  ContactSubmissionRecord,
  StaffMemberRecord,
  AdminPlatformNotification
} from '../../types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  registerInternalEmployeeClient,
  loginInternalPortalClient,
  fetchInternalPortalSessionClient,
  logoutInternalPortalClient,
  getCachedInternalPortalEmployee,
  fetchAdminPlatformNotificationsDoc,
  markAdminNotificationReadDoc,
  fetchStaffMembersDoc,
  getAdminRequestHeaders
} from '../../services/firebaseService';
import {
  fetchContactSubmissions
} from '../../services/contactSubmissionService';
import {
  EVERYKR_INTERNAL_DEPARTMENTS,
  ASSIGNABLE_INTERNAL_ROLES,
  AdminInternalRequestsTab
} from '../admin/AdminInternalRequestsTab';
import { AdminUserManagementTab } from '../admin/AdminUserManagementTab';
import { AdminUniversityManagerTab } from '../admin/AdminUniversityManagerTab';
import { AdminApplicationsTab } from '../admin/AdminApplicationsTab';
import { AdminDocumentsTab } from '../admin/AdminDocumentsTab';
import { AdminSimApplicationsTab } from '../admin/AdminSimApplicationsTab';
import { AdminCommunityControlTab } from '../admin/AdminCommunityControlTab';
import { AdminContactInboxTab } from '../admin/AdminContactInboxTab';
import { AdminStaffManagementTab } from '../admin/AdminStaffManagementTab';
import { AdminAnalyticsReportsTab } from '../admin/AdminAnalyticsReportsTab';
import { AdminGlobalTrashTab } from '../admin/AdminGlobalTrashTab';
import { AdminView } from '../AdminView';
import { COUNTRIES_DATA } from '../../data/countriesData';
import { EveryKrAnimatedLogo } from '../common/EveryKrAnimatedLogo';

const ALL_WORLD_COUNTRIES = COUNTRIES_DATA;
const EveryKrHeaderLogo: React.FC<{ isNight?: boolean; className?: string; imgClassName?: string }> = ({
  isNight = true,
  className,
  imgClassName = 'h-8 sm:h-9',
}) => (
  <EveryKrAnimatedLogo
    variant="compact"
    isNight={isNight}
    imgClassName={imgClassName}
    className={className}
  />
);

type InternalPortalViewMode =
  | 'login'
  | 'register'
  | 'forgot_password'
  | 'pending_approval'
  | 'rejected'
  | 'student_denied'
  | 'deactivated'
  | 'dashboard';

type InternalDashboardModuleId =
  | 'overview'
  | 'internal_requests'
  | 'student_management'
  | 'admissions_management'
  | 'application_management'
  | 'document_verification'
  | 'sim_applications'
  | 'community_moderation'
  | 'contact_inbox'
  | 'employee_management'
  | 'global_trash'
  | 'reports_analytics'
  | 'internal_notifications'
  | 'profile_settings'
  | 'full_master_console';

interface InternalPortalAppProps {
  initialView?: 'login' | 'register' | 'dashboard' | 'pending' | 'rejected';
}

export const InternalPortalApp: React.FC<InternalPortalAppProps> = ({ initialView }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentUser,
    isServerVerifiedAdmin,
    universitiesList,
    addUniversity,
    updateUniversity,
    deleteUniversity,
    showToast
  } = useApp();

  // Determine view from URL path or prop
  const resolveViewFromPath = useCallback((): InternalPortalViewMode => {
    const p = location.pathname.toLowerCase();
    if (initialView === 'register' || p.endsWith('/register') || p.endsWith('/signup')) {
      return 'register';
    }
    if (initialView === 'pending' || p.endsWith('/pending')) {
      return 'pending_approval';
    }
    if (initialView === 'rejected' || p.endsWith('/rejected')) {
      return 'rejected';
    }
    if (p.endsWith('/forgot-password')) {
      return 'forgot_password';
    }
    return 'login';
  }, [location.pathname, initialView]);

  const [viewMode, setViewMode] = useState<InternalPortalViewMode>(resolveViewFromPath);
  const [activeEmployee, setActiveEmployee] = useState<InternalAccessRequestRecord | null>(() =>
    getCachedInternalPortalEmployee()
  );
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [activeModule, setActiveModule] = useState<InternalDashboardModuleId>('overview');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Registration Form State (12 Required & Optional Fields)
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhoneNumber, setRegPhoneNumber] = useState<string>('');
  const [regWhatsappNumber, setRegWhatsappNumber] = useState<string>('');
  const [regCountry, setRegCountry] = useState<string>('South Korea');
  const [regDepartment, setRegDepartment] = useState<string>(EVERYKR_INTERNAL_DEPARTMENTS[1]);
  const [regRequestedPosition, setRegRequestedPosition] =
    useState<StaffRoleType>('Student Counselor');
  const [regEmployeeId, setRegEmployeeId] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regAdditionalInfo, setRegAdditionalInfo] = useState<string>('');
  const [regPhotoDataUrl, setRegPhotoDataUrl] = useState<string>('');
  const [regError, setRegError] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetSentMessage, setResetSentMessage] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  // Dashboard Supporting Data
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmissionRecord[]>([]);
  const [staffMembersList, setStaffMembersList] = useState<StaffMemberRecord[]>([]);
  const [internalNotifications, setInternalNotifications] = useState<AdminPlatformNotification[]>(
    []
  );

  // Sync session on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsCheckingSession(true);
      try {
        const sessionRes = await fetchInternalPortalSessionClient();
        if (!mounted) return;
        if (sessionRes.ok && sessionRes.employee) {
          setActiveEmployee(sessionRes.employee);
          setViewMode('dashboard');
          return;
        }

        // If user is already logged in on main site as Super Admin, grant seamless Internal Portal access
        if (currentUser && isServerVerifiedAdmin && currentUser.email) {
          const autoAdminRes = await loginInternalPortalClient({
            email: currentUser.email
          });
          if (mounted && autoAdminRes.ok && autoAdminRes.employee) {
            setActiveEmployee(autoAdminRes.employee);
            setViewMode('dashboard');
            return;
          }
        }

        // If a regular student is signed in on the browser and visits internal.everykr.com, block immediately
        if (currentUser && !isServerVerifiedAdmin && currentUser.role !== 'admin') {
          setStatusMessage(
            'Access Denied (HTTP 403): Student and visitor accounts cannot access the EveryKR Internal Employee & Admin Portal (internal.everykr.com). Please return to https://everykr.com.'
          );
          setViewMode('student_denied');
          return;
        }

        setViewMode(resolveViewFromPath());
      } finally {
        if (mounted) setIsCheckingSession(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUser, isServerVerifiedAdmin, resolveViewFromPath]);

  // Load supporting data when on dashboard
  const loadInternalDashboardSupportData = useCallback(async () => {
    if (!activeEmployee) return;
    try {
      const [contacts, staff, notifs] = await Promise.all([
        fetchContactSubmissions().catch(() => []),
        fetchStaffMembersDoc().catch(() => []),
        fetchAdminPlatformNotificationsDoc().catch(() => [])
      ]);
      setContactSubmissions(contacts);
      setStaffMembersList(staff);
      setInternalNotifications(notifs);
    } catch {
      // ignore
    }
  }, [activeEmployee]);

  useEffect(() => {
    if (viewMode === 'dashboard' && activeEmployee) {
      loadInternalDashboardSupportData();
    }
  }, [viewMode, activeEmployee, loadInternalDashboardSupportData]);

  // Handle Optional Profile Photo Upload (converts to compact data URL)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setRegError('Profile photo must be under 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRegPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Internal Login Submission
  const handleInternalLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter both your email address and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await loginInternalPortalClient({
        email: loginEmail.trim(),
        password: loginPassword
      });

      if (res.ok && res.employee) {
        setActiveEmployee(res.employee);
        setViewMode('dashboard');
        showToast(`Welcome to EveryKR Internal Portal, ${res.employee.fullName}`);
        return;
      }

      if (res.status === 'pending_approval' || res.status === 'info_requested') {
        setActiveEmployee(res.employee || null);
        setStatusMessage(res.message);
        setViewMode('pending_approval');
        return;
      }

      if (res.status === 'rejected') {
        setActiveEmployee(res.employee || null);
        setStatusMessage(res.message);
        setViewMode('rejected');
        return;
      }

      if (res.status === 'deactivated') {
        setActiveEmployee(res.employee || null);
        setStatusMessage(res.message);
        setViewMode('deactivated');
        return;
      }

      if (res.status === 'student_denied') {
        setStatusMessage(res.message);
        setViewMode('student_denied');
        return;
      }

      setLoginError(res.message || 'Incorrect email or password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Internal Employee Registration Submission
  const handleInternalRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regFullName.trim()) {
      setRegError('Full Name is required.');
      return;
    }
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setRegError('A valid Email Address is required.');
      return;
    }
    if (!regPhoneNumber.trim()) {
      setRegError('Phone Number is required.');
      return;
    }
    if (!regWhatsappNumber.trim()) {
      setRegError('WhatsApp Number is required.');
      return;
    }
    if (!regCountry.trim()) {
      setRegError('Country is required.');
      return;
    }
    if (!regDepartment.trim()) {
      setRegError('Department is required.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await registerInternalEmployeeClient({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phoneNumber: regPhoneNumber.trim(),
        whatsappNumber: regWhatsappNumber.trim(),
        country: regCountry.trim(),
        department: regDepartment,
        requestedPosition: regRequestedPosition,
        employeeId: regEmployeeId.trim() || undefined,
        password: regPassword,
        additionalInfo: regAdditionalInfo.trim() || undefined,
        photoURL: regPhotoDataUrl || undefined
      });

      if (!res.ok) {
        setRegError(res.message || 'Could not submit employee registration.');
        return;
      }

      setActiveEmployee(res.requestRecord || null);
      setStatusMessage(
        'Your employee registration has been submitted. Your account is currently pending administrator approval. You will be able to access the EveryKR Internal Portal once an administrator approves your request.'
      );
      setViewMode('pending_approval');
      showToast('Employee registration submitted — pending administrator approval.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Forgot Password Submission
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setIsSendingReset(true);
    setResetSentMessage('');
    try {
      await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() })
      });
      setResetSentMessage(
        'If an internal account exists for this email address, a secure password reset link has been sent.'
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  // Handle Secure Logout
  const handleInternalLogout = async () => {
    await logoutInternalPortalClient();
    setActiveEmployee(null);
    setLoginPassword('');
    setViewMode('login');
    showToast('Signed out of EveryKR Internal Portal.');
  };

  // Compute authorized modules for the logged-in employee
  const authorizedModules = useMemo(() => {
    if (!activeEmployee) return [];
    const role: StaffRoleType =
      activeEmployee.assignedRole || activeEmployee.requestedPosition || 'Employee';
    const isSuperOrAdmin = role === 'Super Admin' || role === 'Admin';
    const perms: StaffPermissionKey[] =
      Array.isArray(activeEmployee.permissions) && activeEmployee.permissions.length > 0
        ? activeEmployee.permissions
        : DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.Employee;

    const hasPerm = (key: StaffPermissionKey) => isSuperOrAdmin || perms.includes(key);

    const allModules: {
      id: InternalDashboardModuleId;
      label: string;
      description: string;
      icon: React.FC<{ className?: string }>;
      allowed: boolean;
    }[] = [
      {
        id: 'overview',
        label: 'Admin Dashboard',
        description: 'Role overview, operational KPIs & quick actions',
        icon: Shield,
        allowed: true
      },
      {
        id: 'internal_requests',
        label: 'Internal Access Requests',
        description: 'Approve/reject employee registrations & assign roles',
        icon: UserCheck,
        allowed: isSuperOrAdmin || hasPerm('manage_staff')
      },
      {
        id: 'student_management',
        label: 'Student Management',
        description: 'Registered students, profiles & verification status',
        icon: Users,
        allowed: hasPerm('manage_students')
      },
      {
        id: 'admissions_management',
        label: 'Admissions Management',
        description: 'University directory, requirements & scholarships',
        icon: GraduationCap,
        allowed: hasPerm('manage_universities') || hasPerm('manage_programs')
      },
      {
        id: 'application_management',
        label: 'Application Management',
        description: 'Student university applications & status workflow',
        icon: FileText,
        allowed: hasPerm('manage_applications')
      },
      {
        id: 'document_verification',
        label: 'Document Verification',
        description: 'Verify student transcripts, passports & bank statements',
        icon: FolderCheck,
        allowed: hasPerm('verify_documents')
      },
      {
        id: 'sim_applications',
        label: 'SIM Applications',
        description: 'Airport SIM pickups, arrival groups & ZIP exports',
        icon: Smartphone,
        allowed: hasPerm('manage_sim_applications') || hasPerm('manage_arrival_groups')
      },
      {
        id: 'community_moderation',
        label: 'Community Moderation',
        description: 'Moderate student posts, comments & community safety',
        icon: MessageSquare,
        allowed: hasPerm('manage_community')
      },
      {
        id: 'contact_inbox',
        label: 'Contact Inbox',
        description: 'Respond to visitor & student support inquiries',
        icon: Mail,
        allowed: isSuperOrAdmin || role === 'Support Staff' || hasPerm('manage_students')
      },
      {
        id: 'employee_management',
        label: 'Employee Management',
        description: 'Manage active staff directory & RBAC permissions',
        icon: Briefcase,
        allowed: isSuperOrAdmin || hasPerm('manage_staff')
      },
      {
        id: 'global_trash',
        label: 'Global Trash / Recycle Bin',
        description: 'Restore or permanently purge deleted records safely',
        icon: Trash2,
        allowed: isSuperOrAdmin
      },
      {
        id: 'reports_analytics',
        label: 'Reports and Analytics',
        description: 'Operational metrics & audited Excel/CSV exports',
        icon: BarChart3,
        allowed: hasPerm('export_reports') || hasPerm('view_audit_logs')
      },
      {
        id: 'internal_notifications',
        label: 'Internal Notifications',
        description: 'Real-time operational & security alerts',
        icon: Bell,
        allowed: true
      },
      {
        id: 'profile_settings',
        label: 'Profile and Account Settings',
        description: 'Your employee credentials, department & permissions',
        icon: Settings,
        allowed: true
      }
    ];

    if (isSuperOrAdmin) {
      allModules.push({
        id: 'full_master_console',
        label: 'Full Master Admin Console',
        description: 'Complete 13-Module EveryKR Governance Console',
        icon: Globe,
        allowed: true
      });
    }

    return allModules.filter(m => m.allowed);
  }, [activeEmployee]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#071120] text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <EveryKrAnimatedLogo variant="compact" isNight={true} imgClassName="h-10 sm:h-12" />
          <RefreshCw className="w-6 h-6 text-[#19B6A4] animate-spin" />
          <div className="text-xs font-mono uppercase tracking-widest text-slate-300">
            Verifying EveryKR Internal Portal Security Session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071120] text-slate-100 flex flex-col">
      {/* Top Internal Portal Security Bar */}
      <header className="w-full bg-[#0B192E] border-b border-slate-800/90 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <EveryKrHeaderLogo isNight={true} imgClassName="h-8 sm:h-9" />
            <div className="h-5 w-px bg-slate-700 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wide text-white uppercase">
                  EveryKR Internal Portal
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#19B6A4]/15 text-[#19B6A4] border border-[#19B6A4]/30">
                  internal.everykr.com
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Authorized Employees, Counselors, Moderators &amp; Administrators Only
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {viewMode === 'dashboard' && activeEmployee ? (
              <>
                <div className="hidden md:flex flex-col items-end text-right mr-1">
                  <span className="text-xs font-bold text-white">{activeEmployee.fullName}</span>
                  <span className="text-[11px] font-mono text-[#19B6A4]">
                    {activeEmployee.assignedRole || activeEmployee.requestedPosition} ·{' '}
                    {activeEmployee.assignedDepartment || activeEmployee.department}
                  </span>
                </div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#19B6A4]" />
                  <span>Main Website (everykr.com)</span>
                </Link>
                <button
                  type="button"
                  onClick={handleInternalLogout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    navigate('/internal/login');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    viewMode === 'login'
                      ? 'bg-[#19B6A4] text-[#071120]'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  Employee Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('register');
                    navigate('/internal/register');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    viewMode === 'register'
                      ? 'bg-[#19B6A4] text-[#071120]'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  Employee Registration
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <span>Student Site →</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 1. STUDENT ACCOUNT ACCESS DENIED (HTTP 403)                       */}
      {/* ================================================================= */}
      {viewMode === 'student_denied' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#0F2138] border border-rose-500/40 rounded-2xl p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 text-[11px] font-mono font-bold">
              HTTP 403 FORBIDDEN · INTERNAL STAFF ONLY
            </div>
            <h1 className="text-xl font-black text-white">
              Student Accounts Cannot Access the Internal Portal
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {statusMessage ||
                'The EveryKR Internal Portal (internal.everykr.com) is strictly restricted to verified EveryKR administrators, counselors, admission managers, and operational staff. Student accounts do not have permission to view internal resources.'}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#19B6A4] text-[#071120] hover:bg-[#19B6A4]/90 transition-colors"
              >
                <span>Return to Student Website (everykr.com)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={handleInternalLogout}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                Switch to Staff Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. ACCOUNT PENDING ADMINISTRATOR APPROVAL SCREEN                  */}
      {/* ================================================================= */}
      {viewMode === 'pending_approval' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-[#0F2138] border border-amber-500/40 rounded-2xl p-8 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  Status: Pending Administrator Approval
                </span>
                <h1 className="text-xl font-black text-white">
                  Employee Registration Pending Review
                </h1>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-100 leading-relaxed">
              Your employee registration has been submitted. Your account is currently pending administrator approval. You will be able to access the EveryKR Internal Portal once an administrator approves your request.
            </div>

            {activeEmployee && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#091526] border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Applicant Name
                  </span>
                  <span className="font-bold text-white">{activeEmployee.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Email Address
                  </span>
                  <span className="font-mono text-slate-200">{activeEmployee.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Requested Department
                  </span>
                  <span className="font-semibold text-[#19B6A4]">{activeEmployee.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Requested Position
                  </span>
                  <span className="font-semibold text-white">
                    {activeEmployee.requestedPosition}
                  </span>
                </div>
                {activeEmployee.infoRequestMessage && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-800 text-sky-300">
                    <span className="font-bold block text-[10px] uppercase">
                      Administrator Information Request:
                    </span>
                    {activeEmployee.infoRequestMessage}
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-slate-400 leading-relaxed">
              Once an EveryKR Super Administrator reviews and approves your application, you will receive an official confirmation email at your registered address with subject{' '}
              <strong className="text-slate-200">
                &ldquo;Your EveryKR Internal Account Has Been Approved&rdquo;
              </strong>
              .
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                ← Back to Internal Sign In
              </button>
              <a
                href="mailto:support@everykr.com"
                className="text-xs font-bold text-[#19B6A4] hover:underline"
              >
                Contact HR / Support (support@everykr.com)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. APPLICATION REJECTED OR DEACTIVATED SCREEN                     */}
      {/* ================================================================= */}
      {(viewMode === 'rejected' || viewMode === 'deactivated') && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#0F2138] border border-rose-500/40 rounded-2xl p-8 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <XCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-white">
              {viewMode === 'deactivated'
                ? 'Internal Employee Account Deactivated'
                : 'Internal Portal Access Request Not Approved'}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {statusMessage ||
                'Your EveryKR Internal Portal account is not currently active. Please contact your department supervisor or support@everykr.com for assistance.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. INTERNAL PORTAL LOGIN SCREEN                                   */}
      {/* ================================================================= */}
      {viewMode === 'login' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0F2138] border border-slate-800 rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#19B6A4]/15 text-[#19B6A4] text-[11px] font-mono font-bold mb-3">
                <Lock className="w-3.5 h-3.5" />
                <span>STAFF &amp; ADMIN AUTHENTICATION</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                EveryKR Internal Sign In
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Sign in with your approved EveryKR employee or administrator credentials. Students must use{' '}
                <Link to="/login" className="text-[#19B6A4] hover:underline font-semibold">
                  everykr.com/login
                </Link>
                .
              </p>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleInternalLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Official / Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="name@everykr.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-xs text-white focus:border-[#19B6A4] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setViewMode('forgot_password')}
                    className="text-[11px] font-semibold text-[#19B6A4] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-xs text-white focus:border-[#19B6A4] outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl text-xs font-extrabold bg-[#19B6A4] hover:bg-[#19B6A4]/90 text-[#071120] shadow-lg cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Internal Access...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Sign In to Internal Portal</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800 text-center space-y-2">
              <div className="text-xs text-slate-400">
                New EveryKR employee, counselor, or staff member?
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewMode('register');
                  navigate('/internal/register');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer transition-colors"
              >
                Request Employee Account Registration →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. FORGOT PASSWORD SCREEN                                         */}
      {/* ================================================================= */}
      {viewMode === 'forgot_password' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0F2138] border border-slate-800 rounded-2xl p-7 sm:p-8 shadow-2xl space-y-5">
            <h1 className="text-xl font-black text-white">Reset Internal Portal Password</h1>
            <p className="text-xs text-slate-400">
              Enter your registered employee email address to receive a single-use password reset link.
            </p>
            {resetSentMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200">
                {resetSentMessage}
              </div>
            )}
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="name@everykr.com"
                className="w-full px-4 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-xs text-white"
              />
              <button
                type="submit"
                disabled={isSendingReset}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-[#19B6A4] text-[#071120] cursor-pointer"
              >
                {isSendingReset ? 'Sending Reset Link...' : 'Send Password Reset Link'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setViewMode('login')}
              className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              ← Return to Internal Sign In
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 6. INTERNAL EMPLOYEE REGISTRATION PAGE (/internal/register)       */}
      {/* ================================================================= */}
      {viewMode === 'register' && (
        <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-[#0F2138] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#19B6A4]/15 text-[#19B6A4] text-[11px] font-mono font-bold mb-2">
                <UserCheck className="w-3.5 h-3.5" />
                <span>INTERNAL STAFF ONBOARDING · ADMIN APPROVAL REQUIRED</span>
              </div>
              <h1 className="text-2xl font-black text-white">
                EveryKR Internal Employee Registration
              </h1>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Complete this form to apply for an internal EveryKR employee account on{' '}
                <code className="text-[#19B6A4] font-mono">internal.everykr.com</code>. All new staff accounts require verification and role assignment by an EveryKR Super Administrator before internal access is granted.
              </p>
            </div>

            {regError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleInternalRegisterSubmit} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Full Name */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    1. Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Soyeon Park"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                  />
                </div>

                {/* 2. Email Address */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    2. Official / Work Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="name@everykr.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                  />
                </div>

                {/* 3. Phone Number */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    3. Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={regPhoneNumber}
                    onChange={e => setRegPhoneNumber(e.target.value)}
                    placeholder="+82-10-XXXX-XXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                  />
                </div>

                {/* 4. WhatsApp Number */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    4. WhatsApp Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={regWhatsappNumber}
                    onChange={e => setRegWhatsappNumber(e.target.value)}
                    placeholder="+82-10-XXXX-XXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                  />
                </div>

                {/* 5. Country */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    5. Country <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={regCountry}
                    onChange={e => setRegCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                  >
                    {ALL_WORLD_COUNTRIES.map(c => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Department */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    6. Department <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={regDepartment}
                    onChange={e => setRegDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                  >
                    {EVERYKR_INTERNAL_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 7. Position / Role Requested */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    7. Position / Role Requested <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={regRequestedPosition}
                    onChange={e => setRegRequestedPosition(e.target.value as StaffRoleType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                  >
                    {ASSIGNABLE_INTERNAL_ROLES.filter(r => r !== 'Super Admin').map(role => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 8. Employee ID (Optional) */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    8. Employee ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regEmployeeId}
                    onChange={e => setRegEmployeeId(e.target.value)}
                    placeholder="e.g. EKR-EMP-112"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden font-mono"
                  />
                </div>

                {/* 9. Password */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    9. Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                  />
                </div>

                {/* 10. Confirm Password */}
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    10. Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                  />
                </div>
              </div>

              {/* 11. Additional Information / Notes */}
              <div>
                <label className="block font-bold text-slate-200 mb-1">
                  11. Additional Information / Experience Notes{' '}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={regAdditionalInfo}
                  onChange={e => setRegAdditionalInfo(e.target.value)}
                  placeholder="Briefly describe your role, supervisor name, or operational responsibilities at EveryKR..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-slate-700 text-white focus:border-[#19B6A4] outline-hidden"
                />
              </div>

              {/* 12. Profile Photo Upload (Optional) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#071120] border border-slate-800">
                <div>
                  <div className="font-bold text-slate-200">
                    12. Official Staff Profile Photograph{' '}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    PNG or JPG up to 3 MB for internal staff directory identification.
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5 text-[#19B6A4]" />
                  <span>{regPhotoDataUrl ? 'Change Photo' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    navigate('/internal/login');
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  ← Already have an approved account? Sign In
                </button>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-extrabold bg-[#19B6A4] hover:bg-[#19B6A4]/90 text-[#071120] shadow-lg cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Submit Employee Registration for Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 7. ROLE-BASED INTERNAL PORTAL DASHBOARD                           */}
      {/* ================================================================= */}
      {viewMode === 'dashboard' && activeEmployee && (
        <div className="flex-1 bg-[#F5F7FA] dark:bg-[#0B1523] text-[#10243A] dark:text-slate-100">
          {activeModule === 'full_master_console' ? (
            <div>
              <div className="bg-[#10243A] border-b border-white/10 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-[#19B6A4]">
                  Viewing Full Master Administrative Console
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModule('overview')}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  ← Back to Role-Based Internal Workspace
                </button>
              </div>
              <AdminView />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
              {/* Role-Based Module Navigation Strip */}
              <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1769AA] dark:text-[#19B6A4]">
                    Authorized Internal Portal Modules ({authorizedModules.length}) · Role:{' '}
                    {activeEmployee.assignedRole || activeEmployee.requestedPosition}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Department: {activeEmployee.assignedDepartment || activeEmployee.department}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {authorizedModules.map(mod => {
                    const Icon = mod.icon;
                    const isSelected = activeModule === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setActiveModule(mod.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#10243A] text-white dark:bg-[#19B6A4] dark:text-[#10243A]'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{mod.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MODULE: OVERVIEW */}
              {activeModule === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-[#10243A] rounded-2xl p-6 sm:p-8 text-white border border-white/10 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#19B6A4]/20 text-[#19B6A4] text-xs font-mono font-bold mb-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            VERIFIED INTERNAL SESSION ·{' '}
                            {(
                              activeEmployee.assignedRole || activeEmployee.requestedPosition
                            ).toUpperCase()}
                          </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white">
                          Welcome, {activeEmployee.fullName}
                        </h1>
                        <p className="text-xs text-slate-300 mt-1">
                          Department: {activeEmployee.assignedDepartment || activeEmployee.department}{' '}
                          · Employee ID: {activeEmployee.employeeId || 'EKR-STAFF'} · Email:{' '}
                          {activeEmployee.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {authorizedModules
                      .filter(m => m.id !== 'overview')
                      .map(mod => {
                        const Icon = mod.icon;
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => setActiveModule(mod.id)}
                            className="text-left bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-[#1769AA] dark:hover:border-[#19B6A4] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                          >
                            <div>
                              <div className="w-10 h-10 rounded-xl bg-[#10243A] dark:bg-[#1769AA] text-white flex items-center justify-center mb-3.5">
                                <Icon className="w-5 h-5" />
                              </div>
                              <h3 className="text-sm font-extrabold text-[#10243A] dark:text-white group-hover:text-[#1769AA] dark:group-hover:text-[#19B6A4]">
                                {mod.label}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {mod.description}
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#1769AA] dark:text-[#19B6A4]">
                              <span>Open Module</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* MODULE: INTERNAL ACCESS REQUESTS */}
              {activeModule === 'internal_requests' && (
                <AdminInternalRequestsTab
                  adminUid={activeEmployee.uid}
                  adminName={activeEmployee.fullName}
                  adminEmail={activeEmployee.email}
                  onToast={showToast}
                />
              )}

              {/* MODULE: STUDENT MANAGEMENT */}
              {activeModule === 'student_management' && (
                <AdminUserManagementTab
                  currentUser={{
                    id: activeEmployee.uid,
                    uid: activeEmployee.uid,
                    name: activeEmployee.fullName,
                    fullName: activeEmployee.fullName,
                    email: activeEmployee.email,
                    role: 'admin',
                    nationality: activeEmployee.country,
                    currentCity: 'Seoul',
                    preferredLanguage: 'en'
                  }}
                  showToast={showToast}
                />
              )}

              {/* MODULE: ADMISSIONS MANAGEMENT */}
              {activeModule === 'admissions_management' && <AdminUniversityManagerTab />}

              {/* MODULE: APPLICATION MANAGEMENT */}
              {activeModule === 'application_management' && <AdminApplicationsTab />}

              {/* MODULE: DOCUMENT VERIFICATION */}
              {activeModule === 'document_verification' && <AdminDocumentsTab />}

              {/* MODULE: SIM APPLICATIONS */}
              {activeModule === 'sim_applications' && (
                <AdminSimApplicationsTab
                  adminUid={activeEmployee.uid}
                  adminName={activeEmployee.fullName}
                  adminEmail={activeEmployee.email}
                  onToast={showToast}
                />
              )}

              {/* MODULE: COMMUNITY MODERATION */}
              {activeModule === 'community_moderation' && (
                <AdminCommunityControlTab
                  adminUid={activeEmployee.uid}
                  adminName={activeEmployee.fullName}
                  adminEmail={activeEmployee.email}
                  users={[]}
                  onSuccessToast={showToast}
                />
              )}

              {/* MODULE: CONTACT INBOX */}
              {activeModule === 'contact_inbox' && (
                <AdminContactInboxTab
                  submissions={contactSubmissions}
                  onSubmissionsChange={setContactSubmissions}
                  onRefreshSubmissions={loadInternalDashboardSupportData}
                  staffMembers={staffMembersList}
                  adminActor={{
                    uid: activeEmployee.uid,
                    name: activeEmployee.fullName,
                    email: activeEmployee.email
                  }}
                  adminHeaders={getAdminRequestHeaders({
                    id: activeEmployee.uid,
                    fullName: activeEmployee.fullName,
                    email: activeEmployee.email
                  })}
                  showToast={showToast}
                />
              )}

              {/* MODULE: EMPLOYEE MANAGEMENT */}
              {activeModule === 'employee_management' && <AdminStaffManagementTab />}

              {/* MODULE: GLOBAL TRASH */}
              {activeModule === 'global_trash' && <AdminGlobalTrashTab />}

              {/* MODULE: REPORTS & ANALYTICS */}
              {activeModule === 'reports_analytics' && <AdminAnalyticsReportsTab />}

              {/* MODULE: INTERNAL NOTIFICATIONS */}
              {activeModule === 'internal_notifications' && (
                <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-extrabold text-[#10243A] dark:text-white">
                      Internal Operational Notifications ({internalNotifications.length})
                    </h2>
                    <button
                      type="button"
                      onClick={loadInternalDashboardSupportData}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-[#10243A] dark:text-white cursor-pointer"
                    >
                      Refresh
                    </button>
                  </div>
                  {internalNotifications.length === 0 ? (
                    <p className="text-xs text-slate-500">No new internal alerts.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {internalNotifications.map(n => (
                        <div
                          key={n.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-4"
                        >
                          <div>
                            <div className="text-xs font-extrabold text-[#10243A] dark:text-white">
                              {n.title}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              {n.message}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </div>
                          </div>
                          {!n.read && (
                            <button
                              type="button"
                              onClick={async () => {
                                await markAdminNotificationReadDoc(n.id);
                                loadInternalDashboardSupportData();
                              }}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#1769AA] text-white cursor-pointer shrink-0"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MODULE: PROFILE & ACCOUNT SETTINGS */}
              {activeModule === 'profile_settings' && (
                <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                  <h2 className="text-base font-extrabold text-[#10243A] dark:text-white">
                    Internal Employee Profile &amp; Assigned Permissions
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Full Name
                      </span>
                      <span className="font-extrabold text-sm text-[#10243A] dark:text-white">
                        {activeEmployee.fullName}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Official Email
                      </span>
                      <span className="font-mono font-bold text-[#10243A] dark:text-white">
                        {activeEmployee.email}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Assigned Role
                      </span>
                      <span className="font-extrabold text-[#1769AA] dark:text-[#19B6A4]">
                        {activeEmployee.assignedRole || activeEmployee.requestedPosition}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Assigned Department
                      </span>
                      <span className="font-bold text-[#10243A] dark:text-white">
                        {activeEmployee.assignedDepartment || activeEmployee.department}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Employee ID
                      </span>
                      <span className="font-mono font-bold text-[#10243A] dark:text-white">
                        {activeEmployee.employeeId || 'EKR-STAFF'}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Account Status
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Approved &amp; Active
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
