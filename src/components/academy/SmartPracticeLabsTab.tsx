import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Headphones,
  Layers,
  Lightbulb,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { AcademyLanguage } from '../../data/koreanAcademyData';
import {
  CURRICULUM_LEVELS_20X,
  getLevelLabel,
} from '../../data/korean20x/levelsAndCategories';
import { getGrammarLessons20x } from '../../data/korean20x/lessonsAndGrammar20x';
import {
  getDailyChallenges20x,
  getListeningExercises20x,
  getPronunciationDrills20x,
  getReadingPassages20x,
  getSentenceBuilders20x,
  getSpeakingChallenges20x,
} from '../../data/korean20x/practiceActivities20x';
import { playKoreanAudio, UserAcademyProgress } from '../../services/koreanAcademyService';
import { getScriptPronunciation, pickTriLingual } from '../../utils/hangulPhonetics';

export type SmartLabSubId =
  | 'grammar'
  | 'listening'
  | 'reading'
  | 'speaking'
  | 'pronunciation'
  | 'sentence_builder'
  | 'daily_challenge';

interface SmartPracticeLabsTabProps {
  uiLang: AcademyLanguage;
  progress: UserAcademyProgress;
  onRecordPracticeCompletion: (category: SmartLabSubId, itemId: string, isCorrect?: boolean) => void;
}

const ITEMS_PER_PAGE = 12;

export const SmartPracticeLabsTab: React.FC<SmartPracticeLabsTabProps> = ({
  uiLang,
  progress,
  onRecordPracticeCompletion,
}) => {
  const [subLab, setSubLab] = useState<SmartLabSubId>('grammar');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  // Lazy-memoized 20X banks
  const grammarList = useMemo(() => getGrammarLessons20x(), []);
  const listeningList = useMemo(() => getListeningExercises20x(), []);
  const readingList = useMemo(() => getReadingPassages20x(), []);
  const speakingList = useMemo(() => getSpeakingChallenges20x(), []);
  const pronDrills = useMemo(() => getPronunciationDrills20x(), []);
  const sentenceList = useMemo(() => getSentenceBuilders20x(), []);
  const dailyChallenges = useMemo(() => getDailyChallenges20x(), []);

  // Interactive states
  const [quizChoices, setQuizChoices] = useState<Record<string, number>>({});
  const [revealedScripts, setRevealedScripts] = useState<Record<string, boolean>>({});
  const [tileSelections, setTileSelections] = useState<Record<string, string[]>>({});
  const [speakingTranscript, setSpeakingTranscript] = useState<Record<string, string>>({});
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [pronRuleFilter, setPronRuleFilter] = useState<string>('all');

  const dayOfYearIndex = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.min(364, Math.floor(diff / oneDay) - 1));
  }, []);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(dayOfYearIndex);

  const pronLabel =
    uiLang === 'bn'
      ? 'বাংলা উচ্চারণ'
      : uiLang === 'ne'
      ? 'नेपाली उच्चारण'
      : 'Pronunciation';

  const startKoreanSpeechCapture = (itemId: string) => {
    const Win = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const SpeechRec = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeakingTranscript(prev => ({
        ...prev,
        [itemId]: pickTriLingual(uiLang, {
          en: 'Live microphone speech recognition is not supported in this browser. Listen to the Korean audio, repeat aloud, and click "Mark Practiced".',
          bn: 'এই ব্রাউজারে সরাসরি ভয়েস রিকগনিশন সমর্থিত নয়। অডিও শুনে উচ্চস্বরে অনুশীলন করুন এবং "অনুশীলন সম্পন্ন" বাটনে ক্লিক করুন।',
          ne: 'यस ब्राउजरमा प्रत्यक्ष आवाज पहिचान समर्थित छैन। अडियो सुनेर उच्चारण अभ्यास गर्नुहोस् र "अभ्यास सम्पन्न" थिच्नुहोस्।',
        }),
      }));
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'ko-KR';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setRecordingId(itemId);
      rec.onresult = (event: any) => {
        const spoken = event?.results?.[0]?.[0]?.transcript || '';
        setSpeakingTranscript(prev => ({ ...prev, [itemId]: spoken }));
        setRecordingId(null);
        onRecordPracticeCompletion('speaking', itemId, true);
      };
      rec.onerror = () => {
        setRecordingId(null);
      };
      rec.onend = () => {
        setRecordingId(null);
      };
      rec.start();
    } catch {
      setRecordingId(null);
    }
  };

  const subTabs: { id: SmartLabSubId; count: number; icon: React.ElementType; en: string; bn: string; ne: string }[] = [
    { id: 'grammar', count: grammarList.length, icon: BookOpen, en: 'Grammar', bn: 'ব্যাকরণ', ne: 'व्याकरण' },
    { id: 'listening', count: listeningList.length, icon: Headphones, en: 'Listening', bn: 'লিসেনিং', ne: 'सुनाइ अभ्यास' },
    { id: 'reading', count: readingList.length, icon: FileText, en: 'Reading', bn: 'রিডিং অনুচ্ছেদ', ne: 'पढाइ अनुच्छेद' },
    { id: 'speaking', count: speakingList.length, icon: Mic, en: 'Speaking', bn: 'স্পিকিং চ্যালেঞ্জ', ne: 'बोलाइ अभ्यास' },
    { id: 'pronunciation', count: pronDrills.length, icon: Volume2, en: 'Pronunciation', bn: 'উচ্চারণ নিয়ম', ne: 'उच्चारण नियम' },
    { id: 'sentence_builder', count: sentenceList.length, icon: Layers, en: 'Sentence Builder', bn: 'বাক্য গঠন', ne: 'वाक्य निर्माण' },
    { id: 'daily_challenge', count: dailyChallenges.length, icon: Calendar, en: '365 Daily Challenge', bn: '৩৬৫ দৈনিক চ্যালেঞ্জ', ne: '३६५ दैनिक चुनौती' },
  ];

  // Filtered + Paged helper
  const filterByLevel = <T extends { level: string }>(arr: T[]): T[] => {
    if (levelFilter === 'all') return arr;
    return arr.filter(x => x.level === levelFilter);
  };

  const activeGrammarFiltered = useMemo(() => filterByLevel(grammarList), [grammarList, levelFilter]);
  const activeListeningFiltered = useMemo(() => filterByLevel(listeningList), [listeningList, levelFilter]);
  const activeReadingFiltered = useMemo(() => filterByLevel(readingList), [readingList, levelFilter]);
  const activeSpeakingFiltered = useMemo(() => filterByLevel(speakingList), [speakingList, levelFilter]);
  const activePronFiltered = useMemo(() => {
    const base = filterByLevel(pronDrills);
    if (pronRuleFilter === 'all') return base;
    return base.filter(p => p.ruleCategory === pronRuleFilter);
  }, [pronDrills, levelFilter, pronRuleFilter]);
  const activeSentenceFiltered = useMemo(() => filterByLevel(sentenceList), [sentenceList, levelFilter]);

  const currentTotalCount =
    subLab === 'grammar'
      ? activeGrammarFiltered.length
      : subLab === 'listening'
      ? activeListeningFiltered.length
      : subLab === 'reading'
      ? activeReadingFiltered.length
      : subLab === 'speaking'
      ? activeSpeakingFiltered.length
      : subLab === 'pronunciation'
      ? activePronFiltered.length
      : subLab === 'sentence_builder'
      ? activeSentenceFiltered.length
      : 1;

  const totalPages = Math.max(1, Math.ceil(currentTotalCount / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * ITEMS_PER_PAGE;

  return (
    <div className="space-y-6">
      {/* Sub-Lab Navigation Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {pickTriLingual(uiLang, {
                en: '20X Interactive Korean Practice Labs',
                bn: '২০ গুণ বিস্তৃত ইন্টারঅ্যাক্টিভ অনুশীলন ল্যাব',
                ne: '२० गुणा विस्तारित अन्तरक्रियात्मक अभ्यास ल्याब',
              })}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {pickTriLingual(uiLang, {
                en: 'Grammar, Listening, Reading, Speaking, Phonology & Sentence Building',
                bn: 'ব্যাকরণ, লিসেনিং, রিডিং, স্পিকিং, উচ্চারণ এবং বাক্য গঠন অনুশীলন',
                ne: 'व्याकरण, सुनाइ, पढाइ, बोलाइ, उच्चारण र वाक्य निर्माण अभ्यास',
              })}
            </h2>
          </div>

          {subLab !== 'daily_challenge' && (
            <select
              value={levelFilter}
              onChange={e => {
                setLevelFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
            >
              <option value="all">
                {pickTriLingual(uiLang, {
                  en: 'All 10 Levels',
                  bn: 'সকল ১০টি লেভেল',
                  ne: 'सबै १० तहहरू',
                })}
              </option>
              {CURRICULUM_LEVELS_20X.map(lv => (
                <option key={lv.id} value={lv.id}>
                  {getLevelLabel(lv, uiLang)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {subTabs.map(t => {
            const Icon = t.icon;
            const active = subLab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSubLab(t.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{pickTriLingual(uiLang, { en: t.en, bn: t.bn, ne: t.ne })}</span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. GRAMMAR LAB */}
      {subLab === 'grammar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {activeGrammarFiltered.slice(sliceStart, sliceStart + ITEMS_PER_PAGE).map(g => {
            const done = progress.completedGrammarIds?.includes(g.id);
            const selectedAns = quizChoices[g.id];
            return (
              <div
                key={g.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                      {g.level}
                    </span>
                    <button
                      onClick={() => onRecordPracticeCompletion('grammar', g.id, true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                        done
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {done
                        ? pickTriLingual(uiLang, { en: 'Mastered', bn: 'শেখা হয়েছে', ne: 'सिकियो' })
                        : pickTriLingual(uiLang, { en: 'Mark Learned', bn: 'সম্পন্ন করুন', ne: 'सम्पन्न गर्नुहोस्' })}
                    </button>
                  </div>

                  <div>
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                      {g.patternKo}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {pickTriLingual(uiLang, { en: g.titleEn, bn: g.titleBn, ne: g.titleNe })}
                    </h3>
                    <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-1">
                      {g.formula}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {pickTriLingual(uiLang, {
                      en: g.explanationEn,
                      bn: g.explanationBn,
                      ne: g.explanationNe,
                    })}
                  </p>

                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200">
                    <strong>
                      {pickTriLingual(uiLang, {
                        en: 'Conjugation Rule: ',
                        bn: 'যুক্ত করার নিয়ম: ',
                        ne: 'जोड्ने नियम: ',
                      })}
                    </strong>
                    {pickTriLingual(uiLang, {
                      en: g.conjugationRuleEn,
                      bn: g.conjugationRuleBn,
                      ne: g.conjugationRuleNe,
                    })}
                  </div>

                  {/* Examples */}
                  <div className="space-y-2">
                    {g.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {ex.ko}
                          </div>
                          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            {pronLabel}:{' '}
                            {getScriptPronunciation(ex.ko, uiLang, {
                              pronunciationBn: ex.pronBn,
                              pronunciationNe: ex.pronNe,
                              romanization: ex.romanization,
                            })}
                          </div>
                          <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                            {pickTriLingual(uiLang, { en: ex.en, bn: ex.bn, ne: ex.ne })}
                          </div>
                        </div>
                        <button
                          onClick={() => playKoreanAudio(ex.ko)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini Grammar Check */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Q:{' '}
                    {pickTriLingual(uiLang, {
                      en: g.quizQuestion.promptEn,
                      bn: g.quizQuestion.promptBn,
                      ne: g.quizQuestion.promptNe,
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {g.quizQuestion.options.map((opt, idx) => {
                      const chosen = selectedAns === idx;
                      const isRight = idx === g.quizQuestion.correctIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setQuizChoices(prev => ({ ...prev, [g.id]: idx }));
                            onRecordPracticeCompletion('grammar', g.id, isRight);
                          }}
                          className={`p-2 rounded-xl border text-xs font-bold text-left ${
                            selectedAns !== undefined && isRight
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                              : selectedAns !== undefined && chosen && !isRight
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-200'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. LISTENING LAB */}
      {subLab === 'listening' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeListeningFiltered.slice(sliceStart, sliceStart + ITEMS_PER_PAGE).map(item => {
            const ans = quizChoices[item.id];
            const showScript = Boolean(revealedScripts[item.id]);
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                    {item.level}
                  </span>
                  <button
                    onClick={() =>
                      setRevealedScripts(prev => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showScript
                      ? pickTriLingual(uiLang, {
                          en: 'Hide Transcript',
                          bn: 'ট্রান্সক্রিপ্ট লুকান',
                          ne: 'स्क्रिप्ट लुकाउनुहोस्',
                        })
                      : pickTriLingual(uiLang, {
                          en: 'Show Transcript',
                          bn: 'ট্রান্সক্রিপ্ট দেখুন',
                          ne: 'स्क्रिप्ट हेर्नुहोस्',
                        })}
                  </button>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {pickTriLingual(uiLang, {
                    en: item.titleEn,
                    bn: item.titleBn,
                    ne: item.titleNe,
                  })}
                </h3>

                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => playKoreanAudio(item.audioScriptKo, undefined, 0.88)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    <Volume2 className="w-4 h-4" />
                    {pickTriLingual(uiLang, {
                      en: 'Play Audio (1.0x)',
                      bn: 'অডিও শুনুন (1.0x)',
                      ne: 'अडियो सुन्नुहोस् (1.0x)',
                    })}
                  </button>
                  <button
                    onClick={() => playKoreanAudio(item.audioScriptKo, undefined, 0.6)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    0.6x Slow
                  </button>
                </div>

                {showScript && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {item.audioScriptKo}
                    </div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {pronLabel}:{' '}
                      {getScriptPronunciation(item.audioScriptKo, uiLang, {
                        pronunciationBn: item.pronunciationBn,
                        pronunciationNe: item.pronunciationNe,
                        romanization: item.romanization,
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {pickTriLingual(uiLang, {
                      en: item.questionEn,
                      bn: item.questionBn,
                      ne: item.questionNe,
                    })}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {item.options.map((opt, idx) => {
                      const chosen = ans === idx;
                      const isRight = idx === item.correctIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setQuizChoices(prev => ({ ...prev, [item.id]: idx }));
                            onRecordPracticeCompletion('listening', item.id, isRight);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between ${
                            ans !== undefined && isRight
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                              : ans !== undefined && chosen && !isRight
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-200'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <span>{opt}</span>
                          {ans !== undefined && isRight && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          {ans !== undefined && chosen && !isRight && <XCircle className="w-4 h-4 text-rose-600" />}
                        </button>
                      );
                    })}
                  </div>
                  {ans !== undefined && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                      {pickTriLingual(uiLang, {
                        en: item.explanationEn,
                        bn: item.explanationBn,
                        ne: item.explanationNe,
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. READING PASSAGES LAB */}
      {subLab === 'reading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {activeReadingFiltered.slice(sliceStart, sliceStart + ITEMS_PER_PAGE).map(rp => {
            const ans = quizChoices[rp.id];
            const showTrans = Boolean(revealedScripts[rp.id]);
            return (
              <div
                key={rp.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold">
                      {rp.genre}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                      {rp.level}
                    </span>
                  </div>
                  <button
                    onClick={() => playKoreanAudio(rp.passageKo)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    {pickTriLingual(uiLang, { en: 'Listen', bn: 'শুনুন', ne: 'सुन्नुहोस्' })}
                  </button>
                </div>

                <div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{rp.titleKo}</div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {pickTriLingual(uiLang, { en: rp.titleEn, bn: rp.titleBn, ne: rp.titleNe })}
                  </h3>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                    {rp.passageKo}
                  </p>
                  <button
                    onClick={() => setRevealedScripts(prev => ({ ...prev, [rp.id]: !prev[rp.id] }))}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {showTrans
                      ? pickTriLingual(uiLang, { en: 'Hide Translation', bn: 'অনুবাদ লুকান', ne: 'अनुवाद लुकाउनुहोस्' })
                      : pickTriLingual(uiLang, { en: 'Show Translation', bn: 'অনুবাদ দেখুন', ne: 'अनुवाद हेर्नुहोस्' })}
                  </button>
                  {showTrans && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                      {pickTriLingual(uiLang, {
                        en: rp.translationEn,
                        bn: rp.translationBn,
                        ne: rp.translationNe,
                      })}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {pickTriLingual(uiLang, {
                      en: rp.questionEn,
                      bn: rp.questionBn,
                      ne: rp.questionNe,
                    })}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {rp.options.map((opt, idx) => {
                      const chosen = ans === idx;
                      const isRight = idx === rp.correctIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setQuizChoices(prev => ({ ...prev, [rp.id]: idx }));
                            onRecordPracticeCompletion('reading', rp.id, isRight);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left ${
                            ans !== undefined && isRight
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                              : ans !== undefined && chosen && !isRight
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-200'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. SPEAKING CHALLENGES LAB */}
      {subLab === 'speaking' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeSpeakingFiltered.slice(sliceStart, sliceStart + ITEMS_PER_PAGE).map(sp => {
            const done = progress.completedSpeakingIds?.includes(sp.id);
            const transcript = speakingTranscript[sp.id];
            const isRec = recordingId === sp.id;
            const scriptPron = getScriptPronunciation(sp.targetKorean, uiLang, {
              pronunciationBn: sp.pronunciationBn,
              pronunciationNe: sp.pronunciationNe,
              romanization: sp.romanization,
            });
            return (
              <div
                key={sp.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                    {sp.level}
                  </span>
                  {done && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {pickTriLingual(uiLang, { en: 'Practiced', bn: 'অনুশীলন সম্পন্ন', ne: 'अभ्यास गरियो' })}
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {pickTriLingual(uiLang, {
                    en: sp.situationEn,
                    bn: sp.situationBn,
                    ne: sp.situationNe,
                  })}
                </p>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {sp.targetKorean}
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {pronLabel}: {scriptPron}
                  </div>
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {pickTriLingual(uiLang, {
                      en: sp.meaningEn,
                      bn: sp.meaningBn,
                      ne: sp.meaningNe,
                    })}
                  </div>
                </div>

                <p className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Lightbulb className="w-3.5 h-3.5 text-[#FFB800] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    {pickTriLingual(uiLang, {
                      en: sp.coachingTipEn,
                      bn: sp.coachingTipBn,
                      ne: sp.coachingTipNe,
                    })}
                  </span>
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => playKoreanAudio(sp.targetKorean, undefined, 0.85)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    {pickTriLingual(uiLang, { en: 'Model Audio', bn: 'উচ্চারণ শুনুন', ne: 'उच्चारण सुन्नुहोस्' })}
                  </button>

                  <button
                    onClick={() => startKoreanSpeechCapture(sp.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border ${
                      isRec
                        ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isRec ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-rose-500" />}
                    {isRec
                      ? pickTriLingual(uiLang, { en: 'Listening (ko-KR)...', bn: 'শুনছি...', ne: 'सुन्दै...' })
                      : pickTriLingual(uiLang, { en: 'Speak Now', bn: 'বলুন (মাইক)', ne: 'बोल्नुहोस् (माइक)' })}
                  </button>

                  <button
                    onClick={() => onRecordPracticeCompletion('speaking', sp.id, true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold"
                  >
                    {pickTriLingual(uiLang, { en: 'Mark Practiced', bn: 'অনুশীলন সম্পন্ন', ne: 'अभ्यास सम्पन्न' })}
                  </button>
                </div>

                {transcript && (
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-slate-800 dark:text-slate-200">
                    <strong>{pickTriLingual(uiLang, { en: 'Captured:', bn: 'আপনার উচ্চারণ:', ne: 'तपाईंको आवाज:' })}</strong>{' '}
                    {transcript}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. PRONUNCIATION PHONOLOGY DRILLS */}
      {subLab === 'pronunciation' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              'all',
              'Minimal Pair',
              'Liaison (연음)',
              'Nasalization (비음화)',
              'Batchim (받침)',
              'Aspiration (격음화)',
              'Palatalization (구개음화)',
              'Liquidization (유음화)',
              'Tensification (경음화)',
            ].map(rule => (
              <button
                key={rule}
                onClick={() => {
                  setPronRuleFilter(rule);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  pronRuleFilter === rule
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                }`}
              >
                {rule === 'all'
                  ? pickTriLingual(uiLang, { en: 'All Phonology Rules', bn: 'সকল উচ্চারণ নিয়ম', ne: 'सबै उच्चारण नियम' })
                  : rule}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePronFiltered.slice(sliceStart, sliceStart + ITEMS_PER_PAGE).map(pd => {
              const scriptPron = getScriptPronunciation(pd.writtenKo, uiLang, {
                pronunciationBn: pd.pronunciationBn,
                pronunciationNe: pd.pronunciationNe,
                romanization: pd.romanization,
              });
              return (
                <div
                  key={pd.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                      {pd.ruleCategory}
                    </span>
                    <button
                      onClick={() => playKoreanAudio(pd.writtenKo)}
                      className="p-2 rounded-xl bg-blue-600 text-white"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      {pd.writtenKo}{' '}
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        → [{pd.spokenSurfaceKo}]
                      </span>
                    </div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {pronLabel}: {scriptPron}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">
                      {pickTriLingual(uiLang, {
                        en: pd.meaningEn,
                        bn: pd.meaningBn,
                        ne: pd.meaningNe,
                      })}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {pickTriLingual(uiLang, {
                      en: pd.ruleTipEn,
                      bn: pd.ruleTipBn,
                      ne: pd.ruleTipNe,
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. SENTENCE BUILDER TILES */}
      {subLab === 'sentence_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {activeSentenceFiltered.slice(sliceStart, sliceStart + ITEMS_PER_PAGE).map(sb => {
            const chosenTiles = tileSelections[sb.id] || [];
            const allTiles = [...sb.correctTiles, ...sb.distractorTiles].sort((a, b) =>
              a.localeCompare(b)
            );
            const isCompleteAttempt = chosenTiles.length === sb.correctTiles.length;
            const isExactMatch =
              isCompleteAttempt && chosenTiles.every((t, idx) => t === sb.correctTiles[idx]);

            return (
              <div
                key={sb.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                    {sb.level}
                  </span>
                  <button
                    onClick={() => setTileSelections(prev => ({ ...prev, [sb.id]: [] }))}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {pickTriLingual(uiLang, { en: 'Reset', bn: 'রিসেট', ne: 'रिसेट' })}
                  </button>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase text-slate-400">
                    {pickTriLingual(uiLang, {
                      en: 'Build this sentence in Korean:',
                      bn: 'কোরিয়ান ভাষায় বাক্যটি সাজান:',
                      ne: 'यो वाक्य कोरियनमा बनाउनुहोस्:',
                    })}
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {pickTriLingual(uiLang, {
                      en: sb.promptEn,
                      bn: sb.promptBn,
                      ne: sb.promptNe,
                    })}
                  </div>
                </div>

                {/* Answer Tray */}
                <div className="min-h-[54px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                  {chosenTiles.length === 0 ? (
                    <span className="text-xs text-slate-400">
                      {pickTriLingual(uiLang, {
                        en: 'Tap word tiles below in order...',
                        bn: 'নিচের শব্দগুলোতে ক্রমানুসারে ট্যাপ করুন...',
                        ne: 'तलका शब्दहरू क्रमशः थिच्नुहोस्...',
                      })}
                    </span>
                  ) : (
                    chosenTiles.map((tile, idx) => (
                      <button
                        key={`${tile}-${idx}`}
                        onClick={() =>
                          setTileSelections(prev => ({
                            ...prev,
                            [sb.id]: (prev[sb.id] || []).filter((_, i) => i !== idx),
                          }))
                        }
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-sm"
                      >
                        {tile}
                      </button>
                    ))
                  )}
                </div>

                {/* Available Tiles */}
                <div className="flex flex-wrap gap-2">
                  {allTiles.map((tile, idx) => {
                    const usedCount = chosenTiles.filter(t => t === tile).length;
                    const availableCount = allTiles.filter(t => t === tile).length;
                    const disabled = usedCount >= availableCount;
                    return (
                      <button
                        key={`${tile}-pool-${idx}`}
                        disabled={disabled}
                        onClick={() => {
                          const next = [...chosenTiles, tile];
                          setTileSelections(prev => ({ ...prev, [sb.id]: next }));
                          if (next.length === sb.correctTiles.length) {
                            const ok = next.every((t, i) => t === sb.correctTiles[i]);
                            if (ok) {
                              playKoreanAudio(sb.fullKorean);
                              onRecordPracticeCompletion('sentence_builder', sb.id, true);
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:border-blue-400 disabled:opacity-35"
                      >
                        {tile}
                      </button>
                    );
                  })}
                </div>

                {isCompleteAttempt && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                      isExactMatch
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <div className="font-black">
                      {isExactMatch
                        ? pickTriLingual(uiLang, {
                            en: `Correct! ${sb.fullKorean}`,
                            bn: `সঠিক! ${sb.fullKorean}`,
                            ne: `सही! ${sb.fullKorean}`,
                          })
                        : `${pickTriLingual(uiLang, {
                            en: 'Target order:',
                            bn: 'সঠিক ক্রম:',
                            ne: 'सही क्रम:',
                          })} ${sb.fullKorean}`}
                    </div>
                    <div>
                      {pronLabel}:{' '}
                      {getScriptPronunciation(sb.fullKorean, uiLang, {
                        pronunciationBn: sb.pronunciationBn,
                        pronunciationNe: sb.pronunciationNe,
                        romanization: sb.romanization,
                      })}
                    </div>
                    <div>
                      {pickTriLingual(uiLang, {
                        en: sb.grammarHintEn,
                        bn: sb.grammarHintBn,
                        ne: sb.grammarHintNe,
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 7. 365 DAILY CHALLENGES */}
      {subLab === 'daily_challenge' && (() => {
        const ch = dailyChallenges[selectedDayIdx] || dailyChallenges[0];
        const done = progress.completedDailyChallenges?.includes(ch.id);
        const ans = quizChoices[ch.id];
        return (
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold">
                  Day {ch.dayNumber} / 365 • {ch.level}
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {pickTriLingual(uiLang, {
                    en: ch.titleEn,
                    bn: ch.titleBn,
                    ne: ch.titleNe,
                  })}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDayIdx(d => (d > 0 ? d - 1 : 364))}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedDayIdx(dayOfYearIndex)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  {pickTriLingual(uiLang, { en: 'Today', bn: 'আজ', ne: 'आज' })}
                </button>
                <button
                  onClick={() => setSelectedDayIdx(d => (d + 1) % 365)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                  {pickTriLingual(uiLang, { en: 'Word of the Day', bn: 'আজকের শব্দ', ne: 'आजको शब्द' })}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {ch.wordOfDayKo}
                  </span>
                  <button
                    onClick={() => playKoreanAudio(ch.wordOfDayKo)}
                    className="p-2 rounded-xl bg-blue-600 text-white"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  {pronLabel}: {getScriptPronunciation(ch.wordOfDayKo, uiLang)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {pickTriLingual(uiLang, { en: 'Daily Expression', bn: 'আজকের অভিব্যক্তি', ne: 'आजको अभिव्यक्ति' })}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {ch.expressionKo}
                  </span>
                  <button
                    onClick={() => playKoreanAudio(ch.expressionKo)}
                    className="p-2 rounded-xl bg-emerald-600 text-white shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  {pronLabel}: {getScriptPronunciation(ch.expressionKo, uiLang)}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 space-y-2">
              <div className="text-xs font-bold uppercase text-blue-700 dark:text-blue-300">
                {pickTriLingual(uiLang, {
                  en: 'Daily Speaking & Sentence Mission',
                  bn: 'দৈনিক স্পিকিং মিশন',
                  ne: 'दैनिक बोलाइ अभ्यास',
                })}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {ch.speakingPromptKo}
                </div>
                <button
                  onClick={() => playKoreanAudio(ch.speakingPromptKo)}
                  className="p-2 rounded-xl bg-blue-600 text-white shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                {pronLabel}: {getScriptPronunciation(ch.speakingPromptKo, uiLang)}
              </div>
            </div>

            {/* Daily Mini Quiz */}
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {pickTriLingual(uiLang, {
                  en: ch.miniQuizPromptEn,
                  bn: ch.miniQuizPromptBn,
                  ne: ch.miniQuizPromptNe,
                })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ch.miniQuizOptions.map((opt, idx) => {
                  const chosen = ans === idx;
                  const isRight = idx === ch.miniQuizCorrectIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuizChoices(prev => ({ ...prev, [ch.id]: idx }));
                        onRecordPracticeCompletion('daily_challenge', ch.id, isRight);
                      }}
                      className={`p-3 rounded-xl border text-xs sm:text-sm font-bold text-left ${
                        ans !== undefined && isRight
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                          : ans !== undefined && chosen && !isRight
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-200'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => onRecordPracticeCompletion('daily_challenge', ch.id, true)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black ${
                  done
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 shrink-0" />
                )}
                {done
                  ? pickTriLingual(uiLang, {
                      en: 'Daily Challenge Completed',
                      bn: 'আজকের চ্যালেঞ্জ সম্পন্ন',
                      ne: 'दैनिक चुनौती सम्पन्न',
                    })
                  : pickTriLingual(uiLang, {
                      en: 'Complete Daily Challenge',
                      bn: 'চ্যালেঞ্জ সম্পন্ন করুন',
                      ne: 'चुनौती पूरा गर्नुहोस्',
                    })}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Shared Pagination Footer */}
      {subLab !== 'daily_challenge' && totalPages > 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            {pickTriLingual(uiLang, { en: 'Previous Page', bn: 'পূর্ববর্তী পৃষ্ঠা', ne: 'अघिल्लो पृष्ठ' })}
          </button>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {pickTriLingual(uiLang, {
              en: `Page ${safePage} of ${totalPages} (${currentTotalCount} items)`,
              bn: `পৃষ্ঠা ${safePage} / ${totalPages} (মোট ${currentTotalCount}টি)`,
              ne: `पृष्ठ ${safePage} / ${totalPages} (कुल ${currentTotalCount})`,
            })}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40"
          >
            {pickTriLingual(uiLang, { en: 'Next Page', bn: 'পরবর্তী পৃষ্ঠা', ne: 'अर्को पृष्ठ' })}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
