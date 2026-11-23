import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  PhoneCall,
  ExternalLink,
  Compass,
  CheckCircle2,
  LocateFixed,
  AlertCircle
} from 'lucide-react';
import {
  VerifiedKoreaLocation,
  hasVerifiedKoreaLocation,
  openInNaverMap,
  openInKakaoMap,
  projectKoreaLatLngToSvg,
  calculateDistanceKm
} from '../../utils/koreaMapService';

export interface MapMarkerItem {
  id: string;
  titleEn: string;
  titleKo: string;
  subtitle: string;
  city: string;
  province: string;
  addressEn: string;
  addressKo: string;
  lat: number;
  lng: number;
  phone: string;
  badgeText?: string;
  officialWebsiteUrl?: string;
  verified: boolean;
}

interface KoreaInteractiveMapCanvasProps {
  mode: 'immigration' | 'police';
  items: MapMarkerItem[];
  selectedId: string | null;
  onSelectId: (id: string) => void;
  onNearestFound?: (nearestId: string, distanceKm: number) => void;
}

export const KoreaInteractiveMapCanvas: React.FC<KoreaInteractiveMapCanvasProps> = ({
  mode,
  items,
  selectedId,
  onSelectId,
  onNearestFound
}) => {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const selectedItem = items.find((i) => i.id === selectedId) || items[0] || null;

  const handleFindNearest = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoMessage('Browser geolocation is not supported on this device. Please search by city or district.');
      return;
    }
    setLocating(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        setLocating(false);

        let bestItem: MapMarkerItem | null = null;
        let bestDist = Infinity;
        for (const item of items) {
          const d = calculateDistanceKm(lat, lng, item.lat, item.lng);
          if (d < bestDist) {
            bestDist = d;
            bestItem = item;
          }
        }
        if (bestItem) {
          onSelectId(bestItem.id);
          onNearestFound?.(bestItem.id, bestDist);
          setGeoMessage(
            `Nearest verified location: ${bestItem.titleEn} (${bestDist.toFixed(1)} km from your current position).`
          );
        }
      },
      () => {
        setLocating(false);
        setGeoMessage(
          'Location permission was declined or unavailable. You can still browse all verified South Korea locations or open Naver Map / Kakao Map directly.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const toKoreaTarget = (item: MapMarkerItem): VerifiedKoreaLocation => ({
    nameEn: item.titleEn,
    nameKo: item.titleKo,
    addressEn: item.addressEn,
    addressKo: item.addressKo,
    city: item.city,
    province: item.province,
    lat: item.lat,
    lng: item.lng
  });

  return (
    <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs">
      {/* Top Map Toolbar */}
      <div className="px-4 sm:px-5 py-3.5 bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#10243A] dark:bg-[#19B6A4] text-white dark:text-[#10243A] flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#10243A] dark:text-white">
              {mode === 'immigration'
                ? 'South Korea Immigration Office Interactive Map (Naver & Kakao)'
                : 'South Korea Police Station Interactive Map (Naver & Kakao)'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Click any pin to inspect verified coordinates & launch Naver Map or Kakao Map
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFindNearest}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1769AA] hover:bg-[#10243A] text-white transition-colors cursor-pointer disabled:opacity-60"
        >
          <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? 'Locating...' : 'Find Nearest to Me'}</span>
        </button>
      </div>

      {geoMessage && (
        <div className="px-4 py-2.5 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-200/70 dark:border-blue-900/60 flex items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4] shrink-0" />
            <span>{geoMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeoMessage(null)}
            className="text-[11px] font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Grid: Left Interactive Korea Map SVG | Right Selected Pin Details & Naver/Kakao Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Interactive South Korea Coordinate Map */}
        <div className="lg:col-span-7 relative bg-[#EFF6FF] dark:bg-[#091320] p-4 flex flex-col items-center justify-center min-h-[380px] border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800">
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/95 dark:bg-[#10243A]/95 text-[#10243A] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#03C75A]" />
              Naver Map Ready
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/95 dark:bg-[#10243A]/95 text-[#10243A] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#FEE500] border border-amber-500" />
              Kakao Map Ready
            </span>
          </div>

          <svg
            viewBox="0 0 1000 1200"
            className="w-full max-w-[390px] h-auto select-none"
            role="img"
            aria-label="Interactive Map of South Korea"
          >
            {/* Subtle Coordinate Grid */}
            <g stroke="currentColor" className="text-slate-300/50 dark:text-slate-800/70" strokeWidth="2" strokeDasharray="8 8">
              <line x1="200" y1="0" x2="200" y2="1200" />
              <line x1="400" y1="0" x2="400" y2="1200" />
              <line x1="600" y1="0" x2="600" y2="1200" />
              <line x1="800" y1="0" x2="800" y2="1200" />
              <line x1="0" y1="240" x2="1000" y2="240" />
              <line x1="0" y1="480" x2="1000" y2="480" />
              <line x1="0" y1="720" x2="1000" y2="720" />
              <line x1="0" y1="960" x2="1000" y2="960" />
            </g>

            {/* Stylized Mainland South Korea Silhouette */}
            <path
              d="M280,130 L440,105 L590,155 L700,310 L760,485 L780,660 L720,810 L590,890 L410,940 L260,920 L205,785 L235,610 L200,435 L220,280 Z"
              className="fill-white dark:fill-[#132842] stroke-[#1769AA]/40 dark:stroke-[#19B6A4]/40"
              strokeWidth="6"
              strokeLinejoin="round"
            />

            {/* Jeju Special Self-Governing Province Island */}
            <ellipse
              cx="295"
              cy="1080"
              rx="85"
              ry="35"
              className="fill-white dark:fill-[#132842] stroke-[#1769AA]/40 dark:stroke-[#19B6A4]/40"
              strokeWidth="5"
            />

            {/* Regional Reference Labels */}
            <g className="fill-slate-400 dark:fill-slate-500 text-[24px] font-bold pointer-events-none">
              <text x="300" y="255">SEOUL / GYEONGGI</text>
              <text x="540" y="240">GANGWON</text>
              <text x="330" y="485">DAEJEON / CHUNGCHEONG</text>
              <text x="560" y="580">DAEGU / GYEONGSANG</text>
              <text x="280" y="760">GWANGJU / JEOLLA</text>
              <text x="605" y="810">BUSAN / ULSAN</text>
              <text x="260" y="1090">JEJU</text>
            </g>

            {/* User Geolocation Dot if available */}
            {userCoords && (() => {
              const pt = projectKoreaLatLngToSvg(userCoords.lat, userCoords.lng);
              return (
                <g>
                  <circle cx={pt.x} cy={pt.y} r="26" className="fill-emerald-500/25 animate-ping" />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="13"
                    className="fill-emerald-500 stroke-white"
                    strokeWidth="5"
                  />
                </g>
              );
            })()}

            {/* Verified Location Pins */}
            {items.map((item) => {
              const pt = projectKoreaLatLngToSvg(item.lat, item.lng);
              const isSelected = selectedItem?.id === item.id;
              return (
                <g
                  key={item.id}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  onClick={() => onSelectId(item.id)}
                  className="cursor-pointer group"
                >
                  {isSelected && (
                    <circle
                      r="36"
                      className="fill-[#1769AA]/25 dark:fill-[#19B6A4]/25 animate-pulse"
                    />
                  )}
                  <circle
                    r={isSelected ? 18 : 14}
                    className={
                      isSelected
                        ? 'fill-[#DC2626] stroke-white dark:stroke-[#0B1523]'
                        : mode === 'immigration'
                        ? 'fill-[#1769AA] dark:fill-[#19B6A4] stroke-white dark:stroke-[#0B1523] group-hover:fill-[#DC2626]'
                        : 'fill-[#10243A] dark:fill-sky-400 stroke-white dark:stroke-[#0B1523] group-hover:fill-[#DC2626]'
                    }
                    strokeWidth="5"
                  />
                  {isSelected && (
                    <g transform="translate(0, -32)">
                      <rect
                        x="-170"
                        y="-52"
                        width="340"
                        height="46"
                        rx="12"
                        className="fill-[#10243A] dark:fill-white opacity-95"
                      />
                      <text
                        x="0"
                        y="-22"
                        textAnchor="middle"
                        className="fill-white dark:fill-[#10243A] text-[23px] font-bold"
                      >
                        {item.city} ({item.titleKo.slice(0, 8)})
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="w-full mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-2">
            <span>Showing {items.length} verified South Korea locations</span>
            <span>WGS84 Coordinates Verified</span>
          </div>
        </div>

        {/* Right: Selected Location Details & Direct Naver / Kakao Map Launchers */}
        <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-white dark:bg-[#10243A]">
          {selectedItem ? (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#1769AA]/10 dark:bg-[#19B6A4]/15 text-[#1769AA] dark:text-[#19B6A4]">
                    {selectedItem.city} · {selectedItem.province}
                  </span>
                  {selectedItem.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified Coordinates
                    </span>
                  )}
                </div>

                <h4 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white leading-snug">
                  {selectedItem.titleEn}
                </h4>
                <p
                  data-no-translate="true"
                  className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-300 mt-0.5"
                >
                  {selectedItem.titleKo}
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0B1523] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#10243A] dark:text-white">
                      {selectedItem.addressEn}
                    </p>
                    {selectedItem.addressKo && (
                      <p data-no-translate="true" className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedItem.addressKo}
                      </p>
                    )}
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      Lat {selectedItem.lat.toFixed(4)}° N, Lng {selectedItem.lng.toFixed(4)}° E
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Official Phone:</span>
                  <a
                    href={`tel:${selectedItem.phone.replace(/[^0-9+]/g, '')}`}
                    className="inline-flex items-center gap-1.5 font-bold text-[#1769AA] dark:text-[#19B6A4] hover:underline"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{selectedItem.phone}</span>
                  </a>
                </div>
              </div>

              {/* Primary Naver Map & Kakao Map Buttons */}
              {hasVerifiedKoreaLocation(toKoreaTarget(selectedItem)) && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Korean Mapping & Navigation (Mobile App + Web)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => openInNaverMap(toKoreaTarget(selectedItem), 'place')}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#03C75A] hover:bg-[#02b350] text-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>Open in Naver Map</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openInKakaoMap(toKoreaTarget(selectedItem), 'place')}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#FEE500] hover:bg-[#f5dc00] text-[#191919] shadow-2xs transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>Open in Kakao Map</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openInNaverMap(toKoreaTarget(selectedItem), 'directions')}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 shrink-0" />
                      <span>Naver Directions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openInKakaoMap(toKoreaTarget(selectedItem), 'directions')}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 shrink-0" />
                      <span>Kakao Directions</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              Select a location pin on the map to inspect verified details.
            </div>
          )}

          {selectedItem?.officialWebsiteUrl && (
            <div className="mt-5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
              <a
                href={`tel:${selectedItem.phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#10243A] text-white dark:bg-slate-800 hover:opacity-90 transition-opacity"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call {selectedItem.phone}</span>
              </a>

              <a
                href={selectedItem.officialWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1769AA] dark:text-[#19B6A4] hover:underline"
              >
                <span>Official Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
