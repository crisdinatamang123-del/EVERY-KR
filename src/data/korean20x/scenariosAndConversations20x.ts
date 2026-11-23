import { DAILY_CONVERSATION_LESSONS } from '../learnHangulCurriculum';
import {
  toBengaliPronunciation,
  toNepaliPronunciation,
  toRomanization,
} from '../../utils/hangulPhonetics';
import {
  CurriculumLevelId,
  RealLifeScenario20x,
  ScenarioDialogueTurn,
} from './levelsAndCategories';

export interface ScenarioDomainBlueprint {
  domainId: string;
  domainOrder: number;
  titleKo: string;
  titleEn: string;
  titleBn: string;
  titleNe: string;
  defaultLevel: CurriculumLevelId;
  staffRoleKo: string;
  staffRoleEn: string;
  staffRoleBn: string;
  staffRoleNe: string;
  vocabSeeds: Array<[ko: string, en: string, bn: string, ne: string]>;
  episodes: Array<[
    subKo: string,
    subEn: string,
    subBn: string,
    subNe: string,
    userLine1Ko: string,
    userLine1En: string,
    userLine1Bn: string,
    userLine1Ne: string,
    staffLine1Ko: string,
    staffLine1En: string,
    staffLine1Bn: string,
    staffLine1Ne: string,
    userLine2Ko: string,
    userLine2En: string,
    userLine2Bn: string,
    userLine2Ne: string,
    staffLine2Ko: string,
    staffLine2En: string,
    staffLine2Bn: string,
    staffLine2Ne: string,
  ]>;
}

// 20 realistic situational stages applied with domain-authentic vocabulary & lines across all 22 Korea domains
interface DomainCoreSpec {
  domainId: string;
  order: number;
  titleKo: string;
  titleEn: string;
  titleBn: string;
  titleNe: string;
  level: CurriculumLevelId;
  placeKo: string;
  staffKo: string;
  staffEn: string;
  staffBn: string;
  staffNe: string;
  vocab: Array<[string, string, string, string]>;
  situations: Array<[ko: string, en: string, bn: string, ne: string, keyItemKo: string, keyItemEn: string, keyItemBn: string, keyItemNe: string]>;
}

const TWENTY_TWO_KOREA_DOMAINS: DomainCoreSpec[] = [
  {
    domainId: 'incheon_airport',
    order: 1,
    titleKo: '인천공항 입국 및 도착',
    titleEn: 'Arriving at Incheon Airport',
    titleBn: 'ইনছন বিমানবন্দরে আগমন',
    titleNe: 'इन्चोन विमानस्थलमा आगমন',
    level: 'Beginner 1',
    placeKo: '인천국제공항 도착장',
    staffKo: '공항 안내직원',
    staffEn: 'Airport Staff',
    staffBn: 'বিমানবন্দর কর্মী',
    staffNe: 'विमानस्थल कर्मचारी',
    vocab: [
      ['입국신고서', 'Arrival card', 'অ্যারাইভাল কার্ড', 'आगमन फारम'],
      ['수하물 찾는 곳', 'Baggage claim', 'ব্যাগেজ সংগ্রহের স্থান', 'लगेज लिने ठाउँ'],
      ['세관 신고', 'Customs declaration', 'কাস্টমস ঘোষণা', 'भन्सार घोषणा'],
      ['공항철도', 'Airport Railroad', 'এয়ারপোর্ট ট্রেন', 'विमानस्थल रेल'],
    ],
    situations: [
      ['입국심사 줄 찾기', 'Finding the immigration line', 'ইমিগ্রেশন লাইন খোঁজা', 'अध्यागमन लाइन खोज्ने', '외국인 입국심사대', 'foreigner immigration desk', 'বিদেশি ইমিগ্রেশন কাউন্টার', 'विदेशी अध्यागमन काउन्टर'],
      ['수하물 벨트 번호 확인', 'Checking baggage carousel number', 'ব্যাগেজ বেল্ট নম্বর যাচাই', 'लगेज बेल्ट नम्बर जाँच', '수하물 수취대 번호', 'baggage belt number', 'ব্যাগেজ বেল্ট নম্বর', 'लगेज बेल्ट नम्बर'],
      ['지연된 가방 신고하기', 'Reporting delayed luggage', 'দেরিতে আসা লাগেজ রিপোর্ট', 'छुटेको लगेज रिपोर्ट', '수하물 분실 신고서', 'lost baggage report form', 'লাগেজ রিপোর্ট ফর্ম', 'लगेज हराएको फारम'],
      ['세관 휴대품 확인', 'Customs item inspection', 'কাস্টমস ব্যাগেজ যাচাই', 'भन्सार सामान जाँच', '모바일 세관신고 QR코드', 'mobile customs QR code', 'মোবাইল কাস্টমস কিউআর কোড', 'मोबाइल भन्सार QR कोड'],
      ['공항 유심 수령하기', 'Picking up airport SIM card', 'বিমানবন্দর থেকে সিম কার্ড সংগ্রহ', 'विमानस्थलमा सिम कार्ड लिने', '예약한 선불 유심칩', 'pre-booked prepaid SIM', 'বুক করা প্রিপেইড সিম', 'बुक गरेको प्रिपेड सिम'],
    ],
  },
  {
    domainId: 'immigration_interviews',
    order: 2,
    titleKo: '출입국 심사 및 인터뷰',
    titleEn: 'Immigration Interviews',
    titleBn: 'ইমিগ্রেশন ইন্টারভিউ ও জিজ্ঞাসাবাদ',
    titleNe: 'अध्यागमन अन्तर्वार्ता',
    level: 'Beginner 2',
    placeKo: '출입국 심사대',
    staffKo: '출입국 심사관',
    staffEn: 'Immigration Officer',
    staffBn: 'ইমিগ্রেশন অফিসার',
    staffNe: 'अध्यागमन अधिकृत',
    vocab: [
      ['방문 목적', 'Purpose of visit', 'আসার উদ্দেশ্য', 'भ्रमणको उद्देश्य'],
      ['체류 주소', 'Address in Korea', 'কোরিয়ায় থাকার ঠিকানা', 'कोरियाको ठेगाना'],
      ['입학허가서', 'Certificate of Admission', 'অ্যাডমিশন লেটার', 'भर्ना अनुमति पत्र'],
      ['지문 및 얼굴인식', 'Fingerprint & face scan', 'আঙুলের ছাপ ও ছবি', 'औँठाछाप र अनुहार जाँच'],
    ],
    situations: [
      ['입국 목적 설명하기', 'Explaining purpose of entry', 'কোরিয়ায় আসার উদ্দেশ্য বলা', 'कोरिया आउनुको उद्देश्य बताउने', '유학 비자와 입학허가서', 'student visa & COA', 'স্টুডেন্ট ভিসা ও অ্যাডমিশন লেটার', 'विद्यार्थी भिसा र भर्ना पत्र'],
      ['체류 기간과 숙소 답변', 'Answering stay duration & housing', 'থাকার মেয়াদ ও বাসার ঠিকানা বলা', 'बस्ने अवधि र ठेगाना बताउने', '대학교 기숙사 주소', 'university dorm address', 'বিশ্ববিদ্যালয় ডরমিটরি ঠিকানা', 'विश्वविद्यालय होस्टेल ठेगाना'],
      ['지문 등록 안내 따르기', 'Following fingerprint scan steps', 'আঙুলের ছাপ দেওয়ার নির্দেশ মানা', 'औँठाछाप दिँदा निर्देशन मान्ने', '양손 검지 지문 스캔', 'both index-finger scan', 'দুই হাতের তর্জনীর ছাপ', 'दुवै हातको चोरऔँला स्क्यान'],
      ['재입국 시 등록증 제시', 'Showing ARC upon re-entry', 'পুনঃপ্রবেশের সময় এআরসি দেখানো', 'पुनः प्रवेशमा ARC देखाउने', '외국인등록증과 여권', 'ARC card and passport', 'এআরসি কার্ড ও পাসপোর্ট', 'ARC कार्ड र राहदानी'],
      ['비자 자격변경 대면심사', 'In-person visa status interview', 'ভিসা পরিবর্তনের সরাসরি ইন্টারভিউ', 'भिसा परिवर्तन प्रत्यक्ष अन्तर्वार्ता', '고용계약서와 학위증명서', 'job contract & degree certificate', 'চাকরির চুক্তি ও ডিগ্রি সনদ', 'श्रम सम्झौता र शैक्षिक प्रमाणपत्र'],
    ],
  },
  {
    domainId: 'arc_application_renewal',
    order: 3,
    titleKo: '외국인등록증 발급 및 연장',
    titleEn: 'ARC Application and Renewal',
    titleBn: 'এআরসি (ARC) আবেদন ও মেয়াদ নবায়ন',
    titleNe: 'ARC दर्ता र म्याद थप',
    level: 'Elementary',
    placeKo: '관할 출입국·외국인청',
    staffKo: '출입국 담당관',
    staffEn: 'Case Officer',
    staffBn: 'ইমিগ্রেশন কর্মকর্তা',
    staffNe: 'अध्यागमन कर्मचारी',
    vocab: [
      ['통합신청서', 'Integrated application form', 'সমন্বিত আবেদন ফর্ম', 'एकीकृत आवेदन फारम'],
      ['수입인지 수수료', 'Revenue stamp fee', 'সরকারি স্ট্যাম্প ফি', 'राजस्व टिकट शुल्क'],
      ['거주숙소 제공확인서', 'Proof of residence form', 'আবাসন নিশ্চিতকরণ ফর্ম', 'बसोबास प्रमाण फारम'],
      ['체류기간 연장', 'Stay period extension', 'ভিসার মেয়াদ বৃদ্ধি', 'बसोबास म्याद थप'],
    ],
    situations: [
      ['신규 외국인등록 접수', 'First-time ARC registration', 'প্রথমবার এআরসি কার্ডের আবেদন', 'पहिलो पटक ARC दर्ता', '통합신청서와 증명사진', 'application form & ID photo', 'আবেদন ফর্ম ও পাসপোর্ট সাইজ ছবি', 'आवेदन फारम र फोटो'],
      ['체류기간 연장 서류 제출', 'Submitting visa extension papers', 'ভিসা মেয়াদ বৃদ্ধির কাগজ জমা', 'भिसा म्याद थप कागजात बुझाउने', '재학증명서와 성적증명서', 'enrollment & transcript', 'অধ্যয়ন সনদ ও ট্রান্সক্রিপ্ট', 'अध्ययनरत र लब्धांक प्रमाणपत्र'],
      ['주소 변경 14일 내 신고', 'Reporting new address within 14 days', '১৪ দিনের মধ্যে নতুন ঠিকানা নিবন্ধন', '१४ दिनभित्र नयाँ ठेगाना दर्ता', '원룸 임대차계약서 원본', 'original studio lease contract', 'ওয়ান-রুম ভাড়ার মূল চুক্তি', 'कोठा भाडाको सक्कल सम्झौता'],
      ['외국인등록증 분실 재발급', 'Reissuing a lost ARC card', 'হারানো এআরসি পুনরায় উত্তোলন', 'हराएको ARC प्रतिलिपि लिने', '재발급 신청서와 수수료 영수증', 'reissue form & fee receipt', 'পুনঃইস্যু ফর্ম ও ফি রসিদ', 'प्रतिलिपि फारम र शुल्क रसिद'],
      ['시간제취업(S-3) 허가 신청', 'Applying for student part-time work permit', 'পার্ট-টাইম কাজের সরকারি অনুমতি আবেদন', 'विद्यार्थी पार्ट-टाइम काम अनुमति आवेदन', '시간제취업 확인서와 근로계약서', 'work confirmation & contract', 'কাজের ফর্ম ও শ্রম চুক্তি', 'काम पुष्टिकरण र सम्झौता'],
    ],
  },
  {
    domainId: 'university_admission_registration',
    order: 4,
    titleKo: '대학교 입학 및 학사 등록',
    titleEn: 'University Admission and Registration',
    titleBn: 'বিশ্ববিদ্যালয়ে ভর্তি ও একাডেমিক রেজিস্ট্রেশন',
    titleNe: 'विश्वविद्यालय भर्ना र दर्ता',
    level: 'Elementary',
    placeKo: '대학교 국제교류처',
    staffKo: '국제처 담당자',
    staffEn: 'International Office Coordinator',
    staffBn: 'ইন্টারন্যাশনাল অফিস কর্মকর্তা',
    staffNe: 'अन्तर्राष्ट्रिय शाखा संयोजक',
    vocab: [
      ['등록금 고지서', 'Tuition invoice', 'টিউশন ফির বিল', 'ट्युसन शुल्क बिल'],
      ['수강신청 정정기간', 'Add/drop course period', 'কোর্স পরিবর্তনের সময়', 'विषय थपघट समय'],
      ['오리엔테이션', 'New student orientation', 'ওরিয়েন্টেশন প্রোগ্রাম', 'अभिमुखीकरण कार्यक्रम'],
      ['장학금 감면', 'Scholarship tuition waiver', 'স্কলারশিপ ফি মওকুফ', 'छात्रवृत्ति शुल्क छुट'],
    ],
    situations: [
      ['입학 원본서류 제출 확인', 'Verifying apostilled admission papers', 'অ্যাপোস্টিল করা মূল সনদ জমা যাচাই', 'सक्कल शैक्षिक कागजात रुजु', '아포스티유 졸업증명서 원본', 'apostilled graduation certificate', 'অ্যাপোস্টিল গ্র্যাজুয়েশন সনদ', 'अपोस्टिल शैक्षिक प्रमाणपत्र'],
      ['등록금 가상계좌 납부 문의', 'Asking about tuition virtual account', 'টিউশন ফির ভার্চুয়াল অ্যাকাউন্ট জিজ্ঞাসা', 'ट्युसन भर्चुअल खाता सोधपुछ', '외국인 유학생 등록금 고지서', 'international tuition invoice', 'টিউশন ফি ইনভয়েস', 'अन्तर्राष्ट्रिय विद्यार्थी शुल्क बिल'],
      ['전공 필수 수강신청 도움 요청', 'Asking help with major course registration', 'মেজর কোর্স রেজিস্ট্রেশনে সাহায্য চাওয়া', 'मुख्य विषय दर्तामा सहयोग माग्ने', '이번 학기 전공 필수 과목', 'required major courses', 'বাধ্যতামূলক মেজর কোর্স', 'अनिवार्य मुख्य विषयहरू'],
      ['학생증 발급 신청하기', 'Applying for campus student ID card', 'ক্যাম্পাস স্টুডেন্ট আইডি কার্ডের আবেদন', 'विद्यार्थी परिचयपत्र आवेदन', '체크카드 겸용 학생증 신청서', 'student ID debit card form', 'স্টুডেন্ট আইডি কার্ড ফর্ম', 'विद्यार्थी परिचयपत्र फारम'],
      ['성적 장학금 유지 기준 확인', 'Checking GPA criteria for scholarship', 'স্কলারশিপ বজায় রাখার সিজিপিএ শর্ত জানা', 'छात्रवृत्ति कायम राख्ने GPA मापदण्ड', '장학금 평점 유지 기준표', 'scholarship GPA requirement sheet', 'স্কলারশিপ সিজিপিএ তালিকা', 'छात्रवृत्ति GPA मापदण्ड'],
    ],
  },
  {
    domainId: 'talking_to_professors',
    order: 5,
    titleKo: '교수님 면담 및 이메일 예절',
    titleEn: 'Talking to Professors',
    titleBn: 'প্রফেসরদের সাথে কথা বলা ও ইমেইল শিষ্টাচার',
    titleNe: 'प्राध्यापकसँग संवाद र शिष्टाचार',
    level: 'Pre-Intermediate',
    placeKo: '교수님 연구실',
    staffKo: '지도교수님',
    staffEn: 'Advisor Professor',
    staffBn: 'সুপারভাইজার প্রফেসর',
    staffNe: 'निर्देशक प्राध्यापक',
    vocab: [
      ['면담 요청', 'Consultation request', 'সাক্ষাতের অনুরোধ', 'परामर्श भेट अनुरोध'],
      ['출석 인정원', 'Excused absence form', 'উপস্থিতি মার্জনার আবেদন', 'हाजिरी मान्यता निवेदन'],
      ['논문 주제', 'Thesis research topic', 'থিসিস গবেষণার বিষয়', 'शोधपत्रको विषय'],
      ['추천서 부탁', 'Recommendation letter request', 'রিকমেন্ডেশন লেটারের অনুরোধ', 'सिफारिस पत्र अनुरोध'],
    ],
    situations: [
      ['면담 일정 정중히 요청하기', 'Politely scheduling office hours', 'ভদ্রভাবে প্রফেসরের সাক্ষাতের সময় চাওয়া', 'प्राध्यापकसँग भेट्ने समय माग्ने', '이번 주 목요일 오후 면담 일정', 'Thursday afternoon meeting slot', 'বৃহস্পতিবার বিকেলের সাক্ষাৎ সময়', 'बिहीबार दिउँसोको भेट समय'],
      ['병원 진료로 인한 결석 사유 설명', 'Explaining medical absence with certificate', 'ডাক্তার দেখানোর সনদসহ অনুপস্থিতির কারণ বলা', 'उपचार प्रमाणपत्रसहित अनुपस्थिति जानकारी', '병원 진료확인서와 출석인정원', 'clinic note & excused-absence form', 'হাসপাতালের সনদ ও হাজিরা ফর্ম', 'अस्पताल पुर्जी र निवेदन'],
      ['과제 발표 피드백 여쭙기', 'Asking feedback on class presentation', 'ক্লাস প্রেজেন্টেশনের ফিডব্যাক চাওয়া', 'प्रस्तुतिबारे सुझाव माग्ने', '조별 과제 발표 자료 초안', 'presentation slide draft', 'প্রেজেন্টেশন স্লাইডের খসড়া', 'प्रस्तुति स्लाइडको मस्यौदा'],
      ['석사 논문 연구방향 상담', 'Consulting on thesis research direction', 'মাস্টার্স থিসিসের গবেষণা দিকনির্দেশনা চাওয়া', 'शोधपत्रको अनुसन्धान दिशाबारे सल्लाह', '학위논문 연구계획서 수정본', 'revised thesis research proposal', 'সংশোধিত গবেষণা প্রস্তাবনা', 'संशोधित शोध प्रस्तावना'],
      ['인턴십 지원 추천서 요청드리기', 'Requesting internship recommendation letter', 'ইন্টার্নশিপের জন্য রিকমেন্ডেশন লেটার চাওয়া', 'इन्टर्नसिप सिफारिस पत्र अनुरोध', '인턴십 지원서와 성적증명서', 'internship form & transcript', 'ইন্টার্নশিপ ফর্ম ও ট্রান্সক্রিপ্ট', 'इन्टर्नसिप फारम र लब्धांक पत्र'],
    ],
  },
  {
    domainId: 'dormitory_life',
    order: 6,
    titleKo: '대학교 기숙사 생활',
    titleEn: 'Dormitory Life',
    titleBn: 'বিশ্ববিদ্যালয় ডরমিটরি জীবন',
    titleNe: 'विश्वविद्यालय होस्टेल जीवन',
    level: 'Beginner 2',
    placeKo: '기숙사 행정실',
    staffKo: '기숙사 사감님',
    staffEn: 'Dormitory Supervisor',
    staffBn: 'ডরমিটরি সুপারভাইজার',
    staffNe: 'होस्टेल वार्डेन',
    vocab: [
      ['입사 체크인', 'Dorm move-in check-in', 'ডরমিটরিতে চেক-ইন', 'होस्टेल चेक-इन'],
      ['통금 시간', 'Curfew time', 'রাতে প্রবেশের শেষ সময়', 'राति भित्र पस्ने समय सीमा'],
      ['외박 신청', 'Overnight stay-out request', 'বাইরে রাত কাটানোর আবেদন', 'बाहिर बास बस्ने निवेदन'],
      ['시설 수리요청', 'Facility repair request', 'রুম মেরামতের অনুরোধ', 'मर्मत अनुरोध'],
    ],
    situations: [
      ['기숙사 출입카드 수령하기', 'Receiving dorm keycard at check-in', 'ডরমিটরিতে ওঠার সময় অ্যাক্সেস কার্ড নেওয়া', 'होस्टेल प्रवेश कार्ड लिने', '결핵검진 결과서와 출입카드', 'TB test result & access card', 'টিবি রিপোর্ট ও অ্যাক্সেস কার্ড', 'टीबी रिपोर्ट र प्रवेश कार्ड'],
      ['주말 외박 온라인 신청 문의', 'Asking how to submit overnight-stay notice', 'উইকেন্ডে বাইরে থাকার অনলাইন আবেদন নিয়ম জানা', 'सप्ताहन्तमा बाहिर बस्ने अनलाइन निवेदन', '포털 외박 사전신청 메뉴', 'portal overnight request menu', 'পোর্টালের ওভারনাইট আবেদন মেনু', 'पोर्टल बाहिर बस्ने निवेदन मेनु'],
      ['방 보일러 난방 고장 신고', 'Reporting room heating malfunction', 'রুমের হিটিং বা বয়লার নষ্ট হলে জানানো', 'कोठाको हिटर/बोइलर बिग्रेको जानकारी', '호실 번호와 난방 온도조절기', 'room number & heater panel', 'রুম নম্বর ও হিটার সুইচ', 'कोठा नम्बर र हिटर कन्ट्रोलर'],
      ['공용 세탁실 이용 예절 확인', 'Checking shared laundry room rules', 'কমন লন্ড্রি রুম ব্যবহারের নিয়ম জানা', 'साझा लुगा धुने कोठाको नियम', '세탁기와 건조기 이용 시간', 'washer & dryer operating hours', 'ওয়াশিং মেশিন ব্যবহারের সময়', 'वासिङ मेसिन चलाउने समय'],
      ['학기말 퇴사 점검 받기', 'Completing end-of-semester move-out check', 'সেমিস্টার শেষে রুম বুঝিয়ে দিয়ে চেক-আউট', 'सेमेस्टर अन्त्यमा कोठा जाँच गराई छोड्ने', '퇴사 청소 확인표와 카드 반납', 'cleaning checklist & card return', 'পরিষ্কারের তালিকা ও কার্ড ফেরত', 'सरसफाइ जाँच र कार्ड फिर्ता'],
    ],
  },
  {
    domainId: 'finding_an_apartment',
    order: 7,
    titleKo: '원룸 및 자취방 구하기',
    titleEn: 'Finding an Apartment',
    titleBn: 'বাসা ও ওয়ান-রুম অ্যাপার্টমেন্ট খোঁজা',
    titleNe: 'कोठा वा अपार्टमेन्ट खोज्ने',
    level: 'Pre-Intermediate',
    placeKo: '공인중개사 사무소',
    staffKo: '공인중개사',
    staffEn: 'Licensed Realtor',
    staffBn: 'রিয়েল এস্টেট এজেন্ট',
    staffNe: 'घरजग्गा एजेन्ट',
    vocab: [
      ['보증금과 월세', 'Deposit and monthly rent', 'ডিপোজিট ও মাসিক ভাড়া', 'धरौटी र मासिक भाडा'],
      ['관리비 포함내역', 'Items included in maintenance fee', 'সার্ভিস চার্জে অন্তর্ভুক্ত সুবিধাদি', 'व्यवस्थापन शुल्कमा पर्ने सुविधा'],
      ['등기부등본', 'Certified property registry', 'মালিকানার সরকারি দলিল', 'घरजग्गा स्वामित्व दर्ता प्रमाण'],
      ['전입신고 확정일자', 'Move-in report & date stamp', 'ঠিকানা নিবন্ধন ও জামানত সুরক্ষা সিল', 'बसाइँसराइ दर्ता र मिति छाप'],
    ],
    situations: [
      ['예산에 맞는 원룸 매물 문의', 'Asking for studios within budget', 'বাজেট অনুযায়ী ওয়ান-রুম বাসা খোঁজা', 'बजेट मिल्ने वान-रुम कोठा सोधपुछ', '보증금 오백에 월세 사십만 원 방', '5M deposit / 400k monthly room', '৫ মিলিয়ন ডিপোজিট ও ৪ লাখ ওন ভাড়ার রুম', '५० लाख धरौटी र ४ लाख भाडाको कोठा'],
      ['관리비에 수도·인터넷 포함 여부 확인', 'Checking if water & internet are in fee', 'সার্ভিস চার্জে পানি ও ইন্টারনেট আছে কি না দেখা', 'शुल्कमा पानी र इन्टरनेट पर्छ कि पर्दैन जाँच्ने', '월 관리비 포함 항목과 가스비', 'items in monthly fee & gas bill', 'মাসিক সার্ভিস চার্জ ও গ্যাস বিল', 'मासिक शुल्क विवरण र ग्यास बिल'],
      ['수압·채광·방음 직접 점검하기', 'Inspecting water pressure, sunlight & noise', 'পানির চাপ, আলো-বাতাস ও শব্দ পরীক্ষা করা', 'पानीको प्रेसर, घाम र आवाज जाँच्ने', '화장실 온수 수압과 창문 채광', 'hot-water pressure & window light', 'গরম পানির চাপ ও জানালার আলো', 'तातो पानीको प्रेसर र झ्यालको उज्यालो'],
      ['임대차 계약서 특약사항 넣기', 'Adding protective clauses to lease contract', 'চুক্তিপত্রে মেরামতের বিশেষ শর্ত যুক্ত করা', 'भाडा सम्झौतामा विशेष सर्त राख्ने', '입주 전 도배 및 고장 수리 특약', 'pre-move-in repair clause', 'ওঠার আগে মেরামতের বিশেষ শর্ত', 'बस्नुअघि मर्मत गर्ने विशेष सर्त'],
      ['주민센터에서 체류지 변경 및 확정일자 받기', 'Registering address & fixed date at center', 'কমিউনিটি সেন্টারে ঠিকানা নিবন্ধন ও সিল নেওয়া', 'वडा कार्यालयमा ठेगाना दर्ता गर्ने', '임대차계약서 원본과 외국인등록증', 'original lease & ARC card', 'মূল চুক্তিপত্র ও এআরসি কার্ড', 'सक्कल सम्झौता र ARC कार्ड'],
    ],
  },
  {
    domainId: 'part_time_job_interviews',
    order: 8,
    titleKo: '아르바이트 구직 및 면접',
    titleEn: 'Part-Time Job Interviews',
    titleBn: 'পার্ট-টাইম কাজের (আলবা) ইন্টারভিউ',
    titleNe: 'पार्ट-टाइम कामको अन्तर्वार्ता',
    level: 'Elementary',
    placeKo: '매장 면접장소',
    staffKo: '매장 점장님',
    staffEn: 'Store Manager',
    staffBn: 'স্টোর ম্যানেজার',
    staffNe: 'पसल म्यानेजर',
    vocab: [
      ['근무 가능요일', 'Available working days', 'কাজ করার সুবিধাজনক বার', 'काम गर्न मिल्ने बारहरू'],
      ['최저시급', 'Minimum hourly wage', 'ন্যূনতম ঘণ্টাপ্রতি মজুরি', 'न्यूनतम प्रतिघण्टा ज्याला'],
      ['보건증', 'Health clearance certificate', 'খাবার দোকানের হেলথ কার্ড', 'स्वास्थ्य प्रमाणपत्र (हेल्थ कार्ड)'],
      ['표준근로계약서', 'Standard labor contract', 'স্ট্যান্ডার্ড শ্রম চুক্তিপত্র', 'मानक श्रम सम्झौता'],
    ],
    situations: [
      ['알바 공고 보고 전화 문의하기', 'Calling about a part-time job posting', 'বিজ্ঞাপন দেখে ফোনে ইন্টারভিউয়ের সময় চাওয়া', 'विज्ञापन हेरेर अन्तर्वार्ताका लागि फोन गर्ने', '주말 오후 아르바이트 구인공고', 'weekend afternoon job notice', 'উইকেন্ড বিকেলের আলবা বিজ্ঞাপন', 'सप्ताहन्त दिउँसोको कामको सूचना'],
      ['면접에서 자기소개와 경력 말하기', 'Introducing yourself & prior experience', 'ইন্টারভিউতে নিজের পরিচয় ও কাজের অভিজ্ঞতা বলা', 'अन्तर्वार्तामा परिचय र अनुभव बताउने', '한국어 소통 능력과 카페 근무 경험', 'Korean skill & cafe experience', 'কোরিয়ান দক্ষতা ও ক্যাফে কাজের অভিজ্ঞতা', 'कोरियन भाषा सीप र क्याफे अनुभव'],
      ['수업 시간표와 근무시간 조율하기', 'Aligning shifts with university classes', 'ক্লাস রুটিনের সাথে কাজের শিফট মিলিয়ে নেওয়া', 'कलेज रुटिनसँग कामको समय मिलाउने', '금요일 저녁과 토요일 종일 근무', 'Friday evening & Saturday shift', 'শুক্রবার সন্ধ্যা ও শনিবার ডিউটি', 'शुक्रबार साँझ र शनिबारको सिफ्ट'],
      ['식당 근무용 보건증 제출 확인', 'Confirming food-handler health card', 'রেস্তোরাঁয় কাজের হেলথ সার্টিফিকেট দেখানো', 'रेस्टुरेन्ट कामका लागि स्वास्थ्य कार्ड बुझाउने', '보건소에서 발급받은 보건증', 'public clinic health certificate', 'হেলথ সেন্টার থেকে নেওয়া সনদ', 'स्वास्थ्य केन्द्रबाट लिएको प्रमाणपत्र'],
      ['출입국 허가용 근로계약서 작성 요청', 'Asking manager to sign S-3 permit forms', 'ইমিগ্রেশন পারমিটের জন্য চুক্তিতে সই চাওয়া', 'अध्यागमन अनुमतिका लागि सम्झौता हस्ताक्षर अनुरोध', '표준근로계약서와 시간제취업 확인서', 'labor contract & S-3 work form', 'শ্রম চুক্তি ও পার্ট-টাইম ফর্ম', 'श्रम सम्झौता र पार्ट-टाइम फारम'],
    ],
  },
  {
    domainId: 'workplace_communication',
    order: 9,
    titleKo: '직장 및 근무지 의사소통',
    titleEn: 'Workplace Communication',
    titleBn: 'কর্মক্ষেত্র ও অফিসের যোগাযোগ',
    titleNe: 'कार्यस्थल संवाद र सहकार्य',
    level: 'Intermediate',
    placeKo: '회사 사무실 및 현장',
    staffKo: '팀장님',
    staffEn: 'Team Leader',
    staffBn: 'টিম লিডার',
    staffNe: 'टिम लिडर',
    vocab: [
      ['업무 지시사항', 'Work instructions', 'কাজের নির্দেশনা', 'कामको निर्देशन'],
      ['인수인계', 'Shift/task handover', 'কাজ বুঝিয়ে দেওয়া', 'काम हस्तान्तरण'],
      ['안전 수칙', 'Safety protocol', 'নিরাপত্তা নিয়মাবলি', 'सुरक्षा नियम'],
      ['일정 변경', 'Schedule adjustment', 'শিফট বা সময় পরিবর্তন', 'समय तालिका परिवर्तन'],
    ],
    situations: [
      ['첫 출근 인사 및 업무 배우기', 'First-day greeting & learning duties', 'কাজের প্রথম দিনে শুভেচ্ছা ও কাজ বুঝে নেওয়া', 'पहिलो दिन अभिवादन र काम सिक्ने', '오늘 배울 기본 업무 순서', 'today’s core duty sequence', 'আজকের মূল কাজের ধারাবাহিকতা', 'आज सिक्ने मुख्य कामको क्रम'],
      ['잘 못 알아들었을 때 정중히 재확인', 'Politely double-checking instructions', 'নির্দেশনা পরিষ্কার না বুঝলে ভদ্রভাবে আবার জিজ্ঞাসা করা', 'कुरा नबुझ्दा विनम्रतापूर्वक फेरि सोध्ने', '방금 말씀하신 작업 수량과 마감 시간', 'requested quantity & deadline', 'কাজের পরিমাণ ও শেষ সময়', 'कामको परिमाण र अन्तिम समय'],
      ['시험 기간 근무일 교대 요청하기', 'Requesting a shift swap during exams', 'পরীক্ষার সপ্তাহে শিফট পরিবর্তনের অনুরোধ করা', 'परीक्षा समयमा सिफ्ट साट्न अनुरोध गर्ने', '다음 주 화요일 근무 교대 요청', 'next Tuesday shift-swap request', 'আগামী মঙ্গলবার শিফট বদলের অনুরোধ', 'अर्को मंगलबार सिफ्ट साट्ने अनुरोध'],
      ['작업 중 기계 이상 즉시 보고하기', 'Immediately reporting equipment issue', 'মেশিনে সমস্যা দেখলে সাথে সাথে সুপারভাইজারকে জানানো', 'मेसिनमा समस्या आउँदा तुरुन्त रिपोर्ट गर्ने', '포장 기계 이상 소리와 안전 정지', 'machine noise & safety stop', 'মেশিনের অস্বাভাবিক শব্দ ও সেফটি স্টপ', 'मेसिनको आवाज र सुरक्षा बन्द'],
      ['퇴근 전 다음 근무자에게 인수인계', 'Handing over tasks before clocking out', 'ছুটির আগে পরের শিফটের কর্মীকে কাজ বুঝিয়ে দেওয়া', 'काम सकेर अर्को सिफ्टलाई बुझाउने', '재고 수량 확인과 마감 청소 완료', 'stock count & closing cleanup', 'স্টক হিসাব ও ক্লোজিং পরিষ্কার', 'स्टक गणना र सरसफाइ सम्पन्न'],
    ],
  },
  {
    domainId: 'salary_employment_issues',
    order: 10,
    titleKo: '급여 정산 및 근로 권익 상담',
    titleEn: 'Salary and Employment Issues',
    titleBn: 'বেতন হিসাব ও শ্রম অধিকার সমাধান',
    titleNe: 'तलब हिसाब र श्रम समस्या समाधान',
    level: 'Intermediate',
    placeKo: '인사팀 및 외국인력상담센터',
    staffKo: '노무 상담원',
    staffEn: 'Labor Counselor / HR Officer',
    staffBn: 'শ্রম পরামর্শক / এইচআর কর্মকর্তা',
    staffNe: 'श्रम परामर्शदाता / HR अधिकृत',
    vocab: [
      ['급여명세서', 'Monthly payslip', 'বেতন স্লিপ', 'तलब विवरण पत्र'],
      ['주휴수당', 'Weekly holiday allowance', 'সাপ্তাহিক ছুটির ভাতা', 'साप्ताहिक बिदा भत्ता'],
      ['임금 체불', 'Unpaid/delayed wages', 'বকেয়া বেতন', 'रोकिएको तलब'],
      ['퇴직금 정산', 'Severance pay settlement', 'চাকরি শেষের সেভারেন্স পে', 'अवकाश उपदान रकम'],
    ],
    situations: [
      ['급여명세서 공제 내역 문의하기', 'Checking tax & insurance deductions on payslip', 'বেতন স্লিপে ট্যাক্স ও বীমা কর্তনের হিসাব বোঝা', 'पे-स्लिपमा कर र बीमा कट्टी बुझ्ने', '이번 달 급여명세서 세금 공제 내역', 'this month tax deduction breakdown', 'এই মাসের ট্যাক্স কর্তনের বিবরণ', 'यस महिनाको कर कट्टी विवरण'],
      ['주 15시간 이상 근무 주휴수당 확인', 'Verifying weekly holiday pay (15h+ rule)', 'সপ্তাহে ১৫ ঘণ্টার বেশি কাজে সাপ্তাহিক ভাতা যাচাই', 'हप्तामा १५ घण्टाभन्दा बढी कामको भत्ता जाँच', '주 15시간 만근 주휴수당 지급액', 'weekly holiday allowance amount', 'সাপ্তাহিক ছুটির ভাতার পরিমাণ', 'साप्ताहिक बिदा भत्ता रकम'],
      ['야간 및 연장근로 수당 누락 문의', 'Asking about missing night-shift pay', 'রাতের শিফট বা ওভারটাইম ভাতা বাদ পড়লে জানানো', 'रात्रि तथा ओभरटाइम भत्ता छुटेकोमा सोधपुछ', '지난주 야간 연장근무 4시간 기록', '4 hours of night overtime record', 'গত সপ্তাহের ৪ ঘণ্টা নাইট ওভারটাইম হিসাব', 'गत हप्ताको ४ घण्टा रात्रि ओभरटाइम रेकर्ड'],
      ['1년 이상 근무 후 퇴직금 신청', 'Claiming severance pay after 1+ year work', '১ বছরের বেশি কাজ শেষে সেভারেন্স পে আবেদন', '१ वर्षभन्दा बढी कामपछिको उपदान आवेदन', '1년 이상 계속근로 퇴직금 정산서', '1-year+ severance settlement sheet', '১ বছর কাজের সেভারেন্স পে বিবরণী', '१ वर्ष कामपछिको उपदान विवरण'],
      ['임금 지연 시 노동청 상담 요청', 'Consulting Labor Office over delayed wages', 'বেতন বকেয়া হলে শ্রম অফিসে পরামর্শ নেওয়া', 'तलब ढिलो हुँदा श्रम कार्यालयमा परामर्श', '출퇴근 기록과 통장 입금내역 자료', 'attendance log & bank statement', 'হাজিরা রেকর্ড ও ব্যাংক স্টেটমেন্ট', 'हाजिरी रेकर्ड र बैंक स्टेटमेन्ट'],
    ],
  },
  {
    domainId: 'hospital_appointments',
    order: 11,
    titleKo: '병원 예약 및 의사 진료',
    titleEn: 'Hospital Appointments',
    titleBn: 'হাসপাতাল অ্যাপয়েন্টমেন্ট ও ডাক্তার দেখানো',
    titleNe: 'अस्पताल भेट र डाक्टर परामर्श',
    level: 'Elementary',
    placeKo: '병원 진료실 및 접수처',
    staffKo: '의사 선생님',
    staffEn: 'Doctor / Clinic Nurse',
    staffBn: 'ডাক্তার / নার্স',
    staffNe: 'डाक्टर / नर्स',
    vocab: [
      ['초진 접수', 'First-visit registration', 'প্রথমবার রোগী নিবন্ধন', 'पहिलो पटक नाम दर्ता'],
      ['건강보험 적용', 'NHIS insurance coverage', 'স্বাস্থ্য বীমা সুবিধা', 'स्वास्थ्य बीमा सुविधा'],
      ['증상 부위', 'Area of symptoms', 'শরীরে ব্যথার স্থান', 'लक्षण देखिएको भाग'],
      ['처방전 발급', 'Issuing prescription', 'প্রেসক্রিপশন প্রদান', 'प्रेस्क्रिप्सन जारी'],
    ],
    situations: [
      ['전화로 내과 진료 예약하기', 'Booking an internal-medicine visit by phone', 'ফোনে মেডিসিন ডাক্তারের অ্যাপয়েন্টমেন্ট নেওয়া', 'फोनबाट फिजिसियन भेट्ने समय लिने', '오늘 오후 세 시 내과 진료 예약', 'today 3 PM clinic appointment', 'আজ বিকেল ৩টায় ডাক্তার দেখানোর বুকিং', 'आज दिउँसो ३ बजेको क्लिनिक समय'],
      ['접수처에 외국인등록증 제출 및 초진 등록', 'Registering as a new patient with ARC', 'রিসেপশনে এআরসি কার্ড দেখিয়ে নাম লেখানো', 'रिसेप्सनमा ARC देखाएर नाम दर्ता गर्ने', '외국인등록증과 국민건강보험 조회', 'ARC card & NHIS check', 'এআরসি কার্ড ও স্বাস্থ্য বীমা যাচাই', 'ARC कार्ड र स्वास्थ्य बीमा जाँच'],
      ['감기 몸살 및 고열 증상 설명하기', 'Describing fever, chills, and sore throat', 'জ্বর, শরীর ব্যথা ও গলা ব্যথার লক্ষণ খুলে বলা', 'ज्वरो, जीउ दुख्ने र घाँटी दुखाइ बताउने', '어제 밤부터 열이 나고 목이 부은 증상', 'fever & swollen throat since last night', 'গত রাত থেকে জ্বর ও গলা ফোলার সমস্যা', 'हिजो रातिदेखि ज्वरो र घाँटी सुन्निएको लक्षण'],
      ['약 알레르기 유무 미리 알리기', 'Informing doctor about medicine allergies', 'ওষুধের অ্যালার্জি থাকলে আগে থেকেই জানানো', 'औषधि एलर्जीबारे डाक्टरलाई पहिले नै बताउने', '항생제 복용 시 피부 발진 알레르기', 'antibiotic skin-rash allergy', 'অ্যান্টিবায়োটিকে অ্যালার্জির তথ্য', 'एन्टिबायोटिक एलर्जी जानकारी'],
      ['보험 청구용 진료비 세부내역서 요청', 'Requesting itemized receipt for insurance', 'বীমা ক্লেইমের জন্য খরচের বিস্তারিত রসিদ চাওয়া', 'बीमा दाबीका लागि विस्तृत बिल माग्ने', '진료비 계산서·영수증과 세부내역서', 'medical receipt & itemized statement', 'চিকিৎসা রসিদ ও বিস্তারিত বিল', 'उपचार रसिद र विस्तृत विवरण'],
    ],
  },
  {
    domainId: 'pharmacy_conversations',
    order: 12,
    titleKo: '약국 처방조제 및 일반약 구매',
    titleEn: 'Pharmacy Conversations',
    titleBn: 'ফার্মেসিতে ওষুধ কেনা ও নিয়ম জানা',
    titleNe: 'फार्मेसीमा औषधि खरिद र सल्लाह',
    level: 'Beginner 2',
    placeKo: '동네 약국',
    staffKo: '약사님',
    staffEn: 'Pharmacist',
    staffBn: 'ফার্মাসিস্ট',
    staffNe: 'फार्मासिस्ट',
    vocab: [
      ['식후 30분', '30 minutes after meals', 'খাওয়ার ৩০ মিনিট পর', 'खाना खाएको ३० मिनेटपछि'],
      ['졸음 유발', 'May cause drowsiness', 'ঘুম ঘুম ভাব হতে পারে', 'निद्रा लाग्न सक्ने'],
      ['해열진통제', 'Fever & pain reliever', 'জ্বর ও ব্যথানাশক ওষুধ', 'ज्वरो र दुखाइ कम गर्ने औषधि'],
      ['연고 및 밴드', 'Ointment & bandages', 'মলম ও ব্যান্ডেজ', 'मलम र ब्यान्डेज'],
    ],
    situations: [
      ['병원 처방전 내고 조제약 받기', 'Submitting clinic prescription at pharmacy', 'হাসপাতালের প্রেসক্রিপশন দিয়ে ওষুধ নেওয়া', 'प्रेस्क्रिप्सन बुझाएर औषधि लिने', '방금 병원에서 받은 처방전', 'prescription just issued at clinic', 'হাসপাতাল থেকে পাওয়া প্রেসক্রিপশন', 'अस्पतालबाट पाएको प्रेस्क्रिप्सन'],
      ['하루 복용 횟수와 시간 확인하기', 'Checking daily dosage & meal timing', 'দিনে কয়বার ও কখন ওষুধ খেতে হবে তা জানা', 'दिनमा कति पटक र कहिले खाने जाँच्ने', '아침·점심·저녁 식후 30분 복용법', '3 times daily 30m after meals', 'সকাল-দুপুর-রাত খাওয়ার ৩০ মিনিট পর সেবন', 'बिहान-दिउँसो-बेलुका खानापछि ३० मिनेटमा खाने'],
      ['졸리지 않은 감기약 요청하기', 'Asking for non-drowsy cold medicine', 'ঘুম আসে না এমন সর্দির ওষুধ চাওয়া', 'निद्रा नलाग्ने रुघाको औषधि माग्ने', '수업 전에 먹을 졸리지 않는 코감기약', 'non-drowsy cold medicine before class', 'ক্লাসের আগে খাওয়ার ঘুমহীন সর্দির ওষুধ', 'कक्षाअघि खाने निद्रा नलाग्ने औषधि'],
      ['소화불량 및 속쓰림 약 구입하기', 'Buying indigestion & heartburn relief', 'বদহজম ও বুকজ্বালার ওষুধ কেনা', 'अपच र छाती पोल्ने औषधि किन्ने', '체했을 때 마시는 액상 소화제', 'liquid digestive medicine', 'বদহজমের তরল ওষুধ', 'अपच हुँदा पिउने झोल पाचन औषधि'],
      ['발목 삐었을 때 파스와 붕대 찾기', 'Getting pain patches & wrap for sprained ankle', 'পায়ের গোড়ালি মচকালে পেইন প্যাচ ও ব্যান্ডেজ কেনা', 'खुट्टा मर्किँदा पट्टी र ब्यान्डेज किन्ने', '시원한 쿨파스와 압박붕대', 'cooling relief patch & elastic bandage', 'ঠান্ডা কুল-প্যাচ ও ইলাস্টিক ব্যান্ডেজ', 'चिसो पेन-प्याच र इलास्टिक ब्यान्डेज'],
    ],
  },
  {
    domainId: 'police_station_communication',
    order: 13,
    titleKo: '경찰서 민원 및 분실·피해 신고',
    titleEn: 'Police Station Communication',
    titleBn: 'পুলিশ স্টেশনে জিডি ও সহায়তা চাওয়া',
    titleNe: 'प्रहरी चौकीमा निवेदन र सहायता',
    level: 'Pre-Intermediate',
    placeKo: '관할 경찰서 민원실',
    staffKo: '경찰관',
    staffEn: 'Police Officer',
    staffBn: 'পুলিশ কর্মকর্তা',
    staffNe: 'प्रहरी अधिकृत',
    vocab: [
      ['분실신고 접수증', 'Lost-item police report slip', 'হারানো জিডি কপি', 'हराएको प्रहरी निवेदन पुर्जी'],
      ['유실물 포털(LOST112)', 'LOST112 national portal', 'হারানো জিনিস খোঁজার সরকারি সাইট', 'हराएका सामान खोज्ने पोर्टल (LOST112)'],
      ['사이버 사기신고', 'Online scam police report', 'অনলাইন প্রতারণা মামলা', 'अनलाइन ठगी उजुरी'],
      ['통역 지원요청', 'Police interpreter assistance', 'পুলিশ দোভাষী সহায়তা', 'प्रहरी दोभाषे सहयोग'],
    ],
    situations: [
      ['여권 분실신고 접수증 발급받기', 'Filing lost passport report for embassy', 'দূতাবাসে নতুন পাসপোর্টের জন্য পুলিশ রিপোর্ট নেওয়া', 'दूतावासका लागि राहदानी हराएको पुर्जी लिने', '대사관 제출용 여권 분실신고 접수증', 'lost-passport slip for embassy', 'দূতাবাসে দেওয়ার পাসপোর্ট হারানোর সনদ', 'दूतावासमा बुझाउने राहदानी हराएको पुर्जी'],
      ['버스에 두고 내린 가방 조회 요청', 'Reporting bag left on a city bus', 'বাসে ফেলে আসা ব্যাগ উদ্ধারে সাহায্য চাওয়া', 'बसमा छुटेको झोला खोजिदिन अनुरोध', '버스 노선번호와 하차 시간 정보', 'bus route number & exit time', 'বাসের নম্বর ও নামার সময়', 'बस रुट नम्बर र ओर्लेको समय'],
      ['중고거래 사기 피해 접수하기', 'Reporting secondhand marketplace fraud', 'অনলাইন পুরাতন পণ্য কেনায় প্রতারণার অভিযোগ', 'अनलाइन किनबेच ठगी उजुरी दर्ता', '계좌이체 내역서와 대화 캡처 화면', 'transfer receipt & chat screenshots', 'টাকা পাঠানোর রসিদ ও চ্যাট স্ক্রিনশট', 'पैसा पठाएको रसिद र च्याट स्क्रिनसट'],
      ['보이스피싱 의심 전화 신고 상담', 'Reporting suspected voice-phishing call', 'ভয়েস ফিশিং প্রতারক কলের বিষয়ে পুলিশকে জানানো', 'भ्वाइस फिसिङ शंकास्पद फोनबारे जानकारी', '발신 전화번호와 계좌 지급정지 확인', 'caller number & account freeze check', 'কল নম্বর ও ব্যাংক অ্যাকাউন্ট ব্লক যাচাই', 'फोन नम्बर र बैंक खाता रोक्का जाँच'],
      ['범죄경력회보서 발급 절차 문의', 'Asking how to get background check certificate', 'পুলিশ ক্লিয়ারেন্স সনদ নেওয়ার নিয়ম জিজ্ঞাসা', 'प्रहरी चारित्रिक प्रमाणपत्र प्रक्रिया सोधपुछ', '비자 제출용 범죄경력회보서 발급', 'police clearance for visa filing', 'ভিসার জন্য পুলিশ ক্লিয়ারেন্স সনদ', 'भिसाका लागि प्रहरी चारित्रिक प्रमाणपत्र'],
    ],
  },
  {
    domainId: 'bank_account_opening',
    order: 14,
    titleKo: '은행 계좌 개설 및 금융 업무',
    titleEn: 'Bank Account Opening',
    titleBn: 'ব্যাংক অ্যাকাউন্ট খোলা ও লেনদেন',
    titleNe: 'बैंक खाता खोल्ने र बैंकिङ सेवा',
    level: 'Elementary',
    placeKo: '시중은행 외국인 창구',
    staffKo: '은행원',
    staffEn: 'Bank Teller',
    staffBn: 'ব্যাংক কর্মকর্তা',
    staffNe: 'बैंक कर्मचारी',
    vocab: [
      ['입출금 통장', 'Checking bankbook', 'সাধারণ ব্যাংক অ্যাকাউন্ট', 'चल्ती/बचत खाता'],
      ['후불교통 체크카드', 'Transit-enabled debit card', 'যাতায়াত সুবিধাসহ ডেবিট কার্ড', 'यातायात सुविधासहितको चेक कार्ड'],
      ['해외송금 지정등록', 'Overseas remittance registration', 'দেশে টাকা পাঠানোর ব্যাংক নিবন্ধন', 'रेमिट्यान्स बैंक दर्ता'],
      ['이체한도 상향', 'Raising transfer limit', 'ট্রান্সফার লিমিট বাড়ানো', 'ट्रान्सफर सीमा बढाउने'],
    ],
    situations: [
      ['유학생 입출금 통장 신규 개설', 'Opening a new student bank account', 'শিক্ষার্থী হিসেবে নতুন ব্যাংক অ্যাকাউন্ট খোলা', 'विद्यार्थीको नयाँ बैंक खाता खोल्ने', '외국인등록증·여권·재학증명서', 'ARC, passport & enrollment cert', 'এআরসি, পাসপোর্ট ও অধ্যয়ন সনদ', 'ARC, पासपोर्ट र अध्ययन प्रमाणपत्र'],
      ['교통카드 기능 있는 체크카드 신청', 'Applying for a debit card with transit chip', 'বাস-সাবওয়েতে চলে এমন ডেবিট কার্ড নেওয়া', 'बस-सबवे चल्ने डेबिट कार्ड आवेदन', '후불교통 기능이 포함된 체크카드', 'postpaid-transit check card', 'পোস্টপেইড ট্রানজিট চেক কার্ড', 'पोस्टपेड यातायात चेक कार्ड'],
      ['모바일뱅킹 앱 및 인증서 설정 도움', 'Setting up mobile banking & digital cert', 'মোবাইল ব্যাংকিং অ্যাপ ও সার্টিফিকেট সেটআপ করা', 'मोबाइल बैंकिङ एप र प्रमाणपत्र सेटअप', '스마트폰 뱅킹 앱과 금융인증서', 'banking app & financial certificate', 'ব্যাংকিং অ্যাপ ও ফিন্যান্সিয়াল সার্টিফিকেট', 'बैंकिङ एप र वित्तीय प्रमाणपत्र'],
      ['본국 가족에게 해외송금 방법 등록', 'Registering overseas remittance to home country', 'দেশে পরিবারের কাছে টাকা পাঠানোর সার্ভিস চালু করা', 'स्वदेशमा परिवारलाई पैसा पठाउने दर्ता', '수취인 영문 이름과 스위프트(SWIFT) 코드', 'recipient name & SWIFT code', 'প্রাপকের ইংরেজি নাম ও SWIFT কোড', 'प्रापकको नाम र SWIFT कोड'],
      ['근로계약서로 계좌 이체한도 해제하기', 'Lifting daily transfer limit with work contract', 'চাকরির চুক্তি দেখিয়ে অ্যাকাউন্টের লিমিট আনলক করা', 'श्रम सम्झौता देखाएर ट्रान्सफर सीमा खोल्ने', '급여이체 내역과 근로계약서 원본', 'salary history & labor contract', 'বেতন জমার বিবরণ ও শ্রম চুক্তি', 'तलब विवरण र श्रम सम्झौता'],
    ],
  },
  {
    domainId: 'mobile_phone_contracts',
    order: 15,
    titleKo: '휴대폰 개통 및 요금제 계약',
    titleEn: 'Mobile Phone Contracts',
    titleBn: 'মোবাইল সিম খোলা ও টেলিকম চুক্তি',
    titleNe: 'मोबाइल सिम र प्याकेज सम्झौता',
    level: 'Elementary',
    placeKo: '통신사 대리점',
    staffKo: '통신사 상담사',
    staffEn: 'Telecom Representative',
    staffBn: 'টেলিকম প্রতিনিধি',
    staffNe: 'टेलिकम प्रतिनिधि',
    vocab: [
      ['선불에서 후불 전환', 'Switching prepaid to postpaid', 'প্রিপেইড থেকে পোস্টপেইডে পরিবর্তন', 'प्रिपेडबाट पोस्टपेडमा रूपान्तरण'],
      ['본인인증(PASS)', 'Identity verification service', 'মোবাইল পরিচয় যাচাই (PASS)', 'मोबाइल पहिचान प्रमाणीकरण (PASS)'],
      ['무약정 알뜰요금제', 'No-contract budget plan', 'চুক্তিবিহীন সাশ্রয়ী প্ল্যান', 'सम्झौतारहित सस्तो प्याकेज'],
      ['자동이체 등록', 'Autopay bank linking', 'ব্যাংক অটো-পে যুক্ত করা', 'बैंक स्वतः भुक्तानी दर्ता'],
    ],
    situations: [
      ['외국인등록증 발급 후 본인명의 개통', 'Linking SIM to ARC for identity verification', 'এআরসি পাওয়ার পর নিজের নামে সিম নিবন্ধন করা', 'ARC पाएपछि आफ्नो नाममा सिम दर्ता गर्ने', '본인인증이 가능한 후불 유심 개통', 'postpaid SIM with identity verification', 'পরিচয় যাচাই সুবিধাসহ পোস্টপেইড সিম', 'पहिचान प्रमाणीकरण हुने पोस्टपेड सिम'],
      ['데이터 무제한 알뜰 요금제 비교', 'Comparing unlimited data plans', 'আনলিমিটেড ডাটার সাশ্রয়ী প্যাকেজ তুলনা করা', 'अनलिमिटेड डाटा प्याकेज तुलना गर्ने', '월 데이터 무제한 무약정 요금제', 'no-contract unlimited data plan', 'চুক্তিবিহীন আনলিমিটেড ডাটা প্ল্যান', 'सम्झौतारहित अनलिमिटेड डाटा प्याकेज'],
      ['여권 영문 이름 띄어쓰기 정확히 맞추기', 'Matching exact ARC name spacing for PASS auth', 'PASS ভেরিফিকেশনের জন্য এআরসি নামের বানান হুবহু মেলানো', 'PASS प्रमाणीकरणका लागि ARC नाम हुबहु मिलाउने', '외국인등록증과 동일한 영문 성명 표기', 'exact uppercase English name on ARC', 'এআরসি কার্ডের হুবহু ইংরেজি নাম', 'ARC कार्डको हुबहु अंग्रेजी नाम'],
      ['약정 위약금 및 해지 조건 확인하기', 'Checking contract period & early-cancel penalty', 'চুক্তির মেয়াদ ও আগে বাতিল করলে জরিমানা আছে কি না জানা', 'सम्झौता अवधि र रद्द गर्दा लाग्ने शुल्क जाँच', '선택약정 할인 기간과 해지 위약금', 'contract discount term & penalty', 'চুক্তি ছাড়ের মেয়াদ ও জরিমানা', 'छुट सम्झौता अवधि र जरिवाना'],
      ['휴대폰 분실 시 일시정지 신청하기', 'Temporarily suspending line when phone is lost', 'ফোন হারালে সিম সাময়িক বন্ধ রাখার অনুরোধ', 'फोन हराउँदा सिम अस्थायी बन्द गर्ने', '분실 정지 신청과 임대폰 안내', 'lost-line suspension & loaner phone', 'সিম লক ও বিকল্প ফোন নির্দেশনা', 'सिम रोक्का र अस्थायी फोन सेवा'],
    ],
  },
  {
    domainId: 'internet_utility_bills',
    order: 16,
    titleKo: '인터넷 설치 및 공과금 납부',
    titleEn: 'Internet and Utility Bills',
    titleBn: 'ইন্টারনেট সংযোগ ও গ্যাস-বিদ্যুৎ বিল পরিশোধ',
    titleNe: 'इन्टरनेट जडान र बिजुली/ग्यास बिल',
    level: 'Pre-Intermediate',
    placeKo: '고객센터 및 관리사무소',
    staffKo: '설치 기사님 / 상담원',
    staffEn: 'Service Technician / Agent',
    staffBn: 'টেকনিশিয়ান / কাস্টমার কেয়ার',
    staffNe: 'प्राविधिक / ग्राहक प्रतिनिधि',
    vocab: [
      ['도시가스 전입신청', 'City gas move-in connection', 'নতুন বাসায় গ্যাস সংযোগ চালু', 'नयाँ कोठामा ग्यास जडान'],
      ['전기요금 고지서', 'Electricity bill statement', 'বিদ্যুৎ বিলের কাগজ', 'बिजुली बिल विवरण'],
      ['가상계좌 이체', 'Virtual-account bill payment', 'ভার্চুয়াল অ্যাকাউন্টে বিল জমা', 'भर्चुअल खाताबाट बिल भुक्तानी'],
      ['이사 정산', 'Move-out meter settlement', 'বাসা ছাড়ার সময় মিটারের বিল চুকানো', 'कोठा छोड्दा मिटर हिसाब फरफारक'],
    ],
    situations: [
      ['자취방 와이파이 인터넷 설치 예약', 'Scheduling home Wi-Fi router installation', 'বাসায় ওয়াই-ফাই রাউটার বসানোর অ্যাপয়েন্টমেন্ট নেওয়া', 'कोठामा वाइफाइ जडान समय लिने', '토요일 오전 인터넷 및 공유기 설치', 'Saturday morning router install', 'শনিবার সকালে রাউটার সংযোগ', 'शनिबार बिहान राउटर जडान'],
      ['입주 날 도시가스 연결 신청하기', 'Connecting city gas stove/boiler on move-in day', 'বাসায় ওঠার দিন গ্যাসের সংযোগ চালু করানো', 'कोठा सर्ने दिन सहरी ग्यास जोड्ने', '도시가스 안전점검 및 밸브 연결', 'gas safety check & valve hookup', 'গ্যাস নিরাপত্তা পরীক্ষা ও সংযোগ', 'ग्यास सुरक्षा जाँच र भल्भ जडान'],
      ['전기·수도요금 모바일 고지서 신청', 'Switching utility bills to mobile e-billing', 'বিদ্যুৎ ও পানির বিল মোবাইলে পাওয়ার নিবন্ধন', 'बिजुली र पानी बिल मोबाइलमा मगाउने', '카카오톡 모바일 전자고지서 신청', 'mobile electronic bill registration', 'মোবাইল ই-বিল নিবন্ধন', 'मोबाइल विद्युतीय बिल दर्ता'],
      ['겨울철 난방비 폭탄 예방 문의', 'Asking tips to prevent high winter gas bills', 'শীতে অতিরিক্ত গ্যাস বিল কমানোর নিয়ম জানা', 'जाडोमा उच्च ग्यास बिल कम गर्ने उपाय सोध्ने', '보일러 외출 모드와 적정 실내온도 설정', 'boiler away-mode & optimal temp', 'বয়লার আউট-মোড ও সঠিক তাপমাত্রা', 'बोइलर आउट-मोड र उपयुक्त तापक्रम'],
      ['이사 당일 전기·가스 계량기 정산하기', 'Settling final meter readings on moving day', 'বাসা ছাড়ার দিন গ্যাস ও বিদ্যুৎ মিটারের হিসাব মেলানো', 'कोठा छोड्는 दिन मिटर रिडिङ हिसाब राफसाफ', '계량기 현재 숫자와 당일 요금 정산', 'current meter digits & final payment', 'মিটারের বর্তমান রিডিং ও চূড়ান্ত বিল', 'मिटरको हालको अंक र अन्तिम बिल'],
    ],
  },
  {
    domainId: 'public_transportation',
    order: 17,
    titleKo: '지하철·버스·기차 대중교통 이용',
    titleEn: 'Public Transportation',
    titleBn: 'সাবওয়ে, বাস ও KTX গণপরিবহন ব্যবহার',
    titleNe: 'सबवे, बस र रेल सार्वजनिक यातायात',
    level: 'Beginner 1',
    placeKo: '지하철역 및 버스터미널',
    staffKo: '역무원 / 버스기사님',
    staffEn: 'Station Staff / Driver',
    staffBn: 'স্টেশন কর্মী / চালক',
    staffNe: 'स्टेसन कर्मचारी / चालक',
    vocab: [
      ['교통카드 충전기', 'Transit card top-up machine', 'টি-মানি কার্ড রিচার্জ মেশিন', 'यातायात कार्ड रिचार्ज मेसिन'],
      ['환승 방향', 'Transfer platform direction', 'ট্রান্সফার প্ল্যাটফর্মের দিক', 'ट्रान्सफर प्लेटफर्म दिशा'],
      ['하차 태그', 'Tap card when getting off', 'নামার সময় কার্ড ছোঁয়ানো', 'ओर्लँदा कार्ड छुवाउने'],
      ['KTX 승차권', 'KTX train ticket', 'KTX ট্রেনের টিকিট', 'KTX रेल टिकट'],
    ],
    situations: [
      ['편의점·역에서 티머니 카드 충전하기', 'Topping up T-money card at station', 'স্টেশন বা দোকানে টি-মানি কার্ডে টাকা ভরা', 'स्टेसन वा पसलमा टी-मनी कार्ड रिचार्ज गर्ने', '교통카드 이만 원 현금 충전', '20,000 KRW cash card recharge', '২০,০০০ ওন ক্যাশ রিচার্জ', '२०,০০० वोन नगद रिचार्ज'],
      ['반대편 승강장으로 잘못 들어갔을 때', 'Crossing to the opposite subway platform', 'ভুল দিকের প্ল্যাটফর্মে ঢুকে পড়লে পার হওয়ার গেট চাওয়া', 'उल्टो प्लेटफर्ममा पर्दा अर्कोतर्फ जाने गेट सोध्ने', '반대 방향 승강장 비상게이트 이동', 'opposite-platform transfer gate', 'বিপরীত প্ল্যাটফর্মে যাওয়ার গেট', 'विपरीत प्लेटफर्म जाने गेट'],
      ['버스가 목적지에 가는지 기사님께 확인', 'Asking driver if the bus stops at destination', 'বাসটি কাঙ্ক্ষিত গন্তব্যে যাবে কি না চালককে জিজ্ঞাসা করা', 'बस गन्तव्यमा जान्छ कि जाँदैन चालकलाई सोध्ने', '대학교 정문 정류장 정차 여부', 'stopping at university main gate', 'বিশ্ববিদ্যালয়ের মেইন গেটে থামা', 'विश्वविद्यालय मूल गेटमा रोकिने/नरोकिने'],
      ['서울역에서 부산행 KTX 창가석 예매', 'Booking a window seat on KTX to Busan', 'সিউল স্টেশন থেকে বুসানগামী KTX ট্রেনের জানালার সিট কাটা', 'सोल स्टेसनबाट बुसान जाने KTX झ्यालको सिट किन्ने', '오전 열 시 부산행 KTX 일반실 창가 좌석', '10 AM Busan KTX window seat', 'সকাল ১০টার বুসান KTX জানালার সিট', 'बिहान १० बजे बुसान KTX झ्यालको सिट'],
      ['택시 기사님께 도로명 주소 보여드리기', 'Showing road-name address to taxi driver', 'ট্যাক্সি চালককে ফোনে সঠিক রাস্তার ঠিকানা দেখানো', 'ट्याक्सी चालकलाई सडक ठेगाना देखाउने', '지도 앱에 표시된 정확한 도로명 주소', 'exact road address on map app', 'ম্যাপ অ্যাপে দেখানো সঠিক ঠিকানা', 'नक्सा एपमा देखाइएको सही ठेगाना'],
    ],
  },
  {
    domainId: 'restaurants_cafes',
    order: 18,
    titleKo: '식당 주문 및 카페 이용',
    titleEn: 'Restaurants and Cafes',
    titleBn: 'রেস্তোরাঁয় খাবার অর্ডার ও ক্যাফে ব্যবহার',
    titleNe: 'रेस्टुरेन्ट र क्याफेमा अर्डर',
    level: 'Beginner 1',
    placeKo: '한국 식당 및 카페',
    staffKo: '식당·카페 직원',
    staffEn: 'Server / Barista',
    staffBn: 'রেস্তোরাঁ/ক্যাফে কর্মী',
    staffNe: 'रेस्टुरेन्ट/क्याफे कर्मचारी',
    vocab: [
      ['매장 식사 / 포장', 'For here / To go', 'বসে খাওয়া / পার্সেল নেওয়া', 'यहीँ खाने / प्याक गरी लैजाने'],
      ['돼지고기 빼고', 'Without pork', 'শূকরের মাংস ছাড়া', 'बंगुरको मासु नराखी'],
      ['덜 맵게', 'Less spicy, please', 'কম ঝাল করে', 'अलि कम पिरो बनाएर'],
      ['반찬 리필', 'Side-dish refill', 'সাইড ডিশ আবার নেওয়া', 'साइड-डिस थप्ने'],
    ],
    situations: [
      ['돼지고기·햄 없는 메뉴 확인하고 주문하기', 'Checking pork-free ingredients before ordering', 'শূকরের মাংস বা হ্যাম ছাড়া হালাল/নিরাপদ খাবার অর্ডার করা', 'पोर्क वा ह्याम नभएको परिकार सोधेर अर्डर गर्ने', '고기가 안 들어간 야채비빔밥 주문', 'meat-free vegetable bibimbap order', 'মাংস ছাড়া ভেজিটেবল বিবিমবাপ অর্ডার', 'मासुरहित भेज बिबिम्बाप अर्डर'],
      ['음식을 덜 맵게 조리해 달라고 부탁하기', 'Asking for mild spice level', 'খাবার কম ঝাল করে রান্না করার অনুরোধ করা', 'खाना कम पिरो बनाइदिन अनुरोध गर्ने', '덜 맵게 조리 요청과 물 추가', 'less-spicy request & extra water', 'কম ঝাল করার অনুরোধ ও পানি চাওয়া', 'कम पिरो अनुरोध र पानी थप्ने'],
      ['카페에서 개인 텀블러 할인 받고 테이크아웃', 'Using personal tumbler for cafe takeout discount', 'ক্যাফেতে নিজের টিম্বলারে কফি নিয়ে ডিসকাউন্ট পাওয়া', 'क्याफेमा आफ्नै टम्बलरमा कफी राखी छुट लिने', '따뜻한 카페라떼 텀블러 포장 할인', 'hot latte in personal tumbler', 'নিজের ফ্লাস্কে গরম লাতে কফি', 'आफ्नै बोतलमा तातो क्याफे लात्ते'],
      ['키오스크에서 반찬 추가 및 분할 결제 문의', 'Using self-order kiosk & splitting the bill', 'কিওস্কে অর্ডার ও বন্ধুদের সাথে আলাদা কার্ডে বিল দেওয়া', 'किओस्क अर्डर र छुट्टाछुट्टै कार्डबाट बिल तिर्ने', '두 장의 카드로 각각 절반씩 분할 결제', 'splitting payment across two cards', 'দুইটি কার্ডে অর্ধেক করে বিল পেমেন্ট', 'दुई कार्डबाट आधा-आधा बिल भुक्तानी'],
      ['남은 음식 포장 용기 부탁하기', 'Asking for a takeout box for leftover food', 'বেঁচে যাওয়া খাবার বাসায় নেওয়ার বক্স চাওয়া', 'बाँकी खाना प्याक गर्ने बट्टा माग्ने', '남은 음식 가져갈 포장 용기와 봉투', 'takeout container & bag', 'খাবার নেওয়ার বক্স ও ব্যাগ', 'बाँकी खाना राख्ने बट्टा र झोला'],
    ],
  },
  {
    domainId: 'shopping_returns',
    order: 19,
    titleKo: '쇼핑, 사이즈 교환 및 환불',
    titleEn: 'Shopping and Returns',
    titleBn: 'কেনাকাটা, সাইজ পরিবর্তন ও রিফান্ড',
    titleNe: 'किनमेल, साइज साटफेर र रकम फिर्ता',
    level: 'Beginner 2',
    placeKo: '백화점 및 마트 고객센터',
    staffKo: '매장 직원',
    staffEn: 'Sales Associate',
    staffBn: 'দোকানের বিক্রয়কর্মী',
    staffNe: 'पसल कर्मचारी',
    vocab: [
      ['교환 및 환불 기간', 'Exchange & refund window', 'বদলানো ও টাকা ফেরতের সময়সীমা', 'साटफेर र फिर्ता अवधि'],
      ['결제한 카드와 영수증', 'Payment card & receipt', 'পেমেন্ট করা কার্ড ও রসি드', 'भुक्तानी कार्ड र रसिद'],
      ['한 치수 큰 사이즈', 'One size larger', 'এক সাইজ বড় মাপ', 'एक साइज ठूलो नाप'],
      ['불량 상품', 'Defective product', 'ত্রুটিপূর্ণ পণ্য', 'बिग्रेको/दोषपूर्ण सामान'],
    ],
    situations: [
      ['옷 피팅룸 이용 및 큰 사이즈 문의', 'Trying clothes on & asking for a bigger size', 'ট্রায়াল রুমে পরে দেখে এক সাইজ বড় পোশাক চাওয়া', 'ट्रायल रुम प्रयोग र ठूलो साइज सोध्ने', '한 치수 더 큰 라지(L) 사이즈 재고', 'stock in one size larger (L)', 'এক সাইজ বড় (L) স্টক যাচাই', 'एक साइज ठूलो (L) स्टक जाँच'],
      ['영수증 지참하여 7일 이내 환불 요청', 'Requesting a full refund within 7 days with receipt', 'রসিদ ও কার্ড দেখিয়ে ৭ দিনের মধ্যে টাকা ফেরত নেওয়া', 'रसिद र कार्ड देखाई ७ दिनभित्र रकम फिर्ता लिने', '어제 구매한 영수증과 결제했던 체크카드', 'yesterday receipt & payment card', 'গতকালের রসিদ ও পেমেন্ট কার্ড', 'हिजोको रसिद र भुक्तानी कार्ड'],
      ['전자제품 초기 불량 무상 교환하기', 'Exchanging a defective electronic item', 'নতুন কেনা ইলেকট্রনিক পণ্য কাজ না করলে বদলে নেওয়া', 'किन्दा नै बिग्रेको विद्युतीय सामान साट्ने', '전원이 켜지지 않는 초기 불량 이어폰', 'earbuds with power defect', 'চালু না হওয়া ত্রুটিপূর্ণ ইয়ারফোন', 'अन नहुने दोषपूर्ण इयरफोन'],
      ['마트에서 원플러스원 행사 적용 확인', 'Verifying 1+1 promo discount at checkout', 'কাউন্টারে ১+१ অফারের ছাড় ঠিকমতো হয়েছে কি না দেখা', 'काउन्टरमा १+१ छुट लागू भए/नभएको हेर्ने', '원플러스원 행사 대상 세제 상품', '1+1 promotional detergent item', '১+১ অফারের ডিটারজেন্ট পণ্য', '१+१ अफरको सर्फ सामान'],
      ['면세점 세금환급(Tax Refund) 서류 받기', 'Requesting tax-free slip for visiting family', 'ভ্রমণে আসা পরিবারের জন্য ট্যাক্স রিফান্ড স্লিপ নেওয়া', 'भ्रमणमा आएका आफन्तका लागि ट्याक्स रिफन्ड पुर्जी लिने', '여권 제시 및 사후면세 환급 영수증', 'passport & tax-refund receipt', 'পাসপোর্ট প্রদর্শন ও ট্যাক্স রিফান্ড রসিদ', 'पासपोर्ट र कर फिर्ता रसिद'],
    ],
  },
  {
    domainId: 'parcel_delivery',
    order: 20,
    titleKo: '택배 발송, 수령 및 반품',
    titleEn: 'Parcel Delivery',
    titleBn: 'পার্সেল পাঠানো, ডেলিভারি গ্রহণ ও রিটার্ন',
    titleNe: 'पार्सल पठाउने, बुझ्ने र फिर्ता गर्ने',
    level: 'Elementary',
    placeKo: '우체국·편의점 택배 및 현관',
    staffKo: '택배 기사님 / 우체국 직원',
    staffEn: 'Courier / Postal Clerk',
    staffBn: 'ডেলিভারি কর্মী / পোস্ট অফিস কর্মী',
    staffNe: 'डेलिभरी राइडर / हुलाक कर्मचारी',
    vocab: [
      ['운송장 번호', 'Tracking waybill number', 'ট্র্যাকিং নম্বর', 'ट्र्याकिङ नम्बर'],
      ['문 앞에 놓아 주세요', 'Please leave at the front door', 'দরজার সামনে রেখে দিন', 'ढोका अगाडि राखिदिनुहोस्'],
      ['무인 택배보관함', 'Unmanned parcel locker', 'পার্সেল লকার বক্স', 'स्वचालित पार्सल लकर'],
      ['국제특급우편(EMS)', 'EMS international express mail', 'আন্তর্জাতিক ইএমএস ডাক', 'अन्तर्राष्ट्रिय द्रुत हुलाक (EMS)'],
    ],
    situations: [
      ['부재 시 공동현관 비밀번호 안내하기', 'Texting courier lobby code when away', 'বাসায় না থাকলে ডেলিভারি কর্মীকে দরজার সামনে রাখতে বলা', 'बाहिर हुँदा पार्सल ढोका अगाडि राख्न सन्देश पठाउने', '공동현관 출입방법과 문 앞 배송 요청', 'lobby entry & front-door drop-off', 'গেটে ঢোকার কোড ও দরজার সামনে রাখা', 'गेट कोड र ढोका अगाडि डेलिभरी अनुरोध'],
      ['편의점 무인택배기로 국내 택배 보내기', 'Sending domestic parcel at convenience store', 'কনভিনিয়েন্স স্টোরের মেশিনে কোরিয়ায় পার্সেল পাঠানো', 'कन्भिनियन्स स्टोर मेसिनबाट पार्सल पठाउने', '상자 무게 측정과 운송장 스티커 부착', 'box weighing & waybill label', 'বক্সের ওজন মাপা ও স্টিকার লাগানো', 'तौल जोख्ने र ट्र्याकिङ स्टिकर टाँस्ने'],
      ['우체국에서 본국으로 EMS 소포 발송하기', 'Shipping an EMS box home at the Post Office', 'পো스트 অফিস থেকে দেশে পরিবারের কাছে ইএমএস বক্স পাঠানো', 'हुलाकबाट स्वदेशमा EMS पार्सल पठाउने', '내용물 영문 기입과 항공 EMS 요금 결제', 'English item list & air EMS fee', 'পন্যের ইংরেজি তালিকা ও ইএমএস ফি', 'सामानको अंग्रेजी विवरण र EMS शुल्क'],
      ['오배송된 택배 고객센터에 문의하기', 'Reporting a misdelivered package', 'পার্সেল ভুল ঠিকানায় গেলে কাস্টমার সেন্টারে জানানো', 'गलत ठाउँमा गएको पार्सल खोज्न सम्पर्क गर्ने', '배송 완료 사진 확인과 오배송 위치 조회', 'delivery photo check & location lookup', 'ডেলিভারির ছবি ও সঠিক অবস্থান যাচাই', 'डेलिभरी फोटो र स्थान जाँच'],
      ['온라인 쇼핑 반품 수거 택배 내놓기', 'Preparing a return parcel for courier pickup', 'অনলাইন শপিংয়ের রিটার্ন পার্সেল প্যাকেট করে বাইরে রাখা', 'फिर्ता गर्ने सामान प्याक गरी बाहिर राख्ने', '반품 스티커 표기와 현관 앞 수거 요청', 'return label & door pickup', 'রিটার্ন লিখে দরজার সামনে রাখা', 'फिर्ता स्टिकर टाँसी ढोकामा राख्ने'],
    ],
  },
  {
    domainId: 'korean_driving_situations',
    order: 21,
    titleKo: '한국 운전면허 및 도로 운전 상황',
    titleEn: 'Korean Driving Situations',
    titleBn: 'কোরিয়ায় ড্রাইভিং লাইসেন্স ও রাস্তার পরিস্থিতি',
    titleNe: 'कोरियामा ड्राइभिङ र सडक अवस्था',
    level: 'Intermediate',
    placeKo: '운전면허시험장 및 도로',
    staffKo: '면허시험장 직원 / 보험출동기사',
    staffEn: 'License Officer / Roadside Assist',
    staffBn: 'লাইসেন্স কর্মকর্তা / রোডসাইড কর্মী',
    staffNe: 'लाइसेन्स अधिकृत / सडक सहायता प्राविधिक',
    vocab: [
      ['학과 필기시험', 'Written traffic-law test', 'লিখিত ট্রাফিক পরীক্ষা', 'लिखित ट्राफिक परीक्षा'],
      ['어린이 보호구역(30km)', 'School zone 30km/h limit', 'স্কুল জোন ৩০ কিমি গতিসীমা', 'विद्यालय क्षेत्र ३० कि.मि. गति सीमा'],
      ['우회전 일시정지', 'Mandatory stop before right turn', 'ডানে মোড় নেওয়ার আগে থামা নিয়ম', 'दायाँ मोड्नुअघि पूर्ण रोकिने नियम'],
      ['블랙박스 영상', 'Dashcam video footage', 'ড্যাশক্যামের ভিডিও রেকর্ড', 'ड्यासक्याम भिडियो फुटेज'],
    ],
    situations: [
      ['다국어 운전면허 필기시험 접수하기', 'Registering for multilingual written driving test', 'ইংরেজি বা বহুভাষায় ড্রাইভিং লিখিত পরীক্ষায় নাম লেখানো', 'बहुभाषिक लिखित ड्राइभिङ परीक्षा दर्ता', '신체검사와 영문 학과시험 응시 접수', 'vision exam & English written test', 'চোখ পরীক্ষা ও লিখিত পরীক্ষার আবেদন', 'आँखा जाँच र लिखित परीक्षा दर्ता'],
      ['본국 운전면허증을 한국 면허로 교환 문의', 'Exchanging home-country license for Korean license', 'নিজ দেশের লাইসেন্স বদলে কোরিয়ান লাইসেন্স নেওয়ার নিয়ম জানা', 'स्वदेशी लाइसेन्स साटेर कोरियन बनाउने प्रक्रिया', '대사관 공증 면허증과 출입국사실증명서', 'embassy-verified license & entry record', 'দূতাবাস প্রত্যয়িত লাইসেন্স ও ভ্রমণ সনদ', 'दूतावास प्रमाणित लाइसेन्स र प्रवेश रेकर्ड'],
      ['렌터카 대여 시 종합보험 가입 확인', 'Checking full-coverage insurance on rental car', 'গাড়ি ভাড়া নেওয়ার সময় পূর্ণাঙ্গ বীমা ও আগে থাকা দাগ মিলিয়ে দেখা', 'भाडाको गाडी लिँदा पूर्ण बीमा र बाहिरी अवस्था जाँच्ने', '렌터카 자차 완전자차 보험과 외관 사진 촬영', 'full collision waiver & exterior photos', 'পূর্ণ গাড়ি বীমা ও বাইরের ছবি তোলা', 'पूर्ण गाडी बीमा र बाहिरी फोटो खिच्ने'],
      ['주유소 셀프 주유 및 타이어 공기압 점검', 'Using self-service gas pump & tire air check', 'সেলফ-সার্ভিস পেট্রোল পাম্পে তেল নেওয়া ও চাকার হাওয়া দেখা', 'सेल्फ-सर्भिस पम्पमा तेल हाल्ने र टायर हावा जाँच्ने', '휘발유·경유 유종 확인과 시동 끄고 주유', 'checking gasoline vs diesel & engine off', 'পেট্রোল/ডিজেল যাচাই ও ইঞ্জিন বন্ধ রাখা', 'पेट्रोल/डिजेल जाँच र इन्जिन बन्द गरी तेल हाल्ने'],
      ['접촉사고 발생 시 비상등 켜고 보험사 부르기', 'Handling minor road collision & calling insurer', 'গাড়িতে হালকা ধাক্কা লাগলে ইমার্জেন্সি লাইট জ্বালিয়ে বীমা কোম্পানিকে ডাকা', 'सामान्य ठक्कर हुँदा इमर्जेन्सी बत्ती बाली बीमा बोलाउने', '비상등 점등과 자동차보험 긴급출동 접수', 'hazard lights on & roadside claim call', 'ইমার্জেন্সি লাইট ও বীমা ইমার্জেন্সি কল', 'इमर्जेन्सी बत्ती र बीमा सडक सहायता फोन'],
    ],
  },
  {
    domainId: 'emergency_situations',
    order: 22,
    titleKo: '119·112·1345 긴급 위기 대처',
    titleEn: 'Emergency Situations',
    titleBn: '১১৯·১১২·১৩৪৫ জরুরি বিপদ ও সংকট মোকাবিলা',
    titleNe: '११९·११२·१३४५ आपतकालीन अवस्था व्यवस्थापन',
    level: 'Elementary',
    placeKo: '긴급 신고 상황실 및 현장',
    staffKo: '119·1345 긴급상담원',
    staffEn: 'Emergency Dispatcher',
    staffBn: 'জরুরি কন্ট্রোল রুম কর্মকর্তা',
    staffNe: 'आपतकालीन सहायता अपरेटर',
    vocab: [
      ['구급차 요청(119)', 'Requesting 119 ambulance', '১১৯ অ্যাম্বুলেন্স ডাকা', '११९ एम्बुलेन्स बोलाउने'],
      ['현재 정확한 위치', 'Exact current location', 'বর্তমান সঠিক অবস্থান', 'हालको सही स्थान'],
      ['3자 통역 연결', '3-way interpreter call', 'তিন-পক্ষীয় দোভাষী কল', 'त्रिपक्षीय दोभाषे सेवा'],
      ['계좌 지급정지', 'Emergency bank freeze', 'জরুরি অ্যাকাউন্ট লক', 'आपतकालीन खाता रोक्का'],
    ],
    situations: [
      ['119에 전화해 응급환자 구급차 부르기', 'Calling 119 for a sudden medical emergency', 'হঠাৎ কেউ অসুস্থ হলে ১১৯ নম্বরে কল করে অ্যাম্বুলেন্স ডাকা', 'अचानक बिरामी पर्दा ११९ मा फोन गरी एम्बुलेन्स बोलाउने', '친구가 갑자기 쓰러져 호흡이 힘든 응급상황', 'friend collapsed with breathing trouble', 'বন্ধু হঠাৎ অজ্ঞান হয়ে শ্বাসকষ্ট হওয়া', 'साथी अचानक बेहोस भई सास फेर्न गाह्रो भएको अवस्था'],
      ['건물 화재 발견 시 119 신고 및 대피하기', 'Reporting building fire & evacuating safely', 'আগুন বা ধোঁয়া দেখলে ১১৯-এ কল দিয়ে সিঁড়ি দিয়ে বের হওয়া', 'आगलागी देख्दा ११९ मा खबर गरी सुरक्षित बाहिर निस्कने', '건물 3층 복도 연기와 정확한 도로명 주소', '3rd-floor smoke & exact street address', '৩য় তলায় ধোঁয়া ও রাস্তার সঠিক ঠিকানা', 'तेस्रो तल्लामा धुवाँ र सही सडक ठेगाना'],
      ['보이스피싱 송금 직후 은행 지급정지 요청', 'Freezing bank transfer immediately after scam', 'প্রতারকের অ্যাকাউন্টে টাকা চলে গেলে সাথে সাথে পেমেন্ট ব্লক করা', 'ठगी थाहा पाउने बित्तिकै बैंक खाता रोक्का गराउने', '피해 발생 즉시 계좌 지급정지 긴급신청', 'immediate fraud-account freeze request', 'তাৎক্ষণিক অ্যাকাউন্ট লক আবেদন', 'तुरुन्त बैंक खाता रोक्का निवेदन'],
      ['심야 현관 도어락 고장 시 긴급 출동 요청', 'Calling 24h locksmith when digital lock fails', 'গভীর রাতে দরজার ডিজিটাল লক কাজ না করলে মিস্ত্রি ডাকা', 'राति ढोकाको डिजिटल लक बिग्रँदा प्राविधिक बोलाउने', '도어락 배터리 방전과 비상 개문 요청', 'dead keypad battery & emergency unlock', 'লকের ব্যাটারি শেষ ও জরুরি আনলক', 'लकको ब्याट्री सकिएर ढोका खोल्ने अनुरोध'],
      ['1345 외국인종합안내센터 3자 통역 도움받기', 'Using 1345 3-way interpretation in an emergency', 'ভাষা বুঝতে সমস্যা হলে ১৩৪৫ হেল্পলাইনের দোভাষী সেবা নেওয়া', 'भाषा समस्या पर्दा १३४५ को त्रिपक्षीय दोभाषे सेवा लिने', '벵골어·네팔어·영어 3자 통역 연결 서비스', 'Bengali/Nepali/English 3-way interpreter', 'বাংলা/নেপালি/ইংরেজি দোভাষী সংযোগ সেবা', 'बंगाली/नेपाली/अंग्रेजी त्रिपक्षीय दोभाषे सेवा'],
    ],
  },
];

// 4 realistic communicative registers per situation (5 situations * 4 registers = 20 episodes per domain * 22 domains = 440 scenario episodes!)
const EPISODE_REGISTERS: Array<{
  tagKo: string;
  tagEn: string;
  tagBn: string;
  tagNe: string;
  politeOpeningKo: string;
  politeOpeningEn: string;
  politeOpeningBn: string;
  politeOpeningNe: string;
  followUpKo: (itemKo: string) => string;
  followUpEn: (itemEn: string) => string;
  followUpBn: (itemBn: string) => string;
  followUpNe: (itemNe: string) => string;
  closingStaffKo: (itemKo: string) => string;
  closingStaffEn: (itemEn: string) => string;
  closingStaffBn: (itemBn: string) => string;
  closingStaffNe: (itemNe: string) => string;
}> = [
  {
    tagKo: '기본 방문 상담',
    tagEn: 'In-Person Desk Inquiry',
    tagBn: 'সরাসরি কাউন্টারে যোগাযোগ',
    tagNe: 'प्रत्यक्ष काउन्टर सोधपुछ',
    politeOpeningKo: '안녕하세요, 처음 방문했는데 도움 좀 받을 수 있을까요?',
    politeOpeningEn: 'Hello, this is my first visit—could I get some assistance?',
    politeOpeningBn: 'হ্যালো, আমি প্রথমবার এসেছি—একটু সাহায্য পেতে পারি কি?',
    politeOpeningNe: 'नमस्ते, म पहिलो पटक आएको हुँ—केही सहयोग पाउन सक्छु कि?',
    followUpKo: item => `네, 여기 ${item} 준비해 왔습니다. 확인 부탁드립니다.`,
    followUpEn: item => `Yes, I brought ${item} right here. Please check it for me.`,
    followUpBn: item => `হ্যাঁ, এই যে আমি ${item} সাথে নিয়ে এসেছি। দয়া করে যাচাই করুন।`,
    followUpNe: item => `हजुर, मैले यहाँ ${item} तयार ल्याएको छु। कृपया जाँच गरिदिनुहोस्।`,
    closingStaffKo: item => `${item} 확인이 모두 끝났습니다. 오른쪽 창구에서 안내받으세요.`,
    closingStaffEn: item => `Verification of ${item} is all complete. Please proceed to the desk on the right.`,
    closingStaffBn: item => `${item} যাচাই সম্পন্ন হয়েছে। ডানপাশের কাউন্টারে নির্দেশনা নিন।`,
    closingStaffNe: item => `${item} को जाँच पूरा भयो। कृपया दायाँतर्फको काउन्टरमा जानुहोस्।`,
  },
  {
    tagKo: '전화 사전 문의',
    tagEn: 'Advance Phone Call',
    tagBn: 'আগে থেকে ফোনে জিজ্ঞাসা',
    tagNe: 'पूर्व फोन सोधपुछ',
    politeOpeningKo: '여보세요, 외국인 유학생인데 전화로 먼저 여쭤봐도 될까요?',
    politeOpeningEn: 'Hello, I am an international student—may I ask first by phone?',
    politeOpeningBn: 'হ্যালো, আমি একজন আন্তর্জাতিক শিক্ষার্থী—ফোনে আগে একটু জিজ্ঞাসা করতে পারি কি?',
    politeOpeningNe: 'हेलो, म अन्तर्राष्ट्रिय विद्यार्थी हुँ—फोनबाट पहिले सोध्न मिल्छ कि?',
    followUpKo: item => `방문하기 전에 ${item} 외에 더 필요한 것이 있나요?`,
    followUpEn: item => `Before I visit, do I need anything else besides ${item}?`,
    followUpBn: item => `সরাসরি যাওয়ার আগে ${item} ছাড়া আর কিছু লাগবে কি?`,
    followUpNe: item => `आउनुअघि ${item} बाहेक अरू केही आवश्यक पर्छ कि?`,
    closingStaffKo: item => `아니요, 신분증하고 ${item}만 지참하시면 바로 처리됩니다.`,
    closingStaffEn: item => `No, if you just bring your ID and ${item}, it will be processed right away.`,
    closingStaffBn: item => `না, পরিচয়পত্র এবং ${item} সাথে আনলেই সাথে সাথে কাজ হয়ে যাবে।`,
    closingStaffNe: item => `पर्दैन, परिचयपत्र र ${item} मात्र ल्याउनुभए तुरुन्तै काम हुन्छ।`,
  },
  {
    tagKo: '문제 해결 및 재확인',
    tagEn: 'Problem Solving & Follow-Up',
    tagBn: 'সমস্যা সমাধান ও পুনরায় যাচাই',
    tagNe: 'समस्या समाधान र पुनः जाँच',
    politeOpeningKo: '죄송하지만 방금 안내받은 내용 중에 다시 확인할 부분이 있어서요.',
    politeOpeningEn: 'Excuse me, there is a detail from earlier that I need to double-check.',
    politeOpeningBn: 'দুঃখিত, একটু আগে জানানো তথ্যের একটি বিষয় পুনরায় নিশ্চিত হতে চাই।',
    politeOpeningNe: 'माफ गर्नुहोला, अघिको जानकारीमध्ये एउटा कुरा फेरि पक्का गर्नु थियो।',
    followUpKo: item => `${item} 부분에 오류가 없는지 한 번만 더 봐 주시겠어요?`,
    followUpEn: item => `Could you look one more time to see if there is any error in ${item}?`,
    followUpBn: item => `${item} অংশে কোনো ভুল আছে কি না আরেকবার একটু দেখে দেবেন কি?`,
    followUpNe: item => `${item} मा कुनै त्रुटि छ कि छैन एकपटक फेरि हेरिदिनुहुन्छ कि?`,
    closingStaffKo: item => `미리 말씀해 주셔서 감사합니다. ${item} 내용을 정확히 수정해 드렸습니다.`,
    closingStaffEn: item => `Thank you for letting us know early. We have accurately updated ${item}.`,
    closingStaffBn: item => `আগে জানানোর জন্য ধন্যবাদ। আপনার ${item} সঠিকভাবে সংশোধন করে দিয়েছি।`,
    closingStaffNe: item => `अगाडि नै भनिदिनुभएकोमा धन्यवाद। हामीले ${item} सही रूपमा सच्याइदियौँ।`,
  },
  {
    tagKo: '모바일·온라인 처리 안내',
    tagEn: 'Mobile App / Online Procedure',
    tagBn: 'মোবাইল অ্যাপ ও অনলাইনে সম্পন্ন করা',
    tagNe: 'मोबाइल एप / अनलाइन प्रक्रिया',
    politeOpeningKo: '실례합니다, 이 업무를 스마트폰 앱이나 온라인으로도 신청할 수 있나요?',
    politeOpeningEn: 'Excuse me, can I also submit this via smartphone app or online?',
    politeOpeningBn: 'ক্ষমা করবেন, এই কাজটি কি স্মার্টফোন অ্যাপ বা অনলাইনেও আবেদন করা যায়?',
    politeOpeningNe: 'माफ गर्नुहोला, यो काम स्मार्टफोन एप वा अनलाइनबाट पनि गर्न सकिन्छ?',
    followUpKo: item => `온라인 화면에서 ${item} 항목은 어떻게 업로드하면 되나요?`,
    followUpEn: item => `On the online screen, how should I upload or enter ${item}?`,
    followUpBn: item => `অনলাইন স্ক্রিনে ${item} অংশটি কীভাবে আপলোড বা পূরণ করব?`,
    followUpNe: item => `अनलाइन स्क्रिनमा ${item} कसरी अपलोड वा प्रविष्ट गर्ने हो?`,
    closingStaffKo: item => `선명하게 사진을 찍어서 ${item} 칸에 첨부하시면 접수 완료 문자가 갑니다.`,
    closingStaffEn: item => `Take a clear photo and attach it to the ${item} field, and you will get a confirmation SMS.`,
    closingStaffBn: item => `পরিষ্কার ছবি তুলে ${item} ঘরে যুক্ত করলেই সম্পন্ন হওয়ার এসএমএস পাবেন।`,
    closingStaffNe: item => `स्पष्ट फोटो खिचेर ${item} ठाउँमा अपलोड गर्नुभए दर्ता पूरा भएको SMS आउँछ।`,
  },
];

let cachedScenarios20x: RealLifeScenario20x[] | null = null;

/**
 * Generates 447 Complete Tri-Lingual Real-Life Korea Scenarios & Conversation Lessons
 * covering all 22 required Korea life domains (20X+ expansion over the original 20 baseline!).
 */
export function getRealLifeScenarios20x(): RealLifeScenario20x[] {
  if (cachedScenarios20x) return cachedScenarios20x;

  const scenarios: RealLifeScenario20x[] = [];

  // 1. Preserve all 7 original DAILY_CONVERSATION_LESSONS mapped into scenarios first
  DAILY_CONVERSATION_LESSONS.forEach(conv => {
    const dialogueTurns: ScenarioDialogueTurn[] = conv.lines.map(line => ({
      speakerKo: line.speaker,
      speakerRoleEn: line.speakerLabelEn,
      speakerRoleBn: line.speakerLabelBn,
      speakerRoleNe: line.speakerLabelEn,
      korean: line.korean,
      pronunciationBn: line.bengaliPron || toBengaliPronunciation(line.korean),
      pronunciationNe: toNepaliPronunciation(line.korean),
      romanization: toRomanization(line.korean),
      meaningBn: line.bengaliMeaning,
      meaningNe: `${conv.titleEn}: ${line.englishMeaning}`,
      meaningEn: line.englishMeaning,
    }));

    const firstLine = conv.lines[0];
    const secondLine = conv.lines[1] || conv.lines[0];

    scenarios.push({
      id: conv.id,
      domainId: 'restaurants_cafes',
      domainOrder: 0,
      domainTitleEn: 'Core Everyday Conversations',
      domainTitleBn: 'মূল দৈনন্দিন কথোপকথন',
      domainTitleNe: 'मुख्य दैनिक संवाद',
      titleKo: conv.categoryTagKo,
      titleEn: conv.titleEn,
      titleBn: conv.titleBn,
      titleNe: `${conv.categoryTagKo} — ${conv.titleEn}`,
      level: 'Beginner 1',
      settingEn: conv.situationEn,
      settingBn: conv.situationBn,
      settingNe: `दैनिक संवाद सन्दर्भ: ${conv.situationEn}`,
      keyVocab: conv.keyPhrases.slice(0, 4).map(kp => ({
        korean: kp.korean,
        pronBn: kp.bengaliPron || toBengaliPronunciation(kp.korean),
        pronNe: toNepaliPronunciation(kp.korean),
        romanization: toRomanization(kp.korean),
        en: kp.englishMeaning,
        bn: kp.bengaliMeaning,
        ne: kp.englishMeaning,
      })),
      dialogue: dialogueTurns,
      practiceExercise: {
        questionEn: `In "${conv.titleEn}", what is the natural Korean response after "${firstLine.korean}"?`,
        questionBn: `"${conv.titleBn}" কথোপকথনে "${firstLine.korean}" এর পর স্বাভাবিক উত্তর কোনটি?`,
        questionNe: `"${conv.titleEn}" संवादमा "${firstLine.korean}" पछि उपयुक्त कोरियन जवाफ कुन हो?`,
        options: [
          secondLine.korean,
          '여권 분실신고를 하러 왔습니다.',
          '보일러 전원이 켜지지 않습니다.',
          '우회전 시 일시정지해야 합니다.',
        ],
        correctIndex: 0,
        explanationEn: `"${secondLine.korean}" (${secondLine.englishMeaning}) directly answers the speaker in this setting.`,
        explanationBn: `"${secondLine.korean}" (${secondLine.bengaliMeaning}) হলো এই পরিস্থিতির সঠিক উত্তর।`,
        explanationNe: `"${secondLine.korean}" (${secondLine.englishMeaning}) यस सन्दर्भको सही जवाफ हो।`,
      },
      published: true,
      reviewStatus: 'approved',
    });
  });

  // 2. Expand across all 22 Required Real-Life Korea Domains (22 * 5 * 4 = 440 episodes -> 447 total!)
  let seq = 1;
  TWENTY_TWO_KOREA_DOMAINS.forEach(dom => {
    dom.situations.forEach(([sKo, sEn, sBn, sNe, itemKo, itemEn, itemBn, itemNe], sIdx) => {
      EPISODE_REGISTERS.forEach((reg, rIdx) => {
        const staffAskKo = `네, 안녕하세요. ${sKo} 관련이시군요. 혹시 ${itemKo} 준비되셨나요?`;
        const staffAskEn = `Hello! I see this is regarding ${sEn.toLowerCase()}. Did you prepare ${itemEn}?`;
        const staffAskBn = `হ্যালো! বুঝতে পেরেছি এটি ${sBn} সংক্রান্ত। আপনার কাছে কি ${itemBn} প্রস্তুত আছে?`;
        const staffAskNe = `नमस्ते! यो ${sNe} सम्बन्धी रहेछ। के तपाईंसँग ${itemNe} तयार छ?`;

        const userLine1Ko = `${reg.politeOpeningKo} ${sKo} 때문에 문의드렸습니다.`;
        const userLine1En = `${reg.politeOpeningEn} I am inquiring about ${sEn.toLowerCase()}.`;
        const userLine1Bn = `${reg.politeOpeningBn} আমি ${sBn} বিষয়ে জানতে চাই।`;
        const userLine1Ne = `${reg.politeOpeningNe} म ${sNe} को विषयमा बुझ्न चाहन्छु।`;

        const userLine2Ko = reg.followUpKo(itemKo);
        const userLine2En = reg.followUpEn(itemEn);
        const userLine2Bn = reg.followUpBn(itemBn);
        const userLine2Ne = reg.followUpNe(itemNe);

        const staffLine2Ko = reg.closingStaffKo(itemKo);
        const staffLine2En = reg.closingStaffEn(itemEn);
        const staffLine2Bn = reg.closingStaffBn(itemBn);
        const staffLine2Ne = reg.closingStaffNe(itemNe);

        const turns: ScenarioDialogueTurn[] = [
          {
            speakerKo: '유학생/외국인',
            speakerRoleEn: 'Learner (You)',
            speakerRoleBn: 'শিক্ষার্থী / প্রবাসী (আপনি)',
            speakerRoleNe: 'सिकारु (तपाईं)',
            korean: userLine1Ko,
            pronunciationBn: toBengaliPronunciation(userLine1Ko),
            pronunciationNe: toNepaliPronunciation(userLine1Ko),
            romanization: toRomanization(userLine1Ko),
            meaningBn: userLine1Bn,
            meaningNe: userLine1Ne,
            meaningEn: userLine1En,
          },
          {
            speakerKo: dom.staffKo,
            speakerRoleEn: dom.staffEn,
            speakerRoleBn: dom.staffBn,
            speakerRoleNe: dom.staffNe,
            korean: staffAskKo,
            pronunciationBn: toBengaliPronunciation(staffAskKo),
            pronunciationNe: toNepaliPronunciation(staffAskKo),
            romanization: toRomanization(staffAskKo),
            meaningBn: staffAskBn,
            meaningNe: staffAskNe,
            meaningEn: staffAskEn,
          },
          {
            speakerKo: '유학생/외국인',
            speakerRoleEn: 'Learner (You)',
            speakerRoleBn: 'শিক্ষার্থী / প্রবাসী (আপনি)',
            speakerRoleNe: 'सिकारु (तपाईं)',
            korean: userLine2Ko,
            pronunciationBn: toBengaliPronunciation(userLine2Ko),
            pronunciationNe: toNepaliPronunciation(userLine2Ko),
            romanization: toRomanization(userLine2Ko),
            meaningBn: userLine2Bn,
            meaningNe: userLine2Ne,
            meaningEn: userLine2En,
          },
          {
            speakerKo: dom.staffKo,
            speakerRoleEn: dom.staffEn,
            speakerRoleBn: dom.staffBn,
            speakerRoleNe: dom.staffNe,
            korean: staffLine2Ko,
            pronunciationBn: toBengaliPronunciation(staffLine2Ko),
            pronunciationNe: toNepaliPronunciation(staffLine2Ko),
            romanization: toRomanization(staffLine2Ko),
            meaningBn: staffLine2Bn,
            meaningNe: staffLine2Ne,
            meaningEn: staffLine2En,
          },
        ];

        const wrongDomains = TWENTY_TWO_KOREA_DOMAINS.filter(d => d.domainId !== dom.domainId);
        const distractorItems = [
          wrongDomains[(dom.order + sIdx) % wrongDomains.length].situations[0][4],
          wrongDomains[(dom.order + sIdx + 5) % wrongDomains.length].situations[1][4],
          wrongDomains[(dom.order + sIdx + 11) % wrongDomains.length].situations[2][4],
        ];

        scenarios.push({
          id: `scen20x-${dom.domainId}-${sIdx + 1}-${rIdx + 1}`,
          domainId: dom.domainId,
          domainOrder: dom.order,
          domainTitleEn: dom.titleEn,
          domainTitleBn: dom.titleBn,
          domainTitleNe: dom.titleNe,
          titleKo: `${sKo} (${reg.tagKo})`,
          titleEn: `${sEn} — ${reg.tagEn}`,
          titleBn: `${sBn} — ${reg.tagBn}`,
          titleNe: `${sNe} — ${reg.tagNe}`,
          level: dom.level,
          settingEn: `${dom.placeKo} · Practical Korea dialogue for ${sEn.toLowerCase()} (${reg.tagEn}).`,
          settingBn: `${dom.placeKo} · কোরিয়ায় বাস্তব জীবনে ${sBn} (${reg.tagBn}) পরিস্থিতির কথোপকথন।`,
          settingNe: `${dom.placeKo} · कोरियाको वास्तविक जीवनमा ${sNe} (${reg.tagNe}) संवाद अभ्यास।`,
          keyVocab: [
            {
              korean: itemKo,
              pronBn: toBengaliPronunciation(itemKo),
              pronNe: toNepaliPronunciation(itemKo),
              romanization: toRomanization(itemKo),
              en: itemEn,
              bn: itemBn,
              ne: itemNe,
            },
            ...dom.vocab.map(([vk, ve, vb, vn]) => ({
              korean: vk,
              pronBn: toBengaliPronunciation(vk),
              pronNe: toNepaliPronunciation(vk),
              romanization: toRomanization(vk),
              en: ve,
              bn: vb,
              ne: vn,
            })),
          ],
          dialogue: turns,
          practiceExercise: {
            questionEn: `In this "${dom.titleEn}" situation (${sEn}), which key Korean item/phrase is essential?`,
            questionBn: `"${dom.titleBn}" (${sBn}) পরিস্থিতিতে নিচের কোন কোরিয়ান শব্দগুচ্ছটি সবচেয়ে প্রয়োজনীয়?`,
            questionNe: `"${dom.titleNe}" (${sNe}) अवस्थामा तलका मध्ये कुन कोरियन पदावली आवश्यक पर्छ?`,
            options: [itemKo, ...distractorItems],
            correctIndex: 0,
            explanationEn: `"${itemKo}" means "${itemEn}", which is directly required in ${sEn.toLowerCase()}.`,
            explanationBn: `"${itemKo}" অর্থ "${itemBn}", যা ${sBn} সম্পন্ন করতে সরাসরি প্রয়োজন।`,
            explanationNe: `"${itemKo}" को अर्थ "${itemNe}" हो, जुन ${sNe} मा प्रत्यक्ष प्रयोग हुन्छ।`,
          },
          published: true,
          reviewStatus: 'approved',
        });
        seq++;
      });
    });
  });

  void seq;
  cachedScenarios20x = scenarios;
  return scenarios;
}

export const SCENARIO_DOMAINS_22_LIST = TWENTY_TWO_KOREA_DOMAINS.map(d => ({
  domainId: d.domainId,
  order: d.order,
  titleKo: d.titleKo,
  titleEn: d.titleEn,
  titleBn: d.titleBn,
  titleNe: d.titleNe,
  level: d.level,
}));
