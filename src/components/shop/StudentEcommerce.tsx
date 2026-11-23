/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StoreProduct, StoreProductCategory } from '../../types';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Filter,
  Star,
  Truck,
  ShieldCheck,
  Check,
  Plus,
  Minus,
  Trash2,
  X,
  CreditCard,
  MapPin,
  Sparkles,
  Flame,
  ArrowRight,
  Package,
  Snowflake,
  BedDouble,
  Utensils,
  Plug,
  Droplets,
  BookOpen,
} from 'lucide-react';

export const StudentEcommerce: React.FC = () => {
  const {
    storeProducts,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartTotalKrw,
    placeStoreOrder,
    formatKrw,
    addToast,
    currentUser,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [halalOnly, setHalalOnly] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout form
  const [checkoutForm, setCheckoutForm] = useState({
    recipientName: currentUser?.name || 'Jin Parker',
    contactPhone: currentUser?.phone || '010-8472-9102',
    deliveryAddress: 'Yonsei University Muak Dormitory Building 1, Room 304, Seoul',
    notes: 'Please leave at dormitory security desk if not in room.',
  });

  const categories: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'all', label: 'All Products', icon: ShoppingBag },
    { key: 'winter_essentials', label: 'Winter Survival', icon: Snowflake },
    { key: 'bedding', label: 'Dorm Bedding', icon: BedDouble },
    { key: 'halal_groceries', label: 'Halal Pantry', icon: ShieldCheck },
    { key: 'kitchen_appliances', label: 'Rice Cookers & Kitchen', icon: Utensils },
    { key: 'electronics', label: '220V Adapters & Tech', icon: Plug },
    { key: 'personal_care', label: 'Shower Filters & Care', icon: Droplets },
    { key: 'study_supplies', label: 'TOPIK & Study', icon: BookOpen },
  ];

  const filteredProducts = useMemo(() => {
    return storeProducts.filter((product) => {
      if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
      if (halalOnly && !product.isHalal) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesKr = product.nameKr.toLowerCase().includes(query);
        const matchesDesc = product.description.toLowerCase().includes(query);
        if (!matchesName && !matchesKr && !matchesDesc) return false;
      }
      return true;
    });
  }, [storeProducts, selectedCategory, halalOnly, search]);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutForm.deliveryAddress || !checkoutForm.recipientName) {
      addToast('Please provide your name and delivery address', 'warning');
      return;
    }
    const success = placeStoreOrder(
      checkoutForm.recipientName,
      checkoutForm.deliveryAddress,
      checkoutForm.contactPhone
    );
    if (success) {
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-900 p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <ShoppingBag className="w-3.5 h-3.5" />
              CAMPUS & DORM DELIVERY ESSENTIALS
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              EveryKR Student Store
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              Korean sub-zero winter long padding coats, single dormitory bedding, KMF Halal foods, and Korean 220V grounded adapters delivered straight to your dorm door or goshiwon room.
            </p>
          </div>

          {/* Floating Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="self-start md:self-auto relative flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white text-slate-950 font-black text-sm shadow-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span>View Cart ({totalCartCount})</span>
            {totalCartCount > 0 && (
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products: e.g. padding coat, electric pad, halal ramyun, adapter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>

          {/* Halal Toggle */}
          <button
            onClick={() => setHalalOnly(!halalOnly)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-all shrink-0 cursor-pointer ${
              halalOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Halal Certified Only</span>
            {halalOnly && <Check className="w-3.5 h-3.5 ml-1" />}
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.key
                    ? 'bg-[#0754B8] text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const discountPct = product.originalPriceKrw
            ? Math.round(((product.originalPriceKrw - product.priceKrw) / product.originalPriceKrw) * 100)
            : 0;

          return (
            <div
              key={product.id}
              className="group flex flex-col justify-between rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/80 overflow-hidden hover:border-blue-300 hover:shadow-xl transition-all duration-200"
            >
              <div>
                {/* Product Image */}
                <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {product.isHalal && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                        Halal Certified
                      </span>
                    )}
                    {discountPct > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-wider shadow-sm">
                        {discountPct}% OFF
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-slate-950/70 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-400" />
                    <span>{product.deliveryDays === 1 ? 'Next-Day Delivery' : '2-Day Delivery'}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating}</span>
                    <span className="text-slate-400 font-normal">({product.reviewsCount} reviews)</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{product.nameKr}</p>
                  <p className="text-xs text-slate-600 line-clamp-2 pt-0.5 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Features Chips */}
                  <div className="space-y-1 pt-1">
                    {product.features.slice(0, 2).map((feat, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Check className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price & Add to Cart Action */}
              <div className="p-5 pt-0 border-t border-slate-100 mt-2">
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <div className="text-base sm:text-lg font-black text-slate-900">
                      {formatKrw(product.priceKrw)}
                    </div>
                    {product.originalPriceKrw && (
                      <div className="text-xs text-slate-400 line-through">
                        {formatKrw(product.originalPriceKrw)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => addToCart(product, 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-black text-slate-900">Your Student Cart</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Your cart is empty</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Add winter coats, rice cookers, bedding, or Korean plug adapters to prepare for campus life.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 space-y-3 pt-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="pt-3 flex items-start justify-between gap-3">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200"
                      />
                      <div className="flex-1 space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.product.name}</h4>
                        <div className="text-xs font-black text-blue-700">
                          {formatKrw(item.product.priceKrw)}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold px-1">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Estimated Campus Delivery:</span>
                  <span className="font-bold text-emerald-600">FREE Rocket Shipping</span>
                </div>
                <div className="flex items-center justify-between text-base font-black text-slate-900">
                  <span>Total KRW:</span>
                  <span>{formatKrw(cartTotalKrw)}</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Campus Delivery</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Campus Delivery Checkout</h3>
                <p className="text-xs text-slate-500">Direct courier delivery to student dormitories and goshiwons across Korea</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                aria-label="Close checkout"
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteOrder} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  required
                  value={checkoutForm.recipientName}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, recipientName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Korean Mobile Contact</label>
                <input
                  type="text"
                  required
                  value={checkoutForm.contactPhone}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dormitory / Goshiwon Address</label>
                <textarea
                  rows={2}
                  required
                  value={checkoutForm.deliveryAddress}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Order Summary box */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Order Total ({totalCartCount} items):</span>
                  <span className="text-blue-900 font-black">{formatKrw(cartTotalKrw)}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Free next-day student courier shipping included.
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                >
                  Place Order Now ({formatKrw(cartTotalKrw)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
