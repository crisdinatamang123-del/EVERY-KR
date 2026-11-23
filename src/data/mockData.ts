import {
  University,
  JobListing,
  AccommodationListing,
  VisaCategory,
  CommunityPost,
  MarketplaceItem,
  GuideArticle,
  CityGuide,
  LanguageCode
} from '../types';

import { APPROVED_25_UNIVERSITIES } from './universities25';
import seoulCityImg from '../assets/images/seoul_city_life_1794049413999.jpg';
import busanCityImg from '../assets/images/korea_city_busan_1794592823505.jpg';
import incheonCityImg from '../assets/images/korea_city_incheon_1794592825480.jpg';
import daeguCityImg from '../assets/images/korea_city_daegu_1794592825416.jpg';
import studentsCampusImg from '../assets/images/hero_korea_students_1794049411032.jpg';

export const UNIVERSITIES: University[] = APPROVED_25_UNIVERSITIES;

export const VISA_CATEGORIES: VisaCategory[] = [
  {
    code: 'D-2',
    title: 'D-2 Student Visa (Degree Seeking)',
    targetAudience: 'International students enrolled in Regular Bachelor, Master, PhD or Exchange programs at accredited Korean universities.',
    stayDuration: 'Up to 2 years per issuance (extendable until graduation + thesis term)',
    workPermissionSummary: 'Part-time work permitted (시간제취업) up to 20 hrs/week (Bachelor) or 30 hrs/week (Master/PhD) during semester with TOPIK 3/4+ and prior approval from university international office and local Immigration Office.',
    officialFeeKRW: 60000,
    documents: [
      { id: 'd2-coa', name: 'Certificate of Admission (표준입학허가서)', description: 'Issued by the host university after admission tuition deposit is confirmed.', requiredFor: 'All Applicants' },
      { id: 'd2-fin', name: 'Bank Balance Certificate (재정입증서류)', description: 'Proof of at least $16,000–$20,000 USD (higher for Seoul metropolitan area universities) in student or parent bank account.', requiredFor: 'All Applicants' },
      { id: 'd2-deg', name: 'Apostilled / Consular Verified Diploma & Transcript', description: 'Original graduation certificate authenticated via Apostille or Korean Consular legalization.', requiredFor: 'All Applicants' },
      { id: 'd2-tb', name: 'Tuberculosis (TB) Test Certificate', description: 'Mandatory medical chest X-ray screening from a designated public health clinic or Korean hospital.', requiredFor: 'Specific Nationalities' },
      { id: 'd2-res', name: 'Proof of Residency in Korea (체류지입증서류)', description: 'Dormitory confirmation letter, lease contract (임대차계약서), or accommodation confirmation form.', requiredFor: 'All Applicants' },
      { id: 'd2-topik', name: 'TOPIK or English Proficiency Score Report', description: 'Official score report (TOPIK, TOEFL, or IELTS) submitted during initial application.', requiredFor: 'All Applicants' },
    ],
    arcSteps: [
      'Enter South Korea with your single-entry D-2 visa sticker/confirmation document.',
      'Book an appointment at your assigned local Immigration Office via HiKorea.go.kr (hikorea.go.kr) within 90 days of arrival.',
      'Prepare form, passport photo (3.5x4.5cm white background), Certificate of Enrollment (재학증명서), lease contract, and 30,000 KRW application fee.',
      'Attend biometric fingerprinting appointment at immigration office.',
      'Pick up your physical Alien Registration Card (ARC / 외국인등록증) in 3-4 weeks or request registered mail delivery.'
    ],
    officialSourceUrl: 'https://www.hikorea.go.kr'
  },
  {
    code: 'D-4',
    title: 'D-4 General Trainee Visa (Language Students)',
    targetAudience: 'Students studying Korean language at university-affiliated Korean Language Institutes (어학당) for 2 or more quarters (6+ months).',
    stayDuration: '6 months initial (extendable up to 2 years maximum)',
    workPermissionSummary: 'Strict rule: Part-time work is PROHIBITED during the first 6 months of stay in Korea. After 6 continuous months, students with TOPIK 2+ and 90%+ attendance can apply for part-time work permit up to 20 hrs/week.',
    officialFeeKRW: 60000,
    documents: [
      { id: 'd4-coa', name: 'Standard Admission Letter from University KLI', description: 'Provided by language institute upon tuition payment for minimum 2 consecutive terms.', requiredFor: 'All Applicants' },
      { id: 'd4-fin', name: 'Proof of Financial Capacity ($10,000+ USD)', description: 'Bank balance statement showing minimum $10,000 USD under applicant’s name maintained for 30+ days.', requiredFor: 'All Applicants' },
      { id: 'd4-hs', name: 'Apostilled High School Diploma', description: 'Final school completion certificate with legal apostille/consular seal.', requiredFor: 'All Applicants' },
      { id: 'd4-plan', name: 'Study Plan & Personal Statement (학업계획서)', description: 'Concise 1-page description explaining Korean learning objectives.', requiredFor: 'All Applicants' },
    ],
    arcSteps: [
      'Enter Korea on D-4 visa.',
      'Attend language orientation where the university often coordinates group ARC registration.',
      'Submit TB test certificate and address verification.',
      'Receive ARC before 90-day tourist grace threshold expires.'
    ],
    officialSourceUrl: 'https://www.hikorea.go.kr'
  },
  {
    code: 'D-10',
    title: 'D-10 Job Seeking Visa (Post-Graduation)',
    targetAudience: 'Graduates from Korean universities (Associate, Bachelor, Master, PhD) seeking employment at Korean companies under E-7 eligible occupations.',
    stayDuration: '6 months initial (renewable up to 2 years depending on points total)',
    workPermissionSummary: 'Internship permitted up to 6 months per company if reported to immigration beforehand. Unreported freelance or illegal part-time labor strictly penalized.',
    officialFeeKRW: 130000,
    documents: [
      { id: 'd10-pts', name: 'D-10 Points System Table (점수표)', description: 'Must score at least 60 total points out of 190 (with at least 20 points from basic criteria like degree & age).', requiredFor: 'All Applicants' },
      { id: 'd10-plan', name: 'Job Seeking Activity Plan (구직활동계획서)', description: 'Detailed month-by-month itinerary of intended job applications, interviews, and networking events.', requiredFor: 'All Applicants' },
      { id: 'd10-deg', name: 'Korean University Degree Certificate (졸업증명서)', description: 'Official graduation diploma from accredited Korean higher education institution.', requiredFor: 'All Applicants' },
      { id: 'd10-fin', name: 'Living Expenses Proof (approx. 4.8M KRW)', description: 'Proof of basic living expense funds for 6-month period.', requiredFor: 'All Applicants' },
    ],
    arcSteps: [
      'Schedule status change appointment at local Immigration Office before D-2 visa expiry.',
      'Submit graduation certificate, job search plan, and points matrix.',
      'ARC will be updated with D-10 qualification.'
    ],
    officialSourceUrl: 'https://www.hikorea.go.kr'
  },
  {
    code: 'E-7',
    title: 'E-7 Foreign National of Special Ability (Full-Time Work)',
    targetAudience: 'Skilled professionals employed by Korean corporations in 87 designated occupational codes (IT, Engineering, Marketing, Trade, Teaching, Translation).',
    stayDuration: '1 to 3 years per contract renewal',
    workPermissionSummary: 'Full-time employment strictly limited to the sponsoring employer and specified job category code. Changing employer requires prior immigration authorization.',
    officialFeeKRW: 130000,
    documents: [
      { id: 'e7-cont', name: 'Employment Contract (표준근로계약서)', description: 'Must meet national minimum wage or GNI percentage threshold (varies by category code).', requiredFor: 'All Applicants' },
      { id: 'e7-rec', name: 'Company Letter of Recommendation & Reason for Hire (고용사유서)', description: 'Detailed justification explaining why a foreign specialist is necessary over domestic candidates.', requiredFor: 'All Applicants' },
      { id: 'e7-tax', name: 'Company Tax Clearance & Business Registration Certificate', description: 'Proof that corporate sponsor employs required minimum ratio of Korean nationals (usually 5:1).', requiredFor: 'All Applicants' },
    ],
    arcSteps: [
      'Company prepares corporate sponsorship dossier and files with Ministry of Justice.',
      'Candidate undergoes immigration screening and receives visa change approval.',
      'ARC is re-issued reflecting employer name and E-7 professional status.'
    ],
    officialSourceUrl: 'https://www.hikorea.go.kr'
  },
  {
    code: 'F-2-7',
    title: 'F-2-7 Points-Based Resident Visa',
    targetAudience: 'High-achieving foreign residents, especially Korean university graduates with strong Korean fluency (TOPIK 5+) and competitive income.',
    stayDuration: '1 to 5 years (freedom of employment across almost any industry)',
    workPermissionSummary: 'Complete employment freedom without requiring corporate visa sponsorship or employer consent to change jobs.',
    officialFeeKRW: 130000,
    documents: [
      { id: 'f2-eval', name: 'F-2-7 Points Evaluation Sheet (80+ points required)', description: 'Points awarded for Age, Education, Korean proficiency (KIIP / TOPIK), and Annual Income.', requiredFor: 'All Applicants' },
      { id: 'f2-kiip', name: 'KIIP (Korea Immigration & Integration Program) Stage 5 Certificate', description: 'Completion certificate of Ministry of Justice Social Integration Program (사회통합프로그램).', requiredFor: 'All Applicants' },
      { id: 'f2-inc', name: 'Income Tax Withholding Certificate (소득금액증명원)', description: 'Official National Tax Service tax certificate verifying prior year taxable income in Korea.', requiredFor: 'All Applicants' },
    ],
    arcSteps: [
      'Calculate points independently using certified rubric to ensure 80+ points.',
      'Book HiKorea appointment and present comprehensive evidence.',
      'Resident status granted for 1-5 years based on income bracket.'
    ],
    officialSourceUrl: 'https://www.hikorea.go.kr'
  }
];

export const visaGuidesData = VISA_CATEGORIES;

export const JOBS: JobListing[] = [
  {
    id: 'job-1',
    title: 'Global Community & Content Assistant',
    company: 'K-Connect Global Media',
    location: 'Seoul (Mapo-gu, near Hongik Univ)',
    city: 'Seoul',
    salaryKRW: '₩11,500 / hr',
    jobType: 'Part-time',
    category: 'Office & Admin',
    hoursPerWeek: 18,
    languageRequirements: 'English (Fluent), Korean (Intermediate / TOPIK 3+)',
    visaRequirements: 'D-2 or D-4 (with 6+ mo stay) with Part-Time Work Permission',
    deadline: '2026-12-15',
    postedDate: '2026-11-04',
    verified: false,
    isDemo: true,
    verificationNote: 'Sample / Demo Listing — Pending Real Employer Verification',
    description: 'Support international student social media channels, translate short announcements into English, and assist global student meetup logistics in Seoul.',
    responsibilities: [
      'Draft weekly newsletters for foreign residents in Korea',
      'Manage student community Q&A forums',
      'Assist with event setup during Saturday cultural workshops'
    ],
    employerEmail: 'careers@kconnect-media.kr'
  },
  {
    id: 'job-2',
    title: 'Frontend React Developer (Internship)',
    company: 'SeoulTech AI Labs',
    location: 'Pangyo Techno Valley / Remote Hybrid',
    city: 'Seoul',
    salaryKRW: '₩2,200,000 / month',
    jobType: 'Internship',
    category: 'IT & Tech',
    hoursPerWeek: 20,
    languageRequirements: 'English (Working proficiency), Korean (Basic conversational)',
    visaRequirements: 'D-2 (Final semester) or D-10 Job Seeking Visa',
    deadline: '2026-11-30',
    postedDate: '2026-11-01',
    verified: false,
    isDemo: true,
    verificationNote: 'Sample / Demo Listing — Pending Real Employer Verification',
    description: 'Build user-facing web dashboards using React, TypeScript, and Tailwind. Great opportunity for international CS students seeking practical software engineering experience in Korea.',
    responsibilities: [
      'Collaborate on client dashboard interfaces using modern React',
      'Implement responsive layouts and client-side data filtering',
      'Participate in weekly sprint reviews in English'
    ],
    employerEmail: 'dev-recruiting@seoultechlabs.io'
  },
  {
    id: 'job-3',
    title: 'English Conversational Tutor & Cafe Host',
    company: 'Study Lounge Sinchon',
    location: 'Seoul (Sinchon Station Exit 3)',
    city: 'Seoul',
    salaryKRW: '₩13,000 / hr',
    jobType: 'Part-time',
    category: 'Education & Tutoring',
    hoursPerWeek: 12,
    languageRequirements: 'English (Native or Near-Native)',
    visaRequirements: 'D-2 or F-series Visa (D-2 must register work permission)',
    deadline: '2026-12-20',
    postedDate: '2026-11-05',
    verified: false,
    isDemo: true,
    verificationNote: 'Sample / Demo Listing — Pending Real Employer Verification',
    description: 'Lead friendly small-group conversational English sessions for Korean university students preparing for exchange programs. Relaxed cafe setting.',
    responsibilities: [
      'Facilitate 1-hour group discussion topics on campus life, travel, and culture',
      'Provide gentle vocabulary tips and natural expressions',
      'Maintain an encouraging, welcoming atmosphere'
    ],
    employerEmail: 'manager@sinchonstudylounge.com'
  },
  {
    id: 'job-4',
    title: 'International Student Admissions Assistant',
    company: 'Yonsei Global Affairs Office',
    location: 'Yonsei University Sinchon Campus',
    city: 'Seoul',
    salaryKRW: '₩10,500 / hr (Statutory Campus Rate)',
    jobType: 'Campus Assistant',
    category: 'Office & Admin',
    hoursPerWeek: 15,
    languageRequirements: 'English + Korean (TOPIK 4+) or Bangla / Chinese / Nepali',
    visaRequirements: 'Enrolled D-2 Student at Yonsei University',
    deadline: '2026-12-05',
    postedDate: '2026-11-02',
    verified: false,
    isDemo: true,
    verificationNote: 'Sample / Demo Listing — Pending Real Employer Verification',
    description: 'Direct on-campus student work at the Office of International Affairs. Assist incoming foreign freshman with orientation, document verification, and campus tours.',
    responsibilities: [
      'Organize orientation folders and international student welcoming bags',
      'Answer applicant inquiry emails in mother tongue and English',
      'Assist staff during international registration week'
    ],
    employerEmail: 'oia-hiring@yonsei.ac.kr'
  },
  {
    id: 'job-5',
    title: 'English-Korean Product Document Translator',
    company: 'Han River Trading Co.',
    location: 'Busan (Centum City)',
    city: 'Busan',
    salaryKRW: '₩12,000 / hr',
    jobType: 'Part-time',
    category: 'Translation',
    hoursPerWeek: 16,
    languageRequirements: 'Korean (TOPIK 5+ or Advanced) + English (Fluent)',
    visaRequirements: 'D-2 or D-10 or F-series visa',
    deadline: '2026-12-10',
    postedDate: '2026-11-03',
    verified: false,
    isDemo: true,
    verificationNote: 'Sample / Demo Listing — Pending Real Employer Verification',
    description: 'Assist consumer goods export team with English product manuals, buyer email correspondence, and e-commerce listing descriptions.',
    responsibilities: [
      'Translate technical user manuals from Korean to English',
      'Proofread global buyer catalogs',
      'Draft correspondence with overseas distribution partners'
    ],
    employerEmail: 'export@hanrivertrading.co.kr'
  }
];

export const ACCOMMODATIONS: AccommodationListing[] = [
  {
    id: 'acc-1',
    propertyId: 'acc-1',
    title: 'Sinchon Station Student One-Room',
    city: 'Seoul',
    district: 'Seodaemun-gu, Sinchon-ro',
    address: 'Sinchon-ro, Seodaemun-gu, Seoul, South Korea',
    latitude: 37.5559,
    longitude: 126.9368,
    accommodationType: 'One-room',
    roomType: 'One-room',
    monthlyRent: 550000,
    monthlyRentKRW: 550000,
    securityDeposit: 5000000,
    depositKRW: 5000000,
    maintenanceFeeKRW: 70000,
    furnished: true,
    availableDate: 'Immediate',
    photos: [
      '/src/assets/images/korea_student_housing_1794049412879.jpg',
      '/src/assets/images/seoul_city_life_1794049413999.jpg'
    ],
    facilities: ['Air Conditioner', 'Washing Machine', 'Refrigerator', 'Induction Cooktop', 'Desk & Chair', 'High-Speed Wi-Fi', 'Digital Door Lock'],
    amenities: ['Air Conditioner', 'Washing Machine', 'Refrigerator', 'Induction Cooktop', 'Desk & Chair', 'High-Speed Wi-Fi', 'Digital Door Lock'],
    roomDetails: 'Private single studio (21㎡), 4th floor with elevator, private bathroom and kitchenette.',
    nearUniversities: ['Yonsei University', 'Sogang University', 'Ewha Womans University'],
    landlordType: 'Certified Agent',
    landlordPhone: '02-312-3810',
    contactEmail: 'housing@everykr.com',
    availability: 'Available',
    approvalStatus: 'Approved',
    createdBy: 'system-admin',
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-15T09:00:00.000Z',
    approvedBy: 'mzhmd924@gmail.com',
    approvedAt: '2026-10-15T10:00:00.000Z',
    verified: true,
    description: '4th-floor private one-room studio near Sinchon Station (Line 2) with elevator, private bathroom, induction kitchenette, and full student furnishings. Water and internet included in maintenance.'
  },
  {
    id: 'acc-2',
    propertyId: 'acc-2',
    title: 'Anam Campus Student Studio Officetel',
    city: 'Seoul',
    district: 'Seongbuk-gu, Anam-ro',
    address: 'Anam-ro, Seongbuk-gu, Seoul, South Korea',
    latitude: 37.5862,
    longitude: 127.0292,
    accommodationType: 'Studio',
    roomType: 'Studio',
    monthlyRent: 600000,
    monthlyRentKRW: 600000,
    securityDeposit: 5000000,
    depositKRW: 5000000,
    maintenanceFeeKRW: 80000,
    furnished: true,
    availableDate: 'Immediate',
    photos: [
      '/src/assets/images/korea_student_housing_1794049412879.jpg'
    ],
    facilities: ['24/7 Security Entry', 'Elevator', 'Air Conditioner', 'Microwave', 'Built-in Wardrobe', 'Washing Machine'],
    amenities: ['24/7 Security Entry', 'Elevator', 'Air Conditioner', 'Microwave', 'Built-in Wardrobe', 'Washing Machine'],
    roomDetails: 'Private studio officetel (24㎡), individual floor heating (Ondol), keypad lock.',
    nearUniversities: ['Korea University Anam Campus'],
    landlordType: 'Direct Owner',
    landlordPhone: '02-924-1029',
    contactEmail: 'housing@everykr.com',
    availability: 'Available',
    approvalStatus: 'Approved',
    createdBy: 'system-admin',
    createdAt: '2026-10-16T09:00:00.000Z',
    updatedAt: '2026-10-16T09:00:00.000Z',
    approvedBy: 'mzhmd924@gmail.com',
    approvedAt: '2026-10-16T10:00:00.000Z',
    verified: true,
    description: 'Modern student studio officetel within walking distance of Anam Station (Line 6). Features secure building access, parcel lockers, and full appliances.'
  },
  {
    id: 'acc-3',
    propertyId: 'acc-3',
    title: 'Busan Student Shared Room',
    city: 'Busan',
    district: 'Geumjeong-gu, Jangjeon-dong',
    address: 'Jangjeon-dong, Geumjeong-gu, Busan, South Korea',
    latitude: 35.2316,
    longitude: 129.0842,
    accommodationType: 'Shared Room',
    roomType: 'Shared Room',
    monthlyRent: 300000,
    monthlyRentKRW: 300000,
    securityDeposit: 500000,
    depositKRW: 500000,
    maintenanceFeeKRW: 0,
    furnished: true,
    availableDate: 'Immediate',
    photos: [
      '/src/assets/images/university_campus_seoul_1794049411388.jpg'
    ],
    facilities: ['Study Desk & Bed', 'Wi-Fi Included', 'Shared Kitchen', 'Laundry Room', 'Air Conditioning & Heating'],
    amenities: ['Study Desk & Bed', 'Wi-Fi Included', 'Shared Kitchen', 'Laundry Room', 'Air Conditioning & Heating'],
    roomDetails: '2-person student shared room with individual desks, wardrobes, and shared kitchen facilities.',
    nearUniversities: ['Pusan National University'],
    landlordType: 'University Dorm',
    landlordPhone: '051-510-1800',
    contactEmail: 'housing@everykr.com',
    availability: 'Available',
    approvalStatus: 'Approved',
    createdBy: 'system-admin',
    createdAt: '2026-10-18T09:00:00.000Z',
    updatedAt: '2026-10-18T09:00:00.000Z',
    approvedBy: 'mzhmd924@gmail.com',
    approvedAt: '2026-10-18T10:00:00.000Z',
    verified: true,
    description: 'Furnished student shared residence near Pusan National University station in Geumjeong-gu, Busan. Utilities and high-speed Wi-Fi included.'
  },
  {
    id: 'acc-4',
    propertyId: 'acc-4',
    title: 'Hongdae Single Goshiwon Room',
    city: 'Seoul',
    district: 'Mapo-gu, Wausan-ro',
    address: 'Wausan-ro, Mapo-gu, Seoul, South Korea',
    latitude: 37.5509,
    longitude: 126.9255,
    accommodationType: 'Goshiwon',
    roomType: 'Goshiwon',
    monthlyRent: 380000,
    monthlyRentKRW: 380000,
    securityDeposit: 100000,
    depositKRW: 100000,
    maintenanceFeeKRW: 0,
    furnished: true,
    availableDate: 'Immediate',
    photos: [
      '/src/assets/images/korea_student_housing_1794049412879.jpg'
    ],
    facilities: ['Private Shower & Toilet', 'Wi-Fi', 'Central AC & Heating', 'Shared Kitchen & Laundry', 'CCTV Security'],
    amenities: ['Private Shower & Toilet', 'Wi-Fi', 'Central AC & Heating', 'Shared Kitchen & Laundry', 'CCTV Security'],
    roomDetails: 'Single occupancy private goshiwon room with en-suite bathroom, desk, mini-fridge, and bed.',
    nearUniversities: ['Hongik University', 'Sogang University'],
    landlordType: 'Direct Owner',
    landlordPhone: '02-334-2451',
    contactEmail: 'housing@everykr.com',
    availability: 'Available',
    approvalStatus: 'Approved',
    createdBy: 'system-admin',
    createdAt: '2026-10-19T09:00:00.000Z',
    updatedAt: '2026-10-19T09:00:00.000Z',
    approvedBy: 'mzhmd924@gmail.com',
    approvedAt: '2026-10-19T10:00:00.000Z',
    verified: true,
    description: 'Clean single room in Mapo-gu with low deposit and all utilities (electricity, water, gas, Wi-Fi) included in monthly rent.'
  }
];

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    title: 'Step-by-step: How I got Part-Time Work Permission (시간제취업허가) approved at Sejongno Immigration',
    authorName: 'Farhan Rahman',
    authorRole: 'Master Student (Yonsei Univ)',
    authorNationality: 'Bangladesh',
    category: 'Visa & Immigration',
    city: 'Seoul',
    timestamp: '2 hours ago',
    content: 'A lot of new students ask about part-time job rules. Remember: NEVER start working before immigration stamp! You need: 1. Part-Time Work Form signed by both employer & your university international advisor, 2. TOPIK report (Level 4 gave me 25 hrs/week allowance), 3. Copy of employer business registration. I applied online via HiKorea e-application and it took exactly 4 business days to get the electronic approval certificate. Feel free to ask questions below!',
    repliesCount: 14,
    likesCount: 42,
    bookmarked: false,
    replies: [
      {
        id: 'rep-1',
        authorName: 'Sunita Sharma',
        timestamp: '1 hour ago',
        content: 'Thank you Farhan! Does the GPA have to be above 2.5? My advisor said university won’t sign if GPA dropped below 2.5 last term.',
        isVerifiedStudent: true
      },
      {
        id: 'rep-2',
        authorName: 'Farhan Rahman',
        timestamp: '45 mins ago',
        content: 'Yes Sunita! Korean immigration requires minimum 2.0 GPA or C grade from the previous semester, but Yonsei internal rule asks for 2.5. Definitely check with your advisor.',
        isVerifiedStudent: true
      }
    ]
  },
  {
    id: 'post-2',
    title: 'Which bank is friendliest to open an account before ARC arrives?',
    authorName: 'Elena Rostova',
    authorRole: 'D-4 Language Trainee',
    authorNationality: 'Uzbekistan',
    category: 'Daily Life',
    city: 'Seoul',
    timestamp: '5 hours ago',
    content: 'I arrived in Seoul 10 days ago and my ARC appointment is not until next month. I went to Hana Bank at Sinchon (near Yonsei) with my Passport, Certificate of Enrollment (재학증명서), and dorm contract, and they opened a temporary account with debit card and Hana EZ English app in 25 minutes! Highly recommend checking branches on university campuses.',
    repliesCount: 8,
    likesCount: 29,
    bookmarked: true
  },
  {
    id: 'post-3',
    title: 'Free Korean Language Meetup every Thursday evening near Hongik Univ Station',
    authorName: 'Kenji Sato',
    authorRole: 'Exchange Student',
    authorNationality: 'Japan',
    category: 'Korean Language',
    city: 'Seoul',
    timestamp: '1 day ago',
    content: 'Hi everyone! A group of international students from Sogang, Yonsei, and Hongik meet every Thursday at 7 PM for 1 hour of casual Korean conversation practice followed by kimbap or fried chicken. All levels welcome, from complete beginners to advanced.',
    repliesCount: 19,
    likesCount: 56,
    bookmarked: false
  }
];

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: 'mkt-1',
    title: 'MacBook Air M2 16GB RAM / 256GB SSD (Space Gray)',
    category: 'Laptops & Electronics',
    priceKRW: 980000,
    condition: 'Like New',
    location: 'Sinchon Station / Yonsei Main Gate',
    city: 'Seoul',
    sellerName: 'Minh Nguyen',
    sellerContact: 'KakaoTalk ID: minh_seoul99',
    postedDate: '2026-11-06',
    status: 'Available',
    images: ['/src/assets/images/korea_student_housing_1794049412879.jpg'],
    verified: false,
    isDemo: true,
    verificationNote: 'Sample / Demo Listing — Pending Real Student Seller Verification',
    description: 'Selling because I upgraded to MacBook Pro for my machine learning lab. Battery health is 96%, original box, 30W charger, and Korean/English keyboard layout. Face-to-face deal preferred around Sinchon or Hongdae.'
  },
  {
    id: 'mkt-2',
    title: 'Complete TOPIK II Prep Books + Korean Grammar in Use (Inter/Adv)',
    category: 'Books & Study Materials',
    priceKRW: 25000,
    condition: 'Good Condition',
    location: 'Anam Station (Line 6) / Korea Univ',
    city: 'Seoul',
    sellerName: 'Aarav Patel',
    sellerContact: 'KakaoTalk ID: aarav_ku',
    postedDate: '2026-11-05',
    status: 'Available',
    images: ['/src/assets/images/university_campus_seoul_1794049411388.jpg'],
    verified: false,
    isDemo: true,
    verificationNote: 'Sample / Demo Listing — Pending Real Student Seller Verification',
    description: 'Helped me pass TOPIK Level 5! Clean pages with pencil notes only on the first 3 chapters. Retails for 75,000 KRW combined at Kyobo Bookstore.'
  },
  {
    id: 'mkt-3',
    title: 'IKEA White Desk & Ergonomic Study Chair Set',
    category: 'Furniture',
    priceKRW: 40000,
    condition: 'Good Condition',
    location: 'Hyehwa Station / Sungkyunkwan Univ',
    city: 'Seoul',
    sellerName: 'Fatima Al-Mansoor',
    sellerContact: '010-3329-8812',
    postedDate: '2026-11-04',
    status: 'Available',
    images: ['/src/assets/images/korea_student_housing_1794049412879.jpg'],
    verified: false,
    isDemo: true,
    verificationNote: 'Sample / Demo Listing — Pending Real Student Seller Verification',
    description: 'Graduating this December and moving back. Sturdy Linnmon desk (120x60cm) + Millberget chair. Buyer must arrange pickup near SKKU main gate.'
  },
  {
    id: 'mkt-4',
    title: 'Xiaomi Mijia Electric Kettle + Multi-Plug Converter Set',
    category: 'Household Items',
    priceKRW: 15000,
    condition: 'Like New',
    location: 'Centum City / PNU Busan',
    city: 'Busan',
    sellerName: 'Kim So-yeon',
    sellerContact: 'KakaoTalk: busan_student_trade',
    postedDate: '2026-11-03',
    status: 'Available',
    images: ['/src/assets/images/korea_student_housing_1794049412879.jpg'],
    verified: false,
    isDemo: true,
    verificationNote: 'Sample / Demo Listing — Pending Real Student Seller Verification',
    description: 'Stainless steel interior, rapid boiling, used for only 2 months in dormitory. Comes with 2 universal plug adapters for Korean type F sockets.'
  }
];

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: 'guide-bank',
    title: 'How to Open a Bank Account in Korea as an International Student',
    category: 'Banking',
    readTimeMinutes: 5,
    summary: 'A step-by-step walkthrough on visiting Korean banks, documents required before and after ARC issuance, daily transfer limits, and mobile banking in English.',
    keySteps: [
      'Bring Passport, Certificate of Enrollment (재학증명서), and proof of residence (dorm cert or lease).',
      'Target foreign-student-friendly campus branches (Hana Bank, Shinhan Global, KB Kookmin, Woori).',
      'Request an online banking security OTP card or Mobile Certificate (모바일인증서).',
      'Note initial limit: Accounts opened before ARC issuance usually have a ₩300,000 to ₩1,000,000 daily ATM/transfer limit (한도제한계좌). Return with your ARC once received to lift limits.'
    ],
    officialWarning: 'Never rent out, lend, or sell your Korean bank account or debit card (통장/체크카드) to anyone. Voice phishing syndicates target students, which leads to immediate criminal prosecution and deportation.',
    lastUpdated: 'November 2026',
    officialSource: 'Financial Supervisory Service (FSS)',
    sourceUrl: 'https://www.fss.or.kr'
  },
  {
    id: 'guide-arc',
    title: 'How to Apply for Your Alien Registration Card (ARC / 외국인등록증)',
    category: 'Government',
    readTimeMinutes: 7,
    summary: 'Foreigners staying in Korea over 90 days must register within 90 days of arrival. Learn how to secure early HiKorea reservation appointments.',
    keySteps: [
      'Visit HiKorea.go.kr and select "Reservation of Visit (방문예약)". Immigration offices do not accept walk-ins.',
      'Check jurisdiction: Your designated branch depends strictly on your living address (e.g. Seodaemun/Mapo goes to Southern Immigration; Jongno/Gwanak goes to Sejongno).',
      'Bring Passport original, 1 passport color photo (3.5x4.5cm), School Certificate of Enrollment, Housing Proof, and ₩30,000 cash/card fee (₩34,000 if requesting postal delivery).',
      'Provide 10-finger biometric scans at the counter. ARC usually arrives in 3-4 weeks.'
    ],
    officialWarning: 'Failing to register within 90 days incurs fines starting at ₩200,000 up to several million won and creates a severe violation record on future visa renewals.',
    lastUpdated: 'November 2026',
    officialSource: 'Korea Immigration Service',
    sourceUrl: 'https://www.hikorea.go.kr'
  },
  {
    id: 'guide-sim',
    title: 'Korean SIM Card & eSIM Guide: Prepaid vs Postpaid',
    category: 'Mobile & SIM',
    readTimeMinutes: 4,
    summary: 'Everything about getting high-speed 5G mobile data immediately at Incheon Airport and upgrading to an identity-verified postpaid plan after getting your ARC.',
    keySteps: [
      'Stage 1 (Arrival): Pick up a 30-day or 90-day prepaid SIM/eSIM using your passport from telecom desks (KT, SKT, LGU+, or Chingu Mobile).',
      'Stage 2 (Post-ARC): Convert your phone line to your ARC number so you can pass Korean Mobile Identity Verification (본인인증), mandatory for online shopping, food delivery, and banking.',
      'Budget tip: Consider MVNO budget carriers (알뜰폰 e.g. Woori Mobile, Chingu, KT M-Mobile) which offer unlimited data plans from ₩15,000–₩25,000/month.'
    ],
    lastUpdated: 'November 2026',
    officialSource: 'Korea Communications Commission',
    sourceUrl: 'https://kcc.go.kr'
  },
  {
    id: 'guide-nhis',
    title: 'National Health Insurance (NHIS / 국민건강보험) for International Students',
    category: 'Healthcare',
    readTimeMinutes: 6,
    summary: 'NHIS enrollment is mandatory for all foreign students holding D-2 and D-4 visas. Learn how premium deductions work and how to access clinics.',
    keySteps: [
      'Automatic Enrollment: D-2 degree students are enrolled immediately on Alien Registration date. D-4 students are enrolled 6 months after arrival date.',
      'Student Discount: International students receive approximately 50% discount off standard rates, resulting in approx ₩75,000–₩80,000 monthly premium.',
      'Coverage: Covers primary clinic doctor visits (usually ₩5,000–₩10,000 co-pay), dental scaling once per year, and prescription medications at pharmacies (약국).',
      'Payment: Automatic bank deduction (자동이체) is recommended to prevent late penalty fees.'
    ],
    officialWarning: 'Unpaid health insurance premiums over 3 months will automatically block immigration visa extensions.',
    lastUpdated: 'November 2026',
    officialSource: 'National Health Insurance Service',
    sourceUrl: 'https://www.nhis.or.kr'
  },
  {
    id: 'guide-transit',
    title: 'Navigating Korean Public Transit: Climate Card, T-Money, and KTX',
    category: 'Transportation',
    readTimeMinutes: 5,
    summary: 'Seoul boasts one of the world’s cleanest subway and bus networks. Master the unlimited Climate Card (기후동행카드) and student discounts on KTX trains.',
    keySteps: [
      'Climate Card (기후동행카드): Seoul Metropolitan unlimited pass for ₩62,000/month (subway + bus) or ₩65,000 (includes Ttareungyi public bicycle). Students aged 19-39 get an extra youth discount down to ₩55,000/month!',
      'Apps to install: KakaoMap or Naver Map (Google Maps transit walking directions are limited in Korea due to national security mapping laws), and Subway Korea app.',
      'KTX Student Travel: Korail offers youth discounts (힘내라 청춘) for ages 24-33 giving 10%-40% discount on high-speed rail to Busan, Gangneung, and Jeonju.'
    ],
    lastUpdated: 'November 2026',
    officialSource: 'Seoul Metropolitan Government & KORAIL',
    sourceUrl: 'https://www.seoul.go.kr'
  }
];

export const CITY_GUIDES: CityGuide[] = [
  {
    id: 'seoul',
    name: 'Seoul',
    koreanName: '서울특별시',
    description: 'The vibrant capital of South Korea, blending royal Joseon palaces with smart metropolitan transit, 40+ leading universities, global tech research labs, and round-the-clock campus neighborhoods.',
    topUniversities: ['Seoul National University', 'Yonsei University', 'Korea University', 'Sungkyunkwan University', 'Hanyang University'],
    studentHubs: ['Sinchon & Hongdae (Youth arts, live music & study cafes)', 'Anam & Korea Univ District', 'Hyehwa / Daehangno (Theaters & campus alleys)', 'Gwanak / Sharosu-gil (SNU dining & research hub)'],
    transportTips: 'Use the Seoul Climate Card (₩55,000 youth tier) for unlimited subways and buses across Seoul. Trains operate 05:30 to 24:00 daily.',
    halalSpots: ['Itaewon Halal Food Street (Seoul Central Mosque)', 'Eid Halal Korean Food (Hannam-dong)', 'Makan Halal Restaurant', 'Hongdae Muslim-Friendly Korean BBQ'],
    image: seoulCityImg
  },
  {
    id: 'busan',
    name: 'Busan',
    koreanName: '부산광역시',
    description: 'Korea’s premier coastal metropolis featuring Haeundae and Gwangalli beaches, scenic mountain campuses, global maritime logistics, and welcoming national universities with lower living costs than Seoul.',
    topUniversities: ['Pusan National University', 'Pukyong National University', 'Dong-A University', 'Korea Maritime & Ocean University'],
    studentHubs: ['PNU Jangjeon-dong Street (Affordable student dining & cafes)', 'Kyungsung & Pukyong Univ District (Daeyeon-dong)', 'Seomyeon & Gwangalli Waterfront'],
    transportTips: 'Busan Metro Lines 1–4 and light rail connect campuses to beaches and KTX Busan Station seamlessly with nationwide T-Money cards.',
    halalSpots: ['Cappadocia Turkish Restaurant (near Busan Al-Fatah Mosque, Dusil)', 'Samarkand Cuisine', 'Haeundae Halal Kitchen'],
    image: busanCityImg
  },
  {
    id: 'incheon',
    name: 'Incheon',
    koreanName: '인천광역시',
    description: 'South Korea’s international aviation and smart-city gateway, home to Songdo International City, Incheon Global Campus (IGC), biotech R&D clusters, and major engineering universities.',
    topUniversities: ['Inha University', 'Incheon National University', 'Yonsei International Campus (Songdo)', 'Incheon Global Campus (SUNY Korea, GMU, Utah Asia, Ghent)'],
    studentHubs: ['Songdo Central Park & Triple Street', 'Inha University Backgate (Yonghyeon-dong food alley)', 'Bupyeong Station Cultural District'],
    transportTips: 'Incheon Subway Lines 1 & 2, AREX Airport Railroad, and Suin-Bundang Line link directly into central Seoul.',
    halalSpots: ['Songdo Canal Walk Halal & South Asian Restaurants', 'Incheon Chinatown Muslim-Friendly Dining', 'Yeonsu International Grocery & Halal Mart'],
    image: incheonCityImg
  },
  {
    id: 'daegu',
    name: 'Daegu',
    koreanName: '대구광역시',
    description: 'A warm, student-friendly metropolitan hub in southeastern Korea surrounded by Palgongsan mountains, renowned for flagship national research universities, medical innovation, and affordable student housing.',
    topUniversities: ['Kyungpook National University (KNU)', 'DGIST (Daegu Gyeongbuk Institute of Science & Technology)', 'Keimyung University', 'Yeungnam University (Gyeongsan Metro)'],
    studentHubs: ['KNU North Gate (Bukmun) Student Alley', 'Dongseongno Downtown Cultural Street', 'Kim Gwangseok-gil & Suseongmot Lake'],
    transportTips: 'Daegu Metro Lines 1, 2, and Line 3 Sky Rail Monorail connect KNU, Dongdaegu KTX Station, and Gyeongsan university towns.',
    halalSpots: ['KNU North Gate Halal & South Asian Kitchens', 'Daegu Islamic Center Neighborhood Spots', 'Dongseongno Curry & Kebab Houses'],
    image: daeguCityImg
  },
  {
    id: 'daejeon',
    name: 'Daejeon',
    koreanName: '대전광역시',
    description: 'The science, AI, and deep-tech research capital of South Korea, hosting KAIST, Daedeok Innopolis national laboratories, and generous STEM scholarship ecosystems.',
    topUniversities: ['KAIST', 'Chungnam National University', 'Woosong University (SolBridge)', 'Hanbat National University'],
    studentHubs: ['Gung-dong & Eoeun-dong (International student alleys between KAIST & CNU)', 'Dunsan-dong Metropolitan Center', 'Expo Science Park & Gapcheon River'],
    transportTips: 'Daejeon Metro Line 1, Tashu (타슈) free first-hour public bicycles, and 50-minute KTX access to Seoul.',
    halalSpots: ['Gung-dong Halal & South Asian Restaurants', 'KAIST International Cafeteria Halal Corner', 'SolBridge Global Dining District'],
    image: studentsCampusImg
  },
  {
    id: 'gwangju',
    name: 'Gwangju',
    koreanName: '광주광역시',
    description: 'The cultural, arts, and photonic-AI innovation hub of southwestern Korea (Honam region), home to Chonnam National University, GIST, the Asia Culture Center, and famously welcoming student neighborhoods.',
    topUniversities: ['Chonnam National University (CNU)', 'GIST (Gwangju Institute of Science and Technology)', 'Chosun University', 'Honam University'],
    studentHubs: ['CNU Backgate (Jeonnamdae Hub)', 'Chungjang-ro & Asia Culture Center (ACC)', 'Dongmyeong-dong Cafe Street'],
    transportTips: 'Gwangju Subway Line 1, extensive city bus network with T-Money transfers, and KTX Songjeong Station connecting to Seoul in 1 hr 40 mins.',
    halalSpots: ['CNU Backgate Halal & South Asian Restaurants', 'Gwangju Islamic Center Neighborhood Dining', 'Chungjang-ro International Kitchens'],
    image: seoulCityImg
  },
  {
    id: 'jeonju',
    name: 'Jeonju',
    koreanName: '전주시',
    description: 'UNESCO City of Gastronomy and traditional Korean heritage capital, famous for Jeonju Hanok Village, Jeonbuk National University’s expansive campus, and some of the most affordable student living costs in Korea.',
    topUniversities: ['Jeonbuk National University (JBNU)', 'Jeonju University', 'Woosuk University'],
    studentHubs: ['JBNU Old Gate (Gu-jeongmun) Student Street', 'Jeonju Hanok Village & Gaeksa-gil (Gaekridan-gil)', 'Deokjin Park Campus Lake'],
    transportTips: 'Direct KTX from Jeonju Station to Seoul in 1 hr 35 mins, plus frequent student-friendly city buses linking JBNU to downtown.',
    halalSpots: ['JBNU Global Student Dining & Halal Spots', 'Jeonju Hanok Village Muslim-Friendly Bibimbap & Seafood', 'Jeonju International Grocery & Kitchens'],
    image: busanCityImg
  }
];

export const EMERGENCY_CONTACTS = [
  {
    title: 'Immigration Contact Center (법무부 출입국 외국인종합안내센터)',
    number: '1345',
    description: 'Official government helpline for all visa questions, ARC renewals, part-time work inquiries, and legal stay rules.',
    hours: 'Weekdays 09:00 - 18:00 (Multilingual support in 20 languages including English, Bengali, Nepali, Chinese, Vietnamese)',
    languages: 'English, 한국어, বাংলা, नेपाली, 中文, Tiếng Việt, etc.'
  },
  {
    title: 'Fire & Medical Emergency (119 소방·구급·재난)',
    number: '119',
    description: 'Free immediate ambulance dispatch, fire, and medical emergency assistance. English interpretation service automatically patched in.',
    hours: '24/7, 365 days',
    languages: 'English, Korean (Direct 3-way translation)'
  },
  {
    title: 'Police Emergency (112 경찰 긴급신고)',
    number: '112',
    description: 'Immediate police intervention for crimes, accidents, disturbances, or missing persons.',
    hours: '24/7, 365 days',
    languages: 'English, Korean'
  },
  {
    title: 'Korea Travel & Student Helpline (1330 관광통역안내전화)',
    number: '1330',
    description: 'Free 24/7 tourist & student assistance: transportation directions, hospital translations, lost property, and consumer complaints.',
    hours: '24/7, 365 days',
    languages: 'English, Korean, Japanese, Chinese'
  },
  {
    title: 'Danuri Multicultural Support Center (다누리 콜센터)',
    number: '1577-1366',
    description: 'Free consultation and counseling on daily living in Korea, legal advice, human rights, and crisis intervention.',
    hours: '24/7, 365 days',
    languages: '13 languages available'
  }
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    brand_tagline: 'Your Complete Guide to Life in Korea.',
    hero_headline: 'Your Life in Korea, Made Easier.',
    hero_subhead: 'Everything international students need to study, work, live and succeed in South Korea — all in one place.',
    search_placeholder: 'What are you looking for in Korea? (e.g. Yonsei, D-2 Visa, Part-time job, One-room...)',
    explore_services: 'Explore Services',
    join_everykr: 'Join EVERYKR',
    get_help: 'Get Help (24/7)',
    nav_home: 'Home',
    nav_universities: 'Universities',
    nav_visa: 'Visa & Immigration',
    nav_jobs: 'Jobs',
    nav_accommodation: 'Accommodation',
    nav_life: 'Student Life',
    nav_community: 'Community',
    nav_marketplace: 'Marketplace',
    nav_dashboard: 'My Dashboard',
    nav_admin: 'Admin Portal',
    nav_login: 'Login',
    nav_signup: 'Sign Up',
    visa_disclaimer: 'Immigration requirements may change. Always confirm the latest requirements with the Korea Immigration Service or the relevant official authority.'
  },
  ko: {
    brand_tagline: '한국 유학 및 생활의 모든 것.',
    hero_headline: '더 쉽고 성공적인 한국 유학 생활.',
    hero_subhead: '외국인 유학생의 대학 입학, 비자, 취업, 주거, 커뮤니티까지 — EVERYKR 하나로 해결하세요.',
    search_placeholder: '한국에서 무엇을 찾고 계신가요? (예: 연세대, D-2 비자, 아르바이트, 원룸...)',
    explore_services: '서비스 둘러보기',
    join_everykr: 'EVERYKR 시작하기',
    get_help: '긴급 지원 (24/7)',
    nav_home: '홈',
    nav_universities: '대학 정보',
    nav_visa: '비자 & 출입국',
    nav_jobs: '일자리 & 인턴',
    nav_accommodation: '숙소 & 원룸',
    nav_life: '한국 생활 가이드',
    nav_community: '유학생 커뮤니티',
    nav_marketplace: '중고장터',
    nav_dashboard: '내 대시보드',
    nav_admin: '관리자 패널',
    nav_login: '로그인',
    nav_signup: '회원가입',
    visa_disclaimer: '출입국 규정은 수시로 변경될 수 있습니다. 정확한 최신 정보는 대한민국 법무부 출입국외국인정책본부(1345)를 통해 반드시 재확인하시기 바랍니다.'
  },
  bn: {
    brand_tagline: 'দক্ষিণ কোরিয়ায় আপনার সম্পূর্ণ জীবন নির্দেশিকা।',
    hero_headline: 'কোরিয়ায় আপনার জীবন হোক সহজ ও স্বাচ্ছন্দ্যময়।',
    hero_subhead: 'দক্ষিণ কোরিয়ায় অধ্যয়ন, চাকরি, বাসস্থান এবং সফল জীবনের জন্য যা কিছু প্রয়োজন — সব এক প্ল্যাটফর্মে।',
    search_placeholder: 'কোরিয়ায় আপনি কী খুঁজছেন? (যেমন: বিশ্ববিদ্যালয়, D-2 ভিসা, পার্ট-টাইম চাকরি, বাসা...)',
    explore_services: 'সেবাসমূহ দেখুন',
    join_everykr: 'EVERYKR-এ যোগ দিন',
    get_help: 'জরুরি সহায়তা (২৪/৭)',
    nav_home: 'হোম',
    nav_universities: 'বিশ্ববিদ্যালয়',
    nav_visa: 'ভিসা ও অভিবাসন',
    nav_jobs: 'চাকরি',
    nav_accommodation: 'বাসস্থান',
    nav_life: 'কোরিয়ান জীবন',
    nav_community: 'কমিউনিটি',
    nav_marketplace: 'মার্কেটপ্লেস',
    nav_dashboard: 'ড্যাশবোর্ড',
    nav_admin: 'অ্যাডমিন',
    nav_login: 'লগইন',
    nav_signup: 'নিবন্ধন',
    visa_disclaimer: 'ইমিগ্রেশন নিয়ম পরিবর্তিত হতে পারে। সর্বদা কোরিয়া ইমিগ্রেশন সার্ভিস (১৩৪৫) থেকে সর্বশেষ তথ্য যাচাই করুন।'
  },
  ne: {
    brand_tagline: 'दक्षिण कोरियामा तपाईंको जीवनको पूर्ण मार्गदर्शक।',
    hero_headline: 'कोरियामा तपाईंको जीवन, अब अझ सहज।',
    hero_subhead: 'दक्षिण कोरियामा अध्ययन, काम, बसोबास र सफलताका लागि आवश्यक सम्पूर्ण जानकारी — एकै ठाउँमा।',
    search_placeholder: 'तपाईं कोरियामा के खोज्दै हुनुहुन्छ? (उदा: विश्वविद्यालय, D-2 भिसा, काम, कोठा...)',
    explore_services: 'सेवाहरू हेर्नुहोस्',
    join_everykr: 'EVERYKR मा जोडिनुहोस्',
    get_help: 'आकस्मिक मद्दत (२४/७)',
    nav_home: 'गृहपृष्ठ',
    nav_universities: 'विश्वविद्यालयहरू',
    nav_visa: 'भिसा र अध्यागमन',
    nav_jobs: 'रोजगारी',
    nav_accommodation: 'बसोबास',
    nav_life: 'दैनिक जीवन',
    nav_community: 'समुदाय',
    nav_marketplace: 'बजार',
    nav_dashboard: 'ड्यासबोर्ड',
    nav_admin: 'एडमिन',
    nav_login: 'लगइन',
    nav_signup: 'दर्ता',
    visa_disclaimer: 'अध्यागमन नियमहरू परिवर्तन हुन सक्छन्। सधैं कोरिया अध्यागमन सेवा वा सम्बन्धित आधिकारिक निकायबाट पुष्टि गर्नुहोस्।'
  },
  zh: {
    brand_tagline: '您在韩国留学与生活的全方位指南。',
    hero_headline: '让您的韩国留学与生活更轻松。',
    hero_subhead: '留学生在韩学习、工作、居住与发展所需的一切实用信息与服务 — 尽在一处。',
    search_placeholder: '您在韩国寻找什么？（例如：延世大学、D-2签证、兼职打工、租房...）',
    explore_services: '探索服务',
    join_everykr: '加入 EVERYKR',
    get_help: '紧急求助 (24/7)',
    nav_home: '首页',
    nav_universities: '韩国大学',
    nav_visa: '签证出入境',
    nav_jobs: '求职兼职',
    nav_accommodation: '租房住宿',
    nav_life: '在韩生活',
    nav_community: '学生社区',
    nav_marketplace: '二手集市',
    nav_dashboard: '个人中心',
    nav_admin: '管理后台',
    nav_login: '登录',
    nav_signup: '注册',
    visa_disclaimer: '出入境政策与签证规定可能会有变动，请务必向韩国出入境管理局（1345）确认最新官方要求。'
  },
  ur: {
    brand_tagline: 'جنوبی کوریا میں تعلیم اور زندگی کے لیے آپ کا مکمل رہنما۔',
    hero_headline: 'EveryKR کے ساتھ کوریا میں تعلیم حاصل کریں۔',
    hero_subhead: 'جنوبی کوریا کی 136 منظور شدہ یونیورسٹیوں، ڈگری پروگراموں، اسکالرشپس، ویزا اور طلباء کی زندگی کی مکمل معلومات۔',
    search_placeholder: 'یونیورسٹیاں، پروگرامز، اسکالرشپس اور معلومات تلاش کریں...',
    explore_services: 'خدمات دیکھیں',
    join_everykr: 'EveryKR میں شامل ہوں',
    get_help: '1345 ہیلپ لائن',
    nav_home: 'ہوم',
    nav_universities: 'یونیورسٹیاں',
    nav_visa: 'اسٹوڈنٹ ویزا گائیڈ',
    nav_jobs: 'ملازمتیں اور پارٹ ٹائم کام',
    nav_accommodation: 'ہاسٹل اور رہائش',
    nav_life: 'طالب علمی کی زندگی',
    nav_community: 'اسٹوڈنٹ کمیونٹی',
    nav_marketplace: 'مارکیٹ پلیس',
    nav_dashboard: 'میرا ڈیش بورڈ',
    nav_admin: 'ایڈمن پورٹل',
    nav_login: 'لاگ ان',
    nav_signup: 'رجسٹر کریں',
    visa_disclaimer: 'امیگریشن قوانین تبدیل ہو سکتے ہیں۔ ہمیشہ کوریا امیگریشن سروس (1345) سے تازہ ترین معلومات کی تصدیق کریں۔'
  },
  hi: {
    brand_tagline: 'दक्षिण कोरिया में शिक्षा और जीवन के लिए आपका संपूर्ण मार्गदर्शक।',
    hero_headline: 'EveryKR के साथ कोरिया में आपका जीवन और आसान।',
    hero_subhead: 'दक्षिण कोरिया के 136 मान्यता प्राप्त विश्वविद्यालयों, छात्रवृत्ति, वीज़ा, आवास और करियर की संपूर्ण जानकारी एक ही स्थान पर।',
    search_placeholder: 'विश्वविद्यालय, प्रोग्राम, छात्रवृत्ति और वीज़ा खोजें...',
    explore_services: 'सेवाएं देखें',
    join_everykr: 'EveryKR से जुड़ें',
    get_help: '1345 हेल्पलाइन',
    nav_home: 'होम',
    nav_universities: 'विश्वविद्यालय',
    nav_visa: 'वीज़ा और इमिग्रेशन',
    nav_jobs: 'नौकरियां',
    nav_accommodation: 'हॉस्टल और आवास',
    nav_life: 'छात्र जीवन',
    nav_community: 'समुदाय',
    nav_marketplace: 'मार्केटप्लेस',
    nav_dashboard: 'मेरा डैशबोर्ड',
    nav_admin: 'एडमिन पोर्टल',
    nav_login: 'लॉगिन',
    nav_signup: 'रजिस्टर करें',
    visa_disclaimer: 'इमिग्रेशन नियम बदल सकते हैं। हमेशा कोरिया इमिग्रेशन सर्विस (1345) से नवीनतम जानकारी की पुष्टि करें।'
  },
  ar: {
    brand_tagline: 'دليلك الشامل للدراسة والحياة في كوريا الجنوبية.',
    hero_headline: 'حياتك ودراستك في كوريا أصبحت أسهل.',
    hero_subhead: 'كل ما يحتاجه الطلاب الدوليون للدراسة، العمل، السكن، والنجاح في كوريا الجنوبية — في منصة واحدة.',
    search_placeholder: 'عمّ تبحث في كوريا؟ (مثال: الجامعات، تأشيرة D-2، عمل جزئي، سكن طلابي...)',
    explore_services: 'استكشف الخدمات',
    join_everykr: 'انضم إلى EVERYKR',
    get_help: 'مساعدة طارئة (1345)',
    nav_home: 'الرئيسية',
    nav_universities: 'الجامعات',
    nav_visa: 'التأشيرة والهجرة',
    nav_jobs: 'الوظائف',
    nav_accommodation: 'السكن الطلابي',
    nav_life: 'حياة الطلاب',
    nav_community: 'المجتمع',
    nav_marketplace: 'السوق',
    nav_dashboard: 'لوحة التحكم',
    nav_admin: 'بوابة المشرف',
    nav_login: 'تسجيل الدخول',
    nav_signup: 'إنشاء حساب',
    visa_disclaimer: 'قد تتغير لوائح الهجرة. يرجى دائماً التحقق من أحدث المتطلبات عبر مكتب الهجرة الكوري (1345).'
  },
  ja: {
    brand_tagline: '韓国での留学と生活のための総合ガイド。',
    hero_headline: '韓国での留学生活をよりスムーズに。',
    hero_subhead: '外国人留学生が韓国で学び、働き、暮らし、成功するために必要なすべてを一つのプラットフォームで。',
    search_placeholder: '韓国で何をお探しですか？（例：延世大学、D-2ビザ、アルバイト、ワンルーム...）',
    explore_services: 'サービスを見る',
    join_everykr: 'EVERYKRに参加する',
    get_help: '緊急サポート (1345)',
    nav_home: 'ホーム',
    nav_universities: '韓国の大学',
    nav_visa: 'ビザ・出入国',
    nav_jobs: '求人・アルバイト',
    nav_accommodation: '宿舎・住まい',
    nav_life: '学生生活',
    nav_community: 'コミュニティ',
    nav_marketplace: 'マーケット',
    nav_dashboard: 'マイダッシュボード',
    nav_admin: '管理者ポータル',
    nav_login: 'ログイン',
    nav_signup: '新規登録',
    visa_disclaimer: '出入国管理規定は変更される場合があります。最新情報は必ず韓国出入国・外国人政策本部（1345）でご確認ください。'
  }
};


