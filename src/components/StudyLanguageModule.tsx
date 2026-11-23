import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { playKoreanAudio } from '../services/koreanAcademyService';
import {
  BookOpen,
  Award,
  Volume2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Calendar,
  Compass,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const StudyLanguageModule: React.FC = () => {
  const { showToast } = useApp();
  const [activePhraseCategory, setActivePhraseCategory] = useState<
    'immigration' | 'bank' | 'medical' | 'campus'
  >('immigration');

  const studyPathways = [
    {
      num: '01',
      title: 'Degree & Language Programs',
      subtitle: 'Explore KLP (D-4), English-track (EAP), Associate, Bachelor’s, Master’s & PhD majors',
      to: '/programs',
      icon: GraduationCap,
    },
    {
      num: '02',
      title: 'GKS & University Scholarships',
      subtitle: 'Global Korea Scholarship (Embassy & University tracks), BK21 & TOPIK tuition waivers',
      to: '/scholarships',
      icon: Award,
    },
    {
      num: '03',
      title: 'March 2027 Admission Deadlines',
      subtitle: 'Multi-round online cutoffs, DHL document dates, interviews & result schedules',
      to: '/deadlines',
      icon: Calendar,
    },
    {
      num: '04',
      title: '6-Step Application Roadmap',
      subtitle: 'Apostille legalization, study plan preparation, interview readiness & COA issuance',
      to: '/application-guide',
      icon: Compass,
    },
    {
      num: '05',
      title: 'D-2 & D-4 Student Visa Guide',
      subtitle: 'Bank solvency requirements, TB screening, embassy filing & 90-day ARC registration',
      to: '/visa',
      icon: ShieldCheck,
    },
    {
      num: '06',
      title: 'Interactive Learn Hangul Studio',
      subtitle: 'Master Korean consonants, vowels, pronunciation & writing stroke order step by step',
      to: '/learn-hangul',
      icon: BookOpen,
    },
  ];

  const topikLevels = [
    {
      level: 'TOPIK I · Level 1–2',
      score: '80 – 140 pts',
      utility:
        'Essential daily survival Korean and minimum eligibility for D-4 part-time work permission after 6 months of residence.',
    },
    {
      level: 'TOPIK II · Level 3',
      score: '120 – 149 pts',
      utility:
        'Standard admission threshold for Korean-taught undergraduate majors. Unlocks up to 20 hrs/week D-2 semester work.',
    },
    {
      level: 'TOPIK II · Level 4',
      score: '150 – 189 pts',
      utility:
        'Standard university graduation benchmark and GKS degree entry requirement. Unlocks 30%–50% merit tuition waivers.',
    },
    {
      level: 'TOPIK II · Level 5–6',
      score: '190 – 300 pts',
      utility:
        'Advanced academic & corporate fluency. Unlocks 70%–100% tuition waivers, E-7 career advantage, and maximum F-2-7 visa points.',
    },
  ];

  const phrases = {
    immigration: [
      {
        korean: '외국인등록증 발급 신청하러 왔습니다.',
        romaja: 'Oegukin-deungnokjeung balgeup sincheong-hareo wasseumnida.',
        english: 'I came to apply for my Alien Registration Card (ARC).',
      },
      {
        korean: '시간제취업 허가를 신청하고 싶습니다.',
        romaja: 'Sigan-je-chwieop heogareul sincheong-hago sipseumnida.',
        english: 'I would like to apply for part-time work permission.',
      },
      {
        korean: '체류기간 연장 서류를 제출하겠습니다.',
        romaja: 'Cheryu-gigan yeonjang seoryureul jechul-hagesseumnida.',
        english: 'I am submitting my visa extension documents.',
      },
    ],
    bank: [
      {
        korean: '유학생인데 계좌를 개설하고 싶습니다.',
        romaja: 'Yuhaksaeng-inde gyejwateul gaeseol-hago sipseumnida.',
        english: 'I am an international student and want to open a bank account.',
      },
      {
        korean: '해외 송금과 인터넷 뱅킹을 신청하고 싶어요.',
        romaja: 'Haeoe song-geum-gwa inteonet baengking-eul sincheong-hago sipeoyo.',
        english: 'I want to enable overseas remittances and mobile banking.',
      },
      {
        korean: '한도제한을 해제하려면 어떤 서류가 필요한가요?',
        romaja: 'Hando-jehaneul haeje-haryeomyeon eotteon seoryuga piryohangayo?',
        english: 'What documents are required to lift the daily transfer limit?',
      },
    ],
    medical: [
      {
        korean: '국민건강보험이 적용되나요?',
        romaja: 'Gukmin geon-gang boheomi jeok-yong doenayo?',
        english: 'Does my National Health Insurance (NHIS) apply here?',
      },
      {
        korean: '열이 나고 목이 많이 아파요.',
        romaja: 'Yeori nago mogi mani apayo.',
        english: 'I have a fever and a severe sore throat.',
      },
      {
        korean: '처방전을 가지고 약국에 가야 하나요?',
        romaja: 'Cheobangjeoneul gajigo yak-guk-e gaya hanayo?',
        english: 'Do I take this prescription to the pharmacy?',
      },
    ],
    campus: [
      {
        korean: '국제교류처 위치가 어디인가요?',
        romaja: 'Gukje-gyoryucheo wichiga eodi-ingayo?',
        english: 'Where is the Office of International Affairs located?',
      },
      {
        korean: '교수님, 연구실 면담을 요청드려도 될까요?',
        romaja: 'Gyosunim, yeon-gusil myeondameul yocheong-deuryeodo doelkkayo?',
        english: 'Professor, may I request an appointment at your lab/office?',
      },
      {
        korean: '수강신청 정정 기간이 언제까지인가요?',
        romaja: 'Sugang-sincheong jeongjeong gigani eonjekkaji-ingayo?',
        english: 'When does the course add/drop revision period end?',
      },
    ],
  };

  return (
    <div className="py-10 sm:py-14 bg-transparent min-h-[calc(100vh-72px)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5]">
          <Link to="/" className="hover:text-[#0754B8] dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold text-[#0754B8] dark:text-[#60A5FA]">
            Study in Korea · Admissions, Scholarships &amp; Korean Language
          </span>
        </nav>

        {/* Hero Header */}
        <header className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#0754B8] dark:text-[#60A5FA]">
            <span className="w-5 h-0.5 bg-[#FFB800] rounded-full" aria-hidden="true" />
            <span>Study in South Korea · 한국 유학 및 어학 센터</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#061B49] dark:text-white tracking-tight leading-[1.08]">
            Plan Your Academic &amp; Language Path in Korea
          </h1>
          <p className="text-sm sm:text-base text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
            Navigate accredited degree tracks, GKS scholarships, March 2027 intake schedules, D-2 / D-4 student visas, and TOPIK language mastery in one structured hub.
          </p>
        </header>

        {/* 6-Card Study in Korea Hub */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {studyPathways.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.num}
                to={item.to}
                className="group p-6 rounded-2xl ekr-glass-card hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#B87C00] dark:text-[#FFB800] tabular-nums">
                      {item.num}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-[#0754B8]/10 dark:bg-[#0875E8]/20 border border-[#0754B8]/15 dark:border-[#60A5FA]/20 flex items-center justify-center text-[#0754B8] dark:text-[#60A5FA]">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#061B49] dark:text-white group-hover:text-[#0754B8] dark:group-hover:text-[#60A5FA] transition-colors">
                    {item.title}
                  </h2>
                  <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs font-bold text-[#0754B8] dark:text-[#60A5FA]">
                  <span>Explore Pathway</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
                </div>
              </Link>
            );
          })}
        </section>

        {/* Featured EveryKR Korean Learning Academy Banner */}
        <div className="bg-gradient-to-r from-[#061B49] via-[#0754B8] to-[#061B49] rounded-3xl p-6 sm:p-9 border border-white/15 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#FFB800]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Language Platform · 한글 아카데미</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              EVERYKR Korean Learning Academy
            </h2>
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
              Practice structured Hangul lessons, categorized Korean vocabulary with multilingual meanings, interactive stroke-tracing canvas, and timed TOPIK mock assessments.
            </p>
          </div>
          <Link
            to="/korean-academy"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#FFB800] hover:bg-[#ffc633] text-[#061B49] font-extrabold text-xs sm:text-sm shadow-lg shrink-0 transition-colors whitespace-nowrap"
          >
            <span>Open Korean Learning Academy</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>

        {/* TOPIK Benchmark Matrix */}
        <section className="ekr-glass-panel p-6 sm:p-8 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-[#FFB800]" />
              <h2 className="text-lg sm:text-xl font-extrabold text-[#061B49] dark:text-white">
                TOPIK (Test of Proficiency in Korean) Benchmark Matrix
              </h2>
            </div>
            <Link
              to="/universities"
              className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline"
            >
              Compare university TOPIK waivers →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {topikLevels.map((lvl, idx) => (
              <div
                key={idx}
                className="ekr-glass-subtle p-5 rounded-2xl text-xs space-y-2"
              >
                <div className="font-extrabold text-[#061B49] dark:text-white text-sm">{lvl.level}</div>
                <div className="font-mono text-[#0754B8] dark:text-[#FFB800] font-bold tabular-nums">
                  {lvl.score}
                </div>
                <p className="text-[#526685] dark:text-[#B8C9E5] leading-relaxed">{lvl.utility}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Audio-Ready Survival Korean Phrasebook */}
        <section className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white">
                Essential Korean Phrasebook (Audio Enabled)
              </h2>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1">
                Tap the speaker icon on any card to hear clear Korean pronunciation for immigration, banking, clinics, and university offices.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1.5 ekr-glass-panel rounded-xl text-xs font-semibold overflow-x-auto">
              {(
                [
                  { id: 'immigration', label: 'Immigration (1345)' },
                  { id: 'bank', label: 'Bank & ATM' },
                  { id: 'medical', label: 'Clinic & NHIS' },
                  { id: 'campus', label: 'University Campus' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePhraseCategory(tab.id)}
                  className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activePhraseCategory === tab.id
                      ? 'ekr-glass-btn-primary text-white font-bold'
                      : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#061B49] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {phrases[activePhraseCategory].map((phrase, idx) => (
              <div
                key={idx}
                className="ekr-glass-card p-5 rounded-2xl space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      data-no-translate="true"
                      className="text-sm font-extrabold text-[#0754B8] dark:text-[#60A5FA] leading-snug"
                    >
                      {phrase.korean}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playKoreanAudio(phrase.korean);
                        showToast(`Pronouncing: "${phrase.korean}"`);
                      }}
                      className="p-1.5 rounded-lg ekr-glass-subtle text-[#0754B8] dark:text-[#FFB800] hover:opacity-90 cursor-pointer shrink-0 transition-opacity"
                      title="Listen to Korean pronunciation"
                      aria-label={`Pronounce ${phrase.korean}`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5] italic font-mono">
                    {phrase.romaja}
                  </div>
                </div>
                <div className="text-xs text-[#061B49] dark:text-white font-semibold pt-2.5 border-t border-slate-200/60 dark:border-white/10">
                  {phrase.english}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Academic Success Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              num: '01',
              title: 'Relative Grading System (상대평가)',
              desc: 'Most Korean university lectures cap A-tier grades at the top 30%–35% of enrolled students. Consistent attendance and timely assignment submissions protect scholarship renewal GPAs.',
            },
            {
              num: '02',
              title: 'Free KIIP Social Integration (사회통합프로그램)',
              desc: 'The Ministry of Justice sponsors free Korean language and civic society classes (Stages 0–5). Completing Stage 5 awards major bonus points toward the F-2-7 resident visa.',
            },
            {
              num: '03',
              title: 'Official NIIED & Sejong Past Papers',
              desc: 'Download authentic past TOPIK I & II examination papers (기출문제) and listening audio tracks directly from NIIED to benchmark your target scholarship level before applying.',
            },
          ].map((tip) => (
            <div
              key={tip.num}
              className="pt-5 p-6 ekr-glass-card border-t-2 border-t-[#FFB800] dark:border-t-[#FFB800] rounded-2xl space-y-2"
            >
              <span className="font-mono text-xs font-bold text-[#B87C00] dark:text-[#FFB800] tabular-nums">{tip.num}</span>
              <h3 className="text-sm sm:text-base font-extrabold text-[#061B49] dark:text-white">{tip.title}</h3>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
