/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { transitGuidesData } from '../../data/mockData';
import { HospitalClinic } from '../../types';
import {
  HeartPulse,
  Train,
  CreditCard,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Search,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const TransitHealthSection: React.FC = () => {
  const { healthcareCenters, formatKrw } = useApp();
  const [activeTab, setActiveTab] = useState<'healthcare' | 'transit'>('healthcare');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [emergencyOnly, setEmergencyOnly] = useState<boolean>(false);

  const filteredHealthcare = useMemo(() => {
    return healthcareCenters.filter((h) => {
      const q = search.toLowerCase();
      const matchesSearch =
        h.nameEn.toLowerCase().includes(q) ||
        h.nameKr.includes(q) ||
        h.region.toLowerCase().includes(q) ||
        h.languagesSupported.some((l) => l.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'all' || h.category === categoryFilter;
      const matchesEmerg = !emergencyOnly || h.weekendEmergencyAvailable;

      return matchesSearch && matchesCat && matchesEmerg;
    });
  }, [healthcareCenters, search, categoryFilter, emergencyOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
              Public Infrastructure & Well-being
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              South Korea Transportation & Healthcare Center
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Find English-speaking university hospitals, clinics with National Health Insurance (NHIS) coverage, 24-hour pharmacies, and high-speed KTX transit passes.
            </p>
          </div>

          {/* Segmented Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs shrink-0">
            <button
              onClick={() => setActiveTab('healthcare')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'healthcare'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Hospitals & Clinics</span>
            </button>
            <button
              onClick={() => setActiveTab('transit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'transit'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Train className="w-4 h-4" />
              <span>KTX & Subway Guides</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'healthcare' ? (
        <div className="space-y-6">
          {/* Medical Notice */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-950">
            <HeartPulse className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">National Health Insurance (NHIS) International Desk:</span>
              <p className="text-rose-900 leading-relaxed text-[11px] mt-0.5">
                All degree-seeking D-2 international students are enrolled in mandatory National Health Insurance. Clinic visits with regular doctors cost approx ₩4,000–₩7,000. In life-threatening emergencies, dial <strong>119</strong> for immediate English paramedic assistance.
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 text-xs">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search hospitals by name, language (English, Arabic, Russian), or station..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="all">All Medical Categories</option>
                <option value="General Hospital">General University Hospital</option>
                <option value="Dental">Dental Clinic</option>
                <option value="Pharmacy">Late Night Pharmacy</option>
              </select>

              <label className="flex items-center gap-1.5 whitespace-nowrap text-slate-700 font-medium cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={emergencyOnly}
                  onChange={(e) => setEmergencyOnly(e.target.checked)}
                  className="rounded text-rose-600"
                />
                <span>24h / Weekend Emergency</span>
              </label>
            </div>
          </div>

          {/* Healthcare Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHealthcare.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-rose-400 hover:shadow-md transition-all p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-rose-600 uppercase">
                      {item.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {item.nameEn}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">{item.nameKr}</div>
                  </div>
                  {item.foreignerDeskAvailable && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 shrink-0">
                      Foreigner Clinic
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.address} ({item.nearestStation})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">{item.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.operatingHours}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Languages Supported:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.languagesSupported.map((lang) => (
                      <span
                        key={lang}
                        className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-700 rounded"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Student Guide: </strong>
                  {item.notes}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Transportation Sub-view */
        <div className="space-y-8">
          {/* Card Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">
                Seoul Climate Card (기후동행카드) vs. T-Money
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Unlimited 30-day subway & bus pass: Youth tier costs ₩55,000/month.
              </p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="font-bold text-blue-900 text-sm">Climate Card (Youth)</div>
                <div className="text-base font-extrabold text-blue-700 font-mono">₩55,000 / mo</div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Unlimited rides across all Seoul subway lines 1–9 and city buses. Pays for itself after ~37 rides.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">Standard T-Money Card</div>
                <div className="text-base font-extrabold text-slate-800 font-mono">₩1,400 / ride</div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Universal nationwide card accepted in all cities (Seoul, Busan, Daegu, Jeju). Rechargeable at all convenience stores.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">Korail Youth (힘내라 청춘)</div>
                <div className="text-base font-extrabold text-emerald-700 font-mono">10% - 40% Off</div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Available for students aged 25–33 on KTX high-speed bullet trains. Register once on the Korail Talk website.
                </p>
              </div>
            </div>
          </div>

          {/* KTX Routes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transitGuidesData.map((route) => (
              <div
                key={route.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-slate-900 text-base">{route.title}</h4>
                  {route.tag && (
                    <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {route.tag}
                    </span>
                  )}
                </div>
                {route.summary && <p className="text-xs text-slate-600 leading-relaxed">{route.summary}</p>}
                <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                  {(route.keyTips || route.tips || []).map((tip: string, i: number) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
