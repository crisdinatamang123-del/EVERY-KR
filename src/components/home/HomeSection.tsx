/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  GraduationCap,
  Building2,
  Train,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  Clock,
  Sparkles,
  Calculator,
  Compass,
  Briefcase,
  HeartPulse,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Calendar,
  Luggage,
  MapPin,
  AlertCircle,
  Award,
  Zap,
  BookOpen,
  X,
} from 'lucide-react';

export const HomeSection: React.FC = () => {
  const {
    setActiveSection,
    universities,
    housing,
    studentJobs,
    survivalGuides,
    searchQuery,
    setSearchQuery,
    formatKrw,
  } = useApp();

  // Hero search category filter
  const [heroCategory, setHeroCategory] = useState<
    'all' | 'universities' | 'deadlines' | 'housing' | 'jobs' | 'arrival' | 'shop'
  >('all');

  // Quick Currency Converter State
  const [krwInput, setKrwInput] = useState<number>(500000);
  const [selectedCurrency, setSelectedCurrency] = useState<
    'USD' | 'EUR' | 'CNY' | 'JPY' | 'VND' | 'INR' | 'BDT' | 'NPR' | 'MNT'
  >('USD');

  // Part-time hours estimator
  const [degreeTier, setDegreeTier] = useState<'undergrad' | 'grad' | 'language'>('undergrad');
  const [topikLevel, setTopikLevel] = useState<number>(4);
  const [isVacation, setIsVacation] = useState<boolean>(false);

  const exchangeRates: Record<string, { rate: number; symbol: string }> = {
    USD: { rate: 0.00072, symbol: '$' },
    EUR: { rate: 0.00067, symbol: '€' },
    CNY: { rate: 0.0052, symbol: '¥' },
    JPY: { rate: 0.11, symbol: '¥' },
    VND: { rate: 18.2, symbol: '₫' },
    INR: { rate: 0.061, symbol: '₹' },
    BDT: { rate: 0.088, symbol: '৳' },
    NPR: { rate: 0.098, symbol: '₨' },
    MNT: { rate: 2.51, symbol: '₮' },
  };

  const calculateLegalHours = (): string => {
    if (degreeTier === 'language') {
      return 'D-4 trainees: Eligible after 6 months of study (max 20 hrs/week with immigration approval).';
    }
    if (isVacation) {
      return 'Unlimited working hours during official university vacations (방학) with S-3 report.';
    }
    if (degreeTier === 'undergrad') {
      return topikLevel >= 3
        ? 'Up to 25 hours / week (TOPIK 3+ verified standard)'
        : 'Up to 10 hours / week (Score below TOPIK 3 restriction)';
    } else {
      return topikLevel >= 4
        ? 'Up to 30 hours / week (Master/PhD TOPIK 4+ standard)'
        : 'Up to 15 hours / week (Score below TOPIK 4 restriction)';
    }
  };

  // Instant live search matches
  const liveSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedUnis = universities
      .filter((u) => u.nameEn.toLowerCase().includes(q) || u.nameKr.includes(q) || u.acronym.toLowerCase().includes(q))
      .slice(0, 3);

    const matchedHousing = housing
      .filter((h) => h.title.toLowerCase().includes(q) || h.neighborhood.toLowerCase().includes(q) || h.nearestStation.toLowerCase().includes(q))
      .slice(0, 2);

    const matchedJobs = studentJobs
      .filter((j: any) => j.title.toLowerCase().includes(q) || (j.companyName || j.company || '').toLowerCase().includes(q))
      .slice(0, 2);

    const matchedGuides = survivalGuides
      .filter((g) => g.title.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q))
      .slice(0, 2);

    const totalCount = matchedUnis.length + matchedHousing.length + matchedJobs.length + matchedGuides.length;
    return { unis: matchedUnis, housing: matchedHousing, jobs: matchedJobs, guides: matchedGuides, totalCount };
  }, [searchQuery, universities, housing, studentJobs, survivalGuides]);

  const handleHeroSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    if (heroCategory === 'universities') setActiveSection('universities');
    else if (heroCategory === 'deadlines') setActiveSection('deadlines');
    else if (heroCategory === 'housing') setActiveSection('housing');
    else if (heroCategory === 'jobs') setActiveSection('jobs');
    else if (heroCategory === 'arrival') setActiveSection('arrival-prep');
    else if (heroCategory === 'shop') setActiveSection('shop');
    else {
      const q = searchQuery.toLowerCase();
      if (q.includes('deadline') || q.includes('dhl') || q.includes('coa') || q.includes('intake')) {
        setActiveSection('deadlines');
      } else if (q.includes('match') || q.includes('cgpa') || q.includes('chance') || q.includes('score')) {
        setActiveSection('finder');
      } else if (q.includes('pack') || q.includes('luggage') || q.includes('wardrobe') || q.includes('220v') || q.includes('voltage')) {
        setActiveSection('arrival-prep');
      } else if (q.includes('coat') || q.includes('padding') || q.includes('buy') || q.includes('store') || q.includes('ramen')) {
        setActiveSection('shop');
      } else if (q.includes('job') || q.includes('work') || q.includes('cafe') || q.includes('wage') || q.includes('s-3')) {
        setActiveSection('jobs');
      } else if (q.includes('room') || q.includes('goshiwon') || q.includes('rent') || q.includes('house') || q.includes('studio')) {
        setActiveSection('housing');
      } else if (q.includes('visa') || q.includes('arc') || q.includes('immigration')) {
        setActiveSection('visa');
      } else if (q.includes('hangul') || q.includes('korean word') || q.includes('bangla') || q.includes('bengali') || q.includes('topik word') || q.includes('vocabulary') || q.includes('alphabet')) {
        setActiveSection('learn-hangul');
      } else {
        setActiveSection('universities');
      }
    }
  };

  return (
    <div className="space-y-16 pb-24">
      {/* 1. Prestige Status Ribbon (Deep Midnight Sapphire & Warm Gold) */}
      <section className="bg-[#070b16] dark:bg-[#050811] text-white border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-100">Fall 2027 & Spring 2028 Admissions Active</span>
            <span className="text-slate-600 hidden md:inline">·</span>
            <span className="text-amber-400/90 font-medium hidden md:inline">17 Provinces · 340+ Campuses</span>
            <span className="text-slate-600 hidden md:inline">·</span>
            <span className="text-slate-400 hidden lg:inline">Statutory S-3 Min Wage ₩10,030/hr Guaranteed</span>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            <button
              onClick={() => setActiveSection('deadlines')}
              className="text-amber-300 hover:text-amber-200 font-semibold cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Deadlines Radar</span>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => setActiveSection('finder')}
              className="text-blue-300 hover:text-white font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>AI Match Finder</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Hero Section: Sovereign Typography & High-End Command Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Heading & Omni Search Bar */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                <span>The Gateway for International Students in South Korea</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-extrabold text-slate-950 dark:text-white tracking-tight leading-[1.12]">
                Everything You Need in Korea, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-rose-600 dark:from-blue-400 dark:via-indigo-300 dark:to-rose-300">
                  All in One Place.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Explore 340+ accredited Korean universities, verified student housing, statutory S-3 part-time jobs, winter wardrobe arrival packages, and Climate Card passes — with official guidelines in 16 languages.
              </p>
            </div>

            {/* High-End Search Command Bar */}
            <div className="bg-white dark:bg-[#0c1224] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-3 space-y-2.5 relative transition-colors duration-200">
              {/* Category Segmented Selector */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
                {[
                  { id: 'all', label: 'All Services' },
                  { id: 'universities', label: 'Universities' },
                  { id: 'deadlines', label: 'Live Deadlines' },
                  { id: 'housing', label: 'Housing' },
                  { id: 'jobs', label: 'S-3 Jobs' },
                  { id: 'arrival', label: 'Arrival Prep' },
                  { id: 'shop', label: 'Store' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setHeroCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                      heroCategory === cat.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Main Search Input */}
              <form onSubmit={handleHeroSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      heroCategory === 'universities'
                        ? 'Search SKY, KAIST, PNU, English-track degrees...'
                        : heroCategory === 'deadlines'
                        ? 'Search closing dates, DHL cutoffs, Fall 2027...'
                        : heroCategory === 'housing'
                        ? 'Search Goshiwons near Sinchon, Anam, Hyehwa...'
                        : heroCategory === 'jobs'
                        ? 'Search S-3 legal student jobs, English tutor, cafe...'
                        : heroCategory === 'arrival'
                        ? 'Search winter packing, 220V adapter, quarantine...'
                        : heroCategory === 'shop'
                        ? 'Search long padding, heated ondol pad, halal food...'
                        : 'Search 340+ universities, housing, KTX, visa rules, jobs...'
                    }
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-[#11192e] hover:bg-slate-100/70 dark:hover:bg-[#152038] focus:bg-white dark:focus:bg-[#0c1224] rounded-xl border border-slate-200/90 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.35)] flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>Search</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Live Search Instant Preview Popup */}
              {liveSearchResults && liveSearchResults.totalCount > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0c1224] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3 z-30 max-h-80 overflow-y-auto space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span>Instant Results for "{searchQuery}"</span>
                    <button
                      onClick={handleHeroSearchSubmit}
                      className="text-blue-600 dark:text-blue-400 hover:underline normal-case font-semibold cursor-pointer"
                    >
                      View all results →
                    </button>
                  </div>

                  {liveSearchResults.unis.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Universities</div>
                      {liveSearchResults.unis.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => setActiveSection('universities')}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg flex items-center justify-between cursor-pointer text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{u.nameEn}</span>
                            <span className="text-slate-400 ml-2">({u.nameKr})</span>
                          </div>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{formatKrw(u.annualTuitionKrw)}/yr</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {liveSearchResults.housing.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Housing</div>
                      {liveSearchResults.housing.map((h) => (
                        <div
                          key={h.id}
                          onClick={() => setActiveSection('housing')}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg flex items-center justify-between cursor-pointer text-xs"
                        >
                          <span className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{h.title}</span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">{formatKrw(h.monthlyRentKrw)}/mo</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {liveSearchResults.jobs.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">S-3 Student Jobs</div>
                      {liveSearchResults.jobs.map((j: any) => (
                        <div
                          key={j.id}
                          onClick={() => setActiveSection('jobs')}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg flex items-center justify-between cursor-pointer text-xs"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">{j.title}</span>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold">{formatKrw(j.hourlyWageKrw)}/hr</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Clickable Popular Query Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-400">Popular:</span>
                {[
                  { label: 'Fall 2027 Deadlines', sec: 'deadlines' },
                  { label: 'AI Eligibility Match', sec: 'finder' },
                  { label: 'Sinchon Goshiwon', sec: 'housing' },
                  { label: 'Long Padding Coat', sec: 'shop' },
                  { label: 'Winter Wardrobe', sec: 'arrival-prep' },
                  { label: 'S-3 Work Permit', sec: 'jobs' },
                  { label: 'Climate Card ₩62k', sec: 'transit-health' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => {
                      setSearchQuery(chip.label);
                      setActiveSection(chip.sec as any);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer border border-slate-200/50 dark:border-white/5"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quiet Unboxed Trust Markers with Sovereign Accents */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">340+ Campuses</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Verified Landlords</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">₩10,030/hr Legal Min Wage</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">16 Languages</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Showcase & Student Daily Snapshot */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-white/10 bg-slate-900 group">
              <img
                src="/src/assets/images/hero_seoul_campus_1793616447568.jpg"
                alt="Seoul Campus Life"
                className="w-full aspect-[4/3] object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-[#070b16]/50 to-transparent"></div>

              {/* Overlay Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    Spring 2027 & Fall 2027 Admissions
                  </span>
                  <span className="text-slate-300 text-[11px] font-mono">Seoul, South Korea</span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold leading-snug">
                    SKY, KAIST, PNU & English-Track Degrees
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    Direct access to official university admission portals, Global Korea Scholarship (GKS) requirements, DHL courier tracking, and tuition calculators.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setActiveSection('universities')}
                    className="text-white hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Browse 340+ Universities</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setActiveSection('deadlines')}
                    className="text-xs text-amber-300 hover:text-white font-medium transition-colors cursor-pointer"
                  >
                    View Deadlines Radar →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Dual Marquee Action Banner: AI Eligibility Matcher & Live Deadlines Radar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Banner 1: AI Admission Requirement & Eligibility Matcher */}
          <div
            onClick={() => setActiveSection('finder')}
            className="p-7 bg-gradient-to-br from-[#0c162e] via-[#101e40] to-[#0a1226] text-white rounded-3xl shadow-xl hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group border border-blue-500/25 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div>
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-blue-600/40 text-blue-300 border border-blue-400/30 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-blue-200" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full">
                  AI Probability Engine
                </span>
              </div>
              <h3 className="text-xl font-bold mt-4 group-hover:text-blue-200 transition-colors">
                University Admission Match Finder
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Input your CGPA (US 4.0, UK 1st Class, India 10.0), TOPIK score, and budget to calculate instant admission odds, scholarship waiver predictions, and document submission requirements.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-blue-300 font-semibold">
              <span>Calculate My University Matches</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Banner 2: Live Admission Deadlines & DHL Cutoff Radar */}
          <div
            onClick={() => setActiveSection('deadlines')}
            className="p-7 bg-gradient-to-br from-[#08151c] via-[#0d2127] to-[#060f14] text-white rounded-3xl shadow-xl hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group border border-emerald-500/25 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div>
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600/40 text-emerald-300 border border-emerald-400/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-emerald-200" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full">
                  Live 24h Sync
                </span>
              </div>
              <h3 className="text-xl font-bold mt-4 group-hover:text-emerald-200 transition-colors">
                Live Admission Deadlines Radar
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Real-time tracking of Fall 2027 & Spring 2028 application portals, DHL courier cutoff deadlines, interview schedules, and Certificate of Admission (COA) issuance dates.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-emerald-300 font-semibold">
              <span>Monitor Live Deadlines</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Services Bento Grid (Prestige Cards, Zero Slop) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
              Essential Student Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Verified tools, official Korean government guidelines, and campus essentials.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Card: Arrival Prep & Wardrobe Guide */}
          <div
            onClick={() => setActiveSection('arrival-prep')}
            className="p-5 bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-amber-400 dark:hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Luggage className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                  New Arrivals
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Arrival Preparation Guide
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Four-season wardrobe piece counts, 220V 60Hz electrical plug safety, customs quarantine bans, and multi-currency budget converter.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
              <span>Start Packing Checklist</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card: Learn Hangul & 5,000+ BD-to-Korean Dictionary */}
          <div
            onClick={() => setActiveSection('learn-hangul')}
            className="p-5 bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-rose-400 dark:hover:border-rose-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg font-serif">
                  한
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-100/80 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60">
                  5,200+ BD Words
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                Learn Hangul (বাংলা-কোরিয়ান)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Complete alphabet master, live syllable builder, audio pronunciation, TOPIK I/II flashcards, and 5,000+ Bengali vocabulary with phonetic guides.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
              <span>Explore 5,000+ Words</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card: Student E-Commerce Store */}
          <div
            onClick={() => setActiveSection('shop')}
            className="p-5 bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-indigo-400 dark:hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-100/80 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60">
                  Rocket Delivery
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                EveryKR Student Store
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Sub-zero winter long padding coats, heated Ondol mattress pads, dorm bedding kits, and certified Halal Shin Ramyun packs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              <span>Browse Essentials</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card: Student Housing */}
          <div
            onClick={() => setActiveSection('housing')}
            className="p-5 bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-teal-400 dark:hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-teal-100/80 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/60">
                  Verified
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                Student Housing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Goshiwons, one-room studios, and dormitories with transparent deposit tiers and verified English-speaking managers.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-semibold">
              <span>{housing.length} Units Listed</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card: S-3 Student Jobs */}
          <div
            onClick={() => setActiveSection('jobs')}
            className="p-5 bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-100/80 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                  ₩10,030/hr Legal Min
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Part-Time S-3 Jobs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Immigration-compliant part-time jobs for D-2 and D-4 visa holders with statutory minimum wage guarantees.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold">
              <span>Explore Part-Time Jobs</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card: Transit & English Healthcare */}
          <div
            onClick={() => setActiveSection('transit-health')}
            className="p-5 bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-emerald-400 dark:hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                  Transit & Health
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Transit & Healthcare
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Seoul 30-day Climate Card (₩62k), KTX student youth passes, NHIS national health insurance, and English emergency clinics.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>View Clinics & Passes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card: Korea Survival Center */}
          <div
            onClick={() => setActiveSection('survival')}
            className="p-5 bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-100/80 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                  Survival Guide
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Korea Survival Center
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Pre-ARC Korean bank setup, KT/LG U+ eSIM activation, volumetric trash sorting rules, and monthly cost calculators.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold">
              <span>Read Survival Guides</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card: Korean AI Assistant & Cultural Phrasebook */}
          <div
            onClick={() => setActiveSection('assistant')}
            className="p-5 bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-purple-400 dark:hover:border-purple-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-100/80 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/60">
                  AI Assistant
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Korean AI Helper
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Analyze residential lease contracts, translate real estate forms, and learn high-frequency student situational dialogues.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-semibold">
              <span>Open AI Phrasebook</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card: Campus Second-Hand Market */}
          <div
            onClick={() => setActiveSection('marketplace')}
            className="p-5 bg-white dark:bg-[#0c1224] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-sky-400 dark:hover:border-sky-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-sky-100/80 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/60">
                  Student Karrot
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Campus Second-Hand Market
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Direct trade around university subway stations: rice cookers, desk monitors, winter coats, and used textbooks.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-semibold">
              <span>Browse Trade Items</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Interactive Financial & Legal Utility Desk (Toss / Fintech grade) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50/80 dark:bg-[#0c1224] border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 lg:p-8 transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  Interactive Student Utility Desk
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Fast calculation of living expenses and Ministry of Justice work limits.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Utility 1: KRW Quick Currency Converter */}
            <div className="bg-white dark:bg-[#080d1a] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Korean Won (KRW) Currency Converter
                </span>
                <div className="flex gap-1 text-[10px] font-bold overflow-x-auto pb-0.5">
                  {(['USD', 'EUR', 'CNY', 'JPY', 'VND', 'INR', 'BDT', 'NPR', 'MNT'] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setSelectedCurrency(curr)}
                      className={`px-1.5 py-0.5 rounded-md font-mono cursor-pointer transition-colors ${
                        selectedCurrency === curr
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Amount in Korean Won (₩)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₩</span>
                  <input
                    type="number"
                    step="50000"
                    value={krwInput}
                    onChange={(e) => setKrwInput(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1224] rounded-xl font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                <span>Presets:</span>
                {[
                  { label: 'Goshiwon (₩450k)', val: 450000 },
                  { label: 'Studio (₩750k)', val: 750000 },
                  { label: 'Tuition (₩4.2M)', val: 4200000 },
                  { label: 'Min Wage (₩10,030)', val: 10030 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setKrwInput(p.val)}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase">Estimated Conversion</div>
                  <div className="text-lg font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                    {exchangeRates[selectedCurrency].symbol}
                    {(krwInput * exchangeRates[selectedCurrency].rate).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="text-xs font-semibold">{selectedCurrency}</span>
                  </div>
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Indicative Bank Rate</span>
              </div>
            </div>

            {/* Utility 2: Part-time Employment Legal Hours Checker */}
            <div className="bg-white dark:bg-[#080d1a] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  S-3 Legal Part-Time Hours Calculator
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  2026/2027 Immigration Rules
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Visa & Program</label>
                  <select
                    value={degreeTier}
                    onChange={(e) => setDegreeTier(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1224] text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="undergrad">Undergraduate (D-2-2)</option>
                    <option value="grad">Graduate (Master/PhD D-2-3/4)</option>
                    <option value="language">Language Trainee (D-4)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">TOPIK Score</label>
                  <select
                    value={topikLevel}
                    onChange={(e) => setTopikLevel(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1224] text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={0}>Below TOPIK 3</option>
                    <option value={3}>TOPIK Level 3</option>
                    <option value={4}>TOPIK Level 4</option>
                    <option value={5}>TOPIK Level 5 or 6</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="vacationCheck"
                  checked={isVacation}
                  onChange={(e) => setIsVacation(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="vacationCheck" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Current period is official university vacation (방학)
                </label>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Legal Weekly Allowance</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {calculateLegalHours()}
                  </div>
                </div>
                <button
                  onClick={() => setActiveSection('jobs')}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                >
                  S-3 Steps →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Live Showcase Split: Universities & Housing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Universities Spotlight */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-950 dark:text-white text-base sm:text-lg">
                  Top Universities with Active Deadlines
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">English tracks and GKS scholarships available.</p>
              </div>
              <button
                onClick={() => setActiveSection('universities')}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                View All {universities.length}
              </button>
            </div>

            <div className="space-y-3">
              {universities.slice(0, 3).map((uni) => (
                <div
                  key={uni.id}
                  onClick={() => setActiveSection('universities')}
                  className="p-4 bg-white dark:bg-[#0c1224] rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center text-xs shrink-0 border border-blue-100 dark:border-blue-900/50">
                      {uni.acronym}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-950 dark:text-white leading-snug">
                        {uni.nameEn}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{uni.nameKr}</span>
                        <span>·</span>
                        <span>{uni.region}</span>
                        <span>·</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{uni.nearestSubway.split('(')[0]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-950 dark:text-white font-mono">
                      {formatKrw(uni.annualTuitionKrw)}/yr
                    </div>
                    <div className="text-[11px] text-amber-500 dark:text-amber-400 font-semibold flex items-center justify-end gap-1">
                      <Award className="w-3 h-3" />
                      <span>GKS Eligible</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Housing Spotlight */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-950 dark:text-white text-base sm:text-lg">
                  Verified Student Housing
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">English-friendly hosts and deposit protection.</p>
              </div>
              <button
                onClick={() => setActiveSection('housing')}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                Explore Housing ({housing.length})
              </button>
            </div>

            <div className="space-y-3">
              {housing.slice(0, 3).map((room) => (
                <div
                  key={room.id}
                  onClick={() => setActiveSection('housing')}
                  className="p-4 bg-white dark:bg-[#0c1224] rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-teal-400 dark:hover:border-teal-400 hover:shadow-md transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-950 dark:text-white line-clamp-1">
                        {room.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="capitalize">{room.type}</span>
                        <span>·</span>
                        <span>{room.neighborhood}</span>
                        <span>·</span>
                        <span>{room.walkMinutesToStation} min walk</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {formatKrw(room.monthlyRentKrw)}/mo
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Deposit: {formatKrw(room.depositKrw)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Emergency & Multilingual Hotlines Support Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-7 bg-[#070b16] rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <PhoneCall className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base">Free Multilingual Emergency & Immigration Support</div>
              <div className="text-xs text-slate-300 mt-1">
                Korea Immigration Center: <strong className="text-white">1345</strong> · Medical Emergency: <strong className="text-white">119</strong> · Police: <strong className="text-white">112</strong> · Seoul Dasan Helpline: <strong className="text-white">120</strong> · Tourism & Interpretation: <strong className="text-white">1330</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveSection('assistant')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Korean AI Helper</span>
            </button>
            <button
              onClick={() => setActiveSection('visa')}
              className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
            >
              Visa & ARC Guide
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
