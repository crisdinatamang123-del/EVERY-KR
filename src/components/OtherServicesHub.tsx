import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Store,
  Newspaper,
  PhoneCall,
  Plane,
  Users,
  LifeBuoy,
  Siren,
  Building2,
  ShieldAlert,
  LayoutGrid,
  CheckCircle2
} from 'lucide-react';
import {
  KoreaEmergencyContact,
  KoreaImmigrationOffice,
  KoreaPoliceStation,
  KoreanLifeGuideArticle,
  AirportToCityRoute,
  EssentialNewsItem,
  VERIFIED_EMERGENCY_CONTACTS,
  VERIFIED_IMMIGRATION_OFFICES,
  VERIFIED_POLICE_STATIONS,
  VERIFIED_LIFE_GUIDES,
  VERIFIED_AIRPORT_ROUTES,
  VERIFIED_NEWS_UPDATES
} from '../data/essentialHubData';
import {
  EssentialCommunityPost,
  EssentialMarketplaceListing,
  fetchEmergencyContacts,
  fetchImmigrationOffices,
  fetchPoliceStations,
  fetchKoreanLifeGuides,
  fetchAirportTransportRoutes,
  fetchEssentialNewsUpdates,
  fetchEssentialCommunityPosts,
  fetchEssentialMarketplaceListings
} from '../services/essentialHubService';
import {
  EmergencyNumbersModule,
  ImmigrationDirectoryModule,
  PoliceStationMapModule
} from './essential/PublicSafetyModulesView';
import {
  EssentialCommunityModule,
  EssentialMarketplaceModule
} from './essential/CommunityAndMarketplaceView';
import {
  KoreanLifeGuideModule,
  AirportTransportGuideModule,
  EssentialNewsUpdatesModule
} from './essential/LivingTransportAndNewsView';

export type EssentialHubModuleId =
  | 'overview'
  | 'emergency'
  | 'immigration'
  | 'police'
  | 'community'
  | 'marketplace'
  | 'lifeguide'
  | 'airport'
  | 'news';

export const OtherServicesHub: React.FC = () => {
  const { t, setIsGetHelpModalOpen } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialModule = (searchParams.get('module') as EssentialHubModuleId) || 'overview';
  const [activeModule, setActiveModule] = useState<EssentialHubModuleId>(
    [
      'overview',
      'emergency',
      'immigration',
      'police',
      'community',
      'marketplace',
      'lifeguide',
      'airport',
      'news'
    ].includes(initialModule)
      ? initialModule
      : 'overview'
  );

  // State for the 8 Essential Hub Modules
  const [emergencyContacts, setEmergencyContacts] = useState<KoreaEmergencyContact[]>(
    VERIFIED_EMERGENCY_CONTACTS
  );
  const [immigrationOffices, setImmigrationOffices] = useState<KoreaImmigrationOffice[]>(
    VERIFIED_IMMIGRATION_OFFICES
  );
  const [policeStations, setPoliceStations] = useState<KoreaPoliceStation[]>(
    VERIFIED_POLICE_STATIONS
  );
  const [lifeGuides, setLifeGuides] = useState<KoreanLifeGuideArticle[]>(VERIFIED_LIFE_GUIDES);
  const [airportRoutes, setAirportRoutes] = useState<AirportToCityRoute[]>(
    VERIFIED_AIRPORT_ROUTES
  );
  const [newsUpdates, setNewsUpdates] = useState<EssentialNewsItem[]>(VERIFIED_NEWS_UPDATES);
  const [communityPosts, setCommunityPosts] = useState<EssentialCommunityPost[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<EssentialMarketplaceListing[]>([]);

  const loadEssentialHubData = useCallback(async () => {
    const [
      emData,
      immData,
      polData,
      guideData,
      airData,
      newsData,
      commData,
      mktData
    ] = await Promise.all([
      fetchEmergencyContacts(false),
      fetchImmigrationOffices(false),
      fetchPoliceStations(false),
      fetchKoreanLifeGuides(false),
      fetchAirportTransportRoutes(false),
      fetchEssentialNewsUpdates(false),
      fetchEssentialCommunityPosts(),
      fetchEssentialMarketplaceListings()
    ]);

    setEmergencyContacts(emData);
    setImmigrationOffices(immData);
    setPoliceStations(polData);
    setLifeGuides(guideData);
    setAirportRoutes(airData);
    setNewsUpdates(newsData);
    setCommunityPosts(commData);
    setMarketplaceListings(mktData);
  }, []);

  useEffect(() => {
    loadEssentialHubData();
  }, [loadEssentialHubData]);

  const handleSelectModule = (modId: EssentialHubModuleId) => {
    setActiveModule(modId);
    if (modId === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ module: modId });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eightEssentialModules = useMemo(
    () => [
      {
        id: 'emergency' as EssentialHubModuleId,
        number: '01',
        title: 'Korea Emergency Numbers',
        subtitle: '112 Police, 119 Fire/Ambulance, 1345 Immigration, 1330 Travel & 9 Categories',
        metric: `${emergencyContacts.length} Verified Hotlines`,
        badge: 'One-Tap Dialing',
        icon: Siren,
        animClass: 'ekr-icon-emergency-pulse',
        accent: 'bg-rose-600 text-white'
      },
      {
        id: 'immigration' as EssentialHubModuleId,
        number: '02',
        title: 'Immigration Office Directory',
        subtitle: 'Nationwide ARC & Visa Offices with Naver Map, Kakao Map & HiKorea Links',
        metric: `${immigrationOffices.length} Offices Nationwide`,
        badge: 'Naver & Kakao Map',
        icon: Building2,
        animClass: 'ekr-icon-building-lift',
        accent: 'bg-[#1769AA] text-white'
      },
      {
        id: 'police' as EssentialHubModuleId,
        number: '03',
        title: 'Police Station Map — Korea',
        subtitle: 'Interactive Police Map, Nearby Station Finder, 112 Emergency & 182 Civil Help',
        metric: `${policeStations.length} Verified Stations`,
        badge: 'Naver & Kakao Map',
        icon: ShieldAlert,
        animClass: 'ekr-icon-pin-bounce',
        accent: 'bg-[#10243A] text-white'
      },
      {
        id: 'community' as EssentialHubModuleId,
        number: '04',
        title: 'EveryKR Student Community',
        subtitle: 'Q&A, University, City & Country Channels, Study Groups, Likes & Replies',
        metric: `${communityPosts.length} Active Discussions`,
        badge: '10 Channels',
        icon: Users,
        animClass: 'ekr-icon-community-float',
        accent: 'bg-teal-600 text-white'
      },
      {
        id: 'marketplace' as EssentialHubModuleId,
        number: '05',
        title: 'Second-Hand Marketplace',
        subtitle: 'Buy & Sell Student Essentials in KRW with Campus/Subway Naver & Kakao Meetup',
        metric: `${marketplaceListings.length} Student Listings`,
        badge: '9 Categories (₩)',
        icon: Store,
        animClass: 'ekr-icon-sim-wave',
        accent: 'bg-indigo-600 text-white'
      },
      {
        id: 'lifeguide' as EssentialHubModuleId,
        number: '06',
        title: 'Korean Life Guide (A–H)',
        subtitle: 'Banking, Housing, NHIS Healthcare, Transit, SIM, Legal Basics & Korean Audio',
        metric: `${lifeGuides.length} Step-by-Step Guides`,
        badge: 'Audio Vocabulary',
        icon: Compass,
        animClass: 'ekr-icon-compass-spin',
        accent: 'bg-emerald-600 text-white'
      },
      {
        id: 'airport' as EssentialHubModuleId,
        number: '07',
        title: 'Airport to City Transport',
        subtitle: 'ICN, PUS, GMP & CJU to Seoul, Busan, Changwon, Daejeon, Daegu, Gwangju & Suwon',
        metric: `${airportRoutes.length} Multi-Modal Routes`,
        badge: 'Naver & Kakao Route',
        icon: Plane,
        animClass: 'ekr-icon-plane-glide',
        accent: 'bg-sky-600 text-white'
      },
      {
        id: 'news' as EssentialHubModuleId,
        number: '08',
        title: 'News & Official Updates',
        subtitle: 'Immigration Policy, GKS Scholarships, TOPIK Dates & Multilingual Summaries',
        metric: `${newsUpdates.length} Verified Notices`,
        badge: '4 Languages',
        icon: Newspaper,
        animClass: 'ekr-icon-news-reveal',
        accent: 'bg-amber-600 text-white'
      }
    ],
    [
      emergencyContacts.length,
      immigrationOffices.length,
      policeStations.length,
      communityPosts.length,
      marketplaceListings.length,
      lifeGuides.length,
      airportRoutes.length,
      newsUpdates.length
    ]
  );

  return (
    <div className="w-full bg-transparent text-[#10213D] dark:text-white transition-colors min-h-screen">
      {/* Compact Service Navigation Bar */}
      <section className="w-full ekr-glass-nav border-b border-white/50 dark:border-white/15 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:text-[#10213D] dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180 shrink-0" />
                <span>{t('services_back_home')}</span>
              </Link>
              {activeModule !== 'overview' && (
                <>
                  <span className="text-[#526685]/60 dark:text-white/30">/</span>
                  <button
                    type="button"
                    onClick={() => handleSelectModule('overview')}
                    className="text-xs font-bold text-[#10213D] dark:text-white hover:underline cursor-pointer"
                  >
                    All Services
                  </button>
                </>
              )}
            </div>

            {activeModule === 'overview' && (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="tel:112"
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-600/90 hover:bg-rose-600 text-white backdrop-blur-md shadow-xs transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5 ekr-icon-emergency-pulse" />
                  <span>112 Police</span>
                </a>
                <a
                  href="tel:119"
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#0E2656]/90 hover:bg-[#0E2656] text-white backdrop-blur-md shadow-xs transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5 ekr-icon-emergency-pulse" />
                  <span>119 Ambulance</span>
                </a>
                <a
                  href="tel:1345"
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold ekr-glass-btn-primary"
                >
                  <PhoneCall className="w-3.5 h-3.5 ekr-icon-emergency-pulse" />
                  <span>1345 Immigration</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsGetHelpModalOpen(true)}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ekr-glass-subtle text-[#10213D] dark:text-white hover:bg-white/80 dark:hover:bg-white/15 cursor-pointer transition-colors"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] ekr-icon-compass-spin" />
                  <span>{t('services_hub_emergency_btn')}</span>
                </button>
              </div>
            )}
          </div>

          {activeModule === 'overview' && (
            <div className="mt-4 max-w-3xl space-y-1.5">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0754B8] dark:text-[#60A5FA]">
                <span className="w-5 h-0.5 bg-[#FFB800] rounded-full" aria-hidden="true" />
                <span>EveryKR Essential Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#061B49] dark:text-white leading-tight">
                Korea Essential Services &amp; Student Daily Life Directory
              </h1>
              <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                Direct access to South Korea emergency hotlines, immigration offices, police stations, student community channels, marketplace, Korean life guides, airport transport, and official updates.
              </p>
            </div>
          )}

          {/* 8-Module Navigation Strip */}
          <div
            role="tablist"
            aria-label="Essential Hub Modules"
            className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            <button
              type="button"
              onClick={() => handleSelectModule('overview')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all ${
                activeModule === 'overview'
                  ? 'ekr-glass-btn-primary text-white'
                  : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Services</span>
            </button>

            {eightEssentialModules.map((mod) => {
              const Icon = mod.icon;
              const isSelected = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleSelectModule(mod.id)}
                  className={`group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                    isSelected
                      ? 'ekr-glass-btn-primary text-white'
                      : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${mod.animClass}`} />
                  <span>{mod.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {activeModule === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {eightEssentialModules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  type="button"
                  style={{ '--stagger-idx': idx } as React.CSSProperties}
                  onClick={() => handleSelectModule(mod.id)}
                  className="ekr-card-stagger group text-left h-full ekr-glass-card rounded-2xl p-5 hover:-translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs ${mod.accent}`}
                      >
                        <Icon className={`w-5 h-5 ${mod.animClass}`} />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold ekr-glass-subtle text-[#0754B8] dark:text-[#60A5FA]">
                        {mod.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-[#10213D] dark:text-white group-hover:text-[#0754B8] dark:group-hover:text-[#60A5FA] transition-colors">
                      {mod.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                      {mod.subtitle}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0754B8] dark:text-[#60A5FA]">
                      {mod.metric}
                    </span>
                    <span className="inline-flex items-center gap-1 font-extrabold text-[#10213D] dark:text-white group-hover:translate-x-0.5 transition-transform">
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeModule === 'emergency' && (
          <EmergencyNumbersModule contacts={emergencyContacts} />
        )}

        {activeModule === 'immigration' && (
          <ImmigrationDirectoryModule offices={immigrationOffices} />
        )}

        {activeModule === 'police' && (
          <PoliceStationMapModule stations={policeStations} />
        )}

        {activeModule === 'community' && (
          <EssentialCommunityModule
            posts={communityPosts}
            onRefresh={loadEssentialHubData}
          />
        )}

        {activeModule === 'marketplace' && (
          <EssentialMarketplaceModule
            listings={marketplaceListings}
            onRefresh={loadEssentialHubData}
          />
        )}

        {activeModule === 'lifeguide' && (
          <KoreanLifeGuideModule guides={lifeGuides} />
        )}

        {activeModule === 'airport' && (
          <AirportTransportGuideModule routes={airportRoutes} />
        )}

        {activeModule === 'news' && (
          <EssentialNewsUpdatesModule newsList={newsUpdates} />
        )}
      </section>
    </div>
  );
};

