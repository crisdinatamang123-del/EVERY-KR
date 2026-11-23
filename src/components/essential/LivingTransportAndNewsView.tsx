import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Volume2,
  AlertTriangle,
  Plane,
  Navigation,
  Bookmark,
  Search,
  FileCheck2,
  Languages
} from 'lucide-react';
import {
  KoreanLifeGuideArticle,
  LifeGuideCategoryKey,
  LIFE_GUIDE_CATEGORIES,
  AirportToCityRoute,
  SUPPORTED_KOREAN_AIRPORTS,
  EssentialNewsItem,
  EssentialNewsCategory,
  NEWS_CATEGORIES_10
} from '../../data/essentialHubData';
import { playKoreanAudio } from '../../services/koreanAcademyService';
import {
  buildKoreaTransitRouteLinks,
  openInNaverMap,
  openInKakaoMap
} from '../../utils/koreaMapService';
import {
  getBookmarkedNewsIds,
  toggleBookmarkedNewsId
} from '../../services/essentialHubService';

// ============================================================================
// MODULE 6: KOREAN LIFE GUIDE (CATEGORIES A–H)
// ============================================================================

export const KoreanLifeGuideModule: React.FC<{
  guides: KoreanLifeGuideArticle[];
}> = ({ guides }) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | LifeGuideCategoryKey>('All');
  const [activeGuideId, setActiveGuideId] = useState<string>(guides[0]?.id || '');

  const filteredGuides = useMemo(() => {
    if (selectedCategory === 'All') return guides;
    return guides.filter((g) => g.category === selectedCategory);
  }, [guides, selectedCategory]);

  const activeGuide =
    filteredGuides.find((g) => g.id === activeGuideId) || filteredGuides[0] || null;

  return (
    <div className="space-y-6">
      {/* Category Selector Bar (A–H) */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 space-y-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#10243A] dark:text-white">
            Korean Life Guide for International Students (Categories A–H)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Step-by-step instructions, required documents, essential Korean vocabulary with native pronunciation, and official government links.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border ${
              selectedCategory === 'All'
                ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A]'
                : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            All 8 Categories ({guides.length})
          </button>
          {LIFE_GUIDE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.key);
                const first = guides.find((g) => g.category === cat.key);
                if (first) setActiveGuideId(first.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border ${
                selectedCategory === cat.key
                  ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A]'
                  : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Split Layout: Left Guide List | Right Complete Step-by-Step Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-2.5">
          {filteredGuides.map((g) => {
            const isSelected = activeGuide?.id === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGuideId(g.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A] dark:border-[#19B6A4] shadow-sm'
                    : 'bg-white dark:bg-[#10243A] text-[#10243A] dark:text-white border-slate-200/90 dark:border-slate-800 hover:border-[#1769AA]'
                }`}
              >
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isSelected ? 'opacity-85' : 'text-[#1769AA] dark:text-[#19B6A4]'
                  }`}
                >
                  {g.categoryCode}. {g.category}
                </span>
                <h3 className="text-sm font-extrabold mt-1 leading-snug">{g.titleEn}</h3>
                <p
                  className={`text-xs mt-1.5 line-clamp-2 ${
                    isSelected ? 'opacity-90' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {g.summary}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right Detailed Article */}
        <div className="lg:col-span-8">
          {activeGuide && (
            <div className="bg-white dark:bg-[#10243A] rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 space-y-6 shadow-2xs">
              <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1769AA]/10 dark:bg-[#19B6A4]/15 text-[#1769AA] dark:text-[#19B6A4]">
                    {activeGuide.categoryCode}. {activeGuide.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    Last Verified: {activeGuide.lastUpdatedDate}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#10243A] dark:text-white">
                  {activeGuide.titleEn}
                </h3>
                <p
                  data-no-translate="true"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {activeGuide.titleKo}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {activeGuide.explanation}
                </p>
              </div>

              {/* Step-by-Step Instructions */}
              <div>
                <h4 className="text-sm font-extrabold text-[#10243A] dark:text-white mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
                  <span>Step-by-Step Instructions</span>
                </h4>
                <div className="space-y-2.5">
                  {activeGuide.stepByStepInstructions.map((step: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm"
                    >
                      <span className="w-6 h-6 rounded-lg bg-[#10243A] dark:bg-[#19B6A4] text-white dark:text-[#10243A] font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Documents */}
              {activeGuide.requiredDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-extrabold text-[#10243A] dark:text-white mb-2.5 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
                    <span>Required Documents Checklist</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeGuide.requiredDocuments.map((docItem: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{docItem}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Useful Korean Vocabulary with Native Korean TTS Audio */}
              {activeGuide.usefulVocabulary.length > 0 && (
                <div>
                  <h4 className="text-sm font-extrabold text-[#10243A] dark:text-white mb-2.5 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
                    <span>Essential Korean Vocabulary (Tap to Hear Native Pronunciation)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {activeGuide.usefulVocabulary.map((vocab, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => playKoreanAudio(vocab.korean)}
                        className="text-left p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800 hover:border-[#1769AA] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            data-no-translate="true"
                            className="text-base font-extrabold text-[#10243A] dark:text-white"
                          >
                            {vocab.korean}
                          </span>
                          <Volume2 className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4] group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          [{vocab.romanization}]
                        </p>
                        <p className="text-xs font-semibold text-[#1769AA] dark:text-[#19B6A4] mt-1">
                          {vocab.meaningEn}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Reference Links & Legal Disclaimer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {activeGuide.officialLinks.map((lnk, idx: number) => (
                    <a
                      key={idx}
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#10243A] text-white dark:bg-slate-800 hover:opacity-90"
                    >
                      <span>{lnk.label}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>

                {activeGuide.legalDisclaimer && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{activeGuide.legalDisclaimer}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 7: AIRPORT TO CITY TRANSPORT GUIDE (WITH NAVER & KAKAO ROUTE LINKS)
// ============================================================================

export const AirportTransportGuideModule: React.FC<{
  routes: AirportToCityRoute[];
}> = ({ routes }) => {
  const [selectedAirport, setSelectedAirport] = useState<string>('ICN');
  const [selectedDestinationCity, setSelectedDestinationCity] = useState<string>('All');

  const destinationCities = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => {
      if (selectedAirport === 'ALL' || r.airportCode === selectedAirport) {
        set.add(r.destinationCity);
      }
    });
    return ['All', ...Array.from(set)];
  }, [routes, selectedAirport]);

  const matchingRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (selectedAirport !== 'ALL' && r.airportCode !== selectedAirport) return false;
      if (selectedDestinationCity !== 'All' && r.destinationCity !== selectedDestinationCity) {
        return false;
      }
      return true;
    });
  }, [routes, selectedAirport, selectedDestinationCity]);

  const activeRoute = matchingRoutes[0] || routes[0] || null;

  return (
    <div className="space-y-6">
      {/* Origin Airport & Destination City Selector */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 space-y-5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#10243A] dark:text-white">
            South Korea Airport to City & University Transport Planner
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select your arrival airport and university destination city for step-by-step transit instructions, terminal boarding gates, and direct Naver Map & Kakao Map transit navigation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              1. Select Arrival Airport
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUPPORTED_KOREAN_AIRPORTS.map((airport) => {
                const active = selectedAirport === airport.code;
                return (
                  <button
                    key={airport.code}
                    type="button"
                    onClick={() => {
                      setSelectedAirport(airport.code);
                      setSelectedDestinationCity('All');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A]'
                        : 'bg-slate-50 dark:bg-[#0B1523] text-[#10243A] dark:text-white border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm">{airport.code}</span>
                      <Plane className="w-3.5 h-3.5 opacity-80" />
                    </div>
                    <p className="text-xs font-bold mt-1 truncate">{airport.nameEn}</p>
                    <p data-no-translate="true" className="text-[11px] opacity-75 truncate">
                      {airport.nameKo}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              2. Select Destination City / University Hub
            </label>
            <div className="flex flex-wrap gap-2">
              {destinationCities.map((city) => {
                const active = selectedDestinationCity === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedDestinationCity(city)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer border transition-colors ${
                      active
                        ? 'bg-[#1769AA] text-white border-[#1769AA]'
                        : 'bg-slate-50 dark:bg-[#0B1523] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {city === 'All' ? 'All Destinations' : `To ${city}`}
                  </button>
                );
              })}
            </div>

            {activeRoute && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-[#10243A] dark:text-white">
                  Route Selected: {activeRoute.airportNameEn} → {activeRoute.destinationCity} (
                  {activeRoute.destinationUniversities.slice(0, 3).join(', ')})
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {(() => {
                    const links = buildKoreaTransitRouteLinks({
                      originNameKo: activeRoute.airportNameKo,
                      originNameEn: activeRoute.airportNameEn,
                      originLat: activeRoute.airportLat,
                      originLng: activeRoute.airportLng,
                      destNameKo: activeRoute.destinationNameKo,
                      destNameEn: activeRoute.destinationCity,
                      destLat: activeRoute.destLat,
                      destLng: activeRoute.destLng
                    });
                    return (
                      <>
                        <a
                          href={links.naverWebUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#03C75A] text-white"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Open Route in Naver Map</span>
                        </a>
                        <a
                          href={links.kakaoWebUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FEE500] text-[#191919]"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Open Route in Kakao Map</span>
                        </a>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Matching Airport-to-City Route Cards */}
      <div className="space-y-6">
        {matchingRoutes.map((route) => (
          <div
            key={route.id}
            className="bg-white dark:bg-[#10243A] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 space-y-5 shadow-2xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-black font-mono bg-[#10243A] text-white dark:bg-[#19B6A4] dark:text-[#10243A]">
                    {route.airportCode} → {route.destinationCity.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Verified Multi-Modal Transit Guide
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#10243A] dark:text-white mt-1.5">
                  {route.airportNameEn} to {route.destinationCity} ({route.destinationNameKo})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Serves: {route.destinationUniversities.join(' · ')}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    openInNaverMap({
                      nameEn: route.destinationCity,
                      nameKo: route.destinationNameKo,
                      addressEn: route.destinationCity,
                      addressKo: route.destinationNameKo,
                      city: route.destinationCity,
                      province: route.destinationCity,
                      lat: route.destLat,
                      lng: route.destLng
                    })
                  }
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-[#03C75A] text-white cursor-pointer"
                >
                  Naver Map
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openInKakaoMap({
                      nameEn: route.destinationCity,
                      nameKo: route.destinationNameKo,
                      addressEn: route.destinationCity,
                      addressKo: route.destinationNameKo,
                      city: route.destinationCity,
                      province: route.destinationCity,
                      lat: route.destLat,
                      lng: route.destLng
                    })
                  }
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FEE500] text-[#191919] cursor-pointer"
                >
                  Kakao Map
                </button>
              </div>
            </div>

            {/* Transport Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {route.transportOptions.map((opt, idx: number) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#1769AA] text-white">
                        {opt.optionCode}. {opt.modeType}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#10243A] dark:text-[#19B6A4]">
                        {opt.referenceFareRangeKrw}
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-[#10243A] dark:text-white">
                      {opt.title}
                    </h4>

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <p>
                        <strong className="text-[#10243A] dark:text-white">
                          Terminal & Boarding:
                        </strong>{' '}
                        {opt.departureTerminalInfo} — {opt.boardingLocation}
                      </p>
                      <p>
                        <strong className="text-[#10243A] dark:text-white">
                          Transfers & Route:
                        </strong>{' '}
                        {opt.transferPoints.join(' → ')}
                      </p>
                      <p>
                        <strong className="text-[#10243A] dark:text-white">
                          Estimated Travel Time:
                        </strong>{' '}
                        {opt.estimatedDurationRange}
                      </p>
                      <p>
                        <strong className="text-[#10243A] dark:text-white">
                          Luggage Guidance:
                        </strong>{' '}
                        {opt.luggageGuidance}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      *Reference range; verify operator schedule
                    </span>
                    <a
                      href={opt.bookingWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#1769AA] dark:text-[#19B6A4] hover:underline"
                    >
                      <span>{opt.bookingWebsiteLabel}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Useful Korean Phrases */}
            {route.usefulTravelPhrases.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200/80 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1769AA] dark:text-[#19B6A4]">
                  Useful Korean Travel Phrases (Tap to Speak)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {route.usefulTravelPhrases.map((phr, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => playKoreanAudio(phr.korean)}
                      className="text-left p-2.5 rounded-lg bg-white dark:bg-[#10243A] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div>
                        <p
                          data-no-translate="true"
                          className="text-xs font-extrabold text-[#10243A] dark:text-white"
                        >
                          {phr.korean}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {phr.romanization} — {phr.meaningEn}
                        </p>
                      </div>
                      <Volume2 className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 8: NEWS & UPDATES (10 CATEGORIES + MULTILINGUAL SUMMARIES)
// ============================================================================

export const EssentialNewsUpdatesModule: React.FC<{
  newsList: EssentialNewsItem[];
}> = ({ newsList }) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | EssentialNewsCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryLang, setSummaryLang] = useState<'en' | 'bn' | 'ko' | 'ne'>('en');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => getBookmarkedNewsIds());

  const filteredNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return newsList.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (showBookmarkedOnly && !bookmarkedIds.has(item.id)) return false;
      if (!q) return true;
      return (
        item.headlineEn.toLowerCase().includes(q) ||
        item.summaryEn.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.sourceName.toLowerCase().includes(q)
      );
    });
  }, [newsList, selectedCategory, searchQuery, showBookmarkedOnly, bookmarkedIds]);

  const handleToggleBookmark = (id: string) => {
    toggleBookmarkedNewsId(id);
    setBookmarkedIds(getBookmarkedNewsIds());
  };

  return (
    <div className="space-y-6">
      {/* Header & Multilingual Summary Switcher */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#10243A] dark:text-white">
              South Korea Student News & Official Policy Announcements ({filteredNews.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distinguishes verified Korean government/university official announcements from general student life updates.
            </p>
          </div>

          {/* Multilingual Summary Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B1523] p-1 rounded-xl self-start">
            {(
              [
                { code: 'en', label: 'English' },
                { code: 'bn', label: 'বাংলা' },
                { code: 'ko', label: '한국어' },
                { code: 'ne', label: 'नेपाली' }
              ] as const
            ).map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setSummaryLang(l.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  summaryLang === l.code
                    ? 'bg-[#10243A] text-white dark:bg-[#19B6A4] dark:text-[#10243A]'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* 10 Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border ${
              selectedCategory === 'All'
                ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A]'
                : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            All Updates ({newsList.length})
          </button>
          {NEWS_CATEGORIES_10.map((cat: EssentialNewsCategory) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A]'
                  : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Bookmarks Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer border self-start ${
              showBookmarkedOnly
                ? 'bg-[#1769AA] text-white border-[#1769AA]'
                : 'bg-slate-50 dark:bg-[#0B1523] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Bookmarks ({bookmarkedIds.size})</span>
          </button>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search GKS, TOPIK, visa policy, Climate Card..."
              className="w-full h-9 ps-9 pe-8 text-xs bg-[#F8FAFC] dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* News & Announcements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNews.map((item) => {
          const isBookmarked = bookmarkedIds.has(item.id);
          const localizedSummary =
            summaryLang === 'bn'
              ? item.summaryBn
              : summaryLang === 'ko'
              ? item.summaryKo
              : summaryLang === 'ne'
              ? item.summaryNe
              : item.summaryEn;

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#10243A] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs space-y-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${
                        item.sourceType !== 'Verified Public Information'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
                      }`}
                    >
                      {item.sourceType}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-[#1769AA] dark:text-[#19B6A4]">
                      {item.category}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#1769AA] cursor-pointer"
                    title="Bookmark Update"
                  >
                    <Bookmark
                      className={`w-4 h-4 ${
                        isBookmarked ? 'fill-[#1769AA] text-[#1769AA]' : ''
                      }`}
                    />
                  </button>
                </div>

                <h3 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white leading-snug">
                  {item.headlineEn}
                </h3>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {localizedSummary}
                </div>

                <ul className="list-disc list-inside space-y-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.fullDetailsEn.map((dt: string, idx: number) => (
                    <li key={idx}>{dt}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="text-slate-500">
                  <span className="font-bold text-[#10243A] dark:text-slate-200">
                    {item.sourceName}
                  </span>{' '}
                  · {item.publicationDate}
                </div>

                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#1769AA] dark:text-[#19B6A4] hover:underline shrink-0"
                  >
                    <span>Official Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
