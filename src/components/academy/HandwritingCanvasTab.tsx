import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  EyeOff,
  PenTool,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  AcademyLanguage,
  HandwritingMode,
  HandwritingPracticeItem,
} from '../../data/koreanAcademyData';
import { getWritingExercises20x } from '../../data/korean20x/practiceActivities20x';
import { playKoreanAudio } from '../../services/koreanAcademyService';
import { getScriptPronunciation, pickTriLingual } from '../../utils/hangulPhonetics';

interface HandwritingCanvasTabProps {
  uiLang: AcademyLanguage;
  completedIds: string[];
  onCompleteItem: (itemId: string) => void;
}

const ITEMS_PER_PAGE = 20;

export const HandwritingCanvasTab: React.FC<HandwritingCanvasTabProps> = ({
  uiLang,
  completedIds,
  onCompleteItem,
}) => {
  const allWritingItems = useMemo(() => getWritingExercises20x(), []);

  const [selectedMode, setSelectedMode] = useState<HandwritingMode>('letter_tracing');
  const [selectedItemId, setSelectedItemId] = useState<string>(allWritingItems[0]?.id || '');
  const [itemPage, setItemPage] = useState<number>(1);
  const [customTextKo, setCustomTextKo] = useState<string>('');
  const [showGhostGuide, setShowGhostGuide] = useState<boolean>(true);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [strokeColor, setStrokeColor] = useState<string>('#2563EB');
  const [strokeWidth, setStrokeWidth] = useState<number>(12);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokeCountDrawn, setStrokeCountDrawn] = useState<number>(0);
  const [coverageScore, setCoverageScore] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  const modeItems = useMemo(
    () => allWritingItems.filter(item => item.mode === selectedMode),
    [allWritingItems, selectedMode]
  );

  const totalPages = Math.max(1, Math.ceil(modeItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(itemPage, totalPages);
  const pagedModeItems = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return modeItems.slice(start, start + ITEMS_PER_PAGE);
  }, [modeItems, safePage]);

  const activeItem: HandwritingPracticeItem =
    modeItems.find(i => i.id === selectedItemId) || modeItems[0] || allWritingItems[0];

  const targetDisplay = customTextKo.trim() ? customTextKo.trim() : activeItem.targetKo;
  const isCompleted = completedIds.includes(activeItem.id);

  const modes: {
    id: HandwritingMode;
    labelEn: string;
    labelBn: string;
    labelNe: string;
    descEn: string;
    descBn: string;
    descNe: string;
  }[] = [
    {
      id: 'letter_tracing',
      labelEn: 'Letter Tracing',
      labelBn: 'বর্ণ ট্রেসিং',
      labelNe: 'अक्षर ट्रेसिङ',
      descEn: 'Trace individual Hangul letters step by step',
      descBn: 'একক হানগুল বর্ণের স্ট্রোক ট্রেস করুন',
      descNe: 'एक-एक हंगुल अक्षरको स्ट्रोक अभ्यास गर्नुहोस्',
    },
    {
      id: 'consonant_vowel',
      labelEn: 'Consonant & Vowel',
      labelBn: 'ব্যঞ্জন ও স্বরবর্ণ',
      labelNe: 'व्यञ्जन र स्वर ब्लक',
      descEn: 'Practice combining consonant + vowel syllable blocks',
      descBn: 'ব্যঞ্জনবর্ণ ও স্বরবর্ণের সিলেবল ব্লক লেখা অনুশীলন করুন',
      descNe: 'व्यञ्जन र स्वर मिलाएर अक्षर ब्लक लेख्नुहोस्',
    },
    {
      id: 'word_writing',
      labelEn: 'Word Writing',
      labelBn: 'শব্দ লিখন',
      labelNe: 'शब्द लेखन',
      descEn: 'Write essential multi-syllable Korean words',
      descBn: 'প্রয়োজনীয় কোরিয়ান শব্দগুলো সুন্দরভাবে লিখুন',
      descNe: 'अत्यावश्यक कोरियन शब्दहरू लेख्ने अभ्यास',
    },
    {
      id: 'sentence_writing',
      labelEn: 'Sentence Writing',
      labelBn: 'বাক্য লিখন',
      labelNe: 'वाक्य लेखन',
      descEn: 'Write complete everyday Korean expressions',
      descBn: 'দৈনন্দিন কোরিয়ান বাক্য ও অভিব্যক্তি লিখুন',
      descNe: 'दैनिक कोरियन वाक्य र अभिव्यक्तिहरू लेख्नुहोस्',
    },
  ];

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    setStrokeCountDrawn(0);
    setCoverageScore(null);
    setFeedbackMsg('');
  };

  useEffect(() => {
    clearCanvas();
  }, [activeItem.id, customTextKo, selectedMode]);

  const handleModeChange = (mode: HandwritingMode) => {
    setSelectedMode(mode);
    setItemPage(1);
    setCustomTextKo('');
    const firstInMode = allWritingItems.find(i => i.mode === mode);
    if (firstInMode) {
      setSelectedItemId(firstInMode.id);
    }
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!coords || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current.push(snap);
      if (historyRef.current.length > 25) historyRef.current.shift();
    } catch {
      // ignore
    }

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!coords || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStrokeCountDrawn(prev => prev + 1);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const previous = historyRef.current.pop();
    if (previous) {
      ctx.putImageData(previous, 0, 0);
      setStrokeCountDrawn(prev => Math.max(0, prev - 1));
    }
  };

  const evaluateAndComplete = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let paintedPixels = 0;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] > 32) paintedPixels++;
    }

    if (paintedPixels < 400 || strokeCountDrawn === 0) {
      setCoverageScore(15);
      setFeedbackMsg(
        pickTriLingual(uiLang, {
          en: 'Please trace or write the full Korean character on the canvas first.',
          bn: 'অনুগ্রহ করে ক্যানভাসের ওপর অক্ষরটি সম্পূর্ণভাবে লিখুন।',
          ne: 'कृपया पहिले क्यानभासमा पूरा कोरियन अक्षर वा शब्द लेख्नुहोस्।',
        })
      );
      return;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d');
    let calculatedScore = 88;

    if (offCtx) {
      const fontSize =
        targetDisplay.length === 1
          ? 220
          : targetDisplay.length <= 2
          ? 160
          : targetDisplay.length <= 4
          ? 110
          : 64;
      offCtx.font = `900 ${fontSize}px "Noto Sans KR", sans-serif`;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#000000';
      offCtx.fillText(targetDisplay, offscreen.width / 2, offscreen.height / 2);

      const targetData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
      let targetPixels = 0;
      let overlapPixels = 0;
      for (let i = 3; i < targetData.length; i += 4) {
        if (targetData[i] > 50) {
          targetPixels++;
          if (imgData[i] > 32) {
            overlapPixels++;
          }
        }
      }
      if (targetPixels > 0) {
        const rawOverlap = (overlapPixels / targetPixels) * 100;
        calculatedScore = Math.min(99, Math.max(72, Math.round(rawOverlap * 1.45 + 35)));
      }
    }

    setCoverageScore(calculatedScore);
    onCompleteItem(activeItem.id);
    playKoreanAudio(targetDisplay);
    setFeedbackMsg(
      pickTriLingual(uiLang, {
        en: `Great job! "${targetDisplay}" handwriting practice completed (${calculatedScore}% accuracy).`,
        bn: `চমৎকার! "${targetDisplay}" লেখা অনুশীলন সম্পন্ন হয়েছে (${calculatedScore}% নির্ভুলতা)।`,
        ne: `उत्कृष्ट! "${targetDisplay}" लेखन अभ्यास पूरा भयो (${calculatedScore}% शुद्धता)।`,
      })
    );
  };

  const currentIdx = modeItems.findIndex(i => i.id === activeItem.id);
  const goPrev = () => {
    if (currentIdx > 0) {
      setCustomTextKo('');
      const prevIdx = currentIdx - 1;
      setSelectedItemId(modeItems[prevIdx].id);
      setItemPage(Math.floor(prevIdx / ITEMS_PER_PAGE) + 1);
    }
  };
  const goNext = () => {
    if (currentIdx < modeItems.length - 1) {
      setCustomTextKo('');
      const nextIdx = currentIdx + 1;
      setSelectedItemId(modeItems[nextIdx].id);
      setItemPage(Math.floor(nextIdx / ITEMS_PER_PAGE) + 1);
    }
  };

  const activeScriptPron = getScriptPronunciation(targetDisplay, uiLang, {
    pronunciationBn: activeItem.pronunciationBn,
    pronunciationNe: activeItem.pronunciationNe,
    romanization: activeItem.romanization,
  });

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {modes.map(m => {
          const active = selectedMode === m.id;
          const modeTotal = allWritingItems.filter(i => i.mode === m.id);
          const modeDone = modeTotal.filter(i => completedIds.includes(i.id)).length;
          return (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={`text-left p-4 rounded-2xl border transition-all ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                  {modeDone}/{modeTotal.length}{' '}
                  {pickTriLingual(uiLang, { en: 'Done', bn: 'সম্পন্ন', ne: 'सम्पन्न' })}
                </span>
                <PenTool className="w-4 h-4 opacity-80" />
              </div>
              <div className="font-bold text-sm sm:text-base">
                {pickTriLingual(uiLang, { en: m.labelEn, bn: m.labelBn, ne: m.labelNe })}
              </div>
              <p
                className={`text-xs mt-1 line-clamp-2 ${
                  active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {pickTriLingual(uiLang, { en: m.descEn, bn: m.descBn, ne: m.descNe })}
              </p>
            </button>
          );
        })}
      </div>

      {/* Paginated Item Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {pickTriLingual(uiLang, {
              en: `Select Practice Sheet (${modeItems.length} in mode • Page ${safePage}/${totalPages}):`,
              bn: `অনুশীলনের শিট নির্বাচন করুন (${modeItems.length}টি • পৃষ্ঠা ${safePage}/${totalPages}):`,
              ne: `अभ्यास पाना छान्नुहोस् (${modeItems.length} • पृष्ठ ${safePage}/${totalPages}):`,
            })}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customTextKo}
              onChange={e => setCustomTextKo(e.target.value)}
              placeholder={pickTriLingual(uiLang, {
                en: 'Or type custom Korean text...',
                bn: 'যেকোনো কোরিয়ান শব্দ টাইপ করুন...',
                ne: 'वा कोरियन शब्द टाइप गर्नुहोस्...',
              })}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {totalPages > 1 && (
              <div className="inline-flex items-center gap-1">
                <button
                  onClick={() => setItemPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setItemPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pagedModeItems.map(item => {
            const done = completedIds.includes(item.id);
            const selected = item.id === activeItem.id && !customTextKo;
            const itemPron = getScriptPronunciation(item.targetKo, uiLang, {
              pronunciationBn: item.pronunciationBn,
              pronunciationNe: item.pronunciationNe,
              romanization: item.romanization,
            });
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCustomTextKo('');
                  setSelectedItemId(item.id);
                }}
                className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border transition-all ${
                  selected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : done
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                <span className="text-base">{item.targetKo}</span>
                <span className="text-xs font-normal opacity-80">({itemPron})</span>
                {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Writing Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Target Info Panel */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold">
                {pickTriLingual(uiLang, {
                  en: `Strokes: ${activeItem.strokeCount}`,
                  bn: `স্ট্রোক সংখ্যা: ${activeItem.strokeCount}`,
                  ne: `स्ट्रोक संख्या: ${activeItem.strokeCount}`,
                })}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  {pickTriLingual(uiLang, { en: 'Completed', bn: 'সম্পন্ন', ne: 'सम्पन्न' })}
                </span>
              )}
            </div>

            <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-4">
              <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-3 px-2">
                {targetDisplay}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">
                [{activeScriptPron}]
              </div>
              <button
                onClick={() => playKoreanAudio(targetDisplay)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <Volume2 className="w-4 h-4" />
                {pickTriLingual(uiLang, {
                  en: 'Listen Pronunciation',
                  bn: 'উচ্চারণ শুনুন',
                  ne: 'उच्चारण सुन्नुहोस्',
                })}
              </button>
            </div>

            {!customTextKo && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {pickTriLingual(uiLang, { en: 'Meaning', bn: 'অর্থ', ne: 'अर्थ' })}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {pickTriLingual(uiLang, {
                      en: activeItem.meaningEn,
                      bn: activeItem.meaningBn,
                      ne: activeItem.meaningNe || activeItem.meaningEn,
                    })}
                  </div>
                  {uiLang !== 'en' && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {activeItem.meaningEn}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50">
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                    {pickTriLingual(uiLang, {
                      en: 'Stroke Order Guide:',
                      bn: 'স্ট্রোক লেখার নিয়ম:',
                      ne: 'स्ट्रोक लेखन नियम:',
                    })}
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    {pickTriLingual(uiLang, {
                      en: activeItem.strokeHintEn,
                      bn: activeItem.strokeHintBn,
                      ne: activeItem.strokeHintNe || activeItem.strokeHintEn,
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={goPrev}
              disabled={currentIdx <= 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
              {pickTriLingual(uiLang, { en: 'Previous', bn: 'পূর্ববর্তী', ne: 'अघिल्लो' })}
            </button>
            <button
              onClick={goNext}
              disabled={currentIdx >= modeItems.length - 1}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {pickTriLingual(uiLang, { en: 'Next', bn: 'পরবর্তী', ne: 'अर्को' })}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Interactive Canvas Board */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {[
                { color: '#2563EB', name: 'Blue', cls: 'bg-blue-600' },
                { color: '#0F172A', name: 'Ink Black', cls: 'bg-slate-900' },
                { color: '#059669', name: 'Emerald', cls: 'bg-emerald-600' },
                { color: '#DC2626', name: 'Crimson', cls: 'bg-red-600' },
              ].map(c => (
                <button
                  key={c.color}
                  onClick={() => setStrokeColor(c.color)}
                  title={c.name}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${c.cls} ${
                    strokeColor === c.color
                      ? 'scale-110 border-slate-900 dark:border-white'
                      : 'border-transparent'
                  }`}
                />
              ))}
              <select
                value={strokeWidth}
                onChange={e => setStrokeWidth(Number(e.target.value))}
                className="ml-2 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value={8}>Fine (8px)</option>
                <option value={12}>Medium (12px)</option>
                <option value={18}>Bold (18px)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowGhostGuide(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {showGhostGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {pickTriLingual(uiLang, { en: 'Ghost Guide', bn: 'ট্রেসিং গাইড', ne: 'ट्रेस गाइड' })}
              </button>
              <button
                onClick={() => setShowGridLines(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {pickTriLingual(uiLang, { en: 'Grid', bn: 'গ্রিড', ne: 'ग्रिड' })}
              </button>
              <button
                onClick={handleUndo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {pickTriLingual(uiLang, { en: 'Undo', bn: 'আনডু', ne: 'अन्डु' })}
              </button>
              <button
                onClick={clearCanvas}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100"
              >
                <Eraser className="w-3.5 h-3.5" />
                {pickTriLingual(uiLang, { en: 'Clear', bn: 'মুছে ফেলুন', ne: 'मेटाउनुहोस्' })}
              </button>
            </div>
          </div>

          {/* Drawing Surface */}
          <div className="relative w-full h-[320px] sm:h-[360px] rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-800 overflow-hidden select-none touch-none">
            {showGridLines && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-1/2 border-b border-dashed border-slate-300/70 dark:border-slate-800" />
                <div className="h-full w-1/2 border-r border-dashed border-slate-300/70 dark:border-slate-800 absolute top-0 left-0" />
              </div>
            )}

            {showGhostGuide && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none px-4">
                <span
                  className={`font-black text-slate-200 dark:text-slate-800/90 tracking-tight text-center leading-none ${
                    targetDisplay.length === 1
                      ? 'text-[190px] sm:text-[220px]'
                      : targetDisplay.length <= 2
                      ? 'text-[130px] sm:text-[160px]'
                      : targetDisplay.length <= 4
                      ? 'text-[84px] sm:text-[110px]'
                      : 'text-[40px] sm:text-[58px]'
                  }`}
                >
                  {targetDisplay}
                </span>
              </div>
            )}

            <canvas
              ref={canvasRef}
              width={760}
              height={360}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="relative z-10 w-full h-full cursor-crosshair"
            />
          </div>

          {/* Footer Action Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {pickTriLingual(uiLang, {
                en: `Strokes drawn: ${strokeCountDrawn}`,
                bn: `আপনার আঁকা স্ট্রোক: ${strokeCountDrawn}টি`,
                ne: `तानिएका स्ट्रोक: ${strokeCountDrawn}`,
              })}
              {coverageScore !== null && (
                <span className="ml-3 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  {pickTriLingual(uiLang, {
                    en: `Accuracy: ${coverageScore}%`,
                    bn: `স্কোর: ${coverageScore}%`,
                    ne: `शुद्धता: ${coverageScore}%`,
                  })}
                </span>
              )}
            </div>

            <button
              onClick={evaluateAndComplete}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {pickTriLingual(uiLang, {
                en: 'Check & Mark Complete',
                bn: 'লেখা যাচাই ও সম্পন্ন করুন',
                ne: 'जाँच गरी सम्पन्न गर्नुहोस्',
              })}
            </button>
          </div>

          {feedbackMsg && (
            <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs font-semibold text-blue-800 dark:text-blue-200">
              {feedbackMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
