import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CITY_GUIDES } from '../data/mockData';
import {
  MapPin,
  Utensils,
  Train,
  Tag,
  Compass,
  Building2,
  ChevronRight,
  Home,
  Briefcase,
  Users,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ExploreKoreaModule: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const initialCity = (() => {
    const param = (searchParams.get('city') || '').trim().toLowerCase();
    return CITY_GUIDES.some((c) => c.id === param) ? param : 'seoul';
  })();

  const [selectedCityId, setSelectedCityId] = useState<string>(initialCity);

  useEffect(() => {
    const param = (searchParams.get('city') || '').trim().toLowerCase();
    if (param && CITY_GUIDES.some((c) => c.id === param) && param !== selectedCityId) {
      setSelectedCityId(param);
    }
  }, [searchParams, selectedCityId]);

  const handleSelectCity = (id: string) => {
    setSelectedCityId(id);
    setSearchParams({ city: id }, { replace: true });
  };

  const currentCity = CITY_GUIDES.find((c) => c.id === selectedCityId) || CITY_GUIDES[0];

  const lifeEcosystemLinks = [
    {
      title: 'Housing & Dormitories',
      subtitle: 'On-campus residences, one-rooms, goshiwons & Wolse deposit safety',
      to: '/housing',
      icon: Home,
    },
    {
      title: 'Part-Time Jobs & Careers',
      subtitle: 'D-2 / D-4 work permit rules, English-friendly internships & E-7 paths',
      to: '/jobs',
      icon: Briefcase,
    },
    {
      title: 'Public Transit & KTX',
      subtitle: 'Seoul Climate Card youth pass, T-Money & nationwide high-speed rail',
      to: '/transportation',
      icon: Train,
    },
    {
      title: 'Banking, ARC & Healthcare',
      subtitle: 'HiKorea ARC booking, campus bank accounts, SIM verification & NHIS',
      to: '/daily-life',
      icon: Compass,
    },
    {
      title: 'Student Community Q&A',
      subtitle: 'Peer advice from international students studying across South Korea',
      to: '/community',
      icon: Users,
    },
    {
      title: `Universities in ${currentCity.name}`,
      subtitle: `Browse accredited degree & language institutions in ${currentCity.name}`,
      to: `/universities?city=${encodeURIComponent(currentCity.name)}`,
      icon: Building2,
    },
  ];

  const studentDiscounts = [
    {
      title: 'Free Entry to the Five Royal Palaces',
      details:
        'Gyeongbokgung, Changdeokgung, Deoksugung, Changgyeonggung, and Jongmyo Shrine offer 100% free admission when wearing Hanbok, and Youth/Student concessions with valid ID.',
      place: 'Seoul · Jongno-gu',
      concession: 'Up to 100% Concession',
    },
    {
      title: 'KORAIL KTX Youth Concession (힘내라 청춘)',
      details:
        'Registered youths and international students aged 24–33 with KORAIL membership receive 10% to 40% fare reductions on KTX bullet trains booked in advance.',
      place: 'Nationwide KTX Network',
      concession: '10% – 40% Fare Off',
    },
    {
      title: 'Seoul Climate Card Unlimited Youth Pass (기후동행카드)',
      details:
        'Unlimited Seoul subway lines, metropolitan city buses, and Ttareungyi public bikes at the discounted youth monthly rate of ₩55,000 (vs ₩62,000 standard).',
      place: 'Seoul Metropolitan Transit',
      concession: '₩55,000 / Month',
    },
    {
      title: 'National Museum of Modern & Contemporary Art (MMCA)',
      details:
        'Students aged 24 and under enjoy complimentary admission to MMCA Seoul (Samcheong-dong) and Gwacheon contemporary art exhibitions.',
      place: 'Seoul · Gwacheon',
      concession: 'Free Youth Entry',
    },
  ];

  return (
    <div className="py-12 sm:py-16 bg-transparent min-h-[calc(100vh-72px)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5]">
          <Link to="/" className="hover:text-[#10213D] dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold text-[#0754B8] dark:text-[#60A5FA]">
            Discover Korea · Cities, Student Life &amp; Culture
          </span>
        </nav>

        {/* Hero Header */}
        <header className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2">
            <span className="w-4 h-0.5 rounded-full bg-[#FFB800]" aria-hidden="true" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#0754B8] dark:text-[#60A5FA]">
              Discover South Korea · 대한민국 생활 가이드
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#061B49] dark:text-white tracking-tight leading-[1.08] flex items-center gap-3">
            <span aria-hidden="true" className="text-3xl sm:text-4xl leading-none">
              🇰🇷
            </span>
            <span>Major Student Cities &amp; Life in Korea</span>
          </h1>
          <p className="text-sm sm:text-base text-[#4B607F] dark:text-[#B8C9E5] leading-relaxed">
            Explore South Korea’s leading university cities — from central Seoul and coastal Busan to Songdo’s global campus hub in Incheon, Daegu, and Daejeon’s science valley — alongside housing, transit, Halal dining, and national student concessions.
          </p>
        </header>

        {/* Interactive City Tabs */}
        <div className="space-y-6">
          <div
            role="tablist"
            aria-label="Select a Korean student city"
            className="flex items-center gap-2 p-1.5 ekr-glass-panel rounded-2xl overflow-x-auto"
          >
            {CITY_GUIDES.map((city) => {
              const isSelected = selectedCityId === city.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectCity(city.id)}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'ekr-glass-btn-primary text-white font-bold shadow-sm'
                      : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white hover:bg-[#0754B8]/8 dark:hover:bg-white/10'
                  }`}
                >
                  <span>{city.name}</span>
                  <span className="ms-1.5 opacity-75 font-normal">({city.koreanName})</span>
                </button>
              );
            })}
          </div>

          {/* Selected City Feature Card */}
          <div className="ekr-glass-panel rounded-3xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Left City Twilight Photo */}
              <div className="lg:col-span-5 relative min-h-[280px] lg:min-h-[420px] bg-[#050B18] overflow-hidden">
                {!brokenImages[currentCity.id] ? (
                  <img
                    src={currentCity.image}
                    alt={`${currentCity.name} (${currentCity.koreanName}) cityscape`}
                    onError={() => setBrokenImages((prev) => ({ ...prev, [currentCity.id]: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#050B18] via-[#081426] to-[#102544]">
                    <Sparkles className="w-7 h-7 text-[#D6B875] mb-2" />
                    <span className="text-lg font-bold text-white">{currentCity.name}</span>
                    <span className="text-xs text-[#DCE5F0]/70 mt-0.5">{currentCity.koreanName}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050B18]/85 via-[#050B18]/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#D6B875]">
                      {currentCity.koreanName}
                    </div>
                    <div className="text-2xl font-extrabold text-white tracking-tight">
                      {currentCity.name}
                    </div>
                  </div>
                  <Link
                    to={`/universities?city=${encodeURIComponent(currentCity.name)}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D6B875] hover:bg-[#e3c788] text-[#050B18] text-xs font-bold transition-colors shrink-0"
                  >
                    <span>Universities</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </div>

              {/* Right City Editorial Details */}
              <div className="lg:col-span-7 p-6 sm:p-9 space-y-6 flex flex-col justify-between">
                <div className="space-y-5">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-[#1769AA] dark:text-[#4BA3FF]">
                      Metropolitan Student Profile
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {currentCity.name} International Student Guide
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#DCE5F0]/80 mt-2.5 leading-relaxed">
                      {currentCity.description}
                    </p>
                  </div>

                  {/* Leading Universities in City (Zero-Pill Inline Separators) */}
                  <div className="space-y-1.5">
                    <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-[#9BAABD] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#D6B875]" />
                      <span>Key Universities &amp; Campuses</span>
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white leading-relaxed">
                      {currentCity.topUniversities.join(' · ')}
                    </p>
                  </div>

                  {/* Student Neighborhoods */}
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-[#9BAABD] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#4BA3FF]" />
                      <span>Popular Student Districts</span>
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-[#DCE5F0]/85">
                      {currentCity.studentHubs.map((hub, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#D6B875] font-bold">›</span>
                          <span>{hub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Halal & Muslim-Friendly Dining */}
                  <div className="space-y-1.5">
                    <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-[#9BAABD] flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Halal &amp; International Dining</span>
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-[#DCE5F0]/80 leading-relaxed">
                      {currentCity.halalSpots.join(' · ')}
                    </p>
                  </div>
                </div>

                {/* Transit Insight Callout */}
                <div className="p-4 rounded-2xl ekr-glass-subtle text-xs text-[#526685] dark:text-[#B8C9E5] flex items-start gap-3">
                  <Train className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#10213D] dark:text-white">Local Transit Tip: </strong>
                    {currentCity.transportTips}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Korean Life Ecosystem Links */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#0754B8] dark:text-[#60A5FA]">
                Daily Life &amp; Settlement
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#10213D] dark:text-white mt-1">
                Everything You Need After Arrival
              </h2>
            </div>
            <Link
              to="/visa"
              className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1"
            >
              <span>D-2 / D-4 Visa &amp; ARC Checklist</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lifeEcosystemLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to={item.to}
                  className="group p-5 rounded-2xl ekr-glass-card flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0754B8]/10 dark:bg-[#0875E8]/20 flex items-center justify-center text-[#0754B8] dark:text-[#60A5FA]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-[#10213D] dark:text-white group-hover:text-[#0754B8] dark:group-hover:text-[#60A5FA] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] pt-2 border-t border-[#0754B8]/10 dark:border-white/10">
                    <span>Open Guide</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Verified Student Discounts Section */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#0754B8] dark:text-[#FFB800]" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#10213D] dark:text-white">
              National Student Discounts &amp; Youth Concessions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentDiscounts.map((disc, idx) => (
              <div
                key={idx}
                className="p-6 ekr-glass-card rounded-2xl space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#0754B8] dark:text-[#60A5FA]">{disc.place}</span>
                  <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-[#FFB800]">
                    {disc.concession}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#10213D] dark:text-white">{disc.title}</h3>
                <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                  {disc.details}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
