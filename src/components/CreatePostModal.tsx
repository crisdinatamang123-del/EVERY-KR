import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RecaptchaCheckbox } from './security/RecaptchaCheckbox';
import { X, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';

export const CreatePostModal: React.FC = () => {
  const {
    isCreatePostModalOpen,
    setIsCreatePostModalOpen,
    createPost,
    currentUser,
    showToast,
    t
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<
    | 'General Discussion'
    | 'University Life'
    | 'Visa & Immigration'
    | 'Jobs & Careers'
    | 'Accommodation'
    | 'Korean Language'
    | 'Daily Life'
  >('General Discussion');
  const [city, setCity] = useState('Seoul');
  const [content, setContent] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [recaptchaResetSignal, setRecaptchaResetSignal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isCreatePostModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setRecaptchaError(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle.length < 3 || trimmedContent.length < 10) {
      const msg =
        'Please provide a discussion title (3+ chars) and detailed content (10+ chars).';
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
      const verifyRes = await fetch('/api/community/posts/verify-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          category,
          city,
          content: trimmedContent,
          honeypot,
          recaptchaToken
        })
      });

      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok || !verifyData?.ok) {
        const errMsg =
          verifyData?.message ||
          'Security verification failed or is temporarily unavailable. Discussion was not published.';
        setFormError(errMsg);
        showToast(errMsg);
        return;
      }

      createPost({
        title: trimmedTitle,
        authorName: currentUser?.name || 'International Student',
        authorRole: currentUser?.role === 'admin' ? 'Community Admin' : 'Verified Student',
        authorNationality: currentUser?.nationality || 'Global Scholar',
        category,
        city,
        content: trimmedContent
      });

      setTitle('');
      setContent('');
      setFormError(null);
      setIsCreatePostModalOpen(false);
    } catch {
      const netMsg =
        'Unable to reach security verification server. Discussion submission was blocked.';
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
              <MessageSquare className="w-4 h-4 text-[#19B6A4]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Start a Community Discussion
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ask fellow international students or share practical Korea tips
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatePostModalOpen(false)}
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
              htmlFor="everykr-post-title"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
            >
              Discussion Title
            </label>
            <input
              id="everykr-post-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tips on getting ARC appointment quickly or recommendation for student bank account"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA] dark:focus:border-[#19B6A4]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="everykr-post-category"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
              >
                Category
              </label>
              <select
                id="everykr-post-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA]"
              >
                <option value="General Discussion">General Discussion</option>
                <option value="University Life">University Life</option>
                <option value="Visa & Immigration">Visa &amp; Immigration</option>
                <option value="Jobs & Careers">Jobs &amp; Careers</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Korean Language">Korean Language</option>
                <option value="Daily Life">Daily Life</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="everykr-post-city"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
              >
                City / Campus Region
              </label>
              <select
                id="everykr-post-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA]"
              >
                <option value="Seoul">Seoul (Sinchon, Anam, Gwanak)</option>
                <option value="Busan">Busan</option>
                <option value="Incheon">Incheon / Songdo</option>
                <option value="Daejeon">Daejeon (KAIST / Chungnam)</option>
                <option value="Daegu">Daegu</option>
                <option value="Gwangju">Gwangju</option>
                <option value="Suwon">Suwon (SKKU)</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="everykr-post-content"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
            >
              Discussion Content
            </label>
            <textarea
              id="everykr-post-content"
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share details, specific questions, or advice for your international student peers in South Korea..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1769AA] dark:focus:border-[#19B6A4] leading-relaxed"
            />
          </div>

          <RecaptchaCheckbox
            idPrefix="everykr-community-post"
            onTokenChange={(tok) => {
              setRecaptchaToken(tok);
              if (tok) setRecaptchaError(null);
            }}
            errorMessage={recaptchaError}
            resetSignal={recaptchaResetSignal}
          />

          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/70 rounded-xl text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>EVERYKR Community Guidelines: </strong>
              Please remain respectful, do not post fraudulent visa or work advice, and never share private passport or bank credentials.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 text-xs">
            <button
              type="button"
              onClick={() => setIsCreatePostModalOpen(false)}
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
                <span>Publish to Forum</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

