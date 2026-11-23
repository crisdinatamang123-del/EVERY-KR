import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  UNIVERSITIES as INITIAL_UNIS,
  JOBS as INITIAL_JOBS,
  ACCOMMODATIONS as INITIAL_ACCS,
  COMMUNITY_POSTS as INITIAL_POSTS,
  MARKETPLACE_ITEMS as INITIAL_MARKETPLACE,
  GUIDE_ARTICLES as INITIAL_ARTICLES,
  VISA_CATEGORIES as INITIAL_VISAS
} from '../data/mockData';
import {
  Shield,
  Briefcase,
  Home,
  Users,
  ShoppingBag,
  Mail,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Plus,
  Edit3,
  Lock,
  Unlock,
  FileText,
  GraduationCap,
  Award,
  Building2,
  Globe,
  Clock,
  Search,
  Filter,
  Check,
  X,
  Download,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Settings,
  Smartphone,
  Bell,
  BarChart3,
  BookOpen,
  Megaphone,
  UserCheck,
  FolderCheck,
  Plane,
  Menu,
  PanelRightOpen,
  PanelRightClose,
  ChevronRight
} from 'lucide-react';
import {
  AuditLogEntry,
  AdminLogEntry,
  AdminPlatformNotification,
  StudentDocumentRecord,
  UniversityApplicationRecord,
  ScholarshipItem,
  EmployerAccount,
  SupportInquiry,
  ModerationReport,
  UserProfile,
  AdminRegistrationSummary,
  University,
  JobListing,
  AccommodationListing,
  CommunityPost,
  MarketplaceItem,
  GuideArticle,
  VisaCategory,
  UNVERIFIED_UNIVERSITY_MESSAGE,
  ContactSubmissionRecord,
  StaffMemberRecord
} from '../types';
import {
  evaluateUniversityPublicationGate,
  isStrictlyVerifiedUniversity,
  getUniversityStrictStatus,
  generateUniversityAccuracyAuditReport
} from '../utils/universityVerification';
import {
  createAuditLogDoc,
  fetchAuditLogsDoc,
  fetchAdminLogsDoc,
  fetchAllFirestoreUsers,
  fetchAdminUniversityApplications,
  fetchAdminStudentDocuments,
  fetchAdminPlatformNotificationsDoc,
  markAdminNotificationReadDoc,
  exportRecordsToCsvOrExcel,
  getAdminRequestHeaders,
  getVerifiedAdminRequestHeaders,
  fetchStaffMembersDoc
} from '../services/firebaseService';
import {
  fetchContactSubmissions,
  subscribeToContactSubmissions,
  computeContactInboxAnalytics
} from '../services/contactSubmissionService';
import { fetchAdminSmartApplications } from '../services/smartApplicationService';
import type { SmartApplicationRecord } from '../types/smartApplication';
import { AdminNewsletterTab } from './admin/AdminNewsletterTab';
import { AdminUserManagementTab, UserDatabaseSubTab } from './admin/AdminUserManagementTab';
import { AdminKoreanAcademyTab } from './admin/AdminKoreanAcademyTab';
import { AdminUniversityManagerTab } from './admin/AdminUniversityManagerTab';
import { AdminDeveloperSettingsTab } from './admin/AdminDeveloperSettingsTab';
import { AdminAccommodationTab } from './admin/AdminAccommodationTab';
import { AdminSimApplicationsTab } from './admin/AdminSimApplicationsTab';
import { AdminApplicationsTab } from './admin/AdminApplicationsTab';
import { AdminDocumentsTab } from './admin/AdminDocumentsTab';
import { AdminProgramManagerTab } from './admin/AdminProgramManagerTab';
import { AdminStaffManagementTab } from './admin/AdminStaffManagementTab';
import { AdminCmsAnnouncementsTab } from './admin/AdminCmsAnnouncementsTab';
import { AdminAnalyticsReportsTab } from './admin/AdminAnalyticsReportsTab';
import { AdminEssentialHubTab } from './admin/AdminEssentialHubTab';
import { AdminHomepageCmsTab } from './admin/AdminHomepageCmsTab';
import { AdminCommunityControlTab } from './admin/AdminCommunityControlTab';
import { AdminContactInboxTab } from './admin/AdminContactInboxTab';
import {
  AdminTransportManagementTab,
  TransportManagementSection
} from './admin/AdminTransportManagementTab';
import { AdminInternalRequestsTab } from './admin/AdminInternalRequestsTab';
import { AdminGlobalTrashTab } from './admin/AdminGlobalTrashTab';
import { AdminLeftSidebar } from './admin/AdminLeftSidebar';
import {
  AdminRightControlPanel,
  PendingAdminTask,
  TransportApiHealthSnapshot
} from './admin/AdminRightControlPanel';
import {
  AdminNavCounts,
  AdminNavGroupId,
  AdminNavItem,
  AdminTabId,
  resolveActiveNavContext
} from './admin/adminNavConfig';

type AdminTab = AdminTabId;

const ADMIN_SIDEBAR_PREFS_KEY = 'everykr_admin_sidebar_prefs_v1';

interface AdminSidebarPrefs {
  leftCollapsed: boolean;
  rightOpen: boolean;
  expandedGroups: Record<string, boolean>;
}

function readAdminSidebarPrefs(): AdminSidebarPrefs {
  const defaults: AdminSidebarPrefs = {
    leftCollapsed: false,
    rightOpen: true,
    expandedGroups: {
      overview_group: true
    }
  };
  try {
    if (typeof window === 'undefined') return defaults;
    const raw = window.localStorage.getItem(ADMIN_SIDEBAR_PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      leftCollapsed: Boolean(parsed?.leftCollapsed),
      rightOpen: typeof parsed?.rightOpen === 'boolean' ? parsed.rightOpen : true,
      expandedGroups:
        parsed?.expandedGroups && typeof parsed.expandedGroups === 'object'
          ? parsed.expandedGroups
          : defaults.expandedGroups
    };
  } catch {
    return defaults;
  }
}

export const AdminView: React.FC = () => {
  const {
    currentUser,
    isServerVerifiedAdmin,
    updateProfile,
    jobsList,
    accommodationList,
    universitiesList,
    addUniversity,
    updateUniversity,
    deleteUniversity,
    batchImportUniversities,
    universityImportReport,
    posts,
    deletePost,
    marketplaceItems,
    deleteMarketplaceItem,
    showToast,
    setActivePage,
    t
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const qTab = new URLSearchParams(window.location.search).get('tab');
        if (qTab === 'site_settings') return 'site_settings';
        if (qTab === 'contact_inbox') return 'contact_inbox';
        if (qTab === 'homepage_cms') return 'homepage_cms';
        if (qTab === 'transport_management' || qTab === 'flight_management') return 'transport_management';
      }
    } catch {
      // ignore
    }
    return 'overview';
  });

  // Sidebar-first workspace layout state (persisted in localStorage)
  const initialSidebarPrefs = useMemo(() => readAdminSidebarPrefs(), []);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState<boolean>(
    initialSidebarPrefs.leftCollapsed
  );
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(
    initialSidebarPrefs.rightOpen
  );
  const [expandedSidebarGroups, setExpandedSidebarGroups] = useState<Record<string, boolean>>(
    initialSidebarPrefs.expandedGroups
  );
  const [mobileLeftOpen, setMobileLeftOpen] = useState<boolean>(false);
  const [mobileRightOpen, setMobileRightOpen] = useState<boolean>(false);
  const [transportSection, setTransportSection] = useState<TransportManagementSection>('flight_api');
  const [userDatabaseSubTab, setUserDatabaseSubTab] = useState<UserDatabaseSubTab>('users');
  const [preferredNavItemId, setPreferredNavItemId] = useState<string | null>(null);
  const [isRefreshingWorkspace, setIsRefreshingWorkspace] = useState<boolean>(false);
  const [apiHealth, setApiHealth] = useState<TransportApiHealthSnapshot>({
    totalProviders: 0,
    activeProvidersCount: 0,
    healthyProvidersCount: 0,
    erroredProvidersCount: 0,
    avgResponseTimeMs: null,
    lastCheckedAt: null,
    loading: true
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const payload: AdminSidebarPrefs = {
          leftCollapsed: leftSidebarCollapsed,
          rightOpen: rightPanelOpen,
          expandedGroups: expandedSidebarGroups
        };
        window.localStorage.setItem(ADMIN_SIDEBAR_PREFS_KEY, JSON.stringify(payload));
      }
    } catch {
      // ignore storage quota issues
    }
  }, [leftSidebarCollapsed, rightPanelOpen, expandedSidebarGroups]);

  useEffect(() => {
    if (!mobileLeftOpen && !mobileRightOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileLeftOpen(false);
        setMobileRightOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileLeftOpen, mobileRightOpen]);

  const [searchQuery, setSearchQuery] = useState('');
  const [userVerificationFilter, setUserVerificationFilter] = useState<'verified' | 'unverified'>('verified');
  const [unverifiedRegistrations, setUnverifiedRegistrations] = useState<AdminRegistrationSummary[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState<boolean>(false);

  // Live Portal Metrics & Notifications for Admin Overview & Audit Logs
  const [portalApplications, setPortalApplications] = useState<UniversityApplicationRecord[]>([]);
  const [smartApplications, setSmartApplications] = useState<SmartApplicationRecord[]>([]);
  const [portalDocuments, setPortalDocuments] = useState<StudentDocumentRecord[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminPlatformNotification[]>([]);
  const [adminActivityLogs, setAdminActivityLogs] = useState<AdminLogEntry[]>([]);

  // ----------------------------------------------------
  // Seed state for Admin Entities
  // ----------------------------------------------------
  const [usersList, setUsersList] = useState<UserProfile[]>([
    {
      id: 'usr-1',
      name: 'Minjun Kim',
      email: 'minjun.kim@yonsei.ac.kr',
      role: 'student',
      nationality: 'Global',
      currentCity: 'Seoul',
      university: 'Yonsei University',
      studyLevel: 'Master of Science (AI)',
      visaType: 'D-2-3 (Master)',
      preferredLanguage: 'en',
      emailVerified: true,
      accountStatus: 'active',
      createdAt: '2026-10-15T09:00:00Z'
    },
    {
      id: 'usr-2',
      name: 'Elena Rostova',
      email: 'elena.rostova@snu.ac.kr',
      role: 'student',
      nationality: 'Kazakhstan',
      currentCity: 'Seoul',
      university: 'Seoul National University',
      studyLevel: 'Bachelor Degree',
      visaType: 'D-2-2 (Bachelor)',
      preferredLanguage: 'en',
      emailVerified: true,
      accountStatus: 'active',
      createdAt: '2026-10-18T11:30:00Z'
    },
    {
      id: 'usr-3',
      name: 'Kim Min-jun',
      email: 'hr@kconnectmedia.kr',
      role: 'employer',
      nationality: 'South Korea',
      currentCity: 'Seoul',
      preferredLanguage: 'ko',
      emailVerified: true,
      accountStatus: 'active',
      createdAt: '2026-10-20T14:15:00Z'
    },
    {
      id: 'usr-4',
      name: 'Park Ji-hoon',
      email: 'sinchon.housing@naver.com',
      role: 'landlord',
      nationality: 'South Korea',
      currentCity: 'Seoul',
      preferredLanguage: 'ko',
      emailVerified: true,
      accountStatus: 'active',
      createdAt: '2026-10-22T08:45:00Z'
    },
    {
      id: 'usr-5',
      name: 'Korea University Global Affairs',
      email: 'oia-admin@korea.ac.kr',
      role: 'university',
      nationality: 'South Korea',
      currentCity: 'Seoul',
      preferredLanguage: 'ko',
      emailVerified: true,
      accountStatus: 'active',
      createdAt: '2026-10-25T10:00:00Z'
    },
    {
      id: 'usr-6',
      name: 'EVERYKR System Admin',
      email: 'admin@everykr.com',
      role: 'admin',
      nationality: 'Global',
      currentCity: 'Seoul',
      preferredLanguage: 'en',
      emailVerified: true,
      accountStatus: 'active',
      createdAt: '2026-10-01T00:00:00Z'
    }
  ]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [adminUniSearch, setAdminUniSearch] = useState('');
  const [adminUniPage, setAdminUniPage] = useState(1);
  const [activeImportReport, setActiveImportReport] = useState<any>(null);
  const [scholarshipsList, setScholarshipsList] = useState<ScholarshipItem[]>([
    {
      id: 'sch-1',
      name: 'Global Korea Scholarship (GKS) Government Grant',
      sponsor: 'Ministry of Education (NIIED)',
      targetAudience: 'International Bachelor, Master and PhD candidates',
      coverageAmount: 'Full Tuition + ₩1,000,000/mo living stipend + Airfare',
      eligibilityCriteria: ['Under 25 (Bachelor) or Under 40 (Grad)', 'GPA 80%+ or top 20%', 'Korean Language 1-year training mandatory'],
      deadline: '2026-12-31',
      published: true
    },
    {
      id: 'sch-2',
      name: 'Yonsei Global Excellence Academic Fellowship',
      sponsor: 'Yonsei University International Foundation',
      targetAudience: 'Freshmen & transfer international degree students',
      coverageAmount: '50% to 100% tuition waiver for 8 semesters',
      eligibilityCriteria: ['SAT 1450+ or Top 5% high school graduation rank', 'TOPIK Level 4+ or IELTS 7.0+'],
      deadline: '2026-11-30',
      published: true
    },
    {
      id: 'sch-3',
      name: 'Seoul National University President Fellowship (SPF)',
      sponsor: 'Seoul National University',
      targetAudience: 'Faculty members of universities in developing nations admitted to PhD',
      coverageAmount: 'Tuition waiver + ₩2,000,000/mo living expense + medical insurance',
      eligibilityCriteria: ['Faculty appointment proof', 'PhD admission letter to SNU'],
      deadline: '2027-01-15',
      published: true
    },
    {
      id: 'sch-4',
      name: 'Seoul Metropolitan City Living Support Grant',
      sponsor: 'Seoul Metropolitan Government',
      targetAudience: 'Enrolled foreign university students residing in Seoul',
      coverageAmount: '₩2,500,000 one-time annual settlement grant',
      eligibilityCriteria: ['Registered alien residing in Seoul for >6 months', 'GPA 3.0/4.5+'],
      deadline: '2027-02-28',
      published: false
    }
  ]);

  const [employersList, setEmployersList] = useState<EmployerAccount[]>([
    {
      id: 'emp-1',
      companyName: 'K-Connect Global Media',
      businessRegistrationNumber: '104-81-93021',
      contactEmail: 'hr@kconnectmedia.kr',
      contactPhone: '02-789-2041',
      city: 'Seoul (Mapo-gu)',
      activeJobsCount: 3,
      verified: true,
      status: 'Active'
    },
    {
      id: 'emp-2',
      companyName: 'Han River Trading Co.',
      businessRegistrationNumber: '201-86-44109',
      contactEmail: 'export@hanrivertrading.co.kr',
      contactPhone: '051-920-1188',
      city: 'Busan (Centum City)',
      activeJobsCount: 2,
      verified: true,
      status: 'Active'
    },
    {
      id: 'emp-3',
      companyName: 'Seoul AI Labs Inc.',
      businessRegistrationNumber: '119-82-77291',
      contactEmail: 'talent@seoulailabs.kr',
      contactPhone: '02-550-9302',
      city: 'Seoul (Gangnam-gu)',
      activeJobsCount: 1,
      verified: true,
      status: 'Active'
    },
    {
      id: 'emp-4',
      companyName: 'Gangnam Global Cafe & Bistro',
      businessRegistrationNumber: '211-14-38290',
      contactEmail: 'manager@gangnamglobal.com',
      contactPhone: '02-344-9981',
      city: 'Seoul (Gangnam)',
      activeJobsCount: 1,
      verified: false,
      status: 'Pending'
    }
  ]);

  const [articlesList, setArticlesList] = useState<GuideArticle[]>(INITIAL_ARTICLES);
  const [visaGuidesList, setVisaGuidesList] = useState<VisaCategory[]>(INITIAL_VISAS);
  const [adminJobsList, setAdminJobsList] = useState<JobListing[]>(jobsList);
  const [adminHousingList, setAdminHousingList] = useState<AccommodationListing[]>(accommodationList);

  const [reportsList, setReportsList] = useState<ModerationReport[]>([
    {
      id: 'rep-1',
      reporterName: 'Minjun Kim',
      reporterEmail: 'minjun.kim@yonsei.ac.kr',
      targetType: 'job',
      targetId: 'job-flag-1',
      targetTitle: 'Unregistered Broker Fee Notice',
      reason: 'Recruiter asked for ₩500,000 cash broker fee before contract. Suspected violation of Employment Security Act.',
      status: 'Pending',
      createdAt: '2026-11-06T14:30:00Z'
    },
    {
      id: 'rep-2',
      reporterName: 'Elena Rostova',
      reporterEmail: 'elena.rostova@snu.ac.kr',
      targetType: 'housing',
      targetId: 'acc-flag-2',
      targetTitle: 'One-room near Bongcheon',
      reason: 'Landlord refused to issue formal lease certificate (확정일자) and demanded cash deposit without tax receipt.',
      status: 'Under Investigation',
      createdAt: '2026-11-05T09:15:00Z',
      resolutionNotes: 'Contacted Sinchon Realty licensing registry. Awaiting official agent response.'
    }
  ]);

  const [inquiriesList, setInquiriesList] = useState<SupportInquiry[]>([
    {
      id: 'inq-1',
      name: 'Minjun Kim',
      email: 'minjun.kim@yonsei.ac.kr',
      category: 'Visa & Immigration',
      subject: 'D-2 Thesis Completion Extension Requirements',
      message: 'My degree thesis defense is postponed by 3 months. What documentation is required at Southern Immigration to extend D-2 past normal graduation term?',
      status: 'Pending',
      createdAt: '2026-11-07T02:20:00Z'
    },
    {
      id: 'inq-2',
      name: 'Carlos Mendoza',
      email: 'carlos.m@korea.ac.kr',
      category: 'Emergency Assistance',
      subject: 'Lost Foreign Registration Card (ARC) while visiting Busan',
      message: 'Lost physical ARC card on KTX train. How to get replacement certificate for upcoming international flight?',
      status: 'Resolved',
      createdAt: '2026-11-04T11:00:00Z',
      resolutionNotes: 'Advised applicant to obtain Certificate of Alien Registration (외국인등록사실증명) immediately from Community Service Center (주민센터) or Incheon Airport immigration counter.'
    }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'log-1',
      timestamp: '2026-11-07T03:10:00Z',
      adminName: 'Super Admin',
      adminEmail: 'admin@everykr.com',
      actionType: 'ROLE_CHANGE',
      targetEntity: 'User',
      targetId: 'usr-5',
      targetName: 'Korea University Global Affairs',
      details: 'Elevated role from student to verified university administrator.'
    },
    {
      id: 'log-2',
      timestamp: '2026-11-06T18:45:00Z',
      adminName: 'Super Admin',
      adminEmail: 'admin@everykr.com',
      actionType: 'APPROVE',
      targetEntity: 'Job',
      targetId: 'job-1',
      targetName: 'Global Community & Content Assistant',
      details: 'Approved employer posting after verification of statutory ₩10,300+ hourly rate.'
    },
    {
      id: 'log-3',
      timestamp: '2026-11-06T12:00:00Z',
      adminName: 'Super Admin',
      adminEmail: 'admin@everykr.com',
      actionType: 'PUBLISH',
      targetEntity: 'Article',
      targetId: 'guide-arc',
      targetName: 'Alien Registration Card Guide (HiKorea)',
      details: 'Published updated immigration guide for 2026/2027 academic admissions.'
    }
  ]);

  const isSuperAdmin = currentUser?.role === 'admin' && Boolean(isServerVerifiedAdmin);

  const loadAdminRegistrations = async () => {
    if (!isSuperAdmin) return;
    setIsLoadingRegistrations(true);
    try {
      const [regRes, firestoreUsers] = await Promise.all([
        fetch('/api/auth/admin/registrations', {
          headers: {
            ...getAdminRequestHeaders(currentUser)
          }
        }).then(r => r.json()).catch(() => null),
        fetchAllFirestoreUsers()
      ]);

      if (regRes?.ok) {
        if (Array.isArray(regRes.unverifiedRegistrations)) {
          setUnverifiedRegistrations(regRes.unverifiedRegistrations);
        }
        if (Array.isArray(regRes.verifiedRegistrations)) {
          setUsersList(prev => {
            const byEmail = new Map<string, UserProfile>();
            for (const u of prev) {
              if (u.emailVerified !== false) {
                byEmail.set(u.email.toLowerCase(), u);
              }
            }
            for (const fu of firestoreUsers) {
              if (fu.email && fu.emailVerified !== false && fu.accountStatus !== 'unverified') {
                byEmail.set(fu.email.toLowerCase(), {
                  ...fu,
                  emailVerified: true,
                  accountStatus: 'active'
                });
              }
            }
            for (const vr of regRes.verifiedRegistrations as AdminRegistrationSummary[]) {
              const key = vr.email.toLowerCase();
              const existing = byEmail.get(key);
              byEmail.set(key, {
                id: vr.uid || existing?.id || vr.id,
                name: vr.name || existing?.name || vr.email.split('@')[0],
                email: vr.email,
                role: vr.role || existing?.role || 'student',
                nationality: existing?.nationality || 'Global',
                currentCity: existing?.currentCity || 'Seoul',
                university: existing?.university,
                studyLevel: existing?.studyLevel,
                visaType: existing?.visaType,
                preferredLanguage: existing?.preferredLanguage || 'en',
                emailVerified: true,
                accountStatus: 'active',
                authProvider: vr.authProvider || existing?.authProvider || 'email_otp',
                createdAt: vr.createdAt || existing?.createdAt
              });
            }
            return Array.from(byEmail.values());
          });
        }
      }
    } catch (err) {
      console.warn('Could not load registration overview:', err);
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmissionRecord[]>([]);
  const [staffMembersList, setStaffMembersList] = useState<StaffMemberRecord[]>([]);
  const [initialContactSubmissionId, setInitialContactSubmissionId] = useState<string | null>(null);
  const contactInboxAnalytics = computeContactInboxAnalytics(contactSubmissions);

  const refreshContactInbox = async () => {
    if (!isSuperAdmin) return;
    try {
      const [subs, staff] = await Promise.all([
        fetchContactSubmissions(getAdminRequestHeaders(currentUser)),
        fetchStaffMembersDoc()
      ]);
      setContactSubmissions(subs);
      setStaffMembersList(staff);
    } catch {
      // non-fatal
    }
  };

  const loadAdminPortalMetrics = async () => {
    if (!isSuperAdmin) return;
    try {
      const [apps, smartApps, docs, notifs, actLogs, subs, staff] = await Promise.all([
        fetchAdminUniversityApplications(),
        fetchAdminSmartApplications({ role: 'admin', actorUid: currentUser?.uid }).catch(() => []),
        fetchAdminStudentDocuments(),
        fetchAdminPlatformNotificationsDoc(),
        fetchAdminLogsDoc(),
        fetchContactSubmissions(getAdminRequestHeaders(currentUser)),
        fetchStaffMembersDoc()
      ]);
      setPortalApplications(apps);
      setSmartApplications(smartApps);
      setPortalDocuments(docs);
      setAdminNotifications(notifs);
      setAdminActivityLogs(actLogs);
      setContactSubmissions(subs);
      setStaffMembersList(staff);
    } catch {
      // ignore
    }
  };

  const loadTransportApiHealth = useCallback(async () => {
    if (!isSuperAdmin) return;
    setApiHealth((prev) => ({ ...prev, loading: true }));
    try {
      const headers = await getVerifiedAdminRequestHeaders();
      const res = await fetch('/api/admin/transport/health', { headers });
      const data = await res.json();
      if (res.ok && data?.ok && data?.summary) {
        setApiHealth({
          totalProviders: Number(data.summary.totalProviders || 0),
          activeProvidersCount: Number(data.summary.activeProvidersCount || 0),
          healthyProvidersCount: Number(data.summary.healthyProvidersCount || 0),
          erroredProvidersCount: Number(data.summary.erroredProvidersCount || 0),
          avgResponseTimeMs:
            typeof data.summary.avgResponseTimeMs === 'number'
              ? data.summary.avgResponseTimeMs
              : null,
          lastCheckedAt: new Date().toISOString(),
          loading: false
        });
      } else {
        setApiHealth((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setApiHealth((prev) => ({ ...prev, loading: false }));
    }
  }, [isSuperAdmin]);

  const handleRefreshWorkspace = useCallback(async () => {
    if (!isSuperAdmin) return;
    setIsRefreshingWorkspace(true);
    try {
      await Promise.all([
        loadAdminPortalMetrics(),
        loadAdminRegistrations(),
        loadTransportApiHealth()
      ]);
      showToast('Admin workspace metrics and API health refreshed.');
    } finally {
      setIsRefreshingWorkspace(false);
    }
  }, [isSuperAdmin, loadTransportApiHealth]);

  const handleMarkNotificationRead = useCallback(async (notifId: string) => {
    try {
      await markAdminNotificationReadDoc(notifId);
    } catch {
      // keep optimistic UI update
    }
    setAdminNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  }, []);

  const handleOpenNotification = useCallback((notif: AdminPlatformNotification) => {
    setPreferredNavItemId(null);
    if (notif.type === 'new_university_application') {
      setActiveTab('applications');
    } else if (notif.type === 'new_document_upload') {
      setActiveTab('documents');
    } else if (notif.type === 'new_sim_application') {
      setActiveTab('sim_applications');
    } else if (notif.type === 'new_contact_inquiry') {
      if (notif.relatedRecordId) {
        setInitialContactSubmissionId(notif.relatedRecordId);
      }
      setActiveTab('contact_inbox');
    } else {
      setUserDatabaseSubTab('users');
      setActiveTab('users');
    }
    setMobileRightOpen(false);
  }, []);

  const handleNavigateWorkspace = useCallback(
    (
      tab: AdminTabId,
      options?: {
        transportSection?: TransportManagementSection;
        userSubTab?: UserDatabaseSubTab;
      }
    ) => {
      setPreferredNavItemId(null);
      if (options?.transportSection) {
        setTransportSection(options.transportSection);
      }
      if (options?.userSubTab) {
        setUserDatabaseSubTab(options.userSubTab);
      }
      setActiveTab(tab);
      setMobileLeftOpen(false);
      setMobileRightOpen(false);
    },
    []
  );

  const handleSelectSidebarItem = useCallback(
    (item: AdminNavItem, groupId: AdminNavGroupId) => {
      setPreferredNavItemId(item.id);
      if (item.transportSection) {
        setTransportSection(item.transportSection);
      }
      if (item.userSubTab) {
        setUserDatabaseSubTab(item.userSubTab);
      }
      setActiveTab(item.tab);
      setExpandedSidebarGroups((prev) => ({
        ...prev,
        [groupId]: true
      }));
      setMobileLeftOpen(false);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    []
  );

  const handleToggleSidebarGroup = useCallback((groupId: AdminNavGroupId) => {
    setExpandedSidebarGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  }, []);

  const activeNavContext = useMemo(
    () =>
      resolveActiveNavContext(
        activeTab,
        transportSection,
        userDatabaseSubTab,
        preferredNavItemId
      ),
    [activeTab, transportSection, userDatabaseSubTab, preferredNavItemId]
  );

  // Ensure the active navigation group stays expanded when tab changes programmatically
  useEffect(() => {
    const activeGroupId = activeNavContext.group.id;
    setExpandedSidebarGroups((prev) => {
      if (prev[activeGroupId]) return prev;
      return { ...prev, [activeGroupId]: true };
    });
  }, [activeNavContext.group.id]);

  const navCounts: AdminNavCounts = useMemo(
    () => ({
      users: usersList.length,
      applications: smartApplications.length + portalApplications.length,
      documents: portalDocuments.length,
      universities: universitiesList.length,
      housing: adminHousingList.length,
      scholarships: scholarshipsList.length,
      marketplace: marketplaceItems.length,
      jobs: adminJobsList.length,
      employers: employersList.length,
      articles: articlesList.length,
      visaGuides: visaGuidesList.length,
      contactInbox: contactSubmissions.length,
      unreadInquiries: contactInboxAnalytics.unreadInquiries,
      pendingReports: reportsList.filter((r) => r.status === 'Pending').length,
      totalReports: reportsList.length,
      staff: staffMembersList.length,
      auditLogs: auditLogs.length + adminActivityLogs.length,
      transportProviders: apiHealth.totalProviders,
      transportErrors: apiHealth.erroredProvidersCount,
      unreadNotifications: adminNotifications.filter((n) => !n.read).length
    }),
    [
      usersList.length,
      smartApplications.length,
      portalApplications.length,
      portalDocuments.length,
      universitiesList.length,
      adminHousingList.length,
      scholarshipsList.length,
      marketplaceItems.length,
      adminJobsList.length,
      employersList.length,
      articlesList.length,
      visaGuidesList.length,
      contactSubmissions.length,
      contactInboxAnalytics.unreadInquiries,
      reportsList,
      staffMembersList.length,
      auditLogs.length,
      adminActivityLogs.length,
      apiHealth.totalProviders,
      apiHealth.erroredProvidersCount,
      adminNotifications
    ]
  );

  const pendingTasks: PendingAdminTask[] = useMemo(() => {
    const pendingReportsCount = reportsList.filter((r) => r.status === 'Pending').length;
    const unverifiedJobsCount = adminJobsList.filter((j) => !j.verified).length;
    const pendingDocsCount = portalDocuments.filter((d) => {
      const st = String(d.verificationStatus || '').toLowerCase();
      return st === 'pending' || st === 'under_review' || st === 'uploaded';
    }).length;
    const pendingSmartAppsCount = smartApplications.filter((a) => {
      const st = String(a.status || '').toLowerCase();
      return st === 'submitted' || st === 'under_review' || st === 'documents_missing';
    }).length;
    const pendingAppsCount =
      pendingSmartAppsCount +
      portalApplications.filter((a) => {
        const st = String(a.status || '').toLowerCase();
        return st === 'submitted' || st === 'under_review' || st === 'pending';
      }).length;

    const tasks: PendingAdminTask[] = [];
    if (contactInboxAnalytics.unreadInquiries > 0) {
      tasks.push({
        id: 'task_unread_inquiries',
        label: 'Unread Contact Inquiries',
        count: contactInboxAnalytics.unreadInquiries,
        severity: 'attention',
        targetTab: 'contact_inbox'
      });
    }
    if (pendingReportsCount > 0) {
      tasks.push({
        id: 'task_pending_reports',
        label: 'Pending Moderation Reports',
        count: pendingReportsCount,
        severity: 'attention',
        targetTab: 'reports'
      });
    }
    if (apiHealth.erroredProvidersCount > 0) {
      tasks.push({
        id: 'task_transport_api_errors',
        label: 'Transport API Provider Errors',
        count: apiHealth.erroredProvidersCount,
        severity: 'attention',
        targetTab: 'transport_management',
        targetTransportSection: 'health_logs'
      });
    }
    if (unverifiedJobsCount > 0) {
      tasks.push({
        id: 'task_unverified_jobs',
        label: 'Unverified Job Listings',
        count: unverifiedJobsCount,
        severity: 'normal',
        targetTab: 'jobs'
      });
    }
    if (pendingDocsCount > 0) {
      tasks.push({
        id: 'task_pending_docs',
        label: 'Documents Awaiting Review',
        count: pendingDocsCount,
        severity: 'normal',
        targetTab: 'documents'
      });
    }
    if (pendingAppsCount > 0) {
      tasks.push({
        id: 'task_pending_apps',
        label: 'University Applications Pending',
        count: pendingAppsCount,
        severity: 'normal',
        targetTab: 'applications'
      });
    }
    return tasks;
  }, [
    reportsList,
    adminJobsList,
    portalDocuments,
    smartApplications,
    portalApplications,
    contactInboxAnalytics.unreadInquiries,
    apiHealth.erroredProvidersCount
  ]);

  // Load cloud audit logs, registrations & portal metrics only when verified Super Admin is active
  useEffect(() => {
    if (!isSuperAdmin) return;
    async function loadCloudLogs() {
      try {
        const cloudLogs = await fetchAuditLogsDoc();
        if (cloudLogs.length > 0) {
          setAuditLogs(prev => {
            const byId = new Map<string, AuditLogEntry>();
            for (const item of cloudLogs) byId.set(item.id, item);
            for (const item of prev) {
              if (!byId.has(item.id)) byId.set(item.id, item);
            }
            return Array.from(byId.values());
          });
        }
      } catch {
        console.warn('Audit logs loaded locally.');
      }
    }
    loadCloudLogs();
    loadAdminRegistrations();
    loadAdminPortalMetrics();
    loadTransportApiHealth();

    // Real-time Firestore listener on `contact_submissions`
    const unsubContact = subscribeToContactSubmissions({
      onUpdate: (records) => {
        setContactSubmissions(records);
      },
      onNewSubmission: (newRecord) => {
        const notifId = `notif_contact_${newRecord.submissionId}`;
        setAdminNotifications((prev) => {
          if (prev.some((n) => n.id === notifId || n.relatedRecordId === newRecord.submissionId)) {
            return prev;
          }
          return [
            {
              id: notifId,
              type: 'new_contact_inquiry',
              title: `New Contact Inquiry (${newRecord.ticketId})`,
              message: `${newRecord.fullName} (${newRecord.email}) submitted a "${newRecord.category}" inquiry: ${newRecord.subject}`,
              relatedRecordId: newRecord.submissionId,
              studentId: newRecord.userId || 'guest',
              studentName: newRecord.fullName,
              createdAt: newRecord.submittedAt,
              read: false
            },
            ...prev
          ];
        });
        showToast(
          `New Contact Inquiry (${newRecord.ticketId}) from ${newRecord.fullName}: "${newRecord.subject}"`
        );
      }
    });

    return () => {
      unsubContact();
    };
  }, [isSuperAdmin, loadTransportApiHealth]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (activeTab === 'users') {
      loadAdminRegistrations();
    } else if (activeTab === 'contact_inbox') {
      void refreshContactInbox();
    } else if (activeTab === 'overview' || activeTab === 'audit_logs') {
      loadAdminPortalMetrics();
    } else if (activeTab === 'transport_management' || activeTab === 'flight_management') {
      void loadTransportApiHealth();
    }
  }, [activeTab, isSuperAdmin, loadTransportApiHealth]);

  // ----------------------------------------------------
  // Workflow Action Logger
  // ----------------------------------------------------
  const recordAuditAction = async (
    actionType: AuditLogEntry['actionType'],
    targetEntity: AuditLogEntry['targetEntity'],
    targetId: string,
    targetName: string,
    details: string
  ) => {
    const adminName = currentUser?.name || 'Super Admin';
    const adminEmail = currentUser?.email || 'admin@everykr.com';
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName,
      adminEmail,
      actionType,
      targetEntity,
      targetId,
      targetName,
      details
    };

    setAuditLogs(prev => [entry, ...prev]);
    createAuditLogDoc({
      timestamp: entry.timestamp,
      adminName,
      adminEmail,
      actionType,
      targetEntity,
      targetId,
      targetName,
      details
    }).catch(e => console.warn('Logged locally:', e));
  };

  // ----------------------------------------------------
  // Confirmation Modal State
  // ----------------------------------------------------
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    actionType: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionLabel: 'Confirm',
    actionType: 'primary',
    onConfirm: () => {}
  });

  // ----------------------------------------------------
  // Generic Entity Edit / Create Modal State
  // ----------------------------------------------------
  const [entityModal, setEntityModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    entityType: 'university' | 'scholarship' | 'job' | 'article' | 'inquiry';
    data: any;
  }>({
    isOpen: false,
    mode: 'create',
    entityType: 'scholarship',
    data: {}
  });

  // ----------------------------------------------------
  // RBAC GUARD: Role-Based Access Control (Requires BOTH role === 'admin' AND Server Verification)
  // ----------------------------------------------------
  if (!isSuperAdmin) {
    return (
      <div className="py-24 bg-[#F5F7FA] dark:bg-[#0B1523] min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded">
              RBAC Restricted
            </span>
            <h2 className="text-xl font-black text-[#10243A] mt-2">Administrative Clearance Required</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Access to EVERYKR operations, university admissions moderation, employer audits, and user records is restricted to authenticated Administrators.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Current User:</span>
              <span className="font-semibold text-slate-800">{currentUser?.name || 'Guest'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Declared Role:</span>
              <span className="font-mono font-bold text-amber-700 uppercase">{currentUser?.role || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Required Role:</span>
              <span className="font-mono font-bold text-emerald-700 uppercase">SUPER ADMIN</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              Student, employer, and guest accounts are strictly prohibited from accessing administrative operations or newsletter subscriber lists. Please sign in with an authorized EveryKR Administrator account.
            </p>
            <button
              onClick={() => setActivePage('home')}
              className="w-full py-2.5 px-4 bg-[#10243A] hover:bg-[#1769AA] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Return to EVERYKR Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // WORKFLOW HANDLERS
  // ----------------------------------------------------

  // 1. User Workflows
  const handleRoleChange = (userId: string, newRole: UserProfile['role']) => {
    const user = usersList.find(u => u.id === userId);
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    showToast(`Role for ${user?.name} updated to ${newRole}`);
    recordAuditAction('ROLE_CHANGE', 'User', userId, user?.name || 'User', `Modified role to ${newRole}`);
  };

  const handleDeleteUser = (userId: string) => {
    const user = usersList.find(u => u.id === userId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete User Account',
      message: `Are you sure you want to permanently delete the account for ${user?.name} (${user?.email})? All associated student bookmarks will be removed.`,
      actionLabel: 'Delete User',
      actionType: 'danger',
      onConfirm: () => {
        setUsersList(prev => prev.filter(u => u.id !== userId));
        showToast(`User ${user?.name} removed from system`);
        recordAuditAction('DELETE', 'User', userId, user?.name || 'User', 'Deleted user profile and revoked access token.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 2. University Workflows
  const handleToggleUniversityVerified = (uniId: string) => {
    const uni = universitiesList.find(u => u.id === uniId);
    if (!uni) return;
    const currentlyVerified = isStrictlyVerifiedUniversity(uni);
    if (!currentlyVerified) {
      const gate = evaluateUniversityPublicationGate(uni);
      if (!gate.allPassed) {
        const failedItems = Object.entries(gate)
          .filter(([k, v]) => k !== 'allPassed' && !v)
          .map(([k]) => k);
        showToast(
          `Cannot mark "${uni.name}" as VERIFIED: ${failedItems.length} of 12 Publication Gate checks are still pending (${failedItems.slice(0, 3).join(', ')}).`
        );
        return;
      }
    }
    const nextStatus = !currentlyVerified;
    updateUniversity(uniId, {
      verified: nextStatus,
      verificationStatus: nextStatus ? 'VERIFIED' : 'PENDING VERIFICATION'
    });
    recordAuditAction(
      nextStatus ? 'APPROVE' : 'UNPUBLISH',
      'University',
      uniId,
      uni.name,
      `Set strict verification status to ${nextStatus ? 'VERIFIED (12/12 Gate Passed)' : 'PENDING VERIFICATION'}`
    );
  };

  const handleDeleteUniversity = (uniId: string) => {
    const uni = universitiesList.find(u => u.id === uniId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete University Listing',
      message: `Delete ${uni?.name} (${uni?.koreanName}) from verified university database?`,
      actionLabel: 'Delete University',
      actionType: 'danger',
      onConfirm: () => {
        deleteUniversity(uniId);
        recordAuditAction('DELETE', 'University', uniId, uni?.name || 'Uni', 'Removed university record.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 3. Scholarship Workflows
  const handleToggleScholarshipPublish = (schId: string) => {
    const sch = scholarshipsList.find(s => s.id === schId);
    const nextPublished = !sch?.published;
    setScholarshipsList(prev => prev.map(s => s.id === schId ? { ...s, published: nextPublished } : s));
    showToast(`Scholarship ${sch?.name} is now ${nextPublished ? 'Published' : 'Unpublished'}`);
    recordAuditAction(nextPublished ? 'PUBLISH' : 'UNPUBLISH', 'Scholarship', schId, sch?.name || 'Scholarship', `Set published state to ${nextPublished}`);
  };

  const handleDeleteScholarship = (schId: string) => {
    const sch = scholarshipsList.find(s => s.id === schId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Scholarship',
      message: `Delete scholarship ${sch?.name}?`,
      actionLabel: 'Delete',
      actionType: 'danger',
      onConfirm: () => {
        setScholarshipsList(prev => prev.filter(s => s.id !== schId));
        showToast('Scholarship deleted');
        recordAuditAction('DELETE', 'Scholarship', schId, sch?.name || 'Scholarship', 'Deleted grant entry.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 4. Job Workflows
  const handleApproveJob = (jobId: string) => {
    const job = adminJobsList.find(j => j.id === jobId);
    setAdminJobsList(prev => prev.map(j => j.id === jobId ? { ...j, verified: true } : j));
    showToast(`Job listing for ${job?.company} approved`);
    recordAuditAction('APPROVE', 'Job', jobId, job?.title || 'Job', `Approved wage and visa compliance for ${job?.company}`);
  };

  const handleRejectJob = (jobId: string) => {
    const job = adminJobsList.find(j => j.id === jobId);
    setConfirmModal({
      isOpen: true,
      title: 'Reject Job Listing',
      message: `Reject ${job?.title} at ${job?.company}? Employer will be notified to revise terms.`,
      actionLabel: 'Reject Listing',
      actionType: 'warning',
      onConfirm: () => {
        setAdminJobsList(prev => prev.filter(j => j.id !== jobId));
        showToast('Job listing rejected');
        recordAuditAction('REJECT', 'Job', jobId, job?.title || 'Job', 'Rejected non-compliant job submission.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 5. Employer Workflows
  const handleToggleEmployerStatus = (empId: string, newStatus: EmployerAccount['status']) => {
    const emp = employersList.find(e => e.id === empId);
    setEmployersList(prev => prev.map(e => e.id === empId ? { ...e, status: newStatus, verified: newStatus === 'Active' } : e));
    showToast(`Employer ${emp?.companyName} status set to ${newStatus}`);
    recordAuditAction('EDIT', 'Employer', empId, emp?.companyName || 'Employer', `Updated employer accreditation to ${newStatus}`);
  };

  // 6. Accommodation Workflows
  const handleApproveHousing = (accId: string) => {
    const acc = adminHousingList.find(a => a.id === accId);
    setAdminHousingList(prev => prev.map(a => a.id === accId ? { ...a, verified: true } : a));
    showToast(`Housing property in ${acc?.district} verified`);
    recordAuditAction('APPROVE', 'Accommodation', accId, acc?.title || 'Property', 'Verified landlord ownership and standard lease terms.');
  };

  const handleDeleteHousing = (accId: string) => {
    const acc = adminHousingList.find(a => a.id === accId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Housing Listing',
      message: `Permanently delete property ${acc?.title}?`,
      actionLabel: 'Delete Property',
      actionType: 'danger',
      onConfirm: () => {
        setAdminHousingList(prev => prev.filter(a => a.id !== accId));
        showToast('Housing listing removed');
        recordAuditAction('DELETE', 'Accommodation', accId, acc?.title || 'Property', 'Deleted student rental record.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 7. Article Workflows
  const handleDeleteArticle = (artId: string) => {
    const art = articlesList.find(a => a.id === artId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Guide Article',
      message: `Delete article "${art?.title}"?`,
      actionLabel: 'Delete Article',
      actionType: 'danger',
      onConfirm: () => {
        setArticlesList(prev => prev.filter(a => a.id !== artId));
        showToast('Article deleted');
        recordAuditAction('DELETE', 'Article', artId, art?.title || 'Article', 'Deleted survival guide article.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 8. Community & Marketplace Workflows
  const handleModeratePost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove Community Thread',
      message: `Delete discussion "${post?.title}" by ${post?.authorName}?`,
      actionLabel: 'Delete Discussion',
      actionType: 'danger',
      onConfirm: () => {
        deletePost(postId);
        recordAuditAction('DELETE', 'CommunityPost', postId, post?.title || 'Post', 'Moderator removed flagged discussion.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleModerateMarketplace = (itemId: string) => {
    const item = marketplaceItems.find(m => m.id === itemId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove Marketplace Listing',
      message: `Delete listing "${item?.title}" by ${item?.sellerName}?`,
      actionLabel: 'Delete Item',
      actionType: 'danger',
      onConfirm: () => {
        deleteMarketplaceItem(itemId);
        recordAuditAction('DELETE', 'MarketplaceListing', itemId, item?.title || 'Item', 'Moderator removed illicit listing.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 9. Report & Inquiry Workflows
  const handleResolveReport = (reportId: string) => {
    const rep = reportsList.find(r => r.id === reportId);
    setReportsList(prev => prev.map(r => r.id === reportId ? { ...r, status: 'Resolved', resolutionNotes: 'Reviewed by super admin. Corrective action enforced.' } : r));
    showToast(`Report ${rep?.targetTitle} marked as resolved`);
    recordAuditAction('APPROVE', 'Report', reportId, rep?.targetTitle || 'Report', 'Closed investigation and recorded resolution.');
  };

  const handleResolveInquiry = (inqId: string) => {
    const inq = inquiriesList.find(i => i.id === inqId);
    setInquiriesList(prev => prev.map(i => i.id === inqId ? { ...i, status: 'Resolved', resolutionNotes: 'Official advice sent to applicant email.' } : i));
    showToast(`Inquiry from ${inq?.name} resolved`);
    recordAuditAction('APPROVE', 'Inquiry', inqId, inq?.subject || 'Inquiry', `Sent resolution advice to ${inq?.email}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex bg-transparent transition-colors">
      {/* LEFT SIDEBAR: Persistent Collapsible Primary Admin Navigation */}
      <AdminLeftSidebar
        activeNavItemId={activeNavContext.item.id}
        activeGroupId={activeNavContext.group.id}
        counts={navCounts}
        isSuperAdmin={isSuperAdmin}
        adminEmail={currentUser?.email || 'admin@everykr.com'}
        isCollapsed={leftSidebarCollapsed}
        onToggleCollapse={() => setLeftSidebarCollapsed((prev) => !prev)}
        expandedGroups={expandedSidebarGroups}
        onToggleGroup={handleToggleSidebarGroup}
        onSelectItem={handleSelectSidebarItem}
        mobileOpen={mobileLeftOpen}
        onCloseMobile={() => setMobileLeftOpen(false)}
      />

      {/* CENTER WORKSPACE: Slim Top Header Bar + Active Module Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-16 z-20 h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 border-b border-sky-200/60 dark:border-white/10 bg-white/75 dark:bg-[#0A1426]/80 backdrop-blur-xl transition-colors"
          aria-label="Admin workspace bar"
        >
          {/* Left: Mobile drawer trigger + Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileLeftOpen(true)}
              aria-label="Open Admin Navigation Menu"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-sky-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>

            <nav
              aria-label="Admin breadcrumb"
              className="flex items-center gap-1.5 text-xs min-w-0"
            >
              <button
                type="button"
                onClick={() => handleNavigateWorkspace('overview')}
                className="hidden sm:inline font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Admin Panel
              </button>
              <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              <span className="hidden md:inline font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                {activeNavContext.group.label}
              </span>
              <ChevronRight className="hidden md:inline w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {activeNavContext.item.label}
              </h1>
            </nav>
          </div>

          {/* Right: Refresh + Right Control Panel Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleRefreshWorkspace()}
              disabled={isRefreshingWorkspace}
              title="Refresh workspace metrics and API health"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-sky-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-sky-50 dark:hover:bg-white/10 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-600 dark:text-sky-400 ${
                  isRefreshingWorkspace ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Desktop (xl+) Right Panel Toggle */}
            <button
              type="button"
              onClick={() => setRightPanelOpen((prev) => !prev)}
              aria-expanded={rightPanelOpen}
              title={rightPanelOpen ? 'Hide Control Panel' : 'Show Control Panel'}
              className={`hidden xl:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                rightPanelOpen
                  ? 'border-blue-300/80 dark:border-sky-400/35 bg-blue-50/90 dark:bg-sky-500/15 text-blue-700 dark:text-sky-200'
                  : 'border-sky-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10'
              }`}
            >
              {rightPanelOpen ? (
                <PanelRightClose className="w-3.5 h-3.5" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5" />
              )}
              <span>Control Panel</span>
              {navCounts.unreadNotifications > 0 && (
                <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 dark:bg-sky-500 text-white">
                  {navCounts.unreadNotifications}
                </span>
              )}
            </button>

            {/* Tablet / Mobile (<xl) Right Control Panel Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileRightOpen(true)}
              aria-label="Open Contextual Control Panel"
              className="xl:hidden inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border border-sky-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <PanelRightOpen className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span className="hidden sm:inline">Panel</span>
              {navCounts.unreadNotifications > 0 && (
                <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 dark:bg-sky-500 text-white">
                  {navCounts.unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ========================================================= */}
        {/* TAB 1: ADMIN DASHBOARD OVERVIEW (PART 5.1)                */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 8 Required Admin Portal KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div
                onClick={() => setActiveTab('users')}
                className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-[#1769AA]"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Users</div>
                <div className="text-2xl font-black text-[#10243A] dark:text-white font-mono mt-1 tabular-nums">
                  {usersList.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">All Accounts</div>
              </div>

              <div
                onClick={() => setActiveTab('users')}
                className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-[#1769AA]"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Students</div>
                <div className="text-2xl font-black text-[#1769AA] dark:text-[#19B6A4] font-mono mt-1 tabular-nums">
                  {usersList.filter(u => (u.accountType || u.role) === 'student').length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Student Portal</div>
              </div>

              <div
                onClick={() => setActiveTab('applications')}
                className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-[#1769AA]"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Applications</div>
                <div className="text-2xl font-black text-[#10243A] dark:text-white font-mono mt-1 tabular-nums">
                  {smartApplications.length + portalApplications.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Uni Submissions</div>
              </div>

              <div
                onClick={() => setActiveTab('applications')}
                className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pending Apps</div>
                <div className="text-2xl font-black text-amber-600 font-mono mt-1 tabular-nums">
                  {
                    smartApplications.filter(a =>
                      ['submitted', 'under_review', 'documents_missing', 'sent_to_university', 'interview'].includes(String(a.status))
                    ).length +
                    portalApplications.filter(a =>
                      ['Submitted', 'Under Review', 'Documents Required', 'Processing'].includes(a.status)
                    ).length
                  }
                </div>
                <div className="text-[10px] text-amber-600/80 mt-0.5">Awaiting Decision</div>
              </div>

              <div
                onClick={() => setActiveTab('applications')}
                className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-500"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Accepted</div>
                <div className="text-2xl font-black text-emerald-600 font-mono mt-1 tabular-nums">
                  {
                    smartApplications.filter(a =>
                      ['admitted', 'visa_processing', 'completed'].includes(String(a.status))
                    ).length +
                    portalApplications.filter(a => a.status === 'Accepted' || a.status === 'Completed').length
                  }
                </div>
                <div className="text-[10px] text-emerald-600/80 mt-0.5">Approved Offers</div>
              </div>

              <div
                onClick={() => setActiveTab('applications')}
                className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-rose-400"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Rejected</div>
                <div className="text-2xl font-black text-rose-600 font-mono mt-1 tabular-nums">
                  {
                    smartApplications.filter(a => String(a.status) === 'rejected').length +
                    portalApplications.filter(a => a.status === 'Rejected').length
                  }
                </div>
                <div className="text-[10px] text-rose-500 mt-0.5">Closed / Declined</div>
              </div>

              <div
                onClick={() => setActiveTab('documents')}
                className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-[#1769AA]"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Docs Awaiting</div>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 tabular-nums">
                  {
                    portalDocuments.filter(
                      d =>
                        d.verificationStatus === 'Pending Verification' ||
                        d.verificationStatus === 'Replacement Requested'
                    ).length
                  }
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Verify Queue</div>
              </div>

              <div
                onClick={() => setActiveTab('users')}
                className="bg-white dark:bg-[#10243A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-[#19B6A4]"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">New Regs (30d)</div>
                <div className="text-2xl font-black text-[#1769AA] dark:text-[#19B6A4] font-mono mt-1 tabular-nums">
                  {
                    usersList.filter(u => {
                      if (!u.createdAt) return false;
                      return Date.now() - new Date(u.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000;
                    }).length
                  }
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Recent Signups</div>
              </div>
            </div>

            {/* Admin Notifications Panel (Part 6.2) */}
            <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[#10243A] dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
                  <span>
                    Admin Notifications ({adminNotifications.filter(n => !n.read).length} unread)
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={loadAdminPortalMetrics}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1769AA] dark:text-[#19B6A4] hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Alerts</span>
                </button>
              </div>

              {adminNotifications.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No unread system notifications. New student registrations, university applications, document uploads, and SIM requests appear here automatically.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                  {adminNotifications.slice(0, 8).map(notif => (
                    <div
                      key={notif.id}
                      className={`py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        notif.read ? 'opacity-65' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#19B6A4] shrink-0" />
                          )}
                          <span className="text-xs font-bold text-[#10243A] dark:text-white">
                            {notif.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {notif.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (notif.type === 'new_university_application') setActiveTab('applications');
                            else if (notif.type === 'new_document_upload') setActiveTab('documents');
                            else if (notif.type === 'new_sim_application') setActiveTab('sim_applications');
                            else if (notif.type === 'new_contact_inquiry') {
                              if (notif.relatedRecordId) {
                                setInitialContactSubmissionId(notif.relatedRecordId);
                              }
                              setActiveTab('contact_inbox');
                            }
                            else setActiveTab('users');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#10243A] dark:text-white hover:bg-slate-200 cursor-pointer"
                        >
                          Open
                        </button>
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={async () => {
                              await markAdminNotificationReadDoc(notif.id);
                              setAdminNotifications(prev =>
                                prev.map(n => (n.id === notif.id ? { ...n, read: true } : n))
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Split Row: Pending Moderation Queue + Recent Activities / Audit Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Pending Moderation Queue */}
              <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Pending Moderation Queue</span>
                  </span>
                  <span className="text-xs text-[#1769AA] dark:text-[#19B6A4] font-semibold">Immediate attention</span>
                </h3>

                <div className="space-y-3">
                  {reportsList.filter(r => r.status === 'Pending').map(r => (
                    <div key={r.id} className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2 py-0.2 rounded">
                            Report: {r.targetType}
                          </span>
                          <span className="text-xs font-bold text-[#10243A] dark:text-white">{r.targetTitle}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.reason}</p>
                      </div>

                      <button
                        onClick={() => handleResolveReport(r.id)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer shrink-0"
                      >
                        Resolve
                      </button>
                    </div>
                  ))}

                  {adminJobsList.filter(j => !j.verified).map(j => (
                    <div key={j.id} className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-blue-200 text-blue-900 px-2 py-0.2 rounded">
                            Job Review
                          </span>
                          <span className="text-xs font-bold text-[#10243A] dark:text-white">{j.title}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{j.company} · {j.salaryKRW}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApproveJob(j.id)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectJob(j.id)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Recent Activities & Real-time Audit Trail */}
              <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
                    <span>Recent Platform Activities &amp; Audit Stream</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('audit_logs')}
                    className="text-xs text-[#1769AA] dark:text-[#19B6A4] font-bold hover:underline cursor-pointer"
                  >
                    View All ({auditLogs.length + adminActivityLogs.length}) →
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminActivityLogs.slice(0, 3).map(alog => (
                    <div key={alog.id} className="py-3 first:pt-0 flex items-start gap-3">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 shrink-0">
                        {alog.action}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#10243A] dark:text-white">{alog.details}</p>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {alog.adminName} ({alog.adminEmail}) · {new Date(alog.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {auditLogs.slice(0, 4).map(log => (
                    <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                        log.actionType === 'APPROVE' || log.actionType === 'PUBLISH'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.actionType === 'DELETE' || log.actionType === 'REJECT'
                          ? 'bg-rose-100 text-rose-800'
                          : log.actionType === 'ROLE_CHANGE'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.actionType}
                      </span>

                      <div className="flex-1">
                        <div className="text-xs font-bold text-[#10243A] dark:text-white">
                          {log.targetEntity}: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.targetName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{log.details}</p>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {log.adminName} · {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PART 1: COMPLETE HOMEPAGE & NESTED SERVICES CMS           */}
        {/* ========================================================= */}
        {activeTab === 'homepage_cms' && (
          <AdminHomepageCmsTab
            adminUid={currentUser?.uid || currentUser?.id || 'admin'}
            adminName={currentUser?.fullName || currentUser?.name || 'Super Admin'}
            adminEmail={currentUser?.email || 'admin@everykr.com'}
            onSuccessToast={showToast}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 2: STUDENT & USER MANAGEMENT (PART 5.2)               */}
        {/* ========================================================= */}
        {activeTab === 'users' && currentUser && (
          <AdminUserManagementTab
            currentUser={currentUser}
            showToast={showToast}
            initialSubTab={userDatabaseSubTab}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 3: UNIVERSITY APPLICATION MANAGEMENT (PART 5.3)       */}
        {/* ========================================================= */}
        {activeTab === 'applications' && (
          <AdminApplicationsTab />
        )}

        {/* ========================================================= */}
        {/* TAB 4: STUDENT DOCUMENT VERIFICATION (PART 5.4)           */}
        {/* ========================================================= */}
        {activeTab === 'documents' && (
          <AdminDocumentsTab />
        )}

        {/* ========================================================= */}
        {/* TAB 5: UNIVERSITY MANAGEMENT (PART 5.5)                   */}
        {/* ========================================================= */}
        {activeTab === 'universities' && (
          <AdminUniversityManagerTab />
        )}

        {/* ========================================================= */}
        {/* TAB 6: PROGRAM MANAGEMENT (PART 5.6)                      */}
        {/* ========================================================= */}
        {activeTab === 'programs' && (
          <AdminProgramManagerTab />
        )}

        {/* ========================================================= */}
        {/* TAB 8: USER & STAFF RBAC MANAGEMENT (PART 5.8)            */}
        {/* ========================================================= */}
        {activeTab === 'staff' && (
          <AdminStaffManagementTab />
        )}

        {/* ========================================================= */}
        {/* TAB 9: CONTENT MANAGEMENT SYSTEM HUB (PART 5.9)           */}
        {/* ========================================================= */}
        {activeTab === 'cms' && (
          <AdminCmsAnnouncementsTab
            onNavigateTab={tab => setActiveTab(tab as AdminTab)}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 10: ANALYTICS & EXPORT ENGINE (PART 5.10)             */}
        {/* ========================================================= */}
        {activeTab === 'analytics' && (
          <AdminAnalyticsReportsTab />
        )}

        {/* ========================================================= */}
        {/* TAB 4: SCHOLARSHIPS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'scholarships' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Scholarships &amp; Government Fellowships</h2>
                <p className="text-xs text-slate-500">GKS government quotas, university waivers, and corporate grants for international students.</p>
              </div>

              <button
                onClick={() => {
                  const newSch: ScholarshipItem = {
                    id: `sch-${Date.now()}`,
                    name: 'KAIST STEM International Fellowship',
                    sponsor: 'Korea Advanced Institute of Science and Technology',
                    targetAudience: 'Engineering & Natural Sciences Bachelor / Master candidates',
                    coverageAmount: 'Full tuition waiver + ₩350,000/mo national stipend',
                    eligibilityCriteria: ['High school graduation with STEM honors', 'TOPIK 3+ or TOEFL 83+'],
                    deadline: '2027-01-10',
                    published: true
                  };
                  setScholarshipsList(prev => [newSch, ...prev]);
                  showToast('Added KAIST STEM Fellowship');
                  recordAuditAction('CREATE', 'Scholarship', newSch.id, newSch.name, 'Published new STEM scholarship.');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-lg cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Scholarship</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {scholarshipsList.map(sch => (
                <div key={sch.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#10243A]">{sch.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        sch.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {sch.published ? 'Published' : 'Draft / Unpublished'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{sch.sponsor}</span> · Coverage: <strong className="text-emerald-700">{sch.coverageAmount}</strong>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Criteria: {sch.eligibilityCriteria.join(' · ')} · Deadline: <span className="font-mono">{sch.deadline}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleScholarshipPublish(sch.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                        sch.published ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {sch.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleDeleteScholarship(sch.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Delete scholarship"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: JOBS & EMPLOYER WORKFLOWS */}
        {/* ========================================================= */}
        {activeTab === 'jobs' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Job &amp; Internship Verifications</h2>
                <p className="text-xs text-slate-500">Statutory minimum wage compliance (₩10,300+ / hr) and D-2 / D-10 work permission audit.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Position &amp; Company</th>
                    <th className="p-4">Location &amp; Type</th>
                    <th className="p-4">Salary</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminJobsList.map(job => (
                    <tr key={job.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-bold text-[#10243A]">{job.title}</div>
                        <div className="text-[11px] text-slate-500">{job.company} · {job.employerEmail}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-slate-800">{job.city}</span> · {job.jobType}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-700">{job.salaryKRW}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          job.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {job.verified ? 'Approved' : 'Pending Review'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {!job.verified && (
                          <button
                            onClick={() => handleApproveJob(job.id)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleRejectJob(job.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: EMPLOYERS DIRECTORY */}
        {/* ========================================================= */}
        {activeTab === 'employers' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Registered Corporate Employers</h2>
                <p className="text-xs text-slate-500">Business registration verification (사업자등록증) and statutory labor compliance.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Company Name</th>
                    <th className="p-4">Business Registration (BRN)</th>
                    <th className="p-4">Contact Person</th>
                    <th className="p-4">Active Jobs</th>
                    <th className="p-4">Accreditation</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employersList.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-[#10243A]">{emp.companyName}</td>
                      <td className="p-4 font-mono text-slate-700">{emp.businessRegistrationNumber}</td>
                      <td className="p-4">
                        <div>{emp.contactEmail}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{emp.contactPhone}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-[#1769AA]">{emp.activeJobsCount}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          emp.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : emp.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {emp.status === 'Pending' && (
                          <button
                            onClick={() => handleToggleEmployerStatus(emp.id, 'Active')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded font-bold cursor-pointer"
                          >
                            Verify
                          </button>
                        )}
                        {emp.status === 'Active' && (
                          <button
                            onClick={() => handleToggleEmployerStatus(emp.id, 'Suspended')}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded font-bold cursor-pointer"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: ACCOMMODATION MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'accommodation' && (
          <AdminAccommodationTab />
        )}

        {/* ========================================================= */}
        {/* PART 2: SIM APPLICATIONS, ARRIVAL GROUPS & ZIP EXPORTS    */}
        {/* ========================================================= */}
        {activeTab === 'sim_applications' && (
          <AdminSimApplicationsTab
            adminUid={currentUser?.uid || currentUser?.id || 'admin'}
            adminName={currentUser?.fullName || currentUser?.name || 'Super Admin'}
            adminEmail={currentUser?.email || 'admin@everykr.com'}
            initialSubView="applications"
            onToast={showToast}
          />
        )}
        {activeTab === 'arrival_groups' && (
          <AdminSimApplicationsTab
            adminUid={currentUser?.uid || currentUser?.id || 'admin'}
            adminName={currentUser?.fullName || currentUser?.name || 'Super Admin'}
            adminEmail={currentUser?.email || 'admin@everykr.com'}
            initialSubView="arrival_groups"
            onToast={showToast}
          />
        )}
        {activeTab === 'sim_exports' && (
          <AdminSimApplicationsTab
            adminUid={currentUser?.uid || currentUser?.id || 'admin'}
            adminName={currentUser?.fullName || currentUser?.name || 'Super Admin'}
            adminEmail={currentUser?.email || 'admin@everykr.com'}
            initialSubView="exports"
            onToast={showToast}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 8: ARTICLES & VISA GUIDES */}
        {/* ========================================================= */}
        {activeTab === 'articles' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Life in Korea Survival Articles</h2>
                <p className="text-xs text-slate-500">Essential guidance on banking, mobile SIM cards, national health insurance, and police/fire safety.</p>
              </div>

              <button
                onClick={() => {
                  const newArt: GuideArticle = {
                    id: `art-${Date.now()}`,
                    title: 'Korean Waste Disposal & Recycling (종량제봉투) Rules',
                    category: 'Shopping',
                    readTimeMinutes: 4,
                    summary: 'Guide on district trash bags, food waste, and plastic recycling laws in Seoul.',
                    keySteps: ['Buy designated garbage bags at convenience store', 'Separate food waste from general waste', 'Dispose at designated times'],
                    lastUpdated: 'November 2026',
                    officialSource: 'Ministry of Environment',
                    sourceUrl: 'https://me.go.kr'
                  };
                  setArticlesList(prev => [newArt, ...prev]);
                  showToast('Added Waste Disposal Guide Article');
                  recordAuditAction('CREATE', 'Article', newArt.id, newArt.title, 'Created official settlement guide article.');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-lg cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Article</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {articlesList.map(art => (
                <div key={art.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#1769AA] border border-blue-100">
                        {art.category}
                      </span>
                      <h4 className="text-sm font-bold text-[#10243A]">{art.title}</h4>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">{art.summary}</p>
                    <div className="text-[11px] text-slate-400">
                      Source: {art.officialSource} · Last updated: {art.lastUpdated}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDeleteArticle(art.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Delete article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: VISA GUIDES POLICY MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'visa_guides' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Visa &amp; Immigration Policy Specifications</h2>
                <p className="text-xs text-slate-500">Statutory fees, document checklists, and work hour regulations per visa code.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visaGuidesList.map(v => (
                <div key={v.code} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-black text-white bg-[#10243A] px-2 py-0.5 rounded">
                        {v.code}
                      </span>
                      <h4 className="text-xs font-bold text-[#10243A] mt-1">{v.title}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      ₩{v.officialFeeKRW.toLocaleString()} fee
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{v.workPermissionSummary}</p>

                  <div className="text-[11px] text-slate-500">
                    Required Docs: <strong>{v.documents.length} forms</strong>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        showToast(`Policy alert published for ${v.code}`);
                        recordAuditAction('PUBLISH', 'VisaGuide', v.code, v.title, 'Updated regulatory advice for foreign scholars.');
                      }}
                      className="text-xs font-bold text-[#1769AA] hover:underline cursor-pointer"
                    >
                      Publish Regulation Notice
                    </button>
                    <a
                      href={v.officialSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Official Link
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PART 3, 4, 5: COMMUNITY ADMIN CONTROL CENTER              */}
        {/* ========================================================= */}
        {activeTab === 'community_posts' && (
          <AdminCommunityControlTab
            adminUid={currentUser?.uid || currentUser?.id || 'admin'}
            adminName={currentUser?.fullName || currentUser?.name || 'Super Admin'}
            adminEmail={currentUser?.email || 'admin@everykr.com'}
            users={usersList}
            initialSection="posts"
            onSuccessToast={showToast}
          />
        )}
        {activeTab === 'community_likes_comments' && (
          <AdminCommunityControlTab
            adminUid={currentUser?.uid || currentUser?.id || 'admin'}
            adminName={currentUser?.fullName || currentUser?.name || 'Super Admin'}
            adminEmail={currentUser?.email || 'admin@everykr.com'}
            users={usersList}
            initialSection="likes_comments"
            onSuccessToast={showToast}
          />
        )}
        {activeTab === 'community_users' && (
          <AdminCommunityControlTab
            adminUid={currentUser?.uid || currentUser?.id || 'admin'}
            adminName={currentUser?.fullName || currentUser?.name || 'Super Admin'}
            adminEmail={currentUser?.email || 'admin@everykr.com'}
            users={usersList}
            initialSection="users"
            onSuccessToast={showToast}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 11: MARKETPLACE MODERATION */}
        {/* ========================================================= */}
        {activeTab === 'marketplace_listings' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">Student Marketplace Moderation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketplaceItems.map(item => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-[#10243A]">{item.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.category} · {item.condition}</div>
                    <div className="font-mono text-xs font-bold text-[#1769AA] mt-1 tabular-nums">
                      ₩{item.priceKRW.toLocaleString()} KRW
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Seller: {item.sellerName} ({item.sellerContact})</div>
                  </div>

                  <button
                    onClick={() => handleModerateMarketplace(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 10: REPORTS & MODERATION QUEUE                        */}
        {/* ========================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
            <AdminCommunityControlTab
              adminUid={currentUser?.uid || currentUser?.id || 'admin'}
              adminName={currentUser?.fullName || currentUser?.name || 'Super Admin'}
              adminEmail={currentUser?.email || 'admin@everykr.com'}
              users={usersList}
              initialSection="reports"
              onSuccessToast={showToast}
            />

            {/* Live Contact Submissions Overview inside Reports Tab */}
            <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
                  <span>
                    Contact Us Inquiries ({contactSubmissions.length} total · {contactInboxAnalytics.unreadInquiries} unread)
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('contact_inbox')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1769AA] hover:bg-[#10243A] text-white transition cursor-pointer"
                >
                  Open Full Contact Management Inbox →
                </button>
              </div>

              {contactSubmissions.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No visitor or student inquiries submitted yet. New inquiries from <code>/contact</code> appear here and in the Contact Inbox tab automatically.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {contactSubmissions.slice(0, 5).map((sub) => (
                    <div
                      key={sub.submissionId}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {sub.ticketId}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            {sub.status}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {sub.subject}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                          {sub.message}
                        </p>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {sub.fullName} ({sub.email}) · {sub.category} · {new Date(sub.submittedAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInitialContactSubmissionId(sub.submissionId);
                          setActiveTab('contact_inbox');
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Manage &amp; Reply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 12A: CONTACT MANAGEMENT / INQUIRY INBOX               */}
        {/* ========================================================= */}
        {activeTab === 'contact_inbox' && (
          <AdminContactInboxTab
            submissions={contactSubmissions}
            onSubmissionsChange={setContactSubmissions}
            onRefreshSubmissions={refreshContactInbox}
            staffMembers={staffMembersList}
            adminActor={{
              uid: currentUser?.uid || currentUser?.id || 'admin',
              name: currentUser?.fullName || currentUser?.name || 'Super Admin',
              email: currentUser?.email || 'admin@everykr.com'
            }}
            adminHeaders={getAdminRequestHeaders(currentUser)}
            showToast={showToast}
            initialSelectedSubmissionId={initialContactSubmissionId}
            onClearInitialSelected={() => setInitialContactSubmissionId(null)}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 12B: NEWSLETTER SUBSCRIBERS & EMAIL CAMPAIGNS         */}
        {/* ========================================================= */}
        {activeTab === 'newsletter' && (
          <AdminNewsletterTab
            adminEmail={currentUser?.email || 'admin@everykr.com'}
            adminName={currentUser?.name || 'Super Admin'}
            showToast={showToast}
            onRecordAudit={(actionType, targetId, targetName, details) =>
              recordAuditAction(actionType, 'Article', targetId, targetName, details)
            }
          />
        )}

        {/* ========================================================= */}
        {/* TAB 13: KOREAN ACADEMY, ESSENTIAL HUB & FLIGHT MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'korean_academy' && <AdminKoreanAcademyTab />}
        {activeTab === 'essential_hub' && <AdminEssentialHubTab />}
        {(activeTab === 'transport_management' || activeTab === 'flight_management') && (
          <AdminTransportManagementTab initialSection={transportSection} />
        )}
        {activeTab === 'internal_requests' && (
          <AdminInternalRequestsTab
            adminUid={currentUser?.uid || currentUser?.id || 'admin'}
            adminName={currentUser?.fullName || currentUser?.name || 'Super Admin'}
            adminEmail={currentUser?.email || 'admin@everykr.com'}
            onToast={showToast}
          />
        )}
        {activeTab === 'global_trash' && <AdminGlobalTrashTab />}

        {/* ========================================================= */}
        {/* TAB 12C: DEVELOPER PROFILE & SITE SETTINGS (PHASE 11)     */}
        {/* ========================================================= */}
        {activeTab === 'site_settings' && (
          <AdminDeveloperSettingsTab
            onRecordAudit={(actionType, targetId, targetName, details) =>
              recordAuditAction(actionType, 'Article', targetId, targetName, details)
            }
          />
        )}

        {activeTab === 'audit_logs' && (
          <div className="bg-white dark:bg-[#10243A] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Immutable Administrative Audit Logs ({adminActivityLogs.length + auditLogs.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Records administrator ID, action, timestamp, and related record ID for document verifications, application status changes, account suspensions, university edits, data exports, and permission updates.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (!currentUser) return;
                    const combined = [
                      ...adminActivityLogs.map(a => ({
                        'Log ID': a.id,
                        'Admin UID': a.adminUid,
                        'Admin Name': a.adminName,
                        'Admin Email': a.adminEmail,
                        Action: a.action,
                        'Related Record / Target ID': a.targetUid || a.targetEmail || 'Platform',
                        Details: a.details,
                        Timestamp: a.timestamp
                      })),
                      ...auditLogs.map(l => ({
                        'Log ID': l.id,
                        'Admin UID': currentUser.uid || currentUser.id,
                        'Admin Name': l.adminName,
                        'Admin Email': l.adminEmail,
                        Action: l.actionType,
                        'Related Record / Target ID': `${l.targetEntity}:${l.targetId}`,
                        Details: `${l.targetName} — ${l.details}`,
                        Timestamp: l.timestamp
                      }))
                    ];
                    exportRecordsToCsvOrExcel({
                      filename: `EveryKR_Audit_Logs_${new Date().toISOString().slice(0, 10)}`,
                      sheetName: 'Audit_Logs',
                      rows: combined,
                      format: 'xlsx',
                      adminUid: currentUser.uid || currentUser.id,
                      adminName: currentUser.fullName || currentUser.name || 'Super Admin',
                      adminEmail: currentUser.email,
                      exportCategory: 'Immutable Audit Logs'
                    });
                    showToast('Audit logs exported to Excel (.xlsx)');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export (.xlsx)</span>
                </button>

                <button
                  onClick={() => {
                    const combined = { adminActivityLogs, auditLogs };
                    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(combined, null, 2))}`;
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute('href', jsonString);
                    downloadAnchor.setAttribute('download', `everykr-audit-log-${new Date().toISOString().split('T')[0]}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showToast('Audit log exported to JSON file');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Action</th>
                    <th className="p-4">Related Record / Target</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Administrator ID &amp; Email</th>
                    <th className="p-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {adminActivityLogs.map(alog => (
                    <tr key={alog.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                          {alog.action}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[#10243A] dark:text-white font-sans">
                        {alog.targetUid || alog.targetEmail || 'Platform'}
                      </td>
                      <td className="p-4 font-sans text-slate-700 dark:text-slate-300">
                        {alog.details}
                      </td>
                      <td className="p-4 font-sans text-slate-700 dark:text-slate-300">
                        <div className="font-bold">{alog.adminName}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {alog.adminUid} · {alog.adminEmail}
                        </div>
                      </td>
                      <td className="p-4 text-right text-slate-400 text-[11px] tabular-nums font-mono">
                        {new Date(alog.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.actionType === 'APPROVE' || log.actionType === 'PUBLISH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.actionType === 'DELETE' || log.actionType === 'REJECT'
                            ? 'bg-rose-100 text-rose-800'
                            : log.actionType === 'ROLE_CHANGE'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.actionType}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[#10243A] dark:text-white font-sans">
                        {log.targetEntity} ({log.targetId})
                      </td>
                      <td className="p-4 font-sans">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{log.targetName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{log.details}</div>
                      </td>
                      <td className="p-4 font-sans text-slate-700 dark:text-slate-300">
                        <div className="font-bold">{log.adminName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{log.adminEmail}</div>
                      </td>
                      <td className="p-4 text-right text-slate-400 text-[11px] tabular-nums font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </main>
      </div>

      {/* RIGHT SIDEBAR: Optional Collapsible Contextual Control Panel */}
      <AdminRightControlPanel
        activeGroup={activeNavContext.group}
        activeItem={activeNavContext.item}
        isOpen={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
        mobileOpen={mobileRightOpen}
        onCloseMobile={() => setMobileRightOpen(false)}
        adminEmail={currentUser?.email || 'admin@everykr.com'}
        isSuperAdmin={isSuperAdmin}
        notifications={adminNotifications}
        onMarkNotificationRead={(id) => void handleMarkNotificationRead(id)}
        onOpenNotification={handleOpenNotification}
        pendingTasks={pendingTasks}
        recentAdminLogs={adminActivityLogs}
        recentAuditLogs={auditLogs}
        apiHealth={apiHealth}
        onRefreshAll={() => void handleRefreshWorkspace()}
        onNavigate={handleNavigateWorkspace}
      />

      {/* ========================================================= */}
      {/* CONFIRMATION WORKFLOW MODAL */}
      {/* ========================================================= */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.actionType === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#10243A]">{confirmModal.title}</h3>
                  <p className="text-xs text-slate-500">Security &amp; Audit Confirmation</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {confirmModal.message}
              </p>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2 font-bold text-white rounded-lg cursor-pointer transition-colors shadow-xs ${
                    confirmModal.actionType === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {confirmModal.actionLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* UNIVERSITY BULK INGESTION & RECONCILIATION MODAL */}
        {/* ========================================================= */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-scale-in">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10243A] text-[#19B6A4] flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#10243A]">
                      University Master List Batch Ingestion &amp; Reconciliation Engine
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ingest raw text, CSV or JSON. Automatically preserves designated campuses, maps acronym aliases, deduplicates, and sets pending verification flags.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Input Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-[#10243A]">
                    Paste University Names (Comma-separated, Line-by-Line, or JSON array)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sampleList = universitiesList.map(u => u.name).join(', ');
                        setImportRawText(sampleList);
                      }}
                      className="text-[11px] font-semibold text-[#1769AA] hover:underline cursor-pointer"
                    >
                      Pre-fill All {universitiesList.length} Master Campuses
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setImportRawText('')}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  placeholder="e.g. Gachon University, The Catholic University of Korea (Main Campus), Kangwon National University (Gangneung Campus), Kangwon National University (Samcheok Campus), Konkuk University, Konkuk University (Glocal), KAIST..."
                  className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:border-[#1769AA] focus:ring-1 focus:ring-[#1769AA] outline-hidden bg-slate-50 leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500">
                    Rule: Campus designations like <code>(Glocal)</code>, <code>(ERICA)</code>, <code>(WISE)</code>, <code>(Main Campus)</code> are strictly preserved as distinct institutional records.
                  </div>
                  <button
                    type="button"
                    disabled={isImporting || !importRawText.trim()}
                    onClick={async () => {
                      setIsImporting(true);
                      try {
                        const report = await batchImportUniversities(importRawText);
                        setActiveImportReport(report);
                        recordAuditAction('EDIT', 'University', 'batch-import', 'Master Directory', `Reconciled and ingested ${report.totalImported} university campuses.`);
                        showToast(`Successfully processed and reconciled ${report.totalImported} universities!`);
                      } catch (err: any) {
                        showToast(`Import error: ${err.message || 'Processing failed'}`);
                      } finally {
                        setIsImporting(false);
                      }
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs cursor-pointer transition-colors ${
                      isImporting || !importRawText.trim()
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-[#10243A] hover:bg-[#1769AA]'
                    }`}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Reconciling &amp; Ingesting...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Run Reconciliation &amp; Ingest</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Reconciliation Report */}
              {(activeImportReport || universityImportReport) && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#10243A] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Reconciliation Audit Report
                      </h4>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Timestamp: {new Date((activeImportReport || universityImportReport).timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const report = activeImportReport || universityImportReport;
                        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `reconciliation-audit-report-${Date.now()}.json`;
                        a.click();
                        showToast('Audit report downloaded (JSON)');
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#1769AA] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Report (JSON)</span>
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  {(() => {
                    const r = activeImportReport || universityImportReport;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Total Supplied</div>
                          <div className="text-base font-black text-[#10243A] font-mono mt-0.5">{r.totalSupplied}</div>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-emerald-600">Imported / Indexed</div>
                          <div className="text-base font-black text-emerald-700 font-mono mt-0.5">{r.totalImported}</div>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-[#1769AA]">Campuses</div>
                          <div className="text-base font-black text-[#1769AA] font-mono mt-0.5">{r.totalCampuses}</div>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-amber-600">Aliases Linked</div>
                          <div className="text-base font-black text-amber-700 font-mono mt-0.5">{r.totalAliasesLinked}</div>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-indigo-600">Pending Verify</div>
                          <div className="text-base font-black text-indigo-700 font-mono mt-0.5">{r.totalPendingVerification}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sample Records Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2.5">Institution Entry</th>
                          <th className="p-2.5">Campus</th>
                          <th className="p-2.5">Reconciliation Status</th>
                          <th className="p-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {(activeImportReport || universityImportReport).records.slice(0, 50).map((rec: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-[#10243A]">{rec.name}</td>
                            <td className="p-2.5 text-slate-600">
                              <span className="font-mono">{rec.campus || 'Main Campus'}</span>
                            </td>
                            <td className="p-2.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                rec.status === 'imported'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : rec.status === 'duplicate'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-400 font-mono text-[10px]">
                              {rec.notes || 'Reconciled'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(activeImportReport || universityImportReport).records.length > 50 && (
                    <div className="text-center text-[10px] text-slate-400">
                      Showing first 50 of {(activeImportReport || universityImportReport).records.length} reconciled records. Download JSON for complete audit report.
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  Close &amp; Return to Admin Table
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
