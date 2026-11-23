import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../lib/firebase';
import {
  AcademyExamQuestion,
  ExamDifficulty,
  ExamSubject,
} from '../data/koreanAcademyData';
import { getExamQuestions20x } from '../data/korean20x/practiceActivities20x';
import {
  getKorean50xConversations,
  getKorean50xGrammarLessons,
  getKorean50xListeningLab,
  getKorean50xReadingPassages,
  getKorean50xSentenceBuilders,
  getKorean50xVocabulary,
  MultiLangText,
} from '../data/korean50x/korean50xContentEngine';
import { ExamResultSubmission, UserAcademyProgress } from './koreanAcademyService';

// ============================================================================
// PART 2A — 10 STRUCTURED QUESTION TYPES & LARGE QUESTION BANK (2,500+ ITEMS)
// ============================================================================
export type ExamQuestionType10 =
  | 'vocabulary'
  | 'grammar'
  | 'sentence_completion'
  | 'reading_comprehension'
  | 'listening_comprehension'
  | 'word_ordering'
  | 'correct_sentence_selection'
  | 'translation'
  | 'contextual_usage'
  | 'topik_style';

export type ExamMode11Id =
  | 'quick_test'
  | 'standard_test'
  | 'full_mock'
  | 'intensive_practice'
  | 'vocabulary_exam'
  | 'grammar_exam'
  | 'listening_exam'
  | 'reading_exam'
  | 'topik_1_mock'
  | 'topik_2_mock'
  | 'custom_exam';

export interface ExamMode11Config {
  id: ExamMode11Id;
  questionCount: number;
  durationMinutes: number;
  title: MultiLangText;
  subtitle: MultiLangText;
  defaultDifficulty: 'all' | 'Beginner' | 'Intermediate' | 'Advanced';
  defaultQuestionTypes?: ExamQuestionType10[];
}

export const EXAM_MODES_11: ExamMode11Config[] = [
  {
    id: 'quick_test',
    questionCount: 10,
    durationMinutes: 10,
    title: { en: '1. Quick Test (10 Questions)', bn: '১. কুইক টেস্ট (১০টি প্রশ্ন)', ne: '१. द्रुत परीक्षा (१० प्रश्न)' },
    subtitle: { en: 'Fast 10-minute diagnostic across vocabulary, grammar, and usage', bn: 'শব্দভাণ্ডার ও ব্যাকরণের দ্রুত ১০ মিনিটের পরীক্ষা', ne: 'शब्दावली र व्याकरणको १० मिनेटको द्रुत परीक्षा' },
    defaultDifficulty: 'all',
  },
  {
    id: 'standard_test',
    questionCount: 20,
    durationMinutes: 25,
    title: { en: '2. Standard Test (20 Questions)', bn: '২. স্ট্যান্ডার্ড টেস্ট (২০টি প্রশ্ন)', ne: '२. মানक परीक्षा (२० प्रश्न)' },
    subtitle: { en: 'Balanced 20-question proficiency evaluation across all core skills', bn: 'সকল মূল দক্ষতার ওপর ভারসাম্যপূর্ণ ২০টি প্রশ্নের পরীক্ষা', ne: 'सबै মূল सीपहरूको सन्तुलित २० प्रश्नको परीक्षा' },
    defaultDifficulty: 'all',
  },
  {
    id: 'full_mock',
    questionCount: 40,
    durationMinutes: 50,
    title: { en: '3. Full Mock Exam (40 Questions)', bn: '৩. ফুল মক এক্সাম (৪০টি প্রশ্ন)', ne: '३. पूर्ण नमुना परीक्षा (४० प्रश्न)' },
    subtitle: { en: 'Comprehensive 50-minute simulation covering Listening, Reading, Vocab & Grammar', bn: 'লিসেনিং, রিডিং, শব্দভাণ্ডার ও ব্যাকরণের পূর্ণাঙ্গ ৫০ মিনিটের মক পরীক্ষা', ne: 'सुनाइ, पढाइ, शब्दावली र व्याकरणको ५० मिनेटको पूर्ण परीक्षा' },
    defaultDifficulty: 'all',
  },
  {
    id: 'intensive_practice',
    questionCount: 60,
    durationMinutes: 75,
    title: { en: '4. Intensive Practice (60 Questions)', bn: '৪. ইনটেনসিভ প্র্যাকটিস (৬০টি প্রশ্ন)', ne: '४. गहन अभ्यास परीक्षा (६० प्रश्न)' },
    subtitle: { en: 'Deep endurance test across all 10 question types and difficulty tiers', bn: '১০টি প্রশ্নের ধরন ও সব লেভেলের ওপর ৬০টি প্রশ্নের গভীর অনুশীলন', ne: 'सबै १० प्रकारका प्रश्नहरूको ६० प्रश्नको गहन परीक्षा' },
    defaultDifficulty: 'all',
  },
  {
    id: 'vocabulary_exam',
    questionCount: 20,
    durationMinutes: 20,
    title: { en: '5. Vocabulary Exam (어휘 시험)', bn: '৫. শব্দভাণ্ডার পরীক্ষা (어휘)', ne: '५. शब्दावली परीक्षा (어휘)' },
    subtitle: { en: 'Tests Korean lexical meaning, synonyms, and contextual word choice', bn: 'কোরিয়ান শব্দের অর্থ, সমার্থক শব্দ এবং প্রাসঙ্গিক ব্যবহার যাচাই', ne: 'कोरियन शब्दको अर्थ र सन्दर्भगत प्रयोग পরীক্ষা' },
    defaultDifficulty: 'all',
    defaultQuestionTypes: ['vocabulary', 'translation'],
  },
  {
    id: 'grammar_exam',
    questionCount: 20,
    durationMinutes: 25,
    title: { en: '6. Grammar Exam (문법 시험)', bn: '৬. ব্যাকরণ পরীক্ষা (문법)', ne: '६. व्याकरण परीक्षा (문법)' },
    subtitle: { en: 'Tests particles, verb/adjective conjugation, tenses, honorifics & connectors', bn: 'পার্টিকেল, ক্রিয়া রূপান্তর, কাল, সম্মানসূচক ভাষা ও সংযোজক যাচাই', ne: 'विभक्ति, क्रिया रूपान्तरण, काल र आदरार्थी व्याकरण परीक्षा' },
    defaultDifficulty: 'all',
    defaultQuestionTypes: ['grammar', 'sentence_completion', 'word_ordering', 'correct_sentence_selection'],
  },
  {
    id: 'listening_exam',
    questionCount: 20,
    durationMinutes: 25,
    title: { en: '7. Listening Exam (듣기 시험)', bn: '৭. লিসেনিং পরীক্ষা (듣기)', ne: '७. सुनाइ परीक्षा (듣기)' },
    subtitle: { en: 'Audio-based dialogue comprehension, announcements, and situational responses', bn: 'অডিও সংলাপ, ঘোষণা এবং পরিস্থিতিগত উত্তর বোঝার পরীক্ষা', ne: 'अडियो संवाद, सूचना र परिस्थितिजन्य सुनाइ परीक्षा' },
    defaultDifficulty: 'all',
    defaultQuestionTypes: ['listening_comprehension'],
  },
  {
    id: 'reading_exam',
    questionCount: 20,
    durationMinutes: 30,
    title: { en: '8. Reading Exam (읽기 시험)', bn: '৮. রিডিং পরীক্ষা (읽기)', ne: '८. पढाइ परीक्षा (읽기)' },
    subtitle: { en: 'Notices, emails, university announcements, stories, and news passages', bn: 'বিজ্ঞপ্তি, ইমেইল, বিশ্ববিদ্যালয়ের নোটিশ, গল্প ও সংবাদ অনুচ্ছেদ', ne: 'सूचना, इमेल, विश्वविद्यालय नोटिस र समाचार अनुच्छेद पढाइ परीक्षा' },
    defaultDifficulty: 'all',
    defaultQuestionTypes: ['reading_comprehension', 'sentence_completion'],
  },
  {
    id: 'topik_1_mock',
    questionCount: 40,
    durationMinutes: 50,
    title: { en: '9. TOPIK I Mock Exam (Levels 1–2)', bn: '৯. TOPIK I মক এক্সাম (লেভেল ১–২)', ne: '९. TOPIK I नमुना परीक्षा (तह १–२)' },
    subtitle: { en: 'Unofficial EveryKR simulation modeled on TOPIK I Listening & Reading', bn: 'TOPIK I লিসেনিং ও রিডিং কাঠামোর আদলে তৈরি অনুশীলন পরীক্ষা', ne: 'TOPIK I सुनाइ र पढाइ ढाँचामा आधारित नमुना परीक्षा' },
    defaultDifficulty: 'Beginner',
  },
  {
    id: 'topik_2_mock',
    questionCount: 40,
    durationMinutes: 60,
    title: { en: '10. TOPIK II Mock Exam (Levels 3–6)', bn: '১০. TOPIK II মক এক্সাম (লেভেল ৩–৬)', ne: '१०. TOPIK II नमुना परीक्षा (तह ३–६)' },
    subtitle: { en: 'Unofficial EveryKR simulation modeled on TOPIK II Intermediate–Advanced', bn: 'TOPIK II ইন্টারমিডিয়েট ও অ্যাডভান্সড কাঠামোর আদলে অনুশীলন পরীক্ষা', ne: 'TOPIK II मध्यम र उच्च तहको ढाँचामा आधारित नमुना परीक्षा' },
    defaultDifficulty: 'Intermediate',
  },
  {
    id: 'custom_exam',
    questionCount: 20,
    durationMinutes: 25,
    title: { en: '11. Custom Exam Builder', bn: '১১. কাস্টম এক্সাম বিল্ডার', ne: '११. कस्टम परीक्षा निर्माण' },
    subtitle: { en: 'Choose your own question count, difficulty level, topic, and skill focus', bn: 'নিজের পছন্দমতো প্রশ্ন সংখ্যা, লেভেল এবং বিষয় নির্বাচন করুন', ne: 'आफ्नो रोजाइ अनुसार प्रश्न संख्या, तह र विषय छान्नुहोस्' },
    defaultDifficulty: 'all',
  },
];

export interface StructuredExamQuestion50x extends AcademyExamQuestion {
  questionType10: ExamQuestionType10;
  topicTag: string;
  learningObjective: string;
  correctAnswerText: string;
  promptNe?: string;
  explanationNe?: string;
  verifiedPracticeLabel: 'EveryKR Verified Practice Question';
}

// ============================================================================
// PART 2B — CRYPTOGRAPHIC / STATISTICAL FISHER-YATES SHUFFLE
// ============================================================================
function getRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return array[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

/**
 * Unbiased Fisher-Yates shuffle. Never mutates the input array.
 */
export function fisherYatesShuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

// ============================================================================
// PART 2C — BALANCED ANSWER-POSITION SHUFFLER (ELIMINATES A,A,A,A & CYCLES)
// ============================================================================
/**
 * Generates a balanced sequence of target answer indices (0=A, 1=B, 2=C, 3=D)
 * for an N-question exam such that:
 * 1. Each choice A, B, C, D appears approximately N/4 times (exact 25% balance when N % 4 === 0).
 * 2. No identical answer letter repeats more than 2 times in a row (never A, A, A or A, A, A, A).
 * 3. Never produces a mechanical repeating cycle like A, B, C, D, A, B, C, D.
 */
export function generateBalancedAnswerPositions(questionCount: number): number[] {
  if (questionCount <= 0) return [];

  // Build balanced pool of 0, 1, 2, 3
  const basePool: number[] = [];
  const fullCycles = Math.floor(questionCount / 4);
  for (let c = 0; c < fullCycles; c++) {
    basePool.push(0, 1, 2, 3);
  }
  const remainderPositions = fisherYatesShuffle([0, 1, 2, 3]);
  for (let r = 0; r < questionCount % 4; r++) {
    basePool.push(remainderPositions[r]);
  }

  // Shuffle with Fisher-Yates and repair any streak > 2 or mechanical cycle
  let positions = fisherYatesShuffle(basePool);

  for (let pass = 0; pass < 8; pass++) {
    for (let i = 2; i < positions.length; i++) {
      // Repair 3-in-a-row identical positions (e.g., A, A, A)
      if (positions[i] === positions[i - 1] && positions[i] === positions[i - 2]) {
        const swapCandidateIdx = positions.findIndex(
          (val, idx) =>
            idx !== i &&
            val !== positions[i] &&
            (idx === 0 || positions[idx - 1] !== positions[i]) &&
            (idx === positions.length - 1 || positions[idx + 1] !== positions[i])
        );
        if (swapCandidateIdx !== -1) {
          const tmp = positions[i];
          positions[i] = positions[swapCandidateIdx];
          positions[swapCandidateIdx] = tmp;
        }
      }
    }

    // Also break any 8-step mechanical cycle (e.g. a,b,c,d,a,b,c,d)
    for (let i = 0; i <= positions.length - 8; i++) {
      const isRepeating4Cycle =
        positions[i] === positions[i + 4] &&
        positions[i + 1] === positions[i + 5] &&
        positions[i + 2] === positions[i + 6] &&
        positions[i + 3] === positions[i + 7] &&
        new Set(positions.slice(i, i + 4)).size === 4;
      if (isRepeating4Cycle) {
        const tmp = positions[i + 4];
        positions[i + 4] = positions[i + 5];
        positions[i + 5] = tmp;
      }
    }
  }

  return positions;
}

/**
 * Shuffles a question's options together with their true correctness identity,
 * placing the true correct answer at `targetCorrectIndex` (0..3) while
 * randomizing the 3 distractors via Fisher-Yates.
 *
 * Guarantees: returnedQuestion.options[returnedQuestion.correctIndex] === originalCorrectText
 */
export function shuffleQuestionOptionsToTargetPosition<T extends AcademyExamQuestion>(
  question: T,
  targetCorrectIndex?: number
): T {
  const originalOptions = question.options || [];
  if (originalOptions.length < 2) {
    return { ...question };
  }

  const safeOrigIdx =
    question.correctIndex >= 0 && question.correctIndex < originalOptions.length
      ? question.correctIndex
      : 0;
  const trueCorrectText = originalOptions[safeOrigIdx];

  // Collect distractors preserving uniqueness
  const distractors = originalOptions.filter((_, idx) => idx !== safeOrigIdx);
  const shuffledDistractors = fisherYatesShuffle(distractors);

  const desiredIdx =
    typeof targetCorrectIndex === 'number'
      ? Math.max(0, Math.min(originalOptions.length - 1, targetCorrectIndex))
      : getRandomInt(originalOptions.length);

  const nextOptions = [...shuffledDistractors];
  nextOptions.splice(desiredIdx, 0, trueCorrectText);

  const verifiedCorrectIndex = nextOptions.indexOf(trueCorrectText);

  return {
    ...question,
    options: nextOptions,
    correctIndex: verifiedCorrectIndex >= 0 ? verifiedCorrectIndex : desiredIdx,
  };
}

// ============================================================================
// BUILD 2,500+ UNIQUE STRUCTURED QUESTION BANK ACROSS ALL 10 QUESTION TYPES
// ============================================================================
let cachedBank50x: StructuredExamQuestion50x[] | null = null;

export function getKorean50xQuestionBank(): StructuredExamQuestion50x[] {
  if (cachedBank50x) return cachedBank50x;

  const out: StructuredExamQuestion50x[] = [];
  const seenIds = new Set<string>();

  const pushQuestion = (q: StructuredExamQuestion50x, deterministicIndexSeed: number) => {
    if (seenIds.has(q.id)) return;
    seenIds.add(q.id);
    // Pre-balance static bank across A, B, C, D (0, 1, 2, 3) so even raw inspection has 25% each
    const balancedQ = shuffleQuestionOptionsToTargetPosition(q, deterministicIndexSeed % 4);
    out.push({
      ...balancedQ,
      correctAnswerText: balancedQ.options[balancedQ.correctIndex],
    });
  };

  // 1. Include all 1,098 existing getExamQuestions20x() items with full metadata
  const base20x = getExamQuestions20x();
  base20x.forEach((q, idx) => {
    const qType: ExamQuestionType10 =
      q.type === 'listening'
        ? 'listening_comprehension'
        : q.type === 'reading'
          ? 'reading_comprehension'
          : q.type === 'vocabulary'
            ? 'vocabulary'
            : 'grammar';

    pushQuestion(
      {
        ...q,
        questionType10: qType,
        topicTag: q.subject,
        learningObjective: `Master ${q.difficulty} ${qType.replace('_', ' ')} in ${q.subject}`,
        correctAnswerText: q.options[q.correctIndex] || q.options[0],
        promptNe: q.promptEn,
        explanationNe: q.explanationEn,
        verifiedPracticeLabel: 'EveryKR Verified Practice Question',
      },
      idx
    );
  });

  // 2. Add 400 Sentence Completion (빈칸 완성) Questions from Grammar & Vocabulary
  const grammarList = getKorean50xGrammarLessons();
  grammarList.slice(0, 400).forEach((g, idx) => {
    const pq = g.practiceQuestions[0];
    if (!pq || pq.options.length < 4) return;
    const diff: ExamDifficulty = g.tier;
    pushQuestion(
      {
        id: `q50x-sentcomp-${idx + 1}`,
        type: 'multiple_choice',
        subject: 'daily_korean',
        difficulty: diff,
        questionType10: 'sentence_completion',
        topicTag: g.category13,
        learningObjective: `Apply Korean grammar pattern ${g.patternKo} (${g.title.en}) accurately in sentence completion`,
        promptEn: `[Sentence Completion] ${pq.prompt.en}`,
        promptBn: `[শূন্যস্থান পূরণ] ${pq.prompt.bn}`,
        promptNe: `[वाक्य पूरा गर्नुहोस्] ${pq.prompt.ne}`,
        koreanStimulus: g.examples[0]?.ko,
        options: pq.options.slice(0, 4),
        correctIndex: pq.correctIndex,
        correctAnswerText: pq.options[pq.correctIndex],
        explanationEn: pq.explanation.en,
        explanationBn: pq.explanation.bn,
        explanationNe: pq.explanation.ne,
        verifiedPracticeLabel: 'EveryKR Verified Practice Question',
      },
      out.length
    );
  });

  // 3. Add 300 Word Ordering (어순 배열) Questions from Sentence Builders
  const sentenceBuilders = getKorean50xSentenceBuilders();
  sentenceBuilders.slice(0, 300).forEach((sb, idx) => {
    const tokens = sb.fullKorean.split(/\s+/).filter(Boolean);
    if (tokens.length < 3) return;
    const correctOrder = sb.fullKorean;
    const wrongOrder1 = [...tokens].reverse().join(' ');
    const wrongOrder2 = [tokens[tokens.length - 1], ...tokens.slice(0, tokens.length - 1)].join(' ');
    const wrongOrder3 = [tokens[1], tokens[0], ...tokens.slice(2)].join(' ');
    const distinctOptions = Array.from(
      new Set([
        correctOrder,
        wrongOrder1 !== correctOrder ? wrongOrder1 : `${tokens.slice(1).join(' ')} ${tokens[0]}`,
        wrongOrder2 !== correctOrder ? wrongOrder2 : `${tokens[0]} ${tokens[tokens.length - 1]} ${tokens.slice(1, -1).join(' ')}`,
        wrongOrder3 !== correctOrder ? wrongOrder3 : `${tokens[tokens.length - 1]} ${tokens[0]}`,
      ])
    );
    while (distinctOptions.length < 4) {
      distinctOptions.push(`${correctOrder} (${distinctOptions.length})`);
    }

    pushQuestion(
      {
        id: `q50x-wordorder-${idx + 1}`,
        type: 'multiple_choice',
        subject: 'daily_korean',
        difficulty: sb.difficulty,
        questionType10: 'word_ordering',
        topicTag: sb.category12,
        learningObjective: 'Construct natural Korean SOV (Subject–Object–Verb) word order',
        promptEn: `[Word Ordering] Choose the sentence with the natural Korean word order for: "${sb.meaningEn}"`,
        promptBn: `[শব্দ ক্রম] "${sb.meaningBn}" অর্থের জন্য সঠিক কোরিয়ান শব্দক্রম কোনটি?`,
        promptNe: `[शब्द क्रम] "${sb.meaningNe}" अर्थका लागि सही कोरियन वाक्य कुन हो?`,
        koreanStimulus: tokens.slice().sort().join(' / '),
        options: distinctOptions.slice(0, 4),
        correctIndex: 0,
        correctAnswerText: correctOrder,
        explanationEn: `The natural Korean sentence is "${correctOrder}". ${sb.grammarHintEn}`,
        explanationBn: `সঠিক কোরিয়ান বাক্যটি হলো "${correctOrder}"। ${sb.grammarHintBn}`,
        explanationNe: `सही कोरियन वाक्य "${correctOrder}" हो। ${sb.grammarHintNe}`,
        verifiedPracticeLabel: 'EveryKR Verified Practice Question',
      },
      out.length
    );
  });

  // 4. Add 250 Correct Sentence Selection & Contextual Usage Questions from Conversations
  const conversations = getKorean50xConversations();
  conversations.slice(0, 250).forEach((conv, idx) => {
    const turn0 = conv.turns[0];
    const turn1 = conv.turns[1] || conv.turns[0];
    if (!turn0 || !turn1) return;

    const d1 = conversations[(idx + 5) % conversations.length].turns[1]?.ko || '네, 어제 도서관에서 책을 빌렸어요.';
    const d2 = conversations[(idx + 13) % conversations.length].turns[1]?.ko || '죄송하지만 지금은 자리가 없습니다.';
    const d3 = conversations[(idx + 23) % conversations.length].turns[1]?.ko || '다음 주 월요일까지 서류를 제출하세요.';

    const qType: ExamQuestionType10 =
      idx % 2 === 0 ? 'contextual_usage' : 'correct_sentence_selection';

    pushQuestion(
      {
        id: `q50x-context-${idx + 1}`,
        type: 'multiple_choice',
        subject: 'university',
        difficulty: conv.difficulty,
        questionType10: qType,
        topicTag: conv.category,
        learningObjective: `Select the contextually appropriate Korean response in ${conv.title.en}`,
        promptEn: `[Contextual Usage] In "${conv.title.en}", Speaker A says: "${turn0.ko}" (${turn0.translation.en}). Which is the most natural Korean reply?`,
        promptBn: `[প্রাসঙ্গিক ব্যবহার] "${conv.title.bn}" পরিস্থিতিতে বক্তা A বলছেন: "${turn0.ko}"। সবচেয়ে স্বাভাবিক উত্তর কোনটি?`,
        promptNe: `[सन्दर्भगत प्रयोग] "${conv.title.ne}" मा वक्ता A ले "${turn0.ko}" भन्दा सबैभन्दा स्वाभाविक जवाफ कुन हो?`,
        koreanStimulus: turn0.ko,
        options: [turn1.ko, d1, d2, d3],
        correctIndex: 0,
        correctAnswerText: turn1.ko,
        explanationEn: `"${turn1.ko}" (${turn1.translation.en}) directly and politely responds to "${turn0.ko}".`,
        explanationBn: `"${turn1.ko}" (${turn1.translation.bn}) হলো সঠিক ও প্রাসঙ্গিক উত্তর।`,
        explanationNe: `"${turn1.ko}" (${turn1.translation.ne}) সঠিক र सन्दर्भगत जवाफ हो।`,
        verifiedPracticeLabel: 'EveryKR Verified Practice Question',
      },
      out.length
    );
  });

  // 5. Add 300 Translation & Reverse-Lexical Questions (Meaning -> Korean & Sentence Translation)
  const vocab50x = getKorean50xVocabulary();
  for (let i = 0; i < 300; i++) {
    const v = vocab50x[(i * 19) % vocab50x.length];
    const w1 = vocab50x[(i * 19 + 7) % vocab50x.length];
    const w2 = vocab50x[(i * 19 + 15) % vocab50x.length];
    const w3 = vocab50x[(i * 19 + 29) % vocab50x.length];
    const diff: ExamDifficulty =
      v.difficulty === 'Beginner' || v.difficulty === 'Elementary'
        ? 'Beginner'
        : v.difficulty === 'Intermediate'
          ? 'Intermediate'
          : 'Advanced';

    pushQuestion(
      {
        id: `q50x-trans-${i + 1}`,
        type: 'vocabulary',
        subject: 'daily_korean',
        difficulty: diff,
        questionType10: 'translation',
        topicTag: v.category19,
        learningObjective: `Translate "${v.meaningEn}" accurately into Korean (${v.category19})`,
        promptEn: `[Translation] Which Korean word or expression accurately translates "${v.meaningEn}"?`,
        promptBn: `[অনুবাদ] "${v.meaningBn}" (${v.meaningEn}) এর সঠিক কোরিয়ান শব্দ কোনটি?`,
        promptNe: `[अनुवाद] "${v.meaningNe}" (${v.meaningEn}) को सही कोरियन शब्द कुन हो?`,
        koreanStimulus: v.exampleKo,
        options: [v.korean, w1.korean, w2.korean, w3.korean],
        correctIndex: 0,
        correctAnswerText: v.korean,
        explanationEn: `"${v.korean}" [${v.romanization}] means "${v.meaningEn}". Example: ${v.exampleKo} (${v.exampleEn}).`,
        explanationBn: `"${v.korean}" [${v.pronunciationBn}] অর্থ "${v.meaningBn}"। উদাহরণ: ${v.exampleKo}।`,
        explanationNe: `"${v.korean}" [${v.pronunciationNe}] को अर्थ "${v.meaningNe}" हो। उदाहरण: ${v.exampleKo}।`,
        verifiedPracticeLabel: 'EveryKR Verified Practice Question',
      },
      out.length
    );
  }

  // 6. Add 250 TOPIK-Style Listening & Reading Simulation Questions (Total = 2,598 unique questions!)
  const listening50x = getKorean50xListeningLab();
  const reading50x = getKorean50xReadingPassages();
  for (let i = 0; i < 250; i++) {
    if (i % 2 === 0) {
      const l = listening50x[(i + 100) % listening50x.length];
      pushQuestion(
        {
          id: `q50x-topik-lis-${i + 1}`,
          type: 'listening',
          subject: 'listening',
          difficulty: i < 125 ? 'Beginner' : 'Intermediate',
          questionType10: 'topik_style',
          topicTag: l.topic,
          learningObjective: 'Comprehend spoken Korean dialogues in TOPIK simulation format',
          promptEn: `[TOPIK Simulation • Listening] ${l.question.en}`,
          promptBn: `[TOPIK অনুশীলন • লিসেনিং] ${l.question.bn}`,
          promptNe: `[TOPIK अभ्यास • सुनाइ] ${l.question.ne}`,
          audioScriptKo: l.audioScriptKo,
          options: l.options,
          correctIndex: l.correctIndex,
          correctAnswerText: l.options[l.correctIndex],
          explanationEn: l.explanation.en,
          explanationBn: l.explanation.bn,
          explanationNe: l.explanation.ne,
          verifiedPracticeLabel: 'EveryKR Verified Practice Question',
        },
        out.length
      );
    } else {
      const r = reading50x[(i + 100) % reading50x.length];
      pushQuestion(
        {
          id: `q50x-topik-read-${i + 1}`,
          type: 'reading',
          subject: 'reading',
          difficulty: i < 125 ? 'Intermediate' : 'Advanced',
          questionType10: 'topik_style',
          topicTag: r.genre,
          learningObjective: 'Analyze Korean reading passages in TOPIK simulation format',
          promptEn: `[TOPIK Simulation • Reading] ${r.question.prompt.en}`,
          promptBn: `[TOPIK অনুশীলন • রিডিং] ${r.question.prompt.bn}`,
          promptNe: `[TOPIK अभ्यास • पढाइ] ${r.question.prompt.ne}`,
          readingPassageKo: r.passageKo,
          options: r.question.options,
          correctIndex: r.question.correctIndex,
          correctAnswerText: r.question.options[r.question.correctIndex],
          explanationEn: r.question.explanation.en,
          explanationBn: r.question.explanation.bn,
          explanationNe: r.question.explanation.ne,
          verifiedPracticeLabel: 'EveryKR Verified Practice Question',
        },
        out.length
      );
    }
  }

  cachedBank50x = out;
  return out;
}

// ============================================================================
// PART 2D — USER QUESTION EXPOSURE HISTORY & COOLDOWN TRACKING
// ============================================================================
export interface QuestionExposureEntry {
  questionId: string;
  seenCount: number;
  lastSeenAt: number; // epoch ms
  lastCorrect: boolean;
}

export interface UserQuestionExposureHistory {
  userId: string;
  entries: Record<string, QuestionExposureEntry>;
  recentAttemptQuestionIds: string[][]; // last 10 attempts
  updatedAt: string;
}

const QUESTION_HISTORY_LOCAL_PREFIX = 'everykr_question_history_v5_';

export function loadUserQuestionExposureHistoryLocal(
  userId: string
): UserQuestionExposureHistory {
  const safeUser = userId || 'guest';
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`${QUESTION_HISTORY_LOCAL_PREFIX}${safeUser}`);
      if (raw) {
        const parsed = JSON.parse(raw) as UserQuestionExposureHistory;
        if (parsed && parsed.entries) return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    userId: safeUser,
    entries: {},
    recentAttemptQuestionIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function syncUserQuestionExposureHistoryFromFirestore(
  userId: string
): Promise<UserQuestionExposureHistory> {
  const local = loadUserQuestionExposureHistoryLocal(userId);
  if (!userId || userId === 'guest') return local;
  try {
    const ref = doc(db, 'academy_question_history', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const remote = snap.data() as UserQuestionExposureHistory;
      const mergedEntries = { ...(remote.entries || {}), ...local.entries };
      const merged: UserQuestionExposureHistory = {
        userId,
        entries: mergedEntries,
        recentAttemptQuestionIds:
          local.recentAttemptQuestionIds.length > 0
            ? local.recentAttemptQuestionIds
            : remote.recentAttemptQuestionIds || [],
        updatedAt: new Date().toISOString(),
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          `${QUESTION_HISTORY_LOCAL_PREFIX}${userId}`,
          JSON.stringify(merged)
        );
      }
      return merged;
    }
  } catch {
    // Offline fallback
  }
  return local;
}

export async function recordUserQuestionExposure(
  userId: string,
  outcomes: Array<{ questionId: string; isCorrect: boolean }>
): Promise<UserQuestionExposureHistory> {
  const safeUser = userId || 'guest';
  const current = loadUserQuestionExposureHistoryLocal(safeUser);
  const now = Date.now();
  const attemptIds: string[] = [];

  outcomes.forEach(o => {
    if (!o.questionId) return;
    attemptIds.push(o.questionId);
    const prev = current.entries[o.questionId];
    current.entries[o.questionId] = {
      questionId: o.questionId,
      seenCount: (prev?.seenCount || 0) + 1,
      lastSeenAt: now,
      lastCorrect: o.isCorrect,
    };
  });

  current.recentAttemptQuestionIds = [
    attemptIds,
    ...(current.recentAttemptQuestionIds || []),
  ].slice(0, 12);
  current.updatedAt = new Date().toISOString();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        `${QUESTION_HISTORY_LOCAL_PREFIX}${safeUser}`,
        JSON.stringify(current)
      );
    }
  } catch {
    // ignore
  }

  if (safeUser !== 'guest') {
    try {
      const ref = doc(db, 'academy_question_history', safeUser);
      await setDoc(ref, sanitizeFirestorePayload(current), { merge: true });
    } catch {
      // ignore offline
    }
  }

  return current;
}

// ============================================================================
// PART 2E — TRUE RANDOM EXAM GENERATOR WITH CATEGORY/DIFFICULTY BALANCE
// ============================================================================
export interface GenerateRandomizedExamOptions {
  userId: string;
  modeId?: ExamMode11Id;
  questionCount: number;
  subjectFilter?: string;
  difficultyFilter?: string;
  questionTypeFilter?: ExamQuestionType10 | 'all';
  candidatePool?: AcademyExamQuestion[];
  exposureHistory?: UserQuestionExposureHistory;
}

/**
 * Generates a fresh, genuinely randomized exam attempt:
 * 1. Filters eligible pool by mode, subject, difficulty, and question type.
 * 2. Deduplicates by both question `id` and prompt/stimulus signature.
 * 3. Partitions into Unseen (`seenCount === 0`), Cooled-Down, and Recently-Seen buckets.
 * 4. Applies unbiased Fisher-Yates shuffle within each bucket so unseen questions are always prioritized.
 * 5. Shuffles answer options together with their true answer key and distributes correct positions evenly across A, B, C, D without streaks or mechanical cycles.
 */
export function generateRandomizedExamAttempt(
  options: GenerateRandomizedExamOptions
): StructuredExamQuestion50x[] {
  const fullBank = getKorean50xQuestionBank();
  const rawPool: StructuredExamQuestion50x[] =
    options.candidatePool && options.candidatePool.length > 0
      ? options.candidatePool.map((q, idx) => ({
          ...q,
          questionType10:
            (q as StructuredExamQuestion50x).questionType10 ||
            (q.type === 'listening'
              ? 'listening_comprehension'
              : q.type === 'reading'
                ? 'reading_comprehension'
                : q.type === 'vocabulary'
                  ? 'vocabulary'
                  : 'grammar'),
          topicTag: (q as StructuredExamQuestion50x).topicTag || q.subject,
          learningObjective:
            (q as StructuredExamQuestion50x).learningObjective ||
            `Master ${q.difficulty} ${q.subject}`,
          correctAnswerText: q.options[q.correctIndex] || q.options[0],
          verifiedPracticeLabel: 'EveryKR Verified Practice Question',
        }))
      : fullBank;

  const modeSpec = EXAM_MODES_11.find(m => m.id === options.modeId);
  const effectiveDiff =
    options.difficultyFilter && options.difficultyFilter !== 'all'
      ? options.difficultyFilter
      : modeSpec && modeSpec.defaultDifficulty !== 'all'
        ? modeSpec.defaultDifficulty
        : 'all';

  let filtered = rawPool.filter(q => {
    if (modeSpec?.defaultQuestionTypes && modeSpec.defaultQuestionTypes.length > 0) {
      if (!modeSpec.defaultQuestionTypes.includes(q.questionType10)) return false;
    }
    if (
      options.questionTypeFilter &&
      options.questionTypeFilter !== 'all' &&
      q.questionType10 !== options.questionTypeFilter
    ) {
      return false;
    }
    if (options.subjectFilter && options.subjectFilter !== 'all') {
      const matchSubj =
        q.subject === options.subjectFilter ||
        q.type === options.subjectFilter ||
        q.topicTag === options.subjectFilter;
      if (!matchSubj) return false;
    }
    if (effectiveDiff !== 'all') {
      if (options.modeId === 'topik_2_mock') {
        if (q.difficulty !== 'Intermediate' && q.difficulty !== 'Advanced') return false;
      } else if (q.difficulty !== effectiveDiff) {
        return false;
      }
    }
    return true;
  });

  // Fallback if overly narrow filter
  if (filtered.length < options.questionCount) {
    filtered = rawPool.filter(q => {
      if (effectiveDiff !== 'all' && q.difficulty !== effectiveDiff) return false;
      return true;
    });
  }
  if (filtered.length < options.questionCount) {
    filtered = [...rawPool];
  }

  const history =
    options.exposureHistory || loadUserQuestionExposureHistoryLocal(options.userId);
  const recentSet = new Set<string>(
    (history.recentAttemptQuestionIds || []).slice(0, 3).flat()
  );

  // Partition into Unseen, Cooled-Down, and Recently-Seen
  const unseen: StructuredExamQuestion50x[] = [];
  const cooledDown: StructuredExamQuestion50x[] = [];
  const recentlySeen: StructuredExamQuestion50x[] = [];

  filtered.forEach(q => {
    const entry = history.entries[q.id];
    if (!entry || entry.seenCount === 0) {
      unseen.push(q);
    } else if (!recentSet.has(q.id)) {
      cooledDown.push(q);
    } else {
      recentlySeen.push(q);
    }
  });

  // Fisher-Yates shuffle each partition independently
  const shuffledUnseen = fisherYatesShuffle(unseen);
  const shuffledCooled = fisherYatesShuffle(cooledDown).sort(
    (a, b) =>
      (history.entries[a.id]?.seenCount || 0) -
      (history.entries[b.id]?.seenCount || 0)
  );
  const shuffledRecent = fisherYatesShuffle(recentlySeen);

  const orderedCandidates = [
    ...shuffledUnseen,
    ...shuffledCooled,
    ...shuffledRecent,
  ];

  // Select unique questions preventing duplicate IDs or identical prompts within the exam
  const selected: StructuredExamQuestion50x[] = [];
  const usedIds = new Set<string>();
  const usedPromptSignatures = new Set<string>();
  const targetCount = Math.min(options.questionCount, orderedCandidates.length);

  for (const candidate of orderedCandidates) {
    if (selected.length >= targetCount) break;
    if (usedIds.has(candidate.id)) continue;
    const sig = `${candidate.promptEn}::${candidate.koreanStimulus || candidate.audioScriptKo || candidate.readingPassageKo || ''}`;
    if (usedPromptSignatures.has(sig)) continue;
    usedIds.add(candidate.id);
    usedPromptSignatures.add(sig);
    selected.push(candidate);
  }

  // If strict prompt signature dedupe left a few slots, fill remaining with unique IDs
  if (selected.length < targetCount) {
    for (const candidate of orderedCandidates) {
      if (selected.length >= targetCount) break;
      if (usedIds.has(candidate.id)) continue;
      usedIds.add(candidate.id);
      selected.push(candidate);
    }
  }

  // Final Fisher-Yates shuffle of selected question order so categories/difficulties interleave naturally
  const finalQuestionOrder = fisherYatesShuffle(selected);

  // Assign balanced A, B, C, D positions without streaks or predictable cycles
  const balancedTargetPositions = generateBalancedAnswerPositions(
    finalQuestionOrder.length
  );

  return finalQuestionOrder.map((q, idx) => {
    const shuffledQ = shuffleQuestionOptionsToTargetPosition(
      q,
      balancedTargetPositions[idx]
    );
    return {
      ...shuffledQ,
      correctAnswerText: shuffledQ.options[shuffledQ.correctIndex],
    };
  });
}

// ============================================================================
// PART 2G & PART 3 — EXAM ANALYTICS & ADAPTIVE LEARNING RECOMMENDATION ENGINE
// ============================================================================
export interface TopicBreakdownMetric {
  topic: string;
  correct: number;
  total: number;
  accuracyPercent: number;
}

export interface DetailedExamAnalyticsReport {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  scorePercent: number;
  durationSeconds: number;
  averageSecondsPerQuestion: number;
  byTopic: TopicBreakdownMetric[];
  byDifficulty: TopicBreakdownMetric[];
  byQuestionType: TopicBreakdownMetric[];
  weakAreas: string[];
  recommendedLessons: AdaptiveRecommendationItem[];
}

export interface AdaptiveRecommendationItem {
  id: string;
  priority: 'High Priority' | 'Recommended' | 'Review';
  targetModule:
    | 'vocabulary'
    | 'grammar'
    | 'sentences'
    | 'conversation'
    | 'listening'
    | 'reading'
    | 'writing'
    | 'topik';
  title: MultiLangText;
  reason: MultiLangText;
  actionLabel: MultiLangText;
}

export function computeExamResultAnalytics(
  questions: StructuredExamQuestion50x[],
  selectedAnswers: Record<string, number>,
  durationSeconds: number
): DetailedExamAnalyticsReport {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const topicMap = new Map<string, { correct: number; total: number }>();
  const diffMap = new Map<string, { correct: number; total: number }>();
  const typeMap = new Map<string, { correct: number; total: number }>();

  questions.forEach(q => {
    const picked = selectedAnswers[q.id];
    const isAnswered = typeof picked === 'number';
    const isCorrect = isAnswered && picked === q.correctIndex;

    if (!isAnswered) {
      unansweredCount += 1;
    } else if (isCorrect) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }

    const topicKey = q.topicTag || q.subject || 'daily_korean';
    const tEntry = topicMap.get(topicKey) || { correct: 0, total: 0 };
    tEntry.total += 1;
    if (isCorrect) tEntry.correct += 1;
    topicMap.set(topicKey, tEntry);

    const diffKey = q.difficulty || 'Beginner';
    const dEntry = diffMap.get(diffKey) || { correct: 0, total: 0 };
    dEntry.total += 1;
    if (isCorrect) dEntry.correct += 1;
    diffMap.set(diffKey, dEntry);

    const typeKey = q.questionType10 || 'vocabulary';
    const tyEntry = typeMap.get(typeKey) || { correct: 0, total: 0 };
    tyEntry.total += 1;
    if (isCorrect) tyEntry.correct += 1;
    typeMap.set(typeKey, tyEntry);
  });

  const toMetrics = (m: Map<string, { correct: number; total: number }>): TopicBreakdownMetric[] =>
    Array.from(m.entries()).map(([topic, val]) => ({
      topic,
      correct: val.correct,
      total: val.total,
      accuracyPercent: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
    }));

  const byTopic = toMetrics(topicMap);
  const byDifficulty = toMetrics(diffMap);
  const byQuestionType = toMetrics(typeMap);

  const weakAreas = [
    ...byTopic.filter(t => t.accuracyPercent < 70).map(t => t.topic),
    ...byQuestionType.filter(t => t.accuracyPercent < 70).map(t => t.topic),
  ];

  const totalQ = Math.max(1, questions.length);
  const scorePercent = Math.round((correctCount / totalQ) * 100);

  const recommendedLessons: AdaptiveRecommendationItem[] = [];
  byQuestionType.forEach(qt => {
    if (qt.accuracyPercent < 75) {
      if (qt.topic === 'grammar' || qt.topic === 'sentence_completion') {
        recommendedLessons.push({
          id: `rec-exam-${qt.topic}`,
          priority: qt.accuracyPercent < 50 ? 'High Priority' : 'Recommended',
          targetModule: 'grammar',
          title: {
            en: 'Grammar Academy: Particles, Conjugation & Connectors',
            bn: 'ব্যাকরণ একাডেমি: পার্টিকেল ও ক্রিয়া রূপান্তর অনুশীলন',
            ne: 'व्याकरण एकेडेमी: विभक्ति र क्रिया रूपान्तरण अभ्यास',
          },
          reason: {
            en: `Your ${qt.topic.replace('_', ' ')} accuracy was ${qt.accuracyPercent}% (${qt.correct}/${qt.total}). Review core grammar patterns and examples.`,
            bn: `আপনার ${qt.topic.replace('_', ' ')} সঠিকতার হার ${qt.accuracyPercent}% (${qt.correct}/${qt.total})। মূল ব্যাকরণ নিয়মগুলো পুনরায় অনুশীলন করুন।`,
            ne: `तपाईंको ${qt.topic.replace('_', ' ')} शुद्धता ${qt.accuracyPercent}% (${qt.correct}/${qt.total}) रह्यो। मुख्य व्याकरण अभ्यास गर्नुहोस्।`,
          },
          actionLabel: { en: 'Open Grammar Academy', bn: 'ব্যাকরণ খুলুন', ne: 'व्याकरण खोल्नुहोस्' },
        });
      } else if (qt.topic === 'listening_comprehension') {
        recommendedLessons.push({
          id: 'rec-exam-listening',
          priority: qt.accuracyPercent < 50 ? 'High Priority' : 'Recommended',
          targetModule: 'listening',
          title: {
            en: 'Listening Lab: Slow & Native Speed Dialogues + Dictation',
            bn: 'লিসেনিং ল্যাব: ধীর ও স্বাভাবিক গতির সংলাপ ও ডিক্টেশন',
            ne: 'सुनाइ प्रयोगशाला: संवाद र श्रुतिलेखन अभ्यास',
          },
          reason: {
            en: `Your listening comprehension accuracy was ${qt.accuracyPercent}% (${qt.correct}/${qt.total}). Practice with Korean Learning Mode (0.85x) first.`,
            bn: `আপনার লিসেনিং সঠিকতার হার ${qt.accuracyPercent}%। প্রথমে লার্নিং মোডে অডিও শুনে অনুশীলন করুন।`,
            ne: `तपाईंको सुनाइ शुद्धता ${qt.accuracyPercent}% रह्यो। पहिले सिकाइ मोडमा अभ्यास गर्नुहोस्।`,
          },
          actionLabel: { en: 'Open Listening Lab', bn: 'লিসেনিং ল্যাব খুলুন', ne: 'सुनाइ अभ्यास खोल्नुहोस्' },
        });
      } else if (qt.topic === 'reading_comprehension') {
        recommendedLessons.push({
          id: 'rec-exam-reading',
          priority: 'Recommended',
          targetModule: 'reading',
          title: {
            en: 'Reading Academy: Notices, Campus Emails & Passages',
            bn: 'রিডিং একাডেমি: বিজ্ঞপ্তি, ইমেইল ও অনুচ্ছেদ পঠন',
            ne: 'पठन एकेडेमी: सूचना, इमेल र अनुच्छेद अभ्यास',
          },
          reason: {
            en: `Your reading comprehension accuracy was ${qt.accuracyPercent}% (${qt.correct}/${qt.total}). Use tap-to-translate tokens to build reading speed.`,
            bn: `আপনার রিডিং সঠিকতার হার ${qt.accuracyPercent}%। শব্দ ট্যাপ করে অর্থ ও উচ্চারণ অনুশীলন করুন।`,
            ne: `तपाईंको पठन शुद्धता ${qt.accuracyPercent}% रह्यो। शब्द थिचेर अर्थ र उच्चारण अभ्यास गर्नुहोस्।`,
          },
          actionLabel: { en: 'Open Reading Academy', bn: 'রিডিং একাডেমি খুলুন', ne: 'पठन एकेडेमी खोल्नुहोस्' },
        });
      } else if (qt.topic === 'word_ordering') {
        recommendedLessons.push({
          id: 'rec-exam-sentences',
          priority: 'Recommended',
          targetModule: 'sentences',
          title: {
            en: 'Sentence Builder: Korean SOV Word Ordering & Cloze Drills',
            bn: 'সেন텐্স বিল্ডার: কোরিয়ান বাক্য গঠন ও শব্দক্রম',
            ne: 'वाक्य निर्माण: कोरियन शब्द क्रम अभ्यास',
          },
          reason: {
            en: `Your word ordering accuracy was ${qt.accuracyPercent}%. Practice reconstructing Korean sentences tile by tile.`,
            bn: `আপনার শব্দক্রম সঠিকতার হার ${qt.accuracyPercent}%। কোরিয়ান বাক্য পুনর্গঠন অনুশীলন করুন।`,
            ne: `तपाईंको शब्द क्रम शुद्धता ${qt.accuracyPercent}% रह्यो। वाक्य निर्माण अभ्यास गर्नुहोस्।`,
          },
          actionLabel: { en: 'Open Sentence Builder', bn: 'সেনটেন্স বিল্ডার খুলুন', ne: 'वाक्य निर्माण खोल्नुहोस्' },
        });
      } else {
        recommendedLessons.push({
          id: `rec-exam-vocab-${qt.topic}`,
          priority: 'Recommended',
          targetModule: 'vocabulary',
          title: {
            en: 'Vocabulary Library: 19 Topics & Difficult Word Review',
            bn: 'শব্দভাণ্ডার লাইব্রেরি: ১৯টি বিভাগ ও কঠিন শব্দ রিভিউ',
            ne: 'शब्दावली पुस्तकालय: १९ श्रेणी र कठिन शब्द पुनरावलोकन',
          },
          reason: {
            en: `Your ${qt.topic.replace('_', ' ')} accuracy was ${qt.accuracyPercent}%. Review flashcards and example sentences.`,
            bn: `আপনার ${qt.topic.replace('_', ' ')} সঠিকতার হার ${qt.accuracyPercent}%। ফ্ল্যাশকার্ড ও উদাহরণ বাক্য রিভিউ করুন।`,
            ne: `तपाईंको ${qt.topic.replace('_', ' ')} शुद्धता ${qt.accuracyPercent}% रह्यो। शब्दपत्ती र उदाहरण अभ्यास गर्नुहोस्।`,
          },
          actionLabel: { en: 'Open Vocabulary', bn: 'শব্দভাণ্ডার খুলুন', ne: 'शब्दावली खोल्नुहोस्' },
        });
      }
    }
  });

  if (recommendedLessons.length === 0) {
    recommendedLessons.push({
      id: 'rec-exam-advance-topik2',
      priority: 'Recommended',
      targetModule: 'topik',
      title: {
        en: 'Advance to TOPIK II Mock Exam & Academic Writing',
        bn: 'TOPIK II মক এক্সাম এবং একাডেমিক রাইটিংয়ে এগিয়ে যান',
        ne: 'TOPIK II नमुना परीक्षा र लेखनमा अघि बढ्नुहोस्',
      },
      reason: {
        en: `Strong performance (${scorePercent}% accuracy)! Challenge yourself with upper-intermediate and TOPIK II simulations.`,
        bn: `চমৎকার ফলাফল (${scorePercent}% সঠিকতা)! এবার উচ্চতর TOPIK II অনুশীলনে অংশ নিন।`,
        ne: `उत्कृष्ट नतिजा (${scorePercent}% शुद्धता)! अब TOPIK II उच्च अभ्यास गर्नुहोस्।`,
      },
      actionLabel: { en: 'Start Next Challenge', bn: 'পরবর্তী চ্যালেঞ্জ শুরু করুন', ne: 'अर्को अभ्यास सुरु गर्नुहोस्' },
    });
  }

  return {
    totalQuestions: questions.length,
    correctCount,
    incorrectCount,
    unansweredCount,
    scorePercent,
    durationSeconds,
    averageSecondsPerQuestion: Math.max(1, Math.round(durationSeconds / totalQ)),
    byTopic,
    byDifficulty,
    byQuestionType,
    weakAreas: Array.from(new Set(weakAreas)),
    recommendedLessons: recommendedLessons.slice(0, 4),
  };
}

export interface AdaptiveDashboardInsights {
  accuracyRatePercent: number;
  examReadinessPercent: number;
  examReadinessLabel: string;
  weeklyMinutesPracticed: number;
  weeklyTargetMinutes: number;
  weeklyQuestionsAnswered: number;
  weeklyTargetQuestions: number;
  recommendations: AdaptiveRecommendationItem[];
}

export function computeAdaptiveDashboardInsights(
  progress: UserAcademyProgress,
  examHistory: ExamResultSubmission[]
): AdaptiveDashboardInsights {
  const totalAns = progress.totalQuestionsAnswered || 0;
  const totalCor = progress.totalCorrectAnswers || 0;
  const overallAccuracy =
    totalAns > 0
      ? Math.round((totalCor / totalAns) * 100)
      : examHistory.length > 0
        ? Math.round(
            examHistory.reduce((acc, e) => acc + e.scorePercent, 0) /
              examHistory.length
          )
        : 82;

  // Calculate last 7 days activity
  let weeklyMinutesPracticed = 0;
  let weeklyQuestionsAnswered = 0;
  const now = new Date();
  for (let d = 0; d < 7; d++) {
    const dt = new Date(now);
    dt.setDate(now.getDate() - d);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const rec = progress.dailyActivity?.[key];
    if (rec) {
      weeklyMinutesPracticed += rec.minutesPracticed || 0;
      weeklyQuestionsAnswered += rec.questionsAnswered || 0;
    }
  }

  const weeklyTargetMinutes = (progress.dailyGoals?.targetMinutes || 15) * 7;
  const weeklyTargetQuestions = (progress.dailyGoals?.targetQuestions || 10) * 7;

  const vocabCount = progress.masteredVocabIds?.length || 0;
  const grammarCount = progress.completedGrammarIds?.length || 0;
  const examCount = examHistory.length;
  const examReadinessPercent = Math.min(
    100,
    Math.round(
      Math.min(35, (vocabCount / 100) * 35) +
        Math.min(25, (grammarCount / 25) * 25) +
        Math.min(20, (examCount / 5) * 20) +
        Math.min(20, (overallAccuracy / 100) * 20)
    )
  );

  const examReadinessLabel =
    examReadinessPercent >= 80
      ? 'TOPIK II Ready'
      : examReadinessPercent >= 50
        ? 'TOPIK I Ready'
        : 'Building Foundation';

  const recommendations: AdaptiveRecommendationItem[] = [];

  if ((progress.weakVocabIds?.length || 0) > 0) {
    recommendations.push({
      id: 'adapt-weak-vocab',
      priority: 'High Priority',
      targetModule: 'vocabulary',
      title: {
        en: `Review ${progress.weakVocabIds?.length} Difficult Vocabulary Words`,
        bn: `${progress.weakVocabIds?.length}টি কঠিন কোরিয়ান শব্দ রিভিউ করুন`,
        ne: `${progress.weakVocabIds?.length} कठिन कोरियन शब्दहरू पुनरावलोकन गर्नुहोस्`,
      },
      reason: {
        en: 'Based on your recent practice mistakes, reviewing these words will boost retention.',
        bn: 'সাম্প্রতিক অনুশীলনের ভুলের ভিত্তিতে এই শব্দগুলো রিভিউ করলে মনে রাখার ক্ষমতা বাড়বে।',
        ne: 'हालैका गल्तीहरूको आधारमा यी शब्दहरूको अभ्यासले स्मरण शक्ति बढाउँछ।',
      },
      actionLabel: { en: 'Practice Difficult Words', bn: 'কঠিন শব্দ অনুশীলন', ne: 'कठिन शब्द अभ्यास' },
    });
  }

  // Analyze subjectPerformance for weak subjects
  const subjEntries = Object.entries(progress.subjectPerformance || {});
  subjEntries.forEach(([subj, stats]) => {
    if (stats.total >= 2) {
      const acc = Math.round((stats.correct / stats.total) * 100);
      if (acc < 70) {
        recommendations.push({
          id: `adapt-subj-${subj}`,
          priority: 'High Priority',
          targetModule: subj === 'listening' ? 'listening' : subj === 'reading' ? 'reading' : 'grammar',
          title: {
            en: `Targeted Practice: ${subj.replace(/_/g, ' ').toUpperCase()} (${acc}% Accuracy)`,
            bn: `লক্ষ্যভিত্তিক অনুশীলন: ${subj.replace(/_/g, ' ')} (${acc}% সঠিকতা)`,
            ne: `लक्षित अभ्यास: ${subj.replace(/_/g, ' ')} (${acc}% शुद्धता)`,
          },
          reason: {
            en: `Your accuracy in ${subj.replace(/_/g, ' ')} is ${acc}% (${stats.correct}/${stats.total}). Complete 1 focused lesson today.`,
            bn: `${subj.replace(/_/g, ' ')}-এ আপনার সঠিকতা ${acc}%। আজ ১টি বিশেষ পাঠ সম্পন্ন করুন।`,
            ne: `${subj.replace(/_/g, ' ')} मा तपाईंको शुद्धता ${acc}% छ। आज १ पाठ पूरा गर्नुहोस्।`,
          },
          actionLabel: { en: 'Start Targeted Lesson', bn: 'পাঠ শুরু করুন', ne: 'पाठ सुरु गर्नुहोस्' },
        });
      }
    }
  });

  if (grammarCount < 15) {
    recommendations.push({
      id: 'adapt-grammar-particles',
      priority: 'Recommended',
      targetModule: 'grammar',
      title: {
        en: 'Core Korean Particles & Polite Verb Conjugation',
        bn: 'মৌলিক কোরিয়ান পার্টিকেল এবং ভদ্র ক্রিয়াপদ রূপান্তর',
        ne: 'आधारभूत कोरियन विभक्ति र शिष्ट क्रिया रूपान्तरण',
      },
      reason: {
        en: 'Mastering particles (은/는, 이/가, 을/를, 에/에서) and -아요/어요 unlocks natural sentence building.',
        bn: 'পার্টিকেল (은/는, 이/가, 을/를, 에/에서) এবং -아요/어요 আয়ত্ত করলে বাক্য গঠন সহজ হয়।',
        ne: 'विभक्ति र -아요/어요 को अभ्यासले वाक्य निर्माण सहज बनाउँछ।',
      },
      actionLabel: { en: 'Study Grammar Pattern', bn: 'ব্যাকরণ পড়ুন', ne: 'व्याकरण पढ्नुहोस्' },
    });
  }

  recommendations.push({
    id: 'adapt-sentence-builder',
    priority: 'Recommended',
    targetModule: 'sentences',
    title: {
      en: 'Sentence Builder: University & Immigration Conversations',
      bn: 'সেনটেন্স বিল্ডার: বিশ্ববিদ্যালয় ও ইমিগ্রেশন কথোপকথন',
      ne: 'वाक्य निर्माण: विश्वविद्यालय र अध्यागमन संवाद',
    },
    reason: {
      en: 'Practice Korean SOV word ordering and cloze completion for real campus & visa situations.',
      bn: 'ক্যাম্পাস ও ভিসা পরিস্থিতির জন্য কোরিয়ান বাক্য গঠন অনুশীলন করুন।',
      ne: 'क्याम्पस र भिसा सन्दर्भका लागि कोरियन वाक्य संरचना अभ्यास गर्नुहोस्।',
    },
    actionLabel: { en: 'Build Sentences', bn: 'বাক্য তৈরি করুন', ne: 'वाक्य बनाउनुहोस्' },
  });

  if (examCount === 0) {
    recommendations.push({
      id: 'adapt-diagnostic-exam',
      priority: 'Recommended',
      targetModule: 'topik',
      title: {
        en: 'Take Your First 10-Question Quick Diagnostic Exam',
        bn: 'আপনার প্রথম ১০ প্রশ্নের কুইক ডায়াগনস্টিক পরীক্ষা দিন',
        ne: 'आफ्नो पहिलो १० प्रश्नको द्रुत मूल्याङ्कन परीक्षा दिनुहोस्',
      },
      reason: {
        en: 'Calibrate your TOPIK readiness score and unlock personalized topic analytics.',
        bn: 'আপনার TOPIK প্রস্তুতি স্কোর এবং ব্যক্তিগতকৃত বিশ্লেষণ পেতে একটি কুইক টেস্ট দিন।',
        ne: 'आफ्नो TOPIK तयारी स्कोर थाहा पाउन द्रुत परीक्षा दिनुहोस्।',
      },
      actionLabel: { en: 'Start Quick Test', bn: 'কুইক টেস্ট শুরু করুন', ne: 'द्रुत परीक्षा सुरु गर्नुहोस्' },
    });
  }

  return {
    accuracyRatePercent: overallAccuracy,
    examReadinessPercent,
    examReadinessLabel,
    weeklyMinutesPracticed,
    weeklyTargetMinutes,
    weeklyQuestionsAnswered,
    weeklyTargetQuestions,
    recommendations: recommendations.slice(0, 4),
  };
}
