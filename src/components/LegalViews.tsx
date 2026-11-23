import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Shield, FileText, AlertTriangle, ArrowLeft } from 'lucide-react';

interface LegalViewProps {
  type: 'privacy' | 'terms' | 'disclaimer';
}

export const LegalViews: React.FC<LegalViewProps> = ({ type }) => {
  const { t } = useApp();

  return (
    <div className="py-12 bg-[#F8FAFC] dark:bg-[#0B1523] min-h-[calc(100vh-64px)] transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769AA] dark:text-[#19B6A4] hover:text-[#10243A] dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('services_back_home')}</span>
        </Link>

        <div className="bg-white dark:bg-[#10243A] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xs transition-colors">
          {type === 'privacy' && (
            <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1769AA] dark:text-[#19B6A4]">
                  <Shield className="w-4 h-4" />
                  <span>Data Protection &amp; Privacy</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10243A] dark:text-white mt-1.5 tracking-tight">
                  Privacy Policy
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Last Updated: November 2026
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <strong className="text-slate-900 dark:text-white block mb-1">
                  Our Core Commitment to Student Privacy
                </strong>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  EVERYKR operates strictly to serve international scholars residing in or transitioning to the Republic of Korea. We collect only information essential to power university searches, job inquiries, housing connections, newsletter updates, and student community interactions. We never sell student information to third-party commercial marketing brokers.
                </p>
              </div>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  1. Information We Collect
                </h2>
                <p>
                  When you create an account, we may collect your name, university affiliation, study program, nationality, and contact details. When employers post job openings, company business registrations are collected for legal verification.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  2. Immigration &amp; Legal Compliance
                </h2>
                <p>
                  EVERYKR does not collect confidential passport numbers or financial bank passwords on our servers. All financial statements and visa documentation guidance is provided for informational preparation or transferred directly between students and verified academic institutions.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  3. Right to Deletion &amp; Access
                </h2>
                <p>
                  In accordance with the South Korean Personal Information Protection Act (개인정보보호법), users retain the right to access, update, unsubscribe from email briefings, or request deletion of their account data at any time.
                </p>
              </section>
            </div>
          )}

          {type === 'terms' && (
            <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1769AA] dark:text-[#19B6A4]">
                  <FileText className="w-4 h-4" />
                  <span>Platform Governance</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10243A] dark:text-white mt-1.5 tracking-tight">
                  Terms &amp; Conditions
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Effective: November 2026
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                <strong>Immigration Status Notice: </strong>
                EVERYKR is an informational and community portal. Information provided on visa rules (D-2, D-4, D-10, E-7) does not constitute formal legal immigration advice. Official decisions rest solely with the Ministry of Justice and Korea Immigration Service.
              </div>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  1. Student Community &amp; Conduct
                </h2>
                <p>
                  Users agree to interact respectfully. Spam, commercial advertising outside designated marketplace channels, hate speech, visa fraud facilitation, and harassment result in immediate account termination.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  2. Marketplace &amp; Peer Transactions
                </h2>
                <p>
                  EVERYKR provides a peer classifieds index. Transactions, product inspections, and fund transfers are conducted directly between buyers and sellers. EVERYKR is not responsible for private transactional disputes. Users must follow safe public meeting practices.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  3. Housing &amp; Lease Safety
                </h2>
                <p>
                  Students are advised to verify property ownership through official certified real estate agents (공인중개사) and register Fixed Dates (확정일자) at local community centers to safeguard their security deposits.
                </p>
              </section>
            </div>
          )}

          {type === 'disclaimer' && (
            <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1769AA] dark:text-[#19B6A4]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{t('disclaimer_kicker')}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10243A] dark:text-white mt-1.5 tracking-tight">
                  {t('disclaimer_title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('disclaimer_updated')}
                </p>
              </div>

              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed">
                {t('disclaimer_intro')}
              </div>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('disclaimer_sec1_title')}
                </h2>
                <p>{t('disclaimer_sec1_body')}</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('disclaimer_sec2_title')}
                </h2>
                <p>{t('disclaimer_sec2_body')}</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('disclaimer_sec3_title')}
                </h2>
                <p>{t('disclaimer_sec3_body')}</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('disclaimer_sec4_title')}
                </h2>
                <p>{t('disclaimer_sec4_body')}</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('disclaimer_sec5_title')}
                </h2>
                <p>{t('disclaimer_sec5_body')}</p>
              </section>
            </div>
          )}

          {/* Legal Document Cross-Navigation */}
          <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-500 dark:text-slate-400">
              <Link
                to="/privacy"
                className={`transition-colors whitespace-nowrap ${
                  type === 'privacy'
                    ? 'font-bold text-[#10243A] dark:text-white'
                    : 'hover:text-[#1769AA] dark:hover:text-[#19B6A4]'
                }`}
              >
                {t('footer_legal_privacy')}
              </Link>
              <span aria-hidden="true">·</span>
              <Link
                to="/terms"
                className={`transition-colors whitespace-nowrap ${
                  type === 'terms'
                    ? 'font-bold text-[#10243A] dark:text-white'
                    : 'hover:text-[#1769AA] dark:hover:text-[#19B6A4]'
                }`}
              >
                {t('footer_legal_terms')}
              </Link>
              <span aria-hidden="true">·</span>
              <Link
                to="/disclaimer"
                className={`transition-colors whitespace-nowrap ${
                  type === 'disclaimer'
                    ? 'font-bold text-[#10243A] dark:text-white'
                    : 'hover:text-[#1769AA] dark:hover:text-[#19B6A4]'
                }`}
              >
                {t('footer_legal_disclaimer')}
              </Link>
            </div>

            <Link
              to="/contact"
              className="font-semibold text-[#1769AA] dark:text-[#19B6A4] hover:underline whitespace-nowrap"
            >
              {t('footer_link_student_support')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

