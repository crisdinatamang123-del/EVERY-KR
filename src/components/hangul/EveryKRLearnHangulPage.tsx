import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  FileCheck2,
  Flame,
  Globe,
  Headphones,
  Layers,
  LogIn,
  MessageSquare,
  PenTool,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';
import {
  BASIC_CONSONANTS,
  BASIC_VOWELS,
  BATCHIM_RULES,
  COMPOUND_VOWELS,
  DOUBLE_CONSONANTS,
  FINAL_BATCHIM,
  INITIAL_CONSONANTS,
  MEDIAL_VOWELS,
} from '../../data/hangulData';
import { rawWordList, VOCAB_CATEGORIES } from '../../data/bdKoreanDictionary';
import {
  DAILY_CONVERSATION_LESSONS,
  GRAMMAR_LESSONS,
  LEARN_HANGUL_MODULES,
  LEARN_HANGUL_QUIZ_BANK,
  LearnHangulModuleId,
  LearnHangulQuizCategory,
  PRONUNCIATION_AUDIO_DRILLS,
  PRONUNCIATION_CONTRASTS,
  SOUND_CHANGE_RULES,
  getLearnHangulText,
  getLocalizedMapValue,
} from '../../data/learnHangulCurriculum';
import {
  createInitialUserProgress,
  ExamResultSubmission,
  getTodayDateString,
  loadUserAcademyProgress,
  loadUserExamHistory,
  playKoreanAudio,
  saveExamSubmission,
  saveUserAcademyProgress,
  UserAcademyProgress,
} from '../../services/koreanAcademyService';
import { HandwritingCanvasTab } from '../academy/HandwritingCanvasTab';
import {
  getScriptPronunciation,
  pickTriLingual,
  resolveLearningLang,
} from '../../utils/hangulPhonetics';
import {
  LearningRightSidebar,
  LearningSidebarGroup,
} from '../common/LearningRightSidebar';

const VALID_MODULE_IDS: LearnHangulModuleId[] = [
  'learn-hangul',
  'combined-letters',
  'pronunciation',
  'vocabulary',
  'daily-conversation',
  'grammar',
  'writing-practice',
  'korean-quiz',
  'progress-tracking',
];

const MODULE_ICONS: Record<LearnHangulModuleId, React.FC<{ className?: string }>> = {
  'learn-hangul': BookOpen,
  'combined-letters': Layers,
  pronunciation: Headphones,
  vocabulary: Sparkles,
  'daily-conversation': MessageSquare,
  grammar: FileCheck2,
  'writing-practice': PenTool,
  'korean-quiz': Award,
  'progress-tracking': CheckCircle2,
};

// Trackable Lesson IDs for EveryKR Learn Hangul curriculum
const TRACKABLE_LESSONS: { id: string; moduleId: LearnHangulModuleId; labelEn: string; labelBn: string }[] = [
  { id: 'lh-basic-vowels', moduleId: 'learn-hangul', labelEn: '10 Basic Korean Vowels', labelBn: '১০টি মৌলিক স্বরবর্ণ' },
  { id: 'lh-basic-consonants', moduleId: 'learn-hangul', labelEn: '14 Basic Korean Consonants', labelBn: '১৪টি মৌলিক ব্যঞ্জনবর্ণ' },
  { id: 'lh-double-consonants', moduleId: 'combined-letters', labelEn: '5 Double Consonants (쌍자음)', labelBn: '৫টি যুগ্ম ব্যঞ্জনবর্ণ' },
  { id: 'lh-compound-vowels', moduleId: 'combined-letters', labelEn: '11 Combined Vowels (복합모음)', labelBn: '১১টি যৌগিক স্বরবর্ণ' },
  { id: 'lh-syllable-builder', moduleId: 'combined-letters', labelEn: 'Syllable Block Combination Lab', labelBn: 'সিলেবল ব্লক গঠন ল্যাব' },
  { id: 'lh-pron-contrasts', moduleId: 'pronunciation', labelEn: '3-Way Consonant Sound Contrasts', labelBn: 'ব্যঞ্জনবর্ণের ৩-ধরনের উচ্চারণ পার্থক্য' },
  { id: 'lh-pron-batchim', moduleId: 'pronunciation', labelEn: 'Batchim & Liaison Sound Rules', labelBn: 'বাতছিম ও লিয়াজোঁ উচ্চারণ নিয়ম' },
  ...DAILY_CONVERSATION_LESSONS.map(c => ({
    id: c.id,
    moduleId: 'daily-conversation' as LearnHangulModuleId,
    labelEn: c.titleEn,
    labelBn: c.titleBn,
  })),
  ...GRAMMAR_LESSONS.map(g => ({
    id: g.id,
    moduleId: 'grammar' as LearnHangulModuleId,
    labelEn: `${g.patternKo} — ${g.titleEn}`,
    labelBn: g.titleBn,
  })),
];

export const EveryKRLearnHangulPage: React.FC = () => {
  const { language, setLanguage, currentUser, setIsAuthModalOpen, setAuthModalMode, showToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const ui = getLearnHangulText(language);
  const isBn = language === 'bn';
  const learningLang = resolveLearningLang(language);

  const initialParam = searchParams.get('module') as LearnHangulModuleId | null;
  const activeModule: LearnHangulModuleId =
    initialParam && VALID_MODULE_IDS.includes(initialParam) ? initialParam : 'learn-hangul';

  const setActiveModule = (modId: LearnHangulModuleId) => {
    setSearchParams({ module: modId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Persistent Progress & Quiz History State
  const [progress, setProgress] = useState<UserAcademyProgress>(() =>
    createInitialUserProgress(currentUser?.id || 'guest', currentUser?.email, currentUser?.name)
  );
  const [examHistory, setExamHistory] = useState<ExamResultSubmission[]>([]);

  // Module 1: Learn Hangul Sub-state
  const [hangulSubTab, setHangulSubTab] = useState<'vowels' | 'consonants'>('vowels');
  const [selectedVowelIdx, setSelectedVowelIdx] = useState(0);
  const [selectedConsonantIdx, setSelectedConsonantIdx] = useState(0);

  // Module 2: Combined Letters Sub-state
  const [combinedSubTab, setCombinedSubTab] = useState<'double' | 'compound' | 'builder'>('double');
  const [selectedDoubleIdx, setSelectedDoubleIdx] = useState(0);
  const [selectedCompoundIdx, setSelectedCompoundIdx] = useState(0);
  const [initConsonantIdx, setInitConsonantIdx] = useState(0); // ㄱ
  const [medialVowelIdx, setMedialVowelIdx] = useState(0); // ㅏ
  const [finalBatchimIdx, setFinalBatchimIdx] = useState(0); // none

  // Module 3: Pronunciation Sub-state
  const [pronSubTab, setPronSubTab] = useState<'contrasts' | 'rules' | 'drill'>('contrasts');
  const [drillAnswers, setDrillAnswers] = useState<Record<string, number>>({});

  // Module 4: Vocabulary Sub-state
  const [vocabCategory, setVocabCategory] = useState<string>('essentials');
  const [vocabQuery, setVocabQuery] = useState<string>('');
  const [onlyMastered, setOnlyMastered] = useState<boolean>(false);
  const [vocabPage, setVocabPage] = useState<number>(1);
  const VOCAB_PER_PAGE = 12;

  // Module 5: Daily Conversation Sub-state
  const [activeConvIndex, setActiveConvIndex] = useState<number>(0);
  const [hideMeaningForPractice, setHideMeaningForPractice] = useState<boolean>(false);
  const [isPlayingFullDialogue, setIsPlayingFullDialogue] = useState<boolean>(false);
  const [playingLineIdx, setPlayingLineIdx] = useState<number | null>(null);
  const dialogueTimersRef = useRef<number[]>([]);

  // Module 6: Grammar Sub-state
  const [activeGrammarIndex, setActiveGrammarIndex] = useState<number>(0);
  const [grammarAnswers, setGrammarAnswers] = useState<Record<string, number>>({});

  // Module 8: Korean Quiz Sub-state
  const [quizCategory, setQuizCategory] = useState<LearnHangulQuizCategory>('all');
  const [quizCurrentIdx, setQuizCurrentIdx] = useState<number>(0);
  const [quizSelectedAnswers, setQuizSelectedAnswers] = useState<Record<string, number>>({});
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [quizStartTime, setQuizStartTime] = useState<number>(() => Date.now());

  // Load user or guest progress + quiz history
  useEffect(() => {
    let active = true;
    Promise.all([
      loadUserAcademyProgress(currentUser?.id, currentUser?.email, currentUser?.name),
      loadUserExamHistory(currentUser?.id),
    ]).then(([loadedProg, loadedExams]) => {
      if (!active) return;
      setProgress(loadedProg);
      setExamHistory(loadedExams);
    });
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.name]);

  // Clear sequential audio timers on unmount or dialogue change
  const stopFullDialoguePlayback = () => {
    dialogueTimersRef.current.forEach(tId => window.clearTimeout(tId));
    dialogueTimersRef.current = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingFullDialogue(false);
    setPlayingLineIdx(null);
  };

  useEffect(() => {
    return () => stopFullDialoguePlayback();
  }, [activeConvIndex, activeModule]);

  // Persist helper
  const updateAndSaveProgress = (updater: (prev: UserAcademyProgress) => UserAcademyProgress) => {
    setProgress(prev => {
      const next = updater(prev);
      saveUserAcademyProgress(next).catch(() => {
        // fallback already stored in localStorage
      });
      return next;
    });
  };

  const toggleLessonComplete = (lessonId: string) => {
    const today = getTodayDateString();
    const alreadyDone = progress.completedLessons.includes(lessonId);
    updateAndSaveProgress(prev => {
      const exists = prev.completedLessons.includes(lessonId);
      const nextLessons = exists
        ? prev.completedLessons.filter(id => id !== lessonId)
        : [...prev.completedLessons, lessonId];
      const todayRec = prev.dailyActivity?.[today] || {
        date: today,
        minutesPracticed: 0,
        questionsAnswered: 0,
        lessonsCompleted: 0,
      };
      return {
        ...prev,
        lastModuleVisited: activeModule,
        lastLessonId: lessonId,
        totalPracticeMinutes: (prev.totalPracticeMinutes || 0) + (exists ? 0 : 3),
        completedLessons: nextLessons,
        dailyActivity: {
          ...(prev.dailyActivity || {}),
          [today]: {
            ...todayRec,
            minutesPracticed: todayRec.minutesPracticed + (exists ? 0 : 3),
            lessonsCompleted: exists ? todayRec.lessonsCompleted : todayRec.lessonsCompleted + 1,
          },
        },
      };
    });
    showToast(
      alreadyDone
        ? isBn
          ? 'লেসন স্ট্যাটাস আপডেট করা হয়েছে'
          : 'Lesson status updated'
        : isBn
        ? 'অভিনন্দন! লেসনটি সম্পন্ন হিসেবে সংরক্ষিত হয়েছে'
        : 'Lesson marked as completed!'
    );
  };

  const toggleVocabMastered = (wordId: string) => {
    updateAndSaveProgress(prev => {
      const exists = prev.masteredVocabIds.includes(wordId);
      return {
        ...prev,
        masteredVocabIds: exists
          ? prev.masteredVocabIds.filter(id => id !== wordId)
          : [...prev.masteredVocabIds, wordId],
      };
    });
  };

  const handleCompleteHandwriting = (itemId: string) => {
    const today = getTodayDateString();
    updateAndSaveProgress(prev => {
      if (prev.completedHandwritingIds.includes(itemId)) return prev;
      const todayRec = prev.dailyActivity?.[today] || {
        date: today,
        minutesPracticed: 0,
        questionsAnswered: 0,
        lessonsCompleted: 0,
      };
      return {
        ...prev,
        totalPracticeMinutes: (prev.totalPracticeMinutes || 0) + 2,
        completedHandwritingIds: [...prev.completedHandwritingIds, itemId],
        dailyActivity: {
          ...(prev.dailyActivity || {}),
          [today]: {
            ...todayRec,
            minutesPracticed: todayRec.minutesPracticed + 2,
          },
        },
      };
    });
  };

  // Module Navigation Indices
  const currentModuleIndex = LEARN_HANGUL_MODULES.findIndex(m => m.id === activeModule);
  const prevModuleMeta = currentModuleIndex > 0 ? LEARN_HANGUL_MODULES[currentModuleIndex - 1] : null;
  const nextModuleMeta =
    currentModuleIndex < LEARN_HANGUL_MODULES.length - 1
      ? LEARN_HANGUL_MODULES[currentModuleIndex + 1]
      : null;

  // Composed Hangul Syllable Block for Module 2 Builder
  const composedSyllable = useMemo(() => {
    const code = 0xac00 + (initConsonantIdx * 21 + medialVowelIdx) * 28 + finalBatchimIdx;
    const char = String.fromCharCode(code);
    const initBn = INITIAL_CONSONANTS[initConsonantIdx]?.bengali || '';
    const medBn = MEDIAL_VOWELS[medialVowelIdx]?.bengali || '';
    const finBn = FINAL_BATCHIM[finalBatchimIdx]?.bengali || '';
    const readingBn = `${initBn}${medBn}${finBn}`;
    return { char, readingBn };
  }, [initConsonantIdx, medialVowelIdx, finalBatchimIdx]);

  // Filtered Authentic Dictionary Vocabulary for Module 4
  const filteredVocabulary = useMemo(() => {
    const q = vocabQuery.trim().toLowerCase();
    return rawWordList.filter(word => {
      if (onlyMastered && !progress.masteredVocabIds.includes(word.id)) {
        return false;
      }
      if (vocabCategory !== 'all' && word.category !== vocabCategory) {
        return false;
      }
      if (!q) return true;
      return (
        word.hangul.toLowerCase().includes(q) ||
        word.bengali.toLowerCase().includes(q) ||
        (word.bengaliPronunciation || '').toLowerCase().includes(q) ||
        word.english.toLowerCase().includes(q) ||
        word.romanization.toLowerCase().includes(q)
      );
    });
  }, [vocabCategory, vocabQuery, onlyMastered, progress.masteredVocabIds]);

  const totalVocabPages = Math.max(1, Math.ceil(filteredVocabulary.length / VOCAB_PER_PAGE));
  const paginatedVocab = filteredVocabulary.slice(
    (vocabPage - 1) * VOCAB_PER_PAGE,
    vocabPage * VOCAB_PER_PAGE
  );

  // Filtered Quiz Questions for Module 8
  const activeQuizQuestions = useMemo(() => {
    if (quizCategory === 'all') return LEARN_HANGUL_QUIZ_BANK;
    return LEARN_HANGUL_QUIZ_BANK.filter(q => q.category === quizCategory);
  }, [quizCategory]);

  const resetQuiz = (newCat?: LearnHangulQuizCategory) => {
    if (newCat) setQuizCategory(newCat);
    setQuizCurrentIdx(0);
    setQuizSelectedAnswers({});
    setQuizFinished(false);
    setQuizStartTime(Date.now());
  };

  const handleFinishQuiz = async () => {
    let correctCount = 0;
    activeQuizQuestions.forEach(q => {
      if (quizSelectedAnswers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    });
    const totalQ = activeQuizQuestions.length;
    const incorrectCount = totalQ - correctCount;
    const scorePercent = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const durationSeconds = Math.max(5, Math.round((Date.now() - quizStartTime) / 1000));

    const submission: ExamResultSubmission = {
      id: `lh-quiz-${Date.now()}`,
      userId: currentUser?.id || 'guest',
      userEmail: currentUser?.email || '',
      subject:
        quizCategory === 'all'
          ? 'Learn Hangul Complete Quiz'
          : quizCategory === 'listening'
          ? 'Hangul Audio Listening Test'
          : quizCategory === 'vocabulary'
          ? 'Korean-Bengali Vocabulary & Grammar'
          : 'Hangul Letters MCQ',
      difficulty: 'Beginner',
      totalQuestions: totalQ,
      correctCount,
      incorrectCount,
      scorePercent,
      durationSeconds,
      weakSubjects: scorePercent < 70 ? [quizCategory] : [],
      completedAt: new Date().toISOString(),
    };

    setQuizFinished(true);
    setExamHistory(prev => [submission, ...prev]);
    await saveExamSubmission(submission);

    const today = getTodayDateString();
    updateAndSaveProgress(prev => {
      const todayRec = prev.dailyActivity?.[today] || {
        date: today,
        minutesPracticed: 0,
        questionsAnswered: 0,
        lessonsCompleted: 0,
      };
      return {
        ...prev,
        totalQuestionsAnswered: (prev.totalQuestionsAnswered || 0) + totalQ,
        totalCorrectAnswers: (prev.totalCorrectAnswers || 0) + correctCount,
        totalIncorrectAnswers: (prev.totalIncorrectAnswers || 0) + incorrectCount,
        totalPracticeMinutes: (prev.totalPracticeMinutes || 0) + Math.max(2, Math.round(durationSeconds / 60)),
        dailyActivity: {
          ...(prev.dailyActivity || {}),
          [today]: {
            ...todayRec,
            questionsAnswered: todayRec.questionsAnswered + totalQ,
            minutesPracticed: todayRec.minutesPracticed + Math.max(2, Math.round(durationSeconds / 60)),
          },
        },
      };
    });
  };

  // Play entire conversation sequentially
  const handlePlayFullConversation = () => {
    const conv = DAILY_CONVERSATION_LESSONS[activeConvIndex];
    if (!conv) return;
    if (isPlayingFullDialogue) {
      stopFullDialoguePlayback();
      return;
    }
    stopFullDialoguePlayback();
    setIsPlayingFullDialogue(true);

    conv.lines.forEach((line, idx) => {
      const timerId = window.setTimeout(() => {
        setPlayingLineIdx(idx);
        playKoreanAudio(line.korean, undefined, 0.84);
      }, idx * 3400);
      dialogueTimersRef.current.push(timerId);
    });

    const endTimerId = window.setTimeout(() => {
      setIsPlayingFullDialogue(false);
      setPlayingLineIdx(null);
    }, conv.lines.length * 3400 + 600);
    dialogueTimersRef.current.push(endTimerId);
  };

  const completedTrackableCount = TRACKABLE_LESSONS.filter(l =>
    progress.completedLessons.includes(l.id)
  ).length;
  const overallPercent = Math.min(
    100,
    Math.round((completedTrackableCount / TRACKABLE_LESSONS.length) * 100)
  );

  const activeVowel = BASIC_VOWELS[selectedVowelIdx] || BASIC_VOWELS[0];
  const activeConsonant = BASIC_CONSONANTS[selectedConsonantIdx] || BASIC_CONSONANTS[0];
  const activeDouble = DOUBLE_CONSONANTS[selectedDoubleIdx] || DOUBLE_CONSONANTS[0];
  const activeCompound = COMPOUND_VOWELS[selectedCompoundIdx] || COMPOUND_VOWELS[0];
  const activeConversation =
    DAILY_CONVERSATION_LESSONS[activeConvIndex] || DAILY_CONVERSATION_LESSONS[0];
  const activeGrammar = GRAMMAR_LESSONS[activeGrammarIndex] || GRAMMAR_LESSONS[0];

  const selectHangulSection = (
    modId: LearnHangulModuleId,
    subTab?: 'vowels' | 'consonants'
  ) => {
    setActiveModule(modId);
    if (subTab) {
      setHangulSubTab(subTab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hangulSidebarGroups: LearningSidebarGroup[] = [
    {
      id: 'foundations',
      title: isBn ? 'বর্ণমালা ও ভিত্তি' : 'Alphabet & Foundations',
      defaultOpen: true,
      items: [
        {
          id: 'hangul-vowels',
          label: isBn ? 'স্বরবর্ণ (১০টি)' : 'Vowels (10 Basic)',
          sublabel: '모음 · ㅏ ㅑ ㅓ ㅕ ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ',
          icon: BookOpen,
          active: activeModule === 'learn-hangul' && hangulSubTab === 'vowels',
          completed: progress.completedLessons.includes('lh-basic-vowels'),
          onSelect: () => selectHangulSection('learn-hangul', 'vowels'),
        },
        {
          id: 'hangul-consonants',
          label: isBn ? 'ব্যঞ্জনবর্ণ (১৪টি)' : 'Consonants (14 Basic)',
          sublabel: '자음 · ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ...',
          icon: BookOpen,
          active: activeModule === 'learn-hangul' && hangulSubTab === 'consonants',
          completed: progress.completedLessons.includes('lh-basic-consonants'),
          onSelect: () => selectHangulSection('learn-hangul', 'consonants'),
        },
        {
          id: 'combined-letters',
          label: isBn ? 'যুক্ত বর্ণ ও সিলেবল' : 'Combined Letters & Syllables',
          sublabel: '쌍자음 · 복합모음 · 음절 조합',
          icon: Layers,
          active: activeModule === 'combined-letters',
          completed:
            progress.completedLessons.includes('lh-double-consonants') &&
            progress.completedLessons.includes('lh-compound-vowels'),
          onSelect: () => selectHangulSection('combined-letters'),
        },
      ],
    },
    {
      id: 'skills',
      title: isBn ? 'ভাষা ও দক্ষতা' : 'Skills & Language',
      defaultOpen: true,
      items: [
        {
          id: 'pronunciation',
          label: isBn ? 'উচ্চারণ ও অডিও' : 'Pronunciation & Audio',
          sublabel: '발음 규칙 · Batchim & Drills',
          icon: Headphones,
          active: activeModule === 'pronunciation',
          completed: progress.completedLessons.includes('lh-pronunciation-rules'),
          onSelect: () => selectHangulSection('pronunciation'),
        },
        {
          id: 'vocabulary',
          label: isBn ? 'কোরিয়ান ভোকাবুলারি' : 'Vocabulary Dictionary',
          sublabel: '어휘 · Categorized Audio Words',
          icon: Search,
          active: activeModule === 'vocabulary',
          badgeText:
            (progress.masteredVocabIds?.length || 0) > 0
              ? `${progress.masteredVocabIds.length}`
              : undefined,
          onSelect: () => selectHangulSection('vocabulary'),
        },
        {
          id: 'daily-conversation',
          label: isBn ? 'দৈনন্দিন কথোপকথন' : 'Daily Conversation',
          sublabel: '일상 회화 · Real-life Dialogues',
          icon: MessageSquare,
          active: activeModule === 'daily-conversation',
          onSelect: () => selectHangulSection('daily-conversation'),
        },
        {
          id: 'grammar',
          label: isBn ? 'প্রয়োজনীয় গ্রামার' : 'Essential Grammar',
          sublabel: '문법 · Core Sentence Patterns',
          icon: BookOpen,
          active: activeModule === 'grammar',
          onSelect: () => selectHangulSection('grammar'),
        },
      ],
    },
    {
      id: 'practice',
      title: isBn ? 'অনুশীলন ও পরীক্ষা' : 'Practice & Mastery',
      defaultOpen: true,
      items: [
        {
          id: 'writing-practice',
          label: isBn ? 'লেখা অনুশীলন' : 'Writing Practice',
          sublabel: '쓰기 · Stroke Order Canvas',
          icon: PenTool,
          active: activeModule === 'writing-practice',
          badgeText:
            (progress.completedHandwritingIds?.length || 0) > 0
              ? `${progress.completedHandwritingIds.length}`
              : undefined,
          onSelect: () => selectHangulSection('writing-practice'),
        },
        {
          id: 'korean-quiz',
          label: isBn ? 'কোরিয়ান কুইজ' : 'Quizzes & Listening Tests',
          sublabel: '퀴즈 · Instant Score Feedback',
          icon: FileCheck2,
          active: activeModule === 'korean-quiz',
          badgeText: examHistory.length > 0 ? `${examHistory.length}` : undefined,
          onSelect: () => selectHangulSection('korean-quiz'),
        },
        {
          id: 'progress-tracking',
          label: isBn ? 'আমার অগ্রগতি' : 'My Progress',
          sublabel: '학습 기록 · Lesson & Quiz Stats',
          icon: Award,
          active: activeModule === 'progress-tracking',
          badgeText: `${overallPercent}%`,
          onSelect: () => selectHangulSection('progress-tracking'),
        },
      ],
    },
  ];

  const activeModuleMeta =
    LEARN_HANGUL_MODULES.find((m) => m.id === activeModule) || LEARN_HANGUL_MODULES[0];
  const activeSectionLabel =
    activeModule === 'learn-hangul'
      ? hangulSubTab === 'vowels'
        ? isBn
          ? 'স্বরবর্ণ (১০টি)'
          : '1. Vowels (10 Basic)'
        : isBn
        ? 'ব্যঞ্জনবর্ণ (১৪টি)'
        : '1. Consonants (14 Basic)'
      : `${activeModuleMeta.stepNumber}. ${getLocalizedMapValue(activeModuleMeta.title, language)}`;

  return (
    <div className="min-h-screen bg-transparent text-[#061B49] dark:text-white pb-16 transition-colors duration-200">
      {/* Unified EveryKR SaaS Learning Header */}
      <div className="border-b border-[#0754B8]/12 dark:border-white/10 bg-transparent">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Top Breadcrumb + Academy Switcher & Language Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#0754B8] dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>{isBn ? 'হোমপেজে ফিরে যান' : 'Back to EveryKR Home'}</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/korean-academy"
                className="ekr-glass-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFB800]" />
                <span>
                  {pickTriLingual(learningLang, {
                    bn: '20X কোরিয়ান একাডেমি ও এআই টিউটর',
                    ne: '20X कोरियन एकेडेमी र AI ट्युटर',
                    en: '20X Korean Academy & AI Tutor',
                  })}
                </span>
              </Link>
              <div className="ekr-glass-subtle flex items-center gap-1 rounded-xl p-1">
                <Globe className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] ms-1.5 me-0.5 shrink-0" />
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                      language === lang.code
                        ? 'bg-[#0754B8] text-white shadow-xs'
                        : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#061B49] dark:hover:text-white hover:bg-[#0754B8]/8 dark:hover:bg-white/10'
                    }`}
                    title={`${lang.nativeLabel} (${lang.label})`}
                  >
                    {lang.code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-8 space-y-2">
              <div className="inline-flex items-center gap-2">
                <span className="w-4 h-0.5 rounded-full bg-[#FFB800]" aria-hidden="true" />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0754B8] dark:text-[#60A5FA]">
                  STEP-BY-STEP KOREAN LEARNING STUDIO · ZERO PRIOR KNOWLEDGE REQUIRED
                </p>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#061B49] dark:text-white">
                EveryKR Learn Hangul
              </h1>
              <p className="text-base sm:text-lg font-bold text-[#0754B8] dark:text-[#60A5FA]">
                한국어, 처음부터 쉽게!
              </p>
              <p className="text-xs sm:text-sm text-[#4B607F] dark:text-[#B8C9E5] max-w-2xl leading-relaxed">
                {ui.sectionDescription}
              </p>
            </div>

            {/* Compact Progress & Account Sync Card */}
            <div className="lg:col-span-4 ekr-glass-panel rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-[#061B49] dark:text-white">
                  {isBn ? 'সামগ্রিক অগ্রগতি' : 'Overall Course Progress'}
                </span>
                <span className="font-mono font-extrabold text-[#0754B8] dark:text-[#FFB800] tabular-nums">
                  {completedTrackableCount}/{TRACKABLE_LESSONS.length} ({overallPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#0754B8]/12 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full ekr-gold-progress transition-all duration-300"
                  style={{ width: `${Math.max(4, overallPercent)}%` }}
                />
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#0754B8]/10 dark:border-white/10 flex items-center justify-between gap-2 text-[11px]">
                {currentUser ? (
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{ui.syncedAccount}</span>
                  </span>
                ) : (
                  <>
                    <span className="text-[#526685] dark:text-[#B8C9E5] truncate">
                      {isBn ? 'গেস্ট মোড (সব লেসন উন্মুক্ত)' : 'Guest Mode · Free Access'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('login');
                        setIsAuthModalOpen(true);
                      }}
                      className="ekr-glass-btn-primary inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white font-bold shrink-0 cursor-pointer"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>{isBn ? 'লগইন' : 'Sign In'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Student Workspace: Learning Content (Left) + Right-Side Navigation Sidebar (Right) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="flex flex-col-reverse lg:flex-row gap-6 lg:gap-7 items-start">
          {/* LEFT: Main Interactive Learning Canvas */}
          <div className="w-full lg:flex-1 min-w-0 space-y-7">
        {/* ===================================================================== */}
        {/* MODULE 1: LEARN HANGUL (10 BASIC VOWELS & 14 BASIC CONSONANTS)        */}
        {/* ===================================================================== */}
        {activeModule === 'learn-hangul' && (
          <div className="space-y-6">
            {/* Beginner Zero-Knowledge Intro Card */}
            <div className="ekr-glass-panel rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0754B8] dark:text-[#60A5FA]">
                    MODULE 01 · 한글 기본 자모 · ZERO-TO-ONE FOUNDATION
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white mt-1">
                    {isBn
                      ? '১. হানগুল বর্ণমালা: ১০টি মৌলিক স্বরবর্ণ ও ১৪টি ব্যঞ্জনবর্ণ'
                      : '1. Learn Hangul: 10 Basic Vowels & 14 Basic Consonants'}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4B607F] dark:text-[#B8C9E5] mt-2 max-w-3xl leading-relaxed">
                    {isBn
                      ? 'কোরিয়ান শব্দ সবসময় “ব্যঞ্জনবর্ণ + স্বরবর্ণ” ব্লকে লেখা হয়। স্বরবর্ণ একা বসতে পারে না, তাই একা উচ্চারণ করতে সামনে নিঃশব্দ গোল বর্ণ ㅇ বসাতে হয় (যেমন: ㅇ + ㅏ = 아 “আ”)।'
                      : 'Korean Hangul combines Consonant + Vowel into clean blocks. When pronouncing a vowel by itself, place the silent circle ㅇ in front (e.g., ㅇ + ㅏ = 아 "a"). বাংলা অর্থ ও বাংলা উচ্চারণ প্রতিটি বর্ণের সাথেই দেওয়া আছে।'}
                  </p>
                </div>

                {/* Segmented Switcher: Basic Vowels vs Basic Consonants */}
                <div className="flex items-center ekr-glass-subtle p-1.5 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setHangulSubTab('vowels')}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      hangulSubTab === 'vowels'
                        ? 'ekr-glass-btn-primary text-white shadow-xs'
                        : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#061B49] dark:hover:text-white'
                    }`}
                  >
                    {isBn ? '১০টি স্বরবর্ণ (Vowels)' : '10 Basic Vowels'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHangulSubTab('consonants')}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      hangulSubTab === 'consonants'
                        ? 'ekr-glass-btn-primary text-white shadow-xs'
                        : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#061B49] dark:hover:text-white'
                    }`}
                  >
                    {isBn ? '১৪টি ব্যঞ্জনবর্ণ (Consonants)' : '14 Consonants'}
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Letter Studio + Selectable Character Grid */}
            {(() => {
              const list = hangulSubTab === 'vowels' ? BASIC_VOWELS : BASIC_CONSONANTS;
              const activeIdx = hangulSubTab === 'vowels' ? selectedVowelIdx : selectedConsonantIdx;
              const setIdx =
                hangulSubTab === 'vowels' ? setSelectedVowelIdx : setSelectedConsonantIdx;
              const activeLetter = hangulSubTab === 'vowels' ? activeVowel : activeConsonant;
              const lessonId =
                hangulSubTab === 'vowels' ? 'lh-basic-vowels' : 'lh-basic-consonants';
              const isDone = progress.completedLessons.includes(lessonId);

              return (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Left: Detailed Letter Pronunciation Card */}
                  <div className="xl:col-span-5 ekr-glass-panel rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-[#526685] dark:text-[#8FA8CF] mb-4">
                        <span className="tabular-nums">
                          {isBn ? 'বর্ণ কার্ড' : 'LETTER FOCUS'} · {activeIdx + 1} / {list.length}
                        </span>
                        <span className="text-[#0754B8] dark:text-[#60A5FA]">
                          {activeLetter.nameKr} ({activeLetter.bengaliName})
                        </span>
                      </div>

                      <div className="text-center py-7 px-4 rounded-2xl ekr-glass-subtle">
                        <div className="text-7xl sm:text-8xl font-black text-[#061B49] dark:text-white leading-none">
                          {activeLetter.char}
                        </div>
                        <div className="mt-4 text-base sm:text-lg font-extrabold text-[#0754B8] dark:text-[#60A5FA]">
                          বাংলা ধ্বনি: {activeLetter.bengaliSound}
                        </div>
                        <div className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1">
                          বর্ণের নাম: {activeLetter.nameKr} · {activeLetter.bengaliName} ({activeLetter.nameEn})
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                          <button
                            type="button"
                            onClick={() => playKoreanAudio(activeLetter.nameKr, undefined, 0.85)}
                            className="ekr-glass-btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>{ui.normalAudio}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => playKoreanAudio(activeLetter.sampleWord || activeLetter.char, undefined, 0.58)}
                            className="ekr-btn-secondary inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            <Headphones className="w-4 h-4 text-[#0754B8] dark:text-[#FFB800]" />
                            <span>{ui.slowAudio}</span>
                          </button>
                        </div>
                      </div>

                      {/* Sample Word Trio: Korean + Bengali Pronunciation + Bengali Meaning */}
                      <div className="mt-5 p-4 rounded-2xl ekr-glass-subtle space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#8FA8CF]">
                            {isBn ? 'উদাহরণ শব্দ (Example Word)' : 'EXAMPLE WORD WITH BENGALI GUIDE'}
                          </span>
                          <button
                            type="button"
                            onClick={() => playKoreanAudio(activeLetter.sampleWord || activeLetter.char, undefined, 0.82)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{activeLetter.sampleWord}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <div className="text-[10px] font-bold text-[#526685] dark:text-[#8FA8CF]">한국어</div>
                            <div className="text-lg font-extrabold text-[#061B49] dark:text-white">
                              {activeLetter.sampleWord}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#526685] dark:text-[#8FA8CF]">বাংলা উচ্চারণ</div>
                            <div className="text-sm font-bold text-[#0754B8] dark:text-[#60A5FA]">
                              {activeLetter.sampleWordBengali}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#526685] dark:text-[#8FA8CF]">বাংলা অর্থ</div>
                            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {activeLetter.sampleWordMeaning}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3.5 rounded-xl bg-amber-50/85 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-700/50 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                        <span className="font-bold">উচ্চারণ টিপস: </span>
                        {activeLetter.pronunciationTip}
                      </div>
                    </div>

                    {/* Prev / Next Letter + Mark Sub-lesson Complete */}
                    <div className="mt-6 pt-4 border-t border-[#0754B8]/10 dark:border-white/10 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={activeIdx <= 0}
                          onClick={() => setIdx(Math.max(0, activeIdx - 1))}
                          className="ekr-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                          <span>{ui.prevLesson}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (activeIdx < list.length - 1) {
                              setIdx(activeIdx + 1);
                            } else if (hangulSubTab === 'vowels') {
                              setHangulSubTab('consonants');
                              setSelectedConsonantIdx(0);
                            } else {
                              setActiveModule('combined-letters');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#061B49] dark:bg-white/12 text-white hover:opacity-90 cursor-pointer"
                        >
                          <span>{ui.nextLesson}</span>
                          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleLessonComplete(lessonId)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            : 'ekr-glass-btn-primary text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isDone ? ui.completedLabel : ui.markComplete}</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Complete Clickable Alphabet Grid */}
                  <div className="xl:col-span-7 ekr-glass-panel rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm sm:text-base font-extrabold text-[#061B49] dark:text-white">
                        {hangulSubTab === 'vowels'
                          ? isBn
                            ? 'সবগুলো মৌলিক স্বরবর্ণ (যেকোনো বর্ণে ক্লিক করে অডিও শুনুন)'
                            : 'All 10 Basic Vowels — Tap Any Letter for Audio & Bengali Sound'
                          : isBn
                          ? 'সবগুলো মৌলিক ব্যঞ্জনবর্ণ (যেকোনো বর্ণে ক্লিক করে অডিও শুনুন)'
                          : 'All 14 Basic Consonants — Tap Any Letter for Audio & Bengali Sound'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {list.map((item, idx) => {
                        const selected = idx === activeIdx;
                        return (
                          <button
                            key={item.char}
                            type="button"
                            onClick={() => {
                              setIdx(idx);
                              playKoreanAudio(item.sampleWord || item.char, undefined, 0.85);
                            }}
                            className={`text-start p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              selected
                                ? 'bg-gradient-to-br from-[#0754B8] to-[#0875E8] text-white border-[#0875E8] shadow-lg shadow-[#0754B8]/25 -translate-y-0.5'
                                : 'ekr-learn-card'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span
                                className={`text-3xl font-black ${
                                  selected ? 'text-white' : 'text-[#061B49] dark:text-white'
                                }`}
                              >
                                {item.char}
                              </span>
                              <Volume2
                                className={`w-3.5 h-3.5 ${
                                  selected ? 'text-[#FFB800]' : 'text-[#0754B8] dark:text-[#60A5FA]'
                                }`}
                              />
                            </div>
                            <div
                              className={`text-xs font-bold mt-2 ${
                                selected ? 'text-white' : 'text-[#0754B8] dark:text-[#60A5FA]'
                              }`}
                            >
                              {item.bengaliSound}
                            </div>
                            <div
                              className={`text-[11px] mt-1 truncate ${
                                selected ? 'text-white/90' : 'text-[#4B607F] dark:text-[#B8C9E5]'
                              }`}
                            >
                              {item.sampleWord} · {item.sampleWordBengali}
                            </div>
                            <div
                              className={`text-[10px] truncate ${
                                selected ? 'text-white/80' : 'text-[#526685] dark:text-[#8FA8CF]'
                              }`}
                            >
                              {item.sampleWordMeaning}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODULE 2: COMBINED LETTERS (DOUBLE CONSONANTS, VOWELS & BLOCK LAB)    */}
        {/* ===================================================================== */}
        {activeModule === 'combined-letters' && (
          <div className="space-y-6">
            <div className="ekr-glass-panel rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                    MODULE 02 · 쌍자음 · 복합모음 · 음절 조합기
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white mt-1">
                    {isBn
                      ? '২. যুক্ত ও যৌগিক বর্ণ: ৫টি যুগ্ম ব্যঞ্জনবর্ণ, ১১টি যৌগিক স্বরবর্ণ ও সিলেবল ল্যাব'
                      : '2. Combined Letters: Double Consonants, Combined Vowels & Syllable Builder'}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl">
                  {[
                    { id: 'double' as const, label: isBn ? '৫টি যুগ্ম ব্যঞ্জন (쌍자음)' : '5 Double Consonants' },
                    { id: 'compound' as const, label: isBn ? '১১টি যৌগিক স্বর (복합모음)' : '11 Combined Vowels' },
                    { id: 'builder' as const, label: isBn ? 'সিলেবল ব্লক ল্যাব' : 'Syllable Builder Lab' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCombinedSubTab(tab.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        combinedSubTab === tab.id
                          ? 'bg-[#0754B8] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-[#10243A] dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {combinedSubTab !== 'builder' ? (
              (() => {
                const list = combinedSubTab === 'double' ? DOUBLE_CONSONANTS : COMPOUND_VOWELS;
                const activeIdx =
                  combinedSubTab === 'double' ? selectedDoubleIdx : selectedCompoundIdx;
                const setIdx =
                  combinedSubTab === 'double' ? setSelectedDoubleIdx : setSelectedCompoundIdx;
                const activeLetter = combinedSubTab === 'double' ? activeDouble : activeCompound;
                const lessonId =
                  combinedSubTab === 'double' ? 'lh-double-consonants' : 'lh-compound-vowels';
                const isDone = progress.completedLessons.includes(lessonId);

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 ekr-glass-panel rounded-2xl p-6 flex flex-col justify-between">
                      <div>
                        <div className="text-center py-7 px-4 rounded-2xl bg-slate-50 dark:bg-[#061B49] border border-slate-200/80 dark:border-slate-800">
                          <div className="text-7xl font-black text-[#061B49] dark:text-white">
                            {activeLetter.char}
                          </div>
                          <div className="mt-3 text-base font-extrabold text-[#0754B8] dark:text-[#60A5FA]">
                            বাংলা উচ্চারণ: {activeLetter.bengaliSound}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {activeLetter.nameKr} · {activeLetter.bengaliName}
                          </div>
                          <div className="flex justify-center gap-2 mt-4">
                            <button
                              type="button"
                              onClick={() => playKoreanAudio(activeLetter.sampleWord || activeLetter.char, undefined, 0.85)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0754B8] text-white text-xs font-bold cursor-pointer"
                            >
                              <Volume2 className="w-4 h-4" />
                              <span>{activeLetter.sampleWord} শুনুন</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => playKoreanAudio(activeLetter.sampleWord || activeLetter.char, undefined, 0.58)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#10243A] dark:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                            >
                              <span>{ui.slowAudio}</span>
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 grid grid-cols-3 gap-2">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400">한국어</div>
                            <div className="text-lg font-extrabold text-[#061B49] dark:text-white">
                              {activeLetter.sampleWord}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400">বাংলা উচ্চারণ</div>
                            <div className="text-sm font-bold text-[#0754B8] dark:text-[#60A5FA]">
                              {activeLetter.sampleWordBengali}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400">বাংলা অর্থ</div>
                            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {activeLetter.sampleWordMeaning}
                            </div>
                          </div>
                        </div>

                        <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {activeLetter.pronunciationTip}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex justify-between gap-2">
                          <button
                            type="button"
                            disabled={activeIdx <= 0}
                            onClick={() => setIdx(Math.max(0, activeIdx - 1))}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                            <span>{ui.prevLesson}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (activeIdx < list.length - 1) {
                                setIdx(activeIdx + 1);
                              } else if (combinedSubTab === 'double') {
                                setCombinedSubTab('compound');
                              } else {
                                setCombinedSubTab('builder');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#10243A] dark:bg-slate-800 text-white cursor-pointer"
                          >
                            <span>{ui.nextLesson}</span>
                            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleLessonComplete(lessonId)}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                            isDone ? 'bg-emerald-600 text-white' : 'bg-[#0754B8] text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isDone ? ui.completedLabel : ui.markComplete}</span>
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-7 ekr-glass-panel rounded-2xl p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {list.map((item, idx) => {
                          const selected = idx === activeIdx;
                          return (
                            <button
                              key={item.char}
                              type="button"
                              onClick={() => {
                                setIdx(idx);
                                playKoreanAudio(item.sampleWord || item.char, undefined, 0.85);
                              }}
                              className={`text-start p-4 rounded-2xl border transition-all cursor-pointer ${
                                selected
                                  ? 'bg-[#0754B8] text-white border-[#0875E8]'
                                  : 'bg-slate-50/80 dark:bg-[#061B49] border-slate-200 dark:border-slate-800 hover:border-[#0875E8]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-3xl font-black">{item.char}</span>
                                <Volume2 className="w-4 h-4 opacity-80" />
                              </div>
                              <div
                                className={`text-xs font-bold mt-2 ${
                                  selected ? 'text-white' : 'text-[#0754B8] dark:text-[#60A5FA]'
                                }`}
                              >
                                {item.bengaliSound}
                              </div>
                              <div className="text-xs mt-1 font-semibold opacity-90">
                                {item.sampleWord} ({item.sampleWordBengali})
                              </div>
                              <div className="text-[11px] opacity-75 truncate">
                                {item.sampleWordMeaning}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Interactive Syllable Block Builder */
              <div className="ekr-glass-panel rounded-2xl p-6 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-5 text-center p-6 rounded-2xl bg-[#061B49] text-white border border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#60A5FA]">
                      LIVE SYLLABLE BLOCK · 실시간 음절 조합
                    </p>
                    <div className="text-8xl sm:text-9xl font-black my-5 tracking-tight">
                      {composedSyllable.char}
                    </div>
                    <div className="text-base font-bold text-amber-300">
                      বাংলা উচ্চারণ: {composedSyllable.readingBn || '—'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {INITIAL_CONSONANTS[initConsonantIdx]?.char} +{' '}
                      {MEDIAL_VOWELS[medialVowelIdx]?.char}
                      {FINAL_BATCHIM[finalBatchimIdx]?.value
                        ? ` + ${FINAL_BATCHIM[finalBatchimIdx].value}`
                        : ''}
                    </div>

                    <div className="flex justify-center gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => playKoreanAudio(composedSyllable.char, undefined, 0.82)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white text-xs sm:text-sm font-bold cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>{ui.tapToListen} ({composedSyllable.char})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLessonComplete('lh-syllable-builder')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                          progress.completedLessons.includes('lh-syllable-builder')
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {progress.completedLessons.includes('lh-syllable-builder')
                          ? ui.completedLabel
                          : ui.markComplete}
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-7 space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        1. শুরুর ব্যঞ্জনবর্ণ (Initial Consonant · 초성)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {INITIAL_CONSONANTS.map((c, idx) => (
                          <button
                            key={c.char}
                            type="button"
                            onClick={() => setInitConsonantIdx(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                              initConsonantIdx === idx
                                ? 'bg-[#0754B8] text-white border-[#0875E8]'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-[#061B49] dark:text-white'
                            }`}
                          >
                            {c.char} <span className="opacity-75">({c.bengali || 'নীরব'})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        2. মাঝের স্বরবর্ণ (Medial Vowel · 중성)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {MEDIAL_VOWELS.map((v, idx) => (
                          <button
                            key={v.char}
                            type="button"
                            onClick={() => setMedialVowelIdx(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                              medialVowelIdx === idx
                                ? 'bg-[#1769AA] text-white border-[#1769AA]'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-[#061B49] dark:text-white'
                            }`}
                          >
                            {v.char} <span className="opacity-75">({v.bengali})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        3. নিচের বাতছিম ব্যঞ্জনবর্ণ (Optional Batchim · 종성)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {FINAL_BATCHIM.slice(0, 16).map((b, idx) => (
                          <button
                            key={b.char}
                            type="button"
                            onClick={() => setFinalBatchimIdx(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                              finalBatchimIdx === idx
                                ? 'bg-[#10243A] dark:bg-emerald-600 text-white border-transparent'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-[#061B49] dark:text-white'
                            }`}
                          >
                            {b.char} {b.bengali ? `(${b.bengali})` : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODULE 3: PRONUNCIATION (AUDIO CONTRASTS, BATCHIM/LIAISON & DRILL)    */}
        {/* ===================================================================== */}
        {activeModule === 'pronunciation' && (
          <div className="space-y-6">
            <div className="ekr-glass-panel rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                    MODULE 03 · 발음 연습 · AUDIO-BASED PRONUNCIATION LAB
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white mt-1">
                    {isBn
                      ? '৩. অডিও উচ্চারণ অনুশীলন: সাধারণ/মহাপ্রাণ/দ্বিত্ব ধ্বনি, বাতছিম ও লিয়াজোঁ'
                      : '3. Pronunciation Practice: 3-Way Contrasts, Batchim, Liaison & Listening Drill'}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl">
                  {[
                    { id: 'contrasts' as const, label: isBn ? '৩-রূপের ধ্বনি পার্থক্য' : '3-Way Sound Contrasts' },
                    { id: 'rules' as const, label: isBn ? 'বাতছিম ও লিয়াজোঁ নিয়ম' : 'Batchim & Liaison Rules' },
                    { id: 'drill' as const, label: isBn ? 'অডিও লিসেনিং অনুশীলন' : 'Audio Listening Drill' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPronSubTab(tab.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                        pronSubTab === tab.id
                          ? 'bg-[#0754B8] text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {pronSubTab === 'contrasts' && (
              <div className="space-y-5">
                {PRONUNCIATION_CONTRASTS.map(group => (
                  <div
                    key={group.id}
                    className="ekr-glass-panel rounded-2xl p-6"
                  >
                    <h3 className="text-base sm:text-lg font-bold text-[#061B49] dark:text-white">
                      {group.groupTitleBn}{' '}
                      <span className="text-xs font-normal text-slate-400">({group.groupTitleEn})</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 mb-4">
                      {group.airflowTipBn}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {group.triplets.map((tItem, idx) => (
                        <div
                          key={tItem.hangul + idx}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-[#061B49] border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between"
                        >
                          <div>
                            <div className="text-[11px] font-bold text-[#0754B8] dark:text-[#60A5FA]">
                              {tItem.type}
                            </div>
                            <div className="text-3xl font-black text-[#061B49] dark:text-white mt-1">
                              {tItem.wordKo}
                            </div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2">
                              বাংলা উচ্চারণ: {tItem.bengaliPron}
                            </div>
                            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                              বাংলা অর্থ: {tItem.bengaliMeaning} ({tItem.englishMeaning})
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <button
                              type="button"
                              onClick={() => playKoreanAudio(tItem.wordKo, undefined, 0.85)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white text-xs font-bold cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{ui.tapToListen}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => playKoreanAudio(tItem.wordKo, undefined, 0.55)}
                              className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-[#061B49] dark:text-white text-xs font-bold cursor-pointer"
                            >
                              0.6x
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleLessonComplete('lh-pron-contrasts')}
                    className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
                      progress.completedLessons.includes('lh-pron-contrasts')
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0754B8] text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {progress.completedLessons.includes('lh-pron-contrasts')
                        ? ui.completedLabel
                        : ui.markComplete}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {pronSubTab === 'rules' && (
              <div className="space-y-6">
                {/* Sound Change & Liaison Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {SOUND_CHANGE_RULES.map(rule => (
                    <div
                      key={rule.id}
                      className="ekr-glass-panel rounded-2xl p-6 flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA]">
                          {rule.ruleNameKo}
                        </div>
                        <h3 className="text-base font-bold text-[#061B49] dark:text-white mt-1">
                          {rule.ruleNameBn}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                          {rule.explanationBn}
                        </p>

                        <div className="mt-4 space-y-2.5">
                          {rule.examples.map(ex => (
                            <div
                              key={ex.writtenKo}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-[#061B49] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="text-sm font-extrabold text-[#061B49] dark:text-white">
                                  {ex.writtenKo}{' '}
                                  <span className="text-[#0754B8] dark:text-[#60A5FA]">
                                    → [{ex.spokenKo}]
                                  </span>
                                </div>
                                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  উচ্চারণ: {ex.bengaliPron} · অর্থ: {ex.bengaliMeaning}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => playKoreanAudio(ex.writtenKo, undefined, 0.8)}
                                className="p-2 rounded-lg bg-[#0754B8] text-white shrink-0 cursor-pointer"
                                aria-label={`Play ${ex.writtenKo}`}
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 7 Batchim Neutralization Table */}
                <div className="ekr-glass-panel rounded-2xl p-6">
                  <h3 className="text-base sm:text-lg font-bold text-[#061B49] dark:text-white mb-4">
                    {isBn
                      ? '৭টি বাতছিম (받침) চূড়ান্ত উচ্চারণ নিয়ম'
                      : '7 Final Consonant (Batchim · 받침) Sound Groups'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {BATCHIM_RULES.map(b => (
                      <div
                        key={b.sound}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-[#061B49] border border-slate-200/80 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold text-[#0754B8] dark:text-[#60A5FA]">
                            {b.sound}
                          </span>
                          <span className="text-xs font-bold text-[#10243A] dark:text-slate-200">
                            {b.letters}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                          {b.description}
                        </p>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-2">
                          {b.exampleKr}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => toggleLessonComplete('lh-pron-batchim')}
                      className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                        progress.completedLessons.includes('lh-pron-batchim')
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0754B8] text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {progress.completedLessons.includes('lh-pron-batchim')
                          ? ui.completedLabel
                          : ui.markComplete}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pronSubTab === 'drill' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {PRONUNCIATION_AUDIO_DRILLS.map((drill, idx) => {
                  const chosen = drillAnswers[drill.id];
                  const answered = chosen !== undefined;
                  const isCorrect = chosen === drill.correctIndex;

                  return (
                    <div
                      key={drill.id}
                      className="ekr-glass-panel rounded-2xl p-6"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400">
                          AUDIO DRILL #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => playKoreanAudio(drill.audioTextKo, undefined, 0.8)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white text-xs font-bold cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>{isBn ? 'অডিও শুনুন' : 'Play Audio'}</span>
                        </button>
                      </div>

                      <p className="text-sm font-bold text-[#061B49] dark:text-white mb-4">
                        {isBn ? drill.promptBn : drill.promptEn}
                      </p>

                      <div className="space-y-2">
                        {drill.options.map((opt, optIdx) => {
                          const selected = chosen === optIdx;
                          let cls =
                            'bg-slate-50 dark:bg-[#061B49] border-slate-200 dark:border-slate-800 text-[#061B49] dark:text-white';
                          if (answered) {
                            if (optIdx === drill.correctIndex) {
                              cls =
                                'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200';
                            } else if (selected) {
                              cls =
                                'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200';
                            }
                          }
                          return (
                            <button
                              key={opt.ko}
                              type="button"
                              onClick={() => {
                                setDrillAnswers(prev => ({ ...prev, [drill.id]: optIdx }));
                                playKoreanAudio(drill.audioTextKo, undefined, 0.85);
                              }}
                              className={`w-full text-start p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${cls}`}
                            >
                              <div className="text-sm font-extrabold">{opt.ko}</div>
                              <div className="opacity-85 mt-0.5">
                                উচ্চারণ: {opt.bengaliPron} · অর্থ: {opt.bengaliMeaning}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {answered && (
                        <div
                          className={`mt-3 p-3 rounded-xl text-xs font-semibold ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                          }`}
                        >
                          {isBn ? drill.tipBn : drill.tipEn}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODULE 4: VOCABULARY (EVERYDAY KOREAN WITH BENGALI MEANING & AUDIO)   */}
        {/* ===================================================================== */}
        {activeModule === 'vocabulary' && (
          <div className="space-y-6">
            <div className="ekr-glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                    MODULE 04 · 필수 생활 어휘 · KOREAN + BENGALI PRONUNCIATION + BENGALI MEANING
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white mt-1">
                    {isBn
                      ? '৪. দৈনন্দিন কোরিয়ান শব্দভাণ্ডার (বাংলা উচ্চারণ, বাংলা অর্থ ও অডিওসহ)'
                      : '4. Everyday Korean Vocabulary with Bengali Meanings & Audio'}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOnlyMastered(prev => !prev);
                      setVocabPage(1);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      onlyMastered
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isBn
                      ? `আয়ত্ত করা শব্দ (${progress.masteredVocabIds.length})`
                      : `Mastered (${progress.masteredVocabIds.length})`}
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={vocabQuery}
                  onChange={e => {
                    setVocabQuery(e.target.value);
                    setVocabPage(1);
                  }}
                  placeholder={
                    isBn
                      ? 'কোরিয়ান, বাংলা অর্থ, বাংলা উচ্চারণ বা ইংরেজি দিয়ে শব্দ খুঁজুন...'
                      : 'Search by Korean, Bengali meaning, Bengali pronunciation, or English...'
                  }
                  className="w-full ps-10 pe-4 py-3 rounded-xl bg-slate-50 dark:bg-[#061B49] border border-slate-200 dark:border-slate-700 text-sm text-[#061B49] dark:text-white focus:outline-none focus:border-[#0875E8]"
                />
              </div>

              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {VOCAB_CATEGORIES.map(cat => {
                  const active = vocabCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setVocabCategory(cat.id);
                        setVocabPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#0754B8] text-white border-[#0875E8]'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#0875E8]'
                      }`}
                    >
                      {isBn ? cat.nameBn : `${cat.nameEn} (${cat.nameBn})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vocabulary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedVocab.map(word => {
                const mastered = progress.masteredVocabIds.includes(word.id);
                return (
                  <div
                    key={word.id}
                    className="ekr-glass-panel rounded-2xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-2xl font-black text-[#061B49] dark:text-white">
                            {word.hangul}
                          </div>
                          <div className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] mt-1">
                            {pickTriLingual(learningLang, {
                              bn: 'বাংলা উচ্চারণ',
                              ne: 'नेपाली उच्चारण',
                              en: 'Pronunciation',
                            })}
                            :{' '}
                            {getScriptPronunciation(word.hangul, learningLang, {
                              pronunciationBn: word.bengaliPronunciation,
                              romanization: word.romanization,
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => playKoreanAudio(word.hangul, undefined, 0.84)}
                            className="p-2 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white cursor-pointer"
                            title="Listen"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleVocabMastered(word.id)}
                            className={`p-2 rounded-xl border cursor-pointer ${
                              mastered
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                            title="Mark word mastered"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                          {pickTriLingual(learningLang, {
                            bn: `বাংলা অর্থ: ${word.bengali}`,
                            ne: `अर्थ: ${(word as { nepali?: string }).nepali || word.english}`,
                            en: `Meaning: ${word.english}`,
                          })}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {learningLang === 'bn'
                            ? `English: ${word.english} · [${word.romanization}]`
                            : `বাংলা: ${word.bengali} · English: ${word.english}`}
                        </div>
                      </div>

                      {word.exampleHangul && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#061B49] border border-slate-200/70 dark:border-slate-800/80">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#10243A] dark:text-slate-200">
                              {word.exampleHangul}
                            </span>
                            <button
                              type="button"
                              onClick={() => playKoreanAudio(word.exampleHangul!, undefined, 0.8)}
                              className="text-[#0754B8] dark:text-[#60A5FA] cursor-pointer shrink-0"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {word.exampleBengali && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                              {word.exampleBengali}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between ekr-glass-panel rounded-2xl px-5 py-3.5">
              <button
                type="button"
                disabled={vocabPage <= 1}
                onClick={() => setVocabPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                <span>{isBn ? 'পূর্ববর্তী পৃষ্ঠা' : 'Previous Page'}</span>
              </button>

              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {vocabPage} / {totalVocabPages} ({filteredVocabulary.length}{' '}
                {isBn ? 'টি শব্দ' : 'words'})
              </span>

              <button
                type="button"
                disabled={vocabPage >= totalVocabPages}
                onClick={() => setVocabPage(p => Math.min(totalVocabPages, p + 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#10243A] dark:bg-slate-800 text-white disabled:opacity-40 cursor-pointer"
              >
                <span>{isBn ? 'পরবর্তী পৃষ্ঠা' : 'Next Page'}</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODULE 5: DAILY CONVERSATION (PRACTICAL BENGALI-TO-KOREAN DIALOGUES)  */}
        {/* ===================================================================== */}
        {activeModule === 'daily-conversation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Scenario Selector */}
            <div className="lg:col-span-4 space-y-2.5">
              <div className="ekr-glass-panel rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA] mb-3">
                  7 PRACTICAL SCENARIOS · 실전 회화
                </p>
                <div className="space-y-2">
                  {DAILY_CONVERSATION_LESSONS.map((conv, idx) => {
                    const selected = idx === activeConvIndex;
                    const done = progress.completedLessons.includes(conv.id);
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => {
                          stopFullDialoguePlayback();
                          setActiveConvIndex(idx);
                        }}
                        className={`w-full text-start p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                          selected
                            ? 'bg-[#0754B8] text-white border-[#0875E8]'
                            : 'bg-slate-50 dark:bg-[#061B49] border-slate-200 dark:border-slate-800 text-[#061B49] dark:text-white hover:border-[#0875E8]'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-bold opacity-80">
                            0{conv.order} · {conv.categoryTagKo}
                          </div>
                          <div className="text-xs sm:text-sm font-bold mt-0.5">{conv.titleBn}</div>
                          <div className="text-[11px] opacity-80">{conv.titleEn}</div>
                        </div>
                        {done && (
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-1 ${
                              selected ? 'text-white' : 'text-emerald-500'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Interactive Conversation Player */}
            <div className="lg:col-span-8 ekr-glass-panel rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA]">
                    SCENARIO 0{activeConversation.order} · {activeConversation.categoryTagKo}
                  </p>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#061B49] dark:text-white mt-0.5">
                    {activeConversation.titleBn}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isBn ? activeConversation.situationBn : activeConversation.situationEn}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePlayFullConversation}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white text-xs font-bold cursor-pointer"
                  >
                    {isPlayingFullDialogue ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>{ui.stopAudio}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>{ui.playConversation}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHideMeaningForPractice(prev => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {hideMeaningForPractice ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span>{isBn ? 'অর্থ লুকান/দেখুন' : 'Roleplay Hide/Show'}</span>
                  </button>
                </div>
              </div>

              {/* Dialogue Turns */}
              <div className="space-y-4">
                {activeConversation.lines.map((line, idx) => {
                  const isCurrentlySpeaking = playingLineIdx === idx;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrentlySpeaking
                          ? 'bg-[#0754B8]/8 dark:bg-[#0754B8]/20 border-[#0875E8]'
                          : line.speaker === 'A'
                          ? 'bg-slate-50 dark:bg-[#061B49] border-slate-200/80 dark:border-slate-800'
                          : 'bg-blue-50/40 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-[#10243A] dark:text-slate-300">
                          {line.speakerLabelBn}{' '}
                          <span className="text-slate-400 font-normal">({line.speakerLabelEn})</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => playKoreanAudio(line.korean, undefined, 0.85)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0754B8] text-white text-[11px] font-bold cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{ui.tapToListen}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => playKoreanAudio(line.korean, undefined, 0.58)}
                            className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-[11px] font-bold text-[#10243A] dark:text-slate-200 cursor-pointer"
                          >
                            0.6x
                          </button>
                        </div>
                      </div>

                      <p className="text-base sm:text-lg font-extrabold text-[#061B49] dark:text-white">
                        {line.korean}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-[#0754B8] dark:text-[#60A5FA] mt-1">
                        বাংলা উচ্চারণ: {line.bengaliPron}
                      </p>

                      {!hideMeaningForPractice && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            বাংলা অর্থ: {line.bengaliMeaning}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {line.englishMeaning}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Key Takeaway Expressions */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#061B49] border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  {isBn ? 'গুরুত্বপূর্ণ বাক্যাংশ (Key Expressions)' : 'Key Takeaway Phrases'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeConversation.keyPhrases.map(kp => (
                    <button
                      key={kp.korean}
                      type="button"
                      onClick={() => playKoreanAudio(kp.korean, undefined, 0.82)}
                      className="text-start p-3 rounded-xl bg-white dark:bg-[#10243A] border border-slate-200 dark:border-slate-800 hover:border-[#0875E8] cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-[#061B49] dark:text-white">
                          {kp.korean}
                        </span>
                        <Volume2 className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                      </div>
                      <div className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] mt-1">
                        {kp.bengaliPron}
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                        {kp.bengaliMeaning}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prev / Next Conversation + Mark Complete */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={activeConvIndex <= 0}
                  onClick={() => setActiveConvIndex(i => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>{ui.prevLesson}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleLessonComplete(activeConversation.id)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    progress.completedLessons.includes(activeConversation.id)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0754B8] text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {progress.completedLessons.includes(activeConversation.id)
                      ? ui.completedLabel
                      : ui.markComplete}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={activeConvIndex >= DAILY_CONVERSATION_LESSONS.length - 1}
                  onClick={() =>
                    setActiveConvIndex(i => Math.min(DAILY_CONVERSATION_LESSONS.length - 1, i + 1))
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#10243A] dark:bg-slate-800 text-white disabled:opacity-40 cursor-pointer"
                >
                  <span>{ui.nextLesson}</span>
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODULE 6: GRAMMAR (8 BEGINNER KOREAN GRAMMAR UNITS)                   */}
        {/* ===================================================================== */}
        {activeModule === 'grammar' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Unit List */}
            <div className="lg:col-span-4">
              <div className="ekr-glass-panel rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA] mb-2">
                  8 BEGINNER GRAMMAR UNITS · 초급 문법
                </p>
                {GRAMMAR_LESSONS.map((g, idx) => {
                  const selected = idx === activeGrammarIndex;
                  const done = progress.completedLessons.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setActiveGrammarIndex(idx)}
                      className={`w-full text-start p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        selected
                          ? 'bg-[#0754B8] text-white border-[#0875E8]'
                          : 'bg-slate-50 dark:bg-[#061B49] border-slate-200 dark:border-slate-800 text-[#061B49] dark:text-white hover:border-[#0875E8]'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-black">{g.patternKo}</div>
                        <div className="text-xs font-semibold mt-0.5 opacity-90">{g.titleBn}</div>
                      </div>
                      {done && (
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            selected ? 'text-white' : 'text-emerald-500'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Grammar Lesson & Practice Check */}
            <div className="lg:col-span-8 ekr-glass-panel rounded-2xl p-6 space-y-6">
              <div>
                <p className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA]">
                  GRAMMAR UNIT 0{activeGrammar.order} · {activeGrammar.patternKo}
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white mt-1">
                  {activeGrammar.titleBn}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeGrammar.titleEn}
                </p>

                <div className="mt-4 p-4 rounded-2xl bg-[#061B49] text-white">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#60A5FA]">
                    FORMULA · বাক্য গঠনের সূত্র
                  </div>
                  <div className="text-base sm:text-lg font-extrabold mt-1">
                    {activeGrammar.formula}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  <p>
                    <span className="font-bold text-[#0754B8] dark:text-[#60A5FA]">বাংলা ব্যাখ্যা: </span>
                    {activeGrammar.ruleBn}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{activeGrammar.ruleEn}</p>
                  <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200">
                    <span className="font-bold">বাতছিম (받침) নিয়ম: </span>
                    {activeGrammar.batchimRuleBn}
                  </div>
                </div>
              </div>

              {/* Examples with Korean + Bengali Pronunciation + Bengali Meaning + Audio */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#061B49] dark:text-white">
                  {isBn ? 'উদাহরণ বাক্য (অডিওসহ):' : 'Example Sentences (with Bengali Pronunciation & Audio):'}
                </h3>
                {activeGrammar.examples.map(ex => (
                  <div
                    key={ex.korean}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-[#061B49] border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-base sm:text-lg font-extrabold text-[#061B49] dark:text-white">
                        {ex.korean}
                      </div>
                      <div className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA]">
                        বাংলা উচ্চারণ: {ex.bengaliPron}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        বাংলা অর্থ: {ex.bengaliMeaning}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {ex.englishMeaning}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => playKoreanAudio(ex.korean, undefined, 0.84)}
                      className="p-2.5 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white shrink-0 cursor-pointer"
                      title="Listen sentence"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Interactive Mini Check */}
              {(() => {
                const chosen = grammarAnswers[activeGrammar.id];
                const answered = chosen !== undefined;
                const isCorrect = chosen === activeGrammar.practiceCheck.correctIndex;
                return (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                      QUICK GRAMMAR CHECK · অনুশীলন যাচাই
                    </div>
                    <p className="text-base font-extrabold text-[#061B49] dark:text-white mt-1">
                      {activeGrammar.practiceCheck.questionKo}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isBn
                        ? activeGrammar.practiceCheck.bengaliHint
                        : `${activeGrammar.practiceCheck.bengaliHint} (${activeGrammar.practiceCheck.englishHint})`}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                      {activeGrammar.practiceCheck.options.map((opt, optIdx) => {
                        let cls =
                          'bg-white dark:bg-[#10243A] border-slate-200 dark:border-slate-700 text-[#061B49] dark:text-white';
                        if (answered) {
                          if (optIdx === activeGrammar.practiceCheck.correctIndex) {
                            cls = 'bg-emerald-600 text-white border-emerald-600';
                          } else if (chosen === optIdx) {
                            cls = 'bg-rose-600 text-white border-rose-600';
                          }
                        }
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setGrammarAnswers(prev => ({ ...prev, [activeGrammar.id]: optIdx }))
                            }
                            className={`py-2.5 px-3 rounded-xl border text-sm font-extrabold cursor-pointer transition-colors ${cls}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {answered && (
                      <p
                        className={`mt-3 text-xs font-semibold ${
                          isCorrect
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {activeGrammar.practiceCheck.explanationBn}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Prev / Next Grammar Lesson */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={activeGrammarIndex <= 0}
                  onClick={() => setActiveGrammarIndex(i => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>{ui.prevLesson}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleLessonComplete(activeGrammar.id)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    progress.completedLessons.includes(activeGrammar.id)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0754B8] text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {progress.completedLessons.includes(activeGrammar.id)
                      ? ui.completedLabel
                      : ui.markComplete}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={activeGrammarIndex >= GRAMMAR_LESSONS.length - 1}
                  onClick={() =>
                    setActiveGrammarIndex(i => Math.min(GRAMMAR_LESSONS.length - 1, i + 1))
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#10243A] dark:bg-slate-800 text-white disabled:opacity-40 cursor-pointer"
                >
                  <span>{ui.nextLesson}</span>
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODULE 7: WRITING PRACTICE (INTERACTIVE HANGUL WRITING CANVAS)        */}
        {/* ===================================================================== */}
        {activeModule === 'writing-practice' && (
          <div className="space-y-6">
            <div className="ekr-glass-panel rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                MODULE 07 · 한글 쓰기 연습 · INTERACTIVE STROKE & WORD WRITING
              </p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white mt-1">
                {isBn
                  ? '৭. হানগুল হাতে লেখা অনুশীলন (বর্ণ ট্রেসিং, যুক্তবর্ণ, শব্দ ও বাক্য)'
                  : '7. Interactive Hangul Writing Practice (Letters, Syllables, Words & Sentences)'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                {isBn
                  ? 'আঙুল বা মাউস দিয়ে ক্যানভাসের ওপর হানগুল বর্ণ লিখুন, উচ্চারণ শুনুন এবং নির্ভুলতা যাচাই করুন।'
                  : 'Draw strokes with mouse or touch, listen to native pronunciation, and check writing accuracy.'}
              </p>
            </div>

            <HandwritingCanvasTab
              uiLang={learningLang}
              completedIds={progress.completedHandwritingIds}
              onCompleteItem={handleCompleteHandwriting}
            />
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODULE 8: KOREAN QUIZ (MCQs, LISTENING & VOCABULARY TESTS)            */}
        {/* ===================================================================== */}
        {activeModule === 'korean-quiz' && (
          <div className="space-y-6">
            <div className="ekr-glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                  MODULE 08 · 한국어 퀴즈 · MCQs, LISTENING & VOCABULARY TESTS
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white mt-1">
                  {isBn
                    ? '৮. কোরিয়ান কুইজ: এমসিকিউ, অডিও লিসেনিং এবং শব্দভাণ্ডার পরীক্ষা'
                    : '8. Korean Quiz: Hangul MCQs, Native Audio Listening & Vocabulary Tests'}
                </h2>
              </div>

              <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl">
                {(
                  [
                    { id: 'all', label: isBn ? 'সব প্রশ্ন (১২)' : 'All (12)' },
                    { id: 'mcq', label: isBn ? 'বর্ণ এমসিকিউ' : 'Hangul MCQ' },
                    { id: 'listening', label: isBn ? 'লিসেনিং টেস্ট' : 'Listening' },
                    { id: 'vocabulary', label: isBn ? 'শব্দার্থ ও ব্যাকরণ' : 'Vocab & Grammar' },
                  ] as { id: LearnHangulQuizCategory; label: string }[]
                ).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => resetQuiz(cat.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                      quizCategory === cat.id
                        ? 'bg-[#0754B8] text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {!quizFinished ? (
              (() => {
                const q = activeQuizQuestions[quizCurrentIdx] || activeQuizQuestions[0];
                const selectedIdx = quizSelectedAnswers[q.id];
                const isAnswered = selectedIdx !== undefined;

                return (
                  <div className="ekr-glass-panel rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-4">
                      <span>
                        QUESTION {quizCurrentIdx + 1} OF {activeQuizQuestions.length} ·{' '}
                        {q.category.toUpperCase()}
                      </span>
                      <span>
                        {Object.keys(quizSelectedAnswers).length}/{activeQuizQuestions.length}{' '}
                        {isBn ? 'উত্তর দেওয়া হয়েছে' : 'Answered'}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-extrabold text-[#061B49] dark:text-white">
                      {isBn ? q.questionBn : `${q.questionEn} (${q.questionBn})`}
                    </h3>

                    {q.highlightKo && (
                      <div className="mt-4 inline-block px-5 py-3 rounded-2xl bg-slate-100 dark:bg-[#061B49] text-2xl sm:text-3xl font-black text-[#061B49] dark:text-white">
                        {q.highlightKo}
                      </div>
                    )}

                    {q.audioKo && (
                      <div className="mt-5 p-4 rounded-2xl bg-[#061B49] text-white flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-[#60A5FA]">
                            AUDIO LISTENING QUESTION · 듣기 문제
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5">
                            {isBn
                              ? 'অডিও বাটনে ক্লিক করে মনোযোগ দিয়ে শুনুন এবং নিচের সঠিক উত্তরটি বেছে নিন।'
                              : 'Tap Play Audio to hear the native Korean phrase and pick the matching answer.'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => playKoreanAudio(q.audioKo!, undefined, 0.84)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white text-xs font-bold cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>{isBn ? 'অডিও শুনুন' : 'Play Audio'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => playKoreanAudio(q.audioKo!, undefined, 0.58)}
                            className="px-3 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                          >
                            0.6x
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 space-y-3">
                      {q.options.map((opt, idx) => {
                        let cls =
                          'bg-slate-50 dark:bg-[#061B49] border-slate-200 dark:border-slate-800 text-[#061B49] dark:text-white hover:border-[#0875E8]';
                        if (isAnswered) {
                          if (idx === q.correctIndex) {
                            cls =
                              'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200';
                          } else if (selectedIdx === idx) {
                            cls =
                              'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200';
                          }
                        }
                        return (
                          <button
                            key={opt.text + idx}
                            type="button"
                            onClick={() => {
                              if (!isAnswered) {
                                setQuizSelectedAnswers(prev => ({ ...prev, [q.id]: idx }));
                              }
                            }}
                            className={`w-full text-start p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${cls}`}
                          >
                            <div>
                              <div className="text-base font-extrabold">{opt.text}</div>
                              {opt.subBn && (
                                <div className="text-xs opacity-80 mt-0.5">{opt.subBn}</div>
                              )}
                            </div>
                            {isAnswered && idx === q.correctIndex && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-[#0754B8] dark:text-[#60A5FA]">ব্যাখ্যা: </span>
                        {q.explanationBn} ({q.explanationEn})
                      </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={quizCurrentIdx <= 0}
                        onClick={() => setQuizCurrentIdx(i => Math.max(0, i - 1))}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                        <span>{isBn ? 'পূর্ববর্তী প্রশ্ন' : 'Previous'}</span>
                      </button>

                      {quizCurrentIdx < activeQuizQuestions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setQuizCurrentIdx(i => Math.min(activeQuizQuestions.length - 1, i + 1))
                          }
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#10243A] dark:bg-slate-800 text-white cursor-pointer"
                        >
                          <span>{isBn ? 'পরবর্তী প্রশ্ন' : 'Next Question'}</span>
                          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleFinishQuiz}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0754B8] hover:bg-[#0875E8] text-white cursor-pointer"
                        >
                          <Award className="w-4 h-4" />
                          <span>{isBn ? 'ফলাফল দেখুন ও সেভ করুন' : 'Submit & Save Score'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Quiz Score Summary Card */
              <div className="ekr-glass-panel rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-[#0754B8]/10 text-[#0754B8] dark:text-[#60A5FA] mx-auto flex items-center justify-center">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#061B49] dark:text-white">
                  {isBn ? 'কুইজ সম্পন্ন হয়েছে!' : 'Quiz Completed!'}
                </h3>
                {examHistory[0] && (
                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#061B49]">
                      <div className="text-2xl font-black text-[#0754B8] dark:text-[#60A5FA]">
                        {examHistory[0].scorePercent}%
                      </div>
                      <div className="text-[11px] text-slate-500">Score</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#061B49]">
                      <div className="text-2xl font-black text-emerald-600">
                        {examHistory[0].correctCount}/{examHistory[0].totalQuestions}
                      </div>
                      <div className="text-[11px] text-slate-500">Correct</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#061B49]">
                      <div className="text-2xl font-black text-[#061B49] dark:text-white">
                        {examHistory[0].durationSeconds}s
                      </div>
                      <div className="text-[11px] text-slate-500">Time</div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => resetQuiz()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0754B8] text-white text-xs sm:text-sm font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isBn ? 'আবার কুইজ দিন' : 'Retake Quiz'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModule('progress-tracking')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10243A] dark:bg-slate-800 text-white text-xs sm:text-sm font-bold cursor-pointer"
                  >
                    <span>{isBn ? 'সম্পূর্ণ প্রগ্রেস দেখুন' : 'View Progress History'}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODULE 9: PROGRESS TRACKING (COMPLETED LESSONS, SCORES & HISTORY)     */}
        {/* ===================================================================== */}
        {activeModule === 'progress-tracking' && (
          <div className="space-y-6">
            {/* Guest Sync Banner if not logged in */}
            {!currentUser && (
              <div className="bg-[#061B49] text-white rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#60A5FA]">
                    CLOUD PROGRESS SYNC · EVERYKR ACCOUNT
                  </p>
                  <p className="text-sm text-slate-200 mt-1">{ui.guestNotice}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0754B8] hover:bg-[#0875E8] text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{ui.signInToSave}</span>
                </button>
              </div>
            )}

            {/* 4 Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="ekr-glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>{isBn ? 'সম্পন্ন লেসন' : 'Completed Lessons'}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#061B49] dark:text-white mt-2">
                  {completedTrackableCount} / {TRACKABLE_LESSONS.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">{overallPercent}% curriculum done</div>
              </div>

              <div className="ekr-glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>{isBn ? 'আয়ত্ত করা শব্দ' : 'Mastered Words'}</span>
                  <Sparkles className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#061B49] dark:text-white mt-2">
                  {progress.masteredVocabIds.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {progress.completedHandwritingIds.length} writing sheets done
                </div>
              </div>

              <div className="ekr-glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>{isBn ? 'কুইজ নির্ভুলতা' : 'Quiz Accuracy'}</span>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#061B49] dark:text-white mt-2">
                  {progress.totalQuestionsAnswered > 0
                    ? `${Math.round(
                        (progress.totalCorrectAnswers / progress.totalQuestionsAnswered) * 100
                      )}%`
                    : '—'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {progress.totalQuestionsAnswered} total questions answered
                </div>
              </div>

              <div className="ekr-glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>{isBn ? 'ধারাবাহিকতা ও সময়' : 'Streak & Study Time'}</span>
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#061B49] dark:text-white mt-2">
                  {progress.streakDays} {isBn ? 'দিন' : 'Days'}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{progress.totalPracticeMinutes} mins practiced</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Lesson Completion Checklist */}
              <div className="lg:col-span-7 ekr-glass-panel rounded-2xl p-6">
                <h3 className="text-base sm:text-lg font-bold text-[#061B49] dark:text-white mb-4">
                  {isBn ? 'লেসন অনুযায়ী অগ্রগতি তালিকা' : 'Structured Lesson Completion Record'}
                </h3>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pe-1">
                  {TRACKABLE_LESSONS.map(item => {
                    const done = progress.completedLessons.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-[#061B49] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              done ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-[#061B49] dark:text-white truncate">
                              {isBn ? item.labelBn : `${item.labelEn} · ${item.labelBn}`}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModule(item.moduleId)}
                          className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline shrink-0 cursor-pointer"
                        >
                          {done ? (isBn ? 'পুনরায় দেখুন' : 'Review') : isBn ? 'শুরু করুন' : 'Open'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quiz & Test Score History */}
              <div className="lg:col-span-5 ekr-glass-panel rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-[#061B49] dark:text-white">
                    {isBn ? 'সাম্প্রতিক কুইজ স্কোর ও হিস্ট্রি' : 'Quiz Scores & Learning History'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveModule('korean-quiz')}
                    className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                  >
                    {isBn ? '+ নতুন কুইজ' : '+ Take Quiz'}
                  </button>
                </div>

                {examHistory.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 dark:bg-[#061B49] border border-dashed border-slate-200 dark:border-slate-800">
                    <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {isBn
                        ? 'এখনো কোনো কুইজ সম্পন্ন হয়নি। কোরিয়ান কুইজ মডিউল থেকে প্রথম পরীক্ষা দিন!'
                        : 'No quiz history recorded yet. Take your first Korean Quiz to track scores!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pe-1">
                    {examHistory.map(res => (
                      <div
                        key={res.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#061B49] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-[#061B49] dark:text-white">
                            {res.subject}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {res.correctCount}/{res.totalQuestions} correct ·{' '}
                            {new Date(res.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-base font-black text-[#0754B8] dark:text-[#60A5FA]">
                          {res.scorePercent}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global Previous Module / Next Module Footer Navigation */}
        <div className="ekr-glass-panel rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {prevModuleMeta ? (
            <button
              type="button"
              onClick={() => selectHangulSection(prevModuleMeta.id)}
              className="w-full sm:w-auto ekr-btn-secondary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>
                {ui.prevModule}: {prevModuleMeta.stepNumber}.{' '}
                {getLocalizedMapValue(prevModuleMeta.title, language)}
              </span>
            </button>
          ) : (
            <div />
          )}

          {nextModuleMeta && (
            <button
              type="button"
              onClick={() => selectHangulSection(nextModuleMeta.id)}
              className="w-full sm:w-auto ekr-glass-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-xs sm:text-sm font-bold cursor-pointer"
            >
              <span>
                {ui.nextModule}: {nextModuleMeta.stepNumber}.{' '}
                {getLocalizedMapValue(nextModuleMeta.title, language)}
              </span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}
        </div>
          </div>

          {/* RIGHT: Student-Friendly Right-Side Learning Navigation Sidebar */}
          <LearningRightSidebar
            title={isBn ? 'কোরিয়ান লার্নিং মেনু' : 'Learn Hangul Menu'}
            subtitle={isBn ? 'ধাপে ধাপে হানগুল ও ভাষা শিখুন' : 'Step-by-step Korean roadmap'}
            emoji="🇰🇷"
            progressPercent={overallPercent}
            progressLabel={isBn ? 'কোর্স অগ্রগতি' : 'Course Progress'}
            progressMeta={`${completedTrackableCount}/${TRACKABLE_LESSONS.length} (${overallPercent}%)`}
            groups={hangulSidebarGroups}
            activeSectionLabel={activeSectionLabel}
            footerSlot={
              <div className="space-y-2">
                <Link
                  to="/korean-academy"
                  className="w-full ekr-glass-btn-primary inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB800]" />
                  <span>{isBn ? '20X একাডেমি ও এআই টিউটর' : 'Open 20X Academy & AI Tutor'}</span>
                </Link>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};
