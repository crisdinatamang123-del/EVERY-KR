import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestorePayload } from '../lib/firebase';
import {
  AcademyCategory,
  AcademyExamQuestion,
  AcademyVocabItem,
  DEFAULT_ACADEMY_CATEGORIES,
  DEFAULT_HANGUL_LESSONS,
  HangulLessonUnit,
} from '../data/koreanAcademyData';
import {
  CurriculumLevelId,
  RealLifeScenario20x,
  VOCAB_TOPICS_20X,
} from '../data/korean20x/levelsAndCategories';
import { getVocabularyBank20x } from '../data/korean20x/vocabularyBank20x';
import { getLessonPaths20x } from '../data/korean20x/lessonsAndGrammar20x';
import { getRealLifeScenarios20x } from '../data/korean20x/scenariosAndConversations20x';
import { getExamQuestions20x } from '../data/korean20x/practiceActivities20x';
import { LearningExplanationLang } from '../utils/hangulPhonetics';

export interface DailyActivityRecord {
  date: string; // YYYY-MM-DD
  minutesPracticed: number;
  questionsAnswered: number;
  lessonsCompleted: number;
}

export interface SubjectPerformance {
  correct: number;
  incorrect: number;
  total: number;
}

export interface DailyLearningGoals {
  targetMinutes: number;
  targetQuestions: number;
  targetWords: number;
  targetHandwriting: number;
}

export interface SrsWordState {
  box: number; // 0..5 Leitner/SM-2 interval box
  nextReviewAt: string; // ISO string or YYYY-MM-DD
  lastReviewedAt: string;
  lapses: number;
}

export interface UserAcademyProgress {
  userId: string;
  userEmail?: string;
  userName?: string;
  preferredLearningLang?: LearningExplanationLang;
  currentLevel?: CurriculumLevelId;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  lastModuleVisited: string;
  lastLessonId: string;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalIncorrectAnswers: number;
  totalPracticeMinutes: number;
  completedLessons: string[];
  masteredVocabIds: string[];
  bookmarkedVocabIds?: string[];
  weakVocabIds?: string[];
  srsSchedule?: Record<string, SrsWordState>;
  completedScenarioIds?: string[];
  completedGrammarIds?: string[];
  completedListeningIds?: string[];
  completedReadingIds?: string[];
  completedSpeakingIds?: string[];
  completedSentenceBuilderIds?: string[];
  completedDailyChallenges?: string[];
  completedHandwritingIds: string[];
  subjectPerformance: Record<string, SubjectPerformance>;
  dailyActivity: Record<string, DailyActivityRecord>;
  dailyGoals: DailyLearningGoals;
  updatedAt: string;
}

export interface ExamResultSubmission {
  id: string;
  userId: string;
  userEmail?: string;
  subject: string;
  difficulty: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  scorePercent: number;
  durationSeconds: number;
  weakSubjects: string[];
  completedAt: string;
}

const LOCAL_PROGRESS_KEY_PREFIX = 'everykr_academy_progress_';
const LOCAL_EXAMS_KEY_PREFIX = 'everykr_academy_exams_';

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const computeNextSrsState = (
  current: SrsWordState | undefined,
  rating: 'again' | 'hard' | 'good' | 'easy'
): SrsWordState => {
  const prevBox = current?.box ?? 0;
  let nextBox = prevBox;
  let daysToAdd = 1;
  let lapses = current?.lapses ?? 0;

  if (rating === 'again') {
    nextBox = 0;
    daysToAdd = 0;
    lapses += 1;
  } else if (rating === 'hard') {
    nextBox = Math.max(1, prevBox);
    daysToAdd = 1;
  } else if (rating === 'good') {
    nextBox = Math.min(5, prevBox + 1);
    daysToAdd = [1, 2, 4, 7, 14, 30][nextBox] || 3;
  } else {
    nextBox = Math.min(5, prevBox + 2);
    daysToAdd = [2, 4, 7, 14, 30, 60][nextBox] || 7;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  const yyyy = nextDate.getFullYear();
  const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nextDate.getDate()).padStart(2, '0');

  return {
    box: nextBox,
    nextReviewAt: `${yyyy}-${mm}-${dd}`,
    lastReviewedAt: new Date().toISOString(),
    lapses,
  };
};

export const createInitialUserProgress = (userId: string, userEmail?: string, userName?: string): UserAcademyProgress => {
  const today = getTodayDateString();
  return {
    userId,
    userEmail: userEmail || '',
    userName: userName || '',
    currentLevel: 'Absolute Beginner',
    streakDays: 1,
    lastActiveDate: today,
    lastModuleVisited: 'hangul',
    lastLessonId: 'lesson-1-intro',
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    totalIncorrectAnswers: 0,
    totalPracticeMinutes: 0,
    completedLessons: [],
    masteredVocabIds: [],
    bookmarkedVocabIds: [],
    weakVocabIds: [],
    srsSchedule: {},
    completedScenarioIds: [],
    completedGrammarIds: [],
    completedListeningIds: [],
    completedReadingIds: [],
    completedSpeakingIds: [],
    completedSentenceBuilderIds: [],
    completedDailyChallenges: [],
    completedHandwritingIds: [],
    subjectPerformance: {},
    dailyActivity: {
      [today]: {
        date: today,
        minutesPracticed: 0,
        questionsAnswered: 0,
        lessonsCompleted: 0,
      },
    },
    dailyGoals: {
      targetMinutes: 15,
      targetQuestions: 10,
      targetWords: 15,
      targetHandwriting: 3,
    },
    updatedAt: new Date().toISOString(),
  };
};

export const applyStreakUpdate = (progress: UserAcademyProgress): UserAcademyProgress => {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const updated = { ...progress };

  if (updated.lastActiveDate === today) {
    if (updated.streakDays < 1) updated.streakDays = 1;
  } else if (updated.lastActiveDate === yesterday) {
    updated.streakDays = (updated.streakDays || 0) + 1;
    updated.lastActiveDate = today;
  } else {
    updated.streakDays = 1;
    updated.lastActiveDate = today;
  }

  if (!updated.dailyActivity) {
    updated.dailyActivity = {};
  }
  if (!updated.dailyActivity[today]) {
    updated.dailyActivity[today] = {
      date: today,
      minutesPracticed: 0,
      questionsAnswered: 0,
      lessonsCompleted: 0,
    };
  }

  return updated;
};

export const loadUserAcademyProgress = async (
  userId?: string | null,
  userEmail?: string,
  userName?: string
): Promise<UserAcademyProgress> => {
  const storageKey = `${LOCAL_PROGRESS_KEY_PREFIX}${userId || 'guest'}`;

  let localProgress: UserAcademyProgress | null = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      localProgress = JSON.parse(raw) as UserAcademyProgress;
    }
  } catch {
    // ignore storage errors
  }

  if (userId && userId !== 'guest') {
    try {
      const ref = doc(db, 'academy_progress', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const remoteData = snap.data() as UserAcademyProgress;
        const merged = applyStreakUpdate({
          ...createInitialUserProgress(userId, userEmail, userName),
          ...remoteData,
          userId,
          userEmail: userEmail || remoteData.userEmail || '',
          userName: userName || remoteData.userName || '',
        });
        localStorage.setItem(storageKey, JSON.stringify(merged));
        return merged;
      } else if (localProgress) {
        const synced = applyStreakUpdate({
          ...createInitialUserProgress(userId, userEmail, userName),
          ...localProgress,
          userId,
          userEmail: userEmail || localProgress.userEmail || '',
          userName: userName || localProgress.userName || '',
        });
        await saveUserAcademyProgress(synced);
        return synced;
      }
    } catch {
      // Fallback to local if offline
    }
  }

  const initial = applyStreakUpdate(
    localProgress
      ? { ...createInitialUserProgress(userId || 'guest', userEmail, userName), ...localProgress }
      : createInitialUserProgress(userId || 'guest', userEmail, userName)
  );
  try {
    localStorage.setItem(storageKey, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
};

export const saveUserAcademyProgress = async (progress: UserAcademyProgress): Promise<void> => {
  const updated: UserAcademyProgress = {
    ...progress,
    updatedAt: new Date().toISOString(),
  };
  const storageKey = `${LOCAL_PROGRESS_KEY_PREFIX}${updated.userId || 'guest'}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch {
    // ignore
  }

  if (updated.userId && updated.userId !== 'guest') {
    try {
      const ref = doc(db, 'academy_progress', updated.userId);
      await setDoc(ref, sanitizeFirestorePayload(updated), { merge: true });
    } catch (error) {
      console.warn('Could not sync academy progress to Firestore:', error);
    }
  }
};

export const saveExamSubmission = async (submission: ExamResultSubmission): Promise<void> => {
  const storageKey = `${LOCAL_EXAMS_KEY_PREFIX}${submission.userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(storageKey);
    const existing: ExamResultSubmission[] = raw ? JSON.parse(raw) : [];
    const next = [submission, ...existing].slice(0, 50);
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // ignore
  }

  if (submission.userId && submission.userId !== 'guest') {
    try {
      const ref = doc(db, 'academy_exam_results', submission.id);
      await setDoc(ref, sanitizeFirestorePayload(submission));
    } catch (error) {
      console.warn('Could not save exam result to Firestore:', error);
    }
  }
};

export const loadUserExamHistory = async (userId?: string | null): Promise<ExamResultSubmission[]> => {
  const storageKey = `${LOCAL_EXAMS_KEY_PREFIX}${userId || 'guest'}`;
  let localHistory: ExamResultSubmission[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      localHistory = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  if (userId && userId !== 'guest') {
    try {
      const q = query(
        collection(db, 'academy_exam_results'),
        where('userId', '==', userId),
        limit(30)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const remote = snap.docs
          .map(d => d.data() as ExamResultSubmission)
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
        localStorage.setItem(storageKey, JSON.stringify(remote));
        return remote;
      }
    } catch {
      // Fallback to local
    }
  }

  return localHistory;
};

// Build default 15-topic + legacy categories list
export const getExpandedAcademyCategories = (): AcademyCategory[] => {
  const map = new Map<string, AcademyCategory>();
  VOCAB_TOPICS_20X.forEach(t => {
    map.set(t.id, {
      id: t.id,
      nameEn: t.nameEn,
      nameBn: t.nameBn,
      nameNe: t.nameNe,
      nameKo: t.nameKo,
      descriptionEn: t.descriptionEn,
      descriptionBn: t.descriptionBn,
      descriptionNe: t.descriptionNe,
      iconName: t.iconName,
      order: t.order,
    });
  });
  // Also preserve legacy category IDs with Nepali labels so any custom Firestore vocab using them displays cleanly
  DEFAULT_ACADEMY_CATEGORIES.forEach(c => {
    if (!map.has(c.id)) {
      map.set(c.id, {
        ...c,
        nameNe: c.nameNe || c.nameEn,
        descriptionNe: c.descriptionNe || c.descriptionEn,
        order: 20 + c.order,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => (a.order || 99) - (b.order || 99));
};

// Convert 20X LessonPathUnit20x items into HangulLessonUnit-compatible lessons while preserving DEFAULT_HANGUL_LESSONS first
export const getExpandedHangulAndPathLessons = (): HangulLessonUnit[] => {
  const baseMap = new Map<string, HangulLessonUnit>();
  DEFAULT_HANGUL_LESSONS.forEach(l => {
    baseMap.set(l.id, {
      ...l,
      level: 'Absolute Beginner',
      titleNe: l.titleNe || l.titleEn,
      subtitleNe: l.subtitleNe || l.subtitleEn,
      overviewNe: l.overviewNe || l.overviewEn,
      keyRulesNe: l.keyRulesNe || l.keyRulesEn,
      published: true,
      reviewStatus: 'approved',
    });
  });

  const paths = getLessonPaths20x();
  paths.forEach(p => {
    if (baseMap.has(p.id)) return;
    baseMap.set(p.id, {
      id: p.id,
      slug: p.id,
      order: p.order + 6,
      level: p.level,
      topic: p.topic,
      published: p.published !== false,
      reviewStatus: p.reviewStatus || 'approved',
      titleKo: p.titleKo,
      titleEn: p.titleEn,
      titleBn: p.titleBn,
      titleNe: p.titleNe,
      subtitleEn: `${p.level} • ${p.estimatedMinutes} mins`,
      subtitleBn: `${p.level} • ${p.estimatedMinutes} মিনিট`,
      subtitleNe: `${p.level} • ${p.estimatedMinutes} मिनेट`,
      estimatedMinutes: p.estimatedMinutes,
      overviewEn: p.summaryEn,
      overviewBn: p.summaryBn,
      overviewNe: p.summaryNe,
      keyRulesEn: p.focusPointsKo.map(fp => `Key Focus: ${fp}`),
      keyRulesBn: p.focusPointsKo.map(fp => `মূল অনুশীলন: ${fp}`),
      keyRulesNe: p.focusPointsKo.map(fp => `मुख्य अभ्यास: ${fp}`),
      letters: p.focusPointsKo.slice(0, 4).map(fp => ({
        char: fp.slice(0, 4),
        nameKo: fp,
        nameEn: fp,
        nameBn: fp,
        nameNe: fp,
        romanization: fp,
        pronunciationEn: fp,
        pronunciationBn: fp,
        pronunciationNe: fp,
        mouthTipEn: `Practice speaking "${fp}" aloud clearly.`,
        mouthTipBn: `"${fp}" স্পষ্টভাবে উচ্চারণ অনুশীলন করুন।`,
        mouthTipNe: `"${fp}" स्पष्ट उच्चारण अभ्यास गर्नुहोस्।`,
        examples: [
          {
            wordKo: fp,
            romanization: fp,
            meaningEn: p.titleEn,
            meaningBn: p.titleBn,
            meaningNe: p.titleNe,
          },
        ],
      })),
    });
  });

  return Array.from(baseMap.values()).sort((a, b) => (a.order || 999) - (b.order || 999));
};

// Dynamic 20X Curriculum Fetching (merges Firestore custom items with 20X datasets)
export const fetchAcademyCurriculum = async (options?: {
  includeUnpublished?: boolean;
}): Promise<{
  categories: AcademyCategory[];
  lessons: HangulLessonUnit[];
  vocabulary: AcademyVocabItem[];
  questions: AcademyExamQuestion[];
  scenarios: RealLifeScenario20x[];
  customVocabIds: Set<string>;
}> => {
  const includeUnpublished = Boolean(options?.includeUnpublished);
  let customCategories: AcademyCategory[] = [];
  let customLessons: HangulLessonUnit[] = [];
  let customVocab: AcademyVocabItem[] = [];
  let customQuestions: AcademyExamQuestion[] = [];
  let customScenarios: RealLifeScenario20x[] = [];

  try {
    const [catSnap, lessonSnap, vocabSnap, qSnap, scenSnap] = await Promise.all([
      getDocs(collection(db, 'academy_categories')).catch(() => null),
      getDocs(collection(db, 'academy_lessons')).catch(() => null),
      getDocs(collection(db, 'academy_vocabulary')).catch(() => null),
      getDocs(collection(db, 'academy_questions')).catch(() => null),
      getDocs(collection(db, 'academy_scenarios')).catch(() => null),
    ]);

    if (catSnap && !catSnap.empty) {
      customCategories = catSnap.docs.map(d => ({ ...(d.data() as AcademyCategory), id: d.id }));
    }
    if (lessonSnap && !lessonSnap.empty) {
      customLessons = lessonSnap.docs.map(d => ({ ...(d.data() as HangulLessonUnit), id: d.id }));
    }
    if (vocabSnap && !vocabSnap.empty) {
      customVocab = vocabSnap.docs.map(d => ({ ...(d.data() as AcademyVocabItem), id: d.id }));
    }
    if (qSnap && !qSnap.empty) {
      customQuestions = qSnap.docs.map(d => ({ ...(d.data() as AcademyExamQuestion), id: d.id }));
    }
    if (scenSnap && !scenSnap.empty) {
      customScenarios = scenSnap.docs.map(d => ({ ...(d.data() as RealLifeScenario20x), id: d.id }));
    }
  } catch {
    // Fallback to 20X built-in banks
  }

  const mergeById = <T extends { id: string; published?: boolean; reviewStatus?: string }>(
    defaults: T[],
    custom: T[]
  ): T[] => {
    const map = new Map<string, T>();
    defaults.forEach(item => map.set(item.id, item));
    custom.forEach(item => map.set(item.id, item));
    const merged = Array.from(map.values());
    if (includeUnpublished) return merged;
    return merged.filter(
      item => item.published !== false && item.reviewStatus !== 'pending_ai_review' && item.reviewStatus !== 'draft'
    );
  };

  const baseVocab = getVocabularyBank20x() as unknown as AcademyVocabItem[];
  const baseLessons = getExpandedHangulAndPathLessons();
  const baseQuestions = getExamQuestions20x();
  const baseScenarios = getRealLifeScenarios20x();
  const baseCategories = getExpandedAcademyCategories();

  const categories = mergeById<AcademyCategory>(baseCategories, customCategories).sort(
    (a, b) => (a.order || 99) - (b.order || 99)
  );
  const lessons = mergeById(baseLessons, customLessons).sort(
    (a, b) => (a.order || 999) - (b.order || 999)
  );
  const vocabulary = mergeById(baseVocab, customVocab);
  const questions = mergeById(baseQuestions, customQuestions);
  const scenarios = mergeById(baseScenarios, customScenarios);

  return {
    categories,
    lessons,
    vocabulary,
    questions,
    scenarios,
    customVocabIds: new Set(customVocab.map(v => v.id)),
  };
};

// Admin CRUD Operations
export const upsertAcademyLesson = async (lesson: HangulLessonUnit): Promise<void> => {
  try {
    await setDoc(doc(db, 'academy_lessons', lesson.id), sanitizeFirestorePayload(lesson));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `academy_lessons/${lesson.id}`);
  }
};

export const deleteAcademyLesson = async (lessonId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'academy_lessons', lessonId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `academy_lessons/${lessonId}`);
  }
};

export const upsertAcademyVocab = async (vocab: AcademyVocabItem): Promise<void> => {
  try {
    await setDoc(doc(db, 'academy_vocabulary', vocab.id), sanitizeFirestorePayload(vocab));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `academy_vocabulary/${vocab.id}`);
  }
};

export const bulkUpsertAcademyVocab = async (items: AcademyVocabItem[]): Promise<number> => {
  if (!items.length) return 0;
  const CHUNK_SIZE = 400;
  let written = 0;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const slice = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    slice.forEach(item => {
      batch.set(doc(db, 'academy_vocabulary', item.id), sanitizeFirestorePayload(item));
    });
    try {
      await batch.commit();
      written += slice.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'academy_vocabulary/bulk');
    }
  }
  return written;
};

export const deleteAcademyVocab = async (vocabId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'academy_vocabulary', vocabId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `academy_vocabulary/${vocabId}`);
  }
};

export const upsertAcademyScenario = async (scenario: RealLifeScenario20x): Promise<void> => {
  try {
    await setDoc(doc(db, 'academy_scenarios', scenario.id), sanitizeFirestorePayload(scenario));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `academy_scenarios/${scenario.id}`);
  }
};

export const deleteAcademyScenario = async (scenarioId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'academy_scenarios', scenarioId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `academy_scenarios/${scenarioId}`);
  }
};

export const upsertAcademyQuestion = async (question: AcademyExamQuestion): Promise<void> => {
  try {
    await setDoc(doc(db, 'academy_questions', question.id), sanitizeFirestorePayload(question));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `academy_questions/${question.id}`);
  }
};

export const deleteAcademyQuestion = async (questionId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'academy_questions', questionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `academy_questions/${questionId}`);
  }
};

export const upsertAcademyCategory = async (category: AcademyCategory): Promise<void> => {
  try {
    await setDoc(doc(db, 'academy_categories', category.id), sanitizeFirestorePayload(category));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `academy_categories/${category.id}`);
  }
};

export const deleteAcademyCategory = async (categoryId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'academy_categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `academy_categories/${categoryId}`);
  }
};

export const detectDuplicateVocabEntries = (
  vocabulary: AcademyVocabItem[]
): Array<{ korean: string; items: AcademyVocabItem[] }> => {
  const byKorean = new Map<string, AcademyVocabItem[]>();
  vocabulary.forEach(item => {
    const key = item.korean.trim();
    if (!key) return;
    const list = byKorean.get(key) || [];
    list.push(item);
    byKorean.set(key, list);
  });
  return Array.from(byKorean.entries())
    .filter(([, list]) => list.length > 1)
    .map(([korean, items]) => ({ korean, items }));
};

export const fetchAdminAcademyStats = async (): Promise<{
  totalLearners: number;
  totalQuestionsAnsweredAllUsers: number;
  totalPracticeMinutesAllUsers: number;
  totalExamsCompleted: number;
  averageExamScore: number;
  learners: UserAcademyProgress[];
}> => {
  try {
    const [progSnap, examSnap] = await Promise.all([
      getDocs(query(collection(db, 'academy_progress'), orderBy('updatedAt', 'desc'), limit(100))).catch(() => null),
      getDocs(query(collection(db, 'academy_exam_results'), limit(100))).catch(() => null),
    ]);

    const learners = progSnap ? progSnap.docs.map(d => d.data() as UserAcademyProgress) : [];
    const exams = examSnap ? examSnap.docs.map(d => d.data() as ExamResultSubmission) : [];

    const totalQuestionsAnsweredAllUsers = learners.reduce(
      (sum, l) => sum + (l.totalQuestionsAnswered || 0),
      0
    );
    const totalPracticeMinutesAllUsers = learners.reduce(
      (sum, l) => sum + (l.totalPracticeMinutes || 0),
      0
    );
    const averageExamScore =
      exams.length > 0
        ? Math.round(exams.reduce((sum, e) => sum + (e.scorePercent || 0), 0) / exams.length)
        : 0;

    return {
      totalLearners: learners.length,
      totalQuestionsAnsweredAllUsers,
      totalPracticeMinutesAllUsers,
      totalExamsCompleted: exams.length,
      averageExamScore,
      learners,
    };
  } catch {
    return {
      totalLearners: 0,
      totalQuestionsAnsweredAllUsers: 0,
      totalPracticeMinutesAllUsers: 0,
      totalExamsCompleted: 0,
      averageExamScore: 0,
      learners: [],
    };
  }
};

export type KoreanSpeakingStyleMode = 'conversation' | 'learning';
export type KoreanVoiceGender = 'female' | 'male';

export interface KoreanVoicePreferences {
  speakingStyle: KoreanSpeakingStyleMode;
  voiceGender: KoreanVoiceGender;
}

const KOREAN_VOICE_PREFS_KEY = 'everykr_korean_voice_prefs_v5';

export const getKoreanVoicePreferences = (): KoreanVoicePreferences => {
  if (typeof window === 'undefined') {
    return { speakingStyle: 'conversation', voiceGender: 'female' };
  }
  try {
    const raw = localStorage.getItem(KOREAN_VOICE_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<KoreanVoicePreferences>;
      return {
        speakingStyle: parsed.speakingStyle === 'learning' ? 'learning' : 'conversation',
        voiceGender: parsed.voiceGender === 'male' ? 'male' : 'female',
      };
    }
  } catch {
    // ignore storage errors
  }
  return { speakingStyle: 'conversation', voiceGender: 'female' };
};

export const setKoreanVoicePreferences = (
  prefs: Partial<KoreanVoicePreferences>
): KoreanVoicePreferences => {
  const next: KoreanVoicePreferences = {
    ...getKoreanVoicePreferences(),
    ...prefs,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(KOREAN_VOICE_PREFS_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('everykr-korean-voice-prefs-changed', { detail: next }));
    } catch {
      // ignore storage errors
    }
  }
  return next;
};

// Audio Playback Helper (Custom Audio URL + Context-Aware Korean TTS with Teaching Mode & Voice Selection)
export const playKoreanAudio = (textKo: string, customAudioUrl?: string, rate?: number): void => {
  if (customAudioUrl && customAudioUrl.trim().length > 0) {
    try {
      const audio = new Audio(customAudioUrl);
      audio.play().catch(() => {
        speakWithWebSpeech(textKo, rate);
      });
      return;
    } catch {
      // Fallback to Web Speech
    }
  }
  speakWithWebSpeech(textKo, rate);
};

const speakWithWebSpeech = (textKo: string, explicitRate?: number): void => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const prefs = getKoreanVoicePreferences();
    window.speechSynthesis.cancel();

    // Normalize punctuation and phrase spacing for natural Korean prosody
    const normalizedText =
      prefs.speakingStyle === 'learning'
        ? textKo.replace(/\s+/g, ', ').replace(/,\,+/g, ',')
        : textKo.trim();

    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = 'ko-KR';

    if (typeof explicitRate === 'number') {
      utterance.rate = explicitRate;
    } else {
      utterance.rate = prefs.speakingStyle === 'learning' ? 0.82 : 0.96;
    }
    utterance.pitch = prefs.voiceGender === 'male' ? 0.92 : 1.04;

    const voices = window.speechSynthesis.getVoices();
    const koreanVoices = voices.filter(
      v => v.lang.toLowerCase().includes('ko') || v.lang.toUpperCase().includes('KR')
    );

    if (koreanVoices.length > 0) {
      const preferredGenderVoice = koreanVoices.find(v => {
        const nameLower = v.name.toLowerCase();
        if (prefs.voiceGender === 'male') {
          return /injoon|hyunsu|male|man|puck|charon|fenrir/i.test(nameLower);
        }
        return /sunhi|yuna|heami|female|woman|kore|aoede|google/i.test(nameLower);
      });
      const highQualityVoice =
        preferredGenderVoice ||
        koreanVoices.find(v => /natural|neural|online|google|sunhi|injoon|yuna/i.test(v.name)) ||
        koreanVoices[0];
      if (highQualityVoice) {
        utterance.voice = highQualityVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore speech errors
  }
};

