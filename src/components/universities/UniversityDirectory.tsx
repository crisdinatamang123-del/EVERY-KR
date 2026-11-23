/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { University } from '../../types';
import {
  Search,
  GraduationCap,
  MapPin,
  ExternalLink,
  Award,
  Globe2,
  Calendar,
  CheckCircle,
  PlusCircle,
  Mail,
  Phone,
  X,
  FileCheck,
  Scale,
  Sparkles,
} from 'lucide-react';

export const UniversityDirectory: React.FC = () => {
  const app = useApp();
  const universities: any[] = app.universitiesList || [];
  const setActiveSection = (s: any) => app.setActivePage(s);
  const addApplication = (_appItem: any) => {};
  const formatKrw = (amount?: number) => amount ? `₩${amount.toLocaleString()}` : '₩0';
  const searchQuery = app.searchQuery;
  const setSearchQuery = app.setSearchQuery;
  const [comparedUniIds, setComparedUniIds] = useState<string[]>([]);
  const toggleCompareUni = (id: string) => {
    setComparedUniIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const clearCompareUnis = () => setComparedUniIds([]);
  const addToast = (msg: any) => app.showToast(typeof msg === 'string' ? msg : msg?.message || 'Updated');

  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState<string>('all');
  const [englishOnlyFilter, setEnglishOnlyFilter] = useState<boolean>(false);
  const [maxTopikFilter, setMaxTopikFilter] = useState<number>(5);
  const [degreeFilter, setDegreeFilter] = useState<string>('all');
  const [selectedUni, setSelectedUni] = useState<University | null>(null);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

  // Application tracker quick-add form inside modal
  const [applyDegree, setApplyDegree] = useState<'Undergraduate' | 'Master' | 'Doctoral' | 'Language Program'>('Undergraduate');
  const [applyMajor, setApplyMajor] = useState<string>('');
  const [intakeSeason, setIntakeSeason] = useState<'Spring 2027' | 'Fall 2027'>('Fall 2027');

  const REGIONS = [
    'All',
    'Seoul',
    'Gyeonggi',
    'Incheon',
    'Busan',
    'Daegu',
    'Daejeon',
    'Ulsan',
    'Gwangju',
    'Chungnam',
    'Chungbuk',
    'Jeonbuk',
    'Jeonnam',
    'Gyeongbuk',
    'Gyeongnam',
    'Gangwon',
    'Jeju',
  ];

  const filteredUniversities = useMemo(() => {
    return universities.filter((uni) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        uni.nameEn.toLowerCase().includes(query) ||
        uni.nameKr.includes(query) ||
        uni.acronym.toLowerCase().includes(query) ||
        uni.city.toLowerCase().includes(query) ||
        uni.region.toLowerCase().includes(query) ||
        uni.popularMajors.some((m) => m.toLowerCase().includes(query));

      const matchesRegion =
        regionFilter === 'All' ||
        uni.region === regionFilter ||
        uni.region.toLowerCase().includes(regionFilter.toLowerCase()) ||
        (regionFilter === 'Gyeonggi' && uni.region.includes('Gyeonggi')) ||
        (regionFilter === 'Chungnam' && (uni.region.includes('Chungcheongnam') || uni.region.includes('Chungnam') || uni.city.includes('Daejeon'))) ||
        (regionFilter === 'Chungbuk' && (uni.region.includes('Chungcheongbuk') || uni.region.includes('Chungbuk'))) ||
        (regionFilter === 'Jeonbuk' && (uni.region.includes('Jeollabuk') || uni.region.includes('Jeonbuk'))) ||
        (regionFilter === 'Jeonnam' && (uni.region.includes('Jeollanam') || uni.region.includes('Jeonnam'))) ||
        (regionFilter === 'Gyeongbuk' && (uni.region.includes('Gyeongsangbuk') || uni.region.includes('Gyeongbuk'))) ||
        (regionFilter === 'Gyeongnam' && (uni.region.includes('Gyeongsangnam') || uni.region.includes('Gyeongnam'))) ||
        (regionFilter === 'Gangwon' && (uni.region.includes('Gangwon') || uni.region.includes('Gangwon-do')));

      const matchesType =
        institutionTypeFilter === 'all' || uni.institutionType === institutionTypeFilter;

      const matchesEnglish = !englishOnlyFilter || uni.englishTrackAvailable;
      const matchesTopik = uni.minTopikLevel <= maxTopikFilter;

      const matchesDegree =
        degreeFilter === 'all' ||
        (degreeFilter === 'language' && uni.programs?.some((p) => p.degreeLevel === 'Language Program')) ||
        (degreeFilter === 'bachelor' && uni.programs?.some((p) => p.degreeLevel === 'Bachelor')) ||
        (degreeFilter === 'grad' && uni.programs?.some((p) => p.degreeLevel === 'Master' || p.degreeLevel === 'PhD'));

      return matchesSearch && matchesRegion && matchesType && matchesEnglish && matchesTopik && matchesDegree;
    });
  }, [universities, searchQuery, regionFilter, institutionTypeFilter, englishOnlyFilter, maxTopikFilter, degreeFilter]);

  const comparedUnis = universities.filter((u) => comparedUniIds.includes(u.id));

  const handleSaveToDashboard = () => {
    if (!selectedUni) return;
    const popularMajor = selectedUni.popularMajors && selectedUni.popularMajors.length > 0 ? selectedUni.popularMajors[0] : 'General Studies';
    addApplication({
      universityId: selectedUni.id,
      universityName: selectedUni.nameEn || selectedUni.name,
      degreeLevel: applyDegree,
      major: applyMajor || popularMajor,
      intakeSeason: intakeSeason,
      status: 'Preparing Documents',
      deadline: applyDegree === 'Undergraduate' ? selectedUni.undergradDeadline : selectedUni.gradDeadline,
      notes: `Targeting ${selectedUni.acronym || selectedUni.name} International Admission`,
    });
    setSelectedUni(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Directory Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              Ministry of Education Accredited Database • 17 Provinces
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              South Korean University Directory & Admissions
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Compare all accredited Korean universities across Seoul, Busan, Daegu, Incheon, Gwangju, Daejeon, and all 9 provinces. Features English tracks, TOPIK cutoffs, tuition fees, dorm rates, and live admission deadlines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSection('finder')}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>AI Match Finder</span>
            </button>
            <button
              onClick={() => setActiveSection('deadlines')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Live Deadlines Radar</span>
            </button>
            {comparedUniIds.length > 0 && (
              <button
                onClick={() => setShowCompareModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Compare ({comparedUniIds.length})</span>
              </button>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:block bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              <strong className="text-slate-900 dark:text-slate-100">{filteredUniversities.length}</strong> of {universities.length} institutions
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 text-xs shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, acronym, city, major (e.g. SNU, KAIST, AI, Busan)..."
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Institution Type Filter */}
          <div className="md:col-span-4 flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Type:</span>
            <select
              value={institutionTypeFilter}
              onChange={(e) => setInstitutionTypeFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none text-xs"
            >
              <option value="all">All Types (National, Private, Tech, Junior)</option>
              <option value="National">National Universities (국립대)</option>
              <option value="Private">Private Universities (사립대)</option>
              <option value="Institute of Science & Technology">Institutes of Science & Tech (KAIST, UNIST, GIST, POSTECH)</option>
              <option value="Junior College">Junior Colleges (전문대 / Vocational)</option>
            </select>
          </div>

          {/* Degree Level Filter & English Track */}
          <div className="md:col-span-4 flex items-center justify-end gap-2">
            <select
              value={degreeFilter}
              onChange={(e) => setDegreeFilter(e.target.value)}
              className="py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none text-xs"
            >
              <option value="all">All Degree Tracks</option>
              <option value="bachelor">Bachelor (학사)</option>
              <option value="grad">Master / PhD (대학원)</option>
              <option value="language">Korean Language School (어학당 D-4)</option>
            </select>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 whitespace-nowrap px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={englishOnlyFilter}
                onChange={(e) => setEnglishOnlyFilter(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span className="font-semibold text-xs text-blue-700 dark:text-blue-400">100% English</span>
            </label>
          </div>
        </div>

        {/* 17 Regional Pills Row */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap pr-1">
            Provinces:
          </span>
          {REGIONS.map((reg) => (
            <button
              key={reg}
              onClick={() => setRegionFilter(reg)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                regionFilter === reg
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              {reg}
            </button>
          ))}
        </div>
      </div>

      {/* University Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUniversities.map((uni) => {
          const isCompared = comparedUniIds.includes(uni.id);
          return (
            <div
              key={uni.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl dark:shadow-none transition-all overflow-hidden flex flex-col justify-between group"
            >
              <div>
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {uni.acronym}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {uni.nameEn}
                        </h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{uni.nameKr}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">{uni.institutionType}</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 shrink-0">
                      Rank #{uni.ranking}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                    {uni.description}
                  </p>
                </div>

                {/* Admission Specs */}
                <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-t border-b border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{uni.city || uni.region}</span>
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[170px]">
                      {uni.nearestSubway}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Language Cutoff</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {uni.minTopikLevel === 0 ? 'No TOPIK (100% Eng Track)' : `TOPIK Level ${uni.minTopikLevel}+`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Annual Tuition</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {formatKrw(uni.annualTuitionKrw)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-0.5">
                    <span>Bank Balance Solvency</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ${uni.bankBalanceRequiredUsd?.toLocaleString()} USD
                    </span>
                  </div>
                </div>

                {/* Programs and Majors */}
                <div className="px-5 py-3">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Featured Degree Programs
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 flex flex-wrap gap-x-2 gap-y-0.5">
                    {uni.popularMajors.slice(0, 3).map((major, i) => (
                      <span key={major}>
                        {major}
                        {i < 2 ? <span className="text-slate-300 dark:text-slate-600 ml-2">/</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 pt-1 flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedUni(uni);
                    setApplyMajor(uni.popularMajors[0]);
                  }}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Admissions & Programs</span>
                </button>

                <button
                  onClick={() => toggleCompareUni(uni.id)}
                  className={`p-2 border rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isCompared
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                  title={isCompared ? 'Remove from compare' : 'Add to compare'}
                >
                  <Scale className="w-4 h-4" />
                </button>

                <a
                  href={uni.website}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Official university portal"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* University Comparison Side-by-Side Modal with Glassmorphism */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-white/60 overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Side-by-Side University Comparison
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearCompareUnis}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-x-auto text-xs">
              <table className="w-full text-left divide-y divide-slate-200">
                <thead>
                  <tr className="divide-x divide-slate-100">
                    <th className="py-2.5 px-3 bg-slate-50 font-bold text-slate-600">Metric</th>
                    {comparedUnis.map((u) => (
                      <th key={u.id} className="py-2.5 px-4 font-bold text-slate-900 bg-blue-50/40">
                        {u.nameEn} ({u.acronym})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="divide-x divide-slate-100">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">National Ranking</td>
                    {comparedUnis.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 font-bold text-blue-600">
                        Rank #{u.ranking}
                      </td>
                    ))}
                  </tr>
                  <tr className="divide-x divide-slate-100">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Annual Tuition</td>
                    {comparedUnis.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 font-mono font-medium">
                        {formatKrw(u.annualTuitionKrw)}
                      </td>
                    ))}
                  </tr>
                  <tr className="divide-x divide-slate-100">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Minimum TOPIK</td>
                    {comparedUnis.map((u) => (
                      <td key={u.id} className="py-2.5 px-4">
                        {u.minTopikLevel === 0 ? 'No TOPIK (100% Eng)' : `TOPIK Level ${u.minTopikLevel}+`}
                      </td>
                    ))}
                  </tr>
                  <tr className="divide-x divide-slate-100">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Nearest Metro Station</td>
                    {comparedUnis.map((u) => (
                      <td key={u.id} className="py-2.5 px-4">
                        {u.nearestSubway}
                      </td>
                    ))}
                  </tr>
                  <tr className="divide-x divide-slate-100">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">GKS Scholarship</td>
                    {comparedUnis.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-emerald-600 font-semibold">
                        Full Tuition & Living Stipend Eligible
                      </td>
                    ))}
                  </tr>
                  <tr className="divide-x divide-slate-100">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Undergrad Deadline</td>
                    {comparedUnis.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 font-medium text-slate-800">
                        {u.undergradDeadline}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* University Detail & Track Application Modal with Glassmorphism */}
      {selectedUni && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-3xl w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] border border-white/60 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5 dark:ring-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                  {selectedUni.acronym}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedUni.nameEn}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedUni.nameKr} · {selectedUni.institutionType} · National Rank #{selectedUni.ranking}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUni(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* Description */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">About the University</h4>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">{selectedUni.description}</p>
              </div>

              {/* Quick Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Bank Solvency</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    ${selectedUni.bankBalanceRequiredUsd?.toLocaleString()} USD
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Ministry Requirement</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Annual Tuition</div>
                  <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                    {formatKrw(selectedUni.annualTuitionKrw)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">App Fee: {formatKrw(selectedUni.applicationFeeKrw)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Dormitory Fee</div>
                  <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                    {formatKrw(selectedUni.dormitoryFeePerSemesterKrw)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Per Semester</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Scholarship Waiver</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                    Up to {selectedUni.maxScholarshipPercent}%
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedUni.gksScholarshipEligible ? 'GKS Partner' : 'Merit-Based'}
                  </div>
                </div>
              </div>

              {/* Required Documents Checklist */}
              {selectedUni.requiredDocuments && selectedUni.requiredDocuments.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Required Admission Documents Checklist</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    {selectedUni.requiredDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Programs breakdown */}
              {selectedUni.programs && selectedUni.programs.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-2">Available Degree Tracks</h4>
                  <div className="space-y-2">
                    {selectedUni.programs.map((p: any, idx: number) => {
                      const name = typeof p === 'string' ? p : p.nameEn || p.name || 'Program';
                      const nameKr = typeof p === 'string' ? '' : p.nameKr;
                      const degree = typeof p === 'string' ? 'Degree Track' : p.degreeLevel;
                      const tuition = typeof p === 'string' ? null : p.tuitionPerSemesterKrw;
                      const lang = typeof p === 'string' ? 'Korean / English' : p.languageOfInstruction;
                      return (
                        <div key={p.id || idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{name}</span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{nameKr ? `${nameKr} · ` : ''}{degree}</div>
                          </div>
                          <div className="text-right">
                            {tuition && <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{formatKrw(tuition)}/sem</span>}
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{lang}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* International Student Office Contact */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-2">
                  International Student Affairs Contact & Official Portals
                </h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex-1">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Direct Email</div>
                      <a href={`mailto:${selectedUni.intlOfficeEmail}`} className="font-medium text-slate-900 dark:text-slate-100 hover:underline">
                        {selectedUni.intlOfficeEmail}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex-1">
                    <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Office Telephone</div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{selectedUni.intlOfficePhone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={selectedUni.intlAdmissionWebsite || selectedUni.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Official International Admissions Portal</span>
                  </a>
                  {selectedUni.googleMapsUrl && (
                    <a
                      href={selectedUni.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Google Maps Location</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Track in My Applications Form */}
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    Save to My Application Tracker (Student Dashboard)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">Degree Level</label>
                    <select
                      value={applyDegree}
                      onChange={(e) => setApplyDegree(e.target.value as any)}
                      className="w-full mt-1 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-xs"
                    >
                      <option value="Undergraduate">Undergraduate</option>
                      <option value="Master">Master</option>
                      <option value="Doctoral">Doctoral (PhD)</option>
                      <option value="Language Program">Language Program</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">Major / Department</label>
                    <input
                      type="text"
                      value={applyMajor}
                      onChange={(e) => setApplyMajor(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full mt-1 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">Intake Season</label>
                    <select
                      value={intakeSeason}
                      onChange={(e) => setIntakeSeason(e.target.value as any)}
                      className="w-full mt-1 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-xs"
                    >
                      <option value="Fall 2027">Fall 2027</option>
                      <option value="Spring 2027">Spring 2027</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveToDashboard}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add {selectedUni.acronym} to My Dashboard Tracker</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedUni(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
