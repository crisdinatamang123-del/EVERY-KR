import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  GraduationCap,
  Lightbulb,
  Lock,
  Send,
  UserPlus,
  Volume2,
  X,
} from 'lucide-react';
import {
  HANGUL_CONSONANTS_19,
  HANGUL_READING_PRACTICE_ITEMS,
  HANGUL_SECTION_QUIZ,
  HANGUL_VOWELS_21,
} from '../../data/learnKoreanHangulAndVocab';
import {
  INITIAL_CONSONANTS,
  MEDIAL_VOWELS,
  FINAL_BATCHIM,
} from '../../data/hangulData';
import {
  getScriptPronunciation,
  LearningExplanationLang,
  pickTriLingual,
} from '../../utils/hangulPhonetics';
import { playKoreanAudio } from '../../services/koreanAcademyService';
import { HandwritingCanvasTab } from './HandwritingCanvasTab';

export type LearnKoreanModuleId =
  | 'dashboard'
  | 'hangul'
  | 'vocabulary'
  | 'grammar'
  | 'sentences'
  | 'conversation'
  | 'listening'
  | 'speaking'
  | 'reading'
  | 'writing'
  | 'topik'
  | 'daily_korean'
  | 'everyday_life'
  | 'ai_tutor'
  | 'progress'
  | 'admin';

interface AuthGateProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export const LearnKoreanAuthGate: React.FC<AuthGateProps> = ({
  onLoginClick,
  onRegisterClick,
}) => {
  return (
    <div className="dark min-h-[82vh] bg-[#071124] text-slate-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-[#0D1A33] rounded-3xl border border-[#1E3359] p-8 sm:p-10 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
          <GraduationCap className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#132445] border border-blue-500/20 text-blue-300 text-xs font-bold tracking-wider uppercase">
            <span>EVERYKR Learn Korean</span>
            <span>•</span>
            <span>한국어 학습</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Start Your Korean Learning Journey
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
            Sign in to your EVERYKR account to track your Korean level, save vocabulary, practice pronunciation, and prepare for TOPIK.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-left">
          {[
            { title: 'Hangul & Audio', desc: 'Interactive vowels & stroke order' },
            { title: 'Vocabulary & Grammar', desc: 'Structured by level & topic' },
            { title: 'TOPIK Preparation', desc: 'Mock exams & review' },
            { title: 'AI Korean Tutor', desc: 'Roleplay & writing coach' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-[#112242] border border-[#1E3359]"
            >
              <div className="text-xs font-bold text-white">{item.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onLoginClick}
            className="w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-950/50 transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            Sign In
          </button>
          <button
            type="button"
            onClick={onRegisterClick}
            className="w-full sm:w-auto min-w-[180px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#162B52] hover:bg-[#1E3766] border border-blue-400/25 text-white font-bold text-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Create Free Account
          </button>
        </div>
      </div>
    </div>
  );
};

interface AskAiTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiLang: LearningExplanationLang;
  contextTitle?: string;
}

export const AskAiTutorDrawer: React.FC<AskAiTutorModalProps> = ({
  isOpen,
  onClose,
  uiLang,
  contextTitle,
}) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: pickTriLingual(uiLang, {
        en: 'Hello! I am your EVERYKR AI Korean Tutor. Ask me to explain any Korean word, grammar rule, polite vs informal form, or example sentence.',
        bn: '안녕하세요! আমি আপনার EVERYKR AI কোরিয়ান টিউটর। যেকোনো কোরিয়ান শব্দ, ব্যাকরণ, উচ্চারণ বা উদাহরণ বাক্য সম্পর্কে আমাকে জিজ্ঞেস করুন।',
        ne: '안녕하세요! म तपाईंको EVERYKR AI कोरियन ट्युटर हुँ। कुनै पनि कोरियन शब्द, व्याकरण वा वाक्यबारे सोध्नुहोस्।',
        ur: '안녕하세요! میں آپ کا EVERYKR AI کورین ٹیوٹر ہوں۔ کسی بھی کورین لفظ، گرامر یا جملے کے بارے میں پوچھیں۔',
      }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const promptText = (customPrompt ?? input).trim();
    if (!promptText || loading) return;
    if (!customPrompt) setInput('');
    const nextHistory = [...messages, { role: 'user' as const, text: promptText }];
    setMessages(nextHistory);
    setLoading(true);
    try {
      const res = await fetch('/api/korean-tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          uiLang,
          scenarioTitle: contextTitle || 'Learn Korean Study Assistant',
          level: 'Beginner to TOPIK II',
          history: nextHistory.slice(-6),
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text:
            data?.reply ||
            'Here is a helpful tip: Break the Korean sentence into [Subject + 은/는] + [Object + 을/를] + [Verb + 아요/어요].',
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Could not reach the EVERYKR AI Tutor right now. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm font-black">EVERYKR AI Korean Tutor</div>
              <div className="text-[11px] text-slate-300">
                {contextTitle || 'Instant Explanations & Examples'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
          {[
            'Explain 은/는 vs 이/가 simply',
            'Give 3 polite campus sentences',
            'How does Batchim sound change?',
          ].map(q => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:border-blue-400 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          dir={uiLang === 'ur' ? 'rtl' : 'ltr'}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white ml-8'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 mr-6'
              }`}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 font-semibold">
              EVERYKR AI Tutor is thinking...
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask about a Korean word, grammar rule, or sentence..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface HangulCompleteViewProps {
  uiLang: LearningExplanationLang;
  completedHandwritingIds: string[];
  onCompleteHandwriting: (id: string) => void;
  onPassHangulQuiz: () => void;
  onOpenAiTutor: (context: string) => void;
  initialSubTab?: 'vowels' | 'consonants' | 'syllables' | 'reading' | 'writing' | 'quiz';
  presetNonce?: number;
}

export const HangulFoundationModuleView: React.FC<HangulCompleteViewProps> = ({
  uiLang,
  completedHandwritingIds,
  onCompleteHandwriting,
  onPassHangulQuiz,
  onOpenAiTutor,
  initialSubTab,
  presetNonce,
}) => {
  const [subTab, setSubTab] = useState<
    'vowels' | 'consonants' | 'syllables' | 'reading' | 'writing' | 'quiz'
  >(initialSubTab || 'vowels');
  const [vowelTypeFilter, setVowelTypeFilter] = useState<'all' | 'basic' | 'compound'>('all');
  const [consTypeFilter, setConsTypeFilter] = useState<'all' | 'basic' | 'double'>('all');

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab, presetNonce]);

  // Interactive Syllable Builder state
  const [initialIdx, setInitialIdx] = useState(0); // ㄱ
  const [medialIdx, setMedialIdx] = useState(0); // ㅏ
  const [finalIdx, setFinalIdx] = useState(0); // none

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const composedSyllable = useMemo(() => {
    const code = 0xac00 + initialIdx * 588 + medialIdx * 28 + finalIdx;
    return String.fromCharCode(code);
  }, [initialIdx, medialIdx, finalIdx]);

  const filteredVowels = useMemo(
    () =>
      HANGUL_VOWELS_21.filter(v => (vowelTypeFilter === 'all' ? true : v.type === vowelTypeFilter)),
    [vowelTypeFilter]
  );

  const filteredConsonants = useMemo(
    () =>
      HANGUL_CONSONANTS_19.filter(c =>
        consTypeFilter === 'all' ? true : c.type === consTypeFilter
      ),
    [consTypeFilter]
  );

  const quizScore = useMemo(() => {
    let c = 0;
    HANGUL_SECTION_QUIZ.forEach(q => {
      if (quizAnswers[q.id] === q.correctIndex) c += 1;
    });
    return c;
  }, [quizAnswers]);

  const isRtl = uiLang === 'ur';

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'vowels', label: '1. Vowels (21)' },
            { id: 'consonants', label: '2. Consonants (19)' },
            { id: 'syllables', label: '3. Syllable Formation & Batchim' },
            { id: 'reading', label: '4. Reading Practice' },
            { id: 'writing', label: '5. Hangul Writing & Stroke Order' },
            { id: 'quiz', label: '6. Hangul Mastery Quiz' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as typeof subTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                subTab === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onOpenAiTutor('Stage 1 — Hangul Foundation')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
        >
          <Bot className="w-3.5 h-3.5" />
          Ask AI Tutor
        </button>
      </div>

      {/* 1. VOWELS (10 Basic + 11 Compound = 21) */}
      {subTab === 'vowels' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Korean Vowels (모음 21개) — 10 Basic & 11 Compound Vowels
              </h3>
              <p className="text-xs text-slate-500">
                Tap any vowel to hear native Korean audio, mouth position, stroke order, and example words.
              </p>
            </div>
            <div className="flex gap-1.5">
              {[
                { id: 'all', label: 'All 21 Vowels' },
                { id: 'basic', label: '10 Basic (단모음)' },
                { id: 'compound', label: '11 Compound (이중모음)' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setVowelTypeFilter(f.id as typeof vowelTypeFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    vowelTypeFilter === f.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVowels.map(v => (
              <div
                key={v.char}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => playKoreanAudio(v.nameKo)}
                      className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer"
                    >
                      <span className="text-3xl font-black leading-none">{v.char}</span>
                      <span className="text-[10px] font-bold mt-1">{v.nameKo}</span>
                    </button>
                    <div>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                        {v.type === 'basic' ? 'Basic Vowel' : 'Compound Vowel'}
                      </span>
                      <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                        Sound: [{v.romanization}]
                      </div>
                      <div
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400"
                        dir={isRtl ? 'rtl' : 'ltr'}
                      >
                        {pickTriLingual(uiLang, v.soundExplanation)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => playKoreanAudio(v.nameKo)}
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    title="Listen Pronunciation"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 space-y-1"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white">Mouth Tip: </span>
                    {pickTriLingual(uiLang, v.mouthTip)}
                  </div>
                  <div dir="ltr" className="text-[11px] text-slate-500">
                    <span className="font-bold">Stroke Order ({v.strokeCount} strokes):</span>{' '}
                    {v.strokeOrderSteps.join(' → ')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {v.examples.map(ex => (
                    <button
                      key={ex.wordKo}
                      type="button"
                      onClick={() => playKoreanAudio(ex.wordKo)}
                      className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {ex.wordKo}
                        </span>
                        <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="text-[10px] text-slate-400">{ex.romanization}</div>
                      <div
                        className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5"
                        dir={isRtl ? 'rtl' : 'ltr'}
                      >
                        {pickTriLingual(uiLang, ex.meaning)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. CONSONANTS (14 Basic + 5 Double = 19) */}
      {subTab === 'consonants' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Korean Consonants (자음 19개) — 14 Basic & 5 Double Consonants
              </h3>
              <p className="text-xs text-slate-500">
                Includes initial vs final (Batchim) sound rules, stroke order, and native audio.
              </p>
            </div>
            <div className="flex gap-1.5">
              {[
                { id: 'all', label: 'All 19 Consonants' },
                { id: 'basic', label: '14 Basic (기본 자음)' },
                { id: 'double', label: '5 Double (쌍자음)' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setConsTypeFilter(f.id as typeof consTypeFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    consTypeFilter === f.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConsonants.map(c => (
              <div
                key={c.char}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => playKoreanAudio(c.nameKo)}
                      className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center text-indigo-700 dark:text-indigo-300 cursor-pointer"
                    >
                      <span className="text-3xl font-black leading-none">{c.char}</span>
                      <span className="text-[10px] font-bold mt-1">{c.nameKo}</span>
                    </button>
                    <div>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                        {c.type === 'basic' ? 'Basic Consonant' : 'Tense Double'}
                      </span>
                      <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                        {c.nameKo} ({c.nameRomanized}) • [{c.initialSound}]
                      </div>
                      <div
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400"
                        dir={isRtl ? 'rtl' : 'ltr'}
                      >
                        {pickTriLingual(uiLang, c.explanation)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => playKoreanAudio(c.examples[0]?.wordKo || c.nameKo)}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 space-y-1"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white">
                      Batchim ({c.batchimSound}):{' '}
                    </span>
                    {pickTriLingual(uiLang, c.batchimRule)}
                  </div>
                  <div dir="ltr" className="text-[11px] text-slate-500">
                    <span className="font-bold">Stroke Order ({c.strokeCount}):</span>{' '}
                    {c.strokeOrderSteps.join(' → ')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {c.examples.map(ex => (
                    <button
                      key={ex.wordKo}
                      type="button"
                      onClick={() => playKoreanAudio(ex.wordKo)}
                      className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {ex.wordKo}
                        </span>
                        <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <div className="text-[10px] text-slate-400">{ex.romanization}</div>
                      <div
                        className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5"
                        dir={isRtl ? 'rtl' : 'ltr'}
                      >
                        {pickTriLingual(uiLang, ex.meaning)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SYLLABLE FORMATION & BATCHIM */}
      {subTab === 'syllables' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Interactive Syllable Block Builder (한글 음절 조합기)
              </h3>
              <p className="text-xs text-slate-500">
                Combine any Initial Consonant + Vowel + Optional Final Consonant (Batchim) to build and hear real Korean syllable blocks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-5xl font-black">
                  {composedSyllable}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                    Formula: {INITIAL_CONSONANTS[initialIdx]?.char} + {MEDIAL_VOWELS[medialIdx]?.char}
                    {finalIdx > 0 ? ` + ${FINAL_BATCHIM[finalIdx]?.char}` : ''} = {composedSyllable}
                  </div>
                  <div className="text-xl font-black mt-1">
                    {composedSyllable} ({getScriptPronunciation(composedSyllable, uiLang)})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => playKoreanAudio(composedSyllable)}
                className="px-5 py-3 rounded-xl bg-white text-blue-700 font-black text-xs inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                Play Syllable Audio
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-black uppercase text-slate-500">
                1. Choose Initial Consonant (초성)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INITIAL_CONSONANTS.map((c, idx) => (
                  <button
                    key={c.char}
                    type="button"
                    onClick={() => setInitialIdx(idx)}
                    className={`w-9 h-9 rounded-xl font-black text-sm cursor-pointer ${
                      initialIdx === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {c.char}
                  </button>
                ))}
              </div>

              <div className="text-xs font-black uppercase text-slate-500 pt-2">
                2. Choose Vowel (중성)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MEDIAL_VOWELS.map((v, idx) => (
                  <button
                    key={v.char}
                    type="button"
                    onClick={() => setMedialIdx(idx)}
                    className={`w-9 h-9 rounded-xl font-black text-sm cursor-pointer ${
                      medialIdx === idx
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {v.char}
                  </button>
                ))}
              </div>

              <div className="text-xs font-black uppercase text-slate-500 pt-2">
                3. Choose Final Consonant / Batchim (받침)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FINAL_BATCHIM.slice(0, 16).map((b, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFinalIdx(idx)}
                    className={`px-3 h-9 rounded-xl font-black text-xs cursor-pointer ${
                      finalIdx === idx
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {b.char || 'None'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Core Syllable & Batchim Rules (음절과 받침 규칙)
            </h3>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="font-black text-slate-900 dark:text-white">
                  Rule 1: Consonant + Vowel (C + V)
                </div>
                <p className="mt-1">
                  ㄱ (g/k) + ㅏ (a) = <strong className="text-blue-600">가 (ga)</strong> • 나 (na) • 다 (da) • 마 (ma)
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="font-black text-slate-900 dark:text-white">
                  Rule 2: Consonant + Vowel + Final Consonant (C + V + C)
                </div>
                <p className="mt-1">
                  ㅎ (h) + ㅏ (a) + ㄴ (n) = <strong className="text-blue-600">한 (han)</strong> • 국 (guk) → 한국 (Hanguk)
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="font-black text-slate-900 dark:text-white">
                  Rule 3: 7 Representative Batchim Sounds (받침 대표음)
                </div>
                <p className="mt-1">
                  At the end of a syllable, all Korean consonants reduce to 7 unreleased sounds: [ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅇ]. When followed by ㅇ (a vowel), the Batchim links smoothly to the next syllable (연음 법칙), e.g., 한국어 → [한구거].
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. READING PRACTICE */}
      {subTab === 'reading' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Hangul Reading Practice (한글 읽기 연습)
            </h3>
            <p className="text-xs text-slate-500">
              Practice reading Simple Syllables → 2-Syllable Words → 3-Syllable Words → Signs & Universities aloud.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HANGUL_READING_PRACTICE_ITEMS.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {pickTriLingual(uiLang, item.categoryLabel)}
                  </span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                    {item.korean}
                  </div>
                  <div className="text-xs text-slate-500">
                    [{item.romanization}] • {item.syllableBreakdown}
                  </div>
                  <div
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {pickTriLingual(uiLang, item.meaning)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => playKoreanAudio(item.korean)}
                  className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. WRITING & STROKE ORDER */}
      {subTab === 'writing' && (
        <HandwritingCanvasTab
          uiLang={uiLang === 'bn' || uiLang === 'ne' ? uiLang : 'en'}
          completedIds={completedHandwritingIds}
          onCompleteItem={onCompleteHandwriting}
        />
      )}

      {/* 6. HANGUL SECTION QUIZ */}
      {subTab === 'quiz' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Hangul Foundation Assessment Quiz (한글 기초 평가)
              </h3>
              <p className="text-xs text-slate-500">
                Score at least 5/6 to complete Stage 1 — Hangul Foundation and unlock Stage 2 — Beginner Korean.
              </p>
            </div>
            {quizSubmitted && (
              <div
                className={`px-4 py-2 rounded-xl text-xs font-black ${
                  quizScore >= 5
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                Score: {quizScore} / {HANGUL_SECTION_QUIZ.length}{' '}
                {quizScore >= 5 ? '• Stage 1 Completed!' : '• Try Again'}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {HANGUL_SECTION_QUIZ.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="text-sm font-black text-slate-900 dark:text-white"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {idx + 1}. {pickTriLingual(uiLang, q.prompt)}
                  </div>
                  {q.audioStimulusKo && (
                    <button
                      type="button"
                      onClick={() => playKoreanAudio(q.audioStimulusKo!)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Listen
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {q.options.map((opt, oIdx) => {
                    const selected = quizAnswers[q.id] === oIdx;
                    const isCorrect = quizSubmitted && oIdx === q.correctIndex;
                    const isWrong = quizSubmitted && selected && oIdx !== q.correctIndex;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          if (!quizSubmitted) {
                            setQuizAnswers(prev => ({ ...prev, [q.id]: oIdx }));
                          }
                        }}
                        className={`p-3 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                          isCorrect
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : isWrong
                            ? 'bg-rose-600 text-white border-rose-600'
                            : selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {quizSubmitted && (
                  <div
                    className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#FFB800] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{pickTriLingual(uiLang, q.explanation)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setQuizSubmitted(true);
                if (quizScore >= 5) {
                  onPassHangulQuiz();
                }
              }}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm cursor-pointer"
            >
              Submit Hangul Quiz
            </button>
            {quizSubmitted && (
              <button
                type="button"
                onClick={() => {
                  setQuizAnswers({});
                  setQuizSubmitted(false);
                }}
                className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
              >
                Reset Quiz
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
