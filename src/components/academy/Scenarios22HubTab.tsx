import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  MessageSquare,
  Play,
  Search,
  Square,
  Volume2,
  XCircle,
} from 'lucide-react';
import { AcademyLanguage } from '../../data/koreanAcademyData';
import {
  CURRICULUM_LEVELS_20X,
  getLevelLabel,
  RealLifeScenario20x,
} from '../../data/korean20x/levelsAndCategories';
import { SCENARIO_DOMAINS_22_LIST } from '../../data/korean20x/scenariosAndConversations20x';
import { playKoreanAudio } from '../../services/koreanAcademyService';
import { getScriptPronunciation, pickTriLingual } from '../../utils/hangulPhonetics';

interface Scenarios22HubTabProps {
  uiLang: AcademyLanguage;
  scenarios: RealLifeScenario20x[];
  completedScenarioIds: string[];
  onToggleScenarioComplete: (scenarioId: string) => void;
  onLaunchRoleplayWithTutor?: (scenarioTitle: string, level: string) => void;
}

const SCENARIOS_PER_PAGE = 12;

export const Scenarios22HubTab: React.FC<Scenarios22HubTabProps> = ({
  uiLang,
  scenarios,
  completedScenarioIds,
  onToggleScenarioComplete,
  onLaunchRoleplayWithTutor,
}) => {
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(scenarios[0]?.id || '');
  const [hideTranslation, setHideTranslation] = useState<boolean>(false);
  const [selectedQuizChoice, setSelectedQuizChoice] = useState<number | null>(null);
  const [isPlayingDialogue, setIsPlayingDialogue] = useState<boolean>(false);
  const [playingTurnIdx, setPlayingTurnIdx] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);

  const stopDialogueAudio = () => {
    timersRef.current.forEach(t => window.clearTimeout(t));
    timersRef.current = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingDialogue(false);
    setPlayingTurnIdx(null);
  };

  useEffect(() => {
    return () => stopDialogueAudio();
  }, [activeScenarioId]);

  const filteredScenarios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scenarios.filter(sc => {
      if (selectedDomainId !== 'all' && sc.domainId !== selectedDomainId) return false;
      if (selectedLevel !== 'all' && sc.level !== selectedLevel) return false;
      if (!q) return true;
      return (
        sc.titleKo.toLowerCase().includes(q) ||
        sc.titleEn.toLowerCase().includes(q) ||
        sc.titleBn.toLowerCase().includes(q) ||
        sc.titleNe.toLowerCase().includes(q) ||
        sc.domainTitleEn.toLowerCase().includes(q)
      );
    });
  }, [scenarios, selectedDomainId, selectedLevel, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredScenarios.length / SCENARIOS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedScenarios = useMemo(() => {
    const start = (safePage - 1) * SCENARIOS_PER_PAGE;
    return filteredScenarios.slice(start, start + SCENARIOS_PER_PAGE);
  }, [filteredScenarios, safePage]);

  const activeScenario = useMemo(() => {
    return (
      filteredScenarios.find(s => s.id === activeScenarioId) ||
      filteredScenarios[0] ||
      scenarios[0]
    );
  }, [filteredScenarios, activeScenarioId, scenarios]);

  useEffect(() => {
    setSelectedQuizChoice(null);
  }, [activeScenario?.id]);

  const handlePlayFullDialogue = () => {
    if (!activeScenario) return;
    if (isPlayingDialogue) {
      stopDialogueAudio();
      return;
    }
    setIsPlayingDialogue(true);
    let elapsedMs = 0;
    activeScenario.dialogue.forEach((turn, idx) => {
      const tId = window.setTimeout(() => {
        setPlayingTurnIdx(idx);
        playKoreanAudio(turn.korean, undefined, 0.86);
      }, elapsedMs);
      timersRef.current.push(tId);
      elapsedMs += Math.max(2600, turn.korean.length * 165);
    });
    const endId = window.setTimeout(() => {
      setIsPlayingDialogue(false);
      setPlayingTurnIdx(null);
    }, elapsedMs + 400);
    timersRef.current.push(endId);
  };

  if (!activeScenario) return null;

  const isCompleted = completedScenarioIds.includes(activeScenario.id);
  const pronLabel =
    uiLang === 'bn'
      ? 'বাংলা উচ্চারণ'
      : uiLang === 'ne'
      ? 'नेपाली उच्चारण'
      : 'Pronunciation';

  return (
    <div className="space-y-6">
      {/* 22 Real-Life Korea Domains Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {pickTriLingual(uiLang, {
                en: '22 Real-Life Korea Situational Domains',
                bn: 'দক্ষিণ কোরিয়ার ২২টি বাস্তব জীবনের পরিস্থিতি',
                ne: 'दक्षिण कोरियाको २२ वास्तविक जीवन परिस्थितिहरू',
              })}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {pickTriLingual(uiLang, {
                en: `Korea Survival & Academic Scenarios (${scenarios.length} Units)`,
                bn: `কোরিয়ায় বসবাস ও উচ্চশিক্ষার কথোপকথন (${scenarios.length}টি অধ্যায়)`,
                ne: `कोरिया बसाइ र अध्ययन संवादहरू (${scenarios.length} एकाइ)`,
              })}
            </h2>
          </div>

          <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            {completedScenarioIds.length} / {scenarios.length}{' '}
            {pickTriLingual(uiLang, { en: 'Completed', bn: 'সম্পন্ন', ne: 'सम्पन्न' })}
          </div>
        </div>

        {/* Horizontal / Grid Domain Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => {
              setSelectedDomainId('all');
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
              selectedDomainId === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
            }`}
          >
            {pickTriLingual(uiLang, {
              en: `All 22 Domains (${scenarios.length})`,
              bn: `সকল ২২টি ক্ষেত্র (${scenarios.length})`,
              ne: `सबै २२ क्षेत्र (${scenarios.length})`,
            })}
          </button>
          {SCENARIO_DOMAINS_22_LIST.map(dom => {
            const active = selectedDomainId === dom.domainId;
            return (
              <button
                key={dom.domainId}
                onClick={() => {
                  setSelectedDomainId(dom.domainId);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {dom.order}.{' '}
                {pickTriLingual(uiLang, {
                  en: dom.titleEn,
                  bn: dom.titleBn,
                  ne: dom.titleNe,
                })}
              </button>
            );
          })}
        </div>

        {/* Search + Level Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={pickTriLingual(uiLang, {
                en: 'Search scenarios (e.g., Incheon Airport, ARC, Professor, Part-time job, Bank, 119)...',
                bn: 'যেকোনো পরিস্থিতি খুঁজুন (যেমন: ইনছন বিমানবন্দর, এআরসি, প্রফেসর, আলবা, ব্যাংক)...',
                ne: 'परिस्थिति खोज्नुहोस् (जस्तै: इन्चोन विमानस्थल, ARC, प्रोफेसर, पार्ट-टाइम काम, बैंक)...',
              })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-4">
            <select
              value={selectedLevel}
              onChange={e => {
                setSelectedLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
            >
              <option value="all">
                {pickTriLingual(uiLang, {
                  en: 'All 10 Curriculum Levels',
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
          </div>
        </div>
      </div>

      {/* Split Explorer: Left Paginated List + Right Interactive Scenario Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>
                {filteredScenarios.length}{' '}
                {pickTriLingual(uiLang, { en: 'Scenarios', bn: 'টি কথোপকথন', ne: 'संवादहरू' })}
              </span>
              <span>
                {safePage} / {totalPages}
              </span>
            </div>

            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {pagedScenarios.map(sc => {
                const selected = sc.id === activeScenario.id;
                const done = completedScenarioIds.includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    onClick={() => setActiveScenarioId(sc.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-slate-50/70 dark:bg-slate-800/50 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-[11px] font-bold ${
                          selected ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {sc.level}
                      </span>
                      {done && (
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            selected ? 'text-white' : 'text-emerald-500'
                          }`}
                        />
                      )}
                    </div>
                    <div className="text-xs font-bold opacity-85">{sc.titleKo}</div>
                    <div className="text-sm font-black leading-snug mt-0.5">
                      {pickTriLingual(uiLang, {
                        en: sc.titleEn,
                        bn: sc.titleBn,
                        ne: sc.titleNe,
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {pickTriLingual(uiLang, { en: 'Prev', bn: 'পূর্ববর্তী', ne: 'अघिल्लो' })}
            </button>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              {pickTriLingual(uiLang, { en: 'Next', bn: 'পরবর্তী', ne: 'अर्को' })}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Interactive Scenario View */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                    {pickTriLingual(uiLang, {
                      en: activeScenario.domainTitleEn,
                      bn: activeScenario.domainTitleBn,
                      ne: activeScenario.domainTitleNe,
                    })}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                    {activeScenario.level}
                  </span>
                </div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 pt-1">
                  {activeScenario.titleKo}
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {pickTriLingual(uiLang, {
                    en: activeScenario.titleEn,
                    bn: activeScenario.titleBn,
                    ne: activeScenario.titleNe,
                  })}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {pickTriLingual(uiLang, {
                    en: activeScenario.settingEn,
                    bn: activeScenario.settingBn,
                    ne: activeScenario.settingNe,
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onLaunchRoleplayWithTutor && (
                  <button
                    onClick={() =>
                      onLaunchRoleplayWithTutor(activeScenario.titleEn, activeScenario.level)
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {pickTriLingual(uiLang, {
                      en: 'Roleplay with AI Tutor',
                      bn: 'AI টিউটরের সাথে অনুশীলন',
                      ne: 'AI ट्युटरसँग अभ्यास',
                    })}
                  </button>
                )}

                <button
                  onClick={() => onToggleScenarioComplete(activeScenario.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isCompleted
                    ? pickTriLingual(uiLang, {
                        en: 'Completed',
                        bn: 'সম্পন্ন',
                        ne: 'सम्पन्न',
                      })
                    : pickTriLingual(uiLang, {
                        en: 'Mark Complete',
                        bn: 'সম্পন্ন চিহ্নিত করুন',
                        ne: 'सम्पन्न चिन्ह लगाउनुहोस्',
                      })}
                </button>
              </div>
            </div>

            {/* Key Scenario Vocabulary */}
            {activeScenario.keyVocab.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  {pickTriLingual(uiLang, {
                    en: 'Essential Scenario Vocabulary',
                    bn: 'এই পরিস্থিতির গুরুত্বপূর্ণ শব্দভাণ্ডার',
                    ne: 'यस परिस्थितिका मुख्य शब्दहरू',
                  })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeScenario.keyVocab.map((kv, idx) => {
                    const scriptPron = getScriptPronunciation(kv.korean, uiLang, {
                      pronunciationBn: kv.pronBn,
                      pronunciationNe: kv.pronNe,
                      romanization: kv.romanization,
                    });
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-black text-sm text-slate-900 dark:text-white">
                            {kv.korean}
                          </div>
                          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            {pronLabel}: {scriptPron}
                          </div>
                          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                            {pickTriLingual(uiLang, { en: kv.en, bn: kv.bn, ne: kv.ne })}
                          </div>
                        </div>
                        <button
                          onClick={() => playKoreanAudio(kv.korean)}
                          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 shrink-0"
                          title="Play Audio"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dialogue Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={handlePlayFullDialogue}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                  isPlayingDialogue
                    ? 'bg-rose-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isPlayingDialogue ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    {pickTriLingual(uiLang, {
                      en: 'Stop Dialogue Audio',
                      bn: 'অডিও থামান',
                      ne: 'अडियो रोक्नुहोस्',
                    })}
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {pickTriLingual(uiLang, {
                      en: 'Play Full Dialogue',
                      bn: 'সম্পূর্ণ কথোপকথন শুনুন',
                      ne: 'पूरा संवाद सुन्नुहोस्',
                    })}
                  </>
                )}
              </button>

              <button
                onClick={() => setHideTranslation(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {hideTranslation ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {hideTranslation
                  ? pickTriLingual(uiLang, {
                      en: 'Show Meanings',
                      bn: 'অর্থ দেখান',
                      ne: 'अर्थ देखाउनुहोस्',
                    })
                  : pickTriLingual(uiLang, {
                      en: 'Hide Meanings (Shadowing)',
                      bn: 'অর্থ লুকান (অনুশীলন)',
                      ne: 'अर्थ लुकाउनुहोस् (अभ्यास)',
                    })}
              </button>
            </div>

            {/* Multi-Turn Dialogue Lines */}
            <div className="space-y-3">
              {activeScenario.dialogue.map((turn, idx) => {
                const isTurnPlaying = playingTurnIdx === idx;
                const linePron = getScriptPronunciation(turn.korean, uiLang, {
                  pronunciationBn: turn.pronunciationBn,
                  pronunciationNe: turn.pronunciationNe,
                  romanization: turn.romanization,
                });
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isTurnPlaying
                        ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-400'
                        : idx % 2 === 0
                        ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {turn.speakerKo} •{' '}
                          {pickTriLingual(uiLang, {
                            en: turn.speakerRoleEn,
                            bn: turn.speakerRoleBn,
                            ne: turn.speakerRoleNe,
                          })}
                        </div>
                        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-relaxed">
                          {turn.korean}
                        </div>
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {pronLabel}: {linePron}
                        </div>
                        {!hideTranslation && (
                          <div className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 pt-0.5">
                            {pickTriLingual(uiLang, {
                              en: turn.meaningEn,
                              bn: turn.meaningBn,
                              ne: turn.meaningNe,
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => playKoreanAudio(turn.korean, undefined, 0.86)}
                          className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                          title="Play Line"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => playKoreanAudio(turn.korean, undefined, 0.6)}
                          className="px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200"
                          title="Slow 0.6x"
                        >
                          0.6x
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scenario Comprehension Exercise */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <HelpCircle className="w-4 h-4" />
                {pickTriLingual(uiLang, {
                  en: 'Scenario Practice Check',
                  bn: 'কথোপকথন যাচাই প্রশ্ন',
                  ne: 'संवाद अभ्यास प्रश्न',
                })}
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {pickTriLingual(uiLang, {
                  en: activeScenario.practiceExercise.questionEn,
                  bn: activeScenario.practiceExercise.questionBn,
                  ne: activeScenario.practiceExercise.questionNe,
                })}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeScenario.practiceExercise.options.map((opt, idx) => {
                  const isChosen = selectedQuizChoice === idx;
                  const isCorrect = idx === activeScenario.practiceExercise.correctIndex;
                  const showResult = selectedQuizChoice !== null;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedQuizChoice(idx)}
                      className={`text-left p-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-all ${
                        showResult && isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                          : showResult && isChosen && !isCorrect
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <span>{opt}</span>
                      {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {showResult && isChosen && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {selectedQuizChoice !== null && (
                <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong className="text-blue-700 dark:text-blue-300 mr-1.5">
                    {pickTriLingual(uiLang, { en: 'Explanation:', bn: 'ব্যাখ্যা:', ne: 'व्याख्या:' })}
                  </strong>
                  {pickTriLingual(uiLang, {
                    en: activeScenario.practiceExercise.explanationEn,
                    bn: activeScenario.practiceExercise.explanationBn,
                    ne: activeScenario.practiceExercise.explanationNe,
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
