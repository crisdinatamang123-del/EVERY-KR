import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Flame,
  Globe,
  Grid,
  Home,
  Play,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AcademyCategory,
  AcademyExamQuestion,
  AcademyLanguage,
  AcademyVocabItem,
  HangulLessonUnit,
} from '../../data/koreanAcademyData';
import { RealLifeScenario20x } from '../../data/korean20x/levelsAndCategories';
import { getRealLifeScenarios20x } from '../../data/korean20x/scenariosAndConversations20x';
import { LEARNING_STAGES_5 } from '../../data/learnKoreanHangulAndVocab';
import {
  isLearnKoreanRtl,
  LEARN_KOREAN_9_LANGUAGES,
  pickMultiLang,
} from '../../data/korean50x/korean50xContentEngine';
import { computeAdaptiveDashboardInsights } from '../../services/koreanExamEngine';
import {
  createInitialUserProgress,
  ExamResultSubmission,
  fetchAcademyCurriculum,
  getExpandedAcademyCategories,
  getExpandedHangulAndPathLessons,
  getKoreanVoicePreferences,
  getTodayDateString,
  KoreanSpeakingStyleMode,
  KoreanVoiceGender,
  loadUserAcademyProgress,
  loadUserExamHistory,
  saveExamSubmission,
  saveUserAcademyProgress,
  setKoreanVoicePreferences,
  UserAcademyProgress,
} from '../../services/koreanAcademyService';
import { detectCountryLearningLanguage } from '../../utils/hangulPhonetics';
import { AdminKoreanAcademyTab } from '../admin/AdminKoreanAcademyTab';
import { AiKoreanTutorTab } from './AiKoreanTutorTab';
import { ExaminationSystemTab } from './ExaminationSystemTab';
import {
  findCategoryForModule,
  LEARN_KOREAN_13_CATEGORIES,
  LearnKoreanMainCategory,
  LearnKoreanPresetPayload,
  LearnKoreanSubcategoryItem,
  MainCategory13Id,
} from './learnKoreanCategoriesConfig';
import {
  AskAiTutorDrawer,
  HangulFoundationModuleView,
  LearnKoreanAuthGate,
  LearnKoreanModuleId,
} from './LearnKoreanModulesView';
import {
  ConversationPractice50xModuleView,
  Grammar3TierModuleView,
  ListeningAndSpeakingModuleView,
  ReadingWritingDailyAndLifeView,
  SentenceBuilder50xModuleView,
  Vocabulary18CategoriesModuleView,
} from './LearnKoreanSkillModulesView';
import {
  LearningRightSidebar,
  LearningSidebarGroup,
  LearningSidebarItem,
} from '../common/LearningRightSidebar';

const SUPPORTED_9_LANG_CODES = LEARN_KOREAN_9_LANGUAGES.map(l => l.code);

const MODULE_DISPLAY_LABELS: Record<LearnKoreanModuleId, string> = {
  dashboard: 'Overview',
  hangul: 'Korean Alphabet (Hangul)',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  sentences: 'Sentence Builder',
  conversation: 'Conversation & Speaking',
  listening: 'Listening',
  speaking: 'Pronunciation & Speaking',
  reading: 'Reading',
  writing: 'Writing',
  topik: 'TOPIK & Mock Exams',
  daily_korean: 'Daily Korean',
  everyday_life: 'Everyday Life in Korea',
  ai_tutor: 'AI Korean Tutor',
  progress: 'My Progress',
  admin: 'Curriculum Admin',
};

export const KoreanLearningAcademy: React.FC = () => {
  const { currentUser, isServerVerifiedAdmin, setActivePage } = useApp();
  const user = currentUser;
  const isAdmin = Boolean(isServerVerifiedAdmin || currentUser?.role === 'admin');

  const detectedCountryLang = useMemo(
    () => detectCountryLearningLanguage(user),
    [user]
  );
  const [uiLang, setUiLang] = useState<AcademyLanguage>(() =>
    detectCountryLearningLanguage(user)
  );
  const [activeModule, setActiveModule] = useState<LearnKoreanModuleId>('dashboard');
  const [activeStageOrder, setActiveStageOrder] = useState<number>(1);

  // Category & Expandable Submenu State
  const [expandedCategoryId, setExpandedCategoryId] = useState<MainCategory13Id | null>(
    'vocabulary'
  );
  const [activeCategoryId, setActiveCategoryId] = useState<MainCategory13Id | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<LearnKoreanPresetPayload>({});
  const [presetNonce, setPresetNonce] = useState<number>(0);

  // Category Search & In-Module Switcher State
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [siblingMenuOpen, setSiblingMenuOpen] = useState<boolean>(false);
  const [allCategoriesDrawerOpen, setAllCategoriesDrawerOpen] = useState<boolean>(false);
  const [voiceMenuOpen, setVoiceMenuOpen] = useState<boolean>(false);

  // Korean Neural Voice Preferences
  const [voicePrefs, setVoicePrefsState] = useState(() => getKoreanVoicePreferences());

  // Contextual AI Tutor Drawer state
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiDrawerContext, setAiDrawerContext] = useState<string>('Learn Korean Study Assistant');

  // Curriculum & Admin state (preserved for Firestore overrides & Exam Engine)
  const [, setCategories] = useState<AcademyCategory[]>(() =>
    getExpandedAcademyCategories()
  );
  const [, setLessons] = useState<HangulLessonUnit[]>(() =>
    getExpandedHangulAndPathLessons()
  );
  const [, setVocabulary] = useState<AcademyVocabItem[]>([]);
  const [questions, setQuestions] = useState<AcademyExamQuestion[]>([]);
  const [, setScenarios] = useState<RealLifeScenario20x[]>(() =>
    getRealLifeScenarios20x()
  );

  // User Progress & Exam History
  const [progress, setProgress] = useState<UserAcademyProgress>(() =>
    createInitialUserProgress(user?.id || 'guest', user?.email, user?.name)
  );
  const [examHistory, setExamHistory] = useState<ExamResultSubmission[]>([]);

  // Sync country-based language when user profile loads, unless user saved a manual preference
  useEffect(() => {
    if (!user) return;
    if (
      progress.preferredLearningLang &&
      SUPPORTED_9_LANG_CODES.includes(progress.preferredLearningLang as any)
    ) {
      setUiLang(progress.preferredLearningLang as AcademyLanguage);
    } else {
      setUiLang(detectCountryLearningLanguage(user));
    }
  }, [user, progress.preferredLearningLang]);

  // Load Curriculum & Firestore Overrides
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    fetchAcademyCurriculum().then(curr => {
      if (!mounted) return;
      setCategories(curr.categories);
      setLessons(curr.lessons);
      setVocabulary(curr.vocabulary);
      setQuestions(curr.questions);
      setScenarios(curr.scenarios);
    });
    return () => {
      mounted = false;
    };
  }, [user, activeModule]);

  // Load Authenticated Student Progress & Exam History
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const uid = user.id;
    Promise.all([
      loadUserAcademyProgress(uid, user.email, user.name),
      loadUserExamHistory(uid),
    ]).then(([prog, history]) => {
      if (!mounted) return;
      const resolvedLang =
        prog.preferredLearningLang &&
        SUPPORTED_9_LANG_CODES.includes(prog.preferredLearningLang as any)
          ? (prog.preferredLearningLang as AcademyLanguage)
          : detectCountryLearningLanguage(user);
      setUiLang(resolvedLang);
      setProgress(prog);
      setExamHistory(history);
    });
    return () => {
      mounted = false;
    };
  }, [user]);

  // Automatic 60-second Practice Time tracker for authenticated learners
  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      setProgress(prev => {
        const today = getTodayDateString();
        const existingToday = prev.dailyActivity?.[today] || {
          date: today,
          minutesPracticed: 0,
          questionsAnswered: 0,
          lessonsCompleted: 0,
        };
        const next: UserAcademyProgress = {
          ...prev,
          totalPracticeMinutes: (prev.totalPracticeMinutes || 0) + 1,
          dailyActivity: {
            ...(prev.dailyActivity || {}),
            [today]: {
              ...existingToday,
              minutesPracticed: existingToday.minutesPracticed + 1,
            },
          },
        };
        saveUserAcademyProgress(next);
        return next;
      });
    }, 60000);
    return () => window.clearInterval(interval);
  }, [user]);

  const updateProgress = (updater: (prev: UserAcademyProgress) => UserAcademyProgress) => {
    setProgress(prev => {
      const next = updater(prev);
      saveUserAcademyProgress(next);
      return next;
    });
  };

  const handleSelectLearningLanguage = (nextLang: AcademyLanguage) => {
    setUiLang(nextLang);
    updateProgress(prev => ({
      ...prev,
      preferredLearningLang: nextLang,
    }));
  };

  const handleUpdateVoicePrefs = (next: {
    speakingStyle?: KoreanSpeakingStyleMode;
    voiceGender?: KoreanVoiceGender;
  }) => {
    const updated = setKoreanVoicePreferences(next);
    setVoicePrefsState(updated);
  };

  const handleExamComplete = async (submission: ExamResultSubmission) => {
    const fullSubmission: ExamResultSubmission = {
      ...submission,
      userId: user?.id || 'guest',
      userEmail: user?.email || '',
    };
    await saveExamSubmission(fullSubmission);
    setExamHistory(prev => [fullSubmission, ...prev]);

    const today = getTodayDateString();
    updateProgress(prev => {
      const existingToday = prev.dailyActivity?.[today] || {
        date: today,
        minutesPracticed: 0,
        questionsAnswered: 0,
        lessonsCompleted: 0,
      };
      return {
        ...prev,
        lastModuleVisited: 'topik',
        totalQuestionsAnswered:
          (prev.totalQuestionsAnswered || 0) + submission.totalQuestions,
        totalCorrectAnswers:
          (prev.totalCorrectAnswers || 0) + submission.correctCount,
        totalIncorrectAnswers:
          (prev.totalIncorrectAnswers || 0) + submission.incorrectCount,
        dailyActivity: {
          ...(prev.dailyActivity || {}),
          [today]: {
            ...existingToday,
            questionsAnswered:
              existingToday.questionsAnswered + submission.totalQuestions,
          },
        },
      };
    });
  };

  const adaptiveInsights = useMemo(
    () => computeAdaptiveDashboardInsights(progress, examHistory),
    [progress, examHistory]
  );

  // Filter categories & subcategories by live search query
  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) {
      return LEARN_KOREAN_13_CATEGORIES.map(cat => ({
        category: cat,
        matchingSubcategories: cat.subcategories,
        isDirectCategoryMatch: true,
      }));
    }

    return LEARN_KOREAN_13_CATEGORIES.map(cat => {
      const catMatch =
        cat.title.toLowerCase().includes(q) ||
        cat.titleKo.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q);

      const subMatches = cat.subcategories.filter(
        sub =>
          sub.label.toLowerCase().includes(q) ||
          sub.labelKo.toLowerCase().includes(q) ||
          sub.description.toLowerCase().includes(q) ||
          (sub.keywords || []).some(k => k.toLowerCase().includes(q))
      );

      return {
        category: cat,
        matchingSubcategories: catMatch && subMatches.length === 0 ? cat.subcategories : subMatches,
        isDirectCategoryMatch: catMatch,
      };
    }).filter(entry => entry.isDirectCategoryMatch || entry.matchingSubcategories.length > 0);
  }, [categorySearch]);

  // Guest Authentication Gate
  if (!user) {
    return (
      <LearnKoreanAuthGate
        onLoginClick={() => {
          window.history.pushState({}, '', '/login?redirect=/korean-academy');
          setActivePage('login');
        }}
        onRegisterClick={() => {
          window.history.pushState({}, '', '/register?redirect=/korean-academy');
          setActivePage('register');
        }}
      />
    );
  }

  // Essential Progress Calculation
  const lessonsCompletedCount =
    (progress.completedLessons?.length || 0) +
    (progress.completedGrammarIds?.length || 0) +
    (progress.completedHandwritingIds?.length || 0);
  const vocabLearnedCount = progress.masteredVocabIds?.length || 0;

  // Derived stage & clean progress percentage
  const derivedStageNumber =
    examHistory.some(e => e.scorePercent >= 75 && e.difficulty === 'Advanced')
      ? 5
      : lessonsCompletedCount >= 25 || vocabLearnedCount >= 120
        ? 4
        : lessonsCompletedCount >= 10 || vocabLearnedCount >= 40
          ? 3
          : progress.completedLessons?.includes('hangul-stage-1-quiz') ||
              lessonsCompletedCount >= 3 ||
              vocabLearnedCount >= 10
            ? 2
            : activeStageOrder;

  const currentStage =
    LEARNING_STAGES_5.find(s => s.stageNumber === derivedStageNumber) || LEARNING_STAGES_5[0];

  const essentialProgressPercent = Math.min(
    100,
    Math.max(
      8,
      Math.round(
        Math.min(40, vocabLearnedCount * 0.5) +
          Math.min(35, lessonsCompletedCount * 2) +
          Math.min(25, adaptiveInsights.examReadinessPercent * 0.25)
      )
    )
  );

  const isRtl = isLearnKoreanRtl(uiLang);

  // Navigation Handlers
  const goHomeDashboard = () => {
    setActiveModule('dashboard');
    setSiblingMenuOpen(false);
    setAllCategoriesDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToModule = (
    modId: LearnKoreanModuleId,
    options?: {
      categoryId?: MainCategory13Id;
      subcategoryId?: string | null;
      preset?: LearnKoreanPresetPayload;
    }
  ) => {
    setSiblingMenuOpen(false);
    setAllCategoriesDrawerOpen(false);

    if (options?.preset?.openQuickAiDrawer) {
      setAiDrawerContext('Instant Korean Grammar & Vocabulary Assistant');
      setAiDrawerOpen(true);
      return;
    }

    const matchedCategory =
      (options?.categoryId &&
        LEARN_KOREAN_13_CATEGORIES.find(c => c.id === options.categoryId)) ||
      findCategoryForModule(modId) ||
      null;

    setActiveCategoryId(matchedCategory ? matchedCategory.id : null);
    setActiveSubcategoryId(options?.subcategoryId ?? null);
    setActivePreset(options?.preset || matchedCategory?.defaultPreset || {});
    setPresetNonce(n => n + 1);
    setActiveModule(modId);

    if (modId !== 'dashboard' && modId !== 'admin') {
      updateProgress(prev => ({
        ...prev,
        lastModuleVisited: modId,
      }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCategoryHub = (cat: LearnKoreanMainCategory) => {
    navigateToModule(cat.defaultModuleId, {
      categoryId: cat.id,
      subcategoryId: null,
      preset: cat.defaultPreset,
    });
  };

  const handleOpenSubcategory = (
    cat: LearnKoreanMainCategory,
    sub: LearnKoreanSubcategoryItem
  ) => {
    navigateToModule(sub.moduleId, {
      categoryId: cat.id,
      subcategoryId: sub.id,
      preset: sub.preset,
    });
  };

  const lastVisitedModuleId: LearnKoreanModuleId =
    progress.lastModuleVisited &&
    progress.lastModuleVisited !== 'dashboard' &&
    progress.lastModuleVisited in MODULE_DISPLAY_LABELS
      ? (progress.lastModuleVisited as LearnKoreanModuleId)
      : 'hangul';

  const resumeModuleLabel = MODULE_DISPLAY_LABELS[lastVisitedModuleId] || 'Korean Alphabet (Hangul)';

  const activeCategoryObj =
    (activeCategoryId && LEARN_KOREAN_13_CATEGORIES.find(c => c.id === activeCategoryId)) ||
    findCategoryForModule(activeModule) ||
    null;

  const activeSubcategoryObj =
    activeCategoryObj && activeSubcategoryId
      ? activeCategoryObj.subcategories.find(s => s.id === activeSubcategoryId) || null
      : null;

  const findCat = (id: MainCategory13Id) =>
    LEARN_KOREAN_13_CATEGORIES.find(c => c.id === id);

  const buildCatItem = (
    catId: MainCategory13Id,
    fallbackMod: LearnKoreanModuleId,
    badge?: string
  ): LearningSidebarItem => {
    const cat = findCat(catId);
    const modId = cat?.defaultModuleId || fallbackMod;
    return {
      id: `academy-${catId}`,
      label: cat?.title || MODULE_DISPLAY_LABELS[modId],
      sublabel: cat?.titleKo,
      icon: cat?.icon || Sparkles,
      active: activeCategoryObj ? activeCategoryObj.id === catId : activeModule === modId,
      badgeText: badge,
      onSelect: () => {
        if (cat) {
          handleOpenCategoryHub(cat);
        } else {
          navigateToModule(modId);
        }
      },
    };
  };

  const examsAndLifeItems: LearningSidebarItem[] = [
    buildCatItem('topik_prep', 'topik'),
    buildCatItem('mock_exams', 'topik', examHistory.length > 0 ? `${examHistory.length}` : undefined),
    buildCatItem('daily_korean', 'daily_korean'),
    {
      id: 'academy-everyday_life',
      label: 'Everyday Life in Korea',
      sublabel: '한국 생활 실전',
      icon: Globe,
      active: activeModule === 'everyday_life',
      onSelect: () => navigateToModule('everyday_life'),
    },
  ];

  if (isAdmin) {
    examsAndLifeItems.push({
      id: 'academy-admin',
      label: 'Curriculum Admin',
      sublabel: 'Manage lessons & quizzes',
      icon: Shield,
      active: activeModule === 'admin',
      onSelect: () => navigateToModule('admin'),
    });
  }

  const academySidebarGroups: LearningSidebarGroup[] = [
    {
      id: 'overview',
      title: 'Academy Hub',
      emoji: '🇰🇷',
      defaultOpen: true,
      items: [
        {
          id: 'academy-dashboard',
          label: 'All Categories Hub',
          sublabel: '13 structured study tracks',
          icon: Home,
          active: activeModule === 'dashboard',
          onSelect: goHomeDashboard,
        },
        {
          id: 'academy-progress',
          label: 'My Progress',
          sublabel: `Stage ${currentStage.stageNumber} · ${progress.streakDays || 1}d streak`,
          icon: BarChart3,
          active: activeModule === 'progress',
          badgeText: `${essentialProgressPercent}%`,
          onSelect: () => navigateToModule('progress'),
        },
        buildCatItem('ai_tutor', 'ai_tutor'),
      ],
    },
    {
      id: 'core',
      title: 'Core Foundations',
      defaultOpen: true,
      items: [
        buildCatItem('hangul', 'hangul'),
        buildCatItem('vocabulary', 'vocabulary', vocabLearnedCount > 0 ? `${vocabLearnedCount}` : undefined),
        buildCatItem('grammar', 'grammar'),
        buildCatItem('sentence_builder', 'sentences'),
      ],
    },
    {
      id: 'skills',
      title: 'Communication Skills',
      defaultOpen: true,
      items: [
        buildCatItem('conversation_speaking', 'conversation'),
        buildCatItem('listening', 'listening'),
        buildCatItem('pronunciation', 'speaking'),
        buildCatItem('reading', 'reading'),
        buildCatItem('writing', 'writing'),
      ],
    },
    {
      id: 'exams-life',
      title: 'TOPIK & Korea Life',
      defaultOpen: true,
      items: examsAndLifeItems,
    },
  ];

  return (
    <div className="min-h-screen bg-transparent text-[#061B49] dark:text-white pb-24 selection:bg-[#0754B8] selection:text-white">
      {/* ======================================================================
          TOP PLATFORM HEADER — FROSTED TRANSLUCENT GLASS (DAY & NIGHT)
      ====================================================================== */}
      <header className="sticky top-[68px] z-30 ekr-glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Brand & Home Link */}
            <button
              type="button"
              onClick={goHomeDashboard}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0754B8] to-[#0875E8] border border-white/25 flex items-center justify-center text-white font-black text-base shadow-lg shadow-[#0754B8]/25 group-hover:scale-[1.03] transition-transform">
                한
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#10213D] dark:text-white">
                    Learn Korean
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[#0754B8]/10 dark:bg-[#0875E8]/20 border border-[#0754B8]/25 dark:border-[#0875E8]/35 text-[11px] font-bold text-[#0754B8] dark:text-[#60A5FA]">
                    5.0
                  </span>
                </div>
                <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] hidden sm:block">
                  Structured Korean Language &amp; TOPIK Platform
                </p>
              </div>
            </button>

            {/* Right Controls: Language, Voice Popover, My Progress, AI Tutor */}
            <div className="flex flex-wrap items-center gap-2">
              {activeModule !== 'dashboard' && (
                <button
                  type="button"
                  onClick={() => setAllCategoriesDrawerOpen(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    allCategoriesDrawerOpen
                      ? 'ekr-glass-btn-primary text-white'
                      : 'ekr-glass-subtle text-[#10213D] dark:text-white hover:border-[#0754B8]/40'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                  <span>Categories</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      allCategoriesDrawerOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}

              {/* 9-Language Explanation Selector */}
              <div className="flex items-center gap-1.5 ekr-glass-subtle px-3 py-2 rounded-xl">
                <Globe className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                <select
                  value={uiLang}
                  onChange={e => handleSelectLearningLanguage(e.target.value as AcademyLanguage)}
                  aria-label="Learning Explanation Language"
                  className="bg-transparent text-xs font-bold text-[#10213D] dark:text-white focus:outline-none cursor-pointer"
                >
                  {LEARN_KOREAN_9_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code} className="bg-white dark:bg-[#0B204A] text-[#10213D] dark:text-white">
                      {l.nativeLabel} ({l.label})
                    </option>
                  ))}
                </select>
              </div>

              {/* Compact Native Voice Settings Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setVoiceMenuOpen(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl ekr-glass-subtle hover:border-[#0754B8]/40 text-xs font-bold text-[#10213D] dark:text-white transition-colors cursor-pointer"
                  title="Korean Teacher Voice Preferences"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                  <span className="hidden md:inline">
                    {voicePrefs.voiceGender === 'female' ? 'Seoul Female' : 'Seoul Male'}
                  </span>
                  <Settings2 className="w-3 h-3 text-[#526685] dark:text-[#B8C9E5]" />
                </button>

                {voiceMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl ekr-glass-dropdown p-3.5 space-y-3 z-40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#10213D] dark:text-white">Korean Teacher Voice</span>
                      <button
                        type="button"
                        onClick={() => setVoiceMenuOpen(false)}
                        className="text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#526685] dark:text-[#B8C9E5]">Speaking Pace</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateVoicePrefs({ speakingStyle: 'conversation' })}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                            voicePrefs.speakingStyle === 'conversation'
                              ? 'ekr-glass-btn-primary text-white'
                              : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5]'
                          }`}
                        >
                          Natural Voice
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateVoicePrefs({ speakingStyle: 'learning' })}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                            voicePrefs.speakingStyle === 'learning'
                              ? 'ekr-glass-btn-primary text-white'
                              : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5]'
                          }`}
                        >
                          Clear Learner
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#526685] dark:text-[#B8C9E5]">Teacher Voice</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateVoicePrefs({ voiceGender: 'female' })}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                            voicePrefs.voiceGender === 'female'
                              ? 'ekr-glass-btn-primary text-white'
                              : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5]'
                          }`}
                        >
                          Seoul Female
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateVoicePrefs({ voiceGender: 'male' })}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                            voicePrefs.voiceGender === 'male'
                              ? 'ekr-glass-btn-primary text-white'
                              : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5]'
                          }`}
                        >
                          Seoul Male
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* My Progress Button */}
              <button
                type="button"
                onClick={() => navigateToModule('progress')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeModule === 'progress'
                    ? 'ekr-glass-btn-primary text-white'
                    : 'ekr-glass-subtle text-[#10213D] dark:text-white hover:border-[#0754B8]/40'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                <span className="hidden sm:inline">Progress</span>
              </button>

              {/* Quick AI Tutor Button */}
              <button
                type="button"
                onClick={() => {
                  setAiDrawerContext(
                    activeSubcategoryObj?.label ||
                      activeCategoryObj?.title ||
                      'Learn Korean Study Assistant'
                  );
                  setAiDrawerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl ekr-glass-btn-primary text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Tutor</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigateToModule('admin')}
                  className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    activeModule === 'admin'
                      ? 'ekr-glass-btn-primary text-white'
                      : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
                  }`}
                  title="Academy Admin Management"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* ================================================================
              BREADCRUMB NAVIGATION BAR & QUICK SUBCATEGORY SWITCHER
          ================================================================ */}
          {activeModule !== 'dashboard' && (
            <div className="mt-3 pt-3 border-t border-[#0754B8]/10 dark:border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <nav
                  aria-label="Breadcrumb"
                  className="flex flex-wrap items-center gap-1.5 text-xs font-semibold"
                >
                  <button
                    type="button"
                    onClick={goHomeDashboard}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Home className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                    <span>Learn Korean</span>
                  </button>

                  <ChevronRight className="w-3.5 h-3.5 text-[#526685] dark:text-[#B8C9E5]" />

                  {activeCategoryObj ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setSiblingMenuOpen(prev => !prev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ekr-glass-subtle text-[#0754B8] dark:text-[#60A5FA] hover:text-[#10213D] dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <span>{activeCategoryObj.title}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-150 ${
                            siblingMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {activeSubcategoryObj && (
                        <>
                          <ChevronRight className="w-3.5 h-3.5 text-[#526685] dark:text-[#B8C9E5]" />
                          <span className="px-2.5 py-1 rounded-lg bg-[#0754B8]/12 dark:bg-[#0875E8]/25 border border-[#0754B8]/25 dark:border-[#0875E8]/35 text-[#10213D] dark:text-white font-bold">
                            {activeSubcategoryObj.label}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-[#0754B8]/12 dark:bg-[#0875E8]/25 border border-[#0754B8]/25 dark:border-[#0875E8]/35 text-[#10213D] dark:text-white font-bold">
                      {MODULE_DISPLAY_LABELS[activeModule]}
                    </span>
                  )}
                </nav>

                <button
                  type="button"
                  onClick={goHomeDashboard}
                  className="text-xs font-bold text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white transition-colors cursor-pointer"
                >
                  ← Back to All Categories
                </button>
              </div>

              {/* Expandable Sibling Subcategories Bar for Current Category */}
              {siblingMenuOpen && activeCategoryObj && (
                <div className="p-3.5 rounded-2xl ekr-glass-panel space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA]">
                      {activeCategoryObj.title} ({activeCategoryObj.titleKo}) — Select Topic
                    </span>
                    <button
                      type="button"
                      onClick={() => setSiblingMenuOpen(false)}
                      className="text-xs text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {activeCategoryObj.subcategories.map(sub => {
                      const isCurrent = activeSubcategoryId === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleOpenSubcategory(activeCategoryObj, sub)}
                          className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isCurrent
                              ? 'ekr-glass-btn-primary text-white'
                              : 'ekr-glass-subtle text-[#10213D] dark:text-white hover:border-[#0754B8]/40'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          <ArrowRight className="w-3 h-3 shrink-0 opacity-75" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick All-13-Categories Mega Switcher */}
              {allCategoriesDrawerOpen && (
                <div className="p-4 rounded-2xl ekr-glass-dropdown space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#10213D] dark:text-white">
                      Jump to Any Learning Category
                    </span>
                    <button
                      type="button"
                      onClick={() => setAllCategoriesDrawerOpen(false)}
                      className="text-xs text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {LEARN_KOREAN_13_CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isCurrentCat = activeCategoryObj?.id === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setExpandedCategoryId(cat.id);
                            handleOpenCategoryHub(cat);
                          }}
                          className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                            isCurrentCat
                              ? 'ekr-glass-btn-primary text-white'
                              : 'ekr-glass-subtle text-[#10213D] dark:text-white hover:border-[#0754B8]/40'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                          <span className="text-xs font-bold truncate">{cat.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ======================================================================
          MAIN 2-COLUMN WORKSPACE: LEARNING CANVAS (LEFT) + RIGHT SIDEBAR (RIGHT)
      ====================================================================== */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-7">
        <div className="flex flex-col-reverse lg:flex-row gap-6 lg:gap-7 items-start">
          <div className="w-full lg:flex-1 min-w-0">
        {/* ====================================================================
            CLEAN, WELCOMING HOMEPAGE & 13 EXPANDABLE LEARNING CATEGORIES
        ==================================================================== */}
        {activeModule === 'dashboard' && (
          <div className="space-y-10">
            {/* 1. Essential Welcome, Current Level & Continue Learning Hero */}
            <section className="rounded-3xl ekr-glass-panel p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0754B8]/10 dark:bg-[#0875E8]/20 border border-[#0754B8]/20 dark:border-[#0875E8]/35 text-xs font-bold text-[#0754B8] dark:text-[#60A5FA]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Welcome back, {user.name || 'Learner'}</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#10213D] dark:text-white leading-tight">
                    Master Korean at Your Own Pace
                  </h1>

                  <p className="text-sm sm:text-base text-[#526685] dark:text-[#B8C9E5] max-w-2xl leading-relaxed">
                    Choose a category below to study vocabulary, grammar, conversation, listening, reading, writing, or TOPIK preparation with native audio and instant explanations.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigateToModule(lastVisitedModuleId)}
                      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl ekr-glass-btn-primary text-white text-sm font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Continue Learning: {resumeModuleLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateToModule('progress')}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl ekr-glass-subtle hover:border-[#0754B8]/40 text-[#10213D] dark:text-white text-sm font-bold transition-colors cursor-pointer"
                    >
                      <span>View Learning Progress</span>
                      <ArrowRight className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                    </button>
                  </div>
                </div>

                {/* Essential Level & Progress Card (Minimal, Uncluttered) */}
                <div className="lg:col-span-5 rounded-2xl ekr-glass-subtle p-5 sm:p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                        Current Level
                      </div>
                      <div
                        className="text-base sm:text-lg font-extrabold text-[#10213D] dark:text-white mt-0.5"
                        dir={isRtl ? 'rtl' : 'ltr'}
                      >
                        Stage {currentStage.stageNumber}: {pickMultiLang(uiLang, currentStage.title)}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      {progress.streakDays || 1}d Streak
                    </span>
                  </div>

                  {/* Clean Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#526685] dark:text-[#B8C9E5]">Overall Course Progress</span>
                      <span className="font-bold text-[#0754B8] dark:text-[#60A5FA] tabular-nums">
                        {essentialProgressPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#0754B8]/12 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0754B8] to-[#0875E8] transition-all duration-300"
                        style={{ width: `${essentialProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Minimal 5-Stage Selector */}
                  <div className="pt-1 space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#526685] dark:text-[#B8C9E5]">
                      Learning Stage Focus
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {LEARNING_STAGES_5.map(st => {
                        const selected = currentStage.stageNumber === st.stageNumber;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setActiveStageOrder(st.stageNumber)}
                            title={pickMultiLang(uiLang, st.title)}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              selected
                                ? 'ekr-glass-btn-primary text-white'
                                : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
                            }`}
                          >
                            S{st.stageNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Category Search & 13 Expandable Learning Categories */}
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#10213D] dark:text-white tracking-tight">
                    Learning Categories
                  </h2>
                  <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                    Select any category to explore its specialized lessons, practice drills, and study tools.
                  </p>
                </div>

                {/* Search Within Learning Categories */}
                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    placeholder="Search categories or topics (e.g., Particles, TOPIK II)..."
                    aria-label="Search learning categories and topics"
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl ekr-glass-input text-xs sm:text-sm font-medium focus:outline-none transition-colors"
                  />
                  {categorySearch && (
                    <button
                      type="button"
                      onClick={() => setCategorySearch('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {filteredCategories.length === 0 ? (
                <div className="rounded-2xl ekr-glass-panel p-10 text-center space-y-3">
                  <p className="text-sm font-bold text-[#10213D] dark:text-white">
                    No categories matched &ldquo;{categorySearch}&rdquo;
                  </p>
                  <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                    Try searching for Vocabulary, Flashcards, Particles, Hangul, Pronunciation, or TOPIK.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCategorySearch('')}
                    className="px-4 py-2 rounded-xl ekr-glass-btn-primary text-white text-xs font-bold cursor-pointer"
                  >
                    Show All 13 Categories
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCategories.map(({ category, matchingSubcategories }) => {
                    const Icon = category.icon;
                    const isSearching = categorySearch.trim().length > 0;
                    const isExpanded = isSearching || expandedCategoryId === category.id;

                    return (
                      <div
                        key={category.id}
                        className={`rounded-2xl transition-all duration-200 ${
                          isExpanded && !isSearching
                            ? 'md:col-span-2 xl:col-span-3 ekr-glass-card-active'
                            : 'ekr-glass-card'
                        }`}
                      >
                        {/* Category Card Header (Click to Expand / Collapse) */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isSearching) {
                              handleOpenCategoryHub(category);
                            } else {
                              setExpandedCategoryId(prev =>
                                prev === category.id ? null : category.id
                              );
                            }
                          }}
                          aria-expanded={isExpanded}
                          className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer group"
                        >
                          <div className="flex items-start gap-4 min-w-0">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                                isExpanded
                                  ? 'bg-gradient-to-br from-[#0754B8] to-[#0875E8] text-white shadow-md shadow-[#0754B8]/25'
                                  : 'bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] group-hover:bg-[#0754B8] group-hover:text-white'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base sm:text-lg font-extrabold text-[#10213D] dark:text-white">
                                  {category.title}
                                </h3>
                                <span className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA]">
                                  {category.titleKo}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed line-clamp-2">
                                {category.description}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                              isExpanded
                                ? 'bg-[#0754B8]/15 dark:bg-[#0875E8]/25 text-[#0754B8] dark:text-[#60A5FA] rotate-180'
                                : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5] group-hover:text-[#10213D] dark:group-hover:text-white'
                            }`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </button>

                        {/* Expandable Submenu Panel */}
                        {isExpanded && (
                          <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-[#0754B8]/12 dark:border-white/10 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                                {category.title} Topics
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenCategoryHub(category)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl ekr-glass-btn-primary text-white text-xs font-bold transition-colors cursor-pointer"
                              >
                                <span>Open Full {category.title} Hub</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div
                              className={`grid grid-cols-1 ${
                                isSearching
                                  ? ' gap-2'
                                  : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5'
                              }`}
                            >
                              {matchingSubcategories.map(sub => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => handleOpenSubcategory(category, sub)}
                                  className="group/sub text-left p-3.5 rounded-xl ekr-glass-subtle hover:border-[#0754B8]/45 transition-all duration-150 flex flex-col justify-between gap-2 cursor-pointer"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs sm:text-sm font-bold text-[#10213D] dark:text-white group-hover/sub:text-[#0754B8] dark:group-hover/sub:text-[#60A5FA] transition-colors">
                                        {sub.label}
                                      </span>
                                      <ArrowRight className="w-3.5 h-3.5 text-[#526685] dark:text-[#B8C9E5] group-hover/sub:text-[#0754B8] dark:group-hover/sub:text-[#60A5FA] group-hover/sub:translate-x-0.5 transition-all shrink-0" />
                                    </div>
                                    <div className="text-[11px] font-semibold text-[#0754B8] dark:text-[#60A5FA]">
                                      {sub.labelKo}
                                    </div>
                                    <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] leading-snug line-clamp-2">
                                      {sub.description}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ====================================================================
            ACTIVE LEARNING MODULES (ALL EXISTING CONTENT & LOGIC PRESERVED)
        ==================================================================== */}

        {/* MODULE: KOREAN ALPHABET (HANGUL) */}
        {activeModule === 'hangul' && (
          <HangulFoundationModuleView
            uiLang={uiLang}
            initialSubTab={activePreset.hangulTab}
            presetNonce={presetNonce}
            completedHandwritingIds={progress.completedHandwritingIds || []}
            onCompleteHandwriting={id =>
              updateProgress(prev => ({
                ...prev,
                completedHandwritingIds: prev.completedHandwritingIds?.includes(id)
                  ? prev.completedHandwritingIds
                  : [...(prev.completedHandwritingIds || []), id],
              }))
            }
            onPassHangulQuiz={() => {
              setActiveStageOrder(2);
              updateProgress(prev => ({
                ...prev,
                completedLessons: prev.completedLessons.includes('hangul-stage-1-quiz')
                  ? prev.completedLessons
                  : [...prev.completedLessons, 'hangul-stage-1-quiz'],
              }));
            }}
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: VOCABULARY */}
        {activeModule === 'vocabulary' && (
          <Vocabulary18CategoriesModuleView
            uiLang={uiLang}
            initialCategory={activePreset.vocabCategory}
            initialDifficulty={activePreset.vocabDifficulty}
            initialActivityMode={activePreset.vocabActivityMode}
            initialLexicalFocus={activePreset.vocabLexicalFocus}
            presetNonce={presetNonce}
            bookmarkedIds={progress.bookmarkedVocabIds || []}
            weakIds={progress.weakVocabIds || []}
            masteredIds={progress.masteredVocabIds || []}
            onToggleBookmark={id =>
              updateProgress(prev => {
                const cur = prev.bookmarkedVocabIds || [];
                return {
                  ...prev,
                  bookmarkedVocabIds: cur.includes(id)
                    ? cur.filter(x => x !== id)
                    : [...cur, id],
                };
              })
            }
            onToggleMastered={id =>
              updateProgress(prev => {
                const cur = prev.masteredVocabIds || [];
                return {
                  ...prev,
                  masteredVocabIds: cur.includes(id)
                    ? cur.filter(x => x !== id)
                    : [...cur, id],
                };
              })
            }
            onRecordMistake={id =>
              updateProgress(prev => {
                const cur = prev.weakVocabIds || [];
                return {
                  ...prev,
                  weakVocabIds: cur.includes(id) ? cur : [...cur, id],
                };
              })
            }
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: GRAMMAR */}
        {activeModule === 'grammar' && (
          <Grammar3TierModuleView
            uiLang={uiLang}
            initialTier={activePreset.grammarTier}
            initialCategory13={activePreset.grammarCategory13}
            initialPracticeFocus={activePreset.grammarPracticeFocus}
            presetNonce={presetNonce}
            completedGrammarIds={progress.completedGrammarIds || []}
            onCompleteGrammar={id =>
              updateProgress(prev => ({
                ...prev,
                completedGrammarIds: prev.completedGrammarIds?.includes(id)
                  ? prev.completedGrammarIds
                  : [...(prev.completedGrammarIds || []), id],
              }))
            }
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: SENTENCE BUILDER */}
        {activeModule === 'sentences' && (
          <SentenceBuilder50xModuleView
            uiLang={uiLang}
            initialCategory12={activePreset.sentenceCategory12}
            initialDifficulty={activePreset.sentenceDifficulty}
            initialExerciseMode={activePreset.sentenceExerciseMode}
            presetNonce={presetNonce}
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: CONVERSATION PRACTICE */}
        {activeModule === 'conversation' && (
          <ConversationPractice50xModuleView
            uiLang={uiLang}
            initialDifficulty={activePreset.convDifficulty}
            initialRegister={activePreset.convRegister}
            initialRoleplay={activePreset.convRoleplay}
            presetNonce={presetNonce}
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: LISTENING */}
        {activeModule === 'listening' && (
          <ListeningAndSpeakingModuleView
            mode="listening"
            uiLang={uiLang}
            initialListenCategory={activePreset.listenCategory}
            initialDictationMode={activePreset.dictationMode}
            initialAudioRate={activePreset.audioRate}
            presetNonce={presetNonce}
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: PRONUNCIATION & SPEAKING */}
        {activeModule === 'speaking' && (
          <ListeningAndSpeakingModuleView
            mode="speaking"
            uiLang={uiLang}
            initialSpeakingFocus={activePreset.speakingFocus}
            presetNonce={presetNonce}
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: READING */}
        {activeModule === 'reading' && (
          <ReadingWritingDailyAndLifeView
            mode="reading"
            uiLang={uiLang}
            streakDays={progress.streakDays || 1}
            initialReadingGenre={activePreset.readingGenre}
            initialReadingLevel={activePreset.readingLevel}
            presetNonce={presetNonce}
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: WRITING */}
        {activeModule === 'writing' && (
          <ReadingWritingDailyAndLifeView
            mode="writing"
            uiLang={uiLang}
            streakDays={progress.streakDays || 1}
            initialWritingCat={activePreset.writingCat}
            presetNonce={presetNonce}
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: TOPIK PREPARATION & MOCK EXAMS */}
        {activeModule === 'topik' && (
          <ExaminationSystemTab
            uiLang={uiLang}
            questions={questions}
            userId={user.id}
            userEmail={user.email}
            initialSubjectFilter={activePreset.examSubjectFilter || 'all'}
            initialSetupMode={activePreset.examSetupMode}
            initialAutoLaunchModeId={activePreset.examAutoLaunchModeId}
            presetNonce={presetNonce}
            examHistory={examHistory}
            onNavigateModule={modId => navigateToModule(modId as LearnKoreanModuleId)}
            onExamCompleted={handleExamComplete}
          />
        )}

        {/* MODULE: DAILY KOREAN */}
        {activeModule === 'daily_korean' && (
          <ReadingWritingDailyAndLifeView
            mode="daily_korean"
            uiLang={uiLang}
            streakDays={progress.streakDays || 1}
            initialDailySection={activePreset.dailySection}
            presetNonce={presetNonce}
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: EVERYDAY LIFE IN KOREA */}
        {activeModule === 'everyday_life' && (
          <ReadingWritingDailyAndLifeView
            mode="everyday_life"
            uiLang={uiLang}
            streakDays={progress.streakDays || 1}
            presetNonce={presetNonce}
            onOpenAiTutor={ctx => {
              setAiDrawerContext(ctx);
              setAiDrawerOpen(true);
            }}
          />
        )}

        {/* MODULE: AI KOREAN TUTOR (FULL WORKSPACE) */}
        {activeModule === 'ai_tutor' && (
          <AiKoreanTutorTab
            uiLang={uiLang}
            initialMode={activePreset.aiTutorMode}
            initialScenarioTitle={activePreset.aiScenarioTitle}
            initialWritingGoal={activePreset.aiWritingGoal}
            presetNonce={presetNonce}
          />
        )}

        {/* MODULE: MY PROGRESS & ADAPTIVE STUDY PLAN */}
        {activeModule === 'progress' && (
          <div className="space-y-6">
            <div className="ekr-glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-[#10213D] dark:text-white">
                    My Learning Progress &amp; Study Plan
                  </h3>
                  <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                    Automatically synced with your EveryKR account across devices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigateToModule('topik', {
                      categoryId: 'mock_exams',
                      preset: { examSetupMode: 'modes_11', examAutoLaunchModeId: 'quick_test' },
                    })
                  }
                  className="px-4 py-2.5 rounded-xl ekr-glass-btn-primary text-white text-xs font-bold cursor-pointer"
                >
                  Take Diagnostic Check →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="p-4 rounded-2xl ekr-glass-subtle">
                  <div className="text-xs text-[#526685] dark:text-[#B8C9E5]">Lessons Completed</div>
                  <div className="text-2xl font-black text-[#10213D] dark:text-white mt-1 tabular-nums">
                    {lessonsCompletedCount}
                  </div>
                </div>
                <div className="p-4 rounded-2xl ekr-glass-subtle">
                  <div className="text-xs text-[#526685] dark:text-[#B8C9E5]">Words Learned</div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    {vocabLearnedCount}
                  </div>
                </div>
                <div className="p-4 rounded-2xl ekr-glass-subtle">
                  <div className="text-xs text-[#526685] dark:text-[#B8C9E5]">Saved Words</div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                    {progress.bookmarkedVocabIds?.length || 0}
                  </div>
                </div>
                <div className="p-4 rounded-2xl ekr-glass-subtle">
                  <div className="text-xs text-[#526685] dark:text-[#B8C9E5]">Mock Exams</div>
                  <div className="text-2xl font-black text-[#0754B8] dark:text-[#60A5FA] mt-1 tabular-nums">
                    {examHistory.length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl ekr-glass-subtle">
                  <div className="text-xs text-[#526685] dark:text-[#B8C9E5]">Accuracy</div>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 tabular-nums">
                    {adaptiveInsights.accuracyRatePercent}%
                  </div>
                </div>
                <div className="p-4 rounded-2xl ekr-glass-subtle">
                  <div className="text-xs text-[#526685] dark:text-[#B8C9E5]">TOPIK Readiness</div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
                    {adaptiveInsights.examReadinessPercent}%
                  </div>
                </div>
              </div>

              {/* Adaptive Recommendations */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-[#10213D] dark:text-white">Recommended Next Steps</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {adaptiveInsights.recommendations.map(rec => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-2xl ekr-glass-subtle flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                          <span className="text-sm font-bold text-[#10213D] dark:text-white truncate">
                            {pickMultiLang(uiLang, rec.title)}
                          </span>
                        </div>
                        <div className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1">
                          {pickMultiLang(uiLang, rec.reason)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToModule(rec.targetModule as LearnKoreanModuleId)}
                        className="px-3.5 py-2 rounded-xl ekr-glass-btn-primary text-white text-xs font-bold shrink-0 cursor-pointer"
                      >
                        {pickMultiLang(uiLang, rec.actionLabel)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Exam Results */}
              {examHistory.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[#0754B8]/10 dark:border-white/10">
                  <h4 className="text-sm font-bold text-[#10213D] dark:text-white pt-2">Recent Mock Exam Results</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {examHistory.slice(0, 6).map(ex => (
                      <div
                        key={ex.id}
                        className="p-3.5 rounded-2xl ekr-glass-subtle flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#10213D] dark:text-white truncate">
                            {ex.subject}
                          </div>
                          <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5] tabular-nums mt-0.5">
                            {ex.correctCount}/{ex.totalQuestions} Correct •{' '}
                            {new Date(ex.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-base font-black text-[#0754B8] dark:text-[#60A5FA] tabular-nums shrink-0">
                          {ex.scorePercent}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADMIN CONTENT MANAGEMENT */}
        {activeModule === 'admin' && isAdmin && <AdminKoreanAcademyTab />}
          </div>

          {/* RIGHT: Student-Friendly Right-Side Learning Navigation Sidebar */}
          <LearningRightSidebar
            title="Korean Academy"
            subtitle="Structured TOPIK & fluency roadmap"
            progressPercent={essentialProgressPercent}
            progressLabel="Course Mastery"
            progressMeta={`${essentialProgressPercent}%`}
            groups={academySidebarGroups}
            activeSectionLabel={
              activeSubcategoryObj?.label ||
              activeCategoryObj?.title ||
              MODULE_DISPLAY_LABELS[activeModule]
            }
            footerSlot={
              <button
                type="button"
                onClick={() => {
                  setAiDrawerContext(
                    activeSubcategoryObj?.label ||
                      activeCategoryObj?.title ||
                      'Learn Korean Study Assistant'
                  );
                  setAiDrawerOpen(true);
                }}
                className="w-full ekr-glass-btn-primary inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-[#FFB800]" />
                <span>Ask AI Korean Tutor</span>
              </button>
            }
          />
        </div>
      </main>

      {/* Contextual Ask AI Tutor Drawer */}
      <AskAiTutorDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        uiLang={uiLang}
        contextTitle={aiDrawerContext}
      />
    </div>
  );
};
