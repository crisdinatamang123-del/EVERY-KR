import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, ArrowRight, ShieldCheck, Compass, CheckCircle } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const {
    t,
    setActivePage,
    setIsAuthModalOpen,
    setAuthModalMode,
    setIsSearchModalOpen,
    setSearchQuery
  } = useApp();

  const [inputVal, setInputVal] = useState('');

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchQuery(inputVal.trim());
      setIsSearchModalOpen(true);
    } else {
      setIsSearchModalOpen(true);
    }
  };

  const handleQuickTag = (tag: string, targetPage?: 'universities' | 'visa' | 'jobs' | 'accommodation' | 'daily-life') => {
    if (targetPage) {
      setActivePage(targetPage);
    } else {
      setSearchQuery(tag);
      setIsSearchModalOpen(true);
    }
  };

  return (
    <section className="relative overflow-hidden bg-white border-b border-slate-200">
      
      {/* Background Subtle Gradient & Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F5F7FA] via-white to-white pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-14 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading, Subhead, Search, CTAs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Unboxed Kicker metadata (anti-pill) */}
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1769AA]">
              <span>Official Student Companion</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500">Study. Work. Live. Connect.</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-[#19B6A4]">2026/2027 Academic Year</span>
            </div>

            {/* Display Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#10243A] tracking-tight leading-[1.15]" style={{ textWrap: 'balance' }}>
              Your Life in Korea, <br />
              <span className="text-[#1769AA]">Made Easier.</span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Everything international students need to study, work, live and succeed in South Korea — all in one place.
            </p>

            {/* Main Search Bar */}
            <form onSubmit={handleHeroSearch} className="max-w-2xl">
              <div className="relative flex items-center bg-white rounded-xl shadow-md border border-slate-300 focus-within:border-[#1769AA] focus-within:ring-2 focus-within:ring-[#1769AA]/20 transition-all p-1.5">
                <div className="pl-3 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="What are you looking for in Korea?"
                  className="w-full px-3 py-2.5 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                >
                  Search
                </button>
              </div>

              {/* Suggested Search Categories (Functional Interactive Segment buttons) */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs text-slate-500">
                <span className="font-medium text-slate-400 mr-1">Suggested:</span>
                <button
                  type="button"
                  onClick={() => handleQuickTag('Find a University', 'universities')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Find a University
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTag('Visa Information', 'visa')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Visa Information
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTag('Find a Part-time Job', 'jobs')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Find a Part-time Job
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTag('Find Accommodation', 'accommodation')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Find Accommodation
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTag('Student Services', 'daily-life')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Student Services
                </button>
              </div>
            </form>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => {
                  const section = document.getElementById('quick-services-section');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-xl transition-all shadow-sm hover:shadow cursor-pointer"
              >
                <span>Explore Services</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#10243A] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
              >
                <span>Join EVERYKR</span>
              </button>
            </div>

            {/* Trust and safety markers */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#19B6A4]" />
                <span>Verified University Profiles</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#19B6A4]" />
                <span>Legal Immigration Compliance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#19B6A4]" />
                <span>Zero Rental Scam Policy</span>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual Asset */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 aspect-[16/10] lg:aspect-[4/3] group">
              <img
                src="/src/assets/images/hero_korea_students_1794049411032.jpg"
                alt="International students walking together at a historic South Korean university campus with autumn ginkgo foliage"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10243A]/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                <span className="text-xs font-semibold text-[#19B6A4] uppercase tracking-wider">Seoul & Beyond</span>
                <h3 className="text-base font-bold">Welcoming 200,000+ Global Scholars in South Korea</h3>
                <p className="text-xs text-slate-200 mt-1">Connecting undergraduate, master, PhD, and language institute students nationwide.</p>
              </div>
            </div>
          </div>

        </div>

        {/* 4-Item Proof Strip below Hero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-slate-200">
          <div className="bg-[#F5F7FA] p-4 rounded-xl border border-slate-200">
            <div className="text-2xl font-extrabold text-[#10243A] font-mono tabular-nums">40+</div>
            <div className="text-xs font-semibold text-slate-900 mt-0.5">Verified Universities</div>
            <div className="text-[11px] text-slate-500 mt-1">SNU, Yonsei, Korea Univ, KAIST, SKKU & Regional Flagships</div>
          </div>
          
          <div className="bg-[#F5F7FA] p-4 rounded-xl border border-slate-200">
            <div className="text-2xl font-extrabold text-[#1769AA] font-mono tabular-nums">100%</div>
            <div className="text-xs font-semibold text-slate-900 mt-0.5">Legal Work Compliance</div>
            <div className="text-[11px] text-slate-500 mt-1">Only permits D-2 & D-4 immigration-authorized employment</div>
          </div>

          <div className="bg-[#F5F7FA] p-4 rounded-xl border border-slate-200">
            <div className="text-2xl font-extrabold text-[#19B6A4] font-mono tabular-nums">5 Languages</div>
            <div className="text-xs font-semibold text-slate-900 mt-0.5">Multilingual UI Support</div>
            <div className="text-[11px] text-slate-500 mt-1">English, 한국어, বাংলা, नेपाली, and 中文 interfaces</div>
          </div>

          <div className="bg-[#F5F7FA] p-4 rounded-xl border border-slate-200">
            <div className="text-2xl font-extrabold text-[#F0B44D] font-mono tabular-nums">24 / 7</div>
            <div className="text-xs font-semibold text-slate-900 mt-0.5">Emergency Assistance</div>
            <div className="text-[11px] text-slate-500 mt-1">Direct links to 1345 Immigration & 119 Emergency</div>
          </div>
        </div>

      </div>
    </section>
  );
};
