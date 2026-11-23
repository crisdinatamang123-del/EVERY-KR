import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MarketplaceItem } from '../types';
import { RecaptchaCheckbox } from './security/RecaptchaCheckbox';
import marketplaceFallbackImg from '../assets/images/housing_seoul_room_1793616448116.jpg';
import {
  Search,
  MapPin,
  PlusCircle,
  ShieldAlert,
  X,
  Send,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface MarketplaceModuleProps {
  isFullPage?: boolean;
}

export const MarketplaceModule: React.FC<MarketplaceModuleProps> = ({ isFullPage = false }) => {
  const {
    marketplaceItems,
    setIsCreateMarketplaceModalOpen,
    showToast,
    setActivePage,
    t
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');

  // Contact seller modal
  const [activeItemForContact, setActiveItemForContact] = useState<MarketplaceItem | null>(null);
  const [buyerMsg, setBuyerMsg] = useState('Hi! Is this still available? Can we meet around Sinchon Station?');
  const [contactSent, setContactSent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [recaptchaResetSignal, setRecaptchaResetSignal] = useState(0);
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  const categories = [
    'All',
    'Laptops & Electronics',
    'Mobile Phones',
    'Books & Study Materials',
    'Furniture',
    'Household Items',
    'Bicycles'
  ];

  const filteredItems = useMemo(() => {
    return marketplaceItems.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchCity = selectedCity === 'All' || item.city === selectedCity;
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchCity && matchSearch;
    });
  }, [marketplaceItems, searchQuery, selectedCategory, selectedCity]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForContact) return;

    setInquiryError(null);
    setRecaptchaError(null);

    const trimmedMsg = buyerMsg.trim();
    if (trimmedMsg.length < 3) {
      setInquiryError('Please enter a message for the seller.');
      return;
    }

    if (!recaptchaToken && !honeypot.trim()) {
      const msg = t('recaptcha_required_error');
      setRecaptchaError(msg);
      setInquiryError(msg);
      return;
    }

    setIsSendingInquiry(true);
    try {
      const verifyRes = await fetch('/api/marketplace/verify-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionType: 'inquiry',
          itemId: activeItemForContact.id,
          message: trimmedMsg,
          honeypot,
          recaptchaToken
        })
      });

      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok || !verifyData?.ok) {
        const errMsg =
          verifyData?.message ||
          'Security verification failed or is temporarily unavailable. Inquiry was not sent.';
        setInquiryError(errMsg);
        showToast(errMsg);
        return;
      }

      setContactSent(true);
      showToast(`Inquiry sent to seller ${activeItemForContact.sellerName}`);
    } catch {
      const netMsg =
        'Unable to reach security verification server. Inquiry submission was blocked.';
      setInquiryError(netMsg);
      showToast(netMsg);
    } finally {
      setIsSendingInquiry(false);
      setRecaptchaToken('');
      setRecaptchaResetSignal((prev) => prev + 1);
    }
  };

  return (
    <section className={`bg-transparent text-[#10213D] dark:text-white ${isFullPage ? 'py-10 sm:py-14' : 'py-16'} border-b border-white/40 dark:border-white/10 transition-colors`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation when full page */}
        {isFullPage && (
          <nav className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5] mb-4">
            <button
              onClick={() => setActivePage('home')}
              className="hover:text-[#10213D] dark:hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <span className="text-[#0754B8] dark:text-[#60A5FA] font-semibold">Category 8 • Campus Marketplace</span>
          </nav>
        )}

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">
              Student-to-Student Trading
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10213D] dark:text-white tracking-tight mt-1">
              Used Goods & Student Marketplace
            </h2>
            <p className="text-sm text-[#526685] dark:text-[#B8C9E5] mt-1 max-w-2xl">
              Buy and sell laptops, textbooks, furniture, appliances, and winter coats directly with verified university students leaving or entering Korea.
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <button
              onClick={() => setIsCreateMarketplaceModalOpen(true)}
              className="ekr-glass-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Sell an Item</span>
            </button>

            {!isFullPage && (
              <button
                onClick={() => setActivePage('marketplace')}
                className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:text-[#10213D] dark:hover:text-white underline underline-offset-4 cursor-pointer"
              >
                View all items →
              </button>
            )}
          </div>
        </div>

        {/* Scam Warning & Liability Disclaimer */}
        <div className="bg-amber-50/70 dark:bg-amber-950/35 backdrop-blur-md border border-amber-300/60 dark:border-amber-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold">Marketplace Safety Guidelines: </strong>
            EVERYKR is an open student classifieds platform and does not process payments or guarantee transactions between private parties. Always meet in safe, well-lit campus public areas (e.g. subway station exits or university student centers) and inspect items before paying cash or bank transfer. <em>Never send prepaid deposits to unverified individuals.</em>
          </div>
        </div>

        {/* Filter controls */}
        <div className="ekr-glass-panel p-4 rounded-2xl mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items (e.g. MacBook, TOPIK books, desk, heater)..."
                className="ekr-glass-input w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="ekr-glass-input w-full px-3 py-2 text-xs sm:text-sm rounded-xl"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-[#0B204A]">{c}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="ekr-glass-input w-full px-3 py-2 text-xs sm:text-sm rounded-xl"
              >
                <option value="All" className="bg-white dark:bg-[#0B204A]">All Cities</option>
                <option value="Seoul" className="bg-white dark:bg-[#0B204A]">Seoul</option>
                <option value="Busan" className="bg-white dark:bg-[#0B204A]">Busan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="ekr-glass-card rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-slate-200/50 dark:bg-white/5 overflow-hidden">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (img.src !== marketplaceFallbackImg) img.src = marketplaceFallbackImg;
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5 bg-white/85 dark:bg-[#061B49]/85 text-[#10213D] dark:text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md">
                    {item.condition}
                  </div>
                  <div className="absolute top-2.5 right-2.5 bg-[#061B49]/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md">
                    {item.status}
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-[11px] text-[#0754B8] dark:text-[#60A5FA] font-semibold">{item.category}</div>
                  <h3 className="text-sm font-bold text-[#10213D] dark:text-white mt-0.5 line-clamp-2 leading-snug">
                    {item.title}
                  </h3>

                  <div className="mt-2 text-base font-extrabold text-[#10213D] dark:text-white font-mono tabular-nums">
                    ₩{item.priceKRW.toLocaleString()} KRW
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-[11px] text-[#526685] dark:text-[#B8C9E5]">
                    <MapPin className="w-3 h-3 opacity-70" />
                    <span>{item.location} ({item.city})</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="p-3 bg-white/35 dark:bg-white/5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#526685] dark:text-[#B8C9E5]">{item.postedDate}</span>
                <button
                  onClick={() => {
                    setActiveItemForContact(item);
                    setContactSent(false);
                    setInquiryError(null);
                    setRecaptchaError(null);
                    setRecaptchaToken('');
                  }}
                  className="ekr-glass-btn-primary px-3 py-1.5 font-semibold text-white rounded-lg transition-all cursor-pointer"
                >
                  Contact Seller
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Contact Seller Modal */}
      {activeItemForContact && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg ekr-glass-modal rounded-2xl overflow-hidden my-8 animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-200/60 dark:border-white/12 flex items-center justify-between bg-white/40 dark:bg-white/5">
              <div>
                <h3 className="text-base font-bold text-[#10213D] dark:text-white">Inquire About Listing</h3>
                <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                  {activeItemForContact.title} (₩{activeItemForContact.priceKRW.toLocaleString()} KRW)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveItemForContact(null)}
                className="p-1.5 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white rounded-lg cursor-pointer transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 ekr-glass-subtle rounded-xl text-xs text-[#10213D] dark:text-[#DCE8FA] space-y-1">
                <div><strong>Seller: </strong> {activeItemForContact.sellerName}</div>
                <div>
                  <strong>Direct ID / Phone: </strong>{' '}
                  <span className="font-mono text-[#0754B8] dark:text-[#60A5FA] font-bold">
                    {activeItemForContact.sellerContact}
                  </span>
                </div>
                <div><strong>Preferred Meetup Location: </strong> {activeItemForContact.location}</div>
              </div>

              {contactSent ? (
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-100 rounded-xl text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <strong>Message Sent!</strong>
                    <p className="mt-0.5">
                      The seller has received your inquiry notification. You can also message them directly via {activeItemForContact.sellerContact}.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3" noValidate>
                  <input
                    type="text"
                    name="website_hp"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                  />

                  {inquiryError && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-rose-50/85 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span>{inquiryError}</span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="everykr-mkt-inquiry-msg"
                      className="block text-xs font-semibold text-[#10213D] dark:text-[#DCE8FA] mb-1"
                    >
                      Your Message to Seller
                    </label>
                    <textarea
                      id="everykr-mkt-inquiry-msg"
                      rows={3}
                      value={buyerMsg}
                      onChange={(e) => setBuyerMsg(e.target.value)}
                      className="ekr-glass-input w-full px-3 py-2 text-xs rounded-xl"
                      required
                    />
                  </div>

                  <RecaptchaCheckbox
                    idPrefix="everykr-marketplace-inquiry"
                    compact
                    onTokenChange={(tok) => {
                      setRecaptchaToken(tok);
                      if (tok) setRecaptchaError(null);
                    }}
                    errorMessage={recaptchaError}
                    resetSignal={recaptchaResetSignal}
                  />

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveItemForContact(null)}
                      className="px-4 py-2 text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingInquiry}
                      className="ekr-glass-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isSendingInquiry ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Send Inquiry</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
