import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getUniversitySlug } from '../utils/seoRoutes';
import { RELATIONAL_BUNDLES_25, ProgramCategoryCode, FiveTierVerificationStatus } from '../data/universities25';
import { isApprovedPriorityUniversity } from '../data/universitiesMaster';
import {
  getUniversityTuitionFiveTierStatus,
  getDeadlineRoundFiveTierStatus,
  getUniversityDeadlinesFiveTierStatus,
  mapRelationalStatusToFiveTier,
} from '../utils/fiveTierVerification';
import { VerificationStatusInline } from './universities/VerificationStatusInline';
import {
  Search,
  BookOpen,
  GraduationCap,
  Calendar,
  Compass,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  MapPin,
  Globe,
  FileText,
  ShieldCheck,
  Building2,
  Mail,
  ExternalLink,
} from 'lucide-react';

const PROGRAM_CATEGORY_FILTERS: { id: 'All' | ProgramCategoryCode; label: string }[] = [
  { id: 'All', label: 'All Tracks' },
  { id: 'KLP', label: 'Korean Language (D-4)' },
  { id: 'EAP', label: 'English Track (EAP)' },
  { id: 'Associate', label: 'Associate' },
  { id: 'Bachelor', label: "Bachelor's" },
  { id: 'Master', label: "Master's" },
  { id: 'PhD', label: 'Doctoral (PhD)' },
];

export const ProgramsPage: React.FC = () => {
  const { universitiesList, t } = useApp();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ProgramCategoryCode>('All');
  const [englishOnly, setEnglishOnly] = useState<boolean>(false);

  useEffect(() => {
    const deg = searchParams.get('degree');
    if (deg === 'Bachelor') setCategoryFilter('Bachelor');
    else if (deg === 'Graduate') setCategoryFilter('Master');
    else if (deg === 'Language') setCategoryFilter('KLP');
    else if (!deg) setCategoryFilter('All');
  }, [searchParams]);

  const flattenedPrograms = useMemo(() => {
    const items: {
      id: string;
      programName: string;
      collegeOrFaculty: string;
      categoryCode: ProgramCategoryCode;
      degreeLevel: string;
      mediumOfInstruction: string;
      campusName: string;
      universityName: string;
      koreanName: string;
      city: string;
      slug: string;
      tuitionDisplay: string;
      tuitionTier: FiveTierVerificationStatus;
      programTier: FiveTierVerificationStatus;
    }[] = [];

    for (const uni of universitiesList) {
      const bundle =
        uni.relationalBundle || RELATIONAL_BUNDLES_25.find((b) => b.university.id === uni.id);
      if (!bundle) continue;
      const slug = getUniversitySlug(uni);
      const tuitionTier = getUniversityTuitionFiveTierStatus(uni);
      const tuitionDisplay =
        typeof uni.tuitionPerSemesterKRW?.min === 'number' &&
        typeof uni.tuitionPerSemesterKRW?.max === 'number'
          ? `₩${uni.tuitionPerSemesterKRW.min.toLocaleString()} – ₩${uni.tuitionPerSemesterKRW.max.toLocaleString()} / sem`
          : 'Not announced';

      for (const prog of bundle.programs) {
        const programTier: FiveTierVerificationStatus =
          prog.internationalAdmissionAvailable === 'Yes'
            ? mapRelationalStatusToFiveTier(prog.verificationStatus)
            : 'Available, not independently verified';
        items.push({
          id: prog.id,
          programName: prog.programNameEn,
          collegeOrFaculty: prog.collegeOrFaculty,
          categoryCode: prog.categoryCode,
          degreeLevel: prog.degreeLevel,
          mediumOfInstruction: prog.languageOfInstruction,
          campusName: prog.campusName,
          universityName: uni.officialName || uni.name,
          koreanName: uni.koreanName,
          city: uni.city,
          slug,
          tuitionDisplay,
          tuitionTier,
          programTier,
        });
      }
    }
    return items;
  }, [universitiesList]);

  const filteredPrograms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flattenedPrograms.filter((item) => {
      if (englishOnly && !item.mediumOfInstruction.toLowerCase().includes('english')) {
        return false;
      }
      if (categoryFilter !== 'All' && item.categoryCode !== categoryFilter) {
        return false;
      }
      if (q) {
        return (
          item.programName.toLowerCase().includes(q) ||
          item.collegeOrFaculty.toLowerCase().includes(q) ||
          item.universityName.toLowerCase().includes(q) ||
          item.koreanName.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [flattenedPrograms, query, categoryFilter, englishOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* Header */}
      <div className="ekr-glass-panel rounded-3xl p-6 sm:p-10">
        <div className="max-w-3xl space-y-2.5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
            <span className="w-5 h-0.5 bg-[#FFB800] rounded-full" aria-hidden="true" />
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('nav_programs')} · 25 Approved Korean Universities</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#061B49] dark:text-white tracking-tight">
            Academic Programs, English Tracks &amp; Language Institutes
          </h1>
          <p className="text-xs sm:text-base text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
            Explore {flattenedPrograms.length} structured academic tracks across Korean Language Programs (D-4), English-Taught Programs (EAP), Associate, Bachelor&apos;s, Master&apos;s, and Doctoral degrees at our 25 approved partner universities.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search major, faculty, university name, or city..."
                className="ekr-glass-input w-full ps-10 pe-4 py-2.5 text-sm rounded-xl"
              />
            </div>
            <button
              type="button"
              onClick={() => setEnglishOnly((prev) => !prev)}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                englishOnly
                  ? 'ekr-glass-btn-primary text-white border-transparent'
                  : 'ekr-btn-secondary'
              }`}
            >
              English-Taught Tracks Only
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PROGRAM_CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'ekr-glass-btn-primary text-white'
                    : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5] hover:text-[#061B49] dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-[#526685] dark:text-[#B8C9E5] px-1">
        <span>Showing {Math.min(60, filteredPrograms.length)} of {filteredPrograms.length} matching academic tracks</span>
        <Link to="/universities" className="font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline">
          Compare all 25 universities →
        </Link>
      </div>

      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPrograms.slice(0, 60).map((item) => (
          <Link
            key={item.id}
            to={`/universities/${item.slug}`}
            className="group ekr-glass-card rounded-2xl p-5 hover:-translate-y-0.5 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-[11px] text-[#526685] dark:text-[#B8C9E5] mb-2">
                <span className="font-bold text-[#0754B8] dark:text-[#FFB800]">{item.categoryCode}</span>
                <span aria-hidden="true">·</span>
                <span>{item.mediumOfInstruction}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{item.city}</span>
                </span>
              </div>

              <h3 className="text-base font-extrabold text-[#061B49] dark:text-white group-hover:text-[#0754B8] dark:group-hover:text-[#60A5FA] transition-colors">
                {item.programName}
              </h3>

              <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                {item.collegeOrFaculty} · {item.campusName}
              </p>

              <p
                data-no-translate="true"
                className="text-xs font-bold text-[#061B49]/90 dark:text-slate-200 mt-2.5"
              >
                {item.universityName} ({item.koreanName})
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="text-[#061B49] dark:text-slate-100 font-mono tabular-nums text-[11px] font-bold">
                  {item.tuitionDisplay}
                </div>
                <div className="text-[10px] text-[#526685] dark:text-[#B8C9E5]">
                  Tuition: {item.tuitionTier} · Track: {item.programTier}
                </div>
              </div>
              <span className="font-bold text-[#0754B8] dark:text-[#60A5FA] inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span>View Profile</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export const AdmissionDeadlinesPage: React.FC = () => {
  const { universitiesList } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'announced' | 'open' | 'not_announced'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('All');

  const enrichedList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return universitiesList
      .filter((uni) => isApprovedPriorityUniversity(uni))
      .map((uni) => {
        const bundle =
          uni.relationalBundle || RELATIONAL_BUNDLES_25.find((b) => b.university.id === uni.id);
        const rounds = (bundle?.admissionDeadlines || []).filter((r) => {
          if (levelFilter === 'All') return true;
          return r.degreeLevel.toLowerCase().includes(levelFilter.toLowerCase());
        });
        const hasAnnounced = rounds.some((r) => r.roundActiveStatus !== 'Not Announced');
        const hasOpen = rounds.some((r) => r.roundActiveStatus === 'Open / Upcoming');
        return { uni, bundle, rounds, hasAnnounced, hasOpen };
      })
      .filter((entry) => {
        if (statusFilter === 'announced' && !entry.hasAnnounced) return false;
        if (statusFilter === 'open' && !entry.hasOpen) return false;
        if (statusFilter === 'not_announced' && entry.hasAnnounced) return false;
        if (levelFilter !== 'All' && entry.rounds.length === 0) return false;
        if (!q) return true;
        return (
          entry.uni.name.toLowerCase().includes(q) ||
          entry.uni.koreanName.toLowerCase().includes(q) ||
          entry.uni.city.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.uni.whitelistOrder || 99) - (b.uni.whitelistOrder || 99));
  }, [universitiesList, search, statusFilter, levelFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="ekr-glass-panel rounded-3xl p-6 sm:p-10 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-3xl space-y-2.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
              <span className="w-5 h-0.5 bg-[#FFB800] rounded-full" aria-hidden="true" />
              <Calendar className="w-3.5 h-3.5" />
              <span>Spring 2027 International Intake · Strict Year Separation (2027 vs 2026)</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#061B49] dark:text-white tracking-tight">
              March 2027 Intake Admission Deadlines (25 Universities)
            </h1>
            <p className="text-xs sm:text-base text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
              Multi-round application windows, Bangladesh local cutoff times, DHL courier deadlines, interview dates, and result announcements extracted verbatim from the March 2027 recruitment schedule and official OIA portals. Universities without published March 2027 sheets are explicitly marked <strong>Not Announced</strong>.
            </p>
          </div>

          <a
            href="/assets/aistudio/All_UNI_DEADLINE_-_Google_Sheets_0b275056.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="ekr-glass-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 self-start lg:self-auto whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Open Official March 2027 Sheet (PDF)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by university English/Korean name or city..."
              className="ekr-glass-input w-full ps-10 pe-4 py-2.5 text-sm rounded-xl"
            />
          </div>

          <div className="lg:col-span-4 flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All 25' },
              { id: 'announced', label: 'March 2027 Announced' },
              { id: 'open', label: 'Open / Upcoming' },
              { id: 'not_announced', label: 'Not Announced' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? 'ekr-glass-btn-primary text-white'
                    : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5] hover:text-[#061B49] dark:hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="ekr-glass-input w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl"
            >
              <option value="All" className="bg-white dark:bg-[#0B204A]">All Degree Tracks</option>
              <option value="Bachelor" className="bg-white dark:bg-[#0B204A]">Bachelor / Undergraduate</option>
              <option value="Master" className="bg-white dark:bg-[#0B204A]">Masters / Graduate</option>
              <option value="EAP" className="bg-white dark:bg-[#0B204A]">English Track (EAP)</option>
              <option value="Associate" className="bg-white dark:bg-[#0B204A]">Associate Degree</option>
              <option value="KLP" className="bg-white dark:bg-[#0B204A]">Language (KLP)</option>
            </select>
          </div>
        </div>
      </div>

      {/* University Multi-Round Cards */}
      <div className="space-y-5">
        {enrichedList.map(({ uni, rounds, hasAnnounced }) => {
          const slug = getUniversitySlug(uni);
          return (
            <div
              key={uni.id}
              className="ekr-glass-card rounded-2xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-[#B87C00] dark:text-[#FFB800] tabular-nums">
                    #{String(uni.whitelistOrder || 0).padStart(2, '0')}
                  </span>
                  <div>
                    <h2
                      data-no-translate="true"
                      className="text-base sm:text-lg font-extrabold text-[#061B49] dark:text-white"
                    >
                      {uni.officialName || uni.name}
                    </h2>
                    <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                      <span data-no-translate="true">{uni.koreanName}</span> · {uni.city}, {uni.province || uni.region}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs flex-wrap">
                  <VerificationStatusInline
                    status={getUniversityDeadlinesFiveTierStatus(rounds)}
                    lastCheckedDate="2026-11-12"
                  />
                  <span className="text-[#526685] dark:text-[#B8C9E5] font-mono tabular-nums">
                    {hasAnnounced ? `${rounds.length} Row(s)` : '0 Rows'}
                  </span>
                  <Link
                    to={`/universities/${slug}`}
                    className="font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>Full University Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {!hasAnnounced ? (
                <div className="p-4 rounded-xl ekr-glass-subtle text-xs text-[#526685] dark:text-[#B8C9E5] flex items-center justify-between flex-wrap gap-2">
                  <span>
                    <strong>Verification Status: Not announced</strong> — Official March 2027 (Spring 2027) international recruitment dates have not yet been published in the master schedule. Check the university OIA portal directly.
                  </span>
                  {uni.internationalOfficeUrl && (
                    <a
                      href={uni.internationalOfficeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>Official OIA Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#DCE5F0]/14">
                      <tr>
                        <th className="p-3 font-semibold">Intake &amp; Track</th>
                        <th className="p-3 font-semibold">Round</th>
                        <th className="p-3 font-semibold">Online Application &amp; BD Cutoff</th>
                        <th className="p-3 font-semibold">DHL (Uni / BD Office)</th>
                        <th className="p-3 font-semibold">Interview</th>
                        <th className="p-3 font-semibold">Result</th>
                        <th className="p-3 font-semibold">Round Status</th>
                        <th className="p-3 font-semibold">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rounds.map((r) => {
                        const isClosed = r.roundActiveStatus === 'Closed in Sheet (Strikethrough)';
                        const rowTier = getDeadlineRoundFiveTierStatus(r);
                        return (
                          <tr key={r.id} className={isClosed ? 'opacity-75 bg-slate-50/60 dark:bg-slate-900/30' : ''}>
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                              <div>{r.intakeSemester} {r.intakeYear}</div>
                              <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{r.degreeLevel}</div>
                            </td>
                            <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {r.applicationRound}
                              {r.isApproximate && (
                                <span className="block text-[10px] text-sky-700 dark:text-sky-300 font-sans">
                                  (Approx.)
                                </span>
                              )}
                            </td>
                            <td className={`p-3 text-slate-700 dark:text-slate-200 tabular-nums ${isClosed ? 'line-through' : ''}`}>
                              <div>{r.onlineApplicationRaw || 'Not Announced'}</div>
                              {r.bangladeshTimeDeadline && r.bangladeshTimeDeadline !== 'Not Announced' && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  BD Cutoff: {r.bangladeshTimeDeadline}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 tabular-nums">
                              <div>Uni: {r.dhlDeadlineUniversity || '—'}</div>
                              {r.dhlDeadlineBangladeshOffice && (
                                <div className="text-[11px] text-slate-500">BD: {r.dhlDeadlineBangladeshOffice}</div>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 tabular-nums">{r.interviewDate || '—'}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 tabular-nums">{r.admissionResultDate || '—'}</td>
                            <td className="p-3">
                              <div
                                className={`font-semibold ${
                                  r.roundActiveStatus === 'Open / Upcoming'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : r.roundActiveStatus === 'Closed in Sheet (Strikethrough)'
                                    ? 'text-rose-700 dark:text-rose-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {r.roundActiveStatus}
                              </div>
                              {r.flaggedForManualVerification && r.manualVerificationNote && (
                                <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5 flex items-start gap-1 max-w-[220px]">
                                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                  <span>{r.manualVerificationNote}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <VerificationStatusInline status={rowTier} compact />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ApplicationGuidePage: React.FC = () => {
  const { t } = useApp();

  const steps = [
    {
      step: '01',
      title: 'Choose from the 25 Approved Partner Universities',
      desc: 'Compare up to 3 approved Korean universities and confirm whether your major is taught in English (EAP), Korean, or via D-4 Korean Language entry.',
    },
    {
      step: '02',
      title: 'Prepare Language & Academic Credentials',
      desc: 'Prepare TOPIK (Level 2–4+ depending on major) or IELTS / TOEFL iBT (for English tracks) along with official academic transcripts and diplomas.',
    },
    {
      step: '03',
      title: 'Apostille or Korean Embassy Legalization',
      desc: 'All foreign graduation certificates, transcripts, and family relationship documents must be Apostilled or legalized by the Korean Embassy.',
    },
    {
      step: '04',
      title: 'Submit Online Application & DHL Physical Documents',
      desc: 'Complete the online application before the Bangladesh local cutoff time and dispatch physical documents before the DHL BD Office / University deadline.',
    },
    {
      step: '05',
      title: 'Interview, Result, Tuition & Certificate of Admission (COA)',
      desc: 'Complete the university interview, pay the first-semester tuition invoice upon acceptance, and receive your official Certificate of Admission (표준입학허가서).',
    },
    {
      step: '06',
      title: 'Apply for D-2 / D-4 Student Visa & Register ARC',
      desc: 'Submit your COA, TB certificate (where required), and bank solvency proof for your student visa, then register for your ARC within 90 days of arrival.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="ekr-glass-panel rounded-3xl p-6 sm:p-10 space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
          <span className="w-5 h-0.5 bg-[#FFB800] rounded-full" aria-hidden="true" />
          <Compass className="w-3.5 h-3.5" />
          <span>{t('nav_application_guide')}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#061B49] dark:text-white tracking-tight">
          {t('shortcut_4_title')}
        </h1>
        <p className="text-xs sm:text-base text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
          {t('shortcut_4_desc')} — {t('why_2_desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {steps.map((item) => (
          <div
            key={item.step}
            className="ekr-glass-card rounded-2xl p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#0754B8] dark:text-[#FFB800] tabular-nums">
                {item.step}. Step
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
            </div>
            <h3 className="text-base font-extrabold text-[#061B49] dark:text-white">{item.title}</h3>
            <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="ekr-glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-[#061B49] dark:text-white">
            {t('shortcut_1_title')} &amp; {t('nav_scholarships')}
          </h3>
          <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1">{t('why_1_desc')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/universities"
            className="ekr-glass-btn-primary px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap"
          >
            {t('shortcut_1_title')}
          </Link>
          <Link
            to="/deadlines"
            className="ekr-btn-secondary px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap"
          >
            March 2027 Deadlines
          </Link>
        </div>
      </div>
    </div>
  );
};

export const AboutEveryKRPage: React.FC = () => {
  const { t } = useApp();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="ekr-glass-panel rounded-3xl p-6 sm:p-10 space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
          <span className="w-5 h-0.5 bg-[#FFB800] rounded-full" aria-hidden="true" />
          <Building2 className="w-3.5 h-3.5" />
          <span>{t('nav_about')}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#061B49] dark:text-white tracking-tight">
          <span aria-hidden="true" className="mr-1.5">🇰🇷</span>{t('hero_headline')}
        </h1>
        <p className="text-sm sm:text-base text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
          {t('footer_desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="ekr-glass-card rounded-2xl p-6 space-y-2.5">
          <GraduationCap className="w-6 h-6 text-[#0754B8] dark:text-[#60A5FA]" />
          <h3 className="text-base font-extrabold text-[#061B49] dark:text-white">{t('why_1_title')}</h3>
          <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">{t('why_1_desc')}</p>
        </div>
        <div className="ekr-glass-card rounded-2xl p-6 space-y-2.5">
          <ShieldCheck className="w-6 h-6 text-[#0754B8] dark:text-[#60A5FA]" />
          <h3 className="text-base font-extrabold text-[#061B49] dark:text-white">{t('why_2_title')}</h3>
          <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">{t('why_2_desc')}</p>
        </div>
        <div className="ekr-glass-card rounded-2xl p-6 space-y-2.5">
          <Globe className="w-6 h-6 text-[#0754B8] dark:text-[#60A5FA]" />
          <h3 className="text-base font-extrabold text-[#061B49] dark:text-white">{t('why_3_title')}</h3>
          <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">{t('why_3_desc')}</p>
        </div>
        <div className="ekr-glass-card rounded-2xl p-6 space-y-2.5">
          <FileText className="w-6 h-6 text-[#FFB800]" />
          <h3 className="text-base font-extrabold text-[#061B49] dark:text-white">{t('why_4_title')}</h3>
          <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">{t('why_4_desc')}</p>
        </div>
      </div>

      <div className="ekr-glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-[#0754B8] dark:text-[#60A5FA]" />
          <div>
            <h3 className="text-sm font-extrabold text-[#061B49] dark:text-white">{t('nav_contact')}</h3>
            <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">newsletter@everykr.com</p>
          </div>
        </div>
        <Link
          to="/contact"
          className="ekr-glass-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap"
        >
          {t('nav_contact')}
        </Link>
      </div>
    </div>
  );
};
