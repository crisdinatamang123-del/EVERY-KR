import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { syncSubscriberToFirestore } from '../../services/firebaseService';
import { RecaptchaCheckbox } from '../security/RecaptchaCheckbox';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserMinus,
  X
} from 'lucide-react';

interface NewsletterSectionProps {
  sourceTag?: string;
}

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({
  sourceTag = 'homepage_newsletter'
}) => {
  const { showToast, t } = useApp();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);
  const [honeypot, setHoneypot] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [recaptchaResetSignal, setRecaptchaResetSignal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [subResult, setSubResult] = useState<{
    status:
      | 'idle'
      | 'pending_verification'
      | 'already_subscribed'
      | 'verified'
      | 'unsubscribed'
      | 'error';
    message: string;
    email?: string;
    verificationToken?: string;
  }>({ status: 'idle', message: '' });

  const [isUnsubModalOpen, setIsUnsubModalOpen] = useState(false);
  const [unsubEmail, setUnsubEmail] = useState('');
  const [unsubToken, setUnsubToken] = useState('');
  const [unsubReason, setUnsubReason] = useState('No longer studying in South Korea');
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [unsubFeedback, setUnsubFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('newsletter_action');
      const emailParam = params.get('email');
      const tokenParam = params.get('token');

      if (!action || !emailParam) return;

      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      if (action === 'verify' && tokenParam) {
        void handleVerifyToken(emailParam, tokenParam);
      } else if (action === 'unsubscribe') {
        void handleDirectUnsubscribe(emailParam, tokenParam || undefined);
      }
    } catch {
      // ignore SSR / URL parsing edge cases
    }
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newsletterEmail.trim().toLowerCase();

    if (!trimmed || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
      setSubResult({
        status: 'error',
        message: 'Please enter a valid email address.'
      });
      showToast('Please enter a valid email address');
      return;
    }

    if (!consentGiven) {
      setSubResult({
        status: 'error',
        message: 'Please check the consent box to subscribe to EVERYKR updates.'
      });
      showToast('Please confirm newsletter consent to subscribe');
      return;
    }

    if (!recaptchaToken && !honeypot.trim()) {
      const msg = t('recaptcha_required_error');
      setRecaptchaError(msg);
      setSubResult({
        status: 'error',
        message: msg
      });
      return;
    }

    setIsSubmitting(true);
    setRecaptchaError(null);
    setSubResult({ status: 'idle', message: '' });

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          consentGiven,
          topics: ['Admissions & Scholarships', 'Visa & Immigration', 'Student Jobs & Housing'],
          source: sourceTag,
          honeypot,
          recaptchaToken
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setSubResult({
          status: 'error',
          message: data.message || 'Unable to process subscription. Please try again.'
        });
        showToast(data.message || 'Subscription failed');
        return;
      }

      if (data.subscriber) {
        await syncSubscriberToFirestore(data.subscriber);
      }

      if (data.status === 'already_subscribed') {
        setSubResult({
          status: 'already_subscribed',
          message: data.message || `${trimmed} is already subscribed to EVERYKR updates.`,
          email: trimmed
        });
        showToast('This email is already subscribed to EVERYKR');
      } else {
        setSubResult({
          status: 'pending_verification',
          message:
            data.message ||
            'Please verify your email address to complete your EVERYKR subscription.',
          email: trimmed,
          verificationToken: data.verificationToken
        });
        showToast('Verification required: Please confirm your email subscription');
      }
    } catch (err: any) {
      setSubResult({
        status: 'error',
        message: err?.message || 'Network error while connecting to the newsletter service.'
      });
    } finally {
      setIsSubmitting(false);
      setRecaptchaToken('');
      setRecaptchaResetSignal((prev) => prev + 1);
    }
  };

  const handleVerifyToken = async (emailToVerify: string, tokenToVerify: string) => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/newsletter/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToVerify,
          token: tokenToVerify
        })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        if (data.subscriber) {
          await syncSubscriberToFirestore(data.subscriber);
        }
        setSubResult({
          status: 'verified',
          message: data.message || `Email verified. Welcome to EVERYKR (${emailToVerify}).`,
          email: emailToVerify
        });
        setNewsletterEmail('');
        showToast('EVERYKR Newsletter verified');
      } else {
        setSubResult({
          status: 'error',
          message: data.message || 'Verification link is invalid or expired.'
        });
      }
    } catch (err: any) {
      setSubResult({
        status: 'error',
        message: err?.message || 'Verification request failed.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDirectUnsubscribe = async (
    emailTarget: string,
    tokenTarget?: string,
    reasonText?: string
  ) => {
    const cleanEmail = emailTarget.trim().toLowerCase();
    if (!cleanEmail) return;
    setIsUnsubscribing(true);
    setUnsubFeedback(null);
    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          token: tokenTarget || unsubToken.trim() || undefined,
          reason: reasonText || unsubReason
        })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        if (data.subscriber) {
          await syncSubscriberToFirestore(data.subscriber);
        }
        setSubResult({
          status: 'unsubscribed',
          message: data.message || `${cleanEmail} has been unsubscribed.`,
          email: cleanEmail
        });
        setIsUnsubModalOpen(false);
        setUnsubEmail('');
        setUnsubToken('');
        showToast('Unsubscribed from EVERYKR updates');
      } else {
        setUnsubFeedback(
          data.message ||
            'Please use the one-click unsubscribe link at the bottom of any EVERYKR newsletter email.'
        );
      }
    } catch {
      setUnsubFeedback('Failed to process unsubscribe request. Please try again.');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <section
      id="news"
      aria-labelledby="everykr-newsletter-heading"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18"
    >
      <div className="relative overflow-hidden bg-slate-50 dark:bg-gradient-to-br dark:from-[#102544]/70 dark:to-[#081426]/95 border border-slate-200/90 dark:border-[#DCE5F0]/16 rounded-3xl px-6 py-10 sm:px-12 sm:py-14 transition-colors shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]">
        <div
          aria-hidden="true"
          className="pointer-events-none hidden dark:block absolute -top-24 end-10 w-80 h-80 rounded-full bg-[#4BA3FF]/10 blur-3xl"
        />

        <div className="relative z-10 max-w-xl mx-auto text-center space-y-3.5">
          <div
            data-no-translate="true"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#102544] dark:text-[#D6B875]"
          >
            NEWSLETTER · STAY IN THE LOOP
          </div>

          <h2
            id="everykr-newsletter-heading"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#050B18] dark:text-white [text-wrap:balance]"
          >
            {t('home_newsletter_heading')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#DCE5F0]/80 leading-relaxed">
            {t('home_newsletter_desc')}
          </p>

          {subResult.status === 'verified' || subResult.status === 'already_subscribed' ? (
            <div className="mt-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-start space-y-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-100 leading-relaxed">
                  {subResult.message}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setSubResult({ status: 'idle', message: '' });
                    setNewsletterEmail('');
                  }}
                  className="font-semibold text-[#102544] dark:text-[#4BA3FF] hover:underline cursor-pointer"
                >
                  Use another email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUnsubEmail(subResult.email || '');
                    setIsUnsubModalOpen(true);
                  }}
                  className="text-slate-500 dark:text-[#9BAABD] hover:underline cursor-pointer"
                >
                  {t('newsletter_unsub')}
                </button>
              </div>
            </div>
          ) : subResult.status === 'unsubscribed' ? (
            <div className="mt-5 p-4 rounded-2xl bg-white dark:bg-[#050B18]/80 border border-slate-200 dark:border-[#DCE5F0]/16 text-xs text-slate-700 dark:text-[#DCE5F0] flex items-center justify-between gap-3">
              <span>{subResult.message}</span>
              <button
                type="button"
                onClick={() => setSubResult({ status: 'idle', message: '' })}
                className="font-semibold text-[#102544] dark:text-[#D6B875] hover:underline shrink-0 cursor-pointer"
              >
                Resubscribe
              </button>
            </div>
          ) : subResult.status === 'pending_verification' ? (
            <div className="mt-5 p-4 rounded-2xl bg-amber-50 dark:bg-[#050B18]/85 border border-amber-200 dark:border-[#D6B875]/40 text-start space-y-3">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-amber-600 dark:text-[#D6B875] shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-[#DCE5F0] leading-relaxed">
                  {subResult.message}
                </div>
              </div>
              {subResult.verificationToken && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-amber-200/70 dark:border-[#DCE5F0]/12">
                  <span className="text-[11px] text-slate-600 dark:text-[#9BAABD]">
                    Confirm <span className="font-mono font-semibold text-white">{subResult.email}</span>:
                  </span>
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() =>
                      subResult.email &&
                      subResult.verificationToken &&
                      handleVerifyToken(subResult.email, subResult.verificationToken)
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#102544] hover:bg-[#164A83] dark:bg-[#D6B875] dark:hover:bg-[#E2C788] dark:text-[#050B18] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Email</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="pt-3 space-y-3" noValidate>
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

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-[#4BA3FF] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={t('newsletter_placeholder')}
                    disabled={isSubmitting}
                    aria-label={t('newsletter_placeholder')}
                    className="w-full h-12 ps-10 pe-4 text-sm bg-white dark:bg-[#050B18]/85 border border-slate-200 dark:border-[#DCE5F0]/18 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#9BAABD] focus:outline-none focus:border-[#102544] dark:focus:border-[#4BA3FF] transition-colors disabled:opacity-60"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 h-12 px-7 text-sm font-bold text-white bg-[#102544] hover:bg-[#164A83] dark:bg-[#D6B875] dark:text-[#050B18] dark:hover:bg-[#E2C788] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 shadow-[0_10px_24px_-8px_rgba(214,184,117,0.35)]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('newsletter_subscribing')}</span>
                    </>
                  ) : (
                    <span>{t('newsletter_btn')}</span>
                  )}
                </button>
              </div>

              <label className="inline-flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-[#9BAABD] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 dark:border-[#DCE5F0]/30 text-[#102544] dark:text-[#D6B875] focus:ring-[#4BA3FF] cursor-pointer"
                />
                <span>{t('newsletter_consent')}</span>
              </label>

              <div className="pt-1 flex justify-center">
                <RecaptchaCheckbox
                  idPrefix="everykr-newsletter"
                  align="center"
                  onTokenChange={(tok) => {
                    setRecaptchaToken(tok);
                    if (tok) setRecaptchaError(null);
                  }}
                  errorMessage={recaptchaError}
                  resetSignal={recaptchaResetSignal}
                />
              </div>

              {subResult.status === 'error' && (
                <div
                  role="alert"
                  className="flex items-center justify-center gap-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 px-3.5 py-2 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{subResult.message}</span>
                </div>
              )}

              <div className="pt-0.5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-[#9BAABD]">
                <span>{t('home_newsletter_privacy')}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setUnsubFeedback(null);
                    setIsUnsubModalOpen(true);
                  }}
                  className="text-slate-500 dark:text-[#9BAABD] hover:text-[#050B18] dark:hover:text-white underline cursor-pointer"
                >
                  {t('newsletter_unsub')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Unsubscribe Modal */}
      {isUnsubModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#050B18]/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUnsubModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#DCE5F0]/18 rounded-2xl max-w-md w-full p-6 text-slate-900 dark:text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-300">
                  <UserMinus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold">{t('newsletter_unsub')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUnsubModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
                aria-label="Close unsubscribe dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-start">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#DCE5F0] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={unsubEmail}
                  onChange={(e) => setUnsubEmail(e.target.value)}
                  placeholder="your.email@university.edu"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-[#DCE5F0]/18 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#4BA3FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#DCE5F0] mb-1">
                  Unsubscribe Token (from newsletter email link, if applicable)
                </label>
                <input
                  type="text"
                  value={unsubToken}
                  onChange={(e) => setUnsubToken(e.target.value)}
                  placeholder="Optional token from email footer"
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-[#DCE5F0]/18 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#4BA3FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#DCE5F0] mb-1">
                  Reason
                </label>
                <select
                  value={unsubReason}
                  onChange={(e) => setUnsubReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-[#050B18] border border-slate-200 dark:border-[#DCE5F0]/18 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#4BA3FF]"
                >
                  <option value="No longer studying in South Korea">
                    No longer studying in South Korea
                  </option>
                  <option value="Too many emails">Receiving too many emails</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {unsubFeedback && (
                <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                  {unsubFeedback}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUnsubModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#9BAABD] hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUnsubscribing || !unsubEmail.trim()}
                onClick={() =>
                  handleDirectUnsubscribe(unsubEmail, unsubToken || undefined, unsubReason)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUnsubscribing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
