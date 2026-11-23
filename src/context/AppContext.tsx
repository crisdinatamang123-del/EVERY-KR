import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  LanguageCode,
  UserProfile,
  University,
  UniversityImportReport,
  JobListing,
  AccommodationListing,
  CommunityPost,
  MarketplaceItem,
  UserReminder
} from '../types';
import {
  UNIVERSITIES as FALLBACK_UNIVERSITIES,
  JOBS as FALLBACK_JOBS,
  ACCOMMODATIONS as FALLBACK_ACCOMMODATIONS,
  COMMUNITY_POSTS as FALLBACK_POSTS,
  MARKETPLACE_ITEMS as FALLBACK_MARKETPLACE,
  TRANSLATIONS
} from '../data/mockData';
import { translateKey, SUPPORTED_LANGUAGES } from '../i18n/translations';
import {
  MASTER_UNIVERSITIES,
  MASTER_IMPORT_REPORT,
  resolveCanonicalUniversityId,
  isApprovedPriorityUniversity
} from '../data/universitiesMaster';
import {
  RelationalAdmissionDeadlineRecord,
  RelationalUniversityProgramRow,
  RelationalTuitionFeeRow,
  RelationalAdmissionRequirementRow,
  RelationalLanguageRequirementRow,
  RelationalApplicationDocumentRow,
  RelationalScholarshipRow,
  RelationalUniversitySourceRow,
  applyDeadlinesOverrideToUniversity,
  applyRelationalOverridesToUniversity,
  buildArchiveUniversityRelationalBundle,
} from '../data/universities25';
import {
  evaluateUniversityPublicationGate,
  getUniversityStrictStatus,
  generateUniversityAccuracyAuditReport,
  UNVERIFIED_UNIVERSITY_MESSAGE
} from '../utils/universityVerification';
import {
  signInWithGoogle,
  checkRedirectResult,
  syncUserProfile,
  authenticateEmailUser,
  isManualAuthSyncInProgress,
  clearAllAuthSessionStorage,
  verifyActiveAuthSession,
  getAuthSessionEpoch,
  bumpAuthSessionEpoch,
  isLogoutInProgress,
  performFirebaseSignOut,
  updateUserProfileDoc,
  ExtendedRegistrationPayload,
  fetchUniversities,
  saveUniversityDoc,
  saveAdmissionDeadlineDoc,
  deleteAdmissionDeadlineDoc,
  saveRelationalUniversityChildDoc,
  deleteRelationalUniversityChildDoc,
  createUniversityVerificationLogDoc,
  syncAll15RelationalTablesToFirestore,
  purgeUnapprovedFirestoreUniversities,
  batchUpsertUniversitiesDoc,
  deleteUniversityDoc,
  createAuditLogDoc,
  fetchJobs,
  createJobDoc,
  fetchAccommodations,
  createAccommodationDoc,
  adminSetAccommodationStatusDoc,
  fetchCommunityPosts,
  createCommunityPostDoc,
  likeCommunityPostDoc,
  addCommentToPostDoc,
  deleteCommunityPostDoc,
  fetchMarketplaceItems,
  createMarketplaceItemDoc,
  updateMarketplaceItemStatusDoc,
  deleteMarketplaceItemDoc,
  submitApplicationDoc,
  fetchUserApplications,
  fetchUserSavedItemsDoc,
  toggleUserSavedItemDoc,
  fetchUserRemindersDoc,
  addUserReminderDoc,
  toggleUserReminderDoc,
  deleteUserReminderDoc
} from '../services/firebaseService';
import { rotateGuestSessionOnLogout } from '../services/chatSessionService';
import { auth, db, testFirestoreConnection } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { PAGE_TO_PATH, resolveActivePageFromPath, getUniversitySlug } from '../utils/seoRoutes';

export type ActivePage =
  | 'home'
  | 'login'
  | 'register'
  | 'universities'
  | 'programs'
  | 'deadlines'
  | 'application-guide'
  | 'scholarships'
  | 'visa'
  | 'jobs'
  | 'housing'
  | 'accommodation'
  | 'transportation'
  | 'shopping'
  | 'daily-life'
  | 'services'
  | 'community'
  | 'marketplace'
  | 'news'
  | 'events'
  | 'study-in-korea'
  | 'study-language'
  | 'korean-academy'
  | 'learn-hangul'
  | 'discover-korea'
  | 'explore-korea'
  | 'ai-chat'
  | 'about'
  | 'dashboard'
  | 'profile'
  | 'settings'
  | 'admin'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'disclaimer';

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  appliedDate: string;
  status: 'Submitted' | 'Under Review' | 'Interview Scheduled' | 'Accepted' | 'Rejected';
  applicantName: string;
  applicantEmail: string;
  visaStatus: string;
  notes?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'job' | 'visa' | 'community' | 'system';
}

export type ThemeMode = 'light' | 'dark';

interface AppContextType {
  activePage: ActivePage;
  setActivePage: (page: ActivePage | ((prev: ActivePage) => ActivePage)) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;

  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  // Auth
  currentUser: UserProfile | null;
  isAuthReady: boolean;
  isLoggingOut?: boolean;
  isServerVerifiedAdmin: boolean;
  login: (
    email: string,
    role?: UserProfile['role'],
    name?: string,
    isSignup?: boolean,
    password?: string,
    verificationProofToken?: string,
    registrationPayload?: ExtendedRegistrationPayload,
    recaptchaToken?: string
  ) => Promise<void>;
  loginWithGoogle: (useRedirect?: boolean, selectedRole?: UserProfile['role']) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile> & { rawPassportNumber?: string }) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'signup';
  setAuthModalMode: (mode: 'login' | 'signup') => void;

  // Modals & Drawers
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isGetHelpModalOpen: boolean;
  setIsGetHelpModalOpen: (open: boolean) => void;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;

  // Item Modals
  selectedUniversity: University | null;
  setSelectedUniversity: (uni: University | null) => void;
  selectedJob: JobListing | null;
  setSelectedJob: (job: JobListing | null) => void;
  selectedAccommodation: AccommodationListing | null;
  setSelectedAccommodation: (acc: AccommodationListing | null) => void;

  // Creation Modals
  isPostJobModalOpen: boolean;
  setIsPostJobModalOpen: (open: boolean) => void;
  isAddHousingModalOpen: boolean;
  setIsAddHousingModalOpen: (open: boolean) => void;
  isCreatePostModalOpen: boolean;
  setIsCreatePostModalOpen: (open: boolean) => void;
  isCreateMarketplaceModalOpen: boolean;
  setIsCreateMarketplaceModalOpen: (open: boolean) => void;

  // Saved Items
  savedUniversityIds: string[];
  toggleSaveUniversity: (id: string) => void;
  savedJobIds: string[];
  toggleSaveJob: (id: string) => void;
  savedAccommodationIds: string[];
  toggleSaveAccommodation: (id: string) => void;

  // Comparison
  comparedUniversityIds: string[];
  toggleCompareUniversity: (id: string) => void;
  clearComparison: () => void;

  // Checklist
  checkedDocuments: Record<string, boolean>;
  toggleDocumentCheck: (docId: string) => void;

  // Applications
  applications: JobApplication[];
  submitJobApplication: (jobId: string, applicantData: { name: string; email: string; visaStatus: string; notes?: string }) => void;

  // Community
  posts: CommunityPost[];
  createPost: (post: Omit<CommunityPost, 'id' | 'timestamp' | 'repliesCount' | 'likesCount' | 'bookmarked'>) => void;
  likePost: (id: string) => void;
  addPostReply: (postId: string, content: string) => void;
  deletePost: (id: string) => Promise<void>;

  // Marketplace
  marketplaceItems: MarketplaceItem[];
  createMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'postedDate' | 'status'>) => void;
  updateMarketplaceStatus: (id: string, status: 'Available' | 'Reserved' | 'Sold') => Promise<void>;
  deleteMarketplaceItem: (id: string) => Promise<void>;

  // Reminders
  reminders: UserReminder[];
  addReminder: (reminder: Omit<UserReminder, 'id' | 'completed'>) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // Universities Directory State (25 Approved Priority + 113 Preserved Archive = 138 Records)
  universitiesList: University[];
  approvedUniversitiesList: University[];
  addUniversity: (uni: University) => Promise<void>;
  updateUniversity: (uniId: string, updates: Partial<University>) => Promise<void>;
  deleteUniversity: (uniId: string) => Promise<void>;
  saveUniversityDeadlineRound: (round: RelationalAdmissionDeadlineRecord) => Promise<void>;
  deleteUniversityDeadlineRound: (deadlineId: string, universityId: string) => Promise<void>;
  saveUniversityProgram: (row: RelationalUniversityProgramRow) => Promise<void>;
  deleteUniversityProgram: (programId: string, universityId: string) => Promise<void>;
  saveUniversityTuitionFee: (row: RelationalTuitionFeeRow) => Promise<void>;
  deleteUniversityTuitionFee: (tuitionId: string, universityId: string) => Promise<void>;
  saveUniversityRequirement: (row: RelationalAdmissionRequirementRow) => Promise<void>;
  deleteUniversityRequirement: (reqId: string, universityId: string) => Promise<void>;
  saveUniversityLanguageRequirement: (row: RelationalLanguageRequirementRow) => Promise<void>;
  saveUniversityDocument: (row: RelationalApplicationDocumentRow) => Promise<void>;
  deleteUniversityDocument: (docId: string, universityId: string) => Promise<void>;
  saveUniversityScholarship: (row: RelationalScholarshipRow) => Promise<void>;
  deleteUniversityScholarship: (scholarshipId: string, universityId: string) => Promise<void>;
  saveUniversitySource: (row: RelationalUniversitySourceRow) => Promise<void>;
  deleteUniversitySource: (sourceId: string, universityId: string) => Promise<void>;
  syncRelationalUniversityDatabase: () => Promise<{ tablesSynced: number; recordsSynced: number }>;
  purgeUnapprovedCloudUniversities: () => Promise<{ scanned: number; deletedCount: number; deletedIds: string[] }>;
  batchImportUniversities: (rawInput: string | University[]) => Promise<UniversityImportReport>;
  universityImportReport: UniversityImportReport | null;

  // Jobs & Accommodations state
  jobsList: JobListing[];
  accommodationList: AccommodationListing[];
  refreshAccommodations: () => Promise<void>;
  addJob: (job: Omit<JobListing, 'id' | 'postedDate' | 'verified'>) => void;
  addAccommodation: (acc: Omit<AccommodationListing, 'id' | 'verified'>) => Promise<AccommodationListing>;
  approveJob: (id: string) => void;
  approveAccommodation: (id: string) => Promise<void>;

  // Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  unreadCount: number;

  // Toast feedback
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Firestore status
  isDatabaseConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_STUDENT_REMINDERS: UserReminder[] = [
  {
    id: 'rem-1',
    title: 'HiKorea ARC Appointment (Within 90 Days of Arrival)',
    dueDate: '2026-11-20',
    category: 'ARC & Immigration',
    completed: false,
    notes: 'Prepare Tuberculosis certificate, passport, dorm contract, and ₩30,000 application fee.'
  },
  {
    id: 'rem-2',
    title: 'NHIS National Health Insurance Monthly Automatic Payment',
    dueDate: '2026-11-25',
    category: 'Health Insurance',
    completed: false,
    notes: 'Debited on the 25th of every month. Keep registered Korean bank account funded.'
  },
  {
    id: 'rem-3',
    title: 'Spring 2027 Semester Tuition Payment Window',
    dueDate: '2027-01-15',
    category: 'Tuition',
    completed: false,
    notes: 'Check virtual account on university student portal for scholarship deductions.'
  }
];

function createWelcomeNotifications(userName: string): AppNotification[] {
  return [
    {
      id: `notif-welcome-${Date.now()}`,
      title: `Welcome to EveryKR, ${userName}!`,
      message: 'Your personal student profile, visa checklist, and saved items are securely isolated to your account.',
      timestamp: 'Just now',
      read: false,
      type: 'system'
    },
    {
      id: 'notif-visa-policy',
      title: 'Immigration Policy Update: HiKorea ARC System',
      message: 'Korea Immigration Service announced new electronic ARC appointment slots for international scholars.',
      timestamp: '1 day ago',
      read: false,
      type: 'visa'
    }
  ];
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activePage, setActivePageState] = useState<ActivePage>(() =>
    resolveActivePageFromPath(window.location.pathname)
  );

  // Keep activePage synced with browser URL changes (Back/Forward/Direct links)
  useEffect(() => {
    const resolved = resolveActivePageFromPath(location.pathname);
    setActivePageState(resolved);
  }, [location.pathname]);

  const setActivePage = (pageOrUpdater: ActivePage | ((prev: ActivePage) => ActivePage)) => {
    const nextPage =
      typeof pageOrUpdater === 'function' ? pageOrUpdater(activePage) : pageOrUpdater;
    if (nextPage === 'ai-chat') {
      window.dispatchEvent(new CustomEvent('open-everykr-ai'));
      return;
    }
    setActivePageState(nextPage);
    const targetPath = PAGE_TO_PATH[nextPage] || '/';
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const savedLang = localStorage.getItem('everykr_language') as LanguageCode | null;
      if (savedLang && ['en', 'bn', 'ko', 'ne', 'ur', 'hi', 'ar', 'zh', 'ja'].includes(savedLang)) {
        return savedLang;
      }
    } catch {
      // ignore storage errors
    }
    return 'en';
  });

  // Sync HTML lang attribute, RTL/LTR direction for Urdu & Arabic, and localStorage persistence
  useEffect(() => {
    try {
      const langMeta = SUPPORTED_LANGUAGES.find(l => l.code === language);
      const dir = langMeta?.dir || (language === 'ur' || language === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
      localStorage.setItem('everykr_language', language);
    } catch (err) {
      console.error('Error syncing language attributes:', err);
    }
  }, [language]);

  // CRITICAL SECURITY: Never trust synchronous localStorage flags on load.
  // Start unauthenticated until Firebase Auth or signed server session token is cryptographically verified.
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const isLoggingOutRef = useRef<boolean>(false);
  const [isServerVerifiedAdmin, setIsServerVerifiedAdmin] = useState<boolean>(false);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState<boolean>(true);

  // Global Theme State (user preference persisted; respects device theme on first visit)
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem('everykr_theme');
      if (stored === 'light' || stored === 'dark') return stored;
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('everykr_theme', theme);
    } catch (err) {
      console.error('Error applying theme:', err);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGetHelpModalOpen, setIsGetHelpModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Selected item drawers/modals
  const [selectedUniversity, setSelectedUniversityState] = useState<University | null>(null);
  const setSelectedUniversity = (uni: University | null) => {
    if (uni) {
      setSelectedUniversityState(null);
      navigate(`/universities/${getUniversitySlug(uni)}`);
    } else {
      setSelectedUniversityState(null);
    }
  };
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [selectedAccommodation, setSelectedAccommodation] = useState<AccommodationListing | null>(null);

  // Creation modals
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [isAddHousingModalOpen, setIsAddHousingModalOpen] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCreateMarketplaceModalOpen, setIsCreateMarketplaceModalOpen] = useState(false);

  // Per-User Isolated States (Empty in Guest Mode)
  const [savedUniversityIds, setSavedUniversityIds] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savedAccommodationIds, setSavedAccommodationIds] = useState<string[]>([]);
  const [comparedUniversityIds, setComparedUniversityIds] = useState<string[]>([]);
  const [checkedDocuments, setCheckedDocuments] = useState<Record<string, boolean>>({});
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [reminders, setReminders] = useState<UserReminder[]>([]);

  // Public directory states
  const [posts, setPosts] = useState<CommunityPost[]>(FALLBACK_POSTS);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(FALLBACK_MARKETPLACE);
  const [universitiesList, setUniversitiesList] = useState<University[]>(MASTER_UNIVERSITIES);
  const approvedUniversitiesList = useMemo(
    () => universitiesList.filter((u) => isApprovedPriorityUniversity(u)),
    [universitiesList]
  );
  const [universityImportReport, setUniversityImportReport] = useState<UniversityImportReport | null>(MASTER_IMPORT_REPORT);
  const [jobsList, setJobsList] = useState<JobListing[]>(FALLBACK_JOBS);
  const [accommodationList, setAccommodationList] = useState<AccommodationListing[]>(FALLBACK_ACCOMMODATIONS);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    const langMeta = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    const label = langMeta ? `${langMeta.nativeLabel} (${langMeta.label})` : lang;
    showToast(`Language: ${label}`);
    if (currentUser) {
      const updatedUser: UserProfile = { ...currentUser, preferredLanguage: lang };
      setCurrentUser(updatedUser);
      updateUserProfileDoc(currentUser.id, { preferredLanguage: lang }).catch(() => {
        // non-blocking preference sync
      });
    }
  };

  const t = (key: string): string => {
    const fromCentral = translateKey(language, key);
    if (fromCentral !== key) return fromCentral;
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  // Clear all user-scoped state (used on logout or guest session)
  const clearAllUserState = () => {
    setCurrentUser(null);
    setSavedUniversityIds([]);
    setSavedJobIds([]);
    setSavedAccommodationIds([]);
    setComparedUniversityIds([]);
    setCheckedDocuments({});
    setApplications([]);
    setReminders([]);
    setNotifications([]);
  };

  // Load isolated per-UID data from local cache + Firestore
  const loadIsolatedUserData = async (profile: UserProfile) => {
    const uid = profile.id;

    // 1. Load per-UID cached state immediately for zero-latency isolation
    try {
      const cachedSaved = localStorage.getItem(`everykr_saved_${uid}`);
      if (cachedSaved) {
        const parsed = JSON.parse(cachedSaved);
        setSavedUniversityIds(Array.isArray(parsed.universities) ? parsed.universities : []);
        setSavedJobIds(Array.isArray(parsed.jobs) ? parsed.jobs : []);
        setSavedAccommodationIds(Array.isArray(parsed.accommodations) ? parsed.accommodations : []);
      } else {
        setSavedUniversityIds([]);
        setSavedJobIds([]);
        setSavedAccommodationIds([]);
      }

      const cachedChecklist = localStorage.getItem(`everykr_checklist_${uid}`);
      setCheckedDocuments(cachedChecklist ? JSON.parse(cachedChecklist) : {});

      const cachedApps = localStorage.getItem(`everykr_apps_${uid}`);
      setApplications(cachedApps ? JSON.parse(cachedApps) : []);

      const cachedReminders = localStorage.getItem(`everykr_reminders_${uid}`);
      setReminders(cachedReminders ? JSON.parse(cachedReminders) : DEFAULT_STUDENT_REMINDERS);

      const cachedNotifs = localStorage.getItem(`everykr_notifs_${uid}`);
      if (cachedNotifs) {
        setNotifications(JSON.parse(cachedNotifs));
      } else {
        const initialNotifs = createWelcomeNotifications(profile.name);
        setNotifications(initialNotifs);
        localStorage.setItem(`everykr_notifs_${uid}`, JSON.stringify(initialNotifs));
      }
    } catch (e) {
      console.warn('Error reading per-UID local cache:', e);
    }

    // 2. Sync with Firestore scoped by UID
    try {
      const [userApps, userReminders, userSaved] = await Promise.all([
        fetchUserApplications(uid),
        fetchUserRemindersDoc(uid),
        fetchUserSavedItemsDoc(uid)
      ]);

      if (userApps.length > 0) {
        setApplications(userApps as JobApplication[]);
        localStorage.setItem(`everykr_apps_${uid}`, JSON.stringify(userApps));
      }
      if (userReminders.length > 0) {
        setReminders(userReminders);
        localStorage.setItem(`everykr_reminders_${uid}`, JSON.stringify(userReminders));
      }
      if (userSaved.length > 0) {
        const unis = userSaved.filter(s => s.itemType === 'university').map(s => s.itemId);
        const jobs = userSaved.filter(s => s.itemType === 'job').map(s => s.itemId);
        const accs = userSaved.filter(s => s.itemType === 'accommodation').map(s => s.itemId);
        setSavedUniversityIds(unis);
        setSavedJobIds(jobs);
        setSavedAccommodationIds(accs);
        localStorage.setItem(`everykr_saved_${uid}`, JSON.stringify({ universities: unis, jobs, accommodations: accs }));
      }
    } catch (e) {
      console.warn('Could not sync user data from Firestore:', e);
    }
  };

  // Persist saved items per UID whenever they change
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      localStorage.setItem(
        `everykr_saved_${currentUser.id}`,
        JSON.stringify({
          universities: savedUniversityIds,
          jobs: savedJobIds,
          accommodations: savedAccommodationIds
        })
      );
    } catch {
      // ignore
    }
  }, [currentUser?.id, savedUniversityIds, savedJobIds, savedAccommodationIds]);

  // Persist checklist per UID
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      localStorage.setItem(`everykr_checklist_${currentUser.id}`, JSON.stringify(checkedDocuments));
    } catch {
      // ignore
    }
  }, [currentUser?.id, checkedDocuments]);

  // Sync with Firestore on mount and via real-time cross-browser onSnapshot listeners
  useEffect(() => {
    let isMounted = true;

    async function loadFirestoreData() {
      const isOnline = await testFirestoreConnection();
      if (isMounted) setIsDatabaseConnected(isOnline);

      try {
        const [cloudUnis, cloudJobs, cloudAccommodations, cloudPosts, cloudMarketplace] = await Promise.all([
          fetchUniversities(),
          fetchJobs(),
          fetchAccommodations(),
          fetchCommunityPosts(),
          fetchMarketplaceItems()
        ]);

        if (!isMounted) return;
        if (cloudUnis.length > 0) setUniversitiesList(cloudUnis);
        if (cloudJobs.length > 0) setJobsList(cloudJobs);
        if (cloudAccommodations.length > 0) setAccommodationList(cloudAccommodations);
        if (cloudPosts.length > 0) setPosts(cloudPosts);
        if (cloudMarketplace.length > 0) setMarketplaceItems(cloudMarketplace);
      } catch (err) {
        console.warn('Using resilient cached storage while syncing with Firestore.', err);
      }
    }

    loadFirestoreData();

    // Real-time Firestore listeners for cross-browser / cross-device synchronization
    const unsubs: Array<() => void> = [];
    let isInitialSnap = true;
    const snapTimer = setTimeout(() => {
      isInitialSnap = false;
    }, 1500);

    try {
      unsubs.push(
        onSnapshot(
          collection(db, 'universities'),
          () => {
            if (isInitialSnap) return;
            fetchUniversities().then((list) => {
              if (isMounted && list.length > 0) setUniversitiesList(list);
            }).catch(() => {});
          },
          () => {}
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'jobs'),
          () => {
            if (isInitialSnap) return;
            fetchJobs().then((list) => {
              if (isMounted && list.length > 0) setJobsList(list);
            }).catch(() => {});
          },
          () => {}
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'accommodations'),
          () => {
            if (isInitialSnap) return;
            fetchAccommodations().then((list) => {
              if (isMounted && list.length > 0) setAccommodationList(list);
            }).catch(() => {});
          },
          () => {}
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'community_posts'),
          () => {
            if (isInitialSnap) return;
            fetchCommunityPosts().then((list) => {
              if (isMounted && list.length > 0) setPosts(list);
            }).catch(() => {});
          },
          () => {}
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'marketplace_items'),
          () => {
            if (isInitialSnap) return;
            fetchMarketplaceItems().then((list) => {
              if (isMounted && list.length > 0) setMarketplaceItems(list);
            }).catch(() => {});
          },
          () => {}
        )
      );
    } catch {
      // Ignore snapshot listener initialization errors
    }

    const handleWindowFocus = () => {
      loadFirestoreData();
    };
    window.addEventListener('focus', handleWindowFocus);

    // Listen to Firebase auth changes and verify active session cryptographically
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      const epoch = getAuthSessionEpoch();
      if (isLogoutInProgress()) {
        clearAllUserState();
        setIsServerVerifiedAdmin(false);
        setIsAuthReady(true);
        return;
      }

      if (fbUser) {
        // If an explicit login/registration flow (e.g. authenticateEmailUser) is actively running,
        // let that flow complete its authoritative syncUserProfile with full registration payload first.
        if (isManualAuthSyncInProgress()) {
          return;
        }
        try {
          const profile = await syncUserProfile(fbUser);
          if (isLogoutInProgress() || getAuthSessionEpoch() !== epoch) {
            return;
          }
          const sessionCheck = await verifyActiveAuthSession(fbUser);
          if (isLogoutInProgress() || getAuthSessionEpoch() !== epoch) {
            return;
          }
          const verifiedAdmin = sessionCheck.isAdmin || profile.role === 'admin';
          setCurrentUser(profile);
          setIsServerVerifiedAdmin(verifiedAdmin);
          setIsAuthModalOpen(false);
          setIsAuthReady(true);
          loadIsolatedUserData(profile).catch(err => console.warn('Background user data sync notice:', err));
        } catch (err) {
          console.error('Error syncing authenticated user profile:', err);
          if (!isLogoutInProgress() && getAuthSessionEpoch() === epoch) {
            clearAllAuthSessionStorage();
            clearAllUserState();
            setIsServerVerifiedAdmin(false);
            setIsAuthReady(true);
          }
        }
      } else {
        // If no Firebase Auth user is signed in, cryptographically verify any existing signed server session token
        try {
          const sessionCheck = await verifyActiveAuthSession(null);
          if (isLogoutInProgress() || getAuthSessionEpoch() !== epoch) {
            return;
          }
          if (sessionCheck.authenticated && sessionCheck.user) {
            setCurrentUser(sessionCheck.user);
            setIsServerVerifiedAdmin(Boolean(sessionCheck.isAdmin));
            setIsAuthReady(true);
            loadIsolatedUserData(sessionCheck.user).catch(err =>
              console.warn('Background user data sync notice:', err)
            );
          } else {
            clearAllAuthSessionStorage();
            clearAllUserState();
            setIsServerVerifiedAdmin(false);
            setIsAuthReady(true);
          }
        } catch {
          if (!isLogoutInProgress() && getAuthSessionEpoch() === epoch) {
            clearAllAuthSessionStorage();
            clearAllUserState();
            setIsServerVerifiedAdmin(false);
            setIsAuthReady(true);
          }
        }
      }
    });

    // Process any returning Google OAuth redirect credentials (mobile & redirect mode)
    checkRedirectResult()
      .then(async (redirectProfile) => {
        if (redirectProfile && !isLogoutInProgress()) {
          bumpAuthSessionEpoch();
          const sessionCheck = await verifyActiveAuthSession(auth.currentUser);
          if (isLogoutInProgress()) return;
          setCurrentUser(redirectProfile);
          setIsServerVerifiedAdmin(sessionCheck.isAdmin || redirectProfile.role === 'admin');
          setIsAuthModalOpen(false);
          setIsAuthReady(true);
          showToast(`Signed in with Google as ${redirectProfile.name} (${redirectProfile.role.toUpperCase()})`);
          loadIsolatedUserData(redirectProfile).catch(err => console.warn('Background user data sync notice:', err));
        }
      })
      .catch(err => {
        console.warn('Google redirect check error:', err);
      });

    return () => {
      isMounted = false;
      clearTimeout(snapTimer);
      window.removeEventListener('focus', handleWindowFocus);
      unsubs.forEach((u) => u());
      unsubscribeAuth();
    };
  }, []);

  // Real Google Sign-In with Dual-Mode OAuth (Popup + Redirect) and Role Preservation
  const loginWithGoogle = async (
    useRedirect: boolean = false,
    selectedRole?: UserProfile['role']
  ) => {
    try {
      const profile = await signInWithGoogle(useRedirect, selectedRole);
      if (profile) {
        bumpAuthSessionEpoch();
        const sessionCheck = await verifyActiveAuthSession(auth.currentUser);
        setCurrentUser(profile);
        setIsServerVerifiedAdmin(sessionCheck.isAdmin || profile.role === 'admin');
        setIsAuthModalOpen(false);
        setIsAuthReady(true);
        showToast(`Signed in with Google as ${profile.name} (${profile.role.toUpperCase()})`);
        loadIsolatedUserData(profile).catch(err => console.warn('Background user data sync notice:', err));
      }
    } catch (err: any) {
      console.error('Google Sign-In caught error:', err);
      throw err;
    }
  };

  // Strict Email/Password Login & OTP-Verified Registration
  const login = async (
    email: string,
    role: UserProfile['role'] = 'student',
    name?: string,
    isSignup: boolean = false,
    password?: string,
    verificationProofToken?: string,
    registrationPayload?: ExtendedRegistrationPayload,
    recaptchaToken?: string
  ) => {
    const profile = await authenticateEmailUser({
      email,
      password,
      role,
      name,
      isSignup,
      verificationProofToken,
      registrationPayload,
      recaptchaToken
    });
    bumpAuthSessionEpoch();
    const sessionCheck = await verifyActiveAuthSession(auth.currentUser);
    setCurrentUser(profile);
    setIsServerVerifiedAdmin(sessionCheck.isAdmin && profile.role === 'admin');
    setIsAuthModalOpen(false);
    setIsAuthReady(true);
    showToast(
      isSignup
        ? `Email verified! Welcome to EveryKR, ${profile.name} (${(profile.accountType || profile.role).toUpperCase()})`
        : `Signed in as ${profile.name} (${(profile.accountType || profile.role).toUpperCase()})`
    );
    loadIsolatedUserData(profile).catch(err => console.warn('Background user data sync notice:', err));
  };

  const logout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);

    const currentPath = location.pathname;
    const protectedPrefixes = [
      '/dashboard',
      '/profile',
      '/student-portal',
      '/settings',
      '/sim',
      '/shopping',
      '/sim-shopping',
      '/admin'
    ];
    const wasOnProtectedRoute = protectedPrefixes.some(
      (prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`)
    );

    // Immediately clear authenticated state and rotate AI guest session on single click
    rotateGuestSessionOnLogout();
    setIsServerVerifiedAdmin(false);
    clearAllUserState();
    setIsAuthReady(true);

    if (wasOnProtectedRoute) {
      navigate('/login', { replace: true });
    }

    try {
      await performFirebaseSignOut();
      showToast('Signed out of EveryKR.');
    } catch (err) {
      console.error('Firebase signOut error:', err);
      clearAllAuthSessionStorage();
      showToast('Sign out encountered an error. Please check your connection and try again.');
    } finally {
      isLoggingOutRef.current = false;
      setIsLoggingOut(false);
    }
  };

  const updateProfile = (profile: Partial<UserProfile> & { rawPassportNumber?: string }) => {
    if (currentUser) {
      // Security: Disallow client-side self-elevation to admin
      const { role: _ignoredRole, id: _ignoredId, rawPassportNumber, ...safeUpdates } = profile;
      const updated: UserProfile = {
        ...currentUser,
        ...safeUpdates,
        id: currentUser.id,
        name: safeUpdates.fullName || safeUpdates.name || currentUser.name,
        fullName: safeUpdates.fullName || safeUpdates.name || currentUser.fullName || currentUser.name,
        updatedAt: new Date().toISOString()
      };
      setCurrentUser(updated);
      updateUserProfileDoc(currentUser.id, { ...safeUpdates, rawPassportNumber })
        .then(serverSynced => {
          if (serverSynced) {
            setCurrentUser(serverSynced);
          }
        })
        .catch(e => console.warn(e));
      showToast('Profile updated and saved to your account');
    }
  };

  // Saved toggle functions (Scoped to currentUser.id when authenticated)
  const toggleSaveUniversity = (id: string) => {
    setSavedUniversityIds(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x => x !== id) : [...prev, id];
      showToast(exists ? 'University removed from saved list' : 'University saved to your account');
      return next;
    });
    if (currentUser?.id) {
      toggleUserSavedItemDoc(currentUser.id, 'university', id).catch(e => console.warn(e));
    }
  };

  const toggleSaveJob = (id: string) => {
    setSavedJobIds(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x => x !== id) : [...prev, id];
      showToast(exists ? 'Job removed from saved list' : 'Job saved to your account');
      return next;
    });
    if (currentUser?.id) {
      toggleUserSavedItemDoc(currentUser.id, 'job', id).catch(e => console.warn(e));
    }
  };

  const toggleSaveAccommodation = (id: string) => {
    setSavedAccommodationIds(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x => x !== id) : [...prev, id];
      showToast(exists ? 'Accommodation removed from saved list' : 'Accommodation saved to your account');
      return next;
    });
    if (currentUser?.id) {
      toggleUserSavedItemDoc(currentUser.id, 'accommodation', id).catch(e => console.warn(e));
    }
  };

  // Compare functions
  const toggleCompareUniversity = (id: string) => {
    setComparedUniversityIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 3) {
        showToast('You can compare a maximum of 3 universities');
        return prev;
      }
      showToast('Added to University Comparison');
      return [...prev, id];
    });
  };

  const clearComparison = () => {
    setComparedUniversityIds([]);
  };

  // Checklist toggle
  const toggleDocumentCheck = (docId: string) => {
    setCheckedDocuments(prev => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  // Real Job application with Firestore + per-UID storage
  const submitJobApplication = async (jobId: string, data: { name: string; email: string; visaStatus: string; notes?: string }) => {
    const job = jobsList.find(j => j.id === jobId);
    const applicantUid = currentUser?.id || 'guest-user';

    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      jobId,
      jobTitle: job ? job.title : 'Job Position',
      company: job ? job.company : 'Company in Korea',
      appliedDate: 'Just now',
      status: 'Submitted',
      applicantName: data.name,
      applicantEmail: data.email,
      visaStatus: data.visaStatus,
      notes: data.notes
    };

    setApplications(prev => {
      const updated = [newApp, ...prev];
      if (currentUser?.id) {
        try {
          localStorage.setItem(`everykr_apps_${currentUser.id}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });
    showToast(`Application successfully sent to ${job?.company || 'employer'}`);
    setSelectedJob(null);

    submitApplicationDoc({
      jobId,
      jobTitle: job ? job.title : 'Job Position',
      company: job ? job.company : 'Company in Korea',
      applicantId: applicantUid,
      applicantName: data.name,
      applicantEmail: data.email,
      visaStatus: data.visaStatus,
      notes: data.notes
    }).catch(err => console.warn('Saved locally and queued for cloud sync:', err));
  };

  // Real Community post creation with Firestore write
  const createPost = async (newPostData: Omit<CommunityPost, 'id' | 'timestamp' | 'repliesCount' | 'likesCount' | 'bookmarked'>) => {
    const authorUid = currentUser?.id || 'anon-user';
    const localPost: CommunityPost = {
      ...newPostData,
      id: `post-${Date.now()}`,
      timestamp: 'Just now',
      repliesCount: 0,
      likesCount: 1,
      bookmarked: false,
      replies: []
    };

    setPosts(prev => [localPost, ...prev]);
    showToast('Community discussion published to Firestore');
    setIsCreatePostModalOpen(false);

    createCommunityPostDoc(newPostData, authorUid).catch(e => console.warn(e));
  };

  const likePost = (id: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === id) {
        likeCommunityPostDoc(id, p.likesCount).catch(e => console.warn(e));
        return { ...p, likesCount: p.likesCount + 1 };
      }
      return p;
    }));
  };

  const addPostReply = (postId: string, content: string) => {
    const authorUid = currentUser?.id || 'anon-user';
    const authorName = currentUser?.name || 'International Student';

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const newReply = {
          id: `rep-${Date.now()}`,
          authorName,
          timestamp: 'Just now',
          content,
          isVerifiedStudent: true
        };
        return {
          ...p,
          repliesCount: p.repliesCount + 1,
          replies: [...(p.replies || []), newReply]
        };
      }
      return p;
    }));

    addCommentToPostDoc(postId, content, authorName, authorUid).catch(e => console.warn(e));
    showToast('Reply published to Firestore');
  };

  // Real Marketplace creation with Firestore write
  const createMarketplaceItem = async (itemData: Omit<MarketplaceItem, 'id' | 'postedDate' | 'status'>) => {
    const sellerUid = currentUser?.id || 'anon-seller';
    const localItem: MarketplaceItem = {
      ...itemData,
      id: `mkt-${Date.now()}`,
      postedDate: 'Today',
      status: 'Available'
    };

    setMarketplaceItems(prev => [localItem, ...prev]);
    showToast('Listing published to Firestore Student Marketplace');
    setIsCreateMarketplaceModalOpen(false);

    createMarketplaceItemDoc(itemData, sellerUid).catch(e => console.warn(e));
  };

  // Real Job addition with Firestore write
  const addJob = async (jobData: Omit<JobListing, 'id' | 'postedDate' | 'verified'>) => {
    const employerUid = currentUser?.id || 'employer-admin';
    const localJob: JobListing = {
      ...jobData,
      id: `job-${Date.now()}`,
      postedDate: 'Today',
      verified: true
    };
    setJobsList(prev => [localJob, ...prev]);
    showToast('Job listing published to Firestore');
    setIsPostJobModalOpen(false);

    createJobDoc(jobData, employerUid).catch(e => console.warn(e));
  };

  const refreshAccommodations = async () => {
    try {
      const latest = await fetchAccommodations();
      setAccommodationList(
        latest.filter(
          item => item.approvalStatus === 'Approved' && item.availability === 'Available'
        )
      );
    } catch (e) {
      console.warn('Could not refresh public accommodations:', e);
    }
  };

  // Real Accommodation addition with Firestore write (Always defaults to Pending; never publicly visible until Admin approval)
  const addAccommodation = async (
    accData: Omit<AccommodationListing, 'id' | 'verified'>
  ): Promise<AccommodationListing> => {
    const creatorUid = currentUser?.id || 'landlord-user';
    const created = await createAccommodationDoc(accData, creatorUid);
    // Only Approved + Available listings appear in public accommodationList
    await refreshAccommodations();
    showToast('Accommodation listing submitted for administrator approval (Status: Pending)');
    setIsAddHousingModalOpen(false);
    return created;
  };

  const approveJob = (id: string) => {
    setJobsList(prev => prev.map(j => j.id === id ? { ...j, verified: true } : j));
    showToast('Job listing verified in database');
  };

  const approveAccommodation = async (id: string) => {
    await adminSetAccommodationStatusDoc({
      propertyId: id,
      approvalStatus: 'Approved',
      availability: 'Available',
      adminEmail: currentUser?.email || 'admin@everykr.com'
    });
    await refreshAccommodations();
    showToast('Accommodation listing approved and published');
  };

  const deletePost = async (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    showToast('Post removed');
    deleteCommunityPostDoc(id).catch(e => console.warn(e));
  };

  const updateMarketplaceStatus = async (id: string, status: 'Available' | 'Reserved' | 'Sold') => {
    setMarketplaceItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    showToast(`Listing status updated to ${status}`);
    updateMarketplaceItemStatusDoc(id, status).catch(e => console.warn(e));
  };

  const deleteMarketplaceItem = async (id: string) => {
    setMarketplaceItems(prev => prev.filter(item => item.id !== id));
    showToast('Marketplace listing removed');
    deleteMarketplaceItemDoc(id).catch(e => console.warn(e));
  };

  const addReminder = async (reminder: Omit<UserReminder, 'id' | 'completed'>) => {
    const userId = currentUser?.id;
    const localRem: UserReminder = {
      ...reminder,
      id: `rem-${Date.now()}`,
      completed: false
    };
    setReminders(prev => {
      const updated = [localRem, ...prev];
      if (userId) {
        try {
          localStorage.setItem(`everykr_reminders_${userId}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });
    showToast('Deadline reminder added');
    if (userId) {
      addUserReminderDoc(userId, reminder).catch(e => console.warn(e));
    }
  };

  const toggleReminder = async (id: string) => {
    let nextStatus = false;
    const userId = currentUser?.id;
    setReminders(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          nextStatus = !r.completed;
          return { ...r, completed: nextStatus };
        }
        return r;
      });
      if (userId) {
        try {
          localStorage.setItem(`everykr_reminders_${userId}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });
    if (userId) {
      toggleUserReminderDoc(userId, id, nextStatus).catch(e => console.warn(e));
    }
  };

  const deleteReminder = async (id: string) => {
    const userId = currentUser?.id;
    setReminders(prev => {
      const updated = prev.filter(r => r.id !== id);
      if (userId) {
        try {
          localStorage.setItem(`everykr_reminders_${userId}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });
    showToast('Reminder deleted');
    if (userId) {
      deleteUserReminderDoc(userId, id).catch(e => console.warn(e));
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      if (currentUser?.id) {
        localStorage.setItem(`everykr_notifs_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (currentUser?.id) {
        localStorage.setItem(`everykr_notifs_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
    showToast('All notifications marked as read');
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      if (currentUser?.id) {
        localStorage.setItem(`everykr_notifs_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
    showToast('Notification removed');
  };

  const addUniversity = async (uni: University) => {
    const gate = evaluateUniversityPublicationGate(uni);
    const strictStatus = getUniversityStrictStatus(uni);
    const normalized: University = {
      ...uni,
      verified: gate.allPassed,
      verificationStatus: gate.allPassed ? 'Verified' : 'Pending Verification',
      strictVerificationStatus: strictStatus,
      publicationGate: gate
    };
    setUniversitiesList(prev => [normalized, ...prev.filter(u => u.id !== normalized.id)]);
    try {
      await saveUniversityDoc(normalized);
      await createAuditLogDoc({
        timestamp: new Date().toISOString(),
        adminName: currentUser?.name || 'Administrator',
        adminEmail: currentUser?.email || 'admin@everykr.com',
        actionType: 'CREATE',
        targetEntity: 'University',
        targetId: normalized.id,
        targetName: normalized.name,
        details: `Created university record (${strictStatus})`
      });
      showToast(`Added ${normalized.name} (${strictStatus})`);
    } catch {
      showToast(`Added ${normalized.name} (locally cached)`);
    }
  };

  const updateUniversity = async (uniId: string, updates: Partial<University>) => {
    const existing = universitiesList.find(u => u.id === uniId);
    if (!existing) return;

    // Only authorized admins may approve a university as verified, and only if the 12-item publication gate passes
    const mergedCandidate: University = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (updates.verified === true || updates.adminApprovedVerified === true) {
      if (isServerVerifiedAdmin || currentUser?.role === 'admin') {
        mergedCandidate.adminApprovedVerified = true;
      } else {
        mergedCandidate.adminApprovedVerified = false;
      }
    } else if (updates.verified === false || updates.adminApprovedVerified === false) {
      mergedCandidate.adminApprovedVerified = false;
    }

    const gate = evaluateUniversityPublicationGate(mergedCandidate);
    const strictStatus = getUniversityStrictStatus(mergedCandidate);
    const finalized: University = {
      ...mergedCandidate,
      verified: gate.allPassed,
      verificationStatus: gate.allPassed ? 'Verified' : 'Pending Verification',
      strictVerificationStatus: strictStatus,
      publicationGate: gate
    };

    if ((updates.verified === true || updates.adminApprovedVerified === true) && !gate.allPassed) {
      showToast(`Cannot mark as VERIFIED: Missing ${gate.missingItems.slice(0, 2).join(', ')}`);
    }

    setUniversitiesList(prev => prev.map(u => (u.id === uniId ? finalized : u)));
    try {
      await saveUniversityDoc(finalized);
      await createAuditLogDoc({
        timestamp: new Date().toISOString(),
        adminName: currentUser?.name || 'Administrator',
        adminEmail: currentUser?.email || 'admin@everykr.com',
        actionType: 'EDIT',
        targetEntity: 'University',
        targetId: uniId,
        targetName: finalized.name,
        details: `Updated university record. Gate passed: ${gate.allPassed} (${strictStatus})`
      });
      if (!((updates.verified === true || updates.adminApprovedVerified === true) && !gate.allPassed)) {
        showToast('University profile updated');
      }
    } catch {
      showToast('University profile updated (locally cached)');
    }
  };

  const deleteUniversity = async (uniId: string) => {
    setUniversitiesList(prev => prev.filter(u => u.id !== uniId));
    try {
      await deleteUniversityDoc(uniId);
      showToast('University removed from directory');
    } catch {
      showToast('University removed (locally)');
    }
  };

  const saveUniversityDeadlineRound = async (round: RelationalAdmissionDeadlineRecord) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== round.universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        const currentRounds = bundle.admissionDeadlines;
        const existsIdx = currentRounds.findIndex(r => r.id === round.id);
        const nextRounds =
          existsIdx >= 0
            ? currentRounds.map(r => (r.id === round.id ? round : r))
            : [...currentRounds, round];
        return applyDeadlinesOverrideToUniversity(u, nextRounds);
      })
    );
    try {
      await saveAdmissionDeadlineDoc(round);
      showToast(`Saved ${round.degreeLevel} ${round.applicationRound} (${round.intakeLabel})`);
    } catch {
      showToast('Deadline round updated in local state');
    }
  };

  const deleteUniversityDeadlineRound = async (deadlineId: string, universityId: string) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        const nextRounds = bundle.admissionDeadlines.filter(r => r.id !== deadlineId);
        return applyDeadlinesOverrideToUniversity(u, nextRounds);
      })
    );
    try {
      await deleteAdmissionDeadlineDoc(deadlineId, universityId);
      showToast('Removed admission deadline round');
    } catch {
      showToast('Deadline round removed locally');
    }
  };

  const logAdminRelationalVerification = (universityId: string, actionType: string, summary: string) => {
    createUniversityVerificationLogDoc({
      id: `${universityId}-vlog-${Date.now()}`,
      universityId,
      actionType,
      verifiedBy: currentUser?.email || currentUser?.name || 'Admin',
      timestamp: new Date().toISOString(),
      statusAfter: 'Verified',
      summary,
    }).catch(() => {});
  };

  const saveUniversityProgram = async (row: RelationalUniversityProgramRow) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== row.universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        const list = bundle.programs;
        const next = list.some(x => x.id === row.id)
          ? list.map(x => (x.id === row.id ? row : x))
          : [...list, row];
        return applyRelationalOverridesToUniversity(u, { programs: next });
      })
    );
    try {
      await saveRelationalUniversityChildDoc('university_programs', row);
      logAdminRelationalVerification(row.universityId, 'PROGRAM_UPSERT', `Saved program: ${row.programNameEn}`);
      showToast(`Saved program: ${row.programNameEn}`);
    } catch {
      showToast(`Program saved locally: ${row.programNameEn}`);
    }
  };

  const deleteUniversityProgram = async (programId: string, universityId: string) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        return applyRelationalOverridesToUniversity(u, {
          programs: bundle.programs.filter(x => x.id !== programId),
        });
      })
    );
    try {
      await deleteRelationalUniversityChildDoc('university_programs', programId, universityId);
      showToast('Program removed');
    } catch {
      showToast('Program removed locally');
    }
  };

  const saveUniversityTuitionFee = async (row: RelationalTuitionFeeRow) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== row.universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        const list = bundle.tuitionFees;
        const next = list.some(x => x.id === row.id)
          ? list.map(x => (x.id === row.id ? row : x))
          : [...list, row];
        return applyRelationalOverridesToUniversity(u, { tuitionFees: next });
      })
    );
    try {
      await saveRelationalUniversityChildDoc('tuition_fees', row);
      logAdminRelationalVerification(row.universityId, 'TUITION_UPSERT', `Updated tuition: ${row.departmentTrackLabel}`);
      showToast(`Saved tuition schedule: ${row.departmentTrackLabel}`);
    } catch {
      showToast(`Tuition schedule updated locally`);
    }
  };

  const deleteUniversityTuitionFee = async (tuitionId: string, universityId: string) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        return applyRelationalOverridesToUniversity(u, {
          tuitionFees: bundle.tuitionFees.filter(x => x.id !== tuitionId),
        });
      })
    );
    try {
      await deleteRelationalUniversityChildDoc('tuition_fees', tuitionId, universityId);
      showToast('Tuition schedule removed');
    } catch {
      showToast('Tuition schedule removed locally');
    }
  };

  const saveUniversityRequirement = async (row: RelationalAdmissionRequirementRow) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== row.universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        const list = bundle.admissionRequirements;
        const next = list.some(x => x.id === row.id || x.degreeLevel === row.degreeLevel)
          ? list.map(x => (x.id === row.id || x.degreeLevel === row.degreeLevel ? row : x))
          : [...list, row];
        return applyRelationalOverridesToUniversity(u, { admissionRequirements: next });
      })
    );
    try {
      await saveRelationalUniversityChildDoc('admission_requirements', row);
      logAdminRelationalVerification(row.universityId, 'REQUIREMENT_UPSERT', `Saved eligibility: ${row.degreeLevel}`);
      showToast(`Saved ${row.degreeLevel} admission requirements`);
    } catch {
      showToast(`Saved ${row.degreeLevel} requirements locally`);
    }
  };

  const deleteUniversityRequirement = async (reqId: string, universityId: string) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        return applyRelationalOverridesToUniversity(u, {
          admissionRequirements: bundle.admissionRequirements.filter(x => x.id !== reqId),
        });
      })
    );
    try {
      await deleteRelationalUniversityChildDoc('admission_requirements', reqId, universityId);
      showToast('Requirement removed');
    } catch {
      showToast('Requirement removed locally');
    }
  };

  const saveUniversityLanguageRequirement = async (row: RelationalLanguageRequirementRow) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== row.universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        const list = bundle.languageRequirements;
        const next = list.some(x => x.id === row.id || x.degreeLevel === row.degreeLevel)
          ? list.map(x => (x.id === row.id || x.degreeLevel === row.degreeLevel ? row : x))
          : [...list, row];
        return applyRelationalOverridesToUniversity(u, { languageRequirements: next });
      })
    );
    try {
      await saveRelationalUniversityChildDoc('language_requirements', row);
      logAdminRelationalVerification(row.universityId, 'LANGUAGE_REQ_UPSERT', `Saved language rule: ${row.degreeLevel}`);
      showToast(`Saved ${row.degreeLevel} language proficiency rules`);
    } catch {
      showToast(`Saved ${row.degreeLevel} language rules locally`);
    }
  };

  const saveUniversityDocument = async (row: RelationalApplicationDocumentRow) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== row.universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        const list = bundle.applicationDocuments;
        const next = list.some(x => x.id === row.id)
          ? list.map(x => (x.id === row.id ? row : x))
          : [...list, row];
        return applyRelationalOverridesToUniversity(u, { applicationDocuments: next });
      })
    );
    try {
      await saveRelationalUniversityChildDoc('application_documents', row);
      logAdminRelationalVerification(row.universityId, 'DOCUMENT_UPSERT', `Saved document checklist item: ${row.documentName}`);
      showToast(`Saved document checklist item`);
    } catch {
      showToast('Document checklist item saved locally');
    }
  };

  const deleteUniversityDocument = async (docId: string, universityId: string) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        return applyRelationalOverridesToUniversity(u, {
          applicationDocuments: bundle.applicationDocuments.filter(x => x.id !== docId),
        });
      })
    );
    try {
      await deleteRelationalUniversityChildDoc('application_documents', docId, universityId);
      showToast('Document item removed');
    } catch {
      showToast('Document item removed locally');
    }
  };

  const saveUniversityScholarship = async (row: RelationalScholarshipRow) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== row.universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        const list = bundle.scholarships;
        const next = list.some(x => x.id === row.id)
          ? list.map(x => (x.id === row.id ? row : x))
          : [...list, row];
        return applyRelationalOverridesToUniversity(u, { scholarships: next });
      })
    );
    try {
      await saveRelationalUniversityChildDoc('scholarships', row);
      logAdminRelationalVerification(row.universityId, 'SCHOLARSHIP_UPSERT', `Saved scholarship: ${row.scholarshipName}`);
      showToast(`Saved scholarship: ${row.scholarshipName}`);
    } catch {
      showToast(`Scholarship saved locally`);
    }
  };

  const deleteUniversityScholarship = async (scholarshipId: string, universityId: string) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        return applyRelationalOverridesToUniversity(u, {
          scholarships: bundle.scholarships.filter(x => x.id !== scholarshipId),
        });
      })
    );
    try {
      await deleteRelationalUniversityChildDoc('scholarships', scholarshipId, universityId);
      showToast('Scholarship removed');
    } catch {
      showToast('Scholarship removed locally');
    }
  };

  const saveUniversitySource = async (row: RelationalUniversitySourceRow) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== row.universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        const list = bundle.sources;
        const next = list.some(x => x.id === row.id)
          ? list.map(x => (x.id === row.id ? row : x))
          : [...list, row];
        return applyRelationalOverridesToUniversity(u, { sources: next });
      })
    );
    try {
      await saveRelationalUniversityChildDoc('university_sources', row);
      logAdminRelationalVerification(row.universityId, 'SOURCE_UPSERT', `Recorded source: ${row.sourceTitle}`);
      showToast(`Recorded official source: ${row.sourceTitle}`);
    } catch {
      showToast(`Official source recorded locally`);
    }
  };

  const deleteUniversitySource = async (sourceId: string, universityId: string) => {
    setUniversitiesList(prev =>
      prev.map(u => {
        if (u.id !== universityId) return u;
        const bundle = u.relationalBundle || buildArchiveUniversityRelationalBundle(u);
        return applyRelationalOverridesToUniversity(u, {
          sources: bundle.sources.filter(x => x.id !== sourceId),
        });
      })
    );
    try {
      await deleteRelationalUniversityChildDoc('university_sources', sourceId, universityId);
      showToast('Official source removed');
    } catch {
      showToast('Official source removed locally');
    }
  };

  const syncRelationalUniversityDatabase = async () => {
    const res = await syncAll15RelationalTablesToFirestore();
    showToast(`Synced ${res.recordsSynced} records across ${res.tablesSynced} Firestore collections`);
    return res;
  };

  const purgeUnapprovedCloudUniversities = async () => {
    const res = await purgeUnapprovedFirestoreUniversities();
    showToast(
      `Non-destructive audit complete: 0 records deleted (${res.scanned} Firestore university records preserved)`
    );
    return res;
  };

  const batchImportUniversities = async (rawInput: string | University[]): Promise<UniversityImportReport> => {
    let candidateList: University[] = [];
    let suppliedCount = 0;

    if (Array.isArray(rawInput)) {
      candidateList = rawInput;
      suppliedCount = rawInput.length;
    } else {
      const lines = rawInput
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      suppliedCount = lines.length;

      candidateList = lines.map(rawName => {
        const campusMatch = rawName.match(/\((.*?)\)/);
        const cleanName = rawName.replace(/\s*\(.*?\)/, '').trim();
        const campusName = campusMatch ? campusMatch[1].trim() : 'Main Campus';
        const isMain = !campusMatch || campusMatch[1].toLowerCase().includes('main');
        const id = rawName.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        const existing = MASTER_UNIVERSITIES.find(
          m => m.id === id || (m.name && m.name.toLowerCase() === rawName.toLowerCase())
        );
        if (existing) return existing;

        const unverifiedRecord: University = {
          id,
          name: rawName,
          officialName: cleanName,
          campusName,
          isMainCampus: isMain,
          koreanName: UNVERIFIED_UNIVERSITY_MESSAGE,
          koreanNameVerified: false,
          city: UNVERIFIED_UNIVERSITY_MESSAGE,
          province: UNVERIFIED_UNIVERSITY_MESSAGE,
          region: UNVERIFIED_UNIVERSITY_MESSAGE,
          type: UNVERIFIED_UNIVERSITY_MESSAGE,
          typeVerified: false,
          establishmentYear: null,
          establishmentYearVerified: false,
          campusImage: '',
          logoUrl: '',
          logoVerified: false,
          logoSourceUrl: '',
          logoRetrievedAt: '',
          rankingKR: null,
          rankingVerified: false,
          programs: [],
          programsVerified: false,
          degrees: [],
          degreesVerified: false,
          tuitionPerSemesterKRW: undefined,
          tuitionVerified: false,
          tuitionNotes: UNVERIFIED_UNIVERSITY_MESSAGE,
          scholarships: [],
          scholarshipVerified: false,
          englishTaughtAvailable: false,
          englishTaughtVerified: false,
          internationalOfficeUrl: '',
          internationalAdmissionsVerified: false,
          admissionGuideFound: false,
          officialWebsite: '',
          officialWebsiteVerified: false,
          contactEmail: UNVERIFIED_UNIVERSITY_MESSAGE,
          contactPhone: UNVERIFIED_UNIVERSITY_MESSAGE,
          contactVerified: false,
          locationAddress: UNVERIFIED_UNIVERSITY_MESSAGE,
          koreanAddress: UNVERIFIED_UNIVERSITY_MESSAGE,
          englishAddress: UNVERIFIED_UNIVERSITY_MESSAGE,
          campusVerified: false,
          deadlines: {
            springSemester: UNVERIFIED_UNIVERSITY_MESSAGE,
            fallSemester: UNVERIFIED_UNIVERSITY_MESSAGE,
            verified: false
          },
          admissionRequirements: {
            topikLevel: UNVERIFIED_UNIVERSITY_MESSAGE,
            englishTest: UNVERIFIED_UNIVERSITY_MESSAGE,
            minimumGpa: UNVERIFIED_UNIVERSITY_MESSAGE,
            apostilleRequired: true,
            applicationFeeKrw: UNVERIFIED_UNIVERSITY_MESSAGE,
            requiredDocuments: [],
            verified: false
          },
          studentSupport: [],
          studentSupportVerified: false,
          adminApprovedVerified: false,
          verified: false,
          verificationStatus: 'Pending Verification',
          strictVerificationStatus: 'NOT OFFICIALLY VERIFIED',
          description: UNVERIFIED_UNIVERSITY_MESSAGE,
          aliases: [cleanName],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastVerifiedAt: UNVERIFIED_UNIVERSITY_MESSAGE
        };

        const gate = evaluateUniversityPublicationGate(unverifiedRecord);
        unverifiedRecord.publicationGate = gate;
        return unverifiedRecord;
      });
    }

    const uniqueMap = new Map<string, University>();
    for (const u of candidateList) {
      if (!uniqueMap.has(u.id)) {
        const gate = evaluateUniversityPublicationGate(u);
        const strictStatus = getUniversityStrictStatus(u);
        uniqueMap.set(u.id, {
          ...u,
          verified: gate.allPassed,
          verificationStatus: gate.allPassed ? 'Verified' : 'Pending Verification',
          strictVerificationStatus: strictStatus,
          publicationGate: gate
        });
      }
    }
    const finalImports = Array.from(uniqueMap.values());

    setUniversitiesList(finalImports);

    try {
      await batchUpsertUniversitiesDoc(finalImports);
      await createAuditLogDoc({
        timestamp: new Date().toISOString(),
        adminName: currentUser?.name || 'Administrator',
        adminEmail: currentUser?.email || 'admin@everykr.com',
        actionType: 'EDIT',
        targetEntity: 'University',
        targetId: 'batch-import-master',
        targetName: 'Master Directory Batch Ingestion',
        details: `Processed ${finalImports.length} universities (${finalImports.filter(u => u.verified).length} strictly verified, ${finalImports.filter(u => !u.verified).length} awaiting confirmation)`
      });
    } catch {
      console.warn('Batch written locally, Firestore synced when permitted.');
    }

    const auditItems = generateUniversityAccuracyAuditReport(finalImports);
    const report: UniversityImportReport = {
      timestamp: new Date().toISOString(),
      totalSupplied: suppliedCount,
      totalImported: finalImports.length,
      totalCampuses: finalImports.filter(u => u.campusName && u.campusName !== 'Main Campus').length,
      totalDuplicates: finalImports.filter(u => Boolean(u.duplicateOfId)).length,
      totalAliasesLinked: finalImports.filter(u => u.aliases && u.aliases.length > 1).length,
      totalPendingVerification: finalImports.filter(u => !u.verified).length,
      records: finalImports.map(u => ({
        name: u.name || u.officialName || 'University',
        campus: u.campusName,
        status: (u.verified ? 'imported' : 'pending_verification') as any,
        notes: u.aliases && u.aliases.length > 1 ? `Aliases: ${u.aliases.join(', ')}` : undefined
      })),
      auditItems
    };

    setUniversityImportReport(report);
    showToast(`Successfully processed ${finalImports.length} universities`);
    return report;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage]);

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        language,
        setLanguage,
        t,
        theme,
        setTheme,
        toggleTheme,
        currentUser,
        isAuthReady,
        isLoggingOut,
        isServerVerifiedAdmin,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        isSearchModalOpen,
        setIsSearchModalOpen,
        searchQuery,
        setSearchQuery,
        isGetHelpModalOpen,
        setIsGetHelpModalOpen,
        isCompareModalOpen,
        setIsCompareModalOpen,
        selectedUniversity,
        setSelectedUniversity,
        selectedJob,
        setSelectedJob,
        selectedAccommodation,
        setSelectedAccommodation,
        isPostJobModalOpen,
        setIsPostJobModalOpen,
        isAddHousingModalOpen,
        setIsAddHousingModalOpen,
        isCreatePostModalOpen,
        setIsCreatePostModalOpen,
        isCreateMarketplaceModalOpen,
        setIsCreateMarketplaceModalOpen,
        savedUniversityIds,
        toggleSaveUniversity,
        savedJobIds,
        toggleSaveJob,
        savedAccommodationIds,
        toggleSaveAccommodation,
        comparedUniversityIds,
        toggleCompareUniversity,
        clearComparison,
        checkedDocuments,
        toggleDocumentCheck,
        applications,
        submitJobApplication,
        posts,
        createPost,
        likePost,
        addPostReply,
        deletePost,
        marketplaceItems,
        createMarketplaceItem,
        updateMarketplaceStatus,
        deleteMarketplaceItem,
        reminders,
        addReminder,
        toggleReminder,
        deleteReminder,
        universitiesList,
        approvedUniversitiesList,
        addUniversity,
        updateUniversity,
        deleteUniversity,
        saveUniversityDeadlineRound,
        deleteUniversityDeadlineRound,
        saveUniversityProgram,
        deleteUniversityProgram,
        saveUniversityTuitionFee,
        deleteUniversityTuitionFee,
        saveUniversityRequirement,
        deleteUniversityRequirement,
        saveUniversityLanguageRequirement,
        saveUniversityDocument,
        deleteUniversityDocument,
        saveUniversityScholarship,
        deleteUniversityScholarship,
        saveUniversitySource,
        deleteUniversitySource,
        syncRelationalUniversityDatabase,
        purgeUnapprovedCloudUniversities,
        batchImportUniversities,
        universityImportReport,
        jobsList,
        accommodationList,
        refreshAccommodations,
        addJob,
        addAccommodation,
        approveJob,
        approveAccommodation,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        unreadCount,
        toastMessage,
        showToast,
        isDatabaseConnected
      }}
    >
      {children}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#10243A] text-white px-5 py-3 rounded-lg shadow-xl border border-white/10 text-sm font-medium animate-fade-in transition-all">
          <div className="w-2 h-2 rounded-full bg-[#19B6A4]"></div>
          <span>{toastMessage}</span>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
