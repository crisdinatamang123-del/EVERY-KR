import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Building2,
  Calendar,
  Award,
  Compass,
  Clock,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { University } from '../types';
import { getUniversitySlug } from '../utils/seoRoutes';
import { isApprovedPriorityUniversity } from '../data/universitiesMaster';
import {
  RELATIONAL_BUNDLE_BY_ID,
  buildArchiveUniversityRelationalBundle,
} from '../data/universities25';
import {
  DEADLINE_DEGREE_TABS,
  DeadlineDegreeTab,
  getAllEnrichedUniversityDeadlines,
} from '../utils/universityDeadlineClassifier';

export type UniversityMainOption = 'top_destinations' | 'all_universities' | 'deadlines';
type DeadlineTimeOption = 'running' | 'upcoming';
type SortOption = 'az' | 'za';

const REGION_OPTIONS = [
  'All Regions',
  'Seoul',
  'Busan',
  'Gyeonggi-do',
  'Incheon',
  'Daejeon & Chungcheong',
  'Daegu & Gyeongsang',
  'Gwangju & Jeolla',
  'Gangwon & Jeju',
] as const;

type RegionFilter = (typeof REGION_OPTIONS)[number];

function matchesRegion(uni: University, region: RegionFilter): boolean {
  if (region === 'All Regions') return true;
  const combined = `${uni.city || ''} ${uni.province || ''} ${uni.region || ''}`.toLowerCase();
  if (region === 'Seoul') return combined.includes('seoul');
  if (region === 'Busan') return combined.includes('busan');
  if (region === 'Gyeonggi-do') {
    return (
      combined.includes('gyeonggi') ||
      combined.includes('suwon') ||
      combined.includes('seongnam') ||
      combined.includes('yongin') ||
      combined.includes('goyang') ||
      combined.includes('ansan') ||
      combined.includes('bucheon') ||
      combined.includes('anyang') ||
      combined.includes('yangju') ||
      combined.includes('pocheon') ||
      combined.includes('pyeongtaek') ||
      combined.includes('hwaseong')
    );
  }
  if (region === 'Incheon') return combined.includes('incheon');
  if (region === 'Daejeon & Chungcheong') {
    return (
      combined.includes('daejeon') ||
      combined.includes('chungcheong') ||
      combined.includes('chungbuk') ||
      combined.includes('chungnam') ||
      combined.includes('cheongju') ||
      combined.includes('cheonan') ||
      combined.includes('asan') ||
      combined.includes('seosan') ||
      combined.includes('nonsan') ||
      combined.includes('sejong')
    );
  }
  if (region === 'Daegu & Gyeongsang') {
    return (
      combined.includes('daegu') ||
      combined.includes('ulsan') ||
      combined.includes('gyeongsang') ||
      combined.includes('gyeongbuk') ||
      combined.includes('gyeongnam') ||
      combined.includes('gimhae') ||
      combined.includes('changwon') ||
      combined.includes('jinju') ||
      combined.includes('gyeongsan') ||
      combined.includes('pohang') ||
      combined.includes('yangsan')
    );
  }
  if (region === 'Gwangju & Jeolla') {
    return (
      combined.includes('gwangju') ||
      combined.includes('jeolla') ||
      combined.includes('jeonbuk') ||
      combined.includes('jeonnam') ||
      combined.includes('jeonju') ||
      combined.includes('naju') ||
      combined.includes('iksan') ||
      combined.includes('mokpo') ||
      combined.includes('suncheon')
    );
  }
  if (region === 'Gangwon & Jeju') {
    return (
      combined.includes('gangwon') ||
      combined.includes('jeju') ||
      combined.includes('chuncheon') ||
      combined.includes('wonju') ||
      combined.includes('gangneung') ||
      combined.includes('hoengseong')
    );
  }
  return true;
}

interface UniversityFinderProps {
  isFullPage?: boolean;
  initialOption?: UniversityMainOption;
}

export const UniversityFinder: React.FC<UniversityFinderProps> = ({ initialOption }) => {
  const { universitiesList } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();

  const resolveOptionFromParams = (): UniversityMainOption => {
    if (initialOption) return initialOption;
    const opt = searchParams.get('option') || searchParams.get('view');
    if (opt === 'all' || opt === 'all-korea' || opt === 'all_universities') {
      return 'all_universities';
    }
    if (opt === 'deadlines' || opt === 'application-deadlines') {
      return 'deadlines';
    }
    return 'top_destinations';
  };

  const [activeOption, setActiveOption] = useState<UniversityMainOption>(resolveOptionFromParams);

  // All Universities in Korea filters
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('q') || '');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('All Regions');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [sortBy, setSortBy] = useState<SortOption>('az');

  // Application Deadlines state
  const [deadlineTimeOption, setDeadlineTimeOption] = useState<DeadlineTimeOption>('running');
  const [selectedDegreeTab, setSelectedDegreeTab] = useState<DeadlineDegreeTab>('Bachelor');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearchTerm(q);
    if (initialOption) {
      setActiveOption(initialOption);
      return;
    }
    const opt = searchParams.get('option') || searchParams.get('view');
    if (opt === 'all' || opt === 'all-korea' || opt === 'all_universities') {
      setActiveOption('all_universities');
    } else if (opt === 'deadlines' || opt === 'application-deadlines') {
      setActiveOption('deadlines');
    } else if (opt === 'top' || opt === 'top-25' || opt === 'top_destinations') {
      setActiveOption('top_destinations');
    }
  }, [searchParams, initialOption]);

  const handleSelectMainOption = (option: UniversityMainOption) => {
    setActiveOption(option);
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    if (option === 'top_destinations') {
      next.delete('option');
    } else if (option === 'all_universities') {
      next.set('option', 'all_universities');
    } else {
      next.set('option', 'deadlines');
    }
    setSearchParams(next, { replace: true });
  };

  // Top Destinations: 25 featured universities in exact numbered order (01..25)
  const featured25Universities = useMemo(
    () =>
      universitiesList
        .filter((u) => isApprovedPriorityUniversity(u))
        .sort((a, b) => (a.whitelistOrder || 99) - (b.whitelistOrder || 99)),
    [universitiesList]
  );

  // All Universities in Korea with search, region, type, and alphabetical sort
  const filteredAllUniversities = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return universitiesList
      .filter((uni) => {
        const matchesQuery =
          !q ||
          (uni.officialName || uni.name).toLowerCase().includes(q) ||
          uni.name.toLowerCase().includes(q) ||
          (uni.koreanName || '').toLowerCase().includes(q) ||
          (uni.city || '').toLowerCase().includes(q);
        const matchesReg = matchesRegion(uni, selectedRegion);
        const matchesUniType =
          selectedType === 'All Types' ||
          (uni.type || '').toLowerCase() === selectedType.toLowerCase();
        return matchesQuery && matchesReg && matchesUniType;
      })
      .sort((a, b) => {
        const nameA = a.officialName || a.name;
        const nameB = b.officialName || b.name;
        return sortBy === 'az' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
  }, [universitiesList, searchTerm, selectedRegion, selectedType, sortBy]);

  // Application Deadlines (Running vs Upcoming, separated strictly by verified dates)
  const allEnrichedDeadlines = useMemo(
    () => getAllEnrichedUniversityDeadlines(universitiesList),
    [universitiesList]
  );

  const runningDeadlinesForDegree = useMemo(
    () =>
      allEnrichedDeadlines.filter(
        (d) => d.status === 'Open' && d.degreeTab === selectedDegreeTab
      ),
    [allEnrichedDeadlines, selectedDegreeTab]
  );

  const upcomingDeadlinesForDegree = useMemo(
    () =>
      allEnrichedDeadlines.filter(
        (d) => d.status === 'Upcoming' && d.degreeTab === selectedDegreeTab
      ),
    [allEnrichedDeadlines, selectedDegreeTab]
  );

  const resolveUniversityLogo = (uni: University): string | undefined => {
    const bundle =
      uni.relationalBundle ||
      RELATIONAL_BUNDLE_BY_ID[uni.id] ||
      buildArchiveUniversityRelationalBundle(uni);
    const hasVerifiedLogo = Boolean(
      (bundle?.logo?.verified && bundle.logo.localAssetPath) ||
        (uni.logoVerified && uni.logoUrl)
    );
    return hasVerifiedLogo ? bundle?.logo?.localAssetPath || uni.logoUrl : undefined;
  };

  const buildDeadlineApplyPath = (
    slug: string,
    degree?: string,
    round?: string,
    intake?: string
  ): string => {
    const q = new URLSearchParams();
    if (intake) q.set('intake', intake);
    if (degree) q.set('degree', degree);
    if (round) q.set('round', round);
    return `/apply/${encodeURIComponent(slug)}${q.toString() ? `?${q.toString()}` : ''}`;
  };

  return (
    <div className="min-h-screen bg-transparent text-[#061B49] dark:text-white py-8 sm:py-12 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ================================================================= */}
        {/* 1. UNIVERSITY DIRECTORY HEADER & NAVIGATION TABS                  */}
        {/* ================================================================= */}
        <header className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="w-4 h-0.5 rounded-full bg-[#FFB800]" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0754B8] dark:text-[#60A5FA]">
                Accredited Institutions · Study in Korea
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#061B49] dark:text-white text-balance">
              Universities in South Korea
            </h1>
            <p className="text-sm text-slate-600 dark:text-[#B8C9E5] max-w-2xl leading-relaxed">
              Browse top international student destinations, filter Korean universities nationwide by region or type, review verified deadlines, and apply directly through EVERYKR.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="University directory views"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3.5"
          >
            {/* Tab 1 — Top Destinations for Students */}
            <button
              type="button"
              role="tab"
              aria-selected={activeOption === 'top_destinations'}
              onClick={() => handleSelectMainOption('top_destinations')}
              className={`text-left rounded-2xl p-4 sm:p-5 transition-all cursor-pointer flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                activeOption === 'top_destinations'
                  ? 'ekr-glass-card-active'
                  : 'ekr-glass-card'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeOption === 'top_destinations'
                    ? 'bg-[#0754B8] text-white'
                    : 'bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA]'
                }`}
              >
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA8CF] tabular-nums">
                  {featured25Universities.length} Featured
                </div>
                <div className="text-sm font-bold text-[#061B49] dark:text-white truncate">
                  Top Destinations
                </div>
              </div>
            </button>

            {/* Tab 2 — All Universities in Korea */}
            <button
              type="button"
              role="tab"
              aria-selected={activeOption === 'all_universities'}
              onClick={() => handleSelectMainOption('all_universities')}
              className={`text-left rounded-2xl p-4 sm:p-5 transition-all cursor-pointer flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                activeOption === 'all_universities'
                  ? 'ekr-glass-card-active'
                  : 'ekr-glass-card'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeOption === 'all_universities'
                    ? 'bg-[#0754B8] text-white'
                    : 'bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA]'
                }`}
              >
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA8CF] tabular-nums">
                  {universitiesList.length} Institutions
                </div>
                <div className="text-sm font-bold text-[#061B49] dark:text-white truncate">
                  All Universities
                </div>
              </div>
            </button>

            {/* Tab 3 — Application Deadlines */}
            <button
              type="button"
              role="tab"
              aria-selected={activeOption === 'deadlines'}
              onClick={() => handleSelectMainOption('deadlines')}
              className={`text-left rounded-2xl p-4 sm:p-5 transition-all cursor-pointer flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                activeOption === 'deadlines'
                  ? 'ekr-glass-card-active'
                  : 'ekr-glass-card'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeOption === 'deadlines'
                    ? 'bg-[#0754B8] text-white'
                    : 'bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA]'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA8CF]">
                  Intake Schedule
                </div>
                <div className="text-sm font-bold text-[#061B49] dark:text-white truncate">
                  Application Deadlines
                </div>
              </div>
            </button>
          </div>
        </header>

        {/* ================================================================= */}
        {/* 2. TOP DESTINATIONS FOR STUDENTS (25 FEATURED UNIVERSITIES)       */}
        {/* ================================================================= */}
        {activeOption === 'top_destinations' && (
          <section className="space-y-3" aria-label="Top Destinations for Students">
            <div className="divide-y divide-slate-200/80 dark:divide-white/10 ekr-glass-panel rounded-2xl overflow-hidden">
              {featured25Universities.map((uni, idx) => {
                const rankNumber = String(uni.whitelistOrder || idx + 1).padStart(2, '0');
                const logoSrc = resolveUniversityLogo(uni);
                const slug = getUniversitySlug(uni);
                const applyPath = `/apply/${encodeURIComponent(slug)}`;

                return (
                  <div
                    key={uni.id}
                    className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F5F8FD]/70 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Left: Ranking Number + Official Logo + Name & Location */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-400 dark:text-[#8FA8CF] w-6 shrink-0 tabular-nums">
                        {rankNumber}
                      </span>

                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 dark:border-white/15 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                        {logoSrc ? (
                          <img
                            src={logoSrc}
                            alt={`${uni.officialName || uni.name} logo`}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          to={`/universities/${slug}`}
                          className="block text-sm sm:text-[15px] font-bold text-[#061B49] dark:text-white hover:text-[#0754B8] dark:hover:text-[#60A5FA] transition-colors truncate"
                        >
                          {uni.officialName || uni.name}
                        </Link>
                        {(uni.city || uni.type) && (
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-[#8FA8CF]">
                            {uni.city && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">{uni.city}</span>
                              </span>
                            )}
                            {uni.city && uni.type && <span aria-hidden="true">·</span>}
                            {uni.type && <span className="shrink-0">{uni.type}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: [Details] [Apply Now] */}
                    <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                      <Link
                        to={`/universities/${slug}`}
                        className="ekr-btn-secondary flex-1 sm:flex-none inline-flex items-center justify-center h-9 sm:h-9 min-h-[38px] px-4 rounded-lg text-xs font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8]"
                      >
                        Details
                      </Link>

                      <Link
                        to={applyPath}
                        className="ekr-glass-btn-primary flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-9 sm:h-9 min-h-[38px] px-4 rounded-lg text-xs font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8]"
                      >
                        <span>Apply Now</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 3. ALL UNIVERSITIES IN KOREA                                      */}
        {/* ================================================================= */}
        {activeOption === 'all_universities' && (
          <section className="space-y-4" aria-label="All Universities in Korea">
            {/* Filters: Search, Region, Type, Alphabetical Sort */}
            <div className="ekr-glass-panel rounded-2xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 text-slate-400 dark:text-[#8FA8CF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search university..."
                  aria-label="Search university by name"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl ekr-glass-input text-xs focus:outline-none"
                />
              </div>

              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as RegionFilter)}
                aria-label="Filter by region"
                className="px-3 py-2.5 rounded-xl ekr-glass-input text-xs font-medium focus:outline-none"
              >
                {REGION_OPTIONS.map((reg) => (
                  <option key={reg} value={reg} className="bg-white dark:bg-[#0B204A]">
                    {reg}
                  </option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                aria-label="Filter by university type"
                className="px-3 py-2.5 rounded-xl ekr-glass-input text-xs font-medium focus:outline-none"
              >
                <option value="All Types" className="bg-white dark:bg-[#0B204A]">
                  All University Types
                </option>
                <option value="National" className="bg-white dark:bg-[#0B204A]">
                  National
                </option>
                <option value="Public" className="bg-white dark:bg-[#0B204A]">
                  Public
                </option>
                <option value="Private" className="bg-white dark:bg-[#0B204A]">
                  Private
                </option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort alphabetically"
                className="px-3 py-2.5 rounded-xl ekr-glass-input text-xs font-medium focus:outline-none"
              >
                <option value="az" className="bg-white dark:bg-[#0B204A]">
                  Sort: A – Z
                </option>
                <option value="za" className="bg-white dark:bg-[#0B204A]">
                  Sort: Z – A
                </option>
              </select>
            </div>

            {filteredAllUniversities.length === 0 ? (
              <div className="ekr-glass-panel rounded-2xl p-10 text-center space-y-2">
                <p className="text-sm font-bold text-[#061B49] dark:text-white">
                  No matching universities found
                </p>
                <p className="text-xs text-slate-500 dark:text-[#8FA8CF]">
                  Try adjusting your search query, region, or institution type filter.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/80 dark:divide-white/10 ekr-glass-panel rounded-2xl overflow-hidden">
                {filteredAllUniversities.map((uni) => {
                  const logoSrc = resolveUniversityLogo(uni);
                  const slug = getUniversitySlug(uni);
                  const applyPath = `/apply/${encodeURIComponent(slug)}`;

                  return (
                    <div
                      key={uni.id}
                      className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F5F8FD]/70 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Left: Official Logo + University Name & Location */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 dark:border-white/15 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                          {logoSrc ? (
                            <img
                              src={logoSrc}
                              alt={`${uni.officialName || uni.name} logo`}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <Link
                            to={`/universities/${slug}`}
                            className="block text-sm sm:text-[15px] font-bold text-[#061B49] dark:text-white hover:text-[#0754B8] dark:hover:text-[#60A5FA] transition-colors truncate"
                          >
                            {uni.officialName || uni.name}
                          </Link>
                          {(uni.city || uni.type) && (
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-[#8FA8CF]">
                              {uni.city && (
                                <span className="inline-flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{uni.city}</span>
                                </span>
                              )}
                              {uni.city && uni.type && <span aria-hidden="true">·</span>}
                              {uni.type && <span className="shrink-0">{uni.type}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: [Details] [Apply Now] */}
                      <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                        <Link
                          to={`/universities/${slug}`}
                          className="ekr-btn-secondary flex-1 sm:flex-none inline-flex items-center justify-center h-9 sm:h-9 min-h-[38px] px-4 rounded-lg text-xs font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8]"
                        >
                          Details
                        </Link>

                        <Link
                          to={applyPath}
                          className="ekr-glass-btn-primary flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-9 sm:h-9 min-h-[38px] px-4 rounded-lg text-xs font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8]"
                        >
                          <span>Apply Now</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================================= */}
        {/* 4. APPLICATION DEADLINES                                          */}
        {/* ================================================================= */}
        {activeOption === 'deadlines' && (
          <section className="space-y-6" aria-label="Application Deadlines">
            {/* Two-Card Switcher: Running vs Upcoming */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setDeadlineTimeOption('running')}
                className={`text-left rounded-2xl p-5 transition-all cursor-pointer flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                  deadlineTimeOption === 'running'
                    ? 'ekr-glass-card-active'
                    : 'ekr-glass-card'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    deadlineTimeOption === 'running'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8FA8CF]">
                    Currently Accepting
                  </div>
                  <div className="text-sm sm:text-base font-bold text-[#061B49] dark:text-white">
                    Running Application Time
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeadlineTimeOption('upcoming')}
                className={`text-left rounded-2xl p-5 transition-all cursor-pointer flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                  deadlineTimeOption === 'upcoming'
                    ? 'ekr-glass-card-active'
                    : 'ekr-glass-card'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    deadlineTimeOption === 'upcoming'
                      ? 'bg-[#0754B8] text-white'
                      : 'bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA]'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8FA8CF]">
                    Opening Soon
                  </div>
                  <div className="text-sm sm:text-base font-bold text-[#061B49] dark:text-white">
                    Upcoming Application Time
                  </div>
                </div>
              </button>
            </div>

            {/* Four Degree-Level Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DEADLINE_DEGREE_TABS.map((deg) => (
                <button
                  key={deg.id}
                  type="button"
                  onClick={() => setSelectedDegreeTab(deg.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center ${
                    selectedDegreeTab === deg.id
                      ? 'ekr-glass-btn-primary text-white'
                      : 'ekr-glass-subtle text-[#061B49] dark:text-white hover:border-[#0754B8]/40'
                  }`}
                >
                  {deg.label}
                </button>
              ))}
            </div>

            {/* RUNNING APPLICATION TIME LIST */}
            {deadlineTimeOption === 'running' && (
              <div className="space-y-3">
                {runningDeadlinesForDegree.length === 0 ? (
                  <div className="ekr-glass-panel rounded-2xl p-8 text-center text-xs sm:text-sm text-slate-600 dark:text-[#B8C9E5]">
                    No verified open applications for{' '}
                    {DEADLINE_DEGREE_TABS.find((d) => d.id === selectedDegreeTab)?.label} at this
                    time.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {runningDeadlinesForDegree.map((item) => {
                      const applyPath = buildDeadlineApplyPath(
                        item.universitySlug,
                        item.rawRound?.degreeLevel || item.degreeTab,
                        item.rawRound?.applicationRound || item.roundDisplay,
                        item.rawRound?.intakeLabel || item.intakeDisplay
                      );
                      return (
                        <div
                          key={item.id}
                          className="ekr-glass-card rounded-2xl p-5 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              {item.universityLogoUrl && (
                                <img
                                  src={item.universityLogoUrl}
                                  alt=""
                                  className="w-9 h-9 rounded-lg bg-white border border-slate-200 p-1 object-contain shrink-0"
                                />
                              )}
                              <h3 className="text-base font-bold text-[#061B49] dark:text-white">
                                {item.universityName}
                              </h3>
                            </div>

                            <div className="text-xs sm:text-sm font-semibold text-[#061B49] dark:text-white">
                              {item.degreeDisplay} — {item.roundDisplay}
                            </div>

                            <div className="text-xs text-slate-600 dark:text-[#B8C9E5] font-mono tabular-nums">
                              Deadline: {item.applicationDeadline}
                            </div>

                            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              Status: Open
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-end gap-2.5">
                            <Link
                              to={`/universities/${item.universitySlug}?tab=deadlines`}
                              className="ekr-btn-secondary inline-flex items-center justify-center h-9 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                            >
                              Details
                            </Link>
                            <Link
                              to={applyPath}
                              className="ekr-glass-btn-primary inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold whitespace-nowrap"
                            >
                              <span>Apply Now</span>
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* UPCOMING APPLICATION TIME LIST */}
            {deadlineTimeOption === 'upcoming' && (
              <div className="space-y-3">
                {upcomingDeadlinesForDegree.length === 0 ? (
                  <div className="ekr-glass-panel rounded-2xl p-8 text-center text-xs sm:text-sm text-slate-600 dark:text-[#B8C9E5]">
                    No verified upcoming applications for{' '}
                    {DEADLINE_DEGREE_TABS.find((d) => d.id === selectedDegreeTab)?.label} at this
                    time.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {upcomingDeadlinesForDegree.map((item) => {
                      const applyPath = buildDeadlineApplyPath(
                        item.universitySlug,
                        item.rawRound?.degreeLevel || item.degreeTab,
                        item.rawRound?.applicationRound || item.roundDisplay,
                        item.rawRound?.intakeLabel || item.intakeDisplay
                      );
                      return (
                        <div
                          key={item.id}
                          className="ekr-glass-card rounded-2xl p-5 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              {item.universityLogoUrl && (
                                <img
                                  src={item.universityLogoUrl}
                                  alt=""
                                  className="w-9 h-9 rounded-lg bg-white border border-slate-200 p-1 object-contain shrink-0"
                                />
                              )}
                              <h3 className="text-base font-bold text-[#061B49] dark:text-white">
                                {item.universityName}
                              </h3>
                            </div>

                            <div className="text-xs sm:text-sm font-semibold text-[#061B49] dark:text-white">
                              {item.degreeDisplay} — {item.roundDisplay}
                            </div>

                            <div className="text-xs text-slate-600 dark:text-[#B8C9E5] font-mono tabular-nums">
                              Opens: {item.applicationStartDate}
                            </div>

                            <div className="text-xs text-slate-600 dark:text-[#B8C9E5] font-mono tabular-nums">
                              Deadline: {item.applicationDeadline}
                            </div>

                            <div className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA]">
                              Status: Upcoming
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-end gap-2.5">
                            <Link
                              to={`/universities/${item.universitySlug}?tab=deadlines`}
                              className="ekr-btn-secondary inline-flex items-center justify-center h-9 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                            >
                              Details
                            </Link>
                            <Link
                              to={applyPath}
                              className="ekr-glass-btn-primary inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold whitespace-nowrap"
                            >
                              <span>Apply Now</span>
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
