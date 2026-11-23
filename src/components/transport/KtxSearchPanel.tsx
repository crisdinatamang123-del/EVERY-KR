import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  TrainFront,
  Users,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import {
  FeaturedRouteItem,
  formatKrwFare,
  formatMinutesDuration,
  getKstDateWithOffset,
  getKstTodayIso,
  KtxSearchApiResponse,
  KtxStationItem,
  OfficialExternalBookingUrls,
  QUICK_DEPARTURE_TIMES,
} from './transportTypes';

interface KtxSearchPanelProps {
  bookingUrls: OfficialExternalBookingUrls;
  featuredRoutes: FeaturedRouteItem[];
  tagoConfigured: boolean;
}

export const KtxSearchPanel: React.FC<KtxSearchPanelProps> = ({
  bookingUrls,
  featuredRoutes,
  tagoConfigured,
}) => {
  const [stations, setStations] = useState<KtxStationItem[]>([]);
  const [originId, setOriginId] = useState<string>('seoul');
  const [destinationId, setDestinationId] = useState<string>('busan');
  const [travelDate, setTravelDate] = useState<string>(() => getKstDateWithOffset(1));
  const [preferredTime, setPreferredTime] = useState<string>('08:00');
  const [passengers, setPassengers] = useState<number>(1);
  const [trainClassFilter, setTrainClassFilter] = useState<'all' | 'ktx' | 'srt' | 'conventional'>('all');
  const [showAllDepartures, setShowAllDepartures] = useState<boolean>(false);

  // Dropdown state
  const [originQuery, setOriginQuery] = useState<string>('');
  const [destQuery, setDestQuery] = useState<string>('');
  const [showOriginDropdown, setShowOriginDropdown] = useState<boolean>(false);
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);

  // Search execution & results state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<KtxSearchApiResponse | null>(null);
  const [sortBy, setSortBy] = useState<'earliest' | 'cheapest' | 'fastest' | 'latest'>('earliest');
  const [routeHint, setRouteHint] = useState<string | null>(null);

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);
  const minDateKst = useMemo(() => getKstTodayIso(), []);
  const tomorrowDateKst = useMemo(() => getKstDateWithOffset(1), []);

  useEffect(() => {
    let active = true;
    fetch('/api/transport/ktx/stations')
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data.stations)) {
          setStations(data.stations);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(e.target as Node)) {
        setShowOriginDropdown(false);
      }
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setShowDestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selectedOrigin = useMemo(
    () => stations.find((s) => s.id === originId) || null,
    [stations, originId]
  );
  const selectedDestination = useMemo(
    () => stations.find((s) => s.id === destinationId) || null,
    [stations, destinationId]
  );

  const filterStationList = (queryText: string) => {
    const q = queryText.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(
      (s) =>
        s.nameEn.toLowerCase().includes(q) ||
        s.nameKo.toLowerCase().includes(q) ||
        s.cityEn.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.aliases.some((a) => a.toLowerCase().includes(q))
    );
  };

  const filteredOrigins = useMemo(() => filterStationList(originQuery), [stations, originQuery]);
  const filteredDestinations = useMemo(() => filterStationList(destQuery), [stations, destQuery]);

  const handleSwapStations = () => {
    const prev = originId;
    setOriginId(destinationId);
    setDestinationId(prev);
  };

  const executeKtxSearch = async (overrideShowAll?: boolean) => {
    if (isSearching) return;
    setRouteHint(null);
    setErrorMessage(null);

    if (!originId || !destinationId) {
      setErrorMessage('Please select both departure and destination stations.');
      return;
    }
    if (originId === destinationId) {
      setErrorMessage('Departure and destination stations must be different.');
      return;
    }
    if (!travelDate || travelDate < minDateKst) {
      setErrorMessage(`Please select today (${minDateKst} KST) or a future travel date.`);
      return;
    }

    const effectiveShowAll =
      typeof overrideShowAll === 'boolean' ? overrideShowAll : showAllDepartures;
    if (typeof overrideShowAll === 'boolean') {
      setShowAllDepartures(overrideShowAll);
    }

    setIsSearching(true);
    try {
      const qs = new URLSearchParams({
        originId,
        destinationId,
        travelDate,
        preferredDepartureTime: preferredTime || '00:00',
        passengers: String(passengers),
        trainClassFilter,
        showAllDepartures: String(effectiveShowAll),
      });
      const res = await fetch(`/api/transport/ktx/search?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data?.error || 'Could not retrieve KTX train schedules.');
      } else {
        setSearchResponse(data as KtxSearchApiResponse);
      }
    } catch {
      setErrorMessage('Network error contacting the KTX timetable service. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const sortedSchedules = useMemo(() => {
    const list = searchResponse?.schedules || [];
    return [...list].sort((a, b) => {
      if (sortBy === 'latest') return b.departureIsoKst.localeCompare(a.departureIsoKst);
      if (sortBy === 'cheapest') {
        const fa = a.standardFareKrw ?? Number.MAX_SAFE_INTEGER;
        const fb = b.standardFareKrw ?? Number.MAX_SAFE_INTEGER;
        return fa - fb;
      }
      if (sortBy === 'fastest') {
        const da = a.durationMinutes ?? Number.MAX_SAFE_INTEGER;
        const db = b.durationMinutes ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      }
      return a.departureIsoKst.localeCompare(b.departureIsoKst);
    });
  }, [searchResponse, sortBy]);

  return (
    <div className="space-y-6">
      {/* KTX Search Form Glass Panel */}
      <div className="ekr-glass-panel text-[#10213D] dark:text-white rounded-2xl p-5 sm:p-6">
        {/* Top Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#0754B8]/12 dark:border-white/12">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0754B8]/12 text-[#0754B8] dark:bg-[#0875E8]/25 dark:text-[#60A5FA] flex items-center justify-center">
              <TrainFront className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#10213D] dark:text-white">
                KTX & SRT High-Speed Rail Search
              </h2>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                Korea Standard Time (Asia/Seoul · KST) · Official Korail & SRT external booking
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Train Type Selector */}
            <select
              aria-label="Train type filter"
              value={trainClassFilter}
              onChange={(e) =>
                setTrainClassFilter(e.target.value as 'all' | 'ktx' | 'srt' | 'conventional')
              }
              className="ekr-glass-input px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-[#081634]">All Rail (KTX / SRT)</option>
              <option value="ktx" className="bg-white dark:bg-[#081634]">KTX / KTX-Sancheon</option>
              <option value="srt" className="bg-white dark:bg-[#081634]">SRT High-Speed</option>
              <option value="conventional" className="bg-white dark:bg-[#081634]">ITX / Mugunghwa</option>
            </select>

            {/* Passengers */}
            <div className="ekr-glass-input inline-flex items-center gap-2 px-3 py-1.5 rounded-xl">
              <Users className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
              <label htmlFor="ktx-passengers" className="text-xs font-semibold text-[#526685] dark:text-[#B8C9E5]">
                Passengers
              </label>
              <select
                id="ktx-passengers"
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className="bg-transparent text-xs sm:text-sm font-bold text-[#10213D] dark:text-white focus:outline-none tabular-nums cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n} className="bg-white dark:bg-[#081634]">
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Inputs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Departure Station */}
          <div className="lg:col-span-4 relative" ref={originRef}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5] mb-1.5">
              Departure Station
            </label>
            <button
              type="button"
              onClick={() => {
                setShowOriginDropdown((v) => !v);
                setShowDestDropdown(false);
              }}
              className="ekr-glass-input w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#10213D] dark:text-white truncate">
                  {selectedOrigin ? selectedOrigin.nameEn : 'Select departure station'}
                </div>
                <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate">
                  {selectedOrigin ? `${selectedOrigin.nameKo} · ${selectedOrigin.operators.join(' / ')}` : 'Search Korean rail stations'}
                </div>
              </div>
              <MapPin className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
            </button>

            {showOriginDropdown && (
              <div className="ekr-glass-dropdown absolute left-0 right-0 mt-2 rounded-xl z-40 overflow-hidden">
                <div className="p-2.5 border-b border-[#0754B8]/12 dark:border-white/12">
                  <input
                    type="text"
                    value={originQuery}
                    onChange={(e) => setOriginQuery(e.target.value)}
                    placeholder="Search Seoul, Busan, Daejeon, 서울..."
                    className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg placeholder:text-[#64748B] dark:placeholder:text-[#B8C9E5]/60"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#0754B8]/10 dark:divide-white/10">
                  {filteredOrigins.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setOriginId(st.id);
                        setOriginQuery('');
                        setShowOriginDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-[#0875E8]/10 dark:hover:bg-white/10 transition flex items-center justify-between gap-2 cursor-pointer ${
                        st.id === originId ? 'bg-[#0875E8]/12 dark:bg-[#0875E8]/25' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#10213D] dark:text-white truncate">
                          {st.nameEn}
                        </div>
                        <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5] truncate">
                          {st.nameKo} · {st.region}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#0754B8] dark:text-[#60A5FA] shrink-0">
                        {st.operators.join('/')}
                      </span>
                    </button>
                  ))}
                  {filteredOrigins.length === 0 && (
                    <div className="p-4 text-xs text-[#526685] dark:text-[#B8C9E5] text-center">No matching stations found.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="lg:col-span-1 flex items-end justify-center pb-1">
            <button
              type="button"
              onClick={handleSwapStations}
              title="Swap departure and destination"
              aria-label="Swap departure and destination stations"
              className="ekr-glass-subtle w-10 h-10 rounded-xl hover:bg-[#0754B8] hover:text-white text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center transition cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Station */}
          <div className="lg:col-span-4 relative" ref={destRef}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5] mb-1.5">
              Destination Station
            </label>
            <button
              type="button"
              onClick={() => {
                setShowDestDropdown((v) => !v);
                setShowOriginDropdown(false);
              }}
              className="ekr-glass-input w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#10213D] dark:text-white truncate">
                  {selectedDestination ? selectedDestination.nameEn : 'Select destination station'}
                </div>
                <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate">
                  {selectedDestination
                    ? `${selectedDestination.nameKo} · ${selectedDestination.operators.join(' / ')}`
                    : 'Search Korean rail stations'}
                </div>
              </div>
              <MapPin className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
            </button>

            {showDestDropdown && (
              <div className="ekr-glass-dropdown absolute left-0 right-0 mt-2 rounded-xl z-40 overflow-hidden">
                <div className="p-2.5 border-b border-[#0754B8]/12 dark:border-white/12">
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => setDestQuery(e.target.value)}
                    placeholder="Search Busan, Daegu, Gwangju, 부산..."
                    className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg placeholder:text-[#64748B] dark:placeholder:text-[#B8C9E5]/60"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#0754B8]/10 dark:divide-white/10">
                  {filteredDestinations.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setDestinationId(st.id);
                        setDestQuery('');
                        setShowDestDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-[#0875E8]/10 dark:hover:bg-white/10 transition flex items-center justify-between gap-2 cursor-pointer ${
                        st.id === destinationId ? 'bg-[#0875E8]/12 dark:bg-[#0875E8]/25' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#10213D] dark:text-white truncate">
                          {st.nameEn}
                        </div>
                        <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5] truncate">
                          {st.nameKo} · {st.region}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#0754B8] dark:text-[#60A5FA] shrink-0">
                        {st.operators.join('/')}
                      </span>
                    </button>
                  ))}
                  {filteredDestinations.length === 0 && (
                    <div className="p-4 text-xs text-[#526685] dark:text-[#B8C9E5] text-center">No matching stations found.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Travel Date (KST) */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="ktx-date"
                className="text-[11px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5]"
              >
                Travel Date (KST)
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTravelDate(minDateKst)}
                  className={`font-semibold hover:underline cursor-pointer ${
                    travelDate === minDateKst ? 'text-[#0754B8] dark:text-[#60A5FA]' : 'text-[#526685] dark:text-[#B8C9E5]'
                  }`}
                >
                  Today
                </button>
                <span className="opacity-40">·</span>
                <button
                  type="button"
                  onClick={() => setTravelDate(tomorrowDateKst)}
                  className={`font-semibold hover:underline cursor-pointer ${
                    travelDate === tomorrowDateKst ? 'text-[#0754B8] dark:text-[#60A5FA]' : 'text-[#526685] dark:text-[#B8C9E5]'
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="ktx-date"
                type="date"
                min={minDateKst}
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="ekr-glass-input w-full pl-10 pr-3 py-3 rounded-xl text-sm font-bold tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Preferred Departure Time + Search CTA Row */}
        <div className="mt-4 pt-4 border-t border-[#0754B8]/10 dark:border-white/10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="ktx-time"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5]"
              >
                <Clock className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                Preferred Departure Time (KST)
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllDepartures}
                  onChange={(e) => setShowAllDepartures(e.target.checked)}
                  className="rounded border-slate-300 text-[#0754B8] focus:ring-[#0875E8]"
                />
                <span>View all departures for this date</span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="ktx-time"
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="ekr-glass-input px-3 py-2 rounded-lg text-xs sm:text-sm font-bold font-mono tabular-nums"
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_DEPARTURE_TIMES.map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setPreferredTime(slot.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition cursor-pointer ${
                      preferredTime === slot.value
                        ? 'ekr-glass-btn-primary'
                        : 'ekr-glass-subtle text-[#10213D] dark:text-[#B8C9E5]'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isSearching}
            onClick={() => executeKtxSearch()}
            className="ekr-glass-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-extrabold disabled:opacity-60 cursor-pointer shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching KTX Schedules...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search KTX & SRT
              </>
            )}
          </button>
        </div>

        {/* Popular Rail Corridors */}
        {featuredRoutes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#0754B8]/10 dark:border-white/10 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[#526685] dark:text-[#B8C9E5]">Popular KTX routes:</span>
            {featuredRoutes.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => {
                  setOriginId(route.originId);
                  setDestinationId(route.destinationId);
                  setRouteHint(`Selected ${route.label}. Click "Search KTX & SRT" to retrieve schedules.`);
                }}
                className="ekr-glass-subtle px-2.5 py-1 rounded-lg text-[#10213D] dark:text-[#DCE5F0] font-medium cursor-pointer"
              >
                {route.label}
              </button>
            ))}
          </div>
        )}

        {routeHint && (
          <div className="mt-3 text-xs text-[#0754B8] dark:text-[#60A5FA] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{routeHint}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* External Booking Disclosure Bar */}
      <div className="ekr-glass-card rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#526685] dark:text-[#B8C9E5]">
        <div className="flex items-start sm:items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="text-[#10213D] dark:text-white">Information & Discovery Only:</strong> EveryKR displays official rail schedule & fare data without selling tickets or processing payments. Complete booking directly on Korail or SRT.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={bookingUrls.korailWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ekr-glass-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold"
          >
            Continue to Korail
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={bookingUrls.srtWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ekr-glass-subtle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#10213D] dark:text-white font-bold"
          >
            Continue to SRT
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Results Area */}
      {!searchResponse && !isSearching && (
        <div className="ekr-glass-card rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                South Korea High-Speed Rail Discovery
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-[#10213D] dark:text-white">
                Search official KTX, KTX-Sancheon, and SRT departures
              </h3>
              <p className="text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                Select your departure and destination stations, travel date (Asia/Seoul KST), and preferred departure time, then click <strong className="text-[#10213D] dark:text-white">Search KTX & SRT</strong>.
                {!tagoConfigured && (
                  <>
                    {' '}Live timetable retrieval requires the server-side Korea Public Data Portal (TAGO) key; official Korail and SRT booking links are always available below.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <a
                href={bookingUrls.korailWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ekr-glass-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold"
              >
                Continue to Korail
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={bookingUrls.korailTalkAndroidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ekr-glass-subtle inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#10213D] dark:text-white text-xs sm:text-sm font-bold"
              >
                <Smartphone className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                Open KorailTalk
              </a>
              <a
                href={bookingUrls.srtWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ekr-glass-subtle inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#10213D] dark:text-white text-xs sm:text-sm font-bold"
              >
                Continue to SRT
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {searchResponse && (
        <div className="space-y-4">
          {/* Summary & Sort Bar */}
          <div className="ekr-glass-panel rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm sm:text-base font-extrabold text-[#10213D] dark:text-white">
                {searchResponse.query.origin.nameEn} → {searchResponse.query.destination.nameEn}
              </div>
              <div className="text-xs text-[#526685] dark:text-[#B8C9E5] flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
                <span>Date: {searchResponse.query.travelDate} (KST)</span>
                <span>·</span>
                <span>
                  Time: {searchResponse.query.showAllDepartures ? 'All departures' : `From ${searchResponse.query.preferredDepartureTime} KST`}
                </span>
                <span>·</span>
                <span>{searchResponse.query.passengers} passenger{searchResponse.query.passengers > 1 ? 's' : ''}</span>
                <span>·</span>
                <span>Source: {searchResponse.dataSource}</span>
                <span>·</span>
                <span>Updated: {new Date(searchResponse.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {sortedSchedules.length > 0 && (
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                <select
                  aria-label="Sort KTX results"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'earliest' | 'cheapest' | 'fastest' | 'latest')
                  }
                  className="ekr-glass-input px-3 py-2 rounded-xl text-xs font-bold"
                >
                  <option value="earliest" className="bg-white dark:bg-[#081634]">Sort: Earliest departure</option>
                  <option value="cheapest" className="bg-white dark:bg-[#081634]">Sort: Lowest price</option>
                  <option value="fastest" className="bg-white dark:bg-[#081634]">Sort: Shortest duration</option>
                  <option value="latest" className="bg-white dark:bg-[#081634]">Sort: Latest departure</option>
                </select>
              </div>
            )}
          </div>

          {/* Non-live states: External Access Required / No Schedules / Provider Error */}
          {searchResponse.status !== 'live_results' && (
            <div className="ekr-glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {searchResponse.status === 'external_access_required'
                      ? 'Official TAGO API Key Required for Live Timetables'
                      : searchResponse.status === 'no_schedules'
                      ? 'No Matching Departures Found'
                      : 'Provider Temporarily Unavailable'}
                  </div>
                  <p className="text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                    {searchResponse.message}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#0754B8]/10 dark:border-white/10">
                {searchResponse.status === 'no_schedules' &&
                  searchResponse.totalSchedulesForDate > 0 &&
                  !searchResponse.query.showAllDepartures && (
                    <button
                      type="button"
                      onClick={() => executeKtxSearch(true)}
                      className="ekr-glass-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      View all {searchResponse.totalSchedulesForDate} departures on {searchResponse.query.travelDate}
                    </button>
                  )}

                <a
                  href={searchResponse.officialBookingLinks.korailWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ekr-glass-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
                >
                  Continue to Korail
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={searchResponse.officialBookingLinks.korailTalkAndroidUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ekr-glass-subtle inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#10213D] dark:text-white text-xs font-bold"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Open KorailTalk (Android)
                </a>
                <a
                  href={searchResponse.officialBookingLinks.korailTalkIosUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ekr-glass-subtle inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#10213D] dark:text-white text-xs font-bold"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  KorailTalk (iOS)
                </a>
                {searchResponse.officialBookingLinks.supportsSrtOnRoute && (
                  <a
                    href={searchResponse.officialBookingLinks.srtWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ekr-glass-subtle inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#10213D] dark:text-white text-xs font-bold"
                  >
                    Continue to SRT
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Live Schedule Cards */}
          {sortedSchedules.length > 0 && (
            <div className="space-y-3">
              {sortedSchedules.map((train) => (
                <div
                  key={train.id}
                  className="ekr-glass-card rounded-2xl p-4 sm:p-5"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Operator & Train */}
                    <div className="lg:col-span-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-extrabold uppercase tracking-wider ${
                            train.operator === 'SRT'
                              ? 'text-purple-700 dark:text-purple-300'
                              : 'text-[#0754B8] dark:text-[#60A5FA]'
                          }`}
                        >
                          {train.operator}
                        </span>
                        <span className="text-sm font-extrabold text-[#10213D] dark:text-white">
                          {train.trainName}
                        </span>
                      </div>
                      <div className="text-xs text-[#526685] dark:text-[#B8C9E5] font-mono tabular-nums">
                        Train #{train.trainNumber}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="lg:col-span-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xl font-extrabold text-[#10213D] dark:text-white tabular-nums">
                          {train.departureTimeKst}
                        </div>
                        <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate max-w-[130px]">
                          {train.departureStationNameEn}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-center px-2">
                        <div className="text-[11px] font-bold text-[#526685] dark:text-[#B8C9E5] tabular-nums">
                          {formatMinutesDuration(train.durationMinutes)}
                        </div>
                        <div className="w-full h-px bg-[#0754B8]/25 dark:bg-white/20 my-1" />
                        <div className="text-[10px] text-[#64748B] dark:text-[#8FA8CF] uppercase tracking-wider">Direct</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-extrabold text-[#10213D] dark:text-white tabular-nums">
                          {train.arrivalTimeKst || 'Unavailable'}
                        </div>
                        <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate max-w-[130px]">
                          {train.arrivalStationNameEn}
                        </div>
                      </div>
                    </div>

                    {/* Official Fares & Availability */}
                    <div className="lg:col-span-3 space-y-1 text-xs border-t lg:border-t-0 lg:border-l border-[#0754B8]/12 dark:border-white/12 pt-3 lg:pt-0 lg:pl-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#526685] dark:text-[#B8C9E5]">Standard (Adult):</span>
                        <span className="text-base font-extrabold text-[#10213D] dark:text-white tabular-nums">
                          {formatKrwFare(train.standardFareKrw)}
                        </span>
                      </div>
                      {train.passengersRequested > 1 && train.estimatedTotalStandardKrw !== null && (
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#526685] dark:text-[#B8C9E5] tabular-nums">
                          <span>Total ({train.passengersRequested} pax):</span>
                          <span className="font-bold text-[#10213D] dark:text-white">
                            {formatKrwFare(train.estimatedTotalStandardKrw)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-[#8FA8CF]">
                        <span>First Class:</span>
                        <span>Information unavailable</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-[#8FA8CF]">
                        <span>Live Seats:</span>
                        <span>Information unavailable</span>
                      </div>
                    </div>

                    {/* External Booking Actions */}
                    <div className="lg:col-span-2 flex flex-col gap-2">
                      <a
                        href={train.bookingLinks.primaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ekr-glass-btn-primary w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold"
                      >
                        {train.bookingLinks.primaryLabel}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {train.bookingLinks.secondaryUrl && train.bookingLinks.secondaryLabel && (
                        <a
                          href={train.bookingLinks.secondaryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ekr-glass-subtle w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[#10213D] dark:text-white text-[11px] font-bold"
                        >
                          {train.bookingLinks.secondaryLabel}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
