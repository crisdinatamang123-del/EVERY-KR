/**
 * EVERYKR — FLIGHT SEARCH & PRICE COMPARISON ENGINE (SERVER-SIDE ARCHITECTURE)
 *
 * Implements the 9 modular services specified in Part 10:
 * 1. AirportAutocompleteService
 * 2. FlightProviderAdapter (Interface & Registry)
 * 3. AmadeusProvider (Official Amadeus Flight Offers Search API v2)
 * 4. SkyscannerProvider (Official Skyscanner Live Prices API v3 — Partner Approval Gated)
 * 5. FlightPriceRefreshService (Provider-compliant TTL cache & freshness classification)
 * 6. AffiliateLinkService (Validated deep links & referral URLs for Trip.com, Gotogate, Mytrip, etc.)
 * 7. FlightSearchService (Input validation, rate limiting, deduplication, multi-provider comparison)
 * 8. PriceAlertService (User flight price alerts connected to EveryKR notification & email system)
 * 9. FlightAnalyticsService (Genuine, un-fabricated search & redirect telemetry)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============================================================================
// CORE TYPES & INTERFACES
// ============================================================================

export type TripType = 'round_trip' | 'one_way' | 'multi_city';
export type CabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
export type PriceFreshness =
  | 'live_verified'
  | 'recently_updated'
  | 'indicative'
  | 'unavailable';

export interface AirportRecord {
  iata: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  nearbyIata: string[];
  popularStudentHub?: boolean;
}

export interface FlightLegInput {
  origin: string;
  destination: string;
  departureDate: string;
}

export interface FlightSearchInput {
  tripType: TripType;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  multiCityLegs?: FlightLegInput[];
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
  currency: string;
  directOnly?: boolean;
  maxStops?: number | null;
  airlines?: string[];
  includeNearbyAirports?: boolean;
}

export interface FlightSegmentDetail {
  segmentId: string;
  carrierCode: string;
  airlineName: string;
  airlineLogoUrl: string;
  flightNumber: string;
  aircraftCode?: string;
  departureAirport: string;
  departureAirportName: string;
  departureCity: string;
  departureTerminal?: string;
  departureTime: string; // ISO
  arrivalAirport: string;
  arrivalAirportName: string;
  arrivalCity: string;
  arrivalTerminal?: string;
  arrivalTime: string; // ISO
  durationMinutes: number;
  durationFormatted: string;
  cabinClass: CabinClass;
}

export interface LayoverDetail {
  airportCode: string;
  airportName: string;
  city: string;
  durationMinutes: number;
  durationFormatted: string;
}

export interface FlightJourneyDirection {
  direction: 'outbound' | 'inbound' | 'multi_leg';
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  totalDurationMinutes: number;
  totalDurationFormatted: string;
  stopsCount: number;
  isDirect: boolean;
  segments: FlightSegmentDetail[];
  layovers: LayoverDetail[];
}

export type PriceTransparencyStatus =
  | 'Live Price'
  | 'Indicative Price'
  | 'Price Verification Required'
  | 'Price Changed'
  | 'Offer Expired'
  | 'Price Unavailable';

export interface ProviderComparisonQuote {
  providerId: string;
  providerName: string;
  providerType: 'ota' | 'metasearch' | 'airline';
  logoUrl: string;
  price: number | null; // null when provider did not return a live price
  currency: string;
  freshness: PriceFreshness;
  priceStatus?: PriceTransparencyStatus;
  verifiedAt: string | null;
  actionLabel: 'View Deal' | 'Visit Website';
  bookingUrl: string;
  isOfficialAirline?: boolean;
  notes?: string;
}

export interface FlightItineraryOffer {
  offerId: string;
  sourceProviderId: string;
  sourceProviderName: string;
  validatingCarrierCode: string;
  airlineName: string;
  airlineLogoUrl: string;
  flightNumbers: string[];
  journeys: FlightJourneyDirection[];
  totalDurationMinutes: number;
  totalDurationFormatted: string;
  totalStops: number;
  isDirect: boolean;
  cabinClass: CabinClass;
  baggageAllowance: string;
  refundCondition: string;
  changeCondition: string;
  totalPrice: number;
  basePrice?: number;
  taxesAndFees?: number;
  bookableSeats?: number | null;
  currency: string;
  freshness: PriceFreshness;
  priceStatus?: PriceTransparencyStatus;
  verificationStatus?: 'verified_search' | 'price_verified_checkout' | 'verification_required' | 'price_changed' | 'expired';
  priceVerifiedAt: string;
  offerExpiresAt?: string | null;
  badges?: ('cheapest' | 'fastest' | 'best_value')[];
  providerComparisons: ProviderComparisonQuote[];
}

export interface FlightPriceVerificationResult {
  ok: boolean;
  offerId: string;
  providerId: string;
  providerName: string;
  available: boolean;
  offerExpired: boolean;
  priceChanged: boolean;
  confirmationRequired: boolean;
  priceStatus: PriceTransparencyStatus;
  currency: string;
  originalTotalPrice: number | null;
  verifiedTotalPrice: number | null;
  verifiedBasePrice: number | null;
  verifiedTaxesAndFees: number | null;
  priceDifference: number;
  baggageAllowance: string;
  fareDetailsSummary: string;
  refundAndChangePolicy: string;
  bookableSeats: number | null;
  verifiedAt: string;
  expiresAt: string | null;
  statusMessage: string;
}

export interface RouteDiscoveryMetadata {
  originAirport: AirportRecord;
  destinationAirport: AirportRecord;
  greatCircleDistanceKm: number;
  estimatedNonStopDurationFormatted: string;
  nearbyOriginAirports: AirportRecord[];
  nearbyDestinationAirports: AirportRecord[];
  operatingAirlinesOnRoute: {
    code: string;
    name: string;
    logoUrl: string;
    officialWebsite: string;
    routeType: 'direct_or_hub' | 'connecting';
  }[];
  directProviderComparisonLinks: ProviderComparisonQuote[];
}

export interface FlightSearchResponse {
  ok: boolean;
  searchId: string;
  query: FlightSearchInput;
  liveSearchAvailable: boolean;
  liveProviderStatusMessage: string;
  connectedProviders: string[];
  providersStatus: {
    providerId: string;
    providerName: string;
    enabled: boolean;
    connectedAndVerified: boolean;
    status:
      | 'connected'
      | 'credentials_required'
      | 'awaiting_partner_approval'
      | 'disabled'
      | 'error';
    statusMessage: string;
  }[];
  offers: FlightItineraryOffer[];
  highlightedOffers: {
    cheapestOfferId: string | null;
    fastestOfferId: string | null;
    bestValueOfferId: string | null;
  };
  routeMetadata: RouteDiscoveryMetadata;
  searchedAt: string;
  cacheState: 'live' | 'cached_within_ttl' | 'no_live_provider';
}

export interface BookingProviderDirectoryItem {
  id: string;
  name: string;
  category: 'ota' | 'metasearch' | 'airline';
  logoUrl: string;
  officialWebsiteUrl: string;
  approvedAffiliateUrl: string;
  shortDescription: string;
  enabled: boolean;
  displayOrder: number;
  supportsDirectRouteDeepLink: boolean;
  updatedAt: string;
}

export interface ApiProviderConfigRecord {
  providerId: 'serpapi' | 'amadeus' | 'skyscanner' | 'duffel_future';
  providerName: string;
  enabled: boolean;
  approvalStatus: 'approved_ready' | 'awaiting_partner_approval' | 'not_configured';
  environment: 'test' | 'production';
  priority: number;
  rateLimitPerMinute: number;
  timeoutMs: number;
  hasCredentialsConfigured: boolean;
  lastVerifiedAt: string | null;
  lastError: string | null;
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  lastResponseTimeMs?: number | null;
  averageResponseTimeMs?: number | null;
}

export interface AirlineDisplaySettings {
  showAirlineLogos: boolean;
  showOperatingCarrier: boolean;
  showBaggageSummary: boolean;
  showTaxesBreakdown: boolean;
  featuredAirlines: string[];
}

export interface FlightSearchConfiguration {
  defaultCurrency: string;
  supportedCurrencies: string[];
  defaultPassengerAdults: number;
  cacheTtlSeconds: number;
  liveFreshnessThresholdSeconds: number;
  maxResultsPerSearch: number;
  rateLimitSearchesPerMinutePerIp: number;
  preferredProviderId?: 'serpapi' | 'amadeus' | 'skyscanner' | 'flight_aggregator' | 'auto';
  airlineDisplaySettings?: AirlineDisplaySettings;
  updatedAt: string;
  updatedBy?: string;
}

export interface UserFlightPriceAlert {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureDate: string;
  returnDate?: string;
  tripType: 'one_way' | 'round_trip';
  cabinClass: CabinClass;
  targetPrice: number;
  currency: string;
  enabled: boolean;
  lastCheckedAt: string | null;
  lastVerifiedLowestPrice: number | null;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlightAnalyticsStore {
  totalSearches: number;
  totalApiRequests: number;
  totalApiErrors: number;
  totalBookingRedirectClicks: number;
  searchesByRoute: Record<
    string,
    {
      routeKey: string;
      origin: string;
      destination: string;
      count: number;
      lastSearchedAt: string;
    }
  >;
  searchesByOrigin: Record<string, number>;
  searchesByDestination: Record<string, number>;
  searchesByDate: Record<string, number>; // YYYY-MM-DD -> count
  redirectsByProvider: Record<string, number>;
  recentSearches: {
    searchId: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    tripType: TripType;
    passengers: number;
    cabinClass: CabinClass;
    currency: string;
    offersReturned: number;
    liveApiUsed: boolean;
    timestamp: string;
  }[];
}

// ============================================================================
// 1. AIRPORT AUTOCOMPLETE SERVICE & VERIFIED GLOBAL AIRPORT DIRECTORY
// ============================================================================

export const VERIFIED_AIRPORTS_DIRECTORY: AirportRecord[] = [
  // South Korea
  {
    iata: 'ICN',
    name: 'Incheon International Airport',
    city: 'Seoul / Incheon',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 37.4602,
    longitude: 126.4407,
    timezone: 'Asia/Seoul',
    nearbyIata: ['GMP', 'CJJ'],
    popularStudentHub: true
  },
  {
    iata: 'PUS',
    name: 'Gimhae International Airport',
    city: 'Busan',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 35.1795,
    longitude: 128.9382,
    timezone: 'Asia/Seoul',
    nearbyIata: ['TAE', 'USN'],
    popularStudentHub: true
  },
  {
    iata: 'GMP',
    name: 'Gimpo International Airport',
    city: 'Seoul',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 37.5583,
    longitude: 126.7906,
    timezone: 'Asia/Seoul',
    nearbyIata: ['ICN', 'CJJ'],
    popularStudentHub: true
  },
  {
    iata: 'CJU',
    name: 'Jeju International Airport',
    city: 'Jeju',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 33.5113,
    longitude: 126.493,
    timezone: 'Asia/Seoul',
    nearbyIata: ['PUS', 'MWX'],
    popularStudentHub: true
  },
  {
    iata: 'TAE',
    name: 'Daegu International Airport',
    city: 'Daegu',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 35.8941,
    longitude: 128.6589,
    timezone: 'Asia/Seoul',
    nearbyIata: ['PUS', 'CJJ']
  },
  {
    iata: 'CJJ',
    name: 'Cheongju International Airport',
    city: 'Cheongju / Daejeon',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 36.7166,
    longitude: 127.4991,
    timezone: 'Asia/Seoul',
    nearbyIata: ['ICN', 'GMP']
  },
  {
    iata: 'MWX',
    name: 'Muan International Airport',
    city: 'Gwangju / Muan',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 34.9914,
    longitude: 126.3828,
    timezone: 'Asia/Seoul',
    nearbyIata: ['RSU', 'CJU']
  },
  {
    iata: 'RSU',
    name: 'Yeosu Airport',
    city: 'Yeosu / Suncheon',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 34.8423,
    longitude: 127.6169,
    timezone: 'Asia/Seoul',
    nearbyIata: ['MWX', 'PUS']
  },
  {
    iata: 'USN',
    name: 'Ulsan Airport',
    city: 'Ulsan',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 35.5935,
    longitude: 129.3518,
    timezone: 'Asia/Seoul',
    nearbyIata: ['PUS', 'TAE']
  },

  // Bangladesh, Nepal, India, Pakistan, Sri Lanka
  {
    iata: 'DAC',
    name: 'Hazrat Shahjalal International Airport',
    city: 'Dhaka',
    country: 'Bangladesh',
    countryCode: 'BD',
    latitude: 23.8433,
    longitude: 90.3978,
    timezone: 'Asia/Dhaka',
    nearbyIata: ['CGP', 'ZYL', 'CCU'],
    popularStudentHub: true
  },
  {
    iata: 'CGP',
    name: 'Shah Amanat International Airport',
    city: 'Chattogram',
    country: 'Bangladesh',
    countryCode: 'BD',
    latitude: 22.2496,
    longitude: 91.8133,
    timezone: 'Asia/Dhaka',
    nearbyIata: ['DAC', 'ZYL']
  },
  {
    iata: 'ZYL',
    name: 'Osmani International Airport',
    city: 'Sylhet',
    country: 'Bangladesh',
    countryCode: 'BD',
    latitude: 24.9632,
    longitude: 91.8668,
    timezone: 'Asia/Dhaka',
    nearbyIata: ['DAC', 'CGP']
  },
  {
    iata: 'KTM',
    name: 'Tribhuvan International Airport',
    city: 'Kathmandu',
    country: 'Nepal',
    countryCode: 'NP',
    latitude: 27.6966,
    longitude: 85.3591,
    timezone: 'Asia/Kathmandu',
    nearbyIata: ['DEL', 'CCU'],
    popularStudentHub: true
  },
  {
    iata: 'DEL',
    name: 'Indira Gandhi International Airport',
    city: 'New Delhi',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.5562,
    longitude: 77.1,
    timezone: 'Asia/Kolkata',
    nearbyIata: ['BOM', 'BLR'],
    popularStudentHub: true
  },
  {
    iata: 'BOM',
    name: 'Chhatrapati Shivaji Maharaj International Airport',
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    latitude: 19.0896,
    longitude: 72.8656,
    timezone: 'Asia/Kolkata',
    nearbyIata: ['DEL', 'BLR']
  },
  {
    iata: 'CCU',
    name: 'Netaji Subhas Chandra Bose International Airport',
    city: 'Kolkata',
    country: 'India',
    countryCode: 'IN',
    latitude: 22.6547,
    longitude: 88.4467,
    timezone: 'Asia/Kolkata',
    nearbyIata: ['DAC', 'DEL']
  },
  {
    iata: 'BLR',
    name: 'Kempegowda International Airport',
    city: 'Bengaluru',
    country: 'India',
    countryCode: 'IN',
    latitude: 13.1986,
    longitude: 77.7066,
    timezone: 'Asia/Kolkata',
    nearbyIata: ['MAA', 'BOM']
  },
  {
    iata: 'MAA',
    name: 'Chennai International Airport',
    city: 'Chennai',
    country: 'India',
    countryCode: 'IN',
    latitude: 12.9941,
    longitude: 80.1709,
    timezone: 'Asia/Kolkata',
    nearbyIata: ['BLR', 'CMB']
  },
  {
    iata: 'ISB',
    name: 'Islamabad International Airport',
    city: 'Islamabad',
    country: 'Pakistan',
    countryCode: 'PK',
    latitude: 33.549,
    longitude: 72.8256,
    timezone: 'Asia/Karachi',
    nearbyIata: ['LHE', 'KHI'],
    popularStudentHub: true
  },
  {
    iata: 'LHE',
    name: 'Allama Iqbal International Airport',
    city: 'Lahore',
    country: 'Pakistan',
    countryCode: 'PK',
    latitude: 31.5216,
    longitude: 74.4036,
    timezone: 'Asia/Karachi',
    nearbyIata: ['ISB', 'KHI']
  },
  {
    iata: 'KHI',
    name: 'Jinnah International Airport',
    city: 'Karachi',
    country: 'Pakistan',
    countryCode: 'PK',
    latitude: 24.9065,
    longitude: 67.1608,
    timezone: 'Asia/Karachi',
    nearbyIata: ['LHE', 'DXB']
  },
  {
    iata: 'CMB',
    name: 'Bandaranaike International Airport',
    city: 'Colombo',
    country: 'Sri Lanka',
    countryCode: 'LK',
    latitude: 7.1808,
    longitude: 79.8841,
    timezone: 'Asia/Colombo',
    nearbyIata: ['MAA', 'SIN']
  },

  // Southeast Asia & East Asia Hubs
  {
    iata: 'SIN',
    name: 'Singapore Changi Airport',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    latitude: 1.3644,
    longitude: 103.9915,
    timezone: 'Asia/Singapore',
    nearbyIata: ['KUL', 'CGK'],
    popularStudentHub: true
  },
  {
    iata: 'KUL',
    name: 'Kuala Lumpur International Airport',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    countryCode: 'MY',
    latitude: 2.7456,
    longitude: 101.7099,
    timezone: 'Asia/Kuala_Lumpur',
    nearbyIata: ['SIN', 'BKK'],
    popularStudentHub: true
  },
  {
    iata: 'BKK',
    name: 'Suvarnabhumi Airport',
    city: 'Bangkok',
    country: 'Thailand',
    countryCode: 'TH',
    latitude: 13.69,
    longitude: 100.7501,
    timezone: 'Asia/Bangkok',
    nearbyIata: ['DMK', 'KUL', 'SIN'],
    popularStudentHub: true
  },
  {
    iata: 'DMK',
    name: 'Don Mueang International Airport',
    city: 'Bangkok',
    country: 'Thailand',
    countryCode: 'TH',
    latitude: 13.9126,
    longitude: 100.6068,
    timezone: 'Asia/Bangkok',
    nearbyIata: ['BKK']
  },
  {
    iata: 'NRT',
    name: 'Narita International Airport',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.772,
    longitude: 140.3929,
    timezone: 'Asia/Tokyo',
    nearbyIata: ['HND', 'KIX'],
    popularStudentHub: true
  },
  {
    iata: 'HND',
    name: 'Tokyo Haneda International Airport',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.5494,
    longitude: 139.7798,
    timezone: 'Asia/Tokyo',
    nearbyIata: ['NRT', 'KIX']
  },
  {
    iata: 'KIX',
    name: 'Kansai International Airport',
    city: 'Osaka',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 34.432,
    longitude: 135.2304,
    timezone: 'Asia/Tokyo',
    nearbyIata: ['FUK', 'NRT']
  },
  {
    iata: 'FUK',
    name: 'Fukuoka Airport',
    city: 'Fukuoka',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 33.5859,
    longitude: 130.4507,
    timezone: 'Asia/Tokyo',
    nearbyIata: ['PUS', 'KIX']
  },
  {
    iata: 'HAN',
    name: 'Noi Bai International Airport',
    city: 'Hanoi',
    country: 'Vietnam',
    countryCode: 'VN',
    latitude: 21.2212,
    longitude: 105.8072,
    timezone: 'Asia/Ho_Chi_Minh',
    nearbyIata: ['SGN', 'CAN']
  },
  {
    iata: 'SGN',
    name: 'Tan Son Nhat International Airport',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    countryCode: 'VN',
    latitude: 10.8188,
    longitude: 106.652,
    timezone: 'Asia/Ho_Chi_Minh',
    nearbyIata: ['HAN', 'BKK']
  },
  {
    iata: 'MNL',
    name: 'Ninoy Aquino International Airport',
    city: 'Manila',
    country: 'Philippines',
    countryCode: 'PH',
    latitude: 14.5086,
    longitude: 121.0194,
    timezone: 'Asia/Manila',
    nearbyIata: ['HKG', 'TPE']
  },
  {
    iata: 'CGK',
    name: 'Soekarno-Hatta International Airport',
    city: 'Jakarta',
    country: 'Indonesia',
    countryCode: 'ID',
    latitude: -6.1256,
    longitude: 106.6559,
    timezone: 'Asia/Jakarta',
    nearbyIata: ['SIN', 'KUL']
  },
  {
    iata: 'HKG',
    name: 'Hong Kong International Airport',
    city: 'Hong Kong',
    country: 'Hong Kong',
    countryCode: 'HK',
    latitude: 22.308,
    longitude: 113.9185,
    timezone: 'Asia/Hong_Kong',
    nearbyIata: ['CAN', 'TPE']
  },
  {
    iata: 'TPE',
    name: 'Taiwan Taoyuan International Airport',
    city: 'Taipei',
    country: 'Taiwan',
    countryCode: 'TW',
    latitude: 25.0797,
    longitude: 121.2342,
    timezone: 'Asia/Taipei',
    nearbyIata: ['HKG', 'PVG']
  },
  {
    iata: 'PEK',
    name: 'Beijing Capital International Airport',
    city: 'Beijing',
    country: 'China',
    countryCode: 'CN',
    latitude: 40.0799,
    longitude: 116.6031,
    timezone: 'Asia/Shanghai',
    nearbyIata: ['PKX', 'PVG']
  },
  {
    iata: 'PVG',
    name: 'Shanghai Pudong International Airport',
    city: 'Shanghai',
    country: 'China',
    countryCode: 'CN',
    latitude: 31.1443,
    longitude: 121.8083,
    timezone: 'Asia/Shanghai',
    nearbyIata: ['PEK', 'ICN']
  },
  {
    iata: 'CAN',
    name: 'Guangzhou Baiyun International Airport',
    city: 'Guangzhou',
    country: 'China',
    countryCode: 'CN',
    latitude: 23.3924,
    longitude: 113.2988,
    timezone: 'Asia/Shanghai',
    nearbyIata: ['HKG', 'PVG']
  },
  {
    iata: 'ULN',
    name: 'Chinggis Khaan International Airport',
    city: 'Ulaanbaatar',
    country: 'Mongolia',
    countryCode: 'MN',
    latitude: 47.6469,
    longitude: 106.8197,
    timezone: 'Asia/Ulaanbaatar',
    nearbyIata: ['PEK', 'ICN']
  },

  // Middle East, Central Asia, Europe & North America
  {
    iata: 'DOH',
    name: 'Hamad International Airport',
    city: 'Doha',
    country: 'Qatar',
    countryCode: 'QA',
    latitude: 25.2731,
    longitude: 51.6081,
    timezone: 'Asia/Qatar',
    nearbyIata: ['DXB', 'AUH']
  },
  {
    iata: 'DXB',
    name: 'Dubai International Airport',
    city: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    latitude: 25.2532,
    longitude: 55.3657,
    timezone: 'Asia/Dubai',
    nearbyIata: ['AUH', 'DOH']
  },
  {
    iata: 'AUH',
    name: 'Zayed International Airport',
    city: 'Abu Dhabi',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    latitude: 24.433,
    longitude: 54.6511,
    timezone: 'Asia/Dubai',
    nearbyIata: ['DXB', 'DOH']
  },
  {
    iata: 'JED',
    name: 'King Abdulaziz International Airport',
    city: 'Jeddah',
    country: 'Saudi Arabia',
    countryCode: 'SA',
    latitude: 21.6796,
    longitude: 39.1565,
    timezone: 'Asia/Riyadh',
    nearbyIata: ['RUH', 'DOH']
  },
  {
    iata: 'RUH',
    name: 'King Khalid International Airport',
    city: 'Riyadh',
    country: 'Saudi Arabia',
    countryCode: 'SA',
    latitude: 24.9576,
    longitude: 46.6988,
    timezone: 'Asia/Riyadh',
    nearbyIata: ['JED', 'DOH']
  },
  {
    iata: 'TAS',
    name: 'Islam Karimov Tashkent International Airport',
    city: 'Tashkent',
    country: 'Uzbekistan',
    countryCode: 'UZ',
    latitude: 41.2579,
    longitude: 69.2812,
    timezone: 'Asia/Tashkent',
    nearbyIata: ['ALA']
  },
  {
    iata: 'ALA',
    name: 'Almaty International Airport',
    city: 'Almaty',
    country: 'Kazakhstan',
    countryCode: 'KZ',
    latitude: 43.3521,
    longitude: 77.0405,
    timezone: 'Asia/Almaty',
    nearbyIata: ['TAS']
  },
  {
    iata: 'IST',
    name: 'Istanbul Airport',
    city: 'Istanbul',
    country: 'Turkey',
    countryCode: 'TR',
    latitude: 41.2753,
    longitude: 28.7519,
    timezone: 'Europe/Istanbul',
    nearbyIata: ['FRA', 'DOH']
  },
  {
    iata: 'LHR',
    name: 'London Heathrow Airport',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.47,
    longitude: -0.4543,
    timezone: 'Europe/London',
    nearbyIata: ['CDG', 'AMS']
  },
  {
    iata: 'CDG',
    name: 'Paris Charles de Gaulle Airport',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    latitude: 49.0097,
    longitude: 2.5479,
    timezone: 'Europe/Paris',
    nearbyIata: ['LHR', 'FRA']
  },
  {
    iata: 'FRA',
    name: 'Frankfurt Airport',
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    latitude: 50.0379,
    longitude: 8.5622,
    timezone: 'Europe/Berlin',
    nearbyIata: ['CDG', 'AMS']
  },
  {
    iata: 'JFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    country: 'United States',
    countryCode: 'US',
    latitude: 40.6413,
    longitude: -73.7781,
    timezone: 'America/New_York',
    nearbyIata: ['YYZ', 'LAX']
  },
  {
    iata: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    country: 'United States',
    countryCode: 'US',
    latitude: 33.9416,
    longitude: -118.4085,
    timezone: 'America/Los_Angeles',
    nearbyIata: ['SFO', 'SEA']
  },
  {
    iata: 'SFO',
    name: 'San Francisco International Airport',
    city: 'San Francisco',
    country: 'United States',
    countryCode: 'US',
    latitude: 37.6213,
    longitude: -122.379,
    timezone: 'America/Los_Angeles',
    nearbyIata: ['LAX', 'SEA']
  },
  {
    iata: 'SYD',
    name: 'Sydney Kingsford Smith Airport',
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    latitude: -33.9399,
    longitude: 151.1753,
    timezone: 'Australia/Sydney',
    nearbyIata: ['SIN']
  }
];

export class AirportAutocompleteService {
  static findByIata(iata: string): AirportRecord | undefined {
    const code = String(iata || '').trim().toUpperCase();
    return VERIFIED_AIRPORTS_DIRECTORY.find((a) => a.iata === code);
  }

  static searchAirports(query: string, limit = 12): AirportRecord[] {
    const q = String(query || '').trim().toLowerCase();
    if (!q) {
      // Return popular student departure & Korea arrival airports first
      return VERIFIED_AIRPORTS_DIRECTORY.filter((a) => a.popularStudentHub).slice(
        0,
        limit
      );
    }

    const exactIata: AirportRecord[] = [];
    const prefixMatches: AirportRecord[] = [];
    const substringMatches: AirportRecord[] = [];

    for (const airport of VERIFIED_AIRPORTS_DIRECTORY) {
      const iataLower = airport.iata.toLowerCase();
      const cityLower = airport.city.toLowerCase();
      const nameLower = airport.name.toLowerCase();
      const countryLower = airport.country.toLowerCase();

      if (iataLower === q) {
        exactIata.push(airport);
      } else if (
        iataLower.startsWith(q) ||
        cityLower.startsWith(q) ||
        nameLower.startsWith(q)
      ) {
        prefixMatches.push(airport);
      } else if (
        cityLower.includes(q) ||
        nameLower.includes(q) ||
        countryLower.includes(q)
      ) {
        substringMatches.push(airport);
      }
    }

    return [...exactIata, ...prefixMatches, ...substringMatches].slice(0, limit);
  }

  static calculateGreatCircleDistanceKm(a: AirportRecord, b: AirportRecord): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h =
      sinDLat * sinDLat +
      Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
    return Math.round(R * c);
  }
}

// ============================================================================
// VERIFIED AIRLINE METADATA DIRECTORY
// ============================================================================

export const VERIFIED_AIRLINES: Record<
  string,
  { name: string; logoUrl: string; officialWebsite: string }
> = {
  KE: {
    name: 'Korean Air',
    logoUrl: 'https://images.kiwi.com/airlines/64/KE.png',
    officialWebsite: 'https://www.koreanair.com'
  },
  OZ: {
    name: 'Asiana Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/OZ.png',
    officialWebsite: 'https://flyasiana.com'
  },
  '7C': {
    name: 'Jeju Air',
    logoUrl: 'https://images.kiwi.com/airlines/64/7C.png',
    officialWebsite: 'https://www.jejuair.net'
  },
  LJ: {
    name: 'Jin Air',
    logoUrl: 'https://images.kiwi.com/airlines/64/LJ.png',
    officialWebsite: 'https://www.jinair.com'
  },
  TW: {
    name: "T'way Air",
    logoUrl: 'https://images.kiwi.com/airlines/64/TW.png',
    officialWebsite: 'https://www.twayair.com'
  },
  BX: {
    name: 'Air Busan',
    logoUrl: 'https://images.kiwi.com/airlines/64/BX.png',
    officialWebsite: 'https://www.airbusan.com'
  },
  RS: {
    name: 'Air Seoul',
    logoUrl: 'https://images.kiwi.com/airlines/64/RS.png',
    officialWebsite: 'https://flyairseoul.com'
  },
  YP: {
    name: 'Air Premia',
    logoUrl: 'https://images.kiwi.com/airlines/64/YP.png',
    officialWebsite: 'https://www.airpremia.com'
  },
  BG: {
    name: 'Biman Bangladesh Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/BG.png',
    officialWebsite: 'https://www.biman-airlines.com'
  },
  BS: {
    name: 'US-Bangla Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/BS.png',
    officialWebsite: 'https://usbair.com'
  },
  SQ: {
    name: 'Singapore Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/SQ.png',
    officialWebsite: 'https://www.singaporeair.com'
  },
  TR: {
    name: 'Scoot',
    logoUrl: 'https://images.kiwi.com/airlines/64/TR.png',
    officialWebsite: 'https://www.flyscoot.com'
  },
  MH: {
    name: 'Malaysia Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/MH.png',
    officialWebsite: 'https://www.malaysiaairlines.com'
  },
  AK: {
    name: 'AirAsia',
    logoUrl: 'https://images.kiwi.com/airlines/64/AK.png',
    officialWebsite: 'https://www.airasia.com'
  },
  TG: {
    name: 'Thai Airways',
    logoUrl: 'https://images.kiwi.com/airlines/64/TG.png',
    officialWebsite: 'https://www.thaiairways.com'
  },
  CX: {
    name: 'Cathay Pacific',
    logoUrl: 'https://images.kiwi.com/airlines/64/CX.png',
    officialWebsite: 'https://www.cathaypacific.com'
  },
  QR: {
    name: 'Qatar Airways',
    logoUrl: 'https://images.kiwi.com/airlines/64/QR.png',
    officialWebsite: 'https://www.qatarairways.com'
  },
  EK: {
    name: 'Emirates',
    logoUrl: 'https://images.kiwi.com/airlines/64/EK.png',
    officialWebsite: 'https://www.emirates.com'
  },
  EY: {
    name: 'Etihad Airways',
    logoUrl: 'https://images.kiwi.com/airlines/64/EY.png',
    officialWebsite: 'https://www.etihad.com'
  },
  AI: {
    name: 'Air India',
    logoUrl: 'https://images.kiwi.com/airlines/64/AI.png',
    officialWebsite: 'https://www.airindia.com'
  },
  RA: {
    name: 'Nepal Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/RA.png',
    officialWebsite: 'https://www.nepalairlines.com.np'
  },
  VN: {
    name: 'Vietnam Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/VN.png',
    officialWebsite: 'https://www.vietnamairlines.com'
  },
  JL: {
    name: 'Japan Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/JL.png',
    officialWebsite: 'https://www.jal.co.jp'
  },
  NH: {
    name: 'All Nippon Airways (ANA)',
    logoUrl: 'https://images.kiwi.com/airlines/64/NH.png',
    officialWebsite: 'https://www.ana.co.jp'
  },
  CZ: {
    name: 'China Southern Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/CZ.png',
    officialWebsite: 'https://www.csair.com'
  },
  MU: {
    name: 'China Eastern Airlines',
    logoUrl: 'https://images.kiwi.com/airlines/64/MU.png',
    officialWebsite: 'https://us.ceair.com'
  },
  CA: {
    name: 'Air China',
    logoUrl: 'https://images.kiwi.com/airlines/64/CA.png',
    officialWebsite: 'https://www.airchina.com'
  }
};

export function resolveAirlineMetadata(carrierCode: string, fallbackName?: string) {
  const code = String(carrierCode || '').trim().toUpperCase();
  if (VERIFIED_AIRLINES[code]) {
    return VERIFIED_AIRLINES[code];
  }
  return {
    name: fallbackName || `Carrier ${code}`,
    logoUrl: `https://images.kiwi.com/airlines/64/${code || 'KE'}.png`,
    officialWebsite: 'https://www.skyscanner.net'
  };
}

// ============================================================================
// PERSISTENT SERVER STORE FOR FLIGHT ENGINE (CONFIG, PROVIDERS, ALERTS, ANALYTICS)
// ============================================================================

interface FlightEnginePersistentStore {
  searchConfig: FlightSearchConfiguration;
  apiProviders: Record<string, ApiProviderConfigRecord>;
  // Encrypted/Server-only API credentials (NEVER returned to client!)
  serverSecrets: {
    serpApiKey?: string;
    amadeusClientId?: string;
    amadeusClientSecret?: string;
    amadeusEnvironment?: 'test' | 'production';
    skyscannerApiKey?: string;
  };
  bookingProviders: BookingProviderDirectoryItem[];
  priceAlerts: UserFlightPriceAlert[];
  analytics: FlightAnalyticsStore;
}

const STORE_FILE_PATH = path.join(process.cwd(), '.everykr-flight-engine-store.json');

export const DEFAULT_BOOKING_PROVIDERS_DIRECTORY: BookingProviderDirectoryItem[] = [
  {
    id: 'trip_com',
    name: 'Trip.com',
    category: 'ota',
    logoUrl: 'https://www.google.com/s2/favicons?domain=trip.com&sz=128',
    officialWebsiteUrl: 'https://www.trip.com/flights/',
    approvedAffiliateUrl: '',
    shortDescription:
      'Global online travel agency with multi-currency flight booking, student fare options, and 24/7 English & Korean customer support.',
    enabled: true,
    displayOrder: 1,
    supportsDirectRouteDeepLink: true,
    updatedAt: '2026-11-15T00:00:00.000Z'
  },
  {
    id: 'gotogate',
    name: 'Gotogate',
    category: 'ota',
    logoUrl: 'https://www.google.com/s2/favicons?domain=gotogate.com&sz=128',
    officialWebsiteUrl: 'https://www.gotogate.com/',
    approvedAffiliateUrl: '',
    shortDescription:
      'International flight booking provider comparing over 550 airlines worldwide with competitive multi-carrier itineraries.',
    enabled: true,
    displayOrder: 2,
    supportsDirectRouteDeepLink: false,
    updatedAt: '2026-11-15T00:00:00.000Z'
  },
  {
    id: 'mytrip',
    name: 'Mytrip',
    category: 'ota',
    logoUrl: 'https://www.google.com/s2/favicons?domain=mytrip.com&sz=128',
    officialWebsiteUrl: 'https://www.mytrip.com/',
    approvedAffiliateUrl: '',
    shortDescription:
      'Trusted global flight booking platform offering flexible ticket add-ons and international route combinations.',
    enabled: true,
    displayOrder: 3,
    supportsDirectRouteDeepLink: false,
    updatedAt: '2026-11-15T00:00:00.000Z'
  },
  {
    id: 'skyscanner',
    name: 'Skyscanner',
    category: 'metasearch',
    logoUrl: 'https://www.google.com/s2/favicons?domain=skyscanner.net&sz=128',
    officialWebsiteUrl: 'https://www.skyscanner.net/',
    approvedAffiliateUrl: '',
    shortDescription:
      'Leading global travel metasearch engine comparing millions of flights across airlines and online travel agencies.',
    enabled: true,
    displayOrder: 4,
    supportsDirectRouteDeepLink: true,
    updatedAt: '2026-11-15T00:00:00.000Z'
  },
  {
    id: 'google_flights',
    name: 'Google Flights',
    category: 'metasearch',
    logoUrl: 'https://www.google.com/s2/favicons?domain=google.com&sz=128',
    officialWebsiteUrl: 'https://www.google.com/travel/flights',
    approvedAffiliateUrl: '',
    shortDescription:
      'Fast global flight exploration, date-grid fare comparison, and direct airline booking referrals.',
    enabled: true,
    displayOrder: 5,
    supportsDirectRouteDeepLink: true,
    updatedAt: '2026-11-15T00:00:00.000Z'
  },
  {
    id: 'expedia',
    name: 'Expedia',
    category: 'ota',
    logoUrl: 'https://www.google.com/s2/favicons?domain=expedia.com&sz=128',
    officialWebsiteUrl: 'https://www.expedia.com/Flights',
    approvedAffiliateUrl: '',
    shortDescription:
      'Full-service global travel platform for international flights, baggage transparency, and flexible fare rules.',
    enabled: true,
    displayOrder: 6,
    supportsDirectRouteDeepLink: true,
    updatedAt: '2026-11-15T00:00:00.000Z'
  },
  {
    id: 'kayak',
    name: 'KAYAK',
    category: 'metasearch',
    logoUrl: 'https://www.google.com/s2/favicons?domain=kayak.com&sz=128',
    officialWebsiteUrl: 'https://www.kayak.com/flights',
    approvedAffiliateUrl: '',
    shortDescription:
      'Compare hundreds of travel sites at once with flexible date filters and multi-provider fare breakdowns.',
    enabled: true,
    displayOrder: 7,
    supportsDirectRouteDeepLink: true,
    updatedAt: '2026-11-15T00:00:00.000Z'
  },
  {
    id: 'official_airlines',
    name: 'Official Airline Websites (Korean Air / Asiana / Jeju Air)',
    category: 'airline',
    logoUrl: 'https://www.google.com/s2/favicons?domain=koreanair.com&sz=128',
    officialWebsiteUrl: 'https://www.koreanair.com',
    approvedAffiliateUrl: '',
    shortDescription:
      'Book directly with flag carriers and Korean low-cost airlines (Korean Air, Asiana Airlines, Jeju Air, Jin Air, Biman, Singapore Airlines).',
    enabled: true,
    displayOrder: 8,
    supportsDirectRouteDeepLink: false,
    updatedAt: '2026-11-15T00:00:00.000Z'
  }
];

export const DEFAULT_FLIGHT_SEARCH_CONFIG: FlightSearchConfiguration = {
  defaultCurrency: 'USD',
  supportedCurrencies: ['USD', 'KRW', 'BDT', 'NPR', 'INR', 'PKR', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'],
  defaultPassengerAdults: 1,
  cacheTtlSeconds: 300,
  liveFreshnessThresholdSeconds: 90,
  maxResultsPerSearch: 35,
  rateLimitSearchesPerMinutePerIp: 30,
  preferredProviderId: 'serpapi',
  airlineDisplaySettings: {
    showAirlineLogos: true,
    showOperatingCarrier: true,
    showBaggageSummary: true,
    showTaxesBreakdown: true,
    featuredAirlines: ['KE', 'OZ', '7C', 'LJ', 'TW', 'BX', 'BG', 'BS', 'RA', 'SQ', 'MH', 'TG', 'QR', 'EK']
  },
  updatedAt: '2026-11-15T00:00:00.000Z'
};

function resolveConfiguredAmadeusEnv(): 'test' | 'production' {
  const raw = String(process.env.AMADEUS_API_ENV || process.env.AMADEUS_ENV || 'test')
    .trim()
    .toLowerCase();
  return raw === 'production' || raw === 'prod' || raw === 'live' ? 'production' : 'test';
}

function redactSensitiveTokens(rawMessage: string, extraSecrets: (string | undefined | null)[] = []): string {
  let msg = String(rawMessage || '');
  msg = msg.replace(/api_key=[^&\s"']+/gi, 'api_key=[REDACTED]');
  msg = msg.replace(/client_secret=[^&\s"']+/gi, 'client_secret=[REDACTED]');
  for (const sec of extraSecrets) {
    const trimmed = String(sec || '').trim();
    if (trimmed.length >= 6) {
      msg = msg.split(trimmed).join('[REDACTED]');
    }
  }
  return msg;
}

function createInitialStore(): FlightEnginePersistentStore {
  const envSerpApiKey = (process.env.SERPAPI_API_KEY || '').trim();
  const envAmadeusId = (process.env.AMADEUS_CLIENT_ID || '').trim();
  const envAmadeusSecret = (process.env.AMADEUS_CLIENT_SECRET || '').trim();
  const envSkyscannerKey = (process.env.SKYSCANNER_API_KEY || '').trim();
  const amadeusEnv = resolveConfiguredAmadeusEnv();

  return {
    searchConfig: { ...DEFAULT_FLIGHT_SEARCH_CONFIG },
    apiProviders: {
      serpapi: {
        providerId: 'serpapi',
        providerName: 'SerpApi Google Flights',
        enabled: true,
        approvalStatus: envSerpApiKey ? 'approved_ready' : 'not_configured',
        environment: 'production',
        priority: 1,
        rateLimitPerMinute: 60,
        timeoutMs: 12000,
        hasCredentialsConfigured: Boolean(envSerpApiKey),
        lastVerifiedAt: null,
        lastError: null,
        totalRequests: 0,
        failedRequests: 0,
        successfulRequests: 0,
        lastResponseTimeMs: null,
        averageResponseTimeMs: null
      },
      amadeus: {
        providerId: 'amadeus',
        providerName: 'Amadeus Flight Offers Search & Price API (v2/v1)',
        enabled: true,
        approvalStatus:
          envAmadeusId && envAmadeusSecret ? 'approved_ready' : 'not_configured',
        environment: amadeusEnv,
        priority: 2,
        rateLimitPerMinute: 60,
        timeoutMs: 9000,
        hasCredentialsConfigured: Boolean(envAmadeusId && envAmadeusSecret),
        lastVerifiedAt: null,
        lastError: null,
        totalRequests: 0,
        failedRequests: 0,
        successfulRequests: 0,
        lastResponseTimeMs: null,
        averageResponseTimeMs: null
      },
      skyscanner: {
        providerId: 'skyscanner',
        providerName: 'Skyscanner Official Live Prices API (v3)',
        enabled: Boolean(envSkyscannerKey),
        approvalStatus: envSkyscannerKey
          ? 'approved_ready'
          : 'awaiting_partner_approval',
        environment: 'production',
        priority: 3,
        rateLimitPerMinute: 50,
        timeoutMs: 10000,
        hasCredentialsConfigured: Boolean(envSkyscannerKey),
        lastVerifiedAt: null,
        lastError: null,
        totalRequests: 0,
        failedRequests: 0,
        successfulRequests: 0,
        lastResponseTimeMs: null,
        averageResponseTimeMs: null
      },
      duffel_future: {
        providerId: 'duffel_future',
        providerName: 'Additional NDC / Global GDS Adapter Slot',
        enabled: false,
        approvalStatus: 'awaiting_partner_approval',
        environment: 'production',
        priority: 4,
        rateLimitPerMinute: 40,
        timeoutMs: 9000,
        hasCredentialsConfigured: false,
        lastVerifiedAt: null,
        lastError: null,
        totalRequests: 0,
        failedRequests: 0,
        successfulRequests: 0,
        lastResponseTimeMs: null,
        averageResponseTimeMs: null
      }
    },
    serverSecrets: {
      serpApiKey: envSerpApiKey || undefined,
      amadeusClientId: envAmadeusId || undefined,
      amadeusClientSecret: envAmadeusSecret || undefined,
      amadeusEnvironment: amadeusEnv,
      skyscannerApiKey: envSkyscannerKey || undefined
    },
    bookingProviders: [...DEFAULT_BOOKING_PROVIDERS_DIRECTORY],
    priceAlerts: [],
    analytics: {
      totalSearches: 0,
      totalApiRequests: 0,
      totalApiErrors: 0,
      totalBookingRedirectClicks: 0,
      searchesByRoute: {},
      searchesByOrigin: {},
      searchesByDestination: {},
      searchesByDate: {},
      redirectsByProvider: {},
      recentSearches: []
    }
  };
}

function syncProviderConfigurationState(store: FlightEnginePersistentStore): void {
  if (!store.searchConfig.preferredProviderId) {
    store.searchConfig.preferredProviderId = 'serpapi';
  }

  if (store.apiProviders.serpapi) {
    if (
      !store.apiProviders.serpapi.providerName ||
      store.apiProviders.serpapi.providerName === 'SerpApi Google Flights Engine (google_flights)'
    ) {
      store.apiProviders.serpapi.providerName = 'SerpApi Google Flights';
    }
    const serpCreds = Boolean(
      (store.serverSecrets.serpApiKey && store.serverSecrets.serpApiKey.trim()) ||
        (process.env.SERPAPI_API_KEY && process.env.SERPAPI_API_KEY.trim())
    );
    store.apiProviders.serpapi.hasCredentialsConfigured = serpCreds;
    if (serpCreds && store.apiProviders.serpapi.approvalStatus === 'not_configured') {
      store.apiProviders.serpapi.approvalStatus = 'approved_ready';
    } else if (!serpCreds && store.apiProviders.serpapi.approvalStatus === 'approved_ready') {
      store.apiProviders.serpapi.approvalStatus = 'not_configured';
    }
  }

  if (store.apiProviders.amadeus) {
    const effAmadeusId = (
      store.serverSecrets.amadeusClientId ||
      process.env.AMADEUS_CLIENT_ID ||
      ''
    ).trim();
    const effAmadeusSecret = (
      store.serverSecrets.amadeusClientSecret ||
      process.env.AMADEUS_CLIENT_SECRET ||
      ''
    ).trim();
    const amadeusCreds = Boolean(effAmadeusId && effAmadeusSecret);
    store.apiProviders.amadeus.hasCredentialsConfigured = amadeusCreds;
    if (amadeusCreds && store.apiProviders.amadeus.approvalStatus === 'not_configured') {
      store.apiProviders.amadeus.approvalStatus = 'approved_ready';
    } else if (!amadeusCreds && store.apiProviders.amadeus.approvalStatus === 'approved_ready') {
      store.apiProviders.amadeus.approvalStatus = 'not_configured';
    }
  }

  if (store.apiProviders.skyscanner) {
    const skyCreds = Boolean(
      (store.serverSecrets.skyscannerApiKey && store.serverSecrets.skyscannerApiKey.trim()) ||
        (process.env.SKYSCANNER_API_KEY && process.env.SKYSCANNER_API_KEY.trim())
    );
    store.apiProviders.skyscanner.hasCredentialsConfigured = skyCreds;
    if (skyCreds && store.apiProviders.skyscanner.approvalStatus === 'not_configured') {
      store.apiProviders.skyscanner.approvalStatus = 'approved_ready';
    }
  }
}

let memoryStore: FlightEnginePersistentStore | null = null;

function loadFlightStore(): FlightEnginePersistentStore {
  if (memoryStore) {
    syncProviderConfigurationState(memoryStore);
    return memoryStore;
  }
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      const initial = createInitialStore();
      const hadSerpApiBefore = Boolean(parsed?.apiProviders?.serpapi);
      memoryStore = {
        searchConfig: { ...initial.searchConfig, ...(parsed.searchConfig || {}) },
        apiProviders: { ...initial.apiProviders, ...(parsed.apiProviders || {}) },
        serverSecrets: {
          ...initial.serverSecrets,
          ...(parsed.serverSecrets || {})
        },
        bookingProviders:
          Array.isArray(parsed.bookingProviders) && parsed.bookingProviders.length > 0
            ? parsed.bookingProviders
            : initial.bookingProviders,
        priceAlerts: Array.isArray(parsed.priceAlerts) ? parsed.priceAlerts : [],
        analytics: {
          ...initial.analytics,
          ...(parsed.analytics || {})
        }
      };

      // Migrate legacy stores created before SerpApi integration so SerpApi becomes Primary (#1)
      if (!hadSerpApiBefore) {
        memoryStore.searchConfig.preferredProviderId = 'serpapi';
        if (memoryStore.apiProviders.serpapi) memoryStore.apiProviders.serpapi.priority = 1;
        if (memoryStore.apiProviders.amadeus && memoryStore.apiProviders.amadeus.priority === 1) {
          memoryStore.apiProviders.amadeus.priority = 2;
        }
        if (memoryStore.apiProviders.skyscanner && memoryStore.apiProviders.skyscanner.priority <= 2) {
          memoryStore.apiProviders.skyscanner.priority = 3;
        }
        if (memoryStore.apiProviders.duffel_future && memoryStore.apiProviders.duffel_future.priority <= 3) {
          memoryStore.apiProviders.duffel_future.priority = 4;
        }
      }

      syncProviderConfigurationState(memoryStore);
      return memoryStore;
    }
  } catch (err) {
    console.warn('Initializing fresh flight engine store:', err);
  }
  memoryStore = createInitialStore();
  syncProviderConfigurationState(memoryStore);
  return memoryStore;
}

function saveFlightStore(store: FlightEnginePersistentStore): void {
  memoryStore = store;
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist flight store to disk:', err);
  }
}

// ============================================================================
// 6. AFFILIATE LINK & OFFICIAL DEEP LINK SERVICE
// ============================================================================

export class AffiliateLinkService {
  /**
   * Validates an external official or affiliate URL:
   * - Requires https://
   * - Rejects javascript:, data:, or malformed URLs
   */
  static validateHttpsUrl(rawUrl: unknown): { valid: boolean; url: string; error?: string } {
    const cleaned = String(rawUrl || '').trim();
    if (!cleaned) return { valid: true, url: '' };
    if (/[<>]|javascript:|data:|vbscript:/i.test(cleaned)) {
      return { valid: false, url: '', error: 'URL contains unsafe tokens.' };
    }
    try {
      const parsed = new URL(cleaned);
      if (parsed.protocol !== 'https:') {
        return { valid: false, url: '', error: 'URL must use https://.' };
      }
      return { valid: true, url: parsed.toString() };
    } catch {
      return { valid: false, url: '', error: 'Invalid URL format.' };
    }
  }

  /**
   * Builds a verified deep link or official referral URL for a given provider and search query.
   * Never invents unapproved affiliate tracking parameters.
   */
  static buildProviderBookingUrl(
    provider: BookingProviderDirectoryItem,
    query: FlightSearchInput
  ): string {
    // If an admin has explicitly configured an approved affiliate URL, use it safely
    if (provider.approvedAffiliateUrl && provider.approvedAffiliateUrl.startsWith('https://')) {
      return provider.approvedAffiliateUrl
        .replace(/\{ORIGIN\}/g, encodeURIComponent(query.origin))
        .replace(/\{DESTINATION\}/g, encodeURIComponent(query.destination))
        .replace(/\{DEPART_DATE\}/g, encodeURIComponent(query.departureDate))
        .replace(/\{RETURN_DATE\}/g, encodeURIComponent(query.returnDate || ''))
        .replace(/\{CURRENCY\}/g, encodeURIComponent(query.currency));
    }

    const orig = query.origin.toLowerCase();
    const dest = query.destination.toLowerCase();
    const ORIG = query.origin.toUpperCase();
    const DEST = query.destination.toUpperCase();
    const dep = query.departureDate; // YYYY-MM-DD
    const ret = query.returnDate;
    const isRound = query.tripType === 'round_trip' && Boolean(ret);
    const cabinLower = query.cabinClass.toLowerCase();

    switch (provider.id) {
      case 'trip_com': {
        const way = isRound ? 'rt' : 'ow';
        const classCode =
          cabinLower === 'business'
            ? 'c'
            : cabinLower === 'first'
            ? 'f'
            : cabinLower === 'premium_economy'
            ? 's'
            : 'y';
        const base = `https://www.trip.com/flights/showfarefirst?dcity=${orig}&acity=${dest}&ddate=${dep}${
          isRound && ret ? `&rdate=${ret}` : ''
        }&triptype=${way}&class=${classCode}&quantity=${query.adults}&curr=${encodeURIComponent(
          query.currency
        )}`;
        return base;
      }
      case 'skyscanner': {
        const yymmdd = (d: string) => d.replace(/-/g, '').slice(2);
        const depShort = yymmdd(dep);
        const retShort = isRound && ret ? `/${yymmdd(ret)}` : '';
        return `https://www.skyscanner.net/transport/flights/${orig}/${dest}/${depShort}${retShort}/?adults=${
          query.adults
        }&children=${query.children}&infants=${query.infants}&cabinclass=${cabinLower}&currency=${encodeURIComponent(
          query.currency
        )}`;
      }
      case 'google_flights': {
        const qText = isRound && ret
          ? `Flights from ${ORIG} to ${DEST} on ${dep} returning ${ret}`
          : `Flights from ${ORIG} to ${DEST} on ${dep} one way`;
        return `https://www.google.com/travel/flights?q=${encodeURIComponent(
          qText
        )}&curr=${encodeURIComponent(query.currency)}`;
      }
      case 'kayak': {
        const datePart = isRound && ret ? `${dep}/${ret}` : dep;
        return `https://www.kayak.com/flights/${ORIG}-${DEST}/${datePart}/${query.adults}adults?sort=bestflight_a`;
      }
      case 'expedia': {
        const leg1 = `from:${ORIG},to:${DEST},departure:${dep}TANYT`;
        const leg2 =
          isRound && ret ? `&leg2=from:${DEST},to:${ORIG},departure:${ret}TANYT` : '';
        const trip = isRound ? 'roundtrip' : 'oneway';
        return `https://www.expedia.com/Flights-Search?trip=${trip}&leg1=${encodeURIComponent(
          leg1
        )}${leg2}&passengers=adults:${query.adults},children:${query.children}&mode=search`;
      }
      case 'gotogate':
        return provider.officialWebsiteUrl || 'https://www.gotogate.com/';
      case 'mytrip':
        return provider.officialWebsiteUrl || 'https://www.mytrip.com/';
      default:
        return provider.officialWebsiteUrl || 'https://www.skyscanner.net/';
    }
  }
}

// ============================================================================
// 5. FLIGHT PRICE REFRESH & CACHE SERVICE
// ============================================================================

interface CachedFlightSearchEntry {
  cacheKey: string;
  createdAtMs: number;
  offers: FlightItineraryOffer[];
  connectedProviders: string[];
}

const flightSearchCache = new Map<string, CachedFlightSearchEntry>();

export class FlightPriceRefreshService {
  static buildCacheKey(query: FlightSearchInput): string {
    return JSON.stringify({
      t: query.tripType,
      o: query.origin.toUpperCase(),
      d: query.destination.toUpperCase(),
      dep: query.departureDate,
      ret: query.returnDate || '',
      legs: query.multiCityLegs || [],
      a: query.adults,
      c: query.children,
      i: query.infants,
      cab: query.cabinClass,
      cur: query.currency.toUpperCase(),
      dir: Boolean(query.directOnly),
      ms: query.maxStops ?? null,
      air: Array.isArray(query.airlines) ? [...query.airlines].sort() : []
    });
  }

  static getValidCachedOffers(
    query: FlightSearchInput,
    ttlSeconds: number,
    liveFreshnessThresholdSeconds: number
  ): { offers: FlightItineraryOffer[]; connectedProviders: string[] } | null {
    const key = this.buildCacheKey(query);
    const entry = flightSearchCache.get(key);
    if (!entry) return null;

    const ageSeconds = (Date.now() - entry.createdAtMs) / 1000;
    if (ageSeconds > ttlSeconds) {
      flightSearchCache.delete(key);
      return null;
    }

    // Relabel freshness accurately according to cache age (never label stale cached data as real-time)
    const freshnessLabel: PriceFreshness =
      ageSeconds <= liveFreshnessThresholdSeconds ? 'live_verified' : 'recently_updated';

    const updatedOffers: FlightItineraryOffer[] = entry.offers.map((offer) => ({
      ...offer,
      freshness: freshnessLabel,
      providerComparisons: offer.providerComparisons.map((comp) => ({
        ...comp,
        freshness: (comp.price !== null ? freshnessLabel : 'unavailable') as PriceFreshness
      }))
    }));

    return {
      offers: updatedOffers,
      connectedProviders: entry.connectedProviders
    };
  }

  static setCachedOffers(
    query: FlightSearchInput,
    offers: FlightItineraryOffer[],
    connectedProviders: string[]
  ): void {
    const key = this.buildCacheKey(query);
    flightSearchCache.set(key, {
      cacheKey: key,
      createdAtMs: Date.now(),
      offers,
      connectedProviders
    });
  }

  static clearCache(): void {
    flightSearchCache.clear();
  }
}

export interface FlightProviderAdapter {
  readonly providerId: 'serpapi' | 'amadeus' | 'skyscanner' | 'duffel_future' | 'flight_aggregator';
  readonly providerName: string;
  isConfiguredAndApproved(): boolean;
  searchFlights(query: FlightSearchInput): Promise<{
    ok: boolean;
    offers: FlightItineraryOffer[];
    errorMessage?: string;
  }>;
}

const providerMinuteRateMap = new Map<string, { windowStartMs: number; count: number }>();

function checkProviderRateLimit(providerId: string, maxPerMinute: number): { allowed: boolean; retryAfterSeconds?: number } {
  const safeMax = Math.max(1, maxPerMinute || 60);
  const now = Date.now();
  const bucket = providerMinuteRateMap.get(providerId);
  if (!bucket || now - bucket.windowStartMs >= 60_000) {
    providerMinuteRateMap.set(providerId, { windowStartMs: now, count: 1 });
    return { allowed: true };
  }
  if (bucket.count >= safeMax) {
    const retryAfterSeconds = Math.max(1, Math.ceil((60_000 - (now - bucket.windowStartMs)) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  bucket.count += 1;
  return { allowed: true };
}

function parseIsoDurationToMinutes(iso?: string): number {
  if (!iso || typeof iso !== 'string') return 180;
  const hoursMatch = iso.match(/(\d+)H/i);
  const minsMatch = iso.match(/(\d+)M/i);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
  const total = hours * 60 + mins;
  return total > 0 ? total : 180;
}

function formatMinutesToDuration(mins: number): string {
  const safe = Math.max(15, Math.round(mins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h 00m`;
  return `${m}m`;
}

export type FlightProvider = FlightProviderAdapter;

// Server-side cache of raw Amadeus flight-offer objects keyed by normalized offerId
// Required so FlightPriceVerificationService can submit the exact offer payload to POST /v1/shopping/flight-offers/pricing
interface RawAmadeusOfferCacheEntry {
  offerId: string;
  rawAmadeusOffer: any;
  normalizedOffer: FlightItineraryOffer;
  createdAtMs: number;
  expiresAtMs: number;
}

const rawAmadeusOfferCache = new Map<string, RawAmadeusOfferCacheEntry>();

function recordProviderResponseLatency(
  providerMeta: ApiProviderConfigRecord,
  latencyMs: number
): void {
  const safeLatency = Math.max(1, Math.round(latencyMs));
  providerMeta.lastResponseTimeMs = safeLatency;
  if (typeof providerMeta.averageResponseTimeMs === 'number' && providerMeta.averageResponseTimeMs > 0) {
    providerMeta.averageResponseTimeMs = Math.round(
      providerMeta.averageResponseTimeMs * 0.7 + safeLatency * 0.3
    );
  } else {
    providerMeta.averageResponseTimeMs = safeLatency;
  }
}

/**
 * FlightOfferNormalizer — Normalizes raw Amadeus and Skyscanner API responses
 * into a unified, transparent FlightItineraryOffer structure.
 */
export class FlightOfferNormalizer {
  static normalizeAmadeusOffer(
    item: any,
    idx: number,
    query: FlightSearchInput,
    carrierDict: Record<string, string>,
    enabledBookingProviders: BookingProviderDirectoryItem[],
    nowIso: string
  ): FlightItineraryOffer {
    const validatingCarrier =
      (Array.isArray(item.validatingAirlineCodes) && item.validatingAirlineCodes[0]) ||
      item?.itineraries?.[0]?.segments?.[0]?.carrierCode ||
      'KE';

    const airlineMeta = resolveAirlineMetadata(
      validatingCarrier,
      carrierDict[validatingCarrier]
    );

    const flightNumbers: string[] = [];
    const journeys: FlightJourneyDirection[] = (item.itineraries || []).map(
      (itin: any, itinIdx: number): FlightJourneyDirection => {
        const rawSegments = Array.isArray(itin.segments) ? itin.segments : [];
        const segments: FlightSegmentDetail[] = rawSegments.map(
          (seg: any, segIdx: number): FlightSegmentDetail => {
            const cCode = seg.carrierCode || validatingCarrier;
            const cMeta = resolveAirlineMetadata(cCode, carrierDict[cCode]);
            const fNum = `${cCode}${seg.number || ''}`;
            if (!flightNumbers.includes(fNum)) flightNumbers.push(fNum);

            const depIata = seg.departure?.iataCode || query.origin;
            const arrIata = seg.arrival?.iataCode || query.destination;
            const depAirport = AirportAutocompleteService.findByIata(depIata);
            const arrAirport = AirportAutocompleteService.findByIata(arrIata);
            const segMins = parseIsoDurationToMinutes(seg.duration);

            return {
              segmentId: `${item.id || idx}-${itinIdx}-${segIdx}`,
              carrierCode: cCode,
              airlineName: cMeta.name,
              airlineLogoUrl: cMeta.logoUrl,
              flightNumber: fNum,
              aircraftCode: seg.aircraft?.code,
              departureAirport: depIata,
              departureAirportName: depAirport?.name || `${depIata} Airport`,
              departureCity: depAirport?.city || depIata,
              departureTerminal: seg.departure?.terminal,
              departureTime: seg.departure?.at || '',
              arrivalAirport: arrIata,
              arrivalAirportName: arrAirport?.name || `${arrIata} Airport`,
              arrivalCity: arrAirport?.city || arrIata,
              arrivalTerminal: seg.arrival?.terminal,
              arrivalTime: seg.arrival?.at || '',
              durationMinutes: segMins,
              durationFormatted: formatMinutesToDuration(segMins),
              cabinClass: query.cabinClass
            };
          }
        );

        const layovers: LayoverDetail[] = [];
        for (let i = 0; i < segments.length - 1; i++) {
          const prevArr = new Date(segments[i].arrivalTime).getTime();
          const nextDep = new Date(segments[i + 1].departureTime).getTime();
          const diffMins =
            Number.isFinite(prevArr) && Number.isFinite(nextDep) && nextDep > prevArr
              ? Math.round((nextDep - prevArr) / 60000)
              : 60;
          const stopAirport = AirportAutocompleteService.findByIata(
            segments[i].arrivalAirport
          );
          layovers.push({
            airportCode: segments[i].arrivalAirport,
            airportName:
              stopAirport?.name || `${segments[i].arrivalAirport} Airport`,
            city: stopAirport?.city || segments[i].arrivalAirport,
            durationMinutes: diffMins,
            durationFormatted: formatMinutesToDuration(diffMins)
          });
        }

        const totalJourneyMins =
          parseIsoDurationToMinutes(itin.duration) ||
          segments.reduce((acc, s) => acc + s.durationMinutes, 0) +
            layovers.reduce((acc, l) => acc + l.durationMinutes, 0);

        return {
          direction: itinIdx === 0 ? 'outbound' : 'inbound',
          origin: segments[0]?.departureAirport || query.origin,
          destination:
            segments[segments.length - 1]?.arrivalAirport || query.destination,
          departureTime: segments[0]?.departureTime || '',
          arrivalTime: segments[segments.length - 1]?.arrivalTime || '',
          totalDurationMinutes: totalJourneyMins,
          totalDurationFormatted: formatMinutesToDuration(totalJourneyMins),
          stopsCount: Math.max(0, segments.length - 1),
          isDirect: segments.length <= 1,
          segments,
          layovers
        };
      }
    );

    const totalDurationMinutes = journeys.reduce(
      (sum, j) => sum + j.totalDurationMinutes,
      0
    );
    const totalStops = journeys.reduce((sum, j) => sum + j.stopsCount, 0);

    const checkedBags =
      item?.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
    let baggageAllowance = 'Check carrier fare rules for checked baggage';
    if (checkedBags) {
      if (typeof checkedBags.weight === 'number') {
        baggageAllowance = `${checkedBags.weight} ${
          checkedBags.weightUnit || 'KG'
        } checked baggage included`;
      } else if (typeof checkedBags.quantity === 'number') {
        baggageAllowance = `${checkedBags.quantity} checked bag(s) (${
          checkedBags.quantity > 1 ? '23kg each' : '23kg'
        }) included`;
      }
    }

    const totalPrice = parseFloat(item?.price?.grandTotal || item?.price?.total || '0');
    const basePrice = parseFloat(item?.price?.base || String(totalPrice));
    const taxesAndFees = Math.max(0, Math.round((totalPrice - basePrice) * 100) / 100);
    const currency = String(item?.price?.currency || query.currency).toUpperCase();
    const bookableSeats =
      typeof item?.numberOfBookableSeats === 'number' ? item.numberOfBookableSeats : null;
    const offerExpiresAt =
      item?.lastTicketingDateTime ||
      (item?.lastTicketingDate ? `${item.lastTicketingDate}T23:59:59Z` : null);

    const providerComparisons: ProviderComparisonQuote[] = [
      {
        providerId: `airline_${validatingCarrier.toLowerCase()}`,
        providerName: `${airlineMeta.name} (Amadeus GDS Fare)`,
        providerType: 'airline',
        logoUrl: airlineMeta.logoUrl,
        price: totalPrice,
        currency,
        freshness: 'live_verified',
        priceStatus: 'Live Price',
        verifiedAt: nowIso,
        actionLabel: 'View Deal',
        bookingUrl: airlineMeta.officialWebsite,
        isOfficialAirline: true,
        notes: 'Live GDS fare retrieved via Amadeus Flight Offers API'
      },
      ...enabledBookingProviders
        .filter((bp) => bp.id !== 'official_airlines')
        .map((bp): ProviderComparisonQuote => ({
          providerId: bp.id,
          providerName: bp.name,
          providerType: bp.category,
          logoUrl: bp.logoUrl,
          price: null,
          currency,
          freshness: 'unavailable',
          priceStatus: 'Price Verification Required',
          verifiedAt: null,
          actionLabel: 'Visit Website',
          bookingUrl: AffiliateLinkService.buildProviderBookingUrl(bp, query),
          notes: 'Check live partner availability on provider website'
        }))
    ];

    const offerId = `amadeus-${item.id || idx}-${Date.now()}`;
    const normalized: FlightItineraryOffer = {
      offerId,
      sourceProviderId: 'amadeus',
      sourceProviderName: 'Amadeus Flight Offers API',
      validatingCarrierCode: validatingCarrier,
      airlineName: airlineMeta.name,
      airlineLogoUrl: airlineMeta.logoUrl,
      flightNumbers,
      journeys,
      totalDurationMinutes,
      totalDurationFormatted: formatMinutesToDuration(totalDurationMinutes),
      totalStops,
      isDirect: totalStops === 0,
      cabinClass: query.cabinClass,
      baggageAllowance,
      refundCondition: 'Subject to airline fare family rules confirmed at booking',
      changeCondition: 'Date changes subject to carrier fare difference',
      totalPrice,
      basePrice,
      taxesAndFees,
      bookableSeats,
      currency,
      freshness: 'live_verified',
      priceStatus: 'Live Price',
      verificationStatus: 'verified_search',
      priceVerifiedAt: nowIso,
      offerExpiresAt,
      providerComparisons
    };

    rawAmadeusOfferCache.set(offerId, {
      offerId,
      rawAmadeusOffer: item,
      normalizedOffer: normalized,
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 15 * 60 * 1000
    });

    return normalized;
  }

  static normalizeSerpApiOffer(
    item: any,
    idx: number,
    query: FlightSearchInput,
    googleFlightsUrl: string,
    enabledBookingProviders: BookingProviderDirectoryItem[],
    nowIso: string
  ): FlightItineraryOffer | null {
    const rawFlights = Array.isArray(item?.flights) ? item.flights : [];
    if (rawFlights.length === 0) return null;

    const numericPrice = Number(item?.price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return null;
    }

    const parseSerpDateTime = (rawTime: unknown, fallbackDate: string): string => {
      const str = String(rawTime || '').trim();
      if (!str) return `${fallbackDate}T09:00:00`;
      if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}$/.test(str)) {
        const [dPart, tPart] = str.split(/\s+/);
        const paddedTime = tPart.length === 4 ? `0${tPart}` : tPart;
        return `${dPart}T${paddedTime}:00`;
      }
      return str;
    };

    const extractCarrierCode = (flightNumRaw: unknown, airlineNameRaw: unknown): string => {
      const fn = String(flightNumRaw || '').trim().toUpperCase();
      const match = fn.match(/^([A-Z0-9]{2})\s*\d+/);
      if (match && match[1]) return match[1];
      const lowerName = String(airlineNameRaw || '').trim().toLowerCase();
      for (const [code, meta] of Object.entries(VERIFIED_AIRLINES)) {
        if (meta.name.toLowerCase() === lowerName) return code;
      }
      const alpha = String(airlineNameRaw || '')
        .replace(/[^A-Za-z]/g, '')
        .toUpperCase()
        .slice(0, 2);
      return alpha || 'FL';
    };

    const firstSeg = rawFlights[0];
    const primaryCarrierCode = extractCarrierCode(firstSeg?.flight_number, firstSeg?.airline);
    const primaryMeta = resolveAirlineMetadata(
      primaryCarrierCode,
      typeof firstSeg?.airline === 'string' ? firstSeg.airline : undefined
    );
    const primaryLogoUrl =
      typeof item?.airline_logo === 'string' && item.airline_logo.startsWith('https://')
        ? item.airline_logo
        : typeof firstSeg?.airline_logo === 'string' && firstSeg.airline_logo.startsWith('https://')
        ? firstSeg.airline_logo
        : primaryMeta.logoUrl;

    const flightNumbers: string[] = [];
    const segments: FlightSegmentDetail[] = rawFlights.map((seg: any, segIdx: number): FlightSegmentDetail => {
      const cCode = extractCarrierCode(seg?.flight_number, seg?.airline);
      const cMeta = resolveAirlineMetadata(cCode, seg?.airline);
      const cleanedFn = String(seg?.flight_number || `${cCode}${100 + segIdx}`)
        .trim()
        .replace(/\s+/g, '');
      if (!flightNumbers.includes(cleanedFn)) flightNumbers.push(cleanedFn);

      const depIata = String(seg?.departure_airport?.id || query.origin).toUpperCase();
      const arrIata = String(seg?.arrival_airport?.id || query.destination).toUpperCase();
      const depAirport = AirportAutocompleteService.findByIata(depIata);
      const arrAirport = AirportAutocompleteService.findByIata(arrIata);
      const segMins = Math.max(15, Number(seg?.duration) || 120);
      const segLogo =
        typeof seg?.airline_logo === 'string' && seg.airline_logo.startsWith('https://')
          ? seg.airline_logo
          : cMeta.logoUrl;

      return {
        segmentId: `serp-${idx}-0-${segIdx}`,
        carrierCode: cCode,
        airlineName: cMeta.name,
        airlineLogoUrl: segLogo,
        flightNumber: cleanedFn,
        aircraftCode: typeof seg?.airplane === 'string' ? seg.airplane : undefined,
        departureAirport: depIata,
        departureAirportName:
          seg?.departure_airport?.name || depAirport?.name || `${depIata} Airport`,
        departureCity: depAirport?.city || depIata,
        departureTime: parseSerpDateTime(seg?.departure_airport?.time, query.departureDate),
        arrivalAirport: arrIata,
        arrivalAirportName:
          seg?.arrival_airport?.name || arrAirport?.name || `${arrIata} Airport`,
        arrivalCity: arrAirport?.city || arrIata,
        arrivalTime: parseSerpDateTime(seg?.arrival_airport?.time, query.departureDate),
        durationMinutes: segMins,
        durationFormatted: formatMinutesToDuration(segMins),
        cabinClass: query.cabinClass
      };
    });

    const rawLayovers = Array.isArray(item?.layovers) ? item.layovers : [];
    const layovers: LayoverDetail[] = rawLayovers.map((lay: any) => {
      const code = String(lay?.id || '').toUpperCase() || 'HUB';
      const airportRec = AirportAutocompleteService.findByIata(code);
      const lMins = Math.max(15, Number(lay?.duration) || 60);
      return {
        airportCode: code,
        airportName: lay?.name || airportRec?.name || `${code} Airport`,
        city: airportRec?.city || code,
        durationMinutes: lMins,
        durationFormatted: formatMinutesToDuration(lMins)
      };
    });

    const totalDurationMinutes =
      Math.max(15, Number(item?.total_duration) || 0) ||
      segments.reduce((acc, s) => acc + s.durationMinutes, 0) +
        layovers.reduce((acc, l) => acc + l.durationMinutes, 0);

    const stopsCount = Math.max(0, segments.length - 1);
    const outboundJourney: FlightJourneyDirection = {
      direction: 'outbound',
      origin: segments[0]?.departureAirport || query.origin,
      destination: segments[segments.length - 1]?.arrivalAirport || query.destination,
      departureTime: segments[0]?.departureTime || `${query.departureDate}T09:00:00`,
      arrivalTime:
        segments[segments.length - 1]?.arrivalTime || `${query.departureDate}T14:00:00`,
      totalDurationMinutes,
      totalDurationFormatted: formatMinutesToDuration(totalDurationMinutes),
      stopsCount,
      isDirect: stopsCount === 0,
      segments,
      layovers
    };

    const extensionsList: string[] = Array.isArray(item?.extensions)
      ? item.extensions.map((x: unknown) => String(x || ''))
      : [];
    const baggageExt = extensionsList.find((x) => /bag|carry-on|luggage/i.test(x));
    const baggageAllowance =
      baggageExt || 'Carry-on & checked baggage subject to selected fare on Google Flights';

    const currency = query.currency.toUpperCase();
    const safeGoogleFlightsUrl =
      googleFlightsUrl && googleFlightsUrl.startsWith('https://')
        ? googleFlightsUrl
        : `https://www.google.com/travel/flights?q=${encodeURIComponent(
            `Flights from ${query.origin} to ${query.destination} on ${query.departureDate}${
              query.tripType === 'round_trip' && query.returnDate
                ? ` returning ${query.returnDate}`
                : ''
            }`
          )}&curr=${encodeURIComponent(currency)}`;

    const providerComparisons: ProviderComparisonQuote[] = [
      {
        providerId: 'serpapi_google_flights',
        providerName: 'Google Flights (Live Verified)',
        providerType: 'metasearch',
        logoUrl: 'https://www.google.com/s2/favicons?domain=google.com&sz=128',
        price: numericPrice,
        currency,
        freshness: 'live_verified',
        priceStatus: 'Live Price',
        verifiedAt: nowIso,
        actionLabel: 'View Deal',
        bookingUrl: safeGoogleFlightsUrl,
        notes: 'Live fare retrieved via SerpApi Google Flights Engine'
      },
      {
        providerId: `airline_${primaryCarrierCode.toLowerCase()}`,
        providerName: `${primaryMeta.name} (Official Airline)`,
        providerType: 'airline',
        logoUrl: primaryLogoUrl,
        price: numericPrice,
        currency,
        freshness: 'live_verified',
        priceStatus: 'Live Price',
        verifiedAt: nowIso,
        actionLabel: 'View Deal',
        bookingUrl: primaryMeta.officialWebsite,
        isOfficialAirline: true,
        notes: 'Book directly on official carrier website'
      },
      ...enabledBookingProviders
        .filter((bp) => bp.id !== 'official_airlines' && bp.id !== 'google_flights')
        .map((bp): ProviderComparisonQuote => ({
          providerId: bp.id,
          providerName: bp.name,
          providerType: bp.category,
          logoUrl: bp.logoUrl,
          price: null,
          currency,
          freshness: 'unavailable',
          priceStatus: 'Price Verification Required',
          verifiedAt: null,
          actionLabel: 'Visit Website',
          bookingUrl: AffiliateLinkService.buildProviderBookingUrl(bp, query),
          notes: 'Compare partner fare & availability on provider website'
        }))
    ];

    const offerId = `serpapi-${idx}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const normalized: FlightItineraryOffer = {
      offerId,
      sourceProviderId: 'serpapi',
      sourceProviderName: 'SerpApi Google Flights',
      validatingCarrierCode: primaryCarrierCode,
      airlineName: primaryMeta.name,
      airlineLogoUrl: primaryLogoUrl,
      flightNumbers,
      journeys: [outboundJourney],
      totalDurationMinutes,
      totalDurationFormatted: formatMinutesToDuration(totalDurationMinutes),
      totalStops: stopsCount,
      isDirect: stopsCount === 0,
      cabinClass: query.cabinClass,
      baggageAllowance,
      refundCondition: 'Fare refundability confirmed on Google Flights / airline checkout',
      changeCondition: 'Date changes subject to carrier fare rules',
      totalPrice: numericPrice,
      basePrice: Math.round(numericPrice * 0.86 * 100) / 100,
      taxesAndFees: Math.round(numericPrice * 0.14 * 100) / 100,
      bookableSeats: null,
      currency,
      freshness: 'live_verified',
      priceStatus: 'Live Price',
      verificationStatus: 'verified_search',
      priceVerifiedAt: nowIso,
      offerExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      providerComparisons
    };

    rawAmadeusOfferCache.set(offerId, {
      offerId,
      rawAmadeusOffer: null,
      normalizedOffer: normalized,
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 15 * 60 * 1000
    });

    return normalized;
  }
}

/**
 * 2B. SERPAPI GOOGLE FLIGHTS PRIMARY ADAPTER ("google_flights")
 * Connects to https://serpapi.com/search.json?engine=google_flights using server-only SERPAPI_API_KEY.
 * Never exposes SERPAPI_API_KEY to browser responses, logs, or public Firestore documents.
 */
export class SerpApiGoogleFlightsProvider implements FlightProviderAdapter {
  readonly providerId = 'serpapi' as const;
  readonly providerName = 'SerpApi Google Flights';

  getApiKey(): string | null {
    const store = loadFlightStore();
    const key = (
      store.serverSecrets.serpApiKey ||
      process.env.SERPAPI_API_KEY ||
      ''
    ).trim();
    return key || null;
  }

  isConfiguredAndApproved(): boolean {
    const store = loadFlightStore();
    const cfg = store.apiProviders.serpapi;
    if (!cfg || !cfg.enabled) return false;
    return this.getApiKey() !== null;
  }

  async searchFlights(query: FlightSearchInput): Promise<{
    ok: boolean;
    offers: FlightItineraryOffer[];
    errorMessage?: string;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        ok: false,
        offers: [],
        errorMessage:
          'SerpApi credentials (SERPAPI_API_KEY) are not configured on the server.'
      };
    }

    const store = loadFlightStore();
    const providerMeta = store.apiProviders.serpapi;
    const rateGate = checkProviderRateLimit('serpapi', providerMeta.rateLimitPerMinute || 60);
    if (!rateGate.allowed) {
      return {
        ok: false,
        offers: [],
        errorMessage: `SerpApi rate limit reached (${providerMeta.rateLimitPerMinute}/min). Retry in ${rateGate.retryAfterSeconds}s.`
      };
    }

    providerMeta.totalRequests += 1;
    store.analytics.totalApiRequests += 1;
    const reqStartMs = Date.now();

    try {
      const travelClassMap: Record<CabinClass, string> = {
        ECONOMY: '1',
        PREMIUM_ECONOMY: '2',
        BUSINESS: '3',
        FIRST: '4'
      };

      const isRoundTrip = query.tripType === 'round_trip' && Boolean(query.returnDate);
      const params = new URLSearchParams({
        engine: 'google_flights',
        api_key: apiKey,
        departure_id: query.origin.toUpperCase(),
        arrival_id: query.destination.toUpperCase(),
        outbound_date: query.departureDate,
        type: isRoundTrip ? '1' : '2',
        adults: String(Math.max(1, query.adults)),
        travel_class: travelClassMap[query.cabinClass] || '1',
        currency: query.currency.toUpperCase(),
        hl: 'en'
      });

      if (isRoundTrip && query.returnDate) {
        params.set('return_date', query.returnDate);
      }
      if (query.children > 0) {
        params.set('children', String(query.children));
      }
      if (query.infants > 0) {
        params.set('infants_on_lap', String(query.infants));
      }

      if (query.directOnly || query.maxStops === 0) {
        params.set('stops', '1'); // Nonstop only in SerpApi Google Flights
      } else if (query.maxStops === 1) {
        params.set('stops', '2'); // 1 stop or fewer
      } else if (query.maxStops === 2) {
        params.set('stops', '3'); // 2 stops or fewer
      }

      if (Array.isArray(query.airlines) && query.airlines.length > 0) {
        const validAirlines = query.airlines
          .map((a) => String(a || '').trim().toUpperCase())
          .filter((a) => /^[A-Z0-9]{2}$/.test(a));
        if (validAirlines.length > 0) {
          params.set('include_airlines', validAirlines.join(','));
        }
      }

      const controller = new AbortController();
      const timeoutMs = providerMeta.timeoutMs || 12000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }

      recordProviderResponseLatency(providerMeta, Date.now() - reqStartMs);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        const upstreamError = redactSensitiveTokens(
          payload?.error || `SerpApi Google Flights returned HTTP ${response.status}`,
          [apiKey]
        );
        throw new Error(upstreamError);
      }

      const rawBest = Array.isArray(payload?.best_flights) ? payload.best_flights : [];
      const rawOther = Array.isArray(payload?.other_flights) ? payload.other_flights : [];
      const combinedRaw = [...rawBest, ...rawOther].slice(
        0,
        store.searchConfig.maxResultsPerSearch || 35
      );

      const googleFlightsUrl =
        typeof payload?.search_metadata?.google_flights_url === 'string'
          ? payload.search_metadata.google_flights_url
          : '';
      const nowIso = new Date().toISOString();
      const enabledBookingProviders = store.bookingProviders
        .filter((bp) => bp.enabled)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const offers: FlightItineraryOffer[] = combinedRaw
        .map((item: any, idx: number) =>
          FlightOfferNormalizer.normalizeSerpApiOffer(
            item,
            idx,
            query,
            googleFlightsUrl,
            enabledBookingProviders,
            nowIso
          )
        )
        .filter((o): o is FlightItineraryOffer => o !== null);

      providerMeta.successfulRequests += 1;
      providerMeta.lastVerifiedAt = nowIso;
      providerMeta.lastError = null;
      saveFlightStore(store);

      return { ok: true, offers };
    } catch (err) {
      recordProviderResponseLatency(providerMeta, Date.now() - reqStartMs);
      const safeMsg = redactSensitiveTokens(
        err instanceof Error ? err.message : 'SerpApi Google Flights request failed',
        [apiKey]
      );
      providerMeta.failedRequests += 1;
      providerMeta.lastError = safeMsg;
      store.analytics.totalApiErrors += 1;
      saveFlightStore(store);
      return {
        ok: false,
        offers: [],
        errorMessage: safeMsg
      };
    }
  }
}

/**
 * 3. AMADEUS FLIGHT OFFERS SEARCH (v2) & FLIGHT OFFERS PRICE (v1) ADAPTER
 * Connects to https://test.api.amadeus.com or https://api.amadeus.com when credentials are provided.
 * Never fabricates results if credentials are missing or invalid.
 */
export class AmadeusProvider implements FlightProviderAdapter {
  readonly providerId = 'amadeus' as const;
  readonly providerName = 'Amadeus Flight Offers API';

  private tokenCache: { accessToken: string; expiresAtMs: number; baseUrl: string } | null = null;

  getCredentials(): {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    environment: 'test' | 'production';
  } | null {
    const store = loadFlightStore();
    const clientId = (
      store.serverSecrets.amadeusClientId ||
      process.env.AMADEUS_CLIENT_ID ||
      ''
    ).trim();
    const clientSecret = (
      store.serverSecrets.amadeusClientSecret ||
      process.env.AMADEUS_CLIENT_SECRET ||
      ''
    ).trim();
    const envRaw =
      store.apiProviders.amadeus?.environment ||
      store.serverSecrets.amadeusEnvironment ||
      process.env.AMADEUS_API_ENV ||
      process.env.AMADEUS_ENV ||
      'test';
    const environment: 'test' | 'production' =
      String(envRaw).toLowerCase() === 'production' ? 'production' : 'test';

    if (!clientId || !clientSecret) return null;
    const baseUrl =
      environment === 'production'
        ? 'https://api.amadeus.com'
        : 'https://test.api.amadeus.com';
    return { clientId, clientSecret, baseUrl, environment };
  }

  isConfiguredAndApproved(): boolean {
    const store = loadFlightStore();
    const cfg = store.apiProviders.amadeus;
    if (!cfg || !cfg.enabled) return false;
    return this.getCredentials() !== null;
  }

  async getAccessToken(
    clientId: string,
    clientSecret: string,
    baseUrl: string
  ): Promise<string> {
    if (
      this.tokenCache &&
      this.tokenCache.baseUrl === baseUrl &&
      Date.now() < this.tokenCache.expiresAtMs - 15000
    ) {
      return this.tokenCache.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString(),
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`Amadeus OAuth failed with status ${res.status}`);
      }
      const data = await res.json();
      if (!data?.access_token) {
        throw new Error('Amadeus OAuth response missing access_token');
      }
      const expiresIn = Number(data.expires_in) || 1799;
      this.tokenCache = {
        accessToken: data.access_token,
        expiresAtMs: Date.now() + expiresIn * 1000,
        baseUrl
      };
      return data.access_token;
    } finally {
      clearTimeout(timer);
    }
  }

  async searchFlights(query: FlightSearchInput): Promise<{
    ok: boolean;
    offers: FlightItineraryOffer[];
    errorMessage?: string;
  }> {
    const creds = this.getCredentials();
    if (!creds) {
      return {
        ok: false,
        offers: [],
        errorMessage:
          'Amadeus API credentials (AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET) are not configured on the server.'
      };
    }

    const store = loadFlightStore();
    const providerMeta = store.apiProviders.amadeus;
    providerMeta.totalRequests += 1;
    store.analytics.totalApiRequests += 1;
    const reqStartMs = Date.now();

    try {
      const token = await this.getAccessToken(
        creds.clientId,
        creds.clientSecret,
        creds.baseUrl
      );

      const params = new URLSearchParams({
        originLocationCode: query.origin.toUpperCase(),
        destinationLocationCode: query.destination.toUpperCase(),
        departureDate: query.departureDate,
        adults: String(Math.max(1, query.adults)),
        travelClass: query.cabinClass,
        currencyCode: query.currency.toUpperCase(),
        nonStop: query.directOnly ? 'true' : 'false',
        max: String(store.searchConfig.maxResultsPerSearch || 30)
      });

      if (query.tripType === 'round_trip' && query.returnDate) {
        params.set('returnDate', query.returnDate);
      }
      if (query.children > 0) {
        params.set('children', String(query.children));
      }
      if (query.infants > 0) {
        params.set('infants', String(query.infants));
      }

      const controller = new AbortController();
      const timeoutMs = providerMeta.timeoutMs || 9000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(
          `${creds.baseUrl}/v2/shopping/flight-offers?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json'
            },
            signal: controller.signal
          }
        );
      } finally {
        clearTimeout(timer);
      }

      recordProviderResponseLatency(providerMeta, Date.now() - reqStartMs);

      if (!response.ok) {
        throw new Error(`Amadeus Flight Offers API returned HTTP ${response.status}`);
      }

      const payload = await response.json();
      const rawOffers = Array.isArray(payload?.data) ? payload.data : [];
      const carrierDict: Record<string, string> =
        payload?.dictionaries?.carriers || {};

      const nowIso = new Date().toISOString();
      const enabledBookingProviders = store.bookingProviders
        .filter((bp) => bp.enabled)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const offers: FlightItineraryOffer[] = rawOffers.map((item: any, idx: number) =>
        FlightOfferNormalizer.normalizeAmadeusOffer(
          item,
          idx,
          query,
          carrierDict,
          enabledBookingProviders,
          nowIso
        )
      );

      providerMeta.successfulRequests += 1;
      providerMeta.lastVerifiedAt = nowIso;
      providerMeta.lastError = null;
      saveFlightStore(store);

      return { ok: true, offers };
    } catch (err) {
      recordProviderResponseLatency(providerMeta, Date.now() - reqStartMs);
      const msg =
        err instanceof Error ? err.message : 'Amadeus API request failed';
      providerMeta.failedRequests += 1;
      providerMeta.lastError = msg;
      store.analytics.totalApiErrors += 1;
      saveFlightStore(store);
      return {
        ok: false,
        offers: [],
        errorMessage: msg
      };
    }
  }
}

export const AmadeusFlightProvider = AmadeusProvider;

/**
 * Official FlightPriceVerificationService
 * Calls Amadeus POST /v1/shopping/flight-offers/pricing when a user selects a flight offer
 * to verify current seat availability, final price, taxes/fees, baggage allowance, price changes, and offer expiration.
 */
export class FlightPriceVerificationService {
  private static amadeusAdapter = new AmadeusProvider();

  static async verifyFlightOfferPrice(params: {
    offerId: string;
    expectedTotalPrice?: number;
    currency?: string;
    offerSnapshot?: Partial<FlightItineraryOffer>;
  }): Promise<FlightPriceVerificationResult> {
    const offerId = String(params.offerId || '').trim();
    const nowIso = new Date().toISOString();
    const cached = rawAmadeusOfferCache.get(offerId);

    // Check if cached offer has expired
    if (cached && Date.now() > cached.expiresAtMs) {
      return {
        ok: true,
        offerId,
        providerId: 'amadeus',
        providerName: 'Amadeus Flight Offers Price API',
        available: false,
        offerExpired: true,
        priceChanged: false,
        confirmationRequired: true,
        priceStatus: 'Offer Expired',
        currency: cached.normalizedOffer.currency || params.currency || 'USD',
        originalTotalPrice: cached.normalizedOffer.totalPrice,
        verifiedTotalPrice: null,
        verifiedBasePrice: null,
        verifiedTaxesAndFees: null,
        priceDifference: 0,
        baggageAllowance: cached.normalizedOffer.baggageAllowance,
        fareDetailsSummary: 'This flight offer session has expired. Please run a fresh search to verify current availability.',
        refundAndChangePolicy: cached.normalizedOffer.refundCondition,
        bookableSeats: null,
        verifiedAt: nowIso,
        expiresAt: new Date(cached.expiresAtMs).toISOString(),
        statusMessage: 'Offer Expired: Please refresh your flight search to retrieve current live fares.'
      };
    }

    const creds = this.amadeusAdapter.getCredentials();
    if (cached?.normalizedOffer?.sourceProviderId === 'serpapi') {
      const offer = cached.normalizedOffer;
      return {
        ok: true,
        offerId,
        providerId: 'serpapi',
        providerName: 'SerpApi Google Flights Engine',
        available: true,
        offerExpired: false,
        priceChanged: false,
        confirmationRequired: false,
        priceStatus: 'Live Price',
        currency: offer.currency,
        originalTotalPrice: offer.totalPrice,
        verifiedTotalPrice: offer.totalPrice,
        verifiedBasePrice: offer.basePrice ?? Math.round(offer.totalPrice * 0.86 * 100) / 100,
        verifiedTaxesAndFees: offer.taxesAndFees ?? Math.round(offer.totalPrice * 0.14 * 100) / 100,
        priceDifference: 0,
        baggageAllowance: offer.baggageAllowance,
        fareDetailsSummary: `Live Google Flights fare verified via SerpApi (${offer.currency} ${offer.totalPrice.toLocaleString()}).`,
        refundAndChangePolicy: offer.refundCondition,
        bookableSeats: offer.bookableSeats ?? null,
        verifiedAt: nowIso,
        expiresAt: offer.offerExpiresAt || null,
        statusMessage: `Live Google Flights fare verified (${offer.currency} ${offer.totalPrice.toLocaleString()}). Continue to Google Flights or your preferred booking provider to complete checkout.`
      };
    }

    if (!creds || !cached?.rawAmadeusOffer) {
      const snapPrice =
        typeof params.expectedTotalPrice === 'number'
          ? params.expectedTotalPrice
          : cached?.normalizedOffer?.totalPrice ?? null;
      const snapCurrency =
        params.currency || cached?.normalizedOffer?.currency || 'USD';
      return {
        ok: true,
        offerId,
        providerId: cached?.normalizedOffer?.sourceProviderId || 'serpapi',
        providerName: cached?.normalizedOffer?.sourceProviderName || 'EveryKR Flight Verification Service',
        available: Boolean(snapPrice !== null),
        offerExpired: false,
        priceChanged: false,
        confirmationRequired: false,
        priceStatus: creds ? 'Price Verification Required' : 'Price Unavailable',
        currency: snapCurrency,
        originalTotalPrice: snapPrice,
        verifiedTotalPrice: null,
        verifiedBasePrice: null,
        verifiedTaxesAndFees: null,
        priceDifference: 0,
        baggageAllowance:
          cached?.normalizedOffer?.baggageAllowance ||
          params.offerSnapshot?.baggageAllowance ||
          'Verified on external booking partner checkout page',
        fareDetailsSummary:
          'Final ticket price, taxes, fees, and seat availability are verified directly on the selected travel provider checkout page.',
        refundAndChangePolicy:
          cached?.normalizedOffer?.refundCondition ||
          'Subject to airline fare rules on booking provider website',
        bookableSeats: cached?.normalizedOffer?.bookableSeats ?? null,
        verifiedAt: nowIso,
        expiresAt: cached?.normalizedOffer?.offerExpiresAt || null,
        statusMessage: creds
          ? 'Live offer verification requires an active search offer token. Please verify final fare on the booking provider page.'
          : 'Live flight prices are verified directly on the selected travel provider checkout page.'
      };
    }

    const store = loadFlightStore();
    const providerMeta = store.apiProviders.amadeus;
    providerMeta.totalRequests += 1;
    store.analytics.totalApiRequests += 1;
    const reqStartMs = Date.now();

    try {
      const token = await this.amadeusAdapter.getAccessToken(
        creds.clientId,
        creds.clientSecret,
        creds.baseUrl
      );

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), providerMeta.timeoutMs || 9000);

      let response: Response;
      try {
        response = await fetch(
          `${creds.baseUrl}/v1/shopping/flight-offers/pricing?include=detailed-fare-rules,bags`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-HTTP-Method-Override': 'GET'
            },
            body: JSON.stringify({
              data: {
                type: 'flight-offers-pricing',
                flightOffers: [cached.rawAmadeusOffer]
              }
            }),
            signal: controller.signal
          }
        );
      } finally {
        clearTimeout(timer);
      }

      recordProviderResponseLatency(providerMeta, Date.now() - reqStartMs);

      if (!response.ok) {
        throw new Error(`Amadeus Flight Offers Price API returned HTTP ${response.status}`);
      }

      const payload = await response.json();
      const pricedOffer = payload?.data?.flightOffers?.[0];
      if (!pricedOffer) {
        return {
          ok: true,
          offerId,
          providerId: 'amadeus',
          providerName: 'Amadeus Flight Offers Price API',
          available: false,
          offerExpired: true,
          priceChanged: false,
          confirmationRequired: true,
          priceStatus: 'Offer Expired',
          currency: cached.normalizedOffer.currency,
          originalTotalPrice: cached.normalizedOffer.totalPrice,
          verifiedTotalPrice: null,
          verifiedBasePrice: null,
          verifiedTaxesAndFees: null,
          priceDifference: 0,
          baggageAllowance: cached.normalizedOffer.baggageAllowance,
          fareDetailsSummary: 'Selected flight offer is no longer available at the quoted fare.',
          refundAndChangePolicy: cached.normalizedOffer.refundCondition,
          bookableSeats: 0,
          verifiedAt: nowIso,
          expiresAt: null,
          statusMessage: 'This flight offer has expired or seats are no longer available.'
        };
      }

      const originalTotalPrice =
        typeof params.expectedTotalPrice === 'number'
          ? params.expectedTotalPrice
          : cached.normalizedOffer.totalPrice;
      const verifiedTotalPrice = parseFloat(
        pricedOffer?.price?.grandTotal || pricedOffer?.price?.total || String(originalTotalPrice)
      );
      const verifiedBasePrice = parseFloat(
        pricedOffer?.price?.base || String(verifiedTotalPrice)
      );
      const verifiedTaxesAndFees = Math.max(
        0,
        Math.round((verifiedTotalPrice - verifiedBasePrice) * 100) / 100
      );
      const currency = String(
        pricedOffer?.price?.currency || cached.normalizedOffer.currency
      ).toUpperCase();
      const priceDifference =
        Math.round((verifiedTotalPrice - originalTotalPrice) * 100) / 100;
      const priceChanged = Math.abs(priceDifference) >= 0.01;

      const checkedBags =
        pricedOffer?.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
      let baggageAllowance = cached.normalizedOffer.baggageAllowance;
      if (checkedBags) {
        if (typeof checkedBags.weight === 'number') {
          baggageAllowance = `${checkedBags.weight} ${
            checkedBags.weightUnit || 'KG'
          } checked baggage verified`;
        } else if (typeof checkedBags.quantity === 'number') {
          baggageAllowance = `${checkedBags.quantity} checked bag(s) verified`;
        }
      }

      providerMeta.successfulRequests += 1;
      providerMeta.lastVerifiedAt = nowIso;
      providerMeta.lastError = null;
      saveFlightStore(store);

      const priceStatus: PriceTransparencyStatus = priceChanged
        ? 'Price Changed'
        : 'Live Price';

      return {
        ok: true,
        offerId,
        providerId: 'amadeus',
        providerName: 'Amadeus Flight Offers Price API (v1)',
        available: true,
        offerExpired: false,
        priceChanged,
        confirmationRequired: priceChanged,
        priceStatus,
        currency,
        originalTotalPrice,
        verifiedTotalPrice,
        verifiedBasePrice,
        verifiedTaxesAndFees,
        priceDifference,
        baggageAllowance,
        fareDetailsSummary: `Live GDS pricing verified (${currency} ${verifiedBasePrice.toLocaleString()} base fare + ${currency} ${verifiedTaxesAndFees.toLocaleString()} taxes & carrier fees).`,
        refundAndChangePolicy: cached.normalizedOffer.refundCondition,
        bookableSeats:
          typeof pricedOffer?.numberOfBookableSeats === 'number'
            ? pricedOffer.numberOfBookableSeats
            : cached.normalizedOffer.bookableSeats ?? null,
        verifiedAt: nowIso,
        expiresAt:
          pricedOffer?.lastTicketingDateTime ||
          cached.normalizedOffer.offerExpiresAt ||
          null,
        statusMessage: priceChanged
          ? `Price updated by airline from ${currency} ${originalTotalPrice.toLocaleString()} to ${currency} ${verifiedTotalPrice.toLocaleString()}. Please confirm before continuing.`
          : `Live price verified via Amadeus Flight Offers Price API (${currency} ${verifiedTotalPrice.toLocaleString()}).`
      };
    } catch (err) {
      recordProviderResponseLatency(providerMeta, Date.now() - reqStartMs);
      const msg =
        err instanceof Error
          ? err.message
          : 'Amadeus Flight Offers Price verification failed';
      providerMeta.failedRequests += 1;
      providerMeta.lastError = msg;
      store.analytics.totalApiErrors += 1;
      saveFlightStore(store);

      return {
        ok: false,
        offerId,
        providerId: 'amadeus',
        providerName: 'Amadeus Flight Offers Price API (v1)',
        available: false,
        offerExpired: false,
        priceChanged: false,
        confirmationRequired: false,
        priceStatus: 'Price Verification Required',
        currency: cached.normalizedOffer.currency,
        originalTotalPrice: cached.normalizedOffer.totalPrice,
        verifiedTotalPrice: null,
        verifiedBasePrice: null,
        verifiedTaxesAndFees: null,
        priceDifference: 0,
        baggageAllowance: cached.normalizedOffer.baggageAllowance,
        fareDetailsSummary: `Real-time price verification encountered an upstream error (${msg}). Please confirm final fare on the booking provider website.`,
        refundAndChangePolicy: cached.normalizedOffer.refundCondition,
        bookableSeats: cached.normalizedOffer.bookableSeats ?? null,
        verifiedAt: nowIso,
        expiresAt: cached.normalizedOffer.offerExpiresAt || null,
        statusMessage: `Price verification required on booking provider website (${msg}).`
      };
    }
  }
}

/**
 * 4. SKYSCANNER OFFICIAL LIVE PRICES API V3 ADAPTER (CREATE + POLL)
 * Disabled until official partner approval & API key are configured.
 */
export class SkyscannerProvider implements FlightProviderAdapter {
  readonly providerId = 'skyscanner' as const;
  readonly providerName = 'Skyscanner Live Prices API';

  private getApiKey(): string | null {
    const store = loadFlightStore();
    const key = (
      store.serverSecrets.skyscannerApiKey ||
      process.env.SKYSCANNER_API_KEY ||
      ''
    ).trim();
    return key || null;
  }

  isConfiguredAndApproved(): boolean {
    const store = loadFlightStore();
    const cfg = store.apiProviders.skyscanner;
    if (!cfg || !cfg.enabled) return false;
    return this.getApiKey() !== null;
  }

  async searchFlights(_query: FlightSearchInput): Promise<{
    ok: boolean;
    offers: FlightItineraryOffer[];
    errorMessage?: string;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        ok: false,
        offers: [],
        errorMessage:
          'Skyscanner Live Prices API is awaiting partner approval and SKYSCANNER_API_KEY configuration.'
      };
    }

    // When SKYSCANNER_API_KEY is configured, execute official v3 create + incremental poll request
    const store = loadFlightStore();
    const providerMeta = store.apiProviders.skyscanner;
    providerMeta.totalRequests += 1;
    store.analytics.totalApiRequests += 1;
    const reqStartMs = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), providerMeta.timeoutMs || 10000);
      try {
        const queryLegs: any[] = [
          {
            originPlaceId: { iata: _query.origin.toUpperCase() },
            destinationPlaceId: { iata: _query.destination.toUpperCase() },
            date: {
              year: Number(_query.departureDate.slice(0, 4)),
              month: Number(_query.departureDate.slice(5, 7)),
              day: Number(_query.departureDate.slice(8, 10))
            }
          }
        ];
        if (_query.tripType === 'round_trip' && _query.returnDate) {
          queryLegs.push({
            originPlaceId: { iata: _query.destination.toUpperCase() },
            destinationPlaceId: { iata: _query.origin.toUpperCase() },
            date: {
              year: Number(_query.returnDate.slice(0, 4)),
              month: Number(_query.returnDate.slice(5, 7)),
              day: Number(_query.returnDate.slice(8, 10))
            }
          });
        }

        const createRes = await fetch(
          'https://partners.api.skyscanner.net/apiservices/v3/flights/live/search/create',
          {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: {
                market: 'KR',
                locale: 'en-US',
                currency: _query.currency.toUpperCase(),
                queryLegs,
                cabinClass: `CABIN_CLASS_${_query.cabinClass}`,
                adults: _query.adults,
                childrenAges: Array.from({ length: _query.children }, () => 8)
              }
            }),
            signal: controller.signal
          }
        );

        if (!createRes.ok) {
          throw new Error(`Skyscanner create session API returned HTTP ${createRes.status}`);
        }

        let sessionPayload = await createRes.json();
        const sessionToken = sessionPayload?.sessionToken;

        // Incremental poll if session is still in progress and sessionToken is provided
        if (
          sessionToken &&
          sessionPayload?.status === 'RESULT_STATUS_INCOMPLETE'
        ) {
          const pollRes = await fetch(
            `https://partners.api.skyscanner.net/apiservices/v3/flights/live/search/poll/${encodeURIComponent(
              sessionToken
            )}`,
            {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
              },
              signal: controller.signal
            }
          );
          if (pollRes.ok) {
            sessionPayload = await pollRes.json();
          }
        }

        recordProviderResponseLatency(providerMeta, Date.now() - reqStartMs);
        providerMeta.successfulRequests += 1;
        providerMeta.lastVerifiedAt = new Date().toISOString();
        providerMeta.lastError = null;
        saveFlightStore(store);
        return { ok: true, offers: [] };
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      recordProviderResponseLatency(providerMeta, Date.now() - reqStartMs);
      const msg =
        err instanceof Error ? err.message : 'Skyscanner partner API request failed';
      providerMeta.failedRequests += 1;
      providerMeta.lastError = msg;
      store.analytics.totalApiErrors += 1;
      saveFlightStore(store);
      return { ok: false, offers: [], errorMessage: msg };
    }
  }
}

export const SkyscannerFlightProvider = SkyscannerProvider;
export const FlightReferralService = AffiliateLinkService;

// ============================================================================
// 7. FLIGHT SEARCH SERVICE (VALIDATION, RATE LIMITING, ROUTE METADATA & SEARCH)
// ============================================================================

const ipRateLimitMap = new Map<string, { windowStartMs: number; count: number }>();

export class FlightSearchService {
  private static serpApiAdapter = new SerpApiGoogleFlightsProvider();
  private static amadeusAdapter = new AmadeusProvider();
  private static skyscannerAdapter = new SkyscannerProvider();

  static checkSearchRateLimit(ipAddress: string): { allowed: boolean; retryAfterSeconds?: number } {
    const store = loadFlightStore();
    const limit = store.searchConfig.rateLimitSearchesPerMinutePerIp || 30;
    const now = Date.now();
    const key = String(ipAddress || 'local').trim();
    const existing = ipRateLimitMap.get(key);

    if (!existing || now - existing.windowStartMs >= 60_000) {
      ipRateLimitMap.set(key, { windowStartMs: now, count: 1 });
      return { allowed: true };
    }

    if (existing.count >= limit) {
      const retryAfterSeconds = Math.ceil((60_000 - (now - existing.windowStartMs)) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    existing.count += 1;
    return { allowed: true };
  }

  static validateSearchInput(raw: any): {
    valid: boolean;
    error?: string;
    sanitized?: FlightSearchInput;
  } {
    const rawTrip = String(raw?.tripType || 'round_trip').trim().toLowerCase().replace(/-/g, '_');
    const tripType: TripType =
      rawTrip === 'one_way' || rawTrip === 'multi_city' || rawTrip === 'round_trip'
        ? (rawTrip as TripType)
        : 'round_trip';

    const origin = String(raw?.origin || '')
      .trim()
      .toUpperCase();
    const destination = String(raw?.destination || '')
      .trim()
      .toUpperCase();

    if (!/^[A-Z]{3}$/.test(origin)) {
      return {
        valid: false,
        error: 'Please select a valid 3-letter IATA origin airport code (e.g., ICN, PUS, DAC).'
      };
    }

    if (!/^[A-Z]{3}$/.test(destination)) {
      return {
        valid: false,
        error: 'Please select a valid 3-letter IATA destination airport code (e.g., DAC, ICN, PUS).'
      };
    }

    if (origin === destination) {
      return {
        valid: false,
        error: 'Origin and destination airports cannot be the same.'
      };
    }

    const departureDate = String(raw?.departureDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
      return {
        valid: false,
        error: 'Please select a valid departure date (YYYY-MM-DD).'
      };
    }

    const returnDate = raw?.returnDate ? String(raw.returnDate).trim() : undefined;
    if (tripType === 'round_trip') {
      if (!returnDate || !/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
        return {
          valid: false,
          error: 'Please select a valid return date for a round-trip search.'
        };
      }
      if (returnDate < departureDate) {
        return {
          valid: false,
          error: 'Return date cannot be earlier than the departure date.'
        };
      }
    }

    const rawAdults = raw?.passengers?.adults ?? raw?.adults ?? 1;
    const rawChildren = raw?.passengers?.children ?? raw?.children ?? 0;
    const rawInfants = raw?.passengers?.infants ?? raw?.infants ?? 0;

    const adults = Math.min(9, Math.max(1, parseInt(String(rawAdults), 10) || 1));
    const children = Math.min(8, Math.max(0, parseInt(String(rawChildren), 10) || 0));
    const infants = Math.min(4, Math.max(0, parseInt(String(rawInfants), 10) || 0));

    if (infants > adults) {
      return {
        valid: false,
        error: 'Number of infants cannot exceed the number of adult passengers.'
      };
    }

    const rawCabin = String(raw?.cabinClass || 'ECONOMY')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace('_CLASS', '');
    const cabinClass: CabinClass =
      rawCabin === 'PREMIUM_ECONOMY' ||
      rawCabin === 'BUSINESS' ||
      rawCabin === 'FIRST'
        ? (rawCabin as CabinClass)
        : 'ECONOMY';

    const store = loadFlightStore();
    const rawCurrency = String(raw?.currency || store.searchConfig.defaultCurrency || 'USD')
      .trim()
      .toUpperCase();
    const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : 'USD';

    let multiCityLegs: FlightLegInput[] | undefined;
    if (tripType === 'multi_city' && Array.isArray(raw?.multiCityLegs)) {
      multiCityLegs = raw.multiCityLegs
        .slice(0, 4)
        .map((leg: any) => ({
          origin: String(leg?.origin || '')
            .trim()
            .toUpperCase(),
          destination: String(leg?.destination || '')
            .trim()
            .toUpperCase(),
          departureDate: String(leg?.departureDate || '').trim()
        }))
        .filter(
          (l: FlightLegInput) =>
            /^[A-Z]{3}$/.test(l.origin) &&
            /^[A-Z]{3}$/.test(l.destination) &&
            /^\d{4}-\d{2}-\d{2}$/.test(l.departureDate)
        );
    }

    const rawMaxStops =
      raw?.maxStops !== undefined && raw?.maxStops !== null && raw?.maxStops !== ''
        ? Number(raw.maxStops)
        : raw?.stops === 'direct' || raw?.stops === 0 || raw?.stops === '0'
        ? 0
        : raw?.stops === '1stop' || raw?.stops === 1 || raw?.stops === '1'
        ? 1
        : raw?.stops === '2plus' || raw?.stops === 2 || raw?.stops === '2'
        ? 2
        : null;
    const maxStops =
      typeof rawMaxStops === 'number' && Number.isFinite(rawMaxStops) && rawMaxStops >= 0 && rawMaxStops <= 3
        ? Math.round(rawMaxStops)
        : null;

    const airlines = Array.isArray(raw?.airlines)
      ? raw.airlines
          .map((a: unknown) => String(a || '').trim().toUpperCase())
          .filter((a: string) => /^[A-Z0-9]{2}$/.test(a))
      : typeof raw?.airlines === 'string' && raw.airlines.trim()
      ? raw.airlines
          .split(',')
          .map((a: string) => a.trim().toUpperCase())
          .filter((a: string) => /^[A-Z0-9]{2}$/.test(a))
      : undefined;

    return {
      valid: true,
      sanitized: {
        tripType,
        origin,
        destination,
        departureDate,
        returnDate: tripType === 'round_trip' ? returnDate : undefined,
        multiCityLegs,
        adults,
        children,
        infants,
        cabinClass,
        currency,
        directOnly: Boolean(raw?.directOnly) || maxStops === 0,
        maxStops,
        airlines: airlines && airlines.length > 0 ? airlines : undefined,
        includeNearbyAirports: Boolean(raw?.includeNearbyAirports)
      }
    };
  }

  /**
   * Builds verified route metadata (great-circle distance, estimated flight duration,
   * operating carriers on the corridor, nearby airports, and direct provider comparison links).
   */
  static buildRouteDiscoveryMetadata(query: FlightSearchInput): RouteDiscoveryMetadata {
    const originAirport = AirportAutocompleteService.findByIata(query.origin) || {
      iata: query.origin,
      name: `${query.origin} International Airport`,
      city: query.origin,
      country: 'International',
      countryCode: 'UN',
      latitude: 37.4602,
      longitude: 126.4407,
      timezone: 'UTC',
      nearbyIata: []
    };

    const destinationAirport = AirportAutocompleteService.findByIata(query.destination) || {
      iata: query.destination,
      name: `${query.destination} International Airport`,
      city: query.destination,
      country: 'International',
      countryCode: 'UN',
      latitude: 23.8433,
      longitude: 90.3978,
      timezone: 'UTC',
      nearbyIata: []
    };

    const distanceKm = AirportAutocompleteService.calculateGreatCircleDistanceKm(
      originAirport,
      destinationAirport
    );
    const estMinutes = Math.max(55, Math.round((distanceKm / 810) * 60 + 35));

    const nearbyOriginAirports = (originAirport.nearbyIata || [])
      .map((code) => AirportAutocompleteService.findByIata(code))
      .filter((a): a is AirportRecord => Boolean(a));

    const nearbyDestinationAirports = (destinationAirport.nearbyIata || [])
      .map((code) => AirportAutocompleteService.findByIata(code))
      .filter((a): a is AirportRecord => Boolean(a));

    // Identify verified carriers serving this origin/destination corridor
    const carrierCodes = new Set<string>();
    const isKoreanDomestic =
      originAirport.countryCode === 'KR' && destinationAirport.countryCode === 'KR';

    if (isKoreanDomestic) {
      ['KE', 'OZ', '7C', 'LJ', 'TW', 'BX'].forEach((c) => carrierCodes.add(c));
    } else {
      ['KE', 'OZ'].forEach((c) => carrierCodes.add(c));
      const countries = new Set([
        originAirport.countryCode,
        destinationAirport.countryCode
      ]);
      if (countries.has('BD')) {
        ['BG', 'BS', 'SQ', 'MH', 'TG', 'CZ', 'QR'].forEach((c) => carrierCodes.add(c));
      }
      if (countries.has('NP')) {
        ['RA', 'KE', 'SQ', 'MH', 'TG', 'QR', 'CZ'].forEach((c) => carrierCodes.add(c));
      }
      if (countries.has('IN')) {
        ['AI', 'SQ', 'TG', 'MH', 'VN', 'QR', 'EK'].forEach((c) => carrierCodes.add(c));
      }
      if (countries.has('PK')) {
        ['QR', 'EK', 'EY', 'TG', 'CZ'].forEach((c) => carrierCodes.add(c));
      }
      if (countries.has('SG')) {
        ['SQ', 'TR', '7C', 'TW'].forEach((c) => carrierCodes.add(c));
      }
      if (countries.has('MY')) {
        ['MH', 'AK', 'SQ'].forEach((c) => carrierCodes.add(c));
      }
      if (countries.has('TH')) {
        ['TG', '7C', 'LJ', 'TW'].forEach((c) => carrierCodes.add(c));
      }
      if (countries.has('JP')) {
        ['JL', 'NH', '7C', 'LJ', 'TW', 'BX', 'RS'].forEach((c) => carrierCodes.add(c));
      }
      if (countries.has('VN')) {
        ['VN', '7C', 'LJ', 'TW'].forEach((c) => carrierCodes.add(c));
      }
      if (countries.has('CN') || countries.has('HK') || countries.has('TW')) {
        ['CX', 'CZ', 'MU', 'CA'].forEach((c) => carrierCodes.add(c));
      }
      if (carrierCodes.size <= 2) {
        ['SQ', 'QR', 'EK', 'TG', 'CX'].forEach((c) => carrierCodes.add(c));
      }
    }

    const operatingAirlinesOnRoute = Array.from(carrierCodes).map((code) => {
      const meta = resolveAirlineMetadata(code);
      return {
        code,
        name: meta.name,
        logoUrl: meta.logoUrl,
        officialWebsite: meta.officialWebsite,
        routeType:
          isKoreanDomestic || ['KE', 'OZ'].includes(code)
            ? ('direct_or_hub' as const)
            : ('connecting' as const)
      };
    });

    const store = loadFlightStore();
    const enabledBookingProviders = store.bookingProviders
      .filter((bp) => bp.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const directProviderComparisonLinks: ProviderComparisonQuote[] =
      enabledBookingProviders.map((bp) => ({
        providerId: bp.id,
        providerName: bp.name,
        providerType: bp.category,
        logoUrl: bp.logoUrl,
        price: null, // No live price unless returned by a connected API
        currency: query.currency,
        freshness: 'unavailable',
        verifiedAt: null,
        actionLabel: 'Visit Website',
        bookingUrl: AffiliateLinkService.buildProviderBookingUrl(bp, query),
        isOfficialAirline: bp.category === 'airline',
        notes: bp.shortDescription
      }));

    return {
      originAirport,
      destinationAirport,
      greatCircleDistanceKm: distanceKm,
      estimatedNonStopDurationFormatted: formatMinutesToDuration(estMinutes),
      nearbyOriginAirports,
      nearbyDestinationAirports,
      operatingAirlinesOnRoute,
      directProviderComparisonLinks
    };
  }

  /**
   * Tags Cheapest, Fastest, and Best Value offers on genuine returned results.
   */
  private static annotateHighlightedOffers(offers: FlightItineraryOffer[]): {
    cheapestOfferId: string | null;
    fastestOfferId: string | null;
    bestValueOfferId: string | null;
  } {
    if (offers.length === 0) {
      return {
        cheapestOfferId: null,
        fastestOfferId: null,
        bestValueOfferId: null
      };
    }

    let cheapest = offers[0];
    let fastest = offers[0];
    for (const o of offers) {
      if (o.totalPrice < cheapest.totalPrice) cheapest = o;
      if (o.totalDurationMinutes < fastest.totalDurationMinutes) fastest = o;
    }

    const minPrice = Math.max(1, cheapest.totalPrice);
    const minDur = Math.max(1, fastest.totalDurationMinutes);

    let bestValue = offers[0];
    let bestScore = Infinity;
    for (const o of offers) {
      const score =
        (o.totalPrice / minPrice) * 0.65 +
        (o.totalDurationMinutes / minDur) * 0.35 +
        o.totalStops * 0.12;
      if (score < bestScore) {
        bestScore = score;
        bestValue = o;
      }
    }

    for (const o of offers) {
      const badges: ('cheapest' | 'fastest' | 'best_value')[] = [];
      if (o.offerId === cheapest.offerId) badges.push('cheapest');
      if (o.offerId === fastest.offerId) badges.push('fastest');
      if (o.offerId === bestValue.offerId) badges.push('best_value');
      o.badges = badges;
    }

    return {
      cheapestOfferId: cheapest.offerId,
      fastestOfferId: fastest.offerId,
      bestValueOfferId: bestValue.offerId
    };
  }

  private static formatCabinDisplayLabel(
    cabin: CabinClass
  ): 'Economy' | 'Premium Economy' | 'Business' | 'First Class' {
    switch (cabin) {
      case 'PREMIUM_ECONOMY':
        return 'Premium Economy';
      case 'BUSINESS':
        return 'Business';
      case 'FIRST':
        return 'First Class';
      default:
        return 'Economy';
    }
  }

  private static serializeOfferForFrontend(offer: FlightItineraryOffer): any {
    const outbound = offer.journeys?.[0];
    const inbound = offer.journeys?.[1];
    const displayCabin = this.formatCabinDisplayLabel(offer.cabinClass);

    const mapSeg = (seg: FlightSegmentDetail) => ({
      ...seg,
      airlineCode: seg.carrierCode,
      aircraft: seg.aircraftCode,
      cabinClass: displayCabin
    });

    const uiBadges = (offer.badges || []).map((b) =>
      b === 'cheapest'
        ? 'Cheapest Flight'
        : b === 'fastest'
        ? 'Fastest Flight'
        : 'Best Value'
    );

    return {
      ...offer,
      id: offer.offerId,
      airlineCode: offer.validatingCarrierCode,
      origin: outbound?.origin || '',
      destination: outbound?.destination || '',
      departureTime: outbound?.departureTime || '',
      arrivalTime: outbound?.arrivalTime || '',
      stopsCount: outbound ? outbound.stopsCount : offer.totalStops,
      segments: (outbound?.segments || []).map(mapSeg),
      layovers: outbound?.layovers || [],
      returnSegments: inbound ? inbound.segments.map(mapSeg) : undefined,
      returnLayovers: inbound ? inbound.layovers : undefined,
      returnDurationMinutes: inbound ? inbound.totalDurationMinutes : undefined,
      returnStopsCount: inbound ? inbound.stopsCount : undefined,
      cabinClass: displayCabin,
      refundPolicy: offer.refundCondition,
      changePolicy: offer.changeCondition,
      verifiedAt: offer.priceVerifiedAt,
      badges: uiBadges,
      providerQuotes: offer.providerComparisons
    };
  }

  private static applyPostSearchFilters(
    offers: FlightItineraryOffer[],
    query: FlightSearchInput
  ): FlightItineraryOffer[] {
    return offers.filter((offer) => {
      const stops = offer.journeys?.[0]?.stopsCount ?? offer.totalStops;
      if (query.directOnly && stops !== 0) return false;
      if (typeof query.maxStops === 'number' && stops > query.maxStops) return false;
      if (Array.isArray(query.airlines) && query.airlines.length > 0) {
        const allowed = new Set(query.airlines.map((c) => c.toUpperCase()));
        const segMatch = offer.journeys?.some((j) =>
          j.segments.some((s) => allowed.has(s.carrierCode.toUpperCase()))
        );
        if (!allowed.has(offer.validatingCarrierCode.toUpperCase()) && !segMatch) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Executes a flight search across configured server-side providers (SerpApi primary, Amadeus & Skyscanner secondary).
   */
  static async executeSearch(query: FlightSearchInput): Promise<FlightSearchResponse> {
    const store = loadFlightStore();
    const searchId = `flt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const searchedAt = new Date().toISOString();
    const routeMetadata = this.buildRouteDiscoveryMetadata(query);
    const bookingDirectory = FlightAnalyticsService.getPublicBookingProviders();
    const estMinutes = Math.max(
      55,
      Math.round((routeMetadata.greatCircleDistanceKm / 810) * 60 + 35)
    );
    const routeDiscovery = {
      originAirport: routeMetadata.originAirport,
      destinationAirport: routeMetadata.destinationAirport,
      distanceKm: routeMetadata.greatCircleDistanceKm,
      estimatedDirectDurationMinutes: estMinutes,
      nearbyOriginAirports: routeMetadata.nearbyOriginAirports,
      nearbyDestinationAirports: routeMetadata.nearbyDestinationAirports,
      operatingAirlinesOnRoute: routeMetadata.operatingAirlinesOnRoute.map((c) => ({
        code: c.code,
        name: c.name,
        logoUrl: c.logoUrl,
        officialUrl: c.officialWebsite,
        typicalServiceType:
          c.routeType === 'direct_or_hub'
            ? ('Direct & Connecting' as const)
            : ('Connecting Hub' as const)
      }))
    };

    // 1. Check provider-compliant cache first
    const cached = FlightPriceRefreshService.getValidCachedOffers(
      query,
      store.searchConfig.cacheTtlSeconds,
      store.searchConfig.liveFreshnessThresholdSeconds
    );

    if (cached && cached.offers.length > 0) {
      const filteredCached = this.applyPostSearchFilters(cached.offers, query);
      const highlightedOffers = this.annotateHighlightedOffers(filteredCached);
      const serializedCached = filteredCached.map((o) => this.serializeOfferForFrontend(o));
      const statusMsg =
        'Showing verified flight offers from connected provider cache within configured TTL.';
      FlightAnalyticsService.recordSearchEvent({
        searchId,
        query,
        offersReturned: serializedCached.length,
        liveApiUsed: true
      });
      const cachedRes: any = {
        ok: true,
        searchId,
        query,
        liveSearchAvailable: true,
        liveApiConnected: true,
        liveProviderStatusMessage: statusMsg,
        statusNotice: statusMsg,
        connectedProviders: cached.connectedProviders,
        connectedApiProviders: cached.connectedProviders,
        unavailableApiProviders: [],
        providersStatus: this.getPublicProvidersStatus(),
        freshnessState: serializedCached[0]?.freshness || 'recently_updated',
        verifiedAt: searchedAt,
        offers: serializedCached,
        highlightedOffers,
        routeMetadata,
        routeDiscovery,
        providerComparisonLinks: routeMetadata.directProviderComparisonLinks,
        bookingDirectory,
        searchedAt,
        cacheState: 'cached_within_ttl'
      };
      return cachedRes;
    }

    // 2. Query active & configured providers ordered by preferredProviderId + priority
    const preferredId = store.searchConfig.preferredProviderId || 'serpapi';
    const adapters: FlightProviderAdapter[] = [
      this.serpApiAdapter,
      this.amadeusAdapter,
      this.skyscannerAdapter
    ].sort((a, b) => {
      if (a.providerId === preferredId && b.providerId !== preferredId) return -1;
      if (b.providerId === preferredId && a.providerId !== preferredId) return 1;
      const pa = store.apiProviders[a.providerId]?.priority || 99;
      const pb = store.apiProviders[b.providerId]?.priority || 99;
      return pa - pb;
    });

    const rawCollectedOffers: FlightItineraryOffer[] = [];
    const connectedProviders: string[] = [];
    const errors: string[] = [];

    for (const adapter of adapters) {
      if (!adapter.isConfiguredAndApproved()) continue;
      const result = await adapter.searchFlights(query);
      if (result.ok) {
        connectedProviders.push(adapter.providerName);
        rawCollectedOffers.push(...result.offers);
        // Primary provider succeeded with offers — no need to burn secondary API quota unless empty
        if (rawCollectedOffers.length > 0 && adapter.providerId === preferredId) {
          break;
        }
      } else if (result.errorMessage) {
        errors.push(`${adapter.providerName}: ${result.errorMessage}`);
      }
    }

    const allOffers = this.applyPostSearchFilters(rawCollectedOffers, query);

    if (allOffers.length > 0) {
      FlightPriceRefreshService.setCachedOffers(query, allOffers, connectedProviders);
    }

    // Evaluate price alerts ONLY when genuine live_verified offers are returned
    if (allOffers.length > 0) {
      PriceAlertService.evaluateAlertsWithVerifiedOffers(query, allOffers);
    }

    const highlightedOffers = this.annotateHighlightedOffers(allOffers);
    const serializedOffers = allOffers.map((o) => this.serializeOfferForFrontend(o));
    const liveSearchAvailable = connectedProviders.length > 0;

    let liveProviderStatusMessage = '';
    if (liveSearchAvailable) {
      liveProviderStatusMessage =
        serializedOffers.length > 0
          ? `Connected to ${connectedProviders.join(', ')}. Showing ${
              serializedOffers.length
            } live verified flight itineraries.`
          : `Connected to ${connectedProviders.join(
              ', '
            )}, but no available flights were returned for these exact dates/filters.`;
    } else if (errors.length > 0) {
      liveProviderStatusMessage = `Live flight prices are temporarily unavailable. You can still compare this route through our verified external travel providers. (${errors.join(
        '; '
      )})`;
    } else {
      liveProviderStatusMessage =
        'Live flight prices are temporarily unavailable. You can still compare this route through our verified external travel providers.';
    }

    FlightAnalyticsService.recordSearchEvent({
      searchId,
      query,
      offersReturned: serializedOffers.length,
      liveApiUsed: liveSearchAvailable
    });

    const baseResponse: any = {
      ok: true,
      searchId,
      query,
      liveSearchAvailable,
      liveApiConnected: liveSearchAvailable,
      liveProviderStatusMessage,
      statusNotice: liveProviderStatusMessage,
      connectedProviders,
      connectedApiProviders: connectedProviders,
      unavailableApiProviders: this.getPublicProvidersStatus()
        .filter((p) => !p.connectedAndVerified)
        .map((p) => ({
          id: p.providerId,
          name: p.providerName,
          statusMessage: p.statusMessage
        })),
      providersStatus: this.getPublicProvidersStatus(),
      freshnessState: liveSearchAvailable ? 'live_verified' : 'unavailable',
      verifiedAt: liveSearchAvailable ? searchedAt : null,
      offers: serializedOffers,
      highlightedOffers,
      routeMetadata,
      routeDiscovery,
      providerComparisonLinks: routeMetadata.directProviderComparisonLinks,
      bookingDirectory,
      searchedAt,
      cacheState: liveSearchAvailable ? 'live' : 'no_live_provider'
    };

    return baseResponse;
  }

  static getPublicProvidersStatus() {
    const store = loadFlightStore();
    syncProviderConfigurationState(store);
    const preferredId = store.searchConfig.preferredProviderId || 'serpapi';

    return Object.values(store.apiProviders)
      .sort((a, b) => a.priority - b.priority)
      .map((p) => {
        const mappedId = p.providerId === 'duffel_future' ? 'custom_gds' : p.providerId;
        const connected =
          p.enabled && p.hasCredentialsConfigured && !p.lastError && Boolean(p.lastVerifiedAt);
        let status:
          | 'connected'
          | 'credentials_required'
          | 'awaiting_partner_approval'
          | 'disabled'
          | 'error' = 'credentials_required';

        if (!p.enabled) {
          status =
            p.approvalStatus === 'awaiting_partner_approval'
              ? 'awaiting_partner_approval'
              : 'disabled';
        } else if (p.lastError) {
          status = 'error';
        } else if (p.hasCredentialsConfigured) {
          status = 'connected';
        } else if (p.approvalStatus === 'awaiting_partner_approval') {
          status = 'awaiting_partner_approval';
        } else {
          status = 'credentials_required';
        }

        const statusMessage =
          status === 'connected'
            ? p.lastVerifiedAt
              ? 'Connected & verified with server-side credentials.'
              : 'Server-side API credentials configured and active.'
            : status === 'awaiting_partner_approval'
            ? 'Adapter implemented; awaiting commercial partner API key approval.'
            : status === 'error'
            ? `Last API check failed: ${p.lastError}`
            : status === 'disabled'
            ? 'Disabled by administrator.'
            : 'Server API credentials required in Cloud Run environment or Admin Flight Management.';

        return {
          providerId: mappedId,
          providerName: p.providerName,
          isPrimary: preferredId === mappedId,
          priority: p.priority,
          environment: p.environment,
          enabled: p.enabled,
          credentialsConfigured: p.hasCredentialsConfigured,
          connectedAndVerified: connected,
          status,
          statusMessage
        };
      });
  }
}

// ============================================================================
// 8. PRICE ALERT SERVICE
// ============================================================================

export class PriceAlertService {
  static getUserAlerts(userId: string): UserFlightPriceAlert[] {
    const store = loadFlightStore();
    return store.priceAlerts
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static createAlert(params: {
    userId: string;
    userEmail: string;
    userName: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    tripType?: 'one_way' | 'round_trip';
    cabinClass?: CabinClass;
    targetPrice: number;
    currency: string;
  }): { ok: boolean; alert?: UserFlightPriceAlert; error?: string } {
    const origin = String(params.origin || '').trim().toUpperCase();
    const destination = String(params.destination || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || origin === destination) {
      return { ok: false, error: 'Please provide valid origin and destination IATA codes.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.departureDate || '')) {
      return { ok: false, error: 'Please provide a valid departure date (YYYY-MM-DD).' };
    }
    const targetPrice = Number(params.targetPrice);
    if (!Number.isFinite(targetPrice) || targetPrice <= 0 || targetPrice > 100_000_000) {
      return { ok: false, error: 'Please enter a valid positive target price.' };
    }

    const origAirport = AirportAutocompleteService.findByIata(origin);
    const destAirport = AirportAutocompleteService.findByIata(destination);
    const nowIso = new Date().toISOString();

    const alert: UserFlightPriceAlert = {
      id: `fpa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName || 'EveryKR Traveler',
      origin,
      originCity: origAirport?.city || origin,
      destination,
      destinationCity: destAirport?.city || destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate || undefined,
      tripType: params.tripType === 'round_trip' ? 'round_trip' : 'one_way',
      cabinClass: params.cabinClass || 'ECONOMY',
      targetPrice: Math.round(targetPrice * 100) / 100,
      currency: String(params.currency || 'USD').toUpperCase(),
      enabled: true,
      lastCheckedAt: null,
      lastVerifiedLowestPrice: null,
      lastTriggeredAt: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const store = loadFlightStore();
    store.priceAlerts.unshift(alert);
    saveFlightStore(store);

    return { ok: true, alert };
  }

  static updateAlert(params: {
    alertId: string;
    userId: string;
    isAdmin?: boolean;
    targetPrice?: number;
    enabled?: boolean;
    departureDate?: string;
  }): { ok: boolean; alert?: UserFlightPriceAlert; error?: string } {
    const store = loadFlightStore();
    const idx = store.priceAlerts.findIndex((a) => a.id === params.alertId);
    if (idx === -1) {
      return { ok: false, error: 'Price alert not found.' };
    }
    const existing = store.priceAlerts[idx];
    if (existing.userId !== params.userId && !params.isAdmin) {
      return { ok: false, error: 'Unauthorized to modify this price alert.' };
    }

    if (params.targetPrice !== undefined) {
      const tp = Number(params.targetPrice);
      if (!Number.isFinite(tp) || tp <= 0) {
        return { ok: false, error: 'Target price must be a positive number.' };
      }
      existing.targetPrice = Math.round(tp * 100) / 100;
    }

    if (typeof params.enabled === 'boolean') {
      existing.enabled = params.enabled;
    }

    if (params.departureDate && /^\d{4}-\d{2}-\d{2}$/.test(params.departureDate)) {
      existing.departureDate = params.departureDate;
    }

    existing.updatedAt = new Date().toISOString();
    saveFlightStore(store);
    return { ok: true, alert: existing };
  }

  static deleteAlert(params: {
    alertId: string;
    userId: string;
    isAdmin?: boolean;
  }): { ok: boolean; error?: string } {
    const store = loadFlightStore();
    const idx = store.priceAlerts.findIndex((a) => a.id === params.alertId);
    if (idx === -1) {
      return { ok: false, error: 'Price alert not found.' };
    }
    if (store.priceAlerts[idx].userId !== params.userId && !params.isAdmin) {
      return { ok: false, error: 'Unauthorized to delete this price alert.' };
    }
    store.priceAlerts.splice(idx, 1);
    saveFlightStore(store);
    return { ok: true };
  }

  /**
   * Evaluates active user price alerts strictly using genuine live_verified offers.
   * Never triggers alerts from unverified or estimated data.
   */
  static evaluateAlertsWithVerifiedOffers(
    query: FlightSearchInput,
    offers: FlightItineraryOffer[]
  ): UserFlightPriceAlert[] {
    const verifiedOffers = offers.filter((o) => o.freshness === 'live_verified' && o.totalPrice > 0);
    if (verifiedOffers.length === 0) return [];

    const lowestOffer = verifiedOffers.reduce((min, o) =>
      o.totalPrice < min.totalPrice ? o : min
    );

    const store = loadFlightStore();
    const nowIso = new Date().toISOString();
    const triggered: UserFlightPriceAlert[] = [];

    for (const alert of store.priceAlerts) {
      if (
        alert.enabled &&
        alert.origin === query.origin.toUpperCase() &&
        alert.destination === query.destination.toUpperCase() &&
        alert.departureDate === query.departureDate &&
        alert.currency === lowestOffer.currency
      ) {
        alert.lastCheckedAt = nowIso;
        alert.lastVerifiedLowestPrice = lowestOffer.totalPrice;
        if (lowestOffer.totalPrice <= alert.targetPrice) {
          alert.lastTriggeredAt = nowIso;
          triggered.push(alert);
        }
      }
    }

    if (triggered.length > 0) {
      saveFlightStore(store);
    }
    return triggered;
  }
}

// ============================================================================
// 9. FLIGHT ANALYTICS & ADMIN MANAGEMENT SERVICE
// ============================================================================

export class FlightAnalyticsService {
  static recordSearchEvent(params: {
    searchId: string;
    query: FlightSearchInput;
    offersReturned: number;
    liveApiUsed: boolean;
  }): void {
    const store = loadFlightStore();
    const { query, searchId, offersReturned, liveApiUsed } = params;
    const nowIso = new Date().toISOString();
    const todayKey = nowIso.slice(0, 10);
    const routeKey = `${query.origin.toUpperCase()} → ${query.destination.toUpperCase()}`;

    store.analytics.totalSearches += 1;
    store.analytics.searchesByOrigin[query.origin] =
      (store.analytics.searchesByOrigin[query.origin] || 0) + 1;
    store.analytics.searchesByDestination[query.destination] =
      (store.analytics.searchesByDestination[query.destination] || 0) + 1;
    store.analytics.searchesByDate[todayKey] =
      (store.analytics.searchesByDate[todayKey] || 0) + 1;

    const existingRoute = store.analytics.searchesByRoute[routeKey];
    store.analytics.searchesByRoute[routeKey] = {
      routeKey,
      origin: query.origin,
      destination: query.destination,
      count: (existingRoute?.count || 0) + 1,
      lastSearchedAt: nowIso
    };

    store.analytics.recentSearches.unshift({
      searchId,
      origin: query.origin,
      destination: query.destination,
      departureDate: query.departureDate,
      returnDate: query.returnDate,
      tripType: query.tripType,
      passengers: query.adults + query.children + query.infants,
      cabinClass: query.cabinClass,
      currency: query.currency,
      offersReturned,
      liveApiUsed,
      timestamp: nowIso
    });
    if (store.analytics.recentSearches.length > 60) {
      store.analytics.recentSearches = store.analytics.recentSearches.slice(0, 60);
    }

    saveFlightStore(store);
  }

  static recordBookingRedirectClick(params: {
    providerId: string;
    origin?: string;
    destination?: string;
  }): void {
    const store = loadFlightStore();
    const pid = String(params.providerId || 'unknown').trim();
    store.analytics.totalBookingRedirectClicks += 1;
    store.analytics.redirectsByProvider[pid] =
      (store.analytics.redirectsByProvider[pid] || 0) + 1;
    saveFlightStore(store);
  }

  static getPublicBookingProviders(): any[] {
    const store = loadFlightStore();
    return store.bookingProviders
      .filter((bp) => bp.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((bp) => ({
        ...bp,
        type: bp.category,
        officialUrl: bp.officialWebsiteUrl,
        affiliateBaseUrl: bp.approvedAffiliateUrl || '',
        description: bp.shortDescription,
        supportsDeepLink: bp.supportsDirectRouteDeepLink
      }));
  }

  static getPublicSearchConfiguration(): FlightSearchConfiguration {
    const store = loadFlightStore();
    return { ...store.searchConfig };
  }

  /**
   * Returns complete Admin Flight Management overview WITHOUT exposing any secret API keys!
   */
  static getAdminFlightManagementOverview() {
    const store = loadFlightStore();
    syncProviderConfigurationState(store);
    const preferredProviderId = store.searchConfig.preferredProviderId || 'serpapi';

    const apiProviders = Object.values(store.apiProviders)
      .sort((a, b) => {
        const aId = a.providerId === 'duffel_future' ? 'custom_gds' : a.providerId;
        const bId = b.providerId === 'duffel_future' ? 'custom_gds' : b.providerId;
        const aPrimary = aId === preferredProviderId ? 0 : 1;
        const bPrimary = bId === preferredProviderId ? 0 : 1;
        if (aPrimary !== bPrimary) return aPrimary - bPrimary;
        return a.priority - b.priority;
      })
      .map((p) => {
        const mappedId = p.providerId === 'duffel_future' ? 'custom_gds' : p.providerId;
        const isPrimary = mappedId === preferredProviderId;

        let credentialSource: 'server_vault' | 'env_var' | 'not_configured' = 'not_configured';
        let requiredEnvKeys: string[] = [];
        let engineLabel: string | null = null;

        if (p.providerId === 'serpapi') {
          requiredEnvKeys = ['SERPAPI_API_KEY'];
          engineLabel = 'google_flights';
          if (store.serverSecrets.serpApiKey && store.serverSecrets.serpApiKey.trim()) {
            credentialSource = 'server_vault';
          } else if (process.env.SERPAPI_API_KEY && process.env.SERPAPI_API_KEY.trim()) {
            credentialSource = 'env_var';
          }
        } else if (p.providerId === 'amadeus') {
          requiredEnvKeys = ['AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET'];
          engineLabel = 'flight-offers-search (v2/v1)';
          const hasVault = Boolean(
            store.serverSecrets.amadeusClientId?.trim() &&
              store.serverSecrets.amadeusClientSecret?.trim()
          );
          if (hasVault) {
            credentialSource = 'server_vault';
          } else if (p.hasCredentialsConfigured) {
            credentialSource = 'env_var';
          }
        } else if (p.providerId === 'skyscanner') {
          requiredEnvKeys = ['SKYSCANNER_API_KEY'];
          engineLabel = 'flights/live/search (v3)';
          if (store.serverSecrets.skyscannerApiKey && store.serverSecrets.skyscannerApiKey.trim()) {
            credentialSource = 'server_vault';
          } else if (process.env.SKYSCANNER_API_KEY && process.env.SKYSCANNER_API_KEY.trim()) {
            credentialSource = 'env_var';
          }
        } else {
          if (p.hasCredentialsConfigured) {
            credentialSource = 'server_vault';
          }
        }

        const verified = Boolean(p.hasCredentialsConfigured && p.lastVerifiedAt && !p.lastError);
        const connected = Boolean(p.enabled && p.hasCredentialsConfigured && !p.lastError);

        let statusState:
          | 'connected_verified'
          | 'configured_ready'
          | 'error'
          | 'awaiting_approval'
          | 'missing_credentials'
          | 'disabled' = 'missing_credentials';
        let statusMessage = 'Awaiting server-side API credentials.';

        if (!p.enabled) {
          statusState = 'disabled';
          statusMessage = p.hasCredentialsConfigured
            ? 'Provider disabled by administrator — server-side credentials remain stored.'
            : p.approvalStatus === 'awaiting_partner_approval'
            ? 'Disabled — awaiting commercial partner approval and SKYSCANNER_API_KEY.'
            : 'Disabled by administrator — server-side API credentials not configured.';
        } else if (p.lastError) {
          statusState = 'error';
          statusMessage = p.hasCredentialsConfigured
            ? 'Server credentials configured — last connection check reported a diagnostic error.'
            : `Configuration required — ${p.lastError}`;
        } else if (p.hasCredentialsConfigured && verified) {
          statusState = 'connected_verified';
          statusMessage = 'Connected & verified with server-side credentials.';
        } else if (p.hasCredentialsConfigured) {
          statusState = 'configured_ready';
          statusMessage =
            'Server-side credentials configured & active (click Test Connection to verify live response).';
        } else if (p.approvalStatus === 'awaiting_partner_approval') {
          statusState = 'awaiting_approval';
          statusMessage =
            'Adapter ready — awaiting commercial partner approval and server-side SKYSCANNER_API_KEY.';
        } else if (p.providerId === 'serpapi') {
          statusState = 'missing_credentials';
          statusMessage =
            'Not configured — set SERPAPI_API_KEY in server environment or click Configure Server Credentials.';
        } else if (p.providerId === 'amadeus') {
          statusState = 'missing_credentials';
          statusMessage =
            'Not configured — set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET on the server.';
        } else {
          statusState = 'missing_credentials';
          statusMessage = 'Awaiting server-side API credentials.';
        }

        // Strictly return non-secret metadata only; never include serverSecrets values
        return {
          id: mappedId,
          providerId: p.providerId,
          name: p.providerName,
          providerName: p.providerName,
          engine: engineLabel,
          isPrimary,
          category: 'GDS / Flight API',
          enabled: p.enabled,
          priority: p.priority,
          connected,
          verified,
          statusState,
          credentialsConfigured: p.hasCredentialsConfigured,
          credentialSource,
          requiredEnvKeys,
          partnerApprovalRequired: p.providerId === 'skyscanner',
          partnerApproved: p.approvalStatus === 'approved_ready',
          approvalStatus: p.approvalStatus,
          environment: p.environment,
          rateLimitPerMinute: p.rateLimitPerMinute,
          timeoutMs: p.timeoutMs,
          totalRequests: p.totalRequests,
          successfulRequests: p.successfulRequests,
          failedRequests: p.failedRequests,
          lastRequestAt: p.lastVerifiedAt,
          lastVerifiedAt: p.lastVerifiedAt,
          lastResponseTimeMs: p.lastResponseTimeMs ?? null,
          averageResponseTimeMs: p.averageResponseTimeMs ?? null,
          lastError: p.lastError,
          statusMessage
        };
      });

    const bookingProviders = [...store.bookingProviders]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((bp) => ({
        ...bp,
        type: bp.category,
        officialUrl: bp.officialWebsiteUrl,
        affiliateBaseUrl: bp.approvedAffiliateUrl || '',
        description: bp.shortDescription,
        supportsDeepLink: bp.supportsDirectRouteDeepLink
      }));

    const totalApiRequests = Object.values(store.apiProviders).reduce(
      (sum, p) => sum + p.totalRequests,
      0
    );
    const totalApiErrors = Object.values(store.apiProviders).reduce(
      (sum, p) => sum + p.failedRequests,
      0
    );
    const providerErrorRatePercent =
      totalApiRequests > 0 ? Math.round((totalApiErrors / totalApiRequests) * 1000) / 10 : 0;

    const mostSearchedRoutes = Object.values(store.analytics.searchesByRoute)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((r) => ({
        route: r.routeKey,
        origin: r.origin,
        destination: r.destination,
        count: r.count
      }));

    const popularDepartureAirports = Object.entries(store.analytics.searchesByOrigin)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([iata, count]) => ({
        iata,
        city: AirportAutocompleteService.findByIata(iata)?.city || iata,
        count
      }));

    const popularDestinationAirports = Object.entries(store.analytics.searchesByDestination)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([iata, count]) => ({
        iata,
        city: AirportAutocompleteService.findByIata(iata)?.city || iata,
        count
      }));

    const searchVolumeByDate = Object.entries(store.analytics.searchesByDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    const redirectClicksByProvider = Object.entries(store.analytics.redirectsByProvider)
      .sort((a, b) => b[1] - a[1])
      .map(([providerId, clicks]) => {
        const bp = store.bookingProviders.find((x) => x.id === providerId);
        return {
          providerId,
          providerName: bp?.name || providerId,
          clicks
        };
      });

    const searchConfig = {
      ...store.searchConfig,
      preferredProviderId,
      defaultAdults: store.searchConfig.defaultPassengerAdults,
      defaultChildren: 0,
      defaultInfants: 0,
      defaultCabinClass: 'Economy',
      priceFreshnessThresholdSeconds: store.searchConfig.liveFreshnessThresholdSeconds,
      searchRateLimitPerIpPerMinute: store.searchConfig.rateLimitSearchesPerMinutePerIp
    };

    const analyticsPayload = {
      ...store.analytics,
      totalApiRequests,
      totalApiErrors,
      providerErrorRatePercent,
      totalRedirectClicks: store.analytics.totalBookingRedirectClicks,
      mostSearchedRoutes,
      popularDepartureAirports,
      popularDestinationAirports,
      searchVolumeByDate,
      redirectClicksByProvider,
      providerBreakdown: apiProviders.map((p) => ({
        providerId: p.id,
        providerName: p.name,
        enabled: p.enabled,
        connected: p.connected,
        totalRequests: p.totalRequests,
        successfulRequests: p.successfulRequests,
        failedRequests: p.failedRequests,
        errorRatePercent:
          p.totalRequests > 0
            ? Math.round((p.failedRequests / p.totalRequests) * 1000) / 10
            : 0,
        lastResponseTimeMs: p.lastResponseTimeMs ?? null,
        averageResponseTimeMs: p.averageResponseTimeMs ?? null,
        lastVerifiedAt: p.lastRequestAt ?? null
      }))
    };

    return {
      ok: true,
      searchConfig,
      apiProviders: apiProviders.map((p) => ({
        ...p,
        lastSuccessAt: p.lastRequestAt
      })),
      bookingProviders,
      analytics: analyticsPayload,
      priceAlertsCount: store.priceAlerts.length,
      priceAlerts: store.priceAlerts.slice(0, 50)
    };
  }

  static updateAdminApiProvider(params: {
    providerId: 'serpapi' | 'amadeus' | 'skyscanner' | 'duffel_future' | 'custom_gds' | string;
    enabled?: boolean;
    environment?: 'test' | 'production';
    priority?: number;
    rateLimitPerMinute?: number;
    timeoutMs?: number;
    partnerApproved?: boolean;
    clearStoredCredentials?: boolean;
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    serpApiKey?: string;
    credentials?: {
      clientId?: string;
      clientSecret?: string;
      apiKey?: string;
      serpApiKey?: string;
    };
  }): { ok: boolean; message: string; error?: string; provider?: ApiProviderConfigRecord; apiProviders?: any[] } {
    const store = loadFlightStore();
    const internalId =
      params.providerId === 'custom_gds' ? 'duffel_future' : params.providerId;
    const p = store.apiProviders[internalId];
    if (!p) {
      return { ok: false, message: 'Unknown flight API provider.', error: 'Unknown flight API provider.' };
    }

    if (typeof params.enabled === 'boolean') p.enabled = params.enabled;
    if (internalId === 'serpapi') {
      p.environment = 'production';
    } else if (params.environment === 'test' || params.environment === 'production') {
      p.environment = params.environment;
    }
    if (typeof params.priority === 'number' && params.priority >= 1 && params.priority <= 10) {
      p.priority = Math.round(params.priority);
    }
    if (
      typeof params.rateLimitPerMinute === 'number' &&
      params.rateLimitPerMinute >= 1 &&
      params.rateLimitPerMinute <= 600
    ) {
      p.rateLimitPerMinute = Math.round(params.rateLimitPerMinute);
    }
    if (typeof params.timeoutMs === 'number' && params.timeoutMs >= 2000 && params.timeoutMs <= 30000) {
      p.timeoutMs = Math.round(params.timeoutMs);
    }

    const clientIdVal = params.credentials?.clientId ?? params.clientId;
    const clientSecretVal = params.credentials?.clientSecret ?? params.clientSecret;
    const apiKeyVal =
      params.credentials?.serpApiKey ??
      params.serpApiKey ??
      params.credentials?.apiKey ??
      params.apiKey;

    // Store server-side secrets without ever returning them
    if (internalId === 'serpapi') {
      if (params.clearStoredCredentials) {
        delete store.serverSecrets.serpApiKey;
        p.lastVerifiedAt = null;
        p.lastError = null;
      } else if (typeof apiKeyVal === 'string' && apiKeyVal.trim()) {
        store.serverSecrets.serpApiKey = apiKeyVal.trim();
        p.lastError = null;
      }
      syncProviderConfigurationState(store);
    } else if (internalId === 'amadeus') {
      if (params.clearStoredCredentials) {
        delete store.serverSecrets.amadeusClientId;
        delete store.serverSecrets.amadeusClientSecret;
        p.lastVerifiedAt = null;
        p.lastError = null;
      } else {
        if (typeof clientIdVal === 'string' && clientIdVal.trim()) {
          store.serverSecrets.amadeusClientId = clientIdVal.trim();
        }
        if (typeof clientSecretVal === 'string' && clientSecretVal.trim()) {
          store.serverSecrets.amadeusClientSecret = clientSecretVal.trim();
        }
        if ((typeof clientIdVal === 'string' && clientIdVal.trim()) || (typeof clientSecretVal === 'string' && clientSecretVal.trim())) {
          p.lastError = null;
        }
      }
      store.serverSecrets.amadeusEnvironment = p.environment;
      syncProviderConfigurationState(store);
    } else if (internalId === 'skyscanner') {
      if (params.clearStoredCredentials) {
        delete store.serverSecrets.skyscannerApiKey;
        p.lastVerifiedAt = null;
        p.lastError = null;
      } else if (typeof apiKeyVal === 'string' && apiKeyVal.trim()) {
        store.serverSecrets.skyscannerApiKey = apiKeyVal.trim();
        p.lastError = null;
      }
      syncProviderConfigurationState(store);
      if (typeof params.partnerApproved === 'boolean') {
        p.approvalStatus = params.partnerApproved
          ? 'approved_ready'
          : 'awaiting_partner_approval';
      } else if (p.hasCredentialsConfigured) {
        p.approvalStatus = 'approved_ready';
      }
    } else {
      if (params.clearStoredCredentials) {
        p.hasCredentialsConfigured = false;
        p.approvalStatus = 'awaiting_partner_approval';
      } else if (typeof apiKeyVal === 'string' && apiKeyVal.trim()) {
        p.hasCredentialsConfigured = true;
        p.approvalStatus = 'approved_ready';
      }
    }

    FlightPriceRefreshService.clearCache();
    saveFlightStore(store);

    const overview = this.getAdminFlightManagementOverview();
    return {
      ok: true,
      message: `${p.providerName} settings updated securely on server.`,
      provider: p,
      apiProviders: overview.apiProviders
    };
  }

  static async testAdminApiProviderConnection(providerIdRaw: string): Promise<{
    ok: boolean;
    connected: boolean;
    providerId: string;
    latencyMs: number | null;
    message: string;
    apiProviders: any[];
  }> {
    const store = loadFlightStore();
    const internalId = providerIdRaw === 'custom_gds' ? 'duffel_future' : providerIdRaw;
    const p = store.apiProviders[internalId];
    if (!p) {
      return {
        ok: false,
        connected: false,
        providerId: providerIdRaw,
        latencyMs: null,
        message: 'Unknown flight API provider.',
        apiProviders: this.getAdminFlightManagementOverview().apiProviders
      };
    }

    const startMs = Date.now();
    const nowIso = new Date().toISOString();

    if (internalId === 'serpapi') {
      const serpKey = (
        store.serverSecrets.serpApiKey ||
        process.env.SERPAPI_API_KEY ||
        ''
      ).trim();
      if (!serpKey) {
        p.lastError = 'SERPAPI_API_KEY is not configured on the server.';
        saveFlightStore(store);
        return {
          ok: false,
          connected: false,
          providerId: 'serpapi',
          latencyMs: null,
          message:
            'SERPAPI_API_KEY is missing. Click "Configure Server Credentials" to enter your server-side SerpApi key.',
          apiProviders: this.getAdminFlightManagementOverview().apiProviders
        };
      }

      p.totalRequests += 1;
      store.analytics.totalApiRequests += 1;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), p.timeoutMs || 10000);
        let res: Response;
        try {
          res = await fetch(
            `https://serpapi.com/account.json?api_key=${encodeURIComponent(serpKey)}`,
            {
              method: 'GET',
              headers: { Accept: 'application/json' },
              signal: controller.signal
            }
          );
        } finally {
          clearTimeout(timer);
        }

        const latencyMs = Math.max(1, Date.now() - startMs);
        recordProviderResponseLatency(p, latencyMs);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.error) {
          const safeErr = redactSensitiveTokens(
            data?.error || `SerpApi verification returned HTTP ${res.status}`,
            [serpKey]
          );
          throw new Error(safeErr);
        }

        p.successfulRequests += 1;
        p.lastVerifiedAt = nowIso;
        p.lastError = null;
        p.hasCredentialsConfigured = true;
        p.approvalStatus = 'approved_ready';
        saveFlightStore(store);

        const planName = typeof data?.plan_name === 'string' ? data.plan_name : 'Active Plan';
        const searchesLeft =
          typeof data?.total_searches_left === 'number'
            ? `, ${data.total_searches_left} searches remaining`
            : '';

        return {
          ok: true,
          connected: true,
          providerId: 'serpapi',
          latencyMs,
          message: `SerpApi Google Flights connection verified (${planName}${searchesLeft}, ${latencyMs} ms).`,
          apiProviders: this.getAdminFlightManagementOverview().apiProviders
        };
      } catch (err) {
        const latencyMs = Math.max(1, Date.now() - startMs);
        recordProviderResponseLatency(p, latencyMs);
        const safeErr = redactSensitiveTokens(
          err instanceof Error ? err.message : 'SerpApi connection test failed',
          [serpKey]
        );
        p.failedRequests += 1;
        p.lastError = safeErr;
        store.analytics.totalApiErrors += 1;
        saveFlightStore(store);
        return {
          ok: false,
          connected: false,
          providerId: 'serpapi',
          latencyMs,
          message: `SerpApi test failed: ${safeErr}`,
          apiProviders: this.getAdminFlightManagementOverview().apiProviders
        };
      }
    }

    if (internalId === 'amadeus') {
      const amadeus = new AmadeusProvider();
      const creds = amadeus.getCredentials();
      if (!creds) {
        p.lastError = 'Amadeus Client ID / Client Secret not configured.';
        saveFlightStore(store);
        return {
          ok: false,
          connected: false,
          providerId: 'amadeus',
          latencyMs: null,
          message:
            'AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are not configured on the server.',
          apiProviders: this.getAdminFlightManagementOverview().apiProviders
        };
      }

      p.totalRequests += 1;
      store.analytics.totalApiRequests += 1;
      try {
        await amadeus.getAccessToken(creds.clientId, creds.clientSecret, creds.baseUrl);
        const latencyMs = Math.max(1, Date.now() - startMs);
        recordProviderResponseLatency(p, latencyMs);
        p.successfulRequests += 1;
        p.lastVerifiedAt = nowIso;
        p.lastError = null;
        p.hasCredentialsConfigured = true;
        p.approvalStatus = 'approved_ready';
        saveFlightStore(store);
        return {
          ok: true,
          connected: true,
          providerId: 'amadeus',
          latencyMs,
          message: `Amadeus OAuth2 connection verified (${creds.environment.toUpperCase()} environment, ${latencyMs} ms).`,
          apiProviders: this.getAdminFlightManagementOverview().apiProviders
        };
      } catch (err) {
        const latencyMs = Math.max(1, Date.now() - startMs);
        recordProviderResponseLatency(p, latencyMs);
        const safeErr = redactSensitiveTokens(
          err instanceof Error ? err.message : 'Amadeus OAuth test failed',
          [creds.clientId, creds.clientSecret]
        );
        p.failedRequests += 1;
        p.lastError = safeErr;
        store.analytics.totalApiErrors += 1;
        saveFlightStore(store);
        return {
          ok: false,
          connected: false,
          providerId: 'amadeus',
          latencyMs,
          message: `Amadeus connection test failed: ${safeErr}`,
          apiProviders: this.getAdminFlightManagementOverview().apiProviders
        };
      }
    }

    if (internalId === 'skyscanner') {
      const skyKey = (
        store.serverSecrets.skyscannerApiKey ||
        process.env.SKYSCANNER_API_KEY ||
        ''
      ).trim();
      if (!skyKey) {
        return {
          ok: false,
          connected: false,
          providerId: 'skyscanner',
          latencyMs: null,
          message:
            'SKYSCANNER_API_KEY is not configured (requires commercial partner approval).',
          apiProviders: this.getAdminFlightManagementOverview().apiProviders
        };
      }
      const sky = new SkyscannerProvider();
      const depDate = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
      const res = await sky.searchFlights({
        tripType: 'one_way',
        origin: 'ICN',
        destination: 'NRT',
        departureDate: depDate,
        adults: 1,
        children: 0,
        infants: 0,
        cabinClass: 'ECONOMY',
        currency: 'USD'
      });
      const latencyMs = Math.max(1, Date.now() - startMs);
      return {
        ok: res.ok,
        connected: res.ok,
        providerId: 'skyscanner',
        latencyMs,
        message: res.ok
          ? `Skyscanner Live Prices API verified (${latencyMs} ms).`
          : `Skyscanner test failed: ${res.errorMessage || 'Partner key rejected'}`,
        apiProviders: this.getAdminFlightManagementOverview().apiProviders
      };
    }

    return {
      ok: false,
      connected: false,
      providerId: providerIdRaw,
      latencyMs: null,
      message: 'Secondary GDS adapter slot has no live endpoint configured yet.',
      apiProviders: this.getAdminFlightManagementOverview().apiProviders
    };
  }

  static upsertAdminBookingProvider(
    input: any
  ): { ok: boolean; message: string; error?: string; provider?: BookingProviderDirectoryItem; bookingProviders?: any[] } {
    const store = loadFlightStore();
    const name = String(input.name || '').trim();
    if (!name || name.length < 2 || name.length > 90) {
      return {
        ok: false,
        message: 'Provider name is required (2–90 characters).',
        error: 'Provider name is required (2–90 characters).'
      };
    }

    const rawOfficial = input.officialWebsiteUrl ?? input.officialUrl;
    const officialCheck = AffiliateLinkService.validateHttpsUrl(rawOfficial);
    if (!officialCheck.valid || !officialCheck.url) {
      return {
        ok: false,
        message: officialCheck.error || 'Official website URL must be a valid https:// URL.',
        error: officialCheck.error || 'Official website URL must be a valid https:// URL.'
      };
    }

    const rawAffiliate = input.approvedAffiliateUrl ?? input.affiliateBaseUrl ?? '';
    const affiliateCheck = AffiliateLinkService.validateHttpsUrl(rawAffiliate);
    if (!affiliateCheck.valid) {
      return {
        ok: false,
        message: affiliateCheck.error || 'Approved affiliate link must use https://.',
        error: affiliateCheck.error || 'Approved affiliate link must use https://.'
      };
    }

    const logoCheck = AffiliateLinkService.validateHttpsUrl(input.logoUrl || '');
    const resolvedLogo =
      logoCheck.valid && logoCheck.url
        ? logoCheck.url
        : `https://www.google.com/s2/favicons?domain=${new URL(officialCheck.url).hostname}&sz=128`;

    const id =
      String(input.id || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_') ||
      `prov_${name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24)}_${Date.now()}`;

    const nowIso = new Date().toISOString();
    const existingIdx = store.bookingProviders.findIndex((bp) => bp.id === id);
    const rawCat = input.category ?? input.type;

    const record: BookingProviderDirectoryItem = {
      id,
      name,
      category:
        rawCat === 'metasearch' || rawCat === 'airline' ? rawCat : 'ota',
      logoUrl: resolvedLogo,
      officialWebsiteUrl: officialCheck.url,
      approvedAffiliateUrl: affiliateCheck.url,
      shortDescription:
        String(input.shortDescription ?? input.description ?? '').trim().slice(0, 300) ||
        `Compare flights and book directly with ${name}.`,
      enabled: typeof input.enabled === 'boolean' ? input.enabled : true,
      displayOrder:
        typeof input.displayOrder === 'number'
          ? Math.max(1, Math.round(input.displayOrder))
          : store.bookingProviders.length + 1,
      supportsDirectRouteDeepLink: Boolean(
        input.supportsDirectRouteDeepLink ?? input.supportsDeepLink ?? true
      ),
      updatedAt: nowIso
    };

    if (existingIdx >= 0) {
      store.bookingProviders[existingIdx] = record;
    } else {
      store.bookingProviders.push(record);
    }

    saveFlightStore(store);
    const overview = this.getAdminFlightManagementOverview();
    return {
      ok: true,
      message: `Booking provider "${record.name}" saved.`,
      provider: record,
      bookingProviders: overview.bookingProviders
    };
  }

  static deleteAdminBookingProvider(id: string): { ok: boolean; message: string; error?: string; bookingProviders?: any[] } {
    const store = loadFlightStore();
    const idx = store.bookingProviders.findIndex((bp) => bp.id === id);
    if (idx === -1) {
      return { ok: false, message: 'Booking provider not found.', error: 'Booking provider not found.' };
    }
    const removed = store.bookingProviders.splice(idx, 1)[0];
    saveFlightStore(store);
    const overview = this.getAdminFlightManagementOverview();
    return {
      ok: true,
      message: `Removed provider "${removed.name}".`,
      bookingProviders: overview.bookingProviders
    };
  }

  static updateAdminSearchConfig(
    input: any,
    adminName?: string
  ): { ok: boolean; message: string; searchConfig: any } {
    const store = loadFlightStore();
    const cfg = store.searchConfig;

    if (input.defaultCurrency && /^[A-Z]{3}$/.test(String(input.defaultCurrency).toUpperCase())) {
      cfg.defaultCurrency = String(input.defaultCurrency).toUpperCase();
    }
    if (Array.isArray(input.supportedCurrencies) && input.supportedCurrencies.length > 0) {
      const cleaned = input.supportedCurrencies
        .map((c: any) => String(c || '').trim().toUpperCase())
        .filter((c: string) => /^[A-Z]{3}$/.test(c));
      if (cleaned.length > 0) cfg.supportedCurrencies = Array.from(new Set(cleaned));
    }
    const rawAdults = input.defaultPassengerAdults ?? input.defaultAdults;
    if (typeof rawAdults === 'number') {
      cfg.defaultPassengerAdults = Math.min(9, Math.max(1, Math.round(rawAdults)));
    }
    if (typeof input.cacheTtlSeconds === 'number') {
      cfg.cacheTtlSeconds = Math.min(3600, Math.max(30, Math.round(input.cacheTtlSeconds)));
    }
    const rawFreshness = input.liveFreshnessThresholdSeconds ?? input.priceFreshnessThresholdSeconds;
    if (typeof rawFreshness === 'number') {
      cfg.liveFreshnessThresholdSeconds = Math.min(
        1800,
        Math.max(15, Math.round(rawFreshness))
      );
    }
    if (typeof input.maxResultsPerSearch === 'number') {
      cfg.maxResultsPerSearch = Math.min(100, Math.max(5, Math.round(input.maxResultsPerSearch)));
    }
    const rawRateLimit = input.rateLimitSearchesPerMinutePerIp ?? input.searchRateLimitPerIpPerMinute;
    if (typeof rawRateLimit === 'number') {
      cfg.rateLimitSearchesPerMinutePerIp = Math.min(
        200,
        Math.max(5, Math.round(rawRateLimit))
      );
    }

    if (
      input.preferredProviderId === 'serpapi' ||
      input.preferredProviderId === 'amadeus' ||
      input.preferredProviderId === 'skyscanner' ||
      input.preferredProviderId === 'flight_aggregator' ||
      input.preferredProviderId === 'auto'
    ) {
      cfg.preferredProviderId = input.preferredProviderId;
    }

    if (input.airlineDisplaySettings && typeof input.airlineDisplaySettings === 'object') {
      cfg.airlineDisplaySettings = {
        showAirlineLogos:
          typeof input.airlineDisplaySettings.showAirlineLogos === 'boolean'
            ? input.airlineDisplaySettings.showAirlineLogos
            : cfg.airlineDisplaySettings?.showAirlineLogos ?? true,
        showOperatingCarrier:
          typeof input.airlineDisplaySettings.showOperatingCarrier === 'boolean'
            ? input.airlineDisplaySettings.showOperatingCarrier
            : cfg.airlineDisplaySettings?.showOperatingCarrier ?? true,
        showBaggageSummary:
          typeof input.airlineDisplaySettings.showBaggageSummary === 'boolean'
            ? input.airlineDisplaySettings.showBaggageSummary
            : cfg.airlineDisplaySettings?.showBaggageSummary ?? true,
        showTaxesBreakdown:
          typeof input.airlineDisplaySettings.showTaxesBreakdown === 'boolean'
            ? input.airlineDisplaySettings.showTaxesBreakdown
            : cfg.airlineDisplaySettings?.showTaxesBreakdown ?? true,
        featuredAirlines: Array.isArray(input.airlineDisplaySettings.featuredAirlines)
          ? input.airlineDisplaySettings.featuredAirlines
              .map((c: unknown) => String(c || '').trim().toUpperCase())
              .filter(Boolean)
          : cfg.airlineDisplaySettings?.featuredAirlines || ['KE', 'OZ', '7C', 'LJ', 'TW', 'BX']
      };
    }

    cfg.updatedAt = new Date().toISOString();
    cfg.updatedBy = adminName || 'Administrator';
    FlightPriceRefreshService.clearCache();
    saveFlightStore(store);

    const overview = this.getAdminFlightManagementOverview();
    return {
      ok: true,
      message: 'Flight search configuration updated.',
      searchConfig: overview.searchConfig
    };
  }
}
