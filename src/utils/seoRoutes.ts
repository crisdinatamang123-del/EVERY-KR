import { University, UserProfile } from '../types';
import { ActivePage } from '../context/AppContext';
import { resolveCanonicalUniversityId } from '../data/universities25';

export function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates a clean, permanent, deterministic URL slug for each approved Korean university.
 * Example: "Kyungsung University" -> "kyungsung-university"
 */
export function getUniversitySlug(uni: University): string {
  if (uni.id && /^[a-z0-9-]+$/.test(uni.id)) {
    return uni.id;
  }
  return slugifyText(uni.name) || uni.id.toLowerCase();
}

/**
 * Finds a university from the 25-university list using its canonical slug, ID, or any legacy alias
 * (e.g. dongmyung-university -> tongmyong-university, hanyang-university-erica -> hanyang-university).
 */
export function findUniversityBySlug(universities: University[], slugParam?: string): University | undefined {
  if (!slugParam) return undefined;
  const normalized = decodeURIComponent(slugParam).trim().toLowerCase();

  // 1. Canonical / legacy alias resolver
  const canonicalId = resolveCanonicalUniversityId(normalized);
  if (canonicalId) {
    const canonicalMatch = universities.find(u => u.id.toLowerCase() === canonicalId);
    if (canonicalMatch) return canonicalMatch;
  }

  // 2. Exact match by generated slug or ID
  const exactMatch = universities.find(
    u => getUniversitySlug(u) === normalized || u.id.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;

  // 3. Base name slug match or alias match
  return universities.find(u => {
    const baseSlug = slugifyText(u.name);
    if (baseSlug === normalized || normalized.startsWith(baseSlug)) return true;
    if (u.aliases?.some(a => slugifyText(a) === normalized)) return true;
    return false;
  });
}

export const PAGE_TO_PATH: Record<ActivePage, string> = {
  home: '/',
  login: '/login',
  register: '/register',
  universities: '/universities',
  programs: '/programs',
  deadlines: '/deadlines',
  'application-guide': '/application-guide',
  scholarships: '/scholarships',
  jobs: '/jobs',
  housing: '/housing',
  accommodation: '/housing',
  community: '/community',
  visa: '/visa',
  news: '/news',
  events: '/events',
  profile: '/profile',
  dashboard: '/dashboard',
  admin: '/admin',
  settings: '/settings',
  transportation: '/transportation',
  shopping: '/sim',
  marketplace: '/marketplace',
  'daily-life': '/daily-life',
  services: '/services',
  'study-in-korea': '/study-in-korea',
  'study-language': '/study-language',
  'korean-academy': '/korean-academy',
  'learn-hangul': '/learn-hangul',
  'discover-korea': '/discover-korea',
  'explore-korea': '/explore-korea',
  'ai-chat': '/ai-chat',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  disclaimer: '/disclaimer'
};

export function resolveActivePageFromPath(pathname: string): ActivePage {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return 'home';
  if (clean === '/login') return 'login';
  if (clean === '/register' || clean === '/signup') return 'register';
  if (clean === '/universities' || clean.startsWith('/universities/')) return 'universities';
  if (clean === '/programs') return 'programs';
  if (clean === '/deadlines') return 'deadlines';
  if (clean === '/application-guide') return 'application-guide';
  if (clean === '/scholarships') return 'scholarships';
  if (clean === '/jobs') return 'jobs';
  if (
    clean === '/housing' ||
    clean.startsWith('/housing/') ||
    clean === '/accommodation' ||
    clean.startsWith('/accommodation/')
  ) {
    return 'accommodation';
  }
  if (clean === '/community') return 'community';
  if (clean === '/visa') return 'visa';
  if (clean === '/news') return 'news';
  if (clean === '/events') return 'events';
  if (clean === '/profile') return 'profile';
  if (clean === '/dashboard' || clean === '/student-portal') return 'dashboard';
  if (clean === '/admin') return 'admin';
  if (clean === '/settings') return 'settings';
  if (clean === '/transportation' || clean === '/flights' || clean === '/tickets-transport') return 'transportation';
  if (clean === '/sim' || clean === '/shopping' || clean === '/sim-shopping') return 'shopping';
  if (clean === '/marketplace') return 'marketplace';
  if (clean === '/daily-life') return 'daily-life';
  if (clean === '/services') return 'services';
  if (clean === '/study-in-korea') return 'study-in-korea';
  if (clean === '/study-language') return 'study-language';
  if (clean === '/korean-academy' || clean === '/learn-korean') return 'korean-academy';
  if (clean === '/learn-hangul') return 'learn-hangul';
  if (clean === '/discover-korea') return 'discover-korea';
  if (clean === '/explore-korea') return 'explore-korea';
  if (clean === '/ai-chat') return 'ai-chat';
  if (clean === '/about') return 'about';
  if (clean === '/contact') return 'contact';
  if (clean === '/privacy') return 'privacy';
  if (clean === '/terms') return 'terms';
  if (clean === '/disclaimer') return 'disclaimer';
  return 'home';
}

export function isSuperAdmin(
  user: UserProfile | null | undefined,
  isServerVerifiedAdmin?: boolean
): boolean {
  if (!user) return false;
  return Boolean(user.role === 'admin' && isServerVerifiedAdmin);
}

export function getRoleDefaultPath(user: UserProfile | null): string {
  if (!user) return '/login';
  if (user.role === 'admin') return '/admin';
  return '/dashboard';
}

export function getPostLoginRedirectPath(
  user: UserProfile | null,
  requestedRedirect?: string | null
): string {
  if (
    requestedRedirect &&
    requestedRedirect.startsWith('/') &&
    !requestedRedirect.startsWith('//') &&
    requestedRedirect !== '/login' &&
    requestedRedirect !== '/register'
  ) {
    if (
      requestedRedirect.startsWith('/admin') &&
      !requestedRedirect.startsWith('/admin/applications') &&
      user &&
      user.role !== 'admin'
    ) {
      return '/dashboard';
    }
    return requestedRedirect;
  }
  return user ? getRoleDefaultPath(user) : '/dashboard';
}

export interface RouteSeoMetadata {
  title: string;
  description: string;
  canonicalPath: string;
}

const ROUTE_SEO_MAP: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'EVERYKR — Your Future in Korea Starts Here',
    description:
      'Discover Korean universities, explore educational opportunities, learn Korean, and find everything you need to study and live in South Korea.'
  },
  '/login': {
    title: 'EveryKR – Sign In',
    description:
      'Sign in to your EveryKR account with Google or verified Email to manage your Korean university applications, visa checklist, and housing.'
  },
  '/register': {
    title: 'EveryKR – Create Account',
    description:
      'Register as an International Student, Korean Employer, Housing Provider, or University Partner on EveryKR with 6-digit Email OTP verification.'
  },
  '/reset-password': {
    title: 'EveryKR – Reset Password',
    description:
      'Securely reset your EveryKR account password using a verified single-use email reset link.'
  },
  '/universities': {
    title: 'South Korea University Directory (25 Approved Universities) | EveryKR',
    description:
      'Search and compare 25 verified national and private universities in South Korea, including KLP, EAP, Associate, Bachelor, Master, and PhD programs, KRW tuition, and March 2027 deadlines.'
  },
  '/programs': {
    title: 'Verified Degree & Language Programs in South Korea | EveryKR',
    description:
      'Explore officially verified KLP, EAP, Associate, Bachelor’s, Master’s, and PhD programmes across 25 approved Korean universities.'
  },
  '/deadlines': {
    title: 'Korean University Admission Deadlines (March 2027 Intake) | EveryKR',
    description:
      'Track Spring (March 2027) multi-round international student admission recruitment windows, BD cutoffs, DHL submission dates, and interview schedules across 25 Korean universities.'
  },
  '/application-guide': {
    title: 'Step-by-Step South Korea University Application Guide | EveryKR',
    description:
      'Complete 6-step international student admission guide for South Korea: university selection, TOPIK/IELTS, Apostille, COA issuance, and D-2/D-4 visas.'
  },
  '/scholarships': {
    title: 'GKS & Korean University Scholarships Directory | EveryKR',
    description:
      'Discover Global Korea Scholarship (GKS), Brain Korea 21, and TOPIK merit tuition waivers for international undergraduate and graduate students.'
  },
  '/jobs': {
    title: 'Part-Time Student Jobs & Internships in South Korea | EveryKR',
    description:
      'Browse verified part-time jobs, campus assistantships, and internships in South Korea compliant with D-2 and D-4 immigration work limits.'
  },
  '/housing': {
    title: 'Student Housing, Goshiwon & One-Rooms in South Korea | EveryKR',
    description:
      'Find verified student accommodation near Korean universities: zero-deposit goshiwons, furnished studios, shared houses, and university dormitories.'
  },
  '/accommodation': {
    title: 'Student Housing, Goshiwon & One-Rooms in South Korea | EveryKR',
    description:
      'Find verified student accommodation near Korean universities: zero-deposit goshiwons, furnished studios, shared houses, and university dormitories.'
  },
  '/community': {
    title: 'International Student Community & Forums in Korea | EveryKR',
    description:
      'Connect with fellow international students across Seoul, Busan, Daejeon, and Jeju to discuss academics, ARC renewals, housing, and campus life.'
  },
  '/visa': {
    title: 'Korea Student Visa (D-2, D-4, D-10) & ARC Guide | EveryKR',
    description:
      'Step-by-step official checklists for South Korean student visas (D-2, D-4), HiKorea ARC appointments, S-3 work permits, and 14-day address reporting.'
  },
  '/news': {
    title: 'South Korea Student News, Immigration & Policy Updates | EveryKR',
    description:
      'Read verified updates on Korean Ministry of Justice visa rules, university admission windows, NHIS health insurance, and student life announcements.'
  },
  '/events': {
    title: 'International Student Events, Career Fairs & Orientation | EveryKR',
    description:
      'Join upcoming international student career fairs, GKS scholarship webinars, TOPIK bootcamps, and cultural networking events across South Korea.'
  },
  '/profile': {
    title: 'My Student & Visa Profile | EveryKR Account',
    description:
      'View and update your personal academic profile, Korean university affiliation, visa category, and emergency contact details on EveryKR.'
  },
  '/dashboard': {
    title: 'Student Portal – Profile, Documents & University Applications | EveryKR',
    description:
      'Manage your personal student profile, upload academic and passport documents, apply to Korean universities, and track admission status on EveryKR.'
  },
  '/student-portal': {
    title: 'Student Portal – Profile, Documents & University Applications | EveryKR',
    description:
      'Manage your personal student profile, upload academic and passport documents, apply to Korean universities, and track admission status on EveryKR.'
  },
  '/admin': {
    title: 'Admin Control Center & User Management | EveryKR',
    description:
      'Authorized EveryKR administrator dashboard for managing registered users, universities, scholarships, newsletter campaigns, and security logs.'
  },
  '/settings': {
    title: 'Account & Security Settings | EveryKR',
    description:
      'Manage your EveryKR account preferences, interface theme, language settings, email notifications, and verified authentication security.'
  },
  '/transportation': {
    title: 'Find Your Next Flight – Flight Search & Price Comparison Engine | EveryKR',
    description:
      'Compare flight prices from multiple global booking providers including Trip.com, Skyscanner, Gotogate, Mytrip, Google Flights, Expedia, KAYAK, and official airlines.'
  },
  '/flights': {
    title: 'Find Your Next Flight – Flight Search & Price Comparison Engine | EveryKR',
    description:
      'Compare flight prices from multiple global booking providers including Trip.com, Skyscanner, Gotogate, Mytrip, Google Flights, Expedia, KAYAK, and official airlines.'
  },
  '/sim': {
    title: 'Free SIM Registration & Arrival Information Portal | EveryKR',
    description:
      'Will you arrive in Korea soon? Apply for your FREE Korean SIM card and submit your arrival details so the EveryKR team can coordinate with you through WhatsApp.'
  },
  '/shopping': {
    title: 'Free SIM Registration & Arrival Information Portal | EveryKR',
    description:
      'Will you arrive in Korea soon? Apply for your FREE Korean SIM card and submit your arrival details so the EveryKR team can coordinate with you through WhatsApp.'
  },
  '/marketplace': {
    title: 'Student Second-Hand Marketplace in South Korea | EveryKR',
    description:
      'Buy and sell pre-owned textbooks, winter coats, monitors, and dorm appliances directly with verified international students in South Korea.'
  },
  '/daily-life': {
    title: 'Daily Life in Korea – Banking, SIM Cards & NHIS | EveryKR',
    description:
      'Essential survival guides for living in South Korea: opening a student bank account, ARC-linked SIM cards, NHIS health insurance, and recycling.'
  },
  '/services': {
    title: 'Other Services & Student Resources Hub | EVERYKR',
    description:
      'Explore all EVERYKR student services and resources: degree programs, admission deadlines, scholarships, Korean life guides, transit, shopping, Hangul, marketplace, and emergency support.'
  },
  '/study-in-korea': {
    title: 'Study in Korea – Admissions, Scholarships, TOPIK & Visas | EVERYKR',
    description:
      'Plan your study journey to South Korea: compare degree programs, GKS scholarships, March 2027 deadlines, TOPIK requirements, Korean Learning Academy, and D-2/D-4 visas.'
  },
  '/study-language': {
    title: 'TOPIK Exam Preparation & Korean Language Programs | EVERYKR',
    description:
      'Prepare for the Test of Proficiency in Korean (TOPIK I & II) with exam schedules, level benchmarks, and D-4 university language institute guides.'
  },
  '/korean-academy': {
    title: 'Learn Korean – Hangul, Vocabulary, Grammar, Pronunciation & TOPIK | EVERYKR',
    description:
      'Learn Korean step by step on EVERYKR, from your first Hangul letters to vocabulary, grammar, speaking practice, and TOPIK I & II mock exams.'
  },
  '/learn-korean': {
    title: 'Learn Korean – Hangul, Vocabulary, Grammar, Pronunciation & TOPIK | EVERYKR',
    description:
      'Learn Korean step by step on EVERYKR, from your first Hangul letters to vocabulary, grammar, speaking practice, and TOPIK I & II mock exams.'
  },
  '/learn-hangul': {
    title: 'EVERYKR Learn Hangul (한국어, 처음부터 쉽게!) – Learn Korean from Zero | EVERYKR',
    description:
      'Learn Korean from zero with structured lessons, interactive exercises, Bengali pronunciation & meanings, practical conversations, Hangul writing practice, and quizzes.'
  },
  '/discover-korea': {
    title: 'Discover South Korea – Cities, Campus Hubs & Student Life | EVERYKR',
    description:
      'Explore Seoul, Busan, Incheon, Daegu, and Daejeon: university districts, student life, accommodation, jobs, transit, Halal dining, and national student discounts.'
  },
  '/explore-korea': {
    title: 'Discover South Korea – Student Travel & Regional Guide | EVERYKR',
    description:
      'Discover student-friendly destinations, cultural heritage sites, and weekend itineraries across Seoul, Busan, Incheon, Daegu, and Daejeon.'
  },
  '/ai-chat': {
    title: 'EveryKR AI Guide – Instant Korea Admissions & Visa Help',
    description:
      'Get interactive guidance on Korean university admissions, GKS scholarships, D-2 visa rules, and student living with the EveryKR AI workspace.'
  },
  '/about': {
    title: 'About EveryKR – Verified Study & Living Platform for South Korea',
    description:
      'Learn about EveryKR, the official verified directory and multilingual platform for international students, universities, visas, and life in South Korea.'
  },
  '/contact': {
    title: 'Contact & Emergency Student Support (1345 / 119) | EveryKR',
    description:
      'Reach the EveryKR student support desk or access 24-hour Korean emergency hotlines including 1345 Immigration Contact Center and 1330 Helpline.'
  },
  '/privacy': {
    title: 'Privacy Policy & PIPA Data Protection | EveryKR',
    description:
      'Learn how EveryKR protects international student personal data in compliance with South Korea PIPA and global privacy standards.'
  },
  '/terms': {
    title: 'Terms & Conditions | EVERYKR',
    description:
      'Read the official Terms & Conditions governing the use of EVERYKR directories, job board, housing listings, and community forums.'
  },
  '/disclaimer': {
    title: 'Disclaimer — Admissions, Visas & Platform Accuracy | EVERYKR',
    description:
      'Important accuracy notice regarding Korean university admission deadlines, tuition fees, scholarships, and D-2/D-4 student visa information on EVERYKR.'
  },
  '/my-applications': {
    title: 'My Applications — Track Korean University Admissions | EVERYKR',
    description:
      'Resume drafts, track admissions review stages, and manage required documents for your Korean university applications on EVERYKR.'
  },
  '/admin/applications': {
    title: 'Admissions Applications Manager | EVERYKR Admin',
    description:
      'Review international student applications, verify AI-extracted passport and academic details, and manage university admissions workflows.'
  }
};

export function getRouteSeoMetadata(pathname: string, universities: University[]): RouteSeoMetadata {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // Dynamic Smart Application Route: /apply/:universityId
  if (cleanPath.startsWith('/apply/')) {
    const slug = cleanPath.slice('/apply/'.length);
    const uni = findUniversityBySlug(universities, slug);
    return {
      title: uni
        ? `Apply Now — ${uni.officialName || uni.name} | EVERYKR`
        : 'Smart University Application | EVERYKR',
      description: uni
        ? `Start your guided international student application for ${uni.officialName || uni.name} with passport auto-fill and document checklist tracking on EVERYKR.`
        : 'Start your guided Korean university application on EVERYKR.',
      canonicalPath: cleanPath
    };
  }

  // Dynamic University Detail Route: /universities/:slug
  if (cleanPath.startsWith('/universities/')) {
    const slug = cleanPath.slice('/universities/'.length);
    const uni = findUniversityBySlug(universities, slug);
    if (uni) {
      const canonicalSlug = getUniversitySlug(uni);
      return {
        title: `${uni.name} (${uni.koreanName}) – Admissions & Tuition | EveryKR`,
        description: `Apply to ${uni.name} in ${uni.city}, South Korea. View verified international admissions deadlines, ${uni.programs.slice(0, 2).join(', ')} programs, GKS scholarships, and semester tuition.`,
        canonicalPath: `/universities/${canonicalSlug}`
      };
    }
    return {
      title: 'University Not Found | EveryKR University Directory',
      description: 'The requested Korean university profile could not be found. Browse all 25 approved universities in South Korea on EveryKR.',
      canonicalPath: cleanPath
    };
  }

  const matched = ROUTE_SEO_MAP[cleanPath];
  if (matched) {
    return {
      ...matched,
      canonicalPath: cleanPath
    };
  }

  return {
    title: 'Page Not Found (404) | EveryKR – Everything Korea',
    description: 'The page you are looking for could not be found on EveryKR. Explore Korean universities, visas, scholarships, jobs, and student housing.',
    canonicalPath: cleanPath
  };
}
