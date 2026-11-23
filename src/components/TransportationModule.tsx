import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plane,
  ArrowLeftRight,
  Calendar,
  Users,
  Search,
  ExternalLink,
  SlidersHorizontal,
  Bell,
  BellRing,
  Sparkles,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Luggage,
  RefreshCw,
  Trash2,
  Edit3,
  Plus,
  X,
  Compass,
  Award,
  Zap,
  TrendingDown,
  Globe,
  Info,
  ArrowRight,
  Building2,
  TrainFront,
  Bus,
  Car,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { KtxSearchPanel } from './transport/KtxSearchPanel';
import { BusSearchPanel } from './transport/BusSearchPanel';
import {
  OfficialExternalBookingUrls,
  PublicTransportHubConfig,
  QUICK_DEPARTURE_TIMES,
  TransportHubMode,
} from './transport/transportTypes';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

export interface AirportRecord {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  nearbyAirports: string[];
  popularRank: number;
}

export interface FlightSegment {
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  airlineLogoUrl: string;
  departureAirport: string;
  departureAirportName: string;
  departureCity: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalAirportName: string;
  arrivalCity: string;
  arrivalTime: string;
  durationMinutes: number;
  aircraft?: string;
  cabinClass: string;
}

export interface FlightLayover {
  airportCode: string;
  airportName: string;
  city: string;
  durationMinutes: number;
}

export type PriceFreshnessState = 'live_verified' | 'recently_updated' | 'indicative' | 'unavailable';

export interface ProviderComparisonQuote {
  providerId: string;
  providerName: string;
  providerType: 'ota' | 'metasearch' | 'airline';
  logoUrl: string;
  price: number | null;
  currency: string;
  freshness: PriceFreshnessState;
  verifiedAt: string | null;
  bookingUrl: string;
  actionLabel: string;
  notes: string;
}

export interface FlightOfferItem {
  id: string;
  sourceProviderId: string;
  sourceProviderName: string;
  airlineCode: string;
  airlineName: string;
  airlineLogoUrl: string;
  flightNumbers: string[];
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  totalDurationMinutes: number;
  stopsCount: number;
  isDirect: boolean;
  segments: FlightSegment[];
  layovers: FlightLayover[];
  returnSegments?: FlightSegment[];
  returnLayovers?: FlightLayover[];
  returnDurationMinutes?: number;
  returnStopsCount?: number;
  baggageAllowance: string;
  cabinClass: 'Economy' | 'Premium Economy' | 'Business' | 'First Class';
  refundPolicy: string;
  changePolicy: string;
  totalPrice: number;
  currency: string;
  verifiedAt: string;
  freshness: PriceFreshnessState;
  priceStatus?:
    | 'Live Price'
    | 'Indicative Price'
    | 'Price Verification Required'
    | 'Price Changed'
    | 'Offer Expired'
    | 'Price Unavailable';
  badges?: ('Cheapest Flight' | 'Fastest Flight' | 'Best Value')[];
  providerQuotes: ProviderComparisonQuote[];
}

export interface FlightOfferPriceVerificationResult {
  ok: boolean;
  offerId: string;
  providerId: string;
  verified: boolean;
  priceStatus:
    | 'Live Price'
    | 'Indicative Price'
    | 'Price Verification Required'
    | 'Price Changed'
    | 'Offer Expired'
    | 'Price Unavailable';
  originalPrice: number | null;
  verifiedPrice: number | null;
  currency: string;
  taxesAndFeesTotal: number | null;
  priceChanged: boolean;
  priceDifference: number | null;
  offerExpired: boolean;
  fareDetailsBySegment: Array<{
    segmentId: string;
    cabin: string;
    fareBasis?: string;
    brandedFare?: string;
    classCode?: string;
    includedCheckedBags?: string;
  }>;
  baggageAllowance: string;
  lastTicketingDate?: string;
  verifiedAt: string;
  message: string;
}

export interface RouteDiscoveryInsight {
  originAirport: AirportRecord;
  destinationAirport: AirportRecord;
  distanceKm: number;
  estimatedDirectDurationMinutes: number;
  nearbyOriginAirports: AirportRecord[];
  nearbyDestinationAirports: AirportRecord[];
  operatingAirlinesOnRoute: {
    code: string;
    name: string;
    logoUrl: string;
    officialUrl: string;
    typicalServiceType: 'Direct & Connecting' | 'Connecting Hub';
  }[];
}

export interface BookingProviderRecord {
  id: string;
  name: string;
  type: 'ota' | 'metasearch' | 'airline';
  logoUrl: string;
  officialUrl: string;
  affiliateBaseUrl: string;
  description: string;
  enabled: boolean;
  displayOrder: number;
  supportsDeepLink: boolean;
  badgeText?: string;
}

export interface UserPriceAlertRecord {
  id: string;
  userId: string;
  userEmail?: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureDate: string;
  returnDate?: string;
  tripType: 'one-way' | 'round-trip';
  targetPrice: number;
  currency: string;
  cabinClass: 'Economy' | 'Premium Economy' | 'Business' | 'First Class';
  enabled: boolean;
  lastCheckedAt: string | null;
  lastVerifiedLowestPrice: number | null;
  alertTriggered: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FlightSearchApiResponse {
  ok: boolean;
  searchId: string;
  liveApiConnected: boolean;
  connectedApiProviders: string[];
  unavailableApiProviders: { id: string; name: string; statusMessage: string }[];
  statusNotice: string;
  freshnessState: PriceFreshnessState;
  verifiedAt: string | null;
  offers: FlightOfferItem[];
  routeDiscovery: RouteDiscoveryInsight | null;
  providerComparisonLinks: ProviderComparisonQuote[];
  bookingDirectory: BookingProviderRecord[];
}

interface MultiCityLeg {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
}

const SUPPORTED_CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
];

const POPULAR_STUDENT_ROUTES = [
  { origin: 'ICN', destination: 'DAC', label: 'Seoul (ICN) → Dhaka (DAC)' },
  { origin: 'DAC', destination: 'ICN', label: 'Dhaka (DAC) → Seoul (ICN)' },
  { origin: 'PUS', destination: 'DAC', label: 'Busan (PUS) → Dhaka (DAC)' },
  { origin: 'ICN', destination: 'PUS', label: 'Seoul (ICN) → Busan (PUS)' },
  { origin: 'ICN', destination: 'SIN', label: 'Seoul (ICN) → Singapore (SIN)' },
  { origin: 'ICN', destination: 'KUL', label: 'Seoul (ICN) → Kuala Lumpur (KUL)' },
  { origin: 'ICN', destination: 'BKK', label: 'Seoul (ICN) → Bangkok (BKK)' },
  { origin: 'ICN', destination: 'NRT', label: 'Seoul (ICN) → Tokyo (NRT)' },
];

function getDefaultDepartureDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function getDefaultReturnDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 28);
  return d.toISOString().slice(0, 10);
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function formatTime(isoOrDate: string): string {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatShortDate(isoOrDate: string): string {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFreshnessBadgeMeta(freshness: PriceFreshnessState) {
  switch (freshness) {
    case 'live_verified':
      return {
        label: 'Live Verified',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'recently_updated':
      return {
        label: 'Recently Updated',
        className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
      };
    case 'indicative':
      return {
        label: 'Indicative',
        className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
      };
    case 'unavailable':
    default:
      return {
        label: 'Live Price Unavailable',
        className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      };
  }
}

export const TransportationModule: React.FC<{ language?: string }> = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialModeParam = (searchParams.get('service') || '').toLowerCase();
  const [activeServiceMode, setActiveServiceMode] = useState<TransportHubMode>(
    initialModeParam === 'ktx' || initialModeParam === 'bus' ? initialModeParam : 'airline'
  );
  const [hubConfig, setHubConfig] = useState<PublicTransportHubConfig>({
    services: {
      airline: { enabled: true },
      ktx: { enabled: true },
      bus: { enabled: true },
    },
    externalBookingUrls: {
      korailWebUrl: 'https://www.letskorail.com',
      korailTalkAndroidUrl: 'https://play.google.com/store/apps/details?id=com.korail.talk',
      korailTalkIosUrl: 'https://apps.apple.com/kr/app/id1000558562',
      srtWebUrl: 'https://etk.srail.kr',
      kobusWebUrl: 'https://www.kobus.co.kr/',
      bustagoWebUrl: 'https://www.bustago.or.kr/',
      txbusWebUrl: 'https://txbus.t-money.co.kr/',
      kakaoTaxiUrl: 'https://www.kakaocorp.com/page/service/service/KakaoT',
    },
    announcements: [],
    featuredRoutes: { ktx: [], bus: [] },
    providers: {
      tagoConfigured: false,
      tagoConnected: false,
      tagoProviderName: 'Korea Public Data Portal (TAGO Open API)',
    },
    timezone: 'Asia/Seoul',
    updatedAt: '',
  });
  const [preferredAirlineTime, setPreferredAirlineTime] = useState<string>('00:00');

  const handleSelectServiceMode = (mode: TransportHubMode) => {
    setActiveServiceMode(mode);
    const next = new URLSearchParams(searchParams);
    next.set('service', mode);
    setSearchParams(next, { replace: true });
  };

  // Airports state
  const [allAirports, setAllAirports] = useState<AirportRecord[]>([]);
  const [bookingProviders, setBookingProviders] = useState<BookingProviderRecord[]>([]);

  // Search form state
  const [tripType, setTripType] = useState<'round-trip' | 'one-way' | 'multi-city'>('round-trip');
  const [originIata, setOriginIata] = useState<string>('ICN');
  const [destinationIata, setDestinationIata] = useState<string>('DAC');
  const [departureDate, setDepartureDate] = useState<string>(getDefaultDepartureDate());
  const [returnDate, setReturnDate] = useState<string>(getDefaultReturnDate());
  const [adults, setAdults] = useState<number>(1);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [infants, setInfants] = useState<number>(0);
  const [cabinClass, setCabinClass] = useState<'Economy' | 'Premium Economy' | 'Business' | 'First Class'>('Economy');
  const [currency, setCurrency] = useState<string>('USD');
  const [nonStopOnly, setNonStopOnly] = useState<boolean>(false);

  // Multi-city legs
  const [multiCityLegs, setMultiCityLegs] = useState<MultiCityLeg[]>([
    { id: 'leg-1', origin: 'ICN', destination: 'DAC', departureDate: getDefaultDepartureDate() },
    { id: 'leg-2', origin: 'DAC', destination: 'PUS', departureDate: getDefaultReturnDate() },
  ]);

  // Autocomplete dropdown controls
  const [originQuery, setOriginQuery] = useState<string>('');
  const [destinationQuery, setDestinationQuery] = useState<string>('');
  const [showOriginDropdown, setShowOriginDropdown] = useState<boolean>(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState<boolean>(false);
  const [showPassengerPopover, setShowPassengerPopover] = useState<boolean>(false);

  const originDropdownRef = useRef<HTMLDivElement>(null);
  const destDropdownRef = useRef<HTMLDivElement>(null);
  const passengerPopoverRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchInFlightRef = useRef<boolean>(false);

  // Search execution & results state (strictly populated by manual Search Flights clicks)
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [routeSelectionHint, setRouteSelectionHint] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<FlightSearchApiResponse | null>(null);
  const [executedSearchMeta, setExecutedSearchMeta] = useState<{
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    tripType: 'round-trip' | 'one-way' | 'multi-city';
    totalPassengers: number;
    cabinClass: string;
    currency: string;
  } | null>(null);
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [verifyingOfferId, setVerifyingOfferId] = useState<string | null>(null);
  const [verifiedOffersById, setVerifiedOffersById] = useState<Record<string, FlightOfferPriceVerificationResult>>({});
  const [priceChangeConfirmedById, setPriceChangeConfirmedById] = useState<Record<string, boolean>>({});

  // Sorting & Filtering state
  const [sortBy, setSortBy] = useState<'best' | 'cheapest' | 'fastest' | 'earliest' | 'latest'>('best');
  const [stopsFilter, setStopsFilter] = useState<'any' | 'direct' | '1stop' | '2plus'>('any');
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [maxDurationHoursFilter, setMaxDurationHoursFilter] = useState<number>(36);
  const [departureTimeSlot, setDepartureTimeSlot] = useState<'any' | 'morning' | 'afternoon' | 'evening' | 'night'>('any');
  const [arrivalTimeSlot, setArrivalTimeSlot] = useState<'any' | 'morning' | 'afternoon' | 'evening' | 'night'>('any');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // User Price Alerts state
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [priceAlerts, setPriceAlerts] = useState<UserPriceAlertRecord[]>([]);
  const [showCreateAlertModal, setShowCreateAlertModal] = useState<boolean>(false);
  const [alertTargetPrice, setAlertTargetPrice] = useState<string>('450');
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);

  // Auth listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u: any) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // Load initial airport directory, booking providers, & transport hub config ONLY (NO automatic flight search on mount)
  useEffect(() => {
    let mounted = true;
    async function bootstrapMetadata() {
      try {
        const [airportsRes, providersRes, hubRes] = await Promise.all([
          fetch('/api/flights/airports?q='),
          fetch('/api/flights/providers'),
          fetch('/api/transport/hub-config'),
        ]);
        if (airportsRes.ok) {
          const data = await airportsRes.json();
          if (mounted && Array.isArray(data.airports)) {
            setAllAirports(data.airports);
          }
        }
        if (providersRes.ok) {
          const data = await providersRes.json();
          if (mounted && Array.isArray(data.bookingProviders)) {
            setBookingProviders(data.bookingProviders);
          }
        }
        if (hubRes.ok) {
          const data = await hubRes.json();
          if (mounted && data.ok && data.services) {
            setHubConfig(data as PublicTransportHubConfig);
          }
        }
      } catch {
        // Fallback handled gracefully
      }
    }
    bootstrapMetadata();
    return () => {
      mounted = false;
    };
  }, []);

  // Load user price alerts from API + Firestore sync
  useEffect(() => {
    if (!currentUser) {
      setPriceAlerts([]);
      return;
    }

    let active = true;
    fetch(`/api/flights/price-alerts?userId=${encodeURIComponent(currentUser.uid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data.alerts)) {
          setPriceAlerts(data.alerts);
        }
      })
      .catch(() => {});

    const qAlerts = query(
      collection(db, 'flight_price_alerts'),
      where('userId', '==', currentUser.uid)
    );
    const unsubFirestore = onSnapshot(
      qAlerts,
      (snap) => {
        if (!active || snap.empty) return;
        const docs: UserPriceAlertRecord[] = [];
        snap.forEach((d) => {
          docs.push({ id: d.id, ...(d.data() as Omit<UserPriceAlertRecord, 'id'>) });
        });
        docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setPriceAlerts(docs);
      },
      () => {}
    );

    return () => {
      active = false;
      unsubFirestore();
    };
  }, [currentUser]);

  // Outside click handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (originDropdownRef.current && !originDropdownRef.current.contains(e.target as Node)) {
        setShowOriginDropdown(false);
      }
      if (destDropdownRef.current && !destDropdownRef.current.contains(e.target as Node)) {
        setShowDestinationDropdown(false);
      }
      if (passengerPopoverRef.current && !passengerPopoverRef.current.contains(e.target as Node)) {
        setShowPassengerPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOriginAirport = useMemo(
    () => allAirports.find((a) => a.iata === originIata) || null,
    [allAirports, originIata]
  );

  const selectedDestAirport = useMemo(
    () => allAirports.find((a) => a.iata === destinationIata) || null,
    [allAirports, destinationIata]
  );

  const filteredOriginAirports = useMemo(() => {
    const q = originQuery.trim().toLowerCase();
    if (!q) return allAirports.slice(0, 20);
    return allAirports.filter(
      (a) =>
        a.iata.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
    );
  }, [allAirports, originQuery]);

  const filteredDestAirports = useMemo(() => {
    const q = destinationQuery.trim().toLowerCase();
    if (!q) return allAirports.slice(0, 20);
    return allAirports.filter(
      (a) =>
        a.iata.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
    );
  }, [allAirports, destinationQuery]);

  const handleSwapAirports = () => {
    const prevOrigin = originIata;
    setOriginIata(destinationIata);
    setDestinationIata(prevOrigin);
  };

  /**
   * Manual-only Flight Search Handler.
   * Invoked EXCLUSIVELY when the user clicks the "Search Flights" button.
   * Enforces synchronous duplicate-request locking and comprehensive parameter validation.
   */
  const handleManualSearchSubmit = async () => {
    // Synchronous guard prevents rapid double-clicks or concurrent duplicate requests
    if (searchInFlightRef.current || isSearching) {
      return;
    }

    setRouteSelectionHint(null);

    const nowLocal = new Date();
    const todayIso = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(
      nowLocal.getDate()
    ).padStart(2, '0')}`;
    const isValidIsoDate = (val: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
      const parsed = Date.parse(`${val}T00:00:00Z`);
      return Number.isFinite(parsed);
    };

    // 1. Validate passenger counts
    const passengerSum = adults + childrenCount + infants;
    if (!Number.isInteger(adults) || adults < 1) {
      setSearchError('At least 1 adult passenger is required to search flights.');
      return;
    }
    if (childrenCount < 0 || infants < 0 || passengerSum > 9) {
      setSearchError('Total passenger count must be between 1 and 9 travelers.');
      return;
    }
    if (infants > adults) {
      setSearchError('Number of lap infants cannot exceed the number of adult passengers.');
      return;
    }

    // 2. Validate cabin class & currency
    const validCabins = ['Economy', 'Premium Economy', 'Business', 'First Class'];
    if (!validCabins.includes(cabinClass)) {
      setSearchError('Please select a valid cabin class.');
      return;
    }
    if (!SUPPORTED_CURRENCIES.some((c) => c.code === currency)) {
      setSearchError('Please select a supported display currency.');
      return;
    }

    // 3. Validate route & dates per trip type
    const activeOrigin = (tripType === 'multi-city' ? multiCityLegs[0]?.origin : originIata || '')
      .trim()
      .toUpperCase();
    const activeDest = (tripType === 'multi-city' ? multiCityLegs[0]?.destination : destinationIata || '')
      .trim()
      .toUpperCase();
    const activeDepDate = (
      tripType === 'multi-city' ? multiCityLegs[0]?.departureDate : departureDate || ''
    ).trim();
    const activeRetDate = returnDate.trim();

    if (tripType === 'multi-city') {
      if (multiCityLegs.length < 2) {
        setSearchError('Multi-city search requires at least 2 flight legs.');
        return;
      }
      for (let i = 0; i < multiCityLegs.length; i++) {
        const leg = multiCityLegs[i];
        const legOrigin = String(leg.origin || '').trim().toUpperCase();
        const legDest = String(leg.destination || '').trim().toUpperCase();
        const legDate = String(leg.departureDate || '').trim();
        if (!/^[A-Z]{3}$/.test(legOrigin) || !/^[A-Z]{3}$/.test(legDest)) {
          setSearchError(`Flight ${i + 1}: Please select valid origin and destination airports.`);
          return;
        }
        if (legOrigin === legDest) {
          setSearchError(`Flight ${i + 1}: Origin and destination airports cannot be the same.`);
          return;
        }
        if (!isValidIsoDate(legDate)) {
          setSearchError(`Flight ${i + 1}: Please choose a valid departure date (YYYY-MM-DD).`);
          return;
        }
        if (legDate < todayIso) {
          setSearchError(`Flight ${i + 1}: Departure date cannot be in the past.`);
          return;
        }
        if (i > 0 && legDate < multiCityLegs[i - 1].departureDate) {
          setSearchError(
            `Flight ${i + 1} departure date (${legDate}) cannot be earlier than Flight ${i} (${multiCityLegs[i - 1].departureDate}).`
          );
          return;
        }
      }
    } else {
      if (!/^[A-Z]{3}$/.test(activeOrigin) || !/^[A-Z]{3}$/.test(activeDest)) {
        setSearchError('Please select valid 3-letter IATA origin and destination airports.');
        return;
      }
      if (activeOrigin === activeDest) {
        setSearchError('Origin and destination airports cannot be the same. Please select two different airports.');
        return;
      }
      if (!isValidIsoDate(activeDepDate)) {
        setSearchError('Please select a valid departure date (YYYY-MM-DD).');
        return;
      }
      if (activeDepDate < todayIso) {
        setSearchError('Departure date cannot be in the past. Please choose today or an upcoming date.');
        return;
      }
      if (tripType === 'round-trip') {
        if (!isValidIsoDate(activeRetDate)) {
          setSearchError('Please select a valid return date for your round-trip flight.');
          return;
        }
        if (activeRetDate < activeDepDate) {
          setSearchError('Return date must be on or after the departure date.');
          return;
        }
      }
    }

    // Lock in-flight guard synchronously before dispatching exact 1 search request
    searchInFlightRef.current = true;
    setSearchError(null);
    setIsSearching(true);

    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: activeOrigin,
          destination: activeDest,
          departureDate: activeDepDate,
          returnDate: tripType === 'round-trip' ? activeRetDate : undefined,
          tripType,
          multiCityLegs: tripType === 'multi-city' ? multiCityLegs : undefined,
          passengers: {
            adults,
            children: childrenCount,
            infants,
          },
          cabinClass,
          currency,
          directOnly: nonStopOnly,
          stops: nonStopOnly ? 'direct' : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        setSearchError(data.error || 'Unable to complete flight search. Please verify your dates and airports.');
      } else {
        setSearchResult(data);
        setExecutedSearchMeta({
          origin: activeOrigin,
          destination: activeDest,
          departureDate: activeDepDate,
          returnDate: tripType === 'round-trip' ? activeRetDate : undefined,
          tripType,
          totalPassengers: passengerSum,
          cabinClass,
          currency,
        });
        if (Array.isArray(data.bookingDirectory) && data.bookingDirectory.length > 0) {
          setBookingProviders(data.bookingDirectory);
        }
        // Reset client-side result filters when newly fetched offers arrive
        setSelectedAirlines([]);
        setMaxPriceFilter(null);
        setStopsFilter(nonStopOnly ? 'direct' : 'any');
        setExpandedOfferId(null);
      }
    } catch {
      setSearchError('Network error while contacting the flight comparison service. Please try again.');
    } finally {
      searchInFlightRef.current = false;
      setIsSearching(false);
    }
  };

  const handleVerifyOfferPrice = async (offer: FlightOfferItem) => {
    setVerifyingOfferId(offer.id);
    setExpandedOfferId(offer.id);
    try {
      const res = await fetch('/api/flights/verify-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.id,
          offer,
        }),
      });
      const data: FlightOfferPriceVerificationResult = await res.json();
      setVerifiedOffersById((prev) => ({
        ...prev,
        [offer.id]: data,
      }));
    } catch {
      setVerifiedOffersById((prev) => ({
        ...prev,
        [offer.id]: {
          ok: false,
          offerId: offer.id,
          providerId: offer.sourceProviderId,
          verified: false,
          priceStatus: 'Price Unavailable',
          originalPrice: offer.totalPrice,
          verifiedPrice: null,
          currency: offer.currency,
          taxesAndFeesTotal: null,
          priceChanged: false,
          priceDifference: null,
          offerExpired: false,
          fareDetailsBySegment: [],
          baggageAllowance: offer.baggageAllowance,
          verifiedAt: new Date().toISOString(),
          message: 'Live price verification is temporarily unavailable. Please verify final fare on the booking provider website.',
        },
      }));
    } finally {
      setVerifyingOfferId(null);
    }
  };

  const handleProviderRedirect = async (
    providerId: string,
    providerName: string,
    bookingUrl: string,
    customOrigin?: string,
    customDest?: string
  ) => {
    try {
      fetch('/api/flights/redirect-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          providerName,
          origin: customOrigin || originIata,
          destination: customDest || destinationIata,
          departureDate,
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking telemetry
    }
    const anchor = document.createElement('a');
    anchor.href = bookingUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Filtered & sorted live flight offers
  const availableAirlinesInOffers = useMemo(() => {
    if (!searchResult?.offers) return [];
    const map = new Map<string, string>();
    searchResult.offers.forEach((o) => {
      map.set(o.airlineCode, o.airlineName);
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [searchResult]);

  const filteredAndSortedOffers = useMemo(() => {
    if (!searchResult?.offers) return [];
    const matchTimeSlot = (isoStr: string, slot: string) => {
      if (slot === 'any') return true;
      const d = new Date(isoStr);
      if (Number.isNaN(d.getTime())) return true;
      const hr = d.getHours();
      if (slot === 'morning') return hr >= 5 && hr < 12;
      if (slot === 'afternoon') return hr >= 12 && hr < 17;
      if (slot === 'evening') return hr >= 17 && hr < 21;
      if (slot === 'night') return hr >= 21 || hr < 5;
      return true;
    };

    const filtered = searchResult.offers.filter((offer) => {
      if (stopsFilter === 'direct' && offer.stopsCount !== 0) return false;
      if (stopsFilter === '1stop' && offer.stopsCount !== 1) return false;
      if (stopsFilter === '2plus' && offer.stopsCount < 2) return false;
      if (selectedAirlines.length > 0 && !selectedAirlines.includes(offer.airlineCode)) return false;
      if (maxPriceFilter !== null && offer.totalPrice > maxPriceFilter) return false;
      if (offer.totalDurationMinutes > maxDurationHoursFilter * 60) return false;
      if (!matchTimeSlot(offer.departureTime, departureTimeSlot)) return false;
      if (!matchTimeSlot(offer.arrivalTime, arrivalTimeSlot)) return false;
      if (preferredAirlineTime && preferredAirlineTime !== '00:00') {
        const depDateObj = new Date(offer.departureTime);
        if (!Number.isNaN(depDateObj.getTime())) {
          const [prefH, prefM] = preferredAirlineTime.split(':').map(Number);
          const depTotalMins = depDateObj.getHours() * 60 + depDateObj.getMinutes();
          if (depTotalMins < prefH * 60 + prefM) return false;
        }
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'cheapest') return a.totalPrice - b.totalPrice;
      if (sortBy === 'fastest') return a.totalDurationMinutes - b.totalDurationMinutes;
      if (sortBy === 'earliest') return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
      if (sortBy === 'latest') return new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime();
      // 'best': balance price and duration
      const scoreA = a.totalPrice + a.totalDurationMinutes * 0.45;
      const scoreB = b.totalPrice + b.totalDurationMinutes * 0.45;
      return scoreA - scoreB;
    });
  }, [
    searchResult,
    stopsFilter,
    selectedAirlines,
    maxPriceFilter,
    maxDurationHoursFilter,
    departureTimeSlot,
    arrivalTimeSlot,
    preferredAirlineTime,
    sortBy,
  ]);

  // Price Alerts CRUD
  const handleCreatePriceAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const numericTarget = Number(alertTargetPrice);
    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      setAlertFeedback('Please enter a valid positive target price.');
      return;
    }

    try {
      const response = await fetch('/api/flights/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          userEmail: currentUser.email || '',
          origin: originIata,
          destination: destinationIata,
          departureDate,
          returnDate: tripType === 'round-trip' ? returnDate : undefined,
          tripType: tripType === 'round-trip' ? 'round-trip' : 'one-way',
          targetPrice: numericTarget,
          currency,
          cabinClass,
        }),
      });
      const data = await response.json();
      if (response.ok && data.alert) {
        const alertObj: UserPriceAlertRecord = data.alert;
        setPriceAlerts((prev) => [alertObj, ...prev.filter((x) => x.id !== alertObj.id)]);
        // Also persist to Firestore if permitted
        try {
          await setDoc(doc(db, 'flight_price_alerts', alertObj.id), alertObj);
        } catch {
          // Server already holds authoritative record
        }
        setShowCreateAlertModal(false);
        setAlertFeedback(`Price alert created for ${originIata} → ${destinationIata} at ${currency} ${numericTarget}.`);
        setTimeout(() => setAlertFeedback(null), 5000);
      }
    } catch {
      setAlertFeedback('Could not save price alert. Please try again.');
    }
  };

  const handleToggleAlert = async (alertItem: UserPriceAlertRecord) => {
    if (!currentUser) return;
    const nextEnabled = !alertItem.enabled;
    try {
      const res = await fetch(`/api/flights/price-alerts/${alertItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          enabled: nextEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok && data.alert) {
        setPriceAlerts((prev) => prev.map((a) => (a.id === alertItem.id ? data.alert : a)));
        try {
          await setDoc(doc(db, 'flight_price_alerts', alertItem.id), data.alert, { merge: true });
        } catch {}
      }
    } catch {}
  };

  const handleSaveEditedAlertPrice = async (alertItem: UserPriceAlertRecord) => {
    if (!currentUser) return;
    const numericPrice = Number(editingPriceValue);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return;
    try {
      const res = await fetch(`/api/flights/price-alerts/${alertItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          targetPrice: numericPrice,
        }),
      });
      const data = await res.json();
      if (res.ok && data.alert) {
        setPriceAlerts((prev) => prev.map((a) => (a.id === alertItem.id ? data.alert : a)));
        try {
          await setDoc(doc(db, 'flight_price_alerts', alertItem.id), data.alert, { merge: true });
        } catch {}
      }
    } catch {}
    setEditingAlertId(null);
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/flights/price-alerts/${alertId}?userId=${encodeURIComponent(currentUser.uid)}`, {
        method: 'DELETE',
      });
      setPriceAlerts((prev) => prev.filter((a) => a.id !== alertId));
      try {
        await deleteDoc(doc(db, 'flight_price_alerts', alertId));
      } catch {}
    } catch {}
  };

  const totalPassengers = adults + childrenCount + infants;

  const visibleAnnouncements = useMemo(
    () =>
      (hubConfig.announcements || []).filter(
        (a) => a.enabled && (a.service === 'all' || a.service === activeServiceMode)
      ),
    [hubConfig.announcements, activeServiceMode]
  );

  const hubBookingUrls: OfficialExternalBookingUrls = hubConfig.externalBookingUrls;

  return (
    <div className="min-h-screen bg-transparent text-[#10213D] dark:text-white pb-20">
      {/* SMART TRANSPORTATION HUB HERO */}
      <section className="relative overflow-hidden bg-transparent text-[#10213D] dark:text-white pt-8 sm:pt-10 pb-12 px-4 sm:px-6 lg:px-8 border-b border-[#0754B8]/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Hub Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-7">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2">
                <span className="w-4 h-0.5 rounded-full bg-[#FFB800]" aria-hidden="true" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0754B8] dark:text-[#60A5FA]">
                  Smart Travel Discovery · Flights · KTX · Bus
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#061B49] dark:text-white">
                Tickets &amp; Transport
              </h1>
              <p className="text-sm sm:text-base text-[#4B607F] dark:text-[#B8C9E5] max-w-2xl leading-relaxed">
                Explore flights, high-speed trains, and bus services. Compare schedules, travel times, and fares in one place.
              </p>
            </div>

            {/* Price Alert Trigger Button (Airline mode) */}
            {activeServiceMode === 'airline' && hubConfig.services.airline.enabled && (
              <div className="flex items-center gap-3 self-start md:self-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      setAlertFeedback('Please sign in to your EveryKR account to create and manage route price alerts.');
                      setTimeout(() => setAlertFeedback(null), 5000);
                      return;
                    }
                    setShowCreateAlertModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ekr-glass-subtle hover:border-[#0754B8]/40 dark:hover:border-[#0875E8]/50 text-[#061B49] dark:text-white text-sm font-semibold transition cursor-pointer"
                >
                  <BellRing className="w-4 h-4 text-[#0754B8] dark:text-[#FFB800]" />
                  Track Route Price ({originIata} → {destinationIata})
                </button>
              </div>
            )}
          </div>

          {/* 3-MODE TRANSPORTATION SERVICE SELECTOR */}
          <div
            role="tablist"
            aria-label="Transportation services"
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7"
          >
            {(
              [
                {
                  id: 'airline' as const,
                  title: 'Airline',
                  subtitle: 'International & domestic flights',
                  meta: 'Live fare comparison · Direct booking redirects',
                  icon: Plane,
                  enabled: hubConfig.services.airline.enabled,
                },
                {
                  id: 'ktx' as const,
                  title: 'KTX Train',
                  subtitle: 'KTX, KTX-Sancheon & SRT rail',
                  meta: 'Official Korail & SRT schedule discovery',
                  icon: TrainFront,
                  enabled: hubConfig.services.ktx.enabled,
                },
                {
                  id: 'bus' as const,
                  title: 'Bus',
                  subtitle: 'Express (고속) & Intercity (시외)',
                  meta: 'Kobus, Bustago & TxBus official portals',
                  icon: Bus,
                  enabled: hubConfig.services.bus.enabled,
                },
              ]
            ).map((card) => {
              const Icon = card.icon;
              const isActive = activeServiceMode === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelectServiceMode(card.id)}
                  className={`text-left p-4 sm:p-5 rounded-2xl transition flex items-start gap-3.5 cursor-pointer ${
                    isActive
                      ? 'ekr-glass-card-active'
                      : 'ekr-glass-card'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isActive
                        ? 'bg-[#0754B8] text-white shadow-sm'
                        : 'bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] border border-[#0754B8]/15 dark:border-[#0875E8]/30'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-extrabold tracking-tight text-[#061B49] dark:text-white">
                        {card.title}
                      </span>
                      {!card.enabled && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          Paused
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs font-semibold mt-0.5 ${
                        isActive ? 'text-[#0754B8] dark:text-[#60A5FA]' : 'text-[#0754B8]/90 dark:text-sky-300'
                      }`}
                    >
                      {card.subtitle}
                    </div>
                    <div className="text-[11px] mt-1 truncate text-[#526685] dark:text-[#B8C9E5]">
                      {card.meta}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {alertFeedback && (
            <div className="mb-6 p-4 rounded-xl ekr-glass-panel border-sky-400/40 text-[#0754B8] dark:text-sky-200 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-[#0754B8] dark:text-sky-300 shrink-0" />
                <span>{alertFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setAlertFeedback(null)}
                className="text-[#526685] dark:text-sky-200 hover:text-[#10213D] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* MAIN FLIGHT SEARCH PANEL (AIRLINE MODE ONLY — 100% PRESERVED) */}
          {activeServiceMode === 'airline' && hubConfig.services.airline.enabled && (
          <div
            ref={searchPanelRef}
            className="ekr-glass-panel text-[#10213D] dark:text-white rounded-3xl p-5 sm:p-6"
          >
            {/* Top Controls Row: Trip Type, Passengers, Cabin Class, Currency */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-[#0754B8]/10 dark:border-white/10">
              {/* Trip Type Tabs */}
              <div className="inline-flex rounded-xl ekr-glass-subtle p-1">
                {(
                  [
                    { id: 'round-trip', label: 'Round-trip' },
                    { id: 'one-way', label: 'One-way' },
                    { id: 'multi-city', label: 'Multi-city' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTripType(t.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      tripType === t.id
                        ? 'ekr-glass-btn-primary text-white shadow-sm'
                        : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Right Selectors: Passengers, Cabin, Currency */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Passenger Popover */}
                <div className="relative" ref={passengerPopoverRef}>
                  <button
                    type="button"
                    onClick={() => setShowPassengerPopover((v) => !v)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl ekr-glass-input text-xs sm:text-sm font-medium transition cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                    <span>
                      {totalPassengers} {totalPassengers === 1 ? 'Passenger' : 'Passengers'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {showPassengerPopover && (
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl ekr-glass-dropdown p-4 z-50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-[#10213D] dark:text-white">Adults</div>
                          <div className="text-xs text-[#526685] dark:text-[#B8C9E5]">Age 12+</div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setAdults(Math.max(1, adults - 1))}
                            className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-sm font-semibold">{adults}</span>
                          <button
                            type="button"
                            onClick={() => setAdults(Math.min(9, adults + 1))}
                            className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">Children</div>
                          <div className="text-xs text-slate-500">Ages 2–11</div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                            className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-sm font-semibold">{childrenCount}</span>
                          <button
                            type="button"
                            onClick={() => setChildrenCount(Math.min(8, childrenCount + 1))}
                            className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">Infants</div>
                          <div className="text-xs text-slate-500">Under 2, on lap</div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setInfants(Math.max(0, infants - 1))}
                            className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-sm font-semibold">{infants}</span>
                          <button
                            type="button"
                            onClick={() => setInfants(Math.min(adults, infants + 1))}
                            className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPassengerPopover(false)}
                        className="w-full py-2 rounded-xl ekr-glass-btn-primary text-xs font-semibold transition cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>

                {/* Cabin Class Selector */}
                <select
                  aria-label="Cabin Class"
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value as typeof cabinClass)}
                  className="px-3.5 py-2 rounded-xl ekr-glass-input text-xs sm:text-sm font-medium outline-none cursor-pointer"
                >
                  <option value="Economy" className="bg-white dark:bg-[#0B204A]">Economy</option>
                  <option value="Premium Economy" className="bg-white dark:bg-[#0B204A]">Premium Economy</option>
                  <option value="Business" className="bg-white dark:bg-[#0B204A]">Business</option>
                  <option value="First Class" className="bg-white dark:bg-[#0B204A]">First Class</option>
                </select>

                {/* Currency Selector */}
                <select
                  aria-label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-3.5 py-2 rounded-xl ekr-glass-input text-xs sm:text-sm font-semibold outline-none cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-white dark:bg-[#0B204A]">
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>

                {/* Preferred Departure Time Filter (Client-side filter on results — does not trigger auto-search) */}
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl ekr-glass-input text-xs sm:text-sm font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                  <select
                    aria-label="Preferred Departure Time"
                    value={preferredAirlineTime}
                    onChange={(e) => setPreferredAirlineTime(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer tabular-nums"
                  >
                    {QUICK_DEPARTURE_TIMES.map((slot) => (
                      <option key={slot.value} value={slot.value} className="bg-white dark:bg-[#0B204A]">
                        {slot.value === '00:00' ? 'Depart: Any time' : `Depart ≥ ${slot.label}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Non-stop flights toggle */}
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl ekr-glass-input text-xs sm:text-sm font-semibold cursor-pointer select-none transition">
                  <input
                    type="checkbox"
                    checked={nonStopOnly}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNonStopOnly(checked);
                      setStopsFilter(checked ? 'direct' : 'any');
                    }}
                    className="w-4 h-4 rounded text-[#0754B8] focus:ring-[#0875E8]"
                  />
                  <span>Non-stop only</span>
                </label>
              </div>
            </div>

            {/* SEARCH INPUTS GRID: ONE-WAY / ROUND-TRIP */}
            {tripType !== 'multi-city' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                {/* FROM AIRPORT AUTOCOMPLETE */}
                <div className="lg:col-span-4 relative" ref={originDropdownRef}>
                  <div
                    onClick={() => setShowOriginDropdown(true)}
                    className="h-full rounded-xl ekr-glass-input px-4 py-3 hover:border-[#0754B8]/50 transition cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5]">
                      From (Origin)
                    </span>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="truncate">
                        <div className="text-base font-bold text-[#10213D] dark:text-white truncate">
                          {selectedOriginAirport ? `${selectedOriginAirport.city} (${selectedOriginAirport.iata})` : originIata}
                        </div>
                        <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate">
                          {selectedOriginAirport ? `${selectedOriginAirport.name}, ${selectedOriginAirport.country}` : 'Select departure airport'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] text-xs font-extrabold shrink-0">
                        {originIata}
                      </span>
                    </div>
                  </div>

                  {/* Origin Autocomplete Dropdown */}
                  {showOriginDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-full sm:w-96 rounded-2xl ekr-glass-dropdown z-50 overflow-hidden">
                      <div className="p-3 border-b border-[#0754B8]/10 dark:border-white/10 flex items-center gap-2">
                        <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5]" />
                        <input
                          type="text"
                          autoFocus
                          value={originQuery}
                          onChange={(e) => setOriginQuery(e.target.value)}
                          placeholder="Search city, airport name, or IATA (e.g. ICN, PUS, DAC)..."
                          className="w-full text-sm bg-transparent outline-none text-[#10213D] dark:text-white placeholder:text-[#526685]/70 dark:placeholder:text-[#B8C9E5]/60"
                        />
                        {originQuery && (
                          <button type="button" onClick={() => setOriginQuery('')}>
                            <X className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5]" />
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-[#0754B8]/10 dark:divide-white/10">
                        {filteredOriginAirports.map((airport) => (
                          <button
                            key={airport.iata}
                            type="button"
                            onClick={() => {
                              setOriginIata(airport.iata);
                              setOriginQuery('');
                              setShowOriginDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-[#0754B8]/10 dark:hover:bg-white/10 transition flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#10213D] dark:text-white truncate">
                                {airport.city}, {airport.country}
                              </div>
                              <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate">
                                {airport.name}
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-[#0754B8]/10 dark:bg-white/10 font-mono text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] shrink-0">
                              {airport.iata}
                            </span>
                          </button>
                        ))}
                        {filteredOriginAirports.length === 0 && (
                          <div className="p-4 text-center text-xs text-[#526685] dark:text-[#B8C9E5]">
                            No matching airports found. Try searching by IATA code (e.g. ICN, DAC, SIN).
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* SWAP BUTTON + DESTINATION */}
                <div className="lg:col-span-4 relative flex items-center gap-2" ref={destDropdownRef}>
                  <button
                    type="button"
                    onClick={handleSwapAirports}
                    title="Swap Origin and Destination"
                    className="w-10 h-10 rounded-full ekr-glass-subtle hover:border-[#0754B8]/50 flex items-center justify-center text-[#0754B8] dark:text-[#60A5FA] transition shrink-0 cursor-pointer shadow-sm"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>

                  <div
                    onClick={() => setShowDestinationDropdown(true)}
                    className="flex-1 h-full rounded-xl ekr-glass-input px-4 py-3 hover:border-[#0754B8]/50 transition cursor-pointer flex flex-col justify-between min-w-0"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5]">
                      To (Destination)
                    </span>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="truncate">
                        <div className="text-base font-bold text-[#10213D] dark:text-white truncate">
                          {selectedDestAirport ? `${selectedDestAirport.city} (${selectedDestAirport.iata})` : destinationIata}
                        </div>
                        <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate">
                          {selectedDestAirport ? `${selectedDestAirport.name}, ${selectedDestAirport.country}` : 'Select arrival airport'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] text-xs font-extrabold shrink-0">
                        {destinationIata}
                      </span>
                    </div>
                  </div>

                  {/* Destination Autocomplete Dropdown */}
                  {showDestinationDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-full sm:w-96 rounded-2xl ekr-glass-dropdown z-50 overflow-hidden">
                      <div className="p-3 border-b border-[#0754B8]/10 dark:border-white/10 flex items-center gap-2">
                        <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5]" />
                        <input
                          type="text"
                          autoFocus
                          value={destinationQuery}
                          onChange={(e) => setDestinationQuery(e.target.value)}
                          placeholder="Search city, airport name, or IATA (e.g. DAC, PUS, BKK)..."
                          className="w-full text-sm bg-transparent outline-none text-[#10213D] dark:text-white placeholder:text-[#526685]/70 dark:placeholder:text-[#B8C9E5]/60"
                        />
                        {destinationQuery && (
                          <button type="button" onClick={() => setDestinationQuery('')}>
                            <X className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5]" />
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-[#0754B8]/10 dark:divide-white/10">
                        {filteredDestAirports.map((airport) => (
                          <button
                            key={airport.iata}
                            type="button"
                            onClick={() => {
                              setDestinationIata(airport.iata);
                              setDestinationQuery('');
                              setShowDestinationDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-[#0754B8]/10 dark:hover:bg-white/10 transition flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#10213D] dark:text-white truncate">
                                {airport.city}, {airport.country}
                              </div>
                              <div className="text-xs text-[#526685] dark:text-[#B8C9E5] truncate">
                                {airport.name}
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-[#0754B8]/10 dark:bg-white/10 font-mono text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] shrink-0">
                              {airport.iata}
                            </span>
                          </button>
                        ))}
                        {filteredDestAirports.length === 0 && (
                          <div className="p-4 text-center text-xs text-[#526685] dark:text-[#B8C9E5]">
                            No matching airports found. Try searching by IATA code.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* DATES PICKER */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  <div className="rounded-xl ekr-glass-input px-3.5 py-2 flex flex-col justify-center">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#0754B8] dark:text-[#60A5FA]" />
                      Departure
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="text-xs sm:text-sm font-semibold bg-transparent outline-none text-[#10213D] dark:text-white mt-0.5"
                    />
                  </div>

                  {tripType === 'round-trip' && (
                    <div className="rounded-xl ekr-glass-input px-3.5 py-2 flex flex-col justify-center">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#0754B8] dark:text-[#60A5FA]" />
                        Return
                      </label>
                      <input
                        type="date"
                        value={returnDate}
                        min={departureDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="text-xs sm:text-sm font-semibold bg-transparent outline-none text-[#10213D] dark:text-white mt-0.5"
                      />
                    </div>
                  )}
                </div>

                {/* SEARCH BUTTON */}
                <div className="lg:col-span-2 flex">
                  <button
                    type="button"
                    disabled={isSearching}
                    onClick={handleManualSearchSubmit}
                    className="w-full rounded-xl ekr-glass-btn-primary disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-base py-4 px-5 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        <span>Search Flights</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* MULTI-CITY BUILDER */
              <div className="space-y-3">
                {multiCityLegs.map((leg, idx) => (
                  <div
                    key={leg.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center ekr-glass-subtle p-3 rounded-xl"
                  >
                    <div className="sm:col-span-1 text-xs font-bold text-[#0754B8] dark:text-[#60A5FA]">
                      Flight {idx + 1}
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] uppercase font-semibold text-[#526685] dark:text-[#B8C9E5] mb-0.5">
                        From Airport
                      </label>
                      <select
                        value={leg.origin}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMultiCityLegs((prev) =>
                            prev.map((l) => (l.id === leg.id ? { ...l, origin: val } : l))
                          );
                          if (idx === 0) setOriginIata(val);
                        }}
                        className="w-full ekr-glass-input rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold"
                      >
                        {allAirports.map((a) => (
                          <option key={a.iata} value={a.iata} className="bg-white dark:bg-[#0B204A]">
                            {a.city} ({a.iata}) — {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] uppercase font-semibold text-[#526685] dark:text-[#B8C9E5] mb-0.5">
                        To Airport
                      </label>
                      <select
                        value={leg.destination}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMultiCityLegs((prev) =>
                            prev.map((l) => (l.id === leg.id ? { ...l, destination: val } : l))
                          );
                          if (idx === 0) setDestinationIata(val);
                        }}
                        className="w-full ekr-glass-input rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold"
                      >
                        {allAirports.map((a) => (
                          <option key={a.iata} value={a.iata} className="bg-white dark:bg-[#0B204A]">
                            {a.city} ({a.iata}) — {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-[#526685] dark:text-[#B8C9E5] mb-0.5">
                        Departure Date
                      </label>
                      <input
                        type="date"
                        value={leg.departureDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMultiCityLegs((prev) =>
                            prev.map((l) => (l.id === leg.id ? { ...l, departureDate: val } : l))
                          );
                          if (idx === 0) setDepartureDate(val);
                        }}
                        className="w-full ekr-glass-input rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      {multiCityLegs.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setMultiCityLegs((prev) => prev.filter((l) => l.id !== leg.id))
                          }
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {multiCityLegs.length < 4 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setMultiCityLegs((prev) => [
                          ...prev,
                          {
                            id: `leg-${Date.now()}`,
                            origin: prev[prev.length - 1]?.destination || 'PUS',
                            destination: 'ICN',
                            departureDate: getDefaultReturnDate(),
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Flight Leg
                    </button>
                  ) : (
                    <span className="text-xs text-[#526685] dark:text-[#B8C9E5]">Maximum 4 flight legs</span>
                  )}

                  <button
                    type="button"
                    disabled={isSearching}
                    onClick={handleManualSearchSubmit}
                    className="px-6 py-3 rounded-xl ekr-glass-btn-primary disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Search Flights</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Student Corridor Chips (Populates Origin & Destination ONLY — Manual Search Required) */}
            <div className="mt-4 pt-3.5 border-t border-[#0754B8]/10 dark:border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] mr-1">Popular Routes:</span>
              {POPULAR_STUDENT_ROUTES.map((route) => (
                <button
                  key={`${route.origin}-${route.destination}`}
                  type="button"
                  onClick={() => {
                    setOriginIata(route.origin);
                    setDestinationIata(route.destination);
                    if (tripType === 'multi-city') {
                      setMultiCityLegs((prev) =>
                        prev.map((l, idx) =>
                          idx === 0 ? { ...l, origin: route.origin, destination: route.destination } : l
                        )
                      );
                    }
                    setSearchError(null);
                    setRouteSelectionHint(
                      `Selected ${route.label}. Adjust dates or passengers if needed, then click "Search Flights".`
                    );
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                    originIata === route.origin && destinationIata === route.destination
                      ? 'bg-[#0754B8]/12 dark:bg-[#0875E8]/25 text-[#0754B8] dark:text-[#60A5FA] border-[#0754B8]/30 dark:border-[#0875E8]/45'
                      : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5] hover:border-[#0754B8]/35'
                  }`}
                >
                  {route.label}
                </button>
              ))}
            </div>

            {routeSelectionHint && !isSearching && (
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#0754B8] dark:text-[#60A5FA]">
                <span>{routeSelectionHint}</span>
                <button
                  type="button"
                  onClick={() => setRouteSelectionHint(null)}
                  className="text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
                  aria-label="Dismiss route hint"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          )}

          {activeServiceMode === 'airline' && !hubConfig.services.airline.enabled && (
            <div className="ekr-glass-panel rounded-2xl p-6 text-sm text-[#10213D] dark:text-white">
              Airline flight search is temporarily paused by the administrator. Switch to KTX Train or Bus above.
            </div>
          )}

          {activeServiceMode === 'airline' && searchError && (
            <div className="mt-4 p-4 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 border border-rose-400/40 text-rose-700 dark:text-rose-100 text-sm flex items-center gap-3 backdrop-blur-md">
              <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-300 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </div>
      </section>

      {/* MAIN CONTENT BODY */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {/* Active Transport Announcements */}
        {visibleAnnouncements.length > 0 && (
          <div className="space-y-2.5">
            {visibleAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className={`rounded-xl border px-4 py-3 text-xs sm:text-sm flex items-start gap-3 ${
                  ann.severity === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Info className="w-4 h-4 text-[#0754B8] dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{ann.title}: </span>
                  <span>{ann.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KTX TRAIN DISCOVERY PANEL */}
        {activeServiceMode === 'ktx' && (
          hubConfig.services.ktx.enabled ? (
            <KtxSearchPanel
              bookingUrls={hubBookingUrls}
              featuredRoutes={hubConfig.featuredRoutes.ktx}
              tagoConfigured={hubConfig.providers.tagoConfigured}
            />
          ) : (
            <div className="ekr-glass-panel rounded-2xl p-8 text-center text-sm text-[#526685] dark:text-[#B8C9E5]">
              KTX Train discovery is currently paused by the administrator.
            </div>
          )
        )}

        {/* BUS DISCOVERY PANEL */}
        {activeServiceMode === 'bus' && (
          hubConfig.services.bus.enabled ? (
            <BusSearchPanel
              bookingUrls={hubBookingUrls}
              featuredRoutes={hubConfig.featuredRoutes.bus}
              tagoConfigured={hubConfig.providers.tagoConfigured}
            />
          ) : (
            <div className="ekr-glass-panel rounded-2xl p-8 text-center text-sm text-[#526685] dark:text-[#B8C9E5]">
              Express & Intercity Bus discovery is currently paused by the administrator.
            </div>
          )
        )}

        {/* AIRLINE BODY (100% PRESERVED) */}
        {activeServiceMode === 'airline' && hubConfig.services.airline.enabled && (
        <div className="space-y-12">
        {/* INITIAL MANUAL SEARCH PROMPT (BEFORE FIRST MANUAL SEARCH) */}
        {!searchResult && !isSearching && (
          <div className="ekr-glass-panel rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#0754B8]/10 dark:bg-[#0875E8]/20 border border-[#0754B8]/20 dark:border-[#0875E8]/30 flex items-center justify-center text-[#0754B8] dark:text-[#60A5FA] shrink-0">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#10213D] dark:text-white">
                  Ready to Search Live Flights
                </h2>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1 max-w-2xl">
                  Choose your departure and arrival airports, travel dates, passenger count, and cabin class above, then click{' '}
                  <strong className="text-[#10213D] dark:text-white">Search Flights</strong> to fetch live airline itineraries and booking links.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualSearchSubmit}
              className="px-5 py-3 rounded-xl ekr-glass-btn-primary text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shrink-0 transition cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search Flights ({originIata} → {destinationIata})</span>
            </button>
          </div>
        )}

        {/* LOADING SKELETON WHEN MANUAL SEARCH IS RUNNING BEFORE FIRST RESULT */}
        {isSearching && !searchResult && (
          <div className="ekr-glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-sm font-semibold text-[#0754B8] dark:text-[#60A5FA]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Searching live flights for {originIata} → {destinationIata}...</span>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="h-24 rounded-xl bg-[#0754B8]/10 dark:bg-white/10 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* TRANSPARENCY & LIVE API STATUS BANNER */}
        {searchResult && (
          <div
            className={`rounded-2xl border p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md ${
              searchResult.liveApiConnected
                ? 'bg-emerald-500/10 dark:bg-emerald-950/35 border-emerald-500/25 dark:border-emerald-500/30'
                : 'bg-amber-500/10 dark:bg-amber-950/35 border-amber-500/25 dark:border-amber-500/30'
            }`}
          >
            <div className="flex items-start gap-3.5">
              {searchResult.liveApiConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-[#10213D] dark:text-white">
                    {searchResult.liveApiConnected
                      ? `Live Fare Feed Connected (${searchResult.connectedApiProviders.join(', ')})`
                      : 'Direct Multi-Provider Referral Mode Active'}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      getFreshnessBadgeMeta(searchResult.freshnessState).className
                    }`}
                  >
                    {getFreshnessBadgeMeta(searchResult.freshnessState).label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-1">
                  {searchResult.statusNotice}
                </p>
              </div>
            </div>

            <div className="text-xs text-[#526685] dark:text-[#B8C9E5] shrink-0">
              Final ticket price, baggage rules, and seat availability are confirmed on the selected provider’s checkout page.
            </div>
          </div>
        )}

        {/* PART 4 & 5: FLIGHT RESULTS & MULTI-PROVIDER COMPARISON */}
        {searchResult && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#10213D] dark:text-white flex items-center gap-2.5">
                  <span>
                    {allAirports.find((a) => a.iata === (executedSearchMeta?.origin || originIata))?.city ||
                      executedSearchMeta?.origin ||
                      originIata}{' '}
                    ({executedSearchMeta?.origin || originIata})
                  </span>
                  <ArrowRight className="w-5 h-5 text-[#0754B8] dark:text-[#60A5FA]" />
                  <span>
                    {allAirports.find((a) => a.iata === (executedSearchMeta?.destination || destinationIata))?.city ||
                      executedSearchMeta?.destination ||
                      destinationIata}{' '}
                    ({executedSearchMeta?.destination || destinationIata})
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-0.5 tabular-nums">
                  Departure: {formatShortDate(executedSearchMeta?.departureDate || departureDate)}
                  {(executedSearchMeta?.tripType || tripType) === 'round-trip'
                    ? ` · Return: ${formatShortDate(executedSearchMeta?.returnDate || returnDate)}`
                    : (executedSearchMeta?.tripType || tripType) === 'multi-city'
                    ? ' · Multi-city'
                    : ' · One-way'}{' '}
                  · {executedSearchMeta?.totalPassengers ?? totalPassengers}{' '}
                  {(executedSearchMeta?.totalPassengers ?? totalPassengers) === 1 ? 'Passenger' : 'Passengers'} ·{' '}
                  {executedSearchMeta?.cabinClass || cabinClass}
                </p>
              </div>

              {/* Sort & Filter Controls */}
              {searchResult.offers.length > 0 && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters((v) => !v)}
                    className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl ekr-glass-subtle text-xs font-semibold"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                    Filters
                  </button>

                  <div className="inline-flex items-center gap-1.5 ekr-glass-subtle rounded-xl p-1">
                    {(
                      [
                        { id: 'best', label: 'Best' },
                        { id: 'cheapest', label: 'Cheapest' },
                        { id: 'fastest', label: 'Fastest' },
                        { id: 'earliest', label: 'Earliest' },
                        { id: 'latest', label: 'Latest' },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSortBy(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          sortBy === s.id
                            ? 'ekr-glass-btn-primary text-white'
                            : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* IF LIVE API RETURNED OFFERS: SHOW SIDEBAR FILTERS + ITINERARY CARDS */}
            {searchResult.offers.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* FILTER SIDEBAR */}
                <aside
                  className={`lg:col-span-3 ekr-glass-panel rounded-2xl p-5 space-y-6 ${
                    showMobileFilters ? 'block' : 'hidden lg:block'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#0754B8]/10 dark:border-white/10 pb-3">
                    <h3 className="text-sm font-bold text-[#10213D] dark:text-white flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                      Filter Results
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setStopsFilter('any');
                        setSelectedAirlines([]);
                        setMaxPriceFilter(null);
                        setMaxDurationHoursFilter(36);
                        setDepartureTimeSlot('any');
                        setArrivalTimeSlot('any');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Stops Filter */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Number of Stops
                    </label>
                    <div className="space-y-1.5">
                      {(
                        [
                          { id: 'any', label: 'Any number of stops' },
                          { id: 'direct', label: 'Direct flights only' },
                          { id: '1stop', label: '1 stop' },
                          { id: '2plus', label: '2+ stops' },
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt.id}
                          className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="stopsFilter"
                            checked={stopsFilter === opt.id}
                            onChange={() => setStopsFilter(opt.id)}
                            className="text-blue-600"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Departure Time Filter */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Departure Time
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'any', label: 'Any Time' },
                          { id: 'morning', label: 'Morning (05-12)' },
                          { id: 'afternoon', label: 'Afternoon (12-17)' },
                          { id: 'evening', label: 'Evening (17-21)' },
                          { id: 'night', label: 'Night (21-05)' },
                        ] as const
                      ).map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setDepartureTimeSlot(slot.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition ${
                            departureTimeSlot === slot.id
                              ? 'bg-blue-50 dark:bg-blue-950 border-blue-400 text-blue-700 dark:text-sky-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max Journey Duration */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold uppercase tracking-wider text-slate-400">
                        Max Journey Duration
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-sky-400">
                        Up to {maxDurationHoursFilter}h
                      </span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={48}
                      value={maxDurationHoursFilter}
                      onChange={(e) => setMaxDurationHoursFilter(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  {/* Airlines Filter */}
                  {availableAirlinesInOffers.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                        Airlines
                      </label>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto">
                        {availableAirlinesInOffers.map((air) => (
                          <label
                            key={air.code}
                            className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAirlines.includes(air.code)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAirlines((prev) => [...prev, air.code]);
                                } else {
                                  setSelectedAirlines((prev) => prev.filter((c) => c !== air.code));
                                }
                              }}
                              className="rounded text-blue-600"
                            />
                            <span className="truncate">
                              {air.name} ({air.code})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>

                {/* FLIGHT ITINERARY CARDS */}
                <div className="lg:col-span-9 space-y-4">
                  {filteredAndSortedOffers.map((offer) => {
                    const isExpanded = expandedOfferId === offer.id;
                    const freshnessMeta = getFreshnessBadgeMeta(offer.freshness);

                    return (
                      <div
                        key={offer.id}
                        className="ekr-glass-card rounded-2xl overflow-hidden"
                      >
                        {/* Highlight Badges */}
                        {offer.badges && offer.badges.length > 0 && (
                          <div className="px-5 pt-3 flex flex-wrap items-center gap-2">
                            {offer.badges.map((badge) => (
                              <span
                                key={badge}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  badge === 'Cheapest Flight'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : badge === 'Fastest Flight'
                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                }`}
                              >
                                {badge === 'Cheapest Flight' && <TrendingDown className="w-3 h-3" />}
                                {badge === 'Fastest Flight' && <Zap className="w-3 h-3" />}
                                {badge === 'Best Value' && <Award className="w-3 h-3" />}
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          {/* Airline & Flight Summary */}
                          <div className="flex items-start sm:items-center gap-4 min-w-[180px]">
                            <img
                              src={offer.airlineLogoUrl}
                              alt={offer.airlineName}
                              className="w-11 h-11 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div>
                              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                {offer.airlineName}
                              </div>
                              <div className="text-xs text-slate-500 font-mono">
                                {offer.flightNumbers.join(' • ')}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {offer.cabinClass} • {offer.baggageAllowance}
                              </div>
                            </div>
                          </div>

                          {/* Departure -> Duration/Stops -> Arrival */}
                          <div className="flex-1 flex items-center justify-between gap-4 max-w-md">
                            <div className="text-left">
                              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                                {formatTime(offer.departureTime)}
                              </div>
                              <div className="text-xs font-bold text-blue-600 dark:text-sky-400">
                                {offer.origin}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {formatShortDate(offer.departureTime)}
                              </div>
                            </div>

                            <div className="flex-1 flex flex-col items-center px-2">
                              <span className="text-xs font-semibold text-slate-500">
                                {formatDuration(offer.totalDurationMinutes)}
                              </span>
                              <div className="w-full h-0.5 bg-slate-200 dark:bg-slate-700 my-1.5 relative flex items-center justify-center">
                                <Plane className="w-3.5 h-3.5 text-blue-600 bg-white dark:bg-slate-900 px-0.5" />
                              </div>
                              <span
                                className={`text-[11px] font-semibold ${
                                  offer.isDirect
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {offer.isDirect
                                  ? 'Direct Flight'
                                  : `${offer.stopsCount} ${offer.stopsCount === 1 ? 'Stop' : 'Stops'}`}
                              </span>
                            </div>

                            <div className="text-right">
                              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                                {formatTime(offer.arrivalTime)}
                              </div>
                              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                {offer.destination}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {formatShortDate(offer.arrivalTime)}
                              </div>
                            </div>
                          </div>

                          {/* Price & Compare CTA */}
                          <div className="flex sm:flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800 gap-3">
                            <div className="text-left lg:text-right">
                              <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                    verifiedOffersById[offer.id]?.priceStatus === 'Live Price'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                      : verifiedOffersById[offer.id]?.priceStatus === 'Price Changed'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                      : verifiedOffersById[offer.id]?.priceStatus === 'Offer Expired'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                      : freshnessMeta.className
                                  }`}
                                >
                                  {verifiedOffersById[offer.id]?.priceStatus ||
                                    offer.priceStatus ||
                                    freshnessMeta.label}
                                </span>
                              </div>
                              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                                {offer.currency}{' '}
                                {(
                                  verifiedOffersById[offer.id]?.verifiedPrice ?? offer.totalPrice
                                ).toLocaleString()}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {verifiedOffersById[offer.id]?.verified
                                  ? `${offer.sourceProviderName} Live Price Verified • ${formatTime(
                                      verifiedOffersById[offer.id].verifiedAt
                                    )}`
                                  : `via ${offer.sourceProviderName}`}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={verifyingOfferId === offer.id}
                                onClick={() => handleVerifyOfferPrice(offer)}
                                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                              >
                                {verifyingOfferId === offer.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Verifying...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>
                                      {verifiedOffersById[offer.id]?.verified
                                        ? 'Re-verify Price'
                                        : 'Verify Live Price'}
                                    </span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpandedOfferId(isExpanded ? null : offer.id)}
                                className="px-4 py-2.5 rounded-xl ekr-glass-btn-primary text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <span>Compare Providers</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* EXPANDED SEGMENT DETAILS, OFFICIAL PRICE VERIFICATION & MULTI-PROVIDER COMPARISON TABLE */}
                        {isExpanded && (
                          <div className="border-t border-[#0754B8]/12 dark:border-white/10 bg-white/30 dark:bg-white/[0.03] p-5 sm:p-6 space-y-6">
                            {/* Official Amadeus Flight Offers Price Verification Result Box */}
                            {verifiedOffersById[offer.id] && (
                              <div
                                className={`p-4 rounded-xl border ${
                                  verifiedOffersById[offer.id].priceStatus === 'Live Price'
                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70'
                                    : verifiedOffersById[offer.id].priceStatus === 'Price Changed'
                                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70'
                                    : 'bg-slate-100/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                      <span>
                                        Official Flight Offer Price Verification (
                                        {verifiedOffersById[offer.id].priceStatus})
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                      {verifiedOffersById[offer.id].message}
                                    </p>
                                  </div>
                                  {verifiedOffersById[offer.id].verifiedPrice !== null && (
                                    <div className="text-left sm:text-right shrink-0">
                                      <div className="text-xs text-slate-500">
                                        Verified Total (incl. taxes & fees)
                                      </div>
                                      <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                                        {verifiedOffersById[offer.id].currency}{' '}
                                        {verifiedOffersById[offer.id].verifiedPrice?.toLocaleString()}
                                      </div>
                                      {verifiedOffersById[offer.id].taxesAndFeesTotal !== null && (
                                        <div className="text-[11px] text-slate-500">
                                          Taxes & Fees: {verifiedOffersById[offer.id].currency}{' '}
                                          {verifiedOffersById[
                                            offer.id
                                          ].taxesAndFeesTotal?.toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {verifiedOffersById[offer.id].priceChanged &&
                                  !priceChangeConfirmedById[offer.id] && (
                                    <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-3">
                                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                        Airline inventory updated the fare from {offer.currency}{' '}
                                        {verifiedOffersById[offer.id].originalPrice?.toLocaleString()}{' '}
                                        to {verifiedOffersById[offer.id].currency}{' '}
                                        {verifiedOffersById[offer.id].verifiedPrice?.toLocaleString()}.
                                        Please confirm the updated price before continuing to booking.
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPriceChangeConfirmedById((prev) => ({
                                            ...prev,
                                            [offer.id]: true,
                                          }))
                                        }
                                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                                      >
                                        Confirm Updated Price
                                      </button>
                                    </div>
                                  )}
                              </div>
                            )}
                            {/* Segment Breakdown */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                Flight Segments & Baggage Conditions
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {offer.segments.map((seg, idx) => (
                                  <div
                                    key={`${seg.flightNumber}-${idx}`}
                                    className="p-3.5 rounded-xl ekr-glass-subtle text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between font-bold text-[#10213D] dark:text-white">
                                      <span>
                                        {seg.airlineName} • {seg.flightNumber}
                                      </span>
                                      <span className="text-[#0754B8] dark:text-[#60A5FA]">
                                        {formatDuration(seg.durationMinutes)}
                                      </span>
                                    </div>
                                    <div className="text-[#526685] dark:text-[#B8C9E5]">
                                      <strong>Departs:</strong> {seg.departureCity} ({seg.departureAirport}) at{' '}
                                      {formatTime(seg.departureTime)}
                                    </div>
                                    <div className="text-[#526685] dark:text-[#B8C9E5]">
                                      <strong>Arrives:</strong> {seg.arrivalCity} ({seg.arrivalAirport}) at{' '}
                                      {formatTime(seg.arrivalTime)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#526685] dark:text-[#B8C9E5]">
                                <span className="inline-flex items-center gap-1">
                                  <Luggage className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                                  {offer.baggageAllowance}
                                </span>
                                <span>• {offer.refundPolicy}</span>
                                <span>• {offer.changePolicy}</span>
                              </div>
                            </div>

                            {/* Multi-Provider Price Comparison Table for this Offer */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5] mb-3">
                                Multi-Provider Booking Comparison
                              </h4>
                              <div className="overflow-x-auto rounded-xl ekr-glass-subtle">
                                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                  <thead>
                                    <tr className="border-b border-[#0754B8]/10 dark:border-white/10 text-[11px] font-bold uppercase text-[#526685] dark:text-[#B8C9E5] bg-white/40 dark:bg-white/[0.04]">
                                      <th className="py-3 px-4">Provider</th>
                                      <th className="py-3 px-4">Price Status</th>
                                      <th className="py-3 px-4">Displayed Fare</th>
                                      <th className="py-3 px-4 text-right">Booking Referral</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {offer.providerQuotes.map((q) => {
                                      const qBadge = getFreshnessBadgeMeta(q.freshness);
                                      return (
                                        <tr key={q.providerId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                                            <img
                                              src={q.logoUrl}
                                              alt={q.providerName}
                                              className="w-6 h-6 rounded object-contain bg-white p-0.5 border border-slate-200"
                                            />
                                            <span>{q.providerName}</span>
                                          </td>
                                          <td className="py-3 px-4">
                                            <span
                                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${qBadge.className}`}
                                            >
                                              {qBadge.label}
                                            </span>
                                          </td>
                                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                            {q.price !== null
                                              ? `${q.currency} ${q.price.toLocaleString()}`
                                              : 'Check on provider website'}
                                          </td>
                                          <td className="py-3 px-4 text-right">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleProviderRedirect(
                                                  q.providerId,
                                                  q.providerName,
                                                  q.bookingUrl,
                                                  offer.origin,
                                                  offer.destination
                                                )
                                              }
                                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
                                            >
                                              <span>{q.actionLabel}</span>
                                              <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ROUTE MULTI-PROVIDER PRICE COMPARISON TABLE WHEN LIVE GDS IS NOT RETURNING OFFERS OR NOT CONNECTED */
              <div className="ekr-glass-panel rounded-2xl overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-[#0754B8]/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA] mb-1">
                      <Globe className="w-4 h-4" />
                      Multi-Provider Route Comparison Matrix
                    </div>
                    <h3 className="text-lg font-bold text-[#10213D] dark:text-white">
                      Compare {originIata} → {destinationIata} Across Global Booking Platforms
                    </h3>
                    <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                      Select any trusted provider below to view live seat inventory and current fares for{' '}
                      {formatShortDate(departureDate)}
                      {tripType === 'round-trip' ? ` – ${formatShortDate(returnDate)}` : ''}.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#0754B8]/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] text-[11px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5]">
                        <th className="py-3.5 px-6">Booking Provider</th>
                        <th className="py-3.5 px-4">Platform Type</th>
                        <th className="py-3.5 px-4">Live API Feed Status</th>
                        <th className="py-3.5 px-4">Live Fare</th>
                        <th className="py-3.5 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {searchResult.providerComparisonLinks.map((quote) => {
                        const badge = getFreshnessBadgeMeta(quote.freshness);
                        return (
                          <tr
                            key={quote.providerId}
                            className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <img
                                  src={quote.logoUrl}
                                  alt={quote.providerName}
                                  className="w-8 h-8 rounded-lg object-contain bg-white p-1 border border-slate-200 shrink-0"
                                />
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {quote.providerName}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                                    {quote.notes}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                                {quote.providerType === 'ota'
                                  ? 'Online Travel Agency'
                                  : quote.providerType === 'metasearch'
                                  ? 'Flight Metasearch'
                                  : 'Official Airline'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-600 dark:text-slate-300">
                              {quote.price !== null ? (
                                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                                  {quote.currency} {quote.price.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  Live price confirmed on provider website
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleProviderRedirect(
                                    quote.providerId,
                                    quote.providerName,
                                    quote.bookingUrl
                                  )
                                }
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
                              >
                                <span>Visit Website</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* PART 7: ADVANCED ROUTE DISCOVERY INSIGHTS & OPERATING AIRLINES */}
        {searchResult?.routeDiscovery && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Route Telemetry & Nearby Airports */}
            <div className="lg:col-span-5 ekr-glass-panel rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0754B8]/10 dark:bg-[#0875E8]/20 flex items-center justify-center text-[#0754B8] dark:text-[#60A5FA]">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#10213D] dark:text-white">
                    Route Corridor Intelligence
                  </h3>
                  <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                    Verified airport coordinates & alternative departure/arrival hubs
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl ekr-glass-subtle">
                  <div className="text-[11px] font-semibold uppercase text-[#526685] dark:text-[#B8C9E5]">
                    Great-Circle Distance
                  </div>
                  <div className="text-lg font-extrabold text-[#10213D] dark:text-white mt-0.5">
                    {searchResult.routeDiscovery.distanceKm.toLocaleString()} km
                  </div>
                </div>
                <div className="p-3.5 rounded-xl ekr-glass-subtle">
                  <div className="text-[11px] font-semibold uppercase text-[#526685] dark:text-[#B8C9E5]">
                    Est. Non-Stop Flight Time
                  </div>
                  <div className="text-lg font-extrabold text-[#10213D] dark:text-white mt-0.5">
                    ~{formatDuration(searchResult.routeDiscovery.estimatedDirectDurationMinutes)}
                  </div>
                </div>
              </div>

              {/* Nearby Origin & Destination Airport Suggestions (Updates Form Only — Manual Search Required) */}
              <div className="space-y-3 pt-1">
                {searchResult.routeDiscovery.nearbyOriginAirports.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-[#10213D] dark:text-white mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                      Nearby Origin Airports ({searchResult.routeDiscovery.originAirport.city}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchResult.routeDiscovery.nearbyOriginAirports.map((na) => (
                        <button
                          key={na.iata}
                          type="button"
                          onClick={() => {
                            setOriginIata(na.iata);
                            setRouteSelectionHint(
                              `Origin updated to ${na.city} (${na.iata}). Click "Search Flights" to search this route.`
                            );
                            searchPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="px-3 py-1.5 rounded-lg ekr-glass-subtle hover:border-[#0754B8]/45 text-xs font-medium text-[#10213D] dark:text-white transition cursor-pointer"
                        >
                          Switch to {na.city} ({na.iata})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResult.routeDiscovery.nearbyDestinationAirports.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-[#10213D] dark:text-white mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                      Nearby Destination Airports ({searchResult.routeDiscovery.destinationAirport.city}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchResult.routeDiscovery.nearbyDestinationAirports.map((na) => (
                        <button
                          key={na.iata}
                          type="button"
                          onClick={() => {
                            setDestinationIata(na.iata);
                            setRouteSelectionHint(
                              `Destination updated to ${na.city} (${na.iata}). Click "Search Flights" to search this route.`
                            );
                            searchPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="px-3 py-1.5 rounded-lg ekr-glass-subtle hover:border-[#0754B8]/45 text-xs font-medium text-[#10213D] dark:text-white transition cursor-pointer"
                        >
                          Switch to {na.city} ({na.iata})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Major Operating Airlines on Corridor */}
            <div className="lg:col-span-7 ekr-glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0754B8]/10 dark:bg-[#0875E8]/20 flex items-center justify-center text-[#0754B8] dark:text-[#60A5FA]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#10213D] dark:text-white">
                      Airlines Operating on {originIata} ↔ {destinationIata}
                    </h3>
                    <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                      Direct & connecting carriers serving this corridor — book directly on the official airline website
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResult.routeDiscovery.operatingAirlinesOnRoute.map((carrier) => (
                  <div
                    key={carrier.code}
                    className="p-3.5 rounded-xl ekr-glass-subtle hover:border-[#0754B8]/40 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={carrier.logoUrl}
                        alt={carrier.name}
                        className="w-9 h-9 rounded-lg object-contain bg-white p-1 border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#10213D] dark:text-white truncate">
                          {carrier.name} ({carrier.code})
                        </div>
                        <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5]">
                          {carrier.typicalServiceType}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleProviderRedirect(
                          `airline_${carrier.code.toLowerCase()}`,
                          carrier.name,
                          carrier.officialUrl
                        )
                      }
                      className="px-3 py-1.5 rounded-lg ekr-glass-btn-primary text-xs font-semibold text-white inline-flex items-center gap-1 transition shrink-0 cursor-pointer"
                    >
                      <span>Official Site</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* PART 6: POPULAR BOOKING PROVIDERS DIRECTORY */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA] mb-1">
                <ShieldCheck className="w-4 h-4" />
                Verified Global Booking Partners
              </div>
              <h2 className="text-2xl font-extrabold text-[#10213D] dark:text-white">
                Compare & Book with Trusted Travel Providers
              </h2>
              <p className="text-sm text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                Continue your flight search or complete your ticket reservation directly with world-leading travel agencies and airline portals.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bookingProviders.map((provider) => (
              <div
                key={provider.id}
                className="ekr-glass-card rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <img
                      src={provider.logoUrl}
                      alt={provider.name}
                      className="w-11 h-11 rounded-xl object-contain bg-white p-1.5 border border-slate-200/80 shadow-2xs"
                    />
                    {provider.badgeText && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] border border-[#0754B8]/20 dark:border-[#0875E8]/35">
                        {provider.badgeText}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#10213D] dark:text-white">
                    {provider.name}
                  </h3>
                  <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1.5 line-clamp-3 leading-relaxed">
                    {provider.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#0754B8]/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      const matchedQuote = searchResult?.providerComparisonLinks.find(
                        (q) => q.providerId === provider.id
                      );
                      const targetUrl =
                        matchedQuote?.bookingUrl ||
                        provider.affiliateBaseUrl ||
                        provider.officialUrl;
                      handleProviderRedirect(provider.id, provider.name, targetUrl);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl ekr-glass-btn-primary text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Visit Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PART 8: USER PRICE ALERTS SECTION */}
        <section className="ekr-glass-panel rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#0754B8]/10 dark:border-white/10">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Saved Flight Price Alerts
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Monitor target fares on your preferred routes (e.g. {originIata} → {destinationIata}). Alerts trigger automatically when verified live API fares drop to or below your target price.
                </p>
              </div>
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={() => setShowCreateAlertModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Price Alert
              </button>
            )}
          </div>

          {!currentUser ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Sign in to your EveryKR account to save custom flight route alerts and track target prices across sessions.
              </p>
            </div>
          ) : priceAlerts.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-slate-500">
                You have no active flight price alerts yet.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateAlertModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-xs font-bold text-blue-600 dark:text-sky-400 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Track {originIata} → {destinationIata} for {formatShortDate(departureDate)}
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {priceAlerts.map((alertItem) => (
                <div
                  key={alertItem.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between gap-4 ${
                    alertItem.enabled
                      ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                      : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">
                          Route: {alertItem.origin} → {alertItem.destination}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            alertItem.enabled
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {alertItem.enabled ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Departure: {formatShortDate(alertItem.departureDate)} • {alertItem.cabinClass}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleAlert(alertItem)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {alertItem.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAlert(alertItem.id)}
                        title="Delete Alert"
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-slate-700/70">
                    <div>
                      <div className="text-[11px] uppercase font-bold text-slate-400">
                        Target Price
                      </div>
                      {editingAlertId === alertItem.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            value={editingPriceValue}
                            onChange={(e) => setEditingPriceValue(e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-blue-400 text-xs font-bold bg-white dark:bg-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditedAlertPrice(alertItem)}
                            className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-semibold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAlertId(null)}
                            className="text-xs text-slate-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-base font-extrabold text-blue-600 dark:text-sky-400">
                            {alertItem.currency} {alertItem.targetPrice.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAlertId(alertItem.id);
                              setEditingPriceValue(String(alertItem.targetPrice));
                            }}
                            className="text-slate-400 hover:text-blue-600"
                            title="Edit target price"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] uppercase font-bold text-slate-400">
                        Last Verified Live Fare
                      </div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                        {alertItem.lastVerifiedLowestPrice !== null
                          ? `${alertItem.currency} ${alertItem.lastVerifiedLowestPrice.toLocaleString()}`
                          : 'Awaiting live API fare check'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </div>
        )}

        {/* SEPARATE LOCAL TAXI SHORTCUT (STRICTLY FOR TAXI SERVICES — NEVER KTX OR BUS BOOKING) */}
        <section className="ekr-glass-panel rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FFB800]/15 text-[#061B49] dark:text-[#FFB800] flex items-center justify-center shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5]">
                Local Taxi Shortcut (Separate from Train & Bus Booking)
              </div>
              <h3 className="text-base font-extrabold text-[#10213D] dark:text-white mt-0.5">
                Need a Taxi in Korea? Open Kakao T
              </h3>
              <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-0.5 max-w-2xl">
                For local airport transfers, station pickups, and city taxi rides in South Korea, use Korea’s official Kakao T taxi service directly.
              </p>
            </div>
          </div>
          <a
            href={hubBookingUrls.kakaoTaxiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFB800] hover:bg-amber-400 text-[#061B49] text-xs sm:text-sm font-extrabold transition shrink-0 shadow-sm"
          >
            Open Kakao T (Taxi Only)
            <ExternalLink className="w-4 h-4" />
          </a>
        </section>
      </div>

      {/* CREATE PRICE ALERT MODAL */}
      {showCreateAlertModal && (
        <div className="fixed inset-0 z-50 bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ekr-glass-modal rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BellRing className="w-5 h-5 text-[#0754B8] dark:text-[#60A5FA]" />
                <h3 className="text-lg font-bold text-[#10213D] dark:text-white">
                  Create Flight Price Alert
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAlertModal(false)}
                className="text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePriceAlert} className="space-y-4">
              <div className="p-3.5 rounded-xl ekr-glass-subtle text-xs space-y-1">
                <div className="font-bold text-[#10213D] dark:text-white text-sm">
                  Route: {originIata} → {destinationIata}
                </div>
                <div className="text-[#526685] dark:text-[#B8C9E5]">
                  Departure: {formatShortDate(departureDate)} • Cabin: {cabinClass}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#526685] dark:text-[#B8C9E5] mb-1.5">
                  Target Price ({currency})
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={alertTargetPrice}
                  onChange={(e) => setAlertTargetPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl ekr-glass-input text-sm font-bold"
                  placeholder="e.g. 350"
                />
                <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] mt-1">
                  When a connected live flight API returns a verified total price at or below this threshold, your alert will mark as triggered.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAlertModal(false)}
                  className="px-4 py-2 rounded-xl ekr-glass-subtle text-xs font-semibold text-[#10213D] dark:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl ekr-glass-btn-primary text-white text-xs font-bold cursor-pointer"
                >
                  Save Price Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportationModule;
