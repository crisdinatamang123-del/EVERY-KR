import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getUniversitySlug } from '../utils/seoRoutes';
import {
  RELATIONAL_BUNDLE_BY_ID,
  resolveCanonicalUniversityId,
  buildArchiveUniversityRelationalBundle,
} from '../data/universities25';
import {
  UniversityDetailSections,
  UniversityDetailTabKey,
} from './universities/UniversityDetailSections';
import {
  ArrowLeft,
  ExternalLink,
  Scale,
  Building2,
  X,
} from 'lucide-react';

const UNIVERSITY_DETAIL_TABS: { id: UniversityDetailTabKey; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'majors_departments', label: 'Major & Departments' },
  { id: 'scholarships', label: 'Scholarships' },
  { id: 'requirements_docs', label: 'Requirements & Documents' },
  { id: 'deadlines', label: 'Deadlines' },
];

export const UniversityDetailPage: React.FC = () => {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const routeParam = slug || id;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    universitiesList,
    comparedUniversityIds,
    toggleCompareUniversity,
    currentUser,
  } = useApp();

  const resolveInitialTab = (): UniversityDetailTabKey => {
    const t = searchParams.get('tab');
    if (t === 'deadlines') return 'deadlines';
    if (t === 'majors' || t === 'majors_departments' || t === 'departments') {
      return 'majors_departments';
    }
    if (t === 'scholarships') return 'scholarships';
    if (t === 'requirements' || t === 'requirements_docs') return 'requirements_docs';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<UniversityDetailTabKey>(resolveInitialTab);
  const [brokenLogo, setBrokenLogo] = useState(false);
  const [brokenBanner, setBrokenBanner] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveTab(resolveInitialTab());
    setBrokenLogo(false);
    setBrokenBanner(false);
  }, [routeParam, searchParams]);

  const handleSelectTab = (tab: UniversityDetailTabKey) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  };

  const uni = useMemo(() => {
    if (!routeParam) return undefined;
    const decoded = decodeURIComponent(routeParam).trim();
    const canonical = resolveCanonicalUniversityId(decoded);
    const slugQuery = (canonical || decoded).toLowerCase();
    return universitiesList.find(
      (u) =>
        u.id.toLowerCase() === slugQuery ||
        getUniversitySlug(u).toLowerCase() === slugQuery ||
        u.name.toLowerCase() === slugQuery ||
        (u.officialName || '').toLowerCase() === slugQuery ||
        (u.aliases || []).some((a) => a.toLowerCase() === slugQuery)
    );
  }, [routeParam, universitiesList]);

  const bundle = useMemo(() => {
    if (!uni) return null;
    if (uni.relationalBundle) return uni.relationalBundle;
    const canonical = resolveCanonicalUniversityId(uni.id) || uni.id;
    return RELATIONAL_BUNDLE_BY_ID[canonical] || buildArchiveUniversityRelationalBundle(uni);
  }, [uni]);

  if (!uni || !bundle) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-8 text-center bg-transparent">
        <div className="ekr-glass-panel rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-xl font-bold text-[#10213D] dark:text-white mb-2">
            University Not Found
          </h2>
          <p className="text-[#526685] dark:text-[#B8C9E5] mb-6 text-xs sm:text-sm">
            The requested university record could not be found.
          </p>
          <button
            type="button"
            onClick={() => navigate('/universities')}
            className="ekr-glass-btn-primary px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer"
          >
            Back to Universities
          </button>
        </div>
      </div>
    );
  }

  const isCompared = comparedUniversityIds.includes(uni.id);

  const logoPath = bundle.logo.localAssetPath || uni.logoUrl || '';
  const hasLogo = Boolean(logoPath && !brokenLogo && (bundle.logo.verified || uni.logoVerified));

  const verifiedGalleryImages = (bundle.images || []).filter(
    (img) => img.verified && img.localOrOfficialUrl
  );
  const primaryCampusPhoto =
    verifiedGalleryImages[0]?.localOrOfficialUrl ||
    (uni.campusImage &&
    !uni.campusImage.includes('images.unsplash.com') &&
    !uni.campusImage.includes('university_campus_seoul_')
      ? uni.campusImage
      : '');
  const hasCampusBanner = Boolean(primaryCampusPhoto && !brokenBanner);

  const uRow = bundle.university;
  const applyNowPortalUrl =
    uni.applyNowUrl ||
    bundle.contacts.onlineApplicationPortalUrl ||
    uni.internationalOfficeUrl ||
    uRow.internationalOfficeWebsiteUrl ||
    uni.officialWebsite ||
    uRow.officialWebsiteUrl;

  return (
    <section className="py-6 sm:py-10 bg-transparent min-h-screen transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back link */}
        <div>
          <Link
            to="/universities"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#0754B8] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to University</span>
          </Link>
        </div>

        {/* ================================================================= */}
        {/* TOP SECTION: ONLY Logo, Official University Name, One Cover Photo */}
        {/* ================================================================= */}
        <div className="ekr-glass-panel rounded-2xl overflow-hidden">
          {/* One Professional University Cover Photograph */}
          <div className="relative h-48 sm:h-64 bg-gradient-to-r from-[#061B49] via-[#0B2C6F] to-[#0875E8] overflow-hidden">
            {hasCampusBanner && (
              <>
                <img
                  src={primaryCampusPhoto}
                  alt={`${uni.officialName || uni.name} cover`}
                  referrerPolicy="no-referrer"
                  onError={() => setBrokenBanner(true)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent" />
              </>
            )}

            {/* Logo, Official University Name & Small Apply Now Button */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white p-2 flex items-center justify-center shadow-md shrink-0 border border-slate-200">
                  {hasLogo ? (
                    <img
                      src={logoPath}
                      alt={`${uni.officialName || uni.name} logo`}
                      className="w-full h-full object-contain"
                      onError={() => setBrokenLogo(true)}
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <h1
                  data-no-translate="true"
                  className="text-lg sm:text-2xl font-extrabold text-white tracking-tight leading-snug truncate"
                >
                  {uni.officialName || uni.name}
                </h1>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleCompareUniversity(uni.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    isCompared
                      ? 'bg-[#FFB800] text-[#061B49] border-[#FFB800]'
                      : 'bg-white/15 hover:bg-white/25 text-white border-white/25 backdrop-blur-md'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" />
                    <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetSlug = getUniversitySlug(uni) || uni.id;
                    const q = new URLSearchParams();
                    const intake = searchParams.get('intake');
                    const degree = searchParams.get('degree');
                    const round = searchParams.get('round');
                    if (intake) q.set('intake', intake);
                    if (degree) q.set('degree', degree);
                    if (round) q.set('round', round);
                    const applyPath = `/apply/${encodeURIComponent(targetSlug)}${
                      q.toString() ? `?${q.toString()}` : ''
                    }`;
                    const isLoggedIn =
                      Boolean(currentUser) &&
                      currentUser?.emailVerified !== false &&
                      currentUser?.accountStatus !== 'unverified' &&
                      currentUser?.accountStatus !== 'suspended';
                    if (!isLoggedIn) {
                      navigate(`/login?redirect=${encodeURIComponent(applyPath)}`);
                    } else {
                      navigate(applyPath);
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0754B8] hover:bg-[#0875E8] text-white border border-white/20 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* MAIN NAVIGATION: EXACTLY FIVE NAVIGATION OPTIONS                */}
          {/* 1. Overview | 2. Major & Departments | 3. Scholarships          */}
          {/* 4. Requirements & Documents | 5. Deadlines                      */}
          {/* =============================================================== */}
          <div
            role="tablist"
            aria-label="University details navigation"
            className="px-4 sm:px-6 py-2.5 border-t border-slate-200/80 dark:border-white/10 bg-[#F8FAFE] dark:bg-white/[0.03] flex items-center gap-1.5 overflow-x-auto no-scrollbar"
          >
            {UNIVERSITY_DETAIL_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'ekr-glass-btn-primary'
                      : 'text-slate-600 dark:text-[#B8C9E5] hover:bg-white dark:hover:bg-white/10 hover:text-[#061B49] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB CONTENT                                                       */}
        {/* ================================================================= */}
        <UniversityDetailSections
          uni={uni}
          bundle={bundle}
          visibleSection={activeTab}
          historicalCyclesOverride={uni.historicalAdmissionCycles}
          onApplyNowClick={() => {
            const targetSlug = getUniversitySlug(uni) || uni.id;
            const applyPath = `/apply/${encodeURIComponent(targetSlug)}`;
            const isLoggedIn =
              Boolean(currentUser) &&
              currentUser?.emailVerified !== false &&
              currentUser?.accountStatus !== 'unverified' &&
              currentUser?.accountStatus !== 'suspended';
            if (!isLoggedIn) {
              navigate(`/login?redirect=${encodeURIComponent(applyPath)}`);
            } else {
              navigate(applyPath);
            }
          }}
        />
      </div>
    </section>
  );
};
