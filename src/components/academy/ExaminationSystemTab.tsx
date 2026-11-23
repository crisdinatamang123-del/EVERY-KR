import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Headphones,
  Layers,
  Play,
  RotateCcw,
  Shuffle,
  Target,
  Volume2,
  XCircle,
} from 'lucide-react';
import {
  AcademyExamQuestion,
  AcademyLanguage,
  ExamDifficulty,
} from '../../data/koreanAcademyData';
import { getQuizSets20x } from '../../data/korean20x/practiceActivities20x';
import { QuizSet20x } from '../../data/korean20x/levelsAndCategories';
import {
  ExamResultSubmission,
  playKoreanAudio,
} from '../../services/koreanAcademyService';
import {
  computeExamResultAnalytics,
  DetailedExamAnalyticsReport,
  EXAM_MODES_11,
  ExamMode11Id,
  ExamQuestionType10,
  generateBalancedAnswerPositions,
  generateRandomizedExamAttempt,
  getKorean50xQuestionBank,
  loadUserQuestionExposureHistoryLocal,
  recordUserQuestionExposure,
  shuffleQuestionOptionsToTargetPosition,
  StructuredExamQuestion50x,
  syncUserQuestionExposureHistoryFromFirestore,
  UserQuestionExposureHistory,
} from '../../services/koreanExamEngine';
import { isLearnKoreanRtl, pickMultiLang } from '../../data/korean50x/korean50xContentEngine';
import { pickTriLingual } from '../../utils/hangulPhonetics';

interface ExaminationSystemTabProps {
  uiLang: AcademyLanguage | string;
  questions: AcademyExamQuestion[];
  userId: string;
  userEmail?: string;
  initialSubjectFilter?: string;
  initialSetupMode?: 'modes_11' | 'custom' | 'quiz_sets' | 'history';
  initialAutoLaunchModeId?: ExamMode11Id;
  presetNonce?: number;
  examHistory?: ExamResultSubmission[];
  onNavigateModule?: (moduleId: string) => void;
  onExamCompleted: (
    submission: ExamResultSubmission,
    perQuestionOutcomes: { subject: string; isCorrect: boolean; questionId?: string }[]
  ) => void;
}

interface SavedActiveExamDraft {
  title: string;
  modeId: ExamMode11Id;
  subject: string;
  difficulty: string;
  questions: StructuredExamQuestion50x[];
  currentQIndex: number;
  selectedAnswers: Record<string, number>;
  flaggedIds: string[];
  remainingSeconds: number;
  startedAtMs: number;
}

const SETS_PER_PAGE = 12;
const AUTOSAVE_PREFIX = 'everykr_active_exam_autosave_v5_';

export const ExaminationSystemTab: React.FC<ExaminationSystemTabProps> = ({
  uiLang,
  questions,
  userId,
  userEmail,
  initialSubjectFilter,
  initialSetupMode,
  initialAutoLaunchModeId,
  presetNonce,
  examHistory = [],
  onNavigateModule,
  onExamCompleted,
}) => {
  const quizSets = useMemo(() => getQuizSets20x(), []);
  const fullBank50x = useMemo(() => getKorean50xQuestionBank(), []);
  const isRtl = isLearnKoreanRtl(uiLang);

  const [setupMode, setSetupMode] = useState<'modes_11' | 'custom' | 'quiz_sets' | 'history'>(
    initialSetupMode || 'modes_11'
  );
  const [setCategoryFilter, setSetCategoryFilter] = useState<string>('all');
  const [setPage, setSetPage] = useState<number>(1);

  const [selectedModeId, setSelectedModeId] = useState<ExamMode11Id>(
    initialAutoLaunchModeId || 'standard_test'
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectFilter || 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedQuestionType, setSelectedQuestionType] = useState<ExamQuestionType10 | 'all'>('all');
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(25);

  const [exposureHistory, setExposureHistory] = useState<UserQuestionExposureHistory>(() =>
    loadUserQuestionExposureHistoryLocal(userId)
  );
  const [savedDraft, setSavedDraft] = useState<SavedActiveExamDraft | null>(null);

  const [examStage, setExamStage] = useState<'setup' | 'instructions' | 'active' | 'results'>('setup');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [activeExamTitle, setActiveExamTitle] = useState<string>('');
  const [activeQuestions, setActiveQuestions] = useState<StructuredExamQuestion50x[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1500);
  const [startedAtMs, setStartedAtMs] = useState<number>(0);
  const [lastAnalytics, setLastAnalytics] = useState<DetailedExamAnalyticsReport | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'flagged'>('all');

  useEffect(() => {
    if (initialSubjectFilter) {
      setSelectedSubject(initialSubjectFilter);
    }
  }, [initialSubjectFilter]);

  // Sync user's question exposure history from Firestore and check for auto-saved exam draft
  useEffect(() => {
    let mounted = true;
    syncUserQuestionExposureHistoryFromFirestore(userId).then(hist => {
      if (mounted) setExposureHistory(hist);
    });
    try {
      const rawDraft = localStorage.getItem(`${AUTOSAVE_PREFIX}${userId || 'guest'}`);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as SavedActiveExamDraft;
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          setSavedDraft(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Auto-save active exam progress whenever answers, flags, or question index change
  useEffect(() => {
    if (examStage !== 'active' || activeQuestions.length === 0) return;
    try {
      const draft: SavedActiveExamDraft = {
        title: activeExamTitle,
        modeId: selectedModeId,
        subject: selectedSubject,
        difficulty: selectedDifficulty,
        questions: activeQuestions,
        currentQIndex,
        selectedAnswers,
        flaggedIds: flaggedQuestionIds,
        remainingSeconds,
        startedAtMs,
      };
      localStorage.setItem(`${AUTOSAVE_PREFIX}${userId || 'guest'}`, JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
  }, [
    examStage,
    activeExamTitle,
    selectedModeId,
    selectedSubject,
    selectedDifficulty,
    activeQuestions,
    currentQIndex,
    selectedAnswers,
    flaggedQuestionIds,
    remainingSeconds,
    startedAtMs,
    userId,
  ]);

  // Countdown Timer
  useEffect(() => {
    if (examStage !== 'active') return;
    const timer = window.setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          window.clearInterval(timer);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [examStage, activeQuestions, selectedAnswers]);

  const subjectOptions: { id: string; labelEn: string; labelBn: string; labelNe: string }[] = [
    { id: 'all', labelEn: 'All Subjects (Comprehensive Balanced)', labelBn: 'সকল বিষয় (পূর্ণাঙ্গ পরীক্ষা)', labelNe: 'सबै विषय (पूर्ण परीक्षा)' },
    { id: 'hangul', labelEn: 'Hangul & Pronunciation Rules', labelBn: 'হানগুল ও উচ্চারণ নিয়ম', labelNe: 'हंगुल र उच्चारण नियम' },
    { id: 'daily_korean', labelEn: 'Daily Korean, Vocabulary & Grammar', labelBn: 'দৈনন্দিন কোরিয়ান, শব্দভাণ্ডার ও ব্যাকরণ', labelNe: 'दैनिक कोरियन, शब्दावली र व्याकरण' },
    { id: 'university', labelEn: 'University & Campus Life', labelBn: 'বিশ্ববিদ্যালয় ও ক্যাম্পাস জীবন', labelNe: 'विश्वविद्यालय र क्याम्पस जीवन' },
    { id: 'workplace', labelEn: 'Workplace & Business Korean', labelBn: 'কর্মক্ষেত্র ও বিজনেস কোরিয়ান', labelNe: 'कार्यस्थल र व्यावसायिक कोरियन' },
    { id: 'hospital_emergency', labelEn: 'Hospital, Healthcare & Emergency', labelBn: 'হাসপাতাল ও জরুরি স্বাস্থ্যসেবা', labelNe: 'अस्पताल र स्वास्थ्य সেবা' },
    { id: 'immigration_transport', labelEn: 'Immigration, Visa & Transportation', labelBn: 'ইমিগ্রেশন, ভিসা ও পরিবহন', labelNe: 'अध्यागमन, भिसा र यातायात' },
    { id: 'listening', labelEn: 'Listening Comprehension (듣기)', labelBn: 'লিসেনিং বা শ্রবণ পরীক্ষা (듣기)', labelNe: 'सुनाइ परीक्षा (듣기)' },
    { id: 'reading', labelEn: 'Reading Comprehension (읽기)', labelBn: 'রিডিং বা পঠন পরীক্ষা (읽기)', labelNe: 'पढाइ परीक्षा (읽기)' },
  ];

  const difficultyOptions: { id: string; labelEn: string; labelBn: string; labelNe: string }[] = [
    { id: 'all', labelEn: 'All Difficulty Levels (Balanced)', labelBn: 'সকল লেভেল (ভারসাম্যপূর্ণ)', labelNe: 'सबै तहहरू (सन्तुलित)' },
    { id: 'Beginner', labelEn: 'Beginner (TOPIK I - Level 1–2)', labelBn: 'বিগিনার (TOPIK I - লেভেল ১–২)', labelNe: 'प्रारम्भिक (TOPIK I - तह १–२)' },
    { id: 'Intermediate', labelEn: 'Intermediate (TOPIK II - Level 3–4)', labelBn: 'ইন্টারমিডিয়েট (TOPIK II ৩–৪)', labelNe: 'मध्यम (TOPIK II ३–४)' },
    { id: 'Advanced', labelEn: 'Advanced (TOPIK II - Level 5–6)', labelBn: 'অ্যাডভান্সড (TOPIK II ৫–৬)', labelNe: 'उच्च (TOPIK II ५–६)' },
  ];

  const questionTypeOptions: { id: ExamQuestionType10 | 'all'; label: string }[] = [
    { id: 'all', label: 'All 10 Question Types (Balanced)' },
    { id: 'vocabulary', label: '1. Vocabulary Questions' },
    { id: 'grammar', label: '2. Grammar Questions' },
    { id: 'sentence_completion', label: '3. Sentence Completion' },
    { id: 'reading_comprehension', label: '4. Reading Comprehension' },
    { id: 'listening_comprehension', label: '5. Listening Comprehension' },
    { id: 'word_ordering', label: '6. Word Ordering (SOV)' },
    { id: 'correct_sentence_selection', label: '7. Correct Sentence Selection' },
    { id: 'translation', label: '8. Translation' },
    { id: 'contextual_usage', label: '9. Contextual Usage' },
    { id: 'topik_style', label: '10. TOPIK-Style Simulation' },
  ];

  const filteredQuizSets = useMemo(() => {
    if (setCategoryFilter === 'all') return quizSets;
    return quizSets.filter(s => s.category === setCategoryFilter);
  }, [quizSets, setCategoryFilter]);

  const totalSetPages = Math.max(1, Math.ceil(filteredQuizSets.length / SETS_PER_PAGE));
  const safeSetPage = Math.min(setPage, totalSetPages);
  const pagedSets = useMemo(() => {
    const start = (safeSetPage - 1) * SETS_PER_PAGE;
    return filteredQuizSets.slice(start, start + SETS_PER_PAGE);
  }, [filteredQuizSets, safeSetPage]);

  const launchExamMode = (
    modeId: ExamMode11Id,
    overrideCount?: number,
    overrideMins?: number,
    overrideDiff?: ExamDifficulty,
    overrideTitle?: string
  ) => {
    const modeSpec = EXAM_MODES_11.find(m => m.id === modeId) || EXAM_MODES_11[1];
    const cnt = overrideCount || (modeId === 'custom_exam' ? questionCount : modeSpec.questionCount);
    const mins = overrideMins || (modeId === 'custom_exam' ? timeLimitMinutes : modeSpec.durationMinutes);
    const diff = overrideDiff || (modeId === 'custom_exam' ? selectedDifficulty : modeSpec.defaultDifficulty);

    const generatedQuestions = generateRandomizedExamAttempt({
      userId,
      modeId,
      questionCount: cnt,
      subjectFilter: modeId === 'custom_exam' ? selectedSubject : 'all',
      difficultyFilter: diff,
      questionTypeFilter: modeId === 'custom_exam' ? selectedQuestionType : 'all',
      exposureHistory,
    });

    setSelectedModeId(modeId);
    setActiveExamTitle(overrideTitle || pickMultiLang(uiLang, modeSpec.title));
    setActiveQuestions(generatedQuestions);
    setCurrentQIndex(0);
    setSelectedAnswers({});
    setFlaggedQuestionIds([]);
    setRemainingSeconds(mins * 60);
    setShowSubmitConfirm(false);
    setExamStage('instructions');
  };

  useEffect(() => {
    if (initialSetupMode) {
      setSetupMode(initialSetupMode);
    }
    if (initialAutoLaunchModeId) {
      launchExamMode(initialAutoLaunchModeId);
    } else if (initialSetupMode) {
      setExamStage('setup');
    }
  }, [presetNonce, initialSetupMode, initialAutoLaunchModeId]);

  const startQuizSet = (setObj: QuizSet20x) => {
    const byId = new Map(questions.map(q => [q.id, q]));
    fullBank50x.forEach(q => {
      if (!byId.has(q.id)) byId.set(q.id, q);
    });
    const matched = setObj.questionIds
      .map(id => byId.get(id))
      .filter(Boolean) as AcademyExamQuestion[];
    const baseChosen = matched.length > 0 ? matched : fullBank50x.slice(0, 10);

    // Shuffle options to balanced A/B/C/D positions and shuffle question order so sets never have A,A,A,A
    const targetPositions = generateBalancedAnswerPositions(baseChosen.length);
    const randomizedSetQuestions: StructuredExamQuestion50x[] = baseChosen.map((q, idx) => {
      const shuffled = shuffleQuestionOptionsToTargetPosition(q, targetPositions[idx]);
      return {
        ...shuffled,
        questionType10:
          (q as StructuredExamQuestion50x).questionType10 ||
          (q.type === 'listening'
            ? 'listening_comprehension'
            : q.type === 'reading'
              ? 'reading_comprehension'
              : q.type === 'vocabulary'
                ? 'vocabulary'
                : 'grammar'),
        topicTag: setObj.category,
        learningObjective: `Master ${setObj.category} (${setObj.level})`,
        correctAnswerText: shuffled.options[shuffled.correctIndex],
        verifiedPracticeLabel: 'EveryKR Verified Practice Question',
      };
    });

    setActiveExamTitle(pickTriLingual(uiLang as any, { en: setObj.titleEn, bn: setObj.titleBn, ne: setObj.titleNe }));
    setSelectedSubject(setObj.category);
    setSelectedDifficulty(setObj.level);
    setActiveQuestions(randomizedSetQuestions);
    setCurrentQIndex(0);
    setSelectedAnswers({});
    setFlaggedQuestionIds([]);
    setRemainingSeconds(setObj.durationMinutes * 60);
    setShowSubmitConfirm(false);
    setExamStage('instructions');
  };

  const resumeSavedExamDraft = () => {
    if (!savedDraft) return;
    setActiveExamTitle(savedDraft.title);
    setSelectedModeId(savedDraft.modeId);
    setSelectedSubject(savedDraft.subject);
    setSelectedDifficulty(savedDraft.difficulty);
    setActiveQuestions(savedDraft.questions);
    setCurrentQIndex(savedDraft.currentQIndex || 0);
    setSelectedAnswers(savedDraft.selectedAnswers || {});
    setFlaggedQuestionIds(savedDraft.flaggedIds || []);
    setRemainingSeconds(Math.max(60, savedDraft.remainingSeconds || 600));
    setStartedAtMs(savedDraft.startedAtMs || Date.now());
    setExamStage('active');
  };

  const discardSavedExamDraft = () => {
    setSavedDraft(null);
    try {
      localStorage.removeItem(`${AUTOSAVE_PREFIX}${userId || 'guest'}`);
    } catch {
      // ignore
    }
  };

  const beginTimedExamNow = () => {
    setStartedAtMs(Date.now());
    setExamStage('active');
  };

  const toggleFlagQuestion = (qId: string) => {
    setFlaggedQuestionIds(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleFinishExam = () => {
    setShowSubmitConfirm(false);
    if (examStage === 'results') return;
    const elapsedSeconds = Math.max(5, Math.round((Date.now() - startedAtMs) / 1000));

    const analytics = computeExamResultAnalytics(
      activeQuestions,
      selectedAnswers,
      elapsedSeconds
    );
    setLastAnalytics(analytics);

    const outcomes: { subject: string; isCorrect: boolean; questionId?: string }[] = [];
    const exposureUpdates: { questionId: string; isCorrect: boolean }[] = [];

    activeQuestions.forEach(q => {
      const userChoice = selectedAnswers[q.id];
      const isCorrect = userChoice === q.correctIndex;
      outcomes.push({ subject: q.subject, isCorrect, questionId: q.id });
      exposureUpdates.push({ questionId: q.id, isCorrect });
    });

    // Record question exposure history so future attempts prioritize unseen questions
    recordUserQuestionExposure(userId, exposureUpdates).then(updatedHist => {
      setExposureHistory(updatedHist);
    });

    // Clear auto-saved in-progress draft
    discardSavedExamDraft();

    const submission: ExamResultSubmission = {
      id: `exam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: userId || 'guest',
      userEmail: userEmail || '',
      subject: activeExamTitle || selectedSubject,
      difficulty: selectedDifficulty,
      totalQuestions: analytics.totalQuestions,
      correctCount: analytics.correctCount,
      incorrectCount: analytics.incorrectCount + analytics.unansweredCount,
      scorePercent: analytics.scorePercent,
      durationSeconds: elapsedSeconds,
      weakSubjects: analytics.weakAreas,
      completedAt: new Date().toISOString(),
    };

    setExamStage('results');
    onExamCompleted(submission, outcomes);
  };

  const formatTimer = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const seenQuestionsCount = Object.keys(exposureHistory.entries || {}).length;

  // ==========================================================================
  // STAGE 1: EXAM SETUP & 11 MODES SELECTOR
  // ==========================================================================
  if (examStage === 'setup') {
    return (
      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Resume Auto-Saved Exam Banner */}
        {savedDraft && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-black uppercase text-amber-700 dark:text-amber-300">
                Auto-Saved Examination Found
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {savedDraft.title} • {Object.keys(savedDraft.selectedAnswers).length}/{savedDraft.questions.length} Answered • {formatTimer(savedDraft.remainingSeconds)} left
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resumeSavedExamDraft}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer"
              >
                Resume Exam
              </button>
              <button
                type="button"
                onClick={discardSavedExamDraft}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>TOPIK Preparation &amp; Mock Exams</span>
                {seenQuestionsCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{seenQuestionsCount} Questions Practiced</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {pickMultiLang(uiLang, {
                  en: 'Korean Proficiency & TOPIK I / II Examination Center',
                  bn: 'কোরিয়ান দক্ষতা এবং TOPIK I / II পরীক্ষা কেন্দ্র',
                  ne: 'कोरियन दक्षता तथा TOPIK I / II परीक्षा केन्द्र',
                })}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pickMultiLang(uiLang, {
                  en: 'Every attempt generates a fresh randomized exam with unseen-question priority and balanced answer choices.',
                  bn: 'প্রতিটি পরীক্ষায় নতুন প্রশ্নের অগ্রাধিকার এবং সুষম A/B/C/D অপশন শাফলিং ব্যবহৃত হয়।',
                  ne: 'हरेक प्रयासमा नदेखिएका प्रश्नहरूलाई प्राथमिकता र सन्तुलित A/B/C/D विकल्प प्रयोग गरिन्छ।',
                })}
              </p>
            </div>

            <div className="inline-flex flex-wrap p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1">
              {[
                { id: 'modes_11', label: 'Mock Exams' },
                { id: 'custom', label: 'Custom Builder' },
                { id: 'quiz_sets', label: 'Previous Question Sets' },
                { id: 'history', label: `Exam Results (${examHistory.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSetupMode(tab.id as typeof setupMode)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                    setupMode === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: ALL 11 EXAM MODES */}
          {setupMode === 'modes_11' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {EXAM_MODES_11.map(m => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                        <span>{m.questionCount} Questions</span>
                        <span>·</span>
                        <span>{m.durationMinutes} Minutes</span>
                        <span>·</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {m.defaultDifficulty === 'all' ? 'All Levels' : m.defaultDifficulty}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {pickMultiLang(uiLang, m.title)}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {pickMultiLang(uiLang, m.subtitle)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (m.id === 'custom_exam') {
                          setSetupMode('custom');
                        } else {
                          launchExamMode(m.id);
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {m.id === 'custom_exam' ? 'Configure Custom Exam' : 'Generate Fresh Attempt'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM EXAM BUILDER */}
          {setupMode === 'custom' && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    1. Select Subject / Topic
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm"
                  >
                    {subjectOptions.map(s => (
                      <option key={s.id} value={s.id}>
                        {pickTriLingual(uiLang as any, { en: s.labelEn, bn: s.labelBn, ne: s.labelNe })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    2. Select Difficulty
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={e => setSelectedDifficulty(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm"
                  >
                    {difficultyOptions.map(d => (
                      <option key={d.id} value={d.id}>
                        {pickTriLingual(uiLang as any, { en: d.labelEn, bn: d.labelBn, ne: d.labelNe })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    3. Question Type Focus
                  </label>
                  <select
                    value={selectedQuestionType}
                    onChange={e => setSelectedQuestionType(e.target.value as ExamQuestionType10 | 'all')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm"
                  >
                    {questionTypeOptions.map(qt => (
                      <option key={qt.id} value={qt.id}>
                        {qt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    4. Number of Questions
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 40, 60].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`py-2.5 rounded-xl font-bold text-sm border transition-all tabular-nums cursor-pointer ${
                          questionCount === cnt
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    5. Exam Duration (Minutes)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 25, 50, 75].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setTimeLimitMinutes(mins)}
                        className={`py-2.5 rounded-xl font-bold text-sm border transition-all tabular-nums cursor-pointer ${
                          timeLimitMinutes === mins
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  launchExamMode(
                    'custom_exam',
                    questionCount,
                    timeLimitMinutes,
                    selectedDifficulty === 'all' ? undefined : (selectedDifficulty as ExamDifficulty),
                    `Custom Exam (${questionCount} Questions)`
                  )
                }
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Shuffle className="w-5 h-5" />
                Generate Randomized Custom Examination ({questionCount} Questions)
              </button>
            </div>
          )}

          {/* TAB 3: 210 STRUCTURED QUIZ SETS */}
          {setupMode === 'quiz_sets' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  'all',
                  'Vocabulary',
                  'Grammar',
                  'Listening',
                  'Reading',
                  'Scenario',
                  'TOPIK I Mock',
                  'TOPIK II Mock',
                ].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSetCategoryFilter(cat);
                      setSetPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                      setCategoryFilter === cat
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cat === 'all' ? `All Sets (${quizSets.length})` : cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedSets.map(setObj => (
                  <div
                    key={setObj.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
                        <span>{setObj.category}</span>
                        <span>{setObj.durationMinutes} mins • {setObj.questionIds.length} Qs</span>
                      </div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white mt-1">
                        {pickTriLingual(uiLang as any, {
                          en: setObj.titleEn,
                          bn: setObj.titleBn,
                          ne: setObj.titleNe,
                        })}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => startQuizSet(setObj)}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Test Set
                    </button>
                  </div>
                ))}
              </div>

              {totalSetPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={safeSetPage <= 1}
                    onClick={() => setSetPage(p => Math.max(1, p - 1))}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-slate-500 tabular-nums">
                    Page {safeSetPage} of {totalSetPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeSetPage >= totalSetPages}
                    onClick={() => setSetPage(p => Math.min(totalSetPages, p + 1))}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXAM HISTORY */}
          {setupMode === 'history' && (
            <div className="space-y-4">
              {examHistory.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No completed exams yet. Choose any of the 11 Exam Modes above to start your first randomized evaluation.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {examHistory.map(item => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {item.subject}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {new Date(item.completedAt).toLocaleDateString()} · {item.correctCount}/{item.totalQuestions} Correct · {formatTimer(item.durationSeconds)}
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div
                          className={`text-xl font-black ${
                            item.scorePercent >= 80
                              ? 'text-emerald-600'
                              : item.scorePercent >= 60
                                ? 'text-blue-600'
                                : 'text-amber-600'
                          }`}
                        >
                          {item.scorePercent}%
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold">
                          {item.scorePercent >= 60 ? 'PASSED' : 'REVIEW'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 2: PRE-EXAM INSTRUCTIONS
  // ==========================================================================
  if (examStage === 'instructions') {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 max-w-3xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
            Randomized Exam Ready · Zero Duplicate Questions · Balanced A/B/C/D Choices
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {activeExamTitle}
          </h2>
          <p className="text-xs text-slate-500">
            Your question set has been freshly generated using Fisher-Yates randomization prioritizing questions you have not seen recently.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center tabular-nums">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500">Questions</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {activeQuestions.length}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500">Time Limit</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {Math.round(remainingSeconds / 60)} mins
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500">Pass Target</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">60%</div>
          </div>
        </div>

        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc pl-5">
          <li>Answers are not revealed until you submit the exam.</li>
          <li>You can mark any question for review and jump between questions freely using the Question Palette.</li>
          <li>Your answers are automatically saved locally while the exam is in progress.</li>
        </ul>

        <div className="flex items-center justify-between gap-4 pt-3">
          <button
            type="button"
            onClick={() => setExamStage('setup')}
            className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Back to Exam Modes
          </button>
          <button
            type="button"
            onClick={beginTimedExamNow}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black inline-flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Timed Exam Now
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 3: ACTIVE REAL EXAM EXPERIENCE (TIMER, PALETTE, MARK FOR REVIEW)
  // ==========================================================================
  if (examStage === 'active') {
    const currentQ = activeQuestions[currentQIndex] || activeQuestions[0];
    const answeredCount = Object.keys(selectedAnswers).length;
    const unansweredCount = activeQuestions.length - answeredCount;
    const isFlagged = currentQ ? flaggedQuestionIds.includes(currentQ.id) : false;
    const progressPct = Math.round(((currentQIndex + 1) / Math.max(1, activeQuestions.length)) * 100);

    return (
      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Top Exam Status Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-500">
              {activeExamTitle} · Question {currentQIndex + 1} of {activeQuestions.length}
            </div>
            <div className="w-48 sm:w-64 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
              Answered: {answeredCount}/{activeQuestions.length} · Flagged: {flaggedQuestionIds.length}
            </div>

            <div
              className={`px-3.5 py-2 rounded-xl font-mono text-sm font-black inline-flex items-center gap-1.5 tabular-nums ${
                remainingSeconds <= 120
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              {formatTimer(remainingSeconds)}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
            >
              Submit Exam
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Question Card */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            {currentQ && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                    <span>Question #{currentQIndex + 1}</span>
                    <span>·</span>
                    <span>{currentQ.difficulty}</span>
                    <span>·</span>
                    <span>{currentQ.questionType10.replace(/_/g, ' ')}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFlagQuestion(currentQ.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border cursor-pointer ${
                      isFlagged
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {isFlagged ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>

                {/* Listening Audio Stimulus */}
                {currentQ.audioScriptKo && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      Listening Stimulus (듣기 음원) — Click to listen at Natural or Slow Learning speed
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => playKoreanAudio(currentQ.audioScriptKo!, currentQ.audioUrl, 0.94)}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                        Play Audio (1.0x)
                      </button>
                      <button
                        type="button"
                        onClick={() => playKoreanAudio(currentQ.audioScriptKo!, currentQ.audioUrl, 0.72)}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer"
                      >
                        Slow (0.75x)
                      </button>
                    </div>
                  </div>
                )}

                {/* Reading Passage Stimulus */}
                {currentQ.readingPassageKo && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Reading Passage (읽기 지문)</span>
                      <button
                        type="button"
                        onClick={() => playKoreanAudio(currentQ.readingPassageKo!)}
                        className="p-2 rounded-lg bg-blue-600 text-white cursor-pointer"
                        title="Listen to Korean passage"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                      {currentQ.readingPassageKo}
                    </p>
                  </div>
                )}

                {/* Korean Word / Sentence Stimulus */}
                {currentQ.koreanStimulus && !currentQ.readingPassageKo && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {currentQ.koreanStimulus}
                    </div>
                    <button
                      type="button"
                      onClick={() => playKoreanAudio(currentQ.koreanStimulus!)}
                      className="p-2.5 rounded-xl bg-blue-600 text-white cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Question Prompt */}
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                  {pickTriLingual(uiLang as any, {
                    en: currentQ.promptEn,
                    bn: currentQ.promptBn,
                    ne: currentQ.promptNe || currentQ.promptEn,
                  })}
                </h3>

                {/* 4 Shuffled Answer Choices (A, B, C, D) — Never reveals correctness during active exam */}
                <div className="grid grid-cols-1 gap-3">
                  {currentQ.options.map((opt, oIdx) => {
                    const letter = ['A', 'B', 'C', 'D'][oIdx] || String(oIdx + 1);
                    const isPicked = selectedAnswers[currentQ.id] === oIdx;
                    return (
                      <button
                        key={`${currentQ.id}-opt-${oIdx}`}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: oIdx }))
                        }
                        className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                          isPicked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-blue-400'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                            isPicked
                              ? 'bg-white text-blue-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="text-sm font-bold leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Previous / Next Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={currentQIndex <= 0}
                    onClick={() => setCurrentQIndex(i => Math.max(0, i - 1))}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  {currentQIndex < activeQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentQIndex(i => Math.min(activeQuestions.length - 1, i + 1))
                      }
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      Next Question
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSubmitConfirm(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      Review & Submit Exam
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Question Navigation Palette */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 h-fit">
            <div className="text-xs font-black uppercase text-slate-500">
              Question Palette ({activeQuestions.length})
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
              {activeQuestions.map((q, idx) => {
                const isCurrent = idx === currentQIndex;
                const isAns = typeof selectedAnswers[q.id] === 'number';
                const isFlg = flaggedQuestionIds.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-black tabular-nums border transition-all cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-blue-600 bg-blue-600 text-white border-blue-600'
                        : isFlg
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-400'
                          : isAns
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500 font-semibold">
              <div>Answered: {answeredCount}</div>
              <div>Unanswered: {unansweredCount}</div>
              <div>Marked for Review: {flaggedQuestionIds.length}</div>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                Confirm Exam Submission
              </h4>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                <div>Total Questions: <strong>{activeQuestions.length}</strong></div>
                <div>Answered: <strong>{answeredCount}</strong></div>
                <div>Unanswered: <strong>{unansweredCount}</strong></div>
                <div>Marked for Review: <strong>{flaggedQuestionIds.length}</strong></div>
              </div>
              {unansweredCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-200 text-xs font-bold">
                  You still have {unansweredCount} unanswered question(s). Are you sure you want to submit now?
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Return to Questions
                </button>
                <button
                  type="button"
                  onClick={handleFinishExam}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                >
                  Submit & View Analytics
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // STAGE 4: DETAILED EXAM RESULT ANALYTICS & QUESTION REVIEW MODE
  // ==========================================================================
  const report =
    lastAnalytics ||
    computeExamResultAnalytics(activeQuestions, selectedAnswers, 60);

  const reviewQuestions = activeQuestions.filter(q => {
    if (reviewFilter === 'incorrect') {
      return selectedAnswers[q.id] !== q.correctIndex;
    }
    if (reviewFilter === 'flagged') {
      return flaggedQuestionIds.includes(q.id);
    }
    return true;
  });

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Summary Score Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
              Examination Completed · Detailed Performance Analytics
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {activeExamTitle} — {report.scorePercent}% Score
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => launchExamMode(selectedModeId)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              New Randomized Attempt
            </button>
            <button
              type="button"
              onClick={() => setExamStage('setup')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
            >
              All Exam Modes
            </button>
          </div>
        </div>

        {/* 6 Core Exam Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Total Score</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{report.scorePercent}%</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Correct</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{report.correctCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Incorrect</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{report.incorrectCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Unanswered</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{report.unansweredCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Time Spent</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatTimer(report.durationSeconds)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Avg Time / Q</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {report.averageSecondsPerQuestion}s
            </div>
          </div>
        </div>

        {/* Performance by Topic & Difficulty */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Performance by Topic & Skill Type
            </h3>
            <div className="space-y-2.5">
              {report.byQuestionType.map(item => (
                <div key={item.topic} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold tabular-nums">
                    <span className="capitalize">{item.topic.replace(/_/g, ' ')}</span>
                    <span>
                      {item.correct}/{item.total} ({item.accuracyPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full ${
                        item.accuracyPercent >= 75
                          ? 'bg-emerald-600'
                          : item.accuracyPercent >= 50
                            ? 'bg-blue-600'
                            : 'bg-rose-600'
                      }`}
                      style={{ width: `${item.accuracyPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Performance by Difficulty & Adaptive Next Steps
            </h3>
            <div className="space-y-2">
              {report.byDifficulty.map(d => (
                <div
                  key={d.topic}
                  className="flex items-center justify-between text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 tabular-nums"
                >
                  <span>{d.topic}</span>
                  <span>
                    {d.correct}/{d.total} ({d.accuracyPercent}%)
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-2">
              <div className="text-xs font-black text-blue-600 dark:text-blue-400">
                Recommended Lessons Based on Your Results:
              </div>
              {report.recommendedLessons.map(rec => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {pickMultiLang(uiLang, rec.title)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {pickMultiLang(uiLang, rec.reason)}
                    </div>
                  </div>
                  {onNavigateModule && (
                    <button
                      type="button"
                      onClick={() => onNavigateModule(rec.targetModule)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold whitespace-nowrap cursor-pointer shrink-0"
                    >
                      {pickMultiLang(uiLang, rec.actionLabel)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Question-by-Question Review Mode */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Answer Key & Detailed Explanations ({reviewQuestions.length})
          </h3>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: `All (${activeQuestions.length})` },
              { id: 'incorrect', label: `Incorrect / Unanswered (${report.incorrectCount + report.unansweredCount})` },
              { id: 'flagged', label: `Marked for Review (${flaggedQuestionIds.length})` },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setReviewFilter(f.id as typeof reviewFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  reviewFilter === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {reviewQuestions.map((q, idx) => {
            const userIdx = selectedAnswers[q.id];
            const isCorrect = userIdx === q.correctIndex;
            const correctLetter = ['A', 'B', 'C', 'D'][q.correctIndex] || 'A';
            const userLetter =
              typeof userIdx === 'number' ? ['A', 'B', 'C', 'D'][userIdx] : 'Unanswered';

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span
                      className={
                        isCorrect
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {isCorrect ? 'Correct' : 'Needs Review'}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">
                      {q.difficulty} · {q.questionType10.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {(q.koreanStimulus || q.audioScriptKo || q.readingPassageKo) && (
                    <button
                      type="button"
                      onClick={() =>
                        playKoreanAudio(
                          q.audioScriptKo || q.koreanStimulus || q.readingPassageKo || ''
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Listen Korean
                    </button>
                  )}
                </div>

                <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {pickTriLingual(uiLang as any, {
                    en: q.promptEn,
                    bn: q.promptBn,
                    ne: q.promptNe || q.promptEn,
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, oIdx) => {
                    const letter = ['A', 'B', 'C', 'D'][oIdx];
                    const isTrueAns = oIdx === q.correctIndex;
                    const isUserWrong = oIdx === userIdx && !isTrueAns;
                    return (
                      <div
                        key={`${q.id}-rev-${oIdx}`}
                        className={`p-3 rounded-xl border font-bold ${
                          isTrueAns
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                            : isUserWrong
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-800 dark:text-rose-200'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {letter}. {opt} {isTrueAns ? ' (Correct Answer)' : isUserWrong ? ' (Your Answer)' : ''}
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <strong>Your Answer:</strong> {userLetter} · <strong>Correct Key:</strong> {correctLetter} ({q.options[q.correctIndex]}) —{' '}
                  {pickTriLingual(uiLang as any, {
                    en: q.explanationEn,
                    bn: q.explanationBn,
                    ne: q.explanationNe || q.explanationEn,
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
