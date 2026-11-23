import { LanguageCode } from '../types';

export type LearnHangulModuleId =
  | 'learn-hangul'
  | 'combined-letters'
  | 'pronunciation'
  | 'vocabulary'
  | 'daily-conversation'
  | 'grammar'
  | 'writing-practice'
  | 'korean-quiz'
  | 'progress-tracking';

export interface LearnHangulModuleMeta {
  id: LearnHangulModuleId;
  stepNumber: string;
  koreanTag: string;
  title: Record<string, string>;
  shortDesc: Record<string, string>;
  lessonCountLabel: Record<string, string>;
  sampleKorean: string;
  sampleBengaliPron: string;
  sampleBengaliMeaning: string;
}

export interface PronunciationContrastItem {
  id: string;
  groupTitleEn: string;
  groupTitleBn: string;
  airflowTipEn: string;
  airflowTipBn: string;
  triplets: {
    type: 'Plain (সাধারণ)' | 'Aspirated (মহাপ্রাণ)' | 'Tense (দ্বিত্ব/জোরালো)';
    hangul: string;
    wordKo: string;
    bengaliPron: string;
    bengaliMeaning: string;
    englishMeaning: string;
  }[];
}

export interface SoundChangeRule {
  id: string;
  ruleNameKo: string;
  ruleNameEn: string;
  ruleNameBn: string;
  explanationEn: string;
  explanationBn: string;
  examples: {
    writtenKo: string;
    spokenKo: string;
    bengaliPron: string;
    bengaliMeaning: string;
    englishMeaning: string;
  }[];
}

export interface PronunciationDrillQuestion {
  id: string;
  audioTextKo: string;
  promptEn: string;
  promptBn: string;
  options: {
    ko: string;
    bengaliPron: string;
    bengaliMeaning: string;
  }[];
  correctIndex: number;
  tipBn: string;
  tipEn: string;
}

export interface ConversationLine {
  speaker: 'A' | 'B';
  speakerLabelBn: string;
  speakerLabelEn: string;
  korean: string;
  bengaliPron: string;
  bengaliMeaning: string;
  englishMeaning: string;
}

export interface DailyConversationLesson {
  id: string;
  order: number;
  categoryTagKo: string;
  titleEn: string;
  titleBn: string;
  situationEn: string;
  situationBn: string;
  lines: ConversationLine[];
  keyPhrases: {
    korean: string;
    bengaliPron: string;
    bengaliMeaning: string;
    englishMeaning: string;
  }[];
}

export interface GrammarExample {
  korean: string;
  highlightKo: string;
  bengaliPron: string;
  bengaliMeaning: string;
  englishMeaning: string;
}

export interface GrammarLessonUnit {
  id: string;
  order: number;
  patternKo: string;
  titleEn: string;
  titleBn: string;
  formula: string;
  ruleBn: string;
  ruleEn: string;
  batchimRuleBn: string;
  batchimRuleEn: string;
  examples: GrammarExample[];
  practiceCheck: {
    questionKo: string;
    bengaliHint: string;
    englishHint: string;
    options: string[];
    correctIndex: number;
    explanationBn: string;
    explanationEn: string;
  };
}

export type LearnHangulQuizCategory = 'all' | 'mcq' | 'listening' | 'vocabulary';

export interface LearnHangulQuizQuestion {
  id: string;
  category: Exclude<LearnHangulQuizCategory, 'all'>;
  audioKo?: string;
  questionEn: string;
  questionBn: string;
  highlightKo?: string;
  options: {
    text: string;
    subBn?: string;
  }[];
  correctIndex: number;
  explanationBn: string;
  explanationEn: string;
}

export const LEARN_HANGUL_UI: Record<
  string,
  {
    sectionTitle: string;
    koreanSubtitle: string;
    sectionDescription: string;
    startLearning: string;
    continueLearning: string;
    exploreModules: string;
    zeroKnowledgeNote: string;
    quickAudioSampler: string;
    tapToListen: string;
    bengaliMeaningLabel: string;
    bengaliPronLabel: string;
    koreanTextLabel: string;
    prevModule: string;
    nextModule: string;
    prevLesson: string;
    nextLesson: string;
    markComplete: string;
    completedLabel: string;
    guestNotice: string;
    signInToSave: string;
    syncedAccount: string;
    normalAudio: string;
    slowAudio: string;
    playConversation: string;
    stopAudio: string;
  }
> = {
  en: {
    sectionTitle: 'EveryKR Learn Hangul',
    koreanSubtitle: '한국어, 처음부터 쉽게!',
    sectionDescription:
      'Learn Korean from zero with structured lessons, interactive exercises and practical conversations.',
    startLearning: 'Start Learning',
    continueLearning: 'Continue Learning',
    exploreModules: '9 Structured Modules · Zero Prior Knowledge Needed',
    zeroKnowledgeNote:
      'Every lesson shows Korean script, Bengali pronunciation, Bengali meaning, and native Korean audio side by side.',
    quickAudioSampler: 'Interactive First Sounds — Tap Any Card to Hear Native Korean',
    tapToListen: 'Listen',
    bengaliMeaningLabel: 'Bengali Meaning (বাংলা অর্থ)',
    bengaliPronLabel: 'Bengali Pronunciation (বাংলা উচ্চারণ)',
    koreanTextLabel: 'Korean (한국어)',
    prevModule: 'Previous Module',
    nextModule: 'Next Module',
    prevLesson: 'Previous Lesson',
    nextLesson: 'Next Lesson',
    markComplete: 'Mark Lesson Completed',
    completedLabel: 'Completed',
    guestNotice: 'Guest Mode: Explore all 9 modules freely. Sign in anytime to save progress to your EveryKR account.',
    signInToSave: 'Sign In to Sync Progress',
    syncedAccount: 'Progress auto-saved to your EveryKR account',
    normalAudio: 'Normal (0.85x)',
    slowAudio: 'Slow (0.6x)',
    playConversation: 'Play Full Dialogue',
    stopAudio: 'Stop Audio',
  },
  bn: {
    sectionTitle: 'EveryKR Learn Hangul',
    koreanSubtitle: '한국어, 처음부터 쉽게!',
    sectionDescription:
      'একদম শূন্য থেকে গোছানো লেসন, ইন্টারঅ্যাক্টিভ অনুশীলন এবং বাস্তব কথোপকথনের মাধ্যমে সহজেই কোরিয়ান ভাষা শিখুন।',
    startLearning: 'শেখা শুরু করুন',
    continueLearning: 'শেখা চালিয়ে যান',
    exploreModules: '৯টি পূর্ণাঙ্গ মডিউল · পূর্ব কোনো অভিজ্ঞতার প্রয়োজন নেই',
    zeroKnowledgeNote:
      'প্রতিটি লেসনে কোরিয়ান লেখা, বাংলা উচ্চারণ, বাংলা অর্থ এবং প্রমিত কোরিয়ান অডিও একসাথে দেওয়া হয়েছে।',
    quickAudioSampler: 'প্রথম উচ্চারণ শুনুন — যেকোনো কার্ডে ট্যাপ করে অডিও শুনুন',
    tapToListen: 'শুনুন',
    bengaliMeaningLabel: 'বাংলা অর্থ',
    bengaliPronLabel: 'বাংলা উচ্চারণ',
    koreanTextLabel: 'কোরিয়ান (한국어)',
    prevModule: 'পূর্ববর্তী মডিউল',
    nextModule: 'পরবর্তী মডিউল',
    prevLesson: 'পূর্ববর্তী লেসন',
    nextLesson: 'পরবর্তী লেসন',
    markComplete: 'লেসন সম্পন্ন করুন',
    completedLabel: 'সম্পন্ন হয়েছে',
    guestNotice: 'গেস্ট মোড: সব লেসন বিনামূল্যে দেখুন। আপনার অগ্রগতি স্থায়ীভাবে সেভ করতে সাইন ইন করুন।',
    signInToSave: 'প্রগ্রেস সেভ করতে লগইন করুন',
    syncedAccount: 'আপনার EveryKR অ্যাকাউন্টে প্রগ্রেস স্বয়ংক্রিয়ভাবে সংরক্ষিত হচ্ছে',
    normalAudio: 'স্বাভাবিক গতি',
    slowAudio: 'ধীর গতি (০.৬x)',
    playConversation: 'পুরো কথোপকথন শুনুন',
    stopAudio: 'থামান',
  },
  ko: {
    sectionTitle: 'EveryKR Learn Hangul',
    koreanSubtitle: '한국어, 처음부터 쉽게!',
    sectionDescription:
      '체계적인 기초 강의, 인터랙티브 연습, 실생활 회화로 한국어를 처음부터 쉽게 배우세요.',
    startLearning: '학습 시작하기',
    continueLearning: '이어서 학습하기',
    exploreModules: '9개 핵심 모듈 · 기초부터 단계별 완성',
    zeroKnowledgeNote:
      '모든 학습 카드에 한국어 원문, 벵골어 발음 표기, 벵골어 뜻, 원어민 발음 오디오가 함께 제공됩니다.',
    quickAudioSampler: '기초 한국어 발음 체험 — 카드를 눌러 소리를 들어보세요',
    tapToListen: '듣기',
    bengaliMeaningLabel: '벵골어 의미 (বাংলা অর্থ)',
    bengaliPronLabel: '벵골어 발음 (বাংলা উচ্চারণ)',
    koreanTextLabel: '한국어 텍스트',
    prevModule: '이전 모듈',
    nextModule: '다음 모듈',
    prevLesson: '이전 레슨',
    nextLesson: '다음 레슨',
    markComplete: '학습 완료 표시',
    completedLabel: '완료됨',
    guestNotice: '게스트 모드: 모든 모듈을 자유롭게 학습할 수 있습니다. 로그인하면 진도가 계정에 저장됩니다.',
    signInToSave: '로그인하여 진도 저장',
    syncedAccount: 'EveryKR 계정에 학습 진도가 실시간 동기화됨',
    normalAudio: '일반 속도',
    slowAudio: '천천히 듣기',
    playConversation: '전체 대화 듣기',
    stopAudio: '정지',
  },
  ne: {
    sectionTitle: 'EveryKR Learn Hangul',
    koreanSubtitle: '한국어, 처음부터 쉽게!',
    sectionDescription:
      'शून्यबाट संरचित पाठहरू, अन्तरक्रियात्मक अभ्यास र व्यावहारिक संवादमार्फत सजिलै कोरियन भाषा सिक्नुहोस्।',
    startLearning: 'सिक्न सुरु गर्नुहोस्',
    continueLearning: 'सिक्दै जानुहोस्',
    exploreModules: '९ संरचित मोड्युल · शून्य आधारबाट सुरु',
    zeroKnowledgeNote:
      'हरेक पाठमा कोरियन लिपि, बंगाली उच्चारण, बंगाली अर्थ र कोरियन अडियो सँगै देखाइन्छ।',
    quickAudioSampler: 'कोरियन आवाज सुन्न कार्डमा थिच्नुहोस्',
    tapToListen: 'सुन्नुहोस्',
    bengaliMeaningLabel: 'बंगाली अर्थ (বাংলা অর্থ)',
    bengaliPronLabel: 'बंगाली उच्चारण (বাংলা উচ্চারণ)',
    koreanTextLabel: 'कोरियन (한국어)',
    prevModule: 'अघिल्लो मोड्युल',
    nextModule: 'अर्को मोड्युल',
    prevLesson: 'अघिल्लो पाठ',
    nextLesson: 'अर्को पाठ',
    markComplete: 'पाठ पूरा भयो',
    completedLabel: 'पूरा भयो',
    guestNotice: 'गेस्ट मोड: सबै पाठ स्वतन्त्र रूपमा पढ्नुहोस्। प्रगति सेभ गर्न साइन इन गर्नुहोस्।',
    signInToSave: 'साइन इन गर्नुहोस्',
    syncedAccount: 'तपाईंको EveryKR खातामा प्रगति सुरक्षित छ',
    normalAudio: 'सामान्य गति',
    slowAudio: 'बिस्तारै (0.6x)',
    playConversation: 'पूरा संवाद सुन्नुहोस्',
    stopAudio: 'रोक्नुहोस्',
  },
  hi: {
    sectionTitle: 'EveryKR Learn Hangul',
    koreanSubtitle: '한국어, 처음부터 쉽게!',
    sectionDescription:
      'शून्य से संरचित पाठों, इंटरैक्टिव अभ्यासों और व्यावहारिक बातचीत के साथ आसानी से कोरियन सीखें।',
    startLearning: 'सीखना शुरू करें',
    continueLearning: 'सीखना जारी रखें',
    exploreModules: '9 संरचित मॉड्यूल · शून्य से शुरुआत',
    zeroKnowledgeNote:
      'प्रत्येक पाठ में कोरियन पाठ, बंगाली उच्चारण, बंगाली अर्थ और कोरियन ऑडियो एक साथ दिए गए हैं।',
    quickAudioSampler: 'कोरियन उच्चारण सुनने के लिए किसी भी कार्ड पर टैप करें',
    tapToListen: 'सुनें',
    bengaliMeaningLabel: 'बंगाली अर्थ (বাংলা অর্থ)',
    bengaliPronLabel: 'बंगाली उच्चारण (বাংলা উচ্চারণ)',
    koreanTextLabel: 'कोरियन (한국어)',
    prevModule: 'पिछला मॉड्यूल',
    nextModule: 'अगला मॉड्यूल',
    prevLesson: 'पिछला पाठ',
    nextLesson: 'अगला पाठ',
    markComplete: 'पाठ पूर्ण करें',
    completedLabel: 'पूर्ण',
    guestNotice: 'गेस्ट मोड: सभी मॉड्यूल मुफ़्त में देखें। प्रगति सहेजने के लिए साइन इन करें।',
    signInToSave: 'प्रगति सहेजने हेतु साइन इन करें',
    syncedAccount: 'आपकी प्रगति EveryKR खाते में सुरक्षित है',
    normalAudio: 'सामान्य गति',
    slowAudio: 'धीमी गति (0.6x)',
    playConversation: 'पूरी बातचीत सुनें',
    stopAudio: 'रोकें',
  },
  ur: {
    sectionTitle: 'EveryKR Learn Hangul',
    koreanSubtitle: '한국어, 처음부터 쉽게!',
    sectionDescription:
      'صفر سے منظم اسباق، انٹرایکٹو مشقوں اور عملی گفتگو کے ذریعے آسانی سے کورین زبان سیکھیں۔',
    startLearning: 'سیکھنا شروع کریں',
    continueLearning: 'سیکھنا جاری رکھیں',
    exploreModules: '9 مکمل ماڈیولز · ابتدائی طلباء کے لیے',
    zeroKnowledgeNote:
      'ہر سبق میں کورین متن، بنگالی تلفظ، بنگالی معنی اور کورین آڈیو ایک ساتھ موجود ہیں۔',
    quickAudioSampler: 'کورین تلفظ سننے کے لیے کسی بھی کارڈ پر کلک کریں',
    tapToListen: 'سنیں',
    bengaliMeaningLabel: 'بنگالی معنی (বাংলা অর্থ)',
    bengaliPronLabel: 'بنگالی تلفظ (বাংলা উচ্চারণ)',
    koreanTextLabel: 'کورین (한국어)',
    prevModule: 'پچھلا ماڈیول',
    nextModule: 'اگلا ماڈیول',
    prevLesson: 'پچھلا سبق',
    nextLesson: 'اگلا سبق',
    markComplete: 'سبق مکمل کریں',
    completedLabel: 'مکمل',
    guestNotice: 'مہمان موڈ: تمام اسباق مفت پڑھیں۔ پیشرفت محفوظ کرنے کے لیے سائن ان کریں۔',
    signInToSave: 'سائن ان کریں',
    syncedAccount: 'آپ کی پیشرفت EveryKR اکاؤنٹ میں محفوظ ہے',
    normalAudio: 'نارمل رفتار',
    slowAudio: 'آہستہ (0.6x)',
    playConversation: 'مکمل مکالمہ سنیں',
    stopAudio: 'روکیں',
  },
};

export const getLearnHangulText = (lang: LanguageCode) => {
  return LEARN_HANGUL_UI[lang] || LEARN_HANGUL_UI.en;
};

export const getLocalizedMapValue = (map: Record<string, string>, lang: LanguageCode): string => {
  return map[lang] || map.en || '';
};

export const LEARN_HANGUL_MODULES: LearnHangulModuleMeta[] = [
  {
    id: 'learn-hangul',
    stepNumber: '01',
    koreanTag: '한글 기본 자모',
    title: {
      en: 'Learn Hangul',
      bn: 'হানগুল বর্ণমালা (Learn Hangul)',
      ko: '기본 한글 자모',
      ne: 'हंगुल वर्णमाला',
      hi: 'हंगुल वर्णमाला',
      ur: 'ہنگول حروف تہجی',
    },
    shortDesc: {
      en: 'Korean vowels (10) and basic consonants (14) with Bengali sound mapping.',
      bn: '১০টি মৌলিক স্বরবর্ণ ও ১৪টি ব্যঞ্জনবর্ণ বাংলা উচ্চারণ ও উদাহরণসহ।',
      ko: '기본 모음 10자와 자음 14자를 발음과 함께 배웁니다.',
    },
    lessonCountLabel: {
      en: '24 Core Letters',
      bn: '২৪টি মৌলিক বর্ণ',
      ko: '24개 기본 글자',
    },
    sampleKorean: 'ㄱ · ㅏ → 가방',
    sampleBengaliPron: 'খাবাং',
    sampleBengaliMeaning: 'ব্যাগ (Bag)',
  },
  {
    id: 'combined-letters',
    stepNumber: '02',
    koreanTag: '쌍자음 · 복합모음',
    title: {
      en: 'Combined Letters',
      bn: 'যুক্ত ও যৌগিক বর্ণ (Combined Letters)',
      ko: '쌍자음과 복합 모음',
      ne: 'संयुक्त अक्षरहरू',
      hi: 'संयुक्त अक्षर',
      ur: 'مرکب حروف',
    },
    shortDesc: {
      en: 'Double consonants (5), combined vowels (11) & interactive syllable builder.',
      bn: '৫টি যুগ্ম ব্যঞ্জনবর্ণ, ১১টি যৌগিক স্বরবর্ণ ও সিলেবল ব্লক তৈরির ল্যাব।',
      ko: '쌍자음 5개, 복합모음 11개 및 음절 조합 연습.',
    },
    lessonCountLabel: {
      en: '16 Letters + Lab',
      bn: '১৬টি বর্ণ + ব্লক ল্যাব',
      ko: '16자 + 조합기',
    },
    sampleKorean: 'ㄲ · ㅘ → 과일',
    sampleBengaliPron: 'খোয়াইল',
    sampleBengaliMeaning: 'ফলমূল (Fruit)',
  },
  {
    id: 'pronunciation',
    stepNumber: '03',
    koreanTag: '발음 · 받침 · 연음',
    title: {
      en: 'Pronunciation',
      bn: 'উচ্চারণ অনুশীলন (Pronunciation)',
      ko: '발음 및 받침 연습',
      ne: 'उच्चारण अभ्यास',
      hi: 'उच्चारण अभ्यास',
      ur: 'تلفظ کی مشق',
    },
    shortDesc: {
      en: 'Audio-based Batchim rules, liaison sound shifts & listening drills.',
      bn: 'অডিওসহ বাতছিম (받침), লিয়াজোঁ (연음) এবং ধ্বনি পার্থক্য অনুশীলন।',
      ko: '오디오 기반 받침 규칙, 연음 현상 및 청취 훈련.',
    },
    lessonCountLabel: {
      en: '7 Rules + Audio Drill',
      bn: '৭টি নিয়ম + অডিও টেস্ট',
      ko: '7대 받침 + 청취',
    },
    sampleKorean: '한국어 → [한구거]',
    sampleBengaliPron: 'হানগু-গ',
    sampleBengaliMeaning: 'কোরিয়ান ভাষা',
  },
  {
    id: 'vocabulary',
    stepNumber: '04',
    koreanTag: '필수 생활 어휘',
    title: {
      en: 'Vocabulary',
      bn: 'দৈনন্দিন শব্দভাণ্ডার (Vocabulary)',
      ko: '필수 생활 어휘',
      ne: 'दैनिक शब्दावली',
      hi: 'दैनिक शब्दावली',
      ur: 'روزمرہ الفاظ',
    },
    shortDesc: {
      en: 'Everyday Korean words with Bengali meanings, pronunciation & audio.',
      bn: 'প্রতিদিনের প্রয়োজনীয় কোরিয়ান শব্দ বাংলা অর্থ, উচ্চারণ ও অডিওসহ।',
      ko: '벵골어 의미와 발음이 포함된 필수 한국어 단어장.',
    },
    lessonCountLabel: {
      en: '12 Categories · 5,000+ Words',
      bn: '১২টি বিভাগ · ৫,০০০+ শব্দ',
      ko: '12개 주제 · 5,000+ 단어',
    },
    sampleKorean: '대학교 · 장학금',
    sampleBengaliPron: 'থেহাক্কিও · ছাংহাক্কুম',
    sampleBengaliMeaning: 'বিশ্ববিদ্যালয় · শিক্ষাবৃত্তি',
  },
  {
    id: 'daily-conversation',
    stepNumber: '05',
    koreanTag: '실전 일일 회화',
    title: {
      en: 'Daily Conversation',
      bn: 'দৈনন্দিন কথোপকথন (Conversation)',
      ko: '실생활 한국어 회화',
      ne: 'दैनिक संवाद',
      hi: 'दैनिक बातचीत',
      ur: 'روزمرہ گفتگو',
    },
    shortDesc: {
      en: 'Practical Bengali-to-Korean conversations for campus, dining & transit.',
      bn: 'ক্যাম্পাস, হালাল রেস্তোরাঁ, সাবওয়ে ও হাসপাতালের বাস্তব বাংলা-কোরিয়ান সংলাপ।',
      ko: '캠퍼스, 식당, 지하철, 병원에서 바로 쓰는 실전 대화.',
    },
    lessonCountLabel: {
      en: '7 Real Scenarios',
      bn: '৭টি বাস্তব পরিস্থিতি',
      ko: '7개 실전 상황',
    },
    sampleKorean: '돼지고기 빼 주세요',
    sampleBengaliPron: 'তোয়েজিগোগি প্পে জুসেয়ো',
    sampleBengaliMeaning: 'শূকরের মাংস বাদ দিন',
  },
  {
    id: 'grammar',
    stepNumber: '06',
    koreanTag: '초급 핵심 문법',
    title: {
      en: 'Grammar',
      bn: 'সহজ ব্যাকরণ (Beginner Grammar)',
      ko: '초급 필수 문법',
      ne: 'आधारभूत व्याकरण',
      hi: 'प्रारंभिक व्याकरण',
      ur: 'ابتدائی گرامر',
    },
    shortDesc: {
      en: 'Beginner Korean particles, polite verb endings & sentence structure.',
      bn: 'কোরিয়ান বাক্য গঠন, পার্টিকেল (은/는, 이/가, 을/를) ও ক্রিয়াপদের সহজ নিয়ম।',
      ko: '조사(은/는, 이/가)와 시제 어미(-아요/어요) 핵심 정리.',
    },
    lessonCountLabel: {
      en: '8 Core Units',
      bn: '৮টি মূল ব্যাকরণ অধ্যায়',
      ko: '8개 핵심 문법',
    },
    sampleKorean: '저는 학생입니다',
    sampleBengaliPron: 'ছনুন হাকসেং-ইমনিদা',
    sampleBengaliMeaning: 'আমি একজন শিক্ষার্থী',
  },
  {
    id: 'writing-practice',
    stepNumber: '07',
    koreanTag: '한글 쓰기 연습',
    title: {
      en: 'Writing Practice',
      bn: 'হাতে লেখা অনুশীলন (Writing Practice)',
      ko: '인터랙티브 한글 쓰기',
      ne: 'लेखन अभ्यास',
      hi: 'लेखन अभ्यास',
      ur: 'لکھنے کی مشق',
    },
    shortDesc: {
      en: 'Interactive Hangul stroke tracing canvas for letters, words & sentences.',
      bn: 'ইন্টারঅ্যাক্টিভ ক্যানভাসে হানগুল বর্ণ, যুক্তবর্ণ, শব্দ ও বাক্য লেখা অনুশীলন।',
      ko: '자모, 단어, 문장을 직접 따라 쓰는 디지털 쓰기 보드.',
    },
    lessonCountLabel: {
      en: 'Interactive Canvas',
      bn: 'ডিজিটাল রাইটিং বোর্ড',
      ko: '획순 따라쓰기',
    },
    sampleKorean: '한 · 글 · 사 · 랑',
    sampleBengaliPron: 'হান-গুল সা-রাং',
    sampleBengaliMeaning: 'স্ট্রোক গাইডসহ লেখা',
  },
  {
    id: 'korean-quiz',
    stepNumber: '08',
    koreanTag: '퀴즈 · 듣기 평가',
    title: {
      en: 'Korean Quiz',
      bn: 'কোরিয়ান কুইজ ও পরীক্ষা (Korean Quiz)',
      ko: '한국어 퀴즈 및 테스트',
      ne: 'कोरियन क्विज',
      hi: 'कोरियन क्विज़',
      ur: 'کورین کوئز',
    },
    shortDesc: {
      en: 'MCQs, native audio listening tests & Bengali-Korean vocabulary quizzes.',
      bn: 'এমসিকিউ, অডিও লিসেনিং টেস্ট এবং শব্দভাণ্ডার ও ব্যাকরণ যাচাই কুইজ।',
      ko: '객관식, 듣기 평가, 어휘 및 문법 실력 점검.',
    },
    lessonCountLabel: {
      en: 'MCQ · Listening · Vocab',
      bn: 'এমসিকিউ · লিসেনিং · শব্দার্থ',
      ko: '실력 점검 테스트',
    },
    sampleKorean: '듣고 알맞은 답 고르기',
    sampleBengaliPron: 'শুনে সঠিক উত্তর বাছাই',
    sampleBengaliMeaning: 'তাৎক্ষণিক ফলাফল ও ব্যাখ্যা',
  },
  {
    id: 'progress-tracking',
    stepNumber: '09',
    koreanTag: '학습 진도 · 성취도',
    title: {
      en: 'Progress Tracking',
      bn: 'শেখার অগ্রগতি (Progress Tracking)',
      ko: '나의 학습 기록',
      ne: 'प्रगति विवरण',
      hi: 'प्रगति ट्रैकिंग',
      ur: 'پیشرفت کا ریکارڈ',
    },
    shortDesc: {
      en: 'Completed lessons, quiz scores, mastered words & learning history.',
      bn: 'সম্পন্ন করা লেসন, কুইজের স্কোর, মুখস্থ শব্দ এবং সম্পূর্ণ লার্নিং হিস্ট্রি।',
      ko: '완료한 강의, 퀴즈 점수 및 학습 이력 확인.',
    },
    lessonCountLabel: {
      en: 'Cloud Synced History',
      bn: 'অগ্রগতি ও স্কোরবোর্ড',
      ko: '실시간 학습 통계',
    },
    sampleKorean: '목표 달성 기록',
    sampleBengaliPron: 'মোকফিও দালসং গিরোক',
    sampleBengaliMeaning: 'লেসন ও কুইজ রেকর্ড',
  },
];

// ============================================================================
// MODULE 3: PRONUNCIATION CONTRASTS, SOUND RULES & LISTENING DRILLS
// ============================================================================

export const PRONUNCIATION_CONTRASTS: PronunciationContrastItem[] = [
  {
    id: 'contrast-g-k-kk',
    groupTitleEn: 'Velar Stops: ㄱ vs ㅋ vs ㄲ',
    groupTitleBn: 'কণ্ঠ্য ধ্বনির ৩ রূপ: ㄱ (গ/খ) · ㅋ (খ্) · ㄲ (ক্ক)',
    airflowTipEn: 'ㄱ is soft with gentle breath; ㅋ releases a strong puff of air; ㄲ is tense with zero air puff.',
    airflowTipBn: 'ㄱ নরমভাবে উচ্চারিত হয়, ㅋ উচ্চারণে মুখ থেকে জোরে বাতাস বের হয়, আর ㄲ গলায় চাপ দিয়ে বাতাস ছাড়া শক্তভাবে “ক্ক” উচ্চারিত হয়।',
    triplets: [
      {
        type: 'Plain (সাধারণ)',
        hangul: '가다',
        wordKo: '가다',
        bengaliPron: 'খাদা / গাদা',
        bengaliMeaning: 'যাওয়া',
        englishMeaning: 'To go',
      },
      {
        type: 'Aspirated (মহাপ্রাণ)',
        hangul: '카드',
        wordKo: '카드',
        bengaliPron: 'খাদু (জোরে বাতাসসহ)',
        bengaliMeaning: 'কার্ড (ব্যাংক/টি-মানি কার্ড)',
        englishMeaning: 'Card',
      },
      {
        type: 'Tense (দ্বিত্ব/জোরালো)',
        hangul: '까치',
        wordKo: '까치',
        bengaliPron: 'ক্কাছি',
        bengaliMeaning: 'দোয়েল জাতীয় পাখি (ম্যাগপাই)',
        englishMeaning: 'Magpie',
      },
    ],
  },
  {
    id: 'contrast-d-t-tt',
    groupTitleEn: 'Alveolar Stops: ㄷ vs ㅌ vs ㄸ',
    groupTitleBn: 'দন্তমূলীয় ধ্বনির ৩ রূপ: ㄷ (দ/থ) · ㅌ (থ্) · ㄸ (ত্ত)',
    airflowTipEn: 'Touch tongue to upper ridge: ㄷ is relaxed, ㅌ has strong aspiration, ㄸ is sharp and tense.',
    airflowTipBn: 'জিহ্বা উপরের দাঁতের মাড়িতে ছুঁয়ে: ㄷ নরমভাবে, ㅌ বাতাস বের করে “থ”, আর ㄸ শক্তভাবে “ত্ত” বলুন।',
    triplets: [
      {
        type: 'Plain (সাধারণ)',
        hangul: '달',
        wordKo: '달',
        bengaliPron: 'থাল / দাল',
        bengaliMeaning: 'চাঁদ / মাস',
        englishMeaning: 'Moon / Month',
      },
      {
        type: 'Aspirated (মহাপ্রাণ)',
        hangul: '탈',
        wordKo: '탈',
        bengaliPron: 'থাল (বাতাসসহ)',
        bengaliMeaning: 'মুখোশ',
        englishMeaning: 'Traditional mask',
      },
      {
        type: 'Tense (দ্বিত্ব/জোরালো)',
        hangul: '딸',
        wordKo: '딸',
        bengaliPron: 'ত্তাল',
        bengaliMeaning: 'কন্যা / মেয়ে',
        englishMeaning: 'Daughter',
      },
    ],
  },
  {
    id: 'contrast-b-p-pp',
    groupTitleEn: 'Bilabial Stops: ㅂ vs ㅍ vs ㅃ',
    groupTitleBn: 'ওষ্ঠ্য ধ্বনির ৩ রূপ: ㅂ (ব/ফ) · ㅍ (ফ্) · ㅃ (প্প)',
    airflowTipEn: 'Hold a tissue in front of your lips: ㅂ barely moves it, ㅍ blows it strongly, ㅃ keeps it still.',
    airflowTipBn: 'ঠোঁটের সামনে কাগজ ধরলে: ㅂ-তে কাগজ হালকা নড়বে, ㅍ-তে জোরে উড়বে, আর ㅃ-তে কাগজ একদম নড়বে না।',
    triplets: [
      {
        type: 'Plain (সাধারণ)',
        hangul: '불',
        wordKo: '불',
        bengaliPron: 'বুল / ফুল',
        bengaliMeaning: 'আগুন / বাতি',
        englishMeaning: 'Fire / Light',
      },
      {
        type: 'Aspirated (মহাপ্রাণ)',
        hangul: '풀',
        wordKo: '풀',
        bengaliPron: 'ফুল (বাতাসসহ)',
        bengaliMeaning: 'ঘাস / আঠা',
        englishMeaning: 'Grass / Glue',
      },
      {
        type: 'Tense (দ্বিত্ব/জোরালো)',
        hangul: '뿔',
        wordKo: '뿔',
        bengaliPron: 'প্পুল',
        bengaliMeaning: 'শিং',
        englishMeaning: 'Horn',
      },
    ],
  },
  {
    id: 'contrast-j-ch-jj',
    groupTitleEn: 'Palatal Affricates: ㅈ vs ㅊ vs ㅉ',
    groupTitleBn: 'তালব্য ধ্বনির ৩ রূপ: ㅈ (জ/ছ) · ㅊ (ছ্) · ㅉ (চ্চ)',
    airflowTipEn: 'ㅈ sounds gentle, ㅊ releases crisp air like "ch", and ㅉ is pressed tightly like "jj".',
    airflowTipBn: 'ㅈ নরম “জ/ছ”, ㅊ স্পষ্ট বাতাসসহ “ছ”, এবং ㅉ চাপা গলায় “চ্চ” হিসেবে উচ্চারিত হয়।',
    triplets: [
      {
        type: 'Plain (সাধারণ)',
        hangul: '자다',
        wordKo: '자다',
        bengaliPron: 'ছাদা / জাদা',
        bengaliMeaning: 'ঘুমানো',
        englishMeaning: 'To sleep',
      },
      {
        type: 'Aspirated (মহাপ্রাণ)',
        hangul: '차다',
        wordKo: '차다',
        bengaliPron: 'ছাদা (বাতাসসহ)',
        bengaliMeaning: 'ঠান্ডা হওয়া / লাথি মারা',
        englishMeaning: 'Cold / To kick',
      },
      {
        type: 'Tense (দ্বিত্ব/জোরালো)',
        hangul: '짜다',
        wordKo: '짜다',
        bengaliPron: 'চ্চাদা',
        bengaliMeaning: 'নোনতা হওয়া (লবণ বেশি)',
        englishMeaning: 'Salty',
      },
    ],
  },
  {
    id: 'contrast-s-ss',
    groupTitleEn: 'Sibilants: ㅅ vs ㅆ',
    groupTitleBn: 'দন্ত্য শিস ধ্বনি: ㅅ (স/শ) বনাম ㅆ (স্স)',
    airflowTipEn: 'ㅅ is airy and relaxed (살 = flesh), while ㅆ has high tension (쌀 = uncooked rice).',
    airflowTipBn: 'ㅅ হালকা বাতাসসহ নরম “স”, আর ㅆ দাঁতের ফাঁক দিয়ে তীক্ষ্ণ ও জোরালো “স্স” — এই পার্থক্যে শব্দের অর্থ বদলে যায়!',
    triplets: [
      {
        type: 'Plain (সাধারণ)',
        hangul: '사다',
        wordKo: '사다',
        bengaliPron: 'সাদা',
        bengaliMeaning: 'কেনা (ক্রয় করা)',
        englishMeaning: 'To buy',
      },
      {
        type: 'Tense (দ্বিত্ব/জোরালো)',
        hangul: '싸다',
        wordKo: '싸다',
        bengaliPron: 'স্সাদা',
        bengaliMeaning: 'সস্তা হওয়া / প্যাক করা',
        englishMeaning: 'Cheap / To wrap',
      },
      {
        type: 'Tense (দ্বিত্ব/জোরালো)',
        hangul: '쌀',
        wordKo: '쌀',
        bengaliPron: 'স্সাল',
        bengaliMeaning: 'চাল (ভাতের চাল)',
        englishMeaning: 'Uncooked rice',
      },
    ],
  },
];

export const SOUND_CHANGE_RULES: SoundChangeRule[] = [
  {
    id: 'rule-liaison',
    ruleNameKo: '연음 법칙 (Liaison)',
    ruleNameEn: 'Bottom Consonant + ㅇ Vowel Carry-Over',
    ruleNameBn: 'লিয়াজোঁ নিয়ম (বাতছিম + ㅇ স্বরবর্ণের সংযোগ)',
    explanationEn:
      'When a syllable ends with a Batchim consonant and the next syllable starts with silent ㅇ, the bottom consonant smoothly moves over to pronounce the next syllable.',
    explanationBn:
      'যখন কোনো সিলেবলের নিচে বাতছিম (받침) থাকে এবং পরের সিলেবল নিঃশব্দ ㅇ দিয়ে শুরু হয়, তখন নিচের ব্যঞ্জনবর্ণটি পরের স্বরবর্ণের সাথে যুক্ত হয়ে উচ্চারিত হয়।',
    examples: [
      {
        writtenKo: '한국어',
        spokenKo: '한구거',
        bengaliPron: 'হান-গু-গ',
        bengaliMeaning: 'কোরিয়ান ভাষা',
        englishMeaning: 'Korean language',
      },
      {
        writtenKo: '밥을 먹어요',
        spokenKo: '바블 머거요',
        bengaliPron: 'ফা-বুল ম-গ-য়ো',
        bengaliMeaning: 'ভাত খাই',
        englishMeaning: 'Eat a meal / rice',
      },
      {
        writtenKo: '있어요',
        spokenKo: '이써요',
        bengaliPron: 'ই-স্স-য়ো',
        bengaliMeaning: 'আছে',
        englishMeaning: 'There is / Have',
      },
    ],
  },
  {
    id: 'rule-nasalization',
    ruleNameKo: '비음화 (Nasalization)',
    ruleNameEn: 'ㅂ / ㄱ Batchim Before ㄴ or ㅁ',
    ruleNameBn: 'নাসিক্যীভবন নিয়ম (ㅂ + ㄴ → ㅁㄴ)',
    explanationEn:
      'When ㅂ comes right before ㄴ or ㅁ (such as -습니다 / -입니까), ㅂ softens into ㅁ for natural speech flow.',
    explanationBn:
      'যখন ㅂ বাতছিমের ঠিক পরেই ㄴ বা ㅁ আসে (যেমন -습니다 বা -입니까), তখন ㅂ উচ্চারণে “ম” (ㅁ) হয়ে যায়। তাই 감사합니다 উচ্চারিত হয় “খামসাহামনিদা” (খামসাহাবনিদা নয়)।',
    examples: [
      {
        writtenKo: '감사합니다',
        spokenKo: '감사함니다',
        bengaliPron: 'খাম-সা-হাম-নি-দা',
        bengaliMeaning: 'ধন্যবাদ',
        englishMeaning: 'Thank you',
      },
      {
        writtenKo: '학생입니다',
        spokenKo: '학생임니다',
        bengaliPron: 'হাক-সেং-ইম-নি-দা',
        bengaliMeaning: 'আমি শিক্ষার্থী',
        englishMeaning: 'Am a student',
      },
      {
        writtenKo: '한국말',
        spokenKo: '한궁말',
        bengaliPron: 'হান-গুং-মাল',
        bengaliMeaning: 'কোরিয়ান কথা/ভাষা',
        englishMeaning: 'Spoken Korean',
      },
    ],
  },
  {
    id: 'rule-palatalization',
    ruleNameKo: '구개음화 & 격음화',
    ruleNameEn: 'ㅌ + 이 → 치 & ㅎ Aspiration Merge',
    ruleNameBn: 'তালব্যীভবন ও ㅎ-এর মহাপ্রাণ মিলন',
    explanationEn:
      'ㅌ followed by 이 becomes 치 (같이 → 가치), and ㅎ next to ㄱ/ㄷ/ㅂ/ㅈ merges into aspirated ㅋ/ㅌ/ㅍ/ㅊ.',
    explanationBn:
      'ㅌ বাতছিমের পর 이 এলে তা “ছি” (치) হয়ে যায়, আর ㄱ/ㄷ/ㅂ/ㅈ-এর সাথে ㅎ মিললে তা মহাপ্রাণ ㅋ/ㅌ/ㅍ/ㅊ ধ্বনিতে পরিণত হয়।',
    examples: [
      {
        writtenKo: '같이 가요',
        spokenKo: '가치 가요',
        bengaliPron: 'খা-ছি খা-য়ো',
        bengaliMeaning: 'চলুন একসাথে যাই',
        englishMeaning: "Let's go together",
      },
      {
        writtenKo: '축하해요',
        spokenKo: '추카해요',
        bengaliPron: 'ছু-খা-হে-য়ো',
        bengaliMeaning: 'অভিনন্দন!',
        englishMeaning: 'Congratulations!',
      },
      {
        writtenKo: '좋아요',
        spokenKo: '조아요',
        bengaliPron: 'ছো-আ-য়ো',
        bengaliMeaning: 'ভালো / পছন্দ হয়েছে',
        englishMeaning: 'Good / I like it',
      },
    ],
  },
];

export const PRONUNCIATION_AUDIO_DRILLS: PronunciationDrillQuestion[] = [
  {
    id: 'pdrill-1',
    audioTextKo: '감사합니다',
    promptEn: 'Listen to the audio and select the exact word and pronunciation rule:',
    promptBn: 'অডিওটি মনোযোগ দিয়ে শুনে সঠিক শব্দ ও উচ্চারণটি বাছাই করুন:',
    options: [
      { ko: '감사합니다 [감사함니다]', bengaliPron: 'খামসাহামনিদা', bengaliMeaning: 'ধন্যবাদ' },
      { ko: '미안합니다 [미안함니다]', bengaliPron: 'মিয়ানহামনিদা', bengaliMeaning: 'দুঃখিত' },
      { ko: '반갑습니다 [반갑씀니다]', bengaliPron: 'ফানগাপসুমনিদা', bengaliMeaning: 'দেখা হয়ে খুশি হলাম' },
    ],
    correctIndex: 0,
    tipBn: 'ㅂ বাতছিমের পরে ㄴ থাকায় 감사합니다 উচ্চারিত হয় [감사함니다] (খামসাহামনিদা)।',
    tipEn: 'Because ㅂ comes before ㄴ, 감사합니다 is pronounced [감사함니다].',
  },
  {
    id: 'pdrill-2',
    audioTextKo: '싸다',
    promptEn: 'Listen carefully: Is the speaker saying a plain or tense consonant?',
    promptBn: 'অডিওটি শুনে বলুন কোন শব্দটি উচ্চারিত হয়েছে?',
    options: [
      { ko: '사다', bengaliPron: 'সাদা', bengaliMeaning: 'কেনা (To buy)' },
      { ko: '싸다', bengaliPron: 'স্সাদা', bengaliMeaning: 'সস্তা (Cheap)' },
      { ko: '자다', bengaliPron: 'জাদা', bengaliMeaning: 'ঘুমানো (To sleep)' },
    ],
    correctIndex: 1,
    tipBn: '쌍시옷 (ㅆ) তীক্ষ্ণ ও জোরালোভাবে উচ্চারিত হয় — 싸다 (স্সাদা) মানে সস্তা!',
    tipEn: 'Double consonant ㅆ is pronounced tensely: 싸다 means cheap.',
  },
  {
    id: 'pdrill-3',
    audioTextKo: '한국어',
    promptEn: 'Listen to the liaison carry-over sound and pick the matching word:',
    promptBn: 'লিয়াজোঁ (연음) উচ্চারণটি শুনে সঠিক শব্দটি নির্বাচন করুন:',
    options: [
      { ko: '한국인 [한구긴]', bengaliPron: 'হানগুগিন', bengaliMeaning: 'কোরিয়ান নাগরিক' },
      { ko: '한국어 [한구거]', bengaliPron: 'হানগুগ', bengaliMeaning: 'কোরিয়ান ভাষা' },
      { ko: '한국말 [한궁말]', bengaliPron: 'হানগুংমাল', bengaliMeaning: 'কোরিয়ান কথা' },
    ],
    correctIndex: 1,
    tipBn: '한국어-এর ㄱ পরের নিঃশব্দ ㅇ-এর জায়গায় গিয়ে [한구거] (হানগুগ) উচ্চারিত হয়।',
    tipEn: 'The ㄱ batchim moves to the next syllable ㅇ: 한국어 → [한구거].',
  },
  {
    id: 'pdrill-4',
    audioTextKo: '같이 가요',
    promptEn: 'Listen to the phrase and identify its meaning:',
    promptBn: 'বাক্যটি শুনে সঠিক অর্থসহ উত্তরটি বেছে নিন:',
    options: [
      { ko: '집에 가요', bengaliPron: 'ছিবে খায়ো', bengaliMeaning: 'বাসায় যাই' },
      { ko: '같이 가요 [가치 가요]', bengaliPron: 'খাছি খায়ো', bengaliMeaning: 'চলুন একসাথে যাই' },
      { ko: '빨리 와요', bengaliPron: 'প্পাল্লি ওয়ায়ো', bengaliMeaning: 'তাড়াতাড়ি আসুন' },
    ],
    correctIndex: 1,
    tipBn: 'ㅌ বাতছিমের পরে 이 আসায় 같이 উচ্চারিত হয় [가치] (খাছি), যার অর্থ “একসাথে”।',
    tipEn: 'ㅌ + 이 palatalizes into [가치], meaning "together".',
  },
];

// ============================================================================
// MODULE 5: DAILY CONVERSATIONS (PRACTICAL BENGALI-TO-KOREAN DIALOGUES)
// ============================================================================

export const DAILY_CONVERSATION_LESSONS: DailyConversationLesson[] = [
  {
    id: 'conv-1-greeting',
    order: 1,
    categoryTagKo: '인사 및 자기소개',
    titleEn: 'First Greeting & Self-Introduction',
    titleBn: 'প্রথম পরিচয় ও শুভেচ্ছা বিনিময়',
    situationEn: 'Introducing yourself as a Bangladeshi international student on your first day in Korea.',
    situationBn: 'কোরিয়ায় প্রথম দিন একজন বাংলাদেশী শিক্ষার্থী হিসেবে নিজের পরিচয় দেওয়া।',
    lines: [
      {
        speaker: 'A',
        speakerLabelBn: 'রাহাত (শিক্ষার্থী)',
        speakerLabelEn: 'Rahat (Student)',
        korean: '안녕하세요! 처음 뵙겠습니다.',
        bengaliPron: 'আন্নিওংহাসেয়ো! ছউম বোয়েপগেসসুমনিদা।',
        bengaliMeaning: 'হ্যালো / আসসালামু আলাইকুম! আপনার সাথে প্রথমবার দেখা হলো।',
        englishMeaning: 'Hello! Nice to meet you for the first time.',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'মিনসু (কোরিয়ান বন্ধু)',
        speakerLabelEn: 'Minsu (Korean Classmate)',
        korean: '안녕하세요! 이름이 뭐예요?',
        bengaliPron: 'আন্নিওংহাসেয়ো! ইরুমি মোয়েয়ো?',
        bengaliMeaning: 'হ্যালো! আপনার নাম কী?',
        englishMeaning: 'Hello! What is your name?',
      },
      {
        speaker: 'A',
        speakerLabelBn: 'রাহাত (শিক্ষার্থী)',
        speakerLabelEn: 'Rahat (Student)',
        korean: '저는 라핫입니다. 방글라데시에서 왔어요.',
        bengaliPron: 'ছনুন রাহাত-ইমনিদা। বাংগুল্লাদেশি-এসো ওয়াস্সয়ো।',
        bengaliMeaning: 'আমি রাহাত। আমি বাংলাদেশ থেকে এসেছি।',
        englishMeaning: 'I am Rahat. I came from Bangladesh.',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'মিনসু (কোরিয়ান বন্ধু)',
        speakerLabelEn: 'Minsu (Korean Classmate)',
        korean: '반갑습니다! 한국 생활 잘 부탁드려요.',
        bengaliPron: 'ফানগাপসুমনিদা! হানগুক সেংহোয়াল ছাল বুথাকদুরিঅয়ো।',
        bengaliMeaning: 'দেখা হয়ে খুব খুশি হলাম! কোরিয়ায় আপনার সময় সুন্দর কাটুক।',
        englishMeaning: 'Pleased to meet you! Looking forward to getting along in Korea.',
      },
    ],
    keyPhrases: [
      {
        korean: '방글라데시에서 왔어요',
        bengaliPron: 'বাংগুল্লাদেশি-এসো ওয়াস্সয়ো',
        bengaliMeaning: 'আমি বাংলাদেশ থেকে এসেছি',
        englishMeaning: 'I came from Bangladesh',
      },
      {
        korean: '반갑습니다',
        bengaliPron: 'ফানগাপসুমনিদা',
        bengaliMeaning: 'পরিচিত হয়ে আনন্দিত হলাম',
        englishMeaning: 'Nice to meet you',
      },
    ],
  },
  {
    id: 'conv-2-campus',
    order: 2,
    categoryTagKo: '대학교 캠퍼스',
    titleEn: 'University Classroom & Professor',
    titleBn: 'বিশ্ববিদ্যালয় ক্লাসরুম ও প্রফেসরের সাথে কথা',
    situationEn: 'Asking a professor politely about an assignment deadline and office location.',
    situationBn: 'অ্যাসাইনমেন্ট জমা দেওয়ার শেষ তারিখ ও অফিস কক্ষ সম্পর্কে প্রফেসরকে সম্মানের সাথে প্রশ্ন করা।',
    lines: [
      {
        speaker: 'A',
        speakerLabelBn: 'শিক্ষার্থী',
        speakerLabelEn: 'Student',
        korean: '교수님, 잠시 질문 드려도 될까요?',
        bengaliPron: 'খিওসুনিম, ছামশি ছিলমুন দুরিঅদো দোয়েল্কায়ো?',
        bengaliMeaning: 'প্রফেসর স্যার, আমি কি একটু প্রশ্ন করতে পারি?',
        englishMeaning: 'Professor, may I ask you a quick question?',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'প্রফেসর',
        speakerLabelEn: 'Professor',
        korean: '네, 물론이죠. 무슨 질문인가요?',
        bengaliPron: 'নে, মুল্লোনিজিও। মুসুন ছিলমুন-ইনগায়ো?',
        bengaliMeaning: 'হ্যাঁ, অবশ্যই। কী প্রশ্ন বলো?',
        englishMeaning: 'Yes, of course. What is your question?',
      },
      {
        speaker: 'A',
        speakerLabelBn: 'শিক্ষার্থী',
        speakerLabelEn: 'Student',
        korean: '이번 과제 제출 마감일이 언제입니까?',
        bengaliPron: 'ইবন খোয়াজে ছেছুল মাগাম-ইরি অনজে-ইমনিক্কা?',
        bengaliMeaning: 'এই অ্যাসাইনমেন্ট জমা দেওয়ার শেষ তারিখ কবে?',
        englishMeaning: 'When is the submission deadline for this assignment?',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'প্রফেসর',
        speakerLabelEn: 'Professor',
        korean: '다음 주 금요일 오후 다섯 시까지입니다.',
        bengaliPron: 'থাউম জু খুমিওইল ওহু দাসত শি-ক্কাজি-ইমনিদা।',
        bengaliMeaning: 'আগামী সপ্তাহের শুক্রবার বিকেল ৫টা পর্যন্ত।',
        englishMeaning: 'It is until 5 PM next Friday.',
      },
    ],
    keyPhrases: [
      {
        korean: '질문 드려도 될까요?',
        bengaliPron: 'ছিলমুন দুরিঅদো দোয়েল্কায়ো?',
        bengaliMeaning: 'একটি প্রশ্ন করতে পারি কি?',
        englishMeaning: 'May I ask a question?',
      },
      {
        korean: '과제 제출 마감일',
        bengaliPron: 'খোয়াজে ছেছুল মাগাম-ইল',
        bengaliMeaning: 'অ্যাসাইনমেন্ট জমার শেষ তারিখ',
        englishMeaning: 'Assignment submission deadline',
      },
    ],
  },
  {
    id: 'conv-3-halal-restaurant',
    order: 3,
    categoryTagKo: '식당 및 할랄 음식',
    titleEn: 'Ordering Halal / Non-Pork Food at a Restaurant',
    titleBn: 'রেস্তোরাঁয় খাবার অর্ডার ও হালাল / পর্ক-মুক্ত যাচাই',
    situationEn: 'Checking ingredients politely and ordering seafood or vegetable dishes without pork or ham.',
    situationBn: 'রেস্তোরাঁয় খাবারে শূকরের মাংস বা হ্যাম আছে কিনা জেনে নিরাপদে খাবার অর্ডার করা।',
    lines: [
      {
        speaker: 'A',
        speakerLabelBn: 'শিক্ষার্থী',
        speakerLabelEn: 'Student',
        korean: '저기요! 이 비빔밥에 돼지고기가 들어가요?',
        bengaliPron: 'ছগিও! ই ফিবিমবাপে তোয়েজিগোগিগা দুরগায়ো?',
        bengaliMeaning: 'এক্সকিউজ মি! এই বিবিমবাপে কি শূকরের মাংস দেওয়া থাকে?',
        englishMeaning: 'Excuse me! Does this bibimbap contain pork?',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'রেস্তোরাঁ কর্মী',
        speakerLabelEn: 'Restaurant Staff',
        korean: '네, 조금 들어가는데 빼 드릴까요?',
        bengaliPron: 'নে, ছোগুম দুরগানুন্দে প্পে দুরিল্কায়ো?',
        bengaliMeaning: 'হ্যাঁ, সামান্য দেওয়া হয়, আমি কি ওটা বাদ দিয়ে দেব?',
        englishMeaning: 'Yes, a little bit goes in—would you like me to leave it out?',
      },
      {
        speaker: 'A',
        speakerLabelBn: 'শিক্ষার্থী',
        speakerLabelEn: 'Student',
        korean: '네, 돼지고기하고 햄은 꼭 빼 주세요. 계란은 괜찮아요.',
        bengaliPron: 'নে, তোয়েজিগোগি-হাগো হেম-উন ক্কোক প্পে জুসেয়ো। খিয়েরান-উন খোয়েনছানায়ো।',
        bengaliMeaning: 'হ্যাঁ, শূকরের মাংস এবং হ্যাম অবশ্যই বাদ দেবেন। ডিম থাকলে সমস্যা নেই।',
        englishMeaning: 'Yes, please make sure to leave out pork and ham. Egg is fine.',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'রেস্তোরাঁ কর্মী',
        speakerLabelEn: 'Restaurant Staff',
        korean: '알겠습니다! 야채 비빔밥으로 준비해 드릴게요.',
        bengaliPron: 'আলগেসসুমনিদা! ইয়াছে ফিবিমবাপ-উরো ছুনবিহে দুরিল্কেয়ো।',
        bengaliMeaning: 'বুঝতে পেরেছি! ভেজিটেবল বিবিমবাপ হিসেবে তৈরি করে দিচ্ছি।',
        englishMeaning: 'Understood! I will prepare it as vegetable bibimbap for you.',
      },
    ],
    keyPhrases: [
      {
        korean: '돼지고기 빼 주세요',
        bengaliPron: 'তোয়েজিগোগি প্পে জুসেয়ো',
        bengaliMeaning: 'শূকরের মাংস বাদ দিয়ে দিন',
        englishMeaning: 'Please leave out the pork',
      },
      {
        korean: '할랄 음식 있어요?',
        bengaliPron: 'হাল্লাল উমশিক ইচ্ছয়ো?',
        bengaliMeaning: 'হালাল খাবার আছে কি?',
        englishMeaning: 'Do you have Halal food?',
      },
    ],
  },
  {
    id: 'conv-4-subway',
    order: 4,
    categoryTagKo: '지하철 및 교통',
    titleEn: 'Subway Transfer & T-Money Card',
    titleBn: 'সাবওয়ে স্টেশন, লাইন পরিবর্তন ও টি-মানি কার্ড',
    situationEn: 'Asking which subway exit and transfer line leads to Seoul Station.',
    situationBn: 'সিউল স্টেশনে যাওয়ার জন্য কোন সাবওয়ে লাইনে ট্রান্সফার করতে হবে তা জিজ্ঞাসা করা।',
    lines: [
      {
        speaker: 'A',
        speakerLabelBn: 'যাত্রী',
        speakerLabelEn: 'Commuter',
        korean: '실례합니다. 서울역에 가려면 몇 호선으로 갈아타야 해요?',
        bengaliPron: 'শিল্লিয়েহামনিদা। সউল-ইয়গে খারিঅমিয়ন মিঅত হোসন-উরো খারাথায়া হেয়ো?',
        bengaliMeaning: 'দুঃখিত (এক্সকিউজ মি)। সিউল স্টেশনে যেতে হলে কত নম্বর লাইনে ট্রান্সফার করতে হবে?',
        englishMeaning: 'Excuse me. Which subway line should I transfer to for Seoul Station?',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'স্টেশন কর্মী',
        speakerLabelEn: 'Station Staff',
        korean: '다음 역에서 4호선으로 갈아타세요.',
        bengaliPron: 'থাউম ইয়গেসো সা-হোসন-উরো খারাথাসেয়ো।',
        bengaliMeaning: 'পরের স্টেশনে নেমে ৪ নম্বর লাইনে ট্রান্সফার করুন।',
        englishMeaning: 'Transfer to Line 4 at the next station.',
      },
      {
        speaker: 'A',
        speakerLabelBn: 'যাত্রী',
        speakerLabelEn: 'Commuter',
        korean: '감사합니다! 몇 번 출구로 나가면 되나요?',
        bengaliPron: 'খামসাহামনিদা! মিঅত বন ছুলগুরো নাগামিয়ন দোয়েনায়ো?',
        bengaliMeaning: 'ধন্যবাদ! কত নম্বর এক্সিট (বের হওয়ার গেট) দিয়ে বের হতে হবে?',
        englishMeaning: 'Thank you! Which exit number should I go out through?',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'স্টেশন কর্মী',
        speakerLabelEn: 'Station Staff',
        korean: '2번 출구로 나가시면 바로 보여요.',
        bengaliPron: 'ই-বন ছুলগুরো নাগাশিমিয়ন ফারো বোইয়য়ো।',
        bengaliMeaning: '২ নম্বর এক্সিট দিয়ে বের হলেই সরাসরি দেখতে পাবেন।',
        englishMeaning: 'If you take Exit 2, you will see it right away.',
      },
    ],
    keyPhrases: [
      {
        korean: '갈아타다',
        bengaliPron: 'খারাথাদা',
        bengaliMeaning: 'বাস বা সাবওয়ে পরিবর্তন (ট্রান্সফার) করা',
        englishMeaning: 'To transfer (bus/subway)',
      },
      {
        korean: '몇 번 출구예요?',
        bengaliPron: 'মিঅত বন ছুলগুয়েয়ো?',
        bengaliMeaning: 'কত নম্বর এক্সিট গেট?',
        englishMeaning: 'Which exit number is it?',
      },
    ],
  },
  {
    id: 'conv-5-shopping',
    order: 5,
    categoryTagKo: '편의점 및 쇼핑',
    titleEn: 'Convenience Store & T-Money Top-Up',
    titleBn: 'কনভিনিয়েন্স স্টোরে কেনাকাটা ও টি-মানি রিচার্জ',
    situationEn: 'Recharging a T-Money transit card and paying by card at a Korean convenience store.',
    situationBn: 'কোরিয়ান কনভিনিয়েন্স স্টোরে (CU / GS25) টি-মানি কার্ড রিচার্জ ও পেমেন্ট করা।',
    lines: [
      {
        speaker: 'A',
        speakerLabelBn: 'ক্রেতা',
        speakerLabelEn: 'Customer',
        korean: '교통카드 만 원 충전해 주세요.',
        bengaliPron: 'খিওথং-খাদু মান ওয়ন ছুংজনহে জুসেয়ো।',
        bengaliMeaning: 'ট্রান্সপোর্ট কার্ডে (টি-মানি) ১০,০০০ ওন রিচার্জ করে দিন।',
        englishMeaning: 'Please top up 10,000 KRW on my transit card.',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'দোকানি',
        speakerLabelEn: 'Cashier',
        korean: '네, 카드를 패드 위에 올려 주세요. 봉투 필요하세요?',
        bengaliPron: 'নে, খাদুরুল ফেদু উইয়ে ওল্লিঅ জুসেয়ো। ফংথু ফিরিওহাসেয়ো?',
        bengaliMeaning: 'হ্যাঁ, কার্ডটি প্যাডের ওপর রাখুন। আপনার কি শপিং ব্যাগ লাগবে?',
        englishMeaning: 'Yes, please place your card on the pad. Do you need a bag?',
      },
      {
        speaker: 'A',
        speakerLabelBn: 'ক্রেতা',
        speakerLabelEn: 'Customer',
        korean: '아니요, 가방이 있어요. 영수증은 버려 주세요.',
        bengaliPron: 'আনিয়ো, খাবাং-ই ইচ্ছয়ো। ইয়ংসুজুং-উন ফরিঅ জুসেয়ো।',
        bengaliMeaning: 'না, আমার ব্যাগ আছে। রসিদটি ফেলে দিন।',
        englishMeaning: 'No, I have a bag. Please throw away the receipt.',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'দোকানি',
        speakerLabelEn: 'Cashier',
        korean: '네, 충전 완료되었습니다. 안녕히 가세요!',
        bengaliPron: 'নে, ছুংজন ওয়ান্লিও-দোয়েঅসসুমনিদা। আন্নিওংহি খাসেয়ো!',
        bengaliMeaning: 'হ্যাঁ, রিচার্জ সম্পন্ন হয়েছে। ভালোভাবে যাবেন!',
        englishMeaning: 'Top-up is complete. Goodbye!',
      },
    ],
    keyPhrases: [
      {
        korean: '만 원 충전해 주세요',
        bengaliPron: 'মান ওয়ন ছুংজনহে জুসেয়ো',
        bengaliMeaning: '১০,০০০ ওন রিচার্জ করে দিন',
        englishMeaning: 'Please recharge 10,000 Won',
      },
      {
        korean: '봉투 필요 없어요',
        bengaliPron: 'ফংথু ফিরিও অপসয়ো',
        bengaliMeaning: 'ব্যাগের প্রয়োজন নেই',
        englishMeaning: "I don't need a bag",
      },
    ],
  },
  {
    id: 'conv-6-hospital',
    order: 6,
    categoryTagKo: '병원 및 약국',
    titleEn: 'Visiting a Clinic & Pharmacy',
    titleBn: 'হাসপাতাল, ডাক্তার ও ফার্মেসিতে কথোপকথন',
    situationEn: 'Explaining cold and fever symptoms at a clinic with your ARC card.',
    situationBn: 'জ্বর ও গলাব্যথার লক্ষণ ডাক্তারকে বুঝিয়ে বলা এবং প্রেসক্রিপশন নেওয়া।',
    lines: [
      {
        speaker: 'A',
        speakerLabelBn: 'ডাক্তার',
        speakerLabelEn: 'Doctor',
        korean: '어디가 불편해서 오셨어요?',
        bengaliPron: 'অদিগা বুলফিওনহেসো ওশিঅস্সয়ো?',
        bengaliMeaning: 'শরীরের কোথায় অসুবিধা হওয়ায় এসেছেন?',
        englishMeaning: 'What symptoms brought you in today?',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'রোগী',
        speakerLabelEn: 'Patient',
        korean: '어제부터 열이 나고 목이 많이 아파요.',
        bengaliPron: 'অজেবুথ ইয়রি নাগো মোগি মানি আফায়ো।',
        bengaliMeaning: 'গতকাল থেকে জ্বর আসছে এবং গলায় খুব ব্যথা করছে।',
        englishMeaning: 'Since yesterday I have had a fever and a bad sore throat.',
      },
      {
        speaker: 'A',
        speakerLabelBn: 'ডাক্তার',
        speakerLabelEn: 'Doctor',
        korean: '감기 기운이 있네요. 처방전을 드릴 테니 약국에 가세요.',
        bengaliPron: 'খামগি খিউনি ইন্নেয়ো। ছবাংজন-উল দুরিল থেনি ইয়াক্কুগে খাসেয়ো।',
        bengaliMeaning: 'ঠান্ডা লাগার লক্ষণ দেখা যাচ্ছে। প্রেসক্রিপশন দিচ্ছি, পাশের ফার্মেসিতে যান।',
        englishMeaning: 'You have cold symptoms. I will give you a prescription to take to the pharmacy.',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'রোগী',
        speakerLabelEn: 'Patient',
        korean: '하루에 몇 번 식후에 먹어야 하나요?',
        bengaliPron: 'হারুয়ে মিঅত বন শিকহুয়ে মগয়া হানায়ো?',
        bengaliMeaning: 'দিনে কতবার খাওয়ার পরে ওষুধ খেতে হবে?',
        englishMeaning: 'How many times a day should I take it after meals?',
      },
    ],
    keyPhrases: [
      {
        korean: '열이 나고 목이 아파요',
        bengaliPron: 'ইয়রি নাগো মোগি আফায়ো',
        bengaliMeaning: 'জ্বর এসেছে এবং গলা ব্যথা করছে',
        englishMeaning: 'I have a fever and sore throat',
      },
      {
        korean: '외국인등록증 있어요',
        bengaliPron: 'ওয়েগুগিন-দুংনোকচ্চুং ইচ্ছয়ো',
        bengaliMeaning: 'আমার এআরসি (ARC) কার্ড আছে',
        englishMeaning: 'I have my Alien Registration Card',
      },
    ],
  },
  {
    id: 'conv-7-immigration',
    order: 7,
    categoryTagKo: '출입국 · 외국인청',
    titleEn: 'Immigration Office & Visa Extension',
    titleBn: 'ইমিগ্রেশন অফিস, ভিসা মেয়াদ বৃদ্ধি ও এআরসি',
    situationEn: 'Submitting documents at the Korea Immigration Service for D-2 / D-4 student stay extension.',
    situationBn: 'ডি-২ / ডি-৪ স্টুডেন্ট ভিসার মেয়াদ বাড়ানো ও ঠিকানা পরিবর্তনের জন্য ইমিগ্রেশন অফিসে কথা বলা।',
    lines: [
      {
        speaker: 'A',
        speakerLabelBn: 'শিক্ষার্থী',
        speakerLabelEn: 'Student',
        korean: '안녕하세요. 유학생 비자 연장 신청하러 왔습니다.',
        bengaliPron: 'আন্নিওংহাসেয়ো। ইউহাকসেং বিজা ইয়নজাং শিনছংহারো ওয়াসসুমনিদা।',
        bengaliMeaning: 'হ্যালো। আমি স্টুডেন্ট ভিসার মেয়াদ বাড়ানোর আবেদন করতে এসেছি।',
        englishMeaning: 'Hello. I came to apply for an international student visa extension.',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'ইমিগ্রেশন অফিসার',
        speakerLabelEn: 'Immigration Officer',
        korean: '여권, 외국인등록증, 재학증명서를 보여 주세요.',
        bengaliPron: 'ইয়ক্কোয়ন, ওয়েগুগিন-দুংনোকচ্চুং, ছেহাক-ছুংমিয়ংসরুল বোইয় জুসেয়ো।',
        bengaliMeaning: 'পাসপোর্ট, এআরসি কার্ড এবং বিশ্ববিদ্যালয়ের অধ্যয়ন সনদ দেখান।',
        englishMeaning: 'Please show your passport, ARC card, and certificate of enrollment.',
      },
      {
        speaker: 'A',
        speakerLabelBn: 'শিক্ষার্থী',
        speakerLabelEn: 'Student',
        korean: '여기 있습니다. 기숙사 거주 확인서도 같이 가져왔어요.',
        bengaliPron: 'ইয়গি ইচ্ছুমনিদা। খিসুকসা খজু হোয়াগিনসদো খাছি খাজিওয়াস্সয়ো।',
        bengaliMeaning: 'এই নিন। ডরমিটরিতে থাকার প্রমাণপত্রও সাথে নিয়ে এসেছি।',
        englishMeaning: 'Here they are. I also brought my dormitory residence confirmation.',
      },
      {
        speaker: 'B',
        speakerLabelBn: 'ইমিগ্রেশন অফিসার',
        speakerLabelEn: 'Immigration Officer',
        korean: '서류가 모두 확인되었습니다. 처리 기간은 약 2주 걸립니다.',
        bengaliPron: 'সরিউগা মদু হোয়াগিন-দোয়েঅসসুমনিদা। ছরি খিগান-উন ইয়াক ই-জু খল্লিমনিদা।',
        bengaliMeaning: 'সব কাগজপত্র যাচাই সম্পন্ন হয়েছে। প্রক্রিয়া সম্পন্ন হতে প্রায় ২ সপ্তাহ লাগবে।',
        englishMeaning: 'All documents are verified. Processing will take about two weeks.',
      },
    ],
    keyPhrases: [
      {
        korean: '비자 연장 신청',
        bengaliPron: 'বিজা ইয়নজাং শিনছং',
        bengaliMeaning: 'ভিসার মেয়াদ বৃদ্ধির আবেদন',
        englishMeaning: 'Visa extension application',
      },
      {
        korean: '체류지 변경 신고',
        bengaliPron: 'ছেরিউজি বিয়নগিয়ং শিনগো',
        bengaliMeaning: 'ঠিকানা পরিবর্তনের রিপোর্ট (১৪ দিনের মধ্যে)',
        englishMeaning: 'Report of change of residence',
      },
    ],
  },
];

// ============================================================================
// MODULE 6: BEGINNER KOREAN GRAMMAR (8 STRUCTURED UNITS)
// ============================================================================

export const GRAMMAR_LESSONS: GrammarLessonUnit[] = [
  {
    id: 'gram-1-topic',
    order: 1,
    patternKo: '은 / 는',
    titleEn: 'Topic Particle (As for / Speaking of)',
    titleBn: 'টপিক বা প্রসঙ্গ পার্টিকেল (은 / 는)',
    formula: 'Noun + 은 (after Batchim) / 는 (no Batchim)',
    ruleBn:
      'বাক্যে কার সম্পর্কে কথা বলা হচ্ছে (যেমন: আমি, আমার নাম, কোরিয়া) তা বোঝাতে শব্দের শেষে 은 বা 는 বসে। বাংলায় এটি “আমি হলাম...” বা তুলনা বোঝাতে কাজ করে।',
    ruleEn:
      'Attached to a noun to introduce the main topic of a sentence or show contrast (e.g., "As for me...").',
    batchimRuleBn: 'শব্দের শেষে বাতছিম (নিচে ব্যঞ্জনবর্ণ) থাকলে + 은 (যেমন: 학생은), আর বাতছিম না থাকলে + 는 (যেমন: 저는)।',
    batchimRuleEn: 'Ends with Batchim consonant → + 은 (학생은). Ends with a vowel → + 는 (저는).',
    examples: [
      {
        korean: '저는 대학생입니다.',
        highlightKo: '는',
        bengaliPron: 'ছনুন থেহাকসেং-ইমনিদা।',
        bengaliMeaning: 'আমি একজন বিশ্ববিদ্যালয় শিক্ষার্থী।',
        englishMeaning: 'I am a university student.',
      },
      {
        korean: '한국어는 재미있어요.',
        highlightKo: '는',
        bengaliPron: 'হানগুগরনুন ছেমি-ইচ্ছয়ো।',
        bengaliMeaning: 'কোরিয়ান ভাষা বেশ মজার।',
        englishMeaning: 'Korean language is interesting.',
      },
      {
        korean: '제 이름은 라핫입니다.',
        highlightKo: '은',
        bengaliPron: 'ছে ইরুমুন রাহাত-ইমনিদা।',
        bengaliMeaning: 'আমার নাম রাহাত।',
        englishMeaning: 'My name is Rahat.',
      },
    ],
    practiceCheck: {
      questionKo: '저___ 방글라데시 사람입니다.',
      bengaliHint: '저 (আমি)-এর নিচে কোনো বাতছিম নেই। কোনটি বসবে?',
      englishHint: '저 has no final consonant (Batchim). Which particle fits?',
      options: ['은', '는', '을', '에'],
      correctIndex: 1,
      explanationBn: '저 শব্দের নিচে বাতছিম না থাকায় 는 বসেছে → 저는 (আমি)।',
      explanationEn: 'Since 저 ends in a vowel without Batchim, attach 는 → 저는.',
    },
  },
  {
    id: 'gram-2-subject',
    order: 2,
    patternKo: '이 / 가',
    titleEn: 'Subject Particle',
    titleBn: 'কর্তা বা সাবজেক্ট পার্টিকেল (이 / 가)',
    formula: 'Noun + 이 (after Batchim) / 가 (no Batchim)',
    ruleBn:
      'কোনো কাজ কে করছে বা কোনো কিছু “আছে/নেই” (있어요 / 없어요) ও আবহাওয়া/অবস্থা বর্ণনা করতে বিশেষ্যের পরে 이 বা 가 বসে।',
    ruleEn:
      'Marks the grammatical subject of an action or descriptive verb, especially before 있어요 (have/exist) and 없어요 (not have).',
    batchimRuleBn: 'বাতছিম থাকলে + 이 (যেমন: 가방이), বাতছিম না থাকলে + 가 (যেমন: 날씨가)।',
    batchimRuleEn: 'With Batchim → + 이 (가방이). Without Batchim → + 가 (날씨가).',
    examples: [
      {
        korean: '오늘 날씨가 좋아요.',
        highlightKo: '가',
        bengaliPron: 'ওনুল নালশ্সিগা ছোআয়ো।',
        bengaliMeaning: 'আজ আবহাওয়া ভালো।',
        englishMeaning: 'The weather is nice today.',
      },
      {
        korean: '시간이 있어요?',
        highlightKo: '이',
        bengaliPron: 'শিগানি ইচ্ছয়ো?',
        bengaliMeaning: 'আপনার হাতে কি সময় আছে?',
        englishMeaning: 'Do you have time?',
      },
      {
        korean: '교실에 책상이 많아요.',
        highlightKo: '이',
        bengaliPron: 'খিওশিরে ছেকসাং-ই মানায়ো।',
        bengaliMeaning: 'ক্লাসরুমে অনেক ডেস্ক আছে।',
        englishMeaning: 'There are many desks in the classroom.',
      },
    ],
    practiceCheck: {
      questionKo: '질문___ 있어요!',
      bengaliHint: '질문 (প্রশ্ন) শব্দের নিচে ㄴ বাতছিম আছে। কোনটি সঠিক?',
      englishHint: '질문 ends with Batchim ㄴ. Choose the right subject particle:',
      options: ['가', '이', '는', '를'],
      correctIndex: 1,
      explanationBn: '질문 শব্দের শেষে ㄴ বাতছিম থাকায় 이 বসে → 질문이 있어요 (আমার একটি প্রশ্ন আছে)।',
      explanationEn: '질문 ends in consonant ㄴ, so 이 is used → 질문이 있어요.',
    },
  },
  {
    id: 'gram-3-object',
    order: 3,
    patternKo: '을 / 를',
    titleEn: 'Object Particle',
    titleBn: 'কর্ম বা অবজেক্ট পার্টিকেল (을 / 를)',
    formula: 'Object Noun + 을 (after Batchim) / 를 (no Batchim) + Verb',
    ruleBn:
      'কোরিয়ান বাক্যে ক্রিয়াপদ (Verb) সবসময় শেষে বসে (আমি + ভাত + খাই)। যে বস্তুর ওপর কাজটি করা হয় (যেমন: ভাত খাই, বই পড়ি, কোরিয়ান শিখি), তার সাথে 을 বা 를 বসে।',
    ruleEn:
      'Korean follows Subject + Object + Verb order. Attach 을/를 to the direct object receiving the action.',
    batchimRuleBn: 'বাতছিম থাকলে + 을 (밥을 = ভাত), বাতছিম না থাকলে + 를 (한국어를 = কোরিয়ান ভাষা)।',
    batchimRuleEn: 'With Batchim → + 을 (밥을). Without Batchim → + 를 (한국어를).',
    examples: [
      {
        korean: '저는 한국어를 공부해요.',
        highlightKo: '를',
        bengaliPron: 'ছনুন হানগুগরুল খংবুহেয়ো।',
        bengaliMeaning: 'আমি কোরিয়ান ভাষা পড়াশোনা করি।',
        englishMeaning: 'I study the Korean language.',
      },
      {
        korean: '아침에 물과 빵을 먹어요.',
        highlightKo: '을',
        bengaliPron: 'আছিমে মুল-গোয়া প্পাং-উল মগয়ো।',
        bengaliMeaning: 'সকালে পানি ও রুটি খাই।',
        englishMeaning: 'I eat water and bread in the morning.',
      },
      {
        korean: '도서관에서 책을 읽어요.',
        highlightKo: '을',
        bengaliPron: 'থোসাগোয়ানেসো ছেগুল ইলগয়ো।',
        bengaliMeaning: 'লাইব্রেরিতে বই পড়ি।',
        englishMeaning: 'I read a book at the library.',
      },
    ],
    practiceCheck: {
      questionKo: '친구와 커피___ 마셔요.',
      bengaliHint: '커피 (কফি) শব্দের নিচে বাতছিম নেই। "কফি পান করি" বোঝাতে কোনটি বসবে?',
      englishHint: '커피 ends in vowel ㅣ without Batchim. Pick the object particle:',
      options: ['을', '를', '이', '에서'],
      correctIndex: 1,
      explanationBn: '커피-তে বাতছিম না থাকায় অবজেক্ট পার্টিকেল 를 বসবে → 커피를 마셔요।',
      explanationEn: '커피 has no Batchim, so attach 를 → 커피를 마셔요 (drink coffee).',
    },
  },
  {
    id: 'gram-4-imnida',
    order: 4,
    patternKo: '입니다 / 입니까?',
    titleEn: 'Formal Polite Copula (am / is / are)',
    titleBn: 'আনুষ্ঠানিক সম্মানসূচক সমাপ্তি (입니다 / 입니까?)',
    formula: 'Noun + 입니다 (Statement) / Noun + 입니까? (Question)',
    ruleBn:
      'ইন্টারভিউ, প্রফেসরের সাথে কথা, প্রেজেন্টেশন বা প্রথম পরিচয়ে “হই / হন” বোঝাতে বিশেষ্যের সাথে সরাসরি 입니다 যুক্ত হয় (মাঝখানে কোনো ফাঁকা বা স্পেস হয় না)। প্রশ্ন করতে 입니까? ব্যবহৃত হয়।',
    ruleEn:
      'Used in formal settings (interviews, professors, official introductions). Attach directly to a noun with no space.',
    batchimRuleBn: 'বাতছিম থাকুক বা না থাকুক — সব ক্ষেত্রেই সরাসরি 입니다 / 입니까? বসে!',
    batchimRuleEn: 'No Batchim change needed! Always attach 입니다 or 입니까? directly.',
    examples: [
      {
        korean: '저는 유학생입니다.',
        highlightKo: '입니다',
        bengaliPron: 'ছনুন ইউহাকসেং-ইমনিদা।',
        bengaliMeaning: 'আমি একজন আন্তর্জাতিক শিক্ষার্থী।',
        englishMeaning: 'I am an international student.',
      },
      {
        korean: '여기가 기숙사입니까?',
        highlightKo: '입니까?',
        bengaliPron: 'ইয়গিগা খিসুকসা-ইমনিক্কা?',
        bengaliMeaning: 'এটি কি ডরমিটরি (ছাত্রাবাস)?',
        englishMeaning: 'Is this place the dormitory?',
      },
      {
        korean: '이분은 우리 교수님입니다.',
        highlightKo: '입니다',
        bengaliPron: 'ইবুনুন উরি খিওসুনিম-ইমনিদা।',
        bengaliMeaning: 'ইনি আমাদের প্রফেসর।',
        englishMeaning: 'This person is our professor.',
      },
    ],
    practiceCheck: {
      questionKo: '어느 나라 사람_______? (আপনি কোন দেশের মানুষ?)',
      bengaliHint: 'আনুষ্ঠানিকভাবে প্রশ্ন করার জন্য কোন সমাপ্তিটি ব্যবহৃত হয়?',
      englishHint: 'Which ending forms a formal polite question?',
      options: ['입니다', '입니까', '을까요', '고 싶어요'],
      correctIndex: 1,
      explanationBn: 'প্রশ্নবোধক আনুষ্ঠানিক বাক্যে বিশেষ্যের পরে 입니까? বসে → 어느 나라 사람입니까?',
      explanationEn: 'Use 입니까? to ask a formal polite question.',
    },
  },
  {
    id: 'gram-5-present',
    order: 5,
    patternKo: '-아요 / -어요 / -해요',
    titleEn: 'Standard Polite Present Tense',
    titleBn: 'চলতি ভদ্র বর্তমান কাল (-아요 / -어요 / -해요)',
    formula: 'ㅏ/ㅗ stem + 아요 | Other vowels + 어요 | 하다 → 해요',
    ruleBn:
      'দৈনন্দিন জীবনে সবচেয়ে বেশি ব্যবহৃত ভদ্র বর্তমান কালের রূপ। মূল ক্রিয়ার 다 বাদ দিয়ে স্বরবর্ণ অনুযায়ী 아요, 어요 অথবা 해요 যুক্ত করতে হয়।',
    ruleEn:
      'The most common polite ending in daily Korean life. Drop 다 from the dictionary form and conjugate based on the last vowel.',
    batchimRuleBn: 'ㅏ বা ㅗ থাকলে + 아요 (가다 → 가요), অন্য স্বরবর্ণে + 어요 (먹다 → 먹어요), আর 하다 থাকলে → 해요 (공부하다 → 공부해요)।',
    batchimRuleEn: 'ㅏ/ㅗ → -아요 (가요); other vowels → -어요 (먹어요); 하다 verbs → 해요 (공부해요).',
    examples: [
      {
        korean: '매일 도서관에 가요.',
        highlightKo: '가요',
        bengaliPron: 'মেইল থোসাগোয়ানে খায়ো।',
        bengaliMeaning: 'প্রতিদিন লাইব্রেরিতে যাই।',
        englishMeaning: 'I go to the library every day.',
      },
      {
        korean: '점심에 비빔밥을 먹어요.',
        highlightKo: '먹어요',
        bengaliPron: 'ছমশিমে ফিবিমবাপুল মগয়ো।',
        bengaliMeaning: 'দুপুরের খাবারে বিবিমবাপ খাই।',
        englishMeaning: 'I eat bibimbap for lunch.',
      },
      {
        korean: '저녁에 한국어를 공부해요.',
        highlightKo: '공부해요',
        bengaliPron: 'ছনিয়গে হানগুগরুল খংবুহেয়ো।',
        bengaliMeaning: 'সন্ধ্যায় কোরিয়ান ভাষা পড়াশোনা করি।',
        englishMeaning: 'I study Korean in the evening.',
      },
    ],
    practiceCheck: {
      questionKo: '먹다 (খাওয়া) ক্রিয়াটির সঠিক বর্তমান কালের রূপ কোনটি?',
      bengaliHint: '먹-এর স্বরবর্ণ হলো ㅓ (ㅏ বা ㅗ নয়)। তাই কোনটি যুক্ত হবে?',
      englishHint: 'The stem 먹 has vowel ㅓ (not ㅏ or ㅗ). Choose the polite present form:',
      options: ['먹아요', '먹어요', '먹해요', '먹습니다요'],
      correctIndex: 1,
      explanationBn: '먹-এ ㅓ স্বরবর্ণ থাকায় 어요 যুক্ত হয়ে 먹어요 (মগয়ো = খাই) হয়।',
      explanationEn: 'Stems without ㅏ/ㅗ take -어요: 먹다 → 먹어요.',
    },
  },
  {
    id: 'gram-6-past',
    order: 6,
    patternKo: '-았어요 / -었어요 / -했어요',
    titleEn: 'Polite Past Tense',
    titleBn: 'ভদ্র অতীত কাল (-았어요 / -었어요 / -했어요)',
    formula: 'ㅏ/ㅗ stem + 았어요 | Other vowels + 었어요 | 하다 → 했어요',
    ruleBn:
      'অতীতে কোনো কাজ সম্পন্ন হয়েছে (“গিয়েছিলাম”, “খেয়েছি”, “পড়েছি”) বোঝাতে ক্রিয়ার সাথে -았어요, -었어요 বা -했어요 যুক্ত হয়।',
    ruleEn:
      'Expresses completed past actions ("went", "ate", "studied") using the same vowel harmony rules as present tense.',
    batchimRuleBn: '가다 → 갔어요 (গিয়েছিলাম), 오다 → 왔어요 (এসেছি), 먹다 → 먹었어요 (খেয়েছি), 공부하다 → 공부했어요 (পড়েছি)।',
    batchimRuleEn: '가다 → 갔어요, 오다 → 왔어요, 먹다 → 먹었어요, 공부하다 → 했어요.',
    examples: [
      {
        korean: '작년에 한국에 왔어요.',
        highlightKo: '왔어요',
        bengaliPron: 'ছাকনিয়নে হানগুগে ওয়াস্সয়ো।',
        bengaliMeaning: 'গত বছর কোরিয়ায় এসেছি।',
        englishMeaning: 'I came to Korea last year.',
      },
      {
        korean: '어제 친구를 만났어요.',
        highlightKo: '만났어요',
        bengaliPron: 'অজে ছিনগুরুল মান্নাস্সয়ো।',
        bengaliMeaning: 'গতকাল বন্ধুর সাথে দেখা করেছিলাম।',
        englishMeaning: 'I met my friend yesterday.',
      },
      {
        korean: '주말에 방을 청소했어요.',
        highlightKo: '청소했어요',
        bengaliPron: 'ছুমারে ফাং-উল ছংসোহেস্সয়ো।',
        bengaliMeaning: 'সাপ্তাহিক ছুটিতে রুম পরিষ্কার করেছি।',
        englishMeaning: 'I cleaned my room on the weekend.',
      },
    ],
    practiceCheck: {
      questionKo: '어제 도서관에서 공부_______. (গতকাল লাইব্রেরিতে পড়াশোনা করেছিলাম)',
      bengaliHint: '공부하다 ক্রিয়ার অতীত রূপ কোনটি?',
      englishHint: 'Choose the polite past tense of 공부하다:',
      options: ['해요', '했어요', '가요', '왔어요'],
      correctIndex: 1,
      explanationBn: '하다 যুক্ত ক্রিয়ার অতীত কালে 했어요 হয় → 공부했어요।',
      explanationEn: '하다 verbs conjugate to 했어요 in the past tense.',
    },
  },
  {
    id: 'gram-7-location',
    order: 7,
    patternKo: '에 vs 에서',
    titleEn: 'Time/Destination (에) vs Action Place (에서)',
    titleBn: 'গন্তব্য ও সময় (에) বনাম কাজের স্থান (에서)',
    formula: 'Time / Destination + 에 | Place of Active Verb + 에서',
    ruleBn:
      'কোথাও যাওয়া/আসা/থাকা (가다, 오다, 있다) অথবা সময় বোঝাতে 에 বসে। কিন্তু কোনো স্থানে বসে সক্রিয় কাজ করা (পড়া, খাওয়া, কাজ করা) এবং “কোথা থেকে এসেছি” বোঝাতে 에서 বসে!',
    ruleEn:
      'Use 에 for time, static existence (있어요), or destination (가요/와요). Use 에서 where an active action happens or meaning "from".',
    batchimRuleBn: 'বাতছিমের কারণে 에 বা 에서 পরিবর্তিত হয় না — অর্থের ওপর ভিত্তি করে বসে।',
    batchimRuleEn: 'Shape never changes by Batchim—choose based on destination vs. active place.',
    examples: [
      {
        korean: '오전 아홉 시에 학교에 가요.',
        highlightKo: '에',
        bengaliPron: 'ওজন আহোপ শিয়ে হাক্কিওয়ে খায়ো।',
        bengaliMeaning: 'সকাল ৯টায় বিশ্ববিদ্যালয়ে যাই।',
        englishMeaning: 'I go to school at 9 AM.',
      },
      {
        korean: '학생 식당에서 점심을 먹어요.',
        highlightKo: '에서',
        bengaliPron: 'হাকসেং শিকদাং-এসো ছমশিমুল মগয়ো।',
        bengaliMeaning: 'স্টুডেন্ট ক্যাফেটেরিয়ায় দুপুরের খাবার খাই।',
        englishMeaning: 'I eat lunch at the student cafeteria.',
      },
      {
        korean: '서울에서 아르바이트를 해요.',
        highlightKo: '에서',
        bengaliPron: 'সউল-এসো আরুবাইথুরুল হেয়ো।',
        bengaliMeaning: 'সিউলে পার্ট-টাইম জব করি।',
        englishMeaning: 'I work a part-time job in Seoul.',
      },
    ],
    practiceCheck: {
      questionKo: '도서관____ 책을 읽어요. (লাইব্রেরিতে বসে বই পড়ি)',
      bengaliHint: 'লাইব্রেরির ভেতরে “বই পড়া” একটি সক্রিয় কাজ। কোন পার্টিকেল বসবে?',
      englishHint: 'Reading a book is an active action happening inside the library:',
      options: ['에', '에서', '를', '은'],
      correctIndex: 1,
      explanationBn: 'কোনো স্থানে সক্রিয় কাজ (পড়া, খাওয়া, কাজ করা) হলে 에서 বসে → 도서관에서।',
      explanationEn: 'Active actions at a location require 에서 → 도서관에서 책을 읽어요.',
    },
  },
  {
    id: 'gram-8-desire-negation',
    order: 8,
    patternKo: '-고 싶어요 & 안',
    titleEn: 'Expressing Desire ("Want to") & Negation ("Not")',
    titleBn: 'ইচ্ছা প্রকাশ (-고 싶어요) ও না-বোধক বাক্য (안)',
    formula: 'Verb Stem + 고 싶어요 (Want to) | 안 + Verb (Do not)',
    ruleBn:
      'কোনো কিছু করতে চাওয়া বোঝাতে মূল ক্রিয়ার 다 বাদ দিয়ে -고 싶어요 বসাতে হয়। আর সাধারণ না-বোধক বাক্য তৈরিতে ক্রিয়ার ঠিক আগে 안 বসালেই হয়।',
    ruleEn:
      'Drop 다 and attach -고 싶어요 to say "I want to [verb]". Place 안 right before the verb to say "do not".',
    batchimRuleBn: '가다 → 가고 싶어요 (যেতে চাই); 먹다 → 안 먹어요 (খাই না)।',
    batchimRuleEn: '가다 → 가고 싶어요 (want to go); 먹다 → 안 먹어요 (do not eat).',
    examples: [
      {
        korean: '한국 대학교에 입학하고 싶어요.',
        highlightKo: '고 싶어요',
        bengaliPron: 'হানগুক থেহাক্কিওয়ে ইপহাক-হাগো শিফয়ো।',
        bengaliMeaning: 'কোরিয়ান বিশ্ববিদ্যালয়ে ভর্তি হতে চাই।',
        englishMeaning: 'I want to enroll in a Korean university.',
      },
      {
        korean: '저는 돼지고기를 안 먹어요.',
        highlightKo: '안',
        bengaliPron: 'ছনুন তোয়েজিগোগিরুল আন মগয়ো।',
        bengaliMeaning: 'আমি শূকরের মাংস খাই না।',
        englishMeaning: 'I do not eat pork.',
      },
      {
        korean: '주말에 부산에 가고 싶어요.',
        highlightKo: '고 싶어요',
        bengaliPron: 'ছুমারে বুসানে খাগো শিফয়ো।',
        bengaliMeaning: 'ছুটির দিনে বুসানে যেতে চাই।',
        englishMeaning: 'I want to go to Busan on the weekend.',
      },
    ],
    practiceCheck: {
      questionKo: '한국어를 잘 배우_______! (কোরিয়ান ভাষা ভালোভাবে শিখতে চাই!)',
      bengaliHint: '배우다 (শেখা) থেকে 다 বাদ দিয়ে “চাই” বোঝাতে কোনটি বসবে?',
      englishHint: 'Attach the "want to" ending to 배우다 (to learn):',
      options: ['고 싶어요', '입니까', '에서요', '안 해요'],
      correctIndex: 0,
      explanationBn: '배우다 → 배우 + 고 싶어요 = 배우고 싶어요 (শিখতে চাই)।',
      explanationEn: 'Drop 다 from 배우다 and add -고 싶어요 → 배우고 싶어요.',
    },
  },
];

// ============================================================================
// MODULE 8: KOREAN QUIZ BANK (MCQs, LISTENING AUDIO & VOCABULARY TESTS)
// ============================================================================

export const LEARN_HANGUL_QUIZ_BANK: LearnHangulQuizQuestion[] = [
  {
    id: 'lhq-1',
    category: 'mcq',
    questionEn: 'Which Korean basic vowel represents the Bengali sound "আ (a)"?',
    questionBn: 'বাংলা "আ (a)" ধ্বনি প্রকাশ করে কোন মৌলিক হানগুল স্বরবর্ণটি?',
    options: [
      { text: 'ㅏ', subBn: 'আ (a)' },
      { text: 'ㅓ', subBn: 'অ (eo)' },
      { text: 'ㅗ', subBn: 'ও (o)' },
      { text: 'ㅜ', subBn: 'উ (u)' },
    ],
    correctIndex: 0,
    explanationBn: 'ㅏ স্বরবর্ণের উচ্চারণ হলো বাংলা "আ" (যেমন: 가 = গা/খা)।',
    explanationEn: 'ㅏ represents the open "a" sound (আ in Bengali).',
  },
  {
    id: 'lhq-2',
    category: 'mcq',
    questionEn: 'When ㅇ appears at the BOTTOM (Batchim) of a syllable like 방, how is it pronounced?',
    questionBn: 'ㅇ বর্ণটি যখন সিলেবলের নিচে (বাতছিম হিসেবে, যেমন 방) বসে, তখন এর উচ্চারণ কী হয়?',
    highlightKo: '방',
    options: [
      { text: 'Silent (নিঃশব্দ)', subBn: 'কোনো উচ্চারণ নেই' },
      { text: 'ং / ng', subBn: 'অনুস্বার ধ্বনি' },
      { text: 'ম / m', subBn: 'ㅁ ধ্বনি' },
      { text: 'ল / l', subBn: 'ㄹ ধ্বনি' },
    ],
    correctIndex: 1,
    explanationBn: 'ㅇ শুরুতে নিঃশব্দ হলেও নিচে (বাতছিম) বসলে বাংলা "ং (ng)" উচ্চারিত হয় — তাই 방 = ফাং/বাং (রুম)।',
    explanationEn: 'ㅇ is silent at the start of a block, but sounds like "ng (ং)" in Batchim position.',
  },
  {
    id: 'lhq-3',
    category: 'mcq',
    questionEn: 'Which double consonant (쌍자음) makes the tense "প্প (pp)" sound as in 빵 (bread)?',
    questionBn: 'কোন যুগ্ম ব্যঞ্জনবর্ণটি (쌍자음) "빵 (রুটি)" শব্দের মতো জোরালো "প্প (pp)" ধ্বনি তৈরি করে?',
    highlightKo: '빵',
    options: [
      { text: 'ㄲ', subBn: 'ক্ক (kk)' },
      { text: 'ㄸ', subBn: 'ত্ত (tt)' },
      { text: 'ㅃ', subBn: 'প্প (pp)' },
      { text: 'ㅉ', subBn: 'চ্চ (jj)' },
    ],
    correctIndex: 2,
    explanationBn: 'ㅃ (সাং-বিউপ) বাতাস ছাড়া শক্তভাবে বাংলা "প্প" উচ্চারিত হয় (빵 = প্পাং = রুটি)।',
    explanationEn: 'ㅃ (Ssang-bieup) produces the tense unaspirated "pp" sound.',
  },
  {
    id: 'lhq-4',
    category: 'mcq',
    questionEn: 'Combine the letters ㅎ + ㅏ + ㄴ into a single Korean syllable block:',
    questionBn: 'ㅎ + ㅏ + ㄴ বর্ণ তিনটি যুক্ত করলে কোন সিলেবল ব্লকটি তৈরি হবে?',
    options: [
      { text: '한', subBn: 'হান (han)' },
      { text: '하', subBn: 'হা (ha)' },
      { text: '혼', subBn: 'হোন (hon)' },
      { text: '학', subBn: 'হাক (hak)' },
    ],
    correctIndex: 0,
    explanationBn: 'ㅎ (হ) + ㅏ (আ) + ㄴ (ন বাতছিম) মিলে তৈরি হয় 한 (হান)।',
    explanationEn: 'Initial ㅎ + medial ㅏ + final batchim ㄴ forms 한 (han).',
  },
  {
    id: 'lhq-5',
    category: 'listening',
    audioKo: '안녕하세요',
    questionEn: 'Listen to the native Korean audio and choose the matching phrase:',
    questionBn: 'কোরিয়ান অডিওটি শুনে সঠিক বাক্য ও বাংলা অর্থ বাছাই করুন:',
    options: [
      { text: '안녕하세요', subBn: 'আন্নিওংহাসেয়ো — হ্যালো / কেমন আছেন' },
      { text: '감사합니다', subBn: 'খামসাহামনিদা — ধন্যবাদ' },
      { text: '죄송합니다', subBn: 'ছোয়েসংহামনিদা — আন্তরিকভাবে দুঃখিত' },
      { text: '잠시만요', subBn: 'ছামশিমানিও — একটু অপেক্ষা করুন' },
    ],
    correctIndex: 0,
    explanationBn: 'অডিওতে উচ্চারিত হয়েছে 안녕하세요 (আন্নিওংহাসেয়ো), যার অর্থ হ্যালো / কেমন আছেন।',
    explanationEn: 'The audio played 안녕하세요 (Hello / How are you).',
  },
  {
    id: 'lhq-6',
    category: 'listening',
    audioKo: '돼지고기 빼 주세요',
    questionEn: 'Listen to this essential restaurant phrase and pick its meaning:',
    questionBn: 'রেস্তোরাঁয় ব্যবহৃত এই গুরুত্বপূর্ণ বাক্যটি শুনে সঠিক অর্থ নির্বাচন করুন:',
    options: [
      { text: '물 좀 주세요', subBn: 'দয়া করে পানি দিন' },
      { text: '돼지고기 빼 주세요', subBn: 'দয়া করে শূকরের মাংস বাদ দিন' },
      { text: '계산해 주세요', subBn: 'দয়া করে বিল নিন' },
      { text: '포장해 주세요', subBn: 'দয়া করে পার্সেল করে দিন' },
    ],
    correctIndex: 1,
    explanationBn: '돼지고기 빼 주세요 (তোয়েজিগোগি প্পে জুসেয়ো) অর্থ “দয়া করে শূকরের মাংস বাদ দিয়ে দিন”।',
    explanationEn: '돼지고기 빼 주세요 means "Please leave out the pork."',
  },
  {
    id: 'lhq-7',
    category: 'listening',
    audioKo: '대학교',
    questionEn: 'Listen to the word and identify the correct Korean spelling & Bengali meaning:',
    questionBn: 'অডিও শব্দটি শুনে সঠিক কোরিয়ান বানান ও বাংলা অর্থটি বাছাই করুন:',
    options: [
      { text: '도서관', subBn: 'থোসাগোয়ান — লাইব্রেরি' },
      { text: '기숙사', subBn: 'খিসুকসা — ডরমিটরি' },
      { text: '대학교', subBn: 'থেহাক্কিও — বিশ্ববিদ্যালয়' },
      { text: '출입국', subBn: 'ছুরিপগুক — ইমিগ্রেশন' },
    ],
    correctIndex: 2,
    explanationBn: '대학교 (থেহাক্কিও) অর্থ বিশ্ববিদ্যালয় (University)।',
    explanationEn: '대학교 means University.',
  },
  {
    id: 'lhq-8',
    category: 'listening',
    audioKo: '지하철역이 어디예요?',
    questionEn: 'Listen to the question and select what the speaker is asking:',
    questionBn: 'প্রশ্নটি মনোযোগ দিয়ে শুনে বলুন বক্তা কী জানতে চাইছেন?',
    options: [
      { text: '지하철역이 어디예요?', subBn: 'সাবওয়ে স্টেশন কোথায়?' },
      { text: '화장실이 어디예요?', subBn: 'ওয়াশরুম কোথায়?' },
      { text: '얼마예요?', subBn: 'দাম কত?' },
      { text: '몇 시예요?', subBn: 'কয়টা বাজে?' },
    ],
    correctIndex: 0,
    explanationBn: '지하철역이 어디예요? (ছিহাছল-ইয়গি অদিয়েয়ো?) অর্থ “সাবওয়ে স্টেশন কোথায়?”।',
    explanationEn: '지하철역이 어디예요? means "Where is the subway station?"',
  },
  {
    id: 'lhq-9',
    category: 'vocabulary',
    questionEn: 'What is the Bengali meaning of the Korean word "장학금 (ছাংহাক্কুম)"?',
    questionBn: '"장학금 (ছাংহাক্কুম)" কোরিয়ান শব্দটির বাংলা অর্থ কী?',
    highlightKo: '장학금',
    options: [
      { text: 'টিউশন ফি (등록금)', subBn: 'Tuition fee' },
      { text: 'শিক্ষাবৃত্তি / স্কলারশিপ', subBn: 'Scholarship' },
      { text: 'ছাত্রাবাস (기숙사)', subBn: 'Dormitory' },
      { text: 'প্রবেশপত্র (수험표)', subBn: 'Admit card' },
    ],
    correctIndex: 1,
    explanationBn: '장학금 (ছাংহাক্কুম) অর্থ শিক্ষাবৃত্তি বা স্কলারশিপ (যেমন GKS 장학금)।',
    explanationEn: '장학금 means Scholarship.',
  },
  {
    id: 'lhq-10',
    category: 'vocabulary',
    questionEn: 'Which Korean word means "Dormitory / ছাত্রাবাস"?',
    questionBn: '"ছাত্রাবাস বা ডরমিটরি" বোঝাতে কোন কোরিয়ান শব্দটি ব্যবহৃত হয়?',
    options: [
      { text: '기숙사', subBn: 'খিসুকসা (Dormitory)' },
      { text: '약국', subBn: 'ইয়াক্কুক (Pharmacy)' },
      { text: '은행', subBn: 'উনহেং (Bank)' },
      { text: '공항', subBn: 'খংহাং (Airport)' },
    ],
    correctIndex: 0,
    explanationBn: '기숙사 (খিসুকসা) মানে বিশ্ববিদ্যালয়ের ডরমিটরি বা ছাত্রাবাস।',
    explanationEn: '기숙사 means Dormitory.',
  },
  {
    id: 'lhq-11',
    category: 'vocabulary',
    questionEn: 'Fill in the correct particle: 저는 한국어___ 공부해요. (আমি কোরিয়ান ভাষা পড়ি)',
    questionBn: 'শূন্যস্থানে সঠিক পার্টিকেল বসান: 저는 한국어___ 공부해요. (আমি কোরিয়ান ভাষা পড়ি)',
    highlightKo: '저는 한국어___ 공부해요.',
    options: [
      { text: '을', subBn: 'বাতছিম থাকলে অবজেক্ট পার্টিকেল' },
      { text: '를', subBn: 'বাতছিম না থাকলে অবজেক্ট পার্টিকেল' },
      { text: '에', subBn: 'গন্তব্য পার্টিকেল' },
      { text: '입니까', subBn: 'প্রশ্নসূচক সমাপ্তি' },
    ],
    correctIndex: 1,
    explanationBn: '한국어 শব্দের নিচে কোনো বাতছিম নেই, তাই অবজেক্ট পার্টিকেল 를 বসেছে → 한국어를 공부해요।',
    explanationEn: '한국어 ends in a vowel without Batchim, so it takes the object particle 를.',
  },
  {
    id: 'lhq-12',
    category: 'vocabulary',
    questionEn: 'What does "외국인등록증 (ওয়েগুগিন-দুংনোকচ্চুং)" mean?',
    questionBn: '"외국인등록증 (ওয়েগুগিন-দুংনোকচ্চুং)" শব্দটির অর্থ কী?',
    highlightKo: '외국인등록증',
    options: [
      { text: 'বিমানের টিকিট', subBn: 'Flight ticket' },
      { text: 'বিদেশি নিবন্ধন কার্ড (ARC)', subBn: 'Alien Registration Card' },
      { text: 'স্বাস্থ্য বীমা কার্ড', subBn: 'Health insurance card' },
      { text: 'সাবওয়ে পাস', subBn: 'Subway pass' },
    ],
    correctIndex: 1,
    explanationBn: '외국인등록증 হলো কোরিয়ার বিদেশি নিবন্ধন কার্ড বা ARC (Alien Registration Card)।',
    explanationEn: '외국인등록증 is the official Residence / Alien Registration Card (ARC) in Korea.',
  },
];

// Quick Homepage Interactive Sound Cards
export const HOMEPAGE_SAMPLER_CARDS = [
  {
    id: 'samp-1',
    tagEn: 'Basic Vowel + Consonant',
    tagBn: 'মৌলিক বর্ণ ও শব্দ',
    korean: '가방',
    jamo: 'ㄱ + ㅏ + ㅂ + ㅏ + ㅇ',
    bengaliPron: 'খাবাং',
    bengaliMeaning: 'ব্যাগ (Bag)',
  },
  {
    id: 'samp-2',
    tagEn: 'Polite Greeting',
    tagBn: 'দৈনন্দিন অভিবাদন',
    korean: '안녕하세요',
    jamo: '인사 · Greeting',
    bengaliPron: 'আন্নিওংহাসেয়ো',
    bengaliMeaning: 'হ্যালো / কেমন আছেন',
  },
  {
    id: 'samp-3',
    tagEn: 'Campus Essential',
    tagBn: 'ক্যাম্পাস শব্দ',
    korean: '대학교',
    jamo: '대학 · University',
    bengaliPron: 'থেহাক্কিও',
    bengaliMeaning: 'বিশ্ববিদ্যালয়',
  },
  {
    id: 'samp-4',
    tagEn: 'Practical Halal Dining',
    tagBn: 'বাস্তব কথোপকথন',
    korean: '돼지고기 빼 주세요',
    jamo: '식당 · Dining',
    bengaliPron: 'তোয়েজিগোগি প্পে জুসেয়ো',
    bengaliMeaning: 'শূকরের মাংস বাদ দিন',
  },
];
