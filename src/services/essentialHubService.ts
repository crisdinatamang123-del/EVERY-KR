import {
  collection,
  doc,
  getDocs,
  setDoc as rawSetDoc,
  updateDoc as rawUpdateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, withTimeout, sanitizeFirestorePayload } from '../lib/firebase';
import { createAuditLogDoc, recordAdminLogDoc } from './firebaseService';
import {
  KoreaEmergencyContact,
  KoreaImmigrationOffice,
  KoreaPoliceStation,
  KoreanLifeGuideArticle,
  AirportToCityRoute,
  EssentialNewsItem,
  VERIFIED_EMERGENCY_CONTACTS,
  VERIFIED_IMMIGRATION_OFFICES,
  VERIFIED_POLICE_STATIONS,
  VERIFIED_LIFE_GUIDES,
  VERIFIED_AIRPORT_ROUTES,
  VERIFIED_NEWS_UPDATES
} from '../data/essentialHubData';

export type {
  KoreaEmergencyContact,
  KoreaImmigrationOffice,
  KoreaPoliceStation,
  KoreanLifeGuideArticle,
  AirportToCityRoute,
  EssentialNewsItem
};

// Safe Firestore write wrappers
async function setDoc(reference: any, data: any, options?: any): Promise<void> {
  const sanitized = sanitizeFirestorePayload(data);
  if (options !== undefined) {
    await rawSetDoc(reference, sanitized, options);
  } else {
    await rawSetDoc(reference, sanitized);
  }
}

async function updateDoc(reference: any, data: any): Promise<void> {
  const sanitized = sanitizeFirestorePayload(data);
  await rawUpdateDoc(reference, sanitized);
}

// ============================================================================
// COLLECTION NAMES & LOCAL STORAGE CACHE KEYS
// ============================================================================

export const ESSENTIAL_HUB_COLLECTIONS = {
  emergencyContacts: 'essential_emergency_contacts',
  immigrationOffices: 'essential_immigration_offices',
  policeStations: 'essential_police_stations',
  lifeGuides: 'essential_life_guides',
  airportRoutes: 'essential_airport_routes',
  newsUpdates: 'essential_news_updates',
  communityPosts: 'community_posts',
  marketplaceListings: 'marketplace_listings',
  reports: 'reports'
} as const;

const CACHE_KEYS = {
  emergencyContacts: 'everykr_essential_emergency_v1',
  immigrationOffices: 'everykr_essential_immigration_v1',
  policeStations: 'everykr_essential_police_v1',
  lifeGuides: 'everykr_essential_lifeguides_v1',
  airportRoutes: 'everykr_essential_airportroutes_v1',
  newsUpdates: 'everykr_essential_news_v1',
  communityPosts: 'everykr_essential_community_v1',
  marketplaceListings: 'everykr_essential_marketplace_v1',
  savedMarketplaceIds: 'everykr_saved_marketplace_ids_v1',
  bookmarkedNewsIds: 'everykr_bookmarked_news_ids_v1',
  likedCommunityPostIds: 'everykr_liked_community_ids_v1'
};

// ============================================================================
// EXTENDED COMMUNITY & MARKETPLACE INTERFACES FOR ESSENTIAL HUB
// ============================================================================

export type EssentialCommunityChannel =
  | 'All Discussions'
  | 'Student Q&A'
  | 'University Communities'
  | 'City Communities'
  | 'Country Communities'
  | 'Study Groups'
  | 'Housing & Roommates'
  | 'Part-Time Jobs'
  | 'Korean Language'
  | 'Student Experiences';

export interface EssentialCommunityReply {
  id: string;
  postId: string;
  parentReplyId?: string | null;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorUniversity?: string;
  authorCity?: string;
  authorCountry?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isVerifiedStudent?: boolean;
  likesCount?: number;
  likedByUids?: string[];
  status?: 'published' | 'hidden' | 'deleted' | 'flagged';
  moderationReason?: string;
}

export interface EssentialCommunityPost {
  id: string;
  title: string;
  content: string;
  channel: EssentialCommunityChannel;
  category: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorRole: string;
  authorNationality: string;
  authorUniversity?: string;
  isVerifiedAuthor?: boolean;
  city: string;
  tags: string[];
  imageUrl?: string;
  likesCount: number;
  likedByUids?: string[];
  repliesCount: number;
  pinned?: boolean;
  featured?: boolean;
  commentsLocked?: boolean;
  moderationReason?: string;
  timestamp: string;
  createdAt: string;
  updatedAt?: string;
  status: 'published' | 'hidden' | 'flagged' | 'archived';
  replies?: EssentialCommunityReply[];
}

export type EssentialMarketplaceCategory =
  | 'Electronics'
  | 'Furniture'
  | 'Home Appliances'
  | 'Books'
  | 'Clothing'
  | 'Bicycles'
  | 'Kitchen Items'
  | 'Study Materials'
  | 'Other Student Essentials';

export type EssentialMarketplaceCondition =
  | 'Brand New'
  | 'Like New'
  | 'Good Condition'
  | 'Fair Condition';

export type EssentialMarketplaceStatus = 'Available' | 'Reserved' | 'Sold';

export interface EssentialMarketplaceListing {
  id: string;
  title: string;
  category: EssentialMarketplaceCategory;
  priceKRW: number;
  condition: EssentialMarketplaceCondition;
  city: string;
  neighborhood: string;
  location: string;
  meetupStationOrLandmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerUniversity?: string;
  sellerContact: string;
  contactMethod: 'Safe In-App Inquiry' | 'KakaoTalk OpenChat' | 'Email' | 'Phone';
  status: EssentialMarketplaceStatus;
  postedDate: string;
  createdAt: string;
  updatedAt?: string;
  verified?: boolean;
}

// ============================================================================
// ANTI-SPAM, ANTI-SCAM & CONTENT SAFETY VALIDATOR
// ============================================================================

const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(western\s*union|moneygram|wire\s*transfer\s*only|crypto\s*escrow|usdt\s*deposit|telegram\s*@\w+\s*job|whatsapp\s*\+\d+\s*easy\s*money)\b/i,
    reason: 'Contains high-risk financial transfer or off-platform recruitment scam keywords.'
  },
  {
    pattern: /\b(illegal\s*visa\s*broker|fake\s*bank\s*statement|forged\s*topik|buy\s*arc\s*card|guaranteed\s*visa\s*no\s*documents)\b/i,
    reason: 'References unlawful immigration brokerage or document forgery.'
  },
  {
    pattern: /(javascript:|data:text\/html|<script\b|onclick=|onerror=)/i,
    reason: 'Contains unsafe script or executable link markup.'
  },
  {
    pattern: /\b(bit\.ly|tinyurl\.com|t\.me\/joinchat|discord\.gg\/\w+\s*free\s*nitro)\b/i,
    reason: 'Shortened or unverified external redirect links are blocked for student safety.'
  }
];

export function validateSafeStudentContent(text: string, title?: string): {
  valid: boolean;
  reason?: string;
} {
  const combined = `${title || ''} ${text || ''}`.trim();
  if (combined.length < 3) {
    return { valid: false, reason: 'Content is too short. Please provide meaningful details.' };
  }
  if (combined.length > 8000) {
    return { valid: false, reason: 'Content exceeds the maximum allowed length (8,000 characters).' };
  }
  for (const rule of SUSPICIOUS_PATTERNS) {
    if (rule.pattern.test(combined)) {
      return { valid: false, reason: rule.reason };
    }
  }
  return { valid: true };
}

// ============================================================================
// IMAGE UPLOAD HELPER (Firebase Storage + Resilient Compressed DataURL Fallback)
// ============================================================================

export async function uploadEssentialHubImage(
  file: File,
  folder: 'community' | 'marketplace'
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (JPG, PNG, WEBP) are allowed.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be under 5 MB.');
  }

  const uid = auth.currentUser?.uid || 'student';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  const path = `essential_hub/${folder}/${uid}/${Date.now()}_${safeName}`;

  try {
    if (auth.currentUser) {
      const fileRef = storageRef(storage, path);
      await withTimeout(uploadBytes(fileRef, file), 6000);
      const downloadUrl = await withTimeout(getDownloadURL(fileRef), 4000);
      if (downloadUrl) return downloadUrl;
    }
  } catch {
    // Fallback to client-side compressed JPEG data URL
  }

  return await compressImageFileToDataUrl(file, 900, 0.78);
}

function compressImageFileToDataUrl(
  file: File,
  maxDimension = 900,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// GENERIC MERGE & FETCH ENGINE FOR THE 6 VERIFIED PUBLIC DIRECTORY COLLECTIONS
// ============================================================================

function readLocalCache<T>(key: string): T[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalCache<T>(key: string, items: T[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

function getDeletedIdsForCollection(collectionName: string): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set();
    const raw = localStorage.getItem(`everykr_deleted_${collectionName}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markDeletedIdForCollection(collectionName: string, id: string): void {
  try {
    if (typeof window === 'undefined') return;
    const set = getDeletedIdsForCollection(collectionName);
    set.add(id);
    localStorage.setItem(`everykr_deleted_${collectionName}`, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

async function fetchMergedCollectionRecords<T extends { id: string }>(
  collectionName: string,
  cacheKey: string,
  baselineItems: T[]
): Promise<T[]> {
  const deletedIds = getDeletedIdsForCollection(collectionName);
  const map = new Map<string, T>();

  for (const item of baselineItems) {
    if (!deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  }

  const cached = readLocalCache<T>(cacheKey);
  if (cached) {
    for (const item of cached) {
      if (item?.id && !deletedIds.has(item.id)) {
        map.set(item.id, item);
      }
    }
  }

  try {
    const snap = await withTimeout(getDocs(collection(db, collectionName)), 3500);
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data?._deleted === true) {
        markDeletedIdForCollection(collectionName, d.id);
        map.delete(d.id);
      } else {
        map.set(d.id, { ...(data as T), id: d.id });
      }
    });
  } catch {
    // Offline or fallback to baseline + cache
  }

  const merged = Array.from(map.values());
  writeLocalCache(cacheKey, merged);
  return merged;
}

export async function fetchEmergencyContacts(includeDrafts = false): Promise<KoreaEmergencyContact[]> {
  const all = await fetchMergedCollectionRecords<KoreaEmergencyContact>(
    ESSENTIAL_HUB_COLLECTIONS.emergencyContacts,
    CACHE_KEYS.emergencyContacts,
    VERIFIED_EMERGENCY_CONTACTS
  );
  return includeDrafts ? all : all.filter((c) => c.published !== false);
}

export async function fetchImmigrationOffices(includeDrafts = false): Promise<KoreaImmigrationOffice[]> {
  const all = await fetchMergedCollectionRecords<KoreaImmigrationOffice>(
    ESSENTIAL_HUB_COLLECTIONS.immigrationOffices,
    CACHE_KEYS.immigrationOffices,
    VERIFIED_IMMIGRATION_OFFICES
  );
  return includeDrafts ? all : all.filter((o) => o.published !== false);
}

export async function fetchPoliceStations(includeDrafts = false): Promise<KoreaPoliceStation[]> {
  const all = await fetchMergedCollectionRecords<KoreaPoliceStation>(
    ESSENTIAL_HUB_COLLECTIONS.policeStations,
    CACHE_KEYS.policeStations,
    VERIFIED_POLICE_STATIONS
  );
  return includeDrafts ? all : all.filter((p) => p.published !== false);
}

export async function fetchKoreanLifeGuides(includeDrafts = false): Promise<KoreanLifeGuideArticle[]> {
  const all = await fetchMergedCollectionRecords<KoreanLifeGuideArticle>(
    ESSENTIAL_HUB_COLLECTIONS.lifeGuides,
    CACHE_KEYS.lifeGuides,
    VERIFIED_LIFE_GUIDES
  );
  return includeDrafts ? all : all.filter((g) => g.published !== false);
}

export async function fetchAirportTransportRoutes(includeDrafts = false): Promise<AirportToCityRoute[]> {
  const all = await fetchMergedCollectionRecords<AirportToCityRoute>(
    ESSENTIAL_HUB_COLLECTIONS.airportRoutes,
    CACHE_KEYS.airportRoutes,
    VERIFIED_AIRPORT_ROUTES
  );
  return includeDrafts ? all : all.filter((r) => r.published !== false);
}

export async function fetchEssentialNewsUpdates(includeDrafts = false): Promise<EssentialNewsItem[]> {
  const all = await fetchMergedCollectionRecords<EssentialNewsItem>(
    ESSENTIAL_HUB_COLLECTIONS.newsUpdates,
    CACHE_KEYS.newsUpdates,
    VERIFIED_NEWS_UPDATES
  );
  const filtered = includeDrafts ? all : all.filter((n) => n.published !== false);
  return filtered.sort((a, b) => (b.publicationDate || '').localeCompare(a.publicationDate || ''));
}

// ============================================================================
// ADMIN CRUD HELPERS FOR ALL ESSENTIAL HUB MODULES (WITH AUDIT LOGS)
// ============================================================================

export async function saveEssentialHubRecord<T extends { id: string }>(params: {
  collectionName: string;
  record: T;
  targetName: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): Promise<T> {
  const { collectionName, record, targetName, adminUid, adminName, adminEmail } = params;
  const nowIso = new Date().toISOString().slice(0, 10);
  const updatedRecord: T = {
    ...record,
    lastVerifiedDate: nowIso
  };

  const cacheKeyMap: Record<string, string> = {
    [ESSENTIAL_HUB_COLLECTIONS.emergencyContacts]: CACHE_KEYS.emergencyContacts,
    [ESSENTIAL_HUB_COLLECTIONS.immigrationOffices]: CACHE_KEYS.immigrationOffices,
    [ESSENTIAL_HUB_COLLECTIONS.policeStations]: CACHE_KEYS.policeStations,
    [ESSENTIAL_HUB_COLLECTIONS.lifeGuides]: CACHE_KEYS.lifeGuides,
    [ESSENTIAL_HUB_COLLECTIONS.airportRoutes]: CACHE_KEYS.airportRoutes,
    [ESSENTIAL_HUB_COLLECTIONS.newsUpdates]: CACHE_KEYS.newsUpdates
  };
  const cacheKey = cacheKeyMap[collectionName];
  if (cacheKey) {
    const existing = readLocalCache<T>(cacheKey) || [];
    const idx = existing.findIndex((i) => i.id === updatedRecord.id);
    if (idx >= 0) {
      existing[idx] = updatedRecord;
    } else {
      existing.unshift(updatedRecord);
    }
    writeLocalCache(cacheKey, existing);
  }

  try {
    await withTimeout(
      setDoc(
        doc(db, collectionName, updatedRecord.id),
        {
          ...updatedRecord,
          _deleted: false,
          updatedAt: new Date().toISOString(),
          updatedByAdminUid: adminUid,
          updatedByAdminEmail: adminEmail,
          serverTimestamp: serverTimestamp()
        },
        { merge: true }
      ),
      3500
    );
  } catch {
    // Non-blocking fallback if offline
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('everykr-essential-hub-updated', { detail: { collectionName } }));
  }

  createAuditLogDoc({
    timestamp: new Date().toISOString(),
    adminId: adminUid,
    adminName: adminName || 'Administrator',
    adminEmail: adminEmail || 'admin@everykr.com',
    actionType: 'EDIT',
    targetEntity: 'Article',
    targetId: updatedRecord.id,
    targetName,
    details: `Saved Essential Hub record "${targetName}" in ${collectionName}.`
  }).catch(() => {});

  recordAdminLogDoc({
    adminUid,
    adminName,
    adminEmail,
    action: `ESSENTIAL_HUB_SAVE_${collectionName.toUpperCase()}`,
    details: `Saved "${targetName}" (${updatedRecord.id}) in ${collectionName}.`
  }).catch(() => {});

  return updatedRecord;
}

export async function deleteEssentialHubRecord(params: {
  collectionName: string;
  recordId: string;
  targetName: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
}): Promise<boolean> {
  const { collectionName, recordId, targetName, adminUid, adminName, adminEmail } = params;
  markDeletedIdForCollection(collectionName, recordId);

  try {
    await withTimeout(
      setDoc(
        doc(db, collectionName, recordId),
        {
          id: recordId,
          _deleted: true,
          updatedAt: new Date().toISOString(),
          deletedByAdminUid: adminUid,
          deletedByAdminEmail: adminEmail
        },
        { merge: true }
      ),
      3000
    );
  } catch {
    // Ignore if offline
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('everykr-essential-hub-updated', { detail: { collectionName } }));
  }

  createAuditLogDoc({
    timestamp: new Date().toISOString(),
    adminId: adminUid,
    adminName: adminName || 'Administrator',
    adminEmail: adminEmail || 'admin@everykr.com',
    actionType: 'DELETE',
    targetEntity: 'Article',
    targetId: recordId,
    targetName,
    details: `Deleted Essential Hub record "${targetName}" (${recordId}) from ${collectionName}.`
  }).catch(() => {});

  return true;
}

// ============================================================================
// MODULE 4: EVERYKR COMMUNITY SERVICE (POSTS, REPLIES, LIKES, SAFETY REPORTS)
// ============================================================================

const SEED_COMMUNITY_POSTS: EssentialCommunityPost[] = [
  {
    id: 'comm-seed-1',
    title: 'Tips for D-2 ARC Fingerprint Appointment at Seoul Immigration Office (Mok-dong)',
    content:
      'Just completed my Residence Card (ARC) registration at Seoul Immigration Office in Yangcheon-gu! Tip: Book your HiKorea reservation as soon as you receive your admission letter, bring a crisp 3.5cm x 4.5cm white-background photo, your Certificate of Enrollment, and your housing contract (or dormitory confirmation). The fee is 30,000 KRW cash at the automated ATM inside.',
    channel: 'Student Q&A',
    category: 'Visa & Immigration',
    authorId: 'student_seed_1',
    authorName: 'Tariq R.',
    authorRole: 'Master Student',
    authorNationality: 'Bangladesh',
    authorUniversity: 'Yonsei University',
    isVerifiedAuthor: true,
    city: 'Seoul',
    tags: ['ARC', 'HiKorea', 'Seoul Immigration', 'D-2 Visa'],
    likesCount: 0,
    likedByUids: [],
    repliesCount: 2,
    pinned: true,
    featured: true,
    commentsLocked: false,
    timestamp: '2 hours ago',
    createdAt: '2026-03-20T09:30:00.000Z',
    status: 'published',
    replies: [
      {
        id: 'rep-seed-1',
        postId: 'comm-seed-1',
        authorId: 'student_seed_2',
        authorName: 'Ananya S.',
        authorUniversity: 'Korea University',
        authorCity: 'Seoul',
        authorCountry: 'India',
        content:
          'Super helpful! Also remember that Korea University and Kyung Hee University students go to Sejongno Branch instead of Mok-dong. Always check jurisdiction first!',
        createdAt: '2026-03-20T10:15:00.000Z',
        isVerifiedStudent: true,
        likesCount: 0,
        likedByUids: [],
        status: 'published',
      },
      {
        id: 'rep-seed-2',
        postId: 'comm-seed-1',
        authorId: 'student_seed_3',
        authorName: 'Sujan G.',
        authorUniversity: 'Hanyang University',
        authorCity: 'Seoul',
        authorCountry: 'Nepal',
        content: 'Do they accept card for the 30,000 KRW fee or cash only?',
        createdAt: '2026-03-20T11:05:00.000Z',
        isVerifiedStudent: true,
        likesCount: 0,
        likedByUids: [],
        status: 'published',
      },
    ],
  },
  {
    id: 'comm-seed-2',
    title: 'TOPIK II Level 4 Study Group for Fall 2026 Exam (Online + Sinchon Weekend Meetup)',
    content:
      'We are forming a 6-person TOPIK II study group focusing on Writing Question 53 & 54 and reading speed drills. We meet on Zoom every Wednesday at 8 PM KST and in-person at a study cafe near Sinchon Station on Saturdays. Comment below if you want to join!',
    channel: 'Study Groups',
    category: 'Korean Language',
    authorId: 'student_seed_4',
    authorName: 'Nadia K.',
    authorRole: 'Undergraduate Student',
    authorNationality: 'Uzbekistan',
    authorUniversity: 'Sogang University',
    isVerifiedAuthor: true,
    city: 'Seoul',
    tags: ['TOPIK II', 'Study Group', 'Writing 54', 'Sinchon'],
    likesCount: 0,
    likedByUids: [],
    repliesCount: 1,
    pinned: false,
    featured: true,
    commentsLocked: false,
    timestamp: '5 hours ago',
    createdAt: '2026-03-20T06:00:00.000Z',
    status: 'published',
    replies: [
      {
        id: 'rep-seed-3',
        postId: 'comm-seed-2',
        authorId: 'student_seed_5',
        authorName: 'Minhaj A.',
        authorUniversity: 'Kyung Hee University',
        authorCity: 'Seoul',
        authorCountry: 'Bangladesh',
        content: 'Count me in for the Zoom sessions! I am aiming for Level 4 this October.',
        createdAt: '2026-03-20T07:10:00.000Z',
        isVerifiedStudent: true,
        likesCount: 0,
        likedByUids: [],
        status: 'published',
      },
    ],
  },
  {
    id: 'comm-seed-3',
    title: 'Pusan National University (PNU) vs Kyungpook National University (KNU) Living Cost Experience',
    content:
      'For incoming GKS and self-funded students comparing regional national universities: my monthly one-room rent near PNU (Jangjeon-dong, Busan) is 350,000 KRW including maintenance, compared to 600,000+ KRW in Seoul. Plus Gimhae Airport (PUS) makes international flights very convenient!',
    channel: 'Student Experiences',
    category: 'University Life',
    authorId: 'student_seed_6',
    authorName: 'Prakash T.',
    authorRole: 'PhD Researcher',
    authorNationality: 'Nepal',
    authorUniversity: 'Pusan National University',
    isVerifiedAuthor: true,
    city: 'Busan',
    tags: ['PNU', 'Busan', 'Cost of Living', 'One-room'],
    likesCount: 0,
    likedByUids: [],
    repliesCount: 0,
    pinned: false,
    featured: false,
    commentsLocked: false,
    timestamp: '1 day ago',
    createdAt: '2026-03-19T14:20:00.000Z',
    status: 'published',
    replies: [],
  },
  {
    id: 'comm-seed-4',
    title: 'Part-Time Work Permit (S-3) Checklist: What Your Employer Must Sign',
    content:
      'Before starting any convenience store, cafe, or restaurant part-time job on a D-2 or D-4 visa, you MUST get the Foreign Student Part-Time Work Confirmation Form signed by both your employer and your university International Office, then upload it on HiKorea together with the employer Business Registration Certificate (사업자등록증) and Standard Labor Contract.',
    channel: 'Part-Time Jobs',
    category: 'Jobs & Careers',
    authorId: 'student_seed_7',
    authorName: 'Farhan H.',
    authorRole: 'Student Mentor',
    authorNationality: 'Pakistan',
    authorUniversity: 'Sungkyunkwan University',
    isVerifiedAuthor: true,
    city: 'Suwon',
    tags: ['Work Permit', 'Part-Time Job', 'D-2 Visa', 'HiKorea'],
    likesCount: 0,
    likedByUids: [],
    repliesCount: 0,
    pinned: false,
    featured: false,
    commentsLocked: false,
    timestamp: '2 days ago',
    createdAt: '2026-03-18T11:00:00.000Z',
    status: 'published',
    replies: [],
  },
];

const LOCAL_COMMUNITY_LIKES_REGISTRY_KEY = 'everykr_community_post_likes_registry_v1';
const LOCAL_COMMUNITY_USER_RESTRICTIONS_KEY = 'everykr_community_user_restrictions_v1';
const LOCAL_COMMUNITY_REPORTS_KEY = 'everykr_community_moderation_reports_v1';

export interface StoredPostLikeEntry {
  id: string; // matches userId
  postId: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

function readLocalPostLikesRegistry(): Record<string, StoredPostLikeEntry[]> {
  try {
    const raw = localStorage.getItem(LOCAL_COMMUNITY_LIKES_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalPostLikesRegistry(reg: Record<string, StoredPostLikeEntry[]>): void {
  try {
    localStorage.setItem(LOCAL_COMMUNITY_LIKES_REGISTRY_KEY, JSON.stringify(reg));
  } catch {
    // ignore
  }
}

export async function checkUserCommunityRestriction(userId: string): Promise<{
  canPost: boolean;
  canComment: boolean;
  canLike: boolean;
  reason?: string;
}> {
  if (!userId) {
    return { canPost: false, canComment: false, canLike: false, reason: 'Please sign in to interact.' };
  }
  const restrictions = await fetchCommunityUserRestrictions();
  const found = restrictions.find((r) => r.userId === userId);
  if (!found || found.restrictionStatus === 'active') {
    return { canPost: true, canComment: true, canLike: true };
  }
  return {
    canPost: found.canPost !== false && found.restrictionStatus !== 'posting_restricted' && found.restrictionStatus !== 'community_suspended',
    canComment: found.canComment !== false && found.restrictionStatus !== 'commenting_restricted' && found.restrictionStatus !== 'community_suspended',
    canLike: found.canLike !== false && found.restrictionStatus !== 'community_suspended',
    reason: found.reason || 'Your community privileges have been restricted by a moderator.',
  };
}

export async function fetchEssentialCommunityPosts(includeHiddenForAdmin = false): Promise<EssentialCommunityPost[]> {
  const deletedIds = getDeletedIdsForCollection(ESSENTIAL_HUB_COLLECTIONS.communityPosts);
  const map = new Map<string, EssentialCommunityPost>();
  const likesRegistry = readLocalPostLikesRegistry();

  for (const seed of SEED_COMMUNITY_POSTS) {
    if (!deletedIds.has(seed.id)) {
      map.set(seed.id, { ...seed });
    }
  }

  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts);
  if (cached) {
    for (const p of cached) {
      if (p?.id && !deletedIds.has(p.id)) {
        // Never allow old hardcoded seed counts to inflate if there are no actual like records
        const isSeed = p.id.startsWith('comm-seed-');
        const localLikesForPost = likesRegistry[p.id] || [];
        const uids = Array.isArray(p.likedByUids)
          ? p.likedByUids
          : localLikesForPost.map((l) => l.userId);
        const realLikesCount = isSeed ? uids.length : typeof p.likesCount === 'number' ? p.likesCount : uids.length;
        map.set(p.id, {
          ...p,
          likedByUids: uids,
          likesCount: Math.max(0, realLikesCount),
        });
      }
    }
  }

  try {
    const snap = await withTimeout(getDocs(collection(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts)), 3500);
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data?._deleted === true || deletedIds.has(d.id)) {
        map.delete(d.id);
        return;
      }
      const existing = map.get(d.id);
      const likedByUids: string[] = Array.isArray(data.likedByUids)
        ? data.likedByUids
        : existing?.likedByUids || [];
      const repliesList: EssentialCommunityReply[] = Array.isArray(data.replies)
        ? data.replies
        : existing?.replies || [];
      const publishedRepliesCount = repliesList.filter((r) => r.status !== 'deleted' && r.status !== 'hidden').length;

      map.set(d.id, {
        id: d.id,
        title: data.title || existing?.title || 'Untitled Post',
        content: data.content || existing?.content || '',
        channel: data.channel || existing?.channel || 'Student Q&A',
        category: data.category || existing?.category || 'General Discussion',
        authorId: data.authorId || existing?.authorId || 'student',
        authorName: data.authorName || existing?.authorName || 'EveryKR Student',
        authorEmail: data.authorEmail || existing?.authorEmail || '',
        authorRole: data.authorRole || existing?.authorRole || 'Student',
        authorNationality: data.authorNationality || existing?.authorNationality || 'International',
        authorUniversity: data.authorUniversity || existing?.authorUniversity || '',
        isVerifiedAuthor: Boolean(data.isVerifiedAuthor ?? existing?.isVerifiedAuthor),
        city: data.city || existing?.city || 'Seoul',
        tags: Array.isArray(data.tags) ? data.tags : existing?.tags || [],
        imageUrl: data.imageUrl || existing?.imageUrl || '',
        likesCount:
          typeof data.likesCount === 'number'
            ? Math.max(0, data.likesCount)
            : likedByUids.length,
        likedByUids,
        repliesCount:
          typeof data.repliesCount === 'number'
            ? Math.max(0, data.repliesCount)
            : publishedRepliesCount,
        pinned: Boolean(data.pinned ?? existing?.pinned),
        featured: Boolean(data.featured ?? existing?.featured),
        commentsLocked: Boolean(data.commentsLocked ?? existing?.commentsLocked),
        moderationReason: data.moderationReason || existing?.moderationReason || '',
        timestamp: data.timestamp || existing?.timestamp || 'Just now',
        createdAt: data.createdAt || existing?.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || existing?.updatedAt,
        status: data.status || existing?.status || 'published',
        replies: repliesList,
      });
    });
  } catch {
    // Offline fallback
  }

  const allList = Array.from(map.values()).sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  writeLocalCache(CACHE_KEYS.communityPosts, allList);

  if (includeHiddenForAdmin) {
    return allList;
  }
  return allList.filter((p) => p.status === 'published');
}

export async function createEssentialCommunityPost(params: {
  title: string;
  content: string;
  channel: EssentialCommunityChannel;
  city: string;
  tags: string[];
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorRole: string;
  authorNationality: string;
  authorUniversity?: string;
  isVerifiedAuthor?: boolean;
}): Promise<EssentialCommunityPost> {
  const uid = auth.currentUser?.uid || params.authorId;
  if (!uid || uid === 'guest') {
    throw new Error('You must be signed in with a verified EveryKR account to create a post.');
  }

  const perm = await checkUserCommunityRestriction(uid);
  if (!perm.canPost) {
    throw new Error(perm.reason || 'Your account is restricted from creating community posts.');
  }

  const safety = validateSafeStudentContent(params.content, params.title);
  if (!safety.valid) {
    throw new Error(safety.reason || 'Post content failed safety check.');
  }

  const nowIso = new Date().toISOString();
  const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newPost: EssentialCommunityPost = {
    id,
    title: params.title.trim(),
    content: params.content.trim(),
    channel: params.channel,
    category:
      params.channel === 'Housing & Roommates'
        ? 'Accommodation'
        : params.channel === 'Part-Time Jobs'
        ? 'Jobs & Careers'
        : params.channel === 'Korean Language'
        ? 'Korean Language'
        : 'University Life',
    authorId: uid,
    authorName: params.authorName || 'Student Member',
    authorEmail: auth.currentUser?.email || params.authorEmail || '',
    authorRole: params.authorRole || 'Student',
    authorNationality: params.authorNationality || 'International',
    authorUniversity: params.authorUniversity || '',
    isVerifiedAuthor: Boolean(params.isVerifiedAuthor ?? auth.currentUser?.emailVerified),
    city: params.city || 'Seoul',
    tags: params.tags.filter(Boolean).slice(0, 6),
    imageUrl: params.imageUrl || '',
    likesCount: 0,
    likedByUids: [],
    repliesCount: 0,
    pinned: false,
    featured: false,
    commentsLocked: false,
    timestamp: 'Just now',
    createdAt: nowIso,
    status: 'published',
    replies: [],
  };

  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  writeLocalCache(CACHE_KEYS.communityPosts, [newPost, ...cached]);

  try {
    if (auth.currentUser) {
      await withTimeout(
        setDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, id), {
          ...newPost,
          authorId: auth.currentUser.uid,
          serverTimestamp: serverTimestamp(),
        }),
        3500
      );
    }
  } catch {
    // Non-blocking fallback
  }

  return newPost;
}

export async function updateEssentialCommunityPost(params: {
  postId: string;
  title: string;
  content: string;
  channel: EssentialCommunityChannel;
  city: string;
  tags: string[];
}): Promise<void> {
  const safety = validateSafeStudentContent(params.content, params.title);
  if (!safety.valid) {
    throw new Error(safety.reason || 'Updated content failed safety check.');
  }
  const nowIso = new Date().toISOString();
  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  const next = cached.map((p) =>
    p.id === params.postId
      ? {
          ...p,
          title: params.title.trim(),
          content: params.content.trim(),
          channel: params.channel,
          city: params.city,
          tags: params.tags,
          updatedAt: nowIso,
        }
      : p
  );
  writeLocalCache(CACHE_KEYS.communityPosts, next);

  try {
    if (auth.currentUser) {
      await withTimeout(
        updateDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, params.postId), {
          title: params.title.trim(),
          content: params.content.trim(),
          channel: params.channel,
          city: params.city,
          tags: params.tags,
          updatedAt: nowIso,
        }),
        3000
      );
    }
  } catch {
    // Offline fallback
  }
}

export async function deleteEssentialCommunityPost(postId: string): Promise<void> {
  markDeletedIdForCollection(ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId);
  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  writeLocalCache(
    CACHE_KEYS.communityPosts,
    cached.filter((p) => p.id !== postId)
  );
  try {
    if (auth.currentUser) {
      await withTimeout(deleteDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId)), 3000);
    }
  } catch {
    // Ignore
  }
}

export async function addEssentialCommunityReply(params: {
  postId: string;
  parentReplyId?: string | null;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorUniversity?: string;
  authorCity?: string;
  authorCountry?: string;
  isVerifiedStudent?: boolean;
}): Promise<EssentialCommunityReply> {
  const uid = auth.currentUser?.uid || params.authorId;
  if (!uid || uid === 'guest') {
    throw new Error('Please sign in to post a comment or reply.');
  }

  const perm = await checkUserCommunityRestriction(uid);
  if (!perm.canComment) {
    throw new Error(perm.reason || 'Your account is restricted from commenting.');
  }

  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  const targetPost = cached.find((p) => p.id === params.postId);
  if (targetPost?.commentsLocked) {
    throw new Error('Comments are locked on this post by a moderator.');
  }

  const safety = validateSafeStudentContent(params.content);
  if (!safety.valid) {
    throw new Error(safety.reason || 'Comment content failed safety check.');
  }

  const nowIso = new Date().toISOString();
  const reply: EssentialCommunityReply = {
    id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    postId: params.postId,
    parentReplyId: params.parentReplyId || null,
    authorId: uid,
    authorName: params.authorName || 'Student Member',
    authorEmail: auth.currentUser?.email || params.authorEmail || '',
    authorUniversity: params.authorUniversity || '',
    authorCity: params.authorCity || '',
    authorCountry: params.authorCountry || '',
    content: params.content.trim(),
    createdAt: nowIso,
    isVerifiedStudent: Boolean(params.isVerifiedStudent ?? auth.currentUser?.emailVerified),
    likesCount: 0,
    likedByUids: [],
    status: 'published',
  };

  let updatedPostRef: EssentialCommunityPost | null = null;
  const next = cached.map((p) => {
    if (p.id !== params.postId) return p;
    const replies = [...(p.replies || []), reply];
    const activeCount = replies.filter((r) => r.status !== 'deleted' && r.status !== 'hidden').length;
    updatedPostRef = {
      ...p,
      replies,
      repliesCount: activeCount,
    };
    return updatedPostRef;
  });
  writeLocalCache(CACHE_KEYS.communityPosts, next);

  try {
    if (auth.currentUser) {
      await withTimeout(
        setDoc(
          doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, params.postId, 'comments', reply.id),
          {
            ...reply,
            authorId: auth.currentUser.uid,
            serverTimestamp: serverTimestamp(),
          }
        ),
        3000
      );
      const postToPersist = updatedPostRef as EssentialCommunityPost | null;
      if (postToPersist) {
        await withTimeout(
          setDoc(
            doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, params.postId),
            {
              ...(postToPersist as unknown as Record<string, unknown>),
              updatedAt: nowIso,
            },
            { merge: true }
          ),
          3000
        );
      }
    }
  } catch {
    // Non-blocking
  }

  return reply;
}

export async function editEssentialCommunityReply(params: {
  postId: string;
  replyId: string;
  content: string;
  actorUid: string;
}): Promise<void> {
  const safety = validateSafeStudentContent(params.content);
  if (!safety.valid) {
    throw new Error(safety.reason || 'Updated comment failed safety check.');
  }
  const nowIso = new Date().toISOString();
  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  let updatedReplies: EssentialCommunityReply[] | null = null;

  const next = cached.map((p) => {
    if (p.id !== params.postId) return p;
    const replies = (p.replies || []).map((r) => {
      if (r.id !== params.replyId) return r;
      if (r.authorId !== params.actorUid) {
        throw new Error('You can only edit your own comments.');
      }
      return {
        ...r,
        content: params.content.trim(),
        updatedAt: nowIso,
      };
    });
    updatedReplies = replies;
    return { ...p, replies };
  });
  writeLocalCache(CACHE_KEYS.communityPosts, next);

  try {
    if (auth.currentUser && updatedReplies) {
      await withTimeout(
        setDoc(
          doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, params.postId, 'comments', params.replyId),
          { content: params.content.trim(), updatedAt: nowIso },
          { merge: true }
        ),
        2500
      );
      await withTimeout(
        setDoc(
          doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, params.postId),
          { replies: updatedReplies, updatedAt: nowIso },
          { merge: true }
        ),
        2500
      );
    }
  } catch {
    // non-blocking
  }
}

export async function deleteEssentialCommunityReply(params: {
  postId: string;
  replyId: string;
  actorUid: string;
  isAdmin?: boolean;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  let updatedReplies: EssentialCommunityReply[] | null = null;
  let updatedCount = 0;

  const next = cached.map((p) => {
    if (p.id !== params.postId) return p;
    const replies = (p.replies || []).filter((r) => {
      if (r.id !== params.replyId) return true;
      if (!params.isAdmin && r.authorId !== params.actorUid) {
        throw new Error('You can only delete your own comments.');
      }
      return false;
    });
    updatedReplies = replies;
    updatedCount = replies.filter((r) => r.status !== 'deleted' && r.status !== 'hidden').length;
    return { ...p, replies, repliesCount: updatedCount };
  });
  writeLocalCache(CACHE_KEYS.communityPosts, next);

  try {
    if (auth.currentUser) {
      await withTimeout(
        deleteDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, params.postId, 'comments', params.replyId)),
        2500
      );
      if (updatedReplies) {
        await withTimeout(
          setDoc(
            doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, params.postId),
            { replies: updatedReplies, repliesCount: updatedCount, updatedAt: nowIso },
            { merge: true }
          ),
          2500
        );
      }
    }
  } catch {
    // non-blocking
  }
}

export async function toggleLikeCommunityReply(params: {
  postId: string;
  replyId: string;
  userId: string;
}): Promise<{ liked: boolean; likesCount: number }> {
  if (!params.userId || params.userId === 'guest') {
    throw new Error('Please sign in to like a comment.');
  }
  const perm = await checkUserCommunityRestriction(params.userId);
  if (!perm.canLike) {
    throw new Error(perm.reason || 'Your community privileges are restricted.');
  }

  let likedResult = false;
  let newCount = 0;
  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  let updatedReplies: EssentialCommunityReply[] | null = null;

  const next = cached.map((p) => {
    if (p.id !== params.postId) return p;
    const replies = (p.replies || []).map((r) => {
      if (r.id !== params.replyId) return r;
      const uids = new Set(Array.isArray(r.likedByUids) ? r.likedByUids : []);
      if (uids.has(params.userId)) {
        uids.delete(params.userId);
        likedResult = false;
      } else {
        uids.add(params.userId);
        likedResult = true;
      }
      const nextUids = Array.from(uids);
      newCount = nextUids.length;
      return {
        ...r,
        likedByUids: nextUids,
        likesCount: newCount,
      };
    });
    updatedReplies = replies;
    return { ...p, replies };
  });
  writeLocalCache(CACHE_KEYS.communityPosts, next);

  try {
    if (auth.currentUser && updatedReplies) {
      await withTimeout(
        setDoc(
          doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, params.postId),
          { replies: updatedReplies },
          { merge: true }
        ),
        2500
      );
    }
  } catch {
    // non-blocking
  }

  return { liked: likedResult, likesCount: newCount };
}

export async function toggleLikeCommunityPost(
  postId: string,
  userActor?: { uid: string; name?: string; email?: string }
): Promise<{ liked: boolean; likesCount: number }> {
  const uid = userActor?.uid || auth.currentUser?.uid || '';
  if (!uid || uid === 'guest') {
    throw new Error('Please sign in to like community posts.');
  }

  const perm = await checkUserCommunityRestriction(uid);
  if (!perm.canLike) {
    throw new Error(perm.reason || 'Your community privileges are restricted.');
  }

  const userName = userActor?.name || auth.currentUser?.displayName || 'EveryKR Member';
  const userEmail = userActor?.email || auth.currentUser?.email || '';
  const nowIso = new Date().toISOString();

  const likedSet = getLikedCommunityPostIds(uid);
  const alreadyLiked = likedSet.has(postId);

  if (alreadyLiked) {
    likedSet.delete(postId);
  } else {
    likedSet.add(postId);
  }

  try {
    localStorage.setItem(`${CACHE_KEYS.likedCommunityPostIds}_${uid}`, JSON.stringify(Array.from(likedSet)));
    localStorage.setItem(CACHE_KEYS.likedCommunityPostIds, JSON.stringify(Array.from(likedSet)));
  } catch {
    // ignore
  }

  // Update local post likes registry (`community_posts/{postId}/likes/{userId}`)
  const registry = readLocalPostLikesRegistry();
  const postLikes = Array.isArray(registry[postId]) ? [...registry[postId]] : [];
  const filteredLikes = postLikes.filter((l) => l.userId !== uid);
  if (!alreadyLiked) {
    filteredLikes.push({
      id: uid,
      postId,
      userId: uid,
      userName,
      userEmail,
      createdAt: nowIso,
    });
  }
  registry[postId] = filteredLikes;
  writeLocalPostLikesRegistry(registry);

  // Optimistic update on cached posts
  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  let updatedLikesCount = 0;
  let updatedLikedByUids: string[] = [];

  const next = cached.map((p) => {
    if (p.id !== postId) return p;
    const uidSet = new Set(Array.isArray(p.likedByUids) ? p.likedByUids : []);
    if (alreadyLiked) {
      uidSet.delete(uid);
    } else {
      uidSet.add(uid);
    }
    updatedLikedByUids = Array.from(uidSet);
    updatedLikesCount = Math.max(0, updatedLikedByUids.length);
    return {
      ...p,
      likedByUids: updatedLikedByUids,
      likesCount: updatedLikesCount,
    };
  });
  writeLocalCache(CACHE_KEYS.communityPosts, next);

  // Persist to Firestore: `community_posts/{postId}/likes/{userId}` + post counter
  if (auth.currentUser && auth.currentUser.uid === uid) {
    const likeDocRef = doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId, 'likes', uid);
    const postDocRef = doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId);
    try {
      if (alreadyLiked) {
        await withTimeout(deleteDoc(likeDocRef), 3000);
      } else {
        await withTimeout(
          setDoc(likeDocRef, {
            id: uid,
            postId,
            userId: uid,
            userName,
            userEmail,
            createdAt: nowIso,
            serverTimestamp: serverTimestamp(),
          }),
          3000
        );
      }
      await withTimeout(
        setDoc(
          postDocRef,
          {
            likesCount: updatedLikesCount,
            likedByUids: updatedLikedByUids,
            updatedAt: nowIso,
          },
          { merge: true }
        ),
        3000
      );
    } catch {
      // Keep local state if Firestore subcollection rule isn't deployed yet
    }
  }

  return { liked: !alreadyLiked, likesCount: updatedLikesCount };
}

export function getLikedCommunityPostIds(userId?: string): Set<string> {
  const uid = userId || auth.currentUser?.uid || '';
  try {
    if (uid) {
      const userRaw = localStorage.getItem(`${CACHE_KEYS.likedCommunityPostIds}_${uid}`);
      if (userRaw) {
        return new Set(JSON.parse(userRaw));
      }
    }
    const raw = localStorage.getItem(CACHE_KEYS.likedCommunityPostIds);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

// ============================================================================
// PART 4 & PART 5: ADMIN COMMUNITY CONTROL CENTER FUNCTIONS
// ============================================================================

export async function fetchPostLikesForAdmin(postId: string): Promise<StoredPostLikeEntry[]> {
  const registry = readLocalPostLikesRegistry();
  const map = new Map<string, StoredPostLikeEntry>();
  for (const item of registry[postId] || []) {
    if (item?.userId) map.set(item.userId, item);
  }

  // Also check the post's likedByUids if any UIDs are present
  const cachedPosts = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  const post = cachedPosts.find((p) => p.id === postId);
  if (post && Array.isArray(post.likedByUids)) {
    for (const uid of post.likedByUids) {
      if (!map.has(uid)) {
        map.set(uid, {
          id: uid,
          postId,
          userId: uid,
          userName: 'Authenticated User',
          userEmail: '',
          createdAt: post.updatedAt || post.createdAt,
        });
      }
    }
  }

  try {
    const snap = await withTimeout(
      getDocs(collection(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId, 'likes')),
      3500
    );
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      const uid = data.userId || d.id;
      map.set(uid, {
        id: uid,
        postId,
        userId: uid,
        userName: data.userName || 'Authenticated Member',
        userEmail: data.userEmail || '',
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });
  } catch {
    // fallback to local registry
  }

  return Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function adminRemoveFraudulentLikeDoc(params: {
  postId: string;
  postTitle: string;
  userId: string;
  reason: string;
  adminActor: { uid: string; name: string; email: string };
}): Promise<void> {
  const { postId, postTitle, userId, reason, adminActor } = params;
  if (!reason.trim()) {
    throw new Error('A moderation reason is required to remove a fraudulent or abusive Like.');
  }

  const nowIso = new Date().toISOString();

  // Remove from local likes registry
  const registry = readLocalPostLikesRegistry();
  if (Array.isArray(registry[postId])) {
    registry[postId] = registry[postId].filter((l) => l.userId !== userId);
    writeLocalPostLikesRegistry(registry);
  }

  // Remove from user's local set if same browser
  try {
    const userSet = getLikedCommunityPostIds(userId);
    userSet.delete(postId);
    localStorage.setItem(`${CACHE_KEYS.likedCommunityPostIds}_${userId}`, JSON.stringify(Array.from(userSet)));
  } catch {
    // ignore
  }

  // Update post likesCount & likedByUids
  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  let updatedLikesCount = 0;
  let updatedUids: string[] = [];

  const next = cached.map((p) => {
    if (p.id !== postId) return p;
    const uids = (p.likedByUids || []).filter((id) => id !== userId);
    updatedUids = uids;
    updatedLikesCount = Math.max(0, uids.length);
    return {
      ...p,
      likedByUids: updatedUids,
      likesCount: updatedLikesCount,
      updatedAt: nowIso,
    };
  });
  writeLocalCache(CACHE_KEYS.communityPosts, next);

  try {
    await withTimeout(
      deleteDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId, 'likes', userId)),
      3000
    );
    await withTimeout(
      setDoc(
        doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId),
        {
          likesCount: updatedLikesCount,
          likedByUids: updatedUids,
          updatedAt: nowIso,
        },
        { merge: true }
      ),
      3000
    );
  } catch {
    // non-blocking
  }

  await createAuditLogDoc({
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'DELETE',
    targetEntity: 'CommunityLike',
    targetId: `${postId}_${userId}`,
    targetName: `Like by UID ${userId} on "${postTitle}"`,
    details: `Removed Like from user ${userId} on post "${postTitle}" (${postId}). Reason: ${reason.trim()}`,
  });
}

export async function adminUpdateCommunityPostModerationDoc(params: {
  postId: string;
  updates: {
    pinned?: boolean;
    featured?: boolean;
    commentsLocked?: boolean;
    status?: 'published' | 'hidden' | 'flagged' | 'archived';
    title?: string;
    content?: string;
    moderationReason?: string;
  };
  adminActor: { uid: string; name: string; email: string };
}): Promise<void> {
  const { postId, updates, adminActor } = params;
  const nowIso = new Date().toISOString();
  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  let postTitle = postId;

  const next = cached.map((p) => {
    if (p.id !== postId) return p;
    postTitle = p.title;
    return {
      ...p,
      ...updates,
      updatedAt: nowIso,
    };
  });
  writeLocalCache(CACHE_KEYS.communityPosts, next);

  try {
    await withTimeout(
      setDoc(
        doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId),
        {
          ...updates,
          updatedAt: nowIso,
        },
        { merge: true }
      ),
      3000
    );
  } catch {
    // non-blocking
  }

  await createAuditLogDoc({
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: updates.status === 'hidden' ? 'UNPUBLISH' : updates.status === 'published' ? 'PUBLISH' : 'EDIT',
    targetEntity: 'CommunityPost',
    targetId: postId,
    targetName: postTitle,
    details: `Moderated community post "${postTitle}": ${JSON.stringify(updates)}`,
  });
}

export async function adminModerateCommunityReplyDoc(params: {
  postId: string;
  replyId: string;
  action: 'hide' | 'restore' | 'delete';
  reason: string;
  adminActor: { uid: string; name: string; email: string };
}): Promise<void> {
  const { postId, replyId, action, reason, adminActor } = params;
  const nowIso = new Date().toISOString();
  const cached = readLocalCache<EssentialCommunityPost>(CACHE_KEYS.communityPosts) || [];
  let updatedReplies: EssentialCommunityReply[] = [];
  let activeCount = 0;

  const next = cached.map((p) => {
    if (p.id !== postId) return p;
    if (action === 'delete') {
      updatedReplies = (p.replies || []).filter((r) => r.id !== replyId);
    } else {
      updatedReplies = (p.replies || []).map((r) =>
        r.id === replyId
          ? {
              ...r,
              status: action === 'hide' ? 'hidden' : 'published',
              moderationReason: reason,
              updatedAt: nowIso,
            }
          : r
      );
    }
    activeCount = updatedReplies.filter((r) => r.status !== 'deleted' && r.status !== 'hidden').length;
    return {
      ...p,
      replies: updatedReplies,
      repliesCount: activeCount,
      updatedAt: nowIso,
    };
  });
  writeLocalCache(CACHE_KEYS.communityPosts, next);

  try {
    if (action === 'delete') {
      await withTimeout(
        deleteDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId, 'comments', replyId)),
        2500
      );
    } else {
      await withTimeout(
        setDoc(
          doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId, 'comments', replyId),
          {
            status: action === 'hide' ? 'hidden' : 'published',
            moderationReason: reason,
            updatedAt: nowIso,
          },
          { merge: true }
        ),
        2500
      );
    }
    await withTimeout(
      setDoc(
        doc(db, ESSENTIAL_HUB_COLLECTIONS.communityPosts, postId),
        {
          replies: updatedReplies,
          repliesCount: activeCount,
          updatedAt: nowIso,
        },
        { merge: true }
      ),
      2500
    );
  } catch {
    // non-blocking
  }

  await createAuditLogDoc({
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: action === 'delete' ? 'DELETE' : 'EDIT',
    targetEntity: 'CommunityComment',
    targetId: replyId,
    targetName: `Comment ${replyId} on Post ${postId}`,
    details: `Admin performed "${action}" on comment ${replyId}. Reason: ${reason || 'Moderation policy'}`,
  });
}

export async function fetchCommunityUserRestrictions(): Promise<
  import('../types').CommunityUserRestrictionRecord[]
> {
  const local = readLocalCache<import('../types').CommunityUserRestrictionRecord>(
    LOCAL_COMMUNITY_USER_RESTRICTIONS_KEY
  ) || [];
  const map = new Map<string, import('../types').CommunityUserRestrictionRecord>();
  for (const r of local) {
    if (r?.userId) map.set(r.userId, r);
  }

  try {
    const snap = await withTimeout(getDocs(collection(db, 'community_user_restrictions')), 3000);
    snap.docs.forEach((d) => {
      const data = d.data() as import('../types').CommunityUserRestrictionRecord;
      const uid = data.userId || d.id;
      map.set(uid, { ...data, userId: uid });
    });
  } catch {
    // fallback
  }

  const list = Array.from(map.values());
  writeLocalCache(LOCAL_COMMUNITY_USER_RESTRICTIONS_KEY, list);
  return list;
}

export async function saveCommunityUserRestrictionDoc(params: {
  restriction: Omit<import('../types').CommunityUserRestrictionRecord, 'updatedAt' | 'updatedBy' | 'updatedByName'>;
  adminActor: { uid: string; name: string; email: string };
}): Promise<import('../types').CommunityUserRestrictionRecord> {
  const nowIso = new Date().toISOString();
  const fullRecord: import('../types').CommunityUserRestrictionRecord = {
    ...params.restriction,
    updatedAt: nowIso,
    updatedBy: params.adminActor.uid,
    updatedByName: params.adminActor.name || params.adminActor.email,
  };

  const current = await fetchCommunityUserRestrictions();
  const next = current.some((r) => r.userId === fullRecord.userId)
    ? current.map((r) => (r.userId === fullRecord.userId ? fullRecord : r))
    : [fullRecord, ...current];
  writeLocalCache(LOCAL_COMMUNITY_USER_RESTRICTIONS_KEY, next);

  try {
    await withTimeout(
      setDoc(doc(db, 'community_user_restrictions', fullRecord.userId), fullRecord, { merge: true }),
      3000
    );
  } catch {
    // non-blocking
  }

  await createAuditLogDoc({
    timestamp: nowIso,
    adminId: params.adminActor.uid,
    adminName: params.adminActor.name,
    adminEmail: params.adminActor.email,
    actionType: fullRecord.restrictionStatus === 'active' ? 'APPROVE' : 'SUSPEND',
    targetEntity: 'CommunityUserRestriction',
    targetId: fullRecord.userId,
    targetName: fullRecord.userName || fullRecord.userEmail || fullRecord.userId,
    details: `Updated community privileges for ${fullRecord.userName} (${fullRecord.userId}): status=${fullRecord.restrictionStatus}, canPost=${fullRecord.canPost}, canComment=${fullRecord.canComment}. Reason: ${fullRecord.reason}`,
  });

  return fullRecord;
}

// ============================================================================
// MODULE 5: EVERYKR SECOND-HAND MARKETPLACE SERVICE
// ============================================================================

const SEED_MARKETPLACE_LISTINGS: EssentialMarketplaceListing[] = [
  {
    id: 'mkt-seed-1',
    title: 'Samsung 27-inch QHD IPS Monitor (S27A600) + HDMI Cable',
    category: 'Electronics',
    priceKRW: 135000,
    condition: 'Like New',
    city: 'Seoul',
    neighborhood: 'Dongdaemun-gu (Hoegi / Kyung Hee Univ. Area)',
    location: 'Hoegi Station Exit 1 (Line 1 / Gyeongui-Jungang)',
    meetupStationOrLandmark: 'Hoegi Station Exit 1',
    latitude: 37.5898,
    longitude: 127.058,
    description:
      'Used for 2 semesters in my dorm room. Zero dead pixels, height-adjustable stand, includes original power cable and HDMI cable. Graduating next month so selling before flight. In-person cash/bank transfer at Hoegi Station Exit 1.',
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80'
    ],
    sellerId: 'seller_seed_1',
    sellerName: 'Rafiqul I.',
    sellerUniversity: 'Kyung Hee University',
    sellerContact: 'Safe In-App Inquiry / Hoegi Station Meetup',
    contactMethod: 'Safe In-App Inquiry',
    status: 'Available',
    postedDate: '2026-03-19',
    createdAt: '2026-03-19T12:00:00.000Z',
    verified: true
  },
  {
    id: 'mkt-seed-2',
    title: 'Cuckoo 6-Cup Electric Pressure Rice Cooker (CRP-P0610FD)',
    category: 'Kitchen Items',
    priceKRW: 65000,
    condition: 'Good Condition',
    city: 'Seoul',
    neighborhood: 'Seodaemun-gu (Sinchon / Yonsei Univ. Area)',
    location: 'Sinchon Station Exit 3 (Subway Line 2)',
    meetupStationOrLandmark: 'Sinchon Station Exit 3',
    latitude: 37.5559,
    longitude: 126.9368,
    description:
      'Authentic Korean Cuckoo pressure rice cooker (220V Korean plug). Works great for rice, biryani, steamed vegetables, and porridge. Thoroughly cleaned inner pot.',
    images: [
      'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80'
    ],
    sellerId: 'seller_seed_2',
    sellerName: 'Sadia M.',
    sellerUniversity: 'Yonsei University',
    sellerContact: 'Safe In-App Inquiry / Sinchon Meetup',
    contactMethod: 'Safe In-App Inquiry',
    status: 'Available',
    postedDate: '2026-03-18',
    createdAt: '2026-03-18T15:30:00.000Z',
    verified: true
  },
  {
    id: 'mkt-seed-3',
    title: 'Complete Sogang Korean 2A–4B Textbooks + TOPIK II Writing Master Guide',
    category: 'Study Materials',
    priceKRW: 35000,
    condition: 'Good Condition',
    city: 'Busan',
    neighborhood: 'Geumjeong-gu (PNU Front Gate)',
    location: 'Pusan National University Station Exit 3',
    meetupStationOrLandmark: 'Pusan National University Station Exit 3',
    latitude: 35.2296,
    longitude: 129.0893,
    description:
      'Bundle of 6 Sogang Korean Student Books + Workbooks and the official Yonsei TOPIK II Writing guide. Very clean pages with light pencil notes.',
    images: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80'
    ],
    sellerId: 'seller_seed_3',
    sellerName: 'Bikash G.',
    sellerUniversity: 'Pusan National University',
    sellerContact: 'Safe In-App Inquiry / PNU Main Gate',
    contactMethod: 'Safe In-App Inquiry',
    status: 'Available',
    postedDate: '2026-03-17',
    createdAt: '2026-03-17T09:15:00.000Z',
    verified: true
  },
  {
    id: 'mkt-seed-4',
    title: 'Alton 21-Speed Hybrid Campus Commuter Bicycle + U-Lock & Helmet',
    category: 'Bicycles',
    priceKRW: 90000,
    condition: 'Good Condition',
    city: 'Daejeon',
    neighborhood: 'Yuseong-gu (KAIST / Chungnam National Univ. Area)',
    location: 'Yuseong Spa Station Exit 7',
    meetupStationOrLandmark: 'Yuseong Spa Station Exit 7',
    latitude: 36.3538,
    longitude: 127.3415,
    description:
      'Smooth gear shifting, newly replaced brake pads, front LED light, rear rack, and heavy-duty combination U-lock. Ideal for riding around Yuseong-gu campuses.',
    images: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80'
    ],
    sellerId: 'seller_seed_4',
    sellerName: 'Arif K.',
    sellerUniversity: 'KAIST',
    sellerContact: 'Safe In-App Inquiry / Yuseong Spa Station',
    contactMethod: 'Safe In-App Inquiry',
    status: 'Available',
    postedDate: '2026-03-16',
    createdAt: '2026-03-16T17:45:00.000Z',
    verified: true
  },
  {
    id: 'mkt-seed-5',
    title: 'IKEA Study Desk + Ergonomic Mesh Chair Set (Self Pick-up)',
    category: 'Furniture',
    priceKRW: 45000,
    condition: 'Good Condition',
    city: 'Suwon',
    neighborhood: 'Jangan-gu (SKKU Natural Sciences Campus)',
    location: 'Sungkyunkwan Univ. Station Exit 2',
    meetupStationOrLandmark: 'Sungkyunkwan Univ. Station Exit 2',
    latitude: 37.3003,
    longitude: 126.9707,
    description:
      'Sturdy 120cm x 60cm white study desk and breathable mesh swivel chair. Legs unscrew easily for transport in a taxi.',
    images: [
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80'
    ],
    sellerId: 'seller_seed_5',
    sellerName: 'Imran S.',
    sellerUniversity: 'Sungkyunkwan University',
    sellerContact: 'Safe In-App Inquiry / SKKU Station',
    contactMethod: 'Safe In-App Inquiry',
    status: 'Reserved',
    postedDate: '2026-03-15',
    createdAt: '2026-03-15T11:20:00.000Z',
    verified: true
  }
];

export async function fetchEssentialMarketplaceListings(): Promise<EssentialMarketplaceListing[]> {
  const deletedIds = getDeletedIdsForCollection(ESSENTIAL_HUB_COLLECTIONS.marketplaceListings);
  const map = new Map<string, EssentialMarketplaceListing>();

  for (const seed of SEED_MARKETPLACE_LISTINGS) {
    if (!deletedIds.has(seed.id)) {
      map.set(seed.id, seed);
    }
  }

  const cached = readLocalCache<EssentialMarketplaceListing>(CACHE_KEYS.marketplaceListings);
  if (cached) {
    for (const item of cached) {
      if (item?.id && !deletedIds.has(item.id)) {
        map.set(item.id, item);
      }
    }
  }

  try {
    const snap = await withTimeout(
      getDocs(collection(db, ESSENTIAL_HUB_COLLECTIONS.marketplaceListings)),
      3500
    );
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data?._deleted === true || deletedIds.has(d.id)) {
        map.delete(d.id);
        return;
      }
      const existing = map.get(d.id);
      map.set(d.id, {
        id: d.id,
        title: data.title || existing?.title || 'Student Item',
        category: data.category || existing?.category || 'Other Student Essentials',
        priceKRW: typeof data.priceKRW === 'number' ? data.priceKRW : existing?.priceKRW || 0,
        condition: data.condition || existing?.condition || 'Good Condition',
        city: data.city || existing?.city || 'Seoul',
        neighborhood: data.neighborhood || existing?.neighborhood || data.location || 'Campus Area',
        location: data.location || existing?.location || data.city || 'Seoul',
        meetupStationOrLandmark:
          data.meetupStationOrLandmark || existing?.meetupStationOrLandmark || data.location || '',
        latitude: typeof data.latitude === 'number' ? data.latitude : existing?.latitude ?? null,
        longitude: typeof data.longitude === 'number' ? data.longitude : existing?.longitude ?? null,
        description: data.description || existing?.description || '',
        images:
          Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : existing?.images || [],
        sellerId: data.sellerId || existing?.sellerId || 'student',
        sellerName: data.sellerName || existing?.sellerName || 'Verified Student',
        sellerUniversity: data.sellerUniversity || existing?.sellerUniversity || '',
        sellerContact: data.sellerContact || existing?.sellerContact || 'Safe In-App Inquiry',
        contactMethod: data.contactMethod || existing?.contactMethod || 'Safe In-App Inquiry',
        status: data.status || existing?.status || 'Available',
        postedDate: data.postedDate || existing?.postedDate || new Date().toISOString().slice(0, 10),
        createdAt: data.createdAt || existing?.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || existing?.updatedAt,
        verified: data.verified !== false
      });
    });
  } catch {
    // Offline fallback
  }

  const list = Array.from(map.values()).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  writeLocalCache(CACHE_KEYS.marketplaceListings, list);
  return list;
}

export async function createEssentialMarketplaceListing(params: {
  title: string;
  category: EssentialMarketplaceCategory;
  priceKRW: number;
  condition: EssentialMarketplaceCondition;
  city: string;
  neighborhood: string;
  meetupStationOrLandmark: string;
  description: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerUniversity?: string;
  sellerContact: string;
  contactMethod: EssentialMarketplaceListing['contactMethod'];
}): Promise<EssentialMarketplaceListing> {
  const safety = validateSafeStudentContent(params.description, params.title);
  if (!safety.valid) {
    throw new Error(safety.reason || 'Listing content failed safety check.');
  }
  if (params.priceKRW < 0 || params.priceKRW > 20000000) {
    throw new Error('Please enter a realistic KRW price between ₩0 and ₩20,000,000.');
  }

  const nowIso = new Date().toISOString();
  const id = `mkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const listing: EssentialMarketplaceListing = {
    id,
    title: params.title.trim(),
    category: params.category,
    priceKRW: Math.round(params.priceKRW),
    condition: params.condition,
    city: params.city.trim() || 'Seoul',
    neighborhood: params.neighborhood.trim() || 'University District',
    location: `${params.city.trim()} - ${params.neighborhood.trim()}`,
    meetupStationOrLandmark: params.meetupStationOrLandmark.trim() || `${params.city.trim()} Station`,
    latitude: 37.5665,
    longitude: 126.978,
    description: params.description.trim(),
    images:
      params.images.length > 0
        ? params.images
        : [
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80'
          ],
    sellerId: params.sellerId,
    sellerName: params.sellerName || 'Student Seller',
    sellerUniversity: params.sellerUniversity || '',
    sellerContact: params.sellerContact.trim() || 'Safe In-App Inquiry',
    contactMethod: params.contactMethod,
    status: 'Available',
    postedDate: nowIso.slice(0, 10),
    createdAt: nowIso,
    verified: true
  };

  const cached = readLocalCache<EssentialMarketplaceListing>(CACHE_KEYS.marketplaceListings) || [];
  writeLocalCache(CACHE_KEYS.marketplaceListings, [listing, ...cached]);

  try {
    if (auth.currentUser) {
      await withTimeout(
        setDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.marketplaceListings, id), {
          ...listing,
          sellerId: auth.currentUser.uid,
          serverTimestamp: serverTimestamp()
        }),
        3500
      );
    }
  } catch {
    // Non-blocking
  }

  return listing;
}

export async function updateEssentialMarketplaceListingStatus(
  listingId: string,
  status: EssentialMarketplaceStatus
): Promise<void> {
  const nowIso = new Date().toISOString();
  const cached = readLocalCache<EssentialMarketplaceListing>(CACHE_KEYS.marketplaceListings) || [];
  const next = cached.map((item) =>
    item.id === listingId ? { ...item, status, updatedAt: nowIso } : item
  );
  writeLocalCache(CACHE_KEYS.marketplaceListings, next);

  try {
    if (auth.currentUser) {
      await withTimeout(
        updateDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.marketplaceListings, listingId), {
          status,
          updatedAt: nowIso
        }),
        3000
      );
    }
  } catch {
    // Ignore
  }
}

export async function deleteEssentialMarketplaceListing(listingId: string): Promise<void> {
  markDeletedIdForCollection(ESSENTIAL_HUB_COLLECTIONS.marketplaceListings, listingId);
  const cached = readLocalCache<EssentialMarketplaceListing>(CACHE_KEYS.marketplaceListings) || [];
  writeLocalCache(
    CACHE_KEYS.marketplaceListings,
    cached.filter((i) => i.id !== listingId)
  );
  try {
    if (auth.currentUser) {
      await withTimeout(
        deleteDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.marketplaceListings, listingId)),
        3000
      );
    }
  } catch {
    // Ignore
  }
}

export function getSavedMarketplaceIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.savedMarketplaceIds);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function toggleSavedMarketplaceId(listingId: string): boolean {
  const set = getSavedMarketplaceIds();
  const isNowSaved = !set.has(listingId);
  if (isNowSaved) {
    set.add(listingId);
  } else {
    set.delete(listingId);
  }
  try {
    localStorage.setItem(CACHE_KEYS.savedMarketplaceIds, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
  return isNowSaved;
}

export function getBookmarkedNewsIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.bookmarkedNewsIds);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function toggleBookmarkedNewsId(newsId: string): boolean {
  const set = getBookmarkedNewsIds();
  const isNowBookmarked = !set.has(newsId);
  if (isNowBookmarked) {
    set.add(newsId);
  } else {
    set.delete(newsId);
  }
  try {
    localStorage.setItem(CACHE_KEYS.bookmarkedNewsIds, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
  return isNowBookmarked;
}

// ============================================================================
// SAFETY & MODERATION REPORTING (POSTS, COMMENTS, REPLIES, USERS, LISTINGS)
// ============================================================================

export async function submitEssentialHubSafetyReport(params: {
  targetType: 'post' | 'listing' | 'comment' | 'reply' | 'user';
  targetId: string;
  postId?: string;
  targetTitle: string;
  targetAuthorUid?: string;
  targetAuthorName?: string;
  reason: string;
  details?: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
}): Promise<void> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const payload = {
    id: reportId,
    reporterId: auth.currentUser?.uid || params.reporterId,
    reporterUid: auth.currentUser?.uid || params.reporterId,
    reporterName: params.reporterName || 'Student Member',
    reporterEmail: params.reporterEmail || auth.currentUser?.email || '',
    targetType: params.targetType,
    targetId: params.targetId,
    postId: params.postId || '',
    targetTitle: params.targetTitle,
    targetTitleOrSnippet: params.targetTitle,
    targetAuthorUid: params.targetAuthorUid || '',
    targetAuthorName: params.targetAuthorName || '',
    reasonCategory: params.reason as any,
    reason: params.details ? `${params.reason} — ${params.details}` : params.reason,
    details: params.details || params.reason,
    status: 'Pending' as const,
    createdAt: nowIso,
  };

  const existing = readLocalCache<any>(LOCAL_COMMUNITY_REPORTS_KEY) || [];
  writeLocalCache(LOCAL_COMMUNITY_REPORTS_KEY, [payload, ...existing]);

  try {
    if (auth.currentUser) {
      await withTimeout(
        setDoc(doc(db, ESSENTIAL_HUB_COLLECTIONS.reports, reportId), {
          ...payload,
          serverTimestamp: serverTimestamp(),
        }),
        3000
      );
    }
  } catch {
    // Non-blocking fallback
  }
}

export async function fetchCommunityModerationReports(): Promise<
  import('../types').CommunityModerationReportRecord[]
> {
  const local = readLocalCache<any>(LOCAL_COMMUNITY_REPORTS_KEY) || [];
  const map = new Map<string, import('../types').CommunityModerationReportRecord>();

  for (const r of local) {
    if (r?.id) {
      map.set(r.id, {
        id: r.id,
        targetType: r.targetType || 'post',
        targetId: r.targetId || '',
        postId: r.postId || '',
        targetTitleOrSnippet: r.targetTitleOrSnippet || r.targetTitle || 'Reported Item',
        targetAuthorUid: r.targetAuthorUid || '',
        targetAuthorName: r.targetAuthorName || '',
        reporterUid: r.reporterUid || r.reporterId || '',
        reporterName: r.reporterName || 'Community Member',
        reporterEmail: r.reporterEmail || '',
        reasonCategory: r.reasonCategory || 'Other',
        details: r.details || r.reason || '',
        status: r.status || 'Pending',
        moderationAction: r.moderationAction || '',
        moderationNotes: r.moderationNotes || r.resolutionNotes || '',
        reviewedBy: r.reviewedBy || '',
        reviewedAt: r.reviewedAt || '',
        createdAt: r.createdAt || new Date().toISOString(),
      });
    }
  }

  try {
    const snap = await withTimeout(getDocs(collection(db, ESSENTIAL_HUB_COLLECTIONS.reports)), 3500);
    snap.docs.forEach((d) => {
      const r = d.data() as any;
      const id = r.id || d.id;
      map.set(id, {
        id,
        targetType: r.targetType || 'post',
        targetId: r.targetId || '',
        postId: r.postId || '',
        targetTitleOrSnippet: r.targetTitleOrSnippet || r.targetTitle || 'Reported Item',
        targetAuthorUid: r.targetAuthorUid || '',
        targetAuthorName: r.targetAuthorName || '',
        reporterUid: r.reporterUid || r.reporterId || '',
        reporterName: r.reporterName || 'Community Member',
        reporterEmail: r.reporterEmail || '',
        reasonCategory: r.reasonCategory || 'Other',
        details: r.details || r.reason || '',
        status: r.status || 'Pending',
        moderationAction: r.moderationAction || '',
        moderationNotes: r.moderationNotes || r.resolutionNotes || '',
        reviewedBy: r.reviewedBy || '',
        reviewedAt: r.reviewedAt || '',
        createdAt: r.createdAt || new Date().toISOString(),
      });
    });
  } catch {
    // fallback
  }

  const list = Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  writeLocalCache(LOCAL_COMMUNITY_REPORTS_KEY, list);
  return list;
}

export async function resolveCommunityModerationReportDoc(params: {
  reportId: string;
  status: 'Reviewed' | 'Action Taken' | 'Dismissed';
  moderationAction: string;
  moderationNotes: string;
  adminActor: { uid: string; name: string; email: string };
}): Promise<void> {
  const { reportId, status, moderationAction, moderationNotes, adminActor } = params;
  const nowIso = new Date().toISOString();
  const current = await fetchCommunityModerationReports();
  let targetTitle = reportId;

  const next = current.map((r) => {
    if (r.id !== reportId) return r;
    targetTitle = r.targetTitleOrSnippet;
    return {
      ...r,
      status,
      moderationAction,
      moderationNotes,
      reviewedBy: adminActor.email || adminActor.name,
      reviewedAt: nowIso,
    };
  });
  writeLocalCache(LOCAL_COMMUNITY_REPORTS_KEY, next);

  try {
    await withTimeout(
      setDoc(
        doc(db, ESSENTIAL_HUB_COLLECTIONS.reports, reportId),
        {
          status,
          moderationAction,
          moderationNotes,
          resolutionNotes: moderationNotes,
          reviewedBy: adminActor.email || adminActor.name,
          reviewedAt: nowIso,
        },
        { merge: true }
      ),
      3000
    );
  } catch {
    // non-blocking
  }

  await createAuditLogDoc({
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: status === 'Dismissed' ? 'REJECT' : 'APPROVE',
    targetEntity: 'Report',
    targetId: reportId,
    targetName: targetTitle,
    details: `Resolved community report (${status}): Action="${moderationAction}", Notes="${moderationNotes}"`,
  });
}

