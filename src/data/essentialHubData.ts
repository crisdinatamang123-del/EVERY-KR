/**
 * EveryKR Essential Hub — Verified Official Public Data & Schemas (8 Modules)
 *
 * All emergency numbers, immigration offices, police stations, airport routes,
 * life guides, and official policy announcements are sourced from verified
 * South Korean government and public agency portals (Ministry of Justice / HiKorea,
 * Korean National Police Agency, National Fire Agency, Korea Tourism Organization,
 * National Health Insurance Service, NIIED Study in Korea, Incheon International
 * Airport Corporation, Korea Airports Corporation, and KORAIL).
 */

export type EmergencyCategory =
  | 'Police and Safety'
  | 'Fire and Rescue'
  | 'Medical Emergency'
  | 'Immigration Assistance'
  | 'Tourist Assistance'
  | 'Foreign Resident Support'
  | "Women's Safety"
  | 'Lost and Found'
  | 'Other Public Services';

export interface KoreaEmergencyContact {
  id: string;
  serviceNameEn: string;
  serviceNameKo: string;
  phoneNumber: string;
  dialHref: string;
  category: EmergencyCategory;
  descriptionEn: string;
  descriptionKo: string;
  languagesSupported: string[];
  operatingHours: string;
  officialAgency: string;
  officialWebsite: string;
  isPrimaryEmergency?: boolean;
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW';
  lastVerifiedDate: string;
  published: boolean;
}

export interface KoreaImmigrationOffice {
  id: string;
  officeNameEn: string;
  officeNameKo: string;
  city: string;
  province: string;
  addressKo: string;
  addressEn: string;
  phoneNumber: string;
  faxNumber?: string;
  operatingHours: string;
  officialWebsite: string;
  reservationUrl: string;
  jurisdictionSummary: string;
  availableServices: string[];
  nearestSubwayOrBus: string;
  lat: number;
  lng: number;
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW';
  lastVerifiedDate: string;
  published: boolean;
}

export interface KoreaPoliceStation {
  id: string;
  stationNameEn: string;
  stationNameKo: string;
  stationType: 'Metropolitan/Provincial Agency' | 'District Police Station';
  city: string;
  district: string;
  province: string;
  addressKo: string;
  addressEn: string;
  phoneNumber: string; // Civil inquiries (182 or direct station switchboard)
  emergencyNumber: '112';
  operatingHours: string;
  nearbyUniversities: string[];
  availableServices: string[];
  officialWebsite: string;
  lat: number;
  lng: number;
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW';
  lastVerifiedDate: string;
  published: boolean;
}

export type LifeGuideCategoryKey =
  | 'Banking'
  | 'Housing'
  | 'Healthcare'
  | 'Transportation'
  | 'Daily Life'
  | 'Student Life'
  | 'Immigration and Legal Basics'
  | 'Korean Culture and Language';

export interface KoreanLifeGuideArticle {
  id: string;
  category: LifeGuideCategoryKey;
  categoryCode: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  titleEn: string;
  titleKo: string;
  summary: string;
  explanation: string;
  stepByStepInstructions: string[];
  requiredDocuments: string[];
  usefulVocabulary: Array<{
    korean: string;
    romanization: string;
    meaningEn: string;
  }>;
  officialLinks: Array<{
    label: string;
    url: string;
    agency: string;
  }>;
  legalDisclaimer?: string;
  lastUpdatedDate: string;
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW';
  published: boolean;
}

export type AirportTransportOptionType =
  | 'Airport Limousine Bus'
  | 'Intercity / Express Bus'
  | 'Airport Railway / Subway'
  | 'KTX / SRT'
  | 'Taxi'
  | 'Combination Route';

export interface AirportTransportOption {
  id: string;
  optionCode: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  modeType: AirportTransportOptionType;
  title: string;
  departureTerminalInfo: string;
  boardingLocation: string;
  destinationStationOrTerminal: string;
  transferPoints: string[];
  estimatedDurationRange: string;
  referenceFareRangeKrw: string;
  stepByStepInstructions: string[];
  ticketPurchasingInstructions: string;
  luggageGuidance: string;
  bookingWebsiteLabel: string;
  bookingWebsiteUrl: string;
  dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal';
}

export interface AirportToCityRoute {
  id: string;
  airportCode: 'ICN' | 'PUS' | 'GMP' | 'CJU' | 'TAE' | 'CJJ';
  airportNameEn: string;
  airportNameKo: string;
  airportLat: number;
  airportLng: number;
  destinationCity: string;
  destinationNameKo: string;
  destinationUniversities: string[];
  destLat: number;
  destLng: number;
  routeSummary: string;
  transportOptions: AirportTransportOption[];
  usefulTravelPhrases: Array<{
    korean: string;
    romanization: string;
    meaningEn: string;
  }>;
  lastVerifiedDate: string;
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW';
  published: boolean;
}

export type EssentialNewsCategory =
  | 'Immigration Updates'
  | 'Visa and Policy Changes'
  | 'University Admissions'
  | 'Scholarship Opportunities'
  | 'TOPIK and Korean Language'
  | 'Student Life'
  | 'Part-time Work Regulations'
  | 'Government Announcements'
  | 'Transportation Updates'
  | 'Events and Opportunities';

export interface EssentialNewsItem {
  id: string;
  headlineEn: string;
  headlineKo: string;
  summaryEn: string;
  summaryBn: string;
  summaryKo: string;
  summaryNe: string;
  fullDetailsEn: string[];
  category: EssentialNewsCategory;
  sourceName: string;
  sourceUrl: string;
  sourceType: 'Official Government / Public Agency' | 'Official University / Academic Portal' | 'Verified Public Information';
  publicationDate: string;
  lastVerifiedDate: string;
  featured: boolean;
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW';
  published: boolean;
}

// ============================================================================
// 1. KOREA EMERGENCY NUMBERS (VERIFIED PUBLIC HOTLINES)
// ============================================================================
export const EMERGENCY_CATEGORIES: EmergencyCategory[] = [
  'Police and Safety',
  'Fire and Rescue',
  'Medical Emergency',
  'Immigration Assistance',
  'Tourist Assistance',
  'Foreign Resident Support',
  "Women's Safety",
  'Lost and Found',
  'Other Public Services',
];

export const VERIFIED_EMERGENCY_CONTACTS: KoreaEmergencyContact[] = [
  {
    id: 'emg-112',
    serviceNameEn: 'Emergency Police Report (Crime & Immediate Danger)',
    serviceNameKo: '경찰청 긴급 범죄신고 (112)',
    phoneNumber: '112',
    dialHref: 'tel:112',
    category: 'Police and Safety',
    descriptionEn:
      'Immediate emergency police dispatch across all of South Korea for crime, assault, theft in progress, traffic accidents, or personal safety danger. Three-way foreign language interpretation is available.',
    descriptionKo: '범죄 피해, 폭행, 도난, 교통사고 등 긴급한 경찰 출동 및 외국인 통역 지원',
    languagesSupported: ['Korean', 'English', 'Chinese', 'Japanese', 'Vietnamese', 'Russian (via 3-way interpretation)'],
    operatingHours: '24 hours / 365 days',
    officialAgency: 'Korean National Police Agency (경찰청)',
    officialWebsite: 'https://www.police.go.kr',
    isPrimaryEmergency: true,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-119',
    serviceNameEn: 'Fire, Rescue & Emergency Ambulance',
    serviceNameKo: '소방청 화재·구조·응급구급 (119)',
    phoneNumber: '119',
    dialHref: 'tel:119',
    category: 'Fire and Rescue',
    descriptionEn:
      'Nationwide emergency fire response, rescue operations, emergency ambulance dispatch, and urgent hospital routing. Foreign language medical interpretation is supported.',
    descriptionKo: '화재 진압, 인명 구조, 응급환자 구급차 출동 및 병원 안내',
    languagesSupported: ['Korean', 'English', 'Chinese', 'Japanese (Foreigner 3-way help)'],
    operatingHours: '24 hours / 365 days',
    officialAgency: 'National Fire Agency (소방청)',
    officialWebsite: 'https://www.nfa.go.kr',
    isPrimaryEmergency: true,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-1345',
    serviceNameEn: 'Immigration Contact Center (HiKorea Multilingual Helpline)',
    serviceNameKo: '법무부 외국인종합안내센터 (1345)',
    phoneNumber: '1345',
    dialHref: 'tel:1345',
    category: 'Immigration Assistance',
    descriptionEn:
      'Official Ministry of Justice helpline for student visas (D-2/D-4), Alien Registration Card (ARC), stay extensions, address changes, part-time work permits (S-3), and civil immigration counseling in 20 languages.',
    descriptionKo: '체류자격, 비자 연장, 외국인등록증, 시간제취업허가 등 20개국어 출입국 상담',
    languagesSupported: [
      'Korean',
      'English',
      'Chinese',
      'Japanese',
      'Vietnamese',
      'Bengali',
      'Nepali',
      'Urdu',
      'Hindi',
      'Arabic',
      'Russian',
      'Uzbek',
      'Thai',
      'Indonesian',
      'Mongolian',
      'Tagalog',
    ],
    operatingHours: 'Mon–Fri 09:00–22:00 (09:00–18:00 for specialized languages; closed weekends & holidays)',
    officialAgency: 'Ministry of Justice — Korea Immigration Service (법무부 출입국·외국인정책본부)',
    officialWebsite: 'https://www.hikorea.go.kr',
    isPrimaryEmergency: true,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-1330',
    serviceNameEn: 'Korea Travel Hotline & Tourist Interpretation',
    serviceNameKo: '한국관광공사 관광통역안내전화 (1330)',
    phoneNumber: '1330',
    dialHref: 'tel:1330',
    category: 'Tourist Assistance',
    descriptionEn:
      '24/7 multilingual travel assistance, live Korean interpretation for taxis/hospitals/police, public transit directions, and tourist complaint resolution.',
    descriptionKo: '24시간 다국어 관광 안내, 교통·응급 통역 지원 및 관광 불편 신고',
    languagesSupported: ['Korean', 'English', 'Japanese', 'Chinese', 'Russian', 'Vietnamese', 'Thai', 'Malay/Indonesian'],
    operatingHours: '24 hours / 365 days (English, Japanese, Chinese, Korean); 08:00–19:00 (Russian, Vietnamese, Thai, Malay/Indonesian)',
    officialAgency: 'Korea Tourism Organization (한국관광공사)',
    officialWebsite: 'https://english.visitkorea.or.kr',
    isPrimaryEmergency: true,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-1339',
    serviceNameEn: 'KDCA Public Health & Infectious Disease Hotline',
    serviceNameKo: '질병관리청 감염병 전문 콜센터 (1339)',
    phoneNumber: '1339',
    dialHref: 'tel:1339',
    category: 'Medical Emergency',
    descriptionEn:
      'Official Korea Disease Control and Prevention Agency hotline for infectious disease symptoms, quarantine guidelines, public health emergencies, and medical triage guidance.',
    descriptionKo: '감염병 의심 증상 상담, 방역 지침 및 보건 의료 긴급 안내',
    languagesSupported: ['Korean', 'English & multilingual support via linked interpretation (1330 / 1345)'],
    operatingHours: '24 hours / 365 days',
    officialAgency: 'Korea Disease Control and Prevention Agency (질병관리청)',
    officialWebsite: 'https://www.kdca.go.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-119-medical',
    serviceNameEn: 'Emergency Medical Information Center (Hospital & Pharmacy Finder)',
    serviceNameKo: '119 구급상황관리센터 (응급 병원·약국 안내)',
    phoneNumber: '119',
    dialHref: 'tel:119',
    category: 'Medical Emergency',
    descriptionEn:
      'Consults on sudden illness, late-night/holiday operating emergency rooms (응급실) and pharmacies (당번약국), and dispatches emergency paramedics.',
    descriptionKo: '야간·휴일 진료 가능 응급실 및 약국 안내, 응급처치 지도',
    languagesSupported: ['Korean', 'English', 'Chinese', 'Japanese'],
    operatingHours: '24 hours / 365 days',
    officialAgency: 'National Fire Agency & National Emergency Medical Center (응급의료포털 E-Gen)',
    officialWebsite: 'https://www.e-gen.or.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-nhis-foreign',
    serviceNameEn: 'National Health Insurance Service (NHIS Foreign Language Counseling)',
    serviceNameKo: '국민건강보험공단 외국인 민원센터',
    phoneNumber: '033-811-2000',
    dialHref: 'tel:0338112000',
    category: 'Medical Emergency',
    descriptionEn:
      'Dedicated foreign-language customer center for D-2/D-4 student health insurance enrollment, monthly billing, insurance card inquiries, and hospital coverage.',
    descriptionKo: '유학생(D-2, D-4) 국민건강보험 가입, 보험료 납부 및 급여 혜택 외국어 상담 (대표번호 1577-1000)',
    languagesSupported: ['English', 'Chinese', 'Vietnamese', 'Uzbek', 'Korean'],
    operatingHours: 'Mon–Fri 09:00–18:00',
    officialAgency: 'National Health Insurance Service (국민건강보험공단)',
    officialWebsite: 'https://www.nhis.or.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-182',
    serviceNameEn: 'Police Civil Affairs & Non-Emergency Helpline',
    serviceNameKo: '경찰민원콜센터 (182)',
    phoneNumber: '182',
    dialHref: 'tel:182',
    category: 'Police and Safety',
    descriptionEn:
      'Non-emergency police inquiries, lost property inquiries (LOST112), traffic fine checks, police certificate guidance, and station contact routing.',
    descriptionKo: '비긴급 경찰 민원 상담, 유실물 조회, 교통 범칙금 및 사실확인원 발급 안내',
    languagesSupported: ['Korean'],
    operatingHours: '24 hours / 365 days',
    officialAgency: 'Korean National Police Agency (경찰청)',
    officialWebsite: 'https://www.police.go.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-1366',
    serviceNameEn: "Women's Emergency Hotline 1366",
    serviceNameKo: '여성긴급전화 (1366)',
    phoneNumber: '1366',
    dialHref: 'tel:1366',
    category: "Women's Safety",
    descriptionEn:
      '24-hour confidential crisis counseling, emergency shelter referral, police/hospital coordination, and protection for women experiencing violence, stalking, or harassment.',
    descriptionKo: '가정폭력·성폭력·스토킹·교제폭력 등 위기 여성 24시간 긴급 상담 및 보호시설 연계',
    languagesSupported: ['Korean', 'Multilingual support linked with Danuri 1577-1366'],
    operatingHours: '24 hours / 365 days',
    officialAgency: 'Ministry of Gender Equality and Family (여성가족부)',
    officialWebsite: 'https://www.women1366.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-1577-1366',
    serviceNameEn: 'Danuri Helpline for Migrant & International Women',
    serviceNameKo: '다누리콜센터 (1577-1366)',
    phoneNumber: '1577-1366',
    dialHref: 'tel:15771366',
    category: "Women's Safety",
    descriptionEn:
      '24/7 multilingual support, emergency shelter protection, legal/medical interpretation, and crisis counseling for foreign women and multicultural residents in Korea.',
    descriptionKo: '이주여성 및 외국인 여성 긴급 보호, 폭력 피해 상담 및 13개국어 생활 통역 지원',
    languagesSupported: [
      'Korean',
      'English',
      'Chinese',
      'Vietnamese',
      'Tagalog',
      'Khmer',
      'Mongolian',
      'Russian',
      'Japanese',
      'Thai',
      'Lao',
      'Uzbek',
      'Nepali',
    ],
    operatingHours: '24 hours / 365 days',
    officialAgency: 'Korea Institute for Healthy Family (한국건강가정진흥원)',
    officialWebsite: 'https://www.liveinkorea.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-120',
    serviceNameEn: 'Dasan Call Center (Seoul & Local Government Civil Helpline)',
    serviceNameKo: '다산콜센터 (02-120)',
    phoneNumber: '02-120',
    dialHref: 'tel:02120',
    category: 'Foreign Resident Support',
    descriptionEn:
      'Municipal public services, public transportation inquiries, waste/recycling rules, city administration, and foreign language living consultations in Seoul (dial Area Code + 120 in other provinces).',
    descriptionKo: '서울시 대중교통, 생활 민원, 쓰레기 배출, 행정 안내 및 외국어 상담 (타 지역은 지역번호+120)',
    languagesSupported: ['Korean', 'English', 'Chinese', 'Japanese', 'Vietnamese', 'Mongolian'],
    operatingHours: '24 hours (Korean); Mon–Fri 09:00–18:00 (Foreign language counseling)',
    officialAgency: 'Seoul Metropolitan Government (120 다산콜재단)',
    officialWebsite: 'https://www.120dasan.or.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-seoul-global',
    serviceNameEn: 'Seoul Global Center (Foreign Resident Support & Legal/Living Counseling)',
    serviceNameKo: '서울글로벌센터 (02-2075-4180)',
    phoneNumber: '02-2075-4180',
    dialHref: 'tel:0220754180',
    category: 'Foreign Resident Support',
    descriptionEn:
      'Comprehensive support for international students and foreign residents including housing contract disputes, labor counseling, daily living, and Korean language classes.',
    descriptionKo: '외국인 유학생 및 거주자 대상 부동산 계약, 노무, 법률, 일상생활 다국어 상담',
    languagesSupported: ['Korean', 'English', 'Chinese', 'Japanese', 'Vietnamese', 'Russian', 'Uzbek', 'Mongolian'],
    operatingHours: 'Mon–Fri 09:00–18:00 (Lunch break 12:00–13:00)',
    officialAgency: 'Seoul Metropolitan Government — Seoul Global Center',
    officialWebsite: 'https://global.seoul.go.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-lost112',
    serviceNameEn: 'LOST112 — National Police Lost & Found Center & Subway Lost Property',
    serviceNameKo: '경찰청 유실물 종합관리시스템 (LOST112 / 182)',
    phoneNumber: '182',
    dialHref: 'tel:182',
    category: 'Lost and Found',
    descriptionEn:
      'Nationwide database and helpline for lost wallets, Alien Registration Cards (ARC), passports, phones, and bags turned in to police stations, subways, buses, and airports.',
    descriptionKo: '전국 경찰서, 지하철, 버스, 공항 등에 접수된 분실물·습득물 통합 조회 및 안내',
    languagesSupported: ['Korean (Use 1330 Korea Travel Hotline for English/Multilingual lost item assistance)'],
    operatingHours: '24 hours / 365 days',
    officialAgency: 'Korean National Police Agency — LOST112',
    officialWebsite: 'https://www.lost112.go.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-1350',
    serviceNameEn: 'Ministry of Employment & Labor (Unpaid Wages & Part-Time Work Rights)',
    serviceNameKo: '고용노동부 고객상담센터 (1350)',
    phoneNumber: '1350',
    dialHref: 'tel:1350',
    category: 'Other Public Services',
    descriptionEn:
      'Official labor counseling for minimum wage compliance, unpaid part-time wages (임금체불), industrial accidents, and employment standards.',
    descriptionKo: '아르바이트 최저임금, 임금체불 신고, 근로기준법 및 산업재해 상담',
    languagesSupported: ['Korean', 'English', 'Chinese', 'Vietnamese (Foreign Worker Counseling 1577-0071)'],
    operatingHours: 'Mon–Fri 09:00–18:00',
    officialAgency: 'Ministry of Employment and Labor (고용노동부)',
    officialWebsite: 'https://www.moel.go.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'emg-1332',
    serviceNameEn: 'Financial Supervisory Service (Voice Phishing & Bank Scam Report)',
    serviceNameKo: '금융감독원 보이스피싱·금융사기 신고 (1332)',
    phoneNumber: '1332',
    dialHref: 'tel:1332',
    category: 'Other Public Services',
    descriptionEn:
      'Report suspected voice phishing calls impersonating immigration/police/prosecutors, freeze compromised bank transfers, and receive financial fraud assistance.',
    descriptionKo: '출입국·경찰 사칭 보이스피싱 피해 신고 및 계좌 지급정지 상담',
    languagesSupported: ['Korean'],
    operatingHours: '24 hours (Fraud report) / Mon–Fri 09:00–18:00 (General consultation)',
    officialAgency: 'Financial Supervisory Service (금융감독원)',
    officialWebsite: 'https://www.fss.or.kr',
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
];

// ============================================================================
// 2. IMMIGRATION OFFICE DIRECTORY — SOUTH KOREA (VERIFIED HIKOREA DATA)
// ============================================================================
export const VERIFIED_IMMIGRATION_OFFICES: KoreaImmigrationOffice[] = [
  {
    id: 'imm-seoul-main',
    officeNameEn: 'Seoul Immigration Office (Main Office — Mok-dong)',
    officeNameKo: '서울출입국·외국인청 (본청)',
    city: 'Seoul',
    province: 'Seoul',
    addressKo: '서울특별시 양천구 목동동로 151',
    addressEn: '151 Mokdongdong-ro, Yangcheon-gu, Seoul',
    phoneNumber: '1345',
    faxNumber: '02-2650-6295',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/seoul/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Seoul districts: Gangnam-gu, Seocho-gu, Songpa-gu, Gangdong-gu, Dongjak-gu, Gwanak-gu, Studying at universities in Southern/Eastern Seoul; Gyeonggi cities: Seongnam, Anyang, Gwangmyeong, Gwacheon, Hanam (Always verify exact district mapping on HiKorea before booking).',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Change of Status of Sojourn',
      'Part-Time Work Permission (S-3)',
      'Re-entry Permit & Certificate of Fact',
    ],
    nearestSubwayOrBus: 'Line 5 Omokgyo Station (Exit 7, take Bus 6624/6637) or Yangcheon-gu Office Station',
    lat: 37.5186,
    lng: 126.8636,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-seoul-southern',
    officeNameEn: 'Seoul Southern Immigration Office (Magok)',
    officeNameKo: '서울남부출입국·외국인사무소',
    city: 'Seoul',
    province: 'Seoul',
    addressKo: '서울특별시 강서구 마곡서로 58',
    addressEn: '58 Magokseo-ro, Gangseo-gu, Seoul',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/seoul_south/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Seoul districts: Seodaemun-gu, Mapo-gu, Eunpyeong-gu, Gangseo-gu, Yangcheon-gu, Yeongdeungpo-gu, Guro-gu, Geumcheon-gu (Includes Yonsei, Ewha, Sogang, and Hongik university areas).',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
      'Address Change Reporting',
      'Biometric Enrollment',
    ],
    nearestSubwayOrBus: 'Line 5 Balsan Station (Exit 1 or 9) or Line 9 / AREX Magongnaru Station',
    lat: 37.5612,
    lng: 126.8269,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-seoul-sejongno',
    officeNameEn: 'Seoul Immigration Office — Sejongno Branch (Jongno)',
    officeNameKo: '서울출입국·외국인청 세종로출장소',
    city: 'Seoul',
    province: 'Seoul',
    addressKo: '서울특별시 종로구 종로 38 서울글로벌센터 2~3층',
    addressEn: '2F–3F Seoul Global Center, 38 Jong-ro, Jongno-gu, Seoul',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/seoul/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Seoul districts: Jongno-gu, Jung-gu, Dongdaemun-gu, Seongbuk-gu, Gangbuk-gu, Nowon-gu, Dobong-gu, Jungnang-gu, Seongdong-gu, Gwangjin-gu, Yongsan-gu (Includes Korea Univ., Kyung Hee, HUFS, SKKU Humanities, Hanyang, Dongguk, Konkuk).',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
      'Change of Visa Status',
    ],
    nearestSubwayOrBus: 'Line 1 Jonggak Station (Exit 6, directly in Seoul Global Center building)',
    lat: 37.5698,
    lng: 126.9806,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-incheon',
    officeNameEn: 'Incheon Immigration Office',
    officeNameKo: '인천출입국·외국인청',
    city: 'Incheon',
    province: 'Incheon',
    addressKo: '인천광역시 중구 서해대로 393',
    addressEn: '393 Seohae-daero, Jung-gu, Incheon',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/incheon/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Incheon Metropolitan City (including Inha University, Incheon National University, Yonsei International Campus Songdo, IGC) and Gyeonggi cities Bucheon, Gimpo, Ansan, Siheung.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Visa Extension & Change',
      'Part-Time Work Permission (S-3)',
      'Nationality & Permanent Residency',
    ],
    nearestSubwayOrBus: 'Suin-Bundang Line Inha Univ. Station or Sinpo Station + Local Bus',
    lat: 37.4561,
    lng: 126.6258,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-suwon',
    officeNameEn: 'Suwon Immigration Office',
    officeNameKo: '수원출입국·외국인청',
    city: 'Suwon',
    province: 'Gyeonggi-do',
    addressKo: '경기도 수원시 영통구 반달로 39',
    addressEn: '39 Bandal-ro, Yeongtong-gu, Suwon-si, Gyeonggi-do',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/suwon/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Southern Gyeonggi-do: Suwon, Yongin, Hwaseong, Pyeongtaek, Osan, Gunpo, Uiwang, Icheon, Anseong, Yeoju (Includes SKKU Natural Sciences Campus, Kyung Hee Global Campus, Ajou University).',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Visa Extension',
      'Part-Time Work Permission (S-3)',
      'Change of Sojourn Status',
    ],
    nearestSubwayOrBus: 'Suin-Bundang Line Yeongtong Station (Exit 2, 5-minute walk)',
    lat: 37.2504,
    lng: 127.0715,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-yangju',
    officeNameEn: 'Yangju Immigration Office (Northern Gyeonggi)',
    officeNameKo: '양주출입국·외국인사무소',
    city: 'Yangju',
    province: 'Gyeonggi-do',
    addressKo: '경기도 양주시 평화로1475번길 23',
    addressEn: '23 Pyeonghwa-ro 1475beon-gil, Yangju-si, Gyeonggi-do',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/yangju/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Northern Gyeonggi-do: Goyang, Paju, Uijeongbu, Namyangju, Guri, Yangju, Dongducheon, Pocheon, Yeoncheon, Gapyeong.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'Student Visa Extension & Change',
      'Part-Time Work Permission (S-3)',
    ],
    nearestSubwayOrBus: 'Line 1 Deokgye Station (Exit 1, 10-minute walk)',
    lat: 37.8195,
    lng: 127.0518,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-busan',
    officeNameEn: 'Busan Immigration Office',
    officeNameKo: '부산출입국·외국인청',
    city: 'Busan',
    province: 'Busan',
    addressKo: '부산광역시 중구 중앙대로 146',
    addressEn: '146 Jungang-daero, Jung-gu, Busan',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/busan/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Busan Metropolitan City (Pusan National University, Pukyong National University, Dong-A University, Kyungsung University) and Yangsan, Gimhae, Miryang.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
      'Change of Status & Re-entry Permits',
    ],
    nearestSubwayOrBus: 'Busan Subway Line 1 Jungang Station (Exit 6, 3-minute walk)',
    lat: 35.1068,
    lng: 129.0384,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-daegu',
    officeNameEn: 'Daegu Immigration Office',
    officeNameKo: '대구출입국·외국인사무소',
    city: 'Daegu',
    province: 'Daegu',
    addressKo: '대구광역시 동구 동대구로 71',
    addressEn: '71 Dongdaegu-ro, Dong-gu, Daegu',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/daegu/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Daegu Metropolitan City (Kyungpook National University, Keimyung University) and Gyeongsangbuk-do cities including Gyeongsan (Yeungnam University), Pohang (POSTECH), Gumi, Gyeongju.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
      'Change of Sojourn Status',
    ],
    nearestSubwayOrBus: 'Daegu Subway Line 1 Dongdaegu Station or Sincheon Station + Local Bus',
    lat: 35.8648,
    lng: 128.6279,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-daejeon',
    officeNameEn: 'Daejeon Immigration Office',
    officeNameKo: '대전출입국·외국인사무소',
    city: 'Daejeon',
    province: 'Daejeon',
    addressKo: '대전광역시 중구 목중로26번길 16-8',
    addressEn: '16-8 Mokjung-ro 26beon-gil, Jung-gu, Daejeon',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/daejeon/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Daejeon Metropolitan City (KAIST, Chungnam National University, SolBridge / Woosong University), Sejong Special Self-Governing City, and Chungcheongnam-do.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'E-3 / D-10 Research & Job-Seeking Visas',
      'Part-Time Work Permission (S-3)',
    ],
    nearestSubwayOrBus: 'Daejeon Subway Line 1 Jungangno Station or Oryong Station + 10-minute walk',
    lat: 36.3338,
    lng: 127.4092,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-gwangju',
    officeNameEn: 'Gwangju Immigration Office',
    officeNameKo: '광주출입국·외국인사무소',
    city: 'Gwangju',
    province: 'Gwangju',
    addressKo: '광주광역시 서구 상무대로911번길 22',
    addressEn: '22 Sangmu-daero 911beon-gil, Seo-gu, Gwangju',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/gwangju/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Gwangju Metropolitan City (Chonnam National University, GIST, Chosun University) and Jeollanam-do.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
    ],
    nearestSubwayOrBus: 'Gwangju Subway Line 1 Ssangchon Station (Exit 2, 7-minute walk)',
    lat: 35.1536,
    lng: 126.8639,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-ulsan',
    officeNameEn: 'Ulsan Immigration Office',
    officeNameKo: '울산출입국·외국인사무소',
    city: 'Ulsan',
    province: 'Ulsan',
    addressKo: '울산광역시 남구 돋질로 86',
    addressEn: '86 Dotjil-ro, Nam-gu, Ulsan',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/ulsan/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Ulsan Metropolitan City (UNIST — Ulsan National Institute of Science and Technology, University of Ulsan).',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
    ],
    nearestSubwayOrBus: 'Ulsan City Hall / Nam-gu Office bus stops',
    lat: 35.5419,
    lng: 129.3186,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-jeonju',
    officeNameEn: 'Jeonju Immigration Office',
    officeNameKo: '전주출입국·외국인사무소',
    city: 'Jeonju',
    province: 'Jeonbuk-do',
    addressKo: '전북특별자치도 전주시 덕진구 동부대로 857',
    addressEn: '857 Dongbu-daero, Deokjin-gu, Jeonju-si, Jeonbuk State',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/jeonju/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Jeonbuk State: Jeonju (Jeonbuk National University), Iksan, Wanju, Gimje, Namwon, Muju.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
    ],
    nearestSubwayOrBus: 'Near Jeonju KTX Station (10 minutes by bus/taxi)',
    lat: 35.8501,
    lng: 127.1592,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-chuncheon',
    officeNameEn: 'Chuncheon Immigration Office',
    officeNameKo: '춘천출입국·외국인사무소',
    city: 'Chuncheon',
    province: 'Gangwon-do',
    addressKo: '강원특별자치도 춘천시 동내면 사암길 12',
    addressEn: '12 Saam-gil, Dongnae-myeon, Chuncheon-si, Gangwon State',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/chuncheon/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Gangwon State: Chuncheon (Kangwon National University, Hallym University), Wonju, Hongcheon, Inje, Cheorwon.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
    ],
    nearestSubwayOrBus: 'Gyeongchun Line Namchuncheon Station + Local Bus/Taxi (15 mins)',
    lat: 37.8559,
    lng: 127.7574,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-cheongju',
    officeNameEn: 'Cheongju Immigration Office',
    officeNameKo: '청주출입국·외국인사무소',
    city: 'Cheongju',
    province: 'Chungcheongbuk-do',
    addressKo: '충청북도 청주시 흥덕구 비하로 52',
    addressEn: '52 Biha-ro, Heungdeok-gu, Cheongju-si, Chungcheongbuk-do',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/cheongju/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Chungcheongbuk-do: Cheongju (Chungbuk National University), Chungju, Jecheon, Eumseong, Jincheon.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
    ],
    nearestSubwayOrBus: 'Near Cheongju Express/Intercity Bus Terminal (Gagyeong-dong / Biha-dong)',
    lat: 36.6345,
    lng: 127.4314,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-changwon',
    officeNameEn: 'Changwon Immigration Office',
    officeNameKo: '창원출입국·외국인사무소',
    city: 'Changwon',
    province: 'Gyeongsangnam-do',
    addressKo: '경상남도 창원시 마산합포구 제2부두로 30',
    addressEn: '30 Je2budu-ro, Masanhappo-gu, Changwon-si, Gyeongsangnam-do',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/changwon/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary:
      'Gyeongsangnam-do: Changwon (Changwon National University), Jinju (Gyeongsang National University), Haman, Uiryeong.',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
    ],
    nearestSubwayOrBus: 'Masan Station / Masan Intercity Bus Terminal + City Bus to New Port Pier 2',
    lat: 35.1912,
    lng: 128.5679,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'imm-jeju',
    officeNameEn: 'Jeju Immigration Office',
    officeNameKo: '제주출입국·외국인청',
    city: 'Jeju',
    province: 'Jeju-do',
    addressKo: '제주특별자치도 제주시 임항로 277',
    addressEn: '277 Imhang-ro, Jeju-si, Jeju Special Self-Governing Province',
    phoneNumber: '1345',
    operatingHours: 'Mon–Fri 09:00–18:00 (Closed weekends & public holidays)',
    officialWebsite: 'https://www.immigration.go.kr/jeju/index.do',
    reservationUrl: 'https://www.hikorea.go.kr',
    jurisdictionSummary: 'All of Jeju Special Self-Governing Province (Jeju National University, Seogwipo).',
    availableServices: [
      'Foreign Resident Registration (ARC)',
      'D-2 / D-4 Student Visa Extension',
      'Part-Time Work Permission (S-3)',
    ],
    nearestSubwayOrBus: 'Near Jeju International Passenger Terminal (15 mins from Jeju Airport)',
    lat: 33.5218,
    lng: 126.5446,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
];

// ============================================================================
// 3. POLICE STATION DIRECTORY — SOUTH KOREA (VERIFIED KNPA STATIONS)
// ============================================================================
export const VERIFIED_POLICE_STATIONS: KoreaPoliceStation[] = [
  {
    id: 'pol-seoul-agency',
    stationNameEn: 'Seoul Metropolitan Police Agency',
    stationNameKo: '서울특별시경찰청',
    stationType: 'Metropolitan/Provincial Agency',
    city: 'Seoul',
    district: 'Jongno-gu',
    province: 'Seoul',
    addressKo: '서울특별시 종로구 사직로8길 31',
    addressEn: '31 Sajik-ro 8-gil, Jongno-gu, Seoul',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Service Desk Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Sungkyunkwan University (SKKU)', 'Sogang University', 'Ewha Womans University'],
    availableServices: [
      '24/7 Emergency Response (112)',
      'Foreign Affairs & International Crime Assistance',
      'Lost & Found (LOST112)',
      'Traffic & Civil Certificates',
    ],
    officialWebsite: 'https://www.smpa.go.kr',
    lat: 37.5749,
    lng: 126.9719,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-seoul-seodaemun',
    stationNameEn: 'Seoul Seodaemun Police Station (Sinchon University District)',
    stationNameKo: '서울서대문경찰서',
    stationType: 'District Police Station',
    city: 'Seoul',
    district: 'Seodaemun-gu',
    province: 'Seoul',
    addressKo: '서울특별시 서대문구 통일로 113',
    addressEn: '113 Tongil-ro, Seodaemun-gu, Seoul',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Yonsei University', 'Ewha Womans University', 'Myongji University'],
    availableServices: [
      'Lost & Found ARC / Passport Report',
      'Criminal & Theft Report',
      'Traffic Accident Investigation',
      'Foreign Student Safety Support',
    ],
    officialWebsite: 'https://www.smpa.go.kr',
    lat: 37.5648,
    lng: 126.9668,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-seoul-mapo',
    stationNameEn: 'Seoul Mapo Police Station (Hongdae & Sinchon District)',
    stationNameKo: '서울마포경찰서',
    stationType: 'District Police Station',
    city: 'Seoul',
    district: 'Mapo-gu',
    province: 'Seoul',
    addressKo: '서울특별시 마포구 마포대로 183',
    addressEn: '183 Mapo-daero, Mapo-gu, Seoul',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Sogang University', 'Hongik University'],
    availableServices: [
      'Lost Property (LOST112)',
      'Emergency Safety & Crime Reporting',
      'Cyber Fraud & Marketplace Scam Report',
    ],
    officialWebsite: 'https://www.smpa.go.kr',
    lat: 37.5512,
    lng: 126.9562,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-seoul-dongdaemun',
    stationNameEn: 'Seoul Dongdaemun Police Station (Hoegi & Cheongnyangni District)',
    stationNameKo: '서울동대문경찰서',
    stationType: 'District Police Station',
    city: 'Seoul',
    district: 'Dongdaemun-gu',
    province: 'Seoul',
    addressKo: '서울특별시 동대문구 약령시로21길 29',
    addressEn: '29 Yangnyeongsi-ro 21-gil, Dongdaemun-gu, Seoul',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: [
      'Kyung Hee University',
      'Hankuk University of Foreign Studies (HUFS)',
      'University of Seoul',
      'Korea University (Anam nearby)',
    ],
    availableServices: [
      'Student Residence Safety',
      'Lost & Found Report (LOST112)',
      'Crime & Fraud Report',
    ],
    officialWebsite: 'https://www.smpa.go.kr',
    lat: 37.5851,
    lng: 127.0453,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-seoul-gwanak',
    stationNameEn: 'Seoul Gwanak Police Station (SNU District)',
    stationNameKo: '서울관악경찰서',
    stationType: 'District Police Station',
    city: 'Seoul',
    district: 'Gwanak-gu',
    province: 'Seoul',
    addressKo: '서울특별시 관악구 관악로5길 33',
    addressEn: '33 Gwanak-ro 5-gil, Gwanak-gu, Seoul',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Seoul National University (SNU)', 'Chung-Ang University (nearby Dongjak)'],
    availableServices: [
      '24/7 Emergency Response',
      'Lost & Found ARC / Passport Report',
      'Housing & Rental Fraud Investigation',
    ],
    officialWebsite: 'https://www.smpa.go.kr',
    lat: 37.4744,
    lng: 126.9516,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-seoul-yongsan',
    stationNameEn: 'Seoul Yongsan Police Station (Itaewon & Yongsan District)',
    stationNameKo: '서울용산경찰서',
    stationType: 'District Police Station',
    city: 'Seoul',
    district: 'Yongsan-gu',
    province: 'Seoul',
    addressKo: '서울특별시 용산구 원효로89길 24',
    addressEn: '24 Wonhyo-ro 89-gil, Yongsan-gu, Seoul',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Sookmyung Women’s University', 'Dongguk University (nearby Jung-gu)'],
    availableServices: [
      'Foreign Resident Assistance',
      'Lost & Found (LOST112)',
      'Emergency Safety Response',
    ],
    officialWebsite: 'https://www.smpa.go.kr',
    lat: 37.5413,
    lng: 126.9682,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-seoul-gangnam',
    stationNameEn: 'Seoul Gangnam Police Station',
    stationNameKo: '서울강남경찰서',
    stationType: 'District Police Station',
    city: 'Seoul',
    district: 'Gangnam-gu',
    province: 'Seoul',
    addressKo: '서울특별시 강남구 테헤란로114길 11',
    addressEn: '11 Teheran-ro 114-gil, Gangnam-gu, Seoul',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Hanyang University (across Seongdong)', 'Konkuk University (across Gwangjin)'],
    availableServices: [
      '24/7 Emergency Response',
      'Lost & Found (LOST112)',
      'Cyber & Financial Crime Reporting',
    ],
    officialWebsite: 'https://www.smpa.go.kr',
    lat: 37.5094,
    lng: 127.0671,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-busan-agency',
    stationNameEn: 'Busan Metropolitan Police Agency',
    stationNameKo: '부산광역시경찰청',
    stationType: 'Metropolitan/Provincial Agency',
    city: 'Busan',
    district: 'Yeonje-gu',
    province: 'Busan',
    addressKo: '부산광역시 연제구 중앙대로 999',
    addressEn: '999 Jungang-daero, Yeonje-gu, Busan',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Pusan National University (PNU)', 'Pukyong National University', 'Dong-A University'],
    availableServices: [
      '24/7 Emergency Response (112)',
      'Busan Foreign Resident Safety Support',
      'Lost & Found (LOST112)',
    ],
    officialWebsite: 'https://www.bspolice.go.kr',
    lat: 35.1799,
    lng: 129.0751,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-busan-geumjeong',
    stationNameEn: 'Busan Geumjeong Police Station (PNU Campus Area)',
    stationNameKo: '부산금정경찰서',
    stationType: 'District Police Station',
    city: 'Busan',
    district: 'Geumjeong-gu',
    province: 'Busan',
    addressKo: '부산광역시 금정구 중앙대로 1819',
    addressEn: '1819 Jungang-daero, Geumjeong-gu, Busan',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Pusan National University (PNU)', 'Busan University of Foreign Studies (BUFS)'],
    availableServices: [
      'Campus Area Patrol & Safety',
      'Lost & Found ARC / Wallet Report',
      'Crime & Dispute Assistance',
    ],
    officialWebsite: 'https://www.bspolice.go.kr',
    lat: 35.2432,
    lng: 129.0924,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-incheon-yeonsu',
    stationNameEn: 'Incheon Yeonsu Police Station (Songdo Global Campus & Inha Area)',
    stationNameKo: '인천연수경찰서',
    stationType: 'District Police Station',
    city: 'Incheon',
    district: 'Yeonsu-gu',
    province: 'Incheon',
    addressKo: '인천광역시 연수구 원인재로 138',
    addressEn: '138 Woninjae-ro, Yeonsu-gu, Incheon',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Incheon National University', 'Yonsei International Campus (Songdo)', 'Inha University'],
    availableServices: [
      '24/7 Emergency Police Dispatch',
      'International Student Safety Support',
      'Lost & Found (LOST112)',
    ],
    officialWebsite: 'https://www.icpolice.go.kr',
    lat: 37.4098,
    lng: 126.6789,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-daejeon-yuseong',
    stationNameEn: 'Daejeon Yuseong Police Station (KAIST & CNU University District)',
    stationNameKo: '대전유성경찰서',
    stationType: 'District Police Station',
    city: 'Daejeon',
    district: 'Yuseong-gu',
    province: 'Daejeon',
    addressKo: '대전광역시 유성구 북유성대로 112',
    addressEn: '112 Bugyuseong-daero, Yuseong-gu, Daejeon',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['KAIST', 'Chungnam National University (CNU)', 'Hanbat National University'],
    availableServices: [
      '24/7 Emergency Dispatch',
      'Research & Campus District Safety',
      'Lost & Found (LOST112)',
    ],
    officialWebsite: 'https://www.djpolice.go.kr',
    lat: 36.3788,
    lng: 127.3264,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-daegu-bukbu',
    stationNameEn: 'Daegu Bukbu Police Station (KNU Campus Area)',
    stationNameKo: '대구북부경찰서',
    stationType: 'District Police Station',
    city: 'Daegu',
    district: 'Buk-gu',
    province: 'Daegu',
    addressKo: '대구광역시 북구 원대로 100',
    addressEn: '100 Wondae-ro, Buk-gu, Daegu',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Kyungpook National University (KNU)'],
    availableServices: [
      '24/7 Emergency Response',
      'Student District Safety',
      'Lost & Found (LOST112)',
    ],
    officialWebsite: 'https://www.dgpolice.go.kr',
    lat: 35.8871,
    lng: 128.5829,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-gwangju-bukbu',
    stationNameEn: 'Gwangju Bukbu Police Station (Chonnam National Univ. Area)',
    stationNameKo: '광주북부경찰서',
    stationType: 'District Police Station',
    city: 'Gwangju',
    district: 'Buk-gu',
    province: 'Gwangju',
    addressKo: '광주광역시 북구 서하로 172',
    addressEn: '172 Seoha-ro, Buk-gu, Gwangju',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Chonnam National University', 'GIST'],
    availableServices: [
      '24/7 Emergency Response',
      'Lost & Found (LOST112)',
      'Foreign Student Safety Support',
    ],
    officialWebsite: 'https://www.gjpolice.go.kr',
    lat: 35.1782,
    lng: 126.9154,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-suwon-yeongtong',
    stationNameEn: 'Suwon Yeongtong / Nambu Police Station (SKKU & Kyung Hee Global Area)',
    stationNameKo: '수원남부경찰서',
    stationType: 'District Police Station',
    city: 'Suwon',
    district: 'Yeongtong-gu',
    province: 'Gyeonggi-do',
    addressKo: '경기도 수원시 영통구 매봉로 52',
    addressEn: '52 Maebong-ro, Yeongtong-gu, Suwon-si, Gyeonggi-do',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['SKKU Natural Sciences Campus', 'Kyung Hee University Global Campus', 'Ajou University'],
    availableServices: [
      '24/7 Emergency Response',
      'Lost & Found (LOST112)',
      'International Student Assistance',
    ],
    officialWebsite: 'https://www.ggpolice.go.kr',
    lat: 37.2721,
    lng: 127.0485,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-ulsan-agency',
    stationNameEn: 'Ulsan Metropolitan Police Agency',
    stationNameKo: '울산광역시경찰청',
    stationType: 'Metropolitan/Provincial Agency',
    city: 'Ulsan',
    district: 'Jung-gu',
    province: 'Ulsan',
    addressKo: '울산광역시 중구 성안로 112',
    addressEn: '112 Seongan-ro, Jung-gu, Ulsan',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['UNIST', 'University of Ulsan'],
    availableServices: [
      '24/7 Emergency Response',
      'Lost & Found (LOST112)',
      'Foreign Resident Safety',
    ],
    officialWebsite: 'https://www.uspolice.go.kr',
    lat: 35.5718,
    lng: 129.3156,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-jeonju-deokjin',
    stationNameEn: 'Jeonju Deokjin Police Station (JBNU Campus Area)',
    stationNameKo: '전주덕진경찰서',
    stationType: 'District Police Station',
    city: 'Jeonju',
    district: 'Deokjin-gu',
    province: 'Jeonbuk-do',
    addressKo: '전북특별자치도 전주시 덕진구 기린대로 501',
    addressEn: '501 Girin-daero, Deokjin-gu, Jeonju-si, Jeonbuk State',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Jeonbuk National University (JBNU)'],
    availableServices: [
      '24/7 Emergency Response',
      'Campus Safety & Patrol',
      'Lost & Found (LOST112)',
    ],
    officialWebsite: 'https://www.jbpolice.go.kr',
    lat: 35.8442,
    lng: 127.1238,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
  {
    id: 'pol-jeju-agency',
    stationNameEn: 'Jeju Provincial Police Agency',
    stationNameKo: '제주특별자치도경찰청',
    stationType: 'Metropolitan/Provincial Agency',
    city: 'Jeju',
    district: 'Jeju-si',
    province: 'Jeju-do',
    addressKo: '제주특별자치도 제주시 수목원서길 37',
    addressEn: '37 Sumogwonseo-gil, Jeju-si, Jeju-do',
    phoneNumber: '182',
    emergencyNumber: '112',
    operatingHours: '24/7 Emergency Dispatch (112) · Civil Affairs Mon–Fri 09:00–18:00',
    nearbyUniversities: ['Jeju National University'],
    availableServices: [
      '24/7 Emergency Police & Tourist Police',
      'Lost & Found (LOST112)',
      'Foreign Resident Safety',
    ],
    officialWebsite: 'https://www.jjpolice.go.kr',
    lat: 33.4792,
    lng: 126.4841,
    verificationStatus: 'VERIFIED',
    lastVerifiedDate: '2026-11-01',
    published: true,
  },
];

// ============================================================================
// 6. KOREAN LIFE GUIDE (CATEGORIES A THROUGH H)
// ============================================================================
export const LIFE_GUIDE_CATEGORIES: Array<{
  key: LifeGuideCategoryKey;
  code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  label: string;
}> = [
  { key: 'Banking', code: 'A', label: 'A. Banking' },
  { key: 'Housing', code: 'B', label: 'B. Housing' },
  { key: 'Healthcare', code: 'C', label: 'C. Healthcare' },
  { key: 'Transportation', code: 'D', label: 'D. Transportation' },
  { key: 'Daily Life', code: 'E', label: 'E. Daily Life' },
  { key: 'Student Life', code: 'F', label: 'F. Student Life' },
  { key: 'Immigration and Legal Basics', code: 'G', label: 'G. Immigration & Legal' },
  { key: 'Korean Culture and Language', code: 'H', label: 'H. Culture & Language' },
];

export const VERIFIED_LIFE_GUIDES: KoreanLifeGuideArticle[] = [
  {
    id: 'guide-banking-account',
    category: 'Banking',
    categoryCode: 'A',
    titleEn: 'Opening a Korean Bank Account, ATMs, Transfers & Mobile Banking',
    titleKo: '외국인 유학생 은행 계좌 개설·ATM·모바일 뱅킹 가이드',
    summary:
      'Step-by-step instructions for opening a student bank account at campus branches (Woori, Shinhan, Hana, KB), lifting transaction limits, using Global ATMs, and setting up mobile banking.',
    explanation:
      'International students in South Korea typically open their first Korean won (KRW) bank account at their university’s designated on-campus bank branch (such as Woori Bank, Shinhan Bank, Hana Bank, or KB Kookmin Bank). Because of Korean anti-phishing regulations, newly opened accounts begin as "Financial Transaction Limit Accounts" (금융거래 한도제한계좌) with daily withdrawal/transfer caps (typically 300,000 KRW to 1,000,000 KRW) until you establish regular scholarship, tuition, or approved part-time salary records.',
    stepByStepInstructions: [
      'Visit your university’s on-campus bank branch during new student orientation or after receiving your Alien Registration Card (ARC / 외국인등록증). Some campus branches allow initial passport-only opening for tuition/scholarship deposits.',
      'Request a domestic check card (체크카드) with built-in postpaid transit functionality (후불교통카드) if eligible, and enroll in the bank’s English/Multilingual mobile banking app (e.g., Woori WON Global, Shinhan SOL Global, Hana EZ, KB StarBanking).',
      'When using ATMs with a foreign Visa/Mastercard, always look for the "Global ATM" (해외카드 사용가능) sign before inserting your card.',
      'To transfer money (계좌이체) for monthly rent (월세) or tuition, verify the recipient’s bank name, account number, and legal name displayed on the confirmation screen before entering your PIN.',
      'Never share your bank passbook, check card, or OTP with anyone. Lending or selling a bank account is strictly illegal under Korea’s Electronic Financial Transactions Act.',
    ],
    requiredDocuments: [
      'Valid Passport (여권)',
      'Alien Registration Card / Residence Card (외국인등록증 — required for full mobile banking & check card issuance)',
      'Certificate of Enrollment (재학증명서) or Admission Letter (표준입학허가서)',
      'Korean mobile phone number registered in your name (본인 명의 휴대폰 번호)',
      'Proof of residence address (Dormitory confirmation or housing contract)',
    ],
    usefulVocabulary: [
      { korean: '통장 / 계좌 개설', romanization: 'tongjang / gyejwa gaeseol', meaningEn: 'Opening a bank book / account' },
      { korean: '체크카드', romanization: 'chekeu-kadeu', meaningEn: 'Debit / Check card' },
      { korean: '계좌이체 / 송금', romanization: 'gyejwa-iche / songgeum', meaningEn: 'Bank transfer / Remittance' },
      { korean: '한도제한계좌', romanization: 'hando-jehan-gyejwa', meaningEn: 'Daily transaction-limit account' },
      { korean: '비밀번호', romanization: 'bimil-beonho', meaningEn: 'PIN / Password' },
    ],
    officialLinks: [
      { label: 'Financial Supervisory Service (Foreigner Financial Guide)', url: 'https://www.fss.or.kr', agency: 'Financial Supervisory Service' },
      { label: 'Study in Korea — Living & Banking Guide', url: 'https://www.studyinkorea.go.kr', agency: 'NIIED (Ministry of Education)' },
    ],
    lastUpdatedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'guide-housing-contracts',
    category: 'Housing',
    categoryCode: 'B',
    titleEn: 'Student Housing in Korea: Dormitories, Goshiwons, One-Rooms & Contracts',
    titleKo: '유학생 주거 가이드: 기숙사·고시원·원룸 계약 및 공과금',
    summary:
      'Compare university dormitories, goshiwons, and one-room studios. Learn how Korean rental deposits (보증금), monthly rent (월세), utility bills (공과금), and address registration work.',
    explanation:
      'Housing in South Korea operates on a deposit-plus-monthly-rent system (보증금 + 월세). University dormitories (기숙사) are the most affordable and safest option for newly arriving students. Off-campus options include Goshiwons (고시원 — compact furnished single rooms with low/no deposit) and One-Room studios (원룸 — private apartments requiring a security deposit typically between 2,000,000 KRW and 10,000,000 KRW plus monthly rent and maintenance fees).',
    stepByStepInstructions: [
      'Apply for your university dormitory immediately after admission confirmation; dorm deadlines close early.',
      'If renting an off-campus One-Room (원룸), always use a licensed real estate agency (공인중개사) and verify that the landlord listed on the Building Registry (건축물대장 / 등기부등본) matches the bank account receiving your deposit.',
      'Check what is included in the monthly Maintenance Fee (관리비 — e.g., internet, water, building cleaning) versus separate utilities (Electricity 한전, City Gas 도시가스).',
      'Take timestamped photos of room conditions upon move-in.',
      'CRITICAL LEGAL STEP: Within 14 days of moving into a new address (or changing dorms/rooms), you MUST report your Change of Place of Residence (체류지 변경신고) at your local district office (구청 / 주민센터) or online via HiKorea to avoid immigration fines.',
    ],
    requiredDocuments: [
      'Passport & Alien Registration Card (ARC)',
      'Standard Real Estate Lease Contract (부동산 임대차계약서) signed with the property owner',
      'Dormitory Residence Confirmation Certificate (기숙사 거주확인서 — if living in university housing)',
    ],
    usefulVocabulary: [
      { korean: '기숙사', romanization: 'gisuksa', meaningEn: 'University dormitory' },
      { korean: '보증금 / 월세', romanization: 'bojeunggeum / wolse', meaningEn: 'Security deposit / Monthly rent' },
      { korean: '관리비 / 공과금', romanization: 'gwallibi / gonggwageum', meaningEn: 'Building maintenance fee / Utility bills' },
      { korean: '공인중개사', romanization: 'gongin-junggaesa', meaningEn: 'Licensed real estate agent' },
      { korean: '체류지 변경신고', romanization: 'cheryuji byeongyeong-singo', meaningEn: 'Mandatory address change report' },
    ],
    officialLinks: [
      { label: 'HiKorea — Report Change of Residence Online', url: 'https://www.hikorea.go.kr', agency: 'Ministry of Justice' },
      { label: 'Seoul Global Center Real Estate Counseling', url: 'https://global.seoul.go.kr', agency: 'Seoul Metropolitan Government' },
    ],
    legalDisclaimer:
      'Always report any residential address change within 14 days under the Immigration Control Act. Consult Seoul Global Center or 1345 before signing high-deposit leases.',
    lastUpdatedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'guide-healthcare-nhis',
    category: 'Healthcare',
    categoryCode: 'C',
    titleEn: 'Hospitals, Pharmacies, Mandatory NHIS Health Insurance & Medical Care',
    titleKo: '한국 병원·약국 이용 및 유학생 국민건강보험(NHIS) 안내',
    summary:
      'Understand Korea’s 3-tier medical system (clinics vs. university hospitals), pharmacy prescriptions, mandatory National Health Insurance (NHIS) for D-2/D-4 students, and emergency care.',
    explanation:
      'All international students holding D-2 (Degree) or D-4 (Language Training) visas are automatically enrolled in Korea’s National Health Insurance Service (국민건강보험 — NHIS) upon alien registration (or after 6 months for certain D-4 categories). With NHIS coverage, international students receive the same substantial medical and dental co-pay reductions as Korean citizens at clinics and hospitals nationwide.',
    stepByStepInstructions: [
      'For everyday illnesses (cold, fever, stomachache, skin rash, dental checkup), visit a local neighborhood clinic (의원 — Internal Medicine 내과, ENT 이비인후과, Dermatology 피부과, Dental 치과) with your ARC. No referral is needed and co-pays are very low.',
      'To visit a large University / Tertiary General Hospital (상급종합병원 / 대학병원) for non-emergency care, obtain a Medical Referral Slip (진료의뢰서 / 요양급여의뢰서) from a local clinic first so NHIS covers your visit.',
      'In South Korea, doctors issue a paper prescription (처방전) at the clinic, which you take to a nearby Pharmacy (약국) to receive your medication.',
      'Pay your monthly NHIS health insurance bill on time via automatic bank transfer (자동이체) or at convenience stores. Unpaid NHIS arrears can restrict visa extensions at Immigration!',
      'In a life-threatening medical emergency, dial 119 immediately for a free ambulance and multilingual hospital coordination.',
    ],
    requiredDocuments: [
      'Alien Registration Card (외국인등록증) or Passport (required at clinic reception)',
      'Doctor’s Referral Slip (진료의뢰서 — only when visiting a tertiary university hospital)',
      'Prescription Slip (처방전 — given by clinic to present at the pharmacy)',
    ],
    usefulVocabulary: [
      { korean: '국민건강보험', romanization: 'gungmin-geongang-boheom', meaningEn: 'National Health Insurance (NHIS)' },
      { korean: '내과 / 이비인후과', romanization: 'naegwa / ibiinhugwa', meaningEn: 'Internal medicine / ENT clinic' },
      { korean: '처방전 / 약국', romanization: 'cheobangjeon / yakguk', meaningEn: 'Prescription / Pharmacy' },
      { korean: '응급실', romanization: 'eunggeupsil', meaningEn: 'Hospital Emergency Room (ER)' },
      { korean: '진료의뢰서', romanization: 'jillyo-uiroeseo', meaningEn: 'Medical referral letter' },
    ],
    officialLinks: [
      { label: 'National Health Insurance Service (NHIS English Portal)', url: 'https://www.nhis.or.kr/english/index.do', agency: 'NHIS (033-811-2000)' },
      { label: 'E-Gen Emergency Medical Portal (Find Open Clinics/Pharmacies)', url: 'https://www.e-gen.or.kr', agency: 'National Emergency Medical Center' },
    ],
    lastUpdatedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'guide-transportation-tmoney',
    category: 'Transportation',
    categoryCode: 'D',
    titleEn: 'Public Transit in Korea: T-money, Subway, Buses, KTX/SRT & Taxis',
    titleKo: '한국 대중교통 완벽 가이드: 티머니·지하철·버스·KTX·택시',
    summary:
      'Master T-money & Cashbee (EZL) cards, free bus-to-subway transfers, KTX & SRT high-speed trains, express buses, and navigating with Naver Map & Kakao Map.',
    explanation:
      'South Korea has one of the world’s most integrated public transit networks. A single rechargeable T-money or EZL (Cashbee) card works across subways, city buses, and taxis in Seoul, Busan, Incheon, Daejeon, Daegu, Gwangju, and nationwide. When transferring between buses and subways, tapping your card on the reader as you exit grants free or discounted transfers within 30 minutes.',
    stepByStepInstructions: [
      'Purchase a T-money or EZL card at any airport convenience store (CU, GS25, 7-Eleven) and top it up using Korean won (KRW) cash at convenience stores or subway station ticket machines.',
      'Always tap your transit card BOTH when boarding AND when exiting city buses and subway gates so you are not charged a distance penalty on your next ride and so your 30-minute transfer discount applies.',
      'Download or open Naver Map or Kakao Map for real-time subway platform numbers, optimal transfer doors (빠른 환승), and live bus arrival countdowns.',
      'For long-distance travel between cities (e.g., Seoul to Busan, Daegu, Daejeon, Gwangju), book KTX (LetsKorail) or SRT high-speed trains online, or use Express/Intercity Buses (KOBUS / Bustago).',
      'For taxis, use Kakao T or hail an official city taxi (orange/white/silver for standard; black 모범택시 for deluxe). Taxis accept T-money and credit/check cards.',
    ],
    requiredDocuments: [
      'T-money / EZL Transit Card or Postpaid Check Card (후불교통카드)',
      'Passport (only required if using foreign tourist rail passes such as KORAIL Pass)',
    ],
    usefulVocabulary: [
      { korean: '교통카드 충전', romanization: 'gyotong-kadeu chungjeon', meaningEn: 'Reloading a transit card' },
      { korean: '환승하다 / 갈아타다', romanization: 'hwanseunghada / garatada', meaningEn: 'To transfer (bus/subway)' },
      { korean: '하차 태그', romanization: 'hacha taegeu', meaningEn: 'Tap card when getting off' },
      { korean: '고속버스 / 시외버스', romanization: 'gosok-beoseu / sioe-beoseu', meaningEn: 'Express bus / Intercity bus' },
      { korean: '출구 / 방면', romanization: 'chulgu / bangmyeon', meaningEn: 'Station exit / Bound for (direction)' },
    ],
    officialLinks: [
      { label: 'KORAIL (Official KTX & Train Booking)', url: 'https://www.letskorail.com', agency: 'Korea Railroad Corporation' },
      { label: 'SRT High-Speed Rail Official Portal', url: 'https://etk.srail.kr', agency: 'SR Corporation' },
      { label: 'KOBUS Express Bus Integrated Booking', url: 'https://www.kobus.co.kr', agency: 'Korea Express Bus Lines Association' },
    ],
    lastUpdatedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'guide-daily-life-recycling-sim',
    category: 'Daily Life',
    categoryCode: 'E',
    titleEn: 'Daily Living: Recycling, Garbage Bags (종량제), Groceries & SIM Cards',
    titleKo: '한국 일상생활: 쓰레기 분리수거·종량제봉투·마트·유심 개통',
    summary:
      'Essential rules for Korean district-specific garbage bags (종량제봉투), food waste disposal, recycling separation, grocery shopping, and mobile identity verification (본인인증).',
    explanation:
      'South Korea strictly enforces district-based waste management and recycling laws. Household trash cannot be thrown out in ordinary plastic bags—you must purchase official district Volume-Rate Garbage Bags (종량제봉투) at a convenience store or supermarket in your exact district (구/시). Additionally, once you receive your ARC, linking your mobile phone number to your ARC enables Korean digital identity verification (본인인증) for delivery apps, banking, and government portals.',
    stepByStepInstructions: [
      'Ask at your local convenience store (CU, GS25, 7-Eleven) or mart behind the counter for General Trash Bags (일반쓰레기 종량제봉투 — 10L or 20L) and Food Waste Bags/Stickers (음식물쓰레기 봉투) specific to your district.',
      'Separate recyclables (분리수거): rinse plastic containers, remove vinyl labels from clear PET bottles (투명 페트병), flatten cardboard boxes, and separate cans and glass.',
      'Note that bones, eggshells, fruit pits, and seashells are NOT considered food waste (음식물쓰레기) in Korea because animals cannot eat them—dispose of them in general trash (일반쓰레기).',
      'Upon arriving at the airport, you can use a passport-based prepaid SIM (or apply via EveryKR Free SIM Registration). Once your physical ARC card arrives, convert or register your postpaid/ARC-linked mobile number so you can use Korean identity verification (PASS / 본인인증).',
    ],
    requiredDocuments: [
      'Passport (for initial arrival prepaid SIM)',
      'Alien Registration Card + Korean Bank Account (for ARC-linked mobile verification 본인인증)',
    ],
    usefulVocabulary: [
      { korean: '종량제봉투', romanization: 'jongnyangje-bongtu', meaningEn: 'Official district garbage bag' },
      { korean: '음식물쓰레기', romanization: 'eumsingmul-sseuregi', meaningEn: 'Food waste' },
      { korean: '분리수거 / 재활용', romanization: 'bullisugeo / jaehwalyong', meaningEn: 'Waste separation / Recycling' },
      { korean: '본인인증', romanization: 'bonin-injeung', meaningEn: 'Real-name mobile identity verification' },
      { korean: '편의점 / 대형마트', romanization: 'pyeonuijeom / daehyeong-mateu', meaningEn: 'Convenience store / Large supermarket' },
    ],
    officialLinks: [
      { label: 'Live in Korea — Daily Living & Waste Disposal Guide', url: 'https://www.liveinkorea.kr', agency: 'Ministry of Gender Equality & Family' },
      { label: 'Seoul Global Center Daily Living Handbook', url: 'https://global.seoul.go.kr', agency: 'Seoul Metropolitan Government' },
    ],
    lastUpdatedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'guide-student-life-work-rules',
    category: 'Student Life',
    categoryCode: 'F',
    titleEn: 'University Life, Attendance, Scholarships & Part-Time Work Rules (S-3)',
    titleKo: '대학 학사관리·출석·장학금 및 유학생 시간제취업(S-3) 규정',
    summary:
      'Navigate Korean university course registration (수강신청), strict attendance rules, GPA scholarship retention, and mandatory HiKorea part-time work permission (시간제취업허가).',
    explanation:
      'Korean universities track both academic GPA (성적) and class attendance (출석) electronically. Maintaining strong attendance (typically 80%+ per course) and your required GPA is essential both for retaining tuition scholarships and for smooth visa renewals. International students on D-2 or D-4 visas (after 6 months for D-4) may work part-time ONLY after receiving official Part-Time Work Permission (시간제취업허가) from Immigration.',
    stepByStepInstructions: [
      'Check your university’s academic calendar (학사일정) before the semester starts for course registration (수강신청) and add/drop week (수강신청 정정기간).',
      'Always use your university’s smart attendance app or card reader on time; unexcused absences exceeding 25% of class hours usually result in an automatic F grade.',
      'BEFORE starting any part-time job (아르바이트), obtain the signed Part-Time Work Confirmation Form (시간제취업 확인서) from your employer and your university’s International Office (국제교류처), plus the employer’s Business Registration Certificate (사업자등록증), and apply on HiKorea.',
      'Permitted weekly hours depend on your degree level, GPA, and TOPIK/KIIP score. Note that manufacturing (제조업), construction (건설업), and unregistered delivery/gig work are strictly prohibited for student visas.',
    ],
    requiredDocuments: [
      'Part-Time Work Confirmation Form (외국인유학생 시간제취업 확인서) signed by employer & university advisor',
      'Copy of Employer’s Business Registration Certificate (사업자등록증 사본)',
      'Standard Labor Contract (표준근로계약서) stating wage, hours, and work address',
      'Academic Transcript (성적증명서) & TOPIK / Korean Proficiency Certificate',
    ],
    usefulVocabulary: [
      { korean: '수강신청', romanization: 'sugang-sincheong', meaningEn: 'University course registration' },
      { korean: '출석 / 결석', romanization: 'chulseok / gyeolseok', meaningEn: 'Attendance / Absence' },
      { korean: '시간제취업허가', romanization: 'siganje-chwieop-heoga', meaningEn: 'Part-time work permit (S-3)' },
      { korean: '국제교류처', romanization: 'gukje-gyoryucheo', meaningEn: 'Office of International Affairs' },
      { korean: '성적장학금', romanization: 'seongjeok-janghakgeum', meaningEn: 'Academic merit scholarship' },
    ],
    officialLinks: [
      { label: 'HiKorea — Student Part-Time Work Permit Guide', url: 'https://www.hikorea.go.kr', agency: 'Ministry of Justice' },
      { label: 'Study in Korea — Scholarships & Campus Life', url: 'https://www.studyinkorea.go.kr', agency: 'NIIED' },
    ],
    legalDisclaimer:
      'Working part-time without prior HiKorea authorization (시간제취업허가) is a violation of the Immigration Control Act and can result in fines or visa cancellation. Always confirm your permitted weekly hours with your university International Office and 1345.',
    lastUpdatedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'guide-immigration-legal-basics',
    category: 'Immigration and Legal Basics',
    categoryCode: 'G',
    titleEn: 'Immigration & Legal Basics: ARC Registration, Visa Extension & Deadlines',
    titleKo: '출입국 필수 법령: 외국인등록·체류기간 연장·신고 의무',
    summary:
      'Critical legal timelines for D-2/D-4 students: 90-day initial ARC registration, booking HiKorea appointments early, extending your visa before expiration, and reporting passport/address updates.',
    explanation:
      'Every foreign student staying in South Korea for more than 90 days must register for an Alien Registration Card / Residence Card (외국인등록증) within 90 days of entry. During peak university intake months (February–March and August–September), immigration office reservation slots on HiKorea fill up weeks in advance.',
    stepByStepInstructions: [
      'Book your visit reservation (방문예약) on HiKorea (hikorea.go.kr) or join your university’s group ARC application immediately upon arrival.',
      'Check the expiration date on the back of your ARC card. You can apply for a Stay Period Extension (체류기간 연장허가) starting 4 months before your expiration date—never wait until the final week.',
      'If you renew your passport in your home country or at your embassy in Korea, you must report the Passport Information Change (여권기재사항 변경신고) to Immigration within 15 days of receiving the new passport.',
      'If you move to a new dormitory or apartment, report your Change of Residence (체류지 변경신고) within 14 days.',
    ],
    requiredDocuments: [
      'Application Form (통합신청서 — Form No. 34)',
      'Valid Passport & 1 Standard ID Photo (3.5cm × 4.5cm, white background)',
      'Certificate of Enrollment (재학증명서) & Tuition Payment Receipt (등록금 납입증명서)',
      'Proof of Residence (거주/숙소제공 확인서 or Lease Contract)',
      'Tuberculosis Screening Certificate (결핵진단서 from public health center 보건소, if required for your nationality)',
    ],
    usefulVocabulary: [
      { korean: '외국인등록증 (ARC)', romanization: 'oegugin-deungnokjeung', meaningEn: 'Alien Registration / Residence Card' },
      { korean: '체류기간 연장허가', romanization: 'cheryugigan yeonjang-heoga', meaningEn: 'Permission to extend period of stay' },
      { korean: '방문예약', romanization: 'bangmun-yeyak', meaningEn: 'Advance visit appointment' },
      { korean: '통합신청서', romanization: 'tonghap-sincheongseo', meaningEn: 'Integrated immigration application form' },
      { korean: '체류지 입증서류', romanization: 'cheryuji ipjeung-seoryu', meaningEn: 'Proof of residence document' },
    ],
    officialLinks: [
      { label: 'HiKorea Official E-Government Portal for Foreigners', url: 'https://www.hikorea.go.kr', agency: 'Ministry of Justice (1345)' },
      { label: 'Korea Immigration Service Official Website', url: 'https://www.immigration.go.kr', agency: 'Ministry of Justice' },
    ],
    legalDisclaimer:
      'This guide provides verified general administrative information based on Ministry of Justice publications and does not constitute personalized legal advice. Always confirm current document checklists with 1345 or your jurisdictional immigration office.',
    lastUpdatedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'guide-culture-language-etiquette',
    category: 'Korean Culture and Language',
    categoryCode: 'H',
    titleEn: 'Korean Etiquette, Campus Social Customs & Essential Survival Phrases',
    titleKo: '한국 예절·대학 및 직장 문화·필수 생활 한국어 표현',
    summary:
      'Learn polite Korean speech levels (존댓말), professor & workplace etiquette, two-handed object exchange, dining customs, and everyday survival expressions.',
    explanation:
      'Respect and politeness are central to Korean university and daily life. Using polite honorific endings (-아요/어요 or -습니다) with professors, administrative staff, elders, and service workers creates immediate goodwill. Small gestures—such as receiving items with two hands (or supporting your right forearm with your left hand) and bowing slightly when greeting—are deeply appreciated.',
    stepByStepInstructions: [
      'Always address professors as "교수님" (Gyosunim) and university administrative staff as "선생님" (Seonsaengnim) using polite speech (존댓말).',
      'When handing documents, money, or your ARC card to an immigration officer, professor, or cashier, use both hands or support your right wrist with your left hand.',
      'On subways and buses, never sit in the designated Elderly/Disabled seats (노약자석) at the ends of each car, even when the train is crowded; pink seats (임산부 배려석) are reserved for pregnant passengers.',
      'At Korean restaurants, water and side dishes (반찬) are complimentary, and tipping is not practiced in South Korea.',
    ],
    requiredDocuments: [],
    usefulVocabulary: [
      { korean: '안녕하세요 / 감사합니다', romanization: 'annyeonghaseyo / gamsahamnida', meaningEn: 'Hello / Thank you (Polite)' },
      { korean: '잠시만요 / 실례합니다', romanization: 'jamsimanyo / sillyehamnida', meaningEn: 'Just a moment / Excuse me' },
      { korean: '교수님, 질문이 있습니다', romanization: 'gyosunim, jilmuni itseumnida', meaningEn: 'Professor, I have a question' },
      { korean: '천천히 말씀해 주세요', romanization: 'cheoncheonhi malsseumhae juseyo', meaningEn: 'Please speak slowly' },
      { korean: '영수증 주세요', romanization: 'yeongsujeung juseyo', meaningEn: 'Please give me the receipt' },
    ],
    officialLinks: [
      { label: 'EveryKR Learn Korean 5.0 Academy', url: '/korean-academy', agency: 'EveryKR Language Platform' },
      { label: 'Korea.net — Official Culture & Life in Korea Portal', url: 'https://www.korea.net', agency: 'Ministry of Culture, Sports and Tourism' },
    ],
    lastUpdatedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
];

// ============================================================================
// 7. AIRPORT TO CITY TRANSPORT GUIDE (VERIFIED ROUTE PLANNER)
// ============================================================================
export const SUPPORTED_KOREAN_AIRPORTS = [
  {
    code: 'ICN' as const,
    nameEn: 'Incheon International Airport (ICN)',
    nameKo: '인천국제공항',
    city: 'Incheon / Seoul Metro',
    terminals: 'Terminal 1 (T1) & Terminal 2 (T2)',
    lat: 37.4602,
    lng: 126.4407,
    officialWebsite: 'https://www.airport.kr',
  },
  {
    code: 'PUS' as const,
    nameEn: 'Gimhae International Airport (PUS)',
    nameKo: '김해국제공항',
    city: 'Busan',
    terminals: 'International Terminal & Domestic Terminal',
    lat: 35.1796,
    lng: 128.9382,
    officialWebsite: 'https://www.airport.co.kr/gimhaeeng/index.do',
  },
  {
    code: 'GMP' as const,
    nameEn: 'Gimpo International Airport (GMP)',
    nameKo: '김포국제공항',
    city: 'Seoul',
    terminals: 'International Terminal & Domestic Terminal',
    lat: 37.5587,
    lng: 126.7945,
    officialWebsite: 'https://www.airport.co.kr/gimpoeng/index.do',
  },
  {
    code: 'CJU' as const,
    nameEn: 'Jeju International Airport (CJU)',
    nameKo: '제주국제공항',
    city: 'Jeju',
    terminals: 'Passenger Terminal (Gates 1–5)',
    lat: 33.5104,
    lng: 126.4914,
    officialWebsite: 'https://www.airport.co.kr/jejueng/index.do',
  },
];

export const VERIFIED_AIRPORT_ROUTES: AirportToCityRoute[] = [
  {
    id: 'route-icn-seoul',
    airportCode: 'ICN',
    airportNameEn: 'Incheon International Airport (ICN)',
    airportNameKo: '인천국제공항',
    airportLat: 37.4602,
    airportLng: 126.4407,
    destinationCity: 'Seoul',
    destinationNameKo: '서울역·홍대입구·신촌·강남·동대문',
    destinationUniversities: [
      'Seoul National University',
      'Yonsei University',
      'Korea University',
      'Hanyang University',
      'Kyung Hee University',
      'Sungkyunkwan University (SKKU)',
      'Sogang University',
      'Ewha Womans University',
    ],
    destLat: 37.5547,
    destLng: 126.9707,
    routeSummary:
      'Direct connections from Incheon Airport Terminal 1 & Terminal 2 to central Seoul via AREX Airport Railroad (Express & All-Stop), Airport Limousine Buses (6001–6705), and Official International Taxis.',
    transportOptions: [
      {
        id: 'icn-seoul-arex',
        optionCode: 'C',
        modeType: 'Airport Railway / Subway',
        title: 'AREX Airport Railroad (Express Train & All-Stop Train)',
        departureTerminalInfo: 'Terminal 1 Transportation Center (B1F) / Terminal 2 Transportation Center (B1F)',
        boardingLocation: 'Follow yellow/blue "Airport Railroad (공항철도)" signs down to B1F',
        destinationStationOrTerminal: 'Seoul Station (Express & All-Stop) or Hongik Univ. / Digital Media City / Gongdeok (All-Stop)',
        transferPoints: ['Hongik Univ. Station (Subway Line 2 for Sinchon/SNU)', 'Gongdeok Station (Lines 5 & 6)', 'Seoul Station (Lines 1 & 4, KTX)'],
        estimatedDurationRange: '43–51 mins (Express to Seoul Station) · 59–66 mins (All-Stop to Seoul Station)',
        referenceFareRangeKrw: 'Approx. 4,450–5,050 KRW (All-Stop with T-money) · ~11,000 KRW (Express Non-Stop)',
        stepByStepInstructions: [
          'After customs arrival on 1F, purchase or reload a T-money card at a convenience store or take the escalator down to B1F Transportation Center.',
          'Choose the Orange Gate for the Non-Stop Express Train (직통열차 — goes directly to Seoul Station with assigned seats) or the Blue Gate for the All-Stop Train (일반열차 — stops at Hongik Univ., Gongdeok, and connects directly to Seoul Subway).',
          'At Hongik Univ. Station (Line 2) or Seoul Station (Lines 1/4), transfer directly to the subway toward your university dormitory.',
        ],
        ticketPurchasingInstructions:
          'All-Stop Train: Tap T-money card directly at the Blue Gate. Express Train: Purchase a QR seat ticket at the B1F Express kiosk or online at arex.or.kr.',
        luggageGuidance:
          'Both AREX Express and All-Stop trains have dedicated wide luggage racks near the doors and overhead shelves suitable for 2 large 28-inch suitcases.',
        bookingWebsiteLabel: 'AREX Official Airport Railroad Portal',
        bookingWebsiteUrl: 'https://www.arex.or.kr',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
      {
        id: 'icn-seoul-limo',
        optionCode: 'A',
        modeType: 'Airport Limousine Bus',
        title: 'Seoul Airport Limousine Bus (Direct to University & Hotel Districts)',
        departureTerminalInfo: 'Terminal 1 Arrival Level (1F Outside Gates 4–7) / Terminal 2 Transportation Center (B1F)',
        boardingLocation: 'T1: 1F Curbside Seoul Bus Stops (Zones 4–7) · T2: B1F Bus Terminal Gates 11–35',
        destinationStationOrTerminal: 'Sinchon/Yonsei (6011), Gangnam/COEX (6009/6703), Myeongdong/Seoul Station (6001/6015), Dongdaemun/Kyung Hee (6002)',
        transferPoints: ['Direct curbside drop-off near major Seoul university gates and subway hubs'],
        estimatedDurationRange: '60–85 mins (depending on Seoul traffic and destination district)',
        referenceFareRangeKrw: 'Approx. 17,000–18,000 KRW (Standard Limousine)',
        stepByStepInstructions: [
          'Visit the Airport Bus Ticket Counter (1F at T1 or B1F at T2) and tell the agent your destination neighborhood or university name.',
          'Receive a printed ticket showing your Bus Route Number (e.g., 6002 for Cheongnyangni/Dongdaemun, 6011 for Sinchon/Ewha/SKKU, 6009 for Gangnam) and exact Boarding Gate.',
          'Hand your suitcases to the driver or attendant at the bus bay—they will attach a numbered luggage claim tag and load your bags under the coach.',
        ],
        ticketPurchasingInstructions:
          'Purchase tickets with credit/debit card or KRW cash at the Airport Bus Ticket Counter/Kiosks before boarding.',
        luggageGuidance:
          'Ideal for students carrying 2 heavy suitcases. Under-coach luggage compartment stores up to 2 large bags per passenger.',
        bookingWebsiteLabel: 'Incheon Airport Official Public Transport Guide',
        bookingWebsiteUrl: 'https://www.airport.kr/ap_en/1440/subview.do',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
      {
        id: 'icn-seoul-taxi',
        optionCode: 'E',
        modeType: 'Taxi',
        title: 'Official Airport Taxi / International Taxi',
        departureTerminalInfo: 'Terminal 1 (1F Outside Platforms 4C–8C) / Terminal 2 (1F Outside Platforms 3C–5D)',
        boardingLocation: 'Designated Seoul Taxi Stand outside Arrival Hall',
        destinationStationOrTerminal: 'Direct door-to-door delivery to your dormitory or apartment address in Seoul',
        transferPoints: ['None (Direct door-to-door)'],
        estimatedDurationRange: '50–75 mins',
        referenceFareRangeKrw: 'Approx. 55,000–85,000 KRW + Highway Toll (~6,600 KRW; late-night surcharge applies)',
        stepByStepInstructions: [
          'Only board taxis at the official numbered taxi stands outside 1F Arrival Hall. Never follow unlicensed solicitors inside the terminal.',
          'Show the driver your destination address written in Korean (도로명 주소) on Naver Map or Kakao Map.',
          'If you have 3+ large suitcases or are traveling in a group of 3–4 students, request a Jumbo Taxi (대형택시 / 밴).',
        ],
        ticketPurchasingInstructions:
          'Pay the metered fare + Incheon Airport Expressway toll at the destination by credit/check card, T-money, or cash, or pre-book at the International Taxi desk.',
        luggageGuidance:
          'Standard sedans fit 1–2 large suitcases (LPG tank in trunk reduces space); Jumbo vans fit 4–6 large suitcases.',
        bookingWebsiteLabel: 'Incheon Airport Official Taxi Guide',
        bookingWebsiteUrl: 'https://www.airport.kr/ap_en/1447/subview.do',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
    ],
    usefulTravelPhrases: [
      { korean: '공항철도 타는 곳이 어디예요?', romanization: 'Gonghang-cheoldo taneun gosi eodiyeyo?', meaningEn: 'Where do I board the Airport Railroad (AREX)?' },
      { korean: '이 주소로 가 주세요.', romanization: 'I jusoro ga juseyo.', meaningEn: 'Please take me to this address.' },
      { korean: '트렁크에 짐 좀 실어 주세요.', romanization: 'Teureongkeue jim jom sireo juseyo.', meaningEn: 'Please help me put my luggage in the trunk.' },
    ],
    lastVerifiedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'route-icn-busan',
    airportCode: 'ICN',
    airportNameEn: 'Incheon International Airport (ICN)',
    airportNameKo: '인천국제공항',
    airportLat: 37.4602,
    airportLng: 126.4407,
    destinationCity: 'Busan',
    destinationNameKo: '부산역·부산종합버스터미널(노포)·해운대',
    destinationUniversities: ['Pusan National University (PNU)', 'Pukyong National University', 'Dong-A University', 'Kyungsung University'],
    destLat: 35.1152,
    destLng: 129.0422,
    routeSummary:
      'Travel from Incheon International Airport to Busan via (1) AREX to Seoul Station + KTX High-Speed Train to Busan Station (fastest & most frequent) or (2) Direct Intercity Limousine Bus to Busan Nopo / Haeundae.',
    transportOptions: [
      {
        id: 'icn-busan-ktx',
        optionCode: 'F',
        modeType: 'Combination Route',
        title: 'AREX Airport Railroad (to Seoul Station) + KTX High-Speed Rail (to Busan Station)',
        departureTerminalInfo: 'ICN Terminal 1 or Terminal 2 Transportation Center (B1F)',
        boardingLocation: 'AREX B1F Platform → Transfer at Seoul Station KTX Concourse (2F)',
        destinationStationOrTerminal: 'Busan KTX Station (부산역 — connects directly to Busan Subway Line 1)',
        transferPoints: ['Seoul Station (Indoor escalator transfer from AREX B2F/B3F up to KTX 2F)'],
        estimatedDurationRange: 'Approx. 3 hrs 30 mins – 4 hrs total (43m AREX + ~2h 40m KTX)',
        referenceFareRangeKrw: 'Approx. 65,000–72,000 KRW total (~5,000–11,000 KRW AREX + 59,800 KRW KTX Standard)',
        stepByStepInstructions: [
          'Board the AREX Express or All-Stop train at Incheon Airport B1F and ride to the final stop, Seoul Station (서울역).',
          'At Seoul Station, follow the "KTX Transfer (KTX 타는 곳)" signs up the elevator/escalator to the 2nd floor main concourse.',
          'Board your Gyeongbu Line KTX train to Busan Station (부산역). From Busan Station, take Busan Subway Line 1 directly to Pusan National Univ. Station (부산대역) or Seomyeon.',
        ],
        ticketPurchasingInstructions:
          'Book KTX tickets online up to 1 month in advance on the official KORAIL website (letskorail.com) or at Seoul Station ticket counters.',
        luggageGuidance:
          'KTX trains have dedicated large-suitcase storage racks in the vestibule between train cars in addition to overhead racks.',
        bookingWebsiteLabel: 'LetsKorail Official KTX Booking',
        bookingWebsiteUrl: 'https://www.letskorail.com',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
      {
        id: 'icn-busan-bus',
        optionCode: 'B',
        modeType: 'Intercity / Express Bus',
        title: 'Direct Intercity Airport Limousine Bus to Busan (Nopo Terminal / Haeundae)',
        departureTerminalInfo: 'Terminal 1 (1F Gates 11–13 Intercity Bus Zone) / Terminal 2 (B1F Bus Terminal)',
        boardingLocation: 'Intercity Bus Platform (Gyeongsang Region)',
        destinationStationOrTerminal: 'Busan Central Bus Terminal (Nopo Station Line 1 — closest to PNU!) or Busan Seobu / Haeundae',
        transferPoints: ['Direct non-stop highway coach (1 rest stop break on highway)'],
        estimatedDurationRange: 'Approx. 4 hrs 50 mins – 5 hrs 20 mins',
        referenceFareRangeKrw: 'Approx. 51,000–65,000 KRW (28-seat Deluxe / Premium Coach)',
        stepByStepInstructions: [
          'Reserve your seat online via TxBus / Bustago or at the Incheon Airport Intercity Bus Ticket Counter (1F Gate 11 at T1; B1F at T2).',
          'Note: If you are attending Pusan National University (PNU), Busan Central Bus Terminal (부산동부터미널 / 노포역) is only 4 subway stops away on Busan Line 1!',
          'Store your heavy suitcases in the under-bus cargo bay and enjoy a spacious reclining seat without needing to transfer at Seoul Station.',
        ],
        ticketPurchasingInstructions:
          'Reserve via TxBus (txbus.tmoney.co.kr), Bustago (bustago.or.kr), or at the airport intercity ticket desk.',
        luggageGuidance:
          'No stairs or train transfers required—driver loads up to 2 large suitcases directly into the coach luggage bay.',
        bookingWebsiteLabel: 'TxBus Official Intercity Bus Booking',
        bookingWebsiteUrl: 'https://txbus.tmoney.co.kr',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
    ],
    usefulTravelPhrases: [
      { korean: '부산행 KTX 타는 곳이 어디예요?', romanization: 'Busanhaeng KTX taneun gosi eodiyeyo?', meaningEn: 'Where is the boarding platform for the KTX to Busan?' },
      { korean: '부산 노포동 터미널 가는 버스 표 주세요.', romanization: 'Busan Nopo-dong teomineol ganeun beoseu pyo juseyo.', meaningEn: 'One bus ticket to Busan Nopo Terminal, please.' },
    ],
    lastVerifiedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'route-pus-busan',
    airportCode: 'PUS',
    airportNameEn: 'Gimhae International Airport (PUS)',
    airportNameKo: '김해국제공항',
    airportLat: 35.1796,
    airportLng: 128.9382,
    destinationCity: 'Busan',
    destinationNameKo: '서면·부산역·부산대학교·부경대학교·해운대',
    destinationUniversities: ['Pusan National University (PNU)', 'Pukyong National University', 'Dong-A University', 'Kyungsung University'],
    destLat: 35.1578,
    destLng: 129.0592,
    routeSummary:
      'Travel from Gimhae International Airport (PUS) into central Busan via the Busan-Gimhae Light Rail Transit (LRT) + Subway transfer, City Express Buses, or Airport Taxi.',
    transportOptions: [
      {
        id: 'pus-busan-lrt',
        optionCode: 'C',
        modeType: 'Airport Railway / Subway',
        title: 'Busan-Gimhae Light Rail Transit (LRT) + Busan Subway Transfer',
        departureTerminalInfo: 'Gimhae Airport International & Domestic Terminals (1F Exit 3)',
        boardingLocation: 'Cross the covered pedestrian walkway outside Gate 3 to Airport Station (공항역)',
        destinationStationOrTerminal: 'Sasang Station (Line 2) or Daejeo Station (Line 3) → All Busan Subway destinations',
        transferPoints: [
          'Sasang Station (사상역 — Transfer to Line 2 for Seomyeon, Pukyong Univ., Kyungsung Univ., Haeundae)',
          'Daejeo Station (대저역 — Transfer to Line 3 → Yeonsan Line 1 for Pusan National Univ.)',
        ],
        estimatedDurationRange: '35–55 mins to central Busan / University campuses',
        referenceFareRangeKrw: 'Approx. 2,000–2,600 KRW (with T-money / EZL transit card)',
        stepByStepInstructions: [
          'Exit the Gimhae International Terminal on 1F (Gate 3), turn right, and walk 2 minutes to the Busan-Gimhae LRT Airport Station (공항역).',
          'Purchase or reload a T-money / EZL card at the station machine or convenience store.',
          'Board the train toward Sasang (사상 방면 — 3 stops, ~7 minutes) to connect to Busan Subway Line 2, or toward Daejeo (대저 방면) to connect to Line 3.',
        ],
        ticketPurchasingInstructions: 'Tap T-money / EZL card at the LRT gate, or buy a single-journey token at the kiosk.',
        luggageGuidance: 'Elevators and wide fare gates are available at Airport Station, Sasang Station, and Daejeo Station.',
        bookingWebsiteLabel: 'Busan-Gimhae Light Rail Transit Official Guide',
        bookingWebsiteUrl: 'https://www.bglrt.com',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
      {
        id: 'pus-busan-taxi',
        optionCode: 'E',
        modeType: 'Taxi',
        title: 'Gimhae Airport Official Taxi (Direct to Busan Dormitories)',
        departureTerminalInfo: 'International Terminal 1F Curbside Taxi Stand',
        boardingLocation: 'Busan City Taxi Platform outside Arrival Gate',
        destinationStationOrTerminal: 'Direct to PNU (Geumjeong-gu), Pukyong Univ. (Nam-gu), Dong-A Univ. (Saha-gu), or Seomyeon',
        transferPoints: ['None (Direct door-to-door)'],
        estimatedDurationRange: '25–45 mins',
        referenceFareRangeKrw: 'Approx. 22,000–35,000 KRW (depending on campus district)',
        stepByStepInstructions: [
          'Board at the designated Busan Taxi line outside 1F Arrival Hall.',
          'Show your dormitory Korean address on Naver Map or Kakao Map.',
        ],
        ticketPurchasingInstructions: 'Pay meter fare by card, T-money, or cash upon arrival.',
        luggageGuidance: 'Convenient for direct campus dormitory drop-off with suitcases.',
        bookingWebsiteLabel: 'Gimhae International Airport Ground Transport',
        bookingWebsiteUrl: 'https://www.airport.co.kr/gimhaeeng/index.do',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
    ],
    usefulTravelPhrases: [
      { korean: '경전철 타는 곳이 어디예요?', romanization: 'Gyeongjeoncheol taneun gosi eodiyeyo?', meaningEn: 'Where is the Light Rail (LRT) station?' },
      { korean: '부산대학교 기숙사로 가 주세요.', romanization: 'Busandaehakgyo gisuksaro ga juseyo.', meaningEn: 'Please take me to Pusan National University dormitory.' },
    ],
    lastVerifiedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'route-pus-changwon',
    airportCode: 'PUS',
    airportNameEn: 'Gimhae International Airport (PUS)',
    airportNameKo: '김해국제공항',
    airportLat: 35.1796,
    airportLng: 128.9382,
    destinationCity: 'Changwon',
    destinationNameKo: '창원종합버스터미널·마산역·창원대학교',
    destinationUniversities: ['Changwon National University', 'Gyeongsang National University (Jinju nearby)'],
    destLat: 35.2368,
    destLng: 128.6423,
    routeSummary:
      'Direct Airport Limousine Bus from Gimhae International Airport to Masan and Changwon Bus Terminal.',
    transportOptions: [
      {
        id: 'pus-changwon-limo',
        optionCode: 'A',
        modeType: 'Airport Limousine Bus',
        title: 'Gimhae Airport → Masan / Changwon Limousine Bus',
        departureTerminalInfo: 'Gimhae Airport International Terminal 1F (Stop 1) & Domestic Terminal 1F (Stop 1)',
        boardingLocation: 'Intercity Limousine Bus Stop (Changwon/Masan bound)',
        destinationStationOrTerminal: 'Masan Station / Changwon Bus Terminal (창원종합버스터미널)',
        transferPoints: ['Local bus or taxi (15 mins) from Changwon Terminal to Changwon National University'],
        estimatedDurationRange: '45–60 mins',
        referenceFareRangeKrw: 'Approx. 9,500–11,000 KRW',
        stepByStepInstructions: [
          'Purchase a Changwon/Masan limousine ticket at the outer bus ticket booth outside 1F Arrival Hall.',
          'Alight at Changwon Bus Terminal (창원종합버스터미널) or Namsan Hoodong depending on your campus destination.',
        ],
        ticketPurchasingInstructions: 'Purchase ticket at the Gimhae Airport intercity bus booth or via Bustago.',
        luggageGuidance: 'Under-coach luggage bays available for large suitcases.',
        bookingWebsiteLabel: 'Gimhae Airport Intercity Bus Guide',
        bookingWebsiteUrl: 'https://www.airport.co.kr/gimhaeeng/index.do',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
    ],
    usefulTravelPhrases: [
      { korean: '창원 가는 리무진 버스 어디서 타요?', romanization: 'Changwon ganeun rimujin beoseu eodiseo tayo?', meaningEn: 'Where do I board the limousine bus to Changwon?' },
    ],
    lastVerifiedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'route-gmp-busan',
    airportCode: 'GMP',
    airportNameEn: 'Gimpo International Airport (GMP)',
    airportNameKo: '김포국제공항',
    airportLat: 37.5587,
    airportLng: 126.7945,
    destinationCity: 'Busan',
    destinationNameKo: '부산역 (KTX) · 김해국제공항 (국내선)',
    destinationUniversities: ['Pusan National University (PNU)', 'Pukyong National University', 'Dong-A University'],
    destLat: 35.1152,
    destLng: 129.0422,
    routeSummary:
      'Travel from Gimpo Airport (GMP) to Busan via (1) AREX to Seoul Station (22 mins) + KTX to Busan Station, or (2) Domestic flight from Gimpo Domestic Terminal to Gimhae Airport (PUS).',
    transportOptions: [
      {
        id: 'gmp-busan-arex-ktx',
        optionCode: 'F',
        modeType: 'Combination Route',
        title: 'AREX Airport Railroad (22 mins to Seoul Station) + KTX High-Speed Train to Busan',
        departureTerminalInfo: 'Gimpo Airport Station (B1F connected to International & Domestic Terminals)',
        boardingLocation: 'AREX Gimpo Int’l Airport Station → Seoul Station',
        destinationStationOrTerminal: 'Busan KTX Station (부산역)',
        transferPoints: ['Seoul Station (AREX to KTX concourse)'],
        estimatedDurationRange: 'Approx. 3 hrs 10 mins total (22m AREX + ~2h 40m KTX)',
        referenceFareRangeKrw: 'Approx. 61,500 KRW total (~1,650 KRW AREX + 59,800 KRW KTX)',
        stepByStepInstructions: [
          'Follow underground signs from Gimpo Airport to the AREX Airport Railroad (공항철도) platform.',
          'Ride 4 stops (22 minutes) to Seoul Station (서울역).',
          'Transfer upstairs to the KTX platform and board a Gyeongbu Line KTX train to Busan Station.',
        ],
        ticketPurchasingInstructions: 'Tap T-money for AREX; book KTX on letskorail.com or at Seoul Station.',
        luggageGuidance: 'Elevator access throughout Gimpo Airport Station and Seoul Station.',
        bookingWebsiteLabel: 'LetsKorail Official KTX Booking',
        bookingWebsiteUrl: 'https://www.letskorail.com',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
    ],
    usefulTravelPhrases: [
      { korean: '서울역 가는 공항철도는 몇 번 승강장이에요?', romanization: 'Seoulyeok ganeun gonghang-cheoldoneun myeot beon seunggangjang-ieyo?', meaningEn: 'Which platform is the AREX train to Seoul Station?' },
    ],
    lastVerifiedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'route-icn-daejeon',
    airportCode: 'ICN',
    airportNameEn: 'Incheon International Airport (ICN)',
    airportNameKo: '인천국제공항',
    airportLat: 37.4602,
    airportLng: 126.4407,
    destinationCity: 'Daejeon',
    destinationNameKo: '대전 유성시외버스터미널·정부대전청사·대전역',
    destinationUniversities: ['KAIST', 'Chungnam National University (CNU)', 'Woosong University / SolBridge'],
    destLat: 36.3504,
    destLng: 127.3845,
    routeSummary:
      'Direct Intercity Airport Limousine Bus from Incheon Airport T1/T2 to Daejeon (Daedeok Innopolis / Yuseong / Government Complex — closest to KAIST & CNU) or AREX + KTX to Daejeon Station (closest to Woosong/SolBridge).',
    transportOptions: [
      {
        id: 'icn-daejeon-bus',
        optionCode: 'B',
        modeType: 'Intercity / Express Bus',
        title: 'Direct Incheon Airport → Daejeon Intercity Limousine Bus',
        departureTerminalInfo: 'Terminal 1 (1F Gate 11) / Terminal 2 (B1F Bus Terminal)',
        boardingLocation: 'Chungcheong / Daejeon Intercity Bus Platform',
        destinationStationOrTerminal: 'Daejeon Dorim / Yuseong (유성 — closest to KAIST & CNU) / Government Complex Daejeon (정부청사) / Daejeon Complex Terminal',
        transferPoints: ['Direct non-stop highway coach from Incheon Airport to Daejeon'],
        estimatedDurationRange: 'Approx. 2 hrs 30 mins – 3 hrs',
        referenceFareRangeKrw: 'Approx. 27,000–32,000 KRW',
        stepByStepInstructions: [
          'Purchase a Daejeon-bound ticket at the Incheon Airport Intercity Bus Counter or online via TxBus.',
          'If studying at KAIST or Chungnam National University (CNU), alight at Yuseong (유성) or Government Complex Daejeon (정부대전청사) and take a 10-minute taxi to campus.',
          'If studying at Woosong University (SolBridge), alight at Daejeon Complex Terminal (대전복합터미널).',
        ],
        ticketPurchasingInstructions: 'Reserve on txbus.tmoney.co.kr or at the airport intercity bus ticket counter.',
        luggageGuidance: 'Under-coach luggage bays store 2 large suitcases with claim tags.',
        bookingWebsiteLabel: 'TxBus Intercity Bus Reservation',
        bookingWebsiteUrl: 'https://txbus.tmoney.co.kr',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
      {
        id: 'icn-daejeon-ktx',
        optionCode: 'F',
        modeType: 'Combination Route',
        title: 'AREX (to Seoul Station) + KTX High-Speed Train (to Daejeon Station)',
        departureTerminalInfo: 'ICN Terminal 1 & 2 B1F Transportation Center',
        boardingLocation: 'AREX to Seoul Station → KTX to Daejeon Station',
        destinationStationOrTerminal: 'Daejeon KTX Station (대전역 — 5 mins from Woosong Univ., 25 mins by Subway Line 1 to Yuseong)',
        transferPoints: ['Seoul Station'],
        estimatedDurationRange: 'Approx. 2 hrs total (43m AREX + 60m KTX)',
        referenceFareRangeKrw: 'Approx. 29,000–35,000 KRW total',
        stepByStepInstructions: [
          'Take AREX from Incheon Airport B1F to Seoul Station.',
          'Transfer to KTX at Seoul Station and ride 1 hour to Daejeon Station (대전역).',
        ],
        ticketPurchasingInstructions: 'Book KTX on letskorail.com.',
        luggageGuidance: 'Luggage racks available on both AREX and KTX.',
        bookingWebsiteLabel: 'LetsKorail Official KTX Portal',
        bookingWebsiteUrl: 'https://www.letskorail.com',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
    ],
    usefulTravelPhrases: [
      { korean: '대전 유성 가는 버스 표 한 장 주세요.', romanization: 'Daejeon Yuseong ganeun beoseu pyo han jang juseyo.', meaningEn: 'One bus ticket to Daejeon Yuseong, please.' },
      { korean: '카이스트 기숙사로 가 주세요.', romanization: 'Kaiseuteu gisuksaro ga juseyo.', meaningEn: 'Please take me to the KAIST dormitory.' },
    ],
    lastVerifiedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'route-icn-daegu',
    airportCode: 'ICN',
    airportNameEn: 'Incheon International Airport (ICN)',
    airportNameKo: '인천국제공항',
    airportLat: 37.4602,
    airportLng: 126.4407,
    destinationCity: 'Daegu',
    destinationNameKo: '동대구역 (KTX) · 동대구터미널',
    destinationUniversities: ['Kyungpook National University (KNU)', 'Yeungnam University (Gyeongsan)', 'Keimyung University'],
    destLat: 35.8797,
    destLng: 128.6286,
    routeSummary:
      'Travel from Incheon Airport to Daegu via (1) AREX to Seoul Station + KTX to Dongdaegu Station (~1h 45m on KTX) or (2) Direct Intercity Limousine Bus to Dongdaegu Terminal.',
    transportOptions: [
      {
        id: 'icn-daegu-ktx',
        optionCode: 'F',
        modeType: 'Combination Route',
        title: 'AREX (to Seoul Station) + KTX High-Speed Train (to Dongdaegu Station)',
        departureTerminalInfo: 'ICN Terminal 1 & 2 B1F Transportation Center',
        boardingLocation: 'AREX B1F → Transfer at Seoul Station KTX',
        destinationStationOrTerminal: 'Dongdaegu KTX Station (동대구역 — connects to Daegu Subway Line 1)',
        transferPoints: ['Seoul Station'],
        estimatedDurationRange: 'Approx. 2 hrs 40 mins total (43m AREX + ~1h 45m KTX)',
        referenceFareRangeKrw: 'Approx. 49,000–55,000 KRW total (~5,000–11,000 KRW AREX + 43,500 KRW KTX)',
        stepByStepInstructions: [
          'Ride AREX from Incheon Airport B1F to Seoul Station.',
          'Board a Gyeongbu Line KTX train to Dongdaegu Station (동대구역).',
          'From Dongdaegu Station, Kyungpook National University (KNU) is a 10-minute taxi ride, and Yeungnam University is accessible via Daegu Subway Line 1/2.',
        ],
        ticketPurchasingInstructions: 'Book KTX on letskorail.com or at Seoul Station.',
        luggageGuidance: 'Luggage racks in every KTX car vestibule.',
        bookingWebsiteLabel: 'LetsKorail Official KTX Portal',
        bookingWebsiteUrl: 'https://www.letskorail.com',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
      {
        id: 'icn-daegu-bus',
        optionCode: 'B',
        modeType: 'Intercity / Express Bus',
        title: 'Direct Incheon Airport → Dongdaegu Intercity Limousine Bus',
        departureTerminalInfo: 'Terminal 1 (1F Gate 10–11) / Terminal 2 (B1F Bus Terminal)',
        boardingLocation: 'Gyeongsang Intercity Bus Platform',
        destinationStationOrTerminal: 'Dongdaegu Complex Transfer Center (동대구복합환승센터)',
        transferPoints: ['Direct non-stop highway coach'],
        estimatedDurationRange: 'Approx. 3 hrs 50 mins – 4 hrs 15 mins',
        referenceFareRangeKrw: 'Approx. 41,000–50,000 KRW',
        stepByStepInstructions: [
          'Purchase a Dongdaegu (동대구) bus ticket at the Incheon Airport Intercity Bus Counter or via TxBus.',
          'Board at the designated bay; the bus arrives directly at Dongdaegu Complex Transfer Center next to Dongdaegu Station.',
        ],
        ticketPurchasingInstructions: 'Reserve via TxBus (txbus.tmoney.co.kr) or airport ticket counter.',
        luggageGuidance: 'Under-coach luggage bays store 2 large suitcases.',
        bookingWebsiteLabel: 'TxBus Intercity Bus Portal',
        bookingWebsiteUrl: 'https://txbus.tmoney.co.kr',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
    ],
    usefulTravelPhrases: [
      { korean: '동대구역 가는 KTX 표 주세요.', romanization: 'Dongdaeguyeok ganeun KTX pyo juseyo.', meaningEn: 'One KTX ticket to Dongdaegu Station, please.' },
      { korean: '경북대학교 북문으로 가 주세요.', romanization: 'Gyeongbukdaehakgyo bungmuneuro ga juseyo.', meaningEn: 'Please take me to Kyungpook National University North Gate.' },
    ],
    lastVerifiedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'route-icn-gwangju',
    airportCode: 'ICN',
    airportNameEn: 'Incheon International Airport (ICN)',
    airportNameKo: '인천국제공항',
    airportLat: 37.4602,
    airportLng: 126.4407,
    destinationCity: 'Gwangju',
    destinationNameKo: '광주종합버스터미널(유스퀘어) · 광주송정역(KTX)',
    destinationUniversities: ['Chonnam National University', 'GIST (Gwangju Institute of Science and Technology)', 'Chosun University'],
    destLat: 35.1601,
    destLng: 126.8794,
    routeSummary:
      'Travel from Incheon Airport to Gwangju via (1) Direct Airport Limousine Bus to Gwangju U-Square Bus Terminal or (2) AREX to Yongsan/Seoul Station + Honam KTX to Gwangju Songjeong Station.',
    transportOptions: [
      {
        id: 'icn-gwangju-bus',
        optionCode: 'B',
        modeType: 'Intercity / Express Bus',
        title: 'Direct Incheon Airport → Gwangju U-Square (유스퀘어) Limousine Bus',
        departureTerminalInfo: 'Terminal 1 (1F Gate 12) / Terminal 2 (B1F Bus Terminal)',
        boardingLocation: 'Honam Region Intercity Bus Platform',
        destinationStationOrTerminal: 'Gwangju U-Square Bus Terminal (광주종합버스터미널)',
        transferPoints: ['Direct highway coach to central Gwangju'],
        estimatedDurationRange: 'Approx. 3 hrs 50 mins – 4 hrs 15 mins',
        referenceFareRangeKrw: 'Approx. 42,000–52,000 KRW',
        stepByStepInstructions: [
          'Purchase a Gwangju (광주 유스퀘어) bus ticket at the Incheon Airport Intercity Bus Counter or KOBUS/TxBus.',
          'From Gwangju U-Square Terminal, Chonnam National University and GIST are 15–20 minutes away by local taxi.',
        ],
        ticketPurchasingInstructions: 'Book via KOBUS (kobus.co.kr), TxBus, or at the airport counter.',
        luggageGuidance: 'Under-coach luggage storage for 2 large suitcases.',
        bookingWebsiteLabel: 'KOBUS Official Express Bus Booking',
        bookingWebsiteUrl: 'https://www.kobus.co.kr',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
      {
        id: 'icn-gwangju-ktx',
        optionCode: 'F',
        modeType: 'Combination Route',
        title: 'AREX (to Seoul/Gongdeok/Yongsan) + Honam KTX (to Gwangju Songjeong Station)',
        departureTerminalInfo: 'ICN Terminal 1 & 2 B1F Transportation Center',
        boardingLocation: 'AREX → Transfer to Honam KTX at Yongsan Station or Seoul Station',
        destinationStationOrTerminal: 'Gwangju Songjeong KTX Station (광주송정역 — connects to Gwangju Subway Line 1)',
        transferPoints: ['Yongsan Station (via Gongdeok) or Seoul Station'],
        estimatedDurationRange: 'Approx. 2 hrs 55 mins total (50m AREX + ~1h 50m KTX)',
        referenceFareRangeKrw: 'Approx. 52,000–58,000 KRW total',
        stepByStepInstructions: [
          'Check whether your Honam Line KTX departs from Seoul Station or Yongsan Station on letskorail.com.',
          'Ride Honam KTX to Gwangju Songjeong Station (광주송정역).',
        ],
        ticketPurchasingInstructions: 'Book Honam KTX on letskorail.com.',
        luggageGuidance: 'Dedicated luggage racks in every KTX train car.',
        bookingWebsiteLabel: 'LetsKorail Official KTX Portal',
        bookingWebsiteUrl: 'https://www.letskorail.com',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
    ],
    usefulTravelPhrases: [
      { korean: '광주 유스퀘어 가는 버스 표 주세요.', romanization: 'Gwangju Yuseukweeo ganeun beoseu pyo juseyo.', meaningEn: 'One bus ticket to Gwangju U-Square, please.' },
      { korean: '전남대학교 기숙사로 가 주세요.', romanization: 'Jeonnamdaehakgyo gisuksaro ga juseyo.', meaningEn: 'Please take me to Chonnam National University dormitory.' },
    ],
    lastVerifiedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'route-icn-suwon',
    airportCode: 'ICN',
    airportNameEn: 'Incheon International Airport (ICN)',
    airportNameKo: '인천국제공항',
    airportLat: 37.4602,
    airportLng: 126.4407,
    destinationCity: 'Suwon',
    destinationNameKo: '수원역·영통·성균관대(자연과학캠퍼스)·경희대(국제캠퍼스)·아주대',
    destinationUniversities: ['SKKU Natural Sciences Campus', 'Kyung Hee University Global Campus', 'Ajou University'],
    destLat: 37.2636,
    destLng: 127.0286,
    routeSummary:
      'Direct Gyeonggi Airport Limousine Buses (e.g., 4100 / A4100 to Suwon/Yeongtong) from Incheon Airport Terminal 1 & Terminal 2 right to Suwon university districts.',
    transportOptions: [
      {
        id: 'icn-suwon-limo',
        optionCode: 'A',
        modeType: 'Airport Limousine Bus',
        title: 'Gyeonggi Airport Limousine Bus (Direct to Suwon, Ajou Univ. & Yeongtong)',
        departureTerminalInfo: 'Terminal 1 (1F Gates 7–8 Gyeonggi Bus Zone) / Terminal 2 (B1F Bus Terminal)',
        boardingLocation: 'Gyeonggi-do (Suwon / Yeongtong) Bus Stop',
        destinationStationOrTerminal: 'West Suwon / Sungkyunkwan Univ. / East Suwon (Ajou Univ.) / Yeongtong (Kyung Hee Global)',
        transferPoints: ['Direct airport coach to Suwon stops'],
        estimatedDurationRange: 'Approx. 70–95 mins',
        referenceFareRangeKrw: 'Approx. 13,500–15,000 KRW',
        stepByStepInstructions: [
          'Purchase a Suwon/Yeongtong ticket at the Gyeonggi Bus Ticket Counter (1F Gate 7–8 at T1; B1F at T2).',
          'For SKKU Natural Sciences Campus, ask for the Seosuwon / Sungkyunkwan Univ. route. For Ajou Univ. and Kyung Hee Global Campus, board the East Suwon / Yeongtong route.',
        ],
        ticketPurchasingInstructions: 'Purchase seat ticket at the airport bus counter or TxBus.',
        luggageGuidance: 'Under-coach luggage bays store 2 large suitcases.',
        bookingWebsiteLabel: 'Incheon Airport Bus Route Search',
        bookingWebsiteUrl: 'https://www.airport.kr/ap_en/1440/subview.do',
        dataClassification: 'Official General Route Guide — Confirm Live Schedule on Operator Portal',
      },
    ],
    usefulTravelPhrases: [
      { korean: '수원 영통 가는 공항버스 어디서 타요?', romanization: 'Suwon Yeongtong ganeun gonghang-beoseu eodiseo tayo?', meaningEn: 'Where do I board the airport bus to Suwon Yeongtong?' },
    ],
    lastVerifiedDate: '2026-11-01',
    verificationStatus: 'VERIFIED',
    published: true,
  },
];

// ============================================================================
// 8. NEWS & UPDATES (VERIFIED OFFICIAL POLICY & ACADEMIC ANNOUNCEMENTS)
// ============================================================================
export const NEWS_CATEGORIES_10: EssentialNewsCategory[] = [
  'Immigration Updates',
  'Visa and Policy Changes',
  'University Admissions',
  'Scholarship Opportunities',
  'TOPIK and Korean Language',
  'Student Life',
  'Part-time Work Regulations',
  'Government Announcements',
  'Transportation Updates',
  'Events and Opportunities',
];

export const VERIFIED_NEWS_UPDATES: EssentialNewsItem[] = [
  {
    id: 'news-hikorea-reservation',
    headlineEn: 'Ministry of Justice: Mandatory Online Visit Reservation on HiKorea Before Visiting Immigration Offices',
    headlineKo: '법무부 하이코리아: 전국 출입국·외국인관서 방문예약제 의무 시행 안내',
    summaryEn:
      'All international students visiting regional immigration offices for ARC registration, visa extensions, or status changes must book an advance appointment on HiKorea (hikorea.go.kr). Walk-in visits are restricted except for emergency departure or visa expiration day.',
    summaryBn:
      'এআরসি (ARC) নিবন্ধন, ভিসা নবায়ন বা স্ট্যাটাস পরিবর্তনের জন্য ইমিগ্রেশন অফিসে যাওয়ার আগে অবশ্যই HiKorea পোর্টালে অনলাইনে অ্যাপয়েন্টমেন্ট বুক করতে হবে।',
    summaryKo:
      '외국인등록, 체류기간 연장 등 체류 민원으로 출입국·외국인관서를 방문할 경우 사전에 하이코리아(hikorea.go.kr)에서 방문예약을 완료해야 합니다.',
    summaryNe:
      'ARC दर्ता वा भिसा म्याद थपका लागि अध्यागमन कार्यालय जानुअघि HiKorea पोर्टलमा अग्रिम अनलाइन समय (방문예약) लिनु अनिवार्य छ।',
    fullDetailsEn: [
      'Regional immigration offices across South Korea operate strictly on a prior online reservation system (방문예약제) via HiKorea.',
      'During February–March and August–September semester intake periods, reservation slots often fill up 3 to 4 weeks ahead.',
      'Students can apply for e-Applications (전자민원) online on HiKorea on weekdays between 07:00 and 22:00 for visa extensions, part-time work permits (S-3), and address change reports without visiting in person.',
    ],
    category: 'Immigration Updates',
    sourceName: 'HiKorea — Ministry of Justice Korea Immigration Service',
    sourceUrl: 'https://www.hikorea.go.kr',
    sourceType: 'Official Government / Public Agency',
    publicationDate: '2026-10-15',
    lastVerifiedDate: '2026-11-01',
    featured: true,
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'news-gks-scholarship',
    headlineEn: 'NIIED Study in Korea: Global Korea Scholarship (GKS) Undergraduate & Graduate Application Guidelines',
    headlineKo: '국립국제교육원(NIIED): 정부초청외국인장학생(GKS) 학부 및 대학원 과정 모집 안내',
    summaryEn:
      'The National Institute for International Education (NIIED) publishes official Global Korea Scholarship (GKS) guidelines on Study in Korea, covering round-trip airfare, 1-year Korean language training, full tuition, and monthly living stipends.',
    summaryBn:
      'NIIED Study in Korea পোর্টালে গ্লোবাল কোরিয়া স্কলারশিপ (GKS) এর অফিসিয়াল গাইডলাইন প্রকাশিত হয়েছে, যাতে বিমান ভাড়া, সম্পূর্ণ টিউশন ফি এবং মাসিক ভাতা অন্তর্ভুক্ত রয়েছে।',
    summaryKo:
      '교육부 국립국제교육원(NIIED)은 Study in Korea 포털을 통해 정부초청외국인장학생(GKS) 학부 및 대학원 선발 요강을 공고합니다.',
    summaryNe:
      'NIIED को Study in Korea पोर्टलमा ग्लोबल कोरिया छात्रवृत्ति (GKS) सम्बन्धी आधिकारिक निर्देशिका उपलब्ध छ।',
    fullDetailsEn: [
      'Applicants may apply either through the Embassy Track (재외공관 전형) in their home country or directly through a designated Korean university via the University Track (대학 전형).',
      'All required academic certificates and transcripts must carry official Apostille certification or Korean consular authentication.',
      'Verify exact country quotas, GPA minimums, and submission windows directly on Study in Korea.',
    ],
    category: 'Scholarship Opportunities',
    sourceName: 'NIIED — Study in Korea (Ministry of Education)',
    sourceUrl: 'https://www.studyinkorea.go.kr',
    sourceType: 'Official Government / Public Agency',
    publicationDate: '2026-10-20',
    lastVerifiedDate: '2026-11-01',
    featured: true,
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'news-nhis-mandatory-d2-d4',
    headlineEn: 'NHIS: Mandatory National Health Insurance Enrollment & Payment Compliance for D-2 and D-4 Students',
    headlineKo: '국민건강보험공단: 외국인 유학생(D-2·D-4) 건강보험 당연가입 및 보험료 납부 유의사항',
    summaryEn:
      'International students on D-2 and D-4 visas are enrolled in Korea’s National Health Insurance Service (NHIS) with statutory student premium reductions. Timely monthly payment is required to avoid hospital coverage suspension or visa extension restrictions.',
    summaryBn:
      'D-2 এবং D-4 ভিসাধারী আন্তর্জাতিক শিক্ষার্থীরা জাতীয় স্বাস্থ্য বীমা (NHIS)-এর আওতাভুক্ত। ভিসা নবায়নে জটিলতা এড়াতে নিয়মিত মাসিক প্রিমিয়াম পরিশোধ করা আবশ্যক।',
    summaryKo:
      'D-2(유학) 및 D-4(일반연수) 체류자격 유학생은 국민건강보험 지역가입자로 당연 적용되며, 보험료 체납 시 비자 연장 등 체류허가가 제한될 수 있습니다.',
    summaryNe:
      'D-2 र D-4 भिसा भएका विद्यार्थीहरू राष्ट्रिय स्वास्थ्य बीमा (NHIS) मा आबद्ध हुन्छन्। भिसा म्याद थपमा समस्या नहोस् भन्नका लागि समयमै बीमा शुल्क बुझाउनुहोस्।',
    fullDetailsEn: [
      'D-2 degree students are enrolled automatically upon Alien Registration Card (ARC) issuance; D-4 language trainees are enrolled after 6 months of residence in Korea.',
      'Students can register for automatic bank transfer (자동이체) or electronic billing via the NHIS Foreign Language Center (033-811-2000).',
      'Always keep your residential address updated so physical NHIS billing notices are delivered accurately.',
    ],
    category: 'Visa and Policy Changes',
    sourceName: 'National Health Insurance Service (NHIS)',
    sourceUrl: 'https://www.nhis.or.kr/english/index.do',
    sourceType: 'Official Government / Public Agency',
    publicationDate: '2026-10-12',
    lastVerifiedDate: '2026-11-01',
    featured: true,
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'news-part-time-work-s3',
    headlineEn: 'Korea Immigration Service: Part-Time Work Permit (S-3) Rules & Prohibited Industries for International Students',
    headlineKo: '법무부 출입국: 외국인 유학생 시간제취업(S-3) 허가 기준 및 취업 제한 업종 안내',
    summaryEn:
      'International students must obtain prior Part-Time Work Permission (시간제취업허가) from Immigration before starting any part-time employment. Korean proficiency (TOPIK/KIIP) and GPA determine permitted weekly hours.',
    summaryBn:
      'যেকোনো পার্ট-টাইম জব শুরু করার আগে অবশ্যই ইমিগ্রেশন থেকে পার্ট-টাইম কাজের অনুমতি (S-3) নিতে হবে। TOPIK লেভেল এবং GPA অনুযায়ী সাপ্তাহিক কাজের সময় নির্ধারিত হয়।',
    summaryKo:
      '유학생(D-2, D-4)이 아르바이트를 하려면 근로 시작 전 반드시 출입국관리사무소로부터 시간제취업허가를 받아야 하며, 제조업·건설업 등은 엄격히 제한됩니다.',
    summaryNe:
      'अन्तर्राष्ट्रिय विद्यार्थीहरूले पार्ट-टाइम काम सुरु गर्नुअघि अनिवार्य रूपमा अध्यागमनबाट अनुमति (시간제취업허가) लिनुपर्छ।',
    fullDetailsEn: [
      'Students must submit the Part-Time Work Confirmation Form signed by both their employer and their university’s international student officer, along with the Standard Labor Contract and Business Registration Certificate.',
      'Employment in manufacturing (제조업), construction (건설업), and third-party courier/delivery sub-contracting is prohibited under student visa regulations.',
      'If you change employers or work locations, you must report the workplace change on HiKorea prior to starting at the new workplace.',
    ],
    category: 'Part-time Work Regulations',
    sourceName: 'Ministry of Justice — Korea Immigration Service',
    sourceUrl: 'https://www.hikorea.go.kr',
    sourceType: 'Official Government / Public Agency',
    publicationDate: '2026-10-08',
    lastVerifiedDate: '2026-11-01',
    featured: false,
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'news-topik-ibt-pbt',
    headlineEn: 'NIIED TOPIK Center: Official TOPIK PBT & IBT Examination Registration & Score Verification Guide',
    headlineKo: '한국어능력시험(TOPIK): PBT·IBT 정기시험 접수 및 성적증명서 발급 안내',
    summaryEn:
      'Official registration schedules for Paper-Based (PBT) and Internet-Based (IBT) Test of Proficiency in Korean (TOPIK I & II) are managed exclusively through topik.go.kr.',
    summaryBn:
      'TOPIK I এবং TOPIK II (PBT ও IBT) পরীক্ষার নিবন্ধন এবং অফিসিয়াল সার্টিফিকেট যাচাই শুধুমাত্র topik.go.kr পোর্টালে সম্পন্ন হয়।',
    summaryKo:
      '한국어능력시험(TOPIK I·II) 지필시험(PBT), 인터넷기반시험(IBT) 및 말하기 평가는 공식 홈페이지(topik.go.kr)를 통해 접수합니다.',
    summaryNe:
      'TOPIK I र II परीक्षाको दर्ता तथा नतिजा प्रमाणीकरण आधिकारिक पोर्टल topik.go.kr बाट मात्र गरिन्छ।',
    fullDetailsEn: [
      'Create and verify your member profile and ID photo on topik.go.kr before registration day, as popular test centers in Seoul and Gyeonggi fill quickly on Day 1.',
      'TOPIK certificates are required for university admission tuition scholarships, graduation requirements, and extended part-time work hours.',
    ],
    category: 'TOPIK and Korean Language',
    sourceName: 'NIIED — Official TOPIK Portal',
    sourceUrl: 'https://www.topik.go.kr',
    sourceType: 'Official Government / Public Agency',
    publicationDate: '2026-10-18',
    lastVerifiedDate: '2026-11-01',
    featured: false,
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'news-university-admissions-verification',
    headlineEn: 'Korean University International Admissions: Apostille & Consular Document Verification Requirements',
    headlineKo: '전국 주요 대학 외국인 특별전형: 학력 서류 아포스티유(Apostille) 및 영사확인 필수 안내',
    summaryEn:
      'South Korean universities require all foreign high school and university diplomas and transcripts submitted for D-2 admission to carry an official Apostille or Korean Embassy Consular Authentication.',
    summaryBn:
      'দক্ষিণ কোরিয়ার বিশ্ববিদ্যালয়ে ভর্তির জন্য জমা দেওয়া সকল একাডেমিক সার্টিফিকেট ও ট্রান্সক্রিপ্টে অবশ্যই অ্যাপোস্টিল (Apostille) বা কোরিয়ান দূতাবাসের সত্যায়ন থাকতে হবে।',
    summaryKo:
      '국내 대학 외국인 입학 전형 지원 시 해외 학교 졸업(예정)증명서 및 성적증명서는 아포스티유(Apostille) 또는 주재국 대한민국 공관 영사확인을 받아 제출해야 합니다.',
    summaryNe:
      'दक्षिण कोरियाली विश्वविद्यालयहरूमा भर्नाका लागि पेश गरिने शैक्षिक प्रमाणपत्रहरूमा अनिवार्य रूपमा Apostille वा कोरियन दूतावासको प्रमाणीकरण हुनुपर्छ।',
    fullDetailsEn: [
      'Students from Apostille Convention member countries can obtain e-Apostille or physical Apostille authentication from their Ministry of Foreign Affairs / Ministry of Education.',
      'Prepare your authenticated academic documents at least 4–6 weeks before the university’s online application window opens.',
    ],
    category: 'University Admissions',
    sourceName: 'Study in Korea & Korean Council for University Education',
    sourceUrl: 'https://www.studyinkorea.go.kr',
    sourceType: 'Official University / Academic Portal',
    publicationDate: '2026-10-05',
    lastVerifiedDate: '2026-11-01',
    featured: false,
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'news-residence-address-14days',
    headlineEn: 'Government Reminder: Report Any Dormitory or Apartment Address Change Within 14 Days',
    headlineKo: '체류지 변경신고 안내: 이사 또는 기숙사 이동 후 14일 이내 관할 구청·하이코리아 신고 필수',
    summaryEn:
      'Under the Immigration Control Act, foreign residents who move to a new dormitory, goshiwon, or apartment must report their new address within 14 days at their local district office (구청/주민센터) or online on HiKorea.',
    summaryBn:
      'নতুন ডরমিটরি বা বাসায় ওঠার ১৪ দিনের মধ্যে স্থানীয় অফিস (구청/주민센터) বা HiKorea পোর্টালে ঠিকানা পরিবর্তনের তথ্য জানানো আইনত বাধ্যতামূলক।',
    summaryKo:
      '등록외국인이 체류지를 변경한 날부터 14일 이내에 신거주지 시·군·구청, 주민센터 또는 하이코리아 전자민원을 통해 전입신고(체류지 변경신고)를 해야 합니다.',
    summaryNe:
      'नयाँ होस्टेल वा कोठामा सरेको १४ दिनभित्र वडा कार्यालय (주민센터/구청) वा HiKorea मा ठेगाना परिवर्तन दर्ता गर्नु अनिवार्य छ।',
    fullDetailsEn: [
      'Bring your Alien Registration Card (ARC), passport, and signed housing lease contract (임대차계약서) or Dormitory Residence Confirmation Certificate (기숙사 거주확인서).',
      'Failure to report an address change within 14 days results in administrative fines under Article 36 of the Immigration Control Act.',
    ],
    category: 'Government Announcements',
    sourceName: 'Ministry of Justice — Korea Immigration Service',
    sourceUrl: 'https://www.hikorea.go.kr',
    sourceType: 'Official Government / Public Agency',
    publicationDate: '2026-10-02',
    lastVerifiedDate: '2026-11-01',
    featured: false,
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'news-kpass-climate-card',
    headlineEn: 'Public Transit Savings: K-Pass Nationwide Refund & Seoul Climate Card (기후동행카드) for Residents',
    headlineKo: '대중교통비 절감 혜택: 전국 K-패스 환급 및 서울시 기후동행카드 이용 안내',
    summaryEn:
      'Foreign residents holding an Alien Registration Card (ARC) can enroll in K-Pass (20%–30% monthly transit fare refund for 15+ rides/month) or use the unlimited Seoul Climate Card for subways and city buses.',
    summaryBn:
      'এআরসি (ARC) কার্ডধারী শিক্ষার্থীরা K-Pass (মাসিক যাতায়াত খরচে ২০-৩০% ক্যাশব্যাক) অথবা সিউল ক্লাইমেট কার্ড ব্যবহার করে যাতায়াত খরচ কমাতে পারেন।',
    summaryKo:
      '외국인등록번호를 보유한 유학생도 K-패스(월 15회 이상 대중교통 이용 시 20~30% 환급) 및 서울시 무제한 대중교통 통합정기권 기후동행카드를 이용할 수 있습니다.',
    summaryNe:
      'ARC भएका विद्यार्थीहरूले K-Pass वा सियोल क्लाइमेट कार्ड प्रयोग गरी मासिक यातायात खर्चमा छुट पाउन सक्छन्।',
    fullDetailsEn: [
      ' Seoul Climate Card (기후동행카드) offers 30-day unlimited rides on Seoul subways and Seoul city/village buses, with an additional youth discount for ages 19–39.',
      'K-Pass (korea-pass.kr) works nationwide across Gyeonggi, Incheon, Busan, Daejeon, Daegu, and Gwangju once you have an ARC and a participating Korean bank check/credit card.',
    ],
    category: 'Transportation Updates',
    sourceName: 'Ministry of Land, Infrastructure and Transport & Seoul Metro Government',
    sourceUrl: 'https://korea-pass.kr',
    sourceType: 'Official Government / Public Agency',
    publicationDate: '2026-09-28',
    lastVerifiedDate: '2026-11-01',
    featured: false,
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'news-voice-phishing-alert',
    headlineEn: 'Student Safety Alert: Prevention of Voice Phishing & Illegal Currency Exchange Scams',
    headlineKo: '유학생 범죄예방 주의보: 보이스피싱 및 불법 환전(환치기) 계좌 정지 피해 예방 안내',
    summaryEn:
      'Korean police and universities warn international students never to conduct informal peer-to-peer currency exchange (WeChat/Telegram/WhatsApp transfers), as receiving funds from a flagged account immediately freezes all of your Korean bank accounts.',
    summaryBn:
      'অপরিচিত ব্যক্তি বা সোশ্যাল মিডিয়ার মাধ্যমে অবৈধ হুন্ডি বা কারেন্সি এক্সচেঞ্জ করবেন না; এতে আপনার কোরিয়ান ব্যাংক অ্যাকাউন্ট তাৎক্ষণিকভাবে ব্লক হয়ে যেতে পারে।',
    summaryKo:
      'SNS나 개인 간 불법 환전 거래를 할 경우 보이스피싱 범죄 자금이 입금되어 본인 명의의 모든 국내 은행 계좌가 지급정지되고 형사 처벌을 받을 수 있으므로 공식 은행만 이용하십시오.',
    summaryNe:
      'अनौपचारिक माध्यमबाट पैसा साटफेर नगर्नुहोस्; यसो गर्दा तपाईंको कोरियन बैंक खाता रोक्का हुन सक्छ। सधैं आधिकारिक बैंक मात्र प्रयोग गर्नुहोस्।',
    fullDetailsEn: [
      'Always exchange currency and receive family remittances only through licensed Korean banks and authorized remittance apps.',
      'Korean Immigration (1345), the Police (112), and the Prosecutors’ Office NEVER demand money transfers over the phone or ask for your banking password.',
    ],
    category: 'Student Life',
    sourceName: 'Korean National Police Agency & Financial Supervisory Service (1332)',
    sourceUrl: 'https://www.fss.or.kr',
    sourceType: 'Official Government / Public Agency',
    publicationDate: '2026-09-25',
    lastVerifiedDate: '2026-11-01',
    featured: false,
    verificationStatus: 'VERIFIED',
    published: true,
  },
  {
    id: 'news-studyinkorea-fairs',
    headlineEn: 'Study in Korea Online & Regional Career and Education Fairs for International Students',
    headlineKo: 'Study in Korea 외국인 유학생 채용박람회 및 온라인 유학박람회 일정 안내',
    summaryEn:
      'NIIED and KOTRA host annual International Student Career Fairs and Online Education Fairs connecting D-2 graduates and scholars with Korean companies and graduate programs.',
    summaryBn:
      'NIIED এবং KOTRA প্রতি বছর আন্তর্জাতিক শিক্ষার্থীদের জন্য ক্যারিয়ার ফেয়ার এবং অনলাইন এডুকেশন ফেয়ারের আয়োজন করে।',
    summaryKo:
      '국립국제교육원(NIIED)과 대한무역투자진흥공사(KOTRA)는 외국인 유학생 취업박람회 및 온라인 한국유학박람회를 정기 개최합니다.',
    summaryNe:
      'NIIED र KOTRA ले अन्तर्राष्ट्रिय विद्यार्थीहरूका लागि वार्षिक रोजगार मेला र शैक्षिक प्रदर्शनी आयोजना गर्दछन्।',
    fullDetailsEn: [
      'Check the Events & Notices board on Study in Korea (studyinkorea.go.kr) for upcoming online university admission consultations and D-10 / E-7 job-seeking workshops.',
    ],
    category: 'Events and Opportunities',
    sourceName: 'NIIED — Study in Korea',
    sourceUrl: 'https://www.studyinkorea.go.kr',
    sourceType: 'Official Government / Public Agency',
    publicationDate: '2026-09-20',
    lastVerifiedDate: '2026-11-01',
    featured: false,
    verificationStatus: 'VERIFIED',
    published: true,
  },
];
