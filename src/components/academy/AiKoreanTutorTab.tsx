import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileEdit,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { AcademyLanguage } from '../../data/koreanAcademyData';
import { CURRICULUM_LEVELS_20X, getLevelLabel } from '../../data/korean20x/levelsAndCategories';
import { SCENARIO_DOMAINS_22_LIST } from '../../data/korean20x/scenariosAndConversations20x';
import { playKoreanAudio } from '../../services/koreanAcademyService';
import { getScriptPronunciation, pickTriLingual } from '../../utils/hangulPhonetics';

interface AiKoreanTutorTabProps {
  uiLang: AcademyLanguage;
  initialMode?: 'conversation' | 'writing';
  initialScenarioTitle?: string;
  initialWritingGoal?: string;
  initialLevel?: string;
  presetNonce?: number;
}

interface TutorTurn {
  role: 'user' | 'tutor';
  text: string;
  pronunciation?: string;
  translation?: string;
  grammarFeedback?: string;
  politenessNote?: string;
  suggestedReplies?: string[];
}

interface WritingCheckResult {
  correctedKorean: string;
  correctedPronunciation: string;
  naturalHonorific: string;
  score: number;
  overallFeedback: string;
  mistakes: Array<{ original: string; corrected: string; explanation: string }>;
}

export const AiKoreanTutorTab: React.FC<AiKoreanTutorTabProps> = ({
  uiLang,
  initialMode,
  initialScenarioTitle,
  initialWritingGoal,
  initialLevel,
  presetNonce,
}) => {
  const [mode, setMode] = useState<'conversation' | 'writing'>(initialMode || 'conversation');
  const [scenarioTitle, setScenarioTitle] = useState<string>(
    initialScenarioTitle || SCENARIO_DOMAINS_22_LIST[0].titleEn
  );
  const [level, setLevel] = useState<string>(initialLevel || 'Beginner 1');

  // Conversation Tutor State
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [turns, setTurns] = useState<TutorTurn[]>(() => {
    const openingKo = '안녕하세요! 오늘 어떤 한국어 상황을 같이 연습해 볼까요? 편하게 한국어로 말해 보세요.';
    return [
      {
        role: 'tutor',
        text: openingKo,
        pronunciation: getScriptPronunciation(openingKo, uiLang),
        translation: pickTriLingual(uiLang, {
          en: 'Hello! Which Korean real-life situation shall we practice together today? Feel free to reply in Korean.',
          bn: 'হ্যালো! আজ আমরা কোন কোরিয়ান বাস্তব পরিস্থিতি একসাথে অনুশীলন করব? নির্দ্বিধায় কোরিয়ান ভাষায় উত্তর দিন।',
          ne: 'नमस्ते! आज हामी कुन कोरियन वास्तविक परिस्थिति सँगै अभ्यास गरौँ? निर्धक्क कोरियनमा लेख्नुहोस्।',
        }),
        politenessNote: '해요체 (Polite)',
        suggestedReplies: [
          '안녕하세요! 외국인등록증을 신청하고 싶어요.',
          '교수님, 수업 과제에 대해 질문이 있습니다.',
          '아르바이트 면접을 보러 왔습니다.',
        ],
      },
    ];
  });

  // Writing Check State
  const [writingInput, setWritingInput] = useState<string>(
    '교수님 안녕하세요. 저는 내일 병원 가야 해서 수업 못 가요. 죄송합니다.'
  );
  const [writingGoal, setWritingGoal] = useState<string>(
    initialWritingGoal || 'Polite email to university professor'
  );
  const [writingLoading, setWritingLoading] = useState<boolean>(false);
  const [writingResult, setWritingResult] = useState<WritingCheckResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (initialMode) setMode(initialMode);
    if (initialScenarioTitle) setScenarioTitle(initialScenarioTitle);
    if (initialWritingGoal) setWritingGoal(initialWritingGoal);
    if (initialLevel) setLevel(initialLevel);
  }, [presetNonce, initialMode, initialScenarioTitle, initialWritingGoal, initialLevel]);

  const sendTutorMessage = async (customText?: string) => {
    const content = (customText ?? chatInput).trim();
    if (!content || chatLoading) return;
    setChatInput('');
    setErrorMsg('');

    const nextHistory: TutorTurn[] = [...turns, { role: 'user', text: content }];
    setTurns(nextHistory);
    setChatLoading(true);

    try {
      const res = await fetch('/api/korean-tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          scenarioTitle,
          level,
          explanationLanguage: uiLang,
          history: nextHistory.slice(-6).map(t => ({ role: t.role, text: t.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to reach AI Korean Tutor');
      }
      setTurns(prev => [
        ...prev,
        {
          role: 'tutor',
          text: data.replyKo,
          pronunciation: data.pronunciation || getScriptPronunciation(data.replyKo, uiLang),
          translation: data.translation,
          grammarFeedback: data.grammarFeedback,
          politenessNote: data.politenessNote,
          suggestedReplies: data.suggestedReplies,
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Connection issue while contacting Korean Tutor.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleWritingCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writingInput.trim() || writingLoading) return;
    setWritingLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/korean-tutor/writing-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: writingInput,
          contextGoal: writingGoal,
          explanationLanguage: uiLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to check Korean writing');
      }
      setWritingResult(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error checking Korean text.');
    } finally {
      setWritingLoading(false);
    }
  };

  const pronLabel =
    uiLang === 'bn'
      ? 'বাংলা উচ্চারণ'
      : uiLang === 'ne'
      ? 'नेपाली उच्चारण'
      : 'Pronunciation';

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {pickTriLingual(uiLang, {
              en: 'Smart AI Korean Language Coach',
              bn: 'স্মার্ট এআই কোরিয়ান ভাষা কোচ',
              ne: 'स्मार्ट एआई कोरियन भाषा प्रशिक्षक',
            })}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
            {pickTriLingual(uiLang, {
              en: 'AI Conversation Roleplay & Korean Writing Correction',
              bn: 'এআই কথোপকথন অনুশীলন ও কোরিয়ান বানান/ব্যাকরণ সংশোধন',
              ne: 'एआई संवाद अभ्यास र कोरियन लेखन सुधार',
            })}
          </h2>
        </div>

        <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setMode('conversation')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mode === 'conversation'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            {pickTriLingual(uiLang, {
              en: 'Conversation Tutor',
              bn: 'কথোপকথন টিউটর',
              ne: 'संवाद ट्युटर',
            })}
          </button>
          <button
            onClick={() => setMode('writing')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mode === 'writing'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            {pickTriLingual(uiLang, {
              en: 'Writing Correction',
              bn: 'লেখা সংশোধন',
              ne: 'लेखन सुधार',
            })}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-200">
          {errorMsg}
        </div>
      )}

      {mode === 'conversation' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          {/* Scenario & Level Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                {pickTriLingual(uiLang, {
                  en: 'Roleplay Situation (22 Korea Domains)',
                  bn: 'রোলপ্লে পরিস্থিতি নির্বাচন করুন',
                  ne: 'अभ्यास परिस्थिति छान्नुहोस्',
                })}
              </label>
              <select
                value={scenarioTitle}
                onChange={e => setScenarioTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
              >
                {SCENARIO_DOMAINS_22_LIST.map(d => (
                  <option key={d.domainId} value={d.titleEn}>
                    {d.order}. {pickTriLingual(uiLang, { en: d.titleEn, bn: d.titleBn, ne: d.titleNe })} ({d.titleKo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                {pickTriLingual(uiLang, {
                  en: 'Target Proficiency Level',
                  bn: 'আপনার কোরিয়ান লেভেল',
                  ne: 'तपाईंको कोरियन तह',
                })}
              </label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
              >
                {CURRICULUM_LEVELS_20X.map(lv => (
                  <option key={lv.id} value={lv.id}>
                    {getLevelLabel(lv, uiLang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dialogue Feed */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {turns.map((t, idx) => (
              <div
                key={idx}
                className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl p-4 space-y-2 ${
                    t.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm sm:text-base font-bold leading-relaxed">{t.text}</div>
                    {t.role === 'tutor' && (
                      <button
                        onClick={() => playKoreanAudio(t.text)}
                        className="p-2 rounded-xl bg-blue-600 text-white shrink-0"
                        title="Listen Korean"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {t.role === 'tutor' && (
                    <>
                      {t.pronunciation && (
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {pronLabel}: {getScriptPronunciation(t.text, uiLang)}
                        </div>
                      )}
                      {t.translation && (
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {t.translation}
                        </div>
                      )}
                      {t.grammarFeedback && (
                        <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                          <strong>
                            {pickTriLingual(uiLang, {
                              en: 'Grammar & Politeness Coach: ',
                              bn: 'ব্যাকরণ ও শিষ্টাচার পরামর্শ: ',
                              ne: 'व्याकरण र शिष्टाचार सुझाव: ',
                            })}
                          </strong>
                          {t.grammarFeedback}
                        </div>
                      )}
                      {t.suggestedReplies && t.suggestedReplies.length > 0 && idx === turns.length - 1 && (
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          {t.suggestedReplies.map((sr, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => sendTutorMessage(sr)}
                              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 hover:border-blue-400"
                            >
                              {sr}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                {pickTriLingual(uiLang, {
                  en: 'Korean Tutor is composing response...',
                  bn: 'কোরিয়ান টিউটর উত্তর প্রস্তুত করছে...',
                  ne: 'कोरियन ट्युटर जवाफ तयार गर्दैछ...',
                })}
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              sendTutorMessage();
            }}
            className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
          >
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={pickTriLingual(uiLang, {
                en: 'Write in Korean (or ask how to say something in Korean)...',
                bn: 'কোরিয়ান ভাষায় লিখুন (অথবা কীভাবে বলতে হয় জিজ্ঞাসা করুন)...',
                ne: 'कोरियनमा लेख्नुहोस् (वा कसरी भन्ने सोध्नुहोस्)...',
              })}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {pickTriLingual(uiLang, { en: 'Send', bn: 'পাঠান', ne: 'पठाउनुहोस्' })}
            </button>
          </form>
        </div>
      ) : (
        /* Mode 2: AI Korean Writing Correction */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleWritingCheck}
            className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                {pickTriLingual(uiLang, {
                  en: 'Writing Context / Goal',
                  bn: 'লেখার উদ্দেশ্য বা প্রেক্ষাপট',
                  ne: 'लेखनको उद्देश्य वा सन्दर्भ',
                })}
              </label>
              <select
                value={writingGoal}
                onChange={e => setWritingGoal(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
              >
                <option value="Polite email to university professor">
                  Email / Message to University Professor (교수님께 이메일)
                </option>
                <option value="Part-time job or corporate cover letter">
                  Job / Alba Application & Workplace Message (취업·알바 문의)
                </option>
                <option value="TOPIK II Question 53/54 Academic Essay">
                  TOPIK II Academic Essay Writing (TOPIK II 쓰기 53·54번)
                </option>
                <option value="General polite daily Korean conversation">
                  Everyday Polite Korean Sentence (일상 존댓말 문장)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                {pickTriLingual(uiLang, {
                  en: 'Your Korean Sentence or Paragraph',
                  bn: 'আপনার লেখা কোরিয়ান বাক্য বা অনুচ্ছেদ',
                  ne: 'तपाईंको कोरियन वाक्य वा अनुच्छेद',
                })}
              </label>
              <textarea
                rows={6}
                value={writingInput}
                onChange={e => setWritingInput(e.target.value)}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm sm:text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={writingLoading || !writingInput.trim()}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {writingLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {pickTriLingual(uiLang, {
                en: 'Check Grammar, Spacing & Honorifics',
                bn: 'বানান, স্পেসিং ও ব্যাকরণ যাচাই করুন',
                ne: 'हिज्जे, स्पेसिङ र व्याकरण जाँच गर्नुहोस्',
              })}
            </button>
          </form>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            {!writingResult ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-2">
                <FileEdit className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {pickTriLingual(uiLang, {
                    en: 'Instant Korean Proofreading & Honorific Upgrade',
                    bn: 'তাৎক্ষণিক কোরিয়ান বাক্য সংশোধন ও ব্যাখ্যা',
                    ne: 'तत्काल कोरियन वाक्य सुधार र व्याख्या',
                  })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  {pickTriLingual(uiLang, {
                    en: 'Submit any Korean sentence on the left to inspect particle errors, spacing (띄어쓰기), natural polite phrasing, and explanations in your chosen language.',
                    bn: 'বাম পাশে যেকোনো কোরিয়ান বাক্য লিখে সাবমিট করলে পার্টিকেল, স্পেসিং (띄어쓰기) ও সম্মানসূচক রূপ বাংলায় ব্যাখ্যাসহ পাবেন।',
                    ne: 'बायाँपट्टि कोरियन वाक्य लेखी जाँच गर्दा कारक चिन्ह, स्पेसिङ (띄어쓰기) र आदरार्थी रूप नेपाली व्याख्यासहित पाउनुहुनेछ।',
                  })}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    {pickTriLingual(uiLang, {
                      en: 'Corrected Natural Korean',
                      bn: 'সংশোধিত প্রাকৃতিক কোরিয়ান',
                      ne: 'सुधारिएको स्वाभाविक कोरियन',
                    })}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-black">
                    Score: {writingResult.score}/100
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {writingResult.correctedKorean}
                    </div>
                    <button
                      onClick={() => playKoreanAudio(writingResult.correctedKorean)}
                      className="p-2 rounded-xl bg-emerald-600 text-white shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {pronLabel}: {getScriptPronunciation(writingResult.correctedKorean, uiLang)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    {pickTriLingual(uiLang, {
                      en: 'Formal / Honorific Version (교수님·공식 문서용):',
                      bn: 'ফরমাল / সম্মানসূচক রূপ (প্রফেসর বা অফিসের জন্য):',
                      ne: 'औपचारिक / आदरार्थी रूप (प्रोफेसर वा कार्यालयका लागि):',
                    })}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {writingResult.naturalHonorific}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {writingResult.overallFeedback}
                </p>

                {writingResult.mistakes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-black uppercase text-slate-500">
                      {pickTriLingual(uiLang, {
                        en: 'Detailed Corrections',
                        bn: 'বিস্তারিত সংশোধনসমূহ',
                        ne: 'विस्तृत सुधारहरू',
                      })}
                    </div>
                    {writingResult.mistakes.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div>
                          <span className="line-through text-rose-600 dark:text-rose-400 mr-2 font-semibold">
                            {m.original}
                          </span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            → {m.corrected}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">{m.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
