import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  Globe,
  Headphones,
  Layers,
  MessageSquare,
  PenTool,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';
import {
  HOMEPAGE_SAMPLER_CARDS,
  LEARN_HANGUL_MODULES,
  LearnHangulModuleId,
  getLearnHangulText,
  getLocalizedMapValue,
} from '../../data/learnHangulCurriculum';
import {
  loadUserAcademyProgress,
  playKoreanAudio,
  UserAcademyProgress,
} from '../../services/koreanAcademyService';
import learnHangulHeroImg from '../../assets/images/everykr_learn_hangul_hero_1794471323280.jpg';

const MODULE_ICON_MAP: Record<LearnHangulModuleId, React.FC<{ className?: string }>> = {
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

export const HomeLearnHangulShowcase: React.FC = () => {
  const { language, setLanguage, currentUser } = useApp();
  const ui = getLearnHangulText(language);

  const [progress, setProgress] = useState<UserAcademyProgress | null>(null);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadUserAcademyProgress(currentUser?.id, currentUser?.email, currentUser?.name)
      .then(data => {
        if (mounted) setProgress(data);
      })
      .catch(() => {
        // non-blocking
      });
    return () => {
      mounted = false;
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.name]);

  const handlePlaySample = (id: string, koreanText: string) => {
    setPlayingCardId(id);
    playKoreanAudio(koreanText, undefined, 0.82);
    window.setTimeout(() => {
      setPlayingCardId(prev => (prev === id ? null : prev));
    }, 1400);
  };

  const completedCount = progress?.completedLessons?.length || 0;
  const masteredWordsCount = progress?.masteredVocabIds?.length || 0;
  const hasStarted = completedCount > 0 || masteredWordsCount > 0 || (progress?.totalQuestionsAnswered || 0) > 0;

  return (
    <section
      aria-labelledby="everykr-learn-hangul-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-4"
    >
      <div className="rounded-3xl overflow-hidden bg-white dark:bg-[#10243A] border border-slate-200/90 dark:border-slate-800 shadow-lg">
        {/* Top Korean-Inspired Dark & Crimson Banner */}
        <div className="relative bg-[#0B1523] text-white overflow-hidden">
          {/* Subtle Korean Dancheong-inspired top accent bar (Crimson Red, Crisp White, Navy) */}
          <div className="h-1.5 w-full flex">
            <div className="w-1/3 bg-[#CD2E3A]" />
            <div className="w-1/3 bg-white/90" />
            <div className="w-1/3 bg-[#1769AA]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 lg:p-10 items-center">
            {/* Left Copy & CTA Column */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[#F87171]">
                  KOREAN LANGUAGE · FROM ZERO TO CONVERSATION · 한글 교육
                </p>

                {/* Inline Language Switcher Synced with EveryKR */}
                <div className="flex items-center gap-1 bg-white/8 border border-white/15 rounded-xl p-1">
                  <Globe className="w-3.5 h-3.5 text-slate-300 ms-1.5 me-0.5 shrink-0" />
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                        language === lang.code
                          ? 'bg-[#CD2E3A] text-white'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                      title={lang.nativeLabel}
                    >
                      {lang.code}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2
                  id="everykr-learn-hangul-heading"
                  className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white"
                >
                  EveryKR Learn Hangul
                </h2>
                <p className="text-lg sm:text-xl font-bold text-[#F87171] mt-1.5 tracking-wide">
                  한국어, 처음부터 쉽게!
                </p>
                <p className="text-sm sm:text-base text-slate-200 mt-3 max-w-2xl leading-relaxed">
                  {language === 'en'
                    ? 'Learn Korean from zero with structured lessons, interactive exercises and practical conversations.'
                    : ui.sectionDescription}
                </p>
                {language !== 'en' && (
                  <p className="text-xs text-slate-400 mt-1">
                    Learn Korean from zero with structured lessons, interactive exercises and practical conversations.
                  </p>
                )}
              </div>

              {/* Zero-Prior-Knowledge Feature Summary Line */}
              <p className="text-xs sm:text-sm text-slate-300">
                {ui.zeroKnowledgeNote}
              </p>

              {/* Primary CTA & Live Progress Summary */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  to="/learn-hangul"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#CD2E3A] hover:bg-[#B82530] text-white text-sm sm:text-base font-bold shadow-lg shadow-[#CD2E3A]/30 transition-all cursor-pointer"
                >
                  <span>{hasStarted ? ui.continueLearning : 'Start Learning'}</span>
                  {language !== 'en' && !hasStarted && (
                    <span className="text-xs font-semibold text-white/90">({ui.startLearning})</span>
                  )}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>

                <Link
                  to="/learn-hangul?module=korean-quiz"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs sm:text-sm font-semibold transition-colors"
                >
                  <Award className="w-4 h-4 text-[#F87171]" />
                  <span>{language === 'bn' ? 'কোরিয়ান কুইজ দিন' : 'Take Quick Quiz'}</span>
                </Link>

                {hasStarted && (
                  <div className="text-xs text-slate-300 font-medium">
                    <span className="text-white font-bold">{completedCount}</span>{' '}
                    {language === 'bn' ? 'লেসন সম্পন্ন' : 'lessons completed'} ·{' '}
                    <span className="text-white font-bold">{masteredWordsCount}</span>{' '}
                    {language === 'bn' ? 'শব্দ আয়ত্ত' : 'words mastered'}
                  </div>
                )}
              </div>
            </div>

            {/* Right Visual + Interactive Audio Sampler */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-[#10243A] h-44 sm:h-48">
                {!imgError ? (
                  <img
                    src={learnHangulHeroImg}
                    alt="Korean Hangul calligraphy study notebook overlooking traditional Hanok architecture in Seoul"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#CD2E3A]/30 via-[#10243A] to-[#0B1523] flex items-center justify-center">
                    <span className="text-5xl font-black text-white/90 tracking-widest">한글</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1523] via-[#0B1523]/35 to-transparent" />
                <div className="absolute bottom-3 inset-x-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#FCA5A5]">
                      {ui.quickAudioSampler}
                    </p>
                    <p className="text-xs text-white/90 font-medium">
                      한글 · বাংলা উচ্চারণ · বাংলা অর্থ
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Tap-to-Listen First Korean Sound Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                {HOMEPAGE_SAMPLER_CARDS.map(card => {
                  const isPlaying = playingCardId === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handlePlaySample(card.id, card.korean)}
                      className={`text-start p-3 rounded-xl border transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-[#CD2E3A] border-[#F87171] text-white shadow-md'
                          : 'bg-white/6 hover:bg-white/12 border-white/12 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                          {card.korean}
                        </span>
                        <Volume2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isPlaying ? 'text-white scale-110' : 'text-[#F87171]'
                          }`}
                        />
                      </div>
                      <p
                        className={`text-[11px] font-semibold mt-1 truncate ${
                          isPlaying ? 'text-white/95' : 'text-amber-200'
                        }`}
                      >
                        উচ্চারণ: {card.bengaliPron}
                      </p>
                      <p
                        className={`text-[11px] truncate ${
                          isPlaying ? 'text-white/90' : 'text-slate-300'
                        }`}
                      >
                        অর্থ: {card.bengaliMeaning}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Grid: All 9 Structured Learning Modules */}
        <div className="p-6 sm:p-8 bg-slate-50/70 dark:bg-[#0F1E30]/60">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#CD2E3A] dark:text-[#F87171]">
                {ui.exploreModules}
              </p>
              <h3 className="text-lg sm:text-xl font-bold text-[#10243A] dark:text-white mt-0.5">
                {language === 'bn'
                  ? 'ধাপে ধাপে সম্পূর্ণ কোরিয়ান ভাষা শেখার ৯টি মডিউল'
                  : 'Complete 9-Step Beginner-to-Practical Curriculum'}
              </h3>
            </div>
            <Link
              to="/learn-hangul"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#CD2E3A] dark:text-[#F87171] hover:underline shrink-0"
            >
              <span>{language === 'bn' ? 'সম্পূর্ণ লার্নিং পোর্টাল খুলুন' : 'Open Full Learning Workspace'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEARN_HANGUL_MODULES.map(mod => {
              const Icon = MODULE_ICON_MAP[mod.id];
              const localizedTitle = getLocalizedMapValue(mod.title, language);
              const localizedDesc = getLocalizedMapValue(mod.shortDesc, language);
              const localizedCount = getLocalizedMapValue(mod.lessonCountLabel, language);

              return (
                <Link
                  key={mod.id}
                  to={`/learn-hangul?module=${mod.id}`}
                  className="group bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 hover:border-[#CD2E3A] dark:hover:border-[#F87171] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#CD2E3A]/10 dark:bg-[#CD2E3A]/20 text-[#CD2E3A] dark:text-[#FCA5A5] group-hover:bg-[#CD2E3A] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500">
                          {mod.stepNumber} · {mod.koreanTag}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#CD2E3A] dark:group-hover:text-[#F87171] group-hover:translate-x-0.5 rtl:rotate-180 transition-all shrink-0" />
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-[#10243A] dark:text-white group-hover:text-[#CD2E3A] dark:group-hover:text-[#FCA5A5] transition-colors">
                      {localizedTitle}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {localizedDesc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-[#10243A] dark:text-slate-200 truncate">
                      {mod.sampleKorean}{' '}
                      <span className="text-slate-400 font-normal">({mod.sampleBengaliPron})</span>
                    </span>
                    <span className="text-[#CD2E3A] dark:text-[#FCA5A5] font-semibold shrink-0">
                      {localizedCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
