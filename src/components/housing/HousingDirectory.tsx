/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { HousingListing, HousingType } from '../../types';
import {
  Building2,
  MapPin,
  Heart,
  ShieldCheck,
  Check,
  Phone,
  Calendar,
  Utensils,
  Wifi,
  Search,
  X,
  MessageSquare,
  AlertTriangle,
  PlusCircle,
  Calculator,
} from 'lucide-react';

export const HousingDirectory: React.FC = () => {
  const { housing, savedHousingIds, toggleFavoriteHousing, addHousingListing, formatKrw, addToast } = useApp();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [maxRent, setMaxRent] = useState<number>(1000000);
  const [englishOnly, setEnglishOnly] = useState<boolean>(false);
  const [utilitiesIncludedOnly, setUtilitiesIncludedOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [selectedListing, setSelectedListing] = useState<HousingListing | null>(null);

  // New Listing Submission Form Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<HousingType>('goshiwon');
  const [newArea, setNewArea] = useState('Sinchon / Seodaemun-gu');
  const [newStation, setNewStation] = useState('Sinchon Station (Line 2)');
  const [newRent, setNewRent] = useState(480000);
  const [newDeposit, setNewDeposit] = useState(100000);
  const [newMaint, setNewMaint] = useState(0);
  const [newPhone, setNewPhone] = useState('010-');
  const [newDesc, setNewDesc] = useState('');

  const filteredHousing = useMemo(() => {
    return housing.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.neighborhood.toLowerCase().includes(q) ||
        item.targetUniversities.some((u) => u.toLowerCase().includes(q));

      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesArea =
        areaFilter === 'all' || item.area.toLowerCase().includes(areaFilter.toLowerCase());
      const matchesRent = item.monthlyRentKrw <= maxRent;
      const matchesEnglish = !englishOnly || item.englishSpeakingHost;
      const matchesUtilities = !utilitiesIncludedOnly || item.includesUtilities;

      return (
        matchesSearch &&
        matchesType &&
        matchesArea &&
        matchesRent &&
        matchesEnglish &&
        matchesUtilities
      );
    });
  }, [housing, search, typeFilter, areaFilter, maxRent, englishOnly, utilitiesIncludedOnly]);

  const handleListingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      addToast('Please enter a listing title', 'warning');
      return;
    }

    addHousingListing({
      title: newTitle,
      type: newType,
      area: newArea,
      neighborhood: newArea.split('/')[0].trim(),
      nearestStation: newStation,
      walkMinutesToStation: 5,
      targetUniversities: ['Local University Campuses'],
      monthlyRentKrw: Number(newRent),
      depositKrw: Number(newDeposit),
      maintenanceFeeKrw: Number(newMaint),
      image: '/src/assets/images/housing_seoul_room_1793616448116.jpg',
      gallery: ['/src/assets/images/housing_seoul_room_1793616448116.jpg'],
      genderPreference: 'All',
      amenities: ['Individual Restroom', 'Wi-Fi', 'Air Conditioner', 'Washing Machine'],
      englishSpeakingHost: true,
      includesUtilities: newMaint === 0,
      availableDate: 'Immediate',
      contactNumber: newPhone,
      description: newDesc || 'Verified student accommodation located within walking distance of university.',
    });

    setNewTitle('');
    setNewDesc('');
    setShowSubmitModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Verified Student Accommodations
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              South Korea Student Housing Directory
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Explore safe, verified goshiwons (고시원), one-rooms (원룸), officetels, and sharehouses near major Seoul university campuses with bilingual contracts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Accommodation</span>
            </button>
            <div className="text-xs text-slate-500 font-mono">
              <strong>{filteredHousing.length}</strong> available rooms
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by neighborhood or university (e.g. Sinchon, Yonsei, Anam)..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="all">All Housing Types</option>
              <option value="goshiwon">Goshiwon (Zero/Low Deposit)</option>
              <option value="oneroom">One-Room Studio</option>
              <option value="officetel">High-Rise Officetel</option>
              <option value="sharehouse">International Sharehouse</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="all">All Campus Areas</option>
              <option value="Sinchon">Sinchon (Yonsei/Ewha)</option>
              <option value="Anam">Anam (Korea Univ)</option>
              <option value="Hyehwa">Hyehwa (SKKU)</option>
              <option value="Wangsimni">Wangsimni (Hanyang)</option>
              <option value="Gangnam">Gangnam District</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-slate-500 whitespace-nowrap">Max Rent:</span>
            <input
              type="range"
              min="350000"
              max="1200000"
              step="50000"
              value={maxRent}
              onChange={(e) => setMaxRent(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <span className="font-mono font-bold text-slate-800 whitespace-nowrap">
              {formatKrw(maxRent)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 text-slate-700">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={englishOnly}
              onChange={(e) => setEnglishOnly(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>English-Speaking Landlord</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={utilitiesIncludedOnly}
              onChange={(e) => setUtilitiesIncludedOnly(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>Utilities Included in Rent (공과금 포함)</span>
          </label>
        </div>
      </div>

      {/* Housing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHousing.map((room) => {
          const isSaved = savedHousingIds.includes(room.id);
          return (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img
                    src={room.image}
                    alt={room.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    referrerPolicy="no-referrer"
                  />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/95 text-slate-900 shadow-sm capitalize">
                      {room.type}
                    </span>
                    {room.verified && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteHousing(room.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-red-500 shadow-sm transition-colors cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isSaved ? 'fill-red-500 text-red-500' : 'text-slate-600'
                      }`}
                    />
                  </button>

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-3 text-white flex items-baseline justify-between">
                    <div>
                      <div className="text-base font-extrabold font-mono">
                        {formatKrw(room.monthlyRentKrw)}
                        <span className="text-xs font-normal text-slate-300"> / mo</span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono">
                        Deposit: {formatKrw(room.depositKrw)}
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-medium text-emerald-300">
                      {room.includesUtilities ? 'Utilities Free' : `Maint: ${formatKrw(room.maintenanceFeeKrw)}`}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-2.5">
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                    {room.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{room.area}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-700 font-medium">{room.nearestStation}</span>
                    <span aria-hidden="true">·</span>
                    <span>{room.walkMinutesToStation} min walk</span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {room.description}
                  </p>

                  {room.freeFoodSupplies && room.freeFoodSupplies.length > 0 && (
                    <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[11px] text-amber-900 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-medium">Free Kitchen Supplies:</span>
                      <span className="text-amber-800 truncate">
                        {room.freeFoodSupplies.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  onClick={() => setSelectedListing(room)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>View Room & Cost Breakdown</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Accommodation Modal with Glassmorphism */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-lg w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-white/60 overflow-hidden ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-900">
                Submit Student Accommodation Listing
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleListingSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Accommodation Name</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sinchon Sunshine One-Room, Anam Ivy Goshiwon..."
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Housing Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="goshiwon">Goshiwon</option>
                    <option value="oneroom">One-Room Studio</option>
                    <option value="officetel">Officetel</option>
                    <option value="sharehouse">Sharehouse</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nearest Metro Station</label>
                  <input
                    type="text"
                    required
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    placeholder="e.g. Sinchon Station (Line 2)"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Rent (₩)</label>
                  <input
                    type="number"
                    step="10000"
                    value={newRent}
                    onChange={(e) => setNewRent(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deposit (₩)</label>
                  <input
                    type="number"
                    step="50000"
                    value={newDeposit}
                    onChange={(e) => setNewDeposit(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Maint. Fee (₩)</label>
                  <input
                    type="number"
                    step="5000"
                    value={newMaint}
                    onChange={(e) => setNewMaint(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Host Contact Phone</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Amenities</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe included furniture, kitchen amenities, English assistance..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Submit Listing for Moderation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Room & Landlord Contact Modal with Glassmorphism */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-white/60 overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedListing.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedListing.neighborhood} · {selectedListing.nearestStation} ({selectedListing.walkMinutesToStation} min walk)
                </p>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              <div className="rounded-xl overflow-hidden aspect-[16/9] border border-slate-200">
                <img
                  src={selectedListing.image}
                  alt={selectedListing.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Monthly Real Cost Breakdown */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Total Monthly Cost Breakdown for Student:</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase">Rent</div>
                    <div className="font-bold text-blue-600 font-mono mt-0.5">{formatKrw(selectedListing.monthlyRentKrw)}</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase">Deposit</div>
                    <div className="font-bold text-slate-900 font-mono mt-0.5">{formatKrw(selectedListing.depositKrw)}</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase">Maintenance</div>
                    <div className="font-bold text-slate-900 font-mono mt-0.5">
                      {selectedListing.includesUtilities ? 'Free (Included)' : formatKrw(selectedListing.maintenanceFeeKrw)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Room Description</h4>
                <p className="leading-relaxed text-slate-600">{selectedListing.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Amenities</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedListing.amenities.map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Landlord Contact Box */}
              <div className="p-4 bg-slate-900 rounded-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm">Direct Landlord Contact</div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    KakaoTalk & English consultation available
                  </div>
                  <div className="text-base font-mono font-bold text-blue-400 mt-1">
                    {selectedListing.contactNumber}
                  </div>
                </div>
                <button
                  onClick={() => {
                    addToast(`Inquiry initiated with host at ${selectedListing.contactNumber}`, 'info');
                    setSelectedListing(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs"
                >
                  Send Inquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
