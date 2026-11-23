/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { transitGuidesData } from '../../data/mockData';
import {
  Train,
  CreditCard,
  Moon,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const TransitGuide: React.FC = () => {
  const { formatKrw } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'ktx' | 'card_guide' | 'bus' | 'subway'>('all');

  const filteredGuides = activeTab === 'all'
    ? transitGuidesData
    : transitGuidesData.filter((g) => g.category === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
              Korail & Seoul Metro Navigator
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              South Korea Bus, Subway & KTX Transportation Guide
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Master Korea’s world-class transit system: Korail youth bullet-train discounts, Climate Card (기후동행카드) monthly passes, late-night Owl Buses, and transfer rules.
            </p>
          </div>
          <a
            href="https://www.letskorail.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <span>Official Korail Talk</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Direct Ticket Booking Quick Access Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-2">
              <Train className="w-3.5 h-3.5" />
              OFFICIAL RAIL & BUS BOOKING PORTALS
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Instant Ticket Search & Official Booking
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Foreigners can book tickets with foreign credit cards (Visa/Mastercard) without requiring Korean identity verification.
            </p>
          </div>
        </div>

        {/* 4 Official Providers Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KTX */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-blue-300 text-sm">KTX / KORAIL</span>
                <span className="text-[10px] font-bold bg-blue-600/60 px-2 py-0.5 rounded text-white">Up to 300 km/h</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Seoul & Yongsan Station to Busan, Dongdaegu, Daejeon, Gangneung, Jeonju, Mokpo.
              </p>
            </div>
            <a
              href="https://www.letskorail.com/ebizbf/EbizBfTicketSearch.do"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Book KTX Online</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* SRT */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-purple-300 text-sm">SRT (Suseo Gangnam)</span>
                <span className="text-[10px] font-bold bg-purple-600/60 px-2 py-0.5 rounded text-white">10% Cheaper</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Departs directly from Suseo Station in Gangnam to Busan, Daegu, and Gwangju.
              </p>
            </div>
            <a
              href="https://etk.srail.kr/main.do"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Book SRT Online</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* KOBUS Express */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-300 text-sm">KOBUS (Express Bus)</span>
                <span className="text-[10px] font-bold bg-emerald-600/60 px-2 py-0.5 rounded text-white">Premium Recliner</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Seoul Express Bus Terminal (Gyeongbu/Honam) to all major cities nationwide.
              </p>
            </div>
            <a
              href="https://www.kobus.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Book KOBUS Bus</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Bustago Intercity */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 hover:bg-white/15 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-300 text-sm">Bustago (Intercity Bus)</span>
                <span className="text-[10px] font-bold bg-amber-600/60 px-2 py-0.5 rounded text-white">Rural Towns</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Connects East Seoul (Dongseoul) & Nambu terminals to smaller university towns.
              </p>
            </div>
            <a
              href="https://www.bustago.or.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Book Bustago Bus</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Transit Card Comparison Table (Highlight Feature) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-900 text-white">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold">
              Korean Transit Card Comparison Matrix (2026/2027)
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            Choose the right card to save ₩30,000 to ₩60,000 every single month as an international student.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Card Feature</th>
                <th className="py-3 px-4 text-blue-700 bg-blue-50/50">Climate Card (기후동행카드)</th>
                <th className="py-3 px-4">Standard T-Money</th>
                <th className="py-3 px-4">K-Pass (K-패스)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Cost Structure</td>
                <td className="py-3.5 px-4 font-bold text-blue-700 bg-blue-50/30">
                  ₩55,000 / month (Youth Tier)
                </td>
                <td className="py-3.5 px-4 font-mono">₩1,400 - ₩1,500 per ride</td>
                <td className="py-3.5 px-4 font-mono">30% Cashback on 15+ rides</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Coverage Zone</td>
                <td className="py-3.5 px-4 text-slate-800 bg-blue-50/30">
                  All Seoul Metro Lines 1-9 & Seoul City Buses
                </td>
                <td className="py-3.5 px-4">Nationwide (All cities)</td>
                <td className="py-3.5 px-4">Nationwide + Gyeonggi Red Buses</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Foreigner Setup</td>
                <td className="py-3.5 px-4 bg-blue-50/30">
                  Buy physical card at station (₩3,000 cash). Easy setup!
                </td>
                <td className="py-3.5 px-4">Buy at any GS25 / CU without ID</td>
                <td className="py-3.5 px-4 text-amber-700">
                  Requires ARC card + Korean bank account
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Recommended For</td>
                <td className="py-3.5 px-4 font-semibold text-blue-800 bg-blue-50/30">
                  Students living and studying in Seoul (Yonsei, SNU, Korea Univ, SKKU)
                </td>
                <td className="py-3.5 px-4">
                  Incoming exchange students staying 1-2 months
                </td>
                <td className="py-3.5 px-4">
                  Students commuting from Incheon/Suwon/Gyeonggi
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto text-xs">
        {[
          { id: 'all', label: 'All Transit Guides' },
          { id: 'ktx', label: 'KTX & Bullet Trains' },
          { id: 'card_guide', label: 'Transit Cards' },
          { id: 'bus', label: 'Buses & Night Owl' },
          { id: 'subway', label: 'Subway Etiquette' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Guide Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGuides.map((guide) => (
          <div
            key={guide.id}
            className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all p-6 flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {guide.title}
                </h3>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                  {guide.tag}
                </span>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                {guide.summary}
              </p>

              {/* Transit specifics if KTX */}
              {guide.category === 'ktx' && guide.estimatedPriceKrw && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-center mb-4">
                  <div>
                    <div className="text-[10px] text-amber-800 uppercase font-semibold">Travel Time</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {Math.floor((guide.durationMinutes || 0) / 60)}h {(guide.durationMinutes || 0) % 60}m
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-amber-800 uppercase font-semibold">Standard Fare</div>
                    <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                      {formatKrw(guide.estimatedPriceKrw)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-amber-800 uppercase font-semibold">Youth Discount</div>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5">
                      Up to {guide.korailYouthDiscountPercent}% Off
                    </div>
                  </div>
                </div>
              )}

              {/* Pro Tips List */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Important Student Tips:
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {(guide.keyTips || guide.tips || []).map((tip: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>Use KakaoMap for live English routing</span>
              </span>
              <span className="text-[11px]">Free English UI</span>
            </div>
          </div>
        ))}
      </div>

      {/* Transit Map & Navigation Tips Callout */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 lg:p-8">
        <h3 className="text-base font-bold text-slate-900 mb-2">
          3 Essential Navigation Rules for Foreigners in South Korea
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 mt-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 mb-1">1. Google Maps Has Limitations</div>
            <p className="leading-relaxed">
              Due to Korean national security spatial data regulations, Google Maps cannot provide full walking turn-by-turn directions. Always download <strong>KakaoMap</strong> or <strong>Naver Map</strong> for accurate bus arrival GPS.
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 mb-1">2. 30-Minute Free Transfer Rule</div>
            <p className="leading-relaxed">
              Always tap your card when getting off a bus or subway! You receive free or discounted transfers when boarding the next bus or train within 30 minutes (extended to 60 minutes after 9:00 PM).
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 mb-1">3. Lost & Found Center</div>
            <p className="leading-relaxed">
              If you leave something on the subway, note the train car number on the door (e.g. 2-3) and time immediately. Seoul Metro Lost & Found Center recovers 95%+ of items within 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
