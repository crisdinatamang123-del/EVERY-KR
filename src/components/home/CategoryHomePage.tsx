import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getUniversitySlug } from '../../utils/seoRoutes';
import { GlobalStudentJourneySection } from './GlobalStudentJourneySection';
import { UniversityDeadlineCarousel } from './UniversityDeadlineCarousel';
import {
  DEFAULT_LANGUAGE_TO_COUNTRY_CODE,
  getOriginCountryByCode,
} from './globalJourneyData';
import { syncSubscriberToFirestore } from '../../services/firebaseService';
import type { LanguageCode } from '../../types';
import {
  Search,
  GraduationCap,
  BookOpen,
  Building,
  Plane,
  Smartphone,
  Compass,
  ArrowRight,
  Mail,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  getCachedHomepageCmsCategories,
  fetchHomepageCmsConfig,
  subscribeToHomepageCmsConfig,
  resolveCategoryCopyForLanguage,
} from '../../services/masterAdminCmsAndSimService';
import type { HomepageCmsCategoryRecord } from '../../types';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'University' | 'Program' | 'Scholarship' | 'Resource';
  route: string;
}

interface HomeTranslationBundle {
  heroBadge: string;
  heroTitle: string;
  heroDesc: string;
  searchPlaceholder: string;
  searchButton: string;
  departureCountryLabel: string;
  koreaSelectedNote: string;
  flightToKoreaNote: string;
  ecosystemEyebrow: string;
  ecosystemTitle: string;
  ecosystemDesc: string;
  exploreModuleCta: string;
  modules: {
    universityTitle: string;
    universityDesc: string;
    learnKoreanTitle: string;
    learnKoreanDesc: string;
    accommodationTitle: string;
    accommodationDesc: string;
    aiTitle: string;
    aiDesc: string;
    communityTitle: string;
    communityDesc: string;
    othersTitle: string;
    othersDesc: string;
    othersLinks: {
      visa: string;
      scholarships: string;
      jobs: string;
      support: string;
      lifestyle: string;
      transportation: string;
      services: string;
      updates: string;
    };
  };
  newsletter: {
    title: string;
    desc: string;
    placeholder: string;
    subscribeBtn: string;
    subscribingBtn: string;
    privacyNote: string;
    unsubscribeToggle: string;
    subscribeToggle: string;
    unsubscribeBtn: string;
    unsubscribingBtn: string;
    invalidEmail: string;
    subscribedSuccess: string;
    alreadySubscribed: string;
    unsubscribedSuccess: string;
  };
  utility: {
    login: string;
    register: string;
    dashboard: string;
    profile: string;
    admin: string;
    logout: string;
    quickMenu: string;
    dayMode: string;
    nightMode: string;
  };
}

const HOME_COPY: Record<LanguageCode, HomeTranslationBundle> = {
  en: {
    heroBadge: 'WELCOME TO EVERYKR',
    heroTitle: 'Your Journey to Korea Starts Here.',
    heroDesc:
      'Discover South Korean universities, degree programs, scholarships, Korean language learning, student accommodation, and everything you need to start your journey in Korea — all in one platform.',
    searchPlaceholder: 'Search universities, courses, scholarships, programs...',
    searchButton: 'Search',
    departureCountryLabel: 'Departure Country',
    koreaSelectedNote: 'Destination: South Korea',
    flightToKoreaNote: 'Interactive 3D route to South Korea',
    ecosystemEyebrow: 'PLATFORM ECOSYSTEM',
    ecosystemTitle: 'Everything Korea. One Platform.',
    ecosystemDesc:
      'Explore every essential service and resource you need to study, travel, live, and build your future in South Korea.',
    exploreModuleCta: 'Explore More',
    modules: {
      universityTitle: 'University',
      universityDesc:
        'Discover South Korean universities, admission requirements, tuition fees, scholarships, and academic opportunities.',
      learnKoreanTitle: 'Learn Korean',
      learnKoreanDesc:
        'Learn Korean from beginner to advanced levels through structured lessons, vocabulary, grammar, pronunciation, and TOPIK preparation.',
      accommodationTitle: 'Find Accommodation',
      accommodationDesc:
        'Explore affordable student accommodation, university dormitories, private rooms, shared housing, and studios across South Korea.',
      aiTitle: 'Tickets & Transport',
      aiDesc:
        'Find international flights, domestic flights, KTX tickets, airport transportation, and local transportation services.',
      communityTitle: 'SIM',
      communityDesc:
        'Apply for your free SIM card and submit your Korea arrival information. Our team will contact you through WhatsApp.',
      othersTitle: 'Others',
      othersDesc:
        'Explore student services, visa and immigration guidance, part-time jobs, student communities, and useful resources.',
      othersLinks: {
        visa: 'Visa & Immigration Guidance',
        scholarships: 'Scholarships and Financial Aid',
        jobs: 'Part-Time Jobs',
        support: 'Student Support',
        lifestyle: 'Travel & Lifestyle Resources',
        transportation: 'Discover Korea',
        services: 'Student Services',
        updates: 'Student Community',
      },
    },
    newsletter: {
      title: 'Stay Connected with EVERYKR',
      desc: 'Get useful updates about Korean universities, admissions, scholarships, student life, and opportunities.',
      placeholder: 'Enter your email address...',
      subscribeBtn: 'Subscribe',
      subscribingBtn: 'Subscribing...',
      privacyNote: 'We respect your privacy. No spam — you can unsubscribe at any time.',
      unsubscribeToggle: 'Need to unsubscribe?',
      subscribeToggle: 'Back to subscribe',
      unsubscribeBtn: 'Unsubscribe',
      unsubscribingBtn: 'Unsubscribing...',
      invalidEmail: 'Please enter a valid email address.',
      subscribedSuccess: 'Thank you for subscribing to EVERYKR updates!',
      alreadySubscribed: 'This email is already subscribed to EVERYKR updates.',
      unsubscribedSuccess: 'Your email has been unsubscribed from EVERYKR updates.',
    },
    utility: {
      login: 'Login',
      register: 'Register',
      dashboard: 'Dashboard',
      profile: 'My Profile',
      admin: 'Admin Portal',
      logout: 'Sign Out',
      quickMenu: 'Explore',
      dayMode: 'Day Mode',
      nightMode: 'Night Mode',
    },
  },
  bn: {
    heroBadge: 'EVERYKR-এ স্বাগতম',
    heroTitle: 'আপনার কোরিয়া যাত্রা এখান থেকেই শুরু।',
    heroDesc:
      'দক্ষিণ কোরিয়ার বিশ্ববিদ্যালয়, ডিগ্রি প্রোগ্রাম, বৃত্তি, কোরিয়ান ভাষা শিক্ষা, শিক্ষার্থী আবাসন এবং কোরিয়ায় আপনার যাত্রা শুরু করার প্রয়োজনীয় সবকিছু — এক প্ল্যাটফর্মে।',
    searchPlaceholder: 'বিশ্ববিদ্যালয়, কোর্স, বৃত্তি, প্রোগ্রাম খুঁজুন...',
    searchButton: 'খুঁজুন',
    departureCountryLabel: 'যাত্রা শুরুর দেশ',
    koreaSelectedNote: 'গন্তব্য: দক্ষিণ কোরিয়া',
    flightToKoreaNote: 'দক্ষিণ কোরিয়ায় ৩ডি ফ্লাইট রুট',
    ecosystemEyebrow: 'প্ল্যাটফর্ম ইকোসিস্টেম',
    ecosystemTitle: 'কোরিয়ার সবকিছু। এক প্ল্যাটফর্মে।',
    ecosystemDesc:
      'দক্ষিণ কোরিয়ায় পড়াশোনা, ভ্রমণ, বসবাস এবং আপনার ভবিষ্যৎ গড়ার জন্য প্রয়োজনীয় প্রতিটি সেবা ও তথ্য এখানে অন্বেষণ করুন।',
    exploreModuleCta: 'আরও দেখুন',
    modules: {
      universityTitle: 'বিশ্ববিদ্যালয়',
      universityDesc:
        'দক্ষিণ কোরিয়ার বিশ্ববিদ্যালয়, ভর্তির যোগ্যতা, টিউশন ফি, বৃত্তি এবং একাডেমিক সুযোগসমূহ জানুন।',
      learnKoreanTitle: 'কোরিয়ান ভাষা শিখুন',
      learnKoreanDesc:
        'প্রাথমিক থেকে উন্নত স্তর পর্যন্ত গোছানো পাঠ, শব্দভাণ্ডার, ব্যাকরণ, উচ্চারণ এবং TOPIK প্রস্তুতি নিন।',
      accommodationTitle: 'আবাসন খুঁজুন',
      accommodationDesc:
        'দক্ষিণ কোরিয়া জুড়ে সাশ্রয়ী শিক্ষার্থী আবাসন, বিশ্ববিদ্যালয়ের ডরমিটরি, প্রাইভেট রুম, শেয়ার্ড হাউজিং এবং স্টুডিও খুঁজুন।',
      aiTitle: 'টিকিট ও পরিবহন',
      aiDesc:
        'আন্তর্জাতিক ফ্লাইট, অভ্যন্তরীণ ফ্লাইট, KTX টিকিট, বিমানবন্দর যাতায়াত এবং স্থানীয় পরিবহন সেবা খুঁজুন।',
      communityTitle: 'সিম নিবন্ধন',
      communityDesc:
        'আপনার ফ্রি সিম কার্ডের জন্য আবেদন করুন এবং কোরিয়ায় পৌঁছানোর তথ্য জমা দিন। আমাদের টিম WhatsApp-এর মাধ্যমে যোগাযোগ করবে।',
      othersTitle: 'অন্যান্য সেবা',
      othersDesc:
        'শিক্ষার্থী সহায়তা, ভিসা ও ইমিগ্রেশন নির্দেশিকা, পার্ট-টাইম জব, স্টুডেন্ট কমিউনিটি এবং প্রয়োজনীয় রিসোর্স দেখুন।',
      othersLinks: {
        visa: 'স্টুডেন্ট ভিসা গাইড',
        scholarships: 'বৃত্তি ও আর্থিক সহায়তা',
        jobs: 'পার্ট-টাইম জব',
        support: 'শিক্ষার্থী সহায়তা',
        lifestyle: 'কোরিয়ান জীবনযাত্রা',
        transportation: 'যাতায়াত ও পরিবহন',
        services: 'শিক্ষার্থী সেবা',
        updates: 'গুরুত্বপূর্ণ আপডেট',
      },
    },
    newsletter: {
      title: 'EVERYKR-এর সাথে যুক্ত থাকুন',
      desc: 'কোরিয়ান বিশ্ববিদ্যালয়, বৃত্তি, ভর্তির আবেদনের শেষ সময় এবং ছাত্রজীবন সম্পর্কে গুরুত্বপূর্ণ আপডেট পান।',
      placeholder: 'আপনার ইমেইল ঠিকানা লিখুন...',
      subscribeBtn: 'সাবস্ক্রাইব করুন',
      subscribingBtn: 'সাবস্ক্রাইব হচ্ছে...',
      privacyNote: 'আমরা আপনার গোপনীয়তাকে সম্মান করি। যেকোনো সময় আনসাবস্ক্রাইব করতে পারবেন।',
      unsubscribeToggle: 'আনসাবস্ক্রাইব করতে চান?',
      subscribeToggle: 'সাবস্ক্রাইবে ফিরে যান',
      unsubscribeBtn: 'আনসাবস্ক্রাইব',
      unsubscribingBtn: 'প্রক্রিয়াধীন...',
      invalidEmail: 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন।',
      subscribedSuccess: 'EVERYKR নিউজলেটারে সাবস্ক্রাইব করার জন্য ধন্যবাদ!',
      alreadySubscribed: 'এই ইমেইলটি ইতিমধ্যে সাবস্ক্রাইব করা আছে।',
      unsubscribedSuccess: 'আপনার ইমেইল সফলভাবে আনসাবস্ক্রাইব করা হয়েছে।',
    },
    utility: {
      login: 'লগইন',
      register: 'নিবন্ধন',
      dashboard: 'ড্যাশবোর্ড',
      profile: 'প্রোফাইল',
      admin: 'অ্যাডমিন পোর্টাল',
      logout: 'লগআউট',
      quickMenu: 'মেনু',
      dayMode: 'ডে মোড',
      nightMode: 'নাইট মোড',
    },
  },
  ko: {
    heroBadge: 'EVERYKR에 오신 것을 환영합니다',
    heroTitle: '한국으로의 여정이 여기서 시작됩니다.',
    heroDesc:
      '대한민국 대학교, 학위 과정, 장학금, 한국어 학습, 유학생 숙소 등 한국 유학과 정착에 필요한 모든 것을 하나의 플랫폼에서 만나보세요.',
    searchPlaceholder: '대학교, 학위 과정, 장학금, 프로그램 검색...',
    searchButton: '검색',
    departureCountryLabel: '출발 국가',
    koreaSelectedNote: '현재 위치: 대한민국',
    flightToKoreaNote: '대한민국행 3D 항공 여정',
    ecosystemEyebrow: '플랫폼 에코시스템',
    ecosystemTitle: '한국의 모든 것. 하나의 플랫폼.',
    ecosystemDesc:
      '한국에서 학업, 여행, 생활 및 미래를 준비하는 데 필요한 모든 핵심 서비스와 리소스를 탐색하세요.',
    exploreModuleCta: '더 알아보기',
    modules: {
      universityTitle: '대학교',
      universityDesc:
        '대한민국 대학교, 입학 자격 요건, 등록금, 장학금 및 다양한 학업 기회를 확인하세요.',
      learnKoreanTitle: '한국어 배우기',
      learnKoreanDesc:
        '초급부터 고급까지 체계적인 강의, 어휘, 문법, 발음 및 TOPIK 시험 대비 과정을 학습하세요.',
      accommodationTitle: '숙소 찾기',
      accommodationDesc:
        '한국 전역의 합리적인 유학생 숙소, 대학 기숙사, 원룸, 쉐어하우스 및 스튜디오를 찾아보세요.',
      aiTitle: '항공권 및 교통',
      aiDesc:
        '국제선 항공권, 국내선, KTX 승차권, 공항 교통편 및 지역 대중교통 서비스를 확인하세요.',
      communityTitle: '유심 (SIM)',
      communityDesc:
        '무료 유심 카드를 신청하고 한국 입국 정보를 제출하세요. 담당 팀이 WhatsApp으로 연락드립니다.',
      othersTitle: '기타 서비스',
      othersDesc:
        '학생 지원 서비스, 비자 및 출입국 가이드, 아르바이트, 유학생 커뮤니티 및 유용한 자료를 탐색하세요.',
      othersLinks: {
        visa: '학생 비자 가이드',
        scholarships: '장학금 및 재정 지원',
        jobs: '아르바이트 정보',
        support: '학생 지원 센터',
        lifestyle: '한국 라이프스타일',
        transportation: '교통 및 이동 안내',
        services: '유학생 필수 서비스',
        updates: '주요 입학·정책 공지',
      },
    },
    newsletter: {
      title: 'EVERYKR 뉴스레터 구독',
      desc: '한국 대학교 입학 일정, 장학금, 유학 생활에 관한 유용한 최신 소식을 이메일로 받아보세요.',
      placeholder: '이메일 주소를 입력하세요...',
      subscribeBtn: '구독하기',
      subscribingBtn: '처리 중...',
      privacyNote: '개인정보를 안전하게 보호하며 언제든지 구독을 해지할 수 있습니다.',
      unsubscribeToggle: '구독 해지하기',
      subscribeToggle: '구독 신청으로 돌아가기',
      unsubscribeBtn: '구독 해지',
      unsubscribingBtn: '해지 중...',
      invalidEmail: '유효한 이메일 주소를 입력해 주세요.',
      subscribedSuccess: 'EVERYKR 뉴스레터 구독이 완료되었습니다!',
      alreadySubscribed: '이미 구독 중인 이메일 주소입니다.',
      unsubscribedSuccess: '뉴스레터 구독이 정상적으로 해지되었습니다.',
    },
    utility: {
      login: '로그인',
      register: '회원가입',
      dashboard: '대시보드',
      profile: '내 프로필',
      admin: '관리자 포털',
      logout: '로그아웃',
      quickMenu: '탐색',
      dayMode: '주간 모드',
      nightMode: '야간 모드',
    },
  },
  ne: {
    heroBadge: 'EVERYKR मा स्वागत छ',
    heroTitle: 'तपाईंको कोरिया यात्रा यहीँबाट सुरु हुन्छ।',
    heroDesc:
      'दक्षिण कोरियाका विश्वविद्यालयहरू, डिग्री कार्यक्रमहरू, छात्रवृत्ति, कोरियन भाषा सिकाइ, विद्यार्थी आवास र अवसरहरू — सबै एउटै प्लेटफर्ममा अन्वेषण गर्नुहोस्।',
    searchPlaceholder: 'विश्वविद्यालय, कोर्स, छात्रवृत्ति, कार्यक्रम खोज्नुहोस्...',
    searchButton: 'खोज्नुहोस्',
    departureCountryLabel: 'प्रस्थान देश',
    koreaSelectedNote: 'गन्तव्य: दक्षिण कोरिया',
    flightToKoreaNote: 'दक्षिण कोरियाको ३डी उडान मार्ग',
    ecosystemEyebrow: 'प्लेटफर्म इकोसिस्टम',
    ecosystemTitle: 'कोरियाको सम्पूर्ण जानकारी। एउटै प्लेटफर्म।',
    ecosystemDesc:
      'दक्षिण कोरियामा अध्ययन, यात्रा, बसोबास र आफ्नो भविष्य निर्माण गर्न आवश्यक हरेक सेवा र स्रोतहरू अन्वेषण गर्नुहोस्।',
    exploreModuleCta: 'थप हेर्नुहोस्',
    modules: {
      universityTitle: 'विश्वविद्यालय',
      universityDesc:
        'दक्षिण कोरियाका विश्वविद्यालयहरू, भर्ना योग्यता, ट्युसन शुल्क, छात्रवृत्ति र शैक्षिक अवसरहरू पत्ता लगाउनुहोस्।',
      learnKoreanTitle: 'कोरियन भाषा सिक्नुहोस्',
      learnKoreanDesc:
        'प्रारम्भिकदेखि उन्नत तहसम्म व्यवस्थित पाठ, शब्दावली, व्याकरण, उच्चारण र TOPIK तयारी गर्नुहोस्।',
      accommodationTitle: 'आवास खोज्नुहोस्',
      accommodationDesc:
        'दक्षिण कोरियाभरि सस्तो विद्यार्थी आवास, विश्वविद्यालय होस्टेल, निजी कोठा र साझा आवासहरू खोज्नुहोस्।',
      aiTitle: 'टिकट र यातायात',
      aiDesc:
        'अन्तर्राष्ट्रिय उडान, आन्तरिक उडान, KTX टिकट, विमानस्थल यातायात र स्थानीय यातायात सेवाहरू खोज्नुहोस्।',
      communityTitle: 'सिम दर्ता (SIM)',
      communityDesc:
        'निःशुल्क सिम कार्डको लागि आवेदन दिनुहोस् र कोरिया आगमन विवरण पेश गर्नुहोस्। हाम्रो टोलीले WhatsApp मार्फत सम्पर्क गर्नेछ।',
      othersTitle: 'अन्य सेवाहरू',
      othersDesc:
        'विद्यार्थी सेवाहरू, भिसा र अध्यागमन मार्गदर्शन, पार्ट-टाइम काम, विद्यार्थी समुदाय र उपयोगी स्रोतहरू हेर्नुहोस्।',
      othersLinks: {
        visa: 'विद्यार्थी भिसा गाइड',
        scholarships: 'छात्रवृत्ति र आर्थिक सहायता',
        jobs: 'पार्ट-टाइम काम',
        support: 'विद्यार्थी सहायता',
        lifestyle: 'कोरियन जीवनशैली',
        transportation: 'यातायात',
        services: 'विद्यार्थी सेवाहरू',
        updates: 'महत्त्वपूर्ण अपडेटहरू',
      },
    },
    newsletter: {
      title: 'EVERYKR सँग जोडिनुहोस्',
      desc: 'कोरियन विश्वविद्यालयहरू, छात्रवृत्ति, भर्ना र विद्यार्थी जीवनबारे उपयोगी अपडेटहरू प्राप्त गर्नुहोस्।',
      placeholder: 'आफ्नो इमेल ठेगाना प्रविष्ट गर्नुहोस्...',
      subscribeBtn: 'सब्स्क्राइब',
      subscribingBtn: 'सब्स्क्राइब हुँदै...',
      privacyNote: 'हामी तपाईंको गोपनीयताको सम्मान गर्छौं। जुनसुकै बेला अनसब्स्क्राइब गर्न सकिन्छ।',
      unsubscribeToggle: 'अनसब्स्क्राइब गर्न चाहनुहुन्छ?',
      subscribeToggle: 'सब्स्क्राइबमा फर्कनुहोस्',
      unsubscribeBtn: 'अनसब्स्क्राइब',
      unsubscribingBtn: 'प्रक्रिया हुँदै...',
      invalidEmail: 'कृपया मान्य इमेल ठेगाना प्रविष्ट गर्नुहोस्।',
      subscribedSuccess: 'EVERYKR अपडेटमा सब्स्क्राइब गर्नुभएकोमा धन्यवाद!',
      alreadySubscribed: 'यो इमेल पहिले नै सब्स्क्राइब भइसकेको छ।',
      unsubscribedSuccess: 'तपाईंको इमेल सफलतापूर्वक अनसब्स्क्राइब गरियो।',
    },
    utility: {
      login: 'लगइन',
      register: 'दर्ता',
      dashboard: 'ड्यासबोर्ड',
      profile: 'प्रोफाइल',
      admin: 'एडमिन पोर्टल',
      logout: 'साइन आउट',
      quickMenu: 'मेनु',
      dayMode: 'दिउँसो मोड',
      nightMode: 'रात मोड',
    },
  },
  ur: {
    heroBadge: 'EVERYKR میں خوش آمدید',
    heroTitle: 'کوریا کا آپ کا سفر یہاں سے شروع ہوتا ہے۔',
    heroDesc:
      'جنوبی کوریا کی یونیورسٹیاں، ڈگری پروگرامز، اسکالرشپس، کورین زبان سیکھنے، طلباء کی رہائش اور مواقع تلاش کریں — سب کچھ ایک ہی پلیٹ فارم پر۔',
    searchPlaceholder: 'یونیورسٹیاں، کورسز، اسکالرشپس، پروگرامز تلاش کریں...',
    searchButton: 'تلاش کریں',
    departureCountryLabel: 'روانگی کا ملک',
    koreaSelectedNote: 'منزل: جنوبی کوریا',
    flightToKoreaNote: 'جنوبی کوریا کا 3D فضائی راستہ',
    ecosystemEyebrow: 'پلیٹ فارم ایکو سسٹم',
    ecosystemTitle: 'کوریا کی ہر معلومات۔ ایک پلیٹ فارم۔',
    ecosystemDesc:
      'جنوبی کوریا میں تعلیم، سفر، رہائش اور اپنا مستقبل بنانے کے لیے درکار ہر ضروری سروس اور معلومات دریافت کریں۔',
    exploreModuleCta: 'مزید دیکھیں',
    modules: {
      universityTitle: 'یونیورسٹیاں',
      universityDesc:
        'جنوبی کوریا کی یونیورسٹیاں، داخلے کی شرائط، ٹیوشن فیس، اسکالرشپس اور تعلیمی مواقع دریافت کریں۔',
      learnKoreanTitle: 'کورین زبان سیکھیں',
      learnKoreanDesc:
        'ابتدائی سے اعلیٰ سطح تک منظم اسباق، الفاظ، گرامر، تلفظ اور TOPIK کی تیاری کریں۔',
      accommodationTitle: 'رہائش تلاش کریں',
      accommodationDesc:
        'جنوبی کوریا بھر میں مناسب قیمت اسٹوڈنٹ رہائش، یونیورسٹی ہاسٹلز، پرائیویٹ کمرے اور شیئرڈ ہاؤسنگ تلاش کریں۔',
      aiTitle: 'ٹکٹ اور ٹرانسپورٹ',
      aiDesc:
        'بین الاقوامی پروازیں، اندرون ملک پروازیں، KTX ٹکٹ، ایئرپورٹ ٹرانسپورٹ اور مقامی سفری سہولیات تلاش کریں۔',
      communityTitle: 'سم رجسٹریشن (SIM)',
      communityDesc:
        'اپنی مفت سم کارڈ کے لیے درخواست دیں اور کوریا آمد کی تفصیلات جمع کروائیں۔ ہماری ٹیم WhatsApp کے ذریعے رابطہ کرے گی۔',
      othersTitle: 'دیگر خدمات',
      othersDesc:
        'اسٹوڈنٹ سروسز، ویزا اور امیگریشن رہنمائی، پارٹ ٹائم ملازمتیں، اسٹوڈنٹ کمیونٹی اور مفید وسائل دیکھیں۔',
      othersLinks: {
        visa: 'اسٹوڈنٹ ویزا گائیڈ',
        scholarships: 'اسکالرشپس اور مالی معاونت',
        jobs: 'پارٹ ٹائم ملازمتیں',
        support: 'اسٹوڈنٹ سپورٹ',
        lifestyle: 'کورین لائف اسٹائل',
        transportation: 'ٹرانسپورٹیشن',
        services: 'اسٹوڈنٹ سروسز',
        updates: 'اہم اپڈیٹس',
      },
    },
    newsletter: {
      title: 'EVERYKR کے ساتھ جڑے رہیں',
      desc: 'کورین یونیورسٹیوں، اسکالرشپس، داخلوں اور طلباء کی زندگی کے بارے میں مفید اپڈیٹس حاصل کریں۔',
      placeholder: 'اپنا ای میل ایڈریس درج کریں...',
      subscribeBtn: 'سبسکرائب کریں',
      subscribingBtn: 'سبسکرائب ہو رہا ہے...',
      privacyNote: 'ہم آپ کی پرائیویسی کا احترام کرتے ہیں۔ آپ کسی بھی وقت ان سبسکرائب کر سکتے ہیں۔',
      unsubscribeToggle: 'ان سبسکرائب کرنا چاہتے ہیں؟',
      subscribeToggle: 'سبسکرائب پر واپس جائیں',
      unsubscribeBtn: 'ان سبسکرائب',
      unsubscribingBtn: 'جاری ہے...',
      invalidEmail: 'براہ کرم درست ای میل ایڈریس درج کریں۔',
      subscribedSuccess: 'EVERYKR اپڈیٹس کو سبسکرائب کرنے کا شکریہ!',
      alreadySubscribed: 'یہ ای میل پہلے ہی سبسکرائب شدہ ہے۔',
      unsubscribedSuccess: 'آپ کا ای میل کامیابی سے ان سبسکرائب کر دیا گیا ہے۔',
    },
    utility: {
      login: 'لاگ ان',
      register: 'رجسٹر',
      dashboard: 'ڈیش بورڈ',
      profile: 'پروفائل',
      admin: 'ایڈمن پورٹل',
      logout: 'سائن آؤٹ',
      quickMenu: 'مینیو',
      dayMode: 'ڈے موڈ',
      nightMode: 'نائٹ موڈ',
    },
  },
  hi: {
    heroBadge: 'EVERYKR में आपका स्वागत है',
    heroTitle: 'कोरिया की आपकी यात्रा यहीं से शुरू होती है।',
    heroDesc:
      'दक्षिण कोरिया के विश्वविद्यालयों, डिग्री प्रोग्राम, छात्रवृत्ति, कोरियाई भाषा सीखने, छात्र आवास और कोरिया में अपनी यात्रा शुरू करने के लिए आवश्यक सब कुछ — एक ही प्लेटफॉर्म पर खोजें।',
    searchPlaceholder: 'विश्वविद्यालय, कोर्स, छात्रवृत्ति, प्रोग्राम खोजें...',
    searchButton: 'खोजें',
    departureCountryLabel: 'प्रस्थान देश',
    koreaSelectedNote: 'गंतव्य: दक्षिण कोरिया',
    flightToKoreaNote: 'दक्षिण कोरिया के लिए 3D उड़ान मार्ग',
    ecosystemEyebrow: 'प्लेटफॉर्म इकोसिस्टम',
    ecosystemTitle: 'कोरिया की हर जानकारी। एक प्लेटफॉर्म।',
    ecosystemDesc:
      'दक्षिण कोरिया में अध्ययन, यात्रा, रहने और अपना भविष्य बनाने के लिए आवश्यक हर सेवा और संसाधन का अन्वेषण करें।',
    exploreModuleCta: 'और जानें',
    modules: {
      universityTitle: 'विश्वविद्यालय',
      universityDesc:
        'दक्षिण कोरियाई विश्वविद्यालयों, प्रवेश आवश्यकताओं, ट्यूशन फीस, छात्रवृत्ति और शैक्षणिक अवसरों की खोज करें।',
      learnKoreanTitle: 'कोरियाई भाषा सीखें',
      learnKoreanDesc:
        'शुरुआती से उन्नत स्तर तक संरचित पाठों, शब्दावली, व्याकरण, उच्चारण और TOPIK तैयारी के माध्यम से कोरियाई सीखें।',
      accommodationTitle: 'आवास खोजें',
      accommodationDesc:
        'दक्षिण कोरिया में किफायती छात्र आवास, विश्वविद्यालय छात्रावास, निजी कमरे, साझा आवास और स्टूडियो खोजें।',
      aiTitle: 'टिकट और परिवहन',
      aiDesc:
        'अंतर्राष्ट्रीय उड़ानें, घरेलू उड़ानें, KTX टिकट, एयरपोर्ट परिवहन और स्थानीय परिवहन सेवाएं खोजें।',
      communityTitle: 'सिम पंजीकरण (SIM)',
      communityDesc:
        'अपने निःशुल्क सिम कार्ड के लिए आवेदन करें और कोरिया आगमन विवरण जमा करें। हमारी टीम WhatsApp के माध्यम से संपर्क करेगी।',
      othersTitle: 'अन्य सेवाएं',
      othersDesc:
        'छात्र सेवाएं, वीज़ा और आव्रजन मार्गदर्शन, पार्ट-टाइम नौकरियां, छात्र समुदाय और उपयोगी संसाधन देखें।',
      othersLinks: {
        visa: 'छात्र वीज़ा गाइड',
        scholarships: 'छात्रवृत्ति और वित्तीय सहायता',
        jobs: 'पार्ट-टाइम नौकरियां',
        support: 'छात्र सहायता',
        lifestyle: 'कोरियाई जीवनशैली',
        transportation: 'परिवहन',
        services: 'छात्र सेवाएं',
        updates: 'महत्वपूर्ण अपडेट',
      },
    },
    newsletter: {
      title: 'EVERYKR से जुड़े रहें',
      desc: 'कोरियाई विश्वविद्यालयों, छात्रवृत्ति, प्रवेश और छात्र जीवन के बारे में उपयोगी अपडेट प्राप्त करें।',
      placeholder: 'अपना ईमेल पता दर्ज करें...',
      subscribeBtn: 'सब्सक्राइब करें',
      subscribingBtn: 'सब्सक्राइब हो रहा है...',
      privacyNote: 'हम आपकी गोपनीयता का सम्मान करते हैं। आप किसी भी समय अनसब्सक्राइब कर सकते हैं।',
      unsubscribeToggle: 'अनसब्सक्राइब करना चाहते हैं?',
      subscribeToggle: 'सब्सक्राइब पर वापस जाएं',
      unsubscribeBtn: 'अनसब्सक्राइब',
      unsubscribingBtn: 'प्रक्रिया जारी...',
      invalidEmail: 'कृपया एक मान्य ईमेल पता दर्ज करें।',
      subscribedSuccess: 'EVERYKR अपडेट्स सब्सक्राइब करने के लिए धन्यवाद!',
      alreadySubscribed: 'यह ईमेल पहले से ही सब्सक्राइब है।',
      unsubscribedSuccess: 'आपका ईमेल सफलतापूर्वक अनसब्सक्राइब कर दिया गया है।',
    },
    utility: {
      login: 'लॉगिन',
      register: 'रजिस्टर',
      dashboard: 'डैशबोर्ड',
      profile: 'प्रोफ़ाइल',
      admin: 'एडमिन पोर्टल',
      logout: 'साइन आउट',
      quickMenu: 'मेनू',
      dayMode: 'डे मोड',
      nightMode: 'नाइट मोड',
    },
  },
  ar: {
    heroBadge: 'أهلاً بك في EVERYKR',
    heroTitle: 'رحلتك إلى كوريا تبدأ من هنا.',
    heroDesc:
      'اكتشف الجامعات الكورية الجنوبية، البرامج الدراسية، المنح، تعلم اللغة الكورية، سكن الطلاب، وكل ما تحتاجه لبدء رحلتك في كوريا — في منصة واحدة.',
    searchPlaceholder: 'ابحث عن الجامعات، التخصصات، المنح، البرامج...',
    searchButton: 'بحث',
    departureCountryLabel: 'بلد المغادرة',
    koreaSelectedNote: 'الوجهة: كوريا الجنوبية',
    flightToKoreaNote: 'مسار رحلة ثلاثي الأبعاد إلى كوريا الجنوبية',
    ecosystemEyebrow: 'منظومة المنصة',
    ecosystemTitle: 'كل ما يخص كوريا. في منصة واحدة.',
    ecosystemDesc:
      'استكشف كل الخدمات والموارد الأساسية التي تحتاجها للدراسة، السفر، العيش، وبناء مستقبلك في كوريا الجنوبية.',
    exploreModuleCta: 'استكشف المزيد',
    modules: {
      universityTitle: 'الجامعات',
      universityDesc:
        'اكتشف الجامعات الكورية الجنوبية، شروط القبول، الرسوم الدراسية، المنح الدراسية، والفرص الأكاديمية.',
      learnKoreanTitle: 'تعلم الكورية',
      learnKoreanDesc:
        'تعلم اللغة الكورية من المستوى المبتدئ إلى المتقدم عبر دروس منظمة، مفردات، قواعد، نطق، والتحضير لاختبار TOPIK.',
      accommodationTitle: 'البحث عن سكن',
      accommodationDesc:
        'استكشف سكن الطلاب بأسعار مناسبة، السكن الجامعي، الغرف الخاصة، السكن المشترك، والاستوديوهات في جميع أنحاء كوريا.',
      aiTitle: 'التذاكر والمواصلات',
      aiDesc:
        'ابحث عن الرحلات الدولية، الرحلات الداخلية، تذاكر قطار KTX، مواصلات المطار، وخدمات النقل المحلية.',
      communityTitle: 'شريحة الاتصال (SIM)',
      communityDesc:
        'قدّم طلباً للحصول على شريحة SIM مجانية وأرسل بيانات وصولك إلى كوريا. سيتواصل معك فريقنا عبر WhatsApp.',
      othersTitle: 'خدمات أخرى',
      othersDesc:
        'استكشف خدمات الطلاب، إرشادات التأشيرة والهجرة، الوظائف الجزئية، مجتمعات الطلاب، والموارد المفيدة.',
      othersLinks: {
        visa: 'دليل تأشيرة الطالب',
        scholarships: 'المنح والمساعدات المالية',
        jobs: 'وظائف بدوام جزئي',
        support: 'دعم الطلاب',
        lifestyle: 'نمط الحياة في كوريا',
        transportation: 'المواصلات',
        services: 'خدمات الطلاب',
        updates: 'تحديثات هامة',
      },
    },
    newsletter: {
      title: 'ابقَ على تواصل مع EVERYKR',
      desc: 'احصل على تحديثات مفيدة حول الجامعات الكورية، القبول، المنح الدراسية، وحياة الطلاب.',
      placeholder: 'أدخل بريدك الإلكتروني...',
      subscribeBtn: 'اشترك',
      subscribingBtn: 'جارٍ الاشتراك...',
      privacyNote: 'نحن نحترم خصوصيتك. يمكنك إلغاء الاشتراك في أي وقت.',
      unsubscribeToggle: 'هل ترغب في إلغاء الاشتراك؟',
      subscribeToggle: 'العودة للاشتراك',
      unsubscribeBtn: 'إلغاء الاشتراك',
      unsubscribingBtn: 'جارٍ الإلغاء...',
      invalidEmail: 'يرجى إدخال بريد إلكتروني صحيح.',
      subscribedSuccess: 'شكراً لاشتراكك في تحديثات EVERYKR!',
      alreadySubscribed: 'هذا البريد الإلكتروني مشترك بالفعل.',
      unsubscribedSuccess: 'تم إلغاء اشتراك بريدك الإلكتروني بنجاح.',
    },
    utility: {
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      dashboard: 'لوحة التحكم',
      profile: 'الملف الشخصي',
      admin: 'بوابة المشرف',
      logout: 'تسجيل الخروج',
      quickMenu: 'استكشف',
      dayMode: 'الوضع النهاري',
      nightMode: 'الوضع الليلي',
    },
  },
  zh: {
    heroBadge: '欢迎来到 EVERYKR',
    heroTitle: '您的韩国之旅从这里开始。',
    heroDesc:
      '探索韩国大学、学位课程、奖学金、韩语学习、学生住宿以及开启韩国留学生活所需的一切——尽在一个平台。',
    searchPlaceholder: '搜索大学、课程、奖学金、项目...',
    searchButton: '搜索',
    departureCountryLabel: '出发国家',
    koreaSelectedNote: '目的地：韩国',
    flightToKoreaNote: '飞往韩国的 3D 航线',
    ecosystemEyebrow: '平台生态系统',
    ecosystemTitle: '韩国留学与生活，一站式平台。',
    ecosystemDesc:
      '探索您在韩国学习、旅行、生活和规划未来所需的每一项核心服务与资源。',
    exploreModuleCta: '探索更多',
    modules: {
      universityTitle: '韩国大学',
      universityDesc:
        '了解韩国各大学、申请条件、学费标准、奖学金项目以及丰富的学术机会。',
      learnKoreanTitle: '学习韩语',
      learnKoreanDesc:
        '通过系统化课程、词汇、语法、发音及 TOPIK 备考指南，从零基础进阶到高级韩语。',
      accommodationTitle: '寻找住宿',
      accommodationDesc:
        '查找韩国各地高性价比的学生住宿、大学宿舍、单人公寓、合租房及一室户 (Studio)。',
      aiTitle: '机票与交通',
      aiDesc:
        '查询国际航班、韩国国内航班、KTX 高铁票、机场接驳及当地公共交通服务。',
      communityTitle: 'SIM 卡申请',
      communityDesc:
        '免费申请韩国 SIM 卡并提交您的抵韩信息，我们的团队将通过 WhatsApp 与您联系。',
      othersTitle: '更多服务',
      othersDesc:
        '浏览学生服务、签证与出入境指南、兼职工作、留学生社区及实用生活资源。',
      othersLinks: {
        visa: '学生签证指南',
        scholarships: '奖学金与经济资助',
        jobs: '兼职工作',
        support: '学生支持',
        lifestyle: '韩国生活方式',
        transportation: '交通指南',
        services: '学生服务',
        updates: '重要通知',
      },
    },
    newsletter: {
      title: '与 EVERYKR 保持联系',
      desc: '获取有关韩国大学、奖学金、入学申请和留学生生活的最新实用资讯。',
      placeholder: '请输入您的电子邮箱...',
      subscribeBtn: '订阅',
      subscribingBtn: '正在订阅...',
      privacyNote: '我们尊重您的隐私，绝无垃圾邮件，您可随时取消订阅。',
      unsubscribeToggle: '需要取消订阅？',
      subscribeToggle: '返回订阅',
      unsubscribeBtn: '取消订阅',
      unsubscribingBtn: '正在取消...',
      invalidEmail: '请输入有效的电子邮箱地址。',
      subscribedSuccess: '感谢您订阅 EVERYKR 最新资讯！',
      alreadySubscribed: '该邮箱已订阅 EVERYKR 资讯。',
      unsubscribedSuccess: '您的邮箱已成功取消订阅。',
    },
    utility: {
      login: '登录',
      register: '注册',
      dashboard: '控制台',
      profile: '个人资料',
      admin: '管理后台',
      logout: '退出登录',
      quickMenu: '浏览',
      dayMode: '日间模式',
      nightMode: '夜间模式',
    },
  },
  ja: {
    heroBadge: 'EVERYKRへようこそ',
    heroTitle: '韓国への旅はここから始まります。',
    heroDesc:
      '韓国の大学、学位プログラム、奨学金、韓国語学習、学生宿舎など、韓国での留学・生活を始めるために必要なすべてを一つのプラットフォームで。',
    searchPlaceholder: '大学、コース、奨学金、プログラムを検索...',
    searchButton: '検索',
    departureCountryLabel: '出発国',
    koreaSelectedNote: '目的地：韓国',
    flightToKoreaNote: '韓国への3Dフライト・ルート',
    ecosystemEyebrow: 'プラットフォーム・エコシステム',
    ecosystemTitle: '韓国のすべてを、一つのプラットフォームで。',
    ecosystemDesc:
      '韓国での留学、旅行、生活、そして未来を築くために必要なすべてのサービスとリソースを網羅しています。',
    exploreModuleCta: '詳しく見る',
    modules: {
      universityTitle: '大学案内',
      universityDesc:
        '韓国の大学、出願資格、学費、奨学金制度、および進学の機会を詳しく確認できます。',
      learnKoreanTitle: '韓国語を学ぶ',
      learnKoreanDesc:
        '初級から上級まで、体系的なレッスン、語彙、文法、発音、TOPIK対策を通じて韓国語を学習できます。',
      accommodationTitle: '滞在先を探す',
      accommodationDesc:
        '韓国全国の学生向け宿舎、大学寮、ワンルーム、シェアハウス、スタジオを簡単に探せます。',
      aiTitle: 'チケット＆交通',
      aiDesc:
        '国際線航空券、国内線、KTX乗車券、空港アクセス、現地の交通サービスを案内します。',
      communityTitle: 'SIMカード申請',
      communityDesc:
        '無料SIMカードを申請し、韓国到着情報を送信してください。担当チームがWhatsAppでご連絡します。',
      othersTitle: 'その他のサービス',
      othersDesc:
        '学生サポート、ビザ・出入国ガイド、アルバイト情報、留学生コミュニティ、便利なリソースを探索できます。',
      othersLinks: {
        visa: '学生ビザガイド',
        scholarships: '奨学金・経済支援',
        jobs: 'アルバイト情報',
        support: '学生サポート',
        lifestyle: '韓国ライフスタイル',
        transportation: '交通案内',
        services: '学生サービス',
        updates: '最新のお知らせ',
      },
    },
    newsletter: {
      title: 'EVERYKRの最新情報を受け取る',
      desc: '韓国の大学、奨学金、入試日程、留学生生活に関する役立つ最新情報をお届けします。',
      placeholder: 'メールアドレスを入力してください...',
      subscribeBtn: '購読する',
      subscribingBtn: '処理中...',
      privacyNote: 'プライバシーを尊重します。いつでも配信停止が可能です。',
      unsubscribeToggle: '配信停止をご希望ですか？',
      subscribeToggle: '購読登録に戻る',
      unsubscribeBtn: '配信停止',
      unsubscribingBtn: '停止中...',
      invalidEmail: '有効なメールアドレスを入力してください。',
      subscribedSuccess: 'EVERYKRニュースレターのご購読ありがとうございます！',
      alreadySubscribed: 'このメールアドレスは既に登録されています。',
      unsubscribedSuccess: 'ニュースレターの配信を停止しました。',
    },
    utility: {
      login: 'ログイン',
      register: '新規登録',
      dashboard: 'ダッシュボード',
      profile: 'プロフィール',
      admin: '管理者ポータル',
      logout: 'ログアウト',
      quickMenu: 'メニュー',
      dayMode: 'ライトモード',
      nightMode: 'ダークモード',
    },
  },
};

const DEPARTURE_COUNTRY_STORAGE_KEY = 'everykr_departure_country';

export const CategoryHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    approvedUniversitiesList,
    language,
    theme,
    currentUser,
  } = useApp();

  const copy = HOME_COPY[language] || HOME_COPY.en;
  const isRtl = language === 'ur' || language === 'ar';
  const isNight = theme === 'dark';

  // Automatic Departure Country System (Driven by Global Website Language)
  // EN -> US, BN -> BD, KO -> KR, NE -> NP, UR -> PK, HI -> IN, AR -> SA, ZH -> CN, JA -> JP
  const [departureCountryCode, setDepartureCountryCode] = useState<string>(
    () => DEFAULT_LANGUAGE_TO_COUNTRY_CODE[language] || 'US'
  );

  useEffect(() => {
    const targetCode = DEFAULT_LANGUAGE_TO_COUNTRY_CODE[language] || 'US';
    setDepartureCountryCode(targetCode);
    try {
      localStorage.setItem(DEPARTURE_COUNTRY_STORAGE_KEY, targetCode);
    } catch {
      // ignore storage errors
    }
  }, [language]);

  const selectedOriginCountry = useMemo(
    () => getOriginCountryByCode(departureCountryCode),
    [departureCountryCode]
  );

  // Hero Search Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Admin-managed Homepage 6 Categories (Part 1 CMS)
  const [cmsCategories, setCmsCategories] = useState<HomepageCmsCategoryRecord[]>(() =>
    getCachedHomepageCmsCategories()
  );

  useEffect(() => {
    let active = true;
    fetchHomepageCmsConfig().then(({ categories }) => {
      if (active && categories.length > 0) {
        setCmsCategories(categories);
      }
    });
    const unsubscribe = subscribeToHomepageCmsConfig(({ categories }) => {
      if (active && categories.length > 0) {
        setCmsCategories(categories);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const approvedUniversities = approvedUniversitiesList;

  const searchResults = useMemo<SearchResultItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const items: SearchResultItem[] = [];

    for (const uni of approvedUniversities) {
      const nameMatch =
        uni.name.toLowerCase().includes(q) ||
        (uni.officialName || '').toLowerCase().includes(q) ||
        uni.koreanName.toLowerCase().includes(q) ||
        uni.city.toLowerCase().includes(q);

      if (nameMatch) {
        items.push({
          id: `uni-${uni.id}`,
          title: uni.officialName || uni.name,
          subtitle: `${uni.koreanName} • ${uni.city}`,
          category: 'University',
          route: `/universities/${getUniversitySlug(uni)}`,
        });
      }

      for (const prog of uni.programs || []) {
        if (prog.toLowerCase().includes(q) && items.length < 10) {
          items.push({
            id: `prog-${uni.id}-${prog}`,
            title: prog,
            subtitle: `${uni.officialName || uni.name} (${uni.city})`,
            category: 'Program',
            route: `/universities/${getUniversitySlug(uni)}`,
          });
        }
      }
    }

    const staticResources: SearchResultItem[] = [
      {
        id: 'res-gks',
        title: 'Global Korea Scholarship (GKS)',
        subtitle: 'Full government & university scholarship tracks',
        category: 'Scholarship',
        route: '/scholarships',
      },
      {
        id: 'res-deadlines',
        title: 'Admission Deadlines',
        subtitle: 'Spring & Fall intake schedules across Korean universities',
        category: 'Resource',
        route: '/deadlines',
      },
      {
        id: 'res-korean',
        title: 'Learn Korean & TOPIK Preparation',
        subtitle: 'Hangul, vocabulary, grammar & TOPIK practice',
        category: 'Resource',
        route: '/korean-academy',
      },
      {
        id: 'res-housing',
        title: 'Student Accommodation & Dormitories',
        subtitle: 'University dorms, goshiwons & one-room studios',
        category: 'Resource',
        route: '/housing',
      },
      {
        id: 'res-ai',
        title: 'EVERYKR AI Assistant',
        subtitle: 'Multilingual AI advisor for admissions & student life',
        category: 'Resource',
        route: '/ai-chat',
      },
      {
        id: 'res-visa',
        title: 'D-2 & D-4 Student Visa Guide',
        subtitle: 'COA, financial proof & ARC registration checklist',
        category: 'Resource',
        route: '/visa',
      },
      {
        id: 'res-discover',
        title: 'Discover Korea & City Guides',
        subtitle: 'Seoul, Busan, Incheon, Daegu, Daejeon, Gwangju & Jeonju',
        category: 'Resource',
        route: '/discover-korea',
      },
    ];

    for (const r of staticResources) {
      if (r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)) {
        items.push(r);
      }
    }

    return items.slice(0, 7);
  }, [searchQuery, approvedUniversities]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      navigate('/universities');
      return;
    }
    if (searchResults.length > 0) {
      navigate(searchResults[0].route);
      setShowDropdown(false);
      return;
    }
    navigate(`/universities?q=${encodeURIComponent(q)}`);
    setShowDropdown(false);
  };

  // Newsletter State & Query Param Handling (?newsletter_action=unsubscribe / verify)
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMode, setNewsletterMode] = useState<'subscribe' | 'unsubscribe'>('subscribe');
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    previewUrl?: string;
  } | null>(null);

  useEffect(() => {
    const action = searchParams.get('newsletter_action');
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');

    if (!action || !emailParam) return;

    if (action === 'unsubscribe') {
      setNewsletterEmail(emailParam);
      setNewsletterMode('unsubscribe');
      setNewsletterBusy(true);
      fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailParam,
          token: tokenParam || undefined,
          source: 'homepage_newsletter',
        }),
      })
        .then((r) => r.json())
        .then(async (data) => {
          const cleanId = `sub_${emailParam
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .slice(0, 48)}`;
          await syncSubscriberToFirestore({
            id: cleanId,
            email: emailParam.trim().toLowerCase(),
            status: 'unsubscribed',
            verified: false,
            consentGiven: false,
            consentTimestamp: new Date().toISOString(),
            subscribedAt: new Date().toISOString(),
            unsubscribedAt: new Date().toISOString(),
            source: 'homepage_newsletter',
            topics: [],
          });
          setNewsletterStatus({
            type: data.ok ? 'info' : 'error',
            message: data.message || copy.newsletter.unsubscribedSuccess,
          });
          searchParams.delete('newsletter_action');
          searchParams.delete('token');
          setSearchParams(searchParams, { replace: true });
        })
        .catch(() => {
          setNewsletterStatus({
            type: 'error',
            message: 'Unable to complete unsubscribe request right now.',
          });
        })
        .finally(() => setNewsletterBusy(false));
    } else if (action === 'verify' && tokenParam) {
      setNewsletterBusy(true);
      fetch('/api/newsletter/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, token: tokenParam }),
      })
        .then((r) => r.json())
        .then((data) => {
          setNewsletterStatus({
            type: data.ok ? 'success' : 'error',
            message: data.message || copy.newsletter.subscribedSuccess,
          });
          searchParams.delete('newsletter_action');
          searchParams.delete('token');
          setSearchParams(searchParams, { replace: true });
        })
        .catch(() => {
          setNewsletterStatus({
            type: 'error',
            message: 'Verification link could not be processed.',
          });
        })
        .finally(() => setNewsletterBusy(false));
    }
  }, [searchParams, setSearchParams, copy.newsletter.unsubscribedSuccess, copy.newsletter.subscribedSuccess]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = newsletterEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!normalized || !emailRegex.test(normalized)) {
      setNewsletterStatus({
        type: 'error',
        message: copy.newsletter.invalidEmail,
      });
      return;
    }

    setNewsletterBusy(true);
    setNewsletterStatus(null);

    const subscriberDocId = `sub_${normalized.replace(/[^a-z0-9]/g, '_').slice(0, 64)}`;
    const nowIso = new Date().toISOString();

    if (newsletterMode === 'unsubscribe') {
      try {
        const res = await fetch('/api/newsletter/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalized,
            source: 'homepage_newsletter',
          }),
        });
        const data = await res.json().catch(() => ({}));

        await syncSubscriberToFirestore({
          id: subscriberDocId,
          email: normalized,
          status: 'unsubscribed',
          verified: false,
          consentGiven: false,
          consentTimestamp: nowIso,
          subscribedAt: nowIso,
          unsubscribedAt: nowIso,
          source: 'homepage_newsletter',
          topics: [],
        });

        setNewsletterStatus({
          type: 'info',
          message: data?.message || copy.newsletter.unsubscribedSuccess,
        });
        setNewsletterEmail('');
      } catch {
        setNewsletterStatus({
          type: 'error',
          message: 'Unable to process unsubscribe request right now.',
        });
      } finally {
        setNewsletterBusy(false);
      }
      return;
    }

    // Subscribe flow
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalized,
          consentGiven: true,
          language,
          source: 'homepage_newsletter',
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.code === 'INVALID_EMAIL' || data?.code === 'CONSENT_REQUIRED') {
        setNewsletterStatus({
          type: 'error',
          message: data?.message || copy.newsletter.invalidEmail,
        });
        setNewsletterBusy(false);
        return;
      }

      const delivery = data?.delivery;
      await syncSubscriberToFirestore({
        id: data?.subscriber?.id || subscriberDocId,
        email: normalized,
        status: 'active',
        verified: true,
        consentGiven: true,
        consentTimestamp: nowIso,
        subscribedAt: data?.subscriber?.subscribedAt || nowIso,
        verifiedAt: data?.subscriber?.verifiedAt || nowIso,
        source: 'homepage_newsletter',
        topics: [
          'South Korean Universities',
          'Admission Deadlines & Scholarships',
          'Korean Language & Student Life',
        ],
        lastDeliveryStatus: delivery?.status,
        lastDeliveryProvider: delivery?.provider,
        lastDeliveryError: delivery?.errorReason,
        lastMessageId: delivery?.messageId,
        lastPreviewUrl: delivery?.previewUrl,
      });

      if (data?.status === 'already_subscribed' || data?.code === 'ALREADY_SUBSCRIBED') {
        setNewsletterStatus({
          type: 'info',
          message: data?.message || copy.newsletter.alreadySubscribed,
        });
      } else if (data?.liveDelivered) {
        setNewsletterStatus({
          type: 'success',
          message:
            data?.message ||
            `Thank you for subscribing to EVERYKR! Confirmation email ("Welcome to EVERYKR — Stay Connected!") sent to ${normalized}.`,
        });
        setNewsletterEmail('');
      } else if (data?.emailAcceptedByProvider) {
        setNewsletterStatus({
          type: 'success',
          message:
            data?.message ||
            `Subscription saved for ${normalized}! Confirmation email ("Welcome to EVERYKR — Stay Connected!") generated via SMTP relay.`,
          previewUrl: delivery?.previewUrl,
        });
        setNewsletterEmail('');
      } else {
        setNewsletterStatus({
          type: 'info',
          message:
            data?.message ||
            `Subscription saved for ${normalized}, but the confirmation email is pending external email provider configuration.`,
        });
        setNewsletterEmail('');
      }
    } catch {
      setNewsletterStatus({
        type: 'error',
        message: 'Unable to reach the subscription server right now. Please try again.',
      });
    } finally {
      setNewsletterBusy(false);
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`bg-transparent transition-colors duration-300 ${
        isNight ? 'text-white' : 'text-[#10213D]'
      }`}
    >
      {/* ===================================================================== */}
      {/* 1. HERO SECTION (Transparent over Continuous Atmospheric Canvas)      */}
      {/* ===================================================================== */}
      <section
        className={`relative overflow-hidden border-b transition-colors duration-300 ${
          isNight ? 'border-white/10' : 'border-[#0754B8]/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 lg:pb-20 relative z-10">
          {/* ----------------------------------------------------------------- */}
          {/* TWO-COLUMN HERO SECTION                                           */}
          {/* Desktop (md+): Left Welcome + Search (md:order-1) | Right 3D Earth (md:order-2) */}
          {/* Mobile (<md):  1. 3D Earth First (order-1) | 2. Welcome + Search Below (order-2) */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 lg:gap-6 items-center">
            {/* LEFT SIDE ON DESKTOP / BELOW GLOBE ON MOBILE — Welcome Text, Heading, Description & Search Bar */}
            <div className="order-2 md:order-1 md:col-span-6 lg:col-span-6 space-y-5 sm:space-y-6">
              <div className="space-y-3.5 sm:space-y-4">
                <div className="inline-flex items-center gap-2">
                  <span
                    className="w-5 h-0.5 rounded-full bg-[#FFB800]"
                    aria-hidden="true"
                  />
                  <p
                    className={`text-xs font-extrabold uppercase tracking-[0.22em] ${
                      isNight ? 'text-[#60A5FA]' : 'text-[#0754B8]'
                    }`}
                  >
                    {copy.heroBadge}
                  </p>
                </div>

                <h1
                  className={`text-3xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.06] ${
                    isNight ? 'text-white' : 'text-[#061B49]'
                  }`}
                >
                  {copy.heroTitle}
                </h1>

                <p
                  className={`text-sm sm:text-base lg:text-[1.06rem] leading-relaxed max-w-xl ${
                    isNight ? 'text-[#B8C9E5]' : 'text-[#4B607F]'
                  }`}
                >
                  {copy.heroDesc}
                </p>
              </div>

              {/* Search Bar — Translucent Glass Bar Directly Below Description */}
              <div ref={searchBoxRef} className="relative max-w-xl">
                <form
                  onSubmit={handleSearchSubmit}
                  className="ekr-glass-panel flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl focus-within:border-[#0875E8] focus-within:ring-2 focus-within:ring-[#0875E8]/25 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 px-3.5 py-2.5">
                    <Search
                      className={`w-4 h-4 shrink-0 ${
                        isNight ? 'text-[#60A5FA]' : 'text-[#0754B8]'
                      }`}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      placeholder={copy.searchPlaceholder}
                      className={`w-full bg-transparent text-sm focus:outline-none ${
                        isNight
                          ? 'text-white placeholder-[#B8C9E5]/70'
                          : 'text-[#10213D] placeholder-[#64748B]'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="ekr-glass-btn-primary px-6 py-3 rounded-xl text-sm font-bold cursor-pointer shrink-0"
                  >
                    {copy.searchButton}
                  </button>
                </form>

                {/* Live Search Autocomplete Dropdown */}
                {showDropdown && searchQuery.trim().length > 0 && (
                  <div className="ekr-glass-dropdown absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden z-40">
                    {searchResults.length > 0 ? (
                      <div className={isNight ? 'divide-y divide-white/10' : 'divide-y divide-[#0754B8]/10'}>
                        {searchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setShowDropdown(false);
                              navigate(item.route);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                              isNight ? 'hover:bg-white/8' : 'hover:bg-[#0875E8]/8'
                            }`}
                          >
                            <div className="min-w-0">
                              <div
                                className={`text-xs font-bold truncate ${
                                  isNight ? 'text-white' : 'text-[#10213D]'
                                }`}
                              >
                                {item.title}
                              </div>
                              <div
                                className={`text-[11px] truncate ${
                                  isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
                                }`}
                              >
                                {item.subtitle}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                                isNight ? 'text-[#60A5FA]' : 'text-[#0754B8]'
                              }`}
                            >
                              {item.category}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`p-4 text-xs flex items-center justify-between ${
                          isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
                        }`}
                      >
                        <span>No exact match. Press Search to browse all universities.</span>
                        <Link
                          to="/universities"
                          onClick={() => setShowDropdown(false)}
                          className={`font-semibold hover:underline ${
                            isNight ? 'text-[#60A5FA]' : 'text-[#0754B8]'
                          }`}
                        >
                          View All →
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Destination Shortcuts */}
                <div
                  className={`mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold ${
                    isNight ? 'text-[#B8C9E5]' : 'text-slate-600'
                  }`}
                >
                  <Link
                    to="/universities"
                    className="inline-flex items-center gap-1.5 hover:text-[#0754B8] dark:hover:text-white transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" aria-hidden="true" />
                    <span>Universities</span>
                  </Link>
                  <Link
                    to="/learn-hangul"
                    className="inline-flex items-center gap-1.5 hover:text-[#0754B8] dark:hover:text-white transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" aria-hidden="true" />
                    <span>Learn Hangul</span>
                  </Link>
                  <Link
                    to="/housing"
                    className="inline-flex items-center gap-1.5 hover:text-[#0754B8] dark:hover:text-white transition-colors"
                  >
                    <Building className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" aria-hidden="true" />
                    <span>Housing</span>
                  </Link>
                  <Link
                    to="/transportation"
                    className="inline-flex items-center gap-1.5 hover:text-[#0754B8] dark:hover:text-white transition-colors"
                  >
                    <Plane className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" aria-hidden="true" />
                    <span>Flights &amp; KTX</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE ON DESKTOP / FIRST ON MOBILE — Immutable Frameless 3D Earth */}
            <div className="order-1 md:order-2 md:col-span-6 lg:col-span-6 flex items-center justify-center md:justify-end">
              <GlobalStudentJourneySection
                variant="hero"
                departureCountryCode={selectedOriginCountry.code}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* UNIVERSITY ADMISSION DEADLINE FLOATING CAROUSEL                       */}
      {/* Placed immediately below 3D Earth Globe & above Platform Ecosystem    */}
      {/* ===================================================================== */}
      <UniversityDeadlineCarousel isNight={isNight} />

      {/* ===================================================================== */}
      {/* 2. PLATFORM ECOSYSTEM — 6 PRACTICAL SERVICE CATEGORIES                */}
      {/* Mobile: Compact 2-column grid | Desktop: Balanced 3-column layout     */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-3xl mb-7 sm:mb-9 space-y-2">
          <div className="inline-flex items-center gap-2">
            <span className="w-4 h-0.5 rounded-full bg-[#FFB800]" aria-hidden="true" />
            <span
              className={`text-[11px] font-extrabold uppercase tracking-[0.2em] ${
                isNight ? 'text-[#60A5FA]' : 'text-[#0754B8]'
              }`}
            >
              {copy.ecosystemEyebrow}
            </span>
          </div>
          <h2
            className={`text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold tracking-tight text-balance ${
              isNight ? 'text-white' : 'text-[#061B49]'
            }`}
          >
            {copy.ecosystemTitle}
          </h2>
          <p
            className={`text-xs sm:text-sm lg:text-base leading-relaxed ${
              isNight ? 'text-[#B8C9E5]' : 'text-slate-600'
            }`}
          >
            {copy.ecosystemDesc}
          </p>
        </div>

        {/* 6 Main Categories — Connected to Admin Homepage CMS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {cmsCategories
            .filter((cat) => cat.visible !== false && cat.published !== false && cat.status !== 'archived')
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((cat, idx) => {
              const resolved = resolveCategoryCopyForLanguage(cat, language);
              const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                GraduationCap,
                BookOpen,
                Building,
                Plane,
                Smartphone,
                Compass,
              };
              const Icon = iconMap[cat.iconName] || Compass;
              return (
                <Link
                  key={cat.id}
                  to={cat.route}
                  style={{ '--stagger-idx': idx } as React.CSSProperties}
                  className="ekr-card-stagger ekr-glass-card group relative flex flex-col justify-between rounded-2xl p-5 sm:p-6 cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8]"
                >
                  <div className="space-y-4">
                    {/* Category Icon & Optional Featured Indicator */}
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-150 shrink-0 ${
                          isNight
                            ? 'bg-[#0875E8]/18 text-[#60A5FA] group-hover:bg-[#0875E8] group-hover:text-white border border-white/10'
                            : 'bg-[#0754B8]/8 text-[#0754B8] group-hover:bg-[#0754B8] group-hover:text-white border border-[#0754B8]/12'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {cat.featured && resolved.badgeText && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                            isNight ? 'text-[#FFB800]' : 'text-[#0754B8]'
                          }`}
                        >
                          {resolved.badgeText}
                        </span>
                      )}
                    </div>

                    {/* Category Title & Description */}
                    <div className="space-y-1.5">
                      <h3
                        className={`text-base sm:text-lg font-extrabold tracking-tight leading-snug transition-colors ${
                          isNight
                            ? 'text-white group-hover:text-[#60A5FA]'
                            : 'text-[#061B49] group-hover:text-[#0754B8]'
                        }`}
                      >
                        {resolved.title}
                      </h3>
                      <p
                        className={`text-xs sm:text-[13px] leading-relaxed ${
                          isNight ? 'text-[#B8C9E5]' : 'text-slate-600'
                        }`}
                      >
                        {resolved.description}
                      </p>
                    </div>
                  </div>

                  {/* Explore More Link at Bottom */}
                  <div
                    className={`mt-5 pt-3.5 border-t flex items-center justify-between text-xs font-bold ${
                      isNight
                        ? 'border-white/10 text-[#60A5FA] group-hover:text-white'
                        : 'border-slate-200/80 text-[#0754B8] group-hover:text-[#0875E8]'
                    }`}
                  >
                    <span>{resolved.ctaLabel || copy.exploreModuleCta}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
                  </div>
                </Link>
              );
            })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. COMPACT NEWSLETTER SECTION (IMMEDIATELY AFTER ECOSYSTEM)           */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10">
        <div className="ekr-glass-panel rounded-2xl p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="lg:col-span-6 space-y-1">
              <div
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${
                  isNight ? 'text-[#60A5FA]' : 'text-[#0754B8]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>EVERYKR BRIEFING</span>
              </div>
              <h2
                className={`text-lg sm:text-xl font-extrabold tracking-tight ${
                  isNight ? 'text-white' : 'text-[#10213D]'
                }`}
              >
                {copy.newsletter.title}
              </h2>
              <p
                className={`text-xs sm:text-sm leading-relaxed ${
                  isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
                }`}
              >
                {copy.newsletter.desc}
              </p>
            </div>

            <div className="lg:col-span-6 space-y-2">
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={copy.newsletter.placeholder}
                  className="ekr-glass-input flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm placeholder:text-[#64748B] dark:placeholder:text-[#B8C9E5]/60"
                />
                <button
                  type="submit"
                  disabled={newsletterBusy}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all cursor-pointer shrink-0 disabled:opacity-60 ${
                    newsletterMode === 'unsubscribe'
                      ? 'bg-slate-700 hover:bg-slate-600'
                      : 'ekr-glass-btn-primary'
                  }`}
                >
                  {newsletterBusy
                    ? newsletterMode === 'unsubscribe'
                      ? copy.newsletter.unsubscribingBtn
                      : copy.newsletter.subscribingBtn
                    : newsletterMode === 'unsubscribe'
                    ? copy.newsletter.unsubscribeBtn
                    : copy.newsletter.subscribeBtn}
                </button>
              </form>

              {newsletterStatus && (
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
                    newsletterStatus.type === 'success'
                      ? isNight
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                        : 'bg-emerald-50/90 text-emerald-800 border border-emerald-200'
                      : newsletterStatus.type === 'error'
                      ? isNight
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-700/50'
                        : 'bg-rose-50/90 text-rose-800 border border-rose-200'
                      : isNight
                      ? 'bg-blue-950/60 text-blue-200 border border-blue-700/50'
                      : 'bg-blue-50/90 text-blue-800 border border-blue-200'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-2">
                    {newsletterStatus.type === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" />
                    )}
                    <span>{newsletterStatus.message}</span>
                  </div>
                  {newsletterStatus.previewUrl && (
                    <a
                      href={newsletterStatus.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold underline shrink-0 text-[#0875E8] dark:text-[#60A5FA] hover:opacity-90"
                    >
                      View Confirmation Email ↗
                    </a>
                  )}
                </div>
              )}

              <div
                className={`flex items-center justify-between flex-wrap gap-2 text-[11px] ${
                  isNight ? 'text-[#B8C9E5]' : 'text-[#64748B]'
                }`}
              >
                <span>{copy.newsletter.privacyNote}</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewsletterMode((m) => (m === 'subscribe' ? 'unsubscribe' : 'subscribe'));
                    setNewsletterStatus(null);
                  }}
                  className={`hover:underline font-semibold cursor-pointer ${
                    isNight ? 'text-[#60A5FA]' : 'text-[#0754B8]'
                  }`}
                >
                  {newsletterMode === 'subscribe'
                    ? copy.newsletter.unsubscribeToggle
                    : copy.newsletter.subscribeToggle}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
