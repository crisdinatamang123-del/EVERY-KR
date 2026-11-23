/**
 * EveryKR South Korea Mapping Service — Naver Map & Kakao Map Primary Integration
 *
 * Architecture:
 * - Zero Google Maps Platform dependencies, zero Google Maps API billing, and zero mandatory API keys.
 * - Uses official Naver Map (map.naver.com / nmap://) and Kakao Map (map.kakao.com / kakaomap://)
 *   deep links and web endpoints.
 * - On mobile devices (iOS / Android), attempts to open the installed Naver Map or Kakao Map app
 *   via its documented URI scheme (`nmap://` or `kakaomap://`) and gracefully falls back to the
 *   official mobile web URL if the app is not installed.
 * - On desktop browsers, opens the official Naver Map or Kakao Map web portal in a new tab.
 * - Enforces a strict location verification gate (`hasVerifiedKoreaLocation`) so unverified or
 *   fabricated coordinates are never rendered on a map.
 */

export interface VerifiedKoreaLocation {
  nameKo: string;
  nameEn: string;
  addressKo: string;
  addressEn?: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  verifiedSource?: string;
  lastVerifiedDate?: string;
}

export interface KoreaRouteEndpoints {
  originNameKo: string;
  originNameEn: string;
  originLat: number;
  originLng: number;
  destNameKo: string;
  destNameEn: string;
  destLat: number;
  destLng: number;
}

const SOUTH_KOREA_LAT_MIN = 33.0;
const SOUTH_KOREA_LAT_MAX = 38.7;
const SOUTH_KOREA_LNG_MIN = 124.5;
const SOUTH_KOREA_LNG_MAX = 131.95;

/**
 * Verifies that a location record contains a non-empty Korean/English address
 * and valid WGS84 coordinates within South Korea.
 */
export function hasVerifiedKoreaLocation(loc?: Partial<VerifiedKoreaLocation> | null): boolean {
  if (!loc) return false;
  const hasAddress =
    Boolean(loc.addressKo && loc.addressKo.trim().length >= 4) ||
    Boolean(loc.addressEn && loc.addressEn.trim().length >= 6);
  const hasCoords =
    typeof loc.lat === 'number' &&
    typeof loc.lng === 'number' &&
    !Number.isNaN(loc.lat) &&
    !Number.isNaN(loc.lng) &&
    loc.lat >= SOUTH_KOREA_LAT_MIN &&
    loc.lat <= SOUTH_KOREA_LAT_MAX &&
    loc.lng >= SOUTH_KOREA_LNG_MIN &&
    loc.lng <= SOUTH_KOREA_LNG_MAX;

  return hasAddress && hasCoords;
}

/**
 * Detects whether the current browser environment is a mobile/tablet device
 * capable of handling `nmap://` and `kakaomap://` app deep links.
 */
export function isMobileDeviceEnvironment(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

/**
 * Builds the official Naver Map web URL and mobile app deep link (`nmap://`) for a verified location.
 * Official Naver Map URL Scheme Reference: https://guide.ncloud-docs.com/docs/naveropenapiv3-maps-url-scheme-url-scheme
 */
export function buildNaverMapLinks(loc: VerifiedKoreaLocation): {
  webUrl: string;
  mobileDeepLink: string;
  directionsWebUrl: string;
  directionsDeepLink: string;
} {
  const searchQuery = loc.nameKo
    ? `${loc.nameKo} ${loc.addressKo || ''}`.trim()
    : `${loc.nameEn} ${loc.addressEn || loc.city}`.trim();

  const encodedSearch = encodeURIComponent(searchQuery);
  const encodedName = encodeURIComponent(loc.nameKo || loc.nameEn);
  const appName = encodeURIComponent('https://everykr.com');

  const webUrl = `https://map.naver.com/p/search/${encodedSearch}`;
  const mobileDeepLink = hasVerifiedKoreaLocation(loc)
    ? `nmap://place?lat=${loc.lat}&lng=${loc.lng}&name=${encodedName}&appname=${appName}`
    : `nmap://search?query=${encodedSearch}&appname=${appName}`;

  const directionsWebUrl = `https://map.naver.com/p/search/${encodedSearch}`;
  const directionsDeepLink = hasVerifiedKoreaLocation(loc)
    ? `nmap://route/public?dlat=${loc.lat}&dlng=${loc.lng}&dname=${encodedName}&appname=${appName}`
    : mobileDeepLink;

  return {
    webUrl,
    mobileDeepLink,
    directionsWebUrl,
    directionsDeepLink,
  };
}

/**
 * Builds the official Kakao Map web URL and mobile app deep link (`kakaomap://`) for a verified location.
 * Official Kakao Map Link Reference: https://apis.map.kakao.com/web/guide/#mapurl
 */
export function buildKakaoMapLinks(loc: VerifiedKoreaLocation): {
  webUrl: string;
  mobileDeepLink: string;
  directionsWebUrl: string;
  directionsDeepLink: string;
} {
  const label = (loc.nameKo || loc.nameEn).replace(/,/g, ' ');
  const encodedLabel = encodeURIComponent(label);
  const searchQuery = encodeURIComponent(loc.nameKo || loc.addressKo || loc.nameEn);

  const webUrl = hasVerifiedKoreaLocation(loc)
    ? `https://map.kakao.com/link/map/${encodedLabel},${loc.lat},${loc.lng}`
    : `https://map.kakao.com/link/search/${searchQuery}`;

  const directionsWebUrl = hasVerifiedKoreaLocation(loc)
    ? `https://map.kakao.com/link/to/${encodedLabel},${loc.lat},${loc.lng}`
    : `https://map.kakao.com/link/search/${searchQuery}`;

  const mobileDeepLink = hasVerifiedKoreaLocation(loc)
    ? `kakaomap://look?p=${loc.lat},${loc.lng}`
    : `kakaomap://search?q=${searchQuery}`;

  const directionsDeepLink = hasVerifiedKoreaLocation(loc)
    ? `kakaomap://route?ep=${loc.lat},${loc.lng}&by=PUBLICTRANSIT`
    : mobileDeepLink;

  return {
    webUrl,
    mobileDeepLink,
    directionsWebUrl,
    directionsDeepLink,
  };
}

/**
 * Builds Naver Map and Kakao Map transit route links between two verified Korean locations
 * (e.g., Incheon International Airport -> Busan Station).
 */
export function buildKoreaTransitRouteLinks(route: KoreaRouteEndpoints): {
  naverWebUrl: string;
  naverDeepLink: string;
  kakaoWebUrl: string;
  kakaoDeepLink: string;
} {
  const sName = encodeURIComponent(route.originNameKo || route.originNameEn);
  const dName = encodeURIComponent(route.destNameKo || route.destNameEn);
  const appName = encodeURIComponent('https://everykr.com');

  const naverSearchQuery = encodeURIComponent(`${route.originNameKo}에서 ${route.destNameKo} 길찾기`);
  const naverWebUrl = `https://map.naver.com/p/search/${naverSearchQuery}`;
  const naverDeepLink = `nmap://route/public?slat=${route.originLat}&slng=${route.originLng}&sname=${sName}&dlat=${route.destLat}&dlng=${route.destLng}&dname=${dName}&appname=${appName}`;

  const dLabel = (route.destNameKo || route.destNameEn).replace(/,/g, ' ');
  const kakaoWebUrl = `https://map.kakao.com/link/to/${encodeURIComponent(dLabel)},${route.destLat},${route.destLng}`;
  const kakaoDeepLink = `kakaomap://route?sp=${route.originLat},${route.originLng}&ep=${route.destLat},${route.destLng}&by=PUBLICTRANSIT`;

  return {
    naverWebUrl,
    naverDeepLink,
    kakaoWebUrl,
    kakaoDeepLink,
  };
}

/**
 * Opens a map link with mobile deep-link detection and automatic web fallback.
 * Never forces app installation; if the native app does not take focus within 1.2s on mobile,
 * navigates smoothly to the official mobile web map.
 */
function openMapWithMobileDeepLinkFallback(mobileDeepLink: string, webUrl: string): void {
  if (typeof window === 'undefined') return;

  if (!isMobileDeviceEnvironment()) {
    const anchor = document.createElement('a');
    anchor.href = webUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return;
  }

  let appOpened = false;
  const onVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.location.href = mobileDeepLink;

  window.setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (!appOpened && !document.hidden) {
      window.location.assign(webUrl);
    }
  }, 1250);
}

export function openInNaverMap(loc: VerifiedKoreaLocation, mode: 'place' | 'directions' = 'place'): void {
  const links = buildNaverMapLinks(loc);
  if (mode === 'directions') {
    openMapWithMobileDeepLinkFallback(links.directionsDeepLink, links.directionsWebUrl);
  } else {
    openMapWithMobileDeepLinkFallback(links.mobileDeepLink, links.webUrl);
  }
}

export function openInKakaoMap(loc: VerifiedKoreaLocation, mode: 'place' | 'directions' = 'place'): void {
  const links = buildKakaoMapLinks(loc);
  if (mode === 'directions') {
    openMapWithMobileDeepLinkFallback(links.directionsDeepLink, links.directionsWebUrl);
  } else {
    openMapWithMobileDeepLinkFallback(links.mobileDeepLink, links.webUrl);
  }
}

export function openRouteInNaverMap(route: KoreaRouteEndpoints): void {
  const links = buildKoreaTransitRouteLinks(route);
  openMapWithMobileDeepLinkFallback(links.naverDeepLink, links.naverWebUrl);
}

export function openRouteInKakaoMap(route: KoreaRouteEndpoints): void {
  const links = buildKoreaTransitRouteLinks(route);
  openMapWithMobileDeepLinkFallback(links.kakaoDeepLink, links.kakaoWebUrl);
}

/**
 * Calculates great-circle distance in kilometers between two WGS84 coordinates (Haversine formula).
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Projects South Korea WGS84 coordinates (lat 33.1..38.5, lng 125.8..129.6)
 * onto a normalized 0..1000 x 0..1200 interactive SVG map coordinate space.
 */
export function projectKoreaLatLngToSvg(lat: number, lng: number): { x: number; y: number } {
  const minLat = 33.1;
  const maxLat = 38.4;
  const minLng = 125.8;
  const maxLng = 129.65;

  const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
  const clampedLng = Math.max(minLng, Math.min(maxLng, lng));

  const x = 110 + ((clampedLng - minLng) / (maxLng - minLng)) * 780;
  const y = 1080 - ((clampedLat - minLat) / (maxLat - minLat)) * 960;

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}
