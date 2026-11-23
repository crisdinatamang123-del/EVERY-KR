import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getUniversitySlug } from '../utils/seoRoutes';
import { getScholarshipRowFiveTierStatus } from '../utils/fiveTierVerification';
import { VerificationStatusInline } from './universities/VerificationStatusInline';
import {
  Award,
  Search,
  GraduationCap,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
  BookOpen,
  DollarSign,
  Globe
} from 'lucide-react';

interface ScholarshipProgram {
  id: string;
  title: string;
  koreanTitle: string;
  sponsor: string;
  category: 'Government (GKS)' | 'University Merit' | 'STEM & Research' | 'TOPIK Excellence';
  degreeLevels: string[];
  coverage: string;
  monthlyStipendKRW: string;
  topikRequirement: string;
  applicationWindow: string;
  officialUrl: string;
  summary: string;
}

const NATIONAL_SCHOLARSHIPS: ScholarshipProgram[] = [
  {
    id: 'gks-embassy',
    title: 'Global Korea Scholarship (GKS) – Embassy Track',
    koreanTitle: '정부초청외국인장학생 공관전형',
    sponsor: 'NIIED · Ministry of Education',
    category: 'Government (GKS)',
    degreeLevels: ["Bachelor's", "Master's", 'Doctoral'],
    coverage: '100% Tuition + Round-trip Airfare + 1-Year Korean Language Training + NHIS Insurance',
    monthlyStipendKRW: '₩1,000,000 – ₩1,500,000 / month',
    topikRequirement: 'Optional at application (1-year D-4 language year included); TOPIK 3+ required for degree entry',
    applicationWindow: 'February (Graduate) / September (Undergraduate)',
    officialUrl: 'https://www.studyinkorea.go.kr',
    summary:
      'Apply through the Korean Embassy in your home country to nominate up to 3 Korean universities across Type A and Type B institutions.'
  },
  {
    id: 'gks-university',
    title: 'Global Korea Scholarship (GKS) – University Track',
    koreanTitle: '정부초청외국인장학생 대학전형',
    sponsor: 'NIIED & 70+ Designated Korean Universities',
    category: 'Government (GKS)',
    degreeLevels: ["Associate's", "Bachelor's", "Master's", 'Doctoral'],
    coverage: '100% Tuition + Airfare + Settlement Allowance + Language Year',
    monthlyStipendKRW: '₩1,000,000 – ₩1,500,000 / month',
    topikRequirement: 'TOPIK Level 4+ receives additional ₩100,000 monthly grant',
    applicationWindow: 'February – March (Graduate) / September – October (Undergraduate)',
    officialUrl: 'https://www.studyinkorea.go.kr',
    summary:
      'Apply directly to one designated Korean university. Ideal for STEM, Regional University (R-GKS), and Research & Development applicants.'
  },
  {
    id: 'bk21-four',
    title: 'Brain Korea 21 (BK21 FOUR) Graduate Fellowship',
    koreanTitle: '4단계 두뇌한국21 혁신인재양성사업',
    sponsor: 'National Research Foundation of Korea (NRF)',
    category: 'STEM & Research',
    degreeLevels: ["Master's", 'Doctoral'],
    coverage: 'Research Lab Stipend + Conference Travel + Tuition Support via Advisor',
    monthlyStipendKRW: '₩1,000,000 (MS) – ₩1,600,000+ (PhD) / month',
    topikRequirement: 'English Track Accepted (IELTS 6.0+ / TOEFL 80+)',
    applicationWindow: 'Spring (October) & Fall (April) with Lab Professor Confirmation',
    officialUrl: 'https://bk21four.nrf.re.kr',
    summary:
      'Supports international graduate researchers working in AI, Semiconductors, Bio-health, Future Energy, and Social Innovation labs.'
  },
  {
    id: 'kaist-unist-gist-full',
    title: 'National Science & Tech Institutes Full Scholarship (KAIST / UNIST / GIST / DGIST)',
    koreanTitle: '과학기술원 외국인 전액장학금',
    sponsor: 'Ministry of Science and ICT',
    category: 'STEM & Research',
    degreeLevels: ["Bachelor's", "Master's", 'Doctoral'],
    coverage: '100% Full Tuition Waiver for 8 Semesters + Dormitory Support',
    monthlyStipendKRW: '₩350,000 (BS) – ₩900,000+ (Grad) / month',
    topikRequirement: '100% English-Taught (No TOPIK required)',
    applicationWindow: 'Early / Regular / Late Intakes (September – March)',
    officialUrl: 'https://admission.kaist.ac.kr',
    summary:
      'Every admitted international student at Korea’s four national science and technology institutes automatically receives full tuition exemption.'
  },
  {
    id: 'topik-merit-waiver',
    title: 'International Freshman TOPIK Academic Merit Waiver',
    koreanTitle: '외국인 신입생 TOPIK 성적우수 장학금',
    sponsor: 'Participating National & Private Korean Universities',
    category: 'TOPIK Excellence',
    degreeLevels: ["Bachelor's", "Master's"],
    coverage: '30% to 100% First-Semester Tuition Reduction',
    monthlyStipendKRW: 'Varies by TOPIK Level (Level 3: 30%, Level 4: 50%, Level 5: 70%, Level 6: 100%)',
    topikRequirement: 'TOPIK Level 3 to Level 6 (or IELTS 6.5+ for English tracks)',
    applicationWindow: 'Evaluated automatically at admission submission',
    officialUrl: 'https://www.topik.go.kr',
    summary:
      'Most Korean universities automatically deduct 30%–100% of first-semester tuition based on your official TOPIK or English score.'
  },
  {
    id: 'posco-asia-fellowship',
    title: 'POSCO TJ Park Foundation Asia Fellowship',
    koreanTitle: '포스코청암재단 아시아펠로십',
    sponsor: 'POSCO TJ Park Foundation',
    category: 'University Merit',
    degreeLevels: ["Master's", 'Doctoral'],
    coverage: 'Full Tuition for 4 Semesters + Monthly Living Grant + NHIS Health Insurance',
    monthlyStipendKRW: '₩1,000,000 / month',
    topikRequirement: 'English or Korean proficiency required by host university',
    applicationWindow: 'May (for Spring/Fall admission cohorts)',
    officialUrl: 'https://www.postf.org',
    summary:
      'Prestigious fellowship for promising scholars from Asian countries pursuing STEM and graduate degrees at top Korean partner universities.'
  }
];

export const ScholarshipsModule: React.FC = () => {
  const { approvedUniversitiesList } = useApp();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const cat = searchParams.get('category')?.toLowerCase();
    if (cat === 'gks') return 'Government (GKS)';
    if (cat === 'merit') return 'University Merit';
    return 'All';
  });
  const [selectedDegree, setSelectedDegree] = useState<string>('All');

  useEffect(() => {
    const cat = searchParams.get('category')?.toLowerCase();
    if (cat === 'gks') setSelectedCategory('Government (GKS)');
    else if (cat === 'merit') setSelectedCategory('University Merit');
    else if (!cat) setSelectedCategory('All');
  }, [searchParams]);

  const filteredPrograms = useMemo(() => {
    return NATIONAL_SCHOLARSHIPS.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.koreanTitle.includes(q) ||
        item.sponsor.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesDegree = selectedDegree === 'All' || item.degreeLevels.includes(selectedDegree);
      return matchesSearch && matchesCat && matchesDegree;
    });
  }, [searchQuery, selectedCategory, selectedDegree]);

  const universityScholarships = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return approvedUniversitiesList
      .filter(u => {
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          u.koreanName.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q) ||
          Boolean(u.scholarships?.some(s => s.toLowerCase().includes(q)))
        );
      })
      .slice(0, 12);
  }, [approvedUniversitiesList, searchQuery]);

  return (
    <section className="py-10 sm:py-14 bg-transparent min-h-[80vh] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5]">
          <Link to="/" className="hover:text-[#0754B8] dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold text-[#0754B8] dark:text-[#60A5FA]">
            Scholarships &amp; GKS Financial Aid
          </span>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2">
              <span className="w-4 h-0.5 rounded-full bg-[#FFB800]" aria-hidden="true" />
              <span className="text-[11px] font-extrabold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-[0.2em]">
                Verified Financial Aid &amp; Fellowships
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#061B49] dark:text-white tracking-tight">
              South Korea Scholarships &amp; GKS Guide
            </h1>
            <p className="text-sm text-[#4B607F] dark:text-[#B8C9E5] max-w-2xl leading-relaxed">
              Explore full-tuition Global Korea Scholarships (GKS), Brain Korea 21 STEM fellowships, and automatic TOPIK merit waivers across 25 approved Korean partner universities.
            </p>
          </div>
          <Link
            to="/universities"
            className="ekr-glass-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all shrink-0 self-start md:self-auto"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Compare 25 Universities</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="ekr-glass-panel p-5 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search GKS, BK21, KAIST, TOPIK waiver, or university name..."
                className="ekr-glass-input w-full pl-10 pr-4 py-2.5 text-xs rounded-xl"
              />
            </div>
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="ekr-glass-input w-full px-3 py-2.5 text-xs rounded-xl"
              >
                <option className="bg-white dark:bg-[#0B204A]" value="All">All Scholarship Types</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Government (GKS)">Government (GKS)</option>
                <option className="bg-white dark:bg-[#0B204A]" value="STEM & Research">STEM &amp; Research</option>
                <option className="bg-white dark:bg-[#0B204A]" value="TOPIK Excellence">TOPIK Excellence</option>
                <option className="bg-white dark:bg-[#0B204A]" value="University Merit">University Merit</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <select
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                className="ekr-glass-input w-full px-3 py-2.5 text-xs rounded-xl"
              >
                <option className="bg-white dark:bg-[#0B204A]" value="All">All Degree Levels</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Bachelor's">Bachelor&apos;s Degree</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Master's">Master&apos;s Degree</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Doctoral">Doctoral (PhD)</option>
              </select>
            </div>
          </div>
        </div>

        {/* National & Foundation Scholarships Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#10213D] dark:text-white">
            01. National Government &amp; Foundation Scholarships ({filteredPrograms.length})
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredPrograms.map((sch) => (
              <div
                key={sch.id}
                className="ekr-glass-card rounded-2xl p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-[#0754B8] dark:text-[#60A5FA] font-semibold flex-wrap">
                      <span>{sch.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{sch.sponsor}</span>
                      <span aria-hidden="true">·</span>
                      <span>{sch.degreeLevels.join(' / ')}</span>
                    </div>
                    <VerificationStatusInline
                      status="Officially verified"
                      lastCheckedDate="2026-11-12"
                      compact
                    />
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#10213D] dark:text-white leading-snug">
                      {sch.title}
                    </h3>
                    <div className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                      {sch.koreanTitle}
                    </div>
                  </div>

                  <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                    {sch.summary}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl ekr-glass-subtle">
                      <div className="text-[#526685] dark:text-[#B8C9E5] flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Monthly Living Stipend</span>
                      </div>
                      <div className="font-bold text-[#10213D] dark:text-white font-mono tabular-nums mt-0.5">
                        {sch.monthlyStipendKRW}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl ekr-glass-subtle">
                      <div className="text-[#526685] dark:text-[#B8C9E5] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                        <span>Application Window</span>
                      </div>
                      <div className="font-bold text-[#10213D] dark:text-white mt-0.5">
                        {sch.applicationWindow}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-[#526685] dark:text-[#B8C9E5] space-y-1 pt-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong className="text-[#10213D] dark:text-white">Coverage:</strong> {sch.coverage}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
                      <span><strong className="text-[#10213D] dark:text-white">Language Benchmark:</strong> {sch.topikRequirement}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3 text-xs">
                  <Link
                    to="/visa"
                    className="font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#0754B8] dark:hover:text-white"
                  >
                    D-2 Visa Document Checklist →
                  </Link>
                  <a
                    href={sch.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ekr-glass-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* University-Specific Scholarships Directory */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#10213D] dark:text-white">
                02. University-Specific International Scholarships
              </h2>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                Click any university below to open its dedicated <span className="font-mono">/universities/:slug</span> profile and tuition table.
              </p>
            </div>
            <Link
              to="/universities"
              className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline"
            >
              Browse all {approvedUniversitiesList.length} priority universities →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {universityScholarships.map((uni) => {
              const slug = getUniversitySlug(uni);
              const schRows = uni.relationalBundle?.scholarships || [];
              const schTier =
                schRows.length > 0
                  ? schRows.some((s) => getScholarshipRowFiveTierStatus(s) === 'Officially verified')
                    ? 'Officially verified'
                    : 'Available, not independently verified'
                  : uni.scholarshipVerified
                  ? 'Officially verified'
                  : 'Not announced';
              return (
                <Link
                  key={uni.id}
                  to={`/universities/${slug}`}
                  className="ekr-glass-card rounded-2xl p-5 flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-[#526685] dark:text-[#B8C9E5]">
                      <span className="tabular-nums">
                        {uni.type} · {uni.city} · Priority #{uni.whitelistOrder}
                      </span>
                      <VerificationStatusInline status={schTier} compact />
                    </div>
                    <h3 className="text-sm font-bold text-[#10213D] dark:text-white group-hover:text-[#0754B8] dark:group-hover:text-[#60A5FA] mt-1">
                      {uni.name}
                    </h3>
                    <ul className="mt-3 space-y-1.5 text-xs text-[#526685] dark:text-[#B8C9E5]">
                      {(uni.scholarships && uni.scholarships.length > 0
                        ? uni.scholarships.slice(0, 3)
                        : ['Official scholarship information has not yet been verified.']
                      ).map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA]">
                    <span>View Tuition &amp; Apply</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
