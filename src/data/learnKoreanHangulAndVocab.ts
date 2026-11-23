import { LearningExplanationLang } from '../utils/hangulPhonetics';

export type QuadLangText = {
  en: string;
  bn: string;
  ne: string;
  ur: string;
};

export function pickLearnLang(lang: LearningExplanationLang, text: QuadLangText): string {
  if (lang === 'bn') return text.bn || text.en;
  if (lang === 'ne') return text.ne || text.en;
  if (lang === 'ur') return text.ur || text.en;
  return text.en;
}

export type LearningStageId = 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4' | 'stage_5';

export interface LearningStageInfo {
  id: LearningStageId;
  stageNumber: number;
  title: QuadLangText;
  subtitle: QuadLangText;
  topics: string[];
  recommendedModules: string[];
}

export const LEARNING_STAGES_5: LearningStageInfo[] = [
  {
    id: 'stage_1',
    stageNumber: 1,
    title: {
      en: 'Stage 1 — Hangul Foundation',
      bn: 'ধাপ ১ — হানগুল ভিত্তি (Hangul Foundation)',
      ne: 'चरण १ — हंगुल आधार (Hangul Foundation)',
      ur: 'مرحلہ 1 — ہنگُل کی بنیاد (Hangul Foundation)',
    },
    subtitle: {
      en: 'Vowels, Consonants, Syllable Formation, Reading & Writing Hangul',
      bn: 'স্বরবর্ণ, ব্যঞ্জনবর্ণ, সিলেবল গঠন, হানগুল পড়া ও লেখা',
      ne: 'स्वर, व्यञ्जन, अक्षर संरचना, हंगुल पढाइ र लेखाइ',
      ur: 'حروفِ علت، حروفِ صحیح، سلیبل بنانا، ہنگُل پڑھنا اور لکھنا',
    },
    topics: ['10 Basic Vowels', '11 Compound Vowels', '14 Basic Consonants', '5 Double Consonants', 'Syllable Blocks & Batchim', 'Hangul Stroke Tracing'],
    recommendedModules: ['hangul', 'writing', 'daily'],
  },
  {
    id: 'stage_2',
    stageNumber: 2,
    title: {
      en: 'Stage 2 — Beginner Korean',
      bn: 'ধাপ ২ — বিগিনার কোরিয়ান (Beginner Korean)',
      ne: 'चरण २ — प्रारम्भिक कोरियन (Beginner Korean)',
      ur: 'مرحلہ 2 — ابتدائی کورین (Beginner Korean)',
    },
    subtitle: {
      en: 'Greetings, Basic Vocabulary, Numbers, Simple Sentences & Daily Conversations',
      bn: 'শুভেচ্ছা বিনিময়, মৌলিক শব্দভাণ্ডার, সংখ্যা, সহজ বাক্য ও দৈনন্দিন কথোপকথন',
      ne: 'अभिवादन, आधारभूत शब्दावली, संख्या, सरल वाक्य र दैनिक संवाद',
      ur: 'سلام و آداب، بنیادی الفاظ، گنتی، سادہ جملے اور روزمرہ گفتگو',
    },
    topics: ['Greetings & Introductions', 'Native & Sino-Korean Numbers', '이다/아니다 & 은/는/이/가', 'Present Tense -아요/-어요', 'Everyday Survival Dialogues'],
    recommendedModules: ['vocabulary', 'grammar', 'speaking', 'everyday'],
  },
  {
    id: 'stage_3',
    stageNumber: 3,
    title: {
      en: 'Stage 3 — Elementary Korean',
      bn: 'ধাপ ৩ — এলিমেন্টারি কোরিয়ান (Elementary Korean)',
      ne: 'चरण ३ — प्राथमिक कोरियन (Elementary Korean)',
      ur: 'مرحلہ 3 — بنیادی کورین (Elementary Korean)',
    },
    subtitle: {
      en: 'Essential Grammar, Listening, Reading, Speaking & Student Life in Korea',
      bn: 'প্রয়োজনীয় ব্যাকরণ, লিসেনিং, রিডিং, স্পিকিং এবং কোরিয়ায় ছাত্রজীবন',
      ne: 'आवश्यक व्याकरण, सुनाइ, पढाइ, बोलाइ र कोरियामा विद्यार्थी जीवन',
      ur: 'ضروری گرامر، سننے، پڑھنے، بولنے کی مشق اور کوریا میں طالب علم کی زندگی',
    },
    topics: ['Past & Future Tenses', 'University & Dormitory Life', 'Subway, Bus & Shopping', 'Short Stories & Campus Notices', 'TOPIK I Level 1–2 Readiness'],
    recommendedModules: ['grammar', 'listening', 'reading', 'everyday', 'topik'],
  },
  {
    id: 'stage_4',
    stageNumber: 4,
    title: {
      en: 'Stage 4 — Intermediate Korean',
      bn: 'ধাপ ৪ — ইন্টারমিডিয়েট কোরিয়ান (Intermediate Korean)',
      ne: 'चरण ४ — मध्यम कोरियन (Intermediate Korean)',
      ur: 'مرحلہ 4 — درمیانی درجے کی کورین (Intermediate Korean)',
    },
    subtitle: {
      en: 'Complex Sentences, University & Workplace Communication, Reading Passages & Writing',
      bn: 'জটিল বাক্য গঠন, বিশ্ববিদ্যালয় ও কর্মক্ষেত্রের যোগাযোগ, অনুচ্ছেদ পঠন ও লিখন',
      ne: 'जटिल वाक्य, विश्वविद्यालय र कार्यस्थल संवाद, अनुच्छेद पढाइ र लेखाइ',
      ur: 'پیچیدہ جملے، یونیورسٹی اور دفتر میں بات چیت، عبارت فہمی اور تحریر',
    },
    topics: ['Causal & Contrastive Connectors', 'Talking to Professors & Employers', 'Hospital, Banking & Immigration', 'Paragraph & Email Writing', 'TOPIK II Level 3–4'],
    recommendedModules: ['grammar', 'reading', 'writing', 'topik', 'everyday'],
  },
  {
    id: 'stage_5',
    stageNumber: 5,
    title: {
      en: 'Stage 5 — Advanced Korean',
      bn: 'ধাপ ৫ — অ্যাডভান্সড কোরিয়ান (Advanced Korean)',
      ne: 'चरण ५ — उच्च कोरियन (Advanced Korean)',
      ur: 'مرحلہ 5 — اعلیٰ درجے کی کورین (Advanced Korean)',
    },
    subtitle: {
      en: 'Academic Korean, TOPIK II Preparation, Essay Writing & Full Mock Tests',
      bn: 'একাডেমিক কোরিয়ান, TOPIK II প্রস্তুতি, প্রবন্ধ লিখন এবং পূর্ণাঙ্গ মক টেস্ট',
      ne: 'शैक्षिक कोरियन, TOPIK II तयारी, निबन्ध लेखन र पूर्ण नमुना परीक्षा',
      ur: 'تعلیمی کورین، TOPIK II کی تیاری، مضمون نویسی اور مکمل موک ٹیسٹ',
    },
    topics: ['Advanced Academic Grammar', 'News & Research Articles', 'TOPIK II Tasks 51–54 Essays', 'Full Timed TOPIK II Simulations', 'Professional Interviews'],
    recommendedModules: ['topik', 'writing', 'reading', 'grammar'],
  },
];

export interface HangulVowelItem {
  char: string;
  type: 'basic' | 'compound';
  nameKo: string;
  romanization: string;
  soundExplanation: QuadLangText;
  mouthTip: QuadLangText;
  strokeCount: number;
  strokeOrderSteps: string[];
  examples: Array<{
    wordKo: string;
    romanization: string;
    meaning: QuadLangText;
  }>;
}

export const HANGUL_VOWELS_21: HangulVowelItem[] = [
  // 10 Basic Vowels
  {
    char: 'ㅏ',
    type: 'basic',
    nameKo: '아',
    romanization: 'a',
    soundExplanation: {
      en: 'Open "ah" sound as in "father".',
      bn: 'বাংলা "আ" ধ্বনির মতো স্পষ্ট উচ্চারণ (যেমন: আম)।',
      ne: 'नेपाली "आ" ध्वनि जस्तै स्पष्ट उच्चारण (जस्तै: आमा)।',
      ur: 'اردو کے الف مدہ "آ" کی طرح کھلی آواز (جیسے: عام)۔',
    },
    mouthTip: {
      en: 'Open your mouth wide and keep your tongue low and relaxed.',
      bn: 'মুখ প্রশস্তভাবে খুলে জিহ্বা নিচে স্বাভাবিক রাখুন।',
      ne: 'मुख फराकिलो पारेर जिब्रो तल सहज राख्नुहोस्।',
      ur: 'منہ کو کھلا رکھیں اور زبان کو نیچے آرام دہ حالت میں رکھیں۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Top-to-bottom vertical line (ㅣ)', '2. Short horizontal stroke to the right (ㅏ)'],
    examples: [
      { wordKo: '아이', romanization: 'ai', meaning: { en: 'Child', bn: 'শিশু', ne: 'बच्चा', ur: 'بچہ' } },
      { wordKo: '아버지', romanization: 'abeoji', meaning: { en: 'Father', bn: 'বাবা', ne: 'बुबा', ur: 'والد' } },
    ],
  },
  {
    char: 'ㅑ',
    type: 'basic',
    nameKo: '야',
    romanization: 'ya',
    soundExplanation: {
      en: '"ya" sound as in "yard".',
      bn: 'বাংলা "ইয়া" ধ্বনির মতো (যেমন: ইয়াকুব)।',
      ne: 'नेपाली "या" ध्वनि जस्तै (जस्तै: यात्रा)।',
      ur: 'اردو کے "یا" کی آواز (جیسے: یاد)۔',
    },
    mouthTip: {
      en: 'Start from a quick "y" glide and open quickly into "ah".',
      bn: 'দ্রুত "ই" থেকে শুরু করে মুখ খুলে "আ" বলুন।',
      ne: 'छिटो "य" बाट सुरु गरी मुख खोलेर "आ" भन्नुहोस्।',
      ur: 'ہلکی سی "ی" کی آواز سے شروع کر کے فوراً "آ" پر کھولیں۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Vertical line down', '2. Upper short right stroke', '3. Lower short right stroke'],
    examples: [
      { wordKo: '야구', romanization: 'yagu', meaning: { en: 'Baseball', bn: 'বেসবল', ne: 'बेसबल', ur: 'بیس بال' } },
      { wordKo: '약국', romanization: 'yakguk', meaning: { en: 'Pharmacy', bn: 'ফার্মেসি / ওষুধের দোকান', ne: 'औषधि पसल', ur: 'فارمیسی / دواخانہ' } },
    ],
  },
  {
    char: 'ㅓ',
    type: 'basic',
    nameKo: '어',
    romanization: 'eo',
    soundExplanation: {
      en: 'Relaxed "uh / aw" sound as in "song" or "up" with rounded throat.',
      bn: 'বাংলা স্বরবর্ণ "অ"-এর মতো উচ্চারণ (যেমন: অনেক)।',
      ne: 'नेपाली "अ" ध्वनि जस्तै (जस्तै: अब)।',
      ur: 'انگریزی لفظ "up" یا ہلکی "او/اَ" کی درمیانی آواز۔',
    },
    mouthTip: {
      en: 'Drop your jaw slightly more than "o" without rounding your lips.',
      bn: 'ঠোঁট গোল না করে চোয়াল সামান্য নিচে নামিয়ে "অ" উচ্চারণ করুন।',
      ne: 'ओठ गोलो नबनाई बंगारा हल्का तल झारेर "अ" उच्चारण गर्नुहोस्।',
      ur: 'ہونٹوں کو گول کیے بغیر جبڑے کو ہلکا سا نیچے گرا کر ادا کریں۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Short horizontal stroke left-to-right', '2. Vertical line top-to-bottom'],
    examples: [
      { wordKo: '어머니', romanization: 'eomeoni', meaning: { en: 'Mother', bn: 'মা', ne: 'आमा', ur: 'والدہ / ماں' } },
      { wordKo: '어디', romanization: 'eodi', meaning: { en: 'Where', bn: 'কোথায়', ne: 'कहाँ', ur: 'کہاں' } },
    ],
  },
  {
    char: 'ㅕ',
    type: 'basic',
    nameKo: '여',
    romanization: 'yeo',
    soundExplanation: {
      en: '"yuh / yeo" sound as in "young".',
      bn: 'বাংলা "ইয়" ধ্বনির মতো।',
      ne: 'नेपाली "य" ध्वनि जस्तै।',
      ur: 'انگریزی لفظ "young" کے شروع کی طرح "یَو" کی آواز۔',
    },
    mouthTip: {
      en: 'Glide from "y" directly into the relaxed "eo" vowel.',
      bn: '"ই" থেকে দ্রুত "অ" ধ্বনিতে যান (ঠোঁট গোল করবেন না)।',
      ne: '"इ" बाट सीधै "अ" ध्वनिमा जानुहोस्।',
      ur: '"ی" سے شروع کر کے بغیر ہونٹ گول کیے "اَ/او" کی آواز نکالیں۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Upper short horizontal stroke', '2. Lower short horizontal stroke', '3. Vertical line down'],
    examples: [
      { wordKo: '여행', romanization: 'yeohaeng', meaning: { en: 'Travel', bn: 'ভ্রমণ', ne: 'यात्रा', ur: 'سفر / سیاحت' } },
      { wordKo: '여름', romanization: 'yeoreum', meaning: { en: 'Summer', bn: 'গ্রীষ্মকাল', ne: 'गर्मी मौसम', ur: 'موسمِ گرما' } },
    ],
  },
  {
    char: 'ㅗ',
    type: 'basic',
    nameKo: '오',
    romanization: 'o',
    soundExplanation: {
      en: 'Pure rounded "oh" sound as in "go".',
      bn: 'বাংলা "ও" ধ্বনির মতো ঠোঁট গোল করে উচ্চারণ।',
      ne: 'नेपाली "ओ" ध्वनि जस्तै ओठ गोलो पारेर उच्चारण।',
      ur: 'ہونٹوں کو گول کر کے خالص "او" کی آواز (جیسے: بولو)۔',
    },
    mouthTip: {
      en: 'Round your lips firmly forward into a small circle.',
      bn: 'ঠোঁট দুটো সামনের দিকে গোল করে "ও" বলুন।',
      ne: 'ओठलाई अगाडि सानो गोलो बनाएर "ओ" भन्नुहोस्।',
      ur: 'اپنے ہونٹوں کو آگے کی طرف چھوٹا گول دائرہ بنا کر ادا کریں۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Short vertical stroke down', '2. Long horizontal base line left-to-right'],
    examples: [
      { wordKo: '오늘', romanization: 'oneul', meaning: { en: 'Today', bn: 'আজ', ne: 'आज', ur: 'آج' } },
      { wordKo: '오이', romanization: 'oi', meaning: { en: 'Cucumber', bn: 'শসা', ne: 'काँक्रो', ur: 'کھیرا' } },
    ],
  },
  {
    char: 'ㅛ',
    type: 'basic',
    nameKo: '요',
    romanization: 'yo',
    soundExplanation: {
      en: '"yo" sound as in "yoga".',
      bn: 'বাংলা "ইয়ো" ধ্বনির মতো।',
      ne: 'नेपाली "यो" ध्वनि जस्तै (जस्तै: योग)।',
      ur: 'اردو میں "یو" کی آواز (جیسے: یوگا)۔',
    },
    mouthTip: {
      en: 'Start with "y" and round your lips immediately into "o".',
      bn: '"ই" থেকে শুরু করে ঠোঁট গোল করে "ও" বলুন।',
      ne: '"य" बाट सुरु गरी ओठ गोलो पारेर "ओ" भन्नुहोस्।',
      ur: '"ی" سے شروع کر کے ہونٹ گول کرتے ہوئے "یو" کہیں۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Left short vertical stroke', '2. Right short vertical stroke', '3. Long horizontal line'],
    examples: [
      { wordKo: '요리', romanization: 'yori', meaning: { en: 'Cooking', bn: 'রান্না', ne: 'खाना पकाउने काम', ur: 'کھانا پکانا' } },
      { wordKo: '금요일', romanization: 'geumyoil', meaning: { en: 'Friday', bn: 'শুক্রবার', ne: 'शुक्रबार', ur: 'جمعہ' } },
    ],
  },
  {
    char: 'ㅜ',
    type: 'basic',
    nameKo: '우',
    romanization: 'u',
    soundExplanation: {
      en: '"oo" sound as in "moon".',
      bn: 'বাংলা "উ" ধ্বনির মতো (যেমন: উট)।',
      ne: 'नेपाली "उ" ध्वनि जस्तै (जस्तै: उपहार)।',
      ur: 'اردو میں پیش والی "اُو" کی آواز (جیسے: پھول)۔',
    },
    mouthTip: {
      en: 'Push your lips forward in a tight rounded shape.',
      bn: 'ঠোঁট সামনের দিকে গোল করে "উ" উচ্চারণ করুন।',
      ne: 'ओठ अगाडि गोलो पारेर "उ" उच्चारण गर्नुहोस्।',
      ur: 'ہونٹوں کو آگے کی طرف گول کر کے "اُو" ادا کریں۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Long horizontal line left-to-right', '2. Short vertical stroke downward'],
    examples: [
      { wordKo: '우유', romanization: 'uyu', meaning: { en: 'Milk', bn: 'দুধ', ne: 'दूध', ur: 'دودھ' } },
      { wordKo: '우산', romanization: 'usan', meaning: { en: 'Umbrella', bn: 'ছাতা', ne: 'छाता', ur: 'چھتری' } },
    ],
  },
  {
    char: 'ㅠ',
    type: 'basic',
    nameKo: '유',
    romanization: 'yu',
    soundExplanation: {
      en: '"yoo" sound as in "you".',
      bn: 'বাংলা "ইউ" ধ্বনির মতো।',
      ne: 'नेपाली "यु" ध्वनि जस्तै (जस्तै: युवा)।',
      ur: 'انگریزی لفظ "You" کی طرح "یُو" کی آواز۔',
    },
    mouthTip: {
      en: 'Start with a quick "y" and round your lips into "oo".',
      bn: '"ই" থেকে দ্রুত ঠোঁট গোল করে "উ" বলুন।',
      ne: '"य" बाट सुरु गरी ओठ गोलो पारेर "उ" भन्नुहोस्।',
      ur: '"ی" سے شروع کر کے ہونٹوں کو "اُو" کی شکل میں گول کریں۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Long horizontal line', '2. Left vertical stroke down', '3. Right vertical stroke down'],
    examples: [
      { wordKo: '유학생', romanization: 'yuhaksaeng', meaning: { en: 'International student', bn: 'বিদেশি শিক্ষার্থী', ne: 'अन्तर्राष्ट्रिय विद्यार्थी', ur: 'بین الاقوامی طالب علم' } },
      { wordKo: '유명하다', romanization: 'yumyeonghada', meaning: { en: 'To be famous', bn: 'বিখ্যাত হওয়া', ne: 'प्रसिद्ध हुनु', ur: 'مشہور ہونا' } },
    ],
  },
  {
    char: 'ㅡ',
    type: 'basic',
    nameKo: '으',
    romanization: 'eu',
    soundExplanation: {
      en: 'Flat unrounded "eu" sound — smile slightly and say "uh/oo" without rounding lips.',
      bn: 'ঠোঁট চ্যাপ্টা রেখে দাঁত কাছাকাছি রেখে উচ্চারিত হ্রস্ব "উ/এ্য" ধ্বনি।',
      ne: 'ओठ गोलो नबनाई चेप्टो राखेर बोलिने छोटो "उ" ध्वनि।',
      ur: 'ہونٹوں کو مسکراہٹ کی طرح چپٹا رکھتے ہوئے مختصر "اِ/اُ" کی درمیانی آواز۔',
    },
    mouthTip: {
      en: 'Spread your lips horizontally like a gentle smile and make an "oo" sound from the back of the tongue.',
      bn: 'হালকা হাসির মতো ঠোঁট পাশে প্রসারিত রেখে গলার ভেতর থেকে "উ" বলার চেষ্টা করুন।',
      ne: 'हल्का मुस्कान जस्तै ओठ फैलाएर घाँटीबाट "उ" आवाज निकाल्नुहोस्।',
      ur: 'ہونٹوں کو مسکرانے کے انداز میں پھیلا کر گلے کے پچھلے حصے سے آواز نکالیں۔',
    },
    strokeCount: 1,
    strokeOrderSteps: ['1. Single horizontal line from left to right (ㅡ)'],
    examples: [
      { wordKo: '음식', romanization: 'eumsik', meaning: { en: 'Food', bn: 'খাবার', ne: 'खाना', ur: 'کھانا / خوراک' } },
      { wordKo: '은행', romanization: 'eunhaeng', meaning: { en: 'Bank', bn: 'ব্যাংক', ne: 'बैंक', ur: 'بینک' } },
    ],
  },
  {
    char: 'ㅣ',
    type: 'basic',
    nameKo: '이',
    romanization: 'i',
    soundExplanation: {
      en: '"ee" sound as in "see" or "tree".',
      bn: 'বাংলা "ই" ধ্বনির মতো (যেমন: ইলিশ)।',
      ne: 'नेपाली "इ / ई" ध्वनि जस्तै (जस्तै: इमान)।',
      ur: 'اردو کی چھوٹی یے "ای" کی آواز (جیسے: دین)۔',
    },
    mouthTip: {
      en: 'Pull the corners of your mouth slightly back and raise the front of your tongue.',
      bn: 'ঠোঁটের কোণ সামান্য টেনে পরিষ্কার "ই" উচ্চারণ করুন।',
      ne: 'ओठ हल्का तन्काएर स्पष्ट "इ" उच्चारण गर्नुहोस्।',
      ur: 'ہونٹوں کے کناروں کو ہلکا سا پھیلا کر صاف "ای" ادا کریں۔',
    },
    strokeCount: 1,
    strokeOrderSteps: ['1. Single vertical line from top to bottom (ㅣ)'],
    examples: [
      { wordKo: '이름', romanization: 'ireum', meaning: { en: 'Name', bn: 'নাম', ne: 'नाम', ur: 'نام' } },
      { wordKo: '시간', romanization: 'sigan', meaning: { en: 'Time / Hour', bn: 'সময় / ঘণ্টা', ne: 'समय / घण्टा', ur: 'وقت / گھنٹہ' } },
    ],
  },
  // 11 Compound Vowels
  {
    char: 'ㅐ',
    type: 'compound',
    nameKo: '애',
    romanization: 'ae',
    soundExplanation: {
      en: '"ae / eh" sound as in "bed" or "care" (ㅏ + ㅣ).',
      bn: 'বাংলা "এ / অ্যা" ধ্বনির মতো (ㅏ + ㅣ)।',
      ne: 'नेपाली "ए" ध्वनि जस्तै (ㅏ + ㅣ)।',
      ur: 'اردو کے "اے" کی آواز جیسے انگریزی لفظ "bed" میں (ㅏ + ㅣ)۔',
    },
    mouthTip: {
      en: 'Open your mouth slightly wider than "e" (ㅔ). In modern Seoul Korean, ㅐ and ㅔ sound very similar.',
      bn: 'মুখ সামান্য খুলে "এ" বলুন। আধুনিক কোরিয়ান ভাষায় ㅐ এবং ㅔ প্রায় একই রকম শোনায়।',
      ne: 'मुख हल्का खोलेर "ए" भन्नुहोस्। आधुनिक कोरियनमा ㅐ र ㅔ झण्डै उस्तै सुनिन्छन्।',
      ur: 'منہ کو ہلکا سا کھول کر "اے" کہیں۔ جدید کورین میں ㅐ اور ㅔ کی آواز تقریباً ایک جیسی ہے۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Inner vertical line', '2. Short middle horizontal bar', '3. Outer right vertical line'],
    examples: [
      { wordKo: '대학교', romanization: 'daehakgyo', meaning: { en: 'University', bn: 'বিশ্ববিদ্যালয়', ne: 'विश्वविद्यालय', ur: 'یونیورسٹی' } },
      { wordKo: '내일', romanization: 'naeil', meaning: { en: 'Tomorrow', bn: 'আগামীকাল', ne: 'भोलि', ur: 'کل (آنے والا)' } },
    ],
  },
  {
    char: 'ㅒ',
    type: 'compound',
    nameKo: '얘',
    romanization: 'yae',
    soundExplanation: {
      en: '"yae / yeh" sound as in "yes" (ㅑ + ㅣ).',
      bn: 'বাংলা "ইয়ে" ধ্বনির মতো (ㅑ + ㅣ)।',
      ne: 'नेपाली "ये" ध्वनि जस्तै (ㅑ + ㅣ)।',
      ur: 'اردو میں "یے" کی آواز جیسے "Yes" میں (ㅑ + ㅣ)۔',
    },
    mouthTip: {
      en: 'Start with "y" and move smoothly into "ae".',
      bn: '"ই" থেকে শুরু করে দ্রুত "এ" উচ্চারণ করুন।',
      ne: '"य" बाट सुरु गरी "ए" उच्चारण गर्नुहोस्।',
      ur: '"ی" سے ملا کر "یے" ادا کریں۔',
    },
    strokeCount: 4,
    strokeOrderSteps: ['1. Left vertical line', '2. Top short bar', '3. Bottom short bar', '4. Right vertical line'],
    examples: [
      { wordKo: '얘기', romanization: 'yaegi', meaning: { en: 'Story / Talk', bn: 'কথা / গল্প', ne: 'कुराकानी / कथा', ur: 'بات چیت / کہانی' } },
    ],
  },
  {
    char: 'ㅔ',
    type: 'compound',
    nameKo: '에',
    romanization: 'e',
    soundExplanation: {
      en: 'Clean "eh" sound as in "met" (ㅓ + ㅣ).',
      bn: 'বাংলা "এ" ধ্বনির মতো (ㅓ + ㅣ)।',
      ne: 'नेपाली "ए" ध्वनि जस्तै (ㅓ + ㅣ)।',
      ur: 'صاف "اے" کی آواز (ㅓ + ㅣ)۔',
    },
    mouthTip: {
      en: 'Relax your jaw in a neutral mid position and say "eh".',
      bn: 'স্বাভাবিকভাবে মুখ রেখে পরিষ্কার "এ" বলুন।',
      ne: 'सहज रूपमा "ए" उच्चारण गर्नुहोस्।',
      ur: 'منہ کو معتدل رکھ کر "اے" ادا کریں۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Short horizontal bar', '2. Inner vertical line', '3. Outer vertical line'],
    examples: [
      { wordKo: '세계', romanization: 'segye', meaning: { en: 'World', bn: 'বিশ্ব / পৃথিবী', ne: 'विश्व / संसार', ur: 'دنیا' } },
      { wordKo: '메뉴', romanization: 'menyu', meaning: { en: 'Menu', bn: 'মেনু', ne: 'मेनु', ur: 'مینو' } },
    ],
  },
  {
    char: 'ㅖ',
    type: 'compound',
    nameKo: '예',
    romanization: 'ye',
    soundExplanation: {
      en: '"ye" sound as in "yesterday" (ㅕ + ㅣ).',
      bn: 'বাংলা "ইয়ে" ধ্বনির মতো (যেমন: 예 = হ্যাঁ)।',
      ne: 'नेपाली "ये" ध्वनि जस्तै (जस्तै: 예 = हजुर/हो)।',
      ur: '"یے" کی آواز (جیسے: 예 = جی ہاں)۔',
    },
    mouthTip: {
      en: 'Glide from "y" directly into "eh".',
      bn: '"ই" এবং "এ" একসাথে মিলিয়ে "ইয়ে" বলুন।',
      ne: '"इ" र "ए" मिलाएर "ये" भन्नुहोस्।',
      ur: '"ی" اور "اے" کو ملا کر "یے" بولیں۔',
    },
    strokeCount: 4,
    strokeOrderSteps: ['1. Top short bar', '2. Bottom short bar', '3. Inner vertical line', '4. Outer vertical line'],
    examples: [
      { wordKo: '예약', romanization: 'yeyak', meaning: { en: 'Reservation', bn: 'বুকিং / রিজার্ভেশন', ne: 'बुकिङ / आरक्षण', ur: 'بکنگ / ریزرویشن' } },
      { wordKo: '예절', romanization: 'yejeol', meaning: { en: 'Etiquette / Manners', bn: 'শিষ্টাচার', ne: 'शिष्टाचार', ur: 'آداب و اخلاق' } },
    ],
  },
  {
    char: 'ㅘ',
    type: 'compound',
    nameKo: '와',
    romanization: 'wa',
    soundExplanation: {
      en: '"wa" sound as in "water" (ㅗ + ㅏ).',
      bn: 'বাংলা "ওয়া" ধ্বনির মতো (ㅗ + ㅏ)।',
      ne: 'नेपाली "वा" ध्वनि जस्तै (ㅗ + ㅏ)।',
      ur: 'اردو میں "وا" کی آواز (ㅗ + ㅏ)۔',
    },
    mouthTip: {
      en: 'Start with rounded lips for ㅗ and open wide into ㅏ in one syllable.',
      bn: 'ঠোঁট গোল করে "ও" থেকে দ্রুত মুখ খুলে "আ" একসাথে বলুন (ওয়া)।',
      ne: 'ओठ गोलो "ओ" बाट छिटो "आ" मा खोल्नुहोस् (वा)।',
      ur: 'ہونٹ گول کر کے "او" سے فوراً "آ" پر کھولیں (وا)۔',
    },
    strokeCount: 4,
    strokeOrderSteps: ['1–2. Write ㅗ on the left-bottom', '3–4. Write ㅏ on the right'],
    examples: [
      { wordKo: '과일', romanization: 'gwail', meaning: { en: 'Fruit', bn: 'ফল', ne: 'फलफूल', ur: 'پھل' } },
      { wordKo: '화장실', romanization: 'hwajangsil', meaning: { en: 'Restroom', bn: 'ওয়াশরুম / টয়লেট', ne: 'शौचालय', ur: 'واش روم / بیت الخلا' } },
    ],
  },
  {
    char: 'ㅙ',
    type: 'compound',
    nameKo: '왜',
    romanization: 'wae',
    soundExplanation: {
      en: '"wae / weh" sound as in "wait" or "wedding" (ㅗ + ㅐ).',
      bn: 'বাংলা "ওয়ে" ধ্বনির মতো (ㅗ + ㅐ)।',
      ne: 'नेपाली "वे" ध्वनि जस्तै (ㅗ + ㅐ)।',
      ur: '"وے" کی آواز (جیسے: 왜 = کیوں)۔',
    },
    mouthTip: {
      en: 'Combine ㅗ + ㅐ smoothly into a single syllable "weh".',
      bn: 'ㅗ এবং ㅐ একসাথে মিলিয়ে এক সিলেবলে "ওয়ে" বলুন।',
      ne: 'ㅗ र ㅐ मिलाएर एकै अक्षरमा "वे" भन्नुहोस्।',
      ur: 'ㅗ اور ㅐ کو ملا کر ایک ہی آواز میں "وے" کہیں۔',
    },
    strokeCount: 5,
    strokeOrderSteps: ['1–2. Write ㅗ', '3–5. Write ㅐ beside it'],
    examples: [
      { wordKo: '왜요?', romanization: 'waeyo?', meaning: { en: 'Why?', bn: 'কেন?', ne: 'किन?', ur: 'کیوں؟' } },
      { wordKo: '괜찮아요', romanization: 'gwaenchanayo', meaning: { en: 'It is okay', bn: 'ঠিক আছে / সমস্যা নেই', ne: 'ठीक छ', ur: 'ٹھیک ہے / کوئی بات نہیں' } },
    ],
  },
  {
    char: 'ㅚ',
    type: 'compound',
    nameKo: '외',
    romanization: 'oe',
    soundExplanation: {
      en: 'Pronounced "we / weh" in modern Korean (ㅗ + ㅣ).',
      bn: 'আধুনিক কোরিয়ান ভাষায় "ওয়ে" উচ্চারিত হয় (ㅗ + ㅣ)।',
      ne: 'आधुनिक कोरियनमा "वे" उच्चारण हुन्छ (ㅗ + ㅣ)।',
      ur: 'جدید کورین میں "وے" پڑھا جاتا ہے (ㅗ + ㅣ)۔',
    },
    mouthTip: {
      en: 'Start with rounded lips for ㅗ and glide into "eh" (sounds identical to ㅙ/ㅞ in daily speech).',
      bn: 'দৈনন্দিন কথোপকথনে ㅚ, ㅙ এবং ㅞ তিনটির উচ্চারণই "ওয়ে"।',
      ne: 'दैनिक बोलीचालीमा ㅚ, ㅙ र ㅞ तीनवटैको उच्चारण "वे" हुन्छ।',
      ur: 'روزمرہ گفتگو میں ㅚ، ㅙ اور ㅞ تینوں کی آواز "وے" نکلتی ہے۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1–2. Write ㅗ', '3. Write vertical line ㅣ on the right'],
    examples: [
      { wordKo: '외국인', romanization: 'oegugin', meaning: { en: 'Foreigner', bn: 'বিদেশি নাগরিক', ne: 'विदेशी नागरिक', ur: 'غیر ملکی' } },
      { wordKo: '회사', romanization: 'hoesa', meaning: { en: 'Company', bn: 'কোম্পানি / অফিস', ne: 'कम्पनी / कार्यालय', ur: 'کمپنی / دفتر' } },
    ],
  },
  {
    char: 'ㅝ',
    type: 'compound',
    nameKo: '워',
    romanization: 'wo',
    soundExplanation: {
      en: '"wo / wuh" sound as in "wonder" (ㅜ + ㅓ).',
      bn: 'বাংলা "উয় / ওয়ো" ধ্বনির মতো (ㅜ + ㅓ)।',
      ne: 'नेपाली "व" ध्वनि जस्तै (ㅜ + ㅓ)।',
      ur: '"وَ / وُو" کی آواز جیسے انگریزی لفظ "wonder" میں (ㅜ + ㅓ)۔',
    },
    mouthTip: {
      en: 'Start with ㅜ ("oo") and drop your jaw into ㅓ ("uh").',
      bn: '"উ" থেকে শুরু করে দ্রুত "অ" তে যান।',
      ne: '"उ" बाट सुरु गरी छिटो "अ" मा जानुहोस्।',
      ur: '"اُو" سے شروع کر کے جبڑے کو "اَ" کی طرف کھولیں۔',
    },
    strokeCount: 4,
    strokeOrderSteps: ['1–2. Write ㅜ', '3–4. Write ㅓ'],
    examples: [
      { wordKo: '만원', romanization: 'manwon', meaning: { en: '10,000 Won', bn: '১০,০০০ ওন (কোরিয়ান মুদ্রা)', ne: '१०,००० वोन', ur: 'دس ہزار وون (کورین کرنسی)' } },
      { wordKo: '병원', romanization: 'byeongwon', meaning: { en: 'Hospital', bn: 'হাসপাতাল', ne: 'अस्पताल', ur: 'ہسپتال' } },
    ],
  },
  {
    char: 'ㅞ',
    type: 'compound',
    nameKo: '웨',
    romanization: 'we',
    soundExplanation: {
      en: '"we / weh" sound as in "west" (ㅜ + ㅔ).',
      bn: 'বাংলা "উয়ে / ওয়ে" ধ্বনির মতো (ㅜ + ㅔ)।',
      ne: 'नेपाली "वे" ध्वनि जस्तै (ㅜ + ㅔ)।',
      ur: '"وے" کی آواز جیسے "west" میں (ㅜ + ㅔ)۔',
    },
    mouthTip: {
      en: 'Blend ㅜ + ㅔ smoothly into a single syllable "weh".',
      bn: '"উ" এবং "এ" একসাথে মিলিয়ে "ওয়ে" উচ্চারণ করুন।',
      ne: '"उ" र "ए" मिलाएर "वे" उच्चारण गर्नुहोस्।',
      ur: '"اُو" اور "اے" کو ملا کر "وے" کہیں۔',
    },
    strokeCount: 5,
    strokeOrderSteps: ['1–2. Write ㅜ', '3–5. Write ㅔ'],
    examples: [
      { wordKo: '웨이터', romanization: 'weiteo', meaning: { en: 'Waiter', bn: 'ওয়েটার', ne: 'वेटर', ur: 'ویٹر' } },
    ],
  },
  {
    char: 'ㅟ',
    type: 'compound',
    nameKo: '위',
    romanization: 'wi',
    soundExplanation: {
      en: '"wee" sound as in "week" or "we" (ㅜ + ㅣ).',
      bn: 'বাংলা "উই" ধ্বনির মতো (ㅜ + ㅣ)।',
      ne: 'नेपाली "वी / उइ" ध्वनि जस्तै (ㅜ + ㅣ)।',
      ur: 'انگریزی لفظ "we" کی طرح "وِی" کی آواز (ㅜ + ㅣ)۔',
    },
    mouthTip: {
      en: 'Start with rounded lips for ㅜ and pull back into ㅣ.',
      bn: 'ঠোঁট গোল করে "উ" থেকে সরাসরি "ই" বলুন (উই)।',
      ne: '"उ" बाट सीधै "इ" मा जानुहोस् (वी)।',
      ur: '"اُو" سے شروع کر کے فوراً "ای" پر جائیں (وِی)۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1–2. Write ㅜ', '3. Write vertical line ㅣ on the right'],
    examples: [
      { wordKo: '위험', romanization: 'wiheom', meaning: { en: 'Danger', bn: 'বিপদ / ঝুঁকি', ne: 'खतरा', ur: 'خطرہ' } },
      { wordKo: '위치', romanization: 'wichi', meaning: { en: 'Location', bn: 'অবস্থান / লোকেশন', ne: 'स्थान', ur: 'مقام / لوکیشن' } },
    ],
  },
  {
    char: 'ㅢ',
    type: 'compound',
    nameKo: '의',
    romanization: 'ui',
    soundExplanation: {
      en: '"eui" (ㅡ + ㅣ) at the start of a word; sounds like "i" inside a word or "e" as a possessive particle.',
      bn: 'শব্দের শুরুতে "উই" (ㅡ + ㅣ), শব্দের মাঝে "ই" এবং সম্বন্ধ পদের পার্টিকেল হিসেবে "এ" উচ্চারিত হয়।',
      ne: 'शब्दको सुरुमा "उई" (ㅡ + ㅣ), बीचमा "इ" र सम्बन्ध बुझाउँदा "ए" उच्चारण हुन्छ।',
      ur: 'لفظ کے شروع میں "اُوئی" (ㅡ + ㅣ)، درمیان میں "ای" اور اضافت کے طور پر "اے" پڑھا جاتا ہے۔',
    },
    mouthTip: {
      en: 'Glide rapidly from flat unrounded ㅡ into ㅣ without rounding your lips.',
      bn: 'ঠোঁট চ্যাপ্টা রেখে ㅡ থেকে দ্রুত ㅣ তে যান।',
      ne: 'ओठ चेप्टो राखेर ㅡ बाट छिटो ㅣ मा जानुहोस्।',
      ur: 'ہونٹ چپٹے رکھتے ہوئے ㅡ سے تیزی سے ㅣ کی طرف جائیں۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Horizontal line ㅡ', '2. Vertical line ㅣ on the right'],
    examples: [
      { wordKo: '의사', romanization: 'uisa', meaning: { en: 'Doctor', bn: 'ডাক্তার', ne: 'डाक्टर', ur: 'ڈاکٹر' } },
      { wordKo: '편의점', romanization: 'pyeonuijeom', meaning: { en: 'Convenience store', bn: 'কনভেনিয়েন্স স্টোর', ne: 'सुविधा पसल', ur: 'کنوینینس اسٹور' } },
    ],
  },
];

export interface HangulConsonantItem {
  char: string;
  type: 'basic' | 'double';
  nameKo: string;
  nameRomanized: string;
  initialSound: string;
  batchimSound: string;
  explanation: QuadLangText;
  batchimRule: QuadLangText;
  strokeCount: number;
  strokeOrderSteps: string[];
  examples: Array<{
    wordKo: string;
    romanization: string;
    meaning: QuadLangText;
  }>;
}

export const HANGUL_CONSONANTS_19: HangulConsonantItem[] = [
  // 14 Basic Consonants
  {
    char: 'ㄱ',
    type: 'basic',
    nameKo: '기역',
    nameRomanized: 'giyeok',
    initialSound: 'g / k',
    batchimSound: '-k',
    explanation: {
      en: 'Soft "g/k" at the start of a word; clear "g" between vowels.',
      bn: 'শব্দের শুরুতে হালকা "খ/গ" এবং দুই স্বরবর্ণের মাঝে "গ" উচ্চারিত হয়।',
      ne: 'शब्दको सुरुमा हल्का "ख/ग" र स्वरहरूको बीचमा "ग" उच्चारण हुन्छ।',
      ur: 'لفظ کے شروع میں ہلکی "ک/گ" اور دو واولز کے درمیان صاف "گ" کی آواز دیتا ہے۔',
    },
    batchimRule: {
      en: 'At the bottom of a syllable (Batchim), ㄱ is pronounced as an unreleased "-k" sound.',
      bn: 'সিলেবলের নিচে (받침) থাকলে উচ্চারণ থেমে থাকা "-ক" হয় (যেমন: 국 = গুক)।',
      ne: 'अक्षरको तल (받침) हुँदा "-क" उच्चारण हुन्छ (जस्तै: 국 = गुक)।',
      ur: 'سلیبل کے نیچے (Batchim) آنے پر رکی ہوئی "-ک" کی آواز دیتا ہے (جیسے: 한국 = ہانگوک)۔',
    },
    strokeCount: 1,
    strokeOrderSteps: ['1. Draw left-to-right horizontal line then bend straight down in one stroke (ㄱ)'],
    examples: [
      { wordKo: '가방', romanization: 'gabang', meaning: { en: 'Bag', bn: 'ব্যাগ', ne: 'झोला', ur: 'بیگ / بستہ' } },
      { wordKo: '한국', romanization: 'hanguk', meaning: { en: 'South Korea', bn: 'দক্ষিণ কোরিয়া', ne: 'दक्षिण कोरिया', ur: 'جنوبی کوریا' } },
    ],
  },
  {
    char: 'ㄴ',
    type: 'basic',
    nameKo: '니은',
    nameRomanized: 'nieun',
    initialSound: 'n',
    batchimSound: '-n',
    explanation: {
      en: '"n" sound as in "name".',
      bn: 'বাংলা দন্ত্য "ন" ধ্বনির মতো।',
      ne: 'नेपाली "न" ध्वनि जस्तै।',
      ur: 'اردو کے حرف "ن" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㄴ keeps its clear "-n" nasal sound.',
      bn: '받침 হিসেবে সিলেবলের শেষেও পরিষ্কার "-ন" উচ্চারিত হয় (যেমন: 산 = সান)।',
      ne: '받침 को रूपमा पनि स्पष्ट "-न" उच्चारण हुन्छ (जस्तै: 산 = सान)।',
      ur: 'نیچے آنے پر بھی صاف "-ن" کی آواز برقرار رہتی ہے (جیسے: 산 = سان)۔',
    },
    strokeCount: 1,
    strokeOrderSteps: ['1. Draw top-to-bottom vertical line then turn right horizontally in one stroke (ㄴ)'],
    examples: [
      { wordKo: '나라', romanization: 'nara', meaning: { en: 'Country', bn: 'দেশ', ne: 'देश', ur: 'ملک' } },
      { wordKo: '친구', romanization: 'chingu', meaning: { en: 'Friend', bn: 'বন্ধু', ne: 'साथी', ur: 'دوست' } },
    ],
  },
  {
    char: 'ㄷ',
    type: 'basic',
    nameKo: '디귿',
    nameRomanized: 'digeut',
    initialSound: 'd / t',
    batchimSound: '-t',
    explanation: {
      en: 'Soft "d/t" at the start of a word; voiced "d" between vowels.',
      bn: 'শব্দের শুরুতে হালকা "থ/দ" এবং শব্দের মাঝে "দ" উচ্চারিত হয়।',
      ne: 'शब्दको सुरुमा हल्का "थ/द" र बीचमा "द" उच्चारण हुन्छ।',
      ur: 'لفظ کے شروع میں ہلکی "د/ت" اور درمیان میں صاف "د" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㄷ is pronounced as an unreleased "-t" stop.',
      bn: '받침 হিসেবে সিলেবলের নিচে থাকলে "-ত" উচ্চারিত হয় (যেমন: 곧 = গোত)।',
      ne: '받침 मा हुँदा "-त" उच्चारण हुन्छ।',
      ur: 'بطور Batchim اس کی آواز رکی ہوئی "-ت" ہوتی ہے۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Top horizontal line left-to-right', '2. Vertical line down turning right at the bottom'],
    examples: [
      { wordKo: '도시', romanization: 'dosi', meaning: { en: 'City', bn: 'শহর', ne: 'सहर', ur: 'شہر' } },
      { wordKo: '도서관', romanization: 'doseogwan', meaning: { en: 'Library', bn: 'গ্রন্থাগার / লাইব্রেরি', ne: 'पुस्तकालय', ur: 'لائبریری' } },
    ],
  },
  {
    char: 'ㄹ',
    type: 'basic',
    nameKo: '리을',
    nameRomanized: 'rieul',
    initialSound: 'r / l',
    batchimSound: '-l',
    explanation: {
      en: 'Light flap "r" between vowels; soft "l" at the end of a syllable.',
      bn: 'শব্দের শুরুতে ও মাঝে "র" এবং সিলেবলের নিচে (받침) থাকলে "ল" উচ্চারিত হয়।',
      ne: 'सुरु र बीचमा "र" तथा अक्षरको अन्त्यमा (받침) "ल" उच्चारण हुन्छ।',
      ur: 'لفظ کے شروع اور درمیان میں ہلکی "ر" اور آخر میں (Batchim) "ل" کی آواز دیتا ہے۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㄹ is pronounced as a smooth "-l" (e.g., 물 = mul).',
      bn: '받침 হিসেবে ㄹ সবসময় "-ল" উচ্চারিত হয় (যেমন: 물 = মুল)।',
      ne: '받침 मा ㄹ सधैं "-ल" उच्चारण हुन्छ (जस्तै: 물 = मुल)।',
      ur: 'نیچے (Batchim) آنے پر ہمیشہ "-ل" پڑھا جاتا ہے (جیسے: 물 = مُل)۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Top ㄱ shape', '2. Middle horizontal line', '3. Bottom ㄴ shape'],
    examples: [
      { wordKo: '라디오', romanization: 'radio', meaning: { en: 'Radio', bn: 'রেডিও', ne: 'रेडियो', ur: 'ریڈیو' } },
      { wordKo: '물', romanization: 'mul', meaning: { en: 'Water', bn: 'পানি', ne: 'पानी', ur: 'پانی' } },
    ],
  },
  {
    char: 'ㅁ',
    type: 'basic',
    nameKo: '미음',
    nameRomanized: 'mieum',
    initialSound: 'm',
    batchimSound: '-m',
    explanation: {
      en: '"m" sound as in "mother".',
      bn: 'বাংলা "ম" ধ্বনির মতো।',
      ne: 'नेपाली "म" ध्वनि जस्तै।',
      ur: 'اردو کے حرف "م" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㅁ closes the lips into a clear "-m" sound.',
      bn: '받침 হিসেবেও পরিষ্কার "-ম" উচ্চারিত হয় (যেমন: 밤 = ফাম)।',
      ne: '받침 मा पनि स्पष्ट "-म" उच्चारण हुन्छ (जस्तै: 밤 = फाम)।',
      ur: 'نیچے آنے پر بھی صاف "-م" کی آواز دیتا ہے (جیسے: 밤 = پام)۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Left vertical line down', '2. Top-to-right ㄱ stroke', '3. Bottom closing horizontal line'],
    examples: [
      { wordKo: '마음', romanization: 'maeum', meaning: { en: 'Heart / Mind', bn: 'মন / হৃদয়', ne: 'मन / मुटु', ur: 'دل / ذہن' } },
      { wordKo: '엄마', romanization: 'eomma', meaning: { en: 'Mom', bn: 'আম্মু / মা', ne: 'आमा', ur: 'امی / ماں' } },
    ],
  },
  {
    char: 'ㅂ',
    type: 'basic',
    nameKo: '비읍',
    nameRomanized: 'bieup',
    initialSound: 'b / p',
    batchimSound: '-p',
    explanation: {
      en: 'Soft "b/p" at the start of a word; clear "b" between vowels.',
      bn: 'শব্দের শুরুতে হালকা "ফ/ব" এবং শব্দের মাঝে "ব" উচ্চারিত হয়।',
      ne: 'शब्दको सुरुमा हल्का "फ/ब" र बीचमा "ब" उच्चारण हुन्छ।',
      ur: 'شروع میں ہلکی "پ/ب" اور درمیان میں صاف "ب" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㅂ is an unreleased "-p" sound (before ㄴ/ㅁ it nasalizes to "-m", e.g., 감사합니다 -> gamsahamnida).',
      bn: '받침 হিসেবে "-প" হয়, তবে এর পর ㄴ বা ㅁ থাকলে "-ম" উচ্চারিত হয় (যেমন: 감사합니다 -> খামসাহামনিদা)।',
      ne: '받침 मा "-प" हुन्छ, तर पछाडि ㄴ वा ㅁ आउँदा "-म" बन्छ (जस्तै: 감사합니다 -> खाम्साहाम्निदा)।',
      ur: 'بطور Batchim "-پ" کی آواز دیتا ہے، لیکن ㄴ یا ㅁ سے پہلے "-م" بن جاتا ہے (جیسے: 감사합니다 -> کھامساہامنیدا)۔',
    },
    strokeCount: 4,
    strokeOrderSteps: ['1. Left vertical line', '2. Right vertical line', '3. Middle horizontal bar', '4. Bottom horizontal bar'],
    examples: [
      { wordKo: '밥', romanization: 'bap', meaning: { en: 'Cooked rice / Meal', bn: 'ভাত / খাবার', ne: 'भात / खाना', ur: 'چاول / کھانا' } },
      { wordKo: '버스', romanization: 'beoseu', meaning: { en: 'Bus', bn: 'বাস', ne: 'बस', ur: 'بس' } },
    ],
  },
  {
    char: 'ㅅ',
    type: 'basic',
    nameKo: '시옷',
    nameRomanized: 'siot',
    initialSound: 's / sh',
    batchimSound: '-t',
    explanation: {
      en: 'Soft "s" sound; becomes "sh" before ㅣ, ㅑ, ㅕ, ㅛ, ㅠ.',
      bn: 'সাধারণত দন্ত্য "স", কিন্তু ㅣ/ㅑ/ㅕ/ㅛ/ㅠ এর আগে তালব্য "শ" উচ্চারিত হয়।',
      ne: 'सामान्यतया "स", तर ㅣ/ㅑ/ㅕ/ㅛ/ㅠ अगाडि "श" उच्चारण हुन्छ।',
      ur: 'عام طور پر "س" کی آواز، لیکن ㅣ/ㅑ/ㅕ/ㅛ/ㅠ سے پہلے "ش" بن جاتی ہے۔',
    },
    batchimRule: {
      en: 'Important! When ㅅ is at the bottom (Batchim), it is pronounced "-t", NOT "-s" (e.g., 옷 = ot).',
      bn: 'গুরুত্বপূর্ণ! ㅅ সিলেবলের নিচে (받침) থাকলে "স" না হয়ে "-ত" উচ্চারিত হয় (যেমন: 옷 = ওত)।',
      ne: 'महत्त्वपूर्ण! ㅅ अक्षरको तल (받침) हुँदा "स" नभई "-त" उच्चारण हुन्छ (जस्तै: 옷 = ओत)।',
      ur: 'اہم اصول! جب ㅅ سلیبل کے نیچے (Batchim) آئے تو "س" نہیں بلکہ "-ت" پڑھا جاتا ہے (جیسے: 옷 = اوت)۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Left diagonal stroke from top-center', '2. Short right diagonal stroke from center'],
    examples: [
      { wordKo: '사람', romanization: 'saram', meaning: { en: 'Person', bn: 'মানুষ / ব্যক্তি', ne: 'मानिस / व्यक्ति', ur: 'انسان / شخص' } },
      { wordKo: '옷', romanization: 'ot', meaning: { en: 'Clothes', bn: 'পোশাক / কাপড়', ne: 'लुगा / कपडा', ur: 'کپڑے / لباس' } },
    ],
  },
  {
    char: 'ㅇ',
    type: 'basic',
    nameKo: '이응',
    nameRomanized: 'ieung',
    initialSound: 'silent',
    batchimSound: '-ng',
    explanation: {
      en: 'Silent placeholder at the start of a syllable; "ng" sound (as in "song") at the bottom.',
      bn: 'সিলেবলের শুরুতে থাকলে কোনো উচ্চারণ নেই (নীরব), কিন্তু নিচে থাকলে অনুস্বার "ং" (ng) উচ্চারিত হয়।',
      ne: 'अक्षरको सुरुमा मौन (आवाज हुँदैन), तर तल (받침) हुँदा "ङ" (ng) उच्चारण हुन्छ।',
      ur: 'سلیبل کے شروع میں خاموش (صرف واول کی آواز آتی ہے)، لیکن نیچے آنے پر "نگ" (ng) کی آواز دیتا ہے۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㅇ always produces a resonant "-ng" sound (e.g., 방 = bang).',
      bn: '받침 হিসেবে ㅇ সবসময় "ং" (ng) ধ্বনি তৈরি করে (যেমন: 방 = ফাং)।',
      ne: '받침 मा ㅇ सधैं "ङ" (ng) उच्चारण हुन्छ (जस्तै: 방 = फाङ)।',
      ur: 'بطور Batchim ہمیشہ "نگ" (ng) کی آواز دیتا ہے (جیسے: 방 = بانگ)۔',
    },
    strokeCount: 1,
    strokeOrderSteps: ['1. Draw one smooth circle counter-clockwise starting from the top (ㅇ)'],
    examples: [
      { wordKo: '아침', romanization: 'achim', meaning: { en: 'Morning', bn: 'সকাল', ne: 'बिहान', ur: 'صبح' } },
      { wordKo: '공부', romanization: 'gongbu', meaning: { en: 'Study', bn: 'পড়াশোনা', ne: 'पढाइ', ur: 'پڑھائی' } },
    ],
  },
  {
    char: 'ㅈ',
    type: 'basic',
    nameKo: '지읒',
    nameRomanized: 'jieut',
    initialSound: 'j / ch',
    batchimSound: '-t',
    explanation: {
      en: 'Soft "j" sound as in "juice".',
      bn: 'শব্দের শুরুতে হালকা "ছ/জ" এবং শব্দের মাঝে পরিষ্কার "জ" উচ্চারিত হয়।',
      ne: 'सुरुमा हल्का "छ/ज" र बीचमा स्पष्ट "ज" उच्चारण हुन्छ।',
      ur: 'لفظ کے شروع میں ہلکی "ج/چ" اور درمیان میں صاف "ج" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㅈ neutralizes to an unreleased "-t" stop (e.g., 낮 = nat).',
      bn: '받침 হিসেবে নিচে থাকলে "-ত" উচ্চারিত হয় (যেমন: 낮 = নাত)।',
      ne: '받침 मा हुँदा "-त" उच्चारण हुन्छ (जस्तै: 낮 = नात)।',
      ur: 'سلیبل کے نیچے آنے پر "-ت" پڑھا جاتا ہے (جیسے: 낮 = نات)۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Horizontal line curving down-left', '2. Short right diagonal leg from center'],
    examples: [
      { wordKo: '지하철', romanization: 'jihacheol', meaning: { en: 'Subway', bn: 'সাবওয়ে / মেট্রোরেল', ne: 'भूमिगत रेल (सबवे)', ur: 'سب وے / میٹرو ٹرین' } },
      { wordKo: '전공', romanization: 'jeongong', meaning: { en: 'Academic Major', bn: 'বিশ্ববিদ্যালয়ের মেজর বিষয়', ne: 'मुख्य विषय (मेजर)', ur: 'یونیورسٹی کا میجر مضمون' } },
    ],
  },
  {
    char: 'ㅊ',
    type: 'basic',
    nameKo: '치읓',
    nameRomanized: 'chieut',
    initialSound: 'ch (aspirated)',
    batchimSound: '-t',
    explanation: {
      en: 'Strongly aspirated "ch" sound with a puff of air.',
      bn: 'মুখ থেকে বাতাস বের করে স্পষ্ট মহাপ্রাণ "ছ" উচ্চারণ।',
      ne: 'श्वास बाहिर निकालेर स्पष्ट "छ" उच्चारण।',
      ur: 'ہوا کے دباؤ کے ساتھ واضح "چھ" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㅊ is pronounced "-t" (e.g., 꽃 = kkot).',
      bn: '받침 হিসেবে নিচে থাকলে "-ত" উচ্চারিত হয় (যেমন: 꽃 = ক্কোত)।',
      ne: '받침 मा हुँदा "-त" उच्चारण हुन्छ (जस्तै: 꽃 = क्कोत)।',
      ur: 'نیچے (Batchim) آنے پر "-ت" کی آواز دیتا ہے (جیسے: 꽃 = کوّت)۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Short top tick', '2. Horizontal line curving down-left', '3. Right diagonal leg'],
    examples: [
      { wordKo: '책', romanization: 'chaek', meaning: { en: 'Book', bn: 'বই', ne: 'किताब', ur: 'کتاب' } },
      { wordKo: '꽃', romanization: 'kkot', meaning: { en: 'Flower', bn: 'ফুল', ne: 'फूल', ur: 'پھول' } },
    ],
  },
  {
    char: 'ㅋ',
    type: 'basic',
    nameKo: '키읔',
    nameRomanized: 'kieuk',
    initialSound: 'k (aspirated)',
    batchimSound: '-k',
    explanation: {
      en: 'Strong aspirated "k" sound with a clear puff of air.',
      bn: 'বাতাসের সাথে স্পষ্ট মহাপ্রাণ "খ" ধ্বনি।',
      ne: 'श्वाससहित स्पष्ट "ख" ध्वनि।',
      ur: 'ہوا کے دباؤ کے ساتھ واضح "کھ" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㅋ is pronounced "-k" (e.g., 부엌 = bueok).',
      bn: '받침 হিসেবে "-ক" উচ্চারিত হয় (যেমন: 부엌 = বুয়ক)।',
      ne: '받침 मा "-क" उच्चारण हुन्छ (जस्तै: 부엌 = बुअक)।',
      ur: 'نیچے آنے پر "-ک" پڑھا جاتا ہے (جیسے: 부엌 = بواوک)۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Draw ㄱ shape', '2. Draw inner horizontal stroke left-to-right'],
    examples: [
      { wordKo: '커피', romanization: 'keopi', meaning: { en: 'Coffee', bn: 'কফি', ne: 'कफी', ur: 'کافی' } },
      { wordKo: '카메라', romanization: 'kamera', meaning: { en: 'Camera', bn: 'ক্যামেরা', ne: 'क्यामेरा', ur: 'کیمرہ' } },
    ],
  },
  {
    char: 'ㅌ',
    type: 'basic',
    nameKo: '티읕',
    nameRomanized: 'tieut',
    initialSound: 't (aspirated)',
    batchimSound: '-t',
    explanation: {
      en: 'Strong aspirated "t" sound as in "top".',
      bn: 'বাতাসের সাথে স্পষ্ট মহাপ্রাণ "থ" ধ্বনি।',
      ne: 'श्वाससहित स्पष्ट "थ" ध्वनि।',
      ur: 'ہوا کے ساتھ واضح "تھ" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㅌ is pronounced "-t" (before 이 it palatalizes to "ch", e.g., 같이 -> gachi).',
      bn: '받침 হিসেবে "-ত" হয়, তবে পরে 이 থাকলে "ছ" উচ্চারিত হয় (যেমন: 같이 -> খাছি)।',
      ne: '받침 मा "-त" हुन्छ, तर पछाडि 이 आउँदा "छ" बन्छ (जस्तै: 같이 -> खाछी)।',
      ur: 'بطور Batchim "-ت" ہے، لیکن 이 سے پہلے "چھ" بن جاتا ہے (جیسے: 같이 -> کھاچھی)۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Top horizontal line', '2. Middle horizontal line', '3. Left vertical line turning right at bottom'],
    examples: [
      { wordKo: '택시', romanization: 'taeksi', meaning: { en: 'Taxi', bn: 'ট্যাক্সি', ne: 'ट्याक्सी', ur: 'ٹیکسی' } },
      { wordKo: '토요일', romanization: 'toyoil', meaning: { en: 'Saturday', bn: 'শনিবার', ne: 'शनिबार', ur: 'ہفتہ (دن)' } },
    ],
  },
  {
    char: 'ㅍ',
    type: 'basic',
    nameKo: '피읖',
    nameRomanized: 'pieup',
    initialSound: 'p (aspirated)',
    batchimSound: '-p',
    explanation: {
      en: 'Strong aspirated "p" sound with a puff of air.',
      bn: 'বাতাসের সাথে স্পষ্ট মহাপ্রাণ "ফ" ধ্বনি।',
      ne: 'श्वाससहित स्पष्ट "फ" ध्वनि।',
      ur: 'ہوا کے ساتھ واضح "پھ" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㅍ is pronounced as an unreleased "-p" (e.g., 앞 = ap).',
      bn: '받침 হিসেবে "-প" উচ্চারিত হয় (যেমন: 앞 = আপ)।',
      ne: '받침 मा "-प" उच्चारण हुन्छ (जस्तै: 앞 = आप)।',
      ur: 'سلیبل کے نیچے "-پ" کی آواز دیتا ہے (جیسے: 앞 = آپ)۔',
    },
    strokeCount: 4,
    strokeOrderSteps: ['1. Top horizontal line', '2. Left inner vertical line', '3. Right inner vertical line', '4. Bottom horizontal line'],
    examples: [
      { wordKo: '편의점', romanization: 'pyeonuijeom', meaning: { en: 'Convenience store', bn: 'কনভেনিয়েন্স স্টোর', ne: 'सुविधा पसल', ur: 'کنوینینس اسٹور' } },
      { wordKo: '앞', romanization: 'ap', meaning: { en: 'Front', bn: 'সামনে', ne: 'अगाडि', ur: 'سامنے' } },
    ],
  },
  {
    char: 'ㅎ',
    type: 'basic',
    nameKo: '히읗',
    nameRomanized: 'hieut',
    initialSound: 'h',
    batchimSound: '-t / silent',
    explanation: {
      en: '"h" sound as in "home". Often softens between vowels.',
      bn: 'বাংলা "হ" ধ্বনির মতো।',
      ne: 'नेपाली "ह" ध्वनि जस्तै।',
      ur: 'اردو کے حرف "ہ" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㅎ is silent before a vowel (좋아요 -> joayo) and aspirates ㄱ/ㄷ/ㅂ/ㅈ into ㅋ/ㅌ/ㅍ/ㅊ.',
      bn: 'স্বরবর্ণের আগে ㅎ নীরব থাকে (좋아요 -> ছোয়ায়ো) এবং ㄱ/ㄷ/ㅂ/ㅈ এর সাথে মিলে মহাপ্রাণ (ㅋ/ㅌ/ㅍ/ㅊ) হয়ে যায়।',
      ne: 'स्वरको अगाडि ㅎ मौन रहन्छ (좋아요 -> छोआयो) र ㄱ/ㄷ/ㅂ/ㅈ सँग मिल्दा ㅋ/ㅌ/ㅍ/ㅊ बन्छ।',
      ur: 'واول سے پہلے ㅎ خاموش ہو جاتا ہے (좋아요 -> چوآیو) اور ㄱ/ㄷ/ㅂ/ㅈ کے ساتھ مل کر انہیں بھاری (ㅋ/ㅌ/ㅍ/ㅊ) بنا دیتا ہے۔',
    },
    strokeCount: 3,
    strokeOrderSteps: ['1. Short top tick', '2. Horizontal line', '3. Bottom circle ㅇ'],
    examples: [
      { wordKo: '학생', romanization: 'haksaeng', meaning: { en: 'Student', bn: 'শিক্ষার্থী / ছাত্র', ne: 'विद्यार्थी', ur: 'طالب علم' } },
      { wordKo: '좋아요', romanization: 'joayo', meaning: { en: 'Good / I like it', bn: 'ভালো / পছন্দ হয়েছে', ne: 'राम्रो छ / मन पर्छ', ur: 'اچھا ہے / پسند ہے' } },
    ],
  },
  // 5 Double (Tense) Consonants
  {
    char: 'ㄲ',
    type: 'double',
    nameKo: '쌍기역',
    nameRomanized: 'ssang-giyeok',
    initialSound: 'kk (tense)',
    batchimSound: '-k',
    explanation: {
      en: 'Tense, unaspirated "kk" produced with a tight throat and zero puff of air.',
      bn: 'বাতাস না ছেড়ে গলায় জোর দিয়ে উচ্চারিত দ্বিত্ব "ক্ক" ধ্বনি।',
      ne: 'श्वास नफाली घाँटी कसेर बोलिने कडा "क्क" ध्वनि।',
      ur: 'بغیر ہوا نکالے گلے پر زور دے کر ادا کی جانے والی سخت "کّ" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim, ㄲ is pronounced "-k" (e.g., 밖 = bak).',
      bn: '받침 হিসেবে "-ক" উচ্চারিত হয় (যেমন: 밖 = বাক)।',
      ne: '받침 मा "-क" उच्चारण हुन्छ (जस्तै: 밖 = बाक)।',
      ur: 'بطور Batchim "-ک" پڑھا جاتا ہے (جیسے: 밖 = باک)۔',
    },
    strokeCount: 2,
    strokeOrderSteps: ['1. Left ㄱ', '2. Right ㄱ closely beside it'],
    examples: [
      { wordKo: '꿈', romanization: 'kkum', meaning: { en: 'Dream', bn: 'স্বপ্ন', ne: 'सपना', ur: 'خواب' } },
      { wordKo: '깨끗하다', romanization: 'kkaekkeuthada', meaning: { en: 'To be clean', bn: 'পরিষ্কার হওয়া', ne: 'सफा हुनु', ur: 'صاف ستھرا ہونا' } },
    ],
  },
  {
    char: 'ㄸ',
    type: 'double',
    nameKo: '쌍디귿',
    nameRomanized: 'ssang-digeut',
    initialSound: 'tt (tense)',
    batchimSound: 'none',
    explanation: {
      en: 'Tense, unaspirated "tt" sound without releasing air.',
      bn: 'বাতাস না ছেড়ে জোর দিয়ে উচ্চারিত "ত্ত" ধ্বনি।',
      ne: 'श्वास नछोडी कडा रूपमा बोलिने "त्त" ध्वनि।',
      ur: 'بغیر ہوا خارج کیے مضبوطی سے ادا ہونے والی "تّ" کی آواز۔',
    },
    batchimRule: {
      en: 'ㄸ is not used as a final Batchim in modern Korean.',
      bn: 'আধুনিক কোরিয়ান শব্দের নিচে (받침) ㄸ ব্যবহৃত হয় না।',
      ne: 'आधुनिक कोरियनमा ㄸ अक्षरको तल (받침) प्रयोग हुँदैन।',
      ur: 'جدید کورین میں ㄸ بطور Batchim استعمال نہیں ہوتا۔',
    },
    strokeCount: 4,
    strokeOrderSteps: ['1–2. Left ㄷ', '3–4. Right ㄷ'],
    examples: [
      { wordKo: '따뜻하다', romanization: 'ttatteuthada', meaning: { en: 'To be warm', bn: 'উষ্ণ / গরম হওয়া', ne: 'न्यानो हुनु', ur: 'گرم / خوشگوار ہونا' } },
      { wordKo: '떡볶이', romanization: 'tteokbokki', meaning: { en: 'Tteokbokki (spicy rice cakes)', bn: 'ত্তকবোক্কি (কোরিয়ান রাইস কেক)', ne: 'तक्बोक्की (कोरियन परिकार)', ur: 'توکبوکی (کورین رائس کیک)' } },
    ],
  },
  {
    char: 'ㅃ',
    type: 'double',
    nameKo: '쌍비읍',
    nameRomanized: 'ssang-bieup',
    initialSound: 'pp (tense)',
    batchimSound: 'none',
    explanation: {
      en: 'Tense, unaspirated "pp" sound with pressed lips.',
      bn: 'ঠোঁট চেপে বাতাস না ছেড়ে উচ্চারিত স্পষ্ট "প্প" ধ্বনি।',
      ne: 'ओठ च्यापेर बोलिने कडा "प्प" ध्वनि।',
      ur: 'ہونٹوں کو ملا کر بغیر ہوا نکالے ادا کی جانے والی "پّ" کی آواز۔',
    },
    batchimRule: {
      en: 'ㅃ is not used as a final Batchim.',
      bn: 'ㅃ সিলেবলের নিচে (받침) ব্যবহৃত হয় না।',
      ne: 'ㅃ अक्षरको तल (받침) प्रयोग हुँदैन।',
      ur: 'ㅃ بطور Batchim استعمال نہیں ہوتا۔',
    },
    strokeCount: 8,
    strokeOrderSteps: ['1–4. Left ㅂ', '5–8. Right ㅂ'],
    examples: [
      { wordKo: '빵', romanization: 'ppang', meaning: { en: 'Bread', bn: 'রুটি / পাউরুটি', ne: 'रोटी / पाउरोटी', ur: 'ڈبل روٹی / بریڈ' } },
      { wordKo: '빠르다', romanization: 'ppareuda', meaning: { en: 'To be fast', bn: 'দ্রুত হওয়া', ne: 'छिटो हुनु', ur: 'تیز ہونا' } },
    ],
  },
  {
    char: 'ㅆ',
    type: 'double',
    nameKo: '쌍시옷',
    nameRomanized: 'ssang-siot',
    initialSound: 'ss (tense)',
    batchimSound: '-t',
    explanation: {
      en: 'Sharp, tense "ss" sound as in "sun".',
      bn: 'জোরালো ও স্পষ্ট দন্ত্য "স্স" ধ্বনি।',
      ne: 'तीखो र स्पष्ट "स्स" ध्वनि।',
      ur: 'تیز اور واضح "سّ" کی آواز۔',
    },
    batchimRule: {
      en: 'As a Batchim (very common in past tense -았/었), ㅆ is pronounced "-t" before consonants and links as "ss" before ㅇ.',
      bn: '받침 হিসেবে ব্যঞ্জনবর্ণের আগে "-ত" এবং ㅇ-এর আগে "স্স" উচ্চারিত হয় (যেমন: 있어요 -> ইস্সয়ো)।',
      ne: '받침 मा व्यञ्जन अगाडि "-त" र ㅇ अगाडि "स्स" उच्चारण हुन्छ (जस्तै: 있어요 -> इस्सयो)।',
      ur: 'بطور Batchim، حرفِ صحیح سے پہلے "-ت" اور ㅇ سے پہلے "سّ" کی آواز دیتا ہے (جیسے: 있어요 -> اِسّویو)۔',
    },
    strokeCount: 4,
    strokeOrderSteps: ['1–2. Left ㅅ', '3–4. Right ㅅ'],
    examples: [
      { wordKo: '싸다', romanization: 'ssada', meaning: { en: 'To be cheap / inexpensive', bn: 'সস্তা হওয়া', ne: 'सस्तो हुनु', ur: 'سستا ہونا' } },
      { wordKo: '있어요', romanization: 'isseoyo', meaning: { en: 'There is / I have', bn: 'আছে', ne: 'छ', ur: 'موجود ہے / میرے پاس ہے' } },
    ],
  },
  {
    char: 'ㅉ',
    type: 'double',
    nameKo: '쌍지읒',
    nameRomanized: 'ssang-jieut',
    initialSound: 'jj (tense)',
    batchimSound: 'none',
    explanation: {
      en: 'Tense, unaspirated "jj" sound.',
      bn: 'গলায় জোর দিয়ে বাতাস না ছেড়ে উচ্চারিত "জ্জ" ধ্বনি।',
      ne: 'कडा रूपमा बोलिने "ज्ज" ध्वनि।',
      ur: 'سختی سے ادا ہونے والی "جّ" کی آواز۔',
    },
    batchimRule: {
      en: 'ㅉ is not used as a final Batchim.',
      bn: 'ㅉ সিলেবলের নিচে (받침) ব্যবহৃত হয় না।',
      ne: 'ㅉ अक्षरको तल (받침) प्रयोग हुँदैन।',
      ur: 'ㅉ بطور Batchim استعمال نہیں ہوتا۔',
    },
    strokeCount: 4,
    strokeOrderSteps: ['1–2. Left ㅈ', '3–4. Right ㅈ'],
    examples: [
      { wordKo: '찌개', romanization: 'jjigae', meaning: { en: 'Korean stew', bn: 'কোরিয়ান স্টু / ঝোল', ne: 'कोरियन सुप (찌개)', ur: 'کورین اسٹیو / سالن' } },
      { wordKo: '쪽', romanization: 'jjok', meaning: { en: 'Side / Direction / Page', bn: 'দিক / পৃষ্ঠা', ne: 'तर्फ / पृष्ठ', ur: 'سمت / صفحہ' } },
    ],
  },
];

export interface HangulReadingPracticeItem {
  id: string;
  category: 'simple_syllables' | 'two_syllable' | 'three_syllable' | 'signs' | 'names' | 'universities_cities' | 'food_transport';
  categoryLabel: QuadLangText;
  korean: string;
  romanization: string;
  meaning: QuadLangText;
  syllableBreakdown: string;
}

export const HANGUL_READING_PRACTICE_ITEMS: HangulReadingPracticeItem[] = [
  { id: 'hr-1', category: 'simple_syllables', categoryLabel: { en: 'Simple Syllables', bn: 'সহজ সিলেবল', ne: 'सरल अक्षर', ur: 'سادہ سلیبلز' }, korean: '가 · 나 · 다 · 라 · 마 · 바 · 사', romanization: 'ga · na · da · ra · ma · ba · sa', meaning: { en: 'Basic CV syllables with ㅏ', bn: 'ㅏ যুক্ত মৌলিক সিলেবল', ne: 'ㅏ युक्त आधारभूत अक्षर', ur: 'ㅏ کے ساتھ بنیادی سلیبلز' }, syllableBreakdown: 'ㄱ+ㅏ, ㄴ+ㅏ, ㄷ+ㅏ, ㄹ+ㅏ, ㅁ+ㅏ, ㅂ+ㅏ, ㅅ+ㅏ' },
  { id: 'hr-2', category: 'simple_syllables', categoryLabel: { en: 'Simple Syllables', bn: 'সহজ সিলেবল', ne: 'सरल अक्षर', ur: 'سادہ سلیبلز' }, korean: '한 · 글 · 강 · 산 · 봄 · 집', romanization: 'han · geul · gang · san · bom · jip', meaning: { en: 'CVC syllables with Batchim', bn: '받침 যুক্ত সিলেবল', ne: '받침 युक्त अक्षर', ur: 'Batchim والے سلیبلز' }, syllableBreakdown: 'ㅎ+ㅏ+ㄴ = 한, ㄱ+ㅡ+ㄹ = 글' },
  { id: 'hr-3', category: 'two_syllable', categoryLabel: { en: 'Two-Syllable Words', bn: 'দুই সিলেবলের শব্দ', ne: 'दुई अक्षरका शब्द', ur: 'دو سلیبل والے الفاظ' }, korean: '한국', romanization: 'Hanguk', meaning: { en: 'South Korea', bn: 'দক্ষিণ কোরিয়া', ne: 'दक्षिण कोरिया', ur: 'جنوبی کوریا' }, syllableBreakdown: '한 (ㅎ+ㅏ+ㄴ) + 국 (ㄱ+ㅜ+ㄱ)' },
  { id: 'hr-4', category: 'two_syllable', categoryLabel: { en: 'Two-Syllable Words', bn: 'দুই সিলেবলের শব্দ', ne: 'दुई अक्षरका शब्द', ur: 'دو سلیبل والے الفاظ' }, korean: '학생', romanization: 'Haksaeng', meaning: { en: 'Student', bn: 'শিক্ষার্থী', ne: 'विद्यार्थी', ur: 'طالب علم' }, syllableBreakdown: '학 (ㅎ+ㅏ+ㄱ) + 생 (ㅅ+ㅐ+ㅇ)' },
  { id: 'hr-5', category: 'three_syllable', categoryLabel: { en: 'Three-Syllable Words', bn: 'তিন সিলেবলের শব্দ', ne: 'तीन अक्षरका शब्द', ur: 'تین سلیبل والے الفاظ' }, korean: '도서관', romanization: 'Doseogwan', meaning: { en: 'Library', bn: 'গ্রন্থাগার / লাইব্রেরি', ne: 'पुस्तकालय', ur: 'لائبریری' }, syllableBreakdown: '도 (ㄷ+ㅗ) + 서 (ㅅ+ㅓ) + 관 (ㄱ+ㅘ+ㄴ)' },
  { id: 'hr-6', category: 'three_syllable', categoryLabel: { en: 'Three-Syllable Words', bn: 'তিন সিলেবলের শব্দ', ne: 'तीन अक्षरका शब्द', ur: 'تین سلیبل والے الفاظ' }, korean: '기숙사', romanization: 'Gisuksa', meaning: { en: 'Dormitory', bn: 'ডরমিটরি / ছাত্রাবাস', ne: 'छात्रावास (होस्टेल)', ur: 'ہاسٹل / ڈورمیٹری' }, syllableBreakdown: '기 (ㄱ+ㅣ) + 숙 (ㅅ+ㅜ+ㄱ) + 사 (ㅅ+ㅏ)' },
  { id: 'hr-7', category: 'signs', categoryLabel: { en: 'Everyday Signs in Korea', bn: 'কোরিয়ার দৈনন্দিন সাইনবোর্ড', ne: 'कोरियाका दैनिक संकेत बोर्ड', ur: 'کوریا کے روزمرہ سائن بورڈز' }, korean: '출구 / 입구', romanization: 'Chulgu / Ipgu', meaning: { en: 'Exit / Entrance', bn: 'বহির্গমন (Exit) / প্রবেশপথ (Entrance)', ne: 'बाहिर जाने बाटो / प्रवेशद्वार', ur: 'باہر نکلنے کا راستہ / داخلہ' }, syllableBreakdown: '출구 (Exit) · 입구 (Entrance)' },
  { id: 'hr-8', category: 'signs', categoryLabel: { en: 'Everyday Signs in Korea', bn: 'কোরিয়ার দৈনন্দিন সাইনবোর্ড', ne: 'कोरियाका दैनिक संकेत बोर्ड', ur: 'کوریا کے روزمرہ سائن بورڈز' }, korean: '당기시오 / 미시오', romanization: 'Danggisio / Misio', meaning: { en: 'Pull / Push (on doors)', bn: 'টানুন (Pull) / ঠেলুন (Push)', ne: 'तान्नुहोस् (Pull) / धकेल्नुहोस् (Push)', ur: 'کھینچیں (Pull) / دھکیلیں (Push)' }, syllableBreakdown: 'Door signs across Korea' },
  { id: 'hr-9', category: 'names', categoryLabel: { en: 'Korean Names', bn: 'কোরিয়ান নাম', ne: 'कोरियन नामहरू', ur: 'کورین نام' }, korean: '김민수 · 이지은 · 박서준', romanization: 'Kim Minsu · Lee Jieun · Park Seojun', meaning: { en: 'Common Korean family & given names', bn: 'প্রচলিত কোরিয়ান পারিবারিক ও ব্যক্তিগত নাম', ne: 'प्रचलित कोरियन थर र नामहरू', ur: 'عام کورین خاندانی اور ذاتی نام' }, syllableBreakdown: 'Surname (1 syllable) + Given name (2 syllables)' },
  { id: 'hr-10', category: 'universities_cities', categoryLabel: { en: 'Universities & Cities', bn: 'বিশ্ববিদ্যালয় ও শহর', ne: 'विश्वविद्यालय र सहरहरू', ur: 'یونیورسٹیاں اور شہر' }, korean: '서울 · 부산 · 대전 · 연세대학교', romanization: 'Seoul · Busan · Daejeon · Yonsei Daehakgyo', meaning: { en: 'Seoul, Busan, Daejeon, Yonsei University', bn: 'সিউল, বুসান, দেজন, ইয়নসেই বিশ্ববিদ্যালয়', ne: 'सियोल, बुसान, देजन, योन्से विश्वविद्यालय', ur: 'سیول، بوسان، 대전، یونسی یونیورسٹی' }, syllableBreakdown: 'Major Korean study destinations' },
  { id: 'hr-11', category: 'food_transport', categoryLabel: { en: 'Food & Transportation', bn: 'খাবার ও পরিবহন', ne: 'खाना र यातायात', ur: 'کھانا اور ٹرانسپورٹ' }, korean: '비빔밥 · 김치 · 지하철 · 공항버스', romanization: 'Bibimbap · Gimchi · Jihacheol · Gonghang-beoseu', meaning: { en: 'Bibimbap, Kimchi, Subway, Airport Bus', bn: 'বিবিমবাপ, কিমচি, সাবওয়ে, এয়ারপোর্ট বাস', ne: 'बिबिम्बाप, किम्ची, सबवे, एयरपोर्ट बस', ur: 'بیبم باپ، کمچی، سب وے، ایئرپورٹ بس' }, syllableBreakdown: 'Essential daily words' },
];

export interface HangulQuizQuestion {
  id: string;
  quizType: 'recognition' | 'sound_to_letter' | 'letter_to_sound' | 'syllable_building' | 'word_reading' | 'listening';
  prompt: QuadLangText;
  audioStimulusKo?: string;
  koreanDisplay?: string;
  options: string[];
  correctIndex: number;
  explanation: QuadLangText;
}

export const HANGUL_SECTION_QUIZ: HangulQuizQuestion[] = [
  {
    id: 'hq-1',
    quizType: 'recognition',
    prompt: {
      en: 'Which Hangul vowel represents the open "a" (ah) sound?',
      bn: 'কোন হানগুল স্বরবর্ণটি "আ" (a) ধ্বনি প্রকাশ করে?',
      ne: 'कुन हंगुल स्वरले "आ" (a) ध्वनि जनाउँछ?',
      ur: 'کون سا ہنگُل واول کھلی "آ" (a) کی آواز ظاہر کرتا ہے؟',
    },
    options: ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ'],
    correctIndex: 0,
    explanation: {
      en: 'ㅏ is pronounced "a" as in father.',
      bn: 'ㅏ বর্ণটির উচ্চারণ "আ"।',
      ne: 'ㅏ अक्षरको उच्चारण "आ" हुन्छ।',
      ur: 'ㅏ کی آواز "آ" ہے۔',
    },
  },
  {
    id: 'hq-2',
    quizType: 'sound_to_letter',
    prompt: {
      en: 'Listen to the sound and choose the matching Hangul consonant ("m" as in mother):',
      bn: 'অডিও শুনুন এবং "ম" (m) ধ্বনির ব্যঞ্জনবর্ণটি নির্বাচন করুন:',
      ne: 'अडियो सुन्नुहोस् र "म" (m) ध्वनिको व्यञ्जन छान्नुहोस्:',
      ur: 'آواز سنیں اور "م" (m) کی آواز والا حرفِ صحیح منتخب کریں:',
    },
    audioStimulusKo: '마',
    options: ['ㄴ', 'ㅁ', 'ㅂ', 'ㅇ'],
    correctIndex: 1,
    explanation: {
      en: 'ㅁ (mieum) represents the "m" sound.',
      bn: 'ㅁ (মিউম) বর্ণটি "ম" ধ্বনি প্রকাশ করে।',
      ne: 'ㅁ (मिउम) ले "म" ध्वनि जनाउँछ।',
      ur: 'ㅁ (میئم) کی آواز "م" ہے۔',
    },
  },
  {
    id: 'hq-3',
    quizType: 'letter_to_sound',
    prompt: {
      en: 'How is the consonant ㅇ pronounced when it appears at the bottom (Batchim) of a syllable like 방?',
      bn: '방 শব্দের মতো সিলেবলের নিচে (받침) থাকলে ㅇ কীভাবে উচ্চারিত হয়?',
      ne: '방 शब्दमा जस्तै अक्षरको तल (받침) हुँदा ㅇ कसरी उच्चारण हुन्छ?',
      ur: '방 جیسے سلیبل کے نیچے (Batchim) آنے پر ㅇ کی آواز کیا ہوتی ہے؟',
    },
    koreanDisplay: '방',
    options: ['Silent', '-ng (as in song)', '-n', '-m'],
    correctIndex: 1,
    explanation: {
      en: 'ㅇ is silent at the start of a syllable, but pronounced "-ng" at the bottom.',
      bn: 'ㅇ শুরুতে নীরব থাকে, কিন্তু নিচে (받침) থাকলে "ং" (-ng) উচ্চারিত হয়।',
      ne: 'ㅇ सुरुमा मौन हुन्छ, तर तल (받침) हुँदा "ङ" (-ng) उच्चारण हुन्छ।',
      ur: 'ㅇ شروع میں خاموش ہوتا ہے لیکن نیچے آنے پر "نگ" (-ng) کی آواز دیتا ہے۔',
    },
  },
  {
    id: 'hq-4',
    quizType: 'syllable_building',
    prompt: {
      en: 'Combine ㅎ + ㅏ + ㄴ into a single Korean syllable block:',
      bn: 'ㅎ + ㅏ + ㄴ একসাথে যুক্ত করলে কোন কোরিয়ান সিলেবলটি তৈরি হয়?',
      ne: 'ㅎ + ㅏ + ㄴ मिलाउँदा कुन कोरियन अक्षर बन्छ?',
      ur: 'ㅎ + ㅏ + ㄴ کو ملانے سے کون سا کورین سلیبل بنتا ہے؟',
    },
    koreanDisplay: 'ㅎ + ㅏ + ㄴ = ?',
    options: ['하', '한', '간', '할'],
    correctIndex: 1,
    explanation: {
      en: 'ㅎ (h) + ㅏ (a) + ㄴ (n) = 한 (han).',
      bn: 'ㅎ + ㅏ + ㄴ = 한 (হান)।',
      ne: 'ㅎ + ㅏ + ㄴ = 한 (हान)।',
      ur: 'ㅎ + ㅏ + ㄴ = 한 (ہان)۔',
    },
  },
  {
    id: 'hq-5',
    quizType: 'word_reading',
    prompt: {
      en: 'What is the meaning and pronunciation of 대학교?',
      bn: '대학교 শব্দটির উচ্চারণ ও অর্থ কী?',
      ne: '대학교 शब्दको उच्चारण र अर्थ के हो?',
      ur: '대학교 کا تلفظ اور معنی کیا ہے؟',
    },
    koreanDisplay: '대학교',
    options: [
      'Daehakgyo — University',
      'Doseogwan — Library',
      'Gisuksa — Dormitory',
      'Jihacheol — Subway',
    ],
    correctIndex: 0,
    explanation: {
      en: '대학교 (daehakgyo) means University.',
      bn: '대학교 (দেহাক্কিয়ো) অর্থ বিশ্ববিদ্যালয়।',
      ne: '대학교 (देहाक्क्यो) को अर्थ विश्वविद्यालय हो।',
      ur: '대학교 (دے ہاکّیو) کا مطلب یونیورسٹی ہے۔',
    },
  },
  {
    id: 'hq-6',
    quizType: 'listening',
    prompt: {
      en: 'Listen carefully and choose the Korean word you hear:',
      bn: 'মনোযোগ দিয়ে অডিও শুনুন এবং সঠিক কোরিয়ান শব্দটি বেছে নিন:',
      ne: 'ध्यान दिएर सुन्नुहोस् र सही कोरियन शब्द छान्नुहोस्:',
      ur: 'غور سے سنیں اور درست کورین لفظ منتخب کریں:',
    },
    audioStimulusKo: '감사합니다',
    options: ['안녕하세요', '감사합니다', '죄송합니다', '괜찮아요'],
    correctIndex: 1,
    explanation: {
      en: '감사합니다 (Gamsahamnida) means Thank you.',
      bn: '감사합니다 (খামসাহামনিদা) অর্থ ধন্যবাদ।',
      ne: '감사합니다 (खाम्साहाम्निदा) को अर्थ धन्यवाद हो।',
      ur: '감사합니다 (کھامساہامنیدا) کا مطلب شکریہ ہے۔',
    },
  },
];

export interface VocabCategory18Info {
  id: string;
  order: number;
  title: QuadLangText;
  titleKo: string;
}

export const VOCAB_CATEGORIES_18: VocabCategory18Info[] = [
  { id: 'basic_words', order: 1, titleKo: '기초 필수 단어', title: { en: '1. Basic Korean Words', bn: '১. মৌলিক কোরিয়ান শব্দ', ne: '१. आधारभूत कोरियन शब्दहरू', ur: '1. بنیادی کورین الفاظ' } },
  { id: 'greetings', order: 2, titleKo: '인사 및 예절 표현', title: { en: '2. Greetings & Polite Expressions', bn: '২. শুভেচ্ছা ও ভদ্র অভিব্যক্তি', ne: '२. अभिवादन र शिष्ट अभिव्यक्ति', ur: '2. سلام و آداب کے الفاظ' } },
  { id: 'numbers', order: 3, titleKo: '숫자 및 세기', title: { en: '3. Numbers & Counting', bn: '৩. সংখ্যা ও গণনা', ne: '३. संख्या र गणना', ur: '3. گنتی اور اعداد' } },
  { id: 'days_months', order: 4, titleKo: '요일·주·월', title: { en: '4. Days, Weeks & Months', bn: '৪. বার, সপ্তাহ ও মাস', ne: '४. बार, हप्ता र महिना', ur: '4. دن، ہفتے اور مہینے' } },
  { id: 'time_dates', order: 5, titleKo: '시간 및 날짜', title: { en: '5. Time & Dates', bn: '৫. সময় ও তারিখ', ne: '५. समय र मिति', ur: '5. وقت اور تاریخ' } },
  { id: 'family_people', order: 6, titleKo: '가족 및 사람', title: { en: '6. Family & People', bn: '৬. পরিবার ও মানুষ', ne: '६. परिवार र मानिसहरू', ur: '6. خاندان اور لوگ' } },
  { id: 'food_drinks', order: 7, titleKo: '음식 및 음료', title: { en: '7. Food & Drinks', bn: '৭. খাবার ও পানীয়', ne: '७. खाना र पेय पदार्थ', ur: '7. کھانا اور مشروبات' } },
  { id: 'shopping_prices', order: 8, titleKo: '쇼핑 및 가격', title: { en: '8. Shopping & Prices', bn: '৮. কেনাকাটা ও দাম', ne: '८. किनमेल र मूल्य', ur: '8. خریداری اور قیمتیں' } },
  { id: 'transportation', order: 9, titleKo: '교통 및 길 찾기', title: { en: '9. Transportation & Directions', bn: '৯. পরিবহন ও দিকনির্দেশনা', ne: '९. यातायात र दिशा', ur: '9. ٹرانسپورٹ اور راستے' } },
  { id: 'university', order: 10, titleKo: '대학교 및 교육', title: { en: '10. University & Education', bn: '১০. বিশ্ববিদ্যালয় ও শিক্ষা', ne: '१०. विश्वविद्यालय र शिक्षा', ur: '10. یونیورسٹی اور تعلیم' } },
  { id: 'classroom', order: 11, titleKo: '강의실 어휘', title: { en: '11. Classroom Vocabulary', bn: '১১. শ্রেণিকক্ষের শব্দভাণ্ডার', ne: '११. कक्षाकोठा शब्दावली', ur: '11. کلاس روم کے الفاظ' } },
  { id: 'dormitory', order: 12, titleKo: '기숙사 및 숙소', title: { en: '12. Dormitory & Accommodation', bn: '১২. ডরমিটরি ও আবাসন', ne: '१२. छात्रावास र आवास', ur: '12. ہاسٹل اور رہائش' } },
  { id: 'hospital_health', order: 13, titleKo: '병원 및 건강', title: { en: '13. Hospital & Health', bn: '১৩. হাসপাতাল ও স্বাস্থ্য', ne: '१३. अस्पताल र स्वास्थ्य', ur: '13. ہسپتال اور صحت' } },
  { id: 'jobs_work', order: 14, titleKo: '아르바이트 및 취업', title: { en: '14. Jobs & Part-Time Work', bn: '১৪. চাকরি ও পার্ট-টাইম কাজ', ne: '१४. जागिर र पार्ट-टाइम काम', ur: '14. ملازمت اور پارٹ ٹائم کام' } },
  { id: 'travel_places', order: 15, titleKo: '여행 및 장소', title: { en: '15. Travel & Places', bn: '১৫. ভ্রমণ ও স্থান', ne: '१५. यात्रा र स्थानहरू', ur: '15. سفر اور مقامات' } },
  { id: 'everyday_conv', order: 16, titleKo: '일상 회화 표현', title: { en: '16. Everyday Conversations', bn: '১৬. দৈনন্দিন কথোপকথন', ne: '१६. दैनिक कुराकानी', ur: '16. روزمرہ گفتگو' } },
  { id: 'korean_culture', order: 17, titleKo: '한국 문화', title: { en: '17. Korean Culture', bn: '১৭. কোরিয়ান সংস্কৃতি', ne: '१७. कोरियन संस्कृति', ur: '17. کورین ثقافت' } },
  { id: 'topik_vocab', order: 18, titleKo: 'TOPIK 핵심 어휘', title: { en: '18. TOPIK Vocabulary', bn: '১৮. TOPIK পরীক্ষার শব্দভাণ্ডার', ne: '१८. TOPIK शब्दावली', ur: '18. TOPIK کے اہم الفاظ' } },
];

export interface MasterVocabWord {
  id: string;
  category18: string;
  stage: LearningStageId;
  korean: string;
  romanization: string;
  meaning: QuadLangText;
  exampleKo: string;
  exampleRomanization: string;
  exampleTranslation: QuadLangText;
}

export const FEATURED_VOCAB_18_CATEGORIES: MasterVocabWord[] = [
  { id: 'mv-1', category18: 'basic_words', stage: 'stage_1', korean: '물', romanization: 'mul', meaning: { en: 'Water', bn: 'পানি', ne: 'पानी', ur: 'پانی' }, exampleKo: '물 한 잔 주세요.', exampleRomanization: 'Mul han jan juseyo.', exampleTranslation: { en: 'Please give me a glass of water.', bn: 'দয়া করে এক গ্লাস পানি দিন।', ne: 'कृपया एक गिलास पानी दिनुहोस्।', ur: 'براہِ کرم ایک گلاس پانی دیں۔' } },
  { id: 'mv-2', category18: 'basic_words', stage: 'stage_1', korean: '오늘', romanization: 'oneul', meaning: { en: 'Today', bn: 'আজ', ne: 'आज', ur: 'آج' }, exampleKo: '오늘 날씨가 정말 좋아요.', exampleRomanization: 'Oneul nalssiga jeongmal joayo.', exampleTranslation: { en: 'The weather is really nice today.', bn: 'আজ আবহাওয়া সত্যিই চমৎকার।', ne: 'आज मौसम साँच्चै राम्रो छ।', ur: 'آج موسم واقعی بہت اچھا ہے۔' } },
  { id: 'mv-3', category18: 'greetings', stage: 'stage_2', korean: '안녕하세요', romanization: 'annyeonghaseyo', meaning: { en: 'Hello / Good day (Polite)', bn: 'হ্যালো / আসসালামু আলাইকুম / নমস্কার', ne: 'नमस्ते (शिष्ट अभिवादन)', ur: 'السلام علیکم / ہیلو (مؤدبانہ)' }, exampleKo: '안녕하세요, 만나서 반갑습니다.', exampleRomanization: 'Annyeonghaseyo, mannaseo bangapseumnida.', exampleTranslation: { en: 'Hello, nice to meet you.', bn: 'হ্যালো, আপনার সাথে দেখা হয়ে ভালো লাগলো।', ne: 'नमस्ते, तपाईंलाई भेटेर खुसी लाग्यो।', ur: 'ہیلو، آپ سے مل کر خوشی ہوئی۔' } },
  { id: 'mv-4', category18: 'greetings', stage: 'stage_2', korean: '감사합니다', romanization: 'gamsahamnida', meaning: { en: 'Thank you (Formal polite)', bn: 'ধন্যবাদ', ne: 'धन्यवाद', ur: 'شکریہ' }, exampleKo: '도와주셔서 감사합니다.', exampleRomanization: 'Dowajusyeoseo gamsahamnida.', exampleTranslation: { en: 'Thank you for helping me.', bn: 'সাহায্য করার জন্য আপনাকে ধন্যবাদ।', ne: 'सहयोग गर्नुभएकोमा धन्यवाद।', ur: 'مدد کرنے کے لیے آپ کا شکریہ۔' } },
  { id: 'mv-5', category18: 'numbers', stage: 'stage_2', korean: '하나, 둘, 셋', romanization: 'hana, dul, set', meaning: { en: 'One, Two, Three (Native Korean)', bn: 'এক, দুই, তিন (খাঁটি কোরিয়ান সংখ্যা)', ne: 'एक, दुई, तीन (मौलिक कोरियन संख्या)', ur: 'ایک، دو، تین (خالص کورین گنتی)' }, exampleKo: '커피 두 잔 주세요.', exampleRomanization: 'Keopi du jan juseyo.', exampleTranslation: { en: 'Two cups of coffee, please.', bn: 'দুই কাপ কফি দিন।', ne: 'दुई कप कफी दिनुहोस्।', ur: 'دو کپ کافی دیجیے۔' } },
  { id: 'mv-6', category18: 'numbers', stage: 'stage_2', korean: '일, 이, 삼', romanization: 'il, i, sam', meaning: { en: '1, 2, 3 (Sino-Korean for dates, money, phone)', bn: '১, ২, ৩ (তারিখ, টাকা ও ফোনের জন্য সিনো-কোরিয়ান সংখ্যা)', ne: '१, २, ३ (मिति, पैसा र फोनका लागि সिनो-कोरियन संख्या)', ur: '1، 2، 3 (تاریخ، پیسوں اور فون نمبر کے لیے سینو کورین گنتی)' }, exampleKo: '지하철 2호선을 타세요.', exampleRomanization: 'Jihacheol i-hoseoneul taseyo.', exampleTranslation: { en: 'Please take Subway Line 2.', bn: 'সাবওয়ে লাইন ২-এ উঠুন।', ne: 'कृपया सबवे लाइन २ चढ्नुहोस्।', ur: 'براہِ کرم سب وے لائن 2 لیں۔' } },
  { id: 'mv-7', category18: 'days_months', stage: 'stage_2', korean: '월요일', romanization: 'woryoil', meaning: { en: 'Monday', bn: 'সোমবার', ne: 'सोमबार', ur: 'پیر (سوموار)' }, exampleKo: '월요일에 한국어 수업이 있어요.', exampleRomanization: 'Woryoire hangugeo sueobi isseoyo.', exampleTranslation: { en: 'I have Korean class on Monday.', bn: 'সোমবার আমার কোরিয়ান ক্লাস আছে।', ne: 'सोमबार मेरो कोरियन कक्षा छ।', ur: 'پیر کو میری کورین کلاس ہے۔' } },
  { id: 'mv-8', category18: 'time_dates', stage: 'stage_2', korean: '지금 몇 시예요?', romanization: 'jigeum myeot siyeyo?', meaning: { en: 'What time is it now?', bn: 'এখন কয়টা বাজে?', ne: 'अहिले कति बज्यो?', ur: 'ابھی کیا وقت ہوا ہے؟' }, exampleKo: '지금은 오후 세 시예요.', exampleRomanization: 'Jigeumeun ohu se siyeyo.', exampleTranslation: { en: 'It is 3:00 PM now.', bn: 'এখন বিকেল তিনটা বাজে।', ne: 'अहिले दिउँसो तीन बज्यो।', ur: 'ابھی سہ پہر کے تین بجے ہیں۔' } },
  { id: 'mv-9', category18: 'family_people', stage: 'stage_2', korean: '부모님', romanization: 'bumonim', meaning: { en: 'Parents (Honorific)', bn: 'বাবা-মা (পিতামাতা)', ne: 'बुबा-आमा (अभिभावक)', ur: 'والدین' }, exampleKo: '고향에 계신 부모님께 전화했어요.', exampleRomanization: 'Gohyang-e gyesin bumonimkke jeonhwahaesseoyo.', exampleTranslation: { en: 'I called my parents in my hometown.', bn: 'দেশে থাকা বাবা-মাকে ফোন করেছি।', ne: 'गाउँमा हुनुहुने बुबा-आमालाई फोन गरेँ।', ur: 'میں نے وطن میں موجود اپنے والدین کو فون کیا۔' } },
  { id: 'mv-10', category18: 'food_drinks', stage: 'stage_2', korean: '비빔밥', romanization: 'bibimbap', meaning: { en: 'Bibimbap (Mixed rice with vegetables)', bn: 'বিবিমবাপ (সবজি ও ভাতের কোরিয়ান খাবার)', ne: 'बिबिम्बाप (मिश्रित भात र तरकारी)', ur: 'بیبم باپ (سبزیوں اور چاول کی کورین ڈش)' }, exampleKo: '고기를 빼고 야채 비빔밥으로 주세요.', exampleRomanization: 'Gogireul ppaego yachae bibimbabeuro juseyo.', exampleTranslation: { en: 'Please give me vegetable bibimbap without meat.', bn: 'মাংস ছাড়া সবজি বিবিমবাপ দিন।', ne: 'मासु नराखी शाकाहारी बिबिम्बाप दिनुहोस्।', ur: 'گوشت کے بغیر سبزی والا بیبم باپ دیجیے۔' } },
  { id: 'mv-11', category18: 'shopping_prices', stage: 'stage_2', korean: '얼마예요?', romanization: 'eolmayeyo?', meaning: { en: 'How much is it?', bn: 'দাম কত?', ne: 'कति पर्छ?', ur: 'یہ کتنے کا ہے؟ / قیمت کیا ہے؟' }, exampleKo: '이 가방은 얼마예요?', exampleRomanization: 'I gabang-eun eolmayeyo?', exampleTranslation: { en: 'How much is this bag?', bn: 'এই ব্যাগটির দাম কত?', ne: 'यो झोलाको कति पर्छ?', ur: 'اس بیگ کی قیمت کتنی ہے؟' } },
  { id: 'mv-12', category18: 'transportation', stage: 'stage_3', korean: '갈아타다 (환승하다)', romanization: 'garatada (hwanseunghada)', meaning: { en: 'To transfer (subway/bus)', bn: 'ট্রেন বা বাস পরিবর্তন করা (ট্রান্সফার)', ne: 'गाडी वा रेल परिवर्तन गर्नु (ट्रान्सफर)', ur: 'ٹرین یا بس تبدیل کرنا (ٹرانسفر)' }, exampleKo: '시청역에서 2호선으로 갈아타세요.', exampleRomanization: 'Sicheong-yeogeseo i-hoseoneuro garataseyo.', exampleTranslation: { en: 'Transfer to Line 2 at City Hall Station.', bn: 'সিটি হল স্টেশনে লাইন ২-এ পরিবর্তন করুন।', ne: 'सिटी हल स्टेशनमा लाइन २ मा परिवर्तन गर्नुहोस्।', ur: 'سٹی ہال اسٹیشن پر لائن 2 میں ٹرانسفر کریں۔' } },
  { id: 'mv-13', category18: 'university', stage: 'stage_3', korean: '장학금', romanization: 'janghakgeum', meaning: { en: 'Scholarship', bn: 'স্কলারশিপ / শিক্ষাবৃত্তি', ne: 'छात्रवृत्ति', ur: 'اسکالرشپ / تعلیمی وظیفہ' }, exampleKo: '이번 학기에 성적 장학금을 받았어요.', exampleRomanization: 'Ibeon hakgie seongjeok janghakgeumeul badasseoyo.', exampleTranslation: { en: 'I received a merit scholarship this semester.', bn: 'এই সেমিস্টারে আমি মেধা স্কলারশিপ পেয়েছি।', ne: 'यस सेमेस्टरमा मैले जेहेन्दार छात्रवृत्ति पाएँ।', ur: 'اس سمسٹر میں مجھے میرٹ اسکالرشپ ملی ہے۔' } },
  { id: 'mv-14', category18: 'classroom', stage: 'stage_3', korean: '과제 / 발표', romanization: 'gwaje / balpyo', meaning: { en: 'Assignment / Presentation', bn: 'অ্যাসাইনমেন্ট / প্রেজেন্টেশন', ne: 'गृहकार्य (असाइनमेन्ट) / प्रस्तुति', ur: 'اسائنمنٹ / پریزنٹیشن' }, exampleKo: '내일까지 조별 과제를 제출해야 해요.', exampleRomanization: 'Naeilkkaji jobyeol gwajereul jechulhaeya haeyo.', exampleTranslation: { en: 'We must submit the group assignment by tomorrow.', bn: 'আগামীকালের মধ্যে গ্রুপ অ্যাসাইনমেন্ট জমা দিতে হবে।', ne: 'भोलिसम्म समूह असाइनमेन्ट बुझाउनुपर्छ।', ur: 'ہمیں کل تک گروپ اسائنمنٹ جمع کروانی ہے۔' } },
  { id: 'mv-15', category18: 'dormitory', stage: 'stage_3', korean: '기숙사 룸메이트', romanization: 'gisuksa rummeiteu', meaning: { en: 'Dormitory roommate', bn: 'ডরমিটরি রুমমেট', ne: 'होस्टेल रुममेट', ur: 'ہاسٹل کا روم میٹ' }, exampleKo: '제 기숙사 룸메이트는 정말 친절해요.', exampleRomanization: 'Je gisuksa rummeiteuneun jeongmal chinjeolhaeyo.', exampleTranslation: { en: 'My dormitory roommate is very kind.', bn: 'আমার ডরমিটরি রুমমেট খুব আন্তরিক।', ne: 'मेरो होस्टेलको रुममेट निकै मिलनसार हुनुहुन्छ।', ur: 'میرا ہاسٹل روم میٹ بہت مہربان ہے۔' } },
  { id: 'mv-16', category18: 'hospital_health', stage: 'stage_3', korean: '처방전', romanization: 'cheobangjeon', meaning: { en: 'Medical prescription', bn: 'ডাক্তারের প্রেসক্রিপশন', ne: 'डाक्टरको प्रेस्क्रिप्सन', ur: 'ڈاکٹر کا نسخہ (پریسکرپশন)' }, exampleKo: '처방전을 가지고 약국에 가세요.', exampleRomanization: 'Cheobangjeoneul gajigo yakguge gaseyo.', exampleTranslation: { en: 'Take the prescription to the pharmacy.', bn: 'প্রেসক্রিপশনটি নিয়ে ফার্মেসিতে যান।', ne: 'प्रेस्क्रिप्सन लिएर औषधि पसलमा जानुहोस्।', ur: 'نسخہ لے کر فارمیسی جائیں۔' } },
  { id: 'mv-17', category18: 'jobs_work', stage: 'stage_4', korean: '시간제 취업 허가', romanization: 'siganje chwieop heoga', meaning: { en: 'Part-time work permit (Immigration S-3)', bn: 'পার্ট-টাইম কাজের অনুমতি (ইমিগ্রেশন পারমিট)', ne: 'पार्ट-टाइम काम गर्ने अनुमति', ur: 'پارٹ ٹائم کام کا اجازت نامہ (امیگریشن پرمٹ)' }, exampleKo: '아르바이트를 시작하기 전에 시간제 취업 허가를 받아야 합니다.', exampleRomanization: 'Areubaiteureul sijakhagi jeone siganje chwieop heogareul badaya hamnida.', exampleTranslation: { en: 'You must obtain a part-time work permit before starting a part-time job.', bn: 'পার্ট-টাইম কাজ শুরু করার আগে অবশ্যই কাজের অনুমতি নিতে হবে।', ne: 'पार्ट-टाइम काम सुरु गर्नुअघि अनुमति लिनुपर्छ।', ur: 'پارٹ ٹائم ملازمت شروع کرنے سے پہلے کام کا اجازت نامہ حاصل کرنا ضروری ہے۔' } },
  { id: 'mv-18', category18: 'travel_places', stage: 'stage_3', korean: '출입국관리사무소', romanization: 'churipguk-gwalli-samuso', meaning: { en: 'Immigration Office', bn: 'ইমিগ্রেশন অফিস', ne: 'अध्यागमन कार्यालय', ur: 'امیگریشن آفس' }, exampleKo: '외국인등록증을 만들러 출입국관리사무소에 갔어요.', exampleRomanization: 'Oegugindeungnokjeungeul mandeulleo churipguk-gwalli-samusoe gasseoyo.', exampleTranslation: { en: 'I went to the Immigration Office to apply for my ARC.', bn: 'এআরসি (ARC) কার্ড করার জন্য ইমিগ্রেশন অফিসে গিয়েছিলাম।', ne: 'ARC कार्ड बनाउन अध्यागमन कार्यालय गएँ।', ur: 'میں اپنا اے آر سی (ARC) کارڈ بنوانے امیگریشن آفس گیا۔' } },
  { id: 'mv-19', category18: 'everyday_conv', stage: 'stage_2', korean: '잠시만요', romanization: 'jamsimanyo', meaning: { en: 'Just a moment / Excuse me (passing through)', bn: 'একটু অপেক্ষা করুন / এক্সকিউজ মি', ne: 'एकैछिन है / माफ गर्नुहोस्', ur: 'ذرا ٹھہریے / معاف کیجیے (راستہ لیتے وقت)' }, exampleKo: '잠시만요, 이번에 내립니다.', exampleRomanization: 'Jamsimanyo, ibeone naerimnida.', exampleTranslation: { en: 'Excuse me, I am getting off at this stop.', bn: 'এক্সকিউজ মি, আমি এই স্টপেজে নামব।', ne: 'माफ गर्नुहोस्, म यस स्टेशनमा ओर्लन्छु।', ur: 'معاف کیجیے، میں اس اسٹاپ پر اتر رہا ہوں۔' } },
  { id: 'mv-20', category18: 'korean_culture', stage: 'stage_3', korean: '존댓말 / 반말', romanization: 'jondaetmal / banmal', meaning: { en: 'Polite Honorific Speech / Casual Speech', bn: 'সম্মানসূচক ভাষা (জনদেনমাল) / ঘরোয়া ভাষা (বানমাল)', ne: 'आदरार्थी भाषा (존댓말) / सामान्य बोली (반말)', ur: 'مؤدبانہ گفتگو (존댓말) / بے تکلف گفتگو (반말)' }, exampleKo: '처음 만나는 사람에게는 존댓말을 사용해야 합니다.', exampleRomanization: 'Cheoeum mannaneun saramegeneun jondaetmareul sayonghaeya hamnida.', exampleTranslation: { en: 'You should use polite speech with people you meet for the first time.', bn: 'প্রথমবার পরিচিত কারো সাথে সম্মানসূচক ভাষা ব্যবহার করা উচিত।', ne: 'पहिलो पटक भेटेको व्यक्तिसँग आदरार्थी भाषा प्रयोग गर्नुपर्छ।', ur: 'پہلی بار ملنے والے شخص سے مؤدبانہ زبان استعمال کرنی چاہیے۔' } },
  { id: 'mv-21', category18: 'topik_vocab', stage: 'stage_5', korean: '해결하다 / 증가하다', romanization: 'haegyeolhada / jeunggahada', meaning: { en: 'To solve / To increase (TOPIK II essential verbs)', bn: 'সমাধান করা / বৃদ্ধি পাওয়া (TOPIK II)', ne: 'समाधान गर्नु / বৃদ্ধি हुनु (TOPIK II)', ur: 'حل کرنا / اضافہ ہونا (TOPIK II کے اہم الفاظ)' }, exampleKo: '유학생 수가 매년 꾸준히 증가하고 있다.', exampleRomanization: 'Yuhaksaeng suga maenyeon kkujunhi jeunggahago itda.', exampleTranslation: { en: 'The number of international students is steadily increasing every year.', bn: 'প্রতি বছর বিদেশি শিক্ষার্থীর সংখ্যা ধারাবাহিকভাবে বৃদ্ধি পাচ্ছে।', ne: 'अन्तर्राष्ट्रिय विद्यार्थीहरूको संख्या हरेक वर्ष निरन्तर बढिरहेको छ।', ur: 'بین الاقوامی طلباء کی تعداد میں ہر سال مسلسل اضافہ ہو رہا ہے۔' } },
];
