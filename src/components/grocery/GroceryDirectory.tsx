/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { groceryData } from '../../data/mockData';
import { GroceryCategory, GroceryStore } from '../../types';
import {
  Apple,
  Search,
  MapPin,
  Clock,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Truck,
} from 'lucide-react';

export const GroceryDirectory: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredStores = useMemo(() => {
    return groceryData.filter((store) => {
      const q = search.toLowerCase();
      const matchesSearch =
        store.nameEn.toLowerCase().includes(q) ||
        store.nameKr.includes(q) ||
        store.district.toLowerCase().includes(q) ||
        store.specialtyItems.some((item) => item.toLowerCase().includes(q));

      const matchesCat = activeCategory === 'all' || store.category === activeCategory;

      return matchesSearch && matchesCat;
    });
  }, [search, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
              Food & Living Necessities
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              International Grocery & Shopping Directory
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Where to find Halal meats, Asian spices, budget groceries at No Brand/Daiso, and how to shop online with Coupang before your Alien Registration Card arrives.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Showing <strong className="text-slate-900">{filteredStores.length}</strong> specialty food destinations
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores, ingredients (e.g. Halal chicken, Indomie, Basmati, Daiso, Coupang)..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Stores & Guides' },
            { id: 'halal', label: 'Halal Certified Marts' },
            { id: 'asian_import', label: 'Southeast & East Asian' },
            { id: 'budget_supermarket', label: 'No Brand & Daiso (Budget)' },
            { id: 'online_coupan', label: 'Coupang Online Tips' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStores.map((store) => (
          <div
            key={store.id}
            className="bg-white rounded-2xl border border-slate-200 hover:border-rose-400 hover:shadow-lg transition-all p-6 flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {store.nameEn}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {store.nameKr}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
                  {store.priceRating}
                </span>
              </div>

              {/* Station & District */}
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{store.nearestStation}</span>
                </div>
                <div className="text-slate-500 text-[11px] pl-5">{store.address}</div>
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] pl-5 pt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{store.operatingHours}</span>
                </div>
              </div>

              {/* Specialty Items Checklist */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  What to Buy Here:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {store.specialtyItems.map((item) => (
                    <span
                      key={item}
                      className="text-[11px] px-2 py-0.5 bg-slate-50 text-slate-700 rounded border border-slate-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pro Student Note */}
              <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-xs text-rose-900 leading-relaxed">
                <span className="font-semibold text-rose-950">Student Tip: </span>
                {store.notesForStudents}
              </div>
            </div>

            {/* Bottom rating */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Foreigner Friendly ({store.foreignerFriendlyScore}/5)</span>
              </span>
              <span className="text-[11px] text-slate-400 capitalize">{store.category.replace('_', ' ')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Online Delivery Hacks banner */}
      <div className="p-6 bg-slate-900 rounded-2xl text-white">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold">
            Online Shopping Before ARC: How to Order on Coupang & Baemin
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          International students without an ARC often struggle with Korean phone identity verification (휴대폰 본인인증).
          <strong> Solution:</strong> You can select &ldquo;Foreigner Passport Verification&rdquo; with prepaid MVNO SIM cards (Woori Mobile / Chingu Mobile), or choose &ldquo;Other Payment &rarr; KakaoPay&rdquo; to complete checkout using foreign Master/Visa credit cards!
        </p>
      </div>
    </div>
  );
};
