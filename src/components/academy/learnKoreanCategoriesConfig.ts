import React from 'react';
import {
  Award,
  BookOpen,
  Bot,
  Calendar,
  ClipboardCheck,
  Compass,
  FileText,
  GraduationCap,
  Headphones,
  Layers,
  MessageCircle,
  MessageSquare,
  Mic,
  PenTool,
} from 'lucide-react';
import { ExamMode11Id } from '../../services/koreanExamEngine';
import { LearnKoreanModuleId } from './LearnKoreanModulesView';

export type MainCategory13Id =
  | 'vocabulary'
  | 'grammar'
  | 'sentence_builder'
  | 'conversation_speaking'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'pronunciation'
  | 'topik_prep'
  | 'mock_exams'
  | 'hangul'
  | 'daily_korean'
  | 'ai_tutor';

export type VocabActivityMode =
  | 'cards'
  | 'flashcards'
  | 'ko_to_meaning'
  | 'meaning_to_ko'
  | 'listening_id'
  | 'fill_blank'
  | 'mcq'
  | 'spelling'
  | 'review_mistakes';

export type VocabLexicalFocus = 'all' | 'topik' | 'synonyms' | 'antonyms';

export interface LearnKoreanPresetPayload {
  // Vocabulary presets
  vocabCategory?: string;
  vocabDifficulty?: string;
  vocabActivityMode?: VocabActivityMode;
  vocabLexicalFocus?: VocabLexicalFocus;

  // Grammar presets
  grammarTier?: 'all' | 'Beginner' | 'Intermediate' | 'Advanced';
  grammarCategory13?: string;
  grammarPracticeFocus?: boolean;

  // Sentence Builder presets
  sentenceCategory12?: string;
  sentenceDifficulty?: string;
  sentenceExerciseMode?: 'study' | 'reconstruction' | 'word_order' | 'fill_blank' | 'translation';

  // Conversation presets
  convDifficulty?: string;
  convRegister?: string;
  convRoleplay?: boolean;

  // Listening & Speaking / Pronunciation presets
  listenCategory?: string;
  dictationMode?: boolean;
  audioRate?: number;
  speakingFocus?: 'drills' | 'rules' | 'liaison';

  // Reading, Writing & Daily Korean presets
  readingGenre?: string;
  readingLevel?: string;
  writingCat?: string;
  dailySection?: 'all' | 'word' | 'grammar' | 'quiz';

  // Hangul presets
  hangulTab?: 'vowels' | 'consonants' | 'syllables' | 'reading' | 'writing' | 'quiz';

  // Exam & TOPIK presets
  examSetupMode?: 'modes_11' | 'custom' | 'quiz_sets' | 'history';
  examAutoLaunchModeId?: ExamMode11Id;
  examSubjectFilter?: string;

  // AI Tutor presets
  aiTutorMode?: 'conversation' | 'writing';
  aiScenarioTitle?: string;
  aiWritingGoal?: string;
  openQuickAiDrawer?: boolean;
}

export interface LearnKoreanSubcategoryItem {
  id: string;
  label: string;
  labelKo: string;
  description: string;
  moduleId: LearnKoreanModuleId;
  preset: LearnKoreanPresetPayload;
  keywords?: string[];
}

export interface LearnKoreanMainCategory {
  id: MainCategory13Id;
  title: string;
  titleKo: string;
  description: string;
  icon: React.ElementType;
  defaultModuleId: LearnKoreanModuleId;
  defaultPreset: LearnKoreanPresetPayload;
  subcategories: LearnKoreanSubcategoryItem[];
}

export const LEARN_KOREAN_13_CATEGORIES: LearnKoreanMainCategory[] = [
  {
    id: 'vocabulary',
    title: 'Vocabulary',
    titleKo: '어휘 학습',
    description: 'Essential Korean words organized by level, real-life topics, synonyms, antonyms, and flashcards.',
    icon: Layers,
    defaultModuleId: 'vocabulary',
    defaultPreset: {
      vocabCategory: 'all',
      vocabDifficulty: 'all',
      vocabActivityMode: 'cards',
      vocabLexicalFocus: 'all',
    },
    subcategories: [
      {
        id: 'vocab-beginner',
        label: 'Beginner Vocabulary',
        labelKo: '초급 어휘',
        description: 'Core foundational words for everyday greetings, numbers, and basic sentences.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'all', vocabDifficulty: 'Beginner', vocabActivityMode: 'cards', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-intermediate',
        label: 'Intermediate Vocabulary',
        labelKo: '중급 어휘',
        description: 'Expand your fluency for campus discussions, news, and social situations.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'all', vocabDifficulty: 'Intermediate', vocabActivityMode: 'cards', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-advanced',
        label: 'Advanced Vocabulary',
        labelKo: '고급 어휘',
        description: 'Academic, professional, and nuanced Korean expressions for high-level fluency.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'all', vocabDifficulty: 'Advanced', vocabActivityMode: 'cards', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-daily-life',
        label: 'Daily Life Vocabulary',
        labelKo: '일상생활 어휘',
        description: 'Practical words used in daily Korean conversations, errands, and routines.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'daily_conversational', vocabDifficulty: 'all', vocabActivityMode: 'cards', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-university',
        label: 'University Vocabulary',
        labelKo: '대학생활·전공 어휘',
        description: 'Lectures, assignments, dormitories, scholarships, and professor consultations.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'university', vocabDifficulty: 'all', vocabActivityMode: 'cards', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-business',
        label: 'Business Vocabulary',
        labelKo: '비즈니스·직장 어휘',
        description: 'Meetings, interviews, office etiquette, and professional Korean terminology.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'business', vocabDifficulty: 'all', vocabActivityMode: 'cards', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-travel',
        label: 'Travel Vocabulary',
        labelKo: '여행·교통 어휘',
        description: 'Airports, KTX trains, subways, hotels, directions, and sightseeing in Korea.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'travel', vocabDifficulty: 'all', vocabActivityMode: 'cards', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-food-shopping',
        label: 'Food & Shopping',
        labelKo: '음식·쇼핑 어휘',
        description: 'Ordering at Korean restaurants, cafes, markets, and online shopping.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'shopping_restaurant', vocabDifficulty: 'all', vocabActivityMode: 'cards', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-topik',
        label: 'TOPIK Vocabulary',
        labelKo: 'TOPIK 빈출 어휘',
        description: 'High-frequency vocabulary curated for TOPIK I and TOPIK II examinations.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'all', vocabDifficulty: 'all', vocabActivityMode: 'cards', vocabLexicalFocus: 'topik' },
      },
      {
        id: 'vocab-synonyms',
        label: 'Korean Synonyms',
        labelKo: '유의어 학습',
        description: 'Learn similar-meaning Korean word pairs tested on comprehension exams.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'all', vocabDifficulty: 'all', vocabActivityMode: 'cards', vocabLexicalFocus: 'synonyms' },
      },
      {
        id: 'vocab-antonyms',
        label: 'Korean Antonyms',
        labelKo: '반의어 학습',
        description: 'Master opposite Korean word pairs side by side for faster recall.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'all', vocabDifficulty: 'all', vocabActivityMode: 'cards', vocabLexicalFocus: 'antonyms' },
      },
      {
        id: 'vocab-practice',
        label: 'Vocabulary Practice',
        labelKo: '어휘 실전 연습',
        description: 'Interactive quizzes, audio matching, fill-in-the-blank, and spelling drills.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'all', vocabDifficulty: 'all', vocabActivityMode: 'mcq', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-flashcards',
        label: 'Flashcards',
        labelKo: '단어 플래시카드',
        description: 'Tap-to-flip study cards with native pronunciation and example sentences.',
        moduleId: 'vocabulary',
        preset: { vocabCategory: 'all', vocabDifficulty: 'all', vocabActivityMode: 'flashcards', vocabLexicalFocus: 'all' },
      },
      {
        id: 'vocab-daily-word',
        label: 'Daily Word Practice',
        labelKo: '오늘의 단어 연습',
        description: 'Build a consistent habit with curated daily Korean words and usage.',
        moduleId: 'daily_korean',
        preset: { dailySection: 'word' },
      },
    ],
  },
  {
    id: 'grammar',
    title: 'Grammar',
    titleKo: '문법 학습',
    description: 'Clear Korean grammar rules, particles, verb conjugations, tenses, and interactive checks.',
    icon: Compass,
    defaultModuleId: 'grammar',
    defaultPreset: {
      grammarTier: 'all',
      grammarCategory13: 'all',
      grammarPracticeFocus: false,
    },
    subcategories: [
      {
        id: 'grammar-beginner',
        label: 'Beginner Grammar',
        labelKo: '초급 문법',
        description: 'Core sentence endings, polite speech, and essential everyday patterns.',
        moduleId: 'grammar',
        preset: { grammarTier: 'Beginner', grammarCategory13: 'all', grammarPracticeFocus: false },
      },
      {
        id: 'grammar-intermediate',
        label: 'Intermediate Grammar',
        labelKo: '중급 문법',
        description: 'Cause-and-effect, indirect speech, conditionals, and nuanced connectors.',
        moduleId: 'grammar',
        preset: { grammarTier: 'Intermediate', grammarCategory13: 'all', grammarPracticeFocus: false },
      },
      {
        id: 'grammar-advanced',
        label: 'Advanced Grammar',
        labelKo: '고급 문법',
        description: 'Formal written structures, academic expressions, and advanced idioms.',
        moduleId: 'grammar',
        preset: { grammarTier: 'Advanced', grammarCategory13: 'all', grammarPracticeFocus: false },
      },
      {
        id: 'grammar-particles',
        label: 'Particles',
        labelKo: '기초 조사 (은/는, 이/가, 을/를)',
        description: 'Master topic, subject, object, location, and time markers accurately.',
        moduleId: 'grammar',
        preset: { grammarTier: 'all', grammarCategory13: 'basic_particles', grammarPracticeFocus: false },
      },
      {
        id: 'grammar-conjugation',
        label: 'Verb Conjugation',
        labelKo: '동사·형용사 활용',
        description: 'Regular and irregular Korean verb stems with polite and formal endings.',
        moduleId: 'grammar',
        preset: { grammarTier: 'all', grammarCategory13: 'verb_conjugation', grammarPracticeFocus: false },
      },
      {
        id: 'grammar-tenses',
        label: 'Tenses',
        labelKo: '시제 (현재·과거·미래)',
        description: 'Express present actions, past experiences, and future plans naturally.',
        moduleId: 'grammar',
        preset: { grammarTier: 'all', grammarCategory13: 'tenses_present_past_future', grammarPracticeFocus: false },
      },
      {
        id: 'grammar-structures',
        label: 'Sentence Structures',
        labelKo: '문장 구조 및 연결 어미',
        description: 'Combine clauses smoothly with Korean connectors and complex patterns.',
        moduleId: 'grammar',
        preset: { grammarTier: 'all', grammarCategory13: 'complex_structures', grammarPracticeFocus: false },
      },
      {
        id: 'grammar-exercises',
        label: 'Grammar Exercises',
        labelKo: '문법 확인 문제',
        description: 'Test your understanding with targeted multiple-choice grammar checks.',
        moduleId: 'grammar',
        preset: { grammarTier: 'all', grammarCategory13: 'all', grammarPracticeFocus: true },
      },
      {
        id: 'grammar-topik',
        label: 'TOPIK Grammar',
        labelKo: 'TOPIK 핵심 문법',
        description: 'Essential grammar patterns frequently tested in TOPIK I and TOPIK II.',
        moduleId: 'grammar',
        preset: { grammarTier: 'all', grammarCategory13: 'topik_grammar', grammarPracticeFocus: false },
      },
    ],
  },
  {
    id: 'sentence_builder',
    title: 'Sentence Builder',
    titleKo: '문장 만들기',
    description: 'Master Korean Subject–Object–Verb word order through interactive tile reconstruction.',
    icon: MessageCircle,
    defaultModuleId: 'sentences',
    defaultPreset: {
      sentenceCategory12: 'all',
      sentenceDifficulty: 'all',
      sentenceExerciseMode: 'study',
    },
    subcategories: [
      {
        id: 'sb-library',
        label: 'Sentence Library',
        labelKo: '필수 문장 라이브러리',
        description: 'Browse complete Korean sentences with word-by-word audio and grammar hints.',
        moduleId: 'sentences',
        preset: { sentenceCategory12: 'all', sentenceDifficulty: 'all', sentenceExerciseMode: 'study' },
      },
      {
        id: 'sb-reconstruction',
        label: 'Sentence Reconstruction',
        labelKo: '문장 조합 연습',
        description: 'Rebuild full Korean sentences from scrambled word tiles.',
        moduleId: 'sentences',
        preset: { sentenceCategory12: 'all', sentenceDifficulty: 'all', sentenceExerciseMode: 'reconstruction' },
      },
      {
        id: 'sb-word-order',
        label: 'Word Ordering (SOV)',
        labelKo: '어순 배열 연습',
        description: 'Practice natural Korean Subject–Object–Verb placement step by step.',
        moduleId: 'sentences',
        preset: { sentenceCategory12: 'all', sentenceDifficulty: 'all', sentenceExerciseMode: 'word_order' },
      },
      {
        id: 'sb-fill-blank',
        label: 'Fill-in-the-Blank',
        labelKo: '빈칸 채우기',
        description: 'Choose the right particle, verb, or expression to complete each sentence.',
        moduleId: 'sentences',
        preset: { sentenceCategory12: 'all', sentenceDifficulty: 'all', sentenceExerciseMode: 'fill_blank' },
      },
      {
        id: 'sb-translation',
        label: 'Translation Practice',
        labelKo: '번역 매칭 연습',
        description: 'Connect natural meanings to accurate Korean phrasing.',
        moduleId: 'sentences',
        preset: { sentenceCategory12: 'all', sentenceDifficulty: 'all', sentenceExerciseMode: 'translation' },
      },
      {
        id: 'sb-beginner',
        label: 'Beginner Sentences',
        labelKo: '초급 문장 만들기',
        description: 'Short, high-utility Korean sentences for daily communication.',
        moduleId: 'sentences',
        preset: { sentenceCategory12: 'all', sentenceDifficulty: 'Beginner', sentenceExerciseMode: 'study' },
      },
      {
        id: 'sb-intermediate',
        label: 'Intermediate Sentences',
        labelKo: '중급 문장 만들기',
        description: 'Multi-clause sentences for campus, work, and social situations.',
        moduleId: 'sentences',
        preset: { sentenceCategory12: 'all', sentenceDifficulty: 'Intermediate', sentenceExerciseMode: 'study' },
      },
      {
        id: 'sb-campus',
        label: 'Campus & Office Sentences',
        labelKo: '대학·직장 실용 문장',
        description: 'Practical expressions for university classes and Korean workplaces.',
        moduleId: 'sentences',
        preset: { sentenceCategory12: 'university_conversations', sentenceDifficulty: 'all', sentenceExerciseMode: 'study' },
      },
    ],
  },
  {
    id: 'conversation_speaking',
    title: 'Conversation & Speaking',
    titleKo: '회화 및 말하기',
    description: 'Multi-turn situational dialogues across polite, formal, and casual Korean speech.',
    icon: MessageSquare,
    defaultModuleId: 'conversation',
    defaultPreset: {
      convDifficulty: 'all',
      convRegister: 'all',
      convRoleplay: false,
    },
    subcategories: [
      {
        id: 'conv-beginner',
        label: 'Beginner Conversations',
        labelKo: '초급 생활 회화',
        description: 'Self-introductions, cafes, shopping, and simple daily dialogues.',
        moduleId: 'conversation',
        preset: { convDifficulty: 'Beginner', convRegister: 'all', convRoleplay: false },
      },
      {
        id: 'conv-intermediate',
        label: 'Intermediate Conversations',
        labelKo: '중급 실전 회화',
        description: 'Campus life, housing, banking, healthcare, and public services.',
        moduleId: 'conversation',
        preset: { convDifficulty: 'Intermediate', convRegister: 'all', convRoleplay: false },
      },
      {
        id: 'conv-advanced',
        label: 'Advanced Conversations',
        labelKo: '고급 전문 회화',
        description: 'Professional interviews, academic seminars, and formal discussions.',
        moduleId: 'conversation',
        preset: { convDifficulty: 'Advanced', convRegister: 'all', convRoleplay: false },
      },
      {
        id: 'conv-polite',
        label: 'Polite Speech (해요체)',
        labelKo: '해요체 회화',
        description: 'Standard polite Korean used in everyday life across Korea.',
        moduleId: 'conversation',
        preset: { convDifficulty: 'all', convRegister: 'Polite (해요체)', convRoleplay: false },
      },
      {
        id: 'conv-formal',
        label: 'Formal Speech (하십시오체)',
        labelKo: '하십시오체 격식 회화',
        description: 'Honorific formal speech for professors, elders, and interviews.',
        moduleId: 'conversation',
        preset: { convDifficulty: 'all', convRegister: 'Formal (하십시오체)', convRoleplay: false },
      },
      {
        id: 'conv-informal',
        label: 'Casual Speech (반말)',
        labelKo: '반말 친구 회화',
        description: 'Friendly informal speech used among close friends and classmates.',
        moduleId: 'conversation',
        preset: { convDifficulty: 'all', convRegister: 'Informal (반말)', convRoleplay: false },
      },
      {
        id: 'conv-roleplay',
        label: 'Interactive Roleplay Mode',
        labelKo: '롤플레이 말하기 모드',
        description: 'Hide Speaker B lines and practice speaking responses aloud.',
        moduleId: 'conversation',
        preset: { convDifficulty: 'all', convRegister: 'all', convRoleplay: true },
      },
      {
        id: 'conv-voice-speaking',
        label: 'Speaking Voice Practice',
        labelKo: '마이크 발화 연습',
        description: 'Listen to native speakers and practice speaking with click-to-record audio.',
        moduleId: 'speaking',
        preset: { speakingFocus: 'drills' },
      },
      {
        id: 'conv-everyday-scenarios',
        label: 'Real-Life Korea Scenarios',
        labelKo: '한국 생활 필수 상황',
        description: 'Airport arrival, ARC immigration, banking, hospital, and campus guides.',
        moduleId: 'everyday_life',
        preset: {},
      },
    ],
  },
  {
    id: 'listening',
    title: 'Listening',
    titleKo: '듣기 연습',
    description: 'Train your ear with slow and native-speed dialogues, announcements, and dictation.',
    icon: Headphones,
    defaultModuleId: 'listening',
    defaultPreset: {
      listenCategory: 'all',
      dictationMode: false,
      audioRate: 1.0,
    },
    subcategories: [
      {
        id: 'listen-short',
        label: 'Short Dialogues',
        labelKo: '짧은 대화 듣기',
        description: 'Focused two-person exchanges for quick comprehension checks.',
        moduleId: 'listening',
        preset: { listenCategory: 'short_conversations', dictationMode: false, audioRate: 1.0 },
      },
      {
        id: 'listen-long',
        label: 'Long Conversations',
        labelKo: '긴 대화 듣기',
        description: 'Extended dialogues covering university, travel, and workplace topics.',
        moduleId: 'listening',
        preset: { listenCategory: 'long_conversations', dictationMode: false, audioRate: 1.0 },
      },
      {
        id: 'listen-announcements',
        label: 'Public Announcements',
        labelKo: '안내 방송 듣기',
        description: 'Subway, airport, campus, and public facility announcements in Korean.',
        moduleId: 'listening',
        preset: { listenCategory: 'announcements', dictationMode: false, audioRate: 1.0 },
      },
      {
        id: 'listen-daily',
        label: 'Daily Situations',
        labelKo: '일상 상황 듣기',
        description: 'Practical audio comprehension for shopping, dining, and appointments.',
        moduleId: 'listening',
        preset: { listenCategory: 'daily_situations', dictationMode: false, audioRate: 1.0 },
      },
      {
        id: 'listen-topik',
        label: 'TOPIK Listening',
        labelKo: 'TOPIK 듣기 유형',
        description: 'Exam-style audio comprehension modeled on TOPIK I and II.',
        moduleId: 'listening',
        preset: { listenCategory: 'topik_listening', dictationMode: false, audioRate: 1.0 },
      },
      {
        id: 'listen-dictation',
        label: 'Dictation Practice',
        labelKo: '받아쓰기 연습',
        description: 'Listen closely and type the exact Hangul sentence you hear.',
        moduleId: 'listening',
        preset: { listenCategory: 'dictation_practice', dictationMode: true, audioRate: 1.0 },
      },
      {
        id: 'listen-slow',
        label: 'Slow-Speed Audio (0.75x)',
        labelKo: '천천히 듣기 모드',
        description: 'Clear 0.75x articulation for catching every syllable and particle.',
        moduleId: 'listening',
        preset: { listenCategory: 'all', dictationMode: false, audioRate: 0.75 },
      },
    ],
  },
  {
    id: 'reading',
    title: 'Reading',
    titleKo: '읽기 연습',
    description: 'Interactive Korean passages with tap-any-word vocabulary lookup, audio, and questions.',
    icon: BookOpen,
    defaultModuleId: 'reading',
    defaultPreset: {
      readingGenre: 'all',
      readingLevel: 'all',
    },
    subcategories: [
      {
        id: 'read-short',
        label: 'Short Passages',
        labelKo: '짧은 글 읽기',
        description: 'Concise paragraphs ideal for building daily Korean reading speed.',
        moduleId: 'reading',
        preset: { readingGenre: 'Short Passage', readingLevel: 'all' },
      },
      {
        id: 'read-stories',
        label: 'Daily-Life Stories',
        labelKo: '일상 이야기',
        description: 'Relatable stories about student life, seasons, and culture in Korea.',
        moduleId: 'reading',
        preset: { readingGenre: 'Daily-Life Story', readingLevel: 'all' },
      },
      {
        id: 'read-notices',
        label: 'Notices & Announcements',
        labelKo: '공지문·안내문 읽기',
        description: 'Read dormitory rules, public signs, and community notices accurately.',
        moduleId: 'reading',
        preset: { readingGenre: 'Notice & Announcement', readingLevel: 'all' },
      },
      {
        id: 'read-emails',
        label: 'Emails & Messages',
        labelKo: '이메일·메시지 읽기',
        description: 'Understand academic emails, text messages, and appointment confirmations.',
        moduleId: 'reading',
        preset: { readingGenre: 'Email & Message', readingLevel: 'all' },
      },
      {
        id: 'read-university',
        label: 'University Texts',
        labelKo: '대학·학술 지문',
        description: 'Course syllabi, campus announcements, and academic reading passages.',
        moduleId: 'reading',
        preset: { readingGenre: 'University Text', readingLevel: 'all' },
      },
      {
        id: 'read-news',
        label: 'News-Style Passages',
        labelKo: '뉴스·시사 읽기',
        description: 'Structured news articles on society, technology, and life in Korea.',
        moduleId: 'reading',
        preset: { readingGenre: 'News-Style Passage', readingLevel: 'all' },
      },
      {
        id: 'read-intermediate',
        label: 'Intermediate Reading',
        labelKo: '중급 독해 연습',
        description: 'Bridge from basic sentences to multi-paragraph comprehension.',
        moduleId: 'reading',
        preset: { readingGenre: 'Intermediate Reading', readingLevel: 'Intermediate' },
      },
      {
        id: 'read-topik',
        label: 'TOPIK Reading Comprehension',
        labelKo: 'TOPIK 독해 실전',
        description: 'Main-idea, inference, and detail passages styled for TOPIK I & II.',
        moduleId: 'reading',
        preset: { readingGenre: 'TOPIK Reading Comprehension', readingLevel: 'all' },
      },
    ],
  },
  {
    id: 'writing',
    title: 'Writing',
    titleKo: '쓰기 연습',
    description: 'Guided Korean writing tasks with spacing diagnostics, model answers, and AI evaluation.',
    icon: PenTool,
    defaultModuleId: 'writing',
    defaultPreset: {
      writingCat: 'all',
    },
    subcategories: [
      {
        id: 'write-sentence',
        label: 'Korean Sentence Writing',
        labelKo: '문장 쓰기 연습',
        description: 'Compose accurate Korean sentences using target vocabulary and grammar.',
        moduleId: 'writing',
        preset: { writingCat: 'sentence_writing' },
      },
      {
        id: 'write-paragraph',
        label: 'Paragraph Writing',
        labelKo: '문단 쓰기 연습',
        description: 'Structure coherent paragraphs with natural connectors and endings.',
        moduleId: 'writing',
        preset: { writingCat: 'paragraph_writing' },
      },
      {
        id: 'write-correction',
        label: 'Grammar & Spacing Check',
        labelKo: '맞춤법·띄어쓰기 교정',
        description: 'Fix common Korean spacing (띄어쓰기) and particle errors.',
        moduleId: 'writing',
        preset: { writingCat: 'grammar_correction' },
      },
      {
        id: 'write-completion',
        label: 'Sentence Completion',
        labelKo: '빈칸 문장 완성 (51–52번)',
        description: 'Practice formal contextual completion modeled on TOPIK II Q51–52.',
        moduleId: 'writing',
        preset: { writingCat: 'sentence_completion' },
      },
      {
        id: 'write-guided',
        label: 'Guided Writing',
        labelKo: '단계별 가이드 작문',
        description: 'Step-by-step writing prompts with starter hints and checklists.',
        moduleId: 'writing',
        preset: { writingCat: 'guided_writing' },
      },
      {
        id: 'write-diary',
        label: 'Daily Diary Writing',
        labelKo: '한국어 일기 쓰기',
        description: 'Express your daily experiences and reflections in natural Korean.',
        moduleId: 'writing',
        preset: { writingCat: 'daily_diary' },
      },
      {
        id: 'write-email',
        label: 'Professor & Workplace Emails',
        labelKo: '교수님·직장 이메일 작문',
        description: 'Write respectful honorific emails to professors and employers.',
        moduleId: 'writing',
        preset: { writingCat: 'email_writing' },
      },
      {
        id: 'write-topik',
        label: 'TOPIK II Essay Practice',
        labelKo: 'TOPIK II 실전 작문 (53–54번)',
        description: 'Data description and opinion essay prompts modeled on TOPIK II.',
        moduleId: 'writing',
        preset: { writingCat: 'topik_writing' },
      },
    ],
  },
  {
    id: 'pronunciation',
    title: 'Pronunciation',
    titleKo: '발음 교정',
    description: 'Master Korean phonological rules, Batchim linking, mouth positions, and voice shadowing.',
    icon: Mic,
    defaultModuleId: 'speaking',
    defaultPreset: {
      speakingFocus: 'rules',
    },
    subcategories: [
      {
        id: 'pron-rules',
        label: 'Essential Pronunciation Rules',
        labelKo: '필수 발음 규칙',
        description: 'Learn nasalization, palatalization, aspiration, and tensification rules.',
        moduleId: 'speaking',
        preset: { speakingFocus: 'rules' },
      },
      {
        id: 'pron-liaison',
        label: 'Sound Linking (연음 법칙)',
        labelKo: '연음 및 음운 변화',
        description: 'See how written Hangul transforms into smooth natural Seoul speech.',
        moduleId: 'speaking',
        preset: { speakingFocus: 'liaison' },
      },
      {
        id: 'pron-batchim',
        label: 'Batchim (Final Consonants)',
        labelKo: '받침 대표음 연습',
        description: 'Interactive syllable builder and the 7 representative Batchim sounds.',
        moduleId: 'hangul',
        preset: { hangulTab: 'syllables' },
      },
      {
        id: 'pron-shadowing',
        label: 'Voice Recording & Shadowing',
        labelKo: '원어민 따라 말하기',
        description: 'Compare your spoken Korean rhythm with native Seoul teacher audio.',
        moduleId: 'speaking',
        preset: { speakingFocus: 'drills' },
      },
      {
        id: 'pron-vowels',
        label: 'Vowel Mouth Positions',
        labelKo: '모음 입모양 가이드',
        description: 'Distinguish ㅓ/ㅗ, ㅐ/ㅔ, and compound vowels with clear mouth tips.',
        moduleId: 'hangul',
        preset: { hangulTab: 'vowels' },
      },
      {
        id: 'pron-consonants',
        label: 'Plain, Aspirated & Tense Sounds',
        labelKo: '예사소리·거센소리·된소리',
        description: 'Master ㄱ/ㅋ/ㄲ, ㄷ/ㅌ/ㄸ, ㅂ/ㅍ/ㅃ, and ㅈ/ㅊ/ㅉ distinctions.',
        moduleId: 'hangul',
        preset: { hangulTab: 'consonants' },
      },
    ],
  },
  {
    id: 'topik_prep',
    title: 'TOPIK Preparation',
    titleKo: 'TOPIK 대비',
    description: 'Structured preparation for TOPIK I and TOPIK II across reading, listening, writing, and exams.',
    icon: GraduationCap,
    defaultModuleId: 'topik',
    defaultPreset: {
      examSetupMode: 'modes_11',
    },
    subcategories: [
      {
        id: 'topik-1',
        label: 'TOPIK I',
        labelKo: 'TOPIK I (1~2급 대비)',
        description: 'Beginner-to-elementary mock simulation covering Levels 1 and 2.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'topik_1_mock' },
      },
      {
        id: 'topik-2',
        label: 'TOPIK II',
        labelKo: 'TOPIK II (3~6급 대비)',
        description: 'Intermediate-to-advanced mock simulation covering Levels 3 to 6.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'topik_2_mock' },
      },
      {
        id: 'topik-reading',
        label: 'Reading Practice',
        labelKo: 'TOPIK 읽기 연습',
        description: 'Targeted TOPIK reading passages with vocabulary breakdown and questions.',
        moduleId: 'reading',
        preset: { readingGenre: 'TOPIK Reading Comprehension', readingLevel: 'all' },
      },
      {
        id: 'topik-listening',
        label: 'Listening Practice',
        labelKo: 'TOPIK 듣기 연습',
        description: 'Exam-paced audio dialogues and announcements with full transcripts.',
        moduleId: 'listening',
        preset: { listenCategory: 'topik_listening', dictationMode: false, audioRate: 1.0 },
      },
      {
        id: 'topik-writing',
        label: 'Writing Practice',
        labelKo: 'TOPIK 쓰기 연습',
        description: 'Practice TOPIK II Q51–54 sentence completion and essay tasks.',
        moduleId: 'writing',
        preset: { writingCat: 'topik_writing' },
      },
      {
        id: 'topik-previous-sets',
        label: 'Previous Exam Questions',
        labelKo: '유형별 기출 스타일 문제집',
        description: 'Curated exam-style question sets organized by skill and level.',
        moduleId: 'topik',
        preset: { examSetupMode: 'quiz_sets' },
      },
      {
        id: 'topik-random-mock',
        label: 'Randomized Mock Exams',
        labelKo: '실전 랜덤 모의고사',
        description: 'Freshly shuffled timed simulations with unseen-question priority.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11' },
      },
      {
        id: 'topik-results',
        label: 'Exam Results',
        labelKo: '성적 및 오답 분석',
        description: 'Review past scores, accuracy trends, and weak-area diagnostics.',
        moduleId: 'topik',
        preset: { examSetupMode: 'history' },
      },
    ],
  },
  {
    id: 'mock_exams',
    title: 'Mock Exams',
    titleKo: '실전 모의고사',
    description: 'Timed proficiency assessments, skill-specific tests, and custom exam generation.',
    icon: Award,
    defaultModuleId: 'topik',
    defaultPreset: {
      examSetupMode: 'modes_11',
    },
    subcategories: [
      {
        id: 'mock-quick',
        label: 'Quick Test (10 Questions)',
        labelKo: '빠른 진단 테스트 (10문항)',
        description: '10-minute rapid check across vocabulary, grammar, and comprehension.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'quick_test' },
      },
      {
        id: 'mock-standard',
        label: 'Standard Test (20 Questions)',
        labelKo: '표준 실력 테스트 (20문항)',
        description: 'Balanced 25-minute evaluation across core Korean skills.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'standard_test' },
      },
      {
        id: 'mock-full',
        label: 'Full Mock Exam (40 Questions)',
        labelKo: '종합 모의고사 (40문항)',
        description: 'Comprehensive 50-minute simulation with full analytics report.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'full_mock' },
      },
      {
        id: 'mock-intensive',
        label: 'Intensive Practice (60 Questions)',
        labelKo: '심화 집중 모의고사 (60문항)',
        description: 'Extended 75-minute endurance test across all question formats.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'intensive_practice' },
      },
      {
        id: 'mock-vocab',
        label: 'Vocabulary Exam',
        labelKo: '어휘 집중 시험',
        description: 'Dedicated lexical meaning, synonym, and context test.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'vocabulary_exam' },
      },
      {
        id: 'mock-grammar',
        label: 'Grammar Exam',
        labelKo: '문법 집중 시험',
        description: 'Dedicated particles, conjugation, tense, and sentence structure test.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'grammar_exam' },
      },
      {
        id: 'mock-listening',
        label: 'Listening Exam',
        labelKo: '듣기 집중 시험',
        description: 'Audio comprehension test across dialogues and announcements.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'listening_exam' },
      },
      {
        id: 'mock-reading',
        label: 'Reading Exam',
        labelKo: '읽기 집중 시험',
        description: 'Timed passage comprehension across notices, emails, and articles.',
        moduleId: 'topik',
        preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'reading_exam' },
      },
      {
        id: 'mock-custom',
        label: 'Custom Exam Builder',
        labelKo: '맞춤형 시험 만들기',
        description: 'Choose your own topic, difficulty, question type, and time limit.',
        moduleId: 'topik',
        preset: { examSetupMode: 'custom' },
      },
    ],
  },
  {
    id: 'hangul',
    title: 'Korean Alphabet (Hangul)',
    titleKo: '한글 기초 완성',
    description: 'Learn all 40 Hangul letters, syllable block building, stroke order writing, and reading.',
    icon: FileText,
    defaultModuleId: 'hangul',
    defaultPreset: {
      hangulTab: 'vowels',
    },
    subcategories: [
      {
        id: 'hangul-vowels',
        label: 'Basic & Compound Vowels',
        labelKo: '모음 21개 (단모음·이중모음)',
        description: 'Master all 10 basic and 11 compound Korean vowels with native audio.',
        moduleId: 'hangul',
        preset: { hangulTab: 'vowels' },
      },
      {
        id: 'hangul-consonants',
        label: 'Basic & Double Consonants',
        labelKo: '자음 19개 (기본·쌍자음)',
        description: 'Learn all 14 basic and 5 double consonants with initial and final sounds.',
        moduleId: 'hangul',
        preset: { hangulTab: 'consonants' },
      },
      {
        id: 'hangul-syllables',
        label: 'Syllable Formation & Batchim',
        labelKo: '음절 조합 및 받침',
        description: 'Combine consonants and vowels interactively to build real Hangul blocks.',
        moduleId: 'hangul',
        preset: { hangulTab: 'syllables' },
      },
      {
        id: 'hangul-reading',
        label: 'Hangul Reading Practice',
        labelKo: '한글 단어 읽기 연습',
        description: 'Read step by step from simple syllables to real Korean signs and words.',
        moduleId: 'hangul',
        preset: { hangulTab: 'reading' },
      },
      {
        id: 'hangul-writing',
        label: 'Stroke Order & Handwriting',
        labelKo: '한글 획순 및 쓰기 보드',
        description: 'Interactive drawing canvas to practice proper Hangul stroke order.',
        moduleId: 'hangul',
        preset: { hangulTab: 'writing' },
      },
      {
        id: 'hangul-quiz',
        label: 'Hangul Mastery Quiz',
        labelKo: '한글 기초 마무리 퀴즈',
        description: 'Verify your Stage 1 Hangul foundation with audio and visual checks.',
        moduleId: 'hangul',
        preset: { hangulTab: 'quiz' },
      },
    ],
  },
  {
    id: 'daily_korean',
    title: 'Daily Korean',
    titleKo: '오늘의 한국어',
    description: 'Consistent bite-sized daily word, expression, mini quiz, and everyday Korea survival.',
    icon: Calendar,
    defaultModuleId: 'daily_korean',
    defaultPreset: {
      dailySection: 'all',
    },
    subcategories: [
      {
        id: 'daily-word',
        label: 'Word of the Day',
        labelKo: '오늘의 핵심 단어',
        description: 'Learn today’s featured Korean word with audio and sentence context.',
        moduleId: 'daily_korean',
        preset: { dailySection: 'word' },
      },
      {
        id: 'daily-grammar',
        label: 'Daily Grammar & Expression',
        labelKo: '오늘의 문법·표현',
        description: 'One practical Korean grammar tip and natural expression every day.',
        moduleId: 'daily_korean',
        preset: { dailySection: 'grammar' },
      },
      {
        id: 'daily-quiz',
        label: 'Daily Streak Mini Quiz',
        labelKo: '일일 미니 퀴즈',
        description: 'Quick 1-minute daily check to keep your Korean study streak active.',
        moduleId: 'daily_korean',
        preset: { dailySection: 'quiz' },
      },
      {
        id: 'daily-survival',
        label: 'Everyday Life in Korea',
        labelKo: '한국 실생활 16대 상황',
        description: 'Essential Korean for airports, banks, hospitals, dorms, and part-time jobs.',
        moduleId: 'everyday_life',
        preset: {},
      },
      {
        id: 'daily-progress',
        label: 'My Learning Progress',
        labelKo: '나의 학습 리포트',
        description: 'Track mastered words, completed lessons, accuracy, and study recommendations.',
        moduleId: 'progress',
        preset: {},
      },
    ],
  },
  {
    id: 'ai_tutor',
    title: 'AI Korean Tutor',
    titleKo: 'AI 한국어 튜터',
    description: '24/7 interactive Korean conversation coach, grammar explainer, and honorific writing checker.',
    icon: Bot,
    defaultModuleId: 'ai_tutor',
    defaultPreset: {
      aiTutorMode: 'conversation',
    },
    subcategories: [
      {
        id: 'ai-roleplay',
        label: 'AI Conversation Roleplay',
        labelKo: 'AI 실전 회화 롤플레이',
        description: 'Practice natural Korean dialogues across 22 real-life Korea situations.',
        moduleId: 'ai_tutor',
        preset: { aiTutorMode: 'conversation' },
      },
      {
        id: 'ai-writing-check',
        label: 'AI Writing & Honorific Check',
        labelKo: 'AI 문장·존댓말 첨삭',
        description: 'Get instant corrections on particles, spacing, and polite phrasing.',
        moduleId: 'ai_tutor',
        preset: { aiTutorMode: 'writing', aiWritingGoal: 'General polite daily Korean conversation' },
      },
      {
        id: 'ai-professor-email',
        label: 'Professor & Campus Coach',
        labelKo: '대학·교수님 이메일 코칭',
        description: 'Polish emails and messages to Korean university professors and offices.',
        moduleId: 'ai_tutor',
        preset: { aiTutorMode: 'writing', aiWritingGoal: 'Polite email to university professor' },
      },
      {
        id: 'ai-topik-essay',
        label: 'TOPIK II Essay Coach',
        labelKo: 'TOPIK II 논술 첨삭',
        description: 'Receive structured scoring and formal upgrades for TOPIK II essays.',
        moduleId: 'ai_tutor',
        preset: { aiTutorMode: 'writing', aiWritingGoal: 'TOPIK II Question 53/54 Academic Essay' },
      },
      {
        id: 'ai-quick-qa',
        label: 'Instant Grammar & Word Q&A',
        labelKo: '실시간 질문 도우미',
        description: 'Ask any question about Korean nuances, particles, or pronunciation.',
        moduleId: 'ai_tutor',
        preset: { openQuickAiDrawer: true },
      },
    ],
  },
];

// Curated high-frequency Korean Antonym & Synonym reference pairs for lexical mastery
export interface KoreanAntonymReference {
  antonymKo: string;
  antonymRomanization: string;
  antonymMeaningEn: string;
}

export const CURATED_KOREAN_ANTONYM_MAP: Record<string, KoreanAntonymReference> = {
  크다: { antonymKo: '작다', antonymRomanization: 'jakda', antonymMeaningEn: 'Small' },
  작다: { antonymKo: '크다', antonymRomanization: 'keuda', antonymMeaningEn: 'Big / Large' },
  많다: { antonymKo: '적다', antonymRomanization: 'jeokda', antonymMeaningEn: 'Few / Little' },
  적다: { antonymKo: '많다', antonymRomanization: 'manta', antonymMeaningEn: 'Many / Much' },
  비싸다: { antonymKo: '싸다', antonymRomanization: 'ssada', antonymMeaningEn: 'Cheap / Inexpensive' },
  싸다: { antonymKo: '비싸다', antonymRomanization: 'bissada', antonymMeaningEn: 'Expensive' },
  빠르다: { antonymKo: '느리다', antonymRomanization: 'neurida', antonymMeaningEn: 'Slow' },
  느리다: { antonymKo: '빠르다', antonymRomanization: 'ppareuda', antonymMeaningEn: 'Fast / Quick' },
  덥다: { antonymKo: '춥다', antonymRomanization: 'chupda', antonymMeaningEn: 'Cold (weather)' },
  춥다: { antonymKo: '덥다', antonymRomanization: 'deopda', antonymMeaningEn: 'Hot (weather)' },
  따뜻하다: { antonymKo: '시원하다', antonymRomanization: 'siwonhada', antonymMeaningEn: 'Cool / Refreshing' },
  기쁘다: { antonymKo: '슬프다', antonymRomanization: 'seulpeuda', antonymMeaningEn: 'Sad' },
  슬프다: { antonymKo: '기쁘다', antonymRomanization: 'gippeuda', antonymMeaningEn: 'Glad / Happy' },
  쉽다: { antonymKo: '어렵다', antonymRomanization: 'eoryeopda', antonymMeaningEn: 'Difficult' },
  어렵다: { antonymKo: '쉽다', antonymRomanization: 'swipda', antonymMeaningEn: 'Easy' },
  가깝다: { antonymKo: '멀다', antonymRomanization: 'meolda', antonymMeaningEn: 'Far' },
  멀다: { antonymKo: '가깝다', antonymRomanization: 'gakkapda', antonymMeaningEn: 'Near / Close' },
  길다: { antonymKo: '짧다', antonymRomanization: 'jjalda', antonymMeaningEn: 'Short (length)' },
  짧다: { antonymKo: '길다', antonymRomanization: 'gilda', antonymMeaningEn: 'Long' },
  높다: { antonymKo: '낮다', antonymRomanization: 'natda', antonymMeaningEn: 'Low' },
  낮다: { antonymKo: '높다', antonymRomanization: 'nopda', antonymMeaningEn: 'High' },
  넓다: { antonymKo: '좁다', antonymRomanization: 'jopda', antonymMeaningEn: 'Narrow' },
  좁다: { antonymKo: '넓다', antonymRomanization: 'neolda', antonymMeaningEn: 'Wide / Spacious' },
  무겁다: { antonymKo: '가볍다', antonymRomanization: 'gabyeopda', antonymMeaningEn: 'Light (weight)' },
  가볍다: { antonymKo: '무겁다', antonymRomanization: 'mugeopda', antonymMeaningEn: 'Heavy' },
  밝다: { antonymKo: '어둡다', antonymRomanization: 'eodupda', antonymMeaningEn: 'Dark' },
  어둡다: { antonymKo: '밝다', antonymRomanization: 'bakda', antonymMeaningEn: 'Bright' },
  열다: { antonymKo: '닫다', antonymRomanization: 'datda', antonymMeaningEn: 'To close' },
  닫다: { antonymKo: '열다', antonymRomanization: 'yeolda', antonymMeaningEn: 'To open' },
  가다: { antonymKo: '오다', antonymRomanization: 'oda', antonymMeaningEn: 'To come' },
  오다: { antonymKo: '가다', antonymRomanization: 'gada', antonymMeaningEn: 'To go' },
  타다: { antonymKo: '내리다', antonymRomanization: 'naerida', antonymMeaningEn: 'To get off' },
  내리다: { antonymKo: '타다', antonymRomanization: 'tada', antonymMeaningEn: 'To ride / board' },
  사다: { antonymKo: '팔다', antonymRomanization: 'palda', antonymMeaningEn: 'To sell' },
  팔다: { antonymKo: '사다', antonymRomanization: 'sada', antonymMeaningEn: 'To buy' },
  보내다: { antonymKo: '받다', antonymRomanization: 'batda', antonymMeaningEn: 'To receive' },
  받다: { antonymKo: '주다', antonymRomanization: 'juda', antonymMeaningEn: 'To give' },
  주다: { antonymKo: '받다', antonymRomanization: 'batda', antonymMeaningEn: 'To receive' },
  시작하다: { antonymKo: '끝나다', antonymRomanization: 'kkeunnada', antonymMeaningEn: 'To end / finish' },
  끝나다: { antonymKo: '시작하다', antonymRomanization: 'sijakhada', antonymMeaningEn: 'To start / begin' },
  입학: { antonymKo: '졸업', antonymRomanization: 'joreop', antonymMeaningEn: 'Graduation' },
  졸업: { antonymKo: '입학', antonymRomanization: 'iphak', antonymMeaningEn: 'Admission / Enrollment' },
  출발: { antonymKo: '도착', antonymRomanization: 'dochak', antonymMeaningEn: 'Arrival' },
  도착: { antonymKo: '출발', antonymRomanization: 'chulbal', antonymMeaningEn: 'Departure' },
  출근: { antonymKo: '퇴근', antonymRomanization: 'toegeun', antonymMeaningEn: 'Leaving work' },
  퇴근: { antonymKo: '출근', antonymRomanization: 'chulgeun', antonymMeaningEn: 'Going to work' },
  장점: { antonymKo: '단점', antonymRomanization: 'danjeom', antonymMeaningEn: 'Disadvantage / Weakness' },
  단점: { antonymKo: '장점', antonymRomanization: 'jangjeom', antonymMeaningEn: 'Advantage / Strength' },
  성공: { antonymKo: '실패', antonymRomanization: 'silpae', antonymMeaningEn: 'Failure' },
  실패: { antonymKo: '성공', antonymRomanization: 'seonggong', antonymMeaningEn: 'Success' },
  찬성: { antonymKo: '반대', antonymRomanization: 'bandae', antonymMeaningEn: 'Opposition' },
  반대: { antonymKo: '찬성', antonymRomanization: 'chanseong', antonymMeaningEn: 'Approval / Agreement' },
  증가: { antonymKo: '감소', antonymRomanization: 'gamso', antonymMeaningEn: 'Decrease' },
  감소: { antonymKo: '증가', antonymRomanization: 'jeungga', antonymMeaningEn: 'Increase' },
  수입: { antonymKo: '지출', antonymRomanization: 'jichul', antonymMeaningEn: 'Expenditure' },
  오전: { antonymKo: '오후', antonymRomanization: 'ohu', antonymMeaningEn: 'Afternoon / PM' },
  오후: { antonymKo: '오전', antonymRomanization: 'ojeon', antonymMeaningEn: 'Morning / AM' },
  낮: { antonymKo: '밤', antonymRomanization: 'bam', antonymMeaningEn: 'Night' },
  밤: { antonymKo: '낮', antonymRomanization: 'nat', antonymMeaningEn: 'Daytime' },
  여름: { antonymKo: '겨울', antonymRomanization: 'gyeoul', antonymMeaningEn: 'Winter' },
  겨울: { antonymKo: '여름', antonymRomanization: 'yeoreum', antonymMeaningEn: 'Summer' },
  봄: { antonymKo: '가을', antonymRomanization: 'gaeul', antonymMeaningEn: 'Autumn' },
  질문: { antonymKo: '대답', antonymRomanization: 'daedap', antonymMeaningEn: 'Answer / Reply' },
  대답: { antonymKo: '질문', antonymRomanization: 'jilmun', antonymMeaningEn: 'Question' },
  안전: { antonymKo: '위험', antonymRomanization: 'wiheom', antonymMeaningEn: 'Danger / Risk' },
  위험: { antonymKo: '안전', antonymRomanization: 'anjeon', antonymMeaningEn: 'Safety' },
  공통점: { antonymKo: '차이점', antonymRomanization: 'chaijeom', antonymMeaningEn: 'Difference' },
  차이점: { antonymKo: '공통점', antonymRomanization: 'gongtongjeom', antonymMeaningEn: 'Commonality' },
};

export function findCategoryForModule(moduleId: LearnKoreanModuleId): LearnKoreanMainCategory | undefined {
  return (
    LEARN_KOREAN_13_CATEGORIES.find(c => c.defaultModuleId === moduleId) ||
    LEARN_KOREAN_13_CATEGORIES.find(c => c.subcategories.some(s => s.moduleId === moduleId))
  );
}
