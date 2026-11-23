/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MarketItem, MarketCategory } from '../../types';
import {
  ShoppingBag,
  PlusCircle,
  Search,
  MapPin,
  Tag,
  User,
  Clock,
  CheckCircle2,
  X,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

export const MarketplaceSection: React.FC = () => {
  const { marketItems, addMarketItem, formatKrw, currentUser, addToast } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MarketCategory>('textbooks');
  const [newPrice, setNewPrice] = useState<number>(20000);
  const [newCondition, setNewCondition] = useState<'Like New' | 'Good' | 'Fair'>('Like New');
  const [newStation, setNewStation] = useState('Sinchon Station (Line 2)');
  const [newDescription, setNewDescription] = useState('');
  const [newNegotiable, setNewNegotiable] = useState(false);

  const filteredItems = useMemo(() => {
    return marketItems.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.locationStation.toLowerCase().includes(q);

      const matchesCat = activeCategory === 'all' || item.category === activeCategory;
      const matchesStation =
        selectedStation === 'all' || item.locationStation.toLowerCase().includes(selectedStation.toLowerCase());

      return matchesSearch && matchesCat && matchesStation;
    });
  }, [marketItems, search, activeCategory, selectedStation]);

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      addToast('Please enter an item title', 'warning');
      return;
    }

    addMarketItem({
      title: newTitle,
      category: newCategory,
      priceKrw: newCategory === 'free' ? 0 : Number(newPrice),
      condition: newCondition,
      image: '/src/assets/images/housing_seoul_room_1793616448116.jpg',
      locationStation: newStation,
      description: newDescription || 'In good condition. Available for in-person meetup at the subway exit.',
      negotiable: newNegotiable,
    });

    // Reset and close
    setNewTitle('');
    setNewDescription('');
    setShowPostModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              Campus Karrot-Style Trade
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              International Student Second-Hand Marketplace
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Buy and sell Korean textbooks, rice cookers, winter long paddings, and furniture directly with verified university peers at station exits.
            </p>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post an Item for Sale</span>
          </button>
        </div>
      </div>

      {/* Filter and Category Strip */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items (e.g. SNU Level 3, Cuckoo, Puffer, Monitor)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Station Meetup Selector */}
          <div className="md:col-span-6">
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="all">All Subway Station Meetup Spots</option>
              <option value="Sinchon">Sinchon (Line 2)</option>
              <option value="Anam">Anam (Line 6)</option>
              <option value="Wangsimni">Wangsimni (Line 2/5)</option>
              <option value="Hyehwa">Hyehwa (Line 4)</option>
              <option value="Hongik">Hongik Univ. (Line 2/AREX)</option>
              <option value="Seoul Nat">Seoul Nat’l Univ. (Line 2)</option>
            </select>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'textbooks', label: 'Textbooks (Korean & Major)' },
            { id: 'appliances', label: 'Appliances & Rice Cookers' },
            { id: 'clothing', label: 'Winter Padding & Coats' },
            { id: 'electronics', label: 'Monitors & Electronics' },
            { id: 'furniture', label: 'Furniture & Study Desks' },
            { id: 'free', label: 'Free Giveaways (₩0)' },
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

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No items match your search</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try choosing &ldquo;All Items&rdquo; or clearing your subway station filter.
          </p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setSelectedStation('all');
              setSearch('');
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reset Marketplace Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/95 text-slate-800 shadow-sm capitalize">
                      {item.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900/80 text-white backdrop-blur-xs">
                      {item.condition}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-extrabold text-blue-600 font-mono">
                      {item.priceKrw === 0 ? 'FREE (나눔)' : formatKrw(item.priceKrw)}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.postedAt}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.locationStation}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {item.sellerUniversity.split(' ')[0]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  type="button"
                  className="w-full py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat & Meetup Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Detail Modal with Glassmorphism */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-lg w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-white/60 overflow-hidden ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Peer-to-Peer Campus Listing
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="aspect-[16/10] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <div className="text-xl font-extrabold text-blue-600 font-mono">
                  {selectedItem.priceKrw === 0 ? 'FREE (나눔)' : formatKrw(selectedItem.priceKrw)}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedItem.title}
                </h3>
                <div className="flex items-center gap-2 text-slate-500 mt-1">
                  <span>Condition: <strong>{selectedItem.condition}</strong></span>
                  <span>·</span>
                  <span>Posted {selectedItem.postedAt}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Meetup Location:</div>
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>{selectedItem.locationStation}</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Seller & Item Notes:</div>
                <p className="text-slate-600 leading-relaxed">{selectedItem.description}</p>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                  {selectedItem.sellerName[0]}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{selectedItem.sellerName}</div>
                  <div className="text-[11px] text-slate-500">{selectedItem.sellerUniversity}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  addToast(`Chat request sent to ${selectedItem.sellerName} for ${selectedItem.locationStation} meetup!`, 'success');
                  setSelectedItem(null);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message Seller for Subway Meetup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post New Item Modal with Glassmorphism */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-lg w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-white/60 overflow-hidden ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-900">
                Post an Item on EveryKR Marketplace
              </h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. SNU Korean Language Level 3, Cuckoo Rice Cooker, Winter Padding..."
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="textbooks">Textbooks</option>
                    <option value="appliances">Appliances</option>
                    <option value="clothing">Winter Coats & Clothing</option>
                    <option value="electronics">Electronics & Monitors</option>
                    <option value="furniture">Furniture</option>
                    <option value="free">Free Giveaway (₩0)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="Like New">Like New (Mint)</option>
                    <option value="Good">Good (Lightly Used)</option>
                    <option value="Fair">Fair (Functional)</option>
                  </select>
                </div>
              </div>

              {newCategory !== 'free' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Price in Korean Won (₩ KRW)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Preferred Subway Station Meetup Spot
                </label>
                <input
                  type="text"
                  required
                  value={newStation}
                  onChange={(e) => setNewStation(e.target.value)}
                  placeholder="e.g. Sinchon Station Exit 2, Anam Station Exit 1..."
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Description & Details
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe included accessories, usage duration, reason for selling..."
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Publish Listing
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
