/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Luggage,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Zap,
  ShieldAlert,
  ShoppingBag,
  DollarSign,
  FileCheck,
  ThermometerSnowflake,
  Shirt,
  Sparkles,
  ExternalLink,
  Info,
  Layers,
  ArrowRight,
  Plug,
  Flame,
  Ban,
  XCircle,
} from 'lucide-react';

export const ArrivalPrepGuide: React.FC = () => {
  const { arrivalChecklists, completedChecklistIds, toggleChecklistItem, formatKrw, setActiveSection, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'checklists' | 'electronics' | 'customs' | 'budget'>('checklists');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Multi-Currency Arrival Budget Calculator State
  const [currency, setCurrency] = useState<'KRW' | 'USD' | 'BDT' | 'NPR' | 'PKR' | 'INR'>('KRW');
  const [exchangeRates] = useState<Record<string, number>>({
    KRW: 1,
    USD: 0.00074,     // 1 KRW = ~0.00074 USD (1 USD = ~1350 KRW)
    BDT: 0.089,       // 1 KRW = ~0.089 BDT
    NPR: 0.099,       // 1 KRW = ~0.099 NPR
    PKR: 0.208,       // 1 KRW = ~0.208 PKR
    INR: 0.062,       // 1 KRW = ~0.062 INR
  });

  const currencySymbols: Record<string, string> = {
    KRW: '₩',
    USD: '$',
    BDT: '৳',
    NPR: 'Rs.',
    PKR: '₨',
    INR: '₹',
  };

  const [budgetItems, setBudgetItems] = useState([
    { id: 'b1', name: 'Alien Registration Card (ARC) Immigration Fee', costKrw: 30000, category: 'Immigration & Legal' },
    { id: 'b2', name: 'Tuberculosis (TB) Test at Korean Public Health Center (보건소)', costKrw: 15000, category: 'Health' },
    { id: 'b3', name: 'Korean Prepaid SIM Card / eSIM (Unlimited Data 30 Days)', costKrw: 39600, category: 'Telecom' },
    { id: 'b4', name: 'Incheon Airport AREX Express Train to Seoul Station', costKrw: 11000, category: 'Transit' },
    { id: 'b5', name: 'T-Money / Climate Card + Initial Transit Transit Balance', costKrw: 65000, category: 'Transit' },
    { id: 'b6', name: 'Dormitory Bedding Set & Single Quilt (차렵이불 세트)', costKrw: 45000, category: 'Living Essentials' },
    { id: 'b7', name: 'Dormitory Key Deposit (Refundable upon checkout)', costKrw: 100000, category: 'Housing' },
    { id: 'b8', name: 'First Month Food & Groceries (Campus cafeteria + home cooking)', costKrw: 450000, category: 'Food' },
    { id: 'b9', name: 'Korean Winter Down Padding Coat (If arriving in Fall/Winter)', costKrw: 89000, category: 'Clothing' },
    { id: 'b10', name: 'Shower Filter + Korean 220V Grounded Adapters', costKrw: 31800, category: 'Living Essentials' },
  ]);

  const totalBudgetKrw = budgetItems.reduce((sum, item) => sum + item.costKrw, 0);

  const formatConverted = (krw: number) => {
    const rate = exchangeRates[currency] || 1;
    const value = Math.round(krw * rate);
    return `${currencySymbols[currency]} ${value.toLocaleString()}`;
  };

  const filteredChecklists = arrivalChecklists.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (genderFilter === 'male' && item.category === 'clothing_female') return false;
    if (genderFilter === 'female' && item.category === 'clothing_male') return false;
    return true;
  });

  const completedCount = arrivalChecklists.filter((item) => completedChecklistIds.includes(item.id)).length;
  const progressPercent = Math.round((completedCount / arrivalChecklists.length) * 100);

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-400/30">
            <Luggage className="w-3.5 h-3.5 text-blue-300" />
            OFFICIAL KOREA ARRIVAL HUB
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Coming to Korea? Everything You Need to Prepare.
          </h1>
          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            The definitive newcomer guide: 4-season wardrobe piece counts, voltage and 220V safety precautions, strict quarantine customs bans, and your multi-currency initial settlement budget calculator.
          </p>

          {/* Progress Tracker Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>Your Arrival Readiness Checklist</span>
              <span className="text-blue-400 font-bold">{completedCount} of {arrivalChecklists.length} Tasks Ready ({progressPercent}%)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/60 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-4">
        <button
          onClick={() => setActiveTab('checklists')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
            activeTab === 'checklists'
              ? 'bg-blue-600 text-white shadow-blue-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Interactive Packing Checklists
        </button>

        <button
          onClick={() => setActiveTab('electronics')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
            activeTab === 'electronics'
              ? 'bg-blue-600 text-white shadow-blue-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          220V Voltage & Electronics Safety
        </button>

        <button
          onClick={() => setActiveTab('customs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
            activeTab === 'customs'
              ? 'bg-blue-600 text-white shadow-blue-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          Strict Customs & Food Quarantine
        </button>

        <button
          onClick={() => setActiveTab('budget')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
            activeTab === 'budget'
              ? 'bg-blue-600 text-white shadow-blue-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-500" />
          Multi-Currency Arrival Budget
        </button>
      </div>

      {/* TAB 1: INTERACTIVE PACKING CHECKLISTS */}
      {activeTab === 'checklists' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Category:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Categories
              </button>
              <button
                onClick={() => setSelectedCategory('clothing_male')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === 'clothing_male' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Men's Wardrobe
              </button>
              <button
                onClick={() => setSelectedCategory('clothing_female')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === 'clothing_female' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Women's Wardrobe
              </button>
              <button
                onClick={() => setSelectedCategory('documents')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === 'documents' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Original Documents
              </button>
              <button
                onClick={() => setSelectedCategory('electronics')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === 'electronics' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Electronics
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Gender Filter:</span>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-800 outline-none"
              >
                <option value="all">Show All</option>
                <option value="male">Male Student</option>
                <option value="female">Female Student</option>
              </select>
            </div>
          </div>

          {/* Checklist Items Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChecklists.map((item) => {
              const isDone = completedChecklistIds.includes(item.id);
              const isMust = item.importance === 'Must Have';

              return (
                <div
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`cursor-pointer group relative overflow-hidden rounded-3xl p-5 border transition-all duration-200 backdrop-blur-md ${
                    isDone
                      ? 'bg-slate-50/90 border-slate-200 opacity-75'
                      : 'bg-white/95 border-slate-200/80 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isDone ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 group-hover:border-blue-500'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-4 h-4" />}
                    </button>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4
                          className={`text-sm sm:text-base font-bold transition-all ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-blue-700'
                          }`}
                        >
                          {item.name}
                        </h4>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isMust ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {item.importance}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          Qty: {item.recommendedQuantity}
                        </span>
                        {item.season && (
                          <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px]">
                            {item.season}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        {item.tip}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 220V ELECTRONICS & VOLTAGE GUIDE */}
      {activeTab === 'electronics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rule 1: Sockets & Pins */}
            <div className="bg-white/95 dark:bg-[#0B1D44] rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Plug className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#061B49] dark:text-white">Type C &amp; Type F (4.8mm Round Pins)</h3>
              <p className="text-xs text-slate-600 dark:text-[#B8C9E5] leading-relaxed">
                South Korea uses <strong>Type C</strong> (two round pins) and <strong>Type F</strong> (Schuko, with two side grounding clips).
              </p>
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <span className="font-bold">Crucial Pin Thickness:</span>
                <p className="text-[11px]">
                  European plugs often have 4.0mm thin pins. Korean sockets require <strong>4.8mm thick pins</strong>. Thin European plugs fit loosely and can cause electrical arcing and sparks.
                </p>
              </div>
            </div>

            {/* Rule 2: 220V 60Hz Voltage */}
            <div className="bg-white/95 dark:bg-[#0B1D44] rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="w-11 h-11 rounded-xl bg-[#0754B8]/10 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#061B49] dark:text-white">220V at 60Hz Frequency</h3>
              <p className="text-xs text-slate-600 dark:text-[#B8C9E5] leading-relaxed">
                Look at the tiny label on your charger or power brick:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25 font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <span><strong>INPUT: 100V–240V, 50/60Hz:</strong> Safe! Laptops, MacBooks, iPhones, Samsung phones are 100% compatible.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/25 font-medium flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span><strong>INPUT: 110V or 120V only:</strong> DANGER! Do not plug directly into Korean sockets or it will short-circuit immediately.</span>
                </div>
              </div>
            </div>

            {/* Rule 3: High-Draw Heating Appliances */}
            <div className="bg-white/95 dark:bg-[#0B1D44] rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Leave Hair Dryers & Irons at Home</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hair dryers, hair curlers, and electric kettles draw 1,200W to 2,000W of heavy current.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Small travel plug converters cannot safely handle high thermal wattage. Buy an inexpensive ₩15,000–₩20,000 Korean hairdryer at Daiso or EveryKR Store upon arrival.
              </p>
              <button
                onClick={() => setActiveSection('shop')}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Browse Korean 220V Electronics in Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STRICT CUSTOMS & FOOD QUARANTINE LAWS */}
      {activeTab === 'customs' && (
        <div className="space-y-6">
          <div className="bg-rose-50/80 border border-rose-200 rounded-3xl p-6 sm:p-8 space-y-4 text-rose-950">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-rose-950">
                  Animal & Plant Quarantine Agency (QIA) Strict Warning
                </h3>
                <p className="text-xs text-rose-800">
                  Heavy on-the-spot fines up to ₩10,000,000 KRW ($7,500 USD) and entry visa cancellation for undeclared items.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Strictly Banned */}
              <div className="bg-white rounded-2xl p-5 border border-rose-200 space-y-3">
                <h4 className="text-sm font-extrabold text-rose-700 flex items-center gap-2">
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>STRICTLY PROHIBITED (DO NOT BRING)</span>
                </h4>
                <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
                  <li><strong>All Pork Products:</strong> Pork sausages, bacon, ham, jerky, canned pork (Strict African Swine Fever prevention).</li>
                  <li><strong>All Beef, Lamb &amp; Poultry:</strong> Beef jerky, biltong, dried duck, chicken sausages.</li>
                  <li><strong>Instant Noodles with Meat:</strong> Any ramen with dehydrated real meat pieces or meat extract powder.</li>
                  <li><strong>Fresh Fruits &amp; Vegetables:</strong> Apples, mangoes, citrus, fresh chilies, raw seeds, live plants.</li>
                  <li><strong>Dairy &amp; Eggs:</strong> Raw milk, raw cheese, balut, unpasteurized poultry products.</li>
                </ul>
              </div>

              {/* Permitted Commercially Packed */}
              <div className="bg-white rounded-2xl p-5 border border-emerald-200 space-y-3">
                <h4 className="text-sm font-extrabold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>PERMITTED (COMMERCIALLY SEALED ONLY)</span>
                </h4>
                <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
                  <li><strong>Commercially Factory-Sealed Spices:</strong> Turmeric, garam masala, chili powder in sealed supermarket brand packaging.</li>
                  <li><strong>Packaged Dry Tea & Coffee:</strong> Black tea bags, coffee beans in sealed foil packs.</li>
                  <li><strong>Chocolates & Biscuits:</strong> Commercially wrapped snack foods.</li>
                  <li><strong>Prescription Medications:</strong> In original packaging with doctor's English prescription note (max 3-month supply).</li>
                </ul>
              </div>
            </div>

            {/* Quarantine Beagle Sniffer Dogs Warning */}
            <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-4 text-xs text-amber-950 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Incheon Airport Sniffer Beagles:</strong> Specially trained agricultural detection dogs patrol the baggage claim carousels. They will detect even vacuum-sealed meat in suitcases. Always fill out the yellow Quarantine Declaration card truthfully. If in doubt, declare it to the officer; declared items are simply confiscated without a fine.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MULTI-CURRENCY ARRIVAL BUDGET CALCULATOR */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Settlement Estimator</span>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  First 30 Days Korea Settlement Budget
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Realistic itemized breakdown of mandatory initial expenses upon landing in South Korea.
                </p>
              </div>

              {/* Currency Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 shrink-0">
                {(['KRW', 'USD', 'BDT', 'NPR', 'PKR', 'INR'] as const).map((cur) => (
                  <button
                    key={cur}
                    onClick={() => setCurrency(cur)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currency === cur ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Budget Hero Callout */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div>
                <span className="text-xs font-medium text-blue-200 uppercase tracking-wide">
                  Estimated Total Settlement Cost
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                  {formatConverted(totalBudgetKrw)}
                </div>
                <span className="text-xs text-slate-300 font-normal mt-0.5 block">
                  Equivalent to approximately {formatKrw(totalBudgetKrw)} KRW
                </span>
              </div>
              <div className="text-xs text-slate-300 sm:text-right max-w-xs leading-relaxed">
                Includes mandatory ARC registration, dormitory deposit, SIM card, bedding, and initial transit passes.
              </div>
            </div>

            {/* Itemized Table */}
            <div className="space-y-2.5">
              <h4 className="text-sm font-bold text-slate-900">Itemized Initial Expenses Breakdown</h4>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Expense Item</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Cost (KRW)</th>
                      <th className="py-3 px-4 text-right">In {currency}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {budgetItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                        <td className="py-3 px-4 text-slate-500">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {formatKrw(item.costKrw)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-900">
                          {formatConverted(item.costKrw)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-slate-900">Total Settlement Budget</td>
                      <td className="py-3 px-4 text-right text-slate-900">{formatKrw(totalBudgetKrw)}</td>
                      <td className="py-3 px-4 text-right text-blue-700 text-sm">{formatConverted(totalBudgetKrw)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
