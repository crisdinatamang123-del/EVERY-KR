import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Bookmark,
  Bot,
  ChevronLeft,
  ChevronRight,
  Flame,
  Mic,
  MicOff,
  Search,
  Volume2,
} from 'lucide-react';
import {
  EVERYDAY_LIFE_16_CATEGORIES,
} from '../../data/learnKoreanGrammarAndPractice';
import {
  getPronunciationDrills20x,
  getSpeakingChallenges20x,
} from '../../data/korean20x/practiceActivities20x';
import {
  evaluateKoreanWritingLocally,
  getKorean50xConversations,
  getKorean50xGrammarLessons,
  getKorean50xListeningLab,
  getKorean50xReadingPassages,
  getKorean50xSentenceBuilders,
  getKorean50xVocabulary,
  getKorean50xWritingPrompts,
  GRAMMAR_CATEGORIES_13,
  isLearnKoreanRtl,
  KoreanVocab50xEntry,
  pickMultiLang,
  SENTENCE_CATEGORIES_12,
  VOCAB_CATEGORIES_19,
  WRITING_CATEGORIES_8,
} from '../../data/korean50x/korean50xContentEngine';
import { fisherYatesShuffle } from '../../services/koreanExamEngine';
import {
  getScriptPronunciation,
  LearningExplanationLang,
  pickTriLingual,
} from '../../utils/hangulPhonetics';
import { playKoreanAudio } from '../../services/koreanAcademyService';
import {
  CURATED_KOREAN_ANTONYM_MAP,
  VocabActivityMode,
  VocabLexicalFocus,
} from './learnKoreanCategoriesConfig';

// ============================================================================
// MODULE 2: VOCABULARY (19 CATEGORIES • 8 PRACTICE ACTIVITIES • SYNONYMS & ANTONYMS)
// ============================================================================
interface VocabModuleProps {
  uiLang: LearningExplanationLang;
  bookmarkedIds: string[];
  weakIds: string[];
  masteredIds: string[];
  onToggleBookmark: (id: string) => void;
  onToggleMastered: (id: string) => void;
  onRecordMistake: (id: string) => void;
  onOpenAiTutor: (context: string) => void;
  initialCategory?: string;
  initialDifficulty?: string;
  initialActivityMode?: VocabActivityMode;
  initialLexicalFocus?: VocabLexicalFocus;
  presetNonce?: number;
}

export const Vocabulary18CategoriesModuleView: React.FC<VocabModuleProps> = ({
  uiLang,
  bookmarkedIds,
  weakIds,
  masteredIds,
  onToggleBookmark,
  onToggleMastered,
  onRecordMistake,
  onOpenAiTutor,
  initialCategory,
  initialDifficulty,
  initialActivityMode,
  initialLexicalFocus,
  presetNonce,
}) => {
  const allVocab = useMemo(() => getKorean50xVocabulary(), []);

  const [selectedCat, setSelectedCat] = useState<string>(initialCategory || 'all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>(initialDifficulty || 'all');
  const [posFilter, setPosFilter] = useState<string>('all');
  const [lexicalFocus, setLexicalFocus] = useState<VocabLexicalFocus>(
    initialLexicalFocus || 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collectionFilter, setCollectionFilter] = useState<
    'all' | 'favorites' | 'difficult' | 'mastered'
  >('all');
  const [activityMode, setActivityMode] = useState<VocabActivityMode>(
    initialActivityMode || 'cards'
  );

  const [page, setPage] = useState(1);
  const pageSize = 24;

  const [drillIdx, setDrillIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [spellingInput, setSpellingInput] = useState('');
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategory !== undefined) setSelectedCat(initialCategory);
    if (initialDifficulty !== undefined) setDifficultyFilter(initialDifficulty);
    if (initialActivityMode !== undefined) setActivityMode(initialActivityMode);
    if (initialLexicalFocus !== undefined) setLexicalFocus(initialLexicalFocus);
    setPage(1);
    setDrillIdx(0);
    setSelectedOpt(null);
    setFeedback(null);
  }, [
    presetNonce,
    initialCategory,
    initialDifficulty,
    initialActivityMode,
    initialLexicalFocus,
  ]);

  const isRtl = isLearnKoreanRtl(uiLang);

  // Build dedicated curated antonym deck entries merged cleanly with existing vocabulary
  const antonymDeckWords = useMemo<KoreanVocab50xEntry[]>(() => {
    const byKo = new Map<string, KoreanVocab50xEntry>();
    allVocab.forEach(w => {
      if (!byKo.has(w.korean)) byKo.set(w.korean, w);
    });
    const list: KoreanVocab50xEntry[] = [];
    Object.entries(CURATED_KOREAN_ANTONYM_MAP).forEach(([headKo, ant], idx) => {
      const existing = byKo.get(headKo);
      if (existing) {
        list.push(existing);
      } else {
        const reverseRef = CURATED_KOREAN_ANTONYM_MAP[ant.antonymKo];
        const headMeaning = reverseRef?.antonymMeaningEn || `Opposite of ${ant.antonymMeaningEn}`;
        list.push({
          id: `antonym-pair-${idx + 1}`,
          korean: headKo,
          meaningEn: headMeaning,
          meaningBn: headMeaning,
          meaningNe: headMeaning,
          romanization: getScriptPronunciation(headKo, 'en'),
          pronunciationBn: getScriptPronunciation(headKo, 'bn'),
          pronunciationNe: getScriptPronunciation(headKo, 'ne'),
          partOfSpeech: headKo.endsWith('다') ? 'Adjective' : 'Noun',
          exampleKo: `${headKo} ↔ ${ant.antonymKo}`,
          exampleEn: `${headMeaning} ↔ ${ant.antonymMeaningEn}`,
          exampleBn: `${headMeaning} ↔ ${ant.antonymMeaningEn}`,
          exampleNe: `${headMeaning} ↔ ${ant.antonymMeaningEn}`,
          difficulty: idx < 24 ? 'Beginner' : idx < 48 ? 'Intermediate' : 'Advanced',
          topikLevel: idx < 30 ? 'TOPIK I' : 'TOPIK II',
          category19: idx < 30 ? 'topik_1' : 'topik_2',
          relatedWords: [ant.antonymKo],
          synonyms: [],
          verifiedSource: 'EveryKR Verified Curriculum',
        });
      }
    });
    return list;
  }, [allVocab]);

  const words = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sourcePool = lexicalFocus === 'antonyms' ? antonymDeckWords : allVocab;

    return sourcePool.filter(w => {
      if (selectedCat !== 'all' && w.category19 !== selectedCat) {
        return false;
      }
      if (difficultyFilter !== 'all' && w.difficulty !== difficultyFilter) {
        return false;
      }
      if (posFilter !== 'all' && w.partOfSpeech !== posFilter) {
        return false;
      }
      if (
        lexicalFocus === 'topik' &&
        w.category19 !== 'topik_1' &&
        w.category19 !== 'topik_2'
      ) {
        return false;
      }
      if (lexicalFocus === 'synonyms' && w.synonyms.length === 0) {
        return false;
      }
      if (collectionFilter === 'favorites' && !bookmarkedIds.includes(w.id)) return false;
      if (collectionFilter === 'difficult' && !weakIds.includes(w.id)) return false;
      if (collectionFilter === 'mastered' && !masteredIds.includes(w.id)) return false;
      if (activityMode === 'review_mistakes' && weakIds.length > 0 && !weakIds.includes(w.id)) {
        return false;
      }
      if (q) {
        const ant = CURATED_KOREAN_ANTONYM_MAP[w.korean];
        const matchKo = w.korean.toLowerCase().includes(q);
        const matchRom = w.romanization.toLowerCase().includes(q);
        const matchEn = w.meaningEn.toLowerCase().includes(q);
        const matchBn = (w.meaningBn || '').toLowerCase().includes(q);
        const matchNe = (w.meaningNe || '').toLowerCase().includes(q);
        const matchAnt = ant
          ? ant.antonymKo.toLowerCase().includes(q) ||
            ant.antonymMeaningEn.toLowerCase().includes(q)
          : false;
        return matchKo || matchRom || matchEn || matchBn || matchNe || matchAnt;
      }
      return true;
    });
  }, [
    allVocab,
    antonymDeckWords,
    selectedCat,
    difficultyFilter,
    posFilter,
    lexicalFocus,
    searchQuery,
    collectionFilter,
    bookmarkedIds,
    weakIds,
    masteredIds,
    activityMode,
  ]);

  const totalPages = Math.max(1, Math.ceil(words.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedWords = useMemo(
    () => words.slice((safePage - 1) * pageSize, safePage * pageSize),
    [words, safePage]
  );

  const activeWord = words[drillIdx % Math.max(1, words.length)] || allVocab[0];

  // Unbiased Fisher-Yates shuffled distractor words so correct option is balanced across A, B, C, D
  const distractorWords = useMemo(() => {
    const sameCat = allVocab.filter(
      w => w.id !== activeWord.id && w.category19 === activeWord.category19
    );
    const pool = sameCat.length >= 3 ? sameCat : allVocab.filter(w => w.id !== activeWord.id);
    const picked = fisherYatesShuffle(pool).slice(0, 3);
    return fisherYatesShuffle([activeWord, ...picked]);
  }, [activeWord, allVocab]);

  const getWordMeaning = (w: typeof activeWord) =>
    pickMultiLang(uiLang, { en: w.meaningEn, bn: w.meaningBn, ne: w.meaningNe });

  const getWordExampleTranslation = (w: typeof activeWord) =>
    pickMultiLang(uiLang, { en: w.exampleEn, bn: w.exampleBn, ne: w.exampleNe });

  return (
    <div className="space-y-6">
      {/* Top Practice Activities Bar + Personal Collections */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'cards', label: 'Word Library' },
              { id: 'flashcards', label: 'Flashcards' },
              { id: 'ko_to_meaning', label: 'Korean → Meaning' },
              { id: 'meaning_to_ko', label: 'Meaning → Korean' },
              { id: 'listening_id', label: 'Audio Match' },
              { id: 'fill_blank', label: 'Fill in Blank' },
              { id: 'mcq', label: 'Multiple-Choice' },
              { id: 'spelling', label: 'Spelling' },
              { id: 'review_mistakes', label: `Review Mistakes (${weakIds.length})` },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setActivityMode(m.id as VocabActivityMode);
                  setSelectedOpt(null);
                  setFeedback(null);
                  setSpellingInput('');
                  setDrillIdx(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activityMode === m.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onOpenAiTutor('Korean Vocabulary & Memory Tips')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            Ask AI Tutor
          </button>
        </div>

        {/* Search + Categories + Difficulty + Lexical Focus + POS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search Hangul, Romanization, or meaning..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 19 Category Selector */}
          <select
            value={selectedCat}
            onChange={e => {
              setSelectedCat(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Vocabulary Topics</option>
            {VOCAB_CATEGORIES_19.map(cat => (
              <option key={cat.id} value={cat.id}>
                {pickMultiLang(uiLang, cat.title)} ({cat.titleKo})
              </option>
            ))}
          </select>

          {/* Difficulty Selector */}
          <select
            value={difficultyFilter}
            onChange={e => {
              setDifficultyFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Levels</option>
            <option value="Beginner">Beginner (초급 1)</option>
            <option value="Elementary">Elementary (초급 2)</option>
            <option value="Intermediate">Intermediate (중급 1)</option>
            <option value="Upper-Intermediate">Upper-Intermediate (중급 2)</option>
            <option value="Advanced">Advanced (고급)</option>
          </select>

          {/* Lexical Focus (All / TOPIK / Synonyms / Antonyms) */}
          <select
            value={lexicalFocus}
            onChange={e => {
              setLexicalFocus(e.target.value as VocabLexicalFocus);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">Focus: All Vocabulary</option>
            <option value="topik">TOPIK High-Frequency</option>
            <option value="synonyms">Korean Synonyms (유의어)</option>
            <option value="antonyms">Korean Antonyms (반의어)</option>
          </select>

          {/* Part of Speech Selector */}
          <select
            value={posFilter}
            onChange={e => {
              setPosFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Parts of Speech</option>
            <option value="Noun">Nouns (명사)</option>
            <option value="Verb">Verbs (동사)</option>
            <option value="Adjective">Adjectives (형용사)</option>
            <option value="Adverb">Adverbs (부사)</option>
            <option value="Expression">Expressions (표현)</option>
          </select>
        </div>

        {/* Personal Vocabulary Collections + Pagination Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Words' },
              { id: 'favorites', label: `Saved (${bookmarkedIds.length})` },
              { id: 'difficult', label: `Difficult (${weakIds.length})` },
              { id: 'mastered', label: `Learned (${masteredIds.length})` },
            ].map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCollectionFilter(c.id as typeof collectionFilter);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  collectionFilter === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
            Page {safePage} of {totalPages}
          </div>
        </div>
      </div>

      {/* Mode: Complete 10-Field Vocabulary Cards */}
      {activityMode === 'cards' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedWords.map(w => {
              const isSaved = bookmarkedIds.includes(w.id);
              const isMastered = masteredIds.includes(w.id);
              return (
                <div
                  key={w.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                          {w.difficulty}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                          {w.partOfSpeech}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                          {w.category19.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
                        {w.korean}
                      </div>
                      <div className="text-xs text-slate-500">
                        [{w.romanization}] • {getScriptPronunciation(w.korean, uiLang)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => playKoreanAudio(w.korean)}
                        className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                        title="Listen Korean Audio"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleBookmark(w.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer ${
                          isSaved
                            ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950/50'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                        title="Save to Favorites"
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>

                  <div
                    className="text-base font-black text-emerald-700 dark:text-emerald-400"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {getWordMeaning(w)}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {w.exampleKo}
                      </span>
                      <button
                        type="button"
                        onClick={() => playKoreanAudio(w.exampleKo)}
                        className="text-blue-600 hover:text-blue-700 cursor-pointer shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div
                      className="text-xs text-slate-600 dark:text-slate-300"
                      dir={isRtl ? 'rtl' : 'ltr'}
                    >
                      {getWordExampleTranslation(w)}
                    </div>
                  </div>

                  {(() => {
                    const antonymInfo = CURATED_KOREAN_ANTONYM_MAP[w.korean];
                    return (
                      <>
                        {antonymInfo && (
                          <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="font-bold text-amber-800 dark:text-amber-300 truncate">
                                Antonym: {antonymInfo.antonymKo} ({antonymInfo.antonymMeaningEn})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => playKoreanAudio(antonymInfo.antonymKo)}
                              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 cursor-pointer shrink-0"
                              title="Play Antonym Audio"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {(w.relatedWords.length > 0 || w.synonyms.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                            {w.synonyms.slice(0, 2).map(syn => (
                              <button
                                key={syn}
                                type="button"
                                onClick={() => playKoreanAudio(syn)}
                                className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>Synonym: {syn}</span>
                                <Volume2 className="w-3 h-3" />
                              </button>
                            ))}
                            {w.relatedWords.slice(0, 2).map(rel => (
                              <span
                                key={rel}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              >
                                Related: {rel}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      {w.topikLevel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleMastered(w.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        isMastered
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isMastered ? 'Learned' : 'Mark Learned'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                Showing {(safePage - 1) * pageSize + 1}–
                {Math.min(words.length, safePage * pageSize)} of {words.length.toLocaleString()} words
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <span className="text-xs font-black px-2 tabular-nums">
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Practice Activities 1–8 */}
      {activityMode !== 'cards' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 tabular-nums">
              Interactive Practice • Word {(drillIdx % Math.max(1, words.length)) + 1} of{' '}
              {Math.max(1, words.length).toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDrillIdx(Math.floor(Math.random() * Math.max(1, words.length)));
                  setFlipped(false);
                  setSelectedOpt(null);
                  setFeedback(null);
                  setSpellingInput('');
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
              >
                Random Word
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrillIdx(prev => prev + 1);
                  setFlipped(false);
                  setSelectedOpt(null);
                  setFeedback(null);
                  setSpellingInput('');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Next Word →
              </button>
            </div>
          </div>

          {activityMode === 'flashcards' && (
            <div
              onClick={() => setFlipped(!flipped)}
              className="p-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center space-y-3 cursor-pointer"
            >
              <div className="text-xs uppercase font-bold text-blue-200">
                {flipped ? 'Meaning & Example' : 'Tap to Flip Flashcard'}
              </div>
              <div className="text-4xl font-black">{activeWord.korean}</div>
              <div className="text-sm text-blue-100">
                [{activeWord.romanization}] • {activeWord.partOfSpeech}
              </div>
              {flipped && (
                <div className="pt-4 border-t border-white/20 space-y-2" dir={isRtl ? 'rtl' : 'ltr'}>
                  <div className="text-2xl font-black text-amber-300">
                    {getWordMeaning(activeWord)}
                  </div>
                  <div className="text-xs text-blue-100" dir="ltr">
                    {activeWord.exampleKo}
                  </div>
                  <div className="text-xs text-blue-200">
                    {getWordExampleTranslation(activeWord)}
                  </div>
                </div>
              )}
            </div>
          )}

          {activityMode !== 'flashcards' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center space-y-2">
                {activityMode === 'listening_id' ? (
                  <button
                    type="button"
                    onClick={() => playKoreanAudio(activeWord.korean)}
                    className="px-5 py-3 rounded-xl bg-blue-600 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    Play Mystery Korean Word Audio
                  </button>
                ) : activityMode === 'meaning_to_ko' || activityMode === 'spelling' ? (
                  <div
                    className="text-2xl font-black text-slate-900 dark:text-white"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {getWordMeaning(activeWord)}
                  </div>
                ) : activityMode === 'fill_blank' ? (
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {activeWord.exampleKo.replace(activeWord.korean, '_______')}
                  </div>
                ) : (
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {activeWord.korean}
                  </div>
                )}
              </div>

              {activityMode === 'spelling' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spellingInput}
                    onChange={e => setSpellingInput(e.target.value)}
                    placeholder="Type the Korean word in Hangul..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (spellingInput.trim() === activeWord.korean) {
                        setFeedback('Correct Hangul spelling!');
                        onToggleMastered(activeWord.id);
                      } else {
                        setFeedback(`Correct spelling is: ${activeWord.korean}`);
                        onRecordMistake(activeWord.id);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs cursor-pointer"
                  >
                    Check
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {distractorWords.map((opt, idx) => {
                    const label =
                      activityMode === 'meaning_to_ko' || activityMode === 'fill_blank'
                        ? opt.korean
                        : getWordMeaning(opt);
                    const letter = (['A', 'B', 'C', 'D'] as const)[idx] || 'A';
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedOpt(idx);
                          if (opt.id === activeWord.id) {
                            setFeedback('Correct!');
                            playKoreanAudio(activeWord.korean);
                          } else {
                            setFeedback(`Incorrect — Review saved: ${activeWord.korean}`);
                            onRecordMistake(activeWord.id);
                          }
                        }}
                        className={`p-3.5 rounded-xl border text-xs font-bold text-left cursor-pointer flex items-center gap-2.5 ${
                          selectedOpt === idx
                            ? opt.id === activeWord.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                        dir={isRtl && activityMode !== 'meaning_to_ko' ? 'rtl' : 'ltr'}
                      >
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[11px] font-black shrink-0">
                          {letter}
                        </span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {feedback && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 text-xs font-bold">
                  {feedback}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 3: GRAMMAR ACADEMY (13 CATEGORIES • 451 LESSONS • >=5 EXAMPLES EACH)
// ============================================================================
export const Grammar3TierModuleView: React.FC<{
  uiLang: LearningExplanationLang;
  completedGrammarIds: string[];
  onCompleteGrammar: (id: string) => void;
  onOpenAiTutor: (context: string) => void;
  initialTier?: 'all' | 'Beginner' | 'Intermediate' | 'Advanced';
  initialCategory13?: string;
  initialPracticeFocus?: boolean;
  presetNonce?: number;
}> = ({
  uiLang,
  completedGrammarIds,
  onCompleteGrammar,
  onOpenAiTutor,
  initialTier,
  initialCategory13,
  initialPracticeFocus,
  presetNonce,
}) => {
  const allGrammar = useMemo(() => getKorean50xGrammarLessons(), []);

  const [tier, setTier] = useState<'all' | 'Beginner' | 'Intermediate' | 'Advanced'>(
    initialTier || 'all'
  );
  const [category13, setCategory13] = useState<string>(initialCategory13 || 'all');
  const [practiceFocus, setPracticeFocus] = useState<boolean>(Boolean(initialPracticeFocus));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 8;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const isRtl = isLearnKoreanRtl(uiLang);

  useEffect(() => {
    if (initialTier !== undefined) setTier(initialTier);
    if (initialCategory13 !== undefined) setCategory13(initialCategory13);
    if (initialPracticeFocus !== undefined) setPracticeFocus(initialPracticeFocus);
    setPage(1);
  }, [presetNonce, initialTier, initialCategory13, initialPracticeFocus]);

  const topics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allGrammar.filter(t => {
      if (tier !== 'all' && t.tier !== tier) return false;
      if (category13 !== 'all' && t.category13 !== category13) return false;
      if (q) {
        return (
          t.patternKo.toLowerCase().includes(q) ||
          t.title.en.toLowerCase().includes(q) ||
          t.formula.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allGrammar, tier, category13, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(topics.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedTopics = useMemo(
    () => topics.slice((safePage - 1) * pageSize, safePage * pageSize),
    [topics, safePage]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: 'All Levels' },
                { id: 'Beginner', label: 'Beginner' },
                { id: 'Intermediate', label: 'Intermediate' },
                { id: 'Advanced', label: 'Advanced' },
              ] as const
            ).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTier(t.id);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  tier === t.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPracticeFocus(prev => !prev)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                practiceFocus
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {practiceFocus ? 'Exercises Mode Active' : 'Grammar Exercises Mode'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenAiTutor('Korean Grammar Academy')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            Ask AI Tutor
          </button>
        </div>

        {/* Grammar Categories + Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search grammar pattern (e.g. -아/어서, 은/는)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={category13}
            onChange={e => {
              setCategory13(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Grammar Topics</option>
            {GRAMMAR_CATEGORIES_13.map(cat => (
              <option key={cat.id} value={cat.id}>
                {pickMultiLang(uiLang, cat.title)} ({cat.titleKo})
              </option>
            ))}
          </select>

          <div className="flex items-center justify-end text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
            Page {safePage} of {totalPages}
          </div>
        </div>
      </div>

      {practiceFocus && (
        <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-200">
          <span className="font-bold">
            Grammar Exercises Mode: Complete the interactive check on each card to mark the pattern mastered.
          </span>
          <span className="font-semibold text-blue-300 tabular-nums">
            Completed: {completedGrammarIds.length}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {pagedTopics.map(g => {
          const picked = selectedAnswers[g.id];
          const isDone = completedGrammarIds.includes(g.id);
          const pq = g.practiceQuestions[0];
          return (
            <div
              key={g.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                      {g.tier} Grammar
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                      {g.category13.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {g.patternKo} — {pickMultiLang(uiLang, g.title)}
                  </h3>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Conjugation / Formation: {g.formula}
                  </div>
                </div>
                {isDone && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    Completed
                  </span>
                )}
              </div>

              <p
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {pickMultiLang(uiLang, g.whenToUse)}
              </p>

              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="font-black text-slate-900 dark:text-white">
                    Formal vs Informal Usage:
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {pickMultiLang(uiLang, g.politeVsInformal)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30">
                  <div className="font-black text-rose-700 dark:text-rose-300">
                    Common Mistake to Avoid:
                  </div>
                  <div className="text-rose-600 dark:text-rose-200 mt-0.5">
                    {pickMultiLang(uiLang, g.commonMistakes)}
                  </div>
                </div>
              </div>

              {/* 5+ Example Sentences with Audio & Breakdown */}
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase text-slate-400">
                  Example Sentences ({g.examples.length})
                </div>
                {g.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {i + 1}. {ex.ko}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          ({ex.romanization})
                        </span>
                      </div>
                      <div
                        className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold"
                        dir={isRtl ? 'rtl' : 'ltr'}
                      >
                        {pickMultiLang(uiLang, ex.breakdown)}
                      </div>
                      <div
                        className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5"
                        dir={isRtl ? 'rtl' : 'ltr'}
                      >
                        {pickMultiLang(uiLang, ex.translation)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => playKoreanAudio(ex.ko)}
                      className="p-2.5 rounded-xl bg-blue-600 text-white cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Grammar Practice Question */}
              {pq && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div
                    className="text-xs font-black text-slate-800 dark:text-slate-200"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    Mini Assessment: {pickMultiLang(uiLang, pq.prompt)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {pq.options.map((opt: string, oIdx: number) => (
                      <button
                        key={`${opt}-${oIdx}`}
                        type="button"
                        onClick={() => {
                          setSelectedAnswers(prev => ({ ...prev, [g.id]: oIdx }));
                          if (oIdx === pq.correctIndex) {
                            onCompleteGrammar(g.id);
                          }
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border cursor-pointer ${
                          picked === oIdx
                            ? oIdx === pq.correctIndex
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(topics.length, safePage * pageSize)}{' '}
            of {topics.length} grammar lessons
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-xs font-black px-2 tabular-nums">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 4: SENTENCE BUILDER & EXPRESSION LIBRARY (12 CATEGORIES • 630 EXERCISES)
// ============================================================================
export const SentenceBuilder50xModuleView: React.FC<{
  uiLang: LearningExplanationLang;
  onOpenAiTutor: (context: string) => void;
  initialCategory12?: string;
  initialDifficulty?: string;
  initialExerciseMode?: 'study' | 'reconstruction' | 'word_order' | 'fill_blank' | 'translation';
  presetNonce?: number;
}> = ({
  uiLang,
  onOpenAiTutor,
  initialCategory12,
  initialDifficulty,
  initialExerciseMode,
  presetNonce,
}) => {
  const allSentences = useMemo(() => getKorean50xSentenceBuilders(), []);

  const [selectedCat, setSelectedCat] = useState<string>(initialCategory12 || 'all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>(initialDifficulty || 'all');
  const [exerciseMode, setExerciseMode] = useState<
    'study' | 'reconstruction' | 'word_order' | 'fill_blank' | 'translation'
  >(initialExerciseMode || 'study');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Interactive Exercise State
  const [activeIdx, setActiveIdx] = useState(0);
  const [pickedTiles, setPickedTiles] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [exerciseFeedback, setExerciseFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategory12 !== undefined) setSelectedCat(initialCategory12);
    if (initialDifficulty !== undefined) setDifficultyFilter(initialDifficulty);
    if (initialExerciseMode !== undefined) setExerciseMode(initialExerciseMode);
    setPage(1);
    setActiveIdx(0);
    setPickedTiles([]);
    setSelectedOption(null);
    setExerciseFeedback(null);
  }, [presetNonce, initialCategory12, initialDifficulty, initialExerciseMode]);

  const isRtl = isLearnKoreanRtl(uiLang);

  const filtered = useMemo(() => {
    return allSentences.filter(s => {
      if (selectedCat !== 'all' && s.category12 !== selectedCat) return false;
      if (difficultyFilter !== 'all' && s.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [allSentences, selectedCat, difficultyFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedSentences = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage]
  );

  const activeItem = filtered[activeIdx % Math.max(1, filtered.length)] || allSentences[0];

  const scrambledTiles = useMemo(
    () => fisherYatesShuffle(activeItem.tokens),
    [activeItem]
  );

  const shuffledBlankOptions = useMemo(
    () => fisherYatesShuffle(activeItem.blankOptions),
    [activeItem]
  );

  const getMeaning = (s: typeof activeItem) =>
    pickMultiLang(uiLang, { en: s.meaningEn, bn: s.meaningBn, ne: s.meaningNe });

  const getHint = (s: typeof activeItem) =>
    pickMultiLang(uiLang, { en: s.grammarHintEn, bn: s.grammarHintBn, ne: s.grammarHintNe });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'study', label: 'Sentence Library' },
              { id: 'reconstruction', label: 'Sentence Reconstruction' },
              { id: 'word_order', label: 'Word Ordering (SOV)' },
              { id: 'fill_blank', label: 'Fill-in-the-Blank' },
              { id: 'translation', label: 'Translation Practice' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setExerciseMode(m.id as typeof exerciseMode);
                  setPickedTiles([]);
                  setSelectedOption(null);
                  setExerciseFeedback(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  exerciseMode === m.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onOpenAiTutor('Korean Sentence Structure & Word Order')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            Ask AI Tutor
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <select
            value={selectedCat}
            onChange={e => {
              setSelectedCat(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Sentence Topics</option>
            {SENTENCE_CATEGORIES_12.map(c => (
              <option key={c.id} value={c.id}>
                {pickMultiLang(uiLang, c.title)} ({c.titleKo})
              </option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={e => {
              setDifficultyFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <div className="flex items-center justify-end text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
            Page {safePage} / {totalPages}
          </div>
        </div>
      </div>

      {exerciseMode === 'study' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pagedSentences.map(s => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                      {s.difficulty} • {s.category12.replace(/_/g, ' ')}
                    </span>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1.5">
                      {s.fullKorean}
                    </div>
                    <div className="text-xs text-slate-500">[{s.romanization}]</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => playKoreanAudio(s.fullKorean)}
                    className="p-2.5 rounded-xl bg-blue-600 text-white cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className="text-sm font-black text-emerald-700 dark:text-emerald-400"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  {getMeaning(s)}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400">
                    Hint: {getHint(s)}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {s.tokens.map((t, idx) => (
                      <span
                        key={`${t}-${idx}`}
                        onClick={() => playKoreanAudio(t)}
                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer hover:border-blue-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                ← Previous
              </button>
              <span className="text-xs font-black tabular-nums">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-blue-600 tabular-nums">
              Sentence Builder Drill #{(activeIdx % Math.max(1, filtered.length)) + 1} of{' '}
              {filtered.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveIdx(prev => prev + 1);
                setPickedTiles([]);
                setSelectedOption(null);
                setExerciseFeedback(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
            >
              Next Sentence →
            </button>
          </div>

          <div
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="text-xs font-bold uppercase text-slate-400">Target Meaning</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {getMeaning(activeItem)}
            </div>
            <div className="text-xs text-indigo-600 dark:text-indigo-400" dir="ltr">
              {getHint(activeItem)}
            </div>
          </div>

          {(exerciseMode === 'reconstruction' || exerciseMode === 'word_order') && (
            <div className="space-y-4">
              <div className="min-h-[56px] p-3.5 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 flex flex-wrap items-center gap-2">
                {pickedTiles.length === 0 ? (
                  <span className="text-xs text-slate-400">
                    Tap the Korean word tiles below in the correct order...
                  </span>
                ) : (
                  pickedTiles.map((tile, idx) => (
                    <button
                      key={`${tile}-${idx}`}
                      type="button"
                      onClick={() =>
                        setPickedTiles(prev => prev.filter((_, i) => i !== idx))
                      }
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-black cursor-pointer"
                    >
                      {tile}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {scrambledTiles.map((tile, idx) => (
                  <button
                    key={`${tile}-${idx}`}
                    type="button"
                    onClick={() => {
                      playKoreanAudio(tile);
                      setPickedTiles(prev => [...prev, tile]);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-xs font-black text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {tile}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const candidate = pickedTiles.join(' ').trim();
                    const expected = activeItem.tokens.join(' ').trim();
                    if (
                      candidate === expected ||
                      candidate === activeItem.fullKorean.replace(/[.?]/g, '').trim()
                    ) {
                      setExerciseFeedback(`Perfect sentence order! ${activeItem.fullKorean}`);
                      playKoreanAudio(activeItem.fullKorean);
                    } else {
                      setExerciseFeedback(`Correct order: ${activeItem.tokens.join(' → ')}`);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black cursor-pointer"
                >
                  Check Sentence Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickedTiles([]);
                    setExerciseFeedback(null);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                >
                  Reset Tiles
                </button>
              </div>
            </div>
          )}

          {(exerciseMode === 'fill_blank' || exerciseMode === 'translation') && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 text-base font-black text-slate-900 dark:text-white">
                {exerciseMode === 'fill_blank'
                  ? activeItem.blankSentenceKo
                  : activeItem.fullKorean}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {shuffledBlankOptions.map((opt, idx) => (
                  <button
                    key={`${opt}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedOption(opt);
                      if (opt === activeItem.missingWordKo) {
                        setExerciseFeedback(`Correct! Full sentence: ${activeItem.fullKorean}`);
                        playKoreanAudio(activeItem.fullKorean);
                      } else {
                        setExerciseFeedback(
                          `Correct answer is "${activeItem.missingWordKo}". Full sentence: ${activeItem.fullKorean}`
                        );
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold text-left cursor-pointer ${
                      selectedOption === opt
                        ? opt === activeItem.missingWordKo
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {exerciseFeedback && (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 text-xs font-bold">
              {exerciseFeedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 5: CONVERSATION PRACTICE (523 MULTI-TURN DIALOGUES • FORMAL/INFORMAL)
// ============================================================================
export const ConversationPractice50xModuleView: React.FC<{
  uiLang: LearningExplanationLang;
  onOpenAiTutor: (context: string) => void;
  initialDifficulty?: string;
  initialRegister?: string;
  initialRoleplay?: boolean;
  presetNonce?: number;
}> = ({
  uiLang,
  onOpenAiTutor,
  initialDifficulty,
  initialRegister,
  initialRoleplay,
  presetNonce,
}) => {
  const allConv = useMemo(() => getKorean50xConversations(), []);

  const [difficultyFilter, setDifficultyFilter] = useState<string>(initialDifficulty || 'all');
  const [registerFilter, setRegisterFilter] = useState<string>(initialRegister || 'all');
  const [roleplayHideSpeakerB, setRoleplayHideSpeakerB] = useState<boolean>(
    Boolean(initialRoleplay)
  );
  const [selectedConvId, setSelectedConvId] = useState<string>(allConv[0]?.id || '');

  useEffect(() => {
    if (initialDifficulty !== undefined) setDifficultyFilter(initialDifficulty);
    if (initialRegister !== undefined) setRegisterFilter(initialRegister);
    if (initialRoleplay !== undefined) setRoleplayHideSpeakerB(initialRoleplay);
  }, [presetNonce, initialDifficulty, initialRegister, initialRoleplay]);

  const isRtl = isLearnKoreanRtl(uiLang);

  const filtered = useMemo(() => {
    return allConv.filter(c => {
      if (difficultyFilter !== 'all' && c.difficulty !== difficultyFilter) return false;
      if (registerFilter !== 'all' && c.register !== registerFilter) return false;
      return true;
    });
  }, [allConv, difficultyFilter, registerFilter]);

  const activeConv =
    filtered.find(c => c.id === selectedConvId) || filtered[0] || allConv[0];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Levels</option>
            <option value="Beginner">Beginner Conversations</option>
            <option value="Intermediate">Intermediate Conversations</option>
            <option value="Advanced">Advanced Conversations</option>
          </select>

          <select
            value={registerFilter}
            onChange={e => setRegisterFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Speech Registers</option>
            <option value="Polite (해요체)">Polite (해요체)</option>
            <option value="Formal (하십시오체)">Formal (하십시오체)</option>
            <option value="Informal (반말)">Casual / Informal (반말)</option>
          </select>

          <button
            type="button"
            onClick={() => setRoleplayHideSpeakerB(prev => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
              roleplayHideSpeakerB
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {roleplayHideSpeakerB ? 'Roleplay Mode Active (Speaker B Hidden)' : 'Enable Roleplay Mode'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenAiTutor(activeConv.title.en)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
        >
          <Bot className="w-3.5 h-3.5" />
          Live Roleplay with AI Tutor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5 max-h-[640px] overflow-y-auto">
          <div className="text-xs font-black uppercase text-slate-400 px-2 pb-1">
            {filtered.length} Situational Dialogues
          </div>
          {filtered.slice(0, 120).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedConvId(c.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeConv.id === c.id
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="truncate">{pickMultiLang(uiLang, c.title)}</div>
              <div className="text-[10px] opacity-75 mt-0.5">
                {c.difficulty} • {c.register}
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {activeConv.difficulty}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                  {activeConv.register}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {pickMultiLang(uiLang, activeConv.title)} ({activeConv.titleKo})
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                playKoreanAudio(activeConv.turns.map(d => d.ko).join(' '))
              }
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              Play Full Conversation
            </button>
          </div>

          <div className="space-y-3">
            {activeConv.turns.map((line, idx) => {
              const isSpeakerB = idx % 2 === 1;
              const hideText = roleplayHideSpeakerB && isSpeakerB;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-blue-600">
                      {line.speaker}
                    </span>
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {hideText ? '•••••••••••••••• (Speak this line aloud!)' : line.ko}
                    </div>
                    {!hideText && (
                      <div className="text-xs text-slate-500">[{line.romanization}]</div>
                    )}
                    <div
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400"
                      dir={isRtl ? 'rtl' : 'ltr'}
                    >
                      {pickMultiLang(uiLang, line.translation)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => playKoreanAudio(line.ko)}
                    className="p-2.5 rounded-xl bg-blue-600 text-white cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
            <strong>Situation &amp; Cultural Tip:</strong> {pickMultiLang(uiLang, activeConv.situation)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 6 & 7: LISTENING LAB (554 DRILLS + DICTATION) & SPEAKING (CLICK-ONLY MIC)
// ============================================================================
export const ListeningAndSpeakingModuleView: React.FC<{
  mode: 'listening' | 'speaking';
  uiLang: LearningExplanationLang;
  onOpenAiTutor: (context: string) => void;
  initialListenCategory?: string;
  initialDictationMode?: boolean;
  initialAudioRate?: number;
  initialSpeakingFocus?: 'drills' | 'rules' | 'liaison';
  presetNonce?: number;
}> = ({
  mode,
  uiLang,
  onOpenAiTutor,
  initialListenCategory,
  initialDictationMode,
  initialAudioRate,
  initialSpeakingFocus,
  presetNonce,
}) => {
  const listeningDrills = useMemo(() => getKorean50xListeningLab(), []);
  const speakingDrills = useMemo(() => getSpeakingChallenges20x(), []);
  const pronGuides = useMemo(() => getPronunciationDrills20x(), []);

  const [audioRate, setAudioRate] = useState<number>(initialAudioRate || 1.0);
  const [listenCategory, setListenCategory] = useState<string>(initialListenCategory || 'all');
  const [listenPage, setListenPage] = useState<number>(1);
  const [dictationMode, setDictationMode] = useState<boolean>(Boolean(initialDictationMode));
  const [speakingFocus, setSpeakingFocus] = useState<'drills' | 'rules' | 'liaison'>(
    initialSpeakingFocus || 'drills'
  );
  const [dictationInputs, setDictationInputs] = useState<Record<string, string>>({});
  const [dictationFeedback, setDictationFeedback] = useState<Record<string, string>>({});
  const [revealTranscript, setRevealTranscript] = useState<Record<string, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  // Speaking Microphone Recording State (Strictly Click-Only)
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [spokenTextMap, setSpokenTextMap] = useState<Record<string, string>>({});
  const [micError, setMicError] = useState<string | null>(null);
  const [speakPage, setSpeakPage] = useState<number>(1);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (initialListenCategory !== undefined) setListenCategory(initialListenCategory);
    if (initialDictationMode !== undefined) setDictationMode(initialDictationMode);
    if (initialAudioRate !== undefined) setAudioRate(initialAudioRate);
    if (initialSpeakingFocus !== undefined) setSpeakingFocus(initialSpeakingFocus);
    setListenPage(1);
    setSpeakPage(1);
  }, [
    presetNonce,
    initialListenCategory,
    initialDictationMode,
    initialAudioRate,
    initialSpeakingFocus,
  ]);

  const filteredListening = useMemo(() => {
    return listeningDrills.filter(d =>
      listenCategory === 'all' ? true : d.category === listenCategory
    );
  }, [listeningDrills, listenCategory]);

  const listenPageSize = 12;
  const totalListenPages = Math.max(1, Math.ceil(filteredListening.length / listenPageSize));
  const safeListenPage = Math.min(listenPage, totalListenPages);
  const pagedListening = useMemo(
    () =>
      filteredListening.slice(
        (safeListenPage - 1) * listenPageSize,
        safeListenPage * listenPageSize
      ),
    [filteredListening, safeListenPage]
  );

  const handleStartRecording = (drillId: string) => {
    setMicError(null);
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicError(
        'Speech recognition is not supported in this browser. Listen and repeat aloud with the native audio.'
      );
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = 'ko-KR';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => setRecordingId(drillId);
      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        setSpokenTextMap(prev => ({ ...prev, [drillId]: transcript }));
        setRecordingId(null);
      };
      rec.onerror = () => {
        setRecordingId(null);
        setMicError('Microphone access was declined or interrupted. You can retry anytime.');
      };
      rec.onend = () => setRecordingId(null);
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setRecordingId(null);
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setRecordingId(null);
  };

  if (mode === 'listening') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Korean Listening Practice
              </h3>
              <p className="text-xs text-slate-500">
                Practice comprehension with slow and native-speed audio, announcements, TOPIK listening, and dictation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDictationMode(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  dictationMode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {dictationMode ? 'Dictation Mode Active' : 'Dictation Practice'}
              </button>
              <span className="text-xs font-bold text-slate-500">Speed:</span>
              {[0.75, 1.0, 1.25].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setAudioRate(rate)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    audioRate === rate
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All Audio' },
                { id: 'short_conversations', label: 'Short Dialogues' },
                { id: 'long_conversations', label: 'Long Conversations' },
                { id: 'announcements', label: 'Announcements' },
                { id: 'topik_listening', label: 'TOPIK Listening' },
                { id: 'dictation_practice', label: 'Dictation' },
                { id: 'daily_situations', label: 'Daily Situations' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setListenCategory(cat.id);
                    setListenPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    listenCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-500 tabular-nums">
              Page {safeListenPage} / {totalListenPages}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagedListening.map(d => {
            const shown = Boolean(revealTranscript[d.id]);
            const picked = selectedAnswers[d.id];
            return (
              <div
                key={d.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                    {d.level} • {d.topic}
                  </span>
                  <button
                    type="button"
                    onClick={() => playKoreanAudio(d.audioScriptKo, undefined, audioRate)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    Listen ({audioRate}x)
                  </button>
                </div>

                {dictationMode ? (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Dictation: Listen and type the Korean sentence you hear:
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={dictationInputs[d.id] || ''}
                        onChange={e =>
                          setDictationInputs(prev => ({ ...prev, [d.id]: e.target.value }))
                        }
                        placeholder="Type in Korean (Hangul)..."
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const typed = (dictationInputs[d.id] || '').trim();
                          if (typed && d.audioScriptKo.includes(typed.slice(0, 4))) {
                            setDictationFeedback(prev => ({
                              ...prev,
                              [d.id]: `Great dictation! Full script: ${d.audioScriptKo}`,
                            }));
                          } else {
                            setDictationFeedback(prev => ({
                              ...prev,
                              [d.id]: `Target script: ${d.dictationTargetKo}`,
                            }));
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black cursor-pointer"
                      >
                        Check
                      </button>
                    </div>
                    {dictationFeedback[d.id] && (
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {dictationFeedback[d.id]}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {pickMultiLang(uiLang, d.question)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {d.options.map((opt: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedAnswers(prev => ({ ...prev, [d.id]: idx }))}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left cursor-pointer ${
                            picked === idx
                              ? idx === d.correctIndex
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-rose-600 text-white border-rose-600'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      setRevealTranscript(prev => ({ ...prev, [d.id]: !prev[d.id] }))
                    }
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    {shown ? 'Hide Transcript & Explanation' : 'Reveal Transcript & Explanation'}
                  </button>
                  {shown && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1 text-xs">
                      <div className="font-black text-slate-900 dark:text-white">
                        {d.audioScriptKo}
                      </div>
                      <div className="text-slate-500">
                        {pickMultiLang(uiLang, d.explanation)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalListenPages > 1 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
            <button
              type="button"
              disabled={safeListenPage <= 1}
              onClick={() => setListenPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-xs font-black tabular-nums">
              Page {safeListenPage} of {totalListenPages}
            </span>
            <button
              type="button"
              disabled={safeListenPage >= totalListenPages}
              onClick={() => setListenPage(p => Math.min(totalListenPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    );
  }

  const speakPageSize = 12;
  const totalSpeakPages = Math.max(1, Math.ceil(speakingDrills.length / speakPageSize));
  const safeSpeakPage = Math.min(speakPage, totalSpeakPages);
  const pagedSpeaking = speakingDrills.slice(
    (safeSpeakPage - 1) * speakPageSize,
    safeSpeakPage * speakPageSize
  );

  const filteredPronGuides =
    speakingFocus === 'liaison'
      ? pronGuides.filter(
          pg =>
            pg.ruleCategory.toLowerCase().includes('liaison') ||
            pg.ruleCategory.toLowerCase().includes('연음') ||
            pg.ruleCategory.toLowerCase().includes('link') ||
            pg.ruleCategory.toLowerCase().includes('batchim') ||
            pg.writtenKo !== pg.spokenSurfaceKo
        )
      : pronGuides;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Pronunciation &amp; Speaking Studio
            </h3>
            <p className="text-xs text-slate-500">
              Master Korean sound changes, Batchim linking, and click-to-record speaking practice.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenAiTutor('Korean Pronunciation & Speaking Practice')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            Practice with AI Tutor
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'drills', label: 'Voice Speaking Practice' },
            { id: 'rules', label: 'Pronunciation Rules (발음 규칙)' },
            { id: 'liaison', label: 'Sound Linking & Batchim (연음)' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSpeakingFocus(tab.id as typeof speakingFocus)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                speakingFocus === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {speakingFocus !== 'drills' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              {speakingFocus === 'liaison'
                ? 'Korean Liaison & Sound Change Guide (연음 및 받침 변화)'
                : 'Essential Korean Pronunciation Rules (필수 발음 규칙)'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Tap the audio icon on any card to hear how written Hangul sounds in natural Seoul speech.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(filteredPronGuides.length > 0 ? filteredPronGuides : pronGuides).slice(0, 36).map(pg => (
              <div
                key={pg.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                    {pg.ruleCategory}
                  </span>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {pg.writtenKo}{' '}
                      <span className="text-blue-600 dark:text-blue-400">→ [{pg.spokenSurfaceKo}]</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => playKoreanAudio(pg.writtenKo)}
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shrink-0"
                      title="Listen Pronunciation"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {pg.ruleTipEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {micError && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-200 text-xs font-bold">
              {micError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pagedSpeaking.map(s => {
              const isRec = recordingId === s.id;
              const spoken = spokenTextMap[s.id];
              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      {s.level} • {s.situationEn}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Voice Shadowing
                    </span>
                  </div>

                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {s.targetKorean}
                  </div>
                  <div className="text-xs text-slate-500">
                    [{s.romanization}] • {getScriptPronunciation(s.targetKorean, uiLang)}
                  </div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {pickTriLingual(uiLang, {
                      en: s.meaningEn,
                      bn: s.meaningBn,
                      ne: s.meaningNe,
                      ur: s.meaningEn,
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => playKoreanAudio(s.targetKorean)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Listen Native Audio
                    </button>

                    {!isRec ? (
                      <button
                        type="button"
                        onClick={() => handleStartRecording(s.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        Start Recording
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                        Stop Recording
                      </button>
                    )}
                  </div>

                  {spoken && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                      <div className="font-bold text-slate-700 dark:text-slate-200">
                        Heard: &ldquo;{spoken}&rdquo;
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Compare your rhythm and intonation with the native audio above.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalSpeakPages > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
              <button
                type="button"
                disabled={safeSpeakPage <= 1}
                onClick={() => setSpeakPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                ← Previous
              </button>
              <span className="text-xs font-black tabular-nums">
                Page {safeSpeakPage} of {totalSpeakPages}
              </span>
              <button
                type="button"
                disabled={safeSpeakPage >= totalSpeakPages}
                onClick={() => setSpeakPage(p => Math.min(totalSpeakPages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 8, 9, 10, 11: READING, WRITING, DAILY KOREAN & EVERYDAY LIFE
// ============================================================================
export const ReadingWritingDailyAndLifeView: React.FC<{
  mode: 'reading' | 'writing' | 'daily_korean' | 'everyday_life';
  uiLang: LearningExplanationLang;
  streakDays: number;
  onOpenAiTutor: (context: string) => void;
  initialReadingGenre?: string;
  initialReadingLevel?: string;
  initialWritingCat?: string;
  initialDailySection?: 'all' | 'word' | 'grammar' | 'quiz';
  presetNonce?: number;
}> = ({
  mode,
  uiLang,
  streakDays,
  onOpenAiTutor,
  initialReadingGenre,
  initialReadingLevel,
  initialWritingCat,
  initialDailySection,
  presetNonce,
}) => {
  const allReading = useMemo(() => getKorean50xReadingPassages(), []);
  const allWriting = useMemo(() => getKorean50xWritingPrompts(), []);
  const allVocab = useMemo(() => getKorean50xVocabulary(), []);
  const allGrammar = useMemo(() => getKorean50xGrammarLessons(), []);

  const [readingGenre, setReadingGenre] = useState<string>(initialReadingGenre || 'all');
  const [readingLevel, setReadingLevel] = useState<string>(initialReadingLevel || 'all');
  const [readingPage, setReadingPage] = useState<number>(1);
  const [tappedToken, setTappedToken] = useState<{
    passageId: string;
    ko: string;
    rom: string;
    meaning: string;
  } | null>(null);
  const [readingAnswers, setReadingAnswers] = useState<Record<string, number>>({});

  // Writing state
  const [writingCatFilter, setWritingCatFilter] = useState<string>(initialWritingCat || 'all');
  const [activeWritingId, setActiveWritingId] = useState<string>(() => allWriting[0]?.id || '');
  const [studentDraft, setStudentDraft] = useState('');
  const [localDiag, setLocalDiag] = useState<ReturnType<typeof evaluateKoreanWritingLocally> | null>(
    null
  );
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [checkingWriting, setCheckingWriting] = useState(false);

  // Everyday life category filter
  const [selectedLifeId, setSelectedLifeId] = useState(EVERYDAY_LIFE_16_CATEGORIES[0].id);

  // Daily Korean section & mini quiz
  const [dailySection, setDailySection] = useState<'all' | 'word' | 'grammar' | 'quiz'>(
    initialDailySection || 'all'
  );
  const [dailyQuizAnswer, setDailyQuizAnswer] = useState<number | null>(null);

  useEffect(() => {
    if (initialReadingGenre !== undefined) setReadingGenre(initialReadingGenre);
    if (initialReadingLevel !== undefined) setReadingLevel(initialReadingLevel);
    if (initialWritingCat !== undefined) setWritingCatFilter(initialWritingCat);
    if (initialDailySection !== undefined) setDailySection(initialDailySection);
    setReadingPage(1);
  }, [
    presetNonce,
    initialReadingGenre,
    initialReadingLevel,
    initialWritingCat,
    initialDailySection,
  ]);

  const isRtl = isLearnKoreanRtl(uiLang);

  if (mode === 'reading') {
    const filteredPassages = allReading.filter(p => {
      if (readingGenre !== 'all' && p.genre !== readingGenre) return false;
      if (readingLevel !== 'all' && !p.level.includes(readingLevel)) return false;
      return true;
    });
    const pageSize = 8;
    const totalPages = Math.max(1, Math.ceil(filteredPassages.length / pageSize));
    const safePage = Math.min(readingPage, totalPages);
    const pagedPassages = filteredPassages.slice(
      (safePage - 1) * pageSize,
      safePage * pageSize
    );

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Korean Reading Practice
              </h3>
              <p className="text-xs text-slate-500">
                Tap any Korean word inside a passage to inspect its instant meaning, pronunciation, and native audio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAiTutor('Korean Reading Comprehension')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              Ask AI Tutor
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <select
              value={readingGenre}
              onChange={e => {
                setReadingGenre(e.target.value);
                setReadingPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Reading Genres</option>
              <option value="Short Passage">Short Passages</option>
              <option value="Daily-Life Story">Daily-Life Stories</option>
              <option value="Notice & Announcement">Notices &amp; Announcements</option>
              <option value="Email & Message">Emails &amp; Messages</option>
              <option value="University Text">University Texts</option>
              <option value="News-Style Passage">News-Style Passages</option>
              <option value="Intermediate Reading">Intermediate Reading</option>
              <option value="TOPIK Reading Comprehension">TOPIK Reading Comprehension</option>
            </select>

            <select
              value={readingLevel}
              onChange={e => {
                setReadingLevel(e.target.value);
                setReadingPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Reading Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced / TOPIK</option>
            </select>

            <div className="flex items-center justify-end text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              Page {safePage} / {totalPages}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {pagedPassages.map(p => {
            const fullSentence = p.tokens.map(t => t.surface).join(' ');
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                      {p.level} • {p.genre}
                    </span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                      {p.titleKo} — {pickMultiLang(uiLang, p.title)}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => playKoreanAudio(fullSentence)}
                    className="p-2.5 rounded-xl bg-blue-600 text-white cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {p.tokens.map((tok, tIdx) => (
                      <button
                        key={`${tok.surface}-${tIdx}`}
                        type="button"
                        onClick={() => {
                          playKoreanAudio(tok.surface);
                          setTappedToken({
                            passageId: p.id,
                            ko: tok.surface,
                            rom: tok.romanization || '',
                            meaning: tok.meaning
                              ? pickMultiLang(uiLang, tok.meaning)
                              : tok.surface,
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 cursor-pointer"
                      >
                        {tok.surface}
                      </button>
                    ))}
                  </div>
                  {tappedToken && tappedToken.passageId === p.id && (
                    <div className="mt-2 p-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-between">
                      <span>
                        {tappedToken.ko} [{tappedToken.rom}] = {tappedToken.meaning}
                      </span>
                      <Volume2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div
                  className="text-xs text-slate-600 dark:text-slate-300"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <strong>Translation:</strong> {pickMultiLang(uiLang, p.fullTranslation)}
                </div>
                <div
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <strong>Grammar Note:</strong> {pickMultiLang(uiLang, p.grammarNote)}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Comprehension: {pickMultiLang(uiLang, p.question.prompt)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {p.question.options.map((opt: string, idx: number) => (
                      <button
                        key={`${opt}-${idx}`}
                        type="button"
                        onClick={() => setReadingAnswers(prev => ({ ...prev, [p.id]: idx }))}
                        className={`p-2 rounded-xl text-xs font-bold border cursor-pointer text-left ${
                          readingAnswers[p.id] === idx
                            ? idx === p.question.correctIndex
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setReadingPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-xs font-black tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setReadingPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'writing') {
    const filteredWriting = allWriting.filter(w =>
      writingCatFilter === 'all' ? true : w.category8 === writingCatFilter
    );
    const activePrompt =
      filteredWriting.find(w => w.id === activeWritingId) ||
      filteredWriting[0] ||
      allWriting[0];

    const handleCheckWriting = async () => {
      if (!studentDraft.trim() || checkingWriting) return;
      const diag = evaluateKoreanWritingLocally(studentDraft, activePrompt, uiLang);
      setLocalDiag(diag);
      setCheckingWriting(true);
      setAiFeedback(null);
      try {
        const res = await fetch('/api/korean-tutor/writing-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textKo: studentDraft,
            promptTitle: activePrompt.title.en,
            level: activePrompt.categoryLabel,
            uiLang,
          }),
        });
        const data = await res.json();
        setAiFeedback(
          data?.feedback || 'Checked! Compare your sentence with the model answer below.'
        );
      } catch {
        setAiFeedback('Local Korean writing check completed below.');
      } finally {
        setCheckingWriting(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Korean Writing Practice
            </h3>
            <p className="text-xs text-slate-500">
              Practice Hangul typing, sentence composition, emails, self-introductions, and TOPIK II essays with instant evaluation.
            </p>
          </div>
          <select
            value={writingCatFilter}
            onChange={e => setWritingCatFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Writing Categories</option>
            {WRITING_CATEGORIES_8.map(cat => (
              <option key={cat.id} value={cat.id}>
                {pickMultiLang(uiLang, cat.title)} ({cat.titleKo})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5 max-h-[620px] overflow-y-auto">
            <div className="text-xs font-black uppercase text-slate-400 px-2 pb-1">
              Writing Prompts
            </div>
            {filteredWriting.slice(0, 100).map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setActiveWritingId(w.id);
                  setStudentDraft('');
                  setLocalDiag(null);
                  setAiFeedback(null);
                }}
                className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activePrompt.id === w.id
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="truncate">{pickMultiLang(uiLang, w.title)}</div>
                <div className="text-[10px] opacity-75 mt-0.5">
                  {w.categoryLabel} • {w.difficulty}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div>
              <span className="px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                {activePrompt.categoryLabel} • {activePrompt.difficulty}
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {pickMultiLang(uiLang, activePrompt.title)}
              </h3>
              <p
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {pickMultiLang(uiLang, activePrompt.prompt)}
              </p>
            </div>

            <textarea
              rows={4}
              value={studentDraft}
              onChange={e => setStudentDraft(e.target.value)}
              placeholder={`Starter Hint: ${activePrompt.starterHintKo}`}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCheckWriting}
                disabled={checkingWriting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Bot className="w-4 h-4" />
                {checkingWriting ? 'Checking Korean Writing...' : 'Check Writing & Get Feedback'}
              </button>
              <button
                type="button"
                onClick={() => setStudentDraft(activePrompt.modelAnswerKo)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Insert Model Answer
              </button>
              <button
                type="button"
                onClick={() => playKoreanAudio(activePrompt.modelAnswerKo)}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Listen Model Answer
              </button>
            </div>

            {localDiag && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-800 dark:text-emerald-300">
                    Korean Writing Diagnostic Score: {localDiag.score}%
                  </span>
                </div>
                <ul className="space-y-1 text-slate-700 dark:text-slate-200">
                  {localDiag.strengths.map((item, i) => (
                    <li key={`s-${i}`}>• {item}</li>
                  ))}
                  {localDiag.corrections.map((item, i) => (
                    <li key={`c-${i}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiFeedback && (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                {aiFeedback}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1 text-xs">
              <div className="font-black text-slate-900 dark:text-white">
                Model Answer (모범 답안):
              </div>
              <div className="text-blue-600 dark:text-blue-400 font-bold">
                {activePrompt.modelAnswerKo}
              </div>
              <div className="text-slate-500" dir={isRtl ? 'rtl' : 'ltr'}>
                {pickMultiLang(uiLang, activePrompt.modelTranslation)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'daily_korean') {
    const dayIdx = new Date().getDate() % Math.max(1, allVocab.length);
    const wordOfDay = allVocab[dayIdx];
    const grammarOfDay = allGrammar[dayIdx % Math.max(1, allGrammar.length)];
    const dailyPq = grammarOfDay.practiceQuestions[0];

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Daily Korean' },
              { id: 'word', label: 'Word of the Day' },
              { id: 'grammar', label: 'Daily Grammar & Expression' },
              { id: 'quiz', label: 'Daily Mini Quiz' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDailySection(tab.id as typeof dailySection)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  dailySection === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-500 text-xs font-bold inline-flex items-center gap-1.5">
            <Flame className="w-4 h-4 fill-current" />
            {streakDays} Day Study Streak
          </span>
        </div>

        <div
          className={`grid grid-cols-1 ${
            dailySection === 'all' ? 'lg:grid-cols-3' : 'max-w-2xl mx-auto'
          } gap-6`}
        >
          {(dailySection === 'all' || dailySection === 'word') && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase text-blue-500">Word of the Day</div>
                <button
                  type="button"
                  onClick={() => playKoreanAudio(wordOfDay.korean)}
                  className="p-2.5 rounded-xl bg-blue-600 text-white cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {wordOfDay.korean}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">[{wordOfDay.romanization}]</div>
                <div
                  className="text-lg font-black text-emerald-500 mt-1.5"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  {pickMultiLang(uiLang, {
                    en: wordOfDay.meaningEn,
                    bn: wordOfDay.meaningBn,
                    ne: wordOfDay.meaningNe,
                  })}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">
                  Sentence of the Day: {wordOfDay.exampleKo}
                </div>
                <div className="text-slate-500 dark:text-slate-400" dir={isRtl ? 'rtl' : 'ltr'}>
                  {pickMultiLang(uiLang, {
                    en: wordOfDay.exampleEn,
                    bn: wordOfDay.exampleBn,
                    ne: wordOfDay.exampleNe,
                  })}
                </div>
              </div>
            </div>
          )}

          {(dailySection === 'all' || dailySection === 'grammar') && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="text-xs font-bold uppercase text-blue-500">
                Daily Grammar Tip &amp; Expression
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">
                {grammarOfDay.patternKo} — {pickMultiLang(uiLang, grammarOfDay.title)}
              </h4>
              <p
                className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {pickMultiLang(uiLang, grammarOfDay.whenToUse)}
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">
                  Useful Expression: {grammarOfDay.examples[0]?.ko}
                </div>
                <div className="text-slate-500 dark:text-slate-400" dir={isRtl ? 'rtl' : 'ltr'}>
                  {grammarOfDay.examples[0]
                    ? pickMultiLang(uiLang, grammarOfDay.examples[0].translation)
                    : ''}
                </div>
              </div>
            </div>
          )}

          {(dailySection === 'all' || dailySection === 'quiz') && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="text-xs font-bold uppercase text-emerald-500">Daily Mini Quiz</div>
              {dailyPq && (
                <>
                  <div
                    className="text-sm font-black text-slate-900 dark:text-white"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {pickMultiLang(uiLang, dailyPq.prompt)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dailyPq.options.map((opt: string, idx: number) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setDailyQuizAnswer(idx)}
                        className={`p-3 rounded-xl text-xs font-bold border cursor-pointer ${
                          dailyQuizAnswer === idx
                            ? idx === dailyPq.correctIndex
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // mode === 'everyday_life' (16 practical categories)
  const activeLife =
    EVERYDAY_LIFE_16_CATEGORIES.find(c => c.id === selectedLifeId) ||
    EVERYDAY_LIFE_16_CATEGORIES[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5 max-h-[640px] overflow-y-auto">
        <div className="text-xs font-black uppercase text-slate-400 px-2 pb-1">
          16 Everyday Life Categories in Korea
        </div>
        {EVERYDAY_LIFE_16_CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedLifeId(c.id)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedLifeId === c.id
                ? 'bg-blue-600 text-white'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {pickMultiLang(uiLang, c.title)} ({c.titleKo})
          </button>
        ))}
      </div>

      <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
              Practical Korea Survival • Category #{activeLife.order}
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {pickMultiLang(uiLang, activeLife.title)} ({activeLife.titleKo})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenAiTutor(activeLife.title.en)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            Roleplay with AI Tutor
          </button>
        </div>

        <div className="space-y-3">
          {activeLife.dialogue.map((line, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase text-blue-600">
                  {line.speaker}
                </span>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {line.ko}
                </div>
                <div className="text-xs text-slate-500">[{line.romanization}]</div>
                <div
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  {pickMultiLang(uiLang, line.translation)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => playKoreanAudio(line.ko)}
                className="p-2.5 rounded-xl bg-blue-600 text-white cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-black uppercase text-slate-400">
            Essential Situation Vocabulary
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeLife.keyVocab.map(v => (
              <button
                key={v.ko}
                type="button"
                onClick={() => playKoreanAudio(v.ko)}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-left hover:border-blue-400 cursor-pointer"
              >
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {v.ko}{' '}
                    <span className="text-xs font-normal text-slate-400">[{v.romanization}]</span>
                  </div>
                  <div
                    className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {pickMultiLang(uiLang, v.meaning)}
                  </div>
                </div>
                <Volume2 className="w-4 h-4 text-blue-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
