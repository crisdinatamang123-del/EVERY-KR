/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageCode =
  | 'en'
  | 'ko'
  | 'bn'
  | 'ne'
  | 'hi'
  | 'ur'
  | 'ar'
  | 'zh'
  | 'ja'
  | 'vi'
  | 'th'
  | 'id'
  | 'ms'
  | 'ru'
  | 'es'
  | 'mn';

export type SupportedLanguage = LanguageCode;

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇺🇸' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', flag: '🇰🇷' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', direction: 'ltr', flag: '🇧🇩' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', direction: 'ltr', flag: '🇳🇵' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl', flag: '🇵🇰' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', direction: 'ltr', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', flag: '🇯🇵' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr', flag: '🇻🇳' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'ltr', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', direction: 'ltr', flag: '🇲🇾' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', flag: '🇪🇸' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', direction: 'ltr', flag: '🇲🇳' },
];

export const isRtlLanguage = (code: LanguageCode): boolean => {
  return code === 'ar' || code === 'ur';
};

export const detectBrowserLanguage = (): LanguageCode => {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = (navigator.language || 'en').toLowerCase();
  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('bn')) return 'bn';
  if (browserLang.startsWith('ne')) return 'ne';
  if (browserLang.startsWith('hi')) return 'hi';
  if (browserLang.startsWith('ur')) return 'ur';
  if (browserLang.startsWith('ar')) return 'ar';
  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('vi')) return 'vi';
  if (browserLang.startsWith('th')) return 'th';
  if (browserLang.startsWith('id')) return 'id';
  if (browserLang.startsWith('ms')) return 'ms';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('es')) return 'es';
  return 'en';
};

export interface Translations {
  nav: {
    home: string;
    universities: string;
    housing: string;
    survival: string;
    jobs: string;
    marketplace: string;
    grocery: string;
    community: string;
    transitHealth: string;
    transit?: string;
    assistant: string;
    visa?: string;
    myPage: string;
    admin: string;
    deploy: string;
    deployExport?: string;
    signIn: string;
  };
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    exploreAll: string;
  };
  actions: {
    save: string;
    saved: string;
    apply: string;
    details: string;
    contact: string;
    filter: string;
    reset: string;
    close: string;
    submit: string;
    cancel: string;
  };
  assistant: {
    title: string;
    subtitle: string;
    placeholder: string;
    send: string;
    suggestedScenarios: string;
  };
  survival: {
    title: string;
    subtitle: string;
  };
  jobs: {
    title: string;
    subtitle: string;
    hourlyWage: string;
    workPermitNotice: string;
  };
  housing: {
    title: string;
    subtitle: string;
    rent: string;
    deposit: string;
  };
  visa: {
    title: string;
    countdown: string;
    daysRemaining: string;
  };
}

export const translations: Record<LanguageCode, Translations> = {
  en: {
    nav: {
      home: 'Home',
      universities: 'Universities',
      housing: 'Housing',
      survival: 'Survival Guide',
      jobs: 'Jobs',
      marketplace: 'Marketplace',
      grocery: 'Grocery',
      community: 'Community',
      transitHealth: 'Transit & Health',
      assistant: 'Korean AI',
      myPage: 'My Page',
      admin: 'Admin Console',
      deploy: 'Deploy & Export',
      signIn: 'Sign In',
    },
    hero: {
      kicker: 'South Korea International Student Hub',
      title: 'Everything Korea, One Platform.',
      subtitle: 'Navigating life in South Korea made effortless. Search university admissions, verified student housing, KTX travel discounts, secondhand gear, and immigration compliance in one unified ecosystem.',
      searchPlaceholder: 'Search universities, goshiwons, KTX routes, visas, jobs...',
      exploreAll: 'Explore All',
    },
    actions: {
      save: 'Save',
      saved: 'Saved',
      apply: 'Apply Now',
      details: 'View Details',
      contact: 'Contact',
      filter: 'Filter',
      reset: 'Reset Filters',
      close: 'Close',
      submit: 'Submit',
      cancel: 'Cancel',
    },
    assistant: {
      title: 'Korean Language & Cultural Assistant',
      subtitle: 'Ask about Korean expressions, immigration inquiries, landlord negotiation, and campus life.',
      placeholder: 'Ask in any language: e.g. How do I politely ask my landlord to fix my heater?',
      send: 'Ask Assistant',
      suggestedScenarios: 'Quick Daily Scenarios',
    },
    survival: {
      title: 'Korea Survival Center',
      subtitle: 'Essential newcomer guides: SIM cards, banking without ARC, airport AREX train, and waste sorting.',
    },
    jobs: {
      title: 'Student Job Marketplace',
      subtitle: 'Legal part-time jobs (시간제취업 S-3) for international students with confirmed hourly wages above minimum wage.',
      hourlyWage: 'Hourly Wage',
      workPermitNotice: 'Important: Must obtain campus international office signature and HiKorea S-3 permit before starting work.',
    },
    housing: {
      title: 'Student Housing Directory',
      subtitle: 'Verified goshiwons, studios, and dorms near Seoul and regional university campuses.',
      rent: 'Monthly Rent',
      deposit: 'Security Deposit',
    },
    visa: {
      title: 'Visa & Immigration Center',
      countdown: 'Alien Registration (ARC) Expiry',
      daysRemaining: 'Days Remaining',
    },
  },
  ko: {
    nav: {
      home: '홈',
      universities: '대학 디렉토리',
      housing: '학생 주거',
      survival: '한국 생활 가이드',
      jobs: '아르바이트/채용',
      marketplace: '중고장터',
      grocery: '식료품/마트',
      community: '유학생 커뮤니티',
      transitHealth: '교통 및 의료',
      assistant: '한국어 AI 도우미',
      myPage: '마이페이지',
      admin: '관리자 콘솔',
      deploy: '배포 및 설정',
      signIn: '로그인',
    },
    hero: {
      kicker: '대한민국 외국인 유학생 통합 플랫폼',
      title: 'Everything Korea, 하나의 플랫폼.',
      subtitle: '한국 유학 생활의 모든 것. 대학 입학 요강, 검증된 원룸/고시원, KTX 교통 할인, 캠퍼스 중고거래 및 비자 출입국 가이드를 통합 제공합니다.',
      searchPlaceholder: '대학, 고시원, KTX 노선, 비자 규정, 아르바이트 검색...',
      exploreAll: '전체 탐색',
    },
    actions: {
      save: '저장',
      saved: '저장됨',
      apply: '지원하기',
      details: '상세보기',
      contact: '문의하기',
      filter: '필터',
      reset: '필터 초기화',
      close: '닫기',
      submit: '등록하기',
      cancel: '취소',
    },
    assistant: {
      title: '한국어 및 생활 문화 도우미',
      subtitle: '집주인 대화, 출입국 문의, 관공서 표현 등 유학생을 위한 맞춤형 한국어 안내를 제공합니다.',
      placeholder: '예: 보일러가 고장났을 때 집주인에게 공손하게 요청하는 방법은?',
      send: '질문하기',
      suggestedScenarios: '추천 일상 상황',
    },
    survival: {
      title: '한국 생활 가이드 (Survival Center)',
      subtitle: '외국인등록증 발급 전 계좌 개설, 알뜰폰 USIM, 분리수거 및 공항철도 안내.',
    },
    jobs: {
      title: '유학생 시간제 취업 (아르바이트)',
      subtitle: '시간제취업(S-3) 허가 가능 및 최저시급 준수 공고.',
      hourlyWage: '시급',
      workPermitNotice: '유의사항: 근무 시작 전 반드시 대학 유학생 담당자 확인 및 하이코리아 허가를 받아야 합니다.',
    },
    housing: {
      title: '학생 주거 디렉토리',
      subtitle: '신촌, 안암, 혜화, 왕십리 등 대학가 인근 검증된 고시원 및 원룸.',
      rent: '월세',
      deposit: '보증금',
    },
    visa: {
      title: '비자 및 출입국 센터',
      countdown: '외국인등록증(ARC) 만료 카운트다운',
      daysRemaining: '일 남음',
    },
  },
  bn: {
    nav: {
      home: 'হোম',
      universities: 'বিশ্ববিদ্যালয়',
      housing: 'আবাসন',
      survival: 'সারভাইভাল গাইড',
      jobs: 'চাকরি ও পার্টটাইম',
      marketplace: 'মার্কেটপ্লেস',
      grocery: 'মুদি ও হালাল খাবার',
      community: 'কমিউনিটি',
      transitHealth: 'যাতায়াত ও স্বাস্থ্য',
      assistant: 'কোরিয়ান এআই',
      myPage: 'আমার পাতা',
      admin: 'অ্যাডমিন',
      deploy: 'ডিপ্লয় গাইড',
      signIn: 'সাইন ইন',
    },
    hero: {
      kicker: 'দক্ষিণ কোরিয়ার আন্তর্জাতিক ছাত্র প্ল্যাটফর্ম',
      title: 'Everything Korea, একটি প্ল্যাটফর্ম।',
      subtitle: 'দক্ষিণ কোরিয়ায় ছাত্রজীবনের সম্পূর্ণ নির্দেশিকা: বিশ্ববিদ্যালয় ভর্তি, গোশিওয়ান ও বাসা ভাড়া, কেটিএক্স ডিসকাউন্ট এবং ভিসা আইন।',
      searchPlaceholder: 'বিশ্ববিদ্যালয়, বাসা, কেটিএক্স, ভিসা এবং কাজ খুঁজুন...',
      exploreAll: 'সব দেখুন',
    },
    actions: {
      save: 'সংরক্ষণ',
      saved: 'সংরক্ষিত',
      apply: 'আবেদন করুন',
      details: 'বিস্তারিত',
      contact: 'যোগাযোগ',
      filter: 'ফিল্টার',
      reset: 'রিসেট',
      close: 'বন্ধ করুন',
      submit: 'জমা দিন',
      cancel: 'বাতিল',
    },
    assistant: {
      title: 'কোরিয়ান ভাষা ও সংস্কৃতি সহকারী',
      subtitle: 'কোরিয়ান বাক্য, বাড়িওয়ালা ও ইমিগ্রেশন অফিসের ভাষা শিখুন।',
      placeholder: 'বাংলা বা ইংরেজিতে প্রশ্ন করুন...',
      send: 'জিজ্ঞাসা করুন',
      suggestedScenarios: 'প্রয়োজনীয় বাক্য',
    },
    survival: {
      title: 'কোরিয়া সারভাইভাল সেন্টার',
      subtitle: 'ব্যাংক অ্যাকাউন্ট, সিম কার্ড ও ট্রানজিট কার্ড নির্দেশিকা।',
    },
    jobs: {
      title: 'ছাত্র চাকরি মার্কেটপ্লেস',
      subtitle: 'আইনসম্মত পার্ট-টাইম কাজ (S-3 ওয়ার্ক পারমিট সহ)।',
      hourlyWage: 'ঘণ্টাপ্রতি বেতন',
      workPermitNotice: 'সতর্কতা: কাজ শুরুর আগে বিশ্ববিদ্যালয় এবং হাই-কোরিয়া থেকে লিখিত অনুমতি নিন।',
    },
    housing: {
      title: 'ছাত্র আবাসন নির্দেশিকা',
      subtitle: 'গোশিওয়ান, ওয়ান-রুম এবং বিশ্ববিদ্যালয় ডরমিটরি।',
      rent: 'মাসিক ভাড়া',
      deposit: 'জামানত (ডিপোজিট)',
    },
    visa: {
      title: 'ভিসা ও ইমিগ্রেশন',
      countdown: 'এলিয়েন রেজিস্ট্রেশন কার্ড (ARC) মেয়াদ',
      daysRemaining: 'দিন বাকি',
    },
  },
  ne: {
    nav: {
      home: 'गृहपृष्ठ',
      universities: 'विश्वविद्यालयहरू',
      housing: 'कोठा र आवास',
      survival: 'बसाइँ गाइड',
      jobs: 'काम र रोजगार',
      marketplace: 'बजार (किनबेच)',
      grocery: 'किराना र पसल',
      community: 'विद्यार्थी समूह',
      transitHealth: 'यातायात र अस्पताल',
      assistant: 'कोरियन भाषा एआई',
      myPage: 'मेरो प्रोफाइल',
      admin: 'प्रशासक',
      deploy: 'सेटअप गाइड',
      signIn: 'साइन इन',
    },
    hero: {
      kicker: 'दक्षिण कोरियामा अध्ययनरत विद्यार्थीहरूको साझा मञ्च',
      title: 'Everything Korea, एकै ठाउँमा।',
      subtitle: 'कोरियामा विद्यार्थी जीवनलाई सहज बनाउनुहोस्: कलेज भर्ना, सुरक्षित कोठा, सस्तो यात्रा र भिसा नियमहरू।',
      searchPlaceholder: 'कलेज, कोठा, रेल, भिसा, काम खोज्नुहोस्...',
      exploreAll: 'सबै हेर्नुहोस्',
    },
    actions: {
      save: 'सेभ गर्नुहोस्',
      saved: 'सेभ गरियो',
      apply: 'आवेदन दिनुहोस्',
      details: 'विवरण हेर्नुहोस्',
      contact: 'सम्पर्क',
      filter: 'फिल्टर',
      reset: 'रिसेट',
      close: 'बन्द गर्नुहोस्',
      submit: 'पेश गर्नुहोस्',
      cancel: 'रद्द गर्नुहोस्',
    },
    assistant: {
      title: 'कोरियन भाषा र जीवनशैली सहयोगी',
      subtitle: 'दैनिक कोरियन कुराकानी, घरबेटीसँग बोल्ने तरिका र भिसा सोधपुछ।',
      placeholder: 'नेपाली वा अंग्रेजीमा सोध्नुहोस्...',
      send: 'सोध्नुहोस्',
      suggestedScenarios: 'दैनिक वाक्यहरू',
    },
    survival: {
      title: 'कोरिया जीवन गाइड',
      subtitle: 'बैंक खाता, सिम कार्ड, ट्राभल कार्ड र बसाइँ सल्लाह।',
    },
    jobs: {
      title: 'विद्यार्थी पार्ट-टाइम काम',
      subtitle: 'कानूनी S-3 अनुमति भएका कामहरू र न्यूनतम ज्याला।',
      hourlyWage: 'प्रति घण्टा ज्याला',
      workPermitNotice: 'काम सुरु गर्नु अघि कलेज र अध्यागमनबाट अनुमति लिनु अनिवार्य छ।',
    },
    housing: {
      title: 'विद्यार्थी आवास गाइड',
      subtitle: 'गोसिवोन, वान-रूम स्टुडियो र सेयरहाउस।',
      rent: 'मासिक भाडा',
      deposit: 'धरौटी (डिपोजिट)',
    },
    visa: {
      title: 'भिसा र बसाइँ व्यवस्थापन',
      countdown: 'विदेशी दर्ता कार्ड (ARC) म्याद',
      daysRemaining: 'दिन बाँकी',
    },
  },
  hi: {
    nav: {
      home: 'होम',
      universities: 'विश्वविद्यालय',
      housing: 'आवास / कमरे',
      survival: 'सर्वाइवल गाइड',
      jobs: 'नौकरियां / पार्ट-टाइम',
      marketplace: 'मार्केटप्लेस',
      grocery: 'किराना और हलाल',
      community: 'कम्युनिटी फोरम',
      transitHealth: 'परिवहन और स्वास्थ्य',
      assistant: 'कोरियन एआई',
      myPage: 'माई पेज',
      admin: 'व्यवस्थापक',
      deploy: 'होस्टिंग गाइड',
      signIn: 'साइन इन',
    },
    hero: {
      kicker: 'दक्षिण कोरिया में अंतर्राष्ट्रीय छात्रों का केंद्र',
      title: 'Everything Korea, एक ही मंच पर।',
      subtitle: 'विश्वविद्यालय प्रवेश, गोशिवोन, कमरे, KTX छूट और वीज़ा नियमों की पूरी जानकारी।',
      searchPlaceholder: 'विश्वविद्यालय, कमरे, ट्रेन, वीजा, जॉब्स खोजें...',
      exploreAll: 'सभी देखें',
    },
    actions: {
      save: 'सहेजें',
      saved: 'सहेजा गया',
      apply: 'आवेदन करें',
      details: 'विवरण देखें',
      contact: 'संपर्क',
      filter: 'फ़िल्टर',
      reset: 'रीसेट',
      close: 'बंद करें',
      submit: 'जमा करें',
      cancel: 'रद्द करें',
    },
    assistant: {
      title: 'कोरियन भाषा और संस्कृति सहायक',
      subtitle: 'दैनिक बातचीत, मकान मालिक से संवाद और वीज़ा कार्यालय प्रश्न।',
      placeholder: 'हिंदी या अंग्रेजी में पूछें...',
      send: 'पूछें',
      suggestedScenarios: 'दैनिक परिदृश्य',
    },
    survival: {
      title: 'कोरिया सर्वाइवल गाइड',
      subtitle: 'बैंक खाता, सिम कार्ड और जलवायु कार्ड (Climate Card) की पूरी जानकारी।',
    },
    jobs: {
      title: 'पार्ट-टाइम जॉब मार्केटप्लेस',
      subtitle: 'छात्रों के लिए कानूनी पार्ट-टाइम काम (S-3 वर्क परमिट के साथ)।',
      hourlyWage: 'प्रति घंटा वेतन',
      workPermitNotice: 'सावधानी: काम शुरू करने से पहले यूनिवर्सिटी और इमिग्रेशन से अनुमति लेना अनिवार्य है।',
    },
    housing: {
      title: 'छात्र आवास निर्देशिका',
      subtitle: 'गोशिवोन, वन-रूम फ्लैट और यूनिवर्सिटी हॉस्टल।',
      rent: 'मासिक किराया',
      deposit: 'सुरक्षा जमा (डिपॉजिट)',
    },
    visa: {
      title: 'वीज़ा और आप्रवासन',
      countdown: 'विदेशी पंजीकरण कार्ड (ARC) समाप्ति',
      daysRemaining: 'दिन शेष',
    },
  },
  ur: {
    nav: {
      home: 'ہوم',
      universities: 'یونیورسٹیاں',
      housing: 'رہائش',
      survival: 'رہنمائے قیام',
      jobs: 'ملازمتیں',
      marketplace: 'مارکیٹ پلیس',
      grocery: 'حلال گروسری',
      community: 'طلباء کمیونٹی',
      transitHealth: 'ٹرانسپورٹ اور صحت',
      assistant: 'کوریائی زبان معاون',
      myPage: 'میری پروفائل',
      admin: 'ایڈمن کنٹرول',
      deploy: 'سیٹ اپ گائیڈ',
      signIn: 'لاگ ان',
    },
    hero: {
      kicker: 'جنوبی کوریا میں غیر ملکی طلباء کا مرکزی پلیٹ فارم',
      title: 'Everything Korea, ایک ہی پلیٹ فارم۔',
      subtitle: 'جنوبی کوریا میں داخلے، تصدیق شدہ رہائش، کے ٹی ایکس ڈسکاؤنٹ اور ویزا قوانین کی مکمل رہنمائی۔',
      searchPlaceholder: 'یونیورسٹیاں، کمرے، ٹرین، ویزا اور ملازمتیں تلاش کریں...',
      exploreAll: 'سب دیکھیں',
    },
    actions: {
      save: 'محفوظ کریں',
      saved: 'محفوظ شدہ',
      apply: 'درخواست دیں',
      details: 'تفصیلات',
      contact: 'رابطہ کریں',
      filter: 'فلٹر',
      reset: 'دوبارہ ترتیب دیں',
      close: 'بند کریں',
      submit: 'جمع کرائیں',
      cancel: 'منسوخ',
    },
    assistant: {
      title: 'کوریائی زبان اور ثقافتی معاون',
      subtitle: 'روزمرہ کوریائی بول چال، مکان مالک اور امیگریشن آفس کے سوالات۔',
      placeholder: 'اردو یا انگریزی میں پوچھیں...',
      send: 'پوچھیں',
      suggestedScenarios: 'روزمرہ جملے',
    },
    survival: {
      title: 'کوریا سروائیول گائیڈ',
      subtitle: 'بینک اکاؤنٹ، موبائل سم، اور میٹرو کارڈ کی معلومات۔',
    },
    jobs: {
      title: 'طلباء کے لیے پارٹ ٹائم ملازمتیں',
      subtitle: 'قانونی S-3 ورک پرمٹ اور کم از کم اجرت کی گارنٹی۔',
      hourlyWage: 'فی گھنٹہ اجرت',
      workPermitNotice: 'اہم: کام شروع کرنے سے قبل یونیورسٹی اور امیگریشن سے اجازت نامہ لازمی ہے۔',
    },
    housing: {
      title: 'طالبعلم رہائش گاہیں',
      subtitle: 'گوشیوان، ون روم اپارٹمنٹس اور ہاسٹل۔',
      rent: 'ماہانہ کرایہ',
      deposit: 'سیکیورٹی ڈپازٹ',
    },
    visa: {
      title: 'ویزا اور امیگریشن سینٹر',
      countdown: 'اے آر سی کارڈ کی میعاد ختم ہونے میں',
      daysRemaining: 'دن باقی',
    },
  },
  ar: {
    nav: {
      home: 'الرئيسية',
      universities: 'الجامعات',
      housing: 'السكن الطلابي',
      survival: 'دليل المعيشة',
      jobs: 'وظائف الطلاب',
      marketplace: 'سوق المستعمل',
      grocery: 'البقالة الحلال',
      community: 'مجتمع الطلاب',
      transitHealth: 'المواصلات والصحة',
      assistant: 'المساعد الكوري',
      myPage: 'صفحتي',
      admin: 'لوحة التحكم',
      deploy: 'دليل النشر',
      signIn: 'تسجيل الدخول',
    },
    hero: {
      kicker: 'بوابة الطلاب الدوليين في كوريا الجنوبية',
      title: 'Everything Korea، منصة واحدة شاملة.',
      subtitle: 'كل ما تحتاجه للدراسة والمعيشة في كوريا: القبول الجامعي، السكن المعتمد، بطاقات المواصلات، وإجراءات التأشيرة والإقامة.',
      searchPlaceholder: 'ابحث عن الجامعات، السكن، قطارات KTX، التأشيرات، والوظائف...',
      exploreAll: 'استكشف الكل',
    },
    actions: {
      save: 'حفظ',
      saved: 'محفوظ',
      apply: 'قدم الآن',
      details: 'التفاصيل',
      contact: 'اتصال',
      filter: 'تصفية',
      reset: 'إعادة ضبط',
      close: 'إغلاق',
      submit: 'إرسال',
      cancel: 'إلغاء',
    },
    assistant: {
      title: 'مساعد اللغة الكورية والثقافة',
      subtitle: 'تعلم عبارات الحياة اليومية، التحدث مع المؤجر، ومراجعة الهجرة.',
      placeholder: 'اسأل بالعربية أو الإنجليزية...',
      send: 'إرسال السؤال',
      suggestedScenarios: 'محادثات شائعة',
    },
    survival: {
      title: 'دليل الاستقرار في كوريا',
      subtitle: 'فتح الحساب البنكي، شرائح الاتصال، وبطاقة المواصلات غير المحدودة.',
    },
    jobs: {
      title: 'سوق وظائف الطلاب',
      subtitle: 'فرص عمل جزئي قانونية للطلاب بتصريح S-3 معتمد.',
      hourlyWage: 'الأجر بالساعة',
      workPermitNotice: 'تنبيه: يجب الحصول على موافقة الجامعة ومكتب الهجرة قبل بدء أي عمل.',
    },
    housing: {
      title: 'دليل السكن الطلابي',
      subtitle: 'غرف غوشيون، استوديوهات ون-روم، وسكن جامعي معتمد.',
      rent: 'الإيجار الشهري',
      deposit: 'مبلغ التأمين',
    },
    visa: {
      title: 'مركز التأشيرات والهجرة',
      countdown: 'انتهاء صلاحية بطاقة الإقامة (ARC)',
      daysRemaining: 'يوماً متبقياً',
    },
  },
  zh: {
    nav: {
      home: '首页',
      universities: '大学院校',
      housing: '留学生住房',
      survival: '韩国生存指南',
      jobs: '兼职/求职',
      marketplace: '二手集市',
      grocery: '超市便利',
      community: '留学生社区',
      transitHealth: '交通与医疗',
      assistant: '韩语AI助手',
      myPage: '个人中心',
      admin: '管理后台',
      deploy: '部署指南',
      signIn: '登录/注册',
    },
    hero: {
      kicker: '韩国留学生一站式服务平台',
      title: 'Everything Korea, 一站全览。',
      subtitle: '轻松开启在韩留学生活：名校招生简章、认证考试院/One-room、KTX学生折扣、二手好物及打工签证合规指导。',
      searchPlaceholder: '搜索大学、考试院、KTX线路、签证、兼职...',
      exploreAll: '查看全部',
    },
    actions: {
      save: '收藏',
      saved: '已收藏',
      apply: '立即申请',
      details: '查看详情',
      contact: '联系房东/卖家',
      filter: '筛选',
      reset: '重置',
      close: '关闭',
      submit: '提交',
      cancel: '取消',
    },
    assistant: {
      title: '韩语交流与生活AI助手',
      subtitle: '随时询问日常表达、房东租房沟通、出入境办事及语调敬语礼仪。',
      placeholder: '用中文输入提问，例如：怎么礼貌地让房东维修地暖？',
      send: '发送提问',
      suggestedScenarios: '常用留学情景',
    },
    survival: {
      title: '韩国生存指南 (Survival Center)',
      subtitle: '登陆证办理前开户技巧、预付费电话卡、气候同行卡及垃圾分类攻略。',
    },
    jobs: {
      title: '留学生打工求职平台',
      subtitle: '符合S-3打工许可、保证合法最低时薪的优质勤工俭学岗位。',
      hourlyWage: '时薪 (KRW)',
      workPermitNotice: '重要提醒：上岗前必须获得大学国际处签字及HiKorea时间制就业许可。',
    },
    housing: {
      title: '留学生房源目录',
      subtitle: '新村、安岩、惠化、往十里等名校商圈认证考试院与One-room。',
      rent: '月租',
      deposit: '保证金',
    },
    visa: {
      title: '签证与出入境指南',
      countdown: '外国人登录证 (ARC) 有效期倒计时',
      daysRemaining: '天到期',
    },
  },
  ja: {
    nav: {
      home: 'ホーム',
      universities: '大学一覧',
      housing: '住まい・ワンルーム',
      survival: '生活ガイド',
      jobs: 'アルバイト・求人',
      marketplace: 'フリマ・中古',
      grocery: 'スーパー・食材',
      community: '留学生コミュニティ',
      transitHealth: '交通・医療',
      assistant: '韓国語AIアシスタント',
      myPage: 'マイページ',
      admin: '管理者画面',
      deploy: 'デプロイ設定',
      signIn: 'ログイン',
    },
    hero: {
      kicker: '韓国留学生のための総合プラットフォーム',
      title: 'Everything Korea、すべてをひとつに。',
      subtitle: '大学入試情報、安心のコシウォン・ワンルーム、KTX割引、キャンパスフリマ、外国人登録手続きまでをサポート。',
      searchPlaceholder: '大学、住まい、KTX、ビザ、バイトを検索...',
      exploreAll: 'すべて見る',
    },
    actions: {
      save: '保存',
      saved: '保存済み',
      apply: '出願する',
      details: '詳細を見る',
      contact: '問い合わせ',
      filter: '絞り込み',
      reset: 'リセット',
      close: '閉じる',
      submit: '送信',
      cancel: 'キャンセル',
    },
    assistant: {
      title: '韓国語・文化AIアシスタント',
      subtitle: '大家さんへの連絡、出入国手続き、日常会話の敬語チェックなど。',
      placeholder: '日本語で質問できます：例「オンドルの修理を丁寧に頼むには？」',
      send: '質問する',
      suggestedScenarios: 'よくあるシチュエーション',
    },
    survival: {
      title: '韓国生活サバイバルガイド',
      subtitle: '外国人登録証前の銀行口座開設、SIMカード、気候同行カードの使い方。',
    },
    jobs: {
      title: '留学生アルバイト情報',
      subtitle: '時間外就業許可(S-3)対応、法定最低賃金以上の安全なアルバイト。',
      hourlyWage: '時給',
      workPermitNotice: '注意：勤務開始前に大学の担当窓口および出入国管理所への申請が必須です。',
    },
    housing: {
      title: '学生向け住まいディレクトリ',
      subtitle: '新村・安岩・恵化など主要大学周辺のコシウォンとワンルーム。',
      rent: '家賃（月額）',
      deposit: '保証金',
    },
    visa: {
      title: 'ビザ・出入国手続き',
      countdown: '外国人登録証（ARC）有効期限',
      daysRemaining: '日残り',
    },
  },
  vi: {
    nav: {
      home: 'Trang chủ',
      universities: 'Danh bạ Đại học',
      housing: 'Nhà ở & Goshiwon',
      survival: 'Cẩm nang Du học',
      jobs: 'Việc làm thêm',
      marketplace: 'Chợ đồ cũ',
      grocery: 'Thực phẩm & Chợ',
      community: 'Cộng đồng du học',
      transitHealth: 'Giao thông & Y tế',
      assistant: 'Trợ lý tiếng Hàn AI',
      myPage: 'Trang cá nhân',
      admin: 'Quản trị viên',
      deploy: 'Hướng dẫn cài đặt',
      signIn: 'Đăng nhập',
    },
    hero: {
      kicker: 'Cổng thông tin du học sinh quốc tế tại Hàn Quốc',
      title: 'Everything Korea, Tất cả trong một.',
      subtitle: 'Hành trang trọn vẹn cho du học sinh: tuyển sinh đại học, phòng trọ goshiwon uy tín, vé tàu KTX giảm giá, và quy định visa chuẩn xác.',
      searchPlaceholder: 'Tìm trường đại học, nhà trọ, KTX, visa, việc làm...',
      exploreAll: 'Khám phá tất cả',
    },
    actions: {
      save: 'Lưu',
      saved: 'Đã lưu',
      apply: 'Nộp hồ sơ',
      details: 'Xem chi tiết',
      contact: 'Liên hệ',
      filter: 'Lọc',
      reset: 'Đặt lại',
      close: 'Đóng',
      submit: 'Gửi đi',
      cancel: 'Hủy bỏ',
    },
    assistant: {
      title: 'Trợ lý Ngôn ngữ & Văn hóa Hàn Quốc',
      subtitle: 'Hỏi đáp tiếng Hàn giao tiếp, trao đổi với chủ nhà trọ và thủ tục xuất nhập cảnh.',
      placeholder: 'Đặt câu hỏi bằng tiếng Việt: ví dụ cách nói nhờ chủ nhà sửa bình nóng lạnh...',
      send: 'Gửi câu hỏi',
      suggestedScenarios: 'Tình huống thường gặp',
    },
    survival: {
      title: 'Cẩm nang Sống tại Hàn Quốc',
      subtitle: 'Mở tài khoản ngân hàng khi chưa có thẻ ARC, SIM điện thoại, thẻ Climate Card.',
    },
    jobs: {
      title: 'Việc làm thêm cho Du học sinh',
      subtitle: 'Việc làm hợp pháp theo giấy phép S-3, cam kết lương tối thiểu đúng quy định.',
      hourlyWage: 'Lương theo giờ',
      workPermitNotice: 'Lưu ý: Phải có chữ ký của nhà trường và giấy phép HiKorea trước khi đi làm.',
    },
    housing: {
      title: 'Danh bạ Nhà ở Du học sinh',
      subtitle: 'Goshiwon, One-room và ký túc xá gần các trường đại học tại Seoul.',
      rent: 'Tiền thuê hàng tháng',
      deposit: 'Tiền đặt cọc (보증금)',
    },
    visa: {
      title: 'Thủ tục Visa & Cục Xuất nhập cảnh',
      countdown: 'Hạn thẻ cư trú người nước ngoài (ARC)',
      daysRemaining: 'ngày còn lại',
    },
  },
  th: {
    nav: {
      home: 'หน้าแรก',
      universities: 'มหาวิทยาลัย',
      housing: 'ที่พักนักศึกษา',
      survival: 'คู่มือการใช้ชีวิต',
      jobs: 'งานพาร์ทไทม์',
      marketplace: 'ตลาดมือสอง',
      grocery: 'ซูเปอร์มาร์เก็ต',
      community: 'ชุมชนนักศึกษา',
      transitHealth: 'การเดินทางและสุขภาพ',
      assistant: 'ผู้ช่วยภาษาเกาหลี AI',
      myPage: 'หน้าของฉัน',
      admin: 'ผู้ดูแลระบบ',
      deploy: 'คู่มือติดตั้ง',
      signIn: 'เข้าสู่ระบบ',
    },
    hero: {
      kicker: 'ศูนย์รวมข้อมูลนักศึกษาต่างชาติในเกาหลีใต้',
      title: 'Everything Korea, รวมทุกสิ่งในที่เดียว',
      subtitle: 'คู่มือการใช้ชีวิตในเกาหลีแบบครบวงจร: สมัครเรียน, หอพักโคชีวอน, ส่วนลด KTX, ตลาดมือสอง และกฎหมายวีซ่า',
      searchPlaceholder: 'ค้นหามหาวิทยาลัย, ที่พัก, รถไฟ KTX, วีซ่า, งาน...',
      exploreAll: 'ดูทั้งหมด',
    },
    actions: {
      save: 'บันทึก',
      saved: 'บันทึกแล้ว',
      apply: 'สมัครทันที',
      details: 'ดูรายละเอียด',
      contact: 'ติดต่อ',
      filter: 'กรองข้อมูล',
      reset: 'รีเซ็ต',
      close: 'ปิด',
      submit: 'ส่งข้อมูล',
      cancel: 'ยกเลิก',
    },
    assistant: {
      title: 'ผู้ช่วยภาษาและวัฒนธรรมเกาหลี',
      subtitle: 'ถามประโยคเกาหลีที่ใช้บ่อย การคุยกับเจ้าของหอพัก และการติดต่อ ตม.',
      placeholder: 'พิมพ์ถามเป็นภาษาไทยได้เลย...',
      send: 'ถามผู้ช่วย',
      suggestedScenarios: 'สถานการณ์ที่พบบ่อย',
    },
    survival: {
      title: 'คู่มือเอาตัวรอดในเกาหลี',
      subtitle: 'การเปิดบัญชีธนาคารก่อนได้บัตร ARC, ซิมการ์ด และบัตร Climate Card',
    },
    jobs: {
      title: 'หางานพาร์ทไทม์นักศึกษา',
      subtitle: 'งานถูกกฎหมายตามใบอนุญาต S-3 พร้อมค่าจ้างขั้นต่ำตามมาตรฐาน',
      hourlyWage: 'ค่าจ้างรายชั่วโมง',
      workPermitNotice: 'ข้อควรระวัง: ต้องได้รับอนุมัติจากมหาวิทยาลัยและ ตม. ก่อนเริ่มทำงานเสมอ',
    },
    housing: {
      title: 'ค้นหาที่พักนักศึกษา',
      subtitle: 'โคชีวอน, วันรูม และหอพักใกล้มหาวิทยาลัยชื่อดัง',
      rent: 'ค่าเช่ารายเดือน',
      deposit: 'เงินมัดจำ',
    },
    visa: {
      title: 'วีซ่าและการตรวจคนเข้าเมือง',
      countdown: 'วันหมดอายุบัตรประจำตัวชาวต่างชาติ (ARC)',
      daysRemaining: 'วันคงเหลือ',
    },
  },
  id: {
    nav: {
      home: 'Beranda',
      universities: 'Universitas',
      housing: 'Akomodasi',
      survival: 'Panduan Hidup',
      jobs: 'Lowongan Kerja',
      marketplace: 'Pasar Barang Bekas',
      grocery: 'Belanja & Halal Mart',
      community: 'Komunitas Mahasiswa',
      transitHealth: 'Transportasi & Kesehatan',
      assistant: 'Asisten AI Korea',
      myPage: 'Profil Saya',
      admin: 'Admin',
      deploy: 'Panduan Hosting',
      signIn: 'Masuk',
    },
    hero: {
      kicker: 'Pusat Mahasiswa Internasional di Korea Selatan',
      title: 'Everything Korea, Satu Platform Lengkap.',
      subtitle: 'Permudah hidup di Korea: info pendaftaran kampus, goshiwon terverifikasi, diskon KTX, pasar mahasiswa, dan regulasi visa.',
      searchPlaceholder: 'Cari universitas, goshiwon, rute KTX, visa, pekerjaan...',
      exploreAll: 'Jelajahi Semua',
    },
    actions: {
      save: 'Simpan',
      saved: 'Tersimpan',
      apply: 'Daftar Sekarang',
      details: 'Lihat Detail',
      contact: 'Hubungi',
      filter: 'Filter',
      reset: 'Atur Ulang',
      close: 'Tutup',
      submit: 'Kirim',
      cancel: 'Batal',
    },
    assistant: {
      title: 'Asisten Bahasa & Budaya Korea',
      subtitle: 'Pelajari ungkapan Korea untuk berkomunikasi dengan pemilik kos dan kantor imigrasi.',
      placeholder: 'Tanyakan dalam Bahasa Indonesia...',
      send: 'Kirim Pertanyaan',
      suggestedScenarios: 'Skenario Harian',
    },
    survival: {
      title: 'Panduan Bertahan Hidup di Korea',
      subtitle: 'Buka rekening sebelum ada ARC, kartu SIM, dan kartu transportasi Climate Card.',
    },
    jobs: {
      title: 'Lowongan Kerja Paruh Waktu Mahasiswa',
      subtitle: 'Pekerjaan paruh waktu legal dengan izin S-3 dan upah minimum resmi.',
      hourlyWage: 'Upah Per Jam',
      workPermitNotice: 'Perhatian: Wajib mendapat izin dari kampus dan imigrasi sebelum mulai bekerja.',
    },
    housing: {
      title: 'Direktori Akomodasi Mahasiswa',
      subtitle: 'Goshiwon, one-room, dan asrama dekat kampus ternama di Seoul.',
      rent: 'Sewa Bulanan',
      deposit: 'Uang Jaminan (Deposit)',
    },
    visa: {
      title: 'Pusat Visa & Imigrasi',
      countdown: 'Masa Berlaku Kartu Identitas WNA (ARC)',
      daysRemaining: 'hari tersisa',
    },
  },
  ms: {
    nav: {
      home: 'Laman Utama',
      universities: 'Universiti',
      housing: 'Penginapan Pelajar',
      survival: 'Panduan Kehidupan',
      jobs: 'Kerja Sambilan',
      marketplace: 'Pasar Barangan Terpakai',
      grocery: 'Kedai Runcit & Halal',
      community: 'Komuniti Pelajar',
      transitHealth: 'Pengangkutan & Kesihatan',
      assistant: 'Pembantu AI Korea',
      myPage: 'Profil Saya',
      admin: 'Konsol Pentadbir',
      deploy: 'Panduan Persediaan',
      signIn: 'Log Masuk',
    },
    hero: {
      kicker: 'Pusat Pelajar Antarabangsa di Korea Selatan',
      title: 'Everything Korea, Semua dalam Satu Platform.',
      subtitle: 'Permudahkan kehidupan pelajar di Korea: kemasukan universiti, bilik goshiwon disahkan, diskaun KTX dan undang-undang visa.',
      searchPlaceholder: 'Cari universiti, bilik sewa, KTX, visa, kerja...',
      exploreAll: 'Lihat Semua',
    },
    actions: {
      save: 'Simpan',
      saved: 'Disimpan',
      apply: 'Mohon Sekarang',
      details: 'Lihat Butiran',
      contact: 'Hubungi',
      filter: 'Tapis',
      reset: 'Tetapkan Semula',
      close: 'Tutup',
      submit: 'Hantar',
      cancel: 'Batal',
    },
    assistant: {
      title: 'Pembantu Bahasa & Budaya Korea',
      subtitle: 'Ketahui ungkapan sopan Korea untuk bercakap dengan tuan rumah dan pejabat imigresen.',
      placeholder: 'Tanya dalam Bahasa Melayu...',
      send: 'Hantar Soalan',
      suggestedScenarios: 'Situasi Harian',
    },
    survival: {
      title: 'Panduan Asas Kehidupan di Korea',
      subtitle: 'Membuka akaun bank, kad SIM, dan kad pengangkutan tanpa had.',
    },
    jobs: {
      title: 'Peluang Kerja Sambilan Pelajar',
      subtitle: 'Pekerjaan sah dengan permit S-3 dan jaminan gaji minimum rasmi.',
      hourlyWage: 'Gaji Setiap Jam',
      workPermitNotice: 'Penting: Dapatkan pengesahan universiti dan kelulusan HiKorea sebelum bekerja.',
    },
    housing: {
      title: 'Direktori Penginapan Pelajar',
      subtitle: 'Goshiwon, studio one-room dan asrama berhampiran universiti.',
      rent: 'Sewa Bulanan',
      deposit: 'Wang Cagaran (Deposit)',
    },
    visa: {
      title: 'Visa & Imigresen',
      countdown: 'Tempoh Tamat Kad Penduduk Asing (ARC)',
      daysRemaining: 'hari lagi',
    },
  },
  ru: {
    nav: {
      home: 'Главная',
      universities: 'Университеты',
      housing: 'Жилье для студентов',
      survival: 'Гид по Корее',
      jobs: 'Вакансии и подработка',
      marketplace: 'Барахолка',
      grocery: 'Магазины и продукты',
      community: 'Сообщество',
      transitHealth: 'Транспорт и медицина',
      assistant: 'Корейский ИИ-гид',
      myPage: 'Мой профиль',
      admin: 'Панель админа',
      deploy: 'Гид по деплою',
      signIn: 'Войти',
    },
    hero: {
      kicker: 'Портал для иностранных студентов в Южной Корее',
      title: 'Everything Korea — все в одной платформе.',
      subtitle: 'Официальные программы университетов, проверенные косивоны и студии, скидки на поезда KTX, покупка подержанных вещей и правила виз.',
      searchPlaceholder: 'Поиск университетов, жилья, KTX, виз, работы...',
      exploreAll: 'Смотреть все',
    },
    actions: {
      save: 'Сохранить',
      saved: 'Сохранено',
      apply: 'Подать заявку',
      details: 'Подробнее',
      contact: 'Связаться',
      filter: 'Фильтры',
      reset: 'Сбросить',
      close: 'Закрыть',
      submit: 'Отправить',
      cancel: 'Отмена',
    },
    assistant: {
      title: 'Ассистент по корейскому языку и культуре',
      subtitle: 'Помощь с вежливыми фразами для общения с арендодателем, в иммиграции и кампусе.',
      placeholder: 'Задайте вопрос на русском или английском...',
      send: 'Спросить ИИ',
      suggestedScenarios: 'Популярные ситуации',
    },
    survival: {
      title: 'Гид по адаптации в Корее',
      subtitle: 'Открытие банковского счета без ARC, сим-карты, Climate Card и сортировка мусора.',
    },
    jobs: {
      title: 'Подработка для студентов',
      subtitle: 'Легальные вакансии с разрешением S-3 и официальной почасовой ставкой.',
      hourlyWage: 'Почасовая оплата',
      workPermitNotice: 'Внимание: перед началом работы необходимо получить разрешение в вузе и на HiKorea.',
    },
    housing: {
      title: 'Каталог жилья для студентов',
      subtitle: 'Косивоны, студии One-room и общежития около станций метро в Сеуле.',
      rent: 'Аренда в месяц',
      deposit: 'Залог (Deposit)',
    },
    visa: {
      title: 'Визы и иммиграция',
      countdown: 'Срок действия ID-карты (ARC)',
      daysRemaining: 'дней осталось',
    },
  },
  es: {
    nav: {
      home: 'Inicio',
      universities: 'Universidades',
      housing: 'Alojamiento estudiantil',
      survival: 'Guía de Supervivencia',
      jobs: 'Empleos y Prácticas',
      marketplace: 'Segunda Mano',
      grocery: 'Supermercados y Comida',
      community: 'Comunidad Estudiantil',
      transitHealth: 'Transporte y Salud',
      assistant: 'Asistente Coreano IA',
      myPage: 'Mi Cuenta',
      admin: 'Administración',
      deploy: 'Guía de Despliegue',
      signIn: 'Iniciar Sesión',
    },
    hero: {
      kicker: 'Plataforma para Estudiantes Internacionales en Corea del Sur',
      title: 'Everything Korea, Todo en Una Sola Plataforma.',
      subtitle: 'Guía completa para vivir en Corea: admisiones universitarias, goshiwons y estudios verificados, descuentos KTX, mercado de segunda mano y visados.',
      searchPlaceholder: 'Buscar universidades, habitaciones, KTX, visados, empleos...',
      exploreAll: 'Explorar Todo',
    },
    actions: {
      save: 'Guardar',
      saved: 'Guardado',
      apply: 'Postular Ahora',
      details: 'Ver Detalles',
      contact: 'Contactar',
      filter: 'Filtrar',
      reset: 'Restablecer',
      close: 'Cerrar',
      submit: 'Enviar',
      cancel: 'Cancelar',
    },
    assistant: {
      title: 'Asistente de Idioma y Cultura Coreana',
      subtitle: 'Aprende expresiones prácticas para hablar con caseros, oficinas de inmigración y en la universidad.',
      placeholder: 'Pregunta en español o inglés: ej. ¿Cómo pedir educadamente que arreglen la calefacción?',
      send: 'Consultar',
      suggestedScenarios: 'Escenarios Habituales',
    },
    survival: {
      title: 'Centro de Supervivencia en Corea',
      subtitle: 'Apertura de cuenta bancaria sin ARC, tarjetas SIM prepago, transporte Climate Card y reciclaje.',
    },
    jobs: {
      title: 'Bolsa de Empleo para Estudiantes',
      subtitle: 'Trabajos a tiempo parcial legales bajo permiso S-3 que cumplen con el salario mínimo.',
      hourlyWage: 'Salario por Hora',
      workPermitNotice: 'Aviso: Es obligatorio obtener la firma de la universidad y el permiso de HiKorea antes de trabajar.',
    },
    housing: {
      title: 'Directorio de Vivienda Estudiantil',
      subtitle: 'Goshiwons, estudios one-room y residencias cerca de las universidades de Seúl.',
      rent: 'Alquiler Mensual',
      deposit: 'Depósito de Garantía',
    },
    visa: {
      title: 'Centro de Visados e Inmigración',
      countdown: 'Caducidad de Tarjeta de Residencia (ARC)',
      daysRemaining: 'días restantes',
    },
  },
  mn: {
    nav: {
      home: 'Нүүр',
      universities: 'Их дээд сургуулиуд',
      housing: 'Оюутны байр',
      survival: 'Амьдрах хөтөч',
      jobs: 'Цагийн ажил',
      marketplace: 'Зах зээл',
      grocery: 'Дэлгүүр хүнс',
      community: 'Оюутны нийгэмлэг',
      transitHealth: 'Тээвэр ба эрүүл мэнд',
      assistant: 'Солонгос хэлний туслах',
      myPage: 'Миний хуудас',
      admin: 'Админ самбар',
      deploy: 'Байршуулалт',
      signIn: 'Нэвтрэх',
    },
    hero: {
      kicker: 'БНСУ-д суралцагч олон улсын оюутны нэгдсэн талбар',
      title: 'Бүхнийг нэг дороос — EveryKR',
      subtitle: 'Солонгосын их сургуулиудын элсэлтийн хугацаа, баталгаат байр, КТХ хөнгөлөлт, хэрэгцээт бараа болон визний шаардлага.',
      searchPlaceholder: 'Их сургууль, байр, КТХ, виз, ажил хайх...',
      exploreAll: 'Бүгдийг үзэх',
    },
    actions: {
      save: 'Хадгалах',
      saved: 'Хадгалсан',
      apply: 'Өргөдөл гаргах',
      details: 'Дэлгэрэнгүй',
      contact: 'Холбоо барих',
      filter: 'Шүүлтүүр',
      reset: 'Цэвэрлэх',
      close: 'Хаах',
      submit: 'Илгээх',
      cancel: 'Цуцлах',
    },
    assistant: {
      title: 'Солонгос хэл ба соёлын туслах',
      subtitle: 'Байрны эзэн, сургуулийн захиргаа, цагаачлалын албатай харилцах ярианы жишээнүүд.',
      placeholder: 'Асуух зүйлээ оруулна уу...',
      send: 'Асуух',
      suggestedScenarios: 'Түгээмэл нөхцөлүүд',
    },
    survival: {
      title: 'Солонгост амьдрах хөтөч',
      subtitle: 'СИМ карт авах, банкны данс нээх, цаг уурын карт болон хог ангилах заавар.',
    },
    jobs: {
      title: 'Оюутны ажлын зар',
      subtitle: 'S-3 цагийн ажил эрхлэх зөвшөөрөлтэй, хууль ёсны цагийн хөлс бүхий ажлууд.',
      hourlyWage: 'Цагийн хөлс',
      workPermitNotice: 'Анхааруулга: Ажил эхлэхээс өмнө сургуулийн зөвшөөрөл авч HiKorea-д бүртгүүлнэ үү.',
    },
    housing: {
      title: 'Оюутны байрны жагсаалт',
      subtitle: 'Их дээд сургуулийн ойролцоох гошивон, нэг өрөө байр, дотуур байр.',
      rent: 'Сарын төлбөр',
      deposit: 'Барьцаа төлбөр',
    },
    visa: {
      title: 'Виз ба цагаачлалын төв',
      countdown: 'Гадаадын иргэний үнэмлэх (ARC) дуусах хугацаа',
      daysRemaining: 'хоног үлдсэн',
    },
  },
};

export const getTranslation = (lang: LanguageCode): Translations => {
  return translations[lang] || translations.en;
};
