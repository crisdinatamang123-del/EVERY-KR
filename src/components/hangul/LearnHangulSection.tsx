/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BASIC_CONSONANTS,
  DOUBLE_CONSONANTS,
  BASIC_VOWELS,
  COMPOUND_VOWELS,
  BATCHIM_RULES,
  INITIAL_CONSONANTS,
  MEDIAL_VOWELS,
  FINAL_BATCHIM,
} from '../../data/hangulData';
import {
  bdKoreanDictionary,
  VOCAB_CATEGORIES,
} from '../../data/bdKoreanDictionary';
import { BdKoreanWord, HangulLetter } from '../../types';
import {
  BookOpen,
  Search,
  Volume2,
  VolumeX,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  Award,
  Layers,
  GraduationCap,
  Play,
  Filter,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

export const LearnHangulSection: React.FC = () => {
  const { addToast } = useApp();

  // Active Main Sub-Tab: 'dict' | 'alphabet' | 'builder' | 'flashcards' | 'quiz'
  const [activeTab, setActiveTab] = useState<'dict' | 'alphabet' | 'builder' | 'flashcards' | 'quiz'>('dict');

  // Dictionary Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'TOPIK I' | 'TOPIK II'>('all');
  const [selectedPos, setSelectedPos] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const wordsPerPage = 36;

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('everykr_bd_kr_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      try {
        localStorage.setItem('everykr_bd_kr_bookmarks', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Only Bookmarks filter
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);

  // Audio Pronunciation TTS
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  const speakKorean = (text: string) => {
    if (!('speechSynthesis' in window)) {
      addToast('Speech Synthesis is not supported in your browser.', 'error');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.82; // Clear educational pace
    utterance.onstart = () => setSpeakingWord(text);
    utterance.onend = () => setSpeakingWord(null);
    utterance.onerror = () => setSpeakingWord(null);
    window.speechSynthesis.speak(utterance);
  };

  // Syllable Builder State
  const [builderInitial, setBuilderInitial] = useState(0); // 0 = ㄱ
  const [builderMedial, setBuilderMedial] = useState(0);  // 0 = ㅏ
  const [builderFinal, setBuilderFinal] = useState(0);    // 0 = None

  // Calculate Unicode Syllable
  const builtSyllable = useMemo(() => {
    const code = 0xac00 + (builderInitial * 21 + builderMedial) * 28 + builderFinal;
    return String.fromCharCode(code);
  }, [builderInitial, builderMedial, builderFinal]);

  const builtBengaliReading = useMemo(() => {
    const init = INITIAL_CONSONANTS[builderInitial]?.bengali || '';
    const med = MEDIAL_VOWELS[builderMedial]?.bengali || '';
    const fin = FINAL_BATCHIM[builderFinal]?.bengali || '';
    return `${init}${med}${fin}`;
  }, [builderInitial, builderMedial, builderFinal]);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizScore, setQuizScore] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Filter dictionary
  const filteredWords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bdKoreanDictionary.filter((item) => {
      if (showOnlyBookmarks && !bookmarkedIds.includes(item.id)) {
        return false;
      }
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      const itemLevel = item.topikLevel || item.level;
      if (selectedLevel !== 'all' && itemLevel !== selectedLevel) {
        return false;
      }
      const itemPos = item.partOfSpeech || item.pos;
      if (selectedPos !== 'all' && itemPos !== selectedPos) {
        return false;
      }

      if (!query) return true;

      const pron = item.bengaliPronunciation || item.pronunciation || '';
      return (
        item.hangul.toLowerCase().includes(query) ||
        item.bengali.toLowerCase().includes(query) ||
        pron.toLowerCase().includes(query) ||
        item.english.toLowerCase().includes(query) ||
        item.romanization.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, selectedCategory, selectedLevel, selectedPos, showOnlyBookmarks, bookmarkedIds]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedLevel, selectedPos, showOnlyBookmarks]);

  const totalPages = Math.ceil(filteredWords.length / wordsPerPage) || 1;
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * wordsPerPage;
    return filteredWords.slice(start, start + wordsPerPage);
  }, [filteredWords, currentPage]);

  // Flashcard items
  const flashcardDeck = useMemo(() => {
    return filteredWords.slice(0, 100);
  }, [filteredWords]);

  const currentFlashcard = flashcardDeck[cardIndex] || flashcardDeck[0];

  // Quiz questions
  const quizItems = useMemo(() => {
    const pool = filteredWords.length > 20 ? filteredWords : bdKoreanDictionary;
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 20);
    return shuffled.map((correct) => {
      const distractors = pool
        .filter((w) => w.id !== correct.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((w) => w.bengali);
      const options = [correct.bengali, ...distractors].sort(() => 0.5 - Math.random());
      return { correct, options };
    });
  }, [filteredWords]);

  const currentQuiz = quizItems[quizIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Royal Banner Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-10 shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 backdrop-blur-md text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>বাংলা ও কোরিয়ান সম্পূর্ণ বর্ণমালা ও শব্দকোষ • ৫,২০০+ শব্দ</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Learn Hangul & BD-Korean Vocabulary
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              বাংলাদেশী শিক্ষার্থীদের জন্য দক্ষিণ কোরিয়ার বিশ্ববিদ্যালয় ভর্তি, আবাসন, ভিসা, পার্টটাইম কাজ ও দৈনন্দিন জীবনের <strong className="text-amber-300 font-bold">৫,২০০+</strong> প্রয়োজনীয় শব্দভাণ্ডার, সঠিক বাংলা উচ্চারণ, হাঙ্গুল বর্ণমালা গাইড এবং অডিও উচ্চারণ।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center">
              <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                {bdKoreanDictionary.length.toLocaleString()}
              </div>
              <div className="text-xs text-slate-300 font-medium mt-0.5">
                মোট বাংলা-কোরিয়ান শব্দ লোড করা হয়েছে
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 pt-6 border-t border-white/15 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('dict')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dict'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>বাংলা-কোরিয়ান ৫,০০০+ শব্দকোষ</span>
          </button>

          <button
            onClick={() => setActiveTab('alphabet')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'alphabet'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>হাঙ্গুল বর্ণমালা ও বাচ্ছিম</span>
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'builder'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>সিলেবল ব্লক বিল্ডার</span>
          </button>

          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'flashcards'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>ফ্ল্যাশ কার্ড প্র্যাকটিস</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>কুইজ টেস্ট</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 5,000+ WORD BENGALI TO KOREAN DICTIONARY                           */}
      {/* ========================================================================= */}
      {activeTab === 'dict' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search input with Bengali and Korean support */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="বাংলা, উচ্চারণ বা কোরিয়ানে খুঁজুন (e.g. বিশ্ববিদ্যালয়, ভিসা, 대학교, bisha)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* TOPIK Level Filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value as any)}
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="all">All TOPIK Levels (সকল লেভেল)</option>
                  <option value="TOPIK I">TOPIK I (প্রাথমিক ১ ও ২ লেভেল)</option>
                  <option value="TOPIK II">TOPIK II (মধ্যম ও উচ্চ লেভেল)</option>
                </select>
              </div>

              {/* Bookmark Filter Toggle */}
              <div className="md:col-span-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowOnlyBookmarks(!showOnlyBookmarks)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    showOnlyBookmarks
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {showOnlyBookmarks ? (
                    <BookmarkCheck className="w-4 h-4 text-white" />
                  ) : (
                    <Bookmark className="w-4 h-4 text-slate-400" />
                  )}
                  <span>বুকমার্ক করা শব্দ ({bookmarkedIds.length})</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              {VOCAB_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{cat.nameBn}</span>
                </button>
              ))}
            </div>

            {/* Results Count & Help text */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div>
                <span>অনুসন্ধানের ফলাফল: </span>
                <strong className="text-slate-900 dark:text-white font-mono">{filteredWords.length}</strong> টি শব্দ পাওয়া গেছে
              </div>
              <div className="hidden sm:block">
                পৃষ্ঠা <strong className="text-slate-900 dark:text-white">{currentPage}</strong> / {totalPages}
              </div>
            </div>
          </div>

          {/* Vocabulary Grid */}
          {paginatedWords.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">কোনো শব্দ পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                অন্য কোনো বানান বা বাংলায় লিখে পুনরায় অনুসন্ধান করুন।
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setShowOnlyBookmarks(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                সব শব্দ দেখুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedWords.map((word) => {
                const isBookmarked = bookmarkedIds.includes(word.id);
                const isSpeaking = speakingWord === word.hangul;
                const pron = word.bengaliPronunciation || word.pronunciation || '';
                const level = word.topikLevel || word.level || 'TOPIK I';

                return (
                  <div
                    key={word.id}
                    className="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/80 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Meta Row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                          {level}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => speakKorean(word.hangul)}
                            title="কোরিয়ান সঠিক উচ্চারণ শুনুন"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSpeaking
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 animate-pulse'
                                : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => toggleBookmark(word.id)}
                            title={isBookmarked ? 'বুকমার্ক থেকে বাদ দিন' : 'বুকমার্কে সেভ করুন'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                                : 'text-slate-300 hover:text-slate-500 dark:hover:text-slate-400'
                            }`}
                          >
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Main Hangul & Bengali Word */}
                      <div className="space-y-1 mt-1">
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {word.hangul}
                        </div>

                        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          [{pron}]
                        </div>

                        <div className="text-base font-bold text-slate-800 dark:text-slate-100 pt-1">
                          {word.bengali}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {word.english}
                        </div>
                      </div>

                      {/* Example Sentence */}
                      {word.exampleHangul && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-0.5">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {word.exampleHangul}
                          </div>
                          {word.exampleBengali && (
                            <div className="text-slate-500 dark:text-slate-400">
                              {word.exampleBengali}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>পূর্ববর্তী পৃষ্ঠা</span>
              </button>

              <div className="text-slate-600 dark:text-slate-400 font-medium">
                পৃষ্ঠা <strong className="text-slate-900 dark:text-white">{currentPage}</strong> / {totalPages}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>পরবর্তী পৃষ্ঠা</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HANGUL ALPHABET MASTER & BATCHIM                                  */}
      {/* ========================================================================= */}
      {activeTab === 'alphabet' && (
        <div className="space-y-8">
          {/* Intro Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              হাঙ্গুল বর্ণমালার বৈজ্ঞানিক কাঠামো (Korean Alphabet Guide for Bangladeshis)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              হাঙ্গুল হলো পৃথিবীর সবচেয়ে বৈজ্ঞানিক ও সহজ বর্ণমালাগুলোর একটি। ১৪টি মূল ব্যঞ্জনবর্ণ, ৫টি যুক্ত ব্যঞ্জনবর্ণ, ১০টি মূল স্বরবর্ণ এবং ১১টি মিশ্র স্বরবর্ণ দিয়ে সব শব্দ গঠিত হয়। যেকোনো বর্ণের কার্ডে ক্লিক করে তার সঠিক উচ্চারণ শুনুন।
            </p>
          </div>

          {/* 1. Basic Consonants (14) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                মৌলিক ১৪টি ব্যঞ্জনবর্ণ (Basic Consonants)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {BASIC_CONSONANTS.map((letter) => (
                <div
                  key={letter.char}
                  onClick={() => speakKorean(letter.sampleWord)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group text-center space-y-1.5"
                >
                  <div className="text-3xl font-black text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    {letter.char}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {letter.bengaliSound}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {letter.nameKr} ({letter.bengaliName})
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{letter.sampleWord}</span>: {letter.sampleWordMeaning}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Double Consonants (5) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                দ্বৈত ব্যঞ্জনবর্ণ ৫টি (Double Consonants - 쌍자음)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {DOUBLE_CONSONANTS.map((letter) => (
                <div
                  key={letter.char}
                  onClick={() => speakKorean(letter.sampleWord)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group text-center space-y-1.5"
                >
                  <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    {letter.char}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {letter.bengaliSound}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {letter.nameKr} ({letter.bengaliName})
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{letter.sampleWord}</span>: {letter.sampleWordMeaning}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Basic Vowels (10) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                মৌলিক ১০টি স্বরবর্ণ (Basic Vowels - 기본 모음)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {BASIC_VOWELS.map((letter) => (
                <div
                  key={letter.char}
                  onClick={() => speakKorean(letter.sampleWord)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group text-center space-y-1.5"
                >
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    {letter.char}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {letter.bengaliSound}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{letter.sampleWord}</span>: {letter.sampleWordMeaning}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Compound Vowels (11) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                মিশ্র স্বরবর্ণ ১১টি (Compound Vowels - 복합 모음)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {COMPOUND_VOWELS.map((letter) => (
                <div
                  key={letter.char}
                  onClick={() => speakKorean(letter.sampleWord)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group text-center space-y-1.5"
                >
                  <div className="text-3xl font-black text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    {letter.char}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {letter.bengaliSound}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{letter.sampleWord}</span>: {letter.sampleWordMeaning}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Batchim Final Consonants Rules */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                বাচ্ছিম (Batchim - নিচে বসা ব্যঞ্জনবর্ণের ৭টি প্রধান উচ্চারণ সূত্র)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BATCHIM_RULES.map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-rose-600 dark:text-rose-400">
                      {rule.sound}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      অক্ষরসমূহ: {rule.letters}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rule.description}
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-800 dark:text-slate-200">
                    উদাহরণ: {rule.exampleKr}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INTERACTIVE SYLLABLE BLOCK BUILDER                                  */}
      {/* ========================================================================= */}
      {activeTab === 'builder' && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                ইন্টারেক্টিভ সিলেবল ব্লক বিল্ডার (Hangul Syllable Block Assembler)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                কোরিয়ান শব্দ সবসময় <strong className="text-blue-600 dark:text-blue-400">শুরুর ব্যঞ্জনবর্ণ (Initial) + স্বরবর্ণ (Medial) + শেষের বাচ্ছিম (Final Batchim)</strong> মিলে একটি চারকোনা ব্লকে তৈরি হয়। নিচে উপাদান বেছে নিজের ব্লক তৈরি করুন এবং অডিও উচ্চারণ শুনুন।
              </p>
            </div>

            {/* Live Result Display */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60 text-center space-y-4">
              <div className="text-7xl sm:text-8xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight animate-in zoom-in-95 duration-150">
                {builtSyllable}
              </div>

              <div className="flex items-center justify-center gap-3">
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  বাংলা উচ্চারণ: <span className="text-blue-600 dark:text-blue-400 text-lg">[{builtBengaliReading}]</span>
                </span>
                <button
                  onClick={() => speakKorean(builtSyllable)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>উচ্চারণ শুনুন</span>
                </button>
              </div>
            </div>

            {/* Selector Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Initial Consonants */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  ১. শুরুর ব্যঞ্জনবর্ণ (Initial - 초성)
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                  {INITIAL_CONSONANTS.map((init, idx) => (
                    <button
                      key={init.char}
                      onClick={() => setBuilderInitial(idx)}
                      className={`p-2.5 rounded-xl text-center font-bold text-sm transition-all cursor-pointer ${
                        builderInitial === idx
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="text-base">{init.char}</div>
                      <div className="text-[10px] opacity-75">{init.bengali}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Medial Vowels */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  ২. মাঝের স্বরবর্ণ (Medial Vowel - 중성)
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                  {MEDIAL_VOWELS.map((med, idx) => (
                    <button
                      key={med.char}
                      onClick={() => setBuilderMedial(idx)}
                      className={`p-2.5 rounded-xl text-center font-bold text-sm transition-all cursor-pointer ${
                        builderMedial === idx
                          ? 'bg-emerald-600 text-white shadow-md scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="text-base">{med.char}</div>
                      <div className="text-[10px] opacity-75">{med.bengali}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Final Batchim */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  ৩. নিচের বাচ্ছিম (Final Batchim - 종성)
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                  {FINAL_BATCHIM.map((fin, idx) => (
                    <button
                      key={fin.char}
                      onClick={() => setBuilderFinal(idx)}
                      className={`p-2.5 rounded-xl text-center font-bold text-sm transition-all cursor-pointer ${
                        builderFinal === idx
                          ? 'bg-amber-600 text-white shadow-md scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="text-xs sm:text-sm truncate">{fin.char}</div>
                      <div className="text-[10px] opacity-75">{fin.bengali || '-'}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FLASHCARDS PRACTICE                                               */}
      {/* ========================================================================= */}
      {activeTab === 'flashcards' && currentFlashcard && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              ইন্টারেক্টিভ ফ্ল্যাশ কার্ড (Interactive Flashcards)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              কার্ডে ক্লিক করে বাংলা অর্থ ও উচ্চারণ দেখুন। কার্ড সংখ্যা: {cardIndex + 1} / {flashcardDeck.length}
            </p>
          </div>

          {/* Flashcard 3D Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full h-80 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-400/40 dark:border-blue-600/40 shadow-xl p-8 flex flex-col justify-between items-center text-center cursor-pointer transition-all hover:shadow-2xl select-none"
          >
            <div className="w-full flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase">{currentFlashcard.category}</span>
              <span>ক্লিক করে উল্টান</span>
            </div>

            <div className="space-y-3">
              {!isFlipped ? (
                <>
                  <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currentFlashcard.hangul}
                  </div>
                  <div className="text-xs text-slate-400 italic">
                    কোরিয়ান শব্দ (ট্যাপ করে অর্থ দেখুন)
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    [{currentFlashcard.bengaliPronunciation || currentFlashcard.pronunciation}]
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {currentFlashcard.bengali}
                  </div>
                  <div className="text-sm text-slate-500 italic">
                    {currentFlashcard.english}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakKorean(currentFlashcard.hangul);
                }}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100"
              >
                <Volume2 className="w-4 h-4" />
                <span>উচ্চারণ শুনুন</span>
              </button>
            </div>
          </div>

          {/* Flashcard Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => {
                setIsFlipped(false);
                setCardIndex((i) => Math.max(0, i - 1));
              }}
              disabled={cardIndex === 0}
              className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>পূর্ববর্তী কার্ড</span>
            </button>

            <button
              onClick={() => {
                setIsFlipped(false);
                setCardIndex((i) => (i + 1) % flashcardDeck.length);
              }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>পরবর্তী কার্ড</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: VOCABULARY QUIZ                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'quiz' && currentQuiz && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  প্রশ্ন {quizIndex + 1} / {quizItems.length}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  শব্দার্থ কুইজ টেস্ট
                </h3>
              </div>
              <div className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold">
                স্কোর: {quizScore}
              </div>
            </div>

            {/* Target Korean Word */}
            <div className="p-6 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-center space-y-2">
              <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {currentQuiz.correct.hangul}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                [{currentQuiz.correct.bengaliPronunciation || currentQuiz.correct.pronunciation}]
              </div>
              <button
                onClick={() => speakKorean(currentQuiz.correct.hangul)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 mt-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>উচ্চারণ শুনুন</span>
              </button>
            </div>

            {/* 4 Choices */}
            <div className="space-y-2.5">
              {currentQuiz.options.map((option, idx) => {
                let btnStyle = 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700';

                if (isAnswerRevealed) {
                  if (option === currentQuiz.correct.bengali) {
                    btnStyle = 'bg-emerald-500 text-white border-emerald-600 font-bold';
                  } else if (selectedAnswer === option) {
                    btnStyle = 'bg-rose-500 text-white border-rose-600';
                  } else {
                    btnStyle = 'opacity-40 bg-slate-50 dark:bg-slate-800 border-slate-200';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerRevealed}
                    onClick={() => {
                      setSelectedAnswer(option);
                      setIsAnswerRevealed(true);
                      if (option === currentQuiz.correct.bengali) {
                        setQuizScore((s) => s + 10);
                        addToast('সঠিক উত্তর! +১০ পয়েন্ট', 'success');
                      } else {
                        addToast('ভুল উত্তর! সঠিকটি লক্ষ্য করুন।', 'error');
                      }
                    }}
                    className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {isAnswerRevealed && option === currentQuiz.correct.bengali && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            {isAnswerRevealed && (
              <button
                onClick={() => {
                  setSelectedAnswer(null);
                  setIsAnswerRevealed(false);
                  if (quizIndex + 1 < quizItems.length) {
                    setQuizIndex((i) => i + 1);
                  } else {
                    addToast(`কুইজ সম্পন্ন! মোট স্কোর: ${quizScore}`, 'success');
                    setQuizIndex(0);
                    setQuizScore(0);
                  }
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>পরবর্তী প্রশ্ন</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
