import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileText,
  FolderCheck,
  Globe,
  GraduationCap,
  Home,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  Plane,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  TrainFront,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import type { TransportManagementSection } from './AdminTransportManagementTab';
import type { UserDatabaseSubTab } from './AdminUserManagementTab';

export type AdminTabId =
  | 'overview'
  | 'internal_requests'
  | 'global_trash'
  | 'homepage_cms'
  | 'essential_hub'
  | 'transport_management'
  | 'flight_management'
  | 'users'
  | 'applications'
  | 'documents'
  | 'universities'
  | 'programs'
  | 'sim_applications'
  | 'arrival_groups'
  | 'sim_exports'
  | 'staff'
  | 'cms'
  | 'analytics'
  | 'scholarships'
  | 'jobs'
  | 'employers'
  | 'accommodation'
  | 'articles'
  | 'visa_guides'
  | 'community_posts'
  | 'community_likes_comments'
  | 'community_users'
  | 'marketplace_listings'
  | 'contact_inbox'
  | 'reports'
  | 'newsletter'
  | 'korean_academy'
  | 'site_settings'
  | 'audit_logs';

export type AdminNavGroupId =
  | 'overview_group'
  | 'homepage_cms_group'
  | 'student_management_group'
  | 'university_admissions_group'
  | 'transport_management_group'
  | 'sim_applications_group'
  | 'arrival_groups_group'
  | 'document_management_group'
  | 'housing_scholarships_group'
  | 'learn_korean_essential_group'
  | 'community_management_group'
  | 'newsletter_notifications_group'
  | 'user_database_group'
  | 'system_settings_group'
  | 'api_provider_management_group'
  | 'security_permissions_group'
  | 'audit_trail_group';

export interface AdminNavCounts {
  users: number;
  applications: number;
  documents: number;
  universities: number;
  housing: number;
  scholarships: number;
  marketplace: number;
  jobs: number;
  employers: number;
  articles: number;
  visaGuides: number;
  contactInbox: number;
  unreadInquiries: number;
  pendingReports: number;
  totalReports: number;
  staff: number;
  auditLogs: number;
  transportProviders: number;
  transportErrors: number;
  unreadNotifications: number;
}

export interface AdminNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  description: string;
  tab: AdminTabId;
  transportSection?: TransportManagementSection;
  userSubTab?: UserDatabaseSubTab;
  icon: LucideIcon;
  countKey?: keyof AdminNavCounts;
  alertCountKey?: keyof AdminNavCounts;
  requiresSuperAdmin?: boolean;
}

export interface AdminNavGroup {
  id: AdminNavGroupId;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
  requiresSuperAdmin?: boolean;
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'overview_group',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      {
        id: 'overview',
        label: 'Overview Dashboard',
        description: 'Live platform KPIs, alerts, pending moderation queue, and activity summary.',
        tab: 'overview',
        icon: LayoutDashboard,
      },
      {
        id: 'analytics',
        label: 'Platform Analytics',
        description: 'Cross-module metrics, engagement breakdown, and executive report exports.',
        tab: 'analytics',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'homepage_cms_group',
    label: 'Homepage & Services CMS',
    icon: Globe,
    items: [
      {
        id: 'homepage_cms',
        label: 'Homepage & Services CMS',
        description: 'Manage homepage sections, nested services, visibility, and admission deadline carousel.',
        tab: 'homepage_cms',
        icon: Globe,
      },
      {
        id: 'cms',
        label: 'Announcements',
        description: 'Publish platform-wide announcements, alerts, and featured content notices.',
        tab: 'cms',
        icon: Megaphone,
      },
      {
        id: 'articles',
        label: 'Guide Articles',
        description: 'Create and publish international student living and academic guide articles.',
        tab: 'articles',
        icon: FileText,
        countKey: 'articles',
      },
      {
        id: 'visa_guides',
        label: 'Visa Guides',
        description: 'Maintain D-2, D-4, D-10, and E-7 South Korea visa policy documentation.',
        tab: 'visa_guides',
        icon: ShieldCheck,
        countKey: 'visaGuides',
      },
    ],
  },
  {
    id: 'student_management_group',
    label: 'Student Management',
    icon: Users,
    items: [
      {
        id: 'student_directory',
        label: 'Student Directory',
        description: 'Browse, verify, and manage student accounts, profiles, and visa status.',
        tab: 'users',
        userSubTab: 'users',
        icon: Users,
        countKey: 'users',
      },
      {
        id: 'jobs',
        label: 'Student Jobs',
        description: 'Review and approve statutory S-3 compliant part-time and career job postings.',
        tab: 'jobs',
        icon: Briefcase,
        countKey: 'jobs',
      },
      {
        id: 'employers',
        label: 'Employers',
        description: 'Verify employer business profiles and manage recruitment partners.',
        tab: 'employers',
        icon: Building2,
        countKey: 'employers',
      },
      {
        id: 'marketplace_listings',
        label: 'Marketplace',
        description: 'Moderate student marketplace items and verified campus listings.',
        tab: 'marketplace_listings',
        icon: ShoppingBag,
        countKey: 'marketplace',
      },
    ],
  },
  {
    id: 'university_admissions_group',
    label: 'University & Admissions',
    icon: GraduationCap,
    items: [
      {
        id: 'universities',
        label: 'Universities',
        description: 'Manage verified Korean university records, official logos, and admission criteria.',
        tab: 'universities',
        icon: GraduationCap,
        countKey: 'universities',
      },
      {
        id: 'programs',
        label: 'Academic Programs',
        description: 'Configure undergraduate, graduate, and language track degree programs.',
        tab: 'programs',
        icon: BookOpen,
      },
      {
        id: 'applications',
        label: 'Uni Applications',
        description: 'Track and review student university admission applications and statuses.',
        tab: 'applications',
        icon: FileText,
        countKey: 'applications',
      },
    ],
  },
  {
    id: 'transport_management_group',
    label: 'Transport Management',
    icon: Plane,
    items: [
      {
        id: 'transport_flight_api',
        label: 'Flight API Management',
        description: 'Configure international flight providers, endpoints, SerpApi credentials, and search routing.',
        tab: 'transport_management',
        transportSection: 'flight_api',
        icon: Plane,
      },
      {
        id: 'transport_ktx_api',
        label: 'KTX API Management',
        description: 'Manage Korail/KTX rail endpoints, stations, schedules, and external redirect URLs.',
        tab: 'transport_management',
        transportSection: 'ktx_api',
        icon: TrainFront,
      },
      {
        id: 'transport_bus_api',
        label: 'Bus API Management',
        description: 'Manage intercity and express bus terminals, routes, schedules, and provider settings.',
        tab: 'transport_management',
        transportSection: 'bus_api',
        icon: Bus,
      },
    ],
  },
  {
    id: 'sim_applications_group',
    label: 'SIM Applications',
    icon: Smartphone,
    items: [
      {
        id: 'sim_applications',
        label: 'SIM Applications',
        description: 'Review incoming student SIM card orders, passport checks, and fulfillment status.',
        tab: 'sim_applications',
        icon: Smartphone,
      },
      {
        id: 'sim_exports',
        label: 'SIM Excel & ZIP Exports',
        description: 'Export batch SIM application spreadsheets and arrival verification document archives.',
        tab: 'sim_exports',
        icon: Download,
      },
    ],
  },
  {
    id: 'arrival_groups_group',
    label: 'Arrival Groups',
    icon: Users,
    items: [
      {
        id: 'arrival_groups',
        label: 'Arrival Groups',
        description: 'Coordinate airport arrival cohorts, pickup batches, and onboarding schedules.',
        tab: 'arrival_groups',
        icon: Users,
      },
    ],
  },
  {
    id: 'document_management_group',
    label: 'Document Management',
    icon: FolderCheck,
    items: [
      {
        id: 'documents',
        label: 'Document Management',
        description: 'Verify student passports, academic transcripts, TOPIK/IELTS certificates, and uploads.',
        tab: 'documents',
        icon: FolderCheck,
        countKey: 'documents',
      },
    ],
  },
  {
    id: 'housing_scholarships_group',
    label: 'Housing & Scholarships',
    icon: Home,
    items: [
      {
        id: 'accommodation',
        label: 'Housing Listings',
        description: 'Audit and manage verified student dormitories, studios, and goshiwon listings.',
        tab: 'accommodation',
        icon: Home,
        countKey: 'housing',
      },
      {
        id: 'scholarships',
        label: 'Scholarships',
        description: 'Manage GKS, university merit grants, and international student funding opportunities.',
        tab: 'scholarships',
        icon: Award,
        countKey: 'scholarships',
      },
    ],
  },
  {
    id: 'learn_korean_essential_group',
    label: 'Learn Korean & Essential Hub',
    icon: BookOpen,
    items: [
      {
        id: 'korean_academy',
        label: 'Learn Korean 5.0',
        description: 'Manage Korean Academy curriculum, Hangul modules, TOPIK prep, and lessons.',
        tab: 'korean_academy',
        icon: GraduationCap,
      },
      {
        id: 'essential_hub',
        label: 'Essential Hub (8 Modules)',
        description: 'Manage Daily Life, Transit, Healthcare, Safety, Maps, and Essential Korea modules.',
        tab: 'essential_hub',
        icon: Globe,
      },
    ],
  },
  {
    id: 'community_management_group',
    label: 'Community Management',
    icon: MessageSquare,
    items: [
      {
        id: 'community_posts',
        label: 'Community Posts',
        description: 'Review, pin, edit, or remove student community discussions and announcements.',
        tab: 'community_posts',
        icon: MessageSquare,
      },
      {
        id: 'community_likes_comments',
        label: 'Likes & Comments',
        description: 'Moderate community comments, replies, and engagement signals.',
        tab: 'community_likes_comments',
        icon: CheckCircle2,
      },
      {
        id: 'community_users',
        label: 'Community Users',
        description: 'Manage member privileges, mute/ban controls, and community trust scores.',
        tab: 'community_users',
        icon: Shield,
      },
      {
        id: 'reports',
        label: 'Reports & Moderation',
        description: 'Resolve flagged posts, housing reports, and student safety escalation tickets.',
        tab: 'reports',
        icon: AlertTriangle,
        countKey: 'totalReports',
        alertCountKey: 'pendingReports',
      },
    ],
  },
  {
    id: 'newsletter_notifications_group',
    label: 'Newsletter & Notifications',
    icon: Mail,
    items: [
      {
        id: 'newsletter',
        label: 'Newsletter Studio',
        description: 'Compose, preview, and broadcast multilingual email campaigns to subscribers.',
        tab: 'newsletter',
        icon: Mail,
      },
      {
        id: 'contact_inbox',
        label: 'Contact Inbox',
        description: 'Respond to incoming student and partner support tickets in real time.',
        tab: 'contact_inbox',
        icon: MessageSquare,
        countKey: 'contactInbox',
        alertCountKey: 'unreadInquiries',
      },
    ],
  },
  {
    id: 'user_database_group',
    label: 'User Database',
    icon: Database,
    items: [
      {
        id: 'user_db_all',
        label: 'All Users & Excel Export',
        description: 'Full Firestore user registry, Excel (.xlsx) export, and Google Sheets sync.',
        tab: 'users',
        userSubTab: 'users',
        icon: Database,
        countKey: 'users',
      },
      {
        id: 'user_db_registrations',
        label: 'Registration Logs',
        description: 'Audit new student, general user, and education partner registration records.',
        tab: 'users',
        userSubTab: 'registration_logs',
        icon: FileText,
      },
      {
        id: 'user_db_logins',
        label: 'Login Activity Logs',
        description: 'Inspect user authentication sessions and sign-in history.',
        tab: 'users',
        userSubTab: 'login_logs',
        icon: Activity,
      },
      {
        id: 'user_db_otp',
        label: 'OTP Verifications',
        description: 'Review email OTP verification metadata and delivery checks.',
        tab: 'users',
        userSubTab: 'otp_verifications',
        icon: KeyRound,
      },
      {
        id: 'user_db_privacy',
        label: 'Data Privacy Requests',
        description: 'Process PIPA data access, correction, and deletion requests.',
        tab: 'users',
        userSubTab: 'data_privacy_requests',
        icon: Lock,
      },
    ],
  },
  {
    id: 'system_settings_group',
    label: 'System Settings',
    icon: Settings,
    items: [
      {
        id: 'site_settings',
        label: 'Site & Developer Settings',
        description: 'Configure platform settings, developer profile metadata, and system controls.',
        tab: 'site_settings',
        icon: Settings,
        requiresSuperAdmin: true,
      },
      {
        id: 'global_trash',
        label: 'Global Trash & Recovery',
        description: 'Restore soft-deleted records or permanently purge archived items.',
        tab: 'global_trash',
        icon: Trash2,
        requiresSuperAdmin: true,
      },
    ],
  },
  {
    id: 'api_provider_management_group',
    label: 'API Provider Management',
    icon: Server,
    items: [
      {
        id: 'api_provider_settings',
        label: 'API Provider Settings',
        description: 'Manage global API keys, authentication credentials, rate limits, and timeouts.',
        tab: 'transport_management',
        transportSection: 'provider_settings',
        icon: KeyRound,
        countKey: 'transportProviders',
        requiresSuperAdmin: true,
      },
      {
        id: 'api_health_logs',
        label: 'API Health & Logs',
        description: 'Monitor real-time provider connection health, latencies, and error responses.',
        tab: 'transport_management',
        transportSection: 'health_logs',
        icon: Activity,
        alertCountKey: 'transportErrors',
        requiresSuperAdmin: true,
      },
    ],
  },
  {
    id: 'security_permissions_group',
    label: 'Security & Permissions',
    icon: ShieldCheck,
    items: [
      {
        id: 'staff',
        label: 'User & Role Management (RBAC)',
        description: 'Assign staff roles, department permissions, and security clearance levels.',
        tab: 'staff',
        icon: UserCheck,
        countKey: 'staff',
        requiresSuperAdmin: true,
      },
      {
        id: 'internal_requests',
        label: 'Internal Staff Requests',
        description: 'Approve or reject incoming employee portal onboarding and access requests.',
        tab: 'internal_requests',
        icon: Shield,
        requiresSuperAdmin: true,
      },
    ],
  },
  {
    id: 'audit_trail_group',
    label: 'Audit Trail',
    icon: Clock,
    items: [
      {
        id: 'audit_logs',
        label: 'Audit Logs',
        description: 'Immutable security audit trail of every administrative action and export.',
        tab: 'audit_logs',
        icon: Clock,
        countKey: 'auditLogs',
        requiresSuperAdmin: true,
      },
    ],
  },
];

/**
 * Resolves the exact sidebar navigation item & group corresponding to current active state.
 */
export function resolveActiveNavContext(
  activeTab: AdminTabId,
  transportSection: TransportManagementSection,
  userSubTab: UserDatabaseSubTab,
  preferredNavItemId?: string | null
): { group: AdminNavGroup; item: AdminNavItem } {
  const normalizedTab: AdminTabId =
    activeTab === 'flight_management' ? 'transport_management' : activeTab;

  // If user explicitly clicked Student Directory vs All Users & Excel Export, preserve that selection
  if (preferredNavItemId) {
    for (const group of ADMIN_NAV_GROUPS) {
      const exact = group.items.find((it) => {
        if (it.id !== preferredNavItemId) return false;
        if (it.tab !== normalizedTab) return false;
        if (normalizedTab === 'transport_management' && it.transportSection !== transportSection) {
          return false;
        }
        if (normalizedTab === 'users' && it.userSubTab && it.userSubTab !== userSubTab) {
          return false;
        }
        return true;
      });
      if (exact) return { group, item: exact };
    }
  }

  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.tab !== normalizedTab) continue;
      if (normalizedTab === 'transport_management') {
        if (item.transportSection === transportSection) return { group, item };
        continue;
      }
      if (normalizedTab === 'users') {
        if (item.userSubTab === userSubTab) return { group, item };
        continue;
      }
      return { group, item };
    }
  }

  return { group: ADMIN_NAV_GROUPS[0], item: ADMIN_NAV_GROUPS[0].items[0] };
}
