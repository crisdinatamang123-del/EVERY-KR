import React, { useState, useMemo } from 'react';
import {
  PhoneCall,
  Search,
  ShieldAlert,
  Building2,
  MapPin,
  Navigation,
  ExternalLink,
  Clock,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  CalendarCheck,
  Siren
} from 'lucide-react';
import {
  EmergencyCategory,
  KoreaEmergencyContact,
  KoreaImmigrationOffice,
  KoreaPoliceStation,
  EMERGENCY_CATEGORIES
} from '../../data/essentialHubData';
import {
  VerifiedKoreaLocation,
  hasVerifiedKoreaLocation,
  openInNaverMap,
  openInKakaoMap
} from '../../utils/koreaMapService';
import { KoreaInteractiveMapCanvas, MapMarkerItem } from './KoreaInteractiveMapCanvas';

// ============================================================================
// MODULE 1: KOREA EMERGENCY NUMBERS
// ============================================================================

export const EmergencyNumbersModule: React.FC<{
  contacts: KoreaEmergencyContact[];
}> = ({ contacts }) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | EmergencyCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contacts.filter((c) => {
      if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        c.serviceNameEn.toLowerCase().includes(q) ||
        c.serviceNameKo.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q) ||
        c.descriptionEn.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.languagesSupported.some((l: string) => l.toLowerCase().includes(q))
      );
    });
  }, [contacts, selectedCategory, searchQuery]);

  const criticalHotlines = [
    {
      number: '112',
      label: 'Police Emergency',
      ko: '범죄신고 경찰청',
      sub: '24/7 Crime & Safety Dispatch (Interpreter Available)',
      color: 'bg-[#10243A] text-white border-[#10243A]'
    },
    {
      number: '119',
      label: 'Fire & Ambulance',
      ko: '화재·구급·응급의료',
      sub: '24/7 Rescue & Medical Emergency Dispatch',
      color: 'bg-[#DC2626] text-white border-[#DC2626]'
    },
    {
      number: '1345',
      label: 'Immigration Contact Center',
      ko: '외국인종합안내센터',
      sub: 'Visa, ARC, HiKorea & Foreign Resident Help (20 Languages)',
      color: 'bg-[#1769AA] text-white border-[#1769AA]'
    },
    {
      number: '1330',
      label: 'Korea Travel Helpline',
      ko: '관광통역안내전화',
      sub: '24/7 Multilingual Translation & Emergency Tourist Help',
      color: 'bg-[#0D9488] text-white border-[#0D9488]'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Critical 4-Card Speed-Dial Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {criticalHotlines.map((hotline) => (
          <a
            key={hotline.number}
            href={`tel:${hotline.number}`}
            className={`rounded-2xl p-4 sm:p-5 border shadow-xs hover:opacity-95 transition-opacity flex flex-col justify-between ${hotline.color}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                  {hotline.label}
                </span>
                <span
                  data-no-translate="true"
                  className="text-[11px] font-semibold opacity-80"
                >
                  {hotline.ko}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono">
                  {hotline.number}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white/20 backdrop-blur-xs">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Tap to Call</span>
                </span>
              </div>
            </div>
            <p className="mt-2.5 text-xs opacity-90 leading-snug">{hotline.sub}</p>
          </a>
        ))}
      </div>

      {/* Category Filter & Search Controls */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
              Verified South Korea Emergency & Public Support Hotlines ({filteredContacts.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All numbers are verified official Korean government and public emergency hotlines with direct tel: dialing.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search number, language, or service..."
              className="w-full h-10 ps-10 pe-8 text-xs sm:text-sm bg-[#F8FAFC] dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1769AA]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
              selectedCategory === 'All'
                ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A] dark:border-[#19B6A4]'
                : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            All Categories ({contacts.length})
          </button>
          {EMERGENCY_CATEGORIES.map((cat) => {
            const count = contacts.filter((c) => c.category === cat).length;
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                  active
                    ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A] dark:border-[#19B6A4]'
                    : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Emergency Contact Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-[#1769AA] dark:text-[#19B6A4]">
                  {contact.category}
                </span>
                {contact.verificationStatus === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-base font-extrabold text-[#10243A] dark:text-white leading-snug">
                  {contact.serviceNameEn}
                </h3>
                <p
                  data-no-translate="true"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5"
                >
                  {contact.serviceNameKo}
                </p>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {contact.descriptionEn}
              </p>

              <div className="pt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#19B6A4] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#10243A] dark:text-white">Hours:</strong>{' '}
                    {contact.operatingHours}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Globe className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#19B6A4] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#10243A] dark:text-white">Languages:</strong>{' '}
                    {contact.languagesSupported.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <a
                href={contact.dialHref || `tel:${contact.phoneNumber.replace(/[^0-9+]/g, '')}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] text-white transition-colors"
              >
                <PhoneCall className="w-4 h-4 shrink-0" />
                <span>Call {contact.phoneNumber}</span>
              </a>

              {contact.officialWebsite && (
                <a
                  href={contact.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#1769AA] transition-colors"
                  title="Official Website"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 2: IMMIGRATION OFFICE DIRECTORY — SOUTH KOREA
// ============================================================================

export const ImmigrationDirectoryModule: React.FC<{
  offices: KoreaImmigrationOffice[];
}> = ({ offices }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(offices[0]?.id || '');
  const [detailModalOffice, setDetailModalOffice] = useState<KoreaImmigrationOffice | null>(null);

  const provinces = useMemo(() => {
    const set = new Set<string>();
    offices.forEach((o) => set.add(o.province));
    return ['All', ...Array.from(set)];
  }, [offices]);

  const filteredOffices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return offices.filter((o) => {
      if (selectedProvince !== 'All' && o.province !== selectedProvince) return false;
      if (!q) return true;
      return (
        o.officeNameEn.toLowerCase().includes(q) ||
        o.officeNameKo.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.province.toLowerCase().includes(q) ||
        o.addressEn.toLowerCase().includes(q) ||
        o.jurisdictionSummary.toLowerCase().includes(q)
      );
    });
  }, [offices, selectedProvince, searchQuery]);

  const mapMarkers: MapMarkerItem[] = useMemo(
    () =>
      filteredOffices.map((o) => ({
        id: o.id,
        titleEn: o.officeNameEn,
        titleKo: o.officeNameKo,
        subtitle: o.jurisdictionSummary,
        city: o.city,
        province: o.province,
        addressEn: o.addressEn,
        addressKo: o.addressKo,
        lat: o.lat,
        lng: o.lng,
        phone: o.phoneNumber,
        officialWebsiteUrl: o.officialWebsite,
        verified: o.verificationStatus === 'VERIFIED'
      })),
    [filteredOffices]
  );

  const toVerifiedLoc = (office: KoreaImmigrationOffice): VerifiedKoreaLocation => ({
    nameEn: office.officeNameEn,
    nameKo: office.officeNameKo,
    addressEn: office.addressEn,
    addressKo: office.addressKo,
    city: office.city,
    province: office.province,
    lat: office.lat,
    lng: office.lng
  });

  return (
    <div className="space-y-6">
      {/* Mandatory Jurisdiction & 1345 Appointment Notice */}
      <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-950 dark:text-amber-100">
            <p className="font-bold text-sm">
              Important Notice: Verify Your Assigned Jurisdiction & Book a HiKorea Appointment Before Visiting
            </p>
            <p className="leading-relaxed">
              In South Korea, you must visit the specific Immigration Office that has jurisdiction over your registered residential address or university district. Walk-ins without an advance online reservation on{' '}
              <a
                href="https://www.hikorea.go.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                HiKorea.go.kr
              </a>{' '}
              are generally not accepted. Call <strong>1345</strong> (Foreigner Contact Center) if you are unsure which branch serves your district.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:1345"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#10243A] text-white dark:bg-amber-400 dark:text-[#10243A]"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 1345</span>
          </a>
          <a
            href="https://www.hikorea.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#10243A] text-[#10243A] dark:text-white border border-amber-300 dark:border-slate-700"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>HiKorea Reserve</span>
          </a>
        </div>
      </div>

      {/* Interactive South Korea Map with Naver & Kakao Deep Links */}
      <KoreaInteractiveMapCanvas
        mode="immigration"
        items={mapMarkers}
        selectedId={selectedOfficeId}
        onSelectId={setSelectedOfficeId}
      />

      {/* Search & Region Filter Bar */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
              South Korea Immigration Offices ({filteredOffices.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Search by city, province, university district (e.g., Sinchon, Dongdaemun, Busan, Suwon, Daejeon), or office name.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, district, or office..."
              className="w-full h-10 ps-10 pe-8 text-xs sm:text-sm bg-[#F8FAFC] dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1769AA]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {provinces.map((prov) => {
            const active = selectedProvince === prov;
            return (
              <button
                key={prov}
                type="button"
                onClick={() => setSelectedProvince(prov)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                  active
                    ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A] dark:border-[#19B6A4]'
                    : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {prov}
              </button>
            );
          })}
        </div>
      </div>

      {/* Office Directory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOffices.map((office) => {
          const target = toVerifiedLoc(office);
          const canMap = hasVerifiedKoreaLocation(target);

          return (
            <div
              key={office.id}
              className={`bg-white dark:bg-[#10243A] rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                selectedOfficeId === office.id
                  ? 'border-[#1769AA] dark:border-[#19B6A4] ring-2 ring-[#1769AA]/20'
                  : 'border-slate-200/90 dark:border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#1769AA]/10 dark:bg-[#19B6A4]/15 text-[#1769AA] dark:text-[#19B6A4]">
                    {office.city} · {office.province}
                  </span>
                  {office.verificationStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Office
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-[#10243A] dark:text-white">
                    {office.officeNameEn}
                  </h4>
                  <p
                    data-no-translate="true"
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5"
                  >
                    {office.officeNameKo}
                  </p>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 bg-slate-50 dark:bg-[#0B1523] p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <p>
                    <strong className="text-[#10243A] dark:text-white">Address:</strong>{' '}
                    {office.addressEn}
                  </p>
                  {office.addressKo && (
                    <p data-no-translate="true" className="text-[11px] text-slate-500">
                      {office.addressKo}
                    </p>
                  )}
                  <p>
                    <strong className="text-[#10243A] dark:text-white">Jurisdiction:</strong>{' '}
                    {office.jurisdictionSummary}
                  </p>
                  <p>
                    <strong className="text-[#10243A] dark:text-white">Hours:</strong>{' '}
                    {office.operatingHours}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                {canMap && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => openInNaverMap(target, 'place')}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold bg-[#03C75A] hover:bg-[#02b350] text-white cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>Naver Map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openInKakaoMap(target, 'place')}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold bg-[#FEE500] hover:bg-[#f5dc00] text-[#191919] cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>Kakao Map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openInNaverMap(target, 'directions')}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/70 cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 shrink-0" />
                      <span>Naver Route</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openInKakaoMap(target, 'directions')}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 shrink-0" />
                      <span>Kakao Route</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${office.phoneNumber.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#10243A] text-white dark:bg-slate-800"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{office.phoneNumber}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOfficeId(office.id);
                        setDetailModalOffice(office);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[#10243A] dark:text-slate-200 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Full Details</span>
                    </button>
                  </div>

                  <a
                    href={office.reservationUrl || office.officialWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1769AA] dark:text-[#19B6A4] hover:underline"
                  >
                    <span>HiKorea / Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Office Detail Modal */}
      {detailModalOffice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#10243A] rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#1769AA] dark:text-[#19B6A4]">
                  {detailModalOffice.city} · {detailModalOffice.province}
                </span>
                <h3 className="text-lg font-extrabold text-[#10243A] dark:text-white mt-0.5">
                  {detailModalOffice.officeNameEn}
                </h3>
                <p data-no-translate="true" className="text-xs font-semibold text-slate-500">
                  {detailModalOffice.officeNameKo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOffice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0B1523] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <p>
                <strong className="text-[#10243A] dark:text-white">English Address:</strong>{' '}
                {detailModalOffice.addressEn}
              </p>
              <p data-no-translate="true">
                <strong className="text-[#10243A] dark:text-white">Korean Address:</strong>{' '}
                {detailModalOffice.addressKo}
              </p>
              <p>
                <strong className="text-[#10243A] dark:text-white">Phone / Helpline:</strong>{' '}
                {detailModalOffice.phoneNumber} (1345 Nationwide Contact Center)
              </p>
              <p>
                <strong className="text-[#10243A] dark:text-white">Operating Hours:</strong>{' '}
                {detailModalOffice.operatingHours}
              </p>
              <p>
                <strong className="text-[#10243A] dark:text-white">Jurisdiction Coverage:</strong>{' '}
                {detailModalOffice.jurisdictionSummary}
              </p>
              <p>
                <strong className="text-[#10243A] dark:text-white">Nearest Transit:</strong>{' '}
                {detailModalOffice.nearestSubwayOrBus}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Services Provided
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {detailModalOffice.availableServices.map((svc: string) => (
                  <span
                    key={svc}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[#10243A] dark:text-slate-200"
                  >
                    {svc}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => openInNaverMap(toVerifiedLoc(detailModalOffice), 'place')}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-[#03C75A] text-white cursor-pointer"
              >
                Open in Naver Map
              </button>
              <button
                type="button"
                onClick={() => openInKakaoMap(toVerifiedLoc(detailModalOffice), 'place')}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-[#FEE500] text-[#191919] cursor-pointer"
              >
                Open in Kakao Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 3: POLICE STATION MAP — SOUTH KOREA
// ============================================================================

export const PoliceStationMapModule: React.FC<{
  stations: KoreaPoliceStation[];
}> = ({ stations }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedStationId, setSelectedStationId] = useState<string>(stations[0]?.id || '');

  const cities = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((s) => set.add(s.city));
    return ['All', ...Array.from(set)];
  }, [stations]);

  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stations.filter((s) => {
      if (selectedCity !== 'All' && s.city !== selectedCity) return false;
      if (!q) return true;
      return (
        s.stationNameEn.toLowerCase().includes(q) ||
        s.stationNameKo.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.district.toLowerCase().includes(q) ||
        s.addressEn.toLowerCase().includes(q)
      );
    });
  }, [stations, selectedCity, searchQuery]);

  const mapMarkers: MapMarkerItem[] = useMemo(
    () =>
      filteredStations.map((s) => ({
        id: s.id,
        titleEn: s.stationNameEn,
        titleKo: s.stationNameKo,
        subtitle: `${s.district}, ${s.city}`,
        city: s.city,
        province: s.province,
        addressEn: s.addressEn,
        addressKo: s.addressKo,
        lat: s.lat,
        lng: s.lng,
        phone: s.phoneNumber || '182',
        officialWebsiteUrl: s.officialWebsite,
        verified: s.verificationStatus === 'VERIFIED'
      })),
    [filteredStations]
  );

  return (
    <div className="space-y-6">
      {/* 112 Emergency Dispatch vs. 182 Non-Emergency Civil Inquiry Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#10243A] text-white rounded-2xl p-5 border border-slate-800 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400">
              <Siren className="w-4 h-4" />
              Immediate Crime & Safety Emergency
            </span>
            <h3 className="text-lg font-extrabold">Dial 112 — Korean National Police</h3>
            <p className="text-xs text-slate-300">
              24/7 emergency dispatch with 3-way foreign language interpretation.
            </p>
          </div>
          <a
            href="tel:112"
            className="px-4 py-3 rounded-xl bg-[#DC2626] hover:bg-rose-700 text-white font-black text-base font-mono shrink-0"
          >
            Call 112
          </a>
        </div>

        <div className="bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1769AA] dark:text-[#19B6A4]">
              <ShieldAlert className="w-4 h-4" />
              Non-Emergency Police & Lost Property
            </span>
            <h3 className="text-lg font-extrabold text-[#10243A] dark:text-white">
              Dial 182 — Civil Police Inquiries
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              For lost ARC/passport reports (LOST112), general consultations, and station inquiries.
            </p>
          </div>
          <a
            href="tel:182"
            className="px-4 py-3 rounded-xl bg-[#1769AA] hover:bg-[#10243A] text-white font-black text-base font-mono shrink-0"
          >
            Call 182
          </a>
        </div>
      </div>

      {/* Interactive South Korea Police Station Map */}
      <KoreaInteractiveMapCanvas
        mode="police"
        items={mapMarkers}
        selectedId={selectedStationId}
        onSelectId={setSelectedStationId}
      />

      {/* Search & City Filter */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
              Verified South Korea Police Stations & Provincial Agencies ({filteredStations.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Search by city or university district (Mapo/Hongdae, Seodaemun/Sinchon, Gwanak/SNU, Dongdaemun/KHU, Busan, Daejeon, Suwon).
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search police station, city, or district..."
              className="w-full h-10 ps-10 pe-8 text-xs sm:text-sm bg-[#F8FAFC] dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1769AA]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {cities.map((city) => {
            const active = selectedCity === city;
            return (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                  active
                    ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A] dark:border-[#19B6A4]'
                    : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>
      </div>

      {/* Police Station Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStations.map((station) => {
          const target: VerifiedKoreaLocation = {
            nameEn: station.stationNameEn,
            nameKo: station.stationNameKo,
            addressEn: station.addressEn,
            addressKo: station.addressKo,
            city: station.city,
            province: station.province,
            lat: station.lat,
            lng: station.lng
          };
          const canMap = hasVerifiedKoreaLocation(target);

          return (
            <div
              key={station.id}
              className="bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-[#10243A] dark:text-[#19B6A4]">
                    {station.city} · {station.district}
                  </span>
                  {station.verificationStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-[#10243A] dark:text-white">
                    {station.stationNameEn}
                  </h4>
                  <p
                    data-no-translate="true"
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5"
                  >
                    {station.stationNameKo}
                  </p>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-slate-50 dark:bg-[#0B1523] p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <p className="font-semibold text-[#10243A] dark:text-white">{station.addressEn}</p>
                  {station.addressKo && (
                    <p data-no-translate="true" className="text-[11px] text-slate-500">
                      {station.addressKo}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {canMap && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openInNaverMap(target, 'place')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#03C75A] hover:bg-[#02b350] text-white cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Naver Map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openInKakaoMap(target, 'place')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#FEE500] hover:bg-[#f5dc00] text-[#191919] cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Kakao Map</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <a
                    href="tel:112"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-[#DC2626] text-white"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Emergency 112</span>
                  </a>
                  <a
                    href={`tel:${station.phoneNumber.replace(/[^0-9+]/g, '')}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-[#10243A] dark:text-white"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Civil {station.phoneNumber}</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
