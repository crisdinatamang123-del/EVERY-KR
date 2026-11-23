/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentProfileAssessment, RecommendedUniversityMatch, University } from '../../types';
import {
  GraduationCap,
  Sparkles,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  DollarSign,
  FileText,
  Award,
  Globe,
  Compass,
  BookmarkPlus,
  BookmarkCheck,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react';

export const AdmissionRequirementFinder: React.FC = () => {
  const { universities, formatKrw, setActiveSection, addToast, addApplication } = useApp();

  const [assessment, setAssessment] = useState<StudentProfileAssessment>({
    nationality: 'Vietnam',
    currentCountry: 'Vietnam',
    highestEducation: 'High School Diploma',
    cgpa: 3.4,
    cgpaScale: '4.0',
    studyGapYears: 1,
    topikLevel: 3,
    ieltsScore: 6.0,
    preferredMajor: 'Computer Science',
    preferredRegion: 'All',
    budgetUsdPerYear: 9000,
    desiredIntake: 'Fall 2027',
    degreeLevel: 'Undergraduate',
  });

  const [selectedMatch, setSelectedMatch] = useState<RecommendedUniversityMatch | null>(null);
  const [savedMatchIds, setSavedMatchIds] = useState<string[]>([]);

  // Matching engine
  const matches: RecommendedUniversityMatch[] = useMemo(() => {
    return universities
      .map((uni): RecommendedUniversityMatch => {
        let score = 70;
        const reasons: string[] = [];
        const warnings: string[] = [];

        // Normalize CGPA to percentage
        let normalizedGpaPct = 75;
        if (assessment.cgpaScale === '4.0') normalizedGpaPct = (assessment.cgpa / 4.0) * 100;
        else if (assessment.cgpaScale === '4.5') normalizedGpaPct = (assessment.cgpa / 4.5) * 100;
        else if (assessment.cgpaScale === '5.0') normalizedGpaPct = (assessment.cgpa / 5.0) * 100;
        else normalizedGpaPct = assessment.cgpa;

        // 1. Language Qualification
        if (assessment.degreeLevel === 'Korean Language (D-4)') {
          score += 15;
          reasons.push('Open to beginners with TOPIK 0. Direct D-4 visa pathway.');
        } else if (assessment.topikLevel >= uni.minTopikLevel) {
          score += 15;
          reasons.push(`Meets or exceeds minimum Korean requirement (TOPIK ${uni.minTopikLevel}+).`);
        } else if (uni.englishTrackAvailable && assessment.ieltsScore >= (uni.minIeltsScore || 5.5)) {
          score += 12;
          reasons.push(`Eligible for 100% English-taught track (IELTS ${uni.minIeltsScore || 5.5}+ accepted).`);
        } else {
          score -= 25;
          warnings.push(`Requires minimum TOPIK ${uni.minTopikLevel} or IELTS ${uni.minIeltsScore || 5.5}. Conditional language course recommended first.`);
        }

        // 2. GPA & Academic Match
        if (normalizedGpaPct >= 88) {
          score += 12;
          reasons.push('High GPA enhances candidacy for merit tuition fee waivers.');
        } else if (normalizedGpaPct < 68) {
          score -= 15;
          warnings.push('Competitive admission; GPA is near lower benchmark for standard acceptance.');
        }

        // 3. Study Gap
        if (assessment.studyGapYears > 3) {
          score -= 10;
          warnings.push('Study gap over 3 years requires a notarized proof of employment or activity.');
        } else if (assessment.studyGapYears <= 1) {
          score += 5;
        }

        // 4. Regional Match
        if (assessment.preferredRegion === 'All' || assessment.preferredRegion === uni.region) {
          score += 8;
          reasons.push(`Campus in ${uni.region} matches regional location preference.`);
        }

        // 5. Budget Match
        const approxAnnualUsd = uni.annualTuitionKrw / 1350;
        if (assessment.budgetUsdPerYear >= approxAnnualUsd) {
          score += 10;
          reasons.push(`Estimated tuition ($${Math.round(approxAnnualUsd).toLocaleString()}/yr) is comfortably within your annual budget.`);
        } else if (assessment.budgetUsdPerYear * 1.5 < approxAnnualUsd && uni.maxScholarshipPercent < 50) {
          score -= 15;
          warnings.push(`Tuition ($${Math.round(approxAnnualUsd).toLocaleString()}/yr) exceeds self-funded budget without major scholarship.`);
        }

        // Expected scholarship estimation
        let scholarship = '30% First Semester Tuition Reduction';
        if (assessment.topikLevel >= 5 || (uni.englishTrackAvailable && assessment.ieltsScore >= 7.5)) {
          scholarship = '70% – 100% Full Tuition Waiver (Global Honors Merit)';
        } else if (assessment.topikLevel === 4 || assessment.ieltsScore >= 6.5) {
          scholarship = '50% First Semester Tuition Reduction';
        } else if (uni.gksScholarshipEligible && normalizedGpaPct >= 85) {
          scholarship = 'Eligible for Korean Government GKS Scholarship Nomination';
        }

        // Upcoming deadline
        const nextDeadline = uni.activeDeadlines?.[0]?.onlineDeadline || uni.undergradDeadline;

        // Final score bounds
        const finalScore = Math.min(99, Math.max(45, score));
        let eligibilityStatus: RecommendedUniversityMatch['eligibilityStatus'] = 'Moderate Match';
        if (finalScore >= 85) eligibilityStatus = 'High Match';
        else if (finalScore < 68) eligibilityStatus = 'Competitive / Reach';

        return {
          university: uni,
          matchScore: finalScore,
          eligibilityStatus,
          matchReasons: reasons,
          recommendedScholarship: scholarship,
          estimatedTuitionKrw: uni.annualTuitionKrw,
          upcomingDeadline: nextDeadline,
          requiredDocuments: uni.requiredDocuments || [
            'Online Application Form',
            'Apostilled High School / College Diploma',
            'Academic Transcripts (Apostilled)',
            'Language Certificate (TOPIK / IELTS)',
            'Bank Balance Certificate ($20,000 for Seoul, $16,000 for Regional)',
            'Passport Copies of Student & Both Parents',
            'Family Relationship Certificate (Birth Certificate)',
          ],
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [universities, assessment]);

  const handleTrackUniversity = (match: RecommendedUniversityMatch) => {
    addApplication({
      universityId: match.university.id,
      universityName: match.university.nameEn,
      degreeLevel:
        assessment.degreeLevel === 'Korean Language (D-4)'
          ? 'Language Program'
          : assessment.degreeLevel === 'PhD'
          ? 'Doctoral'
          : assessment.degreeLevel,
      major: assessment.preferredMajor,
      intakeSeason: assessment.desiredIntake,
      status: 'Preparing Documents',
      deadline: match.upcomingDeadline,
      notes: `Matched via EveryKR Finder with ${match.matchScore}% score. Expected scholarship: ${match.recommendedScholarship}`,
    });
    setSavedMatchIds((prev) => [...prev, match.university.id]);
    addToast(`${match.university.nameEn} added to your Application Tracker!`, 'success');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
            AI-POWERED MATCHING ENGINE
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Student Admission Requirement Finder
          </h1>
          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            Enter your nationality, academic CGPA, study gap, and language qualifications to instantly calculate matching universities across all 17 Korean provinces, expected scholarship reductions, and your visa financial thresholds.
          </p>
        </div>
      </div>

      {/* Main Grid: Form Calculator + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Inputs Panel (Sticky) */}
        <div className="lg:col-span-5 bg-white/95 dark:bg-[#0c1224] backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 lg:sticky lg:top-24 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 flex items-center justify-center text-blue-700 dark:text-blue-300">
                <Calculator className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Student Profile</h2>
            </div>
            <button
              onClick={() => {
                setAssessment({
                  nationality: 'Bangladesh',
                  currentCountry: 'Bangladesh',
                  highestEducation: 'High School Diploma',
                  cgpa: 3.5,
                  cgpaScale: '4.0',
                  studyGapYears: 0,
                  topikLevel: 3,
                  ieltsScore: 6.5,
                  preferredMajor: 'Business Administration',
                  preferredRegion: 'All',
                  budgetUsdPerYear: 8000,
                  desiredIntake: 'Fall 2027',
                  degreeLevel: 'Undergraduate',
                });
                addToast('Reset to demo profile', 'info');
              }}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Demo
            </button>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            {/* Nationality & Country */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                <select
                  value={assessment.nationality}
                  onChange={(e) => setAssessment({ ...assessment, nationality: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="Bangladesh">Bangladesh 🇧🇩</option>
                  <option value="Vietnam">Vietnam 🇻🇳</option>
                  <option value="Nepal">Nepal 🇳🇵</option>
                  <option value="India">India 🇮🇳</option>
                  <option value="Pakistan">Pakistan 🇵🇰</option>
                  <option value="Uzbekistan">Uzbekistan 🇺🇿</option>
                  <option value="Mongolia">Mongolia 🇲🇳</option>
                  <option value="China">China 🇨🇳</option>
                  <option value="Indonesia">Indonesia 🇮🇩</option>
                  <option value="Philippines">Philippines 🇵🇭</option>
                  <option value="Myanmar">Myanmar 🇲🇲</option>
                  <option value="United States">United States 🇺🇸</option>
                  <option value="Other">Other Country</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Degree</label>
                <select
                  value={assessment.degreeLevel}
                  onChange={(e) => setAssessment({ ...assessment, degreeLevel: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="Undergraduate">Undergraduate (Bachelor)</option>
                  <option value="Master">Master Degree (Graduate)</option>
                  <option value="PhD">PhD / Doctoral</option>
                  <option value="Korean Language (D-4)">Korean Language (D-4)</option>
                </select>
              </div>
            </div>

            {/* CGPA & Scale */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic CGPA: <span className="text-blue-600 font-bold">{assessment.cgpa}</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max={assessment.cgpaScale === '100%' ? 100 : Number(assessment.cgpaScale)}
                  value={assessment.cgpa}
                  onChange={(e) => setAssessment({ ...assessment, cgpa: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grading Scale</label>
                <select
                  value={assessment.cgpaScale}
                  onChange={(e) => setAssessment({ ...assessment, cgpaScale: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="4.0">Out of 4.0</option>
                  <option value="4.5">Out of 4.5</option>
                  <option value="5.0">Out of 5.0</option>
                  <option value="100%">Percentage (100%)</option>
                </select>
              </div>
            </div>

            {/* Language: TOPIK & IELTS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  TOPIK Level: <span className="text-blue-600 font-bold">{assessment.topikLevel === 0 ? 'None (0)' : `Level ${assessment.topikLevel}`}</span>
                </label>
                <select
                  value={assessment.topikLevel}
                  onChange={(e) => setAssessment({ ...assessment, topikLevel: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="0">None / Beginner (0)</option>
                  <option value="1">TOPIK Level 1</option>
                  <option value="2">TOPIK Level 2</option>
                  <option value="3">TOPIK Level 3 (Standard)</option>
                  <option value="4">TOPIK Level 4 (Advanced)</option>
                  <option value="5">TOPIK Level 5 (Merit)</option>
                  <option value="6">TOPIK Level 6 (Highest)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IELTS / TOEFL: <span className="text-blue-600 font-bold">{assessment.ieltsScore === 0 ? 'None' : `${assessment.ieltsScore}`}</span>
                </label>
                <select
                  value={assessment.ieltsScore}
                  onChange={(e) => setAssessment({ ...assessment, ieltsScore: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="0">No English Test (0.0)</option>
                  <option value="5.5">IELTS 5.5 / TOEFL 70</option>
                  <option value="6.0">IELTS 6.0 / TOEFL 80</option>
                  <option value="6.5">IELTS 6.5 / TOEFL 88</option>
                  <option value="7.0">IELTS 7.0 / TOEFL 95</option>
                  <option value="7.5">IELTS 7.5+ / TOEFL 105+</option>
                </select>
              </div>
            </div>

            {/* Study Gap & Region */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Study Gap: <span className="text-slate-900 font-bold">{assessment.studyGapYears} {assessment.studyGapYears === 1 ? 'Year' : 'Years'}</span>
                </label>
                <select
                  value={assessment.studyGapYears}
                  onChange={(e) => setAssessment({ ...assessment, studyGapYears: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="0">No Gap (Fresh Graduate)</option>
                  <option value="1">1 Year Gap</option>
                  <option value="2">2 Years Gap</option>
                  <option value="3">3 Years Gap</option>
                  <option value="4">4+ Years Gap</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Region</label>
                <select
                  value={assessment.preferredRegion}
                  onChange={(e) => setAssessment({ ...assessment, preferredRegion: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="All">All 17 Provinces</option>
                  <option value="Seoul">Seoul Metropolitan</option>
                  <option value="Busan">Busan</option>
                  <option value="Daejeon">Daejeon</option>
                  <option value="Daegu">Daegu</option>
                  <option value="Incheon">Incheon</option>
                  <option value="Gwangju">Gwangju</option>
                  <option value="Gyeonggi-do">Gyeonggi-do</option>
                </select>
              </div>
            </div>

            {/* Budget Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">Annual Tuition Budget (USD)</label>
                <span className="text-xs font-bold text-blue-700">${assessment.budgetUsdPerYear.toLocaleString()} USD/yr</span>
              </div>
              <input
                type="range"
                min="3000"
                max="15000"
                step="500"
                value={assessment.budgetUsdPerYear}
                onChange={(e) => setAssessment({ ...assessment, budgetUsdPerYear: parseInt(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>$3,000 (Regional Nat\'l)</span>
                <span>$7,000 (Average)</span>
                <span>$15,000 (Private Sky)</span>
              </div>
            </div>
          </div>

          {/* Quick Notice on Bank Balance */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Korea Student Visa Bank Rule
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/80">
              Immigration requires a frozen bank certificate of <strong>$20,000 USD</strong> for Seoul/Incheon/Gyeonggi universities, or <strong>$16,000 USD</strong> for regional universities outside the capital area.
            </p>
          </div>
        </div>

        {/* Matched Universities Output */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 dark:bg-[#0c1224]/80 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Matching Results</span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {matches.length} Universities Evaluated in South Korea
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {matches.filter((m) => m.eligibilityStatus === 'High Match').length} High Match
              </span>
              <span className="flex items-center gap-1 text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                {matches.filter((m) => m.eligibilityStatus === 'Moderate Match').length} Moderate
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {matches.map((match) => {
              const isSaved = savedMatchIds.includes(match.university.id);
              const isHigh = match.eligibilityStatus === 'High Match';
              const isMod = match.eligibilityStatus === 'Moderate Match';

              return (
                <div
                  key={match.university.id}
                  className={`group relative overflow-hidden rounded-3xl bg-white/95 dark:bg-[#0c1224] backdrop-blur-md border transition-all duration-200 hover:shadow-lg ${
                    isHigh
                      ? 'border-emerald-300 dark:border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : isMod
                      ? 'border-blue-200 dark:border-blue-500/30'
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Top Row: Logo, Names, Match Score Badge */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-md">
                          {match.university.logo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base sm:text-lg font-bold text-slate-900 hover:text-blue-700 transition-colors">
                              {match.university.nameEn}
                            </h4>
                            <span className="text-xs text-slate-500 hidden sm:inline">{match.university.nameKr}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                              {match.university.institutionType}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Compass className="w-3 h-3 text-slate-400" />
                              {match.university.region} ({match.university.city})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right flex flex-col items-end shrink-0">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black shadow-sm ${
                            isHigh
                              ? 'bg-emerald-600 text-white'
                              : isMod
                              ? 'bg-blue-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          <span>{match.matchScore}%</span>
                          <span className="text-[10px] font-medium opacity-90">MATCH</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 mt-1">
                          {match.eligibilityStatus}
                        </span>
                      </div>
                    </div>

                    {/* Reasons & Strengths */}
                    <div className="space-y-1.5 bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 text-xs text-slate-700">
                      {match.matchReasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </div>
                      ))}
                      {match.warnings?.map((warning, i) => (
                        <div key={i} className="flex items-start gap-2 text-amber-800">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>

                    {/* Financial & Scholarship Highlights */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
                      <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100/60">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Award className="w-3 h-3 text-blue-600" />
                          Expected Scholarship
                        </span>
                        <p className="font-bold text-blue-900 mt-1 line-clamp-2">
                          {match.recommendedScholarship}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-slate-600" />
                          Annual Tuition
                        </span>
                        <p className="font-bold text-slate-900 mt-1">
                          {formatKrw(match.estimatedTuitionKrw)}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-600" />
                          Application Deadline
                        </span>
                        <p className="font-bold text-slate-900 mt-1 truncate">
                          {match.upcomingDeadline}
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedMatch(match)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View Required Documents Checklist
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTrackUniversity(match)}
                          disabled={isSaved}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            isSaved
                              ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Tracked
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3.5 h-3.5" />
                              Track Application
                            </>
                          )}
                        </button>

                        <a
                          href={match.university.intlAdmissionWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
                        >
                          Official Portal
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Modal for Selected Match: Documents & Step-by-Step Guidance */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 sm:p-8 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  {selectedMatch.university.region} • {selectedMatch.university.institutionType}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {selectedMatch.university.nameEn}
                </h3>
                <p className="text-xs text-slate-500">{selectedMatch.university.address}</p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                aria-label="Close details"
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Required Admission & Visa Documents
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedMatch.requiredDocuments.join('\n• '));
                    addToast('Checklist copied to clipboard', 'success');
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Copy All
                </button>
              </div>

              <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                {selectedMatch.requiredDocuments.map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="mt-0.5">{doc}</span>
                  </div>
                ))}
              </div>

              {/* Financial Verification Rules */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Bank Guarantee Requirement for {selectedMatch.university.region}
                </div>
                <p className="text-[11px] leading-relaxed">
                  Requires <strong>${selectedMatch.university.bankBalanceRequiredUsd.toLocaleString()} USD</strong> frozen certificate in the student’s or parent’s name, issued within 30 days of submission.
                </p>
              </div>

              {/* Admission Office Contact */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">International Admissions Office:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedMatch.university.intlOfficeEmail}</p>
                  <p className="text-slate-500">{selectedMatch.university.intlOfficePhone}</p>
                </div>
                <a
                  href={selectedMatch.university.intlAdmissionWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-center hover:bg-blue-700 transition-colors shrink-0"
                >
                  Visit Admission Portal
                </a>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
