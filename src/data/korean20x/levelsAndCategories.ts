import { LearningExplanationLang } from '../../utils/hangulPhonetics';

export type CurriculumLevelId =
  | 'Absolute Beginner'
  | 'Beginner 1'
  | 'Beginner 2'
  | 'Elementary'
  | 'Pre-Intermediate'
  | 'Intermediate'
  | 'Upper Intermediate'
  | 'Advanced'
  | 'TOPIK I'
  | 'TOPIK II';

export type VocabTopicId =
  | 'daily_life'
  | 'university'
  | 'immigration'
  | 'employment'
  | 'business'
  | 'healthcare'
  | 'shopping'
  | 'transportation'
  | 'housing'
  | 'banking'
  | 'technology'
  | 'relationships'
  | 'emergencies'
  | 'korean_culture'
  | 'topik';

export interface CurriculumLevelMeta {
  id: CurriculumLevelId;
  order: number;
  codeKo: string;
  cefrBand: string;
  difficultyBucket: 'Beginner' | 'Intermediate' | 'Advanced';
  titleEn: string;
  titleBn: string;
  titleNe: string;
  summaryEn: string;
  summaryBn: string;
  summaryNe: string;
  milestonesEn: string[];
  milestonesBn: string[];
  milestonesNe: string[];
}

export interface VocabTopicMeta {
  id: VocabTopicId;
  order: number;
  nameKo: string;
  nameEn: string;
  nameBn: string;
  nameNe: string;
  descriptionEn: string;
  descriptionBn: string;
  descriptionNe: string;
  iconName: string;
}

export interface KoreanVocab20xItem {
  id: string;
  topic: VocabTopicId;
  categoryId: string; // Backward compatible with AcademyVocabItem
  korean: string;
  pronunciationBn: string;
  pronunciationNe: string;
  romanization: string;
  meaningBn: string;
  meaningNe: string;
  meaningEn: string;
  partOfSpeech: 'Noun' | 'Verb' | 'Adjective' | 'Adverb' | 'Expression' | 'Phrase';
  level: CurriculumLevelId;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  exampleKo: string;
  examplePronBn: string;
  examplePronNe: string;
  exampleRomanization: string;
  exampleBn: string;
  exampleNe: string;
  exampleEn: string;
  relatedWords: string[];
  synonyms: string[];
  audioUrl?: string;
  published?: boolean;
  reviewStatus?: 'approved' | 'pending_ai_review' | 'draft';
}

export interface DailyExpression20x {
  id: string;
  topic: VocabTopicId;
  level: CurriculumLevelId;
  korean: string;
  pronunciationBn: string;
  pronunciationNe: string;
  romanization: string;
  meaningBn: string;
  meaningNe: string;
  meaningEn: string;
  usageTipBn: string;
  usageTipNe: string;
  usageTipEn: string;
  politeness: 'Formal (합쇼체)' | 'Polite (해요체)' | 'Casual (반말)';
}

export interface KoreanGrammar20xUnit {
  id: string;
  order: number;
  level: CurriculumLevelId;
  patternKo: string;
  titleEn: string;
  titleBn: string;
  titleNe: string;
  formula: string;
  explanationEn: string;
  explanationBn: string;
  explanationNe: string;
  conjugationRuleEn: string;
  conjugationRuleBn: string;
  conjugationRuleNe: string;
  examples: {
    ko: string;
    pronBn: string;
    pronNe: string;
    romanization: string;
    en: string;
    bn: string;
    ne: string;
  }[];
  quizQuestion: {
    promptEn: string;
    promptBn: string;
    promptNe: string;
    options: string[];
    correctIndex: number;
    explanationEn: string;
    explanationBn: string;
    explanationNe: string;
  };
}

export interface ScenarioDialogueTurn {
  speakerKo: string;
  speakerRoleEn: string;
  speakerRoleBn: string;
  speakerRoleNe: string;
  korean: string;
  pronunciationBn: string;
  pronunciationNe: string;
  romanization: string;
  meaningBn: string;
  meaningNe: string;
  meaningEn: string;
}

export interface RealLifeScenario20x {
  id: string;
  domainId: string;
  domainOrder: number;
  domainTitleEn: string;
  domainTitleBn: string;
  domainTitleNe: string;
  titleKo: string;
  titleEn: string;
  titleBn: string;
  titleNe: string;
  level: CurriculumLevelId;
  settingEn: string;
  settingBn: string;
  settingNe: string;
  keyVocab: {
    korean: string;
    pronBn: string;
    pronNe: string;
    romanization: string;
    en: string;
    bn: string;
    ne: string;
  }[];
  dialogue: ScenarioDialogueTurn[];
  practiceExercise: {
    questionEn: string;
    questionBn: string;
    questionNe: string;
    options: string[];
    correctIndex: number;
    explanationEn: string;
    explanationBn: string;
    explanationNe: string;
  };
  published?: boolean;
  reviewStatus?: 'approved' | 'pending_ai_review' | 'draft';
}

export interface ListeningExercise20x {
  id: string;
  level: CurriculumLevelId;
  topic: VocabTopicId;
  titleEn: string;
  titleBn: string;
  titleNe: string;
  audioScriptKo: string;
  pronunciationBn: string;
  pronunciationNe: string;
  romanization: string;
  questionEn: string;
  questionBn: string;
  questionNe: string;
  options: string[];
  correctIndex: number;
  explanationEn: string;
  explanationBn: string;
  explanationNe: string;
}

export interface ReadingPassage20x {
  id: string;
  level: CurriculumLevelId;
  topic: VocabTopicId;
  genre: 'Notice' | 'Message' | 'Menu/Sign' | 'Email' | 'Article' | 'TOPIK Passage';
  titleKo: string;
  titleEn: string;
  titleBn: string;
  titleNe: string;
  passageKo: string;
  translationEn: string;
  translationBn: string;
  translationNe: string;
  questionEn: string;
  questionBn: string;
  questionNe: string;
  options: string[];
  correctIndex: number;
  explanationEn: string;
  explanationBn: string;
  explanationNe: string;
}

export interface SpeakingChallenge20x {
  id: string;
  level: CurriculumLevelId;
  topic: VocabTopicId;
  situationEn: string;
  situationBn: string;
  situationNe: string;
  targetKorean: string;
  pronunciationBn: string;
  pronunciationNe: string;
  romanization: string;
  meaningEn: string;
  meaningBn: string;
  meaningNe: string;
  coachingTipEn: string;
  coachingTipBn: string;
  coachingTipNe: string;
}

export interface SentenceBuilder20x {
  id: string;
  level: CurriculumLevelId;
  topic: VocabTopicId;
  promptEn: string;
  promptBn: string;
  promptNe: string;
  correctTiles: string[];
  distractorTiles: string[];
  fullKorean: string;
  pronunciationBn: string;
  pronunciationNe: string;
  romanization: string;
  grammarHintEn: string;
  grammarHintBn: string;
  grammarHintNe: string;
}

export interface PronunciationDrill20x {
  id: string;
  ruleCategory:
    | 'Minimal Pair'
    | 'Liaison (연음)'
    | 'Nasalization (비음화)'
    | 'Batchim (받침)'
    | 'Aspiration (격음화)'
    | 'Palatalization (구개음화)'
    | 'Liquidization (유음화)'
    | 'Tensification (경음화)';
  level: CurriculumLevelId;
  writtenKo: string;
  spokenSurfaceKo: string;
  pronunciationBn: string;
  pronunciationNe: string;
  romanization: string;
  meaningEn: string;
  meaningBn: string;
  meaningNe: string;
  ruleTipEn: string;
  ruleTipBn: string;
  ruleTipNe: string;
}

export interface LessonPathUnit20x {
  id: string;
  order: number;
  level: CurriculumLevelId;
  topic: VocabTopicId;
  titleKo: string;
  titleEn: string;
  titleBn: string;
  titleNe: string;
  estimatedMinutes: number;
  summaryEn: string;
  summaryBn: string;
  summaryNe: string;
  focusPointsKo: string[];
  grammarRefId?: string;
  scenarioRefId?: string;
  published?: boolean;
  reviewStatus?: 'approved' | 'pending_ai_review' | 'draft';
}

export interface QuizSet20x {
  id: string;
  order: number;
  titleEn: string;
  titleBn: string;
  titleNe: string;
  category: 'Vocabulary' | 'Grammar' | 'Listening' | 'Reading' | 'Scenario' | 'TOPIK I Mock' | 'TOPIK II Mock';
  level: CurriculumLevelId;
  topic: VocabTopicId;
  durationMinutes: number;
  questionIds: string[];
}

export interface DailyChallenge20x {
  id: string;
  dayNumber: number;
  titleEn: string;
  titleBn: string;
  titleNe: string;
  level: CurriculumLevelId;
  wordOfDayKo: string;
  expressionKo: string;
  sentenceTileTaskKo: string;
  speakingPromptKo: string;
  miniQuizPromptEn: string;
  miniQuizPromptBn: string;
  miniQuizPromptNe: string;
  miniQuizOptions: string[];
  miniQuizCorrectIndex: number;
}

export const CURRICULUM_LEVELS_20X: CurriculumLevelMeta[] = [
  {
    id: 'Absolute Beginner',
    order: 1,
    codeKo: '입문 (0급)',
    cefrBand: 'Pre-A1',
    difficultyBucket: 'Beginner',
    titleEn: 'Absolute Beginner',
    titleBn: 'একদম শুরু (Absolute Beginner)',
    titleNe: 'पूर्ण शुरुआती (Absolute Beginner)',
    summaryEn: 'Master Hangul vowels, consonants, double letters, batchim, syllable blocks, and first survival greetings.',
    summaryBn: 'হাঙ্গুল স্বরবর্ণ, ব্যঞ্জনবর্ণ, যুক্তবর্ণ, বাতছিম, সিলেবল ব্লক এবং প্রথম দৈনন্দিন সম্ভাষণ শিখুন।',
    summaryNe: 'हंगुल स्वर, व्यञ्जन, संयुक्त अक्षर, बातछिम, अक्षर संरचना र प्राथमिक अभिवादन सिक्नुहोस्।',
    milestonesEn: ['Read any Hangul sign in 5 seconds', 'Pronounce all 40 letters accurately', 'Introduce yourself politely'],
    milestonesBn: ['৫ সেকেন্ডে যেকোনো হাঙ্গুল সাইন পড়া', '৪০টি বর্ণ সঠিক উচ্চারণ করা', 'ভদ্রভাবে নিজের পরিচয় দেওয়া'],
    milestonesNe: ['५ सेकेन्डमा कुनै पनि हंगुल साइन पढ्ने', 'सबै ४० अक्षर शुद्ध उच्चारण गर्ने', 'विनम्रतापूर्वक आफ्नो परिचय दिने'],
  },
  {
    id: 'Beginner 1',
    order: 2,
    codeKo: '초급 1 (1A)',
    cefrBand: 'A1.1',
    difficultyBucket: 'Beginner',
    titleEn: 'Beginner 1',
    titleBn: 'প্রাথমিক ১ (Beginner 1)',
    titleNe: 'प्रारम्भिक १ (Beginner 1)',
    summaryEn: 'Build core sentences with topic/subject particles, Sino & Native Korean numbers, dates, prices, and cafe ordering.',
    summaryBn: 'টপিক/সাবজেক্ট পার্টিকেল, কোরিয়ান সংখ্যা, তারিখ, দাম এবং ক্যাফেতে অর্ডার করার মৌলিক বাক্য গঠন।',
    summaryNe: 'वाक्यका कारक चिन्ह, कोरियन संख्या, मिति, मूल्य र क्याफेमा अर्डर गर्ने आधारभूत वाक्य निर्माण।',
    milestonesEn: ['Use 은/는, 이/가, 을/를 naturally', 'Count money in KRW & tell time', 'Order food and drinks'],
    milestonesBn: ['은/는, 이/가, 을/를 সঠিকভাবে ব্যবহার', 'ওন (KRW) হিসাব ও সময় বলা', 'খাবার ও পানীয় অর্ডার করা'],
    milestonesNe: ['은/는, 이/가, 을/를 सही प्रयोग गर्ने', 'कोरियन वोन (KRW) र समय बताउने', 'खाना र पेय अर्डर गर्ने'],
  },
  {
    id: 'Beginner 2',
    order: 3,
    codeKo: '초급 2 (1B)',
    cefrBand: 'A1.2',
    difficultyBucket: 'Beginner',
    titleEn: 'Beginner 2',
    titleBn: 'প্রাথমিক ২ (Beginner 2)',
    titleNe: 'प्रारम्भिक २ (Beginner 2)',
    summaryEn: 'Express past, present, and future plans, directions, subway transfers, shopping returns, and dormitory routines.',
    summaryBn: 'অতীত, বর্তমান ও ভবিষ্যৎ পরিকল্পনা, রাস্তা খোঁজা, সাবওয়ে ট্রান্সফার, কেনাকাটা ও ডরমিটরি জীবন।',
    summaryNe: 'भूत, वर्तमान र भविष्यका योजना, बाटो सोध्ने, सबवे ट्रान्सफर, किनमेल र होस्टेल जीवन।',
    milestonesEn: ['Conjugate irregular verbs (ㅂ/ㄷ/ㄹ)', 'Navigate Korean subways & buses', 'Describe symptoms at a pharmacy'],
    milestonesBn: ['অনিয়মিত ক্রিয়া (ㅂ/ㄷ/ㄹ) রূপান্তর', 'কোরিয়ান সাবওয়ে ও বাসে চলাচল', 'ফার্মেসিতে শারীরিক সমস্যার কথা বলা'],
    milestonesNe: ['अनियमित क्रियापद (ㅂ/ㄷ/ㄹ) रूपान्तरण', 'कोरियन सबवे र बसमा यात्रा गर्ने', 'फार्मेसीमा स्वास्थ्य समस्या बताउने'],
  },
  {
    id: 'Elementary',
    order: 4,
    codeKo: '초중급 (2A)',
    cefrBand: 'A2',
    difficultyBucket: 'Beginner',
    titleEn: 'Elementary',
    titleBn: 'এলিমেন্টারি (Elementary)',
    titleNe: 'आधारभूत (Elementary)',
    summaryEn: 'Handle real campus administration, ARC registration, bank account setup, hospital visits, and part-time job interviews.',
    summaryBn: 'ক্যাম্পাস প্রশাসন, এআরসি কার্ড, ব্যাংক অ্যাকাউন্ট খোলা, হাসপাতাল ভিজিট ও পার্ট-টাইম কাজের ইন্টারভিউ।',
    summaryNe: 'क्याम्पस प्रशासन, ARC कार्ड, बैंक खाता खोल्ने, अस्पताल भेट र पार्ट-टाइम कामको अन्तर्वार्ता।',
    milestonesEn: ['Connect clauses with -아서/어서 & -(으)니까', 'Complete ARC & bank paperwork', 'Pass an alba interview'],
    milestonesBn: ['-아서/어서 ও -(으)니까 দিয়ে বাক্য যুক্ত করা', 'এআরসি ও ব্যাংকের ফর্ম পূরণ', 'আলবা ইন্টারভিউতে কথা বলা'],
    milestonesNe: ['-아서/어서 र -(으)니까 प्रयोग गरी वाक्य जोड्ने', 'ARC र बैंक फारम पूरा गर्ने', 'पार्ट-टाइम कामको अन्तर्वार्ता दिने'],
  },
  {
    id: 'Pre-Intermediate',
    order: 5,
    codeKo: '중급 입문 (2B)',
    cefrBand: 'A2+/B1.1',
    difficultyBucket: 'Intermediate',
    titleEn: 'Pre-Intermediate',
    titleBn: 'প্রাক-মাধ্যমিক (Pre-Intermediate)',
    titleNe: 'पूर्व-मध्यम (Pre-Intermediate)',
    summaryEn: 'Master honorific speech (높임말) for professors and managers, housing contracts, telecom plans, and polite requests.',
    summaryBn: 'প্রফেসর ও ম্যানেজারদের সাথে সম্মানসূচক ভাষা (높임말), বাসা ভাড়ার চুক্তি, সিম প্ল্যান ও ভদ্র অনুরোধ।',
    summaryNe: 'प्रोफेसर र म्यानेजरसँग आदरार्थी भाषा (높임말), कोठा भाडा सम्झौता, मोबाइल सिम र विनम्र अनुरोध।',
    milestonesEn: ['Speak respectfully to professors & bosses', 'Understand one-room lease terms', 'Resolve delivery & billing issues'],
    milestonesBn: ['প্রফেসর ও বসের সাথে সম্মানসূচক কথা', 'ওয়ান-রুম ভাড়ার শর্ত বোঝা', 'ডেলিভারি ও বিলের সমস্যা সমাধান'],
    milestonesNe: ['प्रोफेसर र वरिष्ठसँग आदरपूर्वक बोल्ने', 'वान-रुम भाडाका सर्त बुझ्ने', 'डेलिभरी र बिल समस्या समाधान गर्ने'],
  },
  {
    id: 'Intermediate',
    order: 6,
    codeKo: '중급 (3급)',
    cefrBand: 'B1',
    difficultyBucket: 'Intermediate',
    titleEn: 'Intermediate',
    titleBn: 'মাধ্যমিক (Intermediate)',
    titleNe: 'मध्यम (Intermediate)',
    summaryEn: 'Communicate fluently with indirect speech, workplace collaboration, academic presentations, and immigration renewals.',
    summaryBn: 'পরোক্ষ উক্তি, কর্মক্ষেত্রে সমন্বয়, বিশ্ববিদ্যালয়ের প্রেজেন্টেশন এবং ভিসা নবায়ন বিষয়ে সাবলীল যোগাযোগ।',
    summaryNe: 'अप्रत्यक्ष कथन, कार्यस्थल सहकार्य, विश्वविद्यालय प्रस्तुति र भिसा नवीकरणमा धाराप्रवाह संवाद।',
    milestonesEn: ['Use indirect quotation (-다고/냐고/자고)', 'Deliver a 5-minute class presentation', 'Handle labor rights & wage inquiries'],
    milestonesBn: ['পরোক্ষ উক্তি (-다고/냐고/자고) ব্যবহার', '৫ মিনিটের ক্লাস প্রেজেন্টেশন দেওয়া', 'শ্রম আইন ও বেতন নিয়ে কথা বলা'],
    milestonesNe: ['अप्रत्यक्ष कथन (-다고/냐고/자고) प्रयोग', '५ मिनेटको कक्षा प्रस्तुति दिने', 'श्रम अधिकार र तलबबारे कुरा गर्ने'],
  },
  {
    id: 'Upper Intermediate',
    order: 7,
    codeKo: '중고급 (4급)',
    cefrBand: 'B2',
    difficultyBucket: 'Intermediate',
    titleEn: 'Upper Intermediate',
    titleBn: 'উচ্চ-মাধ্যমিক (Upper Intermediate)',
    titleNe: 'उच्च-मध्यम (Upper Intermediate)',
    summaryEn: 'Read Korean news, write formal business emails, debate social topics, and understand idiomatic expressions.',
    summaryBn: 'কোরিয়ান সংবাদ পড়া, ফরমাল বিজনেস ইমেইল লেখা, সামাজিক বিষয়ে মতামত প্রকাশ এবং বাগধারা বোঝা।',
    summaryNe: 'कोरियन समाचार पढ्ने, औपचारिक व्यावसायिक इमेल लेख्ने, सामाजिक विषयमा बहस र टुक्का बुझ्ने।',
    milestonesEn: ['Write professional emails to professors/HR', 'Comprehend Korean TV news summaries', 'Express nuanced cause & contrast'],
    milestonesBn: ['প্রফেসর/এইচআর-কে প্রফেশনাল ইমেইল লেখা', 'কোরিয়ান টিভি সংবাদের মূলভাব বোঝা', 'সূক্ষ্ম কারণ ও তুলনা প্রকাশ করা'],
    milestonesNe: ['प्रोफेसर/HR लाई व्यावसायिक इमेल लेख्ने', 'कोरियन टिभी समाचारको सार बुझ्ने', 'सूक्ष्म कारण र तुलना व्यक्त गर्ने'],
  },
  {
    id: 'Advanced',
    order: 8,
    codeKo: '고급 (5–6급)',
    cefrBand: 'C1',
    difficultyBucket: 'Advanced',
    titleEn: 'Advanced',
    titleBn: 'উন্নত স্তর (Advanced)',
    titleNe: 'उच्च तह (Advanced)',
    summaryEn: 'Academic research Korean, corporate negotiations, legal/policy terminology, E-7/F-2-7 professional fluency.',
    summaryBn: 'একাডেমিক গবেষণা, কর্পোরেট আলোচনা, আইন ও নীতিমালা সংক্রান্ত পরিভাষা এবং E-7/F-2-7 পেশাগত দক্ষতা।',
    summaryNe: 'प्राज्ञिक अनुसन्धान, कर्पोरेट वार्ता, कानुनी/नीतिगत शब्दावली र E-7/F-2-7 व्यावसायिक दक्षता।',
    milestonesEn: ['Draft thesis abstracts & corporate reports', 'Master Sino-Korean four-character idioms', 'Succeed in Korean corporate interviews'],
    milestonesBn: ['থিসিস অ্যাবস্ট্রাক্ট ও কর্পোরেট রিপোর্ট লেখা', 'চার-অক্ষরের প্রবাদ (사자성어) আয়ত্ত করা', 'কোরিয়ান কোম্পানির ইন্টারভিউতে সাফল্য'],
    milestonesNe: ['थेसिस सारांश र कर्पोरेट रिपोर्ट लेख्ने', 'चार-अक्षरका उखान (사자성어) जान्ने', 'कोरियन कम्पनीको अन्तर्वार्तामा सफलता'],
  },
  {
    id: 'TOPIK I',
    order: 9,
    codeKo: 'TOPIK I (1–2급)',
    cefrBand: 'TOPIK Level 1–2',
    difficultyBucket: 'Beginner',
    titleEn: 'TOPIK I Preparation',
    titleBn: 'TOPIK I প্রস্তুতি (লেভেল ১–২)',
    titleNe: 'TOPIK I तयारी (तह १–२)',
    summaryEn: 'Targeted preparation for TOPIK I Listening (30 Qs) and Reading (40 Qs) with high-frequency vocabulary & mock exams.',
    summaryBn: 'TOPIK I লিসেনিং ও রিডিং পরীক্ষার জন্য উচ্চ-ফ্রিকোয়েন্সি শব্দভাণ্ডার, ব্যাকরণ ও পূর্ণাঙ্গ মক টেস্ট।',
    summaryNe: 'TOPIK I सुनाइ र पढाइ परीक्षाका लागि उच्च-आवृत्ति शब्दावली, व्याकरण र पूर्ण नमुना परीक्षा।',
    milestonesEn: ['Score 140+/200 for TOPIK Level 2', 'Master 1,800+ core TOPIK I words', 'Solve timed Listening & Reading mocks'],
    milestonesBn: ['TOPIK Level 2 পেতে ১৪০+/২০০ অর্জন', '১,৮০০+ কোর TOPIK I শব্দ আয়ত্ত', 'টাইমড লিসেনিং ও রিডিং মক সমাধান'],
    milestonesNe: ['TOPIK Level 2 का लागि १४०+/२०० अंक ल्याउने', '१,८००+ मुख्य TOPIK I शब्द जान्ने', 'समयबद्ध सुनाइ र पढाइ नमुना हल गर्ने'],
  },
  {
    id: 'TOPIK II',
    order: 10,
    codeKo: 'TOPIK II (3–6급)',
    cefrBand: 'TOPIK Level 3–6',
    difficultyBucket: 'Advanced',
    titleEn: 'TOPIK II Preparation',
    titleBn: 'TOPIK II প্রস্তুতি (লেভেল ৩–৬)',
    titleNe: 'TOPIK II तयारी (तह ३–६)',
    summaryEn: 'Comprehensive TOPIK II Listening, Reading, and Essay Writing (Q51–Q54) training for GKS scholarships, graduation & visas.',
    summaryBn: 'GKS স্কলারশিপ, গ্র্যাজুয়েশন ও ভিসার জন্য TOPIK II লিসেনিং, রিডিং ও রাইটিং (Q51–Q54) পূর্ণাঙ্গ প্রস্তুতি।',
    summaryNe: 'GKS छात्रवृत्ति, स्नातक र भिसाका लागि TOPIK II सुनाइ, पढाइ र लेखन (Q51–Q54) को पूर्ण तयारी।',
    milestonesEn: ['Achieve TOPIK Level 4–6 for university & E-7', 'Master Q53 data charts & Q54 argumentative essays', 'Conquer academic & editorial reading passages'],
    milestonesBn: ['বিশ্ববিদ্যালয় ও E-7 ভিসার জন্য লেভেল ৪–৬ অর্জন', 'Q53 গ্রাফ বিশ্লেষণ ও Q54 প্রবন্ধ রচনা আয়ত্ত', 'একাডেমিক ও সম্পাদকীয় অনুচ্ছেদ দ্রুত সমাধান'],
    milestonesNe: ['विश्वविद्यालय र E-7 भिसाका लागि तह ४–६ प्राप्त गर्ने', 'Q53 चार्ट विश्लेषण र Q54 निबन्ध लेखनमा दक्षता', 'प्राज्ञिक र सम्पादकीय अनुच्छेद छिटो हल गर्ने'],
  },
];

export const VOCAB_TOPICS_20X: VocabTopicMeta[] = [
  {
    id: 'daily_life',
    order: 1,
    nameKo: '일상생활',
    nameEn: 'Daily Life',
    nameBn: 'দৈনন্দিন জীবন',
    nameNe: 'दैनिक जीवन',
    descriptionEn: 'Everyday greetings, food, dining, weather, time, routines, and polite conversations.',
    descriptionBn: 'প্রাত্যহিক শুভেচ্ছা, খাবার, রেস্তোরাঁ, আবহাওয়া, সময়, রুটিন ও ভদ্র কথোপকথন।',
    descriptionNe: 'दैनिक अभिवादन, खाना, रेस्टुरेन्ट, मौसम, समय, दिनचर्या र विनम्र कुराकानी।',
    iconName: 'MessageCircle',
  },
  {
    id: 'university',
    order: 2,
    nameKo: '대학 및 학업',
    nameEn: 'University',
    nameBn: 'বিশ্ববিদ্যালয় ও শিক্ষা',
    nameNe: 'विश्वविद्यालय र अध्ययन',
    descriptionEn: 'Admissions, course registration, lectures, professors, scholarships, thesis, and campus life.',
    descriptionBn: 'ভর্তি, কোর্স রেজিস্ট্রেশন, লেকচার, প্রফেসর, স্কলারশিপ, থিসিস ও ক্যাম্পাস জীবন।',
    descriptionNe: 'भर्ना, कोर्स दर्ता, कक्षा, प्रोफेसर, छात्रवृत्ति, थेसिस र क्याम्पस जीवन।',
    iconName: 'GraduationCap',
  },
  {
    id: 'immigration',
    order: 3,
    nameKo: '출입국 및 비자',
    nameEn: 'Immigration',
    nameBn: 'ইমিগ্রেশন ও ভিসা',
    nameNe: 'अध्यागमन र भिसा',
    descriptionEn: 'Incheon arrival, D-2/D-4/E-9/E-7 visas, ARC card registration, HiKorea extensions, and permits.',
    descriptionBn: 'ইনছন বিমানবন্দর, D-2/D-4/E-9/E-7 ভিসা, এআরসি কার্ড, হাইকোরিয়া ভিসা মেয়াদ বৃদ্ধি ও অনুমতি।',
    descriptionNe: 'इन्चोन विमानस्थल, D-2/D-4/E-9/E-7 भिसा, ARC कार्ड, हाइकोरिया म्याद थप र अनुमति।',
    iconName: 'Compass',
  },
  {
    id: 'employment',
    order: 4,
    nameKo: '취업 및 아르바이트',
    nameEn: 'Employment',
    nameBn: 'চাকরি ও পার্ট-টাইম কাজ',
    nameNe: 'रोजगारी र पार्ट-টাইम काम',
    descriptionEn: 'Part-time jobs (alba), labor contracts, minimum wage, workplace safety, shifts, and severance pay.',
    descriptionBn: 'পার্ট-টাইম কাজ (আলবা), শ্রম চুক্তি, ন্যূনতম মজুরি, কর্মক্ষেত্রের নিরাপত্তা, শিফট ও বেতন।',
    descriptionNe: 'पार्ट-टाइम काम (आल्बा), श्रम सम्झौता, न्यूनतम ज्याला, कार्यस्थल सुरक्षा, सिफ्ट र तलब।',
    iconName: 'Briefcase',
  },
  {
    id: 'business',
    order: 5,
    nameKo: '비즈니스 및 직장',
    nameEn: 'Business',
    nameBn: 'ব্যবসা ও কর্পোরেট অফিস',
    nameNe: 'व्यवसाय र कार्यालय',
    descriptionEn: 'Corporate hierarchy, meetings, trade, reports, formal emails, marketing, and negotiations.',
    descriptionBn: 'কর্পোরেট পদবী, মিটিং, বাণিজ্য, রিপোর্ট, ফরমাল ইমেইল, মার্কেটিং ও ব্যবসায়িক আলোচনা।',
    descriptionNe: 'कर्पोरेट पदक्रम, बैठक, व्यापार, प्रतिवेदन, औपचारिक इमेल, मार्केटिङ र वार्ता।',
    iconName: 'TrendingUp',
  },
  {
    id: 'healthcare',
    order: 6,
    nameKo: '병원 및 건강',
    nameEn: 'Healthcare',
    nameBn: 'হাসপাতাল ও স্বাস্থ্যসেবা',
    nameNe: 'स्वास्थ्य र अस्पताल',
    descriptionEn: 'Symptoms, clinics, NHIS health insurance, prescriptions, pharmacies, dental, and checkups.',
    descriptionBn: 'রোগের লক্ষণ, ক্লিনিক, স্বাস্থ্য বীমা (NHIS), প্রেসক্রিপশন, ফার্মেসি, দাঁত ও স্বাস্থ্য পরীক্ষা।',
    descriptionNe: 'रोगका लक्षण, क्लिनिक, स्वास्थ्य बीमा (NHIS), प्रेस्क्रिप्सन, फार्मेसी र स्वास्थ्य जाँच।',
    iconName: 'HeartPulse',
  },
  {
    id: 'shopping',
    order: 7,
    nameKo: '쇼핑 및 소비',
    nameEn: 'Shopping',
    nameBn: 'কেনাকাটা ও বাজার',
    nameNe: 'किनमेल र बजार',
    descriptionEn: 'Marts, convenience stores, Coupang online orders, sizes, discounts, receipts, and refunds.',
    descriptionBn: 'মার্ট, কনভিনিয়েন্স স্টোর, কুপাং অনলাইন অর্ডার, সাইজ, ছাড়, রসিদ এবং রিফান্ড/এক্সচেঞ্জ।',
    descriptionNe: 'मार्ट, कन्भिनियन्स स्टोर, कुपाङ अनलाइन अर्डर, साइज, छुट, रसिद र फिर्ता/साटफेर।',
    iconName: 'ShoppingBag',
  },
  {
    id: 'transportation',
    order: 8,
    nameKo: '교통 및 운전',
    nameEn: 'Transportation',
    nameBn: 'পরিবহন ও যাতায়াত',
    nameNe: 'यातायात र सवारी',
    descriptionEn: 'Subway lines, buses, T-money card, KTX trains, taxis, airport limousine, and Korean driving rules.',
    descriptionBn: 'সাবওয়ে লাইন, বাস, টি-মানি কার্ড, KTX ট্রেন, ট্যাক্সি, এয়ারপোর্ট বাস ও ড্রাইভিং নিয়ম।',
    descriptionNe: 'सबवे लाइन, बस, टी-मनी कार्ड, KTX रेल, ट्याक्सी, एयरपोर्ट बस र ड्राइभिङ नियम।',
    iconName: 'Train',
  },
  {
    id: 'housing',
    order: 9,
    nameKo: '주거 및 부동산',
    nameEn: 'Housing',
    nameBn: 'আবাসন ও বাসা ভাড়া',
    nameNe: 'आवास र कोठा भाडा',
    descriptionEn: 'One-room studios, jeonse/wolse deposits, real estate agents, utilities, heating, and recycling rules.',
    descriptionBn: 'ওয়ান-রুম স্টুডিও, জনসে/ওলসে ডিপোজিট, রিয়েল এস্টেট, গ্যাস/বিদ্যুৎ বিল ও ময়লা ফেলার নিয়ম।',
    descriptionNe: 'वान-रुम कोठा, जन्से/वल्से धरौटी, घरजग्गा एजेन्ट, बिजुली/ग्यास बिल र फोहोर वर्गीकरण नियम।',
    iconName: 'Home',
  },
  {
    id: 'banking',
    order: 10,
    nameKo: '은행 및 금융',
    nameEn: 'Banking',
    nameBn: 'ব্যাংকিং ও অর্থব্যবস্থা',
    nameNe: 'बैंकिङ र वित्त',
    descriptionEn: 'Opening Korean bank accounts, check cards, overseas remittance, ATMs, taxes, and mobile banking.',
    descriptionBn: 'কোরিয়ান ব্যাংক অ্যাকাউন্ট খোলা, চেক কার্ড, দেশে টাকা পাঠানো (রেমিট্যান্স), এটিএম ও মোবাইল ব্যাংকিং।',
    descriptionNe: 'कोरियन बैंक खाता खोल्ने, चेक कार्ड, रेमिट्यान्स पठाउने, ATM, कर र मोबाइल बैंकिङ।',
    iconName: 'Landmark',
  },
  {
    id: 'technology',
    order: 11,
    nameKo: '통신 및 디지털',
    nameEn: 'Technology',
    nameBn: 'প্রযুক্তি ও মোবাইল যোগাযোগ',
    nameNe: 'प्रविधि र दूरसञ्चार',
    descriptionEn: 'SIM cards, telecom contracts, PASS identity verification, Korean apps, Wi-Fi, and IT terms.',
    descriptionBn: 'সিম কার্ড, টেলিকম চুক্তি, PASS পরিচয় যাচাই, কোরিয়ান অ্যাপস, ওয়াই-ফাই ও আইটি পরিভাষা।',
    descriptionNe: 'सिम कार्ड, टेलिकम सम्झौता, PASS पहिचान प्रमाणीकरण, कोरियन एप, वाइफाइ र IT शब्दावली।',
    iconName: 'Smartphone',
  },
  {
    id: 'relationships',
    order: 12,
    nameKo: '인간관계 및 감정',
    nameEn: 'Relationships',
    nameBn: 'সম্পর্ক, পরিবার ও অনুভূতি',
    nameNe: 'सम्बन्ध, परिवार र भावना',
    descriptionEn: 'Family titles, friendships, senior-junior (선후배) etiquette, emotions, invitations, and apologies.',
    descriptionBn: 'পরিবারের সম্বোধন, বন্ধুত্ব, সিনিয়র-জুনিয়র (선후배) আদবকায়দা, অনুভূতি, দাওয়াত ও ক্ষমা চাওয়া।',
    descriptionNe: 'पारिवारिक सम्बोधन, मित्रता, सिनियर-जुनियर (선후배) शिष्टाचार, भावना, निमन्त्रणा र माफी।',
    iconName: 'Users',
  },
  {
    id: 'emergencies',
    order: 13,
    nameKo: '긴급상황 및 안전',
    nameEn: 'Emergencies',
    nameBn: 'জরুরি পরিস্থিতি ও নিরাপত্তা',
    nameNe: 'आपतकालीन अवस्था र सुरक्षा',
    descriptionEn: '112 police, 119 ambulance/fire, lost passport/wallet, disaster alerts, fraud prevention, and 1345 helpline.',
    descriptionBn: '১১২ পুলিশ, ১১৯ অ্যাম্বুলেন্স/ফায়ার সার্ভিস, হারানো পাসপোর্ট, দুর্যোগ সতর্কতা ও ১৩৪৫ হেল্পলাইন।',
    descriptionNe: '११२ प्रहरी, ११९ एम्बुलेन्स/दमकल, हराएको राहदानी/पर्स, विपद् सूचना र १३४५ हेल्पलाइन।',
    iconName: 'AlertTriangle',
  },
  {
    id: 'korean_culture',
    order: 14,
    nameKo: '한국 문화 및 예절',
    nameEn: 'Korean Culture',
    nameBn: 'কোরিয়ান সংস্কৃতি ও শিষ্টাচার',
    nameNe: 'कोरियन संस्कृति र शिष्टाचार',
    descriptionEn: 'Dining etiquette, Chuseok & Seollal holidays, age & bow customs, company dinners (회식), and history.',
    descriptionBn: 'খাবারের টেবিলের শিষ্টাচার, ছুসক ও সল্লাল উৎসব, বয়স ও সম্মান প্রদর্শন, কোম্পানির ডিনার (회식)।',
    descriptionNe: 'भोजन शिष्टाचार, छुसक र सल्लाल पर्व, उमेर र अभिवादन परम्परा, कम्पनी डिनर (회식) र इतिहास।',
    iconName: 'Sparkles',
  },
  {
    id: 'topik',
    order: 15,
    nameKo: 'TOPIK 시험 필수어휘',
    nameEn: 'TOPIK Academic & Exam',
    nameBn: 'TOPIK পরীক্ষার শব্দভাণ্ডার',
    nameNe: 'TOPIK परीक्षा शब्दावली',
    descriptionEn: 'High-frequency TOPIK I & II verbs, adverbs, connectors, social-science nouns, and essay expressions.',
    descriptionBn: 'TOPIK I ও II পরীক্ষার উচ্চ-ফ্রিকোয়েন্সি ক্রিয়া, বিশেষণ, সংযোজক অব্যয় ও প্রবন্ধ লেখার শব্দ।',
    descriptionNe: 'TOPIK I र II परीक्षाका उच्च-आवृत्ति क्रियापद, विशेषण, संयोजक शब्द र निबन्ध शब्दावली।',
    iconName: 'Award',
  },
];

export function mapLegacyCategoryToTopic(catId?: string): VocabTopicId {
  switch (catId) {
    case 'daily_korean':
    case 'daily_life':
    case 'essentials':
    case 'restaurant':
    case 'food_halal':
    case 'numbers_time':
      return 'daily_life';
    case 'university':
      return 'university';
    case 'immigration':
    case 'visa_immigration':
      return 'immigration';
    case 'workplace':
    case 'employment':
    case 'job_workplace':
      return 'employment';
    case 'business':
      return 'business';
    case 'hospital':
    case 'healthcare':
    case 'hospital_health':
      return 'healthcare';
    case 'shopping':
      return 'shopping';
    case 'transportation':
    case 'transit_travel':
      return 'transportation';
    case 'housing':
      return 'housing';
    case 'banking':
    case 'money_banking':
      return 'banking';
    case 'technology':
      return 'technology';
    case 'relationships':
      return 'relationships';
    case 'emergency':
    case 'emergencies':
      return 'emergencies';
    case 'korean_culture':
      return 'korean_culture';
    case 'topik':
    case 'topik_exam':
    case 'verbs_actions':
    case 'adjectives':
      return 'topik';
    default:
      return 'daily_life';
  }
}

export function getTopicLabel(topic: VocabTopicMeta, lang: LearningExplanationLang): string {
  if (lang === 'bn') return topic.nameBn;
  if (lang === 'ne') return topic.nameNe;
  return topic.nameEn;
}

export function getLevelLabel(level: CurriculumLevelMeta, lang: LearningExplanationLang): string {
  if (lang === 'bn') return level.titleBn;
  if (lang === 'ne') return level.titleNe;
  return level.titleEn;
}
