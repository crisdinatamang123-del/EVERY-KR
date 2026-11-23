import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Home, GraduationCap, Briefcase, Building2, FileText, ArrowRight } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const location = useLocation();

  const quickRoutes = [
    { path: '/universities', label: 'University Directory (25 Universities)', icon: GraduationCap },
    { path: '/scholarships', label: 'GKS & University Scholarships', icon: Compass },
    { path: '/jobs', label: 'Part-Time Student Jobs & Careers', icon: Briefcase },
    { path: '/housing', label: 'Student Housing & Goshiwons', icon: Building2 },
    { path: '/visa', label: 'D-2 / D-4 Visa & ARC Guide', icon: FileText }
  ];

  return (
    <section className="py-20 bg-[#F5F7FA] dark:bg-[#0B1523] min-h-[75vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 text-center space-y-6 shadow-xs">
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-[#1769AA] dark:text-[#19B6A4]">
            HTTP 404 · Route Not Found
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#10243A] dark:text-white tracking-tight">
            We couldn&apos;t find that page on EveryKR
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            The URL <span className="font-mono font-semibold text-slate-800 dark:text-white">{location.pathname}</span> does not match any active page. Choose a destination below or return to the EveryKR homepage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          {quickRoutes.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-[#1769AA] dark:hover:border-[#19B6A4] transition-colors flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </Link>
            );
          })}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] rounded-xl transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to EveryKR Homepage</span>
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
