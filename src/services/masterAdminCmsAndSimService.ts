import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, appendAuditLogToFirestore, getCurrentIdToken } from './firebaseService';
import type {
  HomepageCmsCategoryRecord,
  HomepageCmsNestedServiceRecord,
  SimApplicationRecord,
  SimApplicationStatus,
  SimArrivalGroupRecord,
  SimArrivalGroupSnapshotStudent,
  SimExportHistoryRecord,
  LanguageCode,
} from '../types';
import { extractAirportIataCode, formatReadableArrivalDate } from '../utils/simZipAndExcelEngine';

const CMS_CATEGORIES_STORAGE_KEY = 'everykr_cms_homepage_categories_v1';
const CMS_NESTED_SERVICES_STORAGE_KEY = 'everykr_cms_nested_services_v1';
const SIM_ARRIVAL_GROUPS_STORAGE_KEY = 'everykr_sim_arrival_groups_v1';
const SIM_EXPORT_HISTORY_STORAGE_KEY = 'everykr_sim_export_history_v1';
const LOCAL_SIM_APPLICATIONS_STORAGE_KEY = 'everykr_sim_applications_v1';

// ============================================================================
// PART 1: DEFAULT 6 MAIN HOMEPAGE CATEGORIES & NESTED SERVICES
// ============================================================================

export const DEFAULT_HOMEPAGE_CMS_CATEGORIES: HomepageCmsCategoryRecord[] = [
  {
    id: 'university',
    slug: 'universities',
    route: '/universities',
    title: 'University',
    shortDescription:
      'Discover South Korean universities, admission requirements, tuition fees, scholarships, and academic opportunities.',
    iconName: 'GraduationCap',
    badgeText: '25+ Verified Universities',
    ctaLabel: 'Explore More',
    displayOrder: 1,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    translations: {
      en: {
        title: 'University',
        shortDescription:
          'Discover South Korean universities, admission requirements, tuition fees, scholarships, and academic opportunities.',
        ctaLabel: 'Explore More',
      },
      bn: {
        title: 'বিশ্ববিদ্যালয়',
        shortDescription:
          'দক্ষিণ কোরিয়ার বিশ্ববিদ্যালয়, ভর্তির যোগ্যতা, টিউশন ফি, বৃত্তি এবং একাডেমিক সুযোগসমূহ জানুন।',
        ctaLabel: 'আরও দেখুন',
      },
      ko: {
        title: '대학교',
        shortDescription:
          '대한민국 대학교, 입학 자격 요건, 등록금, 장학금 및 다양한 학업 기회를 확인하세요.',
        ctaLabel: '더 알아보기',
      },
      ne: {
        title: 'विश्वविद्यालय',
        shortDescription:
          'दक्षिण कोरियाका विश्वविद्यालयहरू, भर्ना योग्यता, ट्युसन शुल्क, छात्रवृत्ति र शैक्षिक अवसरहरू पत्ता लगाउनुहोस्।',
        ctaLabel: 'थप हेर्नुहोस्',
      },
      ur: {
        title: 'یونیورسٹیاں',
        shortDescription:
          'جنوبی کوریا کی یونیورسٹیاں، داخلے کی شرائط، ٹیوشن فیس، اسکالرشپس اور تعلیمی مواقع دریافت کریں۔',
        ctaLabel: 'مزید دیکھیں',
      },
      hi: {
        title: 'विश्वविद्यालय',
        shortDescription:
          'दक्षिण कोरियाई विश्वविद्यालयों, प्रवेश आवश्यकताओं, ट्यूशन फीस, छात्रवृत्ति और शैक्षणिक अवसरों की खोज करें।',
        ctaLabel: 'और जानें',
      },
      ar: {
        title: 'الجامعات',
        shortDescription:
          'اكتشف الجامعات الكورية الجنوبية، شروط القبول، الرسوم الدراسية، المنح الدراسية، والفرص الأكاديمية.',
        ctaLabel: 'استكشف المزيد',
      },
      zh: {
        title: '韩国大学',
        shortDescription:
          '了解韩国各大学、申请条件、学费标准、奖学金项目以及丰富的学术机会。',
        ctaLabel: '探索更多',
      },
      ja: {
        title: '大学案内',
        shortDescription:
          '韓国の大学、出願資格、学費、奨学金制度、および進学の機会を詳しく確認できます。',
        ctaLabel: '詳しく見る',
      },
    },
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'learn_korean',
    slug: 'korean-academy',
    route: '/korean-academy',
    title: 'Learn Korean',
    shortDescription:
      'Learn Korean from beginner to advanced levels through structured lessons, vocabulary, grammar, pronunciation, and TOPIK preparation.',
    iconName: 'BookOpen',
    badgeText: '5.0 Native Voice & TOPIK',
    ctaLabel: 'Explore More',
    displayOrder: 2,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    translations: {
      en: {
        title: 'Learn Korean',
        shortDescription:
          'Learn Korean from beginner to advanced levels through structured lessons, vocabulary, grammar, pronunciation, and TOPIK preparation.',
        ctaLabel: 'Explore More',
      },
      bn: {
        title: 'কোরিয়ান ভাষা শিখুন',
        shortDescription:
          'প্রাথমিক থেকে উন্নত স্তর পর্যন্ত গোছানো পাঠ, শব্দভাণ্ডার, ব্যাকরণ, উচ্চারণ এবং TOPIK প্রস্তুতি নিন।',
        ctaLabel: 'আরও দেখুন',
      },
      ko: {
        title: '한국어 배우기',
        shortDescription:
          '초급부터 고급까지 체계적인 강의, 어휘, 문법, 발음 및 TOPIK 시험 대비 과정을 학습하세요.',
        ctaLabel: '더 알아보기',
      },
      ne: {
        title: 'कोरियन भाषा सिक्नुहोस्',
        shortDescription:
          'प्रारम्भिकदेखि उन्नत तहसम्म व्यवस्थित पाठ, शब्दावली, व्याकरण, उच्चारण र TOPIK तयारी गर्नुहोस्।',
        ctaLabel: 'थप हेर्नुहोस्',
      },
      ur: {
        title: 'کورین زبان سیکھیں',
        shortDescription:
          'ابتدائی سے اعلیٰ سطح تک منظم اسباق، الفاظ، گرامر، تلفظ اور TOPIK کی تیاری کریں।',
        ctaLabel: 'مزید دیکھیں',
      },
      hi: {
        title: 'कोरियाई भाषा सीखें',
        shortDescription:
          'शुरुआती से उन्नत स्तर तक संरचित पाठों, शब्दावली, व्याकरण, उच्चारण और TOPIK तैयारी के माध्यम से कोरियाई सीखें।',
        ctaLabel: 'और जानें',
      },
      ar: {
        title: 'تعلم الكورية',
        shortDescription:
          'تعلم اللغة الكورية من المستوى المبتدئ إلى المتقدم عبر دروس منظمة، مفردات، قواعد، نطق، والتحضير لاختبار TOPIK.',
        ctaLabel: 'استكشف المزيد',
      },
      zh: {
        title: '学习韩语',
        shortDescription:
          '通过系统化课程、词汇、语法、发音及 TOPIK 备考指南，从零基础进阶到高级韩语。',
        ctaLabel: '探索更多',
      },
      ja: {
        title: '韓国語を学ぶ',
        shortDescription:
          '初級から上級まで、体系的なレッスン、語彙、文法、発音、TOPIK対策を通じて韓国語を学習できます。',
        ctaLabel: '詳しく見る',
      },
    },
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'accommodation',
    slug: 'housing',
    route: '/housing',
    title: 'Find Accommodation',
    shortDescription:
      'Explore affordable student accommodation, university dormitories, private rooms, shared housing, and studios across South Korea.',
    iconName: 'Building',
    badgeText: 'Verified Housing',
    ctaLabel: 'Explore More',
    displayOrder: 3,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    translations: {
      en: {
        title: 'Find Accommodation',
        shortDescription:
          'Explore affordable student accommodation, university dormitories, private rooms, shared housing, and studios across South Korea.',
        ctaLabel: 'Explore More',
      },
      bn: {
        title: 'আবাসন খুঁজুন',
        shortDescription:
          'দক্ষিণ কোরিয়া জুড়ে সাশ্রয়ী শিক্ষার্থী আবাসন, বিশ্ববিদ্যালয়ের ডরমিটরি, প্রাইভেট রুম, শেয়ার্ড হাউজিং এবং স্টুডিও খুঁজুন।',
        ctaLabel: 'আরও দেখুন',
      },
      ko: {
        title: '숙소 찾기',
        shortDescription:
          '한국 전역의 합리적인 유학생 숙소, 대학 기숙사, 원룸, 쉐어하우스 및 스튜디오를 찾아보세요.',
        ctaLabel: '더 알아보기',
      },
      ne: {
        title: 'आवास खोज्नुहोस्',
        shortDescription:
          'दक्षिण कोरियाभरि सस्तो विद्यार्थी आवास, विश्वविद्यालय होस्टेल, निजी कोठा र साझा आवासहरू खोज्नुहोस्।',
        ctaLabel: 'थप हेर्नुहोस्',
      },
      ur: {
        title: 'رہائش تلاش کریں',
        shortDescription:
          'جنوبی کوریا بھر میں مناسب قیمت اسٹوڈنٹ رہائش، یونیورسٹی ہاسٹلز، پرائیویٹ کمرے اور شیئرڈ ہاؤسنگ تلاش کریں۔',
        ctaLabel: 'مزید دیکھیں',
      },
      hi: {
        title: 'आवास खोजें',
        shortDescription:
          'दक्षिण कोरिया में किफायती छात्र आवास, विश्वविद्यालय छात्रावास, निजी कमरे, साझा आवास और स्टूडियो खोजें।',
        ctaLabel: 'और जानें',
      },
      ar: {
        title: 'البحث عن سكن',
        shortDescription:
          'استكشف سكن الطلاب بأسعار مناسبة، السكن الجامعي، الغرف الخاصة، السكن المشترك، والاستوديوهات في جميع أنحاء كوريا.',
        ctaLabel: 'استكشف المزيد',
      },
      zh: {
        title: '寻找住宿',
        shortDescription:
          '查找韩国各地高性价比的学生住宿、大学宿舍、单人公寓、合租房及一室户 (Studio)。',
        ctaLabel: '探索更多',
      },
      ja: {
        title: '滞在先を探す',
        shortDescription:
          '韓国全国の学生向け宿舎、大学寮、ワンルーム、シェアハウス、スタジオを簡単に探せます。',
        ctaLabel: '詳しく見る',
      },
    },
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'tickets_transport',
    slug: 'transportation',
    route: '/transportation',
    title: 'Tickets & Transport',
    shortDescription:
      'Explore flights, KTX high-speed trains, and Express & Intercity bus services. Compare schedules, travel times, and fares in one place.',
    iconName: 'Plane',
    badgeText: 'Airline • KTX Train • Bus',
    ctaLabel: 'Explore More',
    displayOrder: 4,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    translations: {
      en: {
        title: 'Tickets & Transport',
        shortDescription:
          'Explore flights, KTX high-speed trains, and Express & Intercity bus services. Compare schedules, travel times, and fares in one place.',
        ctaLabel: 'Explore More',
      },
      bn: {
        title: 'টিকিট ও পরিবহন',
        shortDescription:
          'আন্তর্জাতিক ফ্লাইট, অভ্যন্তরীণ ফ্লাইট, KTX টিকিট, বিমানবন্দর যাতায়াত এবং স্থানীয় পরিবহন সেবা খুঁজুন।',
        ctaLabel: 'আরও দেখুন',
      },
      ko: {
        title: '항공권 및 교통',
        shortDescription:
          '국제선 항공권, 국내선, KTX 승차권, 공항 교통편 및 지역 대중교통 서비스를 확인하세요.',
        ctaLabel: '더 알아보기',
      },
      ne: {
        title: 'टिकट र यातायात',
        shortDescription:
          'अन्तर्राष्ट्रिय उडान, आन्तरिक उडान, KTX टिकट, विमानस्थल यातायात र स्थानीय यातायात सेवाहरू खोज्नुहोस्।',
        ctaLabel: 'थप हेर्नुहोस्',
      },
      ur: {
        title: 'ٹکٹ اور ٹرانسپورٹ',
        shortDescription:
          'بین الاقوامی پروازیں، اندرون ملک پروازیں، KTX ٹکٹ، ایئرپورٹ ٹرانسپورٹ اور مقامی سفری سہولیات تلاش کریں۔',
        ctaLabel: 'مزید دیکھیں',
      },
      hi: {
        title: 'टिकट और परिवहन',
        shortDescription:
          'अंतर्राष्ट्रीय उड़ानें, घरेलू उड़ानें, KTX टिकट, एयरपोर्ट परिवहन और स्थानीय परिवहन सेवाएं खोजें।',
        ctaLabel: 'और जानें',
      },
      ar: {
        title: 'التذاكر والمواصلات',
        shortDescription:
          'ابحث عن الرحلات الدولية، الرحلات الداخلية، تذاكر قطار KTX، مواصلات المطار، وخدمات النقل المحلية.',
        ctaLabel: 'استكشف المزيد',
      },
      zh: {
        title: '机票与交通',
        shortDescription:
          '查询国际航班、韩国国内航班、KTX 高铁票、机场接驳及当地公共交通服务。',
        ctaLabel: '探索更多',
      },
      ja: {
        title: 'チケット＆交通',
        shortDescription:
          '国際線航空券、国内線、KTX乗車券、空港アクセス、現地の交通サービスを案内します。',
        ctaLabel: '詳しく見る',
      },
    },
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'sim',
    slug: 'sim',
    route: '/sim',
    title: 'SIM',
    shortDescription:
      'Apply for your free SIM card and submit your Korea arrival information. Our team will contact you through WhatsApp.',
    iconName: 'Smartphone',
    badgeText: 'Free Arrival SIM',
    ctaLabel: 'Explore More',
    displayOrder: 5,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    translations: {
      en: {
        title: 'SIM',
        shortDescription:
          'Apply for your free SIM card and submit your Korea arrival information. Our team will contact you through WhatsApp.',
        ctaLabel: 'Explore More',
      },
      bn: {
        title: 'সিম নিবন্ধন',
        shortDescription:
          'আপনার ফ্রি সিম কার্ডের জন্য আবেদন করুন এবং কোরিয়ায় পৌঁছানোর তথ্য জমা দিন। আমাদের টিম WhatsApp-এর মাধ্যমে যোগাযোগ করবে।',
        ctaLabel: 'আরও দেখুন',
      },
      ko: {
        title: '유심 (SIM)',
        shortDescription:
          '무료 유심 카드를 신청하고 한국 입국 정보를 제출하세요. 담당 팀이 WhatsApp으로 연락드립니다.',
        ctaLabel: '더 알아보기',
      },
      ne: {
        title: 'सिम दर्ता (SIM)',
        shortDescription:
          'निःशुल्क सिम कार्डको लागि आवेदन दिनुहोस् र कोरिया आगमन विवरण पेश गर्नुहोस्। हाम्रो टोलीले WhatsApp मार्फत सम्पर्क गर्नेछ।',
        ctaLabel: 'थप हेर्नुहोस्',
      },
      ur: {
        title: 'سم رجسٹریشن (SIM)',
        shortDescription:
          'اپنی مفت سم کارڈ کے لیے درخواست دیں اور کوریا آمد کی تفصیلات جمع کروائیں۔ ہماری ٹیم WhatsApp کے ذریعے رابطہ کرے گی۔',
        ctaLabel: 'مزید دیکھیں',
      },
      hi: {
        title: 'सिम पंजीकरण (SIM)',
        shortDescription:
          'अपने निःशुल्क सिम कार्ड के लिए आवेदन करें और कोरिया आगमन विवरण जमा करें। हमारी टीम WhatsApp के माध्यम से संपर्क करेगी।',
        ctaLabel: 'और जानें',
      },
      ar: {
        title: 'شريحة الاتصال (SIM)',
        shortDescription:
          'قدّم طلباً للحصول على شريحة SIM مجانية وأرسل بيانات وصولك إلى كوريا. سيتواصل معك فريقنا عبر WhatsApp.',
        ctaLabel: 'استكشف المزيد',
      },
      zh: {
        title: 'SIM 卡申请',
        shortDescription:
          '免费申请韩国 SIM 卡并提交您的抵韩信息，我们的团队将通过 WhatsApp 与您联系。',
        ctaLabel: '探索更多',
      },
      ja: {
        title: 'SIMカード申請',
        shortDescription:
          '無料SIMカードを申請し、韓国到着情報を送信してください。担当チームがWhatsAppでご連絡します。',
        ctaLabel: '詳しく見る',
      },
    },
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'others',
    slug: 'services',
    route: '/services',
    title: 'Others',
    shortDescription:
      'Explore student services, visa and immigration guidance, part-time jobs, student communities, and useful resources.',
    iconName: 'Compass',
    badgeText: '8 Essential Modules',
    ctaLabel: 'Explore More',
    displayOrder: 6,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    translations: {
      en: {
        title: 'Others',
        shortDescription:
          'Explore student services, visa and immigration guidance, part-time jobs, student communities, and useful resources.',
        ctaLabel: 'Explore More',
      },
      bn: {
        title: 'অন্যান্য সেবা',
        shortDescription:
          'শিক্ষার্থী সহায়তা, ভিসা ও ইমিগ্রেশন নির্দেশিকা, পার্ট-টাইম জব, স্টুডেন্ট কমিউনিটি এবং প্রয়োজনীয় রিসোর্স দেখুন।',
        ctaLabel: 'আরও দেখুন',
      },
      ko: {
        title: '기타 서비스',
        shortDescription:
          '학생 지원 서비스, 비자 및 출입국 가이드, 아르바이트, 유학생 커뮤니티 및 유용한 자료를 탐색하세요.',
        ctaLabel: '더 알아보기',
      },
      ne: {
        title: 'अन्य सेवाहरू',
        shortDescription:
          'विद्यार्थी सेवाहरू, भिसा र अध्यागमन मार्गदर्शन, पार्ट-टाइम काम, विद्यार्थी समुदाय र उपयोगी स्रोतहरू हेर्नुहोस्।',
        ctaLabel: 'थप हेर्नुहोस्',
      },
      ur: {
        title: 'دیگر خدمات',
        shortDescription:
          'اسٹوڈنٹ سروسز، ویزا اور امیگریشن رہنمائی، پارٹ ٹائم ملازمتیں، اسٹوڈنٹ کمیونٹی اور مفید وسائل دیکھیں۔',
        ctaLabel: 'مزید دیکھیں',
      },
      hi: {
        title: 'अन्य सेवाएं',
        shortDescription:
          'छात्र सेवाएं, वीज़ा और आव्रजन मार्गदर्शन, पार्ट-टाइम नौकरियां, छात्र समुदाय और उपयोगी संसाधन देखें।',
        ctaLabel: 'और जानें',
      },
      ar: {
        title: 'خدمات أخرى',
        shortDescription:
          'استكشف خدمات الطلاب، إرشادات التأشيرة والهجرة، الوظائف الجزئية، مجتمعات الطلاب، والموارد المفيدة.',
        ctaLabel: 'استكشف المزيد',
      },
      zh: {
        title: '更多服务',
        shortDescription:
          '浏览学生服务、签证与出入境指南、兼职工作、留学生社区及实用生活资源。',
        ctaLabel: '探索更多',
      },
      ja: {
        title: 'その他のサービス',
        shortDescription:
          '学生サポート、ビザ・出入国ガイド、アルバイト情報、留学生コミュニティ、便利なリソースを探索できます。',
        ctaLabel: '詳しく見る',
      },
    },
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
];

export const DEFAULT_HOMEPAGE_NESTED_SERVICES: HomepageCmsNestedServiceRecord[] = [
  // 1. University Nested Services
  {
    id: 'uni_directory',
    parentCategoryId: 'university',
    subcategoryName: 'University Admissions',
    serviceTitle: 'Verified Korean Universities Directory',
    shortDescription: 'Browse verified Korean universities with official tuition, rankings, and campus profiles.',
    detailedContent: 'Complete directory of 25+ verified South Korean universities with Tier-1 official source provenance.',
    routeOrExternalUrl: '/universities',
    iconName: 'GraduationCap',
    badgeText: 'Official Tier-1',
    displayOrder: 1,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'uni_deadlines',
    parentCategoryId: 'university',
    subcategoryName: 'University Admissions',
    serviceTitle: 'Admission Deadlines & Intake Tracker',
    shortDescription: 'Spring & Fall semester application timelines, document submission, and interview schedules.',
    detailedContent: 'Track online application windows, apostille document deadlines, and COA issuance dates.',
    routeOrExternalUrl: '/deadlines',
    iconName: 'Calendar',
    badgeText: 'Spring / Fall',
    displayOrder: 2,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'uni_scholarships',
    parentCategoryId: 'university',
    subcategoryName: 'Financial Aid',
    serviceTitle: 'GKS & University Scholarships',
    shortDescription: 'Global Korea Scholarship (GKS), TOPIK-based tuition waivers, and STEM research fellowships.',
    detailedContent: 'Explore full and partial scholarships across Korean national and private universities.',
    routeOrExternalUrl: '/scholarships',
    iconName: 'Award',
    badgeText: 'Up to 100% Tuition',
    displayOrder: 3,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },

  // 2. Learn Korean Nested Services
  {
    id: 'kr_hangul_foundation',
    parentCategoryId: 'learn_korean',
    subcategoryName: 'Foundation & Pronunciation',
    serviceTitle: 'Hangul Alphabet & Native Seoul Voice Lab',
    shortDescription: 'Master consonants, vowels, batchim rules, and natural Seoul standard pronunciation.',
    detailedContent: 'Interactive Hangul strokes, syllable builder, and natural Korean neural TTS voice playback.',
    routeOrExternalUrl: '/korean-academy',
    iconName: 'Volume2',
    badgeText: 'Native Audio',
    displayOrder: 1,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'kr_vocab_grammar',
    parentCategoryId: 'learn_korean',
    subcategoryName: 'Core Curriculum',
    serviceTitle: 'Structured Vocabulary, Grammar & Dialogues',
    shortDescription: 'Beginner to Advanced vocabulary decks, grammar patterns, and real-life campus conversations.',
    detailedContent: 'Comprehensive 5.0 curriculum with English and Bangla explanations for every grammar point.',
    routeOrExternalUrl: '/korean-academy',
    iconName: 'BookOpen',
    badgeText: '50x Content Library',
    displayOrder: 2,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'kr_topik_exam_engine',
    parentCategoryId: 'learn_korean',
    subcategoryName: 'Exam Preparation',
    serviceTitle: 'Randomized TOPIK I & TOPIK II Mock Exam Engine',
    shortDescription: 'Dynamic question banks with Fisher-Yates choice shuffling and balanced answer distributions.',
    detailedContent: 'Practice authentic reading, listening, vocabulary, and grammar mock tests with instant analytics.',
    routeOrExternalUrl: '/korean-academy',
    iconName: 'CheckCircle2',
    badgeText: 'Randomized CBT',
    displayOrder: 3,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },

  // 3. Find Accommodation Nested Services
  {
    id: 'acc_one_room_studios',
    parentCategoryId: 'accommodation',
    subcategoryName: 'Student Housing Listings',
    serviceTitle: 'Verified One-Room Studios & Goshiwons',
    shortDescription: 'Browse verified student rooms near major universities in Seoul, Busan, Daejeon, and Incheon.',
    detailedContent: 'Compare monthly rent, deposit (보증금), maintenance fees, and walking distance to campus.',
    routeOrExternalUrl: '/housing',
    iconName: 'Building',
    badgeText: 'Verified Landlords',
    displayOrder: 1,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'acc_university_dorms',
    parentCategoryId: 'accommodation',
    subcategoryName: 'On-Campus Living',
    serviceTitle: 'University Dormitory Guide & Application Support',
    shortDescription: 'Learn how to apply for on-campus dormitories, health check requirements, and meal plans.',
    detailedContent: 'Step-by-step guidance on tuberculosis clearance certificates and semester housing contracts.',
    routeOrExternalUrl: '/housing',
    iconName: 'ShieldCheck',
    badgeText: 'Safe Contracts',
    displayOrder: 2,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },

  // 4. Tickets & Transport (Flight Search & Price Comparison Engine) Nested Services
  {
    id: 'flight_search_engine',
    parentCategoryId: 'tickets_transport',
    subcategoryName: 'Flight Search & Price Comparison',
    serviceTitle: 'Global Flight Search & Multi-Provider Price Comparison',
    shortDescription: 'Search flights between South Korea and worldwide destinations across Trip.com, Skyscanner, Gotogate, Mytrip, KAYAK, and official airlines.',
    detailedContent: 'Compare one-way, round-trip, and multi-city flight itineraries with airport autocomplete, cabin filters, and verified booking referrals.',
    routeOrExternalUrl: '/transportation',
    iconName: 'Plane',
    badgeText: 'ICN • PUS • Global',
    displayOrder: 1,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'flight_price_alerts_directory',
    parentCategoryId: 'tickets_transport',
    subcategoryName: 'Route Price Alerts & Providers',
    serviceTitle: 'Route Price Alerts & Trusted Booking Partners Directory',
    shortDescription: 'Set target fare alerts for student corridors (such as ICN → DAC) and access verified global travel booking platforms.',
    detailedContent: 'Track target airfares in USD, KRW, BDT, NPR, INR, PKR, EUR, and more.',
    routeOrExternalUrl: '/transportation',
    iconName: 'Globe',
    badgeText: 'Price Alerts',
    displayOrder: 2,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },

  // 5. SIM Nested Services
  {
    id: 'sim_free_arrival_application',
    parentCategoryId: 'sim',
    subcategoryName: 'Student SIM Registration',
    serviceTitle: 'Free Korea Arrival SIM Card Application',
    shortDescription: 'Submit your passport, flight ticket, and arrival schedule for airport/campus SIM pickup.',
    detailedContent: 'Our SIM coordination team groups students by arrival airport and date and contacts you on WhatsApp.',
    routeOrExternalUrl: '/sim',
    iconName: 'Smartphone',
    badgeText: 'Free SIM Pickup',
    displayOrder: 1,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'sim_postpaid_arc_upgrade',
    parentCategoryId: 'sim',
    subcategoryName: 'ARC Phone Plans',
    serviceTitle: 'ARC Verification & Identity Authentication Setup',
    shortDescription: 'Convert your prepaid arrival SIM into an ARC-linked number for Korean banking and 본인인증.',
    detailedContent: 'Guidance on linking your Alien Registration Card (ARC) with KT, SKT, and LG U+ MVNO plans.',
    routeOrExternalUrl: '/sim',
    iconName: 'CheckCircle2',
    badgeText: 'ARC Ready',
    displayOrder: 2,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },

  // 6. Others (8 Essential Hub Modules)
  {
    id: 'others_mod_1_emergency',
    parentCategoryId: 'others',
    subcategoryName: 'Essential Hub — Module 01',
    serviceTitle: 'Emergency Numbers (112, 119, 1345, 1330)',
    shortDescription: 'Verified South Korea emergency hotlines with one-tap calling and multilingual interpretation.',
    detailedContent: 'Direct access to Police (112), Fire & Ambulance (119), Immigration (1345), and Tourist Helpline (1330).',
    routeOrExternalUrl: '/services/emergency',
    iconName: 'PhoneCall',
    badgeText: 'Module 01',
    displayOrder: 1,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'others_mod_2_immigration',
    parentCategoryId: 'others',
    subcategoryName: 'Essential Hub — Module 02',
    serviceTitle: 'Immigration Offices & HiKorea Guide',
    shortDescription: 'Jurisdiction finder, ARC/visa reservation guide, and Naver/Kakao Map directions.',
    detailedContent: 'Find the exact Immigration Office serving your university city or district with verified addresses.',
    routeOrExternalUrl: '/services/immigration-offices',
    iconName: 'Building2',
    badgeText: 'Module 02',
    displayOrder: 2,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'others_mod_3_police',
    parentCategoryId: 'others',
    subcategoryName: 'Essential Hub — Module 03',
    serviceTitle: 'Police Station Map & Lost Item Help',
    shortDescription: 'Locate regional police stations across Korea via Naver Map & KakaoMap and report lost items.',
    detailedContent: 'Includes Lost112 police portal instructions and Korean phrases for emergency assistance.',
    routeOrExternalUrl: '/services/police-stations',
    iconName: 'ShieldAlert',
    badgeText: 'Module 03',
    displayOrder: 3,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'others_mod_4_community',
    parentCategoryId: 'others',
    subcategoryName: 'Essential Hub — Module 04',
    serviceTitle: 'EveryKR Student Community',
    shortDescription: 'Real student discussions, Q&A, Likes, Comments, Replies, and peer advice in South Korea.',
    detailedContent: 'Connect with verified international students across Korean universities.',
    routeOrExternalUrl: '/services/community',
    iconName: 'Users',
    badgeText: 'Module 04',
    displayOrder: 4,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'others_mod_5_marketplace',
    parentCategoryId: 'others',
    subcategoryName: 'Essential Hub — Module 05',
    serviceTitle: 'Second-hand Student Marketplace',
    shortDescription: 'Buy, sell, or donate textbooks, electronics, winter coats, and dorm essentials safely.',
    detailedContent: 'Moderated student-to-student marketplace with campus pickup safety guidelines.',
    routeOrExternalUrl: '/services/marketplace',
    iconName: 'ShoppingBag',
    badgeText: 'Module 05',
    displayOrder: 5,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'others_mod_6_life_guide',
    parentCategoryId: 'others',
    subcategoryName: 'Essential Hub — Module 06',
    serviceTitle: 'Korean Life Guide',
    shortDescription: 'Practical step-by-step guides for ARC, NHIS health insurance, banking, recycling, and part-time work.',
    detailedContent: 'Verified checklists for D-2 and D-4 students settling in South Korea.',
    routeOrExternalUrl: '/services/korean-life-guide',
    iconName: 'BookOpen',
    badgeText: 'Module 06',
    displayOrder: 6,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'others_mod_7_airport_transport',
    parentCategoryId: 'others',
    subcategoryName: 'Essential Hub — Module 07',
    serviceTitle: 'Airport to City Transport Guide',
    shortDescription: 'Step-by-step routes from Incheon (ICN), Gimpo (GMP), Gimhae (PUS), and Jeju (CJU) to your campus.',
    detailedContent: 'Compare AREX, KTX, limousine buses, and late-night arrival transport options.',
    routeOrExternalUrl: '/services/airport-transport',
    iconName: 'PlaneTakeoff',
    badgeText: 'Module 07',
    displayOrder: 7,
    visible: true,
    published: true,
    featured: false,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
  {
    id: 'others_mod_8_news',
    parentCategoryId: 'others',
    subcategoryName: 'Essential Hub — Module 08',
    serviceTitle: 'News & Official Updates',
    shortDescription: 'Verified immigration policy updates, scholarship announcements, and university deadlines.',
    detailedContent: 'Curated official notices from HiKorea, NIIED, and Korean universities.',
    routeOrExternalUrl: '/services/news-updates',
    iconName: 'Newspaper',
    badgeText: 'Module 08',
    displayOrder: 8,
    visible: true,
    published: true,
    featured: true,
    status: 'published',
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
];

// ============================================================================
// PART 1 HELPERS: FETCH & SAVE HOMEPAGE CMS CATEGORIES & NESTED SERVICES
// ============================================================================

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function emitHomepageCmsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('everykr-homepage-cms-updated'));
  }
}

export function getCachedHomepageCmsCategories(): HomepageCmsCategoryRecord[] {
  const cached = readLocalJson<HomepageCmsCategoryRecord[]>(CMS_CATEGORIES_STORAGE_KEY, []);
  if (!Array.isArray(cached) || cached.length === 0) {
    return [...DEFAULT_HOMEPAGE_CMS_CATEGORIES].sort((a, b) => a.displayOrder - b.displayOrder);
  }
  const mergedMap = new Map<string, HomepageCmsCategoryRecord>();
  for (const def of DEFAULT_HOMEPAGE_CMS_CATEGORIES) {
    mergedMap.set(def.id, def);
  }
  for (const item of cached) {
    if (item && item.id) {
      const base = mergedMap.get(item.id);
      mergedMap.set(item.id, {
        ...(base || {}),
        ...item,
        translations: {
          ...(base?.translations || {}),
          ...(item.translations || {}),
        },
      });
    }
  }
  return Array.from(mergedMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getCachedHomepageNestedServices(): HomepageCmsNestedServiceRecord[] {
  const cached = readLocalJson<HomepageCmsNestedServiceRecord[]>(CMS_NESTED_SERVICES_STORAGE_KEY, []);
  if (!Array.isArray(cached) || cached.length === 0) {
    return [...DEFAULT_HOMEPAGE_NESTED_SERVICES].sort((a, b) => a.displayOrder - b.displayOrder);
  }
  const mergedMap = new Map<string, HomepageCmsNestedServiceRecord>();
  for (const def of DEFAULT_HOMEPAGE_NESTED_SERVICES) {
    mergedMap.set(def.id, def);
  }
  for (const item of cached) {
    if (item && item.id) {
      mergedMap.set(item.id, item);
    }
  }
  return Array.from(mergedMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function fetchHomepageCmsConfig(): Promise<{
  categories: HomepageCmsCategoryRecord[];
  nestedServices: HomepageCmsNestedServiceRecord[];
}> {
  const catMap = new Map<string, HomepageCmsCategoryRecord>();
  for (const d of DEFAULT_HOMEPAGE_CMS_CATEGORIES) {
    catMap.set(d.id, d);
  }
  for (const cached of getCachedHomepageCmsCategories()) {
    if (cached?.id) {
      const base = catMap.get(cached.id);
      catMap.set(cached.id, {
        ...(base || {}),
        ...cached,
        translations: {
          ...(base?.translations || {}),
          ...(cached.translations || {}),
        },
      });
    }
  }

  const srvMap = new Map<string, HomepageCmsNestedServiceRecord>();
  for (const d of DEFAULT_HOMEPAGE_NESTED_SERVICES) {
    srvMap.set(d.id, d);
  }
  for (const cached of getCachedHomepageNestedServices()) {
    if (cached?.id) {
      srvMap.set(cached.id, cached);
    }
  }

  const pickNewerRecord = <T extends { updatedAt?: string }>(existing: T | undefined, incoming: T): T => {
    if (!existing) return incoming;
    const eTime = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
    const iTime = incoming.updatedAt ? Date.parse(incoming.updatedAt) : 0;
    if (!Number.isNaN(iTime) && !Number.isNaN(eTime) && iTime >= eTime) {
      return incoming;
    }
    return existing;
  };

  // 1. Fetch Server API and Firestore in parallel so the freshest version per ID wins
  const [serverRes, firestoreRes] = await Promise.allSettled([
    fetch('/api/cms/homepage', { cache: 'no-store' }).then(async (res) => (res.ok ? res.json() : null)),
    isFirebaseConfigured && db
      ? Promise.all([
          getDocs(collection(db, 'cms_homepage_categories')),
          getDocs(collection(db, 'cms_nested_services')),
        ])
      : Promise.resolve(null),
  ]);

  if (serverRes.status === 'fulfilled' && serverRes.value) {
    const data = serverRes.value;
    if (Array.isArray(data?.categories)) {
      for (const c of data.categories) {
        if (c?.id) {
          const base = catMap.get(c.id);
          const merged: HomepageCmsCategoryRecord = {
            ...(base || {}),
            ...c,
            translations: {
              ...(base?.translations || {}),
              ...(c.translations || {}),
            },
          };
          catMap.set(c.id, pickNewerRecord(base, merged));
        }
      }
    }
    if (Array.isArray(data?.nestedServices)) {
      for (const s of data.nestedServices) {
        if (s?.id) {
          const base = srvMap.get(s.id);
          srvMap.set(s.id, pickNewerRecord(base, s));
        }
      }
    }
  }

  let hasFirestoreData = false;
  if (firestoreRes.status === 'fulfilled' && firestoreRes.value) {
    const [catSnap, srvSnap] = firestoreRes.value;
    if (!catSnap.empty) {
      hasFirestoreData = true;
      catSnap.forEach((docSnap) => {
        const data = docSnap.data() as HomepageCmsCategoryRecord;
        const id = data.id || docSnap.id;
        const base = catMap.get(id);
        const merged: HomepageCmsCategoryRecord = {
          ...(base || {}),
          ...data,
          id,
          translations: {
            ...(base?.translations || {}),
            ...(data.translations || {}),
          },
        };
        catMap.set(id, pickNewerRecord(base, merged));
      });
    }
    if (!srvSnap.empty) {
      hasFirestoreData = true;
      srvSnap.forEach((docSnap) => {
        const data = docSnap.data() as HomepageCmsNestedServiceRecord;
        const id = data.id || docSnap.id;
        const base = srvMap.get(id);
        srvMap.set(id, pickNewerRecord(base, { ...data, id }));
      });
    }
  }

  const categories = Array.from(catMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  const nestedServices = Array.from(srvMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);

  writeLocalJson(CMS_CATEGORIES_STORAGE_KEY, categories);
  writeLocalJson(CMS_NESTED_SERVICES_STORAGE_KEY, nestedServices);

  if (hasFirestoreData) {
    fetch('/api/cms/homepage/sync-from-firestore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories, nestedServices }),
    }).catch(() => {});
  }

  return { categories, nestedServices };
}

/**
 * Real-time cross-browser subscription to Homepage CMS Categories & Nested Services
 * via Firestore `onSnapshot` + local custom event + window focus refresh.
 */
export function subscribeToHomepageCmsConfig(
  onUpdate: (data: {
    categories: HomepageCmsCategoryRecord[];
    nestedServices: HomepageCmsNestedServiceRecord[];
  }) => void
): () => void {
  let active = true;

  const triggerRefresh = async () => {
    const latest = await fetchHomepageCmsConfig();
    if (active) {
      onUpdate(latest);
    }
  };

  let unsubCategories: (() => void) | undefined;
  let unsubServices: (() => void) | undefined;

  if (isFirebaseConfigured && db) {
    try {
      unsubCategories = onSnapshot(
        collection(db, 'cms_homepage_categories'),
        (snap) => {
          if (!active || snap.empty) return;
          const catMap = new Map<string, HomepageCmsCategoryRecord>();
          for (const d of DEFAULT_HOMEPAGE_CMS_CATEGORIES) catMap.set(d.id, d);
          for (const c of getCachedHomepageCmsCategories()) catMap.set(c.id, c);

          snap.forEach((docSnap) => {
            const data = docSnap.data() as HomepageCmsCategoryRecord;
            const id = data.id || docSnap.id;
            const base = catMap.get(id);
            catMap.set(id, {
              ...(base || {}),
              ...data,
              id,
              translations: {
                ...(base?.translations || {}),
                ...(data.translations || {}),
              },
            });
          });

          const categories = Array.from(catMap.values()).sort(
            (a, b) => a.displayOrder - b.displayOrder
          );
          writeLocalJson(CMS_CATEGORIES_STORAGE_KEY, categories);
          onUpdate({
            categories,
            nestedServices: getCachedHomepageNestedServices(),
          });
        },
        () => {}
      );

      unsubServices = onSnapshot(
        collection(db, 'cms_nested_services'),
        (snap) => {
          if (!active || snap.empty) return;
          const srvMap = new Map<string, HomepageCmsNestedServiceRecord>();
          for (const d of DEFAULT_HOMEPAGE_NESTED_SERVICES) srvMap.set(d.id, d);
          for (const s of getCachedHomepageNestedServices()) srvMap.set(s.id, s);

          snap.forEach((docSnap) => {
            const data = docSnap.data() as HomepageCmsNestedServiceRecord;
            const id = data.id || docSnap.id;
            srvMap.set(id, { ...data, id });
          });

          const nestedServices = Array.from(srvMap.values()).sort(
            (a, b) => a.displayOrder - b.displayOrder
          );
          writeLocalJson(CMS_NESTED_SERVICES_STORAGE_KEY, nestedServices);
          onUpdate({
            categories: getCachedHomepageCmsCategories(),
            nestedServices,
          });
        },
        () => {}
      );
    } catch {
      // Ignore snapshot listener initialization errors
    }
  }

  const handleLocalEvent = () => {
    if (!active) return;
    onUpdate({
      categories: getCachedHomepageCmsCategories(),
      nestedServices: getCachedHomepageNestedServices(),
    });
  };

  const handleFocus = () => {
    triggerRefresh();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('everykr-homepage-cms-updated', handleLocalEvent);
    window.addEventListener('focus', handleFocus);
  }

  return () => {
    active = false;
    if (unsubCategories) unsubCategories();
    if (unsubServices) unsubServices();
    if (typeof window !== 'undefined') {
      window.removeEventListener('everykr-homepage-cms-updated', handleLocalEvent);
      window.removeEventListener('focus', handleFocus);
    }
  };
}

export async function saveHomepageCategoryDoc(
  category: HomepageCmsCategoryRecord,
  adminActor: { uid: string; name: string; email: string }
): Promise<HomepageCmsCategoryRecord> {
  const nowIso = new Date().toISOString();
  const updated: HomepageCmsCategoryRecord = {
    ...category,
    translations: {
      ...(category.translations || {}),
      en: {
        ...(category.translations?.en || {}),
        title: category.title,
        shortDescription: category.shortDescription,
        ctaLabel: category.ctaLabel,
        badgeText: category.badgeText,
      },
    },
    updatedAt: nowIso,
    updatedBy: adminActor.email || adminActor.name,
  };

  // Update local cache
  const current = getCachedHomepageCmsCategories();
  const next = current.some((c) => c.id === updated.id)
    ? current.map((c) => (c.id === updated.id ? updated : c))
    : [...current, updated];
  next.sort((a, b) => a.displayOrder - b.displayOrder);
  writeLocalJson(CMS_CATEGORIES_STORAGE_KEY, next);
  emitHomepageCmsUpdated();

  // Save to Server API
  try {
    const token = await getCurrentIdToken();
    await fetch('/api/cms/homepage/category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ category: updated, adminActor }),
    });
  } catch {
    // ignore network error
  }

  // Save to Firestore
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'cms_homepage_categories', updated.id), updated, { merge: true });
    } catch {
      // ignore if rules pending
    }
  }

  await appendAuditLogToFirestore({
    id: `audit_cms_cat_${Date.now()}`,
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: updated.published ? 'PUBLISH' : 'EDIT',
    targetEntity: 'HomepageCmsCategory',
    targetId: updated.id,
    targetName: updated.title,
    details: `Updated homepage category "${updated.title}" (Order #${updated.displayOrder}, Visible: ${updated.visible}, Published: ${updated.published})`,
  });

  return updated;
}

export async function reorderHomepageCategoriesDoc(
  orderedCategories: HomepageCmsCategoryRecord[],
  adminActor: { uid: string; name: string; email: string }
): Promise<HomepageCmsCategoryRecord[]> {
  const nowIso = new Date().toISOString();
  const normalized = orderedCategories.map((cat, idx) => ({
    ...cat,
    displayOrder: idx + 1,
    updatedAt: nowIso,
    updatedBy: adminActor.email,
  }));

  writeLocalJson(CMS_CATEGORIES_STORAGE_KEY, normalized);
  emitHomepageCmsUpdated();

  try {
    const token = await getCurrentIdToken();
    await fetch('/api/cms/homepage/categories-reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ categories: normalized, adminActor }),
    });
  } catch {
    // ignore
  }

  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      for (const cat of normalized) {
        batch.set(doc(db, 'cms_homepage_categories', cat.id), cat, { merge: true });
      }
      await batch.commit();
    } catch {
      // ignore
    }
  }

  await appendAuditLogToFirestore({
    id: `audit_cms_reorder_${Date.now()}`,
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'EDIT',
    targetEntity: 'HomepageCmsCategory',
    targetId: 'all_homepage_categories',
    targetName: 'Homepage Category Display Order',
    details: `Reordered homepage categories: ${normalized.map((c) => `${c.displayOrder}. ${c.title}`).join(', ')}`,
  });

  return normalized;
}

export async function saveHomepageNestedServiceDoc(
  service: HomepageCmsNestedServiceRecord,
  adminActor: { uid: string; name: string; email: string }
): Promise<HomepageCmsNestedServiceRecord> {
  const nowIso = new Date().toISOString();
  const updated: HomepageCmsNestedServiceRecord = {
    ...service,
    updatedAt: nowIso,
    updatedBy: adminActor.email || adminActor.name,
  };

  const current = getCachedHomepageNestedServices();
  const next = current.some((s) => s.id === updated.id)
    ? current.map((s) => (s.id === updated.id ? updated : s))
    : [...current, updated];
  next.sort((a, b) => a.displayOrder - b.displayOrder);
  writeLocalJson(CMS_NESTED_SERVICES_STORAGE_KEY, next);
  emitHomepageCmsUpdated();

  try {
    const token = await getCurrentIdToken();
    await fetch('/api/cms/homepage/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ service: updated, adminActor }),
    });
  } catch {
    // ignore
  }

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'cms_nested_services', updated.id), updated, { merge: true });
    } catch {
      // ignore
    }
  }

  await appendAuditLogToFirestore({
    id: `audit_cms_srv_${Date.now()}`,
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: updated.published ? 'PUBLISH' : 'EDIT',
    targetEntity: 'HomepageCmsService',
    targetId: updated.id,
    targetName: updated.serviceTitle,
    details: `Saved nested service "${updated.serviceTitle}" under "${updated.parentCategoryId} > ${updated.subcategoryName}" (Status: ${updated.status}, Visible: ${updated.visible})`,
  });

  return updated;
}

export function resolveCategoryCopyForLanguage(
  cat: HomepageCmsCategoryRecord,
  lang: LanguageCode
): { title: string; description: string; ctaLabel: string; badgeText?: string } {
  if (lang === 'en') {
    const enTranslation = cat.translations?.en;
    return {
      title: cat.title?.trim() || enTranslation?.title?.trim() || 'Category',
      description:
        cat.shortDescription?.trim() || enTranslation?.shortDescription?.trim() || '',
      ctaLabel: cat.ctaLabel?.trim() || enTranslation?.ctaLabel?.trim() || 'Explore More',
      badgeText: cat.badgeText?.trim() || enTranslation?.badgeText?.trim(),
    };
  }
  const localized = cat.translations?.[lang];
  const enFallback = cat.translations?.en;
  return {
    title: localized?.title?.trim() || cat.title?.trim() || enFallback?.title || cat.title,
    description:
      localized?.shortDescription?.trim() ||
      cat.shortDescription?.trim() ||
      enFallback?.shortDescription ||
      cat.shortDescription,
    ctaLabel: localized?.ctaLabel?.trim() || cat.ctaLabel || 'Explore More',
    badgeText: localized?.badgeText?.trim() || cat.badgeText,
  };
}

// ============================================================================
// PART 2: SIM APPLICATION BULK ACTIONS, ARRIVAL GROUPS & EXPORT HISTORY
// ============================================================================

export function buildSnapshotFromSimApplication(app: SimApplicationRecord): SimArrivalGroupSnapshotStudent {
  const hasPassport = Boolean(
    (app.passportDocumentURL && app.passportDocumentURL.trim()) ||
      (app.passportStoragePath && app.passportStoragePath.trim()) ||
      (app.passportFileName && app.passportFileName.trim())
  );
  const hasTicket = Boolean(
    (app.flightTicketDocumentURL && app.flightTicketDocumentURL.trim()) ||
      (app.flightTicketStoragePath && app.flightTicketStoragePath.trim()) ||
      (app.flightTicketFileName && app.flightTicketFileName.trim())
  );

  return {
    applicationId: app.applicationId || app.id,
    userId: app.userId,
    fullName: app.fullName,
    universityName: app.universityName,
    country: app.country || app.nationality || 'International Student',
    whatsappNumber: app.whatsappNumber,
    arrivalDate: app.arrivalDate,
    arrivalTime: app.arrivalTime,
    arrivalAirport: app.arrivalAirport,
    airportCode: extractAirportIataCode(app.arrivalAirport),
    flightNumber: app.flightNumber,
    passportStatus: hasPassport ? 'Uploaded' : 'Missing',
    airticketStatus: hasTicket ? 'Uploaded' : 'Missing',
    applicationStatus: app.applicationStatus,
    submissionTimestamp: app.submissionTimestamp,
  };
}

export async function bulkUpdateSimApplicationsDoc(params: {
  applicationIds: string[];
  updates: {
    arrivalAirport?: string;
    arrivalDate?: string;
    applicationStatus?: SimApplicationStatus;
    arrivalGroupId?: string;
    arrivalGroupName?: string;
    adminNotes?: string;
  };
  adminActor: { uid: string; name: string; email: string };
}): Promise<{ updatedCount: number }> {
  const { applicationIds, updates, adminActor } = params;
  if (!applicationIds.length) return { updatedCount: 0 };

  const nowIso = new Date().toISOString();
  const idSet = new Set(applicationIds);

  // 1. Update local storage cache
  try {
    const localApps = readLocalJson<SimApplicationRecord[]>(LOCAL_SIM_APPLICATIONS_STORAGE_KEY, []);
    if (Array.isArray(localApps) && localApps.length > 0) {
      const nextApps = localApps.map((app) => {
        const key = app.applicationId || app.id;
        if (!idSet.has(key) && !idSet.has(app.id)) return app;
        return {
          ...app,
          ...(updates.arrivalAirport !== undefined ? { arrivalAirport: updates.arrivalAirport } : {}),
          ...(updates.arrivalDate !== undefined ? { arrivalDate: updates.arrivalDate } : {}),
          ...(updates.applicationStatus !== undefined ? { applicationStatus: updates.applicationStatus } : {}),
          ...(updates.arrivalGroupId !== undefined ? { arrivalGroupId: updates.arrivalGroupId } : {}),
          ...(updates.arrivalGroupName !== undefined ? { arrivalGroupName: updates.arrivalGroupName } : {}),
          ...(updates.adminNotes !== undefined ? { adminNotes: updates.adminNotes } : {}),
          updatedAt: nowIso,
          reviewedBy: adminActor.email,
          reviewedAt: nowIso,
        };
      });
      writeLocalJson(LOCAL_SIM_APPLICATIONS_STORAGE_KEY, nextApps);
    }
  } catch {
    // ignore
  }

  // 2. Update via Server API
  try {
    const token = await getCurrentIdToken();
    await fetch('/api/admin/sim-applications/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        applicationIds,
        updates,
        reviewedBy: adminActor.email,
      }),
    });
  } catch {
    // ignore network error
  }

  // 3. Update in Firestore
  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      for (const appId of applicationIds) {
        const ref = doc(db, 'sim_applications', appId);
        const payload: Record<string, any> = {
          updatedAt: nowIso,
          reviewedBy: adminActor.email,
          reviewedAt: nowIso,
        };
        if (updates.arrivalAirport !== undefined) payload.arrivalAirport = updates.arrivalAirport;
        if (updates.arrivalDate !== undefined) payload.arrivalDate = updates.arrivalDate;
        if (updates.applicationStatus !== undefined) payload.applicationStatus = updates.applicationStatus;
        if (updates.arrivalGroupId !== undefined) payload.arrivalGroupId = updates.arrivalGroupId;
        if (updates.arrivalGroupName !== undefined) payload.arrivalGroupName = updates.arrivalGroupName;
        if (updates.adminNotes !== undefined) payload.adminNotes = updates.adminNotes;
        batch.set(ref, payload, { merge: true });
      }
      await batch.commit();
    } catch {
      // ignore if some docs only exist on server
    }
  }

  await appendAuditLogToFirestore({
    id: `audit_sim_bulk_${Date.now()}`,
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'EDIT',
    targetEntity: 'SimApplication',
    targetId: applicationIds.slice(0, 3).join(','),
    targetName: `Bulk Update (${applicationIds.length} SIM Applications)`,
    details: `Bulk updated ${applicationIds.length} SIM applications: ${JSON.stringify(updates)}`,
  });

  return { updatedCount: applicationIds.length };
}

export async function fetchSimArrivalGroupsDoc(): Promise<SimArrivalGroupRecord[]> {
  let groups = readLocalJson<SimArrivalGroupRecord[]>(SIM_ARRIVAL_GROUPS_STORAGE_KEY, []);

  try {
    const token = await getCurrentIdToken();
    const res = await fetch('/api/admin/arrival-groups', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.groups)) {
        const map = new Map<string, SimArrivalGroupRecord>();
        for (const g of groups) map.set(g.id, g);
        for (const g of data.groups) if (g?.id) map.set(g.id, g);
        groups = Array.from(map.values());
        writeLocalJson(SIM_ARRIVAL_GROUPS_STORAGE_KEY, groups);
      }
    }
  } catch {
    // fallback
  }

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'sim_arrival_groups'));
      if (!snap.empty) {
        const map = new Map<string, SimArrivalGroupRecord>();
        for (const g of groups) map.set(g.id, g);
        snap.forEach((docSnap) => {
          const data = docSnap.data() as SimArrivalGroupRecord;
          const id = data.id || docSnap.id;
          map.set(id, { ...data, id });
        });
        groups = Array.from(map.values());
        writeLocalJson(SIM_ARRIVAL_GROUPS_STORAGE_KEY, groups);
      }
    } catch {
      // ignore
    }
  }

  return groups.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveSimArrivalGroupDoc(params: {
  groupId?: string;
  groupName?: string;
  airport: string;
  arrivalDate: string;
  students: SimApplicationRecord[];
  notes?: string;
  status?: 'Active' | 'Exported' | 'Completed' | 'Archived';
  adminActor: { uid: string; name: string; email: string };
}): Promise<SimArrivalGroupRecord> {
  const nowIso = new Date().toISOString();
  const airportCode = extractAirportIataCode(params.airport);
  const readableDate = formatReadableArrivalDate(params.arrivalDate);
  const defaultTitle = `${airportCode === 'OTHER' ? 'Korea' : airportCode} Airport — ${readableDate} Arrival Students`;
  const groupId = params.groupId || `grp_${airportCode.toLowerCase()}_${params.arrivalDate || 'date'}_${Date.now()}`;

  const snapshots = params.students.map(buildSnapshotFromSimApplication);
  const studentApplicationIds = snapshots.map((s) => s.applicationId);

  const record: SimArrivalGroupRecord = {
    id: groupId,
    groupName: params.groupName?.trim() || defaultTitle,
    airport: params.airport,
    airportCode,
    arrivalDate: params.arrivalDate,
    studentApplicationIds,
    studentSnapshots: snapshots,
    notes: params.notes || '',
    status: params.status || 'Active',
    snapshotUpdatedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: params.adminActor.uid,
    createdByName: params.adminActor.name || params.adminActor.email,
  };

  const existing = readLocalJson<SimArrivalGroupRecord[]>(SIM_ARRIVAL_GROUPS_STORAGE_KEY, []);
  const prev = existing.find((g) => g.id === groupId);
  if (prev) {
    record.createdAt = prev.createdAt;
  }

  const next = existing.some((g) => g.id === groupId)
    ? existing.map((g) => (g.id === groupId ? record : g))
    : [record, ...existing];
  writeLocalJson(SIM_ARRIVAL_GROUPS_STORAGE_KEY, next);

  // Sync to Server API
  try {
    const token = await getCurrentIdToken();
    await fetch('/api/admin/arrival-groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ group: record }),
    });
  } catch {
    // ignore
  }

  // Sync to Firestore
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'sim_arrival_groups', record.id), record, { merge: true });
    } catch {
      // ignore
    }
  }

  // Link applications to this group
  if (studentApplicationIds.length > 0) {
    await bulkUpdateSimApplicationsDoc({
      applicationIds: studentApplicationIds,
      updates: {
        arrivalGroupId: record.id,
        arrivalGroupName: record.groupName,
      },
      adminActor: params.adminActor,
    });
  }

  await appendAuditLogToFirestore({
    id: `audit_sim_group_${Date.now()}`,
    timestamp: nowIso,
    adminId: params.adminActor.uid,
    adminName: params.adminActor.name,
    adminEmail: params.adminActor.email,
    actionType: prev ? 'EDIT' : 'CREATE',
    targetEntity: 'SimArrivalGroup',
    targetId: record.id,
    targetName: record.groupName,
    details: `${prev ? 'Updated' : 'Created'} Arrival Group "${record.groupName}" with ${studentApplicationIds.length} students (${record.airportCode}, ${record.arrivalDate})`,
  });

  return record;
}

export async function refreshSimArrivalGroupSnapshotDoc(params: {
  group: SimArrivalGroupRecord;
  latestApplications: SimApplicationRecord[];
  adminActor: { uid: string; name: string; email: string };
}): Promise<SimArrivalGroupRecord> {
  const { group, latestApplications, adminActor } = params;
  const appMap = new Map<string, SimApplicationRecord>();
  for (const app of latestApplications) {
    appMap.set(app.applicationId || app.id, app);
    appMap.set(app.id, app);
  }

  const matchedApps: SimApplicationRecord[] = [];
  for (const id of group.studentApplicationIds) {
    const found = appMap.get(id);
    if (found) matchedApps.push(found);
  }

  return saveSimArrivalGroupDoc({
    groupId: group.id,
    groupName: group.groupName,
    airport: group.airport,
    arrivalDate: group.arrivalDate,
    students: matchedApps,
    notes: group.notes,
    status: group.status,
    adminActor,
  });
}

export async function deleteSimArrivalGroupDoc(
  groupId: string,
  groupName: string,
  adminActor: { uid: string; name: string; email: string }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const existing = readLocalJson<SimArrivalGroupRecord[]>(SIM_ARRIVAL_GROUPS_STORAGE_KEY, []);
  writeLocalJson(
    SIM_ARRIVAL_GROUPS_STORAGE_KEY,
    existing.filter((g) => g.id !== groupId)
  );

  try {
    const token = await getCurrentIdToken();
    await fetch(`/api/admin/arrival-groups/${encodeURIComponent(groupId)}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    // ignore
  }

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'sim_arrival_groups', groupId));
    } catch {
      // ignore
    }
  }

  await appendAuditLogToFirestore({
    id: `audit_sim_group_del_${Date.now()}`,
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'DELETE',
    targetEntity: 'SimArrivalGroup',
    targetId: groupId,
    targetName: groupName,
    details: `Deleted Arrival Group "${groupName}" (${groupId})`,
  });
}

export async function fetchSimExportHistoryDoc(): Promise<SimExportHistoryRecord[]> {
  let history = readLocalJson<SimExportHistoryRecord[]>(SIM_EXPORT_HISTORY_STORAGE_KEY, []);

  try {
    const token = await getCurrentIdToken();
    const res = await fetch('/api/admin/sim-export-history', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.history)) {
        const map = new Map<string, SimExportHistoryRecord>();
        for (const h of history) map.set(h.id, h);
        for (const h of data.history) if (h?.id) map.set(h.id, h);
        history = Array.from(map.values());
        writeLocalJson(SIM_EXPORT_HISTORY_STORAGE_KEY, history);
      }
    }
  } catch {
    // fallback
  }

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'sim_export_history'));
      if (!snap.empty) {
        const map = new Map<string, SimExportHistoryRecord>();
        for (const h of history) map.set(h.id, h);
        snap.forEach((docSnap) => {
          const data = docSnap.data() as SimExportHistoryRecord;
          const id = data.id || docSnap.id;
          map.set(id, { ...data, id });
        });
        history = Array.from(map.values());
        writeLocalJson(SIM_EXPORT_HISTORY_STORAGE_KEY, history);
      }
    } catch {
      // ignore
    }
  }

  return history.sort((a, b) => (b.exportedAt || '').localeCompare(a.exportedAt || ''));
}

export async function recordSimExportHistoryDoc(
  entry: Omit<SimExportHistoryRecord, 'id' | 'exportedAt'>,
  adminActor: { uid: string; name: string; email: string }
): Promise<SimExportHistoryRecord> {
  const nowIso = new Date().toISOString();
  const record: SimExportHistoryRecord = {
    ...entry,
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    exportedAt: nowIso,
  };

  const existing = readLocalJson<SimExportHistoryRecord[]>(SIM_EXPORT_HISTORY_STORAGE_KEY, []);
  writeLocalJson(SIM_EXPORT_HISTORY_STORAGE_KEY, [record, ...existing]);

  try {
    const token = await getCurrentIdToken();
    await fetch('/api/admin/sim-export-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ record }),
    });
  } catch {
    // ignore
  }

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'sim_export_history', record.id), record, { merge: true });
    } catch {
      // ignore
    }
  }

  await appendAuditLogToFirestore({
    id: `audit_sim_export_${Date.now()}`,
    timestamp: nowIso,
    adminId: adminActor.uid,
    adminName: adminActor.name,
    adminEmail: adminActor.email,
    actionType: 'EXPORT',
    targetEntity: 'ExportReport',
    targetId: record.id,
    targetName: record.fileName,
    details: `Generated ${record.exportType} "${record.fileName}" for ${record.totalStudents} students (Complete: ${record.completeSubmissionsCount}, Missing Docs: ${record.missingDocumentsCount})`,
  });

  return record;
}
