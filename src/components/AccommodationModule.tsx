import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  MapPin,
  Lock,
  LogIn,
  UserPlus,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { EveryKrAnimatedLogo } from './common/EveryKrAnimatedLogo';

interface Props {
  isFullPage?: boolean;
}

const CITY_OPTIONS = [
  'All',
  'Seoul',
  'Busan',
  'Daejeon',
  'Incheon',
  'Suwon',
  'Daegu',
  'Gwangju',
  'Ulsan',
  'Jeonju',
  'Cheonan',
  'Pohang',
  'Chuncheon'
];

const ACCOMMODATION_TYPES = [
  'All',
  'Dormitory',
  'One-room',
  'Studio',
  'Shared Room',
  'Goshiwon',
  'Short-term'
];

export const AccommodationModule: React.FC<Props> = () => {
  const {
    accommodationList,
    refreshAccommodations,
    currentUser,
    isAuthReady,
    setAuthModalMode,
    setIsAuthModalOpen
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states: Location / City, Monthly rent, Deposit, Accommodation type
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [maxMonthlyRent, setMaxMonthlyRent] = useState<number>(0); // 0 = Any
  const [maxDeposit, setMaxDeposit] = useState<number>(0); // 0 = Any

  // Sync URL ?type= query param from Homepage Category 03 links
  useEffect(() => {
    const typeParam = (searchParams.get('type') || '').toLowerCase().trim();
    if (!typeParam) return;
    if (typeParam === 'dormitory') setSelectedType('Dormitory');
    else if (typeParam === 'goshiwon') setSelectedType('Goshiwon');
    else if (typeParam === 'sharehouse' || typeParam === 'shared') setSelectedType('Shared Room');
    else if (typeParam === 'oneroom' || typeParam === 'one-room') setSelectedType('One-room');
    else if (typeParam === 'studio') setSelectedType('Studio');
  }, [searchParams]);

  // Refresh public approved accommodations on mount
  useEffect(() => {
    refreshAccommodations();
  }, []);

  const intendedDestination = `${location.pathname}${location.search}`;

  const isAuthenticated =
    isAuthReady &&
    Boolean(currentUser) &&
    currentUser?.emailVerified !== false &&
    currentUser?.accountStatus !== 'unverified' &&
    currentUser?.accountStatus !== 'suspended';

  // Strictly display Approved + Available listings only
  const approvedListings = useMemo(() => {
    return accommodationList.filter(acc => {
      const status = acc.approvalStatus || (acc.verified ? 'Approved' : 'Pending');
      const availability = acc.availability || 'Available';
      return status === 'Approved' && availability === 'Available';
    });
  }, [accommodationList]);

  // Available cities derived from actual data + standard cities
  const availableCities = useMemo(() => {
    const dataCities = Array.from(
      new Set(approvedListings.map(a => a.city).filter(Boolean))
    );
    const merged = new Set(['All', ...dataCities, ...CITY_OPTIONS.slice(1)]);
    return Array.from(merged);
  }, [approvedListings]);

  const filteredAccommodations = useMemo(() => {
    return approvedListings.filter(acc => {
      const rent = Number(acc.monthlyRent ?? acc.monthlyRentKRW ?? 0);
      const deposit = Number(acc.securityDeposit ?? acc.depositKRW ?? 0);
      const accType = String(acc.accommodationType || acc.roomType || '');

      const matchesCity =
        selectedCity === 'All' ||
        acc.city.toLowerCase() === selectedCity.toLowerCase();

      const matchesType =
        selectedType === 'All' ||
        accType.toLowerCase() === selectedType.toLowerCase();

      const matchesRent = maxMonthlyRent === 0 || rent <= maxMonthlyRent;
      const matchesDeposit = maxDeposit === 0 || deposit <= maxDeposit;

      return matchesCity && matchesType && matchesRent && matchesDeposit;
    });
  }, [approvedListings, selectedCity, selectedType, maxMonthlyRent, maxDeposit]);

  const resetFilters = () => {
    setSelectedCity('All');
    setSelectedType('All');
    setMaxMonthlyRent(0);
    setMaxDeposit(0);
    if (searchParams.has('type')) {
      const next = new URLSearchParams(searchParams);
      next.delete('type');
      setSearchParams(next, { replace: true });
    }
  };

  // Wait for auth check before flashing content
  if (!isAuthReady) {
    return (
      <section className="py-20 min-h-[75vh] flex items-center justify-center bg-transparent px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#0754B8] border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-[#526685] dark:text-[#B8C9E5]">
            Checking account session...
          </p>
        </div>
      </section>
    );
  }

  // 1. ACCOMMODATION ENTRY — Authentication Gate for Unauthenticated Visitors
  if (!isAuthenticated) {
    return (
      <section className="py-12 sm:py-20 min-h-[80vh] flex items-center justify-center bg-transparent px-4">
        <div className="max-w-md w-full ekr-glass-panel rounded-3xl p-6 sm:p-8 text-center space-y-6">
          <div className="flex justify-center">
            <EveryKrAnimatedLogo variant="compact" imgClassName="h-8 sm:h-9" />
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#10213D] dark:text-white tracking-tight">
              Accommodation Access
            </h1>
            <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
              Please sign in or register an account to view verified accommodation listings in South Korea. You will be redirected directly back to this page after authentication.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white ekr-glass-btn-primary transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate(`/register?redirect=${encodeURIComponent(intendedDestination)}`);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-[#10213D] dark:text-white ekr-glass-subtle hover:border-[#0754B8]/40 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#0754B8]/10 dark:border-white/10 flex items-center justify-center gap-4 text-[11px] text-[#526685] dark:text-[#B8C9E5]">
            <Link
              to={`/login?redirect=${encodeURIComponent(intendedDestination)}`}
              className="hover:text-[#0754B8] dark:hover:text-white underline-offset-4 hover:underline"
            >
              Full Login Page
            </Link>
            <span>·</span>
            <Link
              to="/"
              className="hover:text-[#0754B8] dark:hover:text-white underline-offset-4 hover:underline"
            >
              Back to Homepage
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // 2. ACCOMMODATION MAIN PAGE (Simple, Clean, Approved Listings Only)
  return (
    <section
      id="housing"
      className="py-8 sm:py-12 min-h-[82vh] bg-transparent transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Clean Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#0754B8]/12 dark:border-white/12 pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2">
              <span className="w-4 h-0.5 rounded-full bg-[#FFB800]" aria-hidden="true" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0754B8] dark:text-[#60A5FA]">
                Verified Student Housing · South Korea
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#061B49] dark:text-white tracking-tight">
              Accommodation
            </h1>
            <p className="text-xs sm:text-sm text-[#4B607F] dark:text-[#B8C9E5]">
              Approved student rooms, studios, dormitories, and shared housing in South Korea.
            </p>
          </div>
          <div className="text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] tabular-nums">
            Showing {filteredAccommodations.length} approved {filteredAccommodations.length === 1 ? 'listing' : 'listings'}
          </div>
        </div>

        {/* Simple Filter Bar: Location / City, Monthly rent, Deposit, Accommodation type */}
        <div className="ekr-glass-panel rounded-2xl p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            {/* 1. Location / City */}
            <div>
              <label className="block text-[11px] font-semibold text-[#526685] dark:text-[#B8C9E5] mb-1.5">
                Location / City
              </label>
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2 text-xs ekr-glass-input rounded-xl focus:outline-none font-medium"
              >
                {availableCities.map(city => (
                  <option key={city} value={city} className="bg-white dark:bg-[#0B204A]">
                    {city === 'All' ? 'All Cities' : city}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Monthly Rent */}
            <div>
              <label className="block text-[11px] font-semibold text-[#526685] dark:text-[#B8C9E5] mb-1.5">
                Monthly Rent (KRW)
              </label>
              <select
                value={maxMonthlyRent}
                onChange={e => setMaxMonthlyRent(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs ekr-glass-input rounded-xl focus:outline-none font-medium tabular-nums"
              >
                <option value={0} className="bg-white dark:bg-[#0B204A]">Any Monthly Rent</option>
                <option value={350000} className="bg-white dark:bg-[#0B204A]">Up to ₩350,000</option>
                <option value={500000} className="bg-white dark:bg-[#0B204A]">Up to ₩500,000</option>
                <option value={700000} className="bg-white dark:bg-[#0B204A]">Up to ₩700,000</option>
                <option value={1000000} className="bg-white dark:bg-[#0B204A]">Up to ₩1,000,000</option>
              </select>
            </div>

            {/* 3. Security Deposit */}
            <div>
              <label className="block text-[11px] font-semibold text-[#526685] dark:text-[#B8C9E5] mb-1.5">
                Deposit (KRW)
              </label>
              <select
                value={maxDeposit}
                onChange={e => setMaxDeposit(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs ekr-glass-input rounded-xl focus:outline-none font-medium tabular-nums"
              >
                <option value={0} className="bg-white dark:bg-[#0B204A]">Any Deposit</option>
                <option value={500000} className="bg-white dark:bg-[#0B204A]">Up to ₩500,000</option>
                <option value={1000000} className="bg-white dark:bg-[#0B204A]">Up to ₩1,000,000</option>
                <option value={5000000} className="bg-white dark:bg-[#0B204A]">Up to ₩5,000,000</option>
                <option value={10000000} className="bg-white dark:bg-[#0B204A]">Up to ₩10,000,000</option>
              </select>
            </div>

            {/* 4. Accommodation Type */}
            <div>
              <label className="block text-[11px] font-semibold text-[#526685] dark:text-[#B8C9E5] mb-1.5">
                Accommodation Type
              </label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-xs ekr-glass-input rounded-xl focus:outline-none font-medium"
              >
                {ACCOMMODATION_TYPES.map(type => (
                  <option key={type} value={type} className="bg-white dark:bg-[#0B204A]">
                    {type === 'All' ? 'All Types' : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div>
              <button
                type="button"
                onClick={resetFilters}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#10213D] dark:text-white ekr-glass-subtle hover:border-[#0754B8]/40 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Listings Grid — Strict 6-Item Card Layout */}
        {filteredAccommodations.length === 0 ? (
          <div className="ekr-glass-panel rounded-2xl p-12 text-center space-y-3">
            <Home className="w-8 h-8 text-[#526685] dark:text-[#B8C9E5] mx-auto" />
            <h2 className="text-base font-bold text-[#10213D] dark:text-white">
              No Approved Accommodations Match Your Filters
            </h2>
            <p className="text-xs text-[#526685] dark:text-[#B8C9E5] max-w-md mx-auto">
              Try adjusting your location, monthly rent, security deposit, or accommodation type filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white ekr-glass-btn-primary rounded-xl transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccommodations.map(acc => {
              const propertyId = acc.propertyId || acc.id;
              const mainPhoto =
                Array.isArray(acc.photos) && acc.photos.length > 0
                  ? acc.photos[0]
                  : '/src/assets/images/korea_student_housing_1794049412879.jpg';
              const monthlyRent = Number(acc.monthlyRent ?? acc.monthlyRentKRW ?? 0);
              const securityDeposit = Number(acc.securityDeposit ?? acc.depositKRW ?? 0);
              const locationLabel = acc.city
                ? `${acc.city}, South Korea`
                : 'South Korea';

              return (
                <article
                  key={propertyId}
                  className="ekr-glass-card rounded-2xl overflow-hidden flex flex-col"
                >
                  {/* 1. Main Property Photograph */}
                  <div className="aspect-16/10 w-full bg-slate-100/60 dark:bg-slate-900/60 overflow-hidden">
                    <img
                      src={mainPhoto}
                      alt={acc.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Card Body with Items 2, 3, 4, 5, 6 */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      {/* 2. Property Title or Short Name */}
                      <h2 className="text-base font-bold text-[#10213D] dark:text-white leading-snug line-clamp-1">
                        {acc.title}
                      </h2>

                      <div className="space-y-1.5 text-xs text-[#526685] dark:text-[#B8C9E5] pt-1">
                        {/* 3. Monthly Rent (KRW) */}
                        <div className="flex items-center justify-between">
                          <span>Monthly Rent:</span>
                          <span className="font-bold text-[#10213D] dark:text-white tabular-nums">
                            ₩{monthlyRent.toLocaleString()}
                          </span>
                        </div>

                        {/* 4. Security Deposit (KRW) */}
                        <div className="flex items-center justify-between">
                          <span>Deposit:</span>
                          <span className="font-semibold text-[#10213D] dark:text-white tabular-nums">
                            ₩{securityDeposit.toLocaleString()}
                          </span>
                        </div>

                        {/* 5. Location */}
                        <div className="flex items-center justify-between pt-0.5">
                          <span>Location:</span>
                          <span className="inline-flex items-center gap-1 font-medium text-[#10213D] dark:text-white">
                            <MapPin className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                            <span>{locationLabel}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 6. Details Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/housing/${encodeURIComponent(propertyId)}`)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-white ekr-glass-btn-primary transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
