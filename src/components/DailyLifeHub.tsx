import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GUIDE_ARTICLES } from '../data/mockData';
import { GuideArticle } from '../types';
import {
  Compass,
  CreditCard,
  Smartphone,
  HeartPulse,
  Train,
  ShoppingBag,
  Landmark,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface DailyLifeHubProps {
  isFullPage?: boolean;
}

export const DailyLifeHub: React.FC<DailyLifeHubProps> = ({ isFullPage = false }) => {
  const { setActivePage } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeArticle, setActiveArticle] = useState<GuideArticle | null>(GUIDE_ARTICLES[0]);

  const categories = [
    { id: 'All', label: 'All Guides', icon: <Compass className="w-4 h-4" /> },
    { id: 'Banking', label: 'Banking & Money', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'Mobile & SIM', label: 'SIM & Telecom', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'Healthcare', label: 'NHIS Insurance', icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'Transportation', label: 'Subway & Transit', icon: <Train className="w-4 h-4" /> },
    { id: 'Government', label: 'ARC & Immigration', icon: <Landmark className="w-4 h-4" /> },
  ];

  const filteredArticles = selectedCategory === 'All'
    ? GUIDE_ARTICLES
    : GUIDE_ARTICLES.filter(a => a.category === selectedCategory);

  return (
    <section className={`bg-transparent ${isFullPage ? 'py-10' : 'py-16'} border-b border-slate-200/50 dark:border-white/10 transition-colors`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">
              Essential Survival Blueprints
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10213D] dark:text-white tracking-tight mt-1">
              Daily Life in Korea
            </h2>
            <p className="text-sm text-[#526685] dark:text-[#B8C9E5] mt-1 max-w-2xl">
              Practical step-by-step guides for opening bank accounts, setting up 5G mobile data, accessing Korean clinics with NHIS, and navigating buses and subways.
            </p>
          </div>

          {!isFullPage && (
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => setActivePage('daily-life')}
                className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline underline-offset-4 cursor-pointer"
              >
                View all guides →
              </button>
            </div>
          )}
        </div>

        {/* Category Pills Bar (Interactive Segment Buttons) */}
        <div className="ekr-glass-panel flex items-center gap-2 p-1.5 rounded-xl mb-8 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === c.id
                  ? 'ekr-glass-btn-primary shadow-sm font-bold'
                  : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* 2-Column Split: Article List on Left + Full Reading View on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Article Titles & Summaries */}
          <div className="lg:col-span-5 space-y-3">
            {filteredArticles.map((art) => {
              const isSelected = activeArticle?.id === art.id;

              return (
                <div
                  key={art.id}
                  onClick={() => setActiveArticle(art)}
                  className={`p-4 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'ekr-glass-card-active'
                      : 'ekr-glass-card'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[#526685] dark:text-[#B8C9E5] mb-1">
                    <span className="font-semibold text-[#0754B8] dark:text-[#60A5FA]">{art.category}</span>
                    <span className="flex items-center gap-1 opacity-80">
                      <Clock className="w-3 h-3" />
                      <span>{art.readTimeMinutes} min read</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold leading-snug text-[#10213D] dark:text-white">
                    {art.title}
                  </h3>

                  <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1 line-clamp-2 leading-relaxed">
                    {art.summary}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#526685] dark:text-[#B8C9E5]">
                    <span>Updated {art.lastUpdated}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-1 text-[#0754B8] dark:text-[#60A5FA]' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Article Detailed Blueprint */}
          {activeArticle && (
            <div className="lg:col-span-7 ekr-glass-panel p-6 sm:p-8 rounded-2xl space-y-6">
              
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA]">
                  <span>{activeArticle.category} Blueprint</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeArticle.readTimeMinutes} min read</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#526685] dark:text-[#B8C9E5]">Updated {activeArticle.lastUpdated}</span>
                </div>
                
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#10213D] dark:text-white mt-2 leading-tight">
                  {activeArticle.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] mt-2 leading-relaxed">
                  {activeArticle.summary}
                </p>
              </div>

              {/* Official Warning if present */}
              {activeArticle.officialWarning && (
                <div className="p-4 bg-amber-500/10 border border-amber-400/35 rounded-xl flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Important Notice: </strong>
                    {activeArticle.officialWarning}
                  </div>
                </div>
              )}

              {/* Step by step action list */}
              <div>
                <h4 className="text-xs font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-3">
                  Step-by-Step Instructions
                </h4>

                <div className="space-y-3">
                  {activeArticle.keySteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3.5 ekr-glass-subtle rounded-xl text-xs text-[#10213D] dark:text-slate-200 leading-relaxed">
                      <span className="w-5 h-5 rounded-full ekr-glass-btn-primary flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">
                        {idx + 1}
                      </span>
                      <div>
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Source Citation */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs text-[#526685] dark:text-[#B8C9E5]">
                <div>
                  <strong className="text-[#10213D] dark:text-white">Source Authority: </strong>
                  <span>{activeArticle.officialSource}</span>
                </div>

                <a
                  href={activeArticle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline"
                >
                  <span>Official Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          )}

        </div>

      </div>
    </section>
  );
};
