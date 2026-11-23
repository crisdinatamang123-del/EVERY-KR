import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { RecaptchaCheckbox } from './security/RecaptchaCheckbox';
import { submitContactInquiryToFirestore } from '../services/contactSubmissionService';
import type { ContactInquiryCategory } from '../types';
import {
  Mail,
  HelpCircle,
  Send,
  CheckCircle2,
  Building,
  MapPin,
  AlertCircle,
  Loader2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const ContactView: React.FC = () => {
  const { showToast, t, currentUser, language } = useApp();
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<ContactInquiryCategory>('General Inquiry');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [recaptchaResetSignal, setRecaptchaResetSignal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [submittedAtIso, setSubmittedAtIso] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill name and email if user logs in and fields are still empty (never forces login)
  useEffect(() => {
    if (currentUser?.name && !name.trim()) {
      setName(currentUser.name);
    }
    if (currentUser?.email && !email.trim()) {
      setEmail(currentUser.email);
    }
  }, [currentUser?.uid, currentUser?.name, currentUser?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setRecaptchaError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMsg = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMsg) {
      const msg = 'Please fill in your full name, email address, and message details.';
      setFormError(msg);
      showToast(msg);
      return;
    }

    if (trimmedMsg.length < 10) {
      const msg = 'Please provide at least 10 characters in your message details.';
      setFormError(msg);
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
      const result = await submitContactInquiryToFirestore({
        fullName: trimmedName,
        email: trimmedEmail,
        category,
        subject: subject.trim() || `${category} Inquiry`,
        message: trimmedMsg,
        honeypot,
        recaptchaToken,
        userLanguage: language || 'en',
        currentUser: currentUser
          ? {
              uid: currentUser.uid,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
              university: currentUser.university,
              nationality: currentUser.nationality,
              emailVerified: currentUser.emailVerified
            }
          : null
      });

      setTicketId(result.ticketId || null);
      setSubmittedAtIso(result.submission.submittedAt);
      setSubmitted(true);
      showToast(
        `Inquiry ${result.ticketId} saved to EveryKR Support Desk. Our team will respond within 24 hours.`
      );
    } catch (err: any) {
      const errMsg =
        err?.message ||
        'Unable to submit your inquiry right now. Please check your details and try again.';
      setFormError(errMsg);
      showToast(errMsg);
    } finally {
      setIsSubmitting(false);
      setRecaptchaToken('');
      setRecaptchaResetSignal((prev) => prev + 1);
    }
  };

  const faqs = [
    {
      q: 'Is EVERYKR officially associated with the Korean Immigration Service?',
      a: 'No. EVERYKR is an independent student support technology platform. For legal government filings, visit HiKorea (hikorea.go.kr) or call the Immigration Contact Center at 1345.'
    },
    {
      q: 'How does EVERYKR ensure student jobs are legal?',
      a: 'We screen employers to ensure wage standards comply with statutory minimum wage regulations and require explicit statement of D-2 / D-4 part-time work permit eligibility.'
    },
    {
      q: 'Can landlords post dormitories and one-rooms for free?',
      a: 'Verified direct property owners and licensed certified real estate agents (공인중개사) can submit properties after providing proof of identity.'
    },
    {
      q: 'How can our university collaborate or list official academic programs?',
      a: 'University International Affairs offices can contact our partnership division using the form on this page.'
    }
  ];

  return (
    <div className="py-12 sm:py-16 bg-transparent min-h-[calc(100vh-72px)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">
            Help Center &amp; Direct Contact
          </div>
          <h1 className="text-3xl font-extrabold text-[#10213D] dark:text-white tracking-tight mt-1">
            Get in Touch with EVERYKR
          </h1>
          <p className="text-sm text-[#526685] dark:text-[#B8C9E5] mt-2 leading-relaxed">
            Have questions regarding university guides, employer partnerships, housing verification, or reporting safety concerns? Our bilingual team is here to assist.
          </p>
        </div>

        {/* 2-Column Split: Contact Form + Help Directory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Form */}
          <div className="lg:col-span-7 ekr-glass-panel p-6 sm:p-8 rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h2 className="text-lg font-bold text-[#10213D] dark:text-white">Send a Message</h2>
              {currentUser ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/10 text-[#0754B8] dark:text-[#60A5FA] border border-blue-400/30">
                  <UserCheck className="w-3.5 h-3.5" />
                  Signed in as {currentUser.name || currentUser.email}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Guest &amp; Member Inquiries Welcome (No Login Required)
                </span>
              )}
            </div>
            <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mb-6">
              We respond to student and visitor inquiries within one business day. Every inquiry is routed directly to the EveryKR Support Inbox.
            </p>

            {submitted ? (
              <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <strong className="text-base font-bold">Inquiry Delivered to Support Inbox!</strong>
                </div>
                <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-200">
                  Thank you, <strong>{name}</strong>. Support ticket{' '}
                  {ticketId ? (
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60">
                      {ticketId}
                    </span>
                  ) : (
                    'reference'
                  )}{' '}
                  has been saved for <strong>{email}</strong> under <strong>{category}</strong>. An EveryKR support specialist will reply directly to your email address.
                </p>
                {submittedAtIso && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                    Submitted: {new Date(submittedAtIso).toLocaleString()} &bull; Status: <span className="font-semibold">New</span>
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                    setSubject('');
                    setFormError(null);
                  }}
                  className="mt-3 text-xs font-semibold text-[#1769AA] dark:text-[#D6B875] hover:underline cursor-pointer"
                >
                  Send another inquiry →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                    className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="everykr-contact-name"
                      className="block text-xs font-semibold text-[#10213D] dark:text-slate-200 mb-1"
                    >
                      Your Full Name
                    </label>
                    <input
                      id="everykr-contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="everykr-contact-email"
                      className="block text-xs font-semibold text-[#10213D] dark:text-slate-200 mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="everykr-contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. student@university.ac.kr"
                      className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="everykr-contact-category"
                      className="block text-xs font-semibold text-[#10213D] dark:text-slate-200 mb-1"
                    >
                      Inquiry Category
                    </label>
                    <select
                      id="everykr-contact-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg"
                    >
                      <option className="bg-white dark:bg-[#0B204A]" value="General Inquiry">General Inquiry</option>
                      <option className="bg-white dark:bg-[#0B204A]" value="Partnership & Universities">Partnership &amp; Universities</option>
                      <option className="bg-white dark:bg-[#0B204A]" value="Employer Verification">Employer Verification</option>
                      <option className="bg-white dark:bg-[#0B204A]" value="Report an Issue">Report a Safety Issue</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="everykr-contact-subject"
                      className="block text-xs font-semibold text-[#10213D] dark:text-slate-200 mb-1"
                    >
                      Subject
                    </label>
                    <input
                      id="everykr-contact-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Question about scholarship requirements"
                      className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="everykr-contact-message"
                    className="block text-xs font-semibold text-[#10213D] dark:text-slate-200 mb-1"
                  >
                    Message Details
                  </label>
                  <textarea
                    id="everykr-contact-message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your question, university, or concern..."
                    className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg"
                    required
                  />
                </div>

                <RecaptchaCheckbox
                  idPrefix="everykr-contact"
                  onTokenChange={(tok) => {
                    setRecaptchaToken(tok);
                    if (tok) setRecaptchaError(null);
                  }}
                  errorMessage={recaptchaError}
                  resetSignal={recaptchaResetSignal}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ekr-glass-btn-primary flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying &amp; Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Inquiry</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Directory & FAQ */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 ekr-glass-panel rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-[#10213D] dark:text-white">Direct Support Channels</h3>

              <div className="space-y-2 text-xs text-[#526685] dark:text-[#B8C9E5]">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                  <span>support@everykr.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                  <span>partnerships@everykr.com (University &amp; Corporate)</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                  <span>Mapo-gu, Seoul, Republic of Korea</span>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div>
              <h3 className="text-sm font-bold text-[#10213D] dark:text-white mb-3 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                <span>Frequently Asked Questions</span>
              </h3>

              <div className="space-y-2.5">
                {faqs.map((faq, i) => (
                  <div
                    key={i}
                    className="p-4 ekr-glass-card rounded-xl space-y-1"
                  >
                    <h4 className="text-xs font-bold text-[#10213D] dark:text-white">{faq.q}</h4>
                    <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

