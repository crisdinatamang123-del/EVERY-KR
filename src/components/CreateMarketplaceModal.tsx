import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RecaptchaCheckbox } from './security/RecaptchaCheckbox';
import { X, ShoppingBag, AlertCircle, Loader2 } from 'lucide-react';
import { MarketplaceItem } from '../types';

export const CreateMarketplaceModal: React.FC = () => {
  const {
    isCreateMarketplaceModalOpen,
    setIsCreateMarketplaceModalOpen,
    createMarketplaceItem,
    currentUser,
    showToast,
    t
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MarketplaceItem['category']>('Laptops & Electronics');
  const [condition, setCondition] = useState<MarketplaceItem['condition']>('Good Condition');
  const [priceKRW, setPriceKRW] = useState<string>('50000');
  const [location, setLocation] = useState('Sinchon Station Exit 2 (Line 2)');
  const [city] = useState('Seoul');
  const [sellerContact, setSellerContact] = useState(currentUser?.phone || '010-4821-9304');
  const [description, setDescription] = useState('');
  const [imagePlaceholder] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [recaptchaResetSignal, setRecaptchaResetSignal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isCreateMarketplaceModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setRecaptchaError(null);

    const trimmedTitle = title.trim();
    const numPrice = parseInt(priceKRW.replace(/[^0-9]/g, ''), 10);
    if (trimmedTitle.length < 3 || Number.isNaN(numPrice)) {
      const msg = 'Please provide an item title (3+ chars) and a valid price in KRW.';
      setFormError(msg);
      showToast(msg);
      return;
    }

    if (!location.trim() || !sellerContact.trim()) {
      const msg = 'Pickup location and seller contact information are required.';
      setFormError(msg);
      showToast(msg);
      return;
    }

    if (!recaptchaToken && !honeypot.trim()) {
      const msg = t('recaptcha_required_error');
      setRecaptchaError(msg);
      setFormError(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const verifyRes = await fetch('/api/marketplace/verify-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionType: 'listing',
          title: trimmedTitle,
          category,
          condition,
          priceKRW: numPrice,
          location: location.trim(),
          city,
          sellerContact: sellerContact.trim(),
          description: description.trim(),
          honeypot,
          recaptchaToken
        })
      });

      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok || !verifyData?.ok) {
        const errMsg =
          verifyData?.message ||
          'Security verification failed or is temporarily unavailable. Listing was not published.';
        setFormError(errMsg);
        showToast(errMsg);
        return;
      }

      createMarketplaceItem({
        title: trimmedTitle,
        category,
        condition,
        priceKRW: numPrice,
        location: location.trim(),
        city,
        sellerName: currentUser?.name || 'International Student',
        sellerContact: sellerContact.trim(),
        description:
          description.trim() || 'Well-maintained item sold by foreign scholar leaving Korea.',
        images: imagePlaceholder.trim() ? [imagePlaceholder.trim()] : []
      });

      setTitle('');
      setPriceKRW('50000');
      setDescription('');
      setFormError(null);
      setIsCreateMarketplaceModalOpen(false);
    } catch {
      const netMsg =
        'Unable to reach security verification server. Marketplace submission was blocked.';
      setFormError(netMsg);
      showToast(netMsg);
    } finally {
      setIsSubmitting(false);
      setRecaptchaToken('');
      setRecaptchaResetSignal((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#10243A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#10243A] dark:bg-slate-800 text-white flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-[#19B6A4]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                List an Item on Student Marketplace
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sell used textbooks, furniture, appliances, or gadgets to peers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateMarketplaceModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
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

          {formError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="everykr-mkt-title"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
            >
              Item Title
            </label>
            <input
              id="everykr-mkt-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TOPIK II Official Prep Books + Vocabulary Flashcards"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA] dark:focus:border-[#19B6A4]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="everykr-mkt-category"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
              >
                Category
              </label>
              <select
                id="everykr-mkt-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA]"
              >
                <option value="Laptops & Electronics">Laptops &amp; Electronics</option>
                <option value="Mobile Phones">Mobile Phones</option>
                <option value="Books & Study Materials">Books &amp; Study Materials</option>
                <option value="Furniture">Furniture</option>
                <option value="Clothing">Clothing</option>
                <option value="Household Items">Household Items</option>
                <option value="Bicycles">Bicycles</option>
                <option value="Other Items">Other Items</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="everykr-mkt-condition"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
              >
                Condition
              </label>
              <select
                id="everykr-mkt-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA]"
              >
                <option value="Brand New">Brand New</option>
                <option value="Like New">Like New</option>
                <option value="Good Condition">Good Condition</option>
                <option value="Fair Condition">Fair Condition</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="everykr-mkt-price"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
              >
                Price (KRW ₩)
              </label>
              <input
                id="everykr-mkt-price"
                type="number"
                required
                min={0}
                step={1000}
                value={priceKRW}
                onChange={(e) => setPriceKRW(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono font-bold focus:outline-none focus:border-[#1769AA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="everykr-mkt-location"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
              >
                Pickup Location / Subway Station
              </label>
              <input
                id="everykr-mkt-location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sinchon Station Exit 2 / Yonsei Dorm"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            <div>
              <label
                htmlFor="everykr-mkt-contact"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
              >
                KakaoTalk ID / Phone Number
              </label>
              <input
                id="everykr-mkt-contact"
                type="text"
                required
                value={sellerContact}
                onChange={(e) => setSellerContact(e.target.value)}
                placeholder="Kakao ID or 010-XXXX-XXXX"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="everykr-mkt-description"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
            >
              Item Description
            </label>
            <textarea
              id="everykr-mkt-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe condition, reason for selling, accessories included, availability for direct pickup..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA]"
            />
          </div>

          <RecaptchaCheckbox
            idPrefix="everykr-marketplace-listing"
            onTokenChange={(tok) => {
              setRecaptchaToken(tok);
              if (tok) setRecaptchaError(null);
            }}
            errorMessage={recaptchaError}
            resetSignal={recaptchaResetSignal}
          />

          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/70 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Student Safety: </strong>
              Always meet in public campus areas (e.g. subway station exit, university library entrance). Never send money in advance without verifying the product.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 text-xs">
            <button
              type="button"
              onClick={() => setIsCreateMarketplaceModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 font-bold text-white bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Post to Marketplace</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

