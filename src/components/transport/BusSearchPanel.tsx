import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  Bus,
  Calendar,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  BusSearchApiResponse,
  BusTerminalItem,
  FeaturedRouteItem,
  formatKrwFare,
  formatMinutesDuration,
  getKstDateWithOffset,
  getKstTodayIso,
  OfficialExternalBookingUrls,
  QUICK_DEPARTURE_TIMES,
} from './transportTypes';

interface BusSearchPanelProps {
  bookingUrls: OfficialExternalBookingUrls;
  featuredRoutes: FeaturedRouteItem[];
  tagoConfigured: boolean;
}

export const BusSearchPanel: React.FC<BusSearchPanelProps> = ({
  bookingUrls,
  featuredRoutes,
  tagoConfigured,
}) => {
  const [terminals, setTerminals] = useState<BusTerminalItem[]>([]);
  const [busType, setBusType] = useState<'all' | 'express' | 'intercity'>('all');
  const [busCategory, setBusCategory] = useState<'all' | 'general' | 'excellent' | 'premium'>('all');
  const [originId, setOriginId] = useState<string>('seoul_gyeongbu');
  const [destinationId, setDestinationId] = useState<string>('busan_central');
  const [travelDate, setTravelDate] = useState<string>(() => getKstDateWithOffset(1));
  const [preferredTime, setPreferredTime] = useState<string>('08:00');
  const [passengers, setPassengers] = useState<number>(1);
  const [showAllDepartures, setShowAllDepartures] = useState<boolean>(false);

  // Dropdown state
  const [originQuery, setOriginQuery] = useState<string>('');
  const [destQuery, setDestQuery] = useState<string>('');
  const [showOriginDropdown, setShowOriginDropdown] = useState<boolean>(false);
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);

  // Search state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<BusSearchApiResponse | null>(null);
  const [sortBy, setSortBy] = useState<'earliest' | 'cheapest' | 'fastest' | 'latest'>('earliest');
  const [routeHint, setRouteHint] = useState<string | null>(null);

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);
  const minDateKst = useMemo(() => getKstTodayIso(), []);
  const tomorrowDateKst = useMemo(() => getKstDateWithOffset(1), []);

  useEffect(() => {
    let active = true;
    fetch('/api/transport/bus/terminals')
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data.terminals)) {
          setTerminals(data.terminals);
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

  const modeFilteredTerminals = useMemo(() => {
    return terminals.filter((t) => {
      if (busType === 'express') return t.busModes === 'express' || t.busModes === 'both';
      if (busType === 'intercity') return t.busModes === 'intercity' || t.busModes === 'both';
      return true;
    });
  }, [terminals, busType]);

  const selectedOrigin = useMemo(
    () => terminals.find((t) => t.id === originId) || null,
    [terminals, originId]
  );
  const selectedDestination = useMemo(
    () => terminals.find((t) => t.id === destinationId) || null,
    [terminals, destinationId]
  );

  const filterTerminals = (qText: string) => {
    const q = qText.trim().toLowerCase();
    if (!q) return modeFilteredTerminals;
    return modeFilteredTerminals.filter(
      (t) =>
        t.nameEn.toLowerCase().includes(q) ||
        t.nameKo.toLowerCase().includes(q) ||
        t.cityEn.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.aliases.some((a) => a.toLowerCase().includes(q))
    );
  };

  const filteredOrigins = useMemo(() => filterTerminals(originQuery), [modeFilteredTerminals, originQuery]);
  const filteredDestinations = useMemo(() => filterTerminals(destQuery), [modeFilteredTerminals, destQuery]);

  const handleSwapTerminals = () => {
    const prev = originId;
    setOriginId(destinationId);
    setDestinationId(prev);
  };

  const executeBusSearch = async (overrideShowAll?: boolean) => {
    if (isSearching) return;
    setRouteHint(null);
    setErrorMessage(null);

    if (!originId || !destinationId) {
      setErrorMessage('Please select both departure and destination bus terminals.');
      return;
    }
    if (originId === destinationId) {
      setErrorMessage('Departure and destination terminals must be different.');
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
        busType,
        busCategory,
        showAllDepartures: String(effectiveShowAll),
      });
      const res = await fetch(`/api/transport/bus/search?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data?.error || 'Could not retrieve bus schedules.');
      } else {
        setSearchResponse(data as BusSearchApiResponse);
      }
    } catch {
      setErrorMessage('Network error contacting the bus timetable service. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const sortedSchedules = useMemo(() => {
    const list = searchResponse?.schedules || [];
    return [...list].sort((a, b) => {
      if (sortBy === 'latest') return b.departureIsoKst.localeCompare(a.departureIsoKst);
      if (sortBy === 'cheapest') {
        const fa = a.fareKrw ?? Number.MAX_SAFE_INTEGER;
        const fb = b.fareKrw ?? Number.MAX_SAFE_INTEGER;
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
      {/* Bus Search Form Glass Panel */}
      <div className="ekr-glass-panel text-[#10213D] dark:text-white rounded-2xl p-5 sm:p-6">
        {/* Top Row: Bus Service Type & Grade */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#0754B8]/12 dark:border-white/12">
          <div className="ekr-glass-subtle inline-flex rounded-xl p-1">
            {(
              [
                { id: 'all', label: 'All Buses' },
                { id: 'express', label: 'Express Bus (고속버스)' },
                { id: 'intercity', label: 'Intercity Bus (시외버스)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBusType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                  busType === tab.id
                    ? 'ekr-glass-btn-primary'
                    : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Bus seat category filter"
              value={busCategory}
              onChange={(e) =>
                setBusCategory(e.target.value as 'all' | 'general' | 'excellent' | 'premium')
              }
              className="ekr-glass-input px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-[#081634]">All Bus Classes</option>
              <option value="general" className="bg-white dark:bg-[#081634]">General (일반)</option>
              <option value="excellent" className="bg-white dark:bg-[#081634]">Excellent (우등)</option>
              <option value="premium" className="bg-white dark:bg-[#081634]">Premium (프리미엄)</option>
            </select>

            <div className="ekr-glass-input inline-flex items-center gap-2 px-3 py-1.5 rounded-xl">
              <Users className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
              <label htmlFor="bus-passengers" className="text-xs font-semibold text-[#526685] dark:text-[#B8C9E5]">
                Passengers
              </label>
              <select
                id="bus-passengers"
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

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Departure Terminal */}
          <div className="lg:col-span-4 relative" ref={originRef}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5] mb-1.5">
              Departure Terminal
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
                  {selectedOrigin ? selectedOrigin.nameEn : 'Select departure terminal'}
                </div>
                <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate">
                  {selectedOrigin ? `${selectedOrigin.nameKo} · ${selectedOrigin.region}` : 'Search bus terminals'}
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
                    placeholder="Search Seoul Express, Central City, Dong Seoul..."
                    className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg placeholder:text-[#64748B] dark:placeholder:text-[#B8C9E5]/60"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#0754B8]/10 dark:divide-white/10">
                  {filteredOrigins.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setOriginId(t.id);
                        setOriginQuery('');
                        setShowOriginDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-[#0875E8]/10 dark:hover:bg-white/10 transition flex items-center justify-between gap-2 cursor-pointer ${
                        t.id === originId ? 'bg-[#0875E8]/12 dark:bg-[#0875E8]/25' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#10213D] dark:text-white truncate">
                          {t.nameEn}
                        </div>
                        <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5] truncate">
                          {t.nameKo} · {t.cityEn}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-[#526685] dark:text-[#B8C9E5] shrink-0">
                        {t.busModes === 'both' ? 'Express & Intercity' : t.busModes}
                      </span>
                    </button>
                  ))}
                  {filteredOrigins.length === 0 && (
                    <div className="p-4 text-xs text-[#526685] dark:text-[#B8C9E5] text-center">No matching terminals found.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Swap */}
          <div className="lg:col-span-1 flex items-end justify-center pb-1">
            <button
              type="button"
              onClick={handleSwapTerminals}
              title="Swap departure and destination terminals"
              aria-label="Swap departure and destination terminals"
              className="ekr-glass-subtle w-10 h-10 rounded-xl hover:bg-[#0754B8] hover:text-white text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center transition cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Terminal */}
          <div className="lg:col-span-4 relative" ref={destRef}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5] mb-1.5">
              Destination Terminal
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
                  {selectedDestination ? selectedDestination.nameEn : 'Select destination terminal'}
                </div>
                <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate">
                  {selectedDestination ? `${selectedDestination.nameKo} · ${selectedDestination.region}` : 'Search bus terminals'}
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
                    placeholder="Search Busan, Daegu, Gwangju, Daejeon..."
                    className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg placeholder:text-[#64748B] dark:placeholder:text-[#B8C9E5]/60"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#0754B8]/10 dark:divide-white/10">
                  {filteredDestinations.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setDestinationId(t.id);
                        setDestQuery('');
                        setShowDestDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-[#0875E8]/10 dark:hover:bg-white/10 transition flex items-center justify-between gap-2 cursor-pointer ${
                        t.id === destinationId ? 'bg-[#0875E8]/12 dark:bg-[#0875E8]/25' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#10213D] dark:text-white truncate">
                          {t.nameEn}
                        </div>
                        <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5] truncate">
                          {t.nameKo} · {t.cityEn}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-[#526685] dark:text-[#B8C9E5] shrink-0">
                        {t.busModes === 'both' ? 'Express & Intercity' : t.busModes}
                      </span>
                    </button>
                  ))}
                  {filteredDestinations.length === 0 && (
                    <div className="p-4 text-xs text-[#526685] dark:text-[#B8C9E5] text-center">No matching terminals found.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Travel Date (KST) */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="bus-date"
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
                id="bus-date"
                type="date"
                min={minDateKst}
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="ekr-glass-input w-full pl-10 pr-3 py-3 rounded-xl text-sm font-bold tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Preferred Departure Time + CTA */}
        <div className="mt-4 pt-4 border-t border-[#0754B8]/10 dark:border-white/10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="bus-time"
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
                id="bus-time"
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
            onClick={() => executeBusSearch()}
            className="ekr-glass-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-extrabold disabled:opacity-60 cursor-pointer shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching Bus Schedules...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search Bus Schedules
              </>
            )}
          </button>
        </div>

        {/* Popular Bus Routes */}
        {featuredRoutes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#0754B8]/10 dark:border-white/10 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[#526685] dark:text-[#B8C9E5]">Popular bus routes:</span>
            {featuredRoutes.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => {
                  setOriginId(route.originId);
                  setDestinationId(route.destinationId);
                  setRouteHint(`Selected ${route.label}. Click "Search Bus Schedules" to retrieve timetables.`);
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
            <strong className="text-[#10213D] dark:text-white">Information & Discovery Only:</strong> Express & Intercity bus ticket booking and payment happen exclusively on official Korean bus portals (Kobus, Bustago, TxBus).
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={bookingUrls.kobusWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ekr-glass-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold"
          >
            Book on Kobus
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={bookingUrls.bustagoWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ekr-glass-subtle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#10213D] dark:text-white font-bold"
          >
            Book on Bustago
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={bookingUrls.txbusWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ekr-glass-subtle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#10213D] dark:text-white font-bold"
          >
            Book on TxBus
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Initial Guide State */}
      {!searchResponse && !isSearching && (
        <div className="ekr-glass-card rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA]">
                Express Bus (고속버스) & Intercity Bus (시외버스)
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-[#10213D] dark:text-white">
                Compare terminal schedules across General, Excellent, and Premium classes
              </h3>
              <p className="text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                Select your departure and arrival terminals, travel date (Asia/Seoul KST), and preferred departure time, then click <strong className="text-[#10213D] dark:text-white">Search Bus Schedules</strong>.
                {!tagoConfigured && (
                  <>
                    {' '}Live timetable retrieval requires the server-side TAGO Open API key; official Kobus, Bustago, and TxBus booking portals are ready below.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <a
                href={bookingUrls.kobusWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ekr-glass-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold"
              >
                <Bus className="w-4 h-4" />
                Book on Kobus
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={bookingUrls.bustagoWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ekr-glass-subtle inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#10213D] dark:text-white text-xs sm:text-sm font-bold"
              >
                Book on Bustago
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={bookingUrls.txbusWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ekr-glass-subtle inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#10213D] dark:text-white text-xs sm:text-sm font-bold"
              >
                Book on TxBus
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {searchResponse && (
        <div className="space-y-4">
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
                  aria-label="Sort bus schedules"
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

          {searchResponse.status !== 'live_results' && (
            <div className="ekr-glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {searchResponse.status === 'external_access_required'
                      ? 'Official TAGO Bus API Key Required for Live Timetables'
                      : searchResponse.status === 'no_schedules'
                      ? 'No Matching Bus Departures Found'
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
                      onClick={() => executeBusSearch(true)}
                      className="ekr-glass-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      View all {searchResponse.totalSchedulesForDate} departures on {searchResponse.query.travelDate}
                    </button>
                  )}

                {searchResponse.officialBookingLinks.recommendedPlatforms.includes('kobus') && (
                  <a
                    href={searchResponse.officialBookingLinks.kobusWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ekr-glass-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Book on Kobus (Express)
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {searchResponse.officialBookingLinks.recommendedPlatforms.includes('bustago') && (
                  <a
                    href={searchResponse.officialBookingLinks.bustagoWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ekr-glass-subtle inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#10213D] dark:text-white text-xs font-bold"
                  >
                    Book on Bustago (Intercity)
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {searchResponse.officialBookingLinks.recommendedPlatforms.includes('txbus') && (
                  <a
                    href={searchResponse.officialBookingLinks.txbusWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ekr-glass-subtle inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#10213D] dark:text-white text-xs font-bold"
                  >
                    Book on TxBus (T-money)
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {sortedSchedules.length > 0 && (
            <div className="space-y-3">
              {sortedSchedules.map((bus) => (
                <div
                  key={bus.id}
                  className="ekr-glass-card rounded-2xl p-4 sm:p-5"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Type & Class */}
                    <div className="lg:col-span-3 space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#0754B8] dark:text-[#60A5FA]">
                        {bus.serviceTypeLabel}
                      </div>
                      <div className="text-sm font-extrabold text-[#10213D] dark:text-white">
                        {bus.busGradeLabelEn}
                      </div>
                      <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5]">
                        {bus.departureTerminalNameKo} → {bus.arrivalTerminalNameKo}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="lg:col-span-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xl font-extrabold text-[#10213D] dark:text-white tabular-nums">
                          {bus.departureTimeKst}
                        </div>
                        <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate max-w-[130px]">
                          {bus.departureTerminalNameEn}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-center px-2">
                        <div className="text-[11px] font-bold text-[#526685] dark:text-[#B8C9E5] tabular-nums">
                          {formatMinutesDuration(bus.durationMinutes)}
                        </div>
                        <div className="w-full h-px bg-[#0754B8]/25 dark:bg-white/20 my-1" />
                        <div className="text-[10px] text-[#64748B] dark:text-[#8FA8CF] uppercase tracking-wider">
                          {bus.serviceType === 'express' ? 'Express' : 'Intercity'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-extrabold text-[#10213D] dark:text-white tabular-nums">
                          {bus.arrivalTimeKst || 'Unavailable'}
                        </div>
                        <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate max-w-[130px]">
                          {bus.arrivalTerminalNameEn}
                        </div>
                      </div>
                    </div>

                    {/* Fares & Availability */}
                    <div className="lg:col-span-3 space-y-1 text-xs border-t lg:border-t-0 lg:border-l border-[#0754B8]/12 dark:border-white/12 pt-3 lg:pt-0 lg:pl-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#526685] dark:text-[#B8C9E5]">Adult Fare:</span>
                        <span className="text-base font-extrabold text-[#10213D] dark:text-white tabular-nums">
                          {formatKrwFare(bus.fareKrw)}
                        </span>
                      </div>
                      {bus.passengersRequested > 1 && bus.estimatedTotalKrw !== null && (
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#526685] dark:text-[#B8C9E5] tabular-nums">
                          <span>Total ({bus.passengersRequested} pax):</span>
                          <span className="font-bold text-[#10213D] dark:text-white">
                            {formatKrwFare(bus.estimatedTotalKrw)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-[#8FA8CF]">
                        <span>Live Seats:</span>
                        <span>Information unavailable</span>
                      </div>
                    </div>

                    {/* Official Booking Links */}
                    <div className="lg:col-span-2 flex flex-col gap-2">
                      {bus.bookingLinks.map((link, idx) => (
                        <a
                          key={link.platform}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition ${
                            idx === 0
                              ? 'ekr-glass-btn-primary'
                              : 'ekr-glass-subtle text-[#10213D] dark:text-white'
                          }`}
                        >
                          {link.label}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ))}
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
